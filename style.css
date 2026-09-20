/* ==========================================================================
   SCRIPTINO — design tokens
   ========================================================================== */
:root{
  --ink: #1B1D23;
  --ink-soft: #33363F;
  --muted: #6B6F76;
  --muted-2: #9A9D9F;
  --bg: #ECEAE4;
  --surface: #FFFFFF;
  --surface-2: #F5F3ED;
  --border: #DDD9CE;
  --border-strong: #C9C4B6;
  --accent: #9C6B12;
  --accent-strong: #7C5309;
  --accent-tint: #F1E6CF;
  --page-highlight: #F1E6CF;
  --page-highlight-border: #E3D3A8;
  --danger: #B3402F;
  --danger-tint: #F7E4DF;
  --shadow-sm: 0 1px 2px rgba(27,29,35,0.06), 0 1px 1px rgba(27,29,35,0.04);
  --shadow-md: 0 6px 20px rgba(27,29,35,0.10), 0 2px 6px rgba(27,29,35,0.06);
  --shadow-page: 0 1px 1px rgba(20,20,20,.04), 0 8px 24px rgba(20,20,20,.10), 0 30px 60px -20px rgba(20,20,20,.18);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --font-ui: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-script: "Courier Prime", "Courier New", Courier, monospace;
  --topbar-h: 58px;
  --statusbar-h: 34px;
}

html.dark{
  --ink: #ECE9E1;
  --ink-soft: #C9C6BE;
  --muted: #9AA0A8;
  --muted-2: #767C84;
  --bg: #131418;
  --surface: #1B1D22;
  --surface-2: #202329;
  --border: #2C2F36;
  --border-strong: #3A3E46;
  --accent: #D2A544;
  --accent-strong: #E7BE63;
  --accent-tint: #33301F;
  --danger: #E37860;
  --danger-tint: #33221E;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.3);
  --shadow-md: 0 8px 24px rgba(0,0,0,0.45);
  --shadow-page: 0 1px 1px rgba(0,0,0,.4), 0 10px 30px rgba(0,0,0,.5), 0 40px 80px -20px rgba(0,0,0,.6);
}

[hidden]{ display:none !important; }
*{box-sizing:border-box;}
html,body{height:100%;}
body{
  margin:0;
  font-family:var(--font-ui);
  background:var(--bg);
  color:var(--ink);
  -webkit-font-smoothing:antialiased;
  text-rendering:optimizeLegibility;
}
button, input, select, textarea{ font-family:inherit; color:inherit; }
button{ cursor:pointer; }
*:focus-visible{ outline:2px solid var(--accent); outline-offset:2px; border-radius:4px; }

/* ==========================================================================
   Buttons / small controls
   ========================================================================== */
