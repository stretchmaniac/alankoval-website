// This creates a new directory, "build-result" that contains the entire website as it is meant to be uploaded
// to AWS s3. Yes, I'm probably supposed to use something different. But hey, at least I'm not copy pasting files, right?

// It is meant to be run as a node.js program

// The end goal is to get a file tree that looks like this:
// alankoval.com
//	about.html
//  blog.html
//  header-styles.css
//  prism (folder)
//  error.html
//  3dgrapher
//      index.html
//      ...dependencies
//  other projects
//		...
//  ...
//	posts
//		post1.html
//		post2.html
//      AeAsGgtHhSg... (folder containing dependencies for post1)
//      YuirtWtuerQ... (folder containing dependencies for post2)

// blog post specification:
// under <head>, include meta tags in the following format:
// <meta name='...' content='...'>
// the following names are required:
//   dependencies (content = mathjax | jquery | prism | header-styles)
//   date
//   tags
//   url (the file name, so my_project.html, for example)
//   identifier - a unique ID for the post (I randomly generated them), associated with Disqus
//   description (of the post)
//   thumbnail (url of picture)

// app specification
// every app must be a folder under Alan's Stuff/Coding/alankoval.com
// every app needs to have at least the following structure:
//   Build
//    - result
//       - (the app)
//    - url.txt

// set this to false to build the official version, versus for testing purposes
const developing = true;
// set this to true to deploy the final version to amazon s3
const deploy = false;
// for running command line args
const shell = require('shelljs');
// for manipulating HTML as a DOM
const {JSDOM} = require('jsdom');
// for saving files
const files = require('fs');

// Remove result directory, then add it back (remove all the files)
// /s is for removing all sub-elements, /q is for quiet (no confirmation)
if(files.existsSync('result')){
	console.log('...Removing previous result directory');
	shell.exec('rm -r result',{async:false});
}else{
	console.log('...(No result directory found)');
}

console.log('...Creating new result directory');
shell.exec('mkdir result',{async:false});

// about page (we'll proceed in order)
buildPage('../About/about.html', 'result/about.html', false);

// error page
buildPage('../404 Page/error.html', 'result/error.html', false);

// projects page
buildPage('../Projects/projects.html', 'result/projects.html', false);

// hacks page
buildPage('../Hacks/hacks.html', 'result/hacks.html', false);


console.log('---Retrieving application builds---------')
// copy the Build/result folder from each app, deliniated in ../..
// then rename 'result' to the contents in the url.txt file in Build
const apps = files.readdirSync('../..').filter(x => x !== 'alankoval-website');
for(const app of apps){
	console.log(`...Building ${app}`);
	// check for a build folder
	if(files.readdirSync(`../../${app}`).filter(x => x === 'Build').length !== 1){
		throw new Error(`Missing (or more than one) Build folder in app ${app}`);
	}

	// check for a results folder in Build and a url.txt
	if(files.readdirSync(`../../${app}/Build`).filter(x => x === 'url.txt' || x === 'result').length !== 2){
		throw new Error(`Missing url.txt file or result folder in Build folder of app ${app}`);
	}

	// copy result folder
	shell.exec(`cp -r "../../${app}/Build/result/" result/`, {async:false});
	// rename result folder to name in url.txt
	const newFolderName = files.readFileSync(`../../${app}/Build/url.txt`).toString().trim();
	shell.exec(`mv "result/result" "result/${newFolderName}"`, {async:false});
}

// we'll build the blog page later, before editing
console.log('---Copying Boilder Plate code---------')
// copy over all the files in Boiler Plate
for(const name of files.readdirSync('../Boiler Plate')){
	// we specifically don't need homepage-template.html
	if(name === 'homepage-template.html'){
		continue;
	}

	console.log(`...Copying ../Boiler Plate/${name}`);
	// if the child is a directory, it's slightly different
	if(files.statSync(`../Boiler Plate/${name}`).isDirectory()){
		shell.exec(`cp -r "../Boiler Plate/${name}/" "result/"`, {async:false});
	}else{
		shell.exec(`cp "../Boiler Plate/${name}" "result/"`, {async:false});
	}
}

// create posts directory
console.log('---Building Posts--------');
console.log('...creating posts folder');
shell.exec('mkdir "result/posts"', {async:false});

// iterate through the post folder, building as we go
const postFolders = files.readdirSync('../Blog/Posts')
	.filter(x => files.statSync('../Blog/Posts/'+x).isDirectory());

const numPosts = postFolders.length;

