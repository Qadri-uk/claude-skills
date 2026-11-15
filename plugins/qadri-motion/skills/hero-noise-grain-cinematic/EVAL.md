---
name: hero-noise-grain-cinematic-eval
description: Use when verifying that hero-noise-grain-cinematic was actually implemented correctly. Adversarial audit, not a summary.
pairs_with: hero-noise-grain-cinematic
---

# Eval: Cinematic Grain, Vignette & Slow Push-In Hero

## What this audits
The most common shipped failure is grain that is either invisible (opacity too low) or looks like JPEG compression (opacity too high, wrong blend mode), a push-in animation that snaps back at the loop boundary because `alternate` was not set, missing vignette, center-aligned headline (reads as a banner, not a film), and a sans-serif display font destroying the editorial feel.

## Evidence required
- The HTML file opened in a browser at 1440x900.
- Screenshots at: (a) t=0 (initial load), (b) t=3s (content revealed), (c) t=15s (mid push-in).
- Close-up 400% zoom screenshot of a mid-tone area to verify grain visibility.
- DevTools > Rendering > "prefers-reduced-motion: reduce" screenshot.
- 375x812 mobile viewport screenshot.
- DevTools computed styles on the grain layer: opacity, mix-blend-mode.
- DevTools computed styles on the headline: font-family.

## Automated checks

```js
const results = {};

// 1. Check grain layer exists
const grain = document.querySelector('[class*="grain"]');
results.grainExists = !!grain;
if (grain) {
  const style = getComputedStyle(grain);
  results.grainOpacity = parseFloat(style.opacity);
  results.grainOpacityPass = results.grainOpacity >= 0.03 && results.grainOpacity <= 0.12;
  results.grainBlendMode = style.mixBlendMode;
  results.grainBlendPass = ['overlay', 'multiply', 'soft-light'].includes(results.grainBlendMode);
}

// 2. Check vignette
const vignette = document.querySelector('[class*="vignette"]');
results.vignetteExists = !!vignette;
if (vignette) {
  const bg = getComputedStyle(vignette).backgroundImage;
  results.vignetteIsRadial = bg.includes('radial');
}

// 3. Check push-in animation
const img = document.querySelector('[class*="image"], [class*="video"]');
results.imageExists = !!img;
if (img) {
  const anim = getComputedStyle(img);
  results.hasAnimation = anim.animationName !== 'none';
  results.isAlternate = anim.animationDirection.includes('alternate');
}

// 4. Check headline font is serif
const headline = document.querySelector('h1');
results.h1Exists = !!headline;
if (headline) {
  const font = getComputedStyle(headline).fontFamily;
  results.isSerif = /serif|georgia|playfair|dm.serif|times/i.test(font) && !/sans-serif/i.test(font.split(',')[0]);
}

// 5. Check content positioning (not centered)
const content = document.querySelector('[class*="content"]');
if (content) {
  const style = getComputedStyle(content);
  results.textAlign = style.textAlign;
  results.notCentered = style.textAlign !== 'center';
}

// 6. Check aria-hidden on decorative layers
results.grainAriaHidden = grain?.getAttribute('aria-hidden') === 'true';
results.vignetteAriaHidden = vignette?.getAttribute('aria-hidden') === 'true';
const media = document.querySelector('[class*="media"]');
results.mediaAriaHidden = media?.getAttribute('aria-hidden') === 'true';

// 7. Check reduced-motion
const rmExists = [...document.styleSheets].some(sheet => {
  try { return [...sheet.cssRules].some(r => r.media?.mediaText?.includes('prefers-reduced-motion')); }
  catch { return false; }
});
results.reducedMotionCSS = rmExists;

// 8. CTA focus-visible
const cta = document.querySelector('a[class*="cta"]');
results.ctaExists = !!cta;

console.log(JSON.stringify(results, null, 2));
```

**PASS:** All `*Pass`, `*Exists`, and boolean checks truthy. `grainOpacity` in 0.03-0.12 range. Blend mode is overlay/multiply/soft-light. Headline is serif. Text is not center-aligned.
**FAIL:** Any check fails.

## Manual inspection protocol

1. Load the page. FAIL if the background image is not visible within 3 seconds.
2. Zoom to 400% on a mid-tone area of the image. FAIL if grain is not visible (opacity too low) or if it looks like JPEG compression (opacity too high).
3. Watch the push-in for a full cycle (15-25s). FAIL if the animation snaps back instead of reversing (missing `alternate`).
4. Watch for 2+ cycles. FAIL if the loop boundary is visible as a stutter or jump.
5. Inspect the edges and corners. FAIL if there is no vignette (no darkening at edges).
6. Check headline font. FAIL if it is a sans-serif font (not editorial/cinematic).
7. Check content position. FAIL if content is center-aligned horizontally. Bottom-left or lower-third is the target.
8. Toggle prefers-reduced-motion. FAIL if the push-in continues, or if content is not visible.
9. Resize to 375x812. FAIL if image clips incorrectly, content overflows, or grain is distractingly visible.
10. Tab through the page. FAIL if CTA does not show a visible focus ring.
11. Check the grain layer inset. FAIL if grain clips at the edges during push-in zoom (grain layer should extend beyond viewport with negative inset).

