/* net721.js - WINGS FOR ROUGE, board 721 SHIP A: PLAY THE STORY TOGETHER (Trunks, Oct 29 2026; plan: PLAN_721_GROUP_PLAY_2026-10-28.md).
   Marth, verbatim: "For group play (rouge and I or up to 4 birds) I want two versions: one where you join the other persons progress, tethered
   completely to the Hosts world but you still level up ..." / "so the full version isnt avail yet?" / "don’t cut any corners"
   His answers (Oct 29): Hawk credit "Both get it"; "Limited" = "Places"; the XP curve "Yes"; the arena "yes, all boss fights will be 2 players,
   like where winds meet or Minecraft".

   WHAT SHIP A IS: a WORLD (worlds/$w on the database, never rooms/: Fly together, net678.js, is untouched) with 4 slots. The host's world is the
   truth: the guest's game shows the host's story (S.world, S.choices, the world spreading, the far place, the clock and the dawns) and saves ONLY
   its own bird (level, XP, hearts, chick, pouch). The guest follows the host's crossings. Up to 3 other birds are drawn, each in the place it is
   in (the v2 packet {w: place, p: metres within that place}: the old +-2000 clamp put a bird in a far place 9 km out at an invisible wall).
   XP for a guest x clamp(2^((host - me)/10), 0.25, 2), fractions carried. THE ARENA IS TWO PLAYERS: each phone runs its OWN Hawk against its own
   bird (warn, parry and hit judged on its own clock: fair on its own phone; his 3-in-5 s budget per player), and the Hawk's health is shared:
   100 minus every player's reported damage, fed into each phone's engine inside its own frame (hawkarena.js step input `shared`). A Hawk won
   together counts in BOTH saves (the guest's own world.hawk.won, call.arena = 2, and the host's choice when it comes).

   The game talks to a TRANSPORT (the database's shape, nothing more): { kind, signIn() -> Promise uid, get(path), update(path, obj), set(path, v),
   remove(path), on(path, fn) -> off, onDisc(path), onConnected(fn), close() }. Two ship:
     firebaseTransport(cfg)  Realtime Database + Anonymous Auth (Apache-2.0 SDK, Google's own CDN, the same pinned 10.14.1 as net678.js)
     fakeTransport()         an outbox of operations; tests/together721.js holds the database in node and runs net721.rules.json against it
   Wired by tools/wiring/wire-721a-together.js. G (from the game) is listed at attach(). Every word on screen is a DRAFT: his eye decides. */
