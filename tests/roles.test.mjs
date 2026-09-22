import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../src/index.html',import.meta.url),'utf8');
const required=[
 'Schulleiterin / Schulleiter',
 'Ständige Vertretung (Konrektorin / Konrektor)',
 'Didaktische Leitung',
 'Fachbereichsleitung',
 'Sicherheitsbeauftragte/r',
 'Datenschutzbeauftragte/r',
 'Ersthelfer-Organisation / Beauftragte/r für Erste Hilfe',
 'Brandschutz- und Evakuierungsbeauftragte/r',
 'Gefahrstoffbeauftragte/r',
 'Gleichstellungsbeauftragte',
 'Strahlenschutzbeauftragte/r',
 'Mobilitätsbeauftragte/r',
 'Beauftragte/r für Berufliche Orientierung',
 'Inklusions- und Sonderpädagogik-Koordination',
 'IT-, Medien- und Digitalisierungsbeauftragte/r',
 'Ganztagskoordination',
 'Beauftragte/r für Bildung für nachhaltige Entwicklung (BNE)',
 'Sucht- und Gewaltpräventionsbeauftragte/r',
 'Schulsozialarbeiter/in / Sozialpädagogische Fachkraft',
 'Beratungslehrkraft',
 'Schulassistent/in',
 'Hausmeister'
];

test('Rollen und Zuständigkeiten enthalten die vollständige schulische Rollenliste',()=>{
 for(const role of required)assert.match(html,new RegExp(role.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),role);
});
