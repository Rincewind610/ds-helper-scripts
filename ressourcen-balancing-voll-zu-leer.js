/*
=======================================
DS Helper
Name: Ressourcen Balancing Voll zu Leer
Version: 1.0.0
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
    const VERSION = '1.0.0';

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
    openedTransports: new Set()
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
        .filter(transport => transport.total > 0);

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

    return {
        sender,
        receiver,

        wood: transfer.wood,
        stone: transfer.stone,
        iron: transfer.iron,

        total: transferredTotal,

        merchants: Math.ceil(
            transferredTotal / CONFIG.merchantCapacity
        ),

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

    tableBody.innerHTML = transports
        .map((transport, index) => {
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
                        <button
                            type="button"
                            class="btn dshelper-open-transport"
                            data-transport-index="${index}"
                        >
                            Öffnen
                        </button>
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
                        transports[transportIndex];

                    openTransportInMarket(transport);
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
    if (state.transports.length === 0) {
        return;
    }

    const button =
        $(`#${WINDOW_ID} .dshelper-open-batch`);

    const startIndex =
        state.nextTransportIndex;

    const endIndex = Math.min(
        startIndex + state.batchSize,
        state.transports.length
    );

    button
        .prop('disabled', true)
        .text('Transporte werden geöffnet …');

    for (
        let index = startIndex;
        index < endIndex;
        index++
    ) {
        openTransportInMarket(
            state.transports[index]
        );

        state.openedTransports.add(index);
        state.nextTransportIndex = index + 1;

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
            `${state.openedTransports.size} / ` +
            `${state.transports.length} geöffnet`
        );

        if (index < endIndex - 1) {
            await wait(state.openDelay);
        }
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
        state.transports.length;

    const opened =
        state.openedTransports.size;

    const remaining =
        Math.max(
            0,
            total - state.nextTransportIndex
        );

    const nextAmount =
        Math.min(
            state.batchSize,
            remaining
        );

    const button =
        $(`#${WINDOW_ID} .dshelper-open-batch`);

    $('#dshelper-batch-progress').text(
        `${opened} / ${total} geöffnet`
    );

    $('#dshelper-batch-size').val(
        state.batchSize
    );

    if (remaining <= 0) {
        button
            .prop('disabled', true)
            .text('Alle Transporte geöffnet');

        return;
    }

    button
        .prop('disabled', false)
        .text(
            `Nächste ${nextAmount} Transporte öffnen`
        );
}

function openTransportInMarket(transport) {
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
                #dshelper-resource-balancing .dshelper-batch-manager {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 10px;
    padding: 10px;
    background: #ead5a3;
    border: 1px solid #b99a5d;
}

#dshelper-resource-balancing .dshelper-batch-manager input {
    width: 70px;
    text-align: center;
}

#dshelper-resource-balancing .dshelper-batch-manager strong {
    margin-left: auto;
}

#dshelper-resource-balancing .dshelper-transport-opened {
    opacity: 0.45;
    background: #ddd0aa !important;
}
            </style>
        `);
    }
})();
