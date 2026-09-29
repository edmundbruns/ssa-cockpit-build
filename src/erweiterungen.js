'use strict';
/* SSA-Cockpit 0.14.0 – Schnellnotiz, Gespräch vorbereiten, Zusagen aus der Chronik, Kontexthilfe.
   Nutzt die bestehende Speicherlogik (save()) und die Datenstrukturen aus dossier-core.js.
   Keine Cloud, keine externen Bibliotheken, keine KI. */

/* ================================================================
   1. KONTEXTHILFE – alle Hilfetexte zentral an dieser einen Stelle.
   Aufbau immer: was = Was ist das?  warum = Warum eintragen?  beispiel = Beispiel.
   ================================================================ */
const HILFE_TEXTE={
 // Bereiche (Seiten)
 dashboard:{titel:'Heute',was:'Die Startseite zeigt, was heute ansteht: Schutzfragen, Überfälliges, heute Fälliges und fällige Zusagen.',warum:'So siehst du morgens in einer Minute, worum du dich zuerst kümmern musst.',beispiel:'„Rückruf Mutter“ steht unter Zusagen, weil er heute fällig ist.'},
 requests:{titel:'Schüler-Anfragen',was:'Hier landen Anfragen, die Kinder selbst gestellt haben.',warum:'Anfragen gehen nicht verloren und werden erst nach deiner Prüfung einer Akte zugeordnet.',beispiel:'Ein Kind bittet über das Formular um ein Gespräch.'},
 cases:{titel:'Fallarbeit',was:'Die Liste aller Kinder, die du gerade begleitest, mit Anlass, Stand und letztem Kontakt.',warum:'Du erkennst schnell, wen du länger nicht gesehen hast.',beispiel:'Filter „Seit 3 Wochen kein Kontakt“ zeigt, bei wem du nachhaken könntest.'},
 kanban:{titel:'Fallarbeit als Board',was:'Dieselben Fälle wie in der Liste, sortiert nach Arbeitsstand.',warum:'Du siehst auf einen Blick, was in Klärung, in Begleitung oder abgeschlossen ist.',beispiel:'Karte von „Klärungsphase“ nach „Aktive Begleitung“ ziehen.'},
 students:{titel:'Schüler:innen',was:'Alle Kinder aus der Klassenliste. Ein Klick öffnet die Akte mit der Chronik.',warum:'Von hier aus erreichst du jede Akte, auch ohne laufenden Fall.',beispiel:'Namen eintippen und die Akte öffnen.'},
 classes:{titel:'Klassen',was:'Maßnahmen und Projekte für ganze Klassen.',warum:'Arbeit mit Gruppen wird sichtbar, ohne einzelne Kinder zu bewerten.',beispiel:'Sozialtraining in der 5b eintragen.'},
 trainingroom:{titel:'Trainingsraum',was:'Besuche im sozialen Trainingsraum mit Anlass und Rückkehrvereinbarung.',warum:'Häufungen fallen früh auf und du kannst rechtzeitig mit der Klassenleitung sprechen.',beispiel:'Dritter Besuch in vier Wochen: Rücksprache vorschlagen.'},
 signals:{titel:'Zusammenarbeit mit der Schule',was:'Frühindikatoren aus WebUntis (Fehlzeiten) und Hinweise für die Klassenleitungen.',warum:'Du bemerkst Fehlzeiten früh. Die Ampel ist nur ein Hinweis, keine Diagnose.',beispiel:'Ein Kind überschreitet die eingestellte Zahl unentschuldigter Stunden.'},
 workflows:{titel:'Fachverfahren',was:'Schritt-für-Schritt-Abläufe für wiederkehrende Situationen, z. B. Schulvermeidung oder Kinderschutz.',warum:'Du vergisst keinen wichtigen Schritt. Das Schutzkonzept der Schule ersetzen sie nicht.',beispiel:'Verfahren „Schulabsentismus“ starten und die Schritte abhaken.'},
 teachers:{titel:'Personen und Zuständigkeiten',was:'Alle Menschen, mit denen du zusammenarbeitest, innerhalb und außerhalb der Schule.',warum:'Zuständigkeiten und Ansprechpersonen sind schnell zur Hand.',beispiel:'Klassenleitung der 7a mit E-Mail-Adresse eintragen.'},
 projects:{titel:'Projekte',was:'Angebote für Gruppen und Klassen mit Ziel, Umfang und Auswertung.',warum:'Präventive Arbeit wird geplant und für den Jahresbericht festgehalten.',beispiel:'„Streitschlichter-Ausbildung“ mit acht Terminen.'},
 network:{titel:'Gruppen und Netzwerk',was:'Gruppengespräche und das Verzeichnis deiner Netzwerkpartner.',warum:'Ein Gespräch mit mehreren Kindern erscheint in jeder betroffenen Akte, und Kontakte nach außen sind griffbereit.',beispiel:'Konfliktklärung zwischen drei Kindern eintragen.'},
 tasks:{titel:'Aufgaben und Zusagen',was:'Oben alle Zusagen, darunter alle Aufgaben mit Termin und Zuständigkeit.',warum:'Nichts, was du oder andere versprochen haben, geht unter.',beispiel:'Zusage „Klassenleitung ansprechen“ auf „erledigt“ setzen.'},
 statistics:{titel:'Auswertung',was:'Anonyme Zahlen zu deiner Arbeit für Statistik und Jahresbericht.',warum:'Du kannst deine Arbeit belegen, ohne Namen weiterzugeben.',beispiel:'Zeitaufwand nach Einzelfall, Gruppe und Klasse.'},
 settings:{titel:'Daten und Einstellungen',was:'Datentresor, Sicherungen, Kennwort, Schwellenwerte und Diktat.',warum:'Hier sorgst du dafür, dass deine Daten sicher und wiederherstellbar sind.',beispiel:'Vor einem Update „Jetzt sichern“ klicken.'},
 // Felder und Funktionen
 schnellnotiz:{titel:'Schnellnotiz',was:'Ein Feld für kurze Notizen zwischendurch. Mit @ ordnest du die Notiz einem oder mehreren Kindern zu.',warum:'Du hältst Beobachtungen sofort fest, ohne ein Formular auszufüllen.',beispiel:'„@Anna Beispiel wirkte in der Pause bedrückt.“ – Die Notiz erscheint in Annas Chronik.'},
 notizenOffen:{titel:'Noch nicht zugeordnet',was:'Schnellnotizen ohne @-Erwähnung werden hier gesammelt.',warum:'Du kannst sie später in Ruhe dem richtigen Kind zuordnen.',beispiel:'„Zuordnen“ klicken und das Kind auswählen.'},
 auftrag:{titel:'Auftragsklärung',was:'Wer möchte, dass du tätig wirst, was möchte das Kind selbst, und was habt ihr vereinbart.',warum:'Ein klarer Auftrag schützt vor Missverständnissen und zeigt, wofür deine Begleitung da ist.',beispiel:'Klassenleitung wünscht Unterstützung, das Kind möchte „dass das Auslachen aufhört“.'},
 fachverfahren:{titel:'Fachverfahren',was:'Ein vorbereiteter Ablauf für ein Thema, z. B. Mobbing oder Schulvermeidung.',warum:'Die Zuordnung hilft, später den passenden nächsten Schritt zu finden. Sie ist freiwillig.',beispiel:'Gespräch über Ausgrenzung dem Verfahren „Mobbing“ zuordnen.'},
 massnahmen:{titel:'Maßnahmen',was:'Was konkret vereinbart oder getan wird, zum Beispiel ein Sozialtraining oder ein Elterngespräch.',warum:'Maßnahmen zeigen, was aus einem Gespräch folgt, und lassen sich später überprüfen.',beispiel:'„Wöchentliches Kurzgespräch bis zu den Ferien“.'},
 zusagen:{titel:'Zusagen',was:'Etwas, das jemand versprochen hat – du selbst, das Kind, Eltern oder eine Lehrkraft.',warum:'Eingehaltene Zusagen schaffen Vertrauen. Offene Zusagen bleiben sichtbar, bis sie erledigt sind.',beispiel:'„Ich spreche bis Freitag mit der Klassenleitung.“'},
 zusageWer:{titel:'Wer hat zugesagt?',was:'Die Person, die etwas erledigen will.',warum:'So ist klar, wer handeln muss.',beispiel:'„Eltern“: Die Mutter meldet sich nach dem Arzttermin.'},
 vorbereitung:{titel:'Gespräch vorbereiten',was:'Eine Übersicht mit Auftrag, letzten Einträgen, offenen Zusagen und laufenden Maßnahmen.',warum:'Du gehst gut vorbereitet ins Gespräch. Jeder Punkt führt zum Originaleintrag.',beispiel:'Vor dem Folgegespräch prüfen, ob die letzte Zusage eingehalten wurde.'},
 kurzkontakt:{titel:'Kurzkontakt',was:'Ein kurzer Kontakt ohne ausführliche Dokumentation, z. B. auf dem Flur.',warum:'Auch kurze Kontakte zählen und zeigen, wie oft du ein Kind siehst.',beispiel:'Fünf Minuten „kurz reden“ in der Pause.'},
 gruppengespraech:{titel:'Gruppengespräch',was:'Ein Gespräch mit mehreren Kindern, einmal eingetragen.',warum:'Der Eintrag erscheint in der Chronik jedes beteiligten Kindes, ohne Kopien.',beispiel:'Streitschlichtung zwischen Bert und Cem.'},
 fruehindikatoren:{titel:'Frühindikatoren',was:'Hinweise, wenn Fehlzeiten einen eingestellten Schwellenwert überschreiten.',warum:'Du kannst früh nachfragen, bevor sich Fehlzeiten verfestigen.',beispiel:'Mehr als zehn unentschuldigte Stunden in einem Monat.'},
 ampel:{titel:'Fachliche Ampel',was:'Deine eigene Einschätzung, wie dringend ein Fall gerade ist, mit Begründung und Datum.',warum:'Du und deine Vertretung sehen schnell, wo Handlungsbedarf besteht.',beispiel:'Gelb: „Situation angespannt, Rückmeldung der Eltern steht aus.“'},
 kontaktart:{titel:'Art des Kontakts',was:'Ob es ein Beratungsgespräch oder ein Krisengespräch war. Kurzkontakt, Gruppe und Klasse erkennt das Programm selbst.',warum:'So lässt sich später zeigen, wie viel Krisenarbeit anfällt.',beispiel:'Ein Kind kommt aufgelöst nach einem Streit zu Hause: Krisengespräch.'},
 zugangsweg:{titel:'Zugangsweg',was:'Wie der Kontakt zu diesem Kind in diesem Schuljahr zustande kam. Du wirst nur einmal pro Kind und Schuljahr gefragt.',warum:'Die Statistik zeigt, ob Kinder von selbst kommen oder vermittelt werden.',beispiel:'Die Klassenleitung hat das Kind geschickt: „Lehrkraft“.'},
 beteiligte:{titel:'Beteiligte',was:'Wer beim Gespräch dabei war. „Schüler:in“ ist vorausgewählt.',warum:'So wird sichtbar, wie oft du mit Eltern, Lehrkräften oder Fachstellen zusammenarbeitest.',beispiel:'Gespräch mit Kind und Mutter: „Schüler:in“ und „Eltern“.'},
 thema:{titel:'Thema',was:'Worum es ging – mehrere Themen sind möglich.',warum:'Die Statistik zeigt, welche Themen an der Schule häufig sind. Mindestens ein Thema ist hilfreich, aber keine Pflicht.',beispiel:'Streit in der Pause: „Konflikt / Mobbing“.'},
 dauer:{titel:'Dauer',was:'Wie lange der Kontakt ungefähr gedauert hat.',warum:'Aus der Dauer entstehen die Arbeitsstunden im Jahresbericht. Bitte ehrlich schätzen.',beispiel:'Ein Gespräch von 35 Minuten: „30 Min.“ oder „45 Min.“ wählen.'},
 ergebnis:{titel:'Ergebnis',was:'Wie es nach dem Gespräch weitergeht. Freiwillig.',warum:'So zeigt die Statistik, wie viele Begleitungen abgeschlossen oder weitervermittelt werden.',beispiel:'Das Kind geht zur Beratungsstelle: „Weitervermittelt“.'},
 taetigkeit:{titel:'Tätigkeit ohne Fall',was:'Arbeit, die keinem einzelnen Kind zugeordnet ist, zum Beispiel Konferenzen oder Pausenpräsenz.',warum:'Diese Zeit gehört zu deiner Arbeit und fehlt sonst in der Arbeitszeitverteilung.',beispiel:'Zwei Stunden Präventionsprojekt in der 6b: „Klassenprojekt / Prävention“, 90 Min., Klasse 6b.'},
 teilnehmende:{titel:'Teilnehmende',was:'Wie viele Menschen erreicht wurden.',warum:'Daraus entsteht die Zahl „erreichte Personen“.',beispiel:'Projekt mit der ganzen 6b: 24.'},
 schutzfrage:{titel:'Schutzfrage',was:'Eine kurze Checkliste, wenn du dir Sorgen um die Sicherheit eines Kindes machst.',warum:'Sie hilft, nichts Wichtiges zu vergessen. Maßgeblich bleiben deine Einschätzung und das Schutzkonzept.',beispiel:'Schulleitung informiert, nächster Schritt vereinbart.'}
};
function hilfeKnopf(key,beschriftung='?'){return HILFE_TEXTE[key]?`<button type="button" class="hilfe-q" aria-expanded="false" aria-label="Hilfe: ${DE(HILFE_TEXTE[key].titel)}" title="Was ist das?" onclick="hilfeUmschalten(this,'${DE(key)}')">${DE(beschriftung)}</button>`:'';}
function hilfeHtml(key){const h=HILFE_TEXTE[key];if(!h)return '';return `<div class="hilfe-inline" data-hilfe="${DE(key)}" role="note"><p><strong>Was ist das?</strong> ${DE(h.was)}</p><p><strong>Warum eintragen?</strong> ${DE(h.warum)}</p><p><strong>Beispiel:</strong> ${DE(h.beispiel)}</p></div>`;}
// Klappt den Hilfetext direkt unter dem Anker auf (kein Popup); erneuter Klick schließt ihn.
function hilfeUmschalten(knopf,key,anker){
 anker=anker||knopf.closest('label,.cardhead,.formgroup,p,h2,h3,.sectionhead')||knopf.parentElement;
 const vorhanden=anker.nextElementSibling;
 if(vorhanden&&vorhanden.classList.contains('hilfe-inline')&&vorhanden.dataset.hilfe===key){vorhanden.remove();knopf.setAttribute('aria-expanded','false');return;}
 anker.insertAdjacentHTML('afterend',hilfeHtml(key));knopf.setAttribute('aria-expanded','true');
}
// Rückwärtskompatibel: frühere Aufrufe öffneten ein Hilfefenster.
function hilfeZeigen(seite){const kopf=document.querySelector('#'+CSS.escape(seite)+' .sectionhead');const knopf=kopf?.querySelector('.hilfeknopf');if(knopf)hilfeUmschalten(knopf,seite,kopf);}

