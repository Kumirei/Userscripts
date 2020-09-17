// ==UserScript==
// @name         Wanikani: History Exporter
// @version      1.0.0
// @description  Exports items from WK
// @author       Kumirei
// ==/UserScript==
/*jshint esversion: 8 */

(function(wkof) {
    window.WKExporter = {export_reviews, export_lessons, export_csv, export_items};
    let reviews, lessons, wk_items;

    async function export_reviews(name, ids) {
        if (!reviews) reviews = await window.review_cache.get_reviews();
        if (!wk_items) wk_items = wkof.ItemData.get_index(await wkof.ItemData.get_items('assignments'), 'subject_id');
        let items = [['Date', 'ID', 'SRS start', 'Incorrect meaning answers', 'Incorrect reading answers', 'Item', 'Type']];
        for (let [time, id, srs, im, ir] of reviews) {
            if (!ids.includes(id)) continue;
            items.push([new Date(time).toISOString(), id, srs, im, ir, wk_items[id].data.characters, wk_items[id].object]);
        }
        export_items(items);
    }

    async function export_lessons(name, ids) {
        if (!lessons) lessons = (await wkof.ItemData.get_items('assignments')).filter(item => item.assignments && item.assignments.started_at && ids.includes(item.id));
        let items = [['Date', 'ID', 'Item', 'Type']];
        for (let lesson of lessons) {
            items.push([
                lesson.assignments.started_at,
                lesson.id,
                lesson.data.characters,
                lesson.object,
            ]);
        }
        export_items(items);
    }

    function export_items(items) {
        let csv = csvify(items);
        export_csv(name, csv);
    }

    function csvify(array) {
        return array.map(row => row.join(', ')).join('\r\n');
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
