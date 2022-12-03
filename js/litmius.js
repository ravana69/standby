(function() {
"use strict";

var animationId = null
,   canvasRoot = document.querySelector(".canvas")
,   priorTimestamp = 0
,   display = null
;
window.onload = function() {
    display = createDisplay();
    display.addTask(display.strip, display.strip.mobize, null, 2000);
    animationId = window.requestAnimationFrame(animationLoop);
}
window.onresize = function() {
    display.delete();
    display = createDisplay();
    display.addTask(display.strip, display.strip.mobize, null, 2000);
}
function createDisplay() {
    let paneRoot = document.querySelector("#paneRoot")
    ,   paneTransform = "translate3d(-50%, -50%, 0) rotateX(0.25turn) rotateY(0.25turn)"
    ,   rearPaneTransform = "translate3d(-50%, -50%, 0) rotateX(-0.25turn) rotateY(-0.25turn)"
    ,   Display = function() {
            this.element = canvasRoot;
            // this.width = this.element.clientWidth;
            // this.height = this.element.clientHeight;
            this.width = window.innerWidth;
            this.height = window.innerHeight;
            this.tasks = [];
            this.strip = new Strip(this);
            this.background = new Background(this);
            this.colors = [];
            this.currentColor = 0;
            // this.loadColors();
            this.loadColorFile();
        }
    ,   Background = function(display) {
            let pattern = null
            ,   brickCount = 0
            ;
            this.display = display;
            this.element = document.querySelector("#backgroundPlane");
            this.context = this.element.getContext('2d');
            this.element.width = this.element.clientWidth;
            this.element.height = this.element.clientHeight;
            this.patternElement = document.querySelector("#stripe");
            this.patternContext = this.patternElement.getContext('2d');
            this.patternElement.width = paneRoot.clientWidth;
            this.patternElement.style.height = this.display.height + "px";
            this.patternElement.height = this.patternElement.clientHeight;
            this.patternContext.fillStyle = "hsl(0, 0%, 20%)";
            this.patternContext.fillRect(0, 0, this.patternElement.width, this.patternElement.height);
            this.patternContext.lineWidth = 2;
            this.patternContext.strokeStyle = "black";
            this.patternContext.strokeRect(0, 0, this.patternElement.width, this.patternElement.height);
            pattern = this.context.createPattern(this.patternElement,"repeat");
            this.context.fillStyle = pattern;
            this.context.fillRect(0, 0, this.element.width, this.element.height);
            this.stripeCount = Math.ceil(this.display.width/this.patternElement.width);
            this.resetOpacity();
        }
    ,   Color = function(display, hexValue, name) {
            this.display = display;
            this.hexValue = hexValue;
            this.name = name;
        }
    ,   Content = function(strip) {
            this.strip = strip;
            this.element = document.querySelector("#content");
            this.context = this.element.getContext('2d');
            this.element.style.width = (this.strip.panes.length * paneRoot.clientWidth) + "px";
            this.element.style.height = (2 * paneRoot.clientHeight) + "px";
            this.element.width = this.element.clientWidth;
            this.element.height = this.element.clientHeight;
            this.minFontSize = Math.round(0.2 * this.strip.diameter);
            this.maxFontSize = Math.round(0.6 * this.strip.diameter);
            this.fontStyle = "serif";
            this.context.textAlign = "center";
            this.context.textBaseline = "top";
        }
    ,   Frame = function(strip) {
            this.strip = strip;
            this.element = document.querySelector("#frame");
        }
    ,   Pane= function(section, element) {
            const front = !element.classList.contains("rearPane")
            ;
            this.section = section;
            this.element = element;
            this.id = this.section.strip.panes.length;
            this.element.id = "pane" + this.id;
            this.element.setAttribute("data-id",this.id);
            this.context = this.element.getContext('2d');
            this.front = front || false;
            if (this.section.prevSection) {
                this.prevPane = this.front ? this.section.prevSection.frontPane : this.section.prevSection.rearPane;
                this.prevPane.nextPane = this;
            }
        }
    ,   Section = function(strip) {
            let frontPaneElement = null
            ,   rearPaneElement = null
            ;
            this.strip = strip;
            this.id = this.strip.sections.length;
            if (this.id) {
                this.prevSection = this.strip.sections[this.id - 1];
                this.element = this.strip.element.appendChild(this.prevSection.element.cloneNode(true));
                frontPaneElement = this.element.firstElementChild;
                rearPaneElement = frontPaneElement.nextElementSibling;
            } else {
                this.element = this.strip.element.appendChild(document.querySelector("#sectionRoot").cloneNode(true));
                frontPaneElement = this.element.firstElementChild;
                rearPaneElement = this.element.appendChild(paneRoot.cloneNode(false));
                rearPaneElement.classList.add("rearPane");
            }
            this.element.id = "section" + this.id;
            this.element.setAttribute("data-id",this.id);
            this.element.style.transform = "rotateZ(" + (this.id * this.strip.sectionAngle) + "rad) translate3d(" + this.strip.diameter + "px, 0px, 0)" ;
            this.strip.panes.push(new Pane(this, frontPaneElement));
            this.frontPane = this.strip.panes[this.strip.panes.length - 1];
            this.strip.panes.push(new Pane(this, rearPaneElement));
            this.rearPane = this.strip.panes[this.strip.panes.length - 1];
            if (this.prevSection) {
                this.prevSection.nextSection = this;
                if (this.id == (this.strip.sectionCount - 1)) {
                    this.rearPane.element.classList.add("lastPane");
                }
            }
        }
    ,   Strip = function(display) {
            const widthFactor = 0.8 + (0.2 * Math.random())
            ,   xAngle = Math.floor(360 * Math.random())
            ,   yStartAngle = Math.floor(360 * Math.random())
            ,   yEndAngle = yStartAngle + (Math.random() < 0.5 ? -360 : 360)
            ,   yRotatePeriod = 50 + (20 * Math.random())
            ,   zStartAngle = Math.floor(360 * Math.random())
            ,   zEndAngle = zStartAngle - 360
            ,   zRotatePeriod = 20 + (20 * Math.random())
            ;
            this.display = display;
            this.element = document.querySelector("#strip");
            this.diameter = Math.round(Math.min(this.display.width, this.display.height)/2);
            this.sectionCount = 100 + Math.floor(100 * Math.random());
            this.sectionAngle = 2 * Math.PI/this.sectionCount;
            paneRoot.style.height = this.diameter + "px";
            paneRoot.height = paneRoot.clientHeight;
            this.display.element.style.setProperty("--backgroundTransform", "translate3D(0, 0, -" + (2 * paneRoot.height) + "px)");
            paneRoot.style.width = Math.ceil(widthFactor * this.diameter * Math.sin(this.sectionAngle)) + "px";
            paneRoot.width = paneRoot.clientWidth;
            this.frame = new Frame(this);
            this.frame.element.style.setProperty("--frameRotate0", "rotateX(" + xAngle + "deg) rotateY(" + yStartAngle + "deg)");
            this.frame.element.style.setProperty("--frameRotate100", "rotateX(" + xAngle + "deg) rotateY(" + yEndAngle + "deg)");
            this.element.style.setProperty("--stripRotate0", "rotateZ(" + zStartAngle + "deg)");
            this.element.style.setProperty("--stripRotate100", "rotateZ(" + zEndAngle + "deg)");
            this.display.addTask(this.display, Display.prototype.setStyle, [this.frame.element, "opacity", 1]);
            this.display.addTask(this.display, Display.prototype.setStyle, [this.frame.element, "animation", "frameRotate " + yRotatePeriod + "s infinite linear"]);
            this.display.addTask(this.display, Display.prototype.setStyle, [this.element, "animation", "stripRotate " + zRotatePeriod + "s infinite ease-in-out"]);
            this.element.style.setProperty("--paneTransform", paneTransform + " rotateX(0turn)");
            this.element.style.setProperty("--rearPaneTransform", rearPaneTransform + " rotateX(0turn)");
            this.frontHue = 360 * Math.random()
            this.backgroundAlpha = 0.9
            this.fadePaneBackground();
            this.sections = [];
            this.panes = [];
            for (let i = 0; i < this.sectionCount; i++) {
                this.sections.push(new Section(this));
            }
            this.content = new Content(this);
        }
    ,   Task = function(object, action, parameters, delay) {
            this.object = object;
            this.action = action;
            this.parameters = parameters || null;
            this.delay = delay || 0;
        }
    ;
    Display.prototype = {
        addTask: function(object, action, parameters, delay) {
            this.tasks.push(new Task(object, action, parameters, delay));
        }
    ,   delete: function() {
            this.deleting = true;
            this.strip.mobized = false;
            this.background.context.clearRect(0, 0, this.background.element.width, this.background.element.height);
            this.strip.sections.forEach(function(section) {
                section.delete();
            });
        }
    ,   fetchColor: function() {
            if (this.currentColor > this.colors.length) {
                this.currentColor = 0;
            }
            return this.colors[this.currentColor++];
        }
    ,   setStyle: function(element, property, value) {
            element.style[property] = value;
        }
    ,   loadColorFile: function() {
            let xmlReader = new XMLHttpRequest() || new ActiveXObject('MSXML2.XMLHTTP')
            ;
            xmlReader.open("get.html","data/ListOfColors.csv", true);
            xmlReader.onloadend = function() {
                let colorArray = null
                ,   colorFields = null
                ;
                if (xmlReader.readyState == 4) {
                    colorArray = xmlReader.responseText.split(/\r\n/);
                    shuffle(colorArray).forEach(function(colorItem) {
                        colorFields = colorItem.split(/,/)
                        display.colors.push(new Color(display, colorFields[1], colorFields[0].replace(/\"/g, "")))
                    })
                }
            }
            xmlReader.send(null);
        }
    ,   loadColors: function() {
            let xmlReader = new XMLHttpRequest() || new ActiveXObject('MSXML2.XMLHTTP')
            ,   display = this
            ,   content = null
            ,   colorItem = null
            ,   csvContent = null
            ,   encodedUri = null
            ;
            xmlReader.open("get","https://en.wikipedia.org/w/api.php?action=query&titles=List%20of%20colors%20(compact)&prop=revisions&rvprop=content&rvsection=1&format=json&formatversion=2&origin=*", true);
            xmlReader.setRequestHeader('Api-User-Agent','nullameragon.com/litmius.html; nullameragon@gmail.com' );
            xmlReader.onreadystatechange = function() {
                if (xmlReader.readyState == 4) {
                    content = JSON.parse(xmlReader.responseText).query.pages[0].revisions[0].content.split(/\]?\]?\}?\}?\n?\{\{/);
                    content.forEach(function(contentItem) {
                        if (contentItem.search("Colort/ColorShort") == 0) {
                            colorItem = contentItem.split(/\|n?a?m?e?\=?\[?\[?/);
                            display.colors.push(new Color(display, "#" + colorItem[1].split("hex=")[1], colorItem[colorItem.length - 1].split("]]")[0].replace(/\s\(.*$/, "")))
                        }
                    });
                    csvContent = "data:text/csv;charset=utf-8,";
                    display.colors.forEach(function(color){
                       csvContent += "\"" + color.name + "\"," + color.hexValue + "\r\n";
                    });
                    encodedUri = encodeURI(csvContent);
                    window.open(encodedUri);
                }
            }
            xmlReader.send(null);
        }
    }
    Background.prototype = {
        draw: function(color) {
            this.patternContext.fillStyle = color.hexValue;
            this.patternContext.fillRect(0, 0, this.patternElement.width, this.patternElement.height);
            this.patternContext.strokeRect(0, 0, this.patternElement.width, this.patternElement.height);
            this.patternElement.style.left = this.patternElement.width * Math.floor(this.stripeCount * Math.random()) + "px";
            this.patternElement.style.opacity = 1;
        }
    ,   fadeStripe: function() {
            this.display.addTask(this.display, Display.prototype.setStyle, [this.patternElement, "transition", "opacity 2s ease-out"]);
            this.resetOpacity();
        }
    ,   resetOpacity: function() {
            this.display.addTask(this.display, Display.prototype.setStyle, [this.patternElement, "opacity", 0]);
            this.display.addTask(this.display, Display.prototype.setStyle, [this.patternElement, "transition", "opacity 100ms linear"]);
        }
    }
    Content.prototype = {
        draw: function(color) {
            const halfHeight = this.element.height/2
            ,   namePrimary = Math.random() < 0.5
            ;
            let textWidth = 0
            ,   gradient = null
            ;
            this.fontSize = this.minFontSize + Math.floor((this.maxFontSize - this.minFontSize) * Math.random())
            this.context.font = this.fontSize + "px " + this.fontStyle;
            this.currentColor = color;
            textWidth = this.context.measureText(this.currentColor.name).width
            if (textWidth < this.element.width) {
                this.drawX = 0;
                this.drawY = (this.drawY ? 0 : halfHeight);
                this.context.clearRect(this.drawX, this.drawY, this.element.width, halfHeight);
                this.drawWidth = Math.ceil(Math.min(textWidth * (1.2 + (0.8 * Math.random())), this.element.width)/paneRoot.width) * paneRoot.width;
                this.drawHeight = 1.2 * this.fontSize;
                this.context.globalCompositeOperation = "source-over";
                if (namePrimary) {
                    this.context.fillStyle = "hsla(0, 0%, 0%, 0)";
                    this.context.fillRect(this.drawX, this.drawY, this.drawWidth, this.drawHeight);
                    this.context.fillStyle = this.currentColor.hexValue;
                    this.context.fillText(this.currentColor.name, (this.drawX + this.drawWidth)/2, this.drawY);
                } else {
                    this.context.fillStyle = this.currentColor.hexValue;
                    this.context.fillRect(this.drawX, this.drawY, this.drawWidth, this.drawHeight);
                    this.context.globalCompositeOperation = "destination-out";
                    this.context.fillStyle = "hsla(0, 0%, 0%, 1)";
                    this.context.fillText(this.currentColor.name, (this.drawX + this.drawWidth)/2, this.drawY);
                    gradient = this.context.createLinearGradient(this.drawX, this.drawY, this.drawX + this.drawWidth, this.drawY);
                    gradient.addColorStop(0, "hsla(0, 0%, 0%, 1)");
                    gradient.addColorStop(0.2, "hsla(0, 0%, 0%, 0)");
                    gradient.addColorStop(0.8, "hsla(0, 0%, 0%, 0)");
                    gradient.addColorStop(1, "hsla(0, 0%, 0%, 1)");
                    this.context.fillStyle = gradient;
                    this.context.fillRect(this.drawX, this.drawY, this.drawWidth, this.drawHeight);
                }
            } else {
                this.draw(color);
            }
        }
    }
    Pane.prototype = {
        draw: function() {
            const display = this.section.strip.display
            ,   content = this.section.strip.content
            ;
            if (this.section.strip.panesRemaining--) {
                this.context.globalCompositeOperation = "destination-out";
                this.context.fillStyle = "hsla(0, 0%, 100%, 0.1)";
                this.context.fillRect(0, 0, this.element.width, this.element.height);
                this.context.globalCompositeOperation = "source-over";
                this.context.drawImage(content.element, content.drawX, content.drawY, this.element.width, this.element.height, 0, this.section.strip.targetY, this.element.width, this.element.height);
                content.drawX += this.element.width;
                display.addTask(this.nextPane, Pane.prototype.draw, null, display.strip.drawDelay);
            } else {
                display.addTask(display.strip, Strip.prototype.draw, [this], display.strip.drawDelay);
            }
        }
    }
    Section.prototype = {
        delete: function() {
            this.element.parentNode.removeChild(this.element);
        }
    }
    Strip.prototype = {
        draw: function(givenPane) {
            const startPane = givenPane || this.sections[0].frontPane
            ;
            this.drawDelay = 1;
            this.content.draw(this.display.fetchColor());
            this.targetY = Math.floor((paneRoot.height - this.content.fontSize) * Math.random());
            this.panesRemaining = Math.ceil(this.content.drawWidth/paneRoot.width);
            this.display.addTask(startPane, Pane.prototype.draw);
            this.fadePaneBackground();
            this.display.background.draw(this.content.currentColor);
            this.drawing = true;
        }
    ,   fadePaneBackground() {
            this.backgroundAlpha -= 0.04;
            this.element.style.setProperty("--paneBackgroundColor", "linear-gradient(hsla(" + this.frontHue + ", 40%, 70%, " + this.backgroundAlpha + "), hsla(" + this.frontHue + ", 40%, 30%, " + this.backgroundAlpha + "))");
            this.element.style.setProperty("--rearPaneBackgroundColor", "linear-gradient(hsla(" + (this.frontHue + 180) + ", 40%, 70%, " + this.backgroundAlpha + "), hsla(" + (this.frontHue + 180) + ", 40%, 30%, " + this.backgroundAlpha + "))");
        }
    ,   mobize: function() {
            let currentSection = this.sections[this.sections.length - 1]
            ,   mobiusRotation = 0
            ;
            this.element.style.pointerEvents = "none";
            this.element.style.cursor = "default";
            while (currentSection) {
                if (!this.mobized) {
                    mobiusRotation = currentSection.id/(2 * this.sectionCount);
                }
                currentSection.frontPane.element.style.transform = paneTransform + " rotateX(" + mobiusRotation + "turn)";
                currentSection.rearPane.element.style.transform = rearPaneTransform + " rotateX(" + mobiusRotation + "turn)";
                currentSection = currentSection.prevSection;
            }
        }
    ,   switchPaneLinks: function() {
            const lastSection = this.sections[this.sections.length - 1]
            ,   lastSectionFrontPane = lastSection.frontPane
            ,   lastSectionRearPane = lastSection.rearPane
            ;
            if (this.mobized) {
                this.sections[0].frontPane.prevPane = lastSectionFrontPane;
                this.sections[0].rearPane.prevPane = lastSectionRearPane;
                this.mobized = false;
            } else {
                this.sections[0].frontPane.prevPane = lastSectionRearPane;
                this.sections[0].rearPane.prevPane = lastSectionFrontPane;
                this.mobized = true;
            }
            this.sections[0].frontPane.prevPane.nextPane = this.sections[0].frontPane;
            this.sections[0].rearPane.prevPane.nextPane = this.sections[0].rearPane;
            this.element.style.pointerEvents = "auto";
            this.element.style.cursor = "pointer";
        }
    }
    return new Display();
}
function initialize() {
    canvasRoot.addEventListener("click", function(e) {
        display.strip.mobize();
    }, false);
    canvasRoot.addEventListener("transitionend", function(e) {
        const dataId = e.target.getAttribute("data-id")
        ;
        if ((e.propertyName == "transform") && e.target.classList.contains("lastPane")) {
            display.strip.switchPaneLinks();
            if (!display.strip.drawing) {
                display.addTask(display.strip, display.strip.draw, null, 1000);
            }
        } else if ((e.propertyName == "opacity") && (e.target.classList.contains("stripes")) && parseInt(e.target.style.opacity)) {
            display.background.fadeStripe();
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
    var interval = ts - priorTimestamp
    ,   priorObject = null
    ;
    priorTimestamp = ts;
    if (!display.currentTask && display.tasks.length) {
        display.currentTask = display.tasks.shift();
    }
    if (display.currentTask) {
        if (display.currentTask.delay) {
            display.currentTask.delay = Math.max(0, display.currentTask.delay - interval);
        } else if (display.colors.length && !display.deleting) {
            display.currentTask.action.apply(display.currentTask.object, display.currentTask.parameters);
            display.currentTask = null;
        }
    }
	animationId = window.requestAnimationFrame(animationLoop);
}
initialize();
})();