/* ================================================================
   2. SCHNELLNOTIZ MIT @-ERWÄHNUNG
   ================================================================ */
let snErwaehnungen=[],snAuswahl=[],snAktiv=0,snAbfrage=null;
function uhrzeitJetzt(){return new Date().toTimeString().slice(0,5);}
function snLabel(s){return '@'+s.first+' '+s.last;}
function renderSchnellnotiz(){
 const box=document.getElementById('schnellnotizBereich');if(!box||box.dataset.fertig)return;box.dataset.fertig='1';
 box.innerHTML=`<section class="card schnellnotiz"><div class="cardhead"><h2>Schnellnotiz ${hilfeKnopf('schnellnotiz')}</h2><span class="subtle">Strg+Enter speichert</span></div>
 <div class="sn-feld"><textarea class="field" id="snText" rows="3" data-eigenes-diktat aria-label="Schnellnotiz" aria-autocomplete="list" aria-controls="snListe" placeholder="Kurz notieren, was passiert ist. Mit @ einen Schüler zuordnen."></textarea>
 <div class="sn-liste" id="snListe" role="listbox" hidden></div></div>
 <div class="sn-fuss"><span class="subtle" id="snZuordnung">Noch kein Kind zugeordnet – ohne @ landet die Notiz unter „Noch nicht zugeordnet“.</span><span class="sn-knoepfe"><button type="button" class="btn" id="snDiktat" onclick="schnellnotizDiktat(this)">🎙 Diktat</button><button type="button" class="btn primary" onclick="schnellnotizSpeichern()">Notiz speichern</button></span></div></section><div class="klein-aktionen"><button type="button" class="btn kleiner" onclick="taetigkeitOhneFall()">＋ Tätigkeit ohne Fall</button><span class="subtle">Konferenz, Elternabend, Projekt, Pausenpräsenz …</span></div>`;
 const t=document.getElementById('snText');
 t.addEventListener('input',()=>{snZuordnungZeigen();snListePruefen();});
 t.addEventListener('click',snListePruefen);
 t.addEventListener('keydown',snTaste);
 t.addEventListener('blur',()=>setTimeout(()=>{if(document.activeElement!==t)snListeSchliessen();},150));
}
function snTaste(e){
 const liste=document.getElementById('snListe'),offen=liste&&!liste.hidden&&snAuswahl.length;
 if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();schnellnotizSpeichern();return;}
 if(!offen)return;
 if(e.key==='ArrowDown'){e.preventDefault();snAktiv=(snAktiv+1)%snAuswahl.length;snListeZeichnen();}
 else if(e.key==='ArrowUp'){e.preventDefault();snAktiv=(snAktiv-1+snAuswahl.length)%snAuswahl.length;snListeZeichnen();}
 else if(e.key==='Enter'||e.key==='Tab'){e.preventDefault();snWaehlen(snAktiv);}
 else if(e.key==='Escape'){e.preventDefault();snListeSchliessen();}
}
// Liefert die gerade getippte @-Abfrage direkt vor dem Cursor (oder null)
function snAktuelleAbfrage(t){
 const vor=t.value.slice(0,t.selectionStart),m=/(^|\s)@([^@\n]{0,40})$/u.exec(vor);if(!m)return null;
 const start=m.index+m[1].length,abschnitt=vor.slice(start),text=m[2];
 if(snErwaehnungen.some(x=>abschnitt.startsWith(x.label)))return null; // bereits zugeordnete Erwähnung
 if(text.trim().split(/\s+/).length>3)return null;
 return {start,text:text.replace(/\s+$/,'')};
}
function snTreffer(q){
 const aktiv=data.students.filter(s=>s.active!==false),n=Dossier.similarStudents?Dossier.similarStudents(data,q,8):[];
 if(!q){const zuletzt=typeof kurzkontaktZuletzt==='function'?kurzkontaktZuletzt():[];const ids=[...zuletzt];for(const s of aktiv.slice().sort((a,b)=>a.last.localeCompare(b.last)))if(ids.length<8&&!ids.includes(s.id))ids.push(s.id);return {treffer:ids.map(id=>aktiv.find(s=>s.id===id)).filter(Boolean),exakt:true};}
 const norm=v=>String(v).toLocaleLowerCase('de-DE'),qq=norm(q);
 const direkt=aktiv.filter(s=>norm(s.first+' '+s.last).includes(qq)||norm(s.last+' '+s.first).includes(qq)||norm(s.last+', '+s.first).includes(qq));
 const alle=[...direkt,...n.filter(s=>!direkt.includes(s))].slice(0,8);
 return {treffer:alle,exakt:direkt.length>0};
}
function snListePruefen(){
 const t=document.getElementById('snText');if(!t)return;const a=snAktuelleAbfrage(t);snAbfrage=a;
 if(!a){snListeSchliessen();return;}
 const {treffer,exakt}=snTreffer(a.text);
 snAuswahl=treffer.map(s=>({typ:'kind',s,aehnlich:!exakt}));
 if(a.text.length>=2&&!exakt)snAuswahl.push({typ:'neu',name:a.text});
 else if(a.text.length>=2&&!treffer.some(s=>(s.first+' '+s.last).toLocaleLowerCase('de-DE')===a.text.toLocaleLowerCase('de-DE')))snAuswahl.push({typ:'neu',name:a.text});
 snAktiv=0;snListeZeichnen();
}
function snListeZeichnen(){
 const liste=document.getElementById('snListe');if(!liste)return;
 if(!snAuswahl.length){liste.hidden=false;liste.innerHTML='<div class="sn-leer">Kein Kind gefunden. Weiter tippen oder Esc drücken.</div>';return;}
 const hinweis=snAuswahl.some(x=>x.aehnlich)?'<div class="sn-hinweis">Meintest du …?</div>':'';
 liste.innerHTML=hinweis+snAuswahl.map((x,i)=>`<div class="sn-option ${i===snAktiv?'aktiv':''} ${x.typ==='neu'?'neu':''}" role="option" aria-selected="${i===snAktiv}" data-i="${i}">${x.typ==='kind'?`<strong>${DE(x.s.last+', '+x.s.first)}</strong> <span>${DE(x.s.className||'')}</span>`:`➕ Neue Akte anlegen: „${DE(x.name)}“`}</div>`).join('');
 liste.hidden=false;
 liste.querySelectorAll('.sn-option').forEach(o=>o.addEventListener('mousedown',e=>{e.preventDefault();snWaehlen(Number(o.dataset.i));}));
 liste.querySelector('.aktiv')?.scrollIntoView?.({block:'nearest'});
}
function snListeSchliessen(){const l=document.getElementById('snListe');if(l){l.hidden=true;l.innerHTML='';}snAuswahl=[];}
function snWaehlen(i){const x=snAuswahl[i];if(!x)return;if(x.typ==='neu'){snNeueAkte(x.name);return;}snEinfuegen(x.s);}
function snEinfuegen(s){
 const t=document.getElementById('snText'),a=snAbfrage||snAktuelleAbfrage(t);if(!t||!a)return;
 const label=snLabel(s),ende=a.start+1+a.text.length,rest=t.value.slice(ende).replace(/^[^\s@]*/,'');
 t.value=t.value.slice(0,a.start)+label+' '+rest.replace(/^\s/,'');
 const pos=a.start+label.length+1;t.focus();t.setSelectionRange(pos,pos);
 if(!snErwaehnungen.some(x=>x.id===s.id))snErwaehnungen.push({id:s.id,label});
 snListeSchliessen();snZuordnungZeigen();
}
function snAktiveErwaehnungen(){const t=document.getElementById('snText');const text=t?t.value:'';return snErwaehnungen.filter(x=>text.includes(x.label));}
function snZuordnungZeigen(){
 const el=document.getElementById('snZuordnung');if(!el)return;const m=snAktiveErwaehnungen();
 el.textContent=m.length?'Wird gespeichert bei: '+m.map(x=>x.label.slice(1)).join(', '):'Noch kein Kind zugeordnet – ohne @ landet die Notiz unter „Noch nicht zugeordnet“.';
}
// Offene @-Angaben, die keinem ausgewählten Kind entsprechen
function snOffeneErwaehnung(text){let rest=text;for(const x of snAktiveErwaehnungen())rest=rest.split(x.label).join(' ');const m=/(^|\s)@([\p{L}][^\s@]*(?: [\p{L}][^\s@]*)?)/u.exec(rest);return m?m[2]:'';}
function schnellnotizSpeichern(){
 const t=document.getElementById('snText');if(!t)return;const text=t.value.trim();
 if(!text){toast('Bitte zuerst etwas notieren.');t.focus();return;}
 const offen=snOffeneErwaehnung(text);
 if(offen){const pos=t.value.indexOf('@'+offen);t.focus();t.setSelectionRange(pos+1+offen.length,pos+1+offen.length);snListePruefen();toast('„@'+offen+'“ ist noch keinem Kind zugeordnet. Bitte aus der Liste wählen oder neu anlegen.',true);return;}
 const ids=[...new Set(snAktiveErwaehnungen().map(x=>x.id))].filter(id=>data.students.some(s=>s.id===id));
 const datum=today(),zeit=uhrzeitJetzt();
 try{
  if(ids.length){const e=Dossier.addEntry(data,{date:datum,time:zeit,type:'Kurznotiz',title:typeof dossierAutoTitle==='function'?dossierAutoTitle(text.replace(/@/g,'')):text.slice(0,70),content:text,participantIds:ids,responsible:data.settings.activeUser||'SSA-Team'});e.actionSuggestions=[];}
  else data.schnellnotizen.push({id:Dossier.uid('notiz'),date:datum,time:zeit,text,createdAt:new Date().toISOString()});
  save();
 }catch(err){appAlert(err.message||String(err));return;}
 t.value='';snErwaehnungen=[];snZuordnungZeigen();snListeSchliessen();
 const namen=ids.map(id=>{const s=data.students.find(x=>x.id===id);return s.first+' '+s.last;});
 toast(ids.length?'Notiz gespeichert bei '+namen.join(', ')+'.':'Notiz gespeichert – noch nicht zugeordnet.');
}
async function schnellnotizDiktat(knopf){
 let lokal=false;try{localSpeechEndpoint();lokal=await diktatDienstErreichbar();}catch{}
 if(!lokal&&!(data.settings.allowOnlineSpeech&&nativeSpeechConstructor())){toast('Diktat gerade nicht verfügbar: Der lokale Diktatdienst läuft nicht. Du kannst normal weitertippen.');document.getElementById('snText')?.focus();return;}
 try{await toggleLocalDictation('snText',knopf);}catch(err){toast('Diktat konnte nicht gestartet werden. Du kannst normal weitertippen.');}
}
// Neue Akte aus der Notiz: nur Name und Klasse, vorher Ähnlichkeitsprüfung
function snNeueAkte(name){
 snListeSchliessen();
 const aehnlich=Dossier.similarStudents(data,name,5);
 const wrap=document.createElement('div');wrap.className='modal open';wrap.id='neueAkteModal';wrap.style.zIndex='62';
 wrap.innerHTML=`<div class="dialog" style="width:min(560px,100%)"><form><div class="dialoghead"><h2>Neue Akte anlegen</h2><button type="button" class="close" data-zu>×</button></div><div class="dialogbody kein-querscroll">
 ${aehnlich.length?`<div class="notice warning"><strong>Meintest du …?</strong><p style="margin:.3em 0 .5em">Diese Kinder heißen ähnlich. Wähle eines aus, damit keine doppelte Akte entsteht:</p>${aehnlich.map(s=>`<button type="button" class="btn kleiner" data-kind="${DE(s.id)}">${DE(s.first+' '+s.last+' · '+(s.className||''))}</button>`).join(' ')}</div>`:''}
 <p class="subtle">Nur zwei Angaben sind nötig. Alles Weitere kannst du später in der Akte ergänzen.</p>
 <div class="formgrid"><div class="formgroup full"><label>Name (Vorname Nachname)</label><input class="field" name="name" required value="${DE(name)}"></div><div class="formgroup"><label>Klasse</label><input class="field" name="klasse" required placeholder="z. B. 5b"></div></div>
 ${aehnlich.length?'<label class="sn-trotzdem"><input type="checkbox" name="trotzdem"> Es ist wirklich ein anderes Kind – trotzdem neu anlegen</label>':''}
 </div><div class="dialogfoot"><button type="button" class="btn" data-zu>Abbrechen</button><button type="submit" class="btn primary">Akte anlegen</button></div></form></div>`;
 document.body.appendChild(wrap);
 const zu=()=>{wrap.remove();document.getElementById('snText')?.focus();};
 wrap.querySelectorAll('[data-zu]').forEach(b=>b.onclick=zu);
 wrap.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{const s=data.students.find(x=>x.id===b.dataset.kind);wrap.remove();if(s)snEinfuegen(s);});
 wrap.querySelector('form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),teile=String(f.get('name')||'').trim().split(/\s+/),klasse=String(f.get('klasse')||'').trim();
  if(teile.length<2){appAlert('Bitte Vor- und Nachname eintragen, z. B. „Anna Beispiel“.');return;}
  if(aehnlich.length&&!f.has('trotzdem')){appAlert('Es gibt ähnliche Namen. Wähle oben das richtige Kind aus – oder bestätige, dass es wirklich ein anderes Kind ist.');return;}
  try{const s=Dossier.addStudent(data,{first:teile.slice(0,-1).join(' '),last:teile.at(-1),className:klasse,reason:'Neue Akte aus Schnellnotiz'});save();wrap.remove();snEinfuegen(s);toast('Akte für '+s.first+' '+s.last+' angelegt.');}catch(err){appAlert(err.message||String(err));}
 };
 setTimeout(()=>wrap.querySelector(aehnlich.length?'[data-kind]':'input[name=klasse]')?.focus(),40);
}
// Liste „Noch nicht zugeordnet“ in der Tagesansicht
function notizenOffenHtml(){
 const n=(data.schnellnotizen||[]).slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));if(!n.length)return '';
 return `<section class="card notizen-offen"><div class="cardhead"><h2>Noch nicht zugeordnet ${hilfeKnopf('notizenOffen')}</h2><span class="tag amber">${n.length}</span></div>${n.map(x=>`<div class="today-row"><div class="grow"><span class="subtle">${DE(fmt(x.date))} · ${DE(x.time||'')}</span><br>${DE(x.text.length>220?x.text.slice(0,219)+' …':x.text)}</div><button class="btn kleiner" onclick="notizZuordnen('${DE(x.id)}')">Zuordnen</button><button class="btn kleiner" onclick="notizLoeschen('${DE(x.id)}')">Löschen</button></div>`).join('')}</section>`;
}
function notizZuordnen(id){
 const n=(data.schnellnotizen||[]).find(x=>x.id===id);if(!n)return;
 dossierPopup('Notiz zuordnen',`<p class="subtle">Wähle das Kind oder die Kinder aus, zu denen die Notiz gehört. Sie erscheint dann in deren Chronik mit dem ursprünglichen Datum.</p><div class="notice">${DE(fmt(n.date))} · ${DE(n.time||'')}<br>${DE(n.text)}</div><div class="full">${dossierParticipantList([])}</div>`,async fd=>{
  const ids=fd.getAll('participantIds');if(!ids.length)throw Error('Bitte mindestens ein Kind auswählen.');
  const e=Dossier.addEntry(data,{date:n.date,time:n.time,type:'Kurznotiz',title:typeof dossierAutoTitle==='function'?dossierAutoTitle(n.text.replace(/@/g,'')):n.text.slice(0,70),content:n.text,participantIds:ids,responsible:data.settings.activeUser||'SSA-Team'});e.actionSuggestions=[];
  data.schnellnotizen=data.schnellnotizen.filter(x=>x.id!==id);save();closeModal('dossierEditModal');toast('Notiz zugeordnet.');
 });
}
async function notizLoeschen(id){if(!await appConfirm('Diese Notiz wirklich löschen? Sie ist noch keinem Kind zugeordnet.'))return;data.schnellnotizen=(data.schnellnotizen||[]).filter(x=>x.id!==id);save();toast('Notiz gelöscht.');}

