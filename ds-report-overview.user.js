// ==UserScript==
// @name         DS Helper - Berichtsubersicht
// @namespace    https://github.com/Rincewind610/ds-helper-scripts
// @version      0.1.16
// @description  Zeigt wichtige Informationen aus der Berichtsvorschau direkt in der Berichtsubersicht an.
// @author       Rincewind610
// @include      /^https?:\/\/[^/]+\.die-staemme\.de\/game\.php\?(?=[^#]*\bscreen=report\b)[^#]*$/
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
=======================================
DS Helper
Name: Berichtsubersicht
Version: 0.1.16
Kategorie: Berichte
Autor: Rincewind610

Funktion:
Zeigt fuer maximal 100 sichtbare Berichte
die wichtigsten Informationen aus der
DS-Berichtsvorschau direkt in der
Berichtsubersicht an.
=======================================
*/

(function () {
    'use strict';

    const VERSION = '0.1.16';
    const DEBUG = true;
    const MAX_REPORTS = 100;
    const MAX_CONCURRENT_REQUESTS = 1;
    const REQUEST_DELAY_MS = 100;
    const MAX_FAKE_SPIES = 10;
    const MAX_FAKE_CATAPULTS = 14;
    const MAX_SHARP_ATTACKER_UNITS = 1000;
    const MIN_DEFF_PER_UNIT = 100;
    const OWN_SHARP_ATTACKER_NAME = 'Rincewind610';
    const ATTACKER_SHARP_CLASS = 'dshelper-report-attacker-sharp';
    const ATTACKER_OWN_SHARP_LOST_CLASS = 'dshelper-report-attacker-own-sharp-lost';
    const ATTACKER_OWN_SHARP_SURVIVED_CLASS = 'dshelper-report-attacker-own-sharp-survived';
    const DEFENDER_NO_SPY_CLASS = 'dshelper-report-defender-no-spy';
    const DEFENDER_NO_DEFF_CLASS = 'dshelper-defender-no-deff';
    const ATTACKER_UNIT_KEYS = [
        'spear',
        'sword',
        'axe',
        'marcher',
        'archer',
        'spy',
        'light',
        'heavy',
        'ram',
        'catapult',
        'knight',
        'snob'
    ];
    const SHARP_OFF_UNIT_KEYS = ['axe', 'light', 'marcher', 'ram'];
    const SCRIPT_PREFIX = '[DS Helper Berichtsubersicht]';

    function initReportOverview() {
        if (!isReportScreen()) {
            debugLog('Keine Berichtsubersicht, Script beendet.');
            return;
        }

        injectStyles();

        const reportRows = getReportRows();
        debugLog('Gefundene Berichtszeilen:', reportRows.length);

        const reports = reportRows
            .map(function (row) {
                return {
                    row: row,
                    id: getReportId(row),
                    subject: getReportSubject(row)
                };
            })
            .filter(function (report) {
                if (!report.id) {
                    return false;
                }

                if (isSupportSubject(report.subject)) {
                    debugLog('Unterstuetzungsbericht vor AJAX uebersprungen:', report.id, report.subject);
                    return false;
                }

                return true;
            });

        debugLog('Report-IDs ohne Unterstuetzung:', reports.map(function (report) {
            return report.id;
        }).slice(0, MAX_REPORTS), 'von', reports.length);

        processReportsWithConcurrency(reports);
    }

    async function processReportsWithConcurrency(reports) {
        let nextIndex = 0;
        let processedCombatReports = 0;

        function reserveCombatReportSlot() {
            if (processedCombatReports >= MAX_REPORTS) {
                return false;
            }

            processedCombatReports += 1;
            return true;
        }

        async function worker() {
            while (nextIndex < reports.length && processedCombatReports < MAX_REPORTS) {
                const report = reports[nextIndex];
                nextIndex += 1;

                await processSingleReport(report, reserveCombatReportSlot);
            }
        }

        const workerCount = Math.min(MAX_CONCURRENT_REQUESTS, reports.length);
        const workers = Array.from({ length: workerCount }, function () {
            return worker();
        });

        await Promise.all(workers);
    }

    async function processSingleReport(report, reserveCombatReportSlot) {
        debugLog('Request gestartet:', report.id);

        try {
            const dialogHtml = await fetchReportPreview(report.id);
            debugLog('AJAX-Antwort erhalten:', report.id);

            const previewData = parseReportPreview(dialogHtml, report.id);
            if (!previewData) {
                debugLog('Kein normaler Kampfbericht, uebersprungen:', report.id);
                return;
            }

            if (!reserveCombatReportSlot()) {
                debugLog('Maximale Anzahl verarbeiteter Kampfberichte erreicht:', report.id);
                return;
            }

            if (isFakeAttack(previewData.attackerTroopCounts)) {
                markReportCheckbox(report.row, report.id);
            }

            const previewRow = createReportPreviewRow(report.row, previewData);
            insertReportPreviewRow(report.row, previewRow);
        } catch (error) {
            console.warn(SCRIPT_PREFIX, 'Bericht konnte nicht verarbeitet werden:', report.id, error);
        } finally {
            debugLog('Request abgeschlossen:', report.id);
            await sleep(REQUEST_DELAY_MS);
        }
    }

    function sleep(ms) {
        return new Promise(function (resolve) {
            setTimeout(resolve, ms);
        });
    }

    function isReportScreen() {
        return new URLSearchParams(window.location.search).get('screen') === 'report';
    }

    function getReportRows() {
        const reportList = document.querySelector('#report_list');
        if (!reportList) {
            return [];
        }

        return Array.from(reportList.querySelectorAll('tr')).filter(function (row) {
            return Boolean(getReportId(row));
        });
    }

    function getReportId(row) {
        const quickEditTitle = row.querySelector('.quickedit.report-title[data-id]');
        if (quickEditTitle && quickEditTitle.dataset.id) {
            return quickEditTitle.dataset.id.trim();
        }

        const classMatch = Array.from(row.classList).find(function (className) {
            return /^report-\d+$/.test(className);
        });

        return classMatch ? classMatch.replace('report-', '') : null;
    }

    function getReportSubject(row) {
        const subjectElement = row.querySelector('.report-link') ||
            row.querySelector('.quickedit.report-title') ||
            row.querySelector('a[href*="screen=report"]');

        return cleanText(subjectElement ? subjectElement.textContent : row.textContent);
    }

    function isSupportSubject(subject) {
        return normalizeGermanText(subject).indexOf('unterstuetzt') !== -1;
    }

    async function fetchReportPreview(reportId) {
        const url = new URL(window.location.href);
        const villageId = url.searchParams.get('village');

        url.search = '';
        if (villageId) {
            url.searchParams.set('village', villageId);
        }
        url.searchParams.set('screen', 'report');
        url.searchParams.set('ajax', 'view');
        url.searchParams.set('id', reportId);

        const response = await fetch(url.toString(), {
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }

        const data = await response.json();
        const dialogHtml = data?.response?.dialog ?? data?.dialog;

        if (typeof dialogHtml !== 'string') {
            throw new Error('AJAX-Antwort enthaelt kein dialog-HTML.');
        }

        return dialogHtml;
    }

    function parseReportPreview(dialogHtml, reportId) {
        const doc = new DOMParser().parseFromString(dialogHtml, 'text/html');
        const root = doc.querySelector('.report-preview-content') ||
            doc.querySelector('.report-preview') ||
            doc.body;

        const attackerInfo = findInfoBlock(root, 'attacker');
        const defenderInfo = findInfoBlock(root, 'defender');
        const attackerTroops = findTroopTableForInfo(root, attackerInfo, 'attacker');
        const defenderTroops = findTroopTableForInfo(root, defenderInfo, 'defender');

        debugLog(
            'Report ' + reportId + ':',
            'attackerInfo=' + Boolean(attackerInfo),
            'defenderInfo=' + Boolean(defenderInfo),
            'attackerTroops=' + Boolean(attackerTroops),
            'defenderTroops=' + Boolean(defenderTroops)
        );

        if (!attackerInfo || !defenderInfo) {
            debugLog('Bericht mangels Kampfstruktur uebersprungen:', reportId);
            debugPreviewStructure(reportId, doc, dialogHtml);
            return null;
        }

        const defenderSpyCount = defenderTroops ? extractUnitAmountFromTroopTable(defenderTroops, 'spy') : null;
        const ownAttacker = isCurrentUserParticipant(attackerInfo, 'Angreifer');
        const ownDefender = isCurrentUserDefender(defenderInfo);
        const defenderDeffCounts = defenderTroops && ownDefender
            ? extractRequiredUnitAmountsFromTroopTable(defenderTroops, ['spear', 'sword', 'archer', 'heavy'])
            : null;
        const markNoDeff = Boolean(defenderDeffCounts && hasInsufficientDeff(defenderDeffCounts));
        const attackerTroopCounts = attackerTroops ? extractTroopCounts(attackerTroops) : null;
        const attackerLossCounts = attackerTroops ? extractTroopLossCounts(attackerTroops) : null;
        const attackerName = getInfoValueTextByLabel(attackerInfo, 'Angreifer');
        const sharpAttackCheck = getSharpAttackCheck(attackerTroopCounts, attackerLossCounts, attackerName);

        debugLog('Scharf-Pruefung:', Object.assign({ reportId: reportId }, sharpAttackCheck));

        if (!attackerTroops) {
            debugLog('Angreifer-Truppen unbekannt:', reportId);
        }

        if (!defenderTroops) {
            debugLog('Verteidiger-Truppen unbekannt:', reportId);
        }

        debugLog('Defender spy ' + reportId + ':', defenderSpyCount === null ? 'unbekannt' : defenderSpyCount);
        if (markNoDeff) {
            debugLog(
                'Eigener Verteidiger ohne Deff:',
                reportId,
                'spear=' + defenderDeffCounts.spear,
                'sword=' + defenderDeffCounts.sword,
                'archer=' + defenderDeffCounts.archer,
                'heavy=' + defenderDeffCounts.heavy
            );
        }

        return {
            attacker: createClonedSection('Angreifer', attackerInfo, attackerTroops, {
                markSharp: sharpAttackCheck.isSharp,
                ownSharpAllLost: sharpAttackCheck.isOwnSharp && sharpAttackCheck.allAttackerTroopsLost,
                ownSharpSurvived: sharpAttackCheck.isOwnSharp && !sharpAttackCheck.allAttackerTroopsLost,
                ownVillage: ownAttacker
            }),
            defender: createClonedSection('Verteidiger', defenderInfo, defenderTroops, {
                markNoSpy: defenderSpyCount === 0,
                markNoDeff: markNoDeff,
                ownVillage: ownDefender
            }),
            attackerTroopCounts: attackerTroopCounts
        };
    }

    function findInfoBlock(root, type) {
        const preferredSelector = type === 'attacker'
            ? '#attack_info_att, .attack_info_att'
            : '#attack_info_def, .attack_info_def';
        const preferredElement = root.querySelector(preferredSelector);

        if (preferredElement) {
            return preferredElement;
        }

        return findInfoTableByLabels(root, type);
    }

    function findInfoTableByLabels(root, type) {
        const requiredLabels = type === 'attacker'
            ? ['Angreifer', 'Herkunft']
            : ['Verteidiger', 'Ziel'];
        const fallbackLabels = type === 'attacker'
            ? ['Angreifer']
            : ['Verteidiger', 'Ziel'];
        const tables = Array.from(root.querySelectorAll('table')).filter(function (table) {
            return !isTroopTable(table);
        });

        return tables.find(function (table) {
            return hasAllLabels(table, requiredLabels);
        }) || tables.find(function (table) {
            return hasAnyLabel(table, fallbackLabels) && table.querySelector('a');
        }) || null;
    }

    function findTroopTableForInfo(root, infoElement, type) {
        if (!infoElement) {
            return null;
        }

        const sectionNodes = getSectionNodes(infoElement);
        if (type === 'defender' && hasUnknownDefenderTroops(sectionNodes)) {
            return null;
        }

        return findTroopTable(sectionNodes);
    }

    function hasUnknownDefenderTroops(sectionNodes) {
        const sectionText = normalizeGermanText(sectionNodes.map(function (node) {
            return node.textContent;
        }).join(' '));
        const unknownPatterns = [
            'keiner deiner kaempfer ist lebend zurueckgekehrt',
            'keine informationen ueber die truppenstaerke',
            'keine informationen uber die truppenstarke'
        ];

        return unknownPatterns.some(function (pattern) {
            return sectionText.indexOf(pattern) !== -1;
        });
    }


    function getSectionNodes(infoElement) {
        const nodes = [infoElement];
        let current = infoElement.nextElementSibling;

        while (current && !isInfoBoundary(current)) {
            nodes.push(current);
            current = current.nextElementSibling;
        }

        return nodes;
    }

    function findTroopTable(nodes) {
        for (const node of nodes) {
            if (node.matches && node.matches('table') && isTroopTable(node)) {
                return node;
            }

            const table = node.querySelector && Array.from(node.querySelectorAll('table')).find(isTroopTable);
            if (table) {
                return table;
            }
        }

        return null;
    }

    function isTroopTable(table) {
        return Boolean(table.querySelector('img')) && Boolean(findAmountRow(table));
    }

    function findAmountRow(table) {
        return findTroopCountRow(table, 'Anzahl');
    }

    function findLossesRow(table) {
        return findTroopCountRow(table, 'Verluste');
    }

    function findTroopCountRow(table, label) {
        return Array.from(table.querySelectorAll('tr')).find(function (row) {
            const firstCell = row.querySelector('td, th');
            return firstCell && stripTrailingColon(firstCell.textContent).toLowerCase() === label.toLowerCase();
        }) || null;
    }

    function extractTroopCounts(table) {
        return extractTroopCountsFromRow(table, findAmountRow(table));
    }

    function extractTroopLossCounts(table) {
        return extractTroopCountsFromRow(table, findLossesRow(table));
    }

    function extractTroopCountsFromRow(table, countRow) {
        const iconRow = findIconRowBeforeAmount(table, countRow);

        if (!countRow || !iconRow) {
            return null;
        }

        const iconCells = Array.from(iconRow.children).filter(function (cell) {
            return cell.matches('td, th') && cell.querySelector('img');
        });
        const amountCells = getAmountCells(countRow);

        if (iconCells.length === 0 || amountCells.length !== iconCells.length) {
            return null;
        }

        const counts = {};
        for (let index = 0; index < iconCells.length; index += 1) {
            const unitKey = getUnitKey(iconCells[index]);
            const amount = parseUnitAmount(amountCells[index].textContent);

            if (!unitKey || amount === null || Object.prototype.hasOwnProperty.call(counts, unitKey)) {
                return null;
            }

            counts[unitKey] = amount;
        }

        return counts;
    }

    function findIconRowBeforeAmount(table, amountRow) {
        const rows = Array.from(table.querySelectorAll('tr'));
        const amountIndex = rows.indexOf(amountRow);

        if (amountIndex === -1) {
            return null;
        }

        return rows.slice(0, amountIndex).reverse().find(function (row) {
            return row.querySelector('img');
        }) || null;
    }

    function getAmountCells(amountRow) {
        const cells = Array.from(amountRow.children).filter(function (cell) {
            return cell.matches('td, th');
        });
        const firstCell = cells[0] || null;

        if (firstCell && /^(Anzahl|Verluste)$/i.test(stripTrailingColon(firstCell.textContent))) {
            return cells.slice(1);
        }

        return cells;
    }

    function getUnitKey(cell) {
        const image = cell.querySelector('img');
        if (!image) {
            return null;
        }

        const haystack = normalizeGermanText([
            image.getAttribute('src'),
            image.getAttribute('class'),
            image.getAttribute('title'),
            image.getAttribute('alt')
        ].join(' '));
        const unitPatterns = [
            ['spear', ['unit_spear', 'spear', 'speer']],
            ['sword', ['unit_sword', 'sword', 'schwert']],
            ['axe', ['unit_axe', 'axe', 'axt']],
            ['marcher', ['unit_marcher', 'marcher', 'berittener bogenschuetze']],
            ['archer', ['unit_archer', 'archer', 'bogenschuetze']],
            ['spy', ['unit_spy', 'spy', 'spaeher']],
            ['light', ['unit_light', 'light', 'leichte kavallerie']],
            ['heavy', ['unit_heavy', 'heavy', 'schwere kavallerie']],
            ['ram', ['unit_ram', 'ram', 'rammbock']],
            ['catapult', ['unit_catapult', 'catapult', 'katapult']],
            ['knight', ['unit_knight', 'knight', 'paladin']],
            ['snob', ['unit_snob', 'snob', 'adelsgeschlecht']]
        ];
        const match = unitPatterns.find(function (entry) {
            return entry[1].some(function (pattern) {
                return haystack.indexOf(pattern) !== -1;
            });
        });

        return match ? match[0] : null;
    }

    function parseUnitAmount(value) {
        const digits = cleanText(value).replace(/[^0-9]/g, '');
        if (digits === '') {
            return null;
        }

        return Number(digits);
    }

    function isCurrentUserDefender(defenderInfo) {
        return isCurrentUserParticipant(defenderInfo, 'Verteidiger');
    }

    function isCurrentUserParticipant(infoElement, playerLabel) {
        const currentPlayerName = getCurrentPlayerName();
        const participantName = getInfoValueTextByLabel(infoElement, playerLabel);

        return Boolean(currentPlayerName && participantName &&
            normalizeGermanText(currentPlayerName) === normalizeGermanText(participantName));
    }

    function getCurrentPlayerName() {
        return window.game_data && window.game_data.player && window.game_data.player.name
            ? cleanText(window.game_data.player.name)
            : '';
    }

    function getInfoValueTextByLabel(infoElement, label) {
        const valueElement = findInfoValueByLabel(infoElement, label);
        return valueElement ? cleanText(valueElement.textContent) : '';
    }

    function extractRequiredUnitAmountsFromTroopTable(table, unitKeys) {
        const counts = {};

        for (const unitKey of unitKeys) {
            const amount = extractUnitAmountFromTroopTable(table, unitKey);
            if (amount === null) {
                return null;
            }

            counts[unitKey] = amount;
        }

        return counts;
    }

    function hasInsufficientDeff(counts) {
        return counts.spear < MIN_DEFF_PER_UNIT &&
            counts.sword < MIN_DEFF_PER_UNIT &&
            counts.archer < MIN_DEFF_PER_UNIT &&
            counts.heavy < MIN_DEFF_PER_UNIT;
    }

    function extractUnitAmountFromTroopTable(table, unitKey) {
        const amountRow = findAmountRow(table);
        const iconRow = findIconRowBeforeAmount(table, amountRow);

        if (!amountRow || !iconRow) {
            return null;
        }

        const iconCells = Array.from(iconRow.children).filter(function (cell) {
            return cell.matches('td, th') && cell.querySelector('img');
        });
        const amountCells = getAmountCells(amountRow);

        if (iconCells.length === 0 || amountCells.length !== iconCells.length) {
            return null;
        }

        let found = false;
        let foundAmount = null;
        for (let index = 0; index < iconCells.length; index += 1) {
            if (getUnitKey(iconCells[index]) !== unitKey) {
                continue;
            }

            if (found) {
                return null;
            }

            found = true;
            foundAmount = parseUnitAmount(amountCells[index].textContent);
            if (foundAmount === null) {
                return null;
            }
        }

        return found ? foundAmount : null;
    }

    function isFakeAttack(counts) {
        if (!counts) {
            return false;
        }

        const spyCount = getTroopCount(counts, 'spy');
        const catapultCount = getTroopCount(counts, 'catapult');

        return spyCount >= 1 &&
            spyCount <= MAX_FAKE_SPIES &&
            catapultCount <= MAX_FAKE_CATAPULTS &&
            hasOnlyAllowedAttackerUnits(counts, ['spy', 'catapult']);
    }

    function getSharpAttackCheck(counts, lossCounts, attackerName) {
        const total = counts ? getTotalAttackerTroopCount(counts) : 0;
        const hasOffTroops = Boolean(counts && hasRealOffTroops(counts));
        const hasNoble = Boolean(counts && getTroopCount(counts, 'snob') > 0);
        const isFake = isFakeAttack(counts);
        const isSharp = Boolean(counts &&
            !isFake &&
            !hasNoble &&
            total <= MAX_SHARP_ATTACKER_UNITS &&
            hasOffTroops);
        const isOwnSharp = isSharp && isSpecialSharpAttacker(attackerName);
        const allAttackerTroopsLost = isOwnSharp && hasAllAttackerTroopsLost(counts, lossCounts);

        return {
            total: total,
            hasOffTroops: hasOffTroops,
            hasNoble: hasNoble,
            isFake: isFake,
            isSharp: isSharp,
            attackerName: attackerName || '',
            isOwnSharp: isOwnSharp,
            allAttackerTroopsLost: allAttackerTroopsLost
        };
    }

    function isSpecialSharpAttacker(attackerName) {
        return normalizeGermanText(attackerName) === normalizeGermanText(OWN_SHARP_ATTACKER_NAME);
    }

    function hasAllAttackerTroopsLost(counts, lossCounts) {
        if (!counts || !lossCounts) {
            return false;
        }

        let hasPresentTroops = false;
        for (const unitKey of ATTACKER_UNIT_KEYS) {
            const amount = getTroopCount(counts, unitKey);
            if (amount === 0) {
                continue;
            }

            hasPresentTroops = true;
            if (getTroopCount(lossCounts, unitKey) < amount) {
                return false;
            }
        }

        return hasPresentTroops;
    }

    function hasRealOffTroops(counts) {
        return SHARP_OFF_UNIT_KEYS.some(function (unitKey) {
            return getTroopCount(counts, unitKey) > 0;
        });
    }

    function getTroopCount(counts, unitKey) {
        return Object.prototype.hasOwnProperty.call(counts, unitKey) ? counts[unitKey] : 0;
    }

    function getTotalAttackerTroopCount(counts) {
        return ATTACKER_UNIT_KEYS.reduce(function (total, unitKey) {
            return total + getTroopCount(counts, unitKey);
        }, 0);
    }

    function hasOnlyAllowedAttackerUnits(counts, allowedUnitKeys) {
        const allowedUnits = new Set(allowedUnitKeys);

        return ATTACKER_UNIT_KEYS.every(function (unitKey) {
            return allowedUnits.has(unitKey) || getTroopCount(counts, unitKey) === 0;
        });
    }

    function markReportCheckbox(reportRow, reportId) {
        const checkbox = reportRow.querySelector('input[type="checkbox"][name^="id_"]') ||
            reportRow.querySelector('input[type="checkbox"]');

        if (!checkbox) {
            debugLog('Keine Checkbox zum Markieren gefunden:', reportId);
            return;
        }

        checkbox.checked = true;
        debugLog('Fake automatisch markiert:', reportId);
    }

    function createClonedSection(title, infoElement, troopTable, options) {
        return {
            title: title,
            compactInfo: createCompactInfoLine(title, infoElement, Boolean(options && options.ownVillage)),
            troopTable: troopTable ? sanitizeTroopTable(troopTable) : null,
            markNoSpy: Boolean(options && options.markNoSpy),
            markNoDeff: Boolean(options && options.markNoDeff),
            markSharp: Boolean(options && options.markSharp),
            ownSharpAllLost: Boolean(options && options.ownSharpAllLost),
            ownSharpSurvived: Boolean(options && options.ownSharpSurvived)
        };
    }

    function createCompactInfoLine(title, infoElement, ownVillage) {
        const line = document.createElement('div');
        line.className = 'dshelper-report-line';

        const label = document.createElement('strong');
        label.textContent = title + ': ';
        line.appendChild(label);

        const values = getInfoValues(infoElement, title === 'Angreifer'
            ? ['Angreifer', 'Herkunft']
            : ['Verteidiger', 'Ziel']);

        if (values.length === 0) {
            const fallbackInfo = sanitizeClonedElement(infoElement);
            line.appendChild(document.createTextNode(cleanText(fallbackInfo.textContent)));
            return line;
        }

        values.forEach(function (value, index) {
            if (index > 0) {
                line.appendChild(document.createTextNode(' - '));
                prepareVillageLinks(value, ownVillage);
            }
            appendCompactValue(line, value);
        });

        return line;
    }

    function getInfoValues(infoElement, labels) {
        return labels.map(function (label) {
            return findInfoValueByLabel(infoElement, label);
        }).filter(Boolean);
    }

    function findInfoValueByLabel(infoElement, label) {
        const rows = Array.from(infoElement.querySelectorAll('tr'));
        const row = rows.find(function (candidate) {
            const firstCell = candidate.querySelector('td, th');
            return firstCell && stripTrailingColon(firstCell.textContent).toLowerCase() === label.toLowerCase();
        });

        if (!row) {
            return null;
        }

        const cells = Array.from(row.children).filter(function (cell) {
            return cell.matches('td, th');
        });
        const valueCell = cells[1] || null;

        if (!valueCell) {
            return null;
        }

        return sanitizeClonedElement(valueCell);
    }

    function appendCompactValue(target, valueElement) {
        while (valueElement.firstChild) {
            target.appendChild(valueElement.firstChild);
        }
    }

    function prepareVillageLinks(root, ownVillage) {
        Array.from(root.querySelectorAll('a[href]')).forEach(function (link) {
            const url = getVillageInfoUrl(link);
            if (!url) {
                return;
            }

            if (ownVillage) {
                const ownVillageUrl = createOwnVillageOverviewUrl(url);
                if (ownVillageUrl) {
                    link.href = ownVillageUrl;
                }
            }

            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        });
    }

    function getVillageInfoUrl(link) {
        try {
            const url = new URL(link.getAttribute('href'), window.location.origin);
            if (!url.pathname.endsWith('/game.php') && !url.pathname.endsWith('game.php')) {
                return null;
            }

            if (url.searchParams.get('screen') !== 'info_village' || !url.searchParams.get('id')) {
                return null;
            }

            return url;
        } catch (error) {
            return null;
        }
    }

    function createOwnVillageOverviewUrl(infoVillageUrl) {
        const villageId = infoVillageUrl.searchParams.get('id');
        if (!villageId) {
            return null;
        }

        const overviewUrl = new URL(infoVillageUrl.origin + infoVillageUrl.pathname);
        overviewUrl.searchParams.set('village', villageId);
        overviewUrl.searchParams.set('screen', 'overview');
        return overviewUrl.toString();
    }

    function sanitizeTroopTable(table) {
        const clone = sanitizeClonedElement(table);

        Array.from(clone.querySelectorAll('tr')).forEach(function (row) {
            const firstCell = row.querySelector('td, th');
            const label = firstCell ? stripTrailingColon(firstCell.textContent) : '';
            const isIconHeader = Boolean(row.querySelector('img'));
            const isAmountRow = label.toLowerCase() === 'anzahl';

            if (!isIconHeader && !isAmountRow) {
                row.remove();
                return;
            }

            if (isIconHeader) {
                removeLeadingLabelCell(row, true);
            }

            if (isAmountRow) {
                removeLeadingLabelCell(row, false);
            }
        });

        return clone;
    }

    function removeLeadingLabelCell(row, requireNoImage) {
        const firstCell = row.querySelector('td, th');
        if (!firstCell) {
            return;
        }

        if (requireNoImage && firstCell.querySelector('img')) {
            return;
        }

        firstCell.remove();
    }

    function sanitizeClonedElement(element) {
        const clone = element.cloneNode(true);

        removeEffectContent(clone);

        Array.from(clone.querySelectorAll('*')).forEach(function (child) {
            Array.from(child.attributes).forEach(function (attribute) {
                if (/^on/i.test(attribute.name)) {
                    child.removeAttribute(attribute.name);
                }
            });
        });

        return clone;
    }

    function removeEffectContent(root) {
        Array.from(root.querySelectorAll('tr, li, p, div')).forEach(function (element) {
            if (isEffectText(element.textContent)) {
                element.remove();
            }
        });
    }

    function isEffectText(value) {
        const text = normalizeGermanText(value);
        return text.indexOf('effekte:') !== -1 ||
            text.indexOf('angriffsstaerke') !== -1 ||
            text.indexOf('gebaeudeschaden') !== -1 ||
            text.indexOf('max. schwaechung des walls') !== -1 ||
            text.indexOf('paladin') !== -1;
    }

    function createReportPreviewRow(reportRow, data) {
        const row = document.createElement('tr');
        row.className = 'dshelper-report-preview-row';

        const cell = document.createElement('td');
        cell.colSpan = getColspan(reportRow);

        const wrapper = document.createElement('div');
        wrapper.className = 'dshelper-report-preview';
        wrapper.appendChild(createParticipantBlock(data.attacker));
        wrapper.appendChild(createParticipantBlock(data.defender));

        cell.appendChild(wrapper);
        row.appendChild(cell);

        return row;
    }

    function createParticipantBlock(section) {
        const block = document.createElement('div');
        block.className = 'dshelper-report-section';
        if (section.markNoDeff) {
            block.classList.add(DEFENDER_NO_DEFF_CLASS);
        } else if (section.markNoSpy) {
            block.classList.add(DEFENDER_NO_SPY_CLASS);
        }

        if (section.title === 'Angreifer' && section.markSharp) {
            if (section.ownSharpAllLost) {
                block.classList.add(ATTACKER_OWN_SHARP_LOST_CLASS);
            } else if (section.ownSharpSurvived) {
                block.classList.add(ATTACKER_OWN_SHARP_SURVIVED_CLASS);
            } else {
                block.classList.add(ATTACKER_SHARP_CLASS);
            }
            section.compactInfo.appendChild(createSharpLabel());
        }

        block.appendChild(section.compactInfo);

        const troops = document.createElement('div');
        troops.className = 'dshelper-report-troops';
        if (section.troopTable) {
            troops.appendChild(section.troopTable);
        } else {
            troops.classList.add('dshelper-report-troops-unknown');
            troops.textContent = 'Truppen unbekannt';
        }
        block.appendChild(troops);

        return block;
    }

    function createSharpLabel() {
        const label = document.createElement('span');
        label.className = 'dshelper-report-sharp-label';
        label.textContent = 'Scharf';
        return label;
    }

    function insertReportPreviewRow(reportRow, previewRow) {
        reportRow.insertAdjacentElement('afterend', previewRow);
    }

    function getColspan(reportRow) {
        return Math.max(1, reportRow.children.length);
    }

    function isInfoBoundary(element) {
        return element.id === 'attack_info_att' ||
            element.id === 'attack_info_def' ||
            element.classList.contains('attack_info_att') ||
            element.classList.contains('attack_info_def') ||
            hasAnyLabel(element, ['Angreifer', 'Verteidiger']);
    }

    function hasAllLabels(element, labels) {
        return labels.every(function (label) {
            return hasLabel(element, label);
        });
    }

    function hasAnyLabel(element, labels) {
        return labels.some(function (label) {
            return hasLabel(element, label);
        });
    }

    function hasLabel(element, label) {
        const labelPattern = new RegExp('(^|\\s)' + escapeRegExp(label) + '\\s*:', 'i');
        return labelPattern.test(cleanText(element.textContent));
    }

    function stripTrailingColon(value) {
        return cleanText(value).replace(/:$/, '');
    }

    function cleanText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function normalizeGermanText(value) {
        return cleanText(value)
            .toLowerCase()
            .replace(/\u00e4/g, 'ae')
            .replace(/\u00f6/g, 'oe')
            .replace(/\u00fc/g, 'ue')
            .replace(/\u00df/g, 'ss');
    }

    function debugPreviewStructure(reportId, doc, dialogHtml) {
        if (!DEBUG) {
            return;
        }

        const tables = Array.from(doc.querySelectorAll('table'));
        const structure = {
            tableIds: uniqueValues(tables.map(function (table) {
                return table.id;
            })),
            tableClasses: uniqueValues(tables.flatMap(function (table) {
                return Array.from(table.classList);
            })),
            headings: Array.from(doc.querySelectorAll('h3, h4')).map(function (heading) {
                return cleanText(heading.textContent);
            }).filter(Boolean),
            htmlStart: String(dialogHtml || '').slice(0, 1000)
        };

        debugLog('Preview-Struktur ' + reportId + ':', structure);
    }

    function uniqueValues(values) {
        return Array.from(new Set(values.filter(Boolean)));
    }

    function escapeRegExp(value) {
        return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function injectStyles() {
        if (document.getElementById('dshelper-report-overview-styles')) {
            return;
        }

        const style = document.createElement('style');
        style.id = 'dshelper-report-overview-styles';
        style.textContent = [
            '.dshelper-report-preview-row > td { padding: 1px 4px 3px 24px; }',
            '.dshelper-report-preview { display: flex; flex-wrap: wrap; gap: 4px; margin: 1px 0 2px; }',
            '.dshelper-report-section { box-sizing: border-box; flex: 1 1 320px; min-width: 280px; border: 1px solid #c1a264; background: #f4e4bc; padding: 3px 4px; color: #3f2f1d; line-height: 15px; }',
            '.dshelper-report-attacker-sharp { background: #ffd28a; border-left: 4px solid #d17a00; }',
            '.dshelper-report-attacker-own-sharp-lost { background: #c8f7c5; border-left: 4px solid #2f9e44; }',
            '.dshelper-report-attacker-own-sharp-survived { background: #1f6f3a; border-left: 4px solid #0f3d20; color: #f1fff4; }',
            '.dshelper-report-attacker-own-sharp-survived a { color: #ffffff; }',
            '.dshelper-report-sharp-label { display: inline-block; margin-left: 6px; padding: 0 4px; border: 1px solid #b86400; background: #f6a623; color: #2f1b00; font-weight: bold; line-height: 13px; }',
            '.dshelper-report-defender-no-spy { background: #f3c7bd; border-color: #b76a5d; }',
            '.dshelper-defender-no-deff { background: #7f1d1d; border-color: #4c0f0f; color: #fff2f2; }',
            '.dshelper-defender-no-deff a { color: #ffffff; }',
            '.dshelper-report-line { margin: 0 0 2px; white-space: normal; }',
            '.dshelper-report-line strong { font-weight: bold; }',
            '.dshelper-report-troops { margin: 0; }',
            '.dshelper-report-troops table { width: auto; margin: 0; border-spacing: 1px; border-collapse: separate; }',
            '.dshelper-report-troops td, .dshelper-report-troops th { padding: 0 3px; text-align: center; line-height: 15px; }',
            '.dshelper-report-troops img { vertical-align: middle; }',
            '.dshelper-report-troops-unknown { font-style: italic; color: #6d5b42; line-height: 15px; }'
        ].join('\n');
        document.head.appendChild(style);
    }

    function debugLog() {
        if (!DEBUG) {
            return;
        }

        console.log.apply(console, [SCRIPT_PREFIX].concat(Array.from(arguments)));
    }

    initReportOverview();
})();