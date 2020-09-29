// ==UserScript==
// @name         Wanikani: Kumi Reorder General
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Reorders n stuff
// @author       Kumirei
// @include      /^https://(www|preview).wanikani.com/(lesson|review)/session/
// @grant        none
// ==/UserScript==
/*jshint esversion: 8 */

(function(wkof, $) {
    /* eslint no-multi-spaces: "off" */

    /* FEATURES
    O Sort by type
    O Sort by level
    O Sort by overdue
    O Sort by srs
    O Set number of items
    O Shuffle
    O Prioritize sorts
    O Display srs counts
    O 1x1
    O Reading/meaning first
    Critical first
    ARBITRARY REORDERING???
    Presets
    Custom active queue size
    */
    let script_name = "Wanikani: Kumi Reorder General";
    let script_title = "Reorder General";
    let script_id = "reorder_general";
    let srs_intervals = [4, 8, 23, 47, 167, 335, 719, 2879];
    let truncated = [];

    // Make sure WKOF is installed
    if (!wkof) {
        let response = confirm(script_name+' requires WaniKani Open Framework.\n Click "OK" to be forwarded to installation instructions.');
        if (response) {
            window.location.href = 'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549';
        }
        return;
    }
    wkof.include('Menu,Settings,ItemData');
    wkof.ready('Menu,Settings,ItemData')
        .then(load_settings)
        .then(install_menu)
        .then(install_css)
        .then(install_srs_count)
        .then(install_reorder)
        .then(install_back2back)
        .then(install_priority)
        .then(prepare_data)
        .then(start);

    // Load WKOF settings
    function load_settings() {
        delete wkof.settings[script_id];
        wkof.Settings.save(script_id);
        let defaults = {
            sort: {
                type: {
                    active: false,
                    order: ["rad", "kan", "voc"],
                },
                level: {
                    active: true,
                    order: 0,
                },
                srs: {
                    active: false,
                    order: 0,
                },
                overdue: {
                    active: false,
                    order: 0,
                },
            },
            prioritize: {
                card: {
                    active: true,
                    card: "reading",
                },
                sort: {
                    active: false,
                    order: ["type", "level", "srs", "overdue"],
                },
            },
            other: {
                back2back: true,
                srs_breakdown: true,
                max_reviews: 100,
                max_lessons: 10,
                critical_first: false,
            },
        };
        return wkof.Settings.load(script_id, defaults);
    }

    // Installs the options button in the menu
    function install_menu() {
        let config = {
            name: script_id,
            submenu: 'Settings',
            title: script_title,
            on_click: open_settings
        };
        wkof.Menu.insert_script_link(config);
    }

    function open_settings() {
        var config = {
            script_id: script_id,
            title: script_title,
            content: {
                preset: {
                    type: 'group',
                    label: 'Actions',
                    content: {
                        actions: {
                            type: 'list',
                            content: {},
                        },
                    },
                },
                action: {
                    type: 'group',
                    label: 'Action',
                    content: {
                        name: {
                            type: 'text',
                            label: 'Name',
                        },
                        type: {
                            type: 'list',
                            label: 'Type of action',
                            default: 'filter',
                            content: {filter: 'Filter', reorder: 'Reorder', truncate: 'Truncate'},
                        },
                        filters: {
                            type: 'group',
                            label: 'Filters',
                            content: {
                                type: {
                                    type: 'checkbox',
                                    label: 'Type',
                                    default: false,
                                },
                                level: {
                                    type: 'checkbox',
                                    label: 'Type',
                                    default: false,
                                },
                                srs: {
                                    type: 'checkbox',
                                    label: 'Type',
                                    default: false,
                                },
                                overdue: {
                                    type: 'checkbox',
                                    label: 'Type',
                                    default: false,
                                },
                            },
                        },
                        reorder: {
                            type: 'group',
                            label: 'Sorting',
                            content: {
                                type: {
                                    type: 'checkbox',
                                    label: 'Type',
                                    default: false,
                                },
                            },
                        },
                        truncate: {
                            type: 'group',
                            label: 'Truncate',
                            content: {
                                type: {
                                    type: 'number',
                                    label: 'First x items',
                                    default: 0,
                                },
                            },
                        },
                    },
                },
            },
        };
        let dialog = new wkof.Settings(config);
        dialog.open();
    }

    // Install CSS
    function install_css() {
        let css = `<style id="${script_id+'CSS'}">
#srs_breakdown {
    font-weight: bold;
}
#srs_breakdown.hidden {display: none;}
#wkofs_reorder_general #reorder_general_action > .row:nth-child(-n+3) > div {width: auto; min-width: 90px;}
</style>`;
        document.getElementsByTagName('head')[0].insertAdjacentHTML('beforeend', css);
    }

    // Install SRS count element
    function install_srs_count() {
        let elem = '<div id="srs_breakdown" class="'+(wkof.settings[script_id].other.srs_breakdown?'':'hidden')+'"></div>';
        document.getElementById('stats').insertAdjacentHTML('beforeend', elem);
        $.jStorage.listenKeyChange('currentItem', update_srs_count);
    }

    // Updates the SRS count
    function update_srs_count() {
        let items = get_queue();
        let counts = new Array(9).fill(0);
        items.forEach(item=>{counts[item.srs]++;});
        let text = `[${counts.slice(1, 5).join(', ')}][${counts.slice(5,7).join(', ')}][${counts[7]}][${counts[8]}]`;
        document.getElementById('srs_breakdown').innerHTML = text;
    }

    // Retrieves the current review queue
    function get_queue() {
        return [...$.jStorage.get('activeQueue'), ...$.jStorage.get('reviewQueue')];
    }

    // Installs the main interface
    function install_reorder() {
    }

    // Prepares the data
    async function prepare_data() {
        let item_data = await fetch_item_data();
        let items = get_queue();
        inject_data(items, item_data);
        inject_sort_indices(items);
        return items;
    }

    // Startup
    function start(items) {
        run(items);
    }

    // Create new queue from all reviews
    function new_queue() {
        let items = [...get_queue(), ...truncated];
        run(items);
    }

    // Create new queue
    function run(items) {
        sort(items);
        critical_first(items);
        truncate(items);
        shuffle(items);
        $.jStorage.set('reviewQueue', items.slice(10));
        $.jStorage.set('activeQueue', items.slice(0, 10));
        $.jStorage.set('currentItem', items[0]);
    }

    // Fetch item data from WKOF
    function fetch_item_data() {
        return wkof.ItemData.get_items('assignments').then(items=>{
            let registry = {};
            items.forEach(item=>{
                if (!item.assignments) return;
                registry[item.id] = {
                    level: item.data.level,
                    UID: item.object[0].toLowerCase()+item.id,
                    available_at: item.assignments.available_at,
                };
            });
            return registry;
        });
    }

    // Combines the two objects
    function inject_data(items, item_data) {
        items.forEach(item=>{for (let key in item_data[item.id]) item[key] = item_data[item.id][key];});
    }

    // Calculates sorting indices and stores the data in the items
    function inject_sort_indices(items) {
        items.forEach(item=>{
            let o = wkof.settings[script_id].sort.type.order;
            let order = {r: o.indexOf('rad'), k: o.indexOf('kan'), v: o.indexOf('voc')};
            item.type = order[item.UID[0]];
            item.overdue = calculate_overdue(item);
        });
    }

    // Calculates how overdue an item is
    function calculate_overdue(item) {
        return (Date.now()-Date.parse(item.available_at))/(1000*60*60)/srs_intervals[item.srs];
    }


    // Sort the itmes
    function sort(items) {
        for (let i=wkof.settings[script_id].prioritize.sort.order.length-1; i>=0; i--) {
            let sort_key = wkof.settings[script_id].prioritize.sort.order[i];
            if (!wkof.settings[script_id].sort[sort_key].active) continue;
            items.sort((a,b)=>(a[sort_key] > b[sort_key])?1:-1);
        }
    }

    // Set up prioritisation of reading or meaning
    function install_priority() {
        $.jStorage.listenKeyChange('currentItem', prioritize);
    }

    // Prioritize reading or meaning
    function prioritize() {
        if (!wkof.settings[script_id].prioritize.card.active) return;
        let prio = wkof.settings[script_id].prioritize.card.card;
        let item = $.jStorage.get('currentItem');
        if (!item.UID || item.rad || $.jStorage.get('questionType') == prio) return;
        let done = $.jStorage.get(item.UID);
        if (!done || !done[prio=="reading"?"rc":"mc"]) {
            $.jStorage.set('questionType', prio);
            $.jStorage.set('currentItem', item);
        }
    }

    // back to back reviews
    function install_back2back() {
        let old_random = Math.random;
        let new_random = function(){
            let re = /https:\/\/cdn.wanikani.com\/assets\/v03\/review\//;
            let match = re.exec(new Error().stack);
            if (match && wkof.settings[script_id].other.back2back) return 0;
            return old_random();
        };
        Math.random = new_random;
    }

    // Shuffle
    function shuffle(items) {
        let shuffled = items.map(a=>[Math.random(), a]).sort((a,b)=>(a[0]>b[0])?1:-1).map(a=>a[1]);
        for (let i=0; i<items.length; i++) items[i] = shuffled[i];
    }

    // Sets a fixed number of items in queue
    function truncate(items) {
        truncated = items.splice(wkof.settings[script_id].other.max_reviews);
    }

    // Brings critical items to front
    function critical_first(items) {
        if (!wkof.settings[script_id].other.critical_first) return;
        items.sort((a,b)=>((!a.voc && a.level==wkof.user.level) && (b.voc || b.level!=wkof.user.level))?-1:1);
    }
})(window.wkof, window.jQuery);
