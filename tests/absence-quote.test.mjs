import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const html=fs.readFileSync(path.join(root,'src/index.html'),'utf8');

function coverageApi(){
 const start=html.indexOf('function expectedInstructionDatesForStudent(');
 const end=html.indexOf('function absenceScopeDenominator(',start);
 assert(start>=0&&end>start,'Stundenplan-Nennerfunktionen vorhanden');
 return new Function(html.slice(start,end)+';return attendanceScheduleDenominator;')();
}

test('Schulweiter Nenner berücksichtigt aktive Schüler:innen auch ohne Fehlzeiteintrag',()=>{
 const denominator=coverageApi();
 const roster=[{id:'a',active:true},{id:'b',active:true},{id:'archiv',active:false}];
 const schedules={a:[{date:'2026-09-01',minutes:45},{date:'2026-09-02',minutes:45}],b:[{date:'2026-09-01',minutes:45},{date:'2026-09-02',minutes:45}]};
 const expected={a:[{date:'2026-09-01'},{date:'2026-09-02'}],b:[{date:'2026-09-01'},{date:'2026-09-02'}]};
 const result=denominator(roster,s=>schedules[s.id],s=>expected[s.id]);
 assert.equal(result.scheduledMinutes,180);
 assert.equal(result.eligibleStudents,2);
 assert.equal(result.activeStudents,2);
 assert.equal(result.complete,true);
});

test('Schulquote bleibt gesperrt, wenn Unterrichtsminuten im Zeitraum fehlen',()=>{
 const denominator=coverageApi();
 const roster=[{id:'a',active:true},{id:'b',active:true}];
 const schedules={a:[{date:'2026-09-01',minutes:45},{date:'2026-09-02',minutes:45}],b:[{date:'2026-09-01',minutes:45}]};
 const expected={a:[{date:'2026-09-01'},{date:'2026-09-02'}],b:[{date:'2026-09-01'},{date:'2026-09-02'}]};
 const result=denominator(roster,s=>schedules[s.id],s=>expected[s.id]);
 assert.equal(result.scheduledMinutes,135);
 assert.equal(result.coveredStudentDays,3);
 assert.equal(result.missingStudentDays,1);
 assert.equal(result.complete,false);
});

test('Monatsübersicht berechnet die Quote ausdrücklich für den Schulbestand',()=>{
 assert.match(html,/function signalPeriodSummaries\(records=data\.schoolSignals\)[\s\S]*?absencePeriodSummary\(p,records,'school'\)/);
 assert.match(html,/Fehlzeitenminuten aller Schüler:innen ÷ geplante Unterrichtsminuten aller aktiven Schüler:innen × 100/);
});
