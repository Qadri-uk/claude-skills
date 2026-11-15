---
name: css-scroll-driven-animations
description: Use when you need scroll-linked reveals, progress bars, or parallax that runs entirely on the compositor with zero JavaScript, using native animation-timeline (scroll() and view()) in browsers that support it, with a documented fallback path.
---

# CSS Scroll-Driven Animations

## When to use this
- You want a scroll progress bar, fade-in-on-enter, or sticky-header shrink effect and do not want to ship a scroll-linked JS library for it.
- You are building for Chromium-based browsers primarily (Chrome/Edge 115+) and can accept a graceful degraded-but-functional fallback on Firefox/Safari via `@supports`.
- You want an animation whose timeline is literally scroll position (not time) so it can never desync from the user's actual scroll, including fast flicks and scrollbar drags.
- You need per-element "enters/leaves viewport" triggers (`view-timeline`) without an IntersectionObserver.
- Do NOT use this when you need scrubbed pinning (element stays fixed while content scrolls past it) with precise pixel-level control across all browsers today: use `sticky-pinning-sequences` (GSAP ScrollTrigger) instead, since native CSS has no pin primitive and Safari/Firefox support for scroll-driven animations is still incomplete as of 2024-2025.

## Mental model
Normal CSS animations run on a *time* timeline: 0% to 100% maps to `0ms` to `duration ms`, driven by the OS clock regardless of anything else on the page. `animation-timeline` replaces that clock with a different progress source. Two timeline types exist:

`scroll()` creates a timeline from a scroller's own scroll position: 0% is scrolled-to-start, 100% is scrolled-to-end, on whichever axis and whichever scroller you specify (`scroll(root block)`, `scroll(nearest inline)`, or a named scroller). This is for effects tied to the *page's* overall scroll, like a top progress bar.

`view()` creates a timeline from a *single element's* visibility inside its scrollport: 0% is the moment the element's first edge enters the scrollport, 100% is the moment its last edge exits. This is for "this specific card fades in as it scrolls into view" effects, and is the native replacement for IntersectionObserver-driven fade-ins. Because `view()` timelines are per-element, you can have hundreds of independently-timed elements with no JS overhead, since browsers compute and update these off the main thread as part of compositing.

`animation-range` further narrows which portion of that 0-100% timeline maps to the animation's own keyframes, using named regions: `entry` (element entering the scrollport), `contain`/`cover` (fully inside), `exit` (leaving). `animation-range: entry 0% cover 40%` means "start the keyframes the instant the element begins entering, finish them by the time it's 40% through being fully covered/visible." This lets you fire a fast reveal near the edges and hold steady mid-viewport, without hand-computing pixel offsets.

Because these run through the same engine as any CSS animation, only compositor-safe properties (`transform`, `opacity`, `filter`, `clip-path` in supporting engines) stay smooth; anything triggering layout will still jank exactly like a time-based animation would.

## Setup
No install. This is native CSS, shipped in Chromium 115+ (July 2023). Feature-detect and provide a fallback:
```css
@supports (animation-timeline: scroll()) {
  /* native scroll-driven rules here */
}
@supports not (animation-timeline: scroll()) {
  /* fallback: static state, or load a tiny IntersectionObserver polyfill */
}
```
For broader-browser production use today, pair with the official polyfill:
```bash
npm install scroll-timeline-polyfill@1
```
```js
import 'scroll-timeline-polyfill'
```

## Core API
| Property/Function | Values | Note |
|---|---|---|
| `animation-timeline` | `none \| scroll() \| view() \| <custom-ident>` | replaces the time-based default timeline |
| `scroll()` | `scroll( [scroller] [axis] )` | `scroller: nearest\|root\|self`, `axis: block\|inline\|x\|y` |
| `view()` | `view( [axis] [inset] )` | `inset` shrinks/grows the effective scrollport, e.g. `view(block 20%)` |
| `scroll-timeline-name` | `<custom-ident>` | names a scroll progress source on an ancestor scroller for reuse elsewhere |
| `scroll-timeline-axis` | `block \| inline \| x \| y` | paired with `-name` |
| `view-timeline-name` | `<custom-ident>` | names a view progress source on the observed element |
| `view-timeline-inset` | `<length-percentage>{1,2}` | shrinks the scrollport used for 0%/100% calc |
| `animation-range-start` | `normal \| cover <pct> \| entry <pct> \| exit <pct> \| contain <pct>` | where keyframes begin on the timeline |
| `animation-range-end` | same syntax | where keyframes end |
| `animation-range` | shorthand | `entry 0% cover 40%` etc |
| `timeline-scope` | `<custom-ident>` | exposes a named timeline defined on a descendant up to an ancestor, for cross-tree references |
| `@scroll-timeline` (deprecated) | — | do not use, replaced by `scroll-timeline-name`/`-axis` properties |

