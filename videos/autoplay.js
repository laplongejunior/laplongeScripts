// ==UserScript==
// @name        Convenient autoplay
// @version     0.0.3
// @description Auto-advance from one video to another
// @author      laplongejunior
// @license     https://www.gnu.org/licenses/agpl-3.0.fr.html
// @require     https://combinatronics.com/laplongejunior/laplongeScripts/main/utilityLib/laplongeLib.js
// @match       *://*.example.org/*
// @run-at      document-end
// ==/UserScript==

(function(global) { // I prefer getting the global object with "this" rather than using the name 'window', personal taste
	"use strict";

    // To allow easy redirects
    const console = global.console;
    const UTILS = global.laplongeUtils;
    UTILS.enableMapFindPolyfill();

    // #####################
    // ### CONFIG /start ###
    // #####################

    // #####################
    // #### CONFIG /end ####
    // #####################

    // Find the host of the video
    const locateHost = (element) => {
        let child = UTILS.querySelectorSafe(element,'tr',false);
        if (!child) return "";
        return UTILS.querySelectorSafe(child.lastChild,'titre6',false).lastChild.textContent.toLowerCase();
    };

    const separator = '#', SCREEN_PARAM = "fullscreen", HOST_PARAM = "host";
    let lastHost;

    const doc = global.document;
    let redirect = null;

    doc.addEventListener("fullscreenchange", event=>{
        if (document.fullscreenElement) {
            const target = event.target;
            if (new URL(target.src).origin !== window.origin) return;

            lastHost = locateHost(target.parentElement.parentElement);
        }
        else {
            const links = UTILS.querySelectorSafe(global.document,'#sidebar .post_list .clearfix');
            if (!links) return;

            let takeTheNext = false;
            let nextVideo = null;
            for (const item of links.querySelectorAll(":scope > a")) {
                if (takeTheNext) {
                    nextVideo = item;
                    break;
                }
                takeTheNext = (item.href == (location.protocol + '//' + location.host + location.pathname));
            }
            if (!takeTheNext) return;

            let href = nextVideo.href;
            let pos = href.indexOf(separator);
            if (pos >= 0)
                href = href.substring(0,pos);
            nextVideo.href = href+separator+HOST_PARAM+'='+lastHost;

            if (redirect)
                global.document.body.removeChild(redirect);
            global.document.body.appendChild(redirect = UTILS.clickRedirect(nextVideo,'load next video'));
        }
    });

    let videoName = UTILS.URLcontainsParam(global.location.href, HOST_PARAM);
    if (videoName) videoName = videoName[2];

    const main = () => {
        const videos = UTILS.querySelectorSafe(global.document,'#content .post-wrapper');
        if (!videos) return;

        let hostVideo = null;
        for (const item of videos.firstChild.querySelectorAll(':scope > div')) {
            if (videoName == locateHost(item)) {
                hostVideo = item;
                break;
            }
        }
        if (!hostVideo) return;

        hostVideo.scrollIntoView();
        UTILS.querySelectorSafe(UTILS.querySelectorSafe(hostVideo.firstChild, 'iframe', false).contentWindow.document, 'input').click();
    };

	// If there's a DOM modification, schedule a new try
    UTILS.callFunctionAfterUpdates(global, main);
})(unsafeWindow||this);
