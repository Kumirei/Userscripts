// ==UserScript==
// @name         Wanikani: Move notes to top
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Moves the notes to the top if there is anything written in them
// @author       Kumirei
// @include      *wanikani.com/review/session
// @include      *preview.wanikani.com/review/session
// @require      https://greasyfork.org/scripts/5392-waitforkeyelements/code/WaitForKeyElements.js
// @grant        none
// ==/UserScript==

(function() {
    waitForKeyElements('#note-meaning, #note-reading', function(e) {
        if (e[0].children[1].innerText != "Click to add note") {
            $('#item-info-col2').prepend(e);
        }
    });
})();
