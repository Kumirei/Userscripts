// ==UserScript==
// @name         Wanikani Forums: Easy mentions
// @namespace    http://tampermonkey.net/
// @version      0.1.7
// @description  Mention users with the click of a button!
// @author       Kumirei
// @include      *community.wanikani.com*
// @include      *community.bunpro.jp*
// @grant        none
// ==/UserScript==

;(function () {
    setTriggers()
    
    function effect(e) {
        var btn = document.createElement('button')
        btn.className = 'widget-button btn-flat no-text btn-icon mention-button'
        btn.title = 'Click to mention the author of this post'
        btn.innerHTML =
            '<svg class="fa d-icon d-icon-at svg-icon svg-node" aria-hidden="true"><use xlink:href="#at"></use></svg></button>'
        btn.onclick = function () {
            if (!$('#reply-control .reply-area').length) $('.btn-primary.create').click()
            var interval = setInterval(function () {
                if ($('button.quote').length) {
                    $('.d-editor-input')[0].value += '@' + $(e).closest('article').find('.username a')[0].innerText + ' '
                    $('.d-editor-input').blur()
                    $('.d-editor-input').focus()
                    clearInterval(interval)
                }
            }, 100)
        }
        var E = $(e).closest('article')
        var oldBtn = E.find('button[title="Click to mention the author of this post"]')
        if (oldBtn.length) oldBtn.remove()
        $(e).after(btn)
    }
    $('head').append(
        '<style id="EasyMentionsCSS">' +
            '.mention-button {order: 1; padding: 8px 10px; margin: 1px 0;}' +
            '.mention-button.d-hover {background-color: rgba(122, 122, 122, 0.17);}' +
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
