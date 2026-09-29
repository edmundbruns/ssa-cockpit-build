# Auftrag: Statistik im SSA-Cockpit (überarbeitete Fassung, 29.09.2026)

Grundlage ist der ursprüngliche Statistik-Auftrag. Geändert sind die Punkte, die mit dem bestehenden Cockpit kollidieren, Zahlen verfälschen würden oder die Anonymität schwächen. Umsetzung in drei Schritten, jeder mit eigenem Installer.

## Rahmen (unverändert)
- Bestehende Speicherlogik, keine Cloud, keine externen Bibliotheken, keine KI, Diagramme mit eigenem SVG.
- Bestehende Daten bleiben unverändert lesbar. Alte Einträge ohne neue Merkmale: „nicht erfasst“, getrennt ausgewiesen. Wo eine alte Angabe eindeutig passt, wird sie übernommen und als „übernommen“ gekennzeichnet – ohne die gespeicherten Daten zu verändern (Ableitung beim Auswerten).
- Die drei Knöpfe bleiben schnell: Chips mit sinnvoller Vorauswahl, Pflicht nur wo genannt. Nur vertikales Scrollen. An jedem Merkmal und jeder Kennzahl ein „?“ (was, warum, Beispiel).
- Speichern wie seit 0.13: sofort sichern, nur die sichtbare Seite neu zeichnen.

## Keine RLSB-Kategorien vorgegeben
Der Erlass „Soziale Arbeit in schulischer Verantwortung“ (2017, geändert 2022) schreibt keine Statistik vor. Nr. 6.3: Die Schulleitung darf allgemeine Angaben wie Anzahl und Dauer von Beratungsgesprächen anfordern. Themen und Tätigkeiten werden deshalb den Handlungsfeldern des Erlasses zugeordnet (4.2 Kernaufgaben, 4.3 weitere, 4.4 optionale), damit der Jahresbericht in dessen Sprache berichten kann.

## 1. Kategorien (eine zentrale Liste, feste IDs, Version je Schuljahr ab 1.8.)
- **kontaktart** (automatisch; nur „Krise“ wählbar): kurzkontakt, beratungsgespraech, krisengespraech, gruppe, klasse
- **zugangsweg** (einmal je Kind und Schuljahr, Pflicht mit einem Klick): schueler_selbst, lehrkraft, eltern, schulleitung, mitschueler, anfrageportal, extern. *Ersetzt die freie Angabe „Wer hat den Auftrag gegeben?“ in der Auftragsklärung – dieselben IDs, keine Doppelabfrage.*
- **beteiligte** (mehrfach, Vorauswahl schueler): schueler, eltern, lehrkraft, schulleitung, jugendamt, fachstelle_andere
- **thema** (mehrfach, empfohlen): konflikt_mobbing, familie, fehlzeiten_schulangst, emotionen_krise, lernen_motivation, verhalten_unterricht, medien, sucht, **gesundheit** (neu, Erlass 4.3), berufsorientierung, kinderschutz, sonstiges. *Ersetzt die bisherigen Anlässe im Kurzkontakt.*
- **dauer_min**: Kurzkontakt 5 · 10 · 15 · 30 (Vorauswahl 5); Gespräch 15 · 30 · 45 · 60 · 90, **ohne feste Vorauswahl** (zuletzt gewählter Wert wird angeboten), damit die Stundenzahl nicht künstlich auf 15 Minuten zusammenfällt.
- **ergebnis** (nur Gespräch, optional): weiter_begleitet, abgeschlossen, weitervermittelt, massnahme_vereinbart. *Ersetzt „Entscheidung zur Unterstützung“.*
- **teilnehmende**: bei Gruppen automatisch aus den ausgewählten Kindern, bei Klasse und Tätigkeit ohne Fall als Zahl.
- **mitarbeitende**: automatisch.
- Klassenstufe und Schulzweig (1–4 GS, 5–10 OBS) werden beim Speichern je Kind festgehalten.
- Nicht gezählt: Schnellnotiz (Notiz, kein Kontakt), Trainingsraum (schulische Dokumentation, eigene Auswertung).

