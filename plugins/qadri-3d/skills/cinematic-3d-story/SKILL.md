---
name: cinematic-3d-story
description: "Build a cinematic, scroll-driven 3D story site that takes a subject from vision to completion: a procedural three.js world on a fixed canvas driven by a scroll story clock, Apple-style chapter copy, a real camera language (a lens per shot, focus pulls, steadicam drift, letterbox), real imagery (CC0 HDRI skies, PBR textures, scanned-tree billboards, rigged figures) and photoreal AI visualisation plates the 3D model dissolves into ('the model and the reality'), plus scroll-scrubbed video. Includes the measured performance fixes that make it smooth on phones and a one-file bundle that runs inside a claude.ai Artifact. Use for architecture, property, construction, product or brand stories told as a scroll film; for 'build a 3D landing page that goes from plot of land to finished building'; or when a three.js scroll page is choppy on mobile, looks like a game rather than a film, or shows nothing when shared as an artifact."
---

# Cinematic 3D story

A scroll film in three layers, top to bottom:

1. **HTML chapters** that scroll normally and hold their headline in place (CSS sticky).
   Every word is real markup, readable without JavaScript or WebGL.
2. **Visualisation plates**: full-bleed photoreal images (or scrubbed video) that
   dissolve in over the 3D for part of each chapter. "The model and the reality."
3. **One fixed WebGL canvas**: a single continuous world whose every state is a pure
   function of one number, the story clock `c` (0..N, one unit per chapter).

Scrolling moves `c`. Scrolling back runs the film in reverse. Nothing is time-based
except ambient motion (traffic, people, a crane slewing).

Reference implementation: `examples/meridian-house/` (an office tower from blueprint to
occupied top floor, Astro 7 + three r181). Read `tower.ts` before writing a new engine;
copy its structure, not its content.

## Workflow

### 1. Write the film before the code
List the chapters (8-12). For each: the shot (where the camera is, what lens), what
changes in the world, the one headline, one sentence, at most two figures, and whether
it dissolves to a plate. Decide the arc of light (day, golden hour, dusk, night) across
the chapters: light is the cheapest emotional lever you have.

Typical arc for a building: vision (drawing) · site · groundworks · foundations · frame ·
envelope · completion · arrival · interior · ascent · occupation · finale.
For a product: sketch · prototype · materials · assembly · reveal · in use · finale.

### 2. Build the story clock and phases
See `references/story-clock.md`. One `phases(c)` function returns named 0..1 values
(`dig`, `frame`, `glass`, `night`, `doorsOpen` ...) built from `smoothstep` windows.
Everything in the world reads only from these. Camera shots are keyframes
`[c, position, lookAt, fov]` interpolated on centripetal Catmull-Rom curves.

### 3. Build the world procedurally, then make it real
Start with procedural geometry (boxes, extrusions, InstancedMesh for anything repeated)
so the story works end to end in an hour. Then swap in real imagery progressively, as it
loads, without blocking first paint. See `references/real-assets.md`:
- **Sky**: two CC0 HDRIs (day, sunset) blended in a sky shader, each rotated so its
  photographed sun sits where the scene's sun is; light, fog and reflections follow it.
- **Surfaces**: CC0 PBR textures in WebP; tile by world-space UVs, never stretched.
- **Vegetation**: a scanned CC0 tree rendered offline to a two-view billboard atlas
  (`scripts/render-billboard/`), drawn as crossed instanced quads.
- **People**: one rigged, animated mannequin (three.js Xbot) cloned with SkeletonUtils.
  White figures read as architectural-model people, which is right for archviz.
- **Furniture/props**: small CC0 glTF models, meshopt + WebP via gltf-transform.

### 4. Shoot it like a film
See `references/camera.md`: a focal length per shot, depth of field that pulls focus
with the subject (desktop high quality only), drone sway outside and steadicam breath
inside, a letterbox for interiors, AgX tone mapping plus a saturation/contrast grade,
vignette, grain and slight lens fringing. Never cut: every move is continuous.

### 5. Add the reality: visualisation plates
See `references/ai-plates.md`. Generate one anchor image (the finished subject in its
best light), then every other exterior shot with the anchor as an image reference so the
design stays consistent. Export at full resolution, clean any real brand marks, caption
each as "Visualisation" and say in the footer that the images are AI-generated. A plate
can be a scroll-scrubbed video (`scripts/encode-scrub.sh`).

### 6. Make it smooth on a phone
See `references/performance.md`. Measure before believing: one-off stalls of 100-700 ms
come from shader compiles, texture uploads and environment-map bakes the first time a
chapter shows something new, not from steady-state frames. Fixes, in order of impact:
cache and idle-bake PMREM reflections; precompile and warm-render every program; rebuild
instance matrices only when `c` moves; pause rendering while a plate covers the canvas;
cap phone DPR at 1.25; drop CSS `filter: blur` over a live canvas.

### 7. Ship it
See `references/shipping.md`. For a site: static files, assets under `public/`. To show
it in a claude.ai Artifact (e.g. on a phone): build ONE self-contained HTML with
`scripts/bundle-single-file.py`. Relative asset URLs do not resolve in an Artifact,
which is why a multi-file publish shows a blank canvas. Keep the file under 16 MB.

### 8. Verify
- `scripts/capture-chapters.cjs`: screenshot every chapter at desktop and phone width,
  with reduced motion (exact frames) and without (camera easing).
- `scripts/perf-probe.cjs`: per-frame JS time by chapter on a phone profile; any frame
  over ~50 ms that is not the first frame of the page is a bug to find.
- Read every frame. Typical finds: a tree in front of the lens, a camera path through a
  building, bloom blowing out golden hour, a light value that floods an interior.

## Copy and layout (Apple product-page register)
- No site chrome: a slim translucent product bar, a gradient progress hairline.
- One huge, tightly tracked headline per chapter (`letter-spacing: -0.045em`), a single
  sentence whose words light up as the reader scrolls, figures that count up.
- Text sits on one edgeless vignette plus a text shadow, never a box or a per-chapter scrim
  (per-section scrims leave hard bands as sticky sections hand off).
- A chapter rail (dots, labels on hover), a live build log chip ("DAY 348 · LEVEL 10 OF 16"),
  a floor counter during a lift ride. Close with an "at a glance" spec, design notes and
  credits. Label anything fictional as fictional.

## Non-negotiables
- Content in HTML; WebGL and plates are enhancement. One `h1`.
- `prefers-reduced-motion`: the story still follows scroll, but ambient motion freezes,
  copy does not translate, plates do not push in.
- Colours come from CSS tokens, read in JS (`token()` in `scripts/stage.ts` resolves any
  CSS colour, oklch included, through a 1 px canvas).
- Licences: CC0 (Poly Haven), MIT (three.js examples). AI images: disclose them.
- Never put a real company's logo on a fictional project's imagery.

## Files
- `scripts/stage.ts` renderer harness: quality profiles, adaptive governor, visibility pause.
- `scripts/polyhaven.py` fetch HDRIs, textures and glTF models (needs a User-Agent).
- `scripts/optimize-assets.sh` WebP textures, meshopt glTF.
- `scripts/render-billboard/` render a scanned model to a transparent two-view atlas.
- `scripts/plates.cjs` exported plates to 1920/1280 progressive JPEG.
- `scripts/encode-scrub.sh` all-keyframe MP4 for scroll scrubbing.
- `scripts/bundle-single-file.py` one-file Artifact build with assets inlined.
- `scripts/capture-chapters.cjs`, `scripts/perf-probe.cjs` verification.
- `examples/meridian-house/` the full engine, asset loader and page.
