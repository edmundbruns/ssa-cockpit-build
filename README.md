# SSA-Cockpit Ludgerusschule Desktop

Version 0.24.3. Der Windows-Installer (NSIS) entsteht über den GitHub-Actions-Workflow `Windows Installer`.

Die Anwendung speichert Falldaten und Anhänge lokal in einem verschlüsselten Datentresor. Dateien können bestehenden Chronikeinträgen nachträglich zugeordnet werden. Verlaufsberichte lassen sich als DOCX herunterladen oder als PDF drucken. Lokale Handlungsvorschläge und die Textüberarbeitung sind regelbasiert und werden nur nach einer ausdrücklichen Bestätigung übernommen. Es wird kein externes KI-Modell verwendet. Sprachmemos und OCR sind nicht Bestandteil dieser Version.

Die lokale Migrationsdatei mit personenbezogenen Schuldaten ist nicht Bestandteil dieses Repositorys; sie bleibt auf dem Dienstgerät. Vor einer Installation bitte im Cockpit eine Gesamtsicherung erstellen.

Unter „Gesprächsbogen drucken“ stehen vier fachlich unterschiedliche DIN-A4-Varianten nach der bereitgestellten Druckvorlage zur Auswahl. Der unveränderte Originalbogen lässt sich dort ebenfalls öffnen. Kurztitel, Informationsquelle und Gesprächsanlass bieten optionale Schnellauswahlen bei freier Eingabe. Projekt- und Fachkraftvorschläge sind lokale, fallabhängige Optionen; nur bestätigte Vorschläge werden Aufgaben.


## Aktueller Arbeitsablauf

Das Handbuch steht in `HANDBUCH-0.24.0.md` und im Programm unter „Handbuch“. Schnellvorlagen, Aufgabenfilter, Dokumentprüfung und WebUntis-Importprüfung sind miteinander verknüpft. Dokumente können direkt aus Chronikkacheln geöffnet werden. Sprachmemo und OCR sind nicht Bestandteil dieser Version.


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

## Neu in 0.15.0 – Statistik, Schritt 1: Kategorien und Erfassung

Grundlage ist `AUFTRAG-STATISTIK.md` (überarbeiteter Auftrag). Die neue Statistikseite (Schritt 2) und die anonyme Weitergabe (Schritt 3) folgen.

- **Zentrale Kategorien** mit festen IDs und Version je Schuljahr (`KATEGORIEN_VERSIONEN` in `src/dossier-core.js`, gültig ab 1.8.). Anzeigetexte stehen getrennt von den IDs, Themen und Tätigkeiten sind den Handlungsfeldern des Erlasses zugeordnet.
- **Erfassung mit Chips**:
  - Kurzkontakt: Thema, Dauer (5 · 10 · 15 · 30, Vorauswahl 5). Ersetzt die bisherigen Anlässe.
  - Gespräch: Art (Beratung/Krise), Thema, Beteiligte (Vorauswahl Schüler:in), Dauer (15–90, ohne feste Vorauswahl, zuletzt gewählte Dauer wird angeboten), Ergebnis (freiwillig). Ersetzt „Entscheidung zur Unterstützung“ und das Zahlenfeld „Dauer“.
  - Gruppengespräch: Thema, Dauer; Teilnehmende automatisch.
  - Klassenstufe und Schulzweig (1–4 GS, 5–10 OBS) werden je Kind beim Speichern festgehalten.
- **Zugangsweg** genau einmal je Kind und Schuljahr (Pflicht, ein Klick), im Kurzkontakt oder Gespräch. Die Auftragsklärung nutzt dieselben Werte und setzt den Zugangsweg mit; eine zugeordnete Schüler-Anfrage setzt „Anfrageportal“.
- **Tätigkeit ohne Fall**: kleiner Knopf unter der Schnellnotiz. Tätigkeit ist Pflicht; Dauer, Datum, Klasse, Teilnehmende und Notiz sind optional. „Klassenprojekt / Prävention“ markiert die Klassen-Kachel.
- **Alte Einträge** werden nicht verändert. Für die Auswertung (`Dossier.statMerkmale`) wird Eindeutiges als „übernommen“ gelesen (z. B. Anlass „Streit“ → Konflikt/Mobbing, Dauer, Entscheidung fortführen/abschließen); alles andere ist „nicht erfasst“. Schnellnotiz, „Zusage erledigt“, Informationen und Mitteilungen zählen nicht als Kontakt.
- **„?“** an jedem Merkmal (Art, Zugangsweg, Beteiligte, Thema, Dauer, Ergebnis, Tätigkeit, Teilnehmende).

