// ==UserScript==
// @name        Convenient autoplay
// @version     0.0.6
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
    const his = global.history;
    UTILS.enableMapFindPolyfill();
    const doc = global.document;

    // #####################
    // ### CONFIG /start ###
    // #####################

    // When redirected with client-side parameters, insert the original state so that links will be in visited state
    const ADD_VISITED_STATE = true;
    // Insert the host parameters in all links instead of only the next frame
    const REDIRECT_ALL_LINKS = true;

    // #####################
    // #### CONFIG /end ####
    // #####################

    const separator = '#', SCREEN_PARAM = "fullscreen", HOST_PARAM = "host";

    // Find the host of the video
    const locateHost = (element)=>{
        let child = UTILS.querySelectorSafe(element,'tr');
        if (!child) return "";
        return UTILS.querySelectorSafe(child.lastChild,'titre6').lastChild.textContent.toLowerCase();
    };

    let videoName = null;
    // Once clicked, the link will add the host parameter to the URL
    // It also means that the parameter can be changed after hooking to the link element
    const redirectedLinks = new Set();
    const insertParam = (link)=>{
        if (new URL(link.href).origin !== window.origin) return;
        if (redirectedLinks.has(link)) return;
        redirectedLinks.add(link);
        link.addEventListener("click", e=>{
            let target = e.target;
            while (target && !target.href) { target = target.parentElement; }
            if (!target) return;
            const href = target.href;
            e.preventDefault();
            setTimeout(()=>{window.location.href = href+(href.indexOf(separator)>0 ? '&' : separator)+HOST_PARAM+'='+videoName;}, 100);
        });
    };

    let existingRedirect = false;
    doc.addEventListener("fullscreenchange", event=>{
        // Change the next title to use as a parameter
        if (document.fullscreenElement) {
            const target = event.target;
            if (new URL(target.src).origin === window.origin) {
                videoName = locateHost(target.parentElement.parentElement);
            }
            return;
        }

        // Create a prompt to go the next link
        if (existingRedirect) return;
        const links = UTILS.querySelectorSafe(global.document.documentElement,'#sidebar .post_list .clearfix');
        if (!links) return;

        let takeTheNext = false;
        let nextVideo = null;
        for (const item of links.querySelectorAll(":scope > a")) {
           if (takeTheNext) {
                nextVideo = item;
                if (!REDIRECT_ALL_LINKS) insertParam(item);
                break;
            }
            takeTheNext = (item.href == (location.protocol + '//' + location.host + location.pathname));
        }
        if (!takeTheNext) return;

        doc.body.appendChild(UTILS.clickRedirect(nextVideo,'load next video'));
        existingRedirect = true;
    });

    let loc = window.location.href;
    videoName = UTILS.URLcontainsParam(loc, HOST_PARAM);
    if (!videoName) return;
    videoName = videoName[2];

    his.replaceState(his.state, doc.title, loc.substring(0,loc.indexOf('#')) );
    his.replaceState(his.state, doc.title, loc );

    const updateAllLinks= ()=>{
        if (!REDIRECT_ALL_LINKS) return;
        for (const link of doc.querySelectorAll('a')) {
            insertParam(link);
        }
    };
    updateAllLinks(); // Waiting for trigger risks delaying too much and missing a fast click from the user

    // If there's a DOM modification, schedule a new try
    const observer = UTILS.callFunctionAfterUpdates(global, ()=>{
        updateAllLinks();

        if (!videoName) return;
        const videos = UTILS.querySelectorSafe(doc.documentElement,'#content .post-wrapper');
        if (!videos) return;

        let hostFrame = null;
        for (const item of videos.firstChild.querySelectorAll(':scope > div')) {
            if (videoName == locateHost(item)) {
                hostFrame = item;
                break;
            }
        }
        if (!hostFrame) return;

        // If not on a hosted page, observer stay running to hook into various dynamic link
        hostFrame.scrollIntoView();
        UTILS.querySelectorSafe(UTILS.querySelectorSafe(hostFrame.firstChild, 'iframe').contentWindow.document.documentElement, 'input').click();
        observer.disconnect();
    });
})(unsafeWindow||this);
