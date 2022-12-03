(function() {
"use strict";

var canvasRoot = document.querySelector(".canvas")
,	traintick = document.querySelector("#clickclack")
,   animationId = null
,   priorTimestamp = 0
,   display = null
;
window.onload = function() {
    var shade = document.querySelector("#shade")
    ;
    display = createDisplay();
    animationId = window.requestAnimationFrame(animationLoop);
    shade.style.opacity = 0;
}
window.onresize = function() {
    display = createDisplay();
}
function createBird(flock) {
    var Bird = function(flock) {
            this.flock = flock;
            this.id = this.flock.birds.length;
            if (this.id) {
                this.leader = this.flock.birds[this.id - 1];
            } else {
                this.flock.leader = this;
                this.leader = null;
            }
            this.motion = new Motion(this);
            this.position = null;
            this.wingsUp = true;
            this.wingBeatDuration = 0;
            this.beatPeriod = 500 + Math.floor(Math.random() * 200);
        }
    ,   Motion = function(bird) {
            this.bird = bird;
            this.startX = this.bird.motion ? this.bird.motion.endX : this.bird.id ? (-30 + Math.floor(Math.random() * 70)) : 0;
            this.endX = this.bird.id ? -30 + Math.floor(Math.random() * 70) : 0;
            this.moveX = this.endX - this.startX;
            this.startY = this.bird.motion ? this.bird.motion.endY : this.bird.id ? (-30 + Math.floor(Math.random() * 70)) : 0;
            this.endY = this.bird.id ? -30 + Math.floor(Math.random() * 70) : 0;
            this.moveY = this.endY - this.startY;
            this.period = 5000 + (Math.random() * 5000);
            this.duration = 0;
        }
    ;
    Bird.prototype = {
        draw: function(interval) {
            var scaledSegment = Math.round(3 * this.flock.width * this.flock.scale)
            ;
            this.position = this.motion.position(interval)
            if (this.flock.motion.advancing) {
                this.wingBeatDuration += interval;
                if (this.wingBeatDuration > this.beatPeriod) {
                    this.wingsUp = !this.wingsUp;
                    this.wingBeatDuration = (this.wingBeatDuration % this.beatPeriod) + (this.wingsUp ? 0 : this.beatPeriod/2);
                }
                if (this.wingsUp) {
                    this.flock.view.context.drawImage(this.flock.element, 288, 0, this.flock.width, this.flock.width, this.position.x, this.position.y, scaledSegment, scaledSegment);
                } else {
                    this.flock.view.context.drawImage(this.flock.element, 144, 0, this.flock.width, this.flock.width, this.position.x, this.position.y, scaledSegment, scaledSegment);
                }
            } else {
                this.flock.view.context.drawImage(this.flock.element, 288, 0, this.flock.width, this.flock.width, this.position.x, this.position.y, scaledSegment, scaledSegment);
            }
            return ((this.position.x > this.flock.view.width) || (this.position.y < 0))
        }
    }
    Motion.prototype = {
        position: function(interval) {
            var position = this.bird.leader ? this.bird.leader.position : this.bird.flock.position
            ,   motionFactor = 0
            ;
            if (this.bird.leader) {
                this.duration += interval;
                if (this.duration < (this.period/2)) {
                    motionFactor = 2 * Math.pow(this.duration/this.period, 2);
                    position.x += this.startX + (this.moveX * motionFactor);
                    position.y += this.startY + (this.moveY * motionFactor);
                } else if (this.duration < this.period){
                    motionFactor = 2 * Math.pow((this.period - this.duration)/this.period, 2);
                    position.x += this.endX - (this.moveX * motionFactor);
                    position.y += this.endY - (this.moveY * motionFactor);
                } else {
                    interval = this.duration - this.period;
                    this.bird.motion = new Motion(this.bird);
                    position = this.bird.motion.position(interval);
                }
            }
            return {x: Math.round(position.x), y: Math.round(position.y)};
        }
    }
    return new Bird(flock);
}
function createCompartment(display) {
    var Compartment = function(display) {
            this.display = display;
            this.element = document.querySelector("#compartment")
            this.boundingRect = this.element.getBoundingClientRect();
            this.window = new Window(this);
            this.dial = new Dial(this);
            this.window.drawDialShadow();
            this.overlay = new Overlay(this);
            this.chain = new Chain(this);
            this.rockForwards = true;
            this.rock();
        }
    ,   Chain = function(compartment) {
            var positionX = Math.round(compartment.dial.centerX + (0.4 * compartment.dial.width))
            ,   positionY = compartment.dial.centerY
            ,   length = Math.round(compartment.element.clientHeight - (1.1 * compartment.dial.centerY))
            ,   chainlink = document.querySelector("#chainlink")
            ,   pattern = null
            ;
            this.compartment = compartment;
            this.element = document.querySelector("#chain");
            this.element.style.left = positionX + "px";
            this.element.style.top = positionY + "px";
            this.element.style.height = length + "px";
            this.context = this.element.getContext("2d");
            this.context.imageSmoothingEnabled = false;
            this.element.width = this.element.clientWidth;
            this.element.height = this.element.clientHeight;
            this.color = "hsl(" + this.compartment.display.getRandomHue() + ", 30%, 30%)";
            this.shadow = "hsla(0, 0%, 0%, 0.2)";
            pattern = this.context.createPattern(chainlink, 'repeat-y');
            this.context.fillStyle = pattern;
            this.context.fillRect(0, 0, this.element.width, this.element.height);
        }
    ,   Dial = function(compartment) {
            var availableSpace = compartment.window.leftEdge
            ,   dialColors =
                [   "hsl(" + compartment.display.view.skyHues.blue + ", 100%, 50%)"
                ,   "hsl(" + compartment.display.view.skyHues.green + ", 100%, 50%)"
                ,   "hsl(" + compartment.display.view.skyHues.blue + ", 100%, 10%)"
                ,   "hsl(" + compartment.display.view.skyHues.red + ", 100%, 50%)" ]
            ;
            this.compartment = compartment;
            this.element = document.querySelector("#dial");
            this.width = Math.round(Math.max(0.2 * compartment.window.height, 1.5 * availableSpace));
            this.rotation = 0;
            this.element.style.width = this.element.style.height = this.width + "px";
            this.centerX = Math.round(availableSpace - (0.55 * this.width));
            this.element.style.left = this.centerX + "px";
            this.centerY = Math.round(this.centerX + (0.5 * this.width));
            this.element.style.top = this.centerY + "px";
            this.context = this.element.getContext("2d");
            this.context.imageSmoothingEnabled = false;
            this.element.width = this.element.clientWidth;
            this.element.height = this.element.clientHeight;
            this.context.translate(this.width/2, this.width/2);
            this.context.rotate(Math.PI/-4)
            for (var i = 0; i < 4; i++) {
                this.context.fillStyle = dialColors[i];
                this.context.fillRect(0, 0, this.width, this.width);
                this.context.rotate(Math.PI/2);
            }
            this.context.setTransform(1,0,0,1,0,0);
        }
    ,   Overlay = function(compartment) {
            var dialElement = compartment.dial.element
            ,   focusWidth = 2
            ,   reflectionX = Math.round(0.4 * compartment.dial.width)
            ,   reflectionWidth = Math.round(0.15 * compartment.dial.width)
            ,   shadowOffset = Math.round(0.1 * compartment.dial.width)
            ,   gradient = null
            ;
            this.compartment = compartment;
            this.element = document.querySelector("#overlay");
            this.element.style.left = this.compartment.dial.element.style.left;
            this.element.style.top = this.compartment.dial.element.style.top;
            this.context = this.element.getContext("2d");
            this.context.imageSmoothingEnabled = false;
            this.width = this.element.width = this.element.height = this.compartment.dial.element.width;
            this.context.translate(this.width/2, this.width/2);
            this.context.rotate(Math.PI/-4)
            this.context.beginPath();
            this.context.moveTo(0, 0);
            this.context.lineTo(this.width/2, 0);
            this.context.arc(0, 0, this.width/2, 0, Math.PI/2);
            this.context.closePath();
            this.context.lineWidth = focusWidth + 2;
            this.context.strokeStyle = "hsla(0, 0%, 0%, 0.3)";
            this.context.stroke();
            this.context.lineWidth = focusWidth;
            this.context.strokeStyle = "white";
            this.context.stroke();
            this.context.rotate(Math.PI/8)
            this.context.beginPath();
            this.context.moveTo(reflectionX, 0);
            this.context.arc(0, 0, reflectionX, 0, Math.PI/2);
            this.context.lineWidth = reflectionWidth;
            this.context.strokeStyle = "hsla(0, 0%, 100%, 0.3)";
            this.context.stroke();
            this.context.setTransform(1,0,0,1,0,0);
            gradient = this.context.createRadialGradient(this.width/2, this.width/2, 0, this.width/2, this.width/2, this.width/2);
            gradient.addColorStop(0, "hsla(0, 0%, 100%, 0)");
            gradient.addColorStop(0.8, "hsla(0, 0%, 100%, 0)");
            gradient.addColorStop(1, "hsla(0, 0%, 0%, 0.3)");
            this.context.fillStyle = gradient;
            this.context.fillRect(0, 0, this.width, this.width);
        }
    ,   Window = function(compartment) {
            var wallpaper = document.querySelector("#wallpaper")
            ,   pattern = null
            ,   compartmentHue = compartment.display.getRandomHue()
            ,   pad = Math.round(0.01 * Math.min(compartment.display.width, compartment.display.height))
            ,   viewRect = { left: Math.round(compartment.display.view.boundingRect.left - compartment.boundingRect.left), top: Math.round(compartment.display.view.boundingRect.top - compartment.boundingRect.top), right: Math.round(compartment.display.view.boundingRect.right - (compartment.boundingRect.left + (2 * pad))), bottom: Math.round(compartment.display.view.boundingRect.bottom - (compartment.boundingRect.top + (2 * pad))), width: Math.round(compartment.display.view.boundingRect.width), height: Math.round(compartment.display.view.boundingRect.height) }
            ,   arcRadius = 10 * pad
            ,   path = new Path2D()
            ;
            this.compartment = compartment;
            this.element = document.querySelector("#window");
            this.context = this.element.getContext("2d");
            this.context.imageSmoothingEnabled = false;
            this.width = this.element.width = this.element.clientWidth;
            this.height = this.element.height = this.element.clientHeight;
            pattern = this.context.createPattern(wallpaper, 'repeat');
            this.context.fillStyle = pattern;
            this.context.fillRect(0, 0, this.width, this.height);
            this.context.fillStyle = "hsla(" + compartmentHue + ", 30%, 35%, 0.9)";
            this.context.fillRect(0, 0, this.width, this.height);
            this.leftEdge = viewRect.left - (6 * pad);
            this.context.translate(this.leftEdge, viewRect.top - (6 * pad));
            this.context.fillStyle = "hsl(" + compartmentHue + ", 10%, 90%)";
            this.context.fillRect(0, 0, viewRect.width + (12 * pad), viewRect.height + (16 * pad));
            this.context.translate(3 * pad, 3 * pad);
            this.context.fillStyle = "hsl(" + compartmentHue + ", 10%, 80%)";
            this.context.fillRect(0, 0, viewRect.width + (6 * pad), viewRect.height + (6 * pad));
            this.context.translate(2 * pad, 2 * pad);
            this.context.fillStyle = "hsl(" + compartmentHue + ", 10%, 50%)";
            this.context.fillRect(0, 0, viewRect.width + (2 * pad), viewRect.height + (2 * pad));
            this.context.beginPath();
            this.context.moveTo(0, 0)
            this.context.lineTo(-2 * pad, -2 * pad)
            this.context.lineTo(viewRect.width + (4 * pad), -2 * pad)
            this.context.lineTo(viewRect.width + (2 * pad), 0)
            this.context.closePath();
            this.context.fill();
            this.context.fillStyle = "hsl(" + compartmentHue + ", 10%, 100%)";
            this.context.beginPath();
            this.context.moveTo(0, viewRect.height + (2 * pad))
            this.context.lineTo(-4 * pad, viewRect.height + (6 * pad))
            this.context.lineTo(viewRect.width + (6 * pad), viewRect.height + (6 * pad))
            this.context.lineTo(viewRect.width + (2 * pad), viewRect.height + (2 * pad))
            this.context.closePath();
            this.context.fill();
            this.context.translate(pad, pad);
            path.moveTo(arcRadius, 0);
            path.arcTo(viewRect.width, 0, viewRect.width, viewRect.height, arcRadius);
            path.arcTo(viewRect.width, viewRect.height, 0, viewRect.height, arcRadius);
            path.arcTo(0, viewRect.height, 0, 0, arcRadius);
            path.arcTo(0, 0, viewRect.width, 0, arcRadius);
            path.closePath();
            this.context.globalCompositeOperation = "destination-out"
            this.context.fill(path);
            this.context.globalCompositeOperation = "source-over"
            this.context.strokeStyle = "black";
            this.context.lineWidth = pad;
            this.context.stroke(path);
            this.context.translate(-5 * pad, viewRect.height + (5 * pad))
            this.context.fillStyle = "hsl(" + compartmentHue + ", 10%, 50%)";
            this.context.fillRect(0, 0, viewRect.width + (10 * pad), 4 * pad);
            this.context.setTransform(1,0,0,1,0,0);
        }
    ,   chainTimeout = null
    ;
    Compartment.prototype = {
        rock: function() {
            if (this.rockForwards) {
                this.element.style.transform = "rotate(0.1deg)";
                (function(chainElement) {
                    clearTimeout(chainTimeout);
                    chainTimeout = setTimeout(function() { chainElement.style.transform = "translate3d(-50%, 0%, 0) rotate(-0.3deg)"; }, 200);
                })(this.chain.element);
                traintick.play();
            } else {
                this.element.style.transform = "rotate(-0.1deg)";
                (function(chainElement) {
                    clearTimeout(chainTimeout);
                    chainTimeout = setTimeout(function() { chainElement.style.transform = "translate3d(-50%, 0%, 0) rotate(0.3deg)"; }, 200);
                })(this.chain.element);
                traintick.play();
            }
            this.rockForwards = !this.rockForwards;
        }
    }
    Window.prototype = {
        drawDialShadow: function() {
            this.context.translate(0.9 * this.compartment.dial.centerX, this.compartment.dial.centerY);
            this.context.beginPath();
            this.context.arc(0, 0, 0.52 * this.compartment.dial.width, 0, 2 * Math.PI);
            this.context.fillStyle = "hsla(0, 0%, 0%, 0.2)";
            this.context.fill()
            this.context.setTransform(1,0,0,1,0,0);
        }
    }
    return new Compartment(display);
}
function createDisplay() {
    var Display = function() {
            this.height = document.documentElement.clientHeight;
            this.width = document.documentElement.clientWidth;
            this.hueRanges = createHueRanges();
            this.emoji = createEmoji();
            this.view = createView(this);
            this.compartment = createCompartment(this);
        }
    ;
    Display.prototype = {
        draw: function(interval) {
            this.view.draw(interval);
        }
    ,   getRandomHue: function(targetHue) {
            var rangeIndex = targetHue || Math.floor(this.hueRanges.length * Math.random())
            ;
            return this.hueRanges[rangeIndex].startHue + ((this.hueRanges[rangeIndex].endHue - this.hueRanges[rangeIndex].startHue) * Math.random());
        }
    }
    return new Display();
}
function createEmoji() {
    var terrainRoot = document.querySelector("#terrainRoot")
    ,   context = terrainRoot.getContext("2d")
    ,   unicode = []
    ,   emoji = null
    ,   skipRanges =
        [   [0x1f4c0, 0x1f524]
        ,   [0x1f550, 0x1f56e]
        ,   [0x1f5a0, 0x1f5d3]
        ,   [0x1f600, 0x1f64e]
        ,   [0x1f6ab, 0x1f6c5]
        ,   [0x1f6f6, 0x1f93f]
        ,   [0x1f94c, 0x1f94f]
        ,   [0x1f95f, 0x1f97f]
        ,   [0x1f992, 0x1f992] ]
    ,   currentSkipRange = 0
    ;
    for (var i = 0x1f300; i < 0x1f992; i++) {
        if (i == skipRanges[currentSkipRange][0]) {
            i = skipRanges[currentSkipRange][1] + 1;
            currentSkipRange++;
        }
        emoji = String.fromCodePoint(i)
        if (context.measureText(emoji).width) {
            unicode.push(emoji);
        }
    }
    return unicode;
}
function createFlock(view) {
    var Flock = function(display) {
            var birdCount = 3 + Math.floor(Math.random())
            ;
            this.view = view;
            this.element = document.querySelector("#flyer");
            this.width = 144;
            this.terrain = this.view.terrains[3 + Math.floor(3 * Math.random())];
            this.terrain.flock = this;
            this.scale = this.view.windowDistance/this.terrain.distance;
            this.motion = new Motion(this);
            this.position = null;
            this.leader = null;
            this.birds = [];
            for (var i = 0; i < birdCount; i++) {
                this.birds.push(createBird(this));
            }
            this.lastShifted = 0;
        }
    ,   Motion = function(flock) {
            this.flock = flock;
            this.startX = flock.motion ? flock.motion.finalX : -100;
            this.endX = Math.max(-100, Math.min(flock.view.width + 100, this.startX + (flock.view.width * (0.3 - (0.5 * Math.random())))));
            this.moveX = this.endX - this.startX;
            this.startY = flock.motion ? flock.motion.finalY : (this.flock.terrain.tView.floor/3);
            this.endY =  (1 + Math.random()) * this.flock.terrain.tView.floor/3;
            this.moveY = this.endY - this.startY;
            this.advancePeriod = 5000 + (Math.random() * 5000);
            this.driftPeriod = this.advancePeriod * (1 + (Math.random() * 0.3));
            this.fullPeriod = this.advancePeriod + this.driftPeriod;
            this.driftX = -1 * flock.view.width * (0.1 + (Math.random() * 0.2));
            this.driftY = (1 + Math.random()) * this.flock.terrain.tView.floor/3;
            this.finalX = this.endX - this.driftX;
            this.finalY = this.endY - this.driftY;
            this.duration = 0;
            this.advancing = false;
        }
    ;
    Flock.prototype = {
        draw: function(interval) {
            var allBirdsOffscreen = true
            ;
            this.position = this.motion.position(interval)
            this.birds.forEach( function(bird) {
                allBirdsOffscreen = bird.draw(interval) && allBirdsOffscreen;
            }, this);
            if (allBirdsOffscreen) { this.shift(); }
        }
    ,   shift: function() {
            var fiveSecondsAgo = Date.now() - 5000
            ;
            if (this.lastShifted < fiveSecondsAgo) {
                this.terrain.flock = null;
                this.terrain = this.view.terrains[3 + Math.floor(4 * Math.random())];
                this.terrain.flock = this;
                this.scale = this.view.windowDistance/this.terrain.distance;
                this.lastShifted = Date.now();
                // console.log(Date.now() + ": shifting flock to terrain " + this.terrain.id);
            }
        }
    }
    Motion.prototype = {
        position: function(interval) {
            var position = {x: 0, y: 0}
            ,   motionFactor = 0
            ;
            this.duration += interval;
            if (this.duration < this.advancePeriod) {
                this.advancing = true;
                if (this.duration < (this.advancePeriod/2)) {
                    motionFactor = 2 * Math.pow(this.duration/this.advancePeriod, 2);
                    position.x = this.startX + (this.moveX * motionFactor);
                    position.y = this.startY + (this.moveY * motionFactor);
                } else {
                    motionFactor = 2 * Math.pow((this.advancePeriod - this.duration)/this.advancePeriod, 2);
                    position.x = this.endX - (this.moveX * motionFactor);
                    position.y = this.endY - (this.moveY * motionFactor);
                }
            } else if (this.duration < this.fullPeriod) {
                this.advancing = false;
                motionFactor = (this.duration - this.advancePeriod)/this.driftPeriod;
                position.x = this.endX - (this.driftX * motionFactor);
                position.y = this.endY - (this.driftY * motionFactor);
            } else {
                interval = this.duration - this.fullPeriod;
                this.flock.motion = new Motion(this.flock);
                position = this.flock.motion.position(interval);
            }
            return {x: position.x, y: position.y};
        }
    }
    return new Flock(view);
}
function createHueRanges() {
    var hueRanges = []
    ,   standardHues = [0, 30, 60, 120, 240, 270] // red, orange, yellow, green, blue, purple
    ,   HueRange = function(hue, index) {
            var highHue = 360
            ,   priorHue = index ? standardHues[index - 1] : (standardHues[standardHues.length - 1] - highHue)
            ,   nextHue = (index != (standardHues.length - 1)) ? standardHues[index + 1] : highHue
            ;
            this.startHue = (priorHue + hue)/2;
            this.endHue = (hue + nextHue)/2;
        }
    ;
    standardHues.forEach( function(hue, index) {
        hueRanges.push(new HueRange(hue, index));
    });
    return hueRanges;
}
function createLand(view) {
    var gradient = null
    ,   Land = function(view) {
        this.view = view;
        this.element = document.querySelector("#land");
        this.context = this.element.getContext("2d");
        this.context.imageSmoothingEnabled = false;
        this.element.style.top = Math.floor(this.view.boundingRect.top + this.view.horizon) + "px";
        this.element.width = this.element.clientWidth;
        this.element.height = Math.round(this.view.boundingRect.height - this.view.horizon);
        this.hue = this.view.display.getRandomHue();
        this.gradient = this.context.createLinearGradient(0, 0, 0, this.element.height);
        // this.gradient.addColorStop(0,"hsl(" + this.hue + ", 30%, 85%)");
        // this.gradient.addColorStop(1,"hsl(" + this.hue + ", 20%, 70%)");
        this.gradient.addColorStop(0,"hsl(" + this.hue + ", 20%, 70%)");
        this.gradient.addColorStop(1,"hsl(" + this.hue + ", 30%, 85%)");
        this.context.fillStyle = this.gradient;
    }
    Land.prototype = {
        redraw: function(overlay) {
            this.context.clearRect(0, 0, this.element.width, this.element.height);
            this.context.fillRect(0, 0, this.element.width, this.element.height);
            if (overlay) {
                this.context.save()
                this.context.fillStyle = overlay;
                this.context.fillRect(0, 0, this.element.width, this.element.height);
                this.context.restore()
            }
            return this;
        }
    }
    return new Land(view).redraw();
}
function createMap(view) {
    var Map = function(view) {
            this.view = view;
            this.mountainSaturation = 20 + (20 * Math.random());
            this.mountains = [];
            this.advanceMountains();
            this.plantTypes = [];
            for (var i = 0; i < 10; i++) {
                this.plantTypes.push(new PlantType(this));
            }
            this.depots = [];
            this.poleSeparation = 10000;
            this.poleTerrains = this.view.terrains.filter( function(terrain) {
                return ((terrain.scaleWidth > this.poleSeparation) && (terrain.scaleWidth < (5 * this.poleSeparation)));
            }, this);
            this.poleSets = [];
            this.advanceObjects();
        }
    ,   Building = function(depot, terrain, segmentWidth, coreRadius) {
            var radiusFactor = Math.pow(Math.random(), 2)
            ,   centerDistance = (Math.random() < 0.5 ? -0.5 : 0.5) * segmentWidth * radiusFactor
            ,   roofHeight = 0
            ,   sidePortion = 0.1 + (0.8 * Math.random())
            ;
            this.depot = depot;
            this.terrain = terrain;
            this.style = this.depot.buildingStyle;
            this.x = depot.centerX + centerDistance;
            this.yOffset = 0.5 * Math.random();
            this.storyCount = Math.ceil(((Math.abs(centerDistance) < coreRadius) ? depot.maxStories : 2) * Math.pow(Math.random(), 2));
            roofHeight = this.depot.map.view.baseBuildingHeight * ((this.storyCount < 4) ? (0.9 * Math.random()) : 0)
            this.height = (depot.map.view.baseBuildingHeight * this.storyCount) + roofHeight;
            this.width = depot.map.view.baseBuildingHeight * (1.5 + (2 * Math.random()));
            this.leftPortion = Math.random() < 0.5 ? sidePortion : (1 - sidePortion);
            this.rightPortion = 1 - this.leftPortion;
            this.leftGable = Math.random() < 0.5;
            this.storyHeight = Math.round(depot.map.view.baseBuildingHeight * terrain.scale);
            this.roofHeight = Math.round(roofHeight * terrain.scale);
            this.doorLeft = Math.random() < 0.5;
        }
    ,   BuildingStyle = function(depot) {
            this.depot = depot;
            this.palette = { baseHues: [this.depot.map.view.display.getRandomHue()] }
            this.palette.baseHues.push(this.palette.baseHues[0] + (10 + (20 * Math.random())));
            this.palette.baseHues.push(this.palette.baseHues[0] + (60 + (240 * Math.random())));
            this.palette.roof = this.depot.map.view.display.getRandomHue();
        }
    ,   Depot = function(map) {
            this.id = map.depots.length;
            this.map = map;
            this.name = "";
            for (var i = 0; i < 2; i++) {
                this.name += this.map.view.display.emoji[Math.floor(this.map.view.display.emoji.length * Math.random())];
            }
            this.name += townSuffixes[Math.floor(townSuffixes.length * Math.random())];
            this.urbanRadius = map.view.buildingDistanceLimit * (0.2 + (0.3 * Math.random()));
            this.coreRadius = this.urbanRadius * (0.2 * Math.random());
            this.centerDistance = this.urbanRadius * (0.5 + (0.3 * Math.random()));
            this.maxStories = this.map.view.maxStories * (0.5 + (0.5 * Math.random()));
            this.nextDepot = null;
            this.prevDepot = this.id ? map.depots[this.id - 1] : null;
            if (this.prevDepot) {
                this.prevDepot.nextDepot = this;
                this.startX = this.prevDepot.endX;
            } else {
                this.startX = map.view.lastNearTerrain.origin + this.urbanRadius;
            }
            this.centerX = this.startX + (this.urbanRadius * (1.5 + (0.5 * Math.random())));
            this.endX = this.centerX + this.urbanRadius;
            this.urbanDensity = 0.6 + (0.3 * Math.random());
            this.plantDensities = [this.prevDepot ? this.prevDepot.plantDensities[2] : (0.1 + (0.4 * Math.random())), 0.1 + (0.3 * Math.random()), 0.1 + (0.4 * Math.random())];
            // this.plantTypes = [this.prevDepot ? this.prevDepot.plantTypes[2] : new PlantType(this), new PlantType(this), new PlantType(this)];
            this.plantTypeSets = [new PlantTypeSet(this)];
            this.plantTypeSets.push(new PlantTypeSet(this));
            this.plantTypeSets.push(new PlantTypeSet(this));
            this.buildingStyle = new BuildingStyle(this);
        }
    ,   Mountain = function(map, terrain, leftMountain, rightMountain, height) {
            var xDifference = 0
            ;
            this.x = this.height = null;
            this.yOffset = 0;
            this.map = map;
            if (leftMountain && rightMountain) {
                xDifference = rightMountain.x - leftMountain.x;
                if (xDifference > leftMountain.width) {
                    this.x = leftMountain.x + (xDifference * (0.2 + (Math.random() * 0.6)));
                    this.height = Math.max(0, Math.min(terrain.maxHeight, (((leftMountain.height + rightMountain.height)/2) * (0.8 + (Math.random() * 0.4)))));
                    this.width = Math.max(this.height, (((leftMountain.width + rightMountain.width)/2) * (0.8 + (Math.random() * 0.4))));
                }
            } else {
                this.height = height;
                this.width = Math.max(10000, this.height * (1 + (1.5 * Math.random()) + (3 * (map.view.lastTerrain.farCount - terrain.farCount))));
                if (!leftMountain) {
                    this.x = terrain.origin - this.width;
                } else {
                    this.x = leftMountain.x + terrain.tView.scaleWidth;
                }
            }
            this.peakOffset = 0.3 + (0.4 * Math.random());
        }
    ,   Plant = function(depot, terrain, startX, availableWidth, plantTypeSet) {
            var sizeFactor = (0.7 + (0.3 * Math.random()))
            ;
            this.depot = depot;
            this.plantType = plantTypeSet.selectWeightedRandom();
            this.x = startX + (availableWidth * Math.random());
            // this.yOffset = 0.5 * Math.random();
            this.yOffset = Math.random();
            this.terrainFactor = sizeFactor * terrain.scale
            this.foliageHeight = this.plantType.foliageHeightMax * this.terrainFactor;
            this.flowerRadius = this.plantType.flowerRadius * this.terrainFactor;
            this.width = this.plantType.foliageWidthMax * sizeFactor;
            this.foliageWidth = this.width * terrain.scale;
            this.height = this.plantType.fullHeight * sizeFactor;
            this.branchHeightMax = this.plantType.branchHeightMax * this.terrainFactor;
            this.branchWidthMax = this.plantType.branchWidthMax * this.terrainFactor;
        }
    ,   PlantType = function(map) {
            var branchExposure = 0
            ,   frond = Math.random() < 0.2
            ,   flowers = Math.random() < 0.6
            ;
            // this.depot = depot;
            this.map = map;
            // this.foliageHue = this.depot.map.view.display.getRandomHue(3);
            this.foliageHue = this.map.view.display.getRandomHue(3);
            this.foliageSaturation =  20 + (80 * Math.random());
            // this.foliageHeightMax = this.depot.map.view.basePlantHeight * (1 + (2 * Math.random()));
            this.foliageHeightMax = this.map.view.basePlantHeight * (1 + (2 * Math.random()));
            this.foliageWidthMax = frond ? (0.1 * this.foliageHeightMax) : this.foliageHeightMax * (0.7 + (0.8 * Math.random()));
            this.foliageCount = 1 + Math.floor(5 * Math.random());
            this.foliageOverlap = 0.05 + (0.4 * Math.random());
            this.foliageSharpness = 0.5 * Math.random();
            // this.branchHue = this.depot.map.view.display.getRandomHue(1);
            this.branchHue = this.map.view.display.getRandomHue(1);
            this.branchSaturation =  50 + (20 * Math.random());
            branchExposure = this.foliageHeightMax * Math.pow(Math.random(), 2);
            this.fullHeight = branchExposure + ((1 + (this.foliageOverlap * (this.foliageCount - 1))) * this.foliageHeightMax);
            this.branchHeightMax = branchExposure + (this.foliageHeightMax/2);
            this.branchWidthMax = Math.min(0.3 * this.foliageWidthMax, (0.05 + (0.4 * Math.random())) * this.branchHeightMax);
            this.flowerRadius = (flowers && !frond) ? Math.min(this.foliageWidthMax/20 ,(10 + (10 * Math.random()))) : 0;
            // this.flowerHue = this.depot.map.view.display.getRandomHue();
            this.flowerHue = this.map.view.display.getRandomHue();
            this.flowerSaturation =  70 + (30 * Math.random());
        }
    ,   PlantTypeSet = function(depot) {
            this.plantTypes = [];
            if (!depot.plantTypeSets) {
                if (depot.prevDepot) {
                    this.plantTypes.push(depot.prevDepot.plantTypeSets[2].plantTypes[1]);
                    this.plantTypes.push(depot.prevDepot.plantTypeSets[2].plantTypes[2]);
                }
            } else {
                this.plantTypes.push(depot.plantTypeSets[depot.plantTypeSets.length - 1].plantTypes[1]);
                this.plantTypes.push(depot.plantTypeSets[depot.plantTypeSets.length - 1].plantTypes[2]);
            }
            while (this.plantTypes.length < 3) {
                this.plantTypes.push(depot.map.plantTypes[Math.floor(depot.map.plantTypes.length * Math.random())]);
            }
            this.averageWidth = 0.1 * ((7 * this.plantTypes[0].foliageWidthMax) + (2 * this.plantTypes[1].foliageWidthMax) + this.plantTypes[2].foliageWidthMax);
        }
    ,   Pole = function(poleSet) {
            this.poleSet = poleSet;
            this.yOffset = poleSet.yOffset;
            this.height = poleSet.height;
            this.width = poleSet.map.poleSeparation;
            this.x = poleSet.poles.length ? poleSet.poles[poleSet.poles.length - 1].x + this.width : poleSet.startX;
            this.doNotMove = true;
        }
    ,   PoleSet = function(map) {
            var poleX = 0
            ,   startDepotId = null
            ;
            this.id = map.poleSets.length;
            this.map = map;
            this.nextPoleSet = null;
            this.prevPoleSet = this.id ? map.poleSets[this.id - 1] : null;
            if (this.prevPoleSet) {
                this.prevPoleSet.nextPoleSet = this;
                this.startDepot = this.prevPoleSet.startDepot.nextDepot.nextDepot;
            } else {
                this.startDepot = this.map.depots[0];
            }
            this.terrain = this.map.poleTerrains[Math.floor(this.map.poleTerrains.length * Math.random())];
            this.startX = this.prevPoleSet ? this.startDepot.centerX : this.terrain.origin;
            this.endX = this.startDepot.nextDepot ? this.startDepot.nextDepot.centerX : this.startDepot.endX;
            this.height = map.view.baseBuildingHeight * (1.5 + Math.random());
            this.yOffset = 0;
            this.poleScaleWidth = Math.round(50 * this.terrain.scale);
            this.wirePosition = Math.round(this.height * this.terrain.scale * (0.85 + (0.15 * Math.random())));
            this.bezierXOffset = Math.round(this.map.poleSeparation * this.terrain.scale * (0.2 + (0.2 * Math.random())));
            this.bezierYOffset = Math.round(this.height * this.terrain.scale * (0.2 + (0.2 * Math.random())));
            this.poles = [];
            do {
                this.poles.push(new Pole(this));
            } while (this.poles[this.poles.length - 1].x < this.endX)
            this.color = this.map.view.display.getRandomHue(1);
        }
    ,   Sign = function(depot, terrain) {
            var measureText = null
            ;
            this.depot = depot;
            this.terrain = terrain;
            measureText = this.terrain.tView.context.measureText(this.depot.name);
            this.width = Math.round(1.4 * measureText.width/this.terrain.scale);
            this.yOffset = 0;
            this.height = Math.round(1.3 * this.depot.map.view.baseFontSize/this.terrain.scale);
            this.x = this.depot.centerX;
        }
    ,   townSuffixes = ["berg", "borough", "burg", "bury", "cester", "cliff", " City", "dale", "field", "ford", "furt", " Gardens", "grad", " Grove", " Heights", " Hills", " Lake", "market", " Oaks", " Park", " Point", "polis", "shire", " Springs", "ton", " Town", " Valley", " View", "ville", "wich", "wood"]
    ;
    Map.prototype = {
        advanceMountains: function() {
            var chosenTerrains = null
            ,   newMountain = {}
            ;
            chosenTerrains = this.view.terrains.filter( function(terrain) {
                return terrain.farCount != 0;
            });
            chosenTerrains.forEach( function(terrain) {
                if (this.mountains[terrain.farCount]) {
                    newMountain.startMountain = this.mountains[terrain.farCount].endMountain;
                } else {
                    newMountain.startMountain = new Mountain(this, terrain, undefined, undefined, Math.random() * terrain.maxHeight);
                }
                newMountain.endMountain = new Mountain(this, terrain, newMountain.startMountain, undefined, Math.random() * terrain.maxHeight);
                this.mountains[terrain.farCount] = newMountain;
                this.generateMountains(terrain);
            }, this);
        }
    ,   advanceObjects: function() {
            var depotEndX = (this.depots.length ? this.depots[this.depots.length - 1].endX : this.view.lastNearTerrain.origin) + this.view.lastNearTerrain.tView.scaleWidth
            ,   poleSet = null
            ,   chosenTerrains = null
            ;
            do {
                this.depots.push(new Depot(this));
            } while (this.depots[this.depots.length - 1].endX < depotEndX);
            do {
                poleSet = new PoleSet(this);
                this.poleSets.push(poleSet);
                poleSet.terrain.poleSets.push(poleSet);
            } while (poleSet.startDepot.id < (this.depots.length - 2));
            chosenTerrains = this.view.terrains.filter( function(terrain) {
                return (terrain.farCount == 0);
            });
            chosenTerrains.forEach( function(terrain) {
                this.generateObjects(terrain);
            }, this);
        }
    ,   generateMountains: function(terrain) {
            var mountains = [this.mountains[terrain.farCount].startMountain, this.mountains[terrain.farCount].endMountain]
            ;
            mountains[0].recursiveSplit(this, terrain, mountains[1], mountains);
            mountains.forEach( function(mountain) {
                terrain.addObject(mountain);
            });
            // this.sortAndTrigger(terrain);
            terrain.sortAndTrigger(this);
        }
    ,   generateObjects: function(terrain) {
            var terrainDistanceToCenter = 0
            ,   terrainUrbanRadius = 0
            ,   terrainCoreRadius = 0
            ,   populateWidth = 0
            ,   populateCount = 0
            ,   maxStories = 0
            ;
            this.depots.forEach( function(depot) {
                if (terrain.id) {
                    terrainDistanceToCenter = Math.abs(depot.centerDistance - terrain.distance);
                    terrainUrbanRadius = Math.sqrt(Math.pow(depot.urbanRadius, 2) - Math.pow(terrainDistanceToCenter, 2));
                    terrainCoreRadius = (depot.coreRadius > terrainDistanceToCenter) ? Math.sqrt(Math.pow(depot.coreRadius, 2) - Math.pow(terrainDistanceToCenter, 2)) : 0;
                    populateWidth = 2 * terrainUrbanRadius;
                    populateCount = depot.urbanDensity * populateWidth * Math.pow((1 - (terrainDistanceToCenter/depot.urbanRadius)), 2)/this.view.baseBuildingHeight;
                    for (var i = 0; i < populateCount; i++) {
                        terrain.addObject(new Building(depot, terrain, populateWidth, terrainCoreRadius));
                    }
                    populateWidth = 2 * terrainUrbanRadius;
                    populateCount = depot.plantDensities[1] * populateWidth/depot.plantTypeSets[1].averageWidth;
                    for (var i = 0; i < populateCount; i++) {
                        terrain.addObject(new Plant(depot, terrain, depot.centerX - terrainUrbanRadius, populateWidth, depot.plantTypeSets[1]));
                    }
                    populateWidth = depot.centerX - (Math.max(terrain.origin, depot.startX) + terrainUrbanRadius);
                    populateCount = depot.plantDensities[0] * populateWidth/depot.plantTypeSets[0].averageWidth;
                    for (var i = 0; i < populateCount; i++) {
                        terrain.addObject(new Plant(depot, terrain, Math.max(terrain.origin, depot.startX), populateWidth, depot.plantTypeSets[0]));
                    }
                    populateWidth = depot.urbanRadius - terrainUrbanRadius;
                    populateCount = depot.plantDensities[2] * populateWidth/depot.plantTypeSets[2].averageWidth;
                    for (var i = 0; i < populateCount; i++) {
                        terrain.addObject(new Plant(depot, terrain, depot.centerX + terrainUrbanRadius, populateWidth, depot.plantTypeSets[2]));
                    }
                } else {
                    terrain.addObject(new Sign(depot, terrain));
                }
            }, this);
            terrain.poleSets.forEach( function(PoleSet) {
                PoleSet.poles.forEach( function(pole) {
                    terrain.addObject(pole);
                }, this);
            }, this);
            terrain.sortAndTrigger(this);
        }
    }
    Building.prototype = {
        draw: function(context) {
            var fillHue = this.style.palette.baseHues[Math.floor(this.style.palette.baseHues.length * Math.random())]
            ,   saturation = 10 + (10 * Math.random())
            ,   luminosity = 60 + (20 * Math.random())
            ,   shadowExtend = Math.round(0.2 * this.drawWidth)
            ;
            context.save()
            this.leftShade = "hsla(" + fillHue + ", " + saturation + "%, " + (luminosity + (Math.max(0, 0.5 - this.leftPortion) * (this.depot.map.view.sunRight ? -40 : 40))) + "%, 1)"
            this.rightShade = "hsla(" + fillHue + ", " + saturation + "%, " + (luminosity + (Math.max(0, 0.5 - this.rightPortion) * (this.depot.map.view.sunRight ? 40 : -40))) + "%, 1)";
            this.accentShade = "hsla(" + fillHue + ", " + (saturation + 20) + "%, " + luminosity + "%, 1)";
            this.roofColor = "hsla(" + this.style.palette.roof + ", " + saturation + "%, 40%, 1)";
            this.gableWidth = Math.round((this.leftGable ? this.leftPortion : this.rightPortion) * this.drawWidth/2);
            this.windowHeight = Math.round(this.storyHeight * (0.3 + (0.3 * Math.random())));
            this.windowWidth = Math.round(this.storyHeight * (0.3 + (0.2 * Math.random())));
            this.doorHeight = Math.round(this.storyHeight * 0.8);
            this.doorWidth = this.doorHeight * (0.3 + (0.2 * Math.random()));
            this.windowBottom = Math.round((this.storyHeight - this.windowHeight)/2);
            this.windowBorder = this.windowWidth * (0.05 + (0.1 * Math.random()));
            this.windowIndent = this.windowWidth * (0.05 + (0.1 * Math.random()));
            this.windowsVisible = this.windowHeight > 2;
            context.translate(this.drawX, this.drawY);
            this.drawSide(context, true)
            context.translate(Math.round(this.leftPortion * this.drawWidth), 0);
            this.drawSide(context, false)
            context.fillStyle = "hsla(0, 0%, 0%, 0.1)"
            context.fillRect(-1 * (Math.round(this.leftPortion * this.drawWidth) + (this.depot.map.view.sunRight ? shadowExtend : 0)), 0, this.drawWidth + shadowExtend, Math.round(30 * this.terrain.scale));
            context.restore();
        }
    ,   drawOpening: function(context, leftSide, xOffset, door) {
            var portion = leftSide ? this.leftPortion : this.rightPortion
            ,   width = Math.round((door ? this.doorWidth : this.windowWidth) * portion)
            ,   height = door ? this.doorHeight : this.windowHeight
            ,   bottom = door ? 0 : this.windowBottom
            ,   borderPortion = this.windowBorder * portion
            ,   borderWidth = width + Math.round(2 * borderPortion)
            ,   borderHeight = height + Math.round((door ? 1 : 2) * this.windowBorder)
            ,   borderX = Math.round(xOffset - borderPortion)
            ,   borderY = Math.max(0, Math.round(bottom - this.windowBorder))
            ,   sideIndent = Math.round(Math.max(1, this.windowIndent * (leftSide ? this.rightPortion : this.leftPortion)))
            ,   bottomIndent = door ? 0 : Math.round(this.windowIndent/2)
            ,   path = new Path2D()
            ,   openingLuminosity = ((Math.random() < 0.5) ? 20 : 60) + (20 * Math.random())
            ;
            context.save()
            context.fillStyle = this.accentShade;
            context.fillRect(borderX, -1 * borderY, borderWidth, -1 * borderHeight);
            path.rect(xOffset, -1 * bottom, width, -1 * height);
            path.closePath();
            context.fillStyle = leftSide ? this.rightShade : this.leftShade;
            context.fill(path);
            context.clip(path);
            context.translate((leftSide ? 1 : -1) * sideIndent, -1 * bottomIndent);
            context.fillStyle = "hsla(" + this.style.palette.roof + ", 20%, " + openingLuminosity + "%, 1)";
            context.fill(path);
            context.restore();
        }
    ,   drawSide: function(context, leftSide) {
            var width = Math.round(this.drawWidth * (leftSide ? this.leftPortion : this.rightPortion))
            ,   drawDoor = false
            ;
            context.save();
            context.fillStyle = leftSide ? this.leftShade : this.rightShade;
            context.fillRect(0, 0, width, Math.round(-1 * this.storyCount * this.storyHeight));
            for (var story = 0; story < this.storyCount; story++) {
                drawDoor = ((story == 0) && (this.doorLeft == leftSide))
                if (this.windowsVisible) {
                    this.drawStory(context, leftSide, width, drawDoor)
                }
                context.translate(0, -1 * this.storyHeight);
            }
            if (this.roofHeight) {
                if (leftSide == this.leftGable) {
                    context.beginPath();
                    context.moveTo(0, 0);
                    context.lineTo(this.gableWidth, -1 * Math.round(this.roofHeight))
                    context.lineTo(width, 0)
                    context.fill();
                } else {
                    context.beginPath();
                    context.moveTo(0, 0);
                    context.lineTo((leftSide ? 1 : -1) * this.gableWidth, -1 * Math.round(this.roofHeight))
                    context.lineTo(width + (leftSide ? 1 : -1) * this.gableWidth, -1 * Math.round(this.roofHeight))
                    context.lineTo(width, 0)
                    context.fillStyle = this.roofColor;
                    context.fill();
                }
            }
            context.restore();
        }
    ,   drawStory: function(context, leftSide, width, drawDoor) {
            var windowWidth = this.windowWidth * (leftSide ? this.leftPortion : this.rightPortion)
            ,   sectionCount = Math.min(4, Math.floor((width - windowWidth)/(2 * windowWidth)))
            ,   sectionWidth = (width - (2 * windowWidth))/sectionCount
            ,   doorSection = Math.floor(sectionCount * Math.random())
            ,   windowSeparation = Math.round(sectionWidth - windowWidth)
            ,   xOffset = 0
            ;
            context.save();
            context.translate(windowWidth, 0);
            for (var section = 0; section < sectionCount; section++) {
                xOffset = Math.round(windowSeparation * (0.2 + (0.6 * Math.random())));
                if (drawDoor && (doorSection == section)) {
                    this.drawOpening(context, leftSide, xOffset, true);
                } else {
                    this.drawOpening(context, leftSide, xOffset)
                }
                context.translate(windowWidth + windowSeparation, 0);
            }
            context.restore();
        }
    }
    Mountain.prototype = {
        draw: function(context) {
            var path = new Path2D()
            ,   arcRadius = Math.max(0, 0.1 * (this.drawWidth - this.drawHeight))
            ,   saturationVariation = 30 - (50 * Math.random())
            ;
            context.save();
            path.moveTo(0, this.drawHeight);
            path.lineTo(-1 * this.peakOffset * this.drawWidth, this.drawHeight);
            path.arcTo(0, 0, (1 - this.peakOffset) * this.drawWidth, this.drawHeight, arcRadius);
            path.lineTo((1 - this.peakOffset) * this.drawWidth, this.drawHeight);
            path.closePath();
            context.fillStyle = "hsla(" + this.terrain.view.land.hue + ", " + (this.map.mountainSaturation + saturationVariation) + "%, " + (50 + (10 * this.terrain.farCount)) + "%, 1)";
            context.translate(Math.round(this.drawX + (this.peakOffset * this.drawWidth)), this.drawY - this.drawHeight);
            context.fill(path);
            context.clip(path);
            context.rotate(0.1);
            context.scale(1.2, 1.2);
            context.fillStyle = this.terrain.view.sunRight ? "black" : "white";
            context.globalAlpha = 0.3;
            context.fill(path);
            context.restore();
        }
    ,   recursiveSplit: function(map, terrain, rightMountain, array) {
            var newMountain = new Mountain (map, terrain, this, rightMountain);
            ;
            if (newMountain.x !== null) {
                array.push(newMountain);
                this.recursiveSplit(map, terrain, newMountain, array);
                newMountain.recursiveSplit(map, terrain, rightMountain, array);
            }
        }
    }
    Plant.prototype = {
        draw: function(context) {
            var branchMidX = Math.round(0.5 * this.branchWidthMax)
            ;
            context.translate(Math.round(this.drawX + (this.drawWidth/2)), this.drawY);
            context.save();
            context.rotate(0.05 - (0.1 * Math.random()));
            context.fillStyle = "hsl(" + this.plantType.branchHue + ", " + this.plantType.branchSaturation + "%, " + (20 + (10 * Math.random())) + "%)";
            context.beginPath();
            context.moveTo(-1 * this.branchWidthMax, 0);
            context.bezierCurveTo(0, -1 * Math.round(this.branchHeightMax * Math.pow(Math.random(),2)), 0, -1 * Math.round(this.branchHeightMax * Math.random()), -1 * branchMidX, -1 * this.branchHeightMax);
            context.lineTo(branchMidX, -1 * this.branchHeightMax)
            context.bezierCurveTo(0, -1 * Math.round(this.branchHeightMax * Math.random()), 0, -1 * Math.round(this.branchHeightMax * Math.pow(Math.random(),2)), this.branchWidthMax, 0);
            context.closePath();
            context.fill();
            this.drawFoliage(context);
            context.restore();
            context.fillStyle = "hsla(0, 0%, 0%, 0.1)"
            context.fillRect(Math.round(this.drawWidth/-2), 0, this.drawWidth, Math.round(10 * this.terrain.scale));
            context.setTransform(1,0,0,1,0,0);
        }
    ,   drawFlowers: function(context) {
            var flowerColor = "hsl(" + this.plantType.flowerHue + ", " + this.plantType.flowerSaturation + "%, " + (40 + (20 * Math.random())) + "%)"
            ;
            context.save();
            context.fillStyle = flowerColor;
            context.translate(Math.round(-0.5 * this.foliageWidth), Math.round(-1 * this.foliageHeight));
            for (var i = 0; i < 10; i++) {
                context.beginPath();
                context.arc(Math.round(this.foliageWidth * Math.random()), Math.round(this.foliageHeight * Math.random()), Math.round(this.flowerRadius), 0, 2 * Math.PI);
                context.fill()
            }
            context.restore();
        }
    ,   drawFoliage: function(context, yOffset, givenPath) {
            var path = givenPath || new Path2D()
            ,   width = this.drawWidth
            ,   halfWidth = Math.round(width/2)
            ,   quarterWidth = Math.round(width/4)
            ,   height = Math.round(this.foliageHeight)
            ,   leanFactor = 1.2 - (0.4 * Math.random())
            ,   leftMidHeight = Math.round(leanFactor * height/(2 + (2 * this.plantType.foliageSharpness)))
            ,   leftQuarterHeight = Math.round(leftMidHeight/2)
            ,   rightMidHeight = Math.round((2 - leanFactor) * height/(2 + (2 * this.plantType.foliageSharpness)))
            ,   rightQuarterHeight = Math.round(rightMidHeight/2)
            ,   foliageColor = "hsl(" + this.plantType.foliageHue + ", " + this.plantType.foliageSaturation + "%, " + (20 + (10 * Math.random())) + "%)"
            ;
            if (givenPath) {
                context.translate(0, yOffset);
            } else {
                context.translate(0, Math.round(this.foliageHeight - this.drawHeight));
                path.moveTo(0, 0);
                path.bezierCurveTo(-1 * quarterWidth, 0, -1 * halfWidth, -1 * leftQuarterHeight, -1 * halfWidth, -1 * leftMidHeight);
                path.bezierCurveTo(-1 * halfWidth, -1 * (leftMidHeight + leftQuarterHeight), quarterWidth * (this.plantType.foliageSharpness - 1), (this.plantType.foliageSharpness * leftQuarterHeight) - height, 0, -1 * height);
                path.bezierCurveTo(quarterWidth * (1 - this.plantType.foliageSharpness), (this.plantType.foliageSharpness * rightQuarterHeight) - height, halfWidth, -1 * (rightMidHeight + rightQuarterHeight), halfWidth, -1 * rightMidHeight);
                path.bezierCurveTo(halfWidth, -1 * rightQuarterHeight, quarterWidth, 0, 0, 0);
                path.closePath();
            }

            context.save();
            context.rotate(0.4 - (0.8 * Math.random()));
            context.fillStyle = foliageColor
            context.globalAlpha = 0.9;
            context.fill(path);
            context.clip(path);
            this.drawFlowers(context);

            if (this.terrain.view.sunRight) {
                context.fillStyle = "black";
                context.rotate(-0.2);
            } else {
                context.fillStyle = "white";
                context.translate(-1 * quarterWidth, -1 * leftQuarterHeight);
            }
            context.globalAlpha = 0.2;
            context.fill(path);
            context.restore();
            if (!givenPath) {
                context.save();
                for (var lobes = 1; lobes < this.plantType.foliageCount; lobes++) {
                    this.drawFoliage(context, Math.round(this.foliageHeight * this.plantType.foliageOverlap), path);
                }
                context.restore();
            }
        }
    }
    PlantTypeSet.prototype = {
        selectWeightedRandom: function() {
            var random = Math.random()
            ;
            if (random < 0.7) {
                return this.plantTypes[0];
            } else if (random < 0.9) {
                return this.plantTypes[1];
            } else {
                return this.plantTypes[2];
            }
        }
    }
    Pole.prototype = {
        draw: function(context) {
            var shadowExtend = Math.round( 0.2 * this.drawHeight)
            ;
            context.save()
            context.strokeStyle = "lightgray";
            context.beginPath();
            context.moveTo(this.drawX , this.drawY - this.poleSet.wirePosition);
            context.bezierCurveTo(this.drawX + this.poleSet.bezierXOffset, this.drawY + this.poleSet.bezierYOffset - this.poleSet.wirePosition, this.drawX + this.drawWidth - this.poleSet.bezierXOffset, this.drawY + this.poleSet.bezierYOffset - this.poleSet.wirePosition, this.drawX + this.drawWidth, this.drawY - this.poleSet.wirePosition)
            context.stroke();
            context.closePath();
            context.fillStyle = "hsl(" + this.poleSet.color + ", 30%, 30%)";
            context.fillRect(this.drawX , this.drawY, this.poleSet.poleScaleWidth, (-1 * this.drawHeight));
            context.fillRect(this.drawX + this.drawWidth, this.drawY, this.poleSet.poleScaleWidth, (-1 * this.drawHeight));
            context.fillStyle = "hsla(0, 0%, 0%, 0.1)"
            context.fillRect(this.drawX - (this.poleSet.map.view.sunRight ? shadowExtend : 0), this.drawY, shadowExtend + this.poleSet.poleScaleWidth, Math.round(-10 * this.terrain.scale));
            context.restore();
        }
    }
    Sign.prototype = {
        draw: function(context) {
            var heightOffset = Math.round(this.terrain.tView.height * (0.5 + (0.2 * Math.random())))
            ,   frameSize = Math.round(this.drawWidth/(20 + (10 * Math.random())))
            ,   saturation = 10 + (10 * Math.random())
            ,   frameOffset = this.depot.map.view.sunRight ? this.drawWidth + frameSize : -2 * frameSize
            ,   frameLegOffset = this.depot.map.view.sunRight ? frameSize : -1 * frameSize
            ;
            context.save()
            context.fillStyle = "hsla(" + this.depot.buildingStyle.palette.roof + ", " + saturation + "%, 20%, 1)";
            context.fillRect(this.drawX - frameSize, heightOffset - frameSize, this.drawWidth + (2 * frameSize), this.drawHeight + (2 * frameSize));
            context.fillRect(this.drawX + (2 * frameSize), heightOffset + this.drawHeight + frameSize, frameSize, this.terrain.tView.height);
            context.fillRect(this.drawX + this.drawWidth - (2 * frameSize), heightOffset + this.drawHeight + frameSize, frameSize, this.terrain.tView.height);
            context.fillStyle = "hsla(" + this.depot.buildingStyle.palette.roof + ", " + saturation + "%, 40%, 1)";
            context.fillRect(this.drawX + frameOffset, heightOffset - frameSize, frameSize, this.drawHeight + (2 * frameSize));
            context.fillRect(this.drawX + (2 * frameSize) + frameLegOffset, heightOffset + this.drawHeight + frameSize, frameSize, this.terrain.tView.height);
            context.fillRect(this.drawX + this.drawWidth - (2 * frameSize) + frameLegOffset, heightOffset + this.drawHeight + frameSize, frameSize, this.terrain.tView.height);
            context.fillStyle = "hsla(" + this.depot.buildingStyle.palette.baseHues[1] + ", " + (10 + (10 * Math.random())) + "%, 70%, 1)";
            context.fillRect(this.drawX, heightOffset, this.drawWidth, this.drawHeight);
            context.fillStyle = "hsla(" + this.depot.buildingStyle.palette.baseHues[2] + ", " + (20 + (10 * Math.random())) + "%, 50%, 1)";
            context.fillText(this.depot.name, Math.round(this.drawX + (0.5 * this.drawWidth)), Math.round(heightOffset + (0.5 * this.drawHeight)));
            context.restore();
        }
    }
    return new Map(view);
}
function createSky(view) {
    var skyRoot = document.querySelector("#skyRoot")
    ,   Sky = function(view) {
            this.view = view;
            this.id = view.skies.length;
            this.element = skyRoot.parentNode.appendChild(skyRoot.cloneNode(true));
            this.element.id = "sky" + this.id;
            this.element.style.zIndex = -1 * this.id;
            this.context = this.element.getContext("2d");
            this.context.imageSmoothingEnabled = false;
            this.element.width = this.element.clientWidth;
            this.element.height = view.horizon;
        }
    ;
    Sky.prototype = {
        delete: function() {
            this.element.style.opacity = 0;
            if (this.id) {
                skyRoot.parentNode.removeChild(this.view.skies[this.id - 1].element);
            }
        }
    ,   draw: function() {
            this.context.fillStyle = this.getSkyGradient(this.view.transition.type);
            this.context.fillRect(0, 0, this.element.width, this.element.height);
            if (this.view.transition.type == 1) {
                this.drawMoon();
            }
            return this;
        }
    ,   drawMoon: function() {
            var centerX = Math.round(this.element.width * (0.1 + (0.8 * Math.random())))
            ,   centerY = Math.round(this.element.height * 0.4 * Math.random())
            ,   radius = Math.min(this.element.width, this.element.height) * (0.1 + (0.3 * Math.random()))
            ,   path = new Path2D()
            ,   shiftY = -1 * Math.max(4, Math.round(radius * (0.05 + (0.1 * Math.random()))))
            ,   shiftX = Math.round(shiftY * (0.4 + (0.4 * Math.random())))
            ;
            this.context.save()
            this.context.translate(centerX, centerY);
            path.arc(0, 0, radius, 0, 2 * Math.PI);
            path.closePath();
            this.context.fillStyle = "hsla(0, 0%, 100%, 0.05)";
            this.context.fill(path);
            this.context.clip(path);
            this.context.translate(shiftX, shiftY);
            this.context.scale(1.1, 1.1);
            this.context.lineWidth = Math.round(Math.abs(Math.max(shiftX, shiftY)));
            this.context.strokeStyle = "white";
            this.context.stroke(path);
            this.context.restore()
        }
    ,   getSkyGradient: function(timeType) {
            var currentGradient = null
            ,   color1 =
                [   "hsl(" + this.view.skyHues.blue + ", 60%, 60%)"
                ,   "hsl(" + this.view.skyHues.blue + ", 75%, 30%)"
                ,   "hsl(" + this.view.skyHues.blue + ", 85%, 10%)"
                ,   "hsl(" + this.view.skyHues.green + ", 30%, 60%)" ]
            ,   color2 =
                [   "hsl(" + this.view.skyHues.blue + ", 60%, 85%)"
                ,   "hsl(" + this.view.skyHues.red + ", 60%, 50%)"
                ,   "hsl(" + this.view.skyHues.blue + ", 85%, 40%)"
                ,   "hsl(" + this.view.skyHues.red + ", 65%, 80%)" ]
            ,   gradients = []
            ;
            currentGradient = this.context.createLinearGradient(0, 0, 0, this.element.height);
            currentGradient.addColorStop(0,color1[timeType]);
            currentGradient.addColorStop(1,color2[timeType]);
            return currentGradient;
        }
    }
    return new Sky(view).draw();
}
function createTerrain(view, distance, farCount) {
    var terrainRoot = document.querySelector("#terrainRoot")
    ,   Terrain = function(view, distance, farCount) {
            this.view = view;
            this.id = this.view.terrains.length;
            if (this.id) {
                this.prevTerrain = this.view.terrains[this.id - 1];
                this.prevTerrain.nextTerrain = this;
            } else {
                this.prevTerrain = null;
            }
            this.nextTerrain = null;
            this.distance = distance;
            this.farCount = farCount;
            this.scale = this.view.windowDistance/this.distance;
            this.scaleWidth = this.view.width/this.scale;
            this.velocity = this.view.velocity * this.scale;
            this.travel = this.origin = this.view.width * 0.5 * (1 - (1/this.scale));
            this.populateTrigger = this.populateTo = this.mapTrigger = this.mapTo = this.origin;
            this.objects = [];
            this.poleSets = [];
            this.minObjectSize = Math.round(1/this.scale);
            this.maxHeight = farCount ? ((0.1 + (0.2 * farCount)) * this.view.horizon/this.scale) : (1.1 * this.view.maxHeight);
            this.tView = new TView(this);
            this.flock = null;
            this.lastTerrain = false;
        }
    ,   TView = function(terrain) {
            var horizonToFloor = Math.round(terrain.view.horizonToFloor * terrain.scale)
            ,   prevTView = terrain.prevTerrain ? terrain.prevTerrain.tView : null
            ;
            this.terrain = terrain;
            this.element = terrainRoot.parentNode.appendChild(terrainRoot.cloneNode(true));
            this.element.id = "terrain" + this.terrain.id;
            this.width = this.element.width = (this.terrain.view.width * 2) + (this.terrain.view.drawBuffer * terrain.scale);
            this.scaleWidth = this.width/this.terrain.scale;
            this.top = Math.max(0, Math.round(this.terrain.view.horizon + horizonToFloor - (this.terrain.maxHeight * this.terrain.scale)));
            this.floor = this.terrain.view.horizon + horizonToFloor - this.top;
            this.bottom = Math.min(this.terrain.view.height, this.floor + this.top);
            this.height = this.element.height = Math.max(1, Math.round(this.bottom - this.top));
            this.floorGap = null;
            if (prevTView) { prevTView.floorGap = (prevTView.floor + prevTView.top) - (this.floor + this.top); }
            this.context = this.element.getContext("2d");
            this.context.imageSmoothingEnabled = false;
            this.origin = this.terrain.origin;
            this.context.textAlign = "center";
            this.context.textBaseline = "middle";
            this.context.font = this.terrain.view.baseFontSize + "px serif";
        }
    ;
    Terrain.prototype = {
        addObject: function(object) {
            if (((object.x + object.width) > this.origin) && (object.height > this.minObjectSize) && (object.width > this.minObjectSize)) {
                object.terrain = this;
                this.objects.push(object);
            }
        }
    ,   draw: function(travel, interval) {
            this.travel += travel;
            if (this.travel >= this.mapTrigger) {
                if (this.farCount) {
                    this.view.map.advanceMountains();
                } else {
                    this.view.map.advanceObjects();
                }
            }
            if (this.travel >= this.populateTrigger) {
                this.tView.shift();
                this.populate();
            }
            this.tView.draw();
            if (this.flock) {
                this.flock.draw(interval);
            }
        }
    ,   populate: function() {
            var endX = this.travel + this.tView.scaleWidth
            ,   chosenObjects = []
            ,   objectsEndX = null
            ,   extendingObject = null
            ;
            this.objects.every( function(object) {
                if ((object.x + object.width) < endX) {
                    chosenObjects.push(object);
                    objectsEndX = Math.max(objectsEndX, object.x + object.width);
                } else if (object.x < endX) {
                    extendingObject = object;
                }
                return ((object.x + object.width) < endX);
            });
            if (extendingObject) {
                if (extendingObject.doNotMove) {
                    this.populateTo = extendingObject.x;
                    this.sortAndTrigger();
                } else {
                    extendingObject.x = endX + 1;
                    this.populateTo = endX;
                }
            } else {
                this.populateTo = endX;
            }
            this.populateTrigger = this.populateTo - (this.scaleWidth + this.view.drawBuffer);
            if (chosenObjects.length) {
                this.objects.splice(0, chosenObjects.length);
                chosenObjects.sort( function(a, b) { return b.yOffset - a.yOffset; }).forEach (function (object) {
                    this.tView.populate(object);
                }, this);
            }
        }
    ,   sortAndTrigger: function(map) {
            var depots = map ? map.depots : this.view.map.depots
            ;
            if (this.objects.length) {
                this.objects.sort( function(a, b) { return a.x - b.x; });
                this.mapTo = this.objects[this.objects.length - 1].x;
            } else {
                this.mapTo = depots[depots.length - 1].endX;
            }
            this.mapTrigger = this.mapTo - (this.view.drawBuffer + this.scaleWidth);
        }
    }
    TView.prototype = {
        draw: function() {
            this.terrain.view.context.drawImage(this.element, this.travelToX(this.terrain.travel), 0, this.terrain.view.width, this.height, 0, this.top, this.terrain.view.width, this.height);
            if (this.terrain.view.transition.oldHaze) {
                this.terrain.view.context.save();
                this.terrain.view.context.globalCompositeOperation = "source-atop";
                this.terrain.view.context.fillStyle = "hsla(0, 100%, 100%, " + this.terrain.view.transition.oldHaze + ")";
                this.terrain.view.context.fillRect(0, 0, this.terrain.view.width, this.height);
                this.terrain.view.context.restore();
            }
        }
    ,   populate: function(object) {
            object.drawX = this.travelToX(object.x);
            object.drawY = Math.round(this.floor - (object.yOffset ? Math.round(this.floorGap * object.yOffset) : 0));
            object.drawHeight = Math.round(object.height * this.terrain.scale);
            object.drawWidth = Math.round(object.width * this.terrain.scale);
            object.draw(this.context);
        }
    ,   shift: function() {
            var x = this.travelToX(this.terrain.travel)
            ,   image = null
            ;
            if (x) {
                image = this.context.getImageData(x, 0, this.width - x, this.height)
                this.context.clearRect(0, 0, this.width, this.height);
                this.context.putImageData(image, 0, 0);
                this.origin = this.terrain.travel;
                // console.log(Date.now() + ": shifted terrain " + this.terrain.id + " origin to " + this.origin);
            }
        }
    ,   travelToX: function(travel) {
            return Math.round((travel - this.origin) * this.terrain.scale);
        }
    }
    return new Terrain(view, distance, farCount);
}
function createView(display) {
    var View = function(display) {
            var currentDistance = 0
            ,   mountainDistance = 1000000 // 2 mile equivalent for start of mountains
            ,   near = true
            ,   farCount = 0
            ,   mountainLevels = 3
            ;
            // calibrate to 1:100 foot:pixel
            this.display = display;
            this.element = document.querySelector("#view");
            this.context = this.element.getContext("2d");
            this.context.imageSmoothingEnabled = false;
            this.boundingRect = this.element.getBoundingClientRect();
            if (this.boundingRect.left < 70) {
                this.element.style.width = (this.boundingRect.width - (70 - this.boundingRect.left)) + "px";
                this.element.style.left = "70px";
                this.boundingRect = this.element.getBoundingClientRect();
            }
            this.width = this.element.width = this.element.clientWidth;
            this.height = this.element.height = this.element.clientHeight;
            // this.boundingRect = this.element.getBoundingClientRect();
            this.windowDistance = 200 + (300 * Math.random()); // 2 - 5ft
            this.horizon = this.height * (0.2 + (0.2 * Math.random()));
            this.horizonToFloor = this.height * (2 + (2 * Math.random()));
            this.baseBuildingHeight = 1200;
            this.maxStories = 6;
            this.maxHeight = this.maxStories * this.baseBuildingHeight;
            this.basePlantHeight = 400;
            this.buildingDistanceLimit = this.baseBuildingHeight * this.windowDistance;
            this.velocity = 1 + (Math.random() * 2);
            this.drawBuffer = Math.max(1, this.velocity * 500); // distance covered in half a second
            this.baseFontSize = Math.round(this.height/8);
            this.terrains = []
            currentDistance = this.windowDistance * this.horizonToFloor/(this.height - this.horizon);
            while (farCount <= mountainLevels) {
                near = currentDistance < this.buildingDistanceLimit;
                if (!near && !farCount) {
                    this.lastNearTerrain = this.terrains[this.terrains.length - 1];
                    currentDistance = mountainDistance;
                    farCount = 1;
                }
                this.terrains.push(createTerrain(this, currentDistance, farCount));
                currentDistance *= near ? 1.5 : 2;
                farCount += near ? 0 : 1;
            }
            this.lastTerrain = this.terrains[this.terrains.length - 1];
            this.currentSky = 0;
            this.transition = new Transition(this);
            this.skyHues = { blue:  210 + (Math.random() * 20), red: 15 + (Math.random() * 10), green: 140 + (Math.random() * 20) }
            this.skies = []
            this.skies.push(createSky(this));
            this.land = createLand(this);
            this.map = createMap(this);
            this.flock = createFlock(this);
            this.travel = 0;
            this.sunRight = Math.random() < 0.5;
        }
    ,   Transition = function(view) {
            this.view = view;
            this.type = 0;
            this.duration = 5000;
            this.active = false;
            this.oldLuminosity = this.newLuminosity = 100;
            this.oldAlpha = this.newAlpha = 0;
            this.oldHaze = this.newHaze = 0;
            this.luminosityVelocity = 0;
            this.alphaVelocity = 0;
            this.hazeVelocity = 0;
        }
    ;
    View.prototype = {
        generateNewSky: function() {
            this.transition.activate();
            this.skies.push(createSky(this));
            this.skies[this.skies.length - 2].delete();
            this.display.compartment.dial.rotation += 90;
            this.display.compartment.dial.element.style.transform = "translate3d(-50%, -50%, 0) rotate(" +  this.display.compartment.dial.rotation + "deg)";
        }
    ,   draw: function(interval) {
            var travel = interval * this.velocity
            ,   currentTerrain = this.lastTerrain
            ,   luminosity = 0
            ,   alpha = 0
            ;
            this.travel += travel;
            this.context.clearRect(0, 0, this.width, this.height);
            while (currentTerrain) {
                currentTerrain.draw(travel, interval);
                currentTerrain = currentTerrain.prevTerrain;
            }
            if (this.transition.active) {
                this.transition.oldLuminosity += (interval * this.transition.luminosityVelocity);
                this.transition.oldAlpha += (interval * this.transition.alphaVelocity);
                this.transition.oldHaze += (interval * this.transition.hazeVelocity);
                this.context.fillStyle = "hsla(250, 20%, " + this.transition.oldLuminosity + "%, " + this.transition.oldAlpha + ")"
                if (Math.abs(this.transition.newLuminosity - this.transition.oldLuminosity) < 1) {
                    this.transition.deactivate();
                }
            }
            if (this.transition.oldAlpha) {
                this.land.redraw(this.context.fillStyle)
                this.context.save()
                this.context.globalCompositeOperation = "source-atop";
                this.context.fillRect(0, 0, this.width, this.height);
                this.context.restore()
            }
        }
    }
    Transition.prototype = {
        activate: function() {
            this.active = true;
            this.view.display.compartment.chain.element.style.cursor = this.view.display.compartment.dial.element.style.cursor = "default";
            this.type = (this.type + 1) % 4;
            switch (this.type) {
                case 1: //dusk
                    this.newLuminosity = 30;
                    this.newAlpha = 0.5;
                    this.newHaze = 0;
                    break;
                case 2: //night
                    this.newLuminosity = 10;
                    this.newAlpha = 0.8;
                    this.newHaze = 0;
                    break;
                case 3: //dawn
                    this.newLuminosity = 40;
                    this.newAlpha = 0.5;
                    this.newHaze = 0.1;
                    break;
                default: //day
                    this.newLuminosity = 100;
                    this.newAlpha = 0;
                    this.newHaze = 0;
            }
            this.luminosityVelocity = (this.newLuminosity - this.oldLuminosity)/this.duration;
            this.alphaVelocity = (this.newAlpha - this.oldAlpha)/this.duration;
            this.hazeVelocity = (this.newHaze - this.oldHaze)/this.duration;
        }
    ,   deactivate: function() {
            this.active = false;
            this.view.display.compartment.chain.element.style.cursor = this.view.display.compartment.dial.element.style.cursor = "pointer";
            this.oldLuminosity = this.newLuminosity;
            this.oldAlpha = this.newAlpha;
            this.oldHaze = this.newHaze;
        }
    }
    return new View(display);
}
function initialize() {
    traintick.volume = 0.01;
    canvasRoot.addEventListener("click", function(e) {
        if (!display.view.transition.active && ((e.target.id == "chain") || (e.target.id == "overlay"))) {
            display.view.generateNewSky();
        }
    }, false);
    canvasRoot.addEventListener("transitionend", function(e) {
        if (e.target.id == "compartment") {
            display.compartment.rock();
        }
    }, false);
}
function animationLoop(ts) {
    var interval = ts - priorTimestamp
    ;
    priorTimestamp = ts;
    if (interval < 1000) {
        display.draw(interval);
    }
	animationId = window.requestAnimationFrame(animationLoop);
}
initialize();
})();
