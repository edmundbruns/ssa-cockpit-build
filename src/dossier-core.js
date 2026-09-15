/* Dauerhafte Schülerakten. Reine Datenfunktionen, auch unter Node testbar. */
(function(root){
'use strict';
const collections=['contacts','groupTalks','classActivities','trainingRoom','schoolSignals','casePlans','statusHistory','outcomeAssessments','documentEvents','portalRequests','events','verfahrenLaeufe','journal','assessments','yearTransitions'];
const uid=prefix=>prefix+'-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
const day=()=>new Date().toISOString().slice(0,10);
const iso=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v))&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
function schoolYear(date){if(!iso(String(date).slice(0,10)))return '';const y=Number(date.slice(0,4))-(Number(date.slice(5,7))<8?1:0);return y+'/'+String(y+1).slice(-2)}
const validYear=y=>/^20\d{2}\/\d{2}$/.test(y)&&Number(y.slice(-2))===(Number(y.slice(0,4))+1)%100;
const classValid=c=>/^(?:[1-9]|10)[a-z]?$/i.test(c)||/^skg(?:[ -]?[12ab])?$/i.test(c);
const norm=v=>String(v||'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('de');
function ids(state,r){if(r.participantIds)return [...new Set(r.participantIds)];const sid=r.studentId||r.sourceStudentId||state.cases?.find(c=>c.id===r.caseId)?.studentId;return sid?[sid]:[]}
function recordDate(r){return String(r.eventDate||r.date||r.startDate||r.createdAt||r.importedAt||'').slice(0,10)}
function context(state,sid,date,year=''){
 const s=state.students.find(s=>s.id===sid);if(!s)return {className:'',schoolYear:year||schoolYear(date),unknown:true};
 const y=year||schoolYear(date);const es=s.enrollments||[];
 const dated=es.filter(e=>e.validFrom&&e.validFrom<=date&&(!e.validTo||date<e.validTo)).sort((a,b)=>b.validFrom.localeCompare(a.validFrom));
 const same=es.filter(e=>e.schoolYear===y);const e=dated[0]||(same.length===1?same[0]:null);
 if(e)return {className:e.className,schoolYear:e.schoolYear,unknown:!e.validFrom};
 if(s.schoolYear===y&&same.length===0)return {className:s.className,schoolYear:y,unknown:true};
 return {className:'',schoolYear:y,unknown:true};
}
function recordContext(state,r,sid){return r.studentContexts?.[sid]|| (r.className?{className:r.className,schoolYear:r.schoolYear||schoolYear(recordDate(r))}:context(state,sid,recordDate(r),r.schoolYear))}
function stamp(state,r){
 const date=recordDate(r);const people=ids(state,r);if(!r.studentContexts)r.studentContexts={};
 for(const sid of people)if(!r.studentContexts[sid])r.studentContexts[sid]=r.className?{className:r.className,schoolYear:r.schoolYear||schoolYear(date)}:context(state,sid,date,r.schoolYear);
 if(!r.schoolYear)r.schoolYear=schoolYear(date);
 if(!r.className&&people.length===1)r.className=r.studentContexts[people[0]].className;
 return r;
}
function normalize(state){
 state.settings=state.settings||{};state.students=state.students||[];state.cases=state.cases||[];state.tasks=state.tasks||[];
 for(const k of collections)state[k]=state[k]||[];
 state.importLinks=state.importLinks||{};state.classLeadHistory=state.classLeadHistory||{};
 if(state.settings.currentSchoolYear&&!state.classLeadHistory[state.settings.currentSchoolYear])state.classLeadHistory[state.settings.currentSchoolYear]={...(state.settings.classLeads||{})};
 for(const s of state.students){s.enrollments=s.enrollments||[];if(!s.enrollments.length&&s.schoolYear&&s.className)s.enrollments.push({schoolYear:s.schoolYear,className:s.className,validFrom:'',validTo:'',dateUnknown:true});}
 for(const k of collections)for(const r of state[k])stamp(state,r);
 for(const t of state.tasks){if(!t.participantIds)t.participantIds=ids(state,t);if(t.status==='erledigt'||t.status==='entfällt')t.done=true;else if(t.done)t.status='erledigt';else if(!t.status)t.status='offen';stamp(state,t);}
 state.settings.dossierVersion=1;return state;
}
function lookup(state,p,source){
 const key=p.givenId?source+'|'+p.givenId:'';const mapped=key&&state.importLinks[key];
 const sid=mapped|| (p.givenId&&state.students.some(s=>s.id===p.givenId)?p.givenId:'');
 const student=state.students.find(s=>s.id===sid);
 const candidates=state.students.filter(s=>norm(s.first)===norm(p.first)&&norm(s.last)===norm(p.last));
 return {studentId:student?.id||'',candidates:candidates.map(s=>s.id),identityConfirmed:!!student&&norm(student.first)===norm(p.first)&&norm(student.last)===norm(p.last)};
}
function preview(state,pupils,{source='Schülerliste',year=state.settings.currentSchoolYear,effectiveDate='',classLeads={}}={}){
 const rows=pupils.map(p=>{const m=lookup(state,p,source);return {pupil:{...p,schoolYear:p.schoolYear||year},...m,action:m.identityConfirmed?'update':'review',confirmed:m.identityConfirmed};});
 const present=new Set(rows.map(r=>r.studentId).filter(Boolean));
 for(const s of state.students)if(s.active!==false&&!present.has(s.id))rows.push({studentId:s.id,pupil:null,action:'keep',confirmed:true,missing:true});
 return {source,schoolYear:year,effectiveDate,classLeads,rows};
}
function validate(state,plan){
 const errors=[],used=new Set(),external=new Set();
 if(!validYear(plan.schoolYear))errors.push('Schuljahr im Format 2027/28 angeben.');
 if(!iso(plan.effectiveDate)||schoolYear(plan.effectiveDate)!==plan.schoolYear)errors.push('Gültig-ab-Datum muss im gewählten Schuljahr liegen.');
 if(plan.schoolYear<state.settings.currentSchoolYear)errors.push('Ein älterer Import darf die aktuelle Klassenzuordnung nicht zurücksetzen.');
 for(const [i,r]of plan.rows.entries()){
  if(['keep','skip'].includes(r.action))continue;
  if(!r.confirmed||r.action==='review'){errors.push('Zeile '+(i+1)+': Zuordnung prüfen.');continue;}
  if(!['update','new','leave','transfer'].includes(r.action)){errors.push('Unbekannte Aktion.');continue;}
  if(r.studentId){if(!state.students.some(s=>s.id===r.studentId))errors.push('Unbekannte Schüler-ID.');if(used.has(r.studentId))errors.push('Ein Kind ist mehrfach zugeordnet.');used.add(r.studentId);}
  if(['leave','transfer'].includes(r.action)){if(!r.studentId)errors.push('Abgang ohne Schüler-ID.');continue;}
  const p=r.pupil;if(!p||!classValid(p.className)||!p.last||!p.first)errors.push('Zeile '+(i+1)+': Name oder Klasse prüfen.');
  if(p&&p.schoolYear!==plan.schoolYear)errors.push('Die Liste enthält unterschiedliche Schuljahre.');
  if(r.action==='update'&&!r.studentId)errors.push('Bestehende Akte auswählen.');
  if(r.action==='new'&&r.studentId)errors.push('Neuaufnahme ist bereits zugeordnet.');
  if(p?.givenId){const k=plan.source+'|'+p.givenId;const mapped=state.importLinks[k]||(state.students.some(s=>s.id===p.givenId)?p.givenId:'');if(external.has(k))errors.push('Kennung kommt mehrfach vor.');external.add(k);if(mapped&&mapped!==r.studentId)errors.push('Gespeicherte Kennung gehört bereits zu einer anderen Akte.');}
  const s=state.students.find(s=>s.id===r.studentId);if(s&&(s.enrollments||[]).some(e=>e.validFrom>plan.effectiveDate))errors.push('Es gibt bereits eine spätere Klassenzuordnung.');
 }
 return [...new Set(errors)];
}
function changeEnrollment(state,s,p,date,reason){
 const from=s.className,fromYear=s.schoolYear;
 if(from===p.className&&fromYear===p.schoolYear&&s.active!==false)return false;
 for(const e of s.enrollments)if(!e.validTo)e.validTo=date;
 s.enrollments.push({schoolYear:p.schoolYear,className:p.className,validFrom:date,validTo:'',recordedAt:new Date().toISOString(),reason});
 s.className=p.className;s.schoolYear=p.schoolYear;s.active=true;
 state.yearTransitions.push(stamp(state,{id:uid('year'),studentId:s.id,date,schoolYear:p.schoolYear,className:p.className,fromClass:from,fromSchoolYear:fromYear,title:`Schuljahr ${p.schoolYear} · Wechsel von ${from||'Neuaufnahme'} nach ${p.className}`,reason,createdAt:new Date().toISOString()}));
 for(const t of state.tasks)if(!t.done&&ids(state,t).includes(s.id))t.assignmentReview='Klassen- oder Schuljahreswechsel: Zuständigkeit prüfen; bisherige Person bleibt zuständig.';
 return true;
}
function archive(state,sid,date,reason){
 if(!iso(date))throw Error('Abgangsdatum prüfen.');const s=state.students.find(s=>s.id===sid);if(!s)throw Error('Schülerakte fehlt.');if(s.active===false)return;
 s.active=false;s.archivedAt=date;s.archiveReason=reason;
 for(const e of s.enrollments)if(!e.validTo)e.validTo=date;
 state.yearTransitions.push(stamp(state,{id:uid('year'),studentId:sid,date,title:reason,reason,createdAt:new Date().toISOString()}));
 for(const t of state.tasks)if(!t.done&&ids(state,t).includes(sid))t.assignmentReview='Bestätigter Abgang: offene Aufgabe und Zuständigkeit prüfen.';
}
function apply(state,plan){
 const errors=validate(state,plan);if(errors.length)throw Error(errors.join('\n'));
 normalize(state); // Freeze all historical contexts BEFORE changing any class.
 for(const r of plan.rows){
  if(['skip','keep'].includes(r.action))continue;
  if(['leave','transfer'].includes(r.action)){archive(state,r.studentId,plan.effectiveDate,r.action==='transfer'?'Bestätigter Schulwechsel':'Bestätigter Schulabgang');continue;}
  const p=r.pupil;let s=state.students.find(s=>s.id===r.studentId);
  if(!s){s={id:uid('pupil'),first:p.first,last:p.last,active:true,enrollments:[]};state.students.push(s);}
  changeEnrollment(state,s,p,plan.effectiveDate,r.reason||'Geprüfte Klassenzuordnung');
  for(const k of ['first','last','address','district','phone','guardian1','guardian2'])if(p[k]!==undefined&&p[k]!=='')s[k]=p[k];
  if(p.givenId)state.importLinks[plan.source+'|'+p.givenId]=s.id;
  // Rows get their resolved identity so reapplying a plan cannot duplicate new pupils.
  r.studentId=s.id;r.action='update';
 }
 const oldYear=state.settings.currentSchoolYear;
 state.classLeadHistory[oldYear]={...(state.settings.classLeads||{})};
 state.settings.currentSchoolYear=plan.schoolYear;
 state.settings.classLeads=oldYear===plan.schoolYear?{...state.settings.classLeads,...plan.classLeads}:{...plan.classLeads};
 state.classLeadHistory[plan.schoolYear]={...state.settings.classLeads};
 return state;
}
function addEntry(state,input){
 const participantIds=[...new Set(input.participantIds||[])];
 if(!participantIds.length||participantIds.some(sid=>!state.students.some(s=>s.id===sid)))throw Error('Teilnehmende Kinder auswählen.');
 if(!iso(input.date)||!String(input.content||'').trim())throw Error('Datum und Inhalt angeben.');
 const e=stamp(state,{...input,id:uid('entry'),participantIds,createdAt:new Date().toISOString(),duration:Math.max(0,Number(input.duration)||0),individualNotes:input.individualNotes||{},revisions:[],pinnedFor:[]});
 if(participantIds.length>1&&input.individualNotes&&Object.keys(input.individualNotes).some(sid=>!participantIds.includes(sid)))throw Error('Individuelle Notiz ist keinem teilnehmenden Kind zugeordnet.');
 state.journal.push(e);return e;
}
function editEntry(state,e,changes,author){e.revisions=e.revisions||[];const before=structuredClone(e);delete before.revisions;e.revisions.push({at:new Date().toISOString(),author,before});for(const k of ['content','title','source','childView','otherView','observation','assessment','agreement','goal','result','decision','planned','plannedDate','individualNotes'])if(k in changes)e[k]=changes[k];}
function addTask(state,input){
 if(!String(input.title||'').trim()||!String(input.assignedTo||'').trim())throw Error('Aufgabe und Zuständigkeit angeben.');
 if(input.due&&!iso(input.due))throw Error('Termin prüfen.');
 const t=stamp(state,{...input,id:uid('task'),status:'offen',done:false,createdAt:new Date().toISOString(),history:[]});state.tasks.push(t);return t;
}
function setTask(state,t,changes,author){
 const status=changes.status||t.status;
 if(!['offen','in Bearbeitung','wartet auf Rückmeldung','erledigt','entfällt'].includes(status))throw Error('Status prüfen.');
 if(changes.due&&!iso(changes.due))throw Error('Termin prüfen.');
 if(['erledigt','entfällt'].includes(status)&&!String(changes.result||t.result||'').trim())throw Error('Ergebnis beziehungsweise Grund kurz eintragen.');
 t.history=t.history||[];t.history.push({at:new Date().toISOString(),author,status:t.status,due:t.due,assignedTo:t.assignedTo,result:t.result});
 Object.assign(t,changes,{status,done:['erledigt','entfällt'].includes(status)});
 if(t.done){t.completedAt=changes.completedAt||day();t.completedBy=author;}
 else {t.completedAt='';}
 return t;
}
function assess(state,sid,input){
 if(!['gruen','gelb','rot','grau'].includes(input.color)||!input.reason?.trim()||!input.author?.trim()||!iso(input.date))throw Error('Farbe, Begründung, Datum und bewertende Person angeben.');
 const a=stamp(state,{...input,id:uid('assessment'),studentId:sid,createdAt:new Date().toISOString()});state.assessments.push(a);return a;
}
function currentAssessment(state,sid){return state.assessments.filter(a=>a.studentId===sid).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt))[0]||null}
function work(state,sid){return state.tasks.filter(t=>ids(state,t).includes(sid))}
function timeline(state,sid,legacy=[]){
 const items=legacy.filter(e=>!state.tasks.some(t=>t.id===e.id)).map(e=>({...e,key:'legacy:'+e.id,legacy:true,context:recordContext(state,e,sid)}));
 for(const e of state.journal.filter(e=>e.participantIds.includes(sid)))items.push({...e,key:'entry:'+e.id,eventKind:e.type,context:recordContext(state,e,sid),individualNote:e.individualNotes?.[sid]||''});
 for(const e of state.assessments.filter(e=>e.studentId===sid))items.push({...e,key:'assessment:'+e.id,eventKind:'Fachliche Ampelbewertung',title:e.color,content:e.reason,responsible:e.author,context:recordContext(state,e,sid)});
 for(const e of state.yearTransitions.filter(e=>e.studentId===sid))items.push({...e,key:'year:'+e.id,eventKind:'Schuljahresverlauf',content:e.reason,context:recordContext(state,e,sid)});
 for(const t of work(state,sid))items.push({...t,key:'task:'+t.id,task:true,date:t.due||'',eventKind:'Nächster Schritt',content:t.result||t.expectedResult||'',planned:!t.done,context:recordContext(state,t,sid)});
 for(const k of ['portalRequests','events','verfahrenLaeufe'])for(const e of state[k]||[])if(ids(state,e).includes(sid)&&!items.some(x=>x.id===e.id))items.push({...e,key:'legacy:'+e.id,date:recordDate(e),eventKind:k==='portalRequests'?'Schüleranfrage':k==='verfahrenLaeufe'?'Fachverfahren':'Termin',title:e.title||e.topic||e.workflowId||'Weiterer Eintrag',content:e.message||e.note||'',legacy:true,context:recordContext(state,e,sid)});
 for(const e of state.journal.filter(e=>e.participantIds.includes(sid)&&e.planned&&e.plannedDate))items.push({key:'appointment:'+e.id,id:e.id,date:e.plannedDate,eventKind:'Geplanter Termin',title:e.title,content:'Durchführung noch nicht bestätigt.',planned:true,sourceEntryKey:'entry:'+e.id,context:context(state,sid,e.plannedDate)});
 return items.sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999'))||String(a.time||'').localeCompare(String(b.time||''))||String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
}
function journalStats(state,year='',className='all'){
 return state.journal.filter(e=>!e.planned&&e.type!=='zusätzliche Information'&&(!year||e.schoolYear===year)&& (className==='all'||e.participantIds.some(sid=>{const cl=recordContext(state,e,sid).className;return className.startsWith('jg:')?cl.match(/^\d+/)?.[0]===className.slice(3):cl===className}))).map(e=>({...e,duration:e.duration*Math.max(1,(e.facilitators||[]).length)}));
}
root.Dossier={uid,iso,schoolYear,validYear,classValid,ids,context,recordContext,stamp,normalize,lookup,preview,validate,apply,archive,addEntry,editEntry,addTask,setTask,assess,currentAssessment,work,timeline,journalStats};
})(globalThis);
