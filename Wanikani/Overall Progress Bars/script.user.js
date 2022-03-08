// ==UserScript==
// @name         Wanikani: Overall Progress Bar
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Creates a progress on the dashboard for every level
// @author       Kumirei
// @include      /^https://(www|preview).wanikani.com(/dashboard)?$/
// @grant        none
// @license      MIT
// ==/UserScript==

;(async () => {
    const { wkof, $ } = window

    // Script info
    const script_name = 'Overall Progress Bars'
    const script_id = 'overall_progress_bar'

    // Constants
    srs_names = {
        '-1': 'Locked',
        0: 'In lessons',
        1: 'Apprentice 1',
        2: 'Apprentice 2',
        3: 'Apprentice 3',
        4: 'Apprentice 4',
        5: 'Guru 1',
        6: 'Guru 2',
        7: 'Master',
        8: 'Enlightened',
        9: 'Burned',
    }

    confirm_wkof()
    wkof.include('Menu,Settings,ItemData')
    await wkof.ready('Menu,Settings,ItemData').then(load_settings).then(install_menu)
    injectCss()

    // Get items by level
    const items = await wkof.ItemData.get_items('assignments')
    const items_by_level = wkof.ItemData.get_index(items, 'level')

    // Get counts per SRS level per level
    const counts_by_level_and_srs = {}
    for (let [level, items] of Object.entries(items_by_level)) {
        counts_by_level_and_srs[level] = Object.fromEntries(
            Object.entries(wkof.ItemData.get_index(items, 'srs_stage')).map(([srs, items]) => [srs, items.length]),
        )
    }

    // Display
    $('.progress-and-forecast').before(
        `<div class="srs-level-graph">${Object.entries(counts_by_level_and_srs)
            .map(
                ([level, counts_by_srs]) =>
                    `<div class="level"><div class="bars">${Object.entries(counts_by_srs)
                        .map(
                            ([srs_level, count]) =>
                                `<div class="srs" data-srs="${srs_level}" title="${srs_names[srs_level]}: ${count} items" style="flex-grow: ${count}"></div>`,
                        )
                        .join('')}</div><div class="lbl" title="Level ${level}">${level}</div></div>`,
            )
            .join('')}</div`,
    )

    function injectCss() {
        const color = {
            '-1': '#aaa',
            0: '#aaa',
            1: '#dd0093',
            2: '#dd0093',
            3: '#dd0093',
            4: '#dd0093',
            5: '#882d9e',
            6: '#882d9e',
            7: '#294ddb',
            8: '#0093dd',
            9: 'rgb(223,170,11)',
        }

        let srs_css = ''
        for (let i = -1; i < 10; i++) {
            srs_css += `
.srs-level-graph .srs[data-srs="${i}"] {
    background-color: ${color[i]};
    ${wkof.settings[script_id].single_bar ? 'width: 100' : 'height: ' + (i + 1) * 10}%;
}`
        }

        const css = `.srs-level-graph {
    height: 3em;
    display: flex;
    justify-content: space-evenly;
    gap: 0.2em;
    padding: 16px 12px 12px;
    background-color: #f4f4f4;
    border-radius: 5px;
    margin: 30px 0;
}

.srs-level-graph .level {
    width: 100%;
    display: flex;
    flex-direction: column;
}

.srs-level-graph .bars {
    display: flex;
    align-items: flex-end;
    flex-grow: 1;
    flex-direction: ${wkof.settings[script_id].single_bar ? 'column' : 'row-reverse'};
}

.srs-level-graph .lbl {
    font-size: 0.75em;
    line-height: 1.5em;
    text-align: center;
    vertical-align: bottom;
}

.srs-level-graph .srs {
    ${wkof.settings[script_id].single_bar ? '' : 'border-radius: 0.1em 0.1em 0 0;'}
    
}

${srs_css}`

        $('head').append(`<style id="overall-progress-bars">${css}</style>`)
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
            single_bar: true,
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
            content: {
                single_bar: { type: 'checkbox', label: 'Single Bar', default: true },
            },
        }
        let dialog = new wkof.Settings(config)
        dialog.open()
    }
})()
