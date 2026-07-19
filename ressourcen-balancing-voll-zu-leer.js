/*
=======================================
DS Helper
Name: Ressourcen Balancing Voll zu Leer
Version: 0.1.0
Kategorie: Produktion
Autor: Rincewind610

Funktion:
Verteilt Ressourcen vom jeweils vollsten
Dorf zum jeweils leersten Dorf.

Entwicklung:
- Produktionsübersicht einlesen
- Lagerfüllstände berechnen
- Paarungen bilden
- Transporte erzeugen
=======================================
*/

javascript:(function () {
    'use strict';

    // ----------------------------------------------------
    // Konfiguration
    // ----------------------------------------------------

    const SCRIPT_NAME = 'DS Helper - Ressourcen Balancing Voll zu Leer';
    const SCRIPT_VERSION = '0.1.0';

    // ----------------------------------------------------
    // Prüfung
    // ----------------------------------------------------

    if (
        game_data.screen !== 'overview_villages' ||
        game_data.mode !== 'prod'
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

    UI.SuccessMessage(
        `${SCRIPT_NAME} ${SCRIPT_VERSION} gestartet.`,
        3000
    );

    console.log(
        `${SCRIPT_NAME} ${SCRIPT_VERSION}`
    );

})();