// we'll sort the posts by date in a bit
const posts = [];
for(const folder of postFolders){
	// each of these is a separate post
	// build the post.html file in the folder
	console.log(`...Building ${folder}`);
	const postUrl = `../Blog/Posts/${folder}/post.html`;
	JSDOM.fromFile(postUrl).then(postDom => {
		//check for metadata
		const metaEls = postDom.window.document.getElementsByTagName('meta');
		const postData = {};
		for(const el of metaEls){
			if(el.name && el.content){
				postData[el.name] = el.content;
			}
		}

		// date is required
		if(!postData.date){
			throw new Error(`name=date metadata not found for file ${postUrl}$`);
		}
		// and so is url
		if(!postData.url){
			throw new Error(`name=url metadata not found for file ${postUrl}$`);
		}
		// ... and identifier
		if(!postData.identifier){
			throw new Error(`name=identifier metadata not found for file ${postUrl}$`);
		}

		postData.realUrl = 'https://alankoval.com/posts/' + postData.url;

		// put all the other files under the directory 'identifier/name'
		shell.exec(`mkdir "result/posts/${postData.identifier}"`, {async:false});
		const otherFiles = files.readdirSync(`../Blog/Posts/${folder}`).filter(x => x !== 'post.html');
		for(const f of otherFiles){
			copy(`../Blog/Posts/${folder}`, f, `result/posts/${postData.identifier}`, f);
		}

		buildPage(postUrl, `result/posts/${postData.url}`, postData);

		posts.push(postData);

		// if this is the last promise, and we are ready to move along
		if(posts.length === numPosts){
			// we need to build the blog post first, so that it is ready to be ammended by the post data
			buildPage('../Blog/blog.html', 'result/blog.html', false, () => {onPostDataFinish();} );
		}
	});
}

function onPostDataFinish(){
	// load blog.html
	JSDOM.fromFile('result/blog.html').then(blogDom => {

		// sort post in descending order
		posts.sort((a,b) => Date.parse(a.date) > Date.parse(b.date) ? -1 : 1);

		const blogDoc = blogDom.window.document;
		const postDiv = blogDoc.getElementsByClassName('content-posts')[0];
		for(const post of posts){
			// build blog.html item
			postDiv.appendChild(constructPostLine(post, blogDoc));
		}

		if(developing){
			replaceLinksForDevelopement(blogDoc);
		}

		// save result
		files.writeFileSync('result/blog.html', blogDom.serialize());
		onBuildFinish();
	});
}

function onBuildFinish(){
	if(deploy){
		// aws is a console command. We need to sync the build folder with the whole s3 bucket
		shell.exec('aws s3 sync result s3://alankoval.com --delete', {async:false});
	}
}

// takes a ___-content.html file, wraps it in the necessary headers and copies it
// to the desired path
function buildPage(contentPath, newPath, postData, onFinish = ()=>{}){
	// load template html using jsdom
	JSDOM.fromFile('../Boiler Plate/homepage-template.html').then(headerDom => {
		console.log(`...ASYNC: Building ${contentPath}`);
		// get the page file
		JSDOM.fromFile(contentPath).then(pageDom => {
			// determine any dependancies (kept in the meta tag by the name "dependancies")
			// these are just convenient shortcuts, one of ['mathjax', 'prism', 'header-styles', 'jquery']
			const pageDoc = pageDom.window.document;
			const headerDoc = headerDom.window.document;

			const metaElements = pageDoc.getElementsByTagName('meta');

			if(metaElements.length === 0){
				throw new Error(`<meta> tag not defined in file ${contentPath}`);
			}

			// get meta tag content with name dependencies
			const dependenciesString = pageDoc.head.querySelector('[name=dependencies]').content;

			if(!dependenciesString){
				throw new Error('dependencies attribute not defined in <meta> tag');
			}

			function newScriptElement(){
				const newEl = pageDoc.createElement('script');
				newEl.type = 'text/javascript';
				return newEl;
			}

			if(dependenciesString.includes('mathjax')){
				const newEl = newScriptElement();
				newEl.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.1/MathJax.js?config=TeX-MML-AM_CHTML';

				pageDoc.head.appendChild(newEl);
			}
			if(dependenciesString.includes('prism')){
				const newEl = newScriptElement();
				newEl.src = 'https://alankoval.com/prism/prism.js';

				pageDoc.head.appendChild(newEl);

				// also need the .css file
				const newStyleEl = pageDoc.createElement('link');
				newStyleEl.href = 'https://alankoval.com/prism/prism.css';
				newStyleEl.rel = 'stylesheet';

				pageDoc.head.appendChild(newStyleEl);

				// prism needs to render too
				const newEl2 = newScriptElement();
				newEl2.innerHTML = 'Prism.highlightAll()';

				//insert it after body
				headerDoc.body.parentNode.insertBefore(newEl2, pageDoc.body.nextSibling);
			}

			if(dependenciesString.includes('jquery')){
				const newEl = newScriptElement();
				newEl.src = 'https://code.jquery.com/jquery-3.2.1.min.js';
				newEl.integrity = 'sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=';
				newEl.crossorigin = 'anonymous';

				pageDoc.head.appendChild(newEl);
			}

			if(postData && false){
				// include the discus thread at the bottom
				const divWrapper = pageDoc.createElement('div');
				divWrapper.className = 'padding';

				divWrapper.innerHTML = getDisqusHTML(postData.realUrl, postData.identifier);

				headerDoc.getElementsByClassName('comments')[0].appendChild(divWrapper);
			}

			// transfer the head of pageDom to the head of template file
			// without the spread operator, childNodes is a non-iterable
			for(const child of [...pageDoc.head.childNodes]){
				headerDoc.head.appendChild(child);
			}

			// transfer the body of pageDom to the content div in the template file
			headerDoc.getElementsByClassName('content-posts')[0].innerHTML = pageDoc.body.innerHTML;

			// create target file
			shell.exec(`touch "${newPath}"`);

			// replace urls with local urls for development
			if(developing){
				replaceLinksForDevelopement(headerDoc);
			}

			// about page only, remove the side bar telling who I am
			if(newPath === 'result/about.html'){
				const elList = headerDoc.getElementsByClassName('side-bar');
				if(elList.length > 0){
					headerDoc.getElementsByClassName('side-bar')[0].style.display = 'none';
				}
			}

			// save serialized new document to the target file
			files.writeFileSync(newPath, headerDom.serialize());

			onFinish();
		});
	});
}

