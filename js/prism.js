(function() {
"use strict";
    
var requestAnimFrame = window.requestAnimationFrame || 
    window.mozRequestAnimationFrame || 
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;
    
var canvasRoot = document.querySelector(".canvas")
,   backgroundSource = document.querySelector("#backgroundSource")
,   frameRoot = document.querySelector("#frameRoot")
,   imageRoot = document.querySelector("#imageRoot")
,   imageInfo = document.querySelector(".imageInfo")
,   thumbRoot = document.querySelector("#thumbRoot")
,   thumbDock = document.querySelector("#thumbDock")
,   prisms = document.querySelector("#prisms")
,   animationId = null
,   priorTimestamp = 0
,   display = null
,   album = null
;
window.onload = function() {
    display = createDisplay();
    album = createAlbum();
    animationId = requestAnimFrame(animationLoop);
}
window.onresize = function() {
    display.initialize();
}
function createAlbum() {
    var xmlReader = new XMLHttpRequest() || new ActiveXObject('MSXML2.XMLHTTP')
    ,   earliestTimestamp = new Date(2004, 8, 7, 19, 52)
    ,   recentImageFilenames = []
    ,   Album = function() {
            this.images = [];
            this.loading = false;
            this.availableImages = [];
            this.imageLoadCount = 0;
            this.loadImages();
        }    
    ,   textParameter = getQueryVariable("text")
    ,   apiParameters = ""
    ;
    Album.prototype = {
        loadImages: function() {
            var timeUntilNow = Date.now() - earliestTimestamp.getTime()
            ,   randomTimestamp = new Date(earliestTimestamp.getTime() + (Math.random() * timeUntilNow))
            ,   feed = null
            ,   sizeConstraint = display.widthConstrained ?
                    ("&iiurlwidth=" + display.maxImageWidth) : ("&iiurlheight=" + display.maxImageHeight)
            ,   thisAlbum = this
            ,   imageCount = 10
            ,   imageinfo = null
            ,   strippedFilename = ""
            ;
            if (!this.loading && !this.imageLoadCount) {
                this.loading = true;
                recentImageFilenames = [];
                if (textParameter) {
                    apiParameters = "&generator=allimages&gaifrom=" + textParameter
                    textParameter = false;
                } else {
                    apiParameters = "&generator=allimages&gaisort=timestamp&gaistart=" + randomTimestamp.toISOString()
                }
                xmlReader.open("get.html",
                    "https://commons.wikimedia.org/w/api.php?action=query" + apiParameters + "&gailimit=" + imageCount +
                        "&prop=imageinfo&iiprop=url|size|extmetadata" + sizeConstraint +
                        "&format=json&formatversion=2&origin=*"
                    , true);
                xmlReader.setRequestHeader('Api-User-Agent','nullameragon.com/prism.html; nullameragon@gmail.com' );
                xmlReader.onreadystatechange = function() {
                    if (xmlReader.readyState == 4) {
                        feed = JSON.parse(xmlReader.responseText);
                        shuffle(feed.query.pages).forEach(function(page) {
                            if (page.imageinfo) {
                                imageinfo = page.imageinfo[0];
                                strippedFilename = imageinfo.descriptionurl.match(/File\:\S*\./)[0].replace(/[0-9]/g,"");
                                if (((imageinfo.height >= display.maxImageHeight) || (imageinfo.width >= display.maxImageWidth)) && 
                                    !recentImageFilenames.some(function(name) { return (name == strippedFilename); })) {
                                    createImage(thisAlbum, page, imageinfo);
                                    recentImageFilenames.push(strippedFilename);
                                }
                            }
                        });
                        thisAlbum.loading = false;
                    }
                }
                xmlReader.send(null);
            }
        }
    }
    return new Album();
}
function createBackground(display, number) {
    var newBarInterval = 1000
    ,   backgroundBarInterval = newBarInterval * display.backgroundCount
    ,   Background = function() {
            this.id = number;
            this.element = document.querySelector("#background" + number);
            this.element.setAttribute("data-id", this.id);
            this.context = this.element.getContext("2d");
            this.width = this.element.width = this.element.clientWidth;
            this.height = this.element.height = this.element.clientHeight;
            this.element.style.transition = "left linear " + (32 + (this.id * 8)) + "s"; 
            this.intervalSinceNewBar = this.id * newBarInterval;
            this.element.style.left = (this.id % 2) ? "0%" : "-20%";
            this.firstBar = this.lastBar = null;
        }
    ,   Bar = function(background) {
            this.background = background;
            this.color = "hsl(" + (display.stripesHueMin + (Math.random() * display.stripesHueRange)) + ", 50%, 50%)";
            this.width = Math.ceil(Math.random() * background.width/10);
            this.x = Math.round(Math.random() * (background.width - this.width));
            this.height = Math.ceil((0.6 + (Math.random() * 0.4)) * background.height);
            this.y = Math.round(Math.random() * (background.height - this.height));
            this.prevBar = background.lastBar;
            this.nextBar = null;
            if (background.lastBar) {
                background.lastBar.nextBar = this;
            } else {
                background.firstBar = this;
            }
            this.alpha = Math.random();
            this.drawCount = 20 + Math.ceil(Math.random() * 10);
        }
    ;
    Background.prototype = {
        draw: function(interval) {
            var currentBar = null
            ;
            this.intervalSinceNewBar += interval;
            if (this.intervalSinceNewBar > backgroundBarInterval) {
                this.intervalSinceNewBar %= backgroundBarInterval;
                this.lastBar = new Bar(this);
                this.context.fillStyle = "hsla(0, 100%, 100%, 0.5)";
                this.context.globalCompositeOperation = "destination-out";
                this.context.globalAlpha = 0.2;
                this.context.fillRect(0, 0, this.width, this.height);
            }
            currentBar = this.firstBar;
            while (currentBar) {
                currentBar.draw(interval);
                currentBar = currentBar.nextBar;
            }
        }    
    ,   reverse: function() {
            if (this.element.style.left == "0%") {
                this.element.style.left = "-20%";
            } else {
                this.element.style.left = "0%";
            }
        }
    }
    Bar.prototype = {
        delete: function() {
            if (this.prevBar) {
                this.prevBar.nextBar = this.nextBar;
            } else {
                this.background.firstBar = this.nextBar;
            }
            if (this.nextBar) {
                this.nextBar.prevBar = this.prevBar;
            } else {
                this.background.lastBar = this.prevBar;
            }
        }
    ,   draw: function(interval) {
            this.background.context.fillStyle = this.color;
            this.background.context.globalCompositeOperation = "destination-over";
            this.background.context.globalAlpha = 0.05;
            this.background.context.fillRect(this.x, this.y, this.width, this.height);
            if (this.drawCount-- <= 0) {
                this.delete();
            }
        }
    }
    return new Background();
}
function createDisplay() {
    var maxImageSize = 0.75
    ,   minWindPeriod = 2000
    ,   maxWindPeriod = 5000
    ,   periodRange = maxWindPeriod - minWindPeriod
    ,   minWindAmplitude = 0
    ,   maxWindAmplitude = 0.7
    ,   dockRetractTime = 15000
    ,   standardHues = [0, 30, 60, 120, 240, 270]
    ,   hueRanges = [90, 30, 30, 30, 120, 30, 90]
    ,   stripesHueRange = 0.5
    ,   backgroundHueIndex = Math.floor(Math.random() * standardHues.length)
    ,   stripesHueIndex = (backgroundHueIndex + ((Math.random() < 0.5) ? -1 : 1) + standardHues.length) % standardHues.length
    ,   hueOffset = (2 * Math.random()) - 1
    ,   backgroundHue = standardHues[backgroundHueIndex] +
            (hueOffset * ((hueOffset < 0) ? hueRanges[backgroundHueIndex] : hueRanges[backgroundHueIndex + 1]))
    ,   Display = function() {
            this.firstImage = this.lastImage = null;
            this.prismContext = prisms.getContext("2d");
            this.firstPrism = this.lastPrism = null;
            this.firstThumbnail = this.lastThumbnail = null;
            this.backgroundCount = 2;
            this.windPeriod = minWindPeriod + (Math.random() * periodRange);
            this.windAmplitude = Math.random() * maxWindAmplitude;
            this.windDuration = 0;
            this.stripesHueMin = standardHues[stripesHueIndex] + ((hueOffset - stripesHueRange) *
                ((hueOffset < 0) ? hueRanges[stripesHueIndex] : hueRanges[stripesHueIndex + 1]));
            this.stripesHueRange =
                Math.abs(2 * hueOffset * ((hueOffset < 0) ? hueRanges[stripesHueIndex] : hueRanges[stripesHueIndex + 1]));
            canvasRoot.style.backgroundImage = "linear-gradient(to right, lightgray, hsl(" + backgroundHue + ",50%,80%)";
            imageInfo.style.backgroundImage =
                "linear-gradient(hsl(" + this.stripesHueMin + ",50%,90%), hsl(" + this.stripesHueMin + ",50%,70%)";
            this.initialize();
        }
    Display.prototype = {
        draw: function(interval) {
            var currentImage = this.firstImage
            ,   currentPrism = this.firstPrism
            ,   currentThumbnail = this.firstThumbnail
            ,   windFactor = this.windFactor(interval)
            ;
            while (currentImage) {
                currentImage.draw();
                currentImage = currentImage.nextImage;
            }
            while (currentThumbnail) {
                currentThumbnail.draw();
                currentThumbnail = currentThumbnail.nextThumbnail;
            }
            this.prismContext.setTransform(1,0,0,1,0,0);
            this.prismContext.clearRect(0, 0, this.prismWidth, this.prismHeight);
            while (currentPrism) {
                currentPrism.draw(interval, windFactor);
                currentPrism = currentPrism.nextPrism;
            }
            this.backgrounds.forEach(function(background) { background.draw(interval); });
        }
    ,   initialize: function() {
            this.width = canvasRoot.clientWidth;
            this.height = canvasRoot.clientHeight;
            this.maxImageWidth = Math.round(canvasRoot.clientWidth * maxImageSize);
            this.maxImageHeight = Math.round(canvasRoot.clientHeight * maxImageSize);
            this.widthConstrained = ((this.maxImageWidth/this.maxImageHeight) < 1.0) ? true : false;
            this.prismWidth = this.prismContext.canvas.width = this.prismContext.canvas.clientWidth;
            this.prismHeight = this.prismContext.canvas.height = this.prismContext.canvas.clientHeight;
            this.targetPrismWidth = Math.max(100, Math.round(this.maxImageWidth/10))
            this.backgrounds = [];
            for (var i = 0; i < this.backgroundCount; i++) {
                this.backgrounds.push(createBackground(this, i));
            }
            this.middleX = Math.round(canvasRoot.clientWidth * 0.5);
            this.maxThumbHeight = Math.round(thumbDock.clientHeight/6);
            this.thumbGap = Math.round(thumbDock.clientHeight/60);
            this.mouseMovementID = null;
            this.resetRetraction();
        }
    ,   resetRetraction: function() {
            this.setDock(false);
            if (this.mouseMovementID) {
                clearTimeout(this.mouseMovementID);
            }
            (function(display) {
                display.mouseMovementID = setTimeout(function() { display.setDock(true); }, dockRetractTime);
            })(this);
        }
    ,   setDock: function(retract) {
            if (retract) {
                thumbDock.style.left = "0%";
                thumbDock.style.opacity = 0.3;
                this.mouseMovementID = null;
            } else {
                thumbDock.style.left = "5%";
                thumbDock.style.opacity = 1;
            }
        }
    ,   windFactor: function(interval) {
            if (this.windDuration > this.windPeriod) {
                this.windDuration %= this.windPeriod;
                this.windPeriod =
                    Math.max(minWindPeriod, Math.min(maxWindPeriod, (this.windPeriod + (Math.random() * 200) - 100)));
                this.windAmplitude =
                    Math.max(minWindAmplitude, Math.min(maxWindAmplitude, (this.windAmplitude + (Math.random() * 0.2) - 0.1)));
            }
            this.windDuration += interval;
            return (1 + (this.windAmplitude * Math.sin(2 * Math.PI * this.windDuration/this.windPeriod)));
        }
    }
    return new Display();
}
function createImage(album, page, imageinfo) {
    var reuseId = null
    ,   currentImage = null
    ,   PictureImage = function(album) {
            this.album = album;
            this.id = album.images.length;
            this.frame = frameRoot.parentNode.appendChild(frameRoot.cloneNode(true));
            this.frame.id = "frame" + this.id;
            this.frame.setAttribute("data-id", this.id);
            this.frame.style.transition = "left ease-out 0.1s";
            this.element = this.frame.firstElementChild;
            this.element.id = "image" + this.id;
            this.element.setAttribute("data-id", this.id);
            this.element.crossOrigin = "anonymous"
            this.element.style.transition = "opacity ease-in-out 3s";
            this.thumbnail = createThumbnail(this);
            (function(image) {
                image.element.addEventListener("load", function(e) {
                    image.album.imageLoadCount--;
                    image.thumbnail.dock();
                }, false);
            })(this);
        }
    ;
    PictureImage.prototype = {
        deactivate: function() {
            this.album.availableImages.push(this.id);
        }
    ,   dequeue: function() {
            this.element.style.pointerEvents = "none";
            this.element.style.cursor = "default";
            if (this.prevImage) {
                this.prevImage.nextImage = this.nextImage;
            } else {
                display.firstImage = this.nextImage;
            }
            if (this.nextImage) {
                this.nextImage.prevImage = this.prevImage;
            } else {
                display.lastImage = this.prevImage;
            }
            if (!this.prismCount) {
                this.deactivate();
            }
        }
    ,   divide: function() {
            this.prisms.forEach(function(prism) { prism.toMove = true; });
            (function(image) {
                setTimeout(function() { image.dequeue = true; }, 3000);
            })(this);
        }
    ,   draw: function(interval) {
            this.timeSinceActivity += interval;
            if (this.unfreezing) {
                imageInfo.style.opacity = 0;
                imageInfo.style.pointerEvents = "none";
                this.element.style.opacity = 0;
                this.unfreezing = this.frozen = this.freezing = false;
            } else if (this.frozen) {
                ;
            } else if (this.freezing) {
                this.frozen = true;
                imageInfo.style.opacity = 1;
                imageInfo.style.pointerEvents = "auto";
                this.element.style.opacity = 1;
            } else if (this.dequeueing) {
                this.dequeue();
            } else if (this.retire) {
                ;
            } else if (this.movePrisms) {
                this.retire = true;
                this.prisms.forEach(function(prism) { prism.toMove = true; });
                (function(image) {
                    setTimeout(function() { image.dequeueing = true; }, 2000);
                })(this);
            } else if (this.deleting) {
                if (this.timeSinceActivity > 1000) {
                    if (parseInt(this.element.style.opacity)) {
                        this.deleting = false;
                    } else {
                        this.movePrisms = true;
                    }
                    this.timeSinceActivity = 0;
                }
            } else if (this.visible) {
                if (this.generatedPrisms) {
                    this.deleting = true;
                    this.element.style.transitionTimingFunction = "ease-out";
                    this.element.style.transitionDelay = "0s";
                    this.element.style.transitionDuration = "0.5s";
                    this.element.style.opacity = 0;
                    this.timeSinceActivity = 0;
                }
            } else if (this.makePrisms) {
                this.visible = true;
                this.generatePrisms();
            } else if (this.appearing) {
                if (this.timeSinceActivity > 3500) {
                    if (parseInt(this.element.style.opacity)) {
                        this.makePrisms = true;
                    } else {
                        this.appearing = false;
                    }
                    this.timeSinceActivity = 0;
                }
            } else if (this.toAppear) {
                this.appearing = true;
                this.frame.style.transitionDuration = "3s";
                this.frame.style.left = this.frameX + "px";
                this.element.style.transitionTimingFunction = "ease-out";
                this.element.style.transitionDelay = "0s";
                this.element.style.transitionDuration = "3s";
                this.element.style.opacity = 0.8;
                this.timeSinceActivity = 0;
                this.thumbnail.toDelete = true;
                this.element.style.pointerEvents = "auto";
                this.element.style.cursor = "pointer";
            } else {
                this.toAppear = true;
            }
        }
    ,   generatePrisms: function() {
            var prismCount = Math.max(6, Math.min(10, Math.round(this.element.clientWidth/display.targetPrismWidth)))
            ,   widths = shuffle(partitionRange(this.element.clientWidth, prismCount, 1.7))
            ,   x = 0
            ,   offset = 0
            ;
            for (var i = 0; i < prismCount; i++) {
                offset = i ? Math.round(Math.random() * widths[i - 1]) : 0;
                display.lastPrism = createPrism(this, (x - offset), (widths[i] + offset));
                this.prisms.push(display.lastPrism);
                x += widths[i];
            }
            this.generatedPrisms = true;
        }
    ,   initialize: function(page, imageinfo) {
            this.page = page;
            this.imageinfo = imageinfo;
            this.frame.style.transitionDuration = "0.1s";
            this.element.src = imageinfo.thumburl;
            if (imageinfo.thumbwidth > display.maxImageWidth) {
                this.scale = display.maxImageWidth/imageinfo.thumbwidth;
                this.element.style.width = display.maxImageWidth + "px";
                this.element.style.height = Math.round(imageinfo.thumbheight * this.scale) + "px";
            } else if (imageinfo.thumbheight > display.maxImageHeight) {
                this.scale = display.maxImageHeight/imageinfo.thumbheight;
                this.element.style.height = display.maxImageHeight + "px";
                this.element.style.width = Math.round(imageinfo.thumbwidth * this.scale) + "px";
            } else {
                this.scale = 0.8 + (Math.random() * 0.2);
                this.element.style.width = Math.round(imageinfo.thumbwidth * this.scale) + "px";
                this.element.style.height = Math.round(imageinfo.thumbheight * this.scale) + "px";
            }
            this.x = Math.round(Math.random() * (display.width - this.element.clientWidth));
            this.y = Math.round(Math.random() * (display.height - this.element.clientHeight));
            this.frameX = this.x + Math.floor(this.element.clientWidth/2);
            this.frame.style.left = (this.frameX + ((Math.random() > 0.5) ? -1 : 1) * Math.floor(display.width/2)) + "px";
            this.frame.style.top = (this.y + Math.floor(this.element.clientHeight/2)) + "px";
            this.frozen = this.freezing = this.unfreezing = false;
            this.prismCount = 0;
            this.prevImage = this.nextImage = null;
            this.toAppear = false;
            this.appearing = false;
            this.makePrisms = false;
            this.visible = false;
            this.deleting = false;
            this.generatedPrisms = false;
            this.movePrisms = false;
            this.retire = false;
            this.dequeueing = false;
            this.prisms = [];
            this.timeSinceActivity = 0;
            this.thumbnail.initialize();
        }
    ,   queue: function() {
            if (display.firstImage && display.firstImage.frozen) {
                display.firstImage.unfreezing = true;
            }
            this.prevImage = display.lastImage;
            this.nextImage = null;
            if (display.lastImage) {
                display.lastImage.nextImage = this;
            } else {
                display.firstImage = this;
            }
            display.lastImage = this;
            this.thumbnail.highlight();
        }
    ,   toggleFreeze: function() {
            var currentImage = display.firstImage
            ;
            if (this.frozen) {
                this.unfreezing = true;
            } else {
                while (currentImage) {
                    if (currentImage.frozen) {
                        currentImage.unfreezing = true;
                    }
                    currentImage = currentImage.nextImage;
                }
                this.freezing = true;
                imageInfo.innerHTML =
                    (this.imageinfo.extmetadata.ImageDescription ?
                        this.imageinfo.extmetadata.ImageDescription.value.link(
                            this.imageinfo.descriptionshorturl) :
                        (this.imageinfo.extmetadata.ObjectName ? this.imageinfo.extmetadata.ObjectName.value.link(
                            this.imageinfo.descriptionshorturl) :
                        "no description".link(this.imageinfo.descriptionshorturl))) + " (" +
                    (this.imageinfo.extmetadata.Artist ?
                        this.imageinfo.extmetadata.Artist.value : "no author provided") + ") " +
                    (this.imageinfo.extmetadata.LicenseShortName ?
                        (this.imageinfo.extmetadata.LicenseUrl ?
                            this.imageinfo.extmetadata.LicenseShortName.value.link(
                                this.imageinfo.extmetadata.LicenseUrl.value) :
                            this.imageinfo.extmetadata.LicenseShortName.value) : "");
            }
        }
    }
    album.imageLoadCount++;
    reuseId = album.availableImages.pop();
    if (reuseId) {
        currentImage = album.images[reuseId]
    } else {
        currentImage = new PictureImage(album);
        album.images.push(currentImage);
    }
    currentImage.initialize(page, imageinfo);
}
function createPrism(image, x, width) {
    var minPeriod = 15000
    ,   maxPeriod = 25000
    ,   beginAlpha = 0.8
    ,   periodRange = maxPeriod - minPeriod
    ,   Prism = function(image, x, width) {
            this.image = image;
            this.image.prismCount++;
            this.prevPrism = display.lastPrism;
            this.nextPrism = null;
            if (display.lastPrism) {
                display.lastPrism.nextPrism = this;
            } else {
                display.firstPrism = this;
            }
            this.targetY = this.image.y;
            this.targetLeft = this.image.x + x;
            this.targetWidth = width;
            this.targetHeight = this.image.element.clientHeight;
            this.sourceX = Math.round(x/this.image.scale);
            this.sourceWidth = Math.round(this.targetWidth/this.image.scale);
            this.sourceHeight = Math.round(this.targetHeight/this.image.scale);
            this.targetX = -1 * Math.floor(Math.random() * this.targetWidth);
            this.targetAxis = this.targetLeft - this.targetX;
            this.toMove = false;
            this.moving = false;
            this.period = minPeriod + (Math.random() * periodRange);
            this.axisRate = ((Math.random() < 0.5) ? (-1 * this.targetAxis) : (display.maxImageWidth - this.targetAxis))/
                this.period;
            this.rotation = Math.PI/Math.ceil(Math.random() * 4);
            this.rotationRate = this.rotation/this.period;
            this.alphaRate = beginAlpha/this.period;
            this.moveDelay = (Math.random() * 500);
            this.timeFactor = 0;
            this.easingDuration = 0;
        }
    ,   minReflectAngle = 0.3
    ,   maxReflectAngle = 0.35
    ,   reflectAngleRange = maxReflectAngle - minReflectAngle
    ,   rotation = 0
    ,   xScale = 1
    ,   offset = 0
    ,   alpha = 1
    ,   easingCutoff = 500
    ,   adjustedInterval = 0
    ;
    Prism.prototype = {
        delete: function() {
            if (--this.image.prismCount <= 0) {
                this.image.deactivate();
            }
            if (this.prevPrism) {
                this.prevPrism.nextPrism = this.nextPrism;
            } else {
                display.firstPrism = this.nextPrism;
            }
            if (this.nextPrism) {
                this.nextPrism.prevPrism = this.prevPrism;
            } else {
                display.lastPrism = this.prevPrism;
            }
        }
    ,   draw: function(interval, windFactor) {
            if (this.moving) {
                adjustedInterval = interval * windFactor;
                if (this.easingDuration < easingCutoff) {
                    this.easingDuration += adjustedInterval;
                    adjustedInterval *= Math.pow(this.easingDuration/easingCutoff, 2);
                }
                this.timeFactor += adjustedInterval;
                offset = this.axisRate * this.timeFactor;
                rotation = this.rotationRate * this.timeFactor;
                xScale = Math.cos(rotation);
                alpha = beginAlpha - (this.alphaRate * this.timeFactor);
                if (alpha <= 0.05) {
                    this.delete();
                }
            } else if (this.toMove) {
                this.moveDelay -= interval;
                alpha = beginAlpha;
                if (this.moveDelay <= 0) {
                    this.moving = true;
                }
            } else {
                alpha = beginAlpha;
            }
            display.prismContext.setTransform(1,0,0,1,0,0);
            display.prismContext.globalAlpha = alpha;
            display.prismContext.translate((this.targetAxis + offset), this.targetY);
            display.prismContext.scale(xScale, 1);
            display.prismContext.globalCompositeOperation = "source-over";
            display.prismContext.drawImage
                (this.image.element, this.sourceX, 0, this.sourceWidth, this.sourceHeight,
                 this.targetX, 0, this.targetWidth, this.targetHeight);
            if ((rotation >= minReflectAngle) && (rotation <= maxReflectAngle)) {
                display.prismContext.fillStyle = "hsl(0, 0%, 0%)"
                display.prismContext.globalAlpha = 0.2;
                display.prismContext.globalCompositeOperation = "destination-out";
                display.prismContext.fillRect
                    (Math.round(this.targetWidth * (maxReflectAngle - rotation)/reflectAngleRange) + this.targetX,
                     0, 15, this.targetHeight)
            }
        }
    }
    return new Prism(image, x, width);
}
function createThumbnail(image) {
    var Thumbnail = function(image) {
            this.image = image;
            this.context = thumbDock.appendChild(thumbRoot.cloneNode(false)).getContext("2d");
            this.element = this.context.canvas;
            this.element.id = "thumbnail" + this.image.id;
            this.element.setAttribute("data-id", this.image.id);
            this.prevThumbnail = this.nextThumbnail = null;
        }
    ;
    Thumbnail.prototype = {
        deactivate: function() {
            var currentThumbnail = this.nextThumbnail
            ;
            this.element.style.left = "-50%";
            this.element.style.zIndex = 4;
            if (this.prevThumbnail) {
                this.prevThumbnail.nextThumbnail = this.nextThumbnail;
            } else {
                display.firstThumbnail = this.nextThumbnail;
            }
            if (this.nextThumbnail) {
                this.nextThumbnail.prevThumbnail = this.prevThumbnail;
            } else {
                display.lastThumbnail = this.prevThumbnail;
            }
            this.prevThumbnail = this.nextThumbnail = null;
            while (currentThumbnail) {
                currentThumbnail.dock();
                currentThumbnail = currentThumbnail.nextThumbnail;
            }
            if (!display.lastThumbnail || display.lastThumbnail.toAppear) {
                album.loadImages();
            }
        }
    ,   dock: function() {
            if (!this.docked) {
                this.docked = true;
                this.prevThumbnail = display.lastThumbnail;
                this.nextThumbnail = null;
                if (display.lastThumbnail) {
                    display.lastThumbnail.nextThumbnail = this;
                } else {
                    display.firstThumbnail = this;
                }
                display.lastThumbnail = this;
            }
            if (this.prevThumbnail) {
                this.dockTop = this.prevThumbnail.dockBottom + display.thumbGap;
            } else {
                this.dockTop = display.thumbGap;
            }
            this.dockBottom = this.dockTop + this.element.height;
            if ((this.dockBottom + display.thumbGap) < thumbDock.clientHeight) {
                this.element.style.top = this.dockTop + "px";
                this.toAppear = true;
            }
        }
    ,   draw: function() {
            if (this.deleting) {
                ;
            } else if (this.toDelete) {
                this.deleting = true;
                this.element.style.opacity = 0;
                this.element.style.zIndex = 3;
                this.element.style.left = "100%";
            } else if (this.visible) {
                ;
            } else if (this.appearing) {
                ;
            } else if (this.toAppear) {
                this.appearing = true;
                this.context.setTransform(1,0,0,1,0,0);
                this.context.globalAlpha = 1;
                this.context.globalCompositeOperation = "source-over";
                this.context.clearRect(0, 0, this.element.width, this.element.height);
                this.context.drawImage (this.image.element,
                    0, 0, this.image.element.clientWidth, this.image.element.clientHeight,
                    0, 0, this.element.width, this.element.height);
                this.element.style.opacity = 1;
                this.element.style.left = "50%";
                this.element.style.cursor = "pointer";
                this.element.style.pointerEvents = "auto";
            }
        }
    ,   highlight: function() {
            this.element.style.borderColor = "green";
            this.element.style.cursor = "default";
            this.element.style.pointerEvents = "none";
        }
    ,   initialize: function() {
            this.element.style.borderColor = "white";
            this.element.style.cursor = "pointer";
            this.element.style.pointerEvents = "auto";
            if ((thumbDock.clientWidth * this.image.element.clientHeight/this.image.element.clientWidth) >
                display.maxThumbHeight) {
                this.element.height = display.maxThumbHeight;
                this.element.width =
                    Math.round(this.element.height * this.image.element.clientWidth/this.image.element.clientHeight);
            } else {
                this.element.width = Math.round(thumbDock.clientWidth);
                this.element.height =
                    Math.round(this.element.width * this.image.element.clientHeight/this.image.element.clientWidth);
            }
            this.element.style.width = this.element.width + "px";
            this.element.style.height = this.element.height + "px";
            this.element.style.top = "50%";
            this.toAppear = false;
            this.appearing = false;
            this.visible = false;
            this.toDelete = false;
            this.deleting = false;
            this.docked = false;
        }
    }
    return new Thumbnail(image);
}
function getQueryVariable(variable) {
       var query = window.location.search.substring(1);
       var vars = query.split("&");
       for (var i = 0; i < vars.length; i++) {
               var pair = vars[i].split("=");
               if (pair[0] == variable) { return pair[1]; }
       }
       return(false);
}
function initialize() {
    var targetImage = null
    ;
    canvasRoot.addEventListener("click", function(e) {
        targetImage = album.images[e.target.getAttribute("data-id")];
		if (e.target.classList.contains("thumbnail")) {
            targetImage.queue();
        } else if (e.target.classList.contains("pictureImage")) {
            targetImage.toggleFreeze();
        }
    }, false);
    thumbDock.addEventListener("mouseover", function(e) {
        display.resetRetraction();
    }, false);
    canvasRoot.addEventListener("transitionend", function(e) {
        targetImage = album.images[e.target.getAttribute("data-id")];
		if ((e.propertyName == "opacity") && (e.target.classList.contains("pictureImage"))) {
            if (targetImage.deleting) {
                targetImage.movePrisms = true;
            } else if (targetImage.appearing) {
                targetImage.makePrisms = true;
            }
        } else if ((e.propertyName == "opacity") && (e.target.classList.contains("thumbnail"))) {
            if (targetImage.thumbnail.deleting) {
                targetImage.thumbnail.deactivate();
            } else if (targetImage.thumbnail.appearing) {
                targetImage.thumbnail.visible = true;
            }
        } else if ((e.propertyName == "left") && (e.target.classList.contains("background"))) {
            display.backgrounds[e.target.getAttribute("data-id")].reverse();
        }
    }, false);
}
function partitionRange(total, numberOfPartitions, distributionFactor) {
    var totalRemaining = Math.max(0, total)
    ,   partitionsRemaining = Math.max(1, numberOfPartitions)
    ,   partitionMidpoint = Math.round(totalRemaining/partitionsRemaining)
    ,   range = Math.round(partitionMidpoint/Math.max(1, distributionFactor))
    ,   minPartition = partitionMidpoint - range
    ,   maxPartition = partitionMidpoint + range
    ,   partitions = []
    ;
    if (!totalRemaining || !partitionsRemaining) {
        partitions.push(total);
    } else {
        do {
            if (partitionsRemaining > 1) {
                partitionMidpoint = Math.round(totalRemaining/partitionsRemaining)
                range = Math.min(maxPartition - partitionMidpoint, partitionMidpoint - minPartition);
                partitions.push(partitionMidpoint + Math.round((0.5 - Math.random()) * range));
            } else {
                partitions.push(totalRemaining);
            }
            totalRemaining -= partitions[partitions.length - 1];
            partitionsRemaining--;
        } while (partitionsRemaining)
    }
    return partitions;
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
    ;
    priorTimestamp = ts;
    if (!display.firstImage && display.firstThumbnail && display.firstThumbnail.visible) {
        display.firstThumbnail.image.queue();
    }
    display.draw(interval);
	animationId = requestAnimFrame(animationLoop);
}
initialize();
})();
