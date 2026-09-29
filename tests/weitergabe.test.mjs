import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const g={};new Function('globalThis',fs.readFileSync(path.join(root,'src/dossier-core.js'),'utf8'))(g);const D=g.Dossier;
const td=JSON.parse(fs.readFileSync(path.join(root,'tests/testdaten-statistik.json'),'utf8'));
const laden=()=>D.normalize(structuredClone(td.zustand));
const anz=m=>m.zellen.map(r=>r.map(c=>c.anzeige));

// Prüft jede angezeigte Summe: nie genau ein unterdrückter Wert in einer Gleichung
function gleichungenSicher(m){
 const gl=[],R=m.zeilenSummen,C=m.spaltenSummen,G=m.gesamt;
 if(R)m.zellen.forEach((r,i)=>gl.push([...r,R[i]]));
 if(C)C.forEach((c,j)=>gl.push([...m.zellen.map(r=>r[j]),c]));
 if(G){gl.push([...R,G]);gl.push([...C,G]);}
 return gl.every(x=>x.filter(c=>c.s).length!==1);
}

test('Kleinzahlregel: 1 und 2 als „< 3“, 0 bleibt',()=>{
 const m=D.anonymMatrix([[1],[2],[0],[7],[9]],{spaltenSummen:false});
 assert.deepEqual(anz(m),[['< 3'],['< 3'],['0'],['7'],['9']]);
});
test('Folgeschutz: eine einzelne kleine Zahl mit Summe zieht die nächstkleinere mit',()=>{
 const m=D.anonymMatrix([[2],[5],[9]],{spaltenSummen:true});
 assert.deepEqual(anz(m),[['< 3'],['•'],['9']]);assert.equal(m.spaltenSummen[0].anzeige,'16');assert(gleichungenSicher(m));
});
test('Summe wird mitgeprüft: kleine Summe wird verdeckt',()=>{
 const m=D.anonymMatrix([[2],[0]],{spaltenSummen:true});
 assert.equal(m.spaltenSummen[0].anzeige,'< 3');assert.equal(m.zellen[1][0].anzeige,'0');
});
test('Kreuztabelle: Grenze 5, wiederholt angewendet bis stabil',()=>{
 const m=D.anonymMatrix([[3,4,10],[8,6,12],[20,7,9]],{grenze:5,zeilenSummen:true,spaltenSummen:true});
 assert.equal(m.zellen[0][0].anzeige,'< 5');assert.equal(m.zellen[0][1].anzeige,'< 5');assert(gleichungenSicher(m));
 const m2=D.anonymMatrix([[4,20,30],[15,25,35],[16,27,40]],{grenze:5,zeilenSummen:true,spaltenSummen:true});
 assert(gleichungenSicher(m2),'Zeile und Spalte der 4 bekommen je einen Partner');assert(m2.folge>=2);
});
test('Folgeschutz hält auch bei vielen Zufallstabellen',()=>{
 let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let n=0;n<300;n++){
  const z=1+Math.floor(rnd()*5),s=1+Math.floor(rnd()*5);
  const w=Array.from({length:z},()=>Array.from({length:s},()=>rnd()<0.3?0:Math.floor(rnd()*12)));
  for(const opt of [{grenze:5,zeilenSummen:true,spaltenSummen:true},{grenze:3,spaltenSummen:true},{grenze:3,zeilenSummen:true}])
   assert(gleichungenSicher(D.anonymMatrix(w,opt)),JSON.stringify({w,opt}));
 }
});

