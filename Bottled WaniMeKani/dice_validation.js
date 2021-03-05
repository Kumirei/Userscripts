// ==UserScript==
// @name         Wanikani Forums: Bottled WaniMeKani dice validator
// @namespace    http://tampermonkey.net/
// @version      1.5.0
// @description  Adds WaniMeKani functions to your own posts
// @author       Kumirei
// @include      https://community.wanikani.com/*
// @grant        none
// ==/UserScript==

;(function () {
    window.validate_dice = validate_dice

    // Validation
    function validate_dice(text, time, count, faces) {
        let random = prng(text, time)
        console.log('Dice roll validation', dice(count, faces, random))
    }

    // Roll some dice
    function dice(count, faces, rng) {
        return new Array(Number(count))
            .fill(null)
            .map((_) => random_int(1, faces, rng))
            .join(', ')
    }

    // Get random integer in inclusive interval [min, max]
    function random_int(min, max, rand = Math.random) {
        min = Math.ceil(min)
        max = Math.floor(max)
        return Math.floor(rand() * (max - min + 1)) + min
    }

    // Creates a new PRNG
    function prng(seed_string, time) {
        const seeder = xmur3(seed_string + time)
        const new_prng = mulberry32(seeder())
        return new_prng
    }

    // Seed generator for PRNG
    function xmur3(str) {
        for (var i = 0, h = 1779033703 ^ str.length; i < str.length; i++)
            (h = Math.imul(h ^ str.charCodeAt(i), 3432918353)), (h = (h << 13) | (h >>> 19))
        return function () {
            h = Math.imul(h ^ (h >>> 16), 2246822507)
            h = Math.imul(h ^ (h >>> 13), 3266489909)
            return (h ^= h >>> 16) >>> 0
        }
    }

    // Seedable PRNG
    function mulberry32(a) {
        return function () {
            var t = (a += 0x6d2b79f5)
            t = Math.imul(t ^ (t >>> 15), t | 1)
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296
        }
    }
})()
