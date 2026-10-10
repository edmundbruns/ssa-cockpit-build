import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../src/dossier-ui.js',import.meta.url),'utf8');
const start=source.indexOf('function dossierKiResponseListen(');
const end=source.indexOf('\nasync function dossierKiImportResponse(',start);
assert(start>=0&&end>start,'KI-Schema-Prüfung muss in dossier-ui.js vorhanden sein');
const context={};
vm.runInNewContext(source.slice(start,end)+';globalThis.validate=dossierKiResponseListen;',context);
const validate=context.validate;

const valid={schema_version:'1.0',status:'ok',ober_themen:[],fachverfahren:[],naechste_schritte:[],moegliche_fachstellen:[],massnahmenstatus:[],hinweise:[]};

test('nimmt eine vollständige Antwort im Cockpit-Schema an',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(validate(valid))),{stepsInput:[],topicsInput:[],proceduresInput:[],statusInput:[]});
});

test('weist fehlende Schemaangaben mit einer verständlichen Meldung zurück',()=>{
 for(const [key,value] of [['massnahmenstatus',undefined],['schema_version','2.0'],['status','unbekannt'],['hinweise',null]]){
  const candidate={...valid};
  if(value===undefined)delete candidate[key];else candidate[key]=value;
  assert.throws(()=>validate(candidate),/Cockpit-Format 1\.0/);
 }
});
