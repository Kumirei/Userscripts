// ==UserScript==
// @name         Wanikani: Review Answer Streak
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Counts the number of times you have get review questions right in a row
// @author       Kumirei
// @include      /^https://(www|preview).wanikani.com/review/session/
// @grant        none
// ==/UserScript==
/*jshint esversion: 8 */

(function(wkof, $) {
    let script_name = "Review Answer Streak";
    let script_id = "review_streak";

    // Make sure WKOF is installed
    if (!wkof) {
        let response = confirm(script_name+' requires WaniKani Open Framework.\n Click "OK" to be forwarded to installation instructions.');
        if (response) {
            window.location.href = 'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549';
        }
        return;
    }
    wkof.include('Settings');
    wkof.ready('Settings')
        .then(load_settings)
        .then(install_streak_count);

    // Load WKOF settings
    function load_settings() {
        let defaults = {
            streak: 0,
            streak_max: 0,
        };
        return wkof.Settings.load(script_id, defaults);
    }

    function install_streak_count() {
        let settings = wkof.settings[script_id];
        let elem = `<span id="streak"><i class="icon-trophy"></i><span class="current">${settings.streak}</span>(<span class="max">${settings.streak_max}</span>)</span>`;
        document.getElementById('stats').insertAdjacentHTML('afterbegin', elem);
        let curr_elem = document.querySelector('#streak .current');
        let max_elem = document.querySelector('#streak .max');

        let lastlast = [0, 0, settings.streak, settings.streak_max]; // Question, incorrect, streak, max streak
        let last = [0, 0, settings.streak, settings.streak_max]; // Question, incorrect, streak, max streak
        $.jStorage.listenKeyChange('questionCount', _=>{
            let curr = [$.jStorage.get('questionCount'), $.jStorage.get('wrongCount')];
            if (curr[0] < last[0]) { // Undone answer
                curr = lastlast;
                last = lastlast; // Lock in undone answer. Can't un-undo, after all
                settings.streak = curr[2];
                settings.streak_max = curr[3];
            }
            else if (curr[1] == last[1]) settings.streak++; // Correct answer
            else if (curr[1] > last[1]) settings.streak = 0; // Incorrect answer
            if (settings.streak > settings.streak_max) settings.streak_max = settings.streak;
            lastlast = last;
            last = [curr[0], curr[1], settings.streak, settings.streak_max];
            curr_elem.innerText = last[2];
            max_elem.innerText = last[3];
            wkof.Settings.save(script_id);
        });
    }
})(window.wkof, window.jQuery);
