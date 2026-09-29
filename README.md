# SSA-Cockpit Ludgerusschule Desktop

Version 0.14.0. Der Windows-Installer (NSIS) entsteht über den GitHub-Actions-Workflow `Windows Installer`.

Die Anwendung speichert Falldaten und Anhänge lokal in einem verschlüsselten Datentresor. Dateien können bestehenden Chronikeinträgen nachträglich zugeordnet werden. Verlaufsberichte lassen sich als DOCX herunterladen oder als PDF drucken. Lokale Handlungsvorschläge und die Textüberarbeitung sind regelbasiert und werden nur nach einer ausdrücklichen Bestätigung übernommen. Es wird kein externes KI-Modell verwendet. Sprachmemos und OCR sind nicht Bestandteil dieser Version.

Die lokale Migrationsdatei mit personenbezogenen Schuldaten ist nicht Bestandteil dieses Repositorys; sie bleibt auf dem Dienstgerät. Vor einer Installation bitte im Cockpit eine Gesamtsicherung erstellen.

Unter „Gesprächsbogen drucken“ stehen vier fachlich unterschiedliche DIN-A4-Varianten nach der bereitgestellten Druckvorlage zur Auswahl. Der unveränderte Originalbogen lässt sich dort ebenfalls öffnen. Kurztitel, Informationsquelle und Gesprächsanlass bieten optionale Schnellauswahlen bei freier Eingabe. Projekt- und Fachkraftvorschläge sind lokale, fallabhängige Optionen; nur bestätigte Vorschläge werden Aufgaben.


## Aktueller Arbeitsablauf

Das Handbuch steht in `HANDBUCH-0.14.0.md` und im Programm unter „Handbuch“. Schnellvorlagen, Aufgabenfilter, Dokumentprüfung und WebUntis-Importprüfung sind miteinander verknüpft. Dokumente können direkt aus Chronikkacheln geöffnet werden. Sprachmemo und OCR sind nicht Bestandteil dieser Version.


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

## Neu in 0.13.0

- Gesprächsformular: Pflicht sind nur Datum, Art, Kind und Inhalt. Der Titel ist freiwillig und wird sonst aus der ersten Zeile erzeugt. Alles Weitere liegt unter „Mehr erfassen“. Vorlagen setzen Art und Titel und zeigen Leitfragen nur als Platzhalter.
- Speichern: Der Stand wird sofort in den Tresor geschrieben, der Dialog schließt, nur die sichtbare Seite und die Akte werden neu gezeichnet. Andere Seiten aktualisieren sich beim Öffnen. Die Zwischensicherung läuft danach im Hintergrund.
- Schutzhinweise: im Formular nur eine kurze Zeile mit „Warum wird das angezeigt?“. Ein deutlicher Hinweis erscheint nur, wenn ein Schutzstichwort im Text steht. „Schutzfrage prüfen“ gibt es an jedem Eintrag. Verneinungen („keine Angst mehr“) werden wieder erkannt.
- Chronikkarten: Originaleintrag, offene Schritte und Zusagen sind sichtbar; Fachverfahren, Verschieben und Löschen liegen unter „Weitere Aktionen“.
- Gruppengespräch: Datum, Art, Kinder (mit Suche), kurze Notiz, Ergebnis. Verantwortlich, Dauer, Wiedervorlage und Sichtbarkeit unter „Weitere Angaben“. Doppelte Auswahlwerte entfernt. Gruppen, Sozialtrainings und Klasseneinträge legen keine neuen Fallakten mehr an.
- Auftragsklärung: Zeile oben in der Akte („Auftrag klären“ / „Auftrag aktualisieren“), Anzeige in der Fallarbeit. Fallarbeit zählt Kontakte aus Chronik und Kurzkontakten und filtert „Seit 3 Wochen kein Kontakt“.
- Kurzkontakt: Namenssuche, zuletzt gesehene Kinder, „Anonym“ nur bewusst angekreuzt (mit Jahrgang), „Speichern und nächster“, Strg+K.
- Zusagen ohne Termin werden nicht mehr gelb markiert. Trainingsraum-Hinweis an die Klassenleitung wird erst nach Rückfrage geöffnet („Weiß das Kind davon?“).
- Übersicht: Akte mit fünf Hauptknöpfen und „Mehr …“, eine Filterleiste bei Aufgaben (Arbeitskorb und doppelte Aufgabenansicht entfernt), Heute ohne abgeschnittene Titel, scrollbare Seitenleiste. Statistik blendet Diagramme ohne auswertbare Angaben aus, Beschriftungen werden umbrochen, Kennzahlen beziehen sich auf die Chronik.
- Wiederherstellung fragt das Kennwort im Programm ab. Erstimport: „Alle als Neuaufnahme übernehmen“ für Namen ohne passende Akte.
- Sicherungsordner: gestaffelte Aufbewahrung (10 neueste, 3 „Vor-…“-Sicherungen, eine pro Woche für 8 Wochen, eine pro Monat für 12 Monate).

