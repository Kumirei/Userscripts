type SrsName = 'lock' | 'init' | 'appr1' | 'appr2' | 'appr3' | 'appr4' | 'guru1' | 'guru2' | 'mast' | 'enli' | 'burn'
type SrsNumber = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
type SubjectType = 'vocabulary' | 'kanji' | 'radical' | 'kana_vocabulary'
type SubjectTypeString =
    | `${SubjectType}`
    | `${SubjectType},${SubjectType}`
    | `${SubjectType},${SubjectType},${SubjectType}`
    | `${SubjectType},${SubjectType},${SubjectType},${SubjectType}`
type SubjectTypeShort = 'voc' | 'kan' | 'rad' | 'kana_voc'
type SubjectTypeShortString =
    | `${SubjectTypeShort}`
    | `${SubjectTypeShort},${SubjectTypeShort}`
    | `${SubjectTypeShort},${SubjectTypeShort},${SubjectTypeShort}`
    | `${SubjectTypeShort},${SubjectTypeShort},${SubjectTypeShort},${SubjectTypeShort}`
type IsoDateString = `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`

declare namespace Core {
    type FileCache = {
        dir: {
            [key: string]: {
                added: IsoDateString
                last_loaded: IsoDateString
            }
        }
        save: (name: string, content: string | { [key: string]: any }) => Promise<string>
        load: (name: string) => Promise<string | { [key: string]: any }>
        delete: (name: string | RegExp) => Promise<undefined>
        clear: () => Promise<undefined>
    }

    export type Module = {
        version: {
            value: string
            compare_to: (needed_version: string) => 'older' | 'same' | 'newer'
        }
        include: (modules: string) => Promise<{ loaded: string[]; failed: string[] }>
        ready: (modules: string) => Promise<'ready'>
        get_state: (state_var: string) => any
        set_state: (state_var: string, value: any) => void
        wait_state: (
            state_var: string,
            value: any,
            callback: (new_value: any, prev_value: any) => void,
            persistent: boolean,
        ) => void
        on: (event: string, callback: () => void) => void
        trigger: (event: string) => undefined
        support_files: { [key: string]: string }
        load_file: (url: string, use_cache?: boolean) => Promise<any>
        load_script: (url: string, use_cache?: boolean) => Promise<string | undefined>
        load_css: (url: string, use_cache?: boolean) => Promise<string | undefined>
        file_cache: FileCache
    }
}

declare namespace Apiv2 {
    type ApiEndpoint =
        | 'assignments'
        | 'level_progressions'
        | 'resets'
        | 'reviews'
        | 'review_statistics'
        | 'spaced_repetition_systems'
        | 'study_materials'
        | 'subjects'
        | 'summary'
        | 'user'
        | 'voice_actors'

    type Defaults = {
        /**
         * @remark Comma separated list of integers
         */
        ids?: string
        updated_after?: IsoDateString
    }

    type LevelProgressions = {} & Defaults
    type Resets = {} & Defaults
    type SpacedRepetitionSystems = {} & Defaults
    type VoiceActors = {} & Defaults

    type Assignments = {
        available_after?: IsoDateString
        available_before?: IsoDateString
        burned?: boolean
        hidden?: boolean
        /**
         * @remark Value not needed
         */
        immediately_available_for_lessons?: any
        /**
         * @remark Value not needed
         */
        immediately_available_for_review?: any
        /**
         * @remark Value not needed
         */
        in_review?: any
        /**
         * @remark Comma separated list of integers
         */
        levels?: string
        /**
         * @remark Comma separated list of integers
         */
        srs_stages?: string
        started?: boolean
        /**
         * @remark Comma separated list of integers
         */
        subject_ids?: string
        subject_types?: SubjectTypeString
        unlocked?: boolean
    } & Defaults

