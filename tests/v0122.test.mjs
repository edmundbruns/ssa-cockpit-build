import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');
const VERSION='0.22.0';

test('Versionsnummer ist überall gleich',()=>{
 assert.equal(JSON.parse(read('package.json')).version,VERSION);
 assert.equal(JSON.parse(read('package-lock.json')).version,VERSION);
 assert.equal(JSON.parse(read('src-tauri/tauri.conf.json')).version,VERSION);
 assert.match(read('src-tauri/Cargo.toml'),new RegExp('^version = "'+VERSION.replace(/\./g,'\\.')+'"$','m'));
 assert.match(read('src-tauri/Cargo.lock'),new RegExp('name = "ssa-cockpit-ludgerusschule"\\nversion = "'+VERSION.replace(/\./g,'\\.')+'"'));
 const html=read('src/index.html');
 assert(html.includes('<title>SSA-Cockpit Ludgerusschule · Desktop '+VERSION+'</title>'),'Fenstertitel');
 const shown=[...html.matchAll(/Desktopversion (\d+\.\d+\.\d+)/g)].map(m=>m[1]);
 assert(shown.length>0);assert(shown.every(v=>v===VERSION),'Anzeige in der Seitenleiste: '+shown.join(', '));
 assert(read('src/dossier-ui.js').includes('Handbuch · Version '+VERSION),'Handbuch-Dialog');
 assert(read('README.md').includes('Version '+VERSION+'.'),'README');
});

test('Tresorbefehle laufen asynchron und blockieren das Fenster nicht',()=>{
 const lib=read('src-tauri/src/lib.rs');
 assert.match(lib,/#\[tauri::command\]\s*async fn \$name/);
});

test('Keine Funktion ist in den Oberflächenskripten doppelt deklariert',()=>{
 const html=read('src/index.html');
 const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
 const sources={inline,'dossier-core.js':read('src/dossier-core.js'),'dossier-ui.js':read('src/dossier-ui.js'),'docx-export.js':read('src/docx-export.js'),'gespraechsbogen.js':read('src/gespraechsbogen.js'),'gespraechsbogen-ui.js':read('src/gespraechsbogen-ui.js'),'erweiterungen.js':read('src/erweiterungen.js')};
 const seen=new Map(),doubles=[];
 for(const [file,code] of Object.entries(sources))for(const m of code.matchAll(/(?:^|[;}\n])\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)){
  if(file==='dossier-core.js'||file==='docx-export.js'||file==='gespraechsbogen.js')continue; // gekapselte Module
  if(seen.has(m[1]))doubles.push(m[1]+' ('+seen.get(m[1])+' / '+file+')');else seen.set(m[1],file);}
 assert.deepEqual(doubles,[]);
});

test('Der Installer enthält nur Programmdateien aus src/ und keine Schul- oder Tresordaten',()=>{
 const conf=JSON.parse(read('src-tauri/tauri.conf.json'));
 assert.equal(conf.build.frontendDist,'../src');
 const erlaubt=['index.html','dossier-core.js','dossier-ui.js','erweiterungen.js','docx-export.js','gespraechsbogen.js','gespraechsbogen-ui.js','gespraechsprotokoll-original.pdf'];
 const vorhanden=fs.readdirSync(path.join(root,'src'));
 assert.deepEqual(vorhanden.filter(f=>!erlaubt.includes(f)),[],'unerwartete Dateien würden in den Installer gepackt');
 const verboten=/\.(ssa-vault\.json|ssa-backup\.json|ssa-anfrage\.json|db|db-wal|db-shm|csv|xlsx|xls)$/i;
 const funde=[];
 const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){if(['node_modules','target','.git'].includes(e.name))continue;const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(verboten.test(e.name))funde.push(path.relative(root,p));}};
 walk(root);
 assert.deepEqual(funde,[],'Datendateien im Projekt');
});

test('0.13: Schutzhinweis nur bei echtem Stichwort, Verneinungen werden erkannt',async()=>{
 const g={};const code=read('src/dossier-core.js');new Function('globalThis',code.replace(/\}\)\(globalThis\);\s*$/,'})(globalThis);'))(g);
 const D=g.Dossier;
 assert.equal(D.safetyHint('Anna hat keine Angst mehr vor der Klassenarbeit.'),null);
 assert.equal(D.safetyHint('Mutter sagt, das Kindeswohl sei nicht gefährdet.'),null);
 assert.ok(D.safetyHint('Anna sagt, sie wolle nicht mehr leben.'));
 assert.ok(D.safetyHint('Er sagt nicht, dass er sich umbringen will.'),'Selbstgefährdung wird trotz Verneinung angezeigt');
 assert.ok(D.safetyHint('Kind hat Angst, nach Hause zu gehen.'));
});

test('0.14: Daten der Vorversion laden unverändert, neue Felder haben Standardwerte',()=>{
 const g={};new Function('globalThis',read('src/dossier-core.js'))(g);const D=g.Dossier;
 const alt={students:[{id:'a',first:'Anna',last:'Beispiel',className:'5a',active:true,enrollments:[]}],journal:[{id:'e1',date:'2026-09-01',type:'Schülergespräch / Einzelberatung',title:'Gespräch',content:'Inhalt',participantIds:['a']}],tasks:[{id:'p1',kind:'zusage',title:'Alte Zusage',promisedTo:'Kind',participantIds:['a'],status:'erledigt',done:true,completedAt:'2026-09-02'}],cases:[],settings:{currentSchoolYear:'2026/27'}};
 const vorher=JSON.stringify(alt.journal[0]);const s=D.normalize(structuredClone(alt));
 assert.deepEqual(s.schnellnotizen,[]);assert.deepEqual(s.auftraege,[]);
 assert.equal(s.journal.length,1,'erledigte alte Zusagen erzeugen beim Laden keine neuen Einträge');
 const e=s.journal[0];for(const k of ['id','date','type','title','content'])assert.equal(e[k],JSON.parse(vorher)[k]);
 assert.ok(D.timeline(s,'a',[]).some(x=>x.key==='entry:e1'));
});
