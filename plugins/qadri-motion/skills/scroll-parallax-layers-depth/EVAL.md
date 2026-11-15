---
name: scroll-parallax-layers-depth-eval
description: Use when verifying that scroll-parallax-layers-depth was actually implemented correctly. Adversarial audit, not a summary.
pairs_with: scroll-parallax-layers-depth
---

# Eval: Multi-Layer Parallax Depth System

## What this audits
The most commonly shipped failure is parallax layers with guessed speed ratios that are either too close together (no visible depth) or too far apart (layers visually detach from the scene). The second most common failure is visible layer edges during scroll, caused by layers sized at exactly 100% of their container with no oversize buffer.

## Evidence required
- The built page opened at 1440x900 and 375x812
- DevTools computed styles on each `.parallax__layer` (check `transform`, `will-change`, `inset` or width/height)
- A slow scroll recording showing all layers moving at visibly different rates
- The page with `prefers-reduced-motion: reduce` emulated
- A performance trace during scroll at 4x CPU throttle
- The page at 375px width (verify parallax is disabled)

## Automated checks

```js
// 1. Layers exist with depth hierarchy
const layers = document.querySelectorAll('.parallax__layer');
console.assert(layers.length >= 3, `FAIL: Only ${layers.length} parallax layers, minimum 3`);

// 2. Decorative layers have aria-hidden
layers.forEach(layer => {
  if (!layer.classList.contains('parallax__layer--content')) {
    console.assert(layer.getAttribute('aria-hidden') === 'true',
      `FAIL: Decorative layer ${layer.className} missing aria-hidden="true"`);
  }
});

// 3. Layers oversized (inset < 0 or width/height > 100%)
layers.forEach(layer => {
  const rect = layer.getBoundingClientRect();
  const parent = layer.parentElement.getBoundingClientRect();
  if (!layer.classList.contains('parallax__layer--content')) {
    const oversize = rect.width > parent.width || rect.height > parent.height;
    console.assert(oversize,
      `FAIL: Layer ${layer.className} not oversized (${rect.width}x${rect.height} vs parent ${parent.width}x${parent.height})`);
  }
});

// 4. No background-attachment: fixed
const allEls = document.querySelectorAll('.parallax-section *');
let fixedBg = false;
allEls.forEach(el => {
  if (getComputedStyle(el).backgroundAttachment === 'fixed') fixedBg = true;
});
console.assert(!fixedBg, 'FAIL: background-attachment: fixed found');

// 5. Content block contrast (rough check)
const contentBlock = document.querySelector('.parallax__content-block');
if (contentBlock) {
  const bg = getComputedStyle(contentBlock).backgroundColor;
  console.assert(bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent',
    'FAIL: Content block has no background. Text contrast against moving layers is unpredictable.');
}

// 6. will-change set on layers
layers.forEach(layer => {
  const wc = getComputedStyle(layer).willChange;
  console.assert(wc === 'transform' || wc === 'auto',
    `FAIL: Layer ${layer.className} will-change is "${wc}"`);
});

// 7. Only transform animated (no layout properties)
// Static check -- would need a mutation observer to catch runtime violations
```

## Manual inspection protocol

1. Scroll slowly from top to bottom. Count distinct layer movement speeds. **FAIL** if fewer than 3 visibly different speeds.
2. During scroll, watch layer edges (top and bottom). **FAIL** if any layer edge becomes visible at any scroll position.
3. Check the background layer moves noticeably slower than the content. **FAIL** if the speed differential is imperceptible.
4. Check the foreground layer (if present) moves faster than scroll. **FAIL** if it moves slower or at the same rate as content.
5. Move the mouse across the stage (desktop). **FAIL** if layers shift laterally on a touch device or if they do not shift at all on desktop with a mouse.
6. Resize to 375x812. **FAIL** if parallax motion is still active on mobile.
7. Enable `prefers-reduced-motion: reduce`. **FAIL** if any layer moves.
8. Scroll through on a real phone (or emulated touch). **FAIL** if `smoothTouch` is enabled or touch scroll feels hijacked.
9. Throttle CPU 4x. Scroll through. **FAIL** if frame time exceeds 16ms for more than 3 consecutive frames.
10. Inspect the content block's text contrast at three different scroll positions (start, middle, end of parallax zone). **FAIL** if contrast drops below 4.5:1 at any position.