Abnahme (automatisch geprüft):
- Kurzkontakt mit Vorauswahl in wenigen Klicks gespeichert.
- Zugangsweg einmal je Kind und Schuljahr, im neuen Schuljahr wieder.
- Tätigkeit ohne Fall speichert und markiert die Klasse.
- Alte Einträge bleiben unverändert und werden als „übernommen“ oder „nicht erfasst“ gelesen.
- Kein waagerechtes Scrollen in den Formularen (1440 und 820 Pixel Breite).

### Merkmale und IDs (Version 2026/27)

| Merkmal | IDs |
|---|---|
| kontaktart | kurzkontakt, beratungsgespraech, krisengespraech, gruppe, klasse |
| zugangsweg | schueler_selbst, lehrkraft, eltern, schulleitung, mitschueler, anfrageportal, extern |
| beteiligte | schueler, eltern, lehrkraft, schulleitung, jugendamt, fachstelle_andere |
| thema | konflikt_mobbing, familie, fehlzeiten_schulangst, emotionen_krise, lernen_motivation, verhalten_unterricht, medien, sucht, gesundheit, berufsorientierung, kinderschutz, sonstiges |
| ergebnis | weiter_begleitet, abgeschlossen, weitervermittelt, massnahme_vereinbart |
| taetigkeit | klassenprojekt_praevention, konferenz, elternabend, lehrkraefteberatung, kollegiale_beratung, netzwerk, fortbildung, pausenpraesenz, verwaltung, sonstiges |
| dauer_min | Kurzkontakt 5, 10, 15, 30 · Gespräch 15, 30, 45, 60, 90 · Tätigkeit zusätzlich 120, 180 |

## Neu in 0.16.0 – Statistik, Schritt 2: Statistikseite

- **Eine Ereignisquelle** (`Dossier.ereignisse`): Chronik, anonyme Kurzkontakte, alte Fallverlaufs-Kontakte, alte Gruppengespräche, Klassenmaßnahmen und Tätigkeiten ohne Fall. Alle Zahlen der Seite werden daraus berechnet, es gibt keine zweite Datenhaltung. Schnellnotizen, „Zusage erledigt“, Informationen, Mitteilungen und Trainingsraum zählen nicht.
- **Seitenaufbau**, deutlich markiert „Intern – nicht weitergeben“:
  - Datenqualität: Kontakte ohne Thema oder Dauer, Kinder ohne Zugangsweg, mit **„Jetzt nachtragen“**. Die Einträge erscheinen nacheinander nur mit den fehlenden Chips; „Speichern und weiter“ springt zum nächsten.
  - Fünf Kennzahlen, jeweils mit Einheit und „?“:
    - Erreichte Schüler:innen (je Schuljahr einmal, anonyme Kurzkontakte getrennt).
    - Einzelfälle (mindestens ein Beratungs- oder Krisengespräch).
    - Kontakte.
    - Stunden (Summe der Dauer ÷ 60, eine Nachkommastelle).
    - Erreichte Personen.
  - Filter, beliebig kombinierbar: Zeitraum (Schuljahr, Halbjahre, Monat, Vorjahr, frei, gesamt), Klassenstufe, Schulzweig, Thema, Zugangsweg, Art, Ergebnis, Tätigkeit und Mitarbeitende. Die Filter bleiben beim Seitenwechsel erhalten und lassen sich zurücksetzen.
  - Balken (eigenes SVG) mit derselben Tabelle darunter:
    - Art, Themen, Zugangsweg (Kinder), Beteiligte, Ergebnis.
    - Klassenstufe und Schulzweig (Kinder), Verlauf nach Monat.
    - Arbeitszeit nach Bereich (Einzelfall, Gruppen und Klassen, Kooperation, Verwaltung, Fortbildung), Tätigkeiten ohne Fall, Kontakte nach Mitarbeitenden.
    - „Nicht erfasst“ steht jeweils getrennt und grau.
  - Kreuztabelle mit zwei frei wählbaren Merkmalen, Kontakte oder Stunden, mit Zeilen- und Spaltensummen.
