// ==UserScript==
// @name         Wanikani Forums: Hide "HAS YOUR QUESTION BEEN ANSWERED" Popup
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Hides the most annoying popup that Discourse has ever implemented
// @author       Kumirei
// @license MIT
// @include      *community.wanikani.com*
// @icon         https://www.google.com/s2/favicons?domain=wanikani.com
// @grant        none
// ==/UserScript==

;(function () {
    document
        .getElementsByTagName('head')[0]
        .insertAdjacentHTML('beforeend', `<style id="hide-no-answer-popup">.no-answer {display: none;}</style>`)
})()
