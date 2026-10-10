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
   for(const sid of ['s1','s2','s3'])Dossier.zugangswegSetzen(data,sid,'schueler_selbst',today());
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
 g.elements.note.value='Konfliktklärung zwischen Anna und Bert nach dem Sportunterricht.';run('groupTeilnehmerZaehlen()');const gkn=g.querySelector('input[name=kindNotiz][data-sid=s1]');assert(gkn,'Zusatzzeile pro Kind');gkn.value='Anna möchte nächste Woche nachfassen.';
 if(g.elements.type&&!g.elements.type.value)g.elements.type.value=g.elements.type.options[1]?.value||'Konfliktklärung';
 assert.equal(g.elements.date.value,run('today()'),'Ereignisdatum ist mit heute vorbelegt');
 g.requestSubmit();await sleep(30);assert(!isOpen('groupTalkModal'),'Gruppengespräch schließt');await waitSaved();
 const group=saved().journal.find(e=>e.participantIds.length===2&&/Konfliktklärung zwischen/.test(e.content));
 assert(group,'Gruppengespräch gespeichert');assert.equal(group.individualNotes.s1,'Anna möchte nächste Woche nachfassen.','Zusatz nur für Anna');assert(!group.individualNotes.s2&&!/nachfassen/.test(group.content),'nicht im gemeinsamen Text');
 run(`closeModal('studentModal')`);
 // Kurzkontakt
 run(`openQuickContact('s3')`);const q=w.document.getElementById('quickContactForm');q.querySelector('input[name=thema]').checked=true;q.requestSubmit();await sleep(30);
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
 run(`dossierAuftrag()`);const af=w.document.getElementById('dossierEditForm');af.querySelector('input[name=requesterId][value=lehrkraft]').checked=true;af.elements.childNeed.value='In Ruhe lernen';af.elements.assignedOrder.value='Konflikt in der Klasse begleiten';af.requestSubmit();await sleep(30);await waitSaved();
 assert(/Auftrag:\s*Konflikt in der Klasse begleiten/.test(w.document.getElementById('studentDetailBody').textContent),'Auftrag oben in der Akte');
 assert.equal(saved().auftraege.length,1,'Auftrag gespeichert');
 // Kurzkontakt: kein stilles „anonym“
 run(`closeModal('studentModal');openQuickContact('')`);const qk=w.document.getElementById('quickContactForm');qk.querySelector('input[name=thema]').checked=true;const jb=run('data.journal.length');qk.requestSubmit();await sleep(30);
 assert.equal(run('data.journal.length'),jb,'ohne Kind oder „Anonym“ wird nichts gespeichert');run(`document.querySelectorAll('.modal.open:not([id])').forEach(m=>m.remove())`);
 run(`kurzkontaktSuche('Muster, Cem · 6b')`);assert.equal(qk.elements.studentId.value,'s3','Suche wählt das Kind');qk.requestSubmit();await sleep(30);assert.equal(run('data.journal.length'),jb+1);assert(!isOpen('quickContactModal'));
 // Zusage ohne Termin ist nicht gelb
 assert.equal(run(`ampelAufgabe({kind:'zusage',due:'',done:false}).stufe`),'gruen');
 // Speichern zeichnet nur die sichtbare Seite neu
 run(`go('dashboard')`);let statsCalls=0;w.__origStats=run('renderStats');run('renderStats=function(){window.__statsCalls=(window.__statsCalls||0)+1;return window.__origStats.apply(this,arguments)}');
 run('save()');assert.equal(run('window.__statsCalls||0'),0,'Statistik wird beim Speichern nicht neu berechnet');run(`go('statistics')`);assert.equal(run('window.__statsCalls'),1,'Statistik beim Öffnen aktualisiert');
 await waitSaved();
 console.log('0.13 formulare, auftrag, kurzkontakt ok');

 // 7. Version 0.14: Schnellnotiz mit @-Erwähnung
 run(`document.querySelectorAll('.modal.open').forEach(m=>{if(m.id)closeModal(m.id);else m.remove()});go('dashboard')`);
 const sn=w.document.getElementById('snText');assert(sn,'Schnellnotiz auf Heute');
 const tippe=(text)=>{sn.focus();sn.value=text;sn.setSelectionRange(text.length,text.length);sn.dispatchEvent(new w.Event('input'));};
 const taste=(key,extra={})=>sn.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...extra}));
 tippe('@Ann');const liste=w.document.getElementById('snListe');assert(!liste.hidden,'Auswahlliste öffnet bei @');assert(/Beispiel, Anna/.test(liste.textContent));
 taste('Enter');assert(sn.value.startsWith('@Anna Beispiel '),'Enter übernimmt den Namen');
 tippe(sn.value+'und @Ber');liste.querySelector('.sn-option').dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true,cancelable:true}));
 assert(/@Bert Beispiel/.test(sn.value),'Mausauswahl übernimmt den Namen');
 tippe(sn.value+'haben sich in der Pause gestritten.');const j0=run('data.journal.length');
 taste('Enter',{ctrlKey:true});await sleep(20);
 assert.equal(run('data.journal.length'),j0+1,'genau ein Eintrag, keine Kopien');const kn=run('data.journal.at(-1)');
 assert.equal(kn.type,'Kurznotiz');assert.deepEqual([...kn.participantIds].sort(),['s1','s2']);assert(kn.time&&kn.date,'Datum und Uhrzeit');
 assert.equal(sn.value,'','Feld wird geleert');
 assert.equal(run(`Dossier.timeline(data,'s1',[]).filter(e=>e.id==='${kn.id}').length`),1);assert.equal(run(`Dossier.timeline(data,'s2',[]).filter(e=>e.id==='${kn.id}').length`),1);
 // Ohne @: noch nicht zugeordnet, später zuordnen
 tippe('Elternabend in der 5a war gut besucht.');run('schnellnotizSpeichern()');await sleep(20);
 assert.equal(run('data.schnellnotizen.length'),1);assert(/Noch nicht zugeordnet/.test(w.document.getElementById('todayWorkspace').textContent),'Sammelliste auf Heute');
 run(`notizZuordnen(data.schnellnotizen[0].id)`);const zf=w.document.getElementById('dossierEditForm');zf.querySelector('input[name=participantIds][value=s3]').checked=true;zf.requestSubmit();await sleep(30);
 assert.equal(run('data.schnellnotizen.length'),0);assert.equal(run('data.journal.at(-1).participantIds[0]'),'s3','nachträglich zugeordnet');
 // Tippfehler: keine doppelte Akte ohne Rückfrage
 const schueler0=run('data.students.length');tippe('@Ana Beispil');
 assert(/Meintest du/.test(liste.textContent),'Ähnlichkeitsvorschlag');assert(/Beispiel, Anna/.test(liste.textContent));
 const neuIdx=[...liste.querySelectorAll('.sn-option')].findIndex(o=>o.classList.contains('neu'));assert(neuIdx>=0,'Option „Neue Akte“');
 liste.querySelectorAll('.sn-option')[neuIdx].dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true,cancelable:true}));
 const na=w.document.getElementById('neueAkteModal');assert(na&&/Meintest du/.test(na.textContent),'Rückfrage vor Neuanlage');
 na.querySelector('[name=klasse]').value='5a';na.querySelector('form').requestSubmit();await sleep(20);
 assert.equal(run('data.students.length'),schueler0,'ohne Bestätigung keine neue Akte');run(`document.querySelectorAll('.modal.open:not([id])').forEach(m=>m.remove())`);
 na.querySelector('[data-kind="s1"]').click();assert(sn.value.startsWith('@Anna Beispiel'),'Vorschlag übernommen statt Neuanlage');
 // Unbekannter Name, bewusst neu angelegt
 tippe(sn.value+'und @Dora Neu');const opts=[...liste.querySelectorAll('.sn-option')];opts.find(o=>o.classList.contains('neu')).dispatchEvent(new w.MouseEvent('mousedown',{bubbles:true,cancelable:true}));
 const na2=w.document.getElementById('neueAkteModal');na2.querySelector('[name=klasse]').value='7c';const cbNeu=na2.querySelector('[name=trotzdem]');if(cbNeu)cbNeu.checked=true;na2.querySelector('form').requestSubmit();await sleep(20);
 assert.equal(run('data.students.length'),schueler0+1,'neue Akte nach Bestätigung');assert(/@Dora Neu/.test(sn.value));
 // Offene @-Angabe wird nicht still gespeichert
 tippe(sn.value+' @Xaver');const j1=run('data.journal.length');run('schnellnotizSpeichern()');assert.equal(run('data.journal.length'),j1,'unzugeordnetes @ blockiert');
 tippe('');run('snErwaehnungen=[]');
 // Diktat ohne Dienst: kein Fehler, nur Hinweis
 await run(`schnellnotizDiktat(document.getElementById('snDiktat'))`);assert(!run('document.querySelector(".modal.open:not([id])")'),'kein Fehlerdialog beim Diktat');
 await waitSaved();console.log('0.14 schnellnotiz ok');

 // 8. Gespräch vorbereiten
 run(`data.auftraege=[];Dossier.saveAuftrag(data,'s1',{requester:'Kind selbst',childNeed:'Ruhe in der Pause',assignedOrder:'Pausen begleiten',date:today()})`);
 const zid=run(`(()=>{const t=Dossier.addPromise(data,{title:'Klassenleitung ansprechen',promisedTo:'Kind',participantIds:['s1'],due:'2020-01-01'});return t.id})()`);
 run(`save();selectedStudentId='s1';showStudent('s1');gespraechVorbereiten()`);const vb=w.document.getElementById('vorbereitungModal');
 assert(/Pausen begleiten/.test(vb.textContent),'Auftrag');assert(/Klassenleitung ansprechen/.test(vb.textContent)&&vb.querySelector('.vb-ueberfaellig'),'überfällige Zusage markiert');
 assert.equal(vb.querySelectorAll('.vb-abschnitt')[1].querySelectorAll('.vb-punkt').length,3,'letzte drei Einträge');
 for(const b of [...vb.querySelectorAll('.vb-punkt')]){const key=b.getAttribute('onclick').match(/vorbereitungSprung\('([^']+)'\)/)[1];run(`gespraechVorbereiten()`);run(`vorbereitungSprung('${key}')`);await sleep(90);
  const t=key.startsWith('task:')?run(`data.tasks.find(x=>'task:'+x.id==='${key}')?.sourceEntryKey`):'';const el=w.document.getElementById('ds-'+key)||(t&&w.document.getElementById('ds-'+t));assert(el,'Sprungziel vorhanden: '+key);assert(el.classList.contains('dossier-hervorgehoben'),'Originaleintrag hervorgehoben: '+key);}
 run(`gespraechVorbereiten()`);const fr=w.document.getElementById('vbFrage');fr.value='Wie läuft es mit Bert?';fr.dispatchEvent(new w.Event('input'));
 run('vorbereitungDokumentieren()');assert(/Klären wollte ich: Wie läuft es mit Bert\?/.test(w.document.getElementById('dossierEditForm').elements.content.value),'Freitext übernommen');run(`closeModal('dossierEditModal')`);
 assert.equal(run(`data.settings.gespraechsvorbereitung.s1`),'Wie läuft es mit Bert?','Vorbereitung gespeichert');
 run(`selectedStudentId='s3';showStudent('s3');data.auftraege=data.auftraege.filter(a=>a.studentId!=='s3');gespraechVorbereiten()`);const vb3=w.document.getElementById('vorbereitungModal');
 assert(/Auftrag noch nicht geklärt/.test(vb3.textContent));assert(vb3.querySelectorAll('.vb-leer').length>=2,'leere Abschnitte bleiben sichtbar');run('vorbereitungSchliessen()');
 console.log('0.14 vorbereitung ok');

 // 9. Zusage aus der Chronik, beidseitig verknüpft; erledigt erzeugt Chronikeintrag
 run(`selectedStudentId='s1';showStudent('s1')`);const quelle=run(`'entry:'+data.journal.find(e=>e.participantIds.includes('s1')&&e.type==='Kurznotiz').id`);
 assert(w.document.querySelector(`#ds-${quelle.replace(':','\\:')} [onclick*="zusageAusEintrag"]`),'Knopf an der Kachel');
 run(`zusageAusEintrag('${quelle}')`);const zf2=w.document.getElementById('promiseForm');assert.equal(zf2.elements.sourceEntryKey.value,quelle);assert.equal(zf2.elements.studentId.value,'s1');
 zf2.elements.title.value='Mit Bert sprechen';zf2.elements.zugesagtVon.value='Sabine';zf2.requestSubmit();await sleep(20);
 const neu=run(`data.tasks.find(t=>t.title==='Mit Bert sprechen')`);assert.equal(neu.sourceEntryKey,quelle,'Zusage verweist auf Eintrag');assert.equal(neu.zugesagtVon,'Sabine');
 run('dossierRefresh()');assert(/Mit Bert sprechen/.test(w.document.getElementById('ds-'+quelle).textContent),'Eintrag zeigt die Zusage');
 run(`go('tasks')`);assert(/Mit Bert sprechen/.test(w.document.getElementById('zusagenListe').textContent),'Zusagenliste');assert(w.document.querySelector('#zusagenListe .zusage-zeile.ueberfaellig'),'überfällig farbig');
 run(`zusageStatusSetzen('${neu.id}','in Bearbeitung')`);assert(/Läuft \(1\)/.test(w.document.getElementById('zusagenListe').textContent));
 const jz=run('data.journal.length');run(`zusageStatusSetzen('${neu.id}','erledigt')`);assert.equal(run('data.journal.length'),jz+1);
 const ez=run('data.journal.at(-1)');assert.equal(ez.title,'Zusage erledigt: Mit Bert sprechen');assert.equal(ez.sourceEntryKey,'task:'+neu.id);assert.equal(run(`data.tasks.find(t=>t.id==='${neu.id}').doneEntryId`),ez.id,'beidseitig');
 run(`zusageStatusSetzen('${neu.id}','offen');zusageStatusSetzen('${neu.id}','erledigt')`);assert.equal(run('data.journal.length'),jz+1,'kein doppelter Eintrag');
 // „eingehalten“ auf Heute erzeugt ebenfalls den Eintrag
 run(`openTaskComplete('${zid}')`);const tf2=w.document.getElementById('dossierEditForm');tf2.elements.status.value='erledigt';tf2.elements.result.value='Gespräch geführt';tf2.requestSubmit();await sleep(30);await sleep(20);assert.equal(run('data.journal.at(-1).title'),'Zusage erledigt: Klassenleitung ansprechen');
 run(`Dossier.addPromise(data,{title:'Cem Rückmeldung geben',promisedTo:'Kind',participantIds:['s3']});zusagenFilterKind='s3';renderZusagen()`);assert(/Cem Rückmeldung geben/.test(w.document.getElementById('zusagenListe').textContent));assert(!/Mit Bert sprechen/.test(w.document.getElementById('zusagenListe').textContent),'Filter nach Kind');run(`zusagenFilterKind='';renderZusagen()`);
 await waitSaved();console.log('0.14 zusagen ok');

 // 10. Kontexthilfe: aufklappen und schließen, Texte vollständig und kurz
 const hk=w.document.querySelector('#tasks .sectionhead .hilfeknopf');assert(hk,'? im Bereichskopf');hk.click();
 assert(w.document.querySelector('#tasks .hilfe-inline'),'Hilfe klappt direkt darunter auf');hk.click();assert(!w.document.querySelector('#tasks .hilfe-inline'),'erneuter Klick schließt');
 const texte=run('HILFE_TEXTE');for(const [k,h] of Object.entries(texte)){assert(h.was&&h.warum&&h.beispiel,'Aufbau '+k);const saetze=(h.was+' '+h.warum+' '+h.beispiel).replace(/z\. B\./g,'zB').split(/(?<=[.!?“])\s+(?=[A-ZÄÖÜ„])/).length;assert(saetze<=4,'höchstens vier Sätze: '+k+' ('+saetze+')');}
 for(const seite of w.document.querySelectorAll('.page'))if(seite.querySelector('.sectionhead'))assert(texte[seite.id],'Hilfetext für Bereich '+seite.id);
 console.log('0.14 hilfe ok');

 {
 const gleich=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b));
 // 11. Version 0.15: Merkmale beim Erfassen, Zugangsweg einmal je Kind und Schuljahr, Tätigkeit ohne Fall
 run(`document.querySelectorAll('.modal.open').forEach(m=>{if(m.id&&!['vorbereitungModal','neueAkteModal','taetigkeitModal'].includes(m.id))closeModal(m.id);else m.remove()});go('dashboard')`);
 const s4=run(`Dossier.addStudent(data,{first:'Emil',last:'Fantasie',className:'7b'}).id`);
 run(`openQuickContact('${s4}')`);const qk4=w.document.getElementById('quickContactForm');
 assert(!w.document.getElementById('qkZugang').hidden&&qk4.querySelector('#qkZugang [data-pflicht]'),'Zugangsweg wird beim ersten Kontakt gefragt');
 assert.equal(qk4.querySelector('input[name=dauer_min]:checked')?.value,'5','Dauer im Kurzkontakt vorausgewählt');
 qk4.querySelector('input[name=thema][value=konflikt_mobbing]').checked=true;const jq=run('data.journal.length');qk4.requestSubmit();await sleep(20);
 assert.equal(run('data.journal.length'),jq,'ohne Zugangsweg nicht gespeichert');run(`document.querySelectorAll('.modal.open:not([id])').forEach(m=>m.remove())`);
 qk4.querySelector('input[name=zugangsweg][value=lehrkraft]').checked=true;qk4.requestSubmit();await sleep(20);
 const kk=run('data.journal.at(-1)');assert.equal(kk.type,'Kurzkontakt');assert.equal(kk.stat.kontaktart,'kurzkontakt');gleich(kk.stat.themen,['konflikt_mobbing']);assert.equal(kk.stat.dauer_min,5);assert.equal(kk.stat.klassen[s4].stufe,7);assert.equal(kk.stat.klassen[s4].zweig,'OBS');
 assert.equal(run(`Dossier.zugangswegFuer(data,'${s4}',today()).zugangsweg`),'lehrkraft');
 run(`openQuickContact('${s4}')`);assert(w.document.getElementById('qkZugang').hidden,'Zugangsweg nur einmal je Schuljahr');run(`closeModal('quickContactModal')`);
 assert.equal(run(`Dossier.zugangswegFuer(data,'${s4}','2027-09-01')`),null,'im neuen Schuljahr wird wieder gefragt');
 // Gespräch: Chips, keine Zugangsweg-Frage mehr, Dauer wird gemerkt
 run(`selectedStudentId='${s4}';showStudent('${s4}');dossierEntry('event')`);let gf=w.document.getElementById('dossierEditForm');
 assert(!gf.querySelector('[data-merkmal=zugangsweg]'),'kein zweites Mal Zugangsweg');assert(gf.querySelector('input[name=beteiligte][value=schueler]').checked,'Vorauswahl Schüler:in');
 assert(!gf.querySelector('input[name=dauer_min]:checked'),'Dauer im Gespräch ohne feste Vorauswahl');
 gf.elements.content.value='Emil berichtet von Streit zu Hause.';gf.querySelector('input[name=kontaktart_wahl][value=krisengespraech]').checked=true;gf.querySelector('input[name=thema][value=familie]').checked=true;gf.querySelector('input[name=beteiligte][value=eltern]').checked=true;gf.querySelector('input[name=dauer_min][value="45"]').checked=true;gf.querySelector('input[name=ergebnis][value=weiter_begleitet]').checked=true;
 gf.requestSubmit();await sleep(30);const ge=run('data.journal.at(-1)');
 assert.equal(ge.stat.kontaktart,'krisengespraech');gleich(ge.stat.themen,['familie']);gleich(ge.stat.beteiligte.sort(),['eltern','schueler']);assert.equal(ge.stat.dauer_min,45);assert.equal(ge.duration,45);assert.equal(ge.stat.ergebnis,'weiter_begleitet');assert.equal(ge.stat.quelle,'erfasst');
 run(`dossierEntry('event')`);gf=w.document.getElementById('dossierEditForm');assert.equal(gf.querySelector('input[name=dauer_min]:checked')?.value,'45','zuletzt gewählte Dauer angeboten');run(`closeModal('dossierEditModal')`);
 // Neues Kind im Gesprächsformular: Zugangsweg ist Pflicht
 const s5=run(`Dossier.addStudent(data,{first:'Frida',last:'Fantasie',className:'3a'}).id`);run(`selectedStudentId='${s5}';showStudent('${s5}');dossierEntry('event')`);gf=w.document.getElementById('dossierEditForm');
 assert(gf.querySelector('[data-merkmal=zugangsweg][data-pflicht]'));gf.elements.content.value='Erstes Gespräch.';const jg=run('data.journal.length');await gf.onsubmit({preventDefault(){},target:gf});await sleep(20);assert.equal(run('data.journal.length'),jg,'ohne Zugangsweg kein Eintrag');run(`document.querySelectorAll('.modal.open:not([id])').forEach(m=>m.remove())`);
 gf.querySelector('input[name=zugangsweg][value=eltern]').checked=true;gf.requestSubmit();await sleep(30);assert.equal(run(`Dossier.zugangswegFuer(data,'${s5}',today()).zugangsweg`),'eltern');assert.equal(run('data.journal.at(-1).stat.klassen')[s5].zweig,'GS');
 // Gruppengespräch
 run(`closeModal('studentModal');openGroupTalk()`);const g5=w.document.getElementById('groupTalkForm');g5.querySelectorAll('input[name=participantIds]').forEach(o=>o.checked=['s1','s2'].includes(o.value));g5.elements.note.value='Streit geklärt.';g5.querySelector('input[name=thema][value=konflikt_mobbing]').checked=true;g5.querySelector('input[name=dauer_min][value="30"]').checked=true;g5.requestSubmit();await sleep(30);
 const gg=run('data.journal.at(-1)');assert.equal(gg.stat.kontaktart,'gruppe');assert.equal(gg.stat.teilnehmende,2);assert.equal(gg.stat.dauer_min,30);
 // Tätigkeit ohne Fall färbt die Klassenkachel
 run(`go('classes')`);const kachel=()=>[...w.document.querySelectorAll('#classGrid article')].find(a=>/Klasse 6b/.test(a.textContent));assert(!kachel().classList.contains('hasactivity'),'vorher keine Markierung');
 run(`go('dashboard');taetigkeitOhneFall()`);const tm=w.document.getElementById('taetigkeitModal');const tfo=tm.querySelector('form');
 const t0=run('data.taetigkeiten.length');tfo.requestSubmit();await sleep(20);assert.equal(run('data.taetigkeiten.length'),t0,'Tätigkeit ist Pflicht');run(`document.querySelectorAll('.modal.open:not([id])').forEach(m=>m.remove())`);
 tfo.querySelector('input[name=taetigkeit][value=klassenprojekt_praevention]').checked=true;tfo.querySelector('input[name=dauer_min][value="90"]').checked=true;tfo.elements.klasse.value='6b';tfo.elements.teilnehmende.value='24';tfo.requestSubmit();await sleep(30);
 const tto=run('data.taetigkeiten.at(-1)');assert.equal(tto.taetigkeit,'klassenprojekt_praevention');assert.equal(tto.dauer_min,90);assert.equal(tto.teilnehmende,24);assert.equal(tto.stufe,6);
 run(`go('classes')`);assert(kachel().classList.contains('hasactivity'),'Klassenkachel markiert');
 // Alte Einträge: nichts verändert, Eindeutiges übernommen, Rest „nicht erfasst“
 const alt=run(`(()=>{const e={id:'alt1',date:'2025-10-01',type:'Kurzkontakt',occasions:['Streit','kurz reden'],duration:10,participantIds:['s1']};return Dossier.statMerkmale(data,e)})()`);
 assert.equal(alt.quelle,'uebernommen');gleich(alt.themen,['konflikt_mobbing']);assert.equal(alt.dauer_min,10);assert.equal(run(`Dossier.katLabel('ergebnis','')`),'nicht erfasst');
 assert.equal(run(`Dossier.statMerkmale(data,{type:'Kurznotiz',participantIds:['s1']})`),null,'Schnellnotiz zählt nicht als Kontakt');
 // Auftragsklärung setzt den Zugangsweg, wenn noch keiner da ist
 const s6=run(`Dossier.addStudent(data,{first:'Gregor',last:'Fantasie',className:'9c'}).id`);run(`selectedStudentId='${s6}';showStudent('${s6}');dossierAuftrag()`);const a6=w.document.getElementById('dossierEditForm');
 a6.querySelector('input[name=requesterId][value=schulleitung]').checked=true;a6.elements.assignedOrder.value='Begleitung';a6.elements.noChildNeed.checked=true;a6.requestSubmit();await sleep(30);
 assert.equal(run(`Dossier.zugangswegFuer(data,'${s6}',today()).zugangsweg`),'schulleitung');run(`closeModal('studentModal')`);
 await waitSaved();assert(saved().zugangswege.length>=6&&saved().taetigkeiten.length>=1,'gespeichert');
 }
 console.log('0.15 erfassung ok');

 // 12. Version 0.16: Statistikseite, Filter bleiben erhalten, „Jetzt nachtragen“
 {
 run(`document.querySelectorAll('.modal.open').forEach(m=>{if(m.id&&!['vorbereitungModal','neueAkteModal','taetigkeitModal','nachtragModal'].includes(m.id))closeModal(m.id);else m.remove()});go('statistics')`);
 const neu=w.document.getElementById('statNeu');assert(/Intern – nicht weitergeben/.test(neu.textContent),'als intern gekennzeichnet');
 for(const t of ['Erreichte Schüler:innen','Einzelfälle','Kontakte','Stunden','Erreichte Personen'])assert(neu.textContent.includes(t),'Kennzahl '+t);
 assert.equal(neu.querySelectorAll('.stat-kpi .hilfe-q').length,5,'„?“ an jeder Kennzahl');
 assert(neu.querySelectorAll('.stat-karte svg rect').length>3,'Balken als SVG');assert(neu.querySelector('.stat-kreuz table tfoot'),'Kreuztabelle mit Summen');
 const k0=run(`Dossier.kennzahlen(Dossier.filterEreignisse(Dossier.ereignisse(data),statFilterObjekt(),Dossier.zugangKarte(data)),statFilterObjekt())`);
 assert(neu.querySelector('.stat-kpis').textContent.includes(String(k0.kontakte)),'Kennzahl wird angezeigt');
 run(`statF.thema='konflikt_mobbing';renderStatistikNeu();go('dashboard');go('statistics')`);
 assert.equal(run('statF.thema'),'konflikt_mobbing','Filter bleiben beim Seitenwechsel erhalten');assert(/1 Filter aktiv/.test(w.document.getElementById('statNeu').textContent));
 run('statFilterZuruecksetzen()');assert.equal(run('statF.thema'),'');
 const q0=run(`Dossier.datenqualitaet(Dossier.filterEreignisse(Dossier.ereignisse(data),{von:statFilterObjekt().von,bis:statFilterObjekt().bis},Dossier.zugangKarte(data)),Dossier.zugangKarte(data))`);
 assert(q0.nachtragbar.length>0,'es gibt etwas nachzutragen');
 run('statNachtragenStarten()');let nm=w.document.getElementById('nachtragModal');assert(nm&&/1 von/.test(nm.textContent));
 const erste=run('statNachtragListe[0]');const f1=nm.querySelector('form');
 if(erste.typ==='eintrag'){const t=f1.querySelector('input[name=thema]');if(t)t.checked=true;const d=f1.querySelector('input[name=dauer_min]');if(d)d.checked=true;}else f1.querySelector('input[name=zugangsweg]').checked=true;
 f1.requestSubmit();await sleep(20);nm=w.document.getElementById('nachtragModal');assert(!nm||/2 von/.test(nm.textContent),'Speichern springt zum nächsten');
 if(erste.typ==='eintrag')assert.equal(run(`data.journal.find(e=>e.id==='${erste.entryId}').stat.quelle`),'erfasst','nachgetragen');
 run(`document.getElementById('nachtragModal')?.querySelector('[data-ende]')?.click()`);
 const q1=run(`Dossier.datenqualitaet(Dossier.filterEreignisse(Dossier.ereignisse(data),{von:statFilterObjekt().von,bis:statFilterObjekt().bis},Dossier.zugangKarte(data)),Dossier.zugangKarte(data))`);
 assert(q1.ohneThema+q1.ohneDauer+q1.ohneZugang<q0.ohneThema+q0.ohneDauer+q0.ohneZugang,'Datenqualität zählt weniger Lücken');
 await waitSaved();console.log('0.16 statistik ok');
 }

 // 13. Chronikeinträge ohne doppelte Bearbeiten-Aktion
 {
 run(`document.querySelectorAll('.modal.open').forEach(m=>{if(m.id&&!['nachtragModal'].includes(m.id))closeModal(m.id);else m.remove()});selectedStudentId='s1';showStudent('s1')`);
 const eid=run(`data.journal.find(e=>e.participantIds.includes('s1')&&e.type!=='Kurznotiz'&&!e.deletedAt).id`);
 const card=w.document.getElementById('ds-entry:'+eid);
 assert.equal([...card.querySelectorAll('.dossier-card-actions button')].filter(b=>/Kachel bearbeiten|Teilinhalte löschen/.test(b.textContent)).length,0,'keine doppelten Bearbeiten- oder Teilinhalte-löschen-Aktionen');
 const knopf=[...card.querySelectorAll('.dossier-card-quick-actions button')].find(b=>b.textContent.trim()==='Bearbeiten');
 assert(knopf,'direkte Bearbeiten-Schaltfläche');knopf.click();
 const ef=w.document.getElementById('dossierEditForm');assert(w.document.getElementById('dossierEditModal').classList.contains('open'));assert.equal(ef.elements.content.value,run(`data.journal.find(e=>e.id==='${eid}').content`),'Formular mit dem Eintrag');
 ef.elements.content.value=ef.elements.content.value+' (nachträglich ergänzt)';ef.requestSubmit();await sleep(30);
 assert.match(run(`data.journal.find(e=>e.id==='${eid}').content`),/nachträglich ergänzt/);assert(run(`data.journal.find(e=>e.id==='${eid}').revisions.length`)>=1,'Änderung mit Historie');
 const auftragKarte=w.document.querySelector('[id^="ds-auftrag:"]');if(auftragKarte)assert([...auftragKarte.querySelectorAll('.dossier-card-actions button')].some(b=>/Auftrag bearbeiten/.test(b.textContent)));
 const aufgabe=w.document.querySelector('[id^="ds-task:"]');if(aufgabe)assert([...aufgabe.querySelectorAll('.dossier-card-actions button')].some(b=>/Kachel bearbeiten/.test(b.textContent)));
 await waitSaved();console.log('kachel bearbeiten ok');
 }

 // 14. Version 0.17: SSA-Team vereinheitlicht, Berichte zur Weitergabe mit Vorschau und Protokoll
 {
 run(`document.querySelectorAll('.modal.open').forEach(m=>{if(m.id&&!['nachtragModal','berichtModal'].includes(m.id))closeModal(m.id);else m.remove()})`);
 run(`['Edmund','SSA-Team','Sabine Thien','Thien, Sabine','Sabine'].forEach((r,i)=>data.journal.push({id:'mt'+i,date:today(),type:'Kurzkontakt',title:'Test',content:'Test',participantIds:['s1'],responsible:r}));save()`);
 run(`go('settings')`);const tk=w.document.getElementById('teamKarte');
 assert.deepEqual(JSON.parse(run(`JSON.stringify([...document.getElementById('aktivePersonFeld').options].map(o=>o.value))`)),['Bruns, Edmund','Thien, Sabine','Anerkennungspraktikantin Laura Geiger'],'Aktive Person nur aus dem Team');
 assert(/Frühere Schreibweisen/.test(tk.textContent)&&/Bruns, Edmund \(automatisch\)/.test(tk.textContent),'Schreibweisen werden automatisch zugeordnet');
 const mit=()=>JSON.parse(run(`JSON.stringify(Dossier.aufschluesselung(Dossier.ereignisse(data),'mitarbeitend','kontakte'))`)).map(r=>r.id);
 for(const alt of ['Edmund','SSA-Team','Sabine Thien','Sabine'])assert(!mit().includes(alt),'nicht mehr getrennt: '+alt);assert(mit().includes('Thien, Sabine')&&mit().includes('Bruns, Edmund'));
 const sel=[...tk.querySelectorAll('select[data-roh]')].find(x=>x.dataset.roh==='SSA-Team');assert(sel,'SSA-Team kann zugeordnet werden');
 sel.value='Bruns, Edmund';sel.dispatchEvent(new w.Event('change',{bubbles:true}));await sleep(20);
 assert.equal(run(`Dossier.mitarbeitendKanonisch(data,'SSA-Team')`),'Bruns, Edmund','Zuordnung gespeichert');
 assert.equal(run(`data.journal.find(e=>e.id==='mt1').responsible`),'SSA-Team','alter Eintrag bleibt unverändert');
 run(`openModal('groupTalkModal')`);const gv=JSON.parse(run(`JSON.stringify([...document.querySelector('#groupTalkModal select[name=responsible]').options].map(o=>o.value))`));
 assert(!gv.includes('SSA-Team')&&gv.includes('Thien, Sabine')&&gv.includes('Anerkennungspraktikantin Laura Geiger'),'Verantwortlich: nur Team, kein „SSA-Team“');run(`closeModal('groupTalkModal')`);
 run(`selectedStudentId='s1';showStudent('s1');dossierEntry('new')`);const df=w.document.getElementById('dossierEditForm');
 assert.equal(df.elements.responsible.tagName,'SELECT','Dokumentiert von ist eine Auswahl');assert.equal(df.elements.responsible.value,run('aktivePerson()'));run(`closeModal('dossierEditModal');closeModal('studentModal')`);
 run(`window.__dl=[];download=(n,t)=>__dl.push({n,t});go('statistics')`);
 assert(w.document.getElementById('statBerichte'),'Berichte zur Weitergabe');run(`berichtWahl.art='halbjahr';berichtVorschau()`);
 let bm=w.document.getElementById('berichtModal');assert(/Diese Tabelle verlässt das Cockpit\. Bitte prüfen\./.test(bm.textContent),'Vorschau mit Warnung');
 const vorher=run('(data.weitergaben||[]).length');run(`berichtWeitergeben('CSV')`);assert.equal(run('(data.weitergaben||[]).length'),vorher,'ohne Empfänger keine Weitergabe');assert.equal(run('__dl.length'),0);
 bm.querySelector('input[name=empfaenger]').value='Schulleitung';run(`berichtWeitergeben('CSV')`);
 assert.equal(run('data.weitergaben.length'),vorher+1,'protokolliert');const csv=run('__dl[0].t');assert(csv.startsWith('﻿')&&csv.includes(';'),'CSV mit BOM und Semikolon');
 for(const verboten of ['Bruns','Thien','Geiger',run(`data.students.find(s=>s.id==='s1').last`)])assert(!csv.includes(verboten),'nicht im Bericht: '+verboten);
 assert(/Schulleitung/.test(w.document.getElementById('statWeitergaben').textContent),'Protokoll „Weitergaben“');
 await waitSaved();assert(saved().weitergaben.length===vorher+1,'Protokoll gespeichert');console.log('0.17 team und weitergabe ok');
 }

 // 15. Version 0.18: Wer arbeitet gerade? · Sperrhinweis · Themenvorschlag · Zusatz pro Kind
 {
 run(`document.querySelectorAll('.modal.open').forEach(m=>{if(m.id&&!['berichtModal','nachtragModal','werArbeitetModal'].includes(m.id))closeModal(m.id);else m.remove()})`);
 run('werArbeitetFragen()');let wm=w.document.getElementById('werArbeitetModal');assert(wm,'Frage „Wer arbeitet gerade?“');
 assert.equal(wm.querySelectorAll('[data-person]').length,3,'drei Personen zur Wahl');
 [...wm.querySelectorAll('[data-person]')].find(b=>b.dataset.person==='Thien, Sabine').click();await sleep(20);
 assert.equal(run('data.settings.activeUser'),'Thien, Sabine');assert(!w.document.getElementById('werArbeitetModal'));
 assert.match(w.document.getElementById('aktivePersonAnzeige').textContent,/Thien, Sabine/,'aktive Person unten links sichtbar');
 run(`aktivePersonSetzen('Bruns, Edmund')`);
 // Sperrhinweis
 run(`data.relatedPersons.push({id:'rpX',studentId:'s2',name:'Herr Fantasie',role:'Getrenntlebender Elternteil',mayContact:'Nein'});selectedStudentId='s2';showStudent('s2')`);
 const sp=w.document.getElementById('akteSperre');assert(!sp.hidden&&sp.classList.contains('rot'),'roter Hinweis im Kopf der Akte');assert.match(sp.textContent,/Keine Auskunft \/ kein Kontakt: Herr Fantasie/);
 run(`closeModal('studentModal');selectedStudentId='s3';showStudent('s3')`);assert(w.document.getElementById('akteSperre').hidden,'ohne Sperre kein Hinweis');run(`closeModal('studentModal')`);
 // Themenvorschlag im Gesprächsformular
 run(`selectedStudentId='s1';showStudent('s1');dossierEntry('new')`);const ef=w.document.getElementById('dossierEditForm');
 ef.elements.content.value='Anna hatte Streit im Klassenchat.';ef.elements.content.dispatchEvent(new w.Event('input',{bubbles:true}));await sleep(260);
 const vor=[...ef.querySelectorAll('label.chip-vorschlag input[name=thema]')].map(x=>x.value);
 assert(vor.includes('konflikt_mobbing')&&vor.includes('medien'),'passende Themen hervorgehoben');
 assert(![...ef.querySelectorAll('input[name=thema]')].some(x=>x.checked),'nichts automatisch angekreuzt');
 const k=ef.querySelector('input[name=thema][value=konflikt_mobbing]');k.checked=true;k.dispatchEvent(new w.Event('change',{bubbles:true}));
 assert(!k.closest('label').classList.contains('chip-vorschlag'),'übernommen: Hervorhebung weg');
 run(`closeModal('dossierEditModal');closeModal('studentModal')`);
 // Zusatz pro Kind erscheint nur in der Chronik des betreffenden Kindes
 run(`selectedStudentId='s1';showStudent('s1')`);
 const gid=run(`data.journal.find(e=>e.type==='Gruppengespräch'&&e.individualNotes&&e.individualNotes.s1).id`);
 assert(/Zu Anna/.test(w.document.getElementById('ds-entry:'+gid)?.textContent||''),'Zusatz in Annas Chronik');run(`closeModal('studentModal');selectedStudentId='s2';showStudent('s2')`);
 assert(!/nachfassen/.test(w.document.getElementById('ds-entry:'+gid)?.textContent||''),'nicht bei Bert');run(`closeModal('studentModal')`);
 await waitSaved();console.log('0.18 alltag ok');
 }

 // 16. Version 0.19: Gespräch planen · ganze Klassen beim Schuljahreswechsel · PM und SSA
 {
 run(`document.querySelectorAll('.modal.open').forEach(m=>{if(m.id&&!['werArbeitetModal'].includes(m.id))closeModal(m.id);else m.remove()});selectedStudentId='s1';showStudent('s1')`);
 const planKnopf=[...w.document.querySelectorAll('#studentDetailBody button')].find(b=>/Gespräch planen/.test(b.textContent));assert(planKnopf,'Knopf „Gespräch planen“ in der Akte');planKnopf.click();
 const pf=w.document.getElementById('dossierEditForm');pf.elements.date.value=run('today()');pf.elements.time.value='09:30';pf.elements.anlass.value='Sitzplatz';pf.elements.punkte.value='Sitzplatz klären\nRückmeldung an Mutter';pf.requestSubmit();await sleep(30);
 assert.equal(run(`Dossier.geplanteGespraeche(data,{sid:'s1'}).length`),1,'geplant');assert(!w.document.getElementById('aktePlan').hidden,'in der Akte sichtbar');
 run(`closeModal('studentModal');go('dashboard');renderToday()`);const heute=w.document.querySelector('.today-plan');assert(heute&&/Sitzplatz/.test(heute.textContent),'erscheint auf „Heute“');
 [...heute.querySelectorAll('button')].find(b=>/Dokumentieren/.test(b.textContent)).click();await sleep(20);
 const ef=w.document.getElementById('dossierEditForm');assert(ef.querySelector('.plan-block'),'Punkte aus der Planung im Formular');
 assert.deepEqual(ef.querySelectorAll('input[name=participantIds]:checked').length?[...ef.querySelectorAll('input[name=participantIds]:checked')].map(x=>x.value):['s1'],['s1'],'Kind vorausgefüllt');
 ef.querySelector('input[name=planPunktGeklaert][value="0"]').checked=true;ef.elements.content.value='Sitzplatz besprochen, Wechsel nach vorne vereinbart.';
 const zv=run(`data.tasks.filter(t=>t.kind==='zusage').length`);ef.requestSubmit();await sleep(40);
 assert.equal(run(`data.tasks.filter(t=>t.kind==='zusage').length`),zv+1,'offener Punkt wurde Zusage');assert.equal(run(`data.geplanteGespraeche[0].status`),'erledigt');
 run(`document.querySelectorAll('.modal.open').forEach(m=>m.id?closeModal(m.id):m.remove())`);
 // Schuljahreswechsel: ganze Klasse
 run('dossierManualYear()');const kb=w.document.getElementById('yearKlassenBar');assert(kb&&/Ganze Klassen verschieben/.test(kb.textContent),'Leiste für ganze Klassen');
 const offen0=run('pendingYearChange.rows.filter(r=>!r.confirmed).length');
 const knopf=[...kb.querySelectorAll('button')].find(b=>/Klasse übernehmen/.test(b.textContent));assert(knopf);knopf.click();await sleep(10);
 assert(run('pendingYearChange.rows.filter(r=>!r.confirmed).length')<offen0,'Klasse übernommen');
 run('cancelYearChange()');
 // PM und SSA beim Zugangsweg
 const chips=run(`chipsHtml('zugangsweg','zugangsweg')`);assert(/> PM</.test(chips)&&/> SSA</.test(chips),'PM und SSA wählbar');
 await waitSaved();console.log('0.19 planen und schuljahr ok');
 }

 // 17. Version 0.20: schlanker – Navigation, Akte, Gesprächsformular, Aufgabe statt Wiedervorlage, Leitfäden, Erweitert
 {
 run(`document.querySelectorAll('.modal.open').forEach(m=>m.id?closeModal(m.id):m.remove())`);
 const haupt=[...w.document.querySelectorAll('.nav > button .label')].map(x=>x.textContent);
 assert.deepEqual(haupt,['Heute','Schüler:innen','Fallarbeit','Aufgaben und Zusagen','Auswertung'],'Hauptnavigation');
 assert(w.document.querySelector('.navgroup').classList.contains('collapsed'),'Weitere Bereiche zugeklappt');
 assert(/Leitfäden/.test(w.document.querySelector('.navgroup').textContent)&&!/Fachverfahren/.test(w.document.querySelector('.navgroup').textContent));
 run(`selectedStudentId='s1';showStudent('s1')`);
 const leiste=w.document.querySelector('#studentDetailBody .dossier-toolbar');const sichtbar=[...leiste.children].filter(x=>x.tagName==='BUTTON').map(b=>b.textContent.trim());
 assert.equal(sichtbar.length,5,'fünf Knöpfe in der Akte: '+sichtbar.join(', '));assert(/Gespräch vorbereiten/.test(leiste.querySelector('.dossier-more-menu').textContent),'Rest unter „Mehr …“');
 run(`dossierEntry('event')`);const ef=w.document.getElementById('dossierEditForm');
 for(const weg of ['otherView','observation','goal','result','people','facilitators','referenceDate','since','planned','channel'])assert(!ef.elements[weg],'Feld entfällt: '+weg);
 for(const bleibt of ['agreement','childView','assessment','workflowId','responsible','title'])assert(ef.elements[bleibt],'Feld bleibt: '+bleibt);
 run(`closeModal('dossierEditModal');closeModal('studentModal');go('tasks');openModal('taskModal')`);
 assert.match(w.document.querySelector('#taskModal h2').textContent,/Aufgabe anlegen/);const tf=w.document.getElementById('taskForm');
 assert(!tf.elements.priority&&!tf.elements.taskType,'schlanke Aufgabe');tf.elements.title.value='Rückruf Klassenleitung 7a';tf.elements.due.value=run('today()');const na=run('data.tasks.length');tf.requestSubmit();await sleep(20);
 assert.equal(run('data.tasks.length'),na+1);assert.equal(run('data.tasks.at(-1).status'),'offen');
 run(`go('workflows')`);assert.match(w.document.querySelector('#workflows h2').textContent,/Leitfäden/);
 run(`go('settings')`);assert(w.document.querySelector('#settings details.erweitert'),'Einstellungen: Erweitert');
 await waitSaved();console.log('0.20 schlank ok');
 }

 // 18. Version 0.21: Akte zeigt Gespeichertes sofort · Familie und Bezugspersonen · robuste Suche · Gruppengespräch
 {
 run(`document.querySelectorAll('.modal.open').forEach(m=>m.id?closeModal(m.id):m.remove());go('dashboard');selectedStudentId='s1';showStudent('s1')`);
 const vorher=w.document.querySelectorAll('#studentDetailBody [id^="ds-"]').length;
 run(`openQuickContact('s1')`);const qf=w.document.getElementById('quickContactForm');const th=qf.querySelector('input[name=thema]');if(th)th.checked=true;const zw=qf.querySelector('input[name=zugangsweg]');if(zw)zw.checked=true;
 qf.requestSubmit();await sleep(40);
 assert(w.document.getElementById('studentModal').classList.contains('open'),'Akte bleibt offen');
 assert(w.document.querySelectorAll('#studentDetailBody [id^="ds-"]').length>vorher,'neuer Eintrag sofort in der offenen Akte sichtbar');
 const fam=w.document.querySelector('#studentDetailBody details.akte-familie');assert(fam&&/Familie \/ Sorgerecht bearbeiten/.test(fam.textContent)&&/Bezugsperson/.test(fam.textContent),'Familie und Bezugspersonen erreichbar');
 [...fam.querySelectorAll('button')].find(b=>/Bezugsperson/.test(b.textContent)).click();await sleep(10);
 const rf=w.document.getElementById('relatedPersonForm');assert(w.document.getElementById('relatedPersonModal').classList.contains('open'));
 rf.elements.name.value='Herr Testvater';rf.elements.role.value='Getrenntlebender Elternteil';rf.elements.mayContact.value='Nein';rf.requestSubmit();await sleep(30);
 assert(!w.document.getElementById('akteSperre').hidden&&/Herr Testvater/.test(w.document.getElementById('akteSperre').textContent),'Sperre sofort oben in der Akte');
 const rpId=run(`data.relatedPersons.find(r=>r.name==='Herr Testvater').id`);run(`openRelatedPerson('${rpId}')`);const rf2=w.document.getElementById('relatedPersonForm');assert.equal(rf2.elements.name.value,'Herr Testvater','Bearbeiten füllt das Formular');
 rf2.elements.mayContact.value='Ja';rf2.requestSubmit();await sleep(30);assert.equal(run(`data.relatedPersons.filter(r=>r.name==='Herr Testvater').length`),1,'keine Kopie');
 assert(!/Herr Testvater/.test(w.document.getElementById('akteSperre').textContent),'Sperre aufgehoben');assert.equal(run(`data.relatedPersons.find(r=>r.name==='Herr Testvater').verlauf.length`),1,'Änderung mit Verlauf');
 run(`closeModal('studentModal')`);
 // Suche mit Komma und vertauschter Reihenfolge
 const st=run(`(()=>{const s=data.students.find(x=>x.id==='s2');return {l:s.last,f:s.first}})()`);
 for(const q of [st.l+', '+st.f,st.f+' '+st.l]){run(`document.getElementById('globalSearch').value=${JSON.stringify(q)};globalSearchTippen()`);assert(/globalSearchOeffnen\('s2'\)/.test(w.document.getElementById('globalSearchResults').innerHTML),'Suche findet: '+q);}
 run(`document.getElementById('globalSearch').value='';globalSearchTippen()`);
 // Gruppengespräch nicht mehr als Art im Einzelformular, aber als Link
 run(`selectedStudentId='s1';showStudent('s1');dossierEntry('event')`);const ef=w.document.getElementById('dossierEditForm');
 assert(![...ef.elements.type.options].some(o=>o.value==='Gruppengespräch'),'Art „Gruppengespräch“ nur noch über das Gruppenformular');assert(/Gruppengespräch/.test(ef.querySelector('.dossier-gruppe-hinweis').textContent));
 run(`closeModal('dossierEditModal');closeModal('studentModal')`);
 await waitSaved();console.log('0.21 sofort sichtbar ok');
 }

 // 19. Version 0.22: Trainingsraum mit Schnellauswahl, ein Anlass-Feld
 {
 run(`document.querySelectorAll('.modal.open').forEach(m=>m.id?closeModal(m.id):m.remove());selectedStudentId='s1';showStudent('s1');openTrainingRoom('s1')`);
 const tf=w.document.getElementById('trainingRoomForm');
 assert(!/Sachliche Situationsbeschreibung/.test(tf.textContent),'keine doppelte Situationsbeschreibung mehr');
 tf.elements.referringTeacher.value='Frau Muster';
 const klick=(name,wert)=>{const x=tf.querySelector(`input[name="${name}"][value="${wert}"]`);x.checked=true;x.dispatchEvent(new w.Event('change',{bubbles:true}));};
 klick('reason','Konflikt');klick('lesson','3. Stunde');klick('duration','30');
 klick('tr_reflection','Schüler:in erkennt eigene Anteile teilweise.');klick('tr_agreement','Entschuldigung und klärendes Gespräch werden vereinbart.');klick('tr_agreement','Ein Elterngespräch wird vereinbart.');
 tf.elements.note.value='Streit in der Gruppenarbeit.';const n0=run('data.trainingRoom.length');tf.requestSubmit();await sleep(40);
 assert.equal(run('data.trainingRoom.length'),n0+1,'gespeichert');const tr=run('data.trainingRoom.at(-1)');
 assert.equal(tr.reason,'Konflikt');assert.equal(tr.lesson,'3. Stunde');assert.equal(tr.duration,30);assert.match(tr.agreement,/Entschuldigung.*Elterngespräch/);assert.match(tr.reflection,/Anteile teilweise/);
 assert(!Object.keys(tr).some(k=>k.startsWith('tr_')),'keine Hilfsfelder gespeichert');
 assert(/Streit in der Gruppenarbeit/.test(run(`data.journal.find(e=>e.id==='${tr.journalEntryId}').content`)),'Beschreibung in der Chronik');
 assert([...w.document.querySelectorAll('#studentDetailBody [id^="ds-"]')].some(k=>/Trainingsraum/.test(k.textContent)&&/Konflikt/.test(k.textContent)),'sofort in der offenen Akte');
 run(`closeModal('studentModal')`);await waitSaved();console.log('0.22 trainingsraum ok');
 }

 // 20. Version 0.24: Grundsätze – nur Hinweise, nichts automatisch
 {
 const ja=async()=>{await sleep(20);const b=[...w.document.querySelectorAll('.modal.open [data-r="1"]')].at(-1);assert(b,'Bestätigung erwartet');b.click();await sleep(40);};
 run(`document.querySelectorAll('.modal.open').forEach(m=>m.id?closeModal(m.id):m.remove());selectedStudentId='s1';showStudent('s1');dossierEntry('event')`);
 const ef=w.document.getElementById('dossierEditForm');const ursprung='Anna ist total empfindlich, die Mutter kümmert sich nicht.';
 ef.elements.content.value=ursprung;run('dossierTextPreview()');
 const wl=w.document.querySelector('#dossierTextPreview .dossier-text-wertungen');
 assert(wl&&!wl.hidden,'Wertungen angezeigt');assert(/empfindlich/.test(wl.textContent)&&/kümmert sich nicht/.test(wl.textContent)&&/Was genau hast du beobachtet/.test(wl.textContent));
 assert.equal(ef.elements.content.value,ursprung,'Text bleibt unverändert');
 ef.elements.content.value='Jana kommt ohne Frühstück.';ef.elements.content.dispatchEvent(new w.Event('input',{bubbles:true}));await sleep(320);
 const live=w.document.getElementById('dossierSafetyLive');assert(!live.hidden&&/ohne Frühstück/.test(live.textContent)&&/erkennt nicht alles/.test(live.textContent),'Vernachlässigung im Live-Hinweis');
 ef.elements.content.value='Anna berichtet sachlich.';run('dossierTextPreview()');assert(w.document.querySelector('#dossierTextPreview .dossier-text-wertungen').hidden,'sachlicher Text ohne Liste');
 run(`closeModal('dossierEditModal');closeModal('studentModal')`);
 // Trainingsraum: Beratungsinhalt erkennen und übernehmen
 run(`openTrainingRoom('s1')`);const tf=w.document.getElementById('trainingRoomForm');
 tf.elements.note.value='Hat gestört. Erzählt, dass zu Hause die Eltern sich ständig streiten.';tf.elements.note.dispatchEvent(new w.Event('input',{bubbles:true}));await sleep(320);
 const th=tf.querySelector('.tr-beratung-hinweis');assert(th&&!th.hidden&&/Beratungsgespräch/.test(th.textContent)&&/Familie/.test(th.textContent),'Hinweis im Trainingsraum');
 const p=run('trInBeratungUebernehmen()');await ja();await p;
 assert.equal(tf.elements.note.value,'','Text aus dem Trainingsraum genommen');assert(th.hidden,'Hinweis weg');
 assert(/Eltern sich ständig streiten/.test(w.document.querySelector('#dossierEditModal textarea[name=content]').value),'Text im Beratungsgespräch');
 assert(isOpen('trainingRoomModal'),'Trainingsraum bleibt offen');
 run(`closeModal('dossierEditModal');closeModal('studentModal');closeModal('trainingRoomModal')`);run(`openTrainingRoom('s1')`);assert(!tf.querySelector('.tr-beratung-hinweis')||tf.querySelector('.tr-beratung-hinweis').hidden,'nach Neuöffnen kein alter Hinweis');
 tf.elements.note.value='Hat dazwischengerufen.';tf.elements.note.dispatchEvent(new w.Event('input',{bubbles:true}));await sleep(320);assert(tf.querySelector('.tr-beratung-hinweis').hidden,'sachlicher Vorgang ohne Hinweis');
 run(`closeModal('trainingRoomModal')`);
 // Gruppengespräch: Persönliches über ein genanntes Kind
 run(`openGroupTalk(['s1','s2'])`);const gf=w.document.getElementById('groupTalkForm');
 gf.elements.note.value='Streit in der Pause. Bert erzählt, Annas Eltern trennen sich.';gf.elements.note.dispatchEvent(new w.Event('input',{bubbles:true}));await sleep(320);
 const gh=gf.querySelector('.gt-persoenlich-hinweis');assert(gh&&!gh.hidden&&/allen 2 Akten/.test(gh.textContent)&&/Anna Beispiel/.test(gh.textContent),'Hinweis im Gruppengespräch');
 gh.querySelector('button').click();await sleep(20);assert(w.document.querySelector('#gtKindNotizen details')?.open,'Zusatz pro Kind geöffnet');
 gf.elements.note.value='Streit in der Pause, Regel vereinbart.';gf.elements.note.dispatchEvent(new w.Event('input',{bubbles:true}));await sleep(320);assert(gh.hidden,'sachlich: kein Hinweis');
 run(`closeModal('groupTalkModal')`);
 // Kopf der Akte: Entbindung, Prüfdatum, Auftrag nach Wiederaufnahme
 run(`(()=>{const s=data.students.find(x=>x.id==='s3');s.family={custodyStatus:'Gemeinsames Sorgerecht',verifiedAt:'2024-01-10'};data.relatedPersons.push({id:'rp-t24',studentId:'s3',name:'Beratungsstelle',role:'Beratungsstelle',mayContact:'Ja',releaseStatus:'Abgelaufen'});
  Dossier.saveAuftrag(data,'s3',{requester:'Kind selbst',childNeed:'x',assignedOrder:'Begleitung',date:'2026-01-10'});data.statusHistory.push({id:'sh-t24',studentId:'s3',date:'2026-02-01',fromStatus:'Abgeschlossen',status:'Wiederaufgenommen'});
  data.journal.push({id:'j-t24',date:'2026-02-01',type:'Schülergespräch / Einzelberatung',title:'x',content:'x',participantIds:['s3']});selectedStudentId='s3';showStudent('s3')})()`);
 const sp=w.document.getElementById('akteSperre').textContent;assert(/Schweigepflichtentbindung abgelaufen: Beratungsstelle/.test(sp)&&/zuletzt geprüft am 10\.01\.2024/.test(sp),'gelbe Hinweise im Aktenkopf');
 assert(/wieder aufgenommen\. Ist der Auftrag noch aktuell\?/.test(w.document.getElementById('studentDetailBody').textContent),'Auftrag erneut prüfen');
 run(`closeModal('studentModal')`);
 // Aufbewahrung: Frist 5 Jahre, einzeln löschen, Protokoll ohne Namen
 run(`data.students.push({id:'sAlt',first:'Ehemals',last:'Testkind',className:'10a',schoolYear:'2019/20',active:false,archivedAt:'2020-07-15',enrollments:[]});data.journal.push({id:'jAlt',date:'2020-03-01',type:'Schülergespräch / Einzelberatung',title:'alt',content:'alt',participantIds:['sAlt']});save();go('dashboard')`);
 assert(/Aufbewahrungsfrist überschritten/.test(w.document.getElementById('dashboardStart').textContent),'Hinweis auf Heute');
 run(`go('settings')`);const lk=w.document.getElementById('loeschKarte');assert(/Ehemals Testkind/.test(lk.textContent)&&/5 Jahre/.test(lk.textContent),'Löschkarte listet die Akte');
 const pl=run(`akteEndgueltigLoeschen('sAlt')`);await ja();await pl;await sleep(20);
 assert(!run(`data.students.some(s=>s.id==='sAlt')`)&&!run(`data.journal.some(e=>e.id==='jAlt')`),'Akte gelöscht');
 assert.equal(run('data.loeschprotokoll.length'),1);assert(!/Ehemals/.test(JSON.stringify(run('data.loeschprotokoll'))),'Protokoll ohne Namen');
 assert(!/Ehemals Testkind/.test(w.document.getElementById('loeschKarte').textContent)&&/Löschprotokoll \(1\)/.test(w.document.getElementById('loeschKarte').textContent));
 // Abgang über die Akte setzt das Abgangsdatum (Grundlage der Frist)
 run(`selectedStudentId='s3';showStudent('s3');toggleStudentStatus()`);await sleep(20);
 const af=w.document.getElementById('dossierEditForm');af.elements.date.value='2026-07-31';af.requestSubmit();await sleep(60);
 assert.equal(run(`data.students.find(s=>s.id==='s3').archivedAt`),'2026-07-31','Abgangsdatum gespeichert');
 assert(!run(`Dossier.loeschfaellig(data).some(x=>x.sid==='s3')`),'Frist läuft erst ab Abgang');
 run(`closeModal('studentModal');go('dashboard')`);await waitSaved();console.log('0.24 grundsätze ok');
 }

 console.log('errors',errors);
 if(errors.length)process.exitCode=1;
 w.close();
})().catch(err=>{console.error(err);process.exitCode=1;setTimeout(()=>process.exit(1),100);});
