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

### 2026-09-01 - ds-report-overview.user.js v0.1.29

- Version von ds-report-overview.user.js auf 0.1.29 angehoben.
- Scharf-Erkennung verlangt nun mindestens 100 eindeutig gelesene leichte Kavallerie, bevor die bisherigen Scharf-Kriterien greifen.
- Voll-Markierung fuer mindestens 3000 Aexte oder mindestens 1500 leichte Kavallerie bleibt unveraendert.
- Pruefung: node --check steht auf diesem System nicht im PATH; git diff --check meldet beim Userscript wie zuvor CRLF-Zeilenenden als trailing whitespace.

### 2026-08-31 - ds-report-overview.user.js v0.1.27

- Version von ds-report-overview.user.js auf 0.1.27 angehoben.
- Rote/dunkelrote Verteidiger-Warnungen behandeln eine bereits aktive SD-Gruppe nun als erledigten SD-Schritt und laufen direkt mit `Massen-Unterstuetzung` und danach `Deff senden` weiter.
- Die SD-Erkennung prueft neben klickbaren `SD`-/`[SD]`-Links auch sichtbaren Gruppen-Text; rosa Flex-Ablauf, Fake-Erkennung, Scharf-Markierung, Warn-Erkennung, Parser-, AJAX- und Rate-Limiting-Logik bleiben unveraendert.
- Pruefung: node --check steht auf diesem System nicht im PATH; git diff --check meldet beim Userscript wie zuvor CRLF-Zeilenenden als trailing whitespace.

### 2026-08-30 - ds-report-overview.user.js v0.1.26

- Version von ds-report-overview.user.js auf 0.1.26 angehoben.
- Rote/dunkelrote Verteidiger-Warnungen durchlaufen nach dem SD-Gruppenklick nun zusaetzlich den Tab `Massen-Unterstuetzung` ueber `dshelper_auto_mass_support=1`.
- Erst nach diesem Zwischenschritt wird auf `dshelper_auto_deff=1` gewechselt und `Deff senden` automatisch geklickt; Reloads nach SD- oder Tab-Klick bleiben dadurch im Ablauf.
- Rosa Warnungen behalten den getrennten Flex-Ablauf ohne `Massen-Unterstuetzung`-Tab, `Deff senden` oder `Deff anfordern`; Fake-Erkennung, Scharf-Markierung, Warn-Erkennung, Parser-, AJAX- und Rate-Limiting-Logik bleiben unveraendert.
- Pruefung: node --check steht auf diesem System nicht im PATH; git diff --check meldet beim Userscript wie zuvor CRLF-Zeilenenden als trailing whitespace.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-30 - ds-report-overview.user.js v0.1.25

- Version von ds-report-overview.user.js auf 0.1.25 angehoben.
- Rote/dunkelrote Verteidiger-Warnungen setzen auf dem Massenunterstuetzungs-Link nun `dshelper_auto_sd=1` und klicken auf der Zielseite zuerst den Gruppenlink `SD` bzw. `[SD]`.
- Nach dem SD-Klick wird auf den bestehenden `dshelper_auto_deff=1`-Folgeschritt gewechselt, sodass anschliessend `Deff senden` automatisch geoeffnet wird.
- Rosa Warnungen behalten den getrennten Flex-Ablauf ohne `Deff senden`; Fake-Erkennung, Scharf-Markierung, Warn-Erkennung, Parser-, AJAX- und Rate-Limiting-Logik bleiben unveraendert.
- Pruefung: node --check steht auf diesem System nicht im PATH; git diff --check meldet beim Userscript wie zuvor CRLF-Zeilenenden als trailing whitespace.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-30 - ds-report-overview.user.js v0.1.24

- Version von ds-report-overview.user.js auf 0.1.24 angehoben.
- Flex-Auto-Klick fuer rosa Verteidiger-Warnungen sucht nun gezielt nach sichtbaren `a`-Links und erkennt sowohl `Flex` als auch `[Flex]` durch Trimmen und Entfernen aeusserer eckiger Klammern.
- Der rosa Ablauf klickt weiterhin nur `Flex` und weder `Deff senden` noch `Deff anfordern`; rote/dunkelrote Deff-Warnungen bleiben unveraendert.
- Fake-Erkennung, Scharf-Markierung, rosa/rote Markierung, Parser-, AJAX- und Rate-Limiting-Logik bleiben unveraendert.
- Pruefung: node --check steht auf diesem System nicht im PATH; git diff --check meldet beim Userscript wie zuvor CRLF-Zeilenenden als trailing whitespace.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-30 - ds-report-overview.user.js v0.1.23

- Version von ds-report-overview.user.js auf 0.1.23 angehoben.
- Rosa Verteidiger-Warnungen mit 0 Spaehern klicken auf der Massenunterstuetzungsseite nur noch automatisch `Flex` an.
- Der rosa Zielseitenablauf klickt weder `Deff senden` noch `Deff anfordern` und entfernt den Flex-Marker vor dem Klick, damit nach einem moeglichen Reload nichts Weiteres automatisch laeuft.
- Rote/dunkelrote Deff-Warnungen behalten Massenunterstuetzung, `dshelper_auto_deff=1` und Auto-Oeffnen von `Deff senden`; Fake-Erkennung, Scharf-Markierung, Parser-, AJAX- und Rate-Limiting-Logik bleiben unveraendert.
- Pruefung: node --check steht auf diesem System nicht im PATH; git diff --check meldet beim Userscript wie zuvor CRLF-Zeilenenden als trailing whitespace.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-30 - ds-report-overview.user.js v0.1.22

