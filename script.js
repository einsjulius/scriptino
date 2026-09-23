/* ==========================================================================
   SCRIPTINO — application logic
   Kein Backend. Alles läuft lokal im Browser (localStorage).
   ========================================================================== */
(function(){
"use strict";

/* --------------------------------------------------------------------
   0. CONSTANTS
   -------------------------------------------------------------------- */
const KEY_INDEX = "scriptino_index_v1";
const KEY_SCRIPT_PREFIX = "scriptino_script_v1_";
const KEY_SETTINGS = "scriptino_settings_v1";
const KEY_SEEDED = "scriptino_seeded_v1";
const KEY_ZOOM = "scriptino_zoom_v1";
const KEY_LANG = "scriptino_lang_v1";

const TYPE_ORDER = ["sceneheading","action","character","dialogue","parenthetical","transition","shot"];

const TYPE_LABELS = {
  sceneheading:"Scene Heading", action:"Action", character:"Character",
  dialogue:"Dialogue", parenthetical:"Parenthetical", transition:"Transition", shot:"Shot"
};

const PLACEHOLDERS = {
  de: {
    sceneheading:"INT./EXT. ORT – ZEIT", action:"Was passiert in der Szene …",
    character:"NAME", dialogue:"Text der Figur …", parenthetical:"(Regieanweisung)",
    transition:"CUT TO:", shot:"CLOSE ON:"
  },
  en: {
    sceneheading:"INT./EXT. LOCATION – TIME", action:"What happens in the scene …",
    character:"NAME", dialogue:"Character's line …", parenthetical:"(direction)",
    transition:"CUT TO:", shot:"CLOSE ON:"
  }
};
function getPlaceholder(type){
  const dict = PLACEHOLDERS[App.lang] || PLACEHOLDERS.de;
  return dict[type] || "";
}

// Smart-Enter: welcher Typ folgt automatisch nach ENTER
const ENTER_NEXT = {
  sceneheading:"action", action:"action", character:"dialogue",
  dialogue:"character", parenthetical:"dialogue", transition:"sceneheading", shot:"action"
};

// Seitenmaße in px @96dpi und in Zoll für PDF
const PAGE_SIZES = {
  letter: { wIn:8.5, hIn:11,    unit:"letter" },
  a4:     { wIn:8.27, hIn:11.69, unit:"a4" }
};
const DPI = 96;
const MARGIN_IN = { top:1, bottom:1, left:1.5, right:1 };
const IND_IN = { character:2.2, dialogue:1.0, parenthetical:1.6, dialogueW:3.4, parentheticalW:2.0 };

const DEBOUNCE_REPAGINATE = 320;
const DEBOUNCE_AUTOSAVE = 900;
const HISTORY_LIMIT = 60;

/* --------------------------------------------------------------------
   1. TINY HELPERS
   -------------------------------------------------------------------- */
function uid(prefix){ return (prefix||"id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
function $(sel, root){ return (root||document).querySelector(sel); }
function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }
function escapeHTML(str){
  return String(str||"").replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
}
function stripToPlainText(html){
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || "";
}
function sanitizeInline(html){
  // Erlaubt nur <b>, <strong>, <i>, <em> — entfernt alles andere.
  const div = document.createElement("div");
  div.innerHTML = html || "";
  (function clean(node){
    Array.from(node.childNodes).forEach(child => {
      if(child.nodeType === 1){
        const tag = child.tagName.toLowerCase();
        if(["b","strong","i","em"].includes(tag)){
          clean(child);
        } else {
          const parent = child.parentNode;
          while(child.firstChild) parent.insertBefore(child.firstChild, child);
          parent.removeChild(child);
        }
      }
    });
  })(div);
  return div.innerHTML;
}
function debounce(fn, ms){
  let t = null;
  const wrapped = function(...args){
    clearTimeout(t);
    t = setTimeout(()=>fn.apply(null,args), ms);
  };
  wrapped.flush = function(...args){ clearTimeout(t); fn.apply(null,args); };
  wrapped.cancel = function(){ clearTimeout(t); };
  return wrapped;
}
function deepClone(obj){
  return typeof structuredClone === "function" ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
}
function formatDateShort(iso){
  try{
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const time = d.toLocaleTimeString("de-AT", {hour:"2-digit", minute:"2-digit"});
    if(isToday) return "Heute, " + time;
    const yest = new Date(today); yest.setDate(today.getDate()-1);
    if(d.toDateString() === yest.toDateString()) return "Gestern, " + time;
    return d.toLocaleDateString("de-AT", {day:"2-digit", month:"2-digit", year:"numeric"}) + ", " + time;
  }catch(e){ return ""; }
}
function download(filename, content, mime){
  try{
    const blob = new Blob([content], {type: mime || "application/octet-stream"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 4000);
    return true;
  }catch(e){ console.error(e); return false; }
}
function safeFilename(str){
  return (str||"scriptino").trim().replace(/[^\p{L}\p{N}\-_ ]/gu,"").replace(/\s+/g,"_").slice(0,80) || "scriptino";
}

/* --------------------------------------------------------------------
   2. TOASTS
   -------------------------------------------------------------------- */
function toast(message, kind){
  try{
    const host = $("#toastHost");
    const el = document.createElement("div");
    el.className = "toast" + (kind === "error" ? " toast-error" : "");
    el.textContent = message;
    host.appendChild(el);
    requestAnimationFrame(()=> el.classList.add("show"));
    setTimeout(()=>{
      el.classList.remove("show");
      setTimeout(()=> el.remove(), 250);
    }, 2600);
  }catch(e){ console.error(e); }
}

/* --------------------------------------------------------------------
   3. STORAGE LAYER
   -------------------------------------------------------------------- */
const TUTORIAL_CONTENT = {
  de: {
    title: "Wie funktioniert ein Drehbuch?",
    elements: [
      ["transition","FADE IN:"],
      ["action","→ FADE IN zeigt den Beginn des Films an."],
      ["sceneheading","INT. WIENER WOHNUNG – TAG"],
      ["action","→ Ein Scene Heading beschreibt Ort und Tageszeit: INT. für Innenraum, EXT. für Außenbereich."],
      ["action","JULIUS geht langsam zum Fenster und schaut hinaus."],
      ["action","→ Action beschreibt, was auf der Leinwand passiert — nur das, was man sehen oder hören kann."],
      ["character","JULIUS"],
      ["dialogue","Hallo? Ist da jemand?"],
      ["action","→ Der Character-Name zeigt, wer spricht. Direkt danach folgt die Dialogue: der gesprochene Text dieser Figur."],
      ["character","JULIUS"],
      ["parenthetical","(leise)"],
      ["dialogue","Ich glaube, da ist jemand."],
      ["action","→ Ein Parenthetical beschreibt kurz, wie eine Zeile gesprochen wird — hier: leise."],
      ["shot","CLOSE ON:"],
      ["action","→ Ein Shot beschreibt eine besondere Kameraeinstellung, zum Beispiel eine Nahaufnahme."],
      ["action","Julius' Hand zittert leicht, als er die Tür öffnet."],
      ["transition","CUT TO:"],
      ["action","→ Eine Transition beschreibt einen harten Übergang zur nächsten Szene."],
      ["sceneheading","INT. WIENER WOHNUNG – FLUR – TAG"],
      ["action","Niemand ist da. Julius atmet erleichtert auf."],
      ["transition","FADE OUT."],
      ["action","→ FADE OUT zeigt das Ende des Films (oder einer Szene) an."]
    ]
  },
  en: {
    title: "How does a screenplay work?",
    elements: [
      ["transition","FADE IN:"],
      ["action","→ FADE IN marks the beginning of the film."],
      ["sceneheading","INT. VIENNA APARTMENT – DAY"],
      ["action","→ A Scene Heading describes location and time of day: INT. for indoors, EXT. for outdoors."],
      ["action","JULIUS slowly walks to the window and looks outside."],
      ["action","→ Action describes what happens on screen — only what can be seen or heard."],
      ["character","JULIUS"],
      ["dialogue","Hello? Is someone there?"],
      ["action","→ The Character name shows who is speaking. It's followed directly by Dialogue: the spoken lines of that character."],
      ["character","JULIUS"],
      ["parenthetical","(quietly)"],
      ["dialogue","I think someone's there."],
      ["action","→ A Parenthetical briefly describes how a line is delivered — here: quietly."],
      ["shot","CLOSE ON:"],
      ["action","→ A Shot describes a specific camera angle, for example a close-up."],
      ["action","Julius' hand trembles slightly as he opens the door."],
      ["transition","CUT TO:"],
      ["action","→ A Transition describes a hard cut to the next scene."],
      ["sceneheading","INT. VIENNA APARTMENT – HALLWAY – DAY"],
      ["action","No one is there. Julius breathes a sigh of relief."],
      ["transition","FADE OUT."],
      ["action","→ FADE OUT marks the end of the film (or a scene)."]
    ]
  }
};

/* --------------------------------------------------------------------
   3b. ÜBERSETZUNGEN (DE / EN)
   -------------------------------------------------------------------- */
const TRANSLATIONS = {
  de: {
    "nav.library":"Meine Skripte", "nav.help":"Hilfe", "nav.about":"Über uns",
    "landing.tagline":"Write the story.", "landing.sub":"Ein einfacher Editor für professionelle Drehbücher.",
    "landing.newScript":"Neues Skript", "landing.import":"Skript importieren",
    "landing.viewLibrary":"Meine Skripte ansehen →",
    "landing.footnote":"Kostenlos · Kein Account · Deine Daten bleiben auf deinem Gerät",
    "library.title":"Meine Skripte", "library.settings":"Einstellungen",
    "library.importBackup":"Backup importieren", "library.exportBackup":"Alle Skripte exportieren",
    "library.import":"Importieren", "library.newScript":"Neues Skript",
    "library.empty.title":"Keine Skripte vorhanden", "library.empty.sub":"Beginne mit deiner ersten Geschichte.",
    "library.favorites":"Favoriten", "library.myScripts":"Meine Skripte",
    "library.tutorial.sub":"Lerne die wichtigsten Drehbuch-Elemente kennen.",
    "library.pages_one":"Seite", "library.pages_other":"Seiten",
    "library.lastEdited":"Zuletzt bearbeitet —",
    "card.open":"Öffnen", "card.rename":"Umbenennen", "card.duplicate":"Duplizieren", "card.delete":"Löschen",
    "settings.title":"Einstellungen", "settings.language":"Sprache", "settings.languageHint":"Wähle Deutsch oder English.",
    "settings.darkMode":"Dark Mode", "settings.darkModeHint":"Dunkle Oberfläche, das Drehbuchblatt bleibt weiß.",
    "settings.titlePage":"Titelseite anzeigen", "settings.titlePageHint":"Fügt beim Export/Druck eine Titelseite hinzu.",
    "settings.pageNumbers":"Seitenzahlen", "settings.pageNumbersHint":"Zeigt Seitenzahlen ab Seite 2 oben rechts.",
    "settings.autosave":"Autosave", "settings.autosaveHint":"Speichert automatisch während des Schreibens.",
    "settings.fontSize":"Schriftgröße", "settings.fontSizeHint":"Größe des Drehbuchtexts.",
    "settings.fontSize.small":"Klein — 11pt", "settings.fontSize.default":"Standard — 12pt", "settings.fontSize.large":"Groß — 13pt",
    "settings.pageSize":"Seitengröße", "settings.pageSizeHint":"Papierformat für Seite & PDF-Export.",
    "settings.deleteAll":"Alle lokalen Daten löschen", "settings.deleteAllHint":"Entfernt sämtliche gespeicherten Skripte unwiderruflich von diesem Gerät.",
    "settings.delete":"Löschen",
    "settings.privacy":"Deine Skripte werden ausschließlich auf deinem Gerät gespeichert. Kein Tracking, keine Werbung, keine Analytics.",
    "settings.deleteAll.confirmTitle":"Wirklich alle gespeicherten Skripte löschen?",
    "settings.deleteAll.confirmBody":"Diese Aktion kann nicht rückgängig gemacht werden.",
    "scriptSettings.title":"Skript-Einstellungen", "scriptSettings.titleField":"Titel", "scriptSettings.author":"Autor",
    "scriptSettings.titlePageHint":"Nur für dieses Skript.", "scriptSettings.apply":"Übernehmen",
    "pdf.title":"PDF exportieren", "pdf.full":"Komplettes Skript", "pdf.actor":"Skript für einen Charakter",
    "pdf.selectCharacter":"Charakter auswählen", "pdf.color":"Markierungsfarbe",
    "pdf.noCharacters":"Dieses Skript enthält noch keine Charaktere.",
    "editor.backTitle":"Zurück zu Meine Skripte", "editor.saved":"Gespeichert", "editor.saving":"Speichert …",
    "editor.notSaved":"Nicht gespeichert", "editor.savedCheck":"✓ Gespeichert", "editor.savingCheck":"Speichert …",
    "editor.notSavedCheck":"⚠ Nicht gespeichert",
    "editor.bold":"Fett (Auswahl)", "editor.italic":"Kursiv (Auswahl)", "editor.undo":"Rückgängig", "editor.redo":"Wiederholen",
    "editor.focus":"Fokusmodus", "editor.print":"Drucken (Strg+P)", "editor.export":"Exportieren",
    "editor.exportPdf":"Als PDF exportieren", "editor.exportScriptino":"Als .scriptino speichern",
    "editor.scriptSettings":"Skript-Einstellungen",
    "el.sceneheading":"Scene Heading", "el.action":"Action", "el.character":"Character", "el.dialogue":"Dialogue",
    "el.parenthetical":"Parenthetical", "el.transition":"Transition", "el.shot":"Shot",
    "zoom.out":"Verkleinern", "zoom.in":"Vergrößern", "zoom.reset":"Zoom zurücksetzen (100%)",
    "tutorial.readonly":"Schreibgeschützt", "tutorial.badge":"TUTORIAL",
    "tutorial.cantDelete":"Das Tutorial kann nicht gelöscht werden.",
    "tutorial.readonlyToast":"Das Tutorial ist schreibgeschützt. Dupliziere es, um es zu bearbeiten.",
    "rename.title":"Skript umbenennen",
    "common.cancel":"Abbrechen", "common.confirm":"Bestätigen", "common.save":"Speichern",
    "script.untitled":"Unbenanntes Skript",
    "confirm.delete.title":"Skript löschen?", "confirm.delete.body":"„{title}“ wird unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.",
    "toast.saveScriptError":"Skript konnte nicht gespeichert werden (Speicher voll?).",
    "toast.settingsError":"Einstellungen konnten nicht gespeichert werden.",
    "toast.storageError":"Speicherfehler: lokaler Speicher voll oder blockiert.",
    "toast.scriptSaved":"Skript gespeichert.", "toast.saveFailed":"Speichern fehlgeschlagen.",
    "toast.scriptDeleted":"Skript gelöscht.", "toast.scriptDuplicated":"Skript dupliziert.",
    "toast.scriptRenamed":"Skript umbenannt.", "toast.scriptNotFound":"Dieses Skript konnte nicht gefunden werden.",
    "toast.allDataDeleted":"Alle lokalen Daten wurden gelöscht.",
    "toast.pdfExported":"PDF wurde exportiert.", "toast.pdfExportedFor":"PDF für {name} exportiert.",
    "toast.pdfLibError":"PDF-Bibliothek konnte nicht geladen werden. Prüfe deine Internetverbindung.",
    "toast.pdfExportFailed":"PDF-Export fehlgeschlagen.", "toast.noScriptOpen":"Kein Skript geöffnet.",
    "toast.scriptinoExported":"Skript als .scriptino exportiert.", "toast.exportFailed":"Export fehlgeschlagen.",
    "toast.scriptImported":"Skript importiert.", "toast.importFailed":"Diese Datei konnte nicht importiert werden.",
    "toast.backupExported":"{count} Skripte als Backup exportiert.", "toast.backupExportFailed":"Backup-Export fehlgeschlagen.",
    "toast.backupImported":"{count} Skripte aus Backup importiert.", "toast.backupImportFailed":"Diese Backup-Datei konnte nicht importiert werden.",
    "toast.noLocalStorage":"Dein Browser unterstützt keinen lokalen Speicher. Skripte können nicht gespeichert werden.",
    "toast.printUnsupported":"Drucken wird von diesem Browser nicht unterstützt.",
    "focus.hint":"ESC zum Verlassen des Fokusmodus",
    "help.title":"Hilfe", "help.subtitle":"Alles, was du über Scriptino wissen musst.",
    "help.whatIs.h":"Was ist Scriptino?",
    "help.whatIs.p1":"Scriptino ist ein kostenloser Drehbuch-Editor, mit dem du Filmskripte professionell formatieren, schreiben, speichern und als PDF exportieren kannst.",
    "help.whatIs.p2":"Deine Skripte werden ausschließlich lokal auf deinem Gerät gespeichert. Es ist kein Account und keine Registrierung erforderlich — du öffnest Scriptino und kannst sofort loslegen.",
    "help.start.h":"Erste Schritte",
    "help.start.li1.b":"Neues Skript erstellen", "help.start.li1.t":"— auf der Startseite oder in „Meine Skripte“ über den Button „+ Neues Skript“.",
    "help.start.li2.b":"Titel und Autor einstellen", "help.start.li2.t":"— über das Einstellungs-Symbol im Editor (Skript-Einstellungen).",
    "help.start.li3.b":"Drehbuch schreiben", "help.start.li3.t":"— direkt in die Seite tippen, Scriptino formatiert automatisch mit.",
    "help.start.li4.b":"Elementtypen verwenden", "help.start.li4.t":"— über das Dropdown in der Toolbar oder mit TAB durchschalten.",
    "help.start.li5.b":"Speichern", "help.start.li5.t":"— passiert automatisch (Autosave), oder manuell mit",
    "help.start.li6.b":"PDF exportieren", "help.start.li6.t":"— über das Download-Symbol in der Toolbar.",
    "help.start.li7.b":"Skript exportieren/importieren", "help.start.li7.t":"— als .scriptino-Datei, um es zu sichern oder auf einem anderen Gerät weiterzuschreiben.",
    "help.elements.h":"Drehbuch-Elemente", "help.elements.p":"Scriptino unterstützt alle klassischen Screenplay-Elemente:",
    "help.el.sceneheading":"Scene Heading", "help.el.action":"Action", "help.el.action.ex":"Julius geht langsam durch den Flur.",
    "help.el.character":"Character", "help.el.dialogue":"Dialogue", "help.el.dialogue.ex":"Ich glaube, wir sollten gehen.",
    "help.el.parenthetical":"Parenthetical", "help.el.parenthetical.ex":"(leise)", "help.el.transition":"Transition", "help.el.shot":"Shot",
    "help.shortcuts.h":"Tastenkürzel", "help.shortcuts.col1":"Kürzel", "help.shortcuts.col2":"Funktion",
    "help.shortcuts.save":"Speichern", "help.shortcuts.undo":"Rückgängig", "help.shortcuts.redo":"Wiederholen",
    "help.shortcuts.print":"Drucken", "help.shortcuts.pdf":"PDF exportieren",
    "help.shortcuts.tab":"Nächstes Element / Vorschlag übernehmen", "help.shortcuts.shifttab":"Vorheriges Element",
    "help.shortcuts.esc":"Fokusmodus verlassen / Vorschläge schließen", "help.shortcuts.arrows":"Navigation zwischen Elementen",
    "help.shortcuts.zoom":"Dokument zoomen",
    "help.suggest.h":"Character-Vorschläge",
    "help.suggest.p":"Scriptino erkennt automatisch alle Charaktere, die bereits in deinem Skript vorkommen. Existiert zum Beispiel schon TOM, genügt es, bei einem neuen Character-Element den Anfang einzutippen — Scriptino schlägt den passenden Namen vor. Mit Tab übernimmst du den Vorschlag.",
    "help.actor.h":"Schauspieler-PDF",
    "help.actor.p":"Beim PDF-Export kannst du optional einen Charakter auswählen. Scriptino hebt dann automatisch dessen Dialog farblich hervor, sodass ein Schauspieler seine eigenen Zeilen auf einen Blick findet.",
    "help.autosave.h":"Autosave",
    "help.autosave.p":"Scriptino speichert automatisch während des Schreibens — lokal auf deinem Gerät. Du musst dich um nichts kümmern; ein kleiner Hinweis in der Statusleiste zeigt dir den Speicherstatus.",
    "help.io.h":"Import / Export",
    "help.io.p":"Jedes Skript lässt sich als eigene .scriptino-Datei exportieren — ein einfaches, textbasiertes Format, das dein gesamtes Skript inklusive Formatierung enthält. Über „Skript importieren“ kannst du eine solche Datei (oder eine .txt-Datei) wieder öffnen, etwa auf einem anderen Computer.",
    "help.faq.h":"FAQ",
    "help.faq.q1":"Muss ich einen Account erstellen?", "help.faq.a1":"Nein. Scriptino funktioniert vollständig ohne Account.",
    "help.faq.q2":"Wo werden meine Skripte gespeichert?", "help.faq.a2":"Die Skripte werden lokal auf deinem Gerät gespeichert.",
    "help.faq.q3":"Kann ich meine Skripte auf einem anderen Computer öffnen?", "help.faq.a3":"Ja. Exportiere dein Skript als .scriptino-Datei und importiere es auf dem anderen Gerät.",
    "help.faq.q4":"Kann ich mein Skript als PDF speichern?", "help.faq.a4":"Ja, jederzeit über das Download-Symbol in der Toolbar oder mit Strg/Cmd + E.",
    "help.faq.q5":"Kann ich ein Skript für einen bestimmten Schauspieler exportieren?", "help.faq.a5":"Ja. Beim PDF-Export kann ein Charakter ausgewählt werden, dessen Dialog dann farblich hervorgehoben wird.",
    "help.faq.q6":"Ist Scriptino kostenlos?", "help.faq.a6":"Ja, vollständig und ohne versteckte Kosten.",
    "help.faq.q7":"Kann ich Scriptino ohne Internet verwenden?", "help.faq.a7":"Das Schreiben, Speichern und Bearbeiten funktioniert vollständig offline. Für Icons und den PDF-Export lädt Scriptino beim ersten Öffnen kleine Bibliotheken über eine CDN — dafür ist einmalig eine Internetverbindung nötig.",
    "contact.h":"Noch Fragen?", "contact.about.h":"Fragen, Bugs oder Verbesserungsvorschläge?",
    "contact.p":"Wenn du Fragen, Probleme oder Verbesserungsvorschläge hast, kannst du dich gerne melden.",
    "about.title":"Über uns", "about.subtitle":"Die Idee und der Mensch hinter Scriptino.",
    "about.behind.h":"Hinter Scriptino",
    "about.behind.p1":"Hinter Scriptino steckt einsjulius, mit bürgerlichem Namen Julius. Julius ist 19 Jahre alt, Student aus Wien und hat Scriptino mit Hilfe von künstlicher Intelligenz gevibecodet.",
    "about.behind.p2":"Scriptino ist aus der Idee entstanden, einen einfachen und kostenlosen Drehbuch-Editor zu entwickeln, der professionell aussieht, aber trotzdem unkompliziert zu bedienen ist."
  },
  en: {
    "nav.library":"My Scripts", "nav.help":"Help", "nav.about":"About",
    "landing.tagline":"Write the story.", "landing.sub":"A simple editor for professional screenplays.",
    "landing.newScript":"New Script", "landing.import":"Import Script",
    "landing.viewLibrary":"View my scripts →",
    "landing.footnote":"Free · No account · Your data stays on your device",
    "library.title":"My Scripts", "library.settings":"Settings",
    "library.importBackup":"Import backup", "library.exportBackup":"Export all scripts",
    "library.import":"Import", "library.newScript":"New Script",
    "library.empty.title":"No scripts yet", "library.empty.sub":"Start with your first story.",
    "library.favorites":"Favorites", "library.myScripts":"My Scripts",
    "library.tutorial.sub":"Learn the most important screenplay elements.",
    "library.pages_one":"page", "library.pages_other":"pages",
    "library.lastEdited":"Last edited —",
    "card.open":"Open", "card.rename":"Rename", "card.duplicate":"Duplicate", "card.delete":"Delete",
    "settings.title":"Settings", "settings.language":"Language", "settings.languageHint":"Choose German or English.",
    "settings.darkMode":"Dark Mode", "settings.darkModeHint":"Dark interface, the screenplay page stays white.",
    "settings.titlePage":"Show title page", "settings.titlePageHint":"Adds a title page on export/print.",
    "settings.pageNumbers":"Page numbers", "settings.pageNumbersHint":"Shows page numbers from page 2 onward, top right.",
    "settings.autosave":"Autosave", "settings.autosaveHint":"Saves automatically as you write.",
    "settings.fontSize":"Font size", "settings.fontSizeHint":"Size of the screenplay text.",
    "settings.fontSize.small":"Small — 11pt", "settings.fontSize.default":"Default — 12pt", "settings.fontSize.large":"Large — 13pt",
    "settings.pageSize":"Page size", "settings.pageSizeHint":"Paper format for the page & PDF export.",
    "settings.deleteAll":"Delete all local data", "settings.deleteAllHint":"Permanently removes all saved scripts from this device.",
    "settings.delete":"Delete",
    "settings.privacy":"Your scripts are stored exclusively on your device. No tracking, no ads, no analytics.",
    "settings.deleteAll.confirmTitle":"Really delete all saved scripts?",
    "settings.deleteAll.confirmBody":"This action cannot be undone.",
    "scriptSettings.title":"Script Settings", "scriptSettings.titleField":"Title", "scriptSettings.author":"Author",
    "scriptSettings.titlePageHint":"Only for this script.", "scriptSettings.apply":"Apply",
    "pdf.title":"Export PDF", "pdf.full":"Full script", "pdf.actor":"Script for one character",
    "pdf.selectCharacter":"Select character", "pdf.color":"Highlight color",
    "pdf.noCharacters":"This script doesn't contain any characters yet.",
    "editor.backTitle":"Back to My Scripts", "editor.saved":"Saved", "editor.saving":"Saving …",
    "editor.notSaved":"Not saved", "editor.savedCheck":"✓ Saved", "editor.savingCheck":"Saving …",
    "editor.notSavedCheck":"⚠ Not saved",
    "editor.bold":"Bold (selection)", "editor.italic":"Italic (selection)", "editor.undo":"Undo", "editor.redo":"Redo",
    "editor.focus":"Focus mode", "editor.print":"Print (Ctrl+P)", "editor.export":"Export",
    "editor.exportPdf":"Export as PDF", "editor.exportScriptino":"Save as .scriptino",
    "editor.scriptSettings":"Script Settings",
    "el.sceneheading":"Scene Heading", "el.action":"Action", "el.character":"Character", "el.dialogue":"Dialogue",
    "el.parenthetical":"Parenthetical", "el.transition":"Transition", "el.shot":"Shot",
    "zoom.out":"Zoom out", "zoom.in":"Zoom in", "zoom.reset":"Reset zoom (100%)",
    "tutorial.readonly":"Read-only", "tutorial.badge":"TUTORIAL",
    "tutorial.cantDelete":"The tutorial can't be deleted.",
    "tutorial.readonlyToast":"The tutorial is read-only. Duplicate it to edit.",
    "rename.title":"Rename script",
    "common.cancel":"Cancel", "common.confirm":"Confirm", "common.save":"Save",
    "script.untitled":"Untitled Script",
    "confirm.delete.title":"Delete script?", "confirm.delete.body":"“{title}” will be permanently deleted. This action cannot be undone.",
    "toast.saveScriptError":"Couldn't save script (storage full?).",
    "toast.settingsError":"Couldn't save settings.",
    "toast.storageError":"Storage error: local storage full or blocked.",
    "toast.scriptSaved":"Script saved.", "toast.saveFailed":"Save failed.",
    "toast.scriptDeleted":"Script deleted.", "toast.scriptDuplicated":"Script duplicated.",
    "toast.scriptRenamed":"Script renamed.", "toast.scriptNotFound":"This script could not be found.",
    "toast.allDataDeleted":"All local data has been deleted.",
    "toast.pdfExported":"PDF exported.", "toast.pdfExportedFor":"PDF for {name} exported.",
    "toast.pdfLibError":"PDF library could not be loaded. Check your internet connection.",
    "toast.pdfExportFailed":"PDF export failed.", "toast.noScriptOpen":"No script open.",
    "toast.scriptinoExported":"Script exported as .scriptino.", "toast.exportFailed":"Export failed.",
    "toast.scriptImported":"Script imported.", "toast.importFailed":"This file could not be imported.",
    "toast.backupExported":"{count} scripts exported as backup.", "toast.backupExportFailed":"Backup export failed.",
    "toast.backupImported":"{count} scripts imported from backup.", "toast.backupImportFailed":"This backup file could not be imported.",
    "toast.noLocalStorage":"Your browser doesn't support local storage. Scripts can't be saved.",
    "toast.printUnsupported":"Printing isn't supported by this browser.",
    "focus.hint":"Press ESC to exit focus mode",
    "help.title":"Help", "help.subtitle":"Everything you need to know about Scriptino.",
    "help.whatIs.h":"What is Scriptino?",
    "help.whatIs.p1":"Scriptino is a free screenplay editor that lets you format, write, save, and export film scripts as a professional PDF.",
    "help.whatIs.p2":"Your scripts are stored exclusively on your device. No account or registration is required — just open Scriptino and start writing.",
    "help.start.h":"Getting Started",
    "help.start.li1.b":"Create a new script", "help.start.li1.t":"— on the home screen or in “My Scripts” via the “+ New Script” button.",
    "help.start.li2.b":"Set title and author", "help.start.li2.t":"— via the settings icon in the editor (Script Settings).",
    "help.start.li3.b":"Write your screenplay", "help.start.li3.t":"— just type on the page, Scriptino formats as you go.",
    "help.start.li4.b":"Use element types", "help.start.li4.t":"— via the toolbar dropdown, or cycle through with TAB.",
    "help.start.li5.b":"Save", "help.start.li5.t":"— happens automatically (autosave), or manually with",
    "help.start.li6.b":"Export as PDF", "help.start.li6.t":"— via the download icon in the toolbar.",
    "help.start.li7.b":"Export/import a script", "help.start.li7.t":"— as a .scriptino file, to back it up or keep writing on another device.",
    "help.elements.h":"Screenplay Elements", "help.elements.p":"Scriptino supports all classic screenplay elements:",
    "help.el.sceneheading":"Scene Heading", "help.el.action":"Action", "help.el.action.ex":"Julius walks slowly down the hallway.",
    "help.el.character":"Character", "help.el.dialogue":"Dialogue", "help.el.dialogue.ex":"I think we should go.",
    "help.el.parenthetical":"Parenthetical", "help.el.parenthetical.ex":"(quietly)", "help.el.transition":"Transition", "help.el.shot":"Shot",
    "help.shortcuts.h":"Keyboard Shortcuts", "help.shortcuts.col1":"Shortcut", "help.shortcuts.col2":"Function",
    "help.shortcuts.save":"Save", "help.shortcuts.undo":"Undo", "help.shortcuts.redo":"Redo",
    "help.shortcuts.print":"Print", "help.shortcuts.pdf":"Export PDF",
    "help.shortcuts.tab":"Next element / accept suggestion", "help.shortcuts.shifttab":"Previous element",
    "help.shortcuts.esc":"Exit focus mode / close suggestions", "help.shortcuts.arrows":"Navigate between elements",
    "help.shortcuts.zoom":"Zoom document",
    "help.suggest.h":"Character Suggestions",
    "help.suggest.p":"Scriptino automatically recognizes every character already used in your script. If TOM already exists, typing “T” in a new Character element will suggest it — press Tab to accept.",
    "help.actor.h":"Actor PDF",
    "help.actor.p":"When exporting a PDF, you can optionally pick a character. Scriptino then highlights their dialogue automatically, so an actor can find their own lines at a glance.",
    "help.autosave.h":"Autosave",
    "help.autosave.p":"Scriptino saves automatically as you write — locally on your device. You don't have to do anything; a small indicator in the status bar shows the save status.",
    "help.io.h":"Import / Export",
    "help.io.p":"Every script can be exported as its own .scriptino file — a simple, text-based format containing your entire script including formatting. Use “Import script” to open such a file (or a .txt file) again, for example on another computer.",
    "help.faq.h":"FAQ",
    "help.faq.q1":"Do I need to create an account?", "help.faq.a1":"No. Scriptino works entirely without an account.",
    "help.faq.q2":"Where are my scripts stored?", "help.faq.a2":"Your scripts are stored locally on your device.",
    "help.faq.q3":"Can I open my scripts on another computer?", "help.faq.a3":"Yes. Export your script as a .scriptino file and import it on the other device.",
    "help.faq.q4":"Can I save my script as a PDF?", "help.faq.a4":"Yes, anytime via the download icon in the toolbar or Ctrl/Cmd + E.",
    "help.faq.q5":"Can I export a script for a specific actor?", "help.faq.a5":"Yes. When exporting a PDF, you can select a character whose dialogue will then be highlighted.",
    "help.faq.q6":"Is Scriptino free?", "help.faq.a6":"Yes, completely, with no hidden costs.",
    "help.faq.q7":"Can I use Scriptino without internet?", "help.faq.a7":"Writing, saving, and editing works fully offline. For icons and PDF export, Scriptino loads a couple of small libraries from a CDN the first time you open it — that requires an internet connection once.",
    "contact.h":"Still have questions?", "contact.about.h":"Questions, bugs, or suggestions?",
    "contact.p":"If you have questions, run into a problem, or have a suggestion, feel free to reach out.",
    "about.title":"About", "about.subtitle":"The idea and the person behind Scriptino.",
    "about.behind.h":"Behind Scriptino",
    "about.behind.p1":"Scriptino is built by einsjulius, whose real name is Julius. Julius is 19 years old, a student from Vienna, and vibe-coded Scriptino with the help of artificial intelligence.",
    "about.behind.p2":"Scriptino grew out of the idea of building a simple, free screenplay editor that looks professional but is still effortless to use."
  }
};

function detectBrowserLanguage(){
  try{
    const lang = (navigator.language || navigator.userLanguage || "en").toLowerCase();
    return lang.startsWith("de") ? "de" : "en";
  }catch(e){ return "en"; }
}
function loadLanguage(){
  try{
    const stored = localStorage.getItem(KEY_LANG);
    if(stored === "de" || stored === "en") return stored;
  }catch(e){ /* ignore */ }
  return detectBrowserLanguage();
}
function saveLanguage(lang){
  try{ localStorage.setItem(KEY_LANG, lang); }catch(e){ /* ignore */ }
}
function t(key, vars){
  const dict = TRANSLATIONS[App.lang] || TRANSLATIONS.de;
  let str = dict[key] !== undefined ? dict[key] : (TRANSLATIONS.de[key] !== undefined ? TRANSLATIONS.de[key] : key);
  if(vars){
    Object.keys(vars).forEach(k => { str = str.replace("{" + k + "}", vars[k]); });
  }
  return str;
}
function applyTranslations(){
  document.documentElement.lang = App.lang;
  $all("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  $all("[data-i18n-placeholder]").forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  $all("[data-i18n-title]").forEach(el => { el.title = t(el.dataset.i18nTitle); });
  $all(".lang-btn").forEach(btn => btn.classList.toggle("is-active", btn.dataset.lang === App.lang));
}
function setLanguage(lang){
  if(lang !== "de" && lang !== "en") return;
  App.lang = lang;
  saveLanguage(lang);
  applyTranslations();
  if(App.currentScript) updateStatsLive();
  if(document.body.classList.contains("route-library")) renderLibrary();
}

const Storage = {
  loadSettings(){
    try{
      const raw = localStorage.getItem(KEY_SETTINGS);
      const defaults = {
        darkMode:false, autosave:true, pageNumbers:true, fontSize:12,
        pageSize:"letter", titlePageDefault:true
      };
      return raw ? Object.assign(defaults, JSON.parse(raw)) : defaults;
    }catch(e){
      return {darkMode:false, autosave:true, pageNumbers:true, fontSize:12, pageSize:"letter", titlePageDefault:true};
    }
  },
  saveSettings(settings){
    try{ localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings)); return true; }
    catch(e){ console.error(e); toast(t("toast.settingsError"), "error"); return false; }
  },
  loadIndex(){
    try{ return JSON.parse(localStorage.getItem(KEY_INDEX)) || []; }
    catch(e){ return []; }
  },
  saveIndex(idx){
    try{ localStorage.setItem(KEY_INDEX, JSON.stringify(idx)); return true; }
    catch(e){ console.error(e); toast(t("toast.storageError"), "error"); return false; }
  },
  loadScript(id){
    try{
      const script = JSON.parse(localStorage.getItem(KEY_SCRIPT_PREFIX + id));
      return script ? migrateScript(script) : null;
    }
    catch(e){ return null; }
  },
  saveScript(script, pageCount, bumpUpdatedAt){
    try{
      if(bumpUpdatedAt !== false) script.updatedAt = new Date().toISOString();
      localStorage.setItem(KEY_SCRIPT_PREFIX + script.id, JSON.stringify(script));
      const idx = this.loadIndex();
      const entry = {
        id: script.id, title: script.title || t("script.untitled"),
        author: script.author || "",
        updatedAt: script.updatedAt, createdAt: script.createdAt,
        pages: pageCount || 1,
        isFavorite: !!script.isFavorite,
        isTutorial: !!script.isTutorial,
        lastOpened: script.lastOpened || script.updatedAt
      };
      const i = idx.findIndex(s => s.id === script.id);
      if(i >= 0) idx[i] = entry; else idx.unshift(entry);
      this.saveIndex(idx);
      return true;
    }catch(e){
      console.error(e);
      toast(t("toast.saveScriptError"), "error");
      return false;
    }
  },
  deleteScript(id){
    try{
      localStorage.removeItem(KEY_SCRIPT_PREFIX + id);
      this.saveIndex(this.loadIndex().filter(s => s.id !== id));
      return true;
    }catch(e){ console.error(e); return false; }
  },
  deleteAll(){
    try{
      this.loadIndex().forEach(s => localStorage.removeItem(KEY_SCRIPT_PREFIX + s.id));
      localStorage.removeItem(KEY_INDEX);
      return true;
    }catch(e){ console.error(e); return false; }
  },
  touchLastOpened(id){
    try{
      const script = this.loadScript(id);
      if(!script) return;
      const now = new Date().toISOString();
      script.lastOpened = now;
      localStorage.setItem(KEY_SCRIPT_PREFIX + id, JSON.stringify(script));
      const idx = this.loadIndex();
      const i = idx.findIndex(s => s.id === id);
      if(i >= 0){ idx[i].lastOpened = now; this.saveIndex(idx); }
    }catch(e){ console.error(e); }
  }
};

function migrateScript(script){
  // Bestehende Skripte NIE zerstören — nur fehlende Felder sinnvoll ergänzen.
  if(script.isFavorite === undefined) script.isFavorite = false;
  if(script.isTutorial === undefined) script.isTutorial = false;
  if(!script.lastOpened) script.lastOpened = script.updatedAt || script.createdAt || new Date().toISOString();
  if(!script.settings) script.settings = { titlePage:true, pageNumbers:true };
  return script;
}

function newEmptyScript(title){
  const now = new Date().toISOString();
  return {
    version:1, id: uid("scr"),
    title: title || t("script.untitled"), author:"",
    elements: [ {id: uid("el"), type:"sceneheading", html:""} ],
    settings: { titlePage: App.settings.titlePageDefault, pageNumbers: App.settings.pageNumbers },
    isFavorite:false, isTutorial:false,
    createdAt: now, updatedAt: now, lastOpened: now
  };
}

const TUTORIAL_ID = "scr_tutorial_v1";
function tutorialScript(){
  const now = new Date().toISOString();
  const L = TUTORIAL_CONTENT[App.lang] || TUTORIAL_CONTENT.de;
  return {
    version:1, id: TUTORIAL_ID,
    title: L.title, author:"Scriptino",
    elements: L.elements.map(([type, text]) => ({id: uid("el"), type, html: escapeHTML(text)})),
    settings: { titlePage:true, pageNumbers:true },
    isFavorite:false, isTutorial:true,
    createdAt: now, updatedAt: now, lastOpened: now
  };
}

/* --------------------------------------------------------------------
   4. APP STATE
   -------------------------------------------------------------------- */
const App = {
  settings: Storage.loadSettings(),
  currentScript: null,
  currentPageCount: 1,
  focusMode: false,
  history: { stack: [], index: -1 },
  activeCardMenuId: null,
  zoom: loadZoom(),
  lang: loadLanguage()
};

function loadZoom(){
  try{
    const v = parseInt(localStorage.getItem(KEY_ZOOM), 10);
    if(!isNaN(v) && v >= 50 && v <= 200) return v;
  }catch(e){ /* ignore */ }
  return 100;
}
function saveZoom(v){
  try{ localStorage.setItem(KEY_ZOOM, String(v)); }catch(e){ /* ignore */ }
}

/* --------------------------------------------------------------------
   5. ROUTER
   -------------------------------------------------------------------- */
function setRoute(route){
  document.body.classList.remove("route-landing","route-library","route-editor","route-help","route-about");
  document.body.classList.add("route-" + route);
  $all(".view").forEach(v => v.classList.remove("is-active"));
  const map = {landing:"#view-landing", library:"#view-library", editor:"#view-editor", help:"#view-help", about:"#view-about"};
  $(map[route]).classList.add("is-active");
  $all(".navbar-link").forEach(link => link.classList.remove("is-active"));
  const navMap = {library:"#btnNavLibrary", help:"#btnNavHelp", about:"#btnNavAbout"};
  if(navMap[route]) $(navMap[route]).classList.add("is-active");
  window.scrollTo(0,0);
  if(route !== "editor") exitFocusMode(true);
}

function goLanding(){ setRoute("landing"); }
function goLibrary(){ renderLibrary(); setRoute("library"); }
function goHelp(){ setRoute("help"); }
function goAbout(){ setRoute("about"); }

function goEditor(scriptId){
  const script = Storage.loadScript(scriptId);
  if(!script){ toast(t("toast.scriptNotFound"), "error"); goLibrary(); return; }
  Storage.touchLastOpened(scriptId);
  setRoute("editor");
  loadScriptIntoEditor(script);
}

$("#btnNavBrand").addEventListener("click", goLibrary);
$("#btnNavLibrary").addEventListener("click", goLibrary);
$("#btnNavHelp").addEventListener("click", goHelp);
$("#btnNavAbout").addEventListener("click", goAbout);

/* --------------------------------------------------------------------
   6. LIBRARY VIEW
   -------------------------------------------------------------------- */
function renderLibrary(){
  const idx = Storage.loadIndex();
  const tutorial = idx.filter(e => e.isTutorial);
  const favorites = idx.filter(e => e.isFavorite && !e.isTutorial).sort((a,b) => new Date(b.lastOpened||b.updatedAt) - new Date(a.lastOpened||a.updatedAt));
  const rest = idx.filter(e => !e.isFavorite && !e.isTutorial).sort((a,b) => new Date(b.lastOpened||b.updatedAt) - new Date(a.lastOpened||a.updatedAt));

  const empty = $("#libraryEmpty");
  const favSection = $("#favoritesSection");
  const scriptsSection = $("#scriptsSection");
  const favGrid = $("#favoritesGrid");
  const grid = $("#libraryGrid");

  favGrid.innerHTML = ""; grid.innerHTML = "";

  if(tutorial.length === 0 && favorites.length === 0 && rest.length === 0){
    empty.hidden = false;
    favSection.hidden = true;
    scriptsSection.hidden = true;
    refreshIcons();
    return;
  }
  empty.hidden = true;

  tutorial.forEach(entry => grid.appendChild(buildScriptCard(entry)));
  favorites.forEach(entry => favGrid.appendChild(buildScriptCard(entry)));
  rest.forEach(entry => grid.appendChild(buildScriptCard(entry)));

  favSection.hidden = favorites.length === 0;
  scriptsSection.hidden = (tutorial.length + rest.length) === 0;
  $("#scriptsSectionTitle").textContent = t("library.myScripts");

  refreshIcons();
}

function buildScriptCard(entry){
  const card = document.createElement("div");
  card.className = "script-card" + (entry.isTutorial ? " is-tutorial" : "");
  card.dataset.id = entry.id;
  card.innerHTML = `
    <div class="script-card-top">
      <div>
        <h3 class="script-card-title"></h3>
        <span class="script-card-tag"></span>
        <p class="script-card-author" hidden></p>
      </div>
      <div class="script-card-top-actions">
        ${entry.isTutorial ? "" : `<button class="script-card-fav-btn" type="button" title="Favorit" aria-label="Favorit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="12 2.5 15.1 9 22.2 9.9 17 14.9 18.3 22 12 18.6 5.7 22 7 14.9 1.8 9.9 8.9 9"/></svg>
        </button>`}
        <button class="icon-btn script-card-menu-btn" type="button" title="Optionen" aria-label="Optionen">
          <i data-lucide="more-vertical"></i>
        </button>
      </div>
    </div>
    <div class="script-card-meta">
      <p class="script-card-pages"></p>
      <p class="script-card-edited"></p>
    </div>
  `;
  card.querySelector(".script-card-title").textContent = entry.title || t("script.untitled");
  const tag = card.querySelector(".script-card-tag");
  if(entry.isTutorial){
    tag.textContent = t("tutorial.badge");
    tag.classList.add("tutorial-tag");
    const sub = document.createElement("p");
    sub.className = "script-card-author";
    sub.textContent = t("library.tutorial.sub");
    card.querySelector(".script-card-top > div").appendChild(sub);
  } else {
    tag.textContent = "Drehbuch";
    if(entry.author){
      const authorEl = card.querySelector(".script-card-author");
      authorEl.textContent = entry.author;
      authorEl.hidden = false;
    }
  }
  card.querySelector(".script-card-edited").textContent = t("library.lastEdited") + " " + formatDateShort(entry.updatedAt);
  const pagesLabel = entry.pages === 1 ? t("library.pages_one") : t("library.pages_other");
  card.querySelector(".script-card-pages").textContent = (entry.pages || 1) + " " + pagesLabel;

  card.addEventListener("click", (e) => {
    if(e.target.closest(".script-card-menu-btn") || e.target.closest(".card-menu") || e.target.closest(".script-card-fav-btn")) return;
    goEditor(entry.id);
  });
  const favBtn = card.querySelector(".script-card-fav-btn");
  if(favBtn){
    favBtn.classList.toggle("is-favorite", !!entry.isFavorite);
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(entry.id);
    });
  }
  card.querySelector(".script-card-menu-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    toggleCardMenu(card, entry);
  });
  return card;
}

