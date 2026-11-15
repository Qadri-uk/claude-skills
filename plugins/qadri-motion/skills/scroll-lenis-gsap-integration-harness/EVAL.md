---
name: scroll-lenis-gsap-integration-harness-eval
description: Use when verifying that a Lenis + GSAP ScrollTrigger integration harness was implemented correctly. Adversarial audit targeting double-rAF loops, missing cleanup, broken mobile gating, and seconds/ms unit mismatches.
pairs_with: scroll-lenis-gsap-integration-harness
---

# Eval: Lenis + GSAP Integration Harness

## What this audits
The most common shipped failure is a double `requestAnimationFrame` loop: Lenis running its own rAF alongside GSAP's ticker, doubling per-frame CPU cost and causing visible stutter on mid-range devices. The second most common failure is missing route-change cleanup, which causes stale ScrollTriggers to reference unmounted DOM on the new page, producing console errors and ghost animations.

## Evidence required
- Source code for the scroll harness (lenis init, GSAP wiring, cleanup)
- The running page in Chrome DevTools (Performance panel, Console)
- A route change (navigate away and back) to test cleanup
- The page on a touch device (or emulated touch via DevTools)
- The page with "prefers-reduced-motion: reduce" emulated

## Automated checks

```javascript
// Run in DevTools console on the live page

// CHECK 1: Single rAF loop (no double loop)
let rafCount = 0;
const origRAF = window.requestAnimationFrame;
window.requestAnimationFrame = function(cb) {
  rafCount++;
  return origRAF.call(window, cb);
};
setTimeout(() => {
  // After 1 second, a single rAF loop should have ~60 calls.
  // A double loop would have ~120.
  console.assert(rafCount < 80,
    `FAIL: ${rafCount} rAF calls in 1s. Expected ~60. Likely double rAF loop.`);
  window.requestAnimationFrame = origRAF;
}, 1000);
// PASS: rAF count is ~60 (single loop).

// CHECK 2: Lenis raf receives milliseconds
// (inspect source: gsap.ticker callback passes seconds)
// This is a source-code check, not a runtime check.
// Grep the source for: lenis.raf(time) vs lenis.raf(time * 1000)
console.log('CHECK 2: Manually verify lenis.raf(time * 1000) in source.');

// CHECK 3: ScrollTrigger.update wired to Lenis scroll event
// Lenis fires 'scroll' events. ScrollTrigger.update must be called.
if (window.__lenis) {
  const listeners = window.__lenis._listeners?.scroll || [];
  const hasST = listeners.some(fn =>
    fn === ScrollTrigger?.update || fn.toString().includes('ScrollTrigger')
  );
  console.assert(hasST, 'FAIL: ScrollTrigger.update not in Lenis scroll listeners');
}
// PASS: ScrollTrigger.update is wired.

// CHECK 4: Reduced motion disables Lenis
const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
if (mqReduced.matches) {
  console.assert(!window.__lenis || window.__lenis.isDestroyed,
    'FAIL: Lenis is active despite prefers-reduced-motion: reduce');
}
// PASS: Lenis is not active under reduced motion.

// CHECK 5: Content visible under reduced motion
const reveals = document.querySelectorAll('.reveal');
let invisibleCount = 0;
reveals.forEach(el => {
  const cs = getComputedStyle(el);
  if (parseFloat(cs.opacity) < 0.1) invisibleCount++;
});
console.assert(invisibleCount === 0,
  `FAIL: ${invisibleCount} .reveal elements are invisible (likely stuck at opacity: 0)`);
// PASS: All reveals are visible.

// CHECK 6: No ScrollTrigger errors in console after route change
// (manual: navigate away and check console for errors)
console.log('CHECK 6: Navigate away and back. Check for ScrollTrigger errors.');

// CHECK 7: Resize debounce exists
// Rapidly resize and count ScrollTrigger.refresh calls
let refreshCount = 0;
const origRefresh = ScrollTrigger.refresh;
ScrollTrigger.refresh = function() {
  refreshCount++;
  return origRefresh.apply(this, arguments);
};
// Simulate 10 rapid resizes
for (let i = 0; i < 10; i++) {
  window.dispatchEvent(new Event('resize'));
}
setTimeout(() => {
  console.assert(refreshCount <= 2,
    `FAIL: ${refreshCount} ScrollTrigger.refresh calls from 10 rapid resizes. Expected 1 (debounced).`);
  ScrollTrigger.refresh = origRefresh;
}, 500);
// PASS: Resize is properly debounced.
```

## Manual inspection protocol

1. Open DevTools Performance panel. Record 3 seconds of idle page (no scrolling). FAIL if there are two distinct rAF chains visible in the flame chart (two parallel recursive `requestAnimationFrame` call stacks per frame).

2. Scroll smoothly for 5 seconds. Check the "Scripting" lane in the Performance panel. FAIL if any frame exceeds 10ms in scripting (Lenis lerp + ScrollTrigger update should be < 3ms combined).

3. On a touch device (or DevTools touch emulation), reload the page. FAIL if Lenis smooth scroll is active (scroll should feel native, not lerped).

4. Enable "prefers-reduced-motion: reduce" in DevTools Rendering panel. Reload. FAIL if any content is invisible, stuck at opacity:0, or positioned offscreen. FAIL if smooth scroll is active.

