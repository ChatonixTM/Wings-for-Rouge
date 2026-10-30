/* creative712.js - BOARD 712 S2, CREATIVE MODE v1: THE EDIT RECORD (Trunks, Oct 28 2026).
   Marth, Oct 28, verbatim: "we need to implement MBAEEMP fr. for everything. i want better world building. 2 player - properly, we can start a
   world together if we want. creative mode." Plan: PLAN_712_THE_WORLD_2026-10-28.md section 4 (Itachi): "One edit record: {id, k, c (z14
   cell), p [local m], y, by, t} under wfr.creative712, the same record S3 syncs."
   This file owns the record and nothing else: no THREE, no DOM, no game state, so the shared world (S3) and the bench can use it as it is.
     id   a unique id (crypto; never Math.random: the guards seed it and one draw shifts every later villager, ship #41's lesson)
     k    the piece's kind (a palette key: house, oak, pine, cabin, treehouse, fruit, rocks)
     c    [x, y] the Web Mercator z14 tile the piece stands in (world712-frame.js's tileIndexAt on the island's HOME frame)
     p    [east, up, south] metres from that tile's north-west corner (x east, z SOUTH: the frame's own axes); up = the base's height
     y    the yaw, radians (the game's: forward = (sin y, cos y) in x / z)
     by   who placed it (this phone's id until S3 signs players in)
     t    when (ms since 1970)
   A record without a valid c is REFUSED, never guessed: p alone means nothing without its tile (plan S2 claim 2's plant). */
(function (root) {
  'use strict';
  var KEY = 'wfr.creative712', Z = 14, V = 1, MAX = 400;
  var KINDS = ['house', 'oak', 'pine', 'cabin', 'treehouse', 'fruit', 'rocks'];
  function frameOk(W) { return !!(W && W.HOMEF && typeof W.tileIndexAt === 'function' && typeof W.tileBounds === 'function'); }
  function uid(prefix) {   /* 12 base-36 characters from crypto (Math.random only where crypto is absent, never on the guards' pages) */
    var a = '', c = root.crypto, b;
    if (c && c.getRandomValues) { b = new Uint8Array(12); c.getRandomValues(b); for (var i = 0; i < 12; i++) a += (b[i] % 36).toString(36); }
    else { for (var j = 0; j < 12; j++) a += Math.floor(Math.random() * 36).toString(36); }
    return (prefix || 'e') + '-' + a;
  }
  function r3(v) { return Math.round(v * 1000) / 1000; }
  function cellOf(W, x, z) { var t = W.tileIndexAt(W.HOMEF, Z, x, z), b = W.tileBounds(W.HOMEF, Z, t.x, t.y); return { c: [t.x, t.y], x0: b.x0, z0: b.z0, size: b.size }; }
  /* the record for a piece of kind k at game metres (x, h, z), yaw */
  function make(W, k, x, h, z, yaw, by, t, id) {
    var q = cellOf(W, x, z);
    return { id: id || uid('e'), k: k, c: q.c, p: [r3(x - q.x0), r3(h), r3(z - q.z0)], y: Math.round(yaw * 10000) / 10000, by: String(by || 'me'), t: Math.round(t || Date.now()) };
  }
  /* where a record stands in game metres, or null with the reason (a refusal, never a guess) */
  function where(W, r) {
    if (!r || typeof r !== 'object') return { bad: 'not a record' };
    if (typeof r.id !== 'string' || !r.id || r.id.length > 40) return { bad: 'no id' };
    if (KINDS.indexOf(r.k) < 0) return { bad: 'unknown kind ' + r.k };
    if (!Array.isArray(r.c) || r.c.length !== 2 || !Number.isInteger(r.c[0]) || !Number.isInteger(r.c[1]) || r.c[0] < 0 || r.c[1] < 0 || r.c[0] >= (1 << Z) || r.c[1] >= (1 << Z)) return { bad: 'no cell' };
    if (!Array.isArray(r.p) || r.p.length !== 3 || !r.p.every(function (v) { return typeof v === 'number' && isFinite(v); })) return { bad: 'no place' };
    if (typeof r.y !== 'number' || !isFinite(r.y)) return { bad: 'no yaw' };
    var b = W.tileBounds(W.HOMEF, Z, r.c[0], r.c[1]);
    if (r.p[0] < -0.01 || r.p[2] < -0.01 || r.p[0] > b.size + 0.01 || r.p[2] > b.size + 0.01) return { bad: 'outside its cell' };
    return { x: b.x0 + r.p[0], h: r.p[1], z: b.z0 + r.p[2], yaw: r.y };
  }
  function empty(by) { return { v: V, by: by || uid('p'), edits: [] }; }
  /* a stored document, cleaned: every bad record dropped and counted; a missing or broken document is a new world */
  function clean(W, raw) {
    var d = null, out, dropped = [];
    try { d = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { d = null; }
    if (!d || typeof d !== 'object' || d.v !== V || !Array.isArray(d.edits)) return { doc: empty(d && typeof d.by === 'string' ? d.by : null), dropped: raw != null && raw !== '' ? ['the document'] : [] };   /* anything stored that is not a v1 world (unparsable text, another version) is a drop: the caller copies it first */
    out = empty(typeof d.by === 'string' && d.by ? d.by : null);
    var seen = {};
    d.edits.forEach(function (r) { var w = frameOk(W) ? where(W, r) : { bad: 'no frame' }; if (w.bad || seen[r.id]) { dropped.push(w.bad || 'a repeated id'); return; }
      if (out.edits.length >= MAX) { dropped.push('over the cap of ' + MAX); return; }   /* the world's cap (Obito): a longer list is never drawn whole, and the caller keeps a copy */ seen[r.id] = 1; out.edits.push({ id: r.id, k: r.k, c: [r.c[0], r.c[1]], p: [r.p[0], r.p[1], r.p[2]], y: r.y, by: String(r.by || out.by), t: +r.t || 0 }); });
    return { doc: out, dropped: dropped };
  }
  /* the undo list: each step names its inverse; at most 60 kept */
  function History() { this.steps = []; }
  History.prototype.push = function (s) { this.steps.push(s); if (this.steps.length > 60) this.steps.shift(); };
  History.prototype.pop = function () { return this.steps.pop() || null; };
  History.prototype.size = function () { return this.steps.length; };
  root.WFR_CREATIVE = { KEY: KEY, Z: Z, V: V, MAX: MAX, KINDS: KINDS, uid: uid, cellOf: cellOf, make: make, where: where, empty: empty, clean: clean, History: History };
})(typeof window !== 'undefined' ? window : globalThis);
