/* world-terrain.js - unit W-TERRAIN, DEEPER TERRAIN EVERYWHERE (Marth, Nov 4 2026: "Use those 27 agents and BUild me the PLAYABLE FLYABLE WORLD";
   "prioritize accurate and vaast and submersive world building"; "i want this game to be ground breaking. real and submersive"). Trunks, Nov 4 2026.
   What it does: the whole Earth's ground sharp under her. world712-travel.js's streamer gets a REMOTE set: every Terrarium tile from z6 to z13, fetched
   as she flies from the AWS Open Data terrain tiles (the same tiles the game's local sets were cut from), cached by the service worker, the shipped
   z0-5 world + the Caribbean / Tahoe / Antigua sets first and the offline fallback. The streamer's own screen-error LOD picks the depth.
   Reused, not rewritten (MBAEEMP): the streamer's quadtree, virtual children, LRU and skirts (world712-travel.js); earth/tools/cut-tiles.js's despike rule.
   SOURCE + TERMS (checked Nov 4 2026, first-hand):
     - https://registry.opendata.aws/terrain-tiles/ : "License: https://github.com/tilezen/joerd/blob/master/docs/attribution.md"; public bucket, no account.
     - CORS: s3.amazonaws.com/elevation-tiles-prod answers "Access-Control-Allow-Origin: *" (curl -H Origin, Nov 4), and exposes x-amz-meta-x-imagery-sources.
     - attribution.md: every source is public domain or attribution-only (USGS 3DEP/SRTM/GMTED, NOAA ETOPO1, ArcticDEM "unlicensed", CC-BY 3.0 NZ / 3.0 AT /
       4.0 (Norway, Australia), UK OGL v3, Open Government Licence - Canada, INEGI free use, Copernicus EU-DEM). Its "Required attribution" block is shown
       under the title screen's terrain line (CREDIT below), never behind a click. Ledger: face/sources-ledger.json "Terrain tiles ... via Mapzen/Tilezen on AWS" (USE).
   THE ICE TOP: over Greenland's interior and Antarctica the tiles at z5 and deeper are etopo1/ETOPO1_Bed (BEDROCK: Greenland's summit 263 m at z5, 3,207 m
   at z4; Dome A 1,609 m against 4,086 m). Measured Nov 4 from the tiles' own source header and their heights (tools/terrain/ice-map.js, every z5 tile against
   its z4 parent). There the streamer holds the z4 heights (GMTED's ice surface) and cuts everything finer from them. Per region, switchable
   (WFR_TERRAIN.setIce('greenland', false)) for the ice unit (725e/725f, NOAA ETOPO 2022 ice surface) when its own tiles come.
   Every number DRAFT. Nothing here touches the shader (723e's), the tile corners (725b's frame) or the html beyond its one script tag. */
