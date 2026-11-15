---
name: hero-gltf-product-showcase-eval
description: Use when verifying that hero-gltf-product-showcase was actually implemented correctly. Adversarial audit, not a summary.
pairs_with: hero-gltf-product-showcase
---

# Eval: GLTF Product Showcase Hero

## What this audits
The most common shipped failure is a model that loads and renders but has no environment map, producing flat, unlit-looking PBR materials that defeat the purpose of a product showcase. The second is a missing Draco loader setup, silently causing the GLB to fail to parse with no visible error (just a blank scene). The third is hotspot positions that are hardcoded in world space without accounting for model scale, placing all markers in the wrong location.

## Evidence required
- The React component (or vanilla JS module) source code.
- The CSS file with layout, hotspot, and swatch styles.
- The GLB file (inspect size, check for Draco compression).
- A running instance of the page.
- Screenshot of the loaded product with default lighting.
- Screenshot with a material color swap applied.
- Screenshot with a hotspot detail panel open.
- DevTools Performance panel recording of 5 seconds of orbit interaction.
- DevTools Console output during model load.
- `renderer.info.render.calls` and `renderer.info.memory` logged to console.

## Automated checks

```bash
# PASS: DRACOLoader is set up
grep -cE 'DRACOLoader|dracoLoader|setDRACOLoader|draco' ProductScene.tsx
# FAIL if 0: no Draco support

# PASS: Environment map or HDRI loaded
grep -cE 'Environment|RGBELoader|environment.*hdr|preset.*studio' ProductScene.tsx
# FAIL if 0: no environment map, materials will look flat

# PASS: Shadow configuration present
grep -cE 'castShadow|receiveShadow|shadowMap|shadow-mapSize' ProductScene.tsx
# FAIL if 0: no shadows

# PASS: outputColorSpace set to SRGB
grep -cE 'SRGBColorSpace|outputColorSpace' ProductScene.tsx
# FAIL if 0: washed-out colors in linear space

# PASS: Material cleanup on unmount
grep -cE 'dispose|geometry\.dispose|material\.dispose' ProductScene.tsx
# FAIL if 0: GPU resource leak

# PASS: Hotspot aria-label
grep -c 'aria-label' ProductScene.tsx Hotspot.tsx
# FAIL if 0: hotspots not accessible

# PASS: swatch radiogroup
grep -cE 'role.*radiogroup|aria-checked' MaterialSwapper.tsx
# FAIL if 0: swatches not accessible
```

```js
// Runtime: check renderer configuration
const renderer = document.querySelector('canvas')?.__r3f?.gl;
if (renderer) {
  console.assert(
    renderer.outputColorSpace === 'srgb',
    'FAIL: outputColorSpace not SRGB'
  );
  console.assert(
    renderer.shadowMap.enabled === true,
    'FAIL: Shadow maps not enabled'
  );
  console.log('Draw calls:', renderer.info.render.calls);
  console.assert(
    renderer.info.render.calls < 50,
    'FAIL: Too many draw calls (' + renderer.info.render.calls + ')'
  );
}

// Runtime: check hotspot is clickable
const hotspots = document.querySelectorAll('.hotspot-marker');
console.assert(hotspots.length >= 3, 'FAIL: Fewer than 3 hotspots');
hotspots.forEach(hs => {
  console.assert(hs.getAttribute('aria-label'), 'FAIL: Hotspot missing aria-label');
});

// Runtime: check swatch accessibility
const group = document.querySelector('[role="radiogroup"]');
console.assert(group !== null, 'FAIL: No radiogroup for swatches');
const checked = document.querySelector('[aria-checked="true"]');
console.assert(checked !== null, 'FAIL: No swatch is currently checked');
```

## Manual inspection protocol

1. Load the page. FAIL if no loading progress indicator is visible during model download.
2. Once loaded, observe the model surface. FAIL if materials look flat/gray without visible reflections or specular highlights (indicates missing environment map).
3. Orbit the model by dragging. FAIL if the camera flips below the ground plane.
4. Release the drag and wait 5 seconds. FAIL if the model does not begin auto-rotating.
5. Click a hotspot marker. FAIL if no detail panel appears, or if the hotspot button is not reachable via keyboard (Tab + Enter).
6. Click a color swatch. FAIL if the model color does not change within 1 frame.
7. Inspect the shadow below the model. FAIL if no contact shadow is visible.
8. Open DevTools Console and log `renderer.info.render.calls`. FAIL if > 50 draw calls.
9. Enable `prefers-reduced-motion: reduce`. Reload. FAIL if the model auto-rotates.
10. Resize the window to 375px width. FAIL if the model is clipped or the canvas does not resize.
11. Open Network panel. FAIL if the GLB file exceeds 5 MB.

