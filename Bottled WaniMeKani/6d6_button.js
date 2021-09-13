// ==UserScript==
// @name         Wanikani Forums: Roll 6d6
// @namespace    http://tampermonkey.net/
// @version      1.1.5
// @description  Adds a button to post @WaniMeKani roll 6d6
// @author       Kumirei
// @include      https://community.wanikani.com*
// @grant        none
// ==/UserScript==

(function() {
    setTriggers()
    let last_roll = Date.now()
    function effect() {
        waitForSelector('.topic-footer-main-buttons').then((e)=>{
            var btn = document.createElement('button');
            btn.className = "btn widget-button no-text btn-icon";
            btn.title = "Click to roll 6d6";
            btn.innerHTML = 'Roll 6d6';
            btn.onclick = roll
            e.prepend(btn);
        });
    }

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


    function initialiseScript() {effect()}
    // Make sure the script is always running
    function setTriggers() {
        // When loading a page
        window.addEventListener('load', initialiseScript)

        // When using the back and forward buttons
        window.addEventListener('popstate', initialiseScript)

        // When navigating the forums
        ;(function (history) {
            var pushState = history.pushState
            history.pushState = function (state) {
                if (typeof history.onpushstate == 'function') {
                    history.onpushstate({ state: state })
                }
                initialiseScript()
                return pushState.apply(history, arguments)
            }
        })(window.history)
    }
    // Waits for a selector query to yield results
    function waitForSelector(s) {
        let resolve, reject, promise = new Promise((res, rej)=>{resolve=res; reject=rej})
        let i = setInterval(()=>{
            let result = $(s)
            if (result.length) {
                clearInterval(i)
                resolve(result)
            }
        }, 100)
        return promise
    }
})();