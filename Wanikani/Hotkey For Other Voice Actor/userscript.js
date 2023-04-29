// ==UserScript==
// @name        Wanikani: Hotkey for other voice actor
// @description Binds the I key to play the audio from the other voice actor
// @match       https://www.wanikani.com/*
// @match       https://preview.wanikani.com/*
// @version     1.1.6
// @author      Kumirei
// @license     MIT; http://opensource.org/licenses/MIT
// @run-at      document-end
// @grant       none
// @namespace https://greasyfork.org/users/105717
// ==/UserScript==

;(function () {
    const key = 'i'

    window.addEventListener('keydown', (event) => {
        if (event.key !== key) return

        // Not a quiz page
        const has_audio = !!document.querySelector('.additional-content__item--audio')
        if (!has_audio) return

        // Not ready to play audio
        let audio_disabled = !!document
            .querySelector('.additional-content__item--audio')
            .classList.contains('additional-content__item--disabled')
        if (audio_disabled) return

        // Currently typing
        if (/textarea|input/i.test(event.target.tagName)) return

        play_other_voice()
    })

    function play_other_voice() {
        // Get URL of current VA (if any)
        const quizAudioSource = document.querySelector('audio.quiz-audio__audio source:first-child')?.src
        if (!quizAudioSource) return // Don't do anything if no audio

        // Parse items, find correct item, find entered reading, find entered pronunciation, pick different pronunciation of same reading
        const items = JSON.parse(
            document.querySelector('#quiz-queue script[data-quiz-queue-target="subjects"]').textContent,
        )
        for (let item of items || []) {
            for (let reading of item.readings || []) {
                let isCorrectReading = false
                let currentPronunciation = null
                pronunciations: for (let pronunciation of reading.pronunciations || []) {
                    for (let source of pronunciation.sources || []) {
                        if (source.url === quizAudioSource) {
                            isCorrectReading = true
                            currentPronunciation = pronunciation
                            break pronunciations
                        }
                    }
                }
                if (!isCorrectReading) continue

                const pronunciation = reading.pronunciations.find(
                    (pronunciation) => pronunciation !== currentPronunciation,
                )
                const source = pronunciation.sources[0].url
                const audio = new Audio(source)
                audio.play()
                return
            }
        }
    }
})()
