// ==UserScript==
// @name         Bunpro: Jisho Button
// @namespace    http://tampermonkey.net/
// @version      0.5.7
// @description  Searches the sentence on Jisho.
// @author       Kumirei
// @include      *bunpro.jp/*
// @exclude      *community.bunpro.jp*
// @require      https://greasyfork.org/scripts/5392-waitforkeyelements/code/WaitForKeyElements.js?version=115012
// @require      https://greasyfork.org/scripts/370623-bunpro-helpful-events/code/Bunpro:%20Helpful%20Events.js?version=615700
// @require      https://greasyfork.org/scripts/370219-bunpro-buttons-bar/code/Bunpro:%20Buttons%20Bar.js?version=654288
// @grant        none
// ==/UserScript==

(function() {
    //Wait until we're on the study page and can add the button
    $('HTML')[0].addEventListener('quiz-page', function() {
        //add button
        buttonsBar.addButton('JishoButton', 'Jisho', 'window.open(\'https://www.jisho.org/search/\' + parseSentence($(\'.study-question-japanese > div\')[0]))');

        //Bind J to the Jisho button
        $('#study-answer-input').on('keyup', function(e) {
            if (e.which == 74 && $('#submit-study-answer').attr('value') == "Next") {
                $('#JishoButton').click();
            }
        });
    });
})();

//Extracts the sentence from the sentence elements
parseSentence = function(sentenceElem) {
    var sentence = "";
    sentenceElem.childNodes.forEach(function(elem) {
        // find the text in each kind of element and append it to the sentence string
        var name = elem.nodeName;
        if (name == "#text") {
            sentence += elem.data;
        }
        else if (name == "STRONG" && elem.children.length) {
            sentence += elem.children[0].childNodes[0].data;       // with kanji in url
            //sentence += elem.children[0].children[1].innerText;     // with kana in url
        }
        else if (name == "SPAN" && elem.className == "study-area-input") {
            if (elem.innerText == "") sentence += "____";
            else sentence += elem.innerText;
        }
        else if (name == "RUBY") {
            sentence += elem.childNodes[0].data;       // with kanji in url
            //sentence += elem.children[1].innerText;     // with kana in url
        }
    });
    return sentence;
};