function toggleFavorite(id){
  const script = Storage.loadScript(id);
  if(!script) return;
  script.isFavorite = !script.isFavorite;
  Storage.saveScript(script, estimatePageCount(script));
  renderLibrary();
}

function toggleCardMenu(card, entry){
  closeAllCardMenus();
  const menu = document.createElement("div");
  menu.className = "card-menu";
  const items = [`<button type="button" data-act="open"><i data-lucide="edit-3"></i> ${t("card.open")}</button>`];
  if(!entry.isTutorial){
    items.push(`<button type="button" data-act="rename"><i data-lucide="type"></i> ${t("card.rename")}</button>`);
  }
  items.push(`<button type="button" data-act="duplicate"><i data-lucide="copy"></i> ${t("card.duplicate")}</button>`);
  if(!entry.isTutorial){
    items.push(`<button type="button" data-act="delete" class="danger"><i data-lucide="trash-2"></i> ${t("card.delete")}</button>`);
  }
  menu.innerHTML = items.join("");
  card.appendChild(menu);
  refreshIcons();
  menu.addEventListener("click", (e) => {
    const btn = e.target.closest("button"); if(!btn) return;
    e.stopPropagation();
    const act = btn.dataset.act;
    closeAllCardMenus();
    if(act === "open") goEditor(entry.id);
    if(act === "rename") openRenameModal(entry.id, entry.title);
    if(act === "duplicate") duplicateScript(entry.id);
    if(act === "delete") confirmDeleteScript(entry.id, entry.title);
  });
}
function closeAllCardMenus(){ $all(".card-menu").forEach(m => m.remove()); }
document.addEventListener("click", closeAllCardMenus);

