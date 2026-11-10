/* Framoid balance: how much each god's Reading counts. Shared by framoid.com (home and every Reflection
   page) and the Studio; tools/sync_balance.py copies this file into each page between the balance markers.
   30 points are shared by the six gods, but no number is ever shown. On the dial, a god nearer Framoid
   counts more; pulling one in pushes the others out in proportion (one shared pool), and a god on the rim
   counts for nothing. Framoid's balance (the master profile) is set in the Studio and published as
   /balance.json; a reader may change it for themselves (kept in their browser, for every page).
   The result is Framoid's own colour: on a Reflection its orb shades from red (opposed) through amber
   (balanced) to green (embraced) with the weighted share of the gods that embrace the Subject; elsewhere it
   blends the gods' colours. The gods keep their colours, with a small red or green dot for their stance. */
(function () {
  "use strict";
  if (window.FramoidBalance) return;
  const GODS = ["rodim", "mir", "idrom", "aromi", "ora", "doria"];
  const NAME = { rodim: "Rodim", aromi: "Aromi", mir: "Mir", ora: "Ora", idrom: "Idrom", doria: "Doria" };
  const ANG = { rodim: -150, mir: -90, idrom: -30, aromi: 30, ora: 90, doria: 150 }; // as on the Subject dial
  const T = 30, RIN = 82, ROUT = 182, E = 0.39, KEY = "framoid.balance";
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

  /* ---------- the result: Framoid's colour, red to green ---------- */
  // f = share of weight that embraces the Subject (0..1); 0 = red, 0.5 = amber, 1 = green (mixed in oklch).
  function tide(stances, w) {
    const st = stances || {};
    if (!GODS.every(g => st[g] === "embraces" || st[g] === "opposes")) return null;
    w = w || current();
    const f = GODS.reduce((a, g) => a + (st[g] === "embraces" ? w[g] : 0), 0) / T, s = 2 * f - 1, k = Math.abs(s);
    // Words only for screen readers.
    const say = k < 0.1 ? "evenly balanced" : (k < 0.45 ? "leaning toward " : "weighted toward ") + (s > 0 ? "embracing" : "opposing");
    const color = f < 0.5 ? `color-mix(in oklch, var(--fb-no), var(--fb-mid) ${(f * 200).toFixed(1)}%)`
                          : `color-mix(in oklch, var(--fb-mid), var(--fb-yes) ${((f - 0.5) * 200).toFixed(1)}%)`;
    return { f, s, say, color };
  }
  // A Framoid orb as HTML (home cards): <span class="fb-orb"> coloured by --fc.
  const orb = (t, cls = "") => t ? `<span class="fb-orb ${cls}" style="--fc:${t.color}" role="img" aria-label="Framoid: ${t.say}"></span>` : "";
  const setOrb = (el, t) => { if (el && t) { el.style.setProperty("--fc", t.color); el.setAttribute("aria-label", "Framoid: " + t.say); } };
  // A stance dot for a god (HTML): green embraces, red opposes.
  const dot = st => st === "embraces" || st === "opposes" ? `<span class="fb-sd ${st === "embraces" ? "yes" : "no"}" aria-hidden="true"></span>` : "";
  const current = () => store.get() || master;

  /* ---------- styles (use each page's own glass and god colours) ---------- */
  const css = `
:root { --fb-yes: #1fa363; --fb-no: #dc3b34; --fb-mid: #e9a516;
  --fb-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='120' height='120' filter='url(%23n)'/></svg>"); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --fb-yes: #35d184; --fb-no: #ff5a52; --fb-mid: #f5b731; } }
:root[data-theme="dark"] { --fb-yes: #35d184; --fb-no: #ff5a52; --fb-mid: #f5b731; }
.fb-orb { --fc: #888; position: relative; display: inline-block; flex: none; width: 18px; height: 18px; border-radius: 50%; isolation: isolate;
  background: radial-gradient(circle at 34% 28%, color-mix(in srgb, var(--fc) 30%, white) 0%, var(--fc) 52%, color-mix(in srgb, var(--fc) 62%, black) 100%);
  box-shadow: inset 0 1px 1px rgba(255,255,255,.75), inset 0 -3px 6px rgba(0,0,0,.2), 0 0 8px 1px color-mix(in srgb, var(--fc) 60%, transparent), 0 0 18px 4px color-mix(in srgb, var(--fc) 28%, transparent);
  transition: background .4s, box-shadow .4s; }
.fb-orb::before { content: ""; position: absolute; inset: 0; border-radius: 50%; opacity: .35; mix-blend-mode: soft-light; background-image: var(--fb-noise); background-size: 60px; }
.fb-orb::after { content: ""; position: absolute; left: 20%; top: 12%; width: 38%; height: 26%; border-radius: 50%; background: radial-gradient(ellipse at center, rgba(255,255,255,.85), rgba(255,255,255,0) 70%); }
.fb-sd { position: absolute; width: 6px; height: 6px; border-radius: 50%; right: -2px; bottom: -2px; box-sizing: content-box; border: 1.5px solid var(--bg, #fff); }
.fb-sd.yes { background: var(--fb-yes); } .fb-sd.no { background: var(--fb-no); }
@keyframes fb-breathe { 50% { transform: scale(1.06); opacity: .75; } }
.fb-btn { position: fixed; z-index: 40; top: max(12px, env(safe-area-inset-top, 0px)); right: max(12px, env(safe-area-inset-right, 0px));
  width: 40px; height: 40px; border-radius: 50%; padding: 0; display: grid; place-items: center; cursor: pointer; color: var(--ink, #14151a);
  border: 1px solid var(--stroke, rgba(255,255,255,.7)); background: var(--glass-strong, rgba(255,255,255,.8));
  -webkit-backdrop-filter: blur(20px) saturate(175%); backdrop-filter: blur(20px) saturate(175%);
  box-shadow: inset 0 1px 0 var(--hl, rgba(255,255,255,.95)), 0 6px 18px -8px var(--shadow, rgba(30,36,70,.2)); }
.fb-btn:hover { transform: scale(1.05); }
.fb-btn.inbar { position: relative; top: auto; right: auto; z-index: auto; width: 32px; height: 32px; border: 0; background: transparent; box-shadow: none;
  -webkit-backdrop-filter: none; backdrop-filter: none; }
.fb-btn.inbar:hover { transform: none; background: var(--seg, rgba(20,24,40,.06)); }
.fb-btn.inbar svg { width: 22px; height: 22px; }
.fb-btn.inbar.custom::after { top: 1px; right: 1px; }
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
.fb-dial .orb { cursor: pointer; }
.fb-dial.tuning .orb { cursor: grab; }
.fb-dial .orb:focus { outline: none; }
.fb-dial .orb:focus-visible .disc { stroke: var(--focus, #0a6cff); stroke-width: 3; }
.fb-dial .fb-rail, .fb-dial .fb-cue { opacity: 0; transition: opacity .2s; pointer-events: none; }
.fb-dial.held .fb-rail, .fb-dial.held .fb-cue { opacity: 1; }
.fb-dial.held .orb, .fb-dial.held .fb-own { opacity: 0 !important; transition: opacity .2s; }
.fb-dial .orb, .fb-dial .fb-own { transition: opacity .2s; }
.fb-dial .fb-cue { font: 600 13px/1 var(--text, system-ui); fill: var(--muted, #5c606e); }
.fb-dial .fb-cue.on { fill: var(--ink, #14151a); }
.fb-dial.held .fb-core { transform: scale(1.06); }
.fb-dial .fb-core { transition: transform .15s; -webkit-touch-callout: none; }
.fb-dial .name { font: 600 13px/1 var(--rounded, var(--text, system-ui)); fill: var(--ink, #14151a); pointer-events: none; }
.fb-dial .mark { font: 800 16px/1 var(--rounded, var(--text, system-ui)); pointer-events: none; }
.fb-dial .fb-core-lbl { font: 700 12px/1 var(--rounded, var(--text, system-ui)); fill: var(--ink, #14151a); pointer-events: none; }
.fb-row { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.fb-row button { font: 600 14px/1 var(--text, system-ui); color: var(--ink, #14151a); cursor: pointer; padding: 10px 16px; border-radius: 999px;
  border: 1px solid var(--stroke, rgba(255,255,255,.7)); background: var(--glass, rgba(255,255,255,.6)); box-shadow: inset 0 1px 0 var(--hl, rgba(255,255,255,.95)); }
.fb-row button.fb-primary { background: var(--ink, #14151a); color: var(--bg, #fff); border-color: transparent; }
.fb-row button:disabled { opacity: .5; cursor: default; }
.fb-status { min-height: 1.4em; margin-top: 6px !important; }
.fb-dial .fb-core { cursor: pointer; }
.fb-dial .fb-core:focus { outline: none; }
.fb-dial .fb-core:focus-visible .core-disc { stroke: var(--focus, #0a6cff); stroke-width: 3; }
.fb-dial .hint { font: 600 11px/1 var(--text, system-ui); pointer-events: none; }
.fb-dial .ask { font: 700 15px/1 var(--rounded, var(--text, system-ui)); fill: var(--ink, #14151a); pointer-events: none; }
.fb-dial .aura { transform-box: fill-box; transform-origin: center; animation: fb-breathe 5s ease-in-out infinite; }
.fb-dial .on-orb { fill: #fff; paint-order: stroke; stroke: rgba(0,0,0,.28); stroke-width: 2.5px; }
@media (prefers-reduced-motion: reduce) { .fb-btn:hover { transform: none; } .fb-dial .aura { animation: none; } }`;
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
  // tuning: the gods can be dragged (sliders); otherwise each god and Framoid is a button that opens its view.
  // x (knob dials, the site's Home): { symmetric: gods on one even ring (size still shows weight),
  //   own: the reader's stance -1..1 or null (a ring around Framoid), knob: Framoid is the stance knob (rail drawn, hidden
  //   until held; while tuning Framoid reads "Done" and asks "Reset? / Drag again") }.
  const SYM = 112, RAILW = 300;
  const colourOf = f => f < .5 ? `color-mix(in oklch, var(--fb-no), var(--fb-mid) ${Math.round(f * 200)}%)` : `color-mix(in oklch, var(--fb-mid), var(--fb-yes) ${Math.round((f - .5) * 200)}%)`;
  function dialSvg(w, stances, resettable, asking, tuning = true, x = {}) {
    const t = stances ? tide(stances, w) : null;
    const compact = !!x.compact && !tuning, sym = (!!x.symmetric || compact) && !tuning, knob = !!x.knob;
    const spokes = GODS.map(g => { const r = ANG[g] * Math.PI / 180;
      return `<line class="spoke" x1="${(RIN * Math.cos(r)).toFixed(1)}" y1="${(RIN * Math.sin(r)).toFixed(1)}" x2="${(ROUT * Math.cos(r)).toFixed(1)}" y2="${(ROUT * Math.sin(r)).toFixed(1)}"/>`; }).join("");
    const orbs = GODS.map(g => {
      const r = ANG[g] * Math.PI / 180, R = sym ? SYM : rad(w[g]), x = R * Math.cos(r), y = R * Math.sin(r), zero = w[g] < 0.15;
      const size = compact ? 28 : zero ? 10 : 11 + 17 * Math.sqrt(w[g] / T), st = stances && stances[g], opp = st === "opposes";
      const lr = size + 11, lx = x + lr * Math.cos(r), ly = y + lr * Math.sin(r);
      const anchor = Math.abs(Math.cos(r)) < 0.2 ? "middle" : Math.cos(r) > 0 ? "start" : "end";
      const label = `${NAME[g]}${st ? (opp ? ", opposes the Subject" : ", embraces the Subject") : ""}: ${zero ? "no weight" : w[g] > T / 6 * 1.4 ? "more weight than most" : w[g] < T / 6 * 0.6 ? "less weight than most" : "about an equal share"}`;
      const X = x.toFixed(1), Y = y.toFixed(1), d = size * 0.72;
      const role = tuning ? `role="slider" aria-label="${label}" aria-valuemin="0" aria-valuemax="30" aria-valuenow="${Math.round(w[g])}" aria-valuetext="${label}"`
        : `role="button" aria-label="${NAME[g]}${st ? (opp ? ", opposes" : ", embraces") : ""}: open its pair"`;
      return `<g class="orb" data-god="${g}" tabindex="0" ${role} style="opacity:${zero ? 0.35 : 1}">
        <circle cx="${X}" cy="${Y}" r="${compact ? 40 : Math.max(size, 20)}" fill="transparent"/>
        <circle class="disc" cx="${X}" cy="${Y}" r="${size.toFixed(1)}" style="fill:var(--${g});stroke:rgba(255,255,255,.55)" stroke-width="1"/>
        <circle cx="${X}" cy="${Y}" r="${size.toFixed(1)}" fill="url(#fb-shine)" pointer-events="none"/>
        ${st && !zero ? `<circle cx="${(x + d).toFixed(1)}" cy="${(y - d).toFixed(1)}" r="${compact ? 8 : 5.5}" style="fill:var(${opp ? "--fb-no" : "--fb-yes"});stroke:var(--bg, #fff)" stroke-width="2"/>` : ""}
        ${compact ? "" : `<text class="name" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle">${NAME[g]}</text>`}</g>`;
    }).join("");
    // Framoid's centre: an orb with an aura. On a Reflection its colour runs red → amber → green with the
    // weighted result; elsewhere it blends the gods' colours (six blurred sectors). When the balance can be
    // reset it carries a small "Reset" hint; the first click asks "Reset?" in place, the second resets.
    // The blend gives each god a slice as wide as its weight, in dial order, the first one centred on Rodim.
    let at = ANG[GODS[0]] - w[GODS[0]] / T * 180;
    const sectors = GODS.map(g => {
      const span = w[g] / T * 360, a0 = at * Math.PI / 180, a1 = (at + span) * Math.PI / 180, R = 80; at += span;
      if (span < 0.5) return "";
      if (span > 359.5) return `<circle r="${R}" style="fill:var(--${g})"/>`;
      return `<path d="M0 0L${(R * Math.cos(a0)).toFixed(1)} ${(R * Math.sin(a0)).toFixed(1)}A${R} ${R} 0 ${span > 180 ? 1 : 0} 1 ${(R * Math.cos(a1)).toFixed(1)} ${(R * Math.sin(a1)).toFixed(1)}Z" style="fill:var(--${g})"/>`; }).join("");
    const body = t ? `<circle r="48" style="fill:${t.color}"/>` : `<g filter="url(#fb-soft)">${sectors}</g>`;
    const aura = t ? `<circle class="aura" r="62" style="fill:${t.color}" filter="url(#fb-glow)" opacity=".6"/>`
                   : `<g class="aura" filter="url(#fb-glow)" opacity=".45"><g transform="scale(.72)">${sectors}</g></g>`;
    const hintR = resettable && !knob;
    const inner = asking
      ? `<text class="ask on-orb" y="-3" text-anchor="middle" dominant-baseline="middle">Reset?</text><text class="hint on-orb" y="15" text-anchor="middle" dominant-baseline="middle">${knob ? "Drag again" : "Tap again"}</text>`
      : `<text class="core-lbl on-orb" y="${hintR ? -5 : 0}" text-anchor="middle" dominant-baseline="middle">${knob && tuning ? "Done" : "Framoid"}</text>`
        + (hintR ? `<text class="hint on-orb" y="13" text-anchor="middle" dominant-baseline="middle">Reset</text>` : "");
    // The reader's own stance: a ring around Framoid in its colour. The rail: shown while Framoid is held.
    const ownC = x.own === null || x.own === undefined ? "" : colourOf((x.own + 1) / 2);
    const ring = ownC && !tuning ? `<circle class="fb-own" r="57" style="stroke:${ownC}" fill="none" stroke-width="5"/>` : "";
    const pan = t ? t.s : 0;
    const rail = knob && !tuning ? `<g class="fb-rail" mask="url(#fb-railmask)"><g class="fb-rail-move" transform="translate(${(-(((x.own ?? pan) + 1) / 2) * RAILW).toFixed(1)} 0)">
        <rect x="0" y="-6" width="${RAILW}" height="12" rx="6" fill="url(#fb-railg)"/>
        <rect x="${(((pan + 1) / 2) * RAILW - 2).toFixed(1)}" y="-14" width="4" height="28" rx="2" fill="#fff" style="stroke:rgba(20,24,40,.45)" stroke-width="1"/></g></g>
      <text class="fb-cue" y="-74" text-anchor="middle">↑ Tune</text><text class="fb-cue" y="84" text-anchor="middle">↓ The Pantheon's</text>` : "";
    const defs = `<defs>
      <radialGradient id="fb-shine" cx=".34" cy=".28" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient>
      <filter id="fb-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="12"/></filter>
      <filter id="fb-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>
      <filter id="fb-grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .45 0"/></filter>
      <clipPath id="fb-cc"><circle r="48"/></clipPath>${knob ? `
      <linearGradient id="fb-railg"><stop offset="0" style="stop-color:var(--fb-no)"/><stop offset=".5" style="stop-color:var(--fb-mid)"/><stop offset="1" style="stop-color:var(--fb-yes)"/></linearGradient>
      <linearGradient id="fb-railfade"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".2" stop-color="#fff"/><stop offset=".8" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <mask id="fb-railmask"><rect x="-190" y="-20" width="380" height="40" fill="url(#fb-railfade)"/></mask>` : ""}</defs>`;
    const coreAttr = knob
      ? (tuning ? ` tabindex="0" role="button" aria-label="${asking ? "Drag down again to reset the balance" : "Done tuning (drag down twice to reset the balance)"}"`
        : ` tabindex="0" role="button" aria-label="Framoid${t ? ", " + t.say : ""}: open its reflection. Left and right arrows set your own stance, Delete resets it, Up tunes the balance"`)
      : tuning ? (resettable || asking ? ` tabindex="0" role="button" aria-label="${asking ? "Confirm: reset the balance" : "Reset the balance"}"` : "")
      : ` tabindex="0" role="button" aria-label="Framoid${t ? ", " + t.say : ""}: open its reflection"`;
    const core = `<g class="fb-core"${coreAttr}>
      ${aura}<g clip-path="url(#fb-cc)">${body}<rect x="-48" y="-48" width="96" height="96" filter="url(#fb-grain)" style="mix-blend-mode:soft-light"/></g>
      <circle class="core-disc" r="48" fill="url(#fb-shine)" style="stroke:rgba(255,255,255,.55)" stroke-width="1"/>
      <ellipse cx="-14" cy="-26" rx="15" ry="8" fill="#fff" opacity=".35" pointer-events="none"/>${inner}</g>`;
    const frame = sym ? "" : `<circle class="hoop" r="${ROUT}"/><circle class="mid" r="${rad(T / 6).toFixed(1)}"/>${spokes}`;
    return `<svg class="fb-dial${tuning ? " tuning" : ""}${sym ? " sym" : ""}" viewBox="${compact ? "-148 -148 296 296" : sym ? "-196 -166 392 332" : "-222 -208 444 416"}" role="group" aria-label="The gods around Framoid${t ? ". The centre is " + t.say : ""}">
      ${defs}${frame}${rail}${ring}${core}${orbs}</svg>`;
  }

  /* ---------- one dial, two modes ---------- */
  // mount(holder, opts) draws the dial into holder and keeps it live.
  //   view mode: a god opens its pair (opts.onGod(god)); a tap on Framoid opens its reflection (opts.onCore()).
  //   tune mode: drag a god in or out (or arrows / + −).
  // Knob dials (opts.knob, the site's Home): the gods sit on one even ring outside tuning, and Framoid is the knob.
  //   Hold Framoid: the gods give way to a red → green rail with the Pantheon's mark; drag left / right to set your
  //   own stance (the rail slides the other way under Framoid), drag down for the Pantheon's (clears yours), drag up
  //   to tune. While tuning, a tap on Framoid ("Done") ends tuning and keeps the balance; dragging it down twice resets.
  //   opts.stance = { get(): -1..1 | null, set(v | null), allowed(): false to refuse (e.g. offers sign-in) }.
  // Plain dials (the Studio's sheet): tap Framoid once ("Reset? / Tap again"), again to reset.
  // opts: { stances, tune, knob, mode: "reader" | "master", weights (master), onTune(on), onGod, onCore, stance }.
  // Returns { setStances(st), tune(on), tuning(), weights(), redraw() }.
  // A reader's changes apply at once and are kept in this browser; in master mode (Studio) they stay in the dial.
  function mount(holder, opts = {}) {
    addStyle();
    const masterMode = opts.mode === "master", knob = !!opts.knob;
    let w = norm(opts.weights || (masterMode ? master : current())), stances = opts.stances || null, tuning = !!opts.tune;
    const target = () => masterMode ? equal() : norm(master);
    let asking = null, drag = null, held = false, gest = null, stale = false, compact = false;
    const own = () => (opts.stance && opts.stance.get) ? opts.stance.get() : null;
    const pantheon = () => { const t = stances ? tide(stances, w) : null; return t ? t.s : 0; };
    function draw(focusGod, focusCore) {
      if (held) { stale = true; return; }
      holder.innerHTML = dialSvg(w, stances, tuning && !same(w, target()), !!asking, tuning, { symmetric: knob, knob, own: own(), compact });
      holder.classList.toggle("fb-tuning", tuning); holder.classList.toggle("fb-compact", compact && !tuning);
      if (focusGod) { const o = holder.querySelector(`.orb[data-god="${focusGod}"]`); if (o) o.focus(); }
      if (focusCore) { const c = holder.querySelector(".fb-core[tabindex]"); if (c) c.focus(); }
    }
    const unask = () => { clearTimeout(asking); asking = null; };
    let mine = false; // our own change echoing back as framoid:balance
    function change(nw, focusGod, focusCore) {
      if (asking) unask();
      w = nw; draw(focusGod, focusCore);
      if (!masterMode) { mine = true; if (same(w, master)) store.clear(); else store.set(w); emit(); mine = false; }
    }
    function coreTap() {
      if (asking) { unask(); return change(target(), null, true); }
      if (same(w, target())) return;
      asking = setTimeout(() => { asking = null; draw(); }, 3000);
      draw(null, true);
    }
    function askReset() { // knob dials, tuning: drag Framoid down twice
      if (asking) { unask(); return change(target(), null, true); }
      if (same(w, target())) return;
      asking = setTimeout(() => { asking = null; draw(); }, 3000);
      draw(null, true);
    }
    const svgScale = () => { const svg = holder.querySelector("svg"), m = svg && svg.getScreenCTM(); return m ? m.a : 1; };
    // Holding Framoid (knob dials): the rail and the reader's stance.
    function beginHold() {
      if (opts.stance && opts.stance.allowed && !opts.stance.allowed()) { gest = null; return; }
      held = true; gest.v0 = gest.v = own() ?? pantheon();
      const svg = holder.querySelector("svg"); svg.classList.add("held");
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch {} }
    }
    function placeRail(v) {
      const m = holder.querySelector(".fb-rail-move"); if (m) m.setAttribute("transform", `translate(${(-((v + 1) / 2) * RAILW).toFixed(1)} 0)`);
    }
    function endHold() { held = false; const svg = holder.querySelector("svg"); if (svg) svg.classList.remove("held"); stale = false; draw(); }

    holder.addEventListener("click", e => {
      if (tuning) { if (!knob && e.target.closest(".fb-core")) coreTap(); return; }
      const o = e.target.closest(".orb"); if (o) return opts.onGod && opts.onGod(o.dataset.god);
      if (!knob && e.target.closest(".fb-core")) opts.onCore && opts.onCore();
    });
    holder.addEventListener("contextmenu", e => { if (knob && e.target.closest(".fb-core")) e.preventDefault(); });
    holder.addEventListener("pointerdown", e => {
      const core = knob && e.target.closest(".fb-core");
      if (core) {
        try { holder.setPointerCapture(e.pointerId); } catch {} e.preventDefault();
        gest = { x: e.clientX, y: e.clientY, mode: "", moved: false };
        if (!tuning) gest.timer = setTimeout(beginHold, 260);
        return;
      }
      if (!tuning) return;
      const o = e.target.closest(".orb"); if (!o) return;
      drag = o.dataset.god; try { holder.setPointerCapture(e.pointerId); } catch {} e.preventDefault();
    });
    holder.addEventListener("pointermove", e => {
      if (gest) {
        const dx = e.clientX - gest.x, dy = e.clientY - gest.y;
        if (Math.hypot(dx, dy) > 8) gest.moved = true;
        if (!held) {
          if (tuning) { if (dy > 36 && dy > Math.abs(dx) * 1.3) gest.mode = "down"; }
          else if (gest.moved && gest.timer) { clearTimeout(gest.timer); gest.timer = null; } // a swipe, not a hold
          return;
        }
        if (!gest.mode) { if (Math.abs(dy) > 36 && Math.abs(dy) > Math.abs(dx) * 1.4) gest.mode = dy > 0 ? "down" : "up"; else if (Math.abs(dx) > 6) gest.mode = "slide"; }
        holder.querySelectorAll(".fb-cue").forEach((c, i) => c.classList.toggle("on", (i === 0 && gest.mode === "up") || (i === 1 && gest.mode === "down")));
        if (gest.mode === "slide") {
          gest.v = Math.max(-1, Math.min(1, gest.v0 + dx / svgScale() / (RAILW / 2)));
          placeRail(gest.v);
          const c = holder.querySelector(".core-disc"); if (c) c.style.stroke = colourOf((gest.v + 1) / 2);
          opts.stance && opts.stance.set(Math.round(gest.v * 100) / 100);
        }
        return;
      }
      if (!drag) return;
      const svg = holder.querySelector("svg"), m = svg.getScreenCTM(); if (!m) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()), a = ANG[drag] * Math.PI / 180;
      change(setOne(w, drag, wOf(p.x * Math.cos(a) + p.y * Math.sin(a))));
    });
    const end = () => {
      drag = null;
      if (!gest) return;
      const g = gest; gest = null; clearTimeout(g.timer);
      if (tuning) { if (g.mode === "down") askReset(); else if (!g.moved) tune(false); return; }
      if (!held) { if (!g.moved) opts.onCore && opts.onCore(); return; }
      endHold();
      if (g.mode === "up") tune(true);
      else if (g.mode === "down") { opts.stance && opts.stance.set(null); draw(); }
    };
    holder.addEventListener("pointerup", end);
    holder.addEventListener("pointercancel", () => { drag = null; if (gest) { clearTimeout(gest.timer); gest = null; } if (held) endHold(); });
    holder.addEventListener("keydown", e => {
      const enter = e.key === "Enter" || e.key === " ", onCore = e.target.closest(".fb-core");
      if (!tuning) {
        const o = e.target.closest(".orb");
        if (o && enter) { e.preventDefault(); return opts.onGod && opts.onGod(o.dataset.god); }
        if (!onCore) return;
        if (enter) { e.preventDefault(); return opts.onCore && opts.onCore(); }
        if (!knob) return;
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault(); e.stopPropagation();
          if (opts.stance && opts.stance.allowed && !opts.stance.allowed()) return;
          const v = Math.max(-1, Math.min(1, (own() ?? pantheon()) + (e.key === "ArrowRight" ? .1 : -.1)));
          opts.stance && opts.stance.set(Math.round(v * 100) / 100); return draw(null, true);
        }
        if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); opts.stance && opts.stance.set(null); return draw(null, true); }
        if (e.key === "ArrowUp") { e.preventDefault(); e.stopPropagation(); return tune(true, true); }
        return;
      }
      if (onCore && enter) { e.preventDefault(); return knob ? tune(false, true) : coreTap(); }
      if (onCore && knob && (e.key === "Delete" || e.key === "Backspace")) { e.preventDefault(); return askReset(); }
      const o = e.target.closest(".orb"); if (!o) return;
      const g = o.dataset.god, step = { ArrowUp: 1, ArrowRight: 1, "+": 1, "=": 1, ArrowDown: -1, ArrowLeft: -1, "-": -1 }[e.key];
      if (!step) return; e.preventDefault(); e.stopPropagation(); // keep the page's arrow-key navigation out of the dial
      change(setOne(w, g, w[g] + step * 1.5), g);
    });
    // Follow changes made elsewhere (another tab, the reader's account, /balance.json arriving).
    if (!masterMode) window.addEventListener("framoid:balance", () => { if (mine || drag) return; w = current(); draw(); });
    function tune(on, focusCore) { tuning = !!on; unask(); draw(null, focusCore); opts.onTune && opts.onTune(tuning); }
    draw();
    return {
      setStances(st) { stances = st || null; draw(); },
      tune: on => tune(on),
      compact(on) { on = !!on; if (on === compact) return; compact = on; draw(); },
      tuning: () => tuning,
      weights: () => w,
      redraw: () => draw()
    };
  }

  /* ---------- the sheet (the Studio's master balance) ---------- */
  // mode "reader": changes apply at once and are kept in this browser. mode "master" (Studio): changes
  // stay in the sheet until onSave(weights) resolves.
  function open(opts = {}) {
    addStyle();
    const masterMode = opts.mode === "master";
    const prevFocus = document.activeElement;
    const scrim = document.createElement("div");
    scrim.className = "fb-scrim";
    scrim.innerHTML = `<div class="fb-sheet" role="dialog" aria-modal="true" aria-labelledby="fb-title">
      <h2 id="fb-title">${masterMode ? "Framoid's balance" : "Balance of the gods"}</h2>
      <p>${masterMode ? "How much each god's Reading counts on framoid.com, unless a reader changes it." : "How much each god's Reading counts for you, on every page."} Pull a god toward the centre to give it more weight; the others make room.${masterMode ? " Framoid resets to equal weights." : " Framoid resets to Framoid's balance."}</p>
      <div class="fb-holder"></div>
      <div class="fb-row">${masterMode
        ? `<button type="button" data-fb="cancel">Cancel</button><button type="button" class="fb-primary" data-fb="save">Save and publish</button>`
        : `<button type="button" class="fb-primary" data-fb="done">Done</button>`}</div>
      <p class="fb-status" aria-live="polite"></p></div>`;
    document.body.appendChild(scrim);
    const status = scrim.querySelector(".fb-status");
    const dial = mount(scrim.querySelector(".fb-holder"), { stances: opts.stances, tune: true, mode: opts.mode, weights: opts.weights });
    const close = () => { scrim.remove(); document.removeEventListener("keydown", onKey); if (prevFocus && prevFocus.focus) prevFocus.focus(); opts.onClose && opts.onClose(); };
    const onKey = e => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    scrim.addEventListener("click", async e => {
      if (e.target === scrim) return close();
      const act = e.target.closest("[data-fb]"); if (!act) return;
      const a = act.dataset.fb;
      if (a === "done" || a === "cancel") return close();
      if (a === "save") {
        act.disabled = true; status.textContent = "Saving…";
        try { const w = dial.weights(); await opts.onSave(w); setMaster(w); status.textContent = "Saved."; setTimeout(close, 700); }
        catch (err) { act.disabled = false; status.textContent = (err && err.message) || "Couldn't save. Try again."; }
      }
    });
    (scrim.querySelector(".orb") || scrim.querySelector("button")).focus();
  }

  /* ---------- the always-visible button ---------- */
  let btn = null, btnOpts = {};
  // The reader's balance button: inside opts.container (a toolbar island) or, without one, floating top-right.
  function button(opts = {}) {
    addStyle(); btnOpts = opts;
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button"; btn.className = "fb-btn" + (opts.container ? " inbar" : ""); btn.innerHTML = ICON;
      btn.addEventListener("click", () => open({ mode: "reader", stances: btnOpts.stances }));
      (opts.container || document.body).appendChild(btn);
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

  // Accounts: the reader's own balance (null when they use Framoid's), and setting it from their account.
  const readerOwn = () => store.get();
  function setReader(w) {
    const has = w && GODS.some(g => Number(w[g]) > 0);
    if (!has || same(norm(w), master)) store.clear(); else store.set(norm(w));
    emit();
  }
  window.FramoidBalance = { GODS, NAME, total: T, equal, norm, weights: current, master: () => master, setMaster, loadMaster, tide, orb, setOrb, dot, open, mount, button, addStyle, readerOwn, setReader, ICON };
})();
