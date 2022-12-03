(function() {
"use strict";
    
var requestAnimFrame = window.requestAnimationFrame || 
    window.mozRequestAnimationFrame || 
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;
    
var dollarRoot = document.querySelector("#dollarRoot")
,   pennies = []
,	dollars = []
,   svgs = []
,   masks = []
,   spirographs = []
,   svgPaths = []
,   serialNumerals = []
,   serialDigits = []
,   actions = []
,	screenHeight = 0
,	screenWidth = 0
,	dollarScale = 0
,   spirographSvgs = 6
,   animationId = null
,   perspective = 0
;
window.onload = function() {
	proportionElements();
    createPennies();
	animationLoop();
}
window.onresize = function() {
    proportionElements();
}
function createDollar() {
    var dollarFrameRoot = document.querySelector("#dollarFrameRoot")
    ,   Dollar = function () {
            this.id = dollars.length;
            this.frame = dollarFrameRoot.cloneNode(false);
            this.frame.id = "dollarFrame" + this.id;
            dollarFrameRoot.parentNode.appendChild(this.frame);
            this.frame.setAttribute("data-id",this.id);
			this.element = dollarRoot.cloneNode(false);
            this.element.id = "dollar" + this.id;
            this.frame.appendChild(this.element);
            this.element.setAttribute("data-id",this.id);
            this.screenRotation = (screenHeight > screenWidth) ? 90 : 0;
            this.spirographOrder = [0]
            for (var i = 1, j = spirographSvgs; i < j; i++) {
                this.spirographOrder.splice(Math.floor(Math.random() * (i + 1)), 0, i);
            }
            //this.xTarget = this.yTarget = 0;
            this.xOffset = this.yOffset = this.zOffset = 0;
            this.totalDuration = this.id ? Math.floor(15 + (Math.random() * 30)) : 30;
            this.stepDuration = this.id ? Math.floor(1 + (Math.random() * 2)) : 1
            this.transition = "transform ease-out " + this.stepDuration + "s, opacity ease-in " + this.stepDuration + "s, filter ease 0.2s";
            this.bounceTransition = "transform ease-in 0.4s";
            this.deleteTransition = "opacity ease-out 0.2s";
            this.inflateStage = null;
            //this.xOffsetStep = this.yOffsetStep = 0;
            this.zOffsetStep = Math.ceil(perspective/(this.totalDuration/this.stepDuration));
            this.totalSteps = Math.floor(perspective * 0.75/this.zOffsetStep);
            this.xApproach = (Math.random() < 0.5);
            this.approachLimit = (75/this.totalSteps) * ((Math.random() < 0.5) ? -1 : 1)
            this.otherApproach = (Math.random() * 50/this.totalSteps) * ((Math.random() < 0.5) ? -1 : 1)
            this.xRotation = this.yRotation = 0;
            this.zRotation = this.screenRotation + (this.id ? ((Math.random < 0.5 ? -1 : 1) * (Math.random() * 30)) : 0);
            this.xRotationStep = this.xApproach ? this.approachLimit : this.otherApproach;
            this.yRotationStep = this.xApproach ? this.otherApproach : this.approachLimit;
            this.zRotationStep = this.id ? (-1 * (this.zRotation - this.screenRotation)/this.totalSteps) : 0;
            this.currentStepCount = 0;
            this.hueStep = 2000/perspective;
            this.svgs = createSvgs(this);
            this.serialNumber = createSerialNumber(this);
            this.frameChanging = this.frameVisible = false;
            this.svgsChanging = this.svgsVisible = false;
            this.masksChanging = this.masksVisible = false;
            this.spirosChanging = this.spirosVisible = false;
            this.serialsChanging = this.serialsVisible = false;
            this.visible = this.moving = this.deleting = false;
            this.lowestSvgZOffset = 0;
            this.frame.style.transform = this.transformValue();
            this.mousein = false;
            this.timeoutId = 0;
            this.timeoutFlag = false;
            this.blinkSvg = null;
        }
    ;
    Dollar.prototype.delete = function() {
        if (this.visible) {
            if (!this.deleting) {
                this.deleting = true;
                createDollar();
            } else {
                actions.push({ action: "animate", element: this.frame, style: "opacity", value: 0, transition: "opacity ease-out 0.5s" });
            }
        } else {
            this.frame.removeChild(this.element);
            this.frame.parentNode.removeChild(this.frame);
            delete dollars[this.id];
        }
    }
    Dollar.prototype.display = function() {
        actions.push({ action: "animate", element: this.frame, style: "transform", value: this.transformValue()
            , transition: "transform 0.1s linear" });
        this.timeoutFlag = false;
        clearTimeout(this.timeoutId);
        (function(dollar) { dollar.timeoutId = setTimeout(function() { dollar.timeoutFlag = true; }, dollar.stepDuration * 10000); })(this);
    }
    Dollar.prototype.move = function() {
        //console.log(Date.now() + ": moving dollar, step " + this.currentStepCount + " lowest SvgZOffset " + this.lowestSvgZOffset + " zOffset " + this.zOffset);
        if (((this.lowestSvgZOffset + this.zOffset) > (perspective * 0.75)) || (this.currentStepCount > this.totalSteps)) {
        //if (((this.lowestSvgZOffset + this.zOffset) > (perspective * 0.75)) || (this.currentStepCount > 1)) {
            this.delete();
        } else {
            this.inflateStage = 0;
            //console.log(Date.now() + ": dollar moved to x: " + this.xOffset + " y: " + this.yOffset + " z: " + this.zOffset +
                //" rotate x: " + this.xRotation + " y: " + this.yRotation + " z: " + this.zRotation);
            actions.push({ action: "animate", element: this.frame, style: "transform", value: this.transformValue(), transition: this.transition });
            this.serialNumber.move();
            this.svgs.forEach(function(svg) {
                svg.move();
            });
            this.timeoutFlag = false;
            clearTimeout(this.timeoutId);
            (function(dollar) { dollar.timeoutId = setTimeout(function() { dollar.timeoutFlag = true; }, dollar.stepDuration * 5000); })(this);
            this.moving = true;
        }
    }
    Dollar.prototype.transformValue = function() {
        if (this.inflateStage === null) {
            return "translate3d(" + this.xOffset + "px, " + this.yOffset + "px, " + this.zOffset + "px) " +
                "rotateX(" + this.xRotation + "deg) rotateY(" + this.yRotation + "deg) rotateZ(" + this.zRotation + "deg) " +
                "scale(" + dollarScale + ")";
        } else if (this.inflateStage == 0) {
            //this.xOffset = this.xOffset + this.xOffsetStep;
            //this.xOffset = this.xOffset + (this.xTarget - this.xOffset)/5;
            //this.yOffset = this.yOffset + this.yOffsetStep;
            //this.yOffset = this.yOffset + (this.yTarget - this.yOffset)/5;
            this.zOffset = this.zOffset + this.zOffsetStep;
            this.xRotation = this.xRotation + this.xRotationStep;
            this.yRotation = this.yRotation + this.yRotationStep;
            this.zRotation = this.zRotation + this.zRotationStep;
            return "translate3d(" + this.xOffset + "px, " + this.yOffset + "px, " + (this.zOffset + 10) + "px) " +
                "rotateX(" + this.xRotation + "deg) rotateY(" + this.yRotation + "deg) rotateZ(" + this.zRotation + "deg) " +
                "scale(" + dollarScale + ")";
        } else if (this.inflateStage == 1) {
            return "translate3d(" + this.xOffset + "px, " + this.yOffset + "px, " + this.zOffset + "px) " +
                "rotateX(" + this.xRotation + "deg) rotateY(" + this.yRotation + "deg) rotateZ(" + this.zRotation + "deg) " +
                "scale(" + dollarScale + ")";
        }
    }
    if (!dollars.length || dollars.every(function(dollar) { return dollar.deleting; })) {
        dollars.push(new Dollar());
    }
}
function createMask(svg) {
    var Mask = function() {
			this.id = masks.length;
            this.svg = svg;
            this.dollar = svg.dollar;
			this.element = dollarRoot.querySelector("#maskRoot").cloneNode(false);
            this.element.id = "mask" + this.id;
            this.element.classList.add(svg.element.name + "Mask");
            this.element.setAttribute("data-id",this.id);
            if (svg.groupElement) {
                this.element.style.width = svg.element.clientWidth + "px";
                this.element.style.height = (svg.element.clientWidth * 1.6) + "px";
                svg.groupElement.appendChild(this.element);
            } else {
                svg.dollar.element.appendChild(this.element);
            }
            this.spirographs = [];
            this.visible = false;
            this.spirosVisible = false;
        }
    ;
    Mask.prototype.delete = function() {
        if (this.visible) {
            actions.push({ action: "animate", element: this.element, style: "opacity", value: 0, transition: this.dollar.deleteTransition });
        } else {
            if (svg.groupElement) {
                svg.groupElement.removeChild(this.element);
            } else {
                svg.dollar.element.removeChild(this.element);
            }
            delete masks[this.id];
            svg.mask = null;
            if (svg.dollar.svgs.every(function(svg) { return !svg.mask; })) {
                svg.dollar.masksVisible = false;
                svg.dollar.masksChanging = false;
            }
       }
    }
    Mask.prototype.display = function() {
        actions.push({ action: "animate", element: this.element, style: "opacity", value: 1, transition: this.dollar.transition });
    }
    if (svg.element.classList.contains("masked")) {
        masks.push(new Mask());
        return masks[masks.length - 1];
    } else {
        return null;
    }
}
function createPennies() {
    var pennyFrameRoot = document.querySelector("#pennyFrameRoot")
    ,   pennyRoot = document.querySelector("#pennyRoot")
    ,   pennySize = pennyRoot.clientHeight
    ,   Penny = function() {
            this.id = pennies.length;
            this.frame = pennyFrameRoot.parentNode.appendChild(pennyFrameRoot.cloneNode(true));
            this.frame.id = "pennyFrame" + this.id;
            this.frame.setAttribute("data-id",this.id);
            this.element = this.frame.firstElementChild
            this.element.id = "penny" + this.id;
            this.spinPeriod = (Math.random() * 0.5) + 0.25;
            this.element.style.animation = "pennyspin0 " + (4 * this.spinPeriod) + "s steps(2) infinite, " +
                "pennyspin1 " + this.spinPeriod + "s linear alternate infinite";
            this.moving = false;
        }
    ;
    Penny.prototype.move = function() {
        if (this.moving) {
            this.frame.style.visibility = "visible";
            this.frame.style.transition = "transform " + ((screenHeight/50) + (2 * Math.random())) + "s linear";
            actions.push({ action: "animate", element: this.frame, style: "transform",
                value: "translate3d(" + this.x + "px,-" + this.yDistance + "px," + this.z + "px) rotate(-1000deg)" });
        } else {
            this.z = -1000 - (2 * Math.random() * perspective);
            this.y = (screenHeight * ((1 - (this.z/perspective)) + (this.z/(2 * perspective)))) + pennySize;
            this.x = screenWidth * (((1 - (this.z/perspective)) * Math.random()) + (this.z/(2 * perspective)));
            this.yDistance = (screenHeight * (1 - (this.z/perspective))) + (2 * pennySize);
            this.startingAngle = Math.random() * 360;
            this.rotationPeriod = (Math.random() * 2) + 0.5;
            this.frame.style.visibility = "hidden";
            this.frame.style.transition = "transform 0.1s linear";
            actions.push({ action: "animate", element: this.frame, style: "transform",
                value: this.frame.style.transform = "translate3d(" + this.x + "px," + this.y + "px," + this.z + "px) " +
                    "rotate(" + this.startingAngle + "deg)" });
        }
    }
    for (var i = 0; i < (screenHeight * screenWidth)/20000; i++) {
        pennies.push(new Penny());
        (function (index) {
            setTimeout(function() { pennies[index].move(); }, i * 2000);
        })(i);
    }
}
function createSerialNumber(dollar) {
    var serialNumeralRoot = dollarRoot.querySelector("#serialNumeralRoot")
    ,	serialDigitRoot = dollarRoot.querySelector("#serialDigitRoot")
    ,   serialNumberLength = 9
    ,   baseY = 2.0
    ,   incrementY = 8.8
    ,   SerialDigit = function(numeral) {
            this.id = serialDigits.length;
            this.digit = numeral.digits.length;
            this.numeral = numeral;
            this.value = Math.floor(numeral.number.value/Math.pow(10, this.digit)) % 10;
            this.element = numeral.element.appendChild(serialDigitRoot.cloneNode(true));
            this.element.id = "serialDigit" + this.id;
            this.element.classList.add("serialDigit");
            this.element.setAttribute("data-id",this.id);
            this.element.style.left = (10.7 * this.digit) + "%";
            this.moving = false;
        }
    ,   SerialNumeral = function(number) {
            this.id = serialNumerals.length;
            this.number = number
            this.dollar = this.number.dollar;
            this.element = (dollar.element.appendChild(serialNumeralRoot.cloneNode(false)));
            this.element.id = "serialNumber" + this.id;
            this.element.classList.add("serialNumeral" + number.numerals.length);
            this.element.setAttribute("data-id",this.id);
            this.digits = []
            for (var j = 0; j < serialNumberLength; j++) {
                serialDigits.push(new SerialDigit(this));
                this.digits.push(serialDigits[serialDigits.length - 1]);
            }
            this.visible = false;
            this.moving = false;
        }
    ,   SerialNumber = function() {
            this.id = dollar.id;
            this.dollar = dollar;
            this.value = 0;
            this.nextValue = Math.floor(Math.random() * Math.pow(10, serialNumberLength));
            this.numerals = []
            for (var i = 0; i < 2; i++) {
                serialNumerals.push(new SerialNumeral(this));
                this.numerals.push(serialNumerals[serialNumerals.length - 1]);
            }
            this.visible = false;
            this.moving = false;
        }
    ;
    SerialNumeral.prototype.delete = function() {
        if (this.visible) {
            actions.push({ action: "animate", element: this.element, style: "opacity", value: 0, transition: this.dollar.deleteTransition });
        } else {
            this.digits.forEach(function(digit) {
                delete serialDigits[digit.id];
            });
            this.digits = [];
            dollar.element.removeChild(this.element);
            this.element = null;
            delete serialNumerals[this.id];
            if (dollar.serialNumber.numerals.every(function(numeral) { return !numeral.element; })) {
                dollar.serialNumber = null;
                dollar.serialsVisible = false;
                dollar.serialsChanging = false;
            }
        }
    }
    SerialNumber.prototype.display = function() {
        this.numerals.forEach(function(numeral) {
            actions.push({ action: "animate", element: numeral.element, style: "opacity", value: 1, transition: numeral.dollar.transition });
        });
    }
    SerialNumber.prototype.move = function() {
        var priorValue = 0
        ;
        //console.log(Date.now() + ": value " + this.value + " next " + this.nextValue);
        if (this.value == this.nextValue) {
            this.nextValue = this.value + 1;
        }
        this.moving = true;
        this.numerals.forEach(function(numeral) {
            numeral.moving = true;
            numeral.digits.forEach(function(digit, i) {
                priorValue = digit.value;
                digit.value = Math.floor(digit.numeral.number.nextValue/Math.pow(10, (serialNumberLength - i - 1))) % 10;
                if (digit.value != priorValue) {
                    digit.moving = true;
                    digit.element.firstElementChild.style.transitionDuration = Math.max(0.2, Math.abs(digit.value - priorValue) * 0.2) + "s";
                    actions.push({ action: "animate", element: digit.element.firstElementChild, style: "transform",
                        value: "translate3d(0%, -" + (baseY + (digit.value * incrementY)) + "%, 6px)" });
                }
            });
        });
        this.value = this.nextValue;
        this.nextValue = Math.floor(Math.random() * Math.pow(10, serialNumberLength));
    }
    SerialNumber.prototype.reset = function() {
        this.nextValue = 0;
        this.move()
    }
    SerialNumber.prototype.setGroupSize = function() {
        if (this.groupElement && !this.group && !this.mask) {
            this.groupElement.style.height = (this.element.clientHeight * this.scale) + "px";
            this.groupElement.style.width = (this.element.clientWidth * this.scale) + "px";
        }
    }
    return new SerialNumber();
}
function createSpirographs(mask, spiroType) {
    var currentSpirograph = null
    ,   returnSpirographs = []
    ,   Spirograph = function (i, j, k) {
			this.id = spirographs.length;
            this.mask = mask;
            this.dollar = this.mask.dollar;
			this.element = dollarRoot.querySelector("#spirographRoot").cloneNode(false);
            mask.element.appendChild(this.element);
            this.element.id = "spirograph" + this.id;
            this.element.setAttribute("data-id",this.id);
            if (j === undefined) {
                this.sequence = i;
            } else {
                    this.sequence = (k < 2) ? (k * 2) + j + 2 : j + 2;
                    this.element.style.top = ((k * 52) - 2) + "%";
                    this.element.style.left = (i ? 102 - (j * (k == 1 ? 8 : 27)) : (j * (k == 1 ? 8 : 27)) - 2) + "%";
            }
            this.element.setAttribute("data", "./img/spirograph" + mask.dollar.spirographOrder[this.sequence] + ".svg");
            this.visible = false;
        }
    ,   dataId = 0
    ;
    Spirograph.prototype.delete = function() {
        if (this.visible) {
            actions.push({ action: "animate", element: this.element, style: "opacity", value: 0, transition: this.dollar.deleteTransition });
        } else {
            mask.element.removeChild(this.element);
            this.element = null;
            delete spirographs[this.id];
            if (mask.spirographs.every(function(spirograph) { return !spirograph.element; })) {
                mask.spirographs = [];
                mask.spirosVisible = false;
                if (mask.svg.dollar.svgs.every
                        (function(svg) { return (!svg.mask  || !svg.mask.spirosVisible); })) {
                    mask.svg.dollar.spirosChanging = false;
                    mask.svg.dollar.spirosVisible = false;
                }
            }
        }
    }
    Spirograph.prototype.display = function() {
        actions.push({ action: "animate", element: this.element, style: "opacity", value: 1, transition: this.dollar.transition });
        this.element.classList.add("spiroAnimate" + this.sequence);
    }
    if (spiroType == 1) {
        for (var i = 0; i < 2; i++) {
            spirographs.push(new Spirograph(i));
            returnSpirographs.push(spirographs[spirographs.length - 1]);
        }
    } else if (spiroType == 2) {
        for (var i = 0; i < 2; i++) {
            for (var k = 0; k < 3; k++) {
                for (var j = 0; j < 2; j++) {
                    spirographs.push(new Spirograph(i, j, k));
                    returnSpirographs.push(spirographs[spirographs.length - 1]);
                }
            }
        }
    }
    return returnSpirographs;
}
function createSvgs(dollar) {
    var pathColors =
    [   { hex: "#e8ebce", hue: 66, saturation: 42, luminosity: 86, opacity: 1, type: 0 }
    ,   { hex: "#383836", hue: 60, saturation: 2, luminosity: 22, opacity: 1, type: 1 }
    ,   { hex: "#0c8652", hue: 154, saturation: 84, luminosity: 29, opacity: 1, type: 0 } ]
    ,   returnSvgs = []
    ,   Svg = function (svgObject) {
            this.id = svgs.length;
            this.dollar = dollar;
            this.element = svgObject.cloneNode(false);
            this.element.id = "svg" + this.id;
            this.element.setAttribute("data-id",this.id);
            this.active = this.element.classList.contains("active");
            this.group = this.element.getAttribute("data-group");
            if (this.active || this.group) {
                if (this.active || (this.group == this.element.name)) {
                    this.groupElement = dollar.element.appendChild(dollarRoot.querySelector("#groupRoot").cloneNode(false));
                    this.groupElement.id = this.element.name + "Group" + dollar.id;
                    this.groupElement.setAttribute("data-id",this.id);
                    this.groupElement.classList.add(this.element.name + "Group");
                } else {
                    this.groupElement = dollar.element.querySelector("#" + this.group + "Group" + dollar.id);
                }
                this.groupElement.appendChild(this.element);
            } else {
                this.groupElement = null;
                dollar.element.appendChild(this.element);
            }
            this.moveElement = this.groupElement ? this.groupElement : this.element;
            //this.offsetTop = this.moveElement.offsetTop;
            //this.offsetLeft = this.moveElement.offsetLeft;
            this.boundingRect = this.moveElement.getBoundingClientRect();
            this.mask = null;
            this.order = this.element.getAttribute("data-order");
            this.mousein = false;
            this.imageFile = "./img/" + this.element.name + ".svg";
            this.paths = [];
            this.rotatable = this.element.classList.contains("rotatable");
            this.scale = parseFloat(window.getComputedStyle(this.element).transform.split(",")[0].split("(")[1]);
            this.moveScale = parseFloat(window.getComputedStyle(this.moveElement).transform.split(",")[0].split("(")[1]);
            this.zOffset = this.zOffsetOrigin = parseInt(window.getComputedStyle(this.moveElement).transform.split(",")[14]);
            this.zOffsetStep = Math.floor(dollar.zOffsetStep/(2 + Math.floor(Math.random() * 4)));
            this.zPriorStep = 0;
            this.zRotation = 0;
            this.zRotationStep = 0;
            this.currentStepCount = 0;
            this.shadowElement = null;
            this.loading = this.visible = this.moving = this.toReset = false;
            this.hueStep = dollar.hueStep;
        }
    ,   SvgPath = function (svg, path, pathColor) {
            this.id = svgPaths.length;
            this.element = path;
            this.element.setAttribute("data-id",this.id);
            this.element.style.transition = "fill 2s ease";
            this.svg = svg;
            this.hsla =
                { hue: pathColor.hue, saturation: pathColor.saturation, luminosity: pathColor.luminosity, opacity: pathColor.opacity,
                    type: pathColor.type };
            this.hueAddition = 0;
    }
    ,   svgObjects = dollarRoot.querySelectorAll(".svg")
    ;
    Svg.prototype.addPaths = function(paths) {
        var currentSvg = this
        ,   dataId = 0
        ;
        for (var i = 0, j = paths.length; i < j; i++) {
            pathColors.forEach(function(pathColor) {
                if (paths[i].getAttribute("fill") == pathColor.hex) {
                    svgPaths.push(new SvgPath(currentSvg, paths[i], pathColor));
                    if (!currentSvg.group || (currentSvg.group == currentSvg.element.name)) {
                        currentSvg.paths.push(svgPaths[svgPaths.length - 1]);
                    } else {
                        svgs[dollar.element.querySelector("#" + currentSvg.group + "Group" + dollar.id).getAttribute("data-id")].paths.push
                            (svgPaths[svgPaths.length - 1]);
                    }
                }
            });
        }
    }
    Svg.prototype.blink = function(unblink) {
        //console.log(Date.now() + ": blink for " + this.id + " dollar " + this.dollar.id + " deleting " +
            //this.dollar.deleting + " " + unblink);
        if (this.dollar.blinkSvg) {
            if (unblink) {
                if (!this.dollar.deleting) {
                    actions.unshift(
                        { action: "animate", element: this.dollar.blinkSvg.element, style: "opacity", value: 0,
                            transition: "opacity linear 0.1s" });
                }
            } else {
                actions.push(
                    { action: "animate", element: this.dollar.blinkSvg.element, style: "opacity", value: 1,
                        transition: "opacity linear 0.1s" });                
            }
        }
    }
    Svg.prototype.delete = function() {
        if (this.visible) {
            this.paths.forEach(function(path) {
                delete svgPaths[path.id];
            });
            this.paths = [];
            if (this.shadowElement) {
                actions.push({ action: "animate", element: this.shadowElement, style: "opacity", value: 0, transition: this.dollar.deleteTransition });
            }
            actions.push({ action: "animate", element: this.element, style: "opacity", value: 0 });
        } else {
            if (this.group || this.active) {
                this.groupElement.removeChild(this.element);
                if (!this.groupElement.firstElementChild) {
                    this.groupElement.parentNode.removeChild(this.groupElement);
                }
            } else {
                dollar.element.removeChild(this.element);
            }
            this.element = null;
            delete svgs[this.id];
            if (dollar.svgs.every(function(svg) { return !svg.element; })) {
                dollar.svgs = [];
                dollar.svgsChanging = false;
                dollar.svgsVisible = false;
            }
        }
    }
    Svg.prototype.display = function() {
        if (this.element.classList.contains("washingtonBlink")) {
            this.dollar.blinkSvg = this;
            this.visible = true;
        } else {
            actions.push({ action: "animate", element: this.element, style: "opacity", value: 1, transition: this.dollar.transition });
        }
        this.addPaths(this.element.contentDocument.getElementsByTagName("path"));
    }
    Svg.prototype.load = function() {
        var currentSvg = this
        ;
        this.element.setAttribute("data", this.imageFile);
        this.element.addEventListener("load", function(e) { actions.push({ action: "display", object: currentSvg }); }, false);
        this.loading = false;
    }
    Svg.prototype.move = function() {
        var svgActions = []
        ;
        if (this.active) {
            if (this.mousein) {
                this.zPriorStep = (3 * this.zOffsetStep);
                this.zRotation = this.zRotation + this.zRotationStep + (this.rotatable ? ((Math.random < 0.5 ? -1 : 1) * 30) : 0);
            } else if (this.toReset) {
                this.zPriorStep = this.zOffsetOrigin - this.zOffset;
                this.zRotation = 0;
            } else {
                this.zPriorStep = this.zOffsetStep;
                this.zRotation = this.zRotation + this.zRotationStep;
            }
            this.zOffset = this.zOffset + this.zPriorStep;
            svgActions.push({ action: "animate", element: this.moveElement, style: "transform", continued: true
                , value: "translate3d(-50%, -50%, " + this.zOffset + "px) " + "rotateZ(" + this.zRotation + "deg) scale(" + this.moveScale + ")"
                , transition: this.dollar.transition });
            //console.log(Date.now() + ": moving svg " + this.id + " " + this.element.name + " by " + this.zPriorStep + " to " + this.zOffset +
                //(this.mousein ? " mousein" : "") + (this.toReset ? " toReset" : ""));
            this.setColors(svgActions);
            this.setShadow(svgActions);
            svgActions[svgActions.length - 1].continued = false;
            if (this.mousein || this.toReset) {
                actions = svgActions.concat(actions);
            } else {
                actions = actions.concat(svgActions);
            }
            this.currentStepCount++;
            this.moving = true;
            clearTimeout(this.dollar.timeoutId);
            (function(dollar) { dollar.timeoutId = setTimeout(function() { dollar.timeoutFlag = true; }, dollar.stepDuration * 5000); })(this.dollar);
        }
    }
    Svg.prototype.setColors = function(svgActions) {
        var currentSvg = this
        ,   newColor = ""
        ;
        this.paths.forEach(function(svgPath) {
            if ((!currentSvg.mousein && (svgPath.hsla.type == 0)) || (svgPath.hsla.type == 1) || currentSvg.toReset)  {
                if (currentSvg.toReset) {
                    svgPath.hueAddition = 0;
                } else if (currentSvg.mousein || (svgPath.hsla.type == 0)) {
                    svgPath.hueAddition = svgPath.hueAddition + (svgPath.svg.hueStep * currentSvg.zPriorStep);
                }
                newColor = "hsl(" +
                    (svgPath.hsla.hue + svgPath.hueAddition) + "," +
                    (svgPath.hsla.saturation + (currentSvg.mousein ? 50 : 0)) + "%," +
                    (currentSvg.mousein ? 50 : svgPath.hsla.luminosity) + "%)"
                svgActions.push({ action: "animate", element: svgPath.element, style: "fill", value: newColor, continued: true });
            }
        });
    }
    Svg.prototype.setGroupSize = function() {
        if (this.groupElement && !this.group && !this.mask) {
            this.groupElement.style.height = (this.element.clientHeight * this.scale) + "px";
            this.groupElement.style.width = (this.element.clientWidth * this.scale) + "px";
        }
    }
    Svg.prototype.setShadow = function(svgActions) {
        var shadowLimit = perspective/10
        ,   shadowPercent = 0
        ;
        if (!this.shadowElement && (this.zOffset < shadowLimit) && !this.toReset) {
            this.shadowElement = dollar.element.appendChild(this.moveElement.cloneNode(true));
            this.shadowElement.classList.add("shadow");
            this.shadowElement.setAttribute("data-id",this.id);
        }
        if (this.shadowElement) {
            if (this.zOffset > shadowLimit) {
                svgActions.push({ action: "animate", element: this.shadowElement, style: "opacity", value: 0 });
            } else {
                shadowPercent = this.zOffset/shadowLimit;
                svgActions.push({ action: "animate", element: this.shadowElement, style: "filter"
                    , value: "blur(" + (shadowPercent * 5) + "px) grayscale(100%)", continued: true });
                svgActions.push
                    ({ action: "animate", element: this.shadowElement, style: "opacity", value: (1 - shadowPercent) * 0.5, continued: true });
            }
        }
    }
    Svg.prototype.setUpEvents = function() {
        var currentSvg = this
        ,   svgActions = []
        ;
        if (this.active) {
            this.moveElement.addEventListener("mouseenter", function(e) {
                currentSvg.dollar.mousein = currentSvg.mousein = true;
                currentSvg.setColors(svgActions);
                if (svgActions.length) { svgActions[svgActions.length - 1].continued = false };
                actions = svgActions.concat(actions);
                if (!currentSvg.moving) { currentSvg.move(); }
            }, false);
            this.moveElement.addEventListener("touchstart", function(e) {
                currentSvg.dollar.mousein = currentSvg.mousein = true;
                currentSvg.setColors(svgActions);
                if (svgActions.length) { svgActions[svgActions.length - 1].continued = false };
                actions = svgActions.concat(actions);
                if (!currentSvg.moving) { currentSvg.move(); }
            }, false);
            this.moveElement.addEventListener("mouseleave", function(e) {
                currentSvg.dollar.mousein = currentSvg.mousein = false;
                currentSvg.setColors(svgActions);
                if (svgActions.length) { svgActions[svgActions.length - 1].continued = false };
                actions = svgActions.concat(actions);
            }, false);
            this.moveElement.addEventListener("click", function(e) {
                currentSvg.toReset = true;
                //currentSvg.dollar.xTarget =
                //    currentSvg.moveElement.offsetTop + (currentSvg.moveElement.offsetHeight/2) - (currentSvg.moveElement.parentNode.offsetHeight/2);
                //currentSvg.dollar.yTarget =
                //    currentSvg.moveElement.offsetLeft + (currentSvg.moveElement.offsetWidth/2) - (currentSvg.moveElement.parentNode.offsetWidth/2);
                //console.log(Date.now() + ": svg " + currentSvg.id + " " + currentSvg.element.name +
                //    " set dollar xTarget/yTarget to " + currentSvg.dollar.xTarget + "/" + currentSvg.dollar.yTarget);
                if (!currentSvg.moving) { currentSvg.move(); }
            }, false);
        }
    }
    for (var i = 0, j = svgObjects.length; i < j; i++) {
        svgs.push(new Svg(svgObjects[i]));
        returnSvgs.push(svgs[svgs.length - 1]);
    }
    return returnSvgs;
}
function initialize() {
    var dataId = 0
    ;
    perspective = parseInt(window.getComputedStyle(document.querySelector("#perspectiveFrame")).perspective);
    document.body.addEventListener("transitionend", function(e) {
        dataId = e.target.getAttribute("data-id");
		if (e.propertyName == "transform") {
            if (e.target.classList.contains("dollarFrame")) {
                if (dollars[dataId].frameChanging) {
                    actions.push(
                        { action: "animate", element: dollars[dataId].frame, style: "opacity", value: 1, transition: dollars[dataId].transition });
                } else if (dollars[dataId].inflateStage == 0) {
                    dollars[dataId].inflateStage++;
                    actions.unshift({ action: "animate", element: dollars[dataId].frame, style: "transform", value: dollars[dataId].transformValue()
                        , transition: dollars[dataId].bounceTransition });
                } else {
                    dollars[dataId].moving = false;
                }
            } else if (e.target.parentNode.classList.contains("serialDigit")) {
                dataId = e.target.parentNode.getAttribute("data-id");
                serialDigits[dataId].moving = false;
                if (serialDigits[dataId].numeral.digits.every(function(digit) { return !digit.moving; })) {
                    serialDigits[dataId].numeral.moving = false;
                    if (serialDigits[dataId].numeral.number.numerals.every(function(numeral) { return !numeral.moving; })) {
                        serialDigits[dataId].numeral.number.moving = false;
                    }
                }
            } else if (e.target.classList.contains("svg") || e.target.classList.contains("group")) {
                if (svgs[dataId].mousein) {
                    svgs[dataId].move();
                    svgs[dataId].mousein = false;
                } else if (svgs[dataId].toReset) {
                    svgs[dataId].move();
                    svgs[dataId].toReset = false;
                    svgs[dataId].mousein = false;
                } else {
                    svgs[dataId].moving = false;
                }
            } else if (e.target.classList.contains("pennyFrame")) {
                pennies[dataId].moving = !pennies[dataId].moving;
                pennies[dataId].move();
            }
        } else if (e.propertyName == "opacity") {
            if (e.target.style.opacity == 1) {
                if (e.target.classList.contains("dollarFrame")) {
                    dollars[dataId].frameChanging = false;
                    dollars[dataId].frameVisible = true;
                } else if (e.target.classList.contains("mask")) {
                    masks[dataId].spirographs = createSpirographs(masks[dataId], masks[dataId].svg.element.getAttribute("data-spiro"));
                    masks[dataId].visible = true;
                    if (masks[dataId].svg.dollar.svgs.every(function(svg) { return ((svg.mask === null) || svg.mask.visible); })) {
                        masks[dataId].dollar.masksChanging = false;
                        masks[dataId].dollar.masksVisible = true;
                    }
                } else if (e.target.classList.contains("serialNumeral")) {
                    serialNumerals[dataId].visible = true;
                    if (serialNumerals[dataId].number.numerals.every(function(numeral) { return numeral.visible; })) {
                        serialNumerals[dataId].number.visible = true;
                        serialNumerals[dataId].number.dollar.serialsChanging = false;
                        serialNumerals[dataId].number.dollar.serialsVisible = true;
                    }
                } else if (e.target.classList.contains("spirograph")) {
                    spirographs[dataId].visible = true;
                    if (spirographs[dataId].mask.spirographs.every(function(spirograph) { return (spirograph.visible); })) {
                        spirographs[dataId].mask.spirosVisible = true;
                        if (spirographs[dataId].mask.svg.dollar.svgs.every
                                (function(svg) { return ((svg.mask === null) || (svg.mask.spirographs.length == 0) || svg.mask.spirosVisible); })) {
                            spirographs[dataId].mask.svg.dollar.spirosChanging = false;
                            spirographs[dataId].mask.svg.dollar.spirosVisible = true;
                        }
                    }
                 } else if (e.target.classList.contains("washingtonBlink")) {
                    (function(svg) { setTimeout(function() { svg.blink(true); }, 15); })(svgs[dataId]);
                 } else if (e.target.classList.contains("svg")) {
                    svgs[dataId].mask = createMask(svgs[dataId]);
                    svgs[dataId].setGroupSize();
                    svgs[dataId].visible = true;
                    if (svgs[dataId].dollar.svgs.every(function(svg) { return svg.visible; })) {
                        svgs[dataId].dollar.svgsChanging = false;
                        svgs[dataId].dollar.svgsVisible = true;
                    }
               }
            } else if (e.target.style.opacity == 0) {
                if (e.target.classList.contains("dollarFrame")) {
                    dollars[dataId].visible = false;
                    dollars[dataId].delete();
                } else if (e.target.classList.contains("mask")) {
                    masks[dataId].visible = false;
                    masks[dataId].delete();
                } else if (e.target.classList.contains("serialNumeral")) {
                    serialNumerals[dataId].visible = false;
                    serialNumerals[dataId].delete();
                } else if (e.target.classList.contains("shadow")) {
                    e.target.parentNode.removeChild(e.target);
                    if (svgs[dataId]) {
                        svgs[dataId].shadowElement = null;
                    }
                } else if (e.target.classList.contains("spirograph")) {
                    spirographs[dataId].visible = false;
                    spirographs[dataId].delete();
                 } else if (e.target.classList.contains("washingtonBlink") && !svgs[dataId].dollar.deleting) {
                    (function(svg) { setTimeout(function() { svg.blink(); }, 3000 + (Math.random() * 6000)); })(svgs[dataId]);
                } else if (e.target.classList.contains("svg")) {
                    svgs[dataId].visible = false;
                    svgs[dataId].delete();
                }
            }
        }
    }, false);
    document.body.addEventListener("click", function(e) {
        if (e.target.parentNode.classList.contains("serialDigit")) {
            serialNumerals[e.target.parentNode.parentNode.getAttribute("data-id")].number.reset();
        }
    }, false);
}
function proportionElements() {
	var	dollarHeight = dollarRoot.clientHeight
	,	dollarWidth = dollarRoot.clientWidth
	;
    screenHeight = document.documentElement.clientHeight;
    screenWidth = document.documentElement.clientWidth;
	if (screenHeight > screenWidth) {
		dollarScale = Math.min(screenWidth/dollarHeight,screenHeight/dollarWidth) * 0.70;
	} else {
		dollarScale = Math.min(screenHeight/dollarHeight,screenWidth/dollarWidth) * 0.70;
	}
    dollars.forEach(function(dollar) {
        if (dollar.visible) {
            dollar.delete();
        }
    });
}
function animationLoop(ts) {
    var currentAction = null
    ,   sortedSvgs = []
    ;
    if (actions.length) {
        do {
            currentAction = actions.shift();
            if ((currentAction.action == "animate") && currentAction.element.style) {
                //console.log(Date.now() + ": " + currentAction.action + " " + currentAction.element.id + " " +
                    //currentAction.style + "  " + currentAction.value);
                if (currentAction.transition) {
                    currentAction.element.style.transition = currentAction.transition;
                }
                currentAction.element.style[currentAction.style] = currentAction.value;
            } else if (currentAction.action == "addClass") {
                currentAction.element.classList.add(currentAction.value);
            } else if (currentAction.action == "removeClass") {
                currentAction.element.classList.remove(currentAction.value);
            } else if (currentAction.action == "load") {
                currentAction.object.load();
            } else if (currentAction.action == "display") {
                currentAction.object.display();
            }
        } while (currentAction.continued)
    }
    if (dollars.length) {
        dollars.forEach(function(dollar) {
            if (!dollar.visible) {
                if (!dollar.frameChanging && !dollar.frameVisible) {
                    dollar.frameChanging = true;
                    dollar.display();
                } else if (!dollar.svgsChanging && !dollar.svgsVisible) {
                    dollar.svgsChanging = true;
                    dollar.svgs.forEach(function(svg) {
                        sortedSvgs.push(svg);
                    })
                    sortedSvgs.sort(function(a, b) { return b.order - a.order; });
                    sortedSvgs.forEach(function(sortedSvg) {
                        actions.push({ action: "load", object: sortedSvg });
                        sortedSvgs.loading = true;
                    })
                } else if (dollar.svgsVisible && !dollar.masksChanging && !dollar.masksVisible) {
                    dollar.masksChanging = true;
                    dollar.svgs.forEach(function(svg) {
                        if (svg.mask) {
                            actions.push({ action: "display", object: svg.mask });
                        }
                    });
                } else if (dollar.masksVisible && !dollar.spirosChanging && !dollar.spirosVisible) {
                    dollar.spirosChanging = true;
                    dollar.svgs.forEach(function(svg) {
                        if (svg.mask && svg.mask.spirographs.length) {
                            svg.mask.spirographs.forEach(function(spirograph) {
                                actions.push({ action: "display", object: spirograph });
                            });
                        }
                    });
                } else if (dollar.spirosVisible && !dollar.serialsChanging && !dollar.serialsVisible) {
                    dollar.serialsChanging = true;
                    dollar.serialNumber.display();
                } else if (dollar.serialsVisible) {
                    dollar.svgs.forEach(function(svg) {
                        svg.setUpEvents();
                    });
                    dollar.visible = true;
                    dollar.move();
                    dollar.blinkSvg.blink();
                }
            } else if (dollar.deleting) {
                if (dollar.serialsVisible && !dollar.serialsChanging) {
                    dollar.serialNumber.numerals.forEach(function(numeral) {
                        numeral.delete();
                    });
                    dollar.serialsChanging = true;
                } else if (!dollar.serialsVisible && dollar.spirosVisible && !dollar.spirosChanging) {
                    dollar.svgs.forEach(function(svg) {
                        if (svg.mask && svg.mask.spirographs.length) {
                            svg.mask.spirographs.forEach(function(spirograph) {
                                spirograph.delete();
                            });
                        }
                    });
                    dollar.spirosChanging = true;
                } else if (!dollar.spirosVisible && dollar.masksVisible && !dollar.masksChanging) {
                    dollar.svgs.forEach(function(svg) {
                        if (svg.mask) {
                            svg.mask.delete();
                        }
                    });
                    dollar.blinkSvg.blink();
                    dollar.masksChanging = true;
                } else if (!dollar.masksVisible && dollar.svgsVisible && !dollar.svgsChanging) {
                    dollar.svgs.forEach(function(svg) {
                        svg.delete();
                    });
                    dollar.svgsChanging = true;
                } else if (!dollar.svgsVisible) {
                    dollar.delete();
                    //dollar = createDollar();
                    //dollar = nextDollar;
                }
            } else if (dollar.visible && !dollar.moving && !dollar.serialNumber.moving &&
                    dollar.svgs.every(function(svg) { return !svg.moving; })) {
                dollar.currentStepCount++;
                dollar.lowestSvgZOffset = perspective;
                dollar.svgs.forEach(function(svg) {
                    if (svg.active) {
                        dollar.lowestSvgZOffset = Math.min(dollar.lowestSvgZOffset, svg.zOffset);
                    }
                });
                dollar.move();
            } else if (dollar.timeoutFlag) {
                //console.log(Date.now() + " timeout");
                dollar.delete();
            }
        });
    } else {
        createDollar();
    }
	animationId = requestAnimFrame(animationLoop);
}
initialize();
})();
