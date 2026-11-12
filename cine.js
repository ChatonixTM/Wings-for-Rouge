/* cine.js - BOARD 781 UNIT 1, THE CINEMATIC KIT (Wings for Rouge). Su 41, Nov 12 2026.
   Marth, Nov 12 2026, verbatim: "were gonna have to improve the cinematics ogf each scene.. drastically.. sonic adventure 2 battle/ ocarina of time switch 2 style
   and the whole feel of the game.. im going for ocarina of time / tears of the kingdom"; then "you can look at orignal ocarina of time for refernces tbh. theyre
   more 'thoughrough' although its old. the newer game adds wayyy more cinematic". Plan: PLAN_781_CINEMATICS_AND_CHICK_HAVEN_2026-11-12.md, unit 1.
   THE GRAMMAR WE STUDIED (never copied): the original game gives a scene to EVERY find and EVERY arrival (which moments); the newer one makes them slower, lower
   and lit (how they look). While the hero holds a find up, the world holds still. Our own words, our own tune (sounds.js 'get'), our own card.

   WHAT IS HERE. One player for short scenes, built from what the game already had (the drone's letterbox 692 and its shot maths, title39's card and phrases,
   tap-to-skip after 1.5 s): bars that slide in, the HUD faded, a camera laid over the game's own for one frame and put back after it (692's pattern: nothing
   in the game ever reads the scene's camera), the world held still if asked (the game multiplies its dt by frozen() ? 0 : 1), a tap catcher (no button
   underneath is pressed by a tap meant to skip), and four ready-made scenes:
     itemGet({ emoji, name, line, over, hide })   the find held up: bars, a low three-quarter shot that pushes in, her wings spread, the find rising over her,
                                                   a glow and sparkles, our 'get' tune, the card; 3.6 s, a tap ends it after 1.5 s. The world holds still.
     nameCard(name, role, ms)                     a person's name in the lower left with their place in the world (no bars, no hold)
     arrival({ over, name, under, kind, shot, dur }) bars and an establishing shot, then title39's card (the place's name rising)
     play(scene)                                  any scene: { dur, skip, freeze, bars, shot(t, u, P, L) -> fov, start(), tick(t), pose(on, t), end(how) }
   BORROWED: nothing new (the glow is a few lines of canvas gradient; the sparkles are the game's own burst(); the card's look is title39's).
   Standard only: create() gets classic() and every scene refuses in Classic (frozen). Every word and number a DRAFT for his pen and thumb. */
