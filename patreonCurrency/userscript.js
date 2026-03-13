// ==UserScript==
// @name         Patreon currency finder
// @namespace    http://tampermonkey.net/
// @version      0.0.2
// @description  Adds creator's currency on patreon campaign pages
// @author       laplongejunior
// @license      https://www.gnu.org/licenses/agpl-3.0.fr.html
// @match        https://www.patreon.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function(global) {
    'use strict';
    // Use document-start in order to guarantee an early hookup to onload
    // Else, the script will visually work by executing at document-end, but React will throw minified errors due to modifying the DOM before the page finished loaded
    global.addEventListener('load',()=>{
        // If TRUE, if the script identifies a campaign object without the currency data, it will call Patreon's API to load the full campaign to identify the currency
        // As the currency is put in cache, a specific campaign will only be fetched once per page load
        const ALLOW_FETCH = true;

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
        const FIND_CURRENCY = async (name)=>{
            let result = CURRENCY_CACHE[name];
            if (result) return result;

            // Prevents multiple lookups while we are waiting for a network request
            // All other methods use "falsy" values, so here we specifically use null as a guard value for "manual loading in progress or failed, do not retry requests"
            const fetchAllowed = (ALLOW_FETCH && result !== null);
            result = data.campaign;

            // Finds the currency from a campaign's data object
            // If not found, provides the campaign's name to identify which one is needed *now*
            const _campaignToCurrency = (result)=>{
                result = result.attributes;
                if (!result) return;
                const key = result.name;
                result = result.currency;
                if (result) {
                    CURRENCY_CACHE[key] = result;
                    console.log("Detected currency: "+result);
                }
                else console.log("Couldn't detect creator's currency");
                return { key , result };
            };

            if (result) result = result.data;
            if (result) result = _campaignToCurrency(result);
            if (result) return result.result;

            // When coming from home page, there's not *one* campaign objects but several references to various campaigns
            result = data.latest_campaigns;
            if (result) result = result.data;
            if (!result) return;

            for (let item of result) {
                result = _campaignToCurrency(item);
                if (!result) continue;

                const key = result.key;
                result = result.result;
                if (result || !key) continue; // result is never truthty in practice, as the API doesn't return the currency code in those smaller objects :(

                result = item.id;
                // An indirect lookup may be too expensive for all campaigns at once
                if (!result || !fetchAllowed || key !== name) continue;
                CURRENCY_CACHE[name] = null; // Prevents including fetches in a possible loop (see the guard check on top of the method)

                result = await fetch("https://www.patreon.com/api/campaigns/"+result);
                if (result && result.ok) result = await result.json();
                if (result) result = result.data;
                if (result) result =_campaignToCurrency(result);
                if (result) result = result.result;
                return result;
            };
        };

        const insertCurrency=(parent)=>{
            // Prevents an infinite loop
            if (parent.childNodes.length >= 2) return;

            FIND_CURRENCY(parent.textContent).then(currency=>{
                // In case insertions waited for fetches to happen
                if (!currency || parent.childNodes.length >= 2) return;
                console.log(currency);

                const container = global.document.createElement('div');
                console.log(parent.textContent);
                container.appendChild(document.createTextNode(currency));

                // We can reuse a few classes used by Patreon
                container.classList.add('cm-dMgEsi');
                container.classList.add('cm-LNraKM');
                container.classList.add('cm-DFAJDB');
                container.classList.add('cm-dupTbP');

                parent.appendChild(container);
            });
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
                    if (title) insertCurrency(title);
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
