---
name: scroll-native-css-timeline-page-eval
description: Use when verifying that a native CSS scroll-driven timeline page was actually implemented correctly. Adversarial audit that checks for shorthand resets, missing @property registrations, broken fallbacks, and non-compositor animation properties.
pairs_with: scroll-native-css-timeline-page
---

# Eval: Native CSS Scroll-Driven Timeline Page

## What this audits
The most common shipped failure is a page where `animation-timeline` declarations are silently reset by a preceding `animation` shorthand on the same selector, resulting in animations that run on page load as time-based rather than scroll-driven. The developer tests in Chrome, sees "it works" because the timing accidentally looks close to scroll pacing, and ships. The second most common failure is missing `@property` registrations for custom property interpolation, causing color transitions to snap rather than blend.

## Evidence required
- The CSS source file(s) (styles.css or embedded `<style>` blocks)
- The HTML source file
- A running instance of the page in Chrome 115+ (DevTools accessible)
- DevTools Performance panel recording of a full scroll-through
- DevTools Animations panel open during scroll
- The page loaded in Firefox or Safari (or any non-Chromium browser) to verify fallback

## Automated checks

```javascript
// Run in browser DevTools console on the live page

// CHECK 1: No animation shorthand before animation-timeline
// (Static analysis -- run against the CSS source text)
const styleSheets = [...document.styleSheets];
const cssRules = [];
styleSheets.forEach(ss => {
  try { cssRules.push(...ss.cssRules); } catch(e) {}
});
const shorthandBeforeTimeline = [];
cssRules.forEach(rule => {
  if (rule.style) {
    const text = rule.cssText;
    const animIdx = text.indexOf('animation:');
    const timelineIdx = text.indexOf('animation-timeline:');
    if (animIdx !== -1 && timelineIdx !== -1 && animIdx > timelineIdx) {
      shorthandBeforeTimeline.push(rule.selectorText);
    }
  }
});
console.assert(shorthandBeforeTimeline.length === 0,
  `FAIL: animation shorthand after animation-timeline on: ${shorthandBeforeTimeline.join(', ')}`);
// PASS: No selectors have shorthand resetting timeline.

// CHECK 2: @property registrations exist for animated custom properties
const registeredProps = CSS.registeredCustomProperties || [];
const hasActBg = registeredProps.some(p => p.name === '--act-bg') ||
  document.querySelector('style')?.textContent.includes('@property --act-bg');
console.assert(hasActBg,
  'FAIL: --act-bg not registered with @property. Color transitions will snap.');
// PASS: @property --act-bg is registered.

// CHECK 3: progress bar uses scroll(root block)
const progressBar = document.querySelector('.progress-bar');
if (progressBar) {
  const cs = getComputedStyle(progressBar);
  const timeline = cs.animationTimeline;
  console.assert(timeline && timeline !== 'auto' && timeline !== 'none',
    'FAIL: .progress-bar has no scroll-driven animation-timeline');
}
// PASS: progress bar has a scroll-driven timeline.

// CHECK 4: No forbidden animated properties
const forbidden = ['width', 'height', 'top', 'left', 'right', 'bottom',
  'margin', 'padding', 'font-size', 'border-radius', 'box-shadow'];
const violators = [];
cssRules.forEach(rule => {
  if (rule instanceof CSSKeyframesRule) {
    [...rule.cssRules].forEach(kf => {
      forbidden.forEach(prop => {
        if (kf.style.getPropertyValue(prop)) {
          violators.push(`${rule.name}: ${prop}`);
        }
      });
    });
  }
});
console.assert(violators.length === 0,
  `FAIL: Layout-triggering properties in keyframes: ${violators.join(', ')}`);
// PASS: Only compositor-safe properties in keyframes.

// CHECK 5: Reveals have view() timeline, not time-based
const reveals = document.querySelectorAll('.reveal');
let timeBasedReveals = 0;
reveals.forEach(el => {
  const cs = getComputedStyle(el);
  if (cs.animationTimeline === 'auto' || cs.animationTimeline === 'none') {
    timeBasedReveals++;
  }
});
console.assert(timeBasedReveals === 0,
  `FAIL: ${timeBasedReveals} .reveal elements have time-based (not scroll) timelines`);
// PASS: All reveals use view() timelines.

// CHECK 6: @supports fallback exists
const cssText = [...document.querySelectorAll('style, link[rel="stylesheet"]')]
  .map(el => el.textContent || '').join('');
// Also fetch external stylesheets
const hasFallback = cssText.includes('@supports not (animation-timeline') ||
  cssText.includes('@supports not(animation-timeline');
console.assert(hasFallback,
  'FAIL: No @supports not (animation-timeline) fallback block found');
// PASS: Fallback block exists.

// CHECK 7: prefers-reduced-motion block exists
const hasReducedMotion = cssText.includes('prefers-reduced-motion');
console.assert(hasReducedMotion,
  'FAIL: No prefers-reduced-motion media query found');
// PASS: Reduced motion handling exists.

// CHECK 8: aria-hidden on decorative elements
const progressBarHidden = progressBar?.getAttribute('aria-hidden') === 'true';
const parallaxBgs = document.querySelectorAll('.act__parallax-bg');
let allBgsHidden = true;
parallaxBgs.forEach(bg => {
  if (bg.getAttribute('aria-hidden') !== 'true') allBgsHidden = false;
});
console.assert(progressBarHidden, 'FAIL: .progress-bar missing aria-hidden="true"');
console.assert(allBgsHidden, 'FAIL: .act__parallax-bg missing aria-hidden="true"');
// PASS: Decorative elements are hidden from assistive tech.
```

