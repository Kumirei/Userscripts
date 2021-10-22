// ==UserScript==
// @name         Wanikani Forums: Emoter
// @namespace    http://tampermonkey.net/
// @version      1.1.7
// @description  Custom emote handler
// @author       Kumirei
// @include      https://community.wanikani.com/*
// @grant        none
// ==/UserScript==

;(function () {
    // Wait until the save function is defined
    const i = setInterval(tryInject, 100)

    // Inject if the save function is defined
    function tryInject() {
        const old_save = window.require('discourse/controllers/composer').default.prototype.save
        const old_cook = window.require('pretty-text/engines/discourse-markdown-it').cook
        if (old_save) {
            clearInterval(i)
            inject(old_save, old_cook)
        }
    }

    // Wrap the save function with our own function
    function inject(old_save, old_cook) {
        const new_save = async function (t) {
            const composer = document.querySelector('textarea.d-editor-input') // Reply box
            composer.value = await emote(composer) // Modify message
            composer.dispatchEvent(new Event('change', { bubbles: true, cancelable: true })) // Let Discourse know
            old_save.call(this, t) // Call regular save function
        }
        const new_cook = async function (raw, ops) {
            return old_cook(emote_cooker(raw), ops)
        }
        window.require('discourse/controllers/composer').default.prototype.save = new_save // Inject
        window.require('pretty-text/engines/discourse-markdown-it').cook = new_cook // Inject
    }

    // Handles emotifications when saving
    function emote(composer) {
        const cache = get_local()
        const original_text = composer.value
        // Get draft text, without quotes
        // let text = original_text.replace(/\[quote((?!\[\/quote\]).)*\[\/quote\]/gis, '')
        // Replace stuffs?!
        text = replace_stuffs(original_text, cache)
        return text
    }

    // Change the preview
    function emote_cooker(raw) {
        const cache = get_local()
        const command_template = /!emote\s+(\w+)\s+(\w+)\s+(["“„](\S+)["”])?/i
        const composer = document.querySelector('textarea.d-editor-input') // Reply box
        const command = composer.value.match(command_template)
        // Do things if commands are present
        if (command) process_command(command, composer, command_template, cache)
        // Replace stuffs?!
        raw = replace_stuffs(raw, cache)
        // Update cache
        set_local(cache)
        return raw
    }

    // Handles commands
    function process_command(command, composer, command_template, cache) {
        const emotes = cache.emotes
        let [_, word, name, __, value] = command
        word = word.toLowerCase()
        switch (word) {
            case 'new': // !emote new NAME "URL"
                if (value) emotes[name] = { url: value }
                break
            case 'size': // !emote size NAME "SIZE"
                if (value && !value.match(/\d+(x\d+)?/i)) break
                if (name === 'default') cache.size = value
            case 'url': // !emote url NAME "URL"
                if (value && emotes[name]) emotes[name][word] = value
                break
            case 'remove': // !emote remove NAME
                delete emotes[name]
                break
            case 'rename': // !emote rename NAME "NAME"
                if (value && emotes[name]) delete Object.assign(emotes, { [value]: emotes[name] })[name]
                break
        }
        if (value || word === 'remove') {
            composer.value = composer.value.replace(command_template, ':$2:')
            composer.dispatchEvent(new Event('change', { bubbles: true, cancelable: true })) // Let Discourse know
        }
    }

    // Creates an image for the emote
    function get_image(url, name, size) {
        let w = (h = size)
        if (size.match && size.match(/\d+x\d+/i)) [w, h] = size.split('x')
        return `<abbr title="${name}">![${name}|${w}x${h}](${url})</abbr>`
    }

    // Replaces :emotes: with images and !emotelist with the list
    function replace_stuffs(text, cache) {
        text = replace_emotes(text, cache)
        text = replace_list(text, cache)
        return text
    }

    // Replaces :emotes: with images
    function replace_emotes(text, cache) {
        return text.replace(/:(\w+):/g, (original, word) => {
            const emote = cache.emotes[word]
            return emote ? get_image(emote.url, word, emote?.size || cache.size) : original
        })
    }

    // Create a table of the available emotes
    function replace_list(raw, cache) {
        const list = Object.entries(cache.emotes)
            .map((e) => get_image(e[1].url, e[0], e[1].size || cache.size).replace('|', `\\|`) + `|` + e[0])
            .join('\n')
        const table = `Image|Name\n-|-\n${list}</table>`
        return raw.replace(/!emotelist/i, table)
    }

    // Fetch local storage cache
    function get_local() {
        const cache = JSON.parse(localStorage.getItem('Emoter') || '{}')
        return Object.assign({ size: 40, emotes: {} }, cache)
    }

    // Saves to local storage
    function set_local(cache) {
        localStorage.setItem('Emoter', JSON.stringify(cache))
    }
})()