function duplicateScript(id){
  const script = Storage.loadScript(id);
  if(!script) return;
  const copy = deepClone(script);
  copy.id = uid("scr");
  copy.title = (script.title || t("script.untitled")) + (App.lang === "en" ? " (Copy)" : " (Kopie)");
  copy.isTutorial = false;
  copy.isFavorite = false;
  const now = new Date().toISOString();
  copy.createdAt = now; copy.updatedAt = now; copy.lastOpened = now;
  Storage.saveScript(copy, estimatePageCount(copy));
  toast(t("toast.scriptDuplicated"));
  renderLibrary();
}

function confirmDeleteScript(id, title){
  if(id === TUTORIAL_ID){ toast(t("tutorial.cantDelete"), "error"); return; }
  openConfirm({
    title: t("confirm.delete.title"),
    body: t("confirm.delete.body", {title: title || t("script.untitled")}),
    onConfirm(){
      Storage.deleteScript(id);
      toast(t("toast.scriptDeleted"));
      renderLibrary();
    }
  });
}

/* Rename modal */
let renameTargetId = null;
function openRenameModal(id, title){
  if(id === TUTORIAL_ID) return;
  renameTargetId = id;
  $("#renameInput").value = title || "";
  showModal("#modalRename");
  setTimeout(()=> $("#renameInput").focus(), 30);
}
function closeRenameModal(){ hideModal("#modalRename"); renameTargetId = null; }
$("#btnCloseRename").addEventListener("click", closeRenameModal);
$("#btnRenameSave").addEventListener("click", () => {
  if(!renameTargetId) return;
  const script = Storage.loadScript(renameTargetId);
  if(!script){ closeRenameModal(); return; }
  script.title = $("#renameInput").value.trim() || t("script.untitled");
  Storage.saveScript(script, estimatePageCount(script));
  if(App.currentScript && App.currentScript.id === script.id){
    App.currentScript.title = script.title;
    $("#scriptTitleInput").value = script.title;
  }
  closeRenameModal();
  toast(t("toast.scriptRenamed"));
  renderLibrary();
});
$("#renameInput").addEventListener("keydown", (e) => { if(e.key === "Enter"){ e.preventDefault(); $("#btnRenameSave").click(); } });

