(function() {
"use strict";

const displayRoot = document.querySelector("#displayRoot")
,   maxListCount = 24
,   minContentCount = maxListCount/2
,   minLocalCount = minContentCount/4
let animationId = null
,   priorTimestamp = 0
,   display = null
,   foldCount = 0
,   pointCount = 0
,   pictureCount = 0
,   drawSheetCount = 0
,   columnCount = 0
,   holeCount = 0
;
window.onload = function() {
    animationId = window.requestAnimationFrame(animationLoop);
}
window.onresize = function() {
    if (display && !display.resizing) {
        display.resizing = true;
        window.cancelAnimationFrame(animationId);
        display.delete();
        animationId = window.requestAnimationFrame(animationLoop);
    }
}
function createDisplay() {
    const imageDir = `img/`
    ,   Display = function() {
            this.element = displayRoot;
            this.veil = this.element.querySelector("#veil");
            this.oneInch = document.querySelector('#oneInch');
            this.picturePool = document.querySelector("#picturePool");
            this.trimContext = document.querySelector("#trimRotated").getContext('2d');
            this.beta = document.querySelector("#beta");
        }
    ,   columnRoot = document.querySelector("#columnRoot")
    ,   ColumnText = function(display) {
            this.display = display;
            this.id = columnCount++;
            this.canvas = columnRoot.parentNode.appendChild(columnRoot.cloneNode(false));
            this.canvas.id = `column${this.id}`;
            this.context = this.canvas.getContext('2d');
        }
    ,   DrawSheet = function(page) {
            this.page = page;
            this.display = this.page.display;
            this.id = drawSheetCount++;
            this.canvas = this.page.element.appendChild(document.querySelector("#drawSheetRoot").cloneNode(false));
            this.canvas.id = `drawSheet${this.id}`;
            this.canvas.setAttribute("page-id",this.page.id);
            this.canvas.setAttribute("data-id",this.id);
            this.context = this.canvas.getContext('2d');
        }
    ,   Fold = function(page) {
            this.page = page;
            this.display = this.page.display;
            this.id = foldCount++;
            this.element = this.page.element.appendChild(document.querySelector("#foldRoot").cloneNode(true));
            this.element.id = `fold${this.id}`
            this.element.setAttribute("page-id",this.page.id);
            this.canvases = Array.from(this.element.querySelectorAll(".foldLayers"));
            this.canvases.forEach((canvas, index) => canvas.id = `fold${this.id}Layer${index}`);
            this.contexts = this.canvases.map(canvas => canvas.getContext('2d'));
            this.point = this.element.querySelector(".points");
            this.shadeContexts = this.contexts.filter((context, index) => index > 0);
        }
    ,   Hole = function(page, left = 0, top = 0, width = page.canvas.width, height = page.canvas.height) {
            this.page = page;
            this.display = this.page.display;
            this.id = holeCount++;
            this.left = left;
            this.top = top;
            this.width = width;
            this.height = height;
        }
    ,   Page = function(display) {
            this.display = display;
            this.id = this.display.pages.length;
            this.element = this.display.element.appendChild(document.querySelector("#pageRoot").cloneNode(true));
            this.element.id = `page${this.id}`;
            this.element.setAttribute("data-id",this.id);
            this.canvas = this.element.querySelector(".papers");
            this.canvas.id = `paper${this.id}`;
            this.canvas.setAttribute("page-id",this.id);
            this.context = this.canvas.getContext('2d');
            this.point = this.element.querySelector(".points");
        }
    ,   Picture = function(display, remote = true) {
            this.display = display;
            this.id = pictureCount++;
            this.element = this.display.picturePool.appendChild(document.querySelector("#pictureRoot").cloneNode(false));
            this.element.id = `picture${this.id}`;
            this.remote = remote;
            this.element.setAttribute("data-id",this.id);
            this.element.addEventListener("load", e => display.getPicture(e)?.load(), false);
            this.element.addEventListener("error", e => display.getPicture(e)?.delete(), false);
        }
    ,   drawWord = (context, text, x, y) => {
            const letterCount = text.length
            ,   width = context.measureText(text).width;
            if (x + width > context.canvas.width) {
                return null;
            } else {
                context.textBaseline = "top";
                context.globalCompositeOperation = "source-over";
                context.fillStyle = "black";
                context.textAlign = "left";
                context.fillText(text, x, y, width);
                context.globalCompositeOperation = "destination-over";
                context.fillStyle = `hsla(0, 0%, 0%, ${0.3 + (0.3 * Math.random())})`;
                context.textAlign = "center";
                context.fillText(randomWord(Math.max(1, letterCount - 1)), x + (width/2), y, width);
                for (let i = 0; i < (2 * letterCount); i++) {
                    context.fillStyle = `hsla(0, 0%, 0%, ${0.1 + (0.8 * Math.random())})`;
                    context.globalCompositeOperation = (Math.random() < 0.5) ? "destination-out" : "source-atop";
                    context.fillText(randomLetter(), x + (width * Math.random()), y);
                }
                return width;
            }
        }
    ,   randomLetter = (capital = false) => String.fromCharCode(0x61 + Math.floor(0x19 * Math.random()) - (capital ? 0x20 : 0))
    ,   randomWord = (length, bold = false) => {
            const letterCount = length || Math.round(5 + (((Math.random() < 0.5) ? -1 : 1) * 3 * Math.sqrt(Math.random())))
            ,   percentCapital = bold ? 0.5 : 0.1
            ,   letterCountLimit = bold ? 6 : 99
            ,   capitalize = (length > letterCountLimit) || (Math.random() < percentCapital);
            let word = "";
            while (word.length < letterCount) {
                word += randomLetter(!word.length && capitalize)
            }
            return word;
        }
    ,   shuffle = array => {
            for (let currentIndex = array.length; currentIndex > 0; currentIndex--) {
                const randomIndex = Math.floor(Math.random() * currentIndex)
                ,   temporaryValue = array[currentIndex - 1];
                array[currentIndex - 1] = array[randomIndex];
                array[randomIndex] = temporaryValue;
            }
            return array;
        }
    ;
    Display.prototype = {
        delete: function() {
            this.columnText.delete();
            this.pages.forEach(page => page.delete());
            this.pictures.forEach(picture => picture.delete());
            display = null;
        }
    ,   getPicture: function(e) {
            return this.pictures.find(picture => picture.id == e.target.getAttribute("data-id"));
        }
    ,   initialize: function() {
            this.height = this.element.clientHeight;
            this.width = this.element.clientWidth;
            this.targetColumnWidth = Math.min(2 * this.oneInch.offsetWidth, this.width/6);
            // this.maxImageWidth = 2 * this.targetColumnWidth;
            this.maxImageWidth = Math.round(1.5 * this.targetColumnWidth);
            this.gutterFraction = 0.03 + (0.02 * Math.random());
            this.minGutterWidth = Math.round(this.gutterFraction * this.targetColumnWidth);
            this.minTextHeight = this.targetColumnWidth/16;
            this.maxTextHeight = 12 * this.minTextHeight;
            this.loadRawText();
            this.columnText = new ColumnText(this).initialize(this.targetColumnWidth, this.minTextHeight);
            this.shiftColors();
            this.minStartAngle = 0.05
            this.maxStartAngle = 2 * this.minStartAngle
            this.minEndAngle = 0.2 * Math.PI
            this.maxEndAngle = 2 * this.minEndAngle
            this.minColumnHeight = this.targetColumnWidth;
            this.minArticleArea = 3 * Math.pow(this.targetColumnWidth, 2)
            this.maxArticleArea = this.height * this.width/3;
            this.minPictureRatio = 0.5
            this.maxPictureRatio = 2
            this.minTitleHeight = 3 * this.minTextHeight
            this.minTitleRatio = 5
            this.maxTitleRatio = 15
            this.pages = [];
            this.pictures = [];
            while (this.pages.length < 3) {
                this.pages.push(new Page(this).initialize());
            }
            this.localPicId = Math.floor(pageLinks.length * Math.random())
            this.veil.style.opacity = 0;
            this.pages[0].allowDraw = true;
            const percentEdge = Math.round(Math.random()) * 100
            ,   percentCorner = (Math.round(Math.random()) * 75) + (25 * Math.random())
            ,   horizontal = Math.random() < 0.5
            ,   leftCenter = horizontal ? percentEdge : percentCorner
            ,   topCenter = horizontal ? percentCorner : percentEdge
            this.element.style.setProperty("--shadeBackground", `radial-gradient(ellipse at left ${leftCenter}% top ${topCenter}%, transparent 75%, hsla(0, 0%, 0%, 0.05) 75%, hsla(0, 0%, 0%, 0.4) 100%)`);
            return this;
        }
    ,   loadLocalPictures: function() {
            // if (!this.pictures.some(picture => !picture.remote)) {
            const localPictures = this.pictures.filter(picture => !picture.remote);
            if (!localPictures.some(pictures => !pictures.loaded)) {
                // for (let i = this.pictures.filter(picture => !picture.remote && picture.loaded).length; i < minLocalCount; i++) {
                for (let i = localPictures.length; i < minLocalCount; i++) {
                    this.pictures.push(new Picture(this, false).initialize());
                }
            }
            return this;
        }
    ,   loadRawPictures: function() {
            // if (navigator.onLine && !this.loadingRawPictures && !this.pictures.some(pictures => pictures.remote && !pictures.loaded)) {
                //     this.display.minPicturesLoaded = (!navigator.onLine || (this.display.pictures.filter(picture => picture.loaded && picture.remote).length > minContentCount)) && (this.display.pictures.filter(picture => picture.loaded && !picture.remote).length > minLocalCount);
            const remotePictures = this.pictures.filter(picture => picture.remote);
            if (navigator.onLine && !this.loadingRawPictures && !remotePictures.some(pictures => !pictures.loaded) && (remotePictures.length < minContentCount)) {
                this.loadingRawPictures = true;
                const query = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&formatversion=2&prop=imageinfo|categories&iiprop=url|size&iiurlwidth=${this.maxImageWidth}&iimetadataversion=latest&cllimit=max&generator=random&grnnamespace=6&grnlimit=${maxListCount}`
                ,   init = { headers: new Headers({"Api-User-Agent": "nullameragon.com/unfolding.html; nullameragon@gmail.com"}) };
                fetch(query, init)
                    .then(response => response.json())
                    .then(data => {
                        data.query.pages.forEach(rawImage => {
                            if (rawImage.categories && rawImage.imageinfo) {
                                const categories = rawImage.categories.map(category => category.title).join()
                                ,   imageinfo = rawImage.imageinfo[0]
                                ,   url = imageinfo.thumburl || imageinfo.url || imageinfo.source;
                                if (!url.match(/(\.png$|\.svg$|\blossy)/i) && categories.match(/(photograph|image|artwork)/i) && !categories.match(/(\bflags?\b|\bdrawings?\b|\bhistorical\b|\bprints?\b|\bbooks?\b|\blogos?\b|\bcrests?\b|\bposters?\b|\bcovers?\b|\bseals?\b|\bmaps?\b)/i)) {
                                    this.pictures.push(new Picture(this).initialize(url, imageinfo, categories));
                                } else {
                                    // console.log(Date.now() + `: rejected picture url ${url}, categories ${categories}`);
                                }
                            }
                        })
                        this.loadingRawPictures = false;
                    })
                    .catch(error => console.error('loadRawPictures: ', error))
            }
            return this;
        }
    ,   loadRawText: function() {
            const file = `data/recentHeadlines.json`
            this.titleWords = [];
            fetch(file)
                .then(response => response.json())
                .then(data => {
                    data.forEach(article => {
                        this.titleWords.push(...article.title.split(/\s-\s/)[0].split(/[\s\.\!\?\"]/));
                        // this.titleWords.push(...article.description.split(/[\s\.\!\?\"]/));
                    })
                    this.titleWords = this.titleWords.filter(word => word.length);
                })
                .catch(error => console.error('loadRawText: ', error))
        }
    ,   shiftColors: function() {
            this.pageHueStart = (this.pageHueStart + 5) || 20;
        }
    }
    ColumnText.prototype = {
        delete: function() {
            this.canvas.parentNode?.removeChild(this.canvas);
        }
    ,   initialize: function(width, lineHeight) {
            this.canvas.style.width = `${width}px`;
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.style.height = `${2 * this.display.height}px`
            this.canvas.height = this.canvas.clientHeight;
            this.lineHeight = Math.floor(lineHeight);
            this.lineCount = Math.floor(this.canvas.height/this.lineHeight);
            this.context.font = `${this.lineHeight/1.2}px "serif"`;
            const spaceWidth = this.context.measureText(` `).width;
            for (let i = 0, y = 0; i < this.lineCount; i++, y += this.lineHeight) {
                lineLoop: for (let x = 0; x < this.canvas.width; ) {
                    const word = randomWord()
                    ,   width = drawWord(this.context, word, x, y);
                    if (width) {
                        x += width + spaceWidth;
                    } else {
                        break lineLoop;
                    }
                }
            }
            return this;
        }
    }
    DrawSheet.prototype = {
        delete: function() {
            // if (this.canvas.parentNode) {
            this.canvas.parentNode?.removeChild(this.canvas);
            // }
            return this;
        }
    ,   drawBackground: function() {
            const angle = 2 * Math.PI * Math.random()
            ,   radius = Math.sqrt(Math.pow(this.canvas.width, 2) + Math.pow(this.canvas.height, 2))/2
            ,   x = radius * Math.cos(angle)
            ,   y = radius * Math.sin(angle)
            ,   centerX = this.canvas.width/2
            ,   centerY = this.canvas.height/2
            ,   gradient = this.context.createLinearGradient(centerX - x, centerY - y, centerX + x, centerY + y)
            ,   startLuminosity = 60 + (10 * Math.random());
            gradient.addColorStop(0, `hsl(${this.page.hue}, ${this.page.saturation}%, ${startLuminosity}%)`);
            gradient.addColorStop(1, `hsl(${this.page.hue}, ${this.page.saturation}%, ${startLuminosity + 40}%)`);
            this.context.fillStyle = gradient;
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    ,   drawDivision: function(lineWidth = 1) {
            this.context.fillStyle = "black"
            if (this.canvas.width > this.canvas.height) {
                this.context.fillRect(0, this.canvas.height/2, this.canvas.width, lineWidth);
            } else {
                this.context.fillRect(this.canvas.width/2, 0, lineWidth, this.canvas.height);
            }
        }
    ,   drawPicture: function() {
            const eatLocal = !navigator.onLine || !this.display.pictures.some(picture => picture.loaded) || (Math.random() < 0.05)
            ,   loadedPictures = this.display.pictures.filter(picture => (!eatLocal == picture.remote) && picture.loaded).sort((a, b) => a.area - b.area)
            ,   match = loadedPictures.find(picture => (picture.width > this.hole.width) && (picture.height > this.hole.height)) || loadedPictures.slice(-1)[0];
            if (match) {
                const picture = this.display.pictures.splice(this.display.pictures.indexOf(match), 1)[0]
                ,   angle = ((Math.random() < 0.5) ? -1 : 1) * (0.2 + (0.3 * Math.random())) * Math.PI/4
                ,   cos = Math.cos(angle)
                ,   sin = Math.sin(angle)
                ,   dWidth = Math.abs(this.hole.width * cos) + Math.abs(this.hole.height * sin)
                ,   dHeight = Math.abs(this.hole.height * cos) + Math.abs(this.hole.width * sin)
                ,   dX = Math.min(0, this.hole.height * sin)
                ,   dY = Math.min(0, -1 * this.hole.width * sin)
                ,   maxScale = Math.min(picture.width/dWidth, picture.height/dHeight)
                ,   minScale = Math.min(1, maxScale)
                ,   scale = minScale + ((maxScale - minScale) * Math.random())
                ,   sWidth = dWidth * scale
                ,   sHeight = dHeight * scale
                ,   sX = (picture.width - sWidth) * Math.random()
                ,   sY = (picture.height - sHeight) * Math.random()
                this.context.rotate(angle)
                this.context.drawImage(picture.element, sX, sY, sWidth, sHeight, dX, dY, dWidth, dHeight);
                picture.delete();
            }
        }
    ,   drawTarget: function() {
            const x = this.canvas.width/2
            ,   y = this.canvas.height/2
            ,   r0 = Math.min(x, y)/2
            ,   r1 = Math.max(x, y)
            ,   gradient = this.context.createRadialGradient(x, y, r0, x, y, r1)
            ,   hue = 360 * Math.random();
            gradient.addColorStop(0, `hsl(${hue}, 80%, 50%)`);
            gradient.addColorStop(1, `hsl(${hue}, 60%, 20%)`);
            this.context.fillStyle = gradient;
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    ,   drawText: function() {
            const sWidth = this.display.columnText.canvas.width
            ,   lineHeight = this.display.columnText.lineHeight * this.hole.columnWidth/sWidth
            ,   lines = Math.floor(this.canvas.height/lineHeight)
            for (let i = 0, x = 0; i < this.hole.columns; i++, x += (this.hole.columnWidth + this.hole.gutterWidth)) {
                const sHeight = lines * this.display.columnText.lineHeight
                ,   dHeight = lines * lineHeight
                ,   sY = Math.floor((this.display.columnText.lineCount - lines) * Math.random()) * this.display.columnText.lineHeight;
                this.context.drawImage(this.display.columnText.canvas, 0, sY, sWidth, sHeight, x, 0, this.hole.columnWidth, this.canvas.height);
            }
        }
    ,   drawTitle: function(isMasthead = false) {
            this.context.font = `${this.hole.height/1.2}px serif`;
            const spaceWidth = this.context.measureText(` `).width
            ,   givenWords = isMasthead ? [`The`, new Intl.DateTimeFormat(undefined, {weekday: "long"}).format(Date.now()), `Beta`] : []
            ,   y = 0;
            let x = 0
            ,   width = 0
            ,   repeatCount = 0;
            if (isMasthead) {
                const width = this.hole.height * this.display.beta.width/this.display.beta.height
                this.context.drawImage(this.display.beta, 0, 0, width, this.hole.height);
                x += width;
            }
            wordLoop: do {
                const word = isMasthead ? givenWords.shift() : this.display.titleWords[Math.floor(this.display.titleWords.length * Math.random())];
                if (word) {
                    width = drawWord(this.context, word, x, y);
                    if (width) {
                        x += width + spaceWidth
                    } else {
                        repeatCount++;
                    }
                } else {
                    break wordLoop;
                }
            } while (repeatCount < 5)
            if (isMasthead) {
                this.context.font = `${2 * this.display.minTextHeight}px serif`;
                const fullDate = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).format(Date.now())
                ,   dateWidth = this.context.measureText(fullDate).width
                ,   fullWidth = x - spaceWidth
                this.context.globalCompositeOperation = "source-over";
                this.context.textBaseline = "bottom";
                this.context.textAlign = "center";
                this.context.fillStyle = "hsl(0, 0%, 40%)";
                this.context.fillText(fullDate, fullWidth/2, this.hole.height);
                const shiftX = (this.canvas.width - fullWidth)/2;
                this.left += shiftX;
                this.hole.left += shiftX;
                this.canvas.style.transform = `translate(${this.left + this.page.x}px, ${this.top + this.page.y}px)`;
            }
        }
    ,   initialize: function(hole) {
            this.hole = hole;
            this.hole.drawSheet = this;
            this.left = this.hole.left;
            this.top = this.hole.top;
            this.canvas.style.transform = `translate(${this.left + this.page.x}px, ${this.top + this.page.y}px)`;
            this.canvas.style.width = `${this.hole.width}px`;
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.style.height = `${this.hole.height}px`;
            this.canvas.height = this.canvas.clientHeight;
            return this;
        }
    }
    Fold.prototype = {
        delete: function() {
            this.element.parentNode?.removeChild(this.element);
            this.page.currentFold = null;
        }
    ,   draw: function() {
            this.contexts[0].rotate(-1 * this.angle);
            this.contexts[0].translate(this.page.x - this.x, this.page.y - this.y);
            this.contexts[0].drawImage(this.page.canvas, 0, 0);
            this.contexts[0].setTransform(1, 0, 0, 1, 0, 0);
            this.shadeContexts.forEach(context => {
                context.drawImage(this.canvases[0], 0, 0);
            });
            this.contexts.forEach(context => context.globalCompositeOperation = "source-atop");
            const point0 = this.element.getBoundingClientRect()
            ,   point1 = this.point.getBoundingClientRect()
            ,   angle = Math.atan2(point1.y - point0.y, point1.x - point0.x)
            ,   shadeLuminosity = 50 * (1 + Math.cos(angle + Math.PI/2))
            this.contexts[1].fillStyle = `hsla(0, 0%, ${shadeLuminosity}%, 0.3)`;
            this.contexts[2].fillStyle = `hsla(0, 0%, ${100 - shadeLuminosity}%, 0.3)`;
            this.contexts[3].fillStyle = `hsla(${this.page.hue}, ${this.page.saturation}%, 50%, 0.3)`;
            this.shadeContexts.forEach(context => context.fillRect(0, 0, context.canvas.width, context.canvas.height));
            this.page.context.translate(this.x - this.page.x, this.y - this.page.y);
            this.page.context.rotate(this.angle);
            this.page.context.clearRect(0, 0, this.canvases[0].width + 1, this.canvases[0].height + 1);
            this.page.context.setTransform(1, 0, 0, 1, 0, 0);
            return this;
        }
    ,   initialize: function(vertices) {
            this.angle = Math.atan2(vertices[1].y - vertices[0].y, vertices[1].x - vertices[0].x)
            const cos = Math.cos(this.angle)
            ,   sin = Math.sin(this.angle)
            ,   transformedVertices = [{x: 0, y: 0}, {x: Math.sqrt(Math.pow(vertices[0].x - vertices[1].x, 2) + Math.pow(vertices[0].y - vertices[1].y, 2)), y: 0}]
            this.point.style.transform = `translateX(${transformedVertices[1].x}px)`;
            for (let i = vertices[1].side; i != vertices[0].side; ) {
                i = (i + 1) % 4;
                const x = this.page.x + ((i % 3) ? this.page.canvas.width : 0) - vertices[0].x
                ,   y = this.page.y + ((i > 1) ? this.page.canvas.height : 0) - vertices[0].y
                ,   xRotated = (x * cos) + (y * sin)
                ,   yRotated = (y * cos) - (x * sin);
                transformedVertices.push({x: xRotated, y: yRotated});
            }
            const pointXs = transformedVertices.map(point => point.x)
            ,   pointYs = transformedVertices.map(point => point.y)
            ,   xMax = Math.max(...pointXs)
            ,   xMin = Math.min(...pointXs)
            ,   yMax = Math.max(...pointYs)
            ,   yMin = Math.min(...pointYs)
            ,   width = xMax - xMin
            ,   height = yMax - yMin
            this.x = vertices[0].x + (xMin * cos) + (yMin * sin)
            this.y = vertices[0].y - (yMin * cos) + (xMin * sin)
            const endVertices = [{x: 0, y: 0}, {x: 0, y: -1 * height}, {x: width, y: -1 * height}, {x: width, y: 0}]
            ,   negCos = Math.cos(-1 * this.angle)
            ,   negSin = Math.sin(-1 * this.angle)
            this.endVertices = [];
            endVertices.forEach(vertex => {
                const x = this.x + (vertex.x * negCos) + (vertex.y * negSin)
                ,   y = this.y + (vertex.y * negCos) - (vertex.x * negSin)
                this.endVertices.push({x: x, y: y})
            })
            this.element.style.left = `${this.x}px`;
            this.element.style.top = `${this.y}px`;
            this.canvases.forEach(canvas => {
                canvas.style.width = `${width}px`;
                canvas.width = canvas.clientWidth;
                canvas.style.height = `${height}px`;
                canvas.height = canvas.clientHeight;
            })
            this.element.style.setProperty("--foldRotate", `rotate(${this.angle}rad)`);
            return this;
        }
    ,   merge: function() {
            this.page.expand(this);
            this.page.context.translate(this.x - this.page.x, this.y - this.page.y);
            this.page.context.rotate(this.angle);
            this.page.context.scale(1, -1);
            this.canvases.forEach(canvas => {
                this.page.context.drawImage(canvas, 0, 0);
            })
            this.page.context.setTransform(1, 0, 0, 1, 0, 0);
            this.page.trim();
            this.delete();
            return this;
        }
    ,   move: function() {
            const period = 500 + (500 * Math.random());
            let delay = 0;
            if (!this.page.moving && !this.page.moveComplete) {
                delay = 1000;
                this.page.move(8 * period);
            }
            this.element.style.transition = `transform ${period}ms ease-in-out ${delay}ms`;
            setTimeout(() => {
                this.element.style.setProperty("--foldScale", `scale(1, -1)`);
                this.shadeContexts.forEach((context, index) => context.canvas.style.animation = `foldOpacity${index + 1} ${period}ms ease-in-out ${delay}ms forwards`);
            }, 0);
            return this;
        }
    }
    Hole.prototype = {
        initialize: function(type) {
            if (!this.height || !this.width) { throw new Error("hole size error") }
            this.type = type || this.type;
            this.area = this.width * this.height;
            this.ratio = this.width/this.height;
            this.columns = Math.round(this.width/this.display.targetColumnWidth);
            this.gutterWidth = Math.max(this.display.minGutterWidth, Math.floor(this.display.gutterFraction * this.width/this.columns));
            this.columnWidth = Math.floor((this.width - ((this.columns - 1) * this.gutterWidth))/this.columns);
            return this;
        }
    ,   setOrder: function(pageArea, minPicturesLoaded) {
            if (this.type == "background") {
                return 0;
            } else if (!minPicturesLoaded && (this.type == "picture")) {
                return pageArea + this.area;
            } else {
                return 1 + (pageArea * Math.random());
            }
        }
    ,   split: function(horizontalSplit = 0, verticalSplit = 0) {
            if (((horizontalSplit == 0) == (verticalSplit == 0)) || (Math.abs(horizontalSplit) > this.width) || (Math.abs(verticalSplit) > this.height)) { throw new Error("split parameter error") }
            const newLeft = this.left + Math.max(-1 * Math.sign(horizontalSplit) * (this.width + horizontalSplit), 0)
            ,   newTop = this.top + Math.max(-1 * Math.sign(verticalSplit) * (this.height + verticalSplit), 0)
            ,   newWidth = horizontalSplit ? Math.abs(horizontalSplit) : this.width
            ,   newHeight = verticalSplit ? Math.abs(verticalSplit) : this.height
            this.left += Math.max(0, horizontalSplit);
            this.top += Math.max(0, verticalSplit)
            this.width -= horizontalSplit ? newWidth : 0;
            this.height -= verticalSplit ? newHeight : 0;
            this.initialize();
            return new Hole(this.page, newLeft, newTop, newWidth, newHeight);
        }
    ,   trim: function(borderWidth) {
            const roundedWidth = Math.round(borderWidth)
            this.left += roundedWidth;
            this.top += roundedWidth;
            const double = 2 * roundedWidth;
            this.width -= double;
            this.height -= double;
            this.initialize();
        }
    }
    Page.prototype = {
        addFold: function() {
            if ((this.removing || this.moveComplete) && this.targetSizeReached && this.nextPage.drawComplete) {
                this.foldsComplete = true;
            } else {
                const corners = this.getCorners()
                corners.sort((a, b) => b.distance - a.distance);
                // this.targetRadiusReached = corners.slice(-1)[0].distance < (2 * this.targetRadius)
                // const c = corners.slice(-1)[0];
                // console.log(Date.now() + `: page ${this.element.id} targetRadiusReached ${this.targetRadiusReached} corner x/y/d ${c.x}/${c.y}/${c.distance} < this.targetRadius ${this.targetRadius}`)
                if (this.nextPage.drawComplete && this.targetSizeReached) {
                    this.foldsComplete = true;
                } else {
                    const furthestCorner = corners[Math.floor(4 * Math.pow(Math.random(), 2))]
                    ,   cornerAngle = Math.atan2(furthestCorner.y, furthestCorner.x)
                    ,   radius = Math.max(furthestCorner.distance * (0.3 + (0.3 * Math.random())))
                    ,   foldX = radius * Math.cos(cornerAngle)
                    ,   foldY = radius * Math.sin(cornerAngle)
                    ,   rightX = this.x + this.canvas.width
                    ,   bottomY = this.y + this.canvas.height
                    ,   vertices = [];
                    [cornerAngle + (Math.PI/2), cornerAngle - (Math.PI/2)].forEach((angle, index) => {
                        const sin = Math.sin(angle)
                        ,   cos = Math.cos(angle)
                        ,   tan = Math.tan(angle)
                        ,   leftIntersect = (cos < 0) ? (foldY - ((foldX - this.x) * tan)) : Infinity
                        ,   topIntersect = (sin < 0) ? (foldX - ((foldY - this.y)/tan)) : Infinity
                        ,   rightIntersect = (cos > 0) ? (foldY + ((rightX - foldX) * tan)) : Infinity
                        ,   bottomIntersect = (sin > 0) ? (foldX + ((bottomY - foldY)/tan)) : Infinity;
                        if ((rightIntersect >= this.y) && (rightIntersect <= bottomY)) {
                            vertices[index] = {side: 1, x: rightX, y: rightIntersect}
                        } else if ((leftIntersect >= this.y) && (leftIntersect <= bottomY)) {
                            vertices[index] = {side: 3, x: this.x, y: leftIntersect}
                        } else if ((bottomIntersect >= this.x) && (bottomIntersect <= rightX)) {
                            vertices[index] = {side: 2, x: bottomIntersect, y: bottomY}
                        } else if ((topIntersect >= this.x) && (topIntersect <= rightX)) {
                            vertices[index] = {side: 0, x: topIntersect, y: this.y}
                        }
                    })
                    this.currentFold = new Fold(this).initialize(vertices).draw().move();
                }
            }
        }
    ,   build: function() {
            this.holes.push(new Hole(this).initialize("background"));
            const hole = new Hole(this).initialize("text")
            ,   maxArticleRatio = 3
            if (hole.ratio > maxArticleRatio) {
                const widthSplit = Math.min(maxArticleRatio * hole.height, hole.width/2);
                this.buildPage(hole.split(widthSplit).initialize());
                this.buildPage(hole, false);
            } else {
                this.buildPage(hole);
            }
        }
    ,   buildPage: function(hole, frontPage = !this.id || (Math.random() < 0.1)) {
            hole.trim(hole.gutterWidth);
            if (frontPage) {
                if ((hole.ratio > 1) && (Math.random() < 0.7)) {
                    const teaserHole = hole.split(0, this.display.maxTextHeight).initialize("title");
                    this.holes.push(teaserHole.split(0, -2 * teaserHole.gutterWidth).initialize("division"))
                    const count = Math.round(teaserHole.ratio/3)
                    ,   width = teaserHole.width/count;
                    for (let i = 0; i < count; i++) {
                        const finalHole = (i == (count - 1))
                        ,   newTeaserHole = finalHole ? teaserHole : teaserHole.split(-1 * width).initialize("title");
                        if (!finalHole) {
                            this.holes.push(newTeaserHole.split(2 * newTeaserHole.gutterWidth).initialize("division"));
                        }
                        this.holes.push(newTeaserHole.split(newTeaserHole.width/-2).initialize("picture"))
                        const titleCount = Math.round(this.display.minTitleRatio/newTeaserHole.ratio)
                        ,   height = newTeaserHole.height/titleCount
                        for (let j = 0; j < titleCount; j++) {
                            const finalTitle = (j == (titleCount - 1))
                            this.holes.push(finalTitle ? newTeaserHole : newTeaserHole.split(0, height).initialize("title"))
                        }
                    }
                }
                this.holes.push(hole.split(0, this.display.maxTextHeight).initialize("masthead"));
                this.holes.push(hole.split(0, 2 * hole.gutterWidth).initialize("division"));
            }
            articleLoop: while (hole) {
                const minHeight = Math.max(2 * this.display.minColumnHeight, this.display.minArticleArea/hole.width)
                ,   maxHeight = Math.min(this.display.maxArticleArea/hole.width, hole.height - minHeight)
                ,   horizontalPossible = (maxHeight >= minHeight)
                ,   minColumns = Math.ceil(this.display.minArticleArea/(hole.height * hole.columnWidth))
                ,   maxColumns = Math.floor(Math.min(Math.floor(this.display.maxArticleArea/(hole.height * hole.columnWidth)), Math.floor(hole.area - this.display.minArticleArea)/(hole.height * hole.columnWidth)))
                ,   verticalPossible = (maxColumns > minColumns) || (hole.columns > minColumns);
                let articleHole = null;
                if (horizontalPossible || verticalPossible) {
                    const horizontalSplit = horizontalPossible && (!verticalPossible || (Math.random() > (hole.width/(hole.width + hole.height))))
                    ,   widthSplit = horizontalSplit ? 0 : ((Math.random() < 0.5) ? -1 : 1) * hole.width * (minColumns + Math.floor((maxColumns - minColumns) * Math.random()))/hole.columns
                    ,   heightSplit = widthSplit ? 0 : ((Math.random() < 0.5) ? -1 : 1) * (minHeight + ((maxHeight - minHeight) * Math.random()));
                    articleHole = hole.split(widthSplit, heightSplit).initialize("text");
                    this.holes.push(articleHole.split(-2 * Math.sign(widthSplit) * articleHole.gutterWidth, -2 * Math.sign(heightSplit) * articleHole.gutterWidth).initialize("division"));
                } else {
                    articleHole = hole;
                    hole = null;
                }
                const titleHeight = Math.min(this.display.maxTextHeight, Math.max(this.display.minTitleHeight, articleHole.width/(this.display.minTitleRatio + ((this.display.maxTitleRatio - this.display.minTitleRatio) * Math.random()))))
                ,   minTotalLength = titleHeight * (10 + (10 * Math.random()))
                ,   titleLines = Math.min(4, Math.floor((articleHole.height - this.display.minColumnHeight)/titleHeight), Math.ceil(minTotalLength/articleHole.width))
                for (let i = 0; i < titleLines; i++) {
                    this.holes.push(articleHole.split(0, titleHeight).initialize("title"));
                }
                articleHole.split(0, -1 * articleHole.gutterWidth);
                const minPictureArea = Math.max(articleHole.area/5, Math.pow(articleHole.columnWidth, 2))
                ,   maxPictureArea = (articleHole.area * (articleHole.columns - 1)/articleHole.columns) || (articleHole.columnWidth * (articleHole.height - this.display.minColumnHeight))
                ,   pictureOptions = [];
                for (let i = 1, width = articleHole.columnWidth; i <= articleHole.columns; i++, width += (articleHole.columnWidth + articleHole.gutterWidth)) {
                    const minHeight = Math.max(minPictureArea/width, width/this.display.maxPictureRatio)
                    ,   maxHeight = Math.min(maxPictureArea/width, width/this.display.minPictureRatio, articleHole.height - this.display.minColumnHeight);
                    if (maxHeight > minHeight) {
                        const height = minHeight + ((maxHeight - minHeight) * Math.random())
                        pictureOptions.push({ columns: i, height: height, width: width, area: (height * width) });
                    }
                    const fullArea = width * articleHole.height
                    ,   fullRatio = width/articleHole.height;
                    if ((fullArea > minPictureArea) && (fullArea < maxPictureArea) && (fullRatio > this.display.minPictureRatio) && (fullRatio < this.display.maxPictureRatio)) {
                        pictureOptions.push({ columns: i, height: articleHole.height, width: width, area: (articleHole.height * width), fullHeight: true });
                    }
                }
                if (pictureOptions.length) {
                    pictureOptions.sort((a, b) => b.area - a.area)
                    const picture = pictureOptions[Math.floor(pictureOptions.length * Math.pow(Math.random(), 2))]
                    ,   x = (picture.columns == articleHole.columns) ? 0 : ((Math.random() < 0.7) ? -1 : 1) * picture.width
                    ,   y = picture.fullHeight ? 0 : ((Math.random() < 0.7) ? 1 : -1) * picture.height
                    ,   pictureHole = (x ? articleHole.split(x) : articleHole.split(0, y)).initialize("picture");
                    if (x && y) {
                        this.holes.push(pictureHole.split(0, Math.sign(y) * (picture.height - pictureHole.height)).initialize("text"))
                    }
                    if (x) {
                        articleHole.split(Math.sign(x) * articleHole.gutterWidth);
                    }
                    if (y) {
                        pictureHole.split(0, -1 * Math.sign(y) * articleHole.gutterWidth);
                    }
                    this.holes.push(pictureHole);
                }
                this.holes.push(articleHole)
            }
            const minPicturesLoaded = (!navigator.onLine || (this.display.pictures.filter(picture => picture.loaded && picture.remote).length > minContentCount)) && (this.display.pictures.filter(picture => picture.loaded && !picture.remote).length > minLocalCount);
            this.holes.forEach(hole => hole.order = hole.setOrder(this.canvas.width * this.canvas.height, minPicturesLoaded))
            this.holes.sort((a, b) => a.order - b.order)
            this.largestPictureHole = this.holes.filter(hole => hole.type == "picture").sort((a, b) => b.area - a.area)[0];
        }
    ,   delete: function(createReplacement) {
            if (this.nextPage) {
                this.nextPage.prevPage = null;
            }
            if (this.prevPage) {
                this.prevPage.nextPage = null;
            }
            delete this.display.pages[this.id];
            this.element.parentNode?.removeChild(this.element);
            if (createReplacement) {
                this.display.pages.push(new Page(this.display).initialize());
            }
        }
    ,   draw: function() {
            if (!this.prevPage || !this.prevPage.removing) {
                this.allowDraw = false;
            }
            if (this.holes.length) {
                const hole = this.holes.shift()
                ,   drawSheet = new DrawSheet(this).initialize(hole);
                this.drawSheets.push(drawSheet);
                if (drawSheet.hole.type == "background") {
                    drawSheet.drawBackground();
                } else if (drawSheet.hole.type == "division") {
                    drawSheet.drawDivision()
                } else if (drawSheet.hole.type == "masthead") {
                    drawSheet.drawTitle(true)
                } else if (drawSheet.hole.type == "picture") {
                    if (this.prevPage && (drawSheet.hole == this.prevPage.targetHole)) {
                        drawSheet.drawTarget()
                    } else {
                        drawSheet.drawPicture()
                    }
                } else if (drawSheet.hole.type == "text") {
                    drawSheet.drawText()
                } else if (drawSheet.hole.type == "title") {
                    drawSheet.drawTitle()
                }
                drawSheet.canvas.style.opacity = 1;
                setTimeout(() => this.allowDraw = true, 100 + (100 * Math.random()));
            }
        }
    ,   expand: function(fold) {
            const excessLeft = Math.max(0, this.x - Math.min(...fold.endVertices.map(vertex => vertex.x)))
            ,   excessRight = Math.max(0, Math.max(...fold.endVertices.map(vertex => vertex.x)) - (this.x + this.canvas.width))
            ,   excessTop = Math.max(0, this.y - Math.min(...fold.endVertices.map(vertex => vertex.y)))
            ,   excessBottom = Math.max(0, Math.max(...fold.endVertices.map(vertex => vertex.y)) - (this.y + this.canvas.height));
            if ((excessLeft > 0) || (excessRight > 0) || (excessTop > 0) || (excessBottom > 0)) {
                const x = 0 - excessLeft
                ,   y = 0 - excessTop
                ,   width = this.canvas.width + excessLeft + excessRight
                ,   height = this.canvas.height + excessTop + excessBottom;
                this.resize(width, height, x, y);
            }
        }
    ,   getCorners: function() {
            return [0, 1, 2, 3].map(side => {
                let x = this.x
                ,   y = this.y;
                if (side == 0) {
                    const content = this.context.getImageData(0, 0, this.canvas.width, 1).data.findIndex(pixel => pixel)
                    x += Math.floor(content/4);
                } else if (side == 1) {
                    const content = this.context.getImageData(this.canvas.width, 0, -1, this.canvas.height).data.findIndex(pixel => pixel)
                    x += this.canvas.width
                    y += Math.floor(content/4);
                } else if (side == 2) {
                    const content = this.context.getImageData(0, this.canvas.height, this.canvas.width, -1).data.reverse().findIndex(pixel => pixel)
                    x += this.canvas.width - Math.floor(content/4)
                    y += this.canvas.height
                } else {
                    const content = this.context.getImageData(0, 0, 1, this.canvas.height).data.reverse().findIndex(pixel => pixel)
                    y += this.canvas.height - Math.floor(content/4)
                }
                const distance = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
                this.targetSizeReached = this.targetSizeReached || (distance < this.targetSize)
                return {x: x, y: y, distance: distance};
            })
        }
    ,   initialize: function() {
            this.element.style.zIndex = `${-1 * this.id}`;
            this.color = `hsl(${360 * Math.random()}, 20%, 95%)`
            this.startAngle = ((Math.random() < 0.5) ? -1 : 1) * (this.display.minStartAngle + ((this.display.maxStartAngle - this.display.minStartAngle) * Math.random()))
            this.endAngle = ((Math.random() < 0.5) ? -1 : 1) * (this.display.minEndAngle + ((this.display.maxEndAngle - this.display.minEndAngle) * Math.random()))
            const cos = Math.cos(this.startAngle)
            ,   sin = Math.sin(this.startAngle)
            ,   width = Math.ceil((this.display.width * cos) + Math.abs(this.display.height * sin))
            ,   height = Math.ceil((this.display.height * cos) + Math.abs(this.display.width * sin));
            this.element.style.setProperty("--pageRotate", `rotate(${this.startAngle}rad)`);
            this.resize(width, height);
            this.hue = this.display.pageHueStart + (50 * Math.random())
            this.saturation = 20 + (20 * Math.random())
            this.holes = []
            this.build();
            this.translateX = this.translateY = 0;
            if (this.id) {
                this.prevPage = this.display.pages[this.id - 1];
                this.prevPage.nextPage = this;
                const targetX = this.x + this.largestPictureHole.left + (this.largestPictureHole.width/2)
                ,   targetY = this.y + this.largestPictureHole.top + (this.largestPictureHole.height/2)
                ,   distance = Math.sqrt(Math.pow(targetX, 2) + Math.pow(targetY, 2))
                ,   angle = Math.atan2(targetY, targetX) + this.startAngle - this.prevPage.endAngle;
                this.prevPage.translateX = distance * Math.cos(angle);
                this.prevPage.translateY = distance * Math.sin(angle);
                this.prevPage.targetSize = Math.min(this.largestPictureHole.width, this.largestPictureHole.height);
                this.prevPage.targetHole = this.largestPictureHole;
            }
            this.drawSheets = [];
            this.point.style.transform = `translateX(${width/2}px)`;
            return this;
        }
    ,   merge: function() {
            this.merging = true;
            if (this.removing) {
                if (this.currentFold) {
                    this.currentFold.merge();
                }
                const pageRect = this.element.getBoundingClientRect()
                ,   pointRect = this.point.getBoundingClientRect()
                ,   currentAngle = Math.atan2(pointRect.y - pageRect.y, pointRect.x - pageRect.x)
                this.nextPage.context.translate(-1 * this.nextPage.x, -1 * this.nextPage.y);
                this.nextPage.context.rotate(this.startAngle - this.nextPage.startAngle);
                this.nextPage.context.translate(pageRect.x - (this.display.width/2), pageRect.y - (this.display.height/2));
                this.nextPage.context.rotate(currentAngle);
                this.nextPage.context.translate(this.x, this.y);
                this.nextPage.context.globalAlpha = 0.7;
                this.nextPage.context.drawImage(this.canvas, 0, 0);
                this.nextPage.context.globalAlpha = 1;
                this.nextPage.context.setTransform(1, 0, 0, 1, 0, 0);
            } else if (this.targetSheet) {
                this.targetSheet.context.translate(-1 * (this.targetSheet.left + this.targetSheet.page.x), -1 * (this.targetSheet.top + this.targetSheet.page.y));
                this.targetSheet.context.rotate(this.endAngle - this.targetSheet.page.startAngle);
                this.targetSheet.context.translate(this.translateX, this.translateY);
                this.targetSheet.context.globalAlpha = 0.7;
                this.targetSheet.context.drawImage(this.canvas, this.x, this.y);
                this.targetSheet.page.context.drawImage(this.targetSheet.canvas, this.targetSheet.left, this.targetSheet.top);
            }
            this.element.style.opacity = 0;
        }
    ,   move: function(period) {
            this.moving = true;
            this.element.style.setProperty("--pageTransformTransition", `transform ${period}ms ease-in-out`);
            setTimeout(() => {
                this.element.style.setProperty("--pageTranslate", `translate(${this.translateX}px, ${this.translateY}px)`);
                this.element.style.setProperty("--pageRotate", `rotate(${this.endAngle}rad)`);
            }, 0);
        }
    ,   remove: function() {
            this.removing = true;
            if (this.targetHole.page.drawSheets.includes(this.targetHole.drawSheet)) {
                this.targetHole.page.holes.push(this.targetHole);
                this.targetHole.page.drawComplete = false;
                this.targetHole.page.allowDraw = true;
            }
            if (this.targetSheet) {
                this.targetSheet.delete();
            }
            this.targetHole = null;
        }
    ,   resize: function(newWidth, newHeight, xOffset, yOffset) {
            const roundWidth = Math.ceil(newWidth)
            ,   roundHeight = Math.ceil(newHeight)
            ,   roundXOffset = Math.round(xOffset)
            ,   roundYOffset = Math.round(yOffset)
            ,   origCanvas = this.initialized ? this.canvas : null;
            if (origCanvas) {
                this.canvas = this.element.appendChild(this.canvas.cloneNode(false));
                this.context = this.canvas.getContext('2d');
                this.x += roundXOffset
                this.y += roundYOffset
            } else {
                this.x = -1 * Math.ceil(newWidth/2)
                this.y = -1 * Math.ceil(newHeight/2)
                this.initialized = true;
            }
            this.canvas.style.width = `${Math.ceil(roundWidth)}px`;
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.style.height = `${Math.ceil(roundHeight)}px`;
            this.canvas.height = this.canvas.clientHeight;
            this.canvas.style.transform = `translate(${this.x}px, ${this.y}px)`;
            if (origCanvas) {
                this.context.drawImage(origCanvas, 0, 0, origCanvas.width, origCanvas.height, -1 * roundXOffset, -1 * roundYOffset, origCanvas.width, origCanvas.height);
                this.element.removeChild(origCanvas);
            }
        }
    ,   transferDrawing: function(sheetId) {
            const drawSheet = this.drawSheets.splice(this.drawSheets.findIndex(drawSheet => drawSheet.id == sheetId), 1)[0];
            this.context.drawImage(drawSheet.canvas, drawSheet.left, drawSheet.top);
            if (this.prevPage && (drawSheet.hole == this.prevPage.targetHole) && !this.prevPage.removing) {
                this.prevPage.targetSheet = drawSheet;
            }
            drawSheet.delete();
            if (!this.drawSheets.length && !this.holes.length) {
                this.drawComplete = true;
            }
            if (this.prevPage) {
                this.prevPage.element.classList.add("nextPageDrawing");
            }
        }
    ,   trim: function() {
            const rotatedContext = this.display.trimContext;
            rotatedContext.canvas.style.width = `${this.canvas.height}px`;
            rotatedContext.canvas.width = rotatedContext.canvas.clientWidth;
            rotatedContext.canvas.style.height = `${this.canvas.width}px`;
            rotatedContext.canvas.height = rotatedContext.canvas.clientHeight;
            rotatedContext.clearRect(0, 0, rotatedContext.canvas.width, rotatedContext.canvas.height);
            rotatedContext.rotate(Math.PI/-2);
            rotatedContext.drawImage(this.canvas, -1 * rotatedContext.canvas.height, 0);
            rotatedContext.setTransform(1, 0, 0, 1, 0, 0);
            let x = 0
            ,   y = 0
            ,   width = this.canvas.width
            ,   height = this.canvas.height
            ,   trimmed = false;
            for (let side = 0; side < 4; side++) {
                const imageData = (side == 0) ? this.context.getImageData(0, 0, this.canvas.width, -1 * this.x) :
                    (side == 1) ? rotatedContext.getImageData(0, 0, this.canvas.height, this.y + this.canvas.width) :
                    (side == 2) ? this.context.getImageData(0, this.canvas.height, this.canvas.width, -1 * (this.y + this.canvas.height)) :
                    rotatedContext.getImageData(0, this.canvas.width, this.canvas.height, this.x)
                const pixels = new Uint32Array((side < 2) ? imageData.data.buffer : imageData.data.reverse().buffer)
                const firstIndex = pixels.findIndex(pixel => pixel)
                ,   firstRow = Math.floor(firstIndex/imageData.width)
                if (firstRow) {
                    trimmed = true;
                    if (side % 2) {
                        width -= firstRow;
                        if (side == 3) { x += firstRow }
                    } else {
                        height -= firstRow;
                        if (side == 0) { y += firstRow }
                    }
                }
            }
            if (trimmed) {
                this.resize(width, height, x, y)
            }
        }
    }
    Picture.prototype = {
        // checkLoadCount: function() {
        //     this.display.minPicturesLoaded = (!navigator.onLine || (this.display.pictures.filter(picture => picture.loaded && picture.remote).length > minContentCount)) && (this.display.pictures.filter(picture => picture.loaded && !picture.remote).length > minLocalCount);
        // }
        delete: function() {
            this.element.parentNode?.removeChild(this.element);
            const pictureIndex = this.display.pictures.findIndex(picture => picture.id == this.id);
            // if (pictureIndex > -1) { delete this.display.pictures[pictureIndex]; console.log(`${Date.now} deleted picture ${pictureIndex}`); }
            if (pictureIndex > -1) this.display.pictures.splice(pictureIndex, 1);
            // this.checkLoadCount();
        }
    ,   initialize: function(url, imageinfo, categories) {
            if (this.remote) {
                this.element.crossOrigin = "anonymous";
                this.element.src = url;
                this.categories = categories;
            } else {
                this.element.src = `${imageDir}${pageLinks[this.display.localPicId++].split('.', 1)}.jpg`;
                this.display.localPicId %= pageLinks.length;
            }
            return this;
        }
    ,   load: function() {
            this.loaded = true;
            this.height = this.element.height;
            this.width = this.element.width;
            this.area = this.width * this.height;
            // this.checkLoadCount();
        }
    }
    return new Display();
}
function initialize() {
    displayRoot.addEventListener("click", e => {
        if (e.target.classList.contains("papers")) {
            display.pages[e.target.getAttribute("page-id")].remove();
            display.shiftColors();
        }
    }, false);
    displayRoot.addEventListener("transitionend", e => {
        if (e.propertyName == "transform") {
            if (e.target.classList.contains("folds")) {
                display.pages[e.target.getAttribute("page-id")].currentFold.complete = true;
            } else if (e.target.classList.contains("pages")) {
                display.pages[e.target.getAttribute("data-id")].moveComplete = true;
            }
        } else if (e.propertyName == "opacity") {
            if (e.target.classList.contains("pages")) {
                display.pages[e.target.getAttribute("data-id")].delete(true);
            } else if (e.target.classList.contains("drawSheets")) {
                display.pages[e.target.getAttribute("page-id")].transferDrawing(e.target.getAttribute("data-id"));
            }
        }
    }, false);
}
function animationLoop(ts) {
    const interval = ts - priorTimestamp;
    if (interval < 100) {
        if (display) {
            // if (!display.minPicturesLoaded) {
            display.loadRawPictures();
            display.loadLocalPictures();
            // }
            if (display.titleWords) {
                display.pages.forEach(page => {
                    if (page.merging) {
                        //
                    } else if (page.removing || (page.moveComplete && page.foldsComplete)) {
                        page.merge();
                    } else if (page.foldsComplete) {
                        //
                    } else if (page.allowFold) {
                        if (!page.currentFold) {
                            page.addFold();
                        } else if (page.currentFold.complete) {
                            page.currentFold.merge();
                        }
                    } else if (page.drawComplete && !page.prevPage) {
                        page.allowFold = true;
                        page.nextPage.allowDraw = true;
                    } else if (page.allowDraw) {
                        page.draw();
                    }
                })
            }
        } else {
            display = createDisplay().initialize();
        }
    }
    priorTimestamp = ts;
	animationId = window.requestAnimationFrame(animationLoop);
}
initialize();
})();
