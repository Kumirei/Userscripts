// ==UserScript==
// @name         Wanikani: Back to back
// @namespace    http://tampermonkey.net/
// @version      1.2.1
// @description  Makes reading and meaning appear back to back in reviews and lessons
// @author       Kumirei
// @include      /^https://(www|preview).wanikani.com/(lesson|review|extra_study)/session/
// @license      MIT
// @grant        none
// ==/UserScript==

;(function (wkof, $) {
    // Page related info
    const Page = { REVIEWS: 0, LESSONS: 1, EXTRA_STUDY: 2, OTHER: 3 }
    let page = Page.OTHER
    if (/REVIEW/i.test(location.pathname)) page = Page.REVIEWS
    else if (/LESSON/i.test(location.pathname)) page = Page.LESSONS
    else if (/EXTRA_STUDY/i.test(location.pathname)) page = Page.EXTRA_STUDY
    const reviewsOrExtraStudy = page === Page.REVIEWS || page === Page.EXTRA_STUDY

    const currentItemKey = reviewsOrExtraStudy ? 'currentItem' : 'l/currentQuizItem'
    const questionTypeKey = reviewsOrExtraStudy ? 'questionType' : 'l/questionType'
    const UIDPrefix = reviewsOrExtraStudy ? '' : 'l/stats/'
    let traceFunctionName = ''
    if (page == Page.REVIEWS) traceFunctionName = /randomQuestion/
    else if (page == Page.LESSONS) traceFunctionName = /selectItem/
    else if (page == Page.EXTRA_STUDY) traceFunctionName = /selectQuestion/

    // Script info
    const script_name = 'Back 2 Back'
    const script_id = 'back2back'

    // Make sure WKOF is installed
    confirm_wkof(script_name).then(start)

    // Startup
    function start() {
        wkof.include('Menu,Settings')
        wkof.ready('Menu,Settings').then(load_settings).then(install)
    }

    // Installs script functions on page
    function install() {
        install_menu()
        install_back2back()
        install_prioritization()

        console.log(
            'Beware, "Back To Back" is installed and may cause other scripts using Math.random ' +
                `in a function called ${traceFunctionName} to misbehave.`,
        )
    }

    // Set up back to back meaning/reading reviews
    function install_back2back() {
        // Replace Math.random only for the wanikani script this is done by throwing an error and
        // checking the trace to see if either of the functions 'randomQuestion' (reviews page),
        // 'selectItem' (lessons page), or 'selectItem' (extra study page) are present. WK uses
        // functions with these names to pick the next question, so we must alter the behavior
        // of Math.random only when called from either of those functions.
        const old_random = Math.random
        const new_random = function () {
            const match = traceFunctionName.exec(new Error().stack)
            if (match && wkof.settings[script_id].active) return 0
            return old_random()
        }
        Math.random = new_random
        // Set item 0 in active queue to current item so the first item will be back to back
        if (reviewsOrExtraStudy) {
            // If active queue is not yet populated, wait until it is to set the currentItem
            const callback = () => {
                $.jStorage.set(currentItemKey, $.jStorage.get('activeQueue')[0])
                $.jStorage.stopListening('activeQueue', callback)
            }
            if ($.jStorage.get('activeQueue').length) callback()
            else $.jStorage.listenKeyChange('activeQueue', callback)
        }
    }

    // Set up prioritization of reading or meaning
    function install_prioritization() {
        // Run every time item changes
        $.jStorage.listenKeyChange(currentItemKey, prioritize)
        // Initialize session to prioritized question type
        prioritize()
    }

    // Prioritize reading or meaning
    function prioritize() {
        const prio = wkof.settings[script_id].prioritize
        const item = $.jStorage.get(currentItemKey)
        // Skip if item is a radical, it is already the right question, or no priority is selected
        if (item.type == 'Radical' || $.jStorage.get(questionTypeKey) == prio || 'none' == prio) return
        const UID = (item.type == 'Kanji' ? 'k' : 'v') + item.id
        const done = $.jStorage.get(UIDPrefix + UID)
        // Change the question if no question has been answered yet,
        // Or the priority question has not been answered correctly yet
        if (!done || !done[prio == 'reading' ? 'rc' : 'mc']) {
            $.jStorage.set(questionTypeKey, prio)
            $.jStorage.set(currentItemKey, item)
        }
    }

    /* ----------------------------------------------------------*/
    // WKOF setup
    /* ----------------------------------------------------------*/

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
            return
        }
    }

    // Load WKOF settings
    function load_settings() {
        const defaults = {
            prioritize: 'none',
            active: true,
        }
        return wkof.Settings.load(script_id, defaults)
    }

    // Installs the options button in the menu
    function install_menu() {
        const config = {
            name: script_id,
            submenu: 'Settings',
            title: script_name,
            on_click: open_settings,
        }
        wkof.Menu.insert_script_link(config)
    }

    // Opens settings dialogue when button is pressed
    function open_settings() {
        let config = {
            script_id: script_id,
            title: script_name,
            on_save: prioritize,
            content: {
                active: { type: 'checkbox', label: 'Active', default: true },
                prioritize: {
                    type: 'dropdown',
                    label: 'Prioritize',
                    default: 'reading',
                    content: { none: 'None', reading: 'Reading', meaning: 'Meaning' },
                },
            },
        }
        let dialog = new wkof.Settings(config)
        dialog.open()
    }
})(window.wkof, window.jQuery)
