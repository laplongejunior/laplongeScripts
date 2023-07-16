(function(global) { // I prefer getting the global object with "this" rather than using the name 'window', personal taste
"use strict";
const _querySelectorAll = Element.prototype.querySelectorAll;

global.laplongeUtils = {
	// Polyfill
	enableMapFindPolyfill: ()=>{global.Map.prototype.find = function(filter, _this) {
		for (const [key,data] of this) {
			if (filter.call(_this,key,data,this)) return data;
		}
		return undefined;
	}},

	// Fullscreen can only be initiated by a "user gesture"
    // Create a HUGE area to invite to click/type, thn redirect that to the video's control bar
    // It allows to trigger FS easily when from a small screen with remote desktop
    clickRedirect: (target,msg) => {
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

        // Set zIndex so that it always overlays the page
        tStyle.zIndex = 1+Math.max(0,
            ...Array.from(global.document.body.querySelectorAll('*'), el =>
                          parseFloat(window.getComputedStyle(el).zIndex),
                         ).filter(zIndex => !Number.isNaN(zIndex)),
        );

        // In my "remote phone" UX, focusing on a text field allows to simply input any key to restore FS
        setTimeout(()=>input.focus(),1000);

        return triggerArea;
    },

    // Variant of callFunctionAfterUpdates which DOESN'T temporarize
    // Useful for functions where instantaneous effects are important like a blur effect
    runFunctionAfterUpdates: (doc, callback) => {
        let observer = new MutationObserver(callback);
        observer.observe(doc, { childList: true, subtree: true });
        // Make the callback believes it's an update
        callback();
        return observer;
    },
    // Basically, calls callback once, then recalls it everytime there's a new node
    // We use win instead of "window" because this function must also work with the data-resolution popup
    callFunctionAfterUpdates: (win, callback) => {
        let pending = null;
        const run = mutations => {
            // No need to schedule several tries at the same time
            if (pending !== null || !mutations.some(mutation => mutation.addedNodes)) return;
            pending = setTimeout(() => {
                pending = null;
                callback();
            }, 3000); // 3 seconds... YT seems to sometimes have the old nodes
        }

	let observer = new MutationObserver(run);
        observer.observe(win.document || win.document.body, { childList: true, subtree: true });
        // Make the callback believes it's an update
        run([{addedNodes:true}]);
	return observer;
    },

    // By default, querySelector returns the first element in case of multiple matches
    // querySelector should only be used for cases intended for a single match
    // Sometimes, Youtube doesn't correctly clear the webpage leading to the "first" result not being the unique result on screen
    // As a security, this polyfill makes it so that querySelector returns null in case of multiple matches
    querySelectorSafe: function(element, selector) {
      const result = _querySelectorAll.call(element, selector);
      if (result.length == 1) return result.item(0);
      if (result.length > 1) {
        global.console.warn("Several matches found for querySelector! Discarding...");
        global.console.warn(result);
      }
      return null;
    },

    URLcontainsParam: (url, ...names) => {
      let params = "";
      for (const name of names) {
        params += "|" + name;
      }
      return url.match('(?:[?&#]('+params.substring(1)+')=)((?:[^&]+|$))');
    },

    getJSON: (url, callback) => {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'json';
        xhr.onload = function() {
            callback(xhr.status === 200 ? JSON.parse(xhr.response) : null);
        };
        xhr.send();
    }
};
})(unsafeWindow||this);
