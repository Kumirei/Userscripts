// ==UserScript==
// @name         Wanikani: Lesson Lock
// @namespace    http://tampermonkey.net/
// @version      1.0.4
// @description  Displays 0 lessons available when you have too much on your plate already
// @author       Kumirei
// @include      *wanikani.com*
// @exclude      *community.wanikani.com*
// @grant        none
// ==/UserScript==

(function(wkof, $) {
    // Check that the Wanikani Framework is installed
    var script_name = 'Lesson Lock';
    if (!window.wkof) {
        if (confirm(script_name+' requires Wanikani Open Framework.\nDo you want to be forwarded to the installation instructions?')) {
            window.location.href = 'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549';}
        return;
    }
    // If it's installed then do the stuffs
    else {
        wkof.include('Menu,Settings,ItemData');
        wkof.ready('Menu,Settings,ItemData')
            .then(load_settings)
            .then(install_menu)
            .then(get_counts)
            .then(lock);
    }

    // Fetches the subjects
    function get_counts() {
        var [promise, resolve] = new_promise();
        wkof.ItemData.get_items('subjects,assignments').then(function(items){
            var srs_counts = {};
            var by_srs = wkof.ItemData.get_index(items,'srs_stage');
            Object.keys(by_srs).forEach(function(srs_name) {
                srs_counts[srs_name] = by_srs[srs_name].length;
            });
            resolve(srs_counts);
        });
        return promise;
    }

    // Lock Lessons if score is above the threshold
    function lock(counts) {
        // Calculate score
        var s = wkof.settings.lesson_lock;
        var scores = [0, s.apprentice1, s.apprentice2, s.apprentice3, s.apprentice4, s.guru1, s.guru2, s.master, s.enlightened];
        var score = 0;
        for (var i=1; i<9; i++) if (counts[i]) score += counts[i] * scores[i];
        // Lock lessons
        if (score >= s.lock) {
            $('.navigation-shortcut--lessons span')[0].innerText = 0;
            $('.navigation-shortcut--lessons').attr('data-count', 0);
            $('.lessons-and-reviews__lessons-button span')[0].innerText = 0;
            $('.lessons-and-reviews__lessons-button')[0].className = 'lessons-and-reviews__button lessons-and-reviews__lessons-button lessons-and-reviews__lessons-button--0';
        }
        else if (s.display_lessons_left) {
            var available = $('.navigation-shortcut--lessons span')[0].innerText;
            var left = Math.ceil((s.lock - score)/s.apprentice1);
            if (available > left) $('.navigation-shortcut--lessons span')[0].innerText = left;
            if (available > left) $('.lessons-and-reviews__lessons-button span')[0].innerText = left;
        }
        // Display score
        if (s.display_as != "none") {
            var score_text;
            switch (s.display_as) {
                case 'score': score_text = Math.round(score); break;
                case 'score_and_max': score_text = Math.round(score) + ' of ' + s.lock; break;
                case 'percent': score_text = Math.round(score/s.lock*100) + '%'; break;
            }
            $('.navigation-shortcut--lessons').append('<div id="lock_score" style="text-align: center; font-size: 12px;">Score: '+score_text+'</div>');
            $('.lessons-and-reviews__lessons-button span').before('<div id="big_lock_score" style="font-size: 12px;left:50%;position:absolute;transform:translatex(-50%);bottom:16px;">Score: '+score_text+'</div>');
        }
    }

    // Load stored settings or set defaults
    function load_settings() {
        var defaults = {
            lock: 100,
            display_as: "score",
            display_lessons_left: false,
            apprentice1: 1,
            apprentice2: 1,
            apprentice3: 1,
            apprentice4: 1,
            guru1: 0,
            guru2: 0,
            master: 0,
            enlightened: 0
        };
        return wkof.Settings.load('lesson_lock', defaults);
    }

    // Installs the options button in the menu
    function install_menu() {
        var config = {
            name: 'lesson_lock',
            submenu: 'Settings',
            title: 'Lesson Lock',
            on_click: open_settings
        };
        wkof.Menu.insert_script_link(config);
    }

    // Create the options
    function open_settings(items) {
        var config = {
            script_id: 'lesson_lock',
            title: 'Lesson Lock',
            content: {
                general: {
                    type: 'group',
                    label: 'General',
                    content: {
                        lock: {
                            type: 'number',
                            label: 'Lock when score reaches',
                            hover_tip: 'Locks lessons when your total score is above this number',
                            default: 100
                        },
                        display_as: {
                            type: 'dropdown',
                            label: 'Display',
                            hover_tip: 'Choose how you want the score to be displayed',
                            content: {
                                none: 'None',
                                score: 'Current score',
                                score_and_max: 'Current score & lock score',
                                percent: 'Percentage of lock score'
                            },
                            default: 'score'
                        },
                        display_lessons_left: {
                            type: 'checkbox',
                            label: 'Display lessons left',
                            hover_tip: 'Display how many more lessons you can do before lessons are locked',
                            default: false
                        }
                    }
                },
                scores: {
                    type: 'group',
                    label: 'Score Per Item',
                    content: {
                        apprentice1: {
                            type: 'number',
                            label: 'Apprentice 1',
                            hover_tip: 'The score attributed to each apprentice 1 item',
                            default: 1
                        },
                        apprentice2: {
                            type: 'number',
                            label: 'Apprentice 2',
                            hover_tip: 'The score attributed to each apprentice 2 item',
                            default: 1
                        },
                        apprentice3: {
                            type: 'number',
                            label: 'Apprentice 3',
                            hover_tip: 'The score attributed to each apprentice 3 item',
                            default: 1
                        },
                        apprentice4: {
                            type: 'number',
                            label: 'Apprentice 4',
                            hover_tip: 'The score attributed to each apprentice 4 item',
                            default: 1
                        },
                        guru1: {
                            type: 'number',
                            label: 'Guru 1',
                            hover_tip: 'The score attributed to each guru 1 item',
                            default: 0
                        },
                        guru2: {
                            type: 'number',
                            label: 'Guru 2',
                            hover_tip: 'The score attributed to each guru 2 item',
                            default: 0
                        },
                        master: {
                            type: 'number',
                            label: 'Master',
                            hover_tip: 'The score attributed to each master item',
                            default: 0
                        },
                        enlightened: {
                            type: 'number',
                            label: 'Enlightened',
                            hover_tip: 'The score attributed to each enlightened item',
                            default: 0
                        }
                    }
                }
            }
        }
        var dialog = new wkof.Settings(config);
        dialog.open();
    }

    // Returns a promise and a resolve function
    function new_promise() {
        var resolve, promise = new Promise((res, rej)=>{resolve = res;});
        return [promise, resolve];
    }
})(window.wkof, window.jQuery);