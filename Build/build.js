// This creates a new directory, "build-result" that contains the entire website as it is meant to be uploaded 
// to AWS s3. Yes, I'm probably supposed to use something different. But hey, at least I'm not copy pasting files, right?

// It is meant to be run as a node.js program

// The end goal is to get a file tree that looks like this:
// alankoval.com
//	about.html 
//  blog.html
//  header-styles.css
//  prism (folder)
//  3dgrapher
//      index.html
//      ...dependencies
//	posts
//		post1.html
//		post2.html
//      AeAsGgtHhSg... (folder containing dependencies for post1)
//      YuirtWtuerQ... (folder containing dependencies for post2)

// for running command line args
const exec = require('child_process').execSync;
// for manipulating HTML as a DOM
const {JSDOM} = require('jsdom');
// for saving files
const files = require('fs');

const git = '"C:\\Program Files\\Git\\bin\\git.exe"';
//get the latest version of the website from github
//exec(`${git} pull origin master`);

// Remove result directory, then add it back (remove all the files)
// /s is for removing all sub-elements, /q is for quiet (no confirmation)
if(files.existsSync('result')){
	exec('rmdir /s /q result');
}
exec('mkdir result');

// about page (we'll proceed in order)
buildPage('../About/about.html', 'result/about.html', false);

// projects page
buildPage('../Projects/projects.html', 'result/projects.html', false);

// we'll build the blog page later, before editing

// copy over all the files in Boiler Plate 
for(const name of files.readdirSync('../Boiler Plate')){
	// we specifically don't need homepage-template.html
	if(name === 'homepage-template.html'){
		continue;
	}
	
	// if the child is a directory, use xcopy
	if(files.statSync(`../Boiler Plate/${name}`).isDirectory()){
		exec(`echo d | xcopy /q /r /y "../Boiler Plate/${name}" "result/${name}"`);
	}else{
		copy('../Boiler Plate', name, 'result', name);
	}
}

// create posts directory 
exec('mkdir "result/posts"');

// iterate through the post folder, building as we go 
const postFolders = files.readdirSync('../Blog/Posts')
	.filter(x => files.statSync('../Blog/Posts/'+x).isDirectory());
	
// we'll sort the posts by date in a bit
const posts = [];
for(const folder of postFolders){
	// each of these is a separate post
	// build the post.html file in the folder
	const postUrl = `../Blog/Posts/${folder}/post.html`;
	JSDOM.fromFile(postUrl).then(postDom => {
		//check for metadata
		const metaEls = postDom.window.document.getElementsByTagName('meta');
		const postData = {url: postUrl};
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
		
		postData.realUrl = 'http://alankoval.com/posts/' + postData.url;
		
		// put all the other files under the directory 'identifier/name'
		exec(`mkdir "result/posts/${postData.identifier}"`);
		const otherFiles = files.readdirSync(`../Blog/Posts/${folder}`).filter(x => x !== 'post.html');
		for(const f of otherFiles){
			copy(`../Blog/Posts/${folder}`, f, `result/posts/${postData.identifier}`, f);
		}
		
		buildPage(postUrl, `result/posts/${postData.url}`, postData);
		
		posts.push(postData);
		
		// if this is the last promise, and we are ready to move along
		if(posts.length === 1){
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
		
		// save result 
		files.writeFile('result/blog.html', blogDom.serialize(), err => {
			if(err){
				console.log(err);
			}
		});
	});	
}

// takes a ___-content.html file, wraps it in the necessary headers and copies it
// to the desired path
function buildPage(contentPath, newPath, postData, onFinish = ()=>{}){
	// load template html using jsdom 
	JSDOM.fromFile('../Boiler Plate/homepage-template.html').then(headerDom => {
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
			
			const newScriptElement = () => {
				const newEl = pageDoc.createElement('script');
				newEl.type = 'text/javascript';
				return newEl;
			}
			
			if(dependenciesString.includes('mathjax')){
				const newEl = newScriptElement();
				newEl.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.1/MathJax.js?...';
				
				pageDoc.head.appendChild(newEl);
				
				// mathjax needs to render when its done, so we need to append something to the bottom
				// of the page as well
				const newEl2 = newScriptElement();
				newEl2.innerHTML = 'MathJax.Hub.Queue(["Typeset",MathJax.Hub])';
				
				// insert it immediately after the body element
				headerDoc.body.parentNode.insertBefore(newEl2, pageDoc.body.nextSibling);
			}
			
			if(dependenciesString.includes('prism')){
				const newEl = newScriptElement();
				newEl.src = 'http://alankoval.com/prism/prism.js';
				
				pageDoc.head.appendChild(newEl);
				
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
			
			if(postData){
				// include the discus thread at the bottom
				const divWrapper = pageDoc.createElement('div');
				divWrapper.className = 'padding';
				
				divWrapper.innerHTML = getDiscusHTML(postData.realUrl, postData.identifier);
				
				headerDoc.getElementsByClassName('comments')[0].appendChild(divWrapper);
			}
			
			// transfer the head of pageDom to the head of template file
			for(const child of pageDoc.head.childNodes){
				headerDoc.head.appendChild = child;
			}
			
			// transfer the body of pageDom to the content div in the template file
			headerDoc.getElementsByClassName('content-posts')[0].innerHTML = pageDoc.body.innerHTML;
			
			// create target file
			exec(`echo "" > ${newPath}`);
			
			// save serialized new document to the target file
			files.writeFile(newPath, headerDom.serialize(), err => {
				if(err){
					console.log(err);
				}
			});
			
			onFinish();
		});
	});
}

