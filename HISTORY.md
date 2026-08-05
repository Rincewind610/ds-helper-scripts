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

### 2026-08-05 - praege-vorbereitung.js v0.8.12.14

- Version von `praege-vorbereitung.js` auf `0.8.12.14` angehoben.
- Rohstoffauslesung laufender eingehender Transporte an die aktuelle Struktur
  in `td[8]` angepasst: `.nowrap`-Bloecke werden anhand von `.icon.wood`,
  `.icon.stone` und `.icon.iron` ausgewertet.
- Rohstoffwerte werden pro `.nowrap`-Block separat mit `parseGameNumber()`
  gelesen und je Rohstofftyp addiert, damit Holz, Lehm und Eisen nicht zu
  Zahlenketten zusammenkleben.
- Alte `.res.wood`/`.res.stone`/`.res.iron`-Struktur bleibt als Fallback
  erhalten, wenn keine `.nowrap`-Bloecke vorhanden sind, ohne Doppelzaehlung.
- Ziel-Dorf-ID-Auslesung, Incoming-URL, Bedarfsberechnung, Transportplanung,
  UI, Leerungsanalyse, Direktversand und Drag-Initialisierung unveraendert
  gelassen.
- Pruefung: statische Suche bestaetigt `.nowrap`, `.icon.wood`, `.icon.stone`,
  `.icon.iron`, Fallback auf `.res.*` und genau einen `enablePopupDragging()`-
  Aufruf nach dem Popup-Append; Negativsuche auf Ganzzellen-Rohstoffparser,
  alte `village`-Zieldorf-ID und doppelte Drag-Initialisierung ohne Treffer.
  `git diff --check` ohne Whitespace-Fehler, nur LF/CRLF-Hinweis; `node --check
  praege-vorbereitung.js` versucht, aber `node` ist auf diesem System nicht im
  PATH verfuegbar.
- Es wurden keine automatisierten Tests ausgefuehrt, die echte Transporte oder
  Spielaktionen ausloesen.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-05 - praege-vorbereitung.js v0.8.12.13

- Version von `praege-vorbereitung.js` auf `0.8.12.13` angehoben.
- Bedarfsberechnung der Empfaenger in `prepareSimulation()` beruecksichtigt
  laufende eingehende Rohstoffe: `needWood`, `needClay` und `needIron` werden
  aus aktuellem Bestand plus `incomingWood`/`incomingClay`/`incomingIron`
  berechnet.
- Fehlende oder ungueltige `incoming...`-Werte werden defensiv als `0`
  behandelt; Bedarfe bleiben durch `Math.max(0, ...)` nie negativ.
- Senderseite bleibt unveraendert: aktuelle Lagerbestaende, Ueberschuesse,
  Senderauswahl, Sperrbestand und versendbare Rohstoffe werden nicht um
  laufende Eingaenge erhoeht.
- Parser und Anzeige laufender Eingaenge, Dorfuebersicht, Leerungsanalyse,
  Direktversand und Drag-Initialisierung unveraendert beibehalten.
- Pruefung: statische Suche bestaetigt defensive Incoming-Normalisierung,
  `effectiveWood`/`effectiveClay`/`effectiveIron` in der Bedarfsermittlung,
  unveraenderte Senderreserve-Anker und genau einen `enablePopupDragging()`-
  Aufruf nach dem Popup-Append. `git diff --check` ohne Whitespace-Fehler, nur
  LF/CRLF-Hinweis; `node --check praege-vorbereitung.js` versucht, aber `node`
  ist auf diesem System nicht im PATH verfuegbar.
- Es wurden keine automatisierten Tests ausgefuehrt, die echte Transporte oder
  Spielaktionen ausloesen.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-05 - praege-vorbereitung.js v0.8.12.12

- Version von `praege-vorbereitung.js` auf `0.8.12.12` angehoben.
- Parser fuer laufende eingehende Transporte an die echte Struktur von
  `#trades_table` angepasst: verarbeitet werden nur Transportzeilen mit
  mindestens 9 `td`-Zellen.
- Zieldorf-ID wird aus `td[4]` ueber den Link `screen=info_village` und dessen
  Parameter `id` gelesen; `village` wird nicht mehr als Zieldorf-ID verwendet.
- Rohstoffe werden getrennt aus `td[8]` ueber `.res.wood`, `.res.stone` und
  `.res.iron` gelesen, damit Werte nicht zu Zahlenketten zusammenkleben.
