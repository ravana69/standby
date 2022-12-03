(() => {
"use strict";

const Display = class {
    constructor() {
        this.element = document.querySelector("#displayRoot");
        this.height = this.element.clientHeight;
        this.width = this.element.clientWidth;
        this.radius = Math.sqrt(Math.pow(this.width,2) + Math.pow(this.height, 2))/2;
        this.element.style.background = `radial-gradient(circle at center, white, black ${getRandom(25, 50)}%, black)`;
        this.canvas = this.element.querySelector("#output");
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.context = this.canvas.getContext('2d');
        const minSlices = 6
        ,   maxSlices = 30;
        this.maxAngle = 2 * Math.PI/minSlices;
        this.slicePairs = Math.floor(getRandom((minSlices/2) + 3, maxSlices/4));
        this.angleSymmetry = 0;
        this.setAngles(false);
        this.fontType = "Times New Roman, Times, serif";
        this.characters = [];
        [[0x0023, 0x0026], [0x002A, 0x002A], [0x0030, 0x0039], [0x003F, 0x005A], [0x0061, 0x007A]].forEach(([start, end]) => {for (let i = start; i <= end; i++) this.characters.push(String.fromCharCode(i))});
        shuffle(this.characters);
        this.characterIndex = 0;
        this.pattern = new Pattern(this, minSlices, maxSlices).draw();
        this.mixCanvas = this.element.querySelector("#patternMix");
        this.mixCanvas.style.width = `${this.radius}px`;
        this.mixCanvas.style.height = `${this.pattern.canvas.height}px`;
        this.mixCanvas.width = this.mixCanvas.clientWidth;
        this.mixCanvas.height = this.mixCanvas.clientHeight;
        this.mixContext = this.mixCanvas.getContext('2d');
        this.minVelocity = this.pattern.printWidth/2000000
        this.maxVelocity = 100 * this.minVelocity
        const minRotation = Math.PI/1000000
        ,   maxRotation = 1000 * minRotation;
        this.velocity = getRandom(this.minVelocity, this.maxVelocity/20);
        this.setVelocity(false);
        this.rotation = getRandom(minRotation, maxRotation/100);
        const hue0 = 360 * Math.random()
        ,   hue1 = hue0 + (((Math.random() < 0.5) ? -1 : 1) * getRandom(20, 40))
        ,   saturation = getRandom(80, 100)
        ,   luminosity = getRandom(40, 60)
        ,   angle = Math.PI * Math.random()
        this.backgroundElement = document.querySelector("#background");
        this.backgroundElement.style.setProperty("--backgroundGradient", `linear-gradient(${angle}rad, hsl(${hue0}, ${saturation}%, ${luminosity}%), hsl(${hue1}, ${saturation}%, ${luminosity}%))`);
        this.expanding = Math.random() < 0.5;
        this.clockwise = Math.random() < 0.5;
        this.offset = Math.random() * this.pattern.printWidth;
        this.shadowFactor = getRandom(1.5, 2.5);
        this.shadowOffset = Math.random() * this.pattern.printWidth;
        this.duration = 0;
        this.audio = new Audio(this);
        this.sliderStack = this.element.querySelector("#sliderStack");
        this.sliders = [];
        this.sliders.push(new Slider(this, "velocity", Math.log10(this.minVelocity), Math.log10(this.maxVelocity), 0.01, true, this.setVelocity));
        this.sliders.push(new Slider(this, "rotation", Math.log10(minRotation), Math.log10(maxRotation), 0.01, true));
        this.sliders.push(new Slider(this, "slicePairs", Math.floor(minSlices/2), Math.floor(maxSlices/2), 1, false, this.setAngles));
        this.sliders.push(new Slider(this, "characterIndex", 0, this.characters.length - 1, 1, false, this.setCharacter));
        this.letter = new Letter(this).draw();
        this.element.classList.add("begin");
    }
    delete() {
        this.element.classList.remove("reveal");
        this.element.classList.remove("begin");
        this.audio.delete();
        this.sliders.filter(slider => slider.id).forEach(slider => slider.delete());
        return this;
    }
    draw(interval) {
        this.duration += interval;
        const distance = this.duration * this.velocity
        ,   distanceAdjusted = (Math.abs(distance) + this.offset) % this.pattern.printWidth
        ,   sx0 = this.expanding ? (this.pattern.printWidth - distanceAdjusted) : distanceAdjusted
        ,   dy = this.pattern.canvas.height/-2
        ,   shadowDistanceAdjusted = ((Math.abs(distance) * this.shadowFactor) + this.shadowOffset) % this.pattern.printWidth
        ,   sx1 = this.expanding ? shadowDistanceAdjusted : (this.pattern.printWidth - shadowDistanceAdjusted);
        this.mixContext.clearRect(0, 0, this.mixCanvas.width, this.mixCanvas.height);
        this.mixContext.drawImage(this.pattern.canvas, sx0, 0, this.mixCanvas.width, this.mixCanvas.height, 0, 0, this.mixCanvas.width, this.mixCanvas.height);
        this.mixContext.translate(this.mixCanvas.width, 0);
        this.mixContext.scale(-1, 1);
        this.mixContext.drawImage(this.pattern.canvas, sx1, 0, this.mixCanvas.width, this.mixCanvas.height, 0, 0, this.mixCanvas.width, this.mixCanvas.height);
        this.mixContext.setTransform(1,0,0,1,0,0);
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.translate(this.context.canvas.width/2, this.context.canvas.height/2);
        this.context.rotate((this.clockwise ? 1 : -1) * this.rotation * this.duration);
        this.angles.forEach(angle => {
            this.context.rotate(-1 * angle.offset);
            this.context.save();
            this.context.clip(angle.path);
            this.context.drawImage(this.mixCanvas, 0, dy);
            this.context.restore();
            this.context.rotate(angle.offset + angle.angle);
            this.context.scale(1, -1);
        })
        this.context.setTransform(1,0,0,1,0,0);
        return this;
    }
    setCharacter() {
        this.letter.draw();
        this.pattern.draw();
    }
    setAngles(redrawPatterns = true) {
        this.angles = [];
        while (this.angles.length < (2 * this.slicePairs)) this.angles.push(new Angle(this));
        [this.angles.slice(-1)[0].nextAngle, this.angles[0].prevAngle] = [this.angles[0], this.angles.slice(-1)[0]]
        this.angles.forEach(angle => angle.shift());
        this.angles.forEach(angle => angle.setPath());
        if (redrawPatterns) this.pattern.draw();
    }
    setVelocity(resetNotes = true) {
        this.period = 1 + (5 * (Math.log10(this.maxVelocity) - Math.log10(this.velocity))/(Math.log10(this.maxVelocity) - Math.log10(this.minVelocity)));
        if (resetNotes) this.audio.resetNotes();
        setTimeout(() => {
            this.letter.element.style.setProperty("--letterAnimation", null);
            setTimeout(() => this.letter.element.style.setProperty("--letterAnimation", `${this.period}s linear infinite forwards tumble`));
        });
    }
},  Angle = class {
    constructor(display) {
        this.display = display;
        this.id = this.display.angles.length;
        if (this.id) {
            this.prevAngle = this.display.angles.slice(-1)[0];
            this.prevAngle.nextAngle = this;
            this.angle = -1 * this.prevAngle.angle;
            this.offset = -1 * this.prevAngle.offset;
        } else {
            this.angle = Math.PI/this.display.slicePairs;
            if (this.angle > this.display.maxAngle) throw new Error('new Angle angle larger than maxAngle');
            this.offset = (this.display.maxAngle - this.angle)/2;
        }
    }
    setPath() {
        this.path = new Path2D();
        this.path.moveTo(0, 0);
        const startAngle = this.offset - (Math.sign(this.angle) * this.display.maxAngle/2)
        this.path.lineTo(this.display.radius, Math.tan(startAngle) * this.display.radius);
        this.path.lineTo(this.display.radius, Math.tan(startAngle + this.angle) * this.display.radius);
        this.path.closePath();
        return this;
    }
    shift() {
        const shrinkLimit = Math.min(Math.abs(this.nextAngle.angle), Math.abs(this.offset))
        ,   growLimit = Math.min(Math.abs(this.prevAngle.angle), Math.abs(this.nextAngle.offset))
        ,   growAngle = Math.random() < (growLimit/(growLimit + shrinkLimit))
        ,   shiftAngle = (growAngle ? growLimit : (-1 * shrinkLimit)) * Math.sign(this.angle) * Math.random()/2;
        this.prevAngle.angle += shiftAngle;
        this.offset += shiftAngle;
        this.nextAngle.angle -= shiftAngle;
        this.nextAngle.offset += shiftAngle;
        return this;
    }
},  Audio = class {
    constructor(display) {
        this.display = display;
        this.element = this.display.element.querySelector("#audioState");
        this.element.addEventListener("click", e => this.toggle(e));
        this.context = new (window.AudioContext || window.webkitAudioContext);
        this.gainNode = this.context.createGain();
        this.gainNode.connect(this.context.destination);
        const unison = 1
        ,   minorSecond = 16/15
        ,   majorSecond = 9/8
        ,   minorThird = 6/5
        ,   majorThird = 5/4
        ,   perfectFourth = 4/3
        ,   perfectFifth = 3/2
        ,   minorSixth = 8/5
        ,   majorSixth = 5/3
        ,   minorSeventh = 16/9
        ,   majorSeventh = 15/8
        ,   octave = 2
        this.allIntervals = [unison, minorSecond, majorSecond, minorThird, majorThird, perfectFourth, perfectFifth, minorSixth, majorSixth, minorSeventh, majorSeventh, octave];
        this.minorIntervals = [minorSecond, minorThird, minorSixth, minorSeventh];
        this.closeIntervals = [unison, minorSecond, majorSecond, minorThird, majorThird, perfectFourth, perfectFifth];
        this.intervalLimit = octave;
        this.samples = [];
        [   ["Glockenspiel", "C5"]
        ,   ["Piano", "C5"]
        ,   ["Pipa", "C5"]
        ,   ["Marimba", "C5"]
        ,   ["Picked Bass", "C5"]
        ,   ["Vibraphone", "C5"]
        ,   ["Cathedral Organ", "C3", 0.22, 3.5]
        ,   ["Cosmic Ascent", "C3", 0.632, 3.652]
        ,   ["Emerald Haze", "C3", 0.501, 3.58]
        ,   ["Flute", "C3", 0.42, 3.52]
        ,   ["Glass Bells", "C3", 0.526, 3.952]
        ,   ["Stratosphere", "C3", 0.138, 4.239]
        ,   ["Supersaw", "C3", 0, 3.5] ].forEach(sample => this.samples.push(new Sample(this, ...sample)));
        shuffle(this.samples);
        this.loadNextSample(true).loadNextSample(false);
        this.notes = [];
        return this;
    }
    delete() {
        this.element.classList.remove("active");
        this.element.classList.remove("waiting");
        this.notes.forEach(note => note && note.delete());
        this.samples.forEach(sample => sample && sample.remove());
        this.context.close();
    }
    loadNextSample(looping = true) {
        const unloadedSampleIndex = this.samples.findIndex(sample => !sample.buffer && (sample.looping == looping))
        if (unloadedSampleIndex > -1) this.samples.unshift(this.samples.splice(unloadedSampleIndex, 1)[0].load());
        return this;
    }
    resetNotes() {
        if (this.referenceNote) {
            const currentMeasure = Math.floor((this.context.currentTime - this.referenceNote.startTime)/this.display.period);
            this.notes.filter(note => note && !note.sample.looping).sort((a, b) => a.beat - b.beat).forEach((note, index) => {
                note.delete();
                const newNote = new Note(note.sample, note.beat).score(note.pitch);
                this.notes.push(newNote);
                newNote.play(currentMeasure);
                if (!index) newNote.firstBeatNote = true;
            })
        }
    }
    toggle(event) {
        this.element.classList.add("waiting");
        if (this.element.classList.contains("active")) {
            this.gainNode.gain.setValueAtTime(0.01, 0);
            this.context.suspend()
                .then(() => {
                    this.notes.filter(note => note).forEach(note => note.delete());
                    this.referenceNote = null;
                    this.element.classList.toggle("active");
                    this.element.classList.remove("waiting");
                }).catch(e => console.error("toggle 0", e));
        } else {
            this.gainNode.gain.setValueAtTime(0.2, 0);
            this.context.resume()
                .then(() => {
                    const nextSample = this.samples.find(sample => sample.looping);
                    return new Note(nextSample).score().play();
                }).then(note => {
                    this.element.classList.toggle("active");
                    this.element.classList.remove("waiting");
                    this.notes.push(note);
                    this.referenceNote = note;
                    this.samples.push(this.referenceNote.sample.remove());
                    this.loadNextSample(this.referenceNote.sample.looping);
                    return new Note(this.referenceNote.sample).score().play(1);
                }).then(note => {
                    this.notes.push(note);
                    const nextSample = this.samples.find(sample => !sample.looping)
                    ,   beatsPerMeasure = [3, 4, 6, 8, 10, 12]
                    ,   chosenBPM = beatsPerMeasure[Math.floor(beatsPerMeasure.length * Math.random())]
                    ,   noteCount = Math.max(3, Math.round(chosenBPM * Math.random(0.5, 0.8)));
                    for (let i = 0; i < noteCount; i++) {
                        const beat = (Math.floor(chosenBPM * Math.random()) + ((Math.random() < 0.2) ? 0.5 : 0))/chosenBPM;
                        this.notes.push(new Note(nextSample, beat).score());
                        this.notes.slice(-1)[0].play(2);
                    }
                    this.lastChangeMeasure = 0;
                    this.notes.filter(note => note && !note.sample.looping).sort((a, b) => a.beat - b.beat)[0].firstBeatNote = true;
                    this.samples.push(nextSample.remove());
                    this.loadNextSample(nextSample.looping);
                }).catch(e => console.error("toggle 1", e));
        }
    }
},  Letter = class {
    constructor(display) {
        this.display = display;
        this.element = this.display.element.querySelector("#letterFrame");
        this.characterElement = this.element.firstElementChild;
        this.characterElement.style.fontSize = `${this.display.radius/getRandom(8, 16)}px`;
    }
    draw() {
        this.characterElement.innerHTML = this.display.characters[this.display.characterIndex];
        return this;
    }
},  Note = class {
    constructor(sample, beat = 0) {
        this.sample = sample;
        this.audio = this.sample.audio;
        this.id = this.audio.notes.length;
        this.beat = beat;
        this.gainNode = this.audio.context.createGain();
        this.gainNode.connect(this.audio.gainNode);
    }
    delete() {
        this.gainNode.gain.setValueAtTime(0.01, 0);
        if (this.audioSource) this.audioSource.stop(0);
        clearTimeout(this.timeoutId);
        delete this.audio.notes[this.id];
        return this;
    }
    play(measure = 0) {
        return this.sample.loadPromise
            .then(() => {
                this.audioSource = this.audio.context.createBufferSource();
                this.audioSource.buffer = this.sample.buffer;
                this.audioSource.playbackRate.value = this.pitch;
                this.audioSource.connect(this.gainNode);
                this.startTime = (this.audio.referenceNote ? this.audio.referenceNote.startTime : this.audio.context.currentTime) + ((measure + this.beat) * this.audio.display.period);
                if (this.sample.looping) {
                    this.audioSource.loop = true;
                    this.audioSource.loopStart = this.sample.loopStart;
                    this.audioSource.loopEnd = this.sample.loopEnd;
                    this.gainNode.gain.setValueAtTime(0.01, this.startTime);
                    this.audioSource.start(this.startTime);
                    this.gainNode.gain.exponentialRampToValueAtTime(0.6, this.startTime + 0.5);
                } else {
                    if (this.firstBeatNote && (measure > (this.audio.lastChangeMeasure + 3)) && (Math.random() < 0.3)) {
                        const beatNotes = this.audio.notes.filter(note => note && !note.sample.looping)
                        ,   chosenNote = beatNotes[Math.floor(beatNotes.length * Math.random())];
                        chosenNote.score();
                        this.audio.lastChangeMeasure = measure;
                    }
                    this.gainNode.gain.setValueAtTime(0.6, this.startTime);
                    this.audioSource.start(this.startTime);
                    const repeatDelay = 100 + (1000 * (this.startTime - this.audio.context.currentTime));
                    this.timeoutId = setTimeout(() => this.play(measure + 1), repeatDelay);
                }
                return this;
            }).catch(e => console.error("play", e));
    }
    score(pitch) {
        if (pitch) {
            this.pitch = pitch;
        } else if (this.audio.referenceNote) {
            const intervals = this.sample.looping ? this.audio.minorIntervals : this.audio.closeIntervals
            ,   referencePitchLog = Math.log2(this.audio.referenceNote.pitch)
            ,   sampleOctave = this.sample.octave + referencePitchLog - Math.round(referencePitchLog)
            ,   upperIntervalLimit = this.sample.octaveRange[1] - sampleOctave
            ,   lowerIntervalLimit = this.sample.octaveRange[0] - sampleOctave
            ,   intervalLogs = intervals.map(interval => Math.log2(interval)).concat(intervals.map(interval => Math.log2(1/interval))).filter(interval => (interval <= upperIntervalLimit) && (interval >= lowerIntervalLimit)).sort((a, b) => Math.abs(parseFloat(a)) - Math.abs(parseFloat(b)))
            ,   chosenIntervalLog = intervalLogs[Math.floor(intervalLogs.length * Math.pow(Math.random(), 2))]
            ,   newOctave = sampleOctave + chosenIntervalLog;
            this.pitch = Math.pow(2, newOctave - this.sample.octave);
        } else {
            const chosenInterval = this.audio.allIntervals[Math.floor(this.audio.allIntervals.length * Math.random())]
            this.pitch = (Math.random() < 0.5) ? chosenInterval : (1/chosenInterval);
        }
        return this;
    }
},  Pattern = class {
    constructor(display, minSlices, maxSlices) {
        this.display = display;
        this.canvas = this.display.element.querySelector("#pattern");
        this.printWidth = 4 * this.display.radius;
        this.canvas.style.width = `${this.printWidth + this.display.radius}px`;
        this.canvas.style.height = `${2 * Math.tan(this.display.maxAngle/2) * this.display.radius}px`;
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.context = this.canvas.getContext('2d');
        this.context.textAlign = "center";
        this.context.textBaseline = "middle";
        this.context.shadowColor = "black";
        this.maxLineWidth = (slicePairs) => (this.display.radius/100) * Math.pow(10, (maxSlices - (2 * slicePairs))/(maxSlices - minSlices))
        this.stamps = [];
        const allowedTotalArea = 32 * this.canvas.width * this.canvas.height;
        let letterArea = 0;
        while (letterArea < allowedTotalArea) {
            const fontSize = this.canvas.height * getRandom(0.3, 4);
            this.stamps.push({
                x: this.printWidth * Math.random()
            ,   y: this.canvas.height * Math.random()
            ,   angle: 2 * Math.PI * Math.random()
            ,   fontSize: fontSize
            ,   color: `hsl(${360 * Math.random()}, 50%, 50%)`
            ,   widthFactor: Math.random()
            ,   blurOffsetX : Math.random()
            ,   blurOffsetY : Math.random()
            ,   blur: 5 * Math.random()
            ,   alpha: 0.3 + (0.7 * Math.pow(Math.random(), 2))
            })
            letterArea += Math.pow(fontSize, 2)
        }
    }
    draw() {
        const character = this.display.characters[this.display.characterIndex];
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.stamps.forEach(stamp => {
            this.context.font = `${stamp.fontSize}px ${this.display.fontType}`;
            this.context.strokeStyle = stamp.color;
            this.context.lineWidth = Math.max(0.5, stamp.widthFactor * this.maxLineWidth(this.display.slicePairs));
            this.context.shadowOffsetX = stamp.blurOffsetX * this.context.lineWidth;
            this.context.shadowOffsetY = stamp.blurOffsetY * this.context.lineWidth;
            this.context.shadowBlur = this.context.shadowOffsetX = stamp.blur;
            this.context.globalAlpha = stamp.alpha;
            [0, -1, 1].forEach(shift => {
                this.context.translate(stamp.x + (shift * this.printWidth), stamp.y);
                this.context.rotate(stamp.angle);
                this.context.strokeText(character, 0, 0);
                this.context.setTransform(1,0,0,1,0,0);
            })
        });
        return this;
    }
},  Sample = class {
    constructor(audio, instrumentName, noteOctave, loopStart = 0, loopEnd = 0) {
        this.audio = audio;
        this.id = this.audio.samples.length;
        this.name = instrumentName;
        this.noteOctave = noteOctave;
        this.loopStart = loopStart;
        this.loopEnd = loopEnd;
        this.octave = parseInt(this.noteOctave.slice(-1));
        this.octaveRange = [this.octave + Math.log2(1/this.audio.intervalLimit), this.octave + Math.log2(this.audio.intervalLimit)];
        this.looping = (this.loopEnd != 0);
    }
    remove() {
        return this.audio.samples.splice(this.audio.samples.findIndex(sample => sample.id == this.id), 1)[0];
    }
    load() {
        if (!this.loadPromise) {
            this.loadPromise = new Promise((resolve, reject) => {
                const sampleFile = `snd/${this.name} ${this.noteOctave}.mp3`;
                fetch(sampleFile)
                    .then(response => response.arrayBuffer())
                    .then(buffer => new Promise(resolve => this.audio.context.decodeAudioData(buffer, audioBuffer => resolve(audioBuffer))))
                    .then(audioBuffer => {
                        this.buffer = audioBuffer;
                        resolve(this);
                    }).catch(error => this.remove())
            });
        }
        return this;
    }
},  Slider = class {
    constructor(display, displayField, minimum, maximum, stepSize = 1, logarithmic = false, callFunction) {
        this.display = display;
        this.id = this.display.sliders.length;
        this.element = this.id ? this.display.sliderStack.appendChild(document.querySelector(".sliderFrames").cloneNode(true)) : this.display.sliderStack.querySelector(".sliderFrames");
        this.element.id = `slider${this.id}`;
        this.element.setAttribute("data-id", this.id);
        this.field = displayField;
        this.element.firstElementChild.min = minimum;
        this.element.firstElementChild.max = maximum;
        this.element.firstElementChild.step = stepSize;
        this.logarithmic = logarithmic;
        this.callFunction = callFunction;
        this.element.firstElementChild.value = this.logarithmic ? Math.log10(this.display[this.field]) : this.display[this.field];
    }
    change() {
        const value = parseFloat(this.element.firstElementChild.value)
        this.display[this.field] = this.logarithmic ? Math.pow(10, value) : value;
        if (this.callFunction) this.callFunction.call(this.display);
    }
    delete() {
        this.element.parentNode.removeChild(this.element);
        return this;
    }
},  getRandom = (min = 0, max = 1) => min + ((max - min) * Math.random())
,   shuffle = array => {
        for (let currentIndex = array.length; currentIndex > 0; currentIndex--) {
            const randomIndex = Math.floor(Math.random() * currentIndex)
            ,   temporaryValue = array[currentIndex - 1];
            array[currentIndex - 1] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }
        return array;
};
let animationId = null
,   priorTimestamp = 0
,   display = null
,   resizeTimeout = 0;
window.onload = () => {
    animationId = window.requestAnimationFrame(animationLoop);
}
window.onresize = () => {
    if (display) {
        window.cancelAnimationFrame(animationId);
        display.delete();
        display = null;
    }
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => animationId = window.requestAnimationFrame(animationLoop), 60);
}
const revealEvent = e => {
        if (display && !display.element.classList.contains("reveal")) {
            display.element.classList.add("reveal");
            setTimeout(() => unrevealEvent(), 2000);
        }
    }
,   unrevealEvent = e => { if (display) display.element.classList.remove("reveal") }
,   changeSliderEvent = e => {
        const dataId = e.target.parentNode.getAttribute("data-id");
        display.sliders[dataId].change();
    }
displayRoot.addEventListener("change", e => changeSliderEvent(e), false);
displayRoot.addEventListener("input", e => changeSliderEvent(e), false);
displayRoot.addEventListener("mousedown", e => revealEvent(e), false);
displayRoot.addEventListener("mousemove", e => revealEvent(e), false);
displayRoot.addEventListener("touchstart", e => revealEvent(e), false);
function animationLoop(ts) {
    if (!display) {
        display = new Display();
    } else {
        const interval = ts - priorTimestamp;
        if (interval < 60) {
            display.draw(interval);
        }
    }
    priorTimestamp = ts;
	animationId = window.requestAnimationFrame(animationLoop);
}
})();