- Die bisherige Auswertung mit Jahresbericht steht eingeklappt darunter, bis Schritt 3 sie ersetzt.
- **Testdatensatz** mit Fantasienamen: `tests/testdaten-statistik.json`. Die Werte unter „erwartet“ sind von Hand nachgezählt; `tests/statistik.test.mjs` prüft sie.

Abnahme (automatisch geprüft):
- Die Kennzahlen stimmen mit der Handnachzählung; ein Kind wird je Schuljahr nur einmal gezählt.
- Filterkombinationen und Kreuztabelle liefern korrekte Summen.
- Die Datenqualität zählt richtig, und „Jetzt nachtragen“ ergänzt nur fehlende Angaben.
- Alte Einträge bleiben unverändert.
- Mehr als 6000 Einträge werden in deutlich unter einer Sekunde ausgewertet.
- In den neuen Ansichten und im Nachtragen-Dialog gibt es bei 1440 und 820 Pixel Breite keinen waagerechten Scrollbalken.

## Neu in 0.16.1

- Unter „Weitere Aktionen“ an jeder Chronik-Kachel steht jetzt als erster Punkt „✎ Kachel bearbeiten“: eigene Einträge und Aufgaben öffnen direkt das Bearbeitungsformular (Änderungen landen in der Änderungshistorie), die Auftragsklärung öffnet „Auftrag bearbeiten“, die Ampel „Einschätzung aktualisieren“. Übernommene Kacheln (Import, Altdaten) bleiben im Original unverändert; dort öffnet „Ergänzung / Korrektur eintragen“ einen verknüpften Eintrag.

## Neu in 0.17.0 – Statistik, Schritt 3: Weitergabe; SSA-Team vereinheitlicht

- **SSA-Team:** feste Team-Liste (Standard: Bruns, Edmund · Thien, Sabine · Anerkennungspraktikantin Laura Geiger), änderbar unter „Daten und Einstellungen“. „Dokumentiert von“, „Verantwortlich“, „Geprüft von“ und „Durchgeführt von“ bieten nur noch das Team an; „SSA-Team“ als Auswahl entfällt. Der früher automatisch angelegte Personeneintrag „SSA-Team“ wird auf inaktiv gesetzt, nicht gelöscht.
- **Frühere Schreibweisen:** Beim Auswerten werden alte Angaben automatisch einer Person zugeordnet, wenn alle Namensteile eindeutig passen („Edmund“ → Bruns, Edmund; „Sabine“, „Sabine Thien“ → Thien, Sabine). „SSA-Team“ ist keiner Person zugeordnet, bis du es in der Tabelle „Frühere Schreibweisen“ festlegst. Gespeicherte Einträge werden nicht verändert; die Zuordnung liegt in `settings.mitarbeitendZuordnung`.
- **Berichte zur Weitergabe** (Auswertung): Jahresbericht, Halbjahresüberblick, Arbeitszeitverteilung, Prävention je Klassenstufe, Vorjahresvergleich. Kleinzahlregel („< 3“, Kreuztabellen „< 5“), Folgeschutz wiederholt bis stabil (Summen mitgeprüft, „•“), automatische Vergröberung Klassenstufe → Schulzweig mit Hinweis, Kinderschutz/Krise/Sucht nur als Jahresgesamtzahl, keine Mitarbeitenden.
- **Vorschau** mit „Diese Tabelle verlässt das Cockpit. Bitte prüfen.“, Empfänger als Pflichtfeld, Zweck optional; **CSV** (Semikolon, UTF-8 mit BOM, Formelschutz) oder **Druck**; jedes Mal ein Eintrag im Protokoll **Weitergaben** (`weitergaben`).
- Die alten Knöpfe „Jahresbericht / PDF“ und „Word-Datei“ in der bisherigen Auswertung sind entfallen, damit es keinen zweiten, nicht protokollierten Weg nach außen gibt. „Interne Rohdaten als CSV“ bleibt für die eigene Ablage.
- Tests: `tests/weitergabe.test.mjs` (Anonymisierung inkl. 300 Zufallstabellen, Berichte, CSV, Protokoll, Mitarbeitende) und Abschnitt 14 in `tests/v0122-dom.cjs`.

## Neu in 0.18.0 – Alltag

