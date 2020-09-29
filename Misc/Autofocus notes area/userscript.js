// ==UserScript==
// @name         Wanikani: Autofocus notes area
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  Autofocus notes area in lessons and reviews after clicking "add note".
// @author       Kumirei
// @include      *wanikani.com/*/session
// @include      *preview.wanikani.com/*/session
// @require      https://greasyfork.org/scripts/5392-waitforkeyelements/code/WaitForKeyElements.js?version=115012
// @grant        none
// ==/UserScript==

(function() {
    waitForKeyElements('div[class*="note"] textarea', function(elem) {
			elem.focus();
	});
})();
