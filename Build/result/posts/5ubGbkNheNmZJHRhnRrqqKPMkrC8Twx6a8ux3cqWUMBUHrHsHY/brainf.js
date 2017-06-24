document.getElementById("run-button").onclick = run;
document.getElementById("code").oninput = codeEditted;
document.getElementById("code").onclick = highlightBrackets;
document.getElementById("step-forward-button").onclick = stepRightClicked;
document.getElementById("step-back-button").onclick = stepLeftClicked;
document.getElementById('restart-button').onclick = restartClicked;
document.getElementById("pause-button").onclick = function(){
    transToPaused();
}
document.getElementById('speed-scale').oninput = speedChanged;
//document.getElementById("code").onblur = setUpLoopIndex;

var data = {};
var output = '';
var pointerIndex = 0;
var charIndex = 0;
var loopIndexJumpTo = [];
var steps = 0;
var somethingOutput;
var paused = false;
var running = false;
var stopped = true;
var interval = null;
var hist = [];
var stepPerUpdate = 50;

function speedChanged(){
    var val = document.getElementById('speed-scale-input').value;
    stepPerUpdate = val+1;
}

function onload(){
    document.getElementById('restart-button').classList.add('hidden');
}

function codeEditted(){
    var codeBlock = document.getElementById("code");
    var saved = saveSelection(codeBlock);
    
    highlightChars(setUpLoopIndex());
    
    restoreSelection(codeBlock,saved);
}

function setUpLoopIndex(){
    loopIndexJumpTo = {};
    var codeBlock = document.getElementById("code");
    
    var text = decodeHtml(codeBlock.textContent);
    codeBlock.innerHTML = text;
    
    var errorChars = [];
    for(var i = 0; i < text.length; i++){
        if(text.charAt(i) === '['){
            //search for matching ]
            var loopStack = [];
            var matchingIndex = null;
            for(var j = i + 1; j < text.length; j++){
                if(text.charAt(j) === '['){
                    loopStack.push(0);
                }else if(text.charAt(j) === ']'){
                    if(loopStack.length > 0){
                        loopStack.pop();
                    }else{
                        matchingIndex = j;
                        break;
                    }
                }
            }
            if(matchingIndex === null){
                //error, bracket not found
                //highlight in red
                errorChars.push(i);
            }else{
                loopIndexJumpTo[i] = j;
                loopIndexJumpTo[j] = i;
            }
        }else if(text.charAt(i) === ']' && loopIndexJumpTo[i] !== 0 && (!loopIndexJumpTo[i] || i === 0)){
            errorChars.push(i);
        }
    }
    var newErrorChars = [];
    for(var l = 0; l < errorChars.length; l++){
        newErrorChars.push({index:errorChars[l],color:"rgba(255,0,0,.3)"});
    }
    
    return newErrorChars;
}

function highlightBrackets(){
    var codeBlock = document.getElementById("code");
    
    var saved = saveSelection(codeBlock);
    
    var position = getCaretCharacterOffsetWithin(codeBlock);
    
    resetHighlighting()
    
    var otherPosition = loopIndexJumpTo[position];
    if(!!otherPosition || otherPosition === 0){
        var theseChars = [
            {index:position,color:"rgba(0,0,0,.1)"},
            {index:otherPosition,color:"rgba(0,0,0,.1)"}]
        //now highlight those
        var toHighlight = setUpLoopIndex().concat(theseChars);
        highlightChars(toHighlight);
    }else{
        highlightChars(setUpLoopIndex());
    }
    
    restoreSelection(codeBlock,saved);
}

//chars: [{index, color (string)},{...]
function highlightChars(chars){
    var codeBlock = document.getElementById("code");
    
    chars.sort(function(a,b){return b.index-a.index;});
    
    for(var k = 0; k < chars.length; k++){
        var toInsert = "<code style='background:"+chars[k].color+"'>"
            + decodeHtml(codeBlock.innerHTML).charAt(chars[k].index)+"</code>";
        
        //apparently innerHTML auto encodes the output...
        codeBlock.innerHTML = decodeHtml(codeBlock.innerHTML).substr(0,chars[k].index) + toInsert +
            decodeHtml(codeBlock.innerHTML).substring(chars[k].index+1, decodeHtml(codeBlock.innerHTML).length );
    }
}

