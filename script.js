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

const TYPE_ORDER = ["sceneheading","action","character","dialogue","parenthetical","transition","shot"];

const TYPE_LABELS = {
  sceneheading:"Scene Heading", action:"Action", character:"Character",
  dialogue:"Dialogue", parenthetical:"Parenthetical", transition:"Transition", shot:"Shot"
};

const PLACEHOLDERS = {
  sceneheading:"INT./EXT. ORT – ZEIT", action:"Was passiert in der Szene …",
  character:"NAME", dialogue:"Text der Figur …", parenthetical:"(Regieanweisung)",
  transition:"CUT TO:", shot:"CLOSE ON:"
};

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
    catch(e){ console.error(e); toast("Einstellungen konnten nicht gespeichert werden.", "error"); return false; }
  },
  loadIndex(){
    try{ return JSON.parse(localStorage.getItem(KEY_INDEX)) || []; }
    catch(e){ return []; }
  },
  saveIndex(idx){
    try{ localStorage.setItem(KEY_INDEX, JSON.stringify(idx)); return true; }
    catch(e){ console.error(e); toast("Speicherfehler: lokaler Speicher voll oder blockiert.", "error"); return false; }
  },
  loadScript(id){
    try{ return JSON.parse(localStorage.getItem(KEY_SCRIPT_PREFIX + id)); }
    catch(e){ return null; }
  },
  saveScript(script, pageCount){
    try{
      script.updatedAt = new Date().toISOString();
      localStorage.setItem(KEY_SCRIPT_PREFIX + script.id, JSON.stringify(script));
      const idx = this.loadIndex();
      const entry = {
        id: script.id, title: script.title || "Unbenanntes Skript",
        updatedAt: script.updatedAt, createdAt: script.createdAt,
        pages: pageCount || 1
      };
      const i = idx.findIndex(s => s.id === script.id);
      if(i >= 0) idx[i] = entry; else idx.unshift(entry);
      this.saveIndex(idx);
      return true;
    }catch(e){
      console.error(e);
      toast("Skript konnte nicht gespeichert werden (Speicher voll?).", "error");
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
  }
};

function newEmptyScript(title){
  const now = new Date().toISOString();
  return {
    version:1, id: uid("scr"),
    title: title || "Unbenanntes Skript", author:"",
    elements: [ {id: uid("el"), type:"sceneheading", html:""} ],
    settings: { titlePage: App.settings.titlePageDefault, pageNumbers: App.settings.pageNumbers },
    createdAt: now, updatedAt: now
  };
}

