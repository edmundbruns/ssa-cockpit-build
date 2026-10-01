import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const g={};new Function('globalThis',fs.readFileSync(path.join(root,'src/dossier-core.js'),'utf8'))(g);const D=g.Dossier;
const woerter=t=>D.wertungsHinweise(t).map(w=>w.wort.toLowerCase());

test('Wertungen: typische Formulierungen werden erkannt, mit Art und Prüffrage',()=>{
 const h=D.wertungsHinweise('Lena ist total empfindlich und die Mädchen in der 5a sind gemein. Die Mutter ist völlig überfordert und kümmert sich nicht.');
 assert.deepEqual(h.map(x=>x.wort.toLowerCase()).sort(),['empfindlich','gemein','kümmert sich nicht','total','überfordert','völlig'].sort());
 assert(h.every(x=>x.art&&x.frage));
 assert.deepEqual(woerter('Noah schwänzt ständig Mathe, angeblich Bauchweh. Typisch Scheidungskind.').sort(),['angeblich','scheidungskind','schwänzt','ständig','typisch'].sort());
 assert.equal(D.wertungsHinweise('Tim wirkt depressiv.')[0].art,'Diagnose');
});
test('Wertungen: sachliche Texte und ähnliche Wörter lösen nichts aus',()=>{
 assert.deepEqual(woerter('Lena berichtet, seit den Sommerferien im Klassenchat ausgelacht zu werden. Wir haben gemeinsam überlegt, wer helfen kann.'),[]);
 assert.deepEqual(woerter('Im Opferschutz und in der Gemeinde gibt es Angebote. Allgemein ruhig.'),[]);
 assert.deepEqual(woerter('die empfindliche Stelle'),['empfindliche']);
});
test('Schutzhinweis: Vernachlässigung trotz „ohne“ erkannt',()=>{
 const h=D.safetyHint('Jana komme seit zwei Wochen ohne Frühstück und in zu dünner Kleidung. Sie sagt, Mama ist viel im Bett.');
 assert(h);assert(h.hits.includes('ohne Frühstück/Essen/Jacke'));assert(h.hits.includes('unpassende Kleidung'));assert(h.hits.includes('Eltern oft nicht ansprechbar'));
 assert(D.safetyHint('Ich muss abends immer auf meinen kleinen Bruder aufpassen').hits.includes('muss auf Geschwister aufpassen'));
 assert(D.safetyHint('Er ist oft allein zu Hause.'));
 assert(D.safetyHint('Sie hat oft Hunger in der ersten Stunde.'));
 assert.equal(D.safetyHint('Paul hat Hunger auf Erfolg beim Fußball? Nein: Paul spielt gern Fußball.')?.hits.includes('Hunger')??false,true,'„hat Hunger“ bleibt bewusst ein Hinweis');
 assert.equal(D.safetyHint('Streit beim Fußball, Regel vereinbart.'),null);
 assert(D.themenVorschlag('Kommt ohne Frühstück').some(v=>v.id==='kinderschutz'));
});
test('Schutzhinweis: gespeicherter Eintrag bekommt den Prüfvermerk',()=>{
 const s=D.normalize({students:[{id:'j',first:'Jana',last:'Espe',className:'4b'}],journal:[]});
 const e=D.addEntry(s,{date:'2026-09-25',type:'Schülergespräch / Einzelberatung',title:'Gespräch',content:'Kommt ohne Frühstück, Mama ist viel im Bett.',participantIds:['j']});
 assert.match(e.safetyStatus,/Schutzfrage/);
});

