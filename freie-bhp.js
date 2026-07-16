/*
=======================================
DS Helper
Name: Freie BHP
Version: 1.0
Kategorie: Produktion
Autor: Rincewind610

Funktion:
Zeigt die freien BHP je Dorf an.
Dörfer mit mehr als 50 freien BHP und
ohne aktive Rekrutierung werden rot markiert.
Die Spalte kann per Klick sortiert werden.
=======================================
*/

(function(){
    var warnBHP = 50;

    $('table.vis tr').each(function(){
        var $row = $(this);

        if($row.data('bhpDone')){
            return;
        }

        $row.data('bhpDone', true);

        var $cells = $row.children('td,th');

        var bhIndex = -1;
        var recIndex = -1;

        $cells.each(function(i){
            var txt = $(this).text().trim();

            if(txt.indexOf('Bauernhof') !== -1){
                bhIndex = i;
            }

            if(txt.indexOf('Rekrutierung') !== -1){
                recIndex = i;
            }
        });

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

        var m = $farmCell
            .text()
            .trim()
            .match(/(\d+)\s*\/\s*(\d+)/);

        if(!m){
            return;
        }

        var used = parseInt(m[1], 10);
        var max = parseInt(m[2], 10);
        var free = max - used;

        var $recCell = $cells.last();

        var recruiting =
            $recCell.find('img').length > 0 ||
            $recCell.text().trim().length > 0;

        var $td = $('<td></td>').text(free);

        $td.attr('data-bhp', free);

        $td.css({
            'text-align': 'center',
            'font-weight': 'bold'
        });

        if(free > warnBHP && !recruiting){
            $td.css({
                'background': '#ff3333',
                'color': '#fff'
            });

            $td.attr(
                'title',
                'Mehr als 50 freie BHP und keine Rekrutierung aktiv'
            );
        }else{
            $td.css({
                'background': '#99ff00',
                'color': '#000'
            });
        }

        $td.insertBefore($farmCell);
    });
})();
