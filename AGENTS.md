# AGENTS.md

Hinweise fuer KI-Agenten und automatisierte Mitarbeit an diesem Repository.

## Projektueberblick

DS Helper ist eine Sammlung von Schnellleistenskripten fuer das Browsergame
Die Staemme. Die Skripte werden als einzelne JavaScript-Dateien gepflegt und
per `javascript:$.getScript(...)` in der Schnellleiste ausgefuehrt.

Das Repository enthaelt keine Build-Pipeline und kein Paketmanifest. Aenderungen
sollten daher direkt an den betroffenen `.js`-Dateien, `README.md` oder
`DEVELOPMENT.md` vorgenommen werden.

## Arbeitsregeln

- Lies vor Aenderungen immer `README.md` und `DEVELOPMENT.md`.
- Beachte: Ein Skript erfuellt genau eine Aufgabe.
- Ergaenze keine neuen Funktionen, wenn sie nicht ausdruecklich angefragt sind.
- Aendere funktionierenden Code nur mit konkretem Anlass.
- Bewahre vorhandene Benutzer- oder Arbeitsaenderungen. Nicht ungefragt
  zuruecksetzen, ueberschreiben oder bereinigen.
- Halte Aenderungen klein und nah am angefragten Skript.
- Halte relevante Entwicklungsfortschritte in `HISTORY.md` fest, ohne dafuer
  eine gesonderte Aufforderung abzuwarten.

## Stil

- Dateinamen sind deutsch, aber ohne Umlaute.
- Kommentare und Dokumentation sind deutsch.
- Git-Commit-Nachrichten sind englisch.
- Verwende normales JavaScript fuer den Browserkontext.
- Gehe davon aus, dass jQuery im Spielkontext verfuegbar ist, wenn bestehende
  Skripte es bereits nutzen.
- Vermeide neue Abhaengigkeiten, Bundler oder Frameworks.
- Behalte den bestehenden IIFE-Aufbau und `'use strict'` bei, wenn du ein
  vorhandenes Skript bearbeitest.

## Script-Header

Neue Skripte verwenden den in `DEVELOPMENT.md` beschriebenen Header:

```javascript
/*
=======================================
DS Helper
Name:
Version:
Kategorie:
Autor: Rincewind610

Funktion:

=======================================
*/
```

Wenn du ein bestehendes Skript aenderst, pruefe, ob Version, Funktion oder
Status im Header angepasst werden muessen.

## Testing und Verifikation

Es gibt derzeit keine automatisierte Testsuite. Pruefe deshalb soweit moeglich:

- Syntax der geaenderten JavaScript-Dateien, z. B. mit `node --check <datei>`,
  sofern die Datei keine browser- oder spielseitigen Syntaxbesonderheiten
  enthaelt.
- Logik gegen die im Skript vorhandenen Konstanten, Datenstrukturen und
  bestehenden Hilfsfunktionen.
- Dokumentation, wenn sich Installation, Version, Status oder Bedienung aendert.

Vor einem Release muss das Skript gemaess `DEVELOPMENT.md` im Spiel getestet
werden, zuerst als Schnellleistenskript und danach ueber `@main`.

## Releases

Jedes Skript besitzt eine eigene Versionshistorie. Aendere Versionsnummern nur,
wenn die Aenderung veroeffentlichungsrelevant ist oder der Benutzer es verlangt.

Stabile Versionen werden als GitHub-Release veroeffentlicht. Der `main`-Branch
ist fuer die aktuelle Entwicklung vorgesehen.

## Wichtige Dateien

- `README.md`: Projektbeschreibung, Installation und Skriptuebersicht.
- `DEVELOPMENT.md`: verbindliche Entwicklungsregeln.
- `freie-bhp.js`: Produktionsskript fuer freie Bauernhofplaetze.
- `forschung-uebersicht-bhp.js`: Forschungsuebersicht mit BHP-Bezug.
- `flaggen-vorschlaege.js`: Flaggen-Hilfsskript.
- `ressourcen-balancing-voll-zu-leer.js`: Ressourcen-Balancing.
- `praege-vorbereitung.js`: Praegevorbereitung, aktuell in Entwicklung /
  Simulation.

## Umgang mit dem Spielkontext

Diese Skripte laufen auf Seiten von Die Staemme und greifen auf DOM-Strukturen
des Spiels zu. DOM-Selektoren, Tabellenstrukturen, globale Spielvariablen und
AJAX-Aufrufe koennen welt- oder ansichtsabhaengig sein. Sei deshalb besonders
vorsichtig bei:

- Selektoren und Tabellenindizes.
- Automatisierten Klicks oder Formularaktionen.
- Ressourcen-, Haendler- und Dorfberechnungen.
- Funktionen, die echte Transporte oder Spielaktionen ausloesen koennen.

Wenn eine Aenderung Spielaktionen betrifft, dokumentiere klar, ob sie nur
Simulation/Anzeige ist oder tatsaechlich Aktionen ausfuehrt.