- Eingehende Rohstoffe bleiben weiterhin rein informativ und werden nicht in
  Bedarfe, Gruppenfluesse, Transportplanung, Leerungsanalyse oder Direktversand
  eingerechnet. Drag-Initialisierung bleibt unveraendert aktiv.
- Pruefung: statische Suche bestaetigt Ziel-ID aus `id`, Rohstoffe aus
  `.res.wood`/`.res.stone`/`.res.iron`, Mindestanzahl 9 `td`-Zellen und genau
  einen `enablePopupDragging()`-Aufruf nach dem Popup-Append; Negativsuche auf
  `village` als Zieldorf-ID, Ganzzellen-Rohstoffparser und Incoming-Verrechnung
  ohne Treffer. `git diff --check` ohne Whitespace-Fehler, nur LF/CRLF-Hinweis;
  `node --check praege-vorbereitung.js` versucht, aber `node` ist auf diesem
  System nicht im PATH verfuegbar.
- Es wurden keine automatisierten Tests ausgefuehrt, die echte Transporte oder
  Spielaktionen ausloesen.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-05 - praege-vorbereitung.js v0.8.12.11

- Version von `praege-vorbereitung.js` auf `0.8.12.11` angehoben.
- Laufende eingehende Rohstofftransporte werden vor der normalen Berechnung
  einmalig aus der Haendleruebersicht `overview_villages&mode=trader&type=inc&page=-1`
  geladen und nach Zieldorf-ID zusammengefasst.
- Dorfobjekte um `incomingWood`, `incomingClay`, `incomingIron` und
  `incomingTransportCount` erweitert; Doerfer ohne laufende Eingaenge erhalten
  ueberall `0`.
- Dorfuebersicht um die rein informativen Spalten `Unterwegs Holz`,
  `Unterwegs Lehm` und `Unterwegs Eisen` erweitert; Kopfbereich zeigt eine
  kompakte Zusammenfassung der laufenden Eingaenge oder einen Ladehinweis.
- Eingehende Rohstoffe werden noch nicht in Bedarfe, Gruppenbilanz,
  Gruppenfluesse, Transportplanung, Leerungsanalyse oder Direktversand
  eingerechnet.
- Verschiebbarkeit des Pop-ups beibehalten und `enablePopupDragging()` nach dem
  Erzeugen des Pop-ups genau einmal initialisiert; Position wird nicht
  gespeichert.
- Pruefung: statische Suche bestaetigt Loader, `type=inc`, `page=-1`, neue
  Incoming-Felder, Unterwegs-Spalten und Drag-Initialisierung; Negativsuche auf
  Incoming-Verrechnung in `needWood`/`needClay`/`needIron` sowie Drag-Speicher
  ohne Treffer. `SENDER_RESERVE` bleibt `96000`/`108000`/`84000`, Gruppe 1 bei
  `0.90` und Gruppe 8 bei `0.25`. `git diff --check` ohne Whitespace-Fehler,
  nur LF/CRLF-Hinweis; `node --check praege-vorbereitung.js` versucht, aber
  `node` ist auf diesem System nicht im PATH verfuegbar.
- Es wurden keine automatisierten Tests ausgefuehrt, die echte Transporte oder
  Spielaktionen ausloesen.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-05 - praege-vorbereitung.js v0.8.12.5

- Version von `praege-vorbereitung.js` auf `0.8.12.5` angehoben.
- Gruppen der `Leerungsanalyse nach Gruppen-Zielwerten` von nativen
  `details`/`summary`-Elementen auf eine eindeutige Button- und
  Detailcontainer-Struktur umgestellt, damit pro Gruppenzeile genau ein Pfeil
  sichtbar ist.
- Auf- und Zuklappen der Gruppen repariert: Der Klick steuert nur den direkt
  zugehoerigen Detailcontainer, rendert die Dorf-Detailtabelle pro Gruppe nur
  einmal und verwendet sie danach wieder.
- Detailcontainer bleiben strikt innerhalb der jeweiligen Analysegruppe; die
  normale Transporttabelle bleibt ausserhalb der Leerungsanalyse und wird nicht
  als Detailinhalt verwendet.
- Routenanzeige der Dorf-Detailansicht bleibt in der Analyse sichtbar; Drag-
  Funktion des Fensters, Transportlogik, Analyseberechnung, Laufzeituebersicht,
  Direktversand und Versandlogik unveraendert gelassen.