5. Navigate to a different route, then navigate back. Open Console. FAIL if any errors appear referencing unmounted DOM elements or null ScrollTrigger targets.

6. Click a scroll-nav link. FAIL if the scroll does not land the target section at the correct position (accounting for fixed nav offset). FAIL if ScrollTrigger animations do not fire correctly at the new scroll position.

7. Resize the browser rapidly (drag the window edge). FAIL if the page visibly reflows more than once after you stop resizing (indicates missing debounce).

8. On iOS Safari, scroll a pinned section. FAIL if the pinned section jumps or flickers when the URL bar appears/disappears.

## Scoring rubric

| # | Criterion | 0 | 1 | 2 | Weight |
|---|---|---|---|---|---|
| 1 | Single rAF loop | Two rAF loops running | One loop but Lenis.raf called without GSAP ticker | GSAP ticker drives Lenis, no separate rAF | x3 |
| 2 | Lenis raf unit | Seconds passed to lenis.raf (animations 1000x too fast) | Milliseconds but with manual Date.now() instead of ticker time | GSAP ticker time * 1000 correctly passed | x2 |
| 3 | ScrollTrigger wired | ScrollTrigger not updated on Lenis scroll | Wired but via scroll event listener instead of Lenis.on | lenis.on('scroll', ScrollTrigger.update) correctly wired | x2 |
| 4 | Reduced motion | Lenis runs despite reduced motion | Lenis gated but reveals stuck invisible | Lenis gated AND all content visible | x2 |
| 5 | Touch device gating | Lenis runs on touch (laggy touch scroll) | Touch detected but Lenis not fully disabled | smoothTouch: false AND/OR Lenis skipped on touch | x2 |
| 6 | Route cleanup | No cleanup (stale triggers, memory leaks) | Partial cleanup (triggers killed but Lenis not destroyed) | Full cleanup: tweens, triggers, Lenis, resize listener | x3 |
| 7 | Resize debounce | No debounce (refresh on every event) | Debounced but refreshes on height-only change (mobile URL bar) | Debounced with width-only gate | x1 |
| 8 | Scroll nav | No scroll-to-section nav | Nav scrolls but no offset for fixed header | Nav scrolls with offset, updates active state, Lenis fallback | x1 |
| 9 | Pin stability iOS | Pins jump on iOS URL bar change | Mostly stable but occasional flicker | Stable (normalizeScroll or no pins on mobile) | x2 |
| 10 | lagSmoothing disabled | lagSmoothing still active (Lenis desyncs after tab switch) | Not checked | gsap.ticker.lagSmoothing(0) called after Lenis wire | x2 |

**Total: 40 points. Ship threshold: 32+.**

## Common false passes

1. **"Scroll feels smooth" but two rAF loops are running.** On a fast machine, double rAF is invisible. On a mid-range phone, it causes consistent 2-3ms extra scripting per frame, pushing past the 16ms budget in complex sections. Profile on CPU 4x throttle.

2. **Cleanup "works" but only kills ScrollTriggers, not Lenis.** Lenis keeps running its lerp loop on the new page, consuming CPU and potentially intercepting scroll events for a page that does not need smooth scroll.

3. **Reduced motion removes animation but content stays at opacity: 0.** The `gsap.from({opacity: 0})` call sets the element to opacity 0 then animates to 1. With reduced motion, the animation does not play, so the element stays invisible. Fix: use `gsap.set` to force final state.

4. **Touch gating checks `'ontouchstart' in window` instead of `pointer: coarse`.** Desktop browsers with touch support (Surface, Chromebook) return true for `ontouchstart`, disabling Lenis on a mouse-driven device. `(pointer: coarse)` correctly identifies touch-primary devices.

5. **Resize debounce exists but fires on height changes.** iOS URL-bar show/hide triggers resize events with only height changes. This causes ScrollTrigger.refresh on every scroll direction change on iOS, which is expensive and causes visible pin jitter.

6. **GSAP ticker time passed directly to Lenis.** GSAP ticker callback receives time in seconds. Lenis expects milliseconds. Passing seconds makes Lenis interpolate at 1/1000th speed. The page appears to work (smooth scroll still functions) but the lerp constant is effectively 1000x lower, making scroll feel extremely laggy or frozen.

## Required fixes by failure mode

| Failure | Root cause | Fix |
|---|---|---|
| Double rAF loop | Lenis.start() creates its own rAF; GSAP ticker is separate | Drive Lenis from gsap.ticker.add(), never call lenis.start() |
| Lenis 1000x too slow | Seconds passed to lenis.raf | Multiply: lenis.raf(time * 1000) |
| Stale triggers on new page | No cleanup on route change | Kill all tweens, all ScrollTriggers, destroy Lenis in cleanup |
| Content invisible reduced motion | gsap.from sets initial state, animation never plays | Use gsap.set for reduced motion, or set CSS defaults |
| Pins jump on iOS | URL bar height change triggers refresh | Gate refresh to width-only changes; enable normalizeScroll |
| Lenis desyncs after tab switch | lagSmoothing still active | gsap.ticker.lagSmoothing(0) after wiring Lenis |

## Verdict format

```
SCORE: XX / 40
| # | Criterion | Score | Notes |
|---|-----------|-------|-------|
| 1 | Single rAF loop | X/2 | ... |
...
BLOCKING: [list any criterion scoring 0]
VERDICT: SHIP / NO SHIP
```
