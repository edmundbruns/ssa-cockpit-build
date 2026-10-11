import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import '../src/dossier-core.js';

const D=globalThis.Dossier;
const html=fs.readFileSync(new URL('../src/index.html',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../src/dossier-ui.js',import.meta.url),'utf8');
const fixture=()=>D.normalize({settings:{currentSchoolYear:'2026/27',ssaTeam:['Testperson','Zweite Testperson']},students:[{id:'a',first:'Alva',last:'Testkind',active:true,className:'5a',schoolYear:'2026/27'},{id:'b',first:'Bero',last:'Testkind',active:true,className:'5a',schoolYear:'2026/27'}]});
const add=(state,extra={})=>D.addEntry(state,{date:'2026-09-15',type:'Schülergespräch',content:'Das Kind nennt ein gelingendes Spiel.',participantIds:['a'],responsible:'Testperson',...extra});

test('Nach Bearbeitung erscheinen neue Schutzfragen; frühere Prüfung bleibt nur in der Historie',()=>{
 const state=fixture(),entry=add(state);
 D.safetyCheck(state,entry.id,{decision:'kein_schutzauftrag',rationale:'Alter Sachverhalt geklärt'});
 D.editEntry(state,entry,{content:'Das Kind sagt, es wolle nicht mehr leben.'},'Zweite Testperson');
 assert.ok(entry.fachverfahren.some(v=>v.id==='selbstgefaehrdung'));
 assert.ok(entry.safetyStatus);
 assert.equal(entry.safetyCheck,undefined);
 assert.ok(entry.safetyCheckInvalidatedAt);
 assert.equal(entry.revisions[0].before.safetyCheck.rationale,'Alter Sachverhalt geklärt');
 assert.equal(state.tasks.length,0,'Ein Hinweis erzeugt keine automatische Aufgabe');
 D.safetyCheck(state,entry.id,{decision:'geprueft'});
 assert.equal(entry.safetyCheckInvalidatedAt,undefined);
});

test('Kosmetische Korrektur und Wechsel von dokumentierender Person lassen Schutzprüfung gültig',()=>{
 const state=fixture(),entry=add(state,{content:'Das Kind sagt, es wolle nicht mehr leben.'});
 D.safetyCheck(state,entry.id,{decision:'kein_schutzauftrag'});
 const checkedAt=entry.safetyCheck.checkedAt;
 D.editEntry(state,entry,{content:'Das Kind sagt: es wolle nicht mehr leben!',responsible:'Zweite Testperson',facilitators:['Testperson','Zweite Testperson'],referenceDate:'2026-09-14',since:'seit dem Gespräch'},'Testperson');
 assert.equal(entry.safetyCheck.checkedAt,checkedAt);
 assert.equal(entry.responsible,'Zweite Testperson');
 assert.equal(entry.revisions[0].author,'Testperson');
 assert.equal(entry.revisions[0].before.responsible,'Testperson');
 assert.deepEqual(entry.facilitators,['Testperson','Zweite Testperson']);
 assert.equal(entry.referenceDate,'2026-09-14');
 assert.equal(entry.since,'seit dem Gespräch');
});

test('Auch ergänzte Kindperspektiven und Fremdangaben lösen passende Schutzhinweise aus',()=>{
 for(const field of ['childView','otherView','observation','assessment','decision']){
  const state=fixture(),entry=add(state);
  D.editEntry(state,entry,{[field]:'Das Kind sagt, es wolle nicht mehr leben.'},'Testperson');
  assert.ok(entry.safetyStatus,field);
  assert.ok(entry.fachverfahren.some(v=>v.id==='selbstgefaehrdung'),field);
 }
});

test('Leere und ungültige Bearbeitung verändert weder Eintrag noch Historie',()=>{
 const state=fixture(),entry=add(state),before=structuredClone(entry);
 for(const changes of [{content:' '},{date:''},{date:'2026-02-31'}])assert.throws(()=>D.editEntry(state,entry,changes,'Testperson'));
 assert.deepEqual(entry,before);
});

test('Entfernter Chronikeintrag zählt nicht in der Statistik',()=>{
 const state=fixture(),entry=add(state,{duration:15});
 assert.equal(D.journalStats(state).length,1);
 entry.deletedAt='2026-09-16T10:00:00Z';
 assert.equal(D.journalStats(state).length,0);
 assert.equal(D.caseTimeline(state,'a').some(e=>e.id===entry.id),false);
});

test('Datei bleibt nach Entfernung des Ursprungs oder der Gruppenteilnahme als eigene Kachel sichtbar',()=>{
 const state=fixture(),entry=add(state,{participantIds:['a','b']}),doc={id:'doc-test',attachmentId:'file-test',studentId:'a',date:entry.date,eventKind:'Dokument',sourceEntryKey:'entry:'+entry.id};
 assert.equal(D.caseTimeline(state,'a',[doc]).filter(e=>e.eventKind==='Dokument').length,0);
 entry.participantIds=['b'];
 assert.equal(D.caseTimeline(state,'a',[doc]).filter(e=>e.eventKind==='Dokument').length,1);
 assert.equal(D.caseTimeline(state,'b').filter(e=>e.id===entry.id).length,1);
 entry.deletedAt='2026-09-16T10:00:00Z';
 assert.equal(D.caseTimeline(state,'a',[doc]).filter(e=>e.eventKind==='Dokument').length,1);
 assert.equal(doc.sourceEntryKey,'entry:'+entry.id,'Die frühere Zuordnung bleibt nachvollziehbar');
});

function kiContext(){
 const context={data:{students:[{id:'a',first:'Alva',last:'Testkind',guardian1:'Sina Beispielmutter'}],teachers:[{first:'Nora',last:'Beispielamt',displayName:'Beispielamt, Nora'}],relatedPersons:[{name:'Reto Netzwerkperson'}],settings:{ssaTeam:['Testperson']}},selectedStudentId:'a'};
 const start=ui.indexOf('function dossierKiRedactText('),end=ui.indexOf('\nfunction dossierKiPrompt(',start);
 vm.runInNewContext(ui.slice(start,end)+';globalThis.redact=dossierKiRedactText;globalThis.names=dossierKiKnownNames;globalThis.payload=dossierKiPayload;',context);
 return context;
}

test('KI entfernt registrierte Personen, verschiedene Telefonnummern und Anschriften in allen Promptfeldern',()=>{
 const k=kiContext(),content='Nora Beispielamt traf Sina und Reto Netzwerkperson. Telefon 049 61 123456, +49 (0) 4961 / 123456, 0049 4961 123456. Am Markt 12, Musterstraße 7. nora@example.invalid.';
 const result=JSON.stringify(k.payload({participantIds:['a'],content,oberThemen:['Nora Beispielamt am Am Markt 12'],fachverfahren:[{title:'Reto Netzwerkperson'}]}));
 for(const value of ['Nora','Beispielamt','Sina','Reto','Netzwerkperson','049 61','123456','Am Markt','Musterstraße','example.invalid'])assert.equal(result.includes(value),false,value);
 assert.match(result,/\[TELEFON\]/);
 assert.match(result,/\[ANSCHRIFT\]/);
});

test('KI lässt medizinische Einzelangaben aus und erhält Schutztext mit Prüfhinweis',()=>{
 const k=kiContext();
 const text=k.redact('Das Kind sagt nach dem ärztlichen Termin, es wolle nicht mehr leben. Medizinische Einzelheiten wurden besprochen.');
 assert.match(text,/es wolle nicht mehr leben/);
 assert.match(text,/Quelle und Zusammenhang im Original prüfen/);
 assert.equal(/ärztlich|medizinische Einzelheiten/iu.test(text),false);
 assert.match(text,/GESUNDHEITSANGABE AUSGELASSEN/);
 const mixed=k.redact('Der psychiatrische Befund nennt Suizidgedanken.');
 assert.match(mixed,/Suizidgedanken/);
 assert.equal(/psychiatrisch|Befund/iu.test(mixed),false);
});

test('Einzelprompt enthält nur fachliche Felder und die individuelle Notiz des ausgewählten Kindes',()=>{
 const k=kiContext(),entry={id:'TECHNISCHE_ID',participantIds:['a','b'],content:'GEMEINSAMER_INHALT',childView:'KINDPERSPEKTIVE',dateBasis:'TECHNISCHE_QUELLE',sourceEntryKey:'TECHNISCHER_VERWEIS',individualNotes:{a:'NOTIZ_FUER_A',b:'FREMDE_NOTIZ_B'},revisions:[{before:{content:'ALTE_FASSUNG'}}],kiAnalysis:{text:'ALTE_KI_ANTWORT'}};
 const result=JSON.stringify(k.payload(entry));
 for(const value of ['GEMEINSAMER_INHALT','KINDPERSPEKTIVE','NOTIZ_FUER_A'])assert.ok(result.includes(value),value);
 for(const value of ['TECHNISCHE_ID','TECHNISCHE_QUELLE','TECHNISCHER_VERWEIS','FREMDE_NOTIZ_B','ALTE_FASSUNG','ALTE_KI_ANTWORT'])assert.equal(result.includes(value),false,value);
 assert.equal(JSON.stringify(k.payload({...entry,type:'Dokument',title:'datei.pdf'})).includes('GEMEINSAMER_INHALT'),false);
});

test('Gesamtprompt kennzeichnet Planung und Aufgabenstatus, ohne Termine doppelt oder alte KI-Ausgaben zu senden',()=>{
 const k=kiContext();
 k.currentCaseForStudent=()=>({status:'Klärungsphase',reason:'Gespräch'});
 k.caseTimeline=()=>[
  {key:'entry:plan',type:'Schülergespräch',title:'PLAN_BELEG',content:'Gespräch vorbereiten',planned:true,participantIds:['a']},
  {key:'appointment:plan',type:'Geplanter Termin',title:'PLAN_BELEG',content:'Durchführung noch nicht bestätigt'},
  {key:'task:offen',eventKind:'Nächster Schritt',title:'OFFENE_AUFGABE',task:true,done:false,status:'offen'},
  {key:'task:fertig',eventKind:'Nächster Schritt',title:'ERLEDIGTE_AUFGABE',task:true,done:true,status:'erledigt'},
  {key:'ai-reflection:alt',aiReflection:true,content:'ALTE_KI_AUSGABE'},
  {key:'legacy:doc',eventKind:'Dokument',content:'DOKUMENTINHALT'}
 ];
 const start=html.indexOf('function redactFullCaseText('),end=html.indexOf('\nfunction openAiPrompt(',start);
 vm.runInNewContext(html.slice(start,end)+';globalThis.fullPrompt=buildAiPrompt;',k);
 const prompt=k.fullPrompt('a');
 assert.equal(prompt.split('PLAN_BELEG').length-1,1);
 assert.match(prompt,/Geplant, Durchführung noch nicht bestätigt/);
 assert.match(prompt,/Nächster Schritt \(offen\)\. OFFENE_AUFGABE/);
 assert.match(prompt,/Nächster Schritt \(erledigt\)\. ERLEDIGTE_AUFGABE/);
 assert.equal(prompt.includes('ALTE_KI_AUSGABE'),false);
 assert.equal(prompt.includes('DOKUMENTINHALT'),false);
 assert.match(k.payload(k.caseTimeline()[0]).eintrag.status,/Geplant/);
});

function importContext(){
 const state=fixture(),context={data:state,Date,Map,Set,Number,Array,String,Math,Error,clean:v=>String(v||''),fmt:v=>v,id:D.uid,numberGerman:v=>Number(String(v||'').replace(',','.'))||0};
 const from=html.indexOf('function applyWebUntisClass('),to=html.indexOf('function detectDelimitedSeparator(',from);
 const headersFrom=html.indexOf('function headerKey('),headersTo=html.indexOf('\nfunction splitOfficialName(',headersFrom);
 context.matchSignalStudent=(id)=>state.students.find(s=>s.id===id);
 vm.runInNewContext(html.slice(headersFrom,headersTo)+html.slice(from,to)+';globalThis.aggregate=aggregateWebUntisRows;globalThis.upsert=upsertSchoolSignal;globalThis.parseDate=parseSignalDate;',context);
 return context;
}
const columns=['Schüler*innen','Externe Id','Klasse','Datum','Fehlstd.','Fehlmin.','Lehrkraft','Fach','Abwesenheitsgrund','ENr','Abwesenheit zählt','Status','Fehltage'];
const csvRow=(id='a',date='15.09.2026',counted='TRUE')=>['Testkind, Alva',id,'5a',date,'1','45','Testlehrkraft','Fach','Testanlass','e1',counted,'Offen','1'];

test('WebUntis-Korrektur zu nicht gezählter Abwesenheit ersetzt positive Werte durch null',()=>{
 const k=importContext(),headers=columns.map(k.headerKey);
 const first=k.aggregate([columns,csvRow()],headers,{name:'synthetisch.csv'}).records[0];k.upsert(first);
 Object.assign(first,{reviewStatus:'Geprüft',reviewedBy:'Testperson',reviewNote:'Alte Prüfung'});
 const correction=k.aggregate([columns,csvRow('a','15.09.2026','FALSE')],headers,{name:'synthetisch-korrektur.csv'}).records;
 assert.equal(correction.length,1);
 k.upsert(correction[0]);
 const saved=k.data.schoolSignals[0];
 assert.equal(k.data.schoolSignals.length,1);
 assert.equal(saved.id,first.id);
 for(const field of ['absences','absenceMinutes','absenceDays','openAbsences','openMinutes','unexcused'])assert.equal(saved[field],0,field);
 assert.equal(saved.dailyAbsences[0].absenceMinutes,0);
 assert.equal(saved.reviewStatus,'Noch nicht geprüft');
 assert.equal(saved.reviewNote,'');
});

test('Gemischte WebUntis-Zeilen zählen nur bestätigte Abwesenheiten und verändern andere Personen nicht',()=>{
 const k=importContext(),headers=columns.map(k.headerKey);
 const other=k.aggregate([columns,csvRow('b')],headers,{name:'synthetisch-b.csv'}).records[0];k.upsert(other);
 const records=k.aggregate([columns,csvRow(),csvRow('a','16.09.2026','FALSE')],headers,{name:'synthetisch-a.csv'}).records;
 assert.equal(records.length,1);
 assert.equal(records[0].absenceMinutes,45);
 assert.equal(records[0].absenceDays,1);
 assert.equal(records[0].dailyAbsences.find(d=>d.date==='2026-09-16').absenceMinutes,0);
 k.upsert(records[0]);
 assert.equal(k.data.schoolSignals.find(r=>r.studentId==='b').absenceMinutes,45);
});

test('Unmögliche WebUntis-Daten werden vor Speicherung zurückgewiesen',()=>{
 const k=importContext();
 for(const value of ['31.02.2026','2026-02-31','99.09.2026'])assert.equal(k.parseDate(value),'');
 assert.throws(()=>k.aggregate([columns,csvRow('a','31.02.2026')],columns.map(k.headerKey),{name:'synthetisch.csv'}),/Ungültiges Datum/);
 assert.equal(k.data.schoolSignals.length,0);
});