- Pruefung: statische Suche bestaetigt keine nativen `details`/`summary`
  mehr fuer die Analysegruppen, genau einen eigenen Gruppenpfeil je Toggle,
  direkte Detailcontainer pro Gruppe, `hidden`-Umschaltung und einmaliges
  Rendern ueber `data-rendered`; alte 25-Prozent-Analysepfade,
  Weltkonfigurationsabruf und Fetch ohne Treffer. `git diff --check` ohne
  Whitespace-Fehler, nur LF/CRLF-Hinweis; `node --check
  praege-vorbereitung.js` versucht, aber `node` ist auf diesem System nicht
  im PATH verfuegbar.
- Es wurden keine automatisierten Tests ausgefuehrt, die echte Transporte oder
  Spielaktionen ausloesen.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-05 - praege-vorbereitung.js v0.8.12.4

- Version von `praege-vorbereitung.js` auf `0.8.12.4` angehoben.
- Routendarstellung in der Detailansicht der Leerungsanalyse vervollstaendigt:
  bei einer Route werden Zielkoordinate, Zielgruppe, Umlaufzeit und
  theoretische Dauer kompakt angezeigt; bei mehreren Routen werden alle
  offenen Senderouten mit Umlaufzeit angezeigt.
- Bei mehreren Senderouten wird die theoretische Dauer sichtbar mit der
  laengsten aktuellen Umlaufzeit gekennzeichnet; bei fehlender Senderroute
  wird keine Laufzeit erfunden und `Dauer nicht berechenbar` angezeigt.
- DS-Helper-Fenster per Maus ueber den Kopfbereich verschiebbar gemacht; Drag
  startet nicht auf Buttons, Eingaben, Tabellen, Scrollbereichen oder
  einklappbaren Bereichen.
- Fensterposition wird nicht gespeichert; beim erneuten Skriptstart gilt wieder
  die Standardposition. Aktive Drag-Listener werden nur waehrend eines
  Ziehvorgangs am Dokument registriert und danach entfernt.
- Normale Transportplanung, Analyseberechnung, Zielwerte, Transportmengen,
  Laufzeituebersicht, Direktversand und Versandlogik unveraendert gelassen.
- Pruefung: statische Suche auf alte 25-Prozent-Analysepfade,
  Weltkonfigurationsabruf, Fetch und Positionsspeicher ohne Treffer; neue
  Route-/Dauer-Anzeige, Mehrfachrouten-Hinweis, Drag-Handler,
  Drag-Cleanup, Header-Cursor und Initialisierung statisch bestaetigt;
  `git diff --check` ohne Whitespace-Fehler, nur LF/CRLF-Hinweis;
  `node --check praege-vorbereitung.js` versucht, aber `node` ist auf diesem
  System nicht im PATH verfuegbar.
- Es wurden keine automatisierten Tests ausgefuehrt, die echte Transporte oder
  Spielaktionen ausloesen.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-05 - praege-vorbereitung.js v0.8.12.3

- Version von `praege-vorbereitung.js` auf `0.8.12.3` angehoben.
- Detailansicht der Leerungsanalyse vervollstaendigt: pro Dorf werden Distanz,
  Gruppen-Zielwert, Lager, aktuelle Rohstoffe, Zielmenge je Rohstoff,
  herauszuschaffende Einzel- und Gesamtmengen, Haendlerdaten, Kapazitaet,
  theoretische Umlaeufe, Senderouten, Umlaufzeit, theoretische Gesamtdauer
  und Status angezeigt.
- Gruppendetails werden erst beim ersten Aufklappen gerendert und danach
  wiederverwendet; die Gruppenuebersicht und das einklappbare Verhalten der
  gesamten Leerungsanalyse bleiben erhalten.
- Vorhandene Senderouten pro Absender werden vollstaendig erfasst; bei mehreren
  Routen wird die laengste Umlaufzeit als konservative Grundlage der
  theoretischen Dauer sichtbar gekennzeichnet.
- Plausibilitaetspruefung fuer theoretische Umlaeufe ergaenzt; auffaellige
  Doerfer werden markiert und mit `[DS Helper]` kompakt in der Konsole
  protokolliert.
- Normale Transportplanung, Zielwerte, Transportmengen, Sortierung der
  Transportliste, Laufzeituebersicht, Direktversand und Versandlogik
  unveraendert gelassen.
- Pruefung: statische Suche auf alte 25-Prozent-Analysepfade,
  Weltkonfigurationsabruf und Fetch ohne Treffer; neue Detailspalten,
  Lazy-Rendering, Senderoutenliste, konservative Dauergrundlage,
  Plausibilitaetswarnung und Haendler-/Routen-Fehlertexte statisch
  bestaetigt; `git diff --check` ohne Whitespace-Fehler, nur
  LF/CRLF-Hinweis; `node --check praege-vorbereitung.js` versucht, aber
  `node` ist auf diesem System nicht im PATH verfuegbar.
