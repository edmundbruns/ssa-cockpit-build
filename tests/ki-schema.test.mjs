import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../src/dossier-ui.js',import.meta.url),'utf8');
const start=source.indexOf('function dossierKiResponseListen(');
const end=source.indexOf('\nasync function dossierKiImportResponse(',start);
assert(start>=0&&end>start,'KI-Schema-Prüfung muss in dossier-ui.js vorhanden sein');
const context={};
vm.runInNewContext(source.slice(start,end)+';globalThis.validate=dossierKiResponseListen;globalThis.dueDays=dossierKiDueDays;',context);
const validate=context.validate;
const valid10={schema_version:'1.0',status:'ok',ober_themen:[],fachverfahren:[],naechste_schritte:[],moegliche_fachstellen:[],massnahmenstatus:[],hinweise:[]};
const valid11={...valid10,schema_version:'1.1',ressourcen:[],beobachtungen:[],fremdangaben:[],hypothesen_prueffragen:[],offene_fragen:[],gespraechsimpulse:[],schutzaspekte:[]};

test('liest alte Antworten im Cockpit-Schema 1.0 rückwärtskompatibel',()=>{
 const result=JSON.parse(JSON.stringify(validate(valid10)));
 assert.equal(result.stepsInput.length,0);
 assert.deepEqual(result.analysis.ressourcen,[]);
});

test('liest 1.0-Aliasfelder weiter und vergibt keine Frist',()=>{
 const oldAlias={schema_version:'1.0',status:'ok',oberThemen:[],fachverfahren:[],next_steps:[{title:'Alter Schritt',description:'',responsibility:'SSA'}],moegliche_fachstellen:[],massnahmen_status:[],hinweise:[]};
 const result=JSON.parse(JSON.stringify(validate(oldAlias)));
 assert.equal(result.stepsInput[0].title,'Alter Schritt');
 assert.equal(context.dueDays(result.stepsInput[0].frist_tage),null);
});

test('nimmt das vollständige Reflexionsschema 1.1 an',()=>{
 const result=JSON.parse(JSON.stringify(validate(valid11)));
 assert.equal(result.analysis.hypothesen_prueffragen.length,0);
 assert.equal(result.analysis.schutzaspekte.length,0);
});

test('weist unvollständige oder ungültige Schemas verständlich zurück',()=>{
 for(const candidate of [
  {...valid11,ressourcen:undefined},
  {...valid11,zusatzfeld:'nicht unterstützt'},
  {...valid11,naechste_schritte:[{titel:'Schritt',beschreibung:'',zustaendigkeit:'SSA'}]},
  {...valid11,naechste_schritte:[{titel:'Schritt',beschreibung:'',zustaendigkeit:'SSA',frist_tage:'unbekannt'}]},
  {...valid11,naechste_schritte:[1,2,3,4].map(n=>({titel:String(n),beschreibung:'',zustaendigkeit:'SSA',frist_tage:null}))},
  {...valid10,massnahmenstatus:undefined},
  {...valid10,schema_version:'2.0'},
  {...valid10,status:'unbekannt'},
  {...valid10,hinweise:null}
 ])assert.throws(()=>validate(candidate),/KI-Antwort:/);
});

test('erfindet bei fehlender Frist keinen Termin',()=>{
 assert.equal(context.dueDays(null),null);
 assert.equal(context.dueDays(undefined),null);
 assert.equal(context.dueDays(''),null);
 assert.equal(context.dueDays(4),4);
 assert.equal(context.dueDays(-1),null);
 assert.equal(context.dueDays('morgen'),null);
});

const redactStart=source.indexOf('function dossierKiRedactText(');
const redactEnd=source.indexOf('\nfunction dossierKiKnownNames(',redactStart);
assert(redactStart>=0&&redactEnd>redactStart,'Datensparsame Textaufbereitung muss vorhanden sein');
const redactContext={};
vm.runInNewContext(source.slice(redactStart,redactEnd)+';globalThis.redact=dossierKiRedactText;',redactContext);

test('reduziert bekannte Namen, Kontakte, Datumsangaben, Dateinamen und Gesundheitsdetails',()=>{
 const input='PERSON_A traf PERSON_B am 14.09.2026. Aktennotiz.docx. Medizinische Einzelheiten wurden besprochen.';
 const output=redactContext.redact(input,['PERSON_A','PERSON_B']);
 for(const value of ['PERSON_A','PERSON_B','14.09.2026','Aktennotiz.docx','medizinische Einzelheiten'])assert.equal(output.includes(value),false,value+' darf nicht im reduzierten Text stehen');
 assert.match(output,/\[GESUNDHEITSANGABE AUSGELASSEN\.\]/);
});

