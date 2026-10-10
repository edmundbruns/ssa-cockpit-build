# KI-Arbeitshilfe für das SSA-Cockpit

## Zweck

Das Cockpit erzeugt pro Chronikeintrag einen Prompt mit der vollständigen anonymisierten Chronologie des ausgewählten Falls. Kopiere den Prompt in ein KI-System und füge dessen JSON-Antwort anschließend im Cockpit ein.

Die Dokumentation und die Cockpit-Funktion verwenden dasselbe Antwortformat. Ergänze keine zusätzlichen JSON-Schlüssel.

## Grenzen der Arbeitshilfe

- Ergänze keine Tatsachen, die nicht in der Chronologie stehen.
- Stelle keine Diagnose und ändere keine fachliche Ampel.
- Veranlasse keine Kontaktaufnahme.
- Formuliere höchstens drei konkrete, überprüfbare nächste Schritte.
- Wenn wesentliche Angaben fehlen, verwende den Status `nicht_ausreichend` und nenne die Lücken in `hinweise`.
- Vorschläge werden erst nach Prüfung und ausdrücklicher Auswahl in Cockpit-Aufgaben übernommen.
- Die fachliche Entscheidung bleibt bei der Schulsozialarbeiterin oder dem Schulsozialarbeiter.

## Verbindliches Antwortformat

Antworte ausschließlich mit einem gültigen JSON-Objekt. Verwende exakt diese acht Schlüssel:

    {
      "schema_version": "1.0",
      "status": "ok",
      "ober_themen": [],
      "fachverfahren": [],
      "naechste_schritte": [],
      "moegliche_fachstellen": [],
      "massnahmenstatus": [],
      "hinweise": []
    }

Felder:

- `schema_version`: immer `"1.0"`.
- `status`: `"ok"`, `"nicht_ausreichend"` oder `"sicherheitspruefung"`.
- `ober_themen`: Liste passender Themenobjekte mit `id` und `bezeichnung`.
- `fachverfahren`: Liste von Objekten mit `id`, `bezeichnung`, `version` und `passende_kriterien` als Liste.
- `naechste_schritte`: höchstens drei Objekte mit `titel`, `beschreibung`, `zustaendigkeit` und `frist_tage` als Zahl. Nenne eine Rolle, keine erfundene Person.
- `moegliche_fachstellen`: Liste passender interner oder externer Stellen aus dem übergebenen Kontext.
- `massnahmenstatus`: Liste kurzer Hinweise zum Stand dokumentierter Maßnahmen.
- `hinweise`: Liste mit fehlenden Informationen, Unsicherheiten oder fachlichen Grenzen.

## Beispiel bei unzureichenden Angaben

    {
      "schema_version": "1.0",
      "status": "nicht_ausreichend",
      "ober_themen": [],
      "fachverfahren": [],
      "naechste_schritte": [],
      "moegliche_fachstellen": [],
      "massnahmenstatus": [],
      "hinweise": ["Der dokumentierte Verlauf enthält noch zu wenige Angaben für einen konkreten nächsten Schritt."]
    }

Gib keinen Markdown-Codeblock, keine Einleitung und keinen Text außerhalb des JSON aus. Jede vorgeschlagene Handlung muss sich auf dokumentierte Informationen beziehen.