/* ================================================================
   3. GESPRÄCH VORBEREITEN (Schülerakte)
   Rein regelbasiert: nur vorhandene Einträge, keine Bewertung.
   ================================================================ */
function vorbereitungDaten(sid){
 const heute=today(),events=Dossier.timeline(data,sid,typeof legacyStudentEvents==='function'?legacyStudentEvents(sid):[]);
 const letzte=events.filter(e=>!e.task&&e.date&&e.date<=heute).sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.time||'').localeCompare(String(a.time||''))||String(b.createdAt||'').localeCompare(String(a.createdAt||''))).slice(0,3);
 const zusagen=data.tasks.filter(t=>t.kind==='zusage'&&!t.done&&Dossier.ids(data,t).includes(sid)).sort((a,b)=>String(a.due||'9999').localeCompare(String(b.due||'9999')));
 const schritte=data.tasks.filter(t=>t.kind!=='zusage'&&!t.done&&Dossier.ids(data,t).includes(sid)).sort((a,b)=>String(a.due||'9999').localeCompare(String(b.due||'9999')));
 const plaene=(data.casePlans||[]).filter(p=>p.studentId===sid&&!['Erreicht','Verworfen','Abgeschlossen'].includes(p.status));
 const verfahren=(data.verfahrenLaeufe||[]).filter(l=>Dossier.ids(data,l).includes(sid)&&(typeof verfahrenOffen==='function'?verfahrenOffen(l):!['Abgeschlossen','abgeschlossen'].includes(l.status)));
 return {auftrag:typeof dossierAuftragAktuell==='function'?dossierAuftragAktuell(sid):null,letzte,zusagen,schritte,plaene,verfahren};
}
function vorbereitungHtml(sid,druck=false){
 const d=vorbereitungDaten(sid),heute=today(),kurz=(t,n=140)=>{t=String(t||'').replace(/\s+/g,' ').trim();return t.length>n?t.slice(0,n-1)+' …':t;};
 const link=(key,inhalt)=>druck?`<div class="vb-punkt">${inhalt}</div>`:`<button type="button" class="vb-punkt" onclick="vorbereitungSprung('${DE(key)}')" title="Zum Originaleintrag in der Chronik">${inhalt}</button>`;
 const leer='<p class="vb-leer">Noch nichts eingetragen.</p>';
 const auftrag=d.auftrag?link('auftrag:'+d.auftrag.id,`<strong>${DE(d.auftrag.assignedOrder)}</strong><br><span class="subtle">von ${DE(d.auftrag.requester)} · ${DE(fmt(d.auftrag.date))}${d.auftrag.childNeed?' · Anliegen des Kindes: '+DE(d.auftrag.childNeed):''}</span>`):(druck?'<p class="vb-leer">Auftrag noch nicht geklärt.</p>':`<p class="vb-leer">Auftrag noch nicht geklärt. <button type="button" class="linkbutton" onclick="vorbereitungSchliessen();dossierAuftrag()">Jetzt Auftrag klären</button></p>`);
 const letzte=d.letzte.map(e=>link(e.key,`<span class="subtle">${DE(fmt(e.date))} · ${DE(e.eventKind||e.type||'Eintrag')}</span><br>${DE(kurz(e.title&&e.content&&!String(e.content).startsWith(String(e.title))?e.title+': '+e.content:(e.content||e.title)))}`)).join('')||leer;
 const zusagen=d.zusagen.map(t=>{const ueber=t.due&&t.due<heute;return link('task:'+t.id,`<span class="${ueber?'vb-ueberfaellig':''}">${DE(t.zugesagtVon||'Ich')} · <strong>${DE(t.title)}</strong> · ${t.due?'bis '+DE(fmt(t.due)):'ohne Termin'}${ueber?' · überfällig':''}</span>`);}).join('')||leer;
 const mass=[...d.plaene.map(p=>link('legacy:'+p.id,`Maßnahmenplan · <strong>${DE(kurz(p.goal||p.title||p.measure||'Ziel- und Maßnahmenplan',100))}</strong>${p.status?' · '+DE(p.status):''}`)),...d.verfahren.map(l=>link('legacy:'+l.id,`Fachverfahren · <strong>${DE(typeof verfahrenTitel==='function'?verfahrenTitel(l.workflowId):(l.title||l.workflowId||''))}</strong>${l.status?' · '+DE(l.status):''}`)),...d.schritte.map(t=>link('task:'+t.id,`Nächster Schritt · <strong>${DE(t.title)}</strong> · ${t.due?DE(fmt(t.due)):'ohne Termin'}${t.due&&t.due<heute?' <span class="vb-ueberfaellig">überfällig</span>':''}`))].join('')||leer;
 return `<section class="vb-abschnitt"><h3>Auftrag ${druck?'':hilfeKnopf('auftrag')}</h3>${auftrag}</section><section class="vb-abschnitt"><h3>Letzte drei Chronik-Einträge</h3>${letzte}</section><section class="vb-abschnitt"><h3>Offene Zusagen ${druck?'':hilfeKnopf('zusagen')}</h3>${zusagen}</section><section class="vb-abschnitt"><h3>Laufende Maßnahmen und aktive Fachverfahren ${druck?'':hilfeKnopf('massnahmen')}</h3>${mass}</section>`;
}
let vorbereitungTimer=0;
function gespraechVorbereiten(){
 const sid=selectedStudentId,s=data.students.find(x=>x.id===sid);if(!s)return;vorbereitungSchliessen();
 const text=data.settings.gespraechsvorbereitung?.[sid]||'';
 const wrap=document.createElement('div');wrap.className='modal open';wrap.id='vorbereitungModal';wrap.style.zIndex='55';
 wrap.innerHTML=`<div class="dialog wide"><div class="dialoghead"><h2>Gespräch vorbereiten · ${DE(s.first+' '+s.last)}</h2><button type="button" class="close" onclick="vorbereitungSchliessen()">×</button></div><div class="dialogbody kein-querscroll"><p class="subtle" style="margin-top:0">Alles hier stammt aus der Akte. Ein Klick auf einen Punkt zeigt den Originaleintrag in der Chronik. ${hilfeKnopf('vorbereitung')}</p><div id="vbInhalt">${vorbereitungHtml(sid)}</div><section class="vb-abschnitt"><h3><label for="vbFrage">Was will ich in diesem Gespräch klären?</label></h3><textarea class="field" id="vbFrage" rows="4" placeholder="z. B. Hat sich die Situation in der Pause verbessert? Was braucht Anna noch?">${DE(text)}</textarea><small class="subtle">Wird automatisch gespeichert und beim Dokumentieren übernommen.</small></section></div><div class="dialogfoot"><button type="button" class="btn" onclick="vorbereitungDrucken()">Drucken</button><button type="button" class="btn" onclick="vorbereitungSchliessen()">Schließen</button><button type="button" class="btn primary" onclick="vorbereitungDokumentieren()">Gespräch jetzt dokumentieren</button></div></div>`;
 document.body.appendChild(wrap);
 wrap.addEventListener('keydown',e=>{if(e.key==='Escape')vorbereitungSchliessen();});
 const f=document.getElementById('vbFrage');f.addEventListener('input',()=>{clearTimeout(vorbereitungTimer);vorbereitungTimer=setTimeout(()=>vorbereitungMerken(sid,f.value),600);});
 enhanceDictationFields();
}
function vorbereitungMerken(sid,wert){data.settings.gespraechsvorbereitung=data.settings.gespraechsvorbereitung||{};if(String(wert||'').trim())data.settings.gespraechsvorbereitung[sid]=wert;else delete data.settings.gespraechsvorbereitung[sid];save();}
function vorbereitungSchliessen(){const m=document.getElementById('vorbereitungModal');if(!m)return;const f=document.getElementById('vbFrage');if(f){clearTimeout(vorbereitungTimer);const alt=data.settings.gespraechsvorbereitung?.[selectedStudentId]||'';if(f.value!==alt)vorbereitungMerken(selectedStudentId,f.value);}m.remove();}
// Quellenprinzip: zum Originaleintrag springen und ihn kurz hervorheben
function vorbereitungSprung(key){vorbereitungSchliessen();dossierMarkieren(key);}
function dossierMarkieren(key){
 dossierJump(key);
 const finden=()=>{let el=document.getElementById('ds-'+key);if(!el&&key.startsWith('task:')){const t=data.tasks.find(x=>'task:'+x.id===key);if(t?.sourceEntryKey)el=document.getElementById('ds-'+t.sourceEntryKey);}return el;};
 setTimeout(()=>{const el=finden();if(!el){toast('Der Eintrag ist in der Chronik gerade ausgeblendet (Filter oder ausgeblendete Kachel).');return;}el.scrollIntoView?.({block:'center'});const d=el.querySelector(':scope>details');if(d)d.open=true;el.classList.remove('dossier-hervorgehoben');void el.offsetWidth;el.classList.add('dossier-hervorgehoben');setTimeout(()=>el.classList.remove('dossier-hervorgehoben'),2600);},60);
}
function vorbereitungDrucken(){
 const sid=selectedStudentId,s=data.students.find(x=>x.id===sid);if(!s)return;const frage=document.getElementById('vbFrage')?.value||'';
 printDocument('Gesprächsvorbereitung',`<h1>Gesprächsvorbereitung</h1><p class="muted">${DE(s.first+' '+s.last)} · Klasse ${DE(s.className||'–')} · erstellt am ${DE(fmt(today()))}</p>${vorbereitungHtml(sid,true)}<h2>Was will ich klären?</h2><div class="box">${DE(frage).replace(/\n/g,'<br>')||'&nbsp;'}</div><h2>Notizen aus dem Gespräch</h2><div class="box" style="min-height:120pt">&nbsp;</div>`);
}
function vorbereitungDokumentieren(){
 const frage=document.getElementById('vbFrage')?.value.trim()||'';vorbereitungSchliessen();dossierEntry('event');
 const f=document.getElementById('dossierEditForm');if(f&&frage){f.elements.content.value='Klären wollte ich: '+frage+'\n\n';f.elements.content.dispatchEvent(new Event('input'));const n=f.elements.content.value.length;f.elements.content.focus();try{f.elements.content.setSelectionRange(n,n);}catch{}}
}

