/*
=======================================
DS Helper
Name: Forschung Übersicht mit BHP
Version: 1.0.3
Kategorie: Forschung
Autor: Rincewind610

Funktion:
Zeigt in der Forschungsübersicht die
freien BHP der einzelnen Dörfer an.

Hebt das Wort "Rekrutierung" in den
Einträgen der Forschungsübersicht hervor.

Änderung 1.0.2:
Die Hervorhebung durchsucht die verschachtelten
Textknoten der Forschungszeilen vollständig.

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

    function highlightRecruitment($container){

        var root = $container.get(0);

        if(!root){
            return;
        }

        var walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node){

                    if(node.nodeValue.indexOf('Rekrutierung') === -1 ||
                       $(node.parentNode).closest('.ds-helper-rekrutierung').length){
                        return NodeFilter.FILTER_REJECT;
                    }

                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        var textNodes = [];
        var node;

        while((node = walker.nextNode())){
            textNodes.push(node);
        }

        $.each(textNodes, function(_, textNode){

            var fragment = document.createDocumentFragment();
            var parts = textNode.nodeValue.split('Rekrutierung');

            $.each(parts, function(i, part){
                if(part){
                    fragment.appendChild(document.createTextNode(part));
                }

                if(i < parts.length - 1){
                    var marker = document.createElement('span');
                    marker.className = 'ds-helper-rekrutierung';
                    marker.textContent = 'Rekrutierung';
                    marker.style.backgroundColor = '#f86e12';
                    marker.style.color = '#000';
                    marker.style.fontWeight = 'bold';
                    marker.style.borderRadius = '2px';
                    fragment.appendChild(marker);
                }
            });

            textNode.parentNode.replaceChild(fragment, textNode);
        });

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

            highlightRecruitment($row);

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
