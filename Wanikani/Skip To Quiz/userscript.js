// ==UserScript==
// @name         Wanikani: Skip to Quiz
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @description  Enables the quiz button without having to go through any of the lessons.
// @author       Kumirei
// @match        https://www.wanikani.com/lesson/session
// @match        https://preview.wanikani.com/lesson/session
// @grant        none
// ==/UserScript==

;(function ($) {
    // Wait until button is ready
    const interval = setInterval(() => {
        if (!$('#lesson > div:last-child ul > li:last-child button').length) return
        clearInterval(interval)
        run()
    }, 100)

    function run() {
        const quizButton = $('#lesson > div:last-child ul > li:last-child button')

        // Make quiz button look clickable
        quizButton.removeAttr('disabled').addClass('animate-pulse bg-green-400 wk-shadow')

        // Go to quiz when button is clicked
        quizButton.on('click', go_to_quiz)

        // Add hotkey
        $('body').on('keydown', (e) => {
            if (e.key === 'q' && !$.jStorage.get('l/quizActive')) {
                e.preventDefault()
                go_to_quiz()
            }
        })
    }

    function go_to_quiz() {
        $.jStorage.set('l/startQuiz', true)
        $.jStorage.set('l/quizReady', false)
    }
})(window.jQuery)