## Scoring rubric

| # | Criterion | Weight | 0 | 1 | 2 |
|---|---|---|---|---|---|
| 1 | Depth model coherence | 15 | Random speed guesses per layer. | Consistent ratios but no stated model. | Explicit depth model with documented ratios. |
| 2 | Layer edge containment | 15 | Visible edges during normal scroll. | Edges visible only at extreme scroll speed. | No visible edges at any scroll speed. |
| 3 | Narrative structure | 10 | Parallax with no intro/exit. Just layers. | Has intro OR exit, not both. | Intro beat, parallax zone, exit beat. |
| 4 | Mobile strategy | 15 | Same parallax on mobile. | Simplified but still active. | Disabled below 768px, static fallback. |
| 5 | Reduced motion | 10 | No fallback. | Animations killed but layout unchanged. | Full static fallback, section collapses. |
| 6 | Mouse-move parallax | 5 | Not present. | Present but active on touch devices. | Present, gated to `(pointer: fine)`. |
| 7 | Performance | 15 | Animates layout properties. | Transform-only but no will-change. | Transform-only, will-change toggled, < 8ms frames. |
| 8 | Content contrast | 10 | Text on moving bg with no overlay. | Overlay present but contrast untested. | 4.5:1+ verified at multiple scroll positions. |
| 9 | Accessibility markup | 5 | No aria-hidden on decorative layers. | Some layers marked. | All decorative layers aria-hidden="true". |

**Total: 100 points. Ship threshold: 75.**

## Common false passes

1. **"Parallax works" pass.** Two layers move at different speeds. Technically parallax. But both are within 0.1x of each other (e.g. 0.9x and 1.0x), so the depth is imperceptible. Check: can a normal user tell the layers are at different depths?

2. **"Mobile responsive" pass with mini parallax.** The parallax is reduced to smaller values on mobile but still active. On a 375px screen, even small translateY values cause perceivable jank on mid-range phones. Check: test on a real mid-range phone, not just Chrome devtools emulation.

3. **"Layers oversized" pass with CSS but not visually.** `inset: -10%` is set, but the images inside are `object-fit: contain` or have natural aspect ratios that do not fill the oversized container. Check: inspect the actual rendered image bounds vs the viewport.

4. **"No background-attachment" pass with JavaScript equivalent.** The code does not use `background-attachment: fixed` but manually sets `position: fixed` on a layer element, which has the same iOS Safari juddering problem. Check: test on an actual iPhone or iPad.

5. **"Transform-only" pass that hides opacity animation.** The layers use only `transform` for position, but also animate `opacity` on every scroll frame for a "fog" effect. Opacity changes force a full-layer composite. Check: record a performance trace and look for paint entries on layer elements.

## Required fixes by failure mode

| Failure | Root cause | Fix |
|---|---|---|
| Imperceptible depth | Speed ratios too close together | Use the depth model calculator. Ensure at least 0.3x spread between fastest and slowest layers. |
| Visible layer edges | Layers sized at 100% | Set `inset: -10%` or `width: 120%; height: 120%` with negative margins. |
| Mobile jank | Parallax active on touch devices | Wrap init in `window.matchMedia('(max-width: 767px)')` check. Disable on match. |
| Mouse parallax on touch | No pointer media query gate | Wrap in `window.matchMedia('(pointer: fine)').matches` check. |
| Layout thrashing | Animating top/left/margin | Replace with `transform: translateY()`. |
| Text unreadable during scroll | No background on content block | Add backdrop-filter + rgba background to the content text container. |
| iOS juddering | `background-attachment: fixed` or `position: fixed` on layers | Use `transform: translateY()` driven by scroll events instead. |

## Verdict format

```
SCORE: XX / 100

| # | Criterion                  | Points |
|---|----------------------------|--------|
| 1 | Depth model coherence      | X / 15 |
| 2 | Layer edge containment     | X / 15 |
| 3 | Narrative structure        | X / 10 |
| 4 | Mobile strategy            | X / 15 |
| 5 | Reduced motion             | X / 10 |
| 6 | Mouse-move parallax        | X / 5  |
| 7 | Performance                | X / 15 |
| 8 | Content contrast           | X / 10 |
| 9 | Accessibility markup       | X / 5  |

BLOCKING ISSUES:
- [list any criterion scoring 0]

VERDICT: SHIP / NO SHIP
```
