const {JSDOM,VirtualConsole}=require('jsdom');
const assert=require('assert/strict');
const root=require('path').resolve(__dirname,'..');
const results=[],errors=[];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let saved='',downloads=[],alerts=[];
async function boot(){
 const vc=new VirtualConsole();
 vc.on('jsdomError',e=>{if(!/Not implemented|Could not parse CSS stylesheet/.test(e.message))errors.push({message:e.message,stack:e.cause?.stack||e.detail?.stack||'',phase:vc.auditPhase||'test'});});
 vc.on('error',(...a)=>errors.push(a.map(String).join(' ')));
 const dom=await JSDOM.fromFile(root+'/src/index.html',{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.structuredClone=structuredClone;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.URL.createObjectURL=()=>'';w.URL.revokeObjectURL=()=>{};w.alert=m=>alerts.push(String(m));w.prompt=()=>null;
  w.fetch=async()=>{throw Error('Kein Netzwerk im isolierten Funktionstest');};
  w.__TAURI__={core:{invoke:async(cmd,args)=>{
   if(cmd==='vault_status')return {configured:true,unlocked:false};
   if(cmd==='save_state'){saved=args.stateJson;return {ok:true};}
   if(cmd==='unlock_vault')return {stateJson:saved};
   if(cmd==='list_attachments')return [];
   if(cmd==='vault_location')return {database:'Pruefumgebung',backupDir:'Pruefumgebung',backups:[]};
   if(cmd==='write_backup')return {path:'Pruefumgebung/'+args.fileName,size:1,count:1};
   return {ok:true};
  }}};
 }});
 const w=dom.window;await new Promise(r=>w.document.readyState==='complete'?r():w.addEventListener('load',r));await sleep(15);
 w.appAlert=m=>{alerts.push(String(m));return Promise.resolve();};
 w.appConfirm=async()=>true;w.appPrompt=async()=>'Synthetischer Loeschtest';
 w.download=(name,content,mime)=>downloads.push({name,content,mime});
 return {dom,w,vc};
}
function fixture(w){
 w.eval(`data=Dossier.normalize({...structuredClone(seed),students:[
  {id:'audit-a',first:'Alva',last:'Testkind',className:'5a',schoolYear:'2026/27',active:true,enrollments:[{className:'5a',schoolYear:'2026/27',validFrom:'2026-08-01'}]},
  {id:'audit-b',first:'Bero',last:'Testkind',className:'SKG 1',schoolYear:'2026/27',active:true,enrollments:[{className:'SKG 1',schoolYear:'2026/27',validFrom:'2026-08-01'}]}
 ],teachers:[{id:'audit-teacher',first:'Nora',last:'Beispielamt',classLead:'5a',roles:['Klassenleitung'],status:'aktiv'}],cases:[],contacts:[],tasks:[],journal:[],settings:{...seed.settings,ssaTeam:['Pruefperson','Zweitperson'],activeUser:'Pruefperson',classLeads:{},currentSchoolYear:'2026/27',dossierVersion:1,classWeeklyPlans:{}}});
 for(const s of data.students)Dossier.zugangswegSetzen(data,s.id,'schueler_selbst','2026-09-15');
 vaultReady=true;document.getElementById('authGate').classList.add('hidden');renderAll();showStudent('audit-a');`);
 alerts=[];downloads=[];
}
function observe(id,category,o){
 results.push({id,category,observation:o});
 if(id.startsWith('NAV-')){assert.equal(o.active,id.slice(4));assert.equal(o.errors,0);return;}
 switch(id){
  case 'LEERE-EINGABE': assert.equal(o.journalEntries,0);assert.equal(o.dialogRemainsOpen,true);assert.match(o.message,/Inhalt/);break;
  case 'KI-GESAMTFALL': case 'FUSSZEILEN-DRUCK': assert.equal(o.newConversationIncluded,true);break;
  case 'FALLSUCHE-JOURNAL': assert.equal(o.caseFound,true);break;
  case 'FALLABSCHLUSS-AUFGABEN': assert.equal(o.inDossier,1);assert.equal(o.inClosure,1);break;
  case 'EDIT-AUTOR': assert.equal(o.saved,o.requested);assert.equal(o.contentSaved,true);break;
  case 'EDIT-SCHUTZHINWEIS': assert.ok(o.savedSafetyStatus);assert.equal(o.cardHasSafetyFlag,true);assert.equal(o.todayHasSafetyQuestion,true);break;
  case 'EDIT-ALTE-SCHUTZPRUEFUNG': assert.equal(o.currentCheck,false);assert.equal(o.currentCheckedBadge,false);assert.equal(o.oldReviewInHistory,true);break;
  case 'KI-RESTANGABEN': for(const bad of ['Nora','Beispielamt','049 61','123456','example.invalid','Am Markt']){assert.equal(JSON.stringify(o.singlePayload).includes(bad),false,bad);assert.equal(o.fullRedaction.includes(bad),false,bad);}break;
  case 'KI-MEDIZINFILTER': for(const value of [o.single,o.full]){assert.match(value,/nicht mehr leben/);assert.match(value,/im Original prüfen/);assert.equal(value.includes('ärztlichen Termin'),false);}break;
  case 'DELETE-DOKUMENT': assert.equal(o.recordRetained,1);assert.equal(o.visibleDocuments,1);assert.equal(o.visibleOrigin,false);break;
  case 'CSV-GELOESCHT': assert.equal(o.deletedEntryIncluded,false);assert.equal(o.csv.split('\n').length,1);break;
  case 'ALTSTATISTIK-GELOESCHT': assert.equal(o.journalStats,0);assert.equal(o.actualJournalEntries,0);break;
  case 'CSV-DOPPELT-UND-ZEITRAUM': assert.equal(o.rows.length,2);assert.equal(o.rows.join('').includes('Vorjahr'),false);break;
  case 'IMPORT-POSITIV': assert.equal(o.records,1);assert.equal(o.minutes,45);break;
  case 'IMPORT-ZURUECKGENOMMEN': assert.equal(o.retainedMinutes,0);assert.equal(o.rangeSummary.rate,0);assert.equal(o.rangeSummary.complete,true);break;
  case 'IMPORT-UEBERLAPPUNG': assert.equal(o.minutes,45);assert.equal(o.complete,true);assert.equal(o.rate,25);break;
  case 'GRUPPENZUORDNUNG': assert.equal(o.storedEntries,1);assert.equal(o.firstVisible,1);assert.equal(o.secondVisible,1);break;
  case 'ANONYM-JAHRGAENGE': for(const grade of ['SKG','1','2','3','4','5','10'])assert.ok(o.options.includes(grade));break;
  case 'REVISION-WACHSTUM': assert.equal(o.hasNestedRevision,false);assert.ok(o.bytesByRevision.at(-1)<o.bytesByRevision[0]*12,'Historie wächst nicht exponentiell');break;
  case 'NEULADEN-MOCK': assert.equal(o.before,o.after);assert.match(o.after,/PERSISTENZ_BELEG/);break;
  case 'RUNTIME-VOR-NEULADEN': assert.deepEqual(o,[]);break;
  case 'RUNTIME-FEHLER': assert.deepEqual(o.filter(e=>e.phase!=='teardown'),[]);break;
 }
}
async function form(w,values){
 const f=w.document.getElementById('dossierEditForm');
 for(const [k,v]of Object.entries(values)){const e=f.elements.namedItem(k);if(!e)throw Error('Missing form field '+k);e.value=v;}
 const z=f.querySelector('[data-merkmal=zugangsweg][data-pflicht] input');if(z&&!f.querySelector('[data-merkmal=zugangsweg] input:checked'))z.checked=true;
 await f.onsubmit({preventDefault(){},target:f});await sleep(15);return alerts.slice();
}
async function imported(w,csv,name='audit-webuntis.csv'){
 w.importSchoolSignals({target:{files:[new w.File([csv],name,{type:'text/csv'})],value:''}});
 for(let i=0;i<50;i++){if(w.eval('offenerFehlzeitenImport!==null'))return w.eval('offenerFehlzeitenImport');await sleep(10);}
 throw Error('Import preview missing: '+alerts.join(' | '));
}
(async()=>{
 const {dom,w,vc}=await boot();fixture(w);
 for(const id of w.eval('Object.keys(SEITEN_RENDER)')){w.eval(`seitenVeraltet.add('${id}');go('${id}')`);observe('NAV-'+id,'positive',{active:w.document.querySelector('.page.active')?.id,errors:errors.length});}
 fixture(w);w.dossierEntry('event');await form(w,{content:'',date:'2026-09-15'});observe('LEERE-EINGABE','positive',{journalEntries:w.eval('data.journal.length'),dialogRemainsOpen:w.document.getElementById('dossierEditModal').classList.contains('open'),message:alerts.at(-1)});w.closeModal('dossierEditModal');fixture(w);w.dossierEntry('event');await form(w,{content:'NEUER_GESPRAECHSBELEG: Das Kind nennt ein gelingendes Spiel.',date:'2026-09-15',title:'Erfundenes Gespraech'});
 const e=w.eval('data.journal.at(-1)');const prompt=w.buildAiPrompt('audit-a');
 observe('KI-GESAMTFALL','confirmed',{journalEntries:w.eval('data.journal.length'),timelineEntries:w.eval("Dossier.timeline(data,'audit-a',legacyStudentEvents('audit-a')).length"),legacyEvents:w.studentEvents('audit-a').length,newConversationIncluded:prompt.includes('NEUER_GESPRAECHSBELEG'),payload:prompt.split('BEREITGESTELLTER FALLVERLAUF')[1]});
 w.printDocument=(_title,body)=>{w.auditPrint=body};w.printStudentOverview();observe('FUSSZEILEN-DRUCK','confirmed',{newConversationIncluded:w.auditPrint.includes('NEUER_GESPRAECHSBELEG')});
 w.document.getElementById('caseSearch').value='NEUER_GESPRAECHSBELEG';w.renderCases();
 observe('FALLSUCHE-JOURNAL','confirmed',{conversationExists:!!e,caseFound:w.document.getElementById('caseTable').textContent.includes('Alva')});w.document.getElementById('caseSearch').value='';
 w.eval(`Dossier.addTask(data,{title:'Synthetisch offene Aufgabe',assignedTo:'Pruefperson',participantIds:['audit-a'],caseId:'',sourceEntryKey:'entry:${e.id}'});`);
 observe('FALLABSCHLUSS-AUFGABEN','confirmed',{inDossier:w.eval("Dossier.work(data,'audit-a').filter(t=>!t.done).length"),inClosure:w.fallAbschlussPruefen('audit-a').offeneAufgaben.length});
 w.dossierEntry('edit','entry:'+e.id);await form(w,{responsible:'Zweitperson',content:'Nachbearbeiteter synthetischer Inhalt'});
 observe('EDIT-AUTOR','confirmed',{requested:'Zweitperson',saved:e.responsible,contentSaved:e.content.includes('Nachbearbeiteter')});
 w.dossierEntry('edit','entry:'+e.id);await form(w,{content:'Das Kind sagt, es wolle nicht mehr leben.'});
 w.renderToday();observe('EDIT-SCHUTZHINWEIS','confirmed',{liveDetection:w.Dossier.safetyHint(e.content),savedSafetyStatus:e.safetyStatus,savedProcedures:e.fachverfahren,cardHasSafetyFlag:!!w.document.getElementById('ds-entry:'+e.id)?.querySelector('.dossier-safety-flag'),todayHasSafetyQuestion:!!w.document.querySelector('#todayWorkspace .today-protection')});
 w.Dossier.safetyCheck(w.eval('data'),e.id,{decision:'kein_schutzauftrag',rationale:'Fruehere synthetische Einschaetzung'});
 w.dossierEntry('edit','entry:'+e.id);await form(w,{content:'Neuer Anlass: Das Kind sagt heute, es wolle sich umbringen.'});
 observe('EDIT-ALTE-SCHUTZPRUEFUNG','confirmed',{currentCheck:!!e.safetyCheck,currentCheckedBadge:!!w.document.getElementById('ds-entry:'+e.id).querySelector('.dossier-safety-flag.geprueft'),oldReviewInHistory:e.revisions.some(r=>r.before?.safetyCheck?.decision==='kein_schutzauftrag')});
 const single=w.dossierKiPayload({...e,content:'Nora Beispielamt bespricht ein Beispiel. Telefon: 049 61 123456. E-Mail: nora@example.invalid. Anschrift: Am Markt 12.',oberThemen:['Nora Beispielamt: Beispielthema']});
 const full=w.redactFullCaseText('Nora Beispielamt bespricht ein Beispiel. Telefon: 049 61 123456. E-Mail: nora@example.invalid. Anschrift: Am Markt 12.');
 observe('KI-RESTANGABEN','risk',{singlePayload:single,fullRedaction:full,registeredTeacher:w.eval('teacherName(data.teachers[0])')});
 const important='Das Kind sagt nach dem ärztlichen Termin, es wolle nicht mehr leben.';
 observe('KI-MEDIZINFILTER','risk',{original:important,single:w.dossierKiRedactText(important),full:w.redactFullCaseText(important)});
 fixture(w);w.dossierEntry('event');await form(w,{content:'Dokumentbezug im synthetischen Beispiel.',date:'2026-09-15'});
 const docEntry=w.eval('data.journal.at(-1)');w.eval(`data.documentEvents.push({id:'audit-doc',attachmentId:'audit-pdf',studentId:'audit-a',name:'audit.pdf',date:'2026-09-15',sourceEntryKey:'entry:${docEntry.id}'});`);
 await w.dossierDeleteEntry(docEntry.id);
 observe('DELETE-DOKUMENT','confirmed',{recordRetained:w.eval('data.documentEvents.length'),linkedToDeletedEntry:w.eval('data.documentEvents[0].sourceEntryKey'),visibleDocuments:w.eval("Dossier.timeline(data,'audit-a',legacyStudentEvents('audit-a')).filter(x=>x.eventKind==='Dokument').length"),visibleOrigin:w.eval(`Dossier.timeline(data,'audit-a',legacyStudentEvents('audit-a')).some(x=>x.id==='${docEntry.id}')`)});
 w.renderStats();observe('ALTSTATISTIK-ANZEIGE','confirmed',{volume:w.document.getElementById('statContactMix').textContent});w.exportCSV();observe('CSV-GELOESCHT','confirmed',{deletedEntryIncluded:downloads.at(-1).content.includes('Dokumentbezug'),csv:downloads.at(-1).content});
 observe('ALTSTATISTIK-GELOESCHT','confirmed',{journalStats:w.eval('Dossier.journalStats(data).length'),actualJournalEntries:w.eval('data.journal.filter(e=>!e.deletedAt).length')});
 fixture(w);w.eval(`const tr={id:'audit-training',studentId:'audit-a',date:'2026-09-16',reason:'Synthetischer Trainingsraum',duration:15,schoolYear:'2026/27'};data.trainingRoom.push(tr);const je=Dossier.addEntry(data,{participantIds:['audit-a'],date:tr.date,type:'Trainingsraumbesuch',content:'Synthetischer Trainingsraum',duration:15,sourceTrainingRoomId:tr.id});tr.journalEntryId=je.id;Dossier.addEntry(data,{participantIds:['audit-a'],date:'2025-09-15',type:'Schülergespräch',content:'Vorjahr',duration:10});`);
 w.exportCSV();observe('CSV-DOPPELT-UND-ZEITRAUM','confirmed',{filename:downloads.at(-1).name,rows:downloads.at(-1).content.split('\n')});
 fixture(w);w.eval(`data.settings.classWeeklyPlans={'5a':{'1':45,'2':45,'3':45,'4':45,'5':45},'SKG 1':{'1':45,'2':45,'3':45,'4':45,'5':45}};`);const headers=['Schüler*innen','Externe Id','Klasse','Datum','Fehlstd.','Fehlmin.','Lehrkraft','Fach','Abwesenheitsgrund','ENr','Abwesenheit zählt','Status','Fehltage'];
 const row=['Testkind, Alva','audit-a','5a','15.09.2026','1','45','Prueflehrkraft','Prueffach','Synthetische Fehlzeit','x1','TRUE','Offen','1'];
 await imported(w,[headers.join('\t'),row.join('\t')].join('\n'));w.fehlzeitenImportBestaetigen();await sleep(20);
 observe('IMPORT-POSITIV','positive',{records:w.eval('data.schoolSignals.length'),minutes:w.eval('data.schoolSignals[0].absenceMinutes')});
 row[10]='FALSE';await imported(w,[headers.join('\t'),row.join('\t')].join('\n'),'audit-korrektur.csv');const zeroPreview=w.eval('offenerFehlzeitenImport.records.length');w.fehlzeitenImportBestaetigen();await sleep(20);
 observe('IMPORT-ZURUECKGENOMMEN','confirmed',{newCountedRecords:zeroPreview,retainedRecords:w.eval('data.schoolSignals.length'),retainedMinutes:w.eval('data.schoolSignals[0].absenceMinutes'),currentCoverage:w.eval('data.settings.signalImportRanges'),rangeSummary:w.eval("absenceRangeSummary(data.schoolSignals,'2026-09-15','2026-09-15','5a')")});
 fixture(w);w.eval(`data.settings.classWeeklyPlans={'5a':{'1':45,'2':45,'3':45,'4':45,'5':45}};`);
 const previousDays=['14.09.2026','15.09.2026','16.09.2026'].map(date=>{const r=row.slice();r[3]=date;r[10]='TRUE';return r.join('\t');});
 await imported(w,[headers.join('\t'),...previousDays].join('\n'),'audit-range-original.csv');w.fehlzeitenImportBestaetigen();await sleep(20);
 const correctedDays=['15.09.2026','17.09.2026'].map(date=>{const r=row.slice();r[3]=date;r[10]='FALSE';return r.join('\t');});
 await imported(w,[headers.join('\t'),...correctedDays].join('\n'),'audit-range-correction.csv');w.fehlzeitenImportBestaetigen();await sleep(20);
 observe('IMPORT-UEBERLAPPUNG','positive',w.eval("absenceRangeSummary(data.schoolSignals,'2026-09-14','2026-09-17','5a')"));
 fixture(w);w.eval(`Dossier.addEntry(data,{participantIds:['audit-a','audit-b'],date:'2026-09-15',type:'Gruppengespräch',content:'Gemeinsames synthetisches Beispiel'});`);w.showStudent('audit-b');
 observe('GRUPPENZUORDNUNG','positive',{storedEntries:w.eval('data.journal.length'),firstVisible:w.eval("Dossier.timeline(data,'audit-a',legacyStudentEvents('audit-a')).filter(e=>e.key.startsWith('entry:')).length"),secondVisible:w.eval("Dossier.timeline(data,'audit-b',legacyStudentEvents('audit-b')).filter(e=>e.key.startsWith('entry:')).length")});
 observe('ANONYM-JAHRGAENGE','confirmed',{options:[...w.document.getElementById('quickContactGrade').options].map(o=>o.value),primaryAndSKGSelectable:[...w.document.getElementById('quickContactGrade').options].some(o=>o.value==='1'||o.value==='SKG')});
 const members=Array.from({length:11},(_,i)=>({id:'g-'+i,first:'Test'+i,last:'Gruppenkind',className:'5a',schoolYear:'2026/27',active:true}));
 w.eval(`data=Dossier.normalize({...structuredClone(seed),students:${JSON.stringify(members)},settings:{...seed.settings,ssaTeam:['Pruefperson'],activeUser:'Pruefperson'}});`);
 const group=w.eval(`Dossier.addEntry(data,{participantIds:data.students.map(s=>s.id),date:'2026-09-15',type:'Gruppengespräch',content:'Synthetischer Loeschtest mit elf Kindern.'})`);const sizes=[Buffer.byteLength(JSON.stringify(group),'utf8')];
 for(let i=0;i<8;i++){w.showStudent('g-'+i);await w.dossierDeleteEntry(group.id);sizes.push(Buffer.byteLength(JSON.stringify(group),'utf8'));}
 observe('REVISION-WACHSTUM','risk',{removedParticipants:8,bytesByRevision:sizes,hasNestedRevision:!!group.revisions.at(-1).before.revisions});
 fixture(w);w.dossierEntry('event');await form(w,{content:'PERSISTENZ_BELEG: Fiktiver Test.',date:'2026-09-15'});await w.eval('persistState()');
 const originalSaved=saved;await sleep(800);observe('RUNTIME-VOR-NEULADEN','positive',errors.slice());vc.auditPhase='teardown';dom.window.close();
 const second=await boot();await second.w.document.getElementById('unlockVaultForm').onsubmit({preventDefault(){}});await sleep(50);
 observe('NEULADEN-MOCK','positive',{before:JSON.parse(originalSaved).journal.at(-1).content,after:second.w.eval('data.journal.at(-1).content'),nativeStorageTested:false});
 await sleep(300);second.vc.auditPhase='teardown';second.dom.window.close();await sleep(100);
 observe('RUNTIME-FEHLER','boundary',errors);
 console.log('Prüfung: '+results.length+' Ablaufprüfungen mit erfundenen Daten bestanden.');
})().catch(e=>{console.error(e.stack);process.exitCode=1;setTimeout(()=>process.exit(1),100);});
