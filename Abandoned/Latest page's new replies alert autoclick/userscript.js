// ==UserScript==
// @name         Wanikani Forums: Latest page's new replies alert autoclick
// @namespace    Wanikani Forums: Latest page's new replies alert autoclick
// @version      0.1.1
// @description  Hides and automatically click the alert for new threads and replies on the "latest" page so that the threads just pop up.
// @author       Kumirei
// @include      https://community.wanikani.com*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    setTriggers()

    $('head').append('<style id="AutoClickLatestAlert">.show-more.has-topics {display: none;}</style>');
    function effect() {$('.show-more.has-topics .alert').click();};

    function initialiseScript() {waitObserveSearch('.navigation-topics #list-area', '.show-more.has-topics', effect)}
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
    // Waits for an element, observes it mutations, and fires searches
    async function waitObserveSearch(waitTarget, selector, callback) {
        let search = ()=>$(selector).each((i,e)=>callback(e, i))
        let observer = new MutationObserver(search);
        let target = (await waitForSelector(waitTarget))[0]
        console.log('target', target)
        observer.observe(target, {attributes: true, subtree: true});
        search()
    }
    // Waits for a selector query to yield results
    function waitForSelector(s) {
        let resolve, reject, promise = new Promise((res, rej)=>{resolve=res; reject=rej})
        let i = setInterval(()=>{
            let result = $(s)
            console.log(s, result)
            if (result.length) {
                clearInterval(i)
                resolve(result)
            }
        }, 100)
        return promise
    }
})();
