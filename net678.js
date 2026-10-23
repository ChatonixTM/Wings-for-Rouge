/* net678.js - WINGS FOR ROUGE, board 678 v1: THE MIRAGE (Trunks, Oct 21 2026). Marth, Oct 18, verbatim: "v1 is like we can
   see each other but it's like a mirage". Two players in one room code see each other's bird fly; nothing else is shared.
   A packet only moves a ghost bird. It NEVER writes S or any save key. The room code lives in ONE new key, wfr.room678.

   The game never depends on one vendor: it talks to a TRANSPORT { send(obj), on(fn), close() }. Two ship here:
     (1) firebaseTransport(config, code, player)  Firebase Realtime Database, dormant until window.WFR_NET_CONFIG exists
         (paste Marth's config into net678-config.js). The SDK (Apache-2.0, credited in LICENSES.md) is fetched from Google's
         own CDN only when a room is joined, never before.
     (2) fakeTransport()  an in-page outbox + inject(), bridged by the guard (tests/net678.js) between two pages.

   Wired by tools/wiring/wire-678-mirage.js: the game calls WFR_NET678.attach(G) once, then WFR_NET678.tick(dt) each frame.
   G = { THREE, scene, BIRDS, build(kind) -> rig {g, wingL, wingR, tail, legs, head}, me() -> {k,p,y,t,f,m}, $, toast }
   v1.1 (ship #42, wire-678b-v11.js; his field test Oct 21: "she can't see me, and the 5 frames per second is mad slow"): every packet is
   wrapped/clamped into the published rules before it leaves (pack); the fake transport refuses what the rules refuse (RULES, one table);
   10 a second; the receiver draws the ghost DELAY s in the past, interpolated between two real snapshots on the SENDER's clock (s = its ms). */
