// ==UserScript==
// @name         Welcome Script
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       Kumirei
// @include      *community.wanikani.com*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wanikani.com
// @grant        none
// ==/UserScript==

;(function () {
    'use strict'

    setInterval(() => {
        const body = document.querySelector('body.category-campfire-introductions')
        if (!body) return
        if (document.querySelector('#post_1 .post-controls .welcome-button')) return
        const buttons = document.querySelector('#post_1 .post-controls')
        if (!buttons) return
        const name = document.querySelector('#post_1 .username > a').textContent
        buttons.insertAdjacentElement('beforeend', getButton(name))
    }, 1000)

    function getButton(name) {
        const button = document.createElement('button')
        button.classList.add(...'welcome-button widget-button btn-flat no-text btn-icon'.split(' '))
        button.textContent = 'Welcome'
        button.onclick = () => post(welcomeTemplate(name))
        button.style = 'order: -1'
        return button
    }

    function welcomeTemplate(name) {
        return `<div align="center">

$
\\definecolor{sd}{RGB}{125,213,169}
\\definecolor{sp}{RGB}{236, 51, 237}
\\definecolor{spi}{RGB}{255,102,255}
\\definecolor{sr}{RGB}{255,115,151}
\\definecolor{sy}{RGB}{255,227,147}
\\definecolor{sb}{RGB}{153,255,255}
\\definecolor{so}{RGB}{253,142,38}
\\definecolor{srf}{RGB}{229,90,4}
\\Huge
\\color{sy}\\text{✧}
\\color{srf}\\text{･ﾟ}
\\color{sr}\\text{:}
\\color{sp}\\text{ *}
\\color{sb}\\text{✧}
\\color{sr}\\text{･ﾟ}
\\color{so}\\text{:}
\\color{spi}\\text{*}
\\color{sd}\\text{WELCOME}
\\color{sb}\\text{*}
\\color{sr}\\text{:}
\\color{so}\\text{･ﾟ}
\\color{spi}\\text{✧}
\\color{srf}\\text{* }
\\color{sp}\\text{:}
\\color{sb}\\text{･ﾟ}
\\color{sy}\\text{✧}
$
![starcowelcome|540x293](upload://1R7tsUFYuBglXikFdmKa2DlILHk.gif)


## Welcome @${name}!

Make sure to checkout the [knowledgebase](https://knowledge.wanikani.com/), there is a lot of good info in these for new users. If you're looking for further resources check out the [community compiled list of resources](https://community.wanikani.com/t/the-ultimate-additional-japanese-resources-list/16859?u=Kumirei). For extra features and fixes for those small things which keep bugging you consult [The New And Improved List Of API and Third Party Apps](https://community.wanikani.com/t/the-new-and-improved-list-of-api-and-third-party-apps/7694?u=kumirei).

I hope you'll have a good time here with us and am looking forward to seeing you around!

$\\large\\color{sr}\\text{♥    ♡    ♥    ♡    ♥    ♡    ♥    ♡    ♥    ♡    ♥    ♡    ♥    ♡    ♥    ♡    ♥    ♡    ♥}$
`
    }

    function post(text) {
        console.log('posting', text)
        $('.btn.create').click()
        var i = setInterval(() => {
            if (!$('.d-editor-input').length) return
            clearInterval(i)
            $('.d-editor-input').val(text)
            $('.d-editor-input')[0].dispatchEvent(new Event('change', { bubbles: true, cancelable: true }))
            $('.submit-panel .btn.create').click()
        }, 100)
    }
})()
