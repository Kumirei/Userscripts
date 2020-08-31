// ==UserScript==
// @name         Wanikani Heatmap 3
// @namespace    http://tampermonkey.net/
// @version      3.0.0
// @description  Adds review and lesson heatmaps to the dashboard.
// @author       Kumirei
// @include      /^https://(www|preview).wanikani.com/(dashboard)?$/
// @require      https://raw.githubusercontent.com/Kumirei/Wanikani/master/heatmap/Heatmap.js
// @require      https://raw.githubusercontent.com/Kumirei/Wanikani/master/heatmap/review_cache.js
// @require      https://raw.githubusercontent.com/Kumirei/Wanikani/master/heatmap/heatmap3.js
// @grant        none
// ==/UserScript==

wkof.load_css('https://raw.githubusercontent.com/Kumirei/Wanikani/master/heatmap/Heatmap.css');
wkof.load_css('https://raw.githubusercontent.com/Kumirei/Wanikani/master/heatmap/heatmap3.css');
