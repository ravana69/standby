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
    
var canvas = document.querySelector(".canvas")
,   cubo = document.querySelector("#cubo")
,   cubodiv = document.querySelector("#cubo div")
,   cuboFrame = document.querySelector("#cuboFrame")
,   orbit = document.querySelector("#orbit")
,   moon = document.querySelector("#moon")
,   sides = []
,   dotsPerSide = 0
,   beginX = 0
,   beginY = 0
,   backgroundCharacters = ["A","B","E","G","H","K","M","R","S","W","X","3","4","5","8","9"]
,   hues = [0,30,60,90,150,180,240,300,330]
,   expandFactor = 0
,   orbitOrientation = 0
,   animationId = null
,   dotQueue = []
,   transforms = ["transform", "msTransform", "webkitTransform", "mozTransform", "oTransform"]
,   transitionEnds = ["transitionend", "msTransitionEnd", "webkitTransitionEnd", "mozTransitionEnd", "oTransitionEnd"]
,   transitionDurations = ["transitionDuration", "msTransitionDuration", "webkitTransitionDuration", "mozTransitionDuration", "oTransitionDuration"]
,   animations = ["animation", "msAnimation", "webkitAnimation", "mozAnimation", "oanimation"]
,   animationEnds = ["animationend", "MSAnimationEnd", "webkitAnimationEnd", "mozAnimationEnd", "oAnimationEnd"]
,   transformProperty = getSupportedPropertyName(transforms)
,   transitionEndEvent = getSupportedEventName(transforms,transitionEnds)
,   transitionDurationProperty = getSupportedPropertyName(transitionDurations)
,   animationProperty = getSupportedPropertyName(animations)
,   animationEndEvent = getSupportedEventName(animations,animationEnds);

