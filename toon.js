/* toon.js - BOARD 687, THE WIND WAKER PASS, step 1 (Marth, Oct 22, verbatim: "man the game graphics look the same", then he chose
   "1  wind waker style pass"). Trunks, Oct 22 2026, to Itachi's plan. Written by tools/wiring/wire-687-windwaker.js.

   r128's Lambert works its light out per VERTEX; its fragment shader then multiplies the sun's light by the shadow in ONE line. This file
   rewrites that line, once, before anything compiles:
     the sun's share = its light over the sun's own colour (so the bands hold still while atmo.js tints the sun through the day)
                       x the shadow, through smoothstep(0.35, 0.65) (so shadow-map noise is not cut into stripes)
     snapped to THREE steps with narrow soft edges: shade 0 . half-light 0.55 . full sun 1.
   The sky's fill (the hemisphere) is left smooth, so shade stays the cool sky colour and the night barely changes.
   Why it costs nothing: three keys a built-in material's program by its shader NAME and settings, never by its source text: no new
   program, the same count, the same keys (measured with __wfr.gl(), toon on and off). One sun only: with any other count of
   directional lights the old line runs untouched (the normalising would be wrong).
   Reaches every MeshLambertMaterial: the ground (its own textures.js patch still finds its anchors), houses, people, props, the bird.
   Does not reach: the trees (MeshStandard: next), the sea (Phong), sprites, halos, glows, UI, particles.
   ?toon=0 in the address: not patched, the old look. NEVER switch it while the game runs: that recompiles every program (trap 651).
   WFR_TOON = { on, landed, why }                                                                                                      */
window.WFR_TOON = (function () {
  'use strict';
  var st = { on: false, landed: false, why: '' };
  var BAND = [
    '#if NUM_DIR_LIGHTS == 1',
    '  { // wfr687toon: the sun in three steps (board 687)',
    '    vec3 tnC = PI * directionalLights[ 0 ].color;',
    '    vec3 tnW = vec3( 0.2126, 0.7152, 0.0722 );',
    '    float tnK = clamp( dot( reflectedLight.directDiffuse, tnW ) / max( dot( tnC, tnW ), 0.0001 ), 0.0, 1.0 );',
    '    float tnV = tnK * smoothstep( 0.35, 0.65, getShadowMask() );',
    '    float tnB = 0.55 * smoothstep( 0.10, 0.16, tnV ) + 0.45 * smoothstep( 0.42, 0.48, tnV );',
    '    reflectedLight.directDiffuse = tnC * tnB * BRDF_FN( diffuseColor.rgb );',
    '  }',
    '#else',
    '  ORIGINAL',
    '#endif'].join('\n');
  try {
    if (/[?&]toon=0(&|$)/.test(location.search)) { st.why = 'off: ?toon=0'; return st; }
    var T = window.THREE, L = T && T.ShaderLib && T.ShaderLib.lambert;
    if (!L || typeof L.fragmentShader !== 'string') { st.why = 'no THREE.ShaderLib.lambert'; return st; }
    var re = /reflectedLight\.directDiffuse \*= (BRDF_\w+)\( diffuseColor\.rgb \) \* getShadowMask\(\);/;
    var all = L.fragmentShader.match(new RegExp(re.source, 'g')) || [];
    if (all.length !== 1) { st.why = 'the anchor line occurs ' + all.length + ' times in r' + T.REVISION + "'s Lambert shader: not patched"; return st; }
    var m = L.fragmentShader.match(re), band = BAND.replace('BRDF_FN', m[1]).replace('ORIGINAL', m[0]);
    L.fragmentShader = L.fragmentShader.replace(m[0], function () { return band; });
    if (T.ShaderChunk && typeof T.ShaderChunk.meshlambert_frag === 'string') T.ShaderChunk.meshlambert_frag = T.ShaderChunk.meshlambert_frag.replace(m[0], function () { return band; });   // the same text in both places (ShaderLib holds a copy made at load)
    st.on = st.landed = true; st.why = 'patched';
  } catch (e) { st.why = 'threw: ' + e.message; }
  return st;
})();
