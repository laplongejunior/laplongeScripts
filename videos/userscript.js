// ==UserScript==
// @name        Convenient autoplay
// @version     0.0.5
// @description Auto-advance from one video to another
// @author      laplongejunior
// @license     https://www.gnu.org/licenses/agpl-3.0.fr.html
// @require     https://combinatronics.io/laplongejunior/laplongeScripts/main/utilityLib/laplongeLib.js
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
        let child = UTILS.querySelectorSafe(element,'tr');
        if (!child) return "";
        return UTILS.querySelectorSafe(child.lastChild,'titre6').lastChild.textContent.toLowerCase();
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
            const links = UTILS.querySelectorSafe(global.document.documentElement,'#sidebar .post_list .clearfix');
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

            nextVideo.addEventListener("click", e=>{
                e.preventDefault();
                let href = e.srcElement.href;
                let pos = href.indexOf(separator);
                if (pos >= 0)
                    href = href.substring(0,pos);
                window.location.href = href+separator+HOST_PARAM+'='+lastHost;
            });

            if (redirect)
                global.document.body.removeChild(redirect);
            global.document.body.appendChild(redirect = UTILS.clickRedirect(nextVideo,'load next video'));
        }
    });

    let loc = window.location.href;
    let videoName = UTILS.URLcontainsParam(loc, HOST_PARAM);
    if (!videoName) return;
    videoName = videoName[2];

    const his = global.history;
    his.replaceState(his.state, doc.title, loc.substring(0,loc.indexOf('#')) );
    his.replaceState(his.state, doc.title, loc );

    // If there's a DOM modification, schedule a new try
    const observer = UTILS.callFunctionAfterUpdates(global, ()=>{
        if (!videoName) return;
        const videos = UTILS.querySelectorSafe(doc.documentElement,'#content .post-wrapper');
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
        UTILS.querySelectorSafe(UTILS.querySelectorSafe(hostVideo.firstChild, 'iframe').contentWindow.document.documentElement, 'input').click();
        observer.disconnect();
    });
})(unsafeWindow||this);
