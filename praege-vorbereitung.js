// ==UserScript==
// @name         DS Helper - Prägevorbereitung
// @namespace    https://github.com/Rincewind610/ds-helper-scripts
// @version      0.1.0
// @description  Bereitet Prägetage durch räumlich optimierte Ressourcenverteilung vor (Simulation)
// @author       Rincewind610
// @match        https://de*.die-staemme.de/game.php?*screen=overview_villages&mode=prod*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    /**********************************************************************
     * DS Helper
     * Name: Prägevorbereitung
     * Version: 0.1.0
     * Status: Entwicklung
     **********************************************************************/

    const DEBUG = true;
    const SIMULATION = true;

    const COIN_VILLAGE = {
        x: 538,
        y: 573
    };

    const TARGET_FILL = 0.95;

    function log(...args) {
        if (DEBUG) {
            console.log('[DS Helper | Prägevorbereitung]', ...args);
        }
    }

    function init() {

        log('Version 0.1 gestartet');
        log('Simulation:', SIMULATION ? 'AN' : 'AUS');
        log('Münzdorf:', `${COIN_VILLAGE.x}|${COIN_VILLAGE.y}`);

    }

    init();

})();