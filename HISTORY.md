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

### 2026-08-04 - praege-vorbereitung.js v0.8.8

- Version von `praege-vorbereitung.js` auf `0.8.8` angehoben.
- Haendlerlaufzeit wird nach direkter `game_data`-Pruefung einmalig aus der
  Weltkonfiguration `/interface.php?func=get_config` nachgeladen, sicher als
  XML geparst und nur bei eindeutiger plausibler Grundlage angezeigt.
- Bei unklarer oder fehlerhafter Weltkonfiguration bleibt die Oberflaeche
  nutzbar; die UI zeigt eine Diagnose und die Konsole erhaelt kompakte
  Konfigurationsdaten ohne Accountinformationen.
- Gruppe 1 bleibt bei `targetFill: 0.90`; Transportberechnung,
  Distanzgruppen, Sortierung, Transportliste, Direktversand und Batchlogik
  unveraendert gelassen.
- Pruefung: `node --check praege-vorbereitung.js` versucht, aber `node` ist
  auf diesem System nicht im PATH verfuegbar; `git diff --check` ohne
  Whitespace-Fehler. Es wurde kein echter Transport als automatisierter Test
  ausgeloest.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-04 - praege-vorbereitung.js v0.8.7

- Version von `praege-vorbereitung.js` auf `0.8.7` angehoben.
- Weltgeschwindigkeit wird sicher aus vorhandenen Spieldaten gelesen und die
  Haendlergeschwindigkeit als technische Information im Kopfbereich angezeigt.
- Bei ungueltiger oder fehlender Weltgeschwindigkeit wird kein Fallbackwert
  verwendet; stattdessen erscheint eine kompakte Hinweismeldung.
- Transportberechnung, Distanzgruppen, Zielwerte, Sortierung, Transportliste,
  Direktversand und Batchlogik unveraendert gelassen.
- Pruefung: `node --check praege-vorbereitung.js` versucht, aber `node` ist
  auf diesem System nicht im PATH verfuegbar; `git diff --check` ohne
  Whitespace-Fehler. Es wurde kein echter Transport als automatisierter Test
  ausgeloest.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-07-31 - praege-vorbereitung.js v0.8.6

- Erfolgreich gesendete Einzeltransporte werden nach bestaetigter
  Spielantwort aus der sichtbaren Transportliste entfernt.
- Der entfernte Transport wird intern als erledigt markiert, ohne die
  Transportliste neu zu berechnen oder DOM-Indizes zu verschieben.
- Transportzaehler und Oeffnen-Fortschritt werden aus den verbleibenden
  offenen Transporten aktualisiert; bei leerer Liste erscheint ein kompakter
  Hinweis.
- `Transportliste kopieren`, `Naechste 30 Tabs oeffnen` und `Naechste 50 Tabs
  oeffnen` beruecksichtigen erledigte Transporte nicht mehr.
- Fehlerpfade lassen die Zeile sichtbar und geben den Button wie bisher wieder
  frei; keine Warteschlange, kein Timer und kein automatischer Folgetransport
  ergaenzt.
- Version von `praege-vorbereitung.js` auf `0.8.6` angehoben.
- Pruefung: `git diff --check` ohne Whitespace-Fehler, nur CRLF-Hinweis;
  statisch genau eine `TribalWars.post`-Aufrufstelle, Entfernen nur im
  Erfolgspfad nach negativer Fehlerpruefung und Filterung erledigter
  Transporte fuer Kopieren/Oeffnen bestaetigt.
- `node --check` versucht, aber `node` ist auf diesem System nicht im PATH
  verfuegbar; es wurde kein echter Transport als automatisierter Test
  ausgeloest.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-07-31 - praege-vorbereitung.js v0.8.5

- Bestehenden Browser-Bestaetigungsdialog fuer `Transport senden` entfernt.
- Ein Klick startet nach den internen Zeilenpruefungen unmittelbar den
  bestehenden Einzelversand mit `TribalWars.post` und `ajaxaction: map_send`.
- Button wird vor dem Request auf `Wird gesendet ...` gesetzt und deaktiviert,
  damit schnelle Doppelklicks keinen zweiten Request ausloesen.
- Kompakte Erfolgs- und Fehlermeldungen werden direkt in der Transportzeile
  angezeigt, ohne die alte sichtbare Versandpruefung aufzuklappen.
- Keine Warteschlange, kein Timer, kein automatischer Folgetransport, keine
  Neuberechnung und kein Entfernen erfolgreich gesendeter Zeilen ergaenzt.
