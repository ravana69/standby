(() => {
"use strict";

const Display = class {
    constructor() {
        this.element = document.querySelector("#displayRoot");
        this.lighting = this.element.querySelector("#lighting");
        this.wallpaper = this.element.querySelector("#wallpaper");
        this.label = this.element.querySelector("#label");
        this.labelPlate = this.label.querySelector("#labelPlate");
        this.labelText = this.labelPlate.querySelector("#labelContent > p");
        this.labelLink = this.labelPlate.querySelector("#externalLink");
        this.labelControls = this.label.querySelector("#labelControls");
        this.labelType = this.label.querySelector("#type");
        this.artistIcon = this.labelControls.querySelector("#type").textContent;
        this.museumIcon = document.querySelector("#museumIcon").textContent;
    }
    drawLabel(painting, setControlPosition) {
        this.labelText.style.fontStyle = painting.newSource ? "italic" : "normal";
        this.labelLink.href = painting.currentArtwork.pageSource.imageinfo[0].descriptionshorturl;
        const source = painting.newSource || painting.currentArtwork.source;
        this.labelText.textContent = source.isArtist ? source.title : source.title.toLowerCase();
        this.labelPlate.style.setProperty("--nameTextWidth", `${this.labelText.clientWidth}px`);
        this.labelPlate.style.height = `${Math.floor(1.4 * this.labelText.clientHeight)}px`;
        this.labelPlate.style.borderWidth = `${Math.ceil(0.7 * this.labelText.clientHeight)}px`;
        if (setControlPosition) {
            const frameRect = getBoundingClientRect(painting.frame)
            ,   halfWidth = this.labelControls.offsetWidth/2;
            this.label.style.top = `${frameRect.bottom}px`;
            this.label.style.left = `${(frameRect.left + frameRect.right)/2}px`;
            this.labelControls.style.setProperty("--controlsXOffset", `${Math.max(halfWidth - this.label.offsetLeft, Math.min(0, this.width - (this.label.offsetLeft + halfWidth)))}px`);
            this.labelControls.style.setProperty("--controlsYOffset", `${Math.min(0, this.height - (this.label.offsetTop + (this.labelPlate.offsetHeight/2)))}px`);
        }
        const halfHeight = this.labelPlate.offsetHeight/2
        ,   halfWidth = this.labelPlate.offsetWidth/2;
        this.labelPlate.style.setProperty("--plateXOffset", `${Math.max(halfWidth - this.label.offsetLeft, Math.min(0, this.width - (this.label.offsetLeft + halfWidth)))}px`);
        this.labelPlate.style.setProperty("--plateYOffset", `${Math.max(halfHeight - this.label.offsetTop, Math.min(0, this.height - (this.label.offsetTop + halfHeight)))}px`);
        this.labelType.textContent = source.isArtist ? this.artistIcon : this.museumIcon;
        this.label.classList.remove("invisible");
    }
    fetchSource() {
        const nextSearchString = this.sourceSearchValues.shift()
        ,   pageIdSearch = +nextSearchString
        ,   sourceMatch = this.sources.find(source => pageIdSearch ? (source.pageid == pageIdSearch) : (source.title == nextSearchString))
        return sourceMatch || this.sources[Math.floor(this.sources.length * Math.random())];
    }
    findPainting(identifier) {
        if (identifier.constructor.name == "Painting") {
            return this.paintings.findIndex(painting => painting == identifier);
        } else {
            return this.paintings.find(painting => painting.id == identifier);
        }
    }
    initialize() {
        this.height = this.element.clientHeight;
        this.width = this.element.clientWidth;
        const rows = Math.max(3, Math.min(5, Math.floor(3 * this.height/this.width)))
        ,   paintingCount = Math.min(12, Math.ceil(getRandom(0.4, 0.6) * Math.pow(rows, 2) * this.width/this.height))
        ,   availableOrigins = [];
        this.rowHeight = Math.floor(this.height/rows);
        this.rowYs = [];
        for (let i = 0; i < rows; i++) {
            availableOrigins.push({row: i, rightwards: true}, {row: i, rightwards: false});
            this.rowYs.push((i + 1) * this.rowHeight);
        }
        shuffle(availableOrigins);
        this.maxBorderWidth = this.rowHeight/10;
        this.minBorderWidth = Math.min(20, this.maxBorderWidth - 5);
        this.pictureHeight = Math.round(0.7 * this.rowHeight);
        this.element.style.fontSize = `${this.maxBorderWidth}px`;
        if (!this.borders) {
            this.element.querySelector("#pinwheel").addEventListener("transitionend", e => { if ((e.propertyName == "opacity") && !this.element.classList.contains("wait")) e.target.parentNode.removeChild(e.target) });
            this.element.querySelector("#credits").addEventListener("transitionend", e => { if (e.propertyName == "opacity") e.target.parentNode.removeChild(e.target) });
            const hue = 360 * Math.random()
            ,   patternHue = hue + (((Math.random() < 0.5) ? -1 : 1) * (getRandom(160, 200)))
            ,   [saturation, patternSaturation] = shuffle([getRandom(50, 70), getRandom(70, 90)])
            ,   [luminosity, patternLuminosity] = shuffle([getRandom(20, 40), getRandom(50, 70)]);
            this.element.style.backgroundColor = `hsl(${hue}, ${saturation}%, ${luminosity}%)`;
            this.wallpaper.style.backgroundColor = `hsla(${patternHue}, ${patternSaturation}%, ${patternLuminosity}%)`;
            this.element.style.setProperty("--remnantColor", `hsl(${hue}, ${saturation + 30}%, ${luminosity - 20}%)`);
            this.lighting.style.setProperty("--lightingXY", `${getRandom(30, 70)}% ${getRandom(10, 40)}%`);
            const backgroundImage = new Image()
            ,   randomPatternId = Math.floor(getRandom(0, 8));
            backgroundImage.addEventListener("load", e => {
                this.wallpaper.style.backgroundImage = `url(%24%7bbackgroundImage.html)`;
                this.element.classList.add("lightsOn");
            }, false);
            backgroundImage.src = `img/pattern${randomPatternId}.png`;
            this.audio = new Audio(this);
            this.sourceSearchValues = [...new URL(window.html).searchParams.entries()].filter(segment => segment[0].match(/artists?|museums?|pageids?/i)).map(segment => segment[1].split(/\s*,\s*/)).reduce((acc, cur) => cur.concat(...acc), []);
            this.borders = [];
            while (this.borders.length < 8) this.borders.push(new Border(this));
            shuffle(this.borders);
        }
        const rotationDuration = getRandom(700, 1500);
        this.element.style.setProperty("--paintingRotationDuration", `${rotationDuration}ms`);
        this.element.style.setProperty("--paintingRevealDuration", `${rotationDuration/4}ms`);
        this.element.style.setProperty("--paintingRevealDelay", `${rotationDuration * 3/4}ms`);
        this.element.classList.add("wait");
        this.allowMove = true;
        new Promise((resolve, reject) => {
            if (this.sources) {
                resolve();
            } else {
                this.sources = [];
                Promise.all([fetch("data/paintingsByArtist.json"), fetch("data/paintingsByMuseum.json")])
                    .then(responses => Promise.all(responses.map(response => response.json())))
                    .then(dataArray => {
                        dataArray.forEach(data => this.sources.push(...data.map(source => new Source(this, source)).sort((a, b) => a.sortFunction(b))));
                        this.sources.forEach((source, i) => source.index = i);
                        resolve();
                    })
                    .catch(error => reject(new Error("loadSources: " + error)));
            }
        })
            .then(() => {
                this.paintings = [];
                while (this.paintings.length < paintingCount) {
                    this.paintings.push(new Painting(this));
                }
                this.paintings.reduce((prevPainting, painting) => {
                    const nextBorder = this.borders.pop()
                    ,   nextOrigin = availableOrigins.pop();
                    this.borders.unshift(nextBorder);
                    availableOrigins.unshift(nextOrigin);
                    return prevPainting
                        .then(() => nextBorder.initialize())
                        .then(border =>
                            painting.initialize(nextOrigin, border).loadArtworkSources(this.fetchSource())
                                .then(painting => painting.loadArtwork())
                                .then(artwork => {
                                    artwork.painting.nextArtwork = artwork;
                                    if (this.element.classList.contains("wait")) {
                                        this.element.classList.remove("wait");
                                        this.audio.load(true)
                                            .then(() => this.audio.context.suspend())
                                            .then(() => this.audio.element.style.visibility = "visible")
                                    }
                                })
                        )
                }, Promise.resolve())
            })
            .catch(e => console.error("Display initialize: " + e));
        return this;
    }
    select(painting) {
        new Promise(resolve => {
                if (this.label.classList.contains("invisible")) {
                    resolve();
                } else {
                    this.label.addEventListener("transitionend", e => resolve(), {capture: true, once: true});
                    this.label.classList.add("invisible");
                }
            })
            .then(() => {
                if (painting && (painting != this.currentPainting)) {
                    this.currentPainting = painting;
                    this.element.classList.add("freeze");
                    this.drawLabel(painting, true);
                } else {
                    this.currentPainting = null;
                    this.element.classList.remove("freeze");
                }
            });
    }
},  Artwork = class {
    constructor(painting, source, pageSource) {
        this.painting = painting;
        this.id = artworkCount++;
        this.source = source;
        this.pageSource = pageSource;
    }
    delete(saveCurrent = false) {
        if (!saveCurrent || (this.painting.currentArtwork != this)) {
            delete this.painting.artworks[this.painting.artworks.findIndex(artwork => artwork == this)];
            if (this.image && this.image.id) {
                this.image.parentNode.removeChild(this.image);
            }
            if (this.painting.nextArtwork == this) {
                this.painting.nextArtwork = null;
            }
        }
        return this;
    }
    load() {
        return new Promise((resolve, reject) => {
            this.image = document.querySelector("#imageRoot").cloneNode(false);
            this.image.addEventListener("error", e => {
                this.delete();
                reject(new Error("Artwork load error - deleted"));
            }, false);
            this.image.addEventListener("load", e => {
                this.painting.artworksElement.appendChild(this.image);
                this.image.id = `image${this.id}`;
                this.image.setAttribute("painting-id", this.painting.id);
                this.image.setAttribute("data-id", this.id);
                this.ratio = this.image.naturalWidth/this.image.naturalHeight;
                if (!this.painting.artworks.find(artwork => artwork == this)) {
                    throw new Error('artwork load match not found');
                }
                resolve(this);
            }, false);
            this.image.alt = `Wikimedia commons ${this.pageSource.title}`;
            this.image.src = this.pageSource.imageinfo[0].thumburl;
        })
    }
    reveal() {
        this.revealing = true;
        this.image.style.visibility = "visible";
        this.image.style.setProperty("--imageRotation", `rotate(${-1 * this.painting.qTurns/4}turn)`);
        const withdrawlX = -0.5 - Math.sin(this.painting.qTurns * Math.PI/2)
        ,   withdrawlY = -0.5 - Math.cos(this.painting.qTurns * Math.PI/2)
        this.image.style.setProperty("--imageTransform", `translate(${withdrawlX * 100}%, ${withdrawlY * 100}%)`);
        this.painting.loadArtwork()
            .then(artwork => artwork.painting.nextArtwork = artwork)
            .catch(e => console.error(e));
        setTimeout(() => {
            this.image.classList.add("imageReveal");
            this.image.style.removeProperty("--imageTransform");
        });
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
        ,   primaryInstruments = [["Piano", "C2", "C4", "C6"], ["Marimba", "C2", "C4", "C6"], ["Vibraphone", "C2", "C4", "C6"]]
        ,   secondaryInstruments = [["Bongos", "C3"], ["Shaker", "D2"], ["Shaker2", "F3"], ["Tambourine", "D3"], ["Timbales", "C2"]];
        this.intervals = [
            [unison, minorSecond, majorSecond, minorThird, majorThird, perfectFourth, perfectFifth, minorSixth, majorSixth, minorSeventh, majorSeventh, octave]
        ,   [majorSecond, minorThird, majorThird, perfectFourth, perfectFifth]]
        this.instruments = [];
        this.instruments.push(new Instrument(this, primaryInstruments[Math.floor(primaryInstruments.length * Math.random())]));
        this.instruments.push(new Instrument(this, secondaryInstruments[Math.floor(secondaryInstruments.length * Math.random())]));
        this.measureLength = 6;
        return this;
    }
    load(preload = false) {
        return new Promise(resolve => {
            if (!this.voices) {
                this.voices = [];
                const delays = shuffle([0, 1, 2].map(i => i/this.measureLength))
                ,   graceDelay = 0.3/this.measureLength;
                this.voices.push(new Voice(this, this.instruments[0], delays[0], true).score(false));
                this.voices.push(new Voice(this, this.instruments[0], delays[0]));
                this.voices.push(new Voice(this, this.instruments[0], delays[1]));
                this.voices.push(new Voice(this, this.instruments[1], delays[2]));
                if (Math.random() < 0.5) this.voices.push(new Voice(this, this.instruments[1], (delays[2] + graceDelay)));
                shuffle(this.voices);
                this.voices[0].instrument.load()
                    .then(() => resolve())
            } else {
                resolve();
            }
        })
        .then(() =>
            new Promise(resolve => {
                if (preload) {
                    resolve();
                } else {
                    const nextInactiveVoice = this.voices.find(voice => !voice.active);
                    if (nextInactiveVoice) {
                        nextInactiveVoice.instrument.load()
                            .then(() => {
                                nextInactiveVoice.score();
                                resolve();
                            })
                    } else {
                        const randomVoice = this.voices[Math.floor(this.voices.length * Math.random())]
                        randomVoice.score();
                        resolve();
                    }
                }
            })
        )
    }
    play() {
        if (this.context.state == "running") {
            this.voices.filter(voice => voice.active).forEach(voice => voice.notes[this.currentNote].play());
            if (++this.currentNote >= this.measureLength) {
                this.currentNote %= this.measureLength;
                this.load()
            }
        }
    }
    toggle(event) {
        if (this.element.classList.contains("active")) {
            this.gainNode.gain.value = 0;
            this.noteDuration = 0;
            this.voices = null;
            this.context.suspend()
                .then(() => this.element.classList.toggle("active"));
        } else {
            this.load()
                .then(() => {
                    this.gainNode.gain.value = 0.2;
                    this.noteDuration = getRandom(1000, 2000);
                    this.currentNote = 0;
                    this.context.resume()
                        .then(() => this.element.classList.toggle("active"));
                });
        }
    }
},  Border = class {
    constructor(display) {
        this.display = display;
        this.id = this.display.borders.length;
        this.element = document.querySelector("#borderRoot").parentNode.appendChild(document.querySelector("#borderRoot").cloneNode(false));
        this.element.id = `border${this.id}`;
    }
    initialize() {
        return new Promise((resolve, reject) => {
            if (this.element.src) {
                resolve(this);
            } else {
                this.element.addEventListener("error", e => reject(new Error("Border initialize error")), false);
                this.element.addEventListener("load", e => resolve(this), false);
                this.element.src = `img/frame${this.id}.png`;
            }
        })
    }
},  Instrument = class {
    constructor(audio, descriptor) {
        this.audio = audio;
        this.id = this.audio.instruments.length;
        this.isPrimary = !this.id;
        this.name = descriptor.splice(0, 1)[0];
        this.notes = descriptor;
        this.octaves = this.notes.map(note => parseInt(note.slice(-1)));
    }
    load() {
        if (this.buffers) {
            return Promise.resolve();
        } else {
            this.buffers = [];
            return this.notes.reduce((prevPromise, note) =>
                prevPromise
                    .then(() => fetch(`snd/${this.name} ${note}.mp3`))
                    .then(response => response.arrayBuffer())
                    .then(buffer => new Promise(resolve => this.audio.context.decodeAudioData(buffer, audioBuffer => resolve(audioBuffer))))
                    .then(audioBuffer => {
                        this.buffers.push(audioBuffer);
                        return Promise.resolve();
                    })
                    .catch(error => Promise.resolve())
            , Promise.resolve())
        }
    }
},  Note = class {
    constructor(voice, interval) {
        this.voice = voice;
        this.position = this.voice.notes.length;
        if (this.voice.instrument.isPrimary) {
            this.referenceNote = !this.voice.isPrimary ? this.voice.audio.primaryVoice.notes[this.position] : this.position ? this.voice.notes[0] : null;
        }
        if (this.referenceNote) {
            this.index = this.referenceNote.index;
            this.factor = this.referenceNote.factor * interval;
        } else if (this.voice.isPrimary) {
            this.index = Math.floor(this.voice.instrument.notes.length/2);
            this.factor = interval;
        } else {
            this.index = 0;
            this.factor = 1;
        }
        if ((this.factor != 1) && (this.voice.instrument.notes.length > 1)) {
            const thisOctave = this.voice.instrument.octaves[this.index]
            ,   logFactor = Math.log2(this.factor)
            ,   newIndex = this.index + Math.sign(logFactor)
            ,   newOctave = this.voice.instrument.octaves[newIndex]
            if (newOctave && (Math.abs(logFactor) > Math.abs((newOctave - thisOctave)/2))) {
                this.index = newIndex;
                this.factor *= Math.pow(2, thisOctave - newOctave);
            }
        }
        return this;
    }
    play() {
        this.audioSource = this.voice.audio.context.createBufferSource()
        this.startTime = this.voice.audio.context.currentTime + (this.voice.delay * this.voice.audio.noteDuration/1000)
        this.audioSource.buffer = this.voice.instrument.buffers[this.index]
        this.audioSource.playbackRate.value = this.factor;
        this.audioSource.connect(this.voice.audio.gainNode);
        this.audioSource.start(this.startTime);
    }
},  Painting = class {
    constructor(display) {
        this.display = display;
        this.id = this.display.paintings ? this.display.paintings.length : 0;
        this.element = this.display.element.appendChild(document.querySelector("#paintingRoot").cloneNode(true));
        this.element.id = `painting${this.id}`;
        this.axis = this.element.querySelector(".axes");
        this.axis.id = `axis${this.id}`;
        this.axis.setAttribute("data-id", this.id);
        this.frame = this.axis.querySelector(".frames");
        this.frame.id = `frame${this.id}`;
        this.frame.setAttribute("data-id", this.id);
        this.frameBorder = this.frame.querySelector(".frameBorders");
        this.frameBorder.id = `frameBorder${this.id}`;
        this.artworksElement = this.frame.querySelector(".artworks");
        this.artworksElement.id = `artwork${this.id}`;
        this.framePlate = this.frame.querySelector(".framePlates");
        this.framePlate.id = `framePlate${this.id}`;
        this.remnant = this.display.element.appendChild(document.querySelector("#remnantRoot").cloneNode(false));
        this.remnant.id = `remnant${this.id}`;
    }
    advance() {
        this.moving = this.moved = false;
        this.reframing = this.reframed = false;
        if (this.visible && (((this.frameRect.left < 0) && !this.rightwards) || ((this.frameRect.right > this.display.width) && this.rightwards))) {
            this.rightwards = !this.rightwards;
        } else if ((this.frameRect.right < 0) || (this.frameRect.left > this.display.width)) {
            this.visible = false;
            this.rightwards = !this.rightwards;
            const xOffset = 10
            ,   x = this.rightwards ? (0 - xOffset) : (this.display.width + xOffset);
            this.setAxis(x);
            this.frameRect = getBoundingClientRect(this.frame);
        } else {
            this.remnant.style.width = `${this.frameRect.width}px`;
            this.remnant.style.height = `${this.frameRect.height}px`;
            this.remnant.style.top = `${this.frameRect.top}px`;
            this.remnant.style.left = `${this.frameRect.left}px`;
            this.remnant.style.opacity = 0.2;
        }
    }
    changeSource() {
        const newSource = this.newSource;
        this.newSource = null;
        this.artworks.forEach(artwork => artwork.delete(true));
        this.continueSources = [];
        this.loadArtworkSources(newSource)
            .then(painting => painting.loadArtwork())
            .then(artwork => this.nextArtwork = artwork)
    }
    cullArtwork() {
        this.artworks.filter(artwork => artwork && artwork.revealed && (artwork != this.currentArtwork)).forEach(artwork => {
            artwork.delete()
        })
    }
    delete() {
        delete this.display.paintings[this.display.findPainting(this)];
        this.element.parentNode.removeChild(this.element);
        this.remnant.parentNode.removeChild(this.remnant);
        return this;
    }
    initialize(origin, border) {
        this.frame.style.height = this.frame.style.width = `${this.display.rowHeight}px`;
        this.row = origin.row;
        this.rightwards = origin.rightwards;
        const xOffset = 10
        ,   x = this.rightwards ? (0 - xOffset) : (this.display.width + xOffset)
        ,   y = this.display.rowYs[this.row];
        this.qTurns = 0;
        this.setAxis(x, y);
        this.reframe();
        setTimeout(() => {
            this.frame.style.setProperty("--paintingReframeDuration", `${getRandom(1000, 2000)}ms`);
            this.element.style.visibility = "visible";
        });
        this.artworks = [];
        this.continueSources = [];
        this.frameBorder.style.borderImageSource = `url(%24%7bborder.element.html)`;
        this.frameBorder.classList.add(`border${border.id}`);
        return this;
    }
    loadArtwork() {
        const nextUnloaded = this.artworks.find(artwork => artwork && !artwork.image);
        if (nextUnloaded) {
            return nextUnloaded.load()
                .catch(e => this.loadArtwork());
        } else if (this.continueSources.length){
            return this.loadArtworkSources(this.continueSources.shift())
                .then(painting => painting.loadArtwork())
                .catch(error => { throw new Error('loadArtwork - advancing to new category : ', error) });
        } else {
            const source = this.display.fetchSource();
            return this.loadArtworkSources(source)
                .then(painting => painting.loadArtwork())
                .catch(error => { throw new Error(`loadArtwork - assigning new source to painting ${this.id} : `, error) });
        }
    }
    loadArtworkSources(source) {
        const root = `https://commons.wikimedia.org/w/api.php`
        ,   action = `?action=query&generator=categorymembers&gcmpageid=${source.pageid}&prop=imageinfo`
        ,   contents = `&iiprop=size|url&iiurlheight=${this.display.pictureHeight}`
        ,   limits = `&gcmnamespace=6|14&gcmlimit=10`
        ,   sort = `&gcmsort=timestamp&gcmdir=desc`
        ,   format = `&format=json&formatversion=2&origin=*`
        ,   query = new URL(root + action + contents + limits + sort + format + (source.continuation || ""))
        ,   init = { headers: new Headers({"Api-User-Agent": "nullameragon.com/new/egallery.html; nullameragon@gmail.com"}) };
        return fetch(query.href, init)
            .then(response => response.json())
            .then(data => {
                if (data.query && data.query.pages) {
                    this.artworks.push(...shuffle(data.query.pages.filter(page => page.imageinfo && (page.imageinfo[0].width/page.imageinfo[0].height > 0.5))).map(page => new Artwork(this, source, page)));
                    this.continueSources.push(...data.query.pages.filter(page => !page.imageinfo).map(page => new Source(null, null, source, page)));
                }
                if (data.continue) {
                    let continuation = "";
                    for (const property in data.continue) {
                        continuation += `&${property}=${data.continue[property]}`;
                    }
                    this.continueSources.unshift(new Source(null, null, source, null, continuation));
                    return this;
                } else if (data.batchcomplete) {
                    return this;
                } else {
                    throw new Error('loadArtworkSources: incomplete fetch');
                }
            })
            .catch(error => { throw new Error('loadArtworkSources: ', error) });
    }
    move() {
        const artworkScaleY = (this.nextArtwork.ratio < 2) ? getRandom(0.8, 0.95) : 1.9/this.nextArtwork.ratio
        ,   artworkScaleX = artworkScaleY * this.nextArtwork.ratio
        ,   [width, height] = [artworkScaleX, artworkScaleY].map(scale => scale * this.frame.offsetWidth)
        ,   rowShifts = [0].concat(shuffle([-1, 1]));
        if (rowShifts.some(rowShift => {
            const newRow = this.row + rowShift;
            if ((newRow < 0) || (newRow >= this.display.rowYs.length)) {
                return false;
            } else if (!this.visible && rowShift) {
                return false;
            } else {
                const [newLeft, newRight] = this.rightwards ? (rowShift ? [this.frameRect.right - width, this.frameRect.right] : [this.frameRect.right, this.frameRect.right + width]) : (rowShift ? [this.frameRect.left, this.frameRect.left + width] : [this.frameRect.left - width, this.frameRect.left])
                ,   padding = 50;
                if (this.display.paintings.some(painting => painting.visible && (painting != this) && (painting.row == newRow) && ((painting.frameRect.left - padding) < newRight) && ((painting.frameRect.right + padding) > newLeft))) {
                    return false;
                } else {
                    this.currentArtwork = this.nextArtwork;
                    this.nextArtwork = null;
                    this.newSource = null;
                    const x = this.rightwards ? this.frameRect.right : this.frameRect.left
                    ,   y = (rowShift < 0) ? this.frameRect.top : this.frameRect.bottom;
                    this.setAxis(x, y, rowShift);
                    this.element.classList.remove("bounce");
                    setTimeout(() => {
                        this.moving = true;
                        this.visible = true;
                        this.qTurns += (this.rightwards == (rowShift > 0)) ? -1 : 1;
                        const tilt = getRandom(-0.002, 0.002);
                        this.axis.style.setProperty("--paintingRotation", `rotate(${(this.qTurns/4) + tilt}turn)`);
                        this.row = newRow;
                        const offset = (this.frame.offsetHeight - height) * Math.random()/2
                        ,   newY = this.display.rowYs[this.row] - (offset + ((rowShift > 0) ? height : 0));
                        this.element.style.setProperty("--paintingYTranslate", newY - y);
                        this.element.classList.add("bounce");
                        [this.scaleX ,this.scaleY] = (this.qTurns % 2) ? [artworkScaleY, artworkScaleX] : [artworkScaleX, artworkScaleY]
                        this.frame.style.setProperty("--paintingScale", `scale(${this.scaleX}, ${this.scaleY})`);
                        this.frameRect.left = newLeft;
                        this.frameRect.right = newRight;
                        this.normalizedQTurns = ((this.qTurns % 4) + 4) % 4
                        this.frame.classList.remove("shadow0", "shadow1", "shadow2", "shadow3");
                        this.frame.classList.add(`shadow${this.normalizedQTurns}`);
                        this.framePlate.style.opacity = 0;
                        this.remnant.style.opacity = 0;
                    });
                    return true;
                }
            }
        })) {
            this.display.allowMove = false;
            setTimeout(() => this.display.allowMove = true, this.display.audio.noteDuration || getRandom(500, 1500));
            return true;
        } else {
            if (this.visible && (Math.random() < 0.3)) {
                this.rightwards = !this.rightwards;
            }
            return false;
        }
    }
    reframe() {
        this.frameRect = getBoundingClientRect(this.frame);
        if (this.moved) {
            this.reframing = true;
            this.display.audio.play();
            const minChange = 2
            ,   increase = Math.max(0, this.display.maxBorderWidth - (this.borderWidth + minChange))
            ,   decrease = Math.max(0, (this.borderWidth - minChange) - this.display.minBorderWidth)
            ,   increaseBorder = increase && (!decrease || (Math.random() < 0.5))
            this.borderWidth = increaseBorder ? getRandom(this.borderWidth + minChange, this.display.maxBorderWidth) : getRandom(this.display.minBorderWidth, this.borderWidth - minChange);
            this.framePlate.classList.remove("side0", "side1", "side2", "side3");
            this.framePlate.classList.add(`side${this.normalizedQTurns}`);
            this.framePlate.style.setProperty("--namePlateRotation", `rotate(${(this.qTurns/4)}turn)`);
            this.framePlate.style.opacity = 1;
        } else {
            this.borderWidth = this.display.minBorderWidth;
        }
        this.frame.style.setProperty("--paintingBorderWidth", `${this.borderWidth}px`);
    }
    selectSource(type) {
        const source = this.newSource || this.currentArtwork.source;
        if (type == "type") {
            if (source.isArtist == this.currentArtwork.source.isArtist) {
                const otherTypes = this.display.sources.filter(newSource => (newSource.isArtist == !source.isArtist))
                this.newSource = otherTypes[Math.floor(otherTypes.length * Math.random())];
            } else {
                this.newSource = null;
            }
        } else if (type == "beginning") {
            this.newSource = this.display.sources.find(newSource => newSource.isArtist == source.isArtist);
        } else if (type == "back") {
            const sourcesSlice = this.display.sources.slice(0, source.index).filter(newSource => (newSource.isArtist == source.isArtist))
            if (sourcesSlice.length) {
                const prevSortLetter = sourcesSlice.slice(-1)[0].sortLetter;
                this.newSource = sourcesSlice.find(newSource => newSource.sortLetter == prevSortLetter);
            }
        } else if (type == "forward") {
            const newSource = this.display.sources.slice(source.index + 1).find(newSource => (newSource.isArtist == source.isArtist) && (newSource.sortLetter > source.sortLetter));
            if (newSource) this.newSource = newSource;
        } else if (type == "end") {
            this.newSource = this.display.sources.filter(newSource => (newSource.isArtist == source.isArtist)).slice(-1)[0];
        } else if (type == "random") {
            this.newSource = this.display.sources[Math.floor(this.display.sources.length * Math.random())];
        } else {
            const increment = (type == "prior") ? -1 : 1
            ,   index = source.index + increment
            ,   newSource = this.display.sources.find(findSource => findSource.index == index);
            if (newSource && (newSource.isArtist == source.isArtist)) this.newSource = newSource;
        }
        this.display.drawLabel(this);
    }
    setAxis(x, y = this.frameRect.bottom, nextRowShift = 0) {
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
        this.axis.classList.remove(`corner${this.corner}`);
        const pivotCorner = (nextRowShift < 0) ? (this.rightwards ? 1 : 0) : (this.rightwards ? 2 : 3);
        this.corner = (((pivotCorner - this.qTurns) % 4) + 4) % 4;
        this.axis.classList.add(`corner${this.corner}`);
        return this;
    }
},  Source = class {
    constructor(display, sourceArray, baseSource, subcategoryPage, continuation = null) {
        if (display && sourceArray) {
            this.display = display;
            this.pageid = sourceArray[0];
            this.title = sourceArray[1];
            this.isArtist = (sourceArray.length > 2);
            this.sortkey = this.isArtist ? (sourceArray[2] || this.title.match(/\b([A-Za-z]+)\b/g).slice(-1)[0]).toUpperCase() : "";
            this.sortLetter = this.sortkey.slice(0, 1) || this.title.slice(0, 1).toUpperCase();
        } else {
            this.display = baseSource.display;
            if (subcategoryPage) {
                this.pageid = subcategoryPage.pageid;
                this.subcategory = true;
            } else {
                this.pageid = baseSource.pageid;
            }
            this.title = baseSource.title;
            this.isArtist = baseSource.isArtist;
            this.sortkey = baseSource.sortkey;
            this.sortLetter = baseSource.sortLetter;
            this.index = baseSource.index;
            this.continuation = continuation;
        }
    }
    sortFunction(compareSource) {
        const sortValue = source => source.sortkey || source.title.toUpperCase();
        return (sortValue(this) < sortValue(compareSource)) ? -1 : 1;
    }
},  Voice = class {
    constructor(audio, instrument, delay, primary = false) {
        this.audio = audio;
        this.id = this.audio.voices.length;
        this.instrument = instrument;
        this.delay = delay;
        this.isPrimary = primary;
        if (this.isPrimary) this.audio.primaryVoice = this;
    }
    score(activate = true) {
        const randomInterval = (intervalSet, power = 1) => this.audio.intervals[intervalSet][Math.floor(this.audio.intervals[intervalSet].length * Math.pow(Math.random(), power))];
        if (this.active) {
            const randomNote = this.notes[Math.floor(this.notes.length * Math.random())];
            if (!randomNote.voice.isPrimary || randomNote.position) {
                const interval = randomInterval(1);
                randomNote.initialize((Math.random() < 0.5) ? interval : (1/interval));
            }
        } else {
            this.active = activate;
            if (!this.notes) {
                this.notes = [];
                if (this.isPrimary) {
                    const intervals = [];
                    while (intervals.length < this.audio.measureLength) {
                        const interval = randomInterval(0, 2);
                        intervals.push(1/interval);
                        if (Math.random() < 0.5) intervals.push(interval);
                    }
                    shuffle(intervals).unshift(randomInterval(0))
                    intervals.splice(this.audio.measureLength)
                    intervals.forEach(interval => this.notes.push(new Note(this, interval)));
                } else {
                    while (this.notes.length < this.audio.measureLength) {
                        const interval = randomInterval(1);
                        this.notes.push(new Note(this, (Math.random() < 0.5) ? interval : (1/interval)));
                    }
                }
            }
        }
        return this;
    }
},  getBoundingClientRect = element => {
        const {top, right, bottom, left, width, height, x, y} = element.getBoundingClientRect();
        return {top, right, bottom, left, width, height, x, y};
},  getRandom = (min = 0, max = 1) => {
        return min + (Math.max(0, max - min) * Math.random());
},  shuffle = array => {
        for (let currentIndex = array.length; currentIndex > 0; currentIndex--) {
            const randomIndex = Math.floor(Math.random() * currentIndex)
            ,   temporaryValue = array[currentIndex - 1];
            array[currentIndex - 1] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }
        return array;
},  wait = duration => {
        return new Promise(resolve => setTimeout(resolve, duration));
};
let animationId = null
,   priorTimestamp = 0
,   display = null
,   artworkCount = 0;
window.onload = () => {
    animationId = window.requestAnimationFrame(animationLoop);
}
window.onresize = () => {
    if (display && !display.resizing) {
        display.resizing = true;
        location.reload();
        window.cancelAnimationFrame(animationId);
        display.select();
        if (display.paintings) display.paintings.forEach(painting => painting.delete());
        setTimeout(() => animationId = window.requestAnimationFrame(animationLoop), 500);
    }
}
displayRoot.addEventListener("click", e => {
    if (e.target.classList.contains("frames")) {
        const dataId = e.target.getAttribute("data-id")
        display.select(display.findPainting(dataId));
    } else if (display.element.classList.contains("freeze")) {
        if (e.target.parentNode.id == "labelControls") {
            display.currentPainting.selectSource(e.target.id);
        } else if ((e.target.parentNode.id != "externalLink") && (e.target.id != "labelPlate")) {
            display.select();
        }
    }
}, false);
displayRoot.addEventListener("mousemove", e => {
    if (display && !display.audio.element.classList.contains("reveal")) {
        display.audio.element.classList.add("reveal");
        setTimeout(() => display.audio.element.classList.remove("reveal"), 500);
    }
}, false);
displayRoot.addEventListener("transitionend", e => {
    if (e.propertyName == "transform") {
        const dataId = e.target.getAttribute("data-id")
        if (e.target.classList.contains("artImages")) {
            const paintingId = e.target.getAttribute("painting-id")
            display.findPainting(paintingId).artworks.find(artwork => artwork && (artwork.id == dataId)).revealed = true;
        } else if (e.target.classList.contains("axes")) {
            const painting = display.findPainting(dataId);
            painting.moved = true;
        }
    } else if (e.propertyName.match(/border.*width/) && (e.target.classList.contains("frames"))) {
        const dataId = e.target.getAttribute("data-id")
        ,   painting = display.findPainting(dataId);
        if (painting) painting.reframed = true;
    }
}, false);
function animationLoop(ts) {
    if (!display) {
        display = new Display().initialize();
    } else if (display.resizing) {
        display.resizing = false;
        display.initialize();
    } else if (display.paintings) {
        const interval = ts - priorTimestamp;
        if (interval < 100) {
            display.paintings.forEach(painting => {
                if (painting.moving && !painting.currentArtwork.revealing) {
                    painting.currentArtwork.reveal();
                } else if (!display.element.classList.contains("freeze")) {
                    if (painting.newSource) {
                        painting.changeSource();
                    } else if (display.allowMove && painting.nextArtwork && !painting.moving) {
                        if (painting.move()) {
                            display.paintings.push(display.paintings.splice(display.findPainting(painting), 1)[0]);
                        }
                    } else if (painting.moved && painting.currentArtwork.revealed && !painting.reframing) {
                        painting.cullArtwork();
                        painting.reframe();
                    } else if (painting.reframed) {
                        painting.advance();
                    }
                }
            });
        }
    }
    priorTimestamp = ts;
	animationId = window.requestAnimationFrame(animationLoop);
}
})();