function stepRightClicked(){
    if(stopped){
        run();
        transToPaused()
        pointerIndex = 0;
        output = '';
    }
    if(paused){
        var codeBlock = document.getElementById("code");
        var text = decodeHtml(codeBlock.textContent);
        next(text);
    }
}

function stepLeftClicked(){
    if(paused){
        hist.pop();
        var prev = hist[hist.length-1];
        data = prev.data;
        charIndex = prev.index;
        steps = prev.stepCount
        document.getElementById('output').textContent = prev.output;
        output = prev.output
        updateStepCount()
        resetHighlighting()
        highlightChars([{index:charIndex,color:"rgba(0,0,0,.4)"}]);
    }
}

function restartClicked(){
    transToStopped();
}

function resetHighlighting(){
    var codeBlock = document.getElementById("code");
    codeBlock.innerHTML = decodeHtml(codeBlock.textContent);
}

function run(){
    if(paused){
        transToRunning();
        return;
    }
    //replace run button with pause button
    transToRunning();
    init();
    var codeBlock = document.getElementById("code");
    var text = decodeHtml(codeBlock.textContent);
    if(interval){
        clearInterval(interval)
    }
    interval = setInterval(function (){
        for(var k = 0; k < stepPerUpdate && running === true; k++){
            next(text)
        }
        document.getElementById("output").textContent = output;
    },5);
}

function init(){
    setUpLoopIndex();
    document.getElementById("output").innerHTML = "";
    somethingOutput = false;
    pointerIndex = 0;
    data = {};
    data[0] = 0;
    steps = 0;
    charIndex = 0;
    
}

function updateHistory(){
    var copy = {};
    for(var i in data){
        copy[i] = data[i];
    }
    hist.push({index:charIndex,data:copy,output:output,stepCount:steps});
    if(hist.length > 200){
        hist.shift();
    }
}

