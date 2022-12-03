(function() {
"use strict";
    
var requestAnimFrame = window.requestAnimationFrame || 
    window.mozRequestAnimationFrame || 
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;
var cancelAnimFrame = window.cancelAnimationFrame || 
    window.mozCancelAnimationFrame || 
    window.webkitCancelAnimationFrame ||
    window.msCancelAnimationFrame;
    
var words = []
,   newWords = []
,   wordLinks = []
,   nextAnimate = null
//,   reservedLinks = []
,   maxWordCount = 100
,   browserHeight = 0
,   browserWidth = 0
,   requestID = 0
,   linkFrameNode = document.querySelector("#froot")
,   linkParent = linkFrameNode.parentNode
,   rootWord = null
,   prevRootWords = []
,   seedWord = 'Main_Page'
//,   seedWord = 'evolution'
//,   seedWord = 'Special:Random'
//,   seedWord = 'Portal:Current_events'
//,   seedWord = 'Portal:Arts'
//,   seedWord = 'Outline_of_academic_disciplines'
,   linksLimit = 0
,   gatheringWords = false
,   linkAct = {initialize : 1, position : 2, appear : 3, orbit : 4, remove : 5};
var mwjs = MediaWikiJS({baseURL: 'https://en.wikipedia.org', apiPath: '/w/api.php'});
var canvas = document.querySelector(".canvas")
,   transforms = ["transform", "msTransform", "webkitTransform", "mozTransform", "oTransform"]
,   transitionEnds = ["transitionend", "msTransitionEnd", "webkitTransitionEnd", "mozTransitionEnd", "oTransitionEnd"]
,   transitionDurations = ["transitionDuration", "msTransitionDuration", "webkitTransitionDuration", "mozTransitionDuration", "oTransitionDuration"]
,   transformProperty = getSupportedPropertyName(transforms)
,   transitionEndEvent = getSupportedEventName(transforms,transitionEnds)
,   transitionDurationProperty = getSupportedPropertyName(transitionDurations);

window.onload = function() {
    //var test3dframe = document.querySelector("#test3dframe")
    //,   test3d = document.querySelector("#test3d");
    //test3dframe.style[transformProperty] = "rotateX(10deg) rotateY(-20deg)";
    //test3d.style[transformProperty] = "translate3d(0%,0%,600px)";
    proportionElements();
    gatherWords(seedWord);
    animationLoop();
    setTimeout(function(){ document.querySelector("#acknowlegement").style.opacity = 0; }, 2000);
}
window.onresize = function() {
    proportionElements();
}
function initialize() {
    linkParent.addEventListener(transitionEndEvent,function(e) {
        if (e.propertyName == "transform") {
            //only act on transforms
            var wordLink = wordLinks[e.target.id.slice(1)];
            if (0 == 1) {
                //can delay...
                queueAnimation(wordLink);
            } else {
                //immediately deal with all other transitions
                queueAnimation(wordLink,true);
            }
            //console.log(Date.now() + " transforming " + wordLink.id);
        }
    },false);
    linkParent.addEventListener("click", function(e) {
        if (!gatheringWords) {
            //not in the process of gathering words
            if (e.target.className == "word") {
                var word = e.target;
            } else {
                return;
            }
            //console.log(Date.now() + ", clicked " + word.id + " (" + word.textContent + ")");
            word.style.color = wordLinks[word.parentNode.id.slice(1)].word.color = "Orange";
            gatherWords(word.textContent);
        }
    }, false);
    document.querySelector("#globeframe").addEventListener("mouseenter", function(e) {
        document.querySelector("#globe1").style.cursor = "pointer";
        document.querySelector("#globe1").style.opacity = 1;
    }, false);
    document.querySelector("#globeframe").addEventListener("mouseleave", function(e) {
        document.querySelector("#globe1").style.cursor = "default";
        document.querySelector("#globe1").style.opacity = 0;
    }, false);
    document.querySelector("#globeframe").addEventListener("click", function(e) {
        if (prevRootWords[0] !== undefined) { gatherWords(prevRootWords.pop()); } else gatherWords(seedWord);
    }, false);
}
function proportionElements() {
    browserHeight = document.documentElement.clientHeight;
    browserWidth = document.documentElement.clientWidth;
    //document.querySelector("#test3dframe").style.width = document.querySelector("#test3dframe").style.height =  (browserWidth * 5) + "px";
    //document.querySelector("#test3dframe").style[transformProperty] = "translate3d(-50%,-50%,0) rotateX(-" + (90 + maxVerticalAngle)+ "deg) rotateZ(0deg)";
    linksLimit = Math.floor((browserHeight * browserWidth)/5000);
    //linksLimit = 5;
}
function Word(givenWord) {
    //word constructor
    this.id = words.length;
    this.word = givenWord;
    this.root = rootWord;
    this.link = null;
    this.color = null;
}
function Link() {
    //word link constructor
    this.id = wordLinks.length;
    this.word = null;

    this.action = linkAct.initialize;
    
    //create CSS elements
    this.element = linkFrameNode.cloneNode(true);
    linkParent.appendChild(this.element);
    this.element.id = "f" + this.id;
    this.verticalAngle = 0;
    this.orbitDiameter = 0;
    this.horizontalAngle = 0;
    this.positionFactor = 1 - (Math.random() * 2);
    this.prevAnimateLink = null;
    this.nextAnimateLink = null;

    //word
    this.wordElement = this.element.firstElementChild;
    //this.wordElement.id = "w" + this.id;
    this.wordElement.addEventListener("mouseenter", function(e) {
        if (!gatheringWords) {
            //not in the process of gathering words
            var word = e.target;
            word.style.cursor = "pointer";
            word.style.color = "Yellow";
        }
    }, false);
    this.wordElement.addEventListener("mouseleave", function(e) {
        var word = e.target;
        word.style.cursor = "default";
        word.style.color = (wordLinks[e.target.parentNode.id.slice(1)].word == null ? "white" : wordLinks[e.target.parentNode.id.slice(1)].word.color);
    }, false);

    this.queued = false;
    queueAnimation(this);
    this.active = true;
    //console.log(Date.now() + this.id + " added to animateLinks: " + animateLinks.length);
}
function gatherWords(givenRoot, continueText) {
    if ((givenRoot !== null) && ((continueText === undefined) || gatheringWords)) {
        //only gather links if root given
        if (continueText === undefined) {
            //initial search for links
            if (prevRootWords[0] !== undefined) document.querySelector("#pinwheel").style.opacity = 0.4;
            prevRootWords.push(rootWord);
            rootWord = givenRoot;
            newWords = [];
            gatheringWords = true;
            mwjs.send(
                {action: 'query', prop: 'links', titles: givenRoot, formatversion: 2, pllimit: 'max'}, storeWords);
        } else {
            mwjs.send(
                {action: 'query', prop: 'links', titles: givenRoot, formatversion: 2, pllimit: 'max', plcontinue: continueText}, storeWords);
        }
    }
}
function queueAnimation(wordLink,animateNext) {
    if (!wordLink.queued) {
        //console.log(Date.now() + " queuing animation " + wordLink.id + ", action " + wordLink.action + (wordLink.word != null ? ": " + wordLink.word.word : "") + " animateNext: " + animateNext);
        if (nextAnimate == null) {
            nextAnimate = wordLink.prevAnimateLink = wordLink.nextAnimateLink = wordLink;
        } else {
            wordLink.prevAnimateLink = nextAnimate.prevAnimateLink;
            wordLink.nextAnimateLink = nextAnimate;
            wordLink.prevAnimateLink.nextAnimateLink = wordLink;
            wordLink.nextAnimateLink.prevAnimateLink = wordLink;
            if ((animateNext !== undefined) && animateNext) {
                nextAnimate = wordLink;
            }
        }
        wordLink.queued = wordLink.active = true;
    }
}
function storeWords(data) {
    //store found words in array and continue gathering if not at end
    if (data.query.pages[0].links == null) {
        console.log(Date.now() + " no word links found");
        gatherWords(prevRootWords.pop());
        return;
    }
    data.query.pages[0].links.forEach(function(thisLink){
        if (thisLink.title.search(/^Category\:|^File\:|^G\:|^H\:|^Help\:|^Portal\:|^Talk\:|^Template( talk)?\:|^User\:|^Wikipedia\:/) == -1) {
            // only deal with single-word links - insert in random index
            newWords.push(new Word(thisLink.title));
        } else {
            //console.log("rejected word: " + thisLink.title)
        }
    });
    if (data.continue !== undefined) {
        //console.log(Date.now() + " continuing to gather words");
        gatherWords(rootWord, data.continue.plcontinue);
    } else if (newWords.length == 0) {
        //could not find any links - return to seed word
        gatherWords(seedWord);
    } else {
        document.querySelector("#pinwheel").style.opacity = 0;
        gatheringWords = false;
        words = newWords;
        newWords = [];
        maxWordCount = words.length;
        //console.log(Date.now() + " finished gathering " + maxWordCount + " words");
        wordLinks.forEach(function(wordLink){
            //remove and reactivate all old links
            wordLink.active = true;
            if ((wordLink.word != null) && (wordLink.word.root != rootWord) && (wordLink.word.word != rootWord)) {
                //console.log(Date.now() + " removing link " + wordLink.id);
                wordLink.action = linkAct.remove;
                wordLink.positionFactor = 1 - (2 * Math.random());
            }
            queueAnimation(wordLink);
        });
    }
}
//function verifyAnimateLinks() {
//    if (nextAnimate != null) {
//        var linkCount = 1
//        ,   prevLink = nextAnimate
//        ,   wordLink = nextAnimate.nextAnimateLink;
//        do {
//            if (!wordLink.queued ||
//                (wordLink.prevAnimateLink.id != prevLink.id) ||
//                (wordLink.prevAnimateLink.nextAnimateLink.id != wordLink.id) ||
//                (wordLink.nextAnimateLink.prevAnimateLink.id != wordLink.id) ||
//                (linkCount > 1000)) {
//                console.log(Date.now() + " inconsistent Animate link #" + linkCount + ": " + wordLink.id);
//                return;
//            }
//            prevLink = wordLink;
//            wordLink = wordLink.nextAnimateLink;
//            linkCount++;
//        } while (wordLink.id != nextAnimate.id);
//        //console.log(Date.now() + " " + linkCount + " Animate links");
//    }
//}
function animationLoop() {
    if (nextAnimate != null) {
        //extract link from queue
        var wordLink = nextAnimate;
        if (nextAnimate.nextAnimateLink.id == wordLink.id) {
            nextAnimate = null;
        } else {
            nextAnimate = nextAnimate.nextAnimateLink;
            wordLink.prevAnimateLink.nextAnimateLink = nextAnimate;
            nextAnimate.prevAnimateLink = wordLink.prevAnimateLink;
        }
        wordLink.queued = false;
        if (wordLink.active) {
            //verifyAnimateLinks();
            //console.log(Date.now() + " link " + wordLink.id + ":" + (wordLink.word == null ? "" : wordLink.word.word) + " action " + wordLink.action);
            if (wordLink.action == linkAct.initialize) {
                if (words.length > 0) {
                    //room for more words, words available - assign and remove from array
                    var wordChosen = Math.floor(Math.random() * words.length);
                    wordLink.word = words.splice(wordChosen,1)[0];
                    wordLink.word.link = nextAnimate;
                    //console.log(Date.now() + ", initializing " + wordLink.id + " to " + wordLink.word.word);
                    wordLink.wordElement.style.opacity = 0; 
                    wordLink.wordElement.textContent = wordLink.word.word;
                
                    wordLink.orbitDiameter = Math.min(browserWidth + (4 * browserWidth * Math.pow(Math.random(),5)),7500);
                    var maxVerticalAngle = Math.atan((browserHeight * (10000 - wordLink.orbitDiameter))/(10000 * wordLink.orbitDiameter)) * (180/Math.PI);
                    wordLink.verticalAngle = maxVerticalAngle - (2 * maxVerticalAngle * Math.random());
                    wordLink.wordElement.style.fontSize = (10 * wordLink.orbitDiameter)/browserWidth + "px";
                    wordLink.horizontalAngle =
                        Math.min(90,(71 - (browserWidth/100) + ((Math.asin((browserWidth-wordLink.orbitDiameter)/wordLink.orbitDiameter)) * (180/Math.PI))) +
                                (Math.atan(wordLink.wordElement.clientWidth/wordLink.orbitDiameter) * (180/Math.PI)));
    
                    wordLink.element.style.visibility = "hidden";
                    wordLink.element.style.width = wordLink.element.style.height = wordLink.orbitDiameter + "px";
                    wordLink.element.style[transitionDurationProperty] = "0.5s";
                    wordLink.element.style.transitionDelay = "";
                    wordLink.element.style[transformProperty] =
                        "translate3d(-50%,-50%,-2px) rotateX(-" + (90 + wordLink.verticalAngle) + "deg) rotateZ(" + wordLink.horizontalAngle + "deg)";
                    wordLink.element.style.transitionTimingFunction = "linear";
                    wordLink.action = linkAct.position;
                } else if (!gatheringWords) {
                    //not enough words - reserve link
                    wordLink.active = false;
                    wordLink.element.style.visibility = "hidden";
                } else {
                    //don't act when gathering words
                    queueAnimation(wordLink);
                }
            } else if (wordLink.action == linkAct.position) {
                //console.log(Date.now() + ", positioning " + wordLink.id + " hor " + wordLink.horizontalAngle + " ver " + wordLink.verticalAngle);
                wordLink.element.style.visibility = "visible";
                wordLink.element.style[transitionDurationProperty] = "0.5s";
                wordLink.element.style.transitionDelay = Math.random() + "s";
                //console.log(Date.now() + " delay " + wordLink.element.style.transitionDelay);
                wordLink.element.style[transformProperty] =
                    "translate3d(-50%,-50%,-1px) rotateX(-" + (90 + wordLink.verticalAngle) + "deg) rotateZ(" + wordLink.horizontalAngle + "deg)";
                wordLink.action = linkAct.appear;
            } else if (wordLink.action == linkAct.appear) {
                //console.log(Date.now() + ", appearing " + wordLink.id + ", position factor " + wordLink.positionFactor);
                // link ready to appear
                if (wordLink.positionFactor == 1) {
                    wordLink.wordElement.style.color = wordLink.word.color = ((wordLink.word.word == rootWord) ? "Orange" :
                        "hsla(190,100%,100%," + (0.2 + Math.pow(wordLink.orbitDiameter/(5 * browserWidth),0.5)) + ")");
                } else {
                    wordLink.wordElement.style.color = wordLink.word.color = "hsla(270, 100%, 50%, 1)"; //purple
                }
                wordLink.wordElement.style.opacity = 1; 
                wordLink.element.style[transitionDurationProperty] = "0.5s";
                wordLink.element.style.transitionDelay = "";
                wordLink.element.style[transformProperty] =
                    "translate3d(-50%,-50%,0) rotateX(-" + (90 + wordLink.verticalAngle) + "deg) rotateZ(" + (wordLink.horizontalAngle * wordLink.positionFactor) + "deg)";
                //console.log(Date.now() + " transform " + wordLink.element.style[transformProperty]);
                wordLink.action = linkAct.orbit;                
            } else if (wordLink.action == linkAct.orbit) {
                // link ready to orbit
                //console.log(Date.now() + ", orbiting " + wordLink.id);
                if (wordLink.positionFactor != 1) {
                    wordLink.wordElement.style.color = wordLink.word.color = ((wordLink.word.word == rootWord) ? "Orange" :
                        "hsla(190,100%,100%," + (0.2 + Math.pow(wordLink.orbitDiameter/(5 * browserWidth),0.5)) + ")");
                }
                wordLink.element.style[transitionDurationProperty] = (wordLink.horizontalAngle * ((1 + wordLink.positionFactor)/2)) + "s";
                //console.log(Date.now() + " duration " + wordLink.element.style[transitionDurationProperty]);
                wordLink.element.style.transitionDelay = "";
                wordLink.element.style[transformProperty] =
                    "translate3d(-50%,-50%,0) rotateX(-" + (90 + wordLink.verticalAngle) + "deg) rotateZ(-" + wordLink.horizontalAngle + "deg)";
                wordLink.positionFactor = 1;
                wordLink.action = linkAct.remove;
            } else if (wordLink.action == linkAct.remove) {
                // link ready to disappear
                //console.log(Date.now() + ", removing " + wordLink.id);
                if ((wordLink.word.root == rootWord) || (wordLink.word.word == rootWord) || gatheringWords) {
                    //discarded word is from current root - recycle it
                    words.push(wordLink.word);
                } else {
                    wordLink.wordElement.style.color = "hsla(270, 100%, 50%, 1)";
                }
                wordLink.wordElement.style.opacity = 0;
                wordLink.word.link = wordLink.word = null;
                wordLink.element.style[transitionDurationProperty] = "0.5s";
                wordLink.element.style[transformProperty] =
                    "translate3d(-50%,-50%,1px) rotateX(-" + (90 + wordLink.verticalAngle) + "deg) rotateZ(-" + wordLink.horizontalAngle + "deg)";
                wordLink.action = linkAct.initialize;
            } 
        }
    }
    if (wordLinks.length < Math.min(linksLimit,maxWordCount)) {
            //we have room for another link
            wordLinks.push(new Link());
            //console.log("created " + nextAnimate.id);
    }
   requestID = requestAnimFrame(animationLoop);  
}
function getSupportedPropertyName(properties) {
    for (var i = 0, max = properties.length; i < max; i++) {
        if (typeof document.body.style[properties[i]] != "undefined") {
            return properties[i];
        }
    }
    return null;
}
function getSupportedEventName(properties,events) {
    for (var i = 0, max = properties.length; i < max; i++) {
        if (typeof document.body.style[properties[i]] != "undefined") {
            return events[i];
        }
    }
    return null;
}

initialize();
})();
