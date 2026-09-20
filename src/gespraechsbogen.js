/* Druckvorlage nach dem vom Nutzer bereitgestellten DIN-A4-Gesprächsprotokoll.
   Jeder Gesprächsart bleiben dieselben fünf handschriftlichen Bereiche erhalten. */
(function(root){
 'use strict';
 const kinds={
  'Schülergespräch':['Sicht des Kindes','Angaben anderer Beteiligter (Lehrkräfte, Eltern, Dritte)','Beobachtung und fachliche Einordnung (SSA)','Vereinbarungen und Zuständigkeiten','Nächster Schritt und Überprüfungstermin'],
  'Elterngespräch':['Sicht des Kindes (soweit bekannt)','Sicht der Sorgeberechtigten und anderer Beteiligter','Beobachtung und fachliche Einordnung (SSA)','Vereinbarungen mit Sorgeberechtigten und Zuständigkeiten','Nächster Schritt und Überprüfungstermin'],
  'Konfliktklärung':['Sicht der beteiligten Kinder (getrennt festhalten)','Angaben anderer Beteiligter / unterschiedliche Wahrnehmungen','Beobachtung und fachliche Einordnung (SSA)','Gemeinsame Vereinbarungen und Zuständigkeiten','Nächster Schritt und Überprüfungstermin'],
  'Helferrunde':['Sicht des Kindes und gewünschte Unterstützung','Angaben der Beteiligten und vorhandene Hilfen','Beobachtung und fachliche Einordnung (SSA)','Vereinbarungen, Zuständigkeiten und Einwilligungen','Nächster Schritt und Überprüfungstermin']
 };
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function build({kind,student,className,schoolYear,date,people,subject,incident,showFacts=false}){
  if(!Object.hasOwn(kinds,kind))throw Error('Unbekannte Gesprächsart');
  const lineCount=[5,5,5,5,3];
  const field=(label,value)=>`<div class="protocol-field"><strong>${esc(label)}</strong><div>${esc(value||'\u00a0')}</div></div>`;
  const sections=kinds[kind].map((title,index)=>`<section class="protocol-section"><h2>${index+1}. ${esc(title)}</h2>${Array.from({length:lineCount[index]},()=>'<div class="protocol-line"></div>').join('')}</section>`).join('');
  const facts=incident?`<p class="protocol-incident">Ausgangsereignis: ${esc(incident.date||'')} · ${esc(incident.kind||'Eintrag')}${showFacts&&incident.content?`<br>${esc(incident.content)}`:''}</p>`:'';
  return `<style>
  @page{size:A4;margin:13mm 18mm}body{font-family:Arial,sans-serif;color:#123451;font-size:10pt}
  .protocol-page{max-width:174mm;margin:auto}.protocol-heading{text-align:center;font-size:10pt;margin:2mm 0 5mm}.protocol-heading strong{color:#0060a6}.protocol-kind{text-align:center;color:#31526b;font-size:9pt;margin-bottom:5mm}
  .protocol-grid{display:grid;grid-template-columns:2fr 1.2fr .9fr;gap:2mm;margin-bottom:5mm}.protocol-grid.details{grid-template-columns:2fr 1fr}
  .protocol-field{background:#f5f9fe;padding:2mm;min-height:11mm}.protocol-field strong{display:block;font-size:7pt;color:#526778;text-transform:uppercase}.protocol-field div{border-bottom:1px solid #aac9e8;min-height:5mm;padding-top:1mm;overflow-wrap:anywhere}
  .protocol-section{margin:4mm 0 0;break-inside:avoid}.protocol-section h2{font-size:10pt;border-left:3px solid #0872b5;padding:1mm 2mm;margin:0 0 1mm}.protocol-line{height:5.1mm;border-bottom:1px solid #aac9e8}.protocol-incident{font-size:8pt;background:#f5f9fe;padding:2mm;overflow-wrap:anywhere}
  @media print{body{margin:0;padding:0}.protocol-page{max-width:none}}
  </style><main class="protocol-page"><div class="protocol-heading"><strong>SCHULSOZIALARBEIT Gesprächsprotokoll</strong> SSA-Cockpit Ludgerusschule · Dokumentation &amp; Einzelfallhilfe</div><div class="protocol-kind">${esc(kind)}</div><div class="protocol-grid">${field('Schüler / Schülerin',student)}${field('Klasse / Schuljahr',[className,schoolYear].filter(Boolean).join(' · '))}${field('Datum',date)}</div><div class="protocol-grid details">${field('Beteiligte Personen',people)}${field('Anlass des Gesprächs',subject)}</div>${facts}${sections}</main>`;
 }
 root.Gespraechsbogen={build,kinds};
})(typeof window!=='undefined'?window:globalThis);
