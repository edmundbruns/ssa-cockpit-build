import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const html=fs.readFileSync(path.join(root,'src/index.html'),'utf8');

function coverageApi(){
 const start=html.indexOf('function attendanceScheduleDenominator(');
 const end=html.indexOf('function absenceScopeDenominator(',start);
 assert(start>=0&&end>start,'Stundenplan-Nennerfunktionen vorhanden');
 return new Function(html.slice(start,end)+';return attendanceScheduleDenominator;')();
}

test('Schulweiter Nenner berücksichtigt aktive Schüler:innen auch ohne Fehlzeiteintrag',()=>{
 const denominator=coverageApi();
 const roster=[{id:'a',active:true},{id:'b',active:true},{id:'archiv',active:false}];
 const schedules={a:[{available:true,minutes:45},{available:true,minutes:45}],b:[{available:true,minutes:45},{available:true,minutes:45}]};
 const expected={a:[{date:'2026-09-01'},{date:'2026-09-02'}],b:[{date:'2026-09-01'},{date:'2026-09-02'}]};
 const result=denominator(roster,(s,day)=>schedules[s.id][day.date.endsWith('01')?0:1],s=>expected[s.id]);
 assert.equal(result.scheduledMinutes,180);
 assert.equal(result.eligibleStudents,2);
 assert.equal(result.activeStudents,2);
 assert.equal(result.complete,true);
});

test('Schulquote bleibt gesperrt, wenn Unterrichtsminuten im Zeitraum fehlen',()=>{
 const denominator=coverageApi();
 const roster=[{id:'a',active:true},{id:'b',active:true}];
 const schedules={a:[{available:true,minutes:45},{available:true,minutes:45}],b:[{available:true,minutes:45},{available:false,minutes:0}]};
 const expected={a:[{date:'2026-09-01'},{date:'2026-09-02'}],b:[{date:'2026-09-01'},{date:'2026-09-02'}]};
 const result=denominator(roster,(s,day)=>schedules[s.id][day.date.endsWith('01')?0:1],s=>expected[s.id]);
 assert.equal(result.scheduledMinutes,135);
 assert.equal(result.coveredStudentDays,3);
 assert.equal(result.missingStudentDays,1);
 assert.equal(result.complete,false);
});

test('Monatsübersicht berechnet die Quote ausdrücklich für den Schulbestand',()=>{
 assert.match(html,/function signalPeriodSummaries\(records=data\.schoolSignals\)[\s\S]*?absencePeriodSummary\(p,records,'school'\)/);
 assert.match(html,/Fehlzeitenminuten aller Schüler:innen ÷ geplante Unterrichtsminuten aller aktiven Schüler:innen × 100/);
});

test('Leere Wochenplanfelder bleiben ungedeckt und 0 ist als explizite Angabe abdeckend',()=>{
 const denominator=coverageApi(),roster=[{id:'a',active:true}],expected=[{date:'2026-09-01'},{date:'2026-09-02'}];
 const result=denominator(roster,(_,day)=>day.date.endsWith('01')?{available:true,minutes:0}:{available:false,minutes:0},()=>expected);
 assert.equal(result.scheduledMinutes,0);assert.equal(result.coveredStudentDays,1);assert.equal(result.missingStudentDays,1);assert.equal(result.complete,false);
});

test('Wochenplan-Eingabe ist mit Wochentag und Klasse in der Auswertungsseite vorhanden',()=>{
 assert.match(html,/id="classWeeklyPlans"/);assert.match(html,/function weeklyPlanForClassDate/);assert.match(html,/function saveClassWeeklyPlans/);assert.match(html,/classWeeklyPlans/);
});

test('Schulquote zeigt bei fehlender Abdeckung keinen Nullwert im Verlauf',()=>{
 assert.match(html,/const line=field=>[\s\S]*?s\[field\]===null/);
});

