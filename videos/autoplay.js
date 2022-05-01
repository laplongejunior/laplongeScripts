// ==UserScript==
// @name        Convenient autoplay
// @version     0.0.1
// @description Auto-advance from one episode to another
// @author      laplongejunior
// @run-at      document-end
// ==/UserScript==

(function(global) { // I prefer getting the global object with "this" rather than using the name 'window', personal taste
	"use strict";

    // #####################
    // ### CONFIG /start ###
    // #####################

    // #####################
    // #### CONFIG /end ####
    // #####################

    // Fullscreen can only be initiated by a "user gesture"
    // Create a HUGE area to invite to click/type, thn redirect that to the video's control bar
    // It allows to trigger FS easily when from a small screen with remote desktop
    const clickRedirect = (target,msg) => {
        // I won't comment this code, self-explanatory
        const triggerArea = global.document.createElement("div");
        target.addEventListener("click", ()=>triggerArea.remove());
        ["keypress","click"].forEach(gesture => triggerArea.addEventListener(gesture, ()=>target.click()));

        const closeButton = global.document.createElement("span");
        closeButton.addEventListener("click", (event) => {
            event.stopPropagation();
            triggerArea.remove();
        });

        const cStyle = closeButton.style;
        cStyle.position="absolute";
        cStyle.top = "0px";
        cStyle.right = "0px";
        cStyle.cursor = "pointer";

        closeButton.appendChild(global.document.createTextNode('[X]'));
        triggerArea.appendChild(closeButton);

        triggerArea.appendChild(global.document.createTextNode('Press a button or click to '+msg));
        triggerArea.appendChild(global.document.createElement("br"));

        const input = global.document.createElement("input");
        input.type = "text";
        triggerArea.appendChild(input);

        const tStyle = triggerArea.style;

        tStyle.position = "fixed";
        tStyle.left = "50%";
        tStyle.transform = "translate(-50%,0)";
        tStyle.width = "500px";
        tStyle.height = "50px";
        tStyle.bottom = "10px";
        tStyle.backgroundColor = "red";
        tStyle.textAlign = "center";
        tStyle.fontSize = "15px";

        // In my "remote phone" UX, focusing on a text field allows to simply input any key to restore FS
        input.focus();

        return triggerArea;
    };

    // Basically, calls callback once, then recalls it everytime there's a new node
    // We use win instead of "window" because this function must also work with the data-resolution popup
    const callFunctionAfterUpdates = (win, callback) => {
        let pending = null;
        const run = mutations => {
            // No need to schedule several tries at the same time
            if (pending !== null || !mutations.some(mutation => mutation.addedNodes)) return;
            pending = setTimeout(() => {
                pending = null;
                callback();
            }, 3000); // 3 seconds... YT seems to sometimes have the old nodes
        }

        new MutationObserver(run).observe(win.document || win.document.body, { childList: true, subtree: true });
        // Make the callback believes it's an update
        run([{addedNodes:true}]);
    };

    // Polyfill
    global.Map.prototype.find = function(filter, _this) {
        for (const [key,data] of this) {
            if (filter.call(_this,key,data,this)) return data;
        }
        return undefined;
    };

    // By default, querySelector returns the first element in case of multiple matches
    // querySelector should only be used for cases intended for a single match
    // Sometimes, Youtube doesn't correctly clear the webpage leading to the "first" result not being the unique result on screen
    // As a security, this polyfill makes it so that querySelector returns null in case of multiple matches
    const _querySelectorAll_Doc = HTMLDocument.prototype.querySelectorAll
    const _querySelectorAll_Elem = HTMLElement.prototype.querySelectorAll
    const querySelectorSafe = function(doc, selector, isDoc=true) {
      const proto = isDoc ? _querySelectorAll_Doc : _querySelectorAll_Elem;
      const result = proto.call(doc, selector);
      if (result.length == 1) return result.item(0);
      if (result.length > 1) {
        console.warn("Several matches found for querySelector! Discarding...");
        console.warn(result);
      }
      return null;
    };

    const URLcontainsParam = (url, ...names) => {
      let params = "";
      for (const name of names) {
        params += "|" + name;
      }
      return url.match('(?:[?&#]('+params.substring(1)+')=)((?:[^&]+|$))');
    }

    let getJSON = function(url, callback) {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'json';
        xhr.onload = function() {
            callback(xhr.status === 200 ? JSON.parse(xhr.response) : null);
        };
        xhr.send();
    };

    // All the code above was rather generic functions not really related to the business tasks
    // NOW, the real script begins!

    // Find the host of the video
    const locateHost = (element) => {
        let child = querySelectorSafe(element,'tr',false);
        if (!child) return "";
        return querySelectorSafe(child.lastChild,'titre6',false).lastChild.textContent.toLowerCase();
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
            const links = querySelectorSafe(global.document,'#sidebar .post_list .clearfix');
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
            console.warn(href);
            nextVideo.href = href+separator+HOST_PARAM+'='+lastHost;

            if (redirect)
                global.document.body.removeChild(redirect);
            global.document.body.appendChild(redirect = clickRedirect(nextVideo,'load next video'));

        }
    });

    const videoName = URLcontainsParam(global.location.href, HOST_PARAM)[2];

    const main = () => {
        const videos = querySelectorSafe(global.document,'#content .post-wrapper');
        if (!videos) return;

        let hostVideo = null;
        for (const item of videos.firstChild.querySelectorAll(':scope > div')) {
            if (videoName == locateHost(item)) {
                hostVideo = item;
                break;
            }
        }
        if (!hostVideo) return;

        querySelectorSafe(querySelectorSafe(hostVideo.firstChild, 'iframe', false).contentWindow.document, 'input').click();
    };

	// If there's a DOM modification, schedule a new try
    callFunctionAfterUpdates(global, main);
})(unsafeWindow||this);
