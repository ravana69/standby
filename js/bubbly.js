(function() {
"use strict";

const canvasRoot = document.querySelector(".canvas")
;
let animationId = null
,   priorTimestamp = 0
,   display = null
;
window.onload = function() {
    display = createDisplay();
    animationId = window.requestAnimationFrame(animationLoop);
}
window.onresize = function() {
    display.delete();
    display = createDisplay();
}
function createDisplay() {
    const glassRoot = document.querySelector("#glassRoot")
    ;
    var glassCount = 0
    ,   flowCount = 0
    ,   liquidCount = 0
    ,   nodeCount = 0
    ,   bubbleCount = 0
    ,   liquidHue = 360 * Math.random()
    ,   hueIncrement = (Math.random() < 0.5) ? -15 : 15
    ,   liquidSaturation = 100
    ,   saturationIncrement = -5
    ,   minGlassAspect = 0.4
    ,   maxGlassAspect = 0.9
    ,   Display = function() {
            const minSide = 64
            ;
            let maxGlassWidth = 0
            ,   maxGlassHeight = 0
            ;
            this.element = canvasRoot;
            // this.width = this.element.clientWidth;
            // this.height = this.element.clientHeight;
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.aspect = this.width/this.height;
            this.volume = this.width * this.height;
            this.minSide = Math.max(minSide, Math.ceil(Math.min(this.width, this.height)/8));
            this.background = new Background(this).draw();
            this.maxVolume = 8 * this.minSide * this.minSide;
            this.lightDirection = (Math.random() < 0.5) ? 0.4 : 0.6;
            this.sourceGlass = new Glass(this);
            this.glasses = shuffle(this.splitGlass(this.sourceGlass));
            this.glasses.forEach(function(glass) {
                glass.activate();
                maxGlassWidth = Math.max(maxGlassWidth, glass.width);
                maxGlassHeight = Math.max(maxGlassHeight, glass.height);
            });
            this.glassesDrawn = 0;
            this.bubbles = new Bubbles(this, maxGlassWidth, maxGlassHeight);
            this.maxGlassCount = Math.floor(0.5 * this.glasses.length);
            this.addFlow = true;
            this.addFlowInterval = 10000;
            this.maxNodeCount = 0.5;
        }
    ,   Background = function(display) {
            const columnCountFactor = Math.floor((display.width/(2 * display.minSide)) + (3 * Math.random()))
            ,   cubeFactor = Math.sqrt(3)/2
            ;
            let hexSize = 0
            ;
            this.display = display;
            this.element = document.querySelector("#background");
            this.context = this.element.getContext('2d');
            this.element.width = this.element.clientWidth;
            this.element.height = this.element.clientHeight;
            this.columnCount = Math.ceil(columnCountFactor * this.element.width/this.element.height);
            this.lineWidth = Math.round(this.element.width/(10 * this.columnCount));
            this.luminosity0 = 25;
            this.luminosity1 = 28;
            this.fieldElement = document.querySelector("#patternField");
            this.fieldContext = this.fieldElement.getContext('2d');
            this.fieldElement.width = this.fieldElement.clientWidth;
            this.fieldElement.height = this.fieldElement.clientHeight;
            this.patternElement = document.querySelector("#patternElement");
            this.patternContext = this.patternElement.getContext('2d');
            this.patternElement.style.width = this.patternElement.style.height = (this.element.width/this.columnCount) + "px";
            this.patternElement.width = this.patternElement.clientWidth;
            this.patternElement.height = this.patternElement.clientHeight;
            this.patternContext.strokeStyle = "hsl(0, 0%, " + this.luminosity1 + "%)";
            this.patternContext.lineWidth = this.lineWidth
            this.patternContext.translate(this.patternElement.width/2, this.patternElement.height/2);
            this.patternContext.beginPath();
            hexSize = 0.8 * this.patternElement.width/2
            this.patternContext.moveTo(0, -1 * hexSize);
            this.patternContext.lineTo(cubeFactor * hexSize, hexSize/-2);
            this.patternContext.lineTo(cubeFactor * hexSize, hexSize/2);
            this.patternContext.lineTo(0, hexSize);
            this.patternContext.lineTo(-1 * cubeFactor * hexSize, hexSize/2);
            this.patternContext.lineTo(-1 * cubeFactor * hexSize, hexSize/-2);
            this.patternContext.closePath();
            this.patternContext.stroke();
            this.patterns = [];
        }
    ,   Bubbles = function(display, width, height) {
            const density = 0.002
            ,   minRadius = 1
            ,   radiusIncrement = 2
            ;
            let x = 0
            ,   y = 0
            ,   radius = 0
            ;
            this.display = display;
            this.element = document.querySelector("#bubbles");
            this.context = this.element.getContext('2d');
            this.element.style.width = 2 * width + "px";
            this.element.style.height = 3 * height + "px";
            this.element.width = this.element.clientWidth;
            this.element.height = this.element.clientHeight;
            this.maxStartX = width;
            this.maxStartY = height;
            this.context.fillStyle = "hsla(0, 100%, 100%, 0.5)"
            for (let i = 0; i < this.element.width * this.element.height * density; i++) {
                x = this.element.width * Math.random();
                y = this.element.height * Math.random();
                radius = minRadius + (radiusIncrement * Math.random());
                this.context.beginPath();
                this.context.arc(x, y, radius, 0, 2 * Math.PI)
                this.context.closePath();
                this.context.fill();
            }
        }
    ,   Flow = function(liquid, sourceNode, target, volume) {
            this.id = flowCount++;
            this.liquid = liquid;
            this.prevFlow = this.liquid.lastFlow || null;
            if (this.prevFlow) {
                this.prevFlow.nextFlow = this;
            } else {
                this.liquid.firstFlow = this;
            }
            this.liquid.lastFlow = this;
            if (sourceNode) {
                if (!sourceNode.isTarget) {
                    sourceNode.flow.source = null;
                }
                this.source = sourceNode;
                this.source.flow = this;
                this.source.isTarget = false;
                this.source.volume = volume || this.source.volume;
            } else {
                this.source = new Node(this, this.liquid.display.sourceGlass, volume);
            }
            this.lastTarget = new Node(this, target, null);
            this.flowRate = 0;
        }
    ,   Glass = function(display, parent, width, height) {
            this.display = display;
            this.parent = parent || null;
            if (this.parent) {
                this.x = Math.round((width > 0) ? this.parent.x : (this.parent.x + this.parent.width + width));
                this.y = Math.round((height > 0) ? this.parent.y : (this.parent.y + this.parent.height + height));
                this.width = Math.round(Math.abs(width));
                this.height = Math.round(Math.abs(height));
                this.parent.children.push(this);
            } else {
                this.x = this.y = 0;
                this.width = this.display.width;
                this.height = this.display.height;
            }
            this.capacity = this.width * this.height;
            this.children = [];
        }
    ,   GlassBubbles = function(glass) {
            this.glass = glass;
            this.alpha = 0.1;
            this.id = bubbleCount++;
            this.x = -1 * (this.id % 2) * this.glass.display.bubbles.maxStartX;
            this.y = -1 * Math.floor(this.glass.display.bubbles.maxStartY * Math.random());
            this.yLimit = this.glass.height - this.glass.display.bubbles.element.height;
            this.velocity = 0.02 * (1 + (this.id % 2) + Math.random());
            this.duration = 0;
        }
    ,   Liquid = function(display, target) {
            this.display = display;
            this.id = liquidCount++;
            this.prevLiquid = this.display.lastLiquid || null;
            if (this.prevLiquid) {
                this.prevLiquid.nextLiquid = this;
            } else {
                this.display.firstLiquid = this;
            }
            this.display.lastLiquid = this;
            this.hue = liquidHue;
            liquidHue += hueIncrement;
            this.saturation = liquidSaturation;
            liquidSaturation += saturationIncrement;
            if (liquidSaturation < 30) {
                liquidSaturation = 30;
                saturationIncrement *= -1;
            } else if (liquidSaturation > 100) {
                liquidSaturation = 100;
                saturationIncrement *= -1;
            }
            this.alpha = 0.2 + (0.7 * Math.random());
            this.fillRate = 1 + Math.random();
            this.lastFlow = new Flow(this, null, target, target.capacity);
            this.lastFlow.flowRate = 0.01;
        }
    ,   Node = function(flow, glass, volume) {
            this.flow = flow;
            this.glass = glass || null;
            this.id = nodeCount++;
            if (this.glass) {
                if (this.glass.element) {
                    this.glass.element.style.opacity = 1;
                }
                this.prevNode = this.glass.lastNode || null;
                if (this.prevNode) {
                    this.prevNode.nextNode = this;
                } else {
                    this.glass.firstNode = this;
                }
                this.glass.lastNode = this;
            }
            this.isTarget = (volume == null);
            if (this.isTarget) {
                this.prevTarget = this.flow.lastTarget || null;
                if (this.prevTarget) {
                    this.prevTarget.nextTarget = this;
                } else {
                    this.flow.firstTarget = this;
                }
                this.flow.lastTarget = this;
                this.volume = 0;
            } else {
                this.volume = volume;
            }
        }
    ,   Pattern = function(background, x, y) {
            ;
            this.background = background;
            this.x = x;
            this.y = y;
        }
    ;
    Display.prototype = {
        addNewFlow: function() {
            let glass = this.getGlass()
            ;
            if (glass) {
                this.lastLiquid = new Liquid(this, glass);
            }
        }
    ,   delete: function() {
            this.background.context.clearRect(0, 0, this.background.element.width, this.background.element.height);
            this.background.fieldContext.clearRect(0, 0, this.background.fieldElement.width, this.background.fieldElement.height);
            this.glasses.forEach(function(glass) {
                glass.delete();
            });
        }
    ,   drain: function(interval) {
            let currentLiquid = this.firstLiquid
            ,   currentFlow = null
            ,   currentTarget = null
            ,   volume = 0
            ;
            while (currentLiquid) {
                currentFlow = currentLiquid.firstFlow;
                while (currentFlow) {
                    if (currentFlow.flowRate) {
                        currentFlow.flowRate *= 1.05;
                        currentTarget = currentFlow.firstTarget
                        targetLoop: while (currentTarget) {
                            volume = Math.min(currentFlow.source.volume, Math.ceil(interval * currentLiquid.fillRate * Math.min(1, currentFlow.flowRate)));
                            currentFlow.source.volume -= volume;
                            currentTarget.volume += volume;
                            if (currentFlow.source.volume <= 0) {
                                break targetLoop;
                            }
                            currentTarget = currentTarget.nextTarget;
                        }
                    }
                    currentFlow = currentFlow.nextFlow;
                }
                currentLiquid = currentLiquid.nextLiquid;
            }
        }
    ,   draw: function(interval) {
            let currentNode = null
            ,   height = 0
            ,   y1 = 0
            ,   y2 = 0
            ,   volume = 0
            ,   slopeVolume = 0
            ,   prevSlopeVolume = 0
            ,   drawCount = 0
            ;
            this.glasses.forEach(function (glass) {
                if (glass.firstNode) {
                    glass.drawVolume = 0;
                    y1 = y2 = glass.height;
                    volume = 0;
                    prevSlopeVolume = 0
                    glass.liquid.clearRect(0, 0, glass.width, glass.height);
                    glass.liquid.globalCompositeOperation = "source-over";
                    glass.liquid.globalAlpha = 1;
                    currentNode = glass.firstNode;
                    while (currentNode) {
                        if (currentNode.volume > 0) {
                            volume = currentNode.volume;
                            currentNode.incrementSlope(interval);
                            slopeVolume = Math.abs(currentNode.slope * glass.width * glass.width/2);
                            glass.liquid.fillStyle = "hsla(" + currentNode.flow.liquid.hue + ", " + currentNode.flow.liquid.saturation + "%, 50%, " + currentNode.flow.liquid.alpha + ")";
                            glass.liquid.beginPath();
                            glass.liquid.moveTo(0, y1);
                            glass.liquid.lineTo(glass.width, y2);
                            if (volume < prevSlopeVolume) {
                                if (y1 < y2) {
                                    y2 -= volume/(2 * glass.width);
                                } else {
                                    y1 -= volume/(2 * glass.width);
                                }
                                prevSlopeVolume -= volume;
                            } else {
                                y1 = y2 = Math.min(y1, y2);
                                volume -= prevSlopeVolume;
                                if (volume < slopeVolume) {
                                    if (currentNode.slope < 0) {
                                        y1 -= 2 * volume/glass.width;
                                    } else {
                                        y2 -= 2 * volume/glass.width;
                                    }
                                    prevSlopeVolume = volume;
                                } else {
                                    if (currentNode.slope < 0) {
                                        y1 += currentNode.slope * glass.width;
                                    } else {
                                        y2 -= currentNode.slope * glass.width;
                                    }
                                    volume -= slopeVolume;
                                    if (volume > 0) {
                                        height = volume/glass.width;
                                        y1 -= height;
                                        y2 -= height;
                                    }
                                    prevSlopeVolume = slopeVolume;
                                }
                            }
                            glass.liquid.lineTo(glass.width, y2);
                            glass.liquid.lineTo(0, y1);
                            glass.liquid.closePath();
                            glass.liquid.fill();
                            glass.drawVolume += currentNode.volume;
                        } else if (!currentNode.isTarget) {
                            currentNode.spawn();
                        }
                        currentNode = currentNode.nextNode;
                    }
                    if (glass.bubbles.length) {
                        glass.liquid.globalCompositeOperation = "source-atop";
                        glass.bubbles[0].draw(interval);
                        glass.bubbles[1].draw(interval);
                    }
                    glass.context.globalAlpha = 1;
                    glass.context.globalCompositeOperation = "copy";
                    glass.context.drawImage(glass.shape.canvas, 0, 0);
                    glass.context.globalCompositeOperation = "source-in";
                    glass.context.drawImage(glass.liquid.canvas, 0, 0);
                    drawCount++;
                    if (glass.drawVolume >= glass.capacity) {
                        currentNode = glass.firstNode
                        nodeLoop: while (currentNode) {
                            if (currentNode.isTarget) {
                                currentNode.spawn();
                                break nodeLoop;
                            }
                            currentNode = currentNode.nextNode;
                        }
                    }
                } else if (glass.visible) {
                    glass.element.style.opacity = 0;
                    glass.available = false;
                    glass.visible = false;
                    glass.container.canvas.style.pointerEvents = "none";
                    glass.container.canvas.style.cursor = "default";
                }
            });
            this.glassesDrawn = drawCount;
            currentNode = this.sourceGlass.firstNode;
            while (currentNode) {
                if (currentNode.volume <= 0) {
                    currentNode.spawn();
                }
                currentNode = currentNode.nextNode;
            }
        }
    ,   getGlass: function(givenGlass) {
            let sourceGlass = (givenGlass && givenGlass.capacity) ? givenGlass : null
            ,   givenYLimit = sourceGlass ? (sourceGlass.y + sourceGlass.height) : this.height
            ,   currentGlass = null
            ;
            if ((this.glassesDrawn <= this.maxGlassCount) && (!sourceGlass || !sourceGlass.bottom)) {
                for (let i = 0, j = Math.floor(this.glasses.length * Math.random()); i < this.glasses.length; i++) {
                    currentGlass = this.glasses[(i + j) % this.glasses.length];
                    if (currentGlass.available && (currentGlass.nodeCount() < this.maxNodeCount) && ((!sourceGlass && currentGlass.top) || (currentGlass.y > givenYLimit))) {
                        this.maxNodeCount = this.maxNodeCount + 0.005;
                        return currentGlass;
                    }
                }
            }
            return null;
        }
    ,   splitGlass: function(glass) {
            let splitGlasses = glass.split()
            ;
            if (splitGlasses.length == 2) {
                return this.splitGlass(splitGlasses[0]).concat(this.splitGlass(splitGlasses[1]))
            } else {
                return [splitGlasses[0]];
            }
        }
    }
    Background.prototype = {
        draw: function() {
            const lineWidth = this.lineWidth
            ,   width = this.element.width/this.columnCount
            ,   x0 = lineWidth/2
            ,   x1 = width/2
            ,   controlY = width/2
            ,   xOffset = (0.75 * this.patternElement.width) - (0.25 * this.lineWidth)
            ,   yOffset = this.patternElement.width/2
            ;
            let phase = 0
            ,   y0 = 0
            ,   y1 = 0
            ,   widthOffset = 0
            ;
            this.context.fillStyle = "hsl(0, 0%, " + this.luminosity0 + "%)";
            this.context.fillRect(0, 0, this.element.width, this.element.height);
            this.context.strokeStyle = "hsl(0, 0%, " + this.luminosity1 + "%)";
            this.context.lineWidth = lineWidth;
            for (let i = 0; i <= this.columnCount; i++) {
                phase = i % 2;
                this.context.beginPath();
                y0 = 0;
                this.context.moveTo(phase ? x0 : x1, y0);
                while (y0 < this.element.height) {
                    y1 = y0 + width;
                    if (phase) {
                        this.context.bezierCurveTo(x0, y0 + controlY, x1, y1 - controlY, x1, y1);
                    } else {
                        this.context.bezierCurveTo(x1, y0 + controlY, x0, y1 - controlY, x0, y1);
                        if (!widthOffset || !y0) {
                            this.patterns.push(new Pattern(this, widthOffset - xOffset, y0 - yOffset));
                        }
                        this.patterns.push(new Pattern(this, widthOffset + width - xOffset, y0 + width - yOffset));
                    }
                    y0 += width;
                    phase = !phase;
                }
                this.context.stroke();
                this.context.closePath();
                widthOffset += width;
                this.context.translate(width, 0);
            }
            this.patterns.forEach(function(pattern) {
                pattern.draw();
            }, this);
            return this;
        }
    ,   rotate: function(interval) {
            let angle = 0
            ;
            if (this.rotatePattern == null) {
                this.rotatePattern = this.patterns[Math.floor(this.patterns.length * Math.random())];
                this.rotatePattern.angle = 0;
                this.rotatePattern.angleIncrement = (Math.random() < 0.5) ? -0.001 : 0.001;
                this.rotatePattern.maxAngle = Math.PI * Math.ceil(6 * Math.random())/3;
                this.fieldContext.translate(this.rotatePattern.x + this.patternElement.width/2, this.rotatePattern.y + this.patternElement.height/2);
            }
            this.fieldContext.clearRect(this.patternElement.width/-2, this.patternElement.height/-2, this.patternElement.width, this.patternElement.height);
            angle = interval * this.rotatePattern.angleIncrement;
            this.rotatePattern.angle += angle;
            if (Math.abs(this.rotatePattern.angle) >= this.rotatePattern.maxAngle) {
                this.fieldContext.setTransform(1, 0, 0, 1, 0, 0);
                this.rotatePattern.draw();
                this.rotatePattern = null;
            } else {
                this.fieldContext.rotate(angle);
                this.rotatePattern.draw(this.patternElement.width/-2, this.patternElement.height/-2);
            }
        }
    }
    Flow.prototype = {
        delete: function() {
            if (this.prevFlow) {
                this.prevFlow.nextFlow = this.nextFlow || null;
            } else {
                this.liquid.firstFlow = this.nextFlow || null;
            }
            if (this.nextFlow) {
                this.nextFlow.prevFlow = this.prevFlow;
            } else {
                this.liquid.lastFlow = this.prevFlow;
            }
            if (!this.liquid.firstFlow) {
                this.liquid.delete();
            }
        }
    }
    Glass.prototype = {
        activate: function() {
            const xOffset = Math.round(this.width * Math.random()/10)
            ,   yOffset = Math.round(this.height * Math.random()/10)
            ,   xSlope = Math.round(this.width * 0.1 * Math.random())
            ,   lipHeight = 2
            ,   baseHeight = Math.round(3 + (this.height * Math.random()/5))
            ,   slopedBase = Math.random() < 0.5
            ,   curvedBase = !slopedBase && ((this.height/this.width) < 1.5) && (Math.random() < 0.5)
            ,   curveRadius = Math.max(this.display.minSide/3, this.width * Math.random()/3)
            ;
            let gradient = null
            ,   fullHeight = 0
            ;
            this.available = true;
            this.id = glassCount++;
            this.element = glassRoot.parentNode.appendChild(glassRoot.cloneNode(true));
            this.element.id = "glass" + this.id;
            this.element.setAttribute("data-id",this.id);
            this.element.style.top = (this.y + yOffset) + "px";
            this.element.style.left = (this.x + xOffset) + "px";
            this.shape = this.element.firstElementChild.getContext('2d');
            this.liquid = this.shape.canvas.nextElementSibling.getContext('2d');
            this.context = this.liquid.canvas.nextElementSibling.getContext('2d');
            this.container = this.context.canvas.nextElementSibling.getContext('2d');
            this.container.canvas.setAttribute("data-id",this.id);
            this.shape.canvas.id = "shape" + this.id;
            this.liquid.canvas.id = "liquid" + this.id;
            this.context.canvas.id = "contents" + this.id;
            this.container.canvas.id = "container" + this.id;
            this.width -= xOffset + Math.ceil(5 * Math.random());
            this.height -= yOffset + Math.ceil(5 * Math.random()) + baseHeight;
            fullHeight = this.height + baseHeight;
            this.capacity = this.width * this.height;
            this.shape.canvas.style.width = this.liquid.canvas.style.width = this.context.canvas.style.width = this.container.canvas.style.width = this.width + "px";
            this.liquid.canvas.style.height = this.context.canvas.style.height = this.height + "px";
            this.shape.canvas.style.height = this.container.canvas.style.height = fullHeight + "px";
            this.shape.canvas.width = this.liquid.canvas.width = this.context.canvas.width = this.container.canvas.width = this.context.canvas.clientWidth;
            this.liquid.canvas.height = this.context.canvas.height = this.context.canvas.clientHeight;
            this.shape.canvas.height = this.container.canvas.height = this.container.canvas.clientHeight;
            this.shape.fillStyle = "hsl(0, 0%, 0%)";
            this.shape.beginPath();
            if (curvedBase) {
                this.shape.moveTo(xSlope, 0);
                this.shape.arcTo(0, fullHeight, this.width/2, fullHeight, curveRadius);
                this.shape.arcTo(this.width, fullHeight, this.width - xSlope, 0, curveRadius);
                this.shape.lineTo(this.width - xSlope, 0);
            } else {
                this.shape.moveTo(0, 0);
                this.shape.lineTo(xSlope, this.height);
                if (slopedBase) {
                    this.shape.lineTo(xSlope + (xSlope * baseHeight/this.height), fullHeight);
                    this.shape.lineTo(this.width - (xSlope + (xSlope * baseHeight/this.height)), fullHeight);
                } else {
                    this.shape.lineTo(xSlope, fullHeight);
                    this.shape.lineTo(this.width - xSlope, fullHeight);
                }
                this.shape.lineTo(this.width - xSlope, this.height);
                this.shape.lineTo(this.width, 0);
            }
            this.shape.closePath();
            this.shape.fill();
            gradient = this.container.createLinearGradient(0, 0, this.width, -1 * xSlope * this.width/this.height);
            gradient.addColorStop(0, "hsla(0, 0%, 0%, 0.5)");
            gradient.addColorStop(0.1, "hsla(0, 0%, 0%, 0)");
            this.container.fillStyle = gradient;
            this.container.fillRect(0, 0, this.width, this.height);
            gradient = this.container.createLinearGradient(0, -1 * xSlope * this.width/this.height, this.width, 0);
            gradient.addColorStop(0.9, "hsla(0, 0%, 0%, 0)");
            gradient.addColorStop(1, "hsla(0, 0%, 0%, 0.5)");
            this.container.fillStyle = gradient;
            this.container.fillRect(0, 0, this.width, this.height);
            gradient = this.container.createLinearGradient(0, 0, this.width, 0);
            gradient.addColorStop(0, "hsla(0, 0%, 0%, 0.6)");
            gradient.addColorStop(0.3, "hsla(0, 0%, 0%, 0)");
            gradient.addColorStop(0.6, "hsla(0, 0%, 0%, 0)");
            gradient.addColorStop(1, "hsla(0, 0%, 0%, 0.6)");
            this.container.fillStyle = gradient;
            this.container.fillRect(0, this.height, this.width, baseHeight);
            gradient = this.container.createLinearGradient(0, 0, 0, fullHeight);
            gradient.addColorStop(0, "hsla(0, 0%, 0%, 0.4)");
            gradient.addColorStop(lipHeight/fullHeight, "hsla(0, 0%, 0%, 0)");
            gradient.addColorStop((this.height - lipHeight)/fullHeight, "hsla(0, 0%, 0%, 0)");
            gradient.addColorStop(this.height/fullHeight, "hsla(0, 0%, 0%, 0.3)");
            gradient.addColorStop((this.height + lipHeight)/fullHeight, "hsla(0, 0%, 0%, 0)");
            gradient.addColorStop((fullHeight - lipHeight)/fullHeight, "hsla(0, 0%, 0%, 0)");
            gradient.addColorStop(1, "hsla(0, 0%, 0%, 0.3)");
            this.container.fillStyle = gradient;
            this.container.fillRect(0, 0, this.width, fullHeight);
            gradient = this.container.createLinearGradient(0, 0, this.width, 0);
            gradient.addColorStop(this.display.lightDirection - 0.1, "hsla(0, 0%, 100%, 0)");
            gradient.addColorStop(this.display.lightDirection, "hsla(0, 0%, 100%, 0.5)");
            gradient.addColorStop(this.display.lightDirection + 0.1, "hsla(0, 0%, 100%, 0)");
            this.container.fillStyle = gradient;
            this.container.fillRect(0, 0, this.width, fullHeight);
            this.container.globalCompositeOperation = "destination-in";
            this.container.drawImage(this.shape.canvas, 0, 0);
            this.top = (this.y < (this.display.height/4));
            this.bottom = ((this.y + this.height) >= (3 * this.display.height/4));
            this.drawVolume = 0;
            this.children = null;
            this.bubbles = [];
        }
    ,   delete: function() {
            glassRoot.parentNode.removeChild(this.element);
        }
    ,   nodeCount: function() {
            let currentNode = this.firstNode
            ,   count = 0
            ;
            while (currentNode) {
                count++;
                currentNode = currentNode.nextNode
            }
            return count;
        }
    ,   split: function() {
            const doubleMax = 2 * this.display.minSide
            ,   aspect = this.width/this.height
            ;
            let availableWidth = 0
            ,   availableHeight = 0
            ,   splitWidth = false
            ,   splitHeight = false
            ,   split = 0
            ;
            if ((this.capacity <= this.display.maxVolume) && (aspect >= minGlassAspect) && (aspect <= maxGlassAspect) && (Math.random() < 0.3)) {
                return [this];
            }
            availableWidth = this.width - doubleMax;
            availableHeight = this.height - doubleMax;
            if (availableWidth < 0) {
                if (availableHeight > 0) {
                    splitHeight = true;
                }
            } else if ((availableHeight < 0) || (aspect > minGlassAspect)) {
                splitWidth = true;
            } else {
                splitHeight = true;
            }
            if (splitWidth) {
                split = this.display.minSide + (availableWidth * Math.random());
                return [new Glass(this.display, this, split, this.height), new Glass(this.display, this, split - this.width, this.height)];
            } else if (splitHeight) {
                split = this.display.minSide + (availableHeight * Math.random());
                return [new Glass(this.display, this, this.width, split), new Glass(this.display, this, this.width, split - this.height)];
            } else {
                return [this];
            }
        }
    ,   startBubbles: function() {
            while (this.bubbles.length < 2) {
                this.bubbles.push(new GlassBubbles(this));
            }
        }
    }
    GlassBubbles.prototype = {
        draw: function(interval) {
            let y = 0
            ,   excess = 0
            ;
            this.duration += interval
            y = Math.round((this.y - (this.duration * this.velocity))) % this.glass.display.bubbles.element.height;
            this.alpha += this.alpha * interval * 0.01;
            this.glass.liquid.globalAlpha = Math.min(1, this.alpha);
            excess = Math.max(0, this.yLimit - y);
            this.glass.liquid.drawImage(this.glass.display.bubbles.element, this.x, y);
            if (excess) {
                this.glass.liquid.drawImage(this.glass.display.bubbles.element, this.x, this.glass.height - excess);
            }
        }
    }
    Liquid.prototype = {
        delete: function() {
            if (this.prevLiquid) {
                this.prevLiquid.nextLiquid = this.nextLiquid || null;
            } else {
                this.display.firstLiquid = this.nextLiquid || null;
            }
            if (this.nextLiquid) {
                this.nextLiquid.prevLiquid = this.prevLiquid;
            } else {
                this.display.lastLiquid = this.prevLiquid;
            }
        }
    }
    Node.prototype = {
        incrementSlope: function(interval) {
            if (this.slope == null) {
                this.slope = 0;
                this.slopeFactor = 0.002;
                this.slopePosition = 0;
                this.slopePeriod = 500;
            } else {
                this.slopePosition += Math.sign(this.slopeFactor) * interval;
                this.slope += this.slopeFactor * (1 - Math.pow(this.slopePosition/this.slopePeriod, 2));
                if (Math.abs(this.slopePosition) >= this.slopePeriod) {
                    this.slopePosition = Math.sign(this.slopeFactor) * this.slopePeriod;
                    this.slopeFactor *= -1;
                }
            }
            if (!this.isTarget && this.slopeFactor) {
                this.slope *= 0.01;
            }
        }
    ,   spawn: function() {
            let originalFlow = this.flow
            ,   remainingVolume = 0
            ,   glass = null
            ,   currentFlow = null
            ;
            if (!this.isTarget && this.flow.firstTarget) {
                while (this.flow.firstTarget)  {
                    this.flow.firstTarget.spawn();
                }
            }
            if (this.isTarget) {
                if (this.prevTarget) {
                    this.prevTarget.nextTarget = this.nextTarget || null;
                } else {
                    this.flow.firstTarget = this.nextTarget || null;
                }
                if (this.nextTarget) {
                    this.nextTarget.prevTarget = this.prevTarget;
                } else {
                    this.flow.lastTarget = this.prevTarget;
                }
            }
            if ((this.volume > 0) && (!this.isTarget || this.glass)) {
                remainingVolume = this.volume;
                do {
                    glass = this.flow.liquid.display.getGlass(this.glass); // !! prevent duplicate use
                    if (currentFlow) {
                        currentFlow.lastTarget = new Node(currentFlow, glass);
                    } else {
                        this.flow.liquid.lastFlow = currentFlow = new Flow(this.flow.liquid, this, glass);
                        (function (flow) {
                            setTimeout(function() { flow.flowRate = 0.01; }, 500 + (1000 * Math.random()));
                        })(currentFlow);
                    }
                    remainingVolume = glass ? (remainingVolume - Math.max(0, glass.capacity - glass.drawVolume)) : 0;
                } while (remainingVolume > 0);
            } else if (this.glass) {
                if (this.prevNode) {
                    this.prevNode.nextNode = this.nextNode || null;
                } else {
                    this.glass.firstNode = this.nextNode || null;
                }
                if (this.nextNode) {
                    this.nextNode.prevNode = this.prevNode;
                } else {
                    this.glass.lastNode = this.prevNode;
                }
            }
            if (!originalFlow.firstTarget) {
                if (originalFlow.source && (originalFlow.source.volume > 0)) {
                    originalFlow.source.spawn();
                } else {
                    originalFlow.delete();
                }
            }
        }
    }
    Pattern.prototype = {
        draw: function(x, y) {
            this.background.fieldContext.drawImage(this.background.patternElement, x || this.x, y || this.y);
        }
    }
    return new Display();
}
function initialize() {
    canvasRoot.addEventListener("click", function(e) {
        const dataId = e.target.getAttribute("data-id")
        ,   glass = e.target.classList.contains("containers") ? display.glasses[dataId] : null
        ;
        if (glass) {
            glass.startBubbles();
            glass.container.canvas.style.pointerEvents = "none";
            glass.container.canvas.style.cursor = "default";
        }
    }, false);
    canvasRoot.addEventListener("transitionend", function(e) {
        const dataId = e.target.getAttribute("data-id")
        ,   glass = e.target.classList.contains("glasses") ? display.glasses[dataId] : null
        ;
        if (e.propertyName == "opacity") {
            if (glass) {
                if (e.target.style.opacity == 0) {
                    glass.available = true;
                    glass.bubbles = [];
                } else {
                    glass.visible = true;
                    glass.container.canvas.style.pointerEvents = "auto";
                    glass.container.canvas.style.cursor = "pointer";
                }
            }
        }
    }, false);
}
function shuffle(array) {
    var currentIndex = array.length
    ,   temporaryValue
    ,   randomIndex
    ;
    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
}
function animationLoop(ts) {
    let interval = ts - priorTimestamp
    ,   glass = null
    ;
    priorTimestamp = ts;
    if (interval < 1000) {
        display.background.rotate(interval);
        if (display.addFlow) {
            display.addNewFlow();
            setTimeout(function() { display.addFlow = true; }, display.addFlowInterval);
            display.addFlowInterval = Math.max(500, 0.8 * display.addFlowInterval);
            display.addFlow = false;
        }
        display.drain(interval);
        display.draw(interval);
    }
	animationId = window.requestAnimationFrame(animationLoop);
}
initialize();
})();
