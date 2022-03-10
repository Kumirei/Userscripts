"use strict";
// ==UserScript==
// @name         Wanikani: Omega Reorder
// @namespace    http://tampermonkey.net/
// @version      0.1.0
// @description  Reorders n stuff
// @author       Kumirei
// @include      /^https://(www|preview).wanikani.com/((dashboard)?|((review|extra_study)/session))/
// @grant        none
// ==/UserScript==
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
// Actual script
;
(function () { return __awaiter(void 0, void 0, void 0, function () {
    /* ------------------------------------------------------------------------------------*/
    // Overhead
    /* ------------------------------------------------------------------------------------*/
    function run() {
        return __awaiter(this, void 0, void 0, function () {
            var items;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: 
                    // Initiate WKOF
                    return [4 /*yield*/, confirm_wkof()];
                    case 1:
                        // Initiate WKOF
                        _a.sent();
                        wkof.include('Settings,Menu,ItemData');
                        return [4 /*yield*/, init_settings()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, wkof.ready('ItemData')
                            // Get items
                        ];
                    case 3:
                        _a.sent();
                        items = [];
                        if (!(page === 'extra_study')) return [3 /*break*/, 5];
                        return [4 /*yield*/, wkof.ItemData.get_items('assignments,review_statistics')
                            // Process
                        ];
                    case 4:
                        items = _a.sent();
                        _a.label = 5;
                    case 5:
                        // Process
                        processQueue(items);
                        return [2 /*return*/];
                }
            });
        });
    }
    function processQueue(items) {
        // Filter and sort
        var preset = settings.presets[settings.active_preset];
        if (!preset)
            return displayMessage('Invalid Preset'); // Active preset not defined
        var results = processPreset(preset, items);
        var final = results.final.concat(results.keep);
        if (!final.length)
            return displayMessage('No items in preset');
        console.log('items', final);
        // Load into queue
        transformAndUpdate(final);
    }
    function processPreset(preset, items) {
        var result = { keep: items, discard: [], final: [] };
        for (var _i = 0, _a = preset.actions; _i < _a.length; _i++) {
            var action = _a[_i];
            result = processAction(action, result);
        }
        return result;
    }
    function processAction(action, items) {
        console.log(action);
        console.log('Intermediary items', items.keep);
        switch (action.type) {
            case 'filter':
                var _a = process_filter(action, items.keep), keep = _a.keep, discard = _a.discard;
                return { keep: keep, discard: items.discard.concat(discard), final: items.final };
            case 'sort':
                return { keep: processSort(action, items.keep), discard: items.discard, final: items.final };
            case 'freeze & restore':
                return { keep: items.discard, discard: [], final: items.keep };
            case 'shuffle':
                return { keep: shuffle(items.keep), discard: items.discard, final: items.final };
            default:
                return items; // Invalid action type
        }
    }
    /* ------------------------------------------------------------------------------------*/
    // Filtering
    /* ------------------------------------------------------------------------------------*/
    function process_filter(action, items) {
        var filter = wkof.ItemData.registry.sources.wk_items.filters[action.filter];
        if (!filter)
            return { keep: items, discard: [] };
        var filter_value = filter.filter_value_map ? filter.filter_value_map(action.value) : action.value;
        var filter_func = function (item) { return filter.filter_func(filter_value, item); };
        return keepAndDiscard(items, filter_func);
    }
    /* ------------------------------------------------------------------------------------*/
    // Sorting
    /* ------------------------------------------------------------------------------------*/
    function processSort(action, items) {
        var sort;
        switch (action.sort) {
            case 'level':
                sort = function (a, b) { return numericalSort(a.data.level, b.data.level, action.order); };
                break;
            case 'type':
                var order_1 = parse_short_subject_type_string(action.order);
                sort = function (a, b) { return sortType(a.object, b.object, order_1); };
                break;
            case 'srs':
                sort = function (a, b) { var _a, _b, _c, _d; return numericalSort((_b = (_a = a.assignments) === null || _a === void 0 ? void 0 : _a.srs_stage) !== null && _b !== void 0 ? _b : -1, (_d = (_c = b.assignments) === null || _c === void 0 ? void 0 : _c.srs_stage) !== null && _d !== void 0 ? _d : -1, action.order); };
                break;
            case 'overdue':
                sort = function (a, b) { return numericalSort(calculateOverdue(a), calculateOverdue(b), action.order); };
                break;
            case 'critical':
                sort = function (a, b) { return numericalSort(+isCritical(a), +isCritical(b), action.order); };
                break;
            case 'leech':
                sort = function (a, b) { return numericalSort(calculateLeechScore(a), calculateLeechScore(b), action.order); };
                break;
            default:
                return []; // Invalid sort key
        }
        return doubleSort(items, sort);
    }
    function numericalSort(a, b, order) {
        if (order !== 'asc' && order !== 'desc')
            return 0;
        return a === b ? 0 : xor(order === 'asc', a > b) ? -1 : 1;
    }
    function sortType(a, b, order) {
        if (!order.length || a === b)
            return 0; // No order or same type
        if (a === order[0])
            return -1; // A is first type
        if (b === order[0])
            return 1; // B is first type
        return sortType(a, b, order.slice(1, 3)); // Yay, recursion
    }
    function calculateOverdue(item) {
        // Items without assignments or due dates, and burned items, are not overdue
        if (!item.assignments || !item.assignments.available_at || item.assignments.srs_stage == 9)
            return -1;
        var dueMsAgo = Date.now() - Date.parse(item.assignments.available_at);
        return dueMsAgo / SRS_DURATIONS[item.assignments.srs_stage - 1];
    }
    function isCritical(item) {
        var _a;
        return item.data.level == wkof.user.level && item.object !== 'vocabulary' && ((_a = item.assignments) === null || _a === void 0 ? void 0 : _a.passed_at) == null;
    }
    // Borrowed from Prouleau's Item Inspector script
    function calculateLeechScore(item) {
        if (!item.review_statistics)
            return 0;
        var stats = item.review_statistics;
        function leechScore(incorrect, streak) {
            return Math.round((incorrect / Math.pow(streak || 0.5, 1.5)) * 100) / 100;
        }
        var meaning_score = leechScore(stats.meaning_incorrect, stats.meaning_current_streak);
        var reading_score = leechScore(stats.reading_incorrect, stats.reading_current_streak);
        return Math.max(meaning_score, reading_score);
    }
    function displayLoading() {
        var callback = function () {
            var queue = $.jStorage.get(fullQueueKey);
            $.jStorage.set('questionType', 'meaning');
            if ('table' in queue) {
                // Since the url is invalid the queue will contain an error. We must wait
                // until the error is set until we can set our queue
                updateQueue([{ type: 'Vocabulary', voc: 'Loading...', id: 0 }]);
            }
            $.jStorage.stopListening(fullQueueKey, callback);
        };
        $.jStorage.listenKeyChange(fullQueueKey, callback);
    }
    function parse_short_subject_type_string(str) {
        var type_map = { rad: 'radical', kan: 'kanji', voc: 'vocabulary' };
        return str.split(',').map(function (type) { return type_map[type]; });
    }
    /* ------------------------------------------------------------------------------------*/
    // Polymorphic Utility Functions
    /* ------------------------------------------------------------------------------------*/
    function xor(a, b) {
        return (a && !b) || (!a && b);
    }
    // Sorting the array twice keeps the relative order of the sorted items. Example:
    // Original [8, 4, 5, 1, 7, 4, 5, 4, 6, 1].sort((a,b)=>a>5 ? -1 : 1)
    // Sorted   [6, 7, 8, 4, 5, 1, 4, 5, 4, 1].sort((a,b)=>a>5 ? -1 : 1)
    // Final    [8, 7, 6, 4, 5, 1, 4, 5, 4, 1]
    // This is important when chaining multiple sorting actions, so that the results of
    // one sort don't get reversed (front to back) by the next sort
    function doubleSort(items, sorter) {
        return items.sort(sorter).sort(sorter);
    }
    function keepAndDiscard(items, filter) {
        var results = { keep: [], discard: [] };
        for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
            var item = items_1[_i];
            var keep = filter(item);
            results[keep ? 'keep' : 'discard'].push(item);
        }
        return results;
    }
    /**
     * Shuffles array in place.
     * @param {Array} arr items An array containing the items.
     */
    function shuffle(arr) {
        var j, x, i;
        for (i = arr.length - 1; i > 0; i--) {
            j = Math.floor(Math.random() * (i + 1));
            x = arr[i];
            arr[i] = arr[j];
            arr[j] = x;
        }
        return arr;
    }
    /* ------------------------------------------------------------------------------------*/
    // Queue Management
    /* ------------------------------------------------------------------------------------*/
    function displayMessage(message) {
        updateQueue([{ type: 'Vocabulary', voc: message, id: 0 }]);
    }
    function transformAndUpdate(items) {
        var transformedItems = transformItems(items);
        updateQueue(transformedItems);
    }
    function updateQueue(items) {
        var currentItem = items[0];
        var activeQueue = items.splice(0, 10);
        var rest = items.map(function (item) { return item.id; }); // Only need the ID for these
        if ((currentItem === null || currentItem === void 0 ? void 0 : currentItem.type) === 'Radical')
            $.jStorage.set('questionType', 'meaning'); // has to be set before currentItem
        $.jStorage.set(currentItemKey, currentItem);
        $.jStorage.set(activeQueueKey, activeQueue);
        $.jStorage.set(fullQueueKey, rest);
    }
    function transformItems(items) {
        // Not all of the data mapped here is needed, but I haven't bothered to figure out exactly what is needed yet
        return items.map(function (item) {
            var _a;
            var _b, _c, _d, _e;
            return (_a = {
                    aud: (_b = item.data.pronunciation_audios) === null || _b === void 0 ? void 0 : _b.map(function (audio) { return ({
                        content_type: audio.content_type,
                        pronunciation: audio.metadata.pronunciation,
                        url: audio.url,
                        voice_actor_id: audio.metadata.voice_actor_id
                    }); }),
                    auxiliary_meanings: item.data.meanings
                        .filter(function (meaning) { return !meaning.primary; })
                        .map(function (meaning) { return meaning.meaning; }),
                    auxiliary_readings: (_c = item.data.readings) === null || _c === void 0 ? void 0 : _c.filter(function (reading) { return !reading.primary; }).map(function (reading) { return reading.reading; }),
                    characters: item.data.characters,
                    en: item.data.meanings.filter(function (meaning) { return meaning.primary; }).map(function (meaning) { return meaning.meaning; }),
                    id: item.id,
                    kana: (_d = item.data.readings) === null || _d === void 0 ? void 0 : _d.filter(function (reading) { return reading.primary; }).map(function (reading) { return reading.reading; }),
                    kanji: [
                        {
                            // Dummy for now
                            characters: '',
                            en: '',
                            id: 0,
                            ja: '',
                            kan: '',
                            type: ''
                        },
                    ],
                    slug: item.data.slug,
                    srs: (_e = item.assignments) === null || _e === void 0 ? void 0 : _e.srs_stage,
                    syn: [],
                    type: (item.object[0].toUpperCase() + item.object.slice(1))
                },
                _a[item.object == 'vocabulary' ? 'voc' : item.object == 'kanji' ? 'kan' : 'rad'] = item.data.characters,
                _a);
        });
    }
    /* ------------------------------------------------------------------------------------*/
    // WKOF setup
    /* ------------------------------------------------------------------------------------*/
    // Makes sure that WKOF is installed
    function confirm_wkof() {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                if (!wkof) {
                    response = confirm("".concat(script_name, " requires WaniKani Open Framework.\nClick \"OK\" to be forwarded to installation instructions."));
                    if (response) {
                        window.location.href =
                            'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549';
                    }
                    return [2 /*return*/];
                }
                return [2 /*return*/];
            });
        });
    }
    function init_settings() {
        return wkof.ready('Settings,Menu').then(load_settings).then(install_menu);
    }
    // Load WKOF settings
    function load_settings() {
        var defaults = {
            disabled: false,
            active_presets_reviews: 'None',
            active_presets_lessons: 'None',
            active_presets_extra_study: 'Seen',
            presets: {
                None: { name: 'None', actions: [] },
                Seen: {
                    name: 'Seen',
                    actions: [
                        {
                            type: 'filter',
                            name: 'Filter out locked and lessons',
                            value: 1,
                            filter: 'srs',
                            invert: true
                        },
                    ]
                }
            }
        };
        return wkof.Settings.load(script_id, defaults);
    }
    // Installs the options button in the menu
    function install_menu() {
        var config = {
            name: script_id,
            submenu: 'Settings',
            title: script_name,
            on_click: open_settings
        };
        wkof.Menu.insert_script_link(config);
    }
    // Opens settings dialogue when button is pressed
    function open_settings() {
        var config = {
            script_id: script_id,
            title: script_name,
            pre_open: settings_pre_open,
            on_refresh: refresh_settings,
            content: {
                // General Tab
                // ------------------------------------------------------------
                general: {
                    type: 'page',
                    label: 'General',
                    content: {
                        disabled: { type: 'checkbox', label: 'Disable', "default": false },
                        // Active Presets
                        // ------------------------------------------------------------
                        active_presets: {
                            type: 'group',
                            label: 'Active Presets',
                            content: {
                                active_preset_reviews: {
                                    type: 'dropdown',
                                    label: 'Review preset',
                                    content: { todo: 'todo' }
                                },
                                active_preset_lessons: {
                                    type: 'dropdown',
                                    label: 'Lesson preset',
                                    content: { todo: 'todo' }
                                },
                                active_preset_extra_study: {
                                    type: 'dropdown',
                                    label: 'Extra Study preset',
                                    content: { todo: 'todo' }
                                }
                            }
                        }
                    }
                },
                // Presets Tab
                // ------------------------------------------------------------
                presets: {
                    type: 'page',
                    label: 'Presets',
                    content: {
                        // Presets list
                        // ------------------------------------------------------------
                        presets: {
                            type: 'group',
                            label: 'Presets List',
                            content: {
                                active_preset: {
                                    type: 'list',
                                    refresh_on_change: true,
                                    hover_tip: 'Filter & Reorder Presets',
                                    content: {}
                                }
                            }
                        },
                        // Selected Preset
                        // ------------------------------------------------------------
                        preset: {
                            type: 'group',
                            label: 'Selected Preset',
                            content: {
                                preset_name: {
                                    type: 'text',
                                    label: 'Edit Preset Name',
                                    on_change: refresh_presets,
                                    path: '@presets[@active_preset].name',
                                    hover_tip: 'Enter a name for the selected preset'
                                },
                                actions_label: { type: 'section', label: 'Actions' },
                                active_action: {
                                    type: 'list',
                                    refresh_on_change: true,
                                    hover_tip: 'Actions for the selected preset',
                                    content: {}
                                }
                            }
                        },
                        // Selected action
                        // ------------------------------------------------------------
                        action: {
                            type: 'group',
                            label: 'Selected Action',
                            content: {
                                preset_name: {
                                    type: 'text',
                                    label: 'Edit Action Name',
                                    on_change: refresh_actions,
                                    // Note that @presets[@active_preset] is an array and @active_action is a number
                                    path: '@presets[@active_preset][@active_action].name',
                                    hover_tip: 'Enter a name for the selected action'
                                },
                                type: {
                                    type: 'dropdown',
                                    label: 'Action Type',
                                    hover_tip: 'Choose what kind of action this is',
                                    "default": 'sort',
                                    path: '@presets[@active_preset][@active_action].type',
                                    on_change: refresh_action,
                                    content: {
                                        sort: 'Sort',
                                        filter: 'Filter',
                                        'freeze & restore': 'Freeze & Restore'
                                    }
                                },
                                // Sorts and filters
                                // ------------------------------------------------------------
                                action_label: { type: 'section', label: 'Action Settings' },
                                type_description: {
                                    type: 'html',
                                    html: '<div>A description of the type (sort, filter, freeze and restore) goes here</div>'
                                },
                                filter_type: {
                                    type: 'dropdown',
                                    label: 'Filter type',
                                    hover_tip: 'Choose what kind of filter this is',
                                    "default": 'level',
                                    path: '@presets[@active_preset][@active_action].filter',
                                    content: {
                                    // Will be populated
                                    }
                                },
                                sort_type: {
                                    type: 'dropdown',
                                    label: 'Sort type',
                                    hover_tip: 'Choose what kind of sort this is',
                                    "default": 'level',
                                    path: '@presets[@active_preset][@active_action].sort',
                                    content: {
                                    // Will be populated
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }; // as SettingsModule.Config
        var action = config.content.presets.content.action.content;
        for (var _i = 0, _a = Object.entries(wkof.ItemData.registry.sources.wk_items.filters); _i < _a.length; _i++) {
            var _b = _a[_i], name_1 = _b[0], filter = _b[1];
            if (filter.no_ui)
                ;
        }
        action.filter_type.content;
        var dialog = new wkof.Settings(config);
        dialog.open();
    }
    function settings_pre_open(dialog) {
        // Add buttons to the presets and actions lists
        var buttons = function (type) {
            return "<div class=\"list_buttons\">" +
                "<button type=\"button\" action=\"new\" class=\"ui-button ui-corner-all ui-widget\" title=\"Create a new ".concat(type, "\"><span class=\"fa fa-plus\"></span></button>") +
                "<button type=\"button\" action=\"new\" class=\"ui-button ui-corner-all ui-widget\" title=\"Move the selected ".concat(type, " up in the list\"><span class=\"fa fa-arrow-up\"></span></button>") +
                "<button type=\"button\" action=\"new\" class=\"ui-button ui-corner-all ui-widget\" title=\"Move the selected ".concat(type, " down in the list\"><span class=\"fa fa-arrow-down\"></span></button>") +
                "<button type=\"button\" action=\"new\" class=\"ui-button ui-corner-all ui-widget\" title=\"Delete the selected ".concat(type, "\"><span class=\"fa fa-trash\"></span></button>") +
                "</div>";
        };
        var wrap = dialog.find("#".concat(script_id, "_active_preset")).closest('.row').addClass('list_wrap');
        wrap.prepend(buttons('preset')).find('.list_buttons').on('click', 'button', list_button_pressed);
        wrap = dialog.find("#".concat(script_id, "_active_action")).closest('.row').addClass('list_wrap');
        wrap.prepend(buttons('action')).find('.list_buttons').on('click', 'button', list_button_pressed);
        //
        $('#reorder_omega_action_settings .row:first-child').each(function (i, e) {
            var row = $(e);
            var right = row.find('>.right');
            row.prepend(right);
            row.addClass('src_enable');
        });
        console.log($('#reorder_omega_action_settings'));
        refresh_presets();
        refresh_actions();
        refresh_action();
    }
    function refresh_settings() { }
    function refresh_presets() {
        var settings = wkof.settings[script_id];
        populate_list($("#".concat(script_id, "_active_preset")), settings.presets, settings.active_preset);
    }
    function refresh_actions() {
        var settings = wkof.settings[script_id];
        populate_list($("#".concat(script_id, "_active_action")), settings.presets[settings.active_preset].actions, settings.active_action);
    }
    function populate_list(elem, items, active_item) {
        var html = '';
        for (var _i = 0, _a = Object.entries(items); _i < _a.length; _i++) {
            var _b = _a[_i], id = _b[0], name_2 = _b[1].name;
            name_2 = name_2.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            html += "<option name=\"".concat(id, "\">").concat(name_2, "</option>");
        }
        elem.html(html);
        elem.children().eq(active_item).prop('selected', true); // Select the active item
    }
    function refresh_action() { }
    function list_button_pressed() { }
    var wkof, $, script_id, script_name, page, currentItemKey, activeQueueKey, fullQueueKey, settings, SRS_DURATIONS;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                wkof = window.wkof, $ = window.$;
                script_id = 'reorder_omega';
                script_name = 'Reorder Omega';
                currentItemKey = 'currentItem';
                activeQueueKey = 'activeQueue';
                fullQueueKey = 'reviewQueue';
                if (!/(DASHBOARD)?$/i.test(window.location.pathname)) return [3 /*break*/, 2];
                return [4 /*yield*/, init_settings()];
            case 1:
                _a.sent();
                open_settings();
                return [3 /*break*/, 5];
            case 2:
                if (!/REVIEW/i.test(window.location.pathname)) return [3 /*break*/, 4];
                // Set page variables
                page = 'reviews';
                fullQueueKey = 'reviewQueue';
                return [4 /*yield*/, init_settings()
                    // run()
                ];
            case 3:
                _a.sent();
                return [3 /*break*/, 5];
            case 4:
                if (/EXTRA_STUDY/i.test(window.location.pathname)) {
                    // Set page variables
                    page = 'extra_study';
                    fullQueueKey = 'practiceQueue';
                    if (window.location.search === '?title=test') {
                        // This has to be done before WK realizes that the queue is empty and redirects
                        displayLoading();
                        run();
                    }
                }
                _a.label = 5;
            case 5:
                settings = {
                    active_preset: 0,
                    disabled: false,
                    presets: [
                        {
                            name: 'test',
                            actions: [
                                // {
                                //     name: 'Get level 42',
                                //     type: 'filter',
                                //     key: 'level',
                                //     value: 42,
                                //     comparator: '=',
                                //     invert: false,
                                // },
                                {
                                    name: 'Freeze and Restore',
                                    type: 'freeze & restore'
                                },
                                {
                                    name: 'Sort by level',
                                    type: 'sort',
                                    key: 'level',
                                    order: 'asc'
                                },
                                {
                                    name: 'First 1000',
                                    type: 'filter',
                                    key: 'first',
                                    value: 1000,
                                    invert: false
                                },
                            ]
                        },
                    ]
                };
                SRS_DURATIONS = [4, 8, 23, 47, 167, 335, 719, 2879, Infinity].map(function (time) { return time * 60 * 60 * 1000; });
                return [2 /*return*/];
        }
    });
}); })();
module.exports = 0;
