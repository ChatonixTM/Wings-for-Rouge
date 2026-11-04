<!-- 725a CORRECTION, ON TOP (Nov 4 2026, Trunks; plan 725: "A correction goes on TOP of SOURCE.md:31, not through it"). -->
> **725a correction (Nov 4 2026), read before line 31 below.** Line 31 says the renderer reads the pole at (969, 979) and an inner radius of 845. Those are the
> EYE-READ numbers of Sept 6, 8am. The numbers measured BY PIXEL (the same file, line 29) are the pole at **(1009, 1021)** and the map's edge at **r = 869**, and
> the game (`world712-mapview.js`, PAPER725) uses only those. Re-measured Nov 4 by pixel on this very file: the pin's dark blob centres at (1008.3, 1019.9),
> within 1.2 px of (1009, 1021). This copy rides with Wings for Rouge (`gifts/rouge-birthday-2026/assets/gleason/`); the original stays in `face/assets/gleason/`.
> On this sheet the Greenwich meridian points to the RIGHT (NOON) and 90 E points UP; the game's map puts Greenwich DOWN, so the paper is laid turned. The turn
> (-89.775 deg) and the scale (4.7765 px a degree from the pole; the South Pole at r = 860) were fitted to six of the sheet's painted islands, measured by pixel
> (tests/map725-paper.json): every island within 3.1 deg, rms 1.9 deg. Found on the way: the sheet's PRINTED meridians meet at (1014.6, 1028.2), 10 px from the
> pin; the pin is not exactly the printed pole (registered there the six give rms 1.6 deg). The game keeps the plan's pin until Marth chooses.
>
> **The game's copy is the LAYOUT ONLY (725a review, Nov 4 2026).** Everything outside the map's edge (r = 869 px around (1009, 1021)) is blanked to the
> sheet's own paper colour (228, 225, 212), so the text around the disc (the motto, the patent block, the calculator headings, the hour dial) does not ship
> with her app; the frame stays 2048 x 2048, so every registration number above stands. Made by `tools/wiring/make-725a-disc.js` from the archival original,
> sha256 a09d2e4b2fe487aef1db78dedf7bea69ff607b852ada5fc44c9104bfc52e3031. The archival original, whole, and its full catalogue record stay in the workshop's `face/assets/gleason/`.

# Gleason's New Standard Map of the World (1892) — provenance

*Every asset in this house carries its source beside it, the way the ASV does. This file is the source of `gleason-1892-disc-2048.jpg`.*

## The work
- **Work:** Gleason's New Standard Map of the World (1892). The full catalogue record rides with the archival original in the workshop (`face/assets/gleason/SOURCE.md`), not with the game.
- **Cartographer:** Alexander Gleason · **Publisher:** Buffalo Electrotype and Engraving Co., Buffalo, N.Y.
- **Date:** 1892 (patent allowed November 15, 1892, printed on the sheet)
- **Physical:** 1 map, coloured, 30 cm diameter on a sheet 55 × 39 cm. The scan shows the original brass pointer arm still mounted at the pole — it is part of the artefact, not damage.

## The scan, and its rights
- **Holder / scanner:** Norman B. Leventhal Map & Education Center at the Boston Public Library, via Digital Commonwealth
- **Record:** https://collections.leventhalmap.org/search/commonwealth:7h149v85z
- **IIIF manifest:** https://collections.leventhalmap.org/search/commonwealth:7h149v85z/manifest
- **IIIF image service:** https://iiif.digitalcommonwealth.org/iiif/2/commonwealth:7h149v867
- **Original scan size:** 4773 × 6794 px (full-resolution TIF 92.8 MB; full JPEG 7.79 MB — neither was pulled)
- **Rights statement, verbatim from the record and the manifest:** *No known copyright restrictions. No known restrictions on use.*
- The work itself was published in 1892 and is in the public domain in the United States (published before January 1, 1931 — confirmed separately on the Wikimedia Commons copy of the same Leventhal scan, which is only 562 × 800 px and was not used for that reason).

## What was pulled, exactly
- **File:** `gleason-1892-disc-2048.jpg`
- **Request:** `…/commonwealth:7h149v867/256,1252,4290,4290/2048,/0/default.jpg` — the IIIF Image API cropped the disc **at the source** (region x=256 y=1252, 4290 × 4290 px of the original) and resized to 2048 px wide; nothing was resampled locally.
- **How the region was found:** an 800-px preview was fetched to the scratchpad, the disc measured by eye at centre (403, 570), outer radius ≈ 360 px of 801 × 1139, and scaled by 4773 / 801 ≈ 5.959. The crop includes the pink hour-dial ring (the *longitude and time calculator*) because it is part of the 1892 map; a renderer that wants only the inner map masks it.
- **Pulled:** Sept 6 2026, at Marth's word — *"yes you may download the map once everything is situated"* — after the tree was clean, Obito had ruled PROCEED on the morning's commits, and the dependency guard was in place.

## Why it is here
Marth, Sept 6 2026: *"i wanna add the gleason map at the base of the 'firmament' mode"* — the floor under the galaxy, which today is drawn as the Gleason graticule (rings and meridians) in `face/app.js` `drawGround()`. This image is the map that graticule has always been standing in for. He also noted: *"we may have to use google maps and use topography maps to get actual scaling"* — a scaling question for later, logged on the board, not decided here.

**Measured on the pulled file — first by eye, then by pixel.** By eye (Sept 6, 8am): the pole at about (969, 979). By pixel (Sept 6, 10:20am, after Marth saw the map's pole and the graticule's did not coincide): PNG crops from the same IIIF service at native resolution, decoded with Node's own zlib, the pin's hole taken as the darkest blob near centre — **the pole is at (1009, 1021) of 2048 × 2048** (original scan (2369, 3391)); the eye was ~40 px off on both axes. The two black rings at the edge of the degree band lie at **r ≈ 860 and 878**, so the map's edge is taken as **r = 869**; the pink hour-dial lies outside that and reaches the frame on all four sides. A renderer takes the centre and radius from these numbers, never from 1024/1024 — and never from an eye.

**Wired, Sept 6 2026** — `drawGleason()` in `face/app.js`, called by `drawGround()` for the cluster floor only (`map: GLEASON`), drawn under the graticule. The method is the triangle-subdivided draw (6 rings × 24 wedges, seams under the drawn lines, affine per triangle through the same `project()` the rings use), cached to an offscreen canvas per camera key, skipped whenever the camera is beneath the plane. The constants the renderer reads — pole (969, 979), inner radius 845 to the black edge rings — are the measurements above. The firmament vantage was levelled the same hour (`VANTAGE_PITCH = 0` in `firmament.js`); at the steady camera the floor now covers ~27% of a desktop frame and ~35% of a 390 × 844 phone, measured with Shisui's `floor.js`, up from 11% / 8%. His eye decides the rest: the alpha (0.62), whether the pink hour-dial should show (raise `r` toward the frame), the orientation, and the final pitch.
