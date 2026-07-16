/*
=======================================
DS Helper
Name: Keine Bauschleife mit Pop-Up
Version: 1.0.0
Kategorie: Produktion
Autor: Rincewind610

Funktion:
Markiert Dörfer ohne aktiven Bauauftrag
und zeigt eine Popup-Übersicht mit
Direktlinks zu den betroffenen Dörfern.

=======================================
*/

(function(){

var maxPoints = 10495;
var result = [];

document.querySelectorAll('tr').forEach(function(row){

    var cells = row.querySelectorAll('td');

    if(cells.length < 8){
        return;
    }

    var villageCell = cells[1];
    var villageText = villageCell.innerText || '';

    if(!/\(\d+\|\d+\)\s*K\d+/.test(villageText)){
        return;
    }

    var points = parseInt(
        (cells[2].innerText || '').replace(/\./g,''),
        10
    );

    if(!points || points >= maxPoints){
        return;
    }

    var construction = (cells[7].innerText || '').trim();

    if(construction === ''){

        row.querySelectorAll('td').forEach(function(td){
            td.style.backgroundColor = '#ffb3b3';
        });

        cells[2].style.background = '#cc0000';
        cells[2].style.color = '#fff';
        cells[2].style.fontWeight = 'bold';

        var link = villageCell.querySelector('a');

        result.push({
            name: villageText,
            href: link ? link.href : '#'
        });
    }

});

document.getElementById('ds_bau_popup')?.remove();

var bg = document.createElement('div');
bg.id = 'ds_bau_popup';
bg.style.cssText =
'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:999999;display:flex;align-items:center;justify-content:center;';

var box = document.createElement('div');
box.style.cssText =
'background:#f4e4b0;border:3px solid #7a4d17;padding:18px;border-radius:8px;min-width:520px;max-height:70vh;overflow:auto;font-family:Verdana;font-size:13px;';

box.innerHTML =
'<h2 style="margin-top:0">🏗 Baukontrolle</h2>' +
'<p><b>' + result.length + '</b> Dörfer ohne Bauauftrag gefunden.</p>';

if(result.length){

    var ul = document.createElement('ul');
    ul.style.paddingLeft = '20px';

    result.forEach(function(v){

        var li = document.createElement('li');

        var a = document.createElement('a');
        a.href = v.href;
        a.textContent = v.name;
        a.style.fontWeight = 'bold';
        a.target = '_blank';

        li.appendChild(a);
        ul.appendChild(li);

    });

    box.appendChild(ul);

}else{

    box.innerHTML += '<p>✅ Alle Dörfer bauen aktuell.</p>';

}

var btn = document.createElement('button');
btn.textContent = 'Schließen';
btn.style.cssText =
'margin-top:15px;padding:6px 14px;font-size:13px;cursor:pointer;';
btn.onclick = function(){
    bg.remove();
};

box.appendChild(btn);
bg.appendChild(box);
document.body.appendChild(bg);

})();
