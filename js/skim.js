(function() {
"use strict";
    
var requestAnimFrame = window.requestAnimationFrame || 
    window.mozRequestAnimationFrame || 
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;
    
var canvasRoot = document.querySelector(".canvas")
,   animationId = null
,   screenHeight = 0
,   screenWidth = 0
,   priorTimestamp = 0
,   world = null
;
window.onload = function() {
	proportionElements();
    animationId = requestAnimFrame(animationLoop);
}
window.onresize = function() {
    proportionElements();
    world.buoys.forEach(function(buoy) {
        buoy.frame.style.opacity = 0;
        buoy.deleting = true;
    });
}
function createBuoy(world) {
    var buoySourceWidth = 10
    ,   buoyBorderWidth = 3
    ,   Buoy = function(world) {
            var position = {}
            ;
            this.world = world;
            this.id = world.buoys.length;
            this.distance = this.baseDistance = world.altitude;
            this.altitude = world.altitude * 1.05;
            this.lateralDistance = this.id ? (95 - (Math.random() * 190)) : (20 - (Math.random() * 40));
            this.frame = canvasRoot.appendChild(document.querySelector("#buoyFrame").cloneNode(true));
            this.frame.id = "buoyFrame" + this.id;
            this.frame.setAttribute("data-id",this.id);
            position = this.screenPosition(this.baseDistance, this.lateralDistance);
            this.left = position.left;
            this.top = position.top;
            this.frame.style.left = this.left + "px";
            this.frame.style.top = this.top + "px";
            this.context = this.frame.firstElementChild.getContext("2d");
            this.context.canvas.setAttribute("data-id",this.id);
            this.width = this.context.canvas.width = Math.round(screenWidth/4);
            this.height = this.context.canvas.height = this.width;
            this.centerX = Math.round(this.width/2);
            this.centerY = Math.round(this.height/2);
            this.paneWidth = Math.round(this.width/Math.sqrt(2));
            this.paneStart = Math.round(this.paneWidth/-2);
            this.source = new BuoySource(this);
            this.panes = []
            for (var i = 0; i < 25; i++) {
                this.panes.push(new Pane(this));
            }
            (function(buoy) {
                setTimeout(function() { buoy.frame.style.opacity = 1; }, 500);
            })(this);
            this.world.buoyCount++;
            this.deleting = false;
        }
    ,   BuoySource = function(buoy) {
            this.buoy = buoy;
            this.context = canvasRoot.appendChild(document.querySelector("#hiddensrc").cloneNode(false)).getContext("2d");
            this.width = this.context.canvas.width = buoySourceWidth;
            this.height = this.context.canvas.height = this.width;
            this.hue = buoy.world.land.scape.hue + (20 - Math.round(Math.random() * 40));
            this.draw();
        }
    ,   Pane = function(buoy) {
            this.buoy = buoy;
            this.rotation = Math.random() * Math.PI;
            this.rotationStep = (Math.random() < 0.5 ? -1 : 1) * (0.3 + (Math.random() * 0.3));
            this.growing = (Math.random() < 0.5);
            this.resetSkew();
            this.alpha = 0.1 + (Math.random() * 0.3);
        }
    ;
    Buoy.prototype = {
        delete: function() {
            canvasRoot.removeChild(this.frame);
            this.world.buoyCount--;
        }
    ,   draw: function() {
            this.context.setTransform(1,0,0,1,0,0);
            this.context.clearRect(0, 0, this.width, this.height);
            this.panes.forEach( function(pane) {
                pane.draw();
                pane.evolve();
            });
        }
    ,   move: function() {
            var newDistance = Math.max(this.baseDistance/2,
                    this.distance + ((Math.random() < 0.5 ? -1 : 1) * Math.round(Math.random() * this.baseDistance/3)))
            ,   newLateralDistance = Math.max(-95, Math.min(95,
                    this.lateralDistance + ((Math.random() < 0.5 ? -1 : 1) * Math.round(Math.random() * 33))))
            ,   position = {}
            ;
            this.frame.style.zIndex = Math.floor(this.distance);
            position = this.screenPosition(newDistance, newLateralDistance);
            this.frame.style.transition = "transform " + Math.round(5 + (Math.random() * 5)) + "s ease-in-out " +
                Math.round(1 + (Math.random() * 3)) + "s, opacity 1s ease-in";
            this.frame.style.transform = "translate3d(" + (position.left - this.left) + "px, " +
                (position.top - this.top) + "px, 0) scale(" + (position.trueDistance/this.baseDistance) + ")";
            this.distance = newDistance;
            this.lateralDistance = newLateralDistance;
        }
    ,   screenPosition: function(distance, lateralDistancePercent) {
            var position = {}
            ,   lateralDistanceLimit = distance * screenWidth/(2 * this.world.screenDistance)
            ;
            position.top = screenHeight -
                (((this.altitude - this.world.altitude) * this.world.screenDistance/distance) + this.world.eyeHeight);
            position.left =
                (screenWidth/2) + (lateralDistanceLimit * (lateralDistancePercent/100) * this.world.screenDistance/distance);
            position.trueDistance =
                Math.sqrt(Math.pow(distance,2) + Math.pow(lateralDistancePercent * lateralDistanceLimit/100, 2));
            return position;
        }
    }
    BuoySource.prototype = {
        draw: function() {
            var halfBorderWidth = Math.round(buoyBorderWidth/2)
            ,   centerLuminosity = 100 - (this.buoy.world.paneEvolveFactor * 50)
            ;
            this.context.fillStyle = "hsl(" + (this.hue + 60) + ", 100%, " + centerLuminosity + "%)";
            this.context.fillRect(0, 0, this.width, this.height);
            this.context.lineWidth = buoyBorderWidth;
            this.context.strokeStyle = "hsl(" + (this.hue + 120) + ", 100%, 50%)";
            this.context.beginPath();
            this.context.moveTo(halfBorderWidth, halfBorderWidth);
            this.context.lineTo(-1 * buoyBorderWidth, buoySourceWidth + buoyBorderWidth);
            this.context.lineTo(buoySourceWidth - halfBorderWidth, buoySourceWidth - halfBorderWidth);
            this.context.lineTo(buoySourceWidth + buoyBorderWidth, -1 * buoyBorderWidth);
            this.context.closePath();
            this.context.stroke();
        }
    }
    Pane.prototype = {
        draw: function() {
            var scale = 1 - this.skew
            ;
            this.buoy.context.setTransform(1, 0, 0, 1, this.buoy.centerX, this.buoy.centerY);
            this.buoy.context.rotate(this.rotation);
            this.buoy.context.transform(scale, this.skew, this.skew, scale, 0, 0);
            this.buoy.context.scale(this.scale, this.scale);
            this.buoy.context.globalAlpha = this.alpha;
            this.buoy.context.drawImage
            (   this.buoy.source.context.canvas
            ,   0, 0, this.buoy.source.height, this.buoy.source.height
            ,   this.buoy.paneStart, this.buoy.paneStart, this.buoy.paneWidth, this.buoy.paneWidth);
        }
    ,   evolve: function() {
            this.rotation += (this.buoy.world.paneEvolveFactor * this.rotationStep);
            if ((this.growing && (this.endScale <= this.scale)) || (!this.growing && (this.endScale >= this.scale))) {
                this.resetSkew(this.skew, this.scale);
            } else {
                this.scale += (this.buoy.world.paneEvolveFactor * this.scaleStep);
                this.skew += (this.buoy.world.paneEvolveFactor * this.skewStep);
            }
            if (this.buoy.world.paneEvolveFactor < 1) {
                this.buoy.source.draw();
            }
        }
    ,   resetSkew: function(currentSkew, currentScale) {
            var minScale = 0.3
            ,   maxScale = 1
            ,   minSkew = 0.30
            ,   maxSkew = 0.47
            ;
            this.scale = currentScale || (minScale + (Math.random() * (maxScale - minScale)));
            if (this.growing) {
                this.growing = false;
                this.endScale = minScale + (Math.random() * (this.scale - minScale));
            } else {
                this.growing = true;
                this.endScale = this.scale + (Math.random() * (maxScale - this.scale));
            }
                
            this.skew = currentSkew || (minSkew + (Math.random() * (maxSkew - minSkew)));
            if (this.growing) {
                this.endSkew = this.skew + (Math.random() * (maxSkew - this.skew));
            } else {
                this.endSkew = minSkew + (Math.random() * (this.skew - minSkew));
            }
            this.stepsRemaining = Math.floor(10 + (Math.random() * 90));
            this.scaleStep = (this.endScale - this.scale)/this.stepsRemaining;
            this.skewStep = (this.endSkew - this.skew)/this.stepsRemaining;
        }  
    }
    return new Buoy(world);
}
function createLand(world) {
    var Land = function(world) {
            this.world = world;
            this.context = document.querySelector("#land").getContext("2d");
            this.width = this.context.canvas.width = screenWidth;
            this.height = this.context.canvas.height =
                Math.round(world.eyeHeight * world.horizonCutoffPercentage/100);
            this.context.canvas.style.top = (screenHeight - this.height) + "px";
            this.sliceHeight = 1;
            this.skyScape = false;
            this.scape = createScape(this);
            this.context.canvas.style.backgroundColor =  "hsl(" + (this.scape.hue + 180) + ",100%, 15%)";
            this.scape.draw();
        }
    ;
    Land.prototype = {
        delete: function() {
            canvasRoot.removeChild(this.scape.context.canvas);
        }
    ,   draw() {
            var travelY = 0
            ,   travelHeight = 0
            ;
            this.context.setTransform(1,0,0,1,0,0);
            this.context.clearRect(0, 0, this.width, this.height);
            this.scape.slices.forEach( function(slice) {
                if (slice.scape.parent.world.forwards) {
                    travelY = (slice.sourceY + slice.scape.parent.world.totalTravel) % slice.scape.height;
                } else {
                    travelY = (slice.scape.height +
                        (slice.sourceY - slice.scape.parent.world.totalTravel) % slice.scape.height) % slice.scape.height;
                }
                if ((travelY + slice.sourceHeight) > slice.scape.height) {
                    travelHeight = slice.scape.height - travelY;
                    slice.draw(travelY, travelHeight);
                    slice.draw( 0, slice.sourceHeight - travelHeight);
                } else {
                    slice.draw(travelY, slice.sourceHeight);
                }
            });
        }
    }
    return new Land(world);
}
function createScape(parent) {
    var Scape = function(parent) {
            var scapeXMultiplier = parent.skyScape ? 0.5 : 3
            ,   scapeYMultiplier = parent.skyScape ? 0.5 : 5
            ,   patternCount = parent.skyScape ? 2 : 30
            ,   fontSizeFactor = parent.skyScape ? 2 : 0.5
            ,   lineWidthFactor = parent.skyScape ? 100 : 200
            ;
            this.parent = parent;
            this.context = canvasRoot.appendChild(document.querySelector("#hiddensrc").cloneNode(false)).getContext("2d");
            this.width = this.context.canvas.width = Math.round(screenWidth * scapeXMultiplier);
            this.height = this.context.canvas.height = Math.round(screenHeight * scapeYMultiplier);
            this.context.canvas.style.height = this.height + "px";
            this.context.font = Math.round(this.width * fontSizeFactor) + "px Times New Roman, Times, serif";
            this.context.textBaseline = "middle";
            this.context.textAlign = "center";
            this.context.lineWidth = Math.round(this.width/lineWidthFactor);
            this.resetHue();
            this.generateSlices();
            this.patterns = [];
            for (var i = 0; i < patternCount; i++) {
                this.patterns.push(new Pattern(this));
            }
            this.hueReset = false;
        }
    ,   Pattern = function(scape) {
            this.scape = scape;
            this.x = Math.floor(Math.random() * this.scape.width);
            this.y = Math.floor(Math.random() * this.scape.height);
            this.rotation = Math.random() * 2 * Math.PI;
            this.alpha = scape.parent.skyScape ? 0.2 : 1;
            this.fill = Math.random() < 0.5;
            this.hueOffset = 30 - Math.floor(Math.random() * 60);
            this.saturation = 40 + Math.floor(Math.random() * 30);
            this.letter = String.fromCharCode(0x3400 + Math.floor(Math.random() * 0x19b5));
        }
    ;
    Scape.prototype = {
        draw: function() {
            var alphaIncrement = 0.1
            ,   color = ""
            ;
            this.context.setTransform(1,0,0,1,0,0);      
            this.context.clearRect(0, 0, this.width, this.height);      
            this.patterns.forEach( function(pattern) {
                color = "hsl(" + (pattern.scape.hue + pattern.hueOffset) + "," + pattern.saturation + "%, 60%)";
                pattern.scape.context.setTransform(1,0,0,1,0,0);      
                pattern.scape.context.translate(pattern.x, pattern.y);
                pattern.scape.context.rotate(pattern.rotation);
                pattern.scape.context.globalAlpha = pattern.alpha;
                if (pattern.fill) {
                    pattern.scape.context.fillStyle = color;
                    pattern.scape.context.fillText(pattern.letter, 0, 0);
                } else {
                    pattern.scape.context.strokeStyle = color;
                    pattern.scape.context.strokeText(pattern.letter, 0, 0);
                }
            });
        }
    ,   generateSlices: function() {
            var startSlice = null
            ,   widthFactorMultiplier = parent.skyScape ? 0.1 : 0.5
            ,   heightFactorMultiplier = parent.skyScape ? 0.1 : 0.5
            ,   widthFactor = 0
            ,   heightFactor = 0
            ;
            this.slices = [];
            startSlice = createSlice(this, 0);
            widthFactor = widthFactorMultiplier * screenWidth/startSlice.actualWidth;
            heightFactor = heightFactorMultiplier * this.parent.sliceHeight/startSlice.actualHeight;
            for (var d = 0; d <= this.parent.height; d += this.parent.sliceHeight) {
                this.slices.push(createSlice(this, d, widthFactor, heightFactor));
            }
        }
    ,   resetHue: function() {
            this.hue = this.parent.skyScape ? (this.parent.world.land.scape.hue + 180) : Math.floor(Math.random() * 360);
        }
    }
    return new Scape(parent);
}
function createSlice(scape, distanceFromScreenBottom, widthFactor, heightFactor) {
    var Slice = function(scape, distanceFromScreenBottom, widthFactor, heightFactor) {
            var useEyeHeight =
                    scape.parent.skyScape ? screenHeight - scape.parent.world.eyeHeight : scape.parent.world.eyeHeight
            ,   useAltitude = (scape.parent.skyScape ? 10 : 1) * scape.parent.world.altitude
            ,   closestY = scape.parent.world.altitude * scape.parent.world.screenDistance/useEyeHeight
            ;
            this.scape = scape;
            this.actualY = useAltitude * scape.parent.world.screenDistance/
                (useEyeHeight - distanceFromScreenBottom);
            this.actualHeight = (useAltitude * scape.parent.world.screenDistance/
                (useEyeHeight - (distanceFromScreenBottom + scape.parent.sliceHeight))) - this.actualY;
            this.actualWidth = (screenWidth/scape.parent.world.screenDistance) * (this.actualY + (this.actualHeight/2));
            if (widthFactor && heightFactor) {
                this.sourceY = Math.round((this.actualY - closestY) * heightFactor);
                this.sourceHeight = Math.ceil(this.actualHeight * heightFactor);
                this.sourceWidth = Math.round(this.actualWidth * widthFactor);
                if (this.sourceWidth >= scape.width) {
                    this.sourceX = 0;
                    this.sourceWidth2 = Math.min(scape.width, Math.round((this.sourceWidth - scape.width)/2));
                    this.sourceX3 = scape.width - this.sourceWidth2;
                    this.destinationWidth = Math.round(screenWidth * scape.width/this.sourceWidth);
                    this.destinationX = this.destinationWidth2 = Math.round((screenWidth - this.destinationWidth)/2);
                    this.destinationWidth3 = -1 * this.destinationWidth2;
                    this.destinationX2 = -1 * this.destinationX;
                    this.destinationX3 = -1 * (this.destinationX + this.destinationWidth);
                    this.sourceWidth = scape.width;
                } else {
                    this.sourceX = Math.round((scape.width - this.sourceWidth)/2);
                    this.destinationX = 0;
                    this.destinationWidth = screenWidth;
                    this.sourceWidth2 = this.sourceX3 = this.destinationWidth2 = this.destinationX2 =
                        this.destinationX3 = 0;
                }
                this.destinationY = scape.parent.height - (distanceFromScreenBottom + scape.parent.sliceHeight);
                this.destinationHeight = scape.parent.sliceHeight;
            }
        }
    ;
    Slice.prototype = {
        draw: function(travelY, travelHeight) {
            this.scape.parent.context.setTransform(1,0,0,1,0,0);
            if (this.scape.parent.skyScape) {
                this.scape.parent.context.translate(0, this.scape.parent.height);
                this.scape.parent.context.scale(1, -1);
            }
            this.scape.parent.context.drawImage
            (   this.scape.context.canvas
            ,   this.sourceX
            ,   travelY
            ,   this.sourceWidth
            ,   travelHeight
            ,   this.destinationX
            ,   this.destinationY
            ,   this.destinationWidth
            ,   this.destinationHeight);
            if (this.sourceWidth2) {
                this.scape.parent.context.scale(-1, 1);
                this.scape.parent.context.drawImage
                (   this.scape.context.canvas
                ,   0
                ,   travelY
                ,   this.sourceWidth2
                ,   travelHeight
                ,   this.destinationX2
                ,   this.destinationY
                ,   this.destinationWidth2
                ,   this.destinationHeight);
                this.scape.parent.context.drawImage
                (   this.scape.context.canvas
                ,   this.sourceX3
                ,   travelY
                ,   this.sourceWidth2
                ,   travelHeight
                ,   this.destinationX3
                ,   this.destinationY
                ,   this.destinationWidth3
                ,   this.destinationHeight);
            }
        }
    }
    return new Slice(scape, distanceFromScreenBottom, widthFactor, heightFactor);
}
function createSky(world) {
    var Sky = function(world) {
            this.world = world;
            this.element = document.querySelector("#sky");
            this.context = document.querySelector("#skycanvas").getContext("2d");
            this.width = this.context.canvas.width = screenWidth;
            this.element.style.height = (screenHeight - world.land.height) + "px";
            this.height = this.context.canvas.height = Math.round(screenHeight - world.eyeHeight);
            this.element.style.width = this.context.canvas.style.width = this.width + "px";
            this.context.canvas.style.height = this.height + "px";
            this.setBackground();
            this.sliceHeight = 1;
            this.skyScape = true;
            this.scape = createScape(this);
            this.scape.draw();
        }
    ;
    Sky.prototype = {
        delete: function() {
            canvasRoot.removeChild(this.scape.context.canvas);
        }
    ,   draw() {
            var travelY = 0
            ,   travelHeight = 0
            ;
            this.context.setTransform(1,0,0,1,0,0);
            this.context.clearRect(0, 0, this.width, this.height);
            this.scape.slices.forEach( function(slice) {
                if (slice.scape.parent.world.forwards) {
                    travelY = (slice.sourceY + slice.scape.parent.world.totalTravel) % slice.scape.height;
                } else {
                    travelY = (slice.scape.height +
                        (slice.sourceY - slice.scape.parent.world.totalTravel) % slice.scape.height) % slice.scape.height;
                }
                if ((travelY + slice.sourceHeight) > slice.scape.height) {
                    travelHeight = slice.scape.height - travelY;
                    slice.draw(travelY, travelHeight);
                    slice.draw( 0, slice.sourceHeight - travelHeight);
                } else {
                    slice.draw(travelY, slice.sourceHeight);
                }
            });
        }
    ,   setBackground: function() {
            this.element.style.background =
                "linear-gradient(black, black 95%, hsla(" + world.land.scape.hue + ", 100%, 50%, 1))"
        }
    }
    return new Sky(world);
}
function createWorld() {
    var World = function() {
            var minAltitude = 1000
            ,   maxAltitude = 5000
            ;
            this.eyeHeight = screenHeight * (0.3 +(Math.random() * 0.3))
            this.altitude = minAltitude + (Math.random() * (maxAltitude - minAltitude))
            this.screenDistance = this.altitude/2
            this.horizonCutoffPercentage = 94
            this.land = createLand(this);
            this.sky = createSky(this);
            this.paneEvolveFactor = 1;
            this.buoyCount = 0;
            this.buoys = [];
            this.buoys.push(createBuoy(this));
            this.totalTravel = 0;
            this.minSpeed = 20;
            this.maxSpeed = 80;
            this.speed = this.minSpeed + (Math.random() * (this.maxSpeed - this.minSpeed));
            this.forwards = (Math.random() < 0.5);
            this.dampen = false;
            this.hueReset = true;
            this.timedResetID = 0;
            this.setReset();
        }
    ;
    World.prototype = {
        delete: function() {
            this.sky.delete();
            this.land.delete();
        }
    ,   deleteDuplicateBuoys: function() {
            this.buoys.forEach(function(buoy) {
                if (buoy.id) {
                    buoy.frame.style.opacity = 0;
                    buoy.deleting = true;
                }
            });
        }
    ,   draw: function(interval) {
            var minPaneEvolveFactor = 0.1
            ,   dampenFactor = 0.95
            ;
            this.totalTravel += Math.round(interval * this.speed/(100 * this.paneEvolveFactor));
            if (!this.dampen && (this.paneEvolveFactor < 1)) {
                this.paneEvolveFactor /= dampenFactor;
            } else if (this.dampen && (this.paneEvolveFactor > minPaneEvolveFactor)) {
                this.paneEvolveFactor *= dampenFactor;
            } else if (this.hueReset && (this.paneEvolveFactor <= minPaneEvolveFactor)) {
                this.dampen = false;
                if (this.land.scape.hueReset) {
                    this.land.scape.resetHue();
                    this.land.scape.draw();
                    this.sky.setBackground();
                    this.sky.scape.resetHue();
                    this.sky.scape.draw();
                    this.land.scape.hueReset = false;
                    this.deleteDuplicateBuoys();
                }
                this.buoys.forEach( function(buoy) {
                    if (!buoy.deleting) {
                        buoy.source.hue = buoy.world.land.scape.hue;
                    }
                });
                this.hueReset = false;
            }
            this.sky.draw();
            this.land.draw();
            this.buoys.forEach(function(buoy) {
                buoy.draw();
            });
        }
    ,   reset: function() {
            this.land.scape.hueReset = true;
            this.dampen = true;
            this.hueReset = true;
            this.setReset();
        }
    ,   setReset: function() {
            if (this.timedResetID) {
                clearTimeout(this.timedResetID);
            }
            (function(world) {
                world.timedResetID = setTimeout(function() { world.reset(); }, 60000);
            })(this);
        }
    }
    return new World();
}
function initialize() {
    var dataId = ""
    ;
    canvasRoot.addEventListener("transitionend", function(e) {
		if (e.target.classList.contains("buoyFrame")) {
            dataId = e.target.getAttribute("data-id");
            if (e.propertyName == "transform") {
                world.buoys[dataId].move();
            } else if (e.propertyName == "opacity") {
                if (e.target.style.opacity == 1) {
                    world.buoys[dataId].move();
                } else {
                    world.buoys[dataId].delete();
                    delete world.buoys[dataId];
                }
            }
        }
    }, false);
    canvasRoot.addEventListener("mouseout", function(e) {
		if (e.target.classList.contains("buoy")) {
            world.dampen = false;
        }
    }, false);
    canvasRoot.addEventListener("mouseover", function(e) {
		if (e.target.classList.contains("buoy")) {
            world.dampen = true;
        }
    }, false);
    canvasRoot.addEventListener("click", function(e) {
		if (e.target.classList.contains("land")) {
            world.reset();
        } else if (e.target.classList.contains("buoy")) {
            world.buoys.push(createBuoy(world));
        }
    }, false);
}
function proportionElements() {
    screenHeight = document.documentElement.clientHeight;
    screenWidth = document.documentElement.clientWidth;
}
function animationLoop(ts) {
    var interval = ts - priorTimestamp
    ;
    priorTimestamp = ts;
    if (!world) {
        world = createWorld();
    } else if (world.buoyCount) {
        world.draw(interval);
    } else {
        world.delete();
        world = null;
    }
	animationId = requestAnimFrame(animationLoop);
}
initialize();
})();
