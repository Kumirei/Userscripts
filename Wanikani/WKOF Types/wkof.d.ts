type SrsName = 'lock' | 'init' | 'appr1' | 'appr2' | 'appr3' | 'appr4' | 'guru1' | 'guru2' | 'mast' | 'enli' | 'burn'
type SrsNumber = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
type SubjectType = 'vocabulary' | 'kanji' | 'radical'
type SubjectTypeString =
    | `${SubjectType}`
    | `${SubjectType},${SubjectType}`
    | `${SubjectType},${SubjectType},${SubjectType}`
type SubjectTypeShort = 'voc' | 'kan' | 'rad'
type SubjectTypeShortString =
    | `${SubjectTypeShort}`
    | `${SubjectTypeShort},${SubjectTypeShort}`
    | `${SubjectTypeShort},${SubjectTypeShort},${SubjectTypeShort}`
type IsoDateString = `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`

declare namespace Core {
    type ModuleNameOption = 'Apiv2' | 'ItemData' | 'Menu' | 'Progress' | 'Settings'
    type ModuleName =
        | `${ModuleNameOption}`
        | `${ModuleNameOption},${ModuleNameOption}`
        | `${ModuleNameOption},${ModuleNameOption},${ModuleNameOption}`
        | `${ModuleNameOption},${ModuleNameOption},${ModuleNameOption},${ModuleNameOption}`
        | `${ModuleNameOption},${ModuleNameOption},${ModuleNameOption},${ModuleNameOption},${ModuleNameOption}`

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
        include: (modules: ModuleName) => Promise<{ loaded: string[]; failed: string[] }>
        ready: (modules: ModuleName) => Promise<'ready'>
        get_state: (state_var: string) => any
        set_state: (state_var: string, value: any) => void
        wait_state: (
            state_var: string,
            value: any,
            callback: (new_value: any, prev_value: any) => void,
            persistent: boolean,
        ) => void
        on: (event: string, callback: () => void) => void
        trigger: (event: string) => WKOF<{}>
        support_files: { [key: string]: string }
        user: User
        load_file: (url: string, use_cache?: boolean) => Promise<any>
        load_script: (url: string, use_cache?: boolean) => Promise<string | undefined>
        load_css: (url: string, use_cache?: boolean) => Promise<string | undefined>
        file_cache: FileCache
    }
}

declare namespace Apiv2 {
    type ApiEndpoints =
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
        progress_callback?: (endpoint_name: ApiEndpoints, first_new: number, so_far: number, total: number) => void
        last_update?: Date | IsoDateString
        filters?: Filter
    }

    type GetEndpointOptions = {
        progress_callback?: (endpoint_name: ApiEndpoints, first_new: number, so_far: number, total: number) => void
        force_update?: boolean
    }

    export type Module = {
        fetch_endpoint: (endpoint_name: ApiEndpoints, options?: FetchEndpointOptions) => Promise<any>
        get_endpoint: (endpoint_name: ApiEndpoints, options?: GetEndpointOptions) => Promise<any>
        clear_cache: (include_non_user?: boolean) => Promise<undefined>
        apiv2_is_valid_apikey_format: (apikey: string) => boolean
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

    type Endpoints = 'subjects' | 'assignments' | 'review_statistics' | 'study_materials'

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
            reading_mnemonic: string
            readings: {
                accepted_answer: boolean
                primary: boolean
                reading: string
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
    }

    type FilterCanInvert<T> = T | { value: T; invert: boolean }

    type GetItemsConfig =
        | Endpoints
        | {
              [key: string]: {
                  options?: {
                      [key: string]: any
                      assignments?: boolean
                      review_statistics?: boolean
                      study_materials?: boolean
                      include_hidden?: boolean
                  }
                  filters?: {
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
              }
          }

    export type Module = {
        get_items: (config?: GetItemsConfig) => Promise<Item[]>
        get_index: (items: Item[], index_name: IndexOptions) => { [key: string]: Item[] | Item }
    }
}

declare namespace Menu {
    export type Module = {
        insert_script_link: (config: {
            name: string
            submenu?: string
            title: string
            class?: string
            on_click: (event: any) => void
        }) => void
    }
}

declare namespace Settings {
    type OnChange = (name: string, value: any, config: Component) => void

    type Validate = (value: any, config: Component) => boolean | string | { valid: boolean; msg: string }

    type ComponentDefaults = {
        label: string
        hover_tip?: string
        full_width?: boolean
        validate?: Validate
        on_change?: OnChange
        path?: string
    }

    type Section = {
        type: 'section'
        label: string
    }

    type Divider = {
        type: 'divider'
    }

    type Group = {
        type: 'group'
        label: string
        content: { [key: string]: Component }
    }

    type List = {
        type: 'list'
        multi?: boolean
        size?: number
        default?: string
        content: { [key: string]: string }
    } & ComponentDefaults

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
        label: string
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
        open: () => void
        load: () => void
        save: () => void
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
        /**
         * @param dialog DOM element of dialog box
         */
        pre_open?: (dialog: any) => void
        on_save?: (settings: { [key: string]: any }) => void
        on_cancel?: (settings: { [key: string]: any }) => void
        on_close?: (settings: { [key: string]: any }) => void
        on_change?: OnChange
        on_refresh?: (settings: { [key: string]: any }) => void
        content: Component
    }

    export type Module = {
        (config: Config): () => Promise<Dialog>
        save: (script_id: string) => Promise<undefined>
        load: (script_id: string, defaults?: { [key: string]: any }) => Promise<{ [key: string]: any }>
    }
}

declare namespace Progress {
    export type Module = {
        update: (progress: { name: string; label: string; value: number; max: number }) => void
    }
}

/**
 * @argument T Object containing the modules to include.
 * @example Use WKOF<{ItemData: ItemData, Apiv2: Apiv2}> to include both ItemData and Apiv2 modules.
 */
export type WKOF<T> = Core.Module & T
export type Apiv2 = Apiv2.Module
export type ItemData = ItemData.Module
export type Menu = Menu.Module
export type Settings = Settings.Module
export type Progress = Progress.Module