/* ================================================================
   4. ZUSAGEN AUS DER CHRONIK UND ZUSAGEN-ÜBERSICHT
   Status: offen · läuft · erledigt (intern: offen · in Bearbeitung · erledigt)
   ================================================================ */
const ZUSAGE_STATUS=[['offen','offen'],['in Bearbeitung','läuft'],['erledigt','erledigt']];
function zusageStatusText(t){return t.done?'erledigt':['in Bearbeitung','wartet auf Rückmeldung'].includes(t.status)?'läuft':'offen';}
function zusageAusEintrag(key){
 const sid=selectedStudentId,ev=Dossier.timeline(data,sid,typeof legacyStudentEvents==='function'?legacyStudentEvents(sid):[]).find(e=>e.key===key);
 openPromise(sid,{sourceEntryKey:key,bezugText:ev?'Bezug: Eintrag vom '+fmt(ev.date)+' · '+(ev.title||ev.eventKind||''):'Bezug: Chronikeintrag'});
}
function zusagenListeOeffnen(){go('tasks');requestAnimationFrame(()=>document.getElementById('zusagenListe')?.scrollIntoView({block:'start'}));}
let zusagenFilterKind='';
function renderZusagen(){
 const box=document.getElementById('zusagenListe');if(!box)return;const heute=today();
 const alle=data.tasks.filter(t=>t.kind==='zusage');
 const kinder=[...new Set(alle.flatMap(t=>Dossier.ids(data,t)))].map(id=>data.students.find(s=>s.id===id)).filter(Boolean).sort((a,b)=>a.last.localeCompare(b.last));
 if(zusagenFilterKind&&!kinder.some(s=>s.id===zusagenFilterKind))zusagenFilterKind='';
 const liste=alle.filter(t=>!zusagenFilterKind||Dossier.ids(data,t).includes(zusagenFilterKind)).sort((a,b)=>String(a.due||'9999').localeCompare(String(b.due||'9999')));
 const gruppe=st=>liste.filter(t=>zusageStatusText(t)===st);
 const zeile=t=>{const s=data.students.find(x=>x.id===Dossier.ids(data,t)[0]),ueber=!t.done&&t.due&&t.due<heute;
  return `<div class="zusage-zeile ${ueber?'ueberfaellig':''}"><div class="grow"><strong>${DE(t.title)}</strong><br><span class="subtle">${DE(t.zugesagtVon||'Ich')} → ${DE(t.promisedTo||'')} · ${t.due?'bis '+DE(fmt(t.due)):'ohne Termin'}${ueber?' · <span class="tag red">überfällig</span>':''}${s?` · <button class="linkbutton" onclick="showStudent('${DE(s.id)}')">${DE(s.first+' '+s.last)}</button>`:''}${t.sourceEntryKey&&s?` · <button class="linkbutton" onclick="showStudent('${DE(s.id)}');dossierMarkieren('${DE(t.sourceEntryKey)}')">Ursprungseintrag</button>`:''}${t.doneEntryId&&s?` · <button class="linkbutton" onclick="showStudent('${DE(s.id)}');dossierMarkieren('entry:${DE(t.doneEntryId)}')">Eintrag „erledigt“</button>`:''}</span></div><label class="zusage-status">Status <select class="field" aria-label="Status der Zusage" onchange="zusageStatusSetzen('${DE(t.id)}',this.value)">${ZUSAGE_STATUS.map(([w,l])=>`<option value="${w}" ${zusageStatusText(t)===l?'selected':''}>${l}</option>`).join('')}</select></label></div>`;};
 const erledigt=gruppe('erledigt');
 box.innerHTML=`<div class="cardhead"><h2>Zusagen ${hilfeKnopf('zusagen')}</h2><button class="btn primary kleiner" onclick="openPromise(zusagenFilterKind)">＋ Zusage</button></div>
 <label class="zusagen-filter">Nach Kind filtern <select class="field" onchange="zusagenFilterKind=this.value;renderZusagen()"><option value="">Alle Kinder</option>${kinder.map(s=>`<option value="${DE(s.id)}" ${s.id===zusagenFilterKind?'selected':''}>${DE(s.last+', '+s.first+' · '+(s.className||''))}</option>`).join('')}</select></label>
 <h3>Offen (${gruppe('offen').length})</h3>${gruppe('offen').map(zeile).join('')||'<p class="subtle">Keine offenen Zusagen.</p>'}
 <h3>Läuft (${gruppe('läuft').length})</h3>${gruppe('läuft').map(zeile).join('')||'<p class="subtle">Nichts in Arbeit.</p>'}
 <details><summary><strong>Erledigt (${erledigt.length})</strong></summary>${erledigt.slice().reverse().map(zeile).join('')||'<p class="subtle">Noch nichts erledigt.</p>'}</details>`;
}
function zusageStatusSetzen(id,status){
 const t=data.tasks.find(x=>x.id===id);if(!t)return;
 try{Dossier.setTask(data,t,status==='erledigt'?{status,result:t.result||'Zusage eingehalten.',completedAt:today()}:{status},data.settings.activeUser||'SSA');}catch(err){appAlert(err.message||String(err));renderZusagen();return;}
 save();renderZusagen();if(document.getElementById('studentModal')?.classList.contains('open'))dossierRefresh();
 toast(status==='erledigt'?(t.doneEntryId?'Zusage erledigt und in der Chronik vermerkt.':'Zusage erledigt.'):'Status geändert.');
}


