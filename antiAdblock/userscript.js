// ==UserScript==
// @name        Youtube/Twitch channel inserter
// @version     1.2
// @description Add the name of a content creator inside the URL, to allow adblocker whitelisting
// @author      laplongejunior
// @license     https://www.gnu.org/licenses/agpl-3.0.fr.html
// @match       *://*.youtube.com/*
// @match       *://*.twitch.tv/*
// @grant       GM.setValue
// @grant       GM.getValue
// @run-at      document-end
// ==/UserScript==

// Original concept found on https://greasyfork.org/en/scripts/22308-youtube-whitelist-channels-in-ublock-origin
// However, said script doesn't work anymore when I tested and I had to remake everything from scratch
// In *theory* my parameters should be retro-comaptible with whitelist using said script, but I never tested
// I also added partial Twitch support and a way to enable fullscreen easily as I'm using it in remote desktop hooked to a huge screen

// TOFIX:
// The "fullscreen prompt" doesn't show up on Twitch... but can Twitch even perform video-to-video redirection during fullscreen?

(function(global) { // I prefer getting the global object with "this" rather than using the name 'window', personal taste
	"use strict";

    // #####################
    // ### CONFIG /start ###
    // #####################

    // If TRUE, the script manually convert youtube's channel ID into the channel name
    // It makes the whitelist easier to maintain, but will cause a small delay during the conversion
    // Conversion is done by opening a popup to the channel's page when on an video from an unknown creator
    // The result is put into a cache, which will be updated if the channel page is opened manually later
    const RESOLVE_IDS = true;
    // If you have access to Youtube's API, you can use it for the channelnamr conversion
    // The key won't be used if ID resolution is turned off
    // WARNING: Use of Youtube's API is untested
    const YOUTUBE_KEY = "";

    // If TRUE, reloading a fullscreen video generates an auto-focused div, clicking or typing it in triggers fullscreen
    // Can be helpful if the computer is used as a remote machine controlling a TV, as the fullscreen button is tiny
    // Disabled by default as most users have a mouse :)
    const FULLSCREEN_RESTORATION = false;

    // If, for whatever reason, you don't want to add urls to your adblock
    // You can add channel names in this list
    // That'll add an extra "&whitelisted=1" parameter along the user channel
    // A default list *may* be useful if some channel's *purpose* is having ads (i dunno, maybe a only-ad channel for helping charities?)
    const HARDCODED_WHITELIST = [];
    // If TRUE, the script won't modify the URL for channels outside the hardcoded whitelist
    // (Corollary: this setting has no effect if HARDCODED_WHITELIST is empty)
    // + : avoids reloading non-whitelisted channels
    // - : impossible to use the adblock whitelist
    // The user parameter will be omited and the video won't auto-pause before the eventual redirection
    const NO_DEFAULT_REDIRECT = false;

    // #####################
    // #### CONFIG /end ####
    // #####################

  

    // There are three auto-generated arguments
    // ?user=CHANEL_NAME to be detected in an adblocker's whitelist
    // &fullscreen=0/1 used to enabled easy fullscreening
    // ?popup=origin (or nothing) only used when the script needs to open another page (and block this exact script from running)

    // This script obviously doesn't need to run in a popup used for id resolving
    const PARAM_RESOLVE = "origin=popup";
    if (location.href.match('(?:[?&#])('+PARAM_RESOLVE+')') !== null) return;

    // Fullscreen can only be initiated by a "user gesture"
    // Create a HUGE area to invite to click/type, thn redirect that to the video's control bar
    // It allows to trigger FS easily when from a small screen with remote desktop
    const initFullscreen = element => {
        // I won't comment this code, self-explanatory
        const triggerArea = document.createElement("div");
        element.addEventListener("click", ()=>triggerArea.remove());
        ["keypress","click"].forEach(gesture => triggerArea.addEventListener(gesture, ()=>element.click()));

        const closeButton = document.createElement("span");
        closeButton.addEventListener("click", (event) => {
            event.stopPropagation();
            triggerArea.remove();
        });

        const cStyle = closeButton.style;
        cStyle.position="absolute";
        cStyle.top = "0px";
        cStyle.right = "0px";
        cStyle.cursor = "pointer";

        closeButton.appendChild(document.createTextNode('[X]'));
        triggerArea.appendChild(closeButton);

        triggerArea.appendChild(document.createTextNode('Press a button or click to restore fullscreen'));
        triggerArea.appendChild(document.createElement("br"));

        const input = document.createElement("input");
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

        document.body.appendChild(triggerArea);
        // In my "remote phone" UX, focusing on a text field allows to simply input any key to restore FS
        input.focus();
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
            }, 1000); // 1 second
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
    const _querySelectorAll = HTMLDocument.prototype.querySelectorAll
    const querySelectorSafe = function(doc, selector) {
      const result = _querySelectorAll.call(doc, selector);
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

    // All the code above was rather generic functions not really related to the business tasks
    // NOW, the real script begins!

    // The name to store in the script engine's cache
    const VALUE_NAME = "channels";

    // Youtube is inconsistent about showing the channel ID or channel name when watching a video
    // However, no matter how a *channel* page is accessed, the search tab consistently shows the channel name if it exists
    // Works with both "custom" channel links and "legacy" account names
    // Two nitpicks here
    // 1) Twitch has no concept of a link ID, but JUST IN CASE, "youtube" is passed as a parameter and saved to allow seperate storages
    // 2) This method is called in two ways : a) by passing a popup, or b) by passing the global object when "normally" navigating a channel page
    const readChannelFromDom = (platform, win, id) => {
        const doc = win.document;
        let name = undefined;
      
        // The "search" option in a channel page, next to the "video" tab
        let link = querySelectorSafe(doc,'#form');
        if (link) {
          name = link.action.match("(?<="+location.hostname+"/).*(?=/search)")[0];
          const index = name.indexOf('/');
          if (index >= 0) name = name.substring(index+1);
        }
        else {
            // Some kid channels lack a search button...
            // https://www.youtube.com/watch?v=xooqiT-tm-4 => https://www.youtube.com/channel/UCTbN5fQiw9LJbLhkjGgXb2w
            link = querySelectorSafe(doc,'#meta > #channel-name > div > div > #text');
            if (!link) return null;
            link = link.textContent;

            for (const element of Array.from(doc.querySelectorAll('.yt-formatted-string')).filter(n=>n.textContent===link)) {
              const href = element.href;
              if (!href) continue;
              name = href.substring(href.lastIndexOf('/')+1);
              if (!name.startsWith('UC')) break;
            }
            if (!name) return null;
        }
        if (RESOLVE_IDS && id && id.startsWith('UC')) GM.setValue( VALUE_NAME+"-"+platform+"-"+id, name );
        return name;
    }

    // The Youtube API requires a (private) key to obtain a channel's name "the easy way"
    // But, as the channel page *can* provide it, we'll open the channel page when navigating a video
    // When the name is obtained, it's passed as a parameter to the callback function
    let popup = undefined;
    const identifyChannel = (platform, url, callback) => {
        // Avoids multi-triggering : if there's a popup currently resolving, no need to re-resolve
        if (popup !== undefined) return;
        const id = url.match("/(user|channel|c)/(.+)")[2];
        // Obviously, if the resolution is disabled, the callback is instantaneous :)
        if (!RESOLVE_IDS || !id.startsWith('UC')) return callback(id);

        // If we don't know the name yet...
        const loadName;
        if (YOUTUBE_KEY) loadName = ()=>{
            //TODO: Send a Youtube API request with the key
            
        };
        // If you don't like to setup an API account, there's a workaround : opening a popup...
        else loadName = ()=>{
            // ...we could open the channel window as a tab, but the change of navigation is even more annoying than opening a popup
            // At least the popup will have the minimal size, and it only needs a few seconds to obtain the search URL
            // Note: it only works because the popup is opened on the same domain! And we're already navigating on Youtube...
          const destination = url.substring(url.indexOf("/"));
            popup = global.open(destination+"#"+PARAM_RESOLVE, "_blank", 'width=1,height=1');
            // If popups aren't allowed, try with a tab
            if (popup === null) {
              console.error("Unable to open popup to detect YT channel's name! Please, open a new tab to go to "+destination);
              setTimeout(()=>{popup=undefined},10000);
            }
            else {
              // Once the popup is loaded, call an event and recall it after each added node
              popup.addEventListener("load", () => callFunctionAfterUpdates(popup, () => {
                // Search the name from the search URL, if found close the popup and "return" the value
                const channel = readChannelFromDom(platform, popup.window, id);
                if (!channel) return;
                callback(channel);
                popup.close();
                popup = null;
              }));
            }
        };

        // Load the name from the cache, if it's found "return" it immediately
        // Not in the cache, or broken cache? Look it by making an annoying request
        GM.getValue(VALUE_NAME+"-"+platform+"-"+id).then(name => {
            if (name) return callback(name);
            loadName();
        }).catch(loadName);
    };

    // clientSupport = does it allow to insert client-side arguments? (Twitch doesn't)
    // fullscreenControl = what is the "fullscreen" button?
    // user = patform-specific logic to extract the user ID from the content page
    let platformMap = new Map();

    platformMap.set(/\.youtube.com/,{
        clientSupport:true
        , fullscreenControl:()=>querySelectorSafe(document,".ytp-fullscreen-button")
        , user:callback=>{
            var PLATFORM = "youtube";
            let name = location.href.match("/(user|channel|c)/(.+)");
            name = readChannelFromDom(PLATFORM, window, name ? name[2] : null);
            // Channel page
            if (name) return callback(name);
            // The query selector is so simple it catches unrelated channels during global searches
            if (!location.pathname.substring(1).startsWith("watch")) return;
            // Video page
            const link = querySelectorSafe(document,'.ytd-video-owner-renderer > #container > div > yt-formatted-string > a');
            if (link) identifyChannel(PLATFORM, link.getAttribute('href'),callback);
        }
    });

    platformMap.set(/\.twitch.tv/,{clientSupport:false
        , fullscreenControl:()=> querySelectorSafe(document,"button[data-a-target=player-fullscreen-button]")
        , user:callback=>{
            let base = querySelectorSafe(document,'.channel-info-content')?.firstChild?.firstChild;
            if (!base) return;
          
            let link = base.lastChild?.firstChild?.lastChild?.firstChild?.firstChild?.firstChild;
            // Support for live from the channel page itself
            if (!link) {
                link = base.firstChild?.firstChild?.lastChild?.firstChild?.firstChild?.firstChild;
                if (!link) return;
            }
            callback(link.getAttribute("href").substring(1));
        }
    });

    let config = platformMap.find(hostname=>location.hostname.match(hostname));
    if (!config) return;

    // If the platform supports client-side parameters, use them to avoid sending unnecessary data
    const separator = (config.clientSupport ? '#':'?'), ADBLOCK_PARAM = "user", SCREEN_PARAM = "fullscreen", HARDCODED_PARAM = "whitelisted";

    // Detect if the fullscreen parameter is set
    let param = location.href;
    param = param.substring(param.indexOf(separator)+1).split("&").map(item => item.split("=")).find(pair => pair[0] === SCREEN_PARAM);
    // If the video is meant to be reloaded, first view should be paused
    let pauseVideo = !NO_DEFAULT_REDIRECT;
    // If fullscreen is a value, the first time the target is available we must alter the size
    let pendingScreen = (param && param[1] === '1');

    // Where we do the bulk of the work
    const userCheck = () => {      
        // We'll redirect, so at least avoid watching the same intro twice?
        if (pauseVideo) {
            const video = querySelectorSafe(document,"video");
            if (video) {
                pauseVideo = false;
                video.pause();
            }
        }
      
        if (pendingScreen) {
            // We need to retry until the video actually loaded
            const target = config.fullscreenControl();
            if (!target) return;
            // Remember that we already tried to FS once, then attempt to FS
            pendingScreen = false;
            initFullscreen(target);
        }

        // If no params, create them      
        let name = URLcontainsParam(location.href, ADBLOCK_PARAM,HARDCODED_PARAM);
        if (name) {
          // We currently don't use the previous parameter
          //name = name[name.length-1];
          return;
        }
      
        // Find the user, then "redirect" while adding it in a parameter
        // From there, adblockers will be able to react to the URL
        config.user(user => {
            const param = (href,name,param) => {
               // No need to append in current version
               /*
               let before, after;               
               const match = URLcontainsParam(href, name);
               if (match) {
                  const start = match.index;
                  before = href.substring(0,start);                  
                  after = href.substring(start+name.length+2+match[match.length-1].length);
               } else {
                  before = href;
                  after = "";
               }
               */
               const before = href, after = "";
               return before + ((before.indexOf(separator) == -1) ? separator : "&") + name+"="+encodeURIComponent(param) + after;
            };
            let url = location.href;

            // If there's a whitelist, add the parameter in the URL
            if (HARDCODED_WHITELIST.length != 0) {
                const whitelisted = HARDCODED_WHITELIST.includes(user);
                if (NO_DEFAULT_REDIRECT && !whitelisted) return;
                url = param(url, HARDCODED_PARAM,whitelisted?"1":"0");
            }

            if (!NO_DEFAULT_REDIRECT) url = param(url, ADBLOCK_PARAM, user);
            if (FULLSCREEN_RESTORATION) url = param(url, SCREEN_PARAM, document.fullscreenElement?'1':'0');
            location.replace(url);
        });
    }

	// If there's a DOM modification, schedule a new try
    callFunctionAfterUpdates(global, userCheck);
})(unsafeWindow||this);
