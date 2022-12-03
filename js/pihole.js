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
    display.blockset.deleteBlocks();
    display = createDisplay();
}
function createDisplay() {
    var blockRoot = document.querySelector("#block0")
    ,   patternRoot = document.querySelector("#pattern")
    ,   Display = function() {
            this.element = canvasRoot;
            this.width = this.element.clientWidth;
            this.height = this.element.clientHeight;
            // this.height = window.innerHeight;
            this.period = 2000;
            this.basePeriod = this.period/2;
            this.decellerateLimit = this.basePeriod/4;
            this.accellerationRate = 0.85;
            this.decellerate = false;
            this.skipDisplayCount = 0;
            this.body = new Body(this);
            this.pan = new Pan(this);
            this.moire = new Moire(this);
            this.result = new Result(this);
            this.averaging = new Averaging(this);
            this.formula = new Formula(this).advance();
            this.blockset = new Blockset(this).advance();
            this.fraction = new Fraction(this).advance();
        }
    ,   Averaging = function(display) {
            this.display = display;
            this.element = document.querySelector("#averaging");
            this.element.style.fontSize = Math.min(this.element.clientHeight, this.element.clientWidth/16) + "px";
            this.element.textContent = "no averaging";
            this.element.style.color = "hsla(" + this.display.moire.hue + ", 50%, 80%, 1)";
            this.value = this.priorValue = 0;
        }
    ,   Block = function(set) {
            this.set = set;
            this.prevBlock = this.set.lastBlock || null;
            if (this.prevBlock) {
                this.id = this.prevBlock.id + 1;
                this.prevBlock.nextBlock = this;
            } else {
                this.id = 0;
                this.set.firstBlock = this;
            }
            this.nextBlock = null;
            this.element = this.id ? blockRoot.parentNode.appendChild(blockRoot.cloneNode(false)) : blockRoot;
            this.element.id = "block" + this.id;
            this.element.style.width = this.set.maxBlockWidth + "px";
            this.element.style.height = this.set.element.height + "px";
            this.element.width = this.element.clientWidth;
            this.element.height = this.element.clientHeight;
            this.context = this.element.getContext('2d');
            this.left = Math.floor(this.id * this.set.panWidth/4);
            this.right = this.left + this.element.width;
            this.x = Math.round((this.element.width - this.set.blockWidth) * Math.random());
            this.textureXMax = this.set.display.moire.source.canvas.width - this.element.width;
            this.textureYMax = this.set.display.moire.source.canvas.height - this.element.height;
        }
    ,   Blockset = function(display) {
            this.display = display;
            this.element = document.querySelector("#blockset");
            this.element.width = this.element.clientWidth;
            this.element.height = this.element.clientHeight;
            this.context = this.element.getContext('2d');
            this.panWidth = display.pan.boundingRect.width;
            this.maxBlockWidth = Math.floor(this.panWidth/4);
            this.blockWidth = this.maxBlockWidth * (0.8 + (0.1 * Math.random()))
            this.margin = Math.round(this.display.pan.boundingRect.left);
            this.context.translate(this.margin, 0);
            this.slideDistance = this.element.width - this.margin;
            for (var i = 0; i < 4; i++) {
                this.lastBlock = new Block(this);
            }
            this.title = new Title(this);
            this.level = 0;
            this.currentValue = 0;
            this.priorValues = []
        }
    ,   Body = function(display) {
            var arcRadius = 0
            ,   x = 0
            ,   pi = String.fromCodePoint(0x03C0)
            ,   width0 = 5
            ;
            this.display = display;
            this.context = document.querySelector("#body").getContext('2d');
            this.context.canvas.height = this.context.canvas.clientHeight;
            this.context.canvas.style.width = this.context.canvas.height + "px";
            this.context.canvas.width = this.context.canvas.clientWidth;
            this.context.fillStyle = "hsl(0, 0%, 80%)";
            this.context.translate(0, this.context.canvas.height);
            this.yScale = 0.8
            this.context.scale(1, this.yScale);
            this.topWidth = Math.round(0.6 * this.context.canvas.width);
            x = Math.round((this.context.canvas.width - this.topWidth)/2);
            arcRadius = Math.round(this.context.canvas.height/15);
            this.context.beginPath();
            this.context.moveTo(0, 0);
            this.context.arcTo(x, -1 * this.context.canvas.height, this.context.canvas.width/2, -1 * this.context.canvas.height, arcRadius)
            this.context.arcTo(this.context.canvas.width - x, -1 * this.context.canvas.height, this.context.canvas.width, 0, arcRadius)
            this.context.lineTo(this.context.canvas.width, 0);
            this.context.closePath();
            this.context.fill();
            this.context.save();
            this.context.clip();
            this.context.beginPath();
            this.context.moveTo(0, -0.8 * this.context.canvas.height);
            this.context.arcTo(x, width0 - this.context.canvas.height, this.context.canvas.width/2, width0 - this.context.canvas.height, arcRadius)
            this.context.arcTo(this.context.canvas.width - x, width0 - this.context.canvas.height, this.context.canvas.width, -0.8 * this.context.canvas.height, arcRadius)
            this.context.lineTo(this.context.canvas.width, -0.8 * this.context.canvas.height);
            this.context.strokeStyle = "hsl(0, 0%, 70%)";
            this.context.lineWidth = 2 * width0;
            this.context.stroke();
            this.context.strokeStyle = "hsl(0, 0%, 100%)";
            this.context.lineWidth = 2;
            this.context.stroke();
            this.context.restore();
            this.context.fillStyle = "hsl(0, 0%, 90%)";
            this.context.fillRect(0, -3 * width0, this.context.canvas.width, 3 * width0);
            this.context.fillStyle = "hsl(0, 0%, 100%)";
            this.context.fillRect(0, -3 * width0, this.context.canvas.width, 2);
            this.context.fillStyle = "hsl(0, 0%, 70%)";
            this.context.fillRect(0, -3, this.context.canvas.width, 3);
            this.centerX = this.context.canvas.width/2;
            this.centerY = this.context.canvas.height/2.2;
            this.radius = Math.round(0.40 * Math.min(this.context.canvas.width, this.context.canvas.height));
            this.context.lineWidth = width0;
            this.context.beginPath();
            this.context.arc(this.centerX, this.centerY - (this.context.canvas.height - width0/2), this.radius, 0, 2 * Math.PI);
            this.context.closePath();
            this.context.fillStyle = "hsl(0, 0%, 100%)";
            this.context.fill();
            this.context.strokeStyle = "hsl(0, 0%, 70%)";
            this.context.stroke();
            this.context.beginPath();
            this.context.arc(this.centerX, this.centerY - this.context.canvas.height, this.radius, 0, 2 * Math.PI);
            this.context.closePath();
            this.context.strokeStyle = "hsl(0, 0%, 90%)";
            this.context.stroke();
            this.context.font = (2 * this.radius) + "px serif";
            this.context.fillStyle = "hsla(0, 0%, 0%, 0.1)"
            this.context.textAlign = "center";
            this.context.textBaseline = "middle";
            this.context.fillText(pi, this.centerX, this.centerY - this.context.canvas.height);
            this.context.beginPath();
            this.context.arc(this.centerX, this.centerY - this.context.canvas.height, 0.85 * this.radius, 0, 2 * Math.PI);
            this.context.closePath();
            this.context.lineWidth = 1;
            this.context.strokeStyle = "hsl(0, 0%, 70%)";
            this.context.stroke();
            this.context.save();
            this.context.translate(this.centerX, this.centerY - this.context.canvas.height);
            for (var angle = 0; angle < 63; angle++) {
                if (angle % 20 == 0) {
                    this.context.fillStyle = "black";
                    this.context.fillRect(-1, -0.85 * this.radius, 1, 10);
                } else if (angle % 10 == 0) {
                    this.context.fillStyle = "black";
                    this.context.fillRect(-1, -0.85 * this.radius, 1, 5);
                } else if (angle % 2 == 0) {
                    this.context.fillStyle = "gray";
                    this.context.fillRect(-1, -0.85 * this.radius, 1, 3);
                } else {
                    this.context.fillStyle = "gray";
                    this.context.fillRect(-1, -0.85 * this.radius, 1, 1);
                }
                this.context.rotate(0.1);
            }
            this.context.stroke();
            this.context.restore();
            this.hand = document.querySelector("#hand").getContext('2d');
            this.hand.canvas.height = this.hand.canvas.clientHeight;
            this.hand.canvas.style.width = this.context.canvas.clientWidth + "px";
            this.hand.canvas.width = this.hand.canvas.clientWidth;
            this.hand.translate(0, this.hand.canvas.height);
            this.hand.scale(1, this.yScale);
            this.hand.translate(this.centerX, this.centerY - this.hand.canvas.height);
            this.hand.strokeStyle = "red";
        }
    ,   Formula = function(display) {
            this.display = display;
            this.context = document.querySelector("#formula").getContext('2d');
            this.context.canvas.width = this.context.canvas.clientWidth;
            this.context.canvas.height = this.context.canvas.clientHeight;
            this.context.textAlign = "start";
            this.context.textBaseline = "top";
            this.margin = Math.round(display.body.context.canvas.width/2)
            this.buffer = document.querySelector("#calcBuffer").getContext('2d');
            this.buffer.canvas.width = this.context.canvas.clientWidth;
            this.buffer.canvas.height = this.context.canvas.clientHeight;
            this.leftEdge = this.margin;
            this.increment = document.querySelector("#increment").getContext('2d');
            this.increment.canvas.width = this.context.canvas.clientWidth;
            this.increment.canvas.height = this.context.canvas.clientHeight;
            this.increment.font = Math.round(0.4 * this.increment.canvas.height) + "px serif";
            this.increment.fillStyle = this.increment.strokeStyle = "hsla(" + this.display.moire.hue + ", 50%, 80%, 1)";
            this.increment.textAlign = "center";
            this.increment.textBaseline = "middle";
            this.increment.lineWidth = 2;
            this.midline = Math.round(this.increment.canvas.height/2);
            this.numeratorMidline = Math.round(this.increment.canvas.height/4);
            this.denominatorMidline = this.numeratorMidline + this.midline;
            this.numerator = null;
        }
    ,   Fraction = function(display) {
             this.display = display;
             this.element = document.querySelector("#fraction");
             this.element.width = this.element.clientWidth;
             this.fullHeight = this.element.height = this.element.clientHeight;
             this.context = this.element.getContext('2d');
             this.context.translate(0, this.element.height);
             this.context.scale(1, -1);
             this.count = new FractionCount(this);
             this.grid = new Grid(this);
        }
    ,   FractionCount = function(fraction) {
            var height = Math.round(fraction.display.height/30)
            ;
            this.fraction = fraction;
            this.element = document.querySelector("#fractionCount");
            this.element.style.width = (5 * height) + "px";
            this.element.style.height = height + "px";
            this.element.width = this.element.clientWidth;
            this.element.height = this.element.clientHeight;
            this.context = this.element.getContext('2d');
            this.context.textAlign = "start";
            this.context.textBaseline = "bottom";
            this.context.font = height + "px serif";
        }
    ,   Grid = function(fraction) {
            this.fraction = fraction;
            this.element = document.querySelector("#grid");
            this.element.width = this.fraction.element.clientWidth;
            this.context = this.element.getContext('2d');
            this.pattern = new Pattern(this);
        }
    ,   Moire = function(display) {
            var scaleBodyBoundingRect = display.body.context.canvas.getBoundingClientRect()
            ,   gradientHue = 180 + (60 * Math.random())
            ;
            this.display = display;
            this.maxRadius = 0.7 * this.display.body.radius;
            this.minRadius = 0.1 * this.display.body.radius;
            this.radius = this.minRadius + ((this.maxRadius - this.minRadius) * Math.random());
            this.radiusIncrement = ((Math.random() < 0.5) ? -1 : 1) * this.minRadius;
            this.clockwise = Math.random() < 0.5;
            this.context = document.querySelector("#moires").getContext('2d');
            this.context.canvas.width = this.context.canvas.clientWidth;
            this.context.canvas.height = this.context.canvas.clientHeight;
            this.context.translate(-1 * this.radius, -1 * this.radius);
            this.source = document.querySelector("#moireSource").getContext('2d');
            this.source.canvas.style.width = (this.context.canvas.clientWidth + (2 * this.radius)) + "px";
            this.source.canvas.style.height = (this.context.canvas.clientHeight + (2 * this.radius)) + "px";
            this.source.canvas.width = this.source.canvas.clientWidth;
            this.source.canvas.height = this.source.canvas.clientHeight;
            this.hue = gradientHue + (((Math.random() < 0.5) ? -1 : 1) * 60)
            this.source.strokeStyle = "hsla(" + this.hue + ", 60%, 50%, 0.8)"
            this.source.lineWidth = 1;
            this.source.translate(Math.floor(this.source.canvas.width/2), scaleBodyBoundingRect.bottom);
            for (var i = 1; i < Math.max(this.source.canvas.height, this.source.canvas.width); i += 8) {
                this.source.beginPath();
                this.source.arc(0, 0, i, 0, 2 * Math.PI);
                this.source.closePath();
                this.source.stroke();
            }
            this.angle = 0
            this.background = document.querySelector("#background");
            this.background.style.background = "radial-gradient(ellipse 75% 75% at 50% 85%, hsl(" + gradientHue + ", 60%, 10%), hsl(" + (gradientHue + 20) + ", 60%, 50%))";
        }
    ,   Pan = function(display) {
            var width0 = 10
            ,   width1 = Math.round(0.6 * display.body.topWidth)
            ;
            this.display = display;
            this.platformElement = document.querySelector("#platform");
            this.element = document.querySelector("#pan");
            this.element.width = this.element.clientWidth;
            this.element.height = this.element.clientHeight;
            this.context = this.element.getContext('2d');
            this.context.fillStyle = "hsl(0, 0%, 80%)";
            this.context.fillRect((this.element.width - (width1 + width0))/2, 0, width0, this.element.height);
            this.context.fillRect((this.element.width + (width1 - width0))/2, 0, width0, this.element.height);
            this.context.fillRect(0, 0, this.element.width, width0);
            this.context.fillStyle = "hsl(0, 0%, 100%)";
            this.context.fillRect(0, 0, this.element.width, width0/4);
            this.context.fillStyle = "hsl(0, 0%, 65%)";
            this.context.fillRect(0, width0 - 2, this.element.width, 1);
            this.context.fillRect((this.element.width - (width1 + width0))/2, width0, width0, 2 * width0);
            this.context.fillRect((this.element.width + (width1 - width0))/2, width0, width0, 2 * width0);
            this.boundingRect = this.element.getBoundingClientRect();
        }
    ,   Pattern = function(grid) {
            this.grid = grid;
            this.element = patternRoot;
            this.element.width = this.element.clientWidth;
            this.context = this.element.getContext('2d');
        }
    ,   Result = function(display) {
            this.display = display;
            this.context = document.querySelector("#result").getContext('2d');
            this.context.canvas.width = this.context.canvas.clientWidth;
            this.context.canvas.height = this.context.canvas.clientHeight;
            this.context.textAlign = "center";
            this.context.textBaseline = "middle";
            this.context.fillStyle = "hsla(" + this.display.moire.hue + ", 50%, 90%, 1)";
            this.margin = Math.round(this.display.body.context.canvas.width/2)
            this.x = (this.context.canvas.width + this.margin)/2;
            this.y = this.context.canvas.height/2;
            this.fontSize = Math.max(10, Math.round(0.9 * this.context.canvas.height));
            this.fontSize = Math.max(10, this.context.canvas.height);
            this.decimals = 4;
            this.setWidth(1);
        }
    ,   Title = function(blockset) {
            var title = "The Leibniz Formula for pi"
            ;
            this.blockset = blockset;
            this.context = document.querySelector("#title").getContext('2d');
            this.context.canvas.width = this.context.canvas.clientWidth;
            this.context.canvas.height = this.context.canvas.clientHeight;
            this.fontSize = this.context.canvas.height;
            do {
                this.fontSize--;
                this.context.font = this.fontSize + "px serif";
            } while (this.context.measureText(title).width > this.context.canvas.width);
            this.context.fillStyle = "hsla(" + this.blockset.display.moire.hue + ", 50%, 90%, 0.8)"
            this.context.strokeStyle = "hsla(" + this.blockset.display.moire.hue + ", 50%, 50%, 0.8)"
            this.context.textAlign = "center";
            this.context.textBaseline = "bottom";
            this.context.fillText(title, this.context.canvas.width/2, this.context.canvas.height);
            this.context.strokeText(title, this.context.canvas.width/2, this.context.canvas.height);
            this.context.canvas.style.transform = "translate3d(" + this.blockset.slideDistance + "px, 0px, 0)"
        }
    ;
    Display.prototype = {
        draw: function(interval) {
            var increment = 0
            ;
            this.moire.draw(interval);
            if (this.decellerate) {
                this.period += (this.basePeriod - this.period) * this.accellerationRate;
                if ((this.basePeriod - this.period) < 0.1) {
                    this.decellerate = false;
                }
            }
            if (this.blockset.advancing) {
                this.blockset.draw(interval);
                this.blockset.title.draw();
                this.formula.draw();
                this.body.draw();
            } else if (this.fraction.advancing) {
                this.fraction.draw(interval);
            } else {
                this.blockset.advance();
                this.formula.advance();
                this.fraction.advance();
            }
        }
    }
    Averaging.prototype = {
        toggle: function() {
            if (this.value) {
                this.priorValue = this.value;
                this.value = 0;
                this.element.style.opacity = 0.3;
                this.element.textContent = "no averaging";
            } else {
                this.value = this.priorValue + 2;
                this.element.style.opacity = 1;
                this.element.textContent = "average of last " + this.value + " results";
            }
        }
    }
    Block.prototype = {
        addLayer: function() {
            var y = this.set.priorBlockHeight
            ,   height = this.set.blockHeight - y
            ,   hue = 30 + (20 * Math.random())
            ,   saturation = 70 + (30 * Math.random())
            ,   luminosity = 50 + (20 * Math.random())
            ,   x1 = 0
            ,   x2 = 0
            ;
            this.x = Math.max(0, Math.min(this.element.width - this.set.blockWidth, this.x + ((Math.random() * 6) - 3)))
            this.context.clearRect(0, y, this.element.width, height);
            this.context.fillStyle = "hsl(" + hue + ", " + saturation + "%, " + luminosity + "%)";
            this.context.beginPath();
            this.context.rect(this.x, y, this.set.blockWidth, height);
            this.context.closePath();
            this.context.fill()
            if (height > 5) {
                this.context.save();
                this.context.clip();
                this.context.scale(1 + Math.random(), 1 + Math.random());
                this.context.globalAlpha = 0.1;
                this.context.globalCompositeOperation = "darken";
                this.context.drawImage(this.set.display.moire.source.canvas, this.textureXMax * Math.random(), this.textureYMax * Math.random(), this.element.width, this.element.height, 0, 0, this.element.width, this.element.height);
                this.context.globalCompositeOperation = "lighter";
                this.context.drawImage(this.set.display.moire.source.canvas, this.textureXMax * Math.random(), this.textureYMax * Math.random(), this.element.width, this.element.height, 0, 0, this.element.width, this.element.height);
                this.context.globalAlpha = 1;
                this.context.globalCompositeOperation = "source-over";
                this.context.restore();
            }
            for (var i = 0.2; i < 0.6; i = i + 0.3) {
                this.context.beginPath();
                this.context.moveTo(this.x, y);
                x1 = this.x + (this.set.blockWidth * (i + (0.2 * Math.random())));
                x2 = Math.max(this.x + 5, x1 + (height * 0.3 * Math.random()))
                this.context.lineTo(x1, y);
                this.context.quadraticCurveTo(x1, y + (height/2), x2, y + height);
                this.context.lineTo(this.x, y + height);
                this.context.closePath();
                this.context.fillStyle = "hsla(0, 0%, 0%, 0.1)";
                this.context.fill()
            }
            if (this.set.level == 1) {
                this.context.fillStyle = "hsla(0, 0%, 100%, 0.5)";
                this.context.fillRect(this.x, y, this.set.blockWidth, 3)
            }
        }
    ,   offset: function() {
            if (this.set.slideEntry) {
                this.offset = Math.max(0, this.right + this.set.gapHeight - this.set.slideOffset);
            } else {
                this.offset = Math.max(0, this.left - this.set.slideOffset);
            }
        }
    }
    Blockset.prototype = {
        advance: function() {
            var block = this.lastBlock
            ;
            do {
                this.level++;
                this.denominator = (2 * this.level) - 1
                this.priorValues.push(this.currentValue || 0);
                this.currentValue += ((this.level % 2) ? 4 : -4)/this.denominator;
                this.display.skipDisplayCount = Math.max(0, this.display.skipDisplayCount - 1);
            } while (this.display.skipDisplayCount);
            document.body.style.cursor = "default";
            this.priorBlockHeight = this.blockHeight || 0;
            this.blockHeight = Math.round(this.element.height * this.currentValue/4);
            this.slideEntry = this.currentValue > this.priorValues[this.priorValues.length - 1];
            this.gapHeight = Math.round(Math.abs(this.blockHeight - this.priorBlockHeight));
            this.gapValue = (this.currentValue - this.priorValues[this.priorValues.length - 1])/4;
            if (!this.display.decellerate) {
                this.display.period *= this.display.accellerationRate;
            }
            this.advancing = true;
            if (this.gapHeight) {
                this.slideCompletion = 0;
                this.firstOffset = this.priorBlockHeight ? this.lastBlock : null;
                this.marginCleared = false;
                this.velocity = this.slideDistance/this.display.period;
                this.slideOffset = this.slideEntry ? (this.slideDistance + Math.max(0, this.gapHeight - this.margin)) : 0;
                while (block) {
                    if (this.slideEntry) {
                        block.addLayer();
                    }
                    block = block.prevBlock;
                }
                if (this.display.period < this.display.decellerateLimit) {
                    this.element.style.cursor = "pointer";
                    this.element.style.pointerEvents = "auto";
                }
            } else {
                this.slideCompletion = 1;
                this.firstOffset = null;
                this.marginCleared = true;
                this.element.style.cursor = "default";
                this.element.style.pointerEvents = "none";
                this.display.formula.context.canvas.style.cursor = "pointer";
                this.display.formula.context.canvas.style.pointerEvents = "auto";
            }
            return this;
        }
    ,   deleteBlocks: function() {
            var block = this.firstBlock
            ;
            while (block) {
                if (block.id) {
                    block.element.parentNode.removeChild(block.element);
                }
                block = block.nextBlock;
            }
        }
    ,   draw: function(interval) {
            var x = 0
            ,   y = 0
            ,   block = null
            ;
            if (this.gapHeight) {
                this.slideOffset -= this.velocity * interval * this.easing(this.slideEntry, this.slideCompletion);
                if (this.slideEntry && (this.slideOffset < this.slideDistance)) {
                    if (this.slideOffset <= 0) {
                        this.slideCompletion = 1;
                        this.marginCleared = true;
                    } else {
                        this.slideCompletion = Math.min(1, Math.max(0, (this.panWidth - this.slideOffset)/this.panWidth));
                    }
                    block = this.firstOffset;
                    x = this.slideOffset - this.gapHeight;
                    while (block && (x < block.right)) {
                        if (this.slideOffset <= block.right) {
                            this.firstOffset = block.prevBlock;
                        }
                        y = Math.min(this.gapHeight, Math.round(block.right - x));
                        this.context.clearRect(block.left, 0, block.element.width, block.element.height);
                        this.context.drawImage(block.element, 0, 0, block.element.width, this.priorBlockHeight, block.left, block.element.height - (this.priorBlockHeight + y), block.element.width, this.priorBlockHeight);
                        block = block.prevBlock;
                    }
                    y = this.element.height - this.gapHeight;
                    block = this.firstBlock;
                    x = Math.round(Math.max(0, this.slideOffset));
                    while (block && ((x + block.left) < this.slideDistance)) {
                        if (!block.prevBlock) {
                            this.context.clearRect(x, y, this.slideDistance, this.gapHeight);
                        }
                        this.context.drawImage(block.element, 0, this.priorBlockHeight, block.element.width, this.gapHeight, x + block.left, y, block.element.width, this.gapHeight);
                        block = block.nextBlock;
                    }
                } else if (!this.slideEntry) {
                    y = this.element.height - this.gapHeight;
                    if ((this.panWidth + this.slideOffset) <= 0) {
                        this.slideCompletion = 1;
                        if ((this.panWidth + this.slideOffset) <= (-1 * this.margin)) {
                            this.marginCleared = true;
                        }
                    } else {
                        this.slideCompletion = Math.min(1, -1 * this.slideOffset/this.panWidth);
                    }
                    this.context.clearRect(-1 * this.margin, y, this.margin, this.gapHeight);
                    block = this.lastBlock;
                    x = Math.round(Math.min(0, this.slideOffset));
                    while (block && ((x + block.right + this.margin) > 0)) {
                        if (!block.nextBlock && this.firstOffset) {
                            this.context.clearRect(0, y, this.firstOffset.right, this.gapHeight);
                        }
                        this.context.drawImage(block.element, 0, this.blockHeight, block.element.width, this.gapHeight, x + block.left, y, block.element.width, this.gapHeight);
                        block = block.prevBlock;
                    }
                    block = this.firstOffset;
                    x = this.panWidth + this.slideOffset;
                    while (block && (x < block.left)) {
                        if (x < (block.left - this.gapHeight)) {
                            this.firstOffset = block.prevBlock;
                        }
                        y = Math.max(0, Math.round(this.gapHeight - (block.left - x)));
                        this.context.clearRect(block.left, 0, block.element.width, block.element.height);
                        this.context.drawImage(block.element, 0, 0, block.element.width, this.blockHeight, block.left, block.element.height - (this.blockHeight + y), block.element.width, this.blockHeight);
                        block = block.prevBlock;
                    }
                }
            }
            if (!this.firstOffset && this.marginCleared && (this.slideCompletion == 1)) {
                this.advancing = false;
            }
        }
    ,   easing: function (easeOut, completion) {
            var t = 0
            ;
            if (easeOut) {
                if (completion > 0.9) {
                    return Math.max(0.07, Math.pow(10 * (1 - completion), 2));
                } else {
                    return 1;
                }
            } else {
                if (completion < 0.1) {
                    return Math.max(0.07, Math.pow(10 * completion, 2));
                } else {
                    return 1;
                }
            }
        }
    }
    Body.prototype = {
        draw: function() {
            var weight = this.display.blockset.priorValues[this.display.blockset.priorValues.length - 1] + (4 * this.display.blockset.gapValue * this.display.blockset.slideCompletion)
            ,   angle = 2 * weight
            ,   yTranslate = 2.5 * weight
            ;
            this.display.pan.platformElement.style.transform = "translateY(" + yTranslate + "%)";
            this.hand.clearRect(this.hand.canvas.width/-2, this.hand.canvas.height/-2, this.hand.canvas.width, this.hand.canvas.height);
            this.hand.rotate(angle);
            this.hand.beginPath();
            this.hand.moveTo(0, -0.8 * this.radius);
            this.hand.lineTo(0, 0.2 * this.radius);
            this.hand.arc(0, 0, 2, 0.5 * Math.PI, 2.5 * Math.PI);
            this.hand.stroke();
            this.hand.rotate(-1 * angle);
        }
    }
    Formula.prototype = {
        draw: function() {
            var completion = this.display.blockset.slideCompletion
            ,   numerator = this.display.blockset.slideEntry ? Math.ceil(4 * completion) : Math.floor(4 * completion)
            ,   textMeasure = 0
            ,   offset = 0
            ,   increment = 0
            ;
            if (!this.complete) {
                if (numerator != this.numerator) {
                    this.numerator = numerator;
                    textMeasure = this.increment.measureText(this.numerator).width;
                    this.increment.clearRect(this.x, 0, this.increment.canvas.width, this.midline - this.increment.lineWidth);
                    this.increment.fillText(this.numerator, this.midWidth, this.numeratorMidline);
                    this.display.result.draw()
                }
                this.context.clearRect(this.leftEdge, 0, this.context.canvas.width, this.context.canvas.height);
                offset = this.offset * (1 - completion);
                if ((this.leftEdge + this.endWidth + this.margin) > this.context.canvas.width) {
                    increment = ((this.endWidth + this.margin) - (this.context.canvas.width - this.leftEdge)) * completion;
                    this.buffer.clearRect(0, 0, this.buffer.canvas.width, this.buffer.canvas.height);
                    this.buffer.drawImage(this.context.canvas, 0, 0);
                    this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
                    this.context.drawImage(this.buffer.canvas, -1 * increment, 0);
                    this.leftEdge -= increment;
                }
                this.context.drawImage(this.increment.canvas, this.leftEdge + offset, 0);
                if (completion == 1) {
                    this.complete = true;
                    this.leftEdge += this.endWidth;
                }
            }
        }
    ,   advance: function() {
            var text = ""
            ,   textMeasure = 0
            ;
            this.increment.clearRect(0, 0, this.increment.canvas.width, this.increment.canvas.height);
            text = this.display.blockset ? (this.display.blockset.slideEntry ? " + " : " - ") : "";
            this.x = Math.ceil(this.increment.measureText(text).width);
            this.increment.fillText(text, this.x/2, this.midline);
            text = this.display.blockset ? this.display.blockset.denominator : 1;
            textMeasure = Math.ceil(this.increment.measureText(text).width);
            this.midWidth = this.x + (textMeasure/2);
            this.endWidth = this.x + textMeasure;
            this.offset = Math.max(this.margin, this.context.canvas.width - this.leftEdge);
            this.increment.fillText(text, this.midWidth, this.denominatorMidline);
            this.increment.beginPath();
            this.increment.moveTo(this.x, this.midline);
            this.increment.lineTo(this.x + textMeasure, this.midline);
            this.increment.closePath();
            this.increment.stroke();
            this.numerator = 0;
            this.complete = false;
            return this;
        }
    }
    Fraction.prototype = {
        draw: function(interval) {
            this.duration += interval;
            if (this.duration >= this.display.period) {
                this.advancing = false;
                this.count.draw(this.display.blockset.denominator + 2);
            } else if (!this.count.halfway && this.duration >= (this.display.period/2)) {
                this.count.halfway = true;
                this.count.draw(this.display.blockset.denominator + 1);
            } else {
                this.count.fade();
            }
            this.context.clearRect(0, 0, this.element.width, this.element.height);
            this.context.drawImage(this.grid.element, 0, 0, this.element.width, this.element.height + ((this.grid.element.height - this.element.height) * Math.min(1, this.duration/this.display.period)), 0, 0, this.element.width, this.element.height);
        }
    ,   advance: function() {
            var gridHeight = 0
            ;
            if (this.display.blockset.denominator < this.fullHeight) {
                if (this.display.blockset.denominator > this.fullHeight/2) {
                    this.count.context.globalAlpha = this.context.globalAlpha = 2 * (this.fullHeight - this.display.blockset.denominator)/this.fullHeight;
                }
                gridHeight = Math.floor(this.fullHeight/this.display.blockset.denominator)
                this.grid.pattern.element.style.height = Math.floor(2 * gridHeight) + "px";
                this.grid.pattern.element.height = this.grid.pattern.element.clientHeight;
                this.grid.element.style.height = ((this.display.blockset.denominator + 2) * gridHeight) + "px";
                this.grid.element.height = this.grid.element.clientHeight;
                this.grid.pattern.context.fillStyle = "hsla(0, 0%, 100%, 0.2)";
                this.grid.pattern.context.fillRect(0, 0, this.grid.pattern.element.width, Math.floor(this.grid.pattern.element.height/2));
                this.grid.context.fillStyle = this.grid.context.createPattern(this.grid.pattern.element, "repeat");
                this.grid.context.fillRect(0, 0, this.grid.element.width, this.grid.element.height);
                this.duration = 0;
                this.advancing = true;
                this.count.halfway = false;
            } else {
                this.context.clearRect(0, 0, this.element.width, this.element.height);
                this.count.clear();
                this.advancing = false;
            }
            return this;
        }
    }
    FractionCount.prototype = {
        clear: function() {
            this.context.clearRect(0, 0, this.element.width, this.element.height);
        }
    ,   draw: function(value) {
            var suffix = (value == 2) ? "ves" : (value == 3) ? "rds" : (value < 21) ? "ths" : (value % 10 == 1) ? "sts" : (value % 10 == 2) ? "nds" : (value % 10 == 3) ? "rds" : "ths"
            ;
            this.context.fillStyle = "hsla(0, 0%, 100%, 0.5)";
            this.context.globalCompositeOperation = "source-over";
            this.clear();
            this.context.fillText(value + suffix, 0, this.element.height);
        }
    ,   fade: function() {
            this.context.fillStyle = "hsla(0, 0%, 0%, 0.1)";
            this.context.globalCompositeOperation = "destination-out";
            this.context.fillRect(0, 0, this.element.width, this.element.height);
        }
    }
    Moire.prototype = {
        draw: function(interval) {
            var x = 0
            ,   y = 0
            ,   angleIncrement = interval/5000
            ;
            this.angle += (this.clockwise ? -1 : 1) * angleIncrement;
            this.radius += this.radiusIncrement * angleIncrement/(2 * Math.PI);
            if ((this.radius > this.maxRadius) || (this.radius < this.minRadius)) {
                this.radiusIncrement *= -1;
            }
            this.context.clearRect(0, 0, this.source.canvas.width, this.source.canvas.height);
            this.context.drawImage(this.source.canvas, 0, 0);
            x = this.radius * Math.sin(this.angle);
            y = this.radius * Math.cos(this.angle);
            this.context.drawImage(this.source.canvas, x, y);
        }
    }
    Result.prototype = {
        draw: function() {
            var displayValue = 0
            ,   sum = 0
            ,   count = 0
            ;
            this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
            if (this.display.formula.numerator == 4) {
                this.value = this.display.blockset.currentValue;
                if (this.display.averaging.value) {
                    count = Math.min(this.display.averaging.value, this.display.blockset.priorValues.length)
                    for (var i = 1; i <= count; i++) {
                        sum += this.display.blockset.priorValues[this.display.blockset.priorValues.length - i];
                    }
                    displayValue = sum/count;
                } else {
                    displayValue = this.value;
                }
                this.display.blockset.priorValues = this.display.blockset.priorValues.slice(-1 * Math.max(1, this.display.averaging.value));
            } else {
                displayValue = (this.value || 0) + (this.display.formula.numerator * this.display.blockset.gapValue);
            }
            this.context.fillText(Number.parseFloat(displayValue).toFixed(this.decimals), this.x, this.y);
        }
    ,   setWidth: function(decimalsChange, fontChange) {
            var width = 0
            ,   availableSpace = this.context.canvas.width - this.margin
            ;
            if ((this.decimals == 20) && (decimalsChange == 1)) {
                this.context.canvas.style.cursor = "default";
                this.context.canvas.style.pointerEvents = "none";
                return false;
            }
            this.decimals += decimalsChange || 0
            this.fontSize += fontChange || 0
            this.context.font = this.fontSize + "px serif";
            width = this.context.measureText(Number.parseFloat(0).toFixed(this.decimals)).width;
            if (width < availableSpace) {
                if (decimalsChange > 0) {
                    this.setWidth(1);
                } else if ((decimalsChange < 0) || (fontChange < 0)) {
                    return true;
                }
            } else if (width > availableSpace) {
                if (decimalsChange !== undefined) {
                    if (this.decimals > 4) {
                        if (fontChange !== undefined) {
                            this.setWidth(0, -1);
                        } else {
                            this.setWidth(-1);
                        }
                    } else {
                        this.setWidth(0, -1);
                    }
                } else {
                    this.setWidth(0, -1);
                }
            } else {
                return true;
            }
        }
    }
    Title.prototype = {
        draw: function() {
            if ((this.blockset.level == 1) || (this.blockset.level == 2)) {
                this.context.canvas.style.transform = "translate3d(" + (this.blockset.slideOffset + this.blockset.firstBlock.left) + "px, 0px, 0)"
            }
        }
    }
    return new Display();
}
function initialize() {
    canvasRoot.addEventListener("click", function(e) {
        if (e.target.classList.contains("averagingClass")) {
            display.averaging.toggle();
        } else if (e.target.classList.contains("resultClass")) {
            display.result.setWidth(1, 0);
            display.result.draw();
        } else if (e.target.classList.contains("blocksetClass")) {
            display.decellerate = true;
            display.blockset.element.style.cursor = "default";
            display.blockset.element.style.pointerEvents = "none";
        } else if (e.target.classList.contains("formulaClass")) {
            display.skipDisplayCount = Math.pow(10, Math.floor(Math.log10(display.blockset.denominator)))/2;
            display.formula.context.canvas.style.cursor = "default";
            document.body.style.cursor = "wait";
            display.formula.context.canvas.style.pointerEvents = "none";
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
