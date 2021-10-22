// ==UserScript==
// @name         Wanikani: No Timeout
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Hides the timeout message so that you can continue your reviews.
// @author       Kumirei
// @include      *wanikani.com/review/session
// @icon         https://www.google.com/s2/favicons?domain=wanikani.com
// @grant        none
// ==/UserScript==

(function() {
    document.querySelector('head').insertAdjacentHTML('beforeend', '<style id="NoTimeoutCSS">#timeout {display: none !important;}</style>');
})();
