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
    fb.A.onAuthStateChanged(fb.auth, u => { user = u; if (u) { ls.set(FLAG, "1"); pull(); } else ls.del(FLAG); emit(); });
    return fb;
  }
  const emit = () => window.dispatchEvent(new CustomEvent("framoid:account", { detail: state() }));
  const state = () => ({ signedIn: !!user, email: user ? user.email : null });
  const userDoc = () => fb.F.doc(fb.db, "users", user.uid);

  /* ---------- settings sync: balance of the gods and appearance ---------- */
  async function pull() {
    try {
      const snap = await fb.F.getDoc(userDoc());
      const d = snap.exists() ? snap.data() : null;
      applying = true;
      if (d && d.balance && window.FramoidBalance) window.FramoidBalance.setReader(d.balance);
      if (d && d.theme && window.FramoidBar) window.FramoidBar.setTheme(d.theme);
      applying = false;
      if (!d) push(true); // first sign-in: keep what this browser already has
    } catch (e) { applying = false; console.warn("Framoid: couldn't read your settings", e); }
  }
  let timer = null;
  function push(first) {
    if (!user || applying) return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const data = { theme: window.FramoidBar ? window.FramoidBar.getTheme() : "auto", updatedAt: fb.F.serverTimestamp() };
      const own = window.FramoidBalance && window.FramoidBalance.readerOwn();
      data.balance = own || {}; // {} = Framoid's balance
      if (first) data.createdAt = fb.F.serverTimestamp();
      try { await fb.F.setDoc(userDoc(), data, { merge: true }); } catch (e) { console.warn("Framoid: couldn't save your settings", e); }
    }, 800);
  }
  window.addEventListener("framoid:balance", () => push());
  window.addEventListener("framoid:theme", () => push());

  /* ---------- sign in / out / delete ---------- */
  async function google() {
    const { auth, A } = await load();
    await A.signInWithPopup(auth, new A.GoogleAuthProvider());
  }
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
  function sheet(mode) {
    if (window.FramoidBalance) window.FramoidBalance.addStyle();
    addStyle();
    const prev = document.activeElement;
    const scrim = document.createElement("div");
    scrim.className = "fb-scrim";
    const draw = () => {
      if (user) return `<h2 id="fac-title">Your account</h2><p>Signed in as <strong>${esc(user.email || "")}</strong>. Your balance of the gods and appearance follow you to every device where you sign in.</p>
        <div class="fb-row fac-col"><button type="button" data-fac="signout">Sign out</button><button type="button" class="fac-danger" data-fac="delete">Delete my account and data</button><button type="button" class="fb-primary" data-fac="close">Done</button></div>`;
      if (mode === "confirm-email") return `<h2 id="fac-title">Finish signing in</h2><p>Enter the email address the sign-in link was sent to.</p>
        <form class="fac-form" data-fac-form="finish"><input type="email" name="email" required autocomplete="email" placeholder="you@example.com" aria-label="Email address"><button type="submit" class="fb-primary">Sign in</button></form>`;
      if (mode === "sent") return `<h2 id="fac-title">Check your email</h2><p>We sent a sign-in link to <strong>${esc(ls.get(MAILKEY) || "")}</strong>. Open it on this device to finish signing in.</p>
        <div class="fb-row"><button type="button" class="fb-primary" data-fac="close">Done</button></div>`;
      return `<h2 id="fac-title">Sign in to Framoid</h2><p>Optional. Keeps your balance of the gods and appearance on every device. More is coming: saved Reflections and your own stances.</p>
        <div class="fb-row fac-col"><button type="button" class="fac-google" data-fac="google">${GLOGO}<span>Continue with Google</span></button></div>
        <p class="fac-or">or get a sign-in link by email</p>
        <form class="fac-form" data-fac-form="link"><input type="email" name="email" required autocomplete="email" placeholder="you@example.com" aria-label="Email address"><button type="submit">Send link</button></form>
        <p class="fac-small">By signing in you agree to Framoid storing your email address and these settings, as described in <button type="button" class="flink" data-about>About</button>.</p>
        <div class="fb-row"><button type="button" data-fac="close">Not now</button></div>`;
    };
    const render = () => { scrim.innerHTML = `<div class="fb-sheet fac" role="dialog" aria-modal="true" aria-labelledby="fac-title">${draw()}<p class="fb-status fac-status" aria-live="polite"></p></div>`; };
    render();
    document.body.appendChild(scrim);
    const status = t => { const s = scrim.querySelector(".fac-status"); if (s) s.textContent = t || ""; };
    let confirmDelete = false;
    const close = () => { scrim.remove(); document.removeEventListener("keydown", onKey); window.removeEventListener("framoid:account", onAcc); if (prev && prev.focus) prev.focus(); };
    const onKey = e => { if (e.key === "Escape") close(); };
    const onAcc = () => { mode = ""; render(); };
    document.addEventListener("keydown", onKey);
    window.addEventListener("framoid:account", onAcc);
    const fail = e => status((e && e.code === "auth/popup-closed-by-user") ? "" : (e && e.code === "auth/popup-blocked") ? "Your browser blocked the sign-in window. Allow pop-ups for framoid.com and try again." : "Couldn't complete that. Try again.");
    scrim.addEventListener("click", async e => {
      if (e.target === scrim) return close();
      const a = e.target.closest("[data-fac]"); if (!a) return;
      const act = a.dataset.fac;
      if (act === "close") return close();
      if (act === "google") { status("Opening Google…"); try { await google(); } catch (err) { fail(err); } return; }
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
    const first = scrim.querySelector("input, .fb-primary, button"); if (first) first.focus();
  }

  /* ---------- styles ---------- */
  const css = `
.fb-sheet.fac { max-width: 420px; }
.fb-sheet.fac p { font-size: 14px; line-height: 1.5; }
.fac-col { flex-direction: column; align-items: stretch; }
.fac-google { display: inline-flex !important; align-items: center; justify-content: center; gap: 10px; background: #fff !important; color: #1f1f1f !important; border: 1px solid #dadce0 !important; }
.fac-or { margin: 14px 0 6px !important; font-size: 12px !important; color: var(--muted, #5c606e) !important; }
.fac-form { display: flex; gap: 8px; }
.fac-form input { flex: 1; min-width: 0; height: 40px; box-sizing: border-box; padding: 0 14px; border-radius: 999px; border: 1px solid var(--hairline, rgba(20,24,40,.15));
  background: var(--glass, rgba(255,255,255,.6)); color: var(--ink, #14151a); font: 400 16px/1 var(--text, system-ui); }
.fac-form button { flex: none; font: 600 14px/1 var(--text, system-ui); padding: 0 16px; border-radius: 999px; border: 1px solid var(--stroke, rgba(255,255,255,.7));
  background: var(--ink, #14151a); color: var(--bg, #fff); cursor: pointer; }
.fac-small { margin-top: 10px !important; font-size: 12px !important; color: var(--muted, #5c606e) !important; }
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

  window.FramoidAccount = { state, open: () => sheet(""), signOut };
})();
