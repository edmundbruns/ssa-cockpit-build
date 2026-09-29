import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const g={};new Function('globalThis',fs.readFileSync(path.join(root,'src/dossier-core.js'),'utf8'))(g);const D=g.Dossier;
const td=JSON.parse(fs.readFileSync(path.join(root,'tests/testdaten-statistik.json'),'utf8')),E=td.erwartet;
const laden=()=>{const s=D.normalize(structuredClone(td.zustand));return {s,ev:D.ereignisse(s),zk:D.zugangKarte(s)};};
const SJ={von:'2026-08-01',bis:'2027-07-31'};
const alsObjekt=rows=>Object.fromEntries(rows.map(r=>[r.id,r.wert]));

test('Kennzahlen stimmen mit der Handnachzählung (Schuljahr 2026/27)',()=>{
 const {ev,zk}=laden();const f={...SJ};const k=D.kennzahlen(D.filterEreignisse(ev,f,zk),f);
 for(const [key,wert] of Object.entries(E.schuljahr_2026_27))assert.equal(k[key],wert,key);
});
test('Aufschlüsselung nach Thema und Zugangsweg (nicht erfasst getrennt)',()=>{
 const {ev,zk}=laden();const f={...SJ},evs=D.filterEreignisse(ev,f,zk);
 assert.deepEqual(alsObjekt(D.aufschluesselung(evs,'thema','kontakte',f,zk)),E.themen);
 assert.deepEqual(alsObjekt(D.aufschluesselung(evs,'zugangsweg','kinder',f,zk)),E.zugangsweg_kinder);
});
test('Filterkombinationen liefern korrekte Summen',()=>{
 const {ev,zk}=laden();
 let f={...SJ,stufe:'5'};let k=D.kennzahlen(D.filterEreignisse(ev,f,zk),f);for(const [key,w] of Object.entries(E.stufe_5))assert.equal(k[key],w,'Stufe 5: '+key);
 f={...SJ,thema:'konflikt_mobbing',stufe:'7'};k=D.kennzahlen(D.filterEreignisse(ev,f,zk),f);for(const [key,w] of Object.entries(E.thema_konflikt_und_stufe_7))assert.equal(k[key],w,'Konflikt+7: '+key);
 f={...SJ,mitarbeitend:'Sabine'};assert.equal(D.kennzahlen(D.filterEreignisse(ev,f,zk),f).kontakte,E.mitarbeitend_sabine.kontakte);
 f={...SJ,taetigkeit:'konferenz'};const kt=D.kennzahlen(D.filterEreignisse(ev,f,zk),f);assert.equal(kt.kontakte,0);assert.equal(kt.stunden,2);
});
test('Kreuztabelle Thema × Klassenstufe mit Zeilen- und Spaltensummen',()=>{
 const {ev,zk}=laden();const f={...SJ},kt=D.kreuztabelle(D.filterEreignisse(ev,f,zk),'thema','stufe','kontakte',f,zk);
 assert.equal(kt.gesamt,E.kreuz_thema_x_stufe.gesamt);
 assert.deepEqual(Object.fromEntries(kt.spalten.map((s,j)=>[s,kt.spaltenSummen[j]])),E.kreuz_thema_x_stufe.spaltenSummen);
 const i=kt.zeilen.indexOf('konflikt_mobbing');assert.deepEqual(Object.fromEntries(kt.spalten.map((s,j)=>[s,kt.tabelle[i][j]]).filter(([,v])=>v)),E.kreuz_thema_x_stufe.konflikt_mobbing);
 assert.equal(kt.zeilenSummen.reduce((a,b)=>a+b,0),kt.gesamt);
});
test('Fall wird je Schuljahr nur einmal gezählt',()=>{
 const {ev,zk}=laden();assert.equal(D.kennzahlen(D.filterEreignisse(ev,{},zk),{}).erreichteSchueler,E.gesamter_bestand_erreichteSchueler);
});
test('Datenqualität zählt richtig; Nachtragen ergänzt nur fehlende Angaben',()=>{
 const {s,ev,zk}=laden();const f={...SJ},q=D.datenqualitaet(D.filterEreignisse(ev,f,zk),zk);
 for(const [key,w] of Object.entries(E.datenqualitaet))assert.equal(q[key],w,key);
 assert.deepEqual(q.nachtragbar.map(x=>x.entryId).sort(),['j5','j8']);
 D.statNachtragen(s,'j5',{themen:['familie'],dauer_min:30});const j5=s.journal.find(e=>e.id==='j5');
 assert.deepEqual(j5.stat.themen,['familie']);assert.equal(j5.stat.dauer_min,30);assert.equal(j5.stat.kontaktart,'beratungsgespraech','bestehende Angaben bleiben');
 const q2=D.datenqualitaet(D.filterEreignisse(D.ereignisse(s),f,zk),zk);assert.equal(q2.ohneThema,1);assert.equal(q2.ohneDauer,0);
});
test('Alte Einträge ohne Merkmale bleiben unverändert und werden gelesen',()=>{
 const {s,ev}=laden();const j8=s.journal.find(e=>e.id==='j8');assert.equal(j8.stat,undefined,'keine stillen Änderungen');
 const e8=ev.find(e=>e.id==='entry:j8');assert.equal(e8.quelle,'uebernommen');assert.equal(e8.dauer_min,20);assert.equal(e8.ergebnis,'weiter_begleitet');
 assert.equal(ev.some(e=>e.id==='entry:j7'),false,'Kurznotiz zählt nicht');
});
test('Auswertung bleibt bei mehreren tausend Einträgen schnell',()=>{
 const {s}=laden();const vorlage=s.journal[0];for(let i=0;i<6000;i++)s.journal.push({...structuredClone(vorlage),id:'x'+i,date:'2026-'+String(9+(i%3)).padStart(2,'0')+'-'+String(1+(i%28)).padStart(2,'0')});
 const t0=performance.now(),zk=D.zugangKarte(s),ev=D.ereignisse(s),f={...SJ},evs=D.filterEreignisse(ev,f,zk);D.kennzahlen(evs,f);for(const m of ['kontaktart','thema','zugangsweg','beteiligte','ergebnis','stufe','zweig','monat','mitarbeitend','taetigkeit'])D.aufschluesselung(evs,m,m==='zugangsweg'?'kinder':'kontakte',f,zk);D.kreuztabelle(evs,'thema','stufe','kontakte',f,zk);D.datenqualitaet(evs,zk);
 const ms=performance.now()-t0;assert.ok(ms<800,'Dauer '+Math.round(ms)+' ms');
});