## Neu in 0.14.0

- **Schnellnotiz** oben auf „Heute“: kurz notieren, mit `@` ein oder mehrere Kinder zuordnen (Auswahlliste mit Maus oder Pfeiltasten, Enter, Esc). Eine Notiz mit mehreren Kindern ist ein einziger Chronikeintrag („Kurznotiz“ mit Datum und Uhrzeit), der in jeder betroffenen Akte erscheint. Unbekannter Name: „Meintest du …?“ und „Neue Akte anlegen“ mit nur Name und Klasse; bei ähnlichen Namen ist eine ausdrückliche Bestätigung nötig. Notizen ohne `@` stehen unter „Noch nicht zugeordnet“ und lassen sich später zuordnen. Speichern mit Knopf oder Strg+Enter. Diktat über den lokalen Dienst; läuft er nicht, erscheint nur ein kurzer Hinweis.
- **Gespräch vorbereiten** in der Akte: Auftrag, letzte drei Chronikeinträge, offene Zusagen (überfällige rot), laufende Maßnahmen und Fachverfahren sowie ein Feld „Was will ich klären?“. Jeder Punkt springt zum Originaleintrag und hebt ihn hervor. Leere Abschnitte zeigen „Noch nichts eingetragen“. Drucken als einseitige Übersicht; „Gespräch jetzt dokumentieren“ übernimmt den Freitext. Die Auftragsklärung erscheint jetzt auch als Eintrag in der Chronik.
- **Zusage aus der Chronik**: „＋ Zusage daraus“ an jedem Eintrag. Zusage und Eintrag verweisen aufeinander. Felder: Was, Wer hat zugesagt (Ich, Sabine, Schüler:in, Eltern, Lehrkraft, Andere), Wem gegenüber, Bis wann (optional). Status offen · läuft · erledigt; „erledigt“ erzeugt automatisch den Chronikeintrag „Zusage erledigt: …“ (einmalig). „Heute“ zeigt fällige und überfällige Zusagen, „Aufgaben und Zusagen“ die vollständige Liste nach Status, filterbar nach Kind.
- **Kontexthilfe**: „?“ in jedem Bereichskopf und an erklärungsbedürftigen Feldern (Auftrag, Fachverfahren, Maßnahmen, Zusagen, Frühindikatoren, Ampel, Schutzfrage, Kurzkontakt, Gruppengespräch). Die Hilfe klappt direkt darunter auf: Was ist das? Warum eintragen? Beispiel. Alle Texte stehen zentral in `src/erweiterungen.js` (`HILFE_TEXTE`).
- Abnahme (automatisch geprüft, `npm test` und `npm run test:ui`): Schnellnotiz mit einem, mehreren und ohne `@`; Tippfehler erzeugt ohne Rückfrage keine neue Akte; Diktat ohne Dienst ohne Fehler; alle Links der Gesprächsvorbereitung treffen den richtigen Eintrag; Zusage beidseitig verknüpft, „erledigt“ erzeugt genau einen Eintrag; Daten der Vorversion laden unverändert; kein waagerechtes Scrollen in den neuen Ansichten (geprüft bei 1440 und 820 Pixel Breite).
