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
function isGroupEntry(entry){const n=(entry.participantIds||[]).length;return n>=3||(n>1&&/gruppe|sozialtraining|klassen|mediation|konfliktkl/iu.test(String(entry.type||'')));}
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
 state.settings=state.settings||{};state.auftraege=Array.isArray(state.auftraege)?state.auftraege:[];state.students=state.students||[];state.cases=state.cases||[];state.tasks=state.tasks||[];
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
  if(r.action==='update'&&/^10(?:[a-z])?$/i.test(String(p?.className||''))&&!['Wiederholung','Überspringen'].includes(r.reason))errors.push('Zeile '+(i+1)+': Abschlussjahrgang bitte als Schulabgang, Schulwechsel, Wiederholung oder Überspringen kennzeichnen.');
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
 return [...new Set(hits)];
}
// Live-Hinweis im Formular: nur wenn ein Schutzstichwort tatsächlich vorkommt.
function safetyHint(text){const fachverfahren=fachverfahren_match({content:String(text||'')},{});const hits=schutzTreffer({content:String(text||'')},fachverfahren);return hits.length?{hits,topics:[...new Set(fachverfahren.filter(v=>SCHUTZ_VERFAHREN.includes(v.id)).map(v=>v.topic))]}:null;}
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
 const duration=[5,10,15,20].includes(Number(input.duration))?Number(input.duration):5;
 const occasions=[...new Set((input.occasions||input.occasion||[]).filter(Boolean).map(String))];if(!occasions.length)throw Error('Mindestens einen Anlass auswählen.');
 const row={id:uid('quick'),date,occasions,duration,className:String(input.className||''),grade:String(input.grade||''),anonymous:!!input.anonymous,note:String(input.note||'').trim(),createdAt:new Date().toISOString()};
 if(!row.anonymous){
  if(!input.studentId||!state.students.some(s=>s.id===input.studentId))throw Error('Kind auswählen.');
  row.studentId=input.studentId;row.participantIds=[input.studentId];
  const entry=stamp(state,{id:uid('entry'),date,type:'Kurzkontakt',title:occasions.join(' · '),content:row.note||'Kurzkontakt dokumentiert.',participantIds:[input.studentId],occasions,duration,createdAt:row.createdAt,actionSuggestions:[],suggestionVersion:5,revisions:[],pinnedFor:[]});
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
 const e=state.journal.find(x=>x.id===entryId);if(!e)throw Error('Chronikeintrag fehlt.');
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
function editEntry(state,e,changes,author){if(changes.date&&!iso(changes.date))throw Error('Datum prüfen.');if(e.generalInfo&&changes.type&&changes.type!==e.type)throw Error('Art einer allgemeinen Mitteilung nicht nachträglich ändern.');e.revisions=e.revisions||[];const before=structuredClone(e);delete before.revisions;e.revisions.push({at:new Date().toISOString(),author,before});for(const k of ['content','title','type','date','time','channel','people','source','childView','otherView','observation','assessment','agreement','goal','result','decision','planned','plannedDate','individualNotes','workflowId','oberThemen','fachverfahren','actionSuggestions','kiAnalysis'])if(k in changes)e[k]=changes[k];if(changes.date&&changes.date!==before.date){e.schoolYear=schoolYear(e.date);e.studentContexts={};e.className='';stamp(state,e);}}
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
 // Fallstatus-Einträge steuern das Fallboard. Sie sind keine eigenen fachlichen
 // Ereignisse und würden dort echte Kontakte oder Aufgaben doppelt darstellen.
 const items=legacy.filter(e=>e.eventKind!=='Fallstatus'&&!(e.eventKind==='Dokument'&&e.attachmentId&&e.sourceEntryKey)&&!(e.eventKind==='Trainingsraum'&&e.journalEntryId&&state.journal.some(j=>j.id===e.journalEntryId))&&!state.tasks.some(t=>t.id===e.id)).map(e=>({...e,key:'legacy:'+e.id,legacy:true,context:recordContext(state,e,sid)}));
 for(const e of state.journal.filter(e=>!e.deletedAt&&e.participantIds.includes(sid)))items.push({...e,key:'entry:'+e.id,eventKind:e.type,context:recordContext(state,e,sid),individualNote:e.individualNotes?.[sid]||''});
 for(const e of state.assessments.filter(e=>e.studentId===sid))items.push({...e,key:'assessment:'+e.id,eventKind:'Fachliche Ampelbewertung',title:e.color,content:e.reason,responsible:e.author,context:recordContext(state,e,sid)});
 for(const e of state.yearTransitions.filter(e=>e.studentId===sid))items.push({...e,key:'year:'+e.id,eventKind:'Schuljahresverlauf',content:e.reason,context:recordContext(state,e,sid)});
 for(const e of state.relatedPersons||[])if(e.studentId===sid)items.push({...e,key:'related:'+e.id,date:recordDate(e)||'',eventKind:'Bezugsperson / Netzwerk',title:e.name||'Kontakt',content:[e.role,e.agreements,e.informationScope].filter(Boolean).join(' · '),context:recordContext(state,e,sid)});
 for(const t of work(state,sid))items.push({...t,key:'task:'+t.id,task:true,date:t.due||'',eventKind:'Nächster Schritt',content:t.result||t.expectedResult||'',planned:!t.done,context:recordContext(state,t,sid)});
 for(const k of ['portalRequests','events','verfahrenLaeufe'])for(const e of state[k]||[])if(ids(state,e).includes(sid)&&!items.some(x=>x.id===e.id))items.push({...e,key:'legacy:'+e.id,date:recordDate(e),eventKind:k==='portalRequests'?'Schüleranfrage':k==='verfahrenLaeufe'?'Fachverfahren':'Termin',title:e.title||e.topic||e.workflowId||'Weiterer Eintrag',content:e.message||e.note||'',legacy:true,context:recordContext(state,e,sid)});
 for(const e of state.journal.filter(e=>!e.deletedAt&&e.participantIds.includes(sid)&&e.planned&&e.plannedDate))items.push({key:'appointment:'+e.id,id:e.id,date:e.plannedDate,eventKind:'Geplanter Termin',title:e.title,content:'Durchführung noch nicht bestätigt.',planned:true,sourceEntryKey:'entry:'+e.id,context:context(state,sid,e.plannedDate)});
 return items.sort((a,b)=>String(a.date||'9999').localeCompare(String(b.date||'9999'))||String(a.time||'').localeCompare(String(b.time||''))||String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
}
function journalStats(state,year='',className='all'){
 return state.journal.filter(e=>!e.generalInfo&&!e.planned&&e.type!=='zusätzliche Information'&&(!year||e.schoolYear===year)&& (className==='all'||e.participantIds.some(sid=>{const cl=recordContext(state,e,sid).className;return className.startsWith('jg:')?cl.match(/^\d+/)?.[0]===className.slice(3):cl===className}))).map(e=>({...e,duration:e.duration*Math.max(1,(e.facilitators||[]).length)}));
}
function restore(raw,sanitize){const state=sanitize(raw);for(const [i,e]of (state.journal||[]).entries()){const original=raw.journal?.[i];if(!original)continue;for(const key of ['content','childView','otherView','observation','assessment','agreement','goal','result','source','people'])if(typeof original[key]==='string')e[key]=original[key];if(original.individualNotes&&typeof original.individualNotes==='object')for(const key of Object.keys(e.individualNotes||{}))if(typeof original.individualNotes[key]==='string')e.individualNotes[key]=original.individualNotes[key];}return state;}
root.Dossier={restore,uid,iso,schoolYear,validYear,classValid,nextClass,ids,context,recordContext,stamp,normalize,lookup,preview,validate,apply,archive,localSuggestions,addEntry,editEntry,addTask,setTask,assess,currentAssessment,work,timeline,journalStats,quickContact,addPromise,completePromise,saveAuftrag,safetyCheck,ideasForEntry,markNoFurtherStep,safetyHint,SAFETY_NOTICE};
})(globalThis);
