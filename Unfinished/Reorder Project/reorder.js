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
        //delete wkof.settings[script_id];
        //wkof.Settings.save(script_id);
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
        return wkof.Settings.load(script_id, defaults).then(settings=>{
            settings.presets = [
                {name: 'Test 1', actions: [
                    {name: 'Action 1', invert: false, sort: 'Level', filter: 'None', filter_value: ''},
                ],},
                {name: 'Test 2', actions: [
                    {name: 'Action 1', invert: false, sort: 'None', filter: 'Level', filter_value: ''},
                    {name: 'Action 2', invert: false, sort: 'None', filter: 'None', filter_value: ''},
                ],},
                {name: 'Test 3', actions: [
                    {name: 'Action 1', invert: false, sort: 'None', filter: 'None', filter_value: ''},
                    {name: 'Action 2', invert: false, sort: 'None', filter: 'None', filter_value: ''},
                    {name: 'Action 3', invert: false, sort: 'None', filter: 'None', filter_value: ''},
                ],},
                {name: 'Test 4', actions: [
                    {name: 'Action 1', invert: false, sort: 'None', filter: 'None', filter_value: ''},
                    {name: 'Action 2', invert: false, sort: 'None', filter: 'None', filter_value: ''},
                    {name: 'Action 3', invert: false, sort: 'None', filter: 'None', filter_value: ''},
                    {name: 'Action 4', invert: false, sort: 'None', filter: 'None', filter_value: ''},
                ],},
            ];
        });
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
            pre_open: settings_pre_open,
            on_save: settings_on_save,
            content: {
                general: {type: 'page', label: 'General', content: {
                    active: {type: 'dropdown', label: 'Active preset', content: {},},
                    prioritize: {type: 'dropdown', label: 'Prioritize', default: 'reading', content: {none: 'None', reading: 'Reading', meaning: 'Meaning'},},
                    srs: {type: 'checkbox', label: 'SRS breakdown', default: true,},
                    bxb: {type: 'checkbox', label: 'Active preset', default: true,},
                    streak: {type: 'checkbox', label: 'Streak counter', default: true,},
                    aq: {type: 'number', label: 'Active preset', default: 10,},
                },},
                presets: {type: 'page', label: 'Edit Presets', content: {
                    presets: {type: 'group', label: 'Presets', content: {
                        buttons: {type: 'html', html: '<div class="presets"><div class="preset-buttons"><button class="new">New</button><button class="up">UP</button><button class="down">DOWN</button><button class="delete">Delete</button></div><div class="preset-right"><select class="presets" size="4"></select></div></div>'},
                        divider: {type: 'divider'},
                        section: {type: 'section', label: 'Preset settings'},
                        name: {type: 'html', html: '<div class="name"><span>Preset name</span><input class="preset-name" placeholder="Preset name"></input></div>'},
                        actions: {type: 'group', label: 'Actions', content: {
                            actions: {type: 'html', html: '<div class="presets actions"><div class="preset-buttons"><button class="new">New</button><button class="up">UP</button><button class="down">DOWN</button><button class="delete">Delete</button></div><div class="preset-right"><select class="actions" size="4"></select></div></div>'},
                            divider: {type: 'divider'},
                            section: {type: 'section', label: 'Action settings'},
                            name: {type: 'html', html: '<div class="name"><span>Action name</span><input class="action-name" placeholder="Action name"></input></div>'},
                            invert: {type: 'html', html: '<div class="invert"><span>Invert action</span><input type="checkbox"></input></div>'},
                            sort: {type: 'html', html: '<div class="sort"><span>Sort</span><select class="sort">'+
                                                            '<option name="None">None</option>'+
                                                            '<option name="Type">Type</option>'+
                                                            '<option name="Level">Level</option>'+
                                                            '<option name="SRS">SRS</option>'+
                                                            '<option name="Overdue">Overdue</option>'+
                                                            '<option name="Random">Random</option>'+
                                                            '</select></div>'},
                            filter: {type: 'html', html: '<div class="filter"><span>Filter</span><select class="filter">'+
                                                            '<option name="None">None</option>'+
                                                            '<option name="Type">Type</option>'+
                                                            '<option name="Level">Level</option>'+
                                                            '<option name="SRS">SRS</option>'+
                                                            '<option name="Overdue">Overdue</option>'+
                                                            '<option name="First">First</option>'+
                                                            '</select>'+
                                                            '<input class="filter-value" placeholder=""></input></div>'},
                        },},
                },},
            },},
        },
        };
        let dialog = new wkof.Settings(config);
        dialog.open();
    }

    function settings_on_save(settings) {
        settings.presets = document.getElementById('wkofs_reorder_general').presets;
    }

    function settings_pre_open(d) {
        console.log(d);
        console.log(wkof.settings[script_id].presets);
        let presets = wkof.settings[script_id].presets.slice();
        console.log('d', d);
        d[0].presets = presets; // For retrieval by saving function
        let presets_elem = d[0].querySelector('#reorder_general_presets .preset-right select');
        let actions_elem = d[0].querySelector('#reorder_general_actions .preset-right select');
        let preset_name = d[0].querySelector('#reorder_general_presets .name input');
        let action_name = d[0].querySelector('#reorder_general_actions .name input');
        let action_invert = d[0].querySelector('#reorder_general_actions .invert input');
        let action_sort = d[0].querySelector('#reorder_general_actions .sort select');
        let action_filter = d[0].querySelector('#reorder_general_actions .filter select');
        let action_filter_value = d[0].querySelector('#reorder_general_actions .filter input');
        let presets_group = d[0].querySelector('#reorder_general_presets');
        // Populate presets
        let options = "";
        for (let preset of presets) options += `<option name="${preset.name}">${preset.name}</option>`;
        presets_elem.innerHTML = options;
        // Update settings on change
        let active_selections = [presets[0].name, presets[0].actions[0].name]; // Preset name, action name
        presets_group.addEventListener('change', e=>{
            console.log('test', e);
            // Selected preset changed
            if (e.target.classList.contains('presets')) {
                let preset = presets.find(i=>i.name==e.target.value);
                preset_name.value = preset.name; // Update preset name
                let actions = "";
                for (let action of preset.actions) actions += `<option name="${action.name}">${action.name}</option>`;
                actions_elem.innerHTML = actions; // Update actions list
                actions_elem.value = active_selections[1]; // Select action
                fire_event(actions_elem, 'change'); // Fire change event for actions
            }
            else if (e.target.classList.contains('preset-name')) {
                let option = presets_elem.querySelector(`option[name="${presets_elem.value}"]`);
                presets.find(p=>p.name==presets_elem.value).name = e.target.value;
                option.setAttribute('name', e.target.value);
                option.innerText = e.target.value;
            }
            else if (e.target.classList.contains('actions')) {
                let action = presets.find(p=>p.name==presets_elem.value).actions.find(a=>a.name==e.target.value);
                action_name.value = action.name;
                action_invert.checked = action.invert;
                action_sort.value = action.sort;
                action_filter.value = action.filter;
                action_filter_value.value = action.filter_value;
                action_sort.disabled = action.filter != "None";
                action_filter.disabled = action.sort != "None";
                if (action_filter.disabled) action_filter.classList.add('none');
            }
            else if (e.target.classList.contains('action-name')) {
                let option = actions_elem.querySelector(`option[name="${actions_elem.value}"]`);
                presets.find(p=>p.name==presets_elem.value).actions.find(a=>a.name==actions_elem.value).name = e.target.value;
                option.setAttribute('name', e.target.value);
                option.innerText = e.target.value;
            }
            else if (e.target.classList.contains('invert')) {
                let action = presets.find(p=>p.name==presets_elem.value).actions.find(a=>a.name==actions_elem.value);
                action.invert = action_invert.checked;
            }
            else if (e.target.classList.contains('sort')) {
                let action = presets.find(p=>p.name==presets_elem.value).actions.find(a=>a.name==actions_elem.value);
                action.sort = action_sort.value;
                action_filter.disabled = action.sort != "None";
            }
            else if (e.target.classList.contains('filter')) {
                let action = presets.find(p=>p.name==presets_elem.value).actions.find(a=>a.name==actions_elem.value);
                action.filter = action_filter.value;
                action_sort.disabled = action.filter != "None";
                if (action.filter != "None") action_filter.classList.remove('none');
                else action_filter.classList.add('none');
                action_filter_value.value = "";
            }
            else if (e.target.classList.contains('filter-value')) {
                let action = presets.find(p=>p.name==presets_elem.value).actions.find(a=>a.name==actions_elem.value);
                action.filter_value = e.target.value;
            }
        });
        // Select first option by default
        presets_elem.value = presets[0].name;
        fire_event(presets_elem, 'change');
        // Add function to buttons
        console.log(presets);
        d[0].addEventListener('click', e=>{
            console.log('test', e);
            if (e.target.nodeName !== "BUTTON") return;
            let select = e.target.parentElement.nextElementSibling.children[0];
            let option = select.querySelector(`option[name="${select.value}"]`);
            let type = (e.target.parentElement.parentElement.classList.contains('actions') ? 'presets' : 'action');
            let list = (type == 'actions' ? presets.find(p=>p.name==presets_elem.value).actions : presets);
            console.log(list);
            let item = list.find(l=>l.name==select.value);
            console.log(item);
            let i;
            let new_item = (type == 'actions' ? {name: 'New action', invert: false, sort: 'Level', filter: 'None', filter_value: ''} : {name: 'New preset', actions: [{name: 'New action', invert: false, sort: 'Level', filter: 'None', filter_value: ''},],});
            switch (e.target.className) {
                case 'new':
                    select.insertAdjacentHTML('beforeend', '<option name="New preset">New preset</option>');
                    list.append(new_item);
                    break;
                case 'up':
                    option.previousElementSibling.insertAdjacentElement('beforebegin', option);
                    i = list.indexOf(item);
                    console.log(i);
                    list[i] = list[i-1];
                    list[i-1] = item;
                    break;
                case 'down':
                    option.nextElementSibling.insertAdjacentElement('afterend', option);
                    i = list.indexOf(item);
                    console.log(i);
                    list[i] = list[i+1];
                    list[i+1] = item;
                    break;
                case 'delete':
                    option.remove();
                    list.splice(list.indexOf(item), 1);
                    break;
            }
        });
    }

    function fire_event(elem, event) {
        let e = document.createEvent('HTMLEvents');
        e.initEvent(event, true, true); // Type, bubbling, cancelable
        return !elem.dispatchEvent(e);
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
