import { SubjectTypeShortString } from './wkof'

export namespace Review {
    type Item = {
        aud: {
            content_type: string
            pronunciation: string
            url: string
            voice_actor_id: number
        }[]
        auxiliary_meanings: string[]
        auxiliary_readings: string[]
        characters: string
        en: string[]
        id: number
        kana: string[]
        kanji: {
            characters: string
            en: string
            id: number
            kan: string
            type: string
        }[]
        slug: string
        srs: -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | undefined
        type: 'Vocabulary' | 'Kanji' | 'Radical'
        voc?: string
        kan?: string
        rad?: string
    }

    type AnswersObject = {
        mi: number
        ri: number
        mc: number
        rc: number
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
        presets: Preset[]
        display_egg_timer: boolean
        display_streak: boolean
        burn_bell: boolean
        random_voice_actor: boolean
        back2back: boolean
        prioritize: 'none' | 'reading' | 'reading'
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
            sort: 'level' | 'srs' | 'leech' | 'overdue' | 'type'
            level: 'asc' | 'desc'
            srs: 'asc' | 'desc'
            leech: 'asc' | 'desc'
            overdue: 'asc' | 'desc'
            /**
             * @remark Comma separated list of short item type names
             * @example "kan, rad, voc"
             */
            type: string
        }
        filter: {
            [key: string]: any
            filter: string
            invert: boolean
        }
    }
}
