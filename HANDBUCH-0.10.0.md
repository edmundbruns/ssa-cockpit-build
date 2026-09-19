# SSA-Cockpit 0.10.0

## Öffnen und aktualisieren

Die neue Setup-EXE aktualisiert dieselbe Desktopanwendung. Produktname und Anwendungskennung bleiben unverändert. Starte das Cockpit anschließend über die vorhandene Desktop-Verknüpfung. Die Daten liegen weiterhin im bisherigen verschlüsselten Datentresor.

Beim ersten Entsperren eines älteren Datenbestands erstellt die Anwendung vor der Anpassung eine verschlüsselte Gesamtsicherung im Sicherungsordner des Datentresors. Kann diese Sicherung nicht geschrieben werden, wird die Anpassung nicht durchgeführt. Dokumente sind in der Sicherung enthalten.

## Eine Akte pro Kind

Unter **Schüler:innen** öffnest du die dauerhafte Akte eines Kindes. Die zwei Einstiege sind:

- **Ereignis / Gespräch eintragen**: Datum, Inhalt und dokumentierende Person. Eintragsart, Titel und Beteiligte ergänzen.
- **Information hinzufügen**: Freitext, Mitteilungsdatum und optional die Quelle. Beispielsweise Ergotherapie, Familieninformation oder ein mitgeteilter Befund. Eine Aufgabe oder Ampeländerung ist nicht erforderlich.

Das Kind ist vorausgewählt. Weitere Felder lassen sich bei Bedarf aufklappen: Aussagen des Kindes, Berichte anderer Personen, eigene Beobachtung, fachliche Einschätzung, Vereinbarungen, Ziele, Ergebnis, Dauer und Dokumente. Freitext und die vorhandene Diktierfunktion bleiben verfügbar.

## Chronologie

Frühere Ereignisse stehen oben, jüngere folgen darunter. Beim Öffnen steht der Bereich **Heute** im Blick. Danach folgen zukünftige Termine. Offene Aufgaben ohne Datum stehen im eigenen Abschnitt derselben Ansicht. Ein Schuljahresfilter blendet ältere Angaben lediglich aus. Offene Aufgaben bleiben unabhängig vom Filter erreichbar.

Jede Karte zeigt eine Vorschau. Aufklappen zeigt den vollständigen Inhalt. Ereignisdatum und Erfassungszeitpunkt werden getrennt gespeichert. Alte Einträge behalten ihre damalige Klasse. Wo die damalige Klasse oder ein Datum nicht zuverlässig bekannt ist, wird dies ausdrücklich angezeigt.

Geplante Termine sind gestrichelt und mit „Durchführung nicht bestätigt“ gekennzeichnet. Ein OP-Termin wird durch Zeitablauf nicht zur bestätigten Operation. Die Durchführung kann durch eine Rückmeldung dokumentiert und der geplante Ursprung anschließend entsprechend bearbeitet werden.

Wichtige Informationen lassen sich anheften. Die angeheftete Anzeige verweist auf denselben Eintrag. Bearbeitungen gemeinsamer Inhalte und Anheftungen besitzen eine Historie.

## Gruppen und Sozialtraining

Unter **Zuordnung prüfen** werden nur die tatsächlich teilnehmenden Kinder markiert. Beim Einstieg aus einer Klasse sind deren aktive Kinder vorausgewählt; abwesende Kinder müssen abgewählt werden. Ein gemeinsamer Inhalt wird einmal gespeichert und in allen ausgewählten Akten angezeigt.

Individuelle Ergänzungen gelten nur für das beim Öffnen ausgewählte Kind. Beginne dafür in seiner Akte. Beim Bearbeiten eines gemeinsamen Eintrags bleibt die ursprüngliche Teilnahme unverändert. Eine nachträgliche Korrektur einer falsch erfassten Teilnahme ist in dieser Version noch nicht im neuen Editor möglich.

Die Statistik zählt einen gemeinsamen Vorgang einmal. Ein Training mit 20 Kindern ergibt 20 Teilnahmen. 45 Minuten mit einer durchführenden Person ergeben 45 Minuten Arbeitszeit, mit zwei angegebenen Personen 90 Personenminuten. Durchführende werden mit Semikolon getrennt erfasst.

## Nächste Schritte, Rückmeldungen und Ampel

