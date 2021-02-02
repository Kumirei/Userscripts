// ==UserScript==
// @name         WaniKani Forums: Like counter
// @namespace    http://tampermonkey.net/
// @version      3.0.7
// @description  Keeps track of the likes you've used and how many you have left... supposedly.
// @author       Kumirei
// @include      https://community.wanikani.com*
// @grant        none
// ==/UserScript==

;(function($) {
    // SETTINGS
    const settings = {
        update_interval: 10, // Interval (minutes) for fetching summary page data
        lifetime_purple: false, // Set to true for purple info bubbles
    }

    // Global variable
    let LC = {
        summary: {
            last_update: '1970-01-01T00:00:00.000Z',
            likes_given: 0,
            likes_received: 0,
            days_visited: 0,
            max: 200, // 200 is default for *regulars*
        },
        day: {
            given: [],
            received: [],
        },
        stored: {
            zero: [],
            full: [],
        },
        elems: {
            received: null,
            given: null,
            next: null,
        },
    }

    // Update LC
    Promise.all([update_stored(), update_summary()]).then(update)
    setInterval(update_summary, settings.update_interval * 60 * 1000, LC)
    // Update the next like timer every second
    setInterval(update_next, 1000)
    // Install
    add_CSS()
    add_display()
    // Update every time a like is used
    $('body').on('click', '.post-stream .toggle-like', update)

    // Updates everything
    async function update(event) {
        // Update displayed count immediately
        if (event.type) {
            const old_count = Number(LC.elems.given.children().text())
            const new_count = $(event.target)
                .closest('.widget-button')
                .hasClass('has-like')
                ? old_count + 1
                : old_count - 1
            LC.elems.given.children().text(new_count)
        }
        // Update properly with api data
        const updater = async () => {
            await update_day()
            save_stored()
            update_display()
        }
        // Wait 100ms to allow Discourse backend to register the like
        setTimeout(updater, 100)
    }

    // Fetches the data of LC.stored from localStorage
    function update_stored() {
        LC.stored = Object.assign(LC.stored, JSON.parse(localStorage.getItem('LCstored')) || {})
    }

    // Saves the LC.stored data to localStorage
    function save_stored() {
        localStorage.setItem('LCstored', JSON.stringify(LC.stored))
    }

    // Updates the LC variable with info from the summary page
    async function update_summary() {
        const username = $('#current-user a')
            .attr('href')
            .split('/u/')[1]
        const f = await fetch(`https://community.wanikani.com/u/${username}/summary`, {
            headers: {
                accept: 'application/json, text/javascript, */*; q=0.01',
                'x-requested-with': 'XMLHttpRequest',
            },
        })
        if (f.status === 200) {
            const data = await f.json()
            const max = 50 * (1 + data.badges[0].id)
            const { likes_given, likes_received, days_visited } = data.user_summary
            LC.summary = { likes_given, likes_received, days_visited, max, last_update: new Date().toISOString() }
        } else console.warn(`[LIKE COUNTER] Error ${f.status}: There was an error fetching user summary`)
    }

    // Updates the likes given and received in the last 24 hours
    async function update_day() {
        const msday = 24 * 60 * 60 * 1000
        const now = Date.now()
        const username = $('#current-user a')
            .attr('href')
            .split('/u/')[1]
        LC.day.given = (await fetch_likes(username, 1, 24)).reverse()
        LC.day.received = (await fetch_likes(username, 2, 24)).reverse()
        if (LC.day.given.length === LC.summary.max && (LC.stored.zero[LC.stored.zero.length - 1] || 0) < now - msday) {
            LC.stored.zero.push(now)
        }
        if (LC.day.given.length === 0 && (LC.stored.full[LC.stored.full.length - 1] || 0) < now - msday) {
            LC.stored.full.push(now)
        }
    }

    // Fetches likes from Discourse api
    async function fetch_likes(username, actionType, hoursBack) {
        const time = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString()
        let offset = 0
        let fetched = []
        let keep_fetching = true
        while (keep_fetching) {
            const f = await fetch(
                `https://community.wanikani.com/user_actions.json?offset=0&username=${username}&filter=${actionType}&offset=${offset}`,
            )
            if (f.status !== 200) {
                console.warn(`[LIKE COUNTER] Error ${f.status}: There was an error fetching user likes`)
                break
            }
            const actions = (await f.json()).user_actions
            for (let item of actions) {
                const date = item.created_at
                if (date >= time) {
                    fetched.push(Date.parse(item.created_at))
                } else {
                    keep_fetching = false
                    break
                }
            }
            offset += 30
        }
        return fetched
    }

    // Adds the bubbles to the header
    function add_display() {
        // START code by rfindley
        if (is_dark_theme()) $('body').attr('theme', 'dark')
        else $('body').attr('theme', 'light')
        // Wait for the nav
        const wk_app_nav = $('.wanikani-app-nav').closest('.container')
        if (wk_app_nav.length === 0) {
            setTimeout(add_display, 200)
            return
        }
        // Attach the Dashboard menu to the stay-on-top menu.
        const top_menu = $('.d-header')
        const main_content = $('#main-outlet')
        $('body').addClass('float_wkappnav')
        wk_app_nav.addClass('wanikani-app-nav-container')
        top_menu.find('>.wrap > .contents:eq(0)').after(wk_app_nav)
        // Adjust the main content's top padding, so it won't be hidden under the new taller top menu.
        const main_content_toppad = Number(main_content.css('padding-top').match(/[0-9]*/)[0])
        main_content.css('padding-top', main_content_toppad + 25 + 'px')
        // END code by rfindley
        LC.elems = {
            received: $(
                '<li data-highlight="true" data-name="likes-received">Likes Received<span id="likes_received" class="dashboard_bubble">0</span></li>',
            ),
            given: $(
                '<li data-highlight="true" data-name="likes-left">Likes Left<span id="likes_given" class="dashboard_bubble">0</span></li>',
            ),
            next: $(
                '<li data-highlight="true" data-name="likes-next">Next Like<span id="next_like" class="dashboard_bubble">0</span></li>',
            ),
        }
        $('.wanikani-app-nav ul').append([LC.elems.received, LC.elems.given, LC.elems.next])
        update_display()
    }

    // Updates the counts and the hover info
    function update_display() {
        const msday = 24 * 60 * 60 * 1000
        const msh = msday / 24
        const now = Date.now()
        const { received, given, next } = LC.elems
        // Update counts
        received.children().text(LC.day.received.length)
        given.children().text(LC.summary.max - LC.day.given.length)
        next.children().text(time_left(LC.day.given[0] + msday))
        // Update hover info
        received.attr(
            'title',
            `${comma(LC.day.received.length)} likes received in past 24h` +
                `\n${comma(Math.round(LC.summary.likes_received / LC.summary.days_visited))} likes received per day visited` +
                `\n${comma(LC.summary.likes_received)} total likes received`,
        )
        given.attr(
            'title',
            `${comma(LC.day.given.length)} likes given in past 24h` +
                `\n${comma(Math.round(LC.summary.likes_given / LC.summary.days_visited))} likes given per day visited` +
                `\n${comma(LC.summary.likes_given)} total likes given` +
                `\n\n${comma(LC.stored.zero.length)} times have you ran out` +
                `\n${comma(
                    Math.floor((now - (LC.stored.zero[LC.stored.zero.length - 1] || now)) / msday),
                )} days since you last ran out` +
                `\n\n${comma(LC.stored.full.length)} times have you had full likes` +
                `\n${comma(
                    Math.floor((now - (LC.stored.full[LC.stored.full.length - 1] || now)) / msday),
                )} days since you last had full likes`,
        )
        let hours = Array(24)
            .fill(0)
            .map(
                (_, i) =>
                    LC.day.given.filter((like) => like + msday > now + i * msh && like + msday < now + (i + 1) * msh).length,
            )
        const next_like = new Date(LC.day.given[0] + msday)
        next.attr(
            'title',
            `Next like at ${next_like.getHours()}:${(next_like.getMinutes() < 10 ? '0' : '') + next_like.getMinutes()}` +
                `\n\nLikes replenishing in ${hours.reduce((a, c, i) => `${a}\n${i + 1}h: ${c}`, ``)}`,
        )
    }

    // Update the timer for the next like
    function update_next() {
        const msday = 24 * 60 * 60 * 1000
        const yesterday = Date.now() - msday
        const given = LC.day.given.length
        LC.day.given = LC.day.given.filter((t) => t > yesterday)
        // If likes have been used or expired update whole display
        if (given !== LC.day.given.length) update_display()
        // Else just update the timer
        else LC.elems.next.children().text(time_left(LC.day.given[0] + msday))
    }

    // Adds the CSS
    function add_CSS() {
        let bubble_color = settings.lifetime_purple ? 'rgb(213, 128, 255)' : '#6cf'
        $('head').append(
            '    <style id=like_counter>' +
                '    body[theme="dark"] .wanikani-app-nav ul li {color:#999;}' +
                '    li[data-highlight="true"] span.dashboard_bubble {background-color: ' +
                bubble_color +
                ' !important;}' +
                '    .wanikani-app-nav > ul {display: flex;}' +
                '    .wanikani-app-nav li[data-name="likes-received"] {order: 1;}' +
                '    .wanikani-app-nav li[data-name="likes-left"] {order: 2;}' +
                '    .wanikani-app-nav li[data-name="likes-next"] {order: 3;}' +
                '    .wanikani-app-nav li[data-name="lesson_count"],' +
                '    .wanikani-app-nav li[data-name="review_count"],' +
                '    .wanikani-app-nav li[data-name="next_review"] {order: 0;}' +
                '    .float_wkappnav .d-header {padding-bottom: 2em;}' +
                '    .float_wkappnav .d-header {height: 4em !important;}' +
                '    .float_wkappnav .d-header .title {height:4em;}' +
                '    .float_wkappnav .wanikani-app-nav-container {border-top:1px solid #ccc; line-height:2em;}' +
                '    .float_wkappnav .wanikani-app-nav ul {padding-bottom:0; margin-bottom:0; border-bottom:inherit;}' +
                '    .dashboard_bubble {color:#fff; background-color:#bdbdbd; font-size:0.8em; border-radius:0.5em; padding:0 6px; margin:0 0 0 4px; font-weight:bold;}' +
                '    li[data-highlight="true"] .dashboard_bubble {background-color:#6cf;}' +
                '    body[theme="dark"] .dashboard_bubble {background-color:#646464;}' +
                '    body[theme="dark"] li[data-highlight="true"] .dashboard_bubble {color:#000; background-color:#6cf;}' +
                '    body[theme="dark"] .wanikani-app-nav[data-highlight-labels="true"] li[data-highlight="true"] a {color:#6cf;}' +
                '    body[theme="dark"] .wanikani-app-nav ul li a {color:#999;}' +
                '</style>',
        )
    }

    // Returns a string with the time remaining until the given date
    function time_left(date) {
        if (!date) return 'N/A'
        const seconds = (date - Date.now()) / 1000
        const s = Math.floor((seconds % 3600) % 60)
        const sr = Math.round((seconds % 3600) % 60)
        const m = Math.floor(((seconds - s) / 60) % 60)
        const mr = Math.round(((seconds - s) / 60) % 60)
        const h = Math.floor((seconds - s - m * 60) / 3600)
        const hr = Math.round((seconds - s - m * 60) / 3600)
        if (h != 0) return hr + 'h'
        if (m != 0) return mr + 'm'
        if (s != 0) return sr + 's'
    }

    // Adds commas to a number
    function comma(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    }

    // Checks whether a dark theme is used
    function is_dark_theme() {
        // Grab the <html> background color, average the RGB.  If less than 50% bright, it's dark theme.
        return (
            $('html')
                .css('background-color')
                .match(/\((.*)\)/)[1]
                .split(',')
                .slice(0, 3)
                .map((str) => Number(str))
                .reduce((a, i) => a + i) /
                (255 * 3) <
            0.5
        )
    }
})(window.jQuery)
