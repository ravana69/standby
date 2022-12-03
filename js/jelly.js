(function() {
"use strict";
    
var requestAnimFrame = window.requestAnimationFrame || 
    window.mozRequestAnimationFrame || 
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;
    
var canvas = document.querySelector(".canvas")
,   sectionRoot = document.querySelector("#sroot")
,   secFrameRoot = document.querySelector("#sfroot")
,   jFrame = document.querySelector("#jframe")
,   jelly = document.querySelector("#jelly")
,   diapRoot = document.querySelector("#diaproot")
,   armRoot = document.querySelector("#aroot")
,   drifterRoot = document.querySelector("#droot")
,   sectionsPerFrame = 13
,   armCount = 4
,   drifterCount = 0
,   sections = []
,   arms = []
,   drifters = []
,   animationId = 0
,   playbackRateFactor = 0.7
,   startPulse = false
,   startRecovery = false
,   firstPulse = false
,   colorChange = false
,   jFrameAnimation = null
,   screenHeight = 0
,   screenWidth = 0
,   sizeFactor = 0
,   screenPerspective = 1000
,   viewFactorV = 0
,   viewFactorH = 0
,   baseHue = 20
,   armHue = 30;

window.onload = function() {
    proportionElements();
    for (var i = 0; i < (12 * sectionsPerFrame); i++) {
        sections.push(new Section());
    }
    for (var i = 0; i < (12 * armCount); i++) {
        arms.push(new Arm());
    }
    for (var i = 0; i < drifterCount; i++) {
        drifters.push(new Drifter());
    }
    drifters.sort(function(a,b) { return a.bottom - b.bottom; });
    jelly.style.opacity = 1;
    firstPulse = true;
    animationLoop();
    //drift jellyfish downwards
    jFrameAnimation = jFrame.animate(
        [   { transform: "translate3D(0,0px,0)" }
        ,   { transform: "translate3D(0," + (screenHeight * 10) + "px,0)" }
        ],  { duration: (screenHeight * 2000), easing: "linear", iterations: 1, fill: "forwards" }
    );
    jFrameAnimation.addEventListener("finish",function(e) { window.location.reload(); });
    jelly.addEventListener("click", function(e) {
        sections.forEach(function(section) {
            //section.player.pause();
            section.player.playbackRate = 20;
        });
        colorChange = true;
    });
}
window.onresize = function() {
    jelly.style.opacity = 0;
    //window.location.reload();
    proportionElements();
    jelly.style.opacity = 1;
}
function Arm() {
    //constructor for arms
    var widthValues =   [170,   75,     60,     48,     46,     43,     40,     37,     34,     31,     28,     25]
    ,   heightValues =  [70,    30,     40,     25,     25,     25,     25,     25,     25,     25,     25,     25]
    ,   topValues   =   [0,     80,     100,    100,    100,    100,    100,    100,    100,    100,    100,    100]
    ,   leftValues  =   [50,    40,     50,     50,     50,     50,     50,     50,     50,     50,     50,     50]
    ,   yValues     =   [10,    5,      0,      0,      0,      0,      0,      0,      0,      0,      0,      0]
    ,   luminosityValues = [85, 85,     85,     80,     75,     70,     72,     69,     66,     63,     60,     57]
    ,   opacityValues = [0.35,   0.65,    0.55,   0.54,   0.54,   0.52,   0.5,    0.48,   0.46,   0.44,   0.42,   0.4];
    this.id = arms.length;
    this.level = Math.floor(this.id/armCount);
    this.element = armRoot.cloneNode(true);
    this.luminosity = luminosityValues[this.level];
    this.opacity = opacityValues[this.level];
    this.height =  heightValues[this.level] * sizeFactor;
    this.width =  widthValues[this.level] * sizeFactor;
    this.top =  topValues[this.level];
    this.left =  leftValues[this.level];
    this.y =  yValues[this.level] * sizeFactor;
    if (this.level == 0) {
        this.yRotate = this.id * 360/armCount;
        this.border = 45;
        this.duration = 5000 + (Math.random() * 5000);
        this.startingXAngle = 5 - (Math.random() * 10);
        this.startingYAngle = 10 - (Math.random() * 20);
        this.endingXAngle = 5 - (Math.random() * 10);
        this.endingYAngle = 10 - (Math.random() * 20);
        this.parentNode = jelly;
        this.startWave = false;
        this.startUnwave = true;
    } else {
        this.yRotate = 0;
        this.border = 0;
        this.duration = arms[this.id - armCount].duration;
        this.startingXAngle = arms[this.id - armCount].startingXAngle;
        this.endingXAngle = arms[this.id - armCount].endingXAngle;
        this.startingYAngle = arms[this.id - armCount].startingYAngle;
        this.endingYAngle = arms[this.id - armCount].endingYAngle;
        this.parentNode = arms[this.id - armCount].element;
        this.startWave = false;
        this.startUnwave = false;
    }

    this.parentNode.appendChild(this.element);    
    this.element.id = "a" + this.id;
    this.keyframe = [
        { transform: "translate3D(-50%,0%,0) rotateY(" + this.yRotate + "deg) translateY(" + this.y + "px) rotateX(" + this.startingXAngle + "deg) rotateY(" + this.startingYAngle + "deg)" }
    ,   { transform: "translate3D(-50%,0%,0) rotateY(" + this.yRotate + "deg) translateY(" + this.y + "px) rotateX(" + this.endingXAngle + "deg) rotateY(" + this.endingYAngle + "deg)" }
    ];
    this.element.style.transform = "translate3D(-50%,0,0) rotateY(" + this.yRotate + "deg) translateY(" + this.y + "px) rotateX(" + this.endingXAngle + "deg) rotateY(" + this.endingYAngle + "deg)";
    this.animProp = [
        { duration: (this.duration * playbackRateFactor), easing: "ease-in-out", iterations: 1, fill: "forwards" }
    ,   { duration: (this.duration * playbackRateFactor), easing: "ease-in-out", iterations: 1, fill: "forwards", direction: "reverse" }
    ];
    restyleArm(this);
}
function Drifter() {
    //construction for drifters
    this.id = drifters.length;
    this.element = drifterRoot.cloneNode(true);
    drifterRoot.parentNode.appendChild(this.element);

    this.element.id = "dr" + this.id;    
    setAdrift(this,0);
}
function Section() {
    //constructor for bell section
    var widthValues =   [15,    30,     35,     55,     85,     95,     95,     75,     50,     35,     25,     15,     10]
    ,   heightValues =  [40,    15,     15,     50,     50,     15,     5,      15,     15,     15,     15,     20,     30]
    ,   borderValues =  [0,     0,      0,      0,      0,      0,      0,      30,     20,     30,     40,     45,     50]
    ,   hueChangeValues = [25,  25,     25,     25,     25,     25,     25,     20,     15,     10,     5,      2,      0]
    ,   luminosityValues = [60, 60,     60,     60,     60,     55,     35,     45,     40,     35,     30,     25,     20]
    ,   opacityValues = [0.5,   0.5,    0.4,    0.4,    0.4,    0.4,    0.4,    0.4,    0.45,   0.5,    0.55,   0.6,    0.7]
    ,   startValues =   [-15,   -5,     -5,     0,      0,      -5,     0,      -5,     -5,     5,      5,      5,      10]
    ,   endValues =     [0,     -10,    -15,    -10,    -10,    -30,    0,      -25,    5,      -20,    -20,    -20,    -25]
    ,   durationValues = [4000, 4000,   4000,   3000,   3000,   2000,   0,      3000,   2000,   2000,   2000,   2000,   2000]
    ,   delayValues =   [4000,  3500,   2000,   2000,   2000,   1000,   0,      0,      1000,   3500,   4000,   4500,   4500]
    ,   frameNode = null;
    this.id = sections.length;
    this.level = this.id % sectionsPerFrame;
    this.height = heightValues[this.level] * sizeFactor;
    this.width = widthValues[this.level] * sizeFactor;
    this.border = borderValues[this.level];
    this.luminosity = luminosityValues[this.level];
    this.hueChange = hueChangeValues[this.level];
    this.opacity = opacityValues[this.level];
    this.startingAngle = startValues[this.level];
    this.endingAngle = endValues[this.level];
    this.delay = delayValues[this.level];
    this.duration = durationValues[this.level];
    if (this.level == 0) {
        //root level
        this.top = 0;
        this.left = 0;
        frameNode = secFrameRoot.cloneNode(true);
        secFrameRoot.parentNode.appendChild(frameNode);
        frameNode.id = "f" + Math.floor(this.id/sectionsPerFrame);
        frameNode.style.transform = "rotateY(" + ((this.id/sectionsPerFrame) * 30) + "deg) rotateX(90deg)";
        this.parentNode = frameNode;
    } else {
        this.top = 100;
        this.left = 50;
        this.parentNode = sections[this.id - 1].element;
    }
    this.player = null;
    
    this.element = sectionRoot.cloneNode(true);
    this.parentNode.appendChild(this.element);
    this.element.id = "s" + this.id;
    this.keyframe = [
        { transform: "translate3D(-50%,0,0) rotateX(" + this.startingAngle + "deg)" }
    ,   { transform: "translate3D(-50%,0,0) rotateX(" + this.endingAngle + "deg)" }
    ];
    this.element.style.transform = "translate3D(-50%,0,0) rotateX(" + this.startingAngle + "deg)"
    this.animProp = [
        { duration: (this.duration * playbackRateFactor), easing: "ease-in-out", iterations: 1, fill: "forwards", delay: (this.delay * playbackRateFactor) }
    ,   { duration: (this.duration * playbackRateFactor), easing: "ease-in-out", iterations: 1, fill: "forwards", delay: (this.delay * playbackRateFactor), direction: "reverse" }
    ,   { duration: ((this.duration + this.delay) * playbackRateFactor), easing: "ease-in-out", iterations: 1, fill: "forwards" }
    ];
    //diaphram on one section
    if (this.level == 4) {
        this.diaphram = diapRoot.cloneNode(true);
        this.element.appendChild(this.diaphram);
        this.diaphram.id = "d" + Math.floor(this.id/sectionsPerFrame);
        this.diaphram.style.transform = "translate3D(0,0,0) rotateX(" + (this.endingAngle + 220) + "deg)";
    } else {
        this.diaphram = null;
    }
    restyleSection(this);
}
function initialize() {
    jelly.x = jelly.y = jelly.z = 0;
    jelly.rotatex = jelly.rotatey = jelly.rotatez = 0;
}
function proportionElements() {
    screenHeight = document.documentElement.clientHeight;
    screenWidth = document.documentElement.clientWidth;
    //use perspectiveFrame perspective value
    viewFactorV = screenHeight/screenPerspective;
    viewFactorH = screenWidth/screenPerspective;
    sizeFactor = Math.min(screenHeight/500,screenWidth/600);
    drifterCount = Math.min((screenHeight * screenWidth)/5000,200);
}
function restyleArm(arm) {
    arm.element.style.top = arm.top + "%";
    arm.element.style.left = arm.left + "%";    
    arm.element.style.width = arm.width + "px";
    arm.element.style.height = arm.height + "px";
    arm.element.style.borderTopLeftRadius = arm.element.style.borderTopRightRadius = arm.border + "%";
    arm.element.style.borderBottomLeftRadius = arm.element.style.borderBottomRightRadius = "25%";
    //arm.element.style.backgroundColor = "hsla(" + baseHue + ", 100%, 70%, " + arm.opacity + ")";
    if (arm.level < 1) {
        arm.element.style.background = 
           "radial-gradient(" +
           "hsla(" + armHue + ", 100%, " + arm.luminosity + "%," + arm.opacity + ") 60%, " +
           "hsla(" + armHue + ", 80%, " + arm.luminosity + "%,0) 70%)";
    } else {
        arm.element.style.background = 
           "repeating-linear-gradient(90deg, " +
           "hsla(" + armHue + ", 80%, " + arm.luminosity + "%,0), " +
           "hsla(" + armHue + ", 100%, " + arm.luminosity + "%," + arm.opacity + ") 30%, " +
           "hsla(" + armHue + ", 100%, " + (arm.luminosity - 20) + "%," + arm.opacity + ") 49%, " +
           "hsla(" + armHue + ", 100%, " + (arm.luminosity - 20) + "%," + arm.opacity + ") 51%, " +
           "hsla(" + armHue + ", 100%, " + arm.luminosity + "%," + arm.opacity + ") 70%, " +
           "hsla(" + armHue + ", 80%, " + arm.luminosity + "%,0) 100%)";
    }
}
function restyleSection(section) {
    section.element.style.width = section.width + "px";
    section.element.style.height = section.height + "px";
    section.element.style.borderBottomLeftRadius = section.element.style.borderBottomRightRadius = section.border + "%";
    section.element.style.top = section.top + "%";
    section.element.style.left = section.left + "%";
    if (section.level < 6) {
        section.element.style.background = 
           "repeating-linear-gradient(90deg, " +
           "hsla(" + baseHue + ", 100%," + section.luminosity + "%," + section.opacity + "), " +
           "hsla(" + (baseHue - section.hueChange) + ", 100%," + section.luminosity + "%," + section.opacity + ") 16%, " +
           "hsla(" + baseHue + ", 100%," + section.luminosity + "%," + section.opacity + ") 33%)";
    } else {
        section.element.style.background = 
           "repeating-linear-gradient(90deg, " +
           "hsla(" + baseHue + ", 100%," + section.luminosity + "%,0), " +
           "hsla(" + (baseHue - section.hueChange) + ", 100%," + section.luminosity + "%," + section.opacity + ") 40%, " +
           "hsla(" + (baseHue - section.hueChange) + ", 100%," + section.luminosity + "%," + section.opacity + ") 60%, " +
           "hsla(" + baseHue + ", 100%," + section.luminosity + "%,0) 100%)";
    }
    if (section.diaphram != null) {
        section.diaphram.style.width = section.width + "px";
        section.diaphram.style.height =  ((1.3 + (0.4 * Math.random())) * section.height) + "px";
        section.diaphram.style.backgroundColor = "hsla(" + baseHue + ", 100%, 80%, 0.3)";
    }
}
function setAdrift(drifter, scrollDistance) {
    var realScreenHeight = 0
    ,   topMaskHeight = 0;
    drifter.z = (sizeFactor * 250) - (sizeFactor * 500 * Math.random());
    realScreenHeight = (screenPerspective - drifter.z) * viewFactorV;
    topMaskHeight = drifter.z * viewFactorV/2;
    drifter.top = (scrollDistance == 0 ? (realScreenHeight * Math.random()) + topMaskHeight : topMaskHeight - scrollDistance);
    drifter.left = ((screenPerspective - drifter.z) * viewFactorH) * Math.random() + (drifter.z * viewFactorH/2);
    drifter.bottom = realScreenHeight - drifter.top + topMaskHeight;
    //drifter.bottomX = screenPerspective * (drifter.left - (drifter.z * viewFactorH/2))/(screenPerspective - drifter.z);

    drifter.element.style.top = (drifter.top - 30) + "px";
    drifter.element.style.left = drifter.left + "px";
    drifter.element.style.transform = "translate3D(-50%,-50%," + drifter.z + "px)"
    drifter.element.style.opacity = 0.2;
}
function animationLoop() {
    var pulseX = 0, pulseY = 0, pulseZ = 0
    ,   rotateX = 0, rotateY = 0, rotateZ = 0
    ,   driftDistance = 0
    ,   belowBestY = 0
    ,   jellyPlayer = null;
    driftDistance = parseInt(getComputedStyle(jFrame).transform.split(",")[5]) || 0;
    if (startPulse || startRecovery || firstPulse) {
        if (!firstPulse) {
            sections.forEach(function(section) {
                section.player = section.element.animate
                    (section.keyframe,(startPulse ? section.animProp[0] : section.animProp[1]));
                if (startRecovery && colorChange) {
                    section.player.playbackRate = 20;
                }
            });
            (function (p) {
                sections[2].player.addEventListener("finish",function(e) {
                    (p ? startRecovery = true : startPulse = true);
                });
            }) (startPulse);
        }
        if (startPulse || firstPulse) {
            belowBestY = (screenHeight/5) - (jelly.offsetTop + driftDistance + jelly.y);
            if (belowBestY < 0) {
                pulseY = belowBestY;
            } else {
                pulseY = (Math.random() * -30) - 20;
            }
            pulseX = (5 - (Math.random() * 10));
            pulseZ = (2 - (Math.random() * 4));
            rotateX = Math.atan(pulseZ/pulseY) * (180/Math.PI);
            rotateY = (20 - (Math.random() * 40)) + (colorChange ? 360 : 0);
            rotateZ = Math.atan(pulseX/pulseY) * -1 * (180/Math.PI);
            jellyPlayer = jelly.animate(
                [   { transform: "translate3D(" + jelly.x + "px," + jelly.y + "px," + jelly.z + "px) " +
                        "rotateX(" + jelly.rotatex + "deg) rotateY(" + jelly.rotatey + "deg) rotateZ(" + jelly.rotatez + "deg)" }
                ,   { transform: "translate3D(" + (jelly.x + pulseX) + "px," + (jelly.y + pulseY) + "px," + (jelly.z + pulseZ) + "px) " +
                        "rotateX(" + (jelly.rotatex + rotateX) + "deg) rotateY(" + (jelly.rotatey + rotateY) + "deg) rotateZ(" + (jelly.rotatez + rotateZ) + "deg)" }
                ],  { duration: (6000 * playbackRateFactor), easing: "ease", iterations: 1, fill: "forwards", delay: (colorChange ? 0 : (2000 * playbackRateFactor)) }
            );
            if (firstPulse) {
                sections.forEach(function(section) {
                    section.player = section.element.animate(section.keyframe,section.animProp[2]);
                });
                sections[2].player.addEventListener("finish",function(e) { startRecovery = true; });
            }
            if (colorChange) {
                baseHue = Math.random() * 360;
                armHue = Math.random() * 360;
                jellyPlayer.playbackRate = 5;
                setTimeout(function(){
                    sections.forEach(function(thisSection) { restyleSection(thisSection); });  
                    arms.forEach(function(thisArm) { restyleArm(thisArm); });
                },300);
                colorChange = false;
            }
            jelly.x = jelly.x + pulseX;
            jelly.y = jelly.y + pulseY;
            jelly.z = jelly.z + pulseZ;
            jelly.rotatex = jelly.rotatex + rotateX;
            jelly.rotatey = jelly.rotatey + rotateY;
            jelly.rotatez = jelly.rotatez + rotateZ;
        }
        startPulse = startRecovery = firstPulse = false;
        drifters.sort(function(a,b) { return a.bottom - b.bottom; });
    }
    for (var i = 0; i < armCount; i++) {
        if (arms[i].startWave || arms[i].startUnwave) {
            for (var j = i, allArms = arms.length; j < allArms; j = j + armCount) {
                arms[j].player = arms[j].element.animate
                    (arms[j].keyframe,(arms[i].startWave ? arms[j].animProp[0] : arms[j].animProp[1]));
            }
            (function (a,p) {
                arms[a].player.addEventListener("finish",function(e) {
                    (p ? arms[a].startUnwave = true : arms[a].startWave = true);
                });
            }) (i, arms[i].startWave);
            arms[i].startWave = arms[i].startUnwave = false;
        }
    }
    if ((drifters[0].bottom + 30) < driftDistance) {
        drifters[0].element.style.opacity = 0;
        setAdrift(drifters[0],driftDistance);
        drifters.push(drifters.splice(0,1)[0]);
    }
    animationId = requestAnimFrame(animationLoop);
}
initialize();
})();
