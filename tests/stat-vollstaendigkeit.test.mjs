import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../src/erweiterungen.js',import.meta.url),'utf8');
const match=source.match(/function dossierStatVollstaendigkeit\(form\)\{[\s\S]*?\n\}/);
assert.ok(match,'Live-Vollständigkeitsprüfung muss im Statistikcode vorhanden sein');
function checker({topic=false,duration=false,access=false,accessEnabled=true}={}){
 const box={textContent:'',classList:{state:false,toggle(_name,on){this.state=on}}};
 const form={querySelector(selector){
  if(selector==='#dossierStatVollstaendigkeit')return box;
  if(selector==='[name="thema"]:checked')return topic?{}:null;
  if(selector==='[name="dauer_min"]:checked')return duration?{}:null;
  if(selector==='[name="zugangsweg"]')return accessEnabled?{}:null;
  if(selector==='[name="zugangsweg"]:checked')return access?{}:null;
  return null;
 }};
 const fn=vm.runInNewContext(`(${match[0]})`,{});
 fn(form);
 return box;
}

test('zeigt fehlendes Thema, Dauer und Zugangsweg samt Auswertungsbezug',()=>{
 const box=checker();
 assert.match(box.textContent,/Thema für die Themenauswertung/);
 assert.match(box.textContent,/Dauer für die Arbeitsstunden/);
 assert.match(box.textContent,/Zugangsweg für die Zugangsstatistik/);
 assert.equal(box.classList.state,false);
});

test('bestätigt Vollständigkeit, wenn die relevanten Chips gewählt sind',()=>{
 const box=checker({topic:true,duration:true,access:true});
 assert.match(box.textContent,/Angaben für die Auswertung sind vollständig/);
 assert.equal(box.classList.state,true);
});

test('fordert keinen Zugangsweg, wenn das Feld im Formular nicht gebraucht wird',()=>{
 const box=checker({topic:true,duration:true,accessEnabled:false});
 assert.match(box.textContent,/vollständig/);
});