## Manual inspection protocol

1. Open DevTools Performance panel. Record a full scroll from top to bottom at moderate speed (5s total). FAIL if any frame exceeds 16ms in the "Scripting" lane. There should be zero scripting cost during scroll.

2. Open DevTools Animations panel. Scroll through each act. FAIL if any animation appears in the "Animations" timeline with a time-based duration (clock icon) rather than a scroll-based one.

3. Scroll to the very bottom of the page. Check the progress bar. FAIL if it does not reach exactly the right edge of the viewport.

4. In a fresh tab, enable DevTools "Emulate prefers-reduced-motion: reduce" (Rendering panel). Reload the page. FAIL if any element is invisible, clipped, or positioned offscreen.

5. Open the page in Firefox (latest stable). FAIL if content is invisible, mispositioned, or the page is blank. All content must be visible even if animations do not play.

6. Resize the browser window from 1440px to 375px width. FAIL if any horizontal scrollbar appears at any point.

7. Scroll quickly (flick) from top to bottom. FAIL if any reveal animation "overshoots" its target state (appears and then jumps backward or resets).

8. Right-click and "Inspect" any `.reveal` element. Check Computed styles for `will-change`. FAIL if `will-change` is set to anything other than `auto` (the browser manages layer promotion automatically for scroll-driven animations).

## Scoring rubric

| # | Criterion | 0 | 1 | 2 | Weight |
|---|---|---|---|---|---|
| 1 | Zero JS animation code | JS scroll listeners or rAF present for animation | JS present but only for polyfill fallback | Zero JS for animation; polyfill gated behind @supports not | x3 |
| 2 | animation shorthand safety | Shorthand resets timeline on 2+ selectors | One shorthand issue caught and fixed | No shorthand/timeline conflicts anywhere | x2 |
| 3 | @property registrations | No @property for animated custom properties | @property present but wrong syntax or missing initial-value | All animated custom properties properly registered | x2 |
| 4 | Compositor-only keyframes | Layout properties animated (width, height, top, left) | filter: blur() or box-shadow animated | Only transform, opacity, clip-path inset in keyframes | x3 |
| 5 | @supports fallback | No fallback; page blank in unsupported browsers | Fallback exists but content still partially hidden | Full content visible in unsupported browsers | x2 |
| 6 | prefers-reduced-motion | No reduced motion handling | Reduced motion removes animation but elements stuck invisible | All content visible, no animation, no progress bar when reduced-motion | x2 |
| 7 | animation-range tuning | Default 0%-100% on all elements (everything animates for entire viewport crossing) | Ranges set but uniform across all element types | Heading/body/figure have distinct ranges creating natural stagger | x2 |
| 8 | Parallax correctness | Parallax causes horizontal overflow or content overlap | Parallax works but layer sizing is wrong (gaps visible) | Layer oversized correctly, no overflow, smooth depth effect | x1 |
| 9 | Progress bar accuracy | Missing or does not track scroll at all | Tracks scroll but does not reach 100% at bottom | Tracks precisely from 0% to 100% across full scroll depth | x1 |
| 10 | Semantic HTML and a11y | No aria-hidden on decorative, missing alt text | Partial coverage | Full aria-hidden, alt text, keyboard navigable, semantic sectioning | x2 |

