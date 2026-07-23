/*
=======================================
DS Helper
Name: Flaggen-Vorschläge
Version: 1.0.0
Kategorie: Flaggen
Autor: Rincewind610

Funktion:
Markiert Dörfer mit mindestens 1.000 freien BHP,
wenn keine Rekrutierungsflagge und keine
Rohstoffflagge aktiv ist.
=======================================
*/

(function(){

var config={
    minFreeBHP:1000,
    prodMode:'prod'
};

function overviewUrl(mode){
    return location.origin+
        '/game.php?village='+
        game_data.village.id+
        '&screen=overview_villages&mode='+
        mode;
}

function key(txt){
    var m=txt.match(/\((\d+\|\d+)\)\s*K\d+/);
    return m?m[0]:null;
}

$.get(overviewUrl(config.prodMode),function(html){
    var $doc=$($.parseHTML(html));
    var bhp={};

    $doc.find('tr').each(function(){
        var $row=$(this);
        var k=key($row.text());

        if(!k)return;

        var $farmCell=null;

        $row.children('td').each(function(){
            var txt=$(this).text().trim();

            if(/^\d+\s*\/\s*\d+$/.test(txt)){
                $farmCell=$(this);
            }
        });

        if(!$farmCell)return;

        var m=$farmCell
            .text()
            .trim()
            .match(/(\d+)\s*\/\s*(\d+)/);

        if(!m)return;

        bhp[k]=
            parseInt(m[2],10)-
            parseInt(m[1],10);
    });

    $('table.vis tr').each(function(){
        var $row=$(this);
        var k=key($row.text());

        if(!k)return;

        var free=bhp[k];

        if(
            typeof free==='undefined' ||
            free<config.minFreeBHP
        ){
            return;
        }

        var rowText=$row
            .text()
            .replace(/\s+/g,' ')
            .trim();

        var hasRecruitFlag=
            rowText.indexOf('Rekrutierungs-Geschwindigkeit')!==-1 ||
            rowText.indexOf('Rekrutierungs')!==-1;

        var hasResourceFlag=
            rowText.indexOf('Rohstoffe')!==-1;

        var hasNoFlag=
            rowText.indexOf('Auswählen')!==-1;

        if(
            hasNoFlag &&
            !hasRecruitFlag &&
            !hasResourceFlag
        ){
            $row
                .children('td')
                .css('background-color','#ffe066');
        }
    });
});

})();
