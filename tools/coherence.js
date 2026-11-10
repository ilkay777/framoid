/* Framoid coherence: how a reader's own stances sit with the Pantheon under the balance they chose.
   Runs in the reader's browser only (no server work).
   - Result of a Reflection under a balance w: the weighted share of the gods that embrace it, on the rail −1..+1
     (Σ w·e / Σ w, where e = +1 for embraces, −1 for opposes).
   - Drift: the average gap on the rail between the reader's stances and those results under their chosen balance.
     At or below CAP the reader is Stable, above it Unstable (a quiet mark on Framoid's orb).
   - Best fit: the positive weights (scaled to 30, like balance.js) that keep the average squared gap smallest.
     Computed and stored, not shown.
   - Mode: "auto" (default; after every stance the balance re-fits) or "manual" (the balance stays; "Fit now" jumps
     to the best fit once). Dragging a god while in Auto switches to Manual.
   Signed-out readers have no stances, so nothing here applies to them. Only the latest stance per Reflection counts.
   Events: framoid:coherence (drift, fit or mode changed). */
(function () {
  if (window.FramoidCoherence) return;
  const CAP = 0.5;          // Stable at or below this average gap
  const MIN_STANCES = 0;    // stances needed before Stable / Unstable shows (raise later, e.g. ~10)
  const KEY = "framoid.tune";
  const GODS = ["rodim", "mir", "idrom", "aromi", "ora", "doria"], T = 30;
  const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const A = () => window.FramoidAccount, B = () => window.FramoidBalance;

  // The Pantheon's stances per Reflection (slug → {god: "embraces" | "opposes"}), from /reflections.json.
  let refl = null, titles = {}, loading = null;
  const tallied = st => st && GODS.every(g => st[g] === "embraces" || st[g] === "opposes");
  function setReflections(list) {
    refl = {}; titles = {};
    (list || []).forEach(r => { const s = String(r.slug); titles[s] = r.title || ""; if (tallied(r.stances)) refl[s] = GODS.map(g => r.stances[g] === "embraces" ? 1 : -1); });
    recompute();
  }
  function ensure() {
    if (refl || loading) return loading;
    return loading = fetch("/reflections.json", { cache: "no-cache" }).then(r => r.json()).then(j => setReflections(j.reflections)).catch(() => { refl = {}; });
  }

  const signedIn = () => !!(A() && A().state().signedIn);
  // The reader's rated Reflections that the Pantheon has stances on: [{slug, v, e}]
  function rated() {
    if (!signedIn() || !refl || !A().allStances) return [];
    const own = A().allStances();
    return Object.keys(own).filter(s => refl[s] && typeof own[s] === "number").map(s => ({ slug: s, v: own[s], e: refl[s] }));
  }
  const result = (e, w) => { let n = 0, d = 0; GODS.forEach((g, i) => { n += w[g] * e[i]; d += w[g]; }); return d ? n / d : 0; };
  function driftOf(w, P) { if (!P.length) return null; return P.reduce((s, p) => s + Math.abs(p.v - result(p.e, w)), 0) / P.length; }

  // Best fit: weights as a softmax of six free numbers (always positive), gradient descent on the mean squared gap.
  function fitOf(P) {
    if (!P.length) return null;
    const z = [0, 0, 0, 0, 0, 0], n = P.length;
    for (let it = 0; it < 600; it++) {
      const m = Math.max(...z), ex = z.map(v => Math.exp(v - m)), S = ex.reduce((a, b) => a + b, 0), w = ex.map(v => v / S);
      const g = [0, 0, 0, 0, 0, 0];
      P.forEach(p => { let t = 0; for (let i = 0; i < 6; i++) t += w[i] * p.e[i]; const r = 2 * (t - p.v) / n; for (let i = 0; i < 6; i++) g[i] += r * p.e[i]; });
      const gw = w.reduce((s, wi, i) => s + wi * g[i], 0);
      for (let j = 0; j < 6; j++) z[j] = Math.max(-6, Math.min(6, z[j] - 3 * w[j] * (g[j] - gw)));
    }
    const m = Math.max(...z), ex = z.map(v => Math.exp(v - m)), S = ex.reduce((a, b) => a + b, 0), out = {};
    GODS.forEach((g, i) => out[g] = Math.round(ex[i] / S * T * 100) / 100);
    return out;
  }

  let state = { drift: null, fit: null, count: 0 };
  function recompute() {
    const P = rated(), w = B() ? B().weights() : null;
    const next = { drift: w ? driftOf(w, P) : null, fit: fitOf(P), count: P.length };
    const changed = JSON.stringify(next) !== JSON.stringify(state);
    state = next;
    if (changed) window.dispatchEvent(new CustomEvent("framoid:coherence"));
  }

  const mode = () => ls.get(KEY) === "manual" ? "manual" : "auto";
  function setMode(m, quiet) {
    m = m === "manual" ? "manual" : "auto";
    if (m === mode()) return;
    ls.set(KEY, m);
    if (!quiet) window.dispatchEvent(new CustomEvent("framoid:coherence"));
    if (m === "auto") refit();
  }
  // Jump to the best fit (Auto after each stance; Fit now in Manual).
  function refit() {
    const P = rated(); if (!P.length || !B()) return;
    B().setReader(fitOf(P));
  }

  let autoTimer = null;
  window.addEventListener("framoid:stances", () => {
    recompute();
    if (mode() !== "auto") return;
    clearTimeout(autoTimer); autoTimer = setTimeout(refit, 600);
  });
  ["framoid:balance", "framoid:account"].forEach(n => window.addEventListener(n, () => { if (signedIn()) ensure(); recompute(); }));
  if (signedIn()) ensure();

  // The Reflections causing the drift, largest gap first: [{slug, title, v, result, gap}]
  function rows() {
    const w = B() ? B().weights() : null; if (!w) return [];
    return rated().map(p => { const r = result(p.e, w); return { slug: p.slug, title: titles[p.slug] || p.slug, v: p.v, result: r, gap: Math.abs(p.v - r) }; })
      .sort((a, b) => b.gap - a.gap);
  }
  const shows = () => signedIn() && state.count > 0 && state.count >= MIN_STANCES;

  window.FramoidCoherence = {
    CAP, MIN_STANCES,
    state: () => Object.assign({ mode: mode() }, state),
    stable: () => shows() ? state.drift <= CAP : null,     // null: not enough to say
    unstable: () => shows() && state.drift > CAP,
    mode, setMode, fitNow: refit, rows, setReflections, ensure, recompute
  };
})();
