// ==UserScript==
// @name        Wanikani: Hotkey for other voice actor
// @description Binds the I key to play the audio from the other vocie actor
// @include     *wanikani.com/review/session*
// @include     *wanikani.com/lesson/session*
// @version     1.1.2
// @author      Kumirei
// @license     MIT; http://opensource.org/licenses/MIT
// @run-at      document-end
// @grant       none
// @namespace https://greasyfork.org/users/105717
// ==/UserScript==
/*jshint esversion: 8 */

(function() {
	const key = "i";
    $(document).on('keydown', (event)=>{
		let audio_disabled = $('#option-audio')[0].className == "disabled";
		if ($('#lessons').length && $('#lessons > div > header')[0].className != "quiz") audio_disabled = false;
		let tag = event.target.tagName;
		if (tag != 'TEXTAREA' && tag != 'INPUT' && event.key == key && !audio_disabled) $('.pronunciation-group audio:not(.preferred)')[0].play();
	});
})();
