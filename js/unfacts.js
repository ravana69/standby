(function() {
"use strict";

var animationId = null
,   canvasRoot = document.querySelector(".canvas")
,   priorTimestamp = 0
,   display = null
,   minSourceCount = 36
,   minContentCount = minSourceCount/2
,   fontWidthFactor = 0.7
;
window.onload = function() {
    display = createDisplay();
    display.axis.reset();
    display.advancePage();
    animationId = window.requestAnimationFrame(animationLoop);
}
window.onresize = function() {
    display.resize = true;
}
function createDisplay() {
    const imageRoot = document.querySelector("#imageRoot")
    ,   punctuation0 = "\\.|!|\\?"
    ,   punctuation1 = ",|;|\\:|\\s-+|\\s" + String.fromCharCode(8211) + "+"
    ,   articles = "an?|the"
    ,   pronouns = "s?he|its?|they|hi[ms]|hers?|ours?|theirs?|all|some|many|few|no|this|that|each|any|n?either"
    ,   conjunctions = "and|but|n?or|both|n?either|whether|after|although|before|because|besides|since|so|though"
    ,   auxiliary = "to|be(?:en)?|is|are|was|were|ha[sd]|have|that|did|can|could|will|would|shall|should|may|might|whom?|what|where|which|when|not|never|does|for|as|also|therefore|further|very|sometimes|often|already|later|\\w{3,}ly"
    ,   prepositions = "by|for|to|at|in(?:to|side)?|on|from|with(?:in|out)?|as|some|above|across|against|around|after|before|between|during|since|through(?:out)?|until|which|among|including|despite|towards|upon|of|concerning|about|like|over|under|along|following|behind|beyond"
    ,   verbs = "be(?:en)?|is|are|was|were|ha[sd]|have|comes?|came|went|know[ns]?|knew|becomes?|became|makes?|made|give[ns]?|gave|take[ns]?|took|holds?|held|draw[ns]?|drew|finds?|found|begins?|began|begun|receive[sd]?|use[sd]|include[sd]?|serve[sd]?|puts?|play(?:s|ed)?|won|wrote|buys?|bought|(\\w{3,}ed)(?=\\s(" + prepositions + ")\\s)|(be(?:en|ing)\\s\\w{3,}ed)"
    ,   punctuationPattern0 = new RegExp("(.+?(((" + punctuation1 + ")\\s+|$)|\\s+(?=\\()|\\)\\s+|\\s+(?=\\\")|\\S\\\"\\s+))", "g")
    ,   verbPattern = new RegExp("\\b(?:(" + conjunctions + ")\\s)?((?:(?:" + auxiliary + ")\\s)*)(" + verbs + ")\\b", "i")
    ,   clausePattern = new RegExp("\\b(?:(" + conjunctions + ")|(" + prepositions + "))\\b", "i")
    ,   punctuationPattern1 = new RegExp("((?:(?:" + punctuation0 + ")\\s$)|(?:(?:" + punctuation1 + "|\\)|\\\")\\s))", "g")
    ,   predicatePattern = new RegExp("^(?:(?:" + auxiliary + ")\\s)*(?:(?:(" + articles + ")|(" + pronouns + ")|([A-Z]\\S+)|(\\w{3,}ing)|(\\w{3,}ly)|(\\w{3,}ed)|(\\w{3,}s)|([0-9]\\S+))\\b)")
    ,   unmatched = "^[^\\(]+\\)|\\([^\\)]+$|^\\\"[^\\\"]+$|^[^\\\"].+\\\""
    ,   badCharPattern = new RegExp("[\\{\\}\\[\\]\\=<>]|\\w{2,}\\.\\s[A-Z]|.\\(|\\).*\\w|" + unmatched + "")
    ,   pausePattern = new RegExp("(" + punctuation1 + ")\\s+$")
    ,   stopPattern = new RegExp("(" + punctuation0 + ")\\s+$")
    ,   opacityDuration = 500
    ,   lineHeightMultiplier = 1.2
    ,   minAvgMatchingClauses = 5
    ,   standardHues = [0, 30, 60, 120, 240, 270, 360]
    ,   qualityThreshhold = 3
    ;
    let articleCount = 0
    ,   imageCount = 0
    ,   clauseCount = 0
    ,   figureCount = 1
    ;
    let Display = function() {
            this.element = canvasRoot;
            this.loadCount = 0
            this.imageLoadCount = 0
            this.rawContent = [];
            this.popularPageids = savedPopularPageids;
            this.popularPageidsComplete = true;
            this.featuredPageids = savedFeaturedPageids;
            this.featuredPageidsComplete = true;
            this.manualSearches = [];
            this.marginWidth = 10;
            this.tasks = [];
            this.descriptions = [];
            this.captions = [];
            this.titleArticles = [];
            this.articles = [];
            this.clauses = [];
            this.clauseIndicies = [];
            this.categories = [];
            this.extraSentences = [];
            this.initialize();
        }
    ,   Article = function(display, rawContent, givenSentences) {
            let newSentence = null
            ,   firstSentence = null
            ,   maxSentenceCount = 3
            ;
            this.display = display;
            this.id = articleCount++;
            this.pageId = rawContent.pageid;
            this.title = rawContent.title;
            this.sentences = [];
            this.clausesAdded = 0;
            this.clausesReplaced = 0;
            this.matchPoolDepth = 0;
            givenSentences.forEach(function(sentence, index) {
                newSentence = new Sentence(this, sentence, index);
                if (!newSentence.invalid) {
                    newSentence.sortScore = newSentence.clauses.length ? (newSentence.matchPoolDepth/newSentence.clauses.length)  : 0;
                    if (newSentence.sortScore < qualityThreshhold) {
                        newSentence.recycleClauses();
                    } else {
                        if (!index) {
                            firstSentence = newSentence
                        } else {
                            this.sentences.push(newSentence);
                        }
                    }
                }
            }, this);
            if (firstSentence || this.sentences.length) {
                this.sentences.sort(function(a,b) { return b.sortScore - a.sortScore; });
                if (firstSentence) {
                    this.sentences.unshift(firstSentence)
                }
                this.display.extraSentences = this.display.extraSentences.concat(this.sentences.splice(maxSentenceCount))
                if ((this.sentences.length < maxSentenceCount) && this.display.extraSentences.length) {
                    this.display.extraSentences.sort(function(a,b) { return b.sortScore - a.sortScore; });
                    while ((this.sentences.length < maxSentenceCount) && this.display.extraSentences.length) {
                        this.sentences.push(this.display.extraSentences.shift());
                    }
                    this.display.extraSentences.splice(minContentCount).forEach(function(sentence) {
                        sentence.recycleClauses();
                    }, this);
                }
            }
        }
    ,   Axis = function(display) {
            this.display = display;
            this.element = document.querySelector("#axis");
            this.radius = 5000;
            this.rotationDuration = 0;
            this.regularRotation = 800;
            this.rotationDelay = 0;
            this.element.style.setProperty("--axisTransformOrigin", null);
            this.element.style.setProperty("--axisTransition", null);
            this.display.element.style.setProperty("--axisTransform", null);
        }
    ,   Clause = function(sentence, givenConjunction, givenPreposition, givenAuxiliary, givenVerb, givenPhrase0, givenPhrase1, givenPredicate) {
            const conjunction = givenConjunction ? givenConjunction.trim() : ""
            ,   preposition = givenPreposition ? givenPreposition.trim() : ""
            ,   auxiliary = givenAuxiliary ? givenAuxiliary.trim() : ""
            ,   verb = givenVerb ? givenVerb.trim() : ""
            ,   predicate = givenPredicate ? givenPredicate.trim() : ""
            ,   contentPreposition = givenVerb ? "" : preposition
            ;
            let match = null
            ,   punctuation = null
            ,   badChar = null
            ,   predicateType = null
            ,   multipleWords = null
            ;
            this.sentence = sentence;
            this.display = this.sentence.article.display;
            this.id = clauseCount++;
            this.index = this.sentence.clauses.length;
            this.content = (conjunction + " " + contentPreposition + " " + auxiliary + " " + verb + " " + predicate).replace(/\s+/g," ").trim() + " ";
            match = this.content.match(punctuationPattern1);
            punctuation = match ? match[match.length - 1].trim() : "";
            badChar = this.content.match(badCharPattern);
            if (this.index && predicate && !badChar) {
                match = predicate.match(predicatePattern);
                predicateType = match ? (match[1] || match[2] || (match[3] ? "proper" : null) || (match[4] ? "gerund" : null) || (match[5] ? "adverb" : null) || (match[6] ? "ed" : null) || (match[7] ? "s" : null) || (match[8] ? "number" : null) || "") : "";
                multipleWords = predicate.split(/(\s+)/).length > 1;
                if (multipleWords && (punctuation || (predicateType != ""))) {
                    this.key =
                    [   this.getIndexOf(0, conjunction)
                    ,   this.getIndexOf(1, preposition)
                    ,   this.getIndexOf(2, auxiliary ? auxiliary.split(/\s+/)[0] : auxiliary)
                    ,   this.getIndexOf(3, givenPhrase0 ? "phrase0" : (givenPhrase1 ? "phrase1" : verb))
                    ,   this.getIndexOf(4, predicateType)
                    ,   this.getIndexOf(5, punctuation)
                    ]
                }
            }
        }
    ,   Image = function(display) {
            this.display = display;
            this.id = imageCount++;
            this.element = imageRoot.parentNode.appendChild(imageRoot.cloneNode(false));
            this.element.id = "image" + this.id;
            this.element.crossOrigin = "anonymous";
            (function (image) {
                image.element.addEventListener("load", function(e) {
                    image.display.images.push(image);
                }, false);
            })(this);
        }
    ,   Page = function(display, otherPage) {
            this.display = display;
            if (otherPage) {
                this.otherPage = otherPage;
                this.id = this.otherPage.id + 1;
                this.element = this.otherPage.element.parentNode.appendChild(this.otherPage.element.cloneNode(true));
            } else {
                this.id = 0;
                this.element = this.display.axis.element.querySelector(".pages");
                this.otherPage = new Page(this.display, this);
            }
            this.element.id = "page" + this.id;
            this.background = new PageBackground(this);
            this.title = this.element.querySelector(".titles");
            this.name = this.element.querySelector(".names");
            this.description = this.element.querySelector(".descriptions");
            this.detail = this.element.querySelector(".details");
            this.paragraph = this.element.querySelector(".paragraphs");
            this.figure = this.element.querySelector(".figures");
            this.caption = this.element.querySelector(".captions");
            this.categories = this.element.querySelector(".categories");
            this.ready = true;
            this.complete = false;
            this.element.style.setProperty("--pageTransform", null);
            this.element.style.opacity = null;
            this.title.style.setProperty("--titleColor", null);
            this.title.style.setProperty("--titleTransition", null);
            this.title.style.opacity = null;
            this.name.style.setProperty("--nameTransition", null);
            this.name.style.opacity = null;
            this.description.style.setProperty("--descriptionTransition", null);
            this.description.style.opacity = null;
            this.detail.style.setProperty("--detailColor", null);
            this.detail.style.setProperty("--detailTransition", null);
            this.detail.classList.remove("revealed");
            this.detail.style.opacity = null;
            this.figure.style.setProperty("--figureDisplay", "none");
            this.figure.style.opacity = null;
            this.figure.parentNode.style.setProperty("--figureFloat", "left");
            this.figure.style.setProperty("--figureTransition", null);
            this.categories.style.setProperty("--categoryTransition", null);
            this.categories.style.opacity = null;
        }
    ,   PageBackground = function(page) {
            this.page = page;
            this.element = this.page.element.querySelector(".backgrounds");
            this.context = this.element.getContext('2d');
            this.element.style.setProperty("--backgroundLeft", null);
            this.element.style.setProperty("--backgroundTop", null);
            this.element.style.setProperty("--backgroundWidth", null);
            this.element.style.setProperty("--backgroundHeight", null);
            this.element.classList.remove("revealed");
        }
    ,   PageCategory = function(page) {
            this.page = page;
            this.prevCategory = this.page.lastCategory || null;
            if (this.prevCategory) {
                this.prevCategory.nextCategory = this;
                this.id = this.prevCategory.id + 1;
                this.element = this.prevCategory.element.parentNode.appendChild(this.prevCategory.element.cloneNode(false));
            } else {
                this.page.firstCategory = this;
                this.id = 0;
                this.element = this.page.element.querySelector(".categoryLinks");
            }
            this.page.lastCategory = this;
            this.element.classList.remove("revealed")
            this.element.style.setProperty("--categoryLinkTransition", null);
            this.element.style.opacity = null;
        }
    ,   PageClause = function(page) {
            this.page = page;
            this.prevClause = this.page.lastClause || null;
            if (this.prevClause) {
                this.prevClause.nextClause = this;
                this.id = this.prevClause.id + 1;
                this.element = this.prevClause.element.parentNode.appendChild(this.prevClause.element.cloneNode(false));
            } else {
                this.page.firstClause = this;
                this.id = 0;
                this.element = this.page.element.querySelector(".clauses");
            }
            this.page.lastClause = this;
            this.element.style.setProperty("--clauseTransition", null);
            this.element.style.setProperty("--clauseColor", null);
            this.element.style.opacity = null;
        }
    ,   Sentence = function(article, sentence, index) {
            let matches = []
            ,   splits0 = []
            ,   splits1 = []
            ,   lastMatch = false
            ;
            this.article = article;
            this.display = this.article.display;
            this.index = index;
            this.clauses = [];
            this.clausesAdded = 0;
            this.clausesReplaced = 0;
            this.matchPoolDepth = 0;
            matches = sentence.match(punctuationPattern0);
            matches.forEach(function(match, matchIndex) {
                if (match.match(badCharPattern)) {
                    this.invalid = true;
                }
                lastMatch = (matchIndex == (matches.length - 1))
                splits0 = match.split(verbPattern);
                for (let i = 0, index0 = 6, parts0 = []; i < splits0.length; i++) {
                    parts0[index0] = splits0[i];
                    if (index0 == 6) {
                        if (parts0[6]) {
                            splits1 = parts0[6].split(clausePattern);
                            parts0[6] = splits1[0];
                        }
                        if (parts0[2] || parts0[6]) {
                            this.clauses.push(new Clause(this, parts0[0], parts0[4], parts0[1], parts0[2], parts0[3], parts0[5], parts0[6]).swap());
                        }
                        for (let j = 1, index1 = 0, parts1 = []; j < splits1.length; j++) {
                            parts1[index1] = splits1[j];
                            if (index1 == 2) {
                                this.clauses.push(new Clause(this, parts1[0], parts1[1], null, null, null, null, parts1[2]).swap());
                            }
                            index1 = (index1 + 1) % 3;
                        }
                        splits1 = [];
                    }
                    index0 = (index0 + 1) % 7;
                }
            }, this);
        }
    ,   Shadow = function(display) {
            let gradient = null
            ,   centerX = 0
            ,   centerY = 0
            ;
            this.display = display;
            this.element = document.querySelector("#shadow");
            this.element.style.width = this.element.style.height = Math.sqrt(Math.pow(display.width, 2) + Math.pow(display.height, 2)) + "px";
            this.element.width = this.element.clientWidth;
            this.element.height = this.element.clientHeight;
            this.context = this.element.getContext('2d');
            this.context.font = Math.round(Math.max(display.width, display.height)) + "px Times New Roman, Times, serif";
            this.context.textBaseline = "middle";
            this.context.textAlign = "center";
            for (let i = 0; i < 10; i++) {
                this.context.setTransform(1,0,0,1,0,0);
                this.context.translate(this.element.width * Math.random(), this.element.height * Math.random());
                this.context.rotate(2 * Math.PI * Math.random());
                this.context.fillStyle = "hsla(" + (360 * Math.random()) + ", 15%, 50%, " + (0.2 + (0.3 * Math.random())) + ")"
                this.context.fillText(String.fromCharCode(0x3400 + Math.floor(Math.random() * 0x19b5)), 0, 0);
            }
            this.context.setTransform(1,0,0,1,0,0);
            centerX = Math.round(this.element.width/(1.8 + (0.4 * Math.random())));
            centerY = Math.round(this.element.width/(1.8 + (0.4 * Math.random())));
            gradient = this.context.createRadialGradient(centerX, centerY, 0, centerX, centerY, this.element.width);
            gradient.addColorStop(0, "hsla(0, 0%, 0%, 0)");
            gradient.addColorStop(0.2, "hsla(0, 0%, 0%, 0)");
            gradient.addColorStop(0.6, "hsla(0, 0%, 0%, 1)");
            gradient.addColorStop(1, "hsla(0, 0%, 0%, 1)");
            this.context.globalCompositeOperation = "destination-in";
            this.context.fillStyle = gradient;
            this.context.fillRect(0, 0, this.element.width, this.element.height);
            this.element.style.setProperty("--shadowTransform", null);
            this.element.style.setProperty("--shadowTransition", null);
            this.element.classList.remove("revealed")
        }
    ,   Status = function(display) {
            this.display = display;
            this.element = document.querySelector("#status");
            this.logo = this.element.querySelector("#WikiLogo");
            this.description = this.element.querySelector("#statusDescription");
        }
    ,   Task = function(object, action, parameters) {
            this.object = object;
            this.action = action;
            this.parameters = parameters || null;
        }
    ;
    Display.prototype = {
        addImage: function() {
            let rawImage = null
            ,   imageinfo = null
            ,   loadingImage = null
            ,   url = null
            ;
            while (this.rawImages.length) {
                rawImage = this.rawImages.shift();
                imageinfo = rawImage.imageinfo ? rawImage.imageinfo[0] : rawImage
                url = imageinfo.thumburl || imageinfo.url || imageinfo.source;
                if (!url.match(/(logo|crest|map|flag|poster|cover|company|route|seal)/i)) {
                    loadingImage = new Image(this);
                    loadingImage.element.src = url;
                    loadingImage.height = imageinfo.thumbheight || imageinfo.height;
                    loadingImage.width = imageinfo.thumbwidth || imageinfo.width;
                    loadingImage.element.setAttribute("title",imageinfo.title || rawImage.title.match(/File:(.*)\..*/)[1]);
                    return;
                }
            }
        }
    ,   addTask: function(object, action, parameters) {
            this.tasks.push(new Task(object, action, parameters));
        }
    ,   advancePage: function() {
            this.currentPage.detail.classList.remove("revealed");
            this.currentPage = this.currentPage.otherPage;
            this.currentPage.reset();
            this.addTask(this.currentPage, this.currentPage.draw);
        }
    ,   clear: function() {
            let mainPage = this.currentPage.id ? this.currentPage.otherPage : this.currentPage
            ,   otherPage = mainPage.otherPage
            ,   figureImage = mainPage.figure.querySelector("img")
            ,   currentClause = mainPage.firstClause ? mainPage.firstClause.nextClause : null
            ,   currentCategory = mainPage.firstCategory ? mainPage.firstCategory.nextCategory : null
            ;
            mainPage.element.parentNode.removeChild(otherPage.element);
            if (figureImage) {
                mainPage.figure.removeChild(figureImage);
            }
            while (currentClause) {
                currentClause.element.parentNode.removeChild(currentClause.element);
                currentClause = currentClause.nextClause;
            }
            while (currentCategory) {
                currentCategory.element.parentNode.removeChild(currentCategory.element);
                currentCategory = currentCategory.nextCategory;
            }
            this.images.forEach(function(image) {
                image.element.parentNode.removeChild(image.element);
            });
            this.initialize();
        }
    ,   initialize: function() {
            this.width = this.element.clientWidth
            this.height = this.element.clientHeight
            this.element.style.setProperty("--pageWidth", this.width + "px");
            this.element.style.setProperty("--pageHeight", this.height + "px");
            this.maxImageHeight = Math.round(this.height/2);
            this.element.style.setProperty("--imgMaxHeight", this.maxImageHeight + "px");
            this.maxImageWidth = Math.min(this.width/2, this.maxImageHeight);
            this.rawImages = [];
            this.images = [];
            this.axis = new Axis(this);
            this.currentPage = new Page(this);
            this.shadow = new Shadow(this);
            this.status = new Status(this);
            this.element.classList.remove("freeze");
        }
    ,   load: function() {
            const xmlReader = new XMLHttpRequest() || new ActiveXObject('MSXML2.XMLHTTP')
            ,   contentQuery = "& prop=categories|info|pageimages|pageterms|revisions" + "& cllimit=max" + "& piprop=thumbnail& pilimit=max& pithumbsize=" + this.maxImageWidth + "& rvslots=main& rvprop=content& rvsection=0"
            ,   randomQuery = "& generator=random& grnnamespace=0& grnfilterredir=redirects& grnlimit=" + (minSourceCount/2)
            ,   searchQuery = "& generator=search& gsrnamespace=0& gsrwhat=text& gsrlimit=" + (minSourceCount/2)
            ;
            let query = "https://en.wikipedia.org/w/api.php?action=query" + "&format=json&formatversion=2&origin=*&redirects="
            ,   pageids = "& pageids="
            ,   random = Math.random()
            ,   searchTerm = null
            ;
            this.loading = true;
            if (this.manualSearches.length) {
                searchTerm = this.manualSearches.shift()
                query += contentQuery + searchQuery + "& gsrsearch=" + searchTerm;
                this.status.activate("Gathering text related to " + searchTerm);
            } else if (this.popularPageidsComplete && this.popularPageids.length && (random < 0.5)) {
                pageids += this.popularPageids.splice(Math.floor(this.popularPageids.length * Math.random()), 1)[0]
                for (let i = 1; i < Math.min(minSourceCount, this.popularPageids.length); i++) {
                    pageids += "|" + this.popularPageids.splice(Math.floor(this.popularPageids.length * Math.random()), 1)[0]
                }
                query += contentQuery + pageids;
                this.status.activate("Gathering popular text")
            } else if (this.featuredPageidsComplete && this.featuredPageids.length && (random < 0.9)) {
                pageids += this.featuredPageids.splice(Math.floor(this.featuredPageids.length * Math.random()), 1)[0]
                for (let i = 1; i < Math.min(minSourceCount, this.featuredPageids.length); i++) {
                    pageids += "|" + this.featuredPageids.splice(Math.floor(this.featuredPageids.length * Math.random()), 1)[0]
                }
                query += contentQuery + pageids;
                this.status.activate("Gathering featured text")
            } else {
                query += contentQuery + randomQuery;
                this.status.activate("Gathering random text")
            }
            xmlReader.open("get.html", query, true);
            xmlReader.setRequestHeader("Api-User-Agent","nullameragon.com/unfacts.html; nullameragon@gmail.com");
            xmlReader.onreadystatechange = function(e) {
                if (e.target.readyState == 4) {
                    display.rawContent = display.rawContent.concat(JSON.parse(e.target.responseText).query.pages);
                    display.loading = false;
                    display.loadCount++;
                    display.status.deactivate();
                }
            }
            xmlReader.send(null);
        }
    ,   loadImages: function() {
            const xmlReader = new XMLHttpRequest() || new ActiveXObject('MSXML2.XMLHTTP')
            ;
            let query = "https://en.wikipedia.org/w/api.php?action=query" + "&prop=imageinfo&iiprop=url|size&iiurlwidth=" + this.maxImageWidth + "&format=json&formatversion=2&origin=*&redirects=&generator=random&grnnamespace=6&grnlimit=" + minSourceCount;
            ;
            this.loading = true;
            this.status.activate("Gathering images");
            xmlReader.open("get.html", query, true);
            xmlReader.setRequestHeader("Api-User-Agent","nullameragon.com/unfacts.html; nullameragon@gmail.com");
            xmlReader.onreadystatechange = function(e) {
                if (e.target.readyState == 4) {
                    display.rawImages = display.rawImages.concat(JSON.parse(e.target.responseText).query.pages);
                    display.loading = false;
                    display.imageLoadCount++;
                    display.status.deactivate();
                }
            }
            xmlReader.send(null);
        }
    ,   loadPageids: function() {
            const xmlReader = new XMLHttpRequest() || new ActiveXObject('MSXML2.XMLHTTP')
            ,   popularPage = "Wikipedia%3ATop%5F5000%5Fpages" //"User%3AWest%2Eandrew%2Eg%2FPopular%5Fpages" "Wikipedia%3AVital%5Farticles" "Wikipedia%3AMain%5Fpage"
            ,   featuredPage = "Wikipedia%3AFeatured%5Farticles"
            ;//https://en.wikipedia.org/wiki/Wikipedia:Top_5000_pages https://en.wikipedia.org/wiki/Wikipedia:Featured_articles User:West.andrew.g/Popular_pages
            let query = "https://en.wikipedia.org/w/api.php?action=query" + "&format=json&formatversion=2&origin=*&redirects=" + "& indexpageids" + "& generator=links& gplnamespace=0& gpllimit=max& titles="
            ,   response = null
            ,   gplcontinuation = display.gplcontinue ? ("&gplcontinue=" + display.gplcontinue) : ""
            ;
            if (!this.popularPageids.length || (gplcontinuation && (this.currentPageid == "popular"))) {
                this.currentPageid = "popular";
                query += popularPage + gplcontinuation;
            } else if (!this.featuredPageids.length || (gplcontinuation && (this.currentPageid == "featured"))) {
                this.currentPageid = "featured";
                query += featuredPage + gplcontinuation;
            }
            this.loading = true;
            this.status.activate("Gathering " + this.currentPageid + " pageids")
            xmlReader.open("get.html", query, true);
            xmlReader.setRequestHeader("Api-User-Agent","nullameragon.com/unfacts.html; nullameragon@gmail.com");
            xmlReader.onreadystatechange = function(e) {
                if (e.target.readyState == 4) {
                    response = JSON.parse(e.target.responseText);
                    if (display.currentPageid == "popular") {
                        display.popularPageids = display.popularPageids.concat(response.query.pageids);
                    } else {
                        display.featuredPageids = display.featuredPageids.concat(response.query.pageids);
                    }
                    if (response.continue) {
                        display.gplcontinue = response.continue.gplcontinue;
                    } else {
                        display.gplcontinue = null;
                        if (display.currentPageid == "popular") {
                            display.popularPageidsComplete = true;
                        } else {
                            display.featuredPageidsComplete = true;
                            display.currentPageid = null;
                        }
                    }
                    display.loading = false;
                    display.loadCount++;
                    display.status.deactivate();
                }
            }
            xmlReader.send(null);
        }
    ,   parseContent: function() {
            let rawContent = ""
            ,   text = ""
            ,   sentences = ""
            ,   matches = ""
            ,   position = 0
            ,   singular = false
            ,   prevMatch = ""
            ,   article = null
            ,   maxListCount = 3 * minContentCount
            ;
            while (this.rawContent.length) {
                rawContent = this.rawContent.splice(Math.floor(this.rawContent.length * Math.random()), 1)[0];
                if (rawContent.thumbnail && (this.rawImages.length < minSourceCount)) {
                    rawContent.thumbnail.title = rawContent.title;
                    this.rawImages.push(rawContent.thumbnail);
                }
                if ((rawContent.ns == 0) && (!rawContent.title.match(/^(List|Category:)/))) {
                    if (rawContent.revisions && (rawContent.revisions[0].slots.main.contentformat == "text/x-wiki")) {
                        rawContent.revisions[0].slots.main.content.split(/\n/).forEach(function(line) {
                            line = line.replace(/<(\w+)(\s|>).*?(\/>|<\/\1>)/g, "")
                                .replace(/\(?\{\{IPA.*?\}\}\)?/g, "")
                                .replace(/\{\{[^\}]*?\}\}\)?$/, "")
                                .replace(/<\!--.*?-->/g, "");
                            if (line.match(/^\s*[^\s\|\*\{].*?\.\s*$/)) {
                                line = line.replace(/\{\{convert\|([^\|\}]+)\|([^\|\}]+).*?\}\}/g, "$1 $2")
                                    .replace(/\{\{(fact|citation).*?\}\}/gi, "")
                                    .replace(/\{\{.*?\|?([^\|\}]+)\}\}/g, "$1")
                                    .replace(/'{2,5}/g, "")
                                    .replace(/(&|\{\{spaced\s)\wdash(;|\}\})/g, "-")
                                    .replace(/&nbsp;/g, " ")
                                    .replace(/\s+/g, " ")
                                    .replace(/\[\[.*?\|?([^\|\]]+)?\]\]/g, "$1")
                                    .replace(/\[.*?\]/g, "");
                                text = (text + " " + line).trim();
                            }
                        }, this);
                        if (text.length) {
                            sentences = text.match(/[A-Z].*?[aeiou\d]\S*?[^A-Z][\.!\?]+\"?(?=\s+[A-Z][^\.]|$)/g);
                            if (sentences) {
                                article = new Article(this, rawContent, sentences);
                                if (article.sentences.length) {
                                    article.sentences.forEach(function(sentence, index) {
                                        sentence.fullSentence = "";
                                        sentence.clauses.forEach(function(clause) {
                                            sentence.fullSentence += clause.content || "";
                                        }, this);
                                    }, this);
                                    this.articles.push(article);
                                    this.articles.sort(function(a,b) { return a.sentences[0].sortScore - b.sentences[0].sortScore; });
                                } else {
                                    this.titleArticles.push(article);
                                    if (this.titleArticles.length > maxListCount) {
                                        this.titlesToDelete = minContentCount;
                                    }
                                }
                            }
                        }
                    }
                    if (rawContent.terms) {
                        if (rawContent.terms.description && !rawContent.terms.description[0].match(/^wiki|^year|^date|^century/i)) {
                            this.descriptions.push(rawContent.terms.description[0]);
                        }
                        if (rawContent.terms.label) {
                            this.captions.push(rawContent.terms.label[0]);
                        }
                    }
                    if (rawContent.categories && (this.categories.length < (3 * maxListCount))) {
                        rawContent.categories.forEach(function(category) {
                            if ((category.title.length < 40) && !category.title.match(/Category:(all|articles|CS1|\d{4}|disambiguation|Use)|pages|.*(wiki|webarchive)/i)) {
                                this.categories.push(category.title.match(/Category:(.*)/)[1]);
                            }
                        }, this);
                    }
                    return;
                }
            }
        }
        // -- Temp --------------------------------------------------------------------------------------------
    ,   printClauses: function() {
            this.clauses.forEach(function(clause0, index0) {
                console.log(index0 + ": " + this.clauseIndicies[0][index0]);
                clause0.forEach(function(clause1, index1) {
                    console.log("   " + index1 + ": " + this.clauseIndicies[1][index1]);
                    clause1.forEach(function(clause2, index2) {
                        console.log("      " + index2 + ": " + this.clauseIndicies[2][index2]);
                        clause2.forEach(function(clause3, index3) {
                            console.log("         " + index3 + ": " + this.clauseIndicies[3][index3]);
                            clause3.forEach(function(clause4, index4) {
                                console.log("            " + index4 + ": " + this.clauseIndicies[4][index4]);
                                clause4.forEach(function(clause5, index5) {
                                    console.log("              " + index5 + ": " + this.clauseIndicies[5][index5] + "(" + clause5.length + ")");
                                    clause5.forEach(function(clause6, index6) {
                                        console.log("                   " + clause6.id + "-" + clause6.content);
                                    }, this);
                                }, this);
                            }, this);
                        }, this);
                    }, this);
                }, this);
            }, this);
        }
        // ----------------------------------------------------------------------------------------------
    ,   revealBackgrounds: function() {
            this.currentPage.background.element.classList.add("revealed");
            this.currentPage.otherPage.background.element.classList.add("revealed");
        }
    }
    Axis.prototype = {
        reset: function() {
            const random = Math.random()
            ;
            let axisSide = 0
            ,   axisLength = 0
            ,   sideLength = 0
            ,   nearBorder = 0
            ,   farBorder = 0
            ,   sideBorder = 0
            ;
            this.position = (random < 0.25) ? "top" : (random < 0.5) ? "bottom" : (random < 0.75) ? "left" : "right";
            this.clockwise = Math.random() < 0.5;
            this.hue = 360 * Math.random();
            if ((this.position == "left") || (this.position == "right")) {
                this.y = Math.ceil(this.display.height/2);
                axisSide = this.y;
                axisLength = this.radius + this.display.width;
                if (this.position == "left") {
                    this.x = -1 * this.radius;
                } else {
                    this.x = this.display.width + this.radius;
                }
            } else {
                this.x = Math.ceil(this.display.width/2);
                axisSide = this.x;
                axisLength = this.radius + this.display.height;
                if (this.position == "top") {
                    this.y = -1 * this.radius;
                } else {
                    this.y = this.display.height + this.radius;
                }
            }
            this.element.style.setProperty("--axisTransformOrigin", this.x + "px " + this.y + "px");
            sideLength = axisSide + this.display.marginWidth;
            nearBorder = Math.ceil(Math.sqrt(Math.pow(sideLength, 2) + Math.pow(axisLength, 2))) - axisLength;
            farBorder = Math.ceil(this.radius - (Math.pow(this.radius, 2)/Math.sqrt(Math.pow(this.radius, 2) + Math.pow(sideLength, 2))));
            sideBorder = Math.ceil(((axisLength * sideLength)/this.radius) - axisSide) + this.display.marginWidth;
            if ((this.position == "left") || (this.position == "right")) {
                this.rotationIncrement = (this.clockwise ? 2 : -2) * Math.atan((this.y + this.display.marginWidth)/this.radius);
                this.borderTop = this.borderBottom = sideBorder;
                if (this.position == "right") {
                    this.borderLeft = nearBorder;
                    this.borderRight = farBorder;
                } else {
                    this.borderLeft = farBorder;
                    this.borderRight = nearBorder;
                }
            } else {
                this.rotationIncrement = (this.clockwise ? 2 : -2) * Math.atan((this.x + this.display.marginWidth)/this.radius);
                this.borderLeft = this.borderRight = sideBorder;
                if (this.position == "top") {
                    this.borderTop = nearBorder;
                    this.borderBottom = farBorder;
                } else {
                    this.borderTop = farBorder;
                    this.borderBottom = nearBorder;
                }
            }
            this.display.shadow.rotate();
            this.display.currentPage.axisReset = this.display.currentPage.otherPage.axisReset = true;
        }
    }
    Clause.prototype = {
        getIndexOf: function(index, givenValue) {
            let value = givenValue ? givenValue.toLowerCase() : givenValue
            ,   indexOf = null
            ;
            if (this.display.clauseIndicies[index] && this.display.clauseIndicies[index].length) {
                indexOf = this.display.clauseIndicies[index].indexOf(value);
                if (indexOf >= 0) {
                    return indexOf;
                } else {
                    this.display.clauseIndicies[index].push(value);
                    return this.display.clauseIndicies[index].length - 1;
                }
            } else {
                this.display.clauseIndicies[index] = [value];
                return 0;
            }
        }
    ,   swap: function(forceSave) {
            let matchingClauses = this.display.clauses
            ;
            if (this.key) {
                for (let i = 0; i < this.key.length; i++) {
                    if (!matchingClauses[this.key[i]]) {
                        matchingClauses[this.key[i]] = [];
                    }
                    matchingClauses = matchingClauses[this.key[i]]
                }
                if (forceSave || this.sentence.invalid || this.sentence.article.invalid || ((matchingClauses.length > 1) && (matchingClauses[matchingClauses.length - 1].id != this.id))) {
                    if ((matchingClauses.length < minSourceCount) && !this.stored) {
                        matchingClauses.push(this);
                        this.stored = true;
                        this.sentence.clausesAdded += 1;
                    }
                    if (forceSave || this.sentence.invalid) {
                        return null;
                    } else {
                        this.sentence.clausesReplaced += 1;
                        this.sentence.matchPoolDepth += matchingClauses.length;
                        return matchingClauses.splice(Math.floor(matchingClauses.length * Math.random()), 1)[0];
                    }
                } else {
                    return this;
                }
            } else {
                return this;
            }
        }
    }
    Page.prototype = {
        beatCount(givenText) {
            const words = givenText.match(/\S+\b/g)
            ;
            let beats = 0
            ;
            if (words) {
                words.forEach(function(word) {
                    beats += Math.round(words.length/3);
                });
                beats += givenText.match(pausePattern) ? 2 : 0;
                beats += givenText.match(stopPattern) ? 3 : 0;
            }
            return beats
        }
    ,   draw: function() {
            let currentClause = this.firstClause
            ,   currentCategory = this.firstCategory
            ,   lastElement = null
            ;
            if (this.name.style.getPropertyValue("--nameTransition")) {
                this.element.style.opacity = this.otherPage.element.style.opacity = 1;
                this.name.style.opacity = 1;
                lastElement = this.name;
                if (this.description.style.getPropertyValue("--descriptionTransition")) {
                    this.description.style.opacity = 1;
                    lastElement = this.description;
                    if (this.detail.style.getPropertyValue("--detailTransition")) {
                        this.title.style.opacity = 0;
                        this.detail.style.opacity = 1;
                        this.figure.style.opacity = 1;
                        while (currentClause && currentClause.element.style.getPropertyValue("--clauseTransition")) {
                            currentClause.element.style.opacity = 1;
                            lastElement = currentClause.element;
                            currentClause = currentClause.nextClause;
                        }
                        if (this.categories.style.getPropertyValue("--categoryTransition")) {
                            this.categories.style.opacity = 1;
                            lastElement = this.categories;
                            while (currentCategory && currentCategory.element.style.getPropertyValue("--categoryLinkTransition")) {
                                currentCategory.element.style.opacity = 1;
                                lastElement = currentCategory.element;
                                currentCategory = currentCategory.nextCategory;
                            }
                        }
                    }
                }
                lastElement.classList.add("completionTrigger");
            } else {
                this.name.textContent = "";
                this.name.style.opacity = 0;
                this.description.style.opacity = 0;
                this.title.style.opacity = 1;
                this.detail.style.opacity = 0;
                this.figure.style.opacity = 0;
                while (currentClause) {
                    currentClause.element.style.opacity = 0;
                    currentClause = currentClause.nextClause;
                }
                this.categories.style.opacity = 0;
                while (currentCategory) {
                    currentCategory.element.style.opacity = 0;
                    currentCategory = currentCategory.nextCategory;
                }
                this.display.element.style.setProperty("--axisTransform", "rotateZ(" + this.rotation + "rad)");
                this.element.style.setProperty("--pageTransform", "rotateZ(" + (-1 * this.rotation) + "rad)");
                this.display.element.classList.remove("freeze");
                this.ready = true;
            }
        }
    ,   load: function(article, titleOnly, noPause) {
            let sentence = null
            ,   currentClause = this.firstClause || new PageClause(this)
            ,   currentCategory = this.firstCategory || new PageCategory(this)
            ,   categoryBox = currentCategory.element.parentNode
            ,   delay = 0
            ,   addDelay = 0
            ,   duration = 0
            ,   clause = null
            ,   category = null
            ,   figureWidth = 0
            ;
            this.ready = false;
            this.complete = false;
            this.display.axis.rotationStarted = false;
            this.background.draw();
            this.name.textContent = article.title;
            delay = this.display.axis.rotationDelay + (0.4 * this.display.axis.rotationDuration);
            duration = 0.6 * this.display.axis.rotationDuration;
            this.name.style.setProperty("--nameTransition", "opacity " + duration + "ms ease-in " + delay + "ms");
            if (noPause) {
                this.display.axis.rotationDelay = 0;
                return;
            }
            addDelay = duration + Math.min(1000, 100 * this.beatCount(this.name.textContent));
            if (this.display.descriptions.length) {
                this.description.textContent = this.display.descriptions.splice(Math.floor(this.display.descriptions.length * Math.random()), 1)[0];
                addDelay += Math.min(1000, Math.max(opacityDuration, 100 * this.beatCount(this.description.textContent)));
            }
            delay += 0.7 * duration;
            duration *= 0.3;
            this.description.style.setProperty("--descriptionTransition", "opacity " + duration + "ms ease-in " + delay + "ms");
            if (!titleOnly) {
                delay += 0.6 * addDelay;
                duration = 2 * opacityDuration;
                this.title.style.setProperty("--titleTransition", "opacity " + duration + "ms ease-out " + (delay + duration) + "ms");
                this.detail.style.setProperty("--detailTransition", "opacity " + duration + "ms ease-in " + delay + "ms");
                delay += duration;
                if (this.display.images.length) {
                    this.figure.insertBefore(this.display.images.splice(Math.floor(this.display.images.length * Math.random()), 1)[0].element, this.caption);
                    this.figure.style.setProperty("--figureDisplay", "inline");
                    this.figure.parentNode.style.setProperty("--figureFloat", (Math.random() < 0.5) ? "left" : "right");
                    this.figure.style.setProperty("--figureTransition", "opacity " + opacityDuration + "ms ease-in " + delay + "ms");
                    if (this.display.captions.length) {
                        figureWidth = this.figure.clientWidth;
                        this.caption.textContent = this.display.captions.splice(Math.floor(this.display.captions.length * Math.random()), 1)[0];
                        if (this.figure.clientWidth > figureWidth) {
                            this.caption.textContent = "Figure " + figureCount++;
                        }
                    } else {
                        this.caption.textContent = "Figure " + figureCount++;
                    }
                }
                sentenceLoop: while (article.sentences.length) {
                    sentence = article.sentences.shift();
                    currentClause.element.textContent = sentence.fullSentence;
                    if (currentClause.prevClause && (this.paragraph.scrollHeight > this.paragraph.clientHeight)) {
                        currentClause.element.textContent = "";
                        article.sentences.push(sentence);
                        break sentenceLoop;
                    } else {
                        contentLoop: while (sentence.clauses.length) {
                            clause = sentence.clauses.shift();
                            currentClause.element.textContent = clause.content;
                            if (!sentence.clauses.length) {
                                currentClause.element.textContent += "\r\n\r\n"
                            }
                            currentClause.element.style.setProperty("--clauseColor", "hsl(" + (this.startTextHue + ((this.endTextHue - this.startTextHue) * Math.random())) + ", " + (60 + (40 * Math.random())) + "%, " + (15 + (30 * Math.random())) + "%)");
                            currentClause.element.style.setProperty("--clauseTransition", "opacity " + opacityDuration + "ms ease-in " + delay + "ms");
                            addDelay = Math.min(1000, Math.max(opacityDuration/2, 100 * this.beatCount(currentClause.element.textContent)));
                            delay += addDelay;
                            currentClause = currentClause.nextClause || new PageClause(this);
                        }
                    }
                }
                article.sentences.forEach(function(sentence) {
                    sentence.recycleClauses();
                }, this);
                categoryLoop: while (this.display.categories.length) {
                    category = this.display.categories.splice(Math.floor(this.display.categories.length * Math.random()), 1)[0]
                    currentCategory.element.textContent = category;
                    currentCategory.element.classList.add("revealed")
                    if (currentCategory.prevCategory && (categoryBox.scrollHeight > categoryBox.clientHeight)) {
                        currentCategory.element.textContent = "";
                        currentCategory.element.classList.remove("revealed")
                        currentCategory.element.style.setProperty("--categoryLinkTransition", null);
                        break categoryLoop;
                    } else {
                        if (!currentCategory.id) {
                            this.categories.classList.add("revealed");
                            this.categories.style.setProperty("--categoryTransition", "opacity " + opacityDuration + "ms ease-in " + delay + "ms");
                        }
                        currentCategory.element.style.setProperty("--categoryLinkTransition", "opacity " + opacityDuration + "ms ease-in " + delay + "ms");
                        addDelay = Math.min(1000, Math.max(opacityDuration/2, 100 * this.beatCount(currentCategory.element.textContent)));
                        delay += addDelay;
                        currentCategory = currentCategory.nextCategory || new PageCategory(this);
                    }
                }
            }
            this.display.axis.rotationDelay = addDelay + 500;
        }
    ,   reset: function() {
            let figureImage = this.figure.querySelector("img")
            ,   currentClause = this.firstClause
            ,   currentCategory = this.firstCategory
            ,   hueOffset = 0
            ,   textHueIndex = 0
            ;
            if (this.display.titlesToDelete > 5) {
                this.display.axis.rotationDuration = Math.max(50, 0.6 * this.display.axis.rotationDuration);
            } else if (this.display.titlesToDelete > 0) {
                this.display.axis.rotationDuration = Math.min(this.display.axis.regularRotation, 1.8 * this.display.axis.rotationDuration);
                if (this.display.titlesToDelete == 1) {
                    this.display.axis.reset();
                }
            } else {
                this.display.axis.rotationDuration = this.display.axis.regularRotation;
            }
            this.display.axis.element.style.setProperty("--axisTransition", "transform " + this.display.axis.rotationDuration + "ms ease-in-out " + this.display.axis.rotationDelay + "ms");
            this.rotation = (this.otherPage.rotation || 0) + this.display.axis.rotationIncrement;
            this.hueIndex = this.otherPage.hueIndex ? (this.otherPage.hueIndex + Math.ceil(5 * Math.random())) % 6 : Math.floor(6 * Math.random())
            hueOffset = Math.random();
            this.hue = standardHues[this.hueIndex] + (hueOffset * (standardHues[this.hueIndex + 1] - standardHues[this.hueIndex]));
            textHueIndex = (this.hueIndex + 6 + (((Math.random() < 0.5) ? -1 : 1) * Math.ceil(2 * Math.random()))) % 6;
            this.startTextHue = standardHues[textHueIndex] + (hueOffset * (standardHues[textHueIndex + 1] - standardHues[textHueIndex]));
            this.endTextHue = this.startTextHue + standardHues[textHueIndex + 1] - standardHues[textHueIndex];
            this.title.style.setProperty("--titleTransition", null);
            this.title.style.setProperty("--titleColor", "hsl(" + (this.startTextHue + ((this.endTextHue - this.startTextHue) * Math.random())) + ", 65%, 25%)");
            this.name.textContent = "";
            this.name.style.setProperty("--nameTransition", null);
            this.description.textContent = "";
            this.description.style.setProperty("--descriptionTransition", null);
            this.detail.style.setProperty("--detailColor", "hsl(" + (this.startTextHue + ((this.endTextHue - this.startTextHue) * Math.random())) + ", 75%, 25%)");
            this.detail.style.setProperty("--detailTransition", null);
            this.figure.style.setProperty("--figureDisplay", "none");
            this.figure.style.setProperty("--figureTransition", null);
            if (figureImage) {
                this.figure.removeChild(figureImage);
            }
            while (currentClause) {
                currentClause.element.style.setProperty("--clauseTransition", null);
                currentClause = currentClause.nextClause;
            }
            this.categories.style.setProperty("--categoryTransition", null);
            this.categories.classList.remove("revealed");
            while (currentCategory) {
                currentCategory.element.classList.remove("revealed")
                currentCategory.element.style.setProperty("--categoryLinkTransition", null);
                currentCategory = currentCategory.nextCategory;
            }
        }
    }
    PageBackground.prototype = {
        draw: function() {
            if (this.page.axisReset) {
                this.page.axisReset = false;
                this.drawFrame();
                if (this.page.otherPage.axisReset) {
                    this.page.otherPage.background.draw();
                }
            }
            this.context.fillStyle = "hsl(" + this.page.hue + ", 70%, 95%)";
            this.context.fillRect(this.page.display.axis.borderLeft, this.page.display.axis.borderTop, this.page.display.width, this.page.display.height);
        }
    ,   drawFrame: function() {
            this.element.style.setProperty("--backgroundLeft", (-1 * this.page.display.axis.borderLeft) + "px");
            this.element.style.setProperty("--backgroundTop", (-1 * this.page.display.axis.borderTop) + "px");
            this.element.style.setProperty("--backgroundWidth", (this.page.display.axis.borderLeft + this.page.display.width + this.page.display.axis.borderRight) + "px");
            this.element.style.setProperty("--backgroundHeight", (this.page.display.axis.borderTop + this.page.display.height + this.page.display.axis.borderBottom) + "px");
            this.element.width = this.element.clientWidth;
            this.element.height = this.element.clientHeight;
            this.context.clearRect(0, 0, this.element.width, this.element.height);
            this.context.fillStyle = "hsl(" + this.page.display.axis.hue + ", 80%, 30%)";
            this.context.beginPath();
            if (this.page.display.axis.position == "right") {
                this.context.moveTo(0, 0);
                this.context.lineTo(this.element.width, this.page.display.axis.borderTop - this.page.display.marginWidth);
                this.context.lineTo(this.element.width, this.element.height - (this.page.display.axis.borderTop - this.page.display.marginWidth));
                this.context.lineTo(0, this.element.height);
            } else if (this.page.display.axis.position == "left") {
                this.context.moveTo(0, this.page.display.axis.borderTop - this.page.display.marginWidth);
                this.context.lineTo(this.element.width, 0);
                this.context.lineTo(this.element.width, this.element.height);
                this.context.lineTo(0, this.element.height - (this.page.display.axis.borderTop - this.page.display.marginWidth));
            } else if (this.page.display.axis.position == "top") {
                this.context.moveTo(this.page.display.axis.borderLeft - this.page.display.marginWidth, 0);
                this.context.lineTo(this.element.width - (this.page.display.axis.borderRight - this.page.display.marginWidth), 0);
                this.context.lineTo(this.element.width, this.element.height);
                this.context.lineTo(0, this.element.height);
            } else {
                this.context.moveTo(0, 0);
                this.context.lineTo(this.element.width, 0);
                this.context.lineTo(this.element.width - (this.page.display.axis.borderRight - this.page.display.marginWidth), this.element.height);
                this.context.lineTo(this.page.display.axis.borderLeft - this.page.display.marginWidth, this.element.height);
            }
            this.context.fill();
        }
    }
    PageClause.prototype = {
        printText: function(text, x, y) {
            this.context.clearRect(0, 0, this.element.width, this.element.height);
            this.context.fillText(text, 0, 0);
            this.x = x;
            this.xOffset = Math.floor(3 * Math.random());
            this.element.style.left = this.x + "px";
            this.y = y;
            this.yOffset = 2 - Math.floor(5 * Math.random());
            this.element.style.top = this.y + "px";
        }
    }
    Sentence.prototype = {
        recycleClauses: function() {
            this.clauses.forEach(function(clause) {
                clause.swap(true);
            }, this);
        }
    }
    Shadow.prototype = {
        rotate: function() {
            if (this.rotation) {
                this.element.style.setProperty("--shadowTransition", "transform 3000ms ease-in-out");
            } else {
                this.rotation = 0;
                this.element.style.setProperty("--shadowTransition", "transform 100ms ease-in-out, opacity 1000ms ease-in");
            }
            this.rotation += ((Math.random < 0.5) ? -1 : 1) * Math.PI * Math.random()/4
            this.element.style.setProperty("--shadowTransform", "rotateZ(" + this.rotation + "rad)");
        }
    }
    Status.prototype = {
        activate: function(description) {
            this.description.textContent = description;
            this.element.classList.add("reveal");
        }
    ,   deactivate: function() {
            this.description.textContent = "";
            this.element.classList.remove("reveal");
        }
    }
    return new Display();
}
function initialize() {
    canvasRoot.addEventListener("click", function(e) {
        if (e.target.classList.contains("details")) {
            if (display.element.classList.contains("freeze")) {
                display.element.classList.remove("freeze");
            } else {
                display.element.classList.add("freeze");
                (function (display) {
                    setTimeout(function() {
                        display.element.classList.remove("freeze");
                    }, 10000);
                })(display);
            }
        } else if (e.target.classList.contains("images")) {
            display.manualSearches.push(e.target.getAttribute("title"));
        } else if (e.target.classList.contains("categoryLinks")) {
            display.manualSearches.push(e.target.textContent);
        }
    }, false);
    canvasRoot.addEventListener("transitionend", function(e) {
        let opacity = parseInt(e.target.style.opacity)
        ;
        if ((e.propertyName == "opacity") && parseInt(e.target.style.opacity)) {
            if (e.target.classList.contains("completionTrigger")) {
                e.target.classList.remove("completionTrigger");
                display.currentPage.complete = true;
            } else if (e.target.classList.contains("details")) {
                e.target.classList.add("revealed");
            }
        } else if (e.target.classList.contains("shadows") && !e.target.classList.contains("revealed")) {
            e.target.classList.add("revealed")
            display.revealBackgrounds();
        }
    }, false);
}
function animationLoop(ts) {
    var interval = ts - priorTimestamp
    ,   currentTask = null
    ;
    priorTimestamp = ts;
    if (display.tasks.length) {
        currentTask = display.tasks.shift();
        currentTask.action.apply(currentTask.object, currentTask.parameters);
    } else if (display.currentPage.ready && (display.articles.length || display.titleArticles.length)) {
        if (display.titlesToDelete > 0) {
            display.titlesToDelete--;
            display.currentPage.load(display.titleArticles.shift(), true, true);
        } else if (display.articles.length && (Math.random() < 0.7)) {
            display.currentPage.load(display.articles.pop());
        } else {
            display.currentPage.load(display.titleArticles.shift(), true);
        }
        // console.log(Date.now() + ": " + display.articles.length + " articles, " + display.titleArticles.length + " titles, " + display.captions.length + " captions, " + display.categories.length + " categories, " + display.descriptions.length + " descriptions, " + display.extraSentences.length + " extras, " + display.images.length + " images, " + display.rawContent.length + " raw content, " + display.rawImages.length + " raw images, " + display.featuredPageids.length + " featured, " + display.popularPageids.length + " popular, " + display.titlesToDelete + " delete titles, " + display.loadCount + " loads, " + display.imageLoadCount + " image loads");
        display.addTask(display.currentPage, display.currentPage.draw);
    } else if (display.currentPage.complete && !display.element.classList.contains("freeze")) {
        if (display.resize) {
            display.resize = false;
            display.clear();
            display.initialize();
            display.axis.reset();
        }
        display.advancePage();
    } else if (!display.loading && (display.manualSearches.length || (display.rawContent.length < minContentCount))) {
        display.load();
    } else if (!display.loading && (!display.popularPageids.length || !display.featuredPageids.length || display.gplcontinue)) {
        display.loadPageids();
    } else if (display.rawContent.length && (display.articles.length < minContentCount)) {
        display.parseContent();
    } else if (!display.loading && (display.rawImages.length < minContentCount)) {
        display.loadImages();
    } else if (display.rawImages.length && (display.images.length < minContentCount)) {
        display.addImage();
    }
	animationId = window.requestAnimationFrame(animationLoop);
}
initialize();
})();
