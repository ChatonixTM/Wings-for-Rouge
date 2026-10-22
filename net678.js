/* net678.js - WINGS FOR ROUGE, board 678 v1: THE MIRAGE (Trunks, Oct 21 2026). Marth, Oct 18, verbatim: "v1 is like we can
   see each other but it's like a mirage". Two players in one room code see each other's bird fly; nothing else is shared.
   A packet only moves a ghost bird. It NEVER writes S or any save key. The room code lives in ONE new key, wfr.room678.

   The game never depends on one vendor: it talks to a TRANSPORT { send(obj), on(fn), close() }. Two ship here:
     (1) firebaseTransport(config, code, player)  Firebase Realtime Database, dormant until window.WFR_NET_CONFIG exists
         (paste Marth's config into net678-config.js). The SDK (Apache-2.0, credited in LICENSES.md) is fetched from Google's
         own CDN only when a room is joined, never before.
     (2) fakeTransport()  an in-page outbox + inject(), bridged by the guard (tests/net678.js) between two pages.

   Wired by tools/wiring/wire-678-mirage.js: the game calls WFR_NET678.attach(G) once, then WFR_NET678.tick(dt) each frame.
   G = { THREE, scene, BIRDS, build(kind) -> rig {g, wingL, wingR, tail, legs, head}, me() -> {k,p,y,t,f,m}, $, toast } */