.btn{
  display:inline-flex; align-items:center; gap:8px;
  padding:10px 16px;
  font-size:14px; font-weight:600;
  border-radius:999px;
  border:1px solid transparent;
  background:var(--surface);
  color:var(--ink);
  transition:transform .12s ease, background .15s ease, border-color .15s ease;
  white-space:nowrap;
}
.btn svg{ width:16px; height:16px; }
.btn:hover{ transform:translateY(-1px); }
.btn:active{ transform:translateY(0); }
.btn-primary{ background:var(--ink); color:var(--surface); border-color:var(--ink); }
html.dark .btn-primary{ background:var(--accent); color:#171200; border-color:var(--accent); }
.btn-primary:hover{ background:var(--ink-soft); }
.btn-ghost{ background:transparent; border-color:var(--border-strong); color:var(--ink); }
.btn-ghost:hover{ background:var(--surface-2); }
.btn-subtle{ background:transparent; border-color:transparent; color:var(--muted); padding:9px 10px; }
.btn-subtle:hover{ background:var(--surface-2); color:var(--ink); }
.btn-danger{ background:var(--danger); color:#fff; border-color:var(--danger); }
.btn-danger:hover{ background:#96311F; }

.icon-btn{
  display:inline-flex; align-items:center; justify-content:center;
  width:36px; height:36px;
  border-radius:10px;
  border:1px solid transparent;
  background:transparent;
  color:var(--ink-soft);
}
.icon-btn svg{ width:17px; height:17px; }
.icon-btn:hover{ background:var(--surface-2); color:var(--ink); }
.icon-btn.is-active{ background:var(--accent-tint); color:var(--accent-strong); }

/* ==========================================================================
   Views — simple show/hide router
   ========================================================================== */
.view{ display:none; min-height:100%; }
.view.is-active{ display:flex; flex-direction:column; }
body.route-landing #view-landing,
body.route-library #view-library,
body.route-editor #view-editor{ display:flex; }

/* ==========================================================================
   LANDING
   ========================================================================== */
.view-landing{
  align-items:center; justify-content:center;
  min-height:100vh;
  padding:32px;
  background:
    radial-gradient(1200px 600px at 50% -10%, var(--accent-tint) 0%, transparent 60%),
    var(--bg);
}
.landing-wrap{ max-width:460px; width:100%; text-align:center; }
.landing-mark{
  width:56px; height:56px; margin:0 auto 22px;
  display:flex; align-items:center; justify-content:center;
  color:var(--accent-strong);
}
.landing-title{
  font-family:var(--font-ui);
  font-size:44px; font-weight:700; letter-spacing:-0.03em;
  margin:0 0 6px;
  color:var(--ink);
}
.landing-tagline{
  font-family:var(--font-script);
  font-size:17px; color:var(--accent-strong); margin:0 0 18px;
  letter-spacing:0.01em;
}
.landing-sub{ font-size:15px; color:var(--muted); margin:0 0 32px; line-height:1.5; }
.landing-actions{ display:flex; gap:10px; justify-content:center; flex-wrap:wrap; }
.landing-actions .btn{ padding:12px 20px; }
.landing-library-link{
  display:block; margin:22px auto 0; background:none; border:none;
  color:var(--muted); font-size:14px; font-weight:500;
  text-decoration:none; padding:6px;
}
.landing-library-link:hover{ color:var(--ink); }
.landing-footnote{ margin:34px 0 0; font-size:12.5px; color:var(--muted-2); }
.landing-meta-nav{ margin:14px 0 0; font-size:13px; }
.landing-meta-nav a{ color:var(--muted); text-decoration:none; font-weight:500; }
.landing-meta-nav a:hover{ color:var(--ink); text-decoration:underline; }
.landing-meta-dot{ color:var(--muted-2); margin:0 8px; }

/* ==========================================================================
   LIBRARY
   ========================================================================== */
.view-library{ min-height:100vh; }
.library-header{
  display:flex; align-items:center; justify-content:space-between;
  padding:16px 28px;
  border-bottom:1px solid var(--border);
  background:var(--surface);
  position:sticky; top:0; z-index:5;
  gap:16px; flex-wrap:wrap;
}
.brand-mini{
  background:none; border:none; padding:4px 0;
  font-size:18px; font-weight:700; letter-spacing:-0.02em; color:var(--ink);
}
.library-header-actions{ display:flex; align-items:center; gap:6px; }
.library-body{ padding:36px 28px 80px; max-width:1180px; margin:0 auto; width:100%; }
.library-title{ font-size:24px; font-weight:700; letter-spacing:-0.02em; margin:0 0 24px; }

.library-grid{
  display:grid; grid-template-columns:repeat(auto-fill, minmax(250px, 1fr));
  gap:18px;
}
.script-card{
  position:relative;
  background:var(--surface);
  border:1px solid var(--border);
  border-radius:var(--radius-lg);
  padding:22px 20px 18px;
  cursor:pointer;
  transition:box-shadow .18s ease, transform .18s ease, border-color .18s ease;
  display:flex; flex-direction:column; min-height:168px;
}
.script-card:hover{ box-shadow:var(--shadow-md); transform:translateY(-3px); border-color:var(--border-strong); }
.script-card:hover .script-card-menu-btn{ opacity:1; }
.script-card-top{ display:flex; align-items:flex-start; justify-content:space-between; gap:8px; }
.script-card-title{
  font-size:15px; font-weight:700; letter-spacing:0.01em; text-transform:uppercase;
  margin:0; line-height:1.3; word-break:break-word;
}
.script-card-tag{
  display:inline-block; margin:9px 0 0; font-size:11px; font-weight:600;
  letter-spacing:0.03em; color:var(--accent-strong); background:var(--accent-tint);
  padding:3px 9px; border-radius:999px;
}
.script-card-author{ font-size:12.5px; color:var(--ink-soft); margin:12px 0 0; font-weight:500; }
.script-card-menu-btn{ width:30px; height:30px; flex:none; opacity:0.55; transition:opacity .15s ease; }
.script-card-menu-btn:hover, .script-card-menu-btn:focus-visible{ opacity:1; }
.script-card-meta{ margin-top:auto; padding-top:16px; display:flex; flex-direction:column; gap:3px; }
.script-card-pages{ font-size:12.5px; color:var(--ink-soft); font-weight:600; margin:0; }
.script-card-edited{ font-size:12px; color:var(--muted-2); margin:0; }

.card-menu{
  position:absolute; top:44px; right:12px; z-index:10;
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius-sm); box-shadow:var(--shadow-md);
  min-width:170px; overflow:hidden; padding:6px;
}
.card-menu button{
  display:flex; align-items:center; gap:9px; width:100%;
  background:none; border:none; text-align:left;
  padding:9px 10px; font-size:13.5px; border-radius:6px; color:var(--ink);
}
.card-menu button svg{ width:15px; height:15px; color:var(--muted); }
.card-menu button:hover{ background:var(--surface-2); }
.card-menu button.danger{ color:var(--danger); }
.card-menu button.danger svg{ color:var(--danger); }

.library-empty{
  display:flex; flex-direction:column; align-items:center; gap:6px;
  padding:80px 20px; color:var(--muted); text-align:center;
}
.library-empty svg{ width:34px; height:34px; color:var(--muted-2); margin-bottom:8px; }
.library-empty-title{ margin:0; font-size:16px; font-weight:700; color:var(--ink); }
.library-empty-sub{ margin:0 0 14px; font-size:14px; color:var(--muted); }

/* ==========================================================================
   EDITOR — topbar
   ========================================================================== */
.view-editor{ min-height:100vh; }
.editor-topbar{
  display:flex; align-items:center; gap:14px;
  height:var(--topbar-h); padding:0 14px;
  background:var(--surface); border-bottom:1px solid var(--border);
  position:sticky; top:0; z-index:20;
}
.topbar-left{ display:flex; align-items:center; gap:8px; min-width:0; flex:1 1 220px; }
.topbar-title-wrap{ display:flex; flex-direction:column; min-width:0; }
.topbar-title-input{
  border:none; background:none; font-size:14.5px; font-weight:600;
  padding:2px 6px; border-radius:6px; min-width:60px; max-width:280px; color:var(--ink);
}
.topbar-title-input:hover{ background:var(--surface-2); }
.topbar-title-input:focus{ background:var(--surface-2); outline:none; }
.topbar-save-state{ font-size:11px; color:var(--muted-2); padding:0 6px; }

.topbar-toolbar{
  display:flex; align-items:center; gap:6px;
  flex:0 0 auto;
  background:var(--surface-2);
  border:1px solid var(--border);
  padding:5px; border-radius:12px;
}
.element-select-wrap{ position:relative; }
.element-select{
  appearance:none; -webkit-appearance:none;
  border:1px solid var(--border-strong); background:var(--surface);
  border-radius:8px; padding:7px 30px 7px 12px;
  font-size:13px; font-weight:600; color:var(--ink);
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path d='M0 0l5 6 5-6z' fill='%236B6F76'/></svg>");
  background-repeat:no-repeat; background-position:right 11px center;
}
.toolbar-divider{ width:1px; height:20px; background:var(--border-strong); margin:0 2px; }
.topbar-right{ display:flex; align-items:center; gap:4px; flex:0 0 auto; }

.export-menu-wrap{ position:relative; }
.export-menu{
  position:absolute; top:44px; right:0; z-index:30;
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius-sm); box-shadow:var(--shadow-md);
  min-width:210px; padding:6px;
}
.export-menu button{
  display:flex; align-items:center; gap:9px; width:100%;
  background:none; border:none; text-align:left;
  padding:10px 10px; font-size:13.5px; border-radius:6px; color:var(--ink);
}
.export-menu button svg{ width:15px; height:15px; color:var(--muted); }
.export-menu button:hover{ background:var(--surface-2); }

/* ==========================================================================
   EDITOR — stage & pages
   ========================================================================== */
.editor-stage{
  flex:1; overflow-y:auto; overflow-x:auto; background:var(--bg);
  padding:44px 20px 100px;
  display:flex; flex-direction:column; align-items:center; gap:34px;
}
.pages-measure{ position:absolute; left:-9999px; top:0; visibility:hidden; pointer-events:none; }

.pages-container{ display:flex; flex-direction:column; align-items:center; gap:34px; }

.page-scale-wrap{ position:relative; flex:none; }
.page{
  background:#FFFFFF;
  color:#151515;
  box-shadow:var(--shadow-page);
  position:absolute;
  top:0; left:0;
  flex:none;
  font-family:var(--font-script);
  width:var(--page-w, 816px);
  height:var(--page-h, 1056px);
  padding:var(--m-top, 96px) var(--m-right, 96px) var(--m-bottom, 96px) var(--m-left, 144px);
  font-size:var(--font-pt, 12pt);
  line-height:1.05;
}
.page.title-page{ display:flex; flex-direction:column; padding-left:0; padding-right:0; }
.page-number{
  position:absolute; top:calc(var(--m-top, 96px) - 46px); right:var(--m-right, 96px);
  font-size:12px; color:#3a3a3a;
}
.page-content{ position:relative; width:100%; }

.el.type-sceneheading,
.el.type-action,
.el.type-shot{ width:100%; margin:0 0 12pt; }
.el.type-transition{ width:100%; margin:0 0 12pt; }
.el.type-character{ width:auto; max-width:70%; margin:12pt 0 0 var(--ind-character, 2.2in); }
.el.type-dialogue{ width:var(--w-dialogue, 3.4in); margin:0 0 12pt var(--ind-dialogue, 1in); }
.el.type-parenthetical{ width:var(--w-parenthetical, 2in); margin:0 0 0 var(--ind-parenthetical, 1.6in); }

.el{
  outline:none;
  white-space:pre-wrap;
  word-wrap:break-word;
  caret-color:var(--accent-strong);
  min-height:1em;
}
.el:empty::before{ content:attr(data-placeholder); color:#B7B2A6; pointer-events:none; }
.el.type-sceneheading{ text-transform:uppercase; font-weight:700; }
.el.type-character{ text-transform:uppercase; }
.el.type-transition{ text-transform:uppercase; text-align:right; }
.el.type-shot{ text-transform:uppercase; }
.el.type-parenthetical{ font-style:italic; }
.el.is-focused{ background:var(--page-highlight); box-shadow:0 0 0 3px var(--page-highlight), inset 0 0 0 1px var(--page-highlight-border); border-radius:2px; }

.char-suggest{
  position:absolute; z-index:40;
  background:var(--surface); border:1px solid var(--border);
  border-radius:var(--radius-sm); box-shadow:var(--shadow-md);
  min-width:140px; max-width:240px; overflow:hidden; padding:5px;
  font-family:var(--font-ui);
}
.char-suggest-item{
  display:flex; align-items:center; gap:8px; width:100%;
  background:none; border:none; text-align:left; cursor:pointer;
  padding:7px 9px; font-size:12.5px; font-weight:600; letter-spacing:0.01em;
  border-radius:6px; color:var(--ink); font-family:var(--font-script);
}
.char-suggest-item:hover{ background:var(--surface-2); }
.char-suggest-item.active{ background:var(--accent-tint); color:var(--accent-strong); }
.char-suggest-hint{
  font-family:var(--font-ui); font-size:10.5px; color:var(--muted-2);
  padding:5px 9px 2px; letter-spacing:0.01em;
}

.title-page-fields{
  flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
  text-align:center; gap:6px; padding:0 60px;
}
.title-page-title{ font-size:15pt; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; }
.title-page-by{ margin-top:38px; font-size:12pt; }
.title-page-author{ margin-top:38px; font-size:12pt; }

/* ==========================================================================
   EDITOR — status bar
   ========================================================================== */
.editor-statusbar{
  position:fixed; left:0; right:0; bottom:0; z-index:20;
  height:var(--statusbar-h); flex:none;
  display:flex; align-items:center; justify-content:space-between; gap:8px;
  padding:0 16px; font-size:12px; color:var(--muted);
  background:var(--surface); border-top:1px solid var(--border);
}
.statusbar-left{ display:flex; align-items:center; gap:8px; min-width:0; }
.statusbar-dot{ color:var(--muted-2); }

.zoom-controls{
  display:flex; align-items:center; gap:2px; flex:none;
  background:var(--surface-2); border:1px solid var(--border); border-radius:999px;
  padding:2px;
}
.zoom-btn{
  width:20px; height:20px; display:flex; align-items:center; justify-content:center;
  background:none; border:none; border-radius:999px; color:var(--ink-soft);
  font-size:13px; line-height:1; font-weight:600;
}
.zoom-btn:hover{ background:var(--surface); color:var(--ink); }
.zoom-btn:disabled{ opacity:0.35; cursor:default; }
.zoom-btn:disabled:hover{ background:none; }
.zoom-level{
  background:none; border:none; color:var(--muted); font-size:11.5px; font-weight:600;
  padding:0 8px; min-width:40px; text-align:center;
}
.zoom-level:hover{ color:var(--ink); }

/* ==========================================================================
   FOCUS MODE
   ========================================================================== */
body.focus-mode .editor-topbar{ opacity:0; pointer-events:none; transform:translateY(-8px); }
body.focus-mode .editor-statusbar{ opacity:0.35; }
body.focus-mode .editor-stage{ padding-top:80px; }
.editor-topbar, .editor-statusbar{ transition:opacity .25s ease, transform .25s ease; }
.focus-exit-hint{
  position:fixed; top:16px; left:50%; transform:translateX(-50%);
  background:var(--ink); color:var(--surface); font-size:12px; font-weight:600;
  padding:7px 14px; border-radius:999px; z-index:50; opacity:0; pointer-events:none;
  transition:opacity .2s ease;
}
body.focus-mode .focus-exit-hint.show{ opacity:0.9; }

/* ==========================================================================
   MODALS
   ========================================================================== */
.modal-overlay{
  position:fixed; inset:0; background:rgba(20,18,14,0.42);
  display:flex; align-items:center; justify-content:center;
  z-index:100; padding:20px; backdrop-filter:blur(2px);
}
.modal-overlay[hidden]{ display:none !important; }
.modal{
  background:var(--surface); border-radius:var(--radius-lg);
  width:100%; max-width:440px; box-shadow:var(--shadow-md);
  border:1px solid var(--border);
  max-height:88vh; display:flex; flex-direction:column;
}
.modal-small{ max-width:380px; }
.modal-head{
  display:flex; align-items:center; justify-content:space-between;
  padding:18px 20px 6px;
}
.modal-head h3{ margin:0; font-size:16px; font-weight:700; }
.modal-body{ padding:16px 20px 6px; overflow-y:auto; }
.modal-foot{ padding:16px 20px 20px; display:flex; justify-content:flex-end; gap:10px; }

.settings-row{
  display:flex; align-items:center; justify-content:space-between; gap:16px;
  padding:14px 0; border-bottom:1px solid var(--border);
}
.settings-row:last-of-type{ border-bottom:none; }
.settings-row label{ font-size:14px; font-weight:600; }
.settings-hint{ margin:3px 0 0; font-size:12.5px; color:var(--muted); line-height:1.4; }
.settings-select{
  border:1px solid var(--border-strong); background:var(--surface);
  border-radius:8px; padding:8px 10px; font-size:13px; font-weight:600;
}
.settings-divider{ height:1px; background:var(--border); margin:6px 0; }
.settings-danger-row label{ color:var(--danger); }
.settings-privacy-note{
  display:flex; align-items:flex-start; gap:8px;
  font-size:12.5px; color:var(--muted); line-height:1.5;
  background:var(--surface-2); border-radius:10px; padding:12px 14px; margin:16px 0 4px;
}
.settings-privacy-note svg{ width:16px; height:16px; flex:none; margin-top:1px; color:var(--accent-strong); }

.switch{ position:relative; display:inline-block; width:40px; height:24px; flex:none; }
.switch input{ opacity:0; width:0; height:0; }
.switch-track{
  position:absolute; inset:0; background:var(--border-strong); border-radius:999px;
  transition:background .15s ease; cursor:pointer;
}
.switch-track::before{
  content:""; position:absolute; width:18px; height:18px; left:3px; top:3px;
  background:#fff; border-radius:50%; transition:transform .15s ease; box-shadow:0 1px 2px rgba(0,0,0,.3);
}
.switch input:checked + .switch-track{ background:var(--accent); }
.switch input:checked + .switch-track::before{ transform:translateX(16px); }

.field{ margin-bottom:14px; }
.field label{ display:block; font-size:12.5px; font-weight:600; color:var(--muted); margin-bottom:6px; }
.field input[type=text]{
  width:100%; border:1px solid var(--border-strong); background:var(--surface);
  border-radius:8px; padding:10px 12px; font-size:14px;
}

.radio-row{
  display:flex; align-items:center; gap:10px; cursor:pointer;
  padding:11px 4px; border-bottom:1px solid var(--border);
}
.radio-row:last-of-type{ border-bottom:none; }
.radio-row input{ position:absolute; opacity:0; width:0; height:0; }
.radio-dot{
  width:18px; height:18px; flex:none; border-radius:50%;
  border:1.5px solid var(--border-strong); background:var(--surface);
  position:relative; transition:border-color .15s ease;
}
.radio-dot::before{
  content:""; position:absolute; inset:3px; border-radius:50%;
  background:var(--accent); transform:scale(0); transition:transform .15s ease;
}
.radio-row input:checked + .radio-dot{ border-color:var(--accent); }
.radio-row input:checked + .radio-dot::before{ transform:scale(1); }
.radio-label{ font-size:14px; font-weight:600; }

.pdf-character-options{ padding:12px 4px 2px 32px; }
.pdf-character-select{ width:100%; }
.pdf-color-field{ display:flex; align-items:center; gap:10px; margin-bottom:2px; }
.pdf-color-field label{ margin-bottom:0; }
.pdf-color-field input[type=color]{
  width:40px; height:32px; border:1px solid var(--border-strong); border-radius:8px;
  padding:2px; background:var(--surface); cursor:pointer;
}
.pdf-no-characters-hint{
  font-size:12.5px; color:var(--muted); padding:8px 4px 2px 32px; margin:0;
}

.confirm-title{ font-size:16px; font-weight:700; margin:4px 0 8px; }
.confirm-body{ font-size:13.5px; color:var(--muted); line-height:1.55; margin:0; }

/* ==========================================================================
   TOASTS / STATUS
   ========================================================================== */
.save-status{ display:none; }
.toast-host{
  position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
  display:flex; flex-direction:column; gap:8px; z-index:200; align-items:center;
}
.toast{
  background:var(--ink); color:var(--surface);
  font-size:13px; font-weight:500; padding:10px 16px; border-radius:999px;
  box-shadow:var(--shadow-md); opacity:0; transform:translateY(6px);
  transition:opacity .18s ease, transform .18s ease;
}
.toast.show{ opacity:1; transform:translateY(0); }
.toast.toast-error{ background:var(--danger); }

/* ==========================================================================
   RESPONSIVE
   ========================================================================== */
@media (max-width: 860px){
  .editor-topbar{ flex-wrap:wrap; height:auto; padding:8px 10px; gap:8px; }
  .topbar-toolbar{ order:3; width:100%; justify-content:space-between; }
  .topbar-left{ flex:1 1 auto; }
  .library-header{ padding:14px 16px; }
  .library-header-actions{ flex-wrap:wrap; justify-content:flex-end; row-gap:8px; }
  .library-body{ padding:24px 16px 60px; }
  .editor-stage{ padding:24px 10px 90px; }
}
@media (max-width: 460px){
  .library-header{ flex-direction:column; align-items:flex-start; }
  .library-header-actions{ width:100%; justify-content:flex-start; }
}
@media (max-width: 520px){
  .landing-title{ font-size:34px; }
  .library-grid{ grid-template-columns:1fr 1fr; }
  .topbar-title-input{ max-width:140px; }
}
@media (max-width: 380px){
  .library-grid{ grid-template-columns:1fr; }
}

/* ==========================================================================
   PRINT
   ========================================================================== */
@media print{
  body *{ visibility:hidden; }
  .pages-container, .pages-container *{ visibility:visible; }
  .pages-container{ position:absolute; left:0; top:0; gap:0; }
  .page-scale-wrap{ position:static !important; width:auto !important; height:auto !important; }
  .page{ position:static !important; transform:none !important; box-shadow:none; margin:0 auto; page-break-after:always; }
  .el.is-focused{ background:none; box-shadow:none; }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce){
  *{ transition:none !important; animation:none !important; }
}

/* ==========================================================================
   SUBPAGES — help.html / about.html
   Nutzen dieselbe Schrift, Farbwelt und Dark-Mode-Logik wie der Editor.
   ========================================================================== */
body.subpage-body{ background:var(--bg); min-height:100vh; }

.subpage-header{
  display:flex; align-items:center; justify-content:space-between;
  padding:16px 28px; border-bottom:1px solid var(--border);
  background:var(--surface); position:sticky; top:0; z-index:5; gap:16px;
}
.subpage-brand{
  display:flex; align-items:center; gap:8px; text-decoration:none;
  font-size:18px; font-weight:700; letter-spacing:-0.02em; color:var(--ink);
}
.subpage-brand svg{ color:var(--accent-strong); }
.subpage-back{
  display:inline-flex; align-items:center; gap:6px;
  font-size:13.5px; font-weight:600; color:var(--muted); text-decoration:none;
  padding:8px 14px; border-radius:999px; border:1px solid var(--border-strong);
}
.subpage-back:hover{ background:var(--surface-2); color:var(--ink); }
.subpage-back svg{ width:15px; height:15px; }

.subpage-main{ max-width:760px; margin:0 auto; padding:56px 28px 100px; }
.subpage-hero{ text-align:center; margin-bottom:56px; }
.subpage-hero h1{ font-size:38px; font-weight:700; letter-spacing:-0.02em; margin:0 0 10px; color:var(--ink); }
.subpage-hero p{ font-size:16px; color:var(--muted); margin:0; }

.subpage-section{ margin-bottom:48px; }
.subpage-section h2{
  font-size:22px; font-weight:700; letter-spacing:-0.01em; margin:0 0 16px; color:var(--ink);
  scroll-margin-top:90px;
}
.subpage-section h3{ font-size:16px; font-weight:700; margin:22px 0 8px; color:var(--ink); }
.subpage-section p{ font-size:15px; line-height:1.7; color:var(--ink-soft); margin:0 0 14px; }
.subpage-section ul{ margin:0 0 14px; padding-left:22px; }
.subpage-section li{ font-size:15px; line-height:1.75; color:var(--ink-soft); margin-bottom:4px; }
.subpage-section strong{ color:var(--ink); }

.element-example-grid{
  display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));
  gap:14px; margin:0 0 8px;
}
.element-example-card{
  background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-md);
  padding:16px 18px;
}
.element-example-card h4{ font-size:13px; font-weight:700; margin:0 0 8px; color:var(--accent-strong); text-transform:uppercase; letter-spacing:0.03em; }
.element-example-card code{
  display:block; font-family:var(--font-script); font-size:13px; background:var(--surface-2);
  border-radius:6px; padding:10px 12px; color:var(--ink); white-space:pre-wrap; line-height:1.5;
}

