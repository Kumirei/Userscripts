// ==UserScript==
// @name         Wanikani Open Framework: Visually similar kanji filter
// @namespace    http://tampermonkey.net/
// @version      1.1.2
// @description  Adds a wkof filter for visually similar kanji
// @author       Kumirei
// @include      https://www.wanikani.com/*
// @include      *preview.wanikani.com*
// @grant        none
// ==/UserScript==
/*jshint esversion: 8 */

(function(wkof, $) {
    if (!wkof) return;

    var kanji_list = {};

    // Install menu
    wkof.include('Menu,Settings');
    wkof.ready('Menu,Settings')
    .then(load_settings)
    .then(install_menu)
    .then(get_data)
    .then(register_filter);

    async function get_data() {
        let data = await $.get('https://raw.githubusercontent.com/mwil/wanikani-userscripts/master/wanikani-similar-kanji/db/stroke_edit_dist_esc.json');
        return JSON.parse(data);
    }

    // Adds the filter to wkof
    function register_filter(data) {
        for (var key in wkof.settings.wanikani_visually_similar_filter.kanji_list) kanji_list[key] = key;
        wkof.ready('ItemData.registry').then(()=>{
            wkof.ItemData.registry.sources.wk_items.filters.include_visually_similar_kanji = {
                filter_func: function(filter_value, item){if (item.object != "kanji") return true; item.visually_similar_kanji = data[item.data.characters]; return true;}
            };
            wkof.ItemData.registry.sources.wk_items.filters.visually_similar_kanji = {
                type: 'multi',
                label: 'Visually similar kanji',
                hover_tip: 'Select the kanji whose similar kanji you want to study',
                content: kanji_list,
                filter_func: function(filter_value, item){
                    var similar_kanji = "";
                    for (var char in filter_value) {
                        if (filter_value[char]) {
                            for (var i=0; i<10; i++) {
                                if (data[char] && data[char][i]) similar_kanji += data[char][i].kan;
                            }
                        }
                    }
                    if (item.object == 'kanji' && similar_kanji.includes(item.data.characters)) return true;
                    return false;
                }
            };
            wkof.set_state('wkof.Kumirei.VSKFilter', 'ready');
        });
    }

    // Load stored settings or set defaults
    function load_settings() {
        var resolve, promise = new Promise((res, rej)=>{resolve = res;});
        wkof.Settings.load('wanikani_visually_similar_filter').then(()=>{resolve();});
        return promise;
    }

    // Installs the options button in the menu
    function install_menu() {
        var config = {
            name: 'wanikani_visually_similar_filter',
            submenu: 'Settings',
            title: 'Visually Similar Filter',
            on_click: open_settings
        };
        wkof.Menu.insert_script_link(config);
    }

    // Creates the options
    function open_settings(items) {
        for (var key in wkof.settings.wanikani_visually_similar_filter.kanji_list) kanji_list[key] = key;
        var config = {
            script_id: 'wanikani_visually_similar_filter',
            title: 'Visually Similar Filter',
            on_save: function(){window.location.reload(false);},
            content: {
                kanji_input: {
                    type: 'input',
                    label: 'Kanji input',
                    hover_tip: 'Type in a kanji and click the add button to add the kanji to the list'
                },
                add_button: {
                    type: 'button',
                    label: 'Add kanji to list',
                    text: 'Add',
                    hover_tip: 'Click this button to add the input above to the list of kanji below',
                    on_click: function(name, config, on_change){
                        var val = wkof.settings.wanikani_visually_similar_filter.kanji_input;
                        var matches = val.match(/[\u3005-\u9F8D]/g);
                        for (var key in matches) {
                            if (!(matches[key] in kanji_list)) {
                                kanji_list[matches[key]] = false;
                                wkof.settings.wanikani_visually_similar_filter.kanji_list[matches[key]] = false;
                                $('#wanikani_visually_similar_filter_kanji_list').append('<option name="'+matches[key]+'">'+matches[key]+'</option>');
                            }
                        }
                        wkof.settings.wanikani_visually_similar_filter.kanji_input = "";
                        config.dialog.refresh();
                        config.dialog.save();
                    }
                },
                divider: {
                    type: 'divider'
                },
                kanji_list: {
                    type: 'list',
                    label: 'Kanji list',
                    multi: true,
                    hover_tip: 'List of kanji whose visually similar kanji you can choose to study with the self study script',
                    content: kanji_list
                },
                remove_button: {
                    type: 'button',
                    label: 'Remove selected kanji',
                    text: 'Remove',
                    hover_tip: 'Click this button to remove the above selected kanji from the list',
                    on_click: function(name, config, on_change){
                        var selected = wkof.settings.wanikani_visually_similar_filter.kanji_list;
                        for (var char in selected) {
                            if (selected[char]) {
                                $('#wanikani_visually_similar_filter_kanji_list option[name="'+char+'"]').remove();
                                delete selected[char];
                                delete kanji_list[char];
                            }
                        }
                        config.dialog.save();
                    }
                }
            }
        };

        var dialog = new wkof.Settings(config);
        config.content.add_button.dialog = dialog;
        config.content.remove_button.dialog = dialog;
        dialog.open();
    }

})(window.wkof, window.jQuery);