function estimatePageCount(script){
  // Grobe Schätzung für Bibliotheks-Karten (~55 Zeilen/Seite), echte Zählung passiert im Editor.
  const words = script.elements.reduce((sum, el) => sum + stripToPlainText(el.html).split(/\s+/).filter(Boolean).length, 0);
  return Math.max(1, Math.round(words / 220));
}

/* --------------------------------------------------------------------
   7. CONFIRM MODAL (generic)
   -------------------------------------------------------------------- */
let confirmCallback = null;
function openConfirm({title, body, onConfirm}){
  $("#confirmTitle").textContent = title;
  $("#confirmBody").textContent = body;
  confirmCallback = onConfirm;
  showModal("#modalConfirm");
}
$("#btnConfirmCancel").addEventListener("click", () => hideModal("#modalConfirm"));
$("#btnConfirmOk").addEventListener("click", () => {
  const cb = confirmCallback;
  hideModal("#modalConfirm");
  if(cb) cb();
});

/* --------------------------------------------------------------------
   8. MODAL HELPERS
   -------------------------------------------------------------------- */
function showModal(sel){ const m = $(sel); m.hidden = false; refreshIcons(); }
function hideModal(sel){ $(sel).hidden = true; }
$all(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", (e) => { if(e.target === overlay) overlay.hidden = true; });
});
document.addEventListener("keydown", (e) => {
  if(e.key === "Escape"){
    let closedModal = false;
    $all(".modal-overlay").forEach(m => { if(!m.hidden){ m.hidden = true; closedModal = true; } });
    if(!closedModal && App.focusMode) exitFocusMode();
  }
});

