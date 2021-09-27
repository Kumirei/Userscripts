// ==UserScript==
// @name         Wanikani Forums: Roll 6d6
// @namespace    http://tampermonkey.net/
// @version      1.1.7
// @description  Adds a button to post @WaniMeKani roll 6d6
// @author       Kumirei
// @include      https://community.wanikani.com*
// @require      https://greasyfork.org/scripts/432418-wait-for-selector/code/Wait%20For%20Selector.js?version=974318
// @grant        none
// ==/UserScript==

(function(wfs) {
    let last_roll = Date.now()
    wfs.wait('.topic-footer-main-buttons', (e)=>{
        var btn = document.createElement('button');
        btn.className = "btn widget-button no-text btn-icon";
        btn.title = "Click to roll 6d6";
        btn.innerHTML = 'Roll 6d6';
        btn.onclick = roll
        e.prepend(btn);
    });

    function roll() {
        document.querySelector('button.create:not(.reply)').click();
        var interval = setInterval(async function(){
            let composer = document.querySelector("textarea.d-editor-input")
            if (composer) {
                composer.value = `:purple_heart: @WaniMeKani $\\color{VioletRed}\\textsf{roll 6d6}$ :purple_heart:
<!-- @WaniMeKani roll 6d6 -->`
                composer.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }))
                clearInterval(interval);
                await new Promise((res, rej) => setTimeout(res, 6000 - (Date.now() - last_roll)))
                document.querySelector('.submit-panel button.create').click()
                last_roll = Date.now()
            }
        }, 100);
    }

    document.addEventListener('keydown', e=>{
        if (e.altKey && (e.keyCode == 102 || e.keyCode == 54)) roll();
        if (e.altKey && e.shiftKey && e.keyCode == 68) roll();
    })
})(window.wfs);