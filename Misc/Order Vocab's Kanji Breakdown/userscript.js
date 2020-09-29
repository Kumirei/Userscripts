// ==UserScript==
// @name         Wanikani: Order Vocab's Kanji Breakdown
// @namespace    http://tampermonkey.net/
// @version      0.1.1
// @description  Puts vocabulary words' kanji breakdown into the order of appearance within the word.
// @author       Kumirei
// @match        https://www.wanikani.com/*/session
// @include      *preview.wanikani.com*
// @require      https://greasyfork.org/scripts/5392-waitforkeyelements/code/WaitForKeyElements.js?version=115012
// @grant        none
// ==/UserScript==

(function() {
    var word;
    // fix order in lessons
    waitForKeyElements('#supplement-voc-breakdown .kanji', function(e) {
        if (word != $('#character')[0].innerText) {
            word = $('#character')[0].innerText;
            var elems = hashElems('#supplement-voc-breakdown .kanji');
            reorganiseWords(word, elems, '#supplement-voc-breakdown ul.pure-g-r');
        }
    });

    // fix order in reviews
    waitForKeyElements('#related-items', function(e) {
        if ($('#character.vocabulary').length) {
            word = $('#character.vocabulary')[0].innerText;
            var elems = hashElems('#related-items span.kanji');
            reorganiseWords(word, elems, '#related-items ul.kanji');
        }
    });

    // puts the element containing the kanji in a hashmap with the kanji as the key
    function hashElems(target) {
        var elems = {};
        $(target).each(function(i, e) {
            elems[e.innerText] = $(e).closest('li');
        });
        return elems;
    }

    // goes through the word's kanji in order and for each puts its respective element last in the breakdown
    function reorganiseWords(word, elems, target) {
        for (i = 0; i < word.length; i++) {
            var char = word.charAt(i);
            if (char in elems) {
                $(target).append(elems[char]);
            }
        }
    }
})();