(function () {
  'use strict';
  const RATE = 1 / 5;            /* packets per second: 5 */
  const SILENCE = 8;             /* seconds without a packet: the ghost is gone */
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   /* no lookalikes: no I, L, O, 0, 1 */
  const CODE_RE = /^[A-HJ-NP-Z2-9]{4,6}$/, PLAYER_RE = /^[a-z0-9]{6,12}$/;
  const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';   /* the official CDN build (compat API) */
  const LIMIT = 2000;            /* metres: the island is far smaller */

  const N = { G: null, T: null, code: null, player: null, name: '', ghost: null, send: 0, sent: 0, recv: 0, dropped: 0, t: 0, status: 'off', err: null, seq: 0 };

  /* ---------- helpers ---------- */
  function num(v, lo, hi) { v = +v; return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null; }
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
  function fakeTransport() {
    const fns = [];
    /* like Firebase set(): the outbox holds only the LATEST packet; a slow bridge sees fewer packets, never a backlog */
    return { kind: 'fake', outbox: [], send(o) { this.outbox[0] = JSON.parse(JSON.stringify(o)); }, on(fn) { fns.push(fn); }, inject(o) { for (const fn of fns) fn(o); }, close() { fns.length = 0; } };
  }
  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('could not load ' + src)); document.head.appendChild(s); }); }
  function firebaseTransport(cfg, code, player) {
    const fns = []; let ref = null, roomRef = null, off = null, closed = false, pending = null;
    const T = { kind: 'firebase', ready: false, send(o) { if (ref) ref.set(o).catch(() => {}); else pending = o; }, on(fn) { fns.push(fn); }, close() { closed = true; try { if (off) off(); if (ref) ref.remove(); } catch (e) { /* gone already */ } } };
    (async () => {
      try {
        if (!window.firebase) { await loadScript(SDK + 'firebase-app-compat.js'); await loadScript(SDK + 'firebase-database-compat.js'); }
        if (closed) return;
        const app = firebase.apps && firebase.apps.length ? firebase.apps[0] : firebase.initializeApp(cfg);
        const db = firebase.database(app); roomRef = db.ref('rooms/' + code); ref = roomRef.child(player); ref.onDisconnect().remove();
        const hear = (snap) => { if (snap.key === player) return; const v = snap.val(); if (v && typeof v === 'object') { v.id = snap.key; for (const fn of fns) fn(v); } };
        roomRef.on('child_added', hear); roomRef.on('child_changed', hear); off = () => { roomRef.off('child_added', hear); roomRef.off('child_changed', hear); };
        T.ready = true; if (pending) { ref.set(pending).catch(() => {}); pending = null; }
      } catch (e) { N.err = String(e && e.message || e); N.status = 'error'; }
    })();
    return T;
  }

  /* ---------- the ghost: a second WFR_BIRDS rig of their kind, smoothed between packets ---------- */
  function ghostMake(k, name) {
    const G = N.G, THREE = G.THREE; const r = G.build(k); const g = r.g; g.name = 'ghost678'; g.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c = cv.getContext('2d'); c.font = '600 34px system-ui, sans-serif'; c.textAlign = 'center'; c.fillStyle = 'rgba(20,16,12,0.55)'; c.fillRect(0, 10, 256, 46); c.fillStyle = '#fff6e0'; c.fillText(name || 'friend', 128, 44);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthWrite: false, transparent: true })); tag.scale.set(2.4, 0.6, 1); tag.position.y = 1.5; tag.name = 'ghost678:tag'; g.add(tag);
    G.scene.add(g);
    const sz = (G.BIRDS[k] && G.BIRDS[k].size) || 0.45; g.scale.setScalar(sz);
    return { g, rig: { wingL: r.wingL, wingR: r.wingR, tail: r.tail, legs: r.legs, body: g, head: r.head, kind: k }, k, name, tag, tex: tag.material.map, at: new THREE.Vector3(), vel: new THREE.Vector3(), tgt: new THREE.Vector3(), yaw: 0, pitch: 0, flap: 0, m: 'fly', last: -1, lastRecv: 0, seen: 0, pk: 0, seq: 0 };
  }
  function ghostDrop() { const g = N.ghost; if (!g) return; N.G.scene.remove(g.g); try { g.tex.dispose(); g.tag.material.dispose(); } catch (e) { /* fine */ } N.ghost = null; }
  function onPacket(raw) {
    const o = validate(raw); if (!o) { N.dropped++; return; }
    N.recv++;
    let g = N.ghost;
    if (g && (g.k !== o.k || g.name !== o.n)) { ghostDrop(); g = null; }
    if (!g) { g = N.ghost = ghostMake(o.k, o.n); g.at.set(o.p[0], o.p[1], o.p[2]); g.g.position.copy(g.at); g.yaw = o.y; g.seen = N.t; }
    if (g.last >= 0 && o.s <= g.seq) { g.lastRecv = N.t; return; }   /* an old or repeated packet: it keeps the ghost alive, it never moves it back */
    if (g.last >= 0) { const dtp = Math.max(RATE, (o.s - g.seq) * RATE);   /* the SENDER's spacing (5 a second), not the delivery's: packets bunch on a network */
      g.vel.set((o.p[0] - g.tgt.x) / dtp, (o.p[1] - g.tgt.y) / dtp, (o.p[2] - g.tgt.z) / dtp); if (g.vel.length() > 80) g.vel.setScalar(0); }   /* a teleport is not a velocity */
    g.tgt.set(o.p[0], o.p[1], o.p[2]); g.yawT = o.y; g.pitch = o.t; g.flap = o.f; g.m = o.m; g.seq = o.s; g.last = N.t; g.lastRecv = N.t; g.pk++;
    if (g.at.distanceTo(g.tgt) > 12) { g.at.copy(g.tgt); g.vel.setScalar(0); g.yaw = o.y; }   /* far away (a reconnect, a long hitch): it appears there, it does not glide across the island */
  }

  /* ---------- the API ---------- */
  const API = {
    makeCode, validate, fakeTransport, firebaseTransport, config, roomSaved,
    attach(G) { N.G = G; N.player = playerId(); const r = roomSaved(); if (r && r.name) N.name = cleanName(r.name); return API; },
    ready() { return !!config() || !!window.WFR_NET678_FAKE; },
    join(code, name, transport) {
      code = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (!CODE_RE.test(code)) return { ok: false, why: 'A code is 4 to 6 letters and numbers (no I, L, O, 0 or 1).' };
      if (!N.G) return { ok: false, why: 'The island is not ready.' };
      API.leave();
      name = cleanName(name) || N.name || 'friend'; N.name = name;
      if (transport) N.T = transport; else if (window.WFR_NET678_FAKE) N.T = fakeTransport(); else { const c = config(); if (!c) return { ok: false, why: "Multiplayer isn't set up yet." }; N.T = firebaseTransport(c, code, N.player); }
      N.code = code; N.status = 'on'; N.err = null; N.send = 0; N.T.on(onPacket); roomSave({ code, name });
      return { ok: true, code };
    },
    leave() { if (N.T) { try { N.T.close(); } catch (e) { /* fine */ } } N.T = null; N.code = null; N.status = 'off'; ghostDrop(); },
    forget() { API.leave(); roomSave(null); },
    tick(dt) {
      if (!N.G) return; N.t += dt; const g = N.ghost;
      if (N.T && N.code) {
        N.send -= dt; if (N.send <= 0) { N.send = RATE; const me = N.G.me(); if (me) { N.seq++; N.T.send({ v: 1, k: me.k, p: [+me.p[0].toFixed(2), +me.p[1].toFixed(2), +me.p[2].toFixed(2)], y: +me.y.toFixed(3), t: +me.t.toFixed(3), f: me.f ? 1 : 0, m: me.m, n: N.name, s: N.seq }); N.sent++; } }
      }
      if (!g) return;
      if (N.t - g.lastRecv > SILENCE) { ghostDrop(); return; }
      const ahead = Math.min(0.4, N.t - g.last);   /* dead reckoning between packets, never more than 0.4 s ahead */
      const tx = g.tgt.x + g.vel.x * ahead, ty = g.tgt.y + g.vel.y * ahead, tz = g.tgt.z + g.vel.z * ahead;
      const k = Math.min(1, dt * 10); g.at.x += (tx - g.at.x) * k; g.at.y += (ty - g.at.y) * k; g.at.z += (tz - g.at.z) * k;
      if (g.yawT != null) g.yaw += Math.atan2(Math.sin(g.yawT - g.yaw), Math.cos(g.yawT - g.yaw)) * Math.min(1, dt * 8);
      g.g.position.copy(g.at); g.g.rotation.y = g.yaw; g.g.rotation.x = g.m === 'fly' ? -g.pitch * 0.8 : 0;
      const W = window.WFR_BIRDS;
      if (W && W.fly && g.m === 'fly') { const fo = W.fly(g.rig, dt, { t: N.t, flap: !!g.flap, hover: 0, long: 0, flutter: false, dive: g.pitch < -0.35, speed: g.vel.length(), turn: 0, legsDown: false, body: g.g.rotation.x, roll: 0 }); g.g.position.y += fo.y * (N.G.BIRDS[g.k] ? N.G.BIRDS[g.k].size : 0.45); g.g.rotation.x += fo.pitch; }
      else if (W && W.rest) { W.rest(g.rig, dt); if (W.tuck) W.tuck(g.rig, 0); }
    },
    state() { const g = N.ghost; let progs = null;   /* the programs the ghost's materials use (trap 188: a ghost must make no new program) */
      if (g && N.G.renderer) { progs = []; g.g.traverse((o) => { if (o.material) { const pr = N.G.renderer.properties.get(o.material), p = pr && (pr.currentProgram || pr.program); progs.push(p ? p.cacheKey : null); } }); }
      return { ready: API.ready(), configured: !!config(), fake: !!window.WFR_NET678_FAKE, status: N.status, err: N.err, code: N.code, player: N.player, name: N.name, sent: N.sent, recv: N.recv, dropped: N.dropped, t: N.t, transport: N.T ? N.T.kind : null, saved: roomSaved(), ghost: g ? { at: g.at.toArray(), tgt: g.tgt.toArray(), yaw: g.yaw, k: g.k, name: g.name, visible: !!g.g.parent, pk: g.pk, seq: g.seq, silence: N.t - g.lastRecv, progs } : null }; },
    _fake() { return N.T && N.T.kind === 'fake' ? N.T : null; },
    _inject(o) { if (N.T) N.T.inject ? N.T.inject(o) : onPacket(o); else onPacket(o); }
  };
  window.WFR_NET678 = API;
})();
