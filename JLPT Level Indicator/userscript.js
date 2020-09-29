// ==UserScript==
// @name         Bunpro: JLPT Level Indicator
// @namespace    http://tampermonkey.net/
// @version      0.3.2
// @description  Adds a JLPT level indicator in reviews.
// @author       Kumirei
// @include      *bunpro.jp/*
// @exclude      *community.bunpro.jp*
// @require      https://greasyfork.org/scripts/5392-waitforkeyelements/code/WaitForKeyElements.js?version=115012
// @require      https://greasyfork.org/scripts/370623-bunpro-helpful-events/code/Bunpro:%20Helpful%20Events.js?version=615700
// @grant        none
// ==/UserScript==

(function() {
    $('HTML')[0].addEventListener('quiz-page', function() {
        $('.srs-tracker__holder').after('<div id="JLPTlevel" class="review__stats"></div>');
        $('HTML')[0].addEventListener('new-review-item', function(e) {
            $('#JLPTlevel')[0].innerText = $('.level_lesson_info')[0].innerText.split(':')[0];
        });
    });
})();
