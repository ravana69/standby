(function() {
"use strict";

const displayRoot = document.querySelector("#displayRoot")
let animationId = null
,   priorTimestamp = 0
,   display = null
,   lineCount = 0
,   marbleCount = 0
,   chainCount = 0
,   gapCount = 0
;
window.onload = function() {
    animationId = window.requestAnimationFrame(animationLoop);
}
window.onresize = function() {
    if (!display.resizing) {
        display.resizing = true;
        window.cancelAnimationFrame(animationId);
        display.delete();
        animationId = window.requestAnimationFrame(animationLoop);
    }
}
function createDisplay() {
    const fallVelocityMax = 0.05
    ,   maxExtreme = 8
    ,   Display = function() {
            this.element = displayRoot;
            this.background = new Background(this);
            this.marbles = [];
            this.splatCircle = document.querySelector("#splatCircle");
            this.splatContext = this.splatCircle.getContext('2d');
            this.chains = [];
            this.gaps = [];
            this.recentExtremes = [Date.now()];
        }
    ,   Background = function(display) {
            this.display = display;
            this.frame = document.querySelector("#backgrounds");
            this.element = document.querySelector("#background");
            this.context = this.element.getContext('2d');
            this.active = document.querySelector("#activeBackground");
            this.activeContext = this.active.getContext('2d');
            this.filter = document.querySelector("#backgroundFilter");
            this.pattern = new Pattern(this);
        }
    ,   Chain = function(display, ...marbles) {
            this.display = display;
            this.id = chainCount++;
            this.marbles = marbles || [];
            this.display.chainsAltered = true;
        }
    ,   Gap = function(display, ...marbles) {
            this.display = display;
            this.id = gapCount++;
            this.leftMarble = marbles[0] || null;
            this.rightMarble = marbles[1] || null;
        }
    ,   Marble = function(display) {
            this.display = display;
            this.id = marbleCount++;
            this.frame = this.display.element.appendChild(document.querySelector("#shapeRoot").cloneNode(true));
            this.frame.id = `shape${this.id}`;
            this.frame.setAttribute("data-id",this.id);
            this.element = this.frame.querySelector(".shapes");
            this.element.setAttribute("data-id",this.id);
            this.context = this.element.getContext('2d');
        }
    ,   Pattern = function(background) {
            this.background = background;
            this.element = document.querySelector("#pattern");
            this.context = this.element.getContext('2d');
        }
    ;
    Display.prototype = {
        addMarble: function() {
            const newMarble = new Marble(this).initialize().scale();
            this.marbles.push(newMarble);
            this.reorderMarbles();
            this.chains.push(new Chain(this, newMarble));
            this.reorderChains();
            newMarble.addGaps();
        }
    ,   delete: function() {
            this.marbles.forEach(marble => marble.delete());
            display = null;
        }
    ,   draw: function(timestamp) {
            this.reorderMarbles();
            this.reorderChains();
            this.chains.forEach(chain => chain.draw(timestamp));
            this.marbles.slice(this.floorMarbles).forEach(marble => marble.draw(timestamp));
            this.gaps.slice().forEach(gap => gap.check());
            let under = this.marbles.slice(0, this.floorMarbles);
            this.marbles.slice(this.floorMarbles).sort((a, b) => b.rect.bottom - a.rect.bottom).forEach(marble => {
                marble.check(under);
            });
        }
    ,   initialize: function() {
            this.height = this.element.clientHeight;
            this.width = this.element.clientWidth;
            this.minRadius = Math.min(this.width, this.height)/8;
            this.maxRadius = Math.max(this.width, this.height)/4;
            this.populate = true;
            this.background.initialize();
            return this;
        }
    ,   reorderChains: function() {
            if (this.chainsAltered) {
                this.chains.filter(chain => !chain.marbles.length).forEach(chain => chain.delete())
                this.chains.forEach(chain => chain.drawOrderValue = chain.drawOrder());
                this.chains.sort((a, b) => a.drawOrderValue - b.drawOrderValue);
                const firstDependent = this.chains.find(chain => chain.drawOrderValue == this.floorMarbles)
                ,   dependentChains = firstDependent ? this.chains.splice(this.chains.indexOf(firstDependent)) : []
                while (dependentChains.length) {
                    const nextChain = dependentChains.find(chain => this.chains.some(earlyChain => earlyChain.marbles.includes(chain.anchor)))
                    if (nextChain) {
                        this.chains.push(...dependentChains.splice(dependentChains.indexOf(nextChain), 1));
                    } else {
                        this.chains.push(...dependentChains.splice(0));
                    }
                }
                this.chainsAltered = false;
            }
        }
    ,   reorderMarbles: function() {
            this.marbles.sort((a, b) => a.drawOrder() - b.drawOrder()).forEach((marble, index) => marble.index = index);
            this.floorMarbles = this.marbles.filter(marble => marble.bottomEdge).length;
        }
    }
    Background.prototype = {
        draw: function() {
            const angle = Math.PI * Math.random()/2
            ,   cos = Math.cos(angle)
            ,   sin = Math.sin(angle)
            ,   height0 = sin * this.active.width
            ,   x = sin * height0
            ,   y = cos * height0
            ,   height = height0 + (cos * this.active.height)
            ,   width = (cos * this.active.width) + (sin * this.active.height);
            this.activeContext.setTransform(1,0,0,1,0,0);
            this.activeContext.translate(x, -1 * y);
            this.activeContext.rotate(angle);
            this.activeContext.fillStyle = this.activeContext.createPattern(this.pattern.element, "repeat");
            this.activeContext.clearRect(0, 0, width, height);
            this.activeContext.fillRect(0, 0, width, height);
            this.active.style.transition = `opacity ${5 + (5 * Math.random())}s ease-out`;
            setTimeout(() => {
                this.active.style.opacity = 1;
            }, 0);
        }
    ,   initialize: function() {
            const blur = 8
            ,   width = (this.display.width + (2 * blur))
            ,   height = (this.display.height + (2 * blur));
            this.frame.style.setProperty("--backgroundWidth", `${width}px`);
            this.frame.style.setProperty("--backgroundHeight", `${height}px`);
            this.active.width = this.element.width = this.element.clientWidth;
            this.active.height = this.element.height = this.element.clientHeight;
            if ((navigator.userAgent.search(/Firefox|Chrome/) > -1)) {
                this.activeContext.filter = `blur(${blur}px)`;
            } else {
                this.frame.style.filter = `blur(${blur}px)`
            }
            this.context.fillStyle = "black";
            this.context.fillRect(0, 0, this.element.width, this.element.height)
            this.pattern.initialize();
            return this;
        }
    ,   recover: function() {
            this.context.drawImage(this.active, 0, 0);
            this.active.style.transition = null;
            setTimeout(() => { this.active.style.opacity = 0 }, 0);
            setTimeout(() => { this.pattern.populate = true }, 500);
        }
    }
    Chain.prototype = {
        addEdge: function(marble, type) {
            const edgeValue = type + "Edge";
            this.marbles.filter(exclude => exclude[edgeValue]).forEach(exclude => {
                exclude[edgeValue] = false;
                exclude.addGaps()
            });
            marble[edgeValue] = true;
            this.dropAnchor(marble);
        }
    ,   delete: function() {
            this.display.chains.splice(this.display.chains.indexOf(this), 1);
        }
    ,   disgorge: function() {
            const liftMarbles = this.marbles.filter((marble, index) => (!index || (this.marbles[index - 1].centerY > marble.centerY)) && ((index == (this.marbles.length - 1)) || (this.marbles[index + 1].centerY > marble.centerY)) && !this.display.gaps.some(gap => ((gap.leftMarble == marble) && (gap.rightMarble && (gap.rightMarble.radius > gap.leftMarble.radius))) || ((gap.rightMarble == marble) && (gap.leftMarble && (gap.leftMarble.radius > gap.rightMarble.radius)))))
            ,   liftMarble = liftMarbles[Math.floor(Math.random() * liftMarbles.length)]
            ,   chainIndex = this.marbles.indexOf(liftMarble);
            liftMarble.left = this.marbles[chainIndex - 1] || null;
            liftMarble.right = this.marbles[chainIndex + 1] || null;
            liftMarble.disconnect();
        }
    ,   draw: function(timestamp) {
            let anchorIndex = this.marbles.indexOf(this.anchor)
            if (anchorIndex < 0) {
                this.anchor = null;
                anchorIndex = 0;
            }
            let prevMarble = null;
            this.marbles.slice(anchorIndex).forEach(marble => {
                marble.draw(timestamp, prevMarble)
                prevMarble = marble;
            })
            prevMarble = this.anchor;
            this.marbles.slice(0, anchorIndex).reverse().forEach(marble => {
                marble.draw(timestamp, prevMarble, true)
                prevMarble = marble;
            })
        }
    ,   drawOrder: function() {
            return !this.anchor ? this.marbles[0].index : this.anchor.rightEdge ? (-1 * this.anchor.index) : this.anchor.leftEdge ? this.anchor.index : this.display.floorMarbles;
        }
    ,   dropAnchor: function(anchor) {
            if (!this.marbles.includes(this.anchor)) {
                this.anchor = null;
            }
            if (this.marbles.includes(anchor)) {
                if (this.anchor && (anchor != this.anchor)) {
                    const newRight = anchor.rightEdge
                    ,   newLeft = anchor.leftEdge
                    ,   oldRight = this.anchor.rightEdge
                    ,   oldLeft = this.anchor.leftEdge
                    if ((newRight && oldLeft) || (newLeft && oldRight)) {
                        this.disgorge();
                    } else {
                        const anchors = [anchor, this.anchor].sort((a, b) => a.index - b.index)
                        if (oldRight && newRight) {
                            anchors[0].rightEdge = false;
                            this.dropAnchor(anchors[1])
                        } else if (oldLeft && newLeft) {
                            anchors[1].leftEdge = false;
                            this.dropAnchor(anchors[0])
                        } else {
                            const chain = this.display.chains.find(chain => (chain != this) && chain.marbles.includes(this.anchor) && chain.marbles.includes(anchor))
                            if (chain) {
                                const indicies = [chain.marbles.indexOf(this.anchor), chain.marbles.indexOf(anchor)].sort((a, b) => a - b);
                                chain.marbles.splice(indicies[1], 0, ...this.marbles.slice(1, -1))
                                this.delete();
                            } else if ((!oldLeft || newLeft) && (!oldRight || newRight)) {
                                this.anchor = anchor;
                            }
                        }
                    }
                } else {
                    this.anchor = anchor;
                }
            }
            this.display.chainsAltered = true;
            return this;
        }
    ,   join: function(rightChain, leftMarble = this.marbles.slice(-1)[0], rightMarble = rightChain.marbles[0]) {
            if (!this.marbles.length) {
                this.delete();
                return;
            } else if (!rightChain.marbles.length) {
                rightChain.delete();
                return;
            } else if (rightChain == this) {
                return;
            } else if (leftMarble == rightMarble) {
                const index = rightChain.marbles.indexOf(rightMarble)
                rightChain.marbles.splice(index, 1);
                this.join(rightChain, leftMarble, rightChain.marbles[index]);
                return;
            }
            const leftIndex = this.marbles.indexOf(leftMarble)
            ,   nextLeft = this.marbles[leftIndex + 1]
            ,   rightInner = nextLeft && (rightMarble.index < nextLeft.index)
            ,   rightIndex = rightChain.marbles.indexOf(rightMarble)
            ,   prevRight = rightChain.marbles[rightIndex - 1]
            ,   leftInner = prevRight && (leftMarble.index > prevRight.index)
            if (rightInner) {
                if (prevRight) {
                    this.display.chains.push(new Chain(this.display, ...rightChain.marbles.splice(0, rightIndex), rightMarble).dropAnchor(rightMarble));
                }
                rightChain.marbles.unshift(leftMarble);
                rightChain.dropAnchor(leftMarble);
            } else if (leftInner) {
                if (nextLeft) {
                    this.display.chains.push(new Chain(this.display, leftMarble, ...this.marbles.splice(leftIndex + 1)).dropAnchor(leftMarble))
                }
                this.marbles.push(rightMarble);
                this.dropAnchor(rightMarble);
            } else {
                if (nextLeft) {
                    const extraLeft = this.marbles.splice(leftIndex + 1);
                    this.display.chains.push(new Chain(this.display, leftMarble, ...extraLeft).dropAnchor(leftMarble))
                }
                if (prevRight) {
                    const extraRight = rightChain.marbles.splice(0, rightIndex);
                    this.display.chains.push(new Chain(this.display, ...extraRight, rightMarble).dropAnchor(rightMarble))
                }
                this.marbles.push(...rightChain.marbles);
                rightChain.delete();
                this.dropAnchor(rightChain.anchor);
            }
            this.display.chainsAltered = true;
        }
    ,   match: function(marble) {
            const chains = this.display.chains.filter(chain => (chain != this) && chain.marbles.includes(marble));
            if (chains.length) {
                if (this.marbles.slice(-1)[0] == marble) {
                    const match = chains.filter(chain => chain.marbles[0] == marble).sort((a, b) => b.marbles.slice(-1)[0].index - a.marbles.slice(-1)[0].index)[0]
                    if (match) {
                        this.join(match)
                        return;
                    }
                }
                if (this.marbles[0] == marble) {
                    const match = chains.filter(chain => chain.marbles.slice(-1)[0] == marble).sort((a, b) => a.marbles[0].index - b.marbles[0].index)[0]
                    if (match) { match.join(this) }
                }
            }
        }
    ,   remove: function(marble) {
            const index = this.marbles.indexOf(marble)
            if (index && (index < (this.marbles.length - 1))) {
                const rightMarbles = this.marbles.splice(index + 1)
                ,   newChain = new Chain(this.display, ...rightMarbles).dropAnchor(rightMarbles.find(marble => marble.rightEdge));
                this.display.chains.push(newChain);
                newChain.match(rightMarbles[0])
            }
            this.marbles.splice(index, 1);
            this.dropAnchor(this.marbles.find(marble => marble.leftEdge) || this.marbles.find(marble => marble.rightEdge));
            this.match(index ? this.marbles.slice(-1)[0] : this.marbles[0])
            this.display.chainsAltered = true;
        }
    ,   toString: function() {
            return "chain " + this.id + " {marbles " + this.marbles.map(marble => marble.id).toString() + "; anchor " + (this.anchor ? this.anchor.id : "-") + "}";
        }
    }
    Gap.prototype = {
        check: function() {
            if (this.leftMarble && !this.leftMarble.bottomEdge) {
                this.delete()
            } else if (this.rightMarble && !this.rightMarble.bottomEdge) {
                this.delete()
            } else if (this.leftMarble && this.rightMarble && (this.leftMarble.index >= this.rightMarble.index)) {
                const badMarble = (this.leftMarble.radius < this.rightMarble.radius) ? this.leftMarble : this.rightMarble;
                badMarble.delete();
            } else if (!this.leftMarble && (this.rightMarble.centerX < this.rightMarble.radius)) {
                this.delete();
                this.display.chains.filter(chain => chain.marbles.includes(this.rightMarble)).forEach(chain => chain.addEdge(this.rightMarble, "left"))
            } else if (!this.rightMarble && (this.leftMarble.rect.right > this.display.width)) {
                this.delete();
                this.display.chains.filter(chain => chain.marbles.includes(this.leftMarble)).forEach(chain => chain.addEdge(this.leftMarble, "right"))
            } else if (this.leftMarble && this.rightMarble && (this.leftMarble.rect.right >= this.rightMarble.rect.left) && (this.leftMarble.distance(this.rightMarble) <= 0)) {
                this.delete();
                const leftChain = this.display.chains.filter(chain => chain.marbles.includes(this.leftMarble)).sort((a, b) => a.marbles[0].index - b.marbles[0].index)[0]
                ,   rightChain = this.display.chains.filter(chain => chain.marbles.includes(this.rightMarble)).sort((a, b) => b.marbles.slice(-1)[0].index - a.marbles.slice(-1)[0].index)[0];
                leftChain.join(rightChain, this.leftMarble, this.rightMarble);
            } else if ((!this.leftMarble || (this.leftMarble.radius > 1)) && (!this.rightMarble || (this.rightMarble.radius > 1)) && this.display.marbles.slice(this.leftMarble ? (this.leftMarble.index + 1) : 0, this.rightMarble ? this.rightMarble.index : this.display.floorMarbles).some(marble => marble.radius > Math.max(this.rightMarble ? this.rightMarble.radius/4 : 0, this.leftMarble ? this.leftMarble.radius/4 : 0))) {
                this.delete();
            }
        }
    ,   delete: function() {
            this.display.gaps.splice(this.display.gaps.indexOf(this), 1);
        }
    ,   toString: function() {
            return "gap " + this.id + " {marbles " + (this.leftMarble ? this.leftMarble : "-") + "," + (this.rightMarble ? this.rightMarble : "-") + "}"
        }
    }
    Marble.prototype = {
        addGaps: function(increment = -1, edge) {
            const floorMarbles = this.display.marbles.slice(0, this.display.floorMarbles);
            let baseMarble = edge ? null : this
            ,   baseIndex = baseMarble ? baseMarble.index : (increment < 0) ? this.display.floorMarbles : -1
            ,   nextMarble = floorMarbles[baseIndex + increment]
            ,   prevMarble = null;
            do {
                const [leftMarble, rightMarble] = (increment < 0) ? [nextMarble, baseMarble] : [baseMarble, nextMarble];
                if (!this.display.gaps.find(gap => (gap.leftMarble == leftMarble) && (gap.rightMarble == rightMarble)) && !this.display.chains.find(chain => chain.marbles.includes(leftMarble) && chain.marbles.includes(rightMarble)) && (leftMarble || !this.leftEdge) && (rightMarble || !this.rightEdge)) {
                    this.display.gaps.push(new Gap(this.display, leftMarble, rightMarble));
                }
                prevMarble = nextMarble;
                nextMarble = nextMarble ? floorMarbles[nextMarble.index + increment] : null;
            } while ((nextMarble && ((nextMarble.radius/4) > prevMarble.radius)) || (prevMarble && ((this.radius/4) > prevMarble.radius)))
            if (!edge && (increment == -1)) {
                this.addGaps(1)
            }
        }
    ,   check: function(under) {
            if (this.deleting) {
                return;
            } else if ((this.centerX < this.radius) && this.right && !this.leftEdge) {
                this.drawReset = true;
                this.left = null;
                this.leftEdge = true;
            } else if ((this.centerX < this.radius) && this.left && !this.right) {
                this.angle = Math.atan2(this.centerY - this.left.centerY, this.radius - this.left.centerX)
            } else if ((this.rect.right > this.display.width) && this.left && !this.rightEdge) {
                this.drawReset = true;
                this.right = null;
                this.rightEdge = true;
            } else if ((this.rect.right > this.display.width) && this.right && !this.left) {
                this.angle = Math.atan2(this.centerY - this.right.centerY, (this.display.width - this.radius) - this.right.centerX)
            } else if (this.left && (this.left.centerX > this.centerX)) {
                this.right = this.left;
                this.rightEdge = false;
                this.left = null;
                this.angle = null;
            } else if (this.right && (this.right.centerX < this.centerX)) {
                this.left = this.right;
                this.leftEdge = false;
                this.right = null;
                this.angle = null;
            } else if (this.left && (this.left.rect.right < this.rect.left)) {
                this.left = null;
            } else if (this.right && (this.right.rect.left > this.rect.right)) {
                this.right = null;
            } else if (under) {
                const leftCloser = under.find(marble => (marble != this.left) && (marble.centerX < this.centerX) && (marble.rect.right > this.rect.left) && (marble.distance(this) < 0))
                if (leftCloser) {
                    this.drawReset = true;
                    if (this.right || !this.left || this.rightEdge || (leftCloser.centerX > this.left.centerX)) {
                        this.left = leftCloser;
                        this.leftEdge = false;
                        this.angle = null;
                    } else {
                        const [x, y] = this.xyPosition(leftCloser, this.left)
                        this.angle = Math.atan2(y - this.left.centerY, x - this.left.centerX)
                    }
                } else {
                    const rightCloser = under.find(marble => (marble != this.right) && (marble.centerX >= this.centerX) && (marble.rect.left < this.rect.right) && (marble.distance(this) < 0))
                    if (rightCloser) {
                        this.drawReset = true;
                        if (this.left || !this.right || this.leftEdge || (rightCloser.centerX < this.right.centerX)) {
                            this.right = rightCloser;
                            this.rightEdge = false;
                            this.angle = null;
                        } else {
                            const [x, y] = this.xyPosition(this.right, rightCloser);
                            this.angle = Math.atan2(y - this.right.centerY, x - this.right.centerX)
                        }
                    }
                }
            }
            if (this.angle == null) {
                if (this.left && !this.right && !this.rightEdge) {
                    this.angle = Math.atan2(this.centerY - this.left.centerY, this.centerX - this.left.centerX)
                } else if (this.right && !this.left && !this.leftEdge) {
                    this.angle = Math.atan2(this.centerY - this.right.centerY, this.centerX - this.right.centerX)
                }
            } else if (this.left && this.right) {
                this.angle = null;
            } else if (this.angle > 0) {
                this.left = this.angle = null;
            } else if (this.angle < (-1 * Math.PI)) {
                this.right = this.angle = null
            }
            if (under) {
                under.filter(marble => marble.rect.top > this.rect.bottom).forEach(marble => under.splice(under.indexOf(marble), 1))
                under.push(this);
            }
        }
    ,   delete: function() {
            if (this.deleting) {
                this.disconnect();
                this.display.marbles.splice(this.display.marbles.indexOf(this), 1);
                this.frame.parentNode.removeChild(this.frame);
            } else {
                this.deleting = true;
                this.frame.style.opacity = 0;
            }
        }
    ,   disconnect: function() {
            if (this.bottomEdge) {
                this.bottomEdge = false;
                const floorIndex = this.display.marbles.indexOf(this);
                this.display.chains.filter(chain => chain.marbles.includes(this)).forEach(chain => chain.remove(this));
                this.display.reorderMarbles();
                const floorMarbles = this.display.marbles.slice(0, this.display.floorMarbles)
                if (floorIndex) {
                    floorMarbles[floorIndex - 1].addGaps()
                } else {
                    floorMarbles[0].addGaps(1, true)
                }
                if (floorIndex < floorMarbles.length) {
                    floorMarbles[floorIndex].addGaps()
                } else {
                    floorMarbles[floorMarbles.length - 1].addGaps(-1, true)
                }
            }
            if (this.deleting) {
                this.display.marbles.forEach(marble => {
                    if (marble.left == this) {
                        marble.left = null
                        marble.check();
                    }
                    if (marble.right == this) {
                        marble.right = null
                        marble.check();
                    }
                })
            }
        }
    ,   distance: function(marble) {
            return Math.sqrt(Math.pow(this.centerX - marble.centerX, 2) + Math.pow(this.centerY - marble.centerY, 2)) - (marble.radius + this.radius);
        }
    ,   draw: function(timestamp, prevMarble, reverse) {
            if (!this.deleting && !this.drawn(timestamp)) {
                this.position();
                this.moving = false;
                if (this.bottomEdge) {
                    if (prevMarble && (this.scaling || prevMarble.scaling || prevMarble.moving)) {
                        const shift = (reverse ? -1 : 1) * Math.sqrt(Math.max(0, Math.pow(prevMarble.radius + this.radius, 2) - Math.pow(prevMarble.radius - this.radius, 2)));
                        this.moveXY(prevMarble.centerX + shift);
                    } else if (this.scaling && (this.leftEdge || this.rightEdge)) {
                        this.moveXY();
                    }
                } else {
                    if (this.left && this.right) {
                        if (this.drawReset || this.scaling || this.left.moving || this.right.moving) {
                            this.moveXY(...this.xyPosition(this.left, this.right))
                        }
                    } else if (this.left) {
                        if (this.rightEdge) {
                            if (this.drawReset || this.scaling || this.left.moving) {
                                this.moveXY(undefined, this.left.centerY - this.yDistance(this.left, this.display.width - this.radius))
                            }
                        } else {
                            const totalRadius = this.radius + this.left.radius
                            ,   fallIncrement = Math.abs(fallVelocityMax * Math.sin(this.angle + (Math.PI/2)))
                            ,   angleIncrement = Math.acos(this.left.radius/(this.left.radius + fallIncrement));
                            this.angle += angleIncrement;
                            this.moveXY(this.left.centerX + (totalRadius * Math.cos(this.angle)), this.left.centerY + (totalRadius * Math.sin(this.angle)));
                        }
                    } else if (this.right) {
                        if (this.leftEdge) {
                            if (this.drawReset || this.scaling || this.right.moving) {
                                this.moveXY(undefined, this.right.centerY - this.yDistance(this.right, this.radius))
                            }
                        } else {
                            const totalRadius = this.radius + this.right.radius
                            ,   fallIncrement = Math.abs(fallVelocityMax * Math.sin(this.angle + (Math.PI/2)))
                            ,   angleIncrement = Math.acos(this.right.radius/(this.right.radius + fallIncrement));
                            this.angle -= angleIncrement;
                            this.moveXY(this.right.centerX + (totalRadius * Math.cos(this.angle)), this.right.centerY + (totalRadius * Math.sin(this.angle)));
                        }
                    } else {
                        this.moveXY(this.centerX, this.centerY + 5);
                    }
                }
                this.lastDrawn = timestamp;
                if (this.rect.bottom < 0) {
                    this.delete();
                }
            }
            return this;
        }
    ,   drawOrder: function() {
            return this.bottomEdge ? this.centerX : (this.display.width + Math.max(0, this.display.height - this.centerY));
        }
    ,   drawn: function(timestamp) {
            return this.lastDrawn && !(this.lastDrawn < timestamp)
        }
    ,   initialize: function() {
            this.bottomEdge = true;
            this.extremeCount = 0;
            const width = this.display.minRadius + ((this.display.maxRadius - this.display.minRadius) * Math.random());
            this.halfWidth = width/2;
            this.frame.style.setProperty("--shapesWidth", `${width}px`);
            this.element.width = this.element.height = width;
            this.moveXY(this.display.width * Math.random());
            this.hue = 360 * Math.random();
            this.saturation = 50 + (50 * Math.random());
            this.context.textBaseline = "middle";
            this.context.textAlign = "center";
            for (let i = 0; i < 8; i++) {
                const character = String.fromCharCode(0x3400 + Math.floor(Math.random() * 0x19b5))
                ,   color = `hsla(${this.hue}, ${100 * Math.random()}%, ${100 * Math.random()}%, 0.5)`
                ,   fontSize = width * 3 * (1 + Math.random())
                ,   x = width * Math.random()
                ,   y = width * Math.random()
                ,   angle = 2 * Math.PI * Math.random();
                this.context.setTransform(1,0,0,1,0,0);
                this.context.translate(x, y);
                this.context.font = fontSize + "px Times New Roman, Times, serif";
                this.context.rotate(angle);
                if (Math.random() < 0.5) {
                    this.context.fillStyle = color;
                    this.context.fillText(character, 0, 0);
                } else {
                    this.context.strokeStyle = color;
                    this.context.strokeText(character, 0, 0);
                }
            }
            this.context.setTransform(1,0,0,1,0,0);
            const gradient = this.context.createRadialGradient(this.halfWidth, this.halfWidth, 2 * this.halfWidth/3, this.halfWidth, this.halfWidth, this.halfWidth);
            gradient.addColorStop(0, "transparent");
            gradient.addColorStop(1, "black");
            this.context.globalCompositeOperation = "destination-out";
            this.context.fillStyle = gradient;
            this.context.fillRect(0, 0, width, width);
            this.context.globalCompositeOperation = "destination-atop";
            this.context.fillStyle = `hsl(${this.hue}, ${this.saturation}%, 80%)`;
            this.context.fillRect(0, 0, width, width);
            this.context.globalCompositeOperation = "source-over";
            const shadow = this.context.createRadialGradient(this.halfWidth, 1.2 * width, 0, this.halfWidth, 1.2 * width, 1.2 * width);
            shadow.addColorStop(0, `hsla(${this.hue}, ${this.saturation}%, 85%, 0.2)`);
            shadow.addColorStop(0.1, `hsla(${this.hue}, ${this.saturation}%, 70%, 0.2)`);
            shadow.addColorStop(0.7, `hsla(${this.hue}, ${this.saturation}%, 30%, 0.7)`);
            shadow.addColorStop(1, `hsla(${this.hue}, ${this.saturation}%, 5%, 1)`);
            this.context.fillStyle = shadow;
            this.context.fillRect(0, 0, width, width);
            return this;
        }
    ,   moveXY: function(x = this.centerX, y = this.centerY) {
            this.moving = true;
            this.drawReset = false;
            const xShifted = this.leftEdge ? (this.radius - this.halfWidth) : this.rightEdge ? (this.display.width - (this.halfWidth + this.radius)) : (x - this.halfWidth)
            ,   yShifted = this.bottomEdge ? 0 : Math.min(0, y + this.halfWidth - this.display.height);
            this.frame.style.transform = `translate(${xShifted}px, ${yShifted}px)`;
            this.position();
            return this;
        }
    ,   position: function() {
            this.oldCenterX = this.centerX;
            this.oldCenterY = this.centerY;
            this.rect = this.element.getBoundingClientRect();
            this.centerX = (this.rect.left + this.rect.right)/2;
            this.centerY = (this.rect.top + this.rect.bottom)/2;
            this.radius = this.centerX - this.rect.left;
            const limit = Math.max(40, this.radius, (this.left ? this.left.radius : 0), (this.right ? this.right.radius : 0))/2;
            if ((Math.abs(this.oldCenterX - this.centerX) > limit) || (Math.abs(this.oldCenterY - this.centerY) > limit)) {
                this.extremeCount += 1;
                if (this.extremeCount > maxExtreme) {
                    this.delete();
                }
                const timestamp = Date.now();
                if (((timestamp - this.display.recentExtremes[0]) < 100) && (this.display.recentExtremes.length > maxExtreme)) {
                    this.display.delete();
                } else {
                    this.display.recentExtremes.splice(maxExtreme)
                    this.display.recentExtremes.push(timestamp);
                }
            }
            return this;
        }
    ,   scale: function(initialize = true) {
            if (initialize) {
                this.scaling = true;
                const duration = 5 + (5 * Math.random());
                this.element.style.transition = `transform ${duration}s ease-in-out`;
                setTimeout(() => {
                    this.element.classList.remove("shrunk");
                }, 0);
            } else {
                this.scaling = false;
            }
            return this;
        }
    ,   splat: function() {
            this.display.splatCircle.width = this.display.splatCircle.height = 2 * this.element.clientWidth;
            this.display.splatContext.beginPath();
            this.display.splatContext.arc(this.element.clientWidth, this.element.clientWidth, this.element.clientWidth, 0, 2 * Math.PI);
            this.display.splatContext.closePath();
            this.display.splatContext.fillStyle = `hsla(${this.hue}, ${this.saturation}%, 50%, 0.3)`;
            this.display.splatContext.fill();
            this.display.marbles.filter(marble => (marble != this) && (marble.distance(this) < this.radius)).forEach(marble => {
                const x = (this.centerX - marble.centerX) + ((marble.element.clientWidth - this.display.splatCircle.width)/2)
                ,   y = (this.centerY - marble.centerY) + ((marble.element.clientWidth - this.display.splatCircle.width)/2)
                marble.context.drawImage(this.display.splatCircle, x, y);
            })
            return this;
        }
    ,   toString: function() {
            return "marble " + this.id + " { center x/y " + this.centerX + "/" + this.centerY + ", index " + this.index + ", radius " + this.radius + ", left " + (this.left ? this.left.id : "-") + ", right " + (this.right ? this.right.id : "-") + " } ";
        }
    ,   xyPosition: function(...marbles) {
            const baseAngle = Math.atan2(marbles[1].centerY - marbles[0].centerY, marbles[1].centerX - marbles[0].centerX)
            ,   a = Math.sqrt(Math.pow(marbles[1].centerY - marbles[0].centerY, 2) + Math.pow(marbles[1].centerX - marbles[0].centerX, 2))
            ,   b = marbles[0].radius + this.radius
            ,   c = marbles[1].radius + this.radius
            ,   d = (Math.pow(a, 2) + Math.pow(b, 2) - Math.pow(c, 2))/(2 * a * b)
            ,   cAngle = baseAngle - Math.acos(Math.min(1, Math.max(-1, d)));
            return [marbles[0].centerX + (b * Math.cos(cAngle)), marbles[0].centerY + (b * Math.sin(cAngle))];
        }
    ,   yDistance: function(marble, x) {
            return Math.sqrt(Math.max(0, Math.pow(this.radius + marble.radius, 2) - Math.pow(x - marble.centerX, 2)));
        }
    }
    Pattern.prototype = {
        addDesign: function() {
            const character = String.fromCharCode(0x3400 + Math.floor(Math.random() * 0x19b5))
            ,   color = `hsl(${360 * Math.random()}, ${50 * Math.random()}%, ${((Math.random() < 0.5) ? 10 : 50) + (20 * Math.random())}%)`
            ,   fontSize = this.element.width * 2 * (1 + Math.random())
            ,   x = (this.element.width - (fontSize/2)) + ((fontSize - this.element.width) * Math.random()/2)
            ,   y = (this.element.height - (fontSize/2)) + ((fontSize - this.element.height) * Math.random()/2)
            ,   angle = 2 * Math.PI * Math.random();
            this.context.setTransform(1,0,0,1,0,0);
            this.context.font = fontSize + "px Times New Roman, Times, serif";
            this.context.translate(x, y);
            this.context.rotate(angle);
            if (Math.random() < 0.5) {
                this.context.fillStyle = color;
                this.context.fillText(character, 0, 0);
            } else {
                this.context.strokeStyle = color;
                this.context.strokeText(character, 0, 0);
            }
            this.background.draw();
        }
    ,   initialize: function() {
            const width = this.background.display.minRadius + ((this.background.display.maxRadius - this.background.display.minRadius) * Math.random())
            ,   minLineWidth = 3
            ,   maxLineWidth = width/10;
            this.element.style.setProperty("--patternWidth", `${width}px`);
            this.element.width = this.element.height = this.element.clientWidth;
            this.context.textBaseline = "middle";
            this.context.textAlign = "center";
            this.context.lineWidth = minLineWidth + ((maxLineWidth - minLineWidth) * Math.random());
            this.interval = 200 + (200 * Math.random());
            setTimeout(() => { this.populate = true }, 5000);
            return this;
        }
    }
    return new Display();
}
function initialize() {
    displayRoot.addEventListener("click", function(e) {
        const dataId = e.target.getAttribute("data-id")
        ,   shape = e.target.classList.contains("shapes") ? display.marbles.find(marble => marble.id == dataId) : null;
        if (shape) {
            shape.splat().delete();
        }
    }, false);
    displayRoot.addEventListener("transitionend", function(e) {
        const dataId = e.target.getAttribute("data-id")
        ,   shape = e.target.classList.contains("shapes") ? display.marbles.find(marble => marble.id == dataId) : null
        ,   frame = e.target.classList.contains("shapeFrames") ? display.marbles.find(marble => marble.id == dataId) : null;
        if (shape && (e.propertyName == "transform") && shape.scaling) {
            shape.scale(false);
        } else if (frame && (e.propertyName == "opacity") && !parseInt(e.target.style.opacity)) {
            frame.delete();
        } else if ((e.target.id == "activeBackground") && (e.propertyName == "opacity") && parseInt(e.target.style.opacity)) {
            display.background.recover();
        }
    }, false);
}
function animationLoop(ts) {
    const interval = ts - priorTimestamp;
    if (interval < 100) {
        if (display) {
            if (display.background.pattern.populate) {
                display.background.pattern.populate = false;
                display.background.pattern.addDesign();
            }
            if (display.populate) {
                display.populate = false;
                display.addMarble();
                setTimeout(() => { display.populate = true }, 1000 + (2000 * Math.random()));
            }
            display.draw(ts);
        } else {
            display = createDisplay().initialize();
        }
    }
    priorTimestamp = ts;
	animationId = window.requestAnimationFrame(animationLoop);
}
initialize();
})();
