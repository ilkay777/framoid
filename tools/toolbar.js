/* Framoid toolbar: floating glass islands, separate, with transparent space between them, in two modes.
   Both modes share one bottom row with the same ends: far left settings (list) or home (Reflection), far right
   the balance of the gods; in the middle search (grows while in use) and filter, or the sections.
   Reading mode also has previous / next and share at the top right.
   Copied into the pages with balance.js by tools/sync_balance.py. */
(function () {
  "use strict";
  if (window.FramoidBar) return;
  const THEME = "framoid.theme";
  const svg = (d, extra = "") => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
  const ICON = {
    home: svg('<path d="M4 11l8-7 8 7"/><path d="M6 10v9a1 1 0 0 0 1 1h3.5v-5h3v5H17a1 1 0 0 0 1-1v-9"/>'),
    prev: svg('<path d="M15 5l-7 7 7 7"/>'),
    next: svg('<path d="M9 5l7 7-7 7"/>'),
    reflection: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><circle cx="12" cy="3.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="20.5" r="1.3" fill="currentColor" stroke="none"/>'),
    share: svg('<path d="M12 3v12"/><path d="M7.5 7.5L12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>'),
    settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
    filter: svg('<path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/>'),
    clear: svg('<circle cx="12" cy="12" r="9" fill="currentColor" stroke="none" opacity=".22"/><path d="M9 9l6 6M15 9l-6 6"/>')
  };
  const css = `
.fbar { position: fixed; z-index: 30; left: 0; right: 0; top: max(12px, env(safe-area-inset-top, 0px)); box-sizing: border-box; max-width: 1272px; margin: 0 auto;
  padding: 0 max(16px, env(safe-area-inset-right, 0px)) 0 max(16px, env(safe-area-inset-left, 0px)); display: flex; align-items: center; gap: 10px; pointer-events: none; }
.fbar.bottom { top: auto; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); }
.fbar.right { justify-content: flex-end; }
.fbar > * { pointer-events: auto; }
.fbar [hidden] { display: none !important; }
.fisl > .fb-btn.inbar { padding: 0; width: 32px; }
.fbar .fgap { flex: 1; pointer-events: none; }
.fisl { display: flex; align-items: center; gap: 2px; height: 40px; box-sizing: border-box; padding: 0 4px; border-radius: 999px; min-width: 0;
  color: var(--ink, #14151a); background: var(--glass-strong, rgba(255,255,255,.8)); border: 1px solid var(--stroke, rgba(255,255,255,.7));
  -webkit-backdrop-filter: blur(20px) saturate(175%); backdrop-filter: blur(20px) saturate(175%);
  box-shadow: inset 0 1px 0 var(--hl, rgba(255,255,255,.95)), 0 8px 24px -10px var(--shadow, rgba(30,36,70,.25)); }
.fisl > button, .fisl > a { height: 32px; min-width: 32px; padding: 0 12px; border: 0; border-radius: 999px; background: transparent; color: inherit; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px; font: 600 13px/1 var(--text, system-ui); text-decoration: none; white-space: nowrap; }
.fisl > .ficon { padding: 0; width: 32px; }
.fisl > button:hover, .fisl > a:hover { background: var(--seg, rgba(20,24,40,.06)); }
.fisl > button:disabled { opacity: .35; cursor: default; background: transparent; }
.fisl > button[aria-current="true"], .fisl > button[aria-pressed="true"] { background: var(--fbar-on, rgba(255,255,255,.95)); box-shadow: 0 1px 4px var(--shadow, rgba(30,36,70,.15)); }
.fisl .fdots { display: inline-flex; gap: 3px; } .fisl .fdots b { width: 7px; height: 7px; border-radius: 50%; }
.fsearch { flex: 0 1 auto; width: 200px; padding: 0 14px; gap: 8px; color: var(--muted, #5c606e); cursor: text; transition: width .3s ease; }
.fsearch.open { width: 380px; }
.fsecs > button { padding: 0 11px; }
@media (max-width: 900px) {
  .fsearch { width: 132px; padding: 0 12px; }
  .fbar.searching .fsearch { flex: 1 1 auto; width: auto; }
  .fbar.searching > .fisl:not(.fsearch), .fbar.searching > .fgap { display: none; }
  .fsecs > button { padding: 0 8px; }
  .fsecs .fdots { display: none; }
}
@media (prefers-reduced-motion: reduce) { .fsearch { transition: none; } }
.fsearch input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--ink, #14151a); font: 400 16px/1 var(--text, system-ui); -webkit-appearance: none; appearance: none; padding: 0; }
.fsearch input::-webkit-search-cancel-button, .fsearch input::-webkit-search-decoration { -webkit-appearance: none; display: none; }
.fsearch .fclear { flex: none; width: 30px; height: 30px; margin-right: -8px; padding: 0; border: 0; border-radius: 50%; background: transparent; color: var(--muted, #5c606e); cursor: pointer; display: grid; place-items: center; }
.fsearch .fclear svg { width: 20px; height: 20px; }
.fsearch input::placeholder { color: var(--muted, #5c606e); }
.fsearch:focus-within { box-shadow: inset 0 1px 0 var(--hl, #fff), 0 0 0 2px color-mix(in srgb, var(--focus, #0a6cff) 55%, transparent); }
.fbar :focus-visible { outline: 2px solid var(--focus, #0a6cff); outline-offset: 2px; }
.fbar input:focus, .fbar input:focus-visible { outline: none; }
.fmenu { position: fixed; z-index: 45; min-width: 220px; padding: 8px; border-radius: 18px; box-sizing: border-box; color: var(--ink, #14151a); font-family: var(--text, system-ui);
  background: var(--glass-strong, rgba(255,255,255,.88)); border: 1px solid var(--stroke, rgba(255,255,255,.7));
  -webkit-backdrop-filter: blur(30px) saturate(175%); backdrop-filter: blur(30px) saturate(175%);
  box-shadow: inset 0 1px 0 var(--hl, #fff), 0 18px 44px -16px var(--shadow, rgba(30,36,70,.35)); }
.fmenu h3 { margin: 4px 8px 8px; font-size: 11px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: var(--muted, #5c606e); }
.fmenu .fopts { display: flex; gap: 2px; padding: 3px; border-radius: 999px; background: var(--seg, rgba(20,24,40,.06)); }
.fmenu .fopts button { flex: 1; border: 0; background: transparent; color: inherit; border-radius: 999px; padding: 7px 10px; font: 600 13px/1 var(--text, system-ui); cursor: pointer; }
.fmenu .fopts button[aria-pressed="true"] { background: var(--fbar-on, rgba(255,255,255,.95)); box-shadow: 0 1px 4px var(--shadow, rgba(30,36,70,.15)); }
.fmenu .fitem { display: block; width: 100%; text-align: left; border: 0; background: transparent; color: inherit; border-radius: 10px; padding: 9px 10px; font: 600 14px/1.2 var(--text, system-ui); cursor: pointer; }
.fmenu .fitem:hover { background: var(--seg, rgba(20,24,40,.06)); }
.fmenu .fitem[aria-checked="true"]::after { content: "✓"; float: right; }
.ftoast { position: fixed; z-index: 60; left: 50%; bottom: calc(80px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); padding: 10px 16px; border-radius: 999px;
  font: 600 13px/1 var(--text, system-ui); color: var(--bg, #fff); background: var(--ink, #14151a); box-shadow: 0 8px 24px -8px rgba(0,0,0,.4); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --fbar-on: rgba(255,255,255,.16); } }
:root[data-theme="dark"] { --fbar-on: rgba(255,255,255,.16); }`;
  function addStyle() {
    if (document.getElementById("fbar-style")) return;
    const el = document.createElement("style"); el.id = "fbar-style"; el.textContent = css; document.head.appendChild(el);
  }

  /* ---------- theme (kept in the reader's browser) ---------- */
  const getTheme = () => { try { return localStorage.getItem(THEME) || "auto"; } catch { return "auto"; } };
  function setTheme(t) {
    try { t === "auto" ? localStorage.removeItem(THEME) : localStorage.setItem(THEME, t); } catch {}
    applyTheme();
  }
  function applyTheme() {
    const t = getTheme(), el = document.documentElement;
    if (t === "light" || t === "dark") el.dataset.theme = t; else delete el.dataset.theme;
  }
  applyTheme();

  /* ---------- small parts ---------- */
  const island = (html, cls = "") => `<div class="fisl ${cls}">${html}</div>`;
  const iconBtn = (id, icon, label, extra = "") => `<button type="button" class="ficon" id="${id}" aria-label="${label}" title="${label}" ${extra}>${ICON[icon]}</button>`;
  let menuEl = null;
  function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; document.removeEventListener("pointerdown", outside, true); } }
  function outside(e) { if (menuEl && !menuEl.contains(e.target) && !e.target.closest("[data-fmenu-anchor]")) closeMenu(); }
  // A small glass menu under (or above, for a bottom bar) its anchor button.
  function menu(anchor, html, onClick) {
    if (menuEl) { const same = menuEl.dataset.for === anchor.id; closeMenu(); if (same) return; }
    addStyle();
    menuEl = document.createElement("div"); menuEl.className = "fmenu"; menuEl.dataset.for = anchor.id; menuEl.setAttribute("role", "menu");
    menuEl.innerHTML = html; document.body.appendChild(menuEl);
    const r = anchor.getBoundingClientRect(), m = menuEl.getBoundingClientRect();
    const left = Math.max(8, Math.min(window.innerWidth - m.width - 8, r.right - m.width));
    const below = r.top < window.innerHeight / 2;
    menuEl.style.left = left + "px";
    menuEl.style.top = (below ? r.bottom + 8 : r.top - m.height - 8) + "px";
    menuEl.addEventListener("click", e => onClick(e, menuEl));
    setTimeout(() => document.addEventListener("pointerdown", outside, true));
    const f = menuEl.querySelector("button"); if (f) f.focus();
  }
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(); });
  function settings(anchor) {
    const draw = () => `<h3>Appearance</h3><div class="fopts" role="group" aria-label="Appearance">${[["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]]
      .map(([v, l]) => `<button type="button" data-theme-set="${v}" aria-pressed="${getTheme() === v}">${l}</button>`).join("")}</div>`;
    menu(anchor, draw(), (e, el) => {
      const b = e.target.closest("[data-theme-set]"); if (!b) return;
      setTheme(b.dataset.themeSet); el.innerHTML = draw();
    });
  }
  function toast(text) {
    addStyle();
    const t = document.createElement("div"); t.className = "ftoast"; t.setAttribute("role", "status"); t.textContent = text;
    document.body.appendChild(t); setTimeout(() => t.remove(), 1800);
  }
  async function share(title) {
    const url = location.href.split("#")[0];
    if (navigator.share) { try { await navigator.share({ title, url }); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    try { await navigator.clipboard.writeText(url); toast("Link copied"); } catch { toast(url); }
  }
  // The balance of the gods in its own island.
  const balanceIsland = () => island("", "fb-holder-isl");
  function wireBalance(root, stances) {
    const h = root.querySelector(".fb-holder-isl");
    if (h && window.FramoidBalance) window.FramoidBalance.button({ container: h, stances: stances || null });
  }
  function bar(html, cls = "") {
    addStyle();
    const el = document.createElement("div"); el.className = "fbar " + cls; el.innerHTML = html; document.body.appendChild(el); return el;
  }
  const phone = () => window.matchMedia("(max-width: 900px)").matches;

  /* ---------- list mode ---------- */
  // opts: { onSearch(text), onFilter("all"|"embraced"|"opposed") }
  // One bottom row: search, filter (segmented on wide screens, a menu on phones), settings, balance.
  function list(opts = {}) {
    let filter = "all";
    const filters = [["all", "All"], ["embraced", "Embraced"], ["opposed", "Opposed"]];
    const seg = () => filters.map(([v, l]) => `<button type="button" data-filter="${v}" aria-pressed="${filter === v}">${l}</button>`).join("");
    const el = bar(`${island(iconBtn("fb-settings", "settings", "Settings", 'aria-haspopup="menu" data-fmenu-anchor'))}<div class="fgap"></div>
      <label class="fisl fsearch">${ICON.search}<input type="search" id="fb-q" placeholder="Search" aria-label="Search Reflections" autocomplete="off" enterkeyhint="search"><button type="button" class="fclear" id="fb-clear" aria-label="Clear search" hidden>${ICON.clear}</button></label>
      ${island(seg(), "fseg")}${island(iconBtn("fb-filter", "filter", "Filter", 'aria-haspopup="menu" data-fmenu-anchor aria-pressed="false"'), "ffilter")}
      <div class="fgap"></div>${balanceIsland()}`, "bottom");
    const q = el.querySelector("#fb-q"), box = el.querySelector(".fsearch"), clear = el.querySelector("#fb-clear");
    const grow = on => { box.classList.toggle("open", on); el.classList.toggle("searching", on); };
    const changed = () => { clear.hidden = !q.value; opts.onSearch && opts.onSearch(q.value); };
    q.addEventListener("focus", () => grow(true));
    q.addEventListener("blur", () => grow(false));
    q.addEventListener("input", changed);
    q.addEventListener("keydown", e => { if (e.key === "Enter") q.blur(); });
    // The clear button works without opening the field: pointerdown keeps the focus where it is.
    clear.addEventListener("pointerdown", e => e.preventDefault());
    clear.addEventListener("click", e => { e.preventDefault(); q.value = ""; changed(); });
    const setFilter = v => {
      filter = v; el.querySelector(".fseg").innerHTML = seg(); opts.onFilter && opts.onFilter(v);
      el.querySelector("#fb-filter").setAttribute("aria-pressed", String(v !== "all"));
    };
    el.querySelector(".fseg").addEventListener("click", e => { const b = e.target.closest("[data-filter]"); if (b) setFilter(b.dataset.filter); });
    const fb = el.querySelector("#fb-filter");
    fb.onclick = () => menu(fb, filters.map(([v, l]) => `<button type="button" class="fitem" role="menuitemradio" data-filter="${v}" aria-checked="${filter === v}">${l}</button>`).join(""),
      e => { const b = e.target.closest("[data-filter]"); if (b) { setFilter(b.dataset.filter); closeMenu(); } });
    const g = el.querySelector("#fb-settings"); g.onclick = () => settings(g);
    wireBalance(el);
    const place = () => { el.querySelector(".fseg").hidden = phone(); el.querySelector(".ffilter").hidden = !phone(); };
    place(); window.addEventListener("resize", place);
    return { bottom: el };
  }

  /* ---------- reading mode ---------- */
  // opts: { home (href or null), sections [{id, label, icon?, title, dots[]}], onSection(id), prev / next (href or
  //         null; undefined hides them), stances, title, chrome (false: sections only, for the Studio preview) }
  // Top right: previous / next and share. Bottom row: home, sections, balance.
  function reading(opts = {}) {
    const chrome = opts.chrome !== false;
    const secs = (opts.sections || []).map(s => `<button type="button" data-view="${s.id}" aria-current="false"${s.title ? ` aria-label="${s.title}" title="${s.title}"` : ""}>${s.icon
      ? ICON[s.icon] : `${(s.dots || []).length ? `<span class="fdots">${s.dots.map(g => `<b style="background:var(--${g})"></b>`).join("")}</span>` : ""}${s.label}`}</button>`).join("");
    const steps = chrome && (opts.prev !== undefined || opts.next !== undefined)
      ? island(`${iconBtn("fb-prev", "prev", "Previous Reflection", opts.prev ? "" : "disabled")}${iconBtn("fb-next", "next", "Next Reflection", opts.next ? "" : "disabled")}`, "fsteps") : "";
    const top = chrome ? bar(`${steps}${island(iconBtn("fb-share", "share", "Share"))}`, "top right") : null;
    if (top) top.querySelector("#fb-share").onclick = () => share(opts.title || document.title);
    const bottom = bar(`${chrome && opts.home ? island(`<a href="${opts.home}" class="ficon" id="fb-home" aria-label="All Reflections" title="All Reflections">${ICON.home}</a>`) : ""}
      <div class="fgap"></div>${secs ? island(secs, "fsecs") : ""}<div class="fgap"></div>${chrome ? balanceIsland() : ""}`, "bottom");
    if (chrome) wireBalance(bottom, opts.stances);
    bottom.addEventListener("click", e => { const b = e.target.closest(".fsecs [data-view]"); if (b && opts.onSection) opts.onSection(b.dataset.view); });
    const api = {
      top, bottom,
      setCurrent(id) { bottom.querySelectorAll(".fsecs [data-view]").forEach(b => b.setAttribute("aria-current", String(b.dataset.view === id))); },
      setSteps(prev, next) {
        if (!top) return;
        [["fb-prev", prev], ["fb-next", next]].forEach(([id, href]) => { const b = top.querySelector("#" + id); if (!b) return; b.disabled = !href; b.onclick = href ? () => { location.href = href; } : null; });
      }
    };
    return api;
  }

  window.FramoidBar = { list, reading, share, toast, setTheme, getTheme, ICON };
})();