const payloadSource=source.slice(redactStart,source.indexOf('\nfunction dossierKiPrompt(',redactStart));
const person={id:'x1',first:'PERSON_A',last:'PERSON_B',family:{contacts:[]}};
const events=[
 {id:'x2',participantIds:['x1'],date:'2026-09-14',type:'Gespräch',title:'Eintrag',content:'Ein allgemeiner Beispieltext.',className:'Klasse A'},
 {id:'x3',participantIds:['x1'],date:'2026-09-15',type:'Dokument',title:'Datei',content:'Beispielinhalt'}
];
const payloadContext={data:{students:[person],settings:{ssaTeam:[]}},selectedStudentId:'x1',legacyStudentEvents:()=>events,Dossier:{timeline:()=>events},dossierLegacyContent:e=>e.content};
vm.runInNewContext(payloadSource+';globalThis.makePayload=dossierKiPayload;',payloadContext);

test('reflektiert ausschließlich den gewählten Eintrag und überträgt keine Dokumentinhalte',()=>{
 const payload=JSON.stringify(payloadContext.makePayload(events[0]));
 for(const value of ['PERSON_A','PERSON_B','Beispielinhalt','2026-09-14','2026-09-15','Dokumenteintrag'])assert.equal(payload.includes(value),false,value+' darf nicht übertragen werden');
 assert.match(payload,/\"analysemodus\":\"einzeleintrag\"/);
 assert.match(payload,/Ein allgemeiner Beispieltext/);
 assert.equal(payload.includes('chronologie'),false);
 const documentPayload=JSON.stringify(payloadContext.makePayload(events[1]));
 assert.equal(documentPayload.includes('Beispielinhalt'),false);
 assert.match(documentPayload,/Dokumenttitel und Dokumentinhalt werden nicht übertragen/);
});

test('Prompt begrenzt Reflexion auf den Eintrag und macht fehlenden Kontext sichtbar',()=>{
 assert.match(source,/Reflexion genau eines Chronikeintrags/);
 assert.match(source,/Zusammenhänge, frühere Absprachen und Entwicklungen können deshalb fehlen/);
 assert.match(source,/Beziehe dich ausschließlich auf den Eintrag/);
});

test('Datenschutzdialog verspricht keine vollständige Anonymisierung und erlaubt die Sichtprüfung',()=>{
 assert.match(source,/nicht garantiert anonym/);
 assert.match(source,/1\. Anfrage prüfen, kopieren und der KI geben/);
 assert.match(source,/Antwort wird nach dem Speichern an dieser Kachel/);
 assert.match(source,/KI-Antwort speichern/);
 assert.match(source,/dossier-modal #dossierEditForm\{display:flex/);
 assert.match(source,/kiPrivacyReviewed/);
 assert.doesNotMatch(source,/Die Eingabe ist anonymisiert/);
});

test('neue Reflexionsfelder werden im Aktenverlauf beschriftet angezeigt',()=>{
 for(const label of ['Was hilft bereits?','Dokumentierte Beobachtungen','Angaben anderer Beteiligter','Mögliche Erklärungen prüfen','Was sollte ich klären?','Fragen für das Gespräch','Was muss ich zum Schutz prüfen?'])assert.ok(source.includes(label),label);
 assert.match(source,/Eintrag reflektieren/);
 assert.doesNotMatch(source,/dossierTags|timelineTags|dossierTagFilter|dossierPin|pinnedFor|Anheften|Stichwörter für Suche/);
});

test('akzeptiert einfache KI-Textlisten und benennt das fehlerhafte Feld',()=>{
 const result=validate({...valid11,ober_themen:['Belastung'],fachverfahren:['Gespräch']});
 assert.equal(result.topicsInput[0],'Belastung');
 assert.equal(result.proceduresInput[0],'Gespräch');
 assert.throws(()=>validate({...valid11,ober_themen:[42]}),/ober_themen/);
 assert.throws(()=>validate({...valid11,fachverfahren:['']}),/fachverfahren/);
 assert.throws(()=>validate({...valid11,ressourcen:null}),/ressourcen/);
});
