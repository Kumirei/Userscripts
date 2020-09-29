// ==UserScript==
// @name         Wanikani: Woah Burns
// @namespace    http://tampermonkey.net/
// @version      1.0.3
// @description  Adds a Kanna Woah emote to your burns count
// @author       Kumirei
// @match        https://www.wanikani.com/dashboard
// @match        https://www.wanikani.com
// @include      *preview.wanikani.com*
// @require      https://greasyfork.org/scripts/5392-waitforkeyelements/code/WaitForKeyElements.js?version=115012
// @grant        none
// ==/UserScript==
/*jshint esversion: 8 */

(function() {
    //Does the thing!
    waitForKeyElements('#burned span', function(e) {
        console.log('WOAH');
        $('#burned').append('<img src="https://cdn.discordapp.com/emojis/295269590219489290.png?v=1" class="WoahBurns">');
        $('head').append('<style id="WoahBurnsCSS">'+
                         '    .WoahBurns {'+
                         '        display: block;'+
                         '        height: 40px;'+
                         '        position: absolute;'+
                         '        bottom: 0;'+
                         '        right: 0;'+
                         '        margin-right: 10px;'+
                         '    }'+
                         '    .srs-progress #burned {'+
                         '        position: relative;'+
                         '    }'+
                         '</style>');
    });
})();
