---
name: scroll-video-chapters-eval
description: Use when verifying that scroll-video-chapters was actually implemented correctly. Adversarial audit, not a summary.
pairs_with: scroll-video-chapters
---

# Eval: Scroll-Linked Video Chapter Navigation

## What this audits
The most common shipped failure is a video scrubber that looks correct on slow, deliberate scroll but falls apart under real usage: seek latency causes visible frame stuttering on fast scrub, chapter boundaries land on the wrong timecodes after resize, and the reduced-motion fallback is either missing or non-functional.

## Evidence required
- The built HTML file, CSS, and JS source files
- A running instance in a browser (local server or file://)
- DevTools Performance panel recording during a full scroll-through and scroll-back
- DevTools Network panel showing video request (checking `faststart` and keyframe interval)
- Computed styles on the pinned element at mid-scroll
- Chapter nav DOM with attributes inspected
- Emulated `prefers-reduced-motion: reduce` in DevTools

## Automated checks

### Static source checks
```bash
# Must have rAF gating -- no bare currentTime assignment in scroll handler
grep -n 'currentTime' chapters.js | grep -v 'requestAnimationFrame\|_flush\|raf\|seeked'
# FAIL if any line sets currentTime outside a rAF-gated function

# Must have playsinline on video
grep -c 'playsinline' index.html
# FAIL if 0

# Must have prefers-reduced-motion handler
grep -c 'prefers-reduced-motion' styles.css
# FAIL if 0

# Must not autoplay the video
grep -c 'autoplay' index.html
# FAIL if > 0 (autoplay fights scrub)

# Chapter data must compute scroll ranges from duration, not hardcode pixel values
grep -n 'scrollStart\|scrollEnd\|scrollTo' chapters.js
# FAIL if values are hardcoded pixel numbers instead of computed from chapter durations
```

### Runtime checks
```js
// Check 1: rAF gate exists -- scrub engine does not set currentTime synchronously
// Set a breakpoint or monkey-patch video.currentTime setter, scroll fast, count calls per frame
const video = document.querySelector('video');
let seekCount = 0;
const orig = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
Object.defineProperty(video, 'currentTime', {
  set(v) { seekCount++; orig.set.call(this, v); },
  get() { return orig.get.call(this); }
});
// Scroll full range programmatically
window.scrollTo(0, document.body.scrollHeight);
await new Promise(r => setTimeout(r, 2000));
// PASS if seekCount < 200 for a 600vh scroll. FAIL if seekCount > 500 (no rAF gating).

// Check 2: Chapter nav active state accuracy
const chapters = document.querySelectorAll('.chapter-nav__item');
const activeCount = document.querySelectorAll('.chapter-nav__item.active').length;
// PASS if exactly 1 active. FAIL if 0 or > 1.

// Check 3: Overlays -- only one visible at a time
const overlays = document.querySelectorAll('.chapter-overlay');
const visibleOverlays = [...overlays].filter(el => getComputedStyle(el).opacity > 0.5);
// PASS if visibleOverlays.length <= 1. FAIL if > 1.

// Check 4: Pinned element has position:sticky or position:fixed at mid-scroll
window.scrollTo(0, window.innerHeight * 3);
await new Promise(r => setTimeout(r, 500));
const pinned = document.querySelector('.video-chapters__pinned');
const pos = getComputedStyle(pinned).position;
// PASS if pos === 'fixed' || pos === 'sticky'. FAIL otherwise.

// Check 5: Reduced motion fallback
// Enable via DevTools emulation, reload
const controls = document.querySelector('video').hasAttribute('controls');
const skipButtons = document.querySelectorAll('nav button').length;
// PASS if controls === true AND skipButtons >= 3. FAIL otherwise.

// Check 6: Keyboard accessibility
const firstNavItem = document.querySelector('.chapter-nav__item');
const tabindex = firstNavItem.getAttribute('tabindex');
const role = firstNavItem.getAttribute('role');
// PASS if tabindex === '0' AND role === 'button'. FAIL otherwise.
```

## Manual inspection protocol

1. Open the page. Scroll slowly through the entire video. Verify that the video advances smoothly and that chapter labels change at natural boundaries. FAIL if any chapter transition fires more than 3 seconds early or late relative to the expected timecode.

2. Scroll back up through the entire range. Verify the video reverses and chapters update in reverse order. FAIL if the video does not reverse (stays paused at last frame).

3. Scroll fast (flick the trackpad or spin the mouse wheel aggressively) through the full range. FAIL if the video stutters visibly for more than 1 second or freezes on a single frame while scroll continues.

4. Click each chapter nav item. Verify the page scrolls to the correct position and the video lands on the correct timecode (+/- 1 second). FAIL if any chapter click lands more than 3 seconds from the expected timecode.

5. Resize the browser window from 1440px to 768px wide. Verify the chapter nav switches to the mobile layout and the scroll budget still functions correctly. FAIL if chapters overlap or scroll ranges break after resize.

6. Tab through the chapter nav items with keyboard only. Press Enter on the third item. FAIL if focus does not reach the items or Enter does not trigger navigation.

7. Enable `prefers-reduced-motion: reduce` in DevTools. Reload. FAIL if the page still uses sticky pinning/scrub, or if the video lacks native controls, or if chapter skip buttons are absent.

8. Open DevTools Performance panel. Record a full slow scroll-through. Check that no single scroll handler execution exceeds 4ms. FAIL if handler consistently exceeds 8ms.

## Scoring rubric

| # | Criterion | Weight | 0 | 1 | 2 |
|---|---|---|---|---|---|
| 1 | rAF-gated seeking | 15 | Bare currentTime in scroll handler | rAF gate exists but no threshold check | Full rAF gate with 0.03s threshold |
| 2 | Chapter accuracy | 15 | Chapters desync by > 3s | Chapters approximately correct (+/- 2s) | Chapters land within 0.5s of expected timecode |
| 3 | Reverse scrub | 10 | Video does not reverse | Reverses but stutters or desyncs | Smooth bidirectional scrub |
| 4 | Chapter nav active state | 10 | No active state or multiple active | Active state present but occasionally wrong | Always exactly one correct active |
| 5 | Click-to-chapter | 10 | No click handling | Clicks work but land on wrong timecode | Clicks land within 1s of target |
| 6 | Progress bar | 5 | Missing | Present but does not fill correctly | Smooth 0-100% fill |
| 7 | Reduced-motion fallback | 10 | Missing entirely | Partial (no chapter buttons) | Full: native controls + chapter skip buttons |
| 8 | Keyboard accessibility | 5 | Not focusable | Focusable but no Enter handler | Full keyboard support with ARIA |
| 9 | Performance (scroll handler < 4ms) | 10 | Handler > 8ms regularly | Handler 4-8ms | Handler < 4ms consistently |
| 10 | Video encoding | 5 | Default keyframe interval, no faststart | Faststart present, default keyframes | 1s keyframe interval + faststart |
| 11 | Overlay management | 5 | Overlays stack or flicker | Mostly correct, occasional double | Clean single-overlay transitions |

**Total: 100 points. Ship threshold: 75.**

## Common false passes

1. **Looks smooth on slow scroll, breaks on fast scroll.** The seek-per-scroll-event pattern works fine when the user scrolls at 50px/s but overwhelms the decoder at 500px/s. The rAF gate and seek threshold are specifically to prevent this -- test with aggressive scrolling, not gentle scrolling.

2. **Chapter nav highlights based on scroll position instead of video time.** If the nav maps scroll position to chapter index directly (without going through the video's actual timecode), it can desync after seek latency delays. The active chapter should be computed from the scrub engine's target time, not from raw scroll progress.

3. **Reduced-motion test passes because the CSS media query exists but the JS branch does not.** The CSS alone removes sticky positioning, but without the JS branch the chapter controller still initializes, creates overlays, and attaches scroll listeners to a non-pinned container, producing broken layout.

4. **Keyboard focus lands on nav items but Enter does nothing.** The DOM has `tabindex="0"` (passing the automated check) but the `keydown` listener was never attached.

5. **Progress bar uses CSS `transition` to animate width.** This creates a visually smooth bar that is always ~300ms behind the actual scroll position. The bar should be set directly (no CSS transition on `width`) so it tracks scroll exactly.

6. **Chapter boundaries computed once on load, never recomputed on resize.** After a window resize, the container height changes but the chapter's scroll offsets are stale. Click-to-chapter navigation lands on wrong positions. Must call `ScrollTrigger.refresh()` and recompute nav offsets on resize.

7. **Canvas fallback preloads all frames eagerly.** Looks like it works, but on a slow connection the page is frozen for 10+ seconds while 90 frames download. The priority-ordered streamer from `image-sequence-scrubbing` is required.

## Required fixes by failure mode

| Failure | Root cause | Fix |
|---|---|---|
| Video stutters on fast scrub | No rAF gate on seek | Implement ScrubEngine with rAF + seeking flag + 0.03s threshold |
| Chapters desync after resize | Stale scroll offsets | Call `ScrollTrigger.refresh()` on resize; recompute chapter ranges from current container height |
| Reverse scrub broken | Video `play()` called in scroll handler | Never call `play()`. Only set `currentTime`. |
| Overlay stacking | Multiple overlays set to active | Clear all `.active` classes before setting the current one |
| Reduced motion non-functional | Only CSS, no JS branch | Add `matchMedia` check that skips ScrollTrigger init and adds native controls |
| Click-to-chapter wrong position | Using pixel offset instead of progress-mapped offset | Compute target from `triggerInstance.start + (chapterProgress * range)` |
| Progress bar laggy | CSS `transition` on width | Remove transition; set `width` directly |

## Verdict format

```
## Video Chapter Scrub Audit

| # | Criterion | Score | Notes |
|---|---|---|---|
| 1 | rAF-gated seeking | _/2 | ... |
| ... | ... | ... | ... |

**Total: __/100**
**Blocking issues:** [list or "none"]
**Verdict: SHIP / NO SHIP**
```