    type Reviews = {
        assignment_id?: number
        created_at?: IsoDateString
        ending_srs_stage?: number
        incorrect_meaning_answers?: number
        incorrect_reading_answers?: number
        spaced_repetition_system_id?: number
        starting_srs_stage?: number
        subject_id?: number
    }

    type ReviewStatistics = {
        percentages_greater_than?: number
        percentages_less_than?: number
        /**
         * @remark Comma separated list of integers
         */
        subject_ids?: string
    } & Defaults

    type StudyMaterials = {
        hidden?: boolean
        /**
         * @remark Comma separated list of integers
         */
        subject_ids?: string
        subject_types?: SubjectTypeString
    } & Defaults

    type Subjects = {
        types?: SubjectTypeString
        /**
         * @remark Comma separated list of slugs
         */
        slugs?: string
        /**
         * @remark Comma separated list of levels
         */
        levels?: string
        hidden?: boolean
    } & Defaults

    type Filter =
        | Assignments
        | LevelProgressions
        | Resets
        | Reviews
        | ReviewStatistics
        | SpacedRepetitionSystems
        | StudyMaterials
        | Subjects
        | VoiceActors

    type FetchEndpointOptions = {
        progress_callback?: (endpoint_name: ApiEndpoint, first_new: number, so_far: number, total: number) => void
        last_update?: Date | IsoDateString
        filters?: Filter
    }

    type GetEndpointOptions = {
        progress_callback?: (endpoint_name: ApiEndpoint, first_new: number, so_far: number, total: number) => void
        force_update?: boolean
    }
    type User = {
        apikey: string
        current_vacation_started_at: null | IsoDateString
        id: string
        level: number
        preferences: {
            default_voice_actor: number
            extra_study_autoplay_audio: boolean
            lessons_autoplay_audio: boolean
            lessons_batch_size: number
            lessons_presentation_order: string
            reviews_autoplay_audio: boolean
            reviews_display_srs_indicator: boolean
            wanikani_compatibility_mode: boolean
        }
        profile_url: string
        started_at: IsoDateString
        subscription: {
            active: boolean
            max_level_granted: number
            period_ends_at: null | IsoDateString
            type: string
        }
        username: string
    }

    export type Module = {
        Apiv2: {
            user: string
            key: string
            fetch_endpoint: (endpoint_name: ApiEndpoint, options?: FetchEndpointOptions) => Promise<any>
            get_endpoint: (endpoint_name: ApiEndpoint, options?: GetEndpointOptions) => Promise<any>
            clear_cache: (include_non_user?: boolean) => Promise<undefined>
            apiv2_is_valid_apikey_format: (apikey: string) => boolean
            spoof: (key: string) => void
        }
        user: User
    }
}

declare namespace ItemData {
    type IndexOptions =
        | 'level'
        | 'item_type'
        | 'reading'
        | 'slug'
        | 'srs_stage'
        | 'srs_stage_name'
        | 'subject_id'
        | string