function replaceLinksForDevelopement(doc){
	// replace https://alankoval.com/ with C:/.../ (or equiv.) in all a, script and link tags
	elements = [];
	for(const tag of ['a', 'script', 'link']){
		elements = elements.concat([...doc.getElementsByTagName(tag)]);
	}

	for(const el of elements){
		for(const attr of ['href','src']){
			// setting the href automatically reduces folder/file to the full path. In development,
			// this means that it is assigned the full path it is in, which is not what we're looking for.
			// however, if we are changing it, it is a full path so no harm done
			if(el[attr] && el[attr].match(/https:\/\/alankoval\.com/g)){
				el[attr] = el[attr].replace(/https:\/\/alankoval\.com/g, ``);
			}
		}
	}
}

// copies a file from the old path (oldDir\oldName) to newPath (newDir\newName)
function copy(oldDir, oldName, newDir, newName){
	if(files.statSync(`${oldDir}/${oldName}`).isDirectory()){
		shell.exec(`cp -r "${oldDir}/${oldName}/" "${newDir}/"`, {async:false});
	}else{
		shell.exec(`cp -r "${oldDir}/${oldName}" "${newDir}/"`, {async:false});
	}
	if(oldName !== newName){
		shell.exec(`mv "${newDir}/${oldName}" "${newDir}/${newName}"`, {async:false});
	}
}

function constructPostLine(post, doc){
	const html =
	`<div class='post-line'>
		<a class='post-line-link'></a>
		<div class='post-line-words'></div>
	</div>`;

	const container = doc.createElement('div');
	container.innerHTML = html;
    const postObj = container.firstChild;

	const aEl = postObj.getElementsByClassName('post-line-link')[0];
	aEl.href = post.realUrl;
	aEl.textContent = post.title;
	postObj.getElementsByClassName('post-line-words')[0].innerHTML = 
		post.date + ' > ' + 
			post.tags.split(' ')
			.map(s => '<span style="font-weight:bold">' + s + "</span>")
			.join(', ');

    return postObj;
}

function getDisqusHTML(url, identifier){
	return `
		<div id="disqus_thread"></div>
		<script>
		var disqus_config = function () {
			this.page.url = '${url}';
			this.page.identifier = '${identifier}';
		};
		(function() {
		var d = document, s = d.createElement('script');

		s.src = 'https://alankoval.disqus.com/embed.js';

		s.setAttribute('data-timestamp', +new Date());
			(d.head || d.body).appendChild(s);
		})();
		</script>
		<noscript>Please enable JavaScript to view the <a href="https://disqus.com/?ref_noscript" rel="nofollow">comments powered by Disqus.</a></noscript>
	`;
}
