---
name: hero-video-scrub-apple-eval
description: Use when verifying that hero-video-scrub-apple was actually implemented correctly. Adversarial audit, not a summary.
pairs_with: hero-video-scrub-apple
---

# Eval: Apple-Style Canvas Image-Sequence Scrub Hero

## What this audits
The most common shipped failure is a scroll scrub hero that loads all frames before showing anything, leaving the user staring at a blank section for 5-15 seconds on a mobile connection. The second failure is dead scroll at the end of the pinned section because the scroll budget was not matched to the frame count.

## Evidence required
- The built HTML file, opened at 1440x900 and 375x812
- Network panel waterfall showing the preload sequence (eager batch should complete first, then streaming)
- Chrome DevTools Performance recording of a full scroll through the sequence
- Measurement of time from page load to first frame visible
- Screenshot at the final frame of the sequence to verify the full sequence plays
- Console output showing no errors during fast scroll (back and forth)
- Total payload of all frame images summed from Network panel
- Test with reduced motion enabled showing fallback state

## Automated checks

```bash
# PASS: createImageBitmap used
grep -qE "createImageBitmap" index.html && echo "PASS: createImageBitmap" || echo "FAIL: no off-thread decode"

# PASS: requestAnimationFrame throttling
grep -qE "requestAnimationFrame" index.html && echo "PASS: rAF throttling" || echo "FAIL: no rAF gate on draw"

# PASS: ScrollTrigger with pin
grep -qE "pin:\s*true" index.html && echo "PASS: pinned section" || echo "FAIL: section not pinned"

# PASS: AbortController for fetch cancellation
grep -qE "AbortController\|abort" index.html && echo "PASS: fetch abort" || echo "FAIL: no fetch abort on teardown"

# PASS: bitmap.close() in teardown
grep -qE "\.close\(\)" index.html && echo "PASS: bitmap disposal" || echo "FAIL: bitmaps not closed"

# PASS: DPR capped
grep -qE "Math\.min.*devicePixelRatio" index.html && echo "PASS: DPR cap" || echo "FAIL: no DPR cap"

# PASS: passive scroll
grep -qE "passive" index.html && echo "PASS: passive listener" || echo "FAIL: no passive flag"

# PASS: Reduced motion
grep -qE "prefers-reduced-motion" index.html && echo "PASS: reduced motion" || echo "FAIL: no reduced motion"

# PASS: Loading state
grep -qE "loading\|skeleton\|spinner" index.html && echo "PASS: loading state" || echo "FAIL: no loading indicator"
```

### Runtime checks
```js
// Check canvas is DPR-sized
const c = document.querySelector('canvas');
const dpr = Math.min(devicePixelRatio, 2);
console.assert(c.width >= c.clientWidth * dpr * 0.9, `FAIL: canvas backing store too small`);

// Check ScrollTrigger is active
console.assert(ScrollTrigger.getAll().length > 0, 'FAIL: no ScrollTrigger instances');

// Verify scroll budget matches frame count
const st = ScrollTrigger.getAll()[0];
if (st) {
  const budget = st.end - st.start;
  const viewportH = window.innerHeight;
  const budgetVh = budget / viewportH * 100;
  console.log(`Scroll budget: ${budgetVh.toFixed(0)}vh`);
}

// Scroll to end and check canvas is not empty
window.scrollTo(0, document.body.scrollHeight);
setTimeout(() => {
  const pixels = c.getContext('2d').getImageData(c.width/2, c.height/2, 1, 1).data;
  console.assert(pixels[0] + pixels[1] + pixels[2] > 0, 'FAIL: canvas is black at final frame');
}, 1000);
```

## Manual inspection protocol

1. Load the page on a fast connection. FAIL if the hero shows nothing (no loading spinner/skeleton) for more than 1 second.
2. Scroll through the entire pinned section at a moderate pace. FAIL if more than 3 frames show visible "frame skipping" (discontinuous jumps).
3. Scroll rapidly back and forth. FAIL if the canvas goes blank (no nearest-frame fallback).
4. Scroll to the very end of the pinned section. FAIL if there is more than 10vh of scroll after the last frame change (dead scroll).
5. Continue scrolling past the pinned section. FAIL if the unpin transition is jarring (section should smoothly unpin).
6. Check text overlays: scroll to 0%, 30%, 75% progress. FAIL if overlays do not appear/disappear at their declared keyframes.
7. Open Network panel. Reload. FAIL if all frames are fetched in URL order instead of eager batch first, then proximity-ordered streaming.
8. Throttle to Slow 3G. Reload. FAIL if the hero blocks interactivity while frames load (scroll should work as soon as the first frame draws).
9. Enable reduced motion. Reload. FAIL if the canvas is visible or frames are loaded.
10. Reload normally. Measure time from navigation start to first frame drawn. FAIL if > 3 seconds on a fast connection.

## Scoring rubric

