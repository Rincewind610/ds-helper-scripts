/*
=======================================
DS Helper
Name: Ressourcen Balancing Voll zu Leer
Version: 0.2.0
Kategorie: Produktion
Autor: Rincewind610

Funktion:
Verteilt Ressourcen vom jeweils vollsten
Dorf zum jeweils leersten Dorf.
=======================================
*/

javascript:(function () {
    'use strict';

    const SCRIPT_NAME = 'DS Helper';
    const SCRIPT_TITLE = 'Ressourcen Balancing Voll zu Leer';
    const VERSION = '0.2.0';

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

    $('#dshelper-window').remove();

    $('body').append(`
        <div id="dshelper-window">
            <div id="dshelper-header">
                <span>${SCRIPT_NAME} - ${SCRIPT_TITLE}</span>
                <span id="dshelper-close">✖</span>
            </div>

            <div id="dshelper-content">
                <h3>Version ${VERSION}</h3>

                <p>Dörfer werden gleich eingelesen...</p>

                <div id="dshelper-status">
                    Bereit.
                </div>
            </div>
        </div>
    `);

    $('<style>')
        .text(`
            #dshelper-window{
                position:fixed;
                top:80px;
                left:80px;
                width:500px;
                background:#f4e4bc;
                border:2px solid #6b4b1b;
                z-index:999999;
                box-shadow:0 0 15px rgba(0,0,0,.5);
                font-size:13px;
            }

            #dshelper-header{
                background:#6b4b1b;
                color:#fff;
                padding:8px 10px;
                display:flex;
                justify-content:space-between;
                cursor:move;
                font-weight:bold;
            }

            #dshelper-content{
                padding:12px;
            }

            #dshelper-status{
                margin-top:15px;
                padding:8px;
                background:#fff;
                border:1px solid #ccc;
            }

            #dshelper-close{
                cursor:pointer;
            }
        `)
        .appendTo('head');

    $('#dshelper-close').click(function(){
        $('#dshelper-window').remove();
    });

    if($.fn.draggable){
        $('#dshelper-window').draggable({
            handle:'#dshelper-header'
        });
    }

})();