/* --------------------------------------------------------------------
   9. GLOBAL SETTINGS MODAL
   -------------------------------------------------------------------- */
function openSettingsModal(){
  $("#settingDarkMode").checked = !!App.settings.darkMode;
  $("#settingTitlePage").checked = !!App.settings.titlePageDefault;
  $("#settingPageNumbers").checked = !!App.settings.pageNumbers;
  $("#settingAutosave").checked = !!App.settings.autosave;
  $("#settingFontSize").value = String(App.settings.fontSize || 12);
  $("#settingPageSize").value = App.settings.pageSize || "letter";
  $all("#langSwitchSettings .lang-btn").forEach(btn => btn.classList.toggle("is-active", btn.dataset.lang === App.lang));
  showModal("#modalSettings");
}
$("#btnOpenSettings").addEventListener("click", openSettingsModal);
$("#btnEditorSettings").addEventListener("click", openScriptSettingsModal);
$("#btnCloseSettings").addEventListener("click", () => hideModal("#modalSettings"));

$all(".lang-btn").forEach(btn => {
  btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
});

function applyGlobalSetting(key, value){
  App.settings[key] = value;
  Storage.saveSettings(App.settings);
  if(key === "darkMode") applyDarkMode();
  if((key === "pageSize" || key === "fontSize") && App.currentScript) repaginate(true);
  if(key === "pageNumbers" && App.currentScript){
    // Globale Vorgabe ändert nicht automatisch bestehende Skripte — nur neue.
  }
}
$("#settingDarkMode").addEventListener("change", e => applyGlobalSetting("darkMode", e.target.checked));
$("#settingTitlePage").addEventListener("change", e => applyGlobalSetting("titlePageDefault", e.target.checked));
$("#settingPageNumbers").addEventListener("change", e => applyGlobalSetting("pageNumbers", e.target.checked));
$("#settingAutosave").addEventListener("change", e => applyGlobalSetting("autosave", e.target.checked));
$("#settingFontSize").addEventListener("change", e => applyGlobalSetting("fontSize", parseInt(e.target.value,10)));
$("#settingPageSize").addEventListener("change", e => applyGlobalSetting("pageSize", e.target.value));

$("#btnDeleteAllData").addEventListener("click", () => {
  openConfirm({
    title: t("settings.deleteAll.confirmTitle"),
    body: t("settings.deleteAll.confirmBody"),
    onConfirm(){
      Storage.deleteAll();
      hideModal("#modalSettings");
      App.currentScript = null;
      toast(t("toast.allDataDeleted"));
      seedTutorialIfNeeded();
      goLibrary();
    }
  });
});

function applyDarkMode(){
  document.documentElement.classList.toggle("dark", !!App.settings.darkMode);
}

/* --------------------------------------------------------------------
   10. SCRIPT SETTINGS MODAL (Titel/Autor/Titelseite je Skript)
   -------------------------------------------------------------------- */
function openScriptSettingsModal(){
  if(!App.currentScript) return;
  if(App.currentScript.isTutorial){ toast(t("tutorial.readonlyToast")); return; }
  $("#fieldScriptTitle").value = App.currentScript.title || "";
  $("#fieldScriptAuthor").value = App.currentScript.author || "";
  $("#fieldShowTitlePage").checked = !!App.currentScript.settings.titlePage;
  showModal("#modalScriptSettings");
}
$("#btnCloseScriptSettings").addEventListener("click", () => hideModal("#modalScriptSettings"));
$("#btnSaveScriptSettings").addEventListener("click", () => {
  if(!App.currentScript) return;
  App.currentScript.title = $("#fieldScriptTitle").value.trim() || t("script.untitled");
  App.currentScript.author = $("#fieldScriptAuthor").value.trim();
  App.currentScript.settings.titlePage = $("#fieldShowTitlePage").checked;
  $("#scriptTitleInput").value = App.currentScript.title;
  hideModal("#modalScriptSettings");
  pushHistory();
  repaginate(true);
  scheduleAutosave();
});

/* --------------------------------------------------------------------
   11. EDITOR — load / caret helpers
   -------------------------------------------------------------------- */
function loadScriptIntoEditor(script){
  App.currentScript = script;
  App.history = { stack:[deepClone(script)], index:0 };
  $("#scriptTitleInput").value = script.title || t("script.untitled");
  $("#scriptTitleInput").disabled = !!script.isTutorial;
  $("#tutorialLockBadge").hidden = !script.isTutorial;
  setSaveState("saved");
  repaginate(true);
}

function getCaretOffset(el){
  const sel = window.getSelection();
  if(!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  if(!el.contains(range.startContainer)) return 0;
  const pre = range.cloneRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.startContainer, range.startOffset);
  return pre.toString().length;
}
function setCaretOffset(el, offset){
  const range = document.createRange();
  const sel = window.getSelection();
  let node = null, remaining = offset;
  (function walk(n){
    if(node) return;
    if(n.nodeType === Node.TEXT_NODE){
      const len = n.textContent.length;
      if(remaining <= len){ node = n; return; }
      remaining -= len;
    } else {
      for(const child of n.childNodes){ walk(child); if(node) return; }
    }
  })(el);
  try{
    if(node){ range.setStart(node, Math.max(0, Math.min(remaining, node.textContent.length))); }
    else { range.selectNodeContents(el); range.collapse(false); }
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }catch(e){ /* Caret-Wiederherstellung best effort */ }
}
function captureCaret(){
  const active = document.activeElement;
  if(active && active.classList && active.classList.contains("el")){
    return { id: active.dataset.id, offset: getCaretOffset(active) };
  }
  return null;
}
function restoreCaret(caret){
  if(!caret) return;
  const node = $(`#pagesContainer .el[data-id="${caret.id}"]`);
  if(node){ node.focus(); setCaretOffset(node, caret.offset); }
}

function getCaretRect(node){
  const sel = window.getSelection();
  if(!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0).cloneRange();
  range.collapse(true);
  let rect = range.getClientRects()[0];
  if(!rect || (rect.width === 0 && rect.height === 0)) rect = range.getBoundingClientRect();
  if(!rect) return null;
  return { top: rect.top, bottom: rect.bottom };
}
function focusElementAt(index, where){
  const els = elementsArr();
  if(index < 0 || index >= els.length) return;
  const target = els[index];
  const node = $(`#pagesContainer .el[data-id="${target.id}"]`);
  if(!node) return;
  node.focus();
  const len = stripToPlainText(target.html).length;
  setCaretOffset(node, where === "end" ? len : 0);
}

/* --------------------------------------------------------------------
   12. ELEMENT LOOKUP / MUTATION HELPERS
   -------------------------------------------------------------------- */
function elementsArr(){ return App.currentScript.elements; }
function findIndexById(id){ return elementsArr().findIndex(e => e.id === id); }

function setSaveState(state){
  const topLabel = $("#topbarSaveState");
  const bottomLabel = $("#autosaveLine");
  if(state === "saving"){
    topLabel.textContent = t("editor.saving");
    bottomLabel.textContent = t("editor.savingCheck");
  } else if(state === "saved"){
    topLabel.textContent = t("editor.saved");
    bottomLabel.textContent = t("editor.savedCheck");
  } else if(state === "error"){
    topLabel.textContent = t("editor.notSaved");
    bottomLabel.textContent = t("editor.notSavedCheck");
  }
}

function updateStatsLive(){
  const els = elementsArr();
  let words = 0, chars = 0;
  els.forEach(e => {
    const text = stripToPlainText(e.html).trim();
    if(text){ words += text.split(/\s+/).filter(Boolean).length; chars += text.length; }
  });
  const minutes = Math.max(1, Math.round(App.currentPageCount * 1));
  const locale = App.lang === "de" ? "de-DE" : "en-US";
  const pagesLabel = App.currentPageCount === 1 ? t("library.pages_one") : t("library.pages_other");
  const wordsLabel = App.lang === "de" ? "Wörter" : "words";
  const minLabel = App.lang === "de" ? "ca." : "approx.";
  $("#statsLine").textContent = `${App.currentPageCount} ${pagesLabel} · ${words.toLocaleString(locale)} ${wordsLabel} · ${minLabel} ${minutes} Min.`;
}

/* --------------------------------------------------------------------
   13. PAGINATION ENGINE
   -------------------------------------------------------------------- */
function pageMetricsFor(settings){
  const size = PAGE_SIZES[App.settings.pageSize] || PAGE_SIZES.letter;
  const pageW = Math.round(size.wIn * DPI);
  const pageH = Math.round(size.hIn * DPI);
  const mTop = Math.round(MARGIN_IN.top * DPI);
  const mBottom = Math.round(MARGIN_IN.bottom * DPI);
  const mLeft = Math.round(MARGIN_IN.left * DPI);
  const mRight = Math.round(MARGIN_IN.right * DPI);
  const contentH = pageH - mTop - mBottom;
  return {pageW, pageH, mTop, mBottom, mLeft, mRight, contentH, fontSize: App.settings.fontSize || 12};
}

function applyPageVars(node, m){
  node.style.setProperty("--page-w", m.pageW + "px");
  node.style.setProperty("--page-h", m.pageH + "px");
  node.style.setProperty("--m-top", m.mTop + "px");
  node.style.setProperty("--m-bottom", m.mBottom + "px");
  node.style.setProperty("--m-left", m.mLeft + "px");
  node.style.setProperty("--m-right", m.mRight + "px");
  node.style.setProperty("--font-pt", m.fontSize + "pt");
  node.style.setProperty("--ind-character", IND_IN.character + "in");
  node.style.setProperty("--ind-dialogue", IND_IN.dialogue + "in");
  node.style.setProperty("--ind-parenthetical", IND_IN.parenthetical + "in");
  node.style.setProperty("--w-dialogue", IND_IN.dialogueW + "in");
  node.style.setProperty("--w-parenthetical", IND_IN.parentheticalW + "in");
}

function buildElNode(elData, editable){
  const div = document.createElement("div");
  div.className = "el type-" + elData.type + (elData.spaceBefore ? " has-space-before" : "");
  div.dataset.id = elData.id;
  div.dataset.type = elData.type;
  div.setAttribute("data-placeholder", getPlaceholder(elData.type));
  const isReadOnly = App.currentScript && App.currentScript.isTutorial;
  if(editable && !isReadOnly){
    div.contentEditable = "true";
    div.spellcheck = false;
    bindElEvents(div);
  }
  div.innerHTML = elData.html || "";
  return div;
}

function measureHeights(m){
  const measure = $("#pagesMeasure");
  measure.innerHTML = "";
  measure.style.width = (m.pageW - m.mLeft - m.mRight) + "px";
  applyPageVars(measure, m);
  measure.style.fontFamily = "var(--font-script)";
  const wrap = document.createElement("div");
  applyPageVars(wrap, m);
  measure.appendChild(wrap);

  let cumulative = 0;
  const heights = [];
  elementsArr().forEach(elData => {
    const node = buildElNode(elData, false);
    wrap.appendChild(node);
    const total = wrap.getBoundingClientRect().height;
    heights.push(Math.max(1, total - cumulative));
    cumulative = total;
  });
  return heights;
}

function packPages(heights, contentH){
  const pages = [];
  let current = [];
  let used = 0;
  heights.forEach((h, i) => {
    if(current.length > 0 && used + h > contentH){
      pages.push(current);
      current = [i];
      used = h;
    } else {
      current.push(i);
      used += h;
    }
  });
  if(current.length > 0) pages.push(current);
  if(pages.length === 0) pages.push([]);
  return pages;
}