| # | Criterion | Weight | 0 (Fail) | 1 (Partial) | 2 (Pass) |
|---|---|---|---|---|---|
| 1 | Priority preloading (eager batch first) | 3 | All frames loaded sequentially | Eager batch exists but too small (<5 frames) | 10+ frame eager batch, then proximity-sorted streaming |
| 2 | Off-thread decode (createImageBitmap) | 2 | Uses new Image() without .decode() | Uses .decode() but on main thread | createImageBitmap for off-thread decode |
| 3 | rAF-throttled draw | 2 | Draws directly in scroll handler | rAF used but re-queues even when frame unchanged | Single pending-frame + rAF gate, skips if frame unchanged |
| 4 | Nearest-frame fallback | 2 | Canvas goes blank when frame not loaded | Shows last drawn frame (stale) | Searches for nearest loaded frame |
| 5 | Scroll budget matches frame count | 2 | Hardcoded scroll distance unrelated to frames | Approximate but creates >20vh dead scroll | Budget = frameCount * vhPerFrame, <10vh dead scroll |
| 6 | Text overlay keyframes | 1 | No text overlays | Overlays exist but timing is wrong | Overlays appear/disappear at correct progress thresholds |
| 7 | Loading state | 2 | No loading indicator | Loading indicator but stays too long or never clears | Skeleton/spinner shows on load, fades after first frame draw |
| 8 | DPR-aware canvas | 1 | Canvas at CSS size (blurry) | DPR applied but uncapped | DPR-capped at 2, backing store sized correctly |
| 9 | Responsive frame sourcing | 1 | Same resolution for all viewports | Two tiers (mobile/desktop) | Three tiers (mobile/tablet/desktop) |
| 10 | Reduced motion | 2 | Not handled | Canvas hidden but frames still load | Zero frames loaded, static fallback shown |
| 11 | Teardown (abort + close) | 1 | No cleanup | Partial (aborts fetches but not bitmaps, or vice versa) | Full: abort controller + bitmap.close() on all |
| 12 | Total payload under budget | 2 | No awareness of payload | Payload measured but over budget | Under 3MB for 90-frame desktop sequence |

**Total: 42 points. Ship threshold: 34+ with no criterion at 0.**

## Common false passes

1. **"Preloading" that just fetches all frames in order.** Without priority sorting, the browser fetches frame 1, 2, 3... but the user has scrolled to frame 60. Frames near the current position are still missing.
2. **Loading indicator that never clears.** If the loading state checks `allFramesLoaded` instead of `firstFrameDrawn`, the hero shows a spinner for the entire streaming duration, which can be 10+ seconds.
3. **Dead scroll at the end.** A hardcoded `end: '+=500%'` for a 90-frame sequence at 4vh/frame = 360vh creates 140vh of dead scroll. The user keeps scrolling and nothing happens.
4. **Canvas "works" but is blurry on retina.** Canvas `width`/`height` attributes set to CSS dimensions (e.g., 1440x900) on a 2x DPR screen renders at half resolution and CSS-upscales. Looks fine on 1x but blurry on retina.
5. **Smooth scrolling library creates one-frame lag.** Lenis or smooth-scroll adds interpolation delay. The scrubber draws the previous frame, not the current one. The lag is invisible at slow scroll but causes a visible "one frame behind" at fast scroll speeds.
6. **Mobile gets desktop-sized frames.** Without responsive sourcing, mobile downloads 1440px frames and downscales them on the canvas, wasting 70% of the bandwidth.
7. **Bitmaps accumulate across route changes in SPA.** Without `.close()` on teardown, each decoded bitmap (~5.5MB at 1440x960) stays in memory. After 3 route changes, 3 * 90 * 5.5MB = ~1.5GB leaked.

## Required fixes by failure mode

| Failure | Root cause | Fix |
|---|---|---|
| Long wait before first frame | All frames loaded before draw | Split into eager batch (draw after 1st frame) + streaming remainder |
| Frame skip on fast scroll | No nearest-frame fallback | Search +/- from target index for closest loaded bitmap |
| Dead scroll | Hardcoded scroll budget | Compute: `frameCount * vhPerFrame` |
| Blurry canvas | Backing store not DPR-scaled | `canvas.width = clientWidth * Math.min(dpr, 2)` |
| Memory leak | Bitmaps not closed on teardown | Call `.close()` on every bitmap, abort fetches |
| Mobile payload | No responsive sourcing | Serve 640x420 frames on mobile, 1440x960 on desktop |
| Overlays at wrong time | data-in/data-out not matching scroll budget | Verify progress values match the actual keyframes in the sequence |

## Verdict format
```
## Scrub Hero Audit

| # | Criterion | Score |
|---|---|---|
| 1 | Priority preloading | X/2 |
| ... | ... | ... |

**Total: XX / 42**
**Blocking issues:** [list or "none"]
**SHIP / NO SHIP**
```