function demoScript(){
  const now = new Date().toISOString();
  const lines = [
    ["transition","FADE IN:"],
    ["sceneheading","INT. WIENER WOHNUNG – NACHT"],
    ["action","JULIUS sitzt an seinem Schreibtisch. Der Bildschirm beleuchtet sein Gesicht."],
    ["action","Plötzlich klingelt sein Handy."],
    ["character","JULIUS"],
    ["dialogue","Wer ruft um diese Uhrzeit noch an?"],
    ["action","Er nimmt das Handy."],
    ["action","Auf dem Display steht:"],
    ["action","„UNBEKANNTE NUMMER“"],
    ["transition","CUT TO:"]
  ];
  return {
    version:1, id: uid("scr"),
    title:"DER LETZTE TAG", author:"",
    elements: lines.map(([type,text]) => ({id: uid("el"), type, html: escapeHTML(text)})),
    settings: { titlePage:true, pageNumbers:true },
    createdAt: now, updatedAt: now
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
  activeCardMenuId: null
};

/* --------------------------------------------------------------------
   5. ROUTER
   -------------------------------------------------------------------- */
function setRoute(route){
  document.body.classList.remove("route-landing","route-library","route-editor");
  document.body.classList.add("route-" + route);
  $all(".view").forEach(v => v.classList.remove("is-active"));
  const map = {landing:"#view-landing", library:"#view-library", editor:"#view-editor"};
  $(map[route]).classList.add("is-active");
  window.scrollTo(0,0);
  if(route !== "editor") exitFocusMode(true);
}

function goLanding(){ setRoute("landing"); }
function goLibrary(){ renderLibrary(); setRoute("library"); }

function goEditor(scriptId){
  const script = Storage.loadScript(scriptId);
  if(!script){ toast("Dieses Skript konnte nicht gefunden werden.", "error"); goLibrary(); return; }
  setRoute("editor");
  loadScriptIntoEditor(script);
}

/* --------------------------------------------------------------------
   6. LIBRARY VIEW
   -------------------------------------------------------------------- */
function renderLibrary(){
  const idx = Storage.loadIndex().sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const grid = $("#libraryGrid");
  const empty = $("#libraryEmpty");
  grid.innerHTML = "";
  if(idx.length === 0){
    empty.hidden = false;
    grid.hidden = true;
    return;
  }
  empty.hidden = true;
  grid.hidden = false;

  idx.forEach(entry => {
    const card = document.createElement("div");
    card.className = "script-card";
    card.dataset.id = entry.id;
    card.innerHTML = `
      <div class="script-card-top">
        <h3 class="script-card-title"></h3>
        <button class="icon-btn script-card-menu-btn" type="button" title="Optionen" aria-label="Optionen">
          <i data-lucide="more-vertical"></i>
        </button>
      </div>
      <div class="script-card-meta">
        <p class="script-card-edited"></p>
        <p class="script-card-pages"></p>
      </div>
    `;
    card.querySelector(".script-card-title").textContent = entry.title || "Unbenanntes Skript";
    card.querySelector(".script-card-edited").textContent = "Zuletzt bearbeitet — " + formatDateShort(entry.updatedAt);
    card.querySelector(".script-card-pages").textContent = (entry.pages || 1) + (entry.pages === 1 ? " Seite" : " Seiten");

    card.addEventListener("click", (e) => {
      if(e.target.closest(".script-card-menu-btn") || e.target.closest(".card-menu")) return;
      goEditor(entry.id);
    });
    card.querySelector(".script-card-menu-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCardMenu(card, entry);
    });
    grid.appendChild(card);
  });

  refreshIcons();
}

function toggleCardMenu(card, entry){
  closeAllCardMenus();
  const menu = document.createElement("div");
  menu.className = "card-menu";
  menu.innerHTML = `
    <button type="button" data-act="open"><i data-lucide="edit-3"></i> Öffnen</button>
    <button type="button" data-act="rename"><i data-lucide="type"></i> Umbenennen</button>
    <button type="button" data-act="duplicate"><i data-lucide="copy"></i> Duplizieren</button>
    <button type="button" data-act="delete" class="danger"><i data-lucide="trash-2"></i> Löschen</button>
  `;
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
  copy.title = (script.title || "Unbenanntes Skript") + " (Kopie)";
  const now = new Date().toISOString();
  copy.createdAt = now; copy.updatedAt = now;
  Storage.saveScript(copy, estimatePageCount(copy));
  toast("Skript dupliziert.");
  renderLibrary();
}

function confirmDeleteScript(id, title){
  openConfirm({
    title: "Skript löschen?",
    body: `„${title || "Unbenanntes Skript"}“ wird unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.`,
    onConfirm(){
      Storage.deleteScript(id);
      toast("Skript gelöscht.");
      renderLibrary();
    }
  });
}

