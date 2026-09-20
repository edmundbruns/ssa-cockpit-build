import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import '../src/gespraechsbogen.js';

test('vier unterschiedliche Bögen behalten die fünf Abschnitte der bereitgestellten Druckvorlage',()=>{
 const variants=globalThis.Gespraechsbogen.kinds;
 assert.deepEqual(Object.keys(variants),['Schülergespräch','Elterngespräch','Konfliktklärung','Helferrunde']);
 const html=Object.keys(variants).map(kind=>globalThis.Gespraechsbogen.build({kind,student:'Anna Beispiel',className:'6a',schoolYear:'2027/28',date:'20.09.2026',people:'Frau Beispiel',subject:'Rückkehr'}));
 assert.equal(new Set(html).size,4);
 for(const page of html){assert.equal((page.match(/class="protocol-section"/g)||[]).length,5);assert.match(page,/Nächster Schritt und Überprüfungstermin/);assert.match(page,/Anna Beispiel/);assert.match(page,/Klasse \/ Schuljahr/);}
 assert.match(html[1],/Sicht der Sorgeberechtigten/);
 assert.match(html[2],/unterschiedliche Wahrnehmungen/);
 assert.match(html[3],/Einwilligungen/);
 assert.equal(readFileSync(new URL('../src/gespraechsprotokoll-original.pdf',import.meta.url)).subarray(0,4).toString(),'%PDF');
});

test('nicht ausgewählte Falldetails bleiben vom Druckbogen fern und Eingaben werden maskiert',()=>{
 const base={kind:'Schülergespräch',student:'Kind <script>',incident:{date:'01.09.',kind:'Elterngespräch',content:'Vertraulich <b>Text</b>'}};
 const blank=globalThis.Gespraechsbogen.build(base);
 assert.doesNotMatch(blank,/Vertraulich/);
 assert.match(blank,/Kind &lt;script&gt;/);
 const shown=globalThis.Gespraechsbogen.build({...base,showFacts:true});
 assert.match(shown,/Vertraulich &lt;b&gt;Text&lt;\/b&gt;/);
 assert.throws(()=>globalThis.Gespraechsbogen.build({...base,kind:'Unbekannt'}));
});