- Version von `praege-vorbereitung.js` auf `0.8.5` angehoben.
- Pruefung: `git diff --check` ohne Whitespace-Fehler, nur CRLF-Hinweis;
  statisch keine `window.confirm`-/`confirming`-Logik, genau eine
  `TribalWars.post`-Aufrufstelle und kein Aufruf von
  `renderTransportCheckResult` im direkten Buttonpfad bestaetigt.
- `node --check` versucht, aber `node` ist auf diesem System nicht im PATH
  verfuegbar; es wurde kein echter Transport als automatisierter Test
  ausgeloest.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-07-31 - praege-vorbereitung.js v0.8.4

- Einstieg in den Einzelversand vereinfacht: Der Zeilenbutton heisst nun
  `Transport senden` und startet den bestehenden Versandablauf direkt.
- Die lokale Versandpruefung und der eingefrorene Versanddatensatz werden
  weiterhin intern erzeugt, aber nicht mehr sichtbar unter der Zeile angezeigt.
- Bestaetigungsdialog, Payload-Pruefung, Doppelklickschutz und einzelner
  `TribalWars.post`-Versand mit `ajaxaction: map_send` bleiben erhalten.
- Keine Warteschlange, kein automatischer Folgetransport, keine Neuberechnung
  und kein Entfernen erfolgreich gesendeter Zeilen ergaenzt.
- Version von `praege-vorbereitung.js` auf `0.8.4` angehoben.
- Pruefung: `git diff --check` ohne Whitespace-Fehler, nur CRLF-Hinweis;
  statisch genau eine `TribalWars.post`-Aufrufstelle bestaetigt und kein
  Aufruf von `renderTransportCheckResult` im direkten Buttonpfad.
- `node --check` versucht, aber `node` ist auf diesem System nicht im PATH
  verfuegbar; es wurde kein echter Transport als automatisierter Test
  ausgeloest.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-07-31 - praege-vorbereitung.js v0.8.3

- Bewusst bestaetigten Einzeltransport pro gepruefter Transportzeile ergaenzt.
- Der Versand verwendet exakt den in Version 0.8.2 erzeugten und pro Zeile
  eingefrorenen Versanddatensatz mit `ajaxaction: map_send`.
- Bestaetigungsdialog, unmittelbare Payload-Pruefung sowie Schutz gegen
  Doppelklick und erneuten Versand bereits erfolgreicher Zeilen ergaenzt.
- Erfolgs- und Fehlerstatus werden direkt im Pruefbereich angezeigt; bei
  Fehlern gibt es keinen automatischen Wiederholungsversuch.
- Die CSRF-Pruefung bleibt sichtbar, blockiert `map_send` aber nicht.
- Keine Warteschlange, kein Timer, kein Sammelversand und keine automatische
  Folgeaktion ergaenzt.
- Version von `praege-vorbereitung.js` auf `0.8.3` angehoben.
- Pruefung: `git diff --check` ohne Whitespace-Fehler; statisch genau eine
  `TribalWars.post`-Aufrufstelle sowie die Reihenfolge Bestaetigung,
  Revalidierung und POST bestaetigt.
- Keine geschuetzte Funktion und kein verbotener Automatik-/Netzwerkpfad im
  Diff; es wurde kein echter Transport als automatisierter Test ausgeloest.
- `node --check` versucht, aber `node` ist auf diesem System nicht im PATH
  verfuegbar; ersatzweise lokale Chromium-Kompilierung mit `new Function`
  erfolgreich, ohne das Skript auszufuehren.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-07-30 - praege-vorbereitung.js v0.8.2

- Die lokale Versandpruefung erzeugt bei vollstaendig erfolgreicher Pruefung
  einen Versanddatensatz fuer genau die ausgewaehlte Transportzeile.
- Der Datensatz enthaelt ausschliesslich `sourceVillageId`,
  `targetVillageId`, `wood`, `stone`, `iron` und `merchantsRequired` als
  numerische Werte und wird als JSON im Statusbereich angezeigt.
- Bei fehlgeschlagener Pruefung bleibt der Versanddatensatz `null`.
- Keine HTTP-Anfrage, kein Transportversand, keine Tab-Oeffnung und keine
  automatische Folgeaktion ergaenzt.
- Version von `praege-vorbereitung.js` auf `0.8.2` angehoben.
- Pruefung: `git diff --check` ohne Whitespace-Fehler; statische Kontrolle
  bestaetigt exakt sechs Datensatzfelder und keine Versand-/HTTP-Aufrufe.
