import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../src/index.html',import.meta.url),'utf8');
const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)?.[1]||'';
const migration=JSON.parse(fs.readFileSync(new URL('../migration/SSA-Cockpit-v0.7.1-Migration-PERSONENBEZOGEN.ssa-backup.json',import.meta.url),'utf8'));

test('Frontend-JavaScript ist syntaktisch gültig',()=>assert.doesNotThrow(()=>new Function(script)));
test('Frontend enthält keine eingebetteten Personenbestände',()=>{
 const m=html.match(/const seed=(\{[\s\S]*?\n\});\nconst clean=/);assert.ok(m);
 const seed=vm.runInNewContext(`(${m[1]})`);
 assert.equal(seed.students.length,0);assert.equal(seed.teachers.length,0);assert.equal(seed.schoolSignals.length,0);
});
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
 for(const marker of ['Zugeordnete Schüler-Anfrage','Fachlich geprüfter Frühindikator','Dokumentierter Trainingsraumvorgang','Teilnahme an einem dokumentierten Gruppengespräch','Familien- und Bezugskonstellation dokumentiert','Dokument zur Schülerakte hinzugefügt'])assert.match(script,new RegExp(marker));
 assert.match(script,/function ensureCaseForStudent/);
});
test('Rohimporte erzeugen nicht ungeprüft Fallakten',()=>{
 const importSection=script.slice(script.indexOf('function importSchoolSignals'),script.indexOf('function parseDelimited'));
 assert.doesNotMatch(importSection,/ensureCaseForStudent/);
});
test('Migration basiert auf v0.7.1',()=>{
 assert.equal(migration.type,'SSA-Cockpit-Gesamtsicherung');assert.equal(migration.schemaVersion,71);
});
test('Datentresor-Kommandos sind verdrahtet',()=>{
 for(const command of ['setup_vault','unlock_vault','save_state','export_backup','import_backup','put_attachment'])assert.match(script,new RegExp(command));
});
