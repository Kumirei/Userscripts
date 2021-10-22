// ==UserScript==
// @name         Wanikani: Omega Reorder
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Reorders n stuff
// @author       Kumirei
// @include      /^https://(www|preview).wanikani.com/(lesson|review)/session$/
// @grant        none
// ==/UserScript==

;(function (wkof, $) {
    // TODO: more comments
    // TODO: TEST
    // TODO: Reorder General --> Omega Reorder
    // TODO: Add prefix to custom properties in queue items
    // TODO: Improve styling (esp different item types)
    // TODO: Type --> item type (settings)
    // TODO: Add leech sort/filter
    // Script info
    const script_name = 'Reorder General'
    const script_id = 'reorder_general'
    // SRS info
    const srs_intervals = [4, 8, 23, 47, 167, 335, 719, 2879]

    // Make sure WKOF is installed
    confirm_wkof(script_name).then(start)

    // Startup
    function start() {
        wkof.include('Menu,Settings,ItemData')
        wkof.ready('Menu,Settings,ItemData').then(load_settings).then(install).then(prepare_data).then(run)
    }

    /* ----------------------------------------------------------*/
    // Start up
    /* ----------------------------------------------------------*/

    // Load WKOF settings
    function load_settings() {
        //delete wkof.settings[script_id] // for testing purposes
        //wkof.Settings.save(script_id) // for testing purposes
        const defaults = {
            active_sequence: 0,
            prioritize: 'none',
            active_queue: 10,
            back2back: true,
            srs_breakdown: true,
            streak: true,
        }
        return wkof.Settings.load(script_id, defaults).then((settings) => {
            // Inject default sequences if user don't have any
            if (!settings.sequences) settings.sequences = default_sequences
        })
    }

    // Installs script items on page
    function install() {
        install_menu()
        install_css()
        install_back2back()
        install_priority()
        install_interface()
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

    // Install CSS
    function install_css() {
        // TODO: fetch from github with wkof
        const css = `<style id="${script_id + 'CSS'}"></style>`
        document.getElementsByTagName('head')[0].insertAdjacentHTML('beforeend', css)
    }

    // Set up back to back meaning/reading reviews
    function install_back2back() {
        const old_random = Math.random
        const new_random = function () {
            const re = /https:\/\/cdn.wanikani.com\/assets\/v03\/review\//
            const match = re.exec(new Error().stack)
            if (match && wkof.settings[script_id].back2back) return 0
            return old_random()
        }
        Math.random = new_random
    }

    // Set up prioritization of reading or meaning
    function install_priority() {
        $.jStorage.listenKeyChange('currentItem', prioritize)

        // Prioritize reading or meaning
        function prioritize() {
            const prio = wkof.settings[script_id].prioritize
            const item = $.jStorage.get('currentItem')
            // Skip if item does not yet have a UID, it is a radical, it is already
            // the right question, or no priority is selected
            if (!item.UID || item.rad || $.jStorage.get('questionType') == prio || 'none' == prio) return
            const done = $.jStorage.get(item.UID)
            // Change the question if no question has been answered yet,
            // Or the priority question has not been answered correctly yet
            if (!done || !done[prio == 'reading' ? 'rc' : 'mc']) {
                $.jStorage.set('questionType', prio)
                $.jStorage.set('currentItem', item)
            }
        }
    }

    // Installs the main interface
    function install_interface() {
        const sequences = wkof.settings[script_id].sequences
        const get_options = (list) => list.map((a) => `<option name="${a.id}">${a.name}</option>`).join()
        const html = `<div id="rg_interface"><p>Sequence: </p><select>${get_options(sequences)}</select></div>`
        document.getElementById('character').insertAdjacentHTML('beforeend', html)
        const change_sequence = (event) => {
            wkof.settings[script_id].active_sequence = event.target.querySelector(':checked').getAttribute('name')
            wkof.Settings.save(script_id)
            new_queue()
        }
        document.getElementById('rg_interface').addEventListener('change', change_sequence)
        // TODO: Add SRS breakdown
        // TODO: add streak
    }

    // Prepares the data
    async function prepare_data() {
        const registry = await fetch_item_data()
        let items = get_queue()
        // Add registry data to items
        items.forEach((item) => {
            Object.assign(item, registry[item.id])
        })
        calculate_indices(items)
        return items
    }

    // Fetch item data from WKOF
    function fetch_item_data() {
        return wkof.ItemData.get_items('assignments').then((items) => {
            let registry = {}
            items.forEach((item) => {
                if (!item.assignments) return
                const critical = is_critical(item)
                registry[item.id] = {
                    level: item.data.level,
                    UID: item.object[0].toLowerCase() + item.id,
                    available_at: item.assignments.available_at,
                    object: item.object,
                    critical,
                }
            })
            return registry
        })
    }

    // Checks whether the item is critical to level up
    function is_critical(item) {
        const { level, object, assignments } = item
        return level == wkof.user.level && object != 'vocabulary' && assignments?.passed_at == null
    }

    // Calculates sorting indices and stores the data in the items
    function calculate_indices(items) {
        const order = { r: 0, k: 1, v: 2 }
        items.forEach((item) => {
            item.type = order[item.UID[0]]
            item.overdue = calculate_overdue(item)
            item.critical = item.critical ? 0 : 1
            item.random = Math.random()
        })
    }

    // Calculates how overdue an item is
    function calculate_overdue(item) {
        return (Date.now() - Date.parse(item.available_at)) / (1000 * 60 * 60) / srs_intervals[item.srs - 1]
    }

    /* ----------------------------------------------------------*/
    // Sorting & Filtering
    /* ----------------------------------------------------------*/

    // Create new queue
    function run(items) {
        items = process(items)
        $.jStorage.set('reviewQueue', items.slice(10))
        $.jStorage.set('activeQueue', items.slice(0, 10))
        $.jStorage.set('currentItem', items[0])
    }

    // Sort and filters according to settings
    function process(items) {
        console.log(items)
        const settings = wkof.settings[script_id]
        const active_sequence = settings.sequences.find((sequence) => sequence.id == settings.active_sequence)
        active_sequence.actions.forEach((action) => {
            switch (action.type) {
                case 'Sort':
                    console.log('sort', action.option)
                    sort(items, action.option.toLowerCase(), !action.invert)
                    break
                case 'Filter':
                    console.log('filter', action.option)
                    filter(items, action.option.toLowerCase(), action.invert, action.value)
                    break
                case 'None':
                default:
                    break
            }
        })
        items.reverse()
        return items
    }

    // Sort queue
    function sort(items, key, invert) {
        const sorter = (a, b) => (a[key] > b[key] ? (invert ? -1 : 1) : invert ? 1 : -1)
        items.sort(sorter)
    }

    // Filters queue
    function filter(items, key, invert, value) {
        const filters = wkof.ItemData.registry.sources.wk_items.filters
        const item_types = ['radical', 'kanji', 'vocabulary']
        let filtered = items.slice()
        // TODO: add filters
        let filter_func = () => true
        let value_map = (_) => _
        switch (key) {
            case 'type':
                // Possible values: rad(icals), kan(ji), voc(abulary)
                filter_func = (filter_value, item) => !filter_value[item.object] === invert
                value_map = filters.item_type.filter_value_map
                break
            case 'level':
                // Possible values: 1-60
                filter_func = (filter_value, item) => !filter_value[item.level] === invert
                value_map = filters.level.filter_value_map
                break
            case 'srs':
                // Possible values: ???
                filter_func = (filter_value, item) => filter_value[item.srs] === true
                value_map = filters.srs.filter_value_map
                break
            case 'overdue':
                // Possible values: percentage
                filter_func = (filter_value, item) => (filter_value > item.overdue ? !invert : invert)
                value_map = (filter_value) => filter_value / 100
                break
            case 'critical':
                // Possible values: yes, no
                filter_func = (filter_value, item) => !item.critical === invert
                value_map = (filter_value) => !!filter_value.match(/yes/i)
                break
            case 'first':
                // Possible values: number
                filtered.splice(invert ? 0 : value, invert ? value : filtered.length)
                break
            case 'random':
                // Possible values: ignored
                filter_func = (filter_value, item) => item.random < 0.5
                break
            default:
                break
        }
        filtered = filtered.filter((item) => filter_func(value_map(value), item))
        // Ugh, the way I designed this is that the list has been mutated...
        // TODO: find better way to do this
        items.splice(0, items.length, ...filtered)
        console.log(items)
    }

    // Retrieves the current review queue
    function get_queue() {
        return [...$.jStorage.get('activeQueue'), ...$.jStorage.get('reviewQueue')]
    }

    // Create new queue from all reviews
    function new_queue() {
        run(get_queue())
    }

    /* ----------------------------------------------------------*/
    // Helper functions
    /* ----------------------------------------------------------*/

    // Makes sure that WKOF is installed
    async function confirm_wkof(script_name) {
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

    // Fires an event on a target element
    function fire_event(elem, event) {
        let e = document.createEvent('HTMLEvents')
        e.initEvent(event, true, true) // Type, bubbling, cancelable
        return !elem.dispatchEvent(e)
    }

    /* ----------------------------------------------------------*/
    // Settings
    /* ----------------------------------------------------------*/

    // Default sequences object
    // TODO: Proper defaults
    const default_sequences = [
        {
            id: 1,
            name: 'Test 1',
            actions: [{ id: 1, name: 'Action 1', invert: false, type: 'Level', option: 'None', value: '' }],
        },
        {
            id: 2,
            name: 'Test 2',
            actions: [
                { id: 1, name: 'Action 1', invert: false, type: 'None', option: 'None', value: '' },
                { id: 2, name: 'Action 2', invert: false, type: 'None', option: 'None', value: '' },
            ],
        },
        {
            id: 3,
            name: 'Test 3',
            actions: [
                { id: 1, name: 'Action 1', invert: false, type: 'None', option: 'None', value: '' },
                { id: 2, name: 'Action 2', invert: false, type: 'None', option: 'None', value: '' },
                { id: 3, name: 'Action 3', invert: false, type: 'None', option: 'None', value: '' },
            ],
        },
        {
            id: 4,
            name: 'Test 4',
            actions: [
                { id: 1, name: 'Action 1', invert: true, type: 'Sort', option: 'Type', value: '' },
                { id: 2, name: 'Action 2', invert: false, type: 'Filter', option: 'First', value: '100' },
                { id: 3, name: 'Action 3', invert: true, type: 'None', option: 'Level', value: '' },
                { id: 4, name: 'Action 4', invert: false, type: 'Sort', option: 'None', value: '' },
            ],
        },
    ]

    // Opens settings dialogue when button is pressed
    function open_settings() {
        let sequences = {}
        for (let sequence of wkof.settings[script_id].sequences) sequences[sequence.id] = sequence.name
        let config = {
            script_id: script_id,
            title: script_name,
            pre_open: settings_pre_open,
            on_save: settings_on_save,
            on_close: new_queue,
            content: {
                general: {
                    type: 'page',
                    label: 'General',
                    content: {
                        active_sequence: { type: 'dropdown', label: 'Active sequence', content: sequences },
                        prioritize: {
                            type: 'dropdown',
                            label: 'Prioritize',
                            default: 'reading',
                            content: { none: 'None', reading: 'Reading', meaning: 'Meaning' },
                        },
                        active_queue: { type: 'number', label: 'Active queue size', default: 10 },
                        back2back: { type: 'checkbox', label: 'Back to back', default: true },
                        srs_breakdown: { type: 'checkbox', label: 'SRS Breakdown', default: true },
                        streak: { type: 'checkbox', label: 'Streak', default: true },
                    },
                },
                sequences: {
                    type: 'page',
                    label: 'Edit Sequences',
                    content: {
                        sequences: {
                            type: 'group',
                            label: 'Sequences',
                            content: {
                                buttons: {
                                    type: 'html',
                                    html:
                                        '<div class="presets sequences"><div class="preset-buttons"><button class="new"><i class="icon-plus"></i></button><button class="up"><i class="icon-caret-up"></i></button><button class="down"><i class="icon-caret-down"></i></button><button class="delete"><i class="icon-trash"></i></button></div><div class="preset-right"><select class="presets" size="4"></select></div></div>',
                                },
                                divider: { type: 'divider' },
                                section: { type: 'section', label: 'Sequence settings' },
                                name: {
                                    type: 'html',
                                    html:
                                        '<div class="name"><span class="label">Sequence name</span><input class="sequence-name" placeholder="Sequence name"></input></div>',
                                },
                                actions: {
                                    type: 'group',
                                    label: 'Actions',
                                    content: {
                                        actions: {
                                            type: 'html',
                                            html:
                                                '<div class="presets actions"><div class="preset-buttons"><button class="new"><i class="icon-plus"></i></button><button class="up"><i class="icon-caret-up"></i></button><button class="down"><i class="icon-caret-down"></i></button><button class="delete"><i class="icon-trash"></i></button></div><div class="preset-right"><select class="actions" size="4"></select></div></div>',
                                        },
                                        divider: { type: 'divider' },
                                        section: { type: 'section', label: 'Action settings' },
                                        name: {
                                            type: 'html',
                                            html:
                                                '<div class="name"><span class="label">Action name</span><input class="action-name" placeholder="Action name"></input></div>',
                                        },
                                        invert: {
                                            type: 'html',
                                            html:
                                                '<div class="invert"><span class="label">Invert action</span><input class="invert" type="checkbox"></input></div>',
                                        },
                                        type: {
                                            type: 'html',
                                            html:
                                                '<div class="type"><span class="label">Type</span><select class="type">' +
                                                '<option name="Sort">Sort</option>' +
                                                '<option name="Filter">Filter</option>' +
                                                '</select></div>',
                                        },
                                        option: {
                                            type: 'html',
                                            html:
                                                '<div class="option"><span class="label">Option</span><select class="option">' +
                                                '<option name="None">None</option>' +
                                                '<option name="Type">Type</option>' +
                                                '<option name="Level">Level</option>' +
                                                '<option name="SRS">SRS</option>' +
                                                '<option name="Overdue">Overdue</option>' +
                                                '<option name="Critical">Critical</option>' +
                                                '<option name="First">First</option>' +
                                                '<option name="Random">Random</option>' +
                                                '</select></div>',
                                        },
                                        value: {
                                            type: 'html',
                                            html:
                                                '<div class="value"><span class="label">Value</span><input class="filter-value" placeholder="Filter value"></input></div>',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        }
        let dialog = new wkof.Settings(config)
        dialog.open()
    }

    // Saves settings
    function settings_on_save(settings) {
        settings.sequences = document.getElementById('wkofs_reorder_general').sequences
    }

    function settings_pre_open(dialogue) {
        let sequences = wkof.settings[script_id].sequences.slice()
        dialogue[0].sequences = sequences // For retrieval by saving function
        // Elements observed for changes
        const sequences_list = dialogue[0].querySelector('#reorder_general_sequences select')
        const sequences_name = dialogue[0].querySelector('#reorder_general_sequences > .name input')
        const actions_set = dialogue[0].querySelector('#reorder_general_actions')
        const actions_list = dialogue[0].querySelector('#reorder_general_actions select')
        const actions_name = dialogue[0].querySelector('#reorder_general_actions > .name input')
        // Help functions
        const get_selected = (options) => options.querySelector('option:checked')
        const get_sequence = () =>
            sequences.find((s) => s.id == (get_selected(sequences_list)?.getAttribute('name') || s.id))
        const get_action = () =>
            get_sequence().actions.find((a) => a.id == (get_selected(actions_list)?.getAttribute('name') || a.id))
        const get_options = (list) => list.map((a) => `<option name="${a.id}">${a.name}</option>`).join()
        // Event listener callbacks
        const sequence_list_change = () => {
            sequences_name.value = sequences_list.querySelector('option:checked').innerText
            actions_list.innerHTML = get_options(get_sequence().actions)
            actions_list.value = get_sequence().actions[0].name
            fire_event(actions_list, 'change')
        }
        const sequence_name_change = () => {
            const sequence = get_sequence()
            const name = sequences_name.value
            // Update sequence list
            sequence.name = name
            sequences_list.querySelector('option:checked').innerText = name
            // Update active sequence list
            dialogue[0].querySelector(`#reorder_general_active_sequence [name="${sequence.id}"`).innerText = name
            // Update interface list
            document.querySelector(`#rg_interface [name="${sequence.id}"`).innerText = name
        }
        const actions_set_change = () => {
            // If action was changed, ignore it
            if (event.target.classList.contains('actions')) return
            // Update type for CSS
            const type = actions_set.querySelector('.type select').value.toLowerCase()
            actions_set.setAttribute('type', type)
            // Update settings
            const action = get_action()
            action.name = actions_name.value
            actions_list.querySelector('option:checked').innerText = actions_name.value
            action.invert = actions_set.querySelector('.invert input').checked
            action.type = actions_set.querySelector('.type select').value
            action.option = actions_set.querySelector('.option select').value
            action.value = actions_set.querySelector('.value input').value
        }
        const actions_list_change = () => {
            const action = get_action()
            actions_name.value = actions_list.querySelector('option:checked').innerText
            actions_set.querySelector('.invert input').checked = action.invert
            actions_set.querySelector('.type select').value = action.type
            actions_set.querySelector('.option select').value = action.option
            actions_set.querySelector('.value input').value = action.value
            fire_event(actions_set, 'change')
        }
        const actions_name_change = () => {
            actions_list.querySelector('option:checked').innerText = actions_name.value
        }
        // Add event listeners
        sequences_list.addEventListener('change', sequence_list_change)
        sequences_name.addEventListener('change', sequence_name_change)
        actions_set.addEventListener('change', actions_set_change)
        actions_list.addEventListener('change', actions_list_change)
        actions_name.addEventListener('change', actions_name_change)
        // Populate sequences
        sequences_list.innerHTML = get_options(sequences)
        sequences_list.value = sequences[0].name
        sequence_list_change()
        // Button functions
        const target = dialogue[0].querySelector('#reorder_general_sequences')
        target.addEventListener('click', (event) => {
            // Only handle button clicks
            if (event.target.nodeName !== 'BUTTON') return
            const is_sequence = event.target.closest('.presets').classList.contains('sequences')
            const sequence = get_sequence()
            const item = is_sequence ? sequence : get_action()
            const list = is_sequence ? sequences : sequence.actions
            const i = list.indexOf(item)
            let new_index = i
            switch (event.target.className) {
                case 'new':
                    let new_item = is_sequence ? new_sequence(sequences) : new_action(sequence)
                    list.push(new_item)
                    new_index = list.length - 1
                    break
                case 'up':
                    swap_in_array(list, i, i - 1)
                    new_index--
                    break
                case 'down':
                    swap_in_array(list, i, i + 1)
                    new_index++
                    break
                case 'delete':
                    list.splice(i, 1)
                    break
            }
            // Refresh list
            const list_element = is_sequence ? sequences_list : actions_list
            const updater = is_sequence ? sequence_list_change : actions_list_change
            list_element.innerHTML = get_options(list)
            list_element.value = list[new_index]?.name || list[0]?.name
            updater()
        })
    }

    function new_sequence(sequences) {
        return {
            id: sequences.reduce((a, b) => (a > b.id ? a : b.id), -1) + 1,
            name: 'New sequence',
            actions: [new_action()],
        }
    }

    function new_action(sequence) {
        return {
            id: sequence?.actions.reduce((a, b) => (a > b.id ? a : b.id), -1) + 1 || 0,
            name: 'New action',
            invert: false,
            type: 'Sort',
            option: 'None',
            value: '',
        }
    }

    function swap_in_array(array, i, j) {
        if (array[i] && array[j]) [array[i], array[j]] = [array[j], array[i]]
    }
})(window.wkof, window.jQuery)