// specifically builds a post html page, including discus commenting and 
// necessary headers. Automatically includes other files in the folder
function buildPost(postFolder, newDir){
	
}

// copies a file from the old path (oldDir\oldName) to newPath (newDir\newName)
function copy(oldDir, oldName, newDir, newName){
	// quotes are just in case there are spaces in the name
	exec(`copy "${oldDir}\\${oldName}" "${newDir}"`);
	exec(`rename "${newDir}\\${oldName}" "${newName}"`);
}

function constructPostLine(post, doc){
	const html =
	`<a class='post-line'>
		<div class='post-line-image-container'>
			<img class='post-line-image' src='img/lizard.png'>
		</div>
		<div class='post-line-words'>
			<div class='post-line-title'>Example post</div>
			<div class='post-line-description'>Well, I guess this is my first post. I'm Alan, by the way. I'm a <s>junior</s> senior
			in high school. I do stuff, and I hope this doesn't run off the div.</div>
			<div class='post-line-date'>6/11/2016 > Math</div>
		</div>
	</a>`;
	
	const container = doc.createElement('div');
	container.innerHTML = html;
    const postObj = container.firstChild;
	
    postObj.href = post.realUrl;
	postObj.getElementsByClassName('post-line-title')[0].innerHTML = post.title;
	postObj.getElementsByClassName('post-line-description')[0].innerHTML = post.description;
	if(post.thumbnail && post.thumbnail.trim().length > 0){
		postObj.getElementsByClassName('post-line-image')[0].src = post.thumbnail;
	}else{
		postObj.getElementsByClassName('post-line-image-container')[0].innerHTML = '';
	}
	postObj.getElementsByClassName('post-line-date')[0].innerHTML =
		post.date + ' > ' + post.tags.split(' ').join(', ');
    return postObj;
}

function getDiscusHTML(url, identifier){
	return `
		<div id="disqus_thread"></div>
		<script>
		var disqus_config = function () {
			this.page.url = '${url}';
			this.page.identifier = '${identifier}';
		};
		(function() {
		var d = document, s = d.createElement('script');
		
		s.src = '//alankoval.disqus.com/embed.js';
		
		s.setAttribute('data-timestamp', +new Date());
			(d.head || d.body).appendChild(s);
		})();
		</script>
		<noscript>Please enable JavaScript to view the <a href="https://disqus.com/?ref_noscript" rel="nofollow">comments powered by Disqus.</a></noscript>
	`;
}


