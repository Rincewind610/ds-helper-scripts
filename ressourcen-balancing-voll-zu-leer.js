/*
=======================================
DS Helper
Name: Ressourcen Balancing Voll zu Leer
Version: 0.4.0
Kategorie: Produktion
Autor: Rincewind610

Funktion:
Liest alle Dörfer aus der Produktionsübersicht
einschließlich Ressourcen, Lagerkapazität und
verfügbarer Händler ein.

Die eigentliche Balancing-Funktion folgt in
einer späteren Version.
=======================================
*/

(function () {
    'use strict';

    const SCRIPT_NAME = 'DS Helper';
    const SCRIPT_TITLE = 'Ressourcen Balancing Voll zu Leer';
    const VERSION = '0.4.0';

    const WINDOW_ID = 'dshelper-resource-balancing';
    const STYLE_ID = 'dshelper-resource-balancing-style';

    const state = {
        villages: []
    };

    const urlParams = new URLSearchParams(window.location.search);

    if (
        typeof game_data === 'undefined' ||
        game_data.screen !== 'overview_villages' ||
        urlParams.get('mode') !== 'prod'
    ) {
        UI.ErrorMessage(
            'Bitte zuerst die Produktionsübersicht öffnen.',
            4000
        );

        return;
    }

    start();

    /**
     * Startet das Skript.
     */
    async function start() {
        createInterface();

        await readVillages();
    }

    /**
     * Liest alle Dörfer erneut ein.
     */
    async function readVillages() {
        disableReloadButton(true);

        setStatus(
            'Produktionsübersicht wird eingelesen …'
        );

        clearVillageTable();

        try {
            state.villages = await loadAllVillages();

            updateSummary(state.villages);
            renderVillageTable(state.villages);

            setStatus(
                `${state.villages.length} Dörfer wurden erfolgreich eingelesen.`,
                'success'
            );

            console.log(
                `${SCRIPT_TITLE} ${VERSION}`,
                state.villages
            );
        } catch (error) {
            console.error(error);

            setStatus(
                `Fehler: ${error.message}`,
                'error'
            );

            UI.ErrorMessage(
                'Die Produktionsübersicht konnte nicht vollständig eingelesen werden.',
                6000
            );
        } finally {
            disableReloadButton(false);
        }
    }

    /**
     * Lädt alle Seiten der Produktionsübersicht.
     */
    async function loadAllVillages() {
        const firstPageUrl =
            game_data.link_base_pure +
            'overview_villages&mode=prod&page=0';

        const firstPageHtml =
            await loadPage(firstPageUrl);

        const pageUrls =
            getPageUrls(firstPageHtml, firstPageUrl);

        const villages = [];
        const knownVillageIds = new Set();

        for (
            let pageIndex = 0;
            pageIndex < pageUrls.length;
            pageIndex++
        ) {
            setStatus(
                `Lese Seite ${pageIndex + 1} von ${pageUrls.length} …`
            );

            const html =
                pageIndex === 0
                    ? firstPageHtml
                    : await loadPage(pageUrls[pageIndex]);

            const pageVillages =
                parseVillages(html);

            pageVillages.forEach(village => {
                if (knownVillageIds.has(village.id)) {
                    return;
                }

                knownVillageIds.add(village.id);
                villages.push(village);
            });

            if (pageIndex < pageUrls.length - 1) {
                await wait(200);
            }
        }

        return villages;
    }

    /**
     * Ermittelt alle Seitenadressen der Übersicht.
     */
    function getPageUrls(html, firstPageUrl) {
        const documentObject = parseHtml(html);
        const urls = new Set([firstPageUrl]);

        documentObject
            .querySelectorAll(
                '.paged-nav-item[href], ' +
                '.paged-nav-item option[value], ' +
                '.paged-nav-item-container option[value], ' +
                'select[name="page"] option[value]'
            )
            .forEach(element => {
                const value =
                    element.getAttribute('href') ||
                    element.getAttribute('value');

                if (!value) {
                    return;
                }

                try {
                    const url = new URL(
                        value,
                        window.location.origin
                    );

                    if (
                        url.searchParams.get('screen') ===
                        'overview_villages'
                    ) {
                        url.searchParams.set('mode', 'prod');
                        urls.add(url.href);
                    }
                } catch (error) {
                    console.warn(
                        'Ungültige Seitenadresse:',
                        value
                    );
                }
            });

        return Array.from(urls).sort(
            (urlA, urlB) =>
                getPageNumber(urlA) -
                getPageNumber(urlB)
        );
    }

    /**
     * Liest die Seitennummer aus einer URL.
     */
    function getPageNumber(url) {
        try {
            return Number(
                new URL(url).searchParams.get('page') || 0
            );
        } catch (error) {
            return 0;
        }
    }

    /**
     * Liest alle Dorfzeilen einer Produktionsseite aus.
     */
    function parseVillages(html) {
        const documentObject = parseHtml(html);

        const rows = Array.from(
            documentObject.querySelectorAll(
                '#production_table tr.row_a, ' +
                '#production_table tr.row_b'
            )
        );

        const villages = [];

        rows.forEach(row => {
            try {
                const village = parseVillageRow(row);

                if (village) {
                    villages.push(village);
                }
            } catch (error) {
                console.warn(
                    'Dorfzeile konnte nicht gelesen werden:',
                    row,
                    error
                );
            }
        });

        return villages;
    }

    /**
     * Wandelt eine Dorfzeile in ein Dorfobjekt um.
     */
    function parseVillageRow(row) {
        const villageElement =
            row.querySelector('.quickedit-vn');

        const labelElement =
            row.querySelector('.quickedit-label');

        const woodElement =
            row.querySelector('.res.wood, .wood');

        const stoneElement =
            row.querySelector('.res.stone, .stone');

        const ironElement =
            row.querySelector('.res.iron, .iron');

        const merchantElement =
            row.querySelector('a[href*="market"]');

        if (
            !villageElement ||
            !labelElement ||
            !woodElement ||
            !stoneElement ||
            !ironElement ||
            !merchantElement
        ) {
            return null;
        }

        const id =
            villageElement.getAttribute('data-id');

        const fullLabel =
            labelElement.textContent.trim();

        const coordMatch =
            fullLabel.match(/\d{3}\|\d{3}/);

        if (!id || !coordMatch) {
            return null;
        }

        const coord = coordMatch[0];

        const resourcesCell =
            woodElement.closest('td');

        if (!resourcesCell) {
            return null;
        }

        const storageCell =
            resourcesCell.nextElementSibling;

        const merchantText =
            merchantElement.textContent.trim();

        const merchantParts =
            merchantText.split('/');

        const wood =
            parseGameNumber(woodElement.textContent);

        const stone =
            parseGameNumber(stoneElement.textContent);

        const iron =
            parseGameNumber(ironElement.textContent);

        const storage =
            parseGameNumber(storageCell?.textContent);

        const merchants =
            parseGameNumber(merchantParts[0]);

        const merchantsTotal =
            parseGameNumber(merchantParts[1]);

        if (storage <= 0) {
            return null;
        }

        const totalResources =
            wood + stone + iron;

        const fill =
            totalResources /
            (storage * 3) *
            100;

        return {
            id: String(id),

            name: getVillageName(
                fullLabel,
                coord
            ),

            fullLabel,
            coord,

            resources: {
                wood,
                stone,
                iron
            },

            storage,
            merchants,
            merchantsTotal,

            totalResources,
            fill
        };
    }

    /**
     * Entfernt Koordinate und Kontinent aus dem Dorfnamen.
     */
    function getVillageName(fullLabel, coord) {
        return fullLabel
            .replace(`(${coord})`, '')
            .replace(/\s+K\d+\s*$/, '')
            .trim();
    }

    /**
     * Lädt eine Seite aus Die Stämme.
     */
    async function loadPage(url) {
        const response = await fetch(url, {
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(
                `HTTP-Fehler ${response.status}`
            );
        }

        return response.text();
    }

    /**
     * Erstellt das Hauptfenster.
     */
    function createInterface() {
        $(`#${WINDOW_ID}`).remove();
        $(`#${STYLE_ID}`).remove();

        injectStyles();

        $('body').append(`
            <div id="${WINDOW_ID}">
                <div class="dshelper-header">
                    <span>
                        ${SCRIPT_NAME} – ${SCRIPT_TITLE}
                    </span>

                    <button
                        type="button"
                        class="dshelper-close"
                        title="Fenster schließen"
                    >
                        ✖
                    </button>
                </div>

                <div class="dshelper-content">
                    <div class="dshelper-toolbar">
                        <button
                            type="button"
                            class="btn dshelper-reload"
                        >
                            Dörfer neu einlesen
                        </button>

                        <span class="dshelper-version">
                            Version ${VERSION}
                        </span>
                    </div>

                    <div class="dshelper-summary">
                        <div>
                            <span>Dörfer</span>
                            <strong id="dshelper-village-count">
                                –
                            </strong>
                        </div>

                        <div>
                            <span>Ressourcen gesamt</span>
                            <strong id="dshelper-resource-total">
                                –
                            </strong>
                        </div>

                        <div>
                            <span>Freie Händler</span>
                            <strong id="dshelper-merchant-total">
                                –
                            </strong>
                        </div>
                    </div>

                    <div class="dshelper-status">
                        Bereit.
                    </div>

                    <div class="dshelper-table-wrapper">
                        <table class="dshelper-table">
                            <thead>
                                <tr>
                                    <th>Nr.</th>
                                    <th>Dorf</th>
                                    <th>Holz</th>
                                    <th>Lehm</th>
                                    <th>Eisen</th>
                                    <th>Gesamt</th>
                                    <th>Lager</th>
                                    <th>Händler</th>
                                    <th>Füllstand</th>
                                </tr>
                            </thead>

                            <tbody id="dshelper-village-table">
                                <tr>
                                    <td colspan="9">
                                        Noch keine Dörfer eingelesen.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `);

        $(`#${WINDOW_ID} .dshelper-close`).on(
            'click',
            function () {
                $(`#${WINDOW_ID}`).remove();
            }
        );

        $(`#${WINDOW_ID} .dshelper-reload`).on(
            'click',
            readVillages
        );

        if ($.fn.draggable) {
            $(`#${WINDOW_ID}`).draggable({
                handle: '.dshelper-header'
            });
        }
    }

    /**
     * Zeigt die eingelesenen Dörfer in der Tabelle.
     */
    function renderVillageTable(villages) {
        const tableBody =
            document.getElementById(
                'dshelper-village-table'
            );

        if (!tableBody) {
            return;
        }

        if (villages.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9">
                        Keine Dörfer gefunden.
                    </td>
                </tr>
            `;

            return;
        }

        tableBody.innerHTML = villages
            .map((village, index) => {
                return `
                    <tr>
                        <td>${index + 1}</td>

                        <td class="dshelper-village">
                            <a
                                href="${game_data.link_base_pure}info_village&id=${village.id}"
                                target="_blank"
                            >
                                ${escapeHtml(village.coord)}
                            </a>

                            <small title="${escapeHtml(village.fullLabel)}">
                                ${escapeHtml(village.name)}
                            </small>
                        </td>

                        <td>
                            ${formatNumber(village.resources.wood)}
                        </td>

                        <td>
                            ${formatNumber(village.resources.stone)}
                        </td>

                        <td>
                            ${formatNumber(village.resources.iron)}
                        </td>

                        <td>
                            ${formatNumber(village.totalResources)}
                        </td>

                        <td>
                            ${formatNumber(village.storage)}
                        </td>

                        <td>
                            <strong>
                                ${formatNumber(village.merchants)}
                            </strong>
                            /
                            ${formatNumber(village.merchantsTotal)}
                        </td>

                        <td>
                            <strong>
                                ${formatPercent(village.fill)}
                            </strong>
                        </td>
                    </tr>
                `;
            })
            .join('');
    }

    /**
     * Aktualisiert die Zusammenfassung.
     */
    function updateSummary(villages) {
        const totalResources =
            villages.reduce(
                (sum, village) =>
                    sum + village.totalResources,
                0
            );

        const totalMerchants =
            villages.reduce(
                (sum, village) =>
                    sum + village.merchants,
                0
            );

        $('#dshelper-village-count')
            .text(formatNumber(villages.length));

        $('#dshelper-resource-total')
            .text(formatNumber(totalResources));

        $('#dshelper-merchant-total')
            .text(formatNumber(totalMerchants));
    }

    /**
     * Leert die Dorftabelle.
     */
    function clearVillageTable() {
        $('#dshelper-village-table').html(`
            <tr>
                <td colspan="9">
                    Dörfer werden eingelesen …
                </td>
            </tr>
        `);
    }

    /**
     * Ändert den Statustext.
     */
    function setStatus(message, type = '') {
        const statusElement =
            $(`#${WINDOW_ID} .dshelper-status`);

        statusElement
            .removeClass('success error')
            .addClass(type)
            .text(message);
    }

    /**
     * Aktiviert oder deaktiviert den Einlesen-Button.
     */
    function disableReloadButton(disabled) {
        $(`#${WINDOW_ID} .dshelper-reload`)
            .prop('disabled', disabled);
    }

    /**
     * Wandelt eine Spielzahl in eine JavaScript-Zahl um.
     */
    function parseGameNumber(value) {
        if (
            value === null ||
            value === undefined
        ) {
            return 0;
        }

        const cleanedValue =
            String(value).replace(/[^\d-]/g, '');

        const number =
            Number.parseInt(cleanedValue, 10);

        return Number.isFinite(number)
            ? number
            : 0;
    }

    /**
     * Formatiert eine Zahl im deutschen Zahlenformat.
     */
    function formatNumber(value) {
        return new Intl.NumberFormat(
            'de-DE'
        ).format(Math.round(value));
    }

    /**
     * Formatiert einen Prozentwert.
     */
    function formatPercent(value) {
        return new Intl.NumberFormat(
            'de-DE',
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ).format(value) + ' %';
    }

    /**
     * Schützt Text vor HTML-Einschleusung.
     */
    function escapeHtml(value) {
        const element =
            document.createElement('div');

        element.textContent =
            String(value ?? '');

        return element.innerHTML;
    }

    /**
     * Wandelt HTML-Text in ein Dokument um.
     */
    function parseHtml(html) {
        return new DOMParser().parseFromString(
            html,
            'text/html'
        );
    }

    /**
     * Wartet eine bestimmte Anzahl Millisekunden.
     */
    function wait(milliseconds) {
        return new Promise(resolve => {
            window.setTimeout(
                resolve,
                milliseconds
            );
        });
    }

    /**
     * Fügt das CSS des Fensters ein.
     */
    function injectStyles() {
        $('head').append(`
            <style id="${STYLE_ID}">
                #${WINDOW_ID} {
                    position: fixed;
                    top: 55px;
                    left: 2%;
                    width: 96%;
                    max-height: calc(100vh - 75px);
                    background: #f4e4bc;
                    border: 2px solid #6b4b1b;
                    box-shadow: 0 0 18px rgba(0, 0, 0, .55);
                    color: #222;
                    font-size: 12px;
                    z-index: 999999;
                }

                #${WINDOW_ID} .dshelper-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 9px 12px;
                    background: #6b4b1b;
                    color: #fff;
                    cursor: move;
                    font-weight: bold;
                }

                #${WINDOW_ID} .dshelper-close {
                    padding: 0;
                    border: 0;
                    background: transparent;
                    color: #fff;
                    cursor: pointer;
                    font-size: 17px;
                }

                #${WINDOW_ID} .dshelper-content {
                    padding: 12px;
                }

                #${WINDOW_ID} .dshelper-toolbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 10px;
                }

                #${WINDOW_ID} .dshelper-version {
                    color: #666;
                    font-size: 11px;
                }

                #${WINDOW_ID} .dshelper-summary {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1px;
                    margin-bottom: 10px;
                    background: #8d6c34;
                    border: 1px solid #8d6c34;
                }

                #${WINDOW_ID} .dshelper-summary div {
                    padding: 8px;
                    background: #ead5a3;
                    text-align: center;
                }

                #${WINDOW_ID} .dshelper-summary span,
                #${WINDOW_ID} .dshelper-summary strong {
                    display: block;
                }

                #${WINDOW_ID} .dshelper-summary strong {
                    margin-top: 3px;
                    font-size: 16px;
                }

                #${WINDOW_ID} .dshelper-status {
                    margin-bottom: 10px;
                    padding: 9px;
                    background: #fff;
                    border: 1px solid #c2b28c;
                }

                #${WINDOW_ID} .dshelper-status.success {
                    background: #dff0d8;
                    border-color: #75a66a;
                }

                #${WINDOW_ID} .dshelper-status.error {
                    background: #f2dede;
                    border-color: #b96b6b;
                }

                #${WINDOW_ID} .dshelper-table-wrapper {
                    max-height: calc(100vh - 265px);
                    overflow: auto;
                    border: 1px solid #8d6c34;
                }

                #${WINDOW_ID} .dshelper-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: #fff8df;
                }

                #${WINDOW_ID} .dshelper-table th {
                    position: sticky;
                    top: 0;
                    z-index: 2;
                    padding: 7px 5px;
                    background: #c1a264;
                    border: 1px solid #8f743f;
                    white-space: nowrap;
                }

                #${WINDOW_ID} .dshelper-table td {
                    padding: 6px 5px;
                    border: 1px solid #c7b58a;
                    text-align: right;
                    white-space: nowrap;
                }

                #${WINDOW_ID} .dshelper-table td:first-child,
                #${WINDOW_ID} .dshelper-table td:nth-child(2) {
                    text-align: left;
                }

                #${WINDOW_ID} .dshelper-table tbody tr:nth-child(even) {
                    background: #f2e6c8;
                }

                #${WINDOW_ID} .dshelper-table tbody tr:hover {
                    background: #ddd0aa;
                }

                #${WINDOW_ID} .dshelper-village small {
                    display: block;
                    max-width: 260px;
                    margin-top: 2px;
                    overflow: hidden;
                    color: #666;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-size: 10px;
                }
            </style>
        `);
    }
})();
