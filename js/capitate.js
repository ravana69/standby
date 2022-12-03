(function() {
"use strict";

var animationId = null
,   canvasRoot = document.querySelector(".canvas")
,   priorTimestamp = 0
,   zeroTime = 0
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
    var plane = document.querySelector("#plane")
    ,   background = document.querySelector("#tempBackground")
    ,   plantRoot = document.querySelector("#plantRoot")
    ,   lateralRoot = document.querySelector("#lateralRoot")
    ,   vineRoot = document.querySelector("#vineRoot")
    ,   bodyRoot = document.querySelector("#bodyRoot")
    ,   headRoot = document.querySelector("#headRoot")
    ,   neckRoot = document.querySelector("#neckRoot")
    ,   frameRoot = document.querySelector("#frameRoot")
    ,   branchRoot = document.querySelector("#branchRoot")
    ,   branchNeckRoot = document.querySelector("#branchNeckRoot")
    ,   figureRoot = document.querySelector("#figureRoot")
    ,   availablePlants = []
    ,   availableBranches = []
    ,   currentZ = 0
    ,   figureFiles = 2
    ,   figuresWidth = 512
    ,   figureHeadPortion = 0.25
    ,   generationLimit = 12
    ,   standardHues = [0, 15, 30, 45, 60, 90, 120, 180, 240, 255, 270, 315]
    ,   Display = function() {
            if (background.style.opacity === "") {
                this.backgroundReady = false;
                background.style.opacity = 0;
            } else {
                this.backgroundReady = true;
            }
            this.element = canvasRoot;
            this.width = this.element.clientWidth;
            this.height = this.element.clientHeight;
            this.minGrowWidth = 2 * Math.min(this.width, this.height);
            this.branches = [];
            this.plants = [];
            this.figures = [];
            this.figureGroups = [];
            this.figureGroups.push(new FigureGroup(this));
            this.activePlants = 0;
            this.currentFigure = 0;
            this.maxFigures = 6;
            this.allowNewPlant = true;
        }
    ,   Body = function(plant) {
            this.plant = plant;
            this.id = this.plant.id;
            this.element = this.plant.lateral.appendChild(bodyRoot.cloneNode(false));
            this.element.id = "body" + this.id;
            this.element.setAttribute("data-id",this.id);
            this.context = this.element.getContext('2d');
        }
    ,   Branch = function(plant) {
            this.plant = plant;
            this.id = this.plant.display.branches.length;
            this.frame = this.plant.lateral.appendChild(frameRoot.cloneNode(false));
            this.frame.id = "frame" + this.id;
            this.frame.setAttribute("data-id",this.id);
            this.element = this.frame.appendChild(branchRoot.cloneNode(false));
            this.element.id = "branch" + this.id;
            this.element.setAttribute("data-id",this.id);
            this.head = this.element.appendChild(headRoot.cloneNode(false)).getContext('2d');
            this.head.canvas.id = "branchHead" + this.id;
            this.context = this.element.appendChild(branchNeckRoot.cloneNode(false)).getContext('2d');
            this.context.canvas.id = "branchNeck" + this.id;
            this.actions = [];
        }
    ,   Figure = function(group, index) {
            const bodyContext = group.body.getContext('2d')
            ,   headContext = group.head.getContext('2d')
            ,   elementHeight = group.element.clientHeight
            ;
            let count = 0
            ,   imageData = null
            ,   sideTrim = 0
            ,   topTrim = 0
            ,   bottomTrim = 0
            ,   increment = 0
            ,   mirror = 0
            ,   dataI = 0
            ;
            this.group = group;
            this.bodyX = index * figuresWidth;
            this.bodyY = elementHeight - this.group.body.height;
            this.bodyWidth = this.group.body.width;
            this.bodyHeight = this.group.body.height;
            bodyContext.clearRect(0, 0, this.bodyWidth, this.bodyHeight);
            bodyContext.drawImage(this.group.element, this.bodyX, this.bodyY, this.bodyWidth, this.bodyHeight, 0, 0, this.bodyWidth, this.bodyHeight);
            imageData = bodyContext.getImageData(0, 0, this.bodyWidth, this.bodyHeight);
            increment = 4 * this.bodyWidth;
            sideLoop : for (let column = 0; column < this.bodyWidth/2; column++) {
                mirror = ((this.bodyWidth - 1) - (2 * column)) * 4;
                for (let dataI = 3 + (4 * column); dataI < imageData.data.length; dataI += increment) {
                    if (imageData.data[dataI]) {
                        sideTrim = column;
                        break sideLoop;
                    }
                    if (imageData.data[dataI + mirror]) {
                        sideTrim = column;
                        break sideLoop;
                    }
                }
            }
            imageData.data.reverse();
            imageData.data.some(function(datum, j) {
                if (datum) {
                    return ((bottomTrim = Math.floor(j/(4 * this.bodyWidth))), true);
                }
            }, this);
            this.bodyX += sideTrim;
            this.bodyWidth -= 2 * sideTrim;
            this.bodyHeight -= bottomTrim;
            this.headWidth = this.headHeight = this.group.head.height;
            this.headX = (index * figuresWidth) + ((figuresWidth - this.headWidth)/2);
            this.headY = 0;
            this.centerY = (1 - figureHeadPortion) * this.headHeight;
            headContext.clearRect(0, 0, this.headWidth, this.headHeight);
            headContext.drawImage(this.group.element, this.headX, this.headY, this.headWidth, this.headHeight, 0, 0, this.headWidth, this.headHeight);
            imageData = headContext.getImageData(0, 0, this.headWidth, this.headHeight);
            increment = 4 * this.headWidth;
            headSideLoop : for (let column = 0; column < this.headWidth/2; column++) {
                mirror = ((this.headWidth - 1) - (2 * column)) * 4;
                for (let dataI = 3 + (4 * column); dataI < imageData.data.length; dataI += increment) {
                    if (imageData.data[dataI]) {
                        sideTrim = column;
                        break headSideLoop;
                    }
                    if (imageData.data[dataI + mirror]) {
                        sideTrim = column;
                        break headSideLoop;
                    }
                }
            }
            imageData.data.some(function(datum, j) {
                if (datum) {
                    return ((topTrim = Math.floor(j/(4 * this.headWidth))), true);
                }
            }, this);
            this.headX += sideTrim;
            this.headY += topTrim;
            this.headWidth -= 2 * sideTrim;
            this.headHeight -= topTrim;
            this.centerY -= topTrim;
            this.neckWidth = figureHeadPortion * this.group.head.height;
            this.neckHeight = figureHeadPortion * this.neckWidth;
            this.neckX = (index * figuresWidth) + (figuresWidth - this.neckWidth)/2
            this.neckY = ((2 - figureHeadPortion) * this.group.head.height) - (this.neckHeight/2);
        }
    ,   FigureGroup = function(display) {
            this.display = display;
            this.id = this.display.figureGroups.length;
            this.element = figureRoot.parentNode.appendChild(figureRoot.cloneNode(false));
            this.element.id = "figure" + this.id;
            this.element.src = "img/aliceFigures" + this.id + ".png";
            this.body = bodyRoot;
            this.head = headRoot;
            (function (group) {
                group.element.onload = function() {
                    group.load();
                }
            })(this);
        }
    ,   Head = function(plant) {
            this.plant = plant;
            this.id = this.plant.id;
            this.element = this.plant.lateral.appendChild(headRoot.cloneNode(false));
            this.element.id = "head" + this.id;
            this.context = this.element.getContext('2d');
        }
    ,   Neck = function(plant) {
            this.plant = plant;
            this.id = this.plant.id;
            this.element = this.plant.lateral.appendChild(neckRoot.cloneNode(false));
            this.element.id = "neck" + this.id;
            this.context = this.element.getContext('2d');
        }
    ,   Plant = function(display) {
            this.display = display;
            this.id = this.display.plants.length;
            this.element = plane.appendChild(plantRoot.cloneNode(false));
            this.element.id = "plant" + this.id;
            this.element.setAttribute("data-id",this.id);
            this.lateral = this.element.appendChild(lateralRoot.cloneNode(false));
            this.lateral.id = "lateral" + this.id;
            this.lateral.setAttribute("data-id",this.id);
            this.context = this.lateral.appendChild(vineRoot.cloneNode(false)).getContext('2d');
            this.context.canvas.id = "vine" + this.id;
            this.body = new Body(this);
            this.neck = new Neck(this);
            this.head = new Head(this);
            this.arcRotate = function(clockwise) {
                return (clockwise ? 1 : -1) * (this.arcRotateCenter + (((Math.random() < 0.5) ? -1 : 1) * 0.2 * Math.pow(Math.random(), 2)));
            };
            this.scaleMultiplier = function() {
                return this.scaleMultiplierCenter - (0.05 * Math.pow(Math.random(), 2));
            };
            this.visible = true;
            this.actions = [];
        }
    ;
    Display.prototype = {
        addPlant: function() {
            let currentPlant = null
            ;
            if (availablePlants.length) {
                currentPlant = availablePlants.pop();
            } else {
                this.plants.push(new Plant(this));
                currentPlant = this.plants[this.plants.length - 1];
            }
            currentPlant.element.style.zIndex = currentZ++;
            currentPlant.initialize();
            return currentPlant;
        }
    ,   delete: function() {
            this.plants.forEach(function(plant) {
                plane.removeChild(plant.element);
            })
        }
    }
    Body.prototype = {
        initialize: function() {
            const figureBody = this.plant.display.figures[this.plant.figureIndex]
            ;
            this.element.style.width = (figureBody.bodyWidth * this.plant.scale) + "px";
            this.element.width = this.element.clientWidth;
            this.element.style.height = (figureBody.bodyHeight * this.plant.scale) + "px";
            this.element.height = this.element.clientHeight;
            if (this.plant.flip) {
                this.context.translate(this.element.width, 0);
                this.context.scale(-1, 1);
            }
            this.context.drawImage(figureBody.group.element, figureBody.bodyX, figureBody.bodyY, figureBody.bodyWidth, figureBody.bodyHeight, 0, 0, this.element.width, this.element.height);
        }
    }
    Branch.prototype = {
        activate: function() {
            if (this.plant.growing || !this.generation) {
                this.actions.push({object: this, action: this.setTransition});
                this.actions.push({object: this, action: this.rotate});
            } else {
                this.deactivate();
            }
        }
    ,   deactivate: function() {
            this.frame.style.transform = "";
            this.element.style.transform = "";
            availableBranches.push(this);
            this.plant.activeBranches--;
        }
    ,   initialize: function(parent, givenClockwise, givenDelay) {
            let arcWidth = 0
            ,   arcHeight = 0
            ,   translateX = 0
            ,   translateY = 0
            ,   translateAngle = 0
            ,   drawX = 0
            ,   drawWidth = 0
            ,   drawHeight = 0
            ,   headPortion = 0.95
            ,   delay = givenDelay ? 1000 * (0.3 + Math.random()) : 0
            ,   diagonal = 0
            ,   distance = 0
            ;
            this.parent = parent || null;
            this.arcClockwise = (givenClockwise === undefined) ? (Math.random() < 0.5) : (givenClockwise || false);
            if (this.parent) {
                this.generation = this.parent.generation + 1;
                this.scale = this.parent.scale * this.plant.scaleMultiplier();
                this.startX = this.parent.endX;
                this.startY = this.parent.endY;
                this.startAngle = this.parent.startAngle + this.parent.arcRotate;
            } else {
                this.generation = 0;
                this.scale = 1;
                this.startX = 0;
                this.startY = 0;
                this.startAngle = 0;
            }
            this.arcRadius = this.plant.arcRadius * this.scale;
            this.arcRotate = this.plant.arcRotate(this.arcClockwise);
            this.endX = this.startX + ((this.arcClockwise ? 1 : -1) * this.arcRadius * (Math.cos(this.startAngle) - Math.cos(this.startAngle + this.arcRotate)));
            this.endY = this.startY + ((this.arcClockwise ? 1 : -1) * this.arcRadius * (Math.sin(this.startAngle) - Math.sin(this.startAngle + this.arcRotate)));
            this.childCount = 0;
            this.deactivateDelay = null;
            diagonal = this.scale * this.plant.head.diagonal;
            distance = Math.sqrt(Math.pow(this.endX, 2) + Math.pow(this.endY, 2)) + diagonal;
            if (((this.endY + diagonal) < this.plant.bottom) && (distance < this.plant.radius)) {
                if (this.parent) {
                    this.parent.childCount++;
                    this.parent.deactivateDelay = Math.min(delay,this.parent.deactivateDelay);
                }
                this.frame.style.top = this.startY + "px";
                this.frame.style.left = this.startX + "px";
                arcHeight = this.arcRadius * Math.sin(Math.min(Math.abs(this.arcRotate), Math.PI/2));
                arcWidth = this.arcRadius * (1 - Math.cos(Math.min(Math.abs(this.arcRotate), Math.PI)));
                this.frame.style.width = (arcWidth + (2 * diagonal)) + "px";
                this.frame.style.height = (arcHeight + diagonal) + "px";
                this.context.canvas.width = this.frame.clientWidth;
                this.context.canvas.height = this.frame.clientHeight;
                this.head.canvas.style.width = (this.scale * this.plant.head.element.width) + "px";
                this.head.canvas.style.height = (this.scale * this.plant.head.element.height) + "px";
                this.head.centerY = this.scale * this.plant.head.centerY;
                this.head.canvas.style.top = this.head.centerY + "px";
                this.head.canvas.width = this.head.canvas.clientWidth;
                this.head.canvas.height = this.head.canvas.clientHeight;
                this.frameX = this.arcClockwise ? diagonal : (this.context.canvas.width - diagonal);
                this.head.canvas.style.left = this.frameX + "px";
                this.head.globalCompositeOperation = "source-over";
                this.head.drawImage(this.plant.head.element, 0, 0, this.plant.head.element.width, this.plant.head.element.height, 0, 0, this.head.canvas.width, this.head.canvas.height);
                drawWidth = this.scale * this.plant.neck.element.width;
                drawHeight = this.scale * this.plant.neck.element.height;
                drawX = drawWidth/-2;
                translateAngle = drawHeight/(this.arcRadius + drawWidth);
                translateX = this.arcRadius * (1 - Math.cos(translateAngle));
                translateY = this.arcRadius * Math.sin(translateAngle);
                if (!this.arcClockwise) {
                    translateX *= -1;
                    translateAngle *= -1;
                }
                this.context.translate(this.frameX, 0);
                this.context.globalCompositeOperation = "destination-over";
                for (let angle = 0; angle < Math.abs(this.arcRotate); angle += Math.abs(translateAngle)) {
                    this.context.drawImage(this.plant.neck.element, 0, 0, this.plant.neck.element.width, this.plant.neck.element.height, drawX, -1 * drawHeight, drawWidth, drawHeight);
                    this.context.translate(translateX, translateY)
                    this.context.rotate(-1 * translateAngle);
                }
                this.context.drawImage(this.plant.neck.element, 0, 0, this.plant.neck.element.width, this.plant.neck.element.height, Math.round(drawX), Math.round(-1 * drawHeight), Math.round(drawWidth), Math.round(drawHeight));
                this.context.setTransform(1, 0, 0, 1, 0, 0);
                this.context.globalCompositeOperation = "source-atop";
                // this.context.fillStyle = "hsla(" + this.plant.hue + ", 100%, " + (100 - (this.generation * 4)) + "%, 0.1)";
                this.context.fillStyle = "hsla(" + this.plant.branchHue + ", 100%, " + this.plant.branchLuminosity + "%, " + (Math.pow(this.generation, 2) * 0.003) + ")";
                this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height)
                this.head.globalCompositeOperation = "source-atop";
                this.head.fillStyle = "hsla(" + this.plant.blossomHue + ", 60%, " + (100 - (this.generation * 4)) + "%, " + (0.1 + (Math.pow(this.generation, 2) * 0.005)) + ")";
                this.head.fillRect(0, 0, this.head.canvas.width, this.head.canvas.height);
                this.element.style.transformOrigin = (((this.arcClockwise ? 1 : -1) * this.arcRadius) + this.frameX) + "px 0%";
                this.frame.style.transformOrigin = this.frameX + "px 100%";
                this.frame.style.transform = "translate3d(" + (-1 * this.frameX) + "px, -100%, 0) rotate(" + this.startAngle + "rad)";
                (function (branch) {
                    setTimeout(function() { branch.activate(); }, delay);
                })(this);
            } else {
                this.deactivate();
            }
        }
    ,   rotate: function() {
            this.active = true;
            this.frame.style.opacity = 1;
            if (!this.generation) {
                this.plant.head.element.style.opacity = 0;
                this.plant.growing = true;
                this.plant.toGrow = false;
                this.plant.body.element.style.pointerEvents = "auto";
                this.plant.body.element.style.cursor = "pointer";
            }
            this.element.style.transform = "rotate(" + this.arcRotate + "rad)";
        }
    ,   setTransition: function() {
            let duration = Math.abs(this.arcRadius * this.arcRotate/this.plant.velocity)
            ,   easing = this.generation ? "linear" : "ease-in"
            ;
            this.element.style.transition = "transform " + duration + "s " + easing;
        }
    ,   stamp: function() {
            const clockwise = Math.random() < 0.5
            ,   clockwiseDelay = Math.random() < 0.5
            ,   arcRadius = (this.arcClockwise ? -1 : 1) * this.arcRadius
            ,   centerX = this.startX - (this.plant.left + (arcRadius * Math.cos(this.startAngle)))
            ,   centerY = this.startY - (this.plant.top + (arcRadius * Math.sin(this.startAngle)))
            ,   diagonal = this.plant.display.figures.diagonal * this.scale
            ;
            let drawHead = false
            ;
            this.active = false;
            if (this.plant.active) {
                if ((this.plant.activeBranches < 32) && (this.generation < generationLimit)) {
                    this.plant.addBranch(this, clockwise);
                    if (this.childCount) {
                        this.plant.addBranch(this, !clockwise, true);
                    } else {
                        this.plant.addBranch(this, !clockwise);
                        if (!this.childCount) {
                            drawHead = true;
                        }
                    }
                } else {
                    drawHead = true;
                }
                this.plant.context.setTransform(1, 0, 0, 1, 0, 0);
                this.plant.context.translate(centerX, centerY);
                this.plant.context.rotate(this.arcRotate + this.startAngle);
                this.plant.context.drawImage(this.context.canvas, arcRadius - this.frameX, 0);
                if (drawHead) {
                    this.plant.context.drawImage(this.head.canvas, arcRadius - (this.head.canvas.width/2), this.head.centerY);
                }
            }
            this.frame.style.opacity = 0;
            this.element.style.transition = "";
        }
    }
    FigureGroup.prototype = {
        load: function() {
            this.count= this.element.clientWidth/figuresWidth;
            this.body.style.width = figuresWidth + "px";
            this.body.width = this.body.clientWidth;
            this.body.style.height = ((1 - figureHeadPortion) * this.element.clientHeight) + "px";
            this.body.height = this.body.clientHeight;
            this.head.style.width = (figureHeadPortion * this.element.clientHeight) + "px";
            this.head.width = this.head.clientWidth;
            this.head.style.height = this.head.width + "px";
            this.head.height = this.head.clientHeight;
            this.top = figureHeadPortion * (1 - figureHeadPortion) * this.element.clientHeight;
            for (let i = 0; i < this.count; i++) {
                this.display.figures.push(new Figure(this, i));
            }
            if (this.display.figureGroups.length < figureFiles) {
                this.display.figureGroups.push(new FigureGroup(this.display));
            } else {
                if (this.display.currentFigure) {
                    this.display.figures = this.display.figures.slice(0, this.display.currentFigure + 1).concat(shuffle(this.display.figures.slice(this.display.currentFigure + 1)));
                } else {
                    shuffle(this.display.figures);
                }
            }
        }
    }
    Head.prototype = {
        initialize: function() {
            const figureHead = this.plant.display.figures[this.plant.figureIndex]
            ;
            this.centerY = -1 * this.plant.scale * figureHead.centerY;
            this.element.style.width = (figureHead.headWidth * this.plant.scale) + "px";
            this.element.width = this.element.clientWidth;
            this.element.style.height = (figureHead.headHeight * this.plant.scale) + "px";
            this.element.height = this.element.clientHeight;
            this.element.style.top = this.centerY + "px";
            this.diagonal = Math.ceil(Math.sqrt(Math.pow(this.element.width/2, 2) + Math.pow(this.centerY, 2)));
            if (this.plant.flip) {
                this.context.translate(this.element.width, 0);
                this.context.scale(-1, 1);
            }
            this.context.drawImage(figureHead.group.element, figureHead.headX, figureHead.headY, figureHead.headWidth, figureHead.headHeight, 0, 0, this.element.width, this.element.height);
        }
    }
    Neck.prototype = {
        initialize: function() {
            const figureNeck = this.plant.display.figures[this.plant.figureIndex]
            ;
            this.element.style.width = (figureNeck.neckWidth * this.plant.scale) + "px";
            this.element.width = this.element.clientWidth;
            this.element.style.height = (figureNeck.neckHeight * this.plant.scale) + "px";
            this.element.height = this.element.clientHeight;
            if (this.plant.flip) {
                this.context.translate(this.element.width, 0);
                this.context.scale(-1, 1);
            }
            this.context.drawImage(figureNeck.group.element, figureNeck.neckX, figureNeck.neckY, figureNeck.neckWidth, figureNeck.neckHeight, 0, 0, this.element.width, this.element.height);
        }
    }
    Plant.prototype = {
        addBranch: function(branchParent, clockwise, delay) {
            let currentBranch = null
            ;
            if (!branchParent || this.growing) {
                if (availableBranches.length) {
                    currentBranch = availableBranches.pop();
                    currentBranch.plant = this;
                    this.lateral.appendChild(currentBranch.frame);
                } else {
                    this.display.branches.push(new Branch(this));
                    currentBranch = this.display.branches[this.display.branches.length - 1];
                }
                this.activeBranches++;
                currentBranch.initialize(branchParent, clockwise, delay);
            }
        }
    ,   deactivate: function() {
            this.active = false;
            this.display.activePlants--;
            this.context.setTransform(1, 0, 0, 1, 0, 0);
            this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);
            this.body.context.setTransform(1, 0, 0, 1, 0, 0);
            this.body.context.clearRect(0, 0, this.body.element.width, this.body.element.height);
            this.neck.context.setTransform(1, 0, 0, 1, 0, 0);
            this.neck.context.clearRect(0, 0, this.neck.element.width, this.neck.element.height);
            this.head.context.setTransform(1, 0, 0, 1, 0, 0);
            this.head.context.clearRect(0, 0, this.head.element.width, this.head.element.height);
            this.actions.push({object: this, action: this.setTransition, parameter: false});
            this.actions.push({object: this, action: this.reset});
            this.actions.push({object: this, action: this.setTransition, parameter: true});
            this.xOffset = 0;
            this.actions.push({object: this, action: this.setLateralTransition});
            this.actions.push({object: this, action: this.setLateralOffset});
            this.actions.push({object: this, action: this.makeAvailable});
            this.lateral.style.visibility = "hidden";
            this.vanish = false;
        }
    ,   disappear: function() {
            this.vanish = true;
            this.body.element.style.pointerEvents = "none";
            this.body.element.style.cursor = "default";
            this.xOffset = (this.display.width/2) - this.originX;
            this.actions.push({object: this, action: this.setLateralTransition});
            this.actions.push({object: this, action: this.setLateralOffset, parameter: true});
        }
    ,   initialize: function() {
            let top = 0
            ,   height = 0
            ,   currentFigure = null
            ;
            this.active = true;
            this.toGrow = true;
            this.display.activePlants++;
            this.figureIndex = this.display.currentFigure++ % this.display.figures.length;
            currentFigure = this.display.figures[this.figureIndex];
            this.scale = Math.min(1, this.display.height/(1.5 * currentFigure.bodyHeight));
            this.flip = Math.random() < 0.5;
            this.body.initialize();
            this.head.initialize();
            this.neck.initialize();
            this.originX = (Math.random() < 0.5) ? (this.display.width - (this.body.element.width * Math.random())) : (this.body.element.width * Math.random());
            top = this.scale * currentFigure.group.top;
            height = this.body.element.height - top;
            this.originY = this.display.height - (this.body.element.height - top);
            this.body.element.style.top = (-1 * top) + "px";
            this.context.canvas.style.bottom = (-1 * height) + "px";
            this.context.canvas.height = this.display.minGrowWidth + (3 * this.head.diagonal);
            this.context.canvas.width = this.context.canvas.height - height;
            this.element.style.top = this.originY + "px";
            this.element.style.left = this.originX + "px";
            this.bottom = height;
            this.top = this.bottom - this.context.canvas.height;
            this.right = this.context.canvas.width/2;
            this.left = -1 * this.right;
            this.radius = this.right;
            this.arcRotateCenter = Math.PI * (0.2 + (0.2 * Math.random()));
            this.scaleMultiplierCenter = 0.9;
            this.arcRadius = this.radius * (0.2 + (0.3 * Math.random()));
            this.velocity = this.radius/(3 + (2 * Math.random()));
            this.activeBranches = 0;
            this.branchHue = -20 + (80 * Math.random());
            this.branchLuminosity = 20 + (20 * Math.random());
            this.blossomHue = standardHues[Math.floor(standardHues.length * Math.random())];
            if (this.originX > (this.display.width/2)) {
                this.xOffset = this.display.width + (this.body.element.width/2) - this.originX;
            } else {
                this.xOffset =  -1 * (this.originX + (this.body.element.width/2));
            }
            this.actions.push({object: this, action: this.setLateralOffset, parameter: true});
            this.actions.push({object: this, action: this.setLateralTransition});
            this.actions.push({object: this, action: this.setLateralOffset});
            (function (plant) {
                setTimeout(function() { plant.addBranch(); }, Math.abs(10 * plant.xOffset));
            })(this);
            this.element.style.transform = "translate3d(0px, 0px, -6000px)";
            this.element.style.opacity = 0;
            (function (plant) {
                setTimeout(function() { plant.display.allowNewPlant = true; }, 15000 + (5000 * Math.random()));
            })(this);
            return this;
        }
    ,   makeAvailable: function() {
            availablePlants.push(this);
        }
    ,   reset: function() {
            this.element.style.transform = "";
            this.element.style.opacity = 1;
            this.visible = true;
            this.head.element.style.opacity = 1;
        }
    ,   setLateralOffset: function(onlyThis) {
            const xOffset = this.xOffset
            ;
            if (onlyThis) {
                this.lateral.style.visibility = "visible";
            } else {
                this.xOffset = 0;
                if (xOffset) {
                    this.display.plants.forEach(function(plant) {
                        if (plant.active && !plant.vanish && (plant.id != this.id)) {
                            plant.xOffset -= xOffset;
                            plant.lateral.style.transform = "translate3d(" + plant.xOffset + "px, 0, 0)";
                        }
                    }, this);
                }
            }
            this.lateral.style.transform = "translate3d(" + this.xOffset + "px, 0, 0)" + (this.vanish ? " rotateY(90deg)" : "");
        }
    ,   setLateralTransition: function() {
            let duration = 0
            ;
            if (this.xOffset) {
                duration = Math.max(300, Math.abs(10 * this.xOffset));
                this.display.plants.forEach(function(plant) {
                    if (plant.active && !plant.vanish) {
                        plant.lateral.style.transition = "transform " + duration + "ms ease-in-out";
                    }
                });
            } else {
                this.lateral.style.transition = "transform 0s";
            }
        }
    ,   setTransition: function(reset) {
            if (reset) {
                this.element.style.transition = "";
                this.head.element.style.transition = "";
            } else {
                this.element.style.transition = "transform 0s";
                this.head.element.style.transition = "opacity 0s";
            }
        }
    }
    return new Display();
}
function initialize() {
    canvasRoot.addEventListener("click", function(e) {
        let dataId = e.target.getAttribute("data-id")
        ,   body = e.target.classList.contains("bodies") ? display.plants[dataId] : null
        ;
        if (body) {
            body.growing = false;
            body.actions.push({object: body, action: body.disappear});
        }
    }, false);
    canvasRoot.addEventListener("transitionend", function(e) {
        let dataId = e.target.getAttribute("data-id")
        ,   plant = e.target.classList.contains("plants") ? display.plants[dataId] : null
        ,   branch = e.target.classList.contains("branches") ? display.branches[dataId] : null
        ,   frame = e.target.classList.contains("frames") ? display.branches[dataId] : null
        ,   lateral = e.target.classList.contains("laterals") ? display.plants[dataId] : null
        ;
        if (e.propertyName == "transform") {
    		if (branch && branch.active) {
                branch.actions.push({object: branch, action: branch.stamp});
            } else if (lateral && lateral.vanish) {
                lateral.visible = false;
            }
        } else if (e.propertyName == "opacity") {
            if (frame && (e.target.style.opacity == 0)) {
                frame.actions.push({object: frame, action: frame.deactivate});
            } else if (plant && (e.target.style.opacity == 0)) {
                plant.visible = false;
                plant.growing = false;
            } else if (e.target.classList.contains("tempBackground") && (e.target.style.opacity == 0)) {
                display.backgroundReady = true;
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
    var then = Date.now()
    ,   currentAction = null
    ,   growingCount = 0
    ,   exitLoop = false;
    ;
    if (display.backgroundReady && display.allowNewPlant && display.figures.length && (display.activePlants <= display.maxFigures)) {
        display.allowNewPlant = false;
        display.addPlant();
    } else {
        display.plants.some( function(plant) {
            if (plant.actions.length) {
                currentAction = plant.actions.shift();
                currentAction.action.call(currentAction.object, currentAction.parameter || null);
            } else if (!plant.activeBranches) {
                if (!plant.toGrow && plant.growing) {
                    plant.growing = false;
                } else if (plant.active && !plant.visible) {
                    plant.deactivate();
                }
            }
            if ((Date.now() - then) > 15) {
                return ((exitLoop = true), true);
            }
        });
        if (!exitLoop) {
            display.branches.some( function(branch) {
                if (branch.actions.length) {
                    currentAction = branch.actions.shift();
                    currentAction.action.call(currentAction.object, currentAction.parameter || null);
                }
                if ((Date.now() - then) > 15) {
                    return ((exitLoop = true), true);
                }
            });
        }
    }
	animationId = window.requestAnimationFrame(animationLoop);
}
initialize();
})();