const basis=()=>D.normalize({students:[{id:'n',first:'Noah',last:'Falk',className:'8a',family:{}}],journal:[],relatedPersons:[]});
test('Sperrhinweis: Schweigepflichtentbindung abgelaufen, ausstehend, nicht erteilt',()=>{
 const s=basis();
 s.relatedPersons.push({id:'r1',studentId:'n',name:'Beratungsstelle Nord',role:'Beratungsstelle',mayContact:'Ja',releaseStatus:'Liegt vor',releaseUntil:'2026-06-30'},
  {id:'r2',studentId:'n',name:'Jugendamt',role:'Jugendamt',mayContact:'Ja',releaseStatus:'Noch ausstehend'},
  {id:'r3',studentId:'n',name:'Therapeutin',role:'Therapeut:in',mayContact:'Ja, eingeschränkt',releaseStatus:'Nicht erteilt'},
  {id:'r4',studentId:'n',name:'Vater',role:'Getrenntlebender Elternteil',mayContact:'Nein',releaseStatus:'Nicht erteilt'},
  {id:'r5',studentId:'n',name:'Klassenleitung',role:'Klassenleitung',mayContact:'Ja',releaseStatus:'Liegt vor',releaseUntil:'2027-07-31'});
 const t=D.sperrHinweise(s,'n','2026-09-30').map(h=>h.stufe+' '+h.text);
 assert(t.includes('gelb Schweigepflichtentbindung abgelaufen (30.06.2026): Beratungsstelle Nord · Beratungsstelle'));
 assert(t.includes('gelb Schweigepflichtentbindung noch ausstehend: Jugendamt · Jugendamt'));
 assert(t.some(x=>/^gelb Keine Schweigepflichtentbindung: Therapeutin/.test(x)));
 assert(!t.some(x=>/Schweigepflicht.*Vater/.test(x)),'beim Kontaktverbot reicht der rote Hinweis');
 assert(!t.some(x=>/Klassenleitung/.test(x)&&/Schweigepflicht/.test(x)),'gültige Entbindung ohne Hinweis');
 assert.equal(t[0].slice(0,3),'rot','rot bleibt oben');
});
test('Sperrhinweis: Familienangaben älter als ein Jahr oder ohne Prüfdatum',()=>{
 const s=basis(),st=s.students[0];
 assert.deepEqual(D.sperrHinweise(s,'n','2026-09-30'),[],'leere Familie ohne Hinweis');
 st.family={custodyStatus:'Gemeinsames Sorgerecht',verifiedAt:'2025-09-01'};
 assert(D.sperrHinweise(s,'n','2026-09-30').some(h=>h.text==='Familienangaben zuletzt geprüft am 01.09.2025 – bitte prüfen'));
 st.family.verifiedAt='2025-10-15';assert(!D.sperrHinweise(s,'n','2026-09-30').some(h=>/geprüft/.test(h.text)));
 st.family.verifiedAt='';assert(D.sperrHinweise(s,'n','2026-09-30').some(h=>/ohne Prüfdatum/.test(h.text)));
});

test('Gruppentext: Persönliches über ein genanntes Kind wird erkannt',()=>{
 const s=D.normalize({students:[{id:'b',first:'Ben',last:'Ahorn',className:'6a'},{id:'t',first:'Tim',last:'Ulme',className:'6a'},{id:'e',first:'Ella',last:'Kiefer',className:'6a'}],journal:[]});
 const h=D.gruppenTextHinweis(s,'Ben erzählt, dass Tims Eltern sich trennen. Tim wirkt depressiv.',['b','t','e']);
 assert(h);assert.deepEqual(h.kinder.map(k=>k.id).sort(),['b','t']);assert(h.gruende.includes('Familie'));assert(h.gruende.some(x=>/Diagnose/.test(x)));
 assert.equal(D.gruppenTextHinweis(s,'Streit beim Fußball um die Mannschaftswahl. Ella pfeift diese Woche.',['b','t','e']),null,'kein Persönliches');
 assert.equal(D.gruppenTextHinweis(s,'Die Eltern sollen informiert werden.',['b','t','e']),null,'kein Kind genannt');
 assert.equal(D.gruppenTextHinweis(s,'Tims Eltern trennen sich.',['t']),null,'nur ein Kind: kein Gruppentext');
});

test('Auftrag: nach Wiederaufnahme erneut fragen, nach neuer Klärung nicht mehr',()=>{
 const s=D.normalize({students:[{id:'l',first:'Lena',last:'Birke',className:'5a'}],journal:[]});
 D.saveAuftrag(s,'l',{requester:'Kind selbst',childNeed:'Ruhe im Chat',assignedOrder:'Begleitung',date:'2026-09-05'});
 assert.equal(D.auftragPruefen(s,'l'),null);
 s.statusHistory.push({id:'h1',studentId:'l',date:'2026-09-20',fromStatus:'Aktive Begleitung',status:'Abgeschlossen'});
 assert.equal(D.auftragPruefen(s,'l'),null,'Abschluss allein fragt nicht');
 s.statusHistory.push({id:'h2',studentId:'l',date:'2026-09-28',fromStatus:'Abgeschlossen',status:'Wiederaufgenommen'});
 const p=D.auftragPruefen(s,'l');assert(p);assert.equal(p.seit,'2026-09-28');
 D.saveAuftrag(s,'l',{requester:'Kind selbst',childNeed:'Neue Situation',assignedOrder:'Begleitung',date:'2026-09-29'});
 assert.equal(D.auftragPruefen(s,'l'),null);
 D.saveAuftrag(s,'l',{requester:'Kind selbst',childNeed:'x',assignedOrder:'y',date:'2026-09-28'});
 assert.equal(D.auftragPruefen(s,'l'),null,'gleicher Tag, nach der Wiederaufnahme geklärt');
});

