// ==UserScript==
// @name         Wanikani: Review Cache
// @namespace    http://tampermonkey.net/
// @version      1.0.3
// @description  try to take over the world!
// @author       Kumirei
// @include      /^https://(www|preview).wanikani.com/(dashboard)?$/
// @grant        none
// ==/UserScript==

(function(wkof) {
    if (!wkof) {
        let script_name = "Review Cache";
        let response = confirm(script_name + ' requires WaniKani Open Framework.\n Click "OK" to be forwarded to installation instructions.');
        if (response) window.location.href = 'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549';
        return;
    }
    window.review_cache = {
        get_reviews,
        reload,
    }
    let last_fetch;

    function get_reviews() {
        wkof.include('Apiv2');
        return wkof.ready('Apiv2')
            .then(load_data)
            .then(update_data);
    }

    function reload() {
        return wkof.file_cache.delete('review_cache').then(get_reviews);
    }

    function load_data() {
        return wkof.file_cache.load('review_cache').then(decompress, _=>{return {}});
    }

    function save(data) {
        let compressed = compress(data);
        return wkof.file_cache.save('review_cache', compressed).then(_=>data);
    }

    function compress(data) {
        let last_time = 0;
        return {
            date: data.date,
            reviews: data.reviews.map(item=>{
                let map = [(item[0]-last_time)/60000, item[1], item[2], item[3], item[4]];
                last_time = item[0];
                return map;
            }),
        };
    }

    function decompress(data) {
        let total_time = 0;
        return {
            date: data.date,
            reviews: data.map(item=>{
                total_time += item[0];
                return [total_time*60000, item[1], item[2], item[3], item[4]];
            }),
        };
    }

    async function update_data(data) {
        let [date, new_reviews] = await fetch_new_reviews(data.date);
        if (new_reviews) {
            for (let new_review of new_reviews) data.reviews.push(new_review);
            data.reviews.sort((a,b)=>a[0]<b[0]?-1:1);
            data.date = date;
        }
        save(data);
        return data.reviews;
    }

    async function fetch_new_reviews(last_fetch=0) {
        let updated_reviews = await wkof.Apiv2.fetch_endpoint('reviews', {filters: {updated_after: new Date(last_fetch).toISOString()}});
        if (updated_reviews.total_count == 0) return;
        updated_reviews.data.sort((a,b)=>Date.parse(a.data.created_at)<Date.parse(b.data.created_at)?-1:1);
        let new_reviews = updated_reviews.data.filter(item=>last_fetch < Date.parse(item.data.created_at));
        return [Date.parse(updated_reviews.data_updated_at), new_reviews.map(item=>[Math.floor(Date.parse(item.data.created_at)/60000)*60000,
                                      item.data.subject_id,
                                      item.data.starting_srs_stage,
                                      item.data.incorrect_meaning_answers,
                                      item.data.incorrect_reading_answers,
                                  ]),
                              ];
    }
})(window.wkof);
