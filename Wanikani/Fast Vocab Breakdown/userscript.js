// ==UserScript==
// @name         Wanikani: Fast Vocab Breakdown
// @namespace    http://tampermonkey.net/
// @version      1.1.2
// @description  Automatically displays the meanings of the kanji when you get a vocab item wrong
// @author       Kumirei
// @include      *wanikani.com/review/session
// @grant        none
// ==/UserScript==

;(async function (wkof) {
    let script_name = 'Fast Vocab Breakdown'
    let script_id = 'fast_vocab_breakdown'
    let items, elem, answer

    confirm_wkof()
    await init()
    window.addEventListener(`turbo:render`, init)
    window.addEventListener(`turbo:before-render`, before_render)
    window.addEventListener(`didAnswerQuestion`, handle_answer)
    window.addEventListener(`willShowNextQuestion`, hide_breakdown)

    function before_render(event) {
        const page = get_page()
        const new_body = event.detail.newBody

        if (page === 'reviews') {
            install_element(new_body)
        }
    }

    function get_page() {
        const url = window.location.pathname
        if (/\/subjects\/review/.test(url)) return 'reviews'
    }

    async function init() {
        wkof.include('ItemData,Settings,Menu')
        await wkof.ready('ItemData,Settings,Menu').then(load_settings).then(install_menu).then(fetch_items)
        install_element(document.body)
    }

    function confirm_wkof() {
        if (!wkof) {
            if (
                confirm(
                    script_name +
                        ' requires Wanikani Open Framework.\nDo you want to be forwarded to the installation instructions?',
                )
            ) {
                window.location.href =
                    'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549'
            }
            return
        }
    }

    // Populates the item database with items indexed by subject id
    async function fetch_items() {
        items = wkof.ItemData.get_index(await wkof.ItemData.get_items(), 'subject_id')
    }

    // Installs the info element and sets up the page
    function install_element(body) {
        install_css()
        body.querySelector('.character-header__content').insertAdjacentHTML(
            'beforeend',
            '<div id="' + script_id + '" class="hidden"></div>',
        )
        elem = body.querySelector(`#${script_id}`)
    }

    // Decides what to do when a new answer is submitted
    function handle_answer(event) {
        if (event.detail.subjectWithStats.subject.type !== 'Vocabulary') return
        const settings = wkof.settings.fast_vocab_breakdown
        const questionType = event.detail.questionType
        const passed = event.detail.results.passed

        const is_quest = settings.question == 'both' || settings.question == questionType
        const is_ans = settings.answer == 'both' || (settings.answer === 'correct') === passed

        console.log({ settings, questionType, passed, is_quest, is_ans })
        if (is_quest && is_ans) insert_info(event.detail.subjectWithStats.subject.id)
        else elem.classList.add('hidden')
    }

    function hide_breakdown() {
        elem.classList.add('hidden')
    }

    // Finds and inserts the kanji info when an incorrect answer is submitted
    function insert_info(itemId) {
        let meanings = []
        items[itemId].data.component_subject_ids.forEach((id) => {
            items[id].data.meanings.forEach((meaning) => {
                if (meaning.primary) meanings.push(meaning.meaning)
            })
        })
        let text = meanings.join(', ')
        elem.innerText = text
        elem.classList.remove('hidden')
    }

    // Some simple CSS to make things look as they should
    function install_css() {
        document.getElementsByTagName('head')[0].insertAdjacentHTML(
            'beforeend',
            `<style id="${script_id}-css">
#${script_id} {
    position: absolute;
    font-size: 18px;
    bottom: 0;
    padding: 0.5rem;
}
#${script_id}.hidden {visibility: hidden;}
.srs { top: -3em;}
</style>`,
        )
    }

    // Load WKOF settings
    function load_settings() {
        let defaults = { question: 'both', answer: 'incorrect' }
        return wkof.Settings.load(script_id, defaults)
    }

    // Add settings to the menu
    function install_menu() {
        var config = {
            name: script_id,
            submenu: 'Settings',
            title: script_name,
            on_click: open_settings,
        }
        wkof.Menu.insert_script_link(config)
    }

    // Define settings menu layout
    function open_settings(items) {
        var config = {
            script_id: script_id,
            title: script_name,
            content: {
                question: {
                    type: 'dropdown',
                    label: 'Show on Question Type',
                    hover_tip: 'Show breakdown when you answer either the meaning or the reading question incorrectly',
                    default: 'both',
                    content: {
                        meaning: 'Meaning',
                        reading: 'Reading',
                        both: 'Meaning & Reading',
                    },
                },
                answer: {
                    type: 'dropdown',
                    label: 'Show on Answer',
                    hover_tip: 'Show breakdown on either correct or incorrect answers',
                    default: 'incorrect',
                    content: {
                        correct: 'Correct',
                        incorrect: 'Incorrect',
                        both: 'Correct & Incorrect',
                    },
                },
            },
        }
        let dialog = new wkof.Settings(config)
        dialog.open()
    }
})(window.wkof)
