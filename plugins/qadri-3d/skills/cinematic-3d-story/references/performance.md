# Performance: what actually made it choppy

Measured on a Pixel 7 profile (`scripts/perf-probe.cjs`). Steady-state frames were 2-5 ms
of JavaScript. The choppiness was one-off stalls of 100-700 ms when a chapter first showed
something new. Fix those first; micro-optimising the loop barely matters.

## 1. Environment-map (PMREM) bakes on scroll: the biggest stall
Baking reflections from a dynamic sky with `pmrem.fromScene()` costs 20-80 ms on a phone.
Doing it whenever the time of day changes, inside the frame, stutters every golden-hour
scroll. Fix:
- key the bake by a coarse sky state (`${hdr}|${round(night * 10)}|${round(world * 3)}`),
- cache baked textures in a Map, never dispose and re-bake on the way back,
- on a cache miss keep the current environment and schedule the bake,
- bake in `requestIdleCallback`, nearest-to-the-reader first, and skip while the reader
  scrolled in the last 500 ms.

## 2. Shader compiles and texture uploads on first sight
Objects hidden until chapter 4 compile their programs the first time they are visible.
- `renderer.compileAsync(scene, camera)` with everything temporarily visible (restore
  visibility synchronously right after the call; the async part only waits).
- Upload every texture up front: traverse materials, `renderer.initTexture(t)` for each.
- One hidden warm-up render to a small render target with everything visible and
  `frustumCulled = false`, under both environment setups, with `shadowMap.needsUpdate`:
  this builds shadow and depth variants (skinning, instancing, alpha-tested billboards)
  that compile() misses. Take it while the reader is idle.
- Repeat after real assets swap in (new maps mean new programs).

## 3. Rebuild only when the clock moves
Instance matrices for hundreds of columns, beams and glass panels: recompute only when
`|c - lastC| > 1e-4`. Ambient motion (cars, people, crane) runs every frame but is small.

## 4. Render less
- Pause rendering while a full-screen plate covers the canvas (`setOccluded`).
- Shadows: `shadowMap.autoUpdate = false`; update every frame on high, every other frame
  elsewhere, always on a forced render (`dt === 0`).
- Device pixel ratio: low 1, balanced 1.25 (phones), high 2.
- Depth of field only on high. Bloom off on low.
- An adaptive governor: if fps stays under a threshold for 3 s, step quality down.
- The loop runs only while the canvas is on screen and the tab is visible.

## 5. CSS over a live canvas
`filter: blur()` on large text layers over a constantly changing WebGL canvas is expensive
on mobile GPUs; animate opacity and transform only. Keep `backdrop-filter` to small chrome.

## 6. Camera feel versus lag
Easing rate 5 (`1 - exp(-dt * 5)`) keeps weight without the floaty lag of 3.

## Measuring
`scripts/perf-probe.cjs URL` wraps `requestAnimationFrame` before page scripts, steps
through the chapters, and prints per-chapter median and max frame JS time. To split update
from render, add a temporary `window.__prof` hook in the engine and remove it before shipping.
SwiftShader (headless) compiles shaders lazily and is slow to fill, so treat its first-frame
spikes as indicative; confirm on a real device.