/* Rename modal */
let renameTargetId = null;
function openRenameModal(id, title){
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
  script.title = $("#renameInput").value.trim() || "Unbenanntes Skript";
  Storage.saveScript(script, estimatePageCount(script));
  if(App.currentScript && App.currentScript.id === script.id){
    App.currentScript.title = script.title;
    $("#scriptTitleInput").value = script.title;
  }
  closeRenameModal();
  toast("Skript umbenannt.");
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
  showModal("#modalSettings");
}
$("#btnOpenSettings").addEventListener("click", openSettingsModal);
$("#btnEditorSettings").addEventListener("click", openScriptSettingsModal);
$("#btnCloseSettings").addEventListener("click", () => hideModal("#modalSettings"));

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
    title:"Wirklich alle gespeicherten Skripte löschen?",
    body:"Diese Aktion kann nicht rückgängig gemacht werden.",
    onConfirm(){
      Storage.deleteAll();
      hideModal("#modalSettings");
      App.currentScript = null;
      toast("Alle lokalen Daten wurden gelöscht.");
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
  $("#fieldScriptTitle").value = App.currentScript.title || "";
  $("#fieldScriptAuthor").value = App.currentScript.author || "";
  $("#fieldShowTitlePage").checked = !!App.currentScript.settings.titlePage;
  showModal("#modalScriptSettings");
}
$("#btnCloseScriptSettings").addEventListener("click", () => hideModal("#modalScriptSettings"));
$("#btnSaveScriptSettings").addEventListener("click", () => {
  if(!App.currentScript) return;
  App.currentScript.title = $("#fieldScriptTitle").value.trim() || "Unbenanntes Skript";
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
  $("#scriptTitleInput").value = script.title || "Unbenanntes Skript";
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

/* --------------------------------------------------------------------
   12. ELEMENT LOOKUP / MUTATION HELPERS
   -------------------------------------------------------------------- */
function elementsArr(){ return App.currentScript.elements; }
function findIndexById(id){ return elementsArr().findIndex(e => e.id === id); }

function setSaveState(state){
  const topLabel = $("#topbarSaveState");
  const bottomLabel = $("#autosaveLine");
  if(state === "saving"){
    topLabel.textContent = "Speichert …";
    bottomLabel.textContent = "Speichert …";
  } else if(state === "saved"){
    topLabel.textContent = "Gespeichert";
    bottomLabel.textContent = "✓ Gespeichert";
  } else if(state === "error"){
    topLabel.textContent = "Nicht gespeichert";
    bottomLabel.textContent = "⚠ Nicht gespeichert";
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
  $("#statsLine").textContent = `${App.currentPageCount} ${App.currentPageCount===1?"Seite":"Seiten"} · ${words} Wörter · ca. ${minutes} Min.`;
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
  div.className = "el type-" + elData.type;
  div.dataset.id = elData.id;
  div.dataset.type = elData.type;
  div.setAttribute("data-placeholder", PLACEHOLDERS[elData.type] || "");
  if(editable){
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
        <div class="title-page-title">${escapeHTML(script.title || "Unbenanntes Skript")}</div>
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
  const scale = Math.max(0.1, Math.min(1, available / nativeW));
  $all(".page-scale-wrap").forEach(wrap => {
    const page = wrap.querySelector(".page");
    wrap.style.width = Math.round(nativeW * scale) + "px";
    wrap.style.height = Math.round(nativeH * scale) + "px";
    page.style.transform = scale < 1 ? `scale(${scale})` : "none";
    page.style.transformOrigin = "top left";
  });
}
window.addEventListener("resize", debounce(applyResponsiveScale, 150));

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
  if(showToast) toast(ok ? "Skript gespeichert." : "Speichern fehlgeschlagen.", ok ? undefined : "error");
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
  $("#scriptTitleInput").value = App.currentScript.title || "Unbenanntes Skript";
  repaginate(true);
  scheduleAutosave();
}
function undo(){
  if(App.history.index <= 0) return;
  App.history.index--;
  applySnapshot(App.history.stack[App.history.index]);
}
function redo(){
  if(App.history.index >= App.history.stack.length - 1) return;
  App.history.index++;
  applySnapshot(App.history.stack[App.history.index]);
}

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
  repaginate(false);
  historyInputDebounced();
}
const historyInputDebounced = debounce(() => pushHistory(), 700);

function onElKeydown(e){
  const node = e.target;
  const id = node.dataset.id;
  const idx = findIndexById(id);
  if(idx === -1) return;
  const meta = e.ctrlKey || e.metaKey;

  if(meta && e.key.toLowerCase() === "s"){ e.preventDefault(); doSave(true); return; }
  if(meta && e.key.toLowerCase() === "p"){ e.preventDefault(); triggerPrint(); return; }
  if(meta && e.key.toLowerCase() === "e"){ e.preventDefault(); exportPDF(); return; }
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
      mergeWithPrevious(idx);
      return;
    }
  }
}

function handleEnter(idx, node){
  const offset = getCaretOffset(node);
  const text = node.textContent || "";
  const before = text.slice(0, offset);
  const after = text.slice(offset);
  const els = elementsArr();
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
    hint.textContent = "ESC zum Verlassen des Fokusmodus";
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
  try{ window.print(); }catch(e){ toast("Drucken wird von diesem Browser nicht unterstützt.", "error"); }
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
  if(btn.dataset.action === "pdf") exportPDF();
  if(btn.dataset.action === "scriptino") exportScriptino();
});

