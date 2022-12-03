(function() {
"use strict";
    
var requestAnimFrame = window.requestAnimationFrame || 
    window.mozRequestAnimationFrame || 
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;
var cancelAnimFrame = window.cancelAnimationFrame || 
    window.mozCancelAnimationFrame || 
    window.webkitCancelAnimationFrame ||
    window.msCancelAnimationFrame;
    
var blocks = []
,   areas = []
,   browserHeight = 0
,   browserWidth = 0
,   totalArea = 0
,   displayCount = 0
,   totalBlockArea = 0
,   upperBlockFactor = 40
,   lowerBlockFactor = 250
,   upperBlockArea = 0
,   lowerBlockArea = 0
,   borderFlex = 10
,   blockDelayBase = 25
,   blockGroup = 5
,   nextDisplay = new Date(Date.now() + blockDelayBase)
,   nextRemove = 0
,   requestID = 0
,   blockframeNode = document.querySelector("#f0")
,   blockParent = blockframeNode.parentNode
,   blocksToDisplay = []
,   blocksToRemove = []
,   focusBlock = null
,   twinkleDisplay = new Date(Date.now() + (1000 * 5))
,   hues = []
,   maxDistance = 0
,   backgroundHueIndex = 0
,   changeBackgroundColor = true;
var canvas = document.querySelector(".canvas")
,   dimensions = document.querySelector("#dimensions")
,   transforms = ["transform", "msTransform", "webkitTransform", "mozTransform", "oTransform"]
,   transitionEnds = ["transitionend", "msTransitionEnd", "webkitTransitionEnd", "mozTransitionEnd", "oTransitionEnd"]
,   transformProperty = getSupportedPropertyName(transforms)
,   transitionEndEvent = getSupportedEventName(transforms,transitionEnds);

function initialize() {
    canvas.addEventListener(transitionEndEvent,function(e) { changeBackgroundColor = true; });
}

window.onload = function() {
    //color background and texture
    hues = [];
    for(var i = 0; i < (3 + (Math.random() * 5)); i++) { hues.push(Math.random() * 360); }
    proportionElements();        
    animateBlocks();
}
window.onresize = function() {
    proportionElements();
    refreshBlocks();
}
function proportionElements() {
    browserHeight = document.documentElement.clientHeight;
    browserWidth = document.documentElement.clientWidth;
    maxDistance = Math.sqrt(Math.pow(browserHeight,2) + Math.pow(browserWidth,2));
    var browserArea = browserHeight * browserWidth;
    upperBlockArea = browserArea/upperBlockFactor;
    lowerBlockArea = Math.max(browserArea/lowerBlockFactor,2000);
    //dimensions.textContent = browserHeight + " x " + browserWidth + "; upper: " + upperBlockArea + " lower: " + lowerBlockArea;
    //and generate initial area
    areas = [];
    areas.push(new Area(
        browserWidth/12 + ((Math.random() - 0.5) * (browserWidth/18)) //top left corner
    ,   browserHeight/12 + ((Math.random() - 0.5) * (browserHeight/18))
    ,   browserWidth - (browserWidth/6) //width & height
    ,   browserHeight - (browserHeight/6)
    ,   true //all sides start as borders
    ,   true
    ,   true
    ,   true
    ));
    totalArea = areas[0].area;
    totalBlockArea = 0;
}
function Area(left, top, width, height, leftborder, topborder, rightborder, bottomborder) {
    this.left = left + (leftborder ? (Math.random() - 0.5) * borderFlex : 0);
    this.top = top + (topborder ? (Math.random() - 0.5) * borderFlex : 0);
    this.width = width + (rightborder ? (Math.random() - 0.5) * borderFlex : 0) + (left - this.left);
    this.height = height + (bottomborder ? (Math.random() - 0.5) * borderFlex : 0) + (top - this.top);
    this.area = width * height;
    this.leftborder = leftborder;
    this.topborder = topborder;
    this.rightborder = rightborder;
    this.bottomborder = bottomborder;
    
    //small chance for small-enough areas to be made into blocks; tiny areas must be made into blocks
    if (((this.area < upperBlockArea) && (Math.random() < 0.3)) || (this.area < lowerBlockArea)) {
        blocks.push(new Block(left, top, width, height));
        blocksToDisplay.push(blocks.slice(-1)[0]);
        this.splitable = false;
    }
    else {
        this.splitable = true;
    }
}
function Block(left, top, width, height){
    //block constructor
    var thisBlock = this;
    this.id = blocks.length;
    this.left = left + 2;
    this.top = top + 2;
    this.width = width - 4;
    this.height = height - 4;
    this.area = this.width * this.height;
    this.hue = hues[Math.floor(Math.random() * hues.length)]
    if (!focusBlock) {
        //if no focus block is defined, use this one
        focusBlock = thisBlock;
    }
    this.distance = Math.sqrt(Math.pow(focusBlock.left - this.left,2) + Math.pow(focusBlock.top - this.top,2));

    //create matching CSS elements
    if (this.id == 0) {
        var newFrame = blockframeNode;
    } else {
        var newFrame = blockframeNode.cloneNode(true);
        blockParent.appendChild(newFrame);   
    }
    this.element = newFrame;

    //block frame
    newFrame.id = "f" + this.id;
    newFrame.style.left = this.left + "px";
    newFrame.style.top = this.top + "px";
    newFrame.style.width = this.width + "px";
    newFrame.style.height = this.height + "px";
    newFrame.style.display = "none";
    newFrame.style[transformProperty] = "matrix3d(1,0,0," +
        ((Math.random() * 0.0008) - 0.0004) + ",0,1,1," +
        ((Math.random() * 0.0008) - 0.0004) + ",0,0,1,0,1,0,0,1)";
    newFrame.addEventListener("click", function() {
        refreshBlocks(thisBlock);
    }, false);

    //block
    this.block = newFrame.firstElementChild;
    if (focusBlock == thisBlock) {
        this.block.id = "b999";
    } else {
        this.block.id = "b" + this.id;
    }

    //shading
    this.shading = this.block.firstElementChild;
    this.shading.id = "s" + this.id;
    
    //texture
    this.texture = this.block.lastElementChild;
    this.texture.id = "t" + this.id;
    this.texture.style.backgroundPosition = Math.floor((this.width - 1014) * Math.random()) + "px " + Math.floor((this.height - 763) * Math.random()) + "px";
}
function splitArea(areaIndex) {
    var splitHeight = 0
    ,   splitWidth = 0;
    
    if (areas[areaIndex].splitable) {
        //calculate split on longer side
        if (areas[areaIndex].height > areas[areaIndex].width) {
            //split horizontally
            splitHeight = goldenSide(areas[areaIndex].width);
            if (splitHeight > areas[areaIndex].height) {
                return;
            }
            else if (Math.random() < 0.5) {
                //measure split from bottom
                splitHeight = areas[areaIndex].height - splitHeight;
            }
        }
        else {
            //split vertically
            splitWidth = goldenSide(areas[areaIndex].height);
            if (splitWidth > areas[areaIndex].width) {
                return;
            }
            else if (Math.random() < 0.5) {
                //measure split from right
                splitWidth = areas[areaIndex].width - splitWidth;
            }
        }
        //split area in two based on split measure
        areas.push(new Area (
            areas[areaIndex].left
        ,   areas[areaIndex].top
        ,   splitWidth ? splitWidth : areas[areaIndex].width
        ,   splitHeight ? splitHeight : areas[areaIndex].height
        ,   areas[areaIndex].leftborder
        ,   areas[areaIndex].topborder
        ,   splitWidth ? false : areas[areaIndex].rightborder
        ,   splitHeight ? false : areas[areaIndex].bottomborder
        ));
        areas.push(new Area (
            areas[areaIndex].left + splitWidth
        ,   areas[areaIndex].top + splitHeight
        ,   areas[areaIndex].width - splitWidth
        ,   areas[areaIndex].height - splitHeight
        ,   splitWidth ? false : areas[areaIndex].leftborder
        ,   splitHeight ? false : areas[areaIndex].topborder
        ,   areas[areaIndex].rightborder
        ,   areas[areaIndex].bottomborder
        ));
    }
    // remove original area
    areas.splice(areaIndex,1);
}
function goldenSide(sideLength) {
    var rand = Math.random() - 0.5
    return sideLength / (1.618 + ((Math.abs(rand) * rand) * 2));
}
function refreshBlocks(block){
    cancelAnimFrame(requestID);
    if (block !== undefined) {
        //set id of focus block
        focusBlock.block.id = "b" + block.id;
        block.block.id = "b999";
        
        //make chosen block focus
        focusBlock = block;
        
        blocks.forEach(function(thisBlock, i, array) {
            //recalculate distances to new focus block
            thisBlock.distance = Math.sqrt(Math.pow(focusBlock.left - thisBlock.left,2) + Math.pow(focusBlock.top - thisBlock.top,2));
            blocksToRemove.push(thisBlock);
        });
        focusBlock.element.style.display = "none";
    } else {
        focusBlock.block.id = "b" + focusBlock.id;
        focusBlock = null;
        blocks.forEach(function(thisBlock) {
            //recalculate distances to new focus block
            blocksToRemove.push(thisBlock);
        });
    }
    blocksToRemove.sort( function(a,b) { return a.distance - b.distance } );
    nextRemove = new Date(Date.now());
    displayCount = 0;
    totalBlockArea = 0;
    blocksToDisplay.splice(0,blocksToDisplay.length);
    nextDisplay = new Date(Date.now() + (blockDelayBase * blockGroup));
    animateBlocks();
}
function blockDelay() {
    var areaFraction = totalBlockArea/totalArea;
    if (displayCount == 1) {
        return blockDelayBase * blockGroup * 6;
    }
    else if (displayCount < (blockGroup * 4)) {
        return blockDelayBase * blockGroup * 4 * (1 - Math.pow(displayCount/(blockGroup * 4),0.5))
    }
    else if (areaFraction > 0.9) {
        return blockDelayBase * blockGroup;
    }
    else {
        return blockDelayBase;
    }
}
function setBlockShading(block) {
    if (block.id == focusBlock.id) {
        var saturation = 100
        ,   luminosity = 50;
    } else {
        var saturation = 95 - (90 * Math.sqrt(block.distance/maxDistance)) + (Math.random() * 35)
        ,   luminosity = 45 - (70 * Math.sqrt(block.distance/maxDistance)) + (Math.random() * 20);
    }
    block.element.textContext = saturation;
    block.shading.style.backgroundImage =
        "linear-gradient(hsla(" + block.hue + "," + saturation + "%," + luminosity + "%,1)" + 
        ", hsla(" + block.hue + "," + saturation + "%," + (luminosity - 5) + "%,1))";
    block.texture.style.opacity = (0.9 - (Math.sqrt(block.distance/maxDistance)));
}
function animateBlocks() {
    //animation loop
    if (changeBackgroundColor) {
        canvas.style.backgroundColor = "hsla(" + hues[backgroundHueIndex % hues.length] + ",100%,10%,1)";
        backgroundHueIndex++;
        changeBackgroundColor = false;
    }
    if (((nextRemove <= nextDisplay) || (blocksToDisplay.length == 0)) && (Date.now() >= nextRemove) && (blocksToRemove.length > 0)) {
        //1st priority: remove first available block within radius, at random among closest blockGroup
        var index = (focusBlock && (blocksToRemove[0].id == focusBlock.id)) ? 0 : Math.min(Math.floor(Math.random() * blockGroup),blocksToRemove.length - 1);
        var block = blocksToRemove[index];
        if (areas.length != 1) {
            //not part of resize
            blocksToDisplay.push(block);
        }
        block.element.style.display = "none";
        blocksToRemove.splice(index,1);
        if ((areas.length == 1) && (blocksToRemove.length == 0)) {
            while (blocks.length > 1) {
                blockParent.removeChild(blocks.pop().element);
            }
            blocks.pop();
        } else {
            nextRemove = new Date(Date.now() + blockDelayBase);
        }
    }
    else if ((Date.now() >= nextDisplay) && (blocksToDisplay.length > 0)) {
        //2nd priority: display first available block within radius
        if (areas.length > 0) {
            //in the process of initial splitting areas, resort by distance
            blocksToDisplay.sort( function(a,b) { return a.distance - b.distance } );
        }
        //display at random among closest 5
        var index = (focusBlock && (blocksToDisplay[0].id == focusBlock.id)) ? 0 : Math.min(Math.floor(Math.random() * blockGroup),blocksToDisplay.length - 1);
        var block = blocksToDisplay[index];
        setBlockShading(block);
        block.block.classList.remove("twinkling");
        block.block.classList.add("blockappear");
        block.element.style.display = "inline";
        totalBlockArea = totalBlockArea + block.area;
        displayCount++;
        blocksToDisplay.splice(index,1);
        nextDisplay = new Date(Date.now() + blockDelay());
    }
    if ((areas.length > 0) && (blocksToRemove.length == 0)){
        //split an available area
        splitArea(Math.floor(Math.random() * areas.length));
    }
    if ((areas.length == 0) && (blocksToDisplay.length == 0) && (blocksToRemove.length == 0)) {
        //finished splitting areas and removing/displaying blocks
        if (Date.now() >= twinkleDisplay) {
            //time to twinkle a random block
            var twinkleBlock = blocks[Math.floor(Math.random() * blocks.length)];
            if (twinkleBlock !== focusBlock) {
                //don't twinkle focus block
                if (twinkleBlock.block.classList.contains('twinkling')) {
                    twinkleBlock.block.classList.remove("twinkling");
                }
                else {
                    twinkleBlock.block.classList.remove("blockappear");
                    twinkleBlock.block.classList.add("twinkling");
                    twinkleDisplay = new Date(Date.now() + (1000 * (2 + ((Math.random() - 0.5) * 4))));
                    //console.log("twinkle set on " + twinkleBlock.element.firstElementChild.id + " for " + twinkleDisplay);
                }
            }
        }
        setTimeout(function() {
            requestID = requestAnimFrame(animateBlocks); }, twinkleDisplay - Date.now());
        }
    else {
        requestID = requestAnimFrame(animateBlocks);  
    }
}
function getSupportedPropertyName(properties) {
    for (var i = 0, max = properties.length; i < max; i++) {
        if (typeof document.body.style[properties[i]] != "undefined") {
            return properties[i];
        }
    }
    return null;
}
function getSupportedEventName(properties,events) {
    for (var i = 0, max = properties.length; i < max; i++) {
        if (typeof document.body.style[properties[i]] != "undefined") {
            return events[i];
        }
    }
    return null;
}

initialize();

})();