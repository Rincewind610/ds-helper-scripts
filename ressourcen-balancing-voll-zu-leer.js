/*
=======================================
DS Helper
Name: Ressourcen Balancing Voll zu Leer
Version: 0.3.0
Kategorie: Produktion
Autor: Rincewind610

Funktion:
Verteilt Ressourcen vom jeweils vollsten
Dorf zum jeweils leersten Dorf.
=======================================
*/

(function () {
    'use strict';

    const SCRIPT_NAME = 'DS Helper';
    const SCRIPT_TITLE = 'Ressourcen Balancing Voll zu Leer';
    const VERSION = '0.3.0';

    const WINDOW_ID = 'dshelper-resource-balancing';
    const STYLE_ID = 'dshelper-resource-balancing-style';

    // ----------------------------------------------------
    // Prüfung der aktuellen Seite
    // ----------------------------------------------------

    const urlParams = new URLSearchParams(window.location.search);

    if (
        game_data.screen !== 'overview_villages' ||
        urlParams.get('mode') !== 'prod'
    ) {
        UI.ErrorMessage(
            'Bitte zuerst die Produktionsübersicht öffnen.',
            4000
        );
        return;
    }

    // ----------------------------------------------------
    // Start
    // ----------------------------------------------------

    start();

    async function start() {
        createInterface();
        setStatus('Produktionsübersicht wird eingelesen …');

        try {
            const villages = await loadAllVillages();

            setStatus(
                `${villages.length} Dörfer wurden erfolgreich eingelesen.`,
                'success'
            );

            $('#dshelper-village-count').text(villages.length);

            console.log(
                `${SCRIPT_TITLE}: ${villages.length} Dörfer gefunden.`,
                villages
            );
        } catch (error) {
            console.error(error);

            setStatus(
                `Fehler: ${error.message}`,
                'error'
            );

            UI.ErrorMessage(
                'Die Produktionsübersicht konnte nicht vollständig eingelesen werden.',
                5000
            );
        }
    }

    // ----------------------------------------------------
    // Produktionsübersicht einlesen
    // ----------------------------------------------------

    async function loadAllVillages() {
        const firstPageUrl =
            game_data.link_base_pure +
            'overview_villages&mode=prod&page=0';

        const firstPageHtml = await loadPage(firstPageUrl);
        const pageUrls = getPageUrls(firstPageHtml, firstPageUrl);

        const villages = [];
        const knownVillageIds = new Set();

        for (let index = 0; index < pageUrls.length; index++) {
            setStatus(
                `Lese Seite ${index + 1} von ${pageUrls.length} …`
            );

            const html =
                index === 0
                    ? firstPageHtml
                    : await loadPage(pageUrls[index]);

            const pageVillages = parseVillages(html);

            pageVillages.forEach(village => {
                if (!knownVillageIds.has(village.id)) {
                    knownVillageIds.add(village.id);
                    villages.push(village);
                }
            });

            await wait(200);
        }

        return villages;
    }

    function getPageUrls(html, firstPageUrl) {
        const documentObject = parseHtml(html);
        const pageUrls = new Set([firstPageUrl]);

        const pageSelect = documentObject.querySelector(
            '.paged-nav-item select, ' +
            '.paged-nav-item-container select, ' +
            'select[name="page"]'
        );

        if (pageSelect) {
            Array.from(pageSelect.options).forEach(option => {
                if (!option.value) {
                    return;
                }

                pageUrls.add(
                    new URL(
                        option.value,
                        window.location.origin
                    ).href
                );
            });
        }

        documentObject
            .querySelectorAll('.paged-nav-item[href]')
            .forEach(link => {
                const href = link.getAttribute('href');

                if (!href) {
                    return;
                }

                pageUrls.add(
                    new URL(
                        href,
                        window.location.origin
                    ).href
                );
            });

        return Array.from(pageUrls).sort((urlA, urlB) => {
            return getPageNumber(urlA) - getPageNumber(urlB);
        });
    }

    function getPageNumber(url) {
        try {
            return Number(
                new URL(url).searchParams.get('page') || 0
            );
        } catch (error) {
            return 0;
        }
    }

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
            const villageElement =
                row.querySelector('.quickedit-vn');

            if (!villageElement) {
                return;
            }

            const id =
                villageElement.getAttribute('data-id');

            const villageName =
                villageElement.textContent.trim();

            const coordMatch =
                villageName.match(/\d{3}\|\d{3}/);

            if (!id || !coordMatch) {
                return;
            }

            villages.push({
                id: String(id),
                name: villageName,
                coord: coordMatch[0]
            });
        });

        return villages;
    }

    async function loadPage(url) {
        const response = await fetch(url, {
            credentials: 'same-origin'
        });

        if (!response.ok) {
            throw new Error(
                `Seite konnte nicht geladen werden: HTTP ${response.status}`
            );
        }

        return response.text();
    }

    function parseHtml(html) {
        return new DOMParser().parseFromString(
            html,
            'text/html'
        );
    }

    function wait(milliseconds) {
        return new Promise(resolve => {
            window.setTimeout(resolve, milliseconds);
        });
    }

    // ----------------------------------------------------
    // Benutzeroberfläche
    // ----------------------------------------------------

    function createInterface() {
        $(`#${WINDOW_ID}`).remove();
        $(`#${STYLE_ID}`).remove();

        $('head').append(`
            <style id="${STYLE_ID}">
                #${WINDOW_ID} {
                    position: fixed;
                    top: 80px;
                    left: 80px;
                    width: 500px;
                    background: #f4e4bc;
                    border: 2px solid #6b4b1b;
                    box-shadow: 0 0 15px rgba(0, 0, 0, .5);
                    color: #222;
                    font-size: 13px;
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
                    cursor: pointer;
                    font-size: 17px;
                }

                #${WINDOW_ID} .dshelper-content {
                    padding: 15px;
                }

                #${WINDOW_ID} .dshelper-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 15px;
                    padding: 10px;
                    background: #ead5a3;
                    border: 1px solid #b99a5d;
                }

                #${WINDOW_ID} .dshelper-info strong {
                    font-size: 18px;
                }

                #${WINDOW_ID} .dshelper-status {
                    padding: 10px;
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

                #${WINDOW_ID} .dshelper-version {
                    margin-top: 12px;
                    color: #666;
                    font-size: 11px;
                    text-align: right;
                }
            </style>
        `);

        $('body').append(`
            <div id="${WINDOW_ID}">
                <div class="dshelper-header">
                    <span>
                        ${SCRIPT_NAME} – ${SCRIPT_TITLE}
                    </span>

                    <span class="dshelper-close">✖</span>
                </div>

                <div class="dshelper-content">
                    <div class="dshelper-info">
                        <span>Gefundene Dörfer</span>
                        <strong id="dshelper-village-count">–</strong>
                    </div>

                    <div class="dshelper-status">
                        Bereit.
                    </div>

                    <div class="dshelper-version">
                        Version ${VERSION}
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

        if ($.fn.draggable) {
            $(`#${WINDOW_ID}`).draggable({
                handle: '.dshelper-header'
            });
        }
    }

    function setStatus(message, type = '') {
        const statusElement =
            $(`#${WINDOW_ID} .dshelper-status`);

        statusElement
            .removeClass('success error')
            .addClass(type)
            .text(message);
    }
})();
