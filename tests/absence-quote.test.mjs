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
