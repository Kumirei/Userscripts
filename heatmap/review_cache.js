// ==UserScript==
// @name         Wanikani: Review Cache
// @namespace    http://tampermonkey.net/
// @version      1.0.0
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
        return wkof.file_cache.load('review_cache').then(decompress, _=>[]);
    }

    function save(data) {
        data = compress(data);
        return wkof.file_cache.save('review_cache', data).then(_=>{return decompress(data)});
    }

    function compress(data) {
        let last_time = 0;
        return data.map(item=>{
            let map = [(item[0]-last_time)/60000, item[1], item[2], item[3], item[4]];
            last_time = item[0];
            return map;
        });
    }

    function decompress(data) {
        let total_time = 0;
        return data.map(item=>{
            total_time += item[0];
            return [total_time*60000, item[1], item[2], item[3], item[4]];
        });
    }

    async function update_data(data) {
        let new_reviews = await fetch_new_reviews();
        if (new_reviews) {
            for (let new_review of new_reviews) data.push(new_review);
            data.sort((a,b)=>a[0]<b[0]?-1:1);
        }
        return save(data);
    }

    async function fetch_new_reviews() {
        wkof.include('Settings');
        await wkof.ready('Settings');
        let settings = await wkof.Settings.load("review_cache", {last_fetch: "1970-01-01T00:00:00.000Z"})
        let updated_reviews = await wkof.Apiv2.fetch_endpoint('reviews', {filters: {updated_after: settings.last_fetch}});
        if (updated_reviews.total_count == 0) return;
        settings.last_fetch = updated_reviews.data_updated_at;
        wkof.Settings.save("review_cache");
        updated_reviews.data.sort((a,b)=>Date.parse(a.data.created_at)<Date.parse(b.data.created_at)?-1:1);
        let last_fetch_date = Date.parse(last_fetch);
        let new_reviews = updated_reviews.data.filter(item=>last_fetch_date < Date.parse(item.data.created_at));
        return new_reviews.map(item=>[Math.floor(Date.parse(item.data.created_at)/60000)*60000,
                                      item.data.subject_id,
                                      item.data.starting_srs_stage,
                                      item.data.incorrect_meaning_answers,
                                      item.data.incorrect_reading_answers,
                                     ]);
    }
})(window.wkof);
