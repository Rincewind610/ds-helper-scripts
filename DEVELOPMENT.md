# DS Helper – Entwicklungsrichtlinien

Diese Datei beschreibt die grundlegenden Regeln für die Entwicklung von **DS Helper**.

---

# Grundsätze

- Ein Skript erfüllt genau **eine Aufgabe**.
- Neue Funktionen werden nicht ungefragt ergänzt.
- Funktionierender Code wird nur geändert, wenn es dafür einen konkreten Grund gibt.
- Änderungen werden zuerst im Spiel getestet und erst danach veröffentlicht.

---

# Entwicklung

Jedes neue Skript durchläuft folgenden Ablauf:

1. Entwicklung im Chat.
2. Test als Schnellleistenskript.
3. Übernahme in das GitHub-Repository.
4. Commit.
5. Test über `@main`.
6. GitHub Release erstellen.
7. Dokumentation bei Bedarf aktualisieren.

---

# Header

Jedes Skript verwendet folgenden Header:

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

---

# Versionierung

Jedes Skript besitzt seine eigene Versionshistorie.

Beispiele:

- Freie BHP → v1.1.0
- Forschung Übersicht mit BHP → v1.0.0
- Flaggen-Vorschläge → v1.0.0

---

# Projektstil

- Dateinamen sind deutsch.
- Kommentare und Dokumentation sind deutsch.
- Git-Commit-Nachrichten sind englisch.
- Keine Umlaute in Dateinamen.
- Jede Änderung wird vor einem Release getestet.

---

# Ziel

DS Helper soll eine übersichtliche, stabile und leicht erweiterbare Sammlung von Schnellleistenskripten für **Die Stämme** sein.
