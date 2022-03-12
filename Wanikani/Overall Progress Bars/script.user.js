// ==UserScript==
// @name         Wanikani: Overall Progress Bar
// @namespace    http://tampermonkey.net/
// @version      0.2.0
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

    const { single_bar, single_color, theme } = wkof.settings[script_id]
    const color = {
        '-1': theme === 'breeze' ? '#aaaaaa' : '#aaaaaa',
        0: theme === 'breeze' ? '#aaaaaa' : '#aaaaaa',
        1: theme === 'breeze' ? '#1d99f3' : '#dd0093',
        2: theme === 'breeze' ? '#1d99f3' : '#dd0093',
        3: theme === 'breeze' ? '#1d99f3' : '#dd0093',
        4: theme === 'breeze' ? '#1d99f3' : '#dd0093',
        5: theme === 'breeze' ? '#1cdc9a' : '#882d9e',
        6: theme === 'breeze' ? '#1cdc9a' : '#882d9e',
        7: theme === 'breeze' ? '#c9ce3b' : '#294ddb',
        8: theme === 'breeze' ? '#f67400' : '#0093dd',
        9: theme === 'breeze' ? '#da4453' : '#dfaa0b',
    }

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
        `<section class="srs-level-graph">${Object.entries(counts_by_level_and_srs).map(get_level).join('')}</section`,
    )

    function get_level([level, counts_by_srs]) {
        const bars = Object.entries(counts_by_srs).map(get_bar).join('')
        return `<div class="level"><div class="bars" style="background: ${get_color(
            counts_by_srs,
        )};">${bars}</div><div class="lbl" title="Level ${level}">${level}</div></div>`
    }

    function get_bar([srs_level, count]) {
        return `<div class="srs" data-srs="${srs_level}" title="${srs_names[srs_level]}: ${count} items" style="flex-grow: ${count}"></div>`
    }

    function get_color(counts_by_srs) {
        if (!single_bar || !single_color) return ''
        const srs_levels = Object.entries(counts_by_srs).reduce(
            (srs_items, [srs_level, count]) => srs_items.concat(new Array(count).fill(srs_level)),
            [],
        )
        const avg_srs = srs_levels.reduce((sum, val) => sum + Number(val), 0) / srs_levels.length
        return interpolate_color(color[Math.floor(avg_srs)], color[Math.ceil(avg_srs)], avg_srs % 1)
    }

    function interpolate_color(a, b, amount) {
        var ah = parseInt(a.replace(/#/g, ''), 16),
            ar = ah >> 16,
            ag = (ah >> 8) & 0xff,
            ab = ah & 0xff,
            bh = parseInt(b.replace(/#/g, ''), 16),
            br = bh >> 16,
            bg = (bh >> 8) & 0xff,
            bb = bh & 0xff,
            rr = ar + amount * (br - ar),
            rg = ag + amount * (bg - ag),
            rb = ab + amount * (bb - ab)

        return '#' + (((1 << 24) + (rr << 16) + (rg << 8) + rb) | 0).toString(16).slice(1)
    }

    function injectCss() {
        let srs_css = ''
        for (let i = -1; i < 10; i++) {
            srs_css += `
.srs-level-graph .srs[data-srs="${i}"] {
    background-color: ${color[i]};
    ${single_bar ? 'width: 100' : 'height: ' + (i + 1) * 10}%;
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
    flex-direction: ${single_bar ? 'column' : 'row-reverse'};
}

.srs-level-graph .lbl {
    font-size: 0.75em;
    line-height: 1.5em;
    text-align: center;
    vertical-align: bottom;
    ${theme === 1 ? 'color: black;' : ''}
}

.srs-level-graph .srs {
    ${single_color && single_bar ? 'display:none;' : ''}
    ${single_bar ? '' : 'border-radius: 0.1em 0.1em 0 0;'}
    
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
            single_color: false,
            theme: 'default',
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
                single_bar: {
                    type: 'checkbox',
                    label: 'Single Bar',
                    default: true,
                    hover_tip: 'Display as multiple bars next to each other or as a single stacked bar',
                },
                single_color: {
                    type: 'checkbox',
                    label: 'Single Color',
                    default: false,
                    hover_tip: 'Display stacked bar as a single color instead of a stack',
                },
                theme: {
                    type: 'dropdown',
                    label: 'Theme',
                    default: 0,
                    hover_tip: 'Changes the colors of the bars',
                    content: { default: 'Default', breeze: 'Breeze Dark' },
                },
            },
        }
        let dialog = new wkof.Settings(config)
        dialog.open()
    }
})()
