# SSA-Cockpit Ludgerusschule Desktop

Version 0.12.3. Der Windows-Installer (NSIS) entsteht über den GitHub-Actions-Workflow `Windows Installer`.

Die Anwendung speichert Falldaten und Anhänge lokal in einem verschlüsselten Datentresor. Dateien können bestehenden Chronikeinträgen nachträglich zugeordnet werden. Verlaufsberichte lassen sich als DOCX herunterladen oder als PDF drucken. Lokale Handlungsvorschläge und die Textüberarbeitung sind regelbasiert und werden nur nach einer ausdrücklichen Bestätigung übernommen. Es wird kein externes KI-Modell verwendet. Sprachmemos und OCR sind nicht Bestandteil dieser Version.

Die lokale Migrationsdatei mit personenbezogenen Schuldaten ist nicht Bestandteil dieses Repositorys; sie bleibt auf dem Dienstgerät. Vor einer Installation bitte im Cockpit eine Gesamtsicherung erstellen.

Unter „Gesprächsbogen drucken“ stehen vier fachlich unterschiedliche DIN-A4-Varianten nach der bereitgestellten Druckvorlage zur Auswahl. Der unveränderte Originalbogen lässt sich dort ebenfalls öffnen. Kurztitel, Informationsquelle und Gesprächsanlass bieten optionale Schnellauswahlen bei freier Eingabe. Projekt- und Fachkraftvorschläge sind lokale, fallabhängige Optionen; nur bestätigte Vorschläge werden Aufgaben.


## Aktueller Arbeitsablauf (0.12.0)

Arbeitskorb, Schnellvorlagen, Aufgabenfilter, Dokumentprüfung, fachliche Qualitätsprüfung und WebUntis-Importprüfung sind miteinander verknüpft. Dokumente können direkt aus Chronikkacheln geöffnet werden. Sprachmemo, Diktat und OCR sind nicht Bestandteil dieser Version.


## Neu in 0.12.2: Dialoge und Speichern

- Alle Dialoge erscheinen mittig mit Abstand zu den Rändern. Kopf und Fuß mit „Speichern“ und „Abbrechen“ bleiben stehen, nur der Inhalt scrollt. Das gilt auch auf kleinen Bildschirmen.
- „Vollbild“ gilt nur für den geöffneten Dialog und wird beim Schließen zurückgesetzt.
- Dialoge schließen nach dem Speichern sofort. Das Speichern in den Datentresor läuft im Hintergrund. Unten links steht „Speichert …“, „Alles gespeichert“ oder „Nicht gespeichert“.
- Kann nicht gespeichert werden, erscheint oben eine rote Leiste mit „Erneut speichern“. Die Eingaben bleiben im Programm. Die automatische Sperre wartet, bis gespeichert wurde.
- Die Desktop-Befehle laufen außerhalb des Fensters. Eine Sicherung mit vielen Dokumenten friert das Programm nicht mehr ein. Automatische Zwischensicherungen höchstens alle 30 Minuten.
- Gruppengespräch mit „Individuelle Hinweise“ lässt sich wieder speichern. Prüffehler werden angezeigt.
- Das Ereignisdatum ist in allen Dialogen mit heute vorbelegt.
- Nach „Schutzfrage prüfen“ verschwindet nur der offene Merker auf „Heute“. Chronikeintrag und Checkliste bleiben erhalten, es entsteht keine Aufgabe.

## Neu in 0.12.3

- Korrektur: Heute dokumentierte Gespräche und Kurzkontakte erscheinen wieder sofort in der Chronik, im Abschnitt „Heute dokumentiert“ direkt unter der Heute-Linie. In 0.12.2 wurden sie erst am Folgetag angezeigt.