function next(text){
    if(charIndex !== text.length){
        updateHistory();
        steps++;
        //update the steps label
        updateStepCount()
        resetHighlighting()
        highlightChars([{index:charIndex,color:"rgba(0,0,0,.4)"}]);
        nextChar(text.charAt(charIndex));
        charIndex++;
    }else{
        transToPaused();
        if(somethingOutput && output.match(/[a-zA-Z0-9!\"#$%&'()*+,-./:;<=>?@\[\\\]\^_`{\|}~¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ]/g) == null){
            var notEmptyClasses = document.getElementById("not-empty").classList;
            notEmptyClasses.remove("hidden");
            var beforeEmptyClasses = document.getElementById("before-not-empty").classList;
            beforeEmptyClasses.remove("hidden");
            setTimeout(function(){
                notEmptyClasses.add("hidden");
                beforeEmptyClasses.add("hidden");
            },3000);
        }
    }
}

function updateStepCount(){
    document.getElementById("steps").innerHTML = "Steps: "+steps;
}

function transToRunning(){
    paused = false;
    running = true;
    stopped = false;
    document.getElementById("run-button").classList.add("gone");
    document.getElementById("pause-button").classList.remove("gone");
    disableDiv(document.getElementById("step-forward-button"));
    disableDiv(document.getElementById("step-back-button"));
    document.getElementById('restart-button').classList.remove('hidden');
}

function transToPaused(){
    paused = true;
    running = false;
    stopped = false;
    document.getElementById("pause-button").classList.add("gone");
    document.getElementById("run-button").classList.remove("gone");
    enableDiv(document.getElementById("step-forward-button"))
    enableDiv(document.getElementById("step-back-button"));
    document.getElementById('restart-button').classList.remove('hidden');
    updateStepCount()
}

function transToStopped(){
    paused = false;
    running = false;
    stopped = true;
    clearInterval(interval);
    enableDiv(document.getElementById("step-forward-button"));
    enableDiv(document.getElementById("step-back-button"));
    document.getElementById("run-button").classList.remove("gone");
    document.getElementById("pause-button").classList.add("gone");
    document.getElementById('restart-button').classList.add('hidden');
    output = '';
    document.getElementById('output').innerHTML = ''
    data = {};
    hist = [];
    charIndex = 0;
    steps = 0;
    somethingOutput = false;
    updateStepCount()
}

function disableDiv(div){
    div.style.pointerEvents = "none";
    div.style.opacity = .5;
}

function enableDiv(div){
    div.style.pointerEvents = "auto"
    div.style.opacity = 1;
}

function nextChar(char){
    if(!data[pointerIndex]){
        data[pointerIndex] = 0;
    }
    if(char === '>'){
        pointerIndex++;
    }else if(char === '<'){
        pointerIndex--;
    }else if(char === '+'){
        data[pointerIndex]++;
        if(data[pointerIndex] > 255){
            data[pointerIndex] = 0;
        }
    }else if(char === '-'){
        data[pointerIndex]--;
        if(data[pointerIndex] < 0){
            data[pointerIndex] = 255;
        }
    }else if(char === '['){
        if(data[pointerIndex] === 0){
            charIndex = loopIndexJumpTo[charIndex];
        }
    }else if(char === ']'){
        if(data[pointerIndex] !== 0){
            charIndex = loopIndexJumpTo[charIndex];
        }
    }else if(char === '.'){
        output += String.fromCharCode(data[pointerIndex]);
        somethingOutput = true;
    }else if(char === ','){
        data[pointerIndex] = parseInt(prompt('input?'))
    }
}

//thanks to Tim Down(!) @ stackoverflow for this: 
//http://stackoverflow.com/questions/13949059/persisting-the-changes-of-range-objects-after-selection-in-html/13950376#13950376
var saveSelection, restoreSelection;

if (window.getSelection && document.createRange) {
    saveSelection = function(containerEl) {
        var range = window.getSelection().getRangeAt(0);
        var preSelectionRange = range.cloneRange();
        preSelectionRange.selectNodeContents(containerEl);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        var start = preSelectionRange.toString().length;

        return {
            start: start,
            end: start + range.toString().length
        }
    };

    restoreSelection = function(containerEl, savedSel) {
        var charIndex = 0, range = document.createRange();
        range.setStart(containerEl, 0);
        range.collapse(true);
        var nodeStack = [containerEl], node, foundStart = false, stop = false;
        
        while (!stop && (node = nodeStack.pop())) {
            if (node.nodeType == 3) {
                var nextCharIndex = charIndex + node.length;
                if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) {
                    range.setStart(node, savedSel.start - charIndex);
                    foundStart = true;
                }
                if (foundStart && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) {
                    range.setEnd(node, savedSel.end - charIndex);
                    stop = true;
                }
                charIndex = nextCharIndex;
            } else {
                var i = node.childNodes.length;
                while (i--) {
                    nodeStack.push(node.childNodes[i]);
                }
            }
        }

        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
} else if (document.selection && document.body.createTextRange) {
    saveSelection = function(containerEl) {
        var selectedTextRange = document.selection.createRange();
        var preSelectionTextRange = document.body.createTextRange();
        preSelectionTextRange.moveToElementText(containerEl);
        preSelectionTextRange.setEndPoint("EndToStart", selectedTextRange);
        var start = preSelectionTextRange.text.length;

        return {
            start: start,
            end: start + selectedTextRange.text.length
        }
    };

    restoreSelection = function(containerEl, savedSel) {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(containerEl);
        textRange.collapse(true);
        textRange.moveEnd("character", savedSel.end);
        textRange.moveStart("character", savedSel.start);
        textRange.select();
    };
}

//Thanks Tim Down (again! gosh, he's all over the place)
//http://stackoverflow.com/questions/4811822/get-a-ranges-start-and-end-offsets-relative-to-its-parent-container/4812022#4812022
function getCaretCharacterOffsetWithin(element) {
    var caretOffset = 0;
    var doc = element.ownerDocument || element.document;
    var win = doc.defaultView || doc.parentWindow;
    var sel;
    if (typeof win.getSelection != "undefined") {
        sel = win.getSelection();
        if (sel.rangeCount > 0) {
            var range = win.getSelection().getRangeAt(0);
            var preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }
    } else if ( (sel = doc.selection) && sel.type != "Control") {
        var textRange = sel.createRange();
        var preCaretTextRange = doc.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        caretOffset = preCaretTextRange.text.length;
    }
    return caretOffset;
}

//Rob W - http://stackoverflow.com/questions/7394748/whats-the-right-way-to-decode-a-string-that-has-special-html-entities-in-it?lq=1
function decodeHtml(html) {
    var txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}