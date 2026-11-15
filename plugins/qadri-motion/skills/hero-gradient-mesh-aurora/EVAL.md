---
name: hero-gradient-mesh-aurora-eval
description: Use when verifying that hero-gradient-mesh-aurora was actually implemented correctly. Adversarial audit, not a summary.
pairs_with: hero-gradient-mesh-aurora
---

# Eval: Animated Mesh-Gradient Aurora Hero

## What this audits
The most common shipped failure is a hero that "has blobs" but fails at the job of being a hero: unreadable text because the contrast scrim was skipped, blobs that visibly reset because durations share a common factor, the dreaded purple-teal-pink AI gradient, no reduced-motion handling, and entrance animations that stagger so slowly the CTA appears after the user has already scrolled past.

## Evidence required
- The actual HTML file opened in a browser (not a description of it).
- Screenshots at: (a) initial load (t=0), (b) t=2s (entrance complete), (c) t=30s (mid-loop), (d) 375x812 mobile viewport.
- DevTools > Rendering > "Emulate prefers-reduced-motion: reduce" screenshot.
- DevTools > Performance recording of a 5-second idle after load (for frame-time data).
- DevTools > Layers panel screenshot showing compositor layer count.
- Computed styles on `.hero__headline` showing contrast ratio (or manual WCAG check).

## Automated checks

```js
// Run in browser DevTools console or page.evaluate()

const results = {};

// 1. Check blob count
const blobs = document.querySelectorAll('[class*="blob"]');
results.blobCount = blobs.length;
results.blobCountPass = blobs.length >= 3 && blobs.length <= 5;

// 2. Check for AI-slop color combo
const blobColors = [...blobs].map(b => getComputedStyle(b).backgroundColor);
const hexColors = blobColors.map(c => {
  const m = c.match(/\d+/g);
  return m ? '#' + m.slice(0,3).map(n => (+n).toString(16).padStart(2,'0')).join('') : c;
});
const hasPurple = hexColors.some(c => /^#[6-9a-f][0-4][0-9a-f]{2}[c-f][0-9a-f]$/i.test(c));
const hasTeal = hexColors.some(c => /^#[0-3][0-9a-f][8-f][0-9a-f][c-f][0-9a-f]$/i.test(c));
const hasPink = hexColors.some(c => /^#[c-f][0-9a-f][0-4][0-9a-f][6-b][0-9a-f]$/i.test(c));
results.aiSlopPalette = hasPurple && hasTeal && hasPink;
results.aiSlopPass = !results.aiSlopPalette;

// 3. Check reduced-motion support
const rmSheet = [...document.styleSheets].some(sheet => {
  try {
    return [...sheet.cssRules].some(r =>
      r.media && r.media.mediaText.includes('prefers-reduced-motion')
    );
  } catch { return false; }
});
results.reducedMotionPass = rmSheet;

// 4. Check aria-hidden on aurora container
const auroraContainer = document.querySelector('[class*="aurora"]');
results.ariaHiddenPass = auroraContainer?.getAttribute('aria-hidden') === 'true';

// 5. Check h1 exists
results.h1Pass = document.querySelectorAll('h1').length === 1;

// 6. Check dvh usage
const heroEl = document.querySelector('[class*="hero"]') || document.querySelector('section');
const heroHeight = getComputedStyle(heroEl).height;
const cssText = [...document.styleSheets].flatMap(s => {
  try { return [...s.cssRules].map(r => r.cssText); } catch { return []; }
}).join(' ');
results.dvhUsed = cssText.includes('100dvh') || cssText.includes('dvh');

// 7. Check will-change on blobs
const hasWillChange = [...blobs].every(b =>
  getComputedStyle(b).willChange.includes('transform')
);
results.willChangePass = hasWillChange;

// 8. Check CTA focus-visible
const ctas = document.querySelectorAll('a[class*="cta"], button[class*="cta"]');
results.ctaCount = ctas.length;
results.ctaPass = ctas.length >= 1;

// 9. Check scrim/backdrop-filter exists
const content = document.querySelector('[class*="content"]');
const before = content ? getComputedStyle(content, '::before') : null;
const hasScrim = before && before.backgroundImage !== 'none';
const hasBackdrop = content && getComputedStyle(content).backdropFilter !== 'none';
results.contrastProtectionPass = hasScrim || hasBackdrop;

console.log(JSON.stringify(results, null, 2));
```

**PASS condition:** All `*Pass` fields are `true`. `blobCount` is 3-5. `aiSlopPalette` is `false`.
**FAIL condition:** Any `*Pass` field is `false`, or `blobCount` outside 3-5 range, or `aiSlopPalette` is `true`.

## Manual inspection protocol

1. Load the page at 1440x900. Wait 3 seconds. FAIL if the headline is not fully visible and readable over the aurora by t=2s.
2. Watch the aurora for 60 seconds without interaction. FAIL if all blobs visibly return to the same starting position at any point (duration sync).
3. Move the mouse across the hero (if JS mouse-reactivity is implemented). FAIL if blobs snap to the cursor instead of lagging smoothly.
4. Open DevTools > Rendering > toggle "prefers-reduced-motion: reduce." FAIL if any animation continues, or if content becomes invisible.
5. Resize to 375x812. FAIL if horizontal scrollbar appears, if more than 3 blobs are visible, or if the headline overflows its container.
6. Throttle CPU 4x in DevTools > Performance. Record 5 seconds of idle. FAIL if median frame time exceeds 16ms.
7. Inspect the headline's computed color and the background color at the headline's bounding box. FAIL if WCAG AA contrast ratio is below 4.5:1 at the tested frame.
8. Tab through the page. FAIL if CTA buttons do not show a visible focus ring.
9. Check DevTools > Layers. FAIL if more than 6 compositor layers are created by the aurora (excessive promotion).
10. View page source. FAIL if any render-blocking `<script>` exists before the hero markup (CSS-only version).

