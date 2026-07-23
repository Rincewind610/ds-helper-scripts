/*
=======================================
DS Helper
Name: Prägevorbereitung
Version: 0.3.4
Kategorie: Produktion
Autor: Rincewind610

Funktion:
Liest Dörfer, Ressourcen, Lager und Händler
aus der Produktionsübersicht aus und sortiert
die Dörfer nach Entfernung zum Münzdorf.

Status: Entwicklung / Simulation
=======================================
*/

(function () {
    'use strict';

    const VERSION = '0.3.4';

    const COIN_VILLAGE = {
        x: 538,
        y: 573,
        coord: '538|573'
    };

    const POPUP_ID = 'ds-helper-praegevorbereitung';

    function parseGameNumber(value) {
        if (value === null || value === undefined) {
            return 0;
        }

        const cleaned = String(value)
            .replace(/\./g, '')
            .replace(/[^\d-]/g, '');

        return cleaned ? parseInt(cleaned, 10) : 0;
    }

    function formatNumber(value) {
        return Number(value || 0).toLocaleString('de-DE');
    }

    function calculateDistance(x1, y1, x2, y2) {
        const deltaX = x2 - x1;
        const deltaY = y2 - y1;

        return Math.sqrt(
            deltaX * deltaX +
            deltaY * deltaY
        );
    }

    function extractVillageName(row, coord) {
        let text = '';

        const quickEditLabel = row.find('.quickedit-label').first();

        if (quickEditLabel.length) {
            text = quickEditLabel.text().trim();
        }

        if (!text) {
            const villageLink = row
                .find('a[href*="village="]')
                .first();

            if (villageLink.length) {
                text = villageLink.text().trim();
            }
        }

        if (!text) {
            text = row
                .text()
                .replace(/\s+/g, ' ')
                .trim();
        }

        const coordPattern = coord.replace('|', '\\|');

        const match = text.match(
            new RegExp(
                '^(.*?)\\s*\\(' + coordPattern + '\\)',
                'i'
            )
        );

        if (match) {
            return match[1].trim() + ' (' + coord + ')';
        }

        text = text
            .replace(/\s+K\d+\s*$/i, '')
            .trim();

        if (text.includes('(' + coord + ')')) {
            return text;
        }

        return text + ' (' + coord + ')';
    }

    function extractResourcesFromCell(cell) {
        const values = [];

        cell
            .find('[data-res], .res, .wood, .stone, .iron')
            .each(function () {
                const element = $(this);

                const possibleValues = [
                    element.attr('data-res'),
                    element.attr('data-value'),
                    element.text()
                ];

                for (const possibleValue of possibleValues) {
                    if (!possibleValue) {
                        continue;
                    }

                    const number = parseGameNumber(possibleValue);

                    if (number > 0) {
                        values.push(number);
                        break;
                    }
                }
            });

        if (values.length >= 3) {
            return {
                wood: values[0],
                clay: values[1],
                iron: values[2]
            };
        }

        const textNumbers = cell
            .text()
            .match(/\d{1,3}(?:\.\d{3})+|\d+/g);

        if (!textNumbers || textNumbers.length < 3) {
            return null;
        }

        return {
            wood: parseGameNumber(textNumbers[0]),
            clay: parseGameNumber(textNumbers[1]),
            iron: parseGameNumber(textNumbers[2])
        };
    }

 function extractRowData(row) {
    const cells = row.children('td');

    let resourceCellIndex = -1;
    let resources = null;

    cells.each(function (index) {
        if (resources) {
            return;
        }

        const result = extractResourcesFromCell($(this));

        if (
            result &&
            result.wood >= 1000 &&
            result.clay >= 1000 &&
            result.iron >= 1000
        ) {
            resourceCellIndex = index;
            resources = result;
        }
    });

    if (!resources) {
        return {
            wood: 0,
            clay: 0,
            iron: 0,
            storage: 0,
            merchantsFree: 0,
            merchantsTotal: 0,
            parseError: true
        };
    }

    let storage = 0;
    let merchantsFree = 0;
    let merchantsTotal = 0;

    for (
        let index = resourceCellIndex + 1;
        index < cells.length;
        index++
    ) {
        const cellText = $(cells[index])
            .text()
            .replace(/\s+/g, ' ')
            .trim();

        if (!cellText) {
            continue;
        }

        const merchantMatch = cellText.match(
            /(\d[\d.]*)\s*\/\s*(\d[\d.]*)/
        );

        if (merchantMatch && merchantsTotal === 0) {
            const firstValue = parseGameNumber(
                merchantMatch[1]
            );

            const secondValue = parseGameNumber(
                merchantMatch[2]
            );

            if (
                secondValue <= 1000 &&
                firstValue <= secondValue
            ) {
                merchantsFree = firstValue;
                merchantsTotal = secondValue;
                continue;
            }
        }

        if (storage === 0) {
            const possibleStorage = parseGameNumber(cellText);

            if (
                /^\d[\d.]*$/.test(cellText) &&
                possibleStorage >= 10000
            ) {
                storage = possibleStorage;
            }
        }
    }

    return {
        wood: resources.wood,
        clay: resources.clay,
        iron: resources.iron,
        storage: storage,
        merchantsFree: merchantsFree,
        merchantsTotal: merchantsTotal,
        parseError:
            storage === 0 ||
            merchantsTotal === 0
    };
}

    function readVillages() {
        const villages = [];
        const foundCoordinates = new Set();

        $('tr.nowrap.row_a, tr.nowrap.row_b').each(function () {
            const row = $(this);

            const rowText = row
                .text()
                .replace(/\s+/g, ' ')
                .trim();

            const coordMatch = rowText.match(
                /\((\d{1,3})\|(\d{1,3})\)/
            );

            if (!coordMatch) {
                return;
            }

            const x = parseInt(coordMatch[1], 10);
            const y = parseInt(coordMatch[2], 10);
            const coord = x + '|' + y;

            if (foundCoordinates.has(coord)) {
                return;
            }

            foundCoordinates.add(coord);

            const isCoinVillage =
                coord === COIN_VILLAGE.coord;

            const rowData = extractRowData(row);

            villages.push({
                name: extractVillageName(row, coord),

                coord: coord,
                x: x,
                y: y,

                isCoinVillage: isCoinVillage,

                distanceToCoinVillage: isCoinVillage
                    ? 0
                    : calculateDistance(
                        COIN_VILLAGE.x,
                        COIN_VILLAGE.y,
                        x,
                        y
                    ),

                wood: rowData.wood,
                clay: rowData.clay,
                iron: rowData.iron,

                storage: rowData.storage,

                merchantsFree: rowData.merchantsFree,
                merchantsTotal: rowData.merchantsTotal,

                parseError: rowData.parseError
            });
        });

        return villages;
    }

    function sortVillages(villages) {
        return villages
            .filter(function (village) {
                return !village.isCoinVillage;
            })
            .sort(function (a, b) {
                if (
                    a.distanceToCoinVillage !==
                    b.distanceToCoinVillage
                ) {
                    return (
                        a.distanceToCoinVillage -
                        b.distanceToCoinVillage
                    );
                }

                if (a.x !== b.x) {
                    return a.x - b.x;
                }

                return a.y - b.y;
            });
    }

    function escapeHtml(value) {
        return $('<div>')
            .text(String(value))
            .html();
    }

    function removeExistingPopup() {
        $('#' + POPUP_ID).remove();
    }

    function buildVillageRows(villages) {
        return villages
            .map(function (village, index) {
                const rowStyle = village.parseError
                    ? 'background:#ffd1d1;'
                    : '';

                return `
                    <tr style="${rowStyle}">
                        <td style="text-align:right;">
                            ${index + 1}
                        </td>

                        <td style="white-space:nowrap;">
                            ${escapeHtml(village.name)}
                        </td>

                        <td style="text-align:right;">
                            ${village.distanceToCoinVillage.toFixed(2)}
                        </td>

                        <td style="text-align:right;">
                            ${formatNumber(village.wood)}
                        </td>

                        <td style="text-align:right;">
                            ${formatNumber(village.clay)}
                        </td>

                        <td style="text-align:right;">
                            ${formatNumber(village.iron)}
                        </td>

                        <td style="text-align:right;">
                            ${formatNumber(village.storage)}
                        </td>

                        <td style="text-align:center;white-space:nowrap;">
                            ${formatNumber(village.merchantsFree)}
                            /
                            ${formatNumber(village.merchantsTotal)}
                        </td>
                    </tr>
                `;
            })
            .join('');
    }

    function showPopup(allVillages, sortedVillages) {
        removeExistingPopup();

        const coinVillageFound = allVillages.some(
            function (village) {
                return village.isCoinVillage;
            }
        );

        const parseErrorVillages = allVillages.filter(
    function (village) {
        return village.parseError;
    }
);

const parseErrors = parseErrorVillages.length;

const parseErrorDetails = parseErrorVillages.length
    ? parseErrorVillages
        .map(function (village) {
            return (
                escapeHtml(village.name) +
                ' – Lager: ' +
                formatNumber(village.storage) +
                ', Händler: ' +
                formatNumber(village.merchantsFree) +
                '/' +
                formatNumber(village.merchantsTotal)
            );
        })
        .join('<br>')
    : 'Keine';

        const popupHtml = `
            <div id="${POPUP_ID}" style="
                position:fixed;
                top:35px;
                left:50%;
                transform:translateX(-50%);
                width:1180px;
                max-width:calc(100vw - 30px);
                max-height:calc(100vh - 65px);
                z-index:99999;
                background:#f4e4bc;
                border:2px solid #804000;
                box-shadow:0 4px 18px rgba(0,0,0,0.55);
                font-family:Verdana,Arial,sans-serif;
                font-size:12px;
                color:#000;
            ">

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    padding:8px 10px;
                    background:#804000;
                    color:#fff;
                    font-weight:bold;
                    font-size:14px;
                ">
                    <span>
                        DS Helper – Prägevorbereitung ${VERSION}
                    </span>

                    <button
                        type="button"
                        id="${POPUP_ID}-close"
                        style="
                            border:1px solid #fff;
                            background:#b22222;
                            color:#fff;
                            cursor:pointer;
                            font-weight:bold;
                            padding:2px 8px;
                        "
                    >
                        X
                    </button>
                </div>

                <div style="padding:10px;">
                    <table class="vis" style="
                        width:100%;
                        margin-bottom:10px;
                    ">
                        <tr>
                            <th>Münzdorf</th>
                            <td>${COIN_VILLAGE.coord}</td>

                            <th>Status</th>
                            <td>
                                ${
                                    coinVillageFound
                                        ? 'gefunden und ausgeschlossen'
                                        : 'nicht gefunden'
                                }
                            </td>
                        </tr>

                        <tr>
                            <th>Dörfer erkannt</th>
                            <td>${allVillages.length}</td>

                            <th>Dörfer ausgewertet</th>
                            <td>${sortedVillages.length}</td>
                        </tr>

<tr>
    <th>Lesefehler</th>
    <td>${parseErrors}</td>

    <th>Simulationsmodus</th>
    <td>aktiv – keine Transporte</td>
</tr>

${
    parseErrors > 0
        ? `
            <tr>
                <th>Fehlerhafte Dörfer</th>
                <td colspan="3" style="background:#ffd1d1;">
                    ${parseErrorDetails}
                </td>
            </tr>
        `
        : ''
}
                    </table>

                    <div style="
                        max-height:calc(100vh - 235px);
                        overflow:auto;
                        border:1px solid #c1a264;
                    ">
                        <table class="vis" style="
                            width:100%;
                            border-collapse:collapse;
                        ">
                            <thead>
                                <tr>
                                    <th style="width:45px;">
                                        Rang
                                    </th>

                                    <th>
                                        Dorf
                                    </th>

                                    <th style="width:75px;">
                                        Distanz
                                    </th>

                                    <th style="width:95px;">
                                        Holz
                                    </th>

                                    <th style="width:95px;">
                                        Lehm
                                    </th>

                                    <th style="width:95px;">
                                        Eisen
                                    </th>

                                    <th style="width:95px;">
                                        Lager
                                    </th>

                                    <th style="width:85px;">
                                        Händler
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                ${buildVillageRows(sortedVillages)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        $('body').append(popupHtml);

        $('#' + POPUP_ID + '-close').on(
            'click',
            function () {
                removeExistingPopup();
            }
        );
    }

    function init() {
        const allVillages = readVillages();

        if (!allVillages.length) {
            UI.ErrorMessage(
                'DS Helper: Keine Dörfer erkannt. Bitte die Produktionsübersicht öffnen.',
                6000
            );
            return;
        }

        const sortedVillages = sortVillages(
            allVillages
        );

        showPopup(
            allVillages,
            sortedVillages
        );

        console.log(
    '[DS Helper | Prägevorbereitung]',
    {
        version: VERSION,
        parseErrors: allVillages.filter(v => v.parseError)
    }
);
    }

    init();

})();