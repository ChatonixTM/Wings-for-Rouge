/* ═══════════════════════════════════════════════════════════════════════════
   WFR_SKY — the ending of "Wings for Rouge" (boards 544 + the 546 temple placeholder), Oct 9 2026.

   Marth's design: the STORY file beside this one (STORY_SKYPIEA_*_2026-10-09.md: his words verbatim, and his answers ~16:20 / ~16:30).
   Itachi's brief: BRIEF_544_546_SKYPIEA_2026-10-09.md. This is a reunion with Rouge's real late grandmother.
   Every line she speaks is in ONE table (LINES, below). His lines carry "HIS"; every line we wrote carries
   "OURS (closing, allowed by Marth ~16:20)" so he can review them. No Scripture anywhere in this scene: his
   "God is at the base of your struggles" and "Good Hands" are HIS words, plain lines, never dressed as a verse.
   Her name never appears on screen: the speaker label is the one constant GRANDMA.

   THE SEQUENCE (his beats 1-11)
     gate    after the Eagle, at DAWN (clock < 150), never once the ending was seen in this save: silvery baby-blue
             diamonds hang in a rising spiral above the highest peak. Flying into the first one starts the climb.
     climb   a camera-locked spiral ride through the diamonds (holding Flap climbs faster); the last becomes an
             updraft that carries her up through the cloud ceiling to a shelf of cloud at y 230.
     shelf   Grandma on the rise: hi, proud, the duet (call and response), the question (Yes / Not yet, Rouge's
             own tap), her reply (Yes: the pans to the Falcon and the Owl, then to HIM, the starter she did not
             choose, then back), the flowers, the closing, a silent linger.
     fade    `sky.seen` is saved FIRST; then the shelf, the robed figures and Grandma fade away upwards.
     freeze  the screen force-freezes; the narrator's message; Rouge gracefully falls.
     V       the pan to the other starter flying behind the Eagle, Owl and Crow beside him, the Peregrine across,
             an OPEN spot across from him behind the Eagle; they call for her.
     dark    fade to dark; MISSION COMPLETE. and two slow dots, with an original sting (WFR_MUSIC.cue('mission')).
             `sky.ended` is saved when the third dot lands.
     wake    she wakes in her nest at dawn; Skypiea is gone for this save and a floating temple placeholder (546)
             stands where it was; its unlock shows as coming soon.
   A reload with seen && !ended resumes at the freeze and never replays her. A new save file reaches it again.

   API
     WFR_SKY.create(THREE, scene, api) → { tick(dt), state(), open(), beat(name), census() }
       api = { S, camera, renderer, canvas, BIRDS, kind(), bird(), wings(), peak:{x,y,z}, perchAt(), standOf(k),
               say(lines, done), toast(t, ms), hint(t), save(), tone(f, t0, dur, type, vol), audio(), music(v),
               flapBtn, stick, $ }
   iPhone 13 budget: ≤ 60 meshes in any phase (counted by census()), no lights, no shadow casters (nothing here
   ever sets castShadow), InstancedMesh for the cloud shelf, the diamonds and the figures; the distant birds are
   each baked into three meshes (body + two wings).
   ═══════════════════════════════════════════════════════════════════════════ */
