import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/docx-export.js';

test('Word-Export erzeugt eine ZIP-basierte DOCX-Datei mit escaped Fachtext',()=>{
 const bytes=globalThis.DossierDocx.build('Verlaufsbericht',[{text:'Gespräch mit Kind',bold:true},'A & B besprachen <Ziel>']);
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),read=new TextDecoder();
 assert.equal(view.getUint32(0,true),0x04034b50);
 const content=[];for(let at=0;at<bytes.length;){if(view.getUint32(at,true)!==0x04034b50)break;const nameLength=view.getUint16(at+26,true),size=view.getUint32(at+18,true),name=read.decode(bytes.subarray(at+30,at+30+nameLength));content.push([name,read.decode(bytes.subarray(at+30+nameLength,at+30+nameLength+size))]);at+=30+nameLength+size;}
 assert.deepEqual(content.map(([name])=>name),['[Content_Types].xml','_rels/.rels','word/document.xml']);
 const doc=content[2][1];assert.match(doc,/A &amp; B besprachen &lt;Ziel&gt;/);assert.match(doc,/Gespräch mit Kind/);assert.doesNotMatch(doc,/<Ziel>/);
});