    type Item = {
        url: string
        object: SubjectType
        id: number
        data_updated_at: IsoDateString
        data: {
            auxiliary_meanings: {
                meaning: string
                type: 'whitelist' | 'blacklist'
            }[]
            characters: string
            character_images?: {
                content_type: string
                url: string
                metadata: {
                    color?: string
                    dimensions?: `${number}x${number}`
                    style_name?: string
                    inline_styles?: boolean
                }
            }[]
            component_subject_ids: number[]
            context_sentences: {
                en: string
                ja: string
            }[]
            created_at: IsoDateString
            document_url: string
            hidden_at: null | IsoDateString
            lesson_position: number
            level: number
            meaning_hint?: string
            meaning_mnemonic: string
            meanings: {
                accepted_answer: boolean
                meaning: string
                primary: boolean
            }[]
            parts_of_speech: string[]
            pronunciation_audios: {
                url: string
                metadata: {
                    gender: string
                    pronunciation: string
                    source_id: number
                    voice_actor_id: number
                    voice_actor_name: string
                    voice_description: string
                }
                content_type: string
            }[]
            reading_hint?: string
            reading_mnemonic: string
            readings: {
                accepted_answer: boolean
                primary: boolean
                reading: string
                type?: 'kunyomi' | 'onyomi' | 'nanori'
            }[]
            slug: string
            spaced_repetition_system_id: number
        }
        assignments?: {
            available_at: null | IsoDateString
            burned_at: null | IsoDateString
            created_at: IsoDateString
            hidden: boolean
            passed_at: null | IsoDateString
            resurrected_at: null | IsoDateString
            /**
             * @remark 0 = init, 1 = appr1, etc
             */
            srs_stage: SrsNumber
            started_at: null | IsoDateString
            subject_id: number
            subject_type: SubjectType
            unlocked_at: string
        }
        review_statistics?: {
            created_at: IsoDateString
            hidden: boolean
            meaning_correct: number
            meaning_current_streak: number
            meaning_incorrect: number
            meaning_max_streak: number
            percentage_correct: number
            reading_correct: number
            reading_current_streak: number
            reading_incorrect: number
            reading_max_streak: number
            subject_id: number
            subject_type: SubjectType
        }
        study_materials?: {
            created_at: IsoDateString
            hidden: boolean
            reading_note?: string
            meaning_note?: string
            subject_id: number
            subject_type: SubjectType
            meaning_synonyms: string[]
        }
    }

    type FilterCanInvert<T> = T | { value: T; invert: boolean }

    namespace GetItems {
        type Endpoint = 'subjects' | 'assignments' | 'review_statistics' | 'study_materials'
        type EndpointString =
            | `${Endpoint}`
            | `${Endpoint},${Endpoint}`
            | `${Endpoint},${Endpoint},${Endpoint}`
            | `${Endpoint},${Endpoint},${Endpoint},${Endpoint}`

        type Options = {
            [key: string]: any
            assignments?: boolean
            review_statistics?: boolean
            study_materials?: boolean
            include_hidden?: boolean
        }

        type Filters = {
            [key: string]: FilterCanInvert<any>
            item_type?: FilterCanInvert<SubjectTypeShortString | SubjectTypeShort[]>
            /**
             * @remark A comma separated list of Wanikani levels or level ranges
             */
            level?: FilterCanInvert<string>
            /**
             * @remark String is comma separated list of possible values
             */
            srs?: FilterCanInvert<string | (SrsName | SrsNumber)[]>
            have_burned?: FilterCanInvert<boolean>
        }

        type SourceConfig = {
            options?: Options
            filters?: Filters
        }

        type Config = EndpointString | { [key: string]: SourceConfig }
    }

    namespace Registry {
        type Filter<T> = {
            type: string
            default: T
            label?: string
            hover_tip?: string
            placeholder?: T
            content?: { [key: string]: any }
            no_ui?: boolean
            filter_func: (filter_value: T, item: Item) => boolean
            filter_value_map?: (filter_value: any) => T
            set_options?: (options: GetItems.Options) => void
        }

