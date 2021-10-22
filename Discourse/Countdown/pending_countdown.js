// ==UserScript==
// @name         Wanikani Forums: The Countdown Script
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Updates countdown timers from pending.me.uk every second so it seems like they're counting down real-time.
// @author       Kumirei
// @include      https://community.wanikani.com*
// @grant        none
// ==/UserScript==

;(function () {
    'use strict'

    setInterval(function () {
        $('img[src*="pending"]').each(function () {
            var link = $(this).attr('src')
            if (link.includes('?=')) {
                link = link.split('?=')[0]
            }
            $(this).attr('src', link + '?=' + Date.now())
        })
    }, 1000)
})()
