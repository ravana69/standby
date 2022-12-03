(function() {
"use strict";
    
var requestAnimFrame = window.requestAnimationFrame || 
    window.mozRequestAnimationFrame || 
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;
    
var canvas = document.querySelector(".canvas")
,   section = document.querySelector("#sectroot")
,   linkOuter = document.querySelector("#outerroot")
,   linkInner = document.querySelector("#innerroot")
,   linkRivet = document.querySelector("#rivetroot")
,   sprocket = document.querySelector("#sprocketroot")
,   face = document.querySelector("#faceroot")
,   tooth = document.querySelector("#toothroot")
,	screenHeight = 0
,	screenWidth = 0
,	links = []
,	sprockets = []
,	faces = []
,	teeth = []
,	chains = []
,   animationId = null
,	chainFactor = 15
,	chainUnit = 0
,	chainScale = 0
,	hues =	[0, 20, 30, 40, 50, 60, 80, 90, 120, 150, 160, 170, 180, 190, 200, 210, 220, 240, 260, 270, 280, 290, 300, 320, 340]
,	brightnesses =	[1, 4, 4, 4, 4, 4, 3, 5.4, 3, 3.2, 5, 3, 3, 2, 1.7, 1.3, 1, 1, 1.3, 1.2, 1.2, 1.2, 1.4, 1.1, 1]
,	faceFactor = [  0,   0,   0,   0,   0,   0,   0,   0,   0,   0,
				  427, 421, 415, 411, 408, 405, 403, 399, 398, 395,
				  392, 391, 389, 387, 386, 385, 384, 383, 382, 381,
				  381, 380, 379, 378, 377, 377, 376, 376, 376, 376,
				  376, 375, 375, 375, 374, 374, 374, 373, 373, 373,
				  373, 373, 372, 372, 372, 372, 371, 371, 371, 371,
				  371, 370, 370, 370, 369, 369, 369, 369, 369, 369]
,	initial = true
,	border = 0
,	minTeeth = 12
,	maxTeeth = 0
,	sprocketsInPlay = 0
,	createAnimation = true
,	sprocketLimit = 7
,	frozen = []
,	finished = []
,	dissolveBreak = false
,	outerHue = null
,	innerHue = null
,	rivetHue = null
;
window.onload = function() {
	proportionElements();
	canvas.style.background =
		"linear-gradient("  +"white," + "hsla(" + hues[Math.floor(Math.random() * hues.length)] + ",100%,85%,1)"+ ")";
	linkOuter.style.transform = linkInner.style.transform = linkRivet.style.transform =
		"translate(-50%, -50%) scale(" + chainScale + ") translate(-31%, 0%)";
	animationLoop();
}
window.onresize = function() {
    proportionElements();
}
function Link(cumulativeUnits, x,  y, chain) {
	this.id = links.length;
	this.element = section.cloneNode(false);
	this.element.id = "l" + this.id;
	canvas.appendChild(this.element);
	this.plateElement = this.id % 2 ? linkInner.cloneNode(false) : linkOuter.cloneNode(false);
	this.plateElement.id = "p" + this.id;
	this.element.appendChild(this.plateElement);
	this.rivetElement = linkRivet.cloneNode(false);
	this.rivetElement.id = "r" + this.id;
	this.element.appendChild(this.rivetElement);
	this.element.style.top = y + "px";
	this.element.style.left = x + "px";
	this.player = null;
	this.chain = chain;
	this.cumulativeUnits = cumulativeUnits;
}
function Sprocket(toothCount, currentChain) {
	this.id = sprockets.length;
	this.element = sprocket.cloneNode(false);
	this.element.id = "s" + this.id;
	canvas.appendChild(this.element);
	this.radius = chainUnit * toothCount/(2 * Math.PI);
	this.teeth = toothCount;
	for (var i = 0; i < toothCount; i++) {
		teeth.push(new Tooth(this.element, i, this.radius));
	}
	this.face = face.cloneNode(false);
	this.face.id = "f" + this.id;
	this.element.appendChild(this.face);
	this.face.style.backgroundPosition = (Math.floor(Math.random() * 8) * 10) + "% 0%";
	this.face.style.transform = "translate(-50%, -50%) scale("+ (this.radius/faceFactor[toothCount]) + ")";
	if (Math.random() < 0.1) {
		this.spokes = face.cloneNode(false);
		this.spokes.id = "k" + this.id;
		this.element.appendChild(this.spokes);
		this.spokes.style.backgroundPosition = "80% 0%";
		this.spokes.style.transform =
			"translate(-50%, -50%) scale("+ (Math.min(this.radius * 3, screenHeight, screenWidth)/faceFactor[toothCount]) + ")";
	} else {
		this.spokes = null;
	}
	this.player = this.player2 = this.player3 = null;
	this.colorIndex = Math.floor(Math.random() * hues.length);
	this.element.style.webkitFilter = this.element.style.filter =
		"hue-rotate(" + hues[this.colorIndex] + "deg) brightness(" + brightnesses[this.colorIndex] + ")";
	this.opacity = 0.5 + (Math.random() * 0.5);
	this.pathIndex = 0;
	this.cumulativeUnits = 0;
	this.pathUnits = 0;
	this.chain = currentChain;
	sprocketsInPlay++;
}
function Tooth(sprocket, number, radius) {
	var	angle = chainUnit/radius
	;
	this.id = teeth.length;
	this.element = tooth.cloneNode(false);
	this.element.id = "t" + this.id;
	sprocket.appendChild(this.element);
	this.sprocket = sprocket;
	this.element.style.top = (-1 * radius * Math.cos(number * angle)) + "px";
	this.element.style.left = (radius * Math.sin(number * angle)) + "px";
	this.element.style.transform =
		"translate(-50%, -50%) scale(" + chainScale + ") rotate(" + number * angle + "rad)";
}
function animateChain(transformations, animationLinks, animations, currentChain) {
	var chainSpeed = currentChain.chainSpeed
	,	timings =
		{	easing: "linear"
		,	iterations: 1
		,	fill: "forwards" }
	;
	timings.duration = (chainSpeed * 1000 * animationLinks.length);
	animationLinks.forEach(function (link, index) {
		timings.delay = chainSpeed * 1000 * index;
		link.player = link.element.animate(transformations, timings);
		link.player.pause();
		animations.push(link.player);
		link.player.onfinish = function(e) {
			link.element.style.opacity = 0;
			if (link.element && link.element.parentNode) {
				setTimeout(function() {
					link.element.parentNode.removeChild(link.element);
					delete links[link.id];
				}, 500);
			}
		}
	});
}
function animateSprockets(chainPath, animationSprockets, animations, currentChain) {
	var chainLength = chainPath[chainPath.length - 1].cumulativeUnits
	, 	chainSpeed = currentChain.chainSpeed
	,	duration = 0
	,	delay = 0
	;
	animationSprockets.forEach(function(sprocket) {
		delay = chainSpeed * 1000 * (chainPath[sprocket.pathIndex].cumulativeUnits);
		duration = chainSpeed * 1000 * (chainLength + chainPath[sprocket.pathIndex].units);
		sprocket.player2 = sprocket.element.animate(
			[ { opacity: 0 }
			, { opacity: sprocket.opacity } ]
		,	{ duration: 1000
			, delay: Math.max(0, delay - 1000)
			, easing: "ease-in-out"
			, fill: "forwards" } );
		sprocket.player = sprocket.element.animate(
			[ { transform: "rotate(" + chainPath[sprocket.pathIndex].sprocketOffset + "rad)" }
			, { transform: "rotate(" +
				(chainPath[sprocket.pathIndex].sprocketOffset +
					(2 * Math.PI * ((chainLength + chainPath[sprocket.pathIndex].units)/sprocket.teeth) *
						(chainPath[sprocket.pathIndex].clockwise ? 1 : -1))) + "rad)" } ]
		,	{ duration: duration
			, delay: delay
			, easing: "linear"
			, fill: "forwards" } );
		sprocket.player3 = sprocket.element.animate(
			[ { opacity: sprocket.opacity }
			, { opacity: 0 } ]
		,	{ duration: 1000
			, delay: delay + duration + 1000
			, easing: "ease-in-out"
			, fill: "forwards" } );
		sprocket.player.pause();
		animations.push(sprocket.player);
		sprocket.player2.pause();
		animations.push(sprocket.player2);
		sprocket.player3.pause();
		animations.push(sprocket.player3);
		sprocket.player2.onfinish = function(e) {
			sprocket.face.style.cursor = "pointer";
			if (sprocket.spokes) {
				sprocket.spokes.style.cursor = "pointer";
			}
		}
		sprocket.player3.onfinish = function(e) {
			if (sprocket.element && sprocket.element.parentNode) {
				setTimeout(function() {
					sprocket.element.parentNode.removeChild(sprocket.element);
					delete sprockets[sprocket.id];
					sprocketsInPlay--;
					createAnimation = true;
				}, 500);
			}
		}
	});
}
function createChain(chainPath, animationLinks, currentChain) {
	var chainLength = chainPath[chainPath.length - 1].cumulativeUnits
	,	currentLink = null
	,	NumberOfHues = hues.length
	,	chainOpacity = 0.4 + (Math.random() * 0.6)
	;
	if (innerHue === null) {
		innerHue = Math.floor(Math.random() * NumberOfHues)
		outerHue = (innerHue + 2 + Math.floor(Math.random() * (NumberOfHues - 4))) % NumberOfHues;
		rivetHue = (outerHue + 2 + Math.floor(Math.random() * (NumberOfHues - 4))) % NumberOfHues;
	} else {
		innerHue = (innerHue + 1) % NumberOfHues;
		outerHue = (outerHue + 1) % NumberOfHues;
		rivetHue = (rivetHue + 1) % NumberOfHues;
	}
	linkOuter.style.webkitFilter = linkOuter.style.filter = 
		"hue-rotate(" + hues[innerHue] + "deg) brightness(" + brightnesses[innerHue] + ")";
	linkInner.style.webkitFilter = linkInner.style.filter = 
		"hue-rotate(" + hues[outerHue] + "deg) brightness(" + brightnesses[outerHue] + ")";
	linkRivet.style.webkitFilter = linkRivet.style.filter = 
		"hue-rotate(" + hues[rivetHue] + "deg) brightness(" + brightnesses[rivetHue] + ")";
	if (links.length % 2) {
		links.push(null);
	}
	for (var i = 0; i < chainLength; i++) {
		links.push(new Link(i, chainPath[0].originX, chainPath[0].originY, currentChain));
		currentLink = links[links.length - 1];
		currentLink.element.style.opacity = chainOpacity; 
		if (!i) {
			currentChain.firstLink = currentLink;
		}
		animationLinks.push(currentLink);
	}
	currentChain.lastLink = currentLink;
}
function createTransformation(chainPath,  transformations) {
	var	totalUnits = chainPath[chainPath.length - 1].cumulativeUnits
	;
	chainPath.forEach(function(step) {
		if (!step.sprocket) {
			transformations.push(
				{ transform: "translate3d(" + step.x + "px, " + step.y + "px, 0) rotate(" + step.angle + "rad)"
				, offset: step.cumulativeUnits/totalUnits } );
		}
	});
}
function freezeChain(clickedElement) {
	var	clickedLink = null
	,	beginFreezeLink = null
	,	chainSpeed = 0
	,	linksDisplayed = 0
	,	endFreezeLink = null
	,	trailingUnits = 0
	,	chainShortenedTime = 0
	,	firstLink = null
	,	lastLink = null
	;
	chainSpeed = clickedElement.chain.chainSpeed;
	firstLink = clickedElement.chain.firstLink;
	lastLink = clickedElement.chain.lastLink;
	if (firstLink && lastLink) {
		linksDisplayed = Math.min(Math.round(clickedElement.player.currentTime/(chainSpeed * 1000)),
			clickedElement.chain.lastLink.id - clickedElement.chain.firstLink.id);
		if (clickedElement.element.classList.contains("section")) {
			clickedLink = clickedElement;
		} else {
			clickedLink = links[clickedElement.chain.firstLink.id + Math.max(linksDisplayed -
				(clickedElement.cumulativeUnits + clickedElement.pathUnits), 0)];
		}
		if (clickedLink) {
			beginFreezeLink =
				links[Math.min(Math.max(clickedLink.id, clickedElement.chain.firstLink.id + 1), clickedElement.chain.lastLink.id)];
			endFreezeLink = links[clickedElement.chain.firstLink.id + linksDisplayed];
			trailingUnits = endFreezeLink.id - beginFreezeLink.id;
			chainShortenedTime = (beginFreezeLink.chain.lastLink.id - beginFreezeLink.id) * chainSpeed * 1000;
			for (var i = beginFreezeLink.id, j = clickedElement.chain.lastLink.id; i <= j; i++) {
				if (links[i]) {
					if (i > endFreezeLink.id) {
						if (links[i].player) {
							links[i].player.pause();
							finished.unshift(links[i]);
						}
					} else {
						if (links[i].element) {
							links[i].element.classList.add("frozen");
							links[i].player.pause();
							frozen.unshift(links[i]);
						}
					}
				}
			}
			clickedElement.chain.lastLink = links[beginFreezeLink.id - 1];
			for (var k = clickedElement.chain.firstSprocket.id, l = clickedElement.chain.lastSprocket.id; k <= l; k++) {
				if (sprockets[k]) {
					if (trailingUnits > sprockets[k].cumulativeUnits) {
						sprockets[k].player.pause();
						sprockets[k].player3.playbackRate = 0.5;
						frozen.push(sprockets[k]);
						clickedElement.chain.firstSprocket = sprockets[k + 1];
					} else {
						sprockets[k].player.currentTime += chainShortenedTime;
						sprockets[k].player3.currentTime += chainShortenedTime;
					}
				}
			}
		}
	}
}
function generatePath(chainPath, totalSprockets, animationSprockets, currentChain) {
	var	startX = 0
	,	startY = 0
	,	targetX = 0
	,	targetY = 0
	,	currentAngle = 0
	,	pathUnits = 0
	,	offsetX = 0
	,	offsetY = 0
	,	currentUnits = 0
	,	distanceToEdge = 0
	,	sprocketCount = 0
	,	currentSprocket = null
	,	pathClockwise = true
	,	chainAngle = 0
	,	sprocketAngle = 0
	,	sprocketX = 0
	,	sprocketY = 0
	,	targetDistance = 0
	,	tangentAngle = 0
	,	angleIncrement = 0
	;
	startX = (Math.random() > 0.5) ? (-2 * chainUnit) : screenWidth + (2 * chainUnit);
	startY = Math.random() * screenHeight;
	targetX = border + (Math.random() * (screenWidth - (2 * border)));
	targetY = border + (Math.random() * (screenHeight - (2 * border)));
	currentAngle = Math.atan2(targetY - startY,targetX - startX);
	chainPath.push(
	{	originX: startX
	,	originY: startY
	,	x: 0
	,	y: 0
	,	angle: currentAngle
	,	units: 0
	,	cumulativeUnits: 0 });
	pathUnits = Math.round(Math.sqrt(Math.pow(targetY - startY,2) + Math.pow(targetX - startX,2))/chainUnit);
	offsetX = chainUnit * pathUnits * Math.cos(currentAngle);
	offsetY = chainUnit * pathUnits * Math.sin(currentAngle);
	currentUnits = pathUnits;
	
	for (var i = 0; i < totalSprockets; i++) {
		chainPath.push(
		{	x: offsetX
		,	y: offsetY
		,	angle: currentAngle
		,	units: pathUnits
		,	cumulativeUnits: currentUnits });
		startX = chainPath[0].originX + offsetX;
		startY = chainPath[0].originY + offsetY;
		distanceToEdge = Math.min(startX, screenWidth - startX, startY, screenHeight - startY);
		sprocketCount =
			Math.round(Math.min(Math.round(distanceToEdge * 2 * Math.PI/chainUnit), minTeeth + (Math.random() * (maxTeeth - minTeeth))));
		sprocketCount = Math.max(sprocketCount, minTeeth);
		sprockets.push(new Sprocket(sprocketCount, currentChain));
		currentSprocket = sprockets[sprockets.length - 1];
		animationSprockets.push(currentSprocket);
		if (!i) {
			currentChain.firstSprocket = currentSprocket;
		}
		pathClockwise = Math.random() > 0.5 ? true : false;
		chainAngle = currentAngle - Math.PI;
		sprocketAngle = currentAngle +  Math.PI/(pathClockwise ? 2 : -2);
		sprocketX = startX + (chainUnit * 0.55 * Math.cos(chainAngle)) + (currentSprocket.radius * Math.cos(sprocketAngle));
		sprocketY =	startY + (chainUnit * 0.55 * Math.sin(chainAngle)) + (currentSprocket.radius * Math.sin(sprocketAngle));
		currentSprocket.element.style.top = sprocketY + "px";
		currentSprocket.element.style.left = sprocketX + "px";
		currentSprocket.element.style.transform = "rotate(" + (sprocketAngle - (Math.PI/2)) + "rad)";
		do {
			targetX = border + (Math.random() * (screenWidth - (2 * border)));
			targetY = border + (Math.random() * (screenHeight - (2 * border)));
			targetDistance = Math.sqrt(Math.pow(sprocketX - targetX, 2) + Math.pow(sprocketY - targetY, 2));
		} while (targetDistance < (2 * currentSprocket.radius));
		tangentAngle =
			(pathClockwise ? ((5 * Math.PI/2) - currentAngle) % (2 * Math.PI) : (Math.PI/2) + currentAngle) +
			(pathClockwise ?
				Math.atan2((targetY - sprocketY),(targetX - sprocketX)) - Math.acos(currentSprocket.radius/targetDistance) :
				(2 * Math.PI) - (Math.atan2((targetY - sprocketY),(targetX - sprocketX))) - Math.acos(currentSprocket.radius/targetDistance));
		tangentAngle = (tangentAngle + (4 * Math.PI)) % (2 * Math.PI);
		pathUnits = Math.round(currentSprocket.radius * tangentAngle/chainUnit);
		currentSprocket.pathIndex = chainPath.length;
		currentSprocket.pathUnits = pathUnits;
		currentSprocket.cumulativeUnits = currentUnits;
		chainPath.push(
		{	clockwise: pathClockwise
		,	units: pathUnits
		,	cumulativeUnits: currentUnits
		,	sprocket: currentSprocket
		,	sprocketOffset: sprocketAngle - (Math.PI/2) });

		angleIncrement = chainUnit/currentSprocket.radius * (pathClockwise ? 1 : -1);
		for (var j = 0; j < pathUnits; j++) {
			currentAngle = currentAngle + angleIncrement;
			offsetX = offsetX + (chainUnit * Math.cos(currentAngle));
			offsetY = offsetY + (chainUnit * Math.sin(currentAngle));
			currentUnits++;
			chainPath.push(
			{	x: offsetX
			,	y: offsetY
			,	angle: currentAngle
			,	units: 1
			,	cumulativeUnits: currentUnits });
		}
		
		pathUnits = Math.round(Math.sqrt(Math.pow(targetDistance,2) - Math.pow(currentSprocket.radius,2))/chainUnit);
		currentUnits = currentUnits + pathUnits;
		offsetX = offsetX + (pathUnits * chainUnit * Math.cos(currentAngle));
		offsetY = offsetY + (pathUnits * chainUnit * Math.sin(currentAngle));
	}
	currentChain.lastSprocket = currentSprocket;
}
function initialize() {
	var targetId = 0
	;
    canvas.addEventListener("click", function(e) {
		if (e.target.classList.contains("link")) {
			targetId = e.target.id.slice(1);
			if (links[targetId] && (links[targetId].player.playState == "running")) {
				freezeChain(links[targetId]);
				createAnimation = true;
			}
		} else if (e.target.classList.contains("face")) {
			targetId = e.target.id.slice(1);
			if (sprockets[targetId] && (sprockets[targetId].player.playState == "running")) {
				freezeChain(sprockets[targetId]);
				createAnimation = true;
			}
		}
    }, false);
    canvas.addEventListener("transitionend", function(e) {
		if (e.target.classList.contains("frozen") && (e.propertyName == "opacity")) {
			targetId = e.target.id.slice(1);
			if (links[targetId]) {
				finished.unshift(links[targetId]);
			}
		}
    }, false);
}
function proportionElements() {
    screenHeight = document.documentElement.clientHeight;
    screenWidth = document.documentElement.clientWidth;
	chainUnit = Math.min(screenHeight, screenWidth)/chainFactor;
	chainScale = chainUnit/369;
	border = minTeeth * chainUnit/(2 * Math.PI);
	maxTeeth = Math.round(chainFactor * Math.PI);
	//sprocketLimit = Math.floor(screenHeight * screenWidth/120000);
	sprocketLimit = chainUnit > 50 ? 8 : 6;
}
function animationLoop(ts) {
	var	chainPath = []
	,	totalSprockets = 0
	,	animationLinks = []
	,	animationSprockets = []
	,	animations = []
	,	transformations = []
	,	chosenLink = null
	,	chainSpeed = 0.3
	,	currentChain = null
	;
	if ((createAnimation) &&
		((sprocketsInPlay < 3) || ((sprocketsInPlay < sprocketLimit) && (Math.random() < 0.5)))) {
		totalSprockets = Math.max(3, links.length ? (sprocketLimit - sprocketsInPlay) : (sprocketLimit - 1));
		chains.push({ chainSpeed: chainSpeed });
		currentChain = chains[chains.length - 1];
		generatePath(chainPath, totalSprockets, animationSprockets, currentChain);
		createChain(chainPath, animationLinks, currentChain);
		animateSprockets(chainPath, animationSprockets, animations, currentChain);
		createTransformation(chainPath, transformations);
		animateChain(transformations, animationLinks, animations, currentChain)
		animations.forEach(function(x) { x.play(); } );
		createAnimation = false;
	} else if (frozen.length) {
		chosenLink = frozen.pop();
		chosenLink.element.style.transition = "opacity 2s ease-out, filter 1s ease-out";
		chosenLink.element.style.webkitFilter = chosenLink.element.style.filter = "saturate(0)";
		chosenLink.element.style.opacity = 0;
        chosenLink.element.style.pointerEvents = "none";
	} else if (finished.length > 0) {
		chosenLink = finished.pop();
		chosenLink.element.style.transition = "opacity 0s";
		chosenLink.element.style.opacity = 0;
		chosenLink.player.finish();
	} else if (sprocketsInPlay < 1) {
		createAnimation = true;
	}
	animationId = requestAnimFrame(animationLoop);
}
initialize();
})();
