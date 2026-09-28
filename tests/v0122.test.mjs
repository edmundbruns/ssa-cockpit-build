import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');
const VERSION='0.12.2';

test('Versionsnummer ist überall 0.12.2',()=>{
 assert.equal(JSON.parse(read('package.json')).version,VERSION);
 assert.equal(JSON.parse(read('package-lock.json')).version,VERSION);
 assert.equal(JSON.parse(read('src-tauri/tauri.conf.json')).version,VERSION);
 assert.match(read('src-tauri/Cargo.toml'),/^version = "0\.12\.2"$/m);
 assert.match(read('src-tauri/Cargo.lock'),/name = "ssa-cockpit-ludgerusschule"\nversion = "0\.12\.2"/);
 const html=read('src/index.html');
 assert.match(html,/<title>SSA-Cockpit Ludgerusschule · Desktop 0\.12\.2<\/title>/);
 const shown=[...html.matchAll(/Desktopversion (\d+\.\d+\.\d+)/g)].map(m=>m[1]);
 assert(shown.length>0);assert(shown.every(v=>v===VERSION),'Anzeige in der Seitenleiste: '+shown.join(', '));
 assert.match(read('src/dossier-ui.js'),/Handbuch · Version 0\.12\.2/);
 assert.match(read('README.md'),/Version 0\.12\.2\./);
});

test('Tresorbefehle laufen asynchron und blockieren das Fenster nicht',()=>{
 const lib=read('src-tauri/src/lib.rs');
 assert.match(lib,/#\[tauri::command\]\s*async fn \$name/);
});

test('Keine Funktion ist in den Oberflächenskripten doppelt deklariert',()=>{
 const html=read('src/index.html');
 const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
 const sources={inline,'dossier-core.js':read('src/dossier-core.js'),'dossier-ui.js':read('src/dossier-ui.js'),'docx-export.js':read('src/docx-export.js'),'gespraechsbogen.js':read('src/gespraechsbogen.js'),'gespraechsbogen-ui.js':read('src/gespraechsbogen-ui.js')};
 const seen=new Map(),doubles=[];
 for(const [file,code] of Object.entries(sources))for(const m of code.matchAll(/(?:^|[;}\n])\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)){
  if(file==='dossier-core.js'||file==='docx-export.js'||file==='gespraechsbogen.js')continue; // gekapselte Module
  if(seen.has(m[1]))doubles.push(m[1]+' ('+seen.get(m[1])+' / '+file+')');else seen.set(m[1],file);}
 assert.deepEqual(doubles,[]);
});

test('Der Installer enthält nur Programmdateien aus src/ und keine Schul- oder Tresordaten',()=>{
 const conf=JSON.parse(read('src-tauri/tauri.conf.json'));
 assert.equal(conf.build.frontendDist,'../src');
 const erlaubt=['index.html','dossier-core.js','dossier-ui.js','docx-export.js','gespraechsbogen.js','gespraechsbogen-ui.js','gespraechsprotokoll-original.pdf'];
 const vorhanden=fs.readdirSync(path.join(root,'src'));
 assert.deepEqual(vorhanden.filter(f=>!erlaubt.includes(f)),[],'unerwartete Dateien würden in den Installer gepackt');
 const verboten=/\.(ssa-vault\.json|ssa-backup\.json|ssa-anfrage\.json|db|db-wal|db-shm|csv|xlsx|xls)$/i;
 const funde=[];
 const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){if(['node_modules','target','.git'].includes(e.name))continue;const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(verboten.test(e.name))funde.push(path.relative(root,p));}};
 walk(root);
 assert.deepEqual(funde,[],'Datendateien im Projekt');
});
