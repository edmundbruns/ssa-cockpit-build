import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const g={};new Function('globalThis',fs.readFileSync(path.join(root,'src/dossier-core.js'),'utf8'))(g);const D=g.Dossier;
const st=(id,cls)=>({id,first:'V'+id,last:'N'+id,className:cls,schoolYear:'2026/27',active:true});
const zustand=()=>D.normalize({settings:{currentSchoolYear:'2026/27'},students:[st('a','9a'),st('b','9a'),st('c','9a'),st('d','10a'),st('e','10a'),st('f','5b')],journal:[]});
const wechsel=s=>{const p=D.preview(s,s.students.map(x=>({givenId:x.id,first:x.first,last:x.last,className:D.nextClass(x.className)||x.className,schoolYear:'2027/28'})),{year:'2027/28',effectiveDate:'2027-08-01'});for(const r of p.rows){r.confirmed=false;r.graduating=!D.nextClass(s.students.find(x=>x.id===r.studentId).className);r.reason=r.graduating?'Abschlussjahrgang – Abgang / Wechsel prüfen':'Reguläre Versetzung';}return p;};

test('Gespräch planen, verschieben, absagen',()=>{
 const s=zustand();
 assert.throws(()=>D.planeGespraech(s,{date:'',participantIds:['a']}),/Datum/);
 assert.throws(()=>D.planeGespraech(s,{date:'2026-10-02',participantIds:[]}),/Kind/);
 const g=D.planeGespraech(s,{date:'2026-10-02',time:'10:15',type:'Elterngespräch / Elternkontakt',participantIds:['a'],punkte:'- Sitzplatz\n\nRückmeldung Mutter'});
 assert.deepEqual(g.punkte,['Sitzplatz','Rückmeldung Mutter']);
 assert.equal(D.geplanteGespraeche(s,{bis:'2026-10-01'}).length,0);assert.equal(D.geplanteGespraeche(s,{bis:'2026-10-02'}).length,1);
 D.gespraechVerschieben(s,g.id,'2026-10-05');assert.equal(g.date,'2026-10-05');assert.equal(g.verlauf.length,1);
 D.gespraechAbsagen(s,g.id);assert.equal(D.geplanteGespraeche(s).length,0);assert.equal(s.geplanteGespraeche.length,1,'nicht gelöscht');
});
test('Nach dem Dokumentieren werden offene Punkte zu Zusagen',()=>{
 const s=zustand(),g=D.planeGespraech(s,{date:'2026-10-02',participantIds:['a','b'],punkte:['A','B','C']});
 const z=D.gespraechErledigt(s,g.id,{entryId:'e1',offen:['B','C'],zusageAn:'Eltern'});
 assert.equal(z.length,2);assert.equal(g.status,'erledigt');assert.equal(g.entryId,'e1');
 assert(z.every(t=>t.kind==='zusage'&&t.promisedTo==='Eltern'&&t.sourceEntryKey==='entry:e1'&&t.participantIds.join()==='a,b'));
});
test('Schuljahreswechsel: ganze Klasse übernehmen, Einzelprüfungen bleiben',()=>{
 const s=zustand(),p=wechsel(s);
 const r9=p.rows.filter(r=>['a','b','c'].includes(r.studentId));r9[0].pupil.className='9a';r9[0].reason='Wiederholung';r9[0].confirmed=true;
 const k=D.jahrKlassen(s,p);assert.deepEqual(k.map(x=>[x.alt,x.n,x.abschluss]),[['5b',1,false],['9a',3,false],['10a',2,true]]);
 const x=D.klasseUebernehmen(s,p,'9a');assert.equal(x.n,2);
 assert.equal(r9[0].pupil.className,'9a','Wiederholer unverändert');assert(r9.slice(1).every(r=>r.confirmed&&r.pupil.className==='10a'));
 D.klasseUebernehmen(s,p,'5b','6c');const r5=p.rows.find(r=>r.studentId==='f');assert.equal(r5.pupil.className,'6c');assert.equal(r5.reason,'Geprüfte Klassenzuordnung');
 assert.throws(()=>D.klasseUebernehmen(s,p,'10a'),/Abschlussklasse/);
 assert.equal(D.klasseAbgang(s,p,'10a').n,2);
 assert.deepEqual(D.validate(s,p),[],'Plan ist gültig – auch 9 → 10');
});
test('Alle Klassen auf einmal, Abschlussklassen bleiben offen',()=>{
 const s=zustand(),p=wechsel(s),x=D.alleKlassenUebernehmen(s,p);
 assert.equal(x.n,4);assert.deepEqual(x.abschluss,['10a']);
 assert(p.rows.filter(r=>['d','e'].includes(r.studentId)).every(r=>!r.confirmed));
});
test('Zugangsweg kennt PM und SSA',()=>{
 const ids=D.katListe('zugangsweg','2026-09-01').map(x=>x.id);assert(ids.includes('pm')&&ids.includes('ssa'));
 assert.equal(D.katLabel('zugangsweg','pm'),'PM');assert.equal(D.katLabel('zugangsweg','ssa'),'SSA');
});
