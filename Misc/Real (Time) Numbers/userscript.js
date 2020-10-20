// ==UserScript==
// @name         Wanikani: Real (Time) Numbers
// @namespace    http://tampermonkey.net/
// @version      1.2.0
// @description  Updates the review count automatically as soon as new reviews are due
// @author       Kumirei
// @match        https://www.wanikani.com
// @match        https://www.wanikani.com/dashboard
// @match        https://preview.wanikani.com
// @match        https://preview.wanikani.com/dashboard
// @grant        none
// ==/UserScript==
/*jshint esversion: 8 */

(function() {
    let script_name = "Real (Time) Numbers";
    // Make sure WKOF is installed
    if (!wkof) {
        let response = confirm(script_name+' requires WaniKani Open Framework.\n Click "OK" to be forwarded to installation instructions.');
        if (response) {
            window.location.href = 'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549';
        }
        return;
    }
    wkof.include('Apiv2');
    wkof.ready('Apiv2').then(init);

    function init() {
        // Wait until the top of the hour then update the review/lessons count
        let tpu = new PendingUpdater(true,45*1000); // no caching, look 45 seconds into the future to account for out of sync clocks
        wait_until(get_next_hour(), fetch_and_update_recurring);

        // Also update lessons/reviews whenever page is switched to
        let lastVisibilityState = 'visible';
        let vpu = new PendingUpdater(false, 0); // allow caching, no looking into the future
        document.addEventListener("visibilitychange", function() {
            if (document.visibilityState == 'visible' && lastVisibilityState == 'hidden') {
                vpu.fetch_and_update();
            }
            lastVisibilityState = document.visibilityState;
        });

        // Also update lessons/reviews whenever network status changes to online
        window.addEventListener('online',  function () {
            vpu.fetch_and_update();
        });

        // Add CSS
        let css = `.lessons-and-reviews__reviews-button, .lessons-and-reviews__lessons-button,
        navigation-shortcut--reviews, navigation-shortcut--lessons {
            transition: background 300ms;
        }`;
        add_css(css, 'real-time-numbers-css');
    }

    // Fetches the review/lessons counts, updates the dashboard, then does the same thing on top of every hour
    function fetch_and_update_recurring() {
        tpu.fetch_and_update();
        wait_until(get_next_hour(), fetch_and_update_recurring);
    }

    // Waits until a given time and executes the given function
    function wait_until(time, func) {
        setTimeout(func, time - Date.now());
    }

    // Gets the time for the next hour in ms
    function get_next_hour() {
        let current_date = new Date();
        return new Date(current_date.toDateString() + ' ' + (current_date.getHours()+1) + ':').getTime();
    }

    function add_css(css, id="") {
        document.getElementsByTagName('head')[0].insertAdjacentHTML('beforeend', `<style id="${id}">${css}</style>`);
    }

    // Handles fetching and displaying updates to pending lesson and review counts
    class PendingUpdater {
        // force_update (bool): when true, don't use cached data even if
        // age of cached data is < 60 seconds (default: false)
        // dt (number): # of ms to look ahead into the future when computing
        // what reviews/lessons are/will be available (default: 0)
        constructor(force_update, dt) {
            if (typeof(force_update) == 'undefined')
                force_update = false;
            if (typeof(dt) == 'undefined')
                dt = 0;
            this.force_update = force_update;
            this.dt = dt;
            this.thresholds = {reviews: [0,1,50,100,250,500,1000], // thresholds where reviews button image changes
                               lessons: [0,1,25,50,100,250,500]}; // thresholds where lessons button image changes
            this.threshold_cls_prefix = {reviews: "lessons-and-reviews__reviews-button--",
                                         lessons: "lessons-and-reviews__lessons-button--"};
            this.session_start_tooltip_with_pending = {review: 'Start review session',
                                                       lesson: "Start lessons"};
        }

        // Fetches the review/lessons counts, updates the counts on the page
        fetch_and_update() {
            this.fetch_pending_counts()
                .then(this.update_pending_counts.bind(this));
        }

        // Retreives the number of reviews/lessons due
        async fetch_pending_counts() {
            let data = await wkof.Apiv2.get_endpoint('summary', {force_update: this.force_update});
            return {reviews: this.get_pending(data.reviews).length,
                    lessons: this.get_pending(data.lessons).length};
        }

        // Given a list of reviews/lessons returned from the api,
        // Returns available pending reviews/lessons as of current time + this.dt
        get_pending(lst) {
            let pending = [];
            let reference_time = Date.now() + this.dt;
            for (let i=0; i<lst.length; i++) {
                if (Date.parse(lst[i].available_at) <= reference_time)
                    pending.push(...lst[i].subject_ids);
            }
            return pending;
        }

        // Update both the review and lessons counts in both title bar and big button if on the dashboard
        // Update the count in the top right if on the lessons / reviews summary page
        update_pending_counts(counts) {
            let url = new URL(document.URL);
            if (['','/','/dashboard','/dashboard/'].includes(url.pathname)) {
                this.dashboard_update_pending_count(counts.lessons, 'lessons');
                this.dashboard_update_pending_count(counts.reviews, 'reviews');
            } else if (['/review','/review/'].includes(url.pathname)) {
                this.summary_update_pending_count(counts.reviews, 'review');
            } else if (['/lesson','/lesson/'].includes(url.pathname)) {
                this.summary_update_pending_count(counts.lessons, 'lesson');
            }
        }

        // Update the review or lessons count in both title bar and big button for the dashboard
        dashboard_update_pending_count(count, reviews_or_lessons) {
            // update count that shows up in title bar when scrolling
            let reviews_elem = document.getElementsByClassName('navigation-shortcut--' + reviews_or_lessons)[0];
            reviews_elem.setAttribute('data-count', count);
            reviews_elem.getElementsByTagName('span')[0].innerText = count;

            // update count in big button at top of page
            let big_reviews_elem = document.getElementsByClassName('lessons-and-reviews__' + reviews_or_lessons + '-button')[0];
            for (let i=0; i<big_reviews_elem.classList.length; i++) {
                if (big_reviews_elem.classList[i].startsWith(this.threshold_cls_prefix[reviews_or_lessons])) {
                    big_reviews_elem.classList.remove(big_reviews_elem.classList[i]);
                    break;
                }
            }
            let review_threshold = Math.max(
                ...this.thresholds[reviews_or_lessons].filter(threshold => threshold <= count)
            );
            big_reviews_elem.classList.add(this.threshold_cls_prefix[reviews_or_lessons] + review_threshold);
            big_reviews_elem.getElementsByTagName('span')[0].innerText = count;
        }

        // Update the review or lessons count in the top right of the review or lessons summary page
        // The second argument is singular here and plural in dashboard_update_pending_count(...).
        summary_update_pending_count(count, review_or_lesson) {
            let link = document.querySelector('#start-session a');
            let cl = link.classList;
            if (count == 0) {
                link.setAttribute('title', 'No ' + review_or_lesson + 's in queue');
                cl.add('disabled'); // ignores duplicates automatically
            } else if (count > 0) {
                link.setAttribute('title', this.session_start_tooltip_with_pending[review_or_lesson]);
                cl.remove('disabled');
            }
            document.getElementById(review_or_lesson + '-queue-count').innerText = count;
        }
    }
})();
