(function() {
"use strict";
    
var requestAnimFrame = window.requestAnimationFrame || 
    window.mozRequestAnimationFrame || 
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;
    
var canvas = document.querySelector(".canvas")
,	orbitRoot = document.querySelector("#oroot")
,	screenSize = 0
,	animationId = 0
,	bodies = []
,	orbits = []
,	animateBodies = []
,	animateOrbits = []
,	heartbeatPeriod = 3000 * (1 + Math.random())
,	newCenter = null
,	blinkTimeoutID = 0
;
window.onload = function() {
    proportionElements();
	bodies.push(new Body());
	animateBodies.unshift({ body: bodies[0], action: "birth" });
	window.getComputedStyle(bodies[0].frame).transform; //kludge to force transitionend recognition
	animationLoop();
}
window.onresize = function() {
    proportionElements();
}
function Body(parent, sibling) {
	this.id = bodies.length;
	this.parent = parent ? parent : null;
	//this.eve = parent ? parent.eve : this;
	this.prevBody = sibling ? sibling : null;
	this.nextBody = null;
	this.firstOrbit = this.lastOrbit = null;
	
	if (!this.prevBody) {
		orbits.push(new Orbit(this));
		this.orbit = orbits[orbits.length - 1];
		this.orbitBody = 0;
		this.frame = this.orbit.element.firstElementChild;
		if (!this.parent) {
			this.diameter = screenSize/(4 + (Math.random() * 2));
			this.orbit.minDiameter = 0;
			this.hue = Math.ceil(Math.random() * 12) * 30;
			this.hueIncrement = (Math.random() < 0.5 ? -1 : 1) * Math.ceil(Math.random() * 6) * 5;
			this.saturation = 50 + (Math.random() * 50);
			this.luminosityCenter = 60 + (Math.random() * 20);
		} else {
			//this.diameter = this.parent.parent ? (this.parent.diameter * (0.7 + (Math.random() * 0.2))) :
			//	(this.parent.diameter * (0.7 + (Math.random() * 0.2)));
			this.diameter = this.parent.diameter * (0.7 + (Math.random() * 0.2));
			this.orbit.minDiameter = this.parent.orbit.minDiameter + this.parent.diameter + this.diameter;
			this.hue = this.parent.hue + this.parent.hueIncrement;
			this.hueIncrement = this.parent.hueIncrement;
			this.saturation = this.parent.saturation;
			this.luminosityCenter = this.parent.luminosityCenter;
		}
	} else {
		this.orbit = this.prevBody.orbit;
		this.orbitBody = this.prevBody.orbitBody + 1;
		this.prevBody.nextBody = this.orbit.lastBody = this;
		this.frame = this.prevBody.frame.cloneNode(true);
		this.orbit.element.appendChild(this.frame);
		this.diameter = this.prevBody.diameter;
		this.hue = this.prevBody.hue;
		this.hueIncrement = this.prevBody.hueIncrement;
		this.saturation = this.prevBody.saturation;
		this.luminosityCenter = this.prevBody.luminosityCenter;
	}
	this.element = this.frame.firstElementChild;
	this.letter = this.element.firstElementChild;
	this.birthType = null;
	this.delayIncrement = 0;
	this.letterHue = this.hue + this.hueIncrement;

	this.frame.id = "f" + this.id;
	this.element.id = "b" + this.id;
	this.frame.style.width = this.frame.style.height = this.diameter + "px";
	if (!this.parent) {
		this.element.style.height = this.element.style.width = "100%";
		this.element.style.transition = "height " + heartbeatPeriod/5 + "ms ease-out 0s";
		//this.element.style.cursor = "";
	} else {
		this.element.style.transition = "transform " + heartbeatPeriod + "ms ease-in-out, height " + heartbeatPeriod + "ms ease-in-out, width " +
			heartbeatPeriod + "ms ease-in-out";
	}
	this.letter.id = "l" + this.id;
	this.letter.textContent = String.fromCharCode(0x3400 + Math.floor(Math.random() * 0x19b5)); //CJK Ideograph Extension A
	this.letter.style.fontSize = (5 * this.diameter) + "px";
	this.letter.style.top = (35 + (Math.random() * 30)) + "%";
	this.letter.style.left = (35 + (Math.random() * 30)) + "%";
	this.letter.style.transform = "translate3D(-50%,-50%,0) rotateZ(" + (Math.random() * 45) + "deg)";
	this.letter.style.opacity = 0.3;

	window.getComputedStyle(this.frame).opacity; //kludge to force transitionend recognition (Firefox)
}
function Orbit(body) {
	this.id = orbits.length;
	this.frame = orbitRoot.cloneNode(true);
	this.element = this.frame.firstElementChild;
	this.frame.id = "p" + this.id;
	this.element.id = "o" + this.id;
	if (body.parent) {
		bodies[0].firstOrbit.element.appendChild(this.frame);
		this.count = bodies[0].lastOrbit.count + 1;
		this.prevSibling = bodies[0].lastOrbit;
		bodies[0].lastOrbit = bodies[0].lastOrbit.nextSibling = this;
		this.bodyScaleXIndex = document.styleSheets[1].insertRule
		(	"#" + this.element.id + " .body { width: 100%; }", document.styleSheets[1].cssRules ? document.styleSheets[1].cssRules.length : 0);
		this.bodyScaleYIndex = document.styleSheets[1].insertRule
		(	"#" + this.element.id + " .body { height: 100%; }", document.styleSheets[1].cssRules ? document.styleSheets[1].cssRules.length : 0);
		this.bodyRotationIndex = document.styleSheets[1].insertRule
		(	"#" + this.element.id + " .body { transform: translate3D(-50%,-50%,0) rotateZ(0deg); }", document.styleSheets[1].cssRules ?
			document.styleSheets[1].cssRules.length : 0);
	} else {
		orbitRoot.parentNode.appendChild(this.frame);
		this.count = 1;
		this.prevSibling = null;
		body.firstOrbit = body.lastOrbit = this;
		this.bodyScaleXIndex = this.bodyScaleYIndex = this.bodyRotationIndex = 0;
	}
	this.nextSibling = null;
	this.firstBody = this.lastBody = body;
	this.minDiameter = 0;
	this.scale = 1;
	this.bodyWidth = this.bodyHeight = 100;
	this.frameOpacity = 1;
	this.revolutions = 0;
	this.bodyRotation = 0;
	this.element.style.transition = "transform " + heartbeatPeriod + "ms ease-in-out 0s";
	this.frame.style.transition = "opacity " + heartbeatPeriod + "ms ease-in-out, transform " + heartbeatPeriod + "ms ease-in-out";
}
function initialize() {
	var idNum = 0
	,	currentBody = null
	,	bodyCount = 0
	,	maxBodies = 0
	,	priorSibling = null
	,	orbitAngle = 0
	,	newOrbitElement = null
	,	nextOrbit = null
	,	priorBody = null
	;
    canvas.addEventListener("animationend",function(e) {
		//console.log(Date.now() + ": removing animation " + e.animationName + " from " + e.target.id);
		//timeout due to early firing
		(function(e) {
			setTimeout(function() {
				e.target.classList.remove(e.animationName.replace(/-key/,"-animation"));
			}, 2000)
		}) (e)
    }, false);
    canvas.addEventListener("transitionend",function(e) {
		idNum = parseInt(e.target.id.substring(1));
		//console.log(Date.now() + ": " + e.propertyName + " transitionend from " + e.target.id);
		if (!idNum && e.propertyName == "height") {
			if (!blinkTimeoutID) {
				animateBodies.unshift({ body: bodies[0], action: "blink" });
				blinkTimeoutID = setTimeout(function() {
					animateBodies.unshift({ body: bodies[0], action: "blink" });
				}, heartbeatPeriod * Math.ceil(Math.random() * 8));
			}
			if (newCenter) {
				newOrbitElement = bodies[0].orbit.element.cloneNode(false);
				newOrbitElement.style.transition = "";
				bodies[0].orbit.element.parentNode.appendChild(newOrbitElement);
				bodies[0].orbit.element.id = bodies[0].orbit.element.id + newCenter.element.id;
				newOrbitElement.style.top =
					(((parseFloat(newCenter.orbit.frame.style.height) * (parseFloat(newCenter.frame.style.top) - 50)/100)) +
					(bodies[0].orbit.element.style.top == "" ? 0 : parseFloat(bodies[0].orbit.element.style.top))) + "px";
				newOrbitElement.style.left =
					(((parseFloat(newCenter.orbit.frame.style.width) * (parseFloat(newCenter.frame.style.left) - 50)/100)) +
					(bodies[0].orbit.element.style.left == "" ? 0 : parseFloat(bodies[0].orbit.element.style.left))) + "px";
				newOrbitElement.appendChild(bodies[0].frame);
				bodies[0].orbit.element = newOrbitElement;
				bodies[0].diameter = newCenter.diameter;
				bodies[0].frame.style.height = bodies[0].frame.style.width = bodies[0].diameter + "px";
				if (newCenter.id == 0) {
					bodies[0].hue = Math.ceil(Math.random() * 12) * 30;
					bodies[0].hueIncrement = (Math.random() < 0.5 ? -1 : 1) * Math.ceil(Math.random() * 6) * 5;
					bodies[0].saturation = 50 + (Math.random() * 50);
					bodies[0].luminosityCenter = 60 + (Math.random() * 20);
					bodies[0].letterHue = this.hue + this.hueIncrement;
				} else {
					bodies[0].hue = newCenter.hue;
					bodies[0].letterHue = newCenter.letterHue;
				}
				priorBody = bodies[0];
				nextOrbit = bodies[0].orbit.nextSibling;
				while (nextOrbit) {
					nextOrbit.firstBody.hue = priorBody.hue + priorBody.hueIncrement;
					nextOrbit.firstBody.hueIncrement = priorBody.hueIncrement;
					nextOrbit.firstBody.saturation = priorBody.saturation;
					nextOrbit.firstBody.luninosityCenter = priorBody.luninosityCenter;
					nextOrbit.firstBody.letterHue = nextOrbit.firstBody.hue + nextOrbit.firstBody.hueIncrement;
					priorBody = nextOrbit.firstBody;
					currentBody = nextOrbit.firstBody.nextBody;
					while (currentBody) {
						currentBody.hue = priorBody.hue;
						currentBody.hueIncrement = priorBody.hueIncrement;
						currentBody.saturation = priorBody.saturation;
						currentBody.luninosityCenter = priorBody.luninosityCenter;
						currentBody.letterHue = priorBody.letterHue;
						currentBody = currentBody.nextBody;
					}
					nextOrbit = nextOrbit.nextSibling;
				}
				animateBodies.unshift({ body: bodies[0], action: "birth" });
			}
		}
		if ((e.propertyName == "opacity") && e.target.classList.contains("bodyFrame")) {
			currentBody = bodies[idNum];
			//console.log(Date.now() + ": opacity changed to " + currentBody.frame.style.opacity);
			if (parseInt(currentBody.frame.style.opacity)) {
				currentBody.delayIncrement = 0;
				currentBody.frame.style.transition = "opacity " + heartbeatPeriod + "ms ease-in-out 0s, transfer " + heartbeatPeriod + "ms ease-in-out 0s";
				if (!currentBody.nextBody) {
					if ((currentBody.orbit.minDiameter < screenSize) && (bodies.length < 300) && !currentBody.orbit.nextSibling) {
						//console.log(Date.now() + ": births from " + currentBody.element.id);
						bodyCount = maxBodies = 0;
						priorSibling = null;
						do {
							bodies.push(new Body(currentBody.orbit.firstBody, priorSibling));
							priorSibling = bodies[bodies.length - 1];
							bodyCount++;
							if (!maxBodies) {
								maxBodies = Math.floor(Math.PI * priorSibling.orbit.minDiameter * (0.7 + (Math.random() * 0.3))/priorSibling.diameter);
							}
							orbitAngle = 2 * Math.PI * (bodyCount - 1)/maxBodies;
							priorSibling.frame.style.left = ((1 + Math.sin(orbitAngle)) * 50) + "%";
							priorSibling.frame.style.top = ((1 - Math.cos(orbitAngle)) * 50) + "%";
							priorSibling.frame.style.transform = "translate3D(-50%,-50%,0) rotateZ(" + orbitAngle + "rad)";
							(function(b) {
								setTimeout(function() {
									animateBodies.unshift({ body: b, action: "birth" });
								}, heartbeatPeriod * b.orbit.count/10)
							}) (priorSibling)
						} while (bodyCount < maxBodies);
					}
					if (currentBody.parent) {
						//console.log(Date.now() + ": bodyFrame " + e.propertyName + " transformend for " + e.target.id);
						animateOrbits.unshift({ orbit: currentBody.orbit, action: "animate" });
					}
				}
			} else if (!currentBody.nextBody && currentBody.parent) {
				bodies[0].orbit.element.appendChild(currentBody.orbit.frame);
				currentBody = currentBody.orbit.firstBody;
				while (currentBody) {
					animateBodies.unshift({ body: currentBody, action: "birth" });
					currentBody = currentBody.nextBody;
				}
			}
		} else if (((e.propertyName == "transform") || (e.propertyName == "opacity")) &&
				(e.target.classList.contains("orbit") || e.target.classList.contains("orbitFrame"))) {
			//console.log(Date.now() + ": orbit " + e.propertyName + " transitionend for " + e.target.id);
			animateOrbits.unshift({ orbit: orbits[idNum], action: "animate" });
		} else if (((e.propertyName == "width") || (e.propertyName == "height") || (e.propertyName == "transform")) &&
				   e.target.classList.contains("body") && !bodies[idNum].nextBody && idNum) {
			//console.log(Date.now() + ": body " + e.propertyName + " transitionend for " + e.target.id);
			animateOrbits.unshift({ orbit: bodies[idNum].orbit, action: "animate" });
		}
    }, false);
    canvas.addEventListener("click", function(e) {
		//console.log(Date.now() + ": click on " + e.target.id);
		if (!newCenter && e.target.classList.contains("body")) {
			newCenter = bodies[parseInt(e.target.id.substring(1))];
			setCursorPointer(false);
			if (newCenter.parent) {
				animateOrbits.unshift({ orbit: newCenter.orbit, action: "default" });
			}
			if (blinkTimeoutID) {
				clearTimeout(blinkTimeoutID);
			}
			blinkTimeoutID = setTimeout(function() {
				animateBodies.unshift({ body: bodies[0], action: "blink" });
			}, 0);
		}
    }, false);
}
function proportionElements() {
	screenSize = Math.min(document.documentElement.clientWidth,document.documentElement.clientHeight);
}
function setCursorPointer(pointer) {
	var bodies = document.querySelectorAll(".body")
	for (var i = 0; i < bodies.length; i++) {
		bodies[i].style.cursor = (pointer ? "pointer" : "default");
	}
}
function animationLoop() {
	var	current = null
	,	nextBody = null
	,	orbitFrameTransitionBase = "opacity " + heartbeatPeriod + "ms ease-in-out"
	;
	if (animateBodies.length) {
		current = animateBodies.pop();
		//console.log(Date.now() + ": " + current.action + " - " + (current.body.element ? current.body.element.id : ""));
		if (!current.body.element) {
			//console.log(Date.now() + " body no longer exists");
		} else if (current.action == "birth") {
			current.body.element.style.backgroundImage = "radial-gradient(hsla(" + current.body.hue + "," + current.body.saturation + "%," +
				current.body.luminosityCenter + "%,1)," +
				"hsla(" + current.body.hue + "," + current.body.saturation + "%," + (current.body.luminosityCenter + 20) + "%,1))";
			current.body.letter.style.color = "hsla(" + current.body.letterHue + ",100%,30%,1)";
			if (!current.body.prevBody) {
				current.body.orbit.frame.style.width = current.body.orbit.frame.style.height = current.body.orbit.minDiameter + "px";
				if (current.body.parent) {
					if (Math.random() < 0.3) {
						current.body.orbit.element.classList.add("revolve-animation");
					}
					if (Math.random() < 0.3) {
						current.body.orbit.element.classList.add("scaleUp-animation");
					}
				} else if (!newCenter) {
					(function(b) {
						blinkTimeoutID = setTimeout(function() {
							animateBodies.unshift({ body: b, action: "blink" });
							b.element.style.height = b.element.style.width = "100%";
						}, heartbeatPeriod * Math.ceil(Math.random() * 4));
					}) (current.body);
				} else {
					//animateBodies.unshift({ body: current.body, action: "blink" });
					newCenter = null;
					setCursorPointer(true);
				}
				if (Math.random() < 0.5/current.body.orbit.count) {
					current.body.delayIncrement = Math.random() < 0.3 ? heartbeatPeriod/20 : 0;
					//console.log(Date.now() + ": orbit " + current.body.orbit.element.id + "bodies distributed");
				} else if (Math.random() < 0.33) {
					current.body.birthType = "bounce";
					//console.log(Date.now() + ": orbit " + current.body.orbit.element.id + "bodies bounce");
				} else if (Math.random() < 0.5) {
					current.body.birthType = "spin";
					//console.log(Date.now() + ": orbit " + current.body.orbit.element.id + "bodies spin");
				}
				if (Math.random() < 0.3) {
					current.body.birthType = "expand";
					//console.log(Date.now() + ": orbit " + current.body.orbit.element.id + "bodies expand");
				}
			}
			if (current.body.orbit.firstBody.birthType == "expand") {
				current.body.element.classList.add("expand-animation");
			} else if (current.body.orbit.firstBody.birthType == "bounce") {
				current.body.element.classList.add("bounce-animation");
			} else if (current.body.orbit.firstBody.birthType == "spin") {
				current.body.element.classList.add("spin-animation");
			}
			current.body.frame.style.transition = "opacity " + (heartbeatPeriod/3) + "ms ease-in-out " +
				(current.body.orbit.firstBody.delayIncrement * current.body.orbitBody) + "ms";
			current.body.frame.style.opacity = 1;
		} else if (current.action == "blink") {
			//console.log(Date.now() + ": blink ID " + blinkTimeoutID + ", height " + parseInt(current.body.element.style.height));
			if (parseInt(current.body.element.style.height) > 2) {
				current.body.element.style.height = "2%";
				blinkTimeoutID = 0;
			} else {
				current.body.element.style.height = "100%";
				//current.body.hue = current.body.hue + current.body.hueIncrement * Math.ceil(Math.random() * 4);
				current.body.hue = current.body.hue + current.body.hueIncrement;
				current.body.element.style.backgroundImage = "radial-gradient(hsla(" + current.body.hue + "," + current.body.saturation + "%," +
					current.body.luminosityCenter + "%,1)," +
					"hsla(" + current.body.hue + "," + current.body.saturation + "%," + (current.body.luminosityCenter + 20) + "%,1))";
				current.body.letterHue = current.body.hue + current.body.hueIncrement;
				current.body.letter.style.color = "hsla(" + current.body.letterHue + ",100%,30%,1)";
			}
		} else if (current.action == "vanish") {
			current.body.frame.style.opacity = 0;
			if (current.body.nextBody && !newCenter) {
				(function(b) {
					setTimeout(function() {
						animateBodies.unshift({ body: b, action: "vanish" });
					}, heartbeatPeriod/20)
				}) (current.body.nextBody);
			}
		}
	} else if (animateOrbits.length) {
		current = animateOrbits.pop();
		//console.log(Date.now() + ": " + current.action + " - " + (current.orbit.element ? current.orbit.element.id : ""));
		if (!current.orbit.element) {
			//console.log(Date.now() + " orbit no longer exists");
		} else if (current.action == "animate") {
			//console.log(Date.now() + " orbit animating " + current.orbit.element.id + ", duration " + heartbeatPeriod);
			if (bodies[0].orbit.element.id != current.orbit.element.parentNode.parentNode.id) {
				animateBodies.unshift({ body: current.orbit.firstBody, action: "vanish" });
			} else {
				switch (Math.floor(Math.random() * 10)) {
					case 0:
					case 1:
					case 2:
						current.orbit.scale = Math.min(1.4,Math.max(0.6,((current.orbit.scale == 1) || (Math.random() < 0.3)) ?
							(current.orbit.scale + (((Math.random() < 0.5) ? -1 : 1) * (1 + Math.ceil(Math.random() * 4))/10)) : 1));
						//current.orbit.element.style.transition = "transform " + heartbeatPeriod + "ms ease-in-out 0s";
						current.orbit.element.style.transform = "translate3D(-50%,-50%,0) scale(" + current.orbit.scale + ")";
						//console.log(Date.now() + ": " + current.orbit.element.id + " scale set to " + current.orbit.scale);
						break;
					case 3:
					case 4:
					case 5:
						current.orbit.revolutions = current.orbit.revolutions + ((Math.random() < 0.5) ? -1 : 1); // Safari bug limits to 360 deg
						current.orbit.frame.style.transition = orbitFrameTransitionBase + ", transform " + heartbeatPeriod + "ms ease-in-out 0s";
						current.orbit.frame.style.transform = "translate3D(-50%,-50%,0) rotateZ(" + (360 * current.orbit.revolutions) + "deg)";
						//console.log(Date.now() + ": " + current.orbit.element.id + " revolve " + current.orbit.revolutions + " times");
						break;
					case 6:
						document.styleSheets[1].deleteRule(current.orbit.bodyScaleXIndex);
						current.orbit.bodyWidth = Math.min(120,Math.max(20,((current.orbit.bodyWidth == 100) || (Math.random() < 0.3)) ?
							(current.orbit.bodyWidth + (((current.orbit.bodyWidth > 50) ? -1 : 1) * (1 + Math.ceil(Math.random() * 4)) * 10)) : 100));
						current.orbit.bodyScaleXIndex = document.styleSheets[1].insertRule
						(	"#" + current.orbit.element.id + " .body { width: " + current.orbit.bodyWidth + "%; }",	current.orbit.bodyScaleXIndex);
						//console.log(Date.now() + ": " + current.orbit.element.id + " Xscale set on index " + current.orbit.bodyScaleXIndex + " to " + current.orbit.bodyWidth);
						break;
					case 7:
						document.styleSheets[1].deleteRule(current.orbit.bodyScaleYIndex);
						current.orbit.bodyHeight = Math.min(120,Math.max(20,((current.orbit.bodyHeight == 100) || (Math.random() < 0.3)) ?
							(current.orbit.bodyHeight + (((current.orbit.bodyHeight > 50) ? -1 : 1) * (1 + Math.ceil(Math.random() * 4)) * 10)) : 100));
						current.orbit.bodyScaleYIndex = document.styleSheets[1].insertRule
						(	"#" + current.orbit.element.id + " .body { height: " + current.orbit.bodyHeight + "%; }", current.orbit.bodyScaleYIndex);
						//console.log(Date.now() + ": " + current.orbit.element.id + " Yscale set on index " + current.orbit.bodyScaleYIndex + " to " + current.orbit.bodyHeight);
						break;
					case 8:
						document.styleSheets[1].deleteRule(current.orbit.bodyRotationIndex);
						current.orbit.bodyRotation = current.orbit.bodyRotation + (((Math.random() < 0.5) ? -1 : 1) * (25 + Math.ceil(Math.random() * 25)));
						current.orbit.bodyRotationIndex = document.styleSheets[1].insertRule
						(	"#" + current.orbit.element.id + " .body { transform: translate3D(-50%,-50%,0) rotateZ(" + current.orbit.bodyRotation + "deg); }"
						,	current.orbit.bodyRotationIndex);
						//console.log(Date.now() + ": " + current.orbit.element.id + " rotation set on index " + current.orbit.bodyRotationIndex + " to " + current.orbit.bodyRotation);
						break;
					default:
						current.orbit.frame.style.opacity = current.orbit.frameOpacity =
							((current.orbit.frameOpacity == 1) || (Math.random() < 0.3)) ? ((2 + Math.ceil(Math.random() * 7))/10) : 1;
						//console.log(Date.now() + ": " + current.orbit.element.id + " opacity set to " + current.orbit.frameOpacity);
				}
			}
		} else if (current.action == "default") {
			current.orbit.element.style.transform = "translate3D(-50%,-50%,0) scale(1)";
			document.styleSheets[1].deleteRule(current.orbit.bodyScaleXIndex);
			current.orbit.bodyWidth = 100;
			current.orbit.bodyScaleXIndex = document.styleSheets[1].insertRule
			(	"#" + current.orbit.element.id + " .body { width: " + current.orbit.bodyWidth + "%; }",	current.orbit.bodyScaleXIndex);
			document.styleSheets[1].deleteRule(current.orbit.bodyScaleYIndex);
			current.orbit.bodyHeight = 100;
			current.orbit.bodyScaleYIndex = document.styleSheets[1].insertRule
			(	"#" + current.orbit.element.id + " .body { height: " + current.orbit.bodyHeight + "%; }", current.orbit.bodyScaleYIndex);
			document.styleSheets[1].deleteRule(current.orbit.bodyRotationIndex);
			current.orbit.bodyRotation = 0;
			current.orbit.bodyRotationIndex = document.styleSheets[1].insertRule
			(	"#" + current.orbit.element.id + " .body { transform: translate3D(-50%,-50%,0) rotateZ(" + current.orbit.bodyRotation + "deg); }",
				current.orbit.bodyRotationIndex);
			current.orbit.frame.style.opacity = current.orbit.frameOpacity = 0.95;
			animateBodies.unshift({ body: newCenter, action: "vanish" });
		}
	}
    animationId = requestAnimFrame(animationLoop);
}
initialize();
})();