function renderPages(pageGroups, m, caret){
  const container = $("#pagesContainer");
  container.innerHTML = "";
  const els = elementsArr();
  const script = App.currentScript;

  if(script.settings.titlePage){
    const tp = document.createElement("div");
    tp.className = "page title-page";
    applyPageVars(tp, m);
    tp.innerHTML = `
      <div class="title-page-fields">
        <div class="title-page-title">${escapeHTML(script.title || t("script.untitled"))}</div>
        <div class="title-page-by">von</div>
        <div class="title-page-author">${escapeHTML(script.author || " ")}</div>
      </div>`;
    container.appendChild(wrapInScaleContainer(tp));
  }

  pageGroups.forEach((group, pageIdx) => {
    const page = document.createElement("div");
    page.className = "page";
    applyPageVars(page, m);
    const content = document.createElement("div");
    content.className = "page-content";
    group.forEach(elIndex => {
      content.appendChild(buildElNode(els[elIndex], true));
    });
    page.appendChild(content);
    if(pageIdx > 0 && script.settings.pageNumbers){
      const num = document.createElement("div");
      num.className = "page-number";
      num.textContent = (pageIdx + 1) + ".";
      page.appendChild(num);
    }
    container.appendChild(wrapInScaleContainer(page));
  });

  refreshIcons();
  applyResponsiveScale();
  if(caret) restoreCaret(caret);
  repositionCharSuggest();
}

function wrapInScaleContainer(pageNode){
  const wrap = document.createElement("div");
  wrap.className = "page-scale-wrap";
  wrap.appendChild(pageNode);
  return wrap;
}

function applyResponsiveScale(){
  const stage = $("#editorStage");
  const firstPage = $(".page-scale-wrap .page");
  if(!stage || !firstPage) return;
  const available = stage.clientWidth - 24;
  const nativeW = firstPage.offsetWidth;
  const nativeH = firstPage.offsetHeight;
  if(available <= 0 || !nativeW) return;
  const fitScale = Math.max(0.1, Math.min(1, available / nativeW));
  const userZoom = (App.zoom || 100) / 100;
  const scale = fitScale * userZoom;
  $all(".page-scale-wrap").forEach(wrap => {
    const page = wrap.querySelector(".page");
    wrap.style.width = Math.round(nativeW * scale) + "px";
    wrap.style.height = Math.round(nativeH * scale) + "px";
    page.style.transform = scale !== 1 ? `scale(${scale})` : "none";
    page.style.transformOrigin = "top left";
  });
  updateZoomLabel();
}
window.addEventListener("resize", debounce(applyResponsiveScale, 150));

/* --------------------------------------------------------------------
   13b. DOCUMENT ZOOM (nur die Seite, nicht die UI)
   -------------------------------------------------------------------- */
function setZoom(newZoom){
  const clamped = Math.max(50, Math.min(200, Math.round(newZoom / 10) * 10));
  App.zoom = clamped;
  saveZoom(clamped);
  applyResponsiveScale();
}
function zoomIn(){ setZoom((App.zoom || 100) + 10); }
function zoomOut(){ setZoom((App.zoom || 100) - 10); }
function zoomReset(){ setZoom(100); }
function updateZoomLabel(){
  const label = $("#btnZoomReset");
  if(label) label.textContent = (App.zoom || 100) + "%";
  const outBtn = $("#btnZoomOut");
  const inBtn = $("#btnZoomIn");
  if(outBtn) outBtn.disabled = (App.zoom || 100) <= 50;
  if(inBtn) inBtn.disabled = (App.zoom || 100) >= 200;
}
const btnZoomIn = $("#btnZoomIn");
const btnZoomOut = $("#btnZoomOut");
const btnZoomReset = $("#btnZoomReset");
if(btnZoomIn) btnZoomIn.addEventListener("click", zoomIn);
if(btnZoomOut) btnZoomOut.addEventListener("click", zoomOut);
if(btnZoomReset) btnZoomReset.addEventListener("click", zoomReset);

const editorStageEl = $("#editorStage");
if(editorStageEl){
  editorStageEl.addEventListener("wheel", (e) => {
    if(!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    if(e.deltaY < 0) zoomIn();
    else if(e.deltaY > 0) zoomOut();
  }, { passive:false });
}

function repaginate(immediate){
  if(!App.currentScript) return;
  const run = () => {
    const caret = captureCaret();
    const m = pageMetricsFor(App.currentScript.settings);
    if(elementsArr().length === 0){
      elementsArr().push({id: uid("el"), type:"sceneheading", html:""});
    }
    const heights = measureHeights(m);
    const groups = packPages(heights, m.contentH);
    App.currentPageCount = groups.length;
    renderPages(groups, m, caret);
    updateStatsLive();
    scheduleAutosave();
  };
  if(immediate){ repaginateDebounced.cancel(); run(); }
  else repaginateDebounced();
}
const repaginateDebounced = debounce(() => {
  const caret = captureCaret();
  const m = pageMetricsFor(App.currentScript.settings);
  const heights = measureHeights(m);
  const groups = packPages(heights, m.contentH);
  App.currentPageCount = groups.length;
  renderPages(groups, m, caret);
  updateStatsLive();
  scheduleAutosave();
}, DEBOUNCE_REPAGINATE);

/* --------------------------------------------------------------------
   14. AUTOSAVE
   -------------------------------------------------------------------- */
const scheduleAutosave = debounce(() => {
  if(!App.currentScript) return;
  if(!App.settings.autosave){ setSaveState("saved"); return; }
  doSave();
}, DEBOUNCE_AUTOSAVE);

function doSave(showToast){
  if(!App.currentScript) return;
  setSaveState("saving");
  const ok = Storage.saveScript(App.currentScript, App.currentPageCount);
  setSaveState(ok ? "saved" : "error");
  if(showToast) toast(ok ? t("toast.scriptSaved") : t("toast.saveFailed"), ok ? undefined : "error");
}

/* --------------------------------------------------------------------
   15. HISTORY (Undo/Redo)
   -------------------------------------------------------------------- */
function pushHistory(){
  if(!App.currentScript) return;
  const snap = deepClone({elements: App.currentScript.elements, title: App.currentScript.title, author: App.currentScript.author, settings: App.currentScript.settings});
  const last = App.history.stack[App.history.index];
  if(last && JSON.stringify(last) === JSON.stringify(snap)) return;
  App.history.stack = App.history.stack.slice(0, App.history.index + 1);
  App.history.stack.push(snap);
  if(App.history.stack.length > HISTORY_LIMIT) App.history.stack.shift();
  App.history.index = App.history.stack.length - 1;
}
function applySnapshot(snap){
  App.currentScript.elements = deepClone(snap.elements);
  App.currentScript.title = snap.title;
  App.currentScript.author = snap.author;
  App.currentScript.settings = snap.settings;
  $("#scriptTitleInput").value = App.currentScript.title || t("script.untitled");
  repaginate(true);
  scheduleAutosave();
}
function captureScrollPos(){
  const stage = $("#editorStage");
  return {
    winX: window.scrollX, winY: window.scrollY,
    stageTop: stage ? stage.scrollTop : 0, stageLeft: stage ? stage.scrollLeft : 0
  };
}
function restoreScrollPos(pos){
  if(!pos) return;
  const apply = () => {
    window.scrollTo(pos.winX, pos.winY);
    const stage = $("#editorStage");
    if(stage){ stage.scrollTop = pos.stageTop; stage.scrollLeft = pos.stageLeft; }
  };
  apply();
  requestAnimationFrame(apply); // erneut anwenden, falls die Fokus-Wiederherstellung selbst gescrollt hat
}
function undo(){
  if(App.history.index <= 0) return;
  const scrollPos = captureScrollPos();
  App.history.index--;
  applySnapshot(App.history.stack[App.history.index]);
  restoreScrollPos(scrollPos);
}
function redo(){
  if(App.history.index >= App.history.stack.length - 1) return;
  const scrollPos = captureScrollPos();
  App.history.index++;
  applySnapshot(App.history.stack[App.history.index]);
  restoreScrollPos(scrollPos);
}

/* --------------------------------------------------------------------
   15b. CHARACTER-NAMENSVORSCHLÄGE (nur bei Elementtyp "character")
   -------------------------------------------------------------------- */
const CharSuggest = { open:false, elId:null, items:[], activeIndex:0 };

function getKnownCharacterNames(excludeId){
  const seen = new Map();
  elementsArr().forEach(e => {
    if(e.type !== "character" || e.id === excludeId) return;
    const text = stripToPlainText(e.html).trim();
    if(!text) return;
    const key = text.toUpperCase();
    if(!seen.has(key)) seen.set(key, text);
  });
  return Array.from(seen.values());
}

function updateCharSuggest(node, elData){
  const text = stripToPlainText(elData.html).trim();
  if(elData.type !== "character" || !text){
    closeCharSuggest();
    return;
  }
  const query = text.toUpperCase();
  const matches = getKnownCharacterNames(elData.id)
    .filter(n => n.toUpperCase().startsWith(query) && n.toUpperCase() !== query)
    .sort((a,b) => a.localeCompare(b, "de"));
  if(matches.length === 0){
    closeCharSuggest();
    return;
  }
  CharSuggest.open = true;
  CharSuggest.elId = elData.id;
  CharSuggest.items = matches.slice(0, 6);
  CharSuggest.activeIndex = 0;
  renderCharSuggest(node);
}

function renderCharSuggest(node){
  removeCharSuggestDom();
  const dd = document.createElement("div");
  dd.className = "char-suggest";
  dd.id = "charSuggestDropdown";
  CharSuggest.items.forEach((name, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "char-suggest-item" + (i === CharSuggest.activeIndex ? " active" : "");
    btn.textContent = name;
    btn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      applyCharSuggestion(name);
    });
    dd.appendChild(btn);
  });
  document.body.appendChild(dd);
  const rect = node.getBoundingClientRect();
  dd.style.left = Math.round(rect.left + window.scrollX) + "px";
  dd.style.top = Math.round(rect.bottom + window.scrollY + 4) + "px";
}

function removeCharSuggestDom(){
  const existing = document.getElementById("charSuggestDropdown");
  if(existing) existing.remove();
}

function repositionCharSuggest(){
  if(!CharSuggest.open) return;
  const dd = document.getElementById("charSuggestDropdown");
  const node = $(`#pagesContainer .el[data-id="${CharSuggest.elId}"]`);
  if(!dd || !node){ closeCharSuggest(); return; }
  const rect = node.getBoundingClientRect();
  dd.style.left = Math.round(rect.left + window.scrollX) + "px";
  dd.style.top = Math.round(rect.bottom + window.scrollY + 4) + "px";
}

function closeCharSuggest(){
  if(!CharSuggest.open && !document.getElementById("charSuggestDropdown")) return;
  CharSuggest.open = false;
  CharSuggest.elId = null;
  CharSuggest.items = [];
  CharSuggest.activeIndex = 0;
  removeCharSuggestDom();
}

function moveCharSuggest(dir){
  if(!CharSuggest.open) return;
  const n = CharSuggest.items.length;
  CharSuggest.activeIndex = (CharSuggest.activeIndex + dir + n) % n;
  $all(".char-suggest-item").forEach((btn, i) => btn.classList.toggle("active", i === CharSuggest.activeIndex));
}

function applyCharSuggestion(name){
  const idx = findIndexById(CharSuggest.elId);
  closeCharSuggest();
  if(idx === -1) return;
  const els = elementsArr();
  els[idx].html = escapeHTML(name);
  pushHistory();
  repaginate(true);
  requestAnimationFrame(() => restoreCaret({id: els[idx].id, offset: name.length}));
}

document.addEventListener("click", (e) => {
  if(!CharSuggest.open) return;
  if(e.target.closest(".char-suggest")) return;
  if(e.target.closest(`.el[data-id="${CharSuggest.elId}"]`)) return;
  closeCharSuggest();
});

/* --------------------------------------------------------------------
   16. ELEMENT EDITING (Enter / Tab / Backspace / Input)
   -------------------------------------------------------------------- */
function bindElEvents(node){
  node.addEventListener("input", onElInput);
  node.addEventListener("keydown", onElKeydown);
  node.addEventListener("focus", onElFocus);
  node.addEventListener("paste", onElPaste);
}

function onElFocus(e){
  $all(".el.is-focused").forEach(n => n.classList.remove("is-focused"));
  e.target.classList.add("is-focused");
  const sel = $("#elementTypeSelect");
  sel.value = e.target.dataset.type;
  if(CharSuggest.open && CharSuggest.elId !== e.target.dataset.id) closeCharSuggest();
}

function onElPaste(e){
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData("text/plain");
  document.execCommand("insertText", false, text.replace(/\r/g,""));
}

function onElInput(e){
  const node = e.target;
  const id = node.dataset.id;
  const idx = findIndexById(id);
  if(idx === -1) return;
  elementsArr()[idx].html = sanitizeInline(node.innerHTML);
  updateStatsLive();
  updateCharSuggest(node, elementsArr()[idx]);
  repaginate(false);
  historyInputDebounced();
}
const historyInputDebounced = debounce(() => pushHistory(), 700);

