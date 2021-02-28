// ==UserScript==
// @name         Wanikani Forums: Bottled WaniMeKani
// @namespace    http://tampermonkey.net/
// @version      1.0.2
// @description  Adds WaniMeKani functions to your own posts
// @author       Kumirei
// @include      https://community.wanikani.com/t/*
// @grant        none
// ==/UserScript==

;(function () {
    // Wait until the save function is defined
    const i = setInterval(tryInject, 100)

    // Inject if the save function is defined
    function tryInject() {
        const old_save = window.require('discourse/controllers/composer').default.prototype.save
        if (old_save) {
            clearInterval(i)
            inject(old_save)
        }
    }

    // Wrape the save function with our own function
    function inject(old_save) {
        const new_save = function (t) {
            const composer = document.querySelector('textarea.d-editor-input') // Reply box
            const preview = document.getElementsByClassName('d-editor-preview')[0] // Preview box
            composer.value += results(composer, preview) // Modify message
            composer.dispatchEvent(new Event('change', { bubbles: true, cancelable: true })) // Let Discourse know
            old_save.call(this, t) // Call regular save function
        }
        window.require('discourse/controllers/composer').default.prototype.save = new_save // Inject
    }

    // Grabs the text then returns the WaniMeKani answers
    function results(composer, preview) {
        // Don't do anything if results are already present
        if (preview.querySelector('#heading--results')) return ''
        const text = composer.value.toLowerCase()
        let actions = []
        // Process dice rolls
        const rolls =
            text
                .match(/@wanimekani\W+roll\W+\d+d\d+/g)
                ?.map((m) => m.match(/(\d+)d(\d+)/))
                ?.map((m) => [m[1], m[2]]) || []
        actions.push(...rolls.map((r) => `Rolling ${r.join('d')}\n> :game_die: ${roll(r[0], r[1]).join(', ')}`))
        // Process 8ball
        const balls = text.match(/@wanimekani\W+((8ball)|(fortune))/g) || []
        actions.push(...balls.map((b) => `8Ball says\n> :crystal_ball: ${fortune()}`))
        // Process quote
        const quotes = text.match(/@wanimekani\W+quote(\W+\d+)?/g)?.map((m) => m.match(/\d+/)?.[0]) || []
        actions.push(...quotes.map((q) => quote(q)))
        // Combine results
        const results =
            actions.length == 0
                ? ''
                : `\n\n---\n\n<h6 id="heading--results"></h6><aside class="quote">
        <div class="title">
            <img alt="" width="20" height="20" src="https://sjc3.discourse-cdn.com/business5/user_avatar/community.wanikani.com/wanimekani/120/69503_2.png" class="avatar"> WaniMeKani:</div>
        <blockquote>
                <p>\n\n${actions.join('\n\n')}\n</p>
    </blockquote>
    </aside>`
        console.log(actions, actions.join('\n\n'))

        return results

        // Rolls a number of dice
        function roll(dices, faces) {
            return new Array(Number(dices)).fill(null).map((_) => random_int(0, faces))
        }

        // Get random quote
        function quote(n) {
            const quotes = [
                ['In the middle of every difficulty lies opportunity', 'Albert Einstein'],
                ['Freedom is not worth having if it does not connote freedom to err.', 'Mahatma Gandhi'],
                ['Don’t cry because it’s over, smile because it happened.', 'Dr Seuss'],
                ['If you want something done right, do it yourself.', 'Charles-Guillaume Étienne'],
                ['Believe you can and you’re halfway there.', 'Theodore Roosevelt'],
                ['Life is like a box of chocolates. You never know what you’re gonna get.', 'Forrest Gump’s Mom'],
                ['That’s one small step for a man, a giant leap for mankind.', 'Neil Armstrong'],
                ['Do one thing every day that scares you.', 'Eleanor Roosevelt'],
                ['Mistakes are always forgivable, if one has the courage to admit them.', 'Bruce Lee'],
                ['Whatever the mind of man can conceive and believe, it can achieve.', 'Napoleon Hill'],
            ]
            if (!n) n = random_int(0, quotes.length - 1)
            return quotes[n] ? `Quote #${n}\n> :left_speech_bubble: ${quotes[n].join(' – ')}` : `There is no quote ${n}`
        }

        // Get 8ball answer
        function fortune() {
            const answers = [
                'It is certain',
                'It is decidedly so',
                'Without a doubt',
                'Yes definitely',
                'You may rely on it',
                'As I see it, yes',
                'Most likely',
                'Outlook good',
                'Yes',
                'Signs point to yes',
                'Reply hazy, try again',
                'Ask again later',
                'Better not tell you now',
                'Cannot predict now',
                'Concentrate and ask again',
                "Don't count on it",
                'My reply is no',
                'My sources say no',
                'Outlook not so good',
                'Very doubtful',
            ]
            return answers[random_int(0, answers.length - 1)]
        }
    }

    // Get random integer in inclusive interval [min, max]
    function random_int(min, max) {
        min = Math.ceil(min)
        max = Math.floor(max)
        return Math.floor(Math.random() * (max - min + 1)) + min
    }
})()
