// ==UserScript==
// @name         Wanikani: Woah Burns
// @namespace    http://tampermonkey.net/
// @version      1.0.4
// @description  Adds a Kanna Woah emote to your burns count
// @author       Kumirei
// @match        https://www.wanikani.com/dashboard
// @match        https://www.wanikani.com
// @include      *preview.wanikani.com*
// @grant        none
// ==/UserScript==
/*jshint esversion: 8 */

(function() {
    // Does the thing!
    waitForSelector('#burned span').then(function(e) {
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

    // Waits for a selector query to yield results
    function waitForSelector(s) {
        let resolve, reject, promise = new Promise((res, rej)=>{resolve=res; reject=rej})
        let i = setInterval(()=>{
            let result = document.querySelector(s)
            if (!!result) {
                clearInterval(i)
                resolve(result)
            }
        }, 100)
        return promise
    }
})();