test('Wertungen: erweiterte Liste, Umgangssprache, wörtliche Zitate bleiben unberührt',()=>{
 const h=D.wertungsHinweise('Er ist mal wieder ausgerastet und hat keinen Bock. Die Mutter ist Alkoholikerin, der Junge ein Systemsprenger.');
 const arten=Object.fromEntries(h.map(x=>[x.wort.toLowerCase(),x.art]));
 assert.equal(arten['mal wieder'],'Unterstellung');assert.equal(arten['ausgerastet'],'Umgangssprache');assert.equal(arten['keinen bock'],'Umgangssprache');
 assert.equal(arten['alkoholikerin'],'Diagnose');assert.equal(arten['systemsprenger'],'Etikett');
 assert.deepEqual(woerter('Lena sagt: „Die sind total gemein zu mir.“'),[],'Zitat des Kindes ist keine Wertung');
 assert.deepEqual(woerter('Tim sagt, die anderen seien "voll assi".'),[]);
 assert.deepEqual(woerter('„Ich bin faul“, sagt Paul, und die Lehrkraft nennt ihn uneinsichtig.'),['uneinsichtig']);
});

test('Aufbewahrung: fällig nach 5 Jahren ab Abgang, Frist einstellbar',()=>{
 const s=D.normalize({students:[{id:'a',first:'Alt',last:'Ex',className:'10a',active:false,archivedAt:'2021-07-15'},{id:'b',first:'Aktiv',last:'K',className:'7a',active:true},{id:'c',first:'Jung',last:'Ex',className:'10b',active:false,archivedAt:'2022-07-15'},{id:'d',first:'Ohne',last:'Datum',active:false}],journal:[]});
 assert.equal(D.aufbewahrungJahre(s),5);
 assert.deepEqual(D.loeschfaellig(s,{heute:'2026-07-14'}).map(x=>x.sid),[]);
 assert.deepEqual(D.loeschfaellig(s,{heute:'2026-07-15'}).map(x=>x.sid),['a']);
 s.settings.aufbewahrungJahre=4;assert.deepEqual(D.loeschfaellig(s,{heute:'2026-07-15'}).map(x=>x.sid),['a','c']);
 s.settings.aufbewahrungJahre=99;assert.equal(D.aufbewahrungJahre(s),5,'ungültige Frist fällt auf Standard zurück');
 assert.throws(()=>D.akteLoeschen(s,'b',{heute:'2026-10-01'}),/archivierte/);
 assert.throws(()=>D.akteLoeschen(s,'c',{heute:'2026-10-01'}),/noch nicht abgelaufen/);
});
test('Aufbewahrung: Löschen entfernt alles zum Kind, Gruppeneinträge bleiben für die anderen, Protokoll ohne Namen',()=>{
 const s=D.normalize({students:[{id:'a',first:'Alt',last:'Ex',className:'10a',active:false,archivedAt:'2020-07-15',family:{custodyStatus:'Gemeinsames Sorgerecht'}},{id:'b',first:'Bea',last:'Bleibt',className:'10a',active:true}],journal:[],relatedPersons:[{id:'r',studentId:'a',name:'Mutter Ex'}],trainingRoom:[{id:'t',studentId:'a',date:'2020-01-01'}]});
 D.addEntry(s,{date:'2020-03-01',type:'Schülergespräch / Einzelberatung',title:'Einzel',content:'Gespräch mit Alt',participantIds:['a']});
 const g=D.addEntry(s,{date:'2020-03-02',type:'Gruppengespräch',title:'Gruppe',content:'gemeinsam',participantIds:['a','b'],individualNotes:{a:'nur a',b:'nur b'},stat:D.statErfassen(s,{kontaktart:'gruppe'},['a','b'],'2020-03-02')});
 D.addTask(s,{title:'Aufgabe zu Alt',assignedTo:'Bruns, Edmund',participantIds:['a'],studentId:'a'});
 D.saveAuftrag(s,'a',{requester:'Kind selbst',childNeed:'x',assignedOrder:'y',date:'2020-03-01'});
 D.zugangswegSetzen(s,'a','schueler_selbst','2020-03-01');
 const p=D.akteLoeschen(s,'a',{von:'Bruns, Edmund',heute:'2026-10-01'});
 assert.deepEqual(s.students.map(x=>x.id),['b']);
 const rest=JSON.stringify({...s,loeschprotokoll:[]});
 for(const spur of ['"a"','Alt','Mutter Ex','nur a','Aufgabe zu Alt'])assert(!rest.includes(spur),'Spur bleibt: '+spur);
 const gr=s.journal.find(e=>e.id===g.id);assert.deepEqual(gr.participantIds,['b']);assert.equal(gr.individualNotes.b,'nur b');
 assert.equal(s.cases.length,0);assert.equal(s.trainingRoom.length,0);assert.equal(s.relatedPersons.length,0);
 assert.equal(s.loeschprotokoll.length,1);assert.equal(p.von,'Bruns, Edmund');assert.equal(p.schuljahrAbgang,'2019/20');assert.equal(p.frist,5);
 assert(!JSON.stringify(s.loeschprotokoll).includes('Alt'),'Protokoll ohne Namen');
});