        type Registry = {
            sources: {
                [key: string]: {
                    description: string
                    fetcher: (...any) => Promise<{ [key: string]: any }>
                    filters: { [key: string]: Filter<any> }
                    options: { [key: string]: any }
                }
                wk_items: {
                    description: 'Wanikani'
                    fetcher: (
                        config: GetItems.SourceConfig,
                        options: Apiv2.GetEndpointOptions,
                    ) => Promise<{ [key: string]: Item }>
                    filters: {
                        [key: string]: Filter<any>
                        have_burned: {
                            type: 'checkbox'
                            default: true
                            label: 'Have burned'
                            hover_tip: 'Filter items by whether they have ever been burned.\n * If checked, select burned items (including resurrected)\n * If unchecked, select items that have never been burned'
                            filter_func: (filter_value: boolean, item: Item) => boolean
                            set_options: (options: GetItems.Options) => void
                        } & Filter<any>
                        item_type: {
                            type: 'multi'
                            default: []
                            label: 'Item type'
                            hover_tip: 'Filter by item type (radical, kanji, vocabulary)'
                            content: {
                                radical: 'Radicals'
                                kanji: 'Kanji'
                                vocabulary: 'Vocabulary'
                            }
                            filter_value_map: (filter_value: SubjectTypeShort[] | SubjectTypeShortString) => {
                                [key: string]: boolean
                            }
                            filter_func: (filter_value: { [key: string]: boolean }, item: Item) => boolean
                        } & Filter<any>
                        level: {
                            type: 'text'
                            default: ''
                            label: 'SRS Level'
                            hover_tip: 'Filter by Wanikani level\nExamples:\n"*" (All levels)\n"1..3,5" (Levels 1 through 3, and level 5)\n"1..-1" (From level 1 to your current level minus 1)\n"-5..+0" (Your current level and previous 5 levels)\n"+1" (Your next level)'
                            placeholder: '(e.g. "1..3,5")'
                            filter_value_map: (filter_value: string) => { [key: number]: boolean }
                            filter_func: (filter_value: { [key: number]: boolean }, item: Item) => boolean
                        } & Filter<any>
                        srs: {
                            type: 'multi'
                            default: []
                            label: 'SRS Level'
                            hover_tip: 'Filter by SRS level (Apprentice 1, Apprentice 2, ..., Burn)'
                            content: {
                                appr1: 'Apprentice 1'
                                appr2: 'Apprentice 2'
                                appr3: 'Apprentice 3'
                                appr4: 'Apprentice 4'
                                burn: 'Burned'
                                enli: 'Enlightened'
                                guru1: 'Guru 1'
                                guru2: 'Guru 2'
                                init: 'Initiate (Lesson Queue)'
                                lock: 'Locked'
                                mast: 'Master'
                            }
                            filter_value_map: (filter_value: string | SrsName[]) => { [key: string]: boolean }
                            filter_func: (filter_value: { [key: string]: boolean }, item: Item) => boolean
                            set_options: (options: GetItems.Options) => void
                        } & Filter<any>
                    }
                    options: {
                        assignments: {
                            type: 'checkbox'
                            label: 'Assignments'
                            default: false
                            hover_tip: 'Include the "/assignments" endpoint (SRS status, burn status, progress dates)'
                        }
                        review_statistics: {
                            type: 'checkbox'
                            label: 'Review Statistics'
                            default: false
                            hover_tip: 'Include the "/review_statistics" endpoint:\n  * Per-item review count\n  *Correct/incorrect count\n  * Longest streak'
                        }
                        study_materials: {
                            type: 'checkbox'
                            label: 'Study Materials'
                            default: false
                            hover_tip: 'Include the "/study_materials" endpoint:\n  * User synonyms\n  * User notes'
                        }
                    }
                }
            }
            indices: {
                [key: string]: (items: Item[]) => { [key: string]: Item[] | Item }
                item_type: (items: Item[]) => { [key: string]: Item[] }
                level: (items: Item[]) => { [key: string]: Item[] }
                reading: (items: Item[]) => { [key: string]: Item[] }
                slug: (items: Item[]) => { [key: string]: Item[] | Item }
                srs_stage: (items: Item[]) => { [key: string]: Item[] }
                srs_stage_name: (items: Item[]) => { [key: string]: Item[] }
                subject_id: (items: Item[]) => { [key: string]: Item[] }
            }
        }
    }

    export type Module = {
        ItemData: {
            get_items: (config?: GetItems.Config) => Promise<Item[]>
            get_index: <T = Item[] | Item>(items: Item[], index_name: IndexOptions) => { [key: string]: T }
            registry: Registry.Registry
            pause_ready_event: (value: boolean) => void
        }
    }
}