window.WFR_SKY = (function () {
  'use strict';

  /* ---------- THE LINE TABLE: every word of this scene, and nothing elsewhere ---------- */
  var GRANDMA = 'Grandma';   // the speaker label. Marth (~16:30) offered her name or "Grandma" (his spelling of the name is unconfirmed): this one line changes it
  var DEPART = 'Madame Shirley';   // Marth, Oct 10 ~03:20: her label starts as Grandma and becomes this as she departs ('madame or madamme (whichever one is more appropriate, she was Irish and I believe was married at some point)'): Madame
  var LINES = {
    arrive:  ['', 'Above the clouds, everything is quiet and bright. Someone is waiting for you on the rise.'],   // OURS (closing, allowed by Marth ~16:20)
    hi:      [GRANDMA, 'Hi, {name}.'],   // OURS (closing, allowed by Marth ~16:20) - his reported speech: "says hi"
    proud:   [GRANDMA, 'Look at you. I\'m so proud of how far you came.'],   // OURS (closing, allowed by Marth ~16:20) - his reported speech: "says shes proud of how far you came"
    duetIn:  ['', 'She tilts her head and waits for you to sing.'],   // OURS (closing, allowed by Marth ~16:20)
    duetOut: ['', 'For a while, the two of you just sing together.'],   // OURS (closing, allowed by Marth ~16:20)
    ask:     [GRANDMA, 'Tell me, have you found a mate yet? Have you had chicks?'],   // OURS (closing, allowed by Marth ~16:20) - his reported speech: "asks if youve found a mate, and had chicks yet"
    yes:     [GRANDMA, 'Oh? Oh, why yes, I do think I remember a young fellow whomst shares your love. Yes. Remember your family as well, for they love you dearly... some show it in other ways than some..'],   // HIS (answer 1, typing fixed per answer 2)
    notYet:  [GRANDMA, 'Don\'t worry, for things of that nature need to be settled correctly, and make sure God is at the base of your struggles.'],   // HIS (typing fixed per answer 2)
    okay:    [GRANDMA, 'You\'ll be okay, {name}.'],   // OURS (closing, allowed by Marth ~16:20) - his reported speech: "and she'll be okay"
    flowers: [GRANDMA, 'I miss my 4 beautiful flowers, and all their seed they left behind. But it\'s alright. They\'re in Good Hands.'],   // HIS (typing fixed per answer 2; "Good Hands" capitalised as he typed it)
    close1:  [DEPART, 'Keep flying, little one. And keep singing.'],   // OURS (closing, allowed by Marth ~16:20)
    close2:  [DEPART, 'I love you, {name}.'],   // OURS (closing, allowed by Marth ~16:20) - he wrote "you can say I love you Rouge if you want"
  };
  var FREEZE = 'It looks like the reunion with your loved caretaker was finished. It appears some things aren\'t meant for right now... With that, {name} gracefully falls down.';   // HIS (typing fixed per answer 2)
  var CARD = 'MISSION COMPLETE.';   // HIS; then two more dots, slowly (his "two more dots slowly appear")
  var UI = {
    yes: 'Yes', notYet: 'Not yet',   // the two answers (Marth's decision via Su: Rouge's own tap)
    sing: 'Sing ♪',             // the game's own Sing label
    ok: 'OK', wake: 'Continue',      // OURS (closing, allowed by Marth ~16:20)
    rew: 'Rewind', pause: 'Pause', play: 'Play', ff: 'Fast forward',   // the credits' controls (596, Marth ~22:00: "a proper fastforward icon ... and a reverse button")
    done: 'Done',                    // the end of the credits: she wakes in her nest (596)
    glint: 'Something glints above the highest peak…',   // OURS (closing, allowed by Marth ~16:20)
    tonight: 'Something stirs above the peak. At dawn, the sky will call.',   // 627: the evening before (OURS)
    calling: 'The sky is calling. Fly to the gems above the peak.',   // 627: at dawn, once the gems are out (OURS)
    climb: 'Hold Flap to climb faster.',   // OURS (closing, allowed by Marth ~16:20)
    lift: 'The wind carries you up, up through the clouds…',   // OURS (closing, allowed by Marth ~16:20)
    woke: 'You wake up in your nest. The sun is just coming up.',   // OURS (closing, allowed by Marth ~16:20)
    gateAsk: 'Enter the sky island?',   // 610 (Marth: the game asks you if you want to 'enter the sky island'); OURS
    gateYes: 'Yes', gateNo: 'Not now',   // 610, OURS
    gateCrow: 'The Crow can\'t fly this high yet. The Falcon could teach it.',
    gateRain: 'Heavy rain clouds hide the sky island today. Come back when the sky clears.',   // 632 U2 (Marth, Oct 15: "When it rains it blocks the temple. Or the sky area due to its clouds"); DRAFT   // 610 (Marth: "all but crow, needs to learn from falcon"); OURS
    gateIn: 'The sky island. A bare stone for now; more is coming.',   // 610, OURS (what stands up here is 625/621)
    gateEdge: 'The edge. Fly to leave the sky island.',   // 610, OURS
    gateHome: 'Back over the island.',   // 610, OURS
  };

  /* ---------- THE END CREDITS (Marth ~17:40: "you can do an end credits scene"). One table; every row a DRAFT for him.
     Each row: [kind, text, who]. kind: 'title' (large), 'line', 'head' (a small heading), 'quote' (text, then "— who"), 'gap' (space),
     'birds' (the six silhouettes). {name} = the game's name. Every quote is a real recorded line; its source is beside it (file:line, the
     files in C:/Chatonix/Chatonix-workshop). Marth's are typo-fixed per his ruling ("fix my clear errors in typing"), his voice kept. ---------- */
  var CREDITS = [
    ['title', 'Wings for {name}'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts")
    ['line', 'Made by Marth, for {name}'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts")
    ['line', 'Happy birthday, {name} \u2014 October 10, 2026'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts")
    ['gap', ''],
    ['line', 'Story, design and every idea: Marth'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts")
    ['line', 'Built with Susano\'o and the crew'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts")
    ['gap', ''],
    ['line', 'In loving memory of ' + GRANDMA],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts") (the label constant, never her name)
    ['gap', ''],
    ['line', 'Island song: original, composed for this game'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts")
    ['line', 'Happy Birthday to You (the melody): public domain'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts") (song() in the html plays its first two lines)
    ['line', 'three.js (MIT License)'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts") (r128, cdnjs: the only third-party code the game loads)
    ['line', 'Fredoka and Nunito typefaces, via Google Fonts (SIL Open Font License)'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts") (the only third-party files besides three.js)
    ['line', 'Orchestral samples: VSCO 2 Community Edition by Versilian Studios (CC0)'],   // 547/548 NEW, not yet approved by Marth: VSCO 2 CE's Readme.txt asks for credit to Versilian Studios / Sam Gossner (LICENSE CC0 1.0 Universal); the samples ship in orch-samples.js
    ['gap', ''],
    ['head', 'In their own words'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts") (Marth ~17:45: "add any and all words i said and what you and the crew said too")
    ['quote', 'A buncha different birds, namely an eagle. She said it was the best but had weird legs.', 'Marth'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts") - SUSANOO_ORDER_BOARD.md:534 (board 517)
    ['quote', 'Make the chicks like Chao in Sonic Adventure 2 Battle.', 'Marth'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts") - SUSANOO_ORDER_BOARD.md:538 (board 521)
    ['quote', 'The camera is phenomenal tho... I want the gameplay to feel nostalgic but polished.', 'Marth'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts") - SUSANOO_ORDER_BOARD.md:548 (board 531)
    ['quote', 'When you reach a certain point the bird should flap its wings and dismount from the sky.', 'Marth'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts") - SUSANOO_ORDER_BOARD.md:552 (board 535)
    ['quote', 'I love the texture pack and the shadows. But I know we can do even better.', 'Marth'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts") - SUSANOO_ORDER_BOARD.md:558 (board 541)
    ['quote', 'Hm, the music is better than I expected, good work, I enjoy it.', 'Marth'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts") - gifts/rouge-birthday-2026/BRIEF_547_548_OWL_DOVE_MUSIC_2026-10-09.md:5
    ['quote', 'Good stuff with the chick creation.', 'Marth'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts") - SUSANOO_ORDER_BOARD.md:567 (board 550)
    ['quote', 'The game was made into a home-screen app that keeps her game when she leaves.', 'Hinata'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts") - gifts/rouge-birthday-2026/DIARY_2026-10-09.md:22 (Hinata's diary, 09:53 entry)
    /* 630: the 'I will.' quote was dropped (Marth: "so random") */   // APPROVED by Marth (Oct 10 ~00:15, "credits texts") - gifts/rouge-birthday-2026/DIARY_2026-10-09.md:220 (her answer to "have hinata keep logging this... keeep it up")
    ['quote', 'The nest quest can\'t be lost.', 'Stark'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts") - gifts/rouge-birthday-2026/ASSAY_2026-10-09/02-stark-softlocks.md:19 (Stark's assay, "What works")
    ['quote', 'An original phone flight game: one island, a nest and an egg.', 'Fern'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts") - gifts/rouge-birthday-2026/ASSAY_2026-10-09/01-fern-orders.md:14 (Fern's assay, board 517)
    ['quote', 'A phone game is tested by a thumb.', 'Susano\'o'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts") - THE_CREW.md:1079 ("a phone game is tested by a thumb", capital A ours)
    ['gap', ''],
    ['line', 'Hinata and Fern were modelled after {name}.'],   // 630: Fern, not Stark (Marth ~23:00: "FERN and Hinata were modelled after rouge not stark")   // APPROVED by Marth (Oct 10 ~00:15, "credits texts") (Marth ~17:47: "no i meant hinata and stark were modelled after rouge hahahah")
    ['gap', ''],
    ['birds', ''],
    ['title', 'Thank you for playing.'],   // APPROVED by Marth (Oct 10 ~00:15, "credits texts")
  ];

  /* ---------- numbers (design, not measurement) ---------- */
  var DAWN_END = 270;        // 627 (Marth, Oct 15): the sky calls for one real minute of a ten-minute day (was 150, the sky's colour dawn: ~33 s)
  var N_DIA = 12, HELIX_R = 13, HELIX_TURNS = 2.25, HELIX_TOP = 150;   // the last diamond sits under the ceiling (166)
  var SHELF_Y = 230, TEMPLE_Y = 216;
  var WALL_Y = 150, WALL_R = 40, DISC_R = 15, DISC_TOP = TEMPLE_Y + 0.6, SKY_CAP = TEMPLE_Y + 40;   // 610: the wall under the temple; the disc is ground; the air above it is thin
  var ENTER_S = 4.2, SETTLE_S = 1.6, TURN_S = 2.2, TURN_DROP = 22, TURN_BACK = 14;   // 610: the yes ride, the set-down, the no turn (seconds, metres)
  var RIDE = 0.05, RIDE_HELD = 0.085;   // helix fraction per second: ~20 s, ~12 s holding Flap
  var LIFT_S = 5.5, GLIDE_S = 2.2, LINGER_S = 7, FADE_S = 6, FALL_S = 3, PAN_S = 4, V_S = 6.6, DARK_S = 2;
  var DOT2 = 1.2, DOT3 = 2.4, WAKE_BTN = 3.9, WAKE_S = 1.4, TYPE_CPS = 28;
  var CREDITS_S = 52, CREDITS_SCROLL = 44, CREDITS_OUT = 1.6, CR_FAST = 3;   // ~44 s of scroll, a hold on the last line, a fade; the controls run x3 forward or back (596)   // ~44 s of scroll, a hold on the last line, a fade; a tap in the first 0.8 s never skips

  var CSS = '#skyWhite{position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:4}' +
    '#skyFreeze{position:fixed;inset:0;z-index:28;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at center,rgba(5,8,18,.55) 0%,rgba(5,8,18,.9) 75%);touch-action:none}' +
    '#skyFreeze .msg{max-width:30ch;font-family:Georgia,"Times New Roman",serif;font-size:20px;line-height:1.55;color:#f6ecd6;text-align:center;display:grid;gap:18px;justify-items:center}' +
    '#skyFreeze button,#skyDark button{min-height:44px;min-width:96px;border-radius:999px;background:#f6ecd6;color:#1c2234;font-size:16px;font-weight:600;padding:0 22px}' +
    '#skyDark{position:fixed;inset:0;z-index:30;background:#05070d;opacity:0;display:grid;place-items:center;pointer-events:none;touch-action:none}' +
    '#skyDark .card{display:grid;gap:26px;justify-items:center}' +
    '#skyCardText{font-family:var(--display,system-ui);font-weight:700;font-size:clamp(28px,8vw,52px);letter-spacing:.08em;color:#fff8ec;white-space:nowrap;text-shadow:0 0 24px rgba(160,210,255,.45)}' +
    '.skyChoice{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 24px);width:min(520px,calc(100% - 32px));display:flex;gap:12px;justify-content:center;z-index:5;pointer-events:auto}' +
    '.skyChoice button{flex:1;min-height:52px;border-radius:999px;font-size:18px;font-weight:600;background:var(--rouge,#c8314a);color:#fff;box-shadow:0 8px 20px rgba(34,49,74,.28)}' +
    '.skyChoice button.alt{background:var(--paper,#fff8ec);color:var(--ink,#22314a)}' +
    '#skyGate{flex-wrap:wrap}#skyGate p{flex:1 0 100%;margin:0 0 2px;text-align:center;font-family:Georgia,"Times New Roman",serif;font-size:19px;color:#fff8ec;text-shadow:0 1px 8px rgba(0,0,0,.55)}' +
    '#skySing{bottom:calc(env(safe-area-inset-bottom,0px) + 114px);background:#fff3f2;color:var(--rouge,#c8314a);min-height:52px}' +
    '#skyCredits{position:fixed;inset:0;z-index:31;overflow:hidden;background:#05070d;touch-action:none;-webkit-user-select:none;user-select:none}' +
    '#skyCredits .dawn{position:absolute;inset:0;opacity:0;background:linear-gradient(to top,#f2b48a 0%,#c98a9a 22%,#5a5f8f 55%,#141a33 100%)}' +
    '#skyCredits .roll{position:absolute;left:0;right:0;top:0;display:grid;justify-items:center;gap:14px;padding:0 24px;will-change:transform;font-family:Georgia,"Times New Roman",serif;color:#f6ecd6;text-align:center}' +
    '#skyCredits .roll p{margin:0;font-size:18px;line-height:1.5;max-width:30ch}' +
    '#skyCredits .roll h2{margin:0;font-weight:400;font-size:clamp(26px,7vw,40px);letter-spacing:.04em;max-width:16ch}' +
    '#skyCredits .roll p.q small{display:block;margin-top:2px;font-size:14px;opacity:.75;font-style:italic}#skyCredits .roll p.head{font-size:13px;letter-spacing:.2em;text-transform:uppercase;opacity:.7}' +
    '#skyCredits .roll .gap{height:28px}#skyCredits .roll svg{width:min(340px,86vw);height:auto}' +
    '#skyCredits .drift{position:absolute;left:0;top:0;width:34px;height:20px;will-change:transform}' +
    '.skyCtl{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 18px);transform:translateX(-50%);display:flex;gap:14px;align-items:center;z-index:2}' +
    '.skyCtl button{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:rgba(10,12,24,.72);border:1px solid rgba(246,236,214,.35);color:#f6ecd6;padding:0;touch-action:none}' +
    '.skyCtl button svg{width:24px;height:24px;fill:currentColor}.skyCtl button.on{background:#f6ecd6;color:#1c2234}' +
    '#skyDone{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 86px);transform:translateX(-50%);min-height:48px;min-width:120px;border-radius:999px;background:#f6ecd6;color:#1c2234;font-size:17px;font-weight:600;z-index:2;box-shadow:0 6px 18px rgba(0,0,0,.35)}';

  function create(THREE, scene, api) {
    var S = api.S, $ = api.$, camera = api.camera;
    if (!S.sky || typeof S.sky !== 'object') S.sky = { seen: false, ended: false };
    var lin = !!(api.renderer && api.renderer.outputEncoding === THREE.sRGBEncoding);
    var col = function (hex) { var c = new THREE.Color(hex); return lin ? c.convertSRGBToLinear() : c; };
    var name = function (s) { return s.replace(/\{name\}/g, api.NAME || 'Rouge'); };
    var start = function () { var k = api.kind(); return api.BIRDS[k] && api.BIRDS[k].sings ? k : 'cardinal'; };   // the bird she began as (the opening's own rule)
    var other = function () { return start() === 'cardinal' ? 'bluejay' : 'cardinal'; };   // HIM: "the beginning bird that wasnt chosen"

    /* ---------- geometry anchors ---------- */
    var PK = api.peak, O = new THREE.Vector3(PK.x, SHELF_Y, PK.z);
    var back = new THREE.Vector3(PK.x, 0, PK.z).normalize();                // outward from the island: open sky behind her
    var side = new THREE.Vector3(back.z, 0, -back.x);
    var FLOOR = SHELF_Y + 0.8, RISE = FLOOR + 1.2;
    var Gpos = O.clone().addScaledVector(back, 7); Gpos.y = RISE;           // Grandma's feet
    var Ppos = O.clone().addScaledVector(back, 4.4); Ppos.y = FLOOR;        // Rouge's feet
    var th0 = Math.atan2(-PK.z, -PK.x), Y0 = PK.y + 30;
    var HIM = new THREE.Vector3(PK.x * 0.55, 128, PK.z * 0.55);                // 593: where HE flies in the Yes pan: over the island, under the cloud layer
    var RIM = O.clone().addScaledVector(back, -27); RIM.y = FLOOR + 1.2;      // the shelf's rim on the island side: where the camera peers down
    var BASE_FOV = camera.fov, GAP_FOV = 12;
    function helix(u, out) { var th = th0 + u * HELIX_TURNS * Math.PI * 2; return (out || new THREE.Vector3()).set(PK.x + Math.cos(th) * HELIX_R, Y0 + u * (HELIX_TOP - Y0), PK.z + Math.sin(th) * HELIX_R); }

    /* ---------- DOM (all made here; every control is a pointerdown, every button at least 44 px) ---------- */
    var style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
    function el(tag, attrs, parent) { var e = document.createElement(tag); for (var k in attrs) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); } (parent || document.body).appendChild(e); return e; }
    var white = el('div', { id: 'skyWhite', 'aria-hidden': 'true' });
    var freeze = el('div', { id: 'skyFreeze', hidden: '' }), msg = el('div', { class: 'msg' }, freeze), msgP = el('p', { id: 'skyFreezeText', style: 'margin:0' }, msg);
    var okBtn = el('button', { type: 'button', id: 'skyOk', text: UI.ok, hidden: '' }, msg);
    var dark = el('div', { id: 'skyDark', 'aria-live': 'polite' }), card = el('div', { class: 'card', hidden: '' }, dark);
    var cardText = el('div', { id: 'skyCardText' }, card), wakeBtn = el('button', { type: 'button', id: 'skyWake', text: UI.wake, hidden: '' }, card);
    var creditsEl = el('div', { id: 'skyCredits', hidden: '', 'aria-label': 'End credits' }), dawnEl = el('div', { class: 'dawn' }, creditsEl), roll = el('div', { class: 'roll', id: 'skyRoll' }, creditsEl);
    var ICON = { rew: '<svg viewBox="0 0 24 24"><path d="M11 6 L2 12 L11 18 Z M21 6 L12 12 L21 18 Z"/></svg>', ff: '<svg viewBox="0 0 24 24"><path d="M3 6 L12 12 L3 18 Z M13 6 L22 12 L13 18 Z"/></svg>',
      pause: '<svg viewBox="0 0 24 24"><path d="M6 5 H10 V19 H6 Z M14 5 H18 V19 H14 Z"/></svg>', play: '<svg viewBox="0 0 24 24"><path d="M7 5 L19 12 L7 19 Z"/></svg>' };
    var ctl = el('div', { class: 'skyCtl', id: 'skyCtl' }, creditsEl);
    var rewBtn = el('button', { type: 'button', id: 'skyRew', 'aria-label': UI.rew }, ctl), playBtn = el('button', { type: 'button', id: 'skyPlay', 'aria-label': UI.pause }, ctl), ffBtn = el('button', { type: 'button', id: 'skyFf', 'aria-label': UI.ff }, ctl);
    rewBtn.innerHTML = ICON.rew; ffBtn.innerHTML = ICON.ff; playBtn.innerHTML = ICON.pause;
    var doneBtn = el('button', { type: 'button', id: 'skyDone', text: UI.done, hidden: '' }, creditsEl), drifters = [];
    var uiLayer = $('ui') || document.body;
    var choice = el('div', { class: 'skyChoice', id: 'skyChoice', hidden: '' }, uiLayer);
    var yesBtn = el('button', { type: 'button', id: 'skyYes', text: UI.yes }, choice), notBtn = el('button', { type: 'button', id: 'skyNotYet', class: 'alt', text: UI.notYet }, choice);
    var singBtn = el('button', { type: 'button', class: 'act', id: 'skySing', text: UI.sing, hidden: '' }, uiLayer);
    var gate = el('div', { class: 'skyChoice', id: 'skyGate', hidden: '' }, uiLayer);   // 610: the wall's ask
    el('p', { id: 'skyGateText', text: UI.gateAsk }, gate);
    var gateYes = el('button', { type: 'button', id: 'skyGateYes', text: UI.gateYes }, gate), gateNo = el('button', { type: 'button', id: 'skyGateNo', class: 'alt', text: UI.gateNo }, gate);
    var tap = function (b, f) { b.addEventListener('pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); f(); }); };

    /* ---------- materials ---------- */
    var cloudMat = new THREE.MeshLambertMaterial({ color: col(0xfbfcff), emissive: col(0x5a5e66), flatShading: true, transparent: true, opacity: 0.97 });   // lit from within a little: cloud, never grey stone
    var robeMat = new THREE.MeshLambertMaterial({ color: col(0xf3f0e8), transparent: true, opacity: 1 });
    var lowMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    function glowTex() { var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
    function sparkTex() {   // an original four-point glint: two thin crossed rays over a soft core
      var c = document.createElement('canvas'); c.width = c.height = 64; var g = c.getContext('2d');
      var r = g.createRadialGradient(32, 32, 0, 32, 32, 14); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.moveTo(32, 2); g.lineTo(34, 32); g.lineTo(32, 62); g.lineTo(30, 32); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(2, 32); g.lineTo(32, 30.5); g.lineTo(62, 32); g.lineTo(32, 33.5); g.closePath(); g.fill(); return new THREE.CanvasTexture(c); }

    /* ---------- the diamonds (ORIGINAL: a tall six-sided crystal, a small flat table on top, a long point below) ---------- */
    function gemGeo() {
      var n = 6, top = 0.42, tableR = 0.24, girR = 0.55, bot = -1.15, pos = [];
      for (var i = 0; i < n; i++) {
        var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
        pos.push(0, top, 0, tableR * c1, top, tableR * s1, tableR * c0, top, tableR * s0);                                   // the table
        pos.push(tableR * c0, top, tableR * s0, tableR * c1, top, tableR * s1, girR * c1, 0, girR * s1);                    // the crown
        pos.push(tableR * c0, top, tableR * s0, girR * c1, 0, girR * s1, girR * c0, 0, girR * s0);
        pos.push(girR * c0, 0, girR * s0, girR * c1, 0, girR * s1, 0, bot, 0);                                               // the pavilion
      }
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g;
    }
    var dia = null;   // { g, mesh, pts, got[], fade }
    var m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), eu = new THREE.Euler();
    function buildDiamonds() {
      if (dia) return;
      var g = new THREE.Group(), mat = new THREE.MeshPhongMaterial({ color: col(0xcfe8ff), specular: 0xffffff, shininess: 90, emissive: col(0x2e5a7e), flatShading: true, transparent: true, opacity: 0 });
      var mesh = new THREE.InstancedMesh(gemGeo(), mat, N_DIA); g.add(mesh);
      var pg = new THREE.BufferGeometry(), pp = new Float32Array(N_DIA * 3), pc = new Float32Array(N_DIA * 3); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
      var pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 3.2, map: sparkTex(), vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      g.add(pts); scene.add(g); dia = { g: g, mesh: mesh, pts: pts, got: [], fade: 0 };
      for (var i = 0; i < N_DIA; i++) dia.got.push(false);
      placeDiamonds(0);
    }
    function placeDiamonds(t) {
      var pp = dia.pts.geometry.attributes.position, pc = dia.pts.geometry.attributes.color;
      for (var i = 0; i < N_DIA; i++) {
        var p = helix(i / (N_DIA - 1), v1); p.y += Math.sin(t * 1.4 + i) * 0.25;
        var s = dia.got[i] ? 0.0001 : 1.35; eu.set(0, t * 0.9 + i * 0.7, 0); q4.setFromEuler(eu); sc.set(s, s, s);
        m4.compose(p, q4, sc); dia.mesh.setMatrixAt(i, m4);
        pp.setXYZ(i, p.x, p.y + 0.55, p.z); var tw = dia.got[i] ? 0 : 0.35 + 0.65 * Math.max(0, Math.sin(t * 3.1 + i * 2.3)); pc.setXYZ(i, tw, tw, tw);
      }
      dia.mesh.instanceMatrix.needsUpdate = true; pp.needsUpdate = true; pc.needsUpdate = true;
    }
    function dropDiamonds() { if (!dia) return; scene.remove(dia.g); dia.mesh.geometry.dispose(); dia.mesh.material.dispose(); dia.pts.geometry.dispose(); dia.pts.material.map.dispose(); dia.pts.material.dispose(); dia = null; }

    /* ---------- a distant bird, baked to three meshes (body + two wing pivots), never the player's rig ---------- */
    function bake(root, skip) {
      root.updateMatrixWorld(true);
      var inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), P = [], Nn = [], C = [], c = new THREE.Color();
      root.traverse(function (m) {
        if (!m.isMesh || !m.visible) return;
        for (var a = m; a && a !== root; a = a.parent) if (skip.indexOf(a) >= 0) return;
        var geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
        if (!geo.attributes.normal) geo.computeVertexNormals();
        geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
        var p = geo.attributes.position, nn = geo.attributes.normal, vc = m.material.vertexColors && geo.attributes.color;
        c.copy(m.material.color || c.setRGB(1, 1, 1));
        for (var i = 0; i < p.count; i++) { P.push(p.getX(i), p.getY(i), p.getZ(i)); Nn.push(nn.getX(i), nn.getY(i), nn.getZ(i)); if (vc) C.push(c.r * vc.getX(i), c.g * vc.getY(i), c.b * vc.getZ(i)); else C.push(c.r, c.g, c.b); }
        geo.dispose();
      });
      var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
      return new THREE.Mesh(g, lowMat);
    }
    function lowBird(k) {
      var r = window.WFR_BIRDS.build(THREE, k, api.BIRDS[k], { renderer: api.renderer, folded: false });
      var out = new THREE.Group(); out.rotation.order = 'YXZ'; out.userData.k = k;
      out.add(bake(r.g, [r.wingL, r.wingR]));
      var wings = [r.wingL, r.wingR].map(function (w) { var p = new THREE.Group(); p.position.copy(w.position); p.rotation.copy(w.rotation); p.add(bake(w, [])); out.add(p); return p; });
      out.userData.wings = wings; out.userData.size = api.BIRDS[k].size;
      r.g.traverse(function (m) { if (m.isMesh) { if (m.material.map) m.material.map = null; m.material.dispose(); } });   // the source rig is thrown away (shared cached geometries stay)
      return out;
    }
    function flap(b, rate, amp, t) { var f = Math.sin(t * rate) * amp; b.userData.wings[0].rotation.set(0, 0, f); b.userData.wings[1].rotation.set(0, 0, -f); }

    /* ---------- Skypiea: the shelf, the figures, the glow, Grandma, and the three birds in the sky ---------- */
    var sky = null;   // { g, shelf, figs, heads, glow, grandma, gWings, gHead, mats[], birds{} }
    var figSpots = [];
    function rr(i, k) { var x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); }   // fixed, so the shelf is the same every time (no rnd(): the html's dice are not ours)
    function buildSky() {
      if (sky) return;
      cloudMat.opacity = 0.97; robeMat.opacity = 1;   // (a rebuild after a fade starts whole again)
      var g = new THREE.Group(); scene.add(g);
      var blobs = [], i;
      for (i = 0; i < 22; i++) { var a = rr(i, 1) * Math.PI * 2, r = Math.sqrt(rr(i, 2)) * 22; blobs.push([O.x + Math.cos(a) * r, SHELF_Y - 1.5, O.z + Math.sin(a) * r, 6 + rr(i, 3) * 4, 2.3 + rr(i, 4) * 0.6]); }
      for (i = 0; i < 3; i++) { var rp = Gpos.clone().addScaledVector(side, (i - 1) * 2.2); blobs.push([rp.x, RISE - 1.4, rp.z, 2.6, 1.6]); }   // the rise
      figSpots.length = 0;
      for (i = 0; i < 10; i++) {   // the robed figures: a far rim 62-74 m beyond her, silent, faceless, never approachable
        var ang = (i / 9 - 0.5) * 1.5, d = 62 + rr(i, 5) * 12, dir = back.clone().multiplyScalar(Math.cos(ang)).addScaledVector(side, Math.sin(ang));
        var fp = Gpos.clone().addScaledVector(dir, d); fp.y = FLOOR - 0.6 + rr(i, 6) * 1.2; figSpots.push(fp);
        blobs.push([fp.x, fp.y - 1.1, fp.z, 3.2, 1.3]);
      }
      var shelf = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), cloudMat, blobs.length);
      blobs.forEach(function (b, j) { eu.set(0, rr(j, 7) * 3, 0); q4.setFromEuler(eu); m4.compose(v1.set(b[0], b[1], b[2]), q4, sc.set(b[3], b[4], b[3] * (0.8 + rr(j, 8) * 0.4))); shelf.setMatrixAt(j, m4); });
      g.add(shelf);
      var figs = new THREE.InstancedMesh(new THREE.ConeGeometry(0.55, 2.0, 7), robeMat, 10), heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.28, 10, 8), robeMat, 10);
      figSpots.forEach(function (fp, j) {
        var toRise = v2.set(Gpos.x - fp.x, 0, Gpos.z - fp.z).normalize(), axis = v3.set(toRise.z, 0, -toRise.x);
        q4.setFromAxisAngle(axis, 0.12);   // slightly bowed toward the rise
        m4.compose(v1.copy(fp).add(new THREE.Vector3(0, 1.0, 0)), q4, sc.set(1, 1, 1)); figs.setMatrixAt(j, m4);
        var hp = new THREE.Vector3(0, 1.0 + 0.32, 0).applyQuaternion(q4).add(v1); m4.compose(hp, q4, sc.set(1, 1, 1)); heads.setMatrixAt(j, m4);
      });
      g.add(figs); g.add(heads);
      var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.position.set(O.x, SHELF_Y - 7, O.z); glow.scale.set(90, 30, 1); g.add(glow);
      /* Grandma: the opening's mother in the colours of the bird Rouge began as, washed with light; folded; no halo; never white */
      var k = start(), r = window.WFR_BIRDS.build(THREE, k, api.BIRDS[k], { renderer: api.renderer, folded: true }), wash = col(0xfff2c0), mats = [];
      r.g.traverse(function (m) {
        if (!m.isMesh) return; var M = m.material; if (mats.indexOf(M) < 0) mats.push(M);
        if (!M.userData.skyWashed && !m.userData.keepColor && M.color) { var lum = M.color.r * 0.3 + M.color.g * 0.59 + M.color.b * 0.11; M.color.lerp(wash, lum < 0.03 ? 0.15 : 0.45); if (M.emissive) M.emissive.copy(M.color).multiplyScalar(0.12); M.userData.skyWashed = true; }
      });
      var gs = api.BIRDS[k].size * 1.15; r.g.scale.setScalar(gs);
      r.g.position.copy(Gpos).add(v1.set(0, (0.58 + api.BIRDS[k].legLen) * gs, 0));
      r.g.rotation.y = Math.atan2(Ppos.x - Gpos.x, Ppos.z - Gpos.z); g.add(r.g);
      mats.push(cloudMat, robeMat, glow.material); mats.forEach(function (M) { M.transparent = true; M.userData.op = M.opacity; });
      sky = { g: g, shelf: shelf, figs: figs, heads: heads, glow: glow, grandma: r.g, gHead: r.head, gk: k, mats: mats, gy: r.g.position.y };
    }
    function dropSky() {
      if (!sky) return; scene.remove(sky.g);   // Grandma's geometries are birds.js's shared caches: never disposed here; her materials are her own
      sky.grandma.traverse(function (o) { if (o.isMesh && o.material) o.material.dispose(); });
      sky.glow.material.map.dispose(); sky.glow.material.dispose();
      sky.shelf.geometry.dispose(); sky.figs.geometry.dispose(); sky.heads.geometry.dispose(); sky = null;
    }
    /* the three birds still in the sky (answer 1), and later the V */
    var flock = null;   // { g, by:{falcon, owl, marth, eagle, crow} }
    function buildFlock(withV) {
      if (!flock) { flock = { g: new THREE.Group(), by: {} }; scene.add(flock.g); }
      var want = withV ? ['falcon', 'owl', 'marth', 'eagle', 'crow'] : ['falcon', 'owl', 'marth'];
      want.forEach(function (id) { if (flock.by[id]) return; var b = lowBird(id === 'marth' ? other() : id); flock.by[id] = b; flock.g.add(b); });
    }
    function dropFlock() { if (!flock) return; scene.remove(flock.g); flock.g.traverse(function (o) { if (o.isMesh) o.geometry.dispose(); }); flock = null; }
    function flockAroundShelf(t) {   // the Peregrine loops, the Owl glides, HE circles beyond her (all in the sky, never on the shelf)
      if (!flock) return; var b, a, c, ps;
      if ((b = flock.by.falcon)) { ps = 1.3 * b.userData.size; b.scale.setScalar(ps); a = t * 0.55; c = O.clone().addScaledVector(side, 19).addScaledVector(back, -2); c.y = FLOOR + 6;
        var tang = v2.set(-Math.sin(a), 0, Math.cos(a)), psi = t * 2.1;
        b.position.set(c.x + Math.cos(a) * 8, c.y, c.z + Math.sin(a) * 8).addScaledVector(up, 3.5 - Math.cos(psi) * 3.5).addScaledVector(tang, Math.sin(psi) * 3.5);   // loop-the-loops (showing off)
        b.rotation.set(-psi, Math.atan2(tang.x, tang.z), 0); flap(b, 20, 0.7, t); }
      if ((b = flock.by.owl)) { ps = 1.3 * b.userData.size; b.scale.setScalar(ps); a = -t * 0.35; c = O.clone().addScaledVector(side, 13).addScaledVector(back, -7); c.y = FLOOR + 4.5;   // the Owl glides near the Peregrine, so one look holds both
        b.position.set(c.x + Math.cos(a) * 4, c.y + Math.sin(t * 1.2) * 0.4, c.z + Math.sin(a) * 4);
        if (st.focus === 'birds') { b.rotation.set(0, Math.atan2(camera.position.x - b.position.x, camera.position.z - b.position.z), Math.sin(t * 3) * 0.12); flap(b, 3, 0.35, t); }   // she turns to the camera, a slow happy waggle ("the owl smiling")
        else { b.rotation.set(0, Math.atan2(Math.sin(a), -Math.cos(a)) + Math.PI, 0.25); flap(b, 4, 0.25, t); } }
      if ((b = flock.by.marth)) {   // 593 (Marth ~22:00: "you put me (the other bird) flying around in heaven. lol nah"): HE is alive - never on or near the
        // shelf. He flies far BELOW, over the island, under the cloud ceiling (y ~128); the camera looks down at him through a gap in the clouds
        ps = 2.4 * b.userData.size; b.scale.setScalar(ps); a = t * 0.5;
        b.position.set(HIM.x + Math.cos(a) * 7, HIM.y + Math.sin(t * 2) * 0.6, HIM.z + Math.sin(a) * 7); b.rotation.set(0, Math.atan2(-Math.sin(a), Math.cos(a)), -0.3); flap(b, 16, 0.8, t); }
    }

    /* ---------- the temple placeholder (546): rock, not cloud; no green gem; its door shut ---------- */
    var temple = null;
    function buildTemple() {
      if (temple) return;
      var g = new THREE.Group(), stone = new THREE.MeshLambertMaterial({ color: col(0xb9b2a4), flatShading: true }), dk = new THREE.MeshLambertMaterial({ color: col(0x6d6458), flatShading: true });
      var rock = new THREE.Mesh(new THREE.ConeGeometry(15, 22, 9), dk); rock.rotation.x = Math.PI; rock.position.y = -11.6; g.add(rock);
      var disc = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 1.2, 18), stone); g.add(disc);
      var pil = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.7, 0.8, 7, 8), stone, 7);
      for (var i = 0; i < 7; i++) { var a = i / 7 * Math.PI * 2; m4.compose(v1.set(Math.cos(a) * 10, 4.1, Math.sin(a) * 10), q4.identity(), sc.set(1, 1, 1)); pil.setMatrixAt(i, m4); }
      g.add(pil);
      var roof = new THREE.Mesh(new THREE.BoxGeometry(13, 0.8, 9), stone); roof.position.set(Math.cos(0.45) * 6.5, 8, Math.sin(0.45) * 6.5); roof.rotation.y = -0.45 - Math.PI / 2; g.add(roof);   // over four of the seven
      var altar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.4), stone); altar.position.y = 1.2; g.add(altar);
      /* 610/625 (Marth: "what door?", "maybe we should not do a door"): no door; the way up is the wall's ask */
      g.position.set(O.x, TEMPLE_Y, O.z); scene.add(g); temple = { g: g, said: false };
    }

    /* ---------- state ---------- */
    var st = { ph: S.sky.ended ? 'done' : 'idle', t: 0, beat: null, focus: 'her', u: 0, hinted: false, resume: !!(S.sky.seen && !S.sky.ended), typed: 0, duet: 0, duetCd: 0, calls: [], lastCard: '', clockAtStart: null, seq: [], clk: 0, speed: 1 };
    var camLook = new THREE.Vector3(), camWant = new THREE.Vector3(), lookWant = new THREE.Vector3(), fallFrom = null, fallCam = null, panFrom = null, panLook = null;
    var V = { C: new THREE.Vector3(), dir: new THREE.Vector3(1, 0, -0.15).normalize(), cam: new THREE.Vector3() };
    if (S.sky.ended) buildTemple();
    function go(ph) { st.ph = ph; st.t = 0; st.seq.push(ph); }
    /* 627 (Marth): the sky opens to the worthy: level 24 or up, OR the bell tower built (BUILDS[5], so built >= 6) and the chick at level 2 in
       any stat (100 points, the html's STAT_STEP 50). Always after the Eagle, at dawn, and never twice. */
    var worthy = function () { var st2 = (S.chick && S.chick.stats) || {}, two = false; for (var k in st2) if ((st2[k] || 0) >= 100) two = true;
      return (S.level || 0) >= 24 || ((S.built || 0) >= 6 && two); };
    var gateOpen = function () { return !S.sky.seen && !!S.eagleFound && worthy() && S.clock < DAWN_END && S.tut === 0 && !S.inEagle && !S.morph; };
    function controls(on) {
      if (api.flapBtn) api.flapBtn.hidden = !on; if (api.stick) api.stick.hidden = !on;
      ['land', 'sing', 'jump', 'flutter', 'thBtn', 'home', 'read'].forEach(function (id) { var e = $(id); if (e && !on) e.hidden = true; });
    }
    function birdPose(x, y, z, yaw, pitch, roll) { var b = api.bird(); if (!b) return; b.position.set(x, y, z); b.rotation.set(pitch || 0, yaw || 0, roll || 0); S.pos.set(x, y, z); S.yaw = yaw || 0; }
    function wingsOpen(f) { var w = api.wings(); if (!w[0]) return; w[0].rotation.set(0, 0, f); w[1].rotation.set(0, 0, -f); }
    function standOnShelf() { var k = api.kind(); birdPose(Ppos.x, FLOOR + api.standOf(k), Ppos.z, Math.atan2(Gpos.x - Ppos.x, Gpos.z - Ppos.z), 0, 0); }
    function talk(lines, done) { var ls = lines.map(function (l) { return l.slice(); }); api.say(ls, done); }
    function call(k, o) { if (window.WFR_SOUND && api.audio()) return window.WFR_SOUND.call(k, o); return false; }

    /* ---------- the beats ---------- */
    function beginClimb() {
      st.clockAtStart = S.clock; S.mode = 'event'; S.inSky = true; S.speed = 0; S.flapT = 0;
      buildSky(); buildDiamonds(); controls(false); if (api.flapBtn) api.flapBtn.hidden = false;   // Flap stays: holding it climbs faster
      st.u = 0; go('climb'); api.hint(UI.climb); collect(0);
    }
    function collect(i) { if (!dia || dia.got[i]) return; dia.got[i] = true; var f = [392, 440, 494, 587, 659, 784, 880, 988, 1175, 1319, 1568, 1760][i] || 1568; api.tone(f, 0, 0.5, 'sine', 0.07); api.tone(f * 2, 0.02, 0.35, 'triangle', 0.02); }
    function arrive() {
      st.focus = 'her'; standOnShelf(); controls(false); buildFlock(false); api.music('legend'); if ($('hint')) $('hint').style.opacity = '0';
      cine668Start(); st.beat = 'reveal'; go('reveal');   // 668: a 2.5 s wide from behind Rouge first; cine668Tick then says LINES.arrive, as it was
    }
    function hi() { st.beat = 'hi'; go('talk'); talk([LINES.hi, LINES.proud], duetIn); }
    function duetIn() { st.beat = 'duet'; go('talk'); talk([LINES.duetIn], function () { st.duet = 0; st.sung = 0; st.duetQ = 0; st.duetCd = 0; go('duet'); singBtn.hidden = false; }); }
    function duetTap() {
      if (st.ph !== 'duet' || st.sung >= 3) return;
      if (st.duetCd > 0) { st.duetQ = Math.min(3 - st.sung, (st.duetQ || 0) + 1); return; }   // a tap while she is still answering is kept, never lost
      st.duetCd = 1.5; st.sung++; var k = api.kind();
      if (!call(k, { vol: 0.7 })) [0, 0.12, 0.24].forEach(function (t, i) { api.tone([784, 880, 1047][i], t, 0.14, 'triangle', 0.07); });
      var n = st.duet; st.calls.push({ at: st.clk + 0.6, fn: function () { if (!call(sky ? sky.gk : start(), { vol: 0.55, distance: 0.15, pan: 0.2, variant: n % 2 })) [0, 0.14, 0.28].forEach(function (t, i) { api.tone([659, 784, 880][i], t, 0.16, 'triangle', 0.06); }); st.hop = 1; st.duet++; } });
    }
    function duetOut() { singBtn.hidden = true; st.beat = 'duetOut'; go('talk'); talk([LINES.duetOut], ask); }
    function ask() { st.beat = 'ask'; go('talk'); talk([LINES.ask], function () { go('ask'); choice.hidden = false; }); }
    function answer(yes) {
      if (st.ph !== 'ask') return; choice.hidden = true; st.answer = yes ? 'yes' : 'notYet';
      if (yes) { st.beat = 'yes'; go('talk'); talk([LINES.yes], function () { buildFlock(false); st.beat = 'pans'; go('pans'); }); }
      else { st.beat = 'notYet'; go('talk'); talk([LINES.notYet, LINES.okay], flowers); }
    }
    function flowers() { st.focus = 'her'; st.beat = 'flowers'; go('talk'); talk([LINES.flowers, LINES.close1, LINES.close2], function () { st.beat = 'linger'; go('linger'); }); }
    function fadeAway() {
      S.sky.seen = true; api.save();   // BEFORE the fade: a reload from here on never replays her (brief section 4)
      st.beat = 'fade'; go('fade'); api.music(null); cine668End(); if (flock) flock.g.visible = false;
    }
    function freezeNow() {
      closeGap(); lensReset();
      dropSky(); dropDiamonds(); st.beat = 'freeze'; go('freeze'); S.mode = 'event'; controls(false); uiLayer.hidden = true;
      if (api.canvas) api.canvas.style.filter = 'grayscale(.5)';
      st.typed = 0; msgP.textContent = ''; okBtn.hidden = true; freeze.hidden = false;
    }
    function freezeOk() { if (st.ph !== 'freeze') return; if (st.typed < name(FREEZE).length) { st.typed = 1e9; return; } freeze.hidden = true; var b = api.bird(); fallFrom = b ? b.position.clone() : Ppos.clone(); fallCam = camera.position.clone(); st.beat = 'fall'; go('fall'); }
    function toV() {
      if (api.canvas) api.canvas.style.filter = ''; buildFlock(true); flock.g.visible = true; var b = api.bird(); if (b) b.visible = false;
      V.C.set(O.x + 70, 125, O.z - 40);
      var asp = camera.aspect || 1, half = Math.atan(Math.tan(camera.fov * Math.PI / 360) * asp), dist = Math.max(14, Math.min(44, 11 / Math.tan(half)));
      V.cam.copy(V.C).addScaledVector(V.dir, -dist * 0.85).add(v1.set(0, dist * 0.5, 0));   // above and behind: the V's two arms and the open spot read
      panFrom = camera.position.clone(); panLook = camLook.clone(); st.beat = 'pan'; go('pan');
      var order = [['eagle', 0.55], ['owl', 0.45], ['crow', 0.45], ['falcon', 0.4], ['marth', 0.15]];   // HIS last and nearest
      for (var r = 0; r < 2; r++) order.forEach(function (o, i) { var id = o[0]; st.calls.push({ at: st.clk + PAN_S * 0.6 + (r * 5 + i) * 0.62, fn: function () { var bb = flock && flock.by[id]; call(bb ? bb.userData.k : id, { vol: 0.6, distance: o[1], pan: id === 'marth' ? -0.3 : id === 'falcon' ? 0.3 : 0 }); } }); });
    }
    function placeV(t) {
      var C = v1.copy(V.C).addScaledVector(V.dir, t * 9), perp = v2.set(V.dir.z, 0, -V.dir.x), yaw = Math.atan2(V.dir.x, V.dir.z), s = 2.2;
      var slot = function (b, k, sgn, jig) { if (!b) return; b.scale.setScalar(b.userData.size * s); b.position.copy(C).addScaledVector(V.dir, -3.6 * k + (jig || 0)).addScaledVector(perp, 3.0 * k * sgn); b.position.y += Math.sin(t * 1.3 + k * 1.7 + sgn) * 0.3; b.rotation.set(0, yaw, Math.sin(t * 0.9 + k) * 0.08); };
      slot(flock.by.eagle, 0, 0); slot(flock.by.marth, 1, 1, Math.sin(t * 2.4) * 0.7); slot(flock.by.owl, 2, 1); slot(flock.by.crow, 3, 1); slot(flock.by.falcon, 2, -1);   // arm 2, slot 1 is OPEN: hers
      flap(flock.by.eagle, 4, 0.5, t); flap(flock.by.marth, 16, 0.85, t); flap(flock.by.owl, 6, 0.6, t); flap(flock.by.crow, 8, 0.6, t); flap(flock.by.falcon, 10, 0.6, t);
      return C;
    }
    function toCard() {
      st.beat = 'card'; go('card'); dark.style.opacity = '1'; dark.style.pointerEvents = 'auto'; card.hidden = false; wakeBtn.hidden = true; cardText.textContent = CARD; st.lastCard = CARD; st.cue = null;
      if (window.WFR_MUSIC && window.WFR_MUSIC.cue && api.audio()) st.cue = window.WFR_MUSIC.cue('mission');
    }
    /* THE END CREDITS: after the card, before she wakes; only ever inside a live run of the ending, and a save that has seen the
       card is ended (written on the third dot), so a reload never brings them back. DOM only: nothing is added to the 3D scene. */
    var BIRD_SVG = (function () {   // six ORIGINAL silhouettes, in the game's order: Cardinal, Blue Jay, Crow, Peregrine, Owl, Eagle
      var body = function (x, crest, head, tail) { return '<g transform="translate(' + x + ' 30)"><ellipse cx="0" cy="0" rx="16" ry="10"/><circle cx="13" cy="-8" r="' + head + '"/>' +
        (crest ? '<path d="M10 -14 L6 -24 L16 -15 Z"/>' : '') + '<path d="M20 -9 L27 -7 L20 -5 Z"/><path d="M-14 -2 L-' + (24 + tail) + ' -6 L-' + (22 + tail) + ' 4 Z"/><path d="M-4 8 L-2 18 M4 8 L6 18" stroke="currentColor" stroke-width="2"/></g>'; };
      var owl = '<g transform="translate(220 28)"><ellipse cx="0" cy="2" rx="13" ry="16"/><path d="M-11 -12 L-8 -22 L-3 -13 Z M11 -12 L8 -22 L3 -13 Z"/></g>';
      var eagle = '<g transform="translate(272 26)"><path d="M-30 -4 Q-14 -18 0 -6 Q14 -18 30 -4 Q14 -8 0 2 Q-14 -8 -30 -4 Z"/><circle cx="0" cy="-8" r="5"/><path d="M-4 2 L0 12 L4 2 Z"/></g>';
      return '<svg viewBox="0 0 310 56" role="img" aria-label="Six birds" fill="currentColor" style="color:#f6ecd6">' + body(22, true, 7, 0) + body(74, true, 7, 2) + body(124, false, 6, 4) + body(172, false, 6, 1) + owl + eagle + '</svg>';
    })();
    var DRIFT_SVG = '<svg viewBox="0 0 34 20" fill="#f6ecd6" opacity=".55"><path d="M0 8 Q8 0 17 8 Q26 0 34 8 Q26 5 17 12 Q8 5 0 8 Z"/></svg>';
    /* Marth ~23:10: "in the credits when the birds are flying away ADD rouge plsss" - HER bird flies with them: cardinal red, a crest, her name under it */
    var ROUGE_SVG = '<svg viewBox="0 0 44 30" width="44" height="30"><path fill="#d0263a" d="M2 14 Q11 4 22 14 Q33 4 42 14 Q33 10 22 19 Q11 10 2 14 Z"/><path fill="#d0263a" d="M19 12 Q22 4 26 9 Q24 10 22 13 Z"/><path fill="#f28c28" d="M25 12 L29 13 L25 14 Z"/></svg>';
    function startCredits() {
      if (st.ph !== 'card' || wakeBtn.hidden) return;
      st.credits = (st.credits || 0) + 1; st.beat = 'credits'; go('credits'); dropFlock(); card.hidden = true;
      roll.innerHTML = ''; CREDITS.forEach(function (r) {
        if (r[0] === 'gap') { el('div', { class: 'gap' }, roll); return; }
        if (r[0] === 'birds') { var d = el('div', { class: 'birds' }, roll); d.innerHTML = BIRD_SVG; return; }
        if (r[0] === 'quote') { var q = el('p', { class: 'q' }, roll); q.appendChild(document.createTextNode(name(r[1]))); el('small', { text: '\u2014 ' + r[2] }, q); return; }
        el(r[0] === 'title' ? 'h2' : 'p', { text: name(r[1]), class: r[0] === 'head' ? 'head' : '' }, roll);
      });
      drifters.forEach(function (d) { d.remove(); }); drifters = [0, 1, 2].map(function () { var d = el('div', { class: 'drift', 'aria-hidden': 'true' }, creditsEl); d.innerHTML = DRIFT_SVG; return d; });
      var rd = el('div', { class: 'drift rouge', id: 'skyRougeBird', 'aria-label': name('{name}'), style: 'width:44px;height:46px;text-align:center' }, creditsEl); rd.innerHTML = ROUGE_SVG + '<div style="font:600 11px Georgia,serif;color:#ffd9de;margin-top:-2px">' + name('{name}') + '</div>'; drifters.push(rd);   // her bird, with the flock
      creditsEl.style.opacity = '1'; dawnEl.style.opacity = '0'; roll.style.transform = 'translateY(' + innerHeight + 'px)'; creditsEl.hidden = false;
      st.cr = { pos: 0, rate: 1, out: -1 }; doneBtn.hidden = true; ctlShow();
      if (window.WFR_MUSIC && api.audio()) window.WFR_MUSIC.play({ variant: 'legend', fadeIn: 4 });   // the island's own song, softly (the harp)
    }
    /* 596 (Marth ~22:00: "dont make the credits tap to skip. make a proper fastforward icon that fast forwards the credits (and music) and a
       reverse button"): no tap skips them. Three buttons, each a toggle a thumb can work: REWIND (x3 backwards), PAUSE / PLAY, FAST
       FORWARD (x3). The song cannot change tempo (music.js has no tempo control), so it keeps playing at its own pace: full while the
       credits run forward, softer while paused or rewinding. They still end on their own after the last line; "Done" appears there. */
    function ctlShow() {
      var r = st.cr ? st.cr.rate : 1;
      rewBtn.classList.toggle('on', r < 0); ffBtn.classList.toggle('on', r > 1);
      playBtn.innerHTML = r === 0 ? ICON.play : ICON.pause; playBtn.setAttribute('aria-label', r === 0 ? UI.play : UI.pause);
      if (window.WFR_MUSIC && window.WFR_MUSIC.setVolume) window.WFR_MUSIC.setVolume(r === 0 ? 0.35 : r < 0 ? 0.6 : 1);
    }
    function crRate(want) { if (st.ph !== 'credits' || !st.cr || st.cr.out >= 0) return; st.cr.rate = st.cr.rate === want ? 1 : want; ctlShow(); }
    function crPlay() { if (st.ph !== 'credits' || !st.cr || st.cr.out >= 0) return; st.cr.rate = st.cr.rate === 0 ? 1 : 0; ctlShow(); }
    function crDone() { if (st.ph !== 'credits' || !st.cr || doneBtn.hidden || st.cr.out >= 0) return; st.cr.out = 0; }
    function creditsTick(t, dt) {
      var cr = st.cr, vh = innerHeight, h = roll.offsetHeight, last = roll.lastElementChild, endY = last ? vh / 2 - (last.offsetTop + last.offsetHeight / 2) : -h;
      if (cr.out < 0) { cr.pos = Math.max(0, Math.min(CREDITS_S, cr.pos + dt * cr.rate)); if (cr.pos >= CREDITS_S) cr.out = 0; }
      var k = Math.min(1, cr.pos / CREDITS_SCROLL);
      roll.style.transform = 'translateY(' + (vh + (endY - vh) * k).toFixed(1) + 'px)';   // slow, even: ends with the last line held in the middle
      dawnEl.style.opacity = String(Math.min(1, cr.pos / CREDITS_S) * 0.9);                 // dark, slowly to dawn (and back, rewinding)
      drifters.forEach(function (d, i) { var j = i === 3 ? 1 : i, lag = i === 3 ? 1.1 : 0, p = ((t - lag + j * 6.5) / 19) % 1, y = vh * (0.18 + j * 0.22) + (i === 3 ? 34 : 0) + Math.sin(t * 1.3 + j) * 10; if (p < 0) p += 1; /* the fourth is HER, just behind the middle bird */ d.style.transform = 'translate(' + (-40 + p * (innerWidth + 80)).toFixed(1) + 'px,' + y.toFixed(1) + 'px)'; });
      if (doneBtn.hidden === cr.pos >= CREDITS_SCROLL) doneBtn.hidden = cr.pos < CREDITS_SCROLL;   // only once the last line is on screen
      if (cr.out >= 0) { cr.out += dt; var o = Math.max(0, 1 - cr.out / CREDITS_OUT); creditsEl.style.opacity = String(o);
        if (o <= 0) { creditsEl.hidden = true; if (window.WFR_MUSIC && window.WFR_MUSIC.setVolume) window.WFR_MUSIC.setVolume(1); api.music(null); wakeNow(); } }
    }
    function wake() { startCredits(); }   // the card's Continue
    function wakeNow() {
      st.clockAtWake = S.clock;   // (the bench: the clock never moved through the whole sequence)
      if (!S.sky.ended) { S.sky.ended = true; api.save(); }
      dropFlock(); var b = api.bird(); if (b) { b.visible = true; b.rotation.set(0, 0, 0); }
      var p = api.perchAt(); S.pos.copy(p); if (b) b.position.copy(p); S.mode = 'walk'; S.speed = 0; S.pitch = 0; S.landTo = null; S.inSky = false; S.evFocus = 'peak';
      if (api.flapBtn) api.flapBtn.textContent = 'Fly'; uiLayer.hidden = false; controls(true); card.hidden = true;
      buildTemple(); st.beat = 'wake'; go('wake'); api.toast(UI.woke, 4200);
    }
    tap(singBtn, duetTap); tap(yesBtn, function () { answer(true); }); tap(notBtn, function () { answer(false); });
    tap(gateYes, function () { gateAnswer(true); }); tap(gateNo, function () { gateAnswer(false); });   // 610
    tap(okBtn, freezeOk); tap(freeze, freezeOk); tap(wakeBtn, wake); tap(rewBtn, function () { crRate(-CR_FAST); }); tap(ffBtn, function () { crRate(CR_FAST); }); tap(playBtn, crPlay); tap(doneBtn, crDone);

    /* ---------- the camera ---------- */
    /* the lens keeps its OWN value (st.fov) and writes it every frame: hedgehogs.js puts the camera back to 62 every frame when it is not zooming */
    function lens(want, k) { var f = st.fov == null ? BASE_FOV : st.fov; f += (want - f) * Math.min(1, k); if (Math.abs(f - want) < 0.05) f = want; st.fov = f; if (camera.fov !== f) { camera.fov = f; camera.updateProjectionMatrix(); } }
    function lensReset() { st.fov = BASE_FOV; if (camera.fov !== BASE_FOV) { camera.fov = BASE_FOV; camera.updateProjectionMatrix(); } }
    /* the gap: any of the html's high cloud clumps (heavenLayer: groups of six puffs at y 172-176) across the line from the rim down to HIM
       is hidden for the shot, and put back after (nothing else is touched) */
    function openGap(to) {
      var seg = new THREE.Line3(RIM.clone(), to.clone()), q = new THREE.Vector3(); st.gaps = [];
      scene.children.forEach(function (o) {
        if (!o.isGroup || !o.visible || o.position.y < 168 || o.position.y > 180 || o.children.length !== 6) return;
        seg.closestPointToPoint(o.position, true, q); if (q.distanceTo(o.position) < 48) { o.visible = false; st.gaps.push(o); }
      });
    }
    function closeGap() { (st.gaps || []).forEach(function (o) { o.visible = true; }); st.gaps = null; }
    function aim(pos, look, k) { camera.position.lerp(pos, k); camLook.lerp(look, k); camera.lookAt(camLook); }
    /* ---------- 668 GRANDMA'S SCENE, A LITTLE MORE CINEMA (Marth, Oct 16 ~00:45: "maybe slightly upgrade the cinematics for the cutscene with
       the grandma also, the playable song want available.. just saying."; his answer ~01:55: her hop toward Rouge and her wings half open at
       her "I love you" line, yes). Only how the camera, the music and the light treat her scene: not a word of LINES, FREEZE, CARD or UI
       changes; no halo, never white; no light is added; duetIn and duetOut are left as they are (620 U2's).
         C1 a shot per beat: the reveal (a wide from behind Rouge), the push in (hi, proud), the low duet arc, over Rouge's shoulder (flowers),
            closer on her (close1, close2), the ease back out (linger). Every shot keeps BOTH birds in the frame (fit668); every move eases.
         C2 the music rises and falls (WFR_MUSIC.setVolume, eased each frame); exactly 1 again at fadeAway (cine668End)
         C3 warmer light, Standard only (Classic is frozen): the glow 0.35 to 0.55 from flowers on, a little gold on the shelf at close2
         C4 the duet as a song: Sing pulses on the harp's beat, two notes rise from whoever sings, three pips count the exchanges
         C5 at "I love you": one small hop toward Rouge (to 1.6 m), her wings half open, then folded again
       Every number is a DRAFT for his phone; a shot that is too much there is cut, not argued for. ---------- */
    var REVEAL668 = 2.5, HOP668 = 1.6, HOP_S668 = 0.9, WING668 = 0.5, SPB668 = 60 / 80;   // seconds; metres from Rouge; half open; 'legend' is 80 to the beat (music.js TEMPO) where info() is absent
    var SHOT668 = {   // a direction from the look point (b: toward Rouge's side, s: the side, sP: the side on an upright screen, u: up); d metres (d1 where a slow move ends, over its seconds); fov 0 = the game's lens; toHer: the look point leans to her
      reveal:  { b: 1, s: 0.25, u: 0.34, d: 13, fov: 0, toHer: 0.15, k: 1.8 },
      hi:      { b: 0.35, s: 1, u: 0.34, d: 9.5, d1: 7, over: 8, fov: 0, toHer: 0.05, k: 1.4 },
      duet:    { b: 0.35, s: 1, u: 0.1, d: 8, fov: 0, toHer: 0, arc: 15, k: 1.2 },
      flowers: { b: 1, s: 0.45, u: 0.3, d: 5.2, fov: 50, toHer: 0.25, k: 1.2 },
      close1:  { b: 0.7, s: 0.75, sP: 0.22, u: 0.22, d: 4.6, fov: 50, toHer: 0.35, k: 1 },
      close2:  { b: 0.55, s: 0.85, sP: 0.3, u: 0.16, d: 4.2, fov: 48, toHer: 0.4, k: 0.9 },
      linger:  { b: 0.35, s: 1, u: 0.3, d: 4.2, d1: 11, over: 5, fov: 0, toHer: 0, orbit: 0.12, k: 1.2 }
    };
    var VOL668 = { reveal: 0.6, arrive: 0.6, hi: 0.8, proud: 1, duet: 0.45, duetOut: 0.45, ask: 0.8, yes: 0.9, notYet: 0.9, pans: 0.9, flowers: 1, linger: 1 };   // the brief's DRAFT levels, by beat
    var SCENE668 = ['reveal', 'talk', 'duet', 'ask', 'pans', 'linger'];
    var cn = { classic: null, vol: null, glow: 0.35, gold: 0, hop: null, wo: 0, arc: 0, sung: 0, duet: 0, notes: null, pulse: 0, shot: null, shotAt: 0 };
    var EM0 = cloudMat.emissive.clone(), GOLD668 = col(0x8a6a2e), NOTE_R668 = col(0xff8fa3), NOTE_G668 = col(0xffe2a0);
    var c668 = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3(), w: new THREE.Vector3(), u: new THREE.Vector3(), p: [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], fr: new THREE.Vector3(), fu: new THREE.Vector3(), fo: new THREE.Vector3() };
    var pips668 = el('span', { id: 'skyPips', 'aria-hidden': 'true' }, singBtn); [0, 1, 2].forEach(function () { el('i', {}, pips668); });   // empty spans: the button's words stay UI.sing
    var css668 = document.createElement('style'); css668.textContent = '#skyPips{position:absolute;left:50%;top:-15px;transform:translateX(-50%);display:flex;gap:7px;pointer-events:none}#skyPips i{display:block;width:8px;height:8px;border-radius:50%;background:rgba(255,248,236,.75);box-shadow:0 0 0 1.5px rgba(200,49,74,.6)}#skyPips i.on{background:#c8314a}'; document.head.appendChild(css668);
    function classic668() { try { return localStorage.getItem('wfr.look') === 'classic'; } catch (e) { return false; } }   // the look switch (622) where the html keeps it: its classicLook lives inside the html's wrapper, never visible here (trap 187: G10 caught it, Su 32)
    function line668() { var w = $('talk'), x = $('talkText'); return w && !w.hidden && x ? x.textContent : ''; }
    function isLine668(key) { return line668() === name(LINES[key][1]); }   // which of her lines is on screen (LINES read, never written)
    function head668(out) { if (sky.gHead) return sky.gHead.getWorldPosition(out); return out.copy(sky.grandma.position).add(c668.u.set(0, 0.6, 0)); }
    function riseTop668(x, z) {   // the top of her rise under (x, z): the three blobs buildSky lays (rr(22 + i, 7) their turn, rr(22 + i, 8) their depth), or the shelf's floor
      var top = FLOOR;
      for (var i = 0; i < 3; i++) {
        var j = 22 + i, cx = Gpos.x + side.x * (i - 1) * 2.2, cz = Gpos.z + side.z * (i - 1) * 2.2, a = rr(j, 7) * 3, dx = x - cx, dz = z - cz;
        var lx = dx * Math.cos(a) - dz * Math.sin(a), lz = dx * Math.sin(a) + dz * Math.cos(a), sz = 2.6 * (0.8 + rr(j, 8) * 0.4), q = (lx / 2.6) * (lx / 2.6) + (lz / sz) * (lz / sz);
        if (q < 1) top = Math.max(top, RISE - 1.4 + 1.6 * Math.sqrt(1 - q));
      }
      return top;
    }
    function wings668(o) { var w = sky && sky.grandma.userData.wings; if (!w || !w[0]) return; var f = 1 - WING668 * o; w[0].rotation.y = 1.3 * f; w[1].rotation.y = -1.3 * f; }   // birds.js folds a wing by its y turn (1.3 folded), as the html's own unfolding does (the mentors' landing)
    function notes668() {   // four sprites, one shared texture, made at the reveal so the sprite program is drawn before the duet (no stutter)
      if (cn.notes || !sky) return cn.notes;
      var cv = document.createElement('canvas'); cv.width = cv.height = 64; var g = cv.getContext('2d');
      g.beginPath(); g.ellipse(25, 47, 11, 8, -0.45, 0, Math.PI * 2); g.moveTo(32, 46); g.lineTo(32, 9); g.lineTo(37, 9); g.quadraticCurveTo(40, 22, 53, 29); g.quadraticCurveTo(44, 27, 37, 20); g.lineTo(37, 46); g.closePath();   // an eighth note, drawn (no font needed)
      g.lineWidth = 5; g.lineJoin = 'round'; g.strokeStyle = 'rgba(70,45,25,0.45)'; g.stroke(); g.fillStyle = '#ffffff'; g.fill();
      var tex = new THREE.CanvasTexture(cv), list = [];
      for (var i = 0; i < 4; i++) { var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); sp.scale.set(0.3, 0.3, 1); sp.position.copy(Gpos).add(c668.u.set(0, 1.4, 0)); sky.g.add(sp); list.push({ sp: sp, age: 9, x: 0, y: 0, z: 0, ph: i * 1.7 }); }
      cn.notes = { tex: tex, list: list }; return cn.notes;
    }
    function sing668(at, colr, n) { var N = notes668(); if (!N) return; for (var i = 0; i < n; i++) { var o = N.list[0]; N.list.forEach(function (x) { if (x.age > o.age) o = x; }); o.age = -i * 0.12; o.x = at.x; o.y = at.y; o.z = at.z; o.sp.material.color.copy(colr); } }   // the oldest note sings next
    function notesTick668(dt) {
      var N = cn.notes; if (!N) return;
      N.list.forEach(function (o) { o.age += dt; var a = o.age, sp = o.sp; if (a < 0 || a > 1.5) { sp.material.opacity = 0; return; }
        sp.position.set(o.x, o.y + a * 0.9, o.z).addScaledVector(side, Math.sin(a * 4 + o.ph) * 0.14); var s = 0.3 * (1 + a * 0.35); sp.scale.set(s, s, 1);
        sp.material.opacity = 0.95 * Math.min(1, a / 0.15) * Math.min(1, (1.5 - a) / 0.6); });
    }
    function notesDrop668() { var N = cn.notes; if (!N) return; N.list.forEach(function (o) { if (o.sp.parent) o.sp.parent.remove(o.sp); o.sp.material.dispose(); }); N.tex.dispose(); cn.notes = null; }
    function portrait668() { return (camera.aspect || 1) < 1; }   // Jiraiya: Rouge plays upright (~390x844); the bench was 880x680
    function fit668(look, dir, pts, fov) {   // the least distance from the look point, along dir, at which every point sits inside 80% of the frame (90% of its width upright)
      var tn = Math.tan(fov * Math.PI / 360), tv = tn * 0.8, th = tn * (portrait668() ? 0.9 : 0.8) * (camera.aspect || 1), r = c668.fr.crossVectors(up, dir).normalize(), u = c668.fu.crossVectors(dir, r), need = 0;
      pts.forEach(function (p) { var o = c668.fo.copy(p).sub(look), z0 = o.dot(dir); need = Math.max(need, z0 + Math.abs(o.dot(r)) / th, z0 + Math.abs(o.dot(u)) / tv); });
      return need;
    }
    function cine668Cam(dt) {   // C1: true when 668 framed this frame; false hands it to today's two-shot (ask, the answers, the pans, the glide)
      if (!sky || st.ph === 'glide' || st.focus === 'birds' || st.focus === 'marth') return false;
      var bt = st.beat, ph = st.ph;
      var key = ph === 'reveal' || bt === 'arrive' ? 'reveal' : ph === 'linger' ? 'linger' : bt === 'hi' ? 'hi' : bt === 'duet' || bt === 'duetOut' ? 'duet' : bt === 'flowers' ? (isLine668('close2') ? 'close2' : isLine668('close1') ? 'close1' : 'flowers') : null;
      if (key !== cn.shot) { cn.shot = key; cn.shotAt = st.clk; }
      if (!key) return false;
      var P = SHOT668[key], b = api.bird(), age = st.clk - cn.shotAt, gA = c668.a.copy(sky.grandma.position), rA = c668.b.copy(b ? b.position : Ppos);
      var look = c668.c.set((gA.x + rA.x) / 2, FLOOR + 0.9, (gA.z + rA.z) / 2).lerp(gA, P.toHer);
      var dir = c668.d.copy(back).multiplyScalar(-P.b).addScaledVector(side, portrait668() && P.sP != null ? P.sP : P.s), turn = 0;   // upright, the close shots come round behind Rouge: the two birds stand in depth, not across a narrow screen (fitsim: close1 8.6 m > 4.6, close2 6.3 > 4.2 without it)
      if (P.arc) { cn.arc += (Math.min(1, (st.duet || 0) / 3) - cn.arc) * Math.min(1, dt * 0.8); turn = (cn.arc - 0.5) * P.arc * Math.PI / 180; }   // the duet's arc, one third per exchange
      if (P.orbit) turn = age * P.orbit;
      if (turn) dir.applyAxisAngle(up, turn);
      dir.normalize().multiplyScalar(Math.sqrt(1 - P.u * P.u)).add(c668.u.set(0, P.u, 0)).normalize();
      var d = P.d1 != null ? P.d + (P.d1 - P.d) * (function (e) { return e * e * (3 - 2 * e); })(Math.min(1, age / P.over)) : P.d;
      var fovWant = P.fov || BASE_FOV, pts = c668.p;
      pts[0].copy(rA); pts[1].copy(rA).y += 0.45; pts[2].copy(gA); head668(pts[3]);
      d = Math.max(d, P.fit === 0 ? 0 : fit668(look, dir, pts, Math.min(fovWant, camera.fov)));
      if (st.gaps) closeGap();
      aim(camWant.copy(look).addScaledVector(dir, d), lookWant.copy(look), Math.min(1, dt * P.k)); lens(fovWant, dt * 1.6);
      if (b && st.ph !== 'fade') b.position.y = FLOOR + api.standOf(api.kind());
      return true;
    }
    function cine668Start() {   // the reveal begins: everything of 668 starts from today's look
      cn.classic = classic668(); cn.vol = 1; cn.glow = 0.35; cn.gold = 0;   /* Obito N3: the look read once here, not every frame */ cn.hop = null; cn.wo = 0; cn.arc = 0; cn.sung = 0; cn.duet = 0; cn.pulse = 0; cn.shot = null;
      cloudMat.emissive.copy(EM0);
      if (sky) { if (sky.gy0668 == null) sky.gy0668 = sky.gy; sky.gy = sky.gy0668; sky.grandma.position.x = Gpos.x; sky.grandma.position.z = Gpos.z; wings668(0); notes668(); }
    }
    function cine668End() { cn.vol = null; if (window.WFR_MUSIC && window.WFR_MUSIC.setVolume) window.WFR_MUSIC.setVolume(1); notesDrop668(); singBtn.style.scale = ''; }   // at fadeAway: the dove's duck writes only on its own change, so a level left low would stay low for the rest of her game
    function cine668Tick(dt, t, ph) {
      if (SCENE668.indexOf(ph) < 0) { if (ph !== 'fade') { if (cn.vol != null || cn.notes) cine668End(); if (cn.gold) { cn.gold = 0; cloudMat.emissive.copy(EM0); } } return; }   // a beat jump past the fade (the bench) still leaves the level at 1
      if (ph === 'reveal') { flockAroundShelf(S.t); shelfCam(dt, t); if (t >= REVEAL668) { st.beat = 'arrive'; go('talk'); talk([LINES.arrive], hi); } }
      var bt = st.beat;
      /* C2 the music: the level by beat, eased (about a second), written only when it moves */
      var vw = VOL668[bt] != null ? VOL668[bt] : 1; if (bt === 'hi' && isLine668('proud')) vw = VOL668.proud; if (ph === 'linger') vw = VOL668.linger;
      var v = cn.vol == null ? 1 : cn.vol; v += (vw - v) * Math.min(1, dt * 1.2); if (Math.abs(vw - v) < 0.004) v = vw;
      if (v !== cn.vol) { cn.vol = v; if (window.WFR_MUSIC && window.WFR_MUSIC.setVolume) window.WFR_MUSIC.setVolume(v); }
      /* C4 the duet as a song. The tap rule is duetTap's, unchanged: this only reads st.sung (her taps) and st.duet (Grandma's answers).
         620 U2 (not V1): her duet graded on her harp ('legend', Marth ~01:55) runs inside this same duet shot; its end, per his later ask (the
         rank, a slight fade, then "Madame Shirley tweets gleefully", then her dialogue), goes in duetOut (:408), which 668 leaves as it is. */
      var inDuet = ph === 'duet' && !singBtn.hidden;
      cn.sung = Math.min(cn.sung, st.sung || 0); cn.duet = Math.min(cn.duet, st.duet || 0);
      if ((st.sung || 0) > cn.sung) { cn.sung = st.sung; var rb = api.bird(); if (rb) sing668(c668.w.copy(rb.position).add(c668.u.set(0, 0.45, 0)), NOTE_R668, 2); }
      if ((st.duet || 0) > cn.duet) { cn.duet = st.duet; if (sky) sing668(head668(c668.w), NOTE_G668, 2); }
      notesTick668(dt);
      var M = window.WFR_MUSIC, pos = inDuet && M && M.playing && M.variant === 'legend' && M.position ? window.WFR_MUSIC.position() : null;
      var inf = M && M.info ? M.info('legend') : null, spb = inf && inf.spb ? inf.spb : SPB668;
      cn.pulse = pos == null ? 0 : Math.exp(-((pos % spb) / spb) * 7);   // 1 on the beat, gone by the next
      var sc = inDuet ? String(+(1 + 0.07 * cn.pulse).toFixed(3)) : ''; if (singBtn.style.scale !== sc) singBtn.style.scale = sc;
      for (var pi = 0; pi < 3; pi++) { var pc = pi < (st.duet || 0) ? 'on' : ''; if (pips668.children[pi].className !== pc) pips668.children[pi].className = pc; }
      if (!sky) return;
      /* C5 at "I love you": one small hop toward Rouge (the rise's own surface under her feet), her wings half open, then folded again */
      if (sky.gy0668 == null) sky.gy0668 = sky.gy;
      var at2 = bt === 'flowers' && isLine668('close2');
      if (at2 && cn.hop == null) {
        var off = riseTop668(Gpos.x, Gpos.z) - Gpos.y, tw = c668.w.copy(Gpos).sub(Ppos).setY(0).normalize().multiplyScalar(HOP668).add(Ppos);
        cn.hop = 0; cn.hopFrom = new THREE.Vector3(sky.grandma.position.x, Gpos.y + (sky.gy - sky.gy0668), sky.grandma.position.z); cn.hopTo = new THREE.Vector3(tw.x, Math.max(FLOOR, riseTop668(tw.x, tw.z) - off), tw.z);
      }
      if (cn.hop != null && cn.hop < 1) {
        cn.hop = Math.min(1, cn.hop + dt / HOP_S668); var he = cn.hop * cn.hop * (3 - 2 * cn.hop), hp = c668.w.copy(cn.hopFrom).lerp(cn.hopTo, he);
        sky.grandma.position.x = hp.x; sky.grandma.position.z = hp.z; sky.gy = sky.gy0668 + (hp.y - Gpos.y) + Math.sin(cn.hop * Math.PI) * 0.45;   // the breathing below writes her y from sky.gy
      }
      var wt = at2 && cn.hop != null && cn.hop > 0.5 ? 1 : 0; cn.wo = wt > cn.wo ? Math.min(1, cn.wo + dt / 0.6) : Math.max(0, cn.wo - dt / 1.4); wings668(cn.wo);
      /* C3 warmer light, Standard only (Classic is frozen); the fade starts from where the glow stands (userData.op) */
      if (!(cn.classic != null ? cn.classic : classic668())) {
        var gw = bt === 'flowers' || ph === 'linger' ? 0.55 : 0.35; cn.glow += (gw - cn.glow) * Math.min(1, dt * 0.6); if (Math.abs(gw - cn.glow) < 0.002) cn.glow = gw;
        sky.glow.material.opacity = cn.glow; sky.glow.material.userData.op = cn.glow;
        var gd = at2 || ph === 'linger' ? 1 : 0; cn.gold += (gd - cn.gold) * Math.min(1, dt * 0.5); if (Math.abs(gd - cn.gold) < 0.002) cn.gold = gd;
        cloudMat.emissive.copy(EM0).lerp(GOLD668, 0.4 * cn.gold);
      }
    }
    function cine668() {   // the bench's read (state().cine): what the camera, the lens, the music and her light are doing this frame
      var o = { clk: st.clk, ph: st.ph, beat: st.beat, shot: cn.shot, cam: camera.position.toArray(), look: camLook.toArray(), fov: camera.fov, base: BASE_FOV, aspect: camera.aspect, vol: cn.vol, pulse: cn.pulse, pips: pips668.querySelectorAll('i.on').length,
        line: line668(), classic: classic668(), programs: api.renderer && api.renderer.info && api.renderer.info.programs ? api.renderer.info.programs.length : null, lights: 0,
        notes: cn.notes ? cn.notes.list.filter(function (x) { return x.age >= 0 && x.age <= 1.5; }).length : 0, sky: !!sky };
      scene.children.forEach(function (x) { if (x.isLight) o.lights++; }); if (sky) sky.g.traverse(function (x) { if (x.isLight) o.lights++; });
      if (sky) { var b = api.bird(), w = sky.grandma.userData.wings;
        o.gAt = sky.grandma.getWorldPosition(new THREE.Vector3()).toArray(); o.rAt = b ? b.position.toArray() : null; o.gHead = head668(new THREE.Vector3()).toArray();
        o.glowAt = sky.glow.getWorldPosition(new THREE.Vector3()).toArray(); o.glowOp = sky.glow.material.opacity; o.shelfEm = cloudMat.emissive.getHexString();
        o.wings = w && w[0] ? +(1 - Math.abs(w[0].rotation.y) / 1.3).toFixed(4) : null; o.dist = +Math.hypot(sky.grandma.position.x - Ppos.x, sky.grandma.position.z - Ppos.z).toFixed(4); }
      return o;
    }
    function shelfCam(dt, t) {
      if (cine668Cam(dt)) return;   // 668: a shot per beat (the camera, so Classic too); false = today's two-shot below
      var b = api.bird(), mid = v1.copy(Gpos).add(Ppos).multiplyScalar(0.5); mid.y = FLOOR + 0.9;
      var focus = st.focus, k = Math.min(1, dt * 2.2);
      if (focus === 'birds' && flock) { var f = flock.by.falcon.position, o = flock.by.owl.position; lookWant.copy(f).add(o).multiplyScalar(0.5); camWant.copy(mid).addScaledVector(back, -6).add(v2.set(0, 3, 0)); aim(camWant, lookWant, Math.min(1, dt * 1.6)); return; }
      if (focus === 'marth' && flock) {   // 593: down through a gap in the clouds to HIM, far below; a long lens, then back to her
        if (!st.gaps) openGap(flock.by.marth.position);
        lookWant.copy(flock.by.marth.position); aim(RIM, lookWant, Math.min(1, dt * 1.4)); lens(GAP_FOV, dt * 1.6); return; }
      if (st.gaps) closeGap(); lens(BASE_FOV, dt * 2.2);
      var sway = Math.sin(t * 0.1) * 1.5, orbit = focus === 'linger' ? t * 0.18 : 0;
      var dirC = v2.copy(side).multiplyScalar(Math.cos(orbit)).addScaledVector(back, -Math.sin(orbit) - 0.35).normalize();
      camWant.copy(mid).addScaledVector(dirC, 9.5).addScaledVector(side, focus === 'linger' ? 0 : sway).add(v3.set(0, 3.2, 0)); lookWant.copy(mid).add(v3.set(0, -0.2, 0));
      aim(camWant, lookWant, k);
      if (b && st.ph !== 'fade') b.position.y = FLOOR + api.standOf(api.kind());
    }

    /* ---------- the tick (runs after the html's mode block, so its poses are the last word) ---------- */
    function tick(dt) {
      if (S.mode === 'paused' || S.mode === 'menu') return;
      dt *= st.speed;   // 1, always, in play (a bench may raise it through the door)
      var t = (st.t += dt); st.clk += dt;   // st.t restarts with each phase; st.clk never does (the scheduled calls run on it)
      if (st.duetCd > 0) st.duetCd -= dt;
      if (st.duetQ > 0 && st.duetCd <= 0 && st.ph === 'duet') { st.duetQ--; duetTap(); }
      for (var i = st.calls.length - 1; i >= 0; i--) if (st.clk >= st.calls[i].at) { var c = st.calls[i]; st.calls.splice(i, 1); c.fn(); }
      if (st.resume && (S.mode === 'walk' || S.mode === 'fly') && !S.talking && (!$('story') || $('story').hidden)) { st.resume = false; standOnShelf(); camera.position.copy(Ppos).addScaledVector(side, 8).add(v1.set(0, 2, 0)); camLook.copy(Ppos); freezeNow(); return; }
      /* 610: the temple holds still (she walks on it); the wall below it is the thing that speaks */
      var ph = st.ph, b = api.bird(), k = api.kind();
      if (ph === 'idle') {
        var open = gateOpen();
        /* 627: the signal. The evening before: once per save, when all but the dawn is met and night has come. At dawn: once per dawn, when the gems are out. */
        if (!open && !S.sky.seen && S.eagleFound && worthy() && S.clock > 2040 && S.sky.toldDay !== (S.dawns || 0) && S.mode !== 'paused' && !S.talking) { S.sky.toldDay = (S.dawns || 0); S.sky.told = true; api.toast(UI.tonight, 4200); if (api.save) api.save(); }
        if (open && !st.called && (S.mode === 'fly' || S.mode === 'walk') && !S.talking) { st.called = true; api.toast(UI.calling, 4200); }
        if (!open) st.called = false;
        if (open && !dia) buildDiamonds();
        if (dia) { dia.fade = Math.max(0, Math.min(1, dia.fade + (open ? dt : -dt) * 0.6)); dia.mesh.material.opacity = 0.92 * dia.fade; dia.pts.material.opacity = dia.fade; dia.g.visible = dia.fade > 0.01; placeDiamonds(S.t);
          if (!open && dia.fade <= 0) { dropDiamonds(); st.hinted = false; } }
        if (open && !st.hinted && Math.hypot(S.pos.x - PK.x, S.pos.z - PK.z) < 160 && (S.mode === 'fly' || S.mode === 'walk')) { st.hinted = true; api.hint(UI.glint); }
        if (open && dia && dia.fade > 0.5 && S.mode === 'fly' && !S.talking && S.pos.distanceTo(helix(0, v1)) < 4) beginClimb();
        return;
      }
      if (ph === 'done' || ph === 'gate' || ph === 'enter' || ph === 'settle' || ph === 'turn') { gateTick(dt, t, b, k); return; }
      if (ph === 'climb') {
        st.u = Math.min(1, st.u + dt * (S.flapHeld ? RIDE_HELD : RIDE));
        for (var j = 0; j < N_DIA; j++) if (st.u >= j / (N_DIA - 1) - 1e-6) collect(j);
        placeDiamonds(S.t); dia.mesh.material.opacity = 0.92; dia.pts.material.opacity = 1;
        var p = helix(st.u, v1), nx = helix(Math.min(1, st.u + 0.01), v2), yaw = Math.atan2(nx.x - p.x, nx.z - p.z);
        birdPose(p.x, p.y, p.z, yaw, -0.25, 0.35); wingsOpen(Math.sin(S.t * (S.flapHeld ? 26 : 16)) * 0.85);
        var th = th0 + st.u * HELIX_TURNS * Math.PI * 2 - 0.55;
        camWant.set(PK.x + Math.cos(th) * (HELIX_R + 12), p.y + 5, PK.z + Math.sin(th) * (HELIX_R + 12)); lookWant.copy(p).add(v3.set(0, 1, 0)); aim(camWant, lookWant, Math.min(1, dt * 3));
        if (st.u >= 1) { if (api.flapBtn) api.flapBtn.hidden = true; st.liftFrom = p.clone(); dia.g.visible = false;
          var colm = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.4, 100, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xdff1ff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
          colm.position.set(p.x, HELIX_TOP + 50, p.z); scene.add(colm); st.column = colm; api.hint(UI.lift);
          [392, 494, 587].forEach(function (f, i) { api.tone(f, i * 0.08, 1.6, 'sine', 0.04); }); go('lift'); }
        return;
      }
      if (ph === 'lift') {
        var e = Math.min(1, t / LIFT_S), ee = e * e * (3 - 2 * e), lf = st.liftFrom, y = lf.y + (SHELF_Y + 8 - lf.y) * ee;
        birdPose(lf.x + Math.sin(t * 2) * 0.6, y, lf.z + Math.cos(t * 2) * 0.6, S.yaw + dt * 0.8, -0.5, 0); wingsOpen(0.9 + Math.sin(S.t * 3) * 0.1);
        if (st.column) st.column.material.opacity = 0.32 * Math.min(1, t * 2) * (1 - Math.max(0, e - 0.85) / 0.15);
        white.style.opacity = String(Math.max(0, 1 - Math.abs(y - 171) / 13) * 0.92);
        camWant.set(lf.x, y - 6, lf.z).addScaledVector(back, -10); lookWant.set(lf.x, y + 1, lf.z); aim(camWant, lookWant, Math.min(1, dt * 3));
        if (e >= 1) { white.style.opacity = '0'; if (st.column) { scene.remove(st.column); st.column.geometry.dispose(); st.column.material.dispose(); st.column = null; } dropDiamonds(); st.glideFrom = api.bird() ? api.bird().position.clone() : Ppos.clone(); go('glide'); }
        return;
      }
      if (ph === 'glide') {
        var g = Math.min(1, t / GLIDE_S), gg = g * g * (3 - 2 * g), to = v2.set(Ppos.x, FLOOR + api.standOf(k), Ppos.z);
        var at = v1.copy(st.glideFrom).lerp(to, gg); at.y += Math.sin(g * Math.PI) * 1.2;
        birdPose(at.x, at.y, at.z, Math.atan2(Gpos.x - Ppos.x, Gpos.z - Ppos.z), g > 0.75 ? -0.4 : 0, 0); wingsOpen(g > 0.75 ? Math.sin(S.t * 22) * 1.0 : 0.9);
        shelfCam(dt, t); if (g >= 1) arrive();
        return;
      }
      cine668Tick(dt, t, ph);   // 668: the reveal, the shots' music and light, the song's notes and pips, her hop and wings (the breathing below still writes her y last)
      if (sky) {   // Grandma breathes; her head moves a little; a small hop when she answers
        st.hop = Math.max(0, (st.hop || 0) - dt * 2.2);
        sky.grandma.position.y = sky.gy + Math.sin(Math.min(1, st.hop || 0) * Math.PI) * 0.35;
        if (sky.gHead) sky.gHead.rotation.x = Math.sin(S.t * 1.3) * 0.06;
        sky.grandma.scale.y = sky.grandma.scale.x * (1 + Math.sin(S.t * 1.6) * 0.02);
      }
      if (ph === 'talk' || ph === 'duet' || ph === 'ask' || ph === 'pans' || ph === 'linger') {
        flockAroundShelf(S.t);
        if (ph === 'duet' && st.duet >= 3 && !st.calls.length && st.duetCd <= 0) duetOut();
        if (ph === 'pans') { st.focus = t < 4 ? 'birds' : t < 8 ? 'marth' : 'her'; if (t >= 9.4) flowers(); }   // answer 1: the Falcon showing off and the Owl smiling, then HIM for a bit, then back to her
        if (ph === 'linger') { st.focus = 'linger'; if (t >= LINGER_S) fadeAway(); }
        shelfCam(dt, t); return;
      }
      if (ph === 'fade') {
        var f = Math.min(1, t / FADE_S), fe = f * f * (3 - 2 * f);
        if (sky) { sky.mats.forEach(function (M) { M.opacity = M.userData.op * (1 - fe); }); sky.g.position.y = 40 * fe; sky.g.visible = f < 1; }
        camera.lookAt(camLook);
        if (f >= 1) freezeNow();
        return;
      }
      if (ph === 'freeze') {   // the screen holds still; the narrator types
        var full = name(FREEZE); st.typed = Math.min(full.length, st.typed + dt * TYPE_CPS);
        var s = full.slice(0, Math.floor(st.typed)); if (msgP.textContent !== s) msgP.textContent = s;
        if (st.typed >= full.length && okBtn.hidden) okBtn.hidden = false;
        camera.lookAt(camLook); return;
      }
      if (ph === 'fall') {   // gracefully: nose down, wings half open, out of the frame; the camera holds
        var fa = Math.min(1, t / FALL_S);
        birdPose(fallFrom.x, fallFrom.y - 30 * fa * fa, fallFrom.z, S.yaw, 0.2 + fa * 1.0, Math.sin(t * 2) * 0.1); wingsOpen(0.5 + Math.sin(t * 5) * 0.15);
        camera.position.copy(fallCam); camera.lookAt(camLook);
        if (fa >= 1) toV();
        return;
      }
      if (ph === 'pan' || ph === 'v') {
        var C = placeV(ph === 'v' ? PAN_S + t : t);
        var follow = v3.copy(V.cam).addScaledVector(V.dir, (ph === 'v' ? PAN_S + t : t) * 7);   // the camera follows at 7 m/s; the V (9 m/s) slowly draws away
        if (ph === 'pan') { var pe = Math.min(1, t / PAN_S), pp = pe * pe * (3 - 2 * pe); camera.position.copy(panFrom).lerp(follow, pp); camLook.copy(panLook).lerp(v2.copy(C).addScaledVector(V.dir, 4), pp); camera.lookAt(camLook); if (pe >= 1) { st.beat = 'v'; go('v'); } }
        else { camera.position.copy(follow); camLook.copy(C).addScaledVector(V.dir, 4); camera.lookAt(camLook); if (t >= V_S - PAN_S * 0.4) { st.beat = 'dark'; go('dark'); st.calls.length = 0; } }   // every call is done before the dark (brief section 5)
        return;
      }
      if (ph === 'dark') {
        placeV(PAN_S + V_S + t); camera.lookAt(camLook);
        dark.style.opacity = String(Math.min(1, t / DARK_S)); if (t >= DARK_S) { dark.style.opacity = '1'; dark.style.pointerEvents = 'auto'; toCard(); }
        return;
      }
      if (ph === 'card') {
        var want = t >= DOT3 ? CARD + '..' : t >= DOT2 ? CARD + '.' : CARD;   // "MISSION COMPLETE." then ".." then "..."
        if (cardText.textContent !== want) { cardText.textContent = want; st.lastCard = want; }
        if (t >= DOT3 && !S.sky.ended) { S.sky.ended = true; api.save(); }   // beat 10 done: a reload from here wakes her in the nest
        if (t >= WAKE_BTN && wakeBtn.hidden) wakeBtn.hidden = false;
        return;
      }
      if (ph === 'credits') { creditsTick(t, dt); return; }
      if (ph === 'wake') {
        dark.style.opacity = String(Math.max(0, 1 - t / WAKE_S));
        if (t >= WAKE_S) { dark.style.opacity = '0'; dark.style.pointerEvents = 'none'; S.sky.ended = true; st.beat = 'done'; go('done'); }
      }
    }

    /* ---------- 610: THE SKY WALL. After the ending the air under the temple stops her and asks; Yes rides the climb's own column up
       through the white and sets her down on the disc; No (or the Crow) turns her around and lowers her. S.sky.where is the save. ---------- */
    function discStand(out) { return (out || new THREE.Vector3()).copy(O).addScaledVector(back, -5).setY(DISC_TOP + api.standOf(api.kind())); }
    function column(p, y) {   // the climb's lift column, at any height
      var colm = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.4, 100, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xdff1ff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      colm.position.set(p.x, y, p.z); scene.add(colm); return colm;
    }
    function dropColumn() { if (st.column) { scene.remove(st.column); st.column.geometry.dispose(); st.column.material.dispose(); st.column = null; } }
    function controlsBack(mode) { S.mode = mode; S.inSky = false; S.speed = mode === 'fly' ? 9 : 0; S.landTo = null; if (api.flapBtn) api.flapBtn.textContent = mode === 'walk' ? 'Fly' : 'Flap'; uiLayer.hidden = false; controls(true); }
    function wall(k) {   // the invisible wall: she stops in the air; the ask, or the Crow's line and the turn
      st.wallFrom = S.pos.clone(); st.yaw0 = S.yaw; st.crow = k === 'crow'; st.armed = false;
      S.mode = 'event'; S.inSky = true; S.speed = 0; S.flapT = 0; controls(false); camLook.copy(S.pos);
      [330, 262].forEach(function (f, i) { api.tone(f, i * 0.05, 0.25, 'sine', 0.05); });
      var shut = !st.crow && api.shut && api.shut();   // 632 U2: rain closes the sky island
      if (st.crow || shut) { api.toast(st.crow ? UI.gateCrow : UI.gateRain, 3600); turnBack(); return; }
      go('gate'); gate.hidden = false;
    }
    function gateAnswer(yes) {
      if (st.ph !== 'gate') return; gate.hidden = true;
      if (!yes) { turnBack(); return; }
      st.liftFrom = S.pos.clone(); st.column = column(st.liftFrom, WALL_Y + 40); api.hint(UI.lift);
      [392, 494, 587].forEach(function (f, i) { api.tone(f, i * 0.08, 1.6, 'sine', 0.04); }); go('enter');
    }
    function turnBack() { st.turnFrom = S.pos.clone(); var d = Math.hypot(S.pos.x - O.x, S.pos.z - O.z); st.out = d > 1 ? new THREE.Vector3((S.pos.x - O.x) / d, 0, (S.pos.z - O.z) / d) : back.clone(); go('turn'); }
    function arriveDisc() {   // set down on the disc: the island is hers to walk; the save remembers
      var p = discStand(v1); S.pos.copy(p); var b = api.bird(); if (b) { b.position.copy(p); b.rotation.set(0, 0, 0); }
      S.yaw = Math.atan2(-back.x, -back.z); S.camYaw = S.yaw; S.pitch = 0; S.camCut = true; S.sky.where = 'temple'; st.edgeSaid = false; st.armed = false;
      controlsBack('walk'); api.save(); api.toast(UI.gateIn, 4200); go('done');
    }
    function standOnDisc() { var p = discStand(v1); S.pos.copy(p); var b = api.bird(); if (b) b.position.copy(p); S.yaw = Math.atan2(-back.x, -back.z); S.camYaw = S.yaw; S.camCut = true; S.mode = 'walk'; S.speed = 0; }
    function ground(x, z) { return (S.sky.where || 'home') === 'temple' && Math.hypot(x - O.x, z - O.z) < DISC_R + 0.5 ? DISC_TOP : -Infinity; }   // the html's groundAt reads this
    function gateTick(dt, t, b, k) {
      var ph = st.ph, d = Math.hypot(S.pos.x - O.x, S.pos.z - O.z), e, ee, p;
      if (ph === 'done') {
        if (st.resumeTemple && (S.mode === 'walk' || S.mode === 'fly') && !S.talking && (!$('story') || $('story').hidden)) { st.resumeTemple = false; standOnDisc(); return; }
        if ((S.sky.where || 'home') === 'temple') {
          if (S.mode === 'walk' && d > DISC_R - 0.4) {   // the rim holds her
            var f = (DISC_R - 0.4) / d; S.pos.x = O.x + (S.pos.x - O.x) * f; S.pos.z = O.z + (S.pos.z - O.z) * f; S.pos.y = DISC_TOP + api.standOf(k); if (b) b.position.copy(S.pos);
            if (!st.edgeSaid) { st.edgeSaid = true; api.toast(UI.gateEdge, 2600); } }
          else if (S.mode === 'fly' && S.pos.y > SKY_CAP) { S.pos.y = SKY_CAP; S.pitch = Math.min(S.pitch, 0); if (b) b.position.y = S.pos.y; }
          else if (S.mode === 'fly' && S.pos.y < WALL_Y + 6 && d > DISC_R + 4) { S.sky.where = 'home'; st.armed = false; api.save(); api.toast(UI.gateHome, 2600); }   // down off the island: the ceiling is back
          return;
        }
        if (!st.armed) { if (d > WALL_R + 8 || S.pos.y < WALL_Y - 30) st.armed = true; return; }   // the wall asks again only after she has left its zone (the No's own drop does not count)
        if (S.sky.ended && S.mode === 'fly' && !S.talking && S.pos.y >= WALL_Y && d < WALL_R) wall(k);
        return;
      }
      if (ph === 'gate') {   // held in the air at the wall, wings beating
        p = st.wallFrom; birdPose(p.x, p.y + Math.sin(t * 2.2) * 0.3, p.z, st.yaw0, -0.1, 0); wingsOpen(Math.sin(S.t * 22) * 0.9);
        return;
      }
      if (ph === 'enter') {   // the yes ride: the column, the white at the ceiling, up to the temple
        e = Math.min(1, t / ENTER_S); ee = e * e * (3 - 2 * e); var lf = st.liftFrom, y = lf.y + (TEMPLE_Y + 8 - lf.y) * ee;
        birdPose(lf.x + Math.sin(t * 2) * 0.6, y, lf.z + Math.cos(t * 2) * 0.6, S.yaw + dt * 0.8, -0.5, 0); wingsOpen(0.9 + Math.sin(S.t * 3) * 0.1);
        if (st.column) st.column.material.opacity = 0.32 * Math.min(1, t * 2) * (1 - Math.max(0, e - 0.85) / 0.15);
        white.style.opacity = String(Math.max(0, 1 - Math.abs(y - 171) / 13) * 0.92);
        camWant.set(lf.x, y - 6, lf.z).addScaledVector(back, -10); lookWant.set(lf.x, y + 1, lf.z); aim(camWant, lookWant, Math.min(1, dt * 3));
        if (e >= 1) { white.style.opacity = '0'; dropColumn(); st.glideFrom = b ? b.position.clone() : lf.clone(); go('settle'); }
        return;
      }
      if (ph === 'settle') {   // the glide down onto the disc
        e = Math.min(1, t / SETTLE_S); ee = e * e * (3 - 2 * e); var to = discStand(v2), at = v1.copy(st.glideFrom).lerp(to, ee); at.y += Math.sin(e * Math.PI) * 1.2;
        birdPose(at.x, at.y, at.z, Math.atan2(-back.x, -back.z), e > 0.75 ? -0.4 : 0, 0); wingsOpen(e > 0.75 ? Math.sin(S.t * 22) * 1.0 : 0.9);
        camWant.copy(to).addScaledVector(back, 9).add(v3.set(0, 3.5, 0)); lookWant.copy(at); aim(camWant, lookWant, Math.min(1, dt * 2.5));
        if (e >= 1) arriveDisc();
        return;
      }
      if (ph === 'turn') {   // the no ride: around, and down a little, back over the island
        e = Math.min(1, t / TURN_S); ee = e * e * (3 - 2 * e); var yaw = st.yaw0 + Math.PI * ee, tf = st.turnFrom;
        p = v1.copy(tf).addScaledVector(st.out, TURN_BACK * ee); p.y = tf.y - TURN_DROP * ee;
        birdPose(p.x, p.y, p.z, yaw, -0.2, Math.sin(e * Math.PI) * 0.5); wingsOpen(Math.sin(S.t * 18) * 0.9);
        camWant.set(p.x - Math.sin(yaw) * 10, p.y + 3, p.z - Math.cos(yaw) * 10); lookWant.copy(p); aim(camWant, lookWant, Math.min(1, dt * 3));
        if (e >= 1) { S.yaw = st.yaw0 + Math.PI; S.camYaw = S.yaw; S.pitch = -0.1; S.pos.copy(p); controlsBack('fly'); go('done'); }
        return;
      }
    }
    if (S.sky.ended && (S.sky.where || 'home') === 'temple') st.resumeTemple = true;   // a reload up there stands her on the disc

    /* ---------- the bench's door (only reached through window.__wfr, which exists only with wfr.debug) ---------- */
    function casters() { var n = 0; [dia && dia.g, sky && sky.g, flock && flock.g, temple && temple.g, st.column].filter(Boolean).forEach(function (r) { r.traverse(function (o) { if (o.castShadow) n++; }); }); return n; }
    function census() {
      var n = 0, roots = [dia && dia.g, sky && sky.g, flock && flock.g, temple && temple.g, st.column].filter(Boolean);
      roots.forEach(function (r) { r.traverse(function (o) { if (o.isMesh || o.isPoints || o.isSprite) n++; }); });
      return n;
    }
    function state() {
      return { present: !S.sky.seen, where: S.sky.where || 'home', yaw: S.yaw, gateShown: !gate.hidden, armed: !!st.armed, wallAt: st.wallFrom ? st.wallFrom.toArray() : null, discTop: DISC_TOP, wallY: WALL_Y, wallR: WALL_R, gateSizes: gate.hidden ? null : [gateYes, gateNo].map(function (x) { var r = x.getBoundingClientRect(); return [x.id, Math.round(r.width), Math.round(r.height)]; }), gate: gateOpen(), worthy: worthy(), told: !!S.sky.told, called: !!st.called, phase: st.ph, beat: st.beat, seq: st.seq.slice(), seen: !!S.sky.seen, ended: !!S.sky.ended, built: !!sky, diamonds: dia ? dia.got.filter(function (x) { return !x; }).length : 0,
        diamondsVisible: !!(dia && dia.g.visible), u: st.u, temple: !!temple, meshes: census(), focus: st.focus, answer: st.answer || null, duet: st.duet, card: cardText.textContent, cardShown: !card.hidden, wakeShown: !wakeBtn.hidden,
        freeze: freeze.hidden ? null : msgP.textContent, okShown: !okBtn.hidden, singShown: !singBtn.hidden, choiceShown: !choice.hidden, cue: st.cue == null ? null : st.cue,
        figures: figSpots.map(function (p) { return [p.x, p.y, p.z]; }), standAt: [Ppos.x, FLOOR, Ppos.z], grandmaAt: [Gpos.x, RISE, Gpos.z], first: helix(0).toArray(), clockAtStart: st.clockAtStart, clockAtWake: st.clockAtWake == null ? null : st.clockAtWake,
        grandma: sky ? (function () { var c = null, white = 0; sky.grandma.traverse(function (m) { if (m.isMesh && m.material.color) { var x = m.material.color; if (x.r > 0.97 && x.g > 0.97 && x.b > 0.97 && !m.userData.keepColor) white++; if (m.name === 'body' || !c) c = x.getHexString(); } }); return { kind: sky.gk, body: c, pureWhite: white }; })() : null,
        credits: st.credits || 0, creditsShown: !creditsEl.hidden, creditsText: creditsEl.hidden ? null : [].map.call(roll.children, function (c) { return c.className === 'gap' ? '' : c.className === 'birds' ? '[birds]' : c.className === 'q' ? c.firstChild.textContent + ' | ' + c.lastChild.textContent : c.textContent; }), creditsHtml: creditsEl.hidden ? null : roll.innerHTML, creditsT: st.ph === 'credits' ? st.t : null, credPos: st.cr ? st.cr.pos : null, credRate: st.cr ? st.cr.rate : null, doneShown: !doneBtn.hidden, CREDITS_S: CREDITS_S, CREDITS_SCROLL: CREDITS_SCROLL,
        ctlSizes: [rewBtn, playBtn, ffBtn, doneBtn].map(function (b) { var r = b.getBoundingClientRect(); return [b.id, Math.round(r.width), Math.round(r.height)]; }), playIcon: playBtn.getAttribute('aria-label'),
        gameT: S.t,
        himAt: flock && flock.by.marth ? flock.by.marth.position.toArray() : null, shelfAt: [O.x, FLOOR, O.z], fov: camera.fov, gaps: st.gaps ? st.gaps.length : 0, heavenVisible: scene.children.filter(function (o) { return o.isGroup && o.visible && o.position.y >= 168 && o.position.y <= 180 && o.children.length === 6; }).length, camDown: camera.position.y - camLook.y,
        cine: cine668(), him: other(), flock: flock ? Object.keys(flock.by) : [], LINES: LINES, FREEZE: FREEZE, CARD: CARD, GRANDMA: GRANDMA };
    }
    function open() {   // the gate, for a bench: dawn, and her flying just short of the first diamond, straight at it
      S.clock = 20; var f = helix(0), from = v1.set(f.x, f.y, f.z).add(v2.set(-Math.sin(th0 + 0.4), 0, -Math.cos(th0 + 0.4)).multiplyScalar(9));
      S.mode = 'fly'; S.pos.copy(from); S.yaw = Math.atan2(f.x - from.x, f.z - from.z); S.camYaw = S.yaw; S.pitch = 0; S.speed = 9;
      return gateOpen();
    }
    function beat(nm) {   // jump to any beat (the bench and Marth's review)
      if (nm === 'climb') { if (!gateOpen()) open(); beginClimb(); return st.ph; }
      if (nm === 'lift') { beat('climb'); st.u = 1; return st.ph; }
      if (nm === 'resume') { st.resume = true; return st.ph; }
      if (nm === 'wall') {   // 610: her flying into the wall's zone, from 30 m out, straight at the temple's axis (only once the story is done)
        if (!S.sky.ended) return null; S.sky.where = 'home'; st.armed = true; S.mode = 'fly'; S.inSky = false;
        S.pos.set(O.x + 30, WALL_Y + 2, O.z); S.yaw = Math.atan2(O.x - S.pos.x, O.z - S.pos.z); S.camYaw = S.yaw; S.pitch = 0; S.speed = 8; return st.ph; }
      if (nm === 'edge') { if ((S.sky.where || 'home') !== 'temple' || S.mode !== 'walk') return null; S.pos.set(O.x + 30, DISC_TOP + api.standOf(api.kind()), O.z); return st.ph; }   // 610: a step past the rim
      S.mode = 'event'; S.inSky = true; buildSky(); controls(false); standOnShelf(); camLook.copy(Gpos); choice.hidden = true; singBtn.hidden = true;
      if (st.clockAtStart == null) st.clockAtStart = S.clock;
      var map = { arrive: arrive, hi: function () { buildFlock(false); hi(); }, duet: function () { buildFlock(false); duetIn(); }, ask: function () { buildFlock(false); ask(); },
        yes: function () { buildFlock(false); go('ask'); answer(true); }, notyet: function () { buildFlock(false); go('ask'); answer(false); }, pans: function () { buildFlock(false); st.beat = 'pans'; go('pans'); },
        flowers: function () { buildFlock(false); flowers(); }, linger: function () { buildFlock(false); st.beat = 'linger'; go('linger'); }, fade: fadeAway, freeze: function () { S.sky.seen = true; api.save(); freezeNow(); },
        v: function () { S.sky.seen = true; api.save(); freezeNow(); freeze.hidden = true; fallFrom = Ppos.clone(); fallCam = camera.position.clone(); toV(); },
        card: function () { S.sky.seen = true; api.save(); freezeNow(); freeze.hidden = true; fallFrom = Ppos.clone(); fallCam = camera.position.clone(); toV(); st.calls.length = 0; dark.style.opacity = '1'; toCard(); } };
      if (map[nm]) map[nm](); return st.ph;
    }
    return { casters: casters, tick: tick, state: state, open: open, ground: ground, speed: function (k) { st.speed = Math.max(0.1, Math.min(8, +k || 1)); }, beat: beat, census: census, duetTap: duetTap, answer: answer, wake: wake, skip: crDone, freezeOk: freezeOk, LINES: LINES };
  }
  return { create: create, CREDITS: CREDITS, LINES: LINES, GRANDMA: GRANDMA, FREEZE: FREEZE, CARD: CARD };
})();
