// ==UserScript==
// @name        Adult platforms NSFW blur
// @version     0.0.1
// @description When looking watching SFW content on NSFW platforms, blurs recommendations for NSFW content. !WON'T AFFECT ADS!
// @author      laplongejunior
// @license     https://www.gnu.org/licenses/agpl-3.0.fr.html
// @match       https://*.pornhub.com/*
// @run-at      document-end
// ==/UserScript==

(function(global) { // I prefer getting the global object with "this" rather than using the name 'window', personal taste
	"use strict";

    // #####################
    // ### CONFIG /start ###
    // #####################

    const SFW_CREATORS = ['inlacrimaelacrima', 'tastyfps'];
    // Not implemented yet
    // const SFW_VIDEOS = [];

    // #####################
    // #### CONFIG /end ####
    // #####################

    const _querySelectorAll = Element.prototype.querySelectorAll;
    global.laplongeUtils = {
        // Basically, calls callback once, then recalls it everytime there's a new node
        // We use win instead of "window" because this function must also work with the data-resolution popup
        callFunctionAfterUpdates: (doc, callback) => {
            let observer = new MutationObserver(callback);
            observer.observe(doc, { childList: true, subtree: true });
            // Make the callback believes it's an update
            callback();
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
        }
    };

    // To allow easy redirects
    const console = global.console;
    const UTILS = global.laplongeUtils;

    const isElementSFW = element=>{
        if (!element) return false;
        let href = element.href;
        if (!href) return false;
        const parts = href.split("/");
        for (let i = 0; i < parts.length-1; i++) {
            if (parts[i] == "model") return SFW_CREATORS.includes(parts[i+1]);
        }
        return false;
    };
    let doc = global.document.body;
    // While on a SFW page, it's saner to not edit the main content
    if (isElementSFW(global.location)) doc = UTILS.querySelectorSafe(doc, "#header");

    let censored = [];

    // Where we do the bulk of the work
    const userCheck = () => {
        let censorImage = item=>{
            // Skips the platform's logo
            if (!item || item.title === "Pornhub" || censored.includes(item)) return;
            censored.push(item);

            let container = item.parentElement;

            let data = container.parentElement.parentElement;
            if (isElementSFW(UTILS.querySelectorSafe(data,".channelCard .username"))) return;
            if (isElementSFW(UTILS.querySelectorSafe(data,".videoUploaderBlock .usernameWrap a"))) return;

            // Shortcircuits the first click to remove the blur effect
            var handler = event=>{
                container.removeEventListener("click", handler);
                event.stopPropagation();
                event.preventDefault();
                item.style.filter='';
                return false;
            };
            container.addEventListener("click", handler);

            // The platform replaces thumbs by video segments when moused over
            // In those cases, blurring the parent is the sanest way
            if (item.classList.contains("js-videoPreview")) item = container;
            item.style.filter='blur(10px)';
        };

        doc.querySelectorAll(".js-videoThumb").forEach(censorImage);
        doc.querySelectorAll(".wrap .phimage img").forEach(censorImage);
        doc.querySelectorAll("a > .gifVideo").forEach(censorImage);
        doc.querySelectorAll("a > img,video :not(.headerContainer)").forEach(censorImage);
    };

	// If there's a DOM modification, schedule a new try
    UTILS.callFunctionAfterUpdates(doc, userCheck);
})(unsafeWindow||this);