## 2. Tätigkeit ohne Fall
Kleiner Knopf auf „Heute“. Pflicht: tätigkeit (ein Klick). Optional: Dauer, Klasse, Teilnehmende, Notiz. Werte: klassenprojekt_praevention, konferenz, elternabend, lehrkraefteberatung, kollegiale_beratung, netzwerk, fortbildung, pausenpraesenz, verwaltung, sonstiges. klassenprojekt_praevention färbt die Klassen-Kachel.

## 3. Zähleinheiten
- **Erreichte Schüler:innen**: jedes Kind mit mindestens einem Kontakt im Zeitraum (auch kurz, auch in Gruppen), je Schuljahr einmal.
- **Einzelfälle**: Kinder mit mindestens einem Beratungs- oder Krisengespräch im Schuljahr, je Schuljahr einmal. *Statt eines einzigen, zu weit gefassten „Fall“-Begriffs.*
- **Kontakte**: jeder Eintrag. **Erreichte Personen**: Einzelkontakt 1, Gruppe/Klasse Teilnehmende. **Stunden**: Summe dauer_min / 60, eine Nachkommastelle.

## 4. Statistikseite (Schritt 2)
Datenqualitäts-Hinweis mit „Jetzt nachtragen“ · Kennzahlen · Filter (Zeitraum-Schnellwahl, Klassenstufe, Schulzweig, Thema, Zugangsweg, Kontaktart, Ergebnis, Tätigkeit, Mitarbeitende; zurücksetzen; bleiben erhalten) · Balken plus Tabelle je Merkmal · Kreuztabelle mit Summen. Alles intern, deutlich markiert „intern, nicht weitergeben“.

## 5. Weitergabe an Dritte (Schritt 3)
- Weitergegeben werden **nur Standardberichte** (Jahresbericht, Halbjahresüberblick, Arbeitszeitverteilung, Prävention je Klasse, Vorjahresvergleich) – keine frei gefilterten Tabellen. Kleinste Einheiten: Halbjahr und Klassenstufe.
- „Mitarbeitende“ erscheint nie in Berichten für Dritte (Beschäftigtendaten).
- Kleinzahlregel: 1 und 2 als „< 3“, 0 bleibt. Kreuztabellen: „< 5“.
- Folgeschutz **wiederholt angewendet**, bis in keiner Zeile und Spalte mehr genau eine Zelle unterdrückt ist; Summen werden mitgeprüft.
- Automatische Vergröberung (Klassenstufe → Schulzweig, Monat → Halbjahr) mit Hinweis.
- Kinderschutz, Krise (emotionen_krise) und Sucht nur als Gesamtzahl je Schuljahr.
- Vorschau „Diese Tabelle verlässt das Cockpit. Bitte prüfen.“, Empfänger Pflicht, Protokoll „Weitergaben“, CSV (Semikolon, UTF-8 mit BOM) und Druck.

## 6. Technik
Eine einheitliche Ereignisquelle (Chronik plus Tätigkeiten ohne Fall), Anonymisierung als eigene getestete Funktion, schnell auch bei mehreren tausend Einträgen.

## Schritte
1. **0.15.0 – Kategorien und Erfassung** (erledigt): Kategorienliste, Chips in Kurzkontakt, Gespräch und Gruppengespräch, Zugangsweg einmal je Kind und Schuljahr (auch aus Auftragsklärung und Anfrageportal), Tätigkeit ohne Fall, Ableitung alter Werte, „?“ an jedem Merkmal.
2. **0.16.0 – Statistikseite** mit Datenqualität und „Jetzt nachtragen“ (erledigt).
3. **Standardberichte, Anonymisierung, Export und Protokoll.**
