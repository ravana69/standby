(function() {
"use strict";

var animationId = null
,   canvasRoot = document.querySelector(".canvas")
,   priorTimestamp = 0
,   display = null
;
window.onload = function() {
    display = createDisplay();
    animationId = window.requestAnimationFrame(animationLoop);
}
window.onresize = function() {
    display = createDisplay();
}
function createDisplay() {
    var dripCount = 0
    ,   dripElementCount = 0
    ,   availableDrips = []
    ,   Display = function() {
            this.element = canvasRoot;
            this.height = this.element.clientHeight;
            this.width = this.element.clientWidth;
            this.sky = new Sky(this).swap();
            this.frontSky = document.querySelector(".frontSky");
            this.floaters = document.querySelector("#floaters");
            this.duck = new Duck(this).swap(0);
            this.frame = new Frame(this);
            this.waves = new Waves(this);
            this.drips = new Drips(this);
            this.dripSource = new DripSource(this).swap();
        }
    ,   Drip = function(display, source, timeout) {
            this.display = display;
            this.source = source || this.display.dripSource;
            this.id = dripCount++;
            this.element = this.source.element;
            this.prevDrip = this.source.lastDrip || null;
            if (this.prevDrip) {
                this.prevDrip.nextDrip = this;
            } else {
                this.source.firstDrip = this;
            }
            this.nextDrip = null;
            this.velocityFactor = 2 + (5 * Math.random());
            this.path = this.display.waves.getDripPath(this);
            this.dripNumber = Math.floor(this.source.pathCount * Math.random());
            this.x = this.display.waves.pathWidth * this.dripNumber;
            this.width = this.display.waves.pathWidth - 1;
            this.height = Math.floor(this.element.height * (0.6 + (0.4 * Math.random())));
            this.y = this.height + Math.floor((this.element.height - this.height) * Math.random());
            this.distance = (this.source.dripAngle < 0) ? (-1 * this.path.x/Math.sin(this.source.dripAngle)) : (this.display.waves.element.width - this.path.x)/Math.sin(this.source.dripAngle);
            this.distance = Math.min(this.display.waves.element.height/Math.cos(this.source.dripAngle), this.distance);
            this.reveal = 0;
            this.wave = null;
            this.nextDripTimeout = Math.min(3000, Math.max(300, (timeout || 1000) * ((Math.random() < 0.5) ? 1.1 : 0.9)));
            this.timeSinceDrip = 0;
        }
    ,   Drips = function(display) {
            this.display = display;
            this.element = document.querySelector("#drips");
            this.element.style.width = this.display.waves.element.clientWidth + "px";
            this.element.style.left = this.display.waves.left + "px";
            this.element.width = this.element.clientWidth;
            this.element.height = this.element.clientHeight;
            this.context = this.element.getContext('2d');
        }
    ,   DripSource = function(display, other) {
            this.display = display;
            if (other) {
                this.id = other.id + 1;
                this.element = other.element.parentNode.appendChild(other.element.cloneNode(false));
                this.other = other;
            } else {
                this.id = 0;
                this.element = document.querySelector("#drip0");
                this.other = new DripSource(this.display, this);
            }
            this.element.id = "drip" + this.id;
            this.pathCount = 32;
            this.element.style.width = (this.pathCount * this.display.waves.pathWidth) + "px";
            this.element.width = this.element.clientWidth;
            this.context = this.element.getContext('2d');
        }
    ,   Duck = function(display) {
            this.display = display;
            this.element = document.querySelector("#duck");
            this.element.style.height = this.element.style.width = Math.round(Math.min(this.display.floaters.clientHeight, Math.max(16, Math.min(this.display.width, this.display.height)/10))) + "px";
            this.anchorX = Math.round(this.display.width/4 + (this.display.width * Math.random()/2));
            this.element.style.left = this.anchorX + "px";
            this.element.height = this.element.width = this.element.clientWidth;
            this.submerged = Math.round(this.element.height/8);
            this.context = this.element.getContext('2d');
            this.anchorY = this.display.height;
            this.y = this.angle = 0;
        }
    ,   Frame = function(display) {
            var gradient = null
            ,   frameWidth = 30
            ;
            this.display = display;
            this.element = document.querySelector("#frame");
            this.element.height = this.element.clientHeight;
            this.element.width = this.element.clientWidth;
            this.context = this.element.getContext('2d');
            gradient = this.context.createLinearGradient(0, 0, frameWidth, 0);
            gradient.addColorStop(0, "hsla(0, 0%, 0%, 0.2)");
            gradient.addColorStop(1, "hsla(0, 0%, 0%, 0)");
            this.context.fillStyle = gradient;
            this.context.fillRect(0, 0, frameWidth, this.element.height);
            gradient = this.context.createLinearGradient(this.element.width - frameWidth, 0, this.element.width, 0);
            gradient.addColorStop(0, "hsla(0, 0%, 0%, 0)");
            gradient.addColorStop(1, "hsla(0, 0%, 0%, 0.2)");
            this.context.fillStyle = gradient;
            this.context.fillRect(this.element.width - frameWidth, 0, this.element.width, this.element.height);
        }
    ,   Path = function(waves) {
            this.waves = waves;
            this.id = this.waves.paths.length;
            this.x = this.id * this.waves.pathWidth;
            this.drip = null;
            this.waveTop = 0;
            this.pathWaves = [];
            this.duck = (this.waves.display.duck.anchorX >= this.x) && (this.waves.display.duck.anchorX <= (this.x + this.waves.pathWidth)) ? this.waves.display.duck : null;
        }
    ,   PathWave = function(path, wave, height) {
            this.path = path;
            this.wave = wave;
            this.height = Math.max(0, height);
            this.path.waveTop += height;
        }
    ,   Sky = function(display, other) {
            this.display = display;
            if (other) {
                this.id = 1;
                this.element = document.querySelector("#sky1");
                this.other = other;
            } else {
                this.id = 0;
                this.element = document.querySelector("#sky0");
                this.other = new Sky(this.display, this);
            }
            this.hue = 360 * Math.random()
            this.element.width = this.element.clientWidth;
            this.element.height = this.element.clientHeight;
            this.context = this.element.getContext('2d');
        }
    ,   Wave = function(display, drip, x) {
            this.display = display;
            this.active = true;
            this.id = drip.id;
            this.drip = drip;
            this.source = this.drip.source;
            this.prevWave = this.source.lastWave || null;
            if (this.prevWave) {
                this.prevWave.nextWave = this;
            } else {
                this.source.firstWave = this;
            }
            this.nextWave = null;
            this.velocityFactor = this.drip.velocityFactor;
            this.x = x || this.drip.path.x;
            this.direction = (drip.source.dripAngle > 0) ? -1 : 1;
            this.height = 0;
            this.width = 0;
            this.sliceHeights = [];
            this.dripX = this.drip.x;
            this.dripY = Math.min(this.drip.element.height, this.drip.y + this.drip.height);
            this.drain = false;
        }
    ,   Waves = function(display) {
            var minPathWidth = 5
            ,   maxPathWidth = 10
            ;
            this.display = display;
            this.element = document.querySelector("#waves");
            this.pathWidth = Math.floor(minPathWidth + ((maxPathWidth - minPathWidth) * Math.random()));
            this.count = Math.floor(this.display.width/this.pathWidth);
            this.element.style.width = (this.pathWidth * this.count) + "px";
            this.element.width = this.element.clientWidth;
            this.element.height = this.element.clientHeight;
            this.left = Math.round((this.display.width - this.element.width)/2);
            this.element.style.left = this.left + "px";
            this.context = this.element.getContext('2d');
            this.paths = []
            while (this.paths.length < this.count) {
                this.paths.push(new Path(this));
            }
            this.maxHeight = 0.40 * this.element.height;
            this.minHeight = 0.20 * this.element.height;
            this.drainOpen = false;
        }
    ;
    Display.prototype = {
       draw: function(interval) {
            var distance = 0
            ,   currentDrip = this.dripSource.firstDrip || this.dripSource.other.firstDrip
            ;
            this.drips.context.clearRect(0, 0, this.drips.element.width, this.drips.element.height);
            if (!currentDrip) {
                display.dripSource.lastDrip = new Drip(this);
            }
            while (currentDrip) {
                if (currentDrip.reveal) {
                    this.drips.context.translate(currentDrip.path.x, this.drips.element.height);
                    this.drips.context.rotate(currentDrip.source.dripAngle);
                    this.drips.context.drawImage(currentDrip.element, currentDrip.x, currentDrip.y, currentDrip.width, currentDrip.reveal, 0, -1 * (currentDrip.distance + currentDrip.reveal), currentDrip.width, currentDrip.reveal);
                    this.drips.context.setTransform(1, 0, 0, 1, 0, 0);
                }
                currentDrip = currentDrip.nextDrip || (currentDrip.source.current ? currentDrip.source.other.firstDrip : null);
            }
            this.waves.context.clearRect(0, 0, this.waves.element.width, this.waves.element.height);
            this.waves.paths.forEach(function(path) {
                distance = this.waves.element.height;
                path.pathWaves.forEach(function(pathWave) {
                    this.waves.context.drawImage(pathWave.wave.source.element, pathWave.wave.dripX, pathWave.wave.dripY - pathWave.height, this.waves.pathWidth, pathWave.height, path.x, distance - pathWave.height, this.waves.pathWidth, pathWave.height);
                    distance -= pathWave.height;
                }, this);
                if (path.duck) {
                    path.duck.y = Math.min(0, path.duck.submerged - path.waveTop);
                    path.duck.angle = (path.waves.paths[path.id - 1].waveTop - path.waveTop) * Math.PI/(2 * this.waves.pathWidth);
                    path.duck.angle = ((path.waves.paths[path.id - 2].waveTop - path.waves.paths[path.id - 1].waveTop) + (path.waves.paths[path.id - 1].waveTop - path.waveTop) + (path.waveTop - path.waves.paths[path.id + 1].waveTop)) * Math.PI/(6 * this.waves.pathWidth);
                    path.duck.element.style.transform = "translate3d(-50%, -100%, 0) translateY(" + path.duck.y + "px) rotate(" + path.duck.angle + "rad)";
                    if (this.waves.drainOpen && (path.waveTop < this.waves.minHeight)) {
                        this.waves.drainOpen = false;
                    } else if (!this.waves.drainOpen && (path.waveTop > this.waves.maxHeight)) {
                        this.waves.drainOpen = true;
                    }
                }
            }, this);
        }
    }
    Drip.prototype = {
        advance: function(interval) {
            var travel = interval/this.velocityFactor
            ,   intersectingPathId = null
            ,   unreveal = 0
            ;
            unreveal = Math.max(0, travel - this.distance);
            this.distance = Math.max(0, this.distance - travel);
            if (this.wave) {
                this.wave.height += travel;
            } else {
                intersectingPathId = this.path.id + Math.floor(this.distance * Math.sin(this.source.dripAngle)/this.display.waves.pathWidth);
                if ((this.distance * Math.cos(this.source.dripAngle)) <= this.display.waves.paths[intersectingPathId].waveTop) {
                    this.wave = this.source.lastWave = new Wave(this.display, this, this.display.waves.paths[intersectingPathId].x);
                    this.wave.height = travel;
                }
            }
            unreveal += Math.max(0, travel - this.y);
            this.y = Math.max(0, this.y - travel);
            this.reveal = Math.max(0, this.reveal + travel - unreveal);
            if (this.reveal == 0) {
                this.deactivate();
            }
            if (this.nextDripTimeout) {
                this.timeSinceDrip += interval;
                if (this.timeSinceDrip > this.nextDripTimeout) {
                    if (this.source.current) {
                        this.source.lastDrip = new Drip(display, this.source, this.nextDripTimeout);
                    } else {
                        this.source.other.lastDrip = new Drip(display, this.source.other, this.nextDripTimeout);
                    }
                    this.nextDripTimeout = null;
                }
            }
        }
    ,   deactivate: function() {
            if (this.prevDrip) {
                this.prevDrip.nextDrip = this.nextDrip;
            } else {
                this.source.firstDrip = this.nextDrip;
            }
            if (this.nextDrip) {
                this.nextDrip.prevDrip = this.prevDrip;
            } else {
                this.source.lastDrip = this.prevDrip;
            }
            this.wave.drip = null;
            this.path.drip = null;
        }
    }
    DripSource.prototype = {
        swap: function() {
            var gradient = null
            ,   startHue = this.display.sky.hue + 60 + (60 * Math.random())
            ,   endHue = startHue + 60 + (60 * Math.random())
            ,   patternRoot = document.querySelector("#pattern")
            ,   gradient = null
            ,   patternContext = null
            ;
            this.other.dripAngle = (Math.PI/8) - (Math.PI * Math.random()/4);
            this.other.element.style.height = Math.ceil(this.display.height/Math.cos(this.other.dripAngle)) + "px";
            this.other.element.height = this.other.element.clientHeight;
            gradient = this.other.context.createLinearGradient(0, 0, this.other.element.width, 0);
            gradient.addColorStop(0, "hsla(" + startHue + ", 80%, 60%, 1)");
            gradient.addColorStop(1, "hsla(" + endHue + ", 80%, 60%, 1)");
            this.other.context.fillStyle = gradient;
            this.other.context.fillRect(0, 0, this.other.element.width, this.other.element.height);
            this.other.context.font = this.other.element.height/2 + "px sans-serif"
            this.other.context.textAlign = "center";
            this.other.context.textBaseline = "middle";
            this.other.context.fillStyle = "hsla(0, 0%, 0%, 0.05)";
            for (var i = 0; i < 16; i++) {
                this.other.context.fillText(String.fromCharCode(0x3400 + Math.floor(Math.random() * 0x19b5)), this.other.element.width * Math.random(), this.other.element.height * Math.random());
            }
            patternRoot.style.width = this.display.waves.pathWidth + "px";
            patternRoot.width = patternRoot.clientWidth;
            patternRoot.height = patternRoot.clientHeight;
            patternContext = patternRoot.getContext('2d');
            patternContext.fillStyle = "white";
            patternContext.fillRect(patternRoot.clientWidth - 1, 0, 1, patternRoot.clientHeight);
            this.other.context.fillStyle = this.other.context.createPattern(patternRoot, "repeat");
            this.other.context.fillRect(0, 0, this.other.element.width, this.other.element.height);
            gradient = this.other.context.createLinearGradient(0, 0, 0, this.other.element.height/10);
            gradient.addColorStop(0, "hsla(0, 0%, 100%, 1)");
            gradient.addColorStop(1, "hsla(0, 0%, 100%, 0)");
            this.other.context.fillStyle = gradient;
            this.other.context.globalCompositeOperation = "destination-out";
            this.other.context.fillRect(0, 0, this.element.width, this.element.height/10);
            this.other.context.globalCompositeOperation = "source-over";
            this.current = false;
            this.other.current = true;
            this.drainOpen = true;
            this.other.drainOpen = false;
            this.other.firstDrip = this.other.lastDrip = null;
            this.other.firstWave = this.other.lastWave = null;
            if (this.lastWave) {
                this.display.frontSky.style.pointerEvents = "none";
                this.display.frontSky.style.cursor = "default";
            } else {
                this.display.frontSky.style.pointerEvents = "auto";
                this.display.frontSky.style.cursor = "pointer";
            }
            return this.other;
        }
    }
    Duck.prototype = {
        sink: function(down) {
            if (down) {
                this.element.style.top = "120%";
            } else {
                this.element.style.top = "100%";
            }
        }
    ,   swap: function(givenItem) {
            this.item = (givenItem !== undefined) ? givenItem : Math.floor(8 * Math.random());
            this.context.clearRect(0, 0, this.element.width, this.element.height);
            this.context.drawImage(this.display.floaters, 128 * this.item, 0, 128, 128, 0, 0, this.element.width, this.element.height);
            return this;
        }
    }
    Sky.prototype = {
        swap: function() {
            var gradient = null
            ;
            this.other.hue = 360 * Math.random();
            gradient = this.other.context.createLinearGradient(0, 0, 0, this.other.element.height);
            gradient.addColorStop(0, "hsl(" + this.other.hue + ", 40%, 10%)");
            gradient.addColorStop(0.3, "hsl(" + this.other.hue + ", 40%, 20%)");
            gradient.addColorStop(1, "hsl(" + this.other.hue + ", 40%, 60%)");
            this.other.context.fillStyle = gradient;
            this.other.context.fillRect(0, 0, this.element.width, this.element.height);
            if (this.other.id) {
                this.other.element.style.opacity = 1;
            } else {
                this.element.style.opacity = 0;
            }
            return this.other;
        }
    }
    Wave.prototype = {
        advance: function(interval) {
            var travel = interval/this.velocityFactor
            ,   direction = this.direction
            ,   nextId = 0
            ,   slices = 0
            ,   currentPath = null
            ,   sliceIndex = 0
            ,   drain = false
            ;
            if (this.drip) {
                this.width += travel;
                slices = Math.ceil(this.width/this.display.waves.pathWidth);
                if (slices > this.sliceHeights.length) {
                    this.sliceHeights = [];
                    for (var slice = 0; slice < slices; slice++) {
                        this.sliceHeights.push(Math.sin(Math.PI * (slice + 0.5)/slices) * this.height * Math.PI/(2 * slices));
                    }
                }
            } else {
                this.x += direction * travel;
                if (this.x < 0) {
                    if (this.drain) {
                        this.deactivate();
                    } else {
                        this.x *= -1;
                        direction = this.direction *= -1;
                        this.drain = this.source.drainOpen || this.display.waves.drainOpen;
                    }
                } else if (this.x > this.display.waves.element.width) {
                    if (this.drain) {
                        this.deactivate();
                    } else {
                        this.x = (2 * this.display.waves.element.width) - this.x;
                        direction = this.direction *= -1;
                        this.drain = this.source.drainOpen || this.display.waves.drainOpen;
                    }
                }
            }
            if (this.active) {
                currentPath = this.display.waves.paths[Math.floor(this.x/this.display.waves.pathWidth)];
                sliceIndex = 0
                while ((sliceIndex < this.sliceHeights.length) && !drain) {
                    currentPath.pathWaves.push(new PathWave(currentPath, this, this.sliceHeights[sliceIndex]));
                    nextId = currentPath.id + direction;
                    if (nextId < 0) {
                        if (this.drain) {
                            drain = true;
                        } else {
                            nextId = 0;
                            direction = 1;
                        }
                    } else if (nextId >= this.display.waves.count) {
                        if (this.drain) {
                            drain = true;
                        } else {
                            nextId = this.display.waves.count - 1;
                            direction = -1;
                        }
                    }
                    currentPath = this.display.waves.paths[nextId]
                    sliceIndex++;
                }
            }
        }
    ,   deactivate: function() {
            this.active = false;
            if (this.prevWave) {
                this.prevWave.nextWave = this.nextWave;
            } else {
                this.source.firstWave = this.nextWave;
            }
            if (this.nextWave) {
                this.nextWave.prevWave = this.prevWave;
            } else {
                this.source.lastWave = this.prevWave;
            }
            if (!this.source.current && !this.source.lastWave) {
                this.display.frontSky.style.pointerEvents = "auto";
                this.display.frontSky.style.cursor = "pointer";
            }
        }
    }
    Waves.prototype = {
        clearWaves: function() {
            this.paths.forEach(function(path) {
                path.waveTop = 0;
                path.pathWaves = [];
            }, this);
        }
    ,   getDripPath: function(drip, givenPath) {
            var path = givenPath || Math.floor(this.count * Math.random())
            ;
            if (this.paths[path].drip) {
                return this.getDripPath(drip, (path + 1) % this.count);
            } else {
                this.paths[path].drip = drip;
                return this.paths[path];
            }
        }
    }
    return new Display();
}
function initialize() {
    canvasRoot.addEventListener("click", function(e) {
        if (e.target.classList.contains("frontSky")) {
            display.sky = display.sky.swap();
            display.dripSource = display.dripSource.swap();
        } else if (e.target.classList.contains("duckLike")) {
            display.duck.sink(true);
        }
    }, false);
    canvasRoot.addEventListener("transitionend", function(e) {
		if (e.target.classList.contains("duckLike")) {
            if (e.target.style.top != "100%") {
                display.duck.swap();
                display.duck.sink(false);
            }
        }
    }, false);
}
function animationLoop(ts) {
    var interval = ts - priorTimestamp
    ,   currentDrip = display.dripSource.firstDrip || display.dripSource.other.firstDrip
    ,   currentWave = display.dripSource.other.firstWave || display.dripSource.firstWave
    ;
    priorTimestamp = ts;
    if (interval < 1000) {
        display.waves.clearWaves();
        while (currentWave) {
            currentWave.advance(interval);
            currentWave = currentWave.nextWave || (currentWave.source.current ? null : currentWave.source.other.firstWave);
        }
        while (currentDrip) {
            currentDrip.advance(interval);
            currentDrip = currentDrip.nextDrip || (currentDrip.source.current ? currentDrip.source.other.firstDrip : null);
        }
        display.draw(interval);
    }
	animationId = window.requestAnimationFrame(animationLoop);
}
initialize();
})();
