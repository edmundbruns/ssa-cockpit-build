import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../src/index.html',import.meta.url),'utf8');
const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)?.[1]||'';
const core=fs.readFileSync(new URL('../src/dossier-core.js',import.meta.url),'utf8');

test('Frontend-JavaScript ist syntaktisch gültig',()=>assert.doesNotThrow(()=>new Function(script)));
test('Gespeicherte Schülerangaben werden nicht durch Ausgangsbestand überschrieben',()=>{assert.doesNotMatch(script,/Object\.assign\(stored,pupil/);assert.match(script,/Dossier\.normalize\(x\)/)});
test('Browser-Speicher wurde vollständig entfernt',()=>{
 assert.doesNotMatch(html,/localStorage|indexedDB/);
});
test('Unzulässiges Datenschutzversprechen ist entfernt',()=>{
 assert.doesNotMatch(html,/DSGVO-konform|100\s*%\s*Lokal|Zero-Server/i);
 assert.match(html,/kein pauschales Versprechen rechtlicher Konformität/i);
});
test('Fallboard ist eine zusätzliche Ansicht mit Historie',()=>{
 assert.match(html,/id="kanban"/);assert.match(script,/dropCaseOnKanban/);assert.match(script,/statusHistory\.push/);
});
test('Automatische Fallanlage deckt fachliche personenbezogene Einträge ab',()=>{
 for(const marker of ['Zugeordnete Schüler-Anfrage','Fachlich geprüfter Frühindikator','Dokumentierter Trainingsraumvorgang','Familien- und Bezugskonstellation dokumentiert','Dokument zur Schülerakte hinzugefügt'])assert.match(script,new RegExp(marker));
 assert.match(script,/function ensureCaseForStudent/);
});
test('Rohimporte erzeugen nicht ungeprüft Fallakten',()=>{
 const importSection=script.slice(script.indexOf('function importSchoolSignals'),script.indexOf('const VERLAUF_VORLAGEN'));
 assert.doesNotMatch(importSection,/ensureCaseForStudent/);
});
test('Upgrade sichert vor der Normalisierung',()=>{assert.match(script,/write_backup/);assert.match(script,/Vor-Chronologie-0\.10\.0/);assert.match(core,/dossierVersion=1/)});
test('Datentresor-Kommandos sind verdrahtet',()=>{
 for(const command of ['setup_vault','unlock_vault','save_state','export_backup','import_backup','put_attachment'])assert.match(script,new RegExp(command));
});
test('Wiederherstellung archiviert den aktuellen Bestand und Diktat bietet lokale Wege',()=>{
 assert.match(script,/vorWiederherstellung/);
 assert.match(script,/Verschlüsselte Sicherung wiederherstellen/);
 assert.match(script,/SpeechRecognition|webkitSpeechRecognition/);
 assert.match(script,/faster-whisper/);
});
