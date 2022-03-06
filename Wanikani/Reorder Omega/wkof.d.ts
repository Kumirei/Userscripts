type FilterSrsLevels =
    | string
    | (
          | ('lock' | 'init' | 'appr1' | 'appr2' | 'appr3' | 'appr4' | 'guru1' | 'guru2' | 'mast' | 'enli' | 'burn')
          | (-1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9)
      )[]

type SubjectTypeNames = 'vocabulary' | 'kanji' | 'radical'
type ItemIndices = 'level' | 'item_type' | 'reading' | 'slug' | 'srs_stage' | 'srs_stage_name' | 'subject_id' | string
type ItemDataEndpoints = 'subjects' | 'assignments' | 'review_statistics' | 'study_materials'
type Endpoints =
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

type CanInvert<T> = T | { value: T; invert: boolean }

type ItemDataItem = {
    url: string
    object: SubjectTypeNames
    id: number
    /**
     * @remark ISO Date string
     */
    data_updated_at: string
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
        /**
         * @remark ISO Date string
         */
        created_at: string
        document_url: string
        /**
         * @remark ISO Date string (or null)
         */
        hidden_at: null | string
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
        /**
         * @remark ISO Date string (or null)
         */
        available_at: null | string
        /**
         * @remark ISO Date string (or null)
         */
        burned_at: null | string
        /**
         * @remark ISO Date string
         */
        created_at: string
        hidden: boolean
        /**
         * @remark ISO Date string (or null)
         */
        passed_at: null | string
        /**
         * @remark ISO Date string (or null)
         */
        resurrected_at: null | string
        /**
         * @remark 0 = init, 1 = appr1, etc
         */
        srs_stage: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
        /**
         * @remark ISO Date string
         */
        started_at: null | string
        subject_id: number
        subject_type: SubjectTypeNames
        /**
         * @remark ISO Date string
         */
        unlocked_at: string
    }
    review_statistics?: {
        /**
         * @remark ISO Date string
         */
        created_at: string
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
        subject_type: SubjectTypeNames
    }
}

type GetItemsConfig =
    | ItemDataEndpoints
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
                  [key: string]: CanInvert<any>
                  /**
                   * @remark String is comma separated list of 'rad', 'kan', or 'voc'
                   */
                  item_type?: CanInvert<string | ('rad' | 'kan' | 'voc')[]>
                  /**
                   * @remark A comma-separated list of Wanikani levels or level ranges
                   */
                  level?: CanInvert<string>
                  /**
                   * @remark String is comma separated list of possible values
                   */
                  srs?: CanInvert<FilterSrsLevels>
                  have_burned?: CanInvert<boolean>
              }
          }
      }

type GetIndexData = {
    [key: string]: ItemDataItem[] | ItemDataItem
}

type AssignmentsEndpointFilters = {
    /**
     * @remark ISO Date string
     */
    available_after?: string
    /**
     * @remark ISO Date string
     */
    available_before?: string
    burned?: boolean
    hidden?: boolean
    /**
     * @remark Comma separated list of integers
     */
    ids?: string
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
    /**
     * @remark Comma separated list of subject types
     */
    subject_types?: string
    unlocked?: boolean
    /**
     * @remark ISO Date string
     */
    updated_after?: string
}

type LevelProgressionsEndpointFilter = {
    /**
     * @remark Comma separated list of integers
     */
    ids?: string
    /**
     * @remark ISO Date string
     */
    updated_after?: string
}

type ResetsEndpointFilter = {
    /**
     * @remark Comma separated list of integers
     */
    ids?: string
    /**
     * @remark ISO Date string
     */
    updated_after?: string
}

type ReviewsEndpointFilter = {
    assignment_id?: number
    /**
     * @remark ISO Date string
     */
    created_at?: string
    ending_srs_stage?: number
    incorrect_meaning_answers?: number
    incorrect_reading_answers?: number
    spaced_repetition_system_id?: number
    starting_srs_stage?: number
    subject_id?: number
}

