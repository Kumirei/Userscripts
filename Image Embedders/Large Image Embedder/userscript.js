// ==UserScript==
// @name         WaniKani Forums: Large Image Embedder
// @namespace    http://tampermonkey.net/
// @version      0.1.5
// @description  Embeds images which Discourse refuses to embed
// @author       Kumirei
// @include      https://community.wanikani.com*
// @grant        none
// ==/UserScript==

(function() {
    // initialise script and set triggers
    setTriggers()

    //embeds images if there are any broken ones to find
    function embedImages(e) {
        console.log('swooosh');
        var url = $(e).attr('href');
        var img = document.createElement('img');
        img.src = url;
        var elem = $(e.closest('.large-image-placeholder'));
        elem.addClass('lightbox');
        elem.attr('href', url);
        elem.empty();
        elem.append(img);
        elem.append('<div class="meta">'+
        '    <span class="filename"><small>Embedded by the <i>Large Image Embedder</i>'+
        '    </small></span></div>');
    }

    function initialiseScript() {waitObserveSearch('.post-stream', '.large-image-placeholder a', embedImages)}
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
})();