## Scoring rubric

| # | Criterion | Weight | 0 | 1 | 2 |
|---|---|---|---|---|---|
| 1 | Grain quality | 15 | No grain, or looks like JPEG artifacts | Grain present but wrong blend mode or opacity | Correct opacity (0.04-0.10), correct blend mode, visible as texture |
| 2 | Vignette | 10 | No vignette | Vignette present but too heavy or too light | Smooth radial falloff, edges darkened, center clear |
| 3 | Push-in quality | 15 | No push-in, or snaps at loop | Push-in present but linear or too fast | Smooth ease-in-out, alternate, 15-25s |
| 4 | Typography | 15 | Sans-serif headline, center-aligned | Serif headline but center-aligned | Serif headline, bottom-left/lower-third position |
| 5 | Image quality | 10 | Blurry, low-res, or placeholder | Decent image but wrong aspect/crop | High-quality, well-cropped, production-ready |
| 6 | Reduced-motion | 10 | No handling | Push-in stops but entrance still animates | All animation stopped, content visible immediately |
| 7 | Entrance choreography | 5 | No entrance animation | All elements appear simultaneously | Staggered reveal: image, then eyebrow, headline, subline, CTA |
| 8 | Layer structure | 5 | Grain/vignette missing or in wrong order | Present but z-index order wrong | Correct stack: image, vignette, grain, content |
| 9 | Semantic HTML | 5 | No h1, no aria-hidden | Partial semantics | h1, aria-hidden on all decorative layers, focus-visible |
| 10 | Mobile adaptation | 10 | Broken layout or unchanged from desktop | Reduced grain but layout issues | Reduced grain, subtler push-in, responsive typography |

**Total: 100. Ship threshold: 75.**

## Common false passes

1. **"Grain works" but `mix-blend-mode: normal` is used.** The grain appears as a white fog layer over the image instead of integrating with image brightness. Check computed `mixBlendMode` is `overlay`, `multiply`, or `soft-light`.

2. **"Push-in loops" but snaps back every 18s.** The animation is `infinite` but not `alternate`. The scale jumps from 1.08 back to 1.0 at each iteration boundary. Check `animation-direction: alternate`.

3. **"Vignette present" but implemented as `box-shadow: inset`.** Box-shadow vignettes have hard edges. Check that the vignette is a `radial-gradient`, not a box-shadow.

4. **"Serif font used" but it is Georgia at default weight.** Georgia is technically serif but reads as body text, not display text. Check for a display serif (DM Serif Display, Playfair Display, or similar) at a large size (3-6rem+).

5. **"Grain extends beyond viewport" but only by 5%.** A push-in to scale(1.08) requires at least 8% extension. At 5% the grain clips at the edges during max zoom. Check `inset: -10%` or larger.

6. **"Content is not centered" but is positioned at top-center.** Top positioning is wrong for cinematic framing. The content should be at the bottom-left or lower-third, following film title conventions.

7. **"Mobile handled" but grain opacity unchanged.** Mobile GPUs struggle with SVG feTurbulence at full opacity. Grain should be reduced to 0.03-0.05 on mobile.

## Required fixes by failure mode

| Failure | Root cause | Fix |
|---|---|---|
| Grain looks like JPEG | Opacity > 0.12 or blend mode normal | Reduce to 0.04-0.08, set mix-blend-mode: overlay |
| Push-in snaps at loop | Missing alternate direction | Add `animation-direction: alternate` |
| No vignette feel | Using box-shadow instead of radial-gradient | Replace with `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)` |
| Banner feel, not cinema | Center-aligned sans-serif headline | Switch to serif, position at bottom-left |
| Grain clips during push-in | Grain inset not large enough | Set `inset: -10%` on grain layer |
| Reduced-motion broken | Only CSS push-in stopped | Stop all animations including entrance reveals under reduced-motion |
| Mobile jank | SVG feTurbulence too heavy | Reduce grain opacity on mobile, or switch to static canvas tile |

## Verdict format

```
## Cinematic Hero Audit

| # | Criterion | Score | Notes |
|---|---|---|---|
| 1 | Grain quality | _/2 | ... |
| ... | ... | ... | ... |
| 10 | Mobile adaptation | _/2 | ... |

**Weighted total: __/100**
**Blocking issues:** [list or "none"]
**Verdict: SHIP / NO SHIP**
```
