# SSA-Cockpit 0.14.0

## Alltag

Die Seite **Heute** zeigt offene Schutzfragen und drei Arbeitsblöcke: Überfälliges, heute fällige Vorgänge und offene Zusagen. Oben stehen die drei schnellen Aktionen **Kurzkontakt** (auch mit Strg+K), **Gespräch** und **Zusage**.

## Schnellnotiz

Oben auf **Heute** steht ein Feld für kurze Notizen. Tippe `@` und die ersten Buchstaben eines Namens; eine Liste schlägt passende Kinder vor (mit Pfeiltasten und Enter oder mit der Maus auswählen, Esc schließt). Mehrere `@` in einer Notiz sind möglich – die Notiz erscheint dann einmal gemeinsam in jeder betroffenen Chronik. Findet das Programm keinen passenden Namen, fragt es „Meintest du …?“ oder bietet an, eine neue Akte nur mit Name und Klasse anzulegen. Notizen ohne `@` landen unter **Noch nicht zugeordnet** und können später zugeordnet werden. Speichern mit dem Knopf oder mit Strg+Enter.

## Gespräch vorbereiten

In der Akte öffnet **Gespräch vorbereiten** eine Übersicht: Auftrag, die letzten drei Einträge, offene Zusagen, laufende Maßnahmen und Fachverfahren. Ein Klick auf einen Punkt zeigt den Originaleintrag in der Chronik. Im Feld „Was will ich in diesem Gespräch klären?“ notierst du deine Fragen; **Gespräch jetzt dokumentieren** übernimmt sie ins Gesprächsformular. **Drucken** liefert eine Seite zum Mitnehmen.

## Zusagen

An jedem Chronikeintrag gibt es **＋ Zusage daraus**. Die Zusage ist dann mit dem Eintrag verknüpft. Unter **Aufgaben und Zusagen** stehen alle Zusagen nach Status (offen, läuft, erledigt), filterbar nach Kind. Wird eine Zusage auf „erledigt“ gesetzt, entsteht in der Chronik automatisch der Eintrag „Zusage erledigt: …“.

## Hilfe

Das **?** in jedem Bereich und an einigen Feldern klappt eine kurze Erklärung auf: Was ist das? Warum eintragen? Beispiel. Ein zweiter Klick schließt sie wieder.

## Gespräch eintragen

Pflicht sind nur **Datum**, **Art**, **Kind** und **Inhalt**. Der Titel ist freiwillig; ohne Titel wird die erste Zeile des Inhalts verwendet. Vereinbarungen, Sichtweisen, Dauer, Fachverfahren und Dokumente stehen unter **Mehr erfassen**. Vorlagen setzen Art und Titel und zeigen Leitfragen als grauen Platzhalter.

Über dem Formular steht nur eine kurze Zeile zum Schutzhinweis. Taucht im Text ein Schutzstichwort auf (etwa „nicht mehr leben“ oder „geschlagen“), erscheint ein deutlicher Hinweis. Am gespeicherten Eintrag kannst du jederzeit **Schutzfrage prüfen** wählen.

## Auftrag klären

Oben in der Akte steht der geklärte Auftrag: wer ihn gegeben hat, was das Kind selbst möchte und was vereinbart ist. Fehlt er nach dem ersten Gespräch, erscheint dort **Auftrag klären**. Frühere Klärungen bleiben erhalten.

![Screenshot Platzhalter: Seite Heute](screenshots/heute.png)

## Chronik und Akte

Die Chronik bleibt vollständig erhalten. Alte Kontakte, Ereignisse, Aufgaben, Dokumente, Fehlzeiten und Schuljahreswechsel werden weiter angezeigt. Ein Kurzkontakt wird kompakt gespeichert. Eine Auftragsklärung und Schutzprüfung werden als eigene datierte Informationen abgelegt. Frühere Klassen und Einträge werden beim Schuljahreswechsel nicht verändert.

![Screenshot Platzhalter: Schülerakte mit Chronik](screenshots/akte-chronik.png)

## Aufgaben und Zusagen

Aufgaben und Zusagen liegen gemeinsam in **Aufgaben und Zusagen**. Die Statuswerte bleiben erhalten. Zusagen haben die Kennung `kind: 'zusage'` und können mit einem Klick als eingehalten abgeschlossen werden.

## Vorschläge und Schutzfragen

Nach einem Gespräch werden keine Vorschläge automatisch angezeigt oder gespeichert. Über **Ideen anzeigen** können höchstens zwei konkrete Ideen abgerufen werden. Die Frist bleibt leer, bis du sie selbst einträgst. Zusagen ohne Termin sind in Ordnung und werden nicht gelb markiert. Bei möglichen Schutzthemen erscheint ausschließlich der feste Hinweis:

> Das Programm erkennt keine Gefährdung. Maßgeblich sind deine Einschätzung und das Schutzkonzept der Schule.

## Sicherung

Vor einer Wiederherstellung oder Migration wird eine vollständige verschlüsselte Sicherung verlangt. Im Sicherungsordner bleiben die 10 neuesten Sicherungen, die 3 neuesten „Vor-…“-Sicherungen sowie je eine Sicherung pro Woche (8 Wochen) und pro Monat (12 Monate). Chronik, Aufgaben und Anhänge werden gemeinsam wiederhergestellt. Das Kennwort kann nicht wiederhergestellt werden.

## Diktat

Die Schaltfläche **Diktat** nutzt zuerst den lokalen Transkriptionsdienst unter `127.0.0.1:8173`; die Aufnahme bleibt dann auf dem Rechner. Läuft er nicht, erscheint eine Anleitung. Nur wenn du unter **Daten und Einstellungen → Spracherkennung** die Online-Erkennung ausdrücklich erlaubst, wird ersatzweise die integrierte Erkennung der Windows-Webansicht genutzt. **Diese arbeitet online: Die Aufnahme wird an Microsoft übertragen.** Das gilt in der Regel auch für das Windows-Diktat mit Windows-Taste + H. Vertrauliche Inhalte deshalb tippen oder den lokalen Dienst verwenden.

## Datenschutz

Personenbezogene Daten bleiben im lokalen verschlüsselten Datentresor. Sie gehören nicht in das Repository oder in öffentliche Testdateien. Vor produktiver Nutzung sind Zuständigkeiten, Berechtigungen, Löschfristen und Sicherungsorte schulisch festzulegen.