**Total: 40 points. Ship threshold: 32+.**

## Common false passes

1. **"It animates on scroll" but is actually time-based.** A fast time-based animation (200ms) on an element that enters the viewport can look scroll-driven in casual testing. Check the Animations panel: scroll-driven animations show a timeline icon, not a clock. Or scroll very slowly: a time-based animation will complete instantly while a scroll-driven one will track the scroll speed.

2. **animation shorthand written after animation-timeline.** In CSS, `animation:` resets all animation sub-properties including `animation-timeline`. If the shorthand comes after `animation-timeline: view()`, the timeline is silently reset to `auto`. The developer sees it work in their first test because they wrote the rules in the right order, then a later refactor moves things around.

3. **@property declared but with wrong syntax.** `@property --act-bg { syntax: '<string>'; }` will not make colors interpolatable. Must be `'<color>'`. The property registers successfully but the browser still cannot interpolate it.

4. **Reduced-motion block hides progress bar but leaves reveals invisible.** If `.reveal` starts at `opacity: 0` and the reduced-motion block resets `animation-duration` without also setting `opacity: 1`, the element stays invisible. The page looks "clean" (no animation, no progress bar) but half the content is missing.

5. **Fallback tested only in Chrome with DevTools overriding @supports.** DevTools can emulate @supports conditions, but the actual rendering path differs from a browser that genuinely lacks scroll-driven animation support. Test in actual Firefox < 155 or Safari < 26.

6. **Parallax looks right at one viewport width.** The `-20% to 20%` inset on parallax backgrounds is relative to the act's height. If act height changes dramatically between mobile and desktop (it will, because text reflows), the parallax travel distance changes proportionally. A parallax that looks subtle at 1440px can look extreme at 375px.

7. **view() on always-visible elements.** If the first act's heading is in the initial viewport (above the fold), its `view()` timeline is already past the entry phase on load. The element appears in its final state, which looks correct, but it never actually animated. If the design intent is for it to animate, this is a false pass.

## Required fixes by failure mode

| Failure | Root cause | Fix |
|---|---|---|
| Animations run on load, not on scroll | `animation` shorthand resetting `animation-timeline` | Move `animation-timeline` after shorthand, or use all longhand properties |
| Colors snap between acts | Missing or wrong `@property` registration | Add `@property --act-bg { syntax: '<color>'; inherits: true; initial-value: #fff; }` |
| Content invisible with reduced motion | `opacity: 0` initial state not overridden | Add `opacity: 1; transform: none; clip-path: none;` to reduced-motion block for all animated elements |
| Horizontal scrollbar | Parallax layer wider than viewport | Use `inset: -20% 0` (not `-20%`) so horizontal bounds match the act |
| Progress bar stops at 98% | `scroll(root block)` but `<html>` has `overflow: hidden` on some wrapper | Ensure `overflow` is only on `<body>` or remove wrapper overflow constraints |
| Reveals jitter on fast scroll | `ease` or `ease-in-out` on scrubbed animations | Use `linear` easing for all scroll-driven keyframes |
| Performance regression on mobile | `clip-path` animation on large images | Remove `clip-path` animation for `(max-width: 768px)` or reduce image dimensions |

## Verdict format

```
SCORE: XX / 40
| # | Criterion | Score | Notes |
|---|-----------|-------|-------|
| 1 | Zero JS animation | X/2 | ... |
...
BLOCKING: [list any criterion scoring 0]
VERDICT: SHIP / NO SHIP
```
