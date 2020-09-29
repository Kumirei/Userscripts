// ==UserScript==
// @name         Wanikani: Burn Bell
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Plays a bell sound when you burn an item
// @author       Kumirei
// @include      *wanikani.com/review/session
// @license      MIT; http://opensource.org/licenses/MIT
// @grant        none
// ==/UserScript==
/*jshint esversion: 8 */

(function($) {
    const audio = new Audio("https://files.catbox.moe/m8rq8g.mp3");
    let listening = {};
    let getUID = (item) => (item.rad?'r':item.kan?'k':'v') + item.id;
    $.jStorage.listenKeyChange('currentItem', initiateItem);

    function initiateItem() {
        let item = $.jStorage.get('currentItem');
        if (item.srs !== 8) return;
        let UID = getUID(item);
        if (!listening[UID]) listenUID(UID, item.srs);
    }

    function listenUID(UID) {
        listening[UID] = {failed: false};
        $.jStorage.listenKeyChange(UID, ()=>checkAnswer(UID));
    }

    function checkAnswer(UID) {
        let answers = $.jStorage.get(UID);
        if (answers && (answers.ri || answers.mi)) listening[UID].failed = true;
        if (!answers && !listening[UID].failed) burn();
    }

    function burn(UID) {
        audio.play();
        delete listening[UID];
    }
})(window.jQuery);
