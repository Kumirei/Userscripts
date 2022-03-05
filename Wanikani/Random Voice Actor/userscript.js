// ==UserScript==
// @name        Wanikani: Random voice actor
// @description Randomizes the preferred voice actor
// @include     /^https://(www|preview).wanikani.com/(lesson|review|extra_study)/session/
// @version     1.2.0
// @author      Kumirei
// @license     MIT; http://opensource.org/licenses/MIT
// @run-at      document-end
// @grant       none
// @namespace   https://greasyfork.org/users/105717
// ==/UserScript==

;(function () {
    $.jStorage.listenKeyChange('currentItem', randomize_voice_actor)
    $.jStorage.listenKeyChange('l/currentQuizItem', randomize_voice_actor)
    $.jStorage.listenKeyChange('l/currentLesson', randomize_voice_actor)

    function randomize_voice_actor() {
        let r = Math.random()
        let voice_actor = r > 0.5 ? 2 : 1
        WaniKani.default_voice_actor_id = voice_actor
    }
})()