.shortcut-table{ width:100%; border-collapse:collapse; font-size:14px; }
.shortcut-table th{
  text-align:left; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.03em;
  color:var(--muted); padding:0 0 10px; border-bottom:1px solid var(--border-strong);
}
.shortcut-table td{ padding:11px 0; border-bottom:1px solid var(--border); color:var(--ink-soft); vertical-align:top; }
.shortcut-table td:first-child{ width:42%; }
.shortcut-table kbd{
  display:inline-block; font-family:var(--font-ui); font-size:12.5px; font-weight:600; color:var(--ink);
  background:var(--surface-2); border:1px solid var(--border-strong); border-bottom-width:2px;
  border-radius:6px; padding:3px 8px; margin:2px 3px 2px 0;
}

.faq-list{ display:flex; flex-direction:column; gap:8px; }
.faq-item{ border:1px solid var(--border); border-radius:var(--radius-md); background:var(--surface); overflow:hidden; }
.faq-question{
  width:100%; display:flex; align-items:center; justify-content:space-between; gap:12px;
  padding:15px 18px; background:none; border:none; text-align:left;
  font-size:14.5px; font-weight:600; color:var(--ink); cursor:pointer;
}
.faq-question:hover{ background:var(--surface-2); }
.faq-question .faq-icon{ flex:none; width:18px; height:18px; color:var(--muted); transition:transform .2s ease; }
.faq-item.open .faq-question .faq-icon{ transform:rotate(45deg); }
.faq-answer{
  max-height:0; overflow:hidden; transition:max-height .25s ease, padding .25s ease;
  padding:0 18px; font-size:14px; line-height:1.65; color:var(--muted);
}
.faq-item.open .faq-answer{ max-height:240px; padding:0 18px 16px; }
.faq-answer a{ color:var(--accent-strong); }

