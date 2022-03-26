import { SubjectTypeShortString } from '../WKOF Types/wkof'

export namespace Review {
    type Item = {
        auxiliary_meanings: { meaning: string; type: 'whitelist' | 'blacklist' }[]
        characters: string
        en: string[]
        id: number
        slug: string
        srs: -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | undefined
        syn: string[]
    } & (VocabItem | KanjiItem | RadicalItem)

    type VocabItem = {
        aud: {
            content_type: string
            pronunciation: string
            url: string
            voice_actor_id: number
        }[]
        auxiliary_readings: { reading: string; type: 'whitelist' | 'blacklist' }[]
        kana: string[]
        kanji: {
            characters: string
            en: string
            id: number
            ja: string
            kan: string
            type: string
        }[]
        type: 'Vocabulary'
        voc: string
    }

    type KanjiItem = {
        auxiliary_readings: { reading: string; type: 'whitelist' | 'blacklist' }[]
        emph: 'onyomi' | 'kunyomi' | 'nanori'
        kan: string
        kun: string[]
        nanori: string[]
        on: string[]
        type: 'Kanji'
    }

    type RadicalItem = {
        character_image_url?: string
        rad: string
        type: 'Radical'
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
        voice_actor: 'default' | 'random' | 'alternate'
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
