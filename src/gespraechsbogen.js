/* Druckvorlage nach dem vom Nutzer bereitgestellten DIN-A4-Gesprächsprotokoll.
   Jeder Gesprächsart bleiben dieselben fünf handschriftlichen Bereiche erhalten. */
(function(root){
 'use strict';
 const kinds={
  'Schülergespräch':['Was wurde besprochen?','Sicht des Kindes','Fachliche Einschätzung (SSA)','Vereinbarungen und Zuständigkeiten','Nächster Schritt und Überprüfungstermin'],
  'Elterngespräch':['Was wurde besprochen?','Sicht der Eltern und des Kindes (soweit bekannt)','Fachliche Einschätzung (SSA)','Vereinbarungen mit den Sorgeberechtigten und Zuständigkeiten','Nächster Schritt und Überprüfungstermin'],
  'Konfliktklärung':['Was ist passiert?','Sicht der beteiligten Kinder (getrennt festhalten)','Fachliche Einschätzung (SSA)','Gemeinsame Vereinbarungen und Zuständigkeiten','Nächster Schritt und Überprüfungstermin'],
  'Helferrunde':['Was wurde besprochen? (vorhandene Hilfen)','Sicht des Kindes und gewünschte Unterstützung','Fachliche Einschätzung (SSA)','Vereinbarungen, Zuständigkeiten und Einwilligungen','Nächster Schritt und Überprüfungstermin']
 };
 // Wohin der Abschnitt im Cockpit gehört (seit 0.23 passend zum Formular „Gespräch eintragen“)
 const ziele=['Haupttext','Mehr erfassen → Sicht des Kindes','Mehr erfassen → Fachliche Einschätzung','Mehr erfassen → Vereinbarungen','Zusage merken / Gespräch planen'];
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function build({kind,student,className,schoolYear,date,time,author,people,subject,incident,showFacts=false,statistik=[]}){
  if(!Object.hasOwn(kinds,kind))throw Error('Unbekannte Gesprächsart');
  const lineCount=statistik.length?[4,3,3,3,2]:[5,5,5,5,3];
  const field=(label,value)=>`<div class="protocol-field"><strong>${esc(label)}</strong><div>${esc(value||'\u00a0')}</div></div>`;
  const sections=kinds[kind].map((title,index)=>`<section class="protocol-section"><h2>${index+1}. ${esc(title)} <small>${esc(ziele[index])}</small></h2>${Array.from({length:lineCount[index]},()=>'<div class="protocol-line"></div>').join('')}</section>`).join('');
  const box=statistik.length?`<section class="protocol-stat"><h2>Für die Statistik (ankreuzen)</h2>${statistik.map(([titel,optionen])=>`<div class="protocol-stat-row"><strong>${esc(titel)}</strong> ${optionen.map(o=>`<span>☐ ${esc(o)}</span>`).join(' ')}</div>`).join('')}</section>`:'';
  const facts=incident?`<p class="protocol-incident">Ausgangsereignis: ${esc(incident.date||'')} · ${esc(incident.kind||'Eintrag')}${showFacts&&incident.content?`<br>${esc(incident.content)}`:''}</p>`:'';
  return `<style>
  @page{size:A4;margin:13mm 18mm}body{font-family:Arial,sans-serif;color:#123451;font-size:10pt}
  .protocol-page{max-width:174mm;margin:auto}.protocol-heading{text-align:center;font-size:10pt;margin:0 0 3mm}.protocol-heading strong{color:#0060a6}.protocol-kind{text-align:center;color:#31526b;font-size:9pt;margin-bottom:3mm}
  .protocol-grid{display:grid;grid-template-columns:2fr 1.2fr .9fr;gap:2mm;margin-bottom:2.5mm}.protocol-grid.details{grid-template-columns:2fr 1fr}
  .protocol-field{background:#f5f9fe;padding:1.5mm 2mm;min-height:9mm}.protocol-field strong{display:block;font-size:7pt;color:#526778;text-transform:uppercase}.protocol-field div{border-bottom:1px solid #aac9e8;min-height:5mm;padding-top:1mm;overflow-wrap:anywhere}
  .protocol-section{margin:3mm 0 0;break-inside:avoid}.protocol-section h2{font-size:10pt;border-left:3px solid #0872b5;padding:1mm 2mm;margin:0 0 1mm}.protocol-line{height:5.1mm;border-bottom:1px solid #aac9e8}.protocol-incident{font-size:8pt;background:#f5f9fe;padding:1.5mm 2mm;margin:2mm 0;overflow-wrap:anywhere}
  .protocol-section h2 small{font-weight:400;color:#7a8c99;font-size:7pt;margin-left:2mm}.protocol-stat{margin-top:3mm;border:1px solid #aac9e8;padding:2mm 3mm;break-inside:avoid}.protocol-stat h2{font-size:9pt;margin:0 0 1mm}.protocol-stat-row{font-size:7.5pt;margin:.6mm 0;line-height:1.4}.protocol-stat-row strong{display:inline-block;min-width:34mm;color:#31526b}.protocol-stat-row span{margin-right:3mm;white-space:nowrap}
  @media print{body{margin:0;padding:0}.protocol-page{max-width:none}}
  </style><main class="protocol-page"><div class="protocol-heading"><strong>SCHULSOZIALARBEIT Gesprächsprotokoll</strong> SSA-Cockpit Ludgerusschule · Dokumentation &amp; Einzelfallhilfe</div><div class="protocol-kind">${esc(kind)}</div><div class="protocol-grid">${field('Schüler / Schülerin',student)}${field('Klasse / Schuljahr',[className,schoolYear].filter(Boolean).join(' · '))}${field('Datum',[date,time].filter(Boolean).join(' · '))}</div><div class="protocol-grid details">${field('Beteiligte Personen',people)}${field('Anlass des Gesprächs',subject)}</div><div class="protocol-grid details">${field('Dokumentiert von',author)}${field('Überthema (optional)','')}</div>${facts}${sections}${box}</main>`;
 }
 root.Gespraechsbogen={build,kinds};
})(typeof window!=='undefined'?window:globalThis);
