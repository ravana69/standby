(function() {
"use strict";

const Display = class {
        constructor() {
            this.element = document.querySelector("#displayRoot");
        }
        delete() {
            this.element.classList.add("hide");
            this.targetImages.forEach(image => image.delete);
            this.targetImages = [];
            this.dispenserImages.forEach(image => image.delete);
            this.dispenserImages = [];
            this.lidImages.forEach(image => image.delete);
            this.lidImages = [];
            this.sources.forEach(source => source.delete());
            this.targets.forEach(target => target.delete());
            this.targets = [];
            display = null;
        }
        draw() {
            this.sources.forEach(source => {
                if (source.flow.active) {
                    source.flow.advance();
                }
            });
        }
        findTarget(dataId) {
            return this.targets.find(target => target.id == dataId);
        }
        initialize() {
            this.height = this.element.clientHeight;
            this.width = this.element.clientWidth;
            this.background = new Background(this).initialize();
            this.minSourceHeight = 0.3 * this.height;
            this.maxSourceHeight = 0.5 * this.height;
            this.maxSourceBottom = 0.6 * this.height;
            this.baseDuration = 10 * this.width;
            const targetElement = document.querySelector("#targetImage0");
            this.targetImages = [new Image(targetElement).initialize(0, 0, targetElement.width, targetElement.height)];
            this.targets = [];
            let totalWidth = 0
            ,   totalWait = 0;
            while ((totalWidth < this.width) || (this.targets.length < 3)) {
                this.targets.push(new Target(this).initialize(true).move(totalWait));
                totalWidth += this.targets.slice(-1)[0].canvas.width;
                totalWait += this.targets.slice(-1)[0].period * getRandom(0.6, 0.9);
            }
            this.dispenserImages = [];
            this.lidImages = [];
            const dispenserElement = document.querySelector("#dispenserImages")
            ,   dispenserSections = 8
            ,   dispenserWidth = dispenserElement.width/dispenserSections
            ,   dispenserHeight = 0.75 * dispenserElement.height;
            for (let i = 0; i < dispenserSections; i++) {
                this.dispenserImages.push(new Image(dispenserElement).initialize(i * dispenserWidth, 0, dispenserWidth, dispenserHeight));
                this.lidImages.push(new Image(dispenserElement).initialize(i * dispenserWidth, dispenserHeight, dispenserWidth, dispenserElement.height - dispenserHeight));
            }
            this.sources = [];
            let minimumWait = 0;
            totalWidth = 0;
            while (totalWidth < (0.7 * this.width)) {
                this.sources.push(new Source(this).initialize().move(minimumWait));
                minimumWait += (3000 * Math.random());
                totalWidth += this.sources.slice(-1)[0].dispenser.canvas.width;
            }
            const extraTargetElement = document.querySelector("#targetImages");
            if (extraTargetElement.src) {
                this.loadExtraTargetImages(extraTargetElement);
            } else {
                extraTargetElement.addEventListener("load", e => display.loadExtraTargetImages(e.target), false);
                extraTargetElement.src = extraTargetElement.attributes["data-src"].value;
            }
            this.element.classList.remove("hide");
            return this;
        }
        loadExtraTargetImages(element) {
            const targetSections = 6
            ,   targetWidth = element.width
            ,   targetHeight = element.height/targetSections;
            for (let i = 0; i < targetSections; i++) {
                this.targetImages.push(new Image(element).initialize(0, i * targetHeight, targetWidth, targetHeight));
            }
            return this;
        }
    }
,   Background = class {
        constructor(display) {
            this.display = display;
            this.canvas0 = this.display.element.querySelector("#background0");
            this.context0 = this.canvas0.getContext('2d');
            this.canvas1 = this.display.element.querySelector("#background1");
            this.context1 = this.canvas1.getContext('2d');
        }
        initialize() {
            this.canvas0.width = this.canvas0.clientWidth;
            this.canvas0.height = this.canvas0.clientHeight;
            this.canvas1.width = this.canvas1.clientWidth;
            this.canvas1.height = this.canvas1.clientHeight;
            const waveCanvas = this.display.element.appendChild(document.querySelector("#canvasRoot").cloneNode(false))
            ,   waveContext = waveCanvas.getContext('2d')
            ,   halfPeriod = this.canvas0.width/getRandom(1, 4)
            ,   halfAmplitude = halfPeriod/getRandom(2, 4)
            ,   xOffset = 0.2 * this.canvas0.width
            ,   cX = 0.37 * halfPeriod;
            waveCanvas.style.width = `${this.canvas0.width + xOffset}px`;
            waveCanvas.style.height = `${2 * halfAmplitude}px`;
            waveCanvas.width = waveCanvas.clientWidth;
            waveCanvas.height = waveCanvas.clientHeight;
            waveContext.clearRect(0, 0, waveCanvas.width, waveCanvas.height)
            waveContext.beginPath();
            let x0 = 0
            ,   y0 = 0;
            waveContext.moveTo(0, 0);
            waveContext.lineTo(x0, halfAmplitude);
            while (x0 < waveCanvas.width) {
                const x1 = x0 + halfPeriod
                ,   cx0 = x0 + cX
                ,   cx1 = x1 - cX
                ,   y1 = y0 ? 0 : halfAmplitude;
                waveContext.bezierCurveTo(cx0, y0 + halfAmplitude, cx1, y1 + halfAmplitude, x1, y1 + halfAmplitude);
                x0 = x1;
                y0 = y1;
            }
            waveContext.lineTo(x0, 0);
            waveContext.closePath();
            waveContext.fillStyle = "black";
            waveContext.fill();
            waveContext.globalCompositeOperation = "source-in";
            const baseHue = 360 * Math.random()
            ,   offset = 60 + (60 * Math.random())
            ,   hues = [baseHue, baseHue + offset]
            ,   minWidth = 2
            ,   maxWidth = 20;
            [this.context0, this.context1].forEach((context, index) => {
                for (let y = (-2 * halfAmplitude); y < (context.canvas.height - halfAmplitude); ) {
                    const saturation = getRandom(20, 60)
                    ,   luminosity = getRandom(50 + (30 * y/context.canvas.height), 95);
                    waveContext.fillStyle = `hsl(${hues[index]}, ${saturation}%, ${luminosity}%)`;
                    waveContext.fillRect(0, 0, waveCanvas.width, waveCanvas.height);
                    context.globalAlpha = getRandom(0.5, 1);
                    context.globalCompositeOperation = "destination-over";
                    context.drawImage(waveCanvas, getRandom(-1 * xOffset, 0), y);
                    y += getRandom(minWidth, maxWidth)
                }
            })
            waveCanvas.parentNode.removeChild(waveCanvas);
            return this;
        }
    }
,   Dispenser = class {
        constructor(source) {
            this.source = source;
            this.id = this.source.id;
            this.element = this.source.element.querySelector(".dispensers");
            this.element.id = `dispenser${this.id}`
            this.element.setAttribute("data-id",this.id);
            this.canvas = this.element.querySelector(".containers");
            this.canvas.id = `container${this.id}`
            this.context = this.canvas.getContext('2d');
            this.emptyCanvas = this.element.querySelector(".empty");
            this.emptyCanvas.id = `empty${this.id}`
            this.emptyContext = this.emptyCanvas.getContext('2d');
        }
        fade(period, fullForce = false) {
            this.emptiness = fullForce ? 1 : (this.emptiness + ((1 - this.emptiness) * getRandom(0.1, 0.5)))
            this.emptyCanvas.style.transition = `opacity ${period}s linear`;
            setTimeout(() => this.emptyCanvas.style.opacity = this.emptiness);
        }
        initialize() {
            const dispenserImage = this.source.display.dispenserImages[Math.floor(this.source.display.dispenserImages.length * Math.random())]
            ,   lidImage = this.source.display.lidImages[Math.floor(this.source.display.lidImages.length * Math.random())]
            ,   gap = 1
            ,   imageHeight = dispenserImage.canvas.height + lidImage.canvas.height + gap
            ,   height = getRandom(this.source.display.minSourceHeight, this.source.display.maxSourceHeight);
            this.element.classList.add("clickable");
            this.element.style.height = `${height}px`;
            this.canvas.height = this.emptyCanvas.height = this.canvas.clientHeight;
            const scale = height/imageHeight
            ,   bottleHeight = dispenserImage.canvas.height * scale;
            this.element.style.width = `${dispenserImage.canvas.width * scale}px`
            this.canvas.width = this.emptyCanvas.width = this.canvas.clientWidth;
            this.context.drawImage(dispenserImage.canvas, 0, 0, this.canvas.width, bottleHeight);
            this.emptyContext.drawImage(this.canvas, 0, 0);
            const gradient = this.emptyContext.createLinearGradient(0, 0, 0, dispenserImage.canvas.height);
            gradient.addColorStop(0, "white");
            gradient.addColorStop(0.3, "white");
            gradient.addColorStop(1, "transparent");
            this.emptyContext.globalCompositeOperation = "source-in";
            this.emptyContext.fillStyle = gradient;
            this.emptyContext.fillRect(0, 0, this.emptyCanvas.width, dispenserImage.canvas.height);
            this.emptyCanvas.style.opacity = null;
            this.emptiness = 0;
            const lidX = (this.canvas.width - (lidImage.canvas.width * scale))/2
            ,   lidY = this.canvas.height - (lidImage.canvas.height * scale);
            this.lidWidth = lidImage.canvas.width * scale;
            this.context.drawImage(lidImage.canvas, lidX, lidY + gap, this.lidWidth, lidImage.canvas.height * scale);
            this.context.fillStyle = this.source.mainColor;
            this.context.globalCompositeOperation = "source-in";
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.label = this.label || new Label(this);
            this.label.initialize(bottleHeight);
            return this;
        }
    }
,   Flow = class {
        constructor(source) {
            this.source = source;
            this.id = this.source.id;
            this.element = this.source.element.querySelector(".flows");
            this.element.id = `flow${this.id}`;
            this.canvas = this.element.querySelector(".streams");
            this.canvas.id = `stream${this.id}`;
            this.canvas.setAttribute("data-id",this.id);
            this.context = this.canvas.getContext('2d');
        }
        advance() {
            const streamRect = this.canvas.getBoundingClientRect()
            ,   streamCenterX = (streamRect.left + streamRect.right)/2
            if (this.target) {
                const targetRect = this.target.canvas.getBoundingClientRect()
                ,   pathX = Math.round(streamCenterX - targetRect.left)
                ,   pathY = Math.round(this.pathCenterY + (this.pathAmplitude * Math.sin((pathX - this.pathStartX)/this.pathPeriod)))
                ,   targetY = targetRect.top + pathY
                ,   targetImageAlpha = this.target.context.getImageData(pathX, pathY, 1, 1).data[3];
                if (streamRect.top > targetY) {
                    this.stop();
                } else if (targetImageAlpha && (streamRect.bottom > targetY)) {
                    this.element.style.height = `${targetY - this.source.bottom}px`;
                    this.target.splash(pathX, pathY, this.source, this.fullForce);
                    this.context.clearRect(0, this.canvas.height, this.canvas.width, targetY - streamRect.bottom);
                } else {
                    this.element.style.height = null;
                    this.target = null;
                }
            } else {
                if (streamRect.top > this.source.display.height) {
                    this.stop();
                } else {
                    this.source.display.targets.forEach(target => {
                        if (!this.target && target.active) {
                            const targetRect = target.canvas.getBoundingClientRect()
                            if ((streamRect.bottom > targetRect.top) && (streamCenterX > targetRect.left) && (streamCenterX < targetRect.right)) {
                                this.target = target;
                                this.pathCenterY = targetRect.height * getRandom(0.2, 0.8);
                                this.pathAmplitude = Math.min(this.pathCenterY, targetRect.height - this.pathCenterY) * getRandom(0.3, 0.7);
                                this.pathPeriod = targetRect.width * getRandom(0.5, 1)/(2 * Math.PI);
                                this.pathStartX = -1 * this.pathPeriod * Math.random()
                            }
                        }
                    })
                }
            }
        }
        draw() {
            const height = (this.fullForce ? 4 : 1) * (this.visibleHeight * getRandom(3, 6))
            ,   halfWidth = this.canvas.width/2;
            this.canvas.style.height = `${height}px`;
            this.canvas.height = this.canvas.clientHeight;
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            for (let layer = 0; layer < 2; layer++) {
                let y = 0
                while (y < this.canvas.height) {
                    const height = Math.min(this.canvas.height - y, this.canvas.width * getRandom(3, 8))
                    ,   offset0 = layer ? -5 : -15
                    ,   offset1 = -1 * offset0
                    ,   saturation = this.source.saturation + getRandom(offset0, offset1)
                    ,   luminosity  = this.source.luminosity + getRandom(offset0, offset1);
                    this.context.fillStyle = `hsl(${this.source.hue}, ${saturation}%, ${luminosity}%)`;
                    this.context.beginPath()
                    this.context.ellipse(halfWidth, y + (height/2), halfWidth, height/2, 0, 0, 2 * Math.PI);
                    this.context.fill();
                    y += height;
                }
            }
        }
        initialize() {
            this.element.style.width = `${this.source.dispenser.lidWidth/getRandom(5, 8)}px`;
            this.visibleHeight = this.source.display.height - this.source.bottom
            this.element.style.setProperty("--flowHeight", `${this.visibleHeight}px`);
            this.canvas.width = this.canvas.clientWidth;
            this.target = null;
            this.active = false;
            this.fullForce = false;
            return this;
        }
        squeeze() {
            this.fullForce = true;
            if (this.active) {
                const streamRect = this.canvas.getBoundingClientRect()
                ,   initialOffset = Math.min(this.element.clientHeight, streamRect.bottom - this.source.bottom);
                this.canvas.style.transition = null;
                setTimeout(() => {
                    this.canvas.style.transform = `translateY(${initialOffset}px)`
                    this.start();
                });
            } else {
                this.start();
            }
            return this;
        }
        start() {
            this.draw();
            clearTimeout(this.stopTimeoutId);
            const flowPeriod = getRandom(5, 10)
            ,   distance = this.element.clientHeight + this.canvas.height
            ,   squeezePeriod = flowPeriod * this.canvas.height/(this.canvas.height + this.element.clientHeight);
            this.canvas.style.transition = `transform ${flowPeriod}s linear`;
            setTimeout(() => {
                this.active = true;
                this.canvas.style.transform = `translateY(${distance}px)`
                this.source.dispenser.fade(squeezePeriod, this.fullForce);
            });
            return this;
        }
        stop() {
            this.active = false;
            this.target = null;
            this.canvas.style.transition = null;
            setTimeout(() => {
                this.canvas.style.transform = null
                this.element.style.height = null;
                if (!this.fullForce && (this.source.dispenser.emptiness < 0.8)) {
                    this.stopTimeoutId = setTimeout(() => this.start(), 3000);
                }
            });
            return this;
        }
    }
,   Image = class {
        constructor(source) {
            this.source = source;
            this.id = imageCount++;
            this.canvas = document.body.appendChild(document.querySelector("#canvasRoot").cloneNode(false));
            this.canvas.id = `image${this.id}`;
            this.context = this.canvas.getContext('2d');
        }
        delete() {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        initialize(x, y, width, height) {
            this.canvas.style.width = `${width}px`;
            this.canvas.style.height = `${height}px`;
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;
            const offsets = [];
            this.context.drawImage(this.source, x, y, width, height, 0, 0, width, height);
            const imageData0 = this.context.getImageData(0, 0, width, height)
            ,   pixels0 = new Uint32Array(imageData0.data.buffer)
            offsets[0] = Math.floor(pixels0.findIndex(pixel => pixel)/imageData0.width);
            offsets[2] = Math.floor(pixels0.reverse().findIndex(pixel => pixel)/imageData0.width);
            this.canvas.style.width = `${height}px`;
            this.canvas.style.height = `${width}px`;
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;
            this.context.translate(0, this.canvas.height);
            this.context.rotate(Math.PI/-2);
            this.context.drawImage(this.source, x, y, width, height, 0, 0, width, height);
            const imageData1 = this.context.getImageData(0, 0, height, width)
            ,   pixels1 = new Uint32Array(imageData1.data.buffer)
            offsets[1] = Math.floor(pixels1.findIndex(pixel => pixel)/imageData1.width);
            offsets[3] = Math.floor(pixels1.reverse().findIndex(pixel => pixel)/imageData1.width);
            this.context.setTransform(1, 0, 0, 1, 0, 0);
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.canvas.style.width = `${width - (offsets[1] + offsets[3])}px`;
            this.canvas.style.height = `${height - (offsets[0] + offsets[2])}px`;
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;
            this.context.drawImage(this.source, x + offsets[3], y + offsets[0], this.canvas.width, this.canvas.height, 0, 0, this.canvas.width, this.canvas.height);
            // console.log(Date.now() + `: initializing image ${this.id}: source ${this.source.id} x ${x} y${y} width${width} height ${height}, offsets ${offsets[0]}/${offsets[1]}/${offsets[2]}/${offsets[3]}`);
            return this;
        }
}
,   Label = class {
        constructor(dispenser) {
            this.dispenser = dispenser;
            this.id = this.dispenser.id;
            this.canvas = this.dispenser.element.querySelector(".labels");
            this.canvas.id = `label${this.id}`
            this.context = this.canvas.getContext('2d');
        }
        initialize(height) {
            this.canvas.style.width = `${this.dispenser.canvas.clientWidth * getRandom(0.5, 0.8)}px`;
            this.canvas.style.height = `${height * getRandom(0.5, 0.8)}px`;
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;
            const x = getRandom(-0.3, 0.6) * this.dispenser.canvas.clientWidth
            ,   y = 0.1 * height;
            this.canvas.style.left = `${x}px`;
            this.canvas.style.top = `${y}px`;
            this.context.fillStyle = "hsla(0, 0%, 100%, 0.5)";
            this.context.strokeStyle = `hsla(0, 0%, ${getRandom(25, 100)}%, 0.5)`;
            this.context.lineWidth = Math.min(this.canvas.width/8, getRandom(2, 20));
            this.context.strokeRect(0, 0, this.canvas.width, this.canvas.height);
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.context.globalCompositeOperation = "destination-in";
            this.context.drawImage(this.dispenser.canvas, 0, 0, this.dispenser.canvas.width, this.dispenser.canvas.height, -1 * x, -1 * y, this.dispenser.canvas.width, this.dispenser.canvas.height);
            return this;
        }
    }
,   Source = class {
        constructor(display) {
            this.display = display;
            this.id = this.display.sources.length;
            this.element = this.display.element.appendChild(document.querySelector("#sourceRoot").cloneNode(true));
            this.element.id = `source${this.id}`;
            this.element.setAttribute("data-id",this.id);
        }
        delete() {
            clearTimeout(this.flow.stopTimeoutId);
            delete this.display.sources[this.id];
            this.element.parentNode.removeChild(this.element);
        }
        initialize() {
            this.hue = 360 * Math.random();
            this.saturation = getRandom(50, 100);
            this.luminosity = 50;
            this.mainColor = `hsl(${this.hue}, ${this.saturation}%, ${this.luminosity}%)`
            this.dispenser = this.dispenser || new Dispenser(this);
            this.dispenser.initialize();
            this.bottom = getRandom(this.dispenser.canvas.height, this.display.maxSourceBottom);
            this.element.style.top = `${this.bottom}px`;
            this.element.style.width = `${this.dispenser.canvas.width}px`
            this.rightward = Math.random() < 0.5;
            this.flow = this.flow || new Flow(this);
            this.flow.initialize();
            return this;
        }
        move(minimumWait = 0) {
            this.element.style.transition = `transform ${this.display.baseDuration * (1 + Math.random())}ms ease-in`;
            const distance = (this.rightward ? 1 : -1) * (this.display.width + this.dispenser.element.clientWidth)
            ,   wait = minimumWait + getRandom(500, 1000);
            setTimeout(() => {
                this.element.style.visibility = "visible";
                this.element.style[this.rightward ? "right" : "left"] = `100%`;
                this.element.style.transform = `translateX(${distance}px)`;
                this.flow.start();
            }, wait);
            return this;
        }
        reactivate() {
            this.flow.stop();
            this.element.style.visibility = "hidden";
            this.element.style.transition = null;
            setTimeout(() => {
                this.element.style.transform = null;
                this.element.style[this.rightward ? "right" : "left"] = null;
                this.initialize().move()
            });
        }
    }
,   Target = class {
        constructor(display) {
            this.display = display;
            this.id = this.display.targets.length;
            this.canvas = this.display.element.appendChild(document.querySelector("#targetRoot").cloneNode(true));
            this.canvas.id = `target${this.id}`;
            this.canvas.setAttribute("data-id",this.id);
            this.context = this.canvas.getContext('2d');
        }
        delete() {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        dissolve() {
            this.context.globalCompositeOperation = "destination-out";
        }
        initialize(initial = false) {
            const targetImage = this.display.targetImages[Math.floor(this.display.targetImages.length * Math.random())]
            ,   height = (this.display.height - this.display.maxSourceBottom) * getRandom(0.5, 0.8)
            ,   top = getRandom(this.display.maxSourceBottom, this.display.height - height)
            ,   width = height * targetImage.canvas.width/targetImage.canvas.height;
            this.canvas.style.top = `${top}px`
            this.canvas.style.width = `${width}px`
            this.canvas.style.height = `${height}px`
            this.rightward = Math.random() < 0.5;
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;
            if (Math.random() < 0.5) {
                this.context.translate(this.canvas.width, 0);
                this.context.scale(-1, 1);
            }
            this.context.drawImage(targetImage.canvas, 0, 0, this.canvas.width, this.canvas.height);
            this.context.setTransform(1, 0, 0, 1, 0, 0);
            this.context.globalCompositeOperation = "source-atop";
            if (!initial) {
                const index = this.display.targets.findIndex(target => target.id == this.id)
                this.display.targets.unshift(this.display.targets.splice(index, 1)[0]);
                this.canvas.parentNode.appendChild(this.canvas);
            }
            this.canvas.classList.add("clickable");
            return this;
        }
        move(wait = 0) {
            const distance = (this.rightward ? 1 : -1) * (this.display.width + this.canvas.width);
            this.period = 2 * this.display.baseDuration * (1 + Math.random());
            this.canvas.style.transition = `transform ${this.period}ms ease-in`;
            setTimeout(() => {
                this.active = true;
                this.canvas.style.visibility = "visible";
                this.canvas.style[this.rightward ? "right" : "left"] = `100%`;
                this.canvas.style.transform = `translateX(${distance}px)`
            }, wait);
            return this;
        }
        reactivate() {
            this.canvas.style.visibility = "hidden";
            this.canvas.style.transition = null;
            this.moveStart = 0;
            setTimeout(() => {
                this.active = false;
                this.canvas.style.transform = null;
                this.canvas.style[this.rightward ? "right" : "left"] = null;
                this.initialize().move(getRandom(500, 2000))
            });
        }
        splash(x, y, source, fullForce = false) {
            const factor = Math.random()
            ,   distance = (fullForce ? 200 : 60) * factor
            ,   radius = (fullForce ? 60 : 30) * (1 - factor)
            ,   luminosity = source.luminosity + (10 * getRandom(-1 * factor, factor))
            ,   alpha = 1 - getRandom(0, factor)
            ,   angle = 2 * Math.PI * Math.random()
            ,   drawX = x + (distance * Math.cos(angle))
            ,   drawY = y + (distance * Math.sin(angle));
            this.context.fillStyle = `hsla(${source.hue}, ${source.saturation}%, ${luminosity}%, ${alpha})`;
            this.context.beginPath();
            this.context.ellipse(drawX, drawY, getRandom(radius/2, radius), getRandom(radius/3, radius), angle, 0, 2 * Math.PI);
            this.context.fill();
        }
    }
,   getRandom = function(min = 0, max = 1) {
        return min + ((max - min) * Math.random());
    }
;
let animationId = null
,   priorTimestamp = 0
,   display = null
,   imageCount = 0;
window.onload = function() {
    animationId = window.requestAnimationFrame(animationLoop);
}
window.onresize = function() {
    if (display && !display.resizing) {
        display.resizing = true;
        window.cancelAnimationFrame(animationId);
        display.delete();
        // animationId = window.requestAnimationFrame(animationLoop);
        setTimeout(() => { animationId = window.requestAnimationFrame(animationLoop) }, 500);
    }
}
document.body.addEventListener("click", function(e) {
    const dataId = e.target.getAttribute("data-id");
    e.target.classList.remove("clickable");
    if (e.target.classList.contains("dispensers")) {
        display.sources[dataId].flow.squeeze();            // }
    } else if (e.target.classList.contains("targets")) {
        display.findTarget(dataId).dissolve();
    }
}, false);
document.body.addEventListener("transitionend", function(e) {
    const dataId = e.target.getAttribute("data-id");
    if (e.propertyName == "transform") {
        if (e.target.classList.contains("sources")) {
            display.sources[dataId].reactivate();
        } else if (e.target.classList.contains("targets")) {
            display.findTarget(dataId).reactivate();
        } else if (e.target.classList.contains("streams")) {
            display.sources[dataId].flow.stop();
        } else if (e.target.classList.contains("fullStreams")) {
            display.sources[dataId].flow.stop(true);
        }
    }
}, false);
function animationLoop(ts) {
    if (display) {
        const interval = ts - priorTimestamp;
        if (interval < 100) {
            display.draw();
        }
    } else {
        display = new Display().initialize();
    }
    priorTimestamp = ts;
	animationId = window.requestAnimationFrame(animationLoop);
}
})();
