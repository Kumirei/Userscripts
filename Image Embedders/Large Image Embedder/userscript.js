// ==UserScript==
// @name         WaniKani Forums: Large Image Embedder
// @namespace    http://tampermonkey.net/
// @version      0.1.3
// @description  Embeds images which Discourse refuses to embed
// @author       Kumirei
// @include      https://community.wanikani.com*
// @require      https://greasyfork.org/scripts/5392-waitforkeyelements/code/WaitForKeyElements.js?version=115012
// @grant        none
// ==/UserScript==
/*jshint esversion: 8 */

(function() {
    // initialise script and set triggers
    waitForKeyElements('.large-image-placeholder a', function(){embedImages();});
})();

//embeds images if there are any broken ones to find
function embedImages() {
    $('.large-image-placeholder a').each(function() {
        console.log('swooosh');
        var url = $(this).attr('href');
        var img = document.createElement('img');
        img.src = url;
        var elem = $(this.closest('.large-image-placeholder'));
        elem.addClass('lightbox');
        elem.attr('href', url);
        elem.empty();
        elem.append(img);
        elem.append('<div class="meta">'+
        '    <span class="filename"><small>Embedded by the <i>Large Image Embedder</i>'+
        '    </small></span></div>');
    });
}
