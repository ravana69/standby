(function() {
"use strict";

const displayRoot = document.querySelector("#displayRoot")
,   hues = [0, 30, 60, 120, 180, 240, 270, 300]
,   testHues = [hues[2], hues[4], hues[3], hues[7], hues[0], hues[5]];
let display = null
,   animationId = null
,   screenCount = 0;
window.onload = function() {
    display = createDisplay();
    animationId = window.requestAnimationFrame(animationLoop);
}
window.onresize = function() {
    window.cancelAnimationFrame(animationId);
    if (display.scroll.currentScreen.otherScreen) {
        display.scroll.currentScreen.otherScreen.delete();
    }
    display.scroll.currentScreen.delete();
    display = createDisplay();
    animationId = window.requestAnimationFrame(animationLoop);
}
function createDisplay() {
    const Display = function() {
            this.parent = null;
            this.element = displayRoot;
            this.width = this.element.clientWidth;
            this.height = this.element.clientHeight;
            const minWidthHeight = Math.min(this.width, this.height);
            this.minGridSize = Math.max(60, minWidthHeight/15);
            this.maxGridSize = Math.min(200, minWidthHeight/6);
            this.actions = [];
            this.scroll = new Scroll(this);
            this.halftones = new Halftones(this);
            this.segments = [];
            this.scroll.addScreen(new Screen(this).size().populate().initialize());
            this.lines = new Lines(this).draw();
        }
    ,   Disc = function(parent, type, gridSize = parent.gridSize, transparent = false) {
            const moveable = (type != "primary");
            Segment.call(this, parent, null, moveable);
            this.element.style.clipPath = this.element.style.webkitClipPath = "circle(50%)"
            this.type = type;
            this.gridSize = gridSize;
            this.setTransparent(transparent);
            if (this.type == "target") {
                this.element.classList.add("front");
            }
        }
    ,   Fan = function(parent, startLineWidth, expansionRatio) {
            Segment.call(this, parent);
            this.startLineWidth = startLineWidth;
            this.expansionRatio = expansionRatio;
        }
    ,   Gap = function(scroll) {
            this.scroll = scroll;
            this.element = this.scroll.element.querySelector("#gap");
            this.element.style.width = `${this.scroll.display.width}px`
            this.element.width = this.element.clientWidth;
            this.element.style.height = `${Math.round(this.scroll.display.height/12)}px`
            this.element.height = this.element.clientHeight;
            this.context = this.element.getContext('2d');
        }
    ,   Grid = function(parent, type, gridSize = parent.gridSize, transparent = false, discWidth) {
            const moveable = (type != "primary") && (type != "border") && (type != "split");
            Segment.call(this, parent, null, moveable);
            this.type = type;
            this.gridSize = gridSize;
            this.setTransparent(transparent);
            this.discWidth = discWidth;
        }
    ,   Halftones = function(display) {
            this.display = display;
            this.element = document.querySelector("#halftones");
            this.height = this.element.clientHeight;
            this.count = 6;//this.element.clientWidth/this.height;
        }
    ,   Lines = function(display) {
            this.display = display;
            this.element = this.display.element.querySelector("#lines");
            this.element.width = this.element.clientWidth;
            this.scanWidth = 4;
            this.element.height = this.element.clientHeight;
            this.context = this.element.getContext('2d');
        }
    ,   Resolution = function(parent, vertical = false, blur = false, stepFactor = 0) {
            Segment.call(this, parent);
            this.vertical = vertical;
            this.blur = blur;
            this.stepFactor = stepFactor;
            this.element.classList.add("front");
        }
    ,   Screen = function(parent) {
            Segment.call(this, parent, false);
            this.display.scroll.element.appendChild(this.element);
            this.screenCount = screenCount++;
            this.moveable = [];
        }
    ,   Scroll = function(display) {
            this.display = display;
            this.element = this.display.element.querySelector("#scroll");
            this.gap = new Gap(this).draw();
            this.scrollY = 0;
            this.speed = this.display.height/(5 + (5 * Math.random()));
            this.period = Math.abs(this.display.height)/this.speed;
            this.scrollDown = Math.random() < 0.5;
            this.display.actions.push(new Translate(this, this.scrollY, 0));
        }
    ,   Segment = function(parent = null, cloneSegment, moveable = true) {
            this.parent = parent;
            if (this instanceof Screen) {
                this.display = this.parent;
                this.screen = this;
            } else {
                this.display = this.parent.display;
                this.screen = this.parent.screen;
                this.parent.segments.push(this);
            }
            this.id = this.display.segments.length;
            this.display.segments.push(this);
            if (cloneSegment) {
                this.element = this.parent.element.appendChild(cloneSegment.element.cloneNode(false));
            } else {
                this.element = this.parent.element.appendChild(document.querySelector("#segmentRoot").cloneNode(true));
            }
            const constructorName = this.constructor.name.toLowerCase();
            this.element.id = constructorName + this.id;
            this.element.setAttribute("data-id",this.id);
            this.element.classList.add(`${constructorName}s`);
            if (cloneSegment) {
                this.canvas = this.element.appendChild(cloneSegment.canvas.cloneNode(false));
            } else {
                this.canvas = this.element.querySelector(".canvases")
            }
            this.canvas.id = "canvas" + this.id;
            this.context = this.canvas.getContext('2d');
            this.colors = [];
            this.segments = [];
            this.scrollY = 0;
            if (!(this instanceof Screen) && moveable) {
                this.screen.moveable.push(this);
                this.element.classList.add("clickable");
            }
        }
    ,   Translate = function(segment, scrollY, period, delay = 0) {
            this.segment = segment;
            this.scrollY = scrollY;
            this.period = period;
            this.delay = delay;
        }
    ;
    Segment.prototype = {
        constructor: Segment
    ,   copy: function(parent) {
            return new this.constructor(parent);
        }
    ,   copyAll: function(parent, clone = true) {
            const copy = this.copy(parent).size(this.width, this.height, this.lineWidth).position(this.drawX, this.drawY, this.angle);
            this.segments.forEach(segment => {
                segment.copyAll(copy, clone);
            });
            if (clone) {
                copy.cloneOf = this;
            }
            return copy;
        }
    ,   delete: function() {
            this.segments.forEach(segment => {
                segment.delete();
            })
            delete this.display.segments[this.id];
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
            }
            return this;
        }
    ,   draw: function(context) {
            if (context) {
                context.clearRect(0, 0, this.canvas.width, this.canvas.height);
                context.translate(this.offset, this.offset);
                this.render(context);
                context.setTransform(1, 0, 0, 1, 0, 0);
            }
            return this;
        }
    ,   initialize: function(context = this.context) {
            this.segments.forEach(segment => {
                segment.initialize();
            })
            this.draw(context);
            return this;
        }
    ,   populate: function() {
            return this;
        }
    ,   position: function(x = (this.parent.width - this.width)/2, y = (this.parent.height - this.height)/2, angle, centerX, centerY) {
            if ((centerX !== undefined) && (centerY !== undefined)) {
                const quadrant = Math.round(2 * angle/Math.PI)
                ,   useX = (quadrant == 1) ? (centerX + (centerY - (y + this.height))) :
                    (quadrant == 2) ? (centerX - (x + this.width - centerX)) :
                    (centerX - (centerY - y))
                ,   useY = (quadrant == 1) ? (centerY - (centerX - x)) :
                    (quadrant == 2) ? (centerY + (centerY - (y + this.height))) :
                    (centerY - (x + this.width - centerX));
                if (quadrant != 2) {
                    this.size(this.height, this.width, this.lineWidth)
                }
                this.position(useX, useY, angle);
            } else {
                this.drawX = Math.round(x);
                this.drawY = Math.round(y);
                this.angle = angle;
                this.element.style.left = `${this.drawX}px`;
                this.element.style.top = `${this.drawY}px`;
            }
            return this;
        }
    ,   render: function(context) {
            return this;
        }
    ,   replace: function(downDirection, delay = 0) {
            this.element.classList.add("replaced");
            this.element.classList.remove("clickable");
            const scrollY = downDirection ? (this.parent.height - this.drawY) : -1 * (this.drawY + this.height)
            ,   replacementDrawY = downDirection ? (-1 * this.height) : this.parent.height
            ,   replacementScrollY = downDirection ? (this.drawY + this.height) : this.drawY - this.parent.height
            ,   replacement = this.copyAll(this.parent, false).initialize().position(this.drawX, replacementDrawY, this.angle);
            replacement.scrolling = true;
            replacement.element.classList.add("replacement");
            this.display.actions.push(new Translate(this, scrollY, Math.abs(scrollY/(2 * this.display.scroll.speed)), delay));
            this.display.actions.push(new Translate(replacement, replacementScrollY, Math.abs(replacementScrollY/(2 * this.display.scroll.speed)), delay));
            return this;
        }
    ,   setColors: function(...colors) {
            this.colors = colors;
            return this;
        }
    ,   setLine: function(color = this.screen.lineColor || "black", count = 1) {
            this.lineColor = color;
            this.lineCount = count;
            return this;
        }
    ,   setTransparent: function(transparent = true) {
            this.transparent = transparent;
            if (this.canvas && (this instanceof Disc || this instanceof Grid)) {
                if (this.transparent) {
                    this.canvas.classList.add("front");
                } else {
                    this.canvas.classList.remove("front");
                }
            }
            return this;
        }
    ,   size: function(width = this.parent.width, height = this.parent.height, lineWidth = 0) {
            this.width = Math.round(width);
            this.height = Math.round(height);
            this.lineWidth = lineWidth;
            this.offset = ((this instanceof Disc) || (this instanceof Grid)) ? Math.ceil(this.lineWidth/2) : 0;
            this.transform = (this.parent.offset || 0) - this.offset;
            this.element.style.transform = `translate3d(${this.transform}px, ${this.transform}px, 0)`;
            this.element.style.width = `${this.width + (2 * this.offset)}px`;
            this.element.style.height = `${this.height + (2 * this.offset)}px`;
            if (this.canvas) {
                this.canvas.width = this.canvas.clientWidth;
                this.canvas.height = this.canvas.clientHeight;
            }
            if (this.gridSize) {
                this.columns = Math.ceil(this.width/this.gridSize);
                this.rows = Math.ceil(this.height/this.gridSize);
            }
            return this;
        }
    }
    Display.prototype = Object.create(Segment.prototype);
    Display.prototype.constructor = Display;
    Disc.prototype = Object.create(Segment.prototype);
    Disc.prototype.constructor = Disc;
    Disc.prototype.copy = function(parent) {
        return new Disc(parent, this.type, this.gridSize, this.transparent);
    }
    Disc.prototype.initialize = function(context) {
        if (this.cloneOf) {
            this.setColors(...this.cloneOf.colors).setLine(this.cloneOf.lineColor, this.cloneOf.lineCount);
        } else {
            if (this.type == "target") {
                this.setColors(this.screen.getColor("base", "light")).setLine(this.screen.lineColor, Math.ceil(2 + (5 * Math.random())));
            } else {
                const color = (this.type == "primary") ? this.screen.getColor("accent", "contrast") : this.screen.lineColor
                ,   lineCount = (this.type == "primary") ? Math.floor(1 + (2 * Math.pow(Math.random(), 2))) : 1;
                if (this.transparent) {
                    this.setLine(color, lineCount);
                } else {
                    this.setColors(color);
                }
            }
        }
        Segment.prototype.initialize.call(this, context);
        return this;
    }
    Disc.prototype.populate = function() {
        if ((this.type == "primary") && (this.columns > 6) && (Math.random() < 0.5)) {
            const diagonalGrids = Math.floor(this.width/Math.sqrt(2 * Math.pow(this.gridSize, 2)))
            ,   borderGrid = diagonalGrids > 5
            ,   width = (diagonalGrids - (borderGrid ? 1 : 0)) * this.gridSize
            ,   endLineWidth = 1 + Math.ceil(4 * Math.random())
            ,   grid = new Grid(this, "fan").size(width, width, endLineWidth).position().populate();
            if (borderGrid) {
                const extraRowGrid = new Grid(this, "step").size(width, this.gridSize, 0).position(grid.drawX, grid.drawX - this.gridSize)
                ,   center = this.width/2;
                [1, 2, 3].forEach((quadrant, index) => {
                    extraRowGrid.copyAll(this).position(extraRowGrid.drawX, extraRowGrid.drawY, quadrant * Math.PI/2, center, center);
                })
            }
            const borderWidth = (this.width - (width + (borderGrid ? (2 * this.gridSize) : 0)))/2;
            if (Math.random() < 0.5) {
                new Grid(this, "halftone").size(borderWidth, borderWidth, 0).position(undefined, 0);
            } else if (Math.random() < 0.5) {
                new Resolution(this, true, false, -1).size(width, borderWidth, endLineWidth).position(grid.drawX, 0);
            }
            if (Math.random() < 0.5) {
                new Resolution(this, true, false, 1).size(width, borderWidth, endLineWidth).position(grid.drawX, this.height - borderWidth);
            }
            if (Math.random() < 0.5) {
                const height = grid.height - (2 * this.gridSize)
                ,   width = borderWidth/3
                ,   y = grid.drawY + this.gridSize
                ,   direction = Math.random() < 0.5 ? -1 : 1
                ,   leftRes = new Resolution(this, true, false, direction).size(width, height, endLineWidth).position(width, y);
                leftRes.copyAll(this).position(this.width - (2 * width), y);
            }
        } else if (this.columns > 4) {
            const x = Math.floor(this.drawX/this.parent.gridSize) * this.parent.gridSize
            ,   y = Math.floor(this.drawY/this.parent.gridSize) * this.parent.gridSize
            ,   width = this.columns * this.gridSize;
            if ((this.type == "primary") && (Math.random() < 0.5)) {
                this.setTransparent(true);
                new Grid(this.parent, "split", this.gridSize, false, this.width).size(width, width).position(x, y).populate();
                this.element.classList.add("front");
            } else {
                new Grid(this, "split", this.gridSize, false, this.width).size(width, width).position(x - this.drawX, y - this.drawY).populate();
            }
        } else if (this.width > this.gridSize) {
            this.setTransparent(true);
            const endLineWidth = 1 + Math.ceil(3 * Math.random());//Math.ceil(3 + Math.random());
            new Grid(this, "fan").size(this.width, this.width, endLineWidth).position().populate();
        }
        return this;
    }
    Disc.prototype.render = function(context) {
        const x = (this.width/2)
        ,   y = (this.height/2)
        ,   radius = Math.min(this.width, this.height)/2;
        context.arc(x, y, radius, 0, 2 * Math.PI);
        if (this.colors.length) {
            context.fillStyle = this.colors[0];
            context.fill();
        }
        if (this.lineWidth) {
            context.lineWidth = this.lineWidth;
            context.strokeStyle = this.lineColor;
            for (let i = 0, r = radius; (i < this.lineCount) && (r > this.lineWidth); i++, r -= 2 * this.lineWidth) {
                context.beginPath();
                context.arc(x, y, r, 0, 2 * Math.PI);
                context.stroke();
            }
        }
        return this;
    }
    Fan.prototype = Object.create(Segment.prototype);
    Fan.prototype.constructor = Fan;
    Fan.prototype.copy = function(parent) {
        return new Fan(parent, this.startLineWidth, this.expansionRatio);
    }
    Fan.prototype.initialize = function(context) {
        if (this.cloneOf) {
            this.setColors(...this.cloneOf.colors);
        } else {
            this.setColors(this.screen.getColor("base", "light"), this.screen.getColor("base", "dark"));
        }
        Segment.prototype.initialize.call(this, context);
        return this;
    }
    Fan.prototype.render = function(context) {
        const endLineWidth = this.startLineWidth * this.expansionRatio
        ,   quadrant = Math.round(2 * (this.angle || 0)/Math.PI);
        let useHeight = this.height
        ,   useWidth = this.width;
        context.save();
        if (quadrant == 1) {
            context.translate(this.width/2, 0);
            context.rotate(this.angle);
            useHeight = this.width;
            useWidth = this.height;
        } else if (quadrant == 2) {
            context.translate(this.width, this.height/2);
            context.rotate(this.angle)
        } else if (quadrant == 3) {
            context.translate(this.width/2, this.height);
            context.rotate(this.angle)
            useHeight = this.width;
            useWidth = this.height;
        } else {
            context.translate(0, this.height/2);
        }
        const lineCount = Math.floor(useHeight/Math.max(this.startLineWidth, endLineWidth))
        ,   oddLineCount = lineCount - (1 - (lineCount % 2));
        for (let i = 0, startY = this.startLineWidth * oddLineCount/-2, endY = startY * this.expansionRatio; i < oddLineCount; i++) {
            context.beginPath();
            context.moveTo(0, startY);
            context.lineTo(useWidth, endY);
            endY += endLineWidth;
            context.lineTo(useWidth, endY);
            startY += this.startLineWidth;
            context.lineTo(0, startY);
            context.closePath();
            context.fillStyle = this.colors[i % this.colors.length];
            context.fill();
        }
        context.restore();
    }
    Gap.prototype = {
        draw: function() {
            this.context.fillStyle = "darkgray";
            this.context.fillRect(0, 0, this.element.width, this.element.height);
            this.context.fillStyle = "black";
            const width = Math.round(this.element.width/12)
            ,   height = Math.round(this.element.height/2)
            ,   x = (this.element.width - width)/2
            ,   lineHeight = height/3;
            this.context.fillRect(x, 0, width, height);
            this.context.fillRect(0, lineHeight, x - (2 * width), lineHeight);
            this.context.fillRect(x + width, lineHeight, x, lineHeight);
            return this;
        }
    ,   position: function(x = 0, y = 0) {
            Segment.prototype.position.call(this, x, y);
            return this;
        }
    }
    Grid.prototype = Object.create(Segment.prototype);
    Grid.prototype.constructor = Grid;
    Grid.prototype.copy = function(parent) {
        return new Grid(parent, this.type, this.gridSize, this.transparent, this.discWidth);
    }
    Grid.prototype.initialize = function(context) {
        if (this.cloneOf) {
            this.setColors(...this.cloneOf.colors).setLine(this.cloneOf.lineColor, this.cloneOf.lineCount);
            this.heightFactor = this.cloneOf.heightFactor;
            this.stickColumn = this.cloneOf.stickColumn;
            this.blockWidth = this.cloneOf.blockWidth;
            this.blockStart = this.cloneOf.blockStart;
            this.wedge = this.cloneOf.wedge;
            this.diagonal = this.cloneOf.diagonal;
        } else {
            if (this.type == "primary") {
                this.setColors(this.screen.getColor("base")).setLine(this.screen.getColor("accent", "contrast"));
            } else if (this.type == "border") {
                this.setColors(this.screen.getColor("accent"), this.screen.getColor("accent", "contrast")).setLine(this.screen.grid.lineColor);
            } else if (this.type == "fan") {
                const color = (Math.random() < 0.3) ? this.screen.getColor("base") : "transparent";
                this.setColors(color).setLine(this.screen.getColor("accent", "contrast"));
                this.heightFactor = (Math.random() < 0.8) ? 0.3 : 1;
                this.diagonal = Math.random() < 0.5;
            } else if (this.type == "split") {
                this.setLine(this.screen.getColor("accent", "contrast"));
                this.setTransparent(true);
            } else if (this.type == "step") {
                const count = Math.round(Math.random()) ? this.columns : 2;
                this.setColors(...colorArray(count, 0));
            } else if (this.type == "colors") {
                const gridRatio = Math.ceil(this.columns/this.rows)
                ,   luminosity = Math.round(Math.random()) ? 50 : 25 + (50 * Math.random());
                this.setColors(...colorArray(gridRatio, 100, luminosity));
            } else if (this.type == "blocks") {
                this.heightFactor = 1/(1 + Math.ceil(2 * Math.random()))
                this.setColors(this.screen.getColor("accent", "dark")).setLine(this.screen.getColor("accent", "light"));
            } else if (this.type == "fade") {
                const color1 = this.screen.getColor("accent", "contrast")
                ,   color2 = this.screen.getColor("base");
                Math.round(Math.random()) ? this.setColors(color1, color2) : this.setColors(color1, color2, color1);
            } else if (this.type == "brick") {
                this.setColors(this.screen.getColor("accent", "contrast"), this.screen.getColor("base"));
                const minWidth = (this.columns < 4) ? 1 : 2
                ,   maxWidth = (this.columns < 3) ? 1 : Math.max(2, this.columns - 2);
                this.blockWidth = minWidth + Math.floor((maxWidth - minWidth) * Math.random());
                this.heightFactor = 1 - (Math.random()/2);
                const minStart = (this.columns == 1) ? 0 : (this.columns < 4) ? 0.5 : 1
                ,   maxStart = (this.columns == 1) ? 0 : (this.columns - (this.blockWidth + ((this.columns < 4) ? 0.5 : 1)));
                this.blockStart = minStart + Math.floor((maxStart - minStart) * Math.random());
                if (Math.random() < 0.5) {
                    const minStart = (this.columns == 1) ? 0.5 : (this.columns < 4) ? 1 : this.blockStart + 1
                    ,   maxStart = (this.columns == 1) ? 0.5 : this.blockStart + this.blockWidth - ((this.columns < 4) ? 0.5 : 1)
                    this.stickColumn = minStart + Math.floor((maxStart - minStart) * Math.random());
                    this.wedge = Math.random() < 0.3;
                }
            }
        }
        Segment.prototype.initialize.call(this, context);
        return this;
    }
    Grid.prototype.populate = function() {
        if (this.type == "resolution") {
            if ((this.columns/this.rows) > 2) {
                const targetWidth = 2 * this.gridSize
                ,   sectionCount = Math.ceil(this.width/targetWidth)
                ,   blur = Math.random() < 0.5
                ,   constantWidth = Math.round(Math.random()) * Math.ceil(sectionCount * Math.random());
                for (let count = 0, startX = 0; count < sectionCount; count++) {
                    const lineWidth = constantWidth || sectionCount - count
                    ,   patternCount = Math.floor(Math.min(this.width - startX, ((count + 1) * targetWidth) - startX)/(2 * lineWidth))
                    ,   width = 2 * lineWidth * patternCount;
                    new Resolution(this, false, blur).size(width, this.gridSize, lineWidth).position(startX, 0);
                    startX += width;
                }
            } else {
                const lineWidth = (3 + Math.floor(3 * Math.random()))
                ,   step = Math.round(Math.random()) * (Math.random() < 0.5 ? -1 : 1);
                new Resolution(this, Math.random() < 0.5, false, step).size(this.width, this.height, lineWidth).position();
            }
        } else if (this.type == "fan") {
            const center = this.width/2
            ,   height = this.gridSize * (1 + (2 * Math.random()))/4
            ,   startLineWidth = 1
            ,   expansionRatio = this.lineWidth
            ,   fan = new Fan(this, startLineWidth, expansionRatio).size(center, height).position(center);
            [1, 2, 3].forEach((quadrant) => {
                const clone = fan.copyAll(this).position(fan.drawX, fan.drawY, quadrant * Math.PI/2, center, center);
            });
            if ((this.rows > 4) && (this.rows % 2)) {
                const resolution = new Resolution(this, Math.random() < 0.5, Math.random() < 0.5).size(this.gridSize, this.gridSize, this.lineWidth).position();
            } else if (Math.random() < 0.8) {
                const width = this.width/4
                ,   disc = new Disc(this, "target").size(width, width, this.lineWidth).position();
            }
        } else if (this.type == "split") {
            const types = [
                    ["brick", "blocks", "colors", "step", "resolution", "fade", null]
                ,   ["colors", "step", "resolution", "fade"]
                ,   ["blocks", "colors", "resolution"]]
                ,   doubleRowChance = 0.5 * Math.pow(Math.min(6, Math.max(0, this.rows - 6)), 2)/36;
            for (let row = 0, height = 0; row < this.rows; row += height) {
                height = Math.min(this.rows - row, (Math.random() < doubleRowChance) ? 2 : 1);
                if (!row && (height == 2)) {
                    const margin = (this.height - this.discWidth)/2
                    ,   reducedHeight = (height * this.gridSize) - margin;
                    new Grid(this, "halftone").size(this.width, reducedHeight, 0).position(0, margin);
                } else if (this.columns > 1) {
                    const type = types[height - 1][Math.floor(types[height - 1].length * Math.random())];
                    if (type) {
                        new Grid(this, type).size(this.width, height * this.gridSize, 0).position(0, row * this.gridSize).populate();
                    }
                } else {
                    const type = types[2][Math.floor(types[2].length * Math.random())];
                    new Grid(this, type).size(this.width, height * this.gridSize, 0).position(0, row * this.gridSize).populate();
                }
            }
        }
        return this;
    }
    Grid.prototype.render = function(context) {
        if ((this.type == "fan") ||  (this.type == "brick")) {
            context.fillStyle = this.colors[0];
            context.fillRect(0, 0, this.width, this.height);
        }
        if (this.type == "fade") {
            const width = this.vertical ? 0 : this.width
            ,   height = this.vertical ? this.height : 0
            ,   gradient = context.createLinearGradient(0, 0, width, height);
            this.colors.forEach((color, index) => {
                gradient.addColorStop(index/(this.colors.length - 1), color);
            })
            context.fillStyle = gradient;
            context.fillRect(0, 0, this.width, this.height);
        } else if (this.type == "fan") {
            context.strokeStyle = this.lineColor;
            context.lineWidth = 1;
            const center = this.width/2
            ,   unitMeasure = this.width/(2 * this.lineWidth);
            for (let i = 1; i * unitMeasure < this.width/2; i++) {
                [0, 1, 2, 3].forEach((quadrant) => {
                    const startAngle = (quadrant + ((1 - this.heightFactor)/2)) * Math.PI/2
                    ,   endAngle = startAngle + (this.heightFactor * Math.PI/2);
                    context.beginPath();
                    context.arc(center, center, i * unitMeasure, startAngle, endAngle);
                    context.stroke();
                })
            }
            if (this.diagonal) {
                context.beginPath();
                context.moveTo(0, 0);
                context.lineTo(this.width, this.height);
                context.moveTo(this.width, 0);
                context.lineTo(0, this.height);
                context.stroke();
            }
        } else if (this.type == "brick") {
            context.fillStyle = this.colors[1];
            const height = this.heightFactor * this.gridSize
            ,   y = this.gridSize - height;
            context.fillRect(this.blockStart * this.gridSize, y, this.blockWidth * this.gridSize, height);
            if (this.stickColumn) {
                if (this.wedge) {
                    context.fillStyle = this.colors[0];
                    const width = 10
                    ,   x = this.stickColumn * this.gridSize;
                    context.beginPath();
                    context.moveTo(x + (width/2), y);
                    context.lineTo(x + (width/2), y + height);
                    context.lineTo(x - (width/2), y);
                    context.fill();
                } else {
                    context.strokeStyle = this.colors[0];
                    context.lineWidth = 5;
                    context.strokeRect(this.stickColumn * this.gridSize, y, 0, height);
                }
            }
        } else if (this.type == "halftone") {
            const x = (this.width - this.height)/2
            ,   halftone = this.display.halftones;
            context.drawImage(halftone.element, halftone.getX(), 0, halftone.height, halftone.height, x, 0, this.height, this.height);
        } else if (this.colors.length) {
            const pattern = this.element.appendChild(this.canvas.cloneNode(false))
            ,   patternContext = pattern.getContext('2d')
            ,   heightFactor = this.heightFactor || 1
            ,   limit = Math.min(this.colors.length, Math.max(this.rows, this.columns/heightFactor));
            pattern.style.width = `${limit * this.gridSize}px`;
            pattern.style.height = `${heightFactor * limit * this.gridSize}px`;
            pattern.width = pattern.clientWidth;
            pattern.height = pattern.clientHeight;
            if ((this.lineWidth > 0) || (heightFactor != 1)) {
                patternContext.strokeStyle = this.lineColor;
                patternContext.lineWidth = this.lineWidth || 1;
            } else {
                patternContext.strokeStyle = "transparent"
            }
            this.colors.forEach((color, index) => {
                patternContext.fillStyle = color;
                for (let row = 0; row < limit; row++) {
                    const column = (this.colors.length + index - row) % this.colors.length;
                    patternContext.fillRect(column * this.gridSize, heightFactor * row * this.gridSize, this.gridSize, heightFactor * this.gridSize);
                    patternContext.strokeRect(column * this.gridSize, heightFactor * row * this.gridSize, this.gridSize, heightFactor * this.gridSize);
                }
            })
            context.fillStyle = context.createPattern(pattern, "repeat");
            context.fillRect(0, 0, this.width, this.height);
            this.element.removeChild(pattern);
        }
        if ((this.lineWidth > 0) && (this.type != "fan")) {
            context.strokeStyle = this.lineColor;
            context.lineWidth = this.lineWidth;
            context.strokeRect(0, 0, this.width, this.height);
        }
        return this;
    }
    Grid.prototype.size = function(width = this.parent.width, height = this.parent.height, lineWidth = this.screen.gridLineWidth) {
        Segment.prototype.size.call(this, width, height, lineWidth);
        return this;
    }
    Halftones.prototype = {
        getX: function() {
            return this.height * Math.floor(this.count * Math.random());
        }
    }
    Lines.prototype = {
        draw: function() {
             const minRadius = Math.min(this.element.width, this.element.height)/8
            ,   maxRadius = minRadius * 4
            ,   color = `hsla(0, 0%, 100%, 0.05)`;
            for (let i = 0; i < 10; i++) {
                const x = this.element.width * Math.random()
                ,   y = this.element.height * Math.random()
                ,   radius = minRadius + ((maxRadius - minRadius) * Math.random())
                ,   gradient = this.context.createRadialGradient(x, y, radius, x, y, 2 * radius);
                gradient.addColorStop(0, color);
                gradient.addColorStop(1, "transparent");
                this.context.fillStyle = gradient;
                this.context.fillRect(0, 0, this.element.width, this.element.height);
            }
            this.context.globalCompositeOperation = "destination-out";
            this.context.fillStyle = "black";
            this.context.filter = null;
            for (let y = 0, height = this.scanWidth - 1; y < this.element.height; y += this.scanWidth) {
                this.context.fillRect(0, y, this.element.width, height);
            }
            return this;
        }
    }
    Resolution.prototype = Object.create(Segment.prototype);
    Resolution.prototype.constructor = Resolution;
    Resolution.prototype.copy = function(parent) {
        return new Resolution(parent, this.vertical, this.blur, this.stepFactor);
    }
    Resolution.prototype.initialize = function(context = this.context) {
        if (this.cloneOf) {
            this.setColors(...this.cloneOf.colors);
        } else if (this.parent instanceof Disc) {
            this.setColors("transparent", this.screen.getColor());
        } else {
            this.setColors(this.screen.getColor(null, "light"), this.screen.getColor(null, "dark"));
        }
        Segment.prototype.initialize.call(this, context);
        return this;
    }
    Resolution.prototype.render = function(context) {
        context.fillStyle = this.colors[0];
        context.fillRect(0, 0, this.width, this.height);
        const pattern = this.element.appendChild(this.canvas.cloneNode(false))
        ,   patternContext = pattern.getContext('2d');
        pattern.style.width = pattern.style.height = `${2 * this.lineWidth}px`;
        pattern.width = pattern.height = pattern.clientWidth;
        const xStep = this.vertical ? 0 : this.lineWidth
        ,   yStep = this.vertical ? this.lineWidth : 0;
        if (this.blur) {
            const gradient = patternContext.createLinearGradient(0, 0, 2 * xStep, 2 * yStep);
            gradient.addColorStop(0, "transparent");
            gradient.addColorStop(0.5, this.colors[1]);
            gradient.addColorStop(1, "transparent");
            patternContext.fillStyle = gradient;
            patternContext.fillRect(0, 0, pattern.width, pattern.height);
        } else {
            patternContext.fillStyle = this.colors[1];
            patternContext.fillRect(xStep, yStep, this.lineWidth + yStep, this.lineWidth + xStep);
        }
        if (this.stepFactor) {
            const steps = Math.floor(this.vertical ? (this.height/pattern.height) : (this.width/pattern.width)) - 2;
            let xy = (this.stepFactor > 0) ? pattern.height : ((this.vertical ? this.height : this.width) - (2 * pattern.width))
            ,   widthHeight = this.vertical ? this.width : this.height;
            for (let i = 0; i < steps; i++, xy += this.stepFactor * pattern.width, widthHeight *= 0.8) {
                if (this.vertical) {
                    context.drawImage(pattern, (this.width - widthHeight)/2, xy, widthHeight, pattern.height);
                } else {
                    context.drawImage(pattern, xy, (this.height - widthHeight)/2, pattern.width, widthHeight);
                }
            }
        } else {
            context.fillStyle = context.createPattern(pattern, "repeat");
            context.fillRect(0, 0, this.width, this.height);
        }
        this.element.removeChild(pattern);
    }
    Screen.prototype = Object.create(Segment.prototype);
    Screen.prototype.constructor = Screen;
    Screen.prototype.getColor = function(hue, luminosity = "match") {
        const hueValue = (hue == "base") ? this.baseHue : (hue == "accent") ? this.accentHue : Math.floor(hues.length * Math.random())
        ,   saturation = hue ? this.maxSaturation * Math.random() : this.maxSaturation//(50 * (1 + Math.random()))
        ,   luminosityValue = (luminosity == "dark") ? 10 : (luminosity == "light") ? 90 : (luminosity == "contrast") ? ((this.darkTheme ? 80 : 0) + (20 * Math.random())) : (this.darkTheme ? 10 : 70) + (30 * Math.random());
        return `hsl(${hueValue}, ${saturation}%, ${luminosityValue}%)`;
    }
    Screen.prototype.initialize = function(context = this.context) {
        this.darkTheme = Math.random() < 0.7
        const hueIndex = Math.floor(hues.length * Math.random());
        this.baseHue = hues[hueIndex];
        this.accentHue = hues[(hueIndex + hues.length + (((Math.round(Math.random)) ? -1 : 1) * Math.round(1 + Math.random()))) % hues.length];
        this.maxSaturation = Math.min(50, 5 * this.screenCount)
        this.lineColor = this.getColor("base", "dark");
        Segment.prototype.initialize.call(this, context);
        return this;
    }
    Screen.prototype.populate = function() {
        const lineWidth = Math.ceil(2 * Math.random());
        this.gridLineWidth = Math.ceil(3 * Math.random());
        do {
            this.gridSize = Math.floor(this.display.minGridSize + ((this.display.maxGridSize - this.display.minGridSize) * Math.random()));
        } while ((Math.floor(this.width/this.gridSize) % 2) != (Math.floor(this.height/this.gridSize) % 2))
        this.grid = new Grid(this, "primary").size(this.width, this.height)
        const extraWidth = (this.grid.columns * this.gridSize) - this.display.width
        ,   extraHeight = (this.grid.rows * this.gridSize) - this.display.height;
        if (extraWidth || extraHeight) {
            const width = (this.grid.columns - (extraWidth ? 1 : 0)) * this.gridSize
            ,   height = (this.grid.rows - (extraHeight ? 1 : 0)) * this.gridSize;
            this.grid.size(width, height).position();
            const borderWidth = this.grid.width + (extraWidth ? (2 * this.gridSize) : 0)
            ,   borderHeight = this.grid.height + (extraHeight ? (2 * this.gridSize) : 0);
            new Grid(this, "border").size(borderWidth, borderHeight).position();
            this.grid.element.classList.add("front");
        } else {
            this.grid.position();
        }
        const longGridCount = Math.max(this.grid.columns, this.grid.rows)
        ,   shortGridCount = Math.min(this.grid.columns, this.grid.rows)
        ,   borderWidth = Math.round(this.gridSize * Math.random()/2)
        ,   centerRadius = (shortGridCount * this.gridSize/2) - borderWidth
        ,   centerDisc = new Disc(this.grid, "primary").size(2 * centerRadius, 2 * centerRadius, lineWidth).position().populate()
        ,   gridRatio = this.grid.width/this.grid.height;
        if ((gridRatio > 4/3) || (gridRatio < 3/4)) {
            const extraWidth = (longGridCount - shortGridCount) * this.gridSize/2
            ,   quadraticB = 2 * (extraWidth + borderWidth + (3 * centerRadius))
            ,   quadraticC = Math.pow(centerRadius + extraWidth, 2) - (borderWidth * (borderWidth + (2 * centerRadius)))
            ,   maxWidth0 = quadraticB - Math.sqrt(Math.pow(quadraticB, 2) - (4 * quadraticC))
            ,   maxWidth1 = ((shortGridCount * this.gridSize) - (3 * borderWidth))/2
            ,   discWidth = Math.min(maxWidth0, maxWidth1) * (1 + Math.random())/2
            ,   cornerGridCount = Math.ceil((discWidth + borderWidth)/this.gridSize)
            ,   x = Math.min(borderWidth, ((cornerGridCount * this.gridSize) - discWidth)/2)
            ,   cornerDisc = new Disc(this.grid, "corner").size(discWidth, discWidth, lineWidth).position(x, x).populate()
            ,   rightX = this.grid.width - (cornerDisc.drawX + cornerDisc.width)
            ,   bottomY = this.grid.height - (cornerDisc.drawY + cornerDisc.height);
            [[rightX, cornerDisc.drawY], [rightX, bottomY], [cornerDisc.drawX, bottomY]].forEach(xy => {
                cornerDisc.copyAll(this.grid).position(xy[0], xy[1]);
            })
            this.display.transferSegment = this.display.transferSegment || cornerDisc;
            const remainingLongCount = Math.floor((longGridCount - (shortGridCount + (2 * cornerGridCount)))/2);
            if (remainingLongCount > 0) {
                const width = remainingLongCount * this.gridSize
                ,   height = Math.min(cornerGridCount, Math.floor(shortGridCount/2)) * this.gridSize
                ,   x = (gridRatio > 1) ? cornerGridCount * this.gridSize : 0
                ,   y = (gridRatio > 1) ? 0 : cornerGridCount * this.gridSize
                ,   longGrid0 = new Grid(this.grid, "split").size(width, height).position(x, y).populate()
                ,   bottomY = this.grid.height - (longGrid0.drawY + longGrid0.height)
                ,   longGrid1 = new Grid(this.grid, "split").size(width, height).position(x, bottomY).populate()
                ,   rightX = this.grid.width - (longGrid0.drawX + longGrid0.width);
                longGrid0.copyAll(this.grid).position(rightX, y);
                longGrid1.copyAll(this.grid).position(rightX, bottomY);
            }
            const remainingShortCount = shortGridCount - (2 * cornerGridCount);
            if (remainingShortCount > 0) {
                const width = Math.floor((longGridCount - shortGridCount)/2) * this.gridSize
                ,   height = remainingShortCount * this.gridSize
                ,   y = cornerGridCount * this.gridSize;
                if (gridRatio > 1) {
                    const shortGrid = new Grid(this.grid, "split").size(width, height).position(0, y).populate();
                    shortGrid.copyAll(this.grid).position(this.grid.width - shortGrid.width, y);
                } else {
                    const shortGrid = new Grid(this.grid, "split").size(height, width).position(y, 0).populate();
                    shortGrid.copyAll(this.grid).position(y, this.grid.height - shortGrid.height);
                }
            }
        }
        return this;
    }
    Scroll.prototype = {
        addScreen: function(screen) {
            if (this.currentScreen) {
                if (this.currentScreen.otherScreen) {
                    this.currentScreen.otherScreen.delete();
                }
                this.currentScreen.otherScreen = screen;
                this.currentScreen.otherScreen.otherScreen = this.currentScreen;
                if (this.scrollDown) {
                    this.currentLower = true;
                    this.gap.position(0, this.currentScreen.drawY - this.gap.element.height);
                    this.currentScreen.otherScreen.position(0, this.gap.drawY - this.currentScreen.otherScreen.height);
                } else {
                    this.currentLower = false;
                    this.gap.position(0, this.currentScreen.drawY + this.currentScreen.height);
                    this.currentScreen.otherScreen.position(0, this.gap.drawY + this.gap.element.height)
                }
            } else {
                this.currentScreen = screen;
                this.currentScreen.position();
            }
        }
    ,   move: function(delay) {
            this.scrolling = true;
            if (this.toggle || (Math.random() < 0.1)) {
                this.scrollDown = !this.scrollDown;
                this.toggle = false;
            }
            if (this.scrollDown !== this.currentLower) {
                this.addScreen(new Screen(this.display).size().populate().initialize())
            }
            this.scrollY += (this.scrollDown ? 1 : -1) * (this.display.height + this.gap.element.height);
            this.display.actions.push(new Translate(this, this.scrollY, this.period, delay));
            const segments = this.currentScreen.moveable;
            let count = Math.round(Math.min(1 + (screenCount * Math.random()), segments.length/2))
            ,   selectionDelay = delay + (this.period/4);
            while (count > 0) {
                const selection = Math.floor(segments.length * Math.random());
                if (!segments[selection].scrolling) {
                    segments.splice(selection, 1)[0].replace(!this.scrollDown, selectionDelay);
                    count--;
                }
            }
        }
    ,   toggleCurrent: function() {
            this.currentScreen = this.currentScreen.otherScreen;
            this.currentLower = !this.currentLower;
        }
    }
    Translate.prototype = {
        run: function() {
            const easing = this.segment instanceof Scroll ? "ease-in" : "linear"
            ,   x = this.transform || 0
            ,   y = x + this.scrollY;
            this.segment.element.style.transition = `transform ${this.period}s ${easing} ${this.delay}s, opacity ${this.period}s ease-in ${this.delay}s`;
            this.segment.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            if (this.segment.element.classList.contains("replaced")) {
                this.segment.element.style.opacity = 0.1;
            }
        }
    }
    return new Display();
}
function colorArray(count = 6, saturation = 100, luminosity = 50) {
    if (count == 1) {
        return [`hsl(${hues[Math.floor(hues.length * Math.random())]}, ${saturation}%, ${luminosity}%)`]
    } else if (saturation == 0) {
        const directionFactor = Math.round(Math.random())
        ,   shades = [];
        for (let cell = 1; cell <= count; cell++) {
            shades.push(`hsl(0, 0%, ${(100 * Math.abs(directionFactor - (cell/count)))}%)`);
        }
        return shades;
    } else if (count <= 6) {
        const start = Math.floor((6 - count) * Math.random());
        return testHues.slice(start, start + count).map(hue => { return `hsl(${hue}, ${saturation}%, ${luminosity}%)`; })
    } else {
        return ["white"].concat(testHues.map(hue => { return `hsl(${hue}, ${saturation}%, ${luminosity}%)`; }), "black").slice(0, count)
    }
}
function initialize() {
    displayRoot.addEventListener("click", function(e) {
        if (e.target.classList.contains("segments")) {
            display.segments[e.target.getAttribute("data-id")].replace(display.scroll.scrollDown);
            display.scroll.toggle = true;
        }
    }, false);
    displayRoot.addEventListener("transitionend", function(e) {
        if (e.target.id == "scroll") {
            display.scroll.scrolling = false;
            display.scroll.toggleCurrent();
        } else if (e.target.classList.contains("replacement")) {
            display.segments[e.target.getAttribute("data-id")].scrolling = false;
            e.target.classList.remove("replacement");
        } else if (e.target.classList.contains("replaced")) {
            display.segments[e.target.getAttribute("data-id")].delete();
        }
    }, false);
}
function animationLoop(ts) {
    let interval = ts - (display.timestamp || 0)
    ;
    display.timestamp = ts;
    if (display.actions.length) {
        display.actions.shift().run();
    } else if (!display.scroll.scrolling) {
        display.scroll.move(1 + (3 * Math.random()));
    }
	animationId = window.requestAnimationFrame(animationLoop);

}
initialize();
})();
