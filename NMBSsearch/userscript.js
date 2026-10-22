// ==UserScript==
// @name         NMBS advanced search
// @version      0.0.1
// @description  Add link to see more info about a train line during the searches, either from the official tools or from BeluxTrain
// @author       laplongejunior
// @license      https://www.gnu.org/licenses/agpl-3.0.fr.html
// @match        https://www.belgiantrain.be/*
// @match        https://simulator.belgiantrain.be/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function(global) {
	"use strict";
	const console = global.console;
	const doc = global.document;
    const href = global.location.href;

    const _URLcontainsParam = (url, ...names) => {
        let params = "";
        for (const name of names) {
            params += "|" + name;
        }
        let result = url.match('(?:[?&#]('+RegExp.escape(params.substring(1))+')=)((?:[^&]+|$))');
        console.log(url);
        console.log('(?:[?&#]('+RegExp.escape(params.substring(1))+')=)((?:[^&]+|$))');
        console.log(result);
        if (result) result[2] = decodeURI(result[2]);
        return result;
    };

    // Search-by-station doesn't allow to autofill with a parameter, so we'll add it ourselves!
    if (href.match("search-by-station")) {
        const target = doc.querySelector("#StationReference-input");

        const param = _URLcontainsParam(global.location.href, "stationReference");
        if (param && !target.value) target.value = param[2].toUpperCase();
        return;
    }

    // Weirdly, the loading of the TrainPlus form happens too late... even waiting for body mutations doesn't work.
    const TRAINPLUS = "trainplus/itinerary";
    if (href.match(TRAINPLUS)) {
        setTimeout(()=>{
            let target = doc.querySelector("#_r_f_");
            if (!target) return;
            let param = _URLcontainsParam(global.location.href, "trajects[0][nameFrom]");
            if (param && !target.value) target.value = param[2].toUpperCase();
            target = doc.querySelector("#_r_p_");
            param = _URLcontainsParam(global.location.href, "trajects[0][nameTo]");
            if (param&& !target.value) target.value = param[2].toUpperCase();
        }, 500);
        return;
    }

    const target = doc.querySelector(".sidebar-panel-wrapper");
    if (!target) return;

    // Utils method
    const _eleQuerySelectorAll = Element.prototype.querySelectorAll;
    const _docQuerySelectorAll = Document.prototype.querySelectorAll;
	const _querySelectorSafe = function(element, selector) {
      const result = (element instanceof Document ? _docQuerySelectorAll : _eleQuerySelectorAll).call(element, selector);
      if (result.length == 1) return result.item(0);
      if (result.length > 1) {
        global.console.warn("Several matches found for querySelector! Discarding...");
        global.console.warn(result);
      }
      return null;
    };

	const _cleanText = node=>node.textContent.trim()/*.toLowerCase()*/;

    const NOW = new Date();
    const LANG = "/"+ _cleanText(doc.querySelector(".navigation-bar__item-langswitch a")) +"/";
    const websiteSearch = "https://www.belgiantrain.be"+LANG+"travel-info/current/search-by-";

	const run = node=>{

        const date = doc.querySelector("#DatePicker").value;

        const YEAR = date.substring(4,8);
        let isoParam = YEAR+"-"+date.substring(2,4)+"-"+date.substring(0,2);
        const searchDate = new Date(isoParam+"T00:00");
        const dateDiff = Math.ceil((searchDate-NOW)/(1000*60*60*24));
        isoParam = (dateDiff < -1 || dateDiff > 2) ? "" : "&date="+isoParam;

        let weekendParam = searchDate.getDay();
        weekendParam = "&trajects[0][travelPeriod]="+((weekendParam==0||weekendParam==6)?"WEEKEND":"OFFPEAK");

        const originParam = "&trajects[0][nameFrom]="+encodeURI(doc.querySelector("#Origin_Reference-input").value);
        const destinationParam = "&trajects[0][nameTo]="+encodeURI(doc.querySelector("#Destination_Reference-input").value);

        const containerTemplate = doc.createElement("span");
		const linkTemplate = doc.createElement("a");
		linkTemplate.setAttribute("target","_blank");
		linkTemplate.setAttribute("rel","noopener noreferrer");

        for (const buyBtn of node.querySelectorAll(".sidebar-panel__topnav")) {
            console.warn(buyBtn);

            const container = containerTemplate.cloneNode(true);
            container.classList.add('userscriptInsertSimulator');

            container.appendChild(doc.createElement("br"));

            let action;

            action = linkTemplate.cloneNode(true);
            action.setAttribute("href","https://simulator.belgiantrain.be"+LANG+TRAINPLUS+"?segment=ADULT"+weekendParam+originParam+destinationParam);
            action.append('Train+');
            container.appendChild(action);

            buyBtn.appendChild(container);
        }

        for (const detail of node.querySelectorAll(".planner-dtl__detail:not(.pad-top-sm-40)")) {
            const lineID = _cleanText(detail.querySelector("span")).split(" ")[1];

            const container = containerTemplate.cloneNode(true);
            container.classList.add('userscriptInsertTrack');

            let action;

            action = linkTemplate.cloneNode(true);
            // Limit to one day into the past, two days into the future
            action.setAttribute("href",websiteSearch+"train-number?trainNumber="+lineID+isoParam);
            action.append('In Full');
            container.appendChild(action);

            container.appendChild(doc.createTextNode(' '));

            action = linkTemplate.cloneNode(true);
            action.setAttribute("href","https://www.beluxtrains.net"+LANG+"index.php?page=file&id_code="+YEAR+"0100"+lineID);
            action.append('BeluxTrain');
            container.appendChild(action);

            detail.insertBefore(container, detail.children[1]);
        }

        for (const detail of node.querySelectorAll(".planner-dtl__lbl")) {
            const stationID = encodeURI(_cleanText(detail.childNodes[2]));

            const container = containerTemplate.cloneNode(true);
            container.classList.add('userscriptInsertStation');

            let action;

            action = linkTemplate.cloneNode(true);
            action.setAttribute("href",websiteSearch+"station#stationReference="+stationID);
            action.append('Station');
            container.appendChild(action);

            detail.appendChild(container);
        }
    };

    new MutationObserver(
        (mutationList,observer)=>{for (const mutation of mutationList) run(mutation.target)})
        .observe(target, {childList:true, subtree:true});
    run(target);

})(window);
