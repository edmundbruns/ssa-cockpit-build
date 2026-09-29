/* Oberflächenprüfung 0.12.2
   Lädt src/index.html mit allen Skriptdateien als echte, getrennte <script>-Elemente – genau wie in der Desktop-App.
   Dadurch gilt 'use strict' je Datei, und fehlende Deklarationen fallen auf. Der Datentresor ist nachgebildet;
   save_state antwortet absichtlich langsam, damit ein blockierender Dialog auffällt. */
const {JSDOM,VirtualConsole}=require('jsdom');
const path=require('path');
const assert=require('assert/strict');

const SAVE_DELAY=600;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
 const errors=[],vc=new VirtualConsole();
 vc.on('jsdomError',e=>{const m=String(e.message||e);if(!/Not implemented|Could not parse CSS stylesheet/.test(m))errors.push(m);});
 const file=path.resolve(__dirname,'..','src','index.html');
 const dom=await JSDOM.fromFile(file,{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.structuredClone=structuredClone;w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.URL.createObjectURL=()=>'';w.URL.revokeObjectURL=()=>{};w.alert=()=>{};w.prompt=()=>null;
  w.__saved=null;w.__saveCalls=0;w.__failSave=false;
  w.__TAURI__={core:{invoke:async(cmd,args)=>{
   if(cmd==='vault_status')return {configured:true,unlocked:false};
   if(cmd==='save_state'){w.__saveCalls++;await sleep(SAVE_DELAY);if(w.__failSave)throw 'Datenträger voll (Test)';JSON.parse(args.stateJson);w.__saved=args.stateJson;return {ok:true};}
   if(cmd==='vault_location')return {database:'x',backupDir:'x',backups:[]};
   if(cmd==='write_backup')return {path:'x/'+args.fileName,size:1,count:1};
   if(cmd==='list_attachments')return [];
   return {ok:true};}}};
 }});
 const w=dom.window;
 await new Promise(r=>w.document.readyState==='complete'?r():w.addEventListener('load',r));
 await sleep(50);
 const run=code=>w.eval(code);
 const saved=()=>JSON.parse(w.__saved||'{}');
 const isOpen=id=>w.document.getElementById(id).classList.contains('open');
 const waitSaved=async()=>{for(let i=0;i<100;i++){if(run('document.getElementById("saveStatus").dataset.state')==='gespeichert'&&!run('persistLauf'))return;await sleep(50);}throw Error('Speichern wurde nicht abgeschlossen');};

 // Programmstand wie nach dem Entsperren
 run(`data=Dossier.normalize({...structuredClone(seed),students:[
   {id:'s1',first:'Anna',last:'Beispiel',className:'5a',schoolYear:'2026/27',active:true,enrollments:[{className:'5a',schoolYear:'2026/27',validFrom:'2026-08-01'}]},
   {id:'s2',first:'Bert',last:'Beispiel',className:'5a',schoolYear:'2026/27',active:true},
   {id:'s3',first:'Cem',last:'Muster',className:'6b',schoolYear:'2026/27',active:true}],
   teachers:[],cases:[],contacts:[],tasks:[],journal:[],settings:{...seed.settings,currentSchoolYear:'2026/27',dossierVersion:1}});
   vaultReady=true;document.getElementById('authGate').classList.add('hidden');renderAll();`);
 assert.equal(run('typeof pendingYearChange'),'object','pendingYearChange ist deklariert');
 console.log('laden als echte Skriptdateien ok');

 // 1. Dialoge: Innenabstand und Scrollbereich gelten auch, wenn Kopf/Inhalt/Fuß in einem <form> liegen
 run(`openModal('taskModal')`);
 const body=w.document.querySelector('#taskModal .dialogbody'),foot=w.document.querySelector('#taskModal .dialogfoot');
 assert(body.closest('form'),'Aufgabendialog nutzt ein Formular');
 const cb=w.getComputedStyle(body),cf=w.getComputedStyle(foot);
 assert.equal(cb.paddingLeft,'24px','Inhalt hat Abstand zum linken Rand');
 assert.equal(cb.overflowY,'auto','Inhalt scrollt unabhängig');
 assert.equal(cf.paddingLeft,'24px','Fußbereich hat Abstand zum linken Rand');
 assert.equal(cf.justifyContent,'flex-end','Abschlussknöpfe stehen rechts');
 run(`closeModal('taskModal')`);
 // Vollbild bleibt nach dem Schließen nicht hängen
 run(`selectedStudentId='s1';showStudent('s1');dossierEntry('event')`);
 await sleep(20);
 w.document.querySelector('#dossierEditModal .dossier-maximize').click();
 assert(w.document.getElementById('dossierEditModal').classList.contains('maximized'));
 run(`closeModal('dossierEditModal')`);
 assert(!w.document.getElementById('dossierEditModal').classList.contains('maximized'),'Vollbild wird beim Schließen zurückgesetzt');
 assert.equal(w.document.querySelector('#dossierEditModal .dossier-maximize').textContent,'⛶ Vollbild');
 run(`closeModal('studentModal')`);
 console.log('dialoge ok');

 // 2. Speichern blockiert nicht: Dialog schließt sofort, Daten kommen trotzdem im Tresor an
 const t0=Date.now();
 run(`openPromise('s1')`);
 const pf=w.document.getElementById('promiseForm');pf.elements.title.value='Rückruf Mutter';
 pf.requestSubmit();
 await sleep(30);
 assert(!isOpen('promiseModal'),'Zusage-Dialog schließt ohne auf den Tresor zu warten');
 assert(Date.now()-t0<SAVE_DELAY,'Dialog war nicht blockiert');
 assert.equal(run('document.getElementById("saveStatus").textContent'),'Speichert …');
 await waitSaved();
 assert(saved().tasks.some(t=>t.title==='Rückruf Mutter'&&t.kind==='zusage'),'Zusage liegt im Tresor');
 // Chronikeintrag neu
 run(`selectedStudentId='s1';showStudent('s1');dossierEntry('event')`);
 let f=w.document.getElementById('dossierEditForm');f.elements.content.value='Anna berichtet über Streit in der Pause und möchte reden.';f.elements.title.value='Gespräch Pause';
 f.requestSubmit();await sleep(30);
 assert(!isOpen('dossierEditModal'),'Gesprächsdialog schließt sofort');
 await waitSaved();
 const entry=saved().journal.find(e=>e.title==='Gespräch Pause');assert(entry,'Chronikeintrag liegt im Tresor');
 run(`showStudent('s1')`);{const t=w.document.getElementById('studentDetailBody').textContent,i=t.indexOf('Gespräch Pause');
 assert(i>=0,'heute dokumentiertes Gespräch steht in der Chronik');assert(i>t.indexOf('Heute dokumentiert')&&i<t.indexOf('Spätere Termine'),'es steht im Heute-Block, nicht bei späteren Terminen');}
 // Chronikeintrag bearbeiten
 run(`dossierEntry('edit','entry:${entry.id}')`);
 f=w.document.getElementById('dossierEditForm');f.elements.content.value+=' Nachtrag: Klassenleitung informiert.';
 f.requestSubmit();await sleep(30);assert(!isOpen('dossierEditModal'));await waitSaved();
 const edited=saved().journal.find(e=>e.id===entry.id);assert.match(edited.content,/Nachtrag/);assert(edited.revisions.length>=1,'Bearbeitung mit Historie');
 run(`closeModal('studentModal')`);
 // Gruppengespräch mit individuellem Hinweis (war in 0.12.1 blockiert)
 run(`openGroupTalk()`);
 const g=w.document.getElementById('groupTalkForm');g.querySelectorAll('input[name=participantIds]').forEach(o=>o.checked=['s1','s2'].includes(o.value));
 g.elements.note.value='Konfliktklärung zwischen Anna und Bert nach dem Sportunterricht.';g.elements.individualNotes.value='Anna möchte nächste Woche nachfassen.';
 if(g.elements.type&&!g.elements.type.value)g.elements.type.value=g.elements.type.options[1]?.value||'Konfliktklärung';
 assert.equal(g.elements.date.value,run('today()'),'Ereignisdatum ist mit heute vorbelegt');
 g.requestSubmit();await sleep(30);assert(!isOpen('groupTalkModal'),'Gruppengespräch schließt');await waitSaved();
 const group=saved().journal.find(e=>e.participantIds.length===2&&/Konfliktklärung zwischen/.test(e.content));
 assert(group,'Gruppengespräch gespeichert');assert.match(group.content,/Anna möchte nächste Woche nachfassen/);
 run(`closeModal('studentModal')`);
 // Kurzkontakt
 run(`openQuickContact('s3')`);const q=w.document.getElementById('quickContactForm');q.querySelector('input[name=occasion]').checked=true;q.requestSubmit();await sleep(30);
 assert(!isOpen('quickContactModal'));await waitSaved();assert(saved().journal.some(e=>e.type==='Kurzkontakt'&&e.participantIds[0]==='s3'));
 console.log('speichern ohne blockieren ok');

 // 3. Speicherfehler werden verständlich angezeigt, erneutes Speichern funktioniert
 w.__failSave=true;
 run(`openPromise('s2')`);const pf2=w.document.getElementById('promiseForm');pf2.elements.title.value='Fehlerfall';pf2.requestSubmit();
 await sleep(SAVE_DELAY+150);
 assert.equal(run('document.getElementById("saveStatus").textContent'),'Nicht gespeichert');
 const bar=w.document.getElementById('saveErrorBar');assert(!bar.hidden,'Fehlerleiste sichtbar');assert.match(bar.textContent,/Datenträger voll/);
 assert(w.document.querySelector('.modal.open .dialogbody')?.textContent.includes('konnte nicht im Datentresor gespeichert werden'),'verständlicher Hinweis');
 w.document.querySelectorAll('.modal.open').forEach(m=>{if(!m.id)m.remove();});
 w.__failSave=false;bar.querySelector('button').click();await waitSaved();
 assert(bar.hidden,'Fehlerleiste nach erfolgreichem Speichern weg');assert(saved().tasks.some(t=>t.title==='Fehlerfall'));
 console.log('fehleranzeige ok');

 // 4. Offene Schutzfragen: oben auf „Heute“, verschwinden nach der Checkliste, Eintrag und Checkliste bleiben, keine Aufgabe
 const tasksBefore=run('data.tasks.length');
 run(`selectedStudentId='s1';showStudent('s1');dossierEntry('event')`);
 f=w.document.getElementById('dossierEditForm');f.elements.content.value='Anna sagt, sie wolle sich umbringen.';f.elements.title.value='Schutzthema';f.requestSubmit();await sleep(30);await waitSaved();
 run(`closeModal('studentModal');go('dashboard');renderToday()`);
 const today=w.document.getElementById('todayWorkspace');
 assert.equal(today.firstElementChild.querySelector('h2')?.textContent,'Offene Schutzfragen','Schutzfragen stehen ganz oben');
 assert.match(today.firstElementChild.textContent,/Beispiel, Anna/);
 const sid=run(`data.journal.find(e=>e.title==='Schutzthema').id`);
 run(`selectedStudentId=null;dossierSafetyCheck('${sid}')`);
 const sf=w.document.getElementById('dossierEditForm');sf.elements.leadInformed.checked=true;sf.requestSubmit();await sleep(30);
 assert(!isOpen('dossierEditModal'));await waitSaved();
 assert(!/Offene Schutzfragen/.test(w.document.getElementById('todayWorkspace').textContent),'Merker verschwindet');
 const se=saved().journal.find(e=>e.id===sid);
 assert(se&&se.content.includes('umbringen'),'Chronikeintrag bleibt unverändert');assert(se.safetyCheck&&se.safetyCheck.leadInformed===true,'Checkliste gespeichert');
 assert.equal(run('data.tasks.length'),tasksBefore,'keine automatische Aufgabe oder Frist');
 console.log('schutzfragen ok');

 // 5. Chronik-Kacheln lassen sich weiter verschieben (Ziehen und Knöpfe)
 run(`selectedStudentId='s1';showStudent('s1')`);
 const order=run(`dossierTimelineOrder('s1').slice()`);assert(order.length>=2,'mindestens zwei Kacheln');
 const dt={data:{},effectAllowed:'',setData(k,v){this.data[k]=v},getData(k){return this.data[k]}};
 const card=w.document.querySelector('[ondragstart*="dossierDragStart"]');assert(card,'Ziehgriff vorhanden');
 run('window.__dt=null');w.__dt=dt;
 run(`dossierDragStart({currentTarget:document.querySelector('[ondragstart*="dossierDragStart"]'),dataTransfer:window.__dt},'${order[0]}')`);
 await run(`dossierDrop({preventDefault(){},currentTarget:document.createElement('div'),dataTransfer:window.__dt},'${order[1]}')`);
 const moved=run(`data.settings.timelineOrder['s1'].slice()`);assert.equal(moved[1],order[0],'Kachel per Ziehen verschoben');
 await run(`dossierMoveCard('${order[0]}',-1)`);assert.equal(run(`data.settings.timelineOrder['s1'][0]`),order[0],'Kachel per Knopf verschoben');
 await waitSaved();assert.equal(saved().settings.timelineOrder.s1[0],order[0],'Reihenfolge gespeichert');
 console.log('chronik verschieben ok');

 // 6. Version 0.13: Gesprächsformular mit wenigen Pflichtfeldern, Titel aus der ersten Zeile
 run(`closeModal('studentModal');selectedStudentId='s3';showStudent('s3');dossierEntry('event')`);
 const nf=w.document.getElementById('dossierEditForm');
 assert(!nf.querySelector('.dossier-mehr [required]'),'keine Pflichtfelder im eingeklappten Bereich');
 assert.equal(nf.elements.title.required,false,'Titel ist freiwillig');
 assert(/Warum wird das angezeigt/.test(nf.textContent),'kompakter Schutzhinweis');
 assert(w.document.getElementById('dossierSafetyLive').hidden,'kein deutlicher Hinweis ohne Stichwort');
 nf.elements.content.value='Cem hat keine Angst mehr vor der Klassenarbeit.\nWir üben weiter.';nf.elements.content.dispatchEvent(new w.Event('input'));await sleep(300);
 assert(w.document.getElementById('dossierSafetyLive').hidden,'Verneinung löst keinen Schutzhinweis aus');
 nf.elements.content.value='Cem sagt, er wolle nicht mehr leben.';nf.elements.content.dispatchEvent(new w.Event('input'));await sleep(300);
 assert(!w.document.getElementById('dossierSafetyLive').hidden,'Schutzstichwort zeigt deutlichen Hinweis');
 nf.elements.content.value='Cem berichtet über den Streit in der Pause. Beide wollen sich vertragen.';
 const casesBefore13=run('data.cases.length');
 nf.requestSubmit();await sleep(30);assert(!isOpen('dossierEditModal'),'Dialog schließt sofort');
 const auto=run(`data.journal.at(-1)`);assert.equal(auto.title,'Cem berichtet über den Streit in der Pause','Titel aus erster Zeile');
 assert(['Schülergespräch / Einzelberatung'].includes(auto.type));await waitSaved();
 // Vorlage setzt nur Art/Titel, Leitfragen als Platzhalter
 run(`dossierEntry('event');dossierApplyTemplate('eltern')`);const tf=w.document.getElementById('dossierEditForm');
 assert.equal(tf.elements.type.value,'Elterngespräch / Elternkontakt');assert.equal(tf.elements.content.value,'','kein vorausgefüllter Text');assert(tf.elements.content.placeholder.length>10);
 run(`closeModal('dossierEditModal')`);
 // Gruppengespräch: keine doppelten Auswahlwerte, keine neue Fallakte
 const html=require('fs').readFileSync(file,'utf8');for(const m of html.matchAll(/<select[^>]*>((?:<option[^>]*>[^<]*<\/option>)+)<\/select>/g)){const o=[...m[1].matchAll(/<option[^>]*>[^<]*<\/option>/g)].map(x=>x[0]);assert.equal(new Set(o).size,o.length,'doppelte Auswahlwerte: '+o.join(''));}
 run(`data.cases=data.cases.filter(c=>c.studentId!=='s2')`);const cases13=run('data.cases.length');
 run(`openGroupTalk()`);const g2=w.document.getElementById('groupTalkForm');g2.querySelectorAll('input[name=participantIds]').forEach(o=>o.checked=['s2','s3'].includes(o.value));
 assert(g2.querySelector('details.weitere-angaben [name=due]'),'Wiedervorlage unter „Weitere Angaben“');
 g2.elements.note.value='Konfliktklärung Bert und Cem.';g2.elements.type.value='Konfliktklärung';g2.requestSubmit();await sleep(30);await waitSaved();
 assert.equal(run('data.cases.length'),cases13,'Gruppengespräch legt keine Fallakte an');
 // Auftragsklärung
 run(`closeModal('studentModal');selectedStudentId='s3';showStudent('s3')`);assert(/Auftrag klären/.test(w.document.getElementById('studentDetailBody').textContent));
 run(`dossierAuftrag()`);const af=w.document.getElementById('dossierEditForm');af.elements.requester.value='Klassenleitung';af.elements.childNeed.value='In Ruhe lernen';af.elements.assignedOrder.value='Konflikt in der Klasse begleiten';af.requestSubmit();await sleep(30);await waitSaved();
 assert(/Auftrag:\s*Konflikt in der Klasse begleiten/.test(w.document.getElementById('studentDetailBody').textContent),'Auftrag oben in der Akte');
 assert.equal(saved().auftraege.length,1,'Auftrag gespeichert');
 // Kurzkontakt: kein stilles „anonym“
 run(`closeModal('studentModal');openQuickContact('')`);const qk=w.document.getElementById('quickContactForm');qk.querySelector('input[name=occasion]').checked=true;const jb=run('data.journal.length');qk.requestSubmit();await sleep(30);
 assert.equal(run('data.journal.length'),jb,'ohne Kind oder „Anonym“ wird nichts gespeichert');run(`document.querySelectorAll('.modal.open:not([id])').forEach(m=>m.remove())`);
 run(`kurzkontaktSuche('Muster, Cem · 6b')`);assert.equal(qk.elements.studentId.value,'s3','Suche wählt das Kind');qk.requestSubmit();await sleep(30);assert.equal(run('data.journal.length'),jb+1);assert(!isOpen('quickContactModal'));
 // Zusage ohne Termin ist nicht gelb
 assert.equal(run(`ampelAufgabe({kind:'zusage',due:'',done:false}).stufe`),'gruen');
 // Speichern zeichnet nur die sichtbare Seite neu
 run(`go('dashboard')`);let statsCalls=0;w.__origStats=run('renderStats');run('renderStats=function(){window.__statsCalls=(window.__statsCalls||0)+1;return window.__origStats.apply(this,arguments)}');
 run('save()');assert.equal(run('window.__statsCalls||0'),0,'Statistik wird beim Speichern nicht neu berechnet');run(`go('statistics')`);assert.equal(run('window.__statsCalls'),1,'Statistik beim Öffnen aktualisiert');
 await waitSaved();
 console.log('0.13 formulare, auftrag, kurzkontakt ok');

 console.log('errors',errors);
 if(errors.length)process.exitCode=1;
 w.close();
})().catch(err=>{console.error(err);process.exitCode=1;});
