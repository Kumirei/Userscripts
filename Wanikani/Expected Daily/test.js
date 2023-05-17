// ==UserScript==
// @name         Wanikani: Expected Daily Test
// @namespace    Wanikani: Expected Daily Number of Reviews
// @version      1.0.0
// @description  Displays the expected number of daily reviews given the current SRS distribution
// @author       Kumirei
// @match        https://www.wanikani.com
// @match        https://www.wanikani.com/dashboard
// @include      *preview.wanikani.com*
// @grant        none
// ==/UserScript==

;(function () {
    //check that the Wanikani Framework is installed
    var script_name = 'Expected Daily Number of Reviews'
    if (!window.wkof) {
        if (
            confirm(
                script_name +
                    ' requires Wanikani Open Framework.\nDo you want to be forwarded to the installation instructions?',
            )
        )
            window.location.href =
                'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549'
        return
    }
    // WKOF is installed, run the script
    wkof.include('ItemData')
    wkof.ready('ItemData').then(fetch_items).then(filter_items).then(calculate_score).then(display)

    // Get the items from WKOF
    async function fetch_items() {
        return wkof.ItemData.get_items('assignments')
    }

    // Filter out the items we don't need
    function filter_items(items) {
        return items.filter((item) => item.assignments && item.assignments.available_at !== null)
    }

    // Calculate the expected daily score
    function calculate_score(items) {
        const date_now = new Date().toISOString()
        const available_now = items.filter((item) => item.assignments.available_at <= date_now)
        const available_later = items.filter((item) => item.assignments.available_at > date_now)
        const time_now = Date.now()
        const ms_day = 1000 * 60 * 60 * 24 // Milliseconds in a day
        const score_available = available_now.length // Currently available reviews count for more
        const score_later = available_later.reduce(
            // +1 at the end so that no denomenator is ever below 1, causing the fraction to blow up
            (score, item) => score + 1 / ((Date.parse(item.assignments.available_at) - time_now) / ms_day + 1),
            0,
        )
        return score_available + score_later
    }

    // Display the number on the dashboard
    function display(score) {
        // For now just display it as a title on the Ganbarometer Gauge
        document.querySelector('h1.gbHeader')?.setAttribute('title', `Expected Daily: ${Math.round(score)}`)
    }
})()
