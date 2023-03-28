// ==UserScript==
// @name         Wanikani: Review Answer Streak
// @namespace    http://tampermonkey.net/
// @version      1.1.4
// @description  Counts the number of times you have get review questions right in a row
// @author       Kumirei
// @match        https://www.wanikani.com/*
// @match        https://preview.wanikani.com/*
// @grant        none
// ==/UserScript==
/*jshint esversion: 8 */

;(function ($) {
    let body = document.body
    let page

    get_page()
    install_streak_count()

    // Listen for page changes
    document.addEventListener(`turbo:before-render`, (e) => {
        body = e.detail.newBody
        get_page()
        install_streak_count()
    })

    function get_page() {
        const path = window.location.pathname
        if (/^\/(DASHBOARD)?$/i.test(path)) page = 'dashboard'
        else if (/REVIEW(\/session)?/i.test(path)) page = 'reviews'
        else if (/LESSON(\/session)?/i.test(path)) page = 'lessons'
        else if (/EXTRA_STUDY(\/session)?/i.test(path)) page = 'extra_study'
        else page = 'other'
    }

    function install_streak_count() {
        // Create and insert element into page
        const elem = `
                <div id="streak" class="quiz-statistics__item"><div class="quiz-statistics__item-count">
                    <div class="quiz-statistics__item-count-icon"><i class="fa fa-trophy"></i></div>
                    <div class="count quiz-statistics__item-count-text" style="white-space: nowrap;">0 (0)</div>
                </div></div>
                `
        body.querySelector('.quiz-statistics')?.insertAdjacentHTML('afterbegin', elem)

        function update_display(streak, max) {
            const elem = body.querySelector('#streak .count')
            if (elem) elem.innerHTML = `${streak} (${max})`
        }

        // The object that keeps track of the current (and previous!) streak
        const streak = {
            current: {},
            prev: {},
            save: () =>
                localStorage.setItem(
                    `${page}_streak`,
                    JSON.stringify({ streak: streak.current.streak, max: streak.current.max }),
                ),
            load: () => {
                const data = {
                    questions: 0,
                    incorrect: 0,
                    ...JSON.parse(localStorage.getItem(`${page}_streak`) ?? '{"streak": 0, "max": 0}'),
                }
                streak.current = data
                streak.prev = data
            },
            undo: () => {
                streak.current = streak.prev
            },
            correct: (questions, incorrect) => {
                streak.prev = streak.current
                streak.current = {
                    questions,
                    incorrect,
                    streak: streak.current.streak + 1,
                    max: Math.max(streak.current.streak + 1, streak.current.max),
                }
            },
            incorrect: (questions, incorrect) => {
                streak.prev = streak.current
                streak.current = { questions, incorrect, streak: 0, max: streak.current.max }
            },
        }
        streak.load()
        update_display(streak.current.streak, streak.current.max)

        window.addEventListener('didAnswerQuestion', (e) => {
            let correct = 0
            let incorrect = 0
            for (let item of Object.values(e.detail.subjectWithStats.stats)) {
                correct += item.complete ? 1 : 0
                incorrect += item.incorrect
            }
            if (e.detail.results.passed) streak.correct(correct + incorrect, incorrect)
            else streak.incorrect(correct + incorrect, incorrect)
            streak.save()
            update_display(streak.current.streak, streak.current.max)
        })
    }
})(window.wkof, window.jQuery)