- Es wurden keine automatisierten Tests ausgefuehrt, die echte Transporte oder
  Spielaktionen ausloesen.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-05 - praege-vorbereitung.js v0.8.12.2

- Version von `praege-vorbereitung.js` auf `0.8.12.2` angehoben.
- Leerungsanalyse von pauschalem 25-Prozent-Ziel auf die vorhandenen
  Zielwerte der jeweiligen Distanzgruppe umgestellt; die separate
  Analysekonstante wurde entfernt.
- Pro Dorf werden Holz, Lehm und Eisen einzeln gegen den Gruppen-Zielwert
  geprueft; Gruppe 1 bleibt bei 90 Prozent, Gruppe 8 bei 25 Prozent.
- Sichtbare Analysebezeichnung auf `Leerungsanalyse nach Gruppen-Zielwerten`
  geaendert; Gesamtuebersicht zeigt nun `ueber Gruppen-Ziel` statt
  `ueber 25 %`.
- Gruppen- und Dorfdetails zeigen den jeweils verwendeten Gruppen-Zielwert;
  Status fuer bereits passende Doerfer lautet nun `Bereits auf oder unter
  Gruppen-Zielwert`.
- Normale Transportplanung, Zielwerte, Transportmengen, Sortierung,
  Laufzeituebersicht, Direktversand und Versandlogik unveraendert gelassen.
- Pruefung: statische Suche auf alte pauschale 25-Prozent-Analysepfade ohne
  Treffer; neue Bezeichnung, Gruppen-Zielwert-Beschreibung,
  `ueber Gruppen-Ziel`, Dorf-Gruppenziel und gruppenspezifische
  Zielwertberechnung statisch bestaetigt; `git diff --check` ohne
  Whitespace-Fehler, nur LF/CRLF-Hinweis; `node --check
  praege-vorbereitung.js` versucht, aber `node` ist auf diesem System nicht
  im PATH verfuegbar.
- Es wurden keine automatisierten Tests ausgefuehrt, die echte Transporte oder
  Spielaktionen ausloesen.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-05 - praege-vorbereitung.js v0.8.12.1

- Version von `praege-vorbereitung.js` auf `0.8.12.1` angehoben.
- Sichtbare Verdrahtung der vorhandenen Leerungsanalyse repariert: Toggle,
  eingeklappter Analysebereich und sicherer Renderpfad werden nun in das
  Hauptfenster unterhalb der Laufzeituebersicht eingefuegt.
- Gruppenuebersicht zeigt alle Distanzgruppen 1 bis 8 mit Gruppennamen,
  Gesamtwerten und vorhandenen Detaildaten als Momentaufnahme.
- Fehler beim Rendern der Leerungsanalyse werden mit `[DS Helper]` in der
  Konsole protokolliert und als kompakter Hinweis in der Analysebox angezeigt.
- Gruppe 1 bleibt bei `targetFill: 0.90`; Transportberechnung,
  Laufzeituebersicht, Direktversand und Transportreihenfolge unveraendert
  gelassen.
- Pruefung: statische Suche auf entfernte Haendler-Erkennungspfade ohne
  Treffer; `git diff --check` ohne Whitespace-Fehler, nur LF/CRLF-Hinweis;
  `node --check praege-vorbereitung.js` versucht, aber `node` ist auf diesem
  System nicht im PATH verfuegbar.
- Es wurden keine automatisierten Tests ausgefuehrt, die echte Transporte oder
  Spielaktionen ausloesen.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-05 - praege-vorbereitung.js v0.8.12

- Version von `praege-vorbereitung.js` auf `0.8.12` angehoben.
- Theoretische Leerungsanalyse auf 25 Prozent als separate Momentaufnahme
  ergaenzt, ohne normale Transportplanung oder Zielwerte zu veraendern.
- Alle Distanzgruppen 1 bis 8 werden mit Gruppen- und Dorfdetails betrachtet:
  herauszuschaffende Rohstoffe, freie Haendlerkapazitaet, theoretische Umlaeufe
  und vorhandene Senderroute mit geschaetzter Dauer, falls verfuegbar.
- Analysebox ist standardmaessig eingeklappt und steht getrennt unter der
  bestehenden Laufzeituebersicht.
- Gruppe 1 bleibt bei `targetFill: 0.90`; Transportmengen, Zielwerte,
  Laufzeituebersicht, Direktversand und Transportreihenfolge unveraendert
  gelassen.