.contact-row{ display:flex; flex-wrap:wrap; gap:10px; margin-top:6px; }
.contact-link{
  display:inline-flex; align-items:center; gap:8px;
  padding:10px 16px; border-radius:999px; border:1px solid var(--border-strong);
  background:var(--surface); color:var(--ink); text-decoration:none; font-size:13.5px; font-weight:600;
}
.contact-link:hover{ background:var(--surface-2); }
.contact-link svg{ width:15px; height:15px; color:var(--muted); }

.about-photo-frame{
  width:100%; aspect-ratio:4/3; border-radius:var(--radius-lg); overflow:hidden;
  background:var(--surface-2); border:1px solid var(--border);
  display:flex; align-items:center; justify-content:center; margin-bottom:40px;
}
.about-photo-frame img{ width:100%; height:100%; object-fit:cover; display:none; }
.about-photo-placeholder{ display:flex; flex-direction:column; align-items:center; gap:8px; color:var(--muted-2); }
.about-photo-placeholder svg{ width:32px; height:32px; }
.about-photo-placeholder span{ font-size:12.5px; }

@media (max-width: 700px){
  .subpage-header{ padding:14px 16px; }
  .subpage-main{ padding:40px 18px 80px; }
  .subpage-hero h1{ font-size:30px; }
  .shortcut-table td:first-child{ width:auto; }
}
