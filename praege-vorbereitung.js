/*
=======================================
DS Helper
Name: Prägevorbereitung
Version: 0.8.1
Kategorie: Produktion
Autor: Rincewind610

Funktion:
Liest Dörfer, Ressourcen, Lager und Händler
aus der Produktionsübersicht aus und sortiert
die Dörfer nach Entfernung zum Münzdorf. Anschließend werden Transporte zu den Dörfer geschickt, die nahe am Münzdorf liegen und einen Bedarf haben. Die Transporte werden von den Dörfern mit einem Überschuss an Ressourcen ausgeführt.

Status: Entwicklung / Simulation
=======================================
*/

(function () {
    'use strict';

    const VERSION = '0.8.1';
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

    function checkTransportForDirectSend(
        transport,
        villages
    ) {
        const coordinatePattern =
            /^\d{1,3}\|\d{1,3}$/;

        const sourceCoordinateValid =
            coordinatePattern.test(
                String(transport.from || '')
            );

        const targetCoordinateValid =
            coordinatePattern.test(
                String(transport.to || '')
            );

        const sourceVillage = sourceCoordinateValid
            ? villages.find(function (village) {
                return village.coord === transport.from;
            })
            : null;

        const targetVillage = targetCoordinateValid
            ? villages.find(function (village) {
                return village.coord === transport.to;
            })
            : null;

        const sourceVillageIdValid =
            /^\d+$/.test(
                String(transport.fromVillageId || '')
            );

        const targetVillageIdValid =
            Boolean(targetVillage) &&
            /^\d+$/.test(
                String(targetVillage.id || '')
            );

        const resourceNames = [
            'wood',
            'clay',
            'iron'
        ];

        const resourceChecks = {};

        resourceNames.forEach(function (resourceName) {
            const resourceValue =
                transport[resourceName];

            resourceChecks[resourceName] =
                Object.prototype.hasOwnProperty.call(
                    transport,
                    resourceName
                ) &&
                Number.isFinite(resourceValue) &&
                Number.isInteger(resourceValue) &&
                resourceValue >= 0;
        });

        const resourcesValid =
            resourceChecks.wood &&
            resourceChecks.clay &&
            resourceChecks.iron;

        const resourceTotal = resourcesValid
            ? transport.wood +
                transport.clay +
                transport.iron
            : 0;

        const calculatedMerchants =
            resourcesValid &&
            resourceTotal > 0 &&
            Number.isFinite(MERCHANT_CAPACITY) &&
            MERCHANT_CAPACITY > 0
                ? Math.ceil(
                    resourceTotal /
                    MERCHANT_CAPACITY
                )
                : 0;

        const merchantCalculationValid =
            Number.isFinite(calculatedMerchants) &&
            Number.isInteger(calculatedMerchants) &&
            calculatedMerchants > 0;

        const checks = {
            source:
                sourceCoordinateValid &&
                Boolean(sourceVillage),

            target:
                targetCoordinateValid &&
                Boolean(targetVillage),

            villageIds:
                sourceVillageIdValid &&
                targetVillageIdValid,

            resources:
                resourcesValid &&
                resourceTotal > 0,

            merchants:
                merchantCalculationValid,

            tribalWarsPost:
                Boolean(window.TribalWars) &&
                typeof window.TribalWars.post ===
                    'function',

            csrfToken:
                typeof window.csrf_token ===
                    'string' &&
                window.csrf_token.trim() !== ''
        };

        const errors = [];

        if (!checks.source) {
            errors.push(
                'Ausgangsdorf fehlt oder wurde nicht erkannt.'
            );
        }

        if (!checks.target) {
            errors.push(
                'Zieldorf fehlt oder wurde nicht erkannt.'
            );
        }

        if (!sourceVillageIdValid) {
            errors.push(
                'Ausgangsdorf-ID fehlt oder ist ung\u00fcltig.'
            );
        }

        if (!targetVillageIdValid) {
            errors.push(
                'Zieldorf-ID fehlt oder ist ung\u00fcltig.'
            );
        }

        const resourceLabels = {
            wood: 'Holzmenge',
            clay: 'Lehmmenge',
            iron: 'Eisenmenge'
        };

        resourceNames.forEach(function (resourceName) {
            if (!resourceChecks[resourceName]) {
                errors.push(
                    resourceLabels[resourceName] +
                    ' fehlt oder ist ung\u00fcltig.'
                );
            }
        });

        if (resourcesValid && resourceTotal <= 0) {
            errors.push(
                'Die Ressourcen-Gesamtmenge muss gr\u00f6\u00dfer als 0 sein.'
            );
        }

        if (!checks.merchants) {
            errors.push(
                'H\u00e4ndlerbedarf kann nicht berechnet werden.'
            );
        }

        if (!checks.tribalWarsPost) {
            errors.push(
                'TribalWars.post ist nicht verf\u00fcgbar.'
            );
        }

        if (!checks.csrfToken) {
            errors.push(
                'CSRF-Token fehlt.'
            );
        }

        return {
            success:
                Object.values(checks).every(
                    function (checkPassed) {
                        return checkPassed;
                    }
                ),

            checks: checks,
            errors: errors
        };
    }

    function renderTransportCheckResult(
        transportIndex,
        result
    ) {
        const checkLabels = [
            ['source', 'Quelle'],
            ['target', 'Ziel'],
            ['villageIds', 'Dorf-IDs'],
            ['resources', 'Rohstoffe'],
            ['merchants', 'H\u00e4ndler'],
            ['tribalWarsPost', 'TribalWars.post'],
            ['csrfToken', 'CSRF-Token']
        ];

        const checkOutput = checkLabels
            .map(function (checkLabel) {
                const checkPassed =
                    result.checks[checkLabel[0]];

                return `
                    <li>
                        ${escapeHtml(checkLabel[1])}:
                        <strong>
                            ${checkPassed ? 'OK' : 'Fehler'}
                        </strong>
                    </li>
                `;
            })
            .join('');

        const errorOutput = result.errors.length
            ? `
                <ul class="ds-helper-check-errors">
                    ${result.errors
                        .map(function (errorMessage) {
                            return `
                                <li>
                                    ${escapeHtml(errorMessage)}
                                </li>
                            `;
                        })
                        .join('')}
                </ul>
            `
            : '';

        const statusRow =
            $('#' + POPUP_ID).find(
                '.ds-helper-transport-check-row' +
                '[data-check-index="' +
                transportIndex +
                '"]'
            );

        statusRow
            .find(
                '.ds-helper-transport-check-content'
            )
            .html(`
                <div class="ds-helper-check-result ${
                    result.success
                        ? 'is-success'
                        : 'is-error'
                }">
                    <div class="ds-helper-check-title">
                        ${result.success ? '\u2714' : '\u2716'}
                        Versandpr\u00fcfung ${
                            result.success
                                ? 'erfolgreich'
                                : 'fehlgeschlagen'
                        }
                    </div>

                    <ul class="ds-helper-check-list">
                        ${checkOutput}
                    </ul>

                    ${errorOutput}

                    <strong class="ds-helper-check-notice">
                        Es wurde kein Transport versendet.
                    </strong>
                </div>
            `);

        statusRow.show();
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
                <tr
                    class="${index % 2 ? 'ds-helper-transport-row-even' : ''}"
                    data-transport-index="${index}"
                >
                    <td class="ds-helper-cell-number">
                        ${index + 1}
                    </td>

                    <td class="ds-helper-cell-coord">
                        ${escapeHtml(transport.from)}
                    </td>

                    <td class="ds-helper-cell-coord">
                        ${escapeHtml(transport.to)}
                    </td>

                    <td class="ds-helper-cell-center">
                        ${transport.fromGroup}
                    </td>

                    <td class="ds-helper-cell-center">
                        ${transport.toGroup}
                    </td>

                    <td class="ds-helper-cell-number">
                        ${formatNumber(transport.wood)}
                    </td>

                    <td class="ds-helper-cell-number">
                        ${formatNumber(transport.clay)}
                    </td>

                    <td class="ds-helper-cell-number">
                        ${formatNumber(transport.iron)}
                    </td>

                    <td class="ds-helper-cell-number">
                        ${formatNumber(transport.merchantsUsed)}
                    </td>

                    <td class="ds-helper-cell-action">
                        <button
                            type="button"
                            class="ds-helper-btn ds-helper-btn-small ds-helper-open-transport"
                            data-transport-index="${index}"
                        >
                            Öffnen
                        </button>

                        <button
                            type="button"
                            class="ds-helper-btn ds-helper-btn-small ds-helper-check-transport"
                            data-transport-index="${index}"
                        >
                            Versand prüfen
                        </button>
                    </td>
                </tr>

                <tr
                    class="ds-helper-transport-check-row"
                    data-check-index="${index}"
                    style="display:none;"
                >
                    <td
                        colspan="10"
                        class="ds-helper-transport-check-content"
                    ></td>
                </tr>
            `;
            })
            .join('');

        return `
        <table class="vis ds-helper-table ds-helper-transport-table">
            <thead class="ds-helper-sticky-head">
                <tr>
                    <th>#</th>
                    <th>Von</th>
                    <th>Nach</th>
                    <th>Von Gruppe</th>
                    <th>Nach Gruppe</th>
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
                        <td colspan="10" class="ds-helper-empty-row">
                            Keine Dorftransporte erforderlich
                        </td>
                    </tr>
                `}
            </tbody>

            <tfoot>
                <tr class="ds-helper-total-row">
                    <th colspan="5">
                        Gesamt
                    </th>

                    <th class="ds-helper-cell-number">
                        ${formatNumber(totalWood)}
                    </th>

                    <th class="ds-helper-cell-number">
                        ${formatNumber(totalClay)}
                    </th>

                    <th class="ds-helper-cell-number">
                        ${formatNumber(totalIron)}
                    </th>

                    <th class="ds-helper-cell-number">
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
                    <td class="ds-helper-cell-center">
                        ${flow.fromGroup}
                    </td>

                    <td class="ds-helper-cell-center">
                        ${flow.toGroup}
                    </td>

                    <td class="ds-helper-cell-number">
                        ${formatNumber(flow.wood)}
                    </td>

                    <td class="ds-helper-cell-number">
                        ${formatNumber(flow.clay)}
                    </td>

                    <td class="ds-helper-cell-number">
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
                    <td class="ds-helper-cell-center">
                        ${group.id}
                    </td>

                    <td class="ds-helper-cell-number">
                        ${formatNumber(group.woodNeed)}
                    </td>

                    <td class="ds-helper-cell-number">
                        ${formatNumber(group.clayNeed)}
                    </td>

                    <td class="ds-helper-cell-number">
                        ${formatNumber(group.ironNeed)}
                    </td>
                </tr>
            `;
            })
            .join('');

        return `
        <div class="ds-helper-section-heading">
            Geplante Gruppenflüsse
        </div>

        <table class="vis ds-helper-table ds-helper-stat-table">
            <thead>
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
                            <td colspan="5" class="ds-helper-empty-row">
                                Keine Gruppenflüsse erforderlich
                            </td>
                        </tr>
                    `
            }
            </tbody>
        </table>

        <div class="ds-helper-section-heading">
            Offener Bedarf
        </div>

        <table class="vis ds-helper-table ds-helper-stat-table">
            <thead>
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
                            <td colspan="4" class="ds-helper-empty-row">
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
        let lastGroupId = null;
        const rows = [];

        villages.forEach(function (village, index) {
            const rowColor = getFillRowColor(
                village
            );

            const finalRowColor = village.parseError
                ? '#ffb3b3'
                : rowColor;

            const groupId =
                village.simulation.distanceGroupId;

            if (groupId !== lastGroupId) {
                rows.push(`
                <tr class="ds-helper-group-separator">
                    <td colspan="13">
                        Gruppe ${groupId} – ${escapeHtml(
                    village.simulation.distanceGroupName
                )}
                    </td>
                </tr>
            `);

                lastGroupId = groupId;
            }

            rows.push(`
                <tr style="background:${finalRowColor};">
                    <td class="ds-helper-cell-number ds-helper-rank-cell">
                        ${index + 1}
                    </td>

                    <td class="ds-helper-village-name-cell">
                        ${escapeHtml(village.name)}
                    </td>

                    <td class="ds-helper-cell-number" style="background:${rowColor} !important;">
                        ${village.distanceToCoinVillage.toFixed(2)}
                    </td>

                    <td class="ds-helper-cell-center" style="background:${rowColor} !important;">
                        ${groupId}
                        –
                        ${escapeHtml(
                village.simulation.distanceGroupName
            )}
                    </td>

                    <td class="ds-helper-cell-number" style="background:${rowColor} !important;">
                        ${formatNumber(village.wood)}
                    </td>

                    <td class="ds-helper-cell-number" style="background:${rowColor} !important;">
                        ${formatNumber(village.clay)}
                    </td>

                    <td class="ds-helper-cell-number" style="background:${rowColor} !important;">
                        ${formatNumber(village.iron)}
                    </td>

                    <td class="ds-helper-cell-number" style="background:${rowColor} !important;">
                        ${formatNumber(village.storage)}
                    </td>

                    <td class="ds-helper-cell-number" style="background:${rowColor} !important;">
                        ${formatNumber(
                village.simulation.targetAmount
            )}
                    </td>

                    <td class="ds-helper-cell-number" style="background:${rowColor} !important;">
                        ${formatNumber(
                village.simulation.needWood
            )}
                    </td>

                    <td class="ds-helper-cell-number" style="background:${rowColor} !important;">
                        ${formatNumber(
                village.simulation.needClay
            )}
                    </td>

                    <td class="ds-helper-cell-number" style="background:${rowColor} !important;">
                        ${formatNumber(
                village.simulation.needIron
            )}
                    </td>

                    <td class="ds-helper-cell-center" style="background:${rowColor} !important;">
                        ${formatNumber(village.merchantsFree)}
                        /
                        ${formatNumber(village.merchantsTotal)}
                    </td>
                </tr>
            `);
        });

        return rows.join('');
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
            --ds-helper-bg:#ffffff;
            --ds-helper-text:#242424;
            --ds-helper-accent:#E14165;
            --ds-helper-border:#dddddd;
            --ds-helper-muted:#f7f7f7;
            --ds-helper-soft:#f4f4f4;
            background:var(--ds-helper-bg);
            border:1px solid var(--ds-helper-border);
            border-radius:5px;
            box-shadow:0 8px 30px rgba(0,0,0,0.22);
            font-family:Verdana,Arial,sans-serif;
            font-size:12px;
            color:var(--ds-helper-text);
        ">
            <style>
                #${POPUP_ID} .ds-helper-content { padding:12px; }
                #${POPUP_ID} .ds-helper-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; padding:12px 14px 10px; background:var(--ds-helper-bg); color:var(--ds-helper-text); border-bottom:2px solid var(--ds-helper-accent); }
                #${POPUP_ID} .ds-helper-title-main { display:block; font-size:18px; line-height:1.15; font-weight:700; color:var(--ds-helper-text); }
                #${POPUP_ID} .ds-helper-title-sub { display:block; margin-top:2px; font-size:13px; line-height:1.2; font-weight:700; color:var(--ds-helper-text); }
                #${POPUP_ID} .ds-helper-title-version { display:block; margin-top:3px; font-size:11px; line-height:1.2; font-weight:400; color:var(--ds-helper-text); }
                #${POPUP_ID} .ds-helper-section-heading { margin:14px 0 8px; padding-bottom:5px; border-bottom:2px solid var(--ds-helper-accent); color:var(--ds-helper-text); background:var(--ds-helper-bg); font-weight:700; font-size:13px; line-height:1.2; }
                #${POPUP_ID} .ds-helper-info-grid { display:grid; grid-template-columns:minmax(0, 1fr) minmax(0, 1fr); gap:10px 18px; margin-bottom:12px; padding:10px 0; border-top:1px solid var(--ds-helper-border); border-bottom:1px solid var(--ds-helper-border); background:var(--ds-helper-bg); }
                #${POPUP_ID} .ds-helper-info-block { border-left:3px solid var(--ds-helper-accent); padding-left:10px; }
                #${POPUP_ID} .ds-helper-info-row { display:grid; grid-template-columns:150px minmax(0, 1fr); gap:8px; align-items:center; min-height:30px; border-bottom:1px solid var(--ds-helper-soft); }
                #${POPUP_ID} .ds-helper-info-row:last-child { border-bottom:0; }
                #${POPUP_ID} .ds-helper-info-label { color:var(--ds-helper-text); font-weight:700; white-space:nowrap; }
                #${POPUP_ID} .ds-helper-info-value { color:var(--ds-helper-text); min-width:0; }
                #${POPUP_ID} .ds-helper-table { width:100%; margin-bottom:12px; border-collapse:collapse; background:var(--ds-helper-bg); color:var(--ds-helper-text); border:1px solid var(--ds-helper-border); }
                #${POPUP_ID} .ds-helper-table th,
                #${POPUP_ID} .ds-helper-table td { padding:6px 8px; vertical-align:middle; border-bottom:1px solid var(--ds-helper-soft); color:var(--ds-helper-text); }
                #${POPUP_ID} .ds-helper-table thead th { background:var(--ds-helper-text) !important; color:var(--ds-helper-bg) !important; font-weight:700; text-align:center; border-color:var(--ds-helper-text); }
                #${POPUP_ID} .ds-helper-sticky-head th { position:sticky; top:0; z-index:2; }
                #${POPUP_ID} input[type="text"] { min-height:28px; box-sizing:border-box; border:1px solid var(--ds-helper-border); border-radius:4px; background:var(--ds-helper-bg); color:var(--ds-helper-text); padding:4px 7px; font-family:Verdana,Arial,sans-serif; font-size:12px; box-shadow:none; outline:none; }
                #${POPUP_ID} input[type="text"]:focus { border-color:var(--ds-helper-accent); box-shadow:0 0 0 2px rgba(225,65,101,0.18); }
                #${POPUP_ID} .ds-helper-cell-number { text-align:right; white-space:nowrap; }
                #${POPUP_ID} .ds-helper-cell-center,
                #${POPUP_ID} .ds-helper-cell-action,
                #${POPUP_ID} .ds-helper-cell-coord { text-align:center; white-space:nowrap; }
                #${POPUP_ID} .ds-helper-cell-action .ds-helper-btn + .ds-helper-btn { margin-left:4px; }
                #${POPUP_ID} .ds-helper-village-name-cell { text-align:left; white-space:nowrap; padding-left:10px; }
                #${POPUP_ID} .ds-helper-rank-cell { border-right:1px solid var(--ds-helper-border); padding-right:10px; }
                #${POPUP_ID} .ds-helper-village-table tbody tr:not(.ds-helper-group-separator):hover td { outline:1px solid rgba(36,36,36,0.18); outline-offset:-1px; font-weight:600; }
                #${POPUP_ID} .ds-helper-group-separator td { background:var(--ds-helper-text) !important; color:var(--ds-helper-bg) !important; font-weight:700; text-align:left; border:0; border-left:4px solid var(--ds-helper-accent); padding:6px 9px; }
                #${POPUP_ID} .ds-helper-scroll-box { overflow:auto; border:1px solid var(--ds-helper-border); border-radius:5px; margin-bottom:12px; background:var(--ds-helper-bg); }
                #${POPUP_ID} .ds-helper-village-scroll { max-height:calc(100vh - 520px); }
                #${POPUP_ID} .ds-helper-transport-scroll { max-height:300px; }
                #${POPUP_ID} .ds-helper-scroll-box::-webkit-scrollbar { width:11px; height:11px; }
                #${POPUP_ID} .ds-helper-scroll-box::-webkit-scrollbar-track { background:var(--ds-helper-muted); }
                #${POPUP_ID} .ds-helper-scroll-box::-webkit-scrollbar-thumb { background:var(--ds-helper-border); border-radius:5px; border:2px solid var(--ds-helper-muted); }
                #${POPUP_ID} .ds-helper-scroll-box::-webkit-scrollbar-thumb:hover { background:var(--ds-helper-accent); }
                #${POPUP_ID} .ds-helper-button-row { display:flex; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap; }
                #${POPUP_ID} .ds-helper-btn { min-height:28px; border:0; border-radius:5px; background:var(--ds-helper-accent); color:var(--ds-helper-bg); cursor:pointer; font-family:Verdana,Arial,sans-serif; font-size:12px; font-weight:700; line-height:1.2; padding:6px 11px; box-shadow:none; }
                #${POPUP_ID} .ds-helper-btn:hover:not(:disabled) { color:var(--ds-helper-bg); filter:brightness(0.92); box-shadow:0 2px 7px rgba(225,65,101,0.22); }
                #${POPUP_ID} .ds-helper-btn:active:not(:disabled) { filter:brightness(0.84); transform:translateY(1px); }
                #${POPUP_ID} .ds-helper-btn:disabled { cursor:default; background:var(--ds-helper-soft); color:#777777; box-shadow:none; filter:none; }
                #${POPUP_ID} .ds-helper-btn-primary { min-height:30px; padding:7px 12px; }
                #${POPUP_ID} .ds-helper-btn-small { min-height:24px; padding:4px 8px; font-size:11px; }
                #${POPUP_ID} .ds-helper-close-btn { min-width:30px; min-height:28px; background:transparent; color:var(--ds-helper-text); border:1px solid var(--ds-helper-border); padding:3px 8px; }
                #${POPUP_ID} .ds-helper-close-btn:hover:not(:disabled) { background:var(--ds-helper-accent); color:var(--ds-helper-bg); border-color:var(--ds-helper-accent); filter:none; }
                #${POPUP_ID} .ds-helper-transport-toggle { width:100%; text-align:left; margin:14px 0 8px; background:var(--ds-helper-bg); color:var(--ds-helper-text); border-bottom:2px solid var(--ds-helper-accent); border-radius:0; padding:7px 0 6px; box-shadow:none; }
                #${POPUP_ID} .ds-helper-transport-toggle:hover:not(:disabled) { background:var(--ds-helper-bg); color:var(--ds-helper-accent); filter:none; box-shadow:none; }
                #${POPUP_ID} .ds-helper-progress { margin-left:auto; white-space:nowrap; color:var(--ds-helper-text); font-weight:700; }
                #${POPUP_ID} .ds-helper-transport-table tbody tr.ds-helper-transport-row-even,
                #${POPUP_ID} .ds-helper-stat-table tbody tr:nth-child(even) { background:var(--ds-helper-muted); }
                #${POPUP_ID} .ds-helper-transport-table tbody tr:hover,
                #${POPUP_ID} .ds-helper-stat-table tbody tr:hover { background:var(--ds-helper-soft); }
                #${POPUP_ID} .ds-helper-transport-check-row:hover { background:var(--ds-helper-bg); }
                #${POPUP_ID} .ds-helper-transport-check-row td { padding:0 10px 10px; background:var(--ds-helper-bg) !important; border-bottom:1px solid var(--ds-helper-border); }
                #${POPUP_ID} .ds-helper-check-result { padding:9px 11px; border:1px solid var(--ds-helper-border); border-left:4px solid var(--ds-helper-accent); border-radius:4px; background:var(--ds-helper-muted); text-align:left; }
                #${POPUP_ID} .ds-helper-check-title { margin-bottom:6px; color:var(--ds-helper-text); font-size:12px; font-weight:700; }
                #${POPUP_ID} .ds-helper-check-result.is-error .ds-helper-check-title { color:var(--ds-helper-accent); }
                #${POPUP_ID} .ds-helper-check-list { display:flex; flex-wrap:wrap; gap:4px 18px; margin:0 0 7px; padding:0; list-style:none; }
                #${POPUP_ID} .ds-helper-check-list li { white-space:nowrap; }
                #${POPUP_ID} .ds-helper-check-errors { margin:0 0 7px; padding-left:18px; color:var(--ds-helper-accent); }
                #${POPUP_ID} .ds-helper-check-notice { display:block; color:var(--ds-helper-text); }
                #${POPUP_ID} .ds-helper-total-row th { background:var(--ds-helper-text) !important; color:var(--ds-helper-bg) !important; font-weight:700; border-top:3px solid var(--ds-helper-accent); }
                #${POPUP_ID} .ds-helper-empty-row { text-align:center; padding:9px; color:var(--ds-helper-text); background:var(--ds-helper-bg); }
            </style>

            <div class="ds-helper-header">
                <div>
                    <span class="ds-helper-title-main">DS Helper</span>
                    <span class="ds-helper-title-sub">Prägevorbereitung</span>
                    <span class="ds-helper-title-version">Version ${VERSION}</span>
                </div>
                <button type="button" id="${POPUP_ID}-close" class="ds-helper-btn ds-helper-close-btn">X</button>
            </div>
            <div class="ds-helper-content">
                <div class="ds-helper-info-grid">
                    <div class="ds-helper-info-block">
                        <div class="ds-helper-info-row">
                            <span class="ds-helper-info-label">Münzdorf</span>
                            <span class="ds-helper-info-value">
                                <input type="text" id="${POPUP_ID}-coin-village" value="${COIN_VILLAGE.coord}" maxlength="7" style="width:75px; text-align:center;">
                                <button type="button" id="${POPUP_ID}-save-coin-village" class="ds-helper-btn">Übernehmen</button>
                            </span>
                        </div>
                        <div class="ds-helper-info-row">
                            <span class="ds-helper-info-label">Dörfer ausgewertet</span>
                            <span class="ds-helper-info-value">${sortedVillages.length}</span>
                        </div>
                    </div>
                    <div class="ds-helper-info-block">
                        <div class="ds-helper-info-row">
                            <span class="ds-helper-info-label">Dörfer erkannt</span>
                            <span class="ds-helper-info-value">${allVillages.length}</span>
                        </div>
                        <div class="ds-helper-info-row">
                            <span class="ds-helper-info-label">Ungenutzte Dörfer</span>
                            <span class="ds-helper-info-value">${parseErrors}</span>
                        </div>
                    </div>
                </div>

                <div class="ds-helper-section-heading">Dorfübersicht</div>

                <div class="ds-helper-scroll-box ds-helper-village-scroll">
                    <table class="vis ds-helper-table ds-helper-village-table">
                        <thead class="ds-helper-sticky-head">
                            <tr>
                                <th style="width:45px;">Rang</th>
                                <th>Dorf</th>
                                <th style="width:75px;">Distanz</th>
                                <th style="width:110px;">Gruppe</th>
                                <th style="width:95px;">Holz</th>
                                <th style="width:95px;">Lehm</th>
                                <th style="width:95px;">Eisen</th>
                                <th style="width:95px;">Lager</th>
                                <th style="width:95px;">Soll</th>
                                <th style="width:95px;">Bedarf Holz</th>
                                <th style="width:95px;">Bedarf Lehm</th>
                                <th style="width:95px;">Bedarf Eisen</th>
                                <th style="width:85px;">Händler</th>
                            </tr>
                        </thead>
                        <tbody>${buildVillageRows(sortedVillages)}</tbody>
                    </table>
                </div>

                <button type="button" id="${POPUP_ID}-transport-toggle" class="ds-helper-btn ds-helper-transport-toggle">▼ Transportliste (${formatNumber(allVillageFlows.length)} Transporte)</button>

                <div class="ds-helper-button-row">
                    <button type="button" id="${POPUP_ID}-copy-transports" class="ds-helper-btn ds-helper-btn-primary">Transportliste kopieren</button>
                    <button type="button" class="ds-helper-btn ds-helper-btn-primary ds-helper-open-batch" data-batch-size="30">Nächste 30 Tabs öffnen</button>
                    <button type="button" class="ds-helper-btn ds-helper-btn-primary ds-helper-open-batch" data-batch-size="50">Nächste 50 Tabs öffnen</button>
                    <strong id="${POPUP_ID}-open-progress" class="ds-helper-progress">0 / ${allVillageFlows.length} geöffnet</strong>
                </div>

                <div id="${POPUP_ID}-transport-panel" class="ds-helper-scroll-box ds-helper-transport-scroll">
                    ${transportOutput}
                </div>

                <div class="ds-helper-section-heading">Gruppenbilanz</div>

                <table class="vis ds-helper-table ds-helper-stat-table">
                    <thead>
                        <tr>
                            <th rowspan="2">Gruppe</th>
                            <th rowspan="2">Bezeichnung</th>
                            <th rowspan="2">Dörfer</th>
                            <th colspan="3">Bedarf</th>
                            <th colspan="3">Überschuss</th>
                            <th colspan="3">Saldo</th>
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
                    <tbody>${groupSummaryRows}</tbody>
                </table>

${groupFlowOutput}

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
        $('#' + POPUP_ID + ' .ds-helper-check-transport').on(
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

                const checkResult =
                    checkTransportForDirectSend(
                        transport,
                        sortedVillages
                    );

                renderTransportCheckResult(
                    transportIndex,
                    checkResult
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

        $('#' + POPUP_ID + '-transport-toggle').on(
            'click',
            function () {
                const transportPanel =
                    $('#' + POPUP_ID + '-transport-panel');
                const isOpen = transportPanel.is(':visible');

                transportPanel.toggle(!isOpen);

                $(this).text(
                    (isOpen ? '▶' : '▼') +
                    ' Transportliste (' +
                    formatNumber(allVillageFlows.length) +
                    ' Transporte)'
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