function onElKeydown(e){
  const node = e.target;
  const id = node.dataset.id;
  const idx = findIndexById(id);
  if(idx === -1) return;

  // Character-Autovervollständigung hat Vorrang, wenn für dieses Element offen.
  if(CharSuggest.open && CharSuggest.elId === id){
    if(e.key === "ArrowDown"){ e.preventDefault(); moveCharSuggest(1); return; }
    if(e.key === "ArrowUp"){ e.preventDefault(); moveCharSuggest(-1); return; }
    if(e.key === "Tab" || e.key === "Enter"){
      e.preventDefault();
      applyCharSuggestion(CharSuggest.items[CharSuggest.activeIndex]);
      return;
    }
    if(e.key === "Escape"){
      e.preventDefault();
      e.stopPropagation();
      closeCharSuggest();
      return;
    }
  }

  const meta = e.ctrlKey || e.metaKey;

  if(meta && e.key.toLowerCase() === "s"){ e.preventDefault(); doSave(true); return; }
  if(meta && e.key.toLowerCase() === "p"){ e.preventDefault(); triggerPrint(); return; }
  if(meta && e.key.toLowerCase() === "e"){ e.preventDefault(); openPdfExportModal(); return; }
  if(meta && !e.shiftKey && e.key.toLowerCase() === "z"){ e.preventDefault(); pushHistory(); undo(); return; }
  if(meta && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))){ e.preventDefault(); redo(); return; }
  if(meta && e.key.toLowerCase() === "b"){ e.preventDefault(); document.execCommand("bold"); onElInput(e); return; }
  if(meta && e.key.toLowerCase() === "i"){ e.preventDefault(); document.execCommand("italic"); onElInput(e); return; }

  if(e.key === "Enter"){
    e.preventDefault();
    handleEnter(idx, node);
    return;
  }
  if(e.key === "Tab"){
    e.preventDefault();
    cycleType(idx, e.shiftKey ? -1 : 1);
    return;
  }
  if(e.key === "Backspace"){
    const offset = getCaretOffset(node);
    const sel = window.getSelection();
    const collapsed = sel && sel.isCollapsed;
    if(offset === 0 && collapsed){
      e.preventDefault();
      const els = elementsArr();
      if(els[idx].spaceBefore){
        // Erster Backspace entfernt nur den Absatzabstand, zweiter fügt die Zeilen zusammen.
        delete els[idx].spaceBefore;
        pushHistory();
        repaginate(true);
        requestAnimationFrame(() => restoreCaret({id: els[idx].id, offset:0}));
        return;
      }
      mergeWithPrevious(idx);
      return;
    }
  }

  // Pfeiltasten-Navigation zwischen Elementen — die native Cursor-Bewegung darf zuerst
  // greifen (funktioniert normal in mehrzeiligem Text); nur wenn sie sich dadurch vertikal
  // nicht bewegt (Rand des Elements erreicht), springen wir zum Nachbar-Element.
  if((e.key === "ArrowUp" || e.key === "ArrowDown") && !e.shiftKey && !e.altKey && !meta){
    const dir = e.key === "ArrowUp" ? -1 : 1;
    const beforeRect = getCaretRect(node);
    setTimeout(() => {
      const afterRect = getCaretRect(node);
      const movedVertically = beforeRect && afterRect && Math.abs(afterRect.top - beforeRect.top) > 1;
      if(!movedVertically){
        if(dir === -1 && idx > 0) focusElementAt(idx - 1, "end");
        if(dir === 1 && idx < elementsArr().length - 1) focusElementAt(idx + 1, "start");
      }
    }, 0);
    return;
  }
}

function handleEnter(idx, node){
  const offset = getCaretOffset(node);
  const text = node.textContent || "";
  const before = text.slice(0, offset);
  const after = text.slice(offset);
  const els = elementsArr();

  // Doppel-ENTER auf einem bereits leeren Element -> echter Absatzabstand statt einer
  // weiteren leeren Zeile. Der Nutzer tippt danach einfach in dasselbe Element weiter.
  const currentIsEmpty = stripToPlainText(els[idx].html).trim() === "";
  if(currentIsEmpty && before.trim() === "" && after.trim() === ""){
    els[idx].spaceBefore = true;
    pushHistory();
    repaginate(true);
    requestAnimationFrame(() => restoreCaret({id: els[idx].id, offset:0}));
    return;
  }

  els[idx].html = escapeHTML(before);
  const nextType = ENTER_NEXT[els[idx].type] || "action";
  const newEl = {id: uid("el"), type: nextType, html: escapeHTML(after)};
  els.splice(idx + 1, 0, newEl);
  pushHistory();
  repaginate(true);
  requestAnimationFrame(() => restoreCaret({id: newEl.id, offset:0}));
}

function cycleType(idx, dir){
  const els = elementsArr();
  const caret = {id: els[idx].id, offset: getCaretOffset(document.activeElement)};
  const order = TYPE_ORDER;
  const cur = order.indexOf(els[idx].type);
  const next = (cur + dir + order.length) % order.length;
  els[idx].type = order[next];
  pushHistory();
  repaginate(true);
  requestAnimationFrame(() => restoreCaret(caret));
}

function mergeWithPrevious(idx){
  if(idx === 0) return;
  const els = elementsArr();
  const cur = els[idx];
  const prev = els[idx - 1];
  const prevLen = stripToPlainText(prev.html).length;
  if(stripToPlainText(cur.html).trim() === ""){
    els.splice(idx, 1);
  } else {
    prev.html = sanitizeInline((prev.html || "") + (cur.html || ""));
    els.splice(idx, 1);
  }
  pushHistory();
  repaginate(true);
  requestAnimationFrame(() => restoreCaret({id: prev.id, offset: prevLen}));
}

/* Toolbar: Element-Typ-Dropdown */
$("#elementTypeSelect").addEventListener("change", (e) => {
  const active = $(".el.is-focused") || $("#pagesContainer .el");
  if(!active) return;
  const idx = findIndexById(active.dataset.id);
  if(idx === -1) return;
  elementsArr()[idx].type = e.target.value;
  pushHistory();
  repaginate(true);
  requestAnimationFrame(() => restoreCaret({id: active.dataset.id, offset: 0}));
});
$("#btnBold").addEventListener("click", () => { document.execCommand("bold"); const a=$(".el.is-focused"); if(a) onElInput({target:a}); });
$("#btnItalic").addEventListener("click", () => { document.execCommand("italic"); const a=$(".el.is-focused"); if(a) onElInput({target:a}); });
$("#btnUndo").addEventListener("click", undo);
$("#btnRedo").addEventListener("click", redo);

/* --------------------------------------------------------------------
   17. TITLE INPUT / SCRIPT TITLE SYNC
   -------------------------------------------------------------------- */
$("#scriptTitleInput").addEventListener("input", (e) => {
  if(!App.currentScript) return;
  App.currentScript.title = e.target.value;
  if(App.currentScript.settings.titlePage) repaginate(false);
  scheduleAutosave();
});
$("#scriptTitleInput").addEventListener("blur", () => { pushHistory(); });

/* --------------------------------------------------------------------
   18. FOCUS MODE
   -------------------------------------------------------------------- */
function enterFocusMode(){
  App.focusMode = true;
  document.body.classList.add("focus-mode");
  $("#btnFocusMode").classList.add("is-active");
  showFocusHint();
}
function exitFocusMode(silent){
  if(!App.focusMode) return;
  App.focusMode = false;
  document.body.classList.remove("focus-mode");
  $("#btnFocusMode").classList.remove("is-active");
}
function showFocusHint(){
  let hint = $(".focus-exit-hint");
  if(!hint){
    hint = document.createElement("div");
    hint.className = "focus-exit-hint";
    hint.textContent = t("focus.hint");
    document.body.appendChild(hint);
  }
  hint.classList.add("show");
  setTimeout(()=> hint.classList.remove("show"), 2200);
}
$("#btnFocusMode").addEventListener("click", () => App.focusMode ? exitFocusMode() : enterFocusMode());

/* --------------------------------------------------------------------
   19. PRINT
   -------------------------------------------------------------------- */
function triggerPrint(){
  try{ window.print(); }catch(e){ toast(t("toast.printUnsupported"), "error"); }
}
$("#btnPrint").addEventListener("click", triggerPrint);

/* --------------------------------------------------------------------
   20. EXPORT MENU
   -------------------------------------------------------------------- */
$("#btnExportMenu").addEventListener("click", (e) => {
  e.stopPropagation();
  const menu = $("#exportMenu");
  menu.hidden = !menu.hidden;
});
document.addEventListener("click", (e) => {
  if(!e.target.closest(".export-menu-wrap")) $("#exportMenu").hidden = true;
});
$("#exportMenu").addEventListener("click", (e) => {
  const btn = e.target.closest("button"); if(!btn) return;
  $("#exportMenu").hidden = true;
  if(btn.dataset.action === "pdf") openPdfExportModal();
  if(btn.dataset.action === "scriptino") exportScriptino();
});

function exportScriptino(){
  if(!App.currentScript) return;
  try{
    const payload = deepClone(App.currentScript);
    const json = JSON.stringify(payload, null, 2);
    const filename = safeFilename(App.currentScript.title) + ".scriptino";
    if(download(filename, json, "application/json")) toast(t("toast.scriptinoExported"));
    else toast(t("toast.exportFailed"), "error");
  }catch(e){ console.error(e); toast(t("toast.exportFailed"), "error"); }
}

/* --------------------------------------------------------------------
   20b. PDF-EXPORT-DIALOG
   -------------------------------------------------------------------- */
function openPdfExportModal(){
  if(!App.currentScript) return;
  $("#pdfModeFull").checked = true;
  $("#pdfModeCharacter").checked = false;
  $("#pdfCharacterOptions").hidden = true;
  $("#pdfHighlightColor").value = "#fff3a0";

  const names = getKnownCharacterNames();
  const select = $("#pdfCharacterSelect");
  select.innerHTML = "";
  names.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name; opt.textContent = name;
    select.appendChild(opt);
  });

  const hasCharacters = names.length > 0;
  $("#pdfModeCharacterRow").style.opacity = hasCharacters ? "1" : "0.5";
  $("#pdfModeCharacter").disabled = !hasCharacters;
  $("#pdfNoCharactersHint").hidden = hasCharacters;

  showModal("#modalPdfExport");
}
function closePdfExportModal(){ hideModal("#modalPdfExport"); }

$("#btnClosePdfExport").addEventListener("click", closePdfExportModal);
$("#btnCancelPdfExport").addEventListener("click", closePdfExportModal);
$("#pdfModeFull").addEventListener("change", () => { $("#pdfCharacterOptions").hidden = true; });
$("#pdfModeCharacter").addEventListener("change", () => { $("#pdfCharacterOptions").hidden = false; });
$("#btnConfirmPdfExport").addEventListener("click", () => {
  const isCharacterMode = $("#pdfModeCharacter").checked;
  closePdfExportModal();
  if(isCharacterMode){
    const character = $("#pdfCharacterSelect").value;
    const color = $("#pdfHighlightColor").value;
    exportPDF({ character, color });
  } else {
    exportPDF();
  }
});

/* --------------------------------------------------------------------
   21. PDF EXPORT
   -------------------------------------------------------------------- */