- `node --check` versucht, aber `node` ist auf diesem System nicht im PATH
  verfuegbar.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-07-30 - praege-vorbereitung.js v0.8.1

- Pro Transportzeile eine rein lokale Versandpruefung ergaenzt, die Quelle,
  Ziel, Dorf-IDs, Rohstoffmengen, Haendlerbedarf, `TribalWars.post` und
  CSRF-Token kontrolliert.
- Das Pruefergebnis wird direkt unter der ausgewaehlten Transportzeile
  angezeigt und bestaetigt ausdruecklich, dass kein Transport versendet wurde.
- Keine HTTP-Anfrage, kein Formularversand und keine automatische
  Weiterverarbeitung weiterer Transportzeilen ergaenzt.
- Transportberechnung, Simulation, Sortierung, Reservelogik und bestehende
  Transportobjekte unveraendert gelassen.
- Version von `praege-vorbereitung.js` auf `0.8.1` angehoben.
- Pruefung: `git diff --check` ohne Whitespace-Fehler; `node --check`
  versucht, aber `node` ist auf diesem System nicht im PATH verfuegbar.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-07-30 - praege-vorbereitung.js v0.7.2

- Finales modernes Design der Praegevorbereitung nachgeschaerft: flaches
  Weiss/Grau/Pink-Farbschema, hellere Infobox und einheitliche
  Bereichsueberschriften.
- Statistik-Titel `Geplante Gruppenfluesse` und `Offener Bedarf` als sichtbare
  Bereichsueberschriften vor die Tabellen gezogen, damit alle Tabellenkoepfe
  dunkelgrau mit weisser Schrift bleiben.
- Version von `praege-vorbereitung.js` auf `0.7.2` angehoben.
- Berechnungslogik, Transportlogik, Gruppenzuordnung, Sortierung,
  IDs, Event-Handler und Datenstrukturen unveraendert gelassen.
- Pruefung: `node --check praege-vorbereitung.js` versucht, aber `node` ist
  auf diesem System nicht im PATH verfuegbar; `git diff --check` ohne
  Whitespace-Fehler, nur CRLF-Hinweis.
- Offen: Test im Spiel als Schnellleistenskript.

### 2026-07-30 - praege-vorbereitung.js v0.7.1
- Visuelles Design der Praegevorbereitung auf modernes DS-Helper-Farbschema
  umgestellt: Weiss, Dunkelgrau und Akzentfarbe `#E14165`.
- Scoped CSS-Variablen und gemeinsame Klassen fuer Popup, Kopfbereich,
  Abschnittsueberschriften, Buttons, Tabellen, Eingabefeld und Scrollbereiche
  ergaenzt bzw. ueberarbeitet.
- Sichtbare Abschnittsueberschriften `Dorfuebersicht` und `Gruppenbilanz`
  ergaenzt; bestehende Bereichsreihenfolge beibehalten.
- Version von `praege-vorbereitung.js` auf `0.7.1` angehoben.
- Berechnungslogik, Transportlogik, Gruppenzuordnung, Sortierung,
  IDs, Event-Handler und Datenstrukturen unveraendert gelassen.
- Pruefung: `node --check praege-vorbereitung.js` versucht, aber `node` ist
  auf diesem System nicht im PATH verfuegbar; `git diff --check` ohne
  Whitespace-Fehler, nur CRLF-Hinweis.
- Offen: Test im Spiel als Schnellleistenskript.

### 2026-07-30 - praege-vorbereitung.js v0.7.0

- Benutzeroberflaeche der Praegevorbereitung aufgeraeumt: kompakte obere
  Uebersicht, einheitliche Button-Stile, klarere Dorf- und Transporttabellen
  sowie optisch vereinheitlichte Statistikbereiche.
- Transportliste als ein- und ausklappbaren UI-Bereich ergaenzt; Transportdaten
  und Fortschritt bleiben unveraendert erhalten.
- Gruppentrenner in der Dorfuebersicht nur in der HTML-Ausgabe ergaenzt.
- Sichtbare Bezeichnung `Verbleibender Bedarf` zu `Offener Bedarf` geaendert.
- Version von `praege-vorbereitung.js` auf `0.7.0` angehoben.
- Berechnungslogik, Transportlogik, Gruppenzuordnung und Sortierung
  unveraendert gelassen.
- Pruefung: `node --check praege-vorbereitung.js` versucht, aber `node` ist
  auf diesem System nicht im PATH verfuegbar; `git diff --check` ohne
  Whitespace-Fehler, nur CRLF-Hinweis.
- Offen: Test im Spiel als Schnellleistenskript.

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
