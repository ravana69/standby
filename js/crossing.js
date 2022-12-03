(function() {
"use strict";

var animationId = null
,   canvasRoot = document.querySelector(".canvas")
,   priorTimestamp = 0
,   display = null
;
window.onload = function() {
    display = createDisplay();
    animationId = window.requestAnimationFrame(animationLoop);
}
window.onresize = function() {
    display = createDisplay();
}
function createDisplay() {
    var Display = function() {
            this.element = canvasRoot;
            this.height = this.element.clientHeight;
            this.width = this.element.clientWidth;
            this.street = new Street(this);
            this.signal = new Signal(this);
            this.basePeriod = 2000;
            this.rhythmBeats = 3;
            this.targetSteps = 9;
            this.cycleTypes = [new CycleType(this)]
            while (this.cycleTypes.length < this.rhythmBeats) {
                this.cycleTypes.push(new CycleType(this));
            }
            this.currentStep = new Cycle(this).nextStep
            this.nextStep = null;
            this.street.draw(0);
            this.currentStep.symbol.draw(this.currentStep);
        }
    ,   Cycle = function(display, resetCycle) {
            this.display = display;
            this.prevCycle = (display.currentStep && !resetCycle) ? display.currentStep.cycle : null;
            if (this.prevCycle) {
                this.type = this.display.cycleTypes[(this.prevCycle.type.phase + 1) % this.display.rhythmBeats];
                this.count = this.prevCycle.count + 1;
                this.mainSymbol = this.type.switchSymbol ? this.prevCycle.mainSymbol.otherSymbol : this.prevCycle.mainSymbol;
                this.type.switchSymbol  = false;
                this.prevCycle.type.mutate();
            } else {
                this.type = this.display.cycleTypes[0];
                this.count = 0;
                this.mainSymbol = this.display.signal.symbols[0];
            }
            this.steps = this.type.rhythm.steps.length;
            this.nextStep = new Step(this);
        }
    ,   CycleType = function(display) {
            this.display = display;
            this.phase = this.display.cycleTypes ? this.display.cycleTypes.length : 0;
            this.iconSetCounts = [0, 0];
            this.iconUseCounts = [0, 0];
            this.iconSets = [];
            this.assignIconSet(0);
            this.assignIconSet(1);
            this.rhythm = new Rhythm(this);
            switch(this.phase) {
                case 0:
                    this.hue = 150;
                    this.luminosity = 100;
                    this.switchSymbol = false;
                    break;
                case 1:
                    this.hue = 350;
                    this.luminosity = 50;
                    this.switchSymbol = true;
                    break;
                case 2:
                    this.hue = 100;
                    this.luminosity = 50;
                    this.switchSymbol = true;
                    break;
            }
            this.period = this.display.basePeriod;
        }
    ,   Graphics = function(signal) {
            this.signal = signal;
            this.element = document.querySelector("#icon");
            this.context = this.element.getContext('2d');
            this.element.style.height = Math.floor(this.signal.symbols[0].element.clientHeight/this.signal.pixels.pixelWidth) + "px";
            this.height = this.element.height = this.element.clientHeight;
            this.element.style.width = Math.floor(this.signal.symbols[0].element.clientWidth/this.signal.pixels.pixelWidth) + "px";
            this.width = this.element.width = this.element.clientWidth;
            this.center = Math.round(this.width/2);
            this.pixelColumns = Math.floor(3 * this.width/2);
            this.pixelRows = 2 * this.height;
            this.totalPixels = this.pixelColumns * this.pixelRows;
            this.context.textAlign = "center";
            this.context.textBaseline = "top";
            this.context.font = Math.round(0.9 * this.height) + "px sans-serif";
            this.testElement = document.querySelector("#test");
            this.testContext = this.testElement.getContext('2d');
            this.testElement.style.height = this.testElement.style.width = "10px";
            this.testElement.height = this.testElement.clientHeight;
            this.testElement.width = this.testElement.clientWidth;
            this.testContext.globalCompositeOperation = "source-over";
            this.testContext.textAlign = "left";
            this.testContext.textBaseline = "top";
            this.testContext.font = Math.round(0.9 * this.testElement.height) + "px sans-serif";
            this.iconSetData = [
                [[[0x261A, 0x261F],[0x270B, 0x270B, true],[0x270A, 0x270D],[0x1F446, 0x1F450],[0x1F58E, 0x1F5A3],[0x1F64F],[0x1F918, 0x1F91F],[0x1F932, 0x1F933]], 0, "hands"]
            ,   [[[0x2190, 0x21AF],[0x21C4, 0x21D9],[0x2798, 0x27BF],[0x2921, 0x2941],[0x2B00, 0x2B0D]], 1, "arrows"]
            ,   [[[0x2670, 0x2671],[0x2722, 0x274C]], 1, "stars/crosses"]
            ,   [[[0x25A0, 0x25D3], [0x1F532, 0x1F53F], [0x1F780, 0x1F7D4]], 2, "geometry"]
            ,   [[[0x0024],[0x20A0],[0x00A2, 0x00A5],[0x20A0, 0x20BF],[0x1F4B0, 0x1F4B9]], 2, "currency"]
            ,   [[[0x2618, 0x2619],[0x2672, 0x267F],[0x2690, 0x269D],[0x26A2, 0x26A9],[0x26B2],[0x2700, 0x2709]], 3, "symbols"]
            ,   [[[0x1F700, 0x1F773]], 3, "alchemy"]
            ,   [[[0x2300, 0x239A],[0x23C0, 0x23CF]], 3, "technical"]
            ,   [[[0x2669, 0x266F],[0x1D10B, 0x1D115],[0x1D11E, 0x1D124],[0x1D129, 0x1D142],[0x1D15C, 0x1D164],[0x1F398, 0x1F39D],[0x1F3B5, 0x1F3BC]], 4, "music"]
            ,   [[[0x2600, 0x260D],[0x2614],[0x26C4, 0x26C8],[0x1F300, 0x1F30C],[0x1F321, 0x1F32C]], 4, "weather"]
            ,   [[[0x263C, 0x2653],[0x26B3, 0x26BC],[0x26CE],[0x1F311, 0x1F320]], 4, "astronomy"]
            ,   [[[0x002B],[0x002D],[0x002F],[0x003C, 0x003E],[0x00F7],[0x2200, 0x22FF]], 4, "math"]
            ,   [[[0x26EB, 0x26FF], [0x1F3D4, 0x1F3F4]], 5, "building & map"]
            ,   [[[0x0386, 0x03FF]], 5, "greek"]
            ,   [[[0x0180, 0x02AF]], 5, "latin"]
            ,   [[[0x2654, 0x265F]], 5, "chess"]
            ,   [[[0x2620, 0x2623],[0x26A0, 0x26A1],[0x1F4A1, 0x1F4AB],[0x1F51E]], 5, "warnings"]
            ,   [[[0x1F650, 0x1F675],[0x1F679, 0x1F67F]], 5, "dingbats"]
            ,   [[[0x1F200, 0x1F265]], 5, "Ideographic"]
            ,   [[[0x1E900, 0x1E95F]], 5, "Adlam"]
            ,   [[[0x1E800, 0x1E8CF]], 5, "MendeKikakui"]
            // ,   [[[0x1F451, 0x1F463]], 5] // clothing
            ,   [[[0x2624, 0x262F],[0x2638],[0x26E4, 0x26EA],[0x2719, 0x2721],[0x1F4FF],[0x1F52F, 0x1F531],[0x1F540, 0x1F54F],[0x1F6D0]], 7, "spiritual"]
            ,   [[[0x2615],[0x1F32D, 0x1F37F],[0x1F950, 0x1F9C0]], 10, "food"]
            ,   [[[0x1F400, 0x1F43F],[0x1F577, 0x1F578],[0x1F980, 0x1F977],[0x1F9D9, 0x1F9DF]], 10, "animals"]
            ,   [[[0x1F380, 0x1F397]], 10, "celebration"]
            ,   [[[0x10980, 0x109FF]], 10, "MeroiticHieroglyphs"]
            ,   [[[0x2660, 0x2667],[0x1F0A0, 0x1F0AE],[0x1F0B1, 0x1F0BF],[0x1F0C1, 0x1F0CF],[0x1F0D1, 0x1F0DF],[0x1F0E0, 0x1F0F5]], 10, "cards"]
            ,   [[[0x13000, 0x1307F], [0x130D0, 0x1310F], [0x13140, 0x1319F]], 15, "EgyptianHieroglyphs"]
            ,   [[[0x1F39E, 0x1F3B4]], 15, "entertainment"] //
            ,   [[[0x1F3BD, 0x1F3D3], [0x1F3F8, 0x1F3F9]], 15, "sports"]
            ,   [[[0x1F6AB, 0x1F6CA]], 15, "signage"]
            ,   [[[0x1D800, 0x1D9EF]], 15, "SuttonSignWriting"]
            ,   [[[0x1F464, 0x1F483]], 20, "portraits"]
            ,   [[[0x26CF, 0x26E1],[0x1F680, 0x1F6AA],[0x1F6E0, 0x1F6EC],[0x1F6F0, 0x1F6F8]], 20, "traffic"]
            ,   [[[0x1F000, 0x1F02B]], 20, "mahjong"]
            ,   [[[0x1F030, 0x1F093]], 20, "dominoes"]
            ,   [[[0x1F484, 0x1F49F]], 25, "personal"]
            ,   [[[0x1F4BA, 0x1F4FE], [0x1F57B, 0x1F58D]], 25, "communication"]
            ,   [[[0x2639, 0x263B], [0x1F600, 0x1F64E], [0x1F910, 0x1F917], [0x1F920, 0x1F92F], [0x1F9D0, 0x1F9D5]], 25, "emoticons"]
            // ,   [[[0x0021],[0x0023],[0x0025,0x0026],[0x002A],[0x003F,0x0040],[0x00A1],[0x2E00, 0x2E49]], 3] // punctuation
            // ,   [[[0x2100, 0x218B],[0x2618, 0x2619],[0x2670, 0x267F],[0x2690, 0x269D],[0x26A2, 0x26A9],[0x26B2],[0x2700, 0x2709],[0x1F6B9, 0x1F6CF],[0x1F3F5, 0x1F3F7]], 2] // symbols
            ]
        }
    ,   Icon = function(graphics, value, grayscale) {
            this.value = value;
            this.grayscale = grayscale || graphics.isGrayscale(value);
        }
    ,   IconSet = function(graphics, ranges, minCycleMutationCount, name) {
            var currentValue = 0
            ,   endValue = 0
            ,   char = null
            ,   newIcon = null
            ,   chars = ""
            ;
            this.icons = [];
            this.grayscaleIcons = [];
            this.name = name;
            this.minCycleMutationCount = minCycleMutationCount;
            ranges.forEach( function(range) {
                currentValue = range[0]
                endValue = range[1] || range[0]
                while (currentValue <= endValue) {
                    char = String.fromCodePoint(currentValue) + (range[2] ? String.fromCodePoint(0xfe0e) : "")
                    if (range[2] || graphics.testContext.measureText(char).width != graphics.undefinedPixelWidth) {
                        chars += char;
                        newIcon = new Icon(graphics, char, range[2]);
                        this.icons.push(newIcon);
                        if (newIcon.grayscale) {
                            this.grayscaleIcons.push(newIcon);
                        }
                    }
                    currentValue++;
                }
            }, this);
        }
    ,   Lights = function(street) {
            this.street = street;
            this.element = document.querySelector("#lights");
            this.lightCount = 10;
            this.diameter = Math.round(Math.max(this.street.display.width, this.street.display.height)/this.lightCount);
            this.element.style.width = (this.lightCount * this.diameter) + "px";
            this.width = this.element.width = this.element.clientWidth;
            this.element.style.height = this.diameter + "px";
            this.height = this.element.height = this.element.clientHeight;
            this.context = this.element.getContext('2d');
            this.hues = [190, 325];
            this.luminosity = 90;
            this.sources = [];
            this.positions = [];
        }
    ,   LightPosition = function(lights, source, size) {
            this.lights = lights;
            this.source = source;
            this.x = Math.round(this.lights.street.display.width * Math.random());
            this.y = Math.round(this.lights.street.display.height * Math.pow(Math.random(), 2));
            this.width = Math.round(this.lights.diameter * size);
            this.velocity = [(Math.random() < 0.5 ? -1 : 1) * 0.05 * Math.random(), (0.01 * Math.random())];
        }
    ,   LightSource = function(lights) {
            var count = lights.sources.length
            ,   hue = 0
            ,   x = Math.round(lights.diameter * (count + 0.5))
            ,   y = Math.round(lights.diameter * 0.5)
            ,   gradient = lights.context.createRadialGradient(x, y, 0, x, y, y)
            ;
            this.lights = lights;
            this.id = count;
            this.x = count * lights.diameter;
            this.y = 0;
            hue = this.lights.hues[Math.floor(this.lights.hues.length * Math.random())] + (60 * Math.random())
            gradient.addColorStop(0, "hsla(" + hue + ", 100%, " + this.lights.luminosity + "%, 0.7)");
            gradient.addColorStop(0.8, "hsla(" + hue + ", 100%, " + this.lights.luminosity + "%, 0.2)");
            gradient.addColorStop(1, "hsla(" + hue + ", 100%, " + this.lights.luminosity + "%, 0)");
            this.lights.context.fillStyle = gradient;
            this.lights.context.fillRect(this.x, this.y, lights.diameter, lights.diameter)
        }
    ,   Pixel = function(pixels, column, row, hue, alpha) {
            var gradient = null
            ,   xRadius = pixels.dotWidth/2
            ,   yRadius = pixels.dotHeight/2
            ;
            this.pixels = pixels;
            this.x = this.pixels.dotWidth * column;
            this.y = this.pixels.dotHeight * row;
            this.pixels.context.fillStyle = "hsla(" + hue + ", 100%, 50%, " + alpha + ")";
            this.pixels.context.beginPath();
            this.pixels.context.ellipse(this.x + xRadius, this.y + yRadius, xRadius, yRadius, 0, 0, 2 * Math.PI);
            this.pixels.context.fill();
            this.pixels.context.closePath();
        }
    ,   Pixels = function(signal, symbolSide) {
            var alphaPixels = []
            ,   targetPixels = 100
            ;
            this.signal = signal;
            this.hues = [0, 120, 240];
            this.alphas = 10;
            this.element = document.querySelector("#pixels");
            this.context = this.element.getContext('2d');
            this.pixelWidth = 6 * Math.ceil(symbolSide/(targetPixels * 6));
            this.dotWidth = 2 * this.pixelWidth/3;
            this.dotHeight = this.pixelWidth/2;
            this.dotOffset = this.pixelWidth/3;
            this.element.style.height = (this.hues.length * this.dotHeight) + "px";
            this.height = this.element.height = this.element.clientHeight;
            this.element.style.width = (this.alphas * this.dotWidth) + "px";
            this.width = this.element.width = this.element.clientWidth;
            this.dots = [];
            this.hues.forEach( function(hue, hueCount) {
                alphaPixels = []
                for (var i = 0; i < this.alphas; i++) {
                    alphaPixels.push(new Pixel(this, i, hueCount, this.hues[hueCount], (i + 1)/this.alphas))
                }
                this.dots.push(alphaPixels);
            }, this);
        }
    ,   Rhythm = function(type) {
            this.cycleType = type;
            this.period = this.cycleType.display.basePeriod;
            if (this.cycleType.phase == 0) {
                this.steps = [new RhythmStep(this, 1, "random", "none")];
                while (this.steps.length < this.cycleType.display.rhythmBeats) {
                    this.steps.push(new RhythmStep(this, 1, "same", "none"));
                }
            } else if (this.cycleType.phase == 1) {
                this.steps = [new RhythmStep(this, 1, "count", "random")];
                while (this.steps.length < this.cycleType.display.rhythmBeats) {
                    this.steps.push(new RhythmStep(this, 1, "count", "same"));
                }
                this.steps[0].substeps[1].icon = "same";
                this.steps[0].substeps[2].icon = "blink";
                this.steps[1].substeps[2].icon = "blink";
                this.steps[2].substeps[2].icon = "blink";
            } else if (this.cycleType.phase == 2) {
                this.steps = [new RhythmStep(this, 1, "random", "none")];
                while (this.steps.length < this.cycleType.display.rhythmBeats) {
                    this.steps.push(new RhythmStep(this, 1, "same", "none"));
                }
                this.steps[2].substeps[1].icon = "random";
                this.steps[2].substeps[2].icon = "same";
            } else {
                this.steps = [new RhythmStep(this)];
                while (this.steps.length < this.cycleType.display.rhythmBeats) {
                    this.steps.push(new RhythmStep(this));
                }
            }
        }
    ,   RhythmStep = function(parent, beats, iconType, subType) {
            this.step = parent.rhythm ? parent : null;
            this.rhythm = this.step ? parent.rhythm : parent;
            this.count = this.step ? (this.step.substeps ? this.step.substeps.length : 0) : (this.rhythm.steps ? this.rhythm.steps.length : 0);
            this.beats = beats || 1;
            this.icon = iconType || (!this.count ? "random" : this.step ? "same" : "random");
            this.changeHue = 0;
            this.changeLuminosity = 0;
            this.rotate = 0;
            this.scale = 1;
            this.overlap = false;
            if (this.step) {
                this.substeps = null;
            } else {
                this.substeps = [new RhythmStep(this, 1, subType)];
                while (this.substeps.length < (this.beats * this.rhythm.cycleType.display.rhythmBeats)) {
                    this.substeps.push(new RhythmStep(this, 1, subType));
                }
            }
            this.mutationCount = 0
        }
    ,   Signal = function(display) {
            var sideOrientation = (display.width > display.height)
            ,   symbolSide = 6 * Math.floor(0.35 * (sideOrientation ? display.width : display.height)/6)
            ,   borderWidth = Math.round(0.05 * symbolSide)
            ,   signalSide0 = (2 * symbolSide) + (5 * borderWidth)
            ,   signalSide1 = symbolSide + (4 * borderWidth)
            ,   frameElement = document.querySelector("#frame");
            ;
            this.display = display;
            this.element = document.querySelector("#signal");
            this.sideOrientation = sideOrientation
            if (this.sideOrientation) {
                this.element.style.width = signalSide0 + "px";
                this.element.style.height = signalSide1 + "px";
            } else {
                this.element.style.width = signalSide1 + "px";
                this.element.style.height = signalSide0 + "px";
            }
            // this.element.style.borderRadius = signalSide1/10 + "px";
            this.hue = 360 * Math.random()
            this.element.style.backgroundColor = "hsl(" + this.hue + ", 100%, 4%)";
            frameElement.style.width = (this.element.clientWidth - borderWidth) + "px";
            frameElement.style.height = (this.element.clientHeight - borderWidth) + "px";
            frameElement.style.borderRadius = this.element.style.borderRadius = signalSide1/10 + "px";;
            this.grayscale = true;
            this.support = new Support(this);
            this.symbols = [new Symbol(this, symbolSide)];
            this.symbols.push(new Symbol(this, symbolSide));
            this.pixels = new Pixels(this, symbolSide);
            this.graphics = new Graphics(this);
            this.graphics.generate();
        }
    ,   Step = function(cycle, rhythmStep, prevStep, prevSubstep) {
            var priorStep = null
            ;
            this.cycle = cycle;
            if (rhythmStep && rhythmStep.step) {
                this.main = false;
                priorStep = prevSubstep;
                this.rhythmStep = rhythmStep;
                if (prevSubstep && !prevSubstep.lastStep) {
                    this.symbol = prevSubstep.symbol;
                    this.count = prevSubstep.count + 1;
                    this.firstStep = false;
                    this.totalSteps = prevSubstep.totalSteps;
                } else {
                    this.symbol = prevStep.symbol.otherSymbol;
                    this.count = 0;
                    this.firstStep = true;
                    this.totalSteps = prevStep.rhythmStep.substeps.length;
                }
                prevSubstep = this;
                this.timeRemaining = this.rhythmStep.beats * prevStep.subperiod;
                this.lastStep = (this.count >= (prevStep.rhythmStep.substeps.length - 1));
                this.iconSet = this.cycle.type.iconSets[1];
            } else {
                this.main = true;
                priorStep = prevStep;
                this.rhythmStep = rhythmStep || this.cycle.type.rhythm.steps[0];
                if (prevStep) {
                    this.symbol = prevStep.symbol;
                    this.count = prevStep.count + 1;
                    this.period = prevStep.period;
                    this.firstStep = false;
                    this.totalSteps = prevStep.totalSteps;
                } else {
                    this.symbol = this.cycle.mainSymbol;
                    this.count = 0;
                    this.period = this.rhythmStep.rhythm.period/this.rhythmStep.rhythm.steps.length;
                    this.firstStep = true;
                    this.totalSteps = this.rhythmStep.rhythm.steps.length;
                }
                prevStep = this;
                this.timeRemaining = 0;
                this.subperiod = this.period/this.rhythmStep.substeps.length;
                this.lastStep = (this.count >= (this.totalSteps - 1));
                this.iconSet = this.cycle.type.iconSets[0];
            }
            this.pixels = null;
            this.visible = true;
            if (this.rhythmStep.icon == "none") {
                this.icon = null;
            } else if (this.rhythmStep.icon == "count") {
                this.icon = this.cycle.display.signal.graphics.numbers.grayscaleIcons[(this.totalSteps - (this.count + 1)) % 10];
            } else if (priorStep && (this.rhythmStep.icon == "blink")) {
                this.icon = priorStep.icon;
                this.pixels = priorStep.pixels;
                this.visible = false;
            } else if (priorStep && (this.rhythmStep.icon == "same")) {
                this.icon = priorStep.icon;
            } else { // random
                if (this.cycle.display.signal.grayscale) {
                    this.icon = this.iconSet.grayscaleIcons[Math.floor(Math.random() * this.iconSet.grayscaleIcons.length)];
                } else {
                    this.icon = this.iconSet.icons[Math.floor(Math.random() * this.iconSet.icons.length)];
                }
                this.cycle.type.iconUseCounts[this.main ? 0 : 1]++;
            }
            if (this.firstStep) {
                this.pixels = this.cycle.display.signal.graphics.getPixels(this);
            }
            if (this.main) {
                this.nextStep = new Step(this.cycle, this.rhythmStep.substeps[0], prevStep, prevSubstep);
            } else if (!this.lastStep) {
                this.nextStep = new Step(this.cycle, prevStep.rhythmStep.substeps[this.count + 1], prevStep, prevSubstep);
            } else if (!prevStep.lastStep) {
                this.nextStep = new Step(this.cycle, prevStep.rhythmStep.rhythm.steps[prevStep.count + 1], prevStep, prevSubstep);
            } else {
                this.nextStep = null;
            }
        }
    ,   Street = function(display) {
            var lightCount = 10
            ,   gradient = null
            ,   hue = 15 * Math.random()
            ;
            this.display = display;
            this.element = document.querySelector("#street");
            this.width = this.element.width = this.element.clientWidth;
            this.height = this.element.height = this.element.clientHeight;
            this.context = this.element.getContext('2d');
            gradient = this.context.createLinearGradient(0, 0, 0, this.height);
            gradient.addColorStop(0, "hsl(" + hue + ", 30%, 30%)");
            gradient.addColorStop(1, "hsl(" + hue + ", 30%, 10%)");
            this.context.fillStyle = gradient;
            this.context.fillRect(0, 0, this.width, this.height);
            this.lights = new Lights(this);
            this.lights.generate();
            this.lights.position();
        }
    ,   Support = function(signal) {
            var signalRect = signal.element.getBoundingClientRect()
            ,   lineWidth = Math.round(0.15 * (signal.sideOrientation ? signalRect.height : signalRect.width))
            ,   startTop = [Math.round((signalRect.left + signalRect.right)/2), Math.round(signalRect.top + 10)]
            ,   startBottom = [startTop[0], Math.round(signalRect.bottom - 10)]
            ,   leftPole = Math.random() < 0.4
            ,   poleDistance = (leftPole ? -1.1 : 1.1) * startTop[0]
            ,   yOffset = lineWidth
            ;
            this.signal = signal;
            this.element = document.querySelector("#support");
            this.width = this.element.width = this.element.clientWidth;
            this.height = this.element.height = this.element.clientHeight;
            this.context = this.element.getContext('2d');
            this.context.lineWidth = lineWidth;
            this.context.strokeStyle = "hsl(" + this.signal.hue + ", 100%, 1%)";
            this.context.beginPath();
            this.context.moveTo(startTop[0], startTop[1]);
            this.context.arcTo(startTop[0], startTop[1] - yOffset, startTop[0] + poleDistance, startTop[1] - yOffset, lineWidth);
            this.context.lineTo(startTop[0] + poleDistance, startTop[1] - yOffset);
            this.context.moveTo(startBottom[0], startBottom[1]);
            this.context.arcTo(startBottom[0], startBottom[1] + yOffset, startBottom[0] + poleDistance, startBottom[1] + yOffset, lineWidth);
            this.context.lineTo(startBottom[0] + poleDistance, startBottom[1] + yOffset);
            this.context.stroke();
            this.context.closePath();
            this.context.lineWidth = 2 * lineWidth;
            this.context.beginPath();
            this.context.moveTo(startTop[0] + poleDistance, 0);
            this.context.lineTo(startBottom[0] + poleDistance, this.height);
            this.context.stroke();
            this.context.closePath();
        }
    ,   Symbol = function(signal, sideSize) {
            this.signal = signal;
            if (this.signal.symbols) {
                this.main = false;
                this.element = document.querySelector("#symbol1");
                this.otherSymbol = this.signal.symbols[0];
                this.otherSymbol.otherSymbol = this;
            } else {
                this.main = true;
                this.element = document.querySelector("#symbol0");
            }
            this.element.style.width = this.element.style.height = sideSize + "px";
            this.width = this.element.width = this.element.clientWidth;
            this.height = this.element.height = this.element.clientHeight;
            if (this.signal.sideOrientation) {
                this.element.style.top = "50%";
                this.element.style.left = this.main ? "25%" : "75%";
            } else {
                this.element.style.left = "50%";
                this.element.style.top = this.main ? "25%" : "75%";
            }
            this.context = this.element.getContext('2d');
            this.deadPixels = [];
        }
    ;
    Display.prototype = {
        advanceStep: function() {
            this.nextStep = this.currentStep.nextStep || new Cycle(this).nextStep;
            if (!this.nextStep.pixels && this.nextStep.icon) {
                this.nextStep.pixels = this.signal.graphics.getPixels(this.nextStep);
            }
        }
    ,   colorizeLights: function() {
            this.street.lights.hues.push(360 * Math.random());
            this.street.lights.luminosity = Math.max(50, this.street.lights.luminosity - 10);
            this.street.lights.positions = [];
            this.street.lights.sources = [];
            this.street.lights.generate();
            this.street.lights.position();
        }
    ,   printSteps: function() {
            this.cycleTypes.forEach(function(cycleType) {
                console.log(Date.now() + ": type " + cycleType.phase + " icon uses " + cycleType.iconUseCounts);
                cycleType.rhythm.steps.forEach(function(step) {
                    console.log(" - rhythm step " + step.count + " icon " + step.icon + " mutations " + step.mutationCount);
                    step.substeps.forEach(function(substep) {
                        console.log("   - substep " + substep.count + " icon " + substep.icon + " mutations " + substep.mutationCount);
                    })
                }, this);
            }, this);
        }
    ,   reset: function(resetIcons) {
            this.signal.grayscale = resetIcons ? this.signal.grayscale : !this.signal.grayscale;
            for (var i = 0; i < 3; i++) {
                this.cycleTypes[i].rhythm = new Rhythm(this.cycleTypes[i]);
                this.cycleTypes[i].iconSetCounts[0] = resetIcons ? 0 : this.cycleTypes[i].iconSetCounts[0];
                this.cycleTypes[i].iconSetCounts[1] = resetIcons ? 0 : this.cycleTypes[i].iconSetCounts[1];
                this.cycleTypes[i].assignIconSet(0);
                this.cycleTypes[i].assignIconSet(1);
            }
            this.currentStep.timeRemaining = 0;
            this.nextStep = new Cycle(this, true).nextStep
        }
    }
    CycleType.prototype = {
        assignIconSet: function(index) {
            this.iconUseCounts[index] = 0;
            if (!this.iconSetCounts[index]) {
                if (this.phase == 0) {
                    this.iconSets[index] = index ? this.display.signal.graphics.arrows : this.display.signal.graphics.singleWalk;
                } else if (this.phase == 1) {
                    this.iconSets[index] = index ? this.display.signal.graphics.singleHalt : this.display.signal.graphics.numbers;
                } else if (this.phase == 2) {
                    this.iconSets[index] = index ? this.display.signal.graphics.hands : this.display.signal.graphics.singleHalt;
                }
            } else if (this.display.signal.grayscale) {
                shuffle(this.display.signal.graphics.grayscaleSets).some(function(iconSet) {
                    return (iconSet.grayscaleIcons.length && (iconSet.minCycleMutationCount <= this.iconSetCounts[index])) ? ((this.iconSets[index] = iconSet), true) : false;
                }, this);
            } else {
                shuffle(this.display.signal.graphics.iconSets).some(function(iconSet) {
                    return (iconSet.icons.length && (iconSet.minCycleMutationCount <= this.iconSetCounts[index])) ? ((this.iconSets[index] = iconSet), true) : false;
                }, this);
            }
            this.iconSetCounts[index]++;
            // console.log(Date.now() + ": cycle type " + this.phase + " new icon " + index + " set #" + this.iconSetCounts[index] + " - " + this.iconSets[index].icons[0].value);
        }
    ,   mutate: function() {
            var diceRoll = Math.random()
            ;
            for (var i = 0; i < 2; i++) {
                if ((diceRoll < 0.2) || (this.display.signal.grayscale && (this.iconUseCounts[i] > this.iconSets[i].grayscaleIcons.length/2)) || (!this.display.signal.grayscale && (this.iconUseCounts[i] > this.iconSets[i].icons.length/2))) {
                    this.assignIconSet(i);
                }
            }
            diceRoll = Math.random();
            if (diceRoll < 0.2) {
                this.hue = 360 * Math.random();
                this.luminosity = 50 + (25 * Math.random());
            } else if (diceRoll < 0.5) {
                this.switchSymbol = true;
            }
            this.rhythm.mutate();
        }
    ,   toString: function() {
            return ("phase " + this.phase + " mcount " + this.mutationCount + " icount " + this.iconUseCounts + " iconset 0 " + this.iconSets[0].icons[0].value + " iconset 1 " + this.iconSets[1].icons[0].value + " rhythm " + this.rhythm + " hue " + this.hue + " luminosity " + this.luminosity + " switchSymbol " + this.switchSymbol + " period " + this.period + " repeats " + this.repeats + " rotation " + this.rotation + " mirror " + this.mirror + " overlap " + this.overlap + " grayscale " + this.grayscale);
        }
    }
    Graphics.prototype = {
        addIconSet: function() {
            var index = this.iconSets.length
            ,   iconSet = null
            ;
            iconSet = new IconSet(this, this.iconSetData[index][0], this.iconSetData[index][1], this.iconSetData[index][2]);
            // if (iconSet.icons.length) {
            this.iconSets.push(iconSet);
            if (iconSet.grayscaleIcons.length) {
                this.grayscaleSets.push(iconSet);
            }
            if (iconSet.icons.length > iconSet.grayscaleIcons.length) {
                this.emojiSets.push(iconSet);
            }
            if (this.iconSets.length == this.iconSetData.length) {
                this.iconProcessingComplete = true;
            }
            // }
        }
    ,   generate: function() {
            var iconSet = null
            ;
            this.undefinedPixelWidth = this.testContext.measureText(String.fromCodePoint(0x1FFFF)).width;
            this.singleWalk = new IconSet(this, [[0x1f6B6, 0x1f6B6, true], [0x1f6B6, 0x1f6B6]], 0, "singlewalk");
            this.singleHalt = new IconSet(this, [[0x270B, 0x270B, true], [0x270B, 0x270B]], 0, "singlehalt");
            this.numbers = new IconSet(this, [[0x0030, 0x0039]], 0, "numbers");
            this.hands = new IconSet(this, [[0x261A, 0x261F],[0x270A, 0x270D],[0x270B, 0x270B, true],[0x1F446, 0x1F450],[0x1F58E, 0x1F5A3],[0x1F64F],[0x1F918, 0x1F91F],[0x1F932, 0x1F933]], 0, "hands");
            this.arrows = new IconSet(this, [[0x2190, 0x21AF],[0x21C4, 0x21D9],[0x2798, 0x27BF],[0x2921, 0x2941],[0x2B00, 0x2B0D]], 0, "arrows");
            this.iconSets = [];
            this.grayscaleSets = [];
            this.emojiSets = [];
            this.iconProcessingComplete = false;
            this.walkIconElement = document.querySelector("#walkIcon");
            this.haltIconElement = document.querySelector("#haltIcon");
        }
    ,   getPixels: function(step) {
            var icon = step.icon
            ,   cycle = step.cycle
            ,   svgIcon = null
            ,   computedWidth = 0
            ,   redGlobalAlpha = 0
            ,   greenGlobalAlpha = 0
            ,   blueGlobalAlpha = 0
            ,   pixels0 = []
            ,   pixels1 = []
            ,   alphaIndex = 0
            ,   imageData = null
            ,   column = 0
            ,   pixels = []
            ;
            this.context.clearRect(0, 0, this.width, this.height);
            if (icon) {
                svgIcon = (icon.value == this.singleWalk.icons[0].value) ? this.walkIconElement : (icon.value == this.singleHalt.icons[0].value) ? this.haltIconElement : null
                if (svgIcon || icon.grayscale) {
                    this.context.fillStyle = "hsl(" + (cycle.type.hue + step.rhythmStep.changeHue) + ", 100%, " + (cycle.type.luminosity + step.rhythmStep.changeLuminosity) + "%)";
                }
                this.context.globalCompositeOperation = "source-over";
                this.context.setTransform(1, 0, 0, 1, 0, 0);
                this.context.translate(this.width/2, this.height/2);
                this.context.rotate(step.rhythmStep.rotate * Math.PI/2);
                this.context.scale(step.rhythmStep.scale, Math.abs(step.rhythmStep.scale));
                this.context.translate(this.width/-2, this.height/-2);
                if (svgIcon) {
                    computedWidth = this.height * svgIcon.clientWidth/svgIcon.clientHeight
                    this.context.drawImage(svgIcon, 0, 0, svgIcon.clientWidth, svgIcon.clientHeight, 0, 0, computedWidth, this.height);
                    this.context.globalCompositeOperation = "source-in";
                    this.context.fillRect(0, 0, this.width, this.height);
                } else {
                    this.context.fillText(icon.value, this.center, 0);
                }
                imageData = this.context.getImageData(0, 0, this.width, this.height);
                imageData.data.forEach( function(datum, i) {
                    switch(i % 4) {
                        case 0:
                            redGlobalAlpha = datum; break;
                        case 1:
                            greenGlobalAlpha = datum; break;
                        case 2:
                            blueGlobalAlpha = datum; break;
                        case 3:
                            if (column % 2) {
                                alphaIndex = Math.round(this.signal.pixels.alphas * redGlobalAlpha * datum/65025);
                                pixels0.push(alphaIndex ? this.signal.pixels.dots[0][alphaIndex - 1] : null);
                                alphaIndex = Math.round(this.signal.pixels.alphas * greenGlobalAlpha * datum/65025);
                                pixels0.push(alphaIndex ? this.signal.pixels.dots[1][alphaIndex - 1] : null);
                                alphaIndex = Math.round(this.signal.pixels.alphas * blueGlobalAlpha * datum/65025);
                                pixels1.push(alphaIndex ? this.signal.pixels.dots[2][alphaIndex - 1] : null);
                            } else {
                                alphaIndex = Math.round(this.signal.pixels.alphas * blueGlobalAlpha * datum/65025);
                                pixels0.push(alphaIndex ? this.signal.pixels.dots[2][alphaIndex - 1] : null);
                                alphaIndex = Math.round(this.signal.pixels.alphas * redGlobalAlpha * datum/65025);
                                pixels1.push(alphaIndex ? this.signal.pixels.dots[0][alphaIndex - 1] : null);
                                alphaIndex = Math.round(this.signal.pixels.alphas * greenGlobalAlpha * datum/65025);
                                pixels1.push(alphaIndex ? this.signal.pixels.dots[1][alphaIndex - 1] : null);
                            }
                            if ((column + 1) % this.width) {
                                column++;
                            } else {
                                pixels.push(pixels0);
                                pixels.push(pixels1);
                                pixels0 = [];
                                pixels1 = [];
                                column = 0;
                            }
                    }
                }, this);
            }
            if (pixels.length && step.symbol.deadPixels.length) {
                step.symbol.deadPixels.forEach(function(deadPixel) {
                    pixels[deadPixel[0]][deadPixel[1]] = null;
                }, this);
            }
            return pixels;
        }
    ,   isGrayscale: function(icon) {
            var imageData = null
            ,   pixelRGB = []
            ,   returnValue = true
            ;
            this.testContext.clearRect(0, 0, this.testElement.width, this.testElement.height);
            this.testContext.fillText(icon, 0, 0);
            imageData = this.testContext.getImageData(0, 0, this.testElement.width, this.testElement.height);
            imageData.data.some( function(datum, i) {
                if (datum && ((i % 4) < 3)) {
                    return ((returnValue = false), true);
                }
            });
            return returnValue;
        }
    }
    Lights.prototype = {
        generate: function() {
            for (var i = 0; i < this.lightCount; i++) {
                this.sources.push(new LightSource(this));
            }
        }
    ,   position: function() {
            this.sources.forEach( function(source) {
                this.positions.push(new LightPosition(this, source, 2));
                this.positions.push(new LightPosition(this, source, 1.6));
                this.positions.push(new LightPosition(this, source, 1.2));
            }, this);
        }
    }
    LightPosition.prototype = {
        advance: function(interval) {
            this.x = Math.round(this.x + (this.velocity[0] * interval));
            this.y = Math.round(this.y + (this.velocity[1] * interval));
            if (this.x > this.lights.street.width) {
                this.x -= (this.lights.street.width + this.width);
            } else if (this.x + this.width < 0) {
                this.x += (this.lights.street.width + this.width);
            }
            if (this.y > this.lights.street.height) {
                this.y -= (this.lights.street.height + this.width);
            } else if (this.y + this.width < 0) {
                this.y += (this.lights.street.height + this.width);
            }
        }
    }
    Rhythm.prototype = {
        mutate: function(type) {
            var diceRoll =  Math.random()
            ,   chosenStep = null
            ,   chosenSubstep = null
            ;
            if ((diceRoll < 0.1) && (this.steps.length < this.cycleType.display.targetSteps)) {
                this.steps.push(new RhythmStep(this));
            } else {
                chosenStep = this.steps[Math.floor(this.steps.length * Math.random())];
                if ((diceRoll < 0.2) && (this.steps.length > this.cycleType.display.targetSteps/2)) {
                    this.steps.splice(chosenStep.count, 1);
                } else if (diceRoll < 0.3) {
                    chosenStep.mutate();
                } else if ((diceRoll < 0.4) && (chosenStep.substeps.length < this.cycleType.display.targetSteps)) {
                    chosenStep.substeps.push(new RhythmStep(chosenStep));
                    chosenStep.mutationCount++;
                } else {
                    chosenSubstep = chosenStep.substeps[Math.floor(chosenStep.substeps.length * Math.random())]
                    chosenSubstep.mutate(type);
                }
            }
        }
    }
    RhythmStep.prototype = {
        mutate: function(type) {
            var diceRoll =  Math.random()
            ;
            if (diceRoll < 0.3) {
                diceRoll = Math.random();
                if ((diceRoll < 0.2) && (this.step)) {
                    this.icon = "none"
                } else if (diceRoll < 0.4) {
                    this.icon = "count";
                } else if ((diceRoll < 0.6) && (this.step)) {
                    this.icon = "blink";
                } else if ((diceRoll < 0.8) && (this.step)) {
                    this.icon = "same";
                } else {
                    this.icon = "random";
                }
            } else if (diceRoll < 0.5) {
                this.changeHue = ((Math.random() < 0.5) ? -1 : 1) * 10 * Math.ceil(12 * Math.random());
                this.icon = "same";
            } else if (diceRoll < 0.6) {
                this.changeLuminosity = ((Math.random() < 0.5) ? -1 : 1) * 10 * Math.ceil(3 * Math.random());
                this.icon = "same";
            } else if (diceRoll < 0.7) {
                this.rotate = ((Math.random() < 0.5) ? -1 : 1) * (Math.PI/8) * Math.ceil(4 * Math.random());
                this.icon = "same";
            } else if (diceRoll < 0.8) {
                this.scale = 1 + (((Math.random() < 0.5) ? -1 : 1) * 0.2 * Math.ceil(3 * Math.random()));
                this.icon = "same";
            } else if (diceRoll < 0.9) {
                this.scale = -1 * this.scale;
                this.icon = "same";
            } else {
                this.overlap = !this.overlap;
                this.icon = "random";
            }
            // console.log(Date.now() + ": mutating rhythm " + (this.step ? (this.step.count + "/") : "") + this.count);
            this.mutationCount++;
            if (this.step) {
                this.step.mutationCount++;
            }
        }
    }
    Step.prototype = {
        toString: function() {
            return (this.main ? "main " : "other ") + "step " + this.count + "; cycle " + this.cycle.count + " phase " + this.cycle.type.phase + "; action " + this.action + "; icon " + this.icon + "; remaining " + this.timeRemaining;
        }
    }
    Street.prototype = {
        draw: function(interval) {
            this.context.fillRect(0, 0, this.width, this.height);
            this.lights.positions.forEach( function(position) {
                position.advance(interval);
                this.context.drawImage(position.lights.element, position.source.x, 0, this.lights.diameter, this.lights.diameter, position.x, position.y, position.width, position.width);
            }, this);
        }
    }
    Symbol.prototype = {
        addDeadPixel: function() {
            this.deadPixels.push([Math.floor(Math.random() * this.signal.graphics.pixelColumns), Math.floor(Math.random() * this.signal.graphics.pixelRows)]);
        }
    ,   draw: function(step) {
            var symbolX = 0
            ,   symbolY = 0
            ;
            if (step.rhythmStep.overlap) {
                this.context.globalCompositeOperation = "destination-in";
                this.context.fillStyle = "hsla(0, 50%, 50%, 0.7)";
                this.context.fillRect(0, 0, this.width, this.height);
                this.context.globalCompositeOperation = "source-over";
            } else {
                this.context.clearRect(0, 0, this.width, this.height);
            }
            if (step.visible && step.pixels) {
                step.pixels.forEach( function(pixelRow, row) {
                    pixelRow.forEach( function(pixel) {
                        if (pixel) {
                            this.context.drawImage(this.signal.pixels.element, pixel.x, pixel.y, this.signal.pixels.dotWidth, this.signal.pixels.dotHeight, symbolX, symbolY, this.signal.pixels.dotWidth, this.signal.pixels.dotHeight);
                        }
                        symbolX += this.signal.pixels.dotWidth;
                    }, this);
                    symbolY += this.signal.pixels.dotHeight;
                    symbolX = (row % 2) ? this.signal.pixels.dotOffset : 0;
                }, this);
            }
            if ((Math.random() < 0.02) && (this.deadPixels.length < this.signal.graphics.totalPixels/300)) {
                this.addDeadPixel();
            }
        }
    }
    return new Display();
}
function initialize() {
    canvasRoot.addEventListener("click", function(e) {
        if (e.target.classList.contains("symbol")) {
            display.reset();
        } else if (e.target.id == "signal"){
            display.reset(true);
        } else {
            display.colorizeLights();
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
    ;
    priorTimestamp = ts;
    display.currentStep.timeRemaining -= interval;
    if (!display.nextStep) {
        display.advanceStep();
    } else if (display.currentStep.timeRemaining <= 0) {
        display.currentStep = display.nextStep;
        display.nextStep = null;
        display.currentStep.symbol.draw(display.currentStep);
    } else if (!display.signal.graphics.iconProcessingComplete) {
        display.signal.graphics.addIconSet();
    } else {
        display.street.draw(interval);
    }
	animationId = window.requestAnimationFrame(animationLoop);
}
initialize();
})();
