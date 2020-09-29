// ==UserScript==
// @name        Wanikani: Random voice actor
// @description Randomises the preferred voice actor
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
	let rand = Math.random;
	$.jStorage.listenKeyChange('currentItem', randomize_voice_actor);
	$.jStorage.listenKeyChange('l/currentQuizItem', randomize_voice_actor);
	$.jStorage.listenKeyChange('l/currentLesson', randomize_voice_actor);

	function randomize_voice_actor() {
		let r = rand();
		let voice_actor = (r > 0.5 ? 2 : 1);
		WaniKani.default_voice_actor_id = voice_actor;
	}
})();
