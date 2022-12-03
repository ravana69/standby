(function() {
"use strict";
    
var requestAnimFrame = window.requestAnimationFrame || 
    window.mozRequestAnimationFrame || 
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;
    
var canvasRoot = document.querySelector(".canvas")
,   animationId = null
,   chosenText = null
,   screenHeight = 0
,   screenWidth = 0
,   fabricCount = 0
,   frames = []
,   pathCount = 0
,   ribbonCount = 0
,   pieceCount = 0
,   letterCount = 0
,   stampCount = 0
,   priorTimestamp = 0
,   firstAvailablePhraseCanvas = null
,   lastAvailablePhraseCanvas = null
,   readingPace = 0.002
,   minFontSize = 36
,   outlineFontLimit = 52
,   intersectionCount = 0
,   testCount = 0
,   firstFabric = null
,   lastFabric = null
,   newsAPIKey = "01ada25162164e9ea7fdd9c91d4e8e3f"
//,   useNewsFeed = null
,   newsAPILogo = document.querySelector("#newsapi")
;
window.onload = function() {
	proportionElements();
    animationId = requestAnimFrame(animationLoop);
}
window.onresize = function() {
    proportionElements();
    chosenText && chosenText.delete();
    //useNewsFeed = null;
    chosenText = createText(chosenText.source, chosenText.index);
}
function createFabric(text) {
    var pathRows = []
    ,   pathColumns = []
    ,   priorFetchedPath = null
    ,   Fabric = function(text) {
            var rows = []
            ,   columns = []
            ,   avgPathWidth = (screenHeight + screenWidth)/16
            ,   numRows = Math.round(screenHeight/avgPathWidth)
            ,   numColumns = Math.round(screenWidth/avgPathWidth)
            ,   usePhrase = null
            ;
            this.id = fabricCount++;
            this.text = text;

            this.firstAvailableRow = this.lastAvailableRow = null;
            this.firstAvailableColumn = this.lastAvailableColumn = null;
            this.firstActiveIntersection = this.lastActiveIntersection = null;
            this.activeIntersectionCount = 0;
            if (!text.priorPhrase) {
                this.currentPhrase = text.rootPhrase;
                this.pathFrame = createFrame(this, true);
                this.onlyRows = true;
            } else {
                usePhrase = text.priorPhrase;
                while (!usePhrase.title) {
                    usePhrase = usePhrase.parent;
                }
                this.currentPhrase = usePhrase.children[Math.floor(Math.random() * usePhrase.children.length)];
                this.backFrame = createFrame(this, false);
                this.pathFrame = createFrame(this, true);
                this.foreFrame = createFrame(this, false);
                this.onlyRows = false;
            }
            this.phraseLine = 0;
            columns = createPaths(this, numColumns, false);
            rows = createPaths(this, numRows, true);
            this.intersections = createIntersections(rows, columns);
            this.availableIntersections = this.intersections.length;
            shuffle(rows).forEach( function(row) { row.return(); });
            shuffle(columns).forEach( function(column) { column.return(); });
            this.minGap = Math.max(2, Math.floor(avgPathWidth/10));
            this.maxGap = Math.max(25, Math.floor(avgPathWidth/5));
            this.firstRibbon = this.lastRibbon = null;
            this.firstStamp = this.lastStamp = null;
            this.hue = [];
            this.saturation = [10, 20, 30, 40, 50];
            this.luminosity = [40, 50, 60, 70, 80];
            this.hue.push(text.hue + ((Math.random() - 0.5) * 120));
            for (var i = 0; i < 5; i++) { this.hue.push(this.hue[i] + 10); }
            this.complementHue = (Math.random() < 0.5 ? -1 : 1) * (120 + Math.round(Math.random() + 60));
            
            this.prevFabric = lastFabric || null;
            this.nextFabric = null;
            if (!firstFabric) {
                firstFabric = this;
            }
            if (lastFabric) {
                lastFabric.nextFabric = this;
            }
            
            this.addRibbonId = this.addRibbon = null;
            this.deleting = this.fadeFrames = false;
            this.onscreenLetters = 0;
            this.scheduleAddRibbon();
        }
    ;
    Fabric.prototype.activeDensity = function() {
        return this.activeIntersectionCount/this.availableIntersections;
    }
    Fabric.prototype.delete = function() {
        if (!this.deleting) {
            this.deleting = true;
            clearTimeout(this.addRibbonId);
            
            (function(fabric) {
                setTimeout(function() {
                    !fabric.pathFrame || fabric.pathFrame.delete();
                    !fabric.foreFrame || fabric.foreFrame.delete();
                    !fabric.backFrame || fabric.backFrame.delete();
                }, 1000)
            })(this);
            
            (function(text) {
                setTimeout(function() { lastFabric = createFabric(text); }, 2000)
            })(this.text);
        }
    }
    Fabric.prototype.draw = function(interval) {
        var usePhrase = null
        ,   availablePath = null
        ,   currentRibbon = this.firstRibbon
        ,   currentIntersection = this.firstActiveIntersection
        ,   currentStamp = this.firstStamp
        ,   nonFrozen = false
        ;
        if (this.addRibbon) {
            if (this.currentPhrase) {
                availablePath = this.fetchNextAvailablePath();
                if (availablePath) {
                    this.lastRibbon = createRibbon(availablePath, this.currentPhrase);
                    this.currentPhrase = this.text.fetchNextPhrase(this.currentPhrase);
                } else {
                    while (currentRibbon && !nonFrozen) {
                        nonFrozen = (currentRibbon.speed > 0);
                        currentRibbon = currentRibbon.nextRibbon;
                    }
                    currentRibbon = this.firstRibbon
                    if (!nonFrozen) {
                        this.delete()
                    }
                }
            } else {
            }
            this.scheduleAddRibbon();
        }
        if (!this.deleting && !this.currentPhrase) {
            this.delete();
        }
        
        while (currentRibbon) {
            currentRibbon.advance(interval);
            currentRibbon = currentRibbon.nextRibbon;
        }
        while (currentIntersection) {
            currentIntersection.draw();
            currentIntersection = currentIntersection.nextActiveIntersection;
        }
        if (this.fadeFrames) {
            this.fadeFrames = false;
            this.foreFrame.fade();
            this.backFrame.fade();
            (function(fabric) {
                setTimeout(function() { fabric.fadeFrames = true; }, 1000)
            })(this);
        }
        while (currentStamp) {
            currentStamp.draw();
            currentStamp = currentStamp.nextStamp;
        }
    }
    Fabric.prototype.fetchNextAvailablePath = function(otherType) {
        var path = null
        ;
        if (this.onlyRows || !priorFetchedPath || (!priorFetchedPath.isRow && !otherType)) {
            if (this.firstAvailableRow) {
                priorFetchedPath = this.firstAvailableRow;
                return this.firstAvailableRow.use();
            } else if (!otherType) {
                return this.fetchNextAvailablePath(true);
            } else {
                return null;
            }
        } else {
            if (this.firstAvailableColumn) {
                priorFetchedPath = this.firstAvailableColumn;
                return this.firstAvailableColumn.use();
            } else if (!otherType) {
                return this.fetchNextAvailablePath(true);
            } else {
                return null;
            }
        }
    }
    Fabric.prototype.findIntersection = function(x, y) {
        var match = this.intersections.filter(function(i) {
            return (i.x <= x) && (i.y <= y) && ((i.x + i.height) > x) && ((i.y + i.width) > y) });
        if (match) {
            return match[0];
        } else {
            return null;
        }
    }
    Fabric.prototype.scheduleAddRibbon = function() {
        var baseDelay = 1000
        ,   levelFactor = 1
        ,   intersectionCountFactor =
            (!this.text.priorPhrase || this.text.priorPhrase.children.length) ? 1 : Math.max(0.2, Math.sqrt(this.activeDensity()))
        ;
        if (this.text.priorPhrase && this.currentPhrase && (this.currentPhrase.level != this.text.priorPhrase.level)) {
            levelFactor += 0.5;
        }
        this.addRibbon = false;
        if (!this.deleting) {
            (function(fabric, delay) {
                fabric.addRibbonId = setTimeout(function() { fabric.addRibbon = true; }, delay);
            })(this, levelFactor * intersectionCountFactor * baseDelay);
        }
    }
    Fabric.prototype.setBackground = function() {
        var background = document.querySelector("#background")
        ,   hue = this.hue[0]
        ,   saturation = this.saturation[this.currentPhrase.title ? this.saturation.length - 1 : 0]
        ,   topLuminosity = this.luminosity[0]
        ,   bottomLuminosity = this.luminosity[this.luminosity.length - 1]
        ,   topColor = "hsl(" + hue + ", " + saturation + "%, " + topLuminosity + "%)"
        ,   bottomColor = "hsl(" + (hue + this.complementHue) + ", " + saturation + "%, " + bottomLuminosity + "%)"
        ,   backgroundImage = "radial-gradient(ellipse farthest-side at top " +
                ((Math.random() < 0.5) ? "left " : "right ") + ", " + 
                topColor + ", " + bottomColor + ")"
        ;
        if (parseInt(background.style.opacity) || (background.style.opacity == "")) {
            canvasRoot.style.backgroundImage = backgroundImage;
            background.style.opacity = 0;
        } else {
            background.style.backgroundImage = backgroundImage;
            background.style.opacity = 1;
        }
        return this;
    }
    if (!text.deleting) {
        return new Fabric(text).setBackground();
    } else {
        return lastFabric;
    }
}
function createFrame(fabric, forPaths) {
    var frameRoot = document.querySelector("#frameRoot")
    ,   Frame = function(fabric, forPaths) {
            var driftRate = forPaths ? 0 : ((Math.random() > 0.5 ? -1 : 1) * (15 + (Math.random() * 10)))
            ;
            this.id = frames.length;
            this.fabric = fabric;
            this.context = frameRoot.parentNode.appendChild(frameRoot.cloneNode(false)).getContext("2d");
            this.context.canvas.id = "frame" + this.id;
            this.context.canvas.setAttribute("data-id",this.id);
            this.context.canvas.width = screenWidth;
            this.context.canvas.height = screenHeight * (1 + Math.abs(driftRate/100));
            if (driftRate > 0) {
                this.context.canvas.style.top = (driftRate * -1) + "%";
            } else {
                this.context.canvas.style.top = "0%";
            }
            this.driftRate = driftRate;
            this.driftFrame = false;
            this.forPaths = forPaths;
        }
    ;
    Frame.prototype.delete = function() {
        this.context.canvas.style.opacity = 0;
    }
    Frame.prototype.fade = function() {
        this.context.globalCompositeOperation = "destination-out";
        this.context.globalAlpha = 0.1;
        this.context.fillStyle = "hsla(0, 100%, 100%, 0.5)";
        this.context.setTransform(1,0,0,1,0,0);      
        this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
    }
    Frame.prototype.drift = function() {
        if (!this.driftFrame) {
            this.driftFrame = true;
            this.context.canvas.style.transform = "translate3d(0px," + this.driftRate + "%, 0px)";
        }
    }
    Frame.prototype.yOffset = function() {
        var computedStyle = window.getComputedStyle(this.context.canvas,null)
        ,   top = computedStyle.getPropertyValue("top")
        ,   transform = computedStyle.getPropertyValue("transform")
        ,   topOffset = (parseFloat(top) * this.context.canvas.height/100) || 0
        ;
        if (!transform.search(/matrix\(/)) {
            topOffset += parseFloat(transform.split(/[\(\),]/)[6]);
        }
        return topOffset;
    }
    return frames[frames.push(new Frame(fabric, forPaths)) - 1];
}
function createHeadline (text, givenText) {
    var priorHeadline = null
    ,   Headline = function(text, givenText) {
            this.text = text;
            this.nextPhrase = null;
            this.children = [];
            if (!text.rootPhrase) {
                givenText = "Current headlines " + ((givenText == "general") ? "" : "(" + givenText + ")");
                this.level = 0;
                this.parent = null;
                this.title = true;
            } else {
                this.level = 1;
                this.parent = text.rootPhrase;
                this.title = false;
                if (priorHeadline && priorHeadline.level) {
                    priorHeadline.nextPhrase = this;
                }
            }
            this.start = text.fullText.length;
            this.end = this.start + givenText.length;
            text.fullText += givenText;
            this.lineCount = 1;
            this.currentLine = 0;
            priorHeadline = this;
        }
    ;
    Headline.prototype.append = function(givenText) {
        this.children.push(new Headline(this.text, givenText))
    }
    Headline.prototype.string = function() {
        return this.text.fullText.substring(this.start, this.end).trim();
    }
    return new Headline (text, givenText);
}
function createIntersections(pathRows, pathColumns) {
    var intersections = []
    ,   evenOnTop = Math.random() < 0.5 ? 0 : 1
    ,   IntersectionPiece = function(path) {
            this.path = path;
            this.width = path.width;
            this.prevIntersection = this.nextIntersection = null;
            this.ribbonPiece = null;
        }
    ,   Intersection = function (row, column) {
            this.id = intersectionCount++;
            this.fabric = row.fabric;
            this.x = column.position;
            this.y = row.position;
            this.width = column.width;
            this.height = row.width;
            if ((row.order + column.order + evenOnTop) % 2) {
                this.row = this.top = new IntersectionPiece(row)
                this.column = this.bottom = new IntersectionPiece(column)
            } else {
                this.column = this.top = new IntersectionPiece(column)
                this.row = this.bottom = new IntersectionPiece(row)
            }
            this.centerX = Math.round(this.x + (this.width/2));
            this.centerY = Math.round(this.y + (this.height/2));
            this.nextActiveIntersection = this.prevActiveIntersection = null;
            this.active = false;
        }
    ,   currentIndex = 0
    ;
    Intersection.prototype.activate = function() {
        if (!this.active) {
            if (this.fabric.lastActiveIntersection) {
                this.prevActiveIntersection = this.fabric.lastActiveIntersection;
                this.fabric.lastActiveIntersection = this.fabric.lastActiveIntersection.nextActiveIntersection = this;
            } else {
                this.fabric.firstActiveIntersection = this.fabric.lastActiveIntersection = this;
            }
            this.active = true;
            this.fabric.activeIntersectionCount++;
        }
    }
    Intersection.prototype.assignPiece = function(piece) {
        if (piece.ribbon.path.isRow) {
            if (!this.row.ribbonPiece) {
                this.row.ribbonPiece = piece;
                this.activate();
            //} else {
            //    console.log(Date.now() + ": error in row assignPiece for " + this.id);
            }
        } else {
            if (!this.column.ribbonPiece) {
                this.column.ribbonPiece = piece;
                this.activate();
            //} else {
            //    console.log(Date.now() + ": error in column assignPiece for " + this.id);
            }
        }
    }
    Intersection.prototype.deactivate = function() {
        if (!this.row.ribbonPiece && !this.column.ribbonPiece && this.active) {
            if (this.prevActiveIntersection) {
                this.prevActiveIntersection.nextActiveIntersection = this.nextActiveIntersection;
            } else {
                this.fabric.firstActiveIntersection = this.nextActiveIntersection;
            }
            if (this.nextActiveIntersection) {
                this.nextActiveIntersection.prevActiveIntersection = this.prevActiveIntersection;
            } else {
                this.fabric.lastActiveIntersection = this.prevActiveIntersection;
            }
            this.prevActiveIntersection = this.nextActiveIntersection = null;
            this.active = false;
            this.fabric.activeIntersectionCount--;
        }
    }
    Intersection.prototype.deassignPiece = function(piece) {
        if (piece.ribbon.path.isRow && this.row.ribbonPiece) {
            this.row.ribbonPiece = null;
            this.deactivate();
        } else if (!piece.ribbon.path.isRow && this.column.ribbonPiece) {
            this.column.ribbonPiece = null;
            this.deactivate();
        //} else {
        //    console.log(Date.now() + ": error in deassignPiece for " + this.id);
        }
    }
    Intersection.prototype.draw = function() {
        this.fabric.pathFrame.context.clearRect(this.x, this.y, this.width, this.height);
        this.drawPiece(this.bottom.ribbonPiece);
        this.drawPiece(this.top.ribbonPiece);
    }
    Intersection.prototype.drawPiece = function(piece) {
        if (piece) {
            if (piece.active) {
                piece.draw(this);
            } else {
                this.deassignPiece(piece);
            }
        }
    }
    Intersection.prototype.spark = function(useRow, x, y) {
        var piece = null
        ,   letterX = 0
        ,   letterY = 0
        ,   letterWidth = 0
        ,   letterHeight = 0
        ,   screenX = 0
        ,   screenY = 0
        ,   screenWidth = 0
        ,   screenHeight = 0
        ,   hue = Math.floor(Math.random() * this.fabric.hue.length)
        ,   saturation = this.fabric.saturation.length - 1
        ,   luminosity = Math.floor(Math.random() * this.fabric.luminosity.length)
        ,   fontSize = 0
        ,   centerX = 0
        ,   centerY = 0
        ,   maxWidth = 0
        ,   maxHeight = 0
        ,   mouseMovement = false
        ;
        if (useRow === null) {
            mouseMovement = true;
        }
        if (mouseMovement) {
            centerX = x;
            centerY = y;
            maxWidth = maxHeight = 100;
            piece = this.top.ribbonPiece || this.bottom.ribbonPiece;
        } else {
            centerX = this.centerX;
            centerY = this.centerY;
            maxWidth = this.width;
            maxHeight = this.height;
            if (useRow) {
                piece = this.row.ribbonPiece;
            } else {
                piece = this.column.ribbonPiece;
            }
        }
        if (piece && piece.letter && piece.letter.matchValue && this.fabric.foreFrame) {
            screenX = Math.round(centerX + ((Math.random() - 0.5) * 2 * maxHeight));
            screenY = Math.round(centerY + ((Math.random() - 0.5) * 2 * maxWidth)) -
                Math.round(this.fabric.foreFrame.yOffset());
            this.fabric.foreFrame.context.globalCompositeOperation = "source-over";
            this.fabric.foreFrame.context.globalAlpha = 1;
            this.fabric.foreFrame.context.setTransform(1,0,0,1,0,0);      
            this.fabric.foreFrame.context.textBaseline = "middle";
            this.fabric.foreFrame.context.textAlign = "center";
            this.fabric.foreFrame.context.translate(screenX, screenY);
            this.fabric.foreFrame.context.rotate(Math.random() * 2 * Math.PI);
            fontSize = (mouseMovement ? 2 : 1) *
                Math.round((piece.ribbon.path.isRow ? this.height : this.width) * (0.1 + (Math.random() * 0.4)));
            this.fabric.foreFrame.context.font = this.fabric.text.fontStyle + " " + fontSize + "px " +
                this.fabric.text.fontFace;
            this.fabric.foreFrame.context.fillStyle = "hsla(" +
                (this.fabric.hue[hue] + (mouseMovement ? 0 : this.fabric.complementHue)) + "," +
                this.fabric.saturation[saturation] + "%," + this.fabric.luminosity[luminosity] + "%, 1)"
            this.fabric.foreFrame.context.fillText(piece.letter.value, 0, 0);
        }
    }
    for (var row = 0; row < pathRows.length; row++) {
        for (var column = 0; column < pathColumns.length; column++) {
            currentIndex = intersections.push(new Intersection(pathRows[row], pathColumns[column])) - 1;
            if (column) {
                intersections[currentIndex - 1].row.nextIntersection = intersections[currentIndex];
                intersections[currentIndex].row.prevIntersection = intersections[currentIndex - 1];
            } else {
                pathRows[row].firstIntersection = intersections[currentIndex];
            }
            if (row) {
                intersections[currentIndex - pathColumns.length].column.nextIntersection = intersections[currentIndex];
                intersections[currentIndex].column.prevIntersection = intersections[currentIndex - pathColumns.length];
                if (row == (pathRows.length - 1)) {
                    pathColumns[column].lastIntersection = intersections[currentIndex];
                }
            } else {
                pathColumns[column].firstIntersection = intersections[currentIndex];
            }
        }
        pathRows[row].lastIntersection = intersections[currentIndex];
    }
    return intersections;
}
function createLetter(ribbon, phrase, position, prevLetter) {
    var Letter = function (ribbon, phrase, position, prevLetter) {
            this.id = letterCount++;
            this.ribbon = ribbon;
            this.position = position || 0;
            this.value = phrase.charAt(this.position);
            this.prevLetter = prevLetter || null;
            this.ribbon.phraseCanvas.context.font = this.ribbon.font;
            this.end = this.ribbon.phraseCanvas.context.measureText(phrase.substring(0, this.position + 1)).width;
            this.width = this.end - (this.prevLetter ? this.prevLetter.end : 0)
            if (this.value.search(/\S/) == 0) {
                this.matchValue = this.value;
                if ((!this.prevLetter) || (this.prevLetter.value.search(/\W/) == 0)) {
                    this.wordStart = this;
                    this.wordValue = phrase.slice(this.position).split(/\s|$/, 1)[0];
                } else {
                    this.wordStart = this.prevLetter.wordStart;
                    this.wordValue = null;
                }
            } else {
                this.matchValue = null;
                if (this.prevLetter && this.prevLetter.wordStart) {
                    this.prevLetter.wordStart.wordEnd = this.prevLetter;
                }
                this.wordStart = null;
            }
            this.wordEnd = null;
            this.nextLetter = createLetter(ribbon, phrase, this.position + 1, this);
            this.sparked = false;
        }
    ;
    if ((position || 0) < phrase.length) {
        return new Letter(ribbon, phrase, position, prevLetter);
    } else {
        ribbon.lastLetter = prevLetter;
        return null;
    }
}
function createPaths(fabric, pathCount, isRow) {
    var paths = []
    ,   totalSpace = isRow ? screenHeight : screenWidth
    ,   Path = function (width, isRow) {
            this.id = pathCount++;
            this.fabric = fabric;
            this.order = paths.length;
            this.prevPath = paths.length ? paths[this.order - 1] : null;
            if (this.prevPath) {
                this.prevPath.nextPath = this;
            }
            this.nextPath = null;
            this.position = this.order ? (this.prevPath.position + this.prevPath.width) : 0;
            this.width = width;
            this.isRow = isRow;
            this.firstIntersection = this.lastIntersection = null;
            this.ribbon = null;
            this.pathCenter = Math.round(this.width/2);
            this.prevAvailablePath = this.nextAvailablePath = null;
            this.frozen = false;
        }
    ;
    Path.prototype.return = function() {
        if (this.isRow) {
            this.prevAvailablePath = this.fabric.lastAvailableRow || null;
            this.nextAvailablePath = null;
            if (this.prevAvailablePath) {
                this.prevAvailablePath.nextAvailablePath = this;
            } else {
                this.fabric.firstAvailableRow = this;
            }
            this.fabric.lastAvailableRow = this;
        } else {
            this.prevAvailablePath = this.fabric.lastAvailableColumn || null;
            this.nextAvailablePath = null;
            if (this.prevAvailablePath) {
                this.prevAvailablePath.nextAvailablePath = this;
            } else {
                this.fabric.firstAvailableColumn = this;
            }
            this.fabric.lastAvailableColumn = this;
        }
    }
    Path.prototype.use = function() {
        var path
        ;
        if (this.isRow) {
            if (this.prevAvailablePath) {
                this.prevAvailablePath.nextAvailablePath = this.nextAvailablePath;
            } else {
                this.fabric.firstAvailableRow = this.nextAvailablePath;
            }
            if (this.nextAvailablePath) {
                this.nextAvailablePath.prevAvailablePath = this.prevAvailablePath;
            } else {
                this.fabric.lastAvailableRow = this.prevAvailablePath;
            }
        } else {
            if (this.prevAvailablePath) {
                this.prevAvailablePath.nextAvailablePath = this.nextAvailablePath;
            } else {
                this.fabric.firstAvailableColumn = this.nextAvailablePath;
            }
            if (this.nextAvailablePath) {
                this.nextAvailablePath.prevAvailablePath = this.prevAvailablePath;
            } else {
                this.fabric.lastAvailableColumn = this.prevAvailablePath;
            }
        }
        this.prevAvailablePath = this.nextAvailablePath = null;
        return this;
    }
    shuffle(partitionRange(totalSpace, pathCount)).forEach( function(width) {
        paths.push(new Path(width, isRow)); });
    return paths;
}
function createPhrase (text, priorPhrase, nextLevel) {
    var currentPhrase = null
    ,   Phrase = function(text, priorPhrase, nextLevel) {
            var wordEnd = null
            ;
            this.text = text;
            this.nextPhrase = null;
            this.children = [];
            if (!priorPhrase) {
                this.level = 0;
                this.parent = null;
                this.start = text.fullText.search(text.delimiters[this.level][0]);
                this.end = text.fullText.slice(this.start).search(text.delimiters[this.level][1]) + this.start;
                this.limit = text.fullText.search(/$/);
            } else {
                if (nextLevel) {
                    this.level = priorPhrase.level + 1;
                    this.parent = priorPhrase;
                    this.start = text.fullText.slice(priorPhrase.end, priorPhrase.limit).
                        search(text.delimiters[this.level][0]);
                } else {
                    this.level = priorPhrase.level;
                    this.parent = priorPhrase.parent;
                    this.start = text.fullText.slice(priorPhrase.end, this.parent.limit).search(text.delimiters[this.level][0]);
                }
                if (this.start > -1) {
                    this.start += priorPhrase.end;
                    this.end = text.fullText.slice(this.start, this.parent.limit).
                        search(text.delimiters[this.level][1]);
                    if (this.end > -1) {
                        this.end += this.start;
                        wordEnd = text.fullText.slice(this.end, this.parent.limit).search(/\s|$/);
                        if (wordEnd > -1) {
                            this.end += wordEnd;
                        } else {
                            this.end = this.parent.limit;
                        }
                    } else {
                        this.end = this.parent.limit;
                    }
                    if (text.levels > (this.level + 1)) {
                        this.limit = text.fullText.slice(this.end, this.parent.limit).
                            search(text.delimiters[this.level][0]);
                        if (this.limit > -1) {
                            this.limit += this.end;
                        } else {
                            this.limit = this.parent.limit;
                        }
                    } else {
                        this.limit = -1;
                    }
                }
            }
            this.lineCount = this.string().split(/\n/).length;
            this.currentLine = 0;
            this.title = this.level < (text.levels - 2);
        }
    ;
    Phrase.prototype.string = function() {
        if ((this.lineCount > 1) && (this.children.length)) {
            return this.text.fullText.substring(this.start, this.end).trim().split(/\n/)[this.currentLine];
        } else {
            return this.text.fullText.substring(this.start, this.end).trim();
        }
    }
    //Phrase.prototype.test = function() {
    //    if (this.level <= 2) {
    //        console.log (Date.now() + ": " + testCount + " phrase level " + this.level + " parent " +
    //            (this.parent ? this.parent.id : "-") + " nextPhrase " + (this.nextPhrase ? this.nextPhrase.id : "-") +
    //            " children " + this.children.length + " - " + this.string());
    //    }
    //    this.children.forEach( function (child) { child.test(); });
    //}
    currentPhrase = new Phrase (text, priorPhrase, nextLevel);
    if (currentPhrase.start > -1) {
        if (currentPhrase.limit > -1) {
            createPhrase(text, currentPhrase, true);
        }
        if (currentPhrase.level) {
            currentPhrase.parent.children.push(currentPhrase);
            currentPhrase.nextPhrase = createPhrase(text, currentPhrase, false);
        }
        return currentPhrase;
    } else {
        return null;
    }
}
function createPiece(ribbon) {
    var Piece = function(ribbon, intersection) {
            this.id = pieceCount++;
            this.ribbon = ribbon;
            this.active = true;
            
            this.nextPiece = ribbon.firstPiece || null;
            this.prevPiece = null;
            if (ribbon.firstPiece) {
                ribbon.firstPiece.prevPiece = this;
            }
            ribbon.firstPiece = this;

            this.intersection = intersection;
            if (ribbon.path.isRow) {
                this.nextIntersection = 
                    this.ribbon.forwards ? this.intersection.row.prevIntersection : this.intersection.row.nextIntersection;
                this.letterOffset = -1 * this.intersection.column.path.pathCenter;
                this.screenOffset = this.intersection.width;
                this.pieceWidth = 0;
                this.remainder = ribbon.width;
                this.widthFactor = 1;
                this.screenXFactor = -1;
                if (this.ribbon.forwards) {
                    this.pieceX = this.xFactor = 0;
                    this.screenX = this.intersection.x + this.screenOffset;
                    this.screenXFactor = -1;
                } else {
                    this.pieceX = this.ribbon.width;
                    this.xFactor = -1;
                    this.screenX = this.intersection.x;
                    this.screenXFactor = 0;
                }
                this.pieceY = this.yFactor = this.heightFactor = 0;
                this.pieceHeight = this.ribbon.height;
                this.screenY = this.intersection.y + this.ribbon.gap;
                this.screenYFactor = 0
            } else {
                this.nextIntersection =
                    this.ribbon.forwards ? this.intersection.column.prevIntersection : this.intersection.column.nextIntersection;
                this.letterOffset = -1 * this.intersection.row.path.pathCenter;
                this.screenOffset = this.intersection.height;
                this.pieceHeight = 0;
                this.remainder = ribbon.width;
                this.heightFactor = 1;
                if (this.ribbon.forwards) {
                    this.pieceY = this.yFactor = 0;
                    this.screenY = this.intersection.y + this.screenOffset;
                    this.screenYFactor = -1;
                } else {
                    this.pieceY = this.ribbon.width;
                    this.yFactor = -1;
                    this.screenY = this.intersection.y;
                    this.screenYFactor = 0;
                }
                this.pieceX = this.xFactor = this.widthFactor = 0;
                this.pieceWidth = this.ribbon.height;
                this.screenX = this.intersection.x + this.ribbon.gap;
                this.screenXFactor = 0;
            }
            this.intersection.assignPiece(this);
            this.letter = (this.ribbon.path.isRow && !this.ribbon.forwards) ? ribbon.lastLetter : ribbon.firstLetter;
            this.offsetFactor = -1;
            this.remainderFactor = -1;
            ribbon.adjustSpeed();
        }
    ;
    Piece.prototype.advance = function(step) {
        this.screenOffset += this.offsetFactor * step;
        this.pieceX += this.xFactor * step;
        this.pieceY += this.yFactor * step;
        this.pieceWidth += this.widthFactor * step;
        this.pieceHeight += this.heightFactor * step;
        this.screenX += this.screenXFactor * step;
        this.screenY += this.screenYFactor * step;
        this.remainder += this.remainderFactor * step;
        if (!this.nextPiece && ((this.pieceHeight <= 0) || (this.pieceWidth <= 0))) {
            this.delete();
        } else {
            this.advanceLetter(step);
            if (this.offsetFactor && !this.screenOffset) {
                this.prevPiece = createPiece(this.ribbon);
                if (this.ribbon.path.isRow) {
                    this.widthFactor -= 1;
                    if (this.ribbon.forwards) {
                        this.screenXFactor = 0;
                        this.xFactor = 1;
                    }
                } else {
                    this.heightFactor -= 1;
                    if (this.ribbon.forwards) {
                        this.screenYFactor = 0;
                        this.yFactor = 1;
                    }
                }
                this.offsetFactor = 0;
            }
            if (this.remainderFactor && !this.remainder) {
                if (this.ribbon.path.isRow) {
                    this.widthFactor -= 1;
                    if (!this.ribbon.forwards) {
                        this.screenXFactor = 1;
                        this.xFactor = 0;
                    }
                } else {
                    this.heightFactor -= 1;
                    if (!this.ribbon.forwards) {
                        this.screenYFactor = 1;
                        this.yFactor = 0;
                    }
                }
                this.remainderFactor = 0;
            }
        }
    }
    Piece.prototype.advanceLetter = function(step) {
        if (this.letter) {
            this.letterOffset += step;
            while (this.letter && (this.letterOffset > this.letter.width)) {
                this.letterOffset -= this.letter.width;
                this.letter =
                    (this.ribbon.path.isRow && !this.ribbon.forwards) ? this.letter.prevLetter : this.letter.nextLetter;
                if (this.letter) {
                    if (!this.letter.sparked) {
                        this.intersection.spark(this.ribbon.path.isRow);
                        this.letter.sparked = true;
                    }
                    if (this.ribbon.path.isRow) {
                        if (this.letter.matchValue && this.intersection.column.ribbonPiece &&
                            this.intersection.column.ribbonPiece.letter &&
                            (this.intersection.column.ribbonPiece.letter.matchValue == this.letter.matchValue)) {
                            createStamp(this.ribbon, this.intersection);
                        }
                    } else {
                        if (this.letter.matchValue && this.intersection.row.ribbonPiece &&
                            this.intersection.row.ribbonPiece.letter &&
                            (this.intersection.row.ribbonPiece.letter.matchValue == this.letter.matchValue)) {
                            createStamp(this.ribbon, this.intersection);
                        }
                    }
                }
            }
        }
    }
    Piece.prototype.delete = function() {
        this.active = false;
        if (!this.nextPiece && !this.prevPiece) {
            this.ribbon.delete();
        } else {
            if (this.nextPiece) {
                this.nextPiece.prevPiece = null;
            } else {
                this.ribbon.lastPiece = this.prevPiece;
            }
            if (this.prevPiece) {
                this.prevPiece.nextPiece = null;
            } else {
                this.ribbon.firstPiece = this.nextPiece;
            }
            this.ribbon.adjustSpeed();
        }
    }
    Piece.prototype.draw = function() {
        if (this.pieceHeight && this.pieceWidth) {
            this.ribbon.fabric.pathFrame.context.globalCompositeOperation = "source-over";
            this.ribbon.fabric.pathFrame.context.globalAlpha = 1;
            this.ribbon.fabric.pathFrame.context.drawImage
            (   this.ribbon.phraseCanvas.context.canvas
            ,   this.pieceX
            ,   this.pieceY
            ,   this.pieceWidth
            ,   this.pieceHeight
            ,   this.screenX
            ,   this.screenY
            ,   this.pieceWidth
            ,   this.pieceHeight);
        }
    }
    if (ribbon.firstPiece === undefined) {
        return new Piece(ribbon, ribbon.forwards ? ribbon.path.lastIntersection : ribbon.path.firstIntersection);
    } else if (ribbon.firstPiece.nextIntersection) {
        return new Piece(ribbon, ribbon.firstPiece.nextIntersection);
    } else {
        return null;
    }
}
function createRibbon(path, givenPhrase) {
    var phraseRoot = document.querySelector("#phraseRoot")
    ,   fontWidthFactor = 2.2
    ,   fontHeightFactor = 0.8
    ,   PhraseCanvas = function() {
            this.context = phraseRoot.parentNode.appendChild(phraseRoot.cloneNode(true)).getContext("2d");
            this.context.canvas.id = "phrase" + path.id;
            this.prevPhraseCanvas = this.nextPhraseCanvas = null;
        }
    ,   Ribbon = function(path, phrase) {
            var phraseString = ""
            ;
            this.id = ribbonCount++;
            this.path = path;
            this.fabric = path.fabric;
            this.path.ribbon = this;
            this.phrase = phrase;
            phraseString = " " + phrase.string().replace(/\n/," ").trim() + " ";
            this.letterCount = phraseString.trim().length
            this.fabric.onscreenLetters += this.letterCount;
            this.fontSize = Math.max(minFontSize,
                Math.round(fontWidthFactor * (path.isRow ? screenWidth : screenHeight)/this.letterCount));
            if (this.fontSize > ((path.width - path.fabric.minGap) * fontHeightFactor)) {
                this.gap = path.fabric.minGap + Math.round(Math.random() * (this.fabric.maxGap - this.fabric.minGap));
                this.height = path.width - this.gap;
                this.fontSize = Math.max(minFontSize, Math.round(this.height * fontHeightFactor));
            } else {
                this.height = Math.round(this.fontSize/fontHeightFactor);
                this.gap = path.width - this.height;
            }
            this.phraseCanvas = this.getCanvas();
            this.font = this.fabric.text.fontStyle + " " + this.fontSize + "px " + this.fabric.text.fontFace;

            this.lastLetter = null;
            this.firstLetter = createLetter(this, phraseString);
            this.width = Math.ceil(this.lastLetter.end);
            this.forwards = (path.isRow && (this.width > screenWidth)) ? true : (Math.random() < 0.5);
            this.draw(phraseString);
            
            this.baseSpeed = this.speed = (this.width * readingPace/this.letterCount);
            this.prevRibbon = this.fabric.lastRibbon;
            this.nextRibbon = null;
            if (this.fabric.lastRibbon) {
                this.fabric.lastRibbon.nextRibbon = this;
            } else {
                this.fabric.firstRibbon = this;
            }
            this.firstPiece = this.lastPiece = createPiece(this);
        }
    ;
    Ribbon.prototype.adjustSpeed = function() {
        var levelFactor = 1
        ,   exposure = 0.2 + Math.min(0.8, this.lastPiece ? 
                (this.width - this.lastPiece.remainder)/Math.min(this.width, this.path.isRow ? screenWidth : screenHeight) : 0)
        ,   intersectionCountFactor = this.phrase.children.length ? 3 : 1
        ,   introductionFactor = 30 - (29 * exposure);
        ;
        this.speed = this.baseSpeed * introductionFactor * intersectionCountFactor;
    }
    Ribbon.prototype.advance = function(interval, distance) {
        var totalDistance = 0
        ,   step = 0
        ,   partialStep = 0
        ,   currentPiece = null
        ,   speed = 0
        ,   duration = 0
        ;
        if (!distance) {
            distance = interval * this.speed;
        }
        step = Math.round(distance);
        if (step > 0) {
            if (this.firstPiece.screenOffset && (step > this.firstPiece.screenOffset)) {
                partialStep = this.firstPiece.screenOffset;
                this.advance(interval, partialStep);
                this.advance(interval, step - partialStep);
            } else if (this.lastPiece.remainder && (step > this.lastPiece.remainder)) {
                partialStep = this.lastPiece.remainder;
                this.advance(interval, partialStep);
                this.advance(interval, step - partialStep);
            } else if (this.lastPiece.prevPiece && this.lastPiece.prevPiece.remainder &&
                    (step > this.lastPiece.prevPiece.remainder)) {
                partialStep = this.lastPiece.prevPiece.remainder;
                this.advance(interval, partialStep);
                this.advance(interval, step - partialStep);
            } else {
                currentPiece = this.firstPiece;
                while (currentPiece) {
                    currentPiece.advance(step);
                    currentPiece = currentPiece.nextPiece;
                }
            }
        }
    }
    Ribbon.prototype.delete = function() {
        this.phraseCanvas.context.canvas.parentNode && this.phraseCanvas.context.canvas.parentNode.removeChild(this.phraseCanvas.context.canvas);
        this.fabric.onscreenLetters -= this.letterCount;
        if (!this.prevRibbon && !this.nextRibbon) {
            if (!this.fabric.currentPhrase) {
                this.fabric.delete();
            }
        } else {
            if (this.prevRibbon) {
                this.prevRibbon.nextRibbon = this.nextRibbon;
            } else {
                this.fabric.firstRibbon = this.nextRibbon;
            }
            if (this.nextRibbon) {
                this.nextRibbon.prevRibbon = this.prevRibbon;
            } else {
                this.fabric.lastRibbon = this.prevRibbon;
            }
            this.path.ribbon = null;
            this.path.return();
        }
    }
    Ribbon.prototype.draw = function(phrase) {
        var primaryHue = Math.floor(Math.random() * this.fabric.hue.length)
        ,   secondaryHue = (primaryHue + Math.ceil(Math.random() * this.fabric.hue.length/2)) % this.fabric.hue.length
        ,   saturation = Math.floor(Math.random() * this.fabric.saturation.length)
        ,   luminosity = 1 + Math.floor(Math.random() * (this.fabric.luminosity.length - 2))
        ,   alpha = (7 + Math.floor(Math.random() * 3))/10
        ,   primaryColor = "hsl(" + this.fabric.hue[primaryHue] + "," + this.fabric.saturation[saturation] + "%," +
                this.fabric.luminosity[luminosity] + "%)"
        ,   secondaryLuminosity = (luminosity > this.fabric.luminosity.length/2) ? 0 : (this.fabric.luminosity.length - 1)
        ,   outlineLuminosity = 0 //secondaryLuminosity ? 0 : (this.fabric.luminosity.length - 1)
        ,   secondaryColor = "hsl(" + this.fabric.hue[secondaryHue] + "," + this.fabric.saturation[saturation] + "%, " +
                this.fabric.luminosity[secondaryLuminosity] + "%)"
        ,   outlineColor = this.fontSize > outlineFontLimit ? "hsl(" + this.fabric.hue[secondaryHue] + "," + this.fabric.saturation[0] + "%, " +
                this.fabric.luminosity[outlineLuminosity] + "%)" : "transparent"
        ,   gradient = this.phraseCanvas.context.createLinearGradient(0, 0, 0, this.height)
        ,   startX = 0
        ,   startY = 0
        ;
        if (this.path.isRow) {
            this.phraseCanvas.context.canvas.height = this.height;
            this.phraseCanvas.context.canvas.width = this.width;
        } else {
            this.phraseCanvas.context.canvas.height = this.width;
            this.phraseCanvas.context.canvas.width = this.height;
            if (this.forwards) {
                this.phraseCanvas.context.translate(this.height, 0);
                this.phraseCanvas.context.rotate(Math.PI/2);
            } else {
                this.phraseCanvas.context.translate(0, this.width);
                this.phraseCanvas.context.rotate(Math.PI/-2);
            }
        }
        this.phraseCanvas.context.globalCompositeOperation = "source-over";
        this.phraseCanvas.context.globalAlpha = alpha;
        this.phraseCanvas.context.textBaseline = "middle";
        this.phraseCanvas.context.textAlign = "start";
        this.phraseCanvas.context.fillStyle = primaryColor;
        this.phraseCanvas.context.fillRect(0, 0, this.width, this.height);
        this.phraseCanvas.context.fillStyle = secondaryColor;
        this.phraseCanvas.context.font = this.font
        this.phraseCanvas.context.fillText(phrase, 0, (this.height/2));
        this.phraseCanvas.context.strokeStyle = outlineColor;
        this.phraseCanvas.context.lineWidth = 1;
        this.phraseCanvas.context.strokeText(phrase, 0, (this.height/2));
        
        gradient.addColorStop(0,"white");
        gradient.addColorStop(0.1,"transparent");
        gradient.addColorStop(0.9,"transparent");
        gradient.addColorStop(1,"white");
        this.phraseCanvas.context.globalCompositeOperation = "destination-out";
        this.phraseCanvas.context.fillStyle = gradient;
        this.phraseCanvas.context.fillRect(0, 0, this.width, this.height);
    }
    Ribbon.prototype.fade = function() {
        this.phraseCanvas.context.globalCompositeOperation = "destination-out";
        this.phraseCanvas.context.globalAlpha = 0.1;
        this.phraseCanvas.context.fillStyle = "hsla(0, 0%, 50%, 0.5)";
        this.phraseCanvas.context.fillRect(0, 0, this.width, this.height);
    }
    Ribbon.prototype.freeze = function() {
        this.speed = this.baseSpeed = 0;
        this.path.frozen = true;
    }
    Ribbon.prototype.getCanvas = function() {
        var availablePhraseCanvas = null
        ;
        if (firstAvailablePhraseCanvas) {
            availablePhraseCanvas = firstAvailablePhraseCanvas;
            firstAvailablePhraseCanvas = firstAvailablePhraseCanvas.nextPhraseCanvas;
            if (firstAvailablePhraseCanvas) {
                firstAvailablePhraseCanvas.prevPhraseCanvas = null;
            }
            availablePhraseCanvas.prevPhraseCanvas = availablePhraseCanvas.nextPhraseCanvas = null;
        } else {
            availablePhraseCanvas = new PhraseCanvas();
        }
        return availablePhraseCanvas;
    }
    Ribbon.prototype.releaseCanvas = function(phraseCanvas) {
        phraseCanvas.prevPhraseCanvas = lastAvailablePhraseCanvas;
        if (lastAvailablePhraseCanvas) {
            lastAvailablePhraseCanvas.nextPhraseCanvas = phraseCanvas;
        }
        lastAvailablePhraseCanvas = phraseCanvas;
    }
    return new Ribbon(path, givenPhrase);
}
function createStamp(ribbon, intersection) {
    var Stamp = function(intersection) {
            var letterScrollOffset = 0
            ,   wordScrollOffset = 0
            ,   letterXOffset = Math.random() * ((Math.random() < 0.5) ? -1 : 1)
            ,   letterYOffset = Math.random() * ((Math.random() < 0.5) ? -1 : 1)
            ,   wordXOffset = letterXOffset - Math.sign(letterXOffset)
            ,   wordYOffset = letterYOffset - Math.sign(letterYOffset)
            ,   primaryHue = 0
            ,   secondaryHue = 0
            ,   complementHue = 0
            ,   saturation = 0
            ,   luminosity = 0
            ,   secondaryLuminosity = 0
            ,   outlineLuminosity = 0 
            ;
            this.id = stampCount++;
            this.intersection = intersection;
            this.fabric = intersection.fabric;
            letterScrollOffset = Math.round(this.fabric.foreFrame.yOffset());
            wordScrollOffset = Math.round(this.fabric.backFrame.yOffset());
            this.letter = intersection.top.ribbonPiece.letter;
            this.ribbon = this.letter.ribbon;
            this.prevStamp = this.fabric.lastStamp;
            this.nextStamp = null;
            if (this.fabric.lastStamp) {
                this.fabric.lastStamp.nextStamp = this;
            } else {
                this.fabric.firstStamp = this;
            }
            this.fabric.lastStamp = this;
            this.period = 100;
            this.drawCount = 0;
            if (this.ribbon.path.isRow) {
                this.letterScreenX = Math.round(this.intersection.centerX + (letterXOffset * this.intersection.width));
                this.letterScreenY = Math.round(this.intersection.centerY + (letterYOffset * this.intersection.height) -
                    letterScrollOffset);
                this.wordScreenX = Math.round(this.intersection.centerX + (wordXOffset * this.intersection.width));
                this.wordScreenY = Math.round(this.intersection.centerY + (wordYOffset * this.intersection.height) -
                    wordScrollOffset);
            } else {
                this.letterScreenX = Math.round(this.intersection.centerX + (letterXOffset * this.intersection.width));
                this.letterScreenY = Math.round(this.intersection.centerY + (letterYOffset * this.intersection.height) -
                    letterScrollOffset);
                this.wordScreenX = Math.round(this.intersection.centerX + (wordXOffset * this.intersection.width));
                this.wordScreenY = Math.round(this.intersection.centerY + (wordYOffset * this.intersection.height) -
                    wordScrollOffset);
            }
            this.drawStamp = true;

            primaryHue = Math.floor(Math.random() * this.fabric.hue.length);
            secondaryHue = (primaryHue + Math.ceil(Math.random() * this.fabric.hue.length/2)) % this.fabric.hue.length;
            complementHue = Math.random() < 0.5 ? this.fabric.complementHue : 0;
            saturation = Math.floor(Math.random() * this.fabric.saturation.length);
            luminosity = 1 + Math.floor(Math.random() * (this.fabric.luminosity.length - 2));
            secondaryLuminosity = (luminosity > this.fabric.luminosity.length/2) ? 0 : (this.fabric.luminosity.length - 1);
            this.primaryColor = "hsl(" + (this.fabric.hue[primaryHue] + complementHue) + "," +
                this.fabric.saturation[saturation] + "%," + this.fabric.luminosity[luminosity] + "%)";
            this.secondaryColor = "hsl(" + (this.fabric.hue[secondaryHue] + complementHue) + "," +
                this.fabric.saturation[saturation] + "%, " + this.fabric.luminosity[secondaryLuminosity] + "%)";
            this.outlineColor = "hsl(" + (this.fabric.hue[secondaryHue] + complementHue) + "," +
                this.fabric.saturation[0] + "%, " + this.fabric.luminosity[outlineLuminosity] + "%)";

            this.letterFont = this.fabric.text.fontStyle + " " +
                Math.round((1 + (3 * Math.random())) * this.ribbon.fontSize) + "px " + this.fabric.text.fontFace;
            this.wordFont = this.fabric.text.fontStyle + " " +
                Math.round((1 + (3 * Math.random())) * this.ribbon.fontSize) + "px " + this.fabric.text.fontFace;
        }
    ;
    Stamp.prototype.delete = function() {
        if (this.prevStamp) {
            this.prevStamp.nextStamp = this.nextStamp;
        } else {
            this.fabric.firstStamp = this.nextStamp;
        }
        if (this.nextStamp) {
            this.nextStamp.prevStamp = this.prevStamp;
        } else {
            this.fabric.lastStamp = this.prevStamp;
        }
    }
    Stamp.prototype.draw = function() {
        var contextRotate = this.ribbon.path.isRow ? 0 : (this.ribbon.forwards ? Math.PI/2 : Math.PI/-2)
        ;
        if (this.drawStamp) {
            this.drawStamp = false;
            this.fabric.foreFrame.context.globalCompositeOperation = this.fabric.backFrame.context.globalCompositeOperation =
                "source-over";
            this.fabric.foreFrame.context.globalAlpha = this.fabric.backFrame.context.globalAlpha = 0.15;
            this.fabric.foreFrame.context.setTransform(1,0,0,1,0,0);      
            this.fabric.foreFrame.context.textBaseline = "middle";
            this.fabric.foreFrame.context.textAlign = "center";
            this.fabric.foreFrame.context.translate(this.letterScreenX, this.letterScreenY);
            this.fabric.foreFrame.context.rotate(contextRotate);
            this.fabric.foreFrame.context.font = this.letterFont;
            this.fabric.foreFrame.context.fillStyle = this.primaryColor;
            this.fabric.foreFrame.context.fillText(this.letter.value, 0, 0);
            this.fabric.foreFrame.context.strokeStyle = this.outlineColor;
            this.fabric.foreFrame.context.lineWidth = 1;
            this.fabric.foreFrame.context.strokeText(this.letter.value, 0, 0);
            
            this.fabric.backFrame.context.setTransform(1,0,0,1,0,0);      
            this.fabric.backFrame.context.textBaseline = "middle";
            this.fabric.backFrame.context.textAlign = "center";
            this.fabric.backFrame.context.translate(this.wordScreenX, this.wordScreenY);
            this.fabric.backFrame.context.rotate(contextRotate);
            this.fabric.backFrame.context.font = this.wordFont;
            this.fabric.backFrame.context.fillStyle = this.secondaryColor;
            this.fabric.backFrame.context.fillText(this.letter.wordStart.wordValue, 0, 0);
            this.fabric.backFrame.context.strokeStyle = this.outlineColor;
            this.fabric.backFrame.context.lineWidth = 1;
            this.fabric.backFrame.context.strokeText(this.letter.wordStart.wordValue, 0, 0);
            
            this.fabric.foreFrame.drift();
            this.fabric.backFrame.drift();
            this.fabric.fadeFrames = true;
            this.drawCount++;
            if (this.drawCount > 10) {
                this.delete()
            } else {
                (function(stamp) {
                    setTimeout(function() { stamp.drawStamp = true; }, stamp.period)
                })(this);
            }
            
        }
    }
    return new Stamp(intersection);
}
function createText(textSource, index) {
	var xmlReader = new XMLHttpRequest() || new ActiveXObject('MSXML2.XMLHTTP')
    ,   textFiles =
        [   ["BeyondGoodAndEvil", ""]
        ,   ["CicerosOrations", ""]
        ,   ["FederalistPapers", ""]
        ,   ["JacobsRoom", "i"]
        ,   ["LeavesOfGrass", ""]   
        ,   ["Psalms", "i"]
        ,   ["SonnetsFromThePortuguese", ""] 
        ,   ["TenderButtons", ""]
        ,   ["TheWasteLand", ""]   ]
    //,   selectedFile = Math.floor(Math.random() * textFiles.length)
    ,   currentText = null
    ,   fontStyles = ["normal"]
    ,   fontFaces =
        [   "Arial, Helvetica, sans-serif"
        ,   "Georgia, serif"
        ,   "Palatino Linotype, Book Antiqua, Palatino, serif"
        ,   "Lucida Sans Unicode, Lucida Grande, sans-serif"
        ,   "Tahoma, Geneva, sans-serif"
        ,   "Times New Roman, Times, serif"
        ,   "Trebuchet MS, sans-serif"
        ,   "Veranda, Geneva, sans-serif"
        ,   "Century Schoolbook, serif" 
        ,   "Century Gothic, sans-serif"
        ,   "Avenir, sans-serif" ]
    ,   newsCategories =
        [   "general"
        ,   "business"
        ,   "entertainment"
        ,   "gaming"
        ,   "music"
        ,   "science-and-nature"
        ,   "sport"
        ,   "technology" ]
    ,   Text = function(source, index) {
            this.fullText = "";
            this.rootPhrase = null;
            this.loaded = false;
            this.delimiters = [];
            this.priorPhrase = null;
            this.hue = Math.floor(Math.random() * 360);
            this.levels = 0;
            this.fontStyle = fontStyles[Math.floor(Math.random() * fontStyles.length)];
            this.fontFace = fontFaces[Math.floor(Math.random() * fontFaces.length)];
            this.deleting = false;
            this.source = source;
            this.index = index;
        }
    ,   Delimiters = function(givenString, index) {
            var delimiters = givenString.substring(0, givenString.search(/\n\n/)).match(/\S+(\t|\n|$)/g)
            ,   delimiterPairs = []
            ;
            for (var i = 0; i < delimiters.length; i++) {
                if (!(i % 2)) {
                    delimiterPairs.push([new RegExp(delimiters[i].trim(), textFiles[index][1]),
                        new RegExp(delimiters[i + 1].trim(), textFiles[index][1])]);
                }
            }
            return delimiterPairs;
        }
    ,   requestedText = 0
    ,   newsFeed = null
    ,   newsCategory = null
    ,   xmlNewsReaders = []
    ,   newsParameter = ""
    ,   fileParameter = ""
    ;
    Text.prototype.delete = function() {
        var currentFabric = firstFabric
        ;
        this.deleting = true;
        while (currentFabric) {
            currentFabric.delete();
            currentFabric = currentFabric.nextFabric;
        }
    }
    Text.prototype.fetchNextPhrase = function(givenPhrase) {
        this.priorPhrase = givenPhrase;
        if (givenPhrase.currentLine < (givenPhrase.lineCount - 1)) {
            givenPhrase.currentLine++;
            return givenPhrase;
        } else {
            givenPhrase.currentLine = 0;
            if (!givenPhrase.children.length || (!givenPhrase.level && givenPhrase.nextPhrase)) {
                return givenPhrase.nextPhrase;
            } else if (!givenPhrase.title) {
                return givenPhrase.children[0];
            } else if (givenPhrase.children[0].title) {
                return givenPhrase.children[Math.floor(Math.random() * givenPhrase.children.length)];
            } else {
                return null;
            }
        }
    }
    Text.prototype.load = function(responseText) {
        var currentText = this
        ,   loadFeed = null
        ;
        if (this.source == "news") {
            loadFeed = JSON.parse(responseText);
            if (loadFeed.status == "ok") {
                //console.log(Date.now() + ": loading news from " + loadFeed.source);
                loadFeed.articles.forEach( function(article) {
                    currentText.rootPhrase.append(article.title);
                });
                this.loaded = true;
            }
        } else {
            if (!this.fullText) {
                this.delimiters = new Delimiters(responseText, this.index)
                this.levels = this.delimiters.length;
                this.fullText = responseText.substring(responseText.search(/\n\n/)).trim();
                this.rootPhrase = createPhrase(this);
                this.loaded = true;
            }
        }
    }
    if (textSource == "news") {
        if ((index === undefined) || (index == -1)) {
            currentText = createText("news", Math.floor(Math.random() * newsCategories.length));
        } else {
            currentText = new Text("news", index);
            xmlReader.open("get.html","https://newsapi.org/v1/sources?language=en&category=" + newsCategories[index], true);
            xmlReader.onreadystatechange = function() {
                if (xmlReader.readyState == 4) {
                    newsFeed = JSON.parse(xmlReader.responseText);
                    if (newsFeed.status == "ok") {
                        newsAPILogo.style.opacity = 1;
                        setTimeout(function() { newsAPILogo.style.opacity = 0; }, 2500);
                        currentText.rootPhrase = createHeadline(currentText, newsCategories[index]);
                        shuffle(newsFeed.sources).forEach( function(source) {
                            xmlNewsReaders.push(new XMLHttpRequest() || new ActiveXObject('MSXML2.XMLHTTP'));
                            xmlNewsReaders[xmlNewsReaders.length - 1].open("get.html",
                                "https://newsapi.org/v1/articles?source=" + source.id + "&apiKey=" + newsAPIKey, true);
                            (function(reader) {
                                reader.onreadystatechange = function() {
                                    if (reader.readyState == 4) {
                                        currentText.load(reader.responseText);
                                    }
                                }
                            })(xmlNewsReaders[xmlNewsReaders.length - 1]);
                            xmlNewsReaders[xmlNewsReaders.length - 1].send(null);
                            //console.log(Date.now() + ": getting news from " + source.id);
                        });
                    }
                }
            }
            xmlReader.send(null);
            return currentText;
       }
    } else if (textSource == "text") {
        if (index === undefined) {
            currentText = createText("text",Math.floor(Math.random() * (textFiles.length + 1)));
        } else {
            currentText = new Text("text", index);
            xmlReader.open("get.html","data/" + textFiles[index][0] + ".txt", true);
            xmlReader.onloadend = function() {
                if (xmlReader.readyState == 4) {
                    currentText.load(xmlReader.responseText);
                }
            }
            xmlReader.send(null);
            return currentText;
        }
    } else {
        newsParameter = getQueryVariable("news");
        if ((newsParameter === undefined) || (newsParameter == "true")) {
            currentText = createText("news", 0);
        } else if (newsParameter) {
            currentText = createText("news", newsCategories.indexOf(newsParameter));
        } else {
            fileParameter = parseInt(getQueryVariable("text"));
            if (fileParameter) {
                currentText = createText("text", Math.max(1,Math.min(textFiles.length, fileParameter)) - 1);
            } else {
                fileParameter = Math.floor(Math.random() * (textFiles.length + 1)) - 1;
                if (fileParameter < 0) {
                    currentText = createText("news", 0);
                } else {
                    currentText = createText("text", fileParameter);
                }
            }
        }
    }
    return currentText;
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
    var frame = null
    ,   intersection = null
    ,   ribbon = null
    ;
    chosenText = createText();
    canvasRoot.addEventListener("transitionend", function(e) {
		if (e.target.classList.contains("frame")) {
            frame = frames[e.target.getAttribute("data-id")];
            if (e.propertyName == "transform") {
                frame.driftFrame = false;
                frame.driftRate *= -1;
            } else if (e.propertyName == "opacity") {
                if (!parseInt(frame.context.canvas.style.opacity)) {
                    if (frame.forPaths) {
                        if (frame.fabric.prevFabric) {
                            frame.fabric.prevFabric.nextFabric = frame.fabric.nextFabric;
                        } else {
                            firstFabric = frame.fabric.nextFabric;
                        }
                        if (frame.fabric.nextFabric) {
                            frame.fabric.nextFabric.prevFabric = frame.fabric.prevFabric;
                        } else {
                            lastFabric = frame.fabric.prevFabric;
                        }
                    }
                    frame.context.canvas.parentNode.removeChild(frame.context.canvas);
                }
            }
        }
    }, false);
    canvasRoot.addEventListener("mousemove", function(e) {
		if (e.target.classList.contains("frame")) {
            frame = frames[e.target.getAttribute("data-id")];
            if (frame && frame.fabric) {
                intersection = frames[e.target.getAttribute("data-id")].fabric.findIntersection(e.x, e.y);
                if (intersection) {
                    intersection.spark(null, e.x, e.y);
                }
            }
        }
    }, false);
    canvasRoot.addEventListener("click", function(e) {
		if (e.target.classList.contains("frame")) {
            frame = frames[e.target.getAttribute("data-id")];
            if (frame && frame.fabric) {
                intersection = frames[e.target.getAttribute("data-id")].fabric.findIntersection(e.x, e.y);
                if (intersection) {
                    ribbon = intersection.top.ribbonPiece ? intersection.top.ribbonPiece.ribbon : 
                        intersection.bottom.ribbonPiece ? intersection.bottom.ribbonPiece.ribbon : null;
                    if (ribbon) {
                        if (ribbon.phrase.title) {
                            chosenText.delete();
                            //useNewsFeed = null;
                            chosenText = createText(chosenText.source);
                        } else if (ribbon.phrase.children.length) {
                            ribbon.fabric.delete();
                        } else {
                            ribbon.freeze();
                        }
                    }
                }
            }
        }
    }, false);
}
function partitionRange(total, numberOfPartitions) {
    var totalRemaining = Math.max(0, total)
    ,   partitionsRemaining = Math.max(1, numberOfPartitions)
    ,   partitionMidpoint = Math.round(totalRemaining/partitionsRemaining)
    ,   range = Math.round(partitionMidpoint/1.7)
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
function proportionElements() {
    screenHeight = document.documentElement.clientHeight;
    screenWidth = document.documentElement.clientWidth;
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
    var currentFabric = null
    ,   interval = ts - priorTimestamp
    ;
    priorTimestamp = ts;
    if (chosenText && chosenText.loaded) {
        if (!lastFabric) {
            lastFabric = createFabric(chosenText);
        }
        currentFabric = firstFabric;
        while (currentFabric) {
            currentFabric.draw(interval);
            currentFabric = currentFabric.nextFabric;
        }
    }
	animationId = requestAnimFrame(animationLoop);
}
initialize();
})();