## Recipes

### Top-of-page scroll progress bar
A 4px bar at the top of the viewport fills left to right as the user scrolls the whole document.
```css
.progress-bar {
  position: fixed;
  top: 0; left: 0;
  height: 4px;
  width: 100%;
  transform-origin: left;
  transform: scaleX(0);
  background: linear-gradient(90deg, #6d5eff, #ff5e9c);
  animation: grow-progress linear;
  animation-timeline: scroll(root block);
}
@keyframes grow-progress {
  to { transform: scaleX(1); }
}
```

### Fade-and-rise card reveal on scroll into view
Each `.card` fades up as it enters the viewport, independently, with zero JS.
```css
.card {
  opacity: 0;
  transform: translateY(40px);
  animation: reveal-card linear both;
  animation-timeline: view();
  animation-range: entry 0% cover 30%;
}
@keyframes reveal-card {
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .card { animation: none; opacity: 1; transform: none; }
}
```

### Shrinking sticky header tied to page scroll
Header height and font-size shrink over the first 200px of scroll using a named root scroll-timeline.
```css
html {
  scroll-timeline-name: --page-scroll;
  scroll-timeline-axis: block;
}
.site-header {
  position: sticky;
  top: 0;
  height: 96px;
  font-size: 24px;
  animation: shrink-header linear both;
  animation-timeline: --page-scroll;
  animation-range: 0px 200px;
}
@keyframes shrink-header {
  to { height: 56px; font-size: 16px; }
}
```

### Image zoom-out reveal (Ken Burns on scroll, not time)
A hero image starts zoomed in and settles to natural scale as its section enters view.
```css
.hero-media img {
  scale: 1.25;
  animation: settle-zoom linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 100%;
}
@keyframes settle-zoom {
  to { scale: 1; }
}
```

### Rotating icon tied to horizontal scroll of a named scroller
A compass icon rotates 360deg across a horizontally-scrolling gallery track.
```css
.gallery-track {
  scroll-timeline-name: --gallery-scroll;
  scroll-timeline-axis: inline;
  overflow-x: auto;
  display: flex;
}
.compass-indicator {
  animation: spin-compass linear both;
  animation-timeline: --gallery-scroll;
}
@keyframes spin-compass {
  to { transform: rotate(360deg); }
}
```

### Text underline that draws itself as a heading scrolls through the middle third of the viewport
Uses `view-timeline-inset` to only trigger while the heading is near vertical center.
```css
.section-heading {
  view-timeline-name: --heading-view;
  view-timeline-inset: 33% 33%;
  position: relative;
}
.section-heading::after {
  content: '';
  position: absolute;
  left: 0; bottom: -4px;
  height: 3px;
  width: 100%;
  background: currentColor;
  transform: scaleX(0);
  transform-origin: left;
  animation: draw-underline linear both;
  animation-timeline: --heading-view;
}
@keyframes draw-underline {
  to { transform: scaleX(1); }
}
```

### Progressive enhancement wrapper for any of the above
Ensures the fallback state is a legible, complete UI, not a broken one.
```css
.card {
  opacity: 1;
  transform: none;
}
@supports (animation-timeline: view()) {
  .card {
    opacity: 0;
    transform: translateY(40px);
    animation: reveal-card linear both;
    animation-timeline: view();
    animation-range: entry 0% cover 30%;
  }
}
```

