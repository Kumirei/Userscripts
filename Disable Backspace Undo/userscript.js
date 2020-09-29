// ==UserScript==
// @name         Bunpro: Disable Backspace Undo
// @namespace    http://tampermonkey.net/
// @version      1.0.3
// @description  Disables the backspace functionality in reviews
// @author       Kumirei
// @include      *bunpro.jp/*
// @exclude      *community.bunpro.jp*
// @require      https://greasyfork.org/scripts/5392-waitforkeyelements/code/WaitForKeyElements.js?version=115012
// @require      https://greasyfork.org/scripts/370623-bunpro-helpful-events/code/Bunpro:%20Helpful%20Events.js?version=615700
// @grant        none
// ==/UserScript==
/*jshint esversion: 8 */

(function() {
    var $ = window.$;
    $('html')[0].addEventListener('quiz-page', ()=>{
        var input_elem = $('#study-answer-input');
        $('body').keydown((event)=>{
            var colors = input_elem.css('background-color').match(/\d+/g);
            var sum = colors.reduce((a, b)=>Number(a)+Number(b));
            var redness = colors[0]/sum;
            if (event.keyCode == 8 && redness > 0.4) {
                event.stopPropagation();
                input_elem.blur();
            }
        });
    });
})();
