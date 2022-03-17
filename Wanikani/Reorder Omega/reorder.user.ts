// ==UserScript==
// @name         Wanikani: Reorder Omega
// @namespace    http://tampermonkey.net/
// @version      0.1.8
// @description  Reorders n stuff
// @author       Kumirei
// @include      /^https://(www|preview).wanikani.com/((dashboard)?|((review|lesson|extra_study)/session))/
// @grant        none
// @license      MIT
// ==/UserScript==

// These lines are necessary to make sure that TSC does not put any exports in the
// compiled js, which causes the script to crash
const module = {}
export = null

// Import types
import { WKOF, ItemData, Menu, Settings as SettingsModule, SubjectType, SubjectTypeShortString } from './wkof'
import { Review, Settings } from './reorder'

// We have to extend the global window object since the values are already present
// and we don't provide them ourselves
declare global {
    interface Window {
        // We have to insert the modules we want to use into the WKOF type
        wkof: WKOF & ItemData & Menu & SettingsModule
        $: JQueryStatic
        WaniKani: any
    }
}

// Actual script
;(async () => {
    // TODO: Anki mode?
    // TODO: Audio quiz mode?

    // Script info
    const script_id = 'reorder_omega'
    const script_name = 'Reorder Omega'

    // Globals
    const { wkof, $ } = window

    // Constants
    const MS = { second: 1000, minute: 60000, hour: 3600000, day: 86400000 }

    // Page variables
    let page: 'other' | 'dashboard' | 'reviews' | 'lessons' | 'extra_study' | 'self_study',
        current_item_key: string = 'currentItem',
        active_queue_key: string = 'activeQueue',
        inactive_queue_key: string = 'reviewQueue',
        question_type_key: string = 'questionType',
        UID_prefix: string = '',
        trace_function: string = 'randomQuestion',
        egg_timer_location: string = '#summary-button',
        preset_selection_location: string = '#character'
    page = set_page_variables()

    // Settings objects
    let settings: Settings.Settings
    let settings_dialog: SettingsModule.Dialog

    // This has to be done before WK realizes that the queue is empty and
    // redirects, thus we have to do it before initializing WKOF
    if (page === 'self_study') display_loading()

    // Initiate WKOF
    await confirm_wkof()
    wkof.include('Settings,Menu,ItemData')
    wkof.ready('ItemData.registry').then(install_filters)
    await wkof.ready('Settings,Menu').then(load_settings).then(install_menu)

    // Install css
    install_css()

    // Decide what to do depending on the page
    switch (page) {
        case 'dashboard':
            add_to_extra_study_section()
            break
        case 'reviews':
        case 'lessons':
        case 'extra_study':
        case 'self_study':
            install_interface()
            install_extra_features()
            set_body_attributes()
            run()
            break
    }

    // Set all the global variables which have different values on different pages
    function set_page_variables(): 'other' | 'dashboard' | 'reviews' | 'lessons' | 'extra_study' | 'self_study' {
        const path = window.location.pathname
        const self_study_url = window.location.search === `?title=${encodeURIComponent(script_name)}`

        if (/^\/(DASHBOARD)?$/i.test(path)) page = 'dashboard'
        else if (/REVIEW\/session/i.test(path)) page = 'reviews'
        else if (/LESSON\/session/i.test(path)) page = 'lessons'
        else if (/EXTRA_STUDY\/session/i.test(path)) page = self_study_url ? 'self_study' : 'extra_study'
        else page = 'other'

        switch (page) {
            case 'dashboard':
            case 'other':
                break // These don't need those variables
            case 'reviews':
                break // Defaults are for review
            case 'lessons':
                current_item_key = 'l/currentLesson'
                active_queue_key = 'l/activeQueue'
                inactive_queue_key = 'l/lessonQueue'
                question_type_key = 'l/questionType'
                UID_prefix = 'l/stats/'
                trace_function = 'selectItem'
                egg_timer_location = '#header-buttons'
                preset_selection_location = '#main-info'
                break
            case 'extra_study':
            case 'self_study':
                inactive_queue_key = 'practiceQueue'
                UID_prefix = 'e/stats/'
                // trace_function = 'selectQuestion'
                break
        }

        return page
    }

    // -----------------------------------------------------------------------------------------------------------------
    // PROCESS QUEUE
    // -----------------------------------------------------------------------------------------------------------------

    // Runs the selected preset on the queue
    async function run(): Promise<void> {
        let items = await wkof.ItemData.get_items('assignments,review_statistics')
        const items_by_id = wkof.ItemData.get_index<ItemData.Item>(items, 'subject_id')

        switch (page) {
            case 'reviews':
            case 'lessons':
            case 'extra_study':
                items = get_queue_ids().map((id) => items_by_id[id])
                break
            case 'self_study':
                const completed = get_completed_ids()
                items = items.filter((item) => !completed.has(item.id)) // Filter out answered items
                shuffle(items) // Always shuffle self study items
                break
            default:
                return
        }

        process_queue(items)
    }

    // Finds the active preset and runs it against the queue
    function process_queue(items: ItemData.Item[]): void {
        page = page as 'reviews' | 'lessons' | 'extra_study' | 'self_study'

        const preset = settings.presets[settings.active_presets[page]]
        if (!preset) return display_message('Invalid Preset') // Active preset not defined
        const results = process_preset(preset, items)
        if (!results.length) return display_message('No items in preset')

        // Load into queue
        update_queue(results)
    }

    // Type used only in the functions below
    type PresetItems = { keep: ItemData.Item[]; discard: ItemData.Item[]; final: ItemData.Item[] }

    // Calls all the preset actions on the items while keeping the items in three categories:
    // keep: Items that are kept by filters and sorted by sorts
    // discard: Items that have been discarded by filters
    // final: Items which have been frozen by the "Freeze & Restore" action
    function process_preset(preset: Settings.Preset, items: ItemData.Item[]): ItemData.Item[] {
        let result: PresetItems = { keep: items, discard: [], final: [] }
        for (let action of preset.actions) {
            result = process_action(action, result)
        }
        return result.final.concat(result.keep) // Add the kept items to final
    }

    // Performs the actions on the items
    function process_action(action: Settings.Action, items: PresetItems): PresetItems {
        switch (action.type) {
            case 'none':
                return items
            case 'filter':
                const { keep, discard } = process_filter(action, items.keep)
                return { keep, discard: items.discard.concat(discard), final: items.final }
            case 'sort':
                return { keep: process_sort_action(action, items.keep), discard: items.discard, final: items.final }
            case 'freeze & restore':
                return { keep: items.discard, discard: [], final: items.final.concat(items.keep) }
            case 'shuffle':
                return { keep: shuffle<ItemData.Item>(items.keep), discard: items.discard, final: items.final }
            default:
                // ? Maybe return nothing and display a message?
                return items // Invalid action type
        }
    }

    // Filters items according to the filter action
    function process_filter(action: Settings.Action, items: ItemData.Item[]): KeepAndDiscard<ItemData.Item> {
        const filter = wkof.ItemData.registry.sources.wk_items.filters[action.filter.filter]
        if (!filter) return { keep: items, discard: [] } // Invalid filter, keep everything
        const filter_value = filter.filter_value_map
            ? filter.filter_value_map(action.filter[action.filter.filter])
            : action.filter[action.filter.filter]
        const filter_func = (item: ItemData.Item): boolean =>
            xor(action.filter.invert, filter.filter_func(filter_value, item))
        return keep_and_discard(items, filter_func)
    }

    // Sorts the items based on the provided action settings
    function process_sort_action(action: Settings.Action, items: ItemData.Item[]): ItemData.Item[] {
        let sort: (a: ItemData.Item, b: ItemData.Item) => number

        switch (action.sort.sort) {
            case 'level':
                sort = (a, b) => numerical_sort(a.data.level, b.data.level, action.sort.level)
                break
            case 'type':
                const order = parse_short_subject_type_string(action.sort.type)
                sort = (a, b) => sort_by_list(a.object, b.object, order)
                break
            case 'srs':
                sort = (a, b) =>
                    numerical_sort(a.assignments?.srs_stage ?? -1, b.assignments?.srs_stage ?? -1, action.sort.srs)
                break
            case 'overdue':
                sort = (a, b) => numerical_sort(calculate_overdue(a), calculate_overdue(b), action.sort.overdue)
                break
            case 'leech':
                sort = (a, b) => numerical_sort(calculate_leech_score(a), calculate_leech_score(b), action.sort.leech)
                break
            default:
                return [] // Invalid sort key
        }

        return items.sort(sort)
    }

    // Retrieves the ids of the the items in the current queue
    function get_queue_ids(): number[] {
        const active_queue = $.jStorage.get<Review.Item[]>(active_queue_key)

        // Swap current item into first position so that the current item doesn't change
        const current_item = $.jStorage.get<Review.Item>(current_item_key)
        const current_item_index = active_queue.findIndex((item) => item.id === current_item.id)
        swap(active_queue, 0, current_item_index)

        const inactive_queue = $.jStorage.get<(Review.Item | number)[]>(inactive_queue_key)
        const remaining_queue = inactive_queue.map((item) => (typeof item === 'number' ? item : item.id))
        return active_queue.map((item) => item.id).concat(remaining_queue)
    }

    // Retrieves the ids of already completed items
    function get_completed_ids(): Set<number> {
        const completed = $.jStorage.get<Review.Item[]>('completedItems') // Could be a page variable, but only extra study uses this
        return new Set(completed.map((item) => item.id))
    }

    // -----------------------------------------------------------------------------------------------------------------
    // QUEUE MANAGEMENT
    // -----------------------------------------------------------------------------------------------------------------

    // This function is crucial to the script working on the extra_study page as it is needed to stop WK
    // from thinking that the queue is empty. So we insert an item into the queue saying "Loading..." while
    // we wait for everything to load
    function display_loading(): void {
        const callback = () => {
            const queue = $.jStorage.get<Review.Queue>(inactive_queue_key)
            $.jStorage.set('questionType', 'meaning')
            if ('table' in queue) {
                // Since the url is invalid the queue will contain an error. We must wait
                // until the error is set until we can set our queue
                display_message('Loading...')
            }
            $.jStorage.stopListening(inactive_queue_key, callback)
        }
        $.jStorage.listenKeyChange(inactive_queue_key, callback)
    }

    // Displays a message to the user by setting the current item to a vocabulary word with the message
    function display_message(message: string): void {
        const dummy = { type: 'Vocabulary', voc: message, id: 0 }
        $.jStorage.set(current_item_key, dummy)
        $.jStorage.set(active_queue_key, [dummy])
        $.jStorage.set(inactive_queue_key, [])
    }

    // Takes a list of WKOF item and puts them into the queue
    async function update_queue(items: ItemData.Item[]): Promise<void> {
        let current_item: Review.Item, active_queue: Review.Item[], rest: number[] | Review.Item[]

        switch (page) {
            case 'lessons':
                update_lesson_counts(items)
                rest = await get_item_data(items)
                active_queue = rest.splice(0, $.jStorage.get<number>('l/batchSize'))
                current_item = active_queue[0]
                break
            case 'extra_study':
            case 'self_study':
                // The extra study active queue is a bit strange. It ever only picks the last item of the queue,
                // and replenishes it from the back. This means that the first 9 items of the active queue are the
                // last 9 items you will see...
                let active_queue_composition: ItemData.Item[]
                if (items.length >= 10) active_queue_composition = items.splice(0, 1).concat(items.splice(-9, 9))
                else active_queue_composition = items
                active_queue = await get_item_data(active_queue_composition.reverse())
                current_item = active_queue[active_queue.length - 1]
                rest = items.map((item) => item.id)
                break
            default:
                active_queue = await get_item_data(items.splice(0, 10))
                current_item = active_queue[0]
                rest = items.map((item) => item.id)
                break
        }

        if (current_item.type === 'Radical') $.jStorage.set(question_type_key, 'meaning') // Has to be set before currentItem
        $.jStorage.set(current_item_key, current_item)
        $.jStorage.set(active_queue_key, active_queue)
        $.jStorage.set(inactive_queue_key, rest.reverse()) // Reverse because items are popped from inactive queue
    }

    // Retrieves the item's info from the WK api
    async function get_item_data(items: ItemData.Item[]): Promise<Review.Item[]> {
        // Lessons already have all the data
        if (page === 'lessons') {
            const active_queue = $.jStorage.get<Review.Item[]>(active_queue_key)
            const inactive_queue = $.jStorage.get<Review.Item[]>(inactive_queue_key)
            const lesson_items = Object.fromEntries(active_queue.concat(inactive_queue).map((item) => [item.id, item])) // Map id to item
            return items.map((item) => lesson_items[item.id]) // Replace WKOF item with WK item
        }

        // Fetch from API for reviews and extra/self study
        const ids = items.map((item) => item.id)
        const response = await fetch(`/extra_study/items?ids=${ids.join(',')}`) // Can use this endpoint for all pages
        if (response.status !== 200) {
            console.error('Could not fetch active queue')
            return []
        }
        const data = (await response.json()) as Review.Item[]
        return ids.map((id) => data.find((item) => item.id === id)) as Review.Item[] // Re-sort
    }

    // Updates the radical, kanji, and vocab counts in lessons
    function update_lesson_counts(items: ItemData.Item[]) {
        const counts = wkof.ItemData.get_index(items, 'item_type') as { [key: string]: ItemData.Item[] }
        $.jStorage.set('l/count/rad', counts.radical?.length ?? 0)
        $.jStorage.set('l/count/kan', counts.kanji?.length ?? 0)
        $.jStorage.set('l/count/voc', counts.vocabulary?.length ?? 0)
    }

    // -----------------------------------------------------------------------------------------------------------------
    // ITEM INFORMATION
    // -----------------------------------------------------------------------------------------------------------------

    // Calculate how overdue an item is based on its available_at date and SRS stage
    const SRS_DURATIONS = [4, 8, 23, 47, 167, 335, 719, 2879, Infinity].map((time) => time * MS.hour)
    function calculate_overdue(item: ItemData.Item): number {
        // Items without assignments or due dates, and burned items, are not overdue
        if (!item.assignments || !item.assignments.available_at || item.assignments.srs_stage == 9) return -1
        const dueMsAgo = Date.now() - Date.parse(item.assignments.available_at)
        return dueMsAgo / SRS_DURATIONS[item.assignments.srs_stage - 1]
    }

    // Checks whether an item is critical to leveling up or not
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

    // Parses strings such as "kan, rad, voc" into lists of strings
    function parse_short_subject_type_string(str: string): SubjectType[] {
        const type_map: { [key: string]: SubjectType } = { rad: 'radical', kan: 'kanji', voc: 'vocabulary' }
        return str
            .replace(/\s/g, '')
            .split(',')
            .map((type) => type_map[type])
    }

    // -----------------------------------------------------------------------------------------------------------------
    // UTILITY FUNCTIONS
    // -----------------------------------------------------------------------------------------------------------------

    // Logical XOR
    function xor(a: boolean, b: boolean): boolean {
        return a !== b // Since a and b are guaranteed to be boolean
    }

    // Sorts items by the order they appear in a list
    function sort_by_list<T>(a: T, b: T, order: T[]): number {
        return (order.indexOf(a) + 1 || order.length + 1) - (order.indexOf(b) + 1 || order.length + 1)
    }

    // A filter function that also returns the items discarded by the filter
    type KeepAndDiscard<T> = { keep: T[]; discard: T[] }
    function keep_and_discard<T>(items: T[], filter: (item: T) => boolean): KeepAndDiscard<T> {
        const results: KeepAndDiscard<T> = { keep: [], discard: [] }
        for (let item of items) {
            const keep = filter(item)
            results[keep ? 'keep' : 'discard'].push(item)
        }
        return results
    }

    // Randomizes the order of items in the array
    function shuffle<T>(arr: T[]): T[] {
        let j, x, i
        for (i = arr.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1))
            x = arr[i]
            arr[i] = arr[j]
            arr[j] = x
        }
        return arr
    }

    // Swap two members of a list
    function swap(list: any[], i: number, j: number) {
        if (list.length <= i || list.length <= j || i < 0 || j < 0) return
        const temp = list[i]
        list[i] = list[j]
        list[j] = temp
    }

    // Sorts item in numerical order, either ascending or descending
    function numerical_sort(a: number, b: number, order: 'asc' | 'desc'): number {
        return order === 'asc' ? a - b : order === 'desc' ? b - a : 0
    }

    // Converts a number of milliseconds into a relative duration such as "4h 32m 12s"
    function ms_to_relative_time(ms: number): string {
        const days = Math.floor(ms / MS.day)
        const hours = Math.floor((ms % MS.day) / MS.hour)
        const minutes = Math.floor((ms % MS.hour) / MS.minute)
        const seconds = Math.floor((ms % MS.minute) / MS.second)
        let time = ''
        if (days) time += days + 'd '
        if (hours) time += hours + 'h '
        if (minutes) time += minutes + 'm '
        if (seconds) time += seconds + 's '
        return time
    }

    // -----------------------------------------------------------------------------------------------------------------
    // INITIAL SETUP
    // -----------------------------------------------------------------------------------------------------------------

    // On the dashboard, adds a button to take you to the extra study page for the script
    function add_to_extra_study_section(): void {
        const button = $(`<li class="md:mr-3">
            <div class=" border border-blue-300 border-solid rounded flex flex-row ">
                <a href="/extra_study/session?title=${script_name}" class="active:no-underline active:text-black
                appearance-none bg-transparent box-border disabled:border-gray-700 disabled:cursor-not-allowed
                disabled:opacity-50 disabled:text-gray-700 duration-200 flex focus:no-underline focus:ring
                font-medium font-sans hover:border-blue-500 hover:no-underline hover:text-blue-700 leading-none m-0
                outline-none py-3 px-3 text-blue-500 text-left text-base sm:text-sm transition w-full border-0"
                data-test="extra-study-button">Self Study
                </a>
            </div>
        </li>`)
        $('.extra-study ul').append(button)
    }

    // Installs the dropdown for selecting the active preset
    function install_interface(): void {
        page = page as 'reviews' | 'lessons' | 'extra_study' | 'self_study'
        const options: string[] = []
        for (let [i, preset] of Object.entries(settings.presets)) {
            if (preset.available_on[page]) options.push(`<option value=${i}>${preset.name}</option>`)
        }
        const select = $(`<select id="${script_id}_preset_picker">${options.join('')}</select>`)
        select.val(settings.active_presets[page]).on('change', (event: any) => {
            page = page as 'reviews' | 'lessons' | 'extra_study' | 'self_study'
            // Change in settings then save
            settings.active_presets[page] = event.currentTarget.value
            wkof.Settings.save(script_id)
            // Update
            run()
        })
        $(preset_selection_location).append($(`<div id="active_preset">Active Preset: </div>`).append(select))
    }

    // Installs all the extra optional features
    function install_extra_features(): void {
        install_egg_timer()
        install_streak()
        install_burn_bell()
        install_random_voice_actor()
        install_back_to_back()
        install_prioritization()

        // Displays the current duration of the sessions
        function install_egg_timer(): void {
            if (!(page in ['reviews', 'lessons', 'extra_study', 'self_study'])) return
            const egg_timer_start = Date.now()
            const egg_timer = $(`<div id="egg_timer">Elapsed: 0s</div>`)
            setInterval((): void => {
                egg_timer.html(`Elapsed: ${ms_to_relative_time(Date.now() - egg_timer_start)}`)
            }, MS.second)
            $(egg_timer_location).append(egg_timer)
        }

        // Installs the tracking of streaks of correct answers (note: not items)
        function install_streak(): void {
            if (!(page in ['reviews', 'extra_study', 'self_study'])) return

            // Create and insert element into page
            const elem = $(
                `<span id="streak"><i class="fa fa-trophy"></i><span class="current">0</span>(<span class="max">0</span>)</span>`,
            )
            $('#stats').prepend(elem)

            function update_display(streak: number, max: number): void {
                $('#streak .current').html(String(streak))
                $('#streak .max').html(String(max))
            }

            type StreakTracker = {
                questions: number
                incorrect: number
                streak: number
                max: number
            }

            // The object that keeps track of the current (and previous!) streak
            const streak = {
                current: {} as StreakTracker,
                prev: {} as StreakTracker,
                save: (): void =>
                    localStorage.setItem(
                        `${script_id}_streak`,
                        JSON.stringify({ streak: streak.current.streak, max: streak.current.max }),
                    ),
                load: (): void => {
                    const data: StreakTracker = {
                        questions: 0,
                        incorrect: 0,
                        ...JSON.parse(localStorage.getItem(`${script_id}_${page}_streak`) ?? '{"streak": 0, "max": 0}'),
                    }
                    streak.current = data
                    streak.prev = data
                },
                undo: (): void => {
                    streak.current = streak.prev
                },
                correct: (questions: number, incorrect: number): void => {
                    streak.prev = streak.current
                    streak.current = {
                        questions,
                        incorrect,
                        streak: streak.current.streak + 1,
                        max: Math.max(streak.current.streak + 1, streak.current.max),
                    }
                },
                incorrect: (questions: number, incorrect: number): void => {
                    streak.prev = streak.current
                    streak.current = { questions, incorrect, streak: 0, max: streak.current.max }
                },
            }
            streak.load()
            update_display(streak.current.streak, streak.current.max)

            $.jStorage.listenKeyChange('questionCount', (): void => {
                const questions: number = $.jStorage.get('questionCount')
                const incorrect: number = $.jStorage.get('wrongCount')
                if (questions < streak.current.questions) streak.undo()
                else if (incorrect == streak.current.incorrect) streak.correct(questions, incorrect)
                else streak.incorrect(questions, incorrect)
                streak.save()
                update_display(streak.current.streak, streak.current.max)
            })
        }

        // Installs the burn bell, which plays a sound whenever an item is burned
        function install_burn_bell(): void {
            if (page !== 'reviews') return

            // The base 64 audio is a very long string and is, as such, located at the end of the script
            const audio = new Audio(`data:audio/mp3;base64,${base64BellAudio}`)

            let listening: { [key: string]: { failed: boolean } } = {}
            let getUID = (item: Review.Item): string => (item.rad ? 'r' : item.kan ? 'k' : 'v') + item.id
            $.jStorage.listenKeyChange('currentItem', initiate_item)

            function initiate_item(): void {
                let item = $.jStorage.get<Review.Item>('currentItem')
                if (item.srs !== 8) return
                let UID = getUID(item)
                if (!listening[UID]) listen_for_UID(UID)
            }

            function listen_for_UID(UID: string): void {
                listening[UID] = { failed: false }
                $.jStorage.listenKeyChange(UID, () => check_answer(UID))
            }

            function check_answer(UID: string): void {
                let answers = $.jStorage.get<Review.AnswersObject>(UID)
                if (answers && (answers.ri || answers.mi)) listening[UID].failed = true
                if (!answers && !listening[UID].failed) burn(UID)
            }

            function burn(UID: string): void {
                if (settings.burn_bell) audio.play()
                delete listening[UID]
            }
        }

        // Sets up the randomization of the voice actor in the quizzes
        function install_random_voice_actor(): void {
            if (!(page in ['reviews', 'lessons', 'extra_study', 'self_study'])) return
            $.jStorage.listenKeyChange('*', randomize_voice_actor)

            function randomize_voice_actor(): void {
                const voice_actors = window.WaniKani.voice_actors
                const voice_actor_id = voice_actors[Math.floor(Math.random() * voice_actors.length)].voice_actor_id
                if (settings.random_voice_actor) window.WaniKani.default_voice_actor_id = voice_actor_id
            }
        }

        // Sets up the back2back features so that meaning and reading questions
        // can be made to appear after each other
        function install_back_to_back(): void {
            if (!(page in ['reviews', 'lessons', 'extra_study', 'self_study'])) return

            // Replace Math.random only for the wanikani script this is done by throwing an error and
            // checking the trace to see if either of the functions 'randomQuestion' (reviews page),
            // 'selectItem' (lessons page), or 'selectItem' (extra study page) are present. WK uses
            // functions with these names to pick the next question, so we must alter the behavior
            // of Math.random only when called from either of those functions.
            const trace_function_test = new RegExp(`^^Error\\n[^)]+\\)\n\\s+at Object.${trace_function}`)
            const old_random = Math.random
            const new_random = function (): number {
                const match = !!trace_function_test.exec(new Error().stack as string)
                if (match && settings.back2back) return 0
                return old_random()
            }
            Math.random = new_random

            console.log(
                'Beware, "Back To Back" is installed and may cause other scripts using Math.random ' +
                    `in a function called "${trace_function}" to misbehave.`,
            )

            // Set item 0 in active queue to current item so the first item will be back to back
            if (page in ['reviews', 'lessons', 'extra_study', 'self_study']) {
                // If active queue is not yet populated, wait until it is to set the currentItem
                const callback = () => {
                    const active_queue = $.jStorage.get<Review.Item[]>(active_queue_key)
                    let current_item = active_queue[0]
                    if (page in ['extra_study', 'self_study']) current_item = active_queue[active_queue.length - 1] // Extra study page picks last item
                    if (settings.back2back) $.jStorage.set(current_item_key, current_item)
                    $.jStorage.stopListening(active_queue_key, callback)
                }
                if ($.jStorage.get<Review.Item[]>(active_queue_key)?.length) callback()
                else $.jStorage.listenKeyChange(active_queue_key, callback)
            }
        }

        // Sets up prioritization of meaning and reading questions in sessions
        function install_prioritization(): void {
            // Run every time item changes
            $.jStorage.listenKeyChange(current_item_key, prioritize)
            // Initialize session to prioritized question type
            prioritize()

            // Prioritize reading or meaning
            function prioritize(): void {
                const prio = settings.prioritize
                const item = $.jStorage.get<Review.Item>(current_item_key)
                // Skip if item is a radical, it is already the right question, or no priority is selected
                if (
                    item.type == 'Radical' ||
                    $.jStorage.get<'meaning' | 'reading'>(question_type_key) == prio ||
                    'none' == prio
                )
                    return
                const UID = (item.type == 'Kanji' ? 'k' : 'v') + item.id
                const done = $.jStorage.get<Review.AnswersObject>(UID_prefix + UID)
                // Change the question if no question has been answered yet,
                // Or the priority question has not been answered correctly yet
                if (!done || !done[prio == 'reading' ? 'rc' : 'mc']) {
                    $.jStorage.set(question_type_key, prio)
                    $.jStorage.set(current_item_key, item)
                }
            }
        }
    }

    // Installs a couple of custom filters for the user
    function install_filters(): void {
        // Filters by how overdue items are
        wkof.ItemData.registry.sources.wk_items.filters[`${script_id}_overdue`] = {
            type: 'number',
            default: 0,
            label: 'Overdue%',
            hover_tip:
                'Items more overdue than this. A percentage.\nNegative: Not due yet\nZero: due now\nPositive: Overdue',
            filter_func: (value, item) => calculate_overdue(item) * 100 > value,
        }

        // Filters by whether the item is critical to leveling up
        wkof.ItemData.registry.sources.wk_items.filters[`${script_id}_critical`] = {
            type: 'checkbox',
            default: true,
            label: 'Critical',
            hover_tip: 'Filter for items critical to leveling up',
            filter_func: (value, item) => value === is_critical(item),
        }

        // Retrieves the first N number of items from the queue
        wkof.ItemData.registry.sources.wk_items.filters[`${script_id}_first`] = {
            type: 'number',
            default: 0,
            label: 'First',
            hover_tip: 'Get the first N number of items from the queue',
            filter_func: (() => {
                let count = 0
                let filter_start = 0
                return ({ value, start }, item) => {
                    if (filter_start !== start) {
                        // Reset if this is a different filter
                        filter_start = start
                        count = 0
                    }
                    return count++ < value
                }
            })(),
            filter_value_map: (value: number) => {
                return { value, start: Date.now() }
            },
        }
    }

    // Installs the CSS
    function install_css() {
        const css = `
            #wkofs_reorder_omega.wkof_settings .list_wrap { display: flex; }

            #wkofs_reorder_omega.wkof_settings .list_wrap .list_buttons {
                display: flex;
                flex-direction: column;
            }

            #wkofs_reorder_omega.wkof_settings .list_wrap .list_buttons button {
                height: 25px;
                aspect-ratio: 1;
                padding: 0;
            }

            #wkofs_reorder_omega.wkof_settings .list_wrap .right { flex: 1; }
            #wkofs_reorder_omega.wkof_settings .list_wrap .right select { height: 100%; }

            #wkofs_reorder_omega #reorder_omega_action > section ~ *{ display: none; }

            #wkofs_reorder_omega #reorder_omega_action[type="None"] .none,
            #wkofs_reorder_omega #reorder_omega_action[type="Sort"] .sort,
            #wkofs_reorder_omega #reorder_omega_action[type="Filter"] .filter,
            #wkofs_reorder_omega #reorder_omega_action[type="Shuffle"] .shuffle,
            #wkofs_reorder_omega #reorder_omega_action[type="Freeze & Restore"] .freeze_and_restore,
            #wkofs_reorder_omega #reorder_omega_action .visible_action_value {
                display: block;
            }

            #wkofs_reorder_omega #reorder_omega_action .description { padding-bottom: 0.5em; }

            #active_preset {
                font-size: 1rem;
                line-height: 1rem;
                padding: 0.5rem;
                position: absolute;
                bottom: 0;
            }

            #active_preset select {
                background: transparent !important;
                border: none;
                box-shadow: none !important;
                color: currentColor;
            }

            #active_preset select option { color: black; }

            body[reorder_omega_display_egg_timer="false"] #egg_timer,
            body[reorder_omega_display_streak="false"] #streak {
                display: none;
            }

            body > div[data-react-class="Lesson/Lesson"] #egg_timer { color: white; }
        `

        $('head').append(`<style id="${script_id}_css">${css}</style>`)
    }

    // -----------------------------------------------------------------------------------------------------------------
    // WKOF SETUP
    // -----------------------------------------------------------------------------------------------------------------

    // Makes sure that WKOF is installed
    async function confirm_wkof(): Promise<void> {
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

    // Load WKOF settings
    function load_settings(): Promise<Settings.Settings> {
        const defaults: Settings.Settings = {
            selected_preset: 0,
            active_presets: {
                reviews: 0,
                lessons: 0,
                extra_study: 0,
                self_study: 0,
            },
            presets: get_default_presets(),
            display_egg_timer: true,
            display_streak: true,
            burn_bell: false,
            random_voice_actor: false,
            back2back: false,
            prioritize: 'none',
        }
        return wkof.Settings.load(script_id, defaults).then(
            (wkof_settings) => (settings = wkof_settings as Settings.Settings),
        )
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
        const config: SettingsModule.Config = {
            script_id,
            title: script_name,
            pre_open: settings_pre_open,
            on_refresh: refresh_settings,
            on_save: settings_on_save,
            content: {
                // General Tab
                // ------------------------------------------------------------
                general: {
                    type: 'page',
                    label: 'General',
                    content: {
                        // Active Presets
                        // ------------------------------------------------------------
                        active_presets: {
                            type: 'group',
                            label: 'Active Presets',
                            content: {
                                reviews: {
                                    type: 'dropdown',
                                    label: 'Review preset',
                                    path: '@active_presets.reviews',
                                    content: {
                                        // Will be populated
                                    },
                                },
                                lessons: {
                                    type: 'dropdown',
                                    label: 'Lesson preset',
                                    path: '@active_presets.lessons',
                                    content: {
                                        // Will be populated
                                    },
                                },
                                extra_study: {
                                    type: 'dropdown',
                                    label: 'Extra Study preset',
                                    path: '@active_presets.extra_study',
                                    content: {
                                        // Will be populated
                                    },
                                },
                                self_study: {
                                    type: 'dropdown',
                                    label: 'Self Study preset',
                                    path: '@active_presets.self_study',
                                    content: {
                                        // Will be populated
                                    },
                                },
                            },
                        },
                        // Other settings
                        // ------------------------------------------------------------
                        other: {
                            type: 'group',
                            label: 'Other',
                            content: {
                                display_egg_timer: {
                                    type: 'checkbox',
                                    default: false,
                                    label: 'Display Egg Timer',
                                    hover_tip: 'Display a timer showing how long you have been studying for',
                                },
                                display_streak: {
                                    type: 'checkbox',
                                    default: true,
                                    label: 'Display Streak',
                                    hover_tip: 'Keep track of how many questions in a row you have answered correctly',
                                },
                                burn_bell: {
                                    type: 'checkbox',
                                    default: false,
                                    label: 'Burn Bell',
                                    hover_tip: 'Play a bell sound when you burn an item',
                                },
                                random_voice_actor: {
                                    type: 'checkbox',
                                    default: false,
                                    label: 'Random Voice Actor',
                                    hover_tip: 'Randomize which voice gets played',
                                },
                                back2back: {
                                    type: 'checkbox',
                                    default: false,
                                    label: 'Back To Back',
                                    hover_tip: 'Get reading and meaning question back to back',
                                },
                                prioritize: {
                                    type: 'dropdown',
                                    default: 'none',
                                    label: 'Prioritize',
                                    hover_tip: 'Always get either the reading or meaning question first',
                                    content: {
                                        none: 'None',
                                        reading: 'Reading',
                                        meaning: 'Meaning',
                                    },
                                },
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
                                selected_preset: {
                                    type: 'list',
                                    hover_tip: 'Filter & Reorder Presets',
                                    content: {},
                                    refresh_on_change: true,
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
                                    hover_tip: 'Enter a name for the selected preset',
                                    path: '@presets[@selected_preset].name',
                                    on_change: refresh_presets,
                                },
                                available_on: {
                                    type: 'list',
                                    default: { reviews: true, lessons: true, extra_study: true },
                                    multi: true,
                                    label: 'Available For',
                                    hover_tip: 'Choose which pages you should be able to choose this preset on',
                                    path: '@presets[@selected_preset].available_on',
                                    content: {
                                        reviews: 'Reviews',
                                        lessons: 'Lessons',
                                        extra_study: 'Extra Study',
                                        self_study: 'Self Study',
                                    },
                                    on_change: refresh_active_preset_selection,
                                },
                                actions_label: { type: 'section', label: 'Actions' },
                                selected_action: {
                                    type: 'list',
                                    hover_tip: 'Actions for the selected preset',
                                    path: '@presets[@selected_preset].selected_action',
                                    content: {},
                                    refresh_on_change: true,
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
                                    hover_tip: 'Enter a name for the selected action',
                                    path: '@presets[@selected_preset].actions[@presets[@selected_preset].selected_action].name',
                                    on_change: refresh_actions,
                                },
                                action_type: {
                                    type: 'dropdown',
                                    default: 'None',
                                    label: 'Action Type',
                                    hover_tip: 'Choose what kind of action this is',
                                    path: '@presets[@selected_preset].actions[@presets[@selected_preset].selected_action].type',
                                    content: {
                                        none: 'None',
                                        sort: 'Sort',
                                        filter: 'Filter',
                                        shuffle: 'Shuffle',
                                        'freeze & restore': 'Freeze & Restore',
                                    },
                                    on_change: refresh_action,
                                },
                                // Sorts and filters
                                // ------------------------------------------------------------
                                action_label: { type: 'section', label: 'Action Settings' },
                                none_description: {
                                    type: 'html',
                                    html: '<div class="description none">This action has no effect</div>',
                                },
                                sort_description: {
                                    type: 'html',
                                    html: '<div class="description sort">A sort action will sort the items in the queue by a value of your choosing</div>',
                                },
                                filter_description: {
                                    type: 'html',
                                    html: `<div class="description filter">A filter can be used to select which type of items you want to keep</div>`,
                                },
                                shuffle_description: {
                                    type: 'html',
                                    html: '<div class="description shuffle">Randomizes the order of the items in the queue</div>',
                                },
                                freeze_and_restore_description: {
                                    type: 'html',
                                    html: '<div class="description freeze_and_restore">Freeze & Restore is a special type of action which locks in the items you have already filtered and sorted, and then restores all the items you previously filtered out. This is useful for when you want to use a filter to get a specific type of item first, but you still want to keep the items you filtered out</div>',
                                },
                                filter_type: {
                                    type: 'dropdown',
                                    default: 'level',
                                    label: 'Filter Type',
                                    hover_tip: 'Choose what kind of filter this is',
                                    path: '@presets[@selected_preset].actions[@presets[@selected_preset].selected_action].filter.filter',
                                    content: {
                                        // Will be populated
                                    },
                                    on_change: refresh_action,
                                },
                                sort_type: {
                                    type: 'dropdown',
                                    default: 'level',
                                    label: 'Sort Type',
                                    hover_tip: 'Choose what kind of sort this is',
                                    path: '@presets[@selected_preset].actions[@presets[@selected_preset].selected_action].sort.sort',
                                    content: {
                                        type: 'Type',
                                        level: 'Level',
                                        srs: 'SRS Level',
                                        leech: 'Leech Score',
                                        overdue: 'Overdue',
                                        critical: 'Critical',
                                    },
                                    on_change: refresh_action,
                                },
                            },
                        },
                    },
                },
            },
        }

        // @ts-ignore
        // I don't know how to type this properly
        populate_active_preset_options(config.content.general.content.active_presets.content)

        // @ts-ignore
        // I don't know how to type this properly
        const action = config.content.presets.content.action
        populate_action_settings(action)

        settings_dialog = new wkof.Settings(config)
        settings_dialog.open()
    }

    // Edits the settings dialog to insert some buttons, add some classes, and refresh, before it opens
    function settings_pre_open(dialog: JQuery): void {
        // Add buttons to the presets and actions lists
        const buttons = (type: string) =>
            `<div class="list_buttons">` +
            `<button type="button" ref="${type}" action="new" class="ui-button ui-corner-all ui-widget" title="Create a new ${type}"><span class="fa fa-plus"></span></button>` +
            `<button type="button" ref="${type}" action="up" class="ui-button ui-corner-all ui-widget" title="Move the selected ${type} up in the list"><span class="fa fa-arrow-up"></span></button>` +
            `<button type="button" ref="${type}" action="down" class="ui-button ui-corner-all ui-widget" title="Move the selected ${type} down in the list"><span class="fa fa-arrow-down"></span></button>` +
            `<button type="button" ref="${type}" action="delete" class="ui-button ui-corner-all ui-widget" title="Delete the selected ${type}"><span class="fa fa-trash"></span></button>` +
            `</div>`

        let wrap = dialog.find(`#${script_id}_selected_preset`).closest('.row').addClass('list_wrap')
        wrap.prepend(buttons('preset')).find('.list_buttons').on('click', 'button', list_button_pressed)

        wrap = dialog.find(`#${script_id}_selected_action`).closest('.row').addClass('list_wrap')
        wrap.prepend(buttons('action')).find('.list_buttons').on('click', 'button', list_button_pressed)

        // Set some classes
        dialog.find('[name="filter_type"]').closest('.row').addClass('filter')
        dialog.find('[name="filter_invert"]').closest('.row').addClass('filter')
        dialog.find('[name="sort_type"]').closest('.row').addClass('sort')

        // Refresh
        refresh_settings()
    }

    // -----------------------------------------------------------------------------------------------------------------
    // WKOF SETUP: Defaults
    // -----------------------------------------------------------------------------------------------------------------

    // Retrieves the presets that the script comes with
    function get_default_presets(): Settings.Preset[] {
        // Do nothing
        const none = $.extend(true, get_preset_defaults(), {
            name: 'None',
            actions: [
                $.extend(true, get_action_defaults(), {
                    name: 'Do nothing',
                    type: 'none',
                }),
            ] as Settings.Action[],
        })

        // Preset to get all the critical items first
        const speed_demon = $.extend(true, get_preset_defaults(), {
            name: 'Speed Demon',
            available_on: { reviews: true, lessons: true, extra_study: true, self_study: true },
            actions: [
                $.extend(true, get_action_defaults(), {
                    name: 'Filter out non-critical items',
                    type: 'filter',
                    filter: {
                        filter: `${script_id}_critical`,
                        [`${script_id}_critical`]: true,
                    },
                }),
                $.extend(true, get_action_defaults(), {
                    name: 'Get radicals first',
                    type: 'sort',
                    sort: {
                        sort: 'type',
                        type: 'rad',
                    },
                }),
                $.extend(true, get_action_defaults(), {
                    name: 'Put non-critical items back',
                    type: 'freeze & restore',
                }),
            ] as Settings.Action[],
        })

        // Preset to sort by level
        const level = $.extend(true, get_preset_defaults(), {
            name: 'Sort by level',
            available_on: { reviews: true, lessons: false, extra_study: false, self_study: false },
            actions: [
                $.extend(true, get_action_defaults(), {
                    name: 'Sort by level',
                    type: 'sort',
                    sort: { sort: 'level' },
                }),
            ] as Settings.Action[],
        })

        // Preset to sort by SRS level
        const srs = $.extend(true, get_preset_defaults(), {
            name: 'Sort by SRS',
            available_on: { reviews: true, lessons: false, extra_study: false, self_study: false },
            actions: [
                $.extend(true, get_action_defaults(), {
                    name: 'Sort by SRS',
                    type: 'sort',
                    sort: { sort: 'srs' },
                }),
            ] as Settings.Action[],
        })

        // Preset to sort by item type
        const type = $.extend(true, get_preset_defaults(), {
            name: 'Sort by type',
            available_on: { reviews: true, lessons: true, extra_study: true, self_study: false },
            actions: [
                $.extend(true, get_action_defaults(), {
                    name: 'Sort by item type',
                    type: 'sort',
                    sort: {
                        sort: 'type',
                        type: 'rad, kan, voc',
                    },
                }),
            ] as Settings.Action[],
        })

        // Preset to fetch 100 random burned items
        const random_burns = $.extend(true, get_preset_defaults(), {
            name: '100 Random Burned Items',
            available_on: { reviews: false, lessons: false, extra_study: false, self_study: true },
            actions: [
                $.extend(true, get_action_defaults(), {
                    name: 'Filter burns',
                    type: 'filter',
                    filter: {
                        filter: 'srs',
                        srs: { burn: true },
                    },
                }),
                $.extend(true, get_action_defaults(), {
                    name: 'Get first 100 items',
                    type: 'filter',
                    filter: {
                        filter: `${script_id}_first`,
                        [`${script_id}_first`]: 100,
                    },
                }),
            ] as Settings.Action[],
        })

        // Kumi's recommended way to get through a backlog
        const backlog = $.extend(true, get_preset_defaults(), {
            name: 'Backlog',
            available_on: { reviews: true, lessons: false, extra_study: false, self_study: false },
            actions: [
                $.extend(true, get_action_defaults(), {
                    name: 'Sort by level to follow SRS',
                    type: 'sort',
                    sort: { sort: 'srs' },
                }),
                $.extend(true, get_action_defaults(), {
                    name: 'Do 100 items a day to avoid burnout',
                    type: 'filter',
                    filter: {
                        filter: `${script_id}_first`,
                        [`${script_id}_first`]: 100,
                    },
                }),
                $.extend(true, get_action_defaults(), {
                    name: 'Shuffle for the benefits of interleaving',
                    type: 'shuffle',
                }),
            ] as Settings.Action[],
        })

        return [none, speed_demon, level, srs, type, random_burns, backlog]
    }

    // Get a new preset item. This is a function because we want to be able to get a copy of it on demand
    function get_preset_defaults(): Settings.Preset {
        const defaults = {
            name: 'New Preset',
            selected_action: 0,
            available_on: { reviews: true, lessons: true, extra_study: true, self_study: true },
            actions: [get_action_defaults()],
        }
        return defaults
    }

    // Get a new action item. The filter and sort values need to be set as to not get any error in the settings
    // dialog, so we dynamically generate the defaults for the sorts and filters.
    function get_action_defaults(): Settings.Action {
        const defaults = {
            name: 'New Action',
            type: 'none',
            filter: { filter: 'level', invert: false },
            sort: {
                sort: 'level',
                type: 'rad, kan, voc',
            },
        } as Settings.Action // Casting because it is still incomplete

        for (let [name, filter] of Object.entries(wkof.ItemData.registry.sources.wk_items.filters)) {
            defaults.filter[name] = filter.default
        }

        type SortType = 'level' | 'srs' | 'leech' | 'overdue'
        for (let type of ['level', 'srs', 'leech', 'overdue'] as SortType[]) {
            defaults.sort[type] = 'asc'
        }
        return defaults
    }

    // Populate the active preset dropdowns in the general tabs with the available presets for those pages
    function populate_active_preset_options(active_presets: { [key: string]: SettingsModule.Dropdown }) {
        for (let [i, preset] of Object.entries(settings.presets)) {
            const available_on = Object.entries(preset.available_on)
                .filter(([key, value]) => value)
                .map(([key, value]) => key)
            for (let page of available_on) {
                active_presets[page].content[i] = preset.name
            }
        }
    }

    // Insert sorting and filtering options into the config
    function populate_action_settings(config: SettingsModule.Group) {
        // Populate filters
        for (let [name, filter] of Object.entries(wkof.ItemData.registry.sources.wk_items.filters)) {
            if (filter.no_ui) continue

            // Add to dropdown
            const filter_type = config.content.filter_type as SettingsModule.Dropdown
            filter_type.content[name] = filter.label ?? 'Filter Value'

            // Add filter values
            config.content[`filter_by_${name}`] = {
                type: filter.type === 'multi' ? 'list' : filter.type,
                default: filter.default,
                placeholder: filter.placeholder,
                multi: filter.type === 'multi',
                label: filter.label ?? 'Filter Value',
                hover_tip: filter.hover_tip ?? 'Choose a value for your filter',
                path: `@presets[@selected_preset].actions[@presets[@selected_preset].selected_action].filter.${name}`,
                content: filter.content,
            } as SettingsModule.Component
        }

        // Add filter inversion so that it comes after all values
        config.content.filter_invert = {
            type: 'checkbox',
            default: false,
            label: 'Invert Filter',
            hover_tip: 'Check this box if you want to invert the effect of this filter.',
            path: '@presets[@selected_preset].actions[@presets[@selected_preset].selected_action].filter.invert',
        }

        // Populate sort values
        const numerical_sort_config = (type: string) =>
            ({
                type: 'dropdown',
                default: 'asc',
                label: 'Order',
                hover_tip: 'Sort in ascending or descending order',
                path: `@presets[@selected_preset].actions[@presets[@selected_preset].selected_action].sort.${type}`,
                content: { asc: 'Ascending', desc: 'Descending' },
            } as SettingsModule.Dropdown)

        // Sort by type is special
        config.content.sort_by_type = {
            type: 'text',
            default: 'rad, kan, voc',
            placeholder: 'rad, kan, voc',
            label: 'Order',
            hover_tip: 'Comma separated list of short subject type names. Eg. "rad, kan, voc" or "kan, rad"',
            path: `@presets[@selected_preset].actions[@presets[@selected_preset].selected_action].sort.type`,
        }

        // Other sorts are identical
        for (let type of ['level', 'srs', 'leech', 'overdue', 'critical'])
            config.content[`sort_by_${type}`] = numerical_sort_config(type)
    }

    // -----------------------------------------------------------------------------------------------------------------
    // WKOF DYNAMIC SETTINGS
    // -----------------------------------------------------------------------------------------------------------------

    // Actions to take when the user saves their settings
    function settings_on_save() {
        set_body_attributes() // Update attributes on body to hide/show stuff
        run() // Re-run preset in case something changed
    }

    // Set some attributes on the body to hide or show things with CSS
    function set_body_attributes() {
        $(`body`).attr(`${script_id}_display_egg_timer`, String(settings.display_egg_timer))
        $(`body`).attr(`${script_id}_display_streak`, String(settings.display_streak))
    }

    // Refreshes the preset and action selection
    function refresh_settings() {
        refresh_presets()
        refresh_actions()
    }

    // Refreshes the preset selection by updating its contents
    function refresh_presets() {
        populate_list($(`#${script_id}_selected_preset`), settings.presets, settings.selected_preset)
    }

    // Refreshes the action selection by updating its contests
    function refresh_actions() {
        const preset = settings.presets[settings.selected_preset]
        if (!preset) return
        populate_list($(`#${script_id}_selected_action`), preset.actions, preset.selected_action)
        refresh_action()
    }

    // Updates which items are visible in the action section
    function refresh_action() {
        // Set action type
        const type = $(`#${script_id}_action_type`).val() as string
        $(`#${script_id}_action`).attr('type', type)

        // Update visible input
        const preset = settings.presets[settings.selected_preset]
        const action = preset.actions[preset.selected_action]
        $('.visible_action_value').removeClass('visible_action_value')
        if (action.type in ['sort', 'filter']) {
            // @ts-ignore
            // Don't know how to type this properly
            $(`#${script_id}_${action.type}_by_${action[action.type][action.type]}`)
                .closest('.row')
                .addClass('visible_action_value')
        }
    }

    // Updates the contents of a selection elements. Particularly the preset and action selection elements
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

    // Refreshes which items are available in the active preset selection in the general tab
    function refresh_active_preset_selection() {
        for (let type of ['reviews', 'lessons', 'extra_study', 'self_study'])
            populate_preset_pickers(type as 'reviews' | 'lessons' | 'extra_study' | 'self_study')

        function populate_preset_pickers(type: 'reviews' | 'lessons' | 'extra_study' | 'self_study') {
            const elem: JQuery = $(`#reorder_omega_active_presets select[name="${type}"]`)
            const presets = Object.entries(settings.presets).filter(([i, preset]) => preset.available_on[type])
            const selected = settings.active_presets[type]
            const selected_available = presets.reduce((available, [i]) => available || Number(i) == selected, false)
            // If the selected preset is no longer available, default to something that is available
            if (!selected_available) settings.active_presets[type] = Number(presets[0][0])

            // Insert into dialog
            const html = presets
                .map(
                    ([i, preset]) =>
                        `<option name="${i}" ${Number(i) == selected ? 'selected' : ''}>${preset.name}</option>`,
                )
                .join('')
            elem.html(html)
        }
    }

    // Take action when one of the list buttons have been pressed
    function list_button_pressed(e: any) {
        const ref = (e.currentTarget as any).attributes.ref.value
        const btn = (e.currentTarget as any).attributes.action.value
        const elem = $(`#${script_id}_active_` + ref)

        let default_item, root, list, key
        if (ref === 'preset') {
            default_item = get_preset_defaults()
            root = settings
            list = settings.presets
            key = 'selected_preset'
        } else {
            default_item = get_action_defaults()
            root = settings.presets[settings.selected_preset]
            list = root.actions
            key = 'selected_action'
        }

        // I don't know how to type this so that Typescript doesn't complain
        switch (btn) {
            case 'new': // @ts-ignore
                list.push(default_item) // @ts-ignore
                root[key] = list.length - 1
                break
            case 'delete': // @ts-ignore
                list.push(...list.splice(root[key]).slice(1)) // @ts-ignore // Remove from list by index
                if (root[key] && root[key] >= list.length) root[key]-- // @ts-ignore
                if (list.length === 0) list.push(default_item)
                break
            case 'up': // @ts-ignore
                swap(list, root[key] - 1, root[key]) // @ts-ignore
                root[key]--
                break
            case 'down': // @ts-ignore
                swap(list, root[key] + 1, root[key]) // @ts-ignore
                root[key]++
                break
        }
        // @ts-ignore
        populate_list(elem, list, root[key])
        settings_dialog.refresh()
        if (btn === 'new') $(`#${script_id}_${ref}_name`).focus().select()
    }

    // -----------------------------------------------------------------------------------------------------------------
    // BURN BELL AUDIO (very long string, so moving it out of the way)
    // -----------------------------------------------------------------------------------------------------------------

    const base64BellAudio = `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0GVkniikz8t//Z/+GDStYH8p+tsFTQFPGGyDrnCe2cWM5Gd48ZHGoHuyh+obozf3+312bMPtm//20a1hqcwKHqF5ApWCtqezjnbL9xzZ6b49xsWHs89BsVEGuQIN2jHgJvd8xz6l8fhf8L/hL731/7Ob91f8WcVPmIIcdNeU1TmmqVA7AYMR1kYEsNxtHcfJJKMwSS1c0Y/5w0HsQYIhxtxjcBECEantK7+77/Z8b938TKLSZ01xMAQYMnGf/vxZ0qlahLrYwRMEKBH1sv/L93sd/8xs7/sp5ojnerNmnMJYSFRuWEcSzTqnHiKacxE5mRiILwnCRS7Hkx45TTmGoig5VFNdvmjcmZdvHCUj/UpJmIUXdmbRBJcEaWwmPB0CsfBAH8/J4fUnkpJc//uSRA4AAxoy0H8xYAhgY/mv56wAC+hDMeYwZwF2MOPVhAm6Pp86lTy97qPtk1Bpe+ms2dzGzdUqJzMTDfa3Un/+6bdTE76/6+5inNqEnhGcFyyUyuWNuJGnt/+pmxLZcVU5ho0Cc+YbGuoR3dQBIVFYyAWyTLooC3FxSCHty6X4aTDVNVpJNE0PQ0EAjLTnN90sEl7idPlWWTcvWe5p5eDp5h9mqgM+4VBJawkHlsQhQqvKs1yQFQJkJb9EXq/qsxrg4BOfFnMa4ylCqsSwq5kA25bqBUAoNQOlnC6TSoBEpA+IIirSa7VcZHy5gICP4zMBAXiIGgVERYcDRJ5Essy3JAVwCIuEoKnRLqAKSQigrKuiUFZ0sBpW/LA0e/WNO390iIgakYldJdRxgDdFdrXXda7DstwmnZlKRpiGgNckAKHpshyHptKsN8MDwAITiteqqqqrNf+0yuvrHwzUM+Uv3R9WKUrr+ZDIYxgICMX//+Y2rfX5tW///oblL6tLfK+UokbEsjLVAACqMAACoWEI0HxgbByCXRdJ0Xiel4Hbav/7kmQMj/MrG43JOdHIOGIiCD8YOAAAAaQAAAAgAAA0gAAABChUbLBpSmTUCLR1YIVZgkxly5pgBqA5nzxjFIJVDkEKPjEuzJNDLrTBl00FHVtKOrYXOoSDiRzZRwMZq9xkOYj5GD4mgzHDnneUHcJgAqEAAR0IcElDGEFDYDPDARbBwjIsEuEESWAzEKOAqTEJWBqUOxKSxyPvEXtABwKwGPEbkpUlEj1MQU1FMy45OS41VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=`
})()
