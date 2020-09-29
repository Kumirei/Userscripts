// ==UserScript==
// @name         Wanikani Forums: Latest page's new replies alert autoclick
// @namespace    Wanikani Forums: Latest page's new replies alert autoclick
// @version      0.1
// @description  Hides and automatically click the alert for new threads and replies on the "latest" page so that the threads just pop up.
// @author       You
// @include      https://community.wanikani.com*
// @require      https://greasyfork.org/scripts/5392-waitforkeyelements/code/WaitForKeyElements.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    $('head').append('<style id="AutoClickLatestAlert">.show-more.has-topics {display: none;}</style>');
    waitForKeyElements('.show-more.has-topics', function() {$('.show-more.has-topics .alert').click();});
})();