window.onload = function() {
    proportionElements();
    var timeoutValue = 2000
    ,   rotationDuration = 200
    ,   orbitDuration = 100;
   
    document.querySelector("#center").style.opacity = 1;
    //randomly display remaining sides, ending with closest
    for (var chosenSide = 0, randomSides=[], i=1; i < 14; ++i) { randomSides.push(i); }
    do {
        chosenSide = randomSides.splice(Math.floor(Math.random() * randomSides.length),1)[0];
        timeoutValue = timeoutValue + 1000;
        (function(s,t) {
            setTimeout(function() {
                sides[s].element.style.opacity = 1.0;
                sides[s].element.style[transformProperty] = sides[s].element.style[transformProperty] + " translateZ(" + expandFactor + "px)";
            },t);
        }) (chosenSide,timeoutValue);
    } while (randomSides.length > 0);
    timeoutValue = timeoutValue + 1000;
    (function(t) {
        setTimeout(function() {
            sides[0].element.style.opacity = 1.0;
            sides[0].element.style[transformProperty] = sides[0].element.style[transformProperty] + " translateZ(" + expandFactor + "px)";
        },t);
    }) (timeoutValue);

    timeoutValue = timeoutValue + 2000;
    (function(t) {
        setTimeout(function() {
            expandFactor = 0;
            for (var i = 0; i < sides.length; i++) {
                sides[i].element.classList.remove("sidePreLoad");
                sides[i].element.classList.add("sidePostLoad");
                if (sides[i].type == "square") {
                    sides[i].dotFrame.classList.remove("sidePreLoad");
                    sides[i].dotFrame.classList.add("sidePostLoad");
                }
            }
            cuboFrame.style.animationName = "spinXYZ";
            cuboFrame.style.animationDuration = rotationDuration + "s";
            cuboFrame.style.animationTimingFunction = "ease-in";
            cuboFrame.style.animationIterationCount = 1;
            cuboFrame.addEventListener(animationEndEvent,function(e) {
                cuboFrame.style.animationName = "spinXYZ";
                cuboFrame.style.animationDuration = rotationDuration + "s";
                cuboFrame.style.animationTimingFunction = "linear";
                cuboFrame.style.animationIterationCount = "infinite";
                }
            ,false);
            sides.forEach(function(side) {
                side.element.style.transitionDuration = "100s";
                side.element.style.opacity = 0.3;
            });
        },t);
    }) (timeoutValue);

    timeoutValue = timeoutValue + 500;
    (function(t) {
        setTimeout(function() {
            moon.style.opacity = 1.0;
            orbit.style.animationName = "spin";
            orbit.style.animationDuration = orbitDuration + "s";
            orbit.style.animationTimingFunction = "ease-in";
            orbit.style.animationIterationCount = 1;
            orbit.addEventListener(animationEndEvent,function(e) {
                orbit.style.animationName = "spin";
                orbit.style.animationDuration = orbitDuration + "s";
                orbit.style.animationTimingFunction = "linear";
                orbit.style.animationIterationCount = "infinite";
                }
            ,false);
            moon.style.animationName = "antiorbit";
            moon.style.animationDuration = orbitDuration + "s";
            moon.style.animationTimingFunction = "ease-in";
            moon.style.animationIterationCount = 1;
            moon.addEventListener(animationEndEvent,function(e) {
                moon.style.animationName = "antiorbit";
                moon.style.animationDuration = orbitDuration + "s";
                moon.style.animationTimingFunction = "linear";
                moon.style.animationIterationCount = "infinite";
                }
            ,false);
        },t);
    }) (timeoutValue);

    setTimeout(function() { animationLoop(); },timeoutValue + 3000);
}
window.onresize = function() {
    proportionElements();
}
function initialize() {
    var background0 = document.querySelector("#b0")
    ,   background1 = document.querySelector("#b1")
    ,   centerimg = document.querySelector("#centerimg")
    ,   moonimg = document.querySelector("#moonimg")
    ,   chosenImage = Math.floor(Math.random() * 6);

    document.querySelector(".background").style.fontSize = (2 * document.documentElement.clientHeight) + "px";
    background0.textContent = backgroundCharacters[Math.floor(Math.random() * backgroundCharacters.length)];
    background0.style[transformProperty] = "translate3d(-50%, -50%, 0) scale(3) rotateZ(" + (Math.random() * 360) + "deg)";
    background1.textContent = backgroundCharacters[Math.floor(Math.random() * backgroundCharacters.length)];
    background1.style[transformProperty] = "translate3d(-50%, -50%, 0) scale(3) rotateZ(" + (Math.random() * 360) + "deg)";
    centerimg.style.backgroundPosition = (chosenImage * (100/7)) + "% 0%";
    moonimg.style.backgroundPosition = (chosenImage * (100/7)) + "% 100%";
    moonimg.addEventListener("click", clickMoon, false);

    dotsPerSide = Math.floor(Math.random() * 5) + 6;
    beginX = (Math.random() * 50) - 25;
    beginY = (Math.random() * 50) - 25;
    for (var sideHues = hues, i = 0; i < 6; i++) {
        sides.push(new SquareSide(i, sideHues));
    }
    for (var i = 0; i < 8; i++) {
        sides.push(new TriangleSide(i));
    }
    expandFactor = document.documentElement.clientHeight/35;
    orbitOrientation = Math.random() < 0.5 ? -1 : 1;
}
function proportionElements() {
    var center = document.querySelector("#center")
    ,   orbitFrame = document.querySelector("#orbitFrame2")
    ,   sideExtendFactor = 0.02
    ,   sideTranslateZFactor = 0.707
    ,   sideLength = ((Math.min(document.documentElement.clientHeight, document.documentElement.clientWidth) * 1)/2)
    ,   dotRadius = sideLength/(dotsPerSide * 3);
    
    cubo.style.height = cubo.style.width = sideLength + "px";
    center.style.height = center.style.width = moon.style.height = moon.style.width = Math.min(50,sideLength/5) + "px";
    sides.forEach(function(side) {
        if (side.type == "square") {
            side.element.style.height = side.element.style.width = side.dotFrame.style.height = side.dotFrame.style.width = sideLength + "px";
            side.element.style[transformProperty] = "rotateX(" + beginX + "deg) " +
                "rotateY(" + beginY + "deg) " +
                "rotateX(" + side.rotateX + "deg) " +
                "rotateY(" + side.rotateY + "deg) " +
                "rotateZ(" + side.rotateZ + "deg) " +
                "translateZ(" + ((sideLength * (sideTranslateZFactor + sideExtendFactor)) - expandFactor) + "px)";
            side.dotFrame.style[transformProperty] = side.element.style[transformProperty] +
                "translateZ(" + (1 + expandFactor) + "px)";
            side.dots.forEach(function(dotx) {
                dotx.forEach(function(dot) {
                    dot.element.style.height = dot.element.style.width = (dotRadius * 2) + "px";
                    dot.element.style.top = (dot.y * dotRadius * 3) + (dotRadius/2) + "px";
                    dot.element.style.left = (dot.x * dotRadius * 3) + (dotRadius/2)+ "px";
                    dot.element.addEventListener(animationEndEvent,function(e) {
                        if (e.animationName == "dotAppear0") { dot.element.style.animationName = ""; }
                        e.cancelBubble = true;
                    }, false);
                });
            });
            side.element.style.background = "radial-gradient(circle,hsla(" + side.hue + ",100%," + side.luminosity + "%,1)," +
                "hsla(" + side.hue + ",100%," + (side.luminosity - 20) + "%,1))";
        } else {
            side.element.style.borderLeftWidth = side.element.style.borderRightWidth = (sideLength/2) + "px";
            side.element.style.borderBottomWidth = (sideLength * 0.866) + "px";
            side.element.style.transformOrigin = "50% " + (sideLength/2) + "px 0px";
            side.element.style[transformProperty] = "rotateX(" + beginX + "deg) " +
                "rotateY(" + beginY + "deg) " +
                "rotateZ(" + side.rotateZ + "deg) " +
                "translateY(" + ((sideLength/2) * (side.typeCount < 4 ? -1 : 1) * 0.264) + "px) " +
                "rotateX(" + side.rotateX + "deg) " +
                "translateZ(" + ((sideLength * (sideTranslateZFactor + sideExtendFactor)) - expandFactor) + "px)";
            side.element.style.borderBottomColor = "hsla(" + side.hue + ",0%," + side.luminosity + "%,1)";
        }
    });
    orbitFrame.style.height = orbitFrame.style.width =
         Math.sqrt(Math.pow(document.documentElement.clientHeight,2) + Math.pow(document.documentElement.clientWidth,2)) * 0.6 + "px";
    orbitFrame.style[transformProperty] = "translate3d(-50%, -50%, 0) rotateX(85deg) rotateZ(15deg) rotateY(" +
        orbitOrientation * Math.atan(document.documentElement.clientHeight/document.documentElement.clientWidth) + "rad)";
}
function SquareSide(i, sideHues) {
    //square side constructor
    var squareNode = document.querySelector("#s0")
    ,   dotFrameNode = document.querySelector("#df0");

    this.id = sides.length;
    this.type = "square";
    this.typeCount = i;
    
    if (i == 0) {
        var newSide = squareNode;
        var newDotFrame = dotFrameNode;
    } else {
        //after the first side, create new elements
        var newSide = squareNode.cloneNode(true);
        cubo.appendChild(newSide);
        var newDotFrame = dotFrameNode.cloneNode(true);
        cubo.appendChild(newDotFrame);
    }
    this.rotateX = (i == 0 ? 0 : (i == 5 ? 180 : 90));
    this.rotateY = this.rotateZ = (i == 0 ? 0 : (i == 5 ? 0 : 45 + ((i - 1) * 90)));
    this.element = newSide;
    this.dotFrame = newDotFrame;
    newSide.id = "s" + i;
    newDotFrame.id = "df" + i;
    this.dots = [];
    for (var j = 0; j < dotsPerSide; j++) {
        var row = [];
        for (var k = 0; k < dotsPerSide; k++) {
            row.push(new Dot(i,j,k,this,newDotFrame));
        }
        this.dots.push(row);
    }
    this.hue = sideHues.splice(Math.floor(Math.random() * sideHues.length),1)[0];
    this.luminosity = 50;
    this.dotHue = null;
    this.dotFrame.addEventListener("click", clickSide, false);
}
function TriangleSide(i) {
    var triangleNode = document.querySelector("#t0");
    //square side constructor
    this.id = sides.length;
    this.type = "triangle";
    this.typeCount = i;
    
    if (i == 0) {
        var newSide = triangleNode;
    } else {
        //after the first side, create new elements
        var newSide = triangleNode.cloneNode(true);
        cubo.appendChild(newSide);
    }
    this.rotateX = (i < 4 ? 0 : 180) + 54.8;
    this.rotateZ = (i % 4) * 90;
    this.element = newSide;
    newSide.id = "t" + i;
    this.hue = 0;
    this.luminosity = 70 + (Math.random() * 30);
    this.element.addEventListener("click", clickSide, false);
}
function Dot(i,j,k,side,dotFrame) {
    //dot constructor
    this.side = side;
    this.x = j;
    this.y = k;

    if (i == 0) {
        var dotNode = document.querySelector("#df0c0r0");
        //build dot structure on 1st side
        if ((j == 0)  && (k == 0)) {
            var newDot = dotNode;
        } else {
            var newDot = dotNode.cloneNode(true);
            dotFrame.appendChild(newDot);
        }
    } else {
        newDot = dotFrame.querySelector("#df0c" + j + "r" + k)
    }
    
    this.element = newDot;
    newDot.id = "df" + i + "c" + j + "r" + k;
    this.element.addEventListener("click", clickSide, false);
}
function clickSide(e) {
    var chosenSide = null;
    if (e.currentTarget.classList.contains("dotFrame")) {
        chosenSide = sides[Number(e.currentTarget.id.substr(2,1))];
        chosenSide.dots.forEach(function(dotRow){
            dotRow.forEach(function(dot){
                dot.element.style.backgroundColor = "hsla(0,100%,100%,1)";
                dot.element.style.animationName = "dotAppear2";
                dot.element.style.animationDuration = "1s";
                dot.element.style.animationFillMode = "forwards";
            });
        });
    } else if (e.currentTarget.classList.contains("triangle")) {
        chosenSide = sides[6 + Number(e.currentTarget.id.substr(1,1))];
    } else if (e.currentTarget.classList.contains("dot")) {
        chosenSide = sides[Number(e.currentTarget.id.substr(2,1))];
    }
    chosenSide.element.style.animationTimingFunction = "ease-out";
    chosenSide.element.style.transitionDuration = "1s";
    chosenSide.element.style.opacity = 1;
    (function(s,t) {
        setTimeout(function() { 
            s.element.style.animationTimingFunction = "ease-in";
            s.element.style.transitionDuration = "100s";
            s.element.style.opacity = "0.3";
        },t);
    }) (chosenSide,1000);
}
function clickMoon(e) {
    cancelAnimFrame(animationId);
    sides.forEach(function(side) {
        side.element.style.transitionDuration = "2s";
        side.element.style.animationTimingFunction = "ease-in-out";
        side.element.style.opacity = 0;
        if (side.type == "square") {
            side.dotFrame.style.transitionDuration = "2s";
            side.dotFrame.style.animationTimingFunction = "ease-in-out";
            side.dotFrame.style.opacity = 0;
        }
        (function(s,t) {
            setTimeout(function() {
                //s.element[transformProperty] = "none";
                s.element.style.animationTimingFunction = "ease-in";
                s.element.style.transitionDuration = "30s";
                s.element.style.opacity = "0.3";
                if (s.type == "square") {
                    s.dots.forEach(function(dotx) {
                        dotx.forEach(function(dot) {
                            dot.element.style.opacity = 0;
                            dot.element.style.animationName = "";
                        });
                    });
                    s.dotFrame.style.animationTimingFunction = "ease-in";
                    s.dotFrame.style.transitionDuration = "10s";
                    s.dotFrame.style.opacity = 1;
                }
            },t);
        }) (side, 2500 + (side,Math.random() * 1000));
    });
    setTimeout(function() { animationLoop(); },5000);
}
function processDot(cycle, currentTime, dot) {
    var currentDot = null;
    if (cycle == -1) {
        if (dot === undefined) {
            sides.filter(function(x) {return x.type == "square";}).forEach(function(side) {
                processDot(cycle, currentTime, side.dots[0][0]);
            });
        } else {
            currentDot = dot.side.dots[Math.floor(Math.random() * dotsPerSide)][Math.floor(Math.random() * dotsPerSide)];
            currentDot.side.dotHue = dot.side.hue + ((Math.random() < 0.5 ? -1 : 1 ) * 150);
            dotQueue.push({dot:currentDot, cycle:cycle, wake:(currentTime + (500 * currentDot.side.typeCount))});
            dotQueue.sort(function(a,b) { return a.wake - b.wake; });
        }
    } else {
        var targetDots = [];
        if (cycle == 0) {
            targetDots = [{x:0,y:0}];
        } else if (cycle == 1) {
            targetDots = [{x:-1,y:0},{x:1,y:0}];
        } else if (cycle == 2) {
            targetDots = [{x:0,y:-1},{x:0,y:1}];
        } else if (cycle == 3) {
            targetDots = [{x:-1,y:-1},{x:1,y:-1},{x:-1,y:1},{x:1,y:1}];
        } else if ((cycle == 4) || (cycle == 5)) {
            for (var availableDots = [], i=0; i < 25; ++i) { availableDots.push({x:(i % 5) - 2,y: Math.floor(i/5) - 2}); }
            for (var targetDots = [], i = 0; i < (cycle + 1); i++) {
                targetDots.push(availableDots.splice(Math.floor(Math.random() * availableDots.length),1)[0]);
            }
        } else {
            for (var availableDots = [], i=0; i < 36; ++i) { availableDots.push({x:(i % 6) - 2,y: Math.floor(i/5) - 2}); }
            for (var targetDots = [], i = 0; i < (cycle + 5); i++) {
                targetDots.push(availableDots.splice(Math.floor(Math.random() * availableDots.length),1)[0]);
            }
        }
        targetDots.forEach(function(targetDot) {
            if ((dot.x > (0 - targetDot.x) - 1) && (dot.x < (dotsPerSide - targetDot.x)) &&
                    (dot.y > (0 - targetDot.y) - 1) && (dot.y < (dotsPerSide - targetDot.y))) {
                currentDot = dot.side.dots[dot.x + targetDot.x][dot.y + targetDot.y];
                currentDot.element.style.backgroundColor = (cycle == 0 ? "hsla(0,100%,100%,1)" :
                    "hsla(" + (currentDot.side.dotHue + ((Math.random() * 30) - 15)) + ",100%," + (100 - (Math.random() * (cycle * 5))) + "%,1)");
                //cancel any existing animation
                currentDot.element.style.animationName = (cycle < 6 ? "dotAppear0" : "dotAppear1");
                currentDot.element.style.animationFillMode = "forwards";
                currentDot.element.style.animationDuration = (cycle == 0 ? 3 : cycle == 6 ? 3 : 2) + "s";
                currentDot.element.style.animationTimingFunction = "ease-in-out";
                currentDot.element.style.animationIterationCount = 1;
           }
        });
        dotQueue.push({dot:dot,
            cycle:cycle,
            wake:(currentTime + (cycle == 0 ? 1000 : cycle == 1 ? 1000 : cycle == 2 ? 300 : cycle == 3 ? 280 : cycle == 4 ? 330 : cycle == 5 ? 1100 : 2400))});
        dotQueue.sort(function(a,b) { return a.wake - b.wake; });
    }
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
function animationLoop(timestamp) {
    if (dotQueue[0] !== undefined) {
        while (dotQueue[0].wake <= timestamp) {
            processDot(dotQueue[0].cycle < 6 ? dotQueue[0].cycle + 1 : -1, timestamp, dotQueue[0].dot);
            dotQueue.splice(0,1);
        }
    } else if (timestamp !== undefined) {
        processDot(-1, timestamp);
    }
    animationId = requestAnimationFrame(animationLoop);
}
initialize();
})();