- **Wer arbeitet gerade?** Nach dem Entsperren eine Auswahl aus der Team-Liste; die aktive Person steht unten links in der Navigation und lässt sich per Klick wechseln (`werArbeitetFragen`).
- **Sperrhinweis im Kopf der Akte** (`Dossier.sperrHinweise`): rot bei „Kontakt untersagt/eingeschränkt“ (Familienangaben) oder bei einer Bezugsperson mit „Nein – keine Auskunft, kein Kontakt“; gelb bei „nur nach Rücksprache“, ungeklärter Auskunftslage, ungeklärtem Sorgerecht oder eingeschränktem Kontakt. Der Hinweis sitzt außerhalb des scrollenden Bereichs.
- **Themenvorschlag per Stichwort** (`Dossier.themenVorschlag`, Stichworte am Wortanfang): hebt passende Themen-Chips in Gespräch, Kurzkontakt, Gruppengespräch und „Jetzt nachtragen“ hervor, kreuzt aber nie selbst an.
- **Zusatz pro Kind im Gruppengespräch**: ersetzt das frühere unzugeordnete Feld „Individuelle Hinweise“; wird als `individualNotes[sid]` gespeichert und erscheint nur in der Chronik dieses Kindes. Statistik unverändert (ein Kontakt, n erreichte Kinder).
- Tests: `tests/alltag.test.mjs` und Abschnitt 15 in `tests/v0122-dom.cjs`.

## Neu in 0.19.0

- **Gespräch planen** (`geplanteGespraeche`): Termin an der Akte, oben in der Akte und am Tag (sowie danach, bis dokumentiert) auf „Heute“. „Dokumentieren“ öffnet das Gesprächsformular vorausgefüllt; nicht abgehakte Punkte werden Zusagen (`Dossier.gespraechErledigt`). Verschieben mit Verlauf, Absagen ohne Löschen.
- **Schuljahreswechsel für ganze Klassen** (`Dossier.jahrKlassen`, `klasseUebernehmen`, `alleKlassenUebernehmen`, `klasseAbgang`): nur noch nicht geprüfte Zeilen mit sicherer Zuordnung; Einzelprüfungen bleiben; Abschlussklassen nur über „Alle als Schulabgang“ oder einzeln. Filter „Nur ungeprüfte Zeilen zeigen“.
- **Fehler behoben:** Die Prüfung „Abschlussjahrgang“ blockierte bisher auch die reguläre Versetzung 9 → 10. Sie greift jetzt nur bei Kindern, die schon in Klasse 10 sind, oder bei einer offenen Abschluss-Kennzeichnung.
- **Zugangsweg:** zusätzlich „PM“ (pädagogische Mitarbeiter:in) und „SSA“ (Schulsozialarbeit ist selbst auf das Kind zugegangen).
- Tests: `tests/planung.test.mjs` und Abschnitt 16 in `tests/v0122-dom.cjs`.

## Neu in 0.20.0 – schlanker (Schritt 1 von 3)

- Navigation: Hauptpunkte Heute, Schüler:innen, Fallarbeit (Liste und Board bleiben), Aufgaben und Zusagen, Auswertung; „Weitere Bereiche“ startet zugeklappt.
- Akte: fünf Knöpfe sichtbar, Rest unter „Mehr …“; „Ideen aus diesem Eintrag“ zugeklappt; Fachverfahren-Kasten an der Kachel entfällt, Überthema als Schild.
- Gesprächsformular: selten genutzte Felder nur noch bei vorhandenen Werten (keine Datenänderung); Titel unter „Mehr erfassen“; „Sachlich formulieren“ als Link.
- „Wiedervorlage anlegen“ → schlanker Dialog „Aufgabe anlegen“ (Aufgabe, Termin, Zuständig, Fallbezug). Bestehende Wiedervorlagen sind unverändert Aufgaben.
- Fachverfahren → „Leitfäden“ zum Nachlesen; Start-Knöpfe ausgeblendet, laufende Abläufe bleiben sichtbar.
- Einstellungen: Spracherkennung und automatische Fallanlage unter „Erweitert“.
- Schüler-Anfragen: Die Seite ist nicht mehr erreichbar; vorhandene Anfragen bleiben gespeichert.
- Kleinere Korrekturen: Zuständig im Aufgabendialog ist mit der aktiven Person vorbelegt; Leitfäden-Raster bricht bei schmalem Fenster um.