- Pruefung: `node --check praege-vorbereitung.js` versucht, aber `node` ist
  auf diesem System nicht im PATH verfuegbar; `git diff --check` ohne
  Whitespace-Fehler, nur LF/CRLF-Hinweis. Statisch bestaetigt: keine
  Weltkonfiguration, keine neuen Timer/Intervalle und keine Aenderung der
  bestehenden Distanzgruppen-Zielwerte. Es wurde kein echter Transport als
  automatisierter Test ausgeloest.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-05 - praege-vorbereitung.js v0.8.11

- Version von `praege-vorbereitung.js` auf `0.8.11` angehoben.
- Kompakte Laufzeituebersicht fuer aktuell offene Transporte ergaenzt: Anzahl,
  kuerzester, laengster und durchschnittlicher Hinweg sowie Umlauf.
- Absendergruppen 6, 7 und 8 zeigen jeweils Anzahl offener Transporte und den
  laengsten Umlauf aus der Gruppe.
- Statistik wird initial gerendert und nach erfolgreich entferntem Transport
  ueber den bestehenden Listen-Zaehler aktualisiert; bei Versandfehlern bleibt
  sie unveraendert.
- Gruppe 1 bleibt bei `targetFill: 0.90`; Transportmengen, Zielwerte,
  Distanzgruppen, Sortierung, Direktversand und Entfernen gesendeter Zeilen
  unveraendert gelassen.
- Pruefung: `node --check praege-vorbereitung.js` versucht, aber `node` ist
  auf diesem System nicht im PATH verfuegbar; `git diff --check` ohne
  Whitespace-Fehler, nur LF/CRLF-Hinweis. Statisch bestaetigt: keine
  neue Weltkonfiguration und kein neuer Statistik-Timer; es wurde kein
  echter Transport als automatisierter Test ausgeloest.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-05 - praege-vorbereitung.js v0.8.10

- Version von `praege-vorbereitung.js` auf `0.8.10` angehoben.
- Fuer jeden berechneten Transport werden Hinweg, Rueckweg und Umlaufzeit aus
  der festen Haendlerlaufzeit `150` Sekunden pro Feld berechnet und am
  Transportobjekt als `merchantTiming` bereitgestellt.
- Transportliste um eine kompakte Laufzeitspalte mit Hinweg und Umlaufzeit
  ergaenzt; die Kopierfunktion nimmt die Laufzeitdaten ohne Umbau als Teil des
  bestehenden JSON-Exports auf.
- Gruppe 1 bleibt bei `targetFill: 0.90`; Transportmengen, Zielwerte,
  Distanzgruppen, Sortierung, Direktversand und Entfernen gesendeter Zeilen
  unveraendert gelassen.
- Pruefung: `node --check praege-vorbereitung.js` versucht, aber `node` ist
  auf diesem System nicht im PATH verfuegbar; `git diff --check` ohne
  Whitespace-Fehler, nur LF/CRLF-Hinweis. Statische Suche bestaetigt,
  dass keine automatische Weltkonfiguration wieder eingefuehrt wurde. Die
  Kontrollbeispiele ergeben gerundet `52:44` und `2:55:04` fuer den
  Hinweg. Es wurde kein echter Transport als automatisierter Test
  ausgeloest.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-05 - praege-vorbereitung.js v0.8.9

- Version von `praege-vorbereitung.js` auf `0.8.9` angehoben.
- Haendlerlaufzeit wird vorerst als feste Konstante mit `150` Sekunden pro
  Feld fuer den Hinweg und intern `300` Sekunden pro Feld fuer Hin- und
  Rueckweg bereitgestellt.
- Automatische Erkennung ueber `game_data` und die Weltkonfiguration
  `/interface.php?func=get_config` entfernt, damit keine unnoetige Anfrage und
  keine Diagnose zur nicht eindeutig erkannten Haendlergeschwindigkeit mehr
  erfolgt.
- Gruppe 1 bleibt bei `targetFill: 0.90`; Transportberechnung,
  Distanzgruppen, Sortierung, Transportliste, Direktversand und Batchlogik
  unveraendert gelassen.
- Pruefung: `node --check praege-vorbereitung.js` versucht, aber `node` ist
  auf diesem System nicht im PATH verfuegbar; `git diff --check` ohne
  Whitespace-Fehler, nur LF/CRLF-Hinweis. Die statische Suche nach
  entfernten Weltkonfigurations-/Fehlerpfaden blieb ohne Treffer. Es wurde
  kein echter Transport als automatisierter Test ausgeloest.
- Offen: Manueller Spieltest als Schnellleistenskript.

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
