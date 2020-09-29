// ==UserScript==
// @name         Wanikani: Skip to Quiz
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  Enables the quiz button without having to go through any of the lessons.
// @author       Kumirei
// @match        https://www.wanikani.com/lesson/session
// @include      *preview.wanikani.com/lesson/session
// @require      https://greasyfork.org/scripts/5392-waitforkeyelements/code/WaitForKeyElements.js?version=115012
// @grant        none
// ==/UserScript==

(function() {
		waitForKeyElements('li[data-index="quiz"]', function(e) {
				e.addClass('active-quiz');
		});
})();