type ReviewStatisticsEndpointFilter = {
    hidden?: boolean
    /**
     * @remark Comma separated list of integers
     */
    ids?: string
    percentages_greater_than?: number
    percentages_less_than?: number
    /**
     * @remark Comma separated list of integers
     */
    subject_ids?: string
    /**
     * @remark ISO Date string
     */
    updated_after?: string
}

type SpacedRepetitionSystemsEndpointFilter = {
    /**
     * @remark Comma separated list of integers
     */
    ids?: string
    /**
     * @remark ISO Date string
     */
    updated_after?: string
}

type StudyMaterialsEndpointFilter = {
    hidden?: boolean
    /**
     * @remark Comma separated list of integers
     */
    ids?: string
    /**
     * @remark Comma separated list of integers
     */
    subject_ids?: string
    /**
     * @remark Comma separated list of subject types
     */
    subject_types?: string
    /**
     * @remark ISO Date string
     */
    updated_after?: string
}

type SubjectsEndpointFilter = {
    /**
     * @remark Comma separated list of integers
     */
    ids?: string
    /**
     * @remark Comma separated list of subject types
     */
    types?: string
    /**
     * @remark Comma separated list of slugs
     */
    slugs?: string
    /**
     * @remark Comma separated list of levels
     */
    levels?: string
    hidden?: boolean
    /**
     * @remark ISO Date string
     */
    updated_after?: string
}

type VoiceActorsEndpointFilter = {
    /**
     * @remark Comma separated list of integers
     */
    ids?: string
    /**
     * @remark ISO Date string
     */
    updated_after?: string
}

type EndpointFilter =
    | AssignmentsEndpointFilters
    | LevelProgressionsEndpointFilter
    | ResetsEndpointFilter
    | ReviewsEndpointFilter
    | ReviewStatisticsEndpointFilter
    | SpacedRepetitionSystemsEndpointFilter
    | StudyMaterialsEndpointFilter
    | SubjectsEndpointFilter
    | VoiceActorsEndpointFilter

type FetchEndpointOptions = {
    progress_callback?: (endpoint_name: Endpoints, first_new: number, so_far: number, total: number) => void
    /**
     * @remark ISO Date string
     */
    last_update?: Date | string
    filters?: EndpointFilter
}

type GetEndpointOptions = {
    progress_callback?: (endpoint_name: Endpoints, first_new: number, so_far: number, total: number) => void
    force_update?: boolean
}

type SettingsOnChangeCallback = (name: string, value: any, config: SettingsComponent) => void
type SettingsValidateCallback = (
    value: any,
    config: SettingsComponent,
) => boolean | string | { valid: boolean; msg: string }
type SettingsComponentDefaults = {
    label: string
    hover_tip?: string
    full_width?: boolean
    validate?: SettingsValidateCallback
    on_change?: SettingsOnChangeCallback
    path?: string
}

type SettingsComponent = {}

type SettingsSection = {
    type: 'section'
    label: string
}

type SettingsDivider = {
    type: 'divider'
}

type SettingsGroup = {
    type: 'group'
    label: string
    content: { [key: string]: SettingsComponent }
}

type SettingsList = {
    type: 'list'
    multi?: boolean
    size?: number
    default?: string
    content: { [key: string]: string }
} & SettingsComponentDefaults

type SettingsDropdown = {
    type: 'dropdown'
    default?: string
    content: { [key: string]: string }
} & SettingsComponentDefaults

type SettingsCheckbox = {
    type: 'checkbox'
    default?: boolean
} & SettingsComponentDefaults

type SettingsInput = {
    type: 'input'
    subtype?: string
    default: string
} & SettingsComponentDefaults

type SettingsNumber = {
    type: 'number'
    placeholder?: string
    default?: number
    min?: number
    max?: number
} & SettingsComponentDefaults

type SettingsText = {
    type: 'text'
    placeholder?: string
    match?: RegExp
} & SettingsComponentDefaults

type SettingsColor = {
    type: 'color'
    default?: string
} & SettingsComponentDefaults

type SettingsButton = {
    type: 'button'
    text?: string
    on_click: (name: string, config: SettingsComponent, on_change: () => void) => void
} & SettingsComponentDefaults

