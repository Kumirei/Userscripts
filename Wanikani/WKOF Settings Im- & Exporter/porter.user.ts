// ==UserScript==
// @name         Wanikani: Settings Exporter & Importer
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Imports and exports your WKOF settings
// @author       Kumirei
// @include      /^https://(www|preview).wanikani.com/(dashboard)?/
// @grant        none
// @license      MIT
// ==/UserScript==

// These lines are necessary to make sure that TSC does not put any exports in the
// compiled js, which causes the script to crash
const module = {}
export = null

// Import types
import { WKOF, Menu, Settings } from '../WKOF Types/wkof'

// We have to extend the global window object since the values are already present
// and we don't provide them ourselves
declare global {
    interface Window {
        // @ts-ignore
        wkof: WKOF & Menu & Settings
        $: JQueryStatic
        WaniKani: any
    }
}

;(async () => {
    // Script info
    const script_id = 'settings_exporter'
    const script_name = 'WKOF Settings Exporter'

    // Globals
    const { wkof } = window
    type settings = { [key: string]: { [key: string]: any } }
    const porter = {
        available_scripts: [] as string[],
        exported_settings: '{}',
        imported_settings: {} as settings,
        dialog: $() as JQuery,
    }

    // Init
    confirm_wkof()
    wkof.include('Menu,Settings')
    wkof.ready('Menu,Settings').then(install_menu).then(install_css)

    // Makes sure that WKOF is installed
    async function confirm_wkof(): Promise<void> {
        if (!wkof) {
            let response = confirm(
                `${script_name} requires WaniKani Open Framework.\nClick "OK" to be forwarded to installation instructions.`,
            )
            if (response) {
                window.location.href =
                    'https://community.wanikani.com/t/instructions-installing-wanikani-open-framework/28549'
            }
        }
    }

    // Installs the options button in the menu
    function install_menu() {
        const config = {
            name: script_id,
            submenu: 'Open',
            title: script_name,
            on_click: open_settings,
        }
        wkof.Menu.insert_script_link(config)
    }

    // Opens settings dialogue when button is pressed
    function open_settings() {
        porter.available_scripts = get_script_ids()

        const config: Settings.Config = {
            script_id,
            title: script_name,
            pre_open: settings_pre_open,
            content: {
                export: {
                    type: 'page',
                    label: 'Export',
                    content: {
                        select_scripts_export: {
                            type: 'list',
                            default: {},
                            multi: true,
                            full_width: true,
                            size: 10,
                            label: 'Select Scripts',
                            hover_tip: `Choose which scripts' settings to export`,
                            content: Object.fromEntries(
                                porter.available_scripts.map((id) => [id, prettify_script_id(id)]),
                            ),
                            on_change: export_settings,
                        },
                        settings_string: {
                            type: 'html',
                            html:
                                `<div class="row full">` +
                                `   <div class="left"><label>Settings string</label></div>` +
                                `   <div class="right">` +
                                `       <textarea disabled id="exported_script_settings" placeholder="Your exported settings will appear here"/>` +
                                `   </div>` +
                                `</div>`,
                        },
                        buttons: {
                            type: 'html',
                            html:
                                `<div class="porter_buttons">` +
                                `<button type="button" action="copy" class="ui-button ui-corner-all ui-widget" title="Copy the settings string to your clipboard">COPY</button>` +
                                `<button type="button" action="save" class="ui-button ui-corner-all ui-widget" title="Save the settings to a file">SAVE</button>` +
                                `</div>`,
                        },
                    },
                },
                import: {
                    type: 'page',
                    label: 'Import',
                    content: {
                        settings_string: {
                            type: 'html',
                            html:
                                `<div class="row full">` +
                                `   <div class="left"><label>Settings string</label></div>` +
                                `   <div class="right">` +
                                `       <textarea id="import_script_settings" placeholder="Paste your exported settings here or load settings from a file below"/>` +
                                `   </div>` +
                                `</div>`,
                        },
                        load_button: {
                            type: 'html',
                            html:
                                `<div class="row full">` +
                                `   <div class="left"><label>(or) Load from file</label></div>` +
                                `   <div class="right"><input type="file" action="load" id="import_file"></div` +
                                `</div>`,
                        },
                        import_error: {
                            type: 'html',
                            html:
                                `<div class="row full">` +
                                `   <div id="import_error">There was an error reading the settings</div>` +
                                `</div>`,
                        },
                        select_scripts_import: {
                            type: 'list',
                            default: {},
                            multi: true,
                            size: 10,
                            full_width: true,
                            label: 'Select Scripts',
                            hover_tip: `Choose which scripts' settings to import`,
                            content: {},
                        },
                        import_button: {
                            type: 'html',
                            html: `<div class="porter_buttons"><span class="success hidden">Success!</span><button type="button" action="import" class="ui-button ui-corner-all ui-widget" title="WARNING: This will override any existing settings for the selected scripts">IMPORT</button></div>`,
                        },
                    },
                },
            },
        }

        const settings_dialog = new wkof.Settings(config)
        settings_dialog.open()
    }

    // Retrieves a list of the available script
    function get_script_ids(): string[] {
        return Object.keys(wkof.file_cache.dir)
            .filter((key) => /^wkof.settings..+/.test(key))
            .map((name) => name.replace('wkof.settings.', ''))
    }

    // Makes the script ids a bit more user friendly
    function prettify_script_id(id: string): string {
        return id
            .split(/[._]/)
            .map((word) => word[0].toUpperCase() + word.substring(1))
            .join(' ')
    }

    // Add functionality to buttons and pasting settings
    function settings_pre_open(dialog: JQuery) {
        porter.dialog = dialog
        dialog.on('click', 'button', handle_button_press)
        dialog.on('keyup', '#import_script_settings', handle_settings_paste)
        dialog.on('change', '#import_file', import_from_file)
    }

    // Handles the button actions
    function handle_button_press(e: any) {
        const action = e.currentTarget.attributes.action.value
        switch (action) {
            case 'copy':
                navigator.clipboard.writeText(porter.exported_settings)
                break
            case 'save':
                download(porter.exported_settings, `WKOF_settings_export_${new Date().toDateString()}.txt`)
                break
            case 'import':
                const selected = porter.dialog.find('[name="select_scripts_import"] :selected')
                const scripts: string[] = []
                // @ts-ignore
                selected.each((i, elem) => scripts.push(elem.value))
                import_settings(scripts)
                break
        }
    }

    // Reads the settings into WKOF
    function import_settings(scripts: string[]): void {
        for (const script of scripts) {
            wkof.file_cache.save(`wkof.settings.${script}`, porter.imported_settings[script])
        }

        // Show success message
        porter.dialog.find('span.success').removeClass('hidden')
    }

    // Lets the user select a file to read for import
    function import_from_file(e: any) {
        const file = e.currentTarget.files[0]
        if (file.type !== 'text/plain') toggle_error_message(true)
        const reader = new FileReader()
        reader.readAsText(file)
        reader.onload = () => {
            import_from_text((reader.result as string) ?? '')
        }
        reader.onerror = () => {
            toggle_error_message(true)
        }
    }

    // Parses the the imported settings string
    function handle_settings_paste(e: any) {
        import_from_text(e.currentTarget.value)
    }

    // Imports from text
    function import_from_text(text: string): void {
        let settings: settings
        try {
            settings = JSON.parse(text)
            toggle_error_message(false)
            populate_import_selection(settings)
            porter.imported_settings = settings
        } catch (error) {
            toggle_error_message(true)
            return populate_import_selection({})
        }
    }

    // Shows or hides the error message
    function toggle_error_message(on: boolean): void {
        porter.dialog.attr('import_error', String(on))
    }

    // Populates the selection of which script settings to import
    function populate_import_selection(settings: settings): void {
        const elem = porter.dialog.find('[name="select_scripts_import"]')
        let html = ''
        for (let script of Object.keys(settings))
            html += `<option value="${script}">${prettify_script_id(script)}</option>`
        elem.html(html)
    }

    // Exports the selected setting to a string and puts them in the textarea
    async function export_settings(name: string, scripts: { [key: string]: boolean }) {
        const to_export = Object.entries(scripts)
            .filter(([script, selected]) => selected)
            .map(([script]) => script)
        const settings = await load_script_settings(to_export)
        porter.exported_settings = JSON.stringify(settings)
        $('#exported_script_settings').val(porter.exported_settings)
    }

    // Loads the settings of a list of scripts
    async function load_script_settings(scripts: string[]): Promise<settings> {
        const settings: settings = {}
        for (let script of scripts) {
            settings[script] = await wkof.Settings.load(script)
        }
        return settings
    }

    // Starts a download for a file
    function download(text: string, name: string): void {
        const c = document.createElement('a')
        c.download = name
        const file = new Blob([text], { type: 'text/plain' })
        c.href = window.URL.createObjectURL(file)
        c.click()
    }

    // Installs the css
    function install_css() {
        const css = `
#wkof_ds #wkofs_settings_exporter .porter_buttons {
    display: flex;
    justify-content: right;
    gap: 0.4em;
}

#wkof_ds #wkofs_settings_exporter #import_error {
    line-height: 1em;
    margin-top: 0.4em;
    color: red;
    display: none;
}


#wkof_ds #wkofs_settings_exporter .success {
    line-height: 1.5em;
    color: green;
}


#wkof_ds #wkofs_settings_exporter textarea { 
    min-height: 5em;
    max-width: 100%;
}

#wkof_ds #wkofs_settings_exporter .porter_buttons_top { margin-bottom: 0.4em; }
#wkof_ds [aria-describedby="wkofs_settings_exporter"] .ui-dialog-buttonpane { display: none; }
#wkof_ds #wkofs_settings_exporter[import_error="true"] #import_error { display: block; }
#wkof_ds #wkofs_settings_exporter #import_file { padding-left: 0; }
#wkof_ds #wkofs_settings_exporter select { overflow: auto; }
`

        $('head').append(`<style id="import-export-css">${css}</style>`)
    }
})()
