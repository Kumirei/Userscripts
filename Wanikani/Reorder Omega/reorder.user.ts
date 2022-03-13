// ==UserScript==
// @name         Wanikani: Omega Reorder
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Reorders n stuff
// @author       Kumirei
// @include      /^https://(www|preview).wanikani.com/((dashboard)?|((review|extra_study)/session))/
// @grant        none
// ==/UserScript==

// This line in necessary to make sure that TSC does not put any exports in the
// compiled js, which causes the script to crash
export = 0

// Import types
import {
    WKOF,
    ItemData,
    Menu,
    Settings as SettingsModule,
    SubjectType,
    SubjectTypeShort,
    SubjectTypeShortString,
} from './wkof'
import { Review, Settings } from './reorder'

// We have to extend the global window object since the values are already present
// and we don't provide them ourselves
declare global {
    interface Window {
        // We have to insert the modules we want to use into the WKOF type
        wkof: WKOF & ItemData & Menu & SettingsModule
        $: JQueryStatic
    }
}

// Actual script
;(async () => {
    // TODO: Incorporate other scripts
    // * Back 2 Back
    // * Prioritize meaning/reading
    // * SRS breakdown
    // * Streak
    // TODO: Add audio --> meaning option

    // TODO: More comments
    // TODO: WKOF level filter
    // TODO: Make shuffle a type instead of sort
    const { wkof, $ } = window

    // Script info
    const script_id = 'reorder_omega'
    const script_name = 'Reorder Omega'

    // Page variables
    // TODO: Make work on review page
    // TODO: Make work on lessons page
    let page: 'reviews' | 'lessons' | 'extra_study'
    let currentItemKey = 'currentItem'
    let activeQueueKey = 'activeQueue'
    let fullQueueKey = 'reviewQueue'

    const reorder = {
        settings: {},
        settings_dialog: null,
    } as any

    wkof.ready('ItemData.registry').then(install_filters)

    // Allow changing settings on dashboard
    if (/(DASHBOARD)?$/i.test(window.location.pathname)) {
        await init_settings()
        // open_settings()
    }
    // TODO: comment here
    else if (/REVIEW/i.test(window.location.pathname)) {
        // Set page variables
        page = 'reviews'
        fullQueueKey = 'reviewQueue'

        await init_settings()

        // run()
    }
    // If page is extra study and the query is correct, start running as self study
    else if (/EXTRA_STUDY/i.test(window.location.pathname)) {
        // Set page variables
        page = 'extra_study'
        fullQueueKey = 'practiceQueue'

        if (window.location.search === '?title=test') {
            // This has to be done before WK realizes that the queue is empty and redirects
            display_loading()

            run()
        }
    }

    /* ------------------------------------------------------------------------------------*/
    // Overhead
    /* ------------------------------------------------------------------------------------*/

    async function run(): Promise<void> {
        // Initiate WKOF
        await confirm_wkof()
        wkof.include('Settings,Menu,ItemData')
        await init_settings()
        await wkof.ready('ItemData')

        // Get items
        let items: ItemData.Item[] = []
        if (page === 'extra_study') items = await wkof.ItemData.get_items('assignments,review_statistics')

        // Process
        process_queue(items)
    }

    function process_queue(items: ItemData.Item[]): void {
        // Filter and sort
        const settings = reorder.settings
        const preset = settings.presets[settings.active_preset]
        if (!preset) return display_message('Invalid Preset') // Active preset not defined
        const results = process_preset(preset, items)
        const final = results.final.concat(results.keep)
        if (!final.length) return display_message('No items in preset')
        console.log('items', final)

        // Load into queue
        transform_and_update(final)
    }

    type PresetItems = { keep: ItemData.Item[]; discard: ItemData.Item[]; final: ItemData.Item[] }
    function process_preset(preset: Settings.Preset, items: ItemData.Item[]): PresetItems {
        let result = { keep: items, discard: [], final: [] } as PresetItems
        for (let action of preset.actions) {
            result = process_action(action, result)
        }
        return result
    }

    function process_action(action: Settings.Action, items: PresetItems): PresetItems {
        console.log(action)
        console.log('Intermediary items', items.keep)
        switch (action.type) {
            case 'none':
                return items
            case 'filter':
                const { keep, discard } = process_filter(action, items.keep)
                return { keep, discard: items.discard.concat(discard), final: items.final }
            case 'sort':
                return { keep: process_sort_action(action, items.keep), discard: items.discard, final: items.final }
            case 'freeze & restore':
                return { keep: items.discard, discard: [], final: items.keep }
            case 'shuffle':
                return { keep: shuffle<ItemData.Item>(items.keep), discard: items.discard, final: items.final }
            default:
                return items // Invalid action type
        }
    }

    /* ------------------------------------------------------------------------------------*/
    // Filtering
    /* ------------------------------------------------------------------------------------*/

    function process_filter(action: Settings.FilterAction, items: ItemData.Item[]): KeepAndDiscard<ItemData.Item> {
        const filter = wkof.ItemData.registry.sources.wk_items.filters[action.filter.filter]
        if (!filter) return { keep: items, discard: [] }
        const filter_value = filter.filter_value_map
            ? filter.filter_value_map(action.filter[action.filter.filter])
            : action.filter[action.filter.filter]
        const filter_func = (item: ItemData.Item) => filter.filter_func(filter_value, item)
        return keep_and_discard(items, filter_func)
    }

    function install_filters() {
        wkof.ItemData.registry.sources.wk_items.filters.omega_reorder_overdue = {
            type: 'number',
            default: 0,
            label: 'Overdue%',
            hover_tip:
                'Items more overdue than this. A percentage.\nNegative: Not due yet\nZero: due now\nPositive: Overdue',
            filter_func: (value, item) => calculate_overdue(item) * 100 > value,
        }

        wkof.ItemData.registry.sources.wk_items.filters.omega_reorder_critical = {
            type: 'checkbox',
            default: true,
            label: 'Critical',
            hover_tip: 'Filter for items critical to leveling up',
            filter_func: (value, item) => value === is_critical(item),
        }
    }

    // TODO: install more filters

    /* ------------------------------------------------------------------------------------*/
    // Sorting
    /* ------------------------------------------------------------------------------------*/

    function process_sort_action(action: Settings.SortAction, items: ItemData.Item[]): ItemData.Item[] {
        let sort: (a: ItemData.Item, b: ItemData.Item) => number

        switch (action.sort.sort) {
            case 'level':
                sort = (a, b) => numerical_sort(a.data.level, b.data.level, action.sort.level as 'asc' | 'desc')
                break
            case 'type':
                const order = parse_short_subject_type_string(action.sort.type)
                sort = (a, b) => sort_by_type(a.object, b.object, order)
                break
            case 'srs':
                sort = (a, b) =>
                    numerical_sort(
                        a.assignments?.srs_stage ?? -1,
                        b.assignments?.srs_stage ?? -1,
                        action.sort.srs as 'asc' | 'desc',
                    )
                break
            case 'overdue':
                sort = (a, b) =>
                    numerical_sort(calculate_overdue(a), calculate_overdue(b), action.sort.overdue as 'asc' | 'desc')
                break
            case 'leech':
                sort = (a, b) =>
                    numerical_sort(
                        calculate_leech_score(a),
                        calculate_leech_score(b),
                        action.sort.leech as 'asc' | 'desc',
                    )
                break
            default:
                return [] // Invalid sort key
        }

        return double_sort<ItemData.Item>(items, sort)
    }

    function numerical_sort(a: number, b: number, order: 'asc' | 'desc'): number {
        if (order !== 'asc' && order !== 'desc') return 0
        return a === b ? 0 : xor(order === 'asc', a > b) ? -1 : 1
    }

    function sort_by_type(a: SubjectType, b: SubjectType, order: SubjectType[]): number {
        if (!order.length || a === b) return 0 // No order or same type
        if (a === order[0]) return -1 // A is first type
        if (b === order[0]) return 1 // B is first type
        return sort_by_type(a, b, order.slice(1, 3)) // Yay, recursion
    }

    /* ------------------------------------------------------------------------------------*/
    // Utility Functions
    /* ------------------------------------------------------------------------------------*/

    const SRS_DURATIONS = [4, 8, 23, 47, 167, 335, 719, 2879, Infinity].map((time) => time * 60 * 60 * 1000)
    function calculate_overdue(item: ItemData.Item): number {
        // Items without assignments or due dates, and burned items, are not overdue
        if (!item.assignments || !item.assignments.available_at || item.assignments.srs_stage == 9) return -1
        const dueMsAgo = Date.now() - Date.parse(item.assignments.available_at)
        return dueMsAgo / SRS_DURATIONS[item.assignments.srs_stage - 1]
    }

    function is_critical(item: ItemData.Item): boolean {
        return item.data.level == wkof.user.level && item.object !== 'vocabulary' && item.assignments?.passed_at == null
    }

    // Borrowed from Prouleau's Item Inspector script
    function calculate_leech_score(item: ItemData.Item): number {
        if (!item.review_statistics) return 0
        const stats = item.review_statistics
        function leechScore(incorrect: number, streak: number): number {
            return Math.round((incorrect / Math.pow(streak || 0.5, 1.5)) * 100) / 100
        }
        const meaning_score = leechScore(stats.meaning_incorrect, stats.meaning_current_streak)
        const reading_score = leechScore(stats.reading_incorrect, stats.reading_current_streak)
        return Math.max(meaning_score, reading_score)
    }

    function display_loading() {
        const callback = () => {
            const queue = $.jStorage.get(fullQueueKey) as Review.Queue
            $.jStorage.set('questionType', 'meaning')
            if ('table' in queue) {
                // Since the url is invalid the queue will contain an error. We must wait
                // until the error is set until we can set our queue
                update_queue([{ type: 'Vocabulary', voc: 'Loading...', id: 0 }])
            }
            $.jStorage.stopListening(fullQueueKey, callback)
        }
        $.jStorage.listenKeyChange(fullQueueKey, callback)
    }

    function parse_short_subject_type_string(str: SubjectTypeShortString): SubjectType[] {
        const type_map = { rad: 'radical', kan: 'kanji', voc: 'vocabulary' } as { [key: string]: SubjectType }
        return str
            .replace(/\W/g, '')
            .split(',')
            .map((type) => type_map[type])
    }

    /* ------------------------------------------------------------------------------------*/
    // Polymorphic Utility Functions
    /* ------------------------------------------------------------------------------------*/
    function xor(a: boolean, b: boolean): boolean {
        return (a && !b) || (!a && b)
    }

    // Sorting the array twice keeps the relative order of the sorted items. Example:
    // Original [8, 4, 5, 1, 7, 4, 5, 4, 6, 1].sort((a,b)=>a>5 ? -1 : 1)
    // Sorted   [6, 7, 8, 4, 5, 1, 4, 5, 4, 1].sort((a,b)=>a>5 ? -1 : 1)
    // Final    [8, 7, 6, 4, 5, 1, 4, 5, 4, 1]
    // This is important when chaining multiple sorting actions, so that the results of
    // one sort don't get reversed (front to back) by the next sort
    function double_sort<T>(items: T[], sorter: (item_a: T, item_b: T) => number): T[] {
        return items.sort(sorter).sort(sorter)
    }

    type KeepAndDiscard<T> = { keep: T[]; discard: T[] }
    function keep_and_discard<T>(items: T[], filter: (item: T) => boolean): KeepAndDiscard<T> {
        const results = { keep: [], discard: [] } as KeepAndDiscard<T>

        for (let item of items) {
            const keep = filter(item)
            results[keep ? 'keep' : 'discard'].push(item)
        }
        return results
    }

    /**
     * Shuffles array in place.
     * @param {Array} arr items An array containing the items.
     */
    function shuffle<T>(arr: T[]): T[] {
        var j, x, i
        for (i = arr.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1))
            x = arr[i]
            arr[i] = arr[j]
            arr[j] = x
        }
        return arr
    }

    /* ------------------------------------------------------------------------------------*/
    // Queue Management
    /* ------------------------------------------------------------------------------------*/

    function display_message(message: string) {
        update_queue([{ type: 'Vocabulary', voc: message, id: 0 }])
    }

    function transform_and_update(items: ItemData.Item[]): void {
        const transformed_items = transform_items(items)
        update_queue(transformed_items)
    }

    function update_queue(items: (Review.Item | Review.DummyItem)[]): void {
        const current_item = items[0]
        const active_queue = items.splice(0, 10)
        const rest = items.map((item) => item.id) // Only need the ID for these

        if (current_item?.type === 'Radical') $.jStorage.set('questionType', 'meaning') // has to be set before currentItem
        $.jStorage.set(currentItemKey, current_item)
        $.jStorage.set(activeQueueKey, active_queue)
        $.jStorage.set(fullQueueKey, rest)
    }

    function transform_items(items: ItemData.Item[]): Review.Item[] {
        // Not all of the data mapped here is needed, but I haven't bothered to figure out exactly what is needed yet
        return items.map((item) => ({
            aud: item.data.pronunciation_audios?.map((audio) => ({
                content_type: audio.content_type,
                pronunciation: audio.metadata.pronunciation,
                url: audio.url,
                voice_actor_id: audio.metadata.voice_actor_id,
            })),
            auxiliary_meanings: item.data.meanings
                .filter((meaning) => !meaning.primary)
                .map((meaning) => meaning.meaning),
            auxiliary_readings: item.data.readings
                ?.filter((reading) => !reading.primary)
                .map((reading) => reading.reading),
            characters: item.data.characters,
            en: item.data.meanings.filter((meaning) => meaning.primary).map((meaning) => meaning.meaning),
            id: item.id,
            kana: item.data.readings?.filter((reading) => reading.primary).map((reading) => reading.reading),
            kanji: [
                {
                    // Dummy for now
                    characters: '',
                    en: '',
                    id: 0,
                    ja: '',
                    kan: '',
                    type: '',
                },
            ],
            slug: item.data.slug,
            srs: item.assignments?.srs_stage,
            syn: [], // TODO
            type: (item.object[0].toUpperCase() + item.object.slice(1)) as 'Vocabulary' | 'Kanji' | 'Radical',
            [item.object == 'vocabulary' ? 'voc' : item.object == 'kanji' ? 'kan' : 'rad']: item.data.characters,
        }))
    }

    /* ------------------------------------------------------------------------------------*/
    // WKOF setup
    /* ------------------------------------------------------------------------------------*/

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

    function init_settings(): Promise<void> {
        return wkof.ready('Settings,Menu').then(load_settings).then(install_menu)
    }

    // Load WKOF settings
    function load_settings() {
        const test_preset_1 = get_preset_defaults()
        test_preset_1.actions[0].name = 'test'
        const test_preset_2 = get_preset_defaults()
        test_preset_2.name = 'test'

        const defaults = {
            disabled: false,
            active_preset: 0,
            active_presets_reviews: 'None',
            active_presets_lessons: 'None',
            active_presets_extra_study: 'None',
            presets: [get_preset_defaults()],
        } //as Settings.Settings
        return wkof.Settings.load(script_id, defaults).then((settings) => (reorder.settings = settings))
    }

    function get_preset_defaults(): Settings.Preset {
        const defaults = {
            name: 'New Preset',
            active_action: 0,
            available_on: { reviews: true, lessons: true, extra_study: true },
            actions: [get_action_defaults()],
        }
        return defaults
    }

    function get_action_defaults(): Settings.Action {
        const defaults = {
            name: 'New Action',
            type: 'none',
            filter: { filter: 'level', invert: false },
            sort: {
                sort: 'level',
                type: ['rad', 'kan', 'voc'],
            },
        } as any

        for (let [name, filter] of Object.entries(wkof.ItemData.registry.sources.wk_items.filters)) {
            defaults.filter[name] = filter.default
        }
        for (let type of ['level', 'srs', 'leech', 'overdue', 'critical']) {
            defaults.sort[type] = 'asc'
        }
        return defaults
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
        const config = {
            script_id,
            title: script_name,
            pre_open: settings_pre_open,
            on_refresh: refresh_settings,
            content: {
                // General Tab
                // ------------------------------------------------------------
                general: {
                    type: 'page',
                    label: 'General',
                    content: {
                        disabled: { type: 'checkbox', label: 'Disable', default: false },
                        // Active Presets
                        // ------------------------------------------------------------
                        active_presets: {
                            type: 'group',
                            label: 'Active Presets',
                            content: {
                                active_preset_reviews: {
                                    type: 'dropdown',
                                    label: 'Review preset',
                                    content: { todo: 'todo' },
                                }, // TODO: Implement
                                active_preset_lessons: {
                                    type: 'dropdown',
                                    label: 'Lesson preset',
                                    content: { todo: 'todo' },
                                }, // TODO: Implement
                                active_preset_extra_study: {
                                    type: 'dropdown',
                                    label: 'Extra Study preset',
                                    content: { todo: 'todo' },
                                }, // TODO: Implement
                            },
                        },
                    },
                },
                // Presets Tab
                // ------------------------------------------------------------
                presets: {
                    type: 'page',
                    label: 'Presets',
                    content: {
                        // Presets list
                        // ------------------------------------------------------------
                        presets: {
                            type: 'group',
                            label: 'Presets List',
                            content: {
                                active_preset: {
                                    type: 'list',
                                    refresh_on_change: true,
                                    hover_tip: 'Filter & Reorder Presets',
                                    content: {},
                                },
                            },
                        },
                        // Selected Preset
                        // ------------------------------------------------------------
                        preset: {
                            type: 'group',
                            label: 'Selected Preset',
                            content: {
                                preset_name: {
                                    type: 'text',
                                    label: 'Edit Preset Name',
                                    on_change: refresh_presets,
                                    path: '@presets[@active_preset].name',
                                    hover_tip: 'Enter a name for the selected preset',
                                },
                                available_on: {
                                    type: 'list',
                                    multi: true,
                                    label: 'Available For',
                                    hover_tip: 'Choose which pages you should be able to choose this preset on',
                                    default: { reviews: true, lessons: true, extra_study: true },
                                    path: '@presets[@active_preset].available_on',
                                    content: {
                                        reviews: 'Reviews',
                                        lessons: 'Lessons',
                                        extra_study: 'Extra Study',
                                    },
                                },
                                actions_label: { type: 'section', label: 'Actions' },
                                active_action: {
                                    type: 'list',
                                    refresh_on_change: true,
                                    hover_tip: 'Actions for the selected preset',
                                    path: '@presets[@active_preset].active_action',
                                    content: {},
                                },
                            },
                        },
                        // Selected action
                        // ------------------------------------------------------------
                        action: {
                            type: 'group',
                            label: 'Selected Action',
                            content: {
                                action_name: {
                                    type: 'text',
                                    label: 'Edit Action Name',
                                    on_change: refresh_actions,
                                    path: '@presets[@active_preset].actions[@presets[@active_preset].active_action].name',
                                    hover_tip: 'Enter a name for the selected action',
                                },
                                action_type: {
                                    type: 'dropdown',
                                    label: 'Action Type',
                                    hover_tip: 'Choose what kind of action this is',
                                    default: 'None',
                                    path: '@presets[@active_preset].actions[@presets[@active_preset].active_action].type',
                                    on_change: refresh_action,
                                    content: {
                                        none: 'None',
                                        sort: 'Sort',
                                        filter: 'Filter',
                                        shuffle: 'Shuffle',
                                        'freeze & restore': 'Freeze & Restore',
                                    },
                                },
                                // Sorts and filters
                                // ------------------------------------------------------------
                                action_label: { type: 'section', label: 'Action Settings' },
                                none_description: {
                                    type: 'html',
                                    html: '<div class="none">Description of None</div>',
                                },
                                sort_description: {
                                    type: 'html',
                                    html: '<div class="sort">Description of sort</div>',
                                },
                                filter_description: {
                                    type: 'html',
                                    html: '<div class="filter">Description of filter</div>',
                                },
                                shuffle_description: {
                                    type: 'html',
                                    html: '<div class="shuffle">Description of shuffle</div>',
                                },
                                freeze_and_restore_description: {
                                    type: 'html',
                                    html: '<div class="freeze_and_restore">Description of freeze and restore</div>',
                                },
                                filter_type: {
                                    type: 'dropdown',
                                    label: 'Filter Type',
                                    hover_tip: 'Choose what kind of filter this is',
                                    default: 'level',
                                    on_change: refresh_action,
                                    path: '@presets[@active_preset].actions[@presets[@active_preset].active_action].filter.filter',
                                    content: {
                                        // Will be populated
                                    } as { [key: string]: string | undefined },
                                },
                                sort_type: {
                                    type: 'dropdown',
                                    label: 'Sort Type',
                                    hover_tip: 'Choose what kind of sort this is',
                                    default: 'level',
                                    on_change: refresh_action,
                                    path: '@presets[@active_preset].actions[@presets[@active_preset].active_action].sort.sort',
                                    content: {
                                        type: 'Type',
                                        level: 'Level',
                                        srs: 'SRS Level',
                                        leech: 'Leech Score',
                                        overdue: 'Overdue',
                                        critical: 'Critical',
                                    },
                                },
                            },
                        },
                    },
                },
            },
        } // as SettingsModule.Config

        const action = config.content.presets.content.action as SettingsModule.Group
        populate_settings(action)

        // TODO: Update filter value input
        // TODO: Update sort order input

        reorder.settings_dialog = new wkof.Settings(config as SettingsModule.Config)
        reorder.settings_dialog.open()
    }

    function populate_settings(config: SettingsModule.Group) {
        // Populate filters
        for (let [name, filter] of Object.entries(wkof.ItemData.registry.sources.wk_items.filters)) {
            if (filter.no_ui) continue

            // Add to dropdown
            const filter_type = config.content.filter_type as SettingsModule.Dropdown
            filter_type.content[name] = filter.label ?? 'Filter Value'

            // Add filter values
            config.content[`filter_by_${name}`] = {
                type: filter.type === 'multi' ? 'list' : filter.type,
                multi: filter.type === 'multi',
                default: filter.default,
                label: filter.label ?? 'Filter Value',
                hover_tip: filter.hover_tip ?? 'Choose a value for your filter',
                placeholder: filter.placeholder,
                content: filter.content,
                path: `@presets[@active_preset].actions[@presets[@active_preset].active_action].filter.${name}`,
            } as SettingsModule.Component
        }

        // Add filter inversion so that it comes after all values
        config.content.filter_invert = {
            type: 'checkbox',
            label: 'Invert Filter',
            hover_tip: 'Check this box if you want to invert the effect of this filter.',
            default: false,
            path: '@presets[@active_preset].actions[@presets[@active_preset].active_action].filter.invert',
        }

        // Populate sort values
        const numerical_sort_config = (type: string) =>
            ({
                type: 'dropdown',
                default: 'asc',
                label: 'Order',
                hover_tip: 'Sort in ascending or descending order',
                path: `@presets[@active_preset][@active_action].sort.${type}`,
                content: { asc: 'Ascending', desc: 'Descending' },
            } as SettingsModule.Dropdown)

        config.content.sort_by_type = {
            type: 'text',
            label: 'Order',
            default: 'rad, kan, voc',
            placeholder: 'rad, kan, voc',
            hover_tip: 'Comma separated list of short subject type names. Eg. "rad, kan, voc" or "kan, rad',
            path: `@presets[@active_preset][@active_action].sort.type`,
        }
        for (let type of ['level', 'srs', 'leech', 'overdue', 'critical'])
            config.content[`sort_by_${type}`] = numerical_sort_config(type)
    }

    function settings_pre_open(dialog: JQuery): void {
        // Add buttons to the presets and actions lists
        const buttons = (type: string) =>
            `<div class="list_buttons">` +
            `<button type="button" ref="${type}" action="new" class="ui-button ui-corner-all ui-widget" title="Create a new ${type}"><span class="fa fa-plus"></span></button>` +
            `<button type="button" ref="${type}" action="up" class="ui-button ui-corner-all ui-widget" title="Move the selected ${type} up in the list"><span class="fa fa-arrow-up"></span></button>` +
            `<button type="button" ref="${type}" action="down" class="ui-button ui-corner-all ui-widget" title="Move the selected ${type} down in the list"><span class="fa fa-arrow-down"></span></button>` +
            `<button type="button" ref="${type}" action="delete" class="ui-button ui-corner-all ui-widget" title="Delete the selected ${type}"><span class="fa fa-trash"></span></button>` +
            `</div>`

        let wrap = dialog.find(`#${script_id}_active_preset`).closest('.row').addClass('list_wrap')
        wrap.prepend(buttons('preset')).find('.list_buttons').on('click', 'button', list_button_pressed)

        wrap = dialog.find(`#${script_id}_active_action`).closest('.row').addClass('list_wrap')
        wrap.prepend(buttons('action')).find('.list_buttons').on('click', 'button', list_button_pressed)

        // Set some classes
        dialog.find('[name="filter_type"]').closest('.row').addClass('filter')
        dialog.find('[name="filter_invert"]').closest('.row').addClass('filter')
        dialog.find('[name="sort_type"]').closest('.row').addClass('sort')

        refresh_presets()
        refresh_actions()
    }

    function refresh_settings() {
        refresh_presets()
        refresh_actions()
    }

    function refresh_presets() {
        populate_list($(`#${script_id}_active_preset`), reorder.settings.presets, reorder.settings.active_preset)
    }

    function refresh_actions() {
        const preset = reorder.settings.presets[reorder.settings.active_preset]
        if (!preset) return
        populate_list($(`#${script_id}_active_action`), preset.actions, preset.active_action)
        refresh_action()
    }

    function populate_list(elem: JQuery, items: { name: string }[], active_item: number) {
        if (!items) return
        let html = ''
        for (let [id, { name }] of Object.entries(items)) {
            name = name.replace(/</g, '&lt;').replace(/>/g, '&gt;')
            html += `<option name="${id}">${name}</option>`
        }
        elem.html(html)
        elem.children().eq(active_item).prop('selected', true) // Select the active item
    }

    function refresh_action() {
        // Set action type
        const type = $(`#${script_id}_action_type`).val() as string
        $(`#${script_id}_action`).attr('type', type)

        // Update visible input
        const preset = reorder.settings.presets[reorder.settings.active_preset]
        const action = preset.actions[preset.active_action]
        $('.visible_action_value').removeClass('visible_action_value')
        if (action.type === 'sort' || action.type === 'filter') {
            $(`#${script_id}_${action.type}_by_${action[action.type][action.type]}`)
                .closest('.row')
                .addClass('visible_action_value')
        }
    }

    function list_button_pressed(e: any) {
        const ref = (e.currentTarget as any).attributes.ref.value
        const btn = (e.currentTarget as any).attributes.action.value
        const elem = $(`#${script_id}_active_` + ref)

        let default_item, root, list, key
        if (ref === 'preset') {
            default_item = get_preset_defaults()
            root = reorder.settings
            list = reorder.settings.presets
            key = 'active_preset'
        } else {
            default_item = get_action_defaults()
            root = reorder.settings.presets[reorder.settings.active_preset]
            list = root.actions
            key = 'active_action'
        }

        switch (btn) {
            case 'new':
                list.push(default_item)
                root[key] = list.length - 1
                break
            case 'delete':
                list.push(...list.splice(root[key]).slice(1)) // Remove from list by index
                if (root[key] && root[key] >= list.length) root[key]--
                if (list.length === 0) list.push(default_item)
                break
            case 'up':
                swap(list, root[key] - 1, root[key])
                root[key]--
                break
            case 'down':
                swap(list, root[key] + 1, root[key])
                root[key]++
                break
        }

        populate_list(elem, list, root[key])
        reorder.settings_dialog.refresh()
        if (btn === 'new') $(`#${script_id}_${ref}_name`).focus().select()
    }

    function swap(list: any[], i: number, j: number) {
        if (list.length <= i || list.length <= j || i < 0 || j < 0) return
        const temp = list[i]
        list[i] = list[j]
        list[j] = temp
    }
})()