## Scoring rubric

| # | Criterion | Weight | 0 (Fail) | 1 (Partial) | 2 (Pass) |
|---|---|---|---|---|---|
| 1 | Environment map | 15 | No env map, flat materials | Env map present but wrong preset (too bright/dark) | Studio HDRI with calibrated exposure |
| 2 | Draco compression | 10 | No Draco, GLB fails or is huge | Draco configured but decoder path wrong | Draco loads, GLB < 2 MB |
| 3 | Three-point lighting | 10 | Single ambient only | Key + ambient (two lights) | Key + fill + rim (three lights minimum) |
| 4 | Contact shadows | 5 | No shadow | Shadow visible but hard/wrong opacity | Soft contact shadow, opacity 0.1-0.4 |
| 5 | Orbit constraints | 10 | No constraints, camera flips below floor | Some constraints but pan enabled or min/max distance wrong | Damped orbit, no pan, polar angle clamped, distance bounded |
| 6 | Hotspot interaction | 10 | No hotspots | Hotspots exist but not clickable or no panel | Clickable hotspots with detail panels |
| 7 | Material swapping | 10 | No swap | Color changes but roughness/metalness untouched | Color + finish (roughness/metalness) swap |
| 8 | Loading state | 5 | Blank canvas during load | Spinner but no progress % | Progress bar with percentage |
| 9 | Color space | 5 | Linear (washed out) | -- | SRGB with tone mapping |
| 10 | Accessibility | 10 | No aria, no keyboard | Some aria but swatches not keyboard-navigable | Full: aria-label, radiogroup, keyboard, canvas aria-hidden |
| 11 | Resource disposal | 5 | No cleanup | Partial (some materials leaked) | Full traverse dispose on unmount |
| 12 | Auto-rotate | 5 | None | Always on (no pause on interaction) | On at idle, pauses during drag |

**Total: 100. Ship threshold: 75.**

## Common false passes

1. **Environment map is loaded but not applied to the scene.** `scene.environment = hdr` is set, but individual materials have `envMapIntensity: 0` or are `MeshBasicMaterial` which ignores environment maps.
2. **Draco decoder path points to a CDN that is blocked by CSP.** The loader is configured correctly but the decoder WASM never loads due to Content Security Policy. The model silently fails to parse.
3. **Color swap works on the first click but subsequent clicks apply to the wrong meshes.** `scene.traverse` runs correctly the first time, but a re-render caused by React state change re-mounts the `<primitive>` and the old traverse references are stale.
4. **Hotspots render at the correct position initially but drift as the user orbits.** The hotspot positions are in screen space (CSS `left`/`top`) instead of 3D world space tracked via `Html` or `project()`.
5. **Shadows render but are pixelated.** The shadow map size is left at the default 512x512 instead of being set to 2048x2048. At a distance, this produces visible staircase edges on the shadow.
6. **Auto-rotate works but never pauses.** The developer set `autoRotate={true}` but forgot to set `autoRotateSpeed` to 0 on interaction start, or the OrbitControls `start`/`end` event listeners are not wired.

## Required fixes by failure mode

| Failure | Root cause | Fix |
|---|---|---|
| Flat materials | No environment map | Add `<Environment preset="studio" />` or load HDRI |
| GLB fails silently | Draco decoder not configured | Set up DRACOLoader with correct decoder path |
| Washed-out colors | Missing SRGBColorSpace | Set `renderer.outputColorSpace = THREE.SRGBColorSpace` |
| Camera flips | No polar angle constraint | Set `maxPolarAngle={Math.PI / 2.1}` |
| Hotspots drift | Screen-space positioning | Use drei `Html` component or `vector.project(camera)` |
| GPU memory leak | No dispose on unmount | Traverse scene, dispose all geometries/materials/textures |
| Blocky shadows | Default 512 shadow map | Set `shadow-mapSize={[2048, 2048]}` |

## Verdict format

```
SCORE: XX / 100

| # | Criterion | Points | Notes |
|---|---|---|---|
| 1 | Environment map | X/15 | ... |
| ...                              |

BLOCKING ISSUES:
- [list any criterion scoring 0]

VERDICT: SHIP / NO SHIP
```
