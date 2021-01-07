// ==UserScript==
// @name         Wanikani Forums: 10chars
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Inserts invisible text into any post not meeting the 10 character requirement
// @author       Kumirei
// @include      https://community.wanikani.com/t/*
// @grant        none
// ==/UserScript==

(function() {
    let observer = new MutationObserver(m => m.forEach(detect_composer));
    observer.observe(document.getElementById('reply-control'), {childList: true, subtree: true});
    function detect_composer(m) {m.addedNodes.forEach(n => {if (n.tagName == "TEXTAREA") inject();})}
    function inject() {
        let old_save = window.require("discourse/controllers/composer").default.prototype.save;
        let new_save = function(t){
            console.log('save');
            let composer = document.querySelector("textarea.d-editor-input");
            let text = composer.value;
            if (text.length < 10) text += ' <!-- Lorem Ipsum -->';
            composer.value = text;
            old_save.call(this, t);
        }
        window.require("discourse/controllers/composer").default.prototype.save = new_save;
    }
})();
