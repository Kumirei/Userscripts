// ==UserScript==
// @name         WaniKani Forums: Like counter
// @namespace    http://tampermonkey.net/
// @version      2.0.18
// @description  Keeps track of the likes you've used and how many you have left... supposedly.
// @author       Kumirei
// @include      https://community.wanikani.com*
// @require      https://greasyfork.org/scripts/5392-waitforkeyelements/code/WaitForKeyElements.js
// @grant        none
// ==/UserScript==
/*jshint esversion: 8 */

(function() {
    // SETTINGS
    var settings = {
        hr12: false, // Show times in 12hr format
        displayLikesReceived: true, // Display likes received counter
        updateInterval: 10, // Interval (minutes) for fetching summary page data
        lifetimePurple: false, // Set to true for purple info bubbles
    };

    // Global variable
    var LC = {
        lastUpdate: 0,
        likes: [],
        likesGiven: 0,
        maxGiven: 0,
        maxLikes: 0,
        likesReceived: [],
        ranOut: 0,
        ranOutDate: Date.now(),
        fullLikes: 0,
        fullLikesDate: Date.now(),
        daysVisited: 0,
    };

    // MAIN
    const msday = 1000*60*60*24; // Number of ms in a day
    var $ = window.$;
    init();

    // First run setup
    function init() {
        setInitialiseTriggers();
        addDisplay();
        initialise();
        timeLikes();
        setTimeout(updateDisplay, 1000*60);
        addCSS();
    }

    // Set triggers for when the page needs to be initialised again
    function setInitialiseTriggers() {
        // When loading the window
        window.addEventListener('load', initialise);
        // When using back and forth buttons
        window.addEventListener('popstate', initialise);
        // When navigating
        (function(history){
            var pushState = history.pushState;
            history.pushState = function(state) {
                initialise();
                return pushState.apply(history, arguments);
            };
        })(window.history);
    }

    // Set up the page for continued running
    function initialise() {
        fetchData();
        detectLikes();
    }

    // Fetches the needed data
    function fetchData() {
        updateLC();

        if (LC.lastUpdate < Date.now() - 1000*60*settings.updateInterval) {
            var username = $('#current-user a').attr('href').split('/u/')[1];
            var url = 'https://community.wanikani.com/u/'+username+'/summary';
            return $.ajax({
                url: url,
                type: 'GET',
                dataType: 'json',
                success: processData
            });
        }
    }

    // Updates the global variable with the new data
    function processData(data) {
        var likesGiven = data.user_summary.likes_given;
        if (likesGiven > LC.likesGiven && LC.lastUpdate != 0) registerLikes(likesGiven - LC.likesGiven);
        if (LC.likesGiven === 0) LC.likesGiven = likesGiven;
        //LC.likesGiven = likesGiven;

        var trustID = data.badges[0].id;
        LC.maxLikes = 50*(1+trustID);

        var likesReceived = data.user_summary.likes_received;
        LC.likesReceived.push([likesReceived, Date.now()]);

        LC.daysVisited = data.user_summary.days_visited;

        LC.lastUpdate = Date.now();
        save();
    }

    // Update the LC variable
    function updateLC() {
        var stored = JSON.parse(localStorage.getItem('WKFLC'));
        if (stored && stored.lastUpdate >= 1581692248858) Object.assign(LC, stored);
    }

    // Stores the data in localStorage so other tabs can access it
    function save() {
        localStorage.setItem('WKFLC', JSON.stringify(LC));
    }

    // Adds the bubbles to the header
    function addDisplay() {
        // START code by rfindley
        if (is_dark_theme()) {
            $('body').attr('theme','dark');
        } else {
            $('body').attr('theme','light');
        }
        var wk_app_nav = $('.wanikani-app-nav').closest('.container');
        if (wk_app_nav.length === 0) {
            setTimeout(addDisplay, 200);
            return;
        }
        // Attach the Dashboard menu to the stay-on-top menu.
        var top_menu = $('.d-header');
        var main_content = $('#main-outlet');
        $('body').addClass('float_wkappnav');
        wk_app_nav.addClass('wanikani-app-nav-container');
        top_menu.find('>.wrap > .contents:eq(0)').after(wk_app_nav);
        // Adjust the main content's top padding, so it won't be hidden under the new taller top menu.
        var main_content_toppad = Number(main_content.css('padding-top').match(/[0-9]*/)[0]);
        main_content.css('padding-top', (main_content_toppad + 25) + 'px');
        // Insert CSS.
        var css =
            '.float_wkappnav .d-header {height:inherit;}'+
            '.float_wkappnav .d-header .title {height:4em;}'+
            '.float_wkappnav .wanikani-app-nav-container {border-top:1px solid #ccc; line-height:2em;}'+
            '.float_wkappnav .wanikani-app-nav ul {padding-bottom:0; margin-bottom:0; border-bottom:inherit;}'+
            '.dashboard_bubble {color:#fff; background-color:#bdbdbd; font-size:0.8em; border-radius:0.5em; padding:0 6px; margin:0 0 0 4px; font-weight:bold;}'+
            'li[data-highlight="true"] .dashboard_bubble {background-color:#6cf;}'+
            'body[theme="dark"] .dashboard_bubble {color:#ddd; background-color:#646464;}'+
            'body[theme="dark"] li[data-highlight="true"] .dashboard_bubble {color:#000; background-color:#6cf;}'+
            'body[theme="dark"] .wanikani-app-nav[data-highlight-labels="true"] li[data-highlight="true"] a {color:#6cf;}'+
            'body[theme="dark"] .wanikani-app-nav ul li a {color:#999;}';
        $('head').append('<style type="text/css">'+css+'</style>');
        // END code by rfindley
        if (settings.displayLikesReceived) {
            $('.wanikani-app-nav ul').append('<li data-highlight="false">Likes Received<span id="likes_received" class="dashboard_bubble">0</span></li>');
        }
        $('.wanikani-app-nav ul').append('<li data-highlight="false">Likes Left<span id="likes_left" class="dashboard_bubble">0</span></li>');
        $('.wanikani-app-nav ul').append('<li data-highlight="false">Next Like<span id="next_like" class="dashboard_bubble">0</span></li>');
        updateDisplay();
    }

    // Function made by rfindley
    function is_dark_theme() {
        // Grab the <html> background color, average the RGB.  If less than 50% bright, it's dark theme.
        return $('html').css('background-color').match(/\((.*)\)/)[1].split(',').slice(0,3).map(str => Number(str)).reduce((a, i) => a+i)/(255*3) < 0.5;
    }

    // Updates the display with the current numbers
    async function updateDisplay() {
        await fetchData();
        updateLC();
        pruneLikes();
        if (LC.likes.length > LC.maxGiven) LC.maxGiven = LC.likes.length;
        save();

        var likesLeft = LC.maxLikes - LC.likes.length;
        var likesLeftDisplay = (likesLeft < 0 ? 0 : likesLeft);
        var nextLike = timeLeft(LC.likes[0]+msday);
        var first = LC.likesReceived[0];
        var last = LC.likesReceived[LC.likesReceived.length-1];
        var likesReceived = [(first?first:[0])[0], (last?last:[0])[0]]; // Total received yesterday and today
        var receivedToday = likesReceived[1] - likesReceived[0];
        var receivedTooltip = receivedToday + ' likes received in past day\n' + comma(likesReceived[1]) + ' total likes received';
        var nextHour = findNext(msday/24);
        var nextHourTooltip = nextHour + ' likes in next hour\nNext like at ' + parseTime(LC.likes[0]);
        var dailyAverage = likesReceived[1]/LC.daysVisited;
        var ranOutTooltip = LC.ranOut + ' times have you ran out\n' + ((Date.now()-LC.ranOutDate)/msday).toFixed(0) +
            ' days since you ran out\n';
        if (LC.ranOut == 0) ranOutTooltip = LC.maxGiven + ' likes most given in a day\n';
        var likesLeftTooltip = dailyAverage.toFixed(0)+' likes given per day on average\n' + comma(LC.likesGiven) + ' total likes given \n\n' + ranOutTooltip + LC.fullLikes + ' times have you had full likes';

        if ($('#likes_left').length) {
            if (settings.displayLikesReceived) {
                toggleHighlight($('#likes_received'), receivedToday != 0);
                $('#likes_received')[0].innerHTML = receivedToday;
                $('#likes_received').closest('li').attr('title', receivedTooltip);
                $('#likes_received').closest('li').attr('data-name', "likes-received");
            }
            $('#likes_left')[0].innerHTML = likesLeftDisplay;
            $('#next_like')[0].innerHTML = nextLike;
            toggleHighlight($('#likes_left'), likesLeft != 0);
            toggleHighlight($('#next_like'), nextLike != 'N/A');
            $('#next_like').closest('li').attr('title', nextHourTooltip);
            $('#next_like').closest('li').attr('data-name', "likes-next");
            $('#likes_left').closest('li').attr('title', likesLeftTooltip);
            $('#likes_left').closest('li').attr('data-name', "likes-left");
        }
    }

    // Deletes any likes older than 24 hours
    function pruneLikes() {
        $(LC.likes).each((i, time)=>{
            if (time < Date.now() - msday) LC.likes.splice(0, 1);
            else return false;
        });
        $(LC.likesReceived).each((i, entry)=>{
            if (entry[1] < Date.now() - msday) LC.likesReceived.splice(0, 1);
            else return false;
        });
    }

    // Toggles whether the info bubbles should be coloured or grey
    function toggleHighlight(e, on) {
        e.closest('li').attr('data-highlight', on);
        e.toggleClass('zero', on);
    }

    // Set a timer for each like so that they can count down the seconds
    function timeLikes() {
        for (var i=0; i<LC.likes.length; i++) timeLike(LC.likes[i]);
    }

    // Sets a timer for one like to count down its last seconds
    function timeLike(time) {
        var timestamp = time+msday-1000*60;
        var timeLeft = timestamp - Date.now();
        if (timeLeft < 0) timeLeft = 0;
        setTimeout(()=>{
            var s = Math.round((time+msday-Date.now())/1000);
            var interval = setInterval(()=>{
                var currentSeconds = $('#next_like')[0].innerHTML.match(/^\d{1,2}s$/);
                if (!currentSeconds || currentSeconds[0].slice(0, -1) > s) {
                    $('#next_like')[0].innerHTML = s+'s';
                    if (s<=0) {
                        clearInterval(interval);
                        updateDisplay();
                    }
                }
                s--;
            }, 1000);
        }, timeLeft);
    }

    // Sets up detection of new likes
    function detectLikes() {
        waitForKeyElements('#topic-bottom', ()=>{
            $('.post-stream').on('click', '.toggle-like:not(.has-like)', (event)=>{
                registerLikes(1);
                // Check whether the like went through and if it didn't remove the registered like.
                let post_id = event.target.closest('article').getAttribute('data-post-id');
                let url = window.location.href;
                setTimeout(()=>{
                    $.ajax({
                        url: url,
                        type: 'GET',
                        dataType: 'json',
                        success: (data)=>{
                            for (let post of data.post_stream.posts) {
                                if (post.id == post_id) {
                                    for (let action of post.actions_summary) {
                                        if (action.id === 2) {
                                            if (!action.acted) registerLikes(-1);
                                            break;
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                    });
                }, 1000);
                updateDisplay();
            });
            $('.post-stream').on('click', '.toggle-like.has-like', (event)=>{
                registerLikes(-1);
            });
        });
    }

    // Registers new likes used
    function registerLikes(count) {
        updateLC();
        if (LC.likes.length == 0 && LC.fullLikesDate < Date.now() - msday) {
            LC.fullLikes++;
            LC.fullLikesDate = Date.now();
        }
        LC.likesGiven += count;
        if (count == -1) LC.likes.pop();
        else {
            for (var i=0; i<count; i++) {
                LC.likes.push(Date.now());
                timeLike(Date.now());
            }
        }
        if (LC.likes.length >= LC.maxLikes && LC.ranOutDate < Date.now() - msday) {
            LC.ranOut++;
            LC.ranOutDate = Date.now();
        }
        save();
        updateDisplay();
    }

    // Returns a string with the time remaining until the given date
    function timeLeft(date) {
        if (!date) return 'N/A';
        var seconds = (date - Date.now())/1000;
        var s = Math.floor(seconds % 3600 % 60);
        var sr = Math.round(seconds % 3600 % 60);
        var m = Math.floor((seconds-s)/60%60);
        var mr = Math.round((seconds-s)/60%60);
        var h = Math.floor((seconds-s-m*60)/3600);
        var hr = Math.round((seconds-s-m*60)/3600);
        if (h != 0) return hr + 'h';
        if (m != 0) return mr + 'm';
        if (s != 0) return sr + 's';
    }

    // Finds the number of likes expiring in the next interval of time
    function findNext(interval) {
        var count = 0;
        for (var i=0; i<LC.likes.length; i++) {
            if (LC.likes[i] + msday < Date.now() + interval) count++;
        }
        return count;
    }

    // Adds the CSS
    function addCSS() {
        let bubbleColor = settings.lifetimePurple ? 'rgb(213, 128, 255)' : '#6cf';
        $('head').append('<style id=like_counter>'+
                         '    .wanikani-app-nav ul li {color: #545454;}'+
                         '    body[theme="dark"] .wanikani-app-nav ul li {color:#999;}'+
                         '    li[data-highlight="true"] span.dashboard_bubble {background-color: '+bubbleColor+' !important;}'+
                         '    .wanikani-app-nav > ul {display: flex;}'+
                         '    .wanikani-app-nav li[data-name="likes-received"] {order: 1;}'+
                         '    .wanikani-app-nav li[data-name="likes-left"] {order: 2;}'+
                         '    .wanikani-app-nav li[data-name="likes-next"] {order: 3;}'+
                         '    .wanikani-app-nav li[data-name="lesson_count"],'+
                         '    .wanikani-app-nav li[data-name="review_count"],'+
                         '    .wanikani-app-nav li[data-name="next_review"] {order: 0;}'+
                         '</style>'
                        );
    }

    // Creates a timestamp for the given time
    function parseTime(date) {
        if (!date) return 'N/A';
        var time = new Date(date);
        var h = time.getHours();
        var m = time.getMinutes();
        var AmPm = '';
        if (settings.hr12) {
            AmPm = ' AM';
            if (h > 11) {
                AmPm = ' PM';
                if (h != 12) h -= 12;
            }
            else if (h == 0) h = 12;
        }
        else if (h < 10) h = '0' + h;
        if (m < 10) m = '0' + m;
        return h+':'+m+AmPm;
    }

    // Adds commas to a number
    function comma(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
})();
