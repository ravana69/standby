(function() {
"use strict";
    
var canvasRoot = document.querySelector(".canvas")
,   animationId = null
,   priorTimestamp = 0
,   display = null
,   cubeCount = 0
;
window.onload = function() {
    display = createDisplay();
    animationId = window.requestAnimationFrame(animationLoop);
}
window.onresize = function() {
    display = createDisplay();
}
function createCube(display, parent, joint, vertex) {
    var newCube = null
    ,   Cube = function(display, parent, joint, vertex) {
            this.id = cubeCount++;
            this.display = display;
            this.urCube = display.urCube;
            this.joints = [];
            this.vertices = [];
            this.parent = parent || null;
            if (vertex === undefined) {
                this.baseCube = true;
                this.joint = (joint === undefined) ? null : joint;
                this.flipped = false;
                this.reorient();
                if (((this.x + this.width) < (-1 * this.width)) || 
                    (this.x > (display.backElement.width + this.width)) ||
                    ((this.y + this.width) < (-1 * this.width)) ||
                    (this.y > (display.backElement.height + this.width))) {
                    this.id = null;
                } else  {
                    if (this.parent) {
                        this.parent.joints[this.urCube.joints[this.joint][0] - 1] = this;
                        this.joints[this.joint] = parent;
                    }
                    this.distanceFromCenter =
                        Math.sqrt(Math.pow((this.x - display.xDistanceFactor), 2) +
                                  Math.pow((this.y - display.yDistanceFactor), 2));
                }
            } else {
                this.baseCube = false;
                if (this.parent.vertices[vertex]) {
                    this.id = null;
                } else {
                    this.parent.vertices[vertex] = this;
                    this.vertex1 = vertex;
                    if (vertex == 0) {
                        this.vertex2 = 0;
                    } else {
                        this.vertex2 = 2;
                    }
                    this.flipped = this.vertex1 ? this.parent.flipped : !this.parent.flipped;
                    this.scale = (Math.random() < 0.5) ? 0.25 : 0.5;
                    this.scaleFactor = 0;
                    this.cubeGrowthRate = 0;
                    this.reorient();
                }
            }
        }
    ;
    Cube.prototype = {
        draw: function() {
            this.display.backContext.drawImage(this.display.urCube.element,
                0, this.flipped ? this.urCube.width : 0, this.urCube.width, this.urCube.width,
                this.x, this.y, this.width, this.width);
        }
    ,   reorient: function() {
            var scale = 0
            ,   x1Offset = 0
            ,   y1Offset = 0
            ,   x2Offset = 0
            ,   y2Offset = 0
            ,   vertex1 = 0
            ,   vertex2 = 0
            ;
            if (this.baseCube) {
                this.width = Math.round(this.urCube.width * this.display.scale);
                if (this.parent) {
                    this.x = Math.round(this.parent.x +
                        (this.urCube.orientation.jointOffsets[this.joint][0] * this.display.scale));
                    this.y = Math.round(this.parent.y +
                        (this.urCube.orientation.jointOffsets[this.joint][1] * this.display.scale));
                } else {
                    this.x = Math.round((display.backElement.width/2) - (this.urCube.width * this.display.scale/2));
                    this.y = Math.round((display.backElement.height/2) - (this.urCube.width * this.display.scale/2));
                }
            } else {
                this.scaleFactor = Math.min(1, this.scaleFactor + this.cubeGrowthRate);
                scale = this.scaleFactor * this.scale;
                this.width = Math.round(this.parent.width * scale);
                x1Offset = (this.display.scale * this.urCube.orientation.vertices[this.vertex1][0][0]) + (this.parent.width/2);
                y1Offset = (this.display.scale * this.urCube.orientation.vertices[this.vertex1][1][0]) - (this.parent.width/2);
                x2Offset = (this.parent.width/2) + (this.display.scale * this.urCube.orientation.vertices[this.vertex2][0][0]);
                y2Offset = (this.parent.width/2) - (this.display.scale * this.urCube.orientation.vertices[this.vertex2][1][0]);
                this.x = Math.round(this.parent.x + x2Offset - (scale * x1Offset));
                this.y = Math.round(this.parent.y + y2Offset + (scale * y1Offset));
            }
        }
    }
    newCube = new Cube(display, parent, joint, vertex);
    if (newCube.id === null) {
        cubeCount--;
        return null;
    } else {
        return newCube;
    }
}
function createDisplay() {
    var Display = function() {
            this.screenHeight = document.documentElement.clientHeight;
            this.screenWidth = document.documentElement.clientWidth;
            this.screenCenter = [Math.round(this.screenWidth/2), Math.round(this.screenHeight/2)];
            this.backElement = document.querySelector("#background");
            this.backContext = this.backElement.getContext("2d");
            this.backElement.style.width = this.backElement.style.height =
                Math.sqrt(Math.pow(this.screenHeight,2) + Math.pow(this.screenWidth,2)) + "px";
            this.backElement.width = this.backElement.height = this.backElement.clientHeight;
            this.backAngle = Math.PI * Math.random();
            this.angleIncrement = 0;
            this.foreElement = document.querySelector("#foreground");
            this.circleElement = document.querySelector("#colorCircle");
            this.hues = [];
            this.saturations = [];
            this.luminosities = [];
            this.urCube = createUrCube(this);
            this.scale = 0.5;
            this.xDistanceFactor = (this.backElement.width - this.urCube.width)/2;
            this.yDistanceFactor = (this.backElement.width - this.urCube.width)/2;
            this.cubes = []
            this.generateCubes();
            this.drawCubes();
            this.baseCubeCount = 0;
            
            this.foregroundVisible = true;
            this.drawPhase = "initializing"
            this.allowDrawCubes = false;
            this.allowColorChange = false;
            this.allowSpawn = false;
            this.colorDelay = 0;
            this.spawnDelay = 0;
            this.colorRemaining = 0;
            this.priorSpawnDelay = 0;
            this.maxVelocity = 0;
            this.clockwise = true;
            this.colorCircleMaxWidth = 2 * Math.max(this.screenWidth, this.screenHeight);
            this.colorCircleVisible = false;
        }
    ,   priorRemainingTime = 0
    ,   recolorMethod = null
    ,   hueShift = []
    ,   luminosityShift = []
    ,   saturationShift = []
    ,   newCube = null
    //,   cubeGrowthRate = 0
    ,   phaseDuration = 0
    ,   phaseRemaining = 0
    ,   acceleration = 0
    //,   priorSpeed = 0
    ,   visibleCubes = []
    ,   clickX = 0
    ,   clickY = 0
    ,   clickWidth = 0
    ,   chosenHue = null
    ,   chosenSaturation = null
    ,   chosenLuminosity = null
    ,   defaultSaturation = 70
    ,   defaultLuminosity = 70
    ,   clickType = null
    ,   centeringTransform = "translate3d(-50%, -50%, 0)"
    ,   standardHues = [0, 30, 60, 120, 240, 270]
    ;
    Display.prototype = {
        chooseColor: function(x, y) {
            clickType = "color";
            clickX = parseInt(x);
            clickY = parseInt(y);
            clickWidth = 1;
            chosenHue = 360 * clickX/this.screenWidth;
            chosenSaturation = 10 + (80 * clickY/this.screenHeight);
            this.circleElement.style.left = clickX + "px";
            this.circleElement.style.top = clickY + "px";
            this.circleElement.style.opacity = 1;
            this.circleElement.style.backgroundColor = "hsla(" + chosenHue + ", " + chosenSaturation + "%, " + defaultLuminosity + "%, 1)";
        }
    ,   chooseLuminosity: function(x, y) {
            clickType = "luminosity";
            clickX = parseInt(x);
            clickY = parseInt(y);
            clickWidth = 1;
            chosenHue = 360 * clickX/this.screenWidth;
            chosenLuminosity = 80 - (60 * clickY/this.screenHeight);
            this.circleElement.style.left = clickX + "px";
            this.circleElement.style.top = clickY + "px";
            this.circleElement.style.opacity = 0.5;
            this.circleElement.style.backgroundColor = "hsla(" + chosenHue + ", " + defaultSaturation + "%, " + chosenLuminosity + "%, 1)";
        }
    ,   determineVisibility: function() {
            visibleCubes = [];
            this.cubes.forEach( function(cube) {
                if ((cube.distanceFromCenter * cube.display.scale) < (cube.display.backElement.width/2)) {
                    visibleCubes.push(cube);
                }
            });
            this.baseCubeCount = visibleCubes.length;
            visibleCubes.sort( function(a, b) { return (a.distanceFromCenter - b.distanceFromCenter); });
        }
    ,   draw: function(interval) {
            this.backAngle += this.angleIncrement;
            if (clickWidth) {
                clickWidth += (2 * interval);
                this.circleElement.style.width = this.circleElement.style.height = clickWidth + "px";
                if (clickWidth > this.colorCircleMaxWidth) {
                    clickWidth = 0;
                    this.circleElement.style.opacity = 0;
                    if (clickType == "color") {
                        this.foreElement.style.backgroundColor = this.circleElement.style.backgroundColor;

                    } else if (clickType == "luminosity") {
                        //this.hues[2] = chosenHue;
                        //this.luminosities[2] = chosenLuminosity;
                        this.colorRemaining = 1000;
                        this.recolor(this.colorRemaining, true, "clickShift");
                    }
                }
            }
            phaseRemaining -= interval;
            switch (this.drawPhase) {
                case "initializing":
                    if ((phaseRemaining <= 0) && !this.colorCircleVisible) {
                        this.resetColors();
                        this.scale = 0.5 + (Math.random() * 0.5);
                        this.determineVisibility();
                        this.allowDrawCubes = true;
                        this.foreElement.style.opacity = 0;
                        this.drawPhase = "fadeForeground"
                        phaseDuration = phaseRemaining = 2000;
                        this.angleIncrement = 0;
                        this.foreElement.style.cursor = "default";
                    }
                    break;
                case "fadeForeground":
                    if (!this.foregroundVisible || (phaseRemaining <= 0)) {
                        this.drawPhase = "introduction"
                        phaseDuration = phaseRemaining = 1000;
                    }
                    break;
                case "introduction":
                    if (phaseRemaining <= 0) {
                        this.drawPhase = "border"
                        phaseDuration = phaseRemaining = 3000;
                        this.recolor(phaseDuration, true, "border");
                        this.maxVelocity = 0.001 + (Math.random() * 0.002)
                        //this.clockwise = (Math.random() < 0.5);
                        acceleration = (this.clockwise ? 1 : -1) * this.maxVelocity * interval/phaseDuration;
                    }
                    break;
                case "border":
                    this.recolor(phaseRemaining);
                    this.angleIncrement = Math.max(-1 * this.maxVelocity, Math.min(this.maxVelocity,
                        this.angleIncrement + acceleration));
                    if (phaseRemaining <= 0) {
                        this.drawPhase = "borderPause"
                        phaseDuration = phaseRemaining = 1000;
                    }
                    break;
                case "borderPause":
                    if (phaseRemaining <= 0) {
                        this.drawPhase = "expand"
                        phaseDuration = phaseRemaining = 20000;
                        this.allowColorChange = true;
                        this.allowSpawn = true;
                        this.colorDelay = phaseDuration/4;
                        this.priorSpawnDelay = this.spawnDelay = phaseDuration/3;
                        this.urCube.generateOrientations(phaseDuration, interval,
                            Math.PI * (0.3 + (Math.random() * 0.1)), -1 * Math.PI * (0.3 + (Math.random() * 0.1)));
                        this.foreElement.style.cursor = "pointer";
                    }
                    break;
                case "expand":
                    if (this.urCube.futureOrientations.length > 0) {
                        this.urCube.orientation = this.urCube.futureOrientations.shift();
                    } else {
                        this.drawPhase = "expandCoast";
                        phaseDuration = phaseRemaining = 5000;
                    }
                    break;
                case "expandCoast":
                    if (phaseRemaining <= 0) {
                        this.drawPhase = "reverse";
                        phaseDuration = phaseRemaining = 10000;
                        acceleration = (this.clockwise ? -2 : 2) * this.maxVelocity * interval/phaseDuration;
                        this.foreElement.style.cursor = "default";
                    }
                    break;
                case "reverse":
                    this.angleIncrement = Math.max(-1 * this.maxVelocity, Math.min(this.maxVelocity,
                        this.angleIncrement + acceleration));
                    if (phaseRemaining <= 0) {
                        this.drawPhase = "contract"
                        phaseDuration = phaseRemaining = 20000;
                        this.urCube.generateOrientations(phaseDuration, interval, 0, 0);
                    }
                    break;
                case "contract":
                    if (this.urCube.futureOrientations.length > 0) {
                        this.urCube.orientation = this.urCube.futureOrientations.shift();
                    } else {
                        this.drawPhase = "complete";
                        phaseDuration = phaseRemaining = 100;
                        this.allowColorChange = false;
                        this.allowSpawn = false;
                        //acceleration = -1 * this.angleIncrement * interval/phaseDuration;
                        acceleration = -0.05 * this.angleIncrement * interval/phaseDuration;
                    }
                    break;
                case "complete":
                    this.angleIncrement = Math.max(-1 * this.maxVelocity, Math.min(this.maxVelocity,
                        this.angleIncrement + acceleration));
                    if (phaseRemaining <= 0) {
                        this.foreElement.style.backgroundColor = "hsla(" + this.urCube.display.hues[1] + ", " +
                            this.urCube.display.saturations[1] + "%, " + this.urCube.display.luminosities[1] + "%, 1)";
                        this.foreElement.style.opacity = 1;
                        this.drawPhase = "addForeground";
                        phaseDuration = phaseRemaining = 3000;
                    }
                    break;
                case "addForeground":
                    this.angleIncrement += acceleration;
                    if (this.foregroundVisible) {
                        this.allowDrawCubes = false;
                        this.drawPhase = "initializing";
                        phaseDuration = phaseRemaining = 3000;
                        this.foreElement.style.cursor = "pointer";
                    }
                    break;
            }
            if (this.allowColorChange) {
                if (this.colorRemaining > 0) {
                    this.recolor(this.colorRemaining);
                    this.colorRemaining -= interval;
                } else {
                    this.colorDelay -= interval;
                    if (this.colorDelay <= 0) {
                        if (Math.random() < 0.5) {
                            this.colorRemaining = 4000;
                            this.recolor(this.colorRemaining, true);
                        }
                        this.colorDelay = 3000;
                    }
                }
            }
            if (this.allowSpawn) {
                this.spawnDelay -= interval;
                if (this.spawnDelay <= 0) {
                    newCube = createCube(this, visibleCubes[Math.floor(Math.pow(Math.random(), 3) * this.baseCubeCount)],
                        undefined, (Math.random() < 0.5) ? 0 : 7);
                    if (newCube) {
                        visibleCubes.push(newCube);
                        newCube.cubeGrowthRate = interval/(300 + (Math.random() * 600));
                    }
                    this.priorSpawnDelay = this.spawnDelay = Math.max(500, this.priorSpawnDelay * 0.5);
                }
            }
            if (this.allowDrawCubes) {
                this.drawCubes();
            }
        }
    ,   drawCubes: function() {
            this.urCube.draw();
            this.backElement.style.transform = centeringTransform + " rotate(" + this.backAngle + "rad)";            
            visibleCubes.forEach( function(cube) {
                cube.reorient();
                cube.draw();
            });
        }
    ,   generateCubes: function(cube, joint, nextJoint) {
            var newCube = createCube(this, cube, joint)
            ;
            if (newCube) {
                this.cubes.push(newCube);
                if (cube) {
                    this.generateCubes(newCube, joint, nextJoint);
                    if (nextJoint !== undefined) {
                        this.generateCubes(newCube, nextJoint);
                    }
                } else {
                    for (var i = 0; i < 6; i++) {
                        this.generateCubes(newCube, i, (i + 1) % 6);
                    }
                }
            }
        }
    ,   recolor(remainingTime, reset, type) {
            var boundedTime = Math.max(remainingTime, 0)
            ,   increment = priorRemainingTime - boundedTime
            ,   dice = 0
            //,   urCube = this
            ,   shift = 0
            ;
            if (reset) {
                priorRemainingTime = Math.max(remainingTime, 1);
                dice = Math.random();
                if (type == "border") {
                    recolorMethod = "border";
                    luminosityShift[3] = (((Math.random() < 0.5) ? 20 : 90) - this.luminosities[3])/priorRemainingTime;
                } else if (type == "clickShift") {
                    recolorMethod = "clickShift";
                    hueShift[2] = (chosenHue - this.hues[2])/priorRemainingTime;
                    luminosityShift[2] = (chosenLuminosity - this.luminosities[2])/priorRemainingTime;
                } else if (dice < 0.33) {
                    recolorMethod = "hueShift";
                    hueShift = [(90 - (Math.random() * 180))/priorRemainingTime,
                        (90 - (Math.random() * 180))/priorRemainingTime];
                } else if (dice < 0.66) {
                    recolorMethod = "luminosityShift"
                    shift = (Math.random() < 0.5) ? 1 : 2;
                    for (var i = 0; i < 3; i++) {
                        luminosityShift[i] = (this.luminosities[(i + shift) % 3] - this.luminosities[i])/priorRemainingTime;
                    }
                } else {
                    recolorMethod = "saturationChange"
                    shift = (Math.random() < 0.5) ? 1 : 2;
                    for (var i = 0; i < 3; i++) {
                        saturationShift[i] = (this.saturations[(i + shift) % 3] - this.saturations[i])/priorRemainingTime;
                    }
                }
            } else if (increment > 0) {
                if (recolorMethod == "border") {
                    this.luminosities[3] += (increment * luminosityShift[3]);
                } else if (recolorMethod == "clickShift") {
                    this.hues[2] += (increment * hueShift[2]);
                    this.luminosities[2] += (increment * luminosityShift[2]);
                } else if (recolorMethod == "hueShift") {
                    this.hues[0] += (increment * hueShift[0]);
                    this.hues[1] += (increment * hueShift[0]);
                    this.hues[2] += (increment * hueShift[1]);
                } else if (recolorMethod == "luminosityShift") {
                    this.luminosities[0] += (increment * luminosityShift[0]);
                    this.luminosities[1] += (increment * luminosityShift[1]);
                    this.luminosities[2] += (increment * luminosityShift[2]);
                } else if (recolorMethod == "saturationChange") {
                    this.saturations[0] += (increment * saturationShift[0]);
                    this.saturations[1] += (increment * saturationShift[1]);
                    this.saturations[2] += (increment * saturationShift[2]);
                }
                priorRemainingTime = boundedTime;
            }
        }
    ,   resetColors: function() {
            this.hues[0] = this.hues[1] = this.hues[3] =
                (chosenHue !== null) ? chosenHue : standardHues[Math.floor(Math.random() * standardHues.length)];
            this.hues[2] = Math.round(Math.random() * 360);
            this.saturations[1] = this.saturations[3] = (chosenSaturation !== null) ? chosenSaturation : defaultSaturation;
            this.saturations[0] = this.saturations[1] - 30;
            this.saturations[2] = this.saturations[1] + 30;
            this.luminosities[1] = this.luminosities[3] = defaultLuminosity;
            this.luminosities[0] = defaultLuminosity - 40;
            this.luminosities[2] = defaultLuminosity - 20;
        }
    }
    return new Display();
}
function createUrCube(display) {
    var unitVertices =
            // axonometric projection - 3 vertices from closest corner (0, 0, 0)
            [   [[0.5], [0.5], [0.5]]
            ,   [[-0.5], [0.5], [0.5]]
            ,   [[-0.5], [0.5], [-0.5]]
            ,   [[0.5], [0.5], [-0.5]]
            ,   [[0.5], [-0.5], [-0.5]]
            ,   [[0.5], [-0.5], [0.5]]
            ,   [[-0.5], [-0.5], [0.5]]
            ,   [[-0.5], [-0.5], [-0.5]] ]
    ,   scale = Math.round(Math.min(display.screenWidth, display.screenHeight)/4)
    ,   scalingMatrix = [[scale, 0, 0], [0, scale, 0], [0, 0, scale]]
    ,   urVertices = []
    ,   UrCube = function(display) {
            var cube = this
            ;
            this.display = display;
            this.element = document.querySelector("#urcube");
            this.context = this.element.getContext("2d");
            this.scale = scale;
            this.element.style.width = Math.ceil(this.scale * Math.sqrt(3)) + "px";
            this.width = this.element.width = this.element.clientWidth;
            this.element.style.height = (2 * this.element.clientWidth) + "px";
            this.element.height = this.element.clientHeight;
            this.minX = 0;
            this.maxX = Math.PI/2;
            this.maxY = 0;
            this.minY = Math.PI/-2;
            this.faceVertices = [ [0, 1, 2, 3], [0, 1, 6, 5], [0, 3, 4, 5] ]
            this.joints = [ [5, 1], [6, 2], [1, 3], [2, 4], [3, 5], [4, 6] ]
            this.futureOrientations = [];
            this.orientation = new Orientation(this);
        }
    ,   Orientation = function(cube, prior, xChange, yChange, easeFactor) {
            var orientation = this
            ,   xRotation = prior ? prior.xRotation : 0
            ,   yRotation = prior ? prior.yRotation : 0
            ,   newX = Math.min(Math.max(xRotation + (xChange || 0), cube.minX), cube.maxX)
            ,   newY = Math.min(Math.max(yRotation + (yChange || 0), cube.minY), cube.maxY)
            ,   sinX = Math.sin(newX)
            ,   cosX = Math.cos(newX)
            ,   sinY = Math.sin(newY)
            ,   cosY = Math.cos(newY)
            ,   xTransformationMatrix = [[1, 0, 0], [0, cosX, (-1 * sinX)], [0, sinX, cosX]]
            ,   yTransformationMatrix = [[cosY, 0, sinY], [0, 1, 0], [(-1 * sinY), 0, cosY]]
            ,   transformationMatrix = 
                    multiplyMatrices(xTransformationMatrix, yTransformationMatrix) //, zTransformationMatrix))
            ;
            this.vertices = [];
            urVertices.forEach( function(vertex, index) {
                orientation.vertices[index] = multiplyMatrices(transformationMatrix, vertex); } );
            this.jointOffsets = [];
            this.vertexOffsets = [];
            cube.joints.forEach( function(joint, index) {
                orientation.jointOffsets[index] = [(orientation.vertices[joint[1]][0] - orientation.vertices[joint[0]][0]),
                    (orientation.vertices[joint[0]][1] - orientation.vertices[joint[1]][1]) ]; } );
            this.xRotation = newX;
            this.yRotation = newY;
            this.easeFactor = easeFactor;
        }
    ;
    UrCube.prototype = {
        draw: function() {
            var urCube = this
            ;
            this.context.setTransform(1,0,0,1,0,0);
            this.context.clearRect(0, 0, this.width, (2 * this.width));
            this.context.translate(this.width/2, this.width/2);
            this.faceVertices.forEach( function(faceVertices, index) { 
                urCube.context.beginPath();
                urCube.context.moveTo(eRound(urCube.orientation.vertices[faceVertices[0]][0][0]),
                    eRound(-1 * urCube.orientation.vertices[faceVertices[0]][1][0]));
                urCube.context.lineTo(eRound(urCube.orientation.vertices[faceVertices[1]][0][0]),
                    eRound(-1 * urCube.orientation.vertices[faceVertices[1]][1][0]));
                urCube.context.lineTo(eRound(urCube.orientation.vertices[faceVertices[2]][0][0]),
                    eRound(-1 * urCube.orientation.vertices[faceVertices[2]][1][0]));
                urCube.context.lineTo(eRound(urCube.orientation.vertices[faceVertices[3]][0][0]),
                    eRound(-1 * urCube.orientation.vertices[faceVertices[3]][1][0]));
                urCube.context.closePath();
                urCube.context.fillStyle =
                    "hsla(" + urCube.display.hues[index] + ", " + urCube.display.saturations[index] + "%, " +
                        urCube.display.luminosities[index] + "%, 1)";
                urCube.context.fill();
                urCube.context.strokeStyle = 
                    "hsla(" + urCube.display.hues[3] + ", " + urCube.display.saturations[3] + "%, " +
                        urCube.display.luminosities[3] + "%, 1)";
                urCube.context.lineWidth = 1;
                urCube.context.stroke();
            } );
            this.context.setTransform(1,0,0,1,0,0);
            this.context.scale(-1, -1);
            this.context.drawImage(this.display.urCube.element,
                0, 0, this.width, this.width, (-1 * this.width), (-2 * this.width), this.width, this.width);
        }
    ,   generateOrientations: function (givenDuration, interval, targetX, targetY) {
            var incrementCount = Math.floor(givenDuration/interval)
            ,   fullIncrementCount = incrementCount
            ,   fullXRotation = targetX - this.orientation.xRotation
            ,   fullYRotation = targetY - this.orientation.yRotation
            ,   xIncrement = fullXRotation/incrementCount
            ,   yIncrement = fullYRotation/incrementCount
            ,   xRotation = 0
            ,   yRotation = 0
            ,   easeFactor = 0
            ;
            while ((Math.abs(fullXRotation) > xIncrement) && (Math.abs(fullYRotation) > yIncrement)) {
                easeFactor = 13 * Math.pow(0.5 - Math.abs((incrementCount - (fullIncrementCount/2))/fullIncrementCount), 2);
                xRotation = xIncrement * easeFactor;
                yRotation = yIncrement * easeFactor;
                fullXRotation -= xRotation;
                fullYRotation -= yRotation;
                this.futureOrientations.push(new Orientation(this,
                    this.futureOrientations[this.futureOrientations.length - 1] || this.orientation, xRotation, yRotation,
                    easeFactor));
                incrementCount--;
            }
        }
    }
    unitVertices.forEach( function(vertex, index) {
        urVertices[index] = multiplyMatrices(scalingMatrix, vertex); } );
    return new UrCube(display);
}
function eRound(num) {
    // used to expand cube to avoid gaps between them
    if (num > 0) {
        return Math.ceil(num);
    } else {
        return Math.floor(num);
    }
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
    canvasRoot.addEventListener("transitionend", function(e) {
		if (e.propertyName == "opacity") {
            if (e.target.id == "foreground") {
                if (e.target.style.opacity == "0") {
                    display.foregroundVisible = false;
                } else if (e.target.style.opacity == "1") {
                    display.foregroundVisible = true;
                }
            } else if (e.target.id == "colorCircle") {
                if (e.target.style.opacity == "0") {
                    display.colorCircleVisible = false;
                } else if (e.target.style.opacity == "1") {
                    display.colorCircleVisible = true;
                }
            }
        }
    }, false);
    canvasRoot.addEventListener("click", function(e) {
        if (display.drawPhase == "initializing") {
            display.chooseColor(e.clientX, e.clientY);
        } else if ((display.drawPhase == "expand") || (display.drawPhase == "expandCoast")) {
            display.chooseLuminosity(e.clientX, e.clientY);
        }
    }, false);
}
function multiplyMatrices(m1, m2) {
    var result = []
    ;
    for (var i = 0; i < m1.length; i++) {
        result[i] = [];
        for (var j = 0; j < m2[0].length; j++) {
            var sum = 0;
            for (var k = 0; k < m1[0].length; k++) {
                sum += m1[i][k] * m2[k][j];
            }
            result[i][j] = sum;
        }
    }
    return result;
}
function animationLoop(ts) {
    var interval = ts - priorTimestamp
    ;
    priorTimestamp = ts;
    display.draw(interval);
	animationId = window.requestAnimationFrame(animationLoop);
}
initialize();
})();
