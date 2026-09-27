import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../src/dossier-core.js',import.meta.url),'utf8');
function api(){const ctx={crypto:{randomUUID:()=>Math.random().toString(36).slice(2)},structuredClone:global.structuredClone};vm.createContext(ctx);vm.runInContext(source,ctx);return ctx.Dossier;}
function state(){return {settings:{currentSchoolYear:'2026/27'},students:[{id:'s1',first:'Anna',last:'Test',className:'5a',schoolYear:'2026/27',active:true},{id:'s2',first:'Ben',last:'Test',className:'5a',schoolYear:'2026/27',active:true}],cases:[],tasks:[],journal:[],auftraege:[],quickContacts:[],statusHistory:[],events:[],yearTransitions:[],assessments:[],relatedPersons:[],portalRequests:[],verfahrenLaeufe:[]};}

test('Schutzthemen erzeugen keine Ideen und keine bewusst-nichts-tun-Option',()=>{const D=api(),s=state();const e=D.addEntry(s,{date:'2026-09-27',type:'Schülergespräch',title:'Selbstgefährdung',content:'Kind sagt, es wolle sich umbringen.',participantIds:['s1'],responsible:'SSA'});const r=D.ideasForEntry(s,e.id);assert.equal(r.ideas.length,0);assert.equal(r.safety,true);assert.throws(()=>D.markNoFurtherStep(s,e.id));});
test('Schutzstichworte und Verneinungen werden fachlich getrennt erkannt',()=>{const D=api(),s=state();const a=D.addEntry(s,{date:'2026-09-27',type:'Zusatzinfo',title:'Beobachtung',content:'Kind ritzt sich die Arme.',participantIds:['s1'],responsible:'SSA'});assert(a.safetyStatus);const b=D.addEntry(s,{date:'2026-09-27',type:'Zusatzinfo',title:'Rückmeldung',content:'Mutter sagt, das Kindeswohl sei nicht gefährdet.',participantIds:['s2'],responsible:'SSA'});assert.equal(b.safetyStatus,'');});
test('Gruppeneintrag bleibt für andere Kinder erhalten, wenn Teilnahme entfernt wird',()=>{const D=api(),s=state();const e=D.addEntry(s,{date:'2026-09-27',type:'Sozialtraining',title:'Gruppe',content:'Gemeinsames Training.',participantIds:['s1','s2'],responsible:'SSA'});e.participantIds=e.participantIds.filter(id=>id!=='s1');assert.deepEqual(D.timeline(s,'s2').filter(x=>x.id===e.id).length,1);assert.equal(D.timeline(s,'s1').filter(x=>x.id===e.id).length,0);});
