/*
=======================================
DS Helper
Name: Ressourcen Balancing Voll zu Leer
Version: 1.1.4
Kategorie: Produktion
Autor: Rincewind610

Funktion:
Liest alle Dörfer aus der Produktionsübersicht
einschließlich Ressourcen, Lagerkapazität und
verfügbarer Händler ein.

Die Dörfer werden nach ihrem prozentualen
Lagerfüllstand absteigend sortiert.
=======================================
*/

(function () {
    'use strict';

    const SCRIPT_NAME = 'DS Helper';
    const SCRIPT_TITLE = 'Ressourcen Balancing Voll zu Leer';
    const VERSION = '1.1.4';

    const WINDOW_ID = 'dshelper-resource-balancing';
    const STYLE_ID = 'dshelper-resource-balancing-style';
    const CONFIG = {
    requestDelay: 200,
    sortMode: 'fill',
    merchantCapacity: 1500
};

    const state = {
    villages: [],
    pairs: [],
    transports: [],

    batchSize: loadSavedNumber(
        'dshelperBatchSize',
        50
    ),

    openDelay: loadSavedNumber(
        'dshelperOpenDelay',
        250
    ),

    nextTransportIndex: 0,
    openedTransports: new Set(),
    sendingTransports: new Set()
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

        state.villages.sort((villageA, villageB) => {
            if (villageB.fill !== villageA.fill) {
                return villageB.fill - villageA.fill;
            }

            return (
                villageB.totalResources -
                villageA.totalResources
            );
        });

        state.pairs = createVillagePairs(
            state.villages
        );

        state.transports = state.pairs
        .map(calculateTransportForPair)
        .filter(transport => transport.total > 0)
        .map(transport => {
            transport.status = 'open';

            return transport;
        });

        updateSummary(state.villages);
        renderTransportTable(state.transports);
        updateBatchControls();

        setStatus(
            `${state.villages.length} Dörfer eingelesen und ` +
            `${state.pairs.length} Paarungen berechnet.`,
            'success'
        );

        console.log(
        'Berechnete Transporte:',
        state.transports
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
 * Paart das vollste Dorf mit dem leersten Dorf,
 * das zweitvollste mit dem zweitleersten usw.
 */
function createVillagePairs(villages) {
    const pairs = [];
    const pairCount = Math.floor(
        villages.length / 2
    );

    for (
        let index = 0;
        index < pairCount;
        index++
    ) {
        const sender = villages[index];

        const receiver =
            villages[
                villages.length - 1 - index
            ];

        pairs.push({
            sender,
            receiver,
            fillDifference:
                sender.fill - receiver.fill
        });
    }

    return pairs;
}
/**
 * Berechnet den maximal möglichen Transport für ein Dorfpaar.
 *
 * Die Ressourcen werden bevorzugt in die beim Empfänger
 * am niedrigsten gefüllten Rohstofflager geschickt.
 */
function calculateTransportForPair(pair) {
    const sender = pair.sender;
    const receiver = pair.receiver;

    const merchantCapacity =
        sender.merchants * CONFIG.merchantCapacity

    const resourceNames = [
        'wood',
        'stone',
        'iron'
    ];

    const currentReceiverResources = {
        wood: receiver.resources.wood,
        stone: receiver.resources.stone,
        iron: receiver.resources.iron
    };

    const maximumTransfer = {
        wood: Math.max(
            0,
            Math.min(
                sender.resources.wood,
                receiver.storage -
                    receiver.resources.wood
            )
        ),

        stone: Math.max(
            0,
            Math.min(
                sender.resources.stone,
                receiver.storage -
                    receiver.resources.stone
            )
        ),

        iron: Math.max(
            0,
            Math.min(
                sender.resources.iron,
                receiver.storage -
                    receiver.resources.iron
            )
        )
    };

    const totalPossible =
        maximumTransfer.wood +
        maximumTransfer.stone +
        maximumTransfer.iron;

    const requestedTotal = Math.min(
        merchantCapacity,
        totalPossible
    );

    if (requestedTotal <= 0) {
        return {
            sender,
            receiver,
            wood: 0,
            stone: 0,
            iron: 0,
            total: 0,
            merchants: 0
        };
    }

    /*
     * Ermittelt per Binärsuche den höchsten gemeinsamen
     * Zielbestand, der mit der vorhandenen Händlerkapazität
     * erreicht werden kann.
     */
    let lowerTarget = Math.min(
        currentReceiverResources.wood,
        currentReceiverResources.stone,
        currentReceiverResources.iron
    );

    let upperTarget = receiver.storage;

    while (lowerTarget < upperTarget) {
        const target = Math.ceil(
            (lowerTarget + upperTarget) / 2
        );

        const requiredResources =
            resourceNames.reduce(
                (sum, resourceName) => {
                    const required = Math.max(
                        0,
                        target -
                            currentReceiverResources[
                                resourceName
                            ]
                    );

                    return sum + Math.min(
                        required,
                        maximumTransfer[
                            resourceName
                        ]
                    );
                },
                0
            );

        if (requiredResources <= requestedTotal) {
            lowerTarget = target;
        } else {
            upperTarget = target - 1;
        }
    }

    const transfer = {
        wood: 0,
        stone: 0,
        iron: 0
    };

    resourceNames.forEach(resourceName => {
        transfer[resourceName] = Math.min(
            Math.max(
                0,
                lowerTarget -
                    currentReceiverResources[
                        resourceName
                    ]
            ),
            maximumTransfer[resourceName]
        );
    });

    let transferredTotal =
        transfer.wood +
        transfer.stone +
        transfer.iron;

    let remaining =
        requestedTotal - transferredTotal;

    /*
     * Durch Rundungen können noch wenige Ressourcen übrig sein.
     * Diese gehen erneut an den jeweils niedrigsten Bestand.
     */
    while (remaining > 0) {
        const possibleResources =
            resourceNames
                .filter(resourceName => {
                    return (
                        transfer[resourceName] <
                        maximumTransfer[resourceName]
                    );
                })
                .sort((resourceA, resourceB) => {
                    const finalA =
                        currentReceiverResources[
                            resourceA
                        ] +
                        transfer[resourceA];

                    const finalB =
                        currentReceiverResources[
                            resourceB
                        ] +
                        transfer[resourceB];

                    return finalA - finalB;
                });

        if (possibleResources.length === 0) {
            break;
        }

        const resourceName =
            possibleResources[0];

        transfer[resourceName]++;
        remaining--;
        transferredTotal++;
    }

    const senderAfterTotal =
        sender.totalResources -
        transferredTotal;

    const receiverAfterTotal =
        receiver.totalResources +
        transferredTotal;

    const merchantsRequired = Math.ceil(
        transferredTotal / CONFIG.merchantCapacity
    );
    return {
        sender,
        receiver,

        wood: transfer.wood,
        stone: transfer.stone,
        iron: transfer.iron,

        total: transferredTotal,

        merchants: merchantsRequired,

        sendPayload: {
            sourceVillageId: sender.id,
            targetVillageId: receiver.id,
            wood: transfer.wood,
            stone: transfer.stone,
            iron: transfer.iron,
            merchantsRequired
        },

        senderFillBefore: sender.fill,
        receiverFillBefore: receiver.fill,

        senderFillAfter:
            senderAfterTotal /
            (sender.storage * 3) *
            100,

        receiverFillAfter:
            receiverAfterTotal /
            (receiver.storage * 3) *
            100
    };
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
                await wait(CONFIG.requestDelay);
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
    Math.max(
        wood,
        stone,
        iron
    ) /
    storage *
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

                <div class="dshelper-batch-manager">
                    <label for="dshelper-batch-size">
                        Transporte pro Durchgang
                    </label>

                    <input
                        type="number"
                        id="dshelper-batch-size"
                        min="1"
                        max="200"
                        value="${state.batchSize}"
                    >
                    <label for="dshelper-open-delay">
                    Verzögerung (ms)
                    </label>

                    <input
                        type="number"
                        id="dshelper-open-delay"
                        min="250"
                        step="50"
                        value="${state.openDelay}"
                    >

                    <button
                        type="button"
                        class="btn dshelper-open-batch"
                        disabled
                    >
                        Nächste Transporte öffnen
                    </button>

                    <button
                        type="button"
                        class="btn dshelper-reset-batch"
                    >
                        Fortschritt zurücksetzen
                    </button>

                    <strong id="dshelper-batch-progress">
                        0 / 0 geöffnet
                    </strong>
                </div>

                <div class="dshelper-status">
                    Bereit.
                </div>

                <div class="dshelper-table-wrapper">
                    <table class="dshelper-table">
                        <thead>
                            <tr>
                                <th>Nr.</th>
                                <th>Von</th>
                                <th>Nach</th>
                                <th>Holz</th>
                                <th>Lehm</th>
                                <th>Eisen</th>
                                <th>Gesamt</th>
                                <th>Händler</th>
                                <th>Absender</th>
                                <th>Empfänger</th>
                                <th>Aktion</th>
                            </tr>
                        </thead>

                        <tbody id="dshelper-village-table">
                            <tr>
                                <td colspan="11">
                                    Transporte werden berechnet …
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

    $(`#${WINDOW_ID} .dshelper-open-batch`).on(
        'click',
        openNextTransportBatch
    );

    $(`#${WINDOW_ID} .dshelper-reset-batch`).on(
        'click',
        resetBatchProgress
    );

    $('#dshelper-batch-size').on(
        'change input',
        function () {
            const value = Number(this.value);

            if (
                Number.isFinite(value) &&
                value >= 1
            ) {
                state.batchSize = Math.floor(value);

localStorage.setItem(
    'dshelperBatchSize',
    state.batchSize
);

updateBatchControls();
            }
        }
    );
    $('#dshelper-open-delay').on(
    'change input',
    function () {
        const value = Number(this.value);

        if (
            Number.isFinite(value) &&
            value >= 250
        ) {
            state.openDelay = Math.floor(value);

localStorage.setItem(
    'dshelperOpenDelay',
    state.openDelay
);
        }
    }
);

    if ($.fn.draggable) {
        $(`#${WINDOW_ID}`).draggable({
            handle: '.dshelper-header'
        });
    }
}

    /**
 * Zeigt alle berechneten Transporte an.
 */

function validateTransportSendPayload(sendPayload) {
    const errors = [];

    if (!sendPayload) {
        errors.push(
            'Versanddatensatz fehlt.'
        );

        return {
            valid: false,
            errors
        };
    }

    if (
        sendPayload.sourceVillageId === undefined ||
        sendPayload.sourceVillageId === null ||
        String(sendPayload.sourceVillageId).trim() === ''
    ) {
        errors.push(
            'Ausgangsdorf-ID fehlt.'
        );
    }

    if (
        sendPayload.targetVillageId === undefined ||
        sendPayload.targetVillageId === null ||
        String(sendPayload.targetVillageId).trim() === ''
    ) {
        errors.push(
            'Zieldorf-ID fehlt.'
        );
    }

    const resourcesValid =
        Number.isFinite(sendPayload.wood) &&
        sendPayload.wood >= 0 &&
        Number.isFinite(sendPayload.stone) &&
        sendPayload.stone >= 0 &&
        Number.isFinite(sendPayload.iron) &&
        sendPayload.iron >= 0;

    if (!resourcesValid) {
        errors.push(
            'Rohstoffmengen sind ungültig.'
        );
    } else if (
        sendPayload.wood +
        sendPayload.stone +
        sendPayload.iron <= 0
    ) {
        errors.push(
            'Mindestens eine Rohstoffmenge muss größer als 0 sein.'
        );
    }

    if (
        !Number.isFinite(sendPayload.merchantsRequired) ||
        sendPayload.merchantsRequired <= 0
    ) {
        errors.push(
            'Händlerbedarf ist ungültig.'
        );
    }

    if (
        !window.TribalWars ||
        typeof window.TribalWars.post !== 'function'
    ) {
        errors.push(
            'TribalWars.post ist nicht verfügbar.'
        );
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

function getTransportResponseMessage(response) {
    if (typeof response === 'string') {
        return response.trim();
    }

    if (!response || typeof response !== 'object') {
        return '';
    }

    const responseJson = response.responseJSON;

    const messageCandidates = [
        response.error,
        response.message,
        response.success,
        responseJson && responseJson.error,
        responseJson && responseJson.message
    ];

    for (
        let index = 0;
        index < messageCandidates.length;
        index++
    ) {
        if (
            typeof messageCandidates[index] === 'string' &&
            messageCandidates[index].trim() !== ''
        ) {
            return messageCandidates[index].trim();
        }
    }

    return '';
}

function transportResponseHasError(response) {
    if (!response || typeof response !== 'object') {
        return false;
    }

    return Boolean(
        response.error ||
        response.success === false ||
        (
            response.responseJSON &&
            response.responseJSON.error
        )
    );
}

function isTransportSent(transport) {
    return Boolean(
        transport && transport.status === 'sent'
    );
}

function getOpenTransportCount() {
    return state.transports.filter(transport => {
        return !isTransportSent(transport);
    }).length;
}

function getOpenedOpenTransportCount() {
    let opened = 0;

    state.openedTransports.forEach(transportIndex => {
        if (!isTransportSent(state.transports[transportIndex])) {
            opened++;
        }
    });

    return opened;
}

function getNextOpenTransportCount() {
    let nextAmount = 0;

    for (
        let index = state.nextTransportIndex;
        index < state.transports.length &&
        nextAmount < state.batchSize;
        index++
    ) {
        const transport = state.transports[index];

        if (
            isTransportSent(transport) ||
            state.openedTransports.has(index)
        ) {
            continue;
        }

        nextAmount++;
    }

    return nextAmount;
}

function showNoOpenTransportsRow() {
    const tableBody =
        document.getElementById(
            'dshelper-village-table'
        );

    if (!tableBody || getOpenTransportCount() > 0) {
        return;
    }

    tableBody.innerHTML = `
        <tr>
            <td colspan="11">
                Keine offenen Transporte mehr vorhanden.
            </td>
        </tr>
    `;
}
function resetTransportSendButton(
    transportIndex,
    button
) {
    state.sendingTransports.delete(
        transportIndex
    );

    button.disabled = false;
    button.textContent = 'Transport senden';
}

function sendSingleTransportDirectly(
    transportIndex,
    transport,
    button
) {
    if (isTransportSent(transport)) {
        setStatus(
            'Dieser Transport wurde bereits erfolgreich gesendet.',
            'error'
        );

        console.warn(
            'Gesendeter Transport wird nicht erneut gesendet:',
            transport
        );

        return;
    }

    if (state.sendingTransports.has(transportIndex)) {
        return;
    }

    state.sendingTransports.add(
        transportIndex
    );

    button.disabled = true;
    button.textContent = 'Wird gesendet …';

    const tableRow = button.closest('tr');
    const sendPayload = transport && transport.sendPayload;
    const validation = validateTransportSendPayload(
        sendPayload
    );

    if (!validation.valid) {
        resetTransportSendButton(
            transportIndex,
            button
        );

        setStatus(
            'Transport konnte nicht gesendet werden: ' +
            validation.errors.join(' '),
            'error'
        );

        console.error(
            'Transport konnte nicht gesendet werden:',
            {
                sendPayload,
                errors: validation.errors
            }
        );

        return;
    }

    let settled = false;

    const handleSendError = function (response) {
        if (settled) {
            return;
        }

        settled = true;

        resetTransportSendButton(
            transportIndex,
            button
        );

        const responseMessage =
            getTransportResponseMessage(response);

        setStatus(
            'Transport konnte nicht gesendet werden.' +
            (responseMessage ? ' ' + responseMessage : ''),
            'error'
        );

        console.error(
            'Transport konnte nicht gesendet werden:',
            {
                sendPayload,
                response
            }
        );
    };

    const handleSendSuccess = function (response) {
        if (settled) {
            return;
        }

        if (transportResponseHasError(response)) {
            handleSendError(response);
            return;
        }

        settled = true;

        state.sendingTransports.delete(
            transportIndex
        );

        transport.status = 'sent';
        state.openedTransports.delete(
            transportIndex
        );

        if (tableRow && tableRow.parentNode) {
            tableRow.remove();
        }

        showNoOpenTransportsRow();
        updateBatchControls();

        setStatus(
            'Transport erfolgreich gesendet: ' +
            sendPayload.sourceVillageId +
            ' → ' +
            sendPayload.targetVillageId +
            ', Holz ' +
            formatNumber(sendPayload.wood) +
            ', Lehm ' +
            formatNumber(sendPayload.stone) +
            ', Eisen ' +
            formatNumber(sendPayload.iron) +
            '. Noch ' +
            formatNumber(getOpenTransportCount()) +
            ' offene Transporte.',
            'success'
        );

        console.log(
            'Transport erfolgreich gesendet:',
            {
                sendPayload,
                response
            }
        );
    };

    try {
        const postResult = TribalWars.post(
            'market',
            {
                ajaxaction: 'map_send',
                village: sendPayload.sourceVillageId
            },
            {
                target_id: sendPayload.targetVillageId,
                wood: sendPayload.wood,
                stone: sendPayload.stone,
                iron: sendPayload.iron
            },
            handleSendSuccess,
            handleSendError
        );

        if (postResult && typeof postResult.done === 'function') {
            postResult.done(handleSendSuccess);
        }

        if (postResult && typeof postResult.fail === 'function') {
            postResult.fail(handleSendError);
        }

        if (postResult && typeof postResult.then === 'function') {
            postResult.then(
                handleSendSuccess,
                handleSendError
            );
        }

        if (postResult && typeof postResult.catch === 'function') {
            postResult.catch(handleSendError);
        }
    } catch (error) {
        handleSendError(error);
    }
}
function renderTransportTable(transports) {
    const tableBody =
        document.getElementById(
            'dshelper-village-table'
        );

    if (!tableBody) {
        return;
    }

    if (transports.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="11">
                    Keine Transporte berechnet.
                </td>
            </tr>
        `;

        return;
    }

    const openTransports = transports
        .map((transport, originalIndex) => {
            return {
                transport,
                originalIndex
            };
        })
        .filter(item => {
            return !isTransportSent(item.transport);
        });

    if (openTransports.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="11">
                    Keine offenen Transporte mehr vorhanden.
                </td>
            </tr>
        `;

        updateBatchControls();
        return;
    }

    tableBody.innerHTML = openTransports
        .map(item => {
            const transport = item.transport;
            const index = item.originalIndex;

            return `
                <tr
                    data-transport-index="${index}"
                    class="${
                    state.openedTransports.has(index)
                        ? 'dshelper-transport-opened'
                        : ''
    }"
>
                    <td>${index + 1}</td>

                    <td class="dshelper-village">
                        <strong>
                            ${escapeHtml(transport.sender.coord)}
                        </strong>

                        <small>
                            ${escapeHtml(transport.sender.name)}
                        </small>
                    </td>

                    <td class="dshelper-village">
                        <strong>
                            ${escapeHtml(transport.receiver.coord)}
                        </strong>

                        <small>
                            ${escapeHtml(transport.receiver.name)}
                        </small>
                    </td>

                    <td>
                        ${formatNumber(transport.wood)}
                    </td>

                    <td>
                        ${formatNumber(transport.stone)}
                    </td>

                    <td>
                        ${formatNumber(transport.iron)}
                    </td>

                    <td>
                        <strong>
                            ${formatNumber(transport.total)}
                        </strong>
                    </td>

                    <td>
                        ${formatNumber(transport.merchants)}
                    </td>

                    <td>
                        ${formatPercent(
                            transport.senderFillBefore
                        )}
                        →
                        <strong>
                            ${formatPercent(
                                transport.senderFillAfter
                            )}
                        </strong>
                    </td>

                    <td>
                        ${formatPercent(
                            transport.receiverFillBefore
                        )}
                        →
                        <strong>
                            ${formatPercent(
                                transport.receiverFillAfter
                            )}
                        </strong>
                    </td>

                    <td>
                        <div class="dshelper-action-buttons">
                            <button
                                type="button"
                                class="btn dshelper-open-transport"
                                data-transport-index="${index}"
                            >
                                Öffnen
                            </button>

                            <button
                                type="button"
                                class="btn dshelper-send-transport"
                                data-transport-index="${index}"
                            >
                                Transport senden
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        })
        .join('');

    tableBody
        .querySelectorAll(
            '.dshelper-open-transport'
        )
        .forEach(button => {
            button.addEventListener(
                'click',
                function () {
                    const transportIndex = Number(
                        this.dataset.transportIndex
                    );

                    const transport =
                        state.transports[transportIndex];

                    if (isTransportSent(transport)) {
                        setStatus(
                            'Dieser Transport wurde bereits erfolgreich gesendet.',
                            'error'
                        );

                        console.warn(
                            'Gesendeter Transport wird nicht geöffnet:',
                            transport
                        );

                        return;
                    }

                    openTransportInMarket(transport);
                }
            );
        });

    tableBody
        .querySelectorAll(
            '.dshelper-send-transport'
        )
        .forEach(button => {
            button.addEventListener(
                'click',
                function () {
                    const transportIndex = Number(
                        this.dataset.transportIndex
                    );

                    const transport =
                        state.transports[transportIndex];

                    sendSingleTransportDirectly(
                        transportIndex,
                        transport,
                        this
                    );
                }
            );
        });

        updateBatchControls();
}
    /**
 * Öffnet den Marktplatz des Absenderdorfs und
 * trägt Ziel sowie Ressourcen ein.
 *
 * Der Transport wird nicht automatisch abgeschickt.
 */
/**
 * Öffnet den nächsten Stapel vorbereiteter Transporte.
 */
/**
 * Öffnet den nächsten Stapel vorbereiteter Transporte
 * mit 250 Millisekunden Abstand pro Tab.
 */
async function openNextTransportBatch() {
    if (getOpenTransportCount() === 0) {
        updateBatchControls();
        showNoOpenTransportsRow();
        return;
    }

    const button =
        $(`#${WINDOW_ID} .dshelper-open-batch`);

    let openedInBatch = 0;

    button
        .prop('disabled', true)
        .text('Transporte werden geöffnet …');

    while (
        state.nextTransportIndex < state.transports.length &&
        openedInBatch < state.batchSize
    ) {
        const index = state.nextTransportIndex;
        const transport = state.transports[index];

        state.nextTransportIndex = index + 1;

        if (
            isTransportSent(transport) ||
            state.openedTransports.has(index)
        ) {
            continue;
        }

        openTransportInMarket(transport);

        state.openedTransports.add(index);
        openedInBatch++;

        const tableRow =
            document.querySelector(
                `[data-transport-index="${index}"]`
            );

        if (tableRow) {
            tableRow.classList.add(
                'dshelper-transport-opened'
            );
        }

        $('#dshelper-batch-progress').text(
            `${getOpenedOpenTransportCount()} / ` +
            `${getOpenTransportCount()} geöffnet`
        );

        if (
            openedInBatch < state.batchSize &&
            getNextOpenTransportCount() > 0
        ) {
            await wait(state.openDelay);
        }
    }

    if (openedInBatch === 0) {
        setStatus(
            'Keine offenen Transporte mehr zum Öffnen vorhanden.',
            'success'
        );
    }

    updateBatchControls();
}

/**
 * Setzt den Stapel-Fortschritt zurück.
 */
function resetBatchProgress() {
    state.nextTransportIndex = 0;
    state.openedTransports.clear();

    renderTransportTable(
        state.transports
    );

    updateBatchControls();
}

/**
 * Aktualisiert Button, Fortschritt und Stapelgröße.
 */
function updateBatchControls() {
    const total =
        getOpenTransportCount();

    const opened =
        getOpenedOpenTransportCount();

    const nextAmount =
        getNextOpenTransportCount();

    const button =
        $(`#${WINDOW_ID} .dshelper-open-batch`);

    $('#dshelper-batch-progress').text(
        `${opened} / ${total} geöffnet`
    );

    $('#dshelper-batch-size').val(
        state.batchSize
    );

    if (total <= 0) {
        button
            .prop('disabled', true)
            .text('Keine offenen Transporte mehr');

        return;
    }

    if (nextAmount <= 0) {
        button
            .prop('disabled', true)
            .text('Alle offenen Transporte geöffnet');

        return;
    }

    button
        .prop('disabled', false)
        .text(
            `Nächste ${nextAmount} Transporte öffnen`
        );
}
function openTransportInMarket(transport) {
    if (isTransportSent(transport)) {
        setStatus(
            'Dieser Transport wurde bereits erfolgreich gesendet.',
            'error'
        );

        console.warn(
            'Gesendeter Transport wird nicht geöffnet:',
            transport
        );

        return;
    }
    const marketUrl =
        `${window.location.origin}/game.php` +
        `?village=${transport.sender.id}` +
        `&screen=market&mode=send`;

    const marketWindow =
        window.open(marketUrl, '_blank');

    if (!marketWindow) {
        UI.ErrorMessage(
            'Das Marktplatzfenster wurde vom Browser blockiert.',
            5000
        );

        return;
    }

    const coordParts =
        transport.receiver.coord.split('|');

    const targetX = coordParts[0];
    const targetY = coordParts[1];

    let attempts = 0;

    const fillInterval = window.setInterval(
        function () {
            attempts++;

            try {
                const marketDocument =
                    marketWindow.document;

                const woodInput =
                    marketDocument.querySelector(
                        'input[name="wood"]'
                    );

                const stoneInput =
                    marketDocument.querySelector(
                        'input[name="stone"]'
                    );

                const ironInput =
                    marketDocument.querySelector(
                        'input[name="iron"]'
                    );

                const xInput =
                    marketDocument.querySelector(
                        'input[name="x"]'
                    );

                const yInput =
                    marketDocument.querySelector(
                        'input[name="y"]'
                    );

                if (
                    !woodInput ||
                    !stoneInput ||
                    !ironInput ||
                    !xInput ||
                    !yInput
                ) {
                    if (attempts >= 40) {
                        window.clearInterval(
                            fillInterval
                        );
                    }

                    return;
                }

                woodInput.value =
                    transport.wood;

                stoneInput.value =
                    transport.stone;

                ironInput.value =
                    transport.iron;

                xInput.value =
                    targetX;

                yInput.value =
                    targetY;

                [
                    woodInput,
                    stoneInput,
                    ironInput,
                    xInput,
                    yInput
                ].forEach(input => {
                    input.dispatchEvent(
                        new Event('input', {
                            bubbles: true
                        })
                    );

                    input.dispatchEvent(
                        new Event('change', {
                            bubbles: true
                        })
                    );
                });

                xInput.focus();

                window.clearInterval(
                    fillInterval
                );
            } catch (error) {
                if (attempts >= 40) {
                    window.clearInterval(
                        fillInterval
                    );

                    console.error(
                        'Marktplatz konnte nicht ausgefüllt werden:',
                        error
                    );
                }
            }
        },
        250
    );
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
    /**
 * Lädt eine gespeicherte Zahl aus dem localStorage.
 */
function loadSavedNumber(key, fallbackValue) {
    const savedValue = Number(
        localStorage.getItem(key)
    );

    return (
        Number.isFinite(savedValue) &&
        savedValue > 0
    )
        ? savedValue
        : fallbackValue;
}
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
                    --ds-helper-bg: #ffffff;
                    --ds-helper-surface: #f7f7f7;
                    --ds-helper-soft: #f4f4f4;
                    --ds-helper-text: #242424;
                    --ds-helper-muted: #666666;
                    --ds-helper-border: #d9d9d9;
                    --ds-helper-border-strong: #b8b8b8;
                    --ds-helper-accent: #E14165;
                    --ds-helper-accent-hover: #c83255;
                    --ds-helper-success-bg: #edf8ef;
                    --ds-helper-success-border: #4f8f5c;
                    --ds-helper-error-bg: #fdecec;
                    --ds-helper-error-border: #b94a48;
                    position: fixed;
                    top: 55px;
                    left: 2%;
                    width: 96%;
                    max-height: calc(100vh - 75px);
                    background: var(--ds-helper-bg);
                    border: 1px solid var(--ds-helper-border);
                    border-radius: 5px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, .16);
                    color: var(--ds-helper-text);
                    font-family: Verdana, Arial, sans-serif;
                    font-size: 12px;
                    z-index: 999999;
                }

                #${WINDOW_ID} .dshelper-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 12px;
                    background: var(--ds-helper-text);
                    border-bottom: 3px solid var(--ds-helper-accent);
                    color: var(--ds-helper-bg);
                    cursor: move;
                    font-weight: bold;
                }

                #${WINDOW_ID} .dshelper-close {
                    min-width: 28px;
                    min-height: 26px;
                    padding: 0 7px;
                    border: 1px solid rgba(255, 255, 255, .35);
                    border-radius: 4px;
                    background: transparent;
                    color: var(--ds-helper-bg);
                    cursor: pointer;
                    font-size: 16px;
                    line-height: 1;
                }

                #${WINDOW_ID} .dshelper-close:hover {
                    border-color: var(--ds-helper-accent);
                    background: var(--ds-helper-accent);
                    color: var(--ds-helper-bg);
                }

                #${WINDOW_ID} .dshelper-content {
                    padding: 12px;
                    background: var(--ds-helper-bg);
                }

                #${WINDOW_ID} .dshelper-toolbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid var(--ds-helper-border);
                }

                #${WINDOW_ID} .dshelper-version {
                    color: var(--ds-helper-muted);
                    font-size: 11px;
                }

                #${WINDOW_ID} .btn {
                    min-height: 28px;
                    padding: 6px 11px;
                    border: 1px solid var(--ds-helper-accent);
                    border-radius: 5px;
                    background: var(--ds-helper-accent);
                    box-shadow: none;
                    color: var(--ds-helper-bg);
                    cursor: pointer;
                    font-family: Verdana, Arial, sans-serif;
                    font-size: 12px;
                    font-weight: bold;
                    line-height: 1.2;
                }

                #${WINDOW_ID} .btn:hover:not(:disabled) {
                    border-color: var(--ds-helper-accent-hover);
                    background: var(--ds-helper-accent-hover);
                    color: var(--ds-helper-bg);
                }

                #${WINDOW_ID} .btn:active:not(:disabled) {
                    transform: translateY(1px);
                }

                #${WINDOW_ID} .btn:disabled {
                    border-color: var(--ds-helper-border-strong);
                    background: var(--ds-helper-soft);
                    color: #777777;
                    cursor: default;
                }

                #${WINDOW_ID} .dshelper-summary {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 8px;
                    margin-bottom: 10px;
                }

                #${WINDOW_ID} .dshelper-summary div {
                    padding: 9px 8px;
                    background: var(--ds-helper-bg);
                    border: 1px solid var(--ds-helper-border);
                    border-left: 3px solid var(--ds-helper-accent);
                    border-radius: 5px;
                    text-align: center;
                }

                #${WINDOW_ID} .dshelper-summary span,
                #${WINDOW_ID} .dshelper-summary strong {
                    display: block;
                }

                #${WINDOW_ID} .dshelper-summary span {
                    color: var(--ds-helper-muted);
                    font-weight: bold;
                }

                #${WINDOW_ID} .dshelper-summary strong {
                    margin-top: 3px;
                    color: var(--ds-helper-text);
                    font-size: 16px;
                }

                #${WINDOW_ID} .dshelper-batch-manager {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 10px;
                    padding: 10px;
                    background: var(--ds-helper-surface);
                    border: 1px solid var(--ds-helper-border);
                    border-radius: 5px;
                    color: var(--ds-helper-text);
                }

                #${WINDOW_ID} .dshelper-batch-manager label {
                    color: var(--ds-helper-text);
                    font-weight: bold;
                }

                #${WINDOW_ID} .dshelper-batch-manager input {
                    width: 70px;
                    min-height: 28px;
                    box-sizing: border-box;
                    padding: 4px 7px;
                    border: 1px solid var(--ds-helper-border);
                    border-radius: 4px;
                    background: var(--ds-helper-bg);
                    box-shadow: none;
                    color: var(--ds-helper-text);
                    font-family: Verdana, Arial, sans-serif;
                    font-size: 12px;
                    text-align: center;
                    outline: none;
                }

                #${WINDOW_ID} .dshelper-batch-manager input:focus {
                    border-color: var(--ds-helper-accent);
                    box-shadow: 0 0 0 2px rgba(225, 65, 101, .18);
                }

                #${WINDOW_ID} .dshelper-batch-manager strong {
                    margin-left: auto;
                    color: var(--ds-helper-text);
                    white-space: nowrap;
                }

                #${WINDOW_ID} .dshelper-status {
                    margin-bottom: 10px;
                    padding: 9px 10px;
                    background: var(--ds-helper-bg);
                    border: 1px solid var(--ds-helper-border);
                    border-left: 3px solid var(--ds-helper-accent);
                    border-radius: 5px;
                    color: var(--ds-helper-text);
                }

                #${WINDOW_ID} .dshelper-status.success {
                    background: var(--ds-helper-success-bg);
                    border-color: var(--ds-helper-success-border);
                }

                #${WINDOW_ID} .dshelper-status.error {
                    background: var(--ds-helper-error-bg);
                    border-color: var(--ds-helper-error-border);
                }

                #${WINDOW_ID} .dshelper-table-wrapper {
                    max-height: calc(100vh - 265px);
                    overflow: auto;
                    border: 1px solid var(--ds-helper-border);
                    border-radius: 5px;
                    background: var(--ds-helper-bg);
                }

                #${WINDOW_ID} .dshelper-table-wrapper::-webkit-scrollbar {
                    width: 11px;
                    height: 11px;
                }

                #${WINDOW_ID} .dshelper-table-wrapper::-webkit-scrollbar-track {
                    background: var(--ds-helper-surface);
                }

                #${WINDOW_ID} .dshelper-table-wrapper::-webkit-scrollbar-thumb {
                    background: var(--ds-helper-border-strong);
                    border: 2px solid var(--ds-helper-surface);
                    border-radius: 5px;
                }

                #${WINDOW_ID} .dshelper-table-wrapper::-webkit-scrollbar-thumb:hover {
                    background: var(--ds-helper-accent);
                }

                #${WINDOW_ID} .dshelper-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: var(--ds-helper-bg);
                    color: var(--ds-helper-text);
                }

                #${WINDOW_ID} .dshelper-table th {
                    position: sticky;
                    top: 0;
                    z-index: 2;
                    padding: 7px 5px;
                    background: var(--ds-helper-text);
                    border: 1px solid var(--ds-helper-text);
                    border-bottom: 3px solid var(--ds-helper-accent);
                    color: var(--ds-helper-bg);
                    font-weight: bold;
                    white-space: nowrap;
                }

                #${WINDOW_ID} .dshelper-table td {
                    padding: 6px 5px;
                    border: 1px solid var(--ds-helper-border);
                    background: var(--ds-helper-bg);
                    color: var(--ds-helper-text);
                    text-align: right;
                    white-space: nowrap;
                }

                #${WINDOW_ID} .dshelper-table td:first-child,
                #${WINDOW_ID} .dshelper-table td:nth-child(2) {
                    text-align: left;
                }

                #${WINDOW_ID} .dshelper-table tbody tr:nth-child(even) td {
                    background: var(--ds-helper-surface);
                }

                #${WINDOW_ID} .dshelper-table tbody tr:hover td {
                    background: #fff3f6;
                }

                #${WINDOW_ID} .dshelper-village small {
                    display: block;
                    max-width: 260px;
                    margin-top: 2px;
                    overflow: hidden;
                    color: var(--ds-helper-muted);
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    font-size: 10px;
                }

                #${WINDOW_ID} .dshelper-action-buttons {
                    display: flex;
                    justify-content: flex-end;
                    gap: 6px;
                }

                #${WINDOW_ID} .dshelper-action-buttons .btn {
                    min-height: 26px;
                    padding: 4px 8px;
                    font-size: 11px;
                }

                #${WINDOW_ID} .dshelper-open-transport {
                    border-color: var(--ds-helper-border-strong);
                    background: var(--ds-helper-bg);
                    color: var(--ds-helper-text);
                }

                #${WINDOW_ID} .dshelper-open-transport:hover:not(:disabled) {
                    border-color: var(--ds-helper-accent);
                    background: #fff3f6;
                    color: var(--ds-helper-accent);
                }

                #${WINDOW_ID} .dshelper-send-transport {
                    border-color: var(--ds-helper-accent);
                    background: var(--ds-helper-accent);
                    color: var(--ds-helper-bg);
                }

                #${WINDOW_ID} .dshelper-transport-opened td {
                    background: var(--ds-helper-soft) !important;
                    opacity: .58;
                }

                #${WINDOW_ID} .dshelper-transport-opened td:first-child {
                    border-left: 3px solid var(--ds-helper-border-strong);
                }
            </style>
        `);
    }
})();
