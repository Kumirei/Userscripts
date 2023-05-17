// ==UserScript==
// @name         Wanikani: Woah Burns
// @namespace    http://tampermonkey.net/
// @version      1.0.6
// @description  Adds a Kanna Woah emote to your burns count
// @author       Kumirei
// @include      /^https://(www|preview).wanikani.com/(dashboard)?$/
// @require      https://greasyfork.org/scripts/432418-wait-for-selector/code/Wait%20For%20Selector.js?version=974318
// @grant        none
// ==/UserScript==

(function($, wfs) {
    // Does the thing!
    wfs.wait('#burned span', function(e) {
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
})(window.jQuery, window.wfs);
