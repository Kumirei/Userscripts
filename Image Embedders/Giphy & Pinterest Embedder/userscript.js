// ==UserScript==
// @name         WaniKani Forums: Giphy/Pinterest embedder
// @namespace    http://tampermonkey.net/
// @version      0.1.6
// @description  Embeds images which Discourse fails to embed
// @author       Kumirei
// @include      https://community.wanikani.com*
// @grant        none
// ==/UserScript==

(function() {
    // initialise script and set triggers
    setTriggers()

    //embeds images if there are any broken ones to find
    function embedImages(e) {
        var embed = false;
        var url = e.attr('href');
        if (e[0].innerText == "") {
            if (url.match(/https:\/\/media\.giphy\.com\/media\/.+\/giphy\.gif/) != null) {
                var ID = url.split("/")[4];
                url = "https://i.giphy.com/media/"+ID+"/giphy.webp";
                embed = true;
            }
            else if (url.match(/https:\/\/i\.pinimg\.com\/.*\.gif/) != null) embed = true;
            if (embed) {
                var img = document.createElement('img');
                img.src = url;
                img.alt = 'Loading image...';
                var elem = $(e[0].parentElement);
                elem.addClass("lightbox");
                elem.empty();
                elem.append(img);
                elem.append('<div class="meta">'+
                '    <span class="filename"><small>Embedded by the <i>Giphy/Pinterest Embedder</i>'+
                '    </small></span></div>');
            }
        }
    }

    function initialiseScript() {waitObserveSearch('.post-stream', '.topic-body p > a[target="_blank"]', embedImages)}
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
