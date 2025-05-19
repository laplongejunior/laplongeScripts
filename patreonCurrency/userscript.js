// ==UserScript==
// @name         Patreon currency finder
// @version      0.0.1
// @description  Adds creator's currency on patreon campaign pages
// @author       laplongejunior
// @license		 https://www.gnu.org/licenses/agpl-3.0.fr.html
// @match        https://www.patreon.com/*
// @run-at       document-start
// ==/UserScript==

(function(global) {
    'use strict';
    // Use document-start in order to guarantee an early hookup to onload
    // Else, the script will visually work by executing at document-end, but React will throw minified errors due to modifying the DOM before the page finished loaded
    global.addEventListener('load',()=>{

        // Patreon regularily changes the way they store the general data
        // Feel free to do a console.log(window) to see all the global space
        // But basically that code runs on vibes and "trust me bro"
        // Once we reach the bootstrapEnvelope object, we effectively can see all Patreon-specific data loaded in memory
        let data = global.__NEXT_DATA__;
        if (!data) { console.warn("Patreon's data wasn't preloaded. Aborting execution"); return; }
        let props = data.props;
        if (!props) props = JSON.parse(data.text).props;
        data = props.pageProps.bootstrapEnvelope.pageBootstrap;
        if (!data) { console.warn("This page is not supported by the script. Aborting execution"); return; }

        // Interesting funfact about Patreon : they *don't* reload the whole page when changing navigation
        // So the "currency" changes if we jump from a creator to another
        const CURRENCY_CACHE = {};
        const FIND_CURRENCY = (name)=>{
            let result = CURRENCY_CACHE[name];
            if (result) return result;
            result = data.campaign;
            if (result) result = result.data;
            if (result) result = result.attributes;
            if (result) result = result.currency;
            CURRENCY_CACHE[name] = result;
            console.log("Detected currency: "+result);
            return result;
        };

        const insertCurrency=(parent)=>{
            // Prevents an infinite loop
            if (parent.childNodes.length >= 2) return;

            const container = global.document.createElement('div');
            console.log(parent.textContent);
            container.appendChild(document.createTextNode(FIND_CURRENCY(parent.textContent)));

            // We can reuse a few classes used by Patreon
            container.classList.add('cm-dMgEsi');
            container.classList.add('cm-LNraKM');
            container.classList.add('cm-DFAJDB');
            container.classList.add('cm-dupTbP');

            parent.appendChild(container);
            return container;
        };

        const safeQuerySelector = (element, query)=>{
            const result = element.querySelectorAll(query);
            if (result.length == 1) return result[0];
            if (result.length == 0) return null;
            console.warn("Query '"+query+"' returned several results");
            console.warn(result);
            return null;
        };

        const execute=(target)=>{
            let title = safeQuerySelector(target,'#pageheader-title');
            if (title) insertCurrency(title.parentElement);
            title = safeQuerySelector(target,'div[data-tag="metadata-wrapper"]');
            if (title) insertCurrency(title.firstChild.firstChild);
            // A fun issue to troubleshoot : when viewing a post, the creator info window is totally different depending on if you are subbed or not!
            // And it's most defining feature, the join button, existing in other parts of the page!
            // And free member is different from not a member at all because why not???
            for (const tag of ['upgrade-free-membership-button', 'become-patron-button'])
                for (title of target.querySelectorAll('a[data-tag="'+tag+'"]')) {
                    title = safeQuerySelector(title.parentNode,'a p');
                    if (title) console.log(insertCurrency(title));
                }
        };

        // Execute on existing page then execute on modifications
        // That allows the script to work even when jumping from a section to another, as Patreon doesn't trigger a full reload
        const body = global.document.body;
        new MutationObserver((mutationList, observer)=>{
            for (const mutation of mutationList) {
                execute(mutation.target);
            }
        }).observe(body, { attributes: false, childList: true, subtree: true });
        execute(body);
    })
})(window);
