(function() {
"use strict";

const canvas = document.querySelector(".canvas")
,   menu = document.querySelector("#nullMenu")
,   nextLogo = document.querySelector("#nextLogo")
,   randomLogo = document.querySelector("#randomLogo")
;
let touchStartId = 0
,   menuRevealed = false
,   touchDevice = null
;
window.onbeforeunload = function() {
    hide(null, true);
}
function hide(event, fullHide) {
    menuRevealed = false;
    if (fullHide) {
        menu.classList.remove("fullMenu");
        menu.classList.remove("revealMobileMenu");
        menu.classList.remove("revealMenu");
    } else if (touchDevice) {
        menu.classList.remove("fullMenu");
    } else {
        if (event) {
            menu.classList.remove("fullMenu");
            menu.classList.remove("revealMenu");
        } else if (!menu.classList.contains("fullMenu")) {
            menu.classList.remove("revealMenu");
        }
    }
}
function reveal(event) {
    if (!menuRevealed) {
        if (event.type == "touchstart") {
            if (touchDevice == null) {
                touchDevice = true;
                canvas.removeEventListener("touchstart", reveal, false);
                canvas.addEventListener("touchstart", hide, false);
                menu.addEventListener("touchstart", reveal, false);
                menu.classList.add("revealMobileMenu");
            } else {
                menuRevealed = true;
                setTimeout(revealFull, 300);
                setTimeout(hide, 3000);
            }
        } else if (touchDevice != true){
            if (touchDevice == null) {
                touchDevice = false;
                menu.addEventListener("mouseenter", revealFull, false);
                menu.addEventListener("mouseleave", hide, false);
            }
            menuRevealed = true;
            menu.classList.add("revealMenu");
            setTimeout(hide, 3000);
        }
    }
}
function revealFull(event) {
    menu.classList.add("fullMenu");
}
function initialize() {
    menu.style.width = menu.style.height = Math.round(Math.max(60, 0.15 * Math.min(window.innerWidth, window.innerHeight))) + "px";
    canvas.addEventListener("touchstart", reveal, false);
    canvas.addEventListener("mousemove", reveal, false);
    nextLogo.href = pageLinks[(currentLinkIndex + 1) % pageLinks.length];
    randomLogo.href = pageLinks[Math.floor(pageLinks.length * Math.random())];
}
initialize();
})();
