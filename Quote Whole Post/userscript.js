// ==UserScript==
// @name         Wanikani Forums: Quote Whole Post
// @namespace    http://tampermonkey.net/
// @version      0.1.8
// @description  Adds a button to quote the whole post
// @author       Kumirei
// @include      https://community.wanikani.com*
// @grant        none
// ==/UserScript==

;(function () {
    setTriggers()
    function effect(e) {
        var E = $(e.closest('article'))
        var btn = document.createElement('button')
        btn.className = 'widget-button btn-flat no-text btn-icon quote-whole-post'
        btn.title = 'Click to quote whole post'
        btn.innerHTML =
            '<svg class="fa d-icon d-icon-comment-o svg-icon svg-string" xmlns="http://www.w3.org/2000/svg"><use xlink:href="#far-comment"></use></svg>'
        btn.onclick = function () {
            E.find('.widget-button.reply')[0].click()
            var interval = setInterval(function () {
                if ($('button.quote').length) {
                    $('button.quote').click()
                    clearInterval(interval)
                }
            }, 100)
        }
        var oldBtn = E.find('button[title="Click to quote whole post"]')
        if (oldBtn.length) oldBtn.remove()
        E.find('.post-controls').append(btn)
    }
    $('head').append(
        '<style id="QuoteWholePostCSS">' +
            '.quote-whole-post {order: 0; padding: 8px 10px; margin: 1px 0;}' +
            '.quote-whole-post.d-hover {background-color: rgba(122, 122, 122, 0.17);}' +
            '.post-controls {justify-content: flex-end !important;}' +
            '.post-controls .actions {margin: 0 !important; order: 99;}' +
            '.post-controls .show-replies {position: absolute; left: 0; margin-left: 0px !important;}' +
            '</style>',
    )

    function initialiseScript() {waitObserveSearch('.post-stream', '.post-controls .actions', effect)}
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
        observer.observe(target, {attributes: true, subtree: true});
        search()
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
})()
