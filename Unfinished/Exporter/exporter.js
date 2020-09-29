// ==UserScript==
// @name         Wanikani: History Exporter
// @version      1.0.0
// @description  Exports items from WK
// @author       Kumirei
// ==/UserScript==
/*jshint esversion: 8 */

(function(wkof) {
    window.WKExporter = {export_reviews, export_lessons, export_items, export_csv};
    let reviews, lessons, wk_items, by_id;

    async function export_reviews(name) {
        if (!reviews) reviews = await window.review_cache.get_reviews();
        if (!wk_items) wk_items = await wkof.ItemData.get_items('assignments,review_statistics,include_hidden');
        by_id = wkof.ItemData.get_index(wk_items, 'subject_id');
        let items = [['Date', 'ID', 'SRS start', 'SRS end', 'Incorrect meaning answers', 'Incorrect reading answers',
            'Level', 'Item', 'Meanings', 'Readings', 'POS', 'Type',
        ]];
        for (let [time, id, srs, im, ir] of reviews) {
            let data = by_id[id].data;
            let item = [
                new Date(time).toISOString(),
                id, srs,
                (im+ir)!=0 ? srs-(Math.ceil((im+ir)/2)*(srs<5?1:2)) : srs+1,
                im, ir,
                data.level, data.slug,
                '"'+data.meanings.map(m => m.meaning).join(', ')+'"',
                data.readings ? '"'+data.readings.map(r => r.reading).join(', ')+'"' : '-',
                data.parts_of_speech ? '"'+data.parts_of_speech.join(', ')+'"' : '-',
                by_id[id].object,
            ];
            items.push(item);
        }
        export_items(name, items);
    }

    async function export_lessons(name) {
        if (!wk_items) wk_items = await wkof.ItemData.get_items('assignments,review_statistics,include_hidden');
        if (!lessons) lessons = wk_items.filter(item => item.assignments && item.assignments.started_at);
        let items = [['Date', 'Unlocked', 'Burned', 'Resurrected', 'Next review',
            'ID', 'Level', 'Item', 'Meanings', 'Readings', 'POS', 'Type',
            'Meaning correct', 'Reading correct', 'Meaning streak', 'Reading streak',
            'Meaning incorrect', 'Reading incorrect', 'Meaning max streak', 'Reading max streak',
            'Percentage correct',
        ]];
        for (let lesson of lessons) {
            let ass = lesson.assignments;
            let data = lesson.data;
            let stats = lesson.review_statistics;
            items.push([
                ass.started_at, ass.unlocked_at, ass.burned_at, ass.resurrected_at, ass.available_at,
                lesson.id, data.level, lesson.data.slug,
                '"'+data.meanings.map(m => m.meaning).join(', ')+'"',
                data.readings ? '"'+data.readings.map(r => r.reading).join(', ')+'"' : '-',
                data.parts_of_speech ? '"'+data.parts_of_speech.join(', ')+'"' : '-',
                lesson.object,
                stats.meaning_correct, stats.reading_correct, stats.meaning_current_streak, stats.reading_current_streak,
                stats.meaning_incorrect, stats.reading_incorrect, stats.meaning_max_streak, stats.reading_max_streak,
                stats.percentage_correct,
            ]);
        }
        export_items(name, items);
    }

    function export_items(name, items) {
        let csv = csvify(items);
        export_csv(name, csv);
    }

    function csvify(array) {
        return array.map(row => row.join(',')).join('\r\n');
    }

    function export_csv(name, csv) {
        let encoded = encodeURI("\uFEFF"+csv);
        let link = document.createElement("a");
        link.setAttribute("href", 'data:text/csv; charset=utf-8,'+encoded);
        link.setAttribute("download", name+".csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
})(window.wkof);