## Neu in 0.21.0 – schlanker (Schritt 2) und Korrekturen

- **Sofort sichtbar:** Nach jedem Speichern wird eine geöffnete Akte neu gezeichnet (`akteAktualisieren` in `renderSichtbar`), die Scrollposition bleibt. Bisher zeichnete das Speichern seit 0.13 nur die sichtbare Seite neu; die Akte als Dialog blieb auf altem Stand.
- **Familie und Bezugspersonen wieder erreichbar:** Seit der Chronik-Akte waren „Familie“ und „Bezugsperson“ nicht mehr aufrufbar. Jetzt ein Bereich in der Akte mit beiden Dialogen; Bezugspersonen sind bearbeitbar (mit Verlauf).
- **Suche** (`Dossier.schuelerSuche`, `suchPasst`): Wörter in beliebiger Reihenfolge, Komma egal, unsichtbare Zeichen (weiches Trennzeichen, geschütztes Leerzeichen) werden ignoriert; exakte Treffer zuerst; Hinweis bei mehr als 12 Treffern. Gilt für die Kopfsuche, die Schülerliste, Kurzkontakt und Teilnehmerlisten.
- **Gruppengespräch** nur noch über das Gruppenformular (in der Akte unter „Mehr …“ und als Link im Gesprächsformular); die Art „Gruppengespräch“ erscheint im Einzelformular nur noch bei älteren Einträgen.

## Neu in 0.22.0 – Trainingsraum (Schritt 3)

- Formular mit Auswahlknöpfen statt Auswahllisten plus Textfeldern; Feldnamen und gespeicherte Werte bleiben gleich (`reason`, `lesson`, `duration`, `reflection`, `agreement`, `result`, `parentInfo`, `followUp`), die Auswertung des Trainingsraums ändert sich nicht.
- „Anlass“ und „Sachliche Situationsbeschreibung“ zusammengelegt: Anlass-Knopf (Pflicht) plus freiwilliges Feld „Was ist passiert?“ (`note`, jetzt optional und in der Chronik sichtbar). Das Feld „Ergänzung zum Anlass“ entfällt; alte Werte bleiben.
- Begleitet von (nur SSA-Team), Folgemaßnahme und Wiedervorlage unter „Mehr“.
- Schülersuche im Formular nutzt die robuste Suche aus 0.21.

## Neu in 0.24.0 – Grundsätze guter Dokumentation

- „Sachlich formulieren“ zeigt wertende Wörter, Unterstellungen, Diagnosen, Etiketten und Verstärker mit Prüffrage; keine automatische Umformulierung.
- Schutzhinweis erkennt zusätzlich Hinweise auf Vernachlässigung und sagt, dass die Stichwortsuche nicht alles erkennt.
- Trainingsraum: Hinweis bei Beratungsinhalt in der Notiz, Übernahme in ein Beratungsgespräch.
- Gruppengespräch: Hinweis, wenn der gemeinsame Text Persönliches über ein genanntes Kind enthält.
- Akte: Hinweise zu Schweigepflichtentbindungen (abgelaufen, ausstehend, nicht erteilt) und zu Familienangaben ohne Prüfung seit über einem Jahr.
- Auftrag: Nach Wiederaufnahme eines abgeschlossenen Falls fragt die Akte, ob der Auftrag noch aktuell ist.
- Aufbewahrung und Löschung: Frist 5 Jahre ab Abgang (einstellbar), Hinweis auf „Heute“, einzelne Löschung nach Bestätigung inklusive Dokumente, Löschprotokoll ohne Namen.
- „Sachlich formulieren“: zusätzliche Begriffe inklusive Umgangssprache; wörtliche Zitate werden ausgenommen.

## Neu in 0.23.0 – Gesprächsbogen passend zum Formular

- Abschnittstitel an „Gespräch eintragen“ angeglichen, je mit Hinweis auf das Zielfeld im Cockpit; Kopf mit Uhrzeit, „Dokumentiert von“ und „Überthema“.
- Ankreuzkasten „Für die Statistik“ (Art, Thema, Beteiligte, Dauer, Ergebnis, Zugangsweg) aus `Dossier.katListe` – ändern sich die Kategorien, ändert sich der Bogen mit. Passt weiterhin auf eine DIN-A4-Seite.
