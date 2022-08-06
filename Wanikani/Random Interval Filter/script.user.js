// ==UserScript==
// @name         Wanikani: WKOF Interval Spread Filter
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Extends the SRS interval by a random amount by filtering out items that are not within the interval.
// @author       Kumirei
// @include      /^https://(www|preview).wanikani.com/((dashboard)?$|((review|lesson|extra_study)/session))/
// @grant        none
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

;(async () => {
    // Script info
    const script_id = 'interval_spread_filter'
    const script_name = 'WKOF Interval Spread Filter'

    // Initiate WKOF
    await confirm_wkof()
    wkof.include('ItemData')
    wkof.ready('ItemData.registry').then(install_filter)

    function install_filter() {
        // Filters by how overdue items are
        wkof.ItemData.registry.sources.wk_items.filters[`${script_id}`] = {
            type: 'number',
            default: 0,
            label: '% Spread Range',
            hover_tip:
                'The maximum percentage to spread the interval by. For example, if this is set to 10, then the interval will be extended by a random amount between 0% and 10%.',
            filter_func: (value, item) => {
                if (!item.assignments?.available_at) return false
                const overdue = calculate_overdue(item)
                const spread = (prng(item.assignments.available_at) * value) / 100
                return overdue > spread
            },
            set_options: function (options) {
                options.assignments = true
            },
        }
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

    // Calculate how overdue an item is based on its available_at date and SRS stage
    function calculate_overdue(item) {
        const SRS_DURATIONS = [4, 8, 23, 47, 167, 335, 719, 2879, Infinity].map((time) => time * 3600000)
        // Items without assignments or due dates, and burned items, are not overdue
        if (!item.assignments || !item.assignments.available_at || item.assignments.srs_stage == 9) return -1
        const dueMsAgo = Date.now() - Date.parse(item.assignments.available_at)
        return dueMsAgo / SRS_DURATIONS[item.assignments.srs_stage - 1]
    }

    // Creates a new PRNG
    function prng(seed) {
        return mulberry32(xmur3(seed)())()
    }

    // Seed generator for PRNG
    function xmur3(str) {
        for (var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
            (h = Math.imul(h ^ str.charCodeAt(i), 3432918353)), (h = (h << 13) | (h >>> 19))
        return function () {
            h = Math.imul(h ^ (h >>> 16), 2246822507)
            h = Math.imul(h ^ (h >>> 13), 3266489909)
            return (h ^= h >>> 16) >>> 0
        }
    }

    // Seedable PRNG
    function mulberry32(a) {
        return function () {
            var t = (a += 0x6d2b79f5)
            t = Math.imul(t ^ (t >>> 15), t | 1)
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296
        }
    }
})()
