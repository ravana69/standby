(function() {
"use strict";
    
var requestAnimFrame = window.requestAnimationFrame || 
    window.mozRequestAnimationFrame || 
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;
    
var canvas = document.querySelector(".canvas")
,   groutRoot = document.querySelector("#groutRoot")
,   tileRoot = document.querySelector("#tileRoot")
,   partRoot = document.querySelector("#partRoot")
,   tiles = []
,   grout = []
,   tileSide = 0
,   tileHeight = 0
,   tileWidth = 0
,   tilesPerRow = 0
,   tilesPerColumn = 0
,   tileTop = 0
,   tileLeft = 0
,   groutPercentOfTile = 1.5
,   swingTile = null
,   swingTimeout = null
,   partCountLimit = 65
,   minimumDelay = 500
,   maximumDelay = 4000
,   initialDelay = 1500
,   decrementDelay = 250
,   animationId = null
,   raisedTileMask = null
,   testingMode = false
,   colorAdjust = 0
,   excludedTile = null
,   exclusionTimeout = null
,   swingCount = 0
,   immediateSwing = false
,   resetCount = 200
,   specialActionsCount = 30
,   degreesToRadians = Math.PI/180
,   diagonalFactor = Math.sqrt(2)/2
,   tileOpacity = 1;

window.onload = function() {
    proportionElements();
    for (var i = 0, groutLimit = ((tilesPerColumn + 1) + (tilesPerRow + 1)); i < groutLimit; i++) {
        grout.push(new Grout());
    }
    for (var i = 0, tileLimit = (tilesPerRow * tilesPerColumn); i < tileLimit; i++) {
        tiles.push(new Tile());
    }
    // raised tile mask element
    raisedTileMask = tileRoot.cloneNode(false);
    tileRoot.parentNode.appendChild(raisedTileMask);
    raisedTileMask.id = "raisedTileMask";
    raisedTileMask.style.height = raisedTileMask.style.width = "100%";
    raisedTileMask.style.top = raisedTileMask.style.left = "0%";
    //raisedTileMask.style.zIndex = 2;
    raisedTileMask.style.opacity = 0;
    raisedTileMask.style.backgroundColor = "white";
    raisedTileMask.style.pointerEvents = "none";

    animationLoop();
}
window.onresize = function() {
    proportionElements();
}
function Grout() {
    var groutHeight = tileHeight * groutPercentOfTile/100
    ,   groutWidth = tileWidth * groutPercentOfTile/100
    ,   groutAbsolute = tileSide * groutPercentOfTile/100;
    
    //tile constructor
    this.id = grout.length;
    this.element = groutRoot.cloneNode(false);
    groutRoot.parentNode.appendChild(this.element);
    
    this.element.id = "g" + this.id;
    this.element.style.height = (this.id < (tilesPerRow + 1) ? "100%":
        (this.id == (tilesPerRow + 1)) || (this.id == (tilesPerRow + tilesPerColumn + 1)) ? (tileTop + (groutHeight/2)) + "%" : groutAbsolute + "px");
    this.element.style.width = ((this.id == 0) || (this.id == tilesPerRow) ? (tileLeft + (groutWidth/2)) + "%" :
        this.id < tilesPerRow ? groutAbsolute + "px" : "100%");
    this.element.style.top = (this.id < (tilesPerRow + 2) ? 0 :
        tileTop + ((this.id - (tilesPerRow + 1)) * tileHeight) - (groutHeight/2)) + "%";
    this.element.style.left = ((this.id == 0) || (this.id > tilesPerRow) ? 0 : tileLeft + (this.id * tileWidth) - (groutWidth/2)) + "%";
}
function Tile() {
    //tile constructor
    this.id = tiles.length;
    this.row = Math.floor(this.id/tilesPerRow);
    this.column = Math.floor(this.id % tilesPerRow);
    this.startAngle = this.restAngle = this.endAngle = 0;
    this.player = null;
    this.partCount = 0;
    this.excluded = false;
    this.fullReplace = false;
    this.swingElement = null;
    this.lastSwingCount = 0;
    this.lastClickCount = 0;
    this.lastDump = 0
    this.detach = false;
    
    this.element = tileRoot.cloneNode(false);
    tileRoot.parentNode.appendChild(this.element);
    this.element.id = "t" + this.id;
    this.element.style.height = tileHeight + "%";
    this.element.style.width = tileWidth + "%";
    this.element.style.top = tileTop + (this.row * tileHeight ) + "%";
    this.element.style.left = tileLeft + (this.column * tileWidth) + "%";
    this.element.style.backgroundColor = randomColor();
    this.element.style.opacity = 1;
    this.element.addEventListener("click", startSwing);

    this.farLeft0Tile = this.farLeft1Tile = this.farRight0Tile = this.farRight1Tile = null;
    this.left0Tile = this.left1Tile = this.left2Tile = null;
    this.right0Tile = this.right1Tile = this.right2Tile = null;
    this.bottom1Tile = this.bottom2Tile = null;
    if (this.column > 0) {
        this.left0Tile = tiles[this.id - 1];
        tiles[this.id - 1].right0Tile = this;
        if (this.column > 1) {
            this.farLeft0Tile = tiles[this.id - 2];
            tiles[this.id - 2].farRight0Tile = this;
        } 
        if (this.row > 0) {
            tiles[this.id - (tilesPerRow + 1)].right1Tile = this;
            if (this.row > 1) { tiles[this.id - ((2 * tilesPerRow) + 1)].right2Tile = this; }
            if (this.column > 1) { tiles[this.id - (tilesPerRow + 2)].farRight1Tile = this;}
        }
    }
    if (this.column < (tilesPerRow - 1)) {
        if (this.row > 0) {
            tiles[this.id - (tilesPerRow - 1)].left1Tile = this;
            if (this.row > 1) {
                tiles[this.id - ((2 * tilesPerRow) - 1)].left2Tile = this;
            }
            if (this.column < (tilesPerRow - 2)) { tiles[this.id - (tilesPerRow - 2)].farLeft1Tile = this; }
        }
    }
    if (this.row > 0) {
        tiles[this.id - tilesPerRow].bottom1Tile = this;
        if (this.row > 1) {
            tiles[this.id - (2 * tilesPerRow)].bottom2Tile = this;
        }
    }
}
function adjustChildParts(tilePartElement, parentTile) {
    if (tilePartElement) {
        tilePartElement.id = parentTile.element.id + "p" + parentTile.partCount++;
        adjustChildParts(tilePartElement.firstChild, parentTile);
        adjustChildParts(tilePartElement.nextSibling, parentTile);
    }
}
function appendPart(swingTile, parentTile) {
    var newPart = null
    ,   originalTile = null
    ,   currentPart = null
    ,   originalTop = 0
    ,   player = null;

    if (parentTile && !parentTile.excluded) {
        newPart = swingTile.swingElement.cloneNode(true);
        originalTile = tiles[parseInt(swingTile.swingElement.id.substring(1))];
        parentTile.element.appendChild(newPart);
        newPart.style.height = newPart.style.width = "100%";
        newPart.style.top = (100 * (originalTile.row - parentTile.row)) + "%";
        newPart.style.left = (100 * (originalTile.column - parentTile.column)) + "%";
        newPart.style.zIndex = null;
        if (swingTile.fullReplace) {
            newPart.style.transform = "rotate(" + swingTile.endAngle + "deg)";
        } else {
            newPart.style.transform = getComputedStyle(swingTile.swingElement).transform;
        }
        newPart.style.pointerEvents = "none";
        newPart.id = parentTile.element.id + "p" + parentTile.partCount++;
        adjustChildParts(newPart.firstChild, parentTile);

        if (parentTile.partCount > partCountLimit) {
            (function(t) {
                setTimeout(dumpParts, 500 + (Math.random() * 2000), t);
            }) (parentTile);
        }
    }
}
function detachSwingTile() {
    var detachTileElement = null
    ,   dupSwing = null
    ,   angleToCenter = 0
    ,   tileOriginX = 0
    ,   tileOriginY = 0
    ,   originalTop = 0
    ,   originalLeft = 0
    ,   durationUnit = 2000;
    
    if (swingTile) {
        swingTile.swingElement.removeEventListener("click", startSwing);

        tileOriginX = parseInt(swingTile.swingElement.style.transformOrigin.split("%")[0]);
        tileOriginY = parseInt(swingTile.swingElement.style.transformOrigin.split("%")[1]);
        durationUnit = tileOriginY ? durationUnit/2 : durationUnit;
        angleToCenter = (tileOriginX ? (tileOriginY ? -135 : 135) : (tileOriginY ? -45 : 45));
            
        detachTileElement = tileRoot.cloneNode(false);
        detachTileElement.id = "detach" + swingTile.id;
        detachTileElement.style.overflow = "visible";
        tileRoot.parentNode.appendChild(detachTileElement);
        detachTileElement.style.top = (parseFloat(swingTile.swingElement.style.top) +
            (Math.sin((swingTile.endAngle + angleToCenter) * degreesToRadians) * tileHeight * diagonalFactor) +
            (tileHeight * tileOriginY/100)) + "%";
        originalTop = parseFloat(detachTileElement.style.top);
        detachTileElement.style.left = (parseFloat(swingTile.swingElement.style.left) +
            (Math.cos((swingTile.endAngle + angleToCenter) * degreesToRadians) * tileWidth * diagonalFactor) +
            (tileWidth * tileOriginX/100)) + "%";
        originalLeft = parseFloat(detachTileElement.style.left);
        
        // duplicating swing tile due to apparent bug in transform property after web animation
        dupSwing = swingTile.swingElement.cloneNode(true);
        tileRoot.parentNode.removeChild(swingTile.swingElement);
        swingTile.swingElement = dupSwing;
        dupSwing.id = "sdetach" + swingTile.id;
        detachTileElement.appendChild(dupSwing);
        dupSwing.style.height = dupSwing.style.width = tileSide + "px";
        dupSwing.style.transformOrigin = null;
        dupSwing.style.top = dupSwing.style.left = null;

        swingTile.startAngle = swingTile.endAngle;
        swingTile.endAngle = swingTile.endAngle + (tileOriginX ? -360 : 360);
        swingTile.player = swingTile.swingElement.animate(
            [ { transform: "translate3D(-50%, -50%, 0) rotate(" + swingTile.startAngle + "deg)" }
            , { transform: "translate3D(-50%, -50%, 0) rotate(" + swingTile.endAngle + "deg)"} ]
        ,   { duration: durationUnit, easing: "linear", iterations: 3, fill: "forwards" });
        (function(t) {
            swingTile.player.addEventListener("finish",function(e) {
                tileRoot.parentNode.removeChild(t);
            });
        }) (detachTileElement);
        detachTileElement.animate(
            [ { left: detachTileElement.style.left }
            , { left: (originalLeft + (tileOriginX ? 100 : -100)) + "%" } ]
        ,   { duration: durationUnit, easing: "linear", iterations: 1, fill: "forwards" });
        detachTileElement.animate(
            [ { top: detachTileElement.style.top, offset: 0 }
            , { top: (originalTop - (tileOriginY ? 5 : 2)) + "%", offset: 0.02 }
            , { top: (originalTop + 100) + "%", offset: 1 } ]
        ,   { duration: durationUnit, easing: "cubic-bezier(0.7, 0, 1, 1)", iterations: 1, fill: "forwards" });
        swingTile.detach = false;
        swingTile = swingTile.swingElement = null;
    }
}
function dumpParts(tile) {
    var currentPart = null
    ,   originalTop = 0
    ,   player = null;

    if (tile) {
        currentPart = tile.element.firstChild;
        while (currentPart) {
            originalTop = parseInt(currentPart.style.top);
            player = currentPart.animate(
                [{ top: originalTop + "%"}, { top: (originalTop + (100 * tilesPerColumn)) + "%"}]
            ,   { duration: (300 * tilesPerColumn), delay: (1000 * Math.random()), easing: "ease-in", iterations: 1, fill: "forwards" });
            //console.log("dropping " + currentPart.id + " from " + originalTop);
            //player.addEventListener("finish", function(e) {
            //    if (e && e.target && e.target.effect && e.target.effect.target && e.target.effect.target.parentNode) {
            //        e.target.effect.target.parentNode.removeChild(e.target.effect.target);
            //        //console.log(" removing " + e.target.effect.target.id);
            //    }
            //});
            (function (p) {
                player.addEventListener("finish", function(e) {
                    if (p && p.parentNode) {
                        p.parentNode.removeChild(p);
                    }
                });
            }) (currentPart);
            currentPart = currentPart.nextSibling;
        }
        tile.partCount = 0;
        tile.lastDump = swingCount;
    }
}
function excludeTile() {
    var excludeTileChance = 0.08;

    if (excludedTile) {
        excludedTile.element.style.zIndex = null;
        raisedTileMask.style.opacity = 0;
        excludedTile.excluded = false;
        excludedTile = null;
    } else if (Math.random() < excludeTileChance) {
        excludedTile = tiles[Math.floor(Math.random() * tiles.length)];
        excludedTile.element.appendChild(raisedTileMask);
        //delay slightly to allow for full transition
        setTimeout(function() {
            excludedTile.element.style.zIndex = 2;
            raisedTileMask.style.opacity = 0.8;
            excludedTile.excluded = true;
        },500);
    }
    exclusionTimeout = null;
}
function freezeSwingTile() {
    var tileAngleSin = 0
    ,   tileAngleCos = 0
    ,   tileOriginX = 0
    ,   tileOriginY = 0
    ,   stampTiles = [];
    if (swingTile && swingTile.player && !swingTile.detach) {
        swingTile.player.cancel();
        swingTile.player.removeEventListener("finish",swing);
        swingTile.player.removeEventListener("finish",startSwing);
        swingTile.player = null;
        swingTile.swingElement.removeEventListener("click", startSwing);

        if (swingTile.fullReplace) {
            tileAngleSin = Math.sin(swingTile.endAngle * degreesToRadians);
            tileAngleCos = Math.cos(swingTile.endAngle * degreesToRadians);
        } else {
            tileAngleSin = parseFloat(getComputedStyle(swingTile.swingElement).transform.split(",")[1]);
            tileAngleCos = parseFloat(getComputedStyle(swingTile.swingElement).transform.split(",")[3]);
        }
        tileOriginX = parseInt(swingTile.swingElement.style.transformOrigin.split("%")[0]);
        tileOriginY = parseInt(swingTile.swingElement.style.transformOrigin.split("%")[1]);
        if (tileOriginY == 0) {
            if (tileOriginX == 0) {
                stampTiles[0] = swingTile.left0Tile;
                stampTiles[1] = swingTile;
                stampTiles[2] = swingTile.bottom1Tile;
                stampTiles[3] = swingTile.left1Tile;
            } else {
                stampTiles[0] = swingTile;
                stampTiles[1] = swingTile.right0Tile;
                stampTiles[2] = swingTile.right1Tile;
                stampTiles[3] = swingTile.bottom1Tile;
            }
        } else {
            if (tileOriginX == 0) {
                if (tileAngleCos > 0) {
                    stampTiles[0] = swingTile.bottom1Tile;
                    stampTiles[1] = swingTile;
                    stampTiles[2] = swingTile.right0Tile;
                    stampTiles[3] = swingTile.right1Tile;
                } else if (tileAngleSin > 0) {
                    stampTiles[0] = swingTile.left1Tile;
                    stampTiles[1] = swingTile.bottom1Tile;
                    stampTiles[2] = swingTile.bottom2Tile;
                    stampTiles[3] = swingTile.left2Tile;
                } else {
                    stampTiles[0] = swingTile.left0Tile;
                    stampTiles[1] = swingTile.left1Tile;
                    stampTiles[2] = swingTile.farLeft1Tile;
                    stampTiles[3] = swingTile.farLeft0Tile;
                }
            } else {
                if (tileAngleCos > 0) {
                    stampTiles[0] = swingTile;
                    stampTiles[1] = swingTile.bottom1Tile;
                    stampTiles[2] = swingTile.left1Tile;
                    stampTiles[3] = swingTile.left0Tile;
                } else if (tileAngleSin < 0) {
                    stampTiles[0] = swingTile.bottom1Tile;
                    stampTiles[1] = swingTile.right1Tile;
                    stampTiles[2] = swingTile.right2Tile;
                    stampTiles[3] = swingTile.bottom2Tile;
                } else {
                    stampTiles[0] = swingTile.right1Tile;
                    stampTiles[1] = swingTile.right0Tile;
                    stampTiles[2] = swingTile.farRight0Tile;
                    stampTiles[3] = swingTile.farRight1Tile;
                }
            }
        }
        if (swingTile.fullReplace) {
            appendPart(swingTile, tileOriginX == 0 ? stampTiles[0] : stampTiles[1]);
            clearTimeout(swingTimeout);
            swingTimeout = null;   
            immediateSwing = true;
        } else {
            appendPart(swingTile, stampTiles[0]);
            appendPart(swingTile, stampTiles[1]);
            appendPart(swingTile, stampTiles[2]);
            appendPart(swingTile, stampTiles[3]);
        }
        swingTile.fullReplace = false;
        tileRoot.parentNode.removeChild(swingTile.swingElement);
        swingTile = swingTile.swingElement = null;
    }
}
function initialize() {
}
function proportionElements() {
    var screenHeight = 0
    ,   screenWidth = 0;
    
    screenHeight = document.documentElement.clientHeight;
    screenWidth = document.documentElement.clientWidth;
    tileSide = Math.min(screenHeight,screenWidth)/4.25;
    tileHeight = tileSide * 100/screenHeight;
    tileWidth = tileSide * 100/screenWidth;
    tilesPerRow = Math.round((100 - tileWidth/2)/tileWidth);
    tilesPerColumn = Math.round((100 - tileHeight/2)/tileHeight);
    tileTop = (100 - (tileHeight * tilesPerColumn))/2;
    tileLeft = (100 - (tileWidth * tilesPerRow))/2;
}
function randomColor() {
    return "hsla(" + (Math.random() * 360) + "," + (10 + colorAdjust) + "%," + (30 + (Math.random() * 50)) + "%,1)";
}
function reportPartStructure(part,lead) {
    if (part) {    
        console.log(lead + "Part id " + part.id);
        reportPartStructure(part.firstChild,lead + "  ");
        reportPartStructure(part.nextSibling,lead);
    }
}
function reportStructure() {
    console.log("colorAdjust: " + colorAdjust +
        (excludedTile ? "; excludedTile: " + excludedTile.id : "") +
        "; swingCount: " + swingCount);
    for (var i = 0, tileCount = tiles.length; i < tileCount; i++) {
        reportTile(tiles[i])
        reportPartStructure(tiles[i].element.firstChild,"  ");
    }
}
function reportTile(tile) {
    console.log("Tile " + tile.id + "; " + tile.partCount + " parts; " +
        "angles: " + tile.startAngle + "/" +  tile.restAngle + "/" + tile.endAngle + "; " +
        "counts: " + tile.lastSwingCount + "/" + tile.lastClickCount + "/" + tile.lastDump + "; " +
        "priority: " + swingPriority(tile) + "; " +
        (tile.player ? "player " + tile.player.effect.target.id + ";" : "") +
        (tile.excluded ? "excluded; " : "") + (tile.fullReplace ? "full replace; " : "") +
        (tile.swingElement ? " swing: " + tile.swingElement.id + "; " : ""));
}
function startSwing(event, tile) {
    var clicked = false
    ,   clickX = 0
    ,   clickY = 0
    ,   backTileElement = null
    ,   clickedSwingingTile = false
    ,   replaceTileChance = 0.05
    ,   detachTileChance = 0.03
    ,   translucencyChance = 0.05;

    clearTimeout(swingTimeout);
    swingTimeout = null;   
    freezeSwingTile();
    
    if (event && (event.type == "click")) {
        //click-triggered swing
        clicked = true;
        tile = tiles[parseInt(event.currentTarget.id.substring(1))];
        clickedSwingingTile = event.currentTarget.id.substring(0,1) == "s" ? true : false;
        clickX = event.pageX - tile.element.offsetLeft - (tileSide/2);
        clickY = event.pageY - tile.element.offsetTop - (tileSide/2);
        // re-extend timer on automated swings
        initialDelay = 3000;
        colorAdjust = 0;
    } else {
        //randomly assign click location if needed
        clickX = Math.random() - 0.5;
        clickY = ((tile.row == (tilesPerColumn - 1)) || (tile.partCount == 0) ? -1 : Math.random() - 0.5);
        colorAdjust = colorAdjust + 0.2;
    }
    // just stop tile if swinging tile clicked
    if (!clickedSwingingTile && !tile.excluded) {
        //replace original tile with new element
        swingTile = tile;
        backTileElement = tile.element.cloneNode(false);
        swingTile.swingElement = tileRoot.parentNode.replaceChild(backTileElement, tile.element);
        tileRoot.parentNode.appendChild(swingTile.swingElement);
        swingTile.swingElement.id = "s" + swingTile.id;
        swingTile.swingElement.style.zIndex = 1;
        swingTile.element = backTileElement;
        swingTile.partCount = 0;
        swingTile.element.style.backgroundColor = randomColor() ;
        if (swingCount > specialActionsCount) {
            if (Math.random() < replaceTileChance) {
                swingTile.fullReplace = true;
            } else if (Math.random() < detachTileChance) {
                swingTile.detach = true;
            } else if (Math.random() < translucencyChance) {
                tileOpacity = 0.3 + Math.random() ;
            }
        }
        if (tileOpacity < 1) {
            swingTile.swingElement.style.opacity = tileOpacity;
            tileOpacity = tileOpacity + 0.05;
        }
        swingTile.element.addEventListener("click",startSwing);
        swingTile.lastSwingCount = swingCount;
        if (clicked) {
            swingTile.lastClickCount = swingCount;
        }

        if (clickY < 0) {
            if (clickX < 0) {
                swingTile.swingElement.style.transformOrigin = "0% 0% 0";
                swingTile.restAngle = 45;
            } else {
                swingTile.swingElement.style.transformOrigin = "100% 0% 0";
                swingTile.restAngle = -45;
            }
        } else {
            if (clickX < 0) {
                swingTile.swingElement.style.transformOrigin = "0% 100% 0";
                swingTile.restAngle = 135;
            } else {
                swingTile.swingElement.style.transformOrigin = "100% 100% 0";
                swingTile.restAngle = -135;
            }
        }
        swingTile.startAngle = 0;
        swing();
        swingCount++;
    }
}
function swing(event) {
    var swingFactor = 0.75
    ,   detachFactor = 0.5
    ,   swingDuration = 500
    ,   easingValue = "";

    if (swingTile) {
        if (swingTile.fullReplace) {
            swingTile.endAngle = parseInt(swingTile.swingElement.style.transformOrigin.split("%")[1]) == 0 ?
                (parseInt(swingTile.swingElement.style.transformOrigin.split("%")[0]) == 0 ? 90 : -90) :
                (parseInt(swingTile.swingElement.style.transformOrigin.split("%")[0]) == 0 ? 1 : -1) * (Math.random() < 0.33 ? 90 : Math.random() < 0.5 ? 180 : 270);
            easingValue = "ease-in-out";
        } else if (swingTile.detach) {
            swingTile.endAngle = swingTile.restAngle + ((swingTile.restAngle - swingTile.startAngle) * detachFactor);
            easingValue = "ease-in";
            swingDuration = swingDuration * 0.8;
        } else {
            swingTile.endAngle = swingTile.restAngle + ((swingTile.restAngle - swingTile.startAngle) * swingFactor);
            easingValue = "ease-in-out";
            //console.log("swing element at " + getComputedStyle(swingTile.swingElement).transform + "; " +
                //" start/rest/end: " + swingTile.startAngle + "/" + swingTile.restAngle + "/" + swingTile.endAngle + "/");
        }
        // prevent jittery swing due to unknown timing problem
        if (swingTile.startAngle && (Math.round(100 * getComputedStyle(swingTile.swingElement).transform.split(",")[1]) !=
                Math.round(100 * Math.sin(swingTile.startAngle * degreesToRadians)))) {
            //console.log("swing difference - actual sin: " + parseFloat(getComputedStyle(swingTile.swingElement).transform.split(",")[1]) +
                //", computed: " + Math.sin(swingTile.startAngle * degreesToRadians));
            freezeSwingTile();
        } else {
            swingTile.player = swingTile.swingElement.animate(
                [{ transform: "rotate(" + swingTile.startAngle + "deg)"}, { transform: "rotate(" + swingTile.endAngle + "deg)"}]
            ,   { duration: swingDuration, easing: easingValue, iterations: 1, fill: "forwards" });
    
            if (swingTile.fullReplace) {
                swingTile.player.addEventListener("finish",freezeSwingTile);
            } else if (swingTile.detach) {
                swingTile.player.addEventListener("finish",detachSwingTile);
            } else if (Math.abs(swingTile.startAngle - swingTile.endAngle) < 1) {
                freezeSwingTile();
            } else {
                swingTile.player.addEventListener("finish", swing);
                swingTile.startAngle = swingTile.endAngle;
            }
        }
    }
}
function swingPriority(tile) {
    //lower number = higher priority
    return  ((tile.lastSwingCount - swingCount) * 1) +
        ((tile.lastClickCount - swingCount) * 1) +
        (tile.partCount * 2);
}
function animationLoop() {
    var sortedTiles = []
    ,   groutElements = null
    ,   groutColor = "";
        
    if (swingTimeout == null) {
        if (swingCount && (swingCount % resetCount == 0)) {
            tiles.forEach(function(t) { dumpParts(t); });
            
            groutElements = document.querySelectorAll(".grout");
            groutColor = "hsla(0,0%," + (Math.random() * 100) + "%,1)";
            for (var i = 0, l = groutElements.length; i < l; i++) {
                groutElements[i].style.backgroundColor = groutColor;
            }
        }
        sortedTiles = tiles.slice().sort(function(a,b) { return swingPriority(a) - swingPriority(b); });
        swingTimeout = setTimeout(startSwing,
            immediateSwing ? 200 : initialDelay + minimumDelay + (maximumDelay * Math.random()),
            null, sortedTiles[Math.floor(Math.random() * tilesPerRow)]);
        initialDelay = Math.max(0,initialDelay - decrementDelay);
        immediateSwing = false;
    }
    if ((exclusionTimeout == null) && (swingCount > specialActionsCount)) {
        exclusionTimeout = setTimeout(excludeTile, 10000);
    }
    animationId = requestAnimFrame(animationLoop);
}
initialize();
})();
