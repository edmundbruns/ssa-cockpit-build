# SSA-Cockpit 0.12.0

## Alltag

Die Seite **Heute** zeigt nur drei Arbeitsblöcke: Überfälliges, heute fällige Vorgänge und offene Zusagen. Oben stehen die drei schnellen Aktionen **Kurzkontakt**, **Gespräch** und **Zusage**.

![Screenshot Platzhalter: Seite Heute](screenshots/heute.png)

## Chronik und Akte

Die Chronik bleibt vollständig erhalten. Alte Kontakte, Ereignisse, Aufgaben, Dokumente, Fehlzeiten und Schuljahreswechsel werden weiter angezeigt. Ein Kurzkontakt wird kompakt gespeichert. Eine Auftragsklärung und Schutzprüfung werden als eigene datierte Informationen abgelegt. Frühere Klassen und Einträge werden beim Schuljahreswechsel nicht verändert.

![Screenshot Platzhalter: Schülerakte mit Chronik](screenshots/akte-chronik.png)

## Aufgaben und Zusagen

Aufgaben und Zusagen liegen gemeinsam in **Aufgaben und Zusagen**. Die Statuswerte bleiben erhalten. Zusagen haben die Kennung `kind: 'zusage'` und können mit einem Klick als eingehalten abgeschlossen werden.

## Vorschläge und Schutzfragen

Nach einem Gespräch werden keine Vorschläge automatisch angezeigt oder gespeichert. Über **Ideen anzeigen** können höchstens zwei konkrete Ideen abgerufen werden. Die Frist bleibt leer, bis du sie selbst einträgst. Bei möglichen Schutzthemen erscheint ausschließlich der feste Hinweis:

> Das Programm erkennt keine Gefährdung. Maßgeblich sind deine Einschätzung und das Schutzkonzept der Schule.

## Sicherung

Vor einer Wiederherstellung oder Migration wird eine vollständige verschlüsselte Sicherung verlangt. Chronik, Aufgaben und Anhänge werden gemeinsam wiederhergestellt. Das Kennwort kann nicht wiederhergestellt werden.

## Diktat

Das Diktat nutzt zuerst die lokale Browser-Spracherkennung. Falls sie nicht verfügbar ist, kann der lokale Dienst unter `127.0.0.1:8173` verwendet werden. Audiodaten werden nicht an einen Cloud-Dienst gesendet.

## Datenschutz

Personenbezogene Daten bleiben im lokalen verschlüsselten Datentresor. Sie gehören nicht in das Repository oder in öffentliche Testdateien. Vor produktiver Nutzung sind Zuständigkeiten, Berechtigungen, Löschfristen und Sicherungsorte schulisch festzulegen.
