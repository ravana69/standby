(function() {
"use strict";

const displayRoot = document.querySelector("#displayRoot");
let animationId = null
,   display = null
,   cellCount = 0
;
window.onload = function() {
    animationId = window.requestAnimationFrame(animationLoop);
}
window.onresize = function() {
    if (!display.resizing) {
        window.cancelAnimationFrame(animationId);
        display.resizing = true;
        display.delete();
        animationId = window.requestAnimationFrame(animationLoop);
    }
}
function createDisplay() {
    const Display = function() {
            this.element = displayRoot;
            this.height = this.element.clientHeight;
            this.width = this.element.clientWidth;
            this.walls = [];
            while (this.walls.length < 2) { this.walls.push(new Wall(this)); };
            this.title = new Title(this);
            this.loadedLinks = [];
        }
    ,   Cell = function(display, row, column) {
            this.display = display;
            this.id = cellCount++;
            this.row = row;
            this.column = column;
            this.leftWall = (this.column < (this.display.columns/2));
            this.x = (this.column % (this.display.columns/2)) * this.display.maxImageWidth;
            this.y = this.display.margin + (this.row * this.display.maxImageHeight);
        }
    ,   Link = function(display, href) {
            this.display = display;
            this.id = this.display.links.length;
            this.href = href;
            [this.hrefRoot] = this.href.split('.', 1);
            this.sides = [];
            while (this.sides.length < 2) { this.sides.push(new LinkSide(this)); }
            this.cellWidth = 1;
        }
    ,   LinkSide = function(link) {
            this.link = link;
            const isLeft = !this.link.sides.length;
            if (isLeft) {
                this.element = this.link.display.walls[0].element.appendChild(document.querySelector("#linkRoot").cloneNode(true));
            } else {
                this.element = this.link.display.walls[1].element.appendChild(this.link.sides[0].element.cloneNode(true));
            }
            const suffix = isLeft ? "L" : "R";
            this.element.id = "linkFrame" + this.link.id + suffix;
            this.element.setAttribute("data-id", this.link.id);
            this.frame = this.element.querySelector(".links");
            this.frame.id = "link" + this.link.id + suffix;
            this.jpg = this.frame.querySelector(".jpgs");
            this.jpg.id = "jpg" + this.link.id + suffix;
            this.gif = this.frame.querySelector(".gifs");
            this.gif.id = "gif" + this.link.id + suffix;
            if (isLeft) {
                this.frame.href = this.link.href;
                this.frame.style.setProperty("--linkScale", `scale(${0.7 + (Math.random() * 0.2)})`);
                this.jpg.setAttribute("data-id", this.link.id);
                this.jpg.addEventListener("load", event => {
                    const link = display.links[event.target.getAttribute("data-id")];
                    link.jpgLoaded = true;
                    link.revealJpg();
                }, false);
                this.jpg.src = "img/" + this.link.hrefRoot + ".jpg";
                this.gif.setAttribute("data-id", this.link.id);
                this.gif.addEventListener("load", event => {
                    display.links[event.target.getAttribute("data-id")].gifLoaded = true;
                }, false);
            }
            this.x = this.y = 0;
        }
    ,   Slot = function(display, cells) {
            this.display = display;
            this.id = this.display.slots.length;
            this.cells = cells.slice(0);
            this.firstCell = this.cells[0];
            this.horizontal = (this.firstCell.y == this.cells[this.cells.length - 1].y);
            this.forward = (this.horizontal && this.firstCell.leftWall) || (!this.horizontal && !this.firstCell.row)
            this.fullyVisible = this.firstCell.row && (this.firstCell.row < (this.display.rows - 1));
        }
    ,   Title = function(display) {
            this.display = display;
            this.id = 0;
            this.sides = [];
            while (this.sides.length < 2) { this.sides.push(new TitleSide(this)); }
        }
    ,   TitleSide = function(title) {
            this.title = title;
            const isLeft = !this.title.sides.length;
            this.element = this.title.display.walls[isLeft ? 0 : 1].element.querySelector(".titles");
            this.element.id = `title${isLeft ? "Left" : "Right"}` ;
            this.x = this.y = 0;
        }
    ,   Wall = function(display) {
            this.display = display;
            this.left = !this.display.walls.length;
            this.element = this.display.element.appendChild(document.querySelector("#wallRoot").cloneNode(true));
            this.background = this.element.querySelector(".wallBackgrounds");
            this.nullLogo = this.background.appendChild(document.querySelector("#nullLogo").cloneNode(false))
            if (this.left) {
                this.element.id = "wallLeft";
                this.background.id = "backgroundLeft";
                this.nullLogo.id = "nullLogoLeft";
                this.element.style.transformOrigin = "left";
            } else {
                this.element.id = "wallRight";
                this.background.id = "backgroundRight";
                this.nullLogo.id = "nullLogoRight";
                this.element.style.transformOrigin = "right";
            }
        }
    ;
    Display.prototype = {
        assignGifs: function() {
            this.links.forEach(link => {
                link.sides[0].gif.src = link.sides[1].gif.src = "gif/" + link.hrefRoot + ".gif";
            })
        }
    ,   assignLink: function() {
            const links = this.links.filter(link => link.jpgLoaded && !link.loaded && !link.moving);
            if (links.length) {
                links[Math.floor(links.length * Math.random())].assign();
            }
            this.delayIntro = true;
            setTimeout(display => {
                display.delayIntro = false;
            }, (200 + (200 * Math.random())), this);
        }
    ,   delete: function() {
            this.element.style.opacity = 0;
            this.walls.forEach(wall => {
                this.element.removeChild(wall.element);
            })
            display = null;
        }
    ,   drawGif: function() {
            const gifs = this.links.filter(link => link.gifLoaded && !link.displayJpg);
            if (gifs.length < this.concurrentGifs) {
                const jpgs = this.links.filter(link => link.displayJpg);
                jpgs[Math.floor(jpgs.length * Math.random())].revealGif();
            } else {
                gifs[Math.floor(gifs.length * Math.random())].revealJpg();
            }
            this.delayGif = true;
            setTimeout(display => {
                display.delayGif = false;
            }, (500 + (500 * Math.random())), this);
        }
    ,   initialize: function() {
            const thumbnailRatio = 1200/630
            ,   minimumEmpties = 6;
            this.links = [];
            pageLinks.reverse().forEach(link => {
                this.links.push(new Link(this, link));
            });
            this.concurrentGifs = Math.floor(this.links.length/3);
            this.columns =
                2 * Math.ceil(this.width/Math.sqrt(thumbnailRatio * (2 * this.height * this.width)/this.links.length));
            let increment = 0;
            do {
                this.columns += increment;
                this.maxImageWidth = Math.floor(2 * this.width/this.columns);
                this.maxImageHeight = Math.ceil(this.maxImageWidth/thumbnailRatio);
                this.rows = Math.ceil(this.height/this.maxImageHeight);
                increment = 2;
            } while (this.links.length > ((this.columns * this.rows) - minimumEmpties))
            this.element.style.setProperty("--linkWidth", `${this.maxImageWidth}px`);
            this.element.style.setProperty("--linkHeight", `${this.maxImageHeight}px`);
            this.wallHeight = Math.max(1.2 * this.height, this.rows * this.maxImageHeight);
            this.margin = (this.wallHeight - (this.rows * this.maxImageHeight))/2;
            this.element.style.setProperty("--wallsHeight", `${this.wallHeight}px`);
            this.hue = Math.random() * 360;
            this.saturation = 50;
            this.luminosity = 40;
            this.element.style.backgroundColor = `hsl(${this.hue}, ${this.saturation}%, ${this.luminosity}%)`;
            this.setSkew();
            this.walls.forEach(wall => wall.initialize());
            this.element.style.opacity = 1;
            this.slots = [];
            const columns = [];
            for (let row = 0; row < this.rows; row++) {
                const rows = [];
                for (let column = 0; column < this.columns; column++) {
                    const cell = new Cell(this, row, column);
                    rows[column] = cell;
                    if (row) {
                        columns[column][row] = cell;
                    } else {
                        columns[column] = [cell];
                    }
                }
                this.slots.push(new Slot(this, rows));
                this.slots.push(new Slot(this, rows.reverse()));
            }
            columns.forEach(column => {
                this.slots.push(new Slot(this, column));
                this.slots.push(new Slot(this, column.reverse()));
            })
            this.element.style.setProperty("--titleColor", `hsl(${this.hue + 120}, ${this.saturation}%, ${this.luminosity + 55}%)`);
            this.element.style.setProperty("--titleFontSize", `${0.8 * this.maxImageHeight}px`);
            this.title.cellWidth = Math.ceil(this.title.sides[0].element.clientWidth/this.maxImageWidth);
            this.element.style.setProperty("--titlePadding", `${Math.floor((this.title.sides[0].element.clientWidth - (this.title.cellWidth * this.maxImageWidth))/2)}px`);
            return this;
        }
    ,   setSkew: function() {
            this.edgeX = 0.3 + (0.4 * Math.random());
            this.edgeYOffset = (this.edgeYOffset ? Math.sign(this.edgeYOffset) : ((Math.random() < 0.5) ? -1 : 1)) * Math.min(this.wallHeight - this.height, (this.height * (0.1 + (0.1 * Math.random()))));
        }
    ,   shuffle: function() {
            let minDelay = 2000
            if (this.extendDelay) {
                this.extendDelay = false;
            } else {
                shuffleLoop: for (let i = 0; i < this.concurrentGifs; i++) {
                    let objectIndex = null
                    ,   targetIndex = null;
                    const slot = shuffle(this.slots.slice()).find(slot => slot.cells.slice(0, slot.cells.length - 1).some((cell, index) => {
                        if (cell.assigned && !cell.assigned.moving && (!(cell.assigned instanceof Title) || slot.horizontal) && !slot.cells[index + 1].assigned && !slot.cells[index + 1].pathway) {
                            const availableCell = slot.availableCell(index + 1);
                            if (availableCell) {
                                return ((objectIndex = index, targetIndex = slot.cells.indexOf(availableCell)), true);
                            }
                        } }));
                    if (slot) {
                        slot.load(slot.cells[objectIndex].assigned, ...slot.cells.slice(objectIndex + 1, targetIndex + 1))
                    } else {
                        break shuffleLoop;
                    }
                }
                minDelay = 5000;
            }
            this.delayShuffle = true;
            setTimeout(display => {
                display.delayShuffle = false;
            }, (minDelay * (1 + Math.random())), this);
        }
    }
    Link.prototype = {
        assign: function() {
            const available = this.display.slots.map(slot => { return {slot: slot, cell: slot.availableCell()}; }).filter(slot => slot.cell && (!(this instanceof Title) || slot.slot.fullyVisible))
            if (available.length) {
                const index = Math.floor(available.length * Math.random())
                ,   slot = available[index].slot
                ,   targetIndex = slot.cells.indexOf(available[index].cell)
                ,   cells = slot.cells.slice(0, targetIndex + 1);
                slot.load(this, ...cells);
            }
        }
    ,   revealGif: function() {
            this.displayJpg = false;
            this.sides.forEach(side => { side.gif.classList.add("reveal"); })
        }
    ,   revealJpg: function() {
            this.displayJpg = true;
            this.sides.forEach(side => { side.gif.classList.remove("reveal"); })

        }
    }
    Slot.prototype = {
        availableCell: function(startIndex = 0) {
            const cell = this.cells.slice(startIndex).find((cell, index, array) => cell.pathway || cell.assigned || (index == (array.length - 1)) || array[index + 1].assigned);
            if (!cell || cell.assigned || cell.pathway) {
                return null;
            } else {
                return cell;
            }
        }
    ,   load: function(object, ...cells) {
            const velocity = 400 + (200 * Math.random())
            let distance = 0
            ,   duration = 0
            ,   margin = 0;
            object.sides.forEach((side, index) => {
                if (this.horizontal) {
                    if (!object.loaded) {
                        side.element.style.top = `${this.firstCell.y}px`;
                        side.element.style[this.forward ? "right" : "left"] = `${100 + (this.forward == index ? 100 : 0)}%`;
                    }
                    distance = (this.forward ? 1 : -1) * cells.length * this.display.maxImageWidth;
                    side.x += distance;
                } else {
                    if (!object.loaded) {
                        const offset = (index == this.firstCell.leftWall) ? ((index ? -1 : 1) * this.display.width) : 0;
                        side.element.style.left = `${this.firstCell.x + offset}px`;
                        side.element.style[this.forward ? "bottom" : "top"] = "100%";
                        margin = this.display.margin;
                    }
                    distance = (this.forward ? 1 : -1) * ((cells.length * this.display.maxImageHeight) + margin);
                    side.y += distance;
                }
                duration = Math.abs(distance/velocity);
                side.element.style.transition = `transform ${duration}s ease-in-out`;
                setTimeout((distance, side) => {
                    side.element.style.visibility = "visible";
                    side.element.style.transform = `translate(${side.x}px, ${side.y}px)`;
                }, 0, distance, side);
            })
            if (object.loaded) {
                this.cells.filter(cell => cell.assigned && (object.id == cell.assigned.id) && (object instanceof Title == cell.assigned instanceof Title)).forEach(cell => { cell.assigned = null; });
            } else if (object instanceof Title) {
                object.slot = this;
            }
            cells.forEach((cell, index) => {
                if (index < (cells.length - object.cellWidth)) {
                    cell.pathway = true;
                    if (cell.pathway) {
                        setTimeout(cell => {
                            cell.pathway = false;
                        }, 1000 * (index + object.cellWidth + 1) * duration/cells.length, cell);
                    }
                }
            });
            const endIndex = this.cells.indexOf(cells[cells.length - 1]) + 1
            ,   startIndex = endIndex - object.cellWidth;
            this.cells.slice(startIndex, endIndex).forEach(cell => { cell.assigned = object; });
            object.moving = true;
        }
    }
    Title.prototype = Object.create(Link.prototype);
    Title.prototype.constructor = Title;
    Wall.prototype = {
        initialize: function() {
            this.element.style[(this.display.edgeYOffset > 0) ? "bottom" : "top"] = 0;
            if (this.left) {
                this.nullLogo.style.left = "100%";
            }
            this.element.style.transform = `scale(0.5, 1)`;
            this.element.style.background = `linear-gradient(0.25turn, hsl(${this.display.hue}, ${this.display.saturation}%, ${this.display.luminosity}%), hsl(${this.display.hue}, ${this.display.saturation}%, ${this.display.luminosity + 10}%))`
            this.background.style.background = `hsl(${this.display.hue}, ${this.display.saturation}%, ${this.display.luminosity}%)`
        }
    ,   skew: function() {
            this.background.style.opacity = 0;
            if (this.left) {
                this.element.style.transform = `skew(0, ${Math.atan2(this.display.edgeYOffset/this.display.edgeX, this.display.width)}rad) scale(${this.display.edgeX}, 1)`;
            } else {
                this.element.style.transform = `skew(0, ${Math.atan2(-1 * this.display.edgeYOffset/(1 - this.display.edgeX), this.display.width)}rad) scale(${1 - this.display.edgeX}, 1)`;
            }
        }
    }
    return new Display();
}
function initialize() {
    displayRoot.addEventListener("click", function(e) {
        if (e.target.classList.contains("titles")) {
            display.setSkew();
            display.walls.forEach(wall => wall.skew());
        }
    }, false);
    displayRoot.addEventListener("mousemove", function(e) {
        display.extendDelay = true;
    }, false);
    displayRoot.addEventListener("transitionend", function(e) {
        if (e.propertyName == "transform") {
            const link = e.target.classList.contains("linkFrames") ? display.links[e.target.getAttribute("data-id")] : e.target.classList.contains("titles") ? display.title : null;
            if (link) {
                link.loaded = true;
                link.moving = false;
            }
        } else if (e.propertyName == "opacity") {
            if (e.target.id == "displayRoot") {
                display.revealed = (e.target.style.opacity == 1);
            } else if (e.target.classList.contains("wallBackgrounds") && !display.ready) {
                display.ready = true;
            }
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
    if (display) {
        if (display.loaded) {
            if (!display.delayGif) {
                display.drawGif();
            } else if (!display.delayShuffle) {
                display.shuffle();
            }
        } else if (display.ready) {
            if (!display.title.loaded && !display.title.moving) {
                display.title.assign();
            } else if (!display.delayIntro) {
                if (display.links.every(link => link.loaded)) {
                    display.assignGifs();
                    display.loaded = true;
                } else {
                    display.assignLink();
                }
            }
        } else if (display.revealed) {
            display.walls.forEach(wall => wall.skew());
        }
    } else {
        display = createDisplay().initialize();
    }
	animationId = window.requestAnimationFrame(animationLoop);
}
initialize();
})();