function hexToRgb(hex){
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex||"").trim());
  if(!m) return [255, 243, 160];
  return [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16)];
}
function escapeRegExp(str){
  return String(str||"").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function textMentionsCharacter(text, name){
  const escaped = escapeRegExp(String(name||"").trim());
  if(!escaped) return false;
  let re;
  try{ re = new RegExp("(^|[^\\p{L}\\p{N}])" + escaped + "([^\\p{L}\\p{N}]|$)", "iu"); }
  catch(e){ re = new RegExp("(^|[^a-zA-ZäöüÄÖÜß0-9])" + escaped + "([^a-zA-ZäöüÄÖÜß0-9]|$)", "i"); }
  return re.test(text);
}
function drawPdfHighlight(doc, line, drawX, y, align, lineH, rgb){
  if(!line || !line.trim()) return;
  const textWidth = doc.getTextWidth(line);
  const padX = 0.035, padTop = 0.09, padBottom = 0.035;
  const rectX = align === "right" ? (drawX - textWidth - padX) : (drawX - padX);
  const rectY = y - lineH + padBottom;
  const rectW = textWidth + padX * 2;
  const rectH = lineH - padBottom + padTop;
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(rectX, rectY, rectW, rectH, "F");
}

function exportPDF(options){
  if(!App.currentScript){ toast(t("toast.noScriptOpen"), "error"); return; }
  const opts = options || {};
  const highlightCharacter = (opts.character || "").trim() || null;
  const highlightRGB = highlightCharacter ? hexToRgb(opts.color || "#FFF3A0") : null;
  try{
    if(!window.jspdf || !window.jspdf.jsPDF){
      toast(t("toast.pdfLibError"), "error");
      return;
    }
    const { jsPDF } = window.jspdf;
    const format = App.settings.pageSize === "a4" ? "a4" : "letter";
    const doc = new jsPDF({ unit:"in", format });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const left = MARGIN_IN.left, right = MARGIN_IN.right, top = MARGIN_IN.top, bottom = MARGIN_IN.bottom;
    const contentW = pageW - left - right;
    const lineH = 1/6; // klassisches Screenplay: 6 Zeilen pro Zoll bei 12pt Courier
    const script = App.currentScript;
    const targetUpper = highlightCharacter ? highlightCharacter.toUpperCase() : null;

    doc.setFont("courier", "normal");
    doc.setFontSize(12);

    if(script.settings.titlePage){
      doc.setFont("courier", "bold");
      doc.text((script.title || t("script.untitled")).toUpperCase(), pageW/2, pageH * 0.42, {align:"center"});
      doc.setFont("courier", "normal");
      doc.text(App.lang === "en" ? "by" : "von", pageW/2, pageH * 0.42 + 0.5, {align:"center"});
      doc.text(script.author || "", pageW/2, pageH * 0.42 + 1.0, {align:"center"});
      doc.addPage();
    }

    let y = top;
    let pageNum = 1;

    function newPage(){
      doc.addPage();
      pageNum++;
      y = top;
      if(script.settings.pageNumbers && pageNum > 1){
        doc.setFont("courier","normal"); doc.setFontSize(12);
        doc.text(pageNum + ".", pageW - right, top - 0.35, {align:"right"});
      }
    }
    function ensureSpace(){
      if(y + lineH > pageH - bottom){ newPage(); }
    }

    let lastCharacterName = null;
    script.elements.forEach(elData => {
      const plain = stripToPlainText(elData.html);
      if(plain.trim() === "" && elData.type === "action") return;
      let text = plain;
      let x = left, width = contentW, align = "left", style = "normal";

      if(elData.spaceBefore) y += lineH * 1.3;

      switch(elData.type){
        case "sceneheading":
          text = text.toUpperCase(); style = "bold"; break;
        case "action":
          break;
        case "character":
          text = text.toUpperCase(); x = left + IND_IN.character; width = contentW - IND_IN.character; break;
        case "dialogue":
          x = left + IND_IN.dialogue; width = IND_IN.dialogueW; break;
        case "parenthetical":
          x = left + IND_IN.parenthetical; width = IND_IN.parentheticalW; style = "italic"; break;
        case "transition":
          text = text.toUpperCase(); align = "right"; break;
        case "shot":
          text = text.toUpperCase(); break;
      }

      // Schauspieler-PDF: AUSSCHLIESSLICH der Dialog des ausgewählten Charakters wird markiert.
      // Character-Name und Actions (auch mit Namensnennung) werden bewusst NICHT markiert,
      // da eine automatische Erkennung in Actions zu falschen Treffern führen kann.
      let isHighlighted = false;
      if(targetUpper && elData.type === "dialogue"){
        isHighlighted = !!lastCharacterName && lastCharacterName.toUpperCase() === targetUpper;
      }
      if(elData.type === "character") lastCharacterName = plain.trim();

      doc.setFont("courier", style);
      doc.setFontSize(12);
      const wrapped = doc.splitTextToSize(text || " ", width);
      wrapped.forEach(line => {
        ensureSpace();
        const drawX = align === "right" ? pageW - right : x;
        if(isHighlighted) drawPdfHighlight(doc, line, drawX, y, align, lineH, highlightRGB);
        doc.setFont("courier", style);
        doc.text(line, drawX, y, {align});
        y += lineH;
      });

      if(elData.type !== "character" && elData.type !== "parenthetical"){
        y += lineH;
      }
    });

    const suffix = highlightCharacter ? ("_" + safeFilename(highlightCharacter)) : "";
    const filename = safeFilename(script.title) + suffix + ".pdf";
    doc.save(filename);
    toast(highlightCharacter ? t("toast.pdfExportedFor", {name: highlightCharacter}) : t("toast.pdfExported"));
  }catch(e){
    console.error(e);
    toast(t("toast.pdfExportFailed"), "error");
  }
}

/* --------------------------------------------------------------------
   22. IMPORT — .scriptino / .txt / Backup
   -------------------------------------------------------------------- */
function readFileAsText(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(t("toast.importFailed")));
    reader.readAsText(file);
  });
}

function importTxtToElements(text){
  const lines = text.replace(/\r/g,"").split("\n");
  const out = [];
  let prevType = null;
  lines.forEach(raw => {
    const line = raw.trim();
    if(line === ""){ return; }
    let type;
    const isUpperShort = line === line.toUpperCase() && /[A-ZÄÖÜ]/.test(line) && line.length <= 38 && !/[a-zäöüß]/.test(line);
    if(/^(INT|EXT|INT\/EXT|I\/E)[\.\s]/i.test(line)){
      type = "sceneheading";
    } else if(/^\(.*\)$/.test(line)){
      type = "parenthetical";
    } else if(isUpperShort){
      // Zwei Character-Cues direkt hintereinander sind unwahrscheinlich — sonst ist Großschrift+kurz ein Character.
      type = /:$/.test(line) ? "transition" : (prevType === "character" ? "action" : "character");
    } else if(prevType === "character" || prevType === "parenthetical"){
      type = "dialogue";
    } else {
      // Nach Dialogue/Action/Doku-Anfang ist eine normale Zeile am wahrscheinlichsten neue Action.
      type = "action";
    }
    out.push({id: uid("el"), type, html: escapeHTML(line)});
    prevType = type;
  });
  if(out.length === 0) out.push({id: uid("el"), type:"sceneheading", html:""});
  return out;
}

async function handleImportScriptFile(file){
  if(!file) return;
  try{
    const text = await readFileAsText(file);
    let script;
    if(file.name.toLowerCase().endsWith(".txt")){
      const now = new Date().toISOString();
      script = {
        version:1, id: uid("scr"),
        title: file.name.replace(/\.txt$/i,"") || "Importiertes Skript",
        author:"", elements: importTxtToElements(text),
        settings: {titlePage:true, pageNumbers:true}, createdAt: now, updatedAt: now
      };
    } else {
      const parsed = JSON.parse(text);
      if(!parsed || !Array.isArray(parsed.elements)) throw new Error("invalid");
      const now = new Date().toISOString();
      script = {
        version:1, id: uid("scr"),
        title: parsed.title || "Importiertes Skript",
        author: parsed.author || "",
        elements: parsed.elements.map(e => ({id: uid("el"), type: TYPE_ORDER.includes(e.type)?e.type:"action", html: sanitizeInline(e.html || escapeHTML(e.text||""))})),
        settings: {
          titlePage: parsed.settings ? !!parsed.settings.titlePage : true,
          pageNumbers: parsed.settings ? !!parsed.settings.pageNumbers : true
        },
        createdAt: parsed.createdAt || now, updatedAt: now
      };
    }
    Storage.saveScript(script, estimatePageCount(script));
    toast(t("toast.scriptImported"));
    goEditor(script.id);
  }catch(e){
    console.error(e);
    toast(t("toast.importFailed"), "error");
  }
}

$("#fileImportScript").addEventListener("change", (e) => {
  const file = e.target.files[0];
  handleImportScriptFile(file);
  e.target.value = "";
});
function triggerImportScript(){ $("#fileImportScript").click(); }
$("#btnLandingImport").addEventListener("click", triggerImportScript);
$("#btnLibraryImport").addEventListener("click", triggerImportScript);

/* Backup export / import */
$("#btnExportBackup").addEventListener("click", () => {
  try{
    const idx = Storage.loadIndex();
    const scripts = idx.map(entry => Storage.loadScript(entry.id)).filter(Boolean);
    const payload = { version:1, exportedAt: new Date().toISOString(), scripts };
    const date = new Date().toISOString().slice(0,10);
    if(download(`scriptino-backup-${date}.json`, JSON.stringify(payload, null, 2), "application/json")){
      toast(t("toast.backupExported", {count: scripts.length}));
    } else {
      toast(t("toast.backupExportFailed"), "error");
    }
  }catch(e){ console.error(e); toast(t("toast.backupExportFailed"), "error"); }
});
$("#btnImportBackup").addEventListener("click", () => $("#fileImportBackup").click());
$("#fileImportBackup").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if(!file) return;
  try{
    const text = await readFileAsText(file);
    const parsed = JSON.parse(text);
    if(!parsed || !Array.isArray(parsed.scripts)) throw new Error("invalid");
    let count = 0;
    parsed.scripts.forEach(s => {
      if(!s || !Array.isArray(s.elements)) return;
      const now = new Date().toISOString();
      const script = {
        version:1, id: uid("scr"),
        title: s.title || "Importiertes Skript", author: s.author || "",
        elements: s.elements.map(el => ({id: uid("el"), type: TYPE_ORDER.includes(el.type)?el.type:"action", html: sanitizeInline(el.html || escapeHTML(el.text||""))})),
        settings: { titlePage: s.settings ? !!s.settings.titlePage : true, pageNumbers: s.settings ? !!s.settings.pageNumbers : true },
        createdAt: s.createdAt || now, updatedAt: now
      };
      Storage.saveScript(script, estimatePageCount(script));
      count++;
    });
    toast(t("toast.backupImported", {count: count}));
    renderLibrary();
  }catch(e){
    console.error(e);
    toast(t("toast.backupImportFailed"), "error");
  }
});

/* --------------------------------------------------------------------
   23. NEW SCRIPT
   -------------------------------------------------------------------- */
function createNewScript(){
  const script = newEmptyScript(t("script.untitled"));
  Storage.saveScript(script, 1);
  goEditor(script.id);
}
$("#btnLandingNew").addEventListener("click", createNewScript);
$("#btnLibraryNew").addEventListener("click", createNewScript);
$("#btnEmptyNew").addEventListener("click", createNewScript);

/* --------------------------------------------------------------------
   24. NAVIGATION
   -------------------------------------------------------------------- */
$("#btnLandingLibrary").addEventListener("click", goLibrary);
$("#btnBackToLibrary").addEventListener("click", () => {
  repaginateDebounced.cancel();
  if(App.currentScript && !App.currentScript.isTutorial) doSave(false);
  exitFocusMode(true);
  goLibrary();
});

/* --------------------------------------------------------------------
   25. ICONS
   -------------------------------------------------------------------- */
function refreshIcons(){
  try{ if(window.lucide) window.lucide.createIcons(); }catch(e){ /* noop */ }
}

/* --------------------------------------------------------------------
   26. WINDOW RESIZE — repaginate (layout depends on px sizes only indirectly)
   -------------------------------------------------------------------- */
window.addEventListener("beforeunload", (e) => {
  if(App.currentScript && !App.settings.autosave){
    // Nutzer hat Autosave deaktiviert — Hinweis nur falls ungespeicherte Änderungen vermutet werden.
  }
});

/* --------------------------------------------------------------------
   27. INIT
   -------------------------------------------------------------------- */
function migrateAllData(){
  // Bestehende Skripte NIE löschen — nur fehlende Felder ergänzen und zurückschreiben.
  try{
    const idx = Storage.loadIndex();
    let changed = false;
    idx.forEach(entry => {
      if(entry.isFavorite === undefined || entry.isTutorial === undefined || !entry.lastOpened){
        const script = Storage.loadScript(entry.id); // migriert intern via migrateScript()
        if(script){
          Storage.saveScript(script, entry.pages || estimatePageCount(script), false);
          changed = true;
        }
      }
    });
    return changed;
  }catch(e){ console.error(e); return false; }
}

function seedTutorialIfNeeded(){
  try{
    const idx = Storage.loadIndex();
    const hasTutorial = idx.some(e => e.isTutorial || e.id === TUTORIAL_ID);
    if(!hasTutorial){
      const script = tutorialScript();
      Storage.saveScript(script, estimatePageCount(script));
    }
  }catch(e){ /* localStorage evtl. blockiert */ }
}

function initFaqAccordion(){
  $all(".faq-question").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const wasOpen = item.classList.contains("open");
      $all(".faq-item.open").forEach(open => open.classList.remove("open"));
      if(!wasOpen) item.classList.add("open");
    });
  });
}

function initAboutPhoto(){
  const img = $("#aboutPhoto");
  const placeholder = $("#aboutPhotoPlaceholder");
  if(!img) return;
  const reflectPhotoState = () => {
    if(img.complete && img.naturalWidth > 0){
      img.style.display = "block";
      if(placeholder) placeholder.style.display = "none";
    } else if(img.complete){
      img.style.display = "none";
      if(placeholder) placeholder.style.display = "flex";
    }
  };
  img.addEventListener("load", reflectPhotoState);
  img.addEventListener("error", reflectPhotoState);
  reflectPhotoState(); // Bild kann bereits vor dem Registrieren der Listener fertig geladen sein
}

function init(){
  applyDarkMode();
  applyTranslations();
  migrateAllData();
  seedTutorialIfNeeded();
  initFaqAccordion();
  initAboutPhoto();
  refreshIcons();
  goLanding();

  try{
    if(!("localStorage" in window)){
      toast(t("toast.noLocalStorage"), "error");
    }
  }catch(e){}
}

document.addEventListener("DOMContentLoaded", init);

})();
