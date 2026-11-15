---
name: hero-tilt-3d-layers-eval
description: Use when verifying that hero-tilt-3d-layers was actually implemented correctly. Adversarial audit, not a summary.
pairs_with: hero-tilt-3d-layers
---

# Eval: Pointer-Tilt Layered Depth Hero

## What this audits
The most commonly shipped failure is a hero that tilts all layers at the same rate, collapsing the depth illusion into a flat card wobble. The second most common failure is missing scale compensation, which causes layers to shrink or grow as they move in z-space.

## Evidence required
- The built HTML/component file, opened in a browser at >= 1280x800
- DevTools Elements panel with computed styles visible for each layer
- DevTools Performance panel recording of a 5-second pointer sweep across the hero
- A screen recording or manual observation of pointer movement from corner to corner
- The source CSS/JS inspected for transform values, lerp logic, and listener type

## Automated checks

```js
// Run in browser console on the hero page

// CHECK 1: Perspective is on the container, not individual layers
const container = document.querySelector('.hero-tilt, [class*="hero-tilt"]');
const containerStyle = getComputedStyle(container);
const hasPerspective = containerStyle.perspective !== 'none' && parseInt(containerStyle.perspective) > 0;
console.assert(hasPerspective, 'FAIL: Container must have a perspective value');

// CHECK 2: Layers have different translateZ values
const layers = container.querySelectorAll('[class*="layer"]');
const zValues = new Set();
layers.forEach(l => {
  const t = getComputedStyle(l).transform;
  // Parse matrix3d for translateZ (element [14] in the 4x4 matrix)
  if (t && t.startsWith('matrix3d')) {
    const vals = t.match(/matrix3d\((.+)\)/)[1].split(',').map(Number);
    zValues.add(Math.round(vals[14]));
  }
});
console.assert(zValues.size >= 3, 'FAIL: Need at least 3 distinct translateZ values, got ' + zValues.size);

// CHECK 3: overflow hidden on container
console.assert(containerStyle.overflow === 'hidden', 'FAIL: Container must have overflow: hidden');

// CHECK 4: will-change on layers
let willChangeCount = 0;
layers.forEach(l => {
  if (getComputedStyle(l).willChange.includes('transform')) willChangeCount++;
});
console.assert(willChangeCount <= 8, 'FAIL: Too many will-change: transform elements (' + willChangeCount + ')');

// CHECK 5: No mousemove listener (should be pointermove)
const source = document.querySelector('script')?.textContent || '';
const usesMousemove = /addEventListener\s*\(\s*['"]mousemove/.test(source);
console.assert(!usesMousemove, 'FAIL: Uses mousemove instead of pointermove');

// CHECK 6: prefers-reduced-motion respected
const reducedMotionCSS = [...document.styleSheets].some(ss => {
  try {
    return [...ss.cssRules].some(r =>
      r.conditionText && r.conditionText.includes('prefers-reduced-motion')
    );
  } catch { return false; }
});
console.assert(reducedMotionCSS, 'FAIL: No prefers-reduced-motion media query found');

// CHECK 7: Decorative layers have aria-hidden
let ariaFail = false;
layers.forEach(l => {
  if (l.className.includes('bg') || l.className.includes('fg') || l.className.includes('glare')) {
    if (l.getAttribute('aria-hidden') !== 'true') ariaFail = true;
  }
});
console.assert(!ariaFail, 'FAIL: Decorative layers missing aria-hidden="true"');

// CHECK 8: Images have explicit dimensions
let dimFail = false;
container.querySelectorAll('img').forEach(img => {
  if (!img.getAttribute('width') || !img.getAttribute('height')) dimFail = true;
});
console.assert(!dimFail, 'FAIL: Images missing explicit width/height attributes');
```

## Manual inspection protocol

1. Move pointer slowly from top-left to bottom-right of hero. PASS if background layer visibly moves less than foreground layer. FAIL if all layers rotate at the same rate.

2. Move pointer to extreme corner. PASS if no layer content is clipped beyond the container edge. FAIL if tilted content bleeds outside the hero boundary.

3. Move pointer onto hero, then move pointer completely off the hero. PASS if all layers animate back to neutral (flat) position within 1 second. FAIL if layers freeze at last position.

4. Open DevTools, enable "Emulate CSS media feature prefers-reduced-motion: reduce." Reload. PASS if hero shows as a flat, static composition with no tilt response. FAIL if tilt still works or layers are mispositioned.

5. Throttle CPU 4x in DevTools Performance panel. Sweep pointer across hero for 5 seconds. Record performance trace. PASS if no frame exceeds 16ms. FAIL if 3+ consecutive frames exceed 16ms.

6. Check the CTA button. Click it with keyboard (Tab to focus, Enter to activate). PASS if focus ring is visible and activation works. FAIL if CTA is unreachable or obscured by a decorative layer.

