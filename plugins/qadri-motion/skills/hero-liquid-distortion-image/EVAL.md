---
name: hero-liquid-distortion-image-eval
description: Use when verifying that hero-liquid-distortion-image was actually implemented correctly. Adversarial audit, not a summary.
pairs_with: hero-liquid-distortion-image
---

# Eval: Liquid Distortion Image Hero

## What this audits
The most common shipped failure is a displacement effect that looks correct at a glance but uses raw un-lerped pointer coordinates, resulting in jittery 1:1 tracking instead of the intended heavy liquid feel. The second most common failure is RGB split that persists at full intensity when the cursor is stationary, turning a velocity-driven effect into a permanent rendering artifact. The third is a broken aspect ratio where the image stretches to fill the canvas without cover-UV correction.

## Evidence required
- The built `distortion.js` (or equivalent consolidated module) source file.
- The fragment shader source (inline or external `.frag` file).
- The HTML file with the hero markup.
- The CSS file with hero layout and reduced-motion rules.
- A running instance of the page in a browser tab.
- DevTools Performance panel recording of a 5-second pointer interaction.
- DevTools Console output during page load (check for WebGL errors).
- A screenshot with the pointer stationary over the hero for 3 seconds.
- A screenshot with the pointer moving quickly across the hero.
- A screenshot at `prefers-reduced-motion: reduce` in DevTools emulation.

## Automated checks

### Static checks (grep the source)
```bash
# PASS: pointer coordinates are lerped, not used raw
grep -c 'lerp\|lerpFactor\|\* 0\.0[3-9]\|target.*current' distortion.js
# FAIL if 0: raw coordinates are being passed directly to the shader

# PASS: velocity decays toward zero
grep -c 'vel.*0\.\|velocity.*smooth\|velocity.*lerp\|Math\.min.*velocity' distortion.js
# FAIL if 0: velocity is not being smoothed or clamped

# PASS: DPR is capped
grep -c 'Math\.min.*devicePixelRatio\|dpr.*2\|DPR.*cap' distortion.js
# FAIL if 0: uncapped DPR will destroy performance on high-density displays

# PASS: coverUv or equivalent aspect ratio correction exists in the shader
grep -c 'coverUv\|aspect\|texSize.*screenSize\|scale.*ratio' distortion.frag
# FAIL if 0: image will stretch to fill canvas

# PASS: UV coordinates are clamped
grep -c 'clamp.*0\.0.*1\.0\|CLAMP_TO_EDGE' distortion.frag
# FAIL if 0: distorted UVs can sample outside the texture

# PASS: reduced-motion media query exists in CSS
grep -c 'prefers-reduced-motion' style.css
# FAIL if 0: no accessibility fallback

# PASS: canvas has aria-hidden
grep -c 'aria-hidden' index.html
# FAIL if 0: canvas is announced to screen readers

# FAIL: displacement map is loaded at excessive resolution
# Check the displacement map file dimensions
identify displacement.jpg 2>/dev/null | grep -E '[0-9]{4,}x[0-9]{4,}'
# FAIL if match: displacement map exceeds 1024x1024
```

### Runtime checks (page.evaluate / DevTools)
```js
// Check 1: WebGL context exists
const canvas = document.querySelector('.hero canvas');
const gl = canvas?.getContext('webgl') || canvas?.getContext('webgl2');
console.assert(gl !== null, 'FAIL: No WebGL context on hero canvas');

// Check 2: Canvas covers the hero container
const heroRect = document.querySelector('.hero').getBoundingClientRect();
const canvasRect = canvas.getBoundingClientRect();
console.assert(
  Math.abs(canvasRect.width - heroRect.width) < 2 &&
  Math.abs(canvasRect.height - heroRect.height) < 2,
  'FAIL: Canvas does not cover hero container'
);

// Check 3: Fallback image is hidden when WebGL is active
const fallback = document.querySelector('.hero-fallback');
const fbStyle = getComputedStyle(fallback);
const heroHasClass = document.querySelector('.hero').classList.contains('webgl-active');
console.assert(
  heroHasClass && (fbStyle.opacity === '0' || fbStyle.display === 'none'),
  'FAIL: Fallback image visible alongside WebGL canvas'
);

// Check 4: CTA is clickable (not obscured by canvas)
const cta = document.querySelector('.hero-cta');
const ctaRect = cta.getBoundingClientRect();
const topEl = document.elementFromPoint(
  ctaRect.left + ctaRect.width / 2,
  ctaRect.top + ctaRect.height / 2
);
console.assert(
  topEl === cta || cta.contains(topEl),
  'FAIL: CTA is obscured by canvas'
);

// Check 5: No console errors related to shaders
// (observe console during load, FAIL if gl.getShaderInfoLog returns non-empty)
```

## Manual inspection protocol

1. Load the page with a mid-range CPU (throttle 4x in DevTools). Open Performance panel. Move pointer across the hero for 5 seconds. FAIL if more than 3 consecutive frames exceed 16ms.
2. Move the pointer to the center of the hero and hold still for 3 seconds. Observe the image. FAIL if RGB channel separation is visible at rest. A subtle idle ripple is acceptable; chromatic aberration is not.
3. Move the pointer quickly from left edge to right edge. Observe the image. FAIL if the displacement follows the pointer without any trailing lag. The effect should trail behind by at least 5-8 frames.
4. Move the pointer outside the hero container. Wait 2 seconds. FAIL if the displacement effect remains locked at the last pointer position without settling back toward a neutral state.
5. Resize the browser window from 1920x1080 to 768x1024. FAIL if the image aspect ratio changes (stretches or squishes) or if the canvas does not resize to fill the container.
6. Enable `prefers-reduced-motion: reduce` in DevTools rendering settings. Reload. FAIL if the canvas is visible or if the fallback image is not displayed.
7. Tab through the hero section. FAIL if the canvas receives focus or if the CTA link is not reachable via keyboard.
8. Open the Network panel. Reload. FAIL if the displacement map texture is larger than 200 KB.
9. Scroll the page so the hero is 50% out of view. FAIL if the displacement effect is still at full intensity.
10. Scroll the page so the hero is fully out of view. FAIL if the RAF loop is still running (check via Performance panel timeline).

