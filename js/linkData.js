const pageLinks =
    [   "bone.html"
    ,   "klee.html"
    ,   "wikilinks.html"
    ,   "cubo.html"
    ,   "jelly.html"
    ,   "shard.html"
    ,   "iris.html"
    ,   "ticker.html"
    ,   "derail.html"
    ,   "inflate.html"
    ,   "weave.html"
    ,   "skim.html"
    ,   "prism.html"
    ,   "terrace.html"
    ,   "railing.html"
    ,   "populace.html"
    ,   "crossing.html"
    ,   "bobbin.html"
    ,   "molnar.html"
    ,   "pihole.html"
    ,   "capitate.html"
    ,   "bubbly.html"
    ,   "litmius.html"
    ,   "unfacts.html"
    ,   "perforce.html"
    ,   "standby.html"
    ,   "pseudopops.html"
    ,   "packing.html"
    ,   "unfolding.html"
    ,   "hotdog.html"
    ,   "egallery.html"
    ,   "saltlick.html"
    ]
,   linkPosition = window.location.pathname.lastIndexOf("index-2.html")
,   currentLinkIndex = (linkPosition == -1) ? null : pageLinks.indexOf(window.location.pathname.substr(linkPosition + 1))
;