/* ================================================================
   5. STATISTIK-MERKMALE BEIM ERFASSEN (0.15) – Chips statt Formularfelder
   ================================================================ */
function chipsHtml(merkmal,name,{multi=false,auswahl=[],liste=null,titel='',hilfe=merkmal,pflicht=false,datum=''}={}){
 const eintraege=liste||Dossier.katListe(merkmal,datum||today()),gewaehlt=new Set((auswahl||[]).map(String));
 return `<div class="chip-merkmal" data-merkmal="${DE(merkmal)}" data-name="${DE(name)}"${pflicht?' data-pflicht="1"':''}><div class="chip-titel">${DE(titel||katTitel(merkmal))}${pflicht?' <span class="pflicht">Pflicht</span>':''} ${hilfeKnopf(hilfe)}</div><div class="chiprow">${eintraege.map(e=>`<label class="chip"><input type="${multi?'checkbox':'radio'}" name="${DE(name)}" value="${DE(e.id)}" ${gewaehlt.has(String(e.id))?'checked':''}${multi?'':' data-abwaehlbar="1"'}> ${DE(e.label)}</label>`).join('')}</div></div>`;
}
function katTitel(merkmal){return {kontaktart:'Art',zugangsweg:'Wie kam der Kontakt zustande?',beteiligte:'Wer war dabei?',thema:'Thema',dauer:'Dauer',dauer_kurz:'Dauer',ergebnis:'Ergebnis (freiwillig)',taetigkeit:'Tätigkeit'}[merkmal]||merkmal;}
// Einzelauswahl-Chips lassen sich durch erneutes Klicken wieder abwählen (für freiwillige Angaben)
document.addEventListener('click',e=>{const inp=e.target?.closest?.('label.chip')?.querySelector('input[data-abwaehlbar]');if(!inp||e.target===inp)return;if(inp.checked&&!inp.closest('[data-pflicht]')){e.preventDefault();inp.checked=false;inp.dispatchEvent(new Event('change',{bubbles:true}));}},true);
function zugangOffen(sid,datum){return !!sid&&!Dossier.zugangswegFuer(data,sid,datum||today());}
// Block „Einordnung für die Statistik“ im Gesprächsformular
function statBlockHtml(e,{info,selected,old,type}){
 if(info)return '';const st=e.stat&&e.stat.quelle==='erfasst'?e.stat:null,datum=e.date||today();
 const einzel=selected.length===1,zugang=!old&&einzel&&zugangOffen(selected[0],datum);
 const beteiligteVor=st?st.beteiligte:['schueler',...(/eltern/i.test(type||'')?['eltern']:[])];
 const dauerVor=st?.dauer_min??(old?(Number(e.duration)||null):data.settings.letzteDauer||null);
 return `<details class="full stat-block" open><summary>Einordnung für die Statistik <span class="subtle">(dauert 5 Sekunden)</span></summary>
 ${zugang?chipsHtml('zugangsweg','zugangsweg',{pflicht:true,datum}):''}
 ${einzel?chipsHtml('kontaktart','kontaktart_wahl',{liste:Dossier.katListe('kontaktart',datum).filter(k=>['beratungsgespraech','krisengespraech'].includes(k.id)),auswahl:[st?.kontaktart==='krisengespraech'?'krisengespraech':'beratungsgespraech'],titel:'Art',pflicht:true}):''}
 ${chipsHtml('thema','thema',{multi:true,auswahl:st?.themen||[],datum})}
 ${chipsHtml('beteiligte','beteiligte',{multi:true,auswahl:beteiligteVor,datum})}
 ${chipsHtml('dauer','dauer_min',{auswahl:dauerVor?[dauerVor]:[],datum,liste:dauerListe(dauerVor)})}
 ${chipsHtml('ergebnis','ergebnis',{auswahl:st?.ergebnis?[st.ergebnis]:[],datum})}</details>`;
}
function dauerListe(vorhanden){const l=Dossier.katListe('dauer');if(vorhanden&&!l.some(x=>Number(x.id)===Number(vorhanden)))l.push({id:vorhanden,label:vorhanden+' Min.'});return l.sort((a,b)=>Number(a.id)-Number(b.id));}
// Liest die Chips aus dem Formular; liefert null, wenn der Eintrag kein Kontakt ist
function statAusFormular(fd,{participantIds,type,date,form}){
 if(['Kurznotiz','Zusage erledigt','zusätzliche Information','Mitteilung an Kollegium'].includes(type))return null;
 if(form?.querySelector('[data-merkmal="zugangsweg"][data-pflicht]')&&!fd.get('zugangsweg'))throw Error('Bitte kurz angeben, wie der Kontakt zustande kam (Zugangsweg).');
 const n=participantIds.length,kontaktart=/sozialtraining|klassen/iu.test(type)?'klasse':n>1?'gruppe':(fd.get('kontaktart_wahl')||'beratungsgespraech');
 const dauer=Number(fd.get('dauer_min'))||null;if(dauer)data.settings.letzteDauer=dauer;
 return Dossier.statErfassen(data,{kontaktart,themen:fd.getAll('thema'),beteiligte:fd.getAll('beteiligte'),dauer_min:dauer,ergebnis:fd.get('ergebnis')||'',teilnehmende:n>1?n:null},participantIds,date);
}
function zugangAusFormular(fd,participantIds,date){const z=fd.get('zugangsweg');if(z&&participantIds.length===1)Dossier.zugangswegSetzen(data,participantIds[0],z,date);}