window.WFR_TERRAIN = (function () {
  'use strict';
  var C = { MINZ: 6, MAXZ: 13, BASE: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/', DESPIKE_Z: 10, SPIKE: 400, BACKOFF0: 5000, BACKOFF_MAX: 60000 };
  var CREDIT = 'Terrain detail: ArcticDEM terrain data DEM(s) were created from DigitalGlobe, Inc., imagery and funded under National Science Foundation awards 1043681, 1559691, and 1542736; ' +
    'Australia terrain data © Commonwealth of Australia (Geoscience Australia) 2017; Austria terrain data © offene Daten Österreichs – Digitales Geländemodell (DGM) Österreich; ' +
    'Canada terrain data contains information licensed under the Open Government Licence – Canada; Europe terrain data produced using Copernicus data and information funded by the European Union - EU-DEM layers; ' +
    'Global ETOPO1 terrain data U.S. National Oceanic and Atmospheric Administration; Mexico terrain data source: INEGI, Continental relief, 2016; ' +
    'New Zealand terrain data Copyright 2011 Crown copyright (c) Land Information New Zealand and the New Zealand Government (All rights reserved); Norway terrain data © Kartverket; ' +
    'United Kingdom terrain data © Environment Agency copyright and/or database right 2015. All rights reserved; United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey.';
  /* the ice top (z5 tiles whose own data is bedrock under the ice): Greenland's 21 by list; Antarctica every z5 row from y 23 south (-61.6 deg) */
  var GREENLAND = new Set('10,3 10,4 10,5 11,3 11,4 11,5 11,6 11,7 11,8 12,2 12,3 12,4 12,5 12,6 12,7 12,8 13,3 13,4 13,5 13,6 13,7'.split(' '));
  var ICE = { greenland: true, antarctica: true };
  function iceOf(z, x, y) { if (z < 5) return null; var d = z - 5, x5 = x >> d, y5 = y >> d; if (y5 >= 23) return 'antarctica'; if (GREENLAND.has(x5 + ',' + y5)) return 'greenland'; return null; }
  function capZ(z, x, y) { var r = iceOf(z, x, y); return r && ICE[r] ? 4 : null; }
  function setIce(region, on) { if (!(region in ICE)) throw new Error('WFR_TERRAIN.setIce: no region ' + region); ICE[region] = !!on; }

  /* the remote's health: offline, or failing, it backs off and the coarse world stands in (never a hole, never a page error) */
  var H = { fails: 0, until: 0, failsTotal: 0, oks: 0, sources: {} };
  function now() { return (window.performance && performance.now) ? performance.now() : Date.now(); }
  function off() { try { return !!window.WFR_TERRAIN_OFF || localStorage.getItem('wfr.terrain') === 'off'; } catch (e) { return !!window.WFR_TERRAIN_OFF; } }
  function up() { if (off()) return false; if (typeof navigator !== 'undefined' && navigator.onLine === false) return false; return now() >= H.until; }
  function ok() { H.fails = 0; H.oks++; }
  function fail() { H.fails++; H.failsTotal++; if (H.fails >= 2) H.until = now() + Math.min(C.BACKOFF_MAX, C.BACKOFF0 * Math.pow(2, H.fails - 2)); }
  function saw(k, src) { if (!src) return; String(src).split(',').forEach(function (s) { var fam = s.trim().split('/')[0]; if (fam) H.sources[fam] = (H.sources[fam] || 0) + 1; }); }

  /* cut-tiles.js's rule, at runtime and only from z10 (the coarse zooms' real slopes pass it): a pixel more than 400 m off the median of its 8
     neighbours takes the median (a source spike: one sat at -4,079 m on Tahoe's shore). One pass; most pixels leave at the min/max test. */
  var NB = new Float32Array(8);
  function clean(h, z, x, y) { var n = despike(h, z); lift(h, z, x, y); return n; }
  function despike(h, z) {
    if (z < C.DESPIKE_Z) return 0; var P = 256, n = 0;
    for (var y = 1; y < P - 1; y++) for (var x = 1; x < P - 1; x++) {
      var i = y * P + x, v = h[i], lo = 1e9, hi = -1e9, m = 0;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; var w = h[i + dy * P + dx]; NB[m++] = w; if (w < lo) lo = w; if (w > hi) hi = w; }
      if (v >= lo - C.SPIKE && v <= hi + C.SPIKE) continue;
      var s = Array.prototype.slice.call(NB).sort(function (a, b) { return a - b; }), med = (s[3] + s[4]) / 2; if (Math.abs(v - med) > C.SPIKE) { h[i] = med; n++; }
    }
    H.despiked = (H.despiked || 0) + n; return n;
  }
  /* THE SUMMITS (Nov 4): the radar heights cut famous summits short (Everest's highest z13 pixel 8,751 m against the 8,849 m survey; the Matterhorn 4,355
     against 4,478). [name, lat, lon of the DATA's own summit pixel (tools/terrain/bake-peaks.js), survey m, the data's z13 height there]. From z10 the
     tile is lifted by the shortfall under a smooth cap of LIFT_M round that pixel: the peak stands at its true height, its shape the data's. Never lowered.
     A documented modification of the source data (GMTED's "describe the types of modifications"): this lift and the despike, nothing else. */
  var PEAKS = [['Everest', 27.98932, 86.92546, 8849, 8751], ['K2', 35.88091, 76.51282, 8611, 8576], ['Lhotse', 27.96173, 86.93233, 8516, 8430], ['Aconcagua', -32.65289, -70.01166, 6961, 6947],
    ['Denali', 63.06915, -151.00648, 6190, 6166.2], ['Kilimanjaro', -3.07564, 37.35223, 5895, 5887], ['Mont Blanc', 45.83257, 6.86448, 4806, 4789.5], ['Matterhorn', 45.97663, 7.65704, 4478, 4354.5],
    ['Mount Whitney', 36.57866, -118.29211, 4421, 4414.6], ['Mount Fuji', 35.36085, 138.7272, 3776, 3759], ['Grossglockner', 47.07451, 12.69393, 3798, 3792.3]];
  C.LIFT_M = 400; C.LIFT_Z = 10;
  function lift(h, z, x, y) {
    if (z < C.LIFT_Z || x == null) return 0; var n = Math.pow(2, z), lifted = 0;
    for (var p = 0; p < PEAKS.length; p++) { var P = PEAKS[p], d = P[3] - P[4]; if (d <= 0) continue; var lr = P[1] * Math.PI / 180, gx = ((P[2] + 180) / 360 * n - x) * 256, gy = ((1 - Math.log(Math.tan(lr) + 1 / Math.cos(lr)) / Math.PI) / 2 * n - y) * 256;
      var rb = C.LIFT_M / (2 * Math.PI * 6378137 * Math.cos(lr) / (n * 256)); if (gx < -rb || gy < -rb || gx > 256 + rb || gy > 256 + rb) continue;
      for (var j = Math.max(0, Math.floor(gy - rb)); j < Math.min(256, Math.ceil(gy + rb)); j++) for (var i = Math.max(0, Math.floor(gx - rb)); i < Math.min(256, Math.ceil(gx + rb)); i++) {
        var q = Math.hypot(i + 0.5 - gx, j + 0.5 - gy) / rb; if (q >= 1) continue; var w = (1 - q * q) * (1 - q * q); h[j * 256 + i] += d * w; }
      lifted++; }
    H.lifted = (H.lifted || 0) + lifted; return lifted;
  }
  function url(z, x, y) { return C.BASE + z + '/' + x + '/' + y + '.png'; }
  var remote = { id: 'aws-terrarium', url: url, minZ: C.MINZ, maxZ: C.MAXZ, up: up, ok: ok, fail: fail, saw: saw, clean: clean, health: H };

  /* the defaults handed to every streamer the page makes (its own options win: remote: null turns the remote off for one streamer) */
  function install() {
    var T = window.WFR_TRAVEL712; if (!T || T.__terrain) return !!T; var mk = T.makeStreamer;
    T.makeStreamer = function (THREE, o) { var o2 = Object.assign({ remote: remote, capZ: capZ }, o || {}); return mk(THREE, o2); };
    T.__terrain = true; return true;
  }
  function credit() {   // the Required attribution, under the title screen's terrain line (no click); once
    if (typeof document === 'undefined' || document.getElementById('credit712t')) return;
    var a = document.getElementById('credit712'); if (!a || !a.parentNode) return;
    var p = document.createElement('p'); p.className = 'credit712'; p.id = 'credit712t'; p.textContent = CREDIT; a.parentNode.insertBefore(p, a.nextSibling);
  }
  install();
  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', credit); else credit(); }
  return { C: C, CREDIT: CREDIT, PEAKS: PEAKS, lift: lift, remote: remote, capZ: capZ, iceOf: iceOf, setIce: setIce, ice: ICE, clean: clean, install: install, health: H, version: 1 };
})();
