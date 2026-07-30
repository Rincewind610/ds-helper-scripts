/*
=======================================
DS Helper
Name: Prägevorbereitung
Version: 0.6.10.3
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

    const VERSION = '0.6.10.3';
    const DISTANCE_GROUPS = [
        {
            id: 1,
            name: 'Sehr nah',
            maxDistance: 10,
            targetFill: 0.95
        },
        {
            id: 2,
            name: 'Nah',
            maxDistance: 20,
            targetFill: 0.85
        },
        {
            id: 3,
            name: 'Mittel',
            maxDistance: 30,
            targetFill: 0.75
        },
        {
            id: 4,
            name: 'Weit',
            maxDistance: 40,
            targetFill: 0.65
        },
        {
            id: 5,
            name: 'Sehr weit',
            maxDistance: 50,
            targetFill: 0.55
        },
        {
            id: 6,
            name: 'Extrem weit',
            maxDistance: 60,
            targetFill: 0.45
        },
        {
            id: 7,
            name: 'Außenbereich',
            maxDistance: 70,
            targetFill: 0.35
        },
        {
            id: 8,
            name: 'Randbereich',
            maxDistance: Infinity,
            targetFill: 0.25
        }
    ];

    // Tragekapazität pro freiem Händler.
    // Standard: 1000
    // Mit aktivem Premium-Händlerbonus: 1500
    const MERCHANT_CAPACITY = 1500;

    // Mindestbestand, den ein sendendes Dorf nach allen Transporten behält.
    const SENDER_RESERVE = {
        wood: 160000,
        clay: 180000,
        iron: 140000
    };

    const DEFAULT_COIN_VILLAGE_COORD = '538|573';

    const COIN_VILLAGE = loadCoinVillage();

    const POPUP_ID = 'ds-helper-praegevorbereitung';

    const TRANSPORT_OPEN_DELAY = 250;

    const transportOpenState = {
        openedIndexes: new Set(),
        isOpening: false
    };

    function parseGameNumber(value) {
        if (value === null || value === undefined) {
            return 0;
        }

        const cleaned = String(value)
            .replace(/\./g, '')
            .replace(/[^\d-]/g, '');

        return cleaned ? parseInt(cleaned, 10) : 0;
    }

    function loadCoinVillage() {
        const savedCoord =
            localStorage.getItem(
                'dsHelperPraegeCoinVillage'
            ) || DEFAULT_COIN_VILLAGE_COORD;

        const match = savedCoord.match(
            /^(\d{1,3})\|(\d{1,3})$/
        );

        if (!match) {
            return {
                x: 538,
                y: 573,
                coord: DEFAULT_COIN_VILLAGE_COORD
            };
        }

        return {
            x: parseInt(match[1], 10),
            y: parseInt(match[2], 10),
            coord: savedCoord
        };
    }

    function saveCoinVillage(coord) {
        const normalizedCoord = String(coord)
            .trim()
            .replace(/\s+/g, '');

        const match = normalizedCoord.match(
            /^(\d{1,3})\|(\d{1,3})$/
        );

        if (!match) {
            UI.ErrorMessage(
                'Bitte eine gültige Koordinate wie 538|573 eingeben.',
                5000
            );

            return false;
        }

        localStorage.setItem(
            'dsHelperPraegeCoinVillage',
            normalizedCoord
        );

        return true;
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

        $('.quickedit-vn').closest('tr').each(function () {
            const row = $(this);

            const villageElement = row
                .find('.quickedit-vn')
                .first();

            const villageId = String(
                villageElement.attr('data-id') || ''
            );

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
                id: villageId,

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
    function getDistanceGroup(distance) {
        for (const group of DISTANCE_GROUPS) {
            if (distance <= group.maxDistance) {
                return {
                    id: group.id,
                    name: group.name,
                    targetFill: group.targetFill
                };
            }
        }

        return {
            id: 8,
            name: 'Randbereich',
            targetFill: 0.25
        };
    }


    function prepareSimulation(villages) {
        return villages.map(function (village) {
            const distanceGroup = getDistanceGroup(
                village.distanceToCoinVillage
            );

            const targetAmount = Math.floor(
                village.storage * distanceGroup.targetFill
            );

            const needWood = Math.max(
                0,
                targetAmount - village.wood
            );

            const needClay = Math.max(
                0,
                targetAmount - village.clay
            );

            const needIron = Math.max(
                0,
                targetAmount - village.iron
            );

            const surplusWood = Math.max(
                0,
                village.wood - targetAmount
            );

            const surplusClay = Math.max(
                0,
                village.clay - targetAmount
            );

            const surplusIron = Math.max(
                0,
                village.iron - targetAmount
            );

            const hasNeed =
                needWood > 0 ||
                needClay > 0 ||
                needIron > 0;

            const hasSurplus =
                surplusWood > 0 ||
                surplusClay > 0 ||
                surplusIron > 0;

            let role = 'balanced';

            if (hasNeed) {
                role = 'receiver';
            } else if (hasSurplus) {
                role = 'sender';
            }

            return Object.assign({}, village, {
                simulation: {
                    distanceGroupId: distanceGroup.id,
                    distanceGroupName: distanceGroup.name,

                    role: role,
                    targetFill: distanceGroup.targetFill,
                    targetAmount: targetAmount,

                    needWood: needWood,
                    needClay: needClay,
                    needIron: needIron,

                    surplusWood: surplusWood,
                    surplusClay: surplusClay,
                    surplusIron: surplusIron
                }
            });
        });
    }
    function buildGroupSummary(villages) {
        const groups = {};

        villages.forEach(function (village) {
            const id = village.simulation.distanceGroupId;

            if (!groups[id]) {
                groups[id] = {
                    id: id,
                    name: village.simulation.distanceGroupName,

                    villages: 0,

                    needWood: 0,
                    needClay: 0,
                    needIron: 0,

                    surplusWood: 0,
                    surplusClay: 0,
                    surplusIron: 0,

                    saldoWood: 0,
                    saldoClay: 0,
                    saldoIron: 0
                };
            }

            groups[id].villages++;

            groups[id].needWood +=
                village.simulation.needWood;

            groups[id].needClay +=
                village.simulation.needClay;

            groups[id].needIron +=
                village.simulation.needIron;

            groups[id].surplusWood +=
                village.simulation.surplusWood;

            groups[id].surplusClay +=
                village.simulation.surplusClay;

            groups[id].surplusIron +=
                village.simulation.surplusIron;
        });

        const summary = Object.values(groups);

        summary.forEach(function (group) {
            group.saldoWood =
                group.surplusWood - group.needWood;

            group.saldoClay =
                group.surplusClay - group.needClay;

            group.saldoIron =
                group.surplusIron - group.needIron;
        });

        return summary;
    }
    function buildGroupFlows(
        groupSummary,
        villagePoolSummary
    ) {
        const flows = [];

        const receivers = groupSummary
            .filter(function (group) {
                return (
                    group.needWood > 0 ||
                    group.needClay > 0 ||
                    group.needIron > 0
                );
            })
            .sort(function (a, b) {
                return a.id - b.id;
            })
            .map(function (group) {
                return {
                    id: group.id,

                    woodNeed: group.needWood,
                    clayNeed: group.needClay,
                    ironNeed: group.needIron
                };
            });

        const senders = villagePoolSummary
            .filter(function (group) {
                return (
                    group.woodAvailable > 0 ||
                    group.clayAvailable > 0 ||
                    group.ironAvailable > 0
                );
            })
            .sort(function (a, b) {
                return b.groupId - a.groupId;
            })
            .map(function (group) {
                return {
                    id: group.groupId,

                    woodAvailable:
                        group.woodAvailable,

                    clayAvailable:
                        group.clayAvailable,

                    ironAvailable:
                        group.ironAvailable
                };
            });

        receivers.forEach(function (receiver) {
            senders.forEach(function (sender) {
                if (sender.id <= receiver.id) {
                    return;
                }

                const wood = Math.min(
                    receiver.woodNeed,
                    sender.woodAvailable
                );

                const clay = Math.min(
                    receiver.clayNeed,
                    sender.clayAvailable
                );

                const iron = Math.min(
                    receiver.ironNeed,
                    sender.ironAvailable
                );

                if (
                    wood === 0 &&
                    clay === 0 &&
                    iron === 0
                ) {
                    return;
                }

                flows.push({
                    fromGroup: sender.id,
                    toGroup: receiver.id,

                    wood: wood,
                    clay: clay,
                    iron: iron
                });

                receiver.woodNeed -= wood;
                receiver.clayNeed -= clay;
                receiver.ironNeed -= iron;

                sender.woodAvailable -= wood;
                sender.clayAvailable -= clay;
                sender.ironAvailable -= iron;
            });
        });

        return {
            flows: flows,
            remainingNeeds: receivers,
            remainingResources: senders
        };
    }

    function buildVillagePools(villages) {
        const receiversByGroup = {};
        const sendersByGroup = {};

        villages.forEach(function (village, originalIndex) {
            if (village.isCoinVillage) {
                return;
            }

            const groupId =
                village.simulation.distanceGroupId;

            const villageState = {
                id: village.id,

                coord: village.coord,
                name: village.name,
                groupId: groupId,
                originalIndex: originalIndex,

                merchantsFree: village.merchantsFree,
                merchantsTotal: village.merchantsTotal,

                transportCapacity:
                    village.merchantsFree * MERCHANT_CAPACITY,

                woodNeed: village.simulation.needWood,
                clayNeed: village.simulation.needClay,
                ironNeed: village.simulation.needIron,

                woodAvailable: Math.max(
                    0,
                    village.wood - SENDER_RESERVE.wood
                ),

                clayAvailable: Math.max(
                    0,
                    village.clay - SENDER_RESERVE.clay
                ),

                ironAvailable: Math.max(
                    0,
                    village.iron - SENDER_RESERVE.iron
                )
            };

            const hasNeed =
                villageState.woodNeed > 0 ||
                villageState.clayNeed > 0 ||
                villageState.ironNeed > 0;

            const hasAvailableResources =
                villageState.woodAvailable > 0 ||
                villageState.clayAvailable > 0 ||
                villageState.ironAvailable > 0;

            if (hasNeed) {
                if (!receiversByGroup[groupId]) {
                    receiversByGroup[groupId] = [];
                }

                receiversByGroup[groupId].push(
                    Object.assign({}, villageState)
                );
            }

            if (
                hasAvailableResources &&
                villageState.merchantsFree > 0
            ) {
                if (!sendersByGroup[groupId]) {
                    sendersByGroup[groupId] = [];
                }

                sendersByGroup[groupId].push(
                    Object.assign({}, villageState)
                );
            }
        });

        return {
            receiversByGroup: receiversByGroup,
            sendersByGroup: sendersByGroup
        };
    }

    function buildVillagePoolSummary(villagePools) {
        const summary = [];

        Object.keys(villagePools.sendersByGroup)
            .map(Number)
            .sort(function (a, b) {
                return b - a;
            })
            .forEach(function (groupId) {
                const senders =
                    villagePools.sendersByGroup[groupId] || [];

                let woodAvailable = 0;
                let clayAvailable = 0;
                let ironAvailable = 0;
                let transportCapacity = 0;

                senders.forEach(function (sender) {
                    woodAvailable += sender.woodAvailable;
                    clayAvailable += sender.clayAvailable;
                    ironAvailable += sender.ironAvailable;
                    transportCapacity += sender.transportCapacity;
                });

                summary.push({
                    groupId: groupId,
                    senderVillages: senders.length,
                    woodAvailable: woodAvailable,
                    clayAvailable: clayAvailable,
                    ironAvailable: ironAvailable,
                    transportCapacity: transportCapacity
                });
            });

        return summary;
    }

    function simulateVillageFlow(
        senderGroupId,
        receiverGroupId,
        villagePools
    ) {
        const senders =
            villagePools.sendersByGroup[
            senderGroupId
            ] || [];

        const receivers =
            villagePools.receiversByGroup[
            receiverGroupId
            ] || [];

        if (
            senders.length === 0 ||
            receivers.length === 0
        ) {
            return [];
        }

        const senderStates = senders.map(function (sender) {
            return {
                id: sender.id,
                coord: sender.coord,

                woodAvailable: sender.woodAvailable,
                clayAvailable: sender.clayAvailable,
                ironAvailable: sender.ironAvailable
            };
        });

        const receiverStates = receivers.map(function (receiver) {
            return {
                coord: receiver.coord,

                woodNeed: receiver.woodNeed,
                clayNeed: receiver.clayNeed,
                ironNeed: receiver.ironNeed
            };
        });

        const transports = [];

        let senderIndex = 0;

        receiverStates.forEach(function (receiver) {
            while (
                (
                    receiver.woodNeed > 0 ||
                    receiver.clayNeed > 0 ||
                    receiver.ironNeed > 0
                ) &&
                senderIndex < senderStates.length
            ) {
                const sender = senderStates[senderIndex];

                const wood = Math.min(
                    sender.woodAvailable,
                    receiver.woodNeed
                );

                const clay = Math.min(
                    sender.clayAvailable,
                    receiver.clayNeed
                );

                const iron = Math.min(
                    sender.ironAvailable,
                    receiver.ironNeed
                );

                if (
                    wood === 0 &&
                    clay === 0 &&
                    iron === 0
                ) {
                    senderIndex++;
                    continue;
                }

                transports.push({
                    fromVillageId: sender.id,

                    from: sender.coord,
                    to: receiver.coord,

                    wood: wood,
                    clay: clay,
                    iron: iron
                });

                sender.woodAvailable -= wood;
                sender.clayAvailable -= clay;
                sender.ironAvailable -= iron;

                receiver.woodNeed -= wood;
                receiver.clayNeed -= clay;
                receiver.ironNeed -= iron;

                const senderIsExhausted =
                    sender.woodAvailable === 0 &&
                    sender.clayAvailable === 0 &&
                    sender.ironAvailable === 0;

                if (senderIsExhausted) {
                    senderIndex++;
                }
            }
        });

        return transports;
    }


    /*
=======================================
Alle Gruppenflüsse auf Dorfebene

Berücksichtigt:

- Sperrbestand der Senderdörfer
- aktuelle Bedarfe der Empfängerdörfer
- Obergrenzen der Gruppenflüsse
- aktuell freie Händler
- 1.500 Rohstoffe je Händler

Es werden weiterhin keine Transporte
im Spiel ausgeführt.
=======================================
*/
    function simulateAllVillageFlows(
        groupFlows,
        villagePools
    ) {
        const senderStatesByGroup = {};
        const receiverStatesByGroup = {};

        /*
        Verteilt eine geplante Rohstoffmenge
        proportional auf die noch verfügbare
        Händlerkapazität.
        */
        function limitTransportToCapacity(
            wood,
            clay,
            iron,
            capacity
        ) {
            const total = wood + clay + iron;

            if (total <= capacity) {
                return {
                    wood: wood,
                    clay: clay,
                    iron: iron
                };
            }

            if (capacity <= 0 || total <= 0) {
                return {
                    wood: 0,
                    clay: 0,
                    iron: 0
                };
            }

            const factor = capacity / total;

            let limitedWood = Math.floor(
                wood * factor
            );

            let limitedClay = Math.floor(
                clay * factor
            );

            let limitedIron = Math.floor(
                iron * factor
            );

            let remainingCapacity =
                capacity -
                limitedWood -
                limitedClay -
                limitedIron;

            /*
            Rundungsreste verteilen, ohne die
            ursprünglich geplanten Mengen zu
            überschreiten.
            */
            while (remainingCapacity > 0) {
                let changed = false;

                if (
                    limitedWood < wood &&
                    remainingCapacity > 0
                ) {
                    limitedWood++;
                    remainingCapacity--;
                    changed = true;
                }

                if (
                    limitedClay < clay &&
                    remainingCapacity > 0
                ) {
                    limitedClay++;
                    remainingCapacity--;
                    changed = true;
                }

                if (
                    limitedIron < iron &&
                    remainingCapacity > 0
                ) {
                    limitedIron++;
                    remainingCapacity--;
                    changed = true;
                }

                if (!changed) {
                    break;
                }
            }

            return {
                wood: limitedWood,
                clay: limitedClay,
                iron: limitedIron
            };
        }

        Object.keys(
            villagePools.sendersByGroup
        ).forEach(function (groupId) {
            senderStatesByGroup[groupId] =
                villagePools.sendersByGroup[groupId]
                    .map(function (sender) {
                        return {
                            id: sender.id,
                            coord: sender.coord,

                            woodAvailable:
                                sender.woodAvailable,

                            clayAvailable:
                                sender.clayAvailable,

                            ironAvailable:
                                sender.ironAvailable,

                            remainingTransportCapacity:
                                sender.transportCapacity
                        };
                    });
        });

        Object.keys(
            villagePools.receiversByGroup
        ).forEach(function (groupId) {
            receiverStatesByGroup[groupId] =
                villagePools.receiversByGroup[groupId]
                    .map(function (receiver) {
                        return {
                            coord: receiver.coord,

                            woodNeed:
                                receiver.woodNeed,

                            clayNeed:
                                receiver.clayNeed,

                            ironNeed:
                                receiver.ironNeed
                        };
                    });
        });

        const transports = [];

        groupFlows.forEach(function (groupFlow) {
            const senders =
                senderStatesByGroup[
                groupFlow.fromGroup
                ] || [];

            const receivers =
                receiverStatesByGroup[
                groupFlow.toGroup
                ] || [];

            if (
                senders.length === 0 ||
                receivers.length === 0
            ) {
                return;
            }

            let flowWoodRemaining =
                groupFlow.wood;

            let flowClayRemaining =
                groupFlow.clay;

            let flowIronRemaining =
                groupFlow.iron;

            let senderIndex = 0;

            receivers.forEach(function (receiver) {
                while (
                    (
                        receiver.woodNeed > 0 ||
                        receiver.clayNeed > 0 ||
                        receiver.ironNeed > 0
                    ) &&
                    (
                        flowWoodRemaining > 0 ||
                        flowClayRemaining > 0 ||
                        flowIronRemaining > 0
                    ) &&
                    senderIndex < senders.length
                ) {
                    const sender =
                        senders[senderIndex];

                    const plannedWood = Math.min(
                        sender.woodAvailable,
                        receiver.woodNeed,
                        flowWoodRemaining
                    );

                    const plannedClay = Math.min(
                        sender.clayAvailable,
                        receiver.clayNeed,
                        flowClayRemaining
                    );

                    const plannedIron = Math.min(
                        sender.ironAvailable,
                        receiver.ironNeed,
                        flowIronRemaining
                    );

                    const plannedTotal =
                        plannedWood +
                        plannedClay +
                        plannedIron;

                    /*
                    Dieser Sender kann für diesen
                    Gruppenfluss momentan nichts
                    beitragen. Nächster Sender.
                    */
                    if (plannedTotal === 0) {
                        senderIndex++;
                        continue;
                    }

                    /*
                    Transport auf die aktuell noch
                    freie Händlerkapazität begrenzen.
                    */
                    const limitedTransport =
                        limitTransportToCapacity(
                            plannedWood,
                            plannedClay,
                            plannedIron,
                            sender.remainingTransportCapacity
                        );

                    const wood =
                        limitedTransport.wood;

                    const clay =
                        limitedTransport.clay;

                    const iron =
                        limitedTransport.iron;

                    const transportSize =
                        wood +
                        clay +
                        iron;

                    if (transportSize === 0) {
                        senderIndex++;
                        continue;
                    }

                    const merchantsUsed = Math.ceil(
                        transportSize /
                        MERCHANT_CAPACITY
                    );

                    transports.push({
                        fromGroup:
                            groupFlow.fromGroup,

                        toGroup:
                            groupFlow.toGroup,

                        from: sender.coord,
                        to: receiver.coord,

                        wood: wood,
                        clay: clay,
                        iron: iron,

                        fromVillageId:
                            sender.id,

                        transportSize:
                            transportSize,

                        merchantsUsed:
                            merchantsUsed
                    });

                    sender.woodAvailable -= wood;
                    sender.clayAvailable -= clay;
                    sender.ironAvailable -= iron;

                    receiver.woodNeed -= wood;
                    receiver.clayNeed -= clay;
                    receiver.ironNeed -= iron;

                    flowWoodRemaining -= wood;
                    flowClayRemaining -= clay;
                    flowIronRemaining -= iron;

                    /*
                    Händler können nur vollständig
                    eingesetzt werden. Nicht genutzte
                    Restkapazität eines Händlers wird
                    daher nicht erneut verwendet.
                    */
                    sender.remainingTransportCapacity -=
                        merchantsUsed *
                        MERCHANT_CAPACITY;

                    sender.remainingTransportCapacity =
                        Math.max(
                            0,
                            sender.remainingTransportCapacity
                        );

                    const senderCannotContinue =
                        sender.remainingTransportCapacity === 0 ||
                        (
                            sender.woodAvailable === 0 &&
                            sender.clayAvailable === 0 &&
                            sender.ironAvailable === 0
                        );

                    if (senderCannotContinue) {
                        senderIndex++;
                    }
                }
            });
        });

        return transports;
    }

    function buildSenderStatistics(
        transports,
        villagePools
    ) {
        const statistics = {};

        Object.values(
            villagePools.sendersByGroup
        ).forEach(function (group) {

            group.forEach(function (sender) {

                statistics[sender.coord] = {

                    coord:
                        sender.coord,

                    group:
                        sender.groupId,

                    merchantsFree:
                        sender.merchantsFree,

                    merchantsUsed:
                        0,

                    transports:
                        0,

                    resourcesMoved:
                        0
                };
            });

        });

        transports.forEach(function (transport) {

            const sender =
                statistics[
                transport.from
                ];

            if (!sender) {
                return;
            }

            sender.transports++;

            sender.merchantsUsed +=
                transport.merchantsUsed;

            sender.resourcesMoved +=
                transport.transportSize;

        });

        return Object.values(statistics)
            .sort(function (a, b) {

                return (
                    b.resourcesMoved -
                    a.resourcesMoved
                );

            });
    }

    function copyTransportData(transports) {
        const exportData = {
            version: VERSION,
            coinVillage: COIN_VILLAGE.coord,

            transports: transports.map(function (transport) {
                return {
                    from: transport.from,
                    to: transport.to,

                    wood: transport.wood,
                    clay: transport.clay,
                    iron: transport.iron,

                    merchantsUsed:
                        transport.merchantsUsed,

                    fromGroup:
                        transport.fromGroup,

                    toGroup:
                        transport.toGroup
                };
            })
        };

        const exportText = JSON.stringify(
            exportData,
            null,
            2
        );

        function showSuccess() {
            UI.SuccessMessage(
                'Transportliste wurde kopiert.',
                3000
            );
        }

        function fallbackCopy() {
            const textarea = $('<textarea>')
                .val(exportText)
                .css({
                    position: 'fixed',
                    left: '-9999px',
                    top: '-9999px'
                })
                .appendTo('body');

            textarea[0].select();

            const copied = document.execCommand('copy');

            textarea.remove();

            if (copied) {
                showSuccess();
            } else {
                UI.ErrorMessage(
                    'Transportliste konnte nicht kopiert werden.',
                    5000
                );
            }
        }

        if (
            navigator.clipboard &&
            navigator.clipboard.writeText
        ) {
            navigator.clipboard
                .writeText(exportText)
                .then(showSuccess)
                .catch(fallbackCopy);

            return;
        }

        fallbackCopy();
    }

    function openTransportInMarket(transport) {
        if (!transport.fromVillageId) {
            UI.ErrorMessage(
                'Für das Senderdorf wurde keine Dorf-ID gefunden.',
                5000
            );

            return false;
        }

        const marketUrl =
            window.location.origin +
            '/game.php?village=' +
            encodeURIComponent(transport.fromVillageId) +
            '&screen=market&mode=send';

        const marketWindow =
            window.open(marketUrl, '_blank');

        if (!marketWindow) {
            UI.ErrorMessage(
                'Der Marktplatz-Tab wurde vom Browser blockiert.',
                5000
            );

            return false;
        }

        const coordParts =
            String(transport.to).split('|');

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

                    const clayInput =
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
                        !clayInput ||
                        !ironInput ||
                        !xInput ||
                        !yInput
                    ) {
                        if (attempts >= 40) {
                            window.clearInterval(
                                fillInterval
                            );

                            UI.ErrorMessage(
                                'Der Marktplatz konnte nicht ausgefüllt werden.',
                                5000
                            );
                        }

                        return;
                    }

                    woodInput.value =
                        transport.wood;

                    clayInput.value =
                        transport.clay;

                    ironInput.value =
                        transport.iron;

                    xInput.value =
                        targetX;

                    yInput.value =
                        targetY;

                    [
                        woodInput,
                        clayInput,
                        ironInput,
                        xInput,
                        yInput
                    ].forEach(function (input) {
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

        return true;
    }

    function wait(milliseconds) {
        return new Promise(function (resolve) {
            window.setTimeout(
                resolve,
                milliseconds
            );
        });
    }

    function getNextUnopenedTransportIndexes(
        totalTransports,
        amount
    ) {
        const indexes = [];

        for (
            let index = 0;
            index < totalTransports;
            index++
        ) {
            if (
                transportOpenState.openedIndexes.has(index)
            ) {
                continue;
            }

            indexes.push(index);

            if (indexes.length >= amount) {
                break;
            }
        }

        return indexes;
    }

    function updateTransportOpenProgress(
        totalTransports
    ) {
        const opened =
            transportOpenState.openedIndexes.size;

        const allOpened =
            opened >= totalTransports;

        $('#' + POPUP_ID + '-open-progress').text(
            opened +
            ' / ' +
            totalTransports +
            ' geöffnet'
        );

        $('#' + POPUP_ID + ' .ds-helper-open-batch')
            .prop(
                'disabled',
                transportOpenState.isOpening ||
                allOpened
            );
    }

    function markTransportOpened(
        transportIndex,
        totalTransports
    ) {
        transportOpenState.openedIndexes.add(
            transportIndex
        );

        const row =
            $('#' + POPUP_ID).find(
                'tr[data-transport-index="' +
                transportIndex +
                '"]'
            );

        row.css({
            opacity: '0.45',
            background: '#ddd0aa'
        });

        row.find('.ds-helper-open-transport')
            .prop('disabled', true)
            .text('Geöffnet');

        updateTransportOpenProgress(
            totalTransports
        );
    }

    async function openTransportBatch(
        transports,
        amount
    ) {
        if (transportOpenState.isOpening) {
            return;
        }

        const transportIndexes =
            getNextUnopenedTransportIndexes(
                transports.length,
                amount
            );

        if (!transportIndexes.length) {
            updateTransportOpenProgress(
                transports.length
            );

            return;
        }

        transportOpenState.isOpening = true;

        updateTransportOpenProgress(
            transports.length
        );

        $('#' + POPUP_ID + '-open-progress').text(
            transportOpenState.openedIndexes.size +
            ' / ' +
            transports.length +
            ' geöffnet – Tabs werden geöffnet …'
        );

        for (
            let position = 0;
            position < transportIndexes.length;
            position++
        ) {
            const transportIndex =
                transportIndexes[position];

            const transport =
                transports[transportIndex];

            const opened =
                openTransportInMarket(
                    transport
                );

            if (!opened) {
                break;
            }

            markTransportOpened(
                transportIndex,
                transports.length
            );

            if (
                position <
                transportIndexes.length - 1
            ) {
                await wait(
                    TRANSPORT_OPEN_DELAY
                );
            }
        }

        transportOpenState.isOpening = false;

        updateTransportOpenProgress(
            transports.length
        );
    }

    function buildTransportOutput(transports) {
        const totalWood = transports.reduce(
            function (sum, transport) {
                return sum + transport.wood;
            },
            0
        );

        const totalClay = transports.reduce(
            function (sum, transport) {
                return sum + transport.clay;
            },
            0
        );

        const totalIron = transports.reduce(
            function (sum, transport) {
                return sum + transport.iron;
            },
            0
        );

        const totalMerchants = transports.reduce(
            function (sum, transport) {
                return sum + transport.merchantsUsed;
            },
            0
        );

        const transportRows = transports
            .map(function (transport, index) {
                return `
                <tr data-transport-index="${index}">
                    <td style="text-align:right;">
                        ${index + 1}
                    </td>

                    <td style="text-align:center;white-space:nowrap;">
                        ${escapeHtml(transport.from)}
                    </td>

                    <td style="text-align:center;white-space:nowrap;">
                        ${escapeHtml(transport.to)}
                    </td>

                    <td style="text-align:center;">
                        ${transport.fromGroup}
                    </td>

                    <td style="text-align:center;">
                        ${transport.toGroup}
                    </td>

                    <td style="text-align:right;">
                        ${formatNumber(transport.wood)}
                    </td>

                    <td style="text-align:right;">
                        ${formatNumber(transport.clay)}
                    </td>

                    <td style="text-align:right;">
                        ${formatNumber(transport.iron)}
                    </td>

                    <td style="text-align:right;">
                        ${formatNumber(transport.merchantsUsed)}
                    </td>

                    <td style="text-align:center;">
    <button
        type="button"
        class="ds-helper-open-transport"
        data-transport-index="${index}"
        style="
            border:1px solid #804000;
            background:#f4e4bc;
            color:#000;
            cursor:pointer;
            font-weight:bold;
            padding:3px 7px;
        "
    >
        Öffnen
    </button>
</td>
                </tr>
            `;
            })
            .join('');

        return `
        <table class="vis" style="
            width:100%;
            margin-bottom:10px;
        ">
            <thead>
                <tr>
                    <th colspan="10">
                        Geplante Dorftransporte
                        – ${formatNumber(transports.length)} Transporte
                    </th>
                </tr>

                <tr>
                    <th>Nr.</th>
                    <th>Sender</th>
                    <th>Empfänger</th>
                    <th>Von Gruppe</th>
                    <th>Zu Gruppe</th>
                    <th>Holz</th>
                    <th>Lehm</th>
                    <th>Eisen</th>
                    <th>Händler</th>
                    <th>Aktion</th>
                </tr>
            </thead>

            <tbody>
                ${transportRows || `
                    <tr>
                        <td colspan="10">
                            Keine Dorftransporte erforderlich
                        </td>
                    </tr>
                `}
            </tbody>

            <tfoot>
                <tr>
                    <th colspan="5">
                        Gesamt
                    </th>

                    <th style="text-align:right;">
                        ${formatNumber(totalWood)}
                    </th>

                    <th style="text-align:right;">
                        ${formatNumber(totalClay)}
                    </th>

                    <th style="text-align:right;">
                        ${formatNumber(totalIron)}
                    </th>

                    <th style="text-align:right;">
                        ${formatNumber(totalMerchants)}
                    </th>

                    <th></th>
                </tr>
            </tfoot>
        </table>
    `;
    }

    function buildGroupFlowOutput(groupFlowResult) {
        const flowRows = groupFlowResult.flows
            .map(function (flow) {
                return `
                <tr>
                    <td style="text-align:center;">
                        ${flow.fromGroup}
                    </td>

                    <td style="text-align:center;">
                        ${flow.toGroup}
                    </td>

                    <td style="text-align:right;">
                        ${formatNumber(flow.wood)}
                    </td>

                    <td style="text-align:right;">
                        ${formatNumber(flow.clay)}
                    </td>

                    <td style="text-align:right;">
                        ${formatNumber(flow.iron)}
                    </td>
                </tr>
            `;
            })
            .join('');

        const remainingNeeds = groupFlowResult.remainingNeeds
            .filter(function (group) {
                return (
                    group.woodNeed > 0 ||
                    group.clayNeed > 0 ||
                    group.ironNeed > 0
                );
            });

        const remainingRows = remainingNeeds
            .map(function (group) {
                return `
                <tr>
                    <td style="text-align:center;">
                        ${group.id}
                    </td>

                    <td style="text-align:right;">
                        ${formatNumber(group.woodNeed)}
                    </td>

                    <td style="text-align:right;">
                        ${formatNumber(group.clayNeed)}
                    </td>

                    <td style="text-align:right;">
                        ${formatNumber(group.ironNeed)}
                    </td>
                </tr>
            `;
            })
            .join('');

        return `
        <table class="vis" style="
            width:100%;
            margin-bottom:10px;
        ">
            <thead>
                <tr>
                    <th colspan="5">
                        Geplante Gruppenflüsse
                    </th>
                </tr>

                <tr>
                    <th>Von Gruppe</th>
                    <th>Zu Gruppe</th>
                    <th>Holz</th>
                    <th>Lehm</th>
                    <th>Eisen</th>
                </tr>
            </thead>

            <tbody>
                ${flowRows ||
            `
                        <tr>
                            <td colspan="5">
                                Keine Gruppenflüsse erforderlich
                            </td>
                        </tr>
                    `
            }
            </tbody>
        </table>

        <table class="vis" style="
            width:100%;
            margin-bottom:10px;
        ">
            <thead>
                <tr>
                    <th colspan="4">
                        Verbleibender Bedarf
                    </th>
                </tr>

                <tr>
                    <th>Gruppe</th>
                    <th>Holz</th>
                    <th>Lehm</th>
                    <th>Eisen</th>
                </tr>
            </thead>

            <tbody>
                ${remainingRows ||
            `
                        <tr>
                            <td colspan="4">
                                Alle Gruppen können vollständig versorgt werden
                            </td>
                        </tr>
                    `
            }
            </tbody>
        </table>
    `;
    }

    function getRoleLabel(village) {
        switch (village.simulation.role) {
            case 'sender':
                return 'S';

            case 'receiver':
                return 'E';

            default:
                return '=';
        }
    }

    function getFillRowColor(village) {
        if (!village.storage) {
            return '#ffffff';
        }

        const fillPercent =
            Math.max(
                village.wood,
                village.clay,
                village.iron
            ) / village.storage * 100;

        if (fillPercent >= 95) {
            return '#ba68c8';
        }

        if (fillPercent >= 85) {
            return '#ef9a9a';
        }

        if (fillPercent >= 75) {
            return '#ffab91';
        }

        if (fillPercent >= 65) {
            return '#ffcc80';
        }

        if (fillPercent >= 55) {
            return '#ffe082';
        }

        if (fillPercent >= 45) {
            return '#fff59d';
        }

        if (fillPercent >= 35) {
            return '#dcedc8';
        }

        return '#c8e6c9';
    }

    function sortVillages(villages) {
        return villages
            .filter(function (village) {
                return !village.isCoinVillage;
            })
            .sort(function (a, b) {
                const groupDifference =
                    a.simulation.distanceGroupId -
                    b.simulation.distanceGroupId;

                if (groupDifference !== 0) {
                    return groupDifference;
                }

                const fillA = a.storage > 0
                    ? Math.max(
                        a.wood,
                        a.clay,
                        a.iron
                    ) / a.storage
                    : 0;

                const fillB = b.storage > 0
                    ? Math.max(
                        b.wood,
                        b.clay,
                        b.iron
                    ) / b.storage
                    : 0;

                return fillB - fillA;
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
                const rowColor = getFillRowColor(
                    village
                );

                const finalRowColor = village.parseError
                    ? '#ffb3b3'
                    : rowColor;

                return `
                <tr style="background:${finalRowColor};">
                    <td style="text-align:right;">
                        ${index + 1}
                    </td>

                    <td style="white-space:nowrap;">
                        ${escapeHtml(village.name)}
                    </td>

                    <td style="text-align:right;background:${rowColor} !important;">
                        ${village.distanceToCoinVillage.toFixed(2)}
                    </td>

                    <td style="text-align:center;white-space:nowrap;">
                        ${village.simulation.distanceGroupId}
                        –
                        ${escapeHtml(
                    village.simulation.distanceGroupName
                )}
                    </td>

                    <td style="text-align:right;background:${rowColor} !important;">
                        ${formatNumber(village.wood)}
                    </td>

                    <td style="text-align:right;background:${rowColor} !important;">
                        ${formatNumber(village.clay)}
                    </td>

                    <td style="text-align:right;background:${rowColor} !important;">
                        ${formatNumber(village.iron)}
                    </td>

                    <td style="text-align:right;background:${rowColor} !important;">
                        ${formatNumber(village.storage)}
                    </td>

                    <td style="text-align:right;background:${rowColor} !important;">
                        ${formatNumber(
                    village.simulation.targetAmount
                )}
                    </td>

                    <td style="text-align:right;background:${rowColor} !important;">
                        ${formatNumber(
                    village.simulation.needWood
                )}
                    </td>

                    <td style="text-align:right;background:${rowColor} !important;">
                        ${formatNumber(
                    village.simulation.needClay
                )}
                    </td>

                    <td style="text-align:right;background:${rowColor} !important;">
                        ${formatNumber(
                    village.simulation.needIron
                )}
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

        console.log(
            '[DS Helper | Lesefehler]',
            parseErrorVillages
        );

        const groupSummary = buildGroupSummary(
            sortedVillages
        ).sort(function (a, b) {
            return a.id - b.id;
        });

        const villagePools = buildVillagePools(
            sortedVillages
        );

        const villagePoolSummary = buildVillagePoolSummary(
            villagePools
        );

        console.table(villagePoolSummary);

        const groupFlowResult = buildGroupFlows(
            groupSummary,
            villagePoolSummary
        );

        const allVillageFlows =
            simulateAllVillageFlows(
                groupFlowResult.flows,
                villagePools
            );


        const senderStatistics =
            buildSenderStatistics(
                allVillageFlows,
                villagePools
            );

        console.table(senderStatistics);

        console.table(
            allVillageFlows.slice(0, 25)
        );

        console.log(
            '[DS Helper | Empfänger Gruppe 1]',
            villagePools.receiversByGroup[1]
        );

        console.log(
            '[DS Helper | Lieferanten Gruppe 8]',
            villagePools.sendersByGroup[8]
        );

        const groupFlowOutput = buildGroupFlowOutput(
            groupFlowResult
        );

        const transportOutput = buildTransportOutput(
            allVillageFlows
        );

        const groupSummaryRows = groupSummary
            .map(function (group) {
                return `
            <tr>
                <td style="text-align:center;">
                    ${group.id}
                </td>

                <td style="white-space:nowrap;">
                    ${escapeHtml(group.name)}
                </td>

                <td style="text-align:right;">
                    ${formatNumber(group.villages)}
                </td>

                <td style="text-align:right;">
                    ${formatNumber(group.needWood)}
                </td>

                <td style="text-align:right;">
                    ${formatNumber(group.needClay)}
                </td>

                <td style="text-align:right;">
                    ${formatNumber(group.needIron)}
                </td>

                <td style="text-align:right;">
                    ${formatNumber(group.surplusWood)}
                </td>

                <td style="text-align:right;">
                    ${formatNumber(group.surplusClay)}
                </td>

                <td style="text-align:right;">
                    ${formatNumber(group.surplusIron)}
                </td>

                <td style="text-align:right;font-weight:bold;">
                    ${formatNumber(group.saldoWood)}
                </td>

                <td style="text-align:right;font-weight:bold;">
                    ${formatNumber(group.saldoClay)}
                </td>

                <td style="text-align:right;font-weight:bold;">
                    ${formatNumber(group.saldoIron)}
                </td>
            </tr>
        `;
            })
            .join('');

        const popupHtml = `
        <div id="${POPUP_ID}" style="
            position:fixed;
            top:20px;
            left:50%;
            transform:translateX(-50%);
            width:1500px;
            max-width:calc(100vw - 30px);
            max-height:calc(100vh - 40px);
            overflow:auto;
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
<td>
    <input
        type="text"
        id="${POPUP_ID}-coin-village"
        value="${COIN_VILLAGE.coord}"
        maxlength="7"
        style="
            width:75px;
            text-align:center;
        "
    >

    <button
        type="button"
        id="${POPUP_ID}-save-coin-village"
        style="
            margin-left:5px;
            cursor:pointer;
        "
    >
        Übernehmen
    </button>
</td>

                        <th>Status</th>
                        <td>
                            ${coinVillageFound
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
                </table>

                <table class="vis" style="
                    width:100%;
                    margin-bottom:10px;
                ">
                    <thead>
    <tr>
        <th rowspan="2">
            Gruppe
        </th>

        <th rowspan="2">
            Bezeichnung
        </th>

        <th rowspan="2">
            Dörfer
        </th>

        <th colspan="3">
            Bedarf
        </th>

        <th colspan="3">
            Überschuss
        </th>

        <th colspan="3">
            Saldo
        </th>
    </tr>

    <tr>
        <th>Holz</th>
        <th>Lehm</th>
        <th>Eisen</th>

        <th>Holz</th>
        <th>Lehm</th>
        <th>Eisen</th>

        <th>Holz</th>
        <th>Lehm</th>
        <th>Eisen</th>
    </tr>
</thead>

                    <tbody>
                        ${groupSummaryRows}
                    </tbody>
                </table>

${groupFlowOutput}

<div style="
    display:flex;
    align-items:center;
    gap:8px;
    margin-bottom:6px;
">
    <button
        type="button"
        id="${POPUP_ID}-copy-transports"
        style="
            border:1px solid #804000;
            background:#f4e4bc;
            color:#000;
            cursor:pointer;
            font-weight:bold;
            padding:5px 10px;
        "
    >
        Transportliste kopieren
    </button>

    <button
        type="button"
        class="ds-helper-open-batch"
        data-batch-size="30"
        style="
            border:1px solid #804000;
            background:#f4e4bc;
            color:#000;
            cursor:pointer;
            font-weight:bold;
            padding:5px 10px;
        "
    >
        Nächste 30 Tabs öffnen
    </button>

    <button
        type="button"
        class="ds-helper-open-batch"
        data-batch-size="50"
        style="
            border:1px solid #804000;
            background:#f4e4bc;
            color:#000;
            cursor:pointer;
            font-weight:bold;
            padding:5px 10px;
        "
    >
        Nächste 50 Tabs öffnen
    </button>

    <strong
        id="${POPUP_ID}-open-progress"
        style="margin-left:auto;"
    >
        0 / ${allVillageFlows.length} geöffnet
    </strong>
</div>

<div style="
    max-height:300px;
    overflow:auto;
    border:1px solid #c1a264;
    margin-bottom:10px;
">
    ${transportOutput}
</div>

<div style="
    max-height:calc(100vh - 520px);
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

                                <th style="width:110px;">
                                    Gruppe
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

                                <th style="width:95px;">
                                    Soll
                                </th>

                                <th style="width:95px;">
                                    Bedarf Holz
                                </th>

                                <th style="width:95px;">
                                    Bedarf Lehm
                                </th>

                                <th style="width:95px;">
                                    Bedarf Eisen
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

        $('#' + POPUP_ID + ' tbody tr').each(
            function () {
                const row = $(this);
                const backgroundColor =
                    row.css('background-color');

                if (
                    backgroundColor &&
                    backgroundColor !==
                    'rgba(0, 0, 0, 0)'
                ) {
                    row.children('td').css(
                        'background-color',
                        backgroundColor
                    );
                }
            }
        );

        $('#' + POPUP_ID + '-close').on(
            'click',
            function () {
                removeExistingPopup();
            }
        );

        $('#' + POPUP_ID + '-copy-transports').on(
            'click',
            function () {
                copyTransportData(
                    allVillageFlows
                );
            }
        );
        $('#' + POPUP_ID + ' .ds-helper-open-transport').on(
            'click',
            function () {
                const transportIndex = Number(
                    $(this).attr(
                        'data-transport-index'
                    )
                );

                const transport =
                    allVillageFlows[
                    transportIndex
                    ];

                if (!transport) {
                    UI.ErrorMessage(
                        'Der Transport wurde nicht gefunden.',
                        5000
                    );

                    return;
                }

                const opened =
                    openTransportInMarket(
                        transport
                    );

                if (opened) {
                    markTransportOpened(
                        transportIndex,
                        allVillageFlows.length
                    );
                }
            }
        );
        $('#' + POPUP_ID + ' .ds-helper-open-batch').on(
            'click',
            function () {
                const batchSize = Number(
                    $(this).attr(
                        'data-batch-size'
                    )
                );

                openTransportBatch(
                    allVillageFlows,
                    batchSize
                );
            }
        );

        updateTransportOpenProgress(
            allVillageFlows.length
        );

        $('#' + POPUP_ID + '-save-coin-village').on(
            'click',
            function () {
                const coord =
                    $('#' + POPUP_ID + '-coin-village')
                        .val();

                if (!saveCoinVillage(coord)) {
                    return;
                }

                UI.SuccessMessage(
                    'Münzdorf gespeichert. Das Skript wird neu gestartet.',
                    3000
                );

                window.setTimeout(
                    function () {
                        window.location.reload();
                    },
                    500
                );
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

        const preparedVillages = prepareSimulation(
            allVillages
        );

        const sortedVillages = sortVillages(
            preparedVillages
        );

        const groupSummary = buildGroupSummary(
            preparedVillages
        );

        console.table(groupSummary);

        showPopup(
            preparedVillages,
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