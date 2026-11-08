/* Framoid balance: how much each god's Reading counts. Shared by framoid.com (home and every Reflection
   page) and the Studio; tools/sync_balance.py copies this file into each page between the balance markers.
   30 points are shared by the six gods, but no number is ever shown. On the dial, a god nearer Framoid
   counts more; pulling one in pushes the others out in proportion (one shared pool), and a god on the rim
   counts for nothing. Framoid's balance (the master profile) is set in the Studio and published as
   /balance.json; a reader may change it for themselves (kept in their browser, for every page). */
(function () {
  "use strict";
  if (window.FramoidBalance) return;
  const GODS = ["rodim", "mir", "idrom", "aromi", "ora", "doria"];
  const NAME = { rodim: "Rodim", aromi: "Aromi", mir: "Mir", ora: "Ora", idrom: "Idrom", doria: "Doria" };
  const ANG = { rodim: -150, mir: -90, idrom: -30, aromi: 30, ora: 90, doria: 150 }; // as on the Subject dial
  const T = 30, RIN = 78, ROUT = 182, E = 0.39, KEY = "framoid.balance";
  const equal = () => Object.fromEntries(GODS.map(g => [g, T / 6]));
  // Any set of non-negative weights, scaled so they add up to 30. All zero (or nothing) means equal.
  function norm(w) {
    const v = Object.fromEntries(GODS.map(g => [g, Math.max(0, Number(w && w[g]) || 0)]));
    const s = GODS.reduce((a, g) => a + v[g], 0);
    return s > 1e-9 ? Object.fromEntries(GODS.map(g => [g, v[g] * T / s])) : equal();
  }
  const same = (a, b) => GODS.every(g => Math.abs(a[g] - b[g]) < 0.05);
  let master = equal();
  const store = {
    get() { try { const x = JSON.parse(localStorage.getItem(KEY) || "null"); return x && x.weights ? norm(x.weights) : null; } catch { return null; } },
    set(w) { try { localStorage.setItem(KEY, JSON.stringify({ weights: w })); } catch {} },
    clear() { try { localStorage.removeItem(KEY); } catch {} }
  };
  const emit = () => window.dispatchEvent(new CustomEvent("framoid:balance"));

  /* ---------- the result: Framoid's centre fills with the embracing share ---------- */
  // f = share of weight that embraces the Subject (0..1), s = 2f - 1. The fill rises with f; both colours
  // start grey at balance and deepen smoothly as one side outweighs the other. No thresholds.
  function tide(stances, w) {
    const st = stances || {};
    if (!GODS.every(g => st[g] === "embraces" || st[g] === "opposes")) return null;
    w = w || current();
    const f = GODS.reduce((a, g) => a + (st[g] === "embraces" ? w[g] : 0), 0) / T, s = 2 * f - 1, k = Math.abs(s);
    const yes = Math.round(100 * (s > 0 ? k : k * 0.35)), no = Math.round(100 * (s < 0 ? k : k * 0.35)), p = (f * 100).toFixed(1);
    const yc = `color-mix(in srgb, var(--fb-yes) ${yes}%, var(--fb-calm))`, nc = `color-mix(in srgb, var(--fb-no) ${no}%, var(--fb-calm))`;
    const bg = `linear-gradient(to top, ${yc} 0 ${p}%, ${nc} ${p}% 100%)`;
    // Words only for screen readers.
    const say = k < 0.1 ? "evenly balanced" : (k < 0.45 ? "leaning toward " : "weighted toward ") + (s > 0 ? "embracing" : "opposing");
    return { f, s, bg, yc, nc, say };
  }
  const current = () => store.get() || master;

  /* ---------- styles (use each page's own glass and god colours) ---------- */
  const css = `
:root { --fb-yes: #1d9e75; --fb-no: #d4572e; --fb-calm: #b3b5bd; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --fb-yes: #3cc596; --fb-no: #ff7a4f; --fb-calm: #6c6f7a; } }
:root[data-theme="dark"] { --fb-yes: #3cc596; --fb-no: #ff7a4f; --fb-calm: #6c6f7a; }
.fb-btn { position: fixed; z-index: 40; top: max(12px, env(safe-area-inset-top, 0px)); right: max(12px, env(safe-area-inset-right, 0px));
  width: 40px; height: 40px; border-radius: 50%; padding: 0; display: grid; place-items: center; cursor: pointer; color: var(--ink, #14151a);
  border: 1px solid var(--stroke, rgba(255,255,255,.7)); background: var(--glass-strong, rgba(255,255,255,.8));
  -webkit-backdrop-filter: blur(20px) saturate(175%); backdrop-filter: blur(20px) saturate(175%);
  box-shadow: inset 0 1px 0 var(--hl, rgba(255,255,255,.95)), 0 6px 18px -8px var(--shadow, rgba(30,36,70,.2)); }
.fb-btn:hover { transform: scale(1.05); }
.fb-btn svg { width: 24px; height: 24px; }
.fb-btn.custom::after { content: ""; position: absolute; top: 3px; right: 3px; width: 9px; height: 9px; border-radius: 50%;
  background: var(--focus, #0a6cff); border: 2px solid var(--bg, #eceef4); }
.fb-scrim { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; padding: 16px; background: rgba(10, 12, 20, .28);
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.fb-sheet { width: min(440px, 100%); max-height: calc(100vh - 32px); overflow: auto; box-sizing: border-box; padding: 20px 20px 18px; border-radius: 26px;
  color: var(--ink, #14151a); font-family: var(--text, system-ui, sans-serif); text-align: center;
  background: var(--glass-strong, rgba(255,255,255,.85)); border: 1px solid var(--stroke, rgba(255,255,255,.7));
  -webkit-backdrop-filter: blur(30px) saturate(175%); backdrop-filter: blur(30px) saturate(175%);
  box-shadow: inset 0 1px 0 var(--hl, rgba(255,255,255,.95)), 0 24px 60px -20px var(--shadow, rgba(30,36,70,.3)); }
.fb-sheet h2 { margin: 0 0 4px; font: 600 19px/1.25 var(--display, var(--text, system-ui)); letter-spacing: -.01em; }
.fb-sheet p { margin: 0; font-size: 13px; line-height: 1.45; color: var(--muted, #5c606e); }
.fb-dial { display: block; width: 100%; max-width: 400px; margin: 4px auto 6px; touch-action: none; user-select: none; -webkit-user-select: none; overflow: visible; }
.fb-dial .hoop { fill: none; stroke: var(--hairline, rgba(20,24,40,.1)); stroke-width: 1; }
.fb-dial .mid { fill: none; stroke: var(--hairline, rgba(20,24,40,.1)); stroke-width: 1; stroke-dasharray: 2 5; }
.fb-dial .spoke { stroke: var(--hairline, rgba(20,24,40,.1)); stroke-width: 1; }
.fb-dial .orb { cursor: grab; }
.fb-dial .orb:focus { outline: none; }
.fb-dial .orb:focus-visible .disc { stroke: var(--focus, #0a6cff); stroke-width: 3; }
.fb-dial .name { font: 600 13px/1 var(--rounded, var(--text, system-ui)); fill: var(--ink, #14151a); pointer-events: none; }
.fb-dial .mark { font: 800 16px/1 var(--rounded, var(--text, system-ui)); pointer-events: none; }
.fb-dial .core-lbl { font: 700 12px/1 var(--rounded, var(--text, system-ui)); fill: var(--ink, #14151a); pointer-events: none; }
.fb-row { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.fb-row button { font: 600 14px/1 var(--text, system-ui); color: var(--ink, #14151a); cursor: pointer; padding: 10px 16px; border-radius: 999px;
  border: 1px solid var(--stroke, rgba(255,255,255,.7)); background: var(--glass, rgba(255,255,255,.6)); box-shadow: inset 0 1px 0 var(--hl, rgba(255,255,255,.95)); }
.fb-row button.fb-primary { background: var(--ink, #14151a); color: var(--bg, #fff); border-color: transparent; }
.fb-row button:disabled { opacity: .5; cursor: default; }
.fb-status { min-height: 1.4em; margin-top: 6px !important; }
.fb-tide { display: inline-block; width: 22px; height: 22px; border-radius: 50%; flex: none; box-shadow: inset 0 0 0 1px var(--hairline, rgba(20,24,40,.12)); }
@media (prefers-reduced-motion: reduce) { .fb-btn:hover { transform: none; } }`;
  function addStyle() {
    if (document.getElementById("fb-style")) return;
    const el = document.createElement("style"); el.id = "fb-style"; el.textContent = css; document.head.appendChild(el);
  }
  const ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8.5" opacity=".55"/><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/><circle cx="4.6" cy="7.8" r="1.9" fill="currentColor" stroke="none"/><circle cx="19.4" cy="7.8" r="1.9" fill="currentColor" stroke="none"/><circle cx="12" cy="20.5" r="1.9" fill="currentColor" stroke="none"/></svg>`;

  /* ---------- the dial ---------- */
  const rad = v => ROUT - (ROUT - RIN) * Math.pow(Math.max(0, v) / T, E);
  const wOf = r => T * Math.pow(Math.max(0, Math.min(1, (ROUT - r) / (ROUT - RIN))), 1 / E);
  // Give god id the weight v; the others share what is left in proportion to their current weights
  // (equally if they all had none).
  function setOne(w, id, v) {
    v = Math.max(0, Math.min(T, v));
    const rest = T - v, so = GODS.reduce((a, g) => a + (g === id ? 0 : w[g]), 0), out = {};
    GODS.forEach(g => { out[g] = g === id ? v : so > 1e-6 ? w[g] * rest / so : rest / 5; });
    return out;
  }
  function dialSvg(w, stances) {
    const t = stances ? tide(stances, w) : null;
    const spokes = GODS.map(g => { const r = ANG[g] * Math.PI / 180;
      return `<line class="spoke" x1="${(RIN * Math.cos(r)).toFixed(1)}" y1="${(RIN * Math.sin(r)).toFixed(1)}" x2="${(ROUT * Math.cos(r)).toFixed(1)}" y2="${(ROUT * Math.sin(r)).toFixed(1)}"/>`; }).join("");
    const orbs = GODS.map(g => {
      const r = ANG[g] * Math.PI / 180, R = rad(w[g]), x = R * Math.cos(r), y = R * Math.sin(r), zero = w[g] < 0.15;
      const size = zero ? 10 : 11 + 17 * Math.sqrt(w[g] / T), st = stances && stances[g], opp = st === "opposes";
      const lr = size + 11, lx = x + lr * Math.cos(r), ly = y + lr * Math.sin(r);
      const anchor = Math.abs(Math.cos(r)) < 0.2 ? "middle" : Math.cos(r) > 0 ? "start" : "end";
      const mark = st === "embraces" ? "↑" : opp ? "↓" : "";
      const label = `${NAME[g]}${st ? (opp ? ", opposes the Subject" : ", embraces the Subject") : ""}: ${zero ? "no weight" : w[g] > T / 6 * 1.4 ? "more weight than most" : w[g] < T / 6 * 0.6 ? "less weight than most" : "about an equal share"}`;
      return `<g class="orb" data-god="${g}" tabindex="0" role="slider" aria-label="${label}" aria-valuemin="0" aria-valuemax="30" aria-valuenow="${Math.round(w[g])}" aria-valuetext="${label}" style="opacity:${zero ? 0.4 : 1}">
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${Math.max(size, 20)}" fill="transparent"/>
        <circle class="disc" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(1)}" style="fill:${opp || zero ? "var(--glass-strong, #fff)" : `var(--${g})`};stroke:var(--${g});stroke-width:${opp || zero ? 2 : 1}" ${opp || zero ? 'stroke-dasharray="4 3"' : ""}/>
        ${mark && !zero ? `<text class="mark" x="${x.toFixed(1)}" y="${(y + 1).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" style="fill:${opp ? `var(--${g})` : "#fff"}">${mark}</text>` : ""}
        <text class="name" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle">${NAME[g]}</text></g>`;
    }).join("");
    const core = t
      ? `<clipPath id="fb-cc"><circle r="36"/></clipPath><g clip-path="url(#fb-cc)"><rect x="-41" y="-41" width="82" height="82" style="fill:${t.nc}"/><rect x="-41" y="${(36 - 72 * t.f).toFixed(1)}" width="82" height="82" style="fill:${t.yc}"/></g>
         <circle r="36" fill="none" style="stroke:var(--stroke, #fff)" stroke-width="1.5"/>`
      : `<circle r="36" style="fill:var(--glass, rgba(255,255,255,.6));stroke:var(--hairline, rgba(0,0,0,.1))"/><text class="core-lbl" text-anchor="middle" dominant-baseline="middle">Framoid</text>`;
    return `<svg class="fb-dial" viewBox="-222 -208 444 416" role="group" aria-label="The gods around Framoid${t ? ". The centre is " + t.say : ""}">
      <circle class="hoop" r="${ROUT}"/><circle class="mid" r="${rad(T / 6).toFixed(1)}"/><circle class="hoop" r="${RIN}"/>${spokes}${core}${orbs}</svg>`;
  }

  /* ---------- the sheet ---------- */
  // mode "reader": changes apply at once and are kept in this browser. mode "master" (Studio): changes
  // stay in the sheet until onSave(weights) resolves.
  function open(opts = {}) {
    addStyle();
    const masterMode = opts.mode === "master";
    let w = norm(opts.weights || (masterMode ? master : current()));
    const prevFocus = document.activeElement;
    const scrim = document.createElement("div");
    scrim.className = "fb-scrim";
    scrim.innerHTML = `<div class="fb-sheet" role="dialog" aria-modal="true" aria-labelledby="fb-title">
      <h2 id="fb-title">${masterMode ? "Framoid's balance" : "Balance of the gods"}</h2>
      <p>${masterMode ? "How much each god's Reading counts on framoid.com, unless a reader changes it." : "How much each god's Reading counts for you, on every page."} Pull a god toward the centre to give it more weight; the others make room.</p>
      <div class="fb-holder"></div>
      <div class="fb-row">${masterMode
        ? `<button type="button" data-fb="equal">Equal weights</button><button type="button" data-fb="cancel">Cancel</button><button type="button" class="fb-primary" data-fb="save">Save and publish</button>`
        : `<button type="button" data-fb="reset">Reset to Framoid's balance</button><button type="button" class="fb-primary" data-fb="done">Done</button>`}</div>
      <p class="fb-status" aria-live="polite"></p></div>`;
    document.body.appendChild(scrim);
    const holder = scrim.querySelector(".fb-holder"), status = scrim.querySelector(".fb-status");
    const resetBtn = scrim.querySelector('[data-fb="reset"]');
    function draw(focusGod) {
      holder.innerHTML = dialSvg(w, opts.stances);
      if (resetBtn) resetBtn.disabled = same(w, master);
      if (focusGod) { const o = holder.querySelector(`.orb[data-god="${focusGod}"]`); if (o) o.focus(); }
    }
    function change(nw, focusGod) {
      w = nw; draw(focusGod);
      if (!masterMode) { if (same(w, master)) store.clear(); else store.set(w); emit(); }
    }
    draw();
    // Dragging: the god's weight follows its distance from the centre along its own spoke.
    let drag = null;
    holder.addEventListener("pointerdown", e => {
      const o = e.target.closest(".orb"); if (!o) return;
      drag = o.dataset.god; try { holder.setPointerCapture(e.pointerId); } catch {} e.preventDefault();
    });
    holder.addEventListener("pointermove", e => {
      if (!drag) return;
      const svg = holder.querySelector("svg"), m = svg.getScreenCTM(); if (!m) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()), a = ANG[drag] * Math.PI / 180;
      change(setOne(w, drag, wOf(p.x * Math.cos(a) + p.y * Math.sin(a))));
    });
    const end = () => { drag = null; };
    holder.addEventListener("pointerup", end); holder.addEventListener("pointercancel", end);
    // Keyboard: arrows or +/- move the focused god in or out.
    holder.addEventListener("keydown", e => {
      const o = e.target.closest(".orb"); if (!o) return;
      const g = o.dataset.god, step = { ArrowUp: 1, ArrowRight: 1, "+": 1, "=": 1, ArrowDown: -1, ArrowLeft: -1, "-": -1 }[e.key];
      if (!step) return; e.preventDefault(); e.stopPropagation(); // keep the page's arrow-key navigation out of the dial
      change(setOne(w, g, w[g] + step * 1.5), g);
    });
    const close = () => { scrim.remove(); document.removeEventListener("keydown", onKey); if (prevFocus && prevFocus.focus) prevFocus.focus(); opts.onClose && opts.onClose(); };
    const onKey = e => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    scrim.addEventListener("click", async e => {
      if (e.target === scrim) return close();
      const act = e.target.closest("[data-fb]"); if (!act) return;
      const a = act.dataset.fb;
      if (a === "done" || a === "cancel") return close();
      if (a === "reset") return change(norm(master));
      if (a === "equal") return change(equal());
      if (a === "save") {
        act.disabled = true; status.textContent = "Saving…";
        try { await opts.onSave(w); setMaster(w); status.textContent = "Saved."; setTimeout(close, 700); }
        catch (err) { act.disabled = false; status.textContent = (err && err.message) || "Couldn't save. Try again."; }
      }
    });
    (scrim.querySelector(".orb") || scrim.querySelector("button")).focus();
  }

  /* ---------- the always-visible button ---------- */
  let btn = null, btnOpts = {};
  function button(opts = {}) {
    addStyle(); btnOpts = opts;
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button"; btn.className = "fb-btn"; btn.innerHTML = ICON;
      btn.addEventListener("click", () => open({ mode: "reader", stances: btnOpts.stances }));
      document.body.appendChild(btn);
    }
    mark();
    return btn;
  }
  function mark() {
    if (!btn) return;
    const custom = !!store.get() && !same(store.get(), master);
    btn.classList.toggle("custom", custom);
    btn.setAttribute("aria-label", "Balance of the gods" + (custom ? " (your own)" : ""));
    btn.title = custom ? "Balance of the gods: your own" : "Balance of the gods";
  }
  window.addEventListener("framoid:balance", mark);
  window.addEventListener("storage", e => { if (e.key === KEY) emit(); }); // another tab changed it

  function setMaster(w) { master = norm(w); if (store.get() && same(store.get(), master)) store.clear(); emit(); }
  async function loadMaster(url) {
    try { const r = await fetch(url, { cache: "no-cache" }); if (r.ok) { const j = await r.json(); setMaster(j.weights || j); return master; } } catch {}
    return master;
  }

  window.FramoidBalance = { GODS, NAME, total: T, equal, norm, weights: current, master: () => master, setMaster, loadMaster, tide, open, button, addStyle };
})();