## Scoring rubric

| # | Criterion | Weight | 0 (Fail) | 1 (Partial) | 2 (Pass) |
|---|---|---|---|---|---|
| 1 | Pointer lerping | 15 | Raw coordinates passed to shader | Lerp exists but factor > 0.15 (too snappy) | Lerp factor 0.03-0.12, liquid trailing feel |
| 2 | Velocity-driven RGB split | 15 | RGB split is static or always on | Velocity computed but not smoothed, jitters | Smooth velocity with decay to near-zero at rest |
| 3 | Cover-UV aspect correction | 10 | Image stretches to fill canvas | Correction attempted but wrong math | Image maintains original aspect ratio at all sizes |
| 4 | UV clamping | 5 | No clamping, edge wrapping visible | Clamped in shader but wrap mode not set | Both shader clamp and CLAMP_TO_EDGE on texture |
| 5 | Scroll fade integration | 10 | No scroll binding | Fade exists but abrupt or binary | Smooth scrubbed fade from 1.0 to 0.0 over hero scroll range |
| 6 | Reduced-motion fallback | 10 | No reduced-motion handling | CSS media query exists but JS still inits WebGL | Both CSS and JS checks, runtime change listener |
| 7 | LCP performance | 10 | LCP > 4s or no fallback image | LCP 2.5-4s or fallback lacks fetchpriority | LCP < 2.5s, fallback is LCP element with fetchpriority="high" |
| 8 | Frame performance | 10 | > 16ms frame time sustained | < 16ms mostly but spikes on resize or init | < 8ms sustained at DPR 2 on throttled CPU |
| 9 | CTA clickability | 5 | CTA is buried under canvas | CTA clicks work but requires precise targeting | CTA click target matches full visual bounds |
| 10 | Cleanup / destroy | 5 | No destroy function | Cancels RAF but leaks context or listeners | Full cleanup: RAF, context, listeners, ResizeObserver |
| 11 | Displacement map sizing | 5 | Map > 1024x1024 | Map 513-1024 | Map <= 512x512 |

**Total: 100 points. Ship threshold: 75.**

## Common false passes

1. **Lerp exists but is applied to the wrong thing.** The code lerps the displacement scale uniform instead of the pointer position. The pointer still jumps instantly; only the intensity ramps. Looks smooth on casual inspection but the spatial tracking is still mechanical.
2. **RGB split decays but the idle ripple masks it.** The idle ripple animation is strong enough that it creates visible channel separation even at rest. The velocity-driven split technically reaches zero, but the ripple undoes that. Check at rest with the idle ripple temporarily disabled.
3. **Cover-UV works at the initial size but breaks on resize.** The `uImageSize` uniform is set once on load but not updated if the image or container changes aspect ratio during responsive breakpoint shifts.
4. **Reduced-motion CSS exists but the canvas still renders.** The CSS hides the canvas visually, but the JS module still initializes WebGL, allocates textures, and runs the RAF loop in the background, wasting GPU and battery on a hidden element.
5. **Scroll fade works but ScrollTrigger is misconfigured for Lenis.** When Lenis smooth scroll is active, ScrollTrigger.update must be called from the Lenis scroll callback. Without this binding, the scroll fade lags or never activates.
6. **Frame time looks good in DevTools but DPR is set to 1.** The test passes trivially because the shader is running at half the intended resolution. Check `renderer.dpr` or `canvas.width / canvas.clientWidth` to confirm DPR is at least `min(devicePixelRatio, 2)`.
7. **Destroy function exists but is never called.** The module exports a cleanup function, but no code path invokes it on route change, unmount, or page transition. The context leaks on SPA navigation.

## Required fixes by failure mode

| Failure | Root cause | Fix |
|---|---|---|
| Jittery tracking | Raw pointer coordinates in uniform | Add per-frame lerp on pointer position, factor 0.06 |
| Static RGB split | Velocity not computed or not decaying | Compute velocity as smoothed delta magnitude, multiply RGB offset by velocity |
| Stretched image | Missing cover-UV math | Add aspect ratio correction function in fragment shader |
| Edge smearing | UV wrapping mode set to REPEAT | Set texture wrap to CLAMP_TO_EDGE and clamp UVs in shader |
| LCP regression | WebGL canvas blocks LCP measurement | Ensure `<img>` fallback is in DOM before canvas, with fetchpriority="high" |
| No scroll fade | ScrollTrigger not bound or wrong trigger | Verify trigger element, start/end values, and Lenis integration if applicable |
| Motion sickness reports | No reduced-motion handling | Add CSS media query AND JS matchMedia check with runtime listener |

## Verdict format

```
SCORE: XX / 100

| # | Criterion | Points | Notes |
|---|---|---|---|
| 1 | Pointer lerping | X/15 | ... |
| ...                              |

BLOCKING ISSUES:
- [list any criterion scoring 0]

VERDICT: SHIP / NO SHIP
```