test('Standardberichte: alle fünf entstehen, ohne Mitarbeitende und ohne Namen',()=>{
 const s=laden();
 const namen=[...s.students.flatMap(x=>[x.first,x.last]),...D.ssaTeam(s)].filter(Boolean);
 for(const art of Object.keys(D.BERICHTE)){
  const b=D.standardbericht(s,art,{schuljahr:'2026/27',halbjahr:1});
  assert(b.abschnitte.length>0,art);const csv=D.berichtCsv(b);
  for(const n of namen)assert(!csv.includes(n),art+' enthält '+n);
  assert(!/Mitarbeit/.test(csv.replace('Angaben zu Mitarbeitenden','')),art+': keine Mitarbeitenden-Spalte');
 }
});
test('Geschützte Themen: im Halbjahr und in Kreuztabellen nicht aufgeschlüsselt',()=>{
 const s=laden();
 const hj=D.standardbericht(s,'halbjahr',{schuljahr:'2026/27',halbjahr:1});
 const krise=D.wertLabel('thema','emotionen_krise');
 assert(!D.berichtCsv(hj).includes(krise),'Halbjahr ohne „'+krise+'“');
 const jb=D.standardbericht(s,'jahresbericht',{schuljahr:'2026/27'});
 const themen=jb.abschnitte.find(a=>a.titel==='Themen'),kreuz=jb.abschnitte.find(a=>a.titel==='Themen nach Schulzweig');
 assert(themen.zeilen.some(z=>z.label===krise),'Jahresbericht nennt die Gesamtzahl');
 assert(!kreuz||!kreuz.zeilen.some(z=>z.label===krise),'nicht in der Kreuztabelle');
});
test('Kennzahlen im Bericht folgen der Kleinzahlregel, Stunden nicht',()=>{
 const s=laden(),jb=D.standardbericht(s,'jahresbericht',{schuljahr:'2026/27'});
 const k=Object.fromEntries(jb.abschnitte[0].zeilen.map(z=>[z.label,z.zellen[0]]));
 assert.equal(k['Anonyme Kurzkontakte'],'< 3');assert.equal(k['Kontakte'],'8');assert.equal(k['Stunden'],'6,8');
});
test('Vergröberung Klassenstufe → Schulzweig mit Hinweis',()=>{
 const jb=D.standardbericht(laden(),'jahresbericht',{schuljahr:'2026/27'});
 assert(jb.abschnitte.some(a=>a.titel==='Erreichte Schüler:innen nach Schulzweig'));
 assert(jb.hinweise.some(h=>/zu Schulzweigen zusammengefasst/.test(h)));
});
test('CSV: UTF-8 mit BOM, Semikolon, Formelschutz',()=>{
 const b={titel:'T',zeitraum:'Z',erstellt:'2026-09-29T10:00:00Z',hinweise:[],abschnitte:[{titel:'A',kopf:['x','y'],zeilen:[{label:'=1+1',zellen:['a;b']}],fuss:null,hinweis:''}]};
 const csv=D.berichtCsv(b);assert(csv.startsWith('﻿'));assert(csv.includes("'=1+1;\"a;b\""));assert(csv.includes('\r\n'));
});
test('Weitergabe nur mit Empfänger und wird protokolliert',()=>{
 const s=laden();
 assert.throws(()=>D.weitergabeProtokollieren(s,{bericht:'Jahresbericht',zeitraum:'x',empfaenger:' ',format:'CSV'}),/an wen/);
 const w=D.weitergabeProtokollieren(s,{bericht:'Jahresbericht',zeitraum:'Schuljahr 2026/27',empfaenger:'Schulleitung',format:'Druck'});
 assert.equal(s.weitergaben.length,1);assert.equal(w.empfaenger,'Schulleitung');assert.equal(w.von,'Eddy');
});

test('Mitarbeitende: Schreibweisen aus dem Screenshot werden zusammengeführt',()=>{
 const s=D.normalize({settings:{activeUser:'SSA-Team'},journal:[],students:[]});
 assert.deepEqual(D.ssaTeam(s),['Bruns, Edmund','Thien, Sabine','Anerkennungspraktikantin Laura Geiger']);
 const k=r=>D.mitarbeitendKanonisch(s,r);
 assert.equal(k('Edmund'),'Bruns, Edmund');assert.equal(k('Bruns, Edmund'),'Bruns, Edmund');
 for(const r of ['Sabine','Sabine Thien','Thien, Sabine'])assert.equal(k(r),'Thien, Sabine',r);
 assert.equal(k('Anerkennungspraktikantin Laura Geiger'),'Anerkennungspraktikantin Laura Geiger');assert.equal(k('Laura Geiger'),'Anerkennungspraktikantin Laura Geiger');
 assert.equal(k('SSA-Team'),'','SSA-Team gehört keiner Person');assert.equal(k('Andere Person oder Institution'),'Andere Person oder Institution');
 assert.equal(s.settings.activeUser,'Bruns, Edmund','„SSA-Team“ ist keine aktive Person mehr');
});
test('Mitarbeitende: feste Zuordnung überschreibt die Automatik, Einträge bleiben unverändert',()=>{
 const s=D.normalize({settings:{},journal:[{id:'a',date:'2026-09-01',type:'Kurzkontakt',title:'x',content:'x',participantIds:[],responsible:'SSA-Team'}],students:[]});
 D.mitarbeitendZuordnen(s,'SSA-Team','Bruns, Edmund');assert.equal(D.mitarbeitendKanonisch(s,'SSA-Team'),'Bruns, Edmund');
 assert.equal(s.journal[0].responsible,'SSA-Team');
 assert.throws(()=>D.mitarbeitendZuordnen(s,'SSA-Team','Jemand anderes'));
 D.mitarbeitendZuordnen(s,'SSA-Team','__auto');assert.equal(D.mitarbeitendKanonisch(s,'SSA-Team'),'');
 const sw=D.mitarbeitendSchreibweisen(s);assert.deepEqual(sw.map(x=>[x.roh,x.anzahl,x.zuordnung]),[['SSA-Team',1,'']]);
});
