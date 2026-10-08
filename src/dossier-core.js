/* Dauerhafte Schülerakten. Reine Datenfunktionen, auch unter Node testbar. */
(function(root){
'use strict';
const collections=['contacts','groupTalks','classActivities','trainingRoom','schoolSignals','casePlans','statusHistory','outcomeAssessments','documentEvents','portalRequests','events','verfahrenLaeufe','journal','assessments','yearTransitions','auftraege','quickContacts'];
const SAFETY_NOTICE='Das Programm erkennt keine Gefährdung. Maßgeblich sind deine Einschätzung und das Schutzkonzept der Schule.';
const uid=prefix=>prefix+'-'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));
const day=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
const iso=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v))&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
function schoolYear(date){if(!iso(String(date).slice(0,10)))return '';const y=Number(date.slice(0,4))-(Number(date.slice(5,7))<8?1:0);return y+'/'+String(y+1).slice(-2)}
const validYear=y=>/^20\d{2}\/\d{2}$/.test(y)&&Number(y.slice(-2))===(Number(y.slice(0,4))+1)%100;
const classValid=c=>/^(?:[1-9]|10)[a-z]?$/i.test(c)||/^skg(?:[ -]?[12ab])?$/i.test(c);
const germanDate=v=>{const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}.${m[2]}.${m[1]}`:''};
function nextClass(value){
 const raw=String(value||'').trim();
 if(/^skg(?:[ -]?[12ab])?$/i.test(raw))return '1a';
 const match=raw.match(/^(\d+)([a-z]?)$/i);
 if(!match)return '';
 const grade=Number(match[1]);
 if(grade>=10)return '';
 return String(grade+1)+(match[2]||'');
}
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
function isGroupEntry(entry){const n=(entry.participantIds||[]).length;if(['Kurznotiz','Zusage erledigt'].includes(entry.type))return true;return n>=3||(n>1&&/gruppe|sozialtraining|klassen|mediation|konfliktkl/iu.test(String(entry.type||'')));}
function journalCase(state,sid,entry,reopen=false){
 const student=state.students.find(s=>s.id===sid);if(!student)return;
 const existing=state.cases.find(c=>c.studentId===sid);
 if(existing){
  if(reopen&&existing.status==='Abgeschlossen'){
   state.statusHistory.push(stamp(state,{id:uid('sh'),caseId:existing.id,studentId:sid,date:entry.date,fromStatus:existing.status,status:'Wiederaufgenommen',responsible:entry.responsible||'SSA',reason:'Neuer Chronikeintrag'}));
   existing.status='Wiederaufgenommen';
  }
  if(reopen&&(!existing.lastContact||existing.lastContact<entry.date))existing.lastContact=entry.date;
  return;
 }
 // 0.13: Gruppen, Sozialtrainings und Klasseneinträge legen keine neuen Fallakten an; bestehende Akten erhalten nur den Kontakt.
 if(isGroupEntry(entry))return;
 const caseId=uid('c');
 state.cases.push({id:caseId,studentId:sid,first:student.first,last:student.last,lastContact:entry.date,className:student.className,status:'Klärungsphase',reason:entry.type||entry.title||'Dokumentierter Chronikeintrag',goal:'',contacts:0,createdAt:entry.createdAt||new Date().toISOString()});
 state.statusHistory.push(stamp(state,{id:uid('sh'),caseId,studentId:sid,date:entry.date,status:'Klärungsphase',fromStatus:'',responsible:entry.responsible||'SSA',reason:'Fallakte aus personenbezogenem Chronikeintrag angelegt'}));
}
function normalize(state){
 state.settings=state.settings||{};state.auftraege=Array.isArray(state.auftraege)?state.auftraege:[];state.schnellnotizen=Array.isArray(state.schnellnotizen)?state.schnellnotizen:[];state.zugangswege=Array.isArray(state.zugangswege)?state.zugangswege:[];state.taetigkeiten=Array.isArray(state.taetigkeiten)?state.taetigkeiten:[];state.weitergaben=Array.isArray(state.weitergaben)?state.weitergaben:[];state.geplanteGespraeche=Array.isArray(state.geplanteGespraeche)?state.geplanteGespraeche:[];state.students=state.students||[];state.cases=state.cases||[];state.tasks=state.tasks||[];
 for(const k of collections)state[k]=state[k]||[];
 state.importLinks=state.importLinks||{};state.classLeadHistory=state.classLeadHistory||{};
 for(const c of state.cases){const student=state.students.find(s=>s.id===c.studentId);if(!c.lastContact&&/^\d{4}-\d{2}-\d{2}$/.test(String(c.last||''))){c.lastContact=c.last;c.last=student?.last||'';}if(!c.lastContact)c.lastContact=c.last||'';}
 if(state.settings.currentSchoolYear&&!state.classLeadHistory[state.settings.currentSchoolYear])state.classLeadHistory[state.settings.currentSchoolYear]={...(state.settings.classLeads||{})};
 for(const s of state.students){s.enrollments=s.enrollments||[];if(!s.enrollments.length&&s.schoolYear&&s.className)s.enrollments.push({schoolYear:s.schoolYear,className:s.className,validFrom:'',validTo:'',dateUnknown:true});}
 for(const k of collections)for(const r of state[k])stamp(state,r);
 for(const t of state.tasks){if(!t.participantIds)t.participantIds=ids(state,t);if(t.status==='erledigt'||t.status==='entfällt')t.done=true;else if(t.done)t.status='erledigt';else if(!t.status)t.status='offen';stamp(state,t);}
 // Repair records created by earlier versions without a corresponding case.
 for(const entry of state.journal){
  if(entry.type!=='Kurzkontakt'&&!entry.generalInfo)for(const sid of entry.participantIds||[])journalCase(state,sid,entry);
  if((entry.suggestionVersion||0)<4){
   const decided=(entry.actionSuggestions||[]).filter(s=>s.status==='übernommen'||s.status==='nicht verwendet');
   entry.actionSuggestions=entry.generalInfo?[]:[...decided,...localSuggestions(entry,state).filter(s=>!decided.some(d=>d.title===s.title))].slice(0,Math.max(3,decided.length));
   entry.suggestionVersion=4;
  }
 }
 if(!ssaTeam(state).includes(state.settings.activeUser))state.settings.activeUser=aktiveMitarbeitende(state);
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
/* Schuljahreswechsel für ganze Klassen (0.19). Nur Zeilen mit eindeutig bestätigter Identität (action 'update')
   und noch nicht geprüfte Zeilen werden angefasst; einzeln geprüfte Zeilen (z. B. Wiederholer) bleiben, wie sie sind. */
function jahrKlassen(state,plan){
 const m=new Map();
 (plan?.rows||[]).forEach((r,i)=>{if(!r.pupil||!r.studentId)return;const alt=state.students.find(x=>x.id===r.studentId)?.className||'';if(!m.has(alt))m.set(alt,{alt,ziel:nextClass(alt)||'',idx:[]});m.get(alt).idx.push(i);});
 return [...m.values()].map(k=>{const rows=k.idx.map(i=>plan.rows[i]);return {...k,n:k.idx.length,offen:rows.filter(r=>!r.confirmed).length,moeglich:rows.filter(r=>!r.confirmed&&r.action==='update').length,abschluss:!k.ziel};}).sort((a,b)=>String(a.alt).localeCompare(String(b.alt),'de',{numeric:true}));
}
function klasseUebernehmen(state,plan,alt,neu){
 const k=jahrKlassen(state,plan).find(x=>x.alt===alt);if(!k)throw Error('Klasse nicht gefunden.');
 const ziel=neu==null?'':String(neu).trim();
 if(ziel&&!classValid(ziel))throw Error('Neue Klasse prüfen.');
 if(k.abschluss&&!ziel)throw Error('Abschlussklasse '+alt+': bitte als Schulabgang bestätigen oder eine neue Klasse eintragen.');
 let n=0,uebersprungen=0;
 for(const i of k.idx){const r=plan.rows[i];if(r.confirmed)continue;if(r.action!=='update'){uebersprungen++;continue;}
  if(ziel){r.pupil.className=ziel;r.reason=ziel===k.ziel?'Reguläre Versetzung':k.abschluss?'Wiederholung':'Geprüfte Klassenzuordnung';r.graduating=false;}
  if(r.graduating)continue;
  r.confirmed=true;n++;}
 return {n,uebersprungen};
}
function alleKlassenUebernehmen(state,plan){let n=0,uebersprungen=0;const abschluss=[];for(const k of jahrKlassen(state,plan)){if(k.abschluss){if(k.offen)abschluss.push(k.alt);continue;}const x=klasseUebernehmen(state,plan,k.alt);n+=x.n;uebersprungen+=x.uebersprungen;}return {n,uebersprungen,abschluss};}
function klasseAbgang(state,plan,alt,art='leave'){
 if(!['leave','transfer'].includes(art))throw Error('Unbekannte Art.');
 const k=jahrKlassen(state,plan).find(x=>x.alt===alt);if(!k)throw Error('Klasse nicht gefunden.');
 let n=0;for(const i of k.idx){const r=plan.rows[i];if(r.confirmed||r.action!=='update')continue;r.action=art;r.confirmed=true;n++;}
 return {n};
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
  if(r.action==='update'&&(r.reason==='Abschlussjahrgang – Abgang / Wechsel prüfen'||(/^10(?:[a-z])?$/i.test(String(state.students.find(x=>x.id===r.studentId)?.className||''))&&/^10(?:[a-z])?$/i.test(String(p?.className||''))&&!['Wiederholung','Überspringen'].includes(r.reason))))errors.push('Zeile '+(i+1)+': Abschlussjahrgang bitte als Schulabgang, Schulwechsel, Wiederholung oder Überspringen kennzeichnen.');
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
// Versionierte Fachverfahren für die automatische Chronik-Einordnung.
const FACHVERFAHREN_KATALOG=[
{id:'absentismus',version:'1.1',topic:'Schulabsentismus',keywords:['fehlzeit','fehlzeiten','fehlstund','fehltag','unentschuldigt','schwänz','schulabsent','schulvermeidung','webuntis','entschuldigung'],steps:[
{title:'Fehlzeiten und Entschuldigungsstatus mit Klassenleitung abgleichen',rationale:'Zeitraum, Fehlstunden, offene Entschuldigungen und bekannte schulische Beobachtungen gemeinsam prüfen.',taskType:'Rücksprache',dueDays:2},
{title:'Mit dem Kind und den Sorgeberechtigten eine Rückkehrvereinbarung prüfen',rationale:'Einen erreichbaren nächsten Schultag, Unterstützung im Alltag und einen festen Rückmeldetermin vereinbaren.',taskType:'Unterstützungsplan',dueDays:5},
{title:'Bei Wiederholung die nächste Stufe des Schulabsentismus-Verfahrens prüfen',rationale:'Verlauf, bisherige Gespräche und Unterstützungsangebote dokumentiert bewerten.',taskType:'Fachverfahren',dueDays:5}]},
{id:'mobbing',version:'1.1',topic:'Mobbing und Cybermobbing',keywords:['mobbing','cybermobbing','ausgrenz','gruppenchat','beleidigung','bloßstellung','hänsel','ausgelacht','auslach','seit wochen','immer wieder','schubs'],steps:[
{title:'Betroffene und beschuldigte Kinder getrennt anhören',rationale:'Konkrete Handlungen, Zeitpunkte, Orte, digitale Belege und das aktuelle Sicherheitsgefühl getrennt dokumentieren.',taskType:'Konfliktklärung',dueDays:1},
{title:'Sofortige Schutz- und Aufsichtsmaßnahmen mit der Schulleitung abstimmen',rationale:'Sicherheit im Unterricht, in Pausen und in digitalen Gruppen klären. Keine gemeinsame Mediation bei Machtungleichgewicht.',taskType:'Schutzweg',dueDays:1},
{title:'Klassenleitung und Sorgeberechtigte abgestimmt einbeziehen',rationale:'Informationsumfang, Zuständigkeit und ein überprüfbarer Rückmeldetermin müssen festgelegt werden.',taskType:'Fallbesprechung',dueDays:3}]},
{id:'konflikt',version:'1.1',topic:'Konfliktklärung',keywords:['konflikt','streit','auseinandersetzung','mediation','versöhnung','palaverzelt'],steps:[
{title:'Beteiligte Kinder getrennt anhören',rationale:'Sichtweisen, Auslöser, Bedürfnisse und mögliche Sicherheit getrennt festhalten.',taskType:'Konfliktklärung',dueDays:2},
{title:'Prüfen, ob eine freiwillige Vermittlung geeignet ist',rationale:'Vermittlung nur bei ausreichender Sicherheit, Freiwilligkeit und ohne erhebliches Machtungleichgewicht anbieten.',taskType:'Konfliktklärung',dueDays:3},
{title:'Gemeinsame Vereinbarung und Überprüfungstermin dokumentieren',rationale:'Konkretes Verhalten, Zuständigkeit und Termin zur Rückmeldung festlegen.',taskType:'Vereinbarung',dueDays:5}]},
{id:'psychisch',version:'1.1',topic:'Psychische Belastung',keywords:['angst','rückzug','belastung','krise','wohlbefinden','schulpsycholog','panik','traurig'],steps:[
{title:'Belastung und Unterstützungswunsch des Kindes klären',rationale:'Aktuelle Situation, Ressourcen, schulische Auslöser und einen kleinen nächsten Schritt festhalten.',taskType:'Schülergespräch',dueDays:2},
{title:'Schulpsychologische Beratung als Option prüfen',rationale:'Mit Kind und Sorgeberechtigten Einwilligung und Umfang einer möglichen Weitervermittlung klären.',taskType:'Fachberatung',dueDays:5},
{title:'Bei akuter Krise sofort den schulischen Schutzweg aktivieren',rationale:'Akute Hinweise nicht aufschieben und mit Schulleitung sowie zuständiger Fachberatung abstimmen.',taskType:'Schutzweg',dueDays:0}]},
{id:'selbstgefaehrdung',version:'1.0',topic:'Akute Selbstgefährdung',keywords:['nicht mehr leben','umbringen','suizid','ritz','selbstverletz','sterben wollen'],steps:[
{title:'Kind nicht allein lassen und sofort die Schulleitung informieren',rationale:'Die aktuelle Sicherheit unmittelbar klären und den schulischen Krisenweg aktivieren.',taskType:'Schutzweg',dueDays:0},
{title:'Sorgeberechtigte und bei akuter Gefahr den Notruf nach Schutzweg einbeziehen',rationale:'Kontakt und Informationsumfang fachlich sowie entlang der Leitungslinie festlegen; bei unmittelbarer Gefahr 112.',taskType:'Schutzweg',dueDays:0},
{title:'Krisendienst oder zuständige Fachberatung als nächsten Schritt prüfen',rationale:'Nach der akuten Sicherung eine passende fachliche Unterstützung und Rückmeldung vereinbaren.',taskType:'Fachberatung',dueDays:1}]},
{id:'gewalt-bedrohung',version:'1.0',topic:'Gewalt, Bedrohung und Waffen',keywords:['messer','waffe','bedroh','geschlagen','schlägt','getreten'],steps:[
{title:'Sicherheit herstellen und schulischen Notfallplan aktivieren',rationale:'Beteiligte trennen, unmittelbare Gefahr einschätzen und die Schulleitung sofort einbeziehen.',taskType:'Schutzweg',dueDays:0},
{title:'Beobachtungen, Aussagen und Beteiligte sachlich dokumentieren',rationale:'Zeitpunkt, Ort, konkrete Handlung und bereits ergriffene Schutzmaßnahmen festhalten.',taskType:'Dokumentation',dueDays:0},
{title:'Weitere Schritte mit Schulleitung und zuständigen Stellen prüfen',rationale:'Je nach Gefahrenlage, Leitungslinie und schulischem Notfallplan über weitere Beteiligung entscheiden.',taskType:'Schutzweg',dueDays:0}]},
{id:'kinderschutz',version:'1.1',topic:'Kinderschutz',keywords:['kindeswohl','kinderschutz','vernachlässig','missbrauch','blaue flecken','hämatom','geschlagen','angefasst','anfass','unsittlich','übergriff','sexualisiert'],steps:[
{title:'Heute Schutzlage mit der Schulleitung abstimmen',rationale:'Unmittelbaren Schutz, Zuständigkeit und das örtlich vereinbarte Verfahren klären.',taskType:'Schutzweg',dueDays:0},
{title:'Beobachtungen und Aussagen getrennt dokumentieren',rationale:'Wörtliche Aussagen, eigene Beobachtungen, Zeitpunkte und bereits ergriffene Schritte sachlich sichern.',taskType:'Dokumentation',dueDays:0},
{title:'Kinderschutzfachberatung oder Jugendamt nach Schutzweg einbeziehen',rationale:'Nach der internen Abstimmung den vorgesehenen Beratungsweg dokumentiert nutzen.',taskType:'Schutzweg',dueDays:0}]},
{id:'lernen',version:'1.1',topic:'Lern- und Unterstützungsbedarf',keywords:['lernproblem','förderbedarf','inklusion','teilhabe','mobiler dienst','unterrichtsbegleitung','konzentration'],steps:[
{title:'Beobachtbaren Unterstützungsbedarf beschreiben',rationale:'Konkrete Situationen, Ressourcen und eine kleine überprüfbare Veränderung festhalten.',taskType:'Fallklärung',dueDays:3},
{title:'Klassenleitung und Beratungslehrkraft einbeziehen',rationale:'Unterrichtsbeobachtung und bisherige Fördermaßnahmen gemeinsam abgleichen.',taskType:'Rücksprache',dueDays:5},
{title:'Mobilen Dienst oder weitere Fachberatung als Option prüfen',rationale:'Erforderliche Informationen und Einwilligung vor einer Weitergabe klären.',taskType:'Fachberatung',dueDays:7}]},
{id:'eltern',version:'1.1',topic:'Elterngespräch und Vereinbarung',keywords:['elterngespräch','elternkontakt','sorgeberechtigt','familie','erziehungsberechtigt'],steps:[
{title:'Gesprächsanliegen und Ziel mit den Sorgeberechtigten klären',rationale:'Beobachtungen sachlich benennen, Sichtweisen aufnehmen und ein erreichbares Ziel festlegen.',taskType:'Elterngespräch',dueDays:5},
{title:'Vereinbarung mit Zuständigkeit und Termin dokumentieren',rationale:'Wer macht was bis wann? Die Vereinbarung muss für alle Beteiligten verständlich sein.',taskType:'Vereinbarung',dueDays:5},
{title:'Rückmeldung zur Umsetzung einholen',rationale:'Zum vereinbarten Termin prüfen, was sich verändert hat und ob weitere Unterstützung nötig ist.',taskType:'Rückmeldung',dueDays:14}]},
{id:'sozialtraining',version:'1.1',topic:'Sozialtraining und Klassenklima',keywords:['sozialtraining','klassentraining','klassenklima','soziales lernen','gruppenangebot','präventionsangebot'],steps:[
{title:'Ziel und beobachtbares Verhalten für das Training festlegen',rationale:'Ein konkretes Klassen- oder Gruppenziel mit kurzer Auswertung vereinbaren.',taskType:'Projektplanung',dueDays:5},
{title:'Sozialtraining mit Klassenleitung und SSA abstimmen',rationale:'Teilnehmende, Termine, Rolle der Durchführenden und Rückmeldeweg festlegen.',taskType:'Sozialtraining',dueDays:7},
{title:'Wirkung des Angebots nach dem vereinbarten Zeitraum prüfen',rationale:'Beobachtungen und Rückmeldungen auswerten, ohne automatisch eine Wirkung zu behaupten.',taskType:'Überprüfung',dueDays:21}]},
{id:'weitervermittlung',version:'1.1',topic:'Externe Weitervermittlung',keywords:['extern','weitervermittlung','jugendamt','beratungsstelle','therapie','fachstelle','netzwerk'],steps:[
{title:'Unterstützungsbedarf und Einwilligung für eine Weitervermittlung klären',rationale:'Vor einer Kontaktaufnahme Zweck, Informationsumfang und Einwilligung dokumentieren.',taskType:'Fallklärung',dueDays:3},
{title:'Passende interne oder externe Fachstelle auswählen',rationale:'Nur eine Stelle aus dem hinterlegten Netzwerk mit nachvollziehbarem Anlass vorschlagen.',taskType:'Fachberatung',dueDays:5},
{title:'Rückmeldung zur Weitervermittlung mit Termin nachhalten',rationale:'Offenhalten, ob Kontakt hergestellt wurde und welcher nächste schulische Schritt vereinbart ist.',taskType:'Rückmeldung',dueDays:14}]},
{id:'stoerung',version:'1.1',topic:'Unterrichtsstörung und Trainingsraum',keywords:['unterrichtsstörung','trainingsraum','störung','schimpfwort','rückkehrvereinbarung'],steps:[
{title:'Reflexionsgespräch und Rückkehrvereinbarung dokumentieren',rationale:'Auslöser, Sicht des Kindes und einen konkreten Rückkehrschritt festhalten.',taskType:'Schülergespräch',dueDays:3},
{title:'Klassenleitung zur Umsetzung befragen',rationale:'Nach einigen Schultagen Rückmeldung zur vereinbarten Verhaltensänderung einholen.',taskType:'Rückmeldung',dueDays:5},
{title:'Bei Wiederholung ein Sozialtraining oder Fachverfahren prüfen',rationale:'Bisherige Schritte und einen passenden nächsten Unterstützungsrahmen gemeinsam bewerten.',taskType:'Fachverfahren',dueDays:7}]},
{id:'vereinbarung',version:'1.1',topic:'Vereinbarung und Zielüberprüfung',keywords:['vereinbarung','absprache','ziel','maßnahme','überprüfung'],steps:[
{title:'Umsetzung der Vereinbarung überprüfen',rationale:'Veränderung und nächster sinnvoller Termin mit den Beteiligten klären.',taskType:'Überprüfung',dueDays:7}]}
];
// Selbstgefährdung wird auch bei Verneinung angezeigt: „sagt nicht, dass …“ muss trotzdem geprüft werden.
const SCHUTZ_OHNE_VERNEINUNG=new Set(['selbstgefaehrdung']);
// 0.24: Vernachlässigung zeigt sich selten in einem Wort – daher kleine Satzmuster
const VERNACHLAESSIGUNG_MUSTER=[
 [/(?:^|[^\p{L}])ohne\s+(?:frühstück|essen|pausenbrot|mittagessen|jacke|winterjacke)/iu,'ohne Frühstück/Essen/Jacke'],
 [/(?:^|[^\p{L}])(?:hungrig|(?:hat|habe|hatte|hätte|hab)\s+(?:oft\s+|immer\s+|großen\s+|so\s+)?hunger|hunger\s+(?:hat|hatte|habe))(?![\p{L}])/iu,'Hunger'],
 [/(?:^|[^\p{L}])(?:zu\s+dünne?\p{L}*\s+(?:kleidung|angezogen|jacke|sachen)|dünne\s+kleidung|keine\s+(?:winter)?jacke)/iu,'unpassende Kleidung'],
 [/(?:^|[^\p{L}])allein(?:e)?\s+(?:zu\s*hause|daheim)/iu,'allein zu Hause'],
 [/(?:^|[^\p{L}])(?:auf|um)\s+(?:meinen|meine|seinen|seine|ihren|ihre|den|die|das)?\s*(?:kleinen?\s+)?(?:bruder|schwester|geschwister|baby)\s+(?:aufpassen|kümmern)/iu,'muss auf Geschwister aufpassen'],
 [/(?:^|[^\p{L}])(?:ungepflegt|verwahrlos|ungewaschen)/iu,'Pflege/Hygiene'],
 [/(?:^|[^\p{L}])(?:mama|mutter|papa|vater)\s+(?:ist\s+|sei\s+|liegt\s+)?(?:viel|oft|immer|den\s+ganzen\s+tag|nur)\s+(?:im\s+bett|am\s+schlafen|betrunken)/iu,'Eltern oft nicht ansprechbar']
];
const SCHUTZ_VERFAHREN=['selbstgefaehrdung','gewalt-bedrohung','kinderschutz'];
function fachverfahren_match(entry,state){
 const hay=[entry.type,entry.title,entry.content,entry.observation,entry.assessment,entry.agreement,entry.goal,entry.result].filter(Boolean).join(' ').normalize('NFC');
 const hit=(keyword)=>{const escaped=String(keyword).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const re=new RegExp('(?:^|[^\\p{L}\\p{N}])'+escaped+'[\\p{L}\\p{N}]*','iu');const m=re.exec(hay);if(!m)return false;const before=hay.slice(0,m.index).split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(-3);const negated=!SCHUTZ_OHNE_VERNEINUNG.has(currentProcedure)&&before.some(w=>/^(nicht|kein|keine|keinen|keiner|nie|niemals|ohne)$/iu.test(w));const after=hay.slice(m.index+m[0].length,m.index+m[0].length+45);if(/^kindeswohl$/iu.test(keyword)&&/(?:ist|sei|wäre|war)?\s*nicht\s+gefährdet/iu.test(after))return false;return !negated;};
 let currentProcedure='';
 const matches=FACHVERFAHREN_KATALOG.map(v=>{currentProcedure=v.id;const matchedKeywords=v.keywords.filter(hit);return matchedKeywords.length?{...v,matchedKeywords}:null}).filter(Boolean);
 const hasMobbing=matches.some(v=>v.id==='mobbing');
 const hasChildProtectionEvidence=/(?:blaue\s+flecken|hämatom|vater|mutter|zuhause).{0,80}(?:geschlagen|getreten|anfass)/iu.test(hay);
 const filtered=hasChildProtectionEvidence?matches.filter(v=>v.id!=='gewalt-bedrohung'):matches;
 return hasMobbing?filtered.filter(v=>v.id!=='konflikt'):filtered;
}
function schutzTreffer(entry,fachverfahren){
 const hits=fachverfahren.filter(v=>SCHUTZ_VERFAHREN.includes(v.id)).flatMap(v=>v.matchedKeywords||[]);
 if(/(?:angst|fürchte|furcht).{0,35}(?:nach\s+hause|zu\s+hause)/iu.test([entry.title,entry.content,entry.observation,entry.assessment].filter(Boolean).join(' ')))hits.push('Angst vor Zuhause');
 // 0.24: leise Hinweise auf Vernachlässigung – „ohne“ ist hier kein Verneinungswort
 const text=[entry.title,entry.content,entry.observation,entry.assessment].filter(Boolean).join(' ');
 for(const [re,label] of VERNACHLAESSIGUNG_MUSTER)if(re.test(text))hits.push(label);
 return [...new Set(hits)];
}
// Live-Hinweis im Formular: nur wenn ein Schutzstichwort tatsächlich vorkommt.
function safetyHint(text){const fachverfahren=fachverfahren_match({content:String(text||'')},{});const hits=schutzTreffer({content:String(text||'')},fachverfahren);return hits.length?{hits,topics:[...new Set(fachverfahren.filter(v=>SCHUTZ_VERFAHREN.includes(v.id)).map(v=>v.topic))]}:null;}

/* ===== 0.15: Kategorien für die Statistik – feste IDs, Anzeigetexte getrennt, Version je Schuljahr (ab 1.8.) =====
   Änderungen an den Listen nur zum Schuljahreswechsel: neue Version mit neuem gueltigAb anlegen, alte stehen lassen. */
const KATEGORIEN_VERSIONEN=[{version:'2026/27',gueltigAb:'2026-08-01',merkmale:{
 kontaktart:[['kurzkontakt','Kurzkontakt'],['beratungsgespraech','Beratungsgespräch'],['informationsaustausch','Informationsaustausch'],['krisengespraech','Krisengespräch'],['gruppe','Gruppe'],['klasse','Klasse']],
 zugangsweg:[['schueler_selbst','Kind selbst'],['lehrkraft','Lehrkraft'],['pm','PM'],['eltern','Eltern'],['schulleitung','Schulleitung'],['mitschueler','Mitschüler:in'],['ssa','SSA'],['anfrageportal','Anfrageportal'],['extern','Extern']],
 beteiligte:[['schueler','Schüler:in'],['ssa','Schulsozialarbeit'],['eltern','Eltern'],['lehrkraft','Lehrkraft'],['schulleitung','Schulleitung'],['jugendamt','Jugendamt'],['fachstelle_andere','Andere Fachstelle']],
 thema:[['konflikt_mobbing','Konflikt / Mobbing','4.3 Gewalt- und Konfliktprävention'],['familie','Familie','4.2 Beratung'],['fehlzeiten_schulangst','Fehlzeiten / Schulangst','4.3 Schulverweigerung/Absentismus'],['emotionen_krise','Gefühle / Krise','4.2 Beratung'],['lernen_motivation','Lernen / Motivation','4.2 Beratung'],['verhalten_unterricht','Verhalten im Unterricht','4.3 Gewalt- und Konfliktprävention'],['medien','Medien','4.3 Gesundheitsförderung'],['sucht','Sucht','4.3 Gesundheitsförderung'],['gesundheit','Gesundheit','4.3 Gesundheitsförderung'],['berufsorientierung','Berufsorientierung','4.4 Berufsorientierung'],['kinderschutz','Kinderschutz','4.2 Beratung'],['sonstiges','Sonstiges','']],
 ergebnis:[['weiter_begleitet','Weiter begleitet'],['abgeschlossen','Abgeschlossen'],['weitervermittelt','Weitervermittelt'],['massnahme_vereinbart','Maßnahme vereinbart']],
 taetigkeit:[['klassenprojekt_praevention','Klassenprojekt / Prävention','4.3 Prävention'],['konferenz','Konferenz','4.2 Kooperation'],['elternabend','Elternabend','4.2 Beratung Erziehungsberechtigte'],['lehrkraefteberatung','Beratung von Lehrkräften','4.2 Beratung Lehrkräfte'],['kollegiale_beratung','Kollegiale Beratung','Qualitätssicherung'],['netzwerk','Netzwerkarbeit','4.2 Netzwerkarbeit'],['fortbildung','Fortbildung','Qualitätssicherung'],['pausenpraesenz','Pausenpräsenz','4.3 Prävention'],['verwaltung','Verwaltung','Verwaltung'],['sonstiges','Sonstiges','']],
 dauer_kurz:[[5,'5 Min.'],[10,'10 Min.'],[15,'15 Min.'],[30,'30 Min.']],
 dauer:[[5,'5 Min.'],[10,'10 Min.'],[15,'15 Min.'],[30,'30 Min.'],[45,'45 Min.'],[60,'60 Min.'],[90,'90 Min.']]
}}];
function kategorien(date){const d=String(date||day()).slice(0,10);return KATEGORIEN_VERSIONEN.filter(v=>v.gueltigAb<=d).at(-1)||KATEGORIEN_VERSIONEN[0];}
function katListe(merkmal,date){return (kategorien(date).merkmale[merkmal]||[]).map(([id,label,feld])=>({id,label,feld:feld||''}));}
function katLabel(merkmal,id){if(id==null||id==='')return 'nicht erfasst';for(const v of KATEGORIEN_VERSIONEN){const x=(v.merkmale[merkmal]||[]).find(e=>String(e[0])===String(id));if(x)return x[1];}return String(id);}
function stufeZweig(className){const m=String(className||'').match(/^\s*(\d{1,2})/);const stufe=m?Number(m[1]):null;return {stufe,zweig:stufe==null?'':stufe<=4?'GS':stufe<=10?'OBS':''};}
function klassenSnapshot(state,participantIds,date){const out={};for(const sid of participantIds||[]){const c=context(state,sid,date).className||'';out[sid]={klasse:c,...stufeZweig(c)};}return out;}
function statErfassen(state,input,participantIds,date){
 const k=kategorien(date),ok=(m,v)=>(k.merkmale[m]||[]).some(e=>String(e[0])===String(v));
 const stat={version:k.version,quelle:'erfasst',kontaktart:ok('kontaktart',input.kontaktart)?input.kontaktart:'',themen:[...new Set((input.themen||[]).filter(v=>ok('thema',v)))],beteiligte:[...new Set((input.beteiligte||[]).filter(v=>ok('beteiligte',v)))],dauer_min:Math.max(0,Number(input.dauer_min)||0)||null,ergebnis:ok('ergebnis',input.ergebnis)?input.ergebnis:'',mitarbeitend:String(input.mitarbeitend||aktiveMitarbeitende(state)),klassen:klassenSnapshot(state,participantIds,date)};
 if(input.teilnehmende)stat.teilnehmende=Math.max(0,Number(input.teilnehmende)||0);return stat;
}
// Zugangsweg: genau einmal je Kind und Schuljahr
function zugangswegFuer(state,sid,date){const sy=schoolYear(String(date||day()));return (state.zugangswege||[]).find(z=>z.studentId===sid&&z.schoolYear===sy)||null;}
function zugangswegSetzen(state,sid,zugangsweg,date,quelle='erfasst'){
 if(!zugangsweg)return null;if(!katListe('zugangsweg',date).some(e=>e.id===zugangsweg))throw Error('Zugangsweg unbekannt.');
 const vorhanden=zugangswegFuer(state,sid,date);if(vorhanden)return vorhanden;
 const z={id:uid('zugang'),studentId:sid,schoolYear:schoolYear(String(date||day())),zugangsweg,date:String(date||day()).slice(0,10),quelle,createdAt:new Date().toISOString()};state.zugangswege.push(z);return z;
}
// Tätigkeit ohne Fall
function addTaetigkeit(state,input){
 const date=input.date||day();if(!iso(date))throw Error('Datum prüfen.');
 if(!katListe('taetigkeit',date).some(e=>e.id===input.taetigkeit))throw Error('Bitte eine Tätigkeit auswählen.');
 const t=stamp(state,{id:uid('taetigkeit'),date,schoolYear:schoolYear(date),kategorieVersion:kategorien(date).version,taetigkeit:input.taetigkeit,dauer_min:Math.max(0,Number(input.dauer_min)||0)||null,klasse:String(input.klasse||'').trim(),...stufeZweig(input.klasse),teilnehmende:Math.max(0,Number(input.teilnehmende)||0)||null,notiz:String(input.notiz||'').trim(),mitarbeitend:String(input.mitarbeitend||aktiveMitarbeitende(state)),createdAt:new Date().toISOString()});
 state.taetigkeiten.push(t);return t;
}
// Merkmale eines Eintrags für die Auswertung. Gespeicherte Werte gelten; bei alten Einträgen wird nur Eindeutiges übernommen
// („übernommen“), alles andere ist „nicht erfasst“. Gespeicherte Daten werden dabei nicht verändert.
const ALTE_ANLAESSE={'Streit':'konflikt_mobbing','Familie':'familie','Sorgen':'emotionen_krise','Schule/Lernen':'lernen_motivation'};
const ALTE_ENTSCHEIDUNG={'fortführen':'weiter_begleitet','abschließen':'abgeschlossen'};
const KEIN_KONTAKT=['Kurznotiz','Zusage erledigt','zusätzliche Information','Mitteilung an Kollegium'];
function statMerkmale(state,e){
 if(!e||KEIN_KONTAKT.includes(e.type)||e.generalInfo||e.planned)return null;
 if(e.stat&&e.stat.quelle==='erfasst')return e.stat;
 const typ=String(e.type||''),n=(e.participantIds||[]).length;
 const kontaktart=typ==='Kurzkontakt'?'kurzkontakt':/sozialtraining|klassen/iu.test(typ)?'klasse':/gruppe|mediation|konfliktkl/iu.test(typ)&&n>1||n>2?'gruppe':n?'beratungsgespraech':'';
 const themen=[...new Set((e.occasions||[]).map(o=>ALTE_ANLAESSE[o]).filter(Boolean))];
 return {version:'',quelle:'uebernommen',kontaktart,themen,beteiligte:[],dauer_min:Number(e.duration)>0?Number(e.duration):null,ergebnis:ALTE_ENTSCHEIDUNG[e.decision]||'',mitarbeitend:e.responsible||'',klassen:klassenSnapshot(state,e.participantIds,e.date),teilnehmende:kontaktart==='gruppe'||kontaktart==='klasse'?n:null};
}
/* ===== 0.16: Einheitliche Ereignisquelle und Auswertung (Statistik Schritt 2) =====
   Alle Zahlen entstehen aus ereignisse(): Chronik-Einträge, anonyme Kurzkontakte, alte Fallverlaufs-Kontakte,
   alte Gruppengespräche, Klassenmaßnahmen und Tätigkeiten ohne Fall. Keine zweite Datenhaltung. */
const NICHT_ERFASST='nicht_erfasst';
/* Mitarbeitende (0.17): feste Team-Liste, alte Schreibweisen werden beim Auswerten zugeordnet.
   Gespeicherte Einträge bleiben unverändert; die Zuordnung liegt in settings.mitarbeitendZuordnung. */
const SSA_TEAM_STANDARD=['Bruns, Edmund','Thien, Sabine','Anerkennungspraktikantin Laura Geiger'];
const SAMMELNAMEN=['ssa-team','ssa team','ssa','schulsozialarbeit','team','ich'];
function ssaTeam(state){const t=(state.settings?.ssaTeam||[]).map(x=>String(x||'').trim()).filter(Boolean);return t.length?[...new Set(t)]:[...SSA_TEAM_STANDARD];}
function namensTeile(s){return String(s||'').toLowerCase().replace(/[.,;:()\/]+/g,' ').split(/\s+/).filter(Boolean);}
// Automatische Zuordnung: alle Namensteile der alten Schreibweise kommen in genau einem Teammitglied vor
function mitarbeitendAuto(team,roh){
 const r=String(roh||'').trim();if(!r)return '';if(team.includes(r))return r;
 if(SAMMELNAMEN.includes(r.toLowerCase()))return '';
 const teile=namensTeile(r);if(!teile.length)return null;
 const treffer=team.filter(t=>{const tt=namensTeile(t);return teile.every(x=>tt.includes(x));});
 return treffer.length===1?treffer[0]:null;
}
// Ergebnis: Teammitglied, '' (nicht zugeordnet) oder die unveränderte Angabe (z. B. „Andere Person oder Institution“)
function mitarbeitendKanonisch(state,roh){
 const r=String(roh||'').trim(),team=ssaTeam(state),map=state.settings?.mitarbeitendZuordnung||{};
 if(Object.prototype.hasOwnProperty.call(map,r)){const z=map[r];return z===''||team.includes(z)?z:r;}
 const a=mitarbeitendAuto(team,r);return a===null?r:a;
}
// Alle vorkommenden Schreibweisen mit Anzahl und aktueller Zuordnung (für die Einstellungen)
function mitarbeitendSchreibweisen(state){
 const m=new Map(),team=ssaTeam(state),add=v=>{const r=String(v||'').trim();if(!r)return;m.set(r,(m.get(r)||0)+1);};
 for(const e of state.journal||[])if(!e.deletedAt)add(e.stat?.mitarbeitend||e.responsible);
 for(const q of state.quickContacts||[])if(q.anonymous)add(q.mitarbeitend);
 for(const c of state.contacts||[])add(c.responsible);
 for(const g of state.groupTalks||[])add(g.responsible);
 for(const a of state.classActivities||[])add(a.facilitator);
 for(const t of state.taetigkeiten||[])add(t.mitarbeitend);
 return [...m.entries()].filter(([r])=>!team.includes(r)).map(([roh,anzahl])=>({roh,anzahl,zuordnung:mitarbeitendKanonisch(state,roh),auto:!Object.prototype.hasOwnProperty.call(state.settings?.mitarbeitendZuordnung||{},roh)})).sort((a,b)=>b.anzahl-a.anzahl||a.roh.localeCompare(b.roh,'de'));
}
function mitarbeitendZuordnen(state,roh,ziel){
 state.settings=state.settings||{};const map=state.settings.mitarbeitendZuordnung=state.settings.mitarbeitendZuordnung||{};
 const z=String(ziel??'').trim();if(z==='__auto')delete map[roh];else if(z===''||ssaTeam(state).includes(z))map[roh]=z;else throw new Error('Bitte eine Person aus dem SSA-Team wählen.');
}
// Wer arbeitet gerade? Immer ein Teammitglied.
function aktiveMitarbeitende(state){const a=mitarbeitendKanonisch(state,state.settings?.activeUser);const team=ssaTeam(state);return team.includes(a)?a:team[0];}
function zugangKarte(state){const m=new Map();for(const z of state.zugangswege||[])if(!m.has(z.studentId+'|'+z.schoolYear))m.set(z.studentId+'|'+z.schoolYear,z.zugangsweg);return m;}
function kindAus(state,sid,date,snap){const s=snap&&snap[sid];if(s&&s.stufe!=null)return {sid,stufe:s.stufe,zweig:s.zweig};const c=context(state,sid,date).className||'';return {sid,...stufeZweig(c)};}
function ereignisse(state){
 const out=[],d=r=>String(r||'').slice(0,10);
 const push=(ev)=>{if(!iso(ev.date))return;ev.schoolYear=schoolYear(ev.date);ev.monat=ev.date.slice(0,7);out.push(ev);};
 for(const e of state.journal||[]){if(e.deletedAt)continue;const st=statMerkmale(state,e);if(!st)continue;
  const kinder=(e.participantIds||[]).map(sid=>kindAus(state,sid,e.date,st.klassen));
  push({id:'entry:'+e.id,art:'kontakt',quelle:st.quelle,date:d(e.date),kontaktart:st.kontaktart||'',themen:st.themen||[],beteiligte:st.beteiligte||[],dauer_min:st.dauer_min||null,ergebnis:st.ergebnis||'',mitarbeitend:st.mitarbeitend||e.responsible||'',kinder,anonym:false,teilnehmende:st.teilnehmende||null,entryId:e.id});}
 for(const q of state.quickContacts||[]){if(!q.anonymous)continue;const sz=stufeZweig(q.grade||q.className);const erfasst=!!q.kategorieVersion;
  push({id:'quick:'+q.id,art:'kontakt',quelle:erfasst?'erfasst':'uebernommen',date:d(q.date),kontaktart:'kurzkontakt',themen:erfasst?(q.themen||[]):[...new Set((q.occasions||[]).map(o=>ALTE_ANLAESSE[o]).filter(Boolean))],beteiligte:['schueler'],dauer_min:Number(q.duration)||null,ergebnis:'',mitarbeitend:q.mitarbeitend||'',kinder:[],anonym:true,stufeAnonym:sz.stufe,zweigAnonym:sz.zweig,teilnehmende:null});}
 for(const c of state.contacts||[]){const sid=ids(state,c)[0];if(!sid)continue;
  push({id:'contact:'+c.id,art:'kontakt',quelle:'uebernommen',date:d(c.date),kontaktart:'beratungsgespraech',themen:[],beteiligte:[],dauer_min:Number(c.duration)||null,ergebnis:'',mitarbeitend:c.responsible||'',kinder:[kindAus(state,sid,c.date)],anonym:false,teilnehmende:null});}
 for(const g of state.groupTalks||[]){const p=g.participantIds||[];if(!p.length)continue;
  push({id:'group:'+g.id,art:'kontakt',quelle:'uebernommen',date:d(g.date),kontaktart:'gruppe',themen:[],beteiligte:[],dauer_min:Number(g.duration)||null,ergebnis:'',mitarbeitend:g.responsible||'',kinder:p.map(sid=>kindAus(state,sid,g.date)),anonym:false,teilnehmende:p.length});}
 for(const a of state.classActivities||[]){const sz=stufeZweig(a.className);
  push({id:'class:'+a.id,art:'kontakt',quelle:'uebernommen',date:d(a.date),kontaktart:'klasse',themen:[],beteiligte:[],dauer_min:Number(a.duration)||null,ergebnis:'',mitarbeitend:a.facilitator||'',kinder:[],anonym:true,stufeAnonym:sz.stufe,zweigAnonym:sz.zweig,teilnehmende:(a.participantIds||[]).length||Number(a.participants)||null});}
 for(const t of state.taetigkeiten||[])push({id:'taetigkeit:'+t.id,art:'taetigkeit',quelle:'erfasst',date:d(t.date),taetigkeit:t.taetigkeit,dauer_min:t.dauer_min||null,mitarbeitend:t.mitarbeitend||'',kinder:[],anonym:true,stufeAnonym:t.stufe??null,zweigAnonym:t.zweig||'',teilnehmende:t.teilnehmende||null,themen:[],beteiligte:[],kontaktart:'',ergebnis:''});
 for(const ev of out){ev.mitarbeitendRoh=ev.mitarbeitend;ev.mitarbeitend=mitarbeitendKanonisch(state,ev.mitarbeitend);}
 return out;
}
const KONTAKT_FILTER=['thema','zugangsweg','kontaktart','ergebnis'];
// Kinder eines Ereignisses, die zum Stufen-/Zweigfilter passen
function kinderImFilter(ev,f){return ev.kinder.filter(k=>(f.stufe==null||f.stufe===''||String(k.stufe)===String(f.stufe))&&(!f.zweig||k.zweig===f.zweig));}
function passtStufe(ev,f){if((f.stufe==null||f.stufe==='')&&!f.zweig)return true;if(ev.kinder.length)return kinderImFilter(ev,f).length>0;return (f.stufe==null||f.stufe===''||String(ev.stufeAnonym)===String(f.stufe))&&(!f.zweig||ev.zweigAnonym===f.zweig);}
function filterEreignisse(evs,f={},zk=new Map()){
 return evs.filter(ev=>{
  if(f.von&&ev.date<f.von)return false;if(f.bis&&ev.date>f.bis)return false;
  if(KONTAKT_FILTER.some(k=>f[k])&&ev.art!=='kontakt')return false;
  if(f.taetigkeit&&(ev.art!=='taetigkeit'||ev.taetigkeit!==f.taetigkeit))return false;
  if(f.mitarbeitend&&ev.mitarbeitend!==f.mitarbeitend)return false;
  if(!passtStufe(ev,f))return false;
  if(f.kontaktart&&(ev.kontaktart||NICHT_ERFASST)!==f.kontaktart)return false;
  if(f.thema&&!(ev.themen.length?ev.themen:[NICHT_ERFASST]).includes(f.thema))return false;
  if(f.ergebnis&&(ev.ergebnis||NICHT_ERFASST)!==f.ergebnis)return false;
  if(f.zugangsweg&&!kinderImFilter(ev,f).some(k=>(zk.get(k.sid+'|'+ev.schoolYear)||NICHT_ERFASST)===f.zugangsweg))return false;
  return true;});
}
function runde1(x){return Math.round(x*10)/10;}
function personenVon(ev,f={}){if(ev.art==='taetigkeit')return ev.teilnehmende||0;if(ev.kontaktart==='gruppe'||ev.kontaktart==='klasse')return ev.kinder.length?kinderImFilter(ev,f).length:(ev.teilnehmende||0);return 1;}
function kennzahlen(evs,f={}){
 const kontakte=evs.filter(e=>e.art==='kontakt'),kinder=new Set(),faelle=new Set();let minuten=0,ohneDauer=0,personen=0,anonym=0;
 for(const ev of evs){if(ev.dauer_min)minuten+=ev.dauer_min;else ohneDauer++;personen+=personenVon(ev,f);}
 for(const ev of kontakte){if(ev.anonym&&ev.kontaktart==='kurzkontakt')anonym++;for(const k of kinderImFilter(ev,f)){kinder.add(k.sid+'|'+ev.schoolYear);if(['beratungsgespraech','krisengespraech'].includes(ev.kontaktart))faelle.add(k.sid+'|'+ev.schoolYear);}}
 return {erreichteSchueler:kinder.size,anonymeKurzkontakte:anonym,einzelfaelle:faelle.size,kontakte:kontakte.length,stunden:runde1(minuten/60),minuten,ohneDauer,erreichtePersonen:personen,taetigkeiten:evs.length-kontakte.length};
}
// Werte eines Ereignisses für ein Merkmal (Mehrfachwerte möglich); [] = trifft nicht zu
function werteVon(ev,merkmal,f={},zk=new Map()){
 const kinder=kinderImFilter(ev,f);
 switch(merkmal){
  case 'kontaktart':return ev.art==='kontakt'?[ev.kontaktart||NICHT_ERFASST]:[];
  case 'thema':return ev.art==='kontakt'?(ev.themen.length?[...new Set(ev.themen)]:[NICHT_ERFASST]):[];
  case 'beteiligte':return ev.art==='kontakt'?(ev.beteiligte.length?[...new Set(ev.beteiligte)]:[NICHT_ERFASST]):[];
  case 'ergebnis':return ev.art==='kontakt'&&['beratungsgespraech','krisengespraech'].includes(ev.kontaktart)?[ev.ergebnis||NICHT_ERFASST]:[];
  case 'zugangsweg':return ev.art==='kontakt'&&!ev.anonym?[...new Set(kinder.map(k=>zk.get(k.sid+'|'+ev.schoolYear)||NICHT_ERFASST))]:[];
  case 'stufe':{const v=ev.kinder.length?kinder.map(k=>k.stufe):[ev.stufeAnonym];return [...new Set(v.map(x=>x==null||x===''?NICHT_ERFASST:String(x)))];}
  case 'zweig':{const v=ev.kinder.length?kinder.map(k=>k.zweig):[ev.zweigAnonym];return [...new Set(v.map(x=>x||NICHT_ERFASST))];}
  case 'monat':return [ev.monat];
  case 'mitarbeitend':return [ev.mitarbeitend||NICHT_ERFASST];
  case 'taetigkeit':return ev.art==='taetigkeit'?[ev.taetigkeit]:[];
  case 'arbeitsbereich':return [ev.art==='taetigkeit'?(['konferenz','netzwerk','lehrkraefteberatung','kollegiale_beratung','elternabend'].includes(ev.taetigkeit)?'kooperation':ev.taetigkeit==='verwaltung'?'verwaltung':ev.taetigkeit==='fortbildung'?'fortbildung':'gruppen_klassen'):['gruppe','klasse'].includes(ev.kontaktart)?'gruppen_klassen':'einzelfall'];
  default:return [];
 }
}
// Kinder, die hinter einem Wert stehen (für die Einheit „Kinder“)
function kinderSchluessel(ev,merkmal,wert,f,zk){return kinderImFilter(ev,f).filter(k=>merkmal==='zugangsweg'?(zk.get(k.sid+'|'+ev.schoolYear)||NICHT_ERFASST)===wert:merkmal==='stufe'?String(k.stufe??NICHT_ERFASST)===wert:merkmal==='zweig'?(k.zweig||NICHT_ERFASST)===wert:true).map(k=>k.sid+'|'+ev.schoolYear);}
function aufschluesselung(evs,merkmal,einheit='kontakte',f={},zk=new Map()){
 const m=new Map(),kinderSets=new Map();
 for(const ev of evs)for(const w of werteVon(ev,merkmal,f,zk)){
  if(einheit==='kinder'){if(!kinderSets.has(w))kinderSets.set(w,new Set());kinderSchluessel(ev,merkmal,w,f,zk).forEach(k=>kinderSets.get(w).add(k));continue;}
  m.set(w,(m.get(w)||0)+(einheit==='stunden'?(ev.dauer_min||0)/60:einheit==='personen'?personenVon(ev,f):1));
 }
 if(einheit==='kinder')for(const [w,s] of kinderSets)m.set(w,s.size);
 return [...m.entries()].filter(([,wert])=>wert>0).map(([id,wert])=>({id,wert:einheit==='stunden'?runde1(wert):wert})).sort((a,b)=>(a.id===NICHT_ERFASST)-(b.id===NICHT_ERFASST)||b.wert-a.wert||String(a.id).localeCompare(String(b.id)));
}
function kreuztabelle(evs,zeilenMerkmal,spaltenMerkmal,einheit='kontakte',f={},zk=new Map()){
 const zellen=new Map(),zeilen=new Set(),spalten=new Set();
 for(const ev of evs){const a=werteVon(ev,zeilenMerkmal,f,zk),b=werteVon(ev,spaltenMerkmal,f,zk);if(!a.length||!b.length)continue;
  for(const x of a)for(const y of b){zeilen.add(x);spalten.add(y);const k=x+'\u0000'+y;zellen.set(k,(zellen.get(k)||0)+(einheit==='stunden'?(ev.dauer_min||0)/60:1));}}
 const sort=arr=>[...arr].sort((a,b)=>(a===NICHT_ERFASST)-(b===NICHT_ERFASST)||String(a).localeCompare(String(b),'de',{numeric:true}));
 const Z=sort(zeilen),S=sort(spalten),wert=(x,y)=>{const v=zellen.get(x+'\u0000'+y)||0;return einheit==='stunden'?runde1(v):v;};
 const tabelle=Z.map(x=>S.map(y=>wert(x,y)));
 const zeilenSummen=tabelle.map(r=>einheit==='stunden'?runde1(r.reduce((a,b)=>a+b,0)):r.reduce((a,b)=>a+b,0));
 const spaltenSummen=S.map((_,j)=>einheit==='stunden'?runde1(tabelle.reduce((a,r)=>a+r[j],0)):tabelle.reduce((a,r)=>a+r[j],0));
 return {zeilen:Z,spalten:S,tabelle,zeilenSummen,spaltenSummen,gesamt:einheit==='stunden'?runde1(zeilenSummen.reduce((a,b)=>a+b,0)):zeilenSummen.reduce((a,b)=>a+b,0)};
}
// Datenqualität: was fehlt bei Kontakten im Zeitraum (nur Kontakte, die nachgetragen werden können, zählen als offen)
function datenqualitaet(evs,zk=new Map()){
 const k=evs.filter(e=>e.art==='kontakt'),ohneThema=k.filter(e=>!e.themen.length),ohneDauer=k.filter(e=>!e.dauer_min),kinder=new Map();
 for(const e of k)if(!e.anonym)for(const x of e.kinder){const key=x.sid+'|'+e.schoolYear;if(!zk.has(key)&&!kinder.has(key))kinder.set(key,{sid:x.sid,schoolYear:e.schoolYear,date:e.date});}
 return {ohneThema:ohneThema.length,ohneDauer:ohneDauer.length,ohneZugang:kinder.size,uebernommen:k.filter(e=>e.quelle==='uebernommen').length,
  nachtragbar:k.filter(e=>e.entryId&&(!e.themen.length||!e.dauer_min)).map(e=>({entryId:e.entryId,fehlt:{thema:!e.themen.length,dauer:!e.dauer_min}})),kinderOhneZugang:[...kinder.values()]};
}
// Nachtragen: fehlende Merkmale an einem Chronikeintrag ergänzen (nur auf ausdrücklichen Wunsch)
function statNachtragen(state,entryId,werte){
 const e=state.journal.find(x=>x.id===entryId);if(!e)throw Error('Eintrag nicht gefunden.');const basis=statMerkmale(state,e);if(!basis)throw Error('Dieser Eintrag ist kein Kontakt.');
 const themen=werte.themen&&werte.themen.length?[...new Set(werte.themen)]:basis.themen,dauer=Number(werte.dauer_min)||basis.dauer_min||null;
 e.stat={...basis,version:kategorien(e.date).version,quelle:'erfasst',nachgetragen:new Date().toISOString(),themen,dauer_min:dauer,klassen:basis.klassen||klassenSnapshot(state,e.participantIds,e.date)};
 if(dauer&&!Number(e.duration))e.duration=dauer;return e.stat;
}
function suggestionResponsible(taskType){
 const map={
  'Schutzweg':'Schulleitung und zuständige Fachkraft',
  'Dokumentation':'Schulsozialarbeit',
  'Rücksprache':'Klassenleitung',
  'Rückmeldung':'Klassenleitung und Schulsozialarbeit',
  'Schülergespräch':'Schulsozialarbeit',
  'Elternkontakt':'Schulsozialarbeit und Sorgeberechtigte',
  'Elterngespräch':'Schulsozialarbeit und Sorgeberechtigte',
  'Unterstützungsplan':'Schulsozialarbeit, Klassenleitung und Sorgeberechtigte',
  'Konfliktklärung':'Schulsozialarbeit',
  'Fachberatung':'Schulsozialarbeit',
  'Projektidee':'Klassenleitung und Schulsozialarbeit',
  'Sozialtraining':'Klassenleitung und Schulsozialarbeit',
  'Überprüfung':'Schulsozialarbeit mit den Beteiligten'
 };
 return map[taskType]||'Zuständigkeit nach der Prüfung festlegen';
}
function suggestionGoal(taskType){
 const map={
  'Schutzweg':'Schutz und Zuständigkeit sind geklärt.',
  'Dokumentation':'Beobachtungen, Aussagen und bereits ergriffene Schritte sind sachlich gesichert.',
  'Rücksprache':'Die schulische Beobachtung und der nächste abgestimmte Schritt sind geklärt.',
  'Rückmeldung':'Die Umsetzung und das Ergebnis sind nachvollziehbar dokumentiert.',
  'Schülergespräch':'Unterstützungsbedarf und ein machbarer nächster Schritt sind geklärt.',
  'Elternkontakt':'Die Sicht der Sorgeberechtigten und eine konkrete Vereinbarung sind dokumentiert.',
  'Elterngespräch':'Ein gemeinsames Ziel, Zuständigkeiten und ein Rückmeldetermin sind festgelegt.',
  'Unterstützungsplan':'Ein erreichbarer nächster Schritt und ein Rückmeldetermin sind vereinbart.',
  'Konfliktklärung':'Sichtweisen, Sicherheit und ein tragfähiger nächster Schritt sind geklärt.',
  'Fachberatung':'Die passende Unterstützung und der zulässige Informationsumfang sind geklärt.',
  'Projektidee':'Ziel, Durchführung und beobachtbare Wirkung des Angebots sind festgelegt.',
  'Sozialtraining':'Das vereinbarte soziale Ziel und die Wirkung des Angebots sind überprüfbar.',
  'Überprüfung':'Wirkung und Zielentwicklung sind dokumentiert. Danach wird entschieden: fortführen, anpassen oder abschließen.'
 };
 return map[taskType]||'Der nächste Schritt ist konkret vereinbart und überprüfbar.';
}
function suggestionNetwork(entry,state,procedure,step){
 const sid=entry.participantIds?.[0],student=state?.students?.find(s=>s.id===sid),klasse=student?.className||'';
 const taskHints={Schutzweg:'kinderschutz jugendamt schutz fachberatung',Fachberatung:'beratung fachstelle schulpsychologie inklusion',Rücksprache:'klassenleitung beratungslehrkraft',Elternkontakt:'erziehungsberatung familie',Unterstützungsplan:'schulsozialarbeit klassenleitung'};
 const hay=[procedure.topic,procedure.keywords?.join(' '),step.title,step.taskType,taskHints[step.taskType]||''].join(' ').toLocaleLowerCase('de');
 const words=hay.split(/[^a-zäöüß]+/).filter(x=>x.length>5);
 const internal=(state?.teachers||[]).filter(t=>t.status!=='inaktiv'&&(String(t.classLead||'').split(/[,;]/).map(x=>x.trim()).includes(klasse)||words.some(w=>[t.role,t.roles,t.area,t.note].flat().join(' ').toLocaleLowerCase('de').includes(w.slice(0,7))))).slice(0,3).map(t=>({name:t.displayName||[t.last,t.first].filter(Boolean).join(', '),kind:'intern',role:t.role||'schulinterne Zuständigkeit'}));
 const external=(state?.partners||[]).filter(p=>String(p.active??true)!=='false'&&netzwerkBereichForSuggestion(p)!=='Schulintern'&&words.some(w=>[p.organization,p.category,p.contact,p.note].join(' ').toLocaleLowerCase('de').includes(w.slice(0,7)))).slice(0,3).map(p=>({name:p.organization,kind:'extern',role:p.category||'Netzwerkpartner'}));
 return [...internal,...external];
}
function netzwerkBereichForSuggestion(p){return String(p?.category||p?.bereich||p?.area||'').toLocaleLowerCase('de').includes('intern')?'Schulintern':String(p?.category||p?.bereich||p?.area||'');}
function fachverfahren_suggestions(entry,state,matches){
 const existing=new Set((entry.actionSuggestions||[]).map(s=>s.title)),out=[];
 const sid=entry.participantIds?.[0],student=state?.students?.find(s=>s.id===sid);
 const context=student?[student.first,student.last].filter(Boolean).join(' '):'das Kind';
 const date=germanDate(entry.date);
 const anchor=[context,date&&`Eintrag vom ${date}`,entry.title&&`„${entry.title}“`].filter(Boolean).join(' · ');
 for(const procedure of matches){for(const step of procedure.steps){
  if(existing.has(step.title)||out.some(s=>s.title===step.title))continue;
  out.push({id:uid('suggestion'),title:step.title,rationale:step.rationale,taskType:step.taskType,dueDays:step.dueDays,responsible:suggestionResponsible(step.taskType),goal:suggestionGoal(step.taskType),followUp:'Ergebnis im Chronikeintrag festhalten und anschließend entscheiden: fortführen, anpassen oder abschließen.',networkOptions:suggestionNetwork(entry,state,procedure,step),status:'offen',source:'Fachverfahren',procedureId:procedure.id,procedureVersion:procedure.version,context:anchor,specificity:'fachlich konkret',createdAt:new Date().toISOString()});
  if(out.length>=3)break;
 } if(out.length>=3)break;}
 return out;
}
function localSuggestions(entry,state){
 const type=String(entry.type||'').toLocaleLowerCase('de'),text=[type,entry.title,entry.content,entry.childView,entry.otherView,entry.observation,entry.assessment,entry.agreement,entry.goal,entry.result].join(' ').toLocaleLowerCase('de');
 const sid=entry.participantIds?.[0],student=state?.students?.find(s=>s.id===sid),lead=String(state?.settings?.classLeads?.[student?.className]||'').trim();
 const teacher=lead?`Klassenleitung ${lead}`:'Klassenleitung';
 const child=student?[student.first,student.last].filter(Boolean).join(' '):'das Kind';
 const date=germanDate(entry.date);
 const title=String(entry.title||entry.type||'dokumentierten Anlass').trim();
 const anchor=[child,date&&`Eintrag vom ${date}`,title&&`„${title}“`].filter(Boolean).join(' · ');
 const people=String(entry.people||'').trim();
 const existingAgreement=String(entry.agreement||'').trim();
 const existingResult=String(entry.result||'').trim();
 const out=[],add=(title,rationale,taskType='Nächster Schritt',dueDays=3)=>{if(!out.some(x=>x.title===title))out.push({id:uid('suggestion'),title,rationale,taskType,dueDays,responsible:suggestionResponsible(taskType),goal:suggestionGoal(taskType),followUp:'Ergebnis im Chronikeintrag festhalten und anschließend entscheiden: fortführen, anpassen oder abschließen.',status:'offen',createdAt:new Date().toISOString()});};
 const addConcrete=(suggestedTitle,rationale,taskType='Nächster Schritt',dueDays=3)=>{add(suggestedTitle,`${rationale} Bezug: ${anchor}.${people?` Beteiligte laut Eintrag: ${people}.`:''}${existingAgreement?` Vorhandene Vereinbarung berücksichtigen: ${existingAgreement}.`:''}${existingResult?` Bereits dokumentiertes Ergebnis berücksichtigen: ${existingResult}`:''}`,taskType,dueDays);out.at(-1).context=anchor;out.at(-1).specificity='konkret';};
 const explicitSafetyNegation=/(?:kindeswohl|schutzlage|psychische belastung|angst|fürchte|furcht)[^.!?]{0,35}\b(?:nicht|keine|kein|keinen|nie)\b|\b(?:nicht|keine|kein|keinen|nie)\b[^.!?]{0,35}(?:kindeswohl|schutzlage|psychische belastung|angst|fürchte|furcht)/.test(text);
 if(/akut|selbstgefährd|suizid|waffe|kindeswohl|missbrauch|sexualisiert/.test(text)&&!explicitSafetyNegation){
  addConcrete('Heute Schutzlage mit Schulleitung und zuständiger Fachkraft abstimmen','Konkret festhalten, wer den unmittelbaren Schutz übernimmt und welches Verfahren nach den örtlichen Absprachen jetzt eingeleitet wird. Keine automatische Gefährdungsbewertung.','Schutzweg',0);
  addConcrete('Heute dokumentierte Beobachtungen und Aussagen getrennt festhalten','Wörtliche Aussagen, eigene Beobachtungen, Uhrzeit und bereits ergriffene Schutzschritte sachlich sichern.','Dokumentation',0);
  addConcrete('Kinderschutzfachberatung oder Jugendamt nach örtlichem Schutzweg einbeziehen','Nach der Abstimmung mit der Schulleitung dokumentieren, wer wann welche Fachberatung nach dem örtlich vereinbarten Verfahren anfragt.','Schutzweg',0);
 }else if(/trainingsraum/.test(text)){
  addConcrete(`Mit ${child} ein Reflexionsgespräch zum Trainingsraumbesuch führen`,'Auslöser aus Sicht des Kindes und einen konkreten Schritt für die Rückkehr in den Unterricht schriftlich festhalten.','Schülergespräch',2);
  addConcrete(`${teacher} zur vereinbarten Rückkehr in den Unterricht befragen`,'Eine kurze Rückmeldung einholen, ob die vereinbarten Verhaltensschritte im Unterricht umsetzbar waren.','Rückmeldung',5);
 }else if(/fehlzeit|schulabsent|webuntis/.test(text)){
  addConcrete(`${teacher} um Rückmeldung zu den dokumentierten Fehlzeiten bitten`,'Zeitraum und offene Entschuldigungen nennen; nach bekannten schulischen Gründen und bereits erfolgtem Kontakt fragen.','Rücksprache',2);
  addConcrete('Offene Entschuldigungen mit den Sorgeberechtigten klären','Fehlzeitenzeitraum benennen und festhalten, was tatsächlich geklärt wurde.','Elternkontakt',5);
  addConcrete('Bei wiederkehrenden Fehlzeiten eine abgestimmte Rückkehrvereinbarung prüfen','Mit Kind, Sorgeberechtigten und Klassenleitung einen machbaren ersten Schultag und einen konkreten Rückmeldetermin abstimmen.','Unterstützungsplan',5);
 }else if(/konflikt|ausgrenz|mobbing|gewalt/.test(text)){
  addConcrete('Mit den beteiligten Kindern getrennte kurze Gespräche vereinbaren','Jeweils eigene Sicht und mögliche Sicherheit im Schulalltag festhalten; keine Schuldzuweisung aus dem Eintrag ableiten.','Konfliktklärung',2);
  addConcrete(`${teacher} zu Beobachtungen in der Klasse befragen`,'Konkrete Situationen, betroffene Zeiten und bereits vereinbarte Schritte erfragen.','Rücksprache',3);
  addConcrete('Vermittlungstermin im Palaverzelt anbieten','Mit den beteiligten Kindern getrennt klären, ob und unter welchen Bedingungen eine gemeinsame Vermittlung sinnvoll ist.','Konfliktklärung',5);
 }else if(/elterngespräch|elternkontakt|erziehungsberechtigt/.test(text)){
  addConcrete('Mit den Sorgeberechtigten die Umsetzung der Gesprächsabsprache nachhalten','Zu der dokumentierten Vereinbarung eine konkrete Rückmeldung einholen und das Ergebnis am Gesprächseintrag ergänzen.','Rückmeldung',7);
  addConcrete(` ${child} zur Wirkung der vereinbarten Unterstützung befragen`.trim(),'In einem kurzen Gespräch erfragen, was sich im Schulalltag tatsächlich verändert hat.','Schülergespräch',7);
 }else if(/sozialtraining|klassentraining|gruppe|präventionsangebot/.test(text)){
  addConcrete(`${teacher} nach der Wirkung des Angebots in der Klasse fragen`,'Eine beobachtbare Veränderung und möglichen weiteren Bedarf festhalten.','Rückmeldung',10);
  addConcrete('Bei anhaltendem Bedarf ein Sozialtraining mit klarer Zielbeobachtung anbieten','Thema, Teilnehmende, Durchführung und Auswertung mit der Klassenleitung abstimmen; keine automatische Teilnahme eintragen.','Projektidee',10);
 }else if(/schulpsycholog|angst|krise|belastung|wohlbefinden/.test(text)){
  addConcrete(`Mit ${child} ein Gespräch über die aktuelle Belastung vereinbaren`,'Aktuelle Situation und gewünschte Unterstützung erfragen; bei Bedarf den Kontakt zur Schulpsychologie mit geklärter Einwilligung anbieten.','Schülergespräch',2);
  addConcrete('Beratung durch die Schulpsychologie als mögliche Unterstützung prüfen','Mit Kind und Sorgeberechtigten klären, ob die Weitervermittlung gewünscht ist und welche Angaben weitergegeben werden dürfen.','Fachberatung',5);
 }else if(/lernen|lernproblem|förderbedarf|inklusion|unterrichtsbegleitung/.test(text)){
  addConcrete('Beratungslehrkraft oder Mobilen Dienst zum schulischen Unterstützungsbedarf anfragen','Einen konkreten Beobachtungsanlass und die nötigen Einwilligungen vor dem Kontakt klären.','Rücksprache',5);
  addConcrete('Abgestimmtes Lern- oder Unterstützungsangebot mit Klassenleitung prüfen','Eine kleine beobachtbare Veränderung, Zuständigkeit und einen Termin zur Rückmeldung festlegen.','Projektidee',7);
 }else if(/therapie|ergotherap|logopäd|operation|\bop\b|medizin/.test(text)){
  addConcrete(`Mit ${child} besprechen, ob im Schulalltag Unterstützung gebraucht wird`,'Konkreten schulischen Unterstützungsbedarf erfragen; medizinische Angaben nur soweit erforderlich aufnehmen.','Schülergespräch',5);
 }else if(/extern|jugendamt|weitervermittlung|netzwerk/.test(text)){
  addConcrete('Rückmeldung zur vereinbarten Weitervermittlung einholen','Bei der dokumentierten zuständigen Stelle nur im Rahmen der geklärten Einwilligung nach dem vereinbarten nächsten Schritt fragen.','Rückmeldung',5);
 }else if(/ziel|maßnahme|vereinbar|absprache/.test(text)||entry.agreement){
  addConcrete('Die dokumentierte Vereinbarung mit den Beteiligten überprüfen','Eine beobachtbare Umsetzung erfragen, das Ergebnis festhalten und den nächsten Termin gemeinsam bestimmen.','Überprüfung',7);
 }
 if(!out.length&&type!=='zusätzliche information')addConcrete(`Mit ${child} ein kurzes Anschlussgespräch zu ${title} vereinbaren`,'Aus seiner Sicht einen konkreten Unterstützungsbedarf und gegebenenfalls einen nächsten Termin festhalten.','Schülergespräch',5);
 const matches=fachverfahren_match(entry,state);
 const lokale=out.map(s=>({...s,networkOptions:suggestionNetwork(entry,state,{topic:entry.type||entry.title||'',keywords:[entry.title||'',entry.content||'']},s)}));
 return [...lokale,...fachverfahren_suggestions(entry,state,matches)].slice(0,3);
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
 const fachverfahren=fachverfahren_match(e,state);e.oberThemen=[...new Set(fachverfahren.map(v=>v.topic))];e.fachverfahren=fachverfahren.map(v=>({id:v.id,title:v.topic,version:v.version,matchedKeywords:v.matchedKeywords}));e.safetyStatus=schutzTreffer(e,fachverfahren).length?'Mögliche Schutzfrage laut Stichworten, bitte selbst prüfen':'';e.actionSuggestions=[];e.suggestionVersion=5;
 if(participantIds.length>1&&input.individualNotes&&Object.keys(input.individualNotes).some(sid=>!participantIds.includes(sid)))throw Error('Individuelle Notiz ist keinem teilnehmenden Kind zugeordnet.');
 state.journal.push(e);
 if(!e.generalInfo)for(const sid of participantIds)journalCase(state,sid,e,true);
 return e;
}
function quickContact(state,input){
 const date=input.date||day();if(!iso(date))throw Error('Datum prüfen.');
 const duration=Math.max(1,Math.min(240,Number(input.duration)||5));
 const occasions=[...new Set((input.occasions||input.occasion||[]).filter(Boolean).map(String))];const themen=[...new Set((input.themen||[]).map(String))];
 const row={id:uid('quick'),date,occasions,themen,kategorieVersion:kategorien(date).version,mitarbeitend:aktiveMitarbeitende(state),duration,className:String(input.className||''),grade:String(input.grade||''),anonymous:!!input.anonymous,note:String(input.note||'').trim(),createdAt:new Date().toISOString()};
 if(!row.anonymous){
  if(!input.studentId||!state.students.some(s=>s.id===input.studentId))throw Error('Kind auswählen.');
  row.studentId=input.studentId;row.participantIds=[input.studentId];
  const titel=themen.length?themen.map(t=>katLabel('thema',t)).join(' · '):occasions.length?occasions.join(' · '):'Kurzkontakt';
  const entry=stamp(state,{id:uid('entry'),date,type:'Kurzkontakt',title:titel,stat:statErfassen(state,{kontaktart:'kurzkontakt',themen,beteiligte:['schueler'],dauer_min:duration},[input.studentId],date),content:row.note||'Kurzkontakt dokumentiert.',participantIds:[input.studentId],occasions,duration,createdAt:row.createdAt,actionSuggestions:[],suggestionVersion:5,revisions:[],pinnedFor:[]});
  state.journal.push(entry);return entry;
 }
 state.quickContacts.push(row);return row;
}
function addPromise(state,input){
 const title=String(input.title||'').trim();if(!title)throw Error('Zusage angeben.');
 const promisedTo=String(input.promisedTo||'').trim();if(!promisedTo)throw Error('Wem die Zusage gilt, angeben.');
 if(input.due&&!iso(input.due))throw Error('Termin prüfen.');
 const t=stamp(state,{...input,id:uid('promise'),title,kind:'zusage',promisedTo,status:'offen',done:false,createdAt:new Date().toISOString(),history:[]});state.tasks.push(t);return t;
}
function completePromise(state,t,result='',author=''){
 if(!t||t.kind!=='zusage')throw Error('Zusage fehlt.');
 return setTask(state,t,{status:'erledigt',result:String(result||'').trim()||'Zusage eingehalten.',completedAt:day()},author||'SSA');
}
function saveAuftrag(state,studentId,input){
 if(!state.students.some(s=>s.id===studentId))throw Error('Schülerakte fehlt.');
 const requester=String(input.requester||'').trim(),childNeed=String(input.childNeed||'').trim(),assigned=String(input.assignedOrder||'').trim();
 if(!requester||(!childNeed&&!input.noChildNeed)||!assigned)throw Error('Auftragsklärung vollständig ausfüllen.');
 const row={id:uid('auftrag'),studentId,date:input.date||day(),requester,childNeed:noChildNeedText(input.noChildNeed,childNeed),requesterNeed:String(input.requesterNeed||'').trim(),assignedOrder:assigned,createdAt:new Date().toISOString()};
 state.auftraege.push(row);return row;
}
function noChildNeedText(noNeed,text){return noNeed?'Kind hat (noch) kein eigenes Anliegen.':text;}
function safetyCheck(state,entryId,input){
 const legacyBuckets=[state.contacts,state.groupTalks,state.trainingRoom,state.classActivities,state.schoolSignals,state.casePlans,state.statusHistory,state.events,state.portalRequests,state.verfahrenLaeufe,state.auftraege,state.relatedPersons];
 const e=state.journal.find(x=>x.id===entryId)||legacyBuckets.filter(Array.isArray).flat().find(x=>x?.id===entryId);if(!e)throw Error('Dokumentationseintrag fehlt.');
 e.safetyCheck={...input,checkedAt:new Date().toISOString()};return e.safetyCheck;
}
function ideasForEntry(state,entryId){
 const e=state.journal.find(x=>x.id===entryId);if(!e)throw Error('Chronikeintrag fehlt.');
 if(e.safetyStatus||(e.fachverfahren||[]).some(v=>['selbstgefaehrdung','gewalt-bedrohung','kinderschutz'].includes(v.id)))return {notice:SAFETY_NOTICE,ideas:[],safety:true};
 if(e.noFurtherStep)return {notice:'Bewusst kein weiterer Schritt, Tür bleibt offen',ideas:[],safety:false};
 const text=[e.type,e.title,e.content,e.observation,e.assessment,e.agreement].join(' ').toLocaleLowerCase('de');
 const safety=/nicht mehr leben|suizid|selbstverletz|ritz|kinderschutz|missbrauch|angefasst|unsittlich|übergriff|waffe|bedroh|akut/.test(text);
 if(safety)return {notice:SAFETY_NOTICE,ideas:[],safety:true};
 const ideas=localSuggestions({...e,actionSuggestions:[]},state).slice(0,2).map(x=>({...x,status:'offen',dueDays:undefined}));
 return {notice:'',ideas,safety:false};
}
function markNoFurtherStep(state,entryId){
 const e=state.journal.find(x=>x.id===entryId);if(!e)throw Error('Chronikeintrag fehlt.');if(e.safetyStatus||(e.fachverfahren||[]).some(v=>['selbstgefaehrdung','gewalt-bedrohung','kinderschutz'].includes(v.id)))throw Error('Bei einer Schutzfrage ist eine fachliche Prüfung erforderlich.');e.noFurtherStep=true;e.noFurtherStepAt=new Date().toISOString();e.noFurtherStepText='Bewusst kein weiterer Schritt, Tür bleibt offen';return e;
}
function editEntry(state,e,changes,author){if(changes.date&&!iso(changes.date))throw Error('Datum prüfen.');if(e.generalInfo&&changes.type&&changes.type!==e.type)throw Error('Art einer allgemeinen Mitteilung nicht nachträglich ändern.');e.revisions=e.revisions||[];const before=structuredClone(e);delete before.revisions;e.revisions.push({at:new Date().toISOString(),author,before});for(const k of ['content','title','type','date','time','channel','people','source','childView','otherView','observation','assessment','agreement','goal','result','decision','planned','plannedDate','individualNotes','workflowId','oberThemen','fachverfahren','actionSuggestions','kiAnalysis','stat','duration'])if(k in changes)e[k]=changes[k];if(changes.date&&changes.date!==before.date){e.schoolYear=schoolYear(e.date);e.studentContexts={};e.className='';stamp(state,e);}}
function addTask(state,input){
 if(!String(input.title||'').trim()||!String(input.assignedTo||'').trim())throw Error('Aufgabe und Zuständigkeit angeben.');
 if(input.due&&!iso(input.due))throw Error('Termin prüfen.');
 const t=stamp(state,{...input,id:uid('task'),status:'offen',done:false,createdAt:new Date().toISOString(),history:[]});state.tasks.push(t);return t;
}
function setTask(state,t,changes,author){
 const status=changes.status||t.status,warOffen=!t.done;
 if(!['offen','in Bearbeitung','wartet auf Rückmeldung','erledigt','entfällt'].includes(status))throw Error('Status prüfen.');
 if(changes.due&&!iso(changes.due))throw Error('Termin prüfen.');
 if(['erledigt','entfällt'].includes(status)&&!String(changes.result||t.result||'').trim())throw Error('Ergebnis beziehungsweise Grund kurz eintragen.');
 t.history=t.history||[];t.history.push({at:new Date().toISOString(),author,status:t.status,due:t.due,assignedTo:t.assignedTo,result:t.result});
 Object.assign(t,changes,{status,done:['erledigt','entfällt'].includes(status)});
 if(t.done){t.completedAt=changes.completedAt||day();t.completedBy=author;}
 else {t.completedAt='';}
 if(warOffen&&status==='erledigt')zusageErledigtEintragen(state,t,author);
 return t;
}
// 0.14: Wird eine Zusage erledigt, entsteht genau ein Chronikeintrag „Zusage erledigt: …“ mit Verweis auf die Zusage.
function zusageErledigtEintragen(state,t,author){
 if(t.kind!=='zusage'||t.doneEntryId)return null;
 const participantIds=ids(state,t).filter(sid=>state.students.some(s=>s.id===sid));if(!participantIds.length)return null;
 const e=addEntry(state,{date:iso(t.completedAt)?String(t.completedAt).slice(0,10):day(),time:new Date().toTimeString().slice(0,5),type:'Zusage erledigt',title:'Zusage erledigt: '+t.title,content:'Zusage erledigt: '+t.title+(t.result&&t.result!=='Zusage eingehalten.'?'\nErgebnis: '+t.result:''),participantIds,responsible:author||t.completedBy||'SSA',sourceEntryKey:'task:'+t.id});
 e.actionSuggestions=[];t.doneEntryId=e.id;return e;
}
// 0.14: Neue Schülerakte mit nur Name und Klasse (z. B. aus der Schnellnotiz)
function addStudent(state,input){
 const first=String(input.first||'').trim(),last=String(input.last||'').trim(),className=String(input.className||'').trim();
 if(!first||!last)throw Error('Vor- und Nachname angeben.');if(!className)throw Error('Klasse angeben.');
 const s={id:uid('pupil'),first,last,active:true,enrollments:[],createdAt:new Date().toISOString(),createdFrom:input.createdFrom||'Schnellnotiz'};state.students.push(s);
 changeEnrollment(state,s,{className,schoolYear:state.settings?.currentSchoolYear||schoolYear(day())},day(),input.reason||'Neue Akte aus Schnellnotiz');return s;
}
// 0.14: Ähnliche Namen finden („Meintest du …?“) – Tippfehler sollen keine doppelte Akte erzeugen
function nameNorm(t){return String(t||'').toLocaleLowerCase('de-DE').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();}
function editDistance(a,b){if(a===b)return 0;const m=a.length,n=b.length;if(!m||!n)return m||n;let prev=Array.from({length:n+1},(_,j)=>j);for(let i=1;i<=m;i++){const cur=[i];for(let j=1;j<=n;j++)cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur;}return prev[n];}
function similarStudents(state,name,limit=5){
 const q=nameNorm(name);if(q.length<2)return [];
 const rows=[];for(const s of state.students){if(s.active===false)continue;const a=nameNorm(s.first+' '+s.last),b=nameNorm(s.last+' '+s.first),f=nameNorm(s.first),l=nameNorm(s.last);
  const d=Math.min(editDistance(q,a),editDistance(q,b),q.includes(' ')?99:Math.min(editDistance(q,f),editDistance(q,l)));const tol=q.length<=4?1:2;
  const starts=a.startsWith(q)||b.startsWith(q)||f.startsWith(q)||l.startsWith(q);if(starts||d<=tol)rows.push({s,d:starts?0:d});}
 return rows.sort((x,y)=>x.d-y.d||x.s.last.localeCompare(y.s.last)).slice(0,limit).map(r=>r.s);
}
function assess(state,sid,input){
 if(!['gruen','gelb','rot','grau'].includes(input.color)||!input.reason?.trim()||!input.author?.trim()||!iso(input.date))throw Error('Farbe, Begründung, Datum und bewertende Person angeben.');
 const a=stamp(state,{...input,id:uid('assessment'),studentId:sid,createdAt:new Date().toISOString()});state.assessments.push(a);return a;
}
function currentAssessment(state,sid){return state.assessments.filter(a=>a.studentId===sid).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt))[0]||null}
function work(state,sid){return state.tasks.filter(t=>ids(state,t).includes(sid))}
function timeline(state,sid,legacy=[]){
 // Fallstatus-Einträge steuern das Fallboard. Sie sind keine eigenen fachlichen
 // Ereignisse und würden dort echte Kontakte oder Aufgaben doppelt darstellen.
 const items=legacy.filter(e=>e.eventKind!=='Fallstatus'&&!(e.eventKind==='Dokument'&&e.attachmentId&&e.sourceEntryKey)&&!(e.eventKind==='Trainingsraum'&&e.journalEntryId&&state.journal.some(j=>j.id===e.journalEntryId))&&!state.tasks.some(t=>t.id===e.id)).map(e=>({...e,key:'legacy:'+e.id,legacy:true,context:recordContext(state,e,sid)}));
 for(const e of state.journal.filter(e=>!e.deletedAt&&e.participantIds.includes(sid)))items.push({...e,key:'entry:'+e.id,eventKind:e.type,context:recordContext(state,e,sid),individualNote:e.individualNotes?.[sid]||''});
 for(const e of state.assessments.filter(e=>e.studentId===sid))items.push({...e,key:'assessment:'+e.id,eventKind:'Fachliche Ampelbewertung',title:e.color,content:e.reason,responsible:e.author,context:recordContext(state,e,sid)});
 for(const e of state.yearTransitions.filter(e=>e.studentId===sid))items.push({...e,key:'year:'+e.id,eventKind:'Schuljahresverlauf',content:e.reason,context:recordContext(state,e,sid)});
 for(const e of state.relatedPersons||[])if(e.studentId===sid)items.push({...e,key:'related:'+e.id,date:recordDate(e)||'',eventKind:'Bezugsperson / Netzwerk',title:e.name||'Kontakt',content:[e.role,e.agreements,e.informationScope].filter(Boolean).join(' · '),context:recordContext(state,e,sid)});
 for(const a of state.auftraege||[])if(a.studentId===sid)items.push({...a,key:'auftrag:'+a.id,eventKind:'Auftragsklärung',title:'Auftrag: '+a.assignedOrder,content:['Auftrag von: '+a.requester,a.childNeed?'Anliegen des Kindes: '+a.childNeed:'',a.requesterNeed?'Anliegen der auftraggebenden Person: '+a.requesterNeed:''].filter(Boolean).join('\n'),context:recordContext(state,a,sid)});
 for(const t of work(state,sid))items.push({...t,key:'task:'+t.id,task:true,date:t.due||'',eventKind:'Nächster Schritt',content:t.result||t.expectedResult||'',planned:!t.done,context:recordContext(state,t,sid)});
 for(const k of ['portalRequests','events','verfahrenLaeufe'])for(const e of state[k]||[])if(ids(state,e).includes(sid)&&!items.some(x=>x.id===e.id))items.push({...e,key:'legacy:'+e.id,date:recordDate(e),eventKind:k==='portalRequests'?'Schüleranfrage':k==='verfahrenLaeufe'?'Fachverfahren':'Termin',title:e.title||e.topic||e.workflowId||'Weiterer Eintrag',content:e.message||e.note||'',legacy:true,context:recordContext(state,e,sid)});
 for(const e of state.journal.filter(e=>!e.deletedAt&&e.participantIds.includes(sid)&&e.planned&&e.plannedDate))items.push({key:'appointment:'+e.id,id:e.id,date:e.plannedDate,eventKind:'Geplanter Termin',title:e.title,content:'Durchführung noch nicht bestätigt.',planned:true,sourceEntryKey:'entry:'+e.id,context:context(state,sid,e.plannedDate)});
 return items.sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999'))||String(a.time||'').localeCompare(String(b.time||''))||String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
}
function journalStats(state,year='',className='all'){
 return state.journal.filter(e=>!e.generalInfo&&!e.planned&&e.type!=='zusätzliche Information'&&e.type!=='Kurznotiz'&&e.type!=='Zusage erledigt'&&(!year||e.schoolYear===year)&& (className==='all'||e.participantIds.some(sid=>{const cl=recordContext(state,e,sid).className;return className.startsWith('jg:')?cl.match(/^\d+/)?.[0]===className.slice(3):cl===className}))).map(e=>({...e,duration:e.duration*Math.max(1,(e.facilitators||[]).length)}));
}
function restore(raw,sanitize){const state=sanitize(raw);for(const [i,e]of (state.journal||[]).entries()){const original=raw.journal?.[i];if(!original)continue;for(const key of ['content','childView','otherView','observation','assessment','agreement','goal','result','source','people'])if(typeof original[key]==='string')e[key]=original[key];if(original.individualNotes&&typeof original.individualNotes==='object')for(const key of Object.keys(e.individualNotes||{}))if(typeof original.individualNotes[key]==='string')e.individualNotes[key]=original.individualNotes[key];}return state;}
/* Namenssuche (0.21): unabhängig von Reihenfolge, Komma, Groß-/Kleinschreibung, Akzenten und unsichtbaren Zeichen aus Excel */
function suchNorm(t){return String(t||'').normalize('NFC').replace(/[­​-‍﻿]/g,'').replace(/ /g,' ').toLocaleLowerCase('de-DE').replace(/[.,;:()\/\-]+/g,' ').replace(/\s+/g,' ').trim();}
function suchPasst(hay,q){const h=' '+suchNorm(hay)+' ',t=suchNorm(q).split(' ').filter(Boolean);return t.length>0&&t.every(x=>h.includes(x));}
function schuelerSuche(state,q,{nurAktiv=false,extra=null}={}){
 const t=suchNorm(q);if(t.length<2)return [];
 const leads=state.settings?.classLeads||{};
 const treffer=(state.students||[]).filter(s=>(!nurAktiv||s.active!==false)&&suchPasst([s.last,s.first,s.className,leads[s.className]||'',s.id,extra?extra(s):''].join(' '),q));
 const erst=t.split(' ')[0],rang=s=>{const l=suchNorm(s.last),f=suchNorm(s.first);return (l===erst||f===erst?0:l.startsWith(erst)?1:f.startsWith(erst)?2:3)+(s.active===false?4:0);};
 return treffer.sort((a,b)=>rang(a)-rang(b)||String(a.last).localeCompare(String(b.last),'de')||String(a.first).localeCompare(String(b.first),'de'));
}
/* Geplante Gespräche (0.19): kein Kalender, sondern ein Termin an der Akte, der auf „Heute“ erscheint. */
function planeGespraech(state,input){
 const date=String(input.date||'');if(!iso(date))throw Error('Bitte ein Datum angeben.');
 const participantIds=[...new Set(input.participantIds||[])];
 if(!participantIds.length||participantIds.some(sid=>!state.students.some(s=>s.id===sid)))throw Error('Bitte mindestens ein Kind auswählen.');
 const punkte=(Array.isArray(input.punkte)?input.punkte:String(input.punkte||'').split(/\n/)).map(x=>String(x).replace(/^[-•*\s]+/,'').trim()).filter(Boolean).slice(0,12);
 state.geplanteGespraeche=Array.isArray(state.geplanteGespraeche)?state.geplanteGespraeche:[];
 const g={id:uid('plan'),date,time:/^\d\d:\d\d$/.test(String(input.time||''))?input.time:'',type:String(input.type||'Gespräch').trim()||'Gespräch',anlass:String(input.anlass||'').trim(),people:String(input.people||'').trim(),participantIds,punkte,status:'geplant',von:aktiveMitarbeitende(state),createdAt:new Date().toISOString()};
 state.geplanteGespraeche.push(g);return g;
}
function geplanteGespraeche(state,{sid='',bis=''}={}){
 return (state.geplanteGespraeche||[]).filter(g=>g.status==='geplant'&&(!sid||g.participantIds.includes(sid))&&(!bis||g.date<=bis)).sort((a,b)=>(a.date+(a.time||'99:99')).localeCompare(b.date+(b.time||'99:99')));
}
function planFinden(state,id){const g=(state.geplanteGespraeche||[]).find(x=>x.id===id);if(!g)throw Error('Geplantes Gespräch nicht gefunden.');return g;}
function gespraechVerschieben(state,id,date,time){const g=planFinden(state,id);if(!iso(date))throw Error('Bitte ein Datum angeben.');g.verlauf=g.verlauf||[];g.verlauf.push({am:new Date().toISOString(),von:g.date+(g.time?' '+g.time:''),art:'verschoben'});g.date=date;if(time!==undefined)g.time=/^\d\d:\d\d$/.test(String(time||''))?time:'';return g;}
function gespraechAbsagen(state,id,grund=''){const g=planFinden(state,id);g.status='abgesagt';g.abgesagtAm=new Date().toISOString();g.grund=String(grund||'').trim();return g;}
// Nach dem Dokumentieren: nicht geklärte Punkte werden Zusagen, der Plan ist erledigt
function gespraechErledigt(state,id,{entryId='',offen=[],zusageAn='Kind',participantIds}={}){
 const g=planFinden(state,id);const ids=participantIds&&participantIds.length?participantIds:g.participantIds;
 const zusagen=offen.map(x=>String(x||'').trim()).filter(Boolean).map(title=>addPromise(state,{title,promisedTo:String(zusageAn||'Kind'),participantIds:ids,due:'',sourceEntryKey:entryId?'entry:'+entryId:'',zugesagtVon:'Ich'}));
 g.status='erledigt';g.erledigtAm=new Date().toISOString();g.entryId=entryId;g.zusagen=zusagen.map(z=>z.id);
 return zusagen;
}
/* Themenvorschlag per Stichwort (0.18): nur Vorschlag, nie automatisch angekreuzt.
   Stichworte passen am Wortanfang („streit“ trifft „Streitigkeiten“, nicht „bestreiten“). */
const THEMEN_STICHWORTE={
 konflikt_mobbing:['streit','gestritten','mobb','gemobbt','ausgegrenzt','ausgelacht','gehänselt','beleidig','prügel','schlägerei','konflikt','geärgert','ärgern','bedroh','lästern','gelästert'],
 familie:['mutter','vater','mama','papa','eltern','trennung','scheidung','zuhause','zu hause','geschwister','bruder','schwester','familie','oma','opa','pflegefamilie','stiefvater','stiefmutter'],
 fehlzeiten_schulangst:['fehlt','gefehlt','fehlstunden','fehlzeit','fehltag','krank','krankgemeldet','schwänz','geschwänzt','schulangst','angst vor der schule','nicht zur schule','verspät','unentschuldigt'],
 emotionen_krise:['traurig','weint','geweint','weinen','wütend','wut','panik','verzweifelt','überfordert','krise','nicht mehr leben','ritz','suizid','hoffnungslos','einsam'],
 lernen_motivation:['noten','schlechte note','lernen','hausaufgaben','motivation','keine lust','klassenarbeit','versetzung','sitzenbleib','nachhilfe','konzentration'],
 verhalten_unterricht:['stört','gestört','störung','unterrichtsstörung','trainingsraum','provozier','respektlos','verweis','ordnungsmaßnahme','regelverstoß'],
 medien:['handy','smartphone','instagram','tiktok','whatsapp','snapchat','klassenchat','gruppenchat','zocken','gaming','social media','fotos verschickt','videos','internet'],
 sucht:['alkohol','betrunken','kiffen','gekifft','cannabis','drogen','vape','vapen','e-zigarette','rauchen','raucht','zigarette'],
 gesundheit:['arzt','ärztin','schlaf','müde','kopfschmerz','bauchschmerz','isst nicht','medikament','therapie','klinik','verletzt'],
 berufsorientierung:['praktikum','bewerbung','beruf','ausbildung','berufsberatung','schulabschluss','agentur für arbeit'],
 kinderschutz:['kindeswohl','blaue flecken','geschlagen worden','schlägt mich','schlägt ihn','schlägt sie','gewalt zu hause','gewalt zuhause','missbrauch','übergriff','vernachlässig','hat angst nach hause','ohne frühstück','hungrig','allein zu hause','alleine zu hause','verwahrlos','ungepflegt']
};
function themenVorschlag(text){
 const t=' '+String(text||'').toLocaleLowerCase('de-DE').replace(/\s+/g,' ');
 const out=[];for(const [id,woerter] of Object.entries(THEMEN_STICHWORTE)){
  const treffer=woerter.filter(w=>{const i=t.indexOf(w);if(i<0)return false;let pos=i;while(pos>=0){if(!/[a-zäöüß]/.test(t[pos-1]||' '))return true;pos=t.indexOf(w,pos+1);}return false;});
  if(treffer.length)out.push({id,treffer});
 }
 return out;
}
/* Sperr- und Vorsichtshinweise für den Kopf der Akte (0.18) */
function datumDE(d){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d||''));return m?m[3]+'.'+m[2]+'.'+m[1]:String(d||'');}
function tageZwischen(von,bis){const a=Date.parse(String(von).slice(0,10)+'T12:00:00Z'),b=Date.parse(String(bis).slice(0,10)+'T12:00:00Z');return isNaN(a)||isNaN(b)?null:Math.round((b-a)/86400000);}
function sperrHinweise(state,sid,heute=day()){
 const s=(state.students||[]).find(x=>x.id===sid);if(!s)return [];
 const f=s.family||{},out=[];
 const kp=String(f.contactPermission||'');
 if(kp==='Kontakt untersagt')out.push({stufe:'rot',text:'Kontakt untersagt',quelle:'Familie: Kontakt- und Auskunftslage'});
 else if(kp==='Kontakt eingeschränkt')out.push({stufe:'rot',text:'Kontakt eingeschränkt',quelle:'Familie: Kontakt- und Auskunftslage'});
 else if(kp==='Nur nach Rücksprache')out.push({stufe:'gelb',text:'Kontakt und Auskunft nur nach Rücksprache',quelle:'Familie: Kontakt- und Auskunftslage'});
 else if(kp==='Ungeklärt')out.push({stufe:'gelb',text:'Kontakt- und Auskunftslage ungeklärt',quelle:'Familie'});
 if(String(f.custodyStatus||'')==='Ungeklärt')out.push({stufe:'gelb',text:'Sorgerecht ungeklärt',quelle:'Familie: Sorgerechtsstand'});
 for(const r of state.relatedPersons||[]){
  if(r.studentId!==sid||r.deletedAt||r.archived)continue;
  const wer=[r.name,r.role].filter(Boolean).join(' · ');
  if(r.mayContact==='Nein')out.push({stufe:'rot',text:'Keine Auskunft / kein Kontakt: '+wer,quelle:'Bezugsperson'});
  else if(r.mayContact==='Ja, eingeschränkt')out.push({stufe:'gelb',text:'Nur eingeschränkt Kontakt: '+wer,quelle:'Bezugsperson'});
  if(r.custodyUnclear==='Ja')out.push({stufe:'gelb',text:'Sorgerecht ungeklärt: '+wer,quelle:'Bezugsperson'});
  // 0.24: Schweigepflichtentbindung – nur bei Personen, mit denen Kontakt überhaupt möglich ist
  if(r.mayContact!=='Nein'){
   const rs=String(r.releaseStatus||''),bis=String(r.releaseUntil||'');
   if(rs==='Abgelaufen'||(rs==='Liegt vor'&&iso(bis)&&bis<heute))out.push({stufe:'gelb',text:'Schweigepflichtentbindung abgelaufen'+(iso(bis)?' ('+datumDE(bis)+')':'')+': '+wer,quelle:'Bezugsperson'});
   else if(rs==='Noch ausstehend')out.push({stufe:'gelb',text:'Schweigepflichtentbindung noch ausstehend: '+wer,quelle:'Bezugsperson'});
   else if(rs==='Nicht erteilt')out.push({stufe:'gelb',text:'Keine Schweigepflichtentbindung: '+wer,quelle:'Bezugsperson'});
  }
 }
 // 0.24: Familienangaben regelmäßig prüfen
 const famFelder=['custodyStatus','livingArrangement','contactPermission','custodians','households','supportPersons','restrictions'];
 if(famFelder.some(k=>String(f[k]||'').trim())){
  const gep=String(f.verifiedAt||'');
  if(!iso(gep))out.push({stufe:'gelb',text:'Familienangaben ohne Prüfdatum – bitte prüfen',quelle:'Familie'});
  else{const t=tageZwischen(gep,heute);if(t!==null&&t>365)out.push({stufe:'gelb',text:'Familienangaben zuletzt geprüft am '+datumDE(gep)+' – bitte prüfen',quelle:'Familie'});}
 }
 return out.sort((a,b)=>(a.stufe==='rot'?0:1)-(b.stufe==='rot'?0:1));
}
/* ================================================================
   WEITERGABE (0.17): Standardberichte mit Anonymisierung
   Nur diese Berichte verlassen das Cockpit. Kleinste Einheiten: Halbjahr und Klassenstufe.
   Mitarbeitende erscheinen nie. Kinderschutz, Krise und Sucht nur als Gesamtzahl je Schuljahr.
   ================================================================ */
/* 0.24 Grundsätze: Wertungen erkennen, Gruppentexte prüfen, Auftrag bei Wiederaufnahme.
   Alles sind nur Hinweise – nichts wird automatisch geändert. */
const WERTUNGEN=[
 ['Wertung','Was genau hast du beobachtet oder gehört?',['empfindlich','gemein','faul','frech','zickig','nervig','nervt','unmöglich','dumm','asozial','assi','unverschämt','anstrengend','naiv','desinteressiert','unfähig','überfordert','verwöhnt','unerzogen','lügt','gelogen','verlogen','typisch','aufmüpfig','bockig','renitent','uneinsichtig','unmotiviert','provokant','provokativ','hinterhältig','unzuverlässig','chaotisch','dreist','launisch','hysterisch','theatralisch','primitiv','peinlich','respektlos','kaputt']],
 ['Unterstellung','Woher weißt du das? Aussage oder Beobachtung kennzeichnen.',['angeblich','schwänzt','geschwänzt','kümmert sich nicht','kümmern sich nicht','simuliert','tut nur so','will nur Aufmerksamkeit','macht das absichtlich','offensichtlich','natürlich wieder','wie immer','wieder mal','mal wieder']],
 ['Diagnose','Nur wenn fachlich festgestellt – mit Quelle nennen.',['depressiv','depression','adhs','autist','autistin','autistisch','traumatisiert','borderline','magersüchtig','essgestört','süchtig','handysüchtig','mediensüchtig','spielsüchtig','verhaltensgestört','hyperaktiv','psychisch krank','paranoid','zwanghaft','legastheniker','legasthenikerin','lernbehindert','alkoholiker','alkoholikerin','drogenabhängig']],
 ['Etikett','Beschreibe das Verhalten statt die Person einzuordnen.',['scheidungskind','sozial schwach','bildungsfern','opfer','anführerin','anführer','mitläufer','mitläuferin','außenseiter','außenseiterin','klassenclown','problemkind','problemfamilie','problemschüler','problemschülerin','systemsprenger','systemsprengerin','sozialfall','brennpunktfamilie','hartz','verhaltensauffällig']],
 ['Umgangssprache','Sachlicher Begriff? (z. B. „ausgerastet“ → „sehr laut geworden, hat … geworfen“)',['ausgerastet','ausgetickt','ausgeflippt','abgedreht','rumgeschrien','abgehauen','keinen bock','null bock','zoff','kids','bullen','geheult','rumgezickt','gechillt']],
 ['Verstärker','Ohne Verstärker wirkt der Satz sachlicher.',['total','völlig','extrem','absolut','ständig','dauernd','permanent','unglaublich','mega','krass','komplett']]
];
const regEsc=w=>String(w).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
// Wörtliche Zitate („…“ oder "…") sind Aussagen und werden nicht als Wertung der Fachkraft gezählt.
function ohneZitate(text){return String(text||'').normalize('NFC').replace(/„[^“”"]*[“”"]|"[^"]*"|»[^«]*«|‚[^‘’']*[‘’']/g,m=>' '.repeat(m.length));}
function wertungsHinweise(text){
 const t=ohneZitate(text),out=[];
 for(const [art,frage,woerter] of WERTUNGEN)for(const w of woerter){
  const m=new RegExp('(?:^|[^\\p{L}])('+regEsc(w)+'(?:e|en|er|es|em|n|s|st|t)?)(?![\\p{L}])','iu').exec(t);
  if(m&&!out.some(o=>o.wort.toLocaleLowerCase('de-DE')===m[1].toLocaleLowerCase('de-DE')))out.push({wort:m[1],art,frage});
 }
 return out;
}
const PERSOENLICHE_THEMEN=['familie','gesundheit','emotionen_krise','kinderschutz','sucht'];
function gruppenTextHinweis(state,text,participantIds){
 const ids=[...new Set(participantIds||[])],t=String(text||'').normalize('NFC');
 if(ids.length<2||!t.trim())return null;
 const themen=themenVorschlag(t).filter(v=>PERSOENLICHE_THEMEN.includes(v.id));
 const schutz=safetyHint(t);
 const etiketten=wertungsHinweise(t).filter(w=>w.art==='Diagnose'||w.art==='Etikett');
 if(!themen.length&&!schutz&&!etiketten.length)return null;
 const kinder=ids.map(id=>(state.students||[]).find(s=>s.id===id)).filter(Boolean).filter(s=>[s.first,s.last].map(n=>String(n||'').trim()).filter(n=>n.length>=2).some(n=>new RegExp('(?:^|[^\\p{L}])'+regEsc(n)+'s?(?![\\p{L}])','iu').test(t)));
 if(!kinder.length)return null;
 return {kinder:kinder.map(s=>({id:s.id,name:s.first+' '+s.last})),gruende:[...themen.map(v=>katLabel('thema',v.id)),...(schutz?['mögliche Schutzfrage']:[]),...etiketten.map(e=>e.art+' „'+e.wort+'“')]};
}
function auftragPruefen(state,sid){
 const auf=(state.auftraege||[]).filter(a=>a.studentId===sid).sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.createdAt||'').localeCompare(String(b.createdAt||''))).at(-1);
 if(!auf)return null;
 const wieder=(state.statusHistory||[]).filter(h=>h.studentId===sid&&h.fromStatus==='Abgeschlossen'&&h.status!=='Abgeschlossen'&&String(h.date||'')>=String(auf.date||'')).sort((a,b)=>String(a.date).localeCompare(String(b.date))).at(-1);
 if(!wieder)return null;
 if(wieder.date===auf.date&&String(auf.createdAt||'')>String(wieder.createdAt||''))return null;
 return {grund:'wiederaufgenommen',seit:wieder.date,auftrag:auf};
}
/* 0.24 Aufbewahrung: Akten ehemaliger Schüler:innen nach Ablauf der Frist (Standard 5 Jahre ab Abgang)
   endgültig löschen – nur einzeln, nach Bestätigung, mit Protokoll ohne Namen. */
const AUFBEWAHRUNG_STANDARD=5;
function aufbewahrungJahre(state){const j=Number(state?.settings?.aufbewahrungJahre);return Number.isInteger(j)&&j>=1&&j<=30?j:AUFBEWAHRUNG_STANDARD;}
function plusJahre(d,j){const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d||''));if(!m)return '';let y=Number(m[1])+j,mo=m[2],da=m[3];if(mo==='02'&&da==='29')da='28';return y+'-'+mo+'-'+da;}
function abgangsDatum(state,s){
 if(iso(s.archivedAt))return {datum:s.archivedAt,quelle:'Abgang'};
 const bis=(s.enrollments||[]).map(e=>e.validTo).filter(iso).sort().at(-1);if(bis)return {datum:bis,quelle:'Klassenzuordnung'};
 const letzte=(state.journal||[]).filter(e=>(e.participantIds||[]).includes(s.id)).map(e=>e.date).filter(iso).sort().at(-1);if(letzte)return {datum:letzte,quelle:'letzter Eintrag'};
 return null;
}
function bezieht(o,sid){if(!o||typeof o!=='object')return false;if(o.studentId===sid)return true;for(const k of ['participantIds','studentIds'])if(Array.isArray(o[k])&&o[k].includes(sid))return true;return false;}
function loeschUmfang(state,sid){
 let eintraege=0,sonstige=0;
 for(const [k,v] of Object.entries(state))if(Array.isArray(v)&&k!=='students'&&k!=='loeschprotokoll')for(const o of v)if(bezieht(o,sid)){if(k==='journal')eintraege++;else sonstige++;}
 return {eintraege,sonstige};
}
// Ein Kind aus einem gemeinsamen Eintrag entfernen: ID-Listen und alle Zuordnungen „Kind → Wert“ (Notizen, Kontexte, Statistik)
function kindAusEintrag(o,sid){
 for(const f of ['participantIds','studentIds','pinnedFor'])if(Array.isArray(o[f]))o[f]=o[f].filter(x=>x!==sid);
 for(const v of [o,o.stat])if(v&&typeof v==='object')for(const w of Object.values(v))if(w&&typeof w==='object'&&!Array.isArray(w)&&Object.prototype.hasOwnProperty.call(w,sid))delete w[sid];
}
function loeschfaellig(state,{heute=day()}={}){
 const jahre=aufbewahrungJahre(state);
 return (state.students||[]).filter(s=>s.active===false).map(s=>{const a=abgangsDatum(state,s);if(!a)return null;const faellig=plusJahre(a.datum,jahre);return faellig&&faellig<=heute?{sid:s.id,name:[s.first,s.last].filter(Boolean).join(' '),klasse:s.className||'',abgang:a.datum,quelle:a.quelle,faellig,...loeschUmfang(state,s.id)}:null;}).filter(Boolean).sort((a,b)=>a.faellig.localeCompare(b.faellig));
}
function akteLoeschen(state,sid,{von='',heute=day()}={}){
 const s=(state.students||[]).find(x=>x.id===sid);if(!s)throw Error('Akte nicht gefunden.');
 if(s.active!==false)throw Error('Nur archivierte Akten ehemaliger Schüler:innen können gelöscht werden.');
 const f=loeschfaellig(state,{heute}).find(x=>x.sid===sid);if(!f)throw Error('Die Aufbewahrungsfrist dieser Akte ist noch nicht abgelaufen.');
 const caseIds=new Set((state.cases||[]).filter(c=>c.studentId===sid).map(c=>c.id));let entfernt=0;
 for(const [k,v] of Object.entries(state)){
  if(!Array.isArray(v)||k==='students'||k==='loeschprotokoll')continue;
  state[k]=v.filter(o=>{
   if(!o||typeof o!=='object')return true;
   const viele=['participantIds','studentIds'].find(f=>Array.isArray(o[f])&&o[f].includes(sid)&&o[f].length>1);
   if(viele&&o.studentId!==sid){kindAusEintrag(o,sid);for(const r of o.revisions||[])if(r?.before&&typeof r.before==='object')kindAusEintrag(r.before,sid);entfernt++;return true;}
   if(bezieht(o,sid)||(o.caseId&&caseIds.has(o.caseId))){entfernt++;return false;}
   return true;});
 }
 for(const [k,v] of Object.entries(state.importLinks||{}))if(v===sid)delete state.importLinks[k];
 const tags=state.settings?.timelineTags;if(tags)for(const k of Object.keys(tags))if(k.startsWith(sid+'|'))delete tags[k];
 state.students=state.students.filter(x=>x.id!==sid);
 state.loeschprotokoll=Array.isArray(state.loeschprotokoll)?state.loeschprotokoll:[];
 const p={id:uid('loesch'),am:new Date().toISOString(),von:String(von||aktiveMitarbeitende(state)),frist:aufbewahrungJahre(state),abgang:f.abgang,schuljahrAbgang:schoolYear(f.abgang),klasse:f.klasse,eintraege:f.eintraege,weitere:entfernt-f.eintraege};
 state.loeschprotokoll.push(p);return p;
}
const GESCHUETZTE_THEMEN=['kinderschutz','emotionen_krise','sucht'];
const BERICHTE={jahresbericht:'Jahresbericht',halbjahr:'Halbjahresüberblick',arbeitszeit:'Arbeitszeitverteilung',praevention:'Prävention je Klassenstufe',vorjahr:'Vorjahresvergleich'};
const ARBEITSBEREICHE={einzelfall:'Einzelfall',gruppen_klassen:'Gruppen und Klassen',kooperation:'Kooperation',verwaltung:'Verwaltung',fortbildung:'Fortbildung'};
const GRENZE_LISTE=3,GRENZE_KREUZ=5,FOLGE='•';
function wertLabel(merkmal,id){
 if(id===NICHT_ERFASST||id==null||id==='')return 'nicht erfasst';
 if(merkmal==='stufe')return 'Jahrgang '+id;
 if(merkmal==='zweig')return id==='GS'?'Grundschule':id==='OBS'?'Oberschule':String(id);
 if(merkmal==='arbeitsbereich')return ARBEITSBEREICHE[id]||String(id);
 if(merkmal==='schuljahr')return 'Schuljahr '+id;
 return katLabel(merkmal,id);
}
/* Kleinzahlregel mit wiederholtem Folgeschutz.
   werte: Matrix [zeilen][spalten]. Summen werden aus den Zellen gebildet und mitgeprüft.
   Jede angezeigte Summe bildet mit ihren Zellen eine Gleichung. Ist in einer Gleichung genau ein Wert
   unterdrückt, wird der kleinste weitere Wert (> 0) unterdrückt – so lange, bis sich nichts mehr ändert. */
function anonymMatrix(werte,{grenze=GRENZE_LISTE,zeilenSummen=false,spaltenSummen=false}={}){
 const Z=werte.length,S=Z?werte[0].length:0,zelle=w=>({wert:Number(w)||0,s:''});
 const zellen=werte.map(r=>r.map(zelle));
 const R=zeilenSummen?zellen.map(r=>zelle(r.reduce((a,c)=>a+c.wert,0))):null;
 const C=spaltenSummen?Array.from({length:S},(_,j)=>zelle(zellen.reduce((a,r)=>a+r[j].wert,0))):null;
 const G=zeilenSummen&&spaltenSummen?zelle(zellen.reduce((a,r)=>a+r.reduce((b,c)=>b+c.wert,0),0)):null;
 const alle=[...zellen.flat(),...(R||[]),...(C||[]),...(G?[G]:[])];
 for(const c of alle)if(c.wert>0&&c.wert<grenze)c.s='klein';
 const gl=[];
 if(R)zellen.forEach((r,i)=>gl.push([...r,R[i]]));
 if(C)for(let j=0;j<S;j++)gl.push([...zellen.map(r=>r[j]),C[j]]);
 if(G){gl.push([...R,G]);gl.push([...C,G]);}
 let geaendert=true,runden=0;
 while(geaendert&&runden++<500){geaendert=false;
  for(const g of gl){if(g.filter(c=>c.s).length!==1)continue;
   const kand=g.filter(c=>!c.s&&c.wert>0).sort((a,b)=>a.wert-b.wert);
   if(kand.length){kand[0].s='folge';geaendert=true;}}
 }
 const anzeige=c=>c.s==='klein'?'< '+grenze:c.s==='folge'?FOLGE:String(c.wert);
 const unterdrueckt=alle.filter(c=>c.s).length,folge=alle.filter(c=>c.s==='folge').length;
 return {zellen:zellen.map(r=>r.map(c=>({...c,anzeige:anzeige(c)}))),zeilenSummen:R&&R.map(c=>({...c,anzeige:anzeige(c)})),spaltenSummen:C&&C.map(c=>({...c,anzeige:anzeige(c)})),gesamt:G&&{...G,anzeige:anzeige(G)},unterdrueckt,folge,nichtNull:zellen.flat().filter(c=>c.wert>0).length,zellenUnterdrueckt:zellen.flat().filter(c=>c.s).length};
}
function kennzahlAnzeige(w){w=Number(w)||0;return w>0&&w<GRENZE_LISTE?'< '+GRENZE_LISTE:String(w);}
function zahlText(w){return String(Math.round((Number(w)||0)*10)/10).replace('.',',');}
function schuljahrGrenzen(sj){const y=Number(String(sj||'').slice(0,4));if(!y)throw new Error('Bitte ein Schuljahr wählen.');return {y,von:y+'-08-01',bis:(y+1)+'-07-31',sj:y+'/'+String(y+1).slice(2)};}
// Abschnitt „Liste“: ein Merkmal, eine Spalte; additiv → mit Summe und Folgeschutz
function listeAbschnitt(titel,merkmal,rows,{einheit='Kontakte',summe=true,anonym=true,hinweis=''}={}){
 if(!anonym)return {titel,typ:'tabelle',kopf:[wertKopf(merkmal),einheit],zeilen:rows.map(r=>({label:wertLabel(merkmal,r.id),zellen:[zahlText(r.wert)]})),fuss:summe?{label:'Summe',zellen:[zahlText(rows.reduce((a,r)=>a+r.wert,0))]}:null,hinweis,anonym:false};
 const a=anonymMatrix(rows.map(r=>[r.wert]),{grenze:GRENZE_LISTE,spaltenSummen:summe});
 return {titel,typ:'tabelle',kopf:[wertKopf(merkmal),einheit],zeilen:rows.map((r,i)=>({label:wertLabel(merkmal,r.id),zellen:[a.zellen[i][0].anzeige]})),fuss:summe?{label:'Summe',zellen:[a.spaltenSummen[0].anzeige]}:null,hinweis:hinweis||(summe?'':'Mehrfachnennungen möglich, deshalb ohne Summe.'),anonym:true,unterdrueckt:a.unterdrueckt};
}
function wertKopf(m){return {kontaktart:'Art des Kontakts',thema:'Thema',zugangsweg:'Zugangsweg',ergebnis:'Ergebnis',stufe:'Klassenstufe',zweig:'Schulzweig',arbeitsbereich:'Arbeitsbereich',taetigkeit:'Tätigkeit'}[m]||m;}
function ohneGeschuetzte(rows){return rows.filter(r=>!GESCHUETZTE_THEMEN.includes(r.id));}
// Klassenstufe → Schulzweig, wenn mehr als die Hälfte der Zahlen unterdrückt würde
function stufeOderZweig(evs,f,zk,titel){
 const st=aufschluesselung(evs,'stufe','kinder',f,zk).sort((a,b)=>(a.id===NICHT_ERFASST)-(b.id===NICHT_ERFASST)||Number(a.id)-Number(b.id));
 const a=anonymMatrix(st.map(r=>[r.wert]),{spaltenSummen:true});
 if(a.nichtNull&&a.zellenUnterdrueckt*2>a.nichtNull){const zw=aufschluesselung(evs,'zweig','kinder',f,zk);return {abschnitt:listeAbschnitt(titel+' Schulzweig','zweig',zw,{einheit:'Kinder'}),hinweis:'Klassenstufen wurden zu Schulzweigen zusammengefasst, weil zu viele Zahlen zu klein waren.'};}
 return {abschnitt:listeAbschnitt(titel+' Klassenstufe','stufe',st,{einheit:'Kinder'}),hinweis:''};
}
function kennzahlenAbschnitt(k,{mitAnonym=true}={}){
 const zeilen=[['Erreichte Schüler:innen',kennzahlAnzeige(k.erreichteSchueler)],['Einzelfälle (Beratungs- oder Krisengespräch)',kennzahlAnzeige(k.einzelfaelle)],['Kontakte',kennzahlAnzeige(k.kontakte)],['Erreichte Personen',kennzahlAnzeige(k.erreichtePersonen)],['Stunden',zahlText(k.stunden)]];
 if(mitAnonym)zeilen.push(['Anonyme Kurzkontakte',kennzahlAnzeige(k.anonymeKurzkontakte)]);
 return {titel:'Kennzahlen',typ:'tabelle',kopf:['Kennzahl','Wert'],zeilen:zeilen.map(([l,w])=>({label:l,zellen:[w]})),fuss:null,hinweis:''};
}
function kreuzAbschnitt(titel,evs,a,b,f,zk,{ohneGeschuetzt=true}={}){
 const kt=kreuztabelle(evs,a,b,'kontakte',f,zk);
 let idx=kt.zeilen.map((z,i)=>i);if(ohneGeschuetzt&&a==='thema')idx=idx.filter(i=>!GESCHUETZTE_THEMEN.includes(kt.zeilen[i]));
 const werte=idx.map(i=>kt.tabelle[i]);
 if(!werte.length)return null;
 const m=anonymMatrix(werte,{grenze:GRENZE_KREUZ,zeilenSummen:true,spaltenSummen:true});
 return {titel,typ:'tabelle',kopf:[wertKopf(a)+' \\ '+wertKopf(b),...kt.spalten.map(x=>wertLabel(b,x)),'Summe'],zeilen:idx.map((i,n)=>({label:wertLabel(a,kt.zeilen[i]),zellen:[...m.zellen[n].map(c=>c.anzeige),m.zeilenSummen[n].anzeige]})),fuss:{label:'Summe',zellen:[...m.spaltenSummen.map(c=>c.anzeige),m.gesamt.anzeige]},hinweis:'Kreuztabelle: Werte unter 5 als „< 5“. '+(a==='thema'?'Kinderschutz, Krise und Sucht sind hier nicht aufgeschlüsselt. Mehrfachnennungen möglich.':''),anonym:true,unterdrueckt:m.unterdrueckt};
}
function berichtRahmen(art,zeitraum){return {art,titel:BERICHTE[art],zeitraum,erstellt:new Date().toISOString(),abschnitte:[],hinweise:['Anonymisiert: 1 und 2 erscheinen als „< 3“, in Kreuztabellen Werte unter 5 als „< 5“. „'+FOLGE+'“ = zum Schutz zusätzlich ausgeblendet (Folgeschutz).','Keine Namen, keine Angaben zu Mitarbeitenden, kleinste Einheiten: Halbjahr und Klassenstufe.']};}
function standardbericht(state,art,opt={}){
 if(!BERICHTE[art])throw new Error('Unbekannter Bericht.');
 const zk=zugangKarte(state),alle=ereignisse(state),g=schuljahrGrenzen(opt.schuljahr||state.settings?.currentSchoolYear);
 const imZeitraum=(von,bis)=>filterEreignisse(alle,{von,bis},zk);
 if(art==='halbjahr'){
  const hj=Number(opt.halbjahr)===2?2:1,von=hj===1?g.von:(g.y+1)+'-02-01',bis=hj===1?(g.y+1)+'-01-31':g.bis;
  const b=berichtRahmen(art,hj+'. Halbjahr '+g.sj),evs=imZeitraum(von,bis),f={von,bis};
  b.abschnitte.push(kennzahlenAbschnitt(kennzahlen(evs,f)));
  b.abschnitte.push(listeAbschnitt('Art des Kontakts','kontaktart',aufschluesselung(evs,'kontaktart','kontakte',f,zk)));
  b.abschnitte.push(listeAbschnitt('Themen','thema',ohneGeschuetzte(aufschluesselung(evs,'thema','kontakte',f,zk)),{summe:false,hinweis:'Mehrfachnennungen möglich. Kinderschutz, Krise und Sucht erscheinen nur als Gesamtzahl im Jahresbericht.'}));
  b.abschnitte.push(listeAbschnitt('Erreichte Schüler:innen nach Schulzweig','zweig',aufschluesselung(evs,'zweig','kinder',f,zk),{einheit:'Kinder'}));
  return b;
 }
 const evs=imZeitraum(g.von,g.bis),f={von:g.von,bis:g.bis},b=berichtRahmen(art,'Schuljahr '+g.sj);
 if(art==='jahresbericht'){
  const rb=String(opt.rueckblick||'').trim();if(rb)b.rueckblick=rb;
  b.abschnitte.push(kennzahlenAbschnitt(kennzahlen(evs,f)));
  b.abschnitte.push(listeAbschnitt('Art des Kontakts','kontaktart',aufschluesselung(evs,'kontaktart','kontakte',f,zk)));
  b.abschnitte.push(listeAbschnitt('Themen','thema',aufschluesselung(evs,'thema','kontakte',f,zk),{summe:false,hinweis:'Mehrfachnennungen möglich. Kinderschutz, Krise und Sucht nur als Gesamtzahl für das Schuljahr.'}));
  b.abschnitte.push(listeAbschnitt('Zugangsweg','zugangsweg',aufschluesselung(evs,'zugangsweg','kinder',f,zk),{einheit:'Kinder'}));
  b.abschnitte.push(listeAbschnitt('Ergebnis der Gespräche','ergebnis',aufschluesselung(evs,'ergebnis','kontakte',f,zk)));
  const sz=stufeOderZweig(evs,f,zk,'Erreichte Schüler:innen nach');b.abschnitte.push(sz.abschnitt);if(sz.hinweis)b.hinweise.push(sz.hinweis);
  const kr=kreuzAbschnitt('Themen nach Schulzweig',evs,'thema','zweig',f,zk);if(kr)b.abschnitte.push(kr);
  b.abschnitte.push(listeAbschnitt('Tätigkeiten ohne Fall (Stunden)','taetigkeit',aufschluesselung(evs,'taetigkeit','stunden',f,zk),{einheit:'Stunden',anonym:false,hinweis:'Arbeitszeit, keine Personenzahl.'}));
 }else if(art==='arbeitszeit'){
  b.abschnitte.push(listeAbschnitt('Arbeitszeit nach Bereich','arbeitsbereich',aufschluesselung(evs,'arbeitsbereich','stunden',f,zk),{einheit:'Stunden',anonym:false,hinweis:'Arbeitszeit, keine Personenzahl. Einträge ohne Dauer fehlen hier.'}));
  b.abschnitte.push(listeAbschnitt('Stunden nach Art des Kontakts','kontaktart',aufschluesselung(evs,'kontaktart','stunden',f,zk),{einheit:'Stunden',anonym:false}));
  b.abschnitte.push(listeAbschnitt('Tätigkeiten ohne Fall','taetigkeit',aufschluesselung(evs,'taetigkeit','stunden',f,zk),{einheit:'Stunden',anonym:false}));
  const k=kennzahlen(evs,f);b.hinweise.push(k.ohneDauer?k.ohneDauer+' Einträge ohne Dauer sind nicht enthalten.':'Alle Einträge haben eine Dauer.');
 }else if(art==='praevention'){
  const pr=evs.filter(e=>e.kontaktart==='klasse'||(e.art==='taetigkeit'&&e.taetigkeit==='klassenprojekt_praevention'));
  const st=[...new Set(pr.map(e=>e.stufeAnonym==null||e.stufeAnonym===''?NICHT_ERFASST:String(e.stufeAnonym)))].sort((a,b)=>(a===NICHT_ERFASST)-(b===NICHT_ERFASST)||Number(a)-Number(b));
  const zeile=id=>{const x=pr.filter(e=>(e.stufeAnonym==null||e.stufeAnonym===''?NICHT_ERFASST:String(e.stufeAnonym))===id);return {label:wertLabel('stufe',id),zellen:[String(x.length),String(x.reduce((a,e)=>a+(e.teilnehmende||0),0)),zahlText(x.reduce((a,e)=>a+(e.dauer_min||0),0)/60)]};};
  b.abschnitte.push({titel:'Präventionsangebote in Klassen',typ:'tabelle',kopf:['Klassenstufe','Angebote','Teilnehmende','Stunden'],zeilen:st.map(zeile),fuss:{label:'Summe',zellen:[String(pr.length),String(pr.reduce((a,e)=>a+(e.teilnehmende||0),0)),zahlText(pr.reduce((a,e)=>a+(e.dauer_min||0),0)/60)]},hinweis:'Klassenangebote betreffen ganze Klassen, nicht einzelne Kinder; deshalb ohne Kleinzahlregel.'});
 }else if(art==='vorjahr'){
  const v=schuljahrGrenzen((g.y-1)+'/'),evV=imZeitraum(v.von,v.bis),fV={von:v.von,bis:v.bis};
  b.zeitraum='Schuljahr '+v.sj+' und '+g.sj;
  const k1=kennzahlen(evV,fV),k2=kennzahlen(evs,f);
  b.abschnitte.push({titel:'Kennzahlen im Vergleich',typ:'tabelle',kopf:['Kennzahl',v.sj,g.sj],zeilen:[['Erreichte Schüler:innen','erreichteSchueler'],['Einzelfälle','einzelfaelle'],['Kontakte','kontakte'],['Erreichte Personen','erreichtePersonen']].map(([l,k])=>({label:l,zellen:[kennzahlAnzeige(k1[k]),kennzahlAnzeige(k2[k])]})).concat([{label:'Stunden',zellen:[zahlText(k1.stunden),zahlText(k2.stunden)]}]),fuss:null,hinweis:''});
  const vergleich=(titel,merkmal,einheit,summe,filter=x=>x)=>{
   const a=filter(aufschluesselung(evV,merkmal,einheit,fV,zk)),c=filter(aufschluesselung(evs,merkmal,einheit,f,zk)),ids=[...new Set([...a,...c].map(r=>r.id))];
   const wert=(rows,id)=>rows.find(r=>r.id===id)?.wert||0;
   const m=anonymMatrix(ids.map(id=>[wert(a,id),wert(c,id)]),{grenze:GRENZE_LISTE,spaltenSummen:summe});
   return {titel,typ:'tabelle',kopf:[wertKopf(merkmal),v.sj,g.sj],zeilen:ids.map((id,i)=>({label:wertLabel(merkmal,id),zellen:m.zellen[i].map(c=>c.anzeige)})),fuss:summe?{label:'Summe',zellen:m.spaltenSummen.map(c=>c.anzeige)}:null,hinweis:summe?'':'Mehrfachnennungen möglich, deshalb ohne Summe.',anonym:true};
  };
  b.abschnitte.push(vergleich('Art des Kontakts','kontaktart','kontakte',true));
  b.abschnitte.push(vergleich('Themen','thema','kontakte',false));
 }
 return b;
}
function csvZelle(v){let t=String(v??'');if(/^[=+\-@]/.test(t))t="'"+t;return /[;"\r\n]/.test(t)?'"'+t.replace(/"/g,'""')+'"':t;}
function berichtCsv(b){
 const z=[],zeile=arr=>z.push(arr.map(csvZelle).join(';'));
 zeile(['SSA-Cockpit Ludgerusschule',b.titel]);zeile(['Zeitraum',b.zeitraum]);zeile(['Erstellt',String(b.erstellt||'').slice(0,10)]);
 for(const h of b.hinweise)zeile(['Hinweis',h]);
 if(b.rueckblick){z.push('');zeile(['Fachlicher Jahresrückblick']);zeile([b.rueckblick]);}
 for(const a of b.abschnitte){z.push('');zeile([a.titel]);zeile(a.kopf);for(const r of a.zeilen)zeile([r.label,...r.zellen]);if(a.fuss)zeile([a.fuss.label,...a.fuss.zellen]);if(a.hinweis)zeile(['Hinweis',a.hinweis]);}
 return '﻿'+z.join('\r\n')+'\r\n';
}
function weitergabeProtokollieren(state,{bericht,zeitraum,empfaenger,zweck='',format}){
 const e=String(empfaenger||'').trim();if(!e)throw new Error('Bitte angeben, an wen der Bericht geht.');
 if(!['CSV','Druck'].includes(format))throw new Error('Unbekanntes Format.');
 state.weitergaben=Array.isArray(state.weitergaben)?state.weitergaben:[];
 const w={id:uid('weitergabe'),am:new Date().toISOString(),bericht:String(bericht||''),zeitraum:String(zeitraum||''),empfaenger:e,zweck:String(zweck||'').trim(),format,von:aktiveMitarbeitende(state)};
 state.weitergaben.push(w);return w;
}
root.Dossier={restore,uid,iso,schoolYear,validYear,classValid,nextClass,ids,context,recordContext,stamp,normalize,lookup,preview,validate,apply,archive,localSuggestions,addEntry,editEntry,addTask,setTask,assess,currentAssessment,work,timeline,journalStats,quickContact,addPromise,completePromise,saveAuftrag,safetyCheck,ideasForEntry,markNoFurtherStep,safetyHint,KATEGORIEN_VERSIONEN,kategorien,katListe,katLabel,stufeZweig,statErfassen,statMerkmale,zugangswegFuer,zugangswegSetzen,addTaetigkeit,ereignisse,zugangKarte,filterEreignisse,kennzahlen,aufschluesselung,kreuztabelle,datenqualitaet,statNachtragen,werteVon,NICHT_ERFASST,addStudent,similarStudents,suchNorm,suchPasst,schuelerSuche,jahrKlassen,klasseUebernehmen,alleKlassenUebernehmen,klasseAbgang,planeGespraech,geplanteGespraeche,gespraechVerschieben,gespraechAbsagen,gespraechErledigt,THEMEN_STICHWORTE,themenVorschlag,sperrHinweise,wertungsHinweise,gruppenTextHinweis,auftragPruefen,AUFBEWAHRUNG_STANDARD,aufbewahrungJahre,abgangsDatum,loeschfaellig,akteLoeschen,GESCHUETZTE_THEMEN,BERICHTE,wertLabel,anonymMatrix,kennzahlAnzeige,standardbericht,berichtCsv,weitergabeProtokollieren,SSA_TEAM_STANDARD,ssaTeam,mitarbeitendKanonisch,mitarbeitendSchreibweisen,mitarbeitendZuordnen,aktiveMitarbeitende,zusageErledigtEintragen,SAFETY_NOTICE};
})(globalThis);
