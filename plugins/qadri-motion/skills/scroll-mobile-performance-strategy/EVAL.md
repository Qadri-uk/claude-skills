---
name: scroll-mobile-performance-strategy-eval
description: Use when verifying that a mobile performance strategy for a scroll-narrative site was correctly implemented. Adversarial audit targeting layer budget violations, missing tier degradation, thermal throttle ignorance, and oversized images.
pairs_with: scroll-mobile-performance-strategy
---

# Eval: Mobile Performance Strategy

## What this audits
The most common shipped failure is a scroll-narrative site that tests well on a MacBook Pro but ships with 8+ compositor layers, 25+ ScrollTriggers, and 3x DPR images on a mid-range phone, resulting in sustained 20-30fps during scroll. The second most common failure is implementing tier detection but not actually degrading any animations for lower tiers.

## Evidence required
- The running page on a mid-range Android device or iPhone 12/SE class (not a flagship)
- Chrome DevTools Performance panel recording of a full top-to-bottom scroll at CPU 4x throttle
- Chrome DevTools Layers panel screenshot showing compositor layer count
- Network panel showing image sizes
- The source code for device tier detection and animation configuration
- Console output of the performance audit script

## Automated checks

```javascript
// Run in DevTools console on the live page

// CHECK 1: Device tier is set
const tier = document.body.dataset.perfTier;
console.assert(tier, 'FAIL: No data-perf-tier on body. Tier detection not implemented.');
console.log(`Device tier: ${tier}`);

// CHECK 2: ScrollTrigger count within budget
const stCount = ScrollTrigger?.getAll?.()?.length ?? 0;
const stBudget = { full: 30, reduced: 15, minimal: 8 };
const budget = stBudget[tier] ?? 30;
console.assert(stCount <= budget,
  `FAIL: ${stCount} ScrollTriggers exceed ${tier} tier budget of ${budget}`);

// CHECK 3: Compositor layers (approximate via will-change)
const wcCount = document.querySelectorAll('[style*="will-change"]').length;
const layerBudget = { full: 10, reduced: 6, minimal: 3 };
const lBudget = layerBudget[tier] ?? 10;
console.assert(wcCount <= lBudget,
  `FAIL: ${wcCount} will-change elements exceed ${tier} layer budget of ${lBudget}`);

// CHECK 4: No parallax on minimal tier
if (tier === 'minimal') {
  const visibleParallax = [...document.querySelectorAll('.act__parallax-bg')]
    .filter(el => getComputedStyle(el).display !== 'none');
  console.assert(visibleParallax.length === 0,
    `FAIL: ${visibleParallax.length} parallax layers visible on minimal tier`);
}

// CHECK 5: Image DPR check
const dprCap = { full: 3, reduced: 2, minimal: 1.5 };
const cap = dprCap[tier] ?? 3;
let oversizedImgs = 0;
document.querySelectorAll('img').forEach(img => {
  const maxWidth = img.clientWidth * cap;
  if (img.naturalWidth > maxWidth * 1.2) oversizedImgs++;
});
console.assert(oversizedImgs === 0,
  `FAIL: ${oversizedImgs} images wider than ${cap}x their display width`);

// CHECK 6: No layout properties in keyframes
const violations = [];
[...document.styleSheets].forEach(ss => {
  try {
    [...ss.cssRules].forEach(rule => {
      if (rule instanceof CSSKeyframesRule) {
        [...rule.cssRules].forEach(kf => {
          ['width','height','top','left','margin','padding','font-size','border-radius']
            .forEach(p => { if (kf.style.getPropertyValue(p)) violations.push(`${rule.name}:${p}`); });
        });
      }
    });
  } catch(e) {}
});
console.assert(violations.length === 0,
  `FAIL: Layout properties in keyframes: ${violations.join(', ')}`);

// CHECK 7: Passive scroll listeners
console.log('CHECK 7: Manual - verify all scroll listeners use { passive: true }');

// CHECK 8: prefers-reduced-motion = minimal tier
console.log('CHECK 8: Enable reduced motion in DevTools, reload, verify tier=minimal');
```

## Manual inspection protocol

1. Open the page on a Samsung A54 or Pixel 7a (actual hardware). Scroll from top to bottom at moderate speed. FAIL if scroll feels noticeably janky (dropped frames visible without measurement tools).

2. In Chrome DevTools, enable CPU 4x throttle. Record a Performance trace of a full scroll-through. FAIL if more than 20% of frames exceed 16ms total.

3. Open DevTools Layers panel. Count compositor layers during scroll. FAIL if the count exceeds the tier budget (4 for minimal, 6 for reduced).

