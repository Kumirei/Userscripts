import { SubjectTypeShortString } from '../WKOF Types/wkof'

export namespace Review {
    type Item = VocabItem | KanjiItem | RadicalItem

    type VocabItem = {
        id: number
        subject_category: 'Vocabulary'
        type: 'Vocabulary'
        kanji: {
            id: number
            meanings: string[]
            readings: string[]
        }[]
        meanings: string[]
        readings: {
            reading: string
            pronunciations: {
                actor: {
                    id: number
                    name: string
                    description: string
                    gender: string
                }
                sources: {
                    content_type: string
                    ur: string
                }[]
            }[]
        }[]
    }

    type KanjiItem = {
        id: number
        subject_category: 'Kanji'
        type: 'Kanji'
        meanings: string[]
        auxiliary_meanings: {
            type: 'whitelist' | 'blacklist'
            meaning: string
        }[]
        auxiliary_readings: {
            type: 'whitelist' | 'blacklist'
            reading: string
        }[]
        primary_reading_type: 'kunyomi' | 'onyomi' | 'nanori'
        kunyomi: string[]
        onyomi: string[]
        nanori: string[]
    }

    type RadicalItem = {
        id: number
        subject_category: 'Radical'
        type: 'Radical'
        meanings: string[]
        auxiliary_meanings: {
            type: 'whitelist' | 'blacklist'
            meaning: string
        }[]
    }

    type AnswersObject = {
        mi?: number
        ri?: number
        mc?: number
        rc?: number
    }

    type DummyItem = { type: string; voc: string; id: 0 }

    type QueueError = {
        table: {
            error: string
            message: string
        }
    }

    type Queue = QueueError | number[]
}

export namespace Settings {
    type SubjectType = 'vocabulary' | 'kanji' | 'radical'

    type Settings = {
        selected_preset: number
        active_presets: {
            reviews: number
            lessons: number
            extra_study: number
            self_study: number
        }
        display_selection: boolean
        presets: Preset[]
        display_egg_timer: boolean
        display_streak: boolean
        display_batch_size: boolean
        batch_size: number
        burn_bell: 'disabled' | 'high' | 'low'
        voice_actor: 'default' | 'random' | 'alternate'
        back2back_behavior: 'disabled' | 'always' | 'correct' | 'true'
        prioritize: 'none' | 'reading' | 'reading'
        paste_preset?: string
        paste_action?: string
    }

    type Preset = {
        name: string
        selected_action: number
        available_on: {
            reviews: boolean
            lessons: boolean
            extra_study: boolean
            self_study: boolean
        }
        actions: Action[]
    }

    type Action = {
        name: string
        type: 'none' | 'filter' | 'sort' | 'shuffle' | 'freeze & restore'
        sort: {
            type: 'level' | 'srs' | 'leech' | 'overdue' | 'type' | 'overdue_absolute'
            values: {
                level: 'asc' | 'desc'
                srs: 'asc' | 'desc'
                leech: 'asc' | 'desc'
                overdue: 'asc' | 'desc'
                overdue_absolute: 'asc' | 'desc'
                type: string
            }
        }
        filter: {
            type: string
            values: {
                [key: string]: any
                invert: boolean
            }
        }
        shuffle: {
            type: 'random' | 'relative'
            values: {
                relative: number
            }
        }
    }
}