window.WFR_CINE = (function () {
  'use strict';
  var API = { error: '', last: null };
  var T_BAR = 0.45, T_IN = 0.55, T_OUT = 0.5;   /* the bars' slide, the camera's blend in from her own, its blend back */
  function sm(x) { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); }
  function css() {
    if (document.getElementById('cine781css')) return; var s = document.createElement('style'); s.id = 'cine781css';
    s.textContent = '#cine781{position:fixed;inset:0;z-index:45;pointer-events:none}#cine781.on{pointer-events:auto}' +
      '#cine781::before,#cine781::after{content:"";position:absolute;left:0;right:0;height:11vh;background:#04050a;transition:transform .45s cubic-bezier(.3,.7,.2,1)}' +
      '#cine781::before{top:0;transform:translateY(-101%)}#cine781::after{bottom:0;transform:translateY(101%)}#cine781.bars::before,#cine781.bars::after{transform:none}' +
      'html.cine781 #ui,html.cine781 #mark701,html.cine781 #toast,html.cine781 #quest,html.cine781 #xpPop{opacity:0!important;transition:opacity .4s}' +
      '#cine781 .card{position:absolute;left:16px;right:16px;bottom:calc(11vh + 22px);text-align:center;opacity:0;transform:translateY(14px);transition:opacity .7s ease,transform 1s cubic-bezier(.2,.7,.2,1)}' +
      '#cine781 .card.on{opacity:1;transform:none}' +
      '#cine781 .over{font:600 12px/1.3 var(--k-sans,var(--body,system-ui));letter-spacing:.32em;text-transform:uppercase;color:#f6efd8;text-shadow:0 1px 3px rgba(0,8,24,.85)}' +
      '#cine781 .name{margin:6px auto 0;display:inline-block;padding:0 22px 4px;font:500 32px/1.15 Georgia,"Times New Roman",serif;letter-spacing:.03em;color:#fff6dc;text-shadow:0 2px 10px rgba(0,10,30,.8);background:linear-gradient(90deg,transparent,rgba(255,226,150,.9) 18%,rgba(255,226,150,.9) 82%,transparent) no-repeat bottom/100% 1px}' +
      '#cine781 .line{margin:8px auto 0;max-width:30ch;font:500 14px/1.4 var(--k-sans,var(--body,system-ui));color:#eaf2ff;text-shadow:0 1px 3px rgba(0,8,24,.9)}' +
      '#cine781 .skip{position:absolute;right:14px;bottom:calc(11vh + 6px);font:600 11px var(--k-sans,var(--body,system-ui));letter-spacing:.12em;color:rgba(255,255,255,.55);opacity:0;transition:opacity .4s}#cine781 .skip.on{opacity:1}' +
      '#name781{position:fixed;left:18px;top:calc(env(safe-area-inset-top,0px) + 27%);z-index:41;pointer-events:none;opacity:0;transform:translateX(-16px);transition:opacity .8s ease,transform 1.1s cubic-bezier(.2,.7,.2,1)}' +
      '#name781.on{opacity:1;transform:none}#name781 i{display:block;font:italic 500 13px/1.3 Georgia,serif;color:#f3e6c4;text-shadow:0 1px 3px rgba(0,8,24,.9)}' +
      '#name781 b{display:block;font:500 30px/1.1 Georgia,"Times New Roman",serif;color:#fff8e6;letter-spacing:.03em;text-shadow:0 2px 10px rgba(0,10,30,.8);padding-bottom:4px;background:linear-gradient(90deg,rgba(255,226,150,.9),rgba(255,226,150,.9) 70%,transparent) no-repeat bottom/100% 1px}';
    document.head.appendChild(s);
  }
  function create(o) {
    var THREE = o.THREE, camera = o.camera, scene = o.scene;
    css();
    var root = document.createElement('div'); root.id = 'cine781'; root.setAttribute('aria-hidden', 'true');
    var fadeEl = document.createElement('div'); fadeEl.style.cssText = 'position:absolute;inset:0;background:#05060c;opacity:0;pointer-events:none'; root.appendChild(fadeEl);   /* the dark between two places (the sleep fade's colour) */
    var card = document.createElement('div'); card.className = 'card'; var cOver = document.createElement('div'); cOver.className = 'over'; var cName = document.createElement('div'); cName.className = 'name'; var cLine = document.createElement('div'); cLine.className = 'line';
    card.appendChild(cOver); card.appendChild(cName); card.appendChild(cLine); root.appendChild(card);
    var skipEl = document.createElement('div'); skipEl.className = 'skip'; skipEl.textContent = 'TAP TO GO ON'; root.appendChild(skipEl);
    document.body.appendChild(root);
    var nameEl = document.createElement('div'); nameEl.id = 'name781'; nameEl.setAttribute('aria-live', 'polite'); document.body.appendChild(nameEl);
    var C = { on: null, t: 0, plays: 0, skips: 0, ends: 0, cam: false, p0: new THREE.Vector3(), q0: new THREE.Quaternion(), f0: 50, P: new THREE.Vector3(), L: new THREE.Vector3(), U: new THREE.Vector3(0, 1, 0), M: new THREE.Matrix4(), Q: new THREE.Quaternion(), tapped: false };
    root.addEventListener('pointerdown', function (e) { e.stopPropagation(); e.preventDefault(); if (C.on && C.t >= (C.on.skip != null ? C.on.skip : 1.5)) { C.tapped = true; } }, true);
    function showCard(over, name, line) { cOver.textContent = over || ''; cName.textContent = name || ''; cLine.textContent = line || ''; card.classList.remove('on'); void card.offsetWidth; card.classList.add('on'); }
    function play(sc) {
      try { if (o.classic && o.classic()) return false; if (C.on) end('replaced'); } catch (e) { return false; }
      C.on = sc; C.t = 0; C.tapped = false; C.wasTap = false; C.plays++; API.last = sc.name || 'scene';
      root.classList.add('on'); if (sc.bars !== false) root.classList.add('bars'); nameEl.classList.remove('on');   /* a name card never sits under a scene's card */ document.documentElement.classList.add('cine781'); skipEl.classList.remove('on');
      try { if (sc.start) sc.start(); } catch (e) { API.error = 'start: ' + (e && e.message); }
      return true;
    }
    function end(how) {
      var sc = C.on; if (!sc) return; C.on = null; C.ends++; if (how === 'tap') C.skips++;
      root.classList.remove('on', 'bars'); document.documentElement.classList.remove('cine781'); card.classList.remove('on'); skipEl.classList.remove('on'); fadeEl.style.opacity = '0';
      try { if (sc.end) sc.end(how); } catch (e) { API.error = 'end: ' + (e && e.message); }
    }
    function tick(real) {   /* real seconds, once a frame, before the game's own rules */
      var sc = C.on; if (!sc) return; C.t += real;
      if (sc.skip !== false && C.t >= (sc.skip != null ? sc.skip : 1.5)) skipEl.classList.add('on');
      try { if (sc.tick) sc.tick(C.t, real); } catch (e) { API.error = 'tick: ' + (e && e.message); }
      if (C.tapped && C.t < sc.dur - T_OUT) { C.tapped = false; C.wasTap = true; C.t = Math.max(C.t, sc.dur - T_OUT); root.classList.remove('bars'); card.classList.remove('on'); skipEl.classList.remove('on'); }   /* a tap: straight to the blend back */
      if (C.t >= sc.dur - T_OUT && root.classList.contains('bars')) { root.classList.remove('bars'); card.classList.remove('on'); skipEl.classList.remove('on'); }
      if (C.t >= sc.dur) end(C.wasTap ? 'tap' : 'done');
    }
    function pre() {   /* just before the picture: the scene's camera laid over the game's (blended from it and back to it), the scene's pose */
      var sc = C.on; if (!sc) return;
      try { if (sc.pose) sc.pose(true, C.t); } catch (e) { API.error = 'pose: ' + (e && e.message); }
      if (!sc.shot) return;
      C.p0.copy(camera.position); C.q0.copy(camera.quaternion); C.f0 = camera.fov; C.cam = true;
      var u = sc.dur > 0 ? Math.min(1, C.t / sc.dur) : 1, f = sc.shot(C.t, u, C.P, C.L, C.U); C.M.lookAt(C.P, C.L, C.U); C.Q.setFromRotationMatrix(C.M);
      var w = sm(C.t / T_IN) * sm((sc.dur - C.t) / T_OUT); if (sc.cut) w = C.t < sc.dur - T_OUT ? 1 : sm((sc.dur - C.t) / T_OUT);
      camera.position.lerp(C.P, w); camera.quaternion.slerp(C.Q, w); camera.fov = C.f0 + ((f || C.f0) - C.f0) * w; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    }
    function post() {   /* just after it: the game's own camera and pose, as they were */
      var sc = C.on;
      if (C.cam) { camera.position.copy(C.p0); camera.quaternion.copy(C.q0); camera.fov = C.f0; camera.updateProjectionMatrix(); camera.updateMatrixWorld(); C.cam = false; }
      if (sc) try { if (sc.pose) sc.pose(false, C.t); } catch (e) { API.error = 'pose: ' + (e && e.message); }
    }
    /* THE GLOW behind a find: one soft sprite, painted once (a radial gradient), additive */
    var glow = (function () { var cv = document.createElement('canvas'); cv.width = cv.height = 64; var g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,248,214,1)'); gr.addColorStop(0.25, 'rgba(255,224,140,.75)'); gr.addColorStop(0.6, 'rgba(255,190,90,.22)'); gr.addColorStop(1, 'rgba(255,170,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      var tx = new THREE.CanvasTexture(cv), m = new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0 }), s = new THREE.Sprite(m); s.visible = false; s.renderOrder = 998; scene.add(s); return s; })();
    var V = new THREE.Vector3(), V2 = new THREE.Vector3(), HI = {};
    function hiSprite(ch, size) {   /* the find, painted at 256 px once per emoji (the game's shared 64 px emoji showed its pixels this close) */
      var tx = HI[ch]; if (!tx) { var cv = document.createElement('canvas'); cv.width = cv.height = 256; var g = cv.getContext('2d'); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '200px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.fillText(ch, 128, 140); tx = HI[ch] = new THREE.CanvasTexture(cv); }
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false })); sp.scale.setScalar(size); return sp; }
    /* THE FIND HELD UP (the original game's grammar: the world holds still while the find is shown; the newer one's look: low, close, lit, slower) */
    function itemGet(a) {
      var G = o.get(), bird = G.bird, rig = G.rig; if (!bird) return false;
      var bx = new THREE.Box3().setFromObject(bird).getSize(new THREE.Vector3()), s = Math.max(0.6, Math.min(3, Math.max(bx.x, bx.y, bx.z) / 1.6)), B = new THREE.Vector3().copy(G.pos || bird.position), yaw = G.yaw || 0, side = a.side || 1;
      if (!a.side && o.sunDir) { var sd = o.sunDir(), sc = function (sg) { var an = yaw + sg * 0.62; return -(Math.sin(an) * sd.x + Math.cos(an) * sd.z); }; side = sc(1) <= sc(-1) ? 1 : -1; }   /* the camera looks away from the sun (its glare washed the first take): the side whose view points least at it */
      var tight = !!a.tight, dist = (tight ? 3.4 : 5.6) * s, item = null, sv = [0, 0, 0, 0, 0, 0], hid = [], burstDone = false, played = false;
      var head = B.clone().add(V.set(0, 1.25 * s, 0)), beak = B.clone().add(V.set(Math.sin(yaw) * 0.3 * s, 0.3 * s, Math.cos(yaw) * 0.3 * s));
      return play({ name: 'itemGet', dur: a.dur || 3.6, skip: 1.5, freeze: true,
        start: function () {
          item = hiSprite(a.emoji || '✨', 0.5 * s); item.position.copy(beak); item.renderOrder = 999; if (item.material) { item.material.depthTest = false; } scene.add(item);
          glow.visible = true; glow.position.copy(beak); glow.scale.setScalar(0.01);
          (a.hide || []).forEach(function (x) { if (x && x.visible) { x.visible = false; hid.push(x); } });
        },
        tick: function (t) {
          var k = sm((t - 0.15) / 0.85), e = 1 - Math.pow(1 - Math.min(1, Math.max(0, (t - 0.15) / 0.85)), 3);
          if (item) { item.position.copy(beak).lerp(head, e); item.position.y += 0.05 * s * Math.sin(t * 3); var pz = 1 + 0.12 * Math.max(0, Math.sin((t - 1) * 5)) * Math.exp(-Math.max(0, t - 1) * 2); item.scale.setScalar(0.5 * s * (0.5 + 0.5 * k) * pz); }
          glow.position.copy(item ? item.position : head); glow.material.opacity = 0.55 * k * sm((a.dur || 3.6) - 0.4 - t); glow.scale.setScalar((0.95 + 0.1 * Math.sin(t * 4)) * s * k);
          if (!played && t >= 0.3) { played = true; try { if (o.sound) o.sound(a.tune || 'get'); } catch (e) { /* a scene plays without its tune */ } }
          if (!burstDone && t >= 1.0) { burstDone = true; try { if (o.burst) o.burst(item ? item.position.clone() : head.clone(), s); } catch (e) { /* fine */ } showCard(a.over || 'You found', String(a.name || '').replace(/^./, function (c) { return c.toUpperCase(); }), a.line || ''); }
        },
        shot: function (t, u, P, L) {   /* low, three-quarters to her front, pushing in; the look between her and the find */
          var push = sm(u);
          if (a.back) { var ab = yaw + Math.PI + side * 0.75, db = dist * (1.05 - 0.2 * push); P.set(B.x + Math.sin(ab) * db, B.y + 0.9 * s, B.z + Math.cos(ab) * db); L.copy(B).lerp(head, 0.6); return 44; }   /* from behind her shoulder: what she faces stays in the picture (the Market's stall) */
          if (a.from) { P.copy(a.from).lerp(B, 0.28 + 0.14 * push); P.y = Math.max(B.y + 0.6 * s, P.y - 0.4 * push); L.copy(B).lerp(head, 0.5); return 50; }   /* indoors: the room's own corner camera, pushed toward her (never through a wall) */
          var d = dist * (1.08 - 0.22 * push), ang = yaw + side * (tight ? 0.5 : 0.62) - side * 0.1 * push;
          P.set(B.x + Math.sin(ang) * d, B.y + (tight ? 0.7 : 0.45) * s, B.z + Math.cos(ang) * d); if (o.floor) P.y = Math.max(P.y, o.floor(P.x, P.z) + 0.35);
          L.copy(B).lerp(head, 0.5); return tight ? 50 : 40;
        },
        pose: function (on, t) {   /* her wings open over the find (wingL +z is up; y is the fold), the head lifted */
          var wl = G.wingL, wr = G.wingR, h = rig && rig.head, k = sm((t - 0.1) / 0.5) * sm(((a.dur || 3.6) - 0.35 - t) / 0.35);
          if (on) { if (wl) { sv[0] = wl.rotation.y; sv[1] = wl.rotation.z; wl.rotation.y *= 1 - 0.85 * k; wl.rotation.z += (0.95 + 0.06 * Math.sin(t * 9)) * k; }
            if (wr) { sv[2] = wr.rotation.y; sv[3] = wr.rotation.z; wr.rotation.y *= 1 - 0.85 * k; wr.rotation.z -= (0.95 + 0.06 * Math.sin(t * 9)) * k; }
            if (h) { sv[4] = h.rotation.x; h.rotation.x -= 0.35 * k; } }
          else { if (wl) { wl.rotation.y = sv[0]; wl.rotation.z = sv[1]; } if (wr) { wr.rotation.y = sv[2]; wr.rotation.z = sv[3]; } if (h) h.rotation.x = sv[4]; }
        },
        end: function (how) { if (item) { scene.remove(item); if (item.material && item.material.dispose) item.material.dispose(); item = null; } glow.visible = false; glow.material.opacity = 0; hid.forEach(function (x) { x.visible = true; }); if (a.done) try { a.done(how); } catch (e) { /* fine */ } }
      });
    }
    var nameT = 0;
    function nameCard(name, role, ms) {
      if (o.classic && o.classic()) return false;
      nameEl.innerHTML = ''; var i = document.createElement('i'); i.textContent = role || ''; var b = document.createElement('b'); b.textContent = name || ''; nameEl.appendChild(i); nameEl.appendChild(b);
      nameEl.classList.remove('on'); void nameEl.offsetWidth; nameEl.classList.add('on'); API.lastName = { name: name, role: role };
      clearTimeout(nameT); nameT = setTimeout(function () { nameEl.classList.remove('on'); }, ms || 3800); return true;
    }
    function arrival(a) {   /* an establishing shot, the bars, then the place's name (title39) once the camera has found her */
      var said = false;
      return play({ name: 'arrival', dur: a.dur || 4.2, skip: a.skip != null ? a.skip : 1.5, freeze: a.freeze !== false, cut: !!a.cut, shot: a.shot,
        start: a.start, pose: a.pose,
        tick: function (t, real) { if (!said && t >= (a.cardAt != null ? a.cardAt : 0.8)) { said = true; try { if (o.title) o.title(a.over, a.name, a.under, a.kind || 'found'); } catch (e) { /* fine */ } } if (a.tick) a.tick(t, real); },
        end: a.end });
    }
    function fade(v) { fadeEl.style.opacity = String(Math.max(0, Math.min(1, v))); C.fadeV = v; }
    var inst = { play: play, end: end, tick: tick, pre: pre, post: post, itemGet: itemGet, nameCard: nameCard, arrival: arrival, card: showCard, fade: fade, current: function () { return C.on; },
      on: function () { return !!C.on; }, frozen: function () { return !!(C.on && C.on.freeze); }, t: function () { return C.t; },
      peek: function () { return { on: C.on ? C.on.name : null, t: +C.t.toFixed(2), plays: C.plays, skips: C.skips, ends: C.ends, bars: root.classList.contains('bars'), fade: +(+fadeEl.style.opacity || 0).toFixed(2), card: card.classList.contains('on') ? { over: cOver.textContent, name: cName.textContent, line: cLine.textContent } : null, nameCard: nameEl.classList.contains('on') ? nameEl.textContent : null, glow: glow.visible, error: API.error, last: API.last }; } };
    return inst;
  }
  API.create = create;
  return API;
})();
