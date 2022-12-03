(function() {
"use strict";

const displayRoot = document.querySelector("#displayRoot")
;
let display = null
,   animationId = null
,   priorTimestamp = 0
,   priorForward = null
;
window.onload = function() {
    animationId = window.requestAnimationFrame(animationLoop);
}
window.onresize = function() {
    if (display) {
        display.addTask(display, display.refresh);
    }
}
function createDisplay() {
    const visibleDistance = 2000
    ,   visibleScale = 1
    ,   redrawPeriod = 100
    ,   Display = function() {
            this.element = displayRoot;
            this.height = this.element.clientHeight;
            this.width = this.element.clientWidth;
            this.tasks = [];
            const holeDensity = 10 + Math.floor(5 * Math.random());
            this.sectionWidth = 2 * Math.round(Math.min(this.width, this.height)/holeDensity); //**ensure even
            document.body.style.setProperty("--sectionWidth", this.sectionWidth + "px");
            this.pattern = new Pattern(this);
            const velocity = 0.03 + (0.02 * Math.random());
            this.period = visibleDistance/velocity;
            this.fadeFactor = 0.2;
            this.forwards = priorForward = ((priorForward != null) ? !priorForward : (Math.random() < 0.7));
            this.trails = [];
            this.sheets = [];
            this.sheets.push(new Sheet(this).initialize().attachMap());
            this.burns = [];
            this.element.style.setProperty("--displayBackgroundPeriod", (this.fadeFactor * this.period) + "ms");
        }
    ,   Bridge = function(section, quadrant, bridgeSection) {
            this.section = section;
            this.quadrant = quadrant;
            this.bridgeSection = bridgeSection;
        }
    ,   Burn = function(section) {
            this.section = section;
            this.sheet = this.section.pattern.mappedSheet;
            this.radius = (this.section.pattern.dotDiameter - this.section.pattern.burnElement.width)/2;
            this.duration = redrawPeriod;
        }
    ,   Pattern = function(display) {
            this.display = display;
            this.element = document.querySelector("#patternRoot");
            this.context = this.element.getContext('2d');
            this.rowsColumns = visibleScale * Math.ceil(Math.sqrt(Math.pow(this.display.height, 2) + Math.pow(this.display.width, 2))/this.display.sectionWidth);
            this.rowsColumns += (this.rowsColumns + 1) % 2; //**force odd count
            document.body.style.setProperty("--patternWidth", (this.rowsColumns * this.display.sectionWidth) + "px");
            this.element.width = this.element.height = this.element.clientWidth;
            this.screenCenter = this.element.width/2
            this.dotElement = document.querySelector("#dotRoot");
            this.dotContext = this.dotElement.getContext('2d');
            this.dotElement.width = this.dotElement.height = this.dotElement.clientWidth;
            this.mapElement = this.display.element.appendChild(document.querySelector("#mapRoot").cloneNode(true));
            this.sections = [];
            for (let row = 1; row < (this.rowsColumns - 1); row++) {
                for (let column = 1; column < (this.rowsColumns - 1); column++) {
                    this.sections.push(new Section(this, row, column));
                }
            }
            this.centerSection = this.sections[Math.floor(this.sections.length/2)];
            this.context.fillRect(0, 0, this.element.width, this.element.height);
            const holePercent = 0.7 + (0.2 * Math.random());
            this.dotDiameter = 2 * Math.round(this.display.sectionWidth * holePercent/2); //**ensure even
            let gapWidth = this.display.sectionWidth - this.dotDiameter;
            document.body.style.setProperty("--gapWidth", gapWidth + "px");
            this.maxDotRadius = 0.7 * gapWidth/2;
            this.minDotRadius = Math.max(4, 0.3 * this.maxDotRadius);
            this.sectionRadius = this.display.sectionWidth/2;
            this.dotContext.arc(this.sectionRadius, this.sectionRadius, this.dotDiameter/2, 0, 2 * Math.PI);
            this.dotContext.fill();
            this.context.fillStyle = this.context.createPattern(this.dotContext.canvas, "repeat");
            this.context.globalCompositeOperation = "destination-out";
            this.context.fillRect(0, 0, this.element.width, this.element.height);
            this.burnElement = document.querySelector("#burn");
            this.burnElement.width = this.burnElement.height = this.burnElement.clientWidth;
            this.burnContext = this.burnElement.getContext('2d');
            this.burnRadius = this.burnElement.width/2;
            let gradient = this.burnContext.createRadialGradient(this.burnRadius, this.burnRadius, 0, this.burnRadius, this.burnRadius, this.burnRadius);
            gradient.addColorStop(0, "hsla(0, 0%, 0%, 0.5)");
            gradient.addColorStop(0.8, "black");
            gradient.addColorStop(1, "red");
            this.burnContext.fillStyle = gradient;
            this.burnContext.arc(this.burnRadius, this.burnRadius, this.burnRadius, 0, 2 * Math.PI);
            this.burnContext.fill();
            this.maskElement = document.querySelector("#mask");
            this.maskElement.width = this.maskElement.height = this.maskElement.clientWidth;
            this.maskContext = this.maskElement.getContext('2d');
            gradient = this.maskContext.createRadialGradient(this.burnRadius, this.burnRadius, 0, this.burnRadius, this.burnRadius, this.burnRadius);
            gradient.addColorStop(0, "hsla(0, 0%, 0%, 0.7)");
            gradient.addColorStop(0.7, "hsla(0, 0%, 0%, 0.7)");
            gradient.addColorStop(1, "transparent");
            this.maskContext.fillStyle = gradient;
            this.maskContext.arc(this.burnRadius, this.burnRadius, this.burnRadius, 0, 2 * Math.PI);
            this.maskContext.fill();
        }
    ,   Section = function(pattern, row, column) {
            this.pattern = pattern;
            const width = this.pattern.display.sectionWidth
            ;
            this.id = this.pattern.sections.length;
            this.element = this.id ? this.pattern.mapElement.appendChild(document.querySelector("#section0").cloneNode(false)) : document.querySelector(".sections");
            this.element.id = "section" + this.id;
            this.element.setAttribute("data-id",this.id);
            this.centerX = ((column + 0.5) * width);
            this.centerY = ((row + 0.5) * width);
            this.element.style.setProperty("--sectionLeft", (this.centerX - this.pattern.screenCenter) + "px");
            this.element.style.setProperty("--sectionTop", (this.centerY - this.pattern.screenCenter) + "px");
            this.bridges = [];
            const inset = this.pattern.rowsColumns - 2;
            if (row > 1) {
                this.bridges.push(new Bridge(this, 3, this.pattern.sections[this.id - inset]));
                this.pattern.sections[this.id - inset].bridges.push(new Bridge(this.pattern.sections[this.id - inset], 1, this));
            }
            if (column > 1) {
                this.bridges.push(new Bridge(this, 2, this.pattern.sections[this.id - 1]));
                this.pattern.sections[this.id - 1].bridges.push(new Bridge(this.pattern.sections[this.id - 1], 0, this));
            }
            this.row = row;
            this.column = column;
        }
    ,   Sheet = function(display) {
            this.display = display;
            this.id = this.display.sheets.length;
            this.frameElement = this.display.element.appendChild(document.querySelector("#frameRoot").cloneNode(true));
            this.frameElement.id = "frame" + this.id;
            this.frameElement.setAttribute("data-id",this.id);
            this.frameElement.style.setProperty("--framesOpacity", 0);
            this.element = this.frameElement.querySelector(".sheets");
            this.element.id = "sheet" + this.id;
            this.patternElement = this.element.appendChild(this.display.pattern.element.cloneNode(false));
            this.patternElement.id = "pattern" + this.id;
            this.context = this.patternElement.getContext('2d');
            this.resetFrame();
            this.resetSheet(true);
        }
    ,   Task = function(object, action, parameters) {
            this.object = object;
            this.action = action;
            this.parameters = parameters || null;
        }
    ,   Trail = function(display) {
            this.display = display;
            this.id = this.display.trails.length;
            this.element = this.display.element.appendChild(this.display.pattern.dotElement.cloneNode(false));
            this.element.id = "dots" + this.id;
            this.element.width = this.element.height = this.element.clientWidth;
            this.context = this.element.getContext('2d');
        }
    ;
    Display.prototype = {
        addTask: function(object, action, parameters) {
            this.tasks.push(new Task(object, action, parameters));
        }
    ,   availableTrail: function() {
            let newTrail = null;
            if (!this.trails.some(function(trail) {
                if (!trail.active) {
                    return ((newTrail = trail), true);
                }
            })) {
                this.trails.push(new Trail(this));
                newTrail = this.trails[this.trails.length - 1];
            };
            return newTrail;
        }
    ,   refresh: function() {
            this.element.style.setProperty("--displayBackgroundPeriod", null);
            this.element.style.setProperty("--altBackgroundOpacity", 0);
            this.pattern.mapElement.parentNode.removeChild(this.pattern.mapElement);
            this.trails.forEach(function(trail) {
                this.element.removeChild(trail.element);
            }, this);
            this.sheets.forEach(function(sheet) {
                this.element.removeChild(sheet.frameElement);
            }, this);
            display = null;
        }
    ,   draw: function(interval) {
            let currentSheet = this.firstSheet;
            while (currentSheet) {
                if (currentSheet.active) {
                    currentSheet.draw(interval);
                }
                currentSheet = currentSheet.nextSheet
            }
            this.trails.forEach(function(trail) {
                if (trail.active) {
                    trail.draw(interval);
                }
            });
            this.burns.forEach(function(burn) {
                if (burn.section.burnActive) {
                    burn.draw(interval);
                }
            });
        }
    }
    Burn.prototype = {
        draw: function(interval) {
            this.duration += interval;
            if (this.duration > redrawPeriod) {
                this.duration -= redrawPeriod;
                let angle = 0;
                for (let i = 0; i < this.radius/this.section.pattern.burnRadius; i++) {
                    this.sheet.context.globalCompositeOperation = "source-atop";
                    this.sheet.context.drawImage(this.section.pattern.burnElement, this.section.centerX + (this.radius * Math.cos(angle)) - this.section.pattern.burnRadius, this.section.centerY + (this.radius * Math.sin(angle)) - this.section.pattern.burnRadius);
                    this.sheet.context.globalCompositeOperation = "destination-out";
                    angle = 2 * Math.PI * Math.random();
                    this.sheet.context.drawImage(this.section.pattern.maskElement, this.section.centerX + (this.radius * Math.cos(angle)) - this.section.pattern.burnRadius, this.section.centerY + (this.radius * Math.sin(angle)) - this.section.pattern.burnRadius);
                }
                this.radius += 0.2;
            }
        }
    }
    Section.prototype = {
        setBurn: function(activity) {
            if (activity == null) {
                this.burnActive = this.permanent = !(this.burnActive && this.permanent);
            } else if (!this.permanent) {
                this.burnActive = !this.burnActive
            }
            if (this.burnActive) {
                if (!this.pattern.display.burns.some(function(burn) {
                    return burn.section.id == this.id;
                }, this)) {
                    this.pattern.display.burns.push(new Burn(this));
                };
            }
        }
    }
    Sheet.prototype = {
        attachMap: function() {
            this.element.appendChild(this.display.pattern.mapElement);
            this.display.pattern.mappedSheet = this;
            this.display.burns = [];
            return this;
        }
    ,   draw: function(interval) {
            this.duration += interval;
            const scaleFactor = Math.min(this.duration, this.display.period - 1)/this.display.period;
            this.element.style.setProperty("--sheetsScale", "scale(" + 1/(visibleScale * (this.display.forwards ? (1 - scaleFactor) : scaleFactor)) + ")");
            if (!this.frameRotating) {
                this.frameElement.style.setProperty("--framesRotate", "rotate(" + (this.display.forwards ? (((Math.random() < 0.5) ? -1 : 1) * Math.PI) : 0) + "rad)");
                this.frameRotating = true;
            } else if (!this.sheetsVisible) {
                this.element.style.setProperty("--sheetsVisibility", "visible");
                this.sheetsVisible = true;
            } else if (!this.frameFading && (this.duration > this.fadePeriod) && (this.display.backgroundTransitionSheet == null)) {
                this.frameElement.style.setProperty("--framesOpacity", this.display.forwards ? 1 : 0);
                this.frameFading = true;
                const hue = this.hue + this.hueIncrement
                ,   startLuminosity = this.luminosity + ((this.luminosity > 50) ? -40 : 40)
                ,   endLuminosity = this.luminosity + ((this.luminosity > 50) ? -10 : 10)
                ,   angle = ((Math.random() < 0.5) ? -1 : 1) * Math.random() * Math.PI/4
                ,   background = "linear-gradient(" + angle + "rad, hsl(" + hue + ", 30%, " + startLuminosity + "%), hsl(" + hue + ", 10%," + endLuminosity + "%)"
                this.display.altBackgroundActive = !this.display.altBackgroundActive;
                if (this.display.altBackgroundActive) {
                    this.display.element.style.setProperty("--altBackground", background);
                    this.display.element.style.setProperty("--altBackgroundOpacity", 1);
                } else {
                    this.display.element.style.setProperty("--displayBackground", background);
                    this.display.element.style.setProperty("--altBackgroundOpacity", 0);
                }
                this.display.backgroundTransitionSheet = this.id;
            } else if (!this.spawning && (this.duration > this.spawnPeriod)) {
                let newSheet = null
                if (!this.display.sheets.some(function(sheet) {
                    if (!sheet.active) {
                        return ((newSheet = sheet), true);
                    }
                }, this)) {
                    this.display.sheets.push(new Sheet(this.display))
                    newSheet = this.display.sheets[this.display.sheets.length - 1];
                };
                this.display.addTask(newSheet, newSheet.initialize, [this]);
                if (!this.display.forwards) {
                    this.display.addTask(newSheet, newSheet.attachMap);
                }
                this.spawning = true;
            } else if (this.frameRotationComplete && this.frameFadeComplete && this.backgroundFadeComplete && !this.frameResetting) {
                this.element.style.setProperty("--sheetsVisibility", "hidden");
                this.frameElement.style.setProperty("--transitionPeriod", null);
                this.frameElement.style.setProperty("--framesOpacityPeriod", null);
                this.display.addTask(this, this.resetFrame);
                this.frameResetting = true;
            } else if (!this.prevSheet && this.frameResetComplete) {
                this.display.addTask(this, this.resetSheet);
                if (this.display.forwards) {
                    this.display.addTask(this.nextSheet, this.nextSheet.attachMap);
                }
            }
            this.redrawDuration += interval;
            if (this.redrawDuration > redrawPeriod) {
                this.redrawDuration %= redrawPeriod;
                this.context.globalCompositeOperation = "source-atop";
                this.context.globalAlpha = 0.05;
                this.context.fillRect(0, 0, this.patternElement.width, this.patternElement.height);
                this.context.globalAlpha = 1;
            }
        }
    ,   initialize: function(prevSheet) {
            this.active = true;
            this.target = this.display.pattern.sections[Math.floor(this.display.pattern.sections.length * Math.random())];
            this.frameElement.style.setProperty("--framesTransformOriginX", (this.display.pattern.screenCenter - this.target.centerX)/(visibleScale * 2) + "px");
            this.frameElement.style.setProperty("--framesTransformOriginY", (this.display.pattern.screenCenter - this.target.centerY)/(visibleScale * 2) + "px");
            this.frameElement.style.setProperty("--transitionPeriod", this.display.period + "ms");
            this.frameElement.style.setProperty("--framesOpacityPeriod", (this.display.period * this.display.fadeFactor) + "ms");
            this.prevSheet = prevSheet || null;
            if (this.prevSheet) {
                this.nextSheet = this.prevSheet.nextSheet || null;
                this.prevSheet.nextSheet = this;
                this.zIndex = this.prevSheet.zIndex + (this.display.forwards ? -1 : 1);
                this.hue = this.prevSheet.hue - this.prevSheet.hueIncrement;
            } else {
                this.display.firstSheet = this;
                this.zIndex = this.display.forwards ? 1000 : 2;
                this.hue = 360 * Math.random();
            }
            this.hueIncrement = ((Math.random() < 0.5) ? -1 : 1) * (30 + (60 * Math.random()));
            this.frameElement.style.setProperty("--framesZIndex", this.zIndex);
            this.element.style.setProperty("--sheetsRotate", "rotate(" + (Math.PI * Math.random()/2) + "rad)");
            this.luminosity = 30 + (40 * Math.random());
            let gradient = this.context.createRadialGradient(this.display.pattern.screenCenter, this.display.pattern.screenCenter, 0, this.display.pattern.screenCenter, this.display.pattern.screenCenter, this.patternElement.width);
            gradient.addColorStop(0, "hsl(" + this.hue + ", 100%, " + this.luminosity + "%)")
            gradient.addColorStop(0.5, "hsl(" + this.hue + ", 0%, " + this.luminosity + "%)")
            gradient.addColorStop(1, "hsl(" + this.hue + ", 0%, " + this.luminosity + "%)")
            this.context.fillStyle = gradient;
            this.context.globalCompositeOperation = "source-atop";
            this.context.fillRect(0, 0, this.patternElement.width, this.patternElement.height);
            this.activeTrails = 0;
            this.display.availableTrail().initialize(this);
            this.duration = this.redrawDuration = 0;
            this.spawnPeriod = this.display.period * (this.display.fadeFactor + (0.2 * Math.random()));
            this.fadePeriod = this.display.forwards ? 0 : (this.display.period * (1 - this.display.fadeFactor));
            this.frameRotating = this.frameRotationComplete = false;
            this.frameFading = this.frameFadeComplete = false;
            this.frameResetting = this.frameResetComplete = false;
            this.backgroundFadeComplete = false;
            this.spawning = false;
            return this;
        }
    ,   resetFrame: function(initial) {
            this.frameElement.style.setProperty("--framesRotate", "rotate(" + (this.display.forwards ? 0 : (((Math.random() < 0.5) ? -1 : 1) * Math.PI)) + "rad)");
            this.frameElement.style.setProperty("--framesOpacity", this.display.forwards ? 0 : 1);
            this.frameResetComplete = true;
        }
    ,   resetSheet: function(initial) {
            this.active = false;
            this.sheetsVisible = false;
            this.context.globalCompositeOperation = "source-over";
            this.context.clearRect(0, 0, this.patternElement.width, this.patternElement.height);
            this.context.drawImage(this.display.pattern.element, 0, 0);
            if (this.nextSheet && (this.zIndex >= 2) && (this.zIndex <= 1000)) {
                this.nextSheet.prevSheet = null;
                this.display.firstSheet = this.nextSheet;
            } else if (!initial) {
                this.display.addTask(this.display, this.display.refresh);
            }
            this.display.trails.forEach(function(trail) {
                if (trail.sheet.id == this.id) {
                    trail.active = false;
                }
            }, this);
            this.nextSheet = this.prevSheet = null;
        }
    }
    Trail.prototype = {
        draw: function(interval) {
            const completion = (Math.max(this.drawTravel, this.travel)/this.fullTravel)
            ,   periodFactor = (completion < 0.2) ? 1 + Math.pow(completion, 2)/0.01 : 5 - ((completion - 0.3)/0.175)
            ;
            this.drawTravel += Math.max(this.minVelocity, periodFactor * this.velocity) * interval;
            if (this.drawTravel > this.angleIncrement) {
                this.drawTravel %= this.angleIncrement;
                this.travel += this.angleIncrement;
                this.angle += (this.clockwise ? 1 : -1) * this.angleIncrement;
                this.sheet.context.globalCompositeOperation = "source-atop";
                this.sheet.context.drawImage(this.element, this.section.centerX + (this.sheet.display.pattern.sectionRadius * Math.cos(this.angle)) - this.radius, this.section.centerY + (this.sheet.display.pattern.sectionRadius * Math.sin(this.angle)) - this.radius);
                if (this.travel > this.fullTravel) {
                    this.initialize();
                    return;
                }
            }
        }
    ,   initialize: function(sheet, section, parent) {
            if (this.active) {
                const random = Math.random()
                if (random < (0.3/this.sheet.activeTrails)) {
                    this.display.availableTrail().initialize(this.sheet, this.section, this);
                } else if ((random * this.sheet.activeTrails) > 9) {
                    this.active = false;
                    this.sheet.activeTrails--;
                    return this;
                }
                this.section = this.nextSection;
                this.startQuadrant = (this.endQuadrant + 2) % 4;
                this.saturation -= 8;
                this.clockwise = !this.clockwise;
            } else {
                this.active = true;
                this.sheet = sheet;
                this.sheet.activeTrails++;
                this.section = section || this.display.pattern.centerSection;
                this.hue = parent ? parent.hue : (this.sheet.hue - this.sheet.hueIncrement);
                this.saturation = parent ? parent.saturation : 100;
                this.luminosity = parent ? parent.luminosity : this.sheet.luminosity + ((this.sheet.luminosity > 50) ? -40 : 40);
                this.startQuadrant = parent ? parent.endQuadrant : Math.floor(4 * Math.random());
                this.radius = parent ? parent.radius : (this.display.pattern.minDotRadius + ((this.display.pattern.maxDotRadius - this.display.pattern.minDotRadius) * Math.random()));
                this.clockwise = parent ? parent.clockwise : (Math.random() < 0.5);
            }
            const bridge = this.section.bridges[Math.floor(this.section.bridges.length * Math.random())];
            this.nextSection = bridge.bridgeSection;
            this.endQuadrant = bridge.quadrant;
            let quadrants = (4 + ((this.clockwise ? 1 : -1) * (this.endQuadrant - this.startQuadrant)) % 4) || 4
            this.fullTravel = quadrants * Math.PI/2;
            this.context.clearRect(0, 0, this.element.width, this.element.height);
            this.context.fillStyle = "hsl(" + this.hue + ", " + this.saturation + "%, " + this.luminosity + "%)";
            this.context.beginPath();
            this.context.arc(this.radius, this.radius, this.radius, 0, 2 * Math.PI);
            this.context.fill();
            this.angle = this.startQuadrant * Math.PI/2;
            this.angleIncrement = 2 * this.radius/this.display.pattern.sectionRadius;
            this.velocity = 0.001;
            this.minVelocity = this.velocity/25;
            this.travel = this.drawTravel = 0;
            return this;
        }
    }
    return new Display();
}
function initialize() {
    displayRoot.addEventListener("click", function(e) {
        if (e.target.classList.contains("sections")) {
            display.pattern.sections[e.target.getAttribute("data-id")].setBurn();
        }
    }, false);
    displayRoot.addEventListener("transitionend", function(e) {
        const dataId = e.target.getAttribute("data-id");
        if (e.target.classList.contains("frames")) {
            if (e.propertyName == "transform") {
                display.sheets[dataId].frameRotationComplete = true;
            } else if (e.propertyName == "opacity") {
                display.sheets[dataId].frameFadeComplete = true;
            }
        } else if ((e.propertyName == "opacity") && e.target.classList.contains("sections")) {
            display.pattern.sections[dataId].setBurn(getComputedStyle(e.target).getPropertyValue("opacity") == "1");
        } else if ((e.propertyName == "opacity") && (e.target.id == "altBackground") && (display.backgroundTransitionSheet != null)) {
            display.sheets[display.backgroundTransitionSheet].backgroundFadeComplete = true;
            display.backgroundTransitionSheet = null;
        }
    }, false);
}
function animationLoop(ts) {
    let interval = ts - priorTimestamp
    ,   currentTask = null
    ;
    if (display) {
        if (display.tasks.length) {
            currentTask = display.tasks.shift();
            currentTask.action.apply(currentTask.object, currentTask.parameters);
        } else {
            display.draw(interval);
        }
    } else {
        display = createDisplay();
    }
    priorTimestamp = ts;
	animationId = window.requestAnimationFrame(animationLoop);
}
initialize();
})();
