// ==UserScript==
// @name         Wanikani Forums: Quote Whole Post
// @namespace    http://tampermonkey.net/
// @version      0.1.5
// @description  Adds a button to quote the whole post
// @author       Kumirei
// @include      https://community.wanikani.com*
// @require      https://greasyfork.org/scripts/5392-waitforkeyelements/code/WaitForKeyElements.js?version=115012
// @grant        none
// ==/UserScript==

(function() {
    waitForKeyElements('.post-controls .share', function(e){
        var E = e.closest('article');
        var btn = document.createElement('button');
        btn.className = "widget-button btn-flat no-text btn-icon quote-whole-post";
        btn.title = "Click to quote whole post";
        btn.innerHTML = '<svg class="fa d-icon d-icon-comment-o svg-icon svg-string" xmlns="http://www.w3.org/2000/svg"><use xlink:href="#far-comment"></use></svg>';
        btn.onclick = function() {
            E.find('.widget-button.reply')[0].click();
            var interval = setInterval(function(){
                if ($('button.quote').length) {
                    $('button.quote').click();
                    clearInterval(interval);
                }
            }, 100);
        };
        var oldBtn = E.find('button[title="Click to quote whole post"]');
        if (oldBtn.length) oldBtn.remove();
        E.find('.post-controls').append(btn);
    });
    $('head').append('<style id="QuoteWholePostCSS">.quote-whole-post{float: right; padding: 8px 10px; margin: 1px 0;} .quote-whole-post.d-hover{background-color: rgba(122, 122, 122, 0.17);}</style>');
})();
