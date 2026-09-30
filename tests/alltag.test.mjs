import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const g={};new Function('globalThis',fs.readFileSync(path.join(root,'src/dossier-core.js'),'utf8'))(g);const D=g.Dossier;
const ids=t=>D.themenVorschlag(t).map(x=>x.id);

test('Themenvorschlag: Stichworte am Wortanfang, mehrere Themen',()=>{
 assert.deepEqual(ids('Anna hatte Streit im Klassenchat und fehlt seit Montag.'),['konflikt_mobbing','fehlzeiten_schulangst','medien']);
 assert.deepEqual(ids('Er ist krank.'),['fehlzeiten_schulangst']);
 assert.deepEqual(ids('Er hat das bestritten.'),[],'„bestritten“ ist kein Streit');
 assert.deepEqual(ids(''),[]);
 assert(ids('Die MUTTER rief an').includes('familie'),'Groß- und Kleinschreibung egal');
 assert(ids('wurde gemobbt').includes('konflikt_mobbing'));
});
test('Themenvorschlag: nur gültige Themen-IDs',()=>{
 const gueltig=new Set(D.katListe('thema','2026-09-01').map(x=>x.id));
 for(const id of Object.keys(D.THEMEN_STICHWORTE))assert(gueltig.has(id),id);
});
test('Sperrhinweise: rote Sperre vor gelben Hinweisen',()=>{
 const s={students:[{id:'a',first:'A',last:'B',family:{contactPermission:'Nur nach Rücksprache',custodyStatus:'Ungeklärt'}}],relatedPersons:[{studentId:'a',name:'Herr X',role:'Getrenntlebender Elternteil',mayContact:'Nein'},{studentId:'a',name:'Frau Y',role:'Jugendamt',mayContact:'Ja'},{studentId:'b',name:'Z',mayContact:'Nein'}]};
 const h=D.sperrHinweise(s,'a');
 assert.equal(h[0].stufe,'rot');assert.match(h[0].text,/Keine Auskunft \/ kein Kontakt: Herr X · Getrenntlebender Elternteil/);
 assert.equal(h.length,3);assert(!h.some(x=>/Frau Y|Z/.test(x.text)));
 assert.deepEqual(D.sperrHinweise(s,'b'),[],'unbekanntes Kind: nichts');
 assert.equal(D.sperrHinweise({students:[{id:'c',family:{contactPermission:'Kontakt untersagt'}}]},'c')[0].stufe,'rot');
});
test('Namenssuche: Reihenfolge, Komma, unsichtbare Zeichen und Umlaute egal',()=>{
 const s={settings:{classLeads:{'7b':'Frau Lehrkraft'}},students:[{id:'x1',first:'Ben',last:'Osse­vorth',className:'7b'},{id:'x2',first:'Benjamin',last:'Müller',className:'5a'},{id:'x3',first:'Jörg',last:'Bengsch',className:'8a',active:false}]};
 const ids=q=>D.schuelerSuche(s,q).map(x=>x.id);
 for(const q of ['Ossevorth','ossevorth, ben','Ben Ossevorth','Ossevorth Ben','ben 7b'])assert.deepEqual(ids(q),['x1'],q);
 assert.deepEqual(ids('mueller').length,0,'ue ist nicht ü');assert.deepEqual(ids('müller'),['x2']);
 assert.deepEqual(ids('ben'),['x1','x2','x3'],'Treffer am Wortanfang zuerst, Archivierte zuletzt');
 assert.deepEqual(ids('lehrkraft'),['x1'],'Klassenleitung findet die Klasse');
 assert.deepEqual(D.schuelerSuche(s,'ben',{nurAktiv:true}).map(x=>x.id),['x1','x2']);
});
