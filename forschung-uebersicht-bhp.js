/*
=======================================
DS Helper
Name: Forschung Übersicht mit BHP
Version: 1.1.0
Kategorie: Forschung
Autor: Rincewind610

Funktion:
Zeigt in der Forschungsübersicht die
freien BHP der einzelnen Dörfer an.

Rot: mehr als 50 freie BHP
Grün: maximal 50 freie BHP

Die Spalte kann durch Anklicken der
Überschrift sortiert werden.
=======================================
*/

(function(){

    var prodUrl =
        location.origin +
        '/game.php?village=' +
        game_data.village.id +
        '&screen=overview_villages&mode=prod';

    var warnBHP = 50;

    function key(txt){
        var m = txt.match(/\((\d+\|\d+)\)\s*K\d+/);
        return m ? m[0] : null;
    }

    $.get(prodUrl, function(html){

        var $doc = $($.parseHTML(html));
        var bhp = {};

        $doc.find('tr').each(function(){

            var $row = $(this);
            var k = key($row.text());

            if(!k){
                return;
            }

            var $farmCell = null;

            $row.children('td').each(function(){

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

            bhp[k] =
                parseInt(m[2], 10) -
                parseInt(m[1], 10);

        });

        $('table.vis tr').each(function(){

            var $row = $(this);

            if($row.data('bhpTechDone')){
                return;
            }

            $row.data('bhpTechDone', true);

            var $cells = $row.children('td,th');
            var flagIndex = -1;

            $cells.each(function(i){

                if($(this).text().indexOf('Flagge') !== -1){
                    flagIndex = i;
                }

            });

            if(flagIndex !== -1){

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

                    var rows = $table
                        .find('tr')
                        .filter(function(){

                            return $(this)
                                .find('td[data-bhp]')
                                .length;

                        })
                        .get();

                    rows.sort(function(a, b){

                        var av = parseInt(
                            $(a)
                                .find('td[data-bhp]')
                                .attr('data-bhp'),
                            10
                        );

                        var bv = parseInt(
                            $(b)
                                .find('td[data-bhp]')
                                .attr('data-bhp'),
                            10
                        );

                        return asc ? av - bv : bv - av;

                    });

                    $.each(rows, function(_, row){
                        $table.append(row);
                    });

                });

                $th.insertBefore($cells.eq(flagIndex));

                return;
            }

            var k = key($row.text());

            if(!k){
                return;
            }

            var free = bhp[k];

            if(typeof free === 'undefined'){
                return;
            }

            var $td = $('<td></td>').text(free);

            $td.attr('data-bhp', free);

            $td.css({
                'text-align': 'center',
                'font-weight': 'bold'
            });

            if(free > warnBHP){

                $td.css({
                    'background': '#ff3333',
                    'color': '#fff'
                });

                $td.attr(
                    'title',
                    'Mehr als ' +
                    warnBHP +
                    ' freie BHP'
                );

            }else{

                $td.css({
                    'background': '#99ff00',
                    'color': '#000'
                });

            }

            var $flagCell = $cells.filter(function(){

                var text = $(this).text();

                return text.indexOf('Auswählen') !== -1 ||
                       text.indexOf('Rekrutierungs') !== -1 ||
                       text.indexOf('Bevölkerung') !== -1 ||
                       text.indexOf('Angriff') !== -1;

            }).first();

            if($flagCell.length){
                $td.insertBefore($flagCell);
            }

        });

    }).fail(function(){

        if(typeof UI !== 'undefined'){

            UI.ErrorMessage(
                'Die Produktionsübersicht konnte nicht geladen werden.',
                5000
            );

        }

    });

})();
