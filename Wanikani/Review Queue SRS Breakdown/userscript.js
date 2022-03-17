// ==UserScript==
// @name         Wanikani: Review Queue SRS Breakdown
// @namespace    http://tampermonkey.net/
// @version      1.0.3
// @description  Adds a display showing how many items of each SRS stage there are in your queue
// @author       Kumirei
// @include      /^https://(www|preview).wanikani.com/review/session/
// @grant        none
// ==/UserScript==

;(function (wkof, $) {
    // Script info
    const script_name = 'Review Queue SRS Breakdown'
    const script_id = 'review_queue_SRS_breakdown'

    // Make sure WKOF is installed
    confirm_wkof(script_name).then(start)

    // Startup
    let items_by_id
    function start() {
        wkof.include('ItemData')
        wkof.ready('ItemData').then(install)
    }

    // Installs script functions on page
    async function install() {
        items_by_id = await wkof.ItemData.get_index(await wkof.ItemData.get_items('assignments'), 'subject_id')
        install_srs_count()
        update_srs_count()
    }

    // Install SRS count element
    function install_srs_count() {
        let elem = '<div id="srs_breakdown">[0, 0, 0, 0][0, 0][0][0]</div>'
        document.getElementById('stats').insertAdjacentHTML('beforeend', elem)
        $.jStorage.listenKeyChange('currentItem', update_srs_count)
    }

    // Updates the SRS count
    function update_srs_count() {
        let items = get_queue()
        let counts = new Array(9).fill(0)
        items.forEach((item) => {
            counts[item.srs]++
        })
        let text = `[${counts.slice(1, 5).join(', ')}][${counts.slice(5, 7).join(', ')}][${counts[7]}][${counts[8]}]`
        document.getElementById('srs_breakdown').innerHTML = text
    }

    // Retrieves the current review queue
    function get_queue() {
        const reviewQueue = $.jStorage
            .get('reviewQueue')
            .map((item) => (typeof item === 'number' ? { srs: items_by_id[item].assignments.srs_stage } : item))
        return [...$.jStorage.get('activeQueue'), ...reviewQueue]
    }

    /* ----------------------------------------------------------*/
    // WKOF setup
    /* ----------------------------------------------------------*/

    // Makes sure that WKOF is installed
    async function confirm_wkof() {
        if (!wkof) {
            let response = confirm(
                `${script_name} requires WaniKani Open Framework.\nClick "OK" to be forwarded to installation instructions.`,
            )
            if (response) {
                window.location.href =
                    'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549'
            }
            return
        }
    }
})(window.wkof, window.jQuery)
