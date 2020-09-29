// ==UserScript==
// @name         WaniKani Forums: Giphy/Pinterest embedder
// @namespace    http://tampermonkey.net/
// @version      0.1.3
// @description  Embeds images which Discourse fails to embed
// @author       Kumirei
// @include      https://community.wanikani.com*
// @require      https://greasyfork.org/scripts/5392-waitforkeyelements/code/WaitForKeyElements.js?version=115012
// @grant        none
// ==/UserScript==

(function() {
    // initialise script and set triggers
    waitForKeyElements('.topic-body p > a[target="_blank"]', function(e){embedImages(e);});
})();

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
