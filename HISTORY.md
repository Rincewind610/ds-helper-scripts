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

### 2026-08-30 - ds-report-overview.user.js v0.1.17

- Version von ds-report-overview.user.js auf 0.1.17 angehoben.
- Linkziel fuer den Verteidiger-Dorfnamen bei dunkelrot markierten eigenen Verteidiger-Berichten mit zu wenig Deff auf den Versammlungsplatz im Modus Massenunterstuetzung umgestellt (`screen=place&mode=call&target=<DORFID>`).
- Dorf-ID wird fuer `village` und `target` aus dem gelesenen Verteidiger-Dorflink verwendet; Links oeffnen weiterhin in einem neuen Tab.
- Angreifer-Links, nicht markierte Berichte, Scharf-Markierung, Fake-Erkennung, automatisches Anhaken, Parser-, AJAX- und Rate-Limiting-Logik bleiben unveraendert.
- Pruefung: node --check steht auf diesem System nicht im PATH; git diff --check meldet beim Userscript wie zuvor CRLF-Zeilenenden als trailing whitespace.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-28 - ds-report-overview.user.js v0.1.16

- Version von ds-report-overview.user.js auf 0.1.16 angehoben.
- Sondermarkierung fuer Scharfe von Rincewind610 ergaenzt: hellgruen, wenn
  alle gelesenen Angreifertruppen laut Verluste-Zeile gefallen sind, sonst
  dunkelgruen.
- Angreifer-Verluste werden aus der Angreifer-Truppentabelle ueber die Zeile
  Verluste gelesen und gegen die Zeile Anzahl verglichen; Einheiten mit Anzahl
  0 werden ignoriert.
- Scharfe anderer Spieler bleiben orange; echte Fakes, Verteidiger-Warnfarben,
  Parserstruktur, AJAX-, Rate-Limiting- und Linklogik bleiben unveraendert,
  abgesehen vom notwendigen Lesen der Angreifer-Verluste.
- Pruefung: PowerShell-Sanity-Check erfolgreich fuer Rincewind610-Scharf mit
  vollstaendigen Verlusten, Rincewind610-Scharf mit Ueberlebenden, fremden
  Scharf, Fake und Adelsgeschlecht-Ablehnung. node --check versucht, aber
  node ist auf diesem System nicht im PATH verfuegbar. git diff --check
  meldet beim Userscript CRLF-Zeilenenden als trailing whitespace.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-28 - ds-report-overview.user.js v0.1.15

- Version von ds-report-overview.user.js auf 0.1.15 angehoben.
- Scharfe-Erkennung ergaenzt und auf die Angreiferseite begrenzt: kein echter
  Fake, kein Adelsgeschlecht, maximal 1000 gelesene Angreifer-Einheiten und
  mindestens eine echte Off-Truppe.
- Echte Off-Truppen fuer Scharfe sind Axt, leichte Kavallerie, berittener
  Bogenschuetze und Ramme; Katapulte zaehlen nur zur Gesamtzahl und reichen
  allein nicht aus.
- Scharfe werden am Angreifer-Block orange markiert und erhalten ein sichtbares
  Scharf-Label. Rosa und rote/dunkelrote Verteidiger-Warnungen bleiben
  unveraendert.
- DEBUG-Ausgabe fuer die Scharf-Pruefung mit total, hasOffTroops, hasNoble,
  isFake und isSharp ergaenzt.
- Parser-, AJAX-, Rate-Limiting- und Linklogik unveraendert gelassen.
- Pruefung: node --check versucht, aber node ist auf diesem System nicht im
  PATH verfuegbar. Beispielangriff 600 Aexte, 330 leichte Kavallerie,
  42 Rammen und 28 Katapulte per PowerShell-Sanity-Check erfolgreich mit
  total=1000 und isSharp=true geprueft. git diff --check meldet beim
  Userscript CRLF-Zeilenenden als trailing whitespace.
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
