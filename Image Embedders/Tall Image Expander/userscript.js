// ==UserScript==
// @name         Wanikani Forums: Expand Tall Images
// @namespace    http://tampermonkey.net/
// @version      0.1.4
// @description  Expands tall images on the Wanikani forums
// @author       Kumirei
// @include      https://community.wanikani.com*
// @grant        none
// ==/UserScript==

(function() {
    setTriggers()
    //wait for images
    function effect(e) {
        //get the infos
        var elem = e[0];
        var dim = [elem.width, elem.height];
        if (elem.height == 500) {//all images which need to be expanded are 500px height
            if ($(elem.nextSibling).find('.informations').length) {
                var infoElem = $(elem.nextSibling).find('.informations')[0];
                var ogDim = infoElem.innerHTML.split(' ')[0];
                if (ogDim.includes("x")) ogDim = ogDim.split('x');
                else if (ogDim.includes("×")) ogDim = ogDim.split('×');
                var scaledDim = [dim[0], Math.round(dim[0]/ogDim[0]*ogDim[1])]; //scales the height to the current width
                if (scaledDim[1] != 499 && dim[1] != scaledDim[1]) {//499 happened often, persumably because Discourse rounds up
                    var url = elem.closest('.lightbox').href;
                    elem.src = url;
                    elem.height = scaledDim[1];
                    elem.style = 'max-height: unset;';
                    infoElem.innerHTML += ' <small>Expanded as tall image</small>';
                }
            }
        }
    };

    function initialiseScript() {waitObserveSearch('.post-stream', '.lightbox img', effect)}
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
