// ==UserScript==
// @name         Bunpro: Hide Header
// @namespace    http://tampermonkey.net/
// @version      0.1.4
// @description  Hides the header when reviewing.
// @author       Kumirei
// @include      http://bunpro.jp*
// @include      https://bunpro.jp*
// @match        www.bunpro.jp/study_lesson
// @match        https://bunpro.jp/study_lesson
// @match        https://www.bunpro.jp/study_lesson
// @require      https://greasyfork.org/scripts/5392-waitforkeyelements/code/WaitForKeyElements.js?version=115012
// @grant        none
// ==/UserScript==

(function() {
    if (!$('#RemoveGuide').length) $('head').append('<style id="RemoveGuide">.help-info {display: none !important;}</style>');
    if (window.location.href == "https://bunpro.jp/study_lesson") removeHeader();
    waitForKeyElements('#grammar-point-header', removeHeader);
    waitForKeyElements('#study-page', removeHeader);
    waitForKeyElements('#cram-page', function() {$('.sentence-preference > div').on('click', removeHeader);});

    function removeHeader() {
        $('header').attr('style', 'min-height: 0; margin: 0;');
        $('header > .container').attr('style', 'display: none;');
        var profileLink = $('#logo')[0].href;
        $('.help-button:first-child').after('<a class="help-button" href="' + profileLink + '" style="color: white; margin-left: 10px;">HOME</a>');
        $('.help-button:first-child').remove();
        //$('.help-button:first-child').attr('onclick', "window.location.href = 'https://bunpro.jp/'");
    }
})();
