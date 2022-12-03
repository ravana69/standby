(function() {
"use strict";

var canvasRoot = document.querySelector(".canvas")
,   animationId = null
,   priorTimestamp = 0
,   display = null

;
window.onload = function() {
    display = createDisplay();
    display.freshPopulace().position({}).populate({rate: 1000, population: 1, icon: display.firstIcon, setCurrent: true, intro: true, fillWidth: true, noLegend: true});
    animationId = window.requestAnimationFrame(animationLoop);
}
window.onresize = function() {
    display.resize();
}
function createDisplay() {
    var populaceRoot = document.querySelector("#populaceRoot")
    ,   chartGroupRoot = document.querySelector("#chartGroupRoot")
    ,   yearRoot = document.querySelector("#yearRoot")
    ,   legendRoot = document.querySelector("#legendRoot")
    ,   patternRoot = document.querySelector("#patternRoot")
    ,   iconScaleFactor = 1000
    ,   iconMinSize = 4
    ,   chartBorderSize = 1
    ,   standardHues = [15, 40, 75, 150, 180, 210, 285, 315]
    ,   worldPopulation = 0
    ,   minFontSize = 18
    ,   Display = function() {
            var hueIndex = Math.floor(standardHues.length * Math.random())
            ,   hue = standardHues[hueIndex]
            ,   topColor = "hsl(" + hue + ",100%,15%)"
            ,   bottomColor = "hsl(" + hue + ",100%,5%)"
            ,   hueIncrement = Math.ceil((standardHues.length - 2) * Math.random())
            ,   hueRange = 2 + Math.floor(3 * Math.random())
            ,   startHue = standardHues[(hueIndex + hueIncrement) % standardHues.length]
            ,   endHue = standardHues[(hueIndex + hueIncrement + hueRange) % standardHues.length]
            ,   hues = 15 + Math.floor(10 * Math.random())
            ;
            this.isDisplay = true;
            this.element = canvasRoot;
            this.height = document.documentElement.clientHeight;
            this.width = document.documentElement.clientWidth;
            this.area = this.height * this.width;
            this.charts = [];
            this.backgroundHue = hue;
            endHue += (endHue < startHue) ? 360 : 0;
            this.hue = [];
            for (var i = 0; i < hues; i++) {
                this.hue.push(startHue + (i * Math.abs(endHue - startHue)/hues));
            }
            this.element.style.background = "linear-gradient(" + topColor + "," + bottomColor + ")";
            this.pattern = patternRoot;
            this.patternContext = this.pattern.getContext('2d');
            for (var i = 0; i < 3; i++) { this.lastIcon = new Icon(this); }
            this.defaultIcon = this.lastIcon.prevIcon;
            this.currentYear = new Year(this);
            this.populaces = [];
            this.firstChild = this.lastChild = null;
            this.data = importData(this);
            this.currentPopulace = null;
            this.initialize();
            this.element.style.opacity = 1;
            this.withholdActions = false;
            this.selectYear = null;
            this.introGrowthFactor = 2;
            this.source = document.querySelector("#source");
        }
    ,   Action = function(populace, act, object, parameters) {
            this.populace = populace;
            this.act = act;
            this.object = object;
            this.parameters = parameters || {};
            this.created = Date.now();
            this.delay = this.parameters.delay || 0;
            if (this.populace.nextLoopAction) {
                this.prevAction = this.populace.nextLoopAction.prevAction;
                if (this.prevAction) {
                    this.prevAction.nextAction = this;
                } else {
                    this.populace.firstAction = this;
                }
                this.nextAction = this.populace.nextLoopAction;
                this.populace.nextLoopAction.prevAction = this;
            } else {
                this.prevAction = this.populace.lastAction;
                if (this.prevAction) {
                    this.prevAction.nextAction = this;
                } else {
                    this.populace.firstAction = this;
                }
                this.nextAction = null;
                this.populace.lastAction = this;
            }
        }
    ,   Chart = function(populace, otherChart) {
            this.isChart = true;
            this.populace = populace;
            this.id = populace.display.charts.length;
            this.populace.display.charts.push(this);
            if (otherChart) {
                this.group = otherChart.group;
                this.element = this.group.element.appendChild(otherChart.element.cloneNode(true));
            } else {
                this.group = new ChartGroup(this.populace);
                this.element = this.group.element.firstElementChild;
            }
            this.element.id = "chart" + this.id;
            this.element.setAttribute("data-id",this.id);
            this.context = this.element.firstElementChild.getContext('2d');
            this.otherChart = otherChart || new Chart(populace, this);
            this.legend = new Legend(this);
            this.initialize();
        }
    ,   ChartGroup = function(populace) {
            this.populace = populace;
            this.element = this.populace.element.appendChild(chartGroupRoot.cloneNode(true));
            this.x = this.y = 0;
        }
    ,   Icon = function(display) {
            this.display = display;
            this.id = display.lastIcon ? display.lastIcon.id + 1 : 0;
            this.scale = Math.pow(iconScaleFactor, this.id);
            this.element = document.querySelector("#pop" + this.id);
            this.width = this.element.clientWidth;
            this.height = this.element.clientHeight;
            this.ratio = this.width/this.height;
            this.prevIcon = display.lastIcon || null;
            this.nextIcon = null;
            this.minWidth = null;
            if (this.prevIcon) {
                this.flex = true;
                this.prevIcon.nextIcon = this;
                if (this.prevIcon.ratio < 1) {
                    this.prevIcon.minWidth = iconMinSize;
                } else {
                    this.prevIcon.minWidth = Math.round(iconMinSize * this.prevIcon.ratio);
                }
                this.maxWidth = Math.ceil(Math.sqrt(iconScaleFactor * Math.round(this.prevIcon.minWidth/this.prevIcon.ratio) * this.prevIcon.minWidth * this.ratio));
                this.pattern = patternRoot.parentNode.appendChild(patternRoot.cloneNode(false));
                this.patternContext = this.pattern.getContext('2d');
                this.pattern.width = this.maxWidth;
                this.pattern.height = Math.round(this.pattern.width/this.ratio);
                this.patternContext.drawImage(this.element, 0, 0, this.pattern.width, this.pattern.height);
                display.pattern.width = this.prevIcon.minWidth + 2;
                display.pattern.height = Math.round(this.prevIcon.minWidth/this.prevIcon.ratio) + 2;
                display.patternContext.drawImage(this.prevIcon.element, 0, 0, display.pattern.width, display.pattern.height);
                this.patternContext.globalCompositeOperation = "source-in";
                this.patternContext.fillStyle = this.patternContext.createPattern(display.pattern, "repeat");
                this.patternContext.fillRect(0, 0, this.pattern.width, this.pattern.height);
            } else {
                this.display.firstIcon = this;
                this.flex = false;
                this.maxWidth = null;
                this.patternContext = this.pattern = null;
            }
            display.lastIcon = this;
        }
    ,   Legend = function(chart) {
            this.chart = chart;
            this.id = this.chart.id;
            this.element = this.chart.populace.element.appendChild(legendRoot.cloneNode(true));
            this.element.id = "legend" + this.id;
            this.element.setAttribute("data-id",this.id);
            this.context = this.element.getContext('2d');
            this.initialize();
        }
    ,   Populace = function(display) {
            this.display = display;
            this.id = display.populaces.length;
            display.populaces.push(this);
            this.active = false;
            this.element = populaceRoot.parentNode.appendChild(populaceRoot.cloneNode(true));
            this.element.id = "populace" + this.id;
            this.element.setAttribute("data-id",this.id);
            this.currentChart = new Chart(this);
            this.initialize();
        }
    ,   Year = function(display, otherYear) {
            this.display = display;
            if (otherYear) {
                this.id = 1;
                this.element = otherYear.element.parentNode.appendChild(otherYear.element.cloneNode(true));
                this.element.id = "year" + this.id;
                this.otherYear = otherYear;
            } else {
                this.id = 0;
                this.element = document.querySelector("#yearRoot");
                this.otherYear = new Year(this.display, this);
            }
            this.topElement = this.element.firstElementChild;
            this.topElement.id = "yearTop" + this.id;
            this.bottomElement = this.element.lastElementChild;
            this.bottomElement.id = "yearBottom" + this.id;
            this.element.style.height = Math.min(this.element.clientHeight, 60) + "px";
            this.element.style.top = this.element.clientHeight/2 + "px";
            this.topElement.style.fontSize = this.element.clientHeight + "px";
            this.display.patternContext.font = this.topElement.style.fontSize + " sans-serif";
            this.element.style.width = Math.round(this.display.patternContext.measureText("9999").width) + "px";
            this.element.style.left = this.element.clientWidth/2 + "px";
            this.topElement.style.color = "hsl(0,100%,100%)";
        }
    ;
    Action.prototype = {
        toString: function() {
            return this.act + (this.object.element ? (" on " + this.object.element.id) : "") + (this.parameters ? (" using " + JSON.stringify(this.parameters)) : "") + " created " + this.created + " delay " + this.delay;
        }
    ,   toJSON: function() { return this.act; }
    }
    Chart.prototype = {
        draw: function(parameters) {
            var population = parameters.population || (this.populace.stat ? this.populace.stat.populations[this.populace.display.selectYear.column] : 1)
            ,   icon = parameters.icon || this.otherChart.icon || this.populace.display.defaultIcon
            ,   scaledPopulation = 0
            ,   extraIcons = 0
            ,   populaceWidth = this.populace.width - (2 * chartBorderSize)
            ,   populaceHeight = this.populace.height - (2 * chartBorderSize)
            ,   populaceArea = populaceWidth * populaceHeight
            ,   populaceRatio = populaceWidth/populaceHeight
            ,   ratchet = parameters.icon ? "up" : null
            ,   fillWidth = parameters.fillWidth || false
            ,   roundUp = parameters.roundUp || false
            ;
            this.icon = null;
            do {
                scaledPopulation = Math.ceil(population/icon.scale)
                if (fillWidth) {
                    this.iconWidth = populaceWidth;
                    this.iconHeight = Math.round(this.iconWidth/icon.ratio);
                } else if (this.populace.ratio > icon.ratio) { // finer control over columns
                    this.iconHeight = Math.round(Math.min(populaceHeight, Math.sqrt(populaceArea/(scaledPopulation * icon.ratio))));
                    this.iconWidth = Math.round(this.iconHeight * icon.ratio);
                } else { // finer control over rows
                    this.iconWidth = Math.round(Math.min(populaceWidth, Math.sqrt((populaceArea * icon.ratio)/scaledPopulation)));
                    this.iconHeight = Math.round(this.iconWidth/icon.ratio);
                }
                this.columns = Math.min(scaledPopulation, Math.round(populaceWidth/this.iconWidth));
                this.rows = Math.ceil(scaledPopulation/this.columns);
                if (icon.nextIcon && (!this.iconHeight || (this.iconWidth < icon.minWidth)) && (ratchet != "down")) {
                    icon = icon.nextIcon;
                    ratchet = "up";
                } else if (icon.prevIcon && (this.iconWidth > icon.maxWidth) && (ratchet != "up")) {
                    icon = icon.prevIcon;
                    ratchet = "down";
                } else {
                    this.icon = icon;
                }
            } while (!this.icon)
            if (!parameters.icon && this.otherChart.icon && (this.icon.id != this.otherChart.icon.id)) {
                return false;
            } else if (!this.iconWidth || !this.iconHeight) {
                return false;
            }
            this.width = this.columns * this.iconWidth;
            this.height = this.rows * this.iconHeight;
            if (fillWidth) {
                this.scaleX = this.scaleY = 1;
            } else if (this.icon.flex) {
                this.scaleX = populaceWidth/this.width;
                this.scaleY = populaceHeight/this.height;
            } else {
                this.scaleX = this.scaleY = Math.min(populaceWidth/this.width, populaceHeight/this.height);
            }
            this.actualCount = this.rows * this.columns * icon.scale;
            if (roundUp) {
                this.population = this.actualCount;
            } else {
                this.population = population;
            }
            this.toSparkleId = null;
            extraIcons = (this.actualCount - this.population)/icon.scale;
            this.x = Math.round((this.populace.width - (this.scaleX * this.width))/2);
            this.y = fillWidth ? 0 : Math.round((this.populace.height - (this.scaleY * this.height))/2);
            this.centerX = Math.round((this.iconWidth * (Math.ceil(this.columns/2) - 1)) + (this.iconWidth/2));
            this.centerY = Math.round(this.iconHeight/2);
            this.element.style.transformOrigin = this.centerX + "px " + this.centerY + "px";
            this.context.canvas.width = this.width;
            this.element.style.width = this.width + "px";
            this.context.canvas.height = this.height;
            this.element.style.height = this.height + "px";
            this.populace.display.pattern.width = this.iconWidth;
            this.populace.display.pattern.height = this.iconHeight;
            this.populace.display.patternContext.globalCompositeOperation = "source-over";
            this.populace.display.patternContext.globalAlpha = 1;
            if (this.icon.pattern && (this.iconWidth > this.icon.maxWidth/3)) {
                this.populace.display.patternContext.drawImage(this.icon.pattern, 0, 0, this.iconWidth, this.iconHeight);
            } else {
                this.populace.display.patternContext.drawImage(this.icon.element, 0, 0, this.iconWidth, this.iconHeight);
            }
            this.populace.display.patternContext.globalCompositeOperation = "source-in";
            this.populace.display.patternContext.fillStyle = "hsla(" + this.populace.hue + ",100%,75%,0.5)";
            this.populace.display.patternContext.fillRect(0, 0, this.iconWidth, this.iconHeight);
            this.context.globalCompositeOperation = "source-over";
            this.context.fillStyle = this.context.createPattern(this.populace.display.pattern, "repeat");
            this.context.clearRect(0, 0, this.element.clientWidth, this.element.clientHeight);
            this.context.fillRect(0, 0, this.width, this.height);
            this.context.clearRect(this.width - (extraIcons * this.iconWidth), this.iconHeight * (this.rows - 1), extraIcons * this.iconWidth, this.iconHeight);
            if (this.icon.flex && (this.rows == 1)) {
                this.scaleX = populaceWidth/(this.width - (extraIcons * this.iconWidth));
            }
            return true;
        }
    ,   endTransition: function() {
            if (this.activate && !this.populace.deactivating) {
                this.active = true;
                this.otherChart.active = false;
                this.populace.currentChart = this;
                if (!this.populace.display.introGrowthFactor && !this.toSparkleId) {
                    // console.log(Date.now() + ": initial sparkle for " + this.element.id);
                    this.sparkle();
                }
            }
            this.transitioning = this.activate = false;
        }
    ,   initialize: function(parameters) {
            this.active = false;
            this.x = this.y = this.scaleX = this.scaleY = this.centerX = this.centerY = 0;
            this.columns = this.rows = this.width = this.height = 0;
            this.icon = null;
            this.iconWidth = this.iconHeight = 0;
            this.transitioning = this.activate = false;
            this.lastTransition = this.transitionTimeout = null;
            this.transformReset = null;
            if (this.otherChart.activate) {
                // console.log(Date.now() + "!!! chart" + this.otherChart.id + " activating while populace deactivating");
            }
            this.element.removeAttribute("style");
            clearTimeout(this.toSparkleId);
        }
    ,   setTransition: function(parameters) {
            var rate = parameters.rate || 0
            ,   deactivating = parameters.deactivate || false
            ,   currentOpacity = parseInt(window.getComputedStyle(this.element).getPropertyValue("opacity")) || 0
            ,   opacity = deactivating ? 0 : ((parameters.opacity !== undefined) ? Math.round(parameters.opacity) : currentOpacity)
            ,   opacityChanging = (opacity != currentOpacity)
            ,   opacityDelay = opacityChanging ? (parameters.opacityDelay || 0) : 0
            ,   noTransform = parameters.noTransform || false
            ,   transformMatch = noTransform ? null : (parameters.populationMatch || parameters.sizeMatch || null)
            ,   transformReset = noTransform ? false : (!transformMatch && !deactivating)
            ,   transforming = transformMatch || (transformReset && (this.transformReset !== true))
            ,   transformDelay = transforming ? (parameters.transformDelay || 0) : 0
            ,   transformEasing = parameters.transformEasing || "ease-out"
            ,   opacityEasing = parameters.opacityEasing || transformEasing
            ,   noLegend = parameters.noLegend || false
            ;
            if (opacity && !deactivating) {
                this.activate = true;
            }
            this.lastTransition = this.transitionTimeout = null;
            if (rate && ((currentOpacity && transforming) || opacityChanging)) {
                parameters.transitioning = true;
                this.transitionTimeout = Date.now() + (1.1 * (Math.max(opacityDelay, transformDelay) + rate));
            }
            this.element.style.transition = "opacity " + rate + "ms " + opacityEasing + " " + opacityDelay + "ms, transform " + rate + "ms " + transformEasing + " " + transformDelay + "ms";
            this.group.element.style.transition = "transform " + rate + "ms " + transformEasing + " " + transformDelay + "ms";
            if (opacityChanging || !noLegend) {
                parameters.opacity = opacity;
            } else {
                delete parameters.opacity;
            }
            if (opacityChanging || transforming || deactivating) {
                parameters.opacityChanging = opacityChanging;
                parameters.transforming = transforming;
                this.populace.act("transform", this, parameters);
            }
        }
    ,   simplePopulation: function() {
            var simpleText = null
            ,   extension = null
            ;
            if (this.population >= 1000000000) {
                simpleText = (this.population/1000000000).toPrecision(3)
                extension = " billion"
            } else if (this.population >= 1000000) {
                simpleText = (this.population/1000000).toPrecision(3)
                extension = " million"
            } else {
                simpleText = this.population
                extension = ""
            }
            return simpleText.toString().replace(/\.00$|\.0$/,"").toString() + extension
        }
    ,   sparkle: function() {
            var x = Math.floor(this.columns * Math.random()) * this.iconWidth
            ,   y = Math.floor(this.rows * Math.random()) * this.iconHeight
            ,   timeout = Math.min(100000, 100000 * (this.icon.scale/this.population) * this.populace.display.area/this.populace.area)
            ;
            this.context.globalCompositeOperation = "source-atop";
            this.context.fillStyle = "hsla(" + this.populace.hue + ",100%," + (50 + (50 * Math.random())) + "%,0.25)";
            this.context.fillRect(x, y, this.iconWidth, this.iconHeight);
            (function(chart) {
                chart.toSparkleId = setTimeout(function() {
                    chart.sparkle();
                }, timeout);
            })(this);
        }
    ,   stillTransitioning: function() {
            return this.transitioning || this.legend.transitioning;
        }
    ,   toJSON: function() { return this.element.id; }
    ,   transform: function(parameters) {
            var x = 0
            ,   y = 0
            ,   scaleX = 0
            ,   scaleY = 0
            ,   transformMatch = parameters.populationMatch || parameters.sizeMatch || null
            ,   noLegend = parameters.noLegend || false
            ;
            this.transitioning = parameters.transitioning || false;
            if (parameters.transforming) {
                if (transformMatch) {
                    if (transformMatch.populace.id == this.populace.id) {
                        x = transformMatch.x + transformMatch.centerX - this.centerX;
                        y = transformMatch.y + transformMatch.centerY - this.centerY;
                        this.group.x = Math.round(transformMatch.centerX * (transformMatch.scaleX - 1));
                        this.group.y = Math.round(transformMatch.centerY * (transformMatch.scaleY - 1));
                        scaleX = transformMatch.scaleX * transformMatch.iconWidth/this.iconWidth;
                        scaleY = transformMatch.scaleY * transformMatch.iconHeight/this.iconHeight;
                    } else {
                        this.group.x = this.group.y = 0;
                        x = transformMatch.populace.absoluteLeft() + transformMatch.x - this.populace.absoluteLeft();
                        y = transformMatch.populace.absoluteTop() + transformMatch.y - this.populace.absoluteTop();
                        if (parameters.sizeMatch) {
                            scaleX =  parameters.sizeMatch.scaleX * parameters.sizeMatch.width/this.width;
                            scaleY = parameters.sizeMatch.scaleY * parameters.sizeMatch.height/this.height;
                            x += this.centerX * (scaleX - 1);
                            y += this.centerY * (scaleY - 1);
                        } else if (parameters.populationMatch) {
                            scaleX = Math.sqrt(parameters.populationMatch.width * this.height * this.actualCount/(parameters.populationMatch.height * this.width * parameters.populationMatch.actualCount));
                            scaleY = Math.sqrt(parameters.populationMatch.height * this.width * this.actualCount/(parameters.populationMatch.width * this.height * parameters.populationMatch.actualCount));
                        }
                    }
                    this.transformReset = false;
                } else {
                    x = this.x
                    y = this.y
                    scaleX = this.scaleX
                    scaleY = this.scaleY
                    this.group.x = Math.round(this.centerX * (this.scaleX - 1));
                    this.group.y = Math.round(this.centerY * (this.scaleY - 1));
                    this.transformReset = true;
                }
                this.element.style.transform = "translateX(" + x + "px) translateY(" + y + "px) scale(" + scaleX + ", " + scaleY + ")";
                this.group.element.style.transform = "translateX(" + this.group.x + "px) translateY(" + this.group.y + "px)";
            }
            if (parameters.opacityChanging) {
                this.element.style.opacity = parameters.opacity;
            }
            if (!noLegend) {
                if (parameters.opacity && !this.legend.active) {
                    this.legend.draw({});
                } else if (!parameters.opacity && this.legend.active) {
                    this.legend.hide();
                }
            }
            if (parameters.deactivate) {
                this.populace.act("initialize", this);
                this.populace.act("initialize", this.legend);
            }
        }
    }
    Display.prototype = {
        allowActions: function() {
            this.withholdActions = false;
        }
    ,   drawYear: function(parameters) {
            if (parameters.increment !== undefined) {
                this.data.selectYear = this.data.years[this.data.selectYear.column + parameters.increment];
            } else {
                this.data.selectYear = this.data.years[Math.floor(this.data.years.length * Math.random())];
            }
            this.currentYear.element.classList.remove("yearVisible");
            this.currentYear = this.currentYear.otherYear;
            this.currentYear.topElement.textContent = this.data.selectYear.name;
            this.currentYear.element.classList.add("yearVisible");
            if (this.data.selectYear.column < (this.data.years.length - 1)) {
                this.currentYear.topElement.classList.add("allowIncrement");
            } else {
            this.currentYear.topElement.classList.remove("allowIncrement");
            }
            if (this.data.selectYear.column) {
                this.currentYear.bottomElement.classList.add("allowDecrement");
            } else {
                this.currentYear.bottomElement.classList.remove("allowDecrement");
            }
            this.currentYear.otherYear.topElement.classList.remove("allowIncrement");
            this.currentYear.otherYear.bottomElement.classList.remove("allowDecrement");
        }
    ,   drawLocation: function() {
            var nextPopulace = this.currentPopulace
            ,   displayPopulaces = []
            ;
            while (nextPopulace && !nextPopulace.isDisplay) {
                if (nextPopulace.firstChild) {
                    displayPopulaces.unshift(nextPopulace);
                }
                nextPopulace = nextPopulace.parent;
            }
            displayPopulaces.forEach( function(populace) {
                if (!populace.currentChart.legend.element.classList.contains("parentLegend")) {
                    populace.position({});
                    populace.currentChart.legend.drawHeading();
                }
            }, this);
        }
    ,   freshPopulace: function(stat, parent) {
            var newPopulace = null
            ;
            this.populaces.some( function(populace) {
                return populace.active ? false : ((newPopulace = populace), true);
            });
            newPopulace = newPopulace || new Populace(this);
            newPopulace.stat = stat || null;
            newPopulace.active = true;
            newPopulace.parent = parent || this;
            newPopulace.parent.element.appendChild(newPopulace.element);
            newPopulace.prevSibling = newPopulace.parent.lastChild;
            if (newPopulace.prevSibling) {
                newPopulace.prevSibling.nextSibling = newPopulace;
            } else {
                newPopulace.parent.firstChild = newPopulace;
            }
            newPopulace.parent.lastChild = newPopulace;
            newPopulace.firstChild = newPopulace.lastChild = newPopulace.nextSibling = null;
            newPopulace.hue = this.hue[Math.floor(this.hue.length * Math.random())];
            newPopulace.element.style.opacity = 1;
            return newPopulace;
        }
    ,   initialize: function() {
            this.rate = 600;
            this.resizing = false;
        }
    ,   resize: function() {
            if (!this.resizing) {
                this.resizing = true;
                this.height = document.documentElement.clientHeight;
                this.width = document.documentElement.clientWidth;
                this.area = this.height * this.width;
                display.firstChild.position({});
                display.firstChild.act("subdivide", display.firstChild, {updateYear: true, withholdActions: true});
                display.firstChild.act("initialize", this);
            }
        }
    ,   updateYear: function(parameters) {
            if (!this.selectYear || (this.selectYear.name != this.data.selectYear.name)) {
                this.selectYear = this.data.selectYear;
                worldPopulation = this.data.firstStat.populations[this.selectYear.column]
                return true;
            } else {
                return false;
            }
        }
    // ,   verify: function() {
    //     }
    }
    Icon.prototype = {
        toJSON: function() { return "icon" + this.id; }
    }
    Legend.prototype = {
        draw: function(parameters) {
            var lines = []
            ,   y = 0
            ,   populationLine = 0
            ,   sizing = {}
            ;
            if (this.chart.populace.active && !this.active && !this.transitioning) {
                this.transitioning = true;
                if (this.chart.populace.stat) {
                    this.description = this.chart.populace.stat.name + ":";
                    this.population = this.chart.simplePopulation();
                } else if (this.chart.population < 10) {
                    this.description = "population";
                    this.population = null;
                } else {
                    this.description = null;
                    this.population = this.chart.simplePopulation();
                }
                sizing = this.sizeText();
                lines = sizing.lines;
                this.fontSize = sizing.fontSize;
                this.lineHeight = Math.round(this.fontSize * 1.1);
                this.context.font = this.fontSize + "px Arial, Helvetica, sans-serif";
                populationLine = lines.length;
                if (sizing.minimum) {
                    this.element.classList.add("smallLegend");
                    this.chart.populace.element.classList.add("smallLegend");
                } else {
                    this.element.classList.add("populaceLegend");
                }
                this.element.style.height = (this.lineHeight * lines.length) + "px";
                this.element.height = this.element.clientHeight;
                this.element.style.width = sizing.widestLine + "px";
                this.element.width = this.element.clientWidth;
                this.context.font = this.fontSize + "px Arial, Helvetica, sans-serif";
                this.context.fillStyle = "hsla(" + this.chart.populace.hue + ",100%,90%,0.7)";
                this.context.textAlign = "center";
                this.context.textBaseline = "top";
                lines.forEach( function(line, index) {
                    if (index == (lines.length - 1)) {
                        this.context.fillStyle = "hsla(" + this.chart.populace.hue + ",100%,80%,0.7)";
                    }
                    this.context.fillText(line, this.element.width/2, y);
                    y += this.lineHeight;
                }, this)
            }
        }
    ,   drawHeading: function() {
            var priorHeadX = 0
            ;
            if (this.chart.populace.active && !this.active && !this.transitioning) {
                this.transitioning = true;
                this.element.classList.add("parentLegend");
                this.element.style.height = Math.round(0.7 * this.chart.populace.display.currentYear.element.clientHeight) + "px";
                this.element.height = this.element.clientHeight;
                this.context.font = this.element.clientHeight + "px Arial, Helvetica, sans-serif";
                this.description = "\u2022 " + this.chart.populace.stat.name;
                this.element.style.width = Math.ceil(this.context.measureText(this.description).width) + "px"
                this.element.width = this.element.clientWidth;
                if (this.chart.populace.parent.isDisplay) {
                    priorHeadX = this.chart.populace.display.currentYear.element.getBoundingClientRect().right;
                } else {
                    priorHeadX = this.chart.populace.parent.currentChart.legend.element.getBoundingClientRect().right;
                }
                this.element.style.left = (priorHeadX + (this.element.clientWidth/2) + (0.2 * this.chart.populace.display.currentYear.element.clientHeight)) + "px";
                this.element.style.top = this.chart.populace.display.currentYear.element.style.top;
                this.context.fillStyle = this.chart.populace.display.currentYear.topElement.style.color;
                this.context.textAlign = "left";
                this.context.textBaseline = "top";
                this.context.font = this.element.clientHeight + "px Arial, Helvetica, sans-serif";
                this.context.fillText(this.description, 0, 0);
            }
        }
    ,   endTransition: function() {
            if (this.element.classList.contains("populaceLegend") || this.element.classList.contains("parentLegend") || this.element.classList.contains("smallLegend")) {
                this.active = true;
            } else {
                this.active = false;
                this.element.removeAttribute("style");
            }
            this.transitioning = false;
        }
    ,   hide: function() {
            if (!this.transitioning) {
                this.element.classList.remove("populaceLegend", "parentLegend", "smallLegend");
                this.chart.populace.element.classList.remove("smallLegend");
                if (this.active) {
                    this.transitioning = true;
                } else {
                    this.endTransition();
                }
            }
        }
    ,   initialize: function() {
            this.fontSize = this.lineHeight = 0;
            this.description = this.population = "";
            this.hide();
        }
    ,   sizeText: function(givenFontSize) {
            var maxFontSize = Math.min(0.2 * this.chart.populace.width, 0.5 * this.chart.populace.height)
            ,   fontSize =  Math.max(minFontSize, Math.floor(givenFontSize || maxFontSize))
            ,   lines = []
            ,   newLine = ""
            ,   maxTextWidth = 0
            ,   totalTextArea = 0
            ,   newFontSize = 0
            ;
            this.context.font = fontSize + "px Arial, Helvetica, sans-serif";
            if (this.description) {
                this.description.split(/\s/).forEach( function(word, index) {
                    if (index) {
                        if (this.context.measureText(newLine + " " + word).width > this.chart.width) {
                            lines.push(newLine);
                            maxTextWidth = Math.max(maxTextWidth, this.context.measureText(newLine).width);
                            newLine = word;
                        } else { newLine = newLine + " " + word; }
                    } else { newLine = word; }
                }, this);
                lines.push(newLine);
                maxTextWidth = Math.max(maxTextWidth, this.context.measureText(newLine).width);
                if (this.population) {
                    if ((lines.length == 1) && this.context.measureText(lines[0] + " " + this.population).width < (0.9 * this.chart.populace.width)) {
                        lines[0] += " " + this.population;
                    } else {
                        lines.push(this.population);
                    }
                    maxTextWidth = Math.max(maxTextWidth, this.context.measureText(lines[lines.length - 1]).width);
                }
            } else if (this.population) {
                lines[0] = this.population;
                maxTextWidth = this.context.measureText(this.population).width;
            }
            totalTextArea = maxTextWidth * fontSize * lines.length;
            if (fontSize <= minFontSize) {
                return {lines: lines, fontSize: fontSize, widestLine: maxTextWidth, minimum: true};
            } else if ((maxTextWidth/this.chart.populace.width < 0.9) && (fontSize * lines.length/this.chart.populace.height) < 0.9) {
                return {lines: lines, fontSize: fontSize, widestLine: maxTextWidth};
            } else {
                newFontSize = Math.min(fontSize - 4, fontSize * Math.sqrt((0.9 * this.chart.populace.area)/totalTextArea))
                return this.sizeText(newFontSize);
            }
        }
    }
    Populace.prototype = {
        absoluteLeft: function(x) {
            return this.x + ((this.parent && !this.parent.isDisplay) ? this.parent.absoluteLeft() : 0);
        }
    ,   absoluteTop: function() {
            return this.y + ((this.parent && !this.parent.isDisplay) ? this.parent.absoluteTop() : 0);
        }
    ,   act: function(action, object, parameters) {
            var withholdActions = parameters && parameters.withholdActions || false
            ,   mainAct = null
            ;
            mainAct = new Action(this, action, object || this, parameters);
            if (withholdActions) {
                this.display.withholdActions = true;
                new Action(this, "allowActions", this.display, {original: mainAct});
            }
            return this;
        }
    ,   deactivate: function(parameters) {
            var rate = parameters.rate || this.display.rate
            ,   nextPopulace = null
            ;
            if (!this.deactivating && this.active) {
                nextPopulace = this.firstChild;
                while (nextPopulace) {
                    nextPopulace.deactivate(parameters);
                    nextPopulace = nextPopulace.nextSibling;
                }
                if (!parameters.retain || !parameters.retain.some( function(populace) { return (populace.id == this.id); }, this)) {
                    this.deactivating = true;
                    this.currentChart.otherChart.legend.initialize();
                    this.currentChart.otherChart.initialize();
                    this.act("setTransition", this.currentChart, {rate: rate, noTransform: true, deactivate: true});
                }
            }
        }
    ,   getNextAction: function() {
            var action = this.firstAction
            ;
            if (action) {
                this.firstAction = this.nextLoopAction = this.firstAction.nextAction;
                if (this.firstAction) {
                    this.firstAction.prevAction = null;
                } else {
                    this.lastAction = null;
                }
            }
            return action;
        }
    ,   initialize: function() {
            if (this.parent) {
                if (this.prevSibling) {
                    this.prevSibling.nextSibling = this.nextSibling;
                } else {
                    this.parent.firstChild = this.nextSibling;
                }
                if (this.nextSibling) {
                    this.nextSibling.prevSibling = this.prevSibling;
                } else {
                    this.parent.lastChild = this.prevSibling;
                }
                this.parent.element.removeChild(this.element);
            }
            this.parent = this.firstChild = this.lastChild = this.prevSibling = this.nextSibling = null;
            this.stat = null;
            this.active = this.deactivating = false;
            this.x = this.y = this.width = this.height = this.area = this.ratio = 0;
            this.firstAction = this.lastAction = null;
            this.hue = null;
            this.nextLoopAction = null;
            this.subdivideIndex = null;
            this.topLeft = this.vertical = null;
            this.element.removeAttribute("style");
            this.element.classList.remove("populated");
        }
    ,   populate: function(parameters) {
            var population = parameters.population || null
            ,   rate = parameters.rate || this.display.rate
            ,   match = parameters.match || (this.currentChart.active ? this.currentChart : null)
            ,   introSpeedFactor = 0.97 // 1 //
            ,   fastestRate = 300
            ,   newPopulace = null
            ,   noLegend = parameters.noLegend || false
            ,   setCurrent = parameters.setCurrent || false
            ,   intro = parameters.intro || false
            ,   fillWidth = parameters.fillWidth || false
            ,   roundUp = false
            ;
            if (!this.active) {
                // console.log(Date.now() + "!!! skipped populate for being inactive " + this.element.id);
                return null;
            } else if (intro && !this.display.introGrowthFactor) {
                // console.log(Date.now() + "!!! skipped populate for post-intro " + this.element.id);
                return null;
            }
            if (!this.stat && !this.display.introGrowthFactor) {
                this.stat = this.display.data.firstStat;
            }
            if (!this.currentChart.otherChart.draw(parameters)) {
                if (!this.currentChart.otherChart.iconWidth || !this.currentChart.otherChart.iconHeight) {
                    this.act("deactivate", this, {rate: rate})
                    return false;
                }
                newPopulace = this.display.freshPopulace(this.stat, this.parent).position({match: this});
                newPopulace.hue = this.hue;
                parameters.icon = this.currentChart.otherChart.icon;
                parameters.match = this.currentChart;
                parameters.deactivateMatch = true;
                return newPopulace.populate(parameters);
            } else {
                if (setCurrent) {
                    this.display.currentPopulace = this;
                }
                this.act("setTransition", this.currentChart.otherChart, {populationMatch: match, opacity: 0});
                this.act("setTransition", this.currentChart.otherChart, {rate: rate, opacity: 1, noLegend: noLegend});
                if (match) {
                    this.act("setTransition", match, {rate: rate, opacity: 0, populationMatch: this.currentChart.otherChart, opacityEasing: "ease-in"});
                    if (parameters.deactivateMatch) {
                        this.act("deactivate", match.populace, {rate: rate})
                    }
                }
                if (this.display.introGrowthFactor) {
                    if (!this.display.data.ready || (population && (population < worldPopulation/this.display.introGrowthFactor))) {
                        if (fillWidth) {
                            if (noLegend) {
                                delete parameters.noLegend;
                            } else {
                                fillWidth = false;
                                delete parameters.fillWidth;
                            }
                            population = population;
                        } else {
                            population = Math.round(population * this.display.introGrowthFactor);
                            roundUp = (population > 1000) ? true : false;
                        }
                        this.act("populate", this, {population: population, rate: Math.max(fastestRate, rate * introSpeedFactor), setCurrent: true, intro: true, fillWidth: fillWidth, roundUp: roundUp});
                    } else {
                        this.display.introGrowthFactor = null;
                        this.act("populate", this, {setCurrent: true});
                        this.act("select", this, {delay: rate});
                    }
                }
                if ((this.id != this.display.currentPopulace.id) || (this.display.introGrowthFactor && this.display.data.ready)) {
                    this.element.classList.add("populated");
                } else {
                    this.element.classList.remove("populated");
                    clearTimeout(this.currentChart.toSparkleId);
                }
            }
            return this;
        }
    ,   position: function(parameters) {
            var match = parameters.match || {}
            ;
            this.x = match.x || 0;
            this.y = match.y || 0;
            this.width = match.width || this.display.width;
            this.height = match.height || this.display.height;
            this.element.style.left = this.x + "px";
            this.element.style.top = this.y + "px";
            this.element.style.width = this.width + "px";
            this.element.style.height = this.height + "px";
            this.area = this.width * this.height;
            this.ratio = this.width/this.height;
            return this;
        }
    ,   select: function(parameters) {
            var rate = parameters.rate || this.display.rate
            ,   altKey = parameters.altKey || false
            ,   populace = null
            ,   populaces = []
            ,   retainPopulaces = [this.display.firstChild]
            ,   boundingClientRect = null
            ,   resetPopulation = parameters.resetPopulation || false
            ;
            delete parameters.altKey;
            delete parameters.resetPopulation;
            if (this.currentChart.active && !resetPopulation) {
                if ((this.display.currentPopulace.id != this.id) && (!this.stat.firstChild || altKey)) { // end-of-line populace or option key
                    populace = this;
                    while (!populace.parent.isDisplay) {
                        populaces.unshift(populace);
                        populace = populace.parent;
                    }
                    populaces.forEach( function(populace, index) {
                        retainPopulaces.push(this.display.freshPopulace(populace.stat, index ? retainPopulaces[retainPopulaces.length - 1] : this.display.firstChild).position({}));
                    }, this)
                    this.display.currentPopulace = retainPopulaces[retainPopulaces.length - 1];
                    this.display.currentPopulace.hue = this.hue;
                    if (this.display.currentPopulace.currentChart.otherChart.draw({})) {
                        this.display.currentPopulace.act("setTransition", this.display.currentPopulace.currentChart.otherChart, {sizeMatch: this.currentChart, opacity: 0});
                        this.display.currentPopulace.act("setTransition", this.display.currentPopulace.currentChart.otherChart, {rate: rate, noTransform: true, opacity: 1, noLegend: true});
                        this.display.currentPopulace.act("deactivate", this.display.firstChild, {rate: 2 * rate, retain: retainPopulaces});
                        this.display.currentPopulace.act("setTransition", this.display.currentPopulace.currentChart.otherChart, {rate: rate});
                        this.display.currentPopulace.act("drawLocation", this.display);
                        this.display.currentPopulace.act("select");
                    }
                } else if (this.display.introGrowthFactor) {
                    this.act("populate", this, {population: worldPopulation, rate: 2 * rate});
                } else {
                    this.act("subdivide", this, {rate: rate, delay: rate/2, initialize: true});
                }
            } else {
                if (this.firstChild && this.firstChild.active && !this.firstChild.deactivating) {
                    this.act("deactivate", this, {rate: 2 * rate, retain: [this]});
                    this.act("select", this, parameters);
                } else {
                    if (this.id == this.display.currentPopulace.id) { // redisplay
                        this.populate({rate: rate, setCurrent: true});
                    } else {
                        this.populate({rate: rate, population: this.display.currentPopulace.stat.populations[this.display.selectYear.column], noLegend: true, setCurrent: true});
                        parameters.resetPopulation = true;
                    }
                    this.display.currentPopulace.act("select", this.display.currentPopulace, parameters);
                }
            }
        }
    ,   subdivide: function(parameters) {
            var nextObject = null
            ,   selectYear = this.display.selectYear.column
            ,   populaces = []
            ,   populationTotal = 0
            ,   splitFactor = 0
            ,   available = {
                    x: 0
                ,   y: 0
                ,   width: this.width
                ,   height: this.height
                ,   area: this.area }
            ,   split = {}
            ,   rate = parameters.rate || this.display.rate
            ,   populaceArea = 0
            ,   minimumSide = iconMinSize + (2 * chartBorderSize)
            ,   minimumArea = Math.pow(minimumSide, 2)
            ,   initialize = parameters.initialize || false
            ,   update = this.display.updateYear() || parameters.updateYear || parameters.forceUpdate || this.display.resizing
            ;
            if (initialize) {
                nextObject = this.stat.firstChild
                while (nextObject) {
                    populaces.push(this.display.freshPopulace(nextObject, this));
                    populationTotal += nextObject.populations[selectYear];
                    nextObject = nextObject.nextSibling;
                }
            } else if (update && this.firstChild && this.firstChild.currentChart.active) {
                parameters.forceUpdate = true;
                nextObject = this.firstChild;
                while (nextObject) {
                    populaces.push(nextObject);
                    populationTotal += nextObject.stat.populations[selectYear];
                    nextObject = nextObject.nextSibling;
                }
            }
            if (populaces.length) {
                splitFactor = populationTotal/available.area;
                populaces.sort( function(a, b) {
                    if (b.subdivideIndex === null) {
                        return b.stat.populations[selectYear] - a.stat.populations[selectYear];
                    } else {
                        return a.subdivideIndex - b.subdivideIndex;
                    }
                }).forEach( function(populace, index) {
                    if (populace.subdivideIndex === null) {
                        populace.subdivideIndex = index;
                    }
                    if (populace.vertical === null) {
                        populace.vertical = (available.width/available.height > 1.5) || ((available.width/available.height > 0.75) && (Math.random() < 0.5));
                    }
                    if (populace.topLeft === null) {
                        populace.topLeft = (Math.random() < 0.5);
                    }
                    populaceArea = Math.max(minimumArea, populace.stat.populations[selectYear]/splitFactor);
                    if (populace.vertical) {
                        split.height = available.height;
                        split.width = Math.min(available.width - minimumSide, Math.round(populaceArea/split.height));
                        available.width -= split.width;
                    } else {
                        split.width = available.width;
                        split.height = Math.min(available.height - minimumSide, Math.round(populaceArea/split.width));
                        available.height -= split.height;
                    }
                    if ((split.height < minimumSide) || (split.width < minimumSide)) {
                        available.width += split.width;
                        available.height += split.height;
                        populace.act("deactivate", populace, {rate: rate});
                    } else {
                        if (populace.topLeft) {
                            split.x = available.x;
                            split.y = available.y;
                            if (populace.vertical) {
                                available.x += split.width;
                            } else {
                                available.y += split.height;
                            }
                        } else {
                            if (populace.vertical) {
                                split.x = available.x + available.width;
                                split.y = available.y;
                            } else {
                                split.x = available.x;
                                split.y = available.y + available.height;
                            }
                        }
                        populace.position({match: split})
                        if (populace.firstChild) {
                            populace.act("subdivide", populace, parameters);
                        } else {
                            if (initialize) {
                                populace.act("populate", populace, {rate: rate, delay: 700 * Math.random()});
                            } else {
                                populace.act("populate", populace, {rate: rate, icon: populace.currentChart.icon});
                            }
                        }
                    }
                }, this);
                if (initialize) {
                    this.act("setTransition", this.currentChart, {rate: rate, noTransform: true, opacityDelay: rate, deactivate: true});
                    this.element.classList.remove("populated");
                }
            } else if (this.firstChild) {
                this.firstChild.subdivide(parameters);
            }
            this.act("drawLocation", this.display);
        }
    ,   toJSON: function() { return "populace" + this.id + "(" + (this.stat ? this.stat.name : "none") + ")"; }
    // ,   verify: function() {
    //         if (this.active) {
    //             if (!this.currentChart.active && parseInt(this.currentChart.element.style.opacity)) {
    //                 console.log(Date.now() + "!!! chart activity mismatch 1 for populace" + this.id);
    //             } else if (this.currentChart.otherChart.active && !this.currentChart.otherChart.transitioning) {
    //                 console.log(Date.now() + "!!! chart activity mismatch 2 for populace" + this.id);
    //             }
    //             if (parseInt(this.currentChart.otherChart.element.style.opacity) && !this.currentChart.otherChart.transitioning) {
    //                 console.log(Date.now() + "!!! chart opacity mismatch 0 for populace" + this.id);
    //             }
    //             if (!this.parent) {
    //                 console.log(Date.now() + "!!! link mismatch 0 for populace" + this.id);
    //             } else if (!this.deactivating && !this.parent.isDisplay && !this.parent.active) {
    //                 console.log(Date.now() + "!!! parent activity mismatch 0 for populace" + this.id);
    //             }
    //             if (this.prevSibling) {
    //                 if (this.prevSibling.nextSibling.id != this.id) {
    //                     console.log(Date.now() + "!!! link mismatch 1 for populace" + this.id);
    //                 }
    //             } else if (!this.deactivating && this.parent.active && (!this.parent.firstChild || (this.parent.firstChild.id != this.id))) {
    //                 console.log(Date.now() + "!!! link mismatch 2 for populace" + this.id);
    //             }
    //             if (this.nextSibling) {
    //                 if (this.nextSibling.prevSibling.id != this.id) {
    //                     console.log(Date.now() + "!!! link mismatch 3 for populace" + this.id);
    //                 }
    //             } else if (!this.deactivating && this.parent.active && (!this.parent.lastChild || (this.parent.lastChild.id != this.id))) {
    //                 console.log(Date.now() + "!!! link mismatch 4 for populace" + this.id);
    //             }
    //             if (this.firstChild) {
    //                 if (this.firstChild.parent.id != this.id) {
    //                     console.log(Date.now() + "!!! link mismatch 5 for populace" + this.id);
    //                 }
    //                 if (this.firstChild.prevSibling) {
    //                     console.log(Date.now() + "!!! link mismatch 6 for populace" + this.id);
    //                 }
    //             }
    //             if (this.lastChild) {
    //                 if (this.lastChild.parent.id != this.id) {
    //                     console.log(Date.now() + "!!! link mismatch 7 for populace" + this.id);
    //                 }
    //                 if (this.lastChild.nextSibling) {
    //                     console.log(Date.now() + "!!! link mismatch 8 for populace" + this.id);
    //                 }
    //             }
    //             if (this.currentChart.active && (!this.currentChart.iconHeight || !this.currentChart.iconWidth)) {
    //                 console.log(Date.now() + "!!! zero icon size for populace" + this.id);
    //             }
    //             if (!this.stat && (this.display.populaces.length > 2)) {
    //                 console.log(Date.now() + "!!! no stat for active populace" + this.id);
    //             }
    //         } else {
    //             if (this.currentChart.active || this.currentChart.otherChart.active) {
    //                 console.log(Date.now() + "!!! chart activity mismatch 0 for populace" + this.id);
    //             }
    //             if (this.parent || this.firstChild || this.lastChild || this.prevSibling || this.nextSibling) {
    //                 console.log(Date.now() + "!!! link mismatch 9 for populace" + this.id);
    //             }
    //             if (this.display.currentPopulace && (this.id == this.display.currentPopulace.id)) {
    //                 console.log(Date.now() + "!!! inactive currentPopulace mismatch 0 for populace" + this.id);
    //             }
    //         }
    //         if (this.firstAction && (this.firstAction.created < (Date.now() - 15000))) {
    //             console.log(Date.now() + "!!! old action " + this.firstAction + " for populace" + this.id);
    //         }
    //         if (!this.currentChart.legend.transitioning && !this.currentChart.legend.element.classList.contains("parentLegend") && (this.currentChart.legend.element.style.top != "")) {
    //             console.log(Date.now() + "!!! remaining styles on " + this.currentChart.legend.element.id)
    //         }
    //         if (!this.currentChart.otherChart.legend.transitioning && !this.currentChart.otherChart.legend.element.classList.contains("parentLegend") && (this.currentChart.otherChart.legend.element.style.top != "")) {
    //             console.log(Date.now() + "!!! remaining styles on " + this.currentChart.otherChart.legend.element.id)
    //         }
    //     }
    }
    return new Display();
}
function importData(display) {
    var Data = function(display) {
            this.display = display;
            this.xmlReader = new XMLHttpRequest() || new ActiveXObject('MSXML2.XMLHTTP')
            this.firstStat = this.lastStat = null;
            this.years = [];
            this.stats = [];
            this.selectYear = null;
            this.ready = false;
            this.source = null;
        }
    ,   Stat = function(data, name, level, parent, populations) {
            this.data = data;
            this.id = data.stats.length;
            this.name = name;
            this.level = level;
            this.populations = populations;
            this.parent = parent;
            if (parent) {
                if (parent.lastChild) {
                    parent.lastChild.nextSibling = this;
                } else {
                    parent.firstChild = this;
                }
                this.prevSibling = parent.lastChild;
                parent.lastChild = this;
            } else {
                if (data.lastStat) {
                    data.lastStat.nextSibling = this;
                } else {
                    data.firstStat = this;
                }
                this.prevSibling = data.lastStat;
                data.lastStat = this;
            }
            this.nextSibling = null;
            this.firstChild = this.lastChild = null;
        }
    ;
    Data.prototype = {
        addStat: function(name, level, parent, populations) {
            this.stats.push(new Stat(this, name, level, parent, populations));
            return this.stats[this.stats.length - 1];
        }
    ,   open: function() {
            var data = this
            ;
            this.xmlReader.open("get.html","./data/population.csv", true);
            this.xmlReader.addEventListener('loadend', function(e) {
                var lines = []
                ,   columns = []
                ,   columnNames = []
                ,   yearColumns = []
                ,   name = null
                ,   level = null
                ,   parent = null
                ,   parents = []
                ,   populations = []
                ;
                if ((this.readyState == 4) && this.responseText) {
                    var lines = this.responseText.split(/\r/)
                    ;
                    data.ready = true;
                    lines.forEach( function(line) {
                        columns = line.split(/[,:\\\"\.]/);
                        // if (columns[0] == "Index") {
                        if (columns[0].search("Index") > -1) {
                            columnNames = columns;
                            columnNames.forEach( function(columnName, index) {
                                if (Number.isInteger(parseInt(columnName))) {
                                    yearColumns.push({name: parseInt(columnName), index: index, column: yearColumns.length});
                                }
                            })
                            data.years = yearColumns;
                        } else if (columns[1] == "Estimates") {
                            for (var col = 2; col < 6; col++) {
                                if (columns[col] != "") {
                                    name = columns[col];
                                    level = col - 2;
                                    parent = (col == 2) ? null : parents[col - 3];
                                    break;
                                }
                            }
                            populations = [];
                            yearColumns.forEach( function(yearColumn) {
                                populations.push(parseInt(columns[yearColumn.index].replace(/\s/g, "")) * 1000);
                            });
                            parents[level] = data.addStat(name, level, parent, populations);
                        } else if (columns[1] == "Suggested citation") {
                            display.source.textContent = "Source: " + columns[2].trim() + " " + columns[3].trim() + " " + columns[4].trim();
                            display.source.style.opacity = 1;
                            display.source.style.color = "hsla(" + display.hue[0] + ",100%,50%,0.7)";
                            setTimeout(function() { display.source.style.opacity = 0; }, 3000);
                        }
                    }, this);
                    display.drawYear({});
                    display.updateYear({});
                }
            });
            this.xmlReader.send(null);
            return this;
        }
    }
    Stat.prototype = {
        toJSON: function() { return "stat" + this.id; }
    }
    return new Data(display).open();
}
function initialize() {
    var chart = null
    ;
    canvasRoot.addEventListener("click", function(e) {
        if (e.target.classList.contains("populated") && !display.withholdActions) {
            display.populaces[e.target.getAttribute("data-id")].act("select", undefined, {altKey: e.altKey, withholdActions: true});
        } else if (e.target.classList.contains("legend") && !display.withholdActions) {
            chart = display.charts[e.target.getAttribute("data-id")];
            chart.populace.act("select", chart.populace, {altKey: e.altKey, withholdActions: true});
        } else if (e.target.classList.contains("yearTop")) {
            display.drawYear({increment: 1});
            display.firstChild.act("subdivide", display.firstChild, {updateYear: true});
        } else if (e.target.classList.contains("yearBottom")) {
            display.drawYear({increment: -1});
            display.firstChild.act("subdivide", display.firstChild, {updateYear: true});
        }
    }, false);
    canvasRoot.addEventListener("transitionend", function(e) {
        if (e.target.classList.contains("chart")) {
            chart = display.charts[e.target.getAttribute("data-id")];
            if (!chart.lastTransition || (e.propertyName == chart.lastTransition)) {
                chart.endTransition();
            }
        } else if (e.target.classList.contains("legend")) {
            chart = display.charts[e.target.getAttribute("data-id")];
            if ((e.propertyName == "opacity") && chart.legend.transitioning){
                chart.legend.endTransition();
            }
        }
    }, false);
}
function animationLoop(ts) {
    var interval = ts - priorTimestamp
    ,   action = null
    ,   delay =  null
    ;
    priorTimestamp = ts;
    if (display.data.ready && (interval < 1000)) {
        // display.verify();
        display.populaces.forEach( function(populace) {
            // populace.verify();
            if (populace.firstAction) {
                if ((!populace.currentChart.stillTransitioning() && !populace.currentChart.otherChart.stillTransitioning()) || (populace.firstAction.object.isChart && !populace.firstAction.object.stillTransitioning())) {
                    if (populace.firstAction.delay > 0) {
                        populace.firstAction.delay -= interval;
                    } else {
                        action = populace.getNextAction();
                        action.object[action.act](action.parameters);
                    }
                } else if (populace.currentChart.stillTransitioning() && (populace.currentChart.transitionTimeout < Date.now())) {
                    populace.currentChart.endTransition();
                } else if (populace.currentChart.otherChart.stillTransitioning() && (populace.currentChart.otherChart.transitionTimeout < Date.now())) {
                    populace.currentChart.otherChart.endTransition();
                }
            } else if (populace.deactivating && !populace.currentChart.active && !populace.firstChild) {
               populace.initialize();
           }
        })
    }
	animationId = window.requestAnimationFrame(animationLoop);
}
initialize();
})();
