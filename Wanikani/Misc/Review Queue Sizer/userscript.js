// ==UserScript==
// @name         Wanikani: Review Queue Sizer
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  Lets you choose the size of your review session
// @author       Kumirei
// @include      /^https://(www|preview).wanikani.com/(lesson|review)/session$/
// @grant        none
// ==/UserScript==

;(function (wkof, $) {
    let script_name = 'Wanikani: Review Queue Sizer'
    let script_title = 'Review Queue Sizer'
    let script_id = 'review_queue_sizer'

    // Make sure WKOF is installed
    if (!wkof) {
        let response = confirm(
            script_name +
                ' requires WaniKani Open Framework.\n Click "OK" to be forwarded to installation instructions.',
        )
        if (response) {
            window.location.href =
                'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549'
        }
        return
    }

    wkof.include('Menu,Settings,ItemData')
    wkof.ready('Menu,Settings').then(load_settings).then(install_menu).then(start)

    function start() {
        // Run once items have loaded, and only once
        let stop = false
        $.jStorage.listenKeyChange('reviewQueue', () => {
            if (!stop) {
                stop = true
                run()
            }
        })
    }

    // Load WKOF settings
    function load_settings() {
        let defaults = { qsize: 0 }
        return wkof.Settings.load(script_id, defaults)
    }

    // Installs the options button in the menu
    function install_menu() {
        let config = {
            name: script_id,
            submenu: 'Settings',
            title: script_title,
            on_click: open_settings,
        }
        wkof.Menu.insert_script_link(config)
    }

    function open_settings() {
        var config = {
            script_id: script_id,
            title: script_title,
            pre_open: settings_pre_open,
            on_save: settings_on_save,
            on_close: run,
            content: {
                qsize: {
                    type: 'number',
                    label: 'Queue size',
                    default: 0,
                    hover_tip: '0 means unlimited',
                },
            },
        }
        let dialog = new wkof.Settings(config)
        dialog.open()
    }

    function settings_on_save(settings) {
        run()
    }

    function settings_pre_open(settings) {
        const target = settings[0].querySelector('#review_queue_sizer_qsize')
        target.addEventListener('keydown', (e) => {
            if (e.target.nodeName == 'INPUT' && e.keyCode == 8) {
                e.target.value = e.target.value.slice(0, -1)
                fire_event(target, 'change')
            }
        })
    }

    // Retrieves the current review queue
    function get_queue() {
        const items = [...($.jStorage.get('activeQueue') ?? []), ...$.jStorage.get('reviewQueue')]
        return items
    }

    // Create new queue
    function run() {
        let items = get_queue()
        const limit = wkof.settings[script_id].qsize || items.length
        const done = $.jStorage.get('completedCount')
        $('#bar').width((done / limit) * 100 + '%')
        const truncated = items.slice(0, limit - done)
        $.jStorage.set('reviewQueue', truncated.slice(10))
        $.jStorage.set('activeQueue', truncated.slice(0, 10))
        $.jStorage.set('currentItem', truncated[0])
    }

    function fire_event(elem, event) {
        let e = document.createEvent('HTMLEvents')
        e.initEvent(event, true, true) // Type, bubbling, cancelable
        return !elem.dispatchEvent(e)
    }
})(window.wkof, window.jQuery)
