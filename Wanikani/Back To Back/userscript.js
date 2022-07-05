// ==UserScript==
// @name         Wanikani: Back to back
// @namespace    http://tampermonkey.net/
// @version      1.3.6
// @description  Makes reading and meaning appear back to back in reviews and lessons
// @author       Kumirei
// @include      /^https://(www|preview).wanikani.com/(lesson|review|extra_study)/session/
// @license      MIT
// @grant        none
// ==/UserScript==

;(function (wkof, $) {
    // Page related info
    let current_item_key, question_type_key, active_queue_key, UID_prefix
    let REVIEWS, LESSONS, EXTRA_STUDY
    if (/REVIEW/i.test(location.pathname)) {
        REVIEWS = true
        current_item_key = 'currentItem'
        question_type_key = 'questionType'
        active_queue_key = 'activeQueue'
        UID_prefix = ''
    } else if (/LESSON/i.test(location.pathname)) {
        LESSONS = true
        current_item_key = 'l/currentQuizItem'
        question_type_key = 'l/questionType'
        active_queue_key = 'l/activeQueue'
        UID_prefix = 'l/stats/'
    } else if (/EXTRA_STUDY/i.test(location.pathname)) {
        EXTRA_STUDY = true
        current_item_key = 'currentItem'
        question_type_key = 'questionType'
        active_queue_key = 'practiceQueue'
        UID_prefix = 'e/stats/'
    }

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
    }

    // Set up back to back meaning/reading reviews
    function install_back2back() {
        const settings = wkof.settings[script_id]

        // Keep track of the latest answer to decide whether to show the next question right away
        let last_answer = false

        // Wrap jStorage.set(key, value) to ignore the value when the key is for the current item AND one item has
        // already been partially answered. If an item has been partially answered, then set the current item to
        // that item instead.
        const original_set = $.jStorage.set
        const new_set = function (key, value, options) {
            const pass = (val) => original_set.call(this, key, val, options)
            if (settings.behavior === 'disabled' || options?.b2b_ignore) return pass(value) // Ignore if b2b_ignore flag is present

            // If an answer is being registered
            if (RegExp(`^${UID_prefix}[rkv]\\d+$`).test(key)) {
                const prev = { mc: 0, rc: 0, mi: 0, ri: 0, ...$.jStorage.get(key, {}) }
                const curr = { mc: 0, rc: 0, mi: 0, ri: 0, ...value }

                if (prev.mc < curr.mc || prev.rc < curr.rc) last_answer = true
                else if (prev.mi < curr.mi || prev.ri < curr.ri) {
                    last_answer = false
                    // If the script is set to always show both answers, remove any correct answers already registered
                    if (settings.behavior === 'true') return pass({ ...curr, mc: undefined, rc: undefined })
                }
            }
            // If the current item is being set
            else if (key === current_item_key) {
                let item = $.jStorage.get(current_item_key)
                const active_queue = $.jStorage.get(active_queue_key, [])
                if (!item) return pass(value)
                if (settings.behavior !== 'always' && !last_answer) return pass(value)
                // ! Potential issue when reordering and the current item is still in the active queue
                // ! If behavior is 'always' or last answer was correct, the current item will stay the current item
                // Find the item in the active queue. If it is not there, pass
                item = active_queue.find((i) => i.id === item.id)
                if (!item) return pass(value)

                // Bring the item to the front of the active queue
                const new_active_queue = [item, ...active_queue.filter((i) => i !== item)]
                $.jStorage.set(active_queue_key, new_active_queue)
                // Set the question type
                let question = $.jStorage.get(question_type_key, 'meaning')
                if (item.type === 'Radical') question = 'meaning'
                else {
                    const UID = (item.type == 'Kanji' ? 'k' : 'v') + item.id
                    const stats = $.jStorage.get(UID_prefix + UID, {})
                    if (stats.mc) question = 'reading'
                    else if (stats.rc) question = 'meaning'
                }
                $.jStorage.set(question_type_key, question)
                // Pass the value to the original set function
                return pass(item)
            } // @ts-ignore
            return pass(value)
        }
        $.jStorage.set = new_set
    }

    // Set up prioritization of reading or meaning
    function install_prioritization() {
        // Run every time item changes
        $.jStorage.listenKeyChange(current_item_key, prioritize)
        // Initialize session to prioritized question type
        prioritize()
    }

    // Prioritize reading or meaning
    function prioritize() {
        const prio = wkof.settings[script_id].prioritize
        const item = $.jStorage.get(current_item_key)
        // Skip if item is a radical, it is already the right question, or no priority is selected
        if (item.type == 'Radical' || $.jStorage.get(question_type_key) == prio || 'none' == prio) return
        const UID = (item.type == 'Kanji' ? 'k' : 'v') + item.id
        const done = $.jStorage.get(UID_prefix + UID)
        // Change the question if no question has been answered yet,
        // Or the priority question has not been answered correctly yet
        if (!done || !done[prio == 'reading' ? 'rc' : 'mc']) {
            $.jStorage.set(question_type_key, prio)
            $.jStorage.set(current_item_key, item)
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
            behavior: 'always',
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
                behavior: {
                    type: 'dropdown',
                    default: 'always',
                    label: 'Behavior',
                    hover_tip:
                        "Choose whether to:\n1. Keep repeating the same question until you get it right\n2. Only keep the item if you answered the first question correctly\n3. Make it so that you have to answer both questions correctly back to back\n4. Disable any redordering, falling back to WaniKani's default behavior",
                    content: {
                        always: 'Repeat until correct',
                        correct: 'Shuffle incorrect',
                        true: 'True Back To Back',
                        disabled: 'Disabled',
                    },
                },
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
