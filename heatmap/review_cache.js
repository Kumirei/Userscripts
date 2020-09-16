// ==UserScript==
// @name         Wanikani: Review Cache
// @version      1.0.4
// @description  Manages a cache of all the user's reviews
// @author       Kumirei
// ==/UserScript==

(function(wkof) {
    window.review_cache = {
        get_reviews,
        reload,
    }

    function get_reviews() {
        wkof.include('Apiv2');
        return wkof.ready('Apiv2').then(load_data).then(update_data);
    }

    function reload() {
        return wkof.file_cache.delete('review_cache').then(get_reviews);
    }

    function load_data() {
        return wkof.file_cache.load('review_cache').then(decompress, _=>{return {date: "1970-01-01T00:00:00.000Z", reviews: [],}});
    }

    function save(data) {
        return wkof.file_cache.save('review_cache', compress(data)).then(_=>data);
    }

    function compress(data) {return press(true, data);}
    function decompress(data) {return press(false, data);}

    function press(com, data) {
        let last = 0;
        let pressed = data.reviews.map(item => {
                let map = [com ? (item[0]-last)/60000 : (last+item[0])*60000, ...item.slice(1)];
                last = com ? item[0] : last+item[0];
                return map;
            });
        return {date: data.date, reviews: pressed};
    }

    async function update_data(data) {
        let [date, new_reviews] = await fetch_new_reviews(data.date);
        if (new_reviews.length) {
            for (let new_review of new_reviews) data.reviews.push(new_review);
            data.reviews.sort((a,b)=>a[0]<b[0]?-1:1);
            data.date = date;
            save(data);
        }
        return data.reviews;
    }

    async function fetch_new_reviews(last_fetch) {
        let updated_reviews = await wkof.Apiv2.fetch_endpoint('reviews', {filters: {updated_after: last_fetch}});
        let new_reviews = updated_reviews.data.filter(item=> last_fetch<item.data.created_at);
        new_reviews = new_reviews.map(item=>[
            Math.floor(Date.parse(item.data.created_at)/60000)*60000,
            item.data.subject_id,
            item.data.starting_srs_stage,
            item.data.incorrect_meaning_answers,
            item.data.incorrect_reading_answers,
        ]);
        return [updated_reviews.data_updated_at, new_reviews];
    }
})(window.wkof);
