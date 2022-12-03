(function() {
"use strict";

const displayRoot = document.querySelector("#displayRoot")
;
let display = null
,   animationId = null
;
window.onload = function() {
    animationId = window.requestAnimationFrame(animationLoop);
}
window.onresize = function() {
    if (display) {
        display.resizing = true;
        display.amoeba.delete();
        display.kernels.forEach(kernel => { kernel.delete(); });
        setTimeout(() => {
            display = null;
        }, 0);
    }
}
function createDisplay() {
    const Display = function() {
            this.element = displayRoot;
            this.height = this.element.clientHeight;
            this.width = this.element.clientWidth;
            this.area = this.height * this.width;
            this.diagonal = Math.sqrt(Math.pow(this.height, 2) + Math.pow(this.width, 2));
            this.centerX = this.width/2;
            this.centerY = this.height/2;
            this.canvas = document.querySelector("#exterior");
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;
            this.context = this.canvas.getContext('2d');
            this.amoeba = new Amoeba(this);
            this.kernels = [];
        }
    ,   Amoeba = function(display) {
            this.display = display;
            this.frame = document.querySelector("#amoebaFrame");
            this.element = document.querySelector("#amoeba");
            this.points = [];
            this.particles = [];
        }
    ,   Kernel = function(display) {
            this.display = display;
            this.id = this.display.kernels.length;
            this.frame = this.display.element.appendChild(document.querySelector("#kernelRoot").cloneNode(true));
            this.frame.id = "kernelFrame" + this.id;
            this.frame.setAttribute("data-id",this.id);
            this.element = this.frame.querySelector(".kernels");
            this.element.id = "kernel" + this.id;
        }
    ,   Link = function(particle, ...baseParticles) {
            this.particle = particle;
            this.particle.link = this;
            this.baseParticles = baseParticles;
            this.baseParticles.forEach((particle, index) => { particle.baseLinks[index] = this; });
            this.motion = [];
        }
    ,   Particle = function(amoeba, radius, point) {
            this.amoeba = amoeba;
            this.id = this.amoeba.particles.length;
            if (point) {
                this.point = point;
                this.point.particle = this;
                this.element = this.point.element.appendChild(document.querySelector("#particleRoot").cloneNode(true));
            } else {
                this.element = this.amoeba.element.appendChild(document.querySelector("#particleRoot").cloneNode(true));
            }
            this.element.id = "particle" + this.id;
            this.element.setAttribute("data-id",this.id);
            this.canvas = this.element.querySelector(".particleCanvas")
            this.nucleus = radius !== undefined;
            this.radius = radius || (this.amoeba.display.minParticleSize + ((this.amoeba.display.maxParticleSize - this.amoeba.display.minParticleSize) * Math.random()))/2;
            this.canvas.style.width = this.canvas.style.height = `${(this.nucleus ? 2 : 4) * this.radius}px`;
            this.canvas.width = this.canvas.height = this.canvas.clientWidth;
            this.context = this.canvas.getContext('2d');
            this.baseLinks = [];
            this.amoeba.particles.push(this);
        }
    ,   Point = function(amoeba, after = amoeba.lastPoint) {
            this.amoeba = amoeba;
            this.id = this.amoeba.points.length;
            this.element = this.amoeba.element.appendChild(document.querySelector("#branchRoot").cloneNode(true));
            this.element.id = "point" + this.id;
            this.element.classList.add("points");
            this.element.setAttribute("data-id",this.id);
            this.tip = this.element.querySelector(".tips");
            this.tip.id = "pointTip" + this.id;
            this.tip.classList.add("pointTips");
            this.control0 = this.tip.appendChild(document.querySelector("#branchRoot").cloneNode(true));
            this.control0.id = "control0-" + this.id;
            this.control0.classList.add("control0");
            this.control0Tip = this.control0.querySelector(".tips");
            this.control0Tip.id = "control0Tip" + this.id;
            this.control0Tip.classList.add("control0Tips");
            this.control1 = this.tip.appendChild(document.querySelector("#branchRoot").cloneNode(true));
            this.control1.id = "control1-" + this.id;
            this.control1.classList.add("control1");
            this.control1Tip = this.control1.querySelector(".tips");
            this.control1Tip.id = "control1Tip" + this.id;
            this.control1Tip.classList.add("control1Tips");
            if (after) {
                this.prevPoint = after;
                if (after.nextPoint) {
                    this.nextPoint = after.nextPoint;
                    after.nextPoint.prevPoint = this;
                } else {
                    this.amoeba.lastPoint = this;
                }
                after.nextPoint = this;
            } else {
                this.amoeba.firstPoint = this.amoeba.lastPoint = this;
            }
            this.delay = this.amoeba.display.fullDuration * Math.random();
            this.amoeba.points.push(this);
        }
    ,   Popcorn = function(point, kernel) {
            this.point = point;
            this.kernel = kernel;
            this.id = this.kernel.id;
            this.frame = this.point.amoeba.frame.appendChild(document.querySelector("#popcornRoot").cloneNode(true));
            this.frame.id = "popcornFrame" + this.id;
            this.frame.setAttribute("data-id",this.id);
            this.element = this.frame.querySelector(".popcorn");
            this.element.id = "popcorn" + this.id;
        }
    ;
    Display.prototype = {
        draw: function() {
            if (!this.gradient || this.backgroundChanged) {
                const gradientAngle = this.backgroundAngle + (Math.PI/2);
                const x = this.diagonal * Math.cos(gradientAngle)/2
                ,   y = this.diagonal * Math.sin(gradientAngle)/2;
                this.gradient = this.context.createLinearGradient(this.centerX - x, this.centerY - y, this.centerX + x, this.centerY + y);
                this.backgroundHue = 205 + (45 * Math.cos(2 * this.backgroundAngle));
                this.gradient.addColorStop(0, `hsl(${this.backgroundHue}, 100%, 90%)`);
                this.gradient.addColorStop(0.5, `hsl(${this.backgroundHue}, 100%, 60%)`);
                this.gradient.addColorStop(1, `hsl(${this.backgroundHue}, 100%, 90%)`);
                this.element.style.backgroundImage = `radial-gradient(hsl(${this.backgroundHue}, 70%, 60%) 0, hsl(${this.backgroundHue}, 70%, 90%) 100%)`;
                this.backgroundChanged = false;
            }
            this.context.globalCompositeOperation = "source-over";
            this.context.fillStyle = this.gradient;
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.context.beginPath();
            const coordinates = this.amoeba.drawPath(this.context)
            this.context.closePath();
            const centerX = this.centerX + this.amoeba.x
            ,   centerY = this.centerY + this.amoeba.y;
            this.kernels.forEach(kernel => {
                const kernelRect = kernel.element.getBoundingClientRect();
                if (kernelRect.right < 0) {
                    kernel.reset();
                } else if (kernelRect.left > centerX) {
                    coordinates.forEach(coordinate => {
                        if (!coordinate.point.popcorn && (coordinate.x > centerX) && (coordinate.x >= kernelRect.right) && (kernelRect.top <= coordinate.y) && (kernelRect.bottom >= coordinate.y)) {
                            const kernelFrameRect = kernel.frame.getBoundingClientRect()
                            ,   xDistance = Math.abs(kernelFrameRect.x - centerX)
                            ,   yDistance = Math.abs(kernelFrameRect.y - centerY)
                            ,   delay = (yDistance < this.amoebaSize/2) ? xDistance * Math.random() * 1000/kernel.velocity : 0;
                            kernel.pop(coordinate.point, delay);
                        }
                    });
                }
            });
            this.context.globalCompositeOperation = "destination-out";
            this.context.fillStyle = "black"
            this.context.fill();
        }
    ,   initialize: function() {
            const minLayerCount = 6
            ,   maxLayerCount = 9;
            this.amoebaSize = 0.8 * Math.min(this.width, this.height);
            this.particleHue = 300 + (120 * Math.random());
            this.backgroundAngle = Math.PI * Math.random();
            this.maxParticleSize = this.amoebaSize/(2 * (minLayerCount + ((maxLayerCount - minLayerCount) * Math.random())));
            this.minParticleSize = this.maxParticleSize/2;
            this.subParticleCount = Math.min(24, Math.max(8, Math.pow(this.maxParticleSize, 2)/100));
            this.minDuration = 2000 + (4000 * Math.random());
            this.fullDuration = 2 * this.minDuration;
            this.amoeba.initialize().populate().move(true);
            this.kernelSize = this.minParticleSize
            document.body.style.setProperty("--kernelWidth", `${this.kernelSize}px`);
            document.body.style.setProperty("--kernelRight", `${-1 * this.kernelSize}px`);
            const maxKernelCount = Math.min(12, Math.max(4, this.area/100000));
            do {
                this.kernels.push(new Kernel(this).run(true));
            } while (this.kernels.length < maxKernelCount);
            document.body.style.setProperty("--popcornWidth", `${3 * this.kernelSize}px`);
            document.body.style.setProperty("--popcornTop", `${-3 * this.kernelSize/2}px`);
            document.body.style.setProperty("--popcornRight", `${this.kernelSize}px`);
            this.element.addEventListener("mousemove", function(e) {
                display.mouseMove(e);
            }, false);
            return this;
        }
    ,   mouseMove: function(event) {
            const centerDistance = Math.sqrt(Math.pow(event.clientX - this.centerX, 2) + Math.pow(event.clientY - this.centerY, 2));
            if (centerDistance  > this.amoebaSize/2) {
                const centerAngle = Math.atan2(event.clientY - this.centerY, event.clientX - this.centerX)
                ,   difference = Math.min(Math.abs(this.backgroundAngle - centerAngle), Math.abs(this.backgroundAngle - (Math.PI + centerAngle)), Math.abs(this.backgroundAngle - ((2 * Math.PI) + centerAngle)), Math.abs(this.backgroundAngle + Math.PI - centerAngle))
                ,   bound = 0.2;
                if (difference < bound) {
                    this.backgroundAngle = centerAngle + ((centerAngle < 0) ? Math.PI : 0);
                    this.backgroundChanged = true;
                }
            }
        }
    }
    Amoeba.prototype = {
        delete: function() {
            this.particles.forEach(particle => { particle.delete(); });
            this.points.forEach(point => { point.delete(); });
            this.frame.style.transition = this.element.style.transition = null;
            setTimeout(() => {
                this.frame.style.transform = this.element.style.transform = null;
            }, 0);
        }
    ,   drawPath: function(context) {
            const firstPoint = this.firstPoint.getScreenCoordinates()
            ,   coordinates = [firstPoint];
            context.moveTo(firstPoint.x, firstPoint.y);
            let prevPoint = firstPoint;
            let current = this.firstPoint.nextPoint;
            while (current) {
                const currentPoint = current.getScreenCoordinates();
                coordinates.push(currentPoint);
                context.bezierCurveTo(prevPoint.control1X, prevPoint.control1Y, currentPoint.control0X, currentPoint.control0Y, currentPoint.x, currentPoint.y);
                prevPoint = currentPoint;
                current = current.nextPoint;
            }
            context.bezierCurveTo(prevPoint.control1X, prevPoint.control1Y, firstPoint.control0X, firstPoint.control0Y, firstPoint.x, firstPoint.y);
            return coordinates;
        }
    ,   initialize: function() {
            this.x = 0;
            this.y = 0;
            this.frame.style.left = `${this.display.centerX}px`;
            this.frame.style.top = `${this.display.centerY}px`;
            this.angle = 0;
            this.radius = this.display.amoebaSize/2;
            const c = 0.552 * this.radius;
            new Point(this).position(this.radius, 0).setControl(c, c);
            new Point(this).position(0, this.radius).setControl(c, c);
            new Point(this).position(-1 * this.radius, 0).setControl(c, c);
            new Point(this).position(0, -1 * this.radius).setControl(c, c);
            const particleCount = Math.floor(this.radius * Math.PI/(2 * this.display.maxParticleSize))
            ,   particleAngle = Math.PI/(2 * particleCount);
            for (let i = 0; i < 4; i++) {
                let currentPoint = this.points[i]
                ,   angle = Math.PI/2;
                for (let j = 1; j < particleCount; j++) {
                    const factor = particleAngle/angle;
                    currentPoint.split(factor);
                    angle -= particleAngle
                    currentPoint = currentPoint.nextPoint;
                }
            }
            this.frame.style.opacity = 1;
            return this;
        }
    ,   move: function(initialize, moveFrame = false) {
            if (moveFrame || initialize) {
                let sumX = 0
                ,   sumY = 0
                this.points.forEach(point => {
                    if (initialize) {
                        point.move();
                    }
                    const change = point.edgeDistance - point.width;
                    sumX += change * Math.cos(point.angle + this.angle);
                    sumY += change * Math.sin(point.angle + this.angle);
                })
                const x = sumX/this.points.length
                ,   y = sumY/this.points.length;
                this.x += x;
                this.y += y;
                const delay = this.display.minDuration + ((this.display.fullDuration - this.display.minDuration) * Math.random())
                ,   duration = this.display.minDuration + ((this.display.fullDuration - this.display.minDuration) * Math.random());
                this.frame.style.transition = `transform ${duration}ms ease-in-out ${delay}ms`
                setTimeout(() => {
                    this.frame.style.transform = `translate(${this.x}px, ${this.y}px)`;
                }, 0);
            }
            if (!moveFrame || initialize) {
                const angle = ((Math.random() < 0.5) ? -1 : 1) * Math.PI * Math.random()/2;
                this.angle += angle;
                const delay = this.display.minDuration + ((this.display.fullDuration - this.display.minDuration) * Math.random())
                ,   duration = Math.abs(8 * angle * this.display.fullDuration);
                this.element.style.transition = `transform ${duration}ms ease-in-out ${delay}ms`
                setTimeout(() => {
                    this.element.style.transform = `rotate(${this.angle}rad)`;
                }, 0);
            }
            return this;
        }
    ,   populate: function() {
            let currentLevel = []
            ,   priorLevel = []
            ,   currentPoint = this.firstPoint;
            while (currentPoint) {
                const particle = new Particle(this, undefined, currentPoint).position().draw();
                priorLevel.push({particle: particle, angle: Math.atan2(currentPoint.y, currentPoint.x)});
                currentPoint = currentPoint.nextPoint;
            }
            priorLevel.sort((a, b) => { return a.angle - b.angle; });
            const gap = 8
            ,   nucleusRadius = 1.5 * this.display.maxParticleSize;
            for (let orbitRadius = this.radius - (1.5 * this.display.maxParticleSize); orbitRadius > nucleusRadius; orbitRadius -= this.display.maxParticleSize) {
                const particleCount = Math.floor(orbitRadius * 2 * Math.PI/this.display.maxParticleSize)
                for (let i = 0, angle = Math.random(); i < particleCount; i++, angle += 2 * Math.PI/particleCount) {
                    const x = orbitRadius * Math.sin(angle)
                    ,   y = orbitRadius * Math.cos(angle)
                    ,   particle = new Particle(this).position(x, y).draw();
                    currentLevel.push({particle: particle, angle: Math.atan2(particle.y, particle.x)});
                }
                currentLevel.sort((a, b) => { return a.angle - b.angle; });
                priorLevel.unshift({particle: priorLevel[priorLevel.length - 1].particle, angle: priorLevel[priorLevel.length - 1].angle - (2 * Math.PI)});
                priorLevel.push({particle: priorLevel[1].particle, angle: priorLevel[1].angle + (2 * Math.PI)});
                for (let i = 0, j = 0; i < currentLevel.length; i++) {
                    while (priorLevel[j].angle <= currentLevel[i].angle) {
                        if (priorLevel[j + 1].angle > currentLevel[i].angle) {
                            currentLevel[i].particle.link = new Link(currentLevel[i].particle, priorLevel[j].particle, priorLevel[j + 1].particle);
                        }
                        j++;
                    }
                }
                priorLevel = [].concat(currentLevel);
                currentLevel = [];
            }
            this.nucleus = new Particle(this, nucleusRadius).position().draw()
            const particles = priorLevel.map(level => { return level.particle; })
            this.nucleus.link = new Link(this.nucleus, ...particles);
            return this;
        }
    }
    Kernel.prototype = {
        delete: function() {
            this.frame.parentNode.removeChild(this.frame);
        }
    ,   pop: function(point, delay) {
            point.popcorn = new Popcorn(point, this);
            setTimeout(() => {
                point.popcorn.initialize(this.element.style.animation);
                this.reset();
            }, delay);
        }
    ,   reset: function() {
            this.frame.style.transition = null;
            setTimeout(() => {
                this.frame.style.transform = `translate(0, 0)`;
                setTimeout(() => {
                    this.run();
                }, 0);
            }, 0);
        }
    ,   run: function(initialize) {
            this.y = this.display.height * Math.random();
            this.frame.style.top = `${this.y}px`;
            this.element.style.backgroundPosition = `${Math.floor(4 * Math.random()) * 100/3}%`;
            this.element.style.animation = `kernelRotate ${10 + (10 * Math.random())}s linear ${((Math.random() < 0.5) ? `normal` : `reverse`)}  infinite`;
            const delay = (initialize ? 50 : 5) * Math.random()
            ,   duration = 30 + (20 * Math.random());
            this.velocity = this.display.width/duration;
            this.frame.style.transition = `transform ${duration}s linear ${delay}s`;
            setTimeout(() => {
                this.frame.style.transform = `translate(${-1 * (this.display.width + (2 * this.display.kernelSize))}px, 0)`;
            }, 0);
            return this;
        }
    }
    Particle.prototype = {
        delete: function() {
            this.element.parentNode.removeChild(this.element);
        }
    ,   draw: function() {
            for (let i = 0; i < this.amoeba.display.subParticleCount; i++) {
                const x = this.canvas.width * Math.random()
                ,   y = this.canvas.height * Math.random()
                ,   saturation = 20 + (60 * Math.random())
                ,   luminosity = 100 * Math.random();
                this.context.fillStyle = `hsl(${this.amoeba.display.particleHue}, ${saturation}%, ${luminosity}%)`;
                this.context.fillRect(x, y, 1, 1);
            }
            const center = this.canvas.width/2
            ,   layers = this.nucleus ? 7 : 3;
            this.context.translate(center, center);
            let radius = this.radius;
            for (let i = 0; i < layers; i++) {
                this.makePath(radius);
                if (this.nucleus || !i) {
                    const hue = (this.nucleus && (Math.random() < 0.4)) ? 360 * Math.random() : this.amoeba.display.particleHue
                    ,   saturation = (this.nucleus ? 30 : 10) + (60 * Math.random())
                    ,   luminosity = (this.nucleus ? 40 : 50) + (30 * Math.random())
                    ,   alpha = ((this.nucleus ? 4 : 2) + (2 * Math.random()))/10;
                    this.context.fillStyle = `hsla(${hue}, ${saturation}%, ${luminosity}%, ${alpha})`;
                    this.context.strokeStyle = `hsla(${hue}, ${saturation + 30}%, ${luminosity - 10}%, ${alpha})`;
                }
                if (i && (Math.random() < 0.3)) {
                    this.context.stroke();
                } else {
                    this.context.fill();
                }
                this.context.clip();
                radius *= 0.9;
            }
            return this;
        }
    ,   makePath: function(maxRadius = this.canvas.width/2) {
            const points = [];
            [[1, 0], [0, 1], [-1, 0], [0, -1]].forEach(point => {
                const cFactor = this.nucleus ? (0.7 + (0.3 * Math.random())) : (0.3 + (0.7 * Math.random()))
                ,   c0 = maxRadius * cFactor
                ,   x = point[0] * c0
                ,   y = point[1] * c0
                ,   c1x = x || point[1] * c0 * Math.random()
                ,   c1y = y || -1 * point[0] * c0 * Math.random()
                ,   c2x = x || -1 * point[1] * c0 * Math.random()
                ,   c2y = y || point[0] * c0 * Math.random()
                points.push([x, y, c1x, c1y, c2x, c2y]);
            })
            this.context.beginPath();
            this.context.moveTo(points[0][0], points[0][1]);
            for (let i = 0; i < points.length; i++) {
                const j = (i + 1) % points.length
                this.context.bezierCurveTo(points[i][4], points[i][5], points[j][2], points[j][3], points[j][0], points[j][1]);
            }
            this.context.closePath();
        }
    ,   move: function(x, y, duration, delay) {
            this.x += x;
            this.y += y;
            this.angle += ((Math.random() < 0.5) ? -1 : 1) * Math.random() * Math.PI/4;
            this.element.style.transition = `transform ${duration}ms ease ${delay}ms`
            setTimeout(() => {
                if (this.point) {
                    this.element.style.transform = `rotate(${this.angle}rad)`
                } else {
                    this.element.style.transform = `translate(${this.x - this.left}px, ${this.y - this.top}px) rotate(${this.angle}rad)`
                }
            }, 0);
            this.baseLinks.forEach(link => {
                link.motion.push({x: x, y: y, duration: duration, delay: delay});
                if (link.motion.length == link.baseParticles.length) {
                     let xSum = 0
                     ,  ySum = 0
                     ,  durationSum = 0
                     ,  delaySum = 0;
                     link.motion.forEach(movement => {
                         xSum += movement.x;
                         ySum += movement.y;
                         durationSum += movement.duration;
                         delaySum += movement.delay;
                     })
                     link.particle.move(xSum/link.motion.length, ySum/link.motion.length, durationSum/link.motion.length, delaySum/link.motion.length);
                     link.motion = [];
                }
            })
            return this;
        }
    ,   position: function(x = 0, y = 0) {
            if (this.point) {
                this.right = Math.round(1.5 * this.radius);
                this.element.style.right = `${this.right}px`;
                this.x = (this.point.width - this.radius) * Math.cos(this.point.angle);
                this.y = (this.point.width - this.radius) * Math.sin(this.point.angle);
            } else if (this.left === undefined) {
                this.left = this.x = Math.round(x);;
                this.top = this.y = Math.round(y);
                this.element.style.left = `${this.left}px`;
                this.element.style.top = `${this.top}px`;
            }
            this.angle = 0;
            return this;
        }
    }
    Point.prototype = {
        delete: function() {
            this.element.parentNode.removeChild(this.element);
        }
    ,   getScreenCoordinates: function() {
            const coordinates = {}
            ,   point = this.tip.getBoundingClientRect()
            ,   control0 = this.control0Tip.getBoundingClientRect()
            ,   control1 = this.control1Tip.getBoundingClientRect();
            coordinates.point = this;
            coordinates.x = point.x;
            coordinates.y = point.y;
            coordinates.control0X = control0.x;
            coordinates.control0Y = control0.y;
            coordinates.control1X = control1.x;
            coordinates.control1Y = control1.y;
            return coordinates;
        }
    ,   move: function() {
            const angle = this.angle + this.amoeba.angle
            ,   sinAngle = Math.sin(angle)
            ,   verticalDistance = sinAngle ? (this.amoeba.display.centerY + (((sinAngle > 0) ? -1 : 1) * this.amoeba.y))/sinAngle : Infinity
            ,   cosAngle = Math.cos(angle)
            ,   horizontalDistance = cosAngle ? (this.amoeba.display.centerX + (((cosAngle > 0) ? -1 : 1) * this.amoeba.x))/cosAngle : Infinity
            this.edgeDistance = Math.min(Math.abs(verticalDistance), Math.abs(horizontalDistance));
            const maxFactor = 0.2
            ,   minWidth = Math.max(this.width * (1 - maxFactor), this.amoeba.radius/2)
            ,   maxWidth = Math.min(this.width * (1 + maxFactor), this.edgeDistance)
            ,   newWidth = minWidth + ((maxWidth - minWidth) * Math.random())
            ,   widthChange = newWidth - this.width;
            this.width = newWidth;
            this.controlLength0 = this.baseControlLength0 * (1 + Math.random());
            this.controlLength1 = this.baseControlLength1 * (1 + Math.random());
            const duration = this.amoeba.display.minDuration + ((this.amoeba.display.fullDuration - this.amoeba.display.minDuration) * Math.random())
            const x = widthChange * Math.cos(this.angle)
            ,   y = widthChange * Math.sin(this.angle);
            this.particle.move(x, y, duration, this.delay);
            this.element.style.transition = `width ${duration}ms ease ${this.delay}ms`
            this.control0.style.transition = this.control1.style.transition = `height ${duration}ms ease ${this.delay}ms`
            setTimeout(() => {
                this.element.style.width = `${this.width}px`;
                this.control0.style.height = `${this.controlLength0}px`;
                this.control1.style.height = `${this.controlLength1}px`;
            }, 0);
            this.delay = this.amoeba.display.fullDuration - duration;
            return this;
        }
    ,   position: function(x, y) {
            this.width = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
            this.angle = Math.atan2(y, x);
            this.element.style.width = `${this.width}px`;
            this.element.style.transform = `rotate(${this.angle}rad)`;
            this.x = this.width * Math.cos(this.angle);
            this.y = this.width * Math.sin(this.angle);
            return this;
        }
    ,   setControl: function(controlLength0, controlLength1) {
            this.baseControlLength0 = this.controlLength0 = controlLength0;
            this.baseControlLength1 = this.controlLength1 = controlLength1;
            this.control0.style.height = `${Math.abs(controlLength0)}px`;
            this.control1.style.height = `${Math.abs(controlLength1)}px`;
            return this;
        }
    ,   split: function(factor = 0.5) {
            const thisScreen = this.getScreenCoordinates()
            ,   xOffset = thisScreen.x - this.x
            ,   yOffset = thisScreen.y - this.y
            ,   after = this.nextPoint || this.amoeba.firstPoint
            ,   afterScreen = after.getScreenCoordinates()
            ,   controlX3 = thisScreen.x + (factor * (thisScreen.control1X - thisScreen.x))
            ,   controlY3 = thisScreen.y + (factor * (thisScreen.control1Y - thisScreen.y))
            ,   controlX4 = thisScreen.control1X + (factor * (afterScreen.control0X - thisScreen.control1X))
            ,   controlY4 = thisScreen.control1Y + (factor * (afterScreen.control0Y - thisScreen.control1Y))
            ,   controlX5 = afterScreen.control0X + (factor * (afterScreen.x - afterScreen.control0X))
            ,   controlY5 = afterScreen.control0Y + (factor * (afterScreen.y - afterScreen.control0Y))
            ,   controlX6 = controlX3 + (factor * (controlX4 - controlX3))
            ,   controlY6 = controlY3 + (factor * (controlY4 - controlY3))
            ,   controlX7 = controlX4 + (factor * (controlX5 - controlX4))
            ,   controlY7 = controlY4 + (factor * (controlY5 - controlY4))
            ,   controlX8 = controlX6 + (factor * (controlX7 - controlX6))
            ,   controlY8 = controlY6 + (factor * (controlY7 - controlY6))
            ,   length67 = Math.sqrt(Math.pow(controlX6 - controlX7, 2) + Math.pow(controlY6 - controlY7, 2));
            const newPoint = new Point(this.amoeba, this);
            newPoint.position(controlX8 - xOffset, controlY8 - yOffset).setControl(factor * length67, (1 - factor) * length67);
            this.setControl(this.controlLength0, factor * this.controlLength1);
            after.setControl((1 - factor) * after.controlLength0, after.controlLength1);
            return newPoint;
        }
    }
    Popcorn.prototype = {
        delete: function() {
            this.point.popcorn = null;
            this.frame.parentNode.removeChild(this.frame);
        }
    ,   initialize: function(animation) {
            const kernelFrameRect = this.kernel.frame.getBoundingClientRect()
            ,   kernelX = kernelFrameRect.x - (this.point.amoeba.display.centerX + this.point.amoeba.x)
            ,   kernelY = kernelFrameRect.y - (this.point.amoeba.display.centerY + this.point.amoeba.y)
            this.element.style.top = `${kernelY}px`;
            this.element.style.left = `${kernelX}px`;
            this.element.style.backgroundPosition = `${Math.floor(4 * Math.random()) * 100/3}%`;
            this.frame.style.visibility = "visible";
            this.frame.style.transform = `rotate(${2 * Math.PI * Math.random()})rad`;
            this.frame.style.transition = `opacity ${3 + (3 * Math.random())}s ease-out`
            this.element.style.animation = animation;
            setTimeout(() => {
                this.frame.style.opacity = 0;
            }, 0);
            return this;
        }
    }
    return new Display();
}
function initialize() {
    displayRoot.addEventListener("transitionend", function(e) {
        const dataId = parseInt(e.target.getAttribute("data-id"));
        if (e.target.id == "amoebaFrame") {
            display.amoeba.move(false, true);
        } else if (e.target.id == "amoeba") {
            display.amoeba.move(false);
        } else if (e.target.classList.contains("points")) {
            display.amoeba.points[dataId].move();
        }
    }, false);
    displayRoot.addEventListener("opacity", function(e) {
        const dataId = parseInt(e.target.getAttribute("data-id"));
        if (e.target.classList.contains("popcorn")) {
            display.amoeba.points[dataId].popcorn.delete();
        }
    }, false);
}
function animationLoop(ts) {
    if (display && !display.resizing) {
        display.draw();
    } else if (!display) {
        display = createDisplay().initialize();
    }
	animationId = window.requestAnimationFrame(animationLoop);
}
initialize();
})();