Am Eintrag stehen **Nächsten Schritt vereinbaren**, **Rückmeldung eintragen** und **Überprüfung planen**. Mehrere Schritte können parallel mit demselben Ursprung verbunden werden. Zuständigkeit und Inhalt werden von dir festgelegt; der Termin ist optional. Vorschläge erzeugen erst nach deiner Eingabe und Speicherung einen Schritt.

Aufgabenliste, Kalender und Aufgabenboard verwenden dieselben Datensätze. Mögliche Status: offen, in Bearbeitung, wartet auf Rückmeldung, erledigt und entfällt. Verschiebungen bleiben nachvollziehbar. Beim Abschluss wird ein Ergebnis beziehungsweise Grund dokumentiert. Ein erledigter Schritt verändert kein Ziel und keine Ampel automatisch.

Die fachliche Ampel wird mit Begründung, Bewertungsdatum und bewertender Person dokumentiert. Grau heißt „Noch nicht eingeschätzt“. Berechnete Hinweise aus Fehlzeiten und Aufgaben bleiben getrennt als Anlass zur fachlichen Prüfung sichtbar. Die bisherigen automatisch berechneten Ampelhinweise werden nicht als manuell bestätigte Bewertung ausgegeben.

## Kontrollierter Schuljahreswechsel

1. Unter Schüler:innen **Neue Liste prüfen** wählen oder **Wechsel ohne Import vorbereiten** öffnen.
2. Zielschuljahr und das tatsächliche Gültig-ab-Datum prüfen. Das vorgeschlagene Datum kann geändert werden.
3. Jede unklare Aktenzuordnung prüfen. Gleiche Namen sind nur Vorschläge. Die stabile Schüler-ID oder eine zuvor bestätigte externe Kennung ermöglicht eine verlässliche Zuordnung.
4. Klassen, Wechselart und neue Klassenleitung korrigieren. Wiederholung, Überspringen, Parallelklasse und SKG-Übergang sind möglich. Bei der Vorbereitung ohne Liste bleibt die bisherige Klasse zunächst stehen, bis du sie prüfst.
5. Fehlende Kinder bleiben unverändert. Schulabgang und Schulwechsel müssen je Kind ausdrücklich ausgewählt und bestätigt werden.
6. Nach der Vorschau wird eine Gesamtsicherung erstellt. Erst danach werden die geprüften Änderungen gespeichert.

Die Schüler-ID bleibt gleich. Chronologie, Dokumente, Gruppenverknüpfungen, Ziele, Aufgaben und Ampelhistorie bleiben erhalten. Klassenzuordnungen besitzen einen Gültigkeitszeitraum; ein „bis“-Datum bezeichnet den ersten Tag, an dem die alte Zuordnung nicht mehr gilt. Ein dezenter Eintrag markiert den Wechsel.

Offene Aufgaben behalten Zuständigkeit und Termin. Bei einem Wechsel erscheint ein Prüfhinweis. Bestätigte Abgänge werden archiviert, aber ihre offenen Aufgaben bleiben sichtbar. Eine Reaktivierung führt über dieselbe Zuordnungsvorschau.

Ohne externe Kennung muss eine importierte Person manuell zugeordnet werden. Exportiere danach die Klassenliste mit der stabilen Schüler-ID und verwende diese Kennung in zukünftigen Importen. Eine automatische Zuordnung nur über Namen findet im Schülerimport nicht statt.

## Bestehende Daten und Grenzen

Alte Dokumentationen werden lesbar verknüpft, nicht durch Zusammenfassungen ersetzt. Unklar zugeordnete Altdaten werden nicht automatisch einem Kind zugeteilt. Die bisherige Detailansicht bleibt als ergänzender Zugang verfügbar.

Der neue Kalender und das neue Aufgabenboard zeigen die gemeinsamen Aufgaben. Das bisherige Fallboard bleibt als zusätzliche Organisationsansicht bestehen. Die neue Chronologie benötigt keine manuelle Fallanlage.

Historische Ereignisklassen und Gruppenstatistiken sind vom heutigen Klassenwechsel entkoppelt. Für alte Einträge ohne verlässliche Klassengeschichte wird keine Klasse erfunden. Bestehende WebUntis-Zuordnungen und Fehlzeitendaten werden erhalten; ein WebUntis-Import darf Klassen nicht mehr stillschweigend umschreiben.