7. Inspect the glare element. Move pointer across the hero. PASS if the glare highlight follows the pointer position and fades on pointer leave. FAIL if glare is static, absent, or persists after leave.

8. Resize browser to 375px wide. PASS if hero still displays correctly with simplified or disabled tilt. FAIL if layers overlap chaotically or overflow.

## Scoring rubric

| # | Criterion | 0 | 1 | 2 | Weight |
|---|-----------|---|---|---|--------|
| 1 | Distinct per-layer rotation rates | All same rate | 2 different rates | 3+ distinct rates matching depth | 3 |
| 2 | Scale compensation correct | Layers visibly shrink/grow | Partially compensated | Formula matches perspective/translateZ exactly | 3 |
| 3 | Lerp interpolation | No lerp (1:1 tracking) | Lerp present but no reset lerp | Full lerp with slower reset on leave | 2 |
| 4 | Glare layer tracks pointer | No glare | Static glare | Glare follows pointer, fades on leave | 1 |
| 5 | Reduced motion handling | No handling | CSS only, JS still runs | Both CSS and JS gated | 2 |
| 6 | Pointer leave reset | Layers freeze on leave | Layers reset but snap instantly | Layers lerp smoothly to neutral | 2 |
| 7 | No layout-triggering properties | Animates top/left/margin | Mixed transform and layout | Transform-only animation | 2 |
| 8 | Overflow containment | Content bleeds on tilt | Partially clipped | overflow: hidden, bg oversized to cover | 1 |
| 9 | Image CLS prevention | No dimensions | Some images have dimensions | All images have explicit width/height | 1 |
| 10 | Frame performance | > 16ms at 4x throttle | Occasional drops | Consistent < 8ms at 4x throttle | 2 |
| 11 | Semantic structure | No aria, no alt | Partial coverage | Full aria-hidden, alt, aria-label | 1 |

**Total: 40 points. Ship threshold: 32 (80%).**

## Common false passes

1. **Same rotation, different translateZ**: Layers sit at different z-depths in CSS but the JS applies the same `maxRotate` to every layer. It looks 3D in the static state but moves as a flat unit. Check by moving the pointer and watching whether the gap between layers changes.

2. **CSS transition on transform + rAF lerp**: Double easing. The lerp interpolates toward the target, and then the CSS transition eases the already-eased value. Result is a mushy, delayed response that technically "works" but feels broken. Grep for `transition.*transform` on any tilt layer.

3. **Perspective on each layer instead of container**: Each layer gets its own vanishing point. The parallax math breaks; layers tilt independently rather than as a unified scene. Check computed style of the container vs individual layers.

4. **No pointerleave handler**: The tilt works while hovering but freezes at the last angle when the pointer leaves. Often missed because developers test by keeping the pointer inside the hero.

5. **Scale compensation uses wrong formula**: Common mistake is `scale(1 + z/perspective)` instead of the correct `scale(perspective / (perspective - z))`. The visual difference is subtle at small z values but obvious at z = -80 (layer appears ~12% wrong size).

6. **Background image at 100% coverage**: At neutral it looks fine. On tilt, black gaps appear at the edges because the rotated plane no longer covers the container bounds. Must be 110%+ with object-fit: cover.

7. **Mobile gyroscope without permission request**: Works on Android, silently fails on iOS 13+ where DeviceOrientationEvent.requestPermission() is required. Appears to pass on desktop testing.

## Required fixes by failure mode

| Failure | Root cause fix |
|---------|---------------|
| All layers rotate at same rate | Add per-layer `maxRotate` config keyed to z-depth. Further layers = lower maxRotate. |
| Layers shrink/grow on tilt | Apply scale compensation: `scale(1 / (perspective / (perspective - z)))` in the transform string. |
| Mushy/delayed response | Remove any `transition` on `transform` for tilt layers. The rAF lerp IS the easing. |
| Frozen on pointer leave | Add `pointerleave` handler that sets target to (0,0) and keep the rAF loop running. |
| Black edges on tilt | Set background image to 110%+ width/height with object-fit: cover. |
| iOS gyroscope silent fail | Call `DeviceOrientationEvent.requestPermission()` and handle denial gracefully. |
| CTA unreachable by keyboard | Ensure content layer has `pointer-events: auto` and decorative layers have `pointer-events: none`. |

## Verdict format

```
SCORE: XX / 40
SHIP THRESHOLD: 32

| # | Criterion                      | Score | Notes |
|---|-------------------------------|-------|-------|
| 1 | Per-layer rotation rates      | X/2   |       |
...

BLOCKING ISSUES:
- [list any criterion scoring 0]

VERDICT: SHIP / NO SHIP
```
