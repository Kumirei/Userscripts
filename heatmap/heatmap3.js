// ==UserScript==
// @name         Wanikani Heatmap 3.0.0
// @namespace    http://tampermonkey.net/
// @version      3.0.0
// @description  Adds review and lesson heatmaps to the dashboard.
// @author       Kumirei
// @include      /^https://(www|preview).wanikani.com/(dashboard)?$/
// @grant        none
// ==/UserScript==

(function($, wkof, review_cache, Heatmap) {
    /* eslint no-multi-spaces: off */

    // Make sure WKOF is installed
    let script_id = 'heatmap3';
    let script_name = "Wanikani Heatmap";
    if (!wkof) {
        let response = confirm(script_name + ' requires WaniKani Open Framework.\n Click "OK" to be forwarded to installation instructions.');
        if (response) window.location.href = 'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549';
        return;
    }

    /*-------------------------------------------------------------------------------------------------------------------------------*/

    let reload; // Function to reload the heatmap
    // Wait untile modues are ready then initiate script
    wkof.include('Menu,Settings,ItemData,Apiv2');
    wkof.ready('Menu,Settings,ItemData,Apiv2')
    .then(load_settings)
    .then(install_menu)
    .then(initiate);


    // Fetch necessary data then install the heatmap
    async function initiate() {
        let t = Date.now();
        let reviews = await review_cache.get_reviews();
        let [forecast, lessons] = await get_forecast_and_lessons();
        reload = function(new_reviews=false) {
            if (new_reviews !== false) reviews = new_reviews;
            setTimeout(()=>{// make settings dialog respond immediately
                let stats = {
                    reviews: calculate_stats("reviews", reviews),
                    lessons: calculate_stats("lessons", lessons),
                };
                auto_range(stats, forecast);
                install_heatmap(reviews, forecast, lessons, stats);
            }, 1);
        }
        reload();
    }


    /*-------------------------------------------------------------------------------------------------------------------------------*/

    // Installs the options button in the menu
    function install_menu() {
        let config = {
            name: script_id,
            submenu: 'Settings',
            title: 'Heatmap3',
            on_click: open_settings
        };
        wkof.Menu.insert_script_link(config);
    }

    function auto_range(stats, forecast_items) {
        let settings = wkof.settings[script_id];
        let forecast_days = {};
        for (let [date] of Object.values(forecast_items)) {
            let string = new Date(date).toDateString();
            if (!forecast_days[string]) forecast_days[string] = 1;
            else forecast_days[string]++;
        }
        let foreacast_average = forecast_items.length/Object.keys(forecast_days).length;
        let forecast_sd = Math.sqrt(1/(forecast_items.length/foreacast_average)*Object.values(forecast_days).map(x=>Math.pow(x-foreacast_average, 2)).reduce((a,b)=>a+b));
        let forecast = Array(settings.forecast.colors.length-1).fill(null).map((_, i)=>Math.round(icdf(((settings.forecast.gradient?0.9:1)*(i+1))/(settings.forecast.colors.length-(settings.forecast.gradient?1:0)), foreacast_average, forecast_sd)));
        let reviews = Array(settings.reviews.colors.length-1).fill(null).map((_, i)=>Math.round(icdf(((settings.reviews.gradient?0.9:1)*(i+1))/(settings.reviews.colors.length-(settings.reviews.gradient?1:0)), stats.reviews.average[1], stats.reviews.average[2])));
        let lessons = Array(settings.lessons.colors.length-1).fill(null).map((_, i)=>Math.round(icdf(((settings.lessons.gradient?0.9:1)*(i+1))/(settings.lessons.colors.length-(settings.lessons.gradient?1:0)), stats.lessons.average[1], stats.lessons.average[2])));
        if (settings.reviews.auto_range) for (let i=1; i<settings.reviews.colors.length; i++) settings.reviews.colors[i][0] = reviews[i-1];
        if (settings.lessons.auto_range) for (let i=1; i<settings.lessons.colors.length; i++) settings.lessons.colors[i][0] = lessons[i-1];
        if (settings.forecast.auto_range) for (let i=1; i<settings.forecast.colors.length; i++) settings.forecast.colors[i][0] = forecast[i-1];
        wkof.Settings.save(script_id);
    }

    let applied;
    function modify_settings(dialog) {
        // Add apply button
        let apply = create_elem({type: 'button', class: 'ui-button ui-corner-all ui-widget', child: 'Apply'});
        applied = false;
        apply.onclick = e=>{applied = true; reload()};
        dialog[0].nextElementSibling.getElementsByClassName('ui-dialog-buttonset')[0].insertAdjacentElement('afterbegin', apply);
        // Add color settings
        let update_label = function(input) {
            if (!input.nextElementSibling) input.insertAdjacentElement('afterend', create_elem({type: 'div', class: 'color-label', child: input.value}));
            else input.nextElementSibling.innerText = input.value;
            if (!Math.round(hex_to_rgb(input.value).reduce((a,b)=>a+b/3, 0)/255-0.15)) input.nextElementSibling.classList.remove('light-color');
            else input.nextElementSibling.classList.add('light-color');
        }
        dialog[0].querySelectorAll('#heatmap3_general ~ div hr:first-of-type').forEach((elem, i) => {
            let type = ["reviews", "lessons", "forecast"][i];
            let update_color_settings = _=>{
                wkof.settings[script_id][type].colors = [];
                elem.previousElementSibling.children[1].children.forEach((child, i) => {
                    wkof.settings[script_id][type].colors.push([child.children[0].children[0].value, child.children[1].children[0].value]);
                });
            };
            let create_row = (value, color)=>create_elem({type: 'div', class: 'row', children: [
                create_elem({type: 'div', class: 'text', child: create_elem({type: 'input', input: 'number', value: value})}),
                create_elem({type: 'div', class: 'color', child: create_elem({type: 'input', input: 'color', value: color, callback: e=>e.addEventListener('change', _=>update_label(e))}), callback: e=>update_label(e.children[0])}),
                create_elem({type: 'div', class: 'delete', child: create_elem({type: 'button', onclick: e=>{e.target.closest('.row').remove(); update_color_settings();}, child: create_elem({type: 'i', class: 'icon-trash'})})}),
            ]});
            let panel = create_elem({type: 'div', class: "right", children: [
                create_elem({type: 'button', class: "adder", onclick: e=>{e.target.nextElementSibling.append(create_row(0, '#ffffff')); update_color_settings();}, child: 'Add interval'}),
                create_elem({type: 'div', class: "row panel"}),
            ]});
            panel.addEventListener('change', update_color_settings);
            for (let [value, color] of wkof.settings[script_id][type].colors) panel.children[1].append(create_row(value, color));
            elem.insertAdjacentElement('beforebegin', panel);
        });
        dialog[0].querySelectorAll('#heatmap3_general input[type="color"]').forEach(input=>{
            input.addEventListener('change', ()=>update_label(input));
            update_label(input);
        });
    }

    function reload_on_change(settings) {
        if (applied) reload();
    }

    function open_settings() {
        var config = {
            script_id: script_id,
            title: 'Heatmap',
            on_save: _=>applied = true,
            on_close: reload_on_change,
            content: {
                tabs: {
                    type: 'tabset',
                    content: {
                        general: {
                            type: 'page',
                            label: 'General',
                            hover_tip: 'Settings pertaining to the general functions of the script',
                            content: {
                                function: {
                                    type: 'group',
                                    label: 'Function',
                                    content: {
                                        start_date: {
                                            type: 'text',
                                            label: 'Start date (YYYY-MM-DD)',
                                            default: '',
                                            hover_tip: 'All data before this date will be ignored',
                                            path: '@general.start_date',
                                            validate: validate_start_date,
                                        },
                                        week_start: {
                                            type: 'dropdown',
                                            label: 'First day of the week',
                                            default: 0,
                                            hover_tip: 'Start the week on the selected day.',
                                            content: {0: "Monday", 1: "Tuesday", 2: "Wednesday", 3: "Thursday", 4: "Friday", 5: "Saturday", 6: "Sunday"},
                                            path: '@general.week_start'
                                        },
                                        day_start: {
                                            type: 'number',
                                            label: 'New day starts at',
                                            default: 0,
                                            placeholder: '(hours after midnight)',
                                            hover_tip: 'Offset for those who tend to stay up after midnight. If you want the new day to start at 4 AM, input 4.',
                                            path: '@general.day_start',
                                        },
                                        session_limit: {
                                            type: 'number',
                                            label: 'Session time limit (minutes)',
                                            default: 10,
                                            placeholder: '(minutes)',
                                            hover_tip: 'Max number of minutes between review answers to still count within the same session',
                                            path: '@general.session_limit',
                                        },
                                        position: {
                                            type: 'dropdown',
                                            label: 'Position',
                                            default: 2,
                                            hover_tip: 'Where on the dashboard to install the heatmap',
                                            content: {0: "Top", 1: "Below forecast", 2: "Below SRS", 3: "Below panels", 4: "Bottom"},
                                            path: '@general.position'
                                        },
                                    },
                                },
                                look: {
                                    type: 'group',
                                    label: 'Look',
                                    content: {
                                        reverse_years: {
                                            type: 'checkbox',
                                            label: 'Reverse year order',
                                            default: false,
                                            hover_tip: 'Puts the most recent years on the bottom instead of the top.',
                                            path: '@general.reverse_years'
                                        },
                                        segment_years: {
                                            type: 'checkbox',
                                            label: 'Segment year',
                                            default: true,
                                            hover_tip: 'If this is checked then months will display as segments.',
                                            path: '@general.segment_years'
                                        },
                                        day_labels: {
                                            type: 'checkbox',
                                            label: 'Day of week labels',
                                            default: true,
                                            hover_tip: 'Adds letters to the left of the heatmaps indicating which row represents which weekday',
                                            path: '@general.day_labels'
                                        },
                                        zero_gap: {
                                            type: 'checkbox',
                                            label: 'No gap',
                                            default: false,
                                            hover_tip: `Don't display any gap between days`,
                                            path: '@general.zero_gap'
                                        },
                                        month_labels: {
                                            type: 'dropdown',
                                            label: 'Month labels',
                                            default: "all",
                                            hover_tip: 'Display labels for the months above the maps',
                                            content: {all: "All", top: "Only at the top", none: "None"},
                                            path: '@general.month_labels'
                                        },
                                        divider: {
                                            type: 'divider'
                                        },
                                        now_indicator: {
                                            type: 'checkbox',
                                            label: 'Current day indicator',
                                            default: true,
                                            hover_tip: 'Puts borders around the current day',
                                            path: '@general.now_indicator'
                                        },
                                        level_indicator: {
                                            type: 'checkbox',
                                            label: 'Level-up indicators',
                                            default: true,
                                            hover_tip: 'Puts borders around the days you leveled up',
                                            path: '@general.level_indicator'
                                        },
                                        color_now_indicator: {
                                            type: 'color',
                                            label: 'Color for current day',
                                            hover_tip: 'The borders around today will have this color.',
                                            default: '#ff0000',
                                            path: '@general.color_now_indicator',
                                        },
                                        color_level_indicator: {
                                            type: 'color',
                                            label: 'Color for level-ups',
                                            hover_tip: 'The borders around level-ups will have this color.',
                                            default: '#ffffff',
                                            path: '@general.color_level_indicator',
                                        },
                                    },
                                },
                            },
                        },
                        reviews: {
                            type: 'page',
                            label: 'Reviews',
                            hover_tip: 'Settings pertaining to the review heatmaps',
                            content: {
                                divider: {
                                    type: 'divider'
                                },
                                reviews_gradient: {
                                    type: 'checkbox',
                                    label: 'Gradients',
                                    default: true,
                                    hover_tip: 'Let any colors between the chosen ones be used',
                                    path: '@reviews.gradient'
                                },
                                reviews_auto_range: {
                                    type: 'checkbox',
                                    label: 'Auto range',
                                    default: true,
                                    hover_tip: 'Automatically decide what the intervals should be',
                                    path: '@reviews.auto_range'
                                },
                                reload_button: {
                                    type: 'button',
                                    label: 'Reload review data',
                                    text: 'Reload',
                                    hover_tip: 'Deletes review cache and starts new fetch. Data from before resets will be lost permanently',
                                    on_click: ()=>review_cache.reload().then(reviews=>reload(reviews)),
                                },
                            },
                        },
                        lessons: {
                            type: 'page',
                            label: 'Lessons',
                            hover_tip: 'Settings pertaining to the lesson heatmaps',
                            content: {
                                divider: {
                                    type: 'divider'
                                },
                                lessons_gradient: {
                                    type: 'checkbox',
                                    label: 'Gradients',
                                    default: true,
                                    hover_tip: 'Let any colors between the chosen ones be used',
                                    path: '@lessons.gradient'
                                },
                                lessons_auto_range: {
                                    type: 'checkbox',
                                    label: 'Auto range',
                                    default: true,
                                    hover_tip: 'Automatically decide what the intervals should be',
                                    path: '@lessons.auto_range'
                                },
                                lessons_count_zeros: {
                                    type: 'checkbox',
                                    label: 'Include zeros in streak',
                                    default: true,
                                    hover_tip: 'Counts days with no lessons available towards the streak',
                                    path: '@lessons.count_zeros'
                                },
                            },
                        },
                        forecast: {
                            type: 'page',
                            label: 'Review Forecast',
                            hover_tip: 'Settings pertaining to the forecast',
                            content: {
                                divider: {
                                    type: 'divider'
                                },
                                forecast_gradient: {
                                    type: 'checkbox',
                                    label: 'Gradients',
                                    default: true,
                                    hover_tip: 'Let any colors between the chosen ones be used',
                                    path: '@forecast.gradient'
                                },
                                forecast_auto_range: {
                                    type: 'checkbox',
                                    label: 'Auto range',
                                    default: true,
                                    hover_tip: 'Automatically decide what the intervals should be',
                                    path: '@forecast.auto_range'
                                },
                                forecast_show_next_year: {
                                    type: 'dropdown',
                                    label: 'Show next year in',
                                    default: 12,
                                    hover_tip: 'Start showing the next year\'s heatmap this month',
                                    content: {9: 'September', 10: 'October', 11: 'November', 12: 'December', 13: 'January'},
                                    path: '@forecast.show_next_year',
                                },
                            },
                        },
                    },
                },
            },
        };
        let dialog = new wkof.Settings(config);
        config.pre_open = (elem)=>{dialog.refresh(); modify_settings(elem);};
        dialog.open();
    }

    function load_settings() {
        //wkof.file_cache.delete('wkof.settings.'+script_id); // temporary
        let defaults = {
            general: {
                start_date: 0,
                week_start: 0,
                day_start: 0,
                reverse_years: false,
                segment_years: true,
                zero_gap: false,
                month_labels: 'all',
                day_labels: true,
                session_limit: 10,
                now_indicator: true,
                color_now_indicator: '#ff0000',
                level_indicator: true,
                color_level_indicator: '#ffffff',
                position: 2,
            },
            reviews: {
                gradient: true,
                auto_range: true,
            },
            lessons: {
                gradient: true,
                auto_range: true,
                count_zeros: true,
            },
            forecast: {
                gradient: true,
                auto_range: true,
                show_next_year: 12,
            },
            other: {
                reviews_last_visible_year: 0,
                lessons_last_visible_year: 0,
                visible_map: "reviews",
                times_popped: 0,
            }
        };
        return wkof.Settings.load(script_id, defaults).then(settings=>{
            // Default workaround
            if (!settings.reviews.colors) settings.reviews.colors = [[0, "#dae289"], [100, "#9cc069"], [200, "#669d45"], [300, "#647939"], [400, "#3b6427"],];
            if (!settings.lessons.colors) settings.lessons.colors = [[0, "#dae289"], [100, "#9cc069"], [200, "#669d45"], [300, "#647939"], [400, "#3b6427"],];
            if (!settings.forecast.colors) settings.forecast.colors = [[0, "#808080"], [100, "#a0a0a0"], [200, "#c0c0c0"], [300, "#dfdfdf"], [400, "#ffffff"],];
            wkof.Settings.save(script_id);
            return settings;
        });
    }

    function get_event_handler(data) {
        let down, first_day, first_date, marked = [];
        let ms_day = 24*60*60*1000;
        return function event_handler(event) {
            let elem = event.target;
            if (elem.classList.contains('day')) {
                let date = new Date(elem.getAttribute('data-date'));
                let type = elem.closest('.view').classList.contains('reviews')?date<new Date()?'reviews':'forecast':'lessons';
                if (event.type === "click" && Object.keys(elem.info.lists).length) {
                    let title = `${date.toDateString().slice(4)} ${kanji_day(date.getDay())}`;
                    let today = new Date(new Date().toDateString()).getTime();
                    let offset = wkof.settings[script_id].general.day_start*60*60*1000;
                    let minimap_data = cook_data(type, data[type].filter(a=>a[0]>date.getTime()+offset&&a[0]<date.getTime()+1000*60*60*24+offset));//.map(a=>[today+new Date(a[0]).getHours()*60*60*1000, ...a.slice(1)]));
                    update_popper(event, type, title, elem.info, minimap_data);
                }
                if (event.type === "mousedown") {
                    event.preventDefault();
                    down = true;
                    first_day = elem;
                    first_date = new Date(elem.getAttribute('data-date'))
                }
                if (event.type === "mouseup") {
                    if (first_day !== elem) {
                        let second_date = new Date(elem.getAttribute('data-date'));
                        let start_date = first_date<second_date?first_date:second_date;
                        let end_date = first_date<second_date?second_date:first_date;
                        type = elem.closest('.view').classList.contains('reviews')?start_date<new Date()?'reviews':'forecast':'lessons';
                        let title = `${start_date.toDateString().slice(4)} ${kanji_day(start_date.getDay())} - ${end_date.toDateString().slice(4)} ${kanji_day(end_date.getDay())}`;
                        let today = new Date(new Date().toDateString()).getTime();
                        let offset = wkof.settings[script_id].general.day_start*60*60*1000;
                        let minimap_data = cook_data(type, data[type].filter(a=>a[0]>start_date.getTime()+offset&&a[0]<end_date.getTime()+1000*60*60*24+offset).map(a=>[today+new Date(a[0]).getHours()*60*60*1000, ...a.slice(1)]));
                        let popper_info = {counts: {}, lists: {}};
                        for (let item of minimap_data) {
                            for (let [key, value] of Object.entries(item[1])) {
                                if (!popper_info.counts[key]) popper_info.counts[key] = 0;
                                popper_info.counts[key] += value;
                            }
                            for (let [key, value] of Object.entries(item[2])) {
                                if (!popper_info.lists[key]) popper_info.lists[key] = [];
                                popper_info.lists[key].push(value);
                            }
                        }
                        update_popper(event, type, title, popper_info, minimap_data);
                    }
                }
                if (event.type === "mouseover" && down) {
                    let view = document.querySelector('#heatmap .'+type);
                    if (!view) return;
                    for (let m of marked) {
                        m.classList.remove('selected', 'marked');
                    }
                    marked = [];
                    elem.classList.add('selected', 'marked');
                    marked.push(elem);
                    let d = new Date(first_date.getTime());
                    while (d.toDateString() !== date.toDateString()) {
                        let e = view.querySelector(`.day[data-date="${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}"]`);
                        e.classList.add('selected', 'marked');
                        marked.push(e);
                        d.setDate(d.getDate()+(d<date?1:-1));
                    }
                }
            }
            if (event.type === "click") {
                let parent = elem.parentElement;
                if (parent.classList.contains('toggle-year')) {
                    let type = elem.closest('.view').classList.contains('reviews')?'reviews':'lessons';
                    let up = parent.classList.contains('up');
                    //let year = Number('20'+parent.parentElement.querySelector('.year-label').innerText);
                    let year_elem = parent.closest('.year');
                    let year = Number(year_elem.getAttribute('data-year'));
                    if (up) {
                        year_elem.classList.add('hidden');
                        year_elem.previousElementSibling.classList.add('last');
                        wkof.settings[script_id].other[type+'_last_visible_year'] = year+1;
                    } else {
                        year_elem.nextElementSibling.classList.remove('hidden');
                        year_elem.nextElementSibling.classList.add('last');
                        year_elem.classList.remove('last');
                        wkof.settings[script_id].other[type+'_last_visible_year'] = year-1;
                    }
                    wkof.Settings.save(script_id);
                }
            }
            if (event.type === "mouseup") {
                down = false;
                for (let m of marked) {
                    m.classList.remove('selected', 'marked');
                }
                marked = [];
            }
        }
    }

    async function update_popper(event, type, title, info, minimap_data) {
        let items = await wkof.ItemData.get_items({wk_items: {options: {assignments: true}, filters: {subject_ids: info.lists[type+'-ids']}}});
        let popper = document.getElementById('popper');
        let levels = new Array(61).fill(0);
        levels[0] = new Array(6).fill(0);
        let item_types = {rad: 0, kan: 0, voc: 0};
        for (let item of items) {
            levels[0][Math.floor((item.data.level-1)/10)]++;
            levels[item.data.level]++;
            item_types[item.object.slice(0, 3)]++;
        }
        let srs = new Array(10).fill(null).map(_=>[0, 0]);
        for (let i=1; i<10; i++) {
            srs[i][0] = info.counts[type+'-srs1-'+i]||0;
            srs[i][1] = info.counts[type+'-srs2-'+i]||0;
        }
        let srs_counter = (index, start, end)=>srs.map((a, i)=>(i>=start?i<=end?a[index]:0:0)).reduce((a,b)=>a+b);
        srs[0] = [[srs_counter(0, 1, 4), srs_counter(1, 1, 4)], [srs_counter(0, 5, 6), srs_counter(1, 5, 6)], srs[7], srs[8], srs[9]];
        let srs_diff = Object.entries(srs.slice(1)).reduce((a,b)=>a+b[0]*(b[1][1]-b[1][0]), 0);
        let pass = [info.counts.pass, info.counts.reviews-info.counts.pass, Math.floor(info.counts.pass/info.counts.reviews*100)];
        let answers = [info.counts.reviews*2-item_types.rad, info.counts.incorrect, Math.floor((info.counts.reviews*2-item_types.rad)/(info.counts.incorrect+info.counts.reviews*2-item_types.rad)*100)];
        let item_elems = [];
        for (let item of items) {
            item_elems.push(create_elem({type: 'a', class: 'item '+item.object+' hover-wrapper-target', href: item.data.document_url, children: [
                create_elem({type: "div", class: "hover-wrapper above", children: [
                    create_elem({type: "a", class: "characters", href: item.data.document_url, child: item.data.characters || create_elem({type: 'img', class: 'radical-svg', src: item.data.character_images.find(a=>a.content_type=="image/svg+xml"&&a.metadata.inline_styles).url})}),
                    create_table("left", [["Meanings", item.data.meanings.map(i=>i.meaning).join(', ')], ["Readings", item.data.readings?item.data.readings.map(i=>i.reading).join('、 '):"-"],["Level", item.data.level]], {class: 'info'})
                ]}),
                create_elem({type: 'a', class: "characters", child: item.data.characters || create_elem({type: 'img', class: 'radical-svg', src: item.data.character_images.find(a=>a.content_type=="image/svg+xml"&&a.metadata.inline_styles).url})})
            ]}));
        }
        // Populate popper
        popper.className = type;
        popper.querySelector('.date').innerText = title;
        popper.querySelector('.count').innerText = info.lists[type+'-ids'].length;
        popper.querySelector('.score > span').innerText = (srs_diff<0?'':'+')+srs_diff;
        popper.querySelectorAll('.levels .hover-wrapper > *').forEach(e=>e.remove());
        popper.querySelectorAll('.levels > tr > td').forEach((e, i)=>{e.innerText = levels[0][i]; e.parentElement.setAttribute('data-count', levels[0][i]); e.parentElement.children[0].append(create_table('left', levels.map((a,j)=>[j, a]).slice(1).filter(a=>Math.floor((a[0]-1)/10)==i&&a[1]!=0)))});
        popper.querySelectorAll('.srs > tr > td').forEach((e, i)=>{e.innerText = srs[0][Math.floor(i/2)][i%2]});
        popper.querySelector('.srs .hover-wrapper table').replaceWith(create_table('left', [['SRS'], ['Before / After'], ...srs.slice(1).map((a, i)=>[['App 1', 'App 2', 'App 3', 'App 4', 'Gur 1', 'Gur 2', 'Mas', 'Enl', 'Bur'][i], ...a])]));
        popper.querySelectorAll('.type td').forEach((e, i)=>{e.innerText = item_types[['rad', 'kan', 'voc'][i]]});
        popper.querySelectorAll('.summary td').forEach((e, i)=>{e.innerText = pass[i]});
        popper.querySelectorAll('.answers td').forEach((e, i)=>{e.innerText = answers[i]});
        popper.querySelector('.items').replaceWith(create_elem({type: 'div', class: 'items', children: item_elems}));
        popper.querySelector('.minimap > .hours-map').replaceWith(create_minimap(type, minimap_data).maps.day);
        popper.style.top = event.pageY+50+'px';
        popper.classList.add('popped');
        wkof.settings[script_id].other.times_popped++;
        wkof.Settings.save(script_id);
    }

    function create_minimap(type, data) {
        let settings = wkof.settings[script_id];
        let multiplier = 6;
        return new Heatmap({
            type: "day",
            id: 'hours-map',
            first_date: Date.parse(new Date(data[0][0]-settings.general.day_start*60*60*1000).toDateString()),
            day_start: settings.general.day_start,
            day_hover_callback: (date, day_data)=>{
                let type2 = type;
                if (type2 === "reviews" && Date.parse(date.join('-'))>Date.now() && day_data.counts.forecast) type2 = "forecast";
                let string = [`${day_data.counts[type2]||0} ${type2==="forecast"?"reviews upcoming":(day_data.counts[type2]===1?type2.slice(0,-1):type2)} at ${date[3]}:00`];
                if (type2 !== "lessons" && day_data.counts[type2+'-srs'+(type2==="reviews"?'2-9':'1-8')]) string += '\nBurns '+day_data.counts[type2+'-srs'+(type2==="reviews"?'2-9':'1-8')];
                return string;
            },
            color_callback: (date, day_data)=>{
                date[2]++;
                let type2 = type;
                if (type2 === "reviews" && Date.parse(date.join('-'))>Date.now() && day_data.counts.forecast) type2 = "forecast";
                let colors = settings[type2].colors.slice().reverse();
                if (!settings[type2].gradient) {
                    for (let [count, color] of colors) {
                        if (day_data.counts[type2]*multiplier >= count) {
                            return color;
                            break;
                        }
                    }
                } else {
                    if (day_data.counts[type2]*multiplier >= colors[0][0]) return colors[0][1];
                    for (let i=0; i<colors.length; i++) {
                        if (day_data.counts[type2]*multiplier >= colors[i][0]) {
                            let percentage = (day_data.counts[type2]*multiplier-colors[i][0])/(colors[i-1][0]-colors[i][0]);
                            return interpolate_color(colors[i][1], colors[i-1][1], percentage);
                            break;
                        }
                    }
                }
            },
        }, data);
    }

    function create_popper(data) {
        // Create layout
        let popper = create_elem({type: 'div', id: 'popper'});
        let header = create_elem({type: 'div', class: 'header'});
        let minimap = create_elem({type: 'div', class: 'minimap', children: [create_elem({type: 'span', class: 'minimap-label', child: 'Hours minimap'}), create_elem({type: 'div', class: 'hours-map'})]});
        let stats = create_elem({type: 'div', class: 'stats'});
        let items = create_elem({type: 'div', class: 'items'});
        popper.append(header, minimap, stats, items);
        document.addEventListener('click', (event)=>{if (!event.composedPath().find((a)=>a===popper) && !event.target.classList.contains('day')) popper.classList.remove('popped')});
        // Create header
        header.append(
            create_elem({type: 'div', class: 'date'}),
            create_elem({type: 'div', class: 'count'}),
            create_elem({type: 'div', class: 'score hover-wrapper-target', children: [create_elem({type: 'div', class: 'hover-wrapper above', child: 'Net progress of SRS levels'}), create_elem({type: 'span'})]}),
        );
        // Create minimap and stats
        stats.append(
            create_table('left', [["Levels"], [" 1-10", 0], ["11-20", 0], ["21-30", 0], ["31-40", 0], ["41-50", 0], ["51-60", 0]], {class: 'levels'}, true),
            create_table('left', [["SRS"], ['Before / After'], ["App", 0, 0], ["Gur", 0, 0], ["Mas", 0, 0], ["Enl", 0, 0], ["Bur", 0, 0]], {class: 'srs hover-wrapper-target', child: create_elem({type: 'div', class: 'hover-wrapper below', child: create_elem({type: 'table'})})}),
            create_table('left', [["Type"], ["Rad", 0], ["Kan", 0], ["Voc", 0]], {class: 'type'}),
            create_table('left', [["Summary"], ["Pass", 0], ["Fail", 0], ["Acc", 0]], {class: 'summary'}),
            create_table('left', [["Answers"], ["Right", 0], ["Wrong", 0], ["Acc", 0]], {class: 'answers'}),
        );
        return popper;
    }

    // Create and install the heatmap
    function install_heatmap(reviews, forecast, lessons, stats) {
        let settings = wkof.settings[script_id];
        // Create elements
        let heatmap = create_elem({type: 'section', id: 'heatmap', class: 'heatmap '+(settings.other.visible_map === "reviews" ? "reviews" : "")});
        let buttons = create_buttons();
        let views = create_elem({type: 'div', class: 'views'});
        heatmap.append(buttons, views);
        heatmap.onclick = heatmap.onmousedown = heatmap.onmouseup = heatmap.onmouseover = get_event_handler({reviews, forecast, lessons});
        heatmap.style.setProperty('--color-now', settings.general.now_indicator?settings.general.color_now_indicator:'transparent');
        heatmap.style.setProperty('--color-level', settings.general.level_indicator?settings.general.color_level_indicator:'transparent');
        // Create heatmaps
        let cooked_reviews = cook_data("reviews", reviews);
        let cooked_lessons = cook_data("lessons", lessons)
        let level_ups = get_level_ups(lessons).map(date=>[date, 'level-up']);
        if (level_ups.length === 60) level_ups[59][1] += ' level-60';
        let reviews_view = create_view('reviews', stats, level_ups, reviews[0][0], cooked_reviews.concat(forecast));
        let lessons_view = create_view('lessons', stats, level_ups, lessons[0][0], cooked_lessons);
        let popper = create_popper({reviews: cooked_reviews, forecast, lessons: cooked_lessons});
        views.append(reviews_view, lessons_view, popper);
        // Install
        let elem = document.getElementById('heatmap');
        if (elem) elem.remove();
        let position = [[".progress-and-forecast", 'beforebegin'], ['.progress-and-forecast', 'afterend'], ['.srs-progress', 'afterend'], ['.span12 .row', 'afterend'], ['.span12 .row:last-child', 'afterend']][settings.general.position];
        document.querySelector(position[0]).insertAdjacentElement(position[1], heatmap);
    }

    function cook_data(type, data) {
        if (type === "reviews") {
            return data.map(item=>{
                let cooked = [item[0], {reviews: 1, pass: (item[3]+item[4]==0?1:0), incorrect: item[3]+item[4], streak: item[5]}, {'reviews-ids': item[1]}];
                cooked[1][type+'-srs1-'+item[2]] = 1;
                let new_srs = item[2]-((item[3]+item[4])*(item[2]<5?1:2))+((item[3]+item[4])==0?1:0);
                cooked[1][type+'-srs2-'+(new_srs<1?1:new_srs)] = 1;
                return cooked;
            });
        }
        else if (type === "lessons") return data.map(item=>[item[0], {lessons: 1, streak: item[4]}, {'lessons-ids': item[1]}]);
        else if (type === "forecast") return data;
    }

    // Creates the buttons at the top of the heatmap
    function create_buttons() {
        let buttons = create_elem({type: 'div', class: 'buttons'});
        // Creates a button element with an icon and a hover element
        let create_button = (cls, icon, tooltip)=>create_elem({type: 'button', class: cls+'-button hover-wrapper-target', children: [create_elem({type: 'div', class: 'hover-wrapper above', child: tooltip}),
        create_elem({type: 'i', class: 'icon-'+icon})]});
        // Create button elements
        let settings_button = create_button('settings', 'gear', 'Settings');
        settings_button.onclick = open_settings;
        let toggle_button = create_button('toggle', 'inbox', 'Toggle Reviews/Lessons');
        toggle_button.onclick = toggle_visible_map;
        buttons.append(settings_button, toggle_button);
        return buttons;
    }

    function toggle_visible_map() {
        let heatmap = document.getElementById('heatmap');
        heatmap.classList.toggle('reviews');
        wkof.settings[script_id].other.visible_map = heatmap.classList.contains('reviews') ? 'reviews' : 'lessons';
        wkof.Settings.save(script_id);
    }

    // Create heatmaps together with peripherals such as stats
    function create_view(type, stats, level_ups, first_date, data) {
        let settings = wkof.settings[script_id];
        // New heatmap instance
        let heatmap = new Heatmap({
            type: "year",
            id: type,
            week_start: settings.general.week_start,
            day_start: settings.general.day_start,
            first_date: Math.max(new Date(settings.general.start_date).getTime(), first_date),
            last_date: new Date(String(new Date().getFullYear()+(new Date().getMonth()-settings.forecast.show_next_year+1 >= 0 ? 2 : 1))).setHours(0)-1,
            segment_years: settings.general.segment_years,
            zero_gap: settings.general.zero_gap,
            markings: [[new Date(Date.now()-60*60*1000*settings.general.day_start), "today"], ...level_ups],
            day_hover_callback: (date, day_data)=>{
                let type2 = type;
                let time = Date.parse(date.join('-')+' 0:0');
                if (type2 === "reviews" && time>Date.now()-60*60*1000*settings.general.day_start && day_data.counts.forecast) type2 = "forecast";
                let string = `${day_data.counts[type2]||0} ${type2==="forecast"?"reviews upoming":(day_data.counts[type2]===1?type2.slice(0,-1):type2)} on ${new Date(time).toDateString().replace(/ /, ', ')}
                Day ${(Math.round((time-Date.parse(new Date(Math.max(data[0][0], Date.parse(settings.general.start_date))).toDateString()))/(24*60*60*1000))+1).toSeparated()}`;
                if (time < Date.now()) string += `, Streak ${stats[type].streaks[new Date(time).toDateString()] || 0}`;
                string += '\n';
                if (type2 !== "lessons" && day_data.counts[type2+'-srs'+(type2==="reviews"?'2-9':'1-8')]) string += '\nBurns '+day_data.counts[type2+'-srs'+(type2==="reviews"?'2-9':'1-8')];
                let level = level_ups.findIndex(level_up=>level_up[0]===time)+1
                if (level) string += '\nYou reached level '+level+'!';
                if (wkof.settings[script_id].other.times_popped < 5) string += '\nClick for details!';
                return [string];
            },
            color_callback: (date, day_data)=>{
                let type2 = type;
                if (type2 === "reviews" && Date.parse(date.join('-'))>Date.now()-1000*60*60*settings.general.day_start && day_data.counts.forecast) type2 = "forecast";
                let colors = settings[type2].colors.slice().reverse();
                if (!settings[type2].gradient) {
                    for (let [count, color] of colors) {
                        if (day_data.counts[type2] >= count) {
                            return color;
                            break;
                        }
                    }
                } else {
                    if (day_data.counts[type2] >= colors[0][0]) return colors[0][1];
                    for (let i=1; i<colors.length; i++) {
                        if (day_data.counts[type2] >= colors[i][0]) {
                            let percentage = (day_data.counts[type2]-colors[i][0])/(colors[i-1][0]-colors[i][0]);
                            return interpolate_color(colors[i][1], colors[i-1][1], percentage);
                            break;
                        }
                    }
                }
            },
        }, data);
        modify_heatmap(type, heatmap);
        // Create layout
        let view = create_elem({type: 'div', class: type+' view'});
        let title = create_elem({type: 'div', class: 'title', child: type.toProper()});
        let [head_stats, foot_stats] = create_stats_elements(type, stats[type]);
        let years = create_elem({type: 'div', class: 'years'+(settings.general.reverse_years?' reverse':'')});
        years.setAttribute('month-labels', settings.general.month_labels);
        years.setAttribute('day-labels', settings.general.day_labels);
        for (let year of Object.values(heatmap.maps).reverse()) years.append(year);
        view.append(title, head_stats, years, foot_stats);
        return view;
    }

    function modify_heatmap(type, heatmap) {
        for (let [year, map] of Object.entries(heatmap.maps)) {
            let target = map.querySelector('.year-labels');
            let up = create_elem({type: 'a', class: 'toggle-year up hover-wrapper-target', children: [create_elem({type: 'div', class: 'hover-wrapper above', child: create_elem({type: 'div', child: 'Click to hide this year'})}), create_elem({type: 'i', class: 'icon-chevron-up'})]});
            let down = create_elem({type: 'a', class: 'toggle-year down hover-wrapper-target', children: [create_elem({type: 'div', class: 'hover-wrapper below', child: create_elem({type: 'div', child: 'Click to show next year'})}), create_elem({type: 'i', class: 'icon-chevron-down'})]});
            target.append(up, down);
        }
        let last_year = Math.max(Math.min(...Object.keys(heatmap.maps)), wkof.settings[script_id].other[type+'_last_visible_year'] || 0);
        wkof.settings[script_id].other[type+'_last_visible_year'] = last_year;
        heatmap.maps[last_year].classList.add('last');
    }

    // Create the header and footer stats for a view
    function create_stats_elements(type, stats) {
        let head_stats = create_elem({type: 'div', class: 'head-stats stats', children: [
            create_stat_element('Days Studied', stats.days_studied[1]+'%', stats.days_studied[0].toSeparated()+' out of '+stats.days.toSeparated()),
            create_stat_element('Done Daily', stats.average[0]+' / '+stats.average[1], 'Per Day / Day studied\nMax: '+stats.max_done[0].toSeparated()+' on '+stats.max_done[1]),
            create_stat_element('Streak', stats.streak[1]+' / '+stats.streak[0], 'Current / Longest'),
        ]})
        let foot_stats = create_elem({type: 'div', class: 'foot-stats stats', children: [
            create_stat_element('Sessions', stats.sessions.toSeparated(), Math.floor(stats.total[0]/stats.sessions)+' per session'),
            create_stat_element(type.toProper(), stats.total[0].toSeparated(), create_table("left", [
                ['Year', stats.total[1].toSeparated()],
                ['Month', stats.total[2].toSeparated()],
                ['Week', stats.total[3].toSeparated()],
                ['Today', stats.total[4].toSeparated()]
            ])),
            create_stat_element('Time', m_to_hm(stats.time[0]), create_table("left", [
                ['Year', m_to_hm(stats.time[1])],
                ['Month', m_to_hm(stats.time[2])],
                ['Week', m_to_hm(stats.time[3])],
                ['Today', m_to_hm(stats.time[4])]
            ])),
        ]})
        return [head_stats, foot_stats];
    }

    // Create an single stat element complete with hover info
    function create_stat_element(label, value, hover) {
        return create_elem({type: 'div', class: 'stat hover-wrapper-target', children: [
            create_elem({type: 'div', class: 'hover-wrapper above', child: hover}),
            create_elem({type: 'span', class: 'stat-label', child: label}),
            create_elem({type: 'span', class: 'value', child: value}),
        ]})
    }

    // Creates a table from a matrix
    function create_table(header, data, table_attr, tr_hover) {
        let table = create_elem(Object.assign({type: 'table'}, table_attr));
        for (let [i, row] of Object.entries(data)) {
            let tr_config = {type: 'tr'};
            if (tr_hover) {tr_config.class = 'hover-wrapper-target'; tr_config.child = create_elem({type: 'div', class: 'hover-wrapper below'});}
            let tr = create_elem(tr_config);
            for (let [j, cell] of Object.entries(row)) {
                let cell_type = (header=="top"&&i==0)||(header=="left"&&j==0)?"th":"td";
                tr.append(create_elem({type: cell_type, child: cell}));
            }
            table.append(tr);
        }
        return table;
    }

    // Shorthand for creating new elements. All keys/value pairs will be added to the new element as attributes
    // unless they are of the exeptions "type" (type of element), "child" (adds one child), or "children" (adds multiple children)
    function create_elem(config) {
        let div = document.createElement(config.type);
        for (let [attr, value] of Object.entries(config)) {
            if (attr === "type") continue;
            else if (attr === "child") div.append(value);
            else if (attr === "children") div.append(...value);
            else if (attr === "value") div.value = value;
            else if (attr === "input") div.setAttribute("type", value);
            else if (attr === "onclick") div.onclick = value;
            else if (attr === "callback") continue;
            else div.setAttribute(attr, value);
        }
        if (config.callback) config.callback(div);
        return div;
    }

    /*-------------------------------------------------------------------------------------------------------------------------------*/

    // Extract upcoming reviews and completed lessons from the WKOF cache
    function get_forecast_and_lessons() {
        return wkof.ItemData.get_items('assignments').then(data=>{
            let forecast = [], lessons = [];
            let vacation_offset = Date.now()-new Date(wkof.user.current_vacation_started_at || Date.now());
            for (let item of data) {
                if (item.assignments && item.assignments.started_at !== null) {
                    // If the assignment has been started add a lesson containing staring date, id, level, and unlock date
                    lessons.push([Date.parse(item.assignments.started_at), item.id, item.data.level, Date.parse(item.assignments.unlocked_at)]);
                    if (Date.parse(item.assignments.available_at) > Date.now()) {
                        // If the assignment is scheduled add a forecast item ready for sending to the heatmap module
                        let forecast_item = [Date.parse(item.assignments.available_at)+vacation_offset, {forecast: 1,}, {'forecast-ids': item.id}];
                        forecast_item[1]["forecast-srs1-"+item.assignments.srs_stage] = 1;
                        forecast.push(forecast_item);
                    }
                }
            }
            // Sort lessons by started_at for easy extraction of chronological info
            lessons.sort((a,b)=>a[0]<b[0]?-1:1);
            return [forecast, lessons];
        });
    }

    // Find implicit level up dates by looking at when items were unlocked
    function get_level_ups(lessons) {
        // Prepare level array
        let levels = new Array(61).fill(null).map(_=>{return {}});
        // Group unlocked items within each level by unlock date
        for (let [start, id, level, unlock] of lessons) {
            let date_string = new Date(unlock).toDateString();
            if (!levels[level][date_string]) levels[level][date_string] = 0;
            levels[level][date_string]++;
        }
        // Discard dates with fewer than 20 unlocked items, then pick the earliest date remaining
        for (let [level, dates] of Object.entries(levels)) {
            for (let [date, count] of Object.entries(dates)) if (count < 20) delete levels[level][date];
            levels[level] = Math.min(...Object.keys(dates).map(date=>Date.parse(date)));
        }
        // Remove the 0th level entry
        levels.shift(1);
        return levels;
    }

    // Finds streaks
    function get_streaks(type, data) {
        let settings = wkof.settings[script_id];
        let day_start_adjust = 60*60*1000*settings.general.day_start;
        let streaks = {}, zeros = {};
        for (let day = new Date(Math.max(data[0][0], Date.parse(settings.general.start_date))-day_start_adjust); day <= new Date().setHours(24); day.setDate(day.getDate()+1)) {
            streaks[day.toDateString()] = 0;
            zeros[day.toDateString()] = true;
        }
        for (let [date] of data) streaks[new Date(date-day_start_adjust).toDateString()] = 1;
        if (type === "lessons" && settings.lessons.count_zeros) {
            for (let [started_at, id, level, unlocked_at] of data) {
                for (let day = new Date(unlocked_at-day_start_adjust); day <= new Date(started_at-day_start_adjust); day.setDate(day.getDate()+1)) {
                    delete zeros[day.toDateString()];
                }
            }
            for (let date of Object.keys(zeros)) streaks[date] = 1;
        }
        let streak = 0;
        for (let day = new Date(Math.max(data[0][0], Date.parse(settings.general.start_date))-day_start_adjust); day <= new Date().setHours(24); day.setDate(day.getDate()+1)) {
            if (streaks[day.toDateString()] === 1) streak++;
            else streak = 0;
            streaks[day.toDateString()] = streak;
        }
        return streaks;
    }

    // Calculate overall stats for lessons and reviews
    function calculate_stats(type, data) {
        let settings = wkof.settings[script_id];
        let streaks = get_streaks(type, data);
        let longest_streak = Math.max(...Object.values(streaks));
        let current_streak = streaks[new Date(Date.now()-60*60*1000*settings.general.day_start).toDateString()];
        let ms_day = 24*60*60*1000;
        let stats = {
            total: [0, 0, 0, 0, 0], // [total, year, month, week, day]
            days_studied: [0, 0],   // [days studied, percentage]
            average: [0, 0, 0],     // [average, per studied, standard deviation]
            streak: [longest_streak, current_streak],
            sessions: 0,            // Number of sessions
            time: [0, 0, 0, 0, 0],  // [total, year, month, week, day]
            days: 0,                // Number of days since first review
            max_done: [0, 0],       // Max done in one day [count, date]
            streaks,
        };
        let last_day = new Date(0);
        let today = new Date();
        let week = new Date(new Date(Date.parse(new Date().toDateString())-(new Date().getDay()+6-settings.general.week_start)%7*ms_day+ms_day/2).toDateString());
        let month = new Date(today.getFullYear()+'-'+(today.getMonth()+1)+'-01');
        let year = new Date('Jan ' + today.getFullYear());
        let last_time = 0;
        let done_day = 0;
        let done_days = [];
        let start_date = new Date(settings.general.start_date);
        for (let item of data) {
            let day = new Date(item[0]-ms_day/24*settings.general.day_start);
            if (day < start_date) continue;
            if (last_day.toDateString() != day.toDateString()) {
                stats.days_studied[0]++;
                done_days.push(done_day);
                done_day = 0;
            }
            done_day++;
            if (done_day > stats.max_done[0]) stats.max_done = [done_day, day.toDateString().replace(/... /, '')];
            let minutes = (item[0]-last_time)/60000;
            if (minutes > settings.general.session_limit) {
                stats.sessions++;
                minutes = 0;
            }
            stats.total[0]++;
            stats.time[0] += minutes;
            if (year < day) {
                stats.total[1]++;
                stats.time[1] += minutes;
            }
            if (month < day) {
                stats.total[2]++;
                stats.time[2] += minutes;
            }
            if (week < day) {
                stats.total[3]++;
                stats.time[3] += minutes;
            }
            if (today.toDateString() == day.toDateString()) {
                stats.total[4]++;
                stats.time[4] += minutes;
            }
            last_day = day;
            last_time = item[0];
        }
        done_days.push(done_day); // Assumes users has done reviews today
        stats.days = Math.round((Date.parse(new Date().toDateString())-Math.max(Date.parse(new Date(data[0][0]).toDateString()), Date.parse(settings.general.start_date)))/ms_day)+1;
        stats.days_studied[1] = Math.round(stats.days_studied[0]/stats.days*100);
        stats.average[0] = Math.round(stats.total[0]/stats.days);
        stats.average[1] = Math.round(stats.total[0]/stats.days_studied[0]);
        stats.average[2] = Math.sqrt(1/stats.days_studied[0]*done_days.map(x=>Math.pow(x-stats.average[1], 2)).reduce((a,b)=>a+b));
        return stats;
    }

    /*-------------------------------------------------------------------------------------------------------------------------------*/

    // Returns the kanij for the day
    function kanji_day(day) {return ['日', '月', '火', '水', '木', '金', '土'][day]};
    // Filter for WKOF's get_items()
    wkof.wait_state('wkof.ItemData.registry', 'ready').then(()=>{wkof.ItemData.registry.sources.wk_items.filters.subject_ids = {filter_func: (ids, item)=>ids.includes(item.id)};});
    // Converts minutes to a timestamp string "#h #m"
    function m_to_hm(minutes) {return Math.floor(minutes/60)+'h '+Math.floor(minutes%60)+'m';}
    // Adds thousand separators to numbers. 1000000 → "1,000,000"
    Number.prototype.toSeparated = function(separator=",") {return this.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator)}
    // Capitalizes the first character in a string. "proper" → "Proper"
    String.prototype.toProper = function() {return this.slice(0,1).toUpperCase()+this.slice(1)}
    // Returns a hex color between the left and right hex colors
    function interpolate_color(left, right, index) {
        left = hex_to_rgb(left); right = hex_to_rgb(right);
        let result = [0, 0, 0];
        for (let i = 0; i < 3; i++) result[i] = Math.round(left[i] + index * (right[i] - left[i]));
        return rgb_to_hex(result);
    };
    // Converts a hex color to rgb
    function hex_to_rgb(hex) {
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
    }
    // Converts an rgb color to hex
    function rgb_to_hex(cols) {
        let rgb = cols[2] | (cols[1] << 8) | (cols[0] << 16);
        return '#' + (0x1000000 + rgb).toString(16).slice(1)
    }
    // Inverse cumulative distribution function
    function icdf(p, mean, sd) {
        // Inverse error function
        function inverf(x) {
            let sign = (x >= 0) ? 1 : -1;
            let a = ((8*(Math.PI - 3)) / ((3*Math.PI)*(4 - Math.PI)));
            let b  = Math.log(1-x*x);
            let c = Math.sqrt(Math.sqrt(Math.pow(((2 / Math.PI / a) + (b / 2)), 2) - b / a) - (2 / Math.PI / a) - (b / 2) );
            return sign * c ;
        }
        return Math.sqrt(2)*inverf(2*p-1)*sd+mean;
    }
    function validate_start_date(date) {return new Date(date) !== "Invalid Date"}
})(window.jQuery, window.wkof, window.review_cache, window.Heatmap);