## Tuning the feel
- `animation-range: entry 0% cover 30%` is a strong default for reveals: the element is fully visible/settled well before it reaches vertical center, so users reading top-to-bottom never see it still animating in the reading zone.
- Keep view-timeline ranges within `entry`/`exit` bands (roughly the first/last 20-40% of an element's visibility) so effects finish before or after the "reading zone," never mid-read.
- For a shrinking header, `0px 200px` (raw length range) reads more predictably than a percentage range because header shrink should trigger at a fixed scroll distance regardless of total page length.
- Avoid `linear` easing in the keyframes themselves when you want eased motion feel, since the *timeline* being scroll-driven does not itself impose an easing; apply `cubic-bezier` inside `@keyframes` percentages (e.g. define intermediate keyframe steps at 0%, 60%, 100% with different property values) to fake ease-out within a linear timeline.

## Performance
- This is the cheapest possible scroll effect: computed by the compositor, no main-thread JS per frame, no layout thrashing risk since only `transform`/`opacity`/`filter` are practical to animate this way.
- Still avoid animating `width`, `height`, `top`/`left` via scroll-timeline on elements with many descendants; even compositor-driven layout properties (like the header height recipe above) can trigger reflow on every scroll tick if the element has complex children. Prefer `scale`/`translate` transforms over literal `height`/`font-size` when the element subtree is heavy.
- Profile in Chrome DevTools: scroll-driven animations show up in the Performance panel as "Animation" entries with no corresponding "Layout" or long "Scripting" blocks; if you see scripting blocks alongside them, something else (a scroll listener) is still running in JS too.
- `view-timeline` on hundreds of elements is fine; the browser only actively evaluates timelines for elements near the viewport, not the entire DOM.

## Accessibility
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-timeline: none !important;
  }
  .card, .hero-media img, .section-heading::after {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
    scale: 1 !important;
  }
}
```
- Because there is no JS, screen reader and keyboard navigation are entirely unaffected by these animations; content is present in the DOM and readable regardless of animation state, unlike JS-gated reveal patterns that sometimes keep content `display: none` until a scroll callback fires.
- Never rely on scroll-driven opacity alone to hide content from assistive tech; opacity: 0 still exposes text to screen readers, which is usually correct here (content should be announced even if not yet visually revealed) but confirm this matches your intent.

## Anti-slop rules
- Never ship this as the only implementation with no `@supports` fallback if Firefox/Safari users are a meaningful share of traffic; a completely static fallback state that looks intentional beats a half-broken unsupported one.
- Never use `animation-range: cover 0% cover 100%` (full cover range) for reveal effects; the animation completes exactly when the element is fully "covering" the viewport, which usually means it finishes far too late, felt as sluggish.
- Never stack more than 2-3 simultaneous scroll-driven animations on the exact same element; overlapping ranges producing conflicting `transform` values silently clobber each other since only one `animation-timeline`-driven transform wins per element unless combined via separate properties (translate/scale/rotate individual properties, not shorthand `transform`).
- Never use `scroll()` (document-level) for what is actually a per-element "enters view" effect; that is what `view()` exists for, and using `scroll()` for it means hand-computing pixel offsets that break the moment content length changes.
- Never forget `both` in the `animation` shorthand (`animation: reveal-card linear both`); without `forwards`/`both` the element snaps back to its 0% keyframe state outside the defined range, causing visible pop-in/out at the range boundaries.
- Never assume `view-timeline-inset` percentages behave like `margin`; they shrink the *effective scrollport*, inverted from what many people expect on first read.

## Checklist
- [ ] `@supports (animation-timeline: ...)` fallback defined and visually acceptable
- [ ] `animation: ... both` (not just the timing function) on every scroll-timeline animation
- [ ] `prefers-reduced-motion` forces `animation-timeline: none` globally
- [ ] Only `transform`/`opacity`/`filter` animated, no layout properties on heavy subtrees
- [ ] `animation-range` chosen so effects complete before content reaches the reading zone
- [ ] Named timelines (`scroll-timeline-name`/`view-timeline-name`) uniquely named, no collisions across components
- [ ] Verified in real Chrome/Edge 115+, not assumed from spec reading alone
- [ ] Verified degraded (non-animated but usable) state in Firefox/Safari if not polyfilled