test('Teilzeitraum verwendet tagesgenaue WebUntis-Werte und blockiert alte Summendaten',()=>{
 const start=html.indexOf('function signalRecordSlice('),end=html.indexOf('function absenceRangeSummary(',start);
 assert(start>=0&&end>start,'Zeitraumfilter vorhanden');
 const slice=new Function('signalDateRange','fmt',html.slice(start,end)+';return signalRecordSlice;')((r)=>[r.startDate,r.endDate],(d)=>d);
 const record={studentId:'a',startDate:'2026-09-01',endDate:'2026-09-03',absences:3,absenceMinutes:135,absenceDays:3,dailyAbsences:[
  {date:'2026-09-01',absences:1,absenceMinutes:45,absenceDays:1},
  {date:'2026-09-02',absences:1,absenceMinutes:45,absenceDays:1},
  {date:'2026-09-03',absences:1,absenceMinutes:45,absenceDays:1}
 ]};
 const selected=slice(record,'2026-09-02','2026-09-02');
 assert.equal(selected.record.absenceMinutes,45);assert.equal(selected.record.absences,1);assert.equal(selected.record.absenceDays,1);assert.equal(selected.record.partialRange,true);
 const legacy=slice({...record,dailyAbsences:undefined},'2026-09-02','2026-09-02');
 assert.equal(legacy.record,null);assert.equal(legacy.incomplete,true);
});

test('WebUntis-Gesamtdatei speichert gezählte Fehlzeiten auch tagesgenau',()=>{
 const start=html.indexOf('function aggregateWebUntisRows('),end=html.indexOf('function detectDelimitedSeparator(',start);
 assert(start>=0&&end>start,'WebUntis-Aggregator vorhanden');
 const headerKey=v=>String(v||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'SS').replace(/[^A-Z0-9]/g,'');
 const aggregate=new Function('headerKey','parseSignalDate','matchSignalStudent','applyWebUntisClass','numberGerman','id','fmt','clean',html.slice(start,end)+';return aggregateWebUntisRows;')(
  headerKey,
  v=>{const m=String(v||'').match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})$/);return m?`${m[3].length===2?'20'+m[3]:m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`:''},
  ()=>({id:'s1',className:'5a'}),()=>false,v=>Number(String(v||'').replace(',','.'))||0,()=> 'sig1',v=>v,v=>String(v||'')
 );
 const headers=['Schüler*innen','Externe Id','Klasse','Datum','Fehlstd.','Fehlmin.','Lehrkraft','Fach','Abwesenheitsgrund','ENr','Abwesenheit zählt','Status','Fehltage'];
 const rows=[headers,
  ['Kind Beispiel','id1','5a','01.09.2026','2','90','','','Krank','event1','true','entsch.','1'],
  ['Kind Beispiel','id1','5a','01.09.2026','1','45','LK','Mathe','Krank','event1','true','entsch.','0'],
  ['Kind Beispiel','id1','5a','01.09.2026','1','45','LK','Deutsch','Krank','event1','true','entsch.','0']
 ];
 const result=aggregate(rows,headers.map(headerKey),{name:'test.csv'});
 assert.equal(result.records[0].absences,2);assert.equal(result.records[0].absenceMinutes,90);assert.equal(result.records[0].dailyAbsences.length,1);assert.equal(result.records[0].dailyAbsences[0].absenceMinutes,90);
});

test('E-Mail-Auswertung nimmt den gewählten Datumszeitraum als Filter',()=>{
 assert.match(html,/function classEmailErzeugen\(\)[\s\S]*signalRecordSlice\(r,von,bis\)/);
 assert.match(html,/function classEmailMailto\(\)[\s\S]*classEmailRangeComplete/);
 assert.match(html,/id="absenceRangeStart"[\s\S]*id="absenceRangeEnd"/);
});

test('Klassenvergleich listet alle Klassen und schließt auch Klassen ohne Fehlzeiteintrag ein',()=>{
 const start=html.indexOf('function absenceClassComparison('),end=html.indexOf('function signalAmpelPeriodSummaries(',start);
 assert(start>=0&&end>start,'Klassenvergleich vorhanden');
 const block=html.slice(start,end);
 assert.match(block,/Object\.keys\(data\.settings\.classWeeklyPlans\|\|\{\}\)/);
 assert.match(block,/data\.students\.filter\(s=>s\.active!==false/);
 assert.match(block,/dateRange:currentRange/);
 assert.doesNotMatch(block,/\.slice\(0,8\)/);
});

test('Nach Zeitraum-Auswertung wird nur der gewählte Zeitraum angezeigt',()=>{
 assert.match(html,/absenceRangeSelectionActive=true/);
 assert.match(html,/1 ausgewählter Zeitraum/);
 assert.match(html,/Alle Kennzahlen und Klassen beziehen sich ausschließlich auf diesen ausgewählten Zeitraum/);
 assert.match(html,/function showAbsenceImportHistory\(\)/);
 assert.match(html,/function absenceRangeClassComparison\(records,start,end\)/);
});