(function () {
  'use strict';
  const RATE = 1 / 10;           /* packets per second: 10 (v1 sent 5: "the 5 frames per second is mad slow") */
  const DELAY = 0.18;            /* seconds the ghost is drawn in the past: between two real snapshots, never a guess ahead */
  const EXTRAP = 0.3;            /* seconds it may carry on at its last velocity when the buffer runs dry; then it holds */
  const SNAP = 12;               /* metres between two snapshots: farther = it appears there (a reconnect, a long hitch) */
  const BUF = 12;                /* snapshots kept: 1.2 s at 10 Hz */
  const RULES = { y: [-7, 7], t: [-2, 2], p: [-2000, 2000], k: 12, m: 5, n: 12 };   /* MIRRORS net678.rules.json (tests/net678.js compares the two): what the sender clamps to and what the fake transport refuses */
  const SILENCE = 8;             /* seconds without a packet: the ghost is gone */
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   /* no lookalikes: no I, L, O, 0, 1 */
  const CODE_RE = /^[A-HJ-NP-Z2-9]{4,6}$/, PLAYER_RE = /^[a-z0-9]{6,12}$/;
  const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';   /* the official CDN build (compat API) */
  const LIMIT = 2000;            /* metres: the island is far smaller */

  const N = { G: null, T: null, code: null, player: null, name: '', ghost: null, send: 0, sent: 0, recv: 0, dropped: 0, t: 0, status: 'off', err: null, seq: 0, refused: 0, lastWhy: '', lastSend: -1, rnow: 0, band: null };

  /* ---------- helpers ---------- */
  function num(v, lo, hi) { v = +v; return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null; }
  function wrapAngle(a) { a = +a; if (!Number.isFinite(a)) return 0; return Math.atan2(Math.sin(a), Math.cos(a)); }   /* into [-pi, pi]: the game's S.yaw grows past 7 after a circle and the rules refuse it (his field test: "she can't see me") */
  function fin(v, lo, hi) { v = +v; return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : 0; }
  function realNow() { return (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()) / 1000; }
  function pack(me, name, ms) {   /* the packet, inside the published rules whatever the caller hands over: wrapped, clamped, cut. Never send what the rules refuse. */
    const p = Array.isArray(me.p) ? me.p : [0, 0, 0];
    return { v: 1, k: String(me.k || 'cardinal').slice(0, RULES.k), p: [+fin(p[0], RULES.p[0], RULES.p[1]).toFixed(2), +fin(p[1], RULES.p[0], RULES.p[1]).toFixed(2), +fin(p[2], RULES.p[0], RULES.p[1]).toFixed(2)], y: +wrapAngle(me.y).toFixed(3), t: +fin(me.t, RULES.t[0], RULES.t[1]).toFixed(3), f: me.f ? 1 : 0, m: String(me.m || 'walk').slice(0, RULES.m), n: cleanName(name).slice(0, RULES.n), s: Math.max(0, Math.round(fin(ms, 0, 1e15))) };
  }
  function refused(o) {   /* why net678.rules.json would refuse this packet, or '': the fake transport's gate, the published rules line by line */
    if (!o || typeof o !== 'object' || Array.isArray(o)) return 'not an object';
    const keys = Object.keys(o).sort().join(','); if (keys !== 'f,k,m,n,p,s,t,v,y') return 'keys ' + keys;
    const isN = (v) => typeof v === 'number' && Number.isFinite(v);
    if (o.v !== 1) return 'v';
    if (typeof o.k !== 'string' || o.k.length > RULES.k) return 'k';
    if (!isN(o.y) || o.y < RULES.y[0] || o.y > RULES.y[1]) return 'y ' + o.y;
    if (!isN(o.t) || o.t < RULES.t[0] || o.t > RULES.t[1]) return 't ' + o.t;
    if (o.f !== 0 && o.f !== 1) return 'f';
    if (typeof o.m !== 'string' || o.m.length > RULES.m) return 'm';
    if (typeof o.n !== 'string' || o.n.length > RULES.n) return 'n';
    if (!isN(o.s) || o.s < 0) return 's';
    if (!Array.isArray(o.p) || o.p.length !== 3 || o.p.some((x) => !isN(x) || x < RULES.p[0] || x > RULES.p[1])) return 'p ' + JSON.stringify(o.p);
    return '';
  }
  function makeCode(n) { n = n || 5; let s = ''; const r = new Uint8Array(n); if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(r); else for (let i = 0; i < n; i++) r[i] = Math.random() * 256; for (let i = 0; i < n; i++) s += ALPHABET[r[i] % ALPHABET.length]; return s; }
  function playerId() {   /* ship #41 (Trunks, Oct 21): its OWN random source. The guards seed Math.random; one draw here at boot shifted every villager's later draw and npc660 G4's 150 s window missed its meeting (4 of 4 runs). crypto first, as makeCode; Math.random only where crypto is absent */
    const r = new Uint8Array(7); if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(r); else for (let i = 0; i < 7; i++) r[i] = Math.random() * 256;
    let s = 'p'; for (let i = 0; i < 7; i++) s += '0123456789abcdefghijklmnopqrstuvwxyz'[r[i] % 36]; return s;
  }
  function cleanName(s) { return String(s == null ? '' : s).replace(/[^\w \-'.]/g, '').trim().slice(0, 12); }
  function config() { const c = window.WFR_NET_CONFIG; return c && typeof c === 'object' && typeof c.databaseURL === 'string' && typeof c.apiKey === 'string' ? c : null; }
  function roomSaved() { try { const r = JSON.parse(localStorage.getItem('wfr.room678') || 'null'); return r && typeof r === 'object' ? r : null; } catch (e) { return null; } }
  function roomSave(o) { try { if (o) localStorage.setItem('wfr.room678', JSON.stringify(o)); else localStorage.removeItem('wfr.room678'); } catch (e) { /* private mode: it still flies */ } }

  /* ---------- the packet: tiny, validated; anything else is dropped ---------- */
  function validate(o) {
    if (!o || typeof o !== 'object' || o.v !== 1) return null;
    if (!Array.isArray(o.p) || o.p.length !== 3) return null;
    const p = [num(o.p[0], -LIMIT, LIMIT), num(o.p[1], -LIMIT, LIMIT), num(o.p[2], -LIMIT, LIMIT)]; if (p.some((x) => x === null)) return null;
    const y = num(o.y, -7, 7), t = num(o.t, -2, 2); if (y === null || t === null) return null;
    const B = N.G && N.G.BIRDS; const k = typeof o.k === 'string' && B && B[o.k] ? o.k : 'cardinal';
    const m = o.m === 'fly' || o.m === 'walk' || o.m === 'swim' ? o.m : 'walk';
    return { v: 1, k, p, y, t, f: o.f ? 1 : 0, m, n: cleanName(o.n), s: num(o.s, 0, 1e12) || 0, id: typeof o.id === 'string' && PLAYER_RE.test(o.id) ? o.id : '' };
  }

  /* ---------- transports ---------- */
  function fakeTransport() {   /* v1.1: it REFUSES what the published rules refuse (the v1 fake took anything, so the guard never saw the raw-yaw refusal); a short outbox (8), so a slow bridge delivers a bunch, as a network does; jitter() turns on a delivery queue for the guard */
    const fns = []; const T = { kind: 'fake', outbox: [], refused: 0, lastWhy: '', jit: null, queue: [], delivered: 0, lost: 0 };
    T.send = (o) => { const why = refused(o); if (why) { T.refused++; T.lastWhy = why; N.refused++; N.lastWhy = why; return; } if (T.outbox.length >= 8) T.outbox.shift(); T.outbox.push(JSON.parse(JSON.stringify(o))); };
    T.on = (fn) => { fns.push(fn); };
    T.inject = (o, delay) => { if (delay > 0) { T.queue.push({ at: realNow() + delay, o }); return; } if (!T.jit) { for (const fn of fns) fn(o); return; } if (T.jit.rand() < T.jit.drop) { T.lost++; return; } T.queue.push({ at: realNow() + T.jit.min + (T.jit.max - T.jit.min) * T.jit.rand(), o }); };   /* delay (s): the guard schedules a whole stream on THIS page's clock, so its own slowness never shapes the delivery */
    T.drain = (now) => { if (!T.queue.length) return; T.queue.sort((a, b) => a.at - b.at); while (T.queue.length && T.queue[0].at <= now) { const q = T.queue.shift(); T.delivered++; for (const fn of fns) fn(q.o); } };
    T.jitter = (j) => { if (!j) { T.jit = null; T.queue.length = 0; return; } let x = (j.seed >>> 0) || 678; const rand = () => { x += 0x6D2B79F5; let z = x; z = Math.imul(z ^ (z >>> 15), z | 1); z ^= z + Math.imul(z ^ (z >>> 7), z | 61); return ((z ^ (z >>> 14)) >>> 0) / 4294967296; }; T.jit = { min: +j.min || 0, max: +j.max || 0, drop: +j.drop || 0, rand }; T.delivered = 0; T.lost = 0; };   /* mulberry32, seeded: its OWN random source, never Math.random (the guards seed that) */
    T.close = () => { fns.length = 0; T.queue.length = 0; };
    return T;
  }
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('could not load ' + src)); document.head.appendChild(s); }); }
  function firebaseTransport(cfg, code, player) {
    const fns = []; let ref = null, roomRef = null, off = null, closed = false, pending = null;
    const bad = (e) => { N.refused++; N.lastWhy = String(e && e.message || e); };   /* v1.1: a refused write is COUNTED (state().refused); v1 swallowed it, and his phone's writes were refused for a whole evening */
    const T = { kind: 'firebase', ready: false, send(o) { if (ref) ref.set(o).catch(bad); else pending = o; }, on(fn) { fns.push(fn); }, close() { closed = true; try { if (off) off(); if (ref) ref.remove(); } catch (e) { /* gone already */ } } };
    (async () => {
      try {
        if (!window.firebase) { await loadScript(SDK + 'firebase-app-compat.js'); await loadScript(SDK + 'firebase-database-compat.js'); }
        if (closed) return;
        const app = firebase.apps && firebase.apps.length ? firebase.apps[0] : firebase.initializeApp(cfg);
        const db = firebase.database(app); roomRef = db.ref('rooms/' + code); ref = roomRef.child(player); ref.onDisconnect().remove();
        const hear = (snap) => { if (snap.key === player) return; const v = snap.val(); if (v && typeof v === 'object') { v.id = snap.key; for (const fn of fns) fn(v); } };
        roomRef.on('child_added', hear); roomRef.on('child_changed', hear); off = () => { roomRef.off('child_added', hear); roomRef.off('child_changed', hear); };
        T.ready = true; if (pending) { ref.set(pending).catch(bad); pending = null; }
      } catch (e) { N.err = String(e && e.message || e); N.status = 'error'; }
    })();
    return T;
  }

  /* ---------- the ghost: a second WFR_BIRDS rig of their kind, smoothed between packets ---------- */
  function ghostMake(k, name) {
    const G = N.G, THREE = G.THREE; const r = G.build(k); const g = r.g; g.name = 'ghost678'; g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c = cv.getContext('2d'); const body = (typeof getComputedStyle === 'function' ? getComputedStyle(document.documentElement).getPropertyValue('--body') : '').trim() || 'system-ui, sans-serif';   /* his law (Oct 22): the game's own label look, the savebox/toast family: a cream card, its border, its body font, its ink; not a dark UI chip */
    c.font = '800 30px ' + body; c.textAlign = 'center'; c.textBaseline = 'middle'; const tw = c.measureText(name || 'friend'), w = Math.min(244, ((tw && tw.width) || 120) + 36), x0 = 128 - w / 2;
    c.beginPath(); c.moveTo(x0 + 16, 8); c.arcTo(x0 + w, 8, x0 + w, 58, 16); c.arcTo(x0 + w, 58, x0, 58, 16); c.arcTo(x0, 58, x0, 8, 16); c.arcTo(x0, 8, x0 + w, 8, 16); c.closePath(); c.fillStyle = '#fffdf8'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#e8dcc8'; c.stroke();
    c.fillStyle = '#22314a'; c.fillText(name || 'friend', 128, 33);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthWrite: false, transparent: true })); tag.scale.set(2.4, 0.6, 1); tag.position.y = 1.5; tag.name = 'ghost678:tag'; g.add(tag);
    G.scene.add(g);
    const sz = (G.BIRDS[k] && G.BIRDS[k].size) || 0.45; g.scale.setScalar(sz * 0.55); tag.material.opacity = 0;
    return { g, rig: { wingL: r.wingL, wingR: r.wingR, tail: r.tail, legs: r.legs, body: g, head: r.head, kind: k }, k, name, tag, tex: tag.material.map, at: new THREE.Vector3(), vel: new THREE.Vector3(), tgt: new THREE.Vector3(), yaw: 0, pitch: 0, flap: 0, m: 'fly', last: -1, lastRecv: 0, seen: 0, pk: 0, seq: 0, buf: [], off: null, how: 'hold', prev: new THREE.Vector3(), maxSpeed: 0, maxStep: 0, frames: 0, bandIn: 0, bandOut: 0, interpN: 0, extrapT: 0, heldT: 0, snaps: 0, arrive: 1.6, callT: 5, growN: 0, sz };
  }
  function callOf(k) { return k === 'cardinal' ? 'cardinal:chip' : k; }   /* the game's own takeoff idiom (one note of her kind's call) */
  function heard(g, vol) {   /* one soft note of the other bird's own call, from where it is: quieter and duller with distance, on its side (WFR_SOUND.call, the island's voice; never a UI beep) */
    try { const W = window.WFR_SOUND, me = N.G && N.G.me(); if (!W || !W.call) return false; let dist = 0, pan = 0;
      if (me) { const dx = g.at.x - me.p[0], dz = g.at.z - me.p[2], r = Math.hypot(dx, dz) || 1; dist = Math.max(0, Math.min(1, (r - 12) / 160)); pan = Math.max(-1, Math.min(1, (dz * Math.sin(me.y) - dx * Math.cos(me.y)) / r)); }   /* right = forward x up, forward = (sin yaw, cos yaw) */
      return W.call(callOf(g.k), { notes: 1, vol, distance: dist, pan }); } catch (e) { return false; }
  }
  function songNote() {   /* the melody note of the PLAYING song at this moment (the latest one at or before its position), so the chirp sits in that bar's harmony; bar 1 is an intro with no melody */
    const M = window.WFR_MUSIC; if (!M || !M.playing || !M.melody || !M.note) return false;
    const v = M.variant || 'home', all = (M.melody(1, 999, v) || []).slice().sort((a, b) => a.b - b.b); if (!all.length) return false;
    const inf = M.info ? M.info(v) : null, pos = M.position ? M.position() : null; let pick = all[0];
    if (inf && inf.spb > 0 && pos != null) { const beat = pos / inf.spb; for (const e of all) { if (e.b <= beat) pick = e; else break; } }
    return M.note(pick.m, 1);
  }
  function arrived(g) { heard(g, 0.35); try { songNote(); } catch (e) { /* the song is optional */ } }   /* while a song plays (the title), one note of THAT song's own melody says someone flew in, in its key */
  function farCall(g) { const me = N.G && N.G.me(); if (!me) return; if (Math.hypot(g.at.x - me.p[0], g.at.z - me.p[2]) > 35) heard(g, 0.22); }
  function ghostDrop() { const g = N.ghost; if (!g) return; N.G.scene.remove(g.g); try { g.tex.dispose(); g.tag.material.dispose(); } catch (e) { /* fine */ } N.ghost = null; }
  function onPacket(raw) {
    const o = validate(raw); if (!o) { N.dropped++; return; }
    N.recv++;
    let g = N.ghost;
    if (g && (g.k !== o.k || g.name !== o.n)) { ghostDrop(); g = null; }
    if (!g) { g = N.ghost = ghostMake(o.k, o.n); g.at.set(o.p[0], o.p[1], o.p[2]); g.g.position.copy(g.at); g.prev.copy(g.at); g.yaw = o.y; g.seen = N.t; arrived(g); }   /* v1.1: it is heard flying in */
    g.lastRecv = N.t;
    const ts = o.s / 1000, B = g.buf, z = B.length ? B[B.length - 1] : null;   /* v1.1: s is the sender's real clock in ms; the snapshots sit on ITS timeline, whatever the delivery did (packets bunch on a network) */
    if (z) { if (ts <= z.ts) { if (ts < z.ts - 5) { B.length = 0; g.off = null; } else return; }   /* an old or repeated packet keeps the ghost alive and never moves it back; a clock 5 s back is their page reloaded: a fresh stream */
      else if (Math.hypot(o.p[0] - z.p[0], o.p[1] - z.p[1], o.p[2] - z.p[2]) > SNAP) { B.length = 0; g.off = null; g.at.set(o.p[0], o.p[1], o.p[2]); g.prev.copy(g.at); g.yaw = o.y; } }   /* far away (a reconnect, a long hitch): it appears there, it does not glide across the island */
    const a = realNow() - ts; if (g.off == null || a < g.off || a > g.off + 1) g.off = a; else g.off += (a - g.off) * 0.02;   /* the arrival offset: the earliest seen, creeping up slowly; a jump of a second (their hitch, our hidden tab) resets it */
    B.push({ ts, p: o.p, y: o.y, t: o.t, f: o.f, m: o.m }); if (B.length > BUF) B.shift();
    g.tgt.set(o.p[0], o.p[1], o.p[2]); g.seq = o.s; g.last = N.t; g.pk++;
  }

  function sample(g, now) {   /* v1.1: DELAY s behind the sender's clock, between the two snapshots around that moment; past the newest: carry on up to EXTRAP s, then hold */
    const B = g.buf; if (!B.length || g.off == null) return null;
    const rt = now - g.off - DELAY;
    while (B.length > 2 && B[1].ts <= rt) B.shift();
    const a = B[0], z = B[B.length - 1];
    if (rt <= a.ts || B.length < 2) return { p: a.p, y: a.y, t: a.t, f: a.f, m: a.m, v: [0, 0, 0], how: 'hold' };
    if (rt <= z.ts) { let i = 1; while (B[i].ts < rt) i++; const p = B[i - 1], q = B[i], d = Math.max(0.001, q.ts - p.ts), u = Math.max(0, Math.min(1, (rt - p.ts) / d));
      return { p: [p.p[0] + (q.p[0] - p.p[0]) * u, p.p[1] + (q.p[1] - p.p[1]) * u, p.p[2] + (q.p[2] - p.p[2]) * u], y: p.y + wrapAngle(q.y - p.y) * u, t: p.t + (q.t - p.t) * u, f: q.f, m: q.m, v: [(q.p[0] - p.p[0]) / d, (q.p[1] - p.p[1]) / d, (q.p[2] - p.p[2]) / d], how: 'interp' }; }
    const p = B[B.length - 2], d = Math.max(RATE * 0.5, z.ts - p.ts); let v = [(z.p[0] - p.p[0]) / d, (z.p[1] - p.p[1]) / d, (z.p[2] - p.p[2]) / d]; if (Math.hypot(v[0], v[1], v[2]) > 80) v = [0, 0, 0];   /* a teleport is not a velocity */
    const e = Math.min(EXTRAP, rt - z.ts), held = e >= EXTRAP;
    return { p: [z.p[0] + v[0] * e, z.p[1] + v[1] * e, z.p[2] + v[2] * e], y: z.y, t: z.t, f: z.f, m: z.m, v: held ? [0, 0, 0] : v, how: held ? 'held' : 'extrap' };
  }

  /* ---------- the API ---------- */
  const API = {
    makeCode, validate, fakeTransport, firebaseTransport, config, roomSaved, pack, refused, wrapAngle, RULES, RATE, DELAY,
    attach(G) { N.G = G; N.player = playerId(); const r = roomSaved(); if (r && r.name) N.name = cleanName(r.name); return API; },
    ready() { return !!config() || !!window.WFR_NET678_FAKE; },
    join(code, name, transport) {
      code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (!CODE_RE.test(code)) return { ok: false, why: 'A code is 4 to 6 letters and numbers (no I, L, O, 0 or 1).' };
      if (!N.G) return { ok: false, why: 'The island is not ready.' };
      API.leave();
      name = cleanName(name) || N.name || 'friend'; N.name = name;
      if (transport) N.T = transport; else if (window.WFR_NET678_FAKE) N.T = fakeTransport(); else { const c = config(); if (!c) return { ok: false, why: "Multiplayer isn't set up yet." }; N.T = firebaseTransport(c, code, N.player); }
      N.code = code; N.status = 'on'; N.err = null; N.send = 0; N.lastSend = -1; N.refused = 0; N.lastWhy = ''; N.T.on(onPacket); roomSave({ code, name });
      return { ok: true, code };
    },
    leave() { if (N.T) { try { N.T.close(); } catch (e) { /* fine */ } } N.T = null; N.code = null; N.status = 'off'; ghostDrop(); },
    forget() { API.leave(); roomSave(null); },
    tick(dt) {
      if (!N.G) return; N.t += dt; const g = N.ghost;
      const now = realNow(), rdt = N.rnow ? Math.min(0.25, Math.max(0, now - N.rnow)) : 0; N.rnow = now;   /* v1.1: the ghost moves on the REAL clock: the other bird's time is not slowed by our pouch or our frame cap */
      if (N.T && N.code) {
        if (now - N.lastSend >= RATE - 0.004) { N.lastSend = now; const me = N.G.me(); if (me) { N.seq++; N.T.send(pack(me, N.name, now * 1000)); N.sent++; } }   /* 10 a second; null until she is in the world; pack() keeps every field inside the rules */
        if (N.T.drain) N.T.drain(now);
      }
      if (!g) return;
      if (N.t - g.lastRecv > SILENCE) { ghostDrop(); return; }
      const s = sample(g, now);
      if (s) { const dx = s.p[0] - g.at.x, dy = s.p[1] - g.at.y, dz = s.p[2] - g.at.z;
        if (dx * dx + dy * dy + dz * dz > SNAP * SNAP) { g.at.set(s.p[0], s.p[1], s.p[2]); g.prev.copy(g.at); g.snaps++; } else { const k = Math.min(1, rdt * 20); g.at.x += dx * k; g.at.y += dy * k; g.at.z += dz * k; }   /* a light 50 ms follow hides the small clock corrections; a 12 m gap is a snap (counted, and not a step: it is not motion) */
        g.yaw += wrapAngle(s.y - g.yaw) * Math.min(1, rdt * 12); g.pitch = s.t; g.flap = s.f; g.m = s.m; g.how = s.how; g.vel.set(s.v[0], s.v[1], s.v[2]); }
      if (g.arrive > 0) { g.arrive = Math.max(0, g.arrive - rdt); const ka = 1 - g.arrive / 1.6; g.g.scale.setScalar(g.sz * (0.55 + 0.45 * ka)); g.tag.material.opacity = Math.min(1, ka * 1.5); }   /* his law (Oct 22, "every feature should FEEL apart of the game"): it flies IN: wings beating, growing from small, its name card fading in; not a pop */
      g.callT -= rdt; if (g.callT <= 0) { g.callT = 8 + (g.pk % 3); farCall(g); }   /* when it is far, a faint call now and then, from its side, so you can find each other */
      const step = g.at.distanceTo(g.prev);   /* the instruments (state().ghost): the biggest step and apparent speed per frame, frames in/out of a speed band, how the frames were drawn */
      if (g.frames > 0) { if (step > g.maxStep) g.maxStep = step; if (rdt >= 0.008) { const sp = step / rdt; if (sp > g.maxSpeed) g.maxSpeed = sp; if (N.band) { if (sp < N.band[0] || sp > N.band[1]) g.bandOut++; else g.bandIn++; } } }
      const gr = g.g.scale.x / g.sz; if (gr > 0.56 && gr < 0.99) g.growN++;   /* the arrival, measured on what is drawn: frames it was part-grown (a bird that pops in has none) */
      g.prev.copy(g.at); g.frames++; if (g.how === 'interp') g.interpN++; else if (g.how === 'extrap') g.extrapT += rdt; else if (g.how === 'held') g.heldT += rdt;
      g.g.position.copy(g.at); g.g.rotation.y = g.yaw; g.g.rotation.x = g.m === 'fly' ? -g.pitch * 0.8 : 0;
      const W = window.WFR_BIRDS;
      if (W && W.fly && g.m === 'fly') { const fo = W.fly(g.rig, dt, { t: N.t, flap: !!g.flap || g.arrive > 0, hover: 0, long: 0, flutter: false, dive: g.pitch < -0.35, speed: g.vel.length(), turn: 0, legsDown: false, body: g.g.rotation.x, roll: 0 }); g.g.position.y += fo.y * (N.G.BIRDS[g.k] ? N.G.BIRDS[g.k].size : 0.45); g.g.rotation.x += fo.pitch; }
      else if (W && W.rest) { W.rest(g.rig, dt); if (W.tuck) W.tuck(g.rig, 0); }
    },
    state() { const g = N.ghost; let progs = null;   /* the programs the ghost's materials use (trap 188: a ghost must make no new program) */
      if (g && N.G.renderer) { progs = []; g.g.traverse((o) => { if (o.material) { const pr = N.G.renderer.properties.get(o.material), p = pr && (pr.currentProgram || pr.program); progs.push(p ? p.cacheKey : null); } }); }
      return { ready: API.ready(), configured: !!config(), fake: !!window.WFR_NET678_FAKE, status: N.status, err: N.err, code: N.code, player: N.player, name: N.name, sent: N.sent, recv: N.recv, dropped: N.dropped, refused: N.refused, lastWhy: N.lastWhy, rate: RATE, delay: DELAY, rules: RULES, t: N.t, transport: N.T ? N.T.kind : null, jitter: N.T && N.T.jit ? { delivered: N.T.delivered, lost: N.T.lost, queued: N.T.queue.length } : null, saved: roomSaved(), ghost: g ? { at: g.at.toArray(), tgt: g.tgt.toArray(), yaw: g.yaw, k: g.k, name: g.name, visible: !!g.g.parent, pk: g.pk, seq: g.seq, silence: N.t - g.lastRecv, progs, how: g.how, buf: g.buf.length, off: g.off, maxSpeed: g.maxSpeed, maxStep: g.maxStep, frames: g.frames, interpN: g.interpN, bandIn: g.bandIn, bandOut: g.bandOut, extrapT: g.extrapT, heldT: g.heldT, snaps: g.snaps, grow: +(g.g.scale.x / g.sz).toFixed(3), tagA: +g.tag.material.opacity.toFixed(3), growN: g.growN, arrive: +g.arrive.toFixed(2) } : null }; },
    _fake() { return N.T && N.T.kind === 'fake' ? N.T : null; },
    _jitter(o) {   /* the guard: deliver with jitter { min, max (s), drop (0..1), seed, band: [lo, hi] m/s }, and zero the ghost's instruments; null turns it off */
      const T = N.T; if (!T || !T.jitter) return false; T.jitter(o); N.band = o && Array.isArray(o.band) ? o.band : null;
      const g = N.ghost; if (g) { g.maxSpeed = 0; g.maxStep = 0; g.frames = 0; g.bandIn = 0; g.bandOut = 0; g.interpN = 0; g.extrapT = 0; g.heldT = 0; } return true; },
    _inject(o, d) { if (N.T) N.T.inject ? N.T.inject(o, d) : onPacket(o); else onPacket(o); }
  };
  window.WFR_NET678 = API;
})();