// Kurzkontakt: Themen, Dauer und ggf. Zugangsweg als Chips
function kurzkontaktChipsFuellen(){
 const t=document.getElementById('qkThemen'),d=document.getElementById('qkDauer');
 if(t)t.innerHTML=chipsHtml('thema','thema',{multi:true});
 if(d)d.innerHTML=chipsHtml('dauer_kurz','dauer_min',{auswahl:[5],hilfe:'dauer'});
 kurzkontaktZugangPruefen();
}
function kurzkontaktZugangPruefen(){
 const box=document.getElementById('qkZugang');if(!box)return;const f=document.getElementById('quickContactForm'),sid=f?.elements.studentId?.value||'',datum=f?.elements.date?.value||today();
 const zeigen=!!sid&&!f.elements.anonymous?.checked&&zugangOffen(sid,datum);box.hidden=!zeigen;box.innerHTML=zeigen?chipsHtml('zugangsweg','zugangsweg',{pflicht:true,datum}):'';
}

// Tätigkeit ohne Fall
function taetigkeitOhneFall(){
 const alt=document.getElementById('taetigkeitModal');if(alt)alt.remove();
 const klassen=typeof currentClasses==='function'?currentClasses():[...new Set(data.students.filter(s=>s.active!==false).map(s=>s.className).filter(Boolean))].sort();
 const letzte=(data.taetigkeiten||[]).slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,5);
 const wrap=document.createElement('div');wrap.className='modal open';wrap.id='taetigkeitModal';wrap.style.zIndex='56';
 wrap.innerHTML=`<div class="dialog"><form><div class="dialoghead"><h2>Tätigkeit ohne Fall ${hilfeKnopf('taetigkeit')}</h2><button type="button" class="close" data-zu>×</button></div><div class="dialogbody kein-querscroll">
 <p class="subtle" style="margin-top:0">Für Arbeit, die keinem einzelnen Kind gehört. Nur die Tätigkeit ist Pflicht.</p>
 ${chipsHtml('taetigkeit','taetigkeit',{pflicht:true})}
 ${chipsHtml('dauer','dauer_min',{auswahl:[],liste:Dossier.katListe('dauer').concat([{id:120,label:'2 Std.'},{id:180,label:'3 Std.'}])})}
 <div class="formgrid"><div class="formgroup"><label>Datum</label><input class="field" type="date" name="date" value="${today()}" required></div><div class="formgroup"><label>Klasse <span class="subtle">(optional)</span></label><select class="field" name="klasse"><option value="">keine bestimmte Klasse</option>${klassen.map(k=>`<option>${DE(k)}</option>`).join('')}</select></div><div class="formgroup"><label>Teilnehmende <span class="subtle">(optional)</span> ${hilfeKnopf('teilnehmende')}</label><input class="field" type="number" min="0" name="teilnehmende" placeholder="z. B. 24"></div><div class="formgroup full"><label>Kurze Notiz <span class="subtle">(optional, bleibt intern)</span></label><input class="field" name="notiz" maxlength="300"></div></div>
 ${letzte.length?`<details class="letzte-taetigkeiten"><summary>Zuletzt eingetragen (${letzte.length})</summary>${letzte.map(t=>`<div class="today-row"><div class="grow">${DE(fmt(t.date))} · <strong>${DE(Dossier.katLabel('taetigkeit',t.taetigkeit))}</strong>${t.dauer_min?' · '+t.dauer_min+' Min.':''}${t.klasse?' · Klasse '+DE(t.klasse):''}${t.teilnehmende?' · '+t.teilnehmende+' Personen':''}</div><button type="button" class="btn kleiner" data-loeschen="${DE(t.id)}">Löschen</button></div>`).join('')}</details>`:''}
 </div><div class="dialogfoot"><button type="button" class="btn" data-zu>Abbrechen</button><button type="submit" class="btn primary">Speichern</button></div></form></div>`;
 document.body.appendChild(wrap);
 wrap.querySelectorAll('[data-zu]').forEach(b=>b.onclick=()=>wrap.remove());
 wrap.querySelectorAll('[data-loeschen]').forEach(b=>b.onclick=async()=>{if(!await appConfirm('Diese Tätigkeit löschen?'))return;data.taetigkeiten=data.taetigkeiten.filter(t=>t.id!==b.dataset.loeschen);save();taetigkeitOhneFall();toast('Tätigkeit gelöscht.');});
 wrap.querySelector('form').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target);
  try{const t=Dossier.addTaetigkeit(data,{taetigkeit:fd.get('taetigkeit'),dauer_min:fd.get('dauer_min'),date:fd.get('date'),klasse:fd.get('klasse'),teilnehmende:fd.get('teilnehmende'),notiz:fd.get('notiz')});save();wrap.remove();toast(Dossier.katLabel('taetigkeit',t.taetigkeit)+' gespeichert.'+(t.taetigkeit==='klassenprojekt_praevention'&&t.klasse?' Die Klasse '+t.klasse+' ist jetzt markiert.':''));}
  catch(err){appAlert(err.message||String(err));}};
}

/* ================================================================
   Start: Schnellnotiz einbauen, sobald die Oberfläche steht
   ================================================================ */
renderSchnellnotiz();
kurzkontaktChipsFuellen();
