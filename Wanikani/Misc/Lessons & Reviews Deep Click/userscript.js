// ==UserScript==
// @name         Wanikani: Lesson and review deep click
// @namespace    Kumirei
// @version      0.1.1
// @description  Just one click to start a session from the dashboard
// @author       Kumirei
// @include      *wanikani.com*
// @exclude      *wanikani.com/*/session
// @grant        none
// ==/UserScript==

(function() {
    waitForSelector('[href="/lesson"]').then((e)=>{
            e.href = "/lesson/session";
    });
    waitForSelector('[href="/lesson"]').then((e)=>{
            e.href = "/review/session";
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