## Scoring rubric

| # | Criterion | Weight | 0 | 1 | 2 |
|---|---|---|---|---|---|
| 1 | Brand-safe palette | 15 | Purple-teal-pink combo used | Colors non-default but not brand-derived | Colors pulled from actual brand palette |
| 2 | Seamless loop | 10 | Visible reset/jump in loop | Minor stutter at loop boundary | No perceptible seam after 60s observation |
| 3 | Contrast guarantee | 15 | No scrim; text unreadable on some frames | Scrim present but contrast < 4.5:1 at worst case | 4.5:1+ verified at worst-case blob position |
| 4 | Reduced-motion | 15 | No prefers-reduced-motion handling | Animation stops but content layout breaks | All animation stopped, content fully visible and styled |
| 5 | Mobile adaptation | 10 | Same blob count/blur on mobile, or broken layout | Reduced blur but same blob count | Fewer blobs, reduced blur, no overflow |
| 6 | Entrance choreography | 10 | No entrance animation | All elements appear simultaneously | Staggered entrance: aurora first, then content elements |
| 7 | Performance (frame time) | 10 | Jank visible (>33ms frames) | Occasional dropped frames (16-33ms) | Solid 60fps+ on desktop, 60fps on mobile |
| 8 | Semantic HTML | 5 | No h1, no aria attributes | h1 present but missing aria-hidden on decorative elements | h1, aria-hidden on aurora/scroll-cue, landmark on section |
| 9 | CTA usability | 5 | No CTA, or CTA is a div | CTA present but no focus ring | CTA with hover state, focus-visible ring, proper link markup |
| 10 | Blob animation quality | 5 | Blobs move in straight lines or obvious circles | Blobs move on varied paths but uniform timing | Varied paths, prime durations, scale/rotate variation |

**Total: 100 points. Ship threshold: 75.**

## Common false passes

1. **"It loops seamlessly" but all durations are 20s.** The keyframe start/end match, so one blob loops cleanly, but all four reset simultaneously every 20s. The pattern visibly snaps back to its opening configuration. Check by watching for 60+ seconds.

2. **"Contrast is fine" tested only on the starting frame.** At t=0 the brightest blob may be far from the headline. At t=12s it may drift directly behind the text. Contrast must be checked at the worst-case frame, not just the initial state.

3. **"Reduced motion works" but the entrance animation still fires.** The blob drift is killed, but the `content-enter` translateY animation still runs, making elements slide in. All animation must stop under reduced-motion, not just the background.

4. **"Mobile is handled" but blob 4 is hidden with `opacity: 0` instead of `display: none`.** The blob is still composited, consuming GPU memory and creating a layer. Use `display: none` to actually remove it from rendering.

5. **"Brand colors" but the colors are just named CSS variables mapping to the same purple-teal.** Changing `--aurora-1: #7c3aed` to `--brand-primary: #7c3aed` is not brand-safe; it is the same purple with a different variable name.

6. **"GPU accelerated" but `filter: blur()` is animated instead of static.** Blur on a container is repainted every frame if the container's content changes (e.g., blobs animating). The blur must be a static property; only blob transforms should animate.

7. **Focus ring "exists" but is the browser default outline hidden by `outline: none`.** Check that `:focus-visible` has an explicit, visible outline style, not just the absence of `outline: none`.

## Required fixes by failure mode

| Failure | Root cause | Fix |
|---|---|---|
| Blobs visibly reset | All durations share a common factor | Change durations to co-prime values (17, 19, 23, 29) |
| Text unreadable on some frames | No contrast scrim | Add radial-gradient scrim pseudo-element on `.hero__content` |
| Jank on mobile | Too many blurred layers | Drop to 2-3 blobs, reduce blur to 60-80px, add `will-change: transform` |
| Animation plays under reduced-motion | Missing or incomplete media query | Add `@media (prefers-reduced-motion: reduce)` that targets ALL animated elements, not just blobs |
| Purple-teal-pink palette | Default/AI colors used | Replace with 3-5 hues from the actual brand palette |
| Entrance too slow | Content stagger delays too long | Keep total entrance under 2s: aurora 0-1.8s, content starts at 0.6s |
| Horizontal scroll on mobile | Blob inset of -25% bleeds out | Ensure `.hero` has `overflow: hidden` |
| No focus ring on CTAs | Missing `:focus-visible` styles | Add `outline: 2px solid currentColor; outline-offset: 2px` on `:focus-visible` |

## Verdict format

```
## Aurora Hero Audit

| # | Criterion | Score | Notes |
|---|---|---|---|
| 1 | Brand-safe palette | _/2 | ... |
| ... | ... | ... | ... |
| 10 | Blob animation quality | _/2 | ... |

**Weighted total: __/100**
**Blocking issues:** [list or "none"]
**Verdict: SHIP / NO SHIP**
```
