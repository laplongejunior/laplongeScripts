// ==UserScript==
// @name		Adult platforms NSFW blur
// @version		0.0.3
// @description		When looking watching SFW content on NSFW platforms, blurs recommendations for NSFW content. !WON'T AFFECT ADS!
// @author		laplongejunior
// @license		https://www.gnu.org/licenses/agpl-3.0.fr.html
// @match		https://*.pornhub.com/*
// @run-at		document-start
// ==/UserScript==

// Use this statement if you don't mind having downloaded up-to-date code instead of having a in-code replacement
// @require		https://cdn.jsdelivr.net/gh/laplongejunior/laplongeScripts/utilityLib/laplongeLib.js

(function(global) { // I prefer getting the global object with "this" rather than using the name 'window', personal taste
	"use strict";

	// #####################
	// ### CONFIG /start ###
	// #####################

	let SFW_CREATORS = ['inlacrimaelacrima', /*'balrogvt', 'laplongejunior',*/ 'tastyfps', 'bricehere'];

	// Not implemented yet
	// Example video : indigowhite's video about emotional support (thumbnail is kinda SFW)
	let ALLOWED_VIDEOS = ['647276b354344'];
	// Example video : tastyfps's showing 235 kills, as the thumbnail shows the Guiness World Record's logo, ew! ( ;D )
	let BLOCKED_VIDEOS = ['ph63af5cd06d2cf'];

	// #####################
	// #### CONFIG /end ####
	// #####################

	// #####################################
	// #### Lib replacement starts here ####
	// #####################################

	const _eleQuerySelectorAll = Element.prototype.querySelectorAll;
	const _docQuerySelectorAll = Document.prototype.querySelectorAll;
	global.laplongeUtils = {
		// Basically, calls callback once, then recalls it everytime there's a new node
		// We use win instead of "window" because this function must also work with the data-resolution popup
		runFunctionAfterUpdates: (doc, callback) => {
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
		querySelectorSafe: (element, selector) => {
			const result = (element instanceof Document ? _docQuerySelectorAll : _eleQuerySelectorAll).call(element, selector);
			if (result.length == 1) return result.item(0);
			if (result.length > 1) {
				global.console.warn("Several matches found for querySelector! Discarding...");
				global.console.warn(result);
			}
			return null;
		},

		lowerCaseArray: (array) => {
			const result = [];
			for (let item of array) result.push(item.toLowerCase());
			return result;
		},

		URLcontainsParam: (url, ...names) => {
			let params = "";
			for (const name of names) params += "|" + name;
			return url.match('(?:[?&#]('+params.substring(1)+')=)((?:[^&]+|$))');
		}
	};

	// ############################################
	// #### Actual scripting stuff starts here ####
	// ############################################

	// To allow easy redirects
	const console = global.console;
	const UTILS = global.laplongeUtils;

	// Used for URL matching
	SFW_CREATORS = UTILS.lowerCaseArray(SFW_CREATORS);
	ALLOWED_VIDEOS = UTILS.lowerCaseArray(ALLOWED_VIDEOS);
	BLOCKED_VIDEOS = UTILS.lowerCaseArray(BLOCKED_VIDEOS);

	const isCreatorSFW = element=>{
		if (!element) return false;
		const href = element.href;
		if (!href) return false;
		const parts = href.split("/");
		for (let i = 0; i < parts.length-1; i++) {
			const part = parts[i];
			if (part === "model" || part === "users" || part === "pornstar" || part == "channels") return SFW_CREATORS.includes(parts[i+1]);
		}
		return false;
	};
	const isContentAllowed = element=>{
		if (!element) return null;
		const href = element.href;
		if (!href) return null;
		const paramName = "viewkey";
		const params = UTILS.URLcontainsParam(href, paramName);
		if (!params) return null;
		if (params[1] === paramName) {
			const id = params[2];
			if (ALLOWED_VIDEOS.includes(id)) return true;
			if (BLOCKED_VIDEOS.includes(id)) return false;
		}
		return null;
	};

	// Note that determining the channel space's owner with channelCard is not enough to know who is in charge of the content
	// For example, a subscription notification is initiated by channel A, but the profile picture in it is in control of channel B
	let SFWcreator = isCreatorSFW(global.location);

	let processed = [];
	// Because checking specific elements is hard, it's possible we'll try to blur a specific picture after whitelisting an entire group of pictures
	// In that case, the generic "all images" rule will be trumped by the prior specific rule about a group of image
	const recursiveCheck = (item)=>{
		if (!item) return false;
		if (processed.includes(item)) return true;
		return recursiveCheck(item.parentElement);
	};

	// This function receives an image dans determines if it's source is NSFW. If it is, the script does its best to put it under a disabled-on-click blur effect
	const censorImage = (item,SFWcheck)=>{
		// Skips the platform's logo
		// Fix : item.title === platformName becomes false when the logo changes for special days (like national holidays or a star's birthday)
		// href auto-inserts the localized domainname so we'll check the literal attribute
		if (!item || item.parentElement.getAttribute("href") === "/" || recursiveCheck(item)) return false;
		processed.push(item);

		let container = item.parentElement;
		// Don't run checks for the content foundby rules that always need to be censored
		// A small optimisation that makes testing a whole lot easier :)
		if (SFWcheck) {
			// Check the video itself and not only the uploader
			const detection = isContentAllowed(container);
			if (detection === true) return false;
			if (detection !== false) {
				// Creators-only : ignore SFW avatar pictures
				if (isCreatorSFW(container)) return false;
				// Also exclude the picture from the infotip when we mouse over a small avatar picture
				if (isCreatorSFW(UTILS.querySelectorSafe(container,".username"))) return false;

				let data = container.parentElement.parentElement;

				// Ignore videos made by SFW-creators
				if (isCreatorSFW(UTILS.querySelectorSafe(data,".videoUploaderBlock .usernameWrap a"))) return false;

				// Creators-only : ignore upload notification
				if (SFWcreator) {
					const tableSection = data.parentElement.parentElement;
					if (tableSection.id === "videosUploadedSection" || tableSection.id === "modelMostRecentVideosSection") return false;
				}
			}
		}

		// The platform replaces thumbs by video segments when moused over
		// In those cases, blurring the parent is the sanest way
		if (item.classList.contains("js-videoPreview")) item = container;

		const oldFilter = item.style.filter;
		if (item.style.filter.includes('blur')) {
			console.error('An item is already blurred');
			console.error(item);
			return false;
		}

		item.style.filter += ' blur(10px)';

		// Shortcircuits the first click to remove the blur effect
		const eventType = 'click';
		const handler = event=>{
			container.removeEventListener(eventType, handler);
			item.style.filter=oldFilter;
			console.info('Click has been performed to unblur an element');
			console.info(item);

			event.stopPropagation();
			event.preventDefault();
			return false;
		};
		container.addEventListener(eventType, handler);
		return true;
	};

	// Where we do the bulk of the work
	// It runs on each visual update and it's job is to identify what parts of the page needs to be checked by the censor method
	const userCheck = (doc)=> {
		// Detection in album page
		// Can't be performed earlier because the page wasn't loaded yet
		if (!SFWcreator) {
			// Can't use getElementById because "doc" can sometimes be a section to optimise lookups
			var album = UTILS.querySelectorSafe(doc, "#profileBoxPhotoAlbum");
			if (album && isCreatorSFW(UTILS.querySelectorSafe(album, ".usernameLink"))) SFWcreator = true;
		}

		const withCheck = item=>censorImage(item,true); // Either blurs the target or make it exempted if SFW content
		const forcedCensor = item=>censorImage(item,false); // ALWAYS blurs the target (if it wasn't already processed earlier)

		// Before blocking all animated thumbnails, we first need to exclude the "all videos from this creator" section on the model page
		// Each individual video, ofc, won't link to the creator in that case because all videos on that page are from the same creator
		// Ofc, we need to "exclude from the exclusion" videos that are on the NSFW blocklist
		if (SFWcreator) doc.querySelectorAll(".profileVids .linkVideoThumb").forEach(item=>{if (isContentAllowed(item)!==false) processed.push(item)});

		// Most recommendations could be checked by this simple rule
		//doc.querySelectorAll(".wrap .phimage img").forEach(withCheck);
		// For the weird mixed-playlists in the categories header
		// Sadly it only really works in forcedCensor mode if the previous rule already ran
		Array.from(doc.getElementsByClassName("js-videoThumb")).forEach(withCheck);

		// Censors the avatar pictures
		Array.from(doc.getElementsByClassName("avatarTrigger")).forEach(withCheck);		// Album page
		Array.from(doc.getElementsByClassName("avatarIcon")).forEach(withCheck);		// Model page
		Array.from(doc.getElementsByClassName("avatarPornStar")).forEach(withCheck);	// Subs to star
		Array.from(doc.getElementsByClassName("avatarCover")).forEach(withCheck);		// Tooltip banner

		// Banner of creator pages
		if (!SFWcreator) {
			// For model
			doc.querySelectorAll(".topProfileHeader img").forEach(withCheck);
			// For channels
			doc.querySelectorAll("#topProfileHeader img").forEach(withCheck);

			// Filter banner and avatar when a channel is feature in search results
			withCheck(UTILS.querySelectorSafe(doc, "#coverPictureDefault"));
			doc.querySelectorAll(".avatar img").forEach(withCheck);

			// Static photo categories are set as background image which brings two issues :
			// 1) They avoid the img tag detection because of the lack of a dedicated tag
			// 2) Blurring the responsible element causes to blur its *children* as well
			// There's no styling way to "blur a parent only" (besides fixing their rendering structure so we'll have to rely on the "click to unblur" system
			Array.from(doc.getElementsByClassName("js_lazy_bkg")).forEach(item=>{
				if (forcedCensor(item)) console.warn('An element has been blurred due to background-image rule');
			});
		}

		// All gifs in the platform's header should be blurred. No exceptions! D:
		doc.querySelectorAll("a > .gifVideo").forEach(forcedCensor);

		// Censors basically everything unspecified yet, like categories. Just in case
		// Because this rule targets A LOT of image with different situations, we'll rely on the prior "an image is only handled once" check to ignore exceptions
		doc.querySelectorAll("a > img,video :not(.headerContainer) :not(.topProfileHeader) :not(#topProfileHeader)").forEach(forcedCensor);
	};

	// If there's a DOM modification, schedule a new try
	let observer = UTILS.runFunctionAfterUpdates(global.document, ()=>{
		let doc = global.document;
		let body = doc.body;
		// document-start means body doesn't exist yet, so we'll precise the trigger at runtime
		if (!body) {
			userCheck(doc);
			return;
		}
		observer.disconnect();
		UTILS.runFunctionAfterUpdates(body, ()=>userCheck(body));
	});

})(unsafeWindow||this);
