(function() {
"use strict";

var animationId = null
,   canvasRoot = document.querySelector(".canvas")
,   priorTimestamp = 0
,   display = null
;
window.onload = function() {
    display = createDisplay();
    display.backgroundElement.style.opacity = 1;
    animationId = window.requestAnimationFrame(animationLoop);
}
window.onresize = function() {
    display.grid.boxes.forEach(function(box) {
        box.delete();
    }, this);
    display = createDisplay();
}
function createDisplay() {
    var hues = [0, 30, 60, 90, 140, 170, 190, 260, 320]
    ,   boxRoot = document.querySelector("#box0")
    ,   pathRoot = document.querySelector("#path0")
    ,   coreRoot = document.querySelector("#core0")
    ,   patternRoot = document.querySelector("#pattern0")
    ,   patternCount = 0
    ,   layerCount = 0
    ,   availablePatterns = []
    ,   Display = function() {
            var hueIndex = Math.floor(hues.length * Math.random())
            ;
            this.element = canvasRoot;
            this.width = this.element.clientWidth;
            this.height = this.element.clientHeight;
            // temporary for debugging
            // this.height = window.innerHeight;
            this.darkTheme = Math.random() < 0.5;
            this.backgroundElement = document.querySelector("#background");
            this.backgroundElement.width = this.backgroundElement.clientWidth;
            this.backgroundElement.height = this.backgroundElement.clientHeight;
            this.backgroundContext = this.backgroundElement.getContext('2d');
            this.backgroundHue = hues[hueIndex];
            this.boxHue = hues[(hueIndex + (((Math.random < 0.5) ? -1 : 1) * (2 + Math.floor(2 * Math.random())))) % hues.length];
            this.saturation = 30 + (20 * Math.random());
            this.backgroundContext.fillStyle = "hsl(" + this.backgroundHue + ", " + this.saturation + "%, " + (this.darkTheme ? 20 : 80) + "%)";
            this.backgroundContext.fillRect(0, 0, this.backgroundElement.width, this.backgroundElement.height);
            this.grid = new Grid(this);
            this.mutating = null;
            this.intervalFactor = 0;
            this.intervalSlowdown = 10;
        }
    ,   Box = function(grid, row, column) {
            this.grid = grid;
            this.id = this.grid.boxes.length;
            this.element = this.id ? boxRoot.parentNode.appendChild(boxRoot.cloneNode(false)) : boxRoot;
            this.element.id = "box" + this.id;
            this.element.setAttribute("data-id",this.id);
            this.element.style.width = this.element.style.height = (grid.boxSize + (2 * grid.borderSize)) + "px";
            this.element.height = this.element.width = this.element.clientWidth;
            this.context = this.element.getContext('2d');
            this.core = new Core(this);
            this.row = row;
            this.column = column;
            this.element.style.top = (100 * (this.row + 0.5)/this.grid.rowCount) + "%";
            this.element.style.left = (100 * (this.column + 0.5)/this.grid.columnCount) + "%";
            this.path = new Path(this);
            if (column) {
                this.leftBox = this.grid.boxes[this.id - 1];
                this.leftBox.rightBox = this;
            } else {
                this.leftBox = null;
            }
            this.rightBox = null;
            if (row) {
                this.topBox = this.grid.boxes[this.id - this.grid.columnCount];
                this.topBox.bottomBox = this;
            } else {
                this.topBox = null;
            }
            this.bottomBox = null;
            this.mutate = false;
        }
    ,   Core = function(box) {
            this.box = box;
            this.element = this.box.id ? coreRoot.parentNode.appendChild(coreRoot.cloneNode(false)) : coreRoot;
            this.element.id = "core" + this.box.id;
            this.element.style.width = this.element.style.height = this.box.element.style.width;
            this.element.height = this.element.width = this.element.clientWidth;
            this.context = this.element.getContext('2d');
        }
    ,   Grid = function(display) {
            var minBoxSize = Math.max(display.width/10, display.height/10)
            ,   maxBoxSize = Math.min(display.width/5, display.height/5)
            ,   boxApprox = Math.max(minBoxSize, Math.min(maxBoxSize, minBoxSize + ((maxBoxSize - minBoxSize) * Math.random())))
            ,   boundingRect = null
            ,   hue = display.backgroundHue
            ,   saturation = display.saturation
            ,   luminosity = display.darkTheme ? 20 : 80
            ,   subBoxSize = 0
            ;
            this.display = display;
            this.element = document.querySelector("#grid");
            //next 2 lines temporary for debugging
            // this.element.style.top = Math.round(display.height/2) + "px"
            // this.element.style.left = Math.round(display.width/2) + "px"

            if (display.width > display.height) {
                this.rowCount = Math.round(display.height/boxApprox);
                this.boxSize = Math.floor(display.height/this.rowCount);
                this.columnCount = Math.floor(display.width/this.boxSize);
            } else {
                this.columnCount = Math.round(display.width/boxApprox);
                this.boxSize = Math.floor(display.width/this.columnCount);
                this.rowCount = Math.floor(display.height/this.boxSize);
            }
            this.borderSize = Math.round(this.boxSize/20);
            this.minSize = this.borderSize;
            this.maxSize = this.boxSize + this.borderSize;
            this.boxes = [];
            for (var row = 0; row < this.rowCount; row++) {
                for (var column = 0; column < this.columnCount; column++) {
                    this.boxes.push(new Box(this, row, column));
                }
            }
            this.element.style.width = (this.columnCount * this.boxes[0].path.element.width) + "px";
            this.element.style.height = (this.rowCount * this.boxes[0].path.element.height) + "px";
            subBoxSize = this.boxes[0].path.element.width - (2 * this.borderSize);
            this.boxes.forEach(function(box) {
                boundingRect = box.path.element.getBoundingClientRect();
                this.display.backgroundContext.fillStyle = "hsl(" + hue + ", " + (saturation + (20 - (40 * Math.random()))) + "%, " + luminosity + "%)";
                this.display.backgroundContext.fillRect(boundingRect.x + this.borderSize, boundingRect.y + this.borderSize, subBoxSize, subBoxSize);
            }, this);
            this.x = this.y = Math.round(this.boxes[0].element.width/2);
            this.activePatternCount = 0;
            this.patternCountLimit = Math.max(this.rowCount, this.columnCount);
            this.fadeInterval = 1000 + (1000 * Math.random());
            this.fadeElapsed = 0;
            this.square = Math.random() < 0.5;
            this.eccentricity = 0.01 + 0.04 * Math.random();
        }
    ,   Path = function(box) {
            this.box = box;
            this.element = this.box.id ? pathRoot.parentNode.appendChild(pathRoot.cloneNode(false)) : pathRoot;
            this.element.id = "path" + this.box.id;
            this.element.style.width = this.element.style.height = this.box.grid.boxSize + "px";
            this.element.height = this.element.width = this.element.clientWidth;
            this.context = this.element.getContext('2d');
            this.element.style.top = this.box.element.style.top;
            this.element.style.left = this.box.element.style.left;
        }
    ,   Pattern = function(grid) {
            this.id = patternCount++;
            this.element = this.id ? patternRoot.parentNode.appendChild(patternRoot.cloneNode(true)) : patternRoot;
            this.element.id = "pattern" + this.id;
            this.context = this.element.getContext('2d');
            this.initialize(grid);
        }
    ,   Play = function(grid, box, prevPlay) {
            var currentBox = null
            ,   nextBox = null
            ;
            this.grid = grid;
            if (box) {
                this.box = box;
                this.pattern = prevPlay.pattern;
                this.horizontal = prevPlay.horizontal;
                this.forward = prevPlay.forward;
            } else {
                this.pattern = this.grid.lastPattern;
                this.horizontal = Math.random() < 0.5;
                this.forward = Math.random() < 0.5;
                do {
                    currentBox = nextBox || this.grid.boxes[Math.floor(this.grid.boxes.length * Math.random())];
                    if (this.horizontal) {
                        nextBox = this.forward ? currentBox.leftBox : currentBox.rightBox;
                    } else {
                        nextBox = this.forward ? currentBox.topBox : currentBox.bottomBox;
                    }
                } while (nextBox)
                this.box = currentBox;
            }
            this.offsetX = ((Math.random() < 0.5) ? -1 : 1) * Math.floor(this.grid.eccentricity * this.pattern.size * Math.random());
            this.offsetY = ((Math.random() < 0.5) ? -1 : 1) * Math.floor(this.grid.eccentricity * this.pattern.size * Math.random());
            this.startAngle = 2 * Math.PI * Math.random();
            this.prevPlay = this.grid.lastPlay || null;
            if (this.prevPlay) {
                this.prevPlay.nextPlay = this;
            } else {
                this.grid.firstPlay = this;
            }
            this.nextPlay = null;
            this.elapsed = 0;
            this.pattern.playCount += 1;
        }
    ;
    Display.prototype = {
        clicked: function(event) {
            if (event) {
                this.grid.element.style.cursor = "default";
                this.intervalFactor = this.intervalSlowdown;
                this.mutating = this.grid.boxes[event.target.getAttribute("data-id")];
                this.mutating.mutate = true;
            } else {
                this.mutating.mutate = false;
                this.mutating = null;
                this.grid.element.style.cursor = "pointer";
            }
        }
    ,   draw: function(interval) {
            var fadeBoxes = false
            ,   currentPlay = this.grid.lastPlay
            ;
            if (this.intervalFactor) {
                interval /= this.intervalFactor;
                this.intervalFactor *= 0.95;
                if (this.intervalFactor < 1) {
                    this.intervalFactor = 0;
                }
            } else if (this.mutating) {
                this.clicked();
            }
            this.grid.fadeElapsed += interval;
            if (this.grid.fadeElapsed > this.grid.fadeInterval) {
                fadeBoxes = true;
                this.grid.fadeElapsed %= this.grid.fadeInterval;
            }
            this.grid.boxes.forEach(function(box) {
                box.context.clearRect(0, 0, box.element.width, box.element.height);
                box.context.drawImage(box.core.element, 0, 0);
                box.path.context.clearRect(0, 0, box.element.width, box.element.height);
                if (box.mutate) {
                    if (this.grid.display.darkTheme) {
                        box.path.context.fillStyle = "black"
                    } else {
                        box.path.context.fillStyle = "white"
                    }
                    box.path.context.globalAlpha = (this.intervalFactor - 1)/(this.intervalSlowdown - 1);
                    box.path.context.fillRect(0, 0, box.path.element.width, box.path.element.height);
                }
                if (box.mutate || fadeBoxes) {
                    box.core.context.globalCompositeOperation = "destination-out"
                    box.core.context.globalAlpha = 0.1;
                    box.core.context.fillStyle = "hsla(0, 0%, 100%, 0.5)";
                    box.core.context.fillRect(0, 0, box.element.width, box.element.height);
                }
            }, this);
            if (!currentPlay) {
                this.grid.startPlay();
            }
            while (currentPlay) {
                if (currentPlay.box.mutate) {
                    currentPlay.delete();
                } else {
                    currentPlay.elapsed += interval;
                    currentPlay.draw();
                    if (currentPlay.elapsed > currentPlay.pattern.duration) {
                        currentPlay.delete();
                    } else if ((currentPlay.elapsed > currentPlay.pattern.kickoff) && !currentPlay.spawned) {
                        currentPlay.grid.startPlay(currentPlay);
                        if (Math.random() < 0.5) {
                            currentPlay.grid.startPlay();
                        }
                    }
                }
                currentPlay = currentPlay.prevPlay;
            }
        }
    }
    Box.prototype = {
        delete: function() {
            this.context.clearRect(0, 0, this.element.width, this.element.height);
            this.core.context.clearRect(0, 0, this.core.element.width, this.core.element.height);
            this.path.context.clearRect(0, 0, this.path.element.width, this.path.element.height);
            if (this.id) {
                this.element.parentNode.removeChild(this.element);
                this.core.element.parentNode.removeChild(this.core.element);
                this.path.element.parentNode.removeChild(this.path.element);
            }
        }
    }
    Grid.prototype = {
        startPlay: function(play) {
            var box = null
            ,   forward = null
            ;
            if (play) {
                play.spawned = true;
                if (play.horizontal) {
                    box = play.forward ? play.box.rightBox : play.box.leftBox;
                } else {
                    box = play.forward ? play.box.bottomBox : play.box.topBox;
                }
                if (box) {
                    this.lastPlay = new Play(this, box, play)
                }
            } else if (this.activePatternCount < this.patternCountLimit) {
                if (availablePatterns.length) {
                    this.lastPattern = availablePatterns.pop().initialize(this);
                } else {
                    this.lastPattern = new Pattern(this);
                }
                this.lastPlay = new Play(this);
            }
        }
    }
    Pattern.prototype = {
        delete: function() {
            if (this.prevPattern) {
                this.prevPattern.nextPattern = this.nextPattern;
            } else {
                this.grid.firstPattern = this.nextPattern;
            }
            if (this.nextPattern) {
                this.nextPattern.prevPattern = this.prevPattern;
            } else {
                this.grid.lastPattern = this.prevPattern;
            }
            availablePatterns.push(this);
            this.grid.activePatternCount--;
        }
    ,   eccentricityValue: function() {
            return this.size * this.grid.eccentricity * Math.random() * ((Math.random() < 0.5) ? -1 : 1);
        }
    ,   initialize: function(grid) {
            var hue = grid.display.boxHue + ((30 * Math.random()) - 60)
            ,   saturation = 100 * Math.random()
            ,   luminosity = grid.display.darkTheme ? 70 : 30
            ,   lineDash = 0
            ,   ellipseWidth = 0
            ;
            this.grid = grid;
            this.element.style.width = this.element.style.height = this.grid.boxes[0].element.width + "px";
            this.element.width = this.element.height = this.element.clientWidth;
            this.prevPattern = this.grid.lastPattern || null;
            if (this.prevPattern) {
                this.prevPattern.nextPattern = this;
            } else {
                this.grid.firstPattern = this;
            }
            this.nextPattern = null;

            this.duration = 500 + (1000 * Math.random());
            this.kickoff = (0.2 + (0.4 * Math.random())) * this.duration;
            this.playCount = 0;
            this.clockwise = Math.random() < 0.5;
            this.width = 0.5 + (1.5 * Math.random());
            this.size = this.grid.minSize + ((this.grid.maxSize - this.grid.minSize) * Math.random());

            this.context.setTransform(1, 0, 0, 1, 0, 0);
            this.context.clearRect(0, 0, this.element.width, this.element.height);
            this.context.lineWidth = this.width;
            this.context.strokeStyle = "hsla(" + hue + ", " + saturation + "%, " + luminosity + "%, " + (0.3 + (0.7 * Math.random())) + ")";
            if (this.grid.square) {
                lineDash = Math.floor(2 * Math.random());
                if (lineDash) {
                    this.context.setLineDash([2 * lineDash, 2]);
                }
                this.context.translate(this.grid.x - (this.size/2), this.grid.y - (this.size/2));
                this.context.beginPath();
                this.context.moveTo(0, 0);
                this.context.lineTo(this.size + this.eccentricityValue(), this.eccentricityValue());
                this.context.lineTo(this.size + this.eccentricityValue(), this.size + this.eccentricityValue());
                this.context.lineTo(this.eccentricityValue(), this.size + this.eccentricityValue());
                this.context.closePath();
                this.context.stroke();
            } else {
                lineDash = Math.floor(2 * Math.random());
                if (lineDash) {
                    this.context.setLineDash([3 * lineDash, 3]);
                }
                this.context.translate(this.grid.x, this.grid.y);
                this.context.beginPath();
                if (Math.random() < 0.5) {
                    this.context.arc(0, 0, this.size/2, 0, 2 * Math.PI);
                } else {
                    ellipseWidth = this.size + this.eccentricityValue();
                    this.context.ellipse(0, 0, ellipseWidth/2, this.size/2, Math.PI * Math.random(), 0, 2 * Math.PI);
                }
                this.context.closePath();
                this.context.stroke();
            }
            this.grid.activePatternCount++;
            return this;
        }
    }
    Play.prototype = {
        delete: function() {
            if (!this.box.mutate) {
                this.box.core.context.globalCompositeOperation = "source-over";
                this.box.core.context.globalAlpha = 1;
                this.box.core.context.drawImage(this.pattern.element, this.offsetX, this.offsetY);
            }
            if (this.prevPlay) {
                this.prevPlay.nextPlay = this.nextPlay;
            } else {
                this.grid.firstPlay = this.nextPlay;
            }
            if (this.nextPlay) {
                this.nextPlay.prevPlay = this.prevPlay;
            } else {
                this.grid.lastPlay = this.prevPlay;
            }
            if (--this.pattern.playCount <= 0) {
                this.pattern.delete();
            }
        }
    ,   draw: function() {
            var elapsedFraction = this.elapsed/this.pattern.duration
            ,   startEdge = 0
            ,   endEdge = 0
            ,   startAlpha = 0
            ,   endAlpha = 0
            ,   gradient = null
            ,   startX = 0
            ,   endX = 0
            ,   startY = 0
            ,   endY = 0
            ,   startAlpha = 0
            ,   endAlpha = 0
            ;
            this.box.context.save();
            this.box.context.translate(this.pattern.grid.x + this.offsetX, this.pattern.grid.y + this.offsetY);
            this.box.context.beginPath();
            this.box.context.moveTo(0, 0);
            this.box.context.arc(0, 0, 2 * this.box.element.width, this.startAngle, this.startAngle + ((this.pattern.clockwise ? 1 : -1) * 2 * Math.PI * elapsedFraction), !this.pattern.clockwise);
            this.box.context.clip();
            this.box.context.drawImage(this.pattern.element, -1 * this.pattern.grid.x, -1 * this.pattern.grid.y)
            this.box.context.restore();

            startEdge = Math.min(1, this.elapsed/this.pattern.kickoff);
            startAlpha = 1 - Math.max(0, (this.elapsed - this.pattern.kickoff)/(this.pattern.duration - this.pattern.kickoff));
            endEdge = 1 - Math.min(1, (this.pattern.duration - this.elapsed)/this.pattern.kickoff);
            endAlpha = 1 - Math.min(1, this.elapsed/(this.pattern.duration - this.pattern.kickoff));
            if (this.horizontal) {
                startX = this.box.path.element.width * (this.forward ? endEdge : 1 - startEdge);
                endX = this.box.path.element.width * (this.forward ? startEdge : 1 - endEdge);
                startY = 0;
                endY = 0;
            } else {
                startX = 0;
                endX = 0;
                startY = this.box.path.element.width * (this.forward ? endEdge : 1 - startEdge);
                endY = this.box.path.element.width * (this.forward ? startEdge : 1 - endEdge);
            }
            this.box.path.context.globalAlpha = 1;
            gradient = this.box.path.context.createLinearGradient(startX, startY, endX, endY);
            gradient.addColorStop(0, "hsla(0, 0%, 50%, " + (0.1 * (this.forward ? endAlpha : startAlpha)) + ")");
            gradient.addColorStop(1, "hsla(0, 0%, 50%, " + (0.1 * (this.forward ? startAlpha : endAlpha)) + ")");
            this.box.path.context.fillStyle = gradient;
            this.box.path.context.fillRect(startX, startY, endX || this.box.path.element.width, endY || this.box.path.element.height);
        }
    }
    return new Display();
}
function initialize() {
    canvasRoot.addEventListener("click", function(e) {
        if (e.target.classList.contains("boxes") && !display.mutating) {
            display.clicked(e);
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
