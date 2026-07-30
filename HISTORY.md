# DS Helper - Entwicklungs-History

Diese Datei haelt die Entwicklungsfortschritte im Repository fest, damit
kuenftige Arbeiten den bisherigen Stand schnell nachvollziehen koennen.

## Pflegehinweise

- Bei jeder relevanten Aenderung einen neuen Eintrag oben ergaenzen.
- Kurz beschreiben, was geaendert wurde und warum.
- Betroffene Dateien nennen.
- Wenn Tests oder Pruefungen gelaufen sind, diese mit Ergebnis notieren.
- Offene Punkte oder Spieltests klar als offen markieren.

## Eintraege

### 2026-07-30 - Anzeige Ungenutzte Doerfer

- In `praege-vorbereitung.js` die sichtbare Popup-Beschriftung
  `Lesefehler` zu `Ungenutzte Doerfer` geaendert.
- Interne Variablennamen und Berechnungslogik unveraendert gelassen.
- Pruefung: Anzeige-Treffer kontrolliert; kein `node --check`, da nur Text im
  HTML-Template geaendert wurde.

### 2026-07-30 - praege-vorbereitung.js v0.6.11

- Popup-Reihenfolge fuer den Live-Test umgebaut: Infotabelle, farbige
  Dorf-Kontrollansicht, Transportsteuerung, Transportliste, danach
  Gruppenbilanz und Gruppenfluesse.
- Version von `praege-vorbereitung.js` auf `0.6.11` angehoben.
- Berechnungslogik, Simulation, Transporterzeugung und Markt-Tab-Oeffnung
  unveraendert gelassen.
- Pruefung: `node --check praege-vorbereitung.js` versucht, aber `node` ist
  auf diesem System nicht im PATH verfuegbar.
- Offen: Test im Spiel als Schnellleistenskript.

### 2026-07-30

- `HISTORY.md` angelegt, um Entwicklungsfortschritte dauerhaft im Repository zu
  dokumentieren.
- `AGENTS.md` soll kuenftig darauf hinweisen, die History bei relevanten
  Aenderungen automatisch mitzupflegen.
- Pruefung: keine Codeaenderung, daher kein `node --check` notwendig.
- Offen: Kuenftige Skript- oder Dokumentationsaenderungen jeweils in dieser
  Datei ergaenzen.
