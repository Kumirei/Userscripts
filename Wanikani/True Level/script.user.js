// ==UserScript==
// @name         Wanikani: True Level
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Don't level up until you finish all lessons from previous levels
// @author       Kumirei
// @include      /^https://(www|preview).wanikani.com/(dashboard)?/
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

;(async (wkof, $) => {
    // Script info
    const script_id = 'true_level'
    const script_name = 'True Level'

    // Initiate WKOF
    await confirm_wkof()
    wkof.include('ItemData')
    wkof.ready('ItemData').then(install_filter).then(update_counts)

    // Global variable
    let lowestLessonLevel = 99

    function install_filter() {
        wkof.ItemData.registry.sources.wk_items.filters.lowest_level_lessons = {
            type: 'checkbox',
            default: true,
            label: 'Lowest Level Lessons',
            filter_func: (filter_value, item) =>
                !filter_value ||
                (item.data.level === lowestLessonLevel &&
                    item.assignments?.srs_stage === 0 &&
                    item.assignments.unlocked_at),
            hover_tip: 'Get only lessons from the lowest available level',
            set_options: (options) => {
                options.assignments = true
            },
        }
    }

    async function update_counts() {
        const items = await wkof.ItemData.get_items('assignments')
        let lessons = items.filter((item) => item.assignments?.srs_stage === 0 && item.assignments.unlocked_at)
        lowestLessonLevel = lessons.reduce((lowest, item) => Math.min(lowest, item.data.level), lowestLessonLevel)
        const count = lessons.filter((item) => item.data.level === lowestLessonLevel).length
        // Update header count
        $('.navigation-shortcut--lessons span').text(count)
        $('.navigation-shortcut--lessons').attr('data-count', count)
        // Update summary page count
        $('#lessons-summary #lesson-queue-count').text(count)
        // Update big button count
        $('.lessons-and-reviews__lessons-button span').text(count)
        $('.lessons-and-reviews__lessons-button').attr('class', getClass(count))
        // Update level
        $('.user-summary__attributes > li:first-child a').text(`Level ${lowestLessonLevel}`)
        // TODO: Update progress
        //$('.dashboard-progress .progress-component h1').text(`Level ${lowestLessonLevel} Progress`)
        setTimeout(update_counts, (60 - new Date().getMinutes()) * 1000 * 60 + 1000) // Update counts within a minute of top of the hour
    }

    function getClass(count) {
        const threshhold = [500, 250, 100, 50, 25, 1, 0].filter((t) => t <= count)[0]
        return `lessons-and-reviews__button lessons-and-reviews__lessons-button lessons-and-reviews__lessons-button--${threshhold}`
    }

    // Makes sure that WKOF is installed
    async function confirm_wkof() {
        if (!wkof) {
            let response = confirm(
                `${script_name} requires WaniKani Open Framework.\nClick "OK" to be forwarded to installation instructions.`,
            )
            if (response) {
                window.location.href =
                    'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549'
            }
        }
    }
})(window.wkof, window.jQuery)
