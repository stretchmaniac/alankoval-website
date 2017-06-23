$(function(){
    $('body').load('homepage-template.html',function(){load();})
})

function load(){
    $.getJSON('Posts/post-data.json',function(data){
        var message = window.location.search.substring(1);
        var include = null;
        if(message.endsWith('coding')){
            $('.coding-header').css('background-color','rgb(25, 147, 17)');
            $('.coding-header').css('color','white');
            include = 'Coding';
        }else if(message.endsWith('math')){
            $('.math-header').css('background-color','rgb(25, 147, 17)');
            $('.math-header').css('color','white');
            include = 'Math';
        }else if(message.endsWith('physics')){
            $('.physics-header').css('background-color','rgb(25, 147, 17)');
            $('.physics-header').css('color','white');
            include = 'Physics';
        }else if(message.endsWith('school')){
            $('.school-header').css('background-color','rgb(25, 147, 17)');
            $('.school-header').css('color','white');
            include = 'School';
        }
        var posts = data.posts;
        for(var k = posts.length-1; k >= 0; k--){
            if(include === null || posts[k].category.toLowerCase().trim() == include.toLowerCase().trim()){
                var post = contructPostLine(posts[k])
                $('.content-posts').append(post);
            }
        }
    });
    $('#header-blog').css('background-color','rgb(25, 147, 17)');
    $('#header-blog').css('color','white');
}

//returns a div with the post in it
function contructPostLine(post){
    var html = `<a class='post-line'>
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
    var postObj = $('<div/>').html(html).contents();
    postObj.prop('href',post.file);
    postObj.find('.post-line-title').html(post['title']);
    postObj.find('.post-line-description').html(post['summary']);
    postObj.find('.post-line-image').prop('src',post['image-file']);
    postObj.find('.post-line-date').html(post['date']+' > '+post['category']);
    return postObj;
}