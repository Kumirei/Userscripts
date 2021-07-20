// ==UserScript==
// @name        Wanikani: Hotkey for other voice actor
// @description Binds the I key to play the audio from the other vocie actor
// @include     *wanikani.com/review/session*
// @include     *wanikani.com/lesson/session*
// @version     1.1.5
// @author      Kumirei
// @license     MIT; http://opensource.org/licenses/MIT
// @run-at      document-end
// @grant       none
// @namespace https://greasyfork.org/users/105717
// ==/UserScript==

;(function () {
    const key = 'i'
    $(document).on('keydown', (event) => {
        let audio_disabled = $('#option-audio')[0].className == 'disabled'
        if ($('#lessons').length && $('#lessons > div > header')[0].className != 'quiz') audio_disabled = false
        let tag = event.target.tagName
        if (tag != 'TEXTAREA' && tag != 'INPUT' && event.key == key && !audio_disabled) play_other_voice()
    })

    function play_other_voice() {
        let audio = new Audio()
        let audios = $.jStorage.get('currentItem').aud
        if ($('#lessons').length) {
            audios = $.jStorage.get('l/currentLesson').aud
            if ($.jStorage.get('l/quizActive')) audios = $.jStorage.get('l/currentQuizItem').aud
        }
        let vaAudio = audios.filter((a) => a.voice_actor_id == (window.WaniKani.default_voice_actor_id % 2) + 1)
        console.log(vaAudio);
        vaAudio.forEach((a) =>
            audio.insertAdjacentHTML('beforeend', `<source src="${a.url}" type+"${a.content_type}">`),
        )
        audio.play()
    }
})()
