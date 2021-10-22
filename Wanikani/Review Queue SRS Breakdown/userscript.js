// ==UserScript==
// @name         Wanikani: Review Queue SRS Breakdown
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Adds a display showing how many items of each SRS stage there are in your queue
// @author       Kumirei
// @include      /^https://(www|preview).wanikani.com/review/session/
// @grant        none
// ==/UserScript==
/*jshint esversion: 8 */

(function(wkof, $) {
    install_srs_count();

    // Install SRS count element
    function install_srs_count() {
        let elem = '<div id="srs_breakdown"></div>';
        document.getElementById('stats').insertAdjacentHTML('beforeend', elem);
        $.jStorage.listenKeyChange('currentItem', update_srs_count);
    }

    // Updates the SRS count
    function update_srs_count() {
        let items = get_queue();
        let counts = new Array(9).fill(0);
        items.forEach(item=>{counts[item.srs]++;});
        let text = `[${counts.slice(1, 5).join(', ')}][${counts.slice(5,7).join(', ')}][${counts[7]}][${counts[8]}]`;
        document.getElementById('srs_breakdown').innerHTML = text;
    }

    // Retrieves the current review queue
    function get_queue() {
        return [...$.jStorage.get('activeQueue'), ...$.jStorage.get('reviewQueue')];
    }
})(window.wkof, window.jQuery);