(function () {
  'use strict';
  const RATE = 1 / 10, DELAY = 0.18, EXTRAP = 0.3, SNAP = 12, BUF = 12, SILENCE = 8;   /* net678's numbers (his "mad slow" fixed at 10 a second) */
  const PLACES = ['home', 'tahoe', 'antigua', 'damned', 'dunns'];
  const RULES = { v: 2, w: 8, k: 12, m: 5, n: 12, p: [-4000, 4000], y: [-7, 7], t: [-2, 2], l: [1, 60] };   /* MIRRORS net721.rules.json's birds/$uid (tests/together721.js compares the two) */
  const KEYS = 'f,k,l,m,n,p,s,t,v,w,y';
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', CODE_RE = /^[A-HJ-NP-Z2-9]{5}$/, WORLD_RE = /^w[a-z0-9]{12}$/;   /* 5 letters, no lookalikes */
  const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
  const SLOTS = 4, HP0 = 100, STORY_T = 1.0, FIGHT_T = 0.25, HOST_GONE = 12, NEAR = 150, RATE_FAR = 1 / 3;   /* the plan: farther than 150 m from every other bird, 3 packets a second */
  const POLICY = 'split';   /* the Hawk's attention (his ruling: every boss fight is 2 players): 'split' = each phone its own attacker and its own 3-in-5 s budget. 'shared' (Itachi's other reading: one budget for the room) is kept below only so the guard can tell the two apart */
  const NOAUTH = /operation-not-allowed|admin-restricted|configuration-not-found|auth\/.*disabled/i;
  const WORDS = { off: 'Play the story together: make a world and tell its code to your friend, or enter theirs. Their bird flies in YOUR story (or you in theirs), and you each keep your own levels.',
    host: (c, n) => 'Your world is open: code ' + c + '. ' + (n > 1 ? (n - 1) + ' friend' + (n > 2 ? 's' : '') + ' with you.' : 'Tell your friend the code.'),
    guest: (h) => 'You are in ' + (h || 'your friend') + "'s world. Their story, your own bird: your levels and your pouch come home with you.",
    noauth: 'Ask the host to turn on group play.', full: 'This world is full (4 birds).', closed: 'That world is closed for now: ask your friend to open it again.', nosave: 'Fly a little in your own world first (your game needs a save to come home to).', nocode: 'No world has that code.', bad: 'A world code is 5 letters and numbers (no I, L, O, 0 or 1).',
    off2: "Multiplayer isn't set up yet.", left: (h) => (h || 'Your friend') + ' went home. You wake in your own nest, in your own world.', wait: (h) => (h || 'Your friend') + ' chooses what happens to the Hawk.' };

  const W = { G: null, T: null, status: 'off', role: null, uid: null, w: null, code: null, slot: 0, name: '', why: '', t: 0, rnow: 0, lastSend: -1, sent: 0, recv: 0, dropped: 0, refused: 0, lastWhy: '',
    ghosts: new Map(), slots: {}, story: { m: null, world: null, choices: null }, applied: { world: null, choices: null }, own: null, ownText: null, xpFrac: 0, hostLv: 0, hostName: '', hostSeen: 0,
    F: { run: -1 }, hostRun: null, creditRun: -1, memo: null, near: Infinity, rateNow: 1 / 10, resumeRefused: 0, pubT: 0, pubKey: '', pubWorld: null, pubChoices: null, fight: {}, fightT: 0, fightKey: '', myWarns: [], lastAtt: 0, run: 0, arenaWas: false, wonWas: 0, credited: 0, creditPick: 0, waitSaid: 0,
    conn: null, disc: 0, rearm: 0, offs: [], follows: 0, followAt: -1, ends: 0, endWhy: '', holdT: 0, teamHits: 0, xpLog: [], log: [] };

  /* ---------- small pure helpers (node-testable) ---------- */
  function fin(v, lo, hi) { v = +v; return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : 0; }
  function wrapAngle(a) { a = +a; if (!Number.isFinite(a)) return 0; return Math.atan2(Math.sin(a), Math.cos(a)); }
  function realNow() { return (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) / 1000; }
  function cleanName(s) { return String(s == null ? '' : s).replace(/[^\w \-'.]/g, '').trim().slice(0, 12); }
  function rnd(n, abc) { const r = new Uint8Array(n); if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(r); else for (let i = 0; i < n; i++) r[i] = Math.random() * 256; let s = ''; for (let i = 0; i < n; i++) s += abc[r[i] % abc.length]; return s; }   /* its OWN random source (crypto): the guards seed Math.random (ship #41's lesson) */
  function makeCode() { return rnd(5, ALPHABET); }
  function makeWorld() { return 'w' + rnd(12, '0123456789abcdefghijklmnopqrstuvwxyz'); }
  function xpMult(host, me) { const g = (+host || 0) - (+me || 0); return Math.max(0.25, Math.min(2, Math.pow(2, g / 10))); }   /* his curve: a guest far below the host catches up, far above learns slower */
  function place(w) { return PLACES.indexOf(w) >= 0 ? w : 'home'; }
  function pack(me, name, level, ms) {   /* the v2 packet: the place and the metres WITHIN it, wrapped and clamped into the published rules */
    const p = Array.isArray(me.p) ? me.p : [0, 0, 0];
    return { v: 2, w: place(me.w), k: String(me.k || 'cardinal').slice(0, RULES.k), p: [+fin(p[0], RULES.p[0], RULES.p[1]).toFixed(2), +fin(p[1], RULES.p[0], RULES.p[1]).toFixed(2), +fin(p[2], RULES.p[0], RULES.p[1]).toFixed(2)],
      y: +wrapAngle(me.y).toFixed(3), t: +fin(me.t, RULES.t[0], RULES.t[1]).toFixed(3), f: me.f ? 1 : 0, m: String(me.m || 'walk').slice(0, RULES.m), n: cleanName(name).slice(0, RULES.n), l: Math.round(fin(level, RULES.l[0], RULES.l[1])) || 1, s: Math.max(0, Math.round(fin(ms, 0, 1e15))) };
  }
  function refused(o) {   /* why net721.rules.json would refuse this bird packet, or '' */
    if (!o || typeof o !== 'object' || Array.isArray(o)) return 'not an object';
    const keys = Object.keys(o).sort().join(','); if (keys !== KEYS) return 'keys ' + keys;
    const isN = (v) => typeof v === 'number' && Number.isFinite(v);
    if (o.v !== 2) return 'v'; if (typeof o.w !== 'string' || !/^[a-z]{3,8}$/.test(o.w)) return 'w';
    if (typeof o.k !== 'string' || o.k.length > RULES.k) return 'k';
    if (!isN(o.y) || o.y < RULES.y[0] || o.y > RULES.y[1]) return 'y ' + o.y;
    if (!isN(o.t) || o.t < RULES.t[0] || o.t > RULES.t[1]) return 't';
    if (o.f !== 0 && o.f !== 1) return 'f'; if (typeof o.m !== 'string' || o.m.length > RULES.m) return 'm'; if (typeof o.n !== 'string' || o.n.length > RULES.n) return 'n';
    if (!isN(o.l) || o.l < RULES.l[0] || o.l > RULES.l[1]) return 'l'; if (!isN(o.s) || o.s < 0) return 's';
    if (!Array.isArray(o.p) || o.p.length !== 3 || o.p.some((x) => !isN(x) || x < RULES.p[0] || x > RULES.p[1])) return 'p';
    return '';
  }
  function sharedHp(mine, others) { let d = +mine || 0; for (const x of others || []) d += +x || 0; return Math.max(0, HP0 - d); }   /* the one Hawk's health: 100 minus every player's own damage */
  function holdFor(policy, myWarns, roomWarns, nowMs, myMode) {   /* 'split' never holds a player's Hawk; 'shared' holds it while the ROOM has spent 3 strikes in 5 s (one budget for everyone) */
    if (policy !== 'shared' || myMode === 'warn' || myMode === 'dive') return false;
    let n = 0; for (const a of (myWarns || []).concat(roomWarns || [])) if (nowMs - a < 5000) n++; return n >= 3;
  }
  function warnsText(a) { return a.slice(-4).map((x) => Math.round(x)).join(','); }
  function warnsOf(s) { return String(s || '').split(',').filter(Boolean).map(Number).filter(Number.isFinite); }

  /* ---------- transports ---------- */
  function fakeTransport() {   /* every call is an operation in the outbox; the guard answers it (inject) from a database it holds in node, under net721.rules.json */
    const T = { kind: 'fake', outbox: [], subs: new Map(), wait: new Map(), connFns: [], n: 0, disc: [] };
    const op = (o) => new Promise((res, rej) => { const id = ++T.n; o.id = id; T.wait.set(id, { res, rej }); T.outbox.push(o); });
    T.signIn = () => op({ op: 'signin' }).then((r) => r.uid);
    T.get = (p) => op({ op: 'get', path: p }).then((r) => r.val);
    T.update = (p, v) => op({ op: 'update', path: p, val: JSON.parse(JSON.stringify(v)) });
    T.set = (p, v) => op({ op: 'set', path: p, val: v == null ? null : JSON.parse(JSON.stringify(v)) });
    T.remove = (p) => op({ op: 'set', path: p, val: null });
    T.on = (p, fn) => { if (!T.subs.has(p)) T.subs.set(p, []); T.subs.get(p).push(fn); T.outbox.push({ op: 'sub', path: p }); return () => { const L = T.subs.get(p) || []; const i = L.indexOf(fn); if (i >= 0) L.splice(i, 1); if (!L.length) { T.subs.delete(p); T.outbox.push({ op: 'unsub', path: p }); } }; };
    T.onDisc = (p) => { T.outbox.push({ op: 'disc', path: p }); return Promise.resolve(); };
    T.onConnected = (fn) => { T.connFns.push(fn); return true; };
    T.inject = (m) => {
      if (m && m.id && T.wait.has(m.id)) { const w = T.wait.get(m.id); T.wait.delete(m.id); if (m.ok) w.res(m); else { const e = new Error(m.err || 'PERMISSION_DENIED'); e.code = m.err || 'PERMISSION_DENIED'; w.rej(e); } return; }
      if (m && m.sub != null) { for (const fn of (T.subs.get(m.sub) || []).slice()) fn(m.val == null ? null : m.val); return; }
      if (m && m.connected != null) for (const fn of T.connFns) fn(!!m.connected);
    };
    T.close = () => { T.subs.clear(); for (const w of T.wait.values()) w.rej(new Error('closed')); T.wait.clear(); };
    return T;
  }
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('could not load ' + src)); document.head.appendChild(s); }); }
  function firebaseTransport(cfg) {
    let db = null, auth = null; const T = { kind: 'firebase', ready: null };
    T.ready = (async () => {
      if (!window.firebase) await loadScript(SDK + 'firebase-app-compat.js');
      if (!firebase.database) await loadScript(SDK + 'firebase-database-compat.js');
      if (!firebase.auth) await loadScript(SDK + 'firebase-auth-compat.js');   /* board 721: the same CDN, the same pinned version */
      const app = firebase.apps && firebase.apps.length ? firebase.apps[0] : firebase.initializeApp(cfg);
      auth = firebase.auth(app); db = firebase.database(app);
    })();
    const R = (p) => (p ? db.ref(p) : db.ref());
    T.signIn = async () => { await T.ready; const c = await auth.signInAnonymously(); return c.user.uid; };
    T.get = async (p) => { await T.ready; return (await R(p).once('value')).val(); };
    T.update = async (p, v) => { await T.ready; return R(p).update(v); };
    T.set = async (p, v) => { await T.ready; return R(p).set(v); };
    T.remove = async (p) => { await T.ready; return R(p).remove(); };
    T.on = (p, fn) => { let off = null, dead = false; T.ready.then(() => { if (dead) return; const r = R(p), cb = (s) => fn(s.val()); r.on('value', cb, () => fn(null)); off = () => r.off('value', cb); }); return () => { dead = true; if (off) off(); }; };
    T.onDisc = async (p) => { await T.ready; return R(p).onDisconnect().remove(); };
    T.onConnected = (fn) => { T.ready.then(() => db.ref('.info/connected').on('value', (s) => fn(!!s.val()))); return true; };
    T.close = () => { /* the SDK stays: Fly together may be using it */ };
    return T;
  }

  /* ---------- the other birds: one rig each, drawn DELAY s behind on the sender's clock (net678's way), only when it is in my place ---------- */
  function ghostMake(uid, k, name) {
    const G = W.G, THREE = G.THREE, r = G.build(k), g = r.g; g.name = 'ghost721'; g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c = cv.getContext('2d'); const body = (typeof getComputedStyle === 'function' ? getComputedStyle(document.documentElement).getPropertyValue('--body') : '').trim() || 'system-ui, sans-serif';
    c.font = '800 30px ' + body; c.textAlign = 'center'; c.textBaseline = 'middle'; const tw = c.measureText(name || 'friend'), w = Math.min(244, ((tw && tw.width) || 120) + 36), x0 = 128 - w / 2;
    c.beginPath(); c.moveTo(x0 + 16, 8); c.arcTo(x0 + w, 8, x0 + w, 58, 16); c.arcTo(x0 + w, 58, x0, 58, 16); c.arcTo(x0, 58, x0, 8, 16); c.arcTo(x0, 8, x0 + w, 8, 16); c.closePath(); c.fillStyle = '#fffdf8'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#e8dcc8'; c.stroke();
    c.fillStyle = '#22314a'; c.fillText(name || 'friend', 128, 33);   /* the game's own label look (net678's name card) */
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthWrite: false, transparent: true })); tag.scale.set(2.4, 0.6, 1); tag.position.y = 1.5; g.add(tag);
    G.scene.add(g); const sz = (G.BIRDS[k] && G.BIRDS[k].size) || 0.45; g.scale.setScalar(sz * 0.55); tag.material.opacity = 0;
    return { uid, g, rig: { wingL: r.wingL, wingR: r.wingR, tail: r.tail, legs: r.legs, body: g, head: r.head, kind: k }, k, name, tag, at: new THREE.Vector3(), yaw: 0, pitch: 0, flap: 0, m: 'fly', w: 'home', lv: 1,
      lastRecv: W.t, pk: 0, buf: [], off: null, how: 'hold', arrive: 1.6, sz, shown: false };
  }
  function ghostDrop(uid) { const g = W.ghosts.get(uid); if (!g) return; W.G.scene.remove(g.g); try { g.tag.material.map.dispose(); g.tag.material.dispose(); } catch (e) { /* fine */ } W.ghosts.delete(uid); }
  function onBird(uid, raw) {
    if (uid === W.uid) return; if (refused(raw)) { W.dropped++; return; }
    const B = W.G.BIRDS, k = B[raw.k] ? raw.k : 'cardinal', name = cleanName(raw.n);
    let g = W.ghosts.get(uid); if (g && (g.k !== k || g.name !== name)) { ghostDrop(uid); g = null; }
    if (!g) { g = ghostMake(uid, k, name); W.ghosts.set(uid, g); try { if (window.WFR_SOUND && WFR_SOUND.call) WFR_SOUND.call(k === 'cardinal' ? 'cardinal:chip' : k, { notes: 1, vol: 0.35 }); } catch (e) { /* the voice is optional */ } }
    W.recv++; g.lastRecv = W.t; g.lv = raw.l; g.pk++;
    const ts = raw.s / 1000, Bf = g.buf, z = Bf.length ? Bf[Bf.length - 1] : null;
    if (z && raw.w !== z.w) { Bf.length = 0; g.off = null; }   /* it crossed: a fresh stream in its new place */
    else if (z) { if (ts <= z.ts) { if (ts < z.ts - 5) { Bf.length = 0; g.off = null; } else return; } else if (Math.hypot(raw.p[0] - z.p[0], raw.p[1] - z.p[1], raw.p[2] - z.p[2]) > SNAP) { Bf.length = 0; g.off = null; } }
    const a = realNow() - ts; if (g.off == null || a < g.off || a > g.off + 1) g.off = a; else g.off += (a - g.off) * 0.02;
    Bf.push({ ts, w: raw.w, p: raw.p, y: raw.y, t: raw.t, f: raw.f, m: raw.m }); if (Bf.length > BUF) Bf.shift();
    g.delay = Bf.length > 2 ? Math.max(DELAY, Math.min(0.6, 1.25 * (Bf[Bf.length - 1].ts - Bf[0].ts) / (Bf.length - 1))) : DELAY;   /* a far bird sends 3 a second: drawn a little further back, still between two real snapshots */
  }
  function sample(g, now) {
    const B = g.buf; if (!B.length || g.off == null) return null; const rt = now - g.off - (g.delay || DELAY);
    while (B.length > 2 && B[1].ts <= rt) B.shift(); const a = B[0], z = B[B.length - 1];
    if (rt <= a.ts || B.length < 2) return { w: a.w, p: a.p, y: a.y, t: a.t, f: a.f, m: a.m, how: 'hold' };
    if (rt <= z.ts) { let i = 1; while (B[i].ts < rt) i++; const p = B[i - 1], q = B[i], u = Math.max(0, Math.min(1, (rt - p.ts) / Math.max(0.001, q.ts - p.ts)));
      return { w: q.w, p: [p.p[0] + (q.p[0] - p.p[0]) * u, p.p[1] + (q.p[1] - p.p[1]) * u, p.p[2] + (q.p[2] - p.p[2]) * u], y: p.y + wrapAngle(q.y - p.y) * u, t: p.t + (q.t - p.t) * u, f: q.f, m: q.m, how: 'interp' }; }
    const p = B[B.length - 2], d = Math.max(RATE * 0.5, z.ts - p.ts), e = Math.min(EXTRAP, rt - z.ts); let v = [(z.p[0] - p.p[0]) / d, (z.p[1] - p.p[1]) / d, (z.p[2] - p.p[2]) / d]; if (Math.hypot(v[0], v[1], v[2]) > 80) v = [0, 0, 0];
    return { w: z.w, p: [z.p[0] + v[0] * e, z.p[1] + v[1] * e, z.p[2] + v[2] * e], y: z.y, t: z.t, f: z.f, m: z.m, how: e >= EXTRAP ? 'held' : 'extrap' };
  }
  function drawGhosts(dt, rdt, now) {
    const G = W.G, here = place(G.where()), base = G.placeBase(here);
    for (const g of Array.from(W.ghosts.values())) {
      if (W.t - g.lastRecv > SILENCE) { ghostDrop(g.uid); continue; }
      const s = sample(g, now); if (!s) continue; g.w = s.w;
      const show = s.w === here && !!base; g.g.visible = show; g.shown = show; if (!show) continue;
      const x = base[0] + s.p[0], y = s.p[1], z = base[1] + s.p[2], dx = x - g.at.x, dy = y - g.at.y, dz = z - g.at.z;
      if (dx * dx + dy * dy + dz * dz > SNAP * SNAP) g.at.set(x, y, z); else { const k = Math.min(1, rdt * 20); g.at.x += dx * k; g.at.y += dy * k; g.at.z += dz * k; }
      g.yaw += wrapAngle(s.y - g.yaw) * Math.min(1, rdt * 12); g.pitch = s.t; g.flap = s.f; g.m = s.m; g.how = s.how;
      if (g.arrive > 0) { g.arrive = Math.max(0, g.arrive - rdt); const ka = 1 - g.arrive / 1.6; g.g.scale.setScalar(g.sz * (0.55 + 0.45 * ka)); g.tag.material.opacity = Math.min(1, ka * 1.5); }   /* it flies IN (his feel law) */
      g.g.position.copy(g.at); g.g.rotation.y = g.yaw; g.g.rotation.x = g.m === 'fly' ? -g.pitch * 0.8 : 0;
      const WB = window.WFR_BIRDS; if (WB && WB.fly && g.m === 'fly') { const fo = WB.fly(g.rig, dt, { t: W.t, flap: !!g.flap || g.arrive > 0, hover: 0, long: 0, flutter: false, dive: g.pitch < -0.35, speed: 10, turn: 0, legsDown: false, body: g.g.rotation.x, roll: 0 }); g.g.position.y += fo.y * g.sz; g.g.rotation.x += fo.pitch; }
      else if (WB && WB.rest) { WB.rest(g.rig, dt); if (WB.tuck) WB.tuck(g.rig, 0); }
    }
  }

  /* ---------- the world: make, enter, leave, come back ---------- */
  function savedWorld() { try { const r = JSON.parse(localStorage.getItem('wfr.world721') || 'null'); return r && typeof r === 'object' && WORLD_RE.test(r.w || '') ? r : null; } catch (e) { return null; } }
  function saveWorld(o) { try { if (o) localStorage.setItem('wfr.world721', JSON.stringify(o)); else localStorage.removeItem('wfr.world721'); } catch (e) { /* private mode */ } }
  function config() { const c = window.WFR_NET_CONFIG; return c && typeof c === 'object' && typeof c.databaseURL === 'string' && typeof c.apiKey === 'string' ? c : null; }
  function transport() { if (W.T) return W.T; if (window.WFR_NET721_FAKE) W.T = fakeTransport(); else { const c = config(); if (!c) return null; W.T = firebaseTransport(c); } return W.T; }
  function say(why) { W.why = why || ''; try { if (W.G && W.G.sheet) W.G.sheet(); } catch (e) { /* the sheet is optional */ } }
  function fail(e) { const m = String(e && (e.code || e.message) || e); W.lastWhy = m; if (NOAUTH.test(m)) { W.status = 'noauth'; say(WORDS.noauth); } else { W.status = 'error'; say('Could not reach the world (' + m.slice(0, 60) + ').'); } return { ok: false, why: W.why }; }
  async function signIn() { const T = transport(); if (!T) throw new Error(WORDS.off2); if (!W.uid) W.uid = await T.signIn(); return W.uid; }
  const wp = (s) => 'worlds/' + W.w + (s ? '/' + s : '');
  async function make(name) {
    if (W.status === 'host' || W.status === 'guest') return { ok: false, why: 'You are in a world already.' };
    W.name = cleanName(name) || W.name || 'friend'; W.status = 'joining'; say('Opening your world...');
    try { const uid = await signIn(); const w = makeWorld(); let code = '';
      for (let i = 0; i < 4 && !code; i++) { const c = makeCode(); if ((await W.T.get('codes/' + c)) == null) code = c; }
      if (!code) throw new Error('no free code');
      const up = {}; up['worlds/' + w + '/owner'] = uid; up['worlds/' + w + '/code'] = code; up['worlds/' + w + '/slots/1'] = uid; up['worlds/' + w + '/members/' + uid] = '1'; up['worlds/' + w + '/open'] = 1; up['codes/' + code] = w;
      await W.T.update('', up); W.w = w; W.code = code; W.slot = 1; W.role = 'host'; return online();
    } catch (e) { return fail(e); }
  }
  async function enter(code, name, w0) {
    if (W.status === 'host' || W.status === 'guest') return { ok: false, why: 'You are in a world already.' };
    W.name = cleanName(name) || W.name || 'friend';
    code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (!w0 && !CODE_RE.test(code)) { say(WORDS.bad); return { ok: false, why: WORDS.bad }; }
    W.status = 'joining'; say('Flying to your friend\'s world...');
    try { const uid = await signIn(); const w = w0 || await W.T.get('codes/' + code); if (!w || !WORLD_RE.test(w)) { W.status = 'off'; say(WORDS.nocode); return { ok: false, why: WORDS.nocode }; }
      const owner = await W.T.get('worlds/' + w + '/owner'), slots = (await W.T.get('worlds/' + w + '/slots')) || {};
      if (!owner) { W.status = 'off'; say(WORDS.nocode); saveWorld(null); return { ok: false, why: WORDS.nocode }; }
      let n = 0; for (let i = 1; i <= SLOTS; i++) if (slots[i] === uid) n = i;   /* my own slot, kept across a sleep or a reload */
      const host = owner === uid; if (!host && !(await W.T.get('worlds/' + w + '/open'))) { W.status = 'off'; say(WORDS.closed); return { ok: false, why: WORDS.closed }; }
      if (!n) for (let i = 2; i <= SLOTS && !n; i++) if (!slots[i]) n = i;
      if (!n) { W.status = 'off'; say(WORDS.full); return { ok: false, why: WORDS.full }; }
      if (!host && !snapshotOwn()) { W.status = 'off'; say(WORDS.nosave); return { ok: false, why: WORDS.nosave }; }   /* Obito: with no REAL save of its own a phone never joins as a guest (its own world could not come back) */
      if (slots[n] !== uid) { const up = {}; up['slots/' + n] = uid; up['members/' + uid] = String(n); await W.T.update('worlds/' + w, up); }
      if (host) await W.T.set('worlds/' + w + '/open', 1);   /* the host back in its world opens it again */
      W.w = w; W.code = code || (savedWorld() || {}).code || ''; W.slot = n; W.role = owner === uid ? 'host' : 'guest'; return online();
    } catch (e) { return fail(e); }
  }
  async function online() {
    const T = W.T; W.status = W.role; W.memo = { w: W.w, code: W.code, name: W.name, role: W.role, file: W.G.file(), at: stamp() }; saveWorld(W.memo);   /* the world remembers WHICH save joined it (its file and its last savedAt) */
    W.offs.push(T.on(wp('birds'), (v) => { const o = v || {}; for (const uid of Object.keys(o)) onBird(uid, o[uid]); for (const uid of Array.from(W.ghosts.keys())) if (!o[uid]) W.ghosts.get(uid).lastRecv = Math.min(W.ghosts.get(uid).lastRecv, W.t - SILENCE + 1); }));   /* a bird removed (it left or slept): gone within a second */
    W.offs.push(T.on(wp('slots'), (v) => { W.slots = v || {}; say(); }));
    W.offs.push(T.on(wp('fight'), (v) => { W.fight = v || {}; }));
    if (W.role === 'guest') { W.offs.push(T.on(wp('story/m'), (v) => { W.story.m = v; if (v) W.hostSeen = W.t; })); W.offs.push(T.on(wp('story/world'), (v) => { W.story.world = v; })); W.offs.push(T.on(wp('story/choices'), (v) => { W.story.choices = v; })); }
    if (!W.connHooked) W.connHooked = T.onConnected((on) => { if (on === W.conn) return; const was = W.conn; W.conn = on; if (!on) { W.disc++; return; } if (was === false && (W.status === 'host' || W.status === 'guest')) { W.rearm++; W.hostSeen = W.t; presence(); } });   /* back from a sleep: presence again, onDisconnect armed again; the host's silence is counted from now (we were the silent one) */
    await presence(); W.pubKey = ''; W.pubWorld = W.pubChoices = null; say(); return { ok: true, code: W.code, slot: W.slot, role: W.role };
  }
  async function presence() { try { await W.T.onDisc(wp('birds/' + W.uid)); W.lastSend = -1; } catch (e) { W.refused++; W.lastWhy = String(e && e.message || e); } }
  function snapshotOwn() {   /* the guest's OWN save, exactly as it is on the phone, kept while it plays the host's story */
    if (W.own) return true; let txt = null; try { txt = localStorage.getItem('wfr.save'); } catch (e) { /* fine */ }
    let o = null; try { o = JSON.parse(txt || 'null'); } catch (e) { o = null; }
    if (!real(o)) { try { o = JSON.parse(W.G.saveNow() || 'null'); } catch (e) { o = null; } }   /* the game's own save() written now */
    if (!real(o)) return false;   /* never {}: an empty snapshot would come home as an empty world */
    W.own = o; W.ownText = txt; W.credited = 0; W.creditPick = 0; W.xpFrac = 0; W.creditRun = -1; return true;
  }
  function real(o) { return !!o && typeof o === 'object' && !Array.isArray(o) && typeof o.level === 'number' && o.level >= 1; }
  function stamp() { try { const o = JSON.parse(localStorage.getItem('wfr.save') || 'null'); return real(o) ? o.savedAt || 0 : 0; } catch (e) { return 0; } }
  async function leave(why) {   /* ONCE, and local first: her own world comes back at once; the network is told when it can be (never awaited: a leave while offline once hung, ran again every frame, and the later runs restored an EMPTY world; the guard's T8 caught it) */
    if (!(W.status === 'host' || W.status === 'guest')) return { ok: false, why: 'not in a world' };
    const T = W.T, was = W.role, wpath = wp(''), uid = W.uid, slot = W.slot; W.status = 'leaving'; for (const f of W.offs.splice(0)) { try { f(); } catch (e) { /* fine */ } }
    if (T && uid) { const no = () => { /* offline: the world forgets us when it can */ }; T.remove(wpath + '/birds/' + uid).catch(no); if (was === 'host') { T.set(wpath + '/open', 0).catch(no); T.set(wpath + '/story/m', { on: 0, t: Date.now() }).catch(no); } else if (why !== 'host') { const up = {}; up['slots/' + slot] = null; up['members/' + uid] = null; T.update(wpath, up).catch(no); } }
    for (const uid of Array.from(W.ghosts.keys())) ghostDrop(uid);
    if (was === 'guest') { W.ends++; W.endWhy = why || 'left'; restoreOwn(why); }
    W.status = 'off'; W.role = null; W.w = null; W.slot = 0; W.story = { m: null, world: null, choices: null }; W.applied = { world: null, choices: null }; W.fight = {}; W.slots = {}; saveWorld(null);
    say(why === 'host' ? WORDS.left(W.hostName) : ''); return { ok: true };
  }
  function restoreOwn(why) {   /* the guest wakes in its own world: its own story fields back, its own nest, its own sky */
    const G = W.G, o = W.own; if (!o) return; W.own = null;   /* never an empty snapshot over her world */
    try { G.restore({ world: o.world && typeof o.world === 'object' ? o.world : {}, choices: Array.isArray(o.choices) ? o.choices : [], dawns: typeof o.dawns === 'number' ? o.dawns : 0, clock: typeof o.clock === 'number' ? o.clock : 600 }); } catch (e) { W.lastWhy = 'restore: ' + (e && e.message); }
    try { G.wakeHome(); } catch (e) { /* fine */ }
    try { G.world703(); } catch (e) { /* fine */ }
    try { G.save(); } catch (e) { /* fine */ }
    if (why === 'host') try { G.toast(WORDS.left(W.hostName), 5200); } catch (e) { /* fine */ }
  }

  /* ---------- the guest's save: its own fields only ---------- */
  const LIVE = ['level', 'xp', 'hearts', 'chick', 'inv', 'toolIn', 'kind'];   /* what the guest keeps from the host's world: its bird (his words: "you still level up") */
  function ownSave(s_) {
    let live = null; try { live = JSON.parse(s_); } catch (e) { return s_; }
    if (W.memo && (W.status === 'host' || W.status === 'guest')) { W.memo.at = live.savedAt; saveWorld(W.memo); }   /* the fingerprint follows every save this phone writes in the world */
    if (W.role !== 'guest' || !W.own) return s_;
    const out = Object.assign({}, W.own); for (const k of LIVE) if (k in live) out[k] = live[k]; out.savedAt = live.savedAt;
    return JSON.stringify(out);
  }
  function creditWin() {   /* "Both get it": a Hawk won together counts in the guest's OWN save */
    const o = W.own; if (!o) return false; o.world = o.world && typeof o.world === 'object' ? o.world : {}; const h = o.world.hawk = Object.assign({}, o.world.hawk || {});
    h.won = 1; h.call = Object.assign({}, h.call || {}, { arena: 2, played: true, together: 1 }); if (h.nextVisit == null) h.nextVisit = 1e9; W.credited++; W.G.save(); return true;
  }
  function creditPick() {   /* and the host's choice for the Hawk, once it is made, with the day in the guest's own calendar */
    const o = W.own; if (!o || !W.credited || W.creditPick) return; let hw = null, hc = null; try { hw = JSON.parse(W.story.world || 'null'); hc = JSON.parse(W.story.choices || 'null'); } catch (e) { return; }
    const hh = hw && hw.hawk; if (!hh || (hh.friend !== 1 && hh.friend !== -1)) return;
    const h = o.world.hawk; h.friend = hh.friend; h.told = 1; h.visits = 0; h.nextVisit = (o.dawns || 0) + 3;
    const pick = Array.isArray(hc) ? hc.filter((c) => c && c.id === 'hawk703').pop() : null; o.choices = Array.isArray(o.choices) ? o.choices.slice() : [];
    o.choices.push({ id: 'hawk703', pick: pick ? pick.pick : (hh.friend === 1 ? 'friend' : 'refuse'), day: o.dawns || 0, at: Date.now(), together: 1, host: W.hostName || '' }); W.creditPick = 1; W.G.save();
  }

  /* ---------- the host's story out, the guest's story in ---------- */
  function publish() {
    const G = W.G, st = G.story(), A = G.arena(); const m = { on: 1, t: Date.now(), where: place(st.where), w703: st.w703 ? 1 : 0, clock: Math.round(st.clock), dawns: st.dawns | 0, lv: G.level() | 0, n: W.name, ar: A && A.on ? 1 : 0, r: W.hostRun | 0 };
    const key = [m.where, m.w703, m.dawns, m.ar, m.r, m.lv].join('|'), due = W.t - W.pubT >= STORY_T * 4 || key !== W.pubKey;   /* on any change at once, else every 4 s (the clock runs on by itself between) */
    if (due) { W.pubT = W.t; W.pubKey = key; W.T.set(wp('story/m'), m).catch(rej); }
    if (st.world !== W.pubWorld) { W.pubWorld = st.world; W.T.set(wp('story/world'), st.world).catch(rej); }
    if (st.choices !== W.pubChoices) { W.pubChoices = st.choices; W.T.set(wp('story/choices'), st.choices).catch(rej); }
  }
  function rej(e) { W.refused++; W.lastWhy = String(e && (e.code || e.message) || e); }
  function follow() {
    const G = W.G, m = W.story.m; if (!m) return;
    if (m.on === 0) { leave('host'); return; }
    W.hostLv = m.lv | 0; W.hostName = cleanName(m.n);
    const patch = {}; if (W.story.world != null && W.story.world !== W.applied.world) { W.applied.world = W.story.world; try { patch.world = JSON.parse(W.story.world); } catch (e) { /* refused below */ } }
    if (W.story.choices != null && W.story.choices !== W.applied.choices) { W.applied.choices = W.story.choices; try { patch.choices = JSON.parse(W.story.choices); } catch (e) { /* fine */ } }
    patch.dawns = m.dawns; patch.clock = (m.clock + Math.max(0, (Date.now() - m.t) / 1000) * G.daySpeed) % 2700;   /* the host's clock, run on by the time since it was sent */
    G.applyStory(patch); G.world703(!!m.w703);
    const to = place(m.where), here = place(G.where()); if (to !== here && G.canFollow()) { if (G.follow(to, m.ar)) { W.follows++; W.followAt = W.t; } }   /* place(): only a place the game knows */
    creditPick();
  }
  /* ---------- the shared Hawk's books: pure, so tests/together721.js's node fight runs these very lines ---------- */
  function fightBook(F, A, run) {   /* F: my book; A: { on, won, pk } this frame. Returns MY damage in this run, a running total across my lives */
    if (F.run !== run) { F.run = run; F.base = 0; F.lastD = 0; F.won = 0; F.fought = 0; F.lives = 0; F.on = false; F.wonWas = A ? A.won | 0 : 0; }
    const on = !!(A && A.on && A.pk), cur = on && Array.isArray(A.pk.dmg) ? A.pk.dmg.reduce((a, b) => a + b, 0) : null;
    if (on && !F.on) { if (F.lives > 0) { F.base += F.lastD; F.lastD = 0; } F.lives++; }   /* a new life: its engine counts from 0 again, the run keeps what the last life dealt */
    if (cur != null) { F.lastD = cur; F.fought = 1; }
    if (A && (A.won | 0) > F.wonWas && F.fought) F.won = 1; F.wonWas = A ? A.won | 0 : F.wonWas; F.on = on;
    return Math.min(HP0, F.base + F.lastD);
  }
  function fightRecord(F, total, warns) { return { r: F.run, d: total, on: F.on ? 1 : 0, a: warnsText(warns || []), w: F.won ? 1 : 0 }; }   /* fight/$uid, as net721.rules.json takes it */
  function fightView(recs, me, run) {   /* everyone else in my run: their totals, their recent strikes, and whether any of them has won */
    const d = [], warns = []; let won = false; for (const uid of Object.keys(recs || {})) { if (uid === me) continue; const f = recs[uid]; if (!f || (f.r | 0) !== run) continue; d.push(+f.d || 0); if (f.on) warns.push(...warnsOf(f.a)); if (f.w === 1) won = true; }
    return { d, warns, won };
  }
  function anyOn(run) { return Object.keys(W.fight || {}).some((u) => u !== W.uid && W.fight[u] && (W.fight[u].r | 0) === run && W.fight[u].on === 1); }
  function fightTick() {   /* my damage out, everyone's in; my own Hawk keeps attacking ME on my own clock */
    const G = W.G, A = G.arena(); if (!A) return; const F = W.F;
    if (W.role === 'host' && A.on && !W.arenaWas && (W.hostRun == null || F.won || !anyOn(W.hostRun))) W.hostRun = (W.hostRun || 0) + 1;   /* a new fight only when nobody is still in the last one (a host's second life is the same fight) */
    if (A.on && !W.arenaWas) { W.myWarns = []; W.lastAtt = 0; W.teamHits = 0; }
    if (A.on) W.run = W.role === 'host' ? W.hostRun | 0 : (W.story.m && W.story.m.r) | 0;   /* the host's fight number (a guest may land before the host's story says its arena began) */
    const pk = A.pk; if (A.on && pk && pk.attacks > W.lastAtt) { for (let i = W.lastAtt; i < pk.attacks; i++) W.myWarns.push(Date.now()); W.lastAtt = pk.attacks; if (W.myWarns.length > 6) W.myWarns.splice(0, W.myWarns.length - 6); }
    const total = fightBook(F, A, W.run), rec = fightRecord(F, total, W.myWarns), key = JSON.stringify(rec);
    if (F.fought && key !== W.fightKey && (W.t - W.fightT >= FIGHT_T || !rec.on || rec.w)) { W.fightKey = key; W.fightT = W.t; W.T.set(wp('fight/' + W.uid), rec).catch(rej); }
    const v = fightView(W.fight, W.uid, W.run);
    if (F.fought && (F.won || v.won) && W.creditRun !== W.run) { W.creditRun = W.run; if (W.role === 'guest') creditWin(); else if (!A.on) G.hostWin(); }   /* "Both get it": whoever's Hawk fell, every bird of the fight is credited, the one who is down too */
    W.arenaWas = !!A.on;
  }
  function sendRate() {   /* the plan's "> 150 m away 3 Hz": 10 a second only while another bird is near enough to see me move */
    const me = W.G.me(); if (!me) return RATE; const b = W.G.placeBase(place(me.w)) || [0, 0], x = b[0] + me.p[0], y = me.p[1], z = b[1] + me.p[2]; let near = Infinity;
    for (const g of W.ghosts.values()) if (g.shown) near = Math.min(near, Math.hypot(g.at.x - x, g.at.y - y, g.at.z - z)); W.near = near; return near <= NEAR ? RATE : RATE_FAR;
  }

  /* ---------- the API ---------- */
  const API = {
    RULES, KEYS, PLACES, POLICY, HP0, NEAR, RATE, RATE_FAR, WORDS, pack, refused, xpMult, sharedHp, holdFor, fightBook, fightRecord, fightView, makeCode, makeWorld, fakeTransport, firebaseTransport, config, savedWorld, CODE_RE, WORLD_RE,
    attach(G) { W.G = G; const s = savedWorld(); if (s && s.name) W.name = cleanName(s.name); return API; },
    ready() { return !!config() || !!window.WFR_NET721_FAKE; },
    make, enter, leave: () => leave('left'),
    resume() { const s = savedWorld(); if (!s || W.status !== 'off') return false; if (window.WFR_NET678 && WFR_NET678.state().code) return false;
      let f = null; try { f = JSON.parse(W.G.fileText() || 'null'); } catch (e) { f = null; }
      const sameFile = s.file === W.G.file(), realFile = real(f), sameSave = !!f && f.savedAt === s.at;
      if (!sameFile || !realFile || !sameSave) { W.resumeRefused++; saveWorld(null); return false; }   /* only into the very save that last flew in that world: a New game, a Restore or another file never wakes up in it */
      enter(s.code, s.name, s.w); return true; },
    kick(uid) { if (W.status !== 'host' || !uid || uid === W.uid) return false; let n = 0; for (const k of Object.keys(W.slots || {})) if (W.slots[k] === uid) n = k; const up = {}; if (n) up['slots/' + n] = null; up['members/' + uid] = null; up['bans/' + uid] = 1; W.T.update(wp(''), up).catch(rej); return true; },   /* the owner's: out, and barred   /* "wfr.world721 remembers the world": back after a reload, no code typed */
    together() { return W.status === 'host' || W.status === 'guest'; }, guest() { return W.status === 'guest'; }, host() { return W.status === 'host'; },
    tick(dt) {
      if (!W.G) return; W.t += dt; const now = realNow(), rdt = W.rnow ? Math.min(0.25, Math.max(0, now - W.rnow)) : 0; W.rnow = now;
      if (W.status === 'host' || W.status === 'guest') {
        W.rateNow = sendRate(); if (now - W.lastSend >= W.rateNow - 0.004 && W.conn !== false) { W.lastSend = now; const me = W.G.me(); if (me) { W.T.set(wp('birds/' + W.uid), pack(me, W.name, W.G.level(), now * 1000)).catch(rej); W.sent++; } }
        if (W.status === 'host') publish(); else { follow(); if (W.status === 'guest' && W.conn !== false && W.hostSeen && W.t - W.hostSeen > HOST_GONE && !(W.slots[1] && W.ghosts.has(W.slots[1]))) leave('host'); }   /* judged by the HOST's own bird, never by whoever else is about */   /* only a CONNECTED phone may decide the host has gone */
        if (W.status === 'host' || W.status === 'guest') fightTick();
      }
      drawGhosts(dt, rdt, now);
    },
    xp(n) {   /* the guest's XP: x clamp(2^((host - me)/10), 0.25, 2), the fractions carried; the host (and a bird alone) as ever */
      n = +n || 0; if (W.status !== 'guest' || n <= 0 || !W.hostLv) return n;
      const m = xpMult(W.hostLv, W.G.level()), a = W.xpFrac + n * m, out = Math.floor(a + 1e-9); W.xpFrac = a - out; W.xpLog.push([n, +m.toFixed(3), out]); if (W.xpLog.length > 12) W.xpLog.shift(); return out;
    },
    ownSave, creditWin,
    shared() {   /* the Hawk's health for my engine, or null when I fight alone */
      if (!(W.status === 'host' || W.status === 'guest')) return null; const A = W.G.arena(); if (!A || !A.on || !A.pk) return null;
      const v = fightView(W.fight, W.uid, W.run); if (v.won) { W.teamHits++; return 0; }   /* any member's win: the one Hawk is down on every phone */
      if (!v.d.length) return null; const mine = W.F.run === W.run ? Math.min(HP0, W.F.base + W.F.lastD) : 0, hp = sharedHp(mine, v.d); if (hp < A.pk.hp) W.teamHits++; return hp;
    },
    hold() { if (!(W.status === 'host' || W.status === 'guest')) return false; const A = W.G.arena(); if (!A || !A.on || !A.pk) return false; const h = holdFor(POLICY, W.myWarns, fightView(W.fight, W.uid, W.run).warns, Date.now(), A.pk.mode); if (h) W.holdT++; return h; },
    wait() { if (W.waitSaid) return; W.waitSaid = 1; try { W.G.toast(WORDS.wait(W.hostName), 5200); } catch (e) { /* fine */ } },
    sheetText() { const n = Object.keys(W.slots || {}).length; return W.why ? W.why : !API.ready() ? WORDS.off2 : W.status === 'host' ? WORDS.host(W.code, n) : W.status === 'guest' ? WORDS.guest(W.hostName) : W.status === 'noauth' ? WORDS.noauth : WORDS.off; },
    state() {
      const gh = []; for (const g of W.ghosts.values()) gh.push({ uid: g.uid, k: g.k, name: g.name, w: g.w, shown: g.shown, visible: !!g.g.parent && g.g.visible, at: g.at.toArray().map((v) => +v.toFixed(2)), lv: g.lv, pk: g.pk, how: g.how, grow: +(g.g.scale.x / g.sz).toFixed(3) });
      return { ready: API.ready(), status: W.status, role: W.role, uid: W.uid, w: W.w, code: W.code, slot: W.slot, name: W.name, why: W.why, sent: W.sent, recv: W.recv, dropped: W.dropped, refused: W.refused, lastWhy: W.lastWhy, t: +W.t.toFixed(2),
        ghosts: gh, slots: Object.assign({}, W.slots), hostLv: W.hostLv, hostName: W.hostName, story: W.story.m ? Object.assign({}, W.story.m) : null, own: !!W.own, ownWorld: W.own ? JSON.stringify(W.own.world || {}) : null, credited: W.credited, creditPick: W.creditPick,
        conn: W.conn, disc: W.disc, rearm: W.rearm, follows: W.follows, followAt: W.followAt, ends: W.ends, endWhy: W.endWhy, xpFrac: +W.xpFrac.toFixed(3), xpLog: W.xpLog.slice(), run: W.run, fight: JSON.parse(JSON.stringify(W.fight || {})), teamHits: W.teamHits, holdT: W.holdT, book: Object.assign({}, W.F), hostRun: W.hostRun, creditRun: W.creditRun, rate: W.rateNow, near: W.near === Infinity ? null : +W.near.toFixed(1), resumeRefused: W.resumeRefused, myWarns: W.myWarns.length, policy: POLICY, saved: savedWorld(), transport: W.T ? W.T.kind : null };
    },
    _fake() { return W.T && W.T.kind === 'fake' ? W.T : null }
  };
  window.WFR_NET721 = API;
})();
