(function() {
"use strict";
    
var requestAnimFrame = window.requestAnimationFrame || 
    window.mozRequestAnimationFrame || 
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;
    
var canvas = document.querySelector(".canvas")
,	windowShade = document.querySelector("#windowShade")
,	clockFace = document.querySelector("#clockFace")
,	clockFaceBorder = document.querySelector("#clockFaceBorder")
,	windowPlane = document.querySelector("#windowPlane")
,	sol1 = document.querySelector("#sol1")
,	sol2 = document.querySelector("#sol2")
,	sky = document.querySelector("#sky")
,	glow = document.querySelector("#glow")
,	night = document.querySelector("#night")
,	moon1 = document.querySelector("#moon1")
,	moon2 = document.querySelector("#moon2")
,	clocktick = new Audio('snd/clocktick.mp3')
,	faceSize = 0
,	faceXAngle = 0
,	faceYAngle = 0
,	handsScale = 0
,	hourDigits = []
,	clockMarks = []
,	windows = []
,	stars = []
,   animationId = null
,	twoPi = 2 * Math.PI
,	planeDeg = 0
,	solDeg = 360
,	currentSol = 1
,	currentMoon = 1
,	modeDuration = 20
,	solIncrement = 0
,	glowIncrement = 0
,	currentStar = 1
,	moonStart = 0
,	clockShift = 1
,	delayShift = 0
,	clockBorderColor = 0
,	visibleWindows = 0
,	shiftSeconds = null
;
window.onload = function() {
	var	columnIncrement = 0
	,	hourRoot = document.querySelector(".hourDigit")
	,	hourParent = hourRoot.parentNode
	,	markRoot = document.querySelector(".clockMark")
	,	markParent = markRoot.parentNode
	,	windowRoot = document.querySelector(".window")
	,	windowParent = windowRoot.parentNode
	,	star1Root = document.querySelector("#star1")
	,	star2Root = document.querySelector("#star2")
	,	star1Parent = star1Root.parentNode
	,	star2Parent = star2Root.parentNode
	,	mainWindow = []
	,	mainObject = []
	,	rowMax = 23
	,	columnMax = 35
	,	Hour = function () {
			this.id = hourDigits.length;
			this.element = hourRoot.cloneNode(false);
			this.element.id = "h" + this.id;
			hourParent.appendChild(this.element);
			this.element.textContent = !this.id ? 12 : this.id;
			this.element.style.top = (8 + ((1 - Math.cos(twoPi * this.id/12)) * 42)) + "%";
			this.element.style.left = (8 + ((1 + Math.sin(twoPi * this.id/12)) * 42)) + "%";
			this.element.style.visibility = "visible";
		}
	,	Mark = function () {
			this.id = clockMarks.length;
			this.element = markRoot.cloneNode(false);
			this.element.id = "m" + this.id;
			markParent.appendChild(this.element);
			if (!(this.id % 5)) {
				this.element.style.height = "1.5%";
				this.element.style.borderRadius = "0%";
				this.element.style.transform = "translate3d(-50%, -50%, 1px) rotateZ(" + (6 * this.id) + "deg)"
			}
			this.element.style.top = (2 + ((1 - Math.cos(twoPi * this.id/60)) * 48)) + "%";
			this.element.style.left = (2 + ((1 + Math.sin(twoPi * this.id/60)) * 48)) + "%";
			this.element.style.visibility = "visible";
		}
	,	Window = function (row, column) {
			var	windowNumber = null
			,	objectNumber = null
			;
			if (!column) {
				columnIncrement = Math.floor(Math.random() * 10);
				mainWindow[row] = Math.floor(Math.random() * 10);
				mainObject[row] = Math.floor(Math.random() * 20);
				mainObject[row] = mainObject[row] > 9 ? 10 : mainObject[row];
			}
			if (Math.random() < 0.96) {
				windowNumber = Math.floor(Math.random() * 20);
				windowNumber = windowNumber > 10 ? mainWindow[row] : windowNumber;
			} else if (mainObject[row] !== null) {
				objectNumber = mainObject[row];
				mainObject[row] = null;
			} else {
				windowNumber = 10;
			}
			this.id = windows.length;
			this.element = windowRoot.cloneNode(false);
			this.element.id = "w" + this.id;
			this.row = row;
			this.column = column;
			windowParent.appendChild(this.element);
			if (windowNumber != null) {
				this.element.style.backgroundPosition = (windowNumber/0.10) + "% 0%";
			} else {
				this.element.style.backgroundPosition = (objectNumber/0.10) + "% 100%";
			}
			this.element.style.transform = "translate3d(-50%, -50%, 0) translateZ(" + ((6 - row) * 350) +
				"px) rotateZ(" + ((column * 10) + columnIncrement) + "deg) rotateX(-90deg) translateZ(2000px)" +
				" scaleY(3) scaleX(" + (((windowNumber === null) || (faceYAngle > 0)) ? "-" : "") + "3)";
			this.element.style.visibility = "visible";
		}
	,	Star = function () {
			this.id = stars.length;
			if (this.id % 2) {
				this.element = star1Root.cloneNode(false);
				star1Parent.appendChild(this.element);
			} else {
				this.element = star2Root.cloneNode(false);
				star2Parent.appendChild(this.element);
			}
			this.element.id = "s" + this.id;
			this.element.style.width = this.element.style.height = (2 + (Math.random() * 8)) + "%";
			this.element.style.top = (100 - Math.sqrt(Math.random() * 10000)) + "%";
			this.element.style.left = (faceYAngle > 0 ? Math.sqrt(Math.random() * 10000) : 100 - Math.sqrt(Math.random() * 10000)) + "%";
		}
	;
    proportionElements();
	for (var i = 0; i < 12; i++) {
		hourDigits.push(new Hour());
	}
	for (var i = 0; i < 60; i++) {
		clockMarks.push(new Mark());
	}
	for (var row = 0; row <= rowMax; row++) {
		for (var col = 0; col <= columnMax; col++) {
			windows.push(new Window(row, col))
		}
	}
	windows = shuffleArray(windows);
	for (var i = 0; i < 100; i++) {
		stars.push(new Star());
	}
	canvas.style.visibility = "visible";
	animationLoop();
}
window.onresize = function() {
    proportionElements();
}
function initialize() {
	var reader = new XMLHttpRequest() || new ActiveXObject('MSXML2.XMLHTTP')
	,	usnoData = null
	,	latestDateDiff = 0
	,	moonPhase = 16
	,	currentTime = new Date()
	;
	clocktick.volume = 0.05;
    clockFace.addEventListener("click", function(e) {
		if (clockShift >= 1) {
			clockFace.style.transition = "transform 0.2s ease-out";
			clockFace.style.cursor = "default";
			clockBorderColor = Math.floor(Math.random() * 360);
			for (var i = 0; i < windows.length; i++) {
				windows[i].element.style.opacity = 0;
			}
			visibleWindows = 0;
			clockShift = 0;
			delayShift = 2;
			shiftSeconds = null;
		}
	}, false);

	moon1.style.backgroundPosition = moon2.style.backgroundPosition = (moonPhase * 100/28) + "% 0%";
	moonStart = (360 * moonPhase/29) + 5;
    reader.open("get.html","http://api.usno.navy.mil/rstt/oneday?date=" + (currentTime.getMonth() + 1) + "/" +
		currentTime.getDate() + "/" + currentTime.getFullYear() + "&loc=Sacramento,%20CA", true);
    reader.onreadystatechange = function() {
        if ((reader.readyState == 4) && (reader.responseText !== "")) {
			usnoData = JSON.parse(reader.responseText);
			latestDateDiff = Math.round((currentTime.getTime() - Date.parse(usnoData.closestphase.date))/86400000);
			switch (usnoData.closestphase.phase) {
				case "New Moon":
					moonPhase = (latestDateDiff > 0) ? latestDateDiff : 29 + latestDateDiff;
					break;
				case "First Quarter":
					moonPhase = 8 + latestDateDiff;
					break;
				case "Last Quarter":
					moonPhase = 23 + latestDateDiff;
					break;
				default:
					moonPhase = 16 + latestDateDiff;
			}
		moon1.style.backgroundPosition = moon2.style.backgroundPosition = (moonPhase * 100/28) + "% 0%";
		moonStart = (360 * moonPhase/29) + 5;
        }
    }
    reader.send(null);
}
function moveMoon(moon, moonDeg) {
	moon.style.top = (faceYAngle > 0 ? 110 - (100 * Math.cos(twoPi * moonDeg/360)) : 110 - (100 * Math.sin(twoPi * moonDeg/360))) + "%";
	moon.style.left = (faceYAngle > 0 ? (100 * Math.sin(twoPi * moonDeg/360)) - 10 : 110 - (100 * Math.cos(twoPi * moonDeg/360))) + "%";
	moon.style.transform = "translate3d(-50%, -50%, 0px) rotateZ(" + (faceYAngle > 0 ? moonDeg : moonDeg - 90) + "deg)";
	moon.style.opacity = 1;
}
function moveSol(sol) {
	sol.style.top = (faceYAngle > 0 ? 110 - (100 * Math.cos(twoPi * solDeg/360)) : 110 - (100 * Math.sin(twoPi * solDeg/360))) + "%";
	sol.style.left = (faceYAngle > 0 ? (100 * Math.sin(twoPi * solDeg/360)) - 10 : 110 - (100 * Math.cos(twoPi * solDeg/360))) + "%";
	sol.style.opacity = 1;
}
function proportionElements() {
    var windowFrame = document.querySelector("#windowFrame")
	,   screenHeight = 0
	,	screenWidth = 0
	;
    screenHeight = document.documentElement.clientHeight;
    screenWidth = document.documentElement.clientWidth;
	faceSize = Math.sqrt(screenHeight * screenWidth);
	canvas.style.fontSize = (faceSize/10) + "px";
	faceXAngle = 55 + (15 * Math.random());
	faceYAngle = (Math.random() < 0.5 ? -1 : 1) * (20 + (Math.random() * 30));
	sol1.style.backgroundImage =
		"radial-gradient(circle, hsla(0, 0%, 100%, 1) 0%, hsla(45, 100%, 50%, 0.6) 20%, hsla(45, 100%, 50%, 0) 30%)";
	sol2.style.backgroundImage =
		"radial-gradient(circle, hsla(0, 0%, 100%, 1) 0%, hsla(45, 100%, 50%, 0.6) 20%, hsla(45, 100%, 50%, 0) 35%)";
    sky.style.backgroundImage = "linear-gradient(" + faceYAngle + "deg, hsla(205, 77%, 86%, 1) 0%, hsla(211, 51%, 55%, 1) 50%, " +
		"hsla(219, 70%, 33%, 1) 100%)";
    glow.style.backgroundImage = "linear-gradient(" + faceYAngle + "deg, hsla(" + (Math.random() * 25) +
		", " + (50 + (Math.random() * 25)) + "%, 52%, 1) 0%, hsla(30, 17%, 40%, 1) 40%, hsla(30, 17%, 40%, 0) 60%)";
    night.style.backgroundImage = "linear-gradient(" + faceYAngle + "deg, hsla(220, 12%, 25%, 1) 0%, hsla(216, 29%, 1%, 1) 20%)";
    windowShade.style.backgroundImage = "linear-gradient(" + faceYAngle + "deg, hsla(0, 100%, 0%, 0.6), hsla(0, 0%, 0%, 0) 30%, " +
		"hsla(0, 0%, 0%, 0))";
	clockFace.style.height = clockFace.style.width = faceSize + "px";
	clockFaceBorder.style.height = clockFaceBorder.style.width = ((faceSize/2) - 8) + "px";
	clockFaceBorder.style.border = (faceSize/4) + "px solid white";
	clockFace.style.top = (35 + (30 * Math.random())) + "%";
	clockFace.style.left = (35 + (30 * Math.random())) + "%";
	clockFace.style.transform = "translate3d(-50%, -50%, 0px) rotateX(" + faceXAngle + "deg) rotateY(" + faceYAngle + "deg)";
	windowFrame.style.transform = "rotateX(" + faceXAngle + "deg) rotateY(" + faceYAngle + "deg)";
	handsScale = faceSize/1800;
}
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}
function animationLoop(ts) {
	var	currentTime = new Date()
	,	hourHand = document.querySelector("#hourHand")
	,	minuteHand = document.querySelector("#minuteHand")
	,	secondHand = document.querySelector("#secondHand")
	,	starfield = document.querySelector("#starfieldRoot")
	,	starfield1 = document.querySelector("#starfield1")
	,	starfield2 = document.querySelector("#starfield2")
	,	moonDeg = 0
	;
	setTimeout(function() { animationId = requestAnimFrame(animationLoop); },1000);
	clocktick.play();
	secondHand.style.transform = "translate3d(-50%, -50%, 15px) rotateZ(" + (6 * currentTime.getSeconds()) + "deg) scale(" + handsScale + ")";
	minuteHand.style.transform = "translate3d(-50%, -50%, 10px) rotateZ(" + Math.round(6 * currentTime.getMinutes()) +
		"deg) scale(" + handsScale + ")";
	hourHand.style.transform = "translate3d(-50%, -50%, 5px) rotateZ(" +
		Math.round((((currentTime.getHours() % 12) * 60) + currentTime.getMinutes())/2) +
		"deg) scale(" + handsScale + ")";
	windowPlane.style.transform = "rotateZ(" + planeDeg + "deg)";
	planeDeg = planeDeg - 6;
	if (clockShift < 1) {
		if (delayShift) {
			shiftSeconds = shiftSeconds || currentTime.getSeconds();
			delayShift--;
		}
		windowShade.style.opacity = clockShift;
		clockFace.style.transform = "translate3d(-50%, -50%, 0) rotateX(" + (faceXAngle * clockShift) + "deg) rotateY(" +
			(faceYAngle * clockShift) + "deg) rotateZ(" + (clockShift * (180 - (6 * shiftSeconds))) + "deg)";
		shiftSeconds++;
		clockFaceBorder.style.border = (faceSize/4) + "px solid " + "hsla(" + clockBorderColor + ", 80%, " + (50 + (clockShift * 50)) + "%, 1)";
		clockFaceBorder.style.opacity = 1 - (0.2 * clockShift);
		clockShift = delayShift ? 0 : clockShift + Math.max(0.01,((1 - clockShift) * 0.1));
		for (var i = visibleWindows, limit = Math.pow(clockShift,2) * windows.length; i < limit; i++) {
			windows[i].element.style.opacity = 1;
		}
		visibleWindows = i;
		if (clockShift >= 0.99) {
			clockShift = 1;
			windowShade.style.opacity = 1;
			clockFace.style.transition = "";
			clockFace.style.cursor = "pointer";
			for (var i = visibleWindows; i < windows.length; i++) {
				windows[i].element.style.opacity = 1;
			}
		}
	} else {
		clockFace.style.transform = "translate3d(-50%, -50%, 0) rotateX(" + faceXAngle + "deg) rotateY(" + faceYAngle +
			"deg) rotateZ(" + (180 - (6 * currentTime.getSeconds())) + "deg)";
	}
	
	if ((solDeg < 90) || (solDeg >= 360)) {
		if ((solDeg >= 360) || !solIncrement) {
			solDeg = solDeg % 360;
			modeDuration = Math.max(10, Math.min(50, modeDuration + ((Math.random() < .5 ? -1 : 1) * (Math.random() * 20))));
			solIncrement = 90/modeDuration;
			glowIncrement = 1/modeDuration;
			sky.style.opacity = 0.9;
			glow.style.opacity = 0;
			starfield.style.opacity = 0;
		}
	} else if (solDeg < 180) {
		glow.style.opacity = parseFloat(glow.style.opacity) + glowIncrement;
		if (glow.style.opacity > 0.5) {
			sky.style.opacity = parseFloat(sky.style.opacity) - (glowIncrement * 2);
			starfield.style.opacity = parseFloat(starfield.style.opacity) + (glowIncrement * 2);
		}
	} else if (solDeg < 270) {
		if (currentStar == 1) {
			starfield1.style.opacity = 0.3;
			starfield2.style.opacity = 1;
			currentStar = 2;
		} else {
			starfield1.style.opacity = 1;
			starfield2.style.opacity = 0.3;
			currentStar = 1;
		}
	} else {
		sky.style.opacity = Math.max(0, Math.min(0.9, (parseFloat(sky.style.opacity) + glowIncrement)));
		starfield.style.opacity = parseFloat(starfield.style.opacity) - glowIncrement;
		if (sky.style.opacity > 0.5) {
			glow.style.opacity = parseFloat(glow.style.opacity) - (glowIncrement * 2);
		}
	}
	
	solDeg = solDeg + solIncrement;
	if ((solDeg > 350) || (solDeg < 100)) {
		if (currentSol == 1) {
			moveSol(sol1);
			sol2.style.opacity = 0;
			currentSol = 2;
		} else {
			moveSol(sol2);
			sol1.style.opacity = 0;
			currentSol = 1;
		}
	}
	moonDeg = ((360 + solDeg - moonStart) % 360);
	if ((moonDeg > 350) || (moonDeg < 100)) {
		if (currentMoon == 1) {
			moveMoon(moon1, moonDeg);
			moon2.style.opacity = 0;
			currentMoon = 2;
		} else {
			moveMoon(moon2, moonDeg);
			moon1.style.opacity = 0;
			currentMoon = 1;
		}
	}
}
initialize();
})();
