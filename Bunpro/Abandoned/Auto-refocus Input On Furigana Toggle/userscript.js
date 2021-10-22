// ==UserScript==
// @name         Bunpro: Auto-refocus input on furigana toggle
// @namespace    http://tampermonkey.net/
// @version      0.1.5
// @description  Refocuses the input field after you click a kanji to toggle furigana.
// @author       Kumirei
// @include      http://bunpro.jp*
// @include      https://bunpro.jp*
// @require      https://greasyfork.org/scripts/370623-bunpro-helpful-events/code/Bunpro:%20Helpful%20Events.js?version=974369
// @grant        none
// ==/UserScript==

(function() {
    $('HTML')[0].addEventListener('quiz-page', function() {
			$('.study-question-japanese').on('click', 'ruby', function() {$('#study-answer-input').focus();});
	});
})();
