/* fall748.js - BOARD 748, ANIMALS CAN FALL, EVERY ONE HIT ITS OWN WAY (Wings for Rouge). Trunks, Nov 6 2026. Wired by tools/wiring/wire-748-fall.js; guard tests/fall748.js.
   Marth, Nov 6 2026, verbatim: "Yes add unique hit animations for each animal 🦒 🦓 🦔 and their region. The animas should “die” but make them fade away kinda white ish - the amount of hits depend on the size and type of animal. Also make sometimes they drop coins"
   WHAT IS HERE: ONE table (ROW) of every animal's hit points, body family, coin chance and throw; the motions (FAM: one per family; FLAV: each kind its own row);
   the fade (a white copy of the animal laid over it, then the body gone and the copy fading into a soft glow); the coins (they drop, shine, and are picked up on touch).
   No gore, no body, no blood: at zero it stops, turns white and is gone. Nothing is ever disposed (a pool, built once, compiled at boot). Every number a DRAFT for his thumb. */
window.WFR_FALL748 = (function () {
  'use strict';
  var TAU = Math.PI * 2;
  /* C: PECK damage per beak dip (a press lands two, so a press is 1); SWEEP damage per sweep; WHITE s the body turns white; GONE s the white fades into the glow; BACK s before a fallen animal may return
     (and only out of her sight: island past its sleep line, world past BACK_R m); COIN_LIFE s a coin lies there; COIN_R / COIN_RF her touch on foot / in the air, island; COIN_T her touch past the gate */
  var C = { PECK: 0.5, SWEEP: 1.2, WHITE: 0.45, GONE: 0.8, BACK: 240, BACK_R: 300, COIN_LIFE: 60, COIN_R: 1, COIN_RF: 1.6, COIN_T: 3.5, COIN_FAR: 500, FLASH: 0.18 };
  /* THE TABLE: kind: [hit points, family, coin chance, throw size]. At Lv 5 a peck press does 0.85, at Lv 45 1.4; the Gust Feather adds to the sweep. Families: big, small, serpent, bird, sea, tiny */
  var ROW = {
    crab: [1, 'tiny', 0.10, 1.6], mongoose: [1.3, 'small', 0.15, 1.3], boa: [2.95, 'serpent', 0.30, 1], gull: [1.2, 'bird', 0.12, 1.2], pelican: [2.4, 'bird', 0.20, 0.8], turtle: [3, 'sea', 0.20, 0.5], barracuda: [2.2, 'sea', 0.20, 0.8], dolphin: [4, 'sea', 0.30, 0.35], shark: [6, 'sea', 0.40, 0.3],
    reeffish: [0.6, 'sea', 0.05, 1.6], trout: [0.8, 'sea', 0.06, 1.4], poolfish: [0.6, 'sea', 0.05, 1.6], seal: [3, 'sea', 0.25, 0.5], sealion: [3.4, 'sea', 0.25, 0.5], walrus: [7, 'sea', 0.40, 0.2], manta: [7, 'sea', 0.40, 0.15], orca: [14, 'sea', 0.60, 0.1], whale: [24, 'sea', 0.75, 0.05],
    toucan: [1, 'bird', 0.10, 1.3], macaw: [1.1, 'bird', 0.12, 1.2], egret: [1.6, 'bird', 0.14, 1], flamingo: [1.6, 'bird', 0.14, 1], crane: [2.2, 'bird', 0.20, 0.8], stork: [2.2, 'bird', 0.20, 0.8], eagle: [3, 'bird', 0.28, 0.7], condor: [3.6, 'bird', 0.30, 0.6],
    iguana: [1.4, 'serpent', 0.12, 1.2], alligator: [5.5, 'serpent', 0.40, 0.3], saltcroc: [7, 'serpent', 0.45, 0.2],
    arcticfox: [1.4, 'small', 0.14, 1.2], penguin: [1.4, 'small', 0.14, 1.1], redfox: [1.6, 'small', 0.15, 1.2], koala: [1.6, 'small', 0.15, 1], macaque: [1.6, 'small', 0.15, 1.2], goat: [2.2, 'small', 0.20, 0.9], boar: [3.6, 'small', 0.28, 0.6], hedgehog: [1.2, 'small', 0.12, 1.3],
    emu: [3, 'big', 0.25, 0.7], deer: [3.2, 'big', 0.25, 0.7], kangaroo: [3.6, 'big', 0.25, 0.7], llama: [3.6, 'big', 0.28, 0.6], reddeer: [4, 'big', 0.30, 0.6], ostrich: [4.4, 'big', 0.30, 0.5], snowleopard: [4.4, 'big', 0.30, 0.6], caribou: [4.6, 'big', 0.30, 0.5], zebra: [5, 'big', 0.32, 0.5], jaguar: [5, 'big', 0.32, 0.5], panda: [5, 'big', 0.32, 0.4],
    elk: [6, 'big', 0.35, 0.4], blackbear: [6, 'big', 0.35, 0.4], lion: [6.5, 'big', 0.38, 0.4], camel: [7, 'big', 0.38, 0.35], tiger: [7, 'big', 0.40, 0.35], gorilla: [7, 'big', 0.40, 0.3], brownbear: [8, 'big', 0.42, 0.3], yak: [8, 'big', 0.42, 0.25], moose: [9, 'big', 0.45, 0.25], polarbear: [9, 'big', 0.45, 0.25], bison: [9.5, 'big', 0.45, 0.2],
    giraffe: [10, 'big', 0.50, 0.2], hippo: [11, 'big', 0.50, 0.15], indianelephant: [13, 'big', 0.55, 0.1], elephant: [14, 'big', 0.60, 0.1]
  };
  /* A MOTION: p pitch, r roll, y a turn (rad), l a hop (x its height), f its beats in the motion (negative: only ever one way), b its bones: name: [rx, ry, rz, beats, lift]. All swell and die away over the hit.
     FAM: every animal of the family does this. */
  var FAM = {
    big: { r: 0.05, f: 2, b: { body: [-0.16, 0, 0.06, 2], head: [0.3, 0, 0, 0], legFL: [-0.3, 0, 0, 2], tail: [0, 0.6, 0, 3] } },   /* it staggers: the front half gives, the head goes down, the tail flicks */
    small: { r: 0.3, f: 1.5, l: 0.28, b: { body: [-0.35, 0, 0, 0], head: [0.4, 0.4, 0, 2], tail: [-0.5, 0, 0, 0] } },   /* it jumps sideways, off its feet */
    serpent: { r: 0.42, f: 2.5, b: { tail: [0, 0.9, 0, 3], head: [-0.35, 0.4, 0, 3] } },   /* it thrashes: the long body rolls, the tail whips */
    bird: { p: -0.45, r: 0.55, f: 1.5, l: 0.5, b: { wL: [0, 0, 0.9, 3], wR: [0, 0, -0.9, 3], wL2: [0, 0, 0.6, 3], wR2: [0, 0, -0.6, 3], tail: [-0.6, 0, 0, 0], head: [-0.5, 0, 0, 0] } },   /* it tumbles in the air, wings flung out */
    sea: { p: -0.3, r: 0.5, f: 2, l: 0.3 },   /* it rolls and shudders, the tail thrashing (the swimmers bend by speed: their pose is sped up) */
    tiny: { l: 0.32, y: TAU }   /* it spins up off the ground */
  };
  /* FLAV: added over the family: EVERY kind has a row and no two rows are the same (tests/fall748.js T1 and M1), but the boa (its own strike and recoil) and the pool fish (nothing reaches the pool).
     Bones reach a four-legged, winged or flippered rig only: the crab, the penguin and every swimmer but the turtle answer through the body's p r y l f. y must be a whole turn: it is not eased back, so anything less snaps at the end */
  var FLAV = {
    giraffe: { b: { head: [-0.12, 0.62, 0.3, 1.5] } },   /* the long neck sways */
    zebra: { b: { body: [-0.72, 0, 0, 0], head: [0.5, 0, 0, 0], legFL: [-1.1, 0, 0, 2], legFR: [-0.9, 0, 0, 2], tail: [-0.6, 0, 0, 0] } },   /* it rears */
    elephant: { b: { body: [-0.14, 0, 0, 0], legFL: [-0.8, 0, 0, -2, 0.12], head: [-0.42, 0.14, 0, 1] } },   /* it stamps, head and trunk thrown up */
    indianelephant: { b: { body: [-0.14, 0, 0, 0], legFR: [-0.8, 0, 0, -2, 0.12], head: [-0.42, -0.14, 0, 1] } },
    hippo: { b: { head: [-0.75, 0, 0, 0], body: [-0.12, 0, 0, 0] } },   /* the huge mouth gapes up */
    lion: { b: { body: [-0.3, 0, 0, 0], legFR: [-1.4, 0, 0.3, 1.5], head: [-0.25, 0.45, 0, 1.5] } },   /* it swats back */
    tiger: { b: { body: [-0.3, 0, 0, 0], legFL: [-1.4, 0, -0.3, 1.5], head: [-0.25, -0.45, 0, 1.5] } },
    jaguar: { b: { body: [-0.25, 0, 0, 0], legFR: [-1.2, 0, 0.3, 2] } },
    snowleopard: { b: { body: [-0.25, 0, 0, 0], legFL: [-1.2, 0, -0.3, 2], tail: [-0.9, 0, 0, 2] } },
    kangaroo: { l: 0.55, b: { tail: [0.8, 0, 0, 0], legHL: [0.7, 0, 0, 0], legHR: [0.7, 0, 0, 0] } },   /* it bounds back on its tail */
    camel: { b: { head: [-0.6, 0, 0, 1], body: [0.1, 0, 0, 0] } },   /* the neck snakes back and spits forward */
    moose: { b: { head: [0.35, 0.5, 0, 3] } },   /* the great antlers shake */
    elk: { b: { head: [0.3, 0.42, 0, 3] } },
    reddeer: { b: { head: [-0.85, 0, 0, 0], body: [-0.12, 0, 0, 0], tail: [0.35, 0, 0, 0] } },   /* the stag throws back its head and roars */
    caribou: { r: 0.14, f: 2, b: { legFL: [-1, 0, 0, -3], legFR: [-1, 0, 0, -2], head: [-0.3, -0.2, 0, 2] } },   /* it trots off high-stepping */
    deer: { l: 0.45, b: { tail: [1.2, 0, 0, 0], legHL: [0.8, 0, 0, 0], legHR: [0.8, 0, 0, 0], head: [-0.45, 0, 0, 0] } },   /* it springs, the white tail flagging up */
    llama: { b: { body: [0.35, 0, 0, 0], legHL: [1, 0, 0, -2], legHR: [1, 0, 0, -2], head: [-0.5, 0.3, 0, 1.5] } },   /* it lowers its front and kicks out behind */
    bison: { b: { head: [0.55, 0, 0, 0], legFL: [-0.7, 0, 0, 3], legFR: [0.5, 0, 0, 3] } },   /* head down, it paws the ground */
    yak: { b: { head: [0.45, 0.3, 0, 2], legFR: [-0.6, 0, 0, 3] } },
    gorilla: { b: { body: [-0.55, 0, 0, 0], legFL: [-1.3, 0, 0, 3], legFR: [-1.3, 0, 0, -3] } },   /* it rears and beats its chest */
    blackbear: { b: { body: [-0.95, 0, 0, 0], head: [0.55, 0, 0, 0], legFL: [-0.7, 0, 0, 2], legFR: [-0.7, 0, 0, 2] } },   /* it stands up on its hind legs */
    brownbear: { b: { body: [-1, 0, 0, 0], head: [0.55, 0, 0, 0], legFL: [-0.8, 0, 0, 2], legFR: [-0.8, 0, 0, 2] } },
    polarbear: { b: { body: [-1.05, 0, 0, 0], head: [0.6, 0, 0, 0], legFL: [-0.9, 0, 0, 2], legFR: [-0.9, 0, 0, 2] } },
    panda: { b: { body: [-0.5, 0, 0, 0], head: [0.3, 0.3, 0, 2] }, r: 0.3, f: 1 },   /* it rocks back on its seat */
    ostrich: { l: 0.2, b: { head: [0.4, 0.7, 0.3, 3] } },   /* the neck whips */
    emu: { l: 0.3, b: { legHL: [-1.3, 0, 0, -2], head: [-0.45, 0.3, 0, 2.5], body: [-0.22, 0, 0, 0] } },   /* it kicks forward with one big foot */
    mongoose: { b: { body: [-0.9, 0, 0, 0], head: [0.75, 0, 0, 0] } },   /* it stands up, shocked */
    turtle: { b: { fFL: [0, 0.8, 0, 0], fFR: [0, -0.8, 0, 0], head: [0.5, 0, 0, 0] }, r: 0.7, f: 1 },   /* it pulls in and rolls */
    whale: { r: 0.22, f: 1, p: -0.12 }, orca: { r: 0.6, f: 2.5 }, shark: { r: 0.7, f: 3 },   /* a slow great roll; a hard thrash */
    crab: { p: -0.5, r: 0.35, f: 3 },   /* it rears on its back legs, rocking, as it spins */
    arcticfox: { l: 0.55, p: 0.5, b: { head: [0.45, 0, 0, 0], tail: [0.7, 0, 0, 0] } },   /* it pounces high and nose-down, as it does through snow */
    redfox: { r: 0.25, f: 2.5, b: { tail: [0.3, 1.1, 0, 2.5], head: [0, -0.6, 0, 1] } },   /* it twists, the brush flung round */
    penguin: { p: 0.95, l: -0.18, r: -0.2, f: 3 },   /* it flops onto its belly */
    koala: { r: -0.2, f: 1, l: -0.2, b: { legFL: [-1.2, 0, 0.4, 0], legFR: [-1.2, 0, -0.4, 0], head: [0.5, 0, 0, 0] } },   /* slow: it hugs its arms in and sags */
    macaque: { l: 0.4, b: { body: [-0.6, 0, 0, 0], legFL: [-1, 0, 0.6, 3], legFR: [-1, 0, -0.6, -3], head: [-0.4, 0, 0, 0] } },   /* it leaps up shrieking, arms flailing */
    goat: { b: { body: [-0.7, 0, 0, 1], head: [0.9, 0, 0, 0], legFL: [-0.6, 0, 0, 1], legFR: [-0.6, 0, 0, 1] } },   /* chin tucked, it rears, then butts down */
    boar: { l: -0.2, b: { head: [0.35, 0.55, 0.2, 2.5], body: [0.2, 0, 0, 0], tail: [0.9, 0, 0, 0] } },   /* head low, it hooks with its tusks, the tail straight up */
    hedgehog: { r: -0.3, f: 1.5, l: -0.28, p: 0.75, b: { body: [1, 0, 0, 0], head: [1.1, 0, 0, 0], legFL: [-1.1, 0, 0, 0], legFR: [-1.1, 0, 0, 0], legHL: [1.1, 0, 0, 0], legHR: [1.1, 0, 0, 0], tail: [0.5, 0, 0, 0] } },   /* 749: it does not jump: it tucks head and feet in, as Pip's family does */
    iguana: { r: -0.3, b: { head: [0.4, 0, 0, 4], body: [-0.3, 0, 0, 0], tail: [0, 0.5, 0, 1.5] } },   /* it bobs its head and lashes its tail */
    alligator: { r: 1.5, f: 1, b: { legFL: [0, 0, 0.6, 0], legFR: [0, 0, -0.6, 0], head: [0.2, 0, 0, 0] } },   /* the death roll, legs tucked */
    saltcroc: { p: -0.7, l: 0.4, b: { head: [-0.6, 0, 0, 0], tail: [0.5, 0, 0, 0], legFL: [-0.8, 0, 0, 2], legFR: [-0.8, 0, 0, 2] } },   /* it lunges up on its tail, jaws high */
    gull: { b: { head: [-0.7, 0.3, 0, 3], wL: [0, 0, 0.4, -4], wR: [0, 0, -0.4, -4] } },   /* it screams, the head jerking, the wings beating hard */
    pelican: { p: 0.35, b: { head: [0.9, 0, 0, 2], wL2: [0, 0, -0.7, 0], wR2: [0, 0, 0.7, 0] } },   /* the heavy pouch swings it nose-down, the wingtips folding */
    toucan: { r: 0.3, f: 2.5, b: { head: [0.2, 0.9, 0, 2.5] } },   /* the big bill swings it side to side */
    macaw: { b: { tail: [-0.5, 0.7, 0, 3], wL: [0, -0.5, 0, 2], wR: [0, 0.5, 0, -2], head: [0.45, 0, 0.3, 3] } },   /* it shrieks, the long tail flaring */
    egret: { p: -0.4, b: { head: [-0.9, 0, 0, 1.5], wL2: [0, 0, 0.7, -3], wR2: [0, 0, -0.7, -3] } },   /* it rears upright, neck stretched, wingtips flared */
    flamingo: { l: -0.2, b: { head: [-0.5, 0.85, 0, 2], tail: [0, 0.4, 0, 2] } },   /* head-flagging: the long neck swings left and right */
    crane: { l: 0.5, b: { head: [0.85, 0, 0, 1], wL: [0, 0, 0.5, -1], wR: [0, 0, -0.5, -1] } },   /* it bows and leaps, as in its dance */
    stork: { b: { head: [-1.1, 0.25, 0, -5], tail: [0.5, 0, 0, 0] } },   /* the head thrown back, the bill clattering */
    eagle: { p: 0.3, r: -0.3, b: { wL: [0, -0.7, -0.5, 0], wR: [0, 0.7, 0.5, 0], head: [0.6, 0, 0, 0] } },   /* it mantles, wings hunched forward over itself */
    condor: { l: -0.3, b: { wL: [0, 0, -0.7, 3], wR: [0, 0, 0.7, 3], wL2: [0, 0, 0.8, 1], wR2: [0, 0, -0.8, 1], head: [0.3, -0.4, 0, 1] } },   /* the great wings hardly beat: one slow heave */
    barracuda: { p: -0.5, l: 0.25, r: -0.35, f: 4 },   /* it snaps upward and shivers */
    dolphin: { l: 0.9, p: -0.55, r: 0.2, f: 1.5 },   /* it leaps clear */
    reeffish: { y: TAU, r: -0.3, f: 5 },   /* it flicks right round */
    trout: { l: 0.7, p: -0.9, r: 0.4, f: 5 },   /* it jumps, shaking */
    seal: { r: 0.9, f: 1, l: -0.2 },   /* it rolls onto its side */
    sealion: { p: -1, l: 0.2, r: -0.4, f: 3 },   /* it rears up tall, barking */
    walrus: { p: 0.4, l: -0.22, r: -0.38, f: 1 },   /* the great weight heaves forward, tusks down */
    manta: { y: -TAU, r: 0.6, f: 1, l: 0.5 }   /* the wide wings wheel over */
  };
  /* 750: the new waters. Hit points by size: a minnow falls to a touch, a sperm whale takes the most of all. Each its own motion (a swimmer answers through its whole body) */
  Object.assign(ROW, { minnow: [0.3, 'sea', 0.03, 1.8], jellyfish: [0.5, 'sea', 0.05, 1.4], seatrout: [1, 'sea', 0.09, 1.3], bass: [1.1, 'sea', 0.10, 1.2], salmon: [1.2, 'sea', 0.10, 1.2], pacsalmon: [1.2, 'sea', 0.10, 1.2], octopus: [2, 'sea', 0.18, 0.8], moray: [2.2, 'serpent', 0.20, 0.8], stingray: [3, 'sea', 0.22, 0.5], tuna: [3.5, 'sea', 0.28, 0.4],
    swordfish: [6, 'sea', 0.38, 0.3], hammerhead: [8, 'sea', 0.45, 0.2], beluga: [9, 'sea', 0.45, 0.18], narwhal: [10, 'sea', 0.50, 0.16], greatwhite: [12, 'sea', 0.55, 0.12], spermwhale: [30, 'sea', 0.85, 0.04], tortoise: [6, 'big', 0.30, 0.15] });
  Object.assign(FLAV, {
    minnow: { y: TAU, l: 0.5, r: 0.2, f: 6 },   /* a flash of silver, right round */
    salmon: { l: 1, p: -1.1, r: 0.25, f: 4 },   /* it leaps, as at a weir */
    pacsalmon: { l: 0.85, p: -0.95, r: -0.45, f: 3.5 },
    seatrout: { l: 0.6, p: -0.75, r: 0.55, f: 5.5 },
    bass: { p: -0.65, r: 0.45, f: 4.5, l: 0.35 },   /* it shakes its head at the surface */
    tuna: { r: 0.3, f: 6, l: 0.2, p: 0.25 },   /* it shivers and sounds */
    swordfish: { p: -0.85, l: 0.75, r: 0.9, f: 2 },   /* it walks up on its tail, the sword high */
    hammerhead: { r: -0.8, f: 3.5, p: 0.2 },   /* the wide head swings side to side */
    greatwhite: { p: -0.7, l: 0.6, r: 0.35, f: 1.5 },   /* it breaches */
    spermwhale: { r: 0.16, f: 0.5, p: -0.2, l: -0.1 },   /* the slowest roll of all */
    beluga: { r: 0.5, f: 1, p: 0.15, l: 0.1 },   /* the white back rolls, soft */
    narwhal: { p: -0.4, r: -0.25, f: 1.5, l: 0.15 },   /* the tusk lifts */
    moray: { r: 0.8, f: 4, y: -TAU },   /* the ribbon whips round */
    octopus: { y: TAU, l: 0.7, p: 0.35 },   /* it jets away, turning */
    jellyfish: { l: 0.4, r: 0.12, f: 1 },   /* it drifts up on one soft pulse */
    stingray: { p: -0.6, l: 0.55, r: -0.6, f: 2 },   /* it flips up, the wings over */
    tortoise: { l: -0.12, b: { head: [0.8, 0, 0, 0], legFL: [0.6, 0, 0.5, 0], legFR: [0.6, 0, -0.5, 0], tail: [0.4, 0, 0, 0] } }   /* it pulls in and sits down in its shell */
  });
  /* 787: the world's snakes (world-animals.js), each its hit points by size and its own motion (no bones: the whole body answers) */
  Object.assign(ROW, { yellowboa: [2.95, 'serpent', 0.30, 1], rattlesnake: [1.6, 'serpent', 0.20, 1.2], grasssnake: [0.9, 'serpent', 0.10, 1.5], carpetpython: [3.2, 'serpent', 0.30, 0.9], python: [5, 'serpent', 0.38, 0.5], anaconda: [7, 'serpent', 0.45, 0.3] });
  Object.assign(FLAV, {
    yellowboa: { r: 0.6, f: 3, l: 0.1 },   /* it writhes */
    rattlesnake: { p: -0.5, r: 0.3, f: 6, l: 0.15 },   /* it rears and rattles */
    grasssnake: { r: 1.3, f: 1, l: -0.1 },   /* it rolls over and plays dead, as grass snakes do */
    carpetpython: { r: 0.5, f: 4, l: 0.2, p: -0.3 },   /* it coils and lifts */
    python: { r: 0.75, f: 2, p: -0.2 },   /* a heavy thrash */
    anaconda: { r: 0.95, f: 1.5, y: TAU }   /* the great body rolls right round */
  });
  function row(k) { return ROW[k] || [3, 'small', 0.2, 0.7]; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function damage(how, lv, gear) {   /* the 744 scale: her level and her weapon, the same numbers as the throw */
    var H = window.WFR_ANIMALS ? WFR_ANIMALS.HIT : null, sw = how === 'sweep', f = 1, g = 1;
    if (H) { var L = H.LV, u = clamp(((+lv || L[0]) - L[0]) / (L[2] - L[0]), 0, 1), G = window.WFR_ANIMALS.gearOf(gear); f = L[1] + (L[3] - L[1]) * u; g = G[sw ? 1 : 0]; }
    return (sw ? C.SWEEP : C.PECK) * f * g;
  }
  function hp(k) { return row(k)[0]; }
  function back(how, k, lv, gear) { var A = window.WFR_ANIMALS; return A && A.hitDist ? A.hitDist(how, 'boa', lv, gear) * row(k)[3] : 0; }   /* the throw: 744's sum at size 1, times this kind's size */
  function hash(s) { var h = 2166136261 >>> 0; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return h >>> 0; }
  var chanceOver = null;
  function roll(k, seed) { var c = chanceOver != null ? chanceOver : row(k)[2]; return hash(k + ':' + seed) / 4294967296 < c; }   /* does this fall drop a coin? the same kind and seed always answer the same */
  function osc(f, u) { return !f ? 1 : f < 0 ? Math.abs(Math.sin(TAU * f * u)) : Math.sin(TAU * f * u); }
  function names(m) { if (m.n748) return m.n748; var o = {}, B = m.bones || [], i; for (i = 0; i < B.length; i++) o[B[i].name] = i; o.rig748 = !!(o.legFL != null || o.wL != null || o.fFL != null); m.n748 = o; return o; }
  function pose(m, k, u, how, bonesPose) {   /* after the kit's own pose: the hit's bones laid over it (a rig that bends by bones: four legs, wings, flippers; the rest answer through body()) */
    var n = names(m), g = how === 'sweep' ? 1.3 : 1, e = Math.sin(Math.PI * clamp(u, 0, 1)) * g, L = [FAM[row(k)[1]], FLAV[k]], s, name, q, i, w, did = false;
    if (!n.rig748) return false;
    for (s = 0; s < 2; s++) { if (!L[s] || !L[s].b) continue; for (name in L[s].b) { i = n[name]; if (i == null) continue; q = L[s].b[name]; w = e * osc(q[3], u); m.rot[i * 6] += q[0] * w; m.rot[i * 6 + 1] += q[1] * w; m.rot[i * 6 + 2] += q[2] * w; if (q[4]) m.rot[i * 6 + 4] += q[4] * w; did = true; } }
    if (did && bonesPose) bonesPose(m); return did;
  }
  var BODY = { p: 0, r: 0, y: 0, l: 0 };
  function body(k, u, how, h) {   /* the whole body's share of the hit: pitch, roll, turn, hop (h: its height, m) */
    var g = how === 'sweep' ? 1.3 : 1, e = Math.sin(Math.PI * clamp(u, 0, 1)) * g, L = [FAM[row(k)[1]], FLAV[k]], s, M, w;
    BODY.p = 0; BODY.r = 0; BODY.y = 0; BODY.l = 0;
    for (s = 0; s < 2; s++) { M = L[s]; if (!M) continue; w = e * osc(M.f, u); BODY.p += (M.p || 0) * e; BODY.r += (M.r || 0) * w; BODY.y += (M.y || 0) * clamp(u, 0, 1); BODY.l += (M.l || 0) * e * (h || 1); }
    return BODY;
  }

  /* ---------- the pictures: a pool built once (never disposed), every program compiled at boot through warm() ---------- */
  var X = null, GH = [], GL = [], CN = [], JOBS = [], ring = null, hold = null, stat = { flashes: 0, falls: 0, coins: 0, picked: 0, seen: 0 };
  function canvas(n, draw, THREE) { var c = document.createElement('canvas'); c.width = c.height = n; draw(c.getContext('2d'), n); return new THREE.CanvasTexture(c); }
  function attach(io) {
    if (X) return true; var THREE = io.THREE, i, L = io.layer || 7;
    var both = function (o) { o.layers.enable(0); o.layers.enable(L); o.frustumCulled = false; o.visible = false; io.scene.add(o); return o; };
    var empty = new THREE.BufferGeometry(); empty.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
    var soft = canvas(128, function (g, n) { var r = g.createRadialGradient(n / 2, n / 2, 2, n / 2, n / 2, n / 2); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,253,247,0.92)'); r.addColorStop(1, 'rgba(255,248,235,0)'); g.fillStyle = r; g.fillRect(0, 0, n, n); }, THREE);
    var face = canvas(128, function (g, n) { var c = n / 2; g.fillStyle = '#e8ab1e'; g.fillRect(0, 0, n, n); g.fillStyle = '#ffd95a'; g.beginPath(); g.arc(c, c, 56, 0, TAU); g.fill(); g.strokeStyle = '#b87a10'; g.lineWidth = 7; g.beginPath(); g.arc(c, c, 42, 0, TAU); g.stroke();
      g.fillStyle = '#fff3b0'; g.beginPath(); for (var q = 0; q < 8; q++) { var a = q / 8 * TAU, r = q % 2 ? 9 : 27; g[q ? 'lineTo' : 'moveTo'](c + Math.sin(a) * r, c - Math.cos(a) * r); } g.closePath(); g.fill(); }, THREE);
    for (i = 0; i < 8; i++) { var gm = new THREE.Mesh(empty, new THREE.MeshBasicMaterial({ color: 0xfffaf0, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); gm.name = 'fall748:ghost'; gm.rotation.order = 'YXZ'; gm.renderOrder = 6; GH.push({ o: both(gm), geo0: empty, busy: false }); }
    for (i = 0; i < 4; i++) { var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, depthTest: false, fog: false, toneMapped: false }));   /* a glow: grass and her own wing never cut it */ sp.name = 'fall748:glow'; sp.renderOrder = 7; GL.push({ o: both(sp), busy: false }); }
    var cg = new THREE.CylinderGeometry(1, 1, 0.16, 24); cg.rotateX(Math.PI / 2); var cm = new THREE.MeshBasicMaterial({ map: face, fog: false, toneMapped: false });
    for (i = 0; i < 6; i++) { var co = new THREE.Mesh(cg, cm); co.name = 'fall748:coin'; var sh = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft, color: 0xffd76a, transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false })); sh.name = 'fall748:shine'; CN.push({ o: both(co), sh: both(sh), on: false }); }
    var rg = new THREE.RingGeometry(0.82, 1, 32); rg.rotateX(-Math.PI / 2); ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xfffaf0, transparent: true, opacity: 0.75, depthWrite: false, fog: false, toneMapped: false })); ring.name = 'fall748:aim'; both(ring);
    X = io; return true;
  }
  function warm() { return X ? [GH[0].o, GL[0].o, CN[0].o, CN[0].sh, ring] : []; }   /* atkPose's first three frames draw these too small to see: their programs compile at boot */
  function setGhost(G, s) { var o = G.o; o.geometry = s.geo; o.position.set(s.x, s.y, s.z); o.rotation.set(s.pitch || 0, s.yaw || 0, s.roll || 0); o.scale.setScalar(s.s || 1); o.visible = true; o.material.opacity = 0; }
  function freeG() { for (var i = 0; i < GH.length; i++) if (!GH[i].busy) return GH[i]; return null; }
  function freeL() { for (var i = 0; i < GL.length; i++) if (!GL[i].busy) return GL[i]; return null; }
  function flash(s) { if (!X) return false; var G = freeG(); if (!G) return false; G.busy = true; setGhost(G, s); JOBS.push({ type: 'flash', t: 0, G: G, ll: s.ll || null, y0: s.y }); stat.flashes++; return true; }   /* every blow: a blink of white on the body */
  function fall(s, coin) {   /* s: { geo, x, y, z, yaw, pitch, roll, s, cx, cy, cz, r, ll } */
    if (!X) return false; var G = freeG(), L = freeL(); if (G) { G.busy = true; setGhost(G, s); } if (L) { L.busy = true; L.o.position.set(s.cx, s.cy, s.cz); L.o.visible = true; L.o.material.opacity = 0; }
    JOBS.push({ type: 'fall', t: 0, G: G, L: L, s: s, ll: s.ll || null, coin: !!coin, y0: s.y, cy0: s.cy, sc0: s.s || 1, gr: Math.max(s.r || 1, 0.7) });   /* gr: even a crab's glow can be seen on a phone */ stat.falls++; return true;
  }
  function freeCoin() { var i, old = null; for (i = 0; i < CN.length; i++) { if (!CN[i].on) return CN[i]; if (!old || CN[i].t > old.t) old = CN[i]; } return old; }
  function drop(j, io) {   /* out of the glow: up a little, over to one side, down onto the ground */
    var s = j.s, c = freeCoin(), far = !!io.far, ax = s.cx - io.x, az = s.cz - io.z, L = Math.sqrt(ax * ax + az * az) || 1, d = (s.r || 1) * 0.7 + 1.2, x = s.cx + ax / L * d, z = s.cz + az / L * d;   /* on the far side from her: she sees it land, and goes to it */
    c.on = true; c.t = 0; c.ll = s.ll ? { lat: s.ll.lat, lon: s.ll.lon, dx: x - s.cx, dz: z - s.cz } : null; c.x = x; c.z = z; c.y0 = s.cy; c.r = far ? 0.6 : 0.26; c.far = far; c.o.visible = true; c.sh.visible = true; stat.coins++; c.y = s.cy;
  }
  function coinY(c, io) { var g = io.ground(c.x, c.z) + c.r * 1.25, u = clamp(c.t / 0.7, 0, 1), up = 0.9 * Math.sin(Math.PI * u); return (c.y0 + (g - c.y0) * u * u) + up + (u >= 1 ? 0.06 * Math.sin(c.t * 3) : 0); }
  function tick(dt, io) {   /* game time; io: { x, y, z, far, walk, ground(x, z), local(ll) }; returns the coins she picked up this frame */
    if (!X) return 0; var got = 0, i, j, c, u, p, e;
    for (i = JOBS.length - 1; i >= 0; i--) { j = JOBS[i]; if (hold == null) j.t += dt;
      if (j.ll && io.local) { p = io.local(j.ll); if (j.G) { j.G.o.position.x = p.x; j.G.o.position.z = p.z; } if (j.L) { j.L.o.position.x = p.x; j.L.o.position.z = p.z; } if (j.s) { j.s.cx = p.x; j.s.cz = p.z; } }
      if (j.type === 'flash') { u = j.t / C.FLASH; if (u >= 1) { j.G.o.visible = false; j.G.o.material.opacity = 0; j.G.o.geometry = j.G.geo0; j.G.busy = false; JOBS.splice(i, 1); continue; } j.G.o.material.opacity = 0.6 * (1 - u); continue; }
      var t = hold != null ? (C.WHITE + C.GONE) * hold : j.t;
      if (t < C.WHITE) { u = t / C.WHITE; e = u * u * (3 - 2 * u); if (j.G) j.G.o.material.opacity = 0.95 * e; if (j.L) { j.L.o.material.opacity = 0.9 * e; j.L.o.scale.setScalar(j.gr * 3.2 * (0.6 + 0.4 * e)); } continue; }
      u = (t - C.WHITE) / C.GONE;
      if (j.coin && !j.dropped) { j.dropped = true; drop(j, io); }
      if (j.G) { j.G.o.material.opacity = 0.95 * (1 - u) * (1 - u); j.G.o.position.y = j.y0 + (j.s.r || 1) * 0.35 * u; j.G.o.scale.setScalar(j.sc0 * (1 + 0.08 * u)); }
      if (j.L) { j.L.o.material.opacity = 0.9 * (1 - u); j.L.o.position.y = j.cy0 + (j.s.r || 1) * 0.5 * u; j.L.o.scale.setScalar(j.gr * (3.2 + 1.6 * u)); }
      if (u >= 1) { if (j.G) { j.G.o.visible = false; j.G.o.material.opacity = 0; j.G.o.geometry = j.G.geo0; j.G.busy = false; } if (j.L) { j.L.o.visible = false; j.L.o.material.opacity = 0; j.L.busy = false; } JOBS.splice(i, 1); }
    }
    for (i = 0; i < CN.length; i++) { c = CN[i]; if (!c.on) continue; c.t += dt;
      if (c.ll && io.local) { p = io.local(c.ll); c.x = p.x + c.ll.dx; c.z = p.z + c.ll.dz; }
      c.y = coinY(c, io); c.o.position.set(c.x, c.y, c.z); c.o.rotation.y += dt * 4.5; c.o.scale.setScalar(c.r); c.sh.position.set(c.x, c.y, c.z); var tw = 0.5 + 0.5 * Math.sin(c.t * 7); c.sh.scale.setScalar(c.r * (3.2 + 1.6 * tw)); c.sh.material.opacity = 0.45 + 0.4 * tw;
      var left = C.COIN_LIFE - c.t, blink = left < 6 && Math.floor(left * 5) % 2 === 0; c.o.visible = !blink; var dx = c.x - io.x, dy = c.y - io.y, dz = c.z - io.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz), R = io.far ? C.COIN_T : io.walk ? C.COIN_R : C.COIN_RF, gone = left <= 0 || d > C.COIN_FAR;
      if (c.t > 0.7 && d <= R + (io.walk ? 0.5 : 0)) { got++; stat.picked++; gone = true; }
      if (gone) { c.on = false; c.o.visible = false; c.sh.visible = false; c.sh.material.opacity = 0; } }
    return got;
  }
  function clear() { var i; if (!X) return; for (i = 0; i < JOBS.length; i++) { var j = JOBS[i]; if (j.G) { j.G.o.visible = false; j.G.o.material.opacity = 0; j.G.o.geometry = j.G.geo0; j.G.busy = false; } if (j.L) { j.L.o.visible = false; j.L.o.material.opacity = 0; j.L.busy = false; } } JOBS.length = 0;
    for (i = 0; i < CN.length; i++) { CN[i].on = false; CN[i].o.visible = false; CN[i].sh.visible = false; } if (ring) ring.visible = false; }
  function coinAt(x, y, z) { var c = freeCoin(); c.on = true; c.t = 0; c.ll = null; c.x = x; c.z = z; c.y0 = y; c.y = y; c.r = 0.26; c.far = false; c.o.visible = true; c.sh.visible = true; stat.coins++; return true; }   /* 746: a coin at a door, on the island */
  function coinNear(x, y, z, R) { var best = null, bd = R, i; for (i = 0; i < CN.length; i++) { var c = CN[i]; if (!c.on || c.t < 0.7) continue; var d = Math.sqrt((c.x - x) * (c.x - x) + (c.y - y) * (c.y - y) + (c.z - z) * (c.z - z)); if (d < bd) { bd = d; best = c; } } return best; }
  function mark(x, y, z, r) { if (!ring) return; if (x == null) { ring.visible = false; return; } ring.visible = true; ring.position.set(x, y, z); ring.scale.setScalar(r); }   /* what her swoop would reach */
  function peek() { var g = 0, l = 0, c = [], i; for (i = 0; i < GH.length; i++) if (GH[i].o.visible) g++; for (i = 0; i < GL.length; i++) if (GL[i].o.visible) l++; for (i = 0; i < CN.length; i++) if (CN[i].on) c.push([+CN[i].x.toFixed(2), +CN[i].y.toFixed(2), +CN[i].z.toFixed(2), +CN[i].t.toFixed(2)]);
    return { ready: !!X, stat: Object.assign({}, stat), jobs: JOBS.map(function (j) { return [j.type, +j.t.toFixed(2)]; }), ghosts: g, glows: l, coinsOut: c, ring: !!(ring && ring.visible), hold: hold, chance: chanceOver }; }
  return { C: C, ROW: ROW, FAM: FAM, FLAV: FLAV, row: row, hp: hp, damage: damage, back: back, roll: roll, pose: pose, body: body, attach: attach, warm: warm, flash: flash, fall: fall, tick: tick, clear: clear, coinNear: coinNear, coinAt: coinAt, mark: mark, peek: peek,
    ready: function () { return !!X; }, bench: function (o) { if ('chance' in o) chanceOver = o.chance; if ('hold' in o) hold = o.hold; } };
}());
