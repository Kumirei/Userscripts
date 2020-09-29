// ==UserScript==
// @name         Wanikani: Real (Time) Numbers
// @namespace    http://tampermonkey.net/
// @version      1.0.2
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
    // Wait until the top of the hour then update the review count
    wait_until(get_next_hour(), fetch_and_update);

    // Fetches the review count, updates the dashboard, then does the same ting on top of every hour
    function fetch_and_update() {
        fetch_review_count()
            .then(update_review_count)
            .then(next_hour);
    }

    // Waits until the next hour then updates the review count
    function next_hour() {
        wait_until(get_next_hour(), fetch_and_update);
    }

    // Waints until a given time and executes the given function
    function wait_until(time, func) {
        setTimeout(func, time - Date.now());
    }

    // Gets the time for the next hour in ms
    function get_next_hour() {
        var current_date = new Date();
        return new Date(current_date.toDateString() + ' ' + (current_date.getHours()+1) + ':').getTime();
    }

    // Retreives the number of reviews due
    function fetch_review_count() {
        var [promise, resolve] = new_promise();
        wkof.Apiv2.get_endpoint('summary')
            .then(data=>resolve(data.reviews[0].subject_ids.length));
        return promise;
    }

    // Update the review count on the dashboard
    function update_review_count(review_count) {
        var reviews_elem = document.getElementsByClassName('navigation-shortcut--reviews')[0];
        reviews_elem.setAttribute('data-count', review_count);
        reviews_elem.getElementsByTagName('span')[0].innerText = review_count;
    }

    // Create a new promise and resolve function
    function new_promise() {
        var resolve, promise = new Promise((res, rej)=>{resolve = res;});
		return [promise, resolve];
    }
})();
