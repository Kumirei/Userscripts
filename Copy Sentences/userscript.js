// ==UserScript==
// @name         Bunpro: Copy Sentences
// @namespace    http://tampermonkey.net/
// @version      0.4.8
// @description  Adds buttons to copy the Japanese and English sentences in review.
// @author       Kumirei
// @include      *bunpro.jp/*
// @exclude      *community.bunpro.jp*
// @require      https://greasyfork.org/scripts/5392-waitforkeyelements/code/WaitForKeyElements.js?version=115012
// @require      https://greasyfork.org/scripts/370623-bunpro-helpful-events/code/Bunpro:%20Helpful%20Events.js?version=615700
// @require      https://greasyfork.org/scripts/370219-bunpro-buttons-bar/code/Bunpro:%20Buttons%20Bar.js?version=654288
// @grant        none
// ==/UserScript==

(function() {
    //add buttons
    $('HTML')[0].addEventListener('quiz-page', function() {
        buttonsBar.addButton('copyJP', 'Copy JP', 'copyText(parseSentence($(\'.study-question-japanese > div\')[0]));');
        buttonsBar.addButton('copyEN', 'Copy EN', 'copyText($(\'.study-question-english-hint > span\')[0].innerText);');
    });
})();

//Extracts the sentence from the sentence element
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
        else if (name == "SPAN" && ["chui", "study-area-input"].includes(elem.className)) {
            if (elem.innerText == "") sentence += "____";
            else sentence += elem.innerText;
        }
        else if (name == "RUBY") {
            sentence += elem.childNodes[0].data;       // with kanji in string
            //sentence += elem.children[1].innerText;     // with kana in string
        }
    });
    return sentence;
};

//copies the text
copyText = function(text) {
    var textArea = document.createElement("textarea");
    textArea.style.position = 'fixed';
    textArea.style.top = 0;
    textArea.style.left = 0;
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = 0;
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        var successful = document.execCommand('copy');
        var msg = successful ? 'successful' : 'unsuccessful';
        console.log('Copying text command was ' + msg);
        console.log('Copied Sentence:', text);
    } catch (err) {
        console.log('Oops, unable to copy');
    }

    document.body.removeChild(textArea);
};
