// ==UserScript==
// @name         Wanikani: Autofocus notes area
// @namespace    http://tampermonkey.net/
// @version      0.1.2
// @description  Autofocus notes area in lessons and reviews after clicking "add note".
// @author       Kumirei
// @include      *wanikani.com/*/session
// @include      *preview.wanikani.com/*/session
// @require      https://greasyfork.org/scripts/432418-wait-for-selector/code/Wait%20For%20Selector.js?version=974318
// @grant        none
// ==/UserScript==

(function(wfs) {
    wfs.wait('div[class*="note"] textarea', function(elem) {
			elem.focus();
	});
})(window.wfs);