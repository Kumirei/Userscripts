// ==UserScript==
// @name         Wanikani: Review Cache
// @version      1.1.1
// @description  Manages a cache of all the user's reviews
// @author       Kumirei
// @include      *wanikani.com*
// ==/UserScript==

;(function (wkof) {
    // Manually increment to initiate reload for all users
    const cache_version = 1

    // Script version. Starts with q to make it larger than numerical versions
    const version = 'q1.1.1'

    // Reveal functions to window
    if (!window.review_cache || !window.review_cache.version || window.review_cache.version < version) {
        window.review_cache = { get_reviews, reload, version: version }
    }

    // Fetch reviews from storage
    function get_reviews() {
        wkof.include('Apiv2')
        return wkof.ready('Apiv2').then(load_data).then(update_data_after_session)
    }

    // Deletes cache and refetches reviews
    function reload() {
        return wkof.file_cache.delete('review_cache').then(get_reviews)
    }

    // Loads data from cache
    function load_data() {
        return wkof.file_cache.load('review_cache').then(decompress, (_) => {
            return { cache_version, date: '1970-01-01T00:00:00.000Z', reviews: [] }
        })
    }

    // Save cache
    function save(data) {
        return wkof.file_cache.save('review_cache', compress(data)).then((_) => data)
    }

    // Compress and decompress the dates for better use of storage space.
    // Dates are stored as time elapesed between items, but are returned as absolute dates
    function compress(data) {
        return press(true, data)
    }
    function decompress(data) {
        return press(false, data)
    }
    function press(com, data) {
        let last = 0
        let pressed = data.reviews.map((item) => {
            let map = [com ? item[0] - last : last + item[0], ...item.slice(1)]
            last = com ? item[0] : last + item[0]
            return map
        })
        return { cache_version: data.cache_version, date: data.date, reviews: pressed }
    }

    async function update_data_after_session(data) {
        let [date, new_reviews] = await fetch_new_reviews(data.date)
        if (new_reviews.length) {
            for (let new_review of new_reviews) data.reviews.push(new_review)
            data.reviews.sort((a, b) => (a[0] < b[0] ? -1 : 1))
            data.date = date
            save(data)
        }
        return data.reviews
    }

    // Fetches any new reviews from the API
    async function fetch_new_reviews(last_fetch) {
        let updated_reviews = await wkof.Apiv2.fetch_endpoint('reviews', {
            filters: { updated_after: last_fetch },
        }).catch(fetch_error)
        if (updated_reviews.error) return [null, []] // no new reviews
        let new_reviews = updated_reviews.data.filter((item) => last_fetch < item.data.created_at)
        new_reviews = new_reviews.map((item) => [
            Date.parse(item.data.created_at),
            item.data.subject_id,
            item.data.starting_srs_stage,
            item.data.incorrect_meaning_answers,
            item.data.incorrect_reading_answers,
        ])
        return [updated_reviews.data_updated_at, new_reviews]
    }

    function fetch_error(error) {
        console.error('Review Cache: Error fetching reviews', error)
        return { error }
    }
})(window.wkof)
