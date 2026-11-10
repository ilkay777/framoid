/* Framoid accounts (optional sign-in) with Firebase: Google or an email link, no passwords.
   Signed-in readers keep their balance of the gods and appearance in sync across devices; later phases add
   saved Reflections, their own stances and Subject suggestions (see firebase/firestore.rules).
   The Firebase SDK is loaded only for readers who sign in (or come back from an email link), so readers who
   never sign in make no requests to Firebase. Copied into the pages by tools/sync_balance.py. */
(function () {
  "use strict";
  if (window.FramoidAccount) return;
  const CONFIG = {
    apiKey: "AIzaSyCyUuXc9F-eAfmmTHu41NAoxnLwXx3AMUI",
    authDomain: "framoid-567c0.firebaseapp.com",
    projectId: "framoid-567c0",
    storageBucket: "framoid-567c0.firebasestorage.app",
    messagingSenderId: "314057320041",
    appId: "1:314057320041:web:8b76293b042e0fa99aa4f8"
  };
  const SDK = "https://www.gstatic.com/firebasejs/13.2.0/";
  const FLAG = "framoid.account", MAILKEY = "framoid.emailForSignIn";
  const ls = { get: k => { try { return localStorage.getItem(k); } catch { return null; } },
               set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
               del: k => { try { localStorage.removeItem(k); } catch {} } };
  let fb = null;        // { auth, db, A (auth module), F (firestore module) } once loaded
  let user = null;      // signed-in Firebase user
  let applying = false; // true while applying remote settings (so they aren't written back)

  async function load() {
    if (fb) return fb;
    const [{ initializeApp }, A, F] = await Promise.all([
      import(SDK + "firebase-app.js"), import(SDK + "firebase-auth.js"), import(SDK + "firebase-firestore.js")]);
    const app = initializeApp(CONFIG);
    fb = { auth: A.getAuth(app), db: F.getFirestore(app), A, F };
    fb.A.onAuthStateChanged(fb.auth, u => {
      const fresh = u && !ls.get(FLAG); // just signed in on this device (not a returning visit)
      user = u; ready = false; if (unsub) { unsub(); unsub = null; }
      if (unsubSaved) { unsubSaved(); unsubSaved = null; }
      if (unsubStances) { unsubStances(); unsubStances = null; }
      if (!u || cacheUid !== u.uid) { saved = new Set(); stances = {}; cacheUid = u ? u.uid : null; cache(); emitSaved(); emitStances(); }
      if (u) { ls.set(FLAG, "1"); listen(fresh); listenSaved(); listenStances(); } else ls.del(FLAG);
      emit();
    });
    return fb;
  }
  const emit = () => window.dispatchEvent(new CustomEvent("framoid:account", { detail: state() }));
  const state = () => ({ signedIn: !!user, email: user ? user.email : null });
  const userDoc = () => fb.F.doc(fb.db, "users", user.uid);

  /* ---------- settings sync: balance of the gods and appearance ---------- */
  // Live: every device follows the account's settings as they change.
  let unsub = null, ready = false;
  const hasOwn = b => b && Object.values(b).some(v => Number(v) > 0);
  function listen(fresh) {
    let first = true;
    unsub = fb.F.onSnapshot(userDoc(), snap => {
      if (snap.metadata.hasPendingWrites) return; // our own write echoing back
      const d = snap.exists() ? snap.data() : null;
      if (first) {
        first = false; ready = true;
        // New account, or signing in here with a balance of your own while the account has none: keep this device's.
        const local = window.FramoidBalance && window.FramoidBalance.readerOwn();
        if (!d) return push(true);
        if (fresh && !hasOwn(d.balance) && local) { apply({ theme: d.theme }); return push(); }
      }
      apply(d);
    }, e => { ready = true; console.warn("Framoid: couldn't read your settings", e); });
  }
  function apply(d) {
    if (!d) return;
    applying = true;
    try {
      if ("balance" in d && window.FramoidBalance) {
        const cur = window.FramoidBalance.readerOwn(), next = hasOwn(d.balance) ? d.balance : null;
        if (JSON.stringify(cur) !== JSON.stringify(next && window.FramoidBalance.norm(next))) window.FramoidBalance.setReader(d.balance);
      }
      if (d.theme && window.FramoidBar && window.FramoidBar.getTheme() !== d.theme) window.FramoidBar.setTheme(d.theme);
      if (d.mode && window.FramoidCoherence) window.FramoidCoherence.setMode(d.mode, true);
    } finally { applying = false; }
  }
  let timer = null;
  function push(first) {
    if (!user || applying || !ready) return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const data = { theme: window.FramoidBar ? window.FramoidBar.getTheme() : "auto", updatedAt: fb.F.serverTimestamp() };
      const own = window.FramoidBalance && window.FramoidBalance.readerOwn();
      data.balance = own || {}; // {} = Framoid's balance
      // Coherence with the Pantheon (tools/coherence.js): the tuning mode, the drift under this balance, the best fit.
      const C = window.FramoidCoherence && window.FramoidCoherence.state();
      if (C) { data.mode = C.mode; data.drift = C.drift === null ? null : Math.round(C.drift * 1000) / 1000; data.fit = C.fit || null; }
      if (first) data.createdAt = fb.F.serverTimestamp();
      try { await fb.F.setDoc(userDoc(), data, { merge: true }); } catch (e) { console.warn("Framoid: couldn't save your settings", e); }
    }, 800);
  }
  window.addEventListener("framoid:balance", () => push());
  window.addEventListener("framoid:theme", () => push());
  window.addEventListener("framoid:coherence", () => push());

  /* ---------- saved Reflections ---------- */
  // Kept in this browser too, so a saved Reflection shows as saved the moment the page opens.
  const SAVEDKEY = "framoid.saved";
  let saved = new Set(), stances = {}, cacheUid = null, unsubSaved = null, unsubStances = null, pending = null;
  if (ls.get(FLAG)) { try { const c = JSON.parse(ls.get(SAVEDKEY) || "null"); if (c && c.uid) { cacheUid = c.uid; saved = new Set(c.slugs || []); stances = c.stances || {}; } } catch {} }
  function cache() { if (cacheUid) ls.set(SAVEDKEY, JSON.stringify({ uid: cacheUid, slugs: [...saved], stances })); else ls.del(SAVEDKEY); }
  const emitSaved = () => window.dispatchEvent(new CustomEvent("framoid:saved"));
  function listenSaved() {
    unsubSaved = fb.F.onSnapshot(fb.F.collection(fb.db, "users", user.uid, "saved"), snap => {
      saved = new Set(snap.docs.map(d => d.id)); cache(); emitSaved();
      if (pending) { const p = pending; pending = null; if (!saved.has(p)) setSaved(p, true); }
    }, e => console.warn("Framoid: couldn't read your saved Reflections", e));
  }
  const isSaved = slug => saved.has(String(slug));
  function setSaved(slug, on) {
    slug = String(slug);
    if (on) saved.add(slug); else saved.delete(slug);
    cache(); emitSaved();
    const ref = fb.F.doc(fb.db, "users", user.uid, "saved", slug);
    return (on ? fb.F.setDoc(ref, { savedAt: fb.F.serverTimestamp() }) : fb.F.deleteDoc(ref))
      .catch(e => { console.warn("Framoid: couldn't update saved", e); if (on) saved.delete(slug); else saved.add(slug); cache(); emitSaved(); throw e; });
  }
  // Signed out: offer sign-in, and save it once signed in.
  function toggleSave(slug) {
    if (!slug) return Promise.resolve();
    if (!user) { pending = String(slug); sheet("", "Sign in to save Reflections and find them on any device."); return Promise.resolve(); }
    return setSaved(slug, !isSaved(slug));
  }

  /* ---------- the reader's own stance per Reflection: -1 (opposed) to 1 (embraced), private ---------- */
  const emitStances = () => window.dispatchEvent(new CustomEvent("framoid:stances"));
  function listenStances() {
    unsubStances = fb.F.onSnapshot(fb.F.collection(fb.db, "users", user.uid, "stances"), snap => {
      if (snap.metadata.hasPendingWrites) return;
      const next = {}; snap.docs.forEach(d => { const v = d.data().value; if (typeof v === "number") next[d.id] = v; });
      stances = next; cache(); emitStances();
    }, e => console.warn("Framoid: couldn't read your stances", e));
  }
  const stanceOf = slug => (String(slug) in stances ? stances[String(slug)] : null);
  const stanceTimers = {};
  // v = number in -1..1, or null to clear. Saves after the reader stops moving.
  function setStance(slug, v) {
    slug = String(slug);
    if (!user) { sheet("", "Sign in to keep your own stance on each Reflection, private to you."); return false; }
    if (v === null) delete stances[slug]; else stances[slug] = Math.max(-1, Math.min(1, Math.round(v * 100) / 100));
    cache(); emitStances();
    clearTimeout(stanceTimers[slug]);
    stanceTimers[slug] = setTimeout(() => {
      const ref = fb.F.doc(fb.db, "users", user.uid, "stances", slug);
      (slug in stances ? fb.F.setDoc(ref, { value: stances[slug], updatedAt: fb.F.serverTimestamp() }) : fb.F.deleteDoc(ref))
        .catch(e => console.warn("Framoid: couldn't save your stance", e));
    }, 500);
    return true;
  }

  /* ---------- sign in / out / delete ---------- */
  // The popup must open in the same tap, with nothing awaited before it, or browsers block it.
  // The sheet preloads Firebase so it's ready by the time the reader taps.
  function google() {
    if (fb) return fb.A.signInWithPopup(fb.auth, new fb.A.GoogleAuthProvider());
    return load().then(() => { throw { code: "fac/not-ready" }; });
  }
  const preload = () => { load().catch(() => {}); };
  async function sendLink(email) {
    const { auth, A } = await load();
    await A.sendSignInLinkToEmail(auth, email, { url: location.origin + location.pathname, handleCodeInApp: true });
    ls.set(MAILKEY, email);
  }
  const isLinkUrl = () => /[?&]oobCode=/.test(location.search) && /[?&]mode=signIn/.test(location.search);
  async function finishLink(email) {
    const { auth, A } = await load();
    await A.signInWithEmailLink(auth, email, location.href);
    ls.del(MAILKEY);
    history.replaceState(null, "", location.pathname + location.hash);
  }
  async function signOut() { if (fb) await fb.A.signOut(fb.auth); ls.del(FLAG); }
  // Delete everything this reader stored, then the account itself.
  async function deleteAll() {
    const { db, F, A, auth } = await load();
    if (!user) return;
    const uid = user.uid, batch = F.writeBatch(db);
    for (const sub of ["saved", "stances"]) (await F.getDocs(F.collection(db, "users", uid, sub))).forEach(d => batch.delete(d.ref));
    (await F.getDocs(F.query(F.collection(db, "suggestions"), F.where("uid", "==", uid)))).forEach(d => batch.delete(d.ref));
    batch.delete(F.doc(db, "users", uid));
    await batch.commit();
    try { await A.deleteUser(user); }
    catch (e) {
      if (e && e.code === "auth/requires-recent-login" && user.providerData.some(p => p.providerId === "google.com")) {
        await A.reauthenticateWithPopup(user, new A.GoogleAuthProvider()); await A.deleteUser(auth.currentUser);
      } else throw e;
    }
    ls.del(FLAG);
  }

  /* ---------- the sheet ---------- */
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const GLOGO = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z"/><path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8z"/><path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z"/></svg>';
  function sheet(mode, note) {
    if (window.FramoidBalance) window.FramoidBalance.addStyle();
    addStyle();
    const prev = document.activeElement;
    const scrim = document.createElement("div");
    scrim.className = "fb-scrim";
    const draw = () => {
      if (user) return `<h2 id="fac-title">Your account</h2><p>Signed in as <strong>${esc(user.email || "")}</strong>. Your balance of the gods, appearance and saved Reflections follow you to every device where you sign in.</p>
        <div class="fb-row fac-col"><button type="button" data-fac="signout">Sign out</button><button type="button" class="fac-danger" data-fac="delete">Delete my account and data</button><button type="button" class="fb-primary" data-fac="close">Done</button></div>`;
      if (mode === "confirm-email") return `<h2 id="fac-title">Finish signing in</h2><p>Enter the email address the sign-in link was sent to.</p>
        <form class="fac-form" data-fac-form="finish"><input type="email" name="email" required autocomplete="email" placeholder="you@example.com" aria-label="Email address"><button type="submit" class="fb-primary">Sign in</button></form>`;
      if (mode === "sent") return `<h2 id="fac-title">Check your email</h2><p>We sent a sign-in link to <strong>${esc(ls.get(MAILKEY) || "")}</strong>. Open it on this device to finish signing in.</p>
        <div class="fb-row"><button type="button" class="fb-primary" data-fac="close">Done</button></div>`;
      return `<h2 id="fac-title">Sign in</h2>${note ? `<p class="fac-note">${esc(note)}</p>` : ""}
        <button type="button" class="fac-google" data-fac="google">${GLOGO}<span>Continue with Google</span></button>
        <form class="fac-form" data-fac-form="link"><input type="email" name="email" required autocomplete="email" placeholder="Or email me a link" aria-label="Email address for a sign-in link"><button type="submit">Send</button></form>
        <p class="fac-small">Syncs your balance, appearance and saved Reflections. <button type="button" class="flink" data-about>Privacy</button></p>`;
    };
    const render = () => { scrim.innerHTML = `<div class="fb-sheet fac" role="dialog" aria-modal="true" aria-labelledby="fac-title"><button type="button" class="fac-x" data-fac="close" aria-label="Close">&times;</button>${draw()}<p class="fb-status fac-status" aria-live="polite"></p></div>`; };
    if (!user) preload();
    render();
    document.body.appendChild(scrim);
    const status = t => { const s = scrim.querySelector(".fac-status"); if (s) s.textContent = t || ""; };
    let confirmDelete = false;
    const close = () => { if (!user) pending = null; scrim.remove(); document.removeEventListener("keydown", onKey); window.removeEventListener("framoid:account", onAcc); if (prev && prev.focus) prev.focus(); };
    const onKey = e => { if (e.key === "Escape") close(); };
    const onAcc = () => { if (note && user) return close(); mode = ""; render(); };
    document.addEventListener("keydown", onKey);
    window.addEventListener("framoid:account", onAcc);
    const fail = e => status((e && (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request")) ? "" : (e && e.code === "fac/not-ready") ? "Ready. Tap again." : (e && e.code === "auth/popup-blocked") ? "Your browser blocked the sign-in window. Allow pop-ups for framoid.com and try again." : "Couldn't complete that. Try again.");
    scrim.addEventListener("click", async e => {
      if (e.target === scrim) return close();
      const a = e.target.closest("[data-fac]"); if (!a) return;
      const act = a.dataset.fac;
      if (act === "close") return close();
      if (act === "google") { status(""); try { await google(); } catch (err) { console.warn("Framoid sign-in", err); fail(err); } return; }
      if (act === "signout") { await signOut(); return close(); }
      if (act === "delete") {
        if (!confirmDelete) { confirmDelete = true; a.textContent = "Tap again to delete everything"; status("This removes your account, settings and anything you saved. It can't be undone."); setTimeout(() => { confirmDelete = false; if (a.isConnected) { a.textContent = "Delete my account and data"; status(""); } }, 5000); return; }
        status("Deleting…");
        try { await deleteAll(); status("Your account and data are deleted."); setTimeout(close, 1200); } catch (err) { status("Couldn't delete everything. Sign in again and retry, or write to hello@framoid.com."); }
      }
    });
    scrim.addEventListener("submit", async e => {
      e.preventDefault();
      const f = e.target, email = f.email.value.trim(); if (!email) return;
      const btn = f.querySelector("button"); btn.disabled = true;
      try {
        if (f.dataset.facForm === "link") { status("Sending…"); await sendLink(email); mode = "sent"; render(); }
        else { status("Signing in…"); await finishLink(email); }
      } catch (err) { btn.disabled = false; status(f.dataset.facForm === "link" ? "Couldn't send the link. Check the address and try again." : "That link didn't work. It may have expired; request a new one."); }
    });
    const box = scrim.querySelector(".fac"); box.tabIndex = -1; box.style.outline = "none"; box.focus({ preventScroll: true });
  }

  /* ---------- styles ---------- */
  const css = `
.fb-sheet.fac { max-width: 360px; position: relative; }
.fb-sheet.fac h2 { margin-bottom: 14px; }
.fb-sheet.fac .fac-note { margin: -8px 0 14px; padding-right: 28px; }
.fac-x { position: absolute; top: 12px; right: 12px; width: 30px; height: 30px; border-radius: 50%; border: 0; padding: 0; cursor: pointer;
  background: var(--hairline, rgba(20,24,40,.08)); color: var(--muted, #5c606e); font: 400 20px/30px var(--text, system-ui); }
.fac-google { width: 100%; height: 44px; margin-bottom: 10px; display: inline-flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer;
  border-radius: 999px; background: #fff; color: #1f1f1f; border: 1px solid #dadce0; font: 600 15px/1 var(--text, system-ui); }
.fb-sheet.fac p { font-size: 14px; line-height: 1.5; }
.fac-col { flex-direction: column; align-items: stretch; }
.fac-form { display: flex; gap: 8px; }
.fac-form input { flex: 1; min-width: 0; height: 44px; box-sizing: border-box; padding: 0 14px; border-radius: 999px; border: 1px solid var(--hairline, rgba(20,24,40,.15));
  background: var(--glass, rgba(255,255,255,.6)); color: var(--ink, #14151a); font: 400 16px/1 var(--text, system-ui); }
.fac-form button { flex: none; font: 600 14px/1 var(--text, system-ui); padding: 0 16px; border-radius: 999px; border: 1px solid var(--stroke, rgba(255,255,255,.7));
  background: var(--ink, #14151a); color: var(--bg, #fff); cursor: pointer; }
.fac-small { margin-top: 12px !important; text-align: center; font-size: 12px !important; color: var(--muted, #5c606e) !important; }
.fac-danger { color: var(--fb-no, #dc3b34) !important; }`;
  function addStyle() {
    if (document.getElementById("fac-style")) return;
    const el = document.createElement("style"); el.id = "fac-style"; el.textContent = css; document.head.appendChild(el);
  }

  /* ---------- start ---------- */
  // Only readers who signed in before (or arrive from an email link) load Firebase.
  if (ls.get(FLAG) || isLinkUrl()) {
    load().then(async ({ auth, A }) => {
      if (isLinkUrl() && A.isSignInWithEmailLink(auth, location.href)) {
        const email = ls.get(MAILKEY);
        if (email) { try { await finishLink(email); } catch { sheet("confirm-email"); } }
        else sheet("confirm-email");
      }
    }).catch(e => console.warn("Framoid: sign-in unavailable", e));
  }

  window.FramoidAccount = { state, open: () => sheet(""), signOut, preload, isSaved, toggleSave, stanceOf, setStance, allStances: () => Object.assign({}, stances) };
})();