- Version von ds-report-overview.user.js auf 0.1.22 angehoben.
- Rosa Verteidiger-Warnungen mit 0 Spaehern erhalten nun den Marker `dshelper_auto_flex=1` auf dem Massenunterstuetzungs-Link, aber weiterhin keinen `dshelper_auto_deff=1`-Marker.
- Auf `screen=place&mode=call` waehlt das Skript bei `dshelper_auto_flex=1` automatisch `Flex` und klickt danach `Deff anfordern`; ein `dshelper_auto_flex_ready=1`-Marker haelt den Ablauf nach einem moeglichen Reload fest.
- Rote/dunkelrote Deff-Warnungen behalten Massenunterstuetzung, `dshelper_auto_deff=1` und Auto-Oeffnen von `Deff senden`; Fake-Erkennung, Scharf-Markierung, Parser-, AJAX- und Rate-Limiting-Logik bleiben unveraendert.
- Pruefung: node --check steht auf diesem System nicht im PATH; git diff --check meldet beim Userscript wie zuvor CRLF-Zeilenenden als trailing whitespace.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-30 - ds-report-overview.user.js v0.1.21

- Version von ds-report-overview.user.js auf 0.1.21 angehoben.
- Rosa Verteidiger-Warnungen mit 0 Spaehern fuehren wieder zur Massenunterstuetzung, jedoch ohne `dshelper_auto_deff=1`.
- Der automatische `Deff senden`-Klick bleibt dadurch rosa Warnungen verwehrt und ist weiterhin nur fuer rote/dunkelrote Deff-Warnungen mit Marker aktiv.
- Rote/dunkelrote Deff-Warnungen behalten Massenunterstuetzung, internen Marker und Auto-Oeffnen; Fake-Erkennung, Scharf-Markierung, Parser-, AJAX- und Rate-Limiting-Logik bleiben unveraendert.
- Pruefung: node --check steht auf diesem System nicht im PATH; git diff --check meldet beim Userscript wie zuvor CRLF-Zeilenenden als trailing whitespace.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-30 - ds-report-overview.user.js v0.1.20

- Version von ds-report-overview.user.js auf 0.1.20 angehoben.
- Linkziel zur Massenunterstuetzung mit `dshelper_auto_deff=1` wieder auf rote/dunkelrote Verteidiger-Berichte mit zu wenig Deff begrenzt.
- Rosa Verteidiger-Warnungen mit 0 Spaehern verwenden wieder das normale eigene Dorf-Linkverhalten und loesen dadurch keinen automatischen `Deff senden`-Klick aus.
- Auto-Klick-Logik fuer rote/dunkelrote Deff-Warnungen bleibt erhalten; Fake-Erkennung, Scharf-Markierung, Parser-, AJAX- und Rate-Limiting-Logik bleiben unveraendert.
- Pruefung: node --check steht auf diesem System nicht im PATH; git diff --check meldet beim Userscript wie zuvor CRLF-Zeilenenden als trailing whitespace.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-30 - ds-report-overview.user.js v0.1.19

- Version von ds-report-overview.user.js auf 0.1.19 angehoben.
- Warn-Links zur Massenunterstuetzung erhalten den internen Marker `dshelper_auto_deff=1`.
- Userscript darf nun auch auf `screen=place` laufen und klickt auf `screen=place&mode=call` ausschliesslich mit diesem Marker einmalig auf ein sichtbares Element mit dem Text `Deff senden`.
- Auto-Klick versucht den Button/Link kurz mehrfach zu finden; ohne Marker oder auf anderen Seiten passiert kein automatischer Klick.
- Bestehende Berichte-Auswertung, Scharf-Markierung, Fake-Erkennung, Verteidiger-Warnungen, AJAX- und Rate-Limiting-Logik bleiben unveraendert.
- Pruefung: node --check steht auf diesem System nicht im PATH; git diff --check meldet beim Userscript wie zuvor CRLF-Zeilenenden als trailing whitespace.
- Offen: Manueller Spieltest als Schnellleistenskript.

### 2026-08-30 - ds-report-overview.user.js v0.1.18

- Version von ds-report-overview.user.js auf 0.1.18 angehoben.
- Linkziel fuer den Verteidiger-Dorfnamen nun auch bei rosa markierten eigenen Verteidiger-Berichten mit 0 Spaehern auf den Versammlungsplatz im Modus Massenunterstuetzung umgestellt.
- Bestehende Linkaenderung fuer rote/dunkelrote Deff-Warnungen bleibt erhalten; Angreifer-Links, Scharf-Markierung, Fake-Erkennung, automatisches Anhaken, Parser-, AJAX- und Rate-Limiting-Logik bleiben unveraendert.
- Pruefung: node --check steht auf diesem System nicht im PATH; git diff --check meldet beim Userscript wie zuvor CRLF-Zeilenenden als trailing whitespace.
- Offen: Manueller Spieltest als Schnellleistenskript.

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