4. On the `minimal` tier, verify: no pinned sections (everything scrolls through), no parallax backgrounds, no clip-path animations, no text splitting. FAIL if any of these are present.

5. Check Network panel for image sizes. FAIL if any image is served at > 2x its CSS display width on a mobile viewport.

6. Enable "prefers-reduced-motion: reduce" in DevTools. Reload. FAIL if the detected tier is not `minimal`. FAIL if any animation plays.

7. Leave the page open and scrolling on a phone for 30 seconds. Check if frame rate drops significantly (thermal throttle). FAIL if there is no detection or response mechanism.

8. Navigate away from the page and back (if SPA). FAIL if console shows errors about stale ScrollTriggers or if the tier detection re-runs unnecessarily.

## Scoring rubric

| # | Criterion | 0 | 1 | 2 | Weight |
|---|---|---|---|---|---|
| 1 | Tier detection exists | No detection; same animations for all devices | Detection present but only uses viewport width | Hardware signals (memory, cores, DPR, pointer) + viewport | x2 |
| 2 | Tier actually degrades animations | Detection exists but nothing changes per tier | Some features disabled but key expensive ones remain | Full degradation: pinning, parallax, clip-path, split text removed on lower tiers | x3 |
| 3 | Layer budget enforced | > 8 layers on mobile | 5-8 layers on mobile | <= 4 layers on mobile viewport | x2 |
| 4 | ScrollTrigger count managed | > 20 triggers on minimal | Within budget but not lazy-loaded | Within budget AND lazy-loaded (created on proximity) | x2 |
| 5 | Image strategy | 3x images served to all devices | DPR-aware srcset but no cap | DPR capped per tier, lazy load, async decode | x2 |
| 6 | Thermal throttle response | No detection | Detection exists but no response | Detection + automatic simplification (parallax removal, layer demotion) | x1 |
| 7 | 60fps on mid-range mobile | > 30% dropped frames at 4x CPU throttle | 10-30% dropped frames | < 10% dropped frames | x3 |
| 8 | Reduced motion = minimal | No reduced motion handling | Reduced motion disables some animations | Reduced motion forces minimal tier, all content visible | x2 |
| 9 | No layout-triggering keyframes | Layout properties animated | filter/box-shadow animated | Only transform/opacity in all keyframes | x2 |
| 10 | Tested on real hardware | Only tested in DevTools simulator | Tested on one phone | Tested on mid-range Android AND iOS | x1 |

**Total: 40 points. Ship threshold: 30+.**

## Common false passes

1. **"No jank on my phone" tested on iPhone 15 Pro.** A15/A16 chips are 3-5x faster than mid-range GPUs. Test on iPhone 12/SE3 or Samsung A54 class.

2. **Tier detection runs but config is identical.** The detection function returns a tier string that is never read by the animation code. All tiers get the same animations.

3. **will-change removed from CSS but GSAP adds it dynamically.** GSAP's `force3D: true` (default) adds `translate3d(0,0,0)` which promotes layers. Check runtime computed styles, not just source CSS.

4. **ScrollTrigger.batch used but still creates per-element triggers.** `ScrollTrigger.batch` creates one trigger per element internally. 50 `.reveal` elements = 50 triggers, even though the API call looks like one.

5. **DPR cap applied to `<canvas>` but not to `<img>` elements.** The image strategy module caps canvas DPR but images are served at full resolution via srcset. Both need capping.

6. **Performance passes at idle but fails during scroll.** The FPS probe runs before any scroll happens. A page with many simultaneous ScrollTriggers can idle at 60fps and scroll at 30fps. The probe does not catch this.

## Required fixes by failure mode

| Failure | Root cause | Fix |
|---|---|---|
| Layer budget exceeded | will-change on too many elements / GSAP force3D default | Use LayerManager to track and cap promotions; set force3D: false on non-critical tweens |
| Same animations on all tiers | Tier detection not connected to animation config | Wire getTierConfig output to ScrollTrigger creation (enable/disable pin, scrub, parallax) |
| 30fps on mid-range phone | Too many simultaneous layers + layout-triggering properties | Cut parallax, disable pinning, reduce trigger count, cap DPR |
| Images oversized | No DPR-aware srcset or missing sizes attribute | Add srcset with DPR variants, set sizes to actual display width |
| Thermal throttle crash | No monitoring, sustained GPU load | Add ThermalGuard, respond by removing parallax and demoting layers |

## Verdict format

```
SCORE: XX / 40
| # | Criterion | Score | Notes |
|---|-----------|-------|-------|
| 1 | Tier detection | X/2 | ... |
...
BLOCKING: [list any criterion scoring 0]
VERDICT: SHIP / NO SHIP
```