declare namespace Menu {
    export type Module = {
        Menu: {
            insert_script_link: (config: {
                name: string
                submenu?: string
                title: string
                class?: string
                on_click: (event: any) => void
            }) => void
        }
    }
}

declare namespace Settings {
    type OnChange = (name: string, value: any, config: Component) => void

    type Validate = (value: any, config: Component) => boolean | string | { valid: boolean; msg: string }

    type ComponentDefaults = {
        label?: string
        hover_tip?: string
        full_width?: boolean
        validate?: Validate
        on_change?: OnChange
        path?: string
        refresh_on_change?: boolean
    }

    type Section = {
        type: 'section'
        label?: string
    }

    type Divider = {
        type: 'divider'
    }

    type Group = {
        type: 'group'
        label?: string
        content: { [key: string]: Component }
    }

    type List = {
        type: 'list'
        size?: number
        content: { [key: string]: string }
    } & ({ multi?: false; default?: string } | { multi?: true; default: { [key: string]: boolean } }) &
        ComponentDefaults

    type Dropdown = {
        type: 'dropdown'
        default?: string
        content: { [key: string]: string }
    } & ComponentDefaults

    type Checkbox = {
        type: 'checkbox'
        default?: boolean
    } & ComponentDefaults

    type Input = {
        type: 'input'
        subtype?: string
        default: string
    } & ComponentDefaults

    type Number = {
        type: 'number'
        placeholder?: string
        default?: number
        min?: number
        max?: number
    } & ComponentDefaults

    type Text = {
        type: 'text'
        default?: string
        placeholder?: string
        match?: RegExp
    } & ComponentDefaults

    type Color = {
        type: 'color'
        default?: string
    } & ComponentDefaults

    type Button = {
        type: 'button'
        text?: string
        on_click: (name: string, config: Component, on_change: () => void) => void
    } & ComponentDefaults

    type Html = {
        type: 'html'
        label?: string
        html: string
    }

    type Page = {
        type: 'page'
        label: string
        hover_tip?: string
        content: { [key: string]: Component }
    }

    type Tabset = {
        type: 'tabset'
        content: { [key: string]: Page }
    }

    type Component =
        | Tabset
        | Page
        | Section
        | Divider
        | Group
        | List
        | Dropdown
        | Checkbox
        | Input
        | Number
        | Text
        | Color
        | Button
        | Html

    type Dialog = {
        open: () => Promise<undefined>
        load: () => Promise<{ [key: string]: any }>
        save: () => Promise<undefined>
        refresh: () => void
        background: {
            open: () => void
            close: () => void
        }
        close: (save_pending_changes?: boolean) => void
        cancel: () => void
    }

    type Config = {
        script_id: string
        title: string
        autosave?: boolean
        background?: boolean
        no_bkgd?: boolean
        /**
         * @param dialog jQuery DOM element of dialog box
         */
        pre_open?: (dialog: JQuery) => void
        on_save?: (settings: { [key: string]: any }) => void
        on_cancel?: (settings: { [key: string]: any }) => void
        on_close?: (settings: { [key: string]: any }) => void
        on_change?: OnChange
        on_refresh?: (settings: { [key: string]: any }) => void
        content: { [key: string]: Component }
    }

    export type Module = {
        Settings: {
            new (config: Config): Dialog
            save: (script_id: string) => Promise<undefined>
            load: (script_id: string, defaults?: { [key: string]: any }) => Promise<{ [key: string]: any }>
        }
        settings: {
            [key: string]: {
                [key: string]: any
            }
        }
    }
}

declare namespace Progress {
    export type Module = {
        Progress: {
            update: (progress: { name: string; label: string; value: number; max: number }) => void
        }
    }
}

/**
 * @remark To include modules use WKOF & Module
 */
export type WKOF = Core.Module
export type Apiv2 = Apiv2.Module
export type ItemData = ItemData.Module
export type Menu = Menu.Module
export type Settings = Settings.Module
export type Progress = Progress.Module