type SettingsHtml = {
    type: 'html'
    label: string
    html: string
}

type SettingsPage = {
    type: 'page'
    label: string
    hover_tip?: string
    content: { [key: string]: SettingsComponent }
}

type SettingsTabset = {
    type: 'tabset'
    content: { [key: string]: SettingsPage }
}

type SettingsConfigContent =
    | SettingsTabset
    | SettingsPage
    | SettingsSection
    | SettingsDivider
    | SettingsGroup
    | SettingsList
    | SettingsDropdown
    | SettingsCheckbox
    | SettingsInput
    | SettingsNumber
    | SettingsText
    | SettingsColor
    | SettingsButton
    | SettingsHtml

type SettingsConfig = {
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
    on_change?: SettingsOnChangeCallback
    on_refresh?: (settings: { [key: string]: any }) => void
    content: SettingsConfigContent
}

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

type WKOF = {
    version: {
        value: string
        compare_to: (needed_version: string) => 'older' | 'same' | 'newer'
    }
    /**
     * @param modules String is comma separated list of possible values
     */
    include: (
        modules: ('Apiv2' | 'ItemData' | 'Menu' | 'Progress' | 'Settings') | string,
    ) => Promise<{ loaded: string[]; failed: string[] }>
    /**
     * @param modules String is comma separated list of possible values
     */
    ready: (modules: ('Apiv2' | 'ItemData' | 'Menu' | 'Progress' | 'Settings') | string) => Promise<'ready'>
    get_state: (state_var: string) => any
    set_state: (state_var: string, value: any) => void
    wait_state: (
        state_var: string,
        value: any,
        callback: (new_value: any, prev_value: any) => void,
        persistent: boolean,
    ) => void
    on: (event: string, callback: () => void) => void
    trigger: (event: string) => WKOF
    support_files: { [key: string]: string }
    user: {
        apikey: string
        /**
         * @remark String is ISO Date string
         */
        current_vacation_started_at: null | string
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
        /**
         * @remark String is ISO Date string
         */
        started_at: string
        subscription: {
            active: boolean
            max_level_granted: number
            /**
             * @remark String is ISO Date string
             */
            period_ends_at: null | string
            type: string
        }
        username: string
    }
    load_file: (url: string, use_cache?: boolean) => Promise<any>
    load_script: (url: string, use_cache?: boolean) => Promise<string | undefined>
    load_css: (url: string, use_cache?: boolean) => Promise<string | undefined>
    file_cache: {
        dir: {
            [key: string]: {
                /**
                 * @remark ISO Date string
                 */
                added: string
                /**
                 * @remark ISO Date string
                 */
                last_loaded: string
            }
        }
        save: (name: string, content: string | { [key: string]: any }) => Promise<string>
        load: (name: string) => Promise<string | { [key: string]: any }>
        delete: (name: string | RegExp) => Promise<undefined>
        clear: () => Promise<undefined>
    }
    ItemData?: {
        get_items: (config: GetItemsConfig) => Promise<ItemDataItem[]>
        get_index: (items: ItemDataItem[], index_name: ItemIndices) => GetIndexData
    }
    Apiv2?: {
        fetch_endpoint: (endpoint_name: Endpoints, options?: FetchEndpointOptions) => Promise<any>
        get_endpoint: (endpoint_name: Endpoints, options?: GetEndpointOptions) => Promise<any>
        clear_cache: (include_non_user?: boolean) => Promise<undefined>
        apiv2_is_valid_apikey_format: (apikey: string) => boolean
    }
    Menu?: {
        insert_script_link: (config: {
            name: string
            submenu?: string
            title: string
            class?: string
            on_click: (event: any) => void
        }) => void
    }
    Progress?: {
        update: (progress: { name: string; label: string; value: number; max: number }) => void
    }
    Settings?: {
        (config: SettingsConfig): () => Promise<Dialog>
        save: (script_id: string) => Promise<undefined>
        load: (script_id: string, defaults?: { [key: string]: any }) => Promise<{ [key: string]: any }>
    }
}