function exportScriptino(){
  if(!App.currentScript) return;
  try{
    const payload = deepClone(App.currentScript);
    const json = JSON.stringify(payload, null, 2);
    const filename = safeFilename(App.currentScript.title) + ".scriptino";
    if(download(filename, json, "application/json")) toast("Skript als .scriptino exportiert.");
    else toast("Export fehlgeschlagen.", "error");
  }catch(e){ console.error(e); toast("Export fehlgeschlagen.", "error"); }
}

/* --------------------------------------------------------------------
   21. PDF EXPORT
   -------------------------------------------------------------------- */
function exportPDF(){
  if(!App.currentScript){ toast("Kein Skript geöffnet.", "error"); return; }
  try{
    if(!window.jspdf || !window.jspdf.jsPDF){
      toast("PDF-Bibliothek konnte nicht geladen werden. Prüfe deine Internetverbindung.", "error");
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

    doc.setFont("courier", "normal");
    doc.setFontSize(12);

    if(script.settings.titlePage){
      doc.setFont("courier", "bold");
      doc.text((script.title || "UNBENANNTES SKRIPT").toUpperCase(), pageW/2, pageH * 0.42, {align:"center"});
      doc.setFont("courier", "normal");
      doc.text("von", pageW/2, pageH * 0.42 + 0.5, {align:"center"});
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

    script.elements.forEach(elData => {
      const plain = stripToPlainText(elData.html);
      if(plain.trim() === "" && elData.type === "action") return;
      let text = plain;
      let x = left, width = contentW, align = "left", style = "normal";

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

      doc.setFont("courier", style);
      doc.setFontSize(12);
      const wrapped = doc.splitTextToSize(text || " ", width);
      wrapped.forEach(line => {
        ensureSpace();
        const drawX = align === "right" ? pageW - right : x;
        doc.text(line, drawX, y, {align});
        y += lineH;
      });

      if(elData.type !== "character" && elData.type !== "parenthetical"){
        y += lineH;
      }
    });

    const filename = safeFilename(script.title) + ".pdf";
    doc.save(filename);
    toast("PDF wurde exportiert.");
  }catch(e){
    console.error(e);
    toast("PDF-Export fehlgeschlagen.", "error");
  }
}

/* --------------------------------------------------------------------
   22. IMPORT — .scriptino / .txt / Backup
   -------------------------------------------------------------------- */
function readFileAsText(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
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
    toast("Skript importiert.");
    goEditor(script.id);
  }catch(e){
    console.error(e);
    toast("Diese Datei konnte nicht importiert werden.", "error");
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
      toast(`${scripts.length} Skripte als Backup exportiert.`);
    } else {
      toast("Backup-Export fehlgeschlagen.", "error");
    }
  }catch(e){ console.error(e); toast("Backup-Export fehlgeschlagen.", "error"); }
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
    toast(`${count} Skripte aus Backup importiert.`);
    renderLibrary();
  }catch(e){
    console.error(e);
    toast("Diese Backup-Datei konnte nicht importiert werden.", "error");
  }
});

/* --------------------------------------------------------------------
   23. NEW SCRIPT
   -------------------------------------------------------------------- */
function createNewScript(){
  const script = newEmptyScript("Unbenanntes Skript");
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
$("#btnBrandFromLibrary").addEventListener("click", goLanding);
$("#btnBackToLibrary").addEventListener("click", () => {
  repaginateDebounced.cancel();
  if(App.currentScript) doSave(false);
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
function seedDemoIfNeeded(){
  try{
    if(localStorage.getItem(KEY_SEEDED)) return;
    localStorage.setItem(KEY_SEEDED, "1");
    if(Storage.loadIndex().length === 0){
      const script = demoScript();
      Storage.saveScript(script, estimatePageCount(script));
    }
  }catch(e){ /* localStorage evtl. blockiert */ }
}

function init(){
  applyDarkMode();
  seedDemoIfNeeded();
  refreshIcons();
  goLanding();

  try{
    if(!("localStorage" in window)){
      toast("Dein Browser unterstützt keinen lokalen Speicher. Skripte können nicht gespeichert werden.", "error");
    }
  }catch(e){}
}

document.addEventListener("DOMContentLoaded", init);

})();
