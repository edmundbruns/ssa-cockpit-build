/* Vier Druckvarianten des bereitgestellten DIN-A4-Gesprächsprotokolls. */
// 0.23: Ankreuzfelder mit denselben Kategorien wie im Formular – ändern sich die Kategorien, ändert sich der Bogen mit
function gespraechsbogenStatistik(datum){
 const k=m=>Dossier.katListe(m,datum||today()).map(x=>x.label);
 const art=Dossier.katListe('kontaktart',datum||today()).filter(x=>['beratungsgespraech','krisengespraech'].includes(x.id)).map(x=>x.label);
 return [['Art',art],['Thema',k('thema')],['Wer war dabei?',k('beteiligte')],['Dauer (Min.)',['15','30','45','60','90']],['Ergebnis',k('ergebnis')],['Zugangsweg (erster Kontakt im Schuljahr)',k('zugangsweg')]];
}
function dossierPrintTemplate(){
 const student=data.students.find(s=>s.id===selectedStudentId);
 if(!student)return;
 const events=Dossier.timeline(data,student.id,legacyStudentEvents(student.id)).filter(e=>e.date&&!e.task&&!e.generalInfo&&!e.key?.startsWith('appointment:')).slice(-40).reverse();
 dossierPopup('Gesprächsbogen vorbereiten',`<div class="dossier-grid">
 <label>Gesprächsart<select name="kind" class="field">${dossierOptions(Object.keys(Gespraechsbogen.kinds),'Schülergespräch')}</select></label>
 <label>Ausgangsereignis (optional)<select name="incident" class="field"><option value="">Ohne Ereignisbezug</option>${events.map(e=>`<option value="${DE(e.key)}">${DE(fmt(e.date)+' · '+(e.eventKind||'Eintrag')+' · '+String(e.title||'').slice(0,65))}</option>`).join('')}</select></label>
 ${dossierField('date','Datum',today(),'date')}${dossierField('people','Beteiligte (optional)')}${dossierChoicesField('subject','Anlass (optional)','',['Unterstützungsbedarf klären','Rückmeldung nach Vereinbarung','Konfliktklärung','Fehlzeiten / Rückkehr','Ziele und Maßnahmen überprüfen','Abstimmung der Beteiligten'])}
 <label class="full"><input type="checkbox" name="showFacts"> Inhalt des Ausgangsereignisses auf den Bogen drucken</label>
 <p class="full">Vier unterschiedliche Gesprächsbögen nach deiner DIN-A4-Vorlage. Nur bewusst ausgewählte Inhalte werden übernommen.</p>
 <a class="btn full" href="gespraechsprotokoll-original.pdf" target="_blank" rel="noopener">Deinen unveränderten Originalbogen (PDF) öffnen / drucken</a></div>`,async fd=>{
  const kind=fd.get('kind'),incident=events.find(e=>e.key===fd.get('incident'));
  const body=Gespraechsbogen.build({kind,student:student.first+' '+student.last,className:student.className,schoolYear:student.schoolYear,date:fmt(fd.get('date')),people:fd.get('people')||incident?.people||'',subject:fd.get('subject')||incident?.title||'',incident:incident&&{date:fmt(incident.date),kind:incident.eventKind,content:incident.content},showFacts:fd.has('showFacts'),author:Dossier.aktiveMitarbeitende(data),statistik:gespraechsbogenStatistik(fd.get('date'))});
  closeModal('dossierEditModal');printDocument(kind+' · Gesprächsbogen',body);
 });
 document.querySelector('#dossierEditModal [type=submit]').textContent='Bogen drucken';
}
