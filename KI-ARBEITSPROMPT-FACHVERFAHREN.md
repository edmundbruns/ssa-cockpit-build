# KI-Arbeitshilfe für das SSA-Cockpit

## Zweck und Ablauf

Über **„Eintrag reflektieren“** erstellt das Cockpit einen datensparsam aufbereiteten Prompt ausschließlich für die geöffnete Chronik-Kachel. Der übrige Fallverlauf wird nicht mitgesendet. Dadurch kann wichtiger Kontext fehlen. Der Prompt fordert die KI auf, diese Grenze zu benennen und keine Vorgeschichte zu unterstellen. Der Text wird nicht automatisch an einen KI-Anbieter gesendet. Vor dem Kopieren muss die Fachkraft den bearbeitbaren Prompt prüfen und verbleibende Angaben selbst entfernen. Die automatische Aufbereitung ist **keine garantierte Anonymisierung**.

Die Antwort wird nach Prüfung und Speicherung an derselben Kachel unter **„KI-Reflexion · fachlich prüfen“** angezeigt. Handlungsschritte bleiben Vorschläge. Erst eine ausdrückliche Auswahl legt eine Aufgabe an. Der separate KI-Arbeitsprompt auf Ebene der Schülerakte kann den Fallverlauf betrachten.

Dokumenteinträge werden ohne Dateinamen und Dokumentinhalt übertragen. Direkte Daten wie gespeicherte Schüler:innen- und Teamnamen, bestimmte Kontaktdaten, genaue Datumsangaben und erkannte medizinische oder therapeutische Einzelsätze werden automatisch reduziert. Freitext kann trotzdem Angaben enthalten, die eine Person erkennbar machen. Erkannte Gesundheitsangaben werden standardmäßig ausgelassen; sie sollen nur dann manuell ergänzt werden, wenn sie für die konkrete Reflexionsfrage notwendig sind.

Verwende externe KI-Dienste nur, wenn deren Nutzung für diesen Zweck von der zuständigen Stelle freigegeben ist. Prüfe den Prompt vor jeder Übergabe erneut.

## Fachliche Grenzen

- Erfinde keine Tatsachen und behaupte keine Ursachen.
- Trenne eigene schulische Beobachtungen von Angaben des Kindes, der Familie und anderer Beteiligter.
- Formuliere Hypothesen als offene, überprüfbare Fragen.
- Stelle keine Diagnose und triff keine fachliche oder automatische Ampelentscheidung.
- Beschreibe Schutzaspekte nur als Prüfanlässe. Eine Schutzprüfung und ihre fachliche Einordnung bleiben bei der zuständigen Fachkraft.
- Wiederhole keine Namen, Kontaktdaten, Dateinamen oder unnötigen Gesundheitsangaben.
- Nenne höchstens drei konkrete nächste Schritte. Verwende Rollen statt Personennamen.
- Setze eine Frist nur, wenn sie aus dem dokumentierten Verlauf eindeutig hervorgeht. Sonst muss `frist_tage` `null` sein.
- Vorschläge werden zunächst als ungeprüfte Vorschläge gespeichert. Erst eine ausdrückliche Auswahl legt eine Aufgabe an.
- Fehlende Informationen und Widersprüche müssen ausdrücklich benannt werden.

## Verbindliches Antwortformat 1.1

Antworte ausschließlich mit einem gültigen JSON-Objekt und verwende exakt diese Schlüssel:

```json
{
  "schema_version": "1.1",
  "status": "ok",
  "ober_themen": [],
  "fachverfahren": [],
  "ressourcen": [],
  "beobachtungen": [],
  "fremdangaben": [],
  "hypothesen_prueffragen": [],
  "offene_fragen": [],
  "naechste_schritte": [
    {
      "titel": "",
      "beschreibung": "",
      "zustaendigkeit": "",
      "frist_tage": null
    }
  ],
  "moegliche_fachstellen": [],
  "gespraechsimpulse": [],
  "schutzaspekte": [],
  "massnahmenstatus": [],
  "hinweise": []
}
```

- `status`: `ok`, `nicht_ausreichend` oder `sicherheitspruefung`.
- `ober_themen`: Objekte mit `id` und `bezeichnung`, soweit sicher zuordenbar.
- `fachverfahren`: Objekte mit `id`, `bezeichnung`, `version` und `passende_kriterien` als Liste.
- `ressourcen`, `beobachtungen`, `fremdangaben`, `hypothesen_prueffragen`, `offene_fragen`, `gespraechsimpulse`, `schutzaspekte`, `massnahmenstatus` und `hinweise`: kurze Textlisten. Bei Hypothesen nur prüfbare Fragen eintragen.
- `naechste_schritte`: höchstens drei Objekte. `frist_tage` ist eine nichtnegative Zahl nur dann, wenn ein konkreter Zeitpunkt im Verlauf steht; andernfalls `null`.
- `moegliche_fachstellen`: Liste möglicher Stellen, keine automatische Vermittlung oder Kontaktaufnahme.

Das Cockpit kann Antworten im bisherigen Format 1.0 weiterhin importieren. Neue Antworten sollen Format 1.1 verwenden. Die Reflexionsfelder der Eintragsreflexion werden an der ausgewählten Chronik-Kachel angezeigt. KI-Handlungsvorschläge werden nicht ohne Auswahl zu Aufgaben.
