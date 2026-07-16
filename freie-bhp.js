/*
=======================================
DS Helper
Name: Freie BHP
Version: 1.1.0
Kategorie: Produktion
Autor: Rincewind610

Funktion:
Zeigt die freien BHP je Dorf an.
Dörfer mit mehr als 50 freien BHP und
ohne aktive Rekrutierung werden rot markiert.
Zusätzlich erscheint eine Popup-Übersicht.
Die Spalte kann per Klick sortiert werden.
=======================================
*/

(function(){

    var config = {
        warnBHP: 50,
        popupId: 'ds_bhp_popup'
    };

    var result = [];

    $('table.vis tr').each(function(){

        var $row = $(this);

        if($row.data('bhpDone')){
            return;
        }

        $row.data('bhpDone', true);

        var $cells = $row.children('td,th');
        var bhIndex = -1;

        $cells.each(function(i){

            var txt = $(this).text().trim();

            if(txt.indexOf('Bauernhof') !== -1){
                bhIndex = i;
            }

        });

        /*
         * Tabellenüberschrift ergänzen
         */

        if(bhIndex !== -1){

            var $th = $('<th>% Frei<br>BHP</th>');

            $th.css({
                'cursor': 'pointer',
                'text-align': 'center'
            });

            $th.attr(
                'title',
                'Klicken zum Sortieren'
            );

            $th.on('click', function(){

                var $table = $(this).closest('table');
                var asc = !$table.data('bhpAsc');

                $table.data('bhpAsc', asc);

                var rows = $table.find('tr').filter(function(){

                    return $(this).find('td[data-bhp]').length;

                }).get();

                rows.sort(function(a, b){

                    var av = parseInt(
                        $(a).find('td[data-bhp]').attr('data-bhp'),
                        10
                    );

                    var bv = parseInt(
                        $(b).find('td[data-bhp]').attr('data-bhp'),
                        10
                    );

                    return asc ? av - bv : bv - av;

                });

                $.each(rows, function(_, row){

                    $table.append(row);

                });

            });

            $th.insertBefore($cells.eq(bhIndex));

            return;
        }

        /*
         * Bauernhofzelle finden
         */

        var $farmCell = null;

        $cells.each(function(){

            var txt = $(this).text().trim();

            if(/^\d+\s*\/\s*\d+$/.test(txt)){
                $farmCell = $(this);
            }

        });

        if(!$farmCell){
            return;
        }

        /*
         * Freie BHP berechnen
         */

        var match = $farmCell
            .text()
            .trim()
            .match(/(\d+)\s*\/\s*(\d+)/);

        if(!match){
            return;
        }

        var used = parseInt(match[1], 10);
        var max = parseInt(match[2], 10);
        var free = max - used;

        /*
         * Rekrutierung erkennen
         */

        var $recCell = $cells.last();

        var recruiting =
            $recCell.find('img').length > 0 ||
            $recCell.text().trim().length > 0;

        /*
         * BHP-Zelle erstellen
         */

        var $td = $('<td></td>').text(free);

        $td.attr('data-bhp', free);

        $td.css({
            'text-align': 'center',
            'font-weight': 'bold'
        });

        if(free > config.warnBHP && !recruiting){

            $td.css({
                'background': '#ff3333',
                'color': '#fff'
            });

            $td.attr(
                'title',
                'Mehr als ' +
                config.warnBHP +
                ' freie BHP und keine Rekrutierung aktiv'
            );

            var link = $row
                .find('td')
                .eq(1)
                .find('a')
                .first();

            result.push({
                name: $row
                    .find('td')
                    .eq(1)
                    .text()
                    .replace(/\s+/g, ' ')
                    .trim(),

                free: free,

                href: link.length
                    ? link[0].href
                    : '#'
            });

        }else{

            $td.css({
                'background': '#99ff00',
                'color': '#000'
            });

        }

        $td.insertBefore($farmCell);

    });

    /*
     * Bereits geöffnetes Popup entfernen
     */

    var oldPopup = document.getElementById(config.popupId);

    if(oldPopup){
        oldPopup.remove();
    }

    /*
     * Popup-Hintergrund erstellen
     */

    var bg = document.createElement('div');

    bg.id = config.popupId;

    bg.style.cssText =
        'position:fixed;' +
        'inset:0;' +
        'background:rgba(0,0,0,.55);' +
        'z-index:999999;' +
        'display:flex;' +
        'align-items:center;' +
        'justify-content:center;';

    /*
     * Popup-Fenster erstellen
     */

    var box = document.createElement('div');

    box.style.cssText =
        'background:#f4e4b0;' +
        'border:3px solid #7a4d17;' +
        'padding:18px;' +
        'border-radius:8px;' +
        'min-width:620px;' +
        'max-height:75vh;' +
        'overflow:auto;' +
        'font-family:Verdana;' +
        'font-size:13px;';

    box.innerHTML =
        '<h2 style="margin-top:0">⚔ Rekrutierung steht still</h2>' +
        '<p><b>' +
        result.length +
        '</b> Dörfer mit mehr als ' +
        config.warnBHP +
        ' freien BHP und ohne Rekrutierung.</p>';

    /*
     * Ergebnisliste ausgeben
     */

    if(result.length){

        result.sort(function(a, b){
            return b.free - a.free;
        });

        var table = document.createElement('table');

        table.style.cssText =
            'width:100%;' +
            'border-collapse:collapse;' +
            'margin-top:10px;';

        var head = document.createElement('tr');

        head.innerHTML =
            '<th style="text-align:left;border-bottom:2px solid #7a4d17;padding:5px;">Dorf</th>' +
            '<th style="text-align:right;border-bottom:2px solid #7a4d17;padding:5px;">Freie BHP</th>' +
            '<th style="text-align:center;border-bottom:2px solid #7a4d17;padding:5px;">Öffnen</th>';

        table.appendChild(head);

        result.forEach(function(v){

            var tr = document.createElement('tr');

            var tdName = document.createElement('td');

            tdName.textContent = v.name;

            tdName.style.cssText =
                'padding:4px 6px;' +
                'font-weight:bold;' +
                'color:#5b3200;';

            var tdBhp = document.createElement('td');

            tdBhp.textContent = v.free;

            tdBhp.style.cssText =
                'padding:4px 6px;' +
                'text-align:right;' +
                'font-weight:bold;' +
                'color:#9b0000;';

            var tdOpen = document.createElement('td');

            tdOpen.style.cssText =
                'padding:4px 6px;' +
                'text-align:center;';

            var a = document.createElement('a');

            a.href = v.href;
            a.target = '_blank';
            a.textContent = '🏠';
            a.title = 'Dorf öffnen';

            a.style.cssText =
                'font-size:18px;' +
                'text-decoration:none;';

            tdOpen.appendChild(a);

            tr.appendChild(tdName);
            tr.appendChild(tdBhp);
            tr.appendChild(tdOpen);

            table.appendChild(tr);

        });

        box.appendChild(table);

    }else{

        box.innerHTML +=
            '<p>✅ Keine stillstehenden Rekrutierungen gefunden.</p>';

    }

    /*
     * Schließen-Button
     */

    var btn = document.createElement('button');

    btn.textContent = 'Schließen';

    btn.style.cssText =
        'margin-top:15px;' +
        'padding:6px 14px;' +
        'font-size:13px;' +
        'cursor:pointer;';

    btn.onclick = function(){
        bg.remove();
    };

    box.appendChild(btn);
    bg.appendChild(box);
    document.body.appendChild(bg);

})();
