---
name: scroll-native-css-timeline-page
description: Use when building an entire scroll-narrative page driven purely by native CSS scroll-driven animations (animation-timeline, view(), scroll()), with zero JavaScript for motion. Builds a complete multi-act story page where every reveal, parallax shift, progress indicator, and transition runs on the compositor thread via CSS alone.
category: scroll
pairs_with: scroll-native-css-timeline-page-eval
---

# Native CSS Scroll-Driven Timeline Page

## What this builds
A complete scroll-narrative page (4-7 acts, 5000-8000px of scroll depth) where every animation is driven by `animation-timeline: scroll()` or `animation-timeline: view()` with zero JavaScript for motion. The page uses CSS-only progress bars, per-element reveals on viewport entry, parallax layers, sticky text transitions, and act-boundary crossfades, all running on the compositor thread with no main-thread cost.

- Global scroll progress bar driven by `scroll(root block)`
- Per-section reveals using `view()` timelines with `animation-range` tuning
- Multi-layer parallax using differential `scroll()` rates on transform
- Sticky text that crossfades between acts using `view()` exit/entry overlap
- Act-boundary color transitions via `scroll()` on custom properties (with `@property` registration)
- Graceful fallback for Firefox/Safari where `animation-timeline` support is incomplete
- Total JS: zero lines for animation; optional polyfill import for older browsers

## When to use / when not to
- Use when you want a scroll-narrative page that ships zero animation JS and runs entirely on the compositor.
- Use when the page is content-heavy editorial storytelling (annual report, product launch essay, case study) where text and images are the payload, not 3D or video.
- Use when targeting Chromium 115+ as the primary audience with graceful degradation elsewhere.
- Do NOT use when you need scrubbed pinning with precise pixel control across all browsers today. CSS has no native pin primitive. Use `sticky-pinning-sequences` with GSAP ScrollTrigger instead.
- Do NOT use when you need complex multi-step choreographed timelines with label-based sequencing. Use `gsap-scrolltrigger` for that.
- Do NOT use when the page must support Safari < 26 or Firefox < 155 with full animation parity. Those browsers gained `animation-timeline` support only recently.
- If the project needs smooth-scroll inertia layered under these animations, pair with `scroll-lenis-gsap-integration-harness` for the scroll layer and keep the CSS timelines for the animation layer.

## Stack decision
- **CSS Scroll-Driven Animations (animation-timeline)**: The entire motion system. No library. Runs on the compositor thread, immune to main-thread jank, and produces zero JS bundle cost for animations.
- **@property for custom property interpolation**: Required to animate CSS custom properties (e.g., background-color transitions between acts). Without `@property` registration, the browser cannot interpolate custom properties and they snap rather than transition.
- **scroll-timeline-polyfill (optional)**: For broader browser support. ~4KB. Only load inside `@supports not (animation-timeline: scroll())`. This is the official polyfill from the spec authors.
- **Cheaper alternative**: If you need wider browser support without the polyfill, replace `view()` triggers with a lightweight IntersectionObserver that toggles `.in-view` classes, and replace `scroll()` parallax with a single `requestAnimationFrame` loop reading `scrollY`. You lose compositor-thread guarantee but gain universal support.

## Architecture

```
page.html
 +-- <style> or styles.css
 |    +-- @property registrations (--act-bg, --act-fg)
 |    +-- Global scroll timeline animations (progress bar)
 |    +-- Per-act view timeline animations (reveals, parallax)
 |    +-- @supports fallback block
 |    +-- @media (prefers-reduced-motion: reduce) block
 +-- <body>
      +-- .progress-bar (fixed, driven by scroll(root))
      +-- .act.act--1
      |    +-- .act__parallax-bg (scroll-driven translateY)
      |    +-- .act__content
      |         +-- .act__heading (view-driven reveal)
      |         +-- .act__body (view-driven reveal, staggered)
      |         +-- .act__figure (view-driven scale + clip-path)
      +-- .act.act--2 ...
      +-- .act.act--N
```

Lifecycle:
1. Page loads. All animated elements sit at their `from` keyframe state (opacity:0, translateY offset, etc.)
2. As the user scrolls, `scroll(root block)` drives the progress bar from 0% to 100%.
3. As each `.act__heading` enters the viewport, its `view()` timeline fires, playing its reveal keyframes.
4. Parallax layers use `scroll(root block)` with different translateY distances to create depth.
5. Act background colors interpolate via `@property`-registered custom properties driven by `scroll()`.
6. `prefers-reduced-motion: reduce` disables all motion and shows content in its final state.
7. `@supports not (animation-timeline: scroll())` shows content statically with no animation.

No init, no teardown, no resize handler, no route-change cleanup. CSS handles everything.

## Build it: step by step

### Phase 1: HTML structure with semantic acts

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scroll Narrative</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="progress-bar" aria-hidden="true"></div>

  <section class="act act--1" style="--act-index: 0">
    <div class="act__parallax-bg" aria-hidden="true"></div>
    <div class="act__content">
      <h2 class="act__heading reveal">Act One: The Problem</h2>
      <p class="act__body reveal">
        Every year, 40% of enterprise software projects ship late.
        The root cause is not engineering. It is alignment.
      </p>
      <figure class="act__figure reveal">
        <img src="act1-chart.webp" alt="Bar chart showing 40% late delivery rate" width="800" height="450">
      </figure>
    </div>
  </section>

  <section class="act act--2" style="--act-index: 1">
    <div class="act__parallax-bg" aria-hidden="true"></div>
    <div class="act__content">
      <h2 class="act__heading reveal">Act Two: The Insight</h2>
      <p class="act__body reveal">
        Teams that visualize scope against timeline weekly
        ship 3x more reliably than those that rely on status meetings.
      </p>
      <figure class="act__figure reveal">
        <img src="act2-diagram.webp" alt="Diagram of weekly scope visualization" width="800" height="450">
      </figure>
    </div>
  </section>

  <section class="act act--3" style="--act-index: 2">
    <div class="act__parallax-bg" aria-hidden="true"></div>
    <div class="act__content">
      <h2 class="act__heading reveal">Act Three: The Product</h2>
      <p class="act__body reveal">
        Scope Map is a single canvas where every sprint,
        milestone, and dependency is visible at once.
      </p>
      <figure class="act__figure reveal">
        <img src="act3-product.webp" alt="Screenshot of the Scope Map product interface" width="800" height="450">
      </figure>
    </div>
  </section>

  <section class="act act--4" style="--act-index: 3">
    <div class="act__parallax-bg" aria-hidden="true"></div>
    <div class="act__content">
      <h2 class="act__heading reveal">Act Four: The Evidence</h2>
      <p class="act__body reveal">
        In a 12-week pilot with 14 teams, average delivery
        variance dropped from 34% to 8%.
      </p>
      <figure class="act__figure reveal">
        <img src="act4-results.webp" alt="Before/after chart showing variance reduction" width="800" height="450">
      </figure>
    </div>
  </section>

  <section class="act act--5" style="--act-index: 4">
    <div class="act__content">
      <h2 class="act__heading reveal">Act Five: The Ask</h2>
      <p class="act__body reveal">
        Start a free pilot. See your own delivery variance
        in the first two weeks.
      </p>
      <a href="/signup" class="act__cta reveal">Start your pilot</a>
    </div>
  </section>
</body>
</html>
```

### Phase 2: Base layout and act sizing

```css
/* === Reset and base === */
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: clamp(1rem, 0.9rem + 0.5vw, 1.25rem);
  line-height: 1.6;
  color: var(--fg, #1a1a1a);
  background: var(--bg, #fafaf8);
  scroll-behavior: smooth;
}

/* === @property registrations for interpolatable custom properties === */
@property --act-bg {
  syntax: '<color>';
  inherits: true;
  initial-value: #fafaf8;
}
@property --act-fg {
  syntax: '<color>';
  inherits: true;
  initial-value: #1a1a1a;
}

/* === Act layout === */
.act {
  position: relative;
  min-height: 120vh;
  display: grid;
  place-items: center;
  padding: 10vh clamp(1.5rem, 5vw, 6rem);
  overflow: hidden;
}

.act__content {
  position: relative;
  z-index: 2;
  max-width: 72ch;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.act__heading {
  font-size: clamp(2rem, 1.5rem + 3vw, 4rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.act__body {
  font-size: 1.125rem;
  max-width: 60ch;
}

.act__figure {
  width: 100%;
}

.act__figure img {
  width: 100%;
  height: auto;
  display: block;
}

.act__cta {
  display: inline-block;
  padding: 1rem 2.5rem;
  background: var(--act-fg, #1a1a1a);
  color: var(--act-bg, #fafaf8);
  text-decoration: none;
  font-weight: 600;
  font-size: 1.125rem;
  transition: opacity 0.2s;
}

.act__cta:hover {
  opacity: 0.85;
}
```

### Phase 3: Global scroll progress bar

```css
/* === Progress bar === */
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: var(--act-fg, #1a1a1a);
  transform-origin: left;
  z-index: 100;

  animation: progress-grow linear both;
  animation-timeline: scroll(root block);
}

@keyframes progress-grow {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
```

This runs entirely on the compositor. `scroll(root block)` maps the root scroller's vertical scroll position to the animation progress. The bar scales from 0 to full width as the user scrolls from top to bottom.

### Phase 4: Per-element view-driven reveals

```css
/* === Reveal system === */
.reveal {
  animation: reveal-up linear both;
  animation-timeline: view();
  animation-range: entry 10% entry 90%;
}

@keyframes reveal-up {
  from {
    opacity: 0;
    transform: translateY(2rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Stagger body text: slightly later entry range */
.act__body.reveal {
  animation-range: entry 15% entry 95%;
}

/* Figures: scale + clip reveal */
.act__figure.reveal {
  animation: reveal-figure linear both;
  animation-timeline: view();
  animation-range: entry 5% entry 85%;
}

@keyframes reveal-figure {
  from {
    opacity: 0;
    transform: scale(0.92);
    clip-path: inset(8% 8% 8% 8%);
  }
  to {
    opacity: 1;
    transform: scale(1);
    clip-path: inset(0% 0% 0% 0%);
  }
}
```

The `view()` timeline tracks each `.reveal` element independently as it enters the scrollport. `animation-range: entry 10% entry 90%` means the animation runs from when the element is 10% into its entry phase to when it is 90% through entry. By offsetting the ranges for `.act__body` and `.act__figure`, elements reveal in a natural stagger without any JS coordination.

### Phase 5: Multi-layer parallax

```css
/* === Parallax backgrounds === */
.act__parallax-bg {
  position: absolute;
  inset: -20% 0;
  z-index: 1;
  background-size: cover;
  background-position: center;

  animation: parallax-shift linear both;
  animation-timeline: scroll(root block);
}

@keyframes parallax-shift {
  from { transform: translateY(-8%); }
  to   { transform: translateY(8%); }
}

/* Each act gets a different background */
.act--1 .act__parallax-bg {
  background-image: url('bg-1.webp');
  opacity: 0.12;
}
.act--2 .act__parallax-bg {
  background-image: url('bg-2.webp');
  opacity: 0.1;
}
.act--3 .act__parallax-bg {
  background-image: url('bg-3.webp');
  opacity: 0.08;
}
.act--4 .act__parallax-bg {
  background-image: url('bg-4.webp');
  opacity: 0.06;
}
```

The parallax layer is 40% taller than its container (`inset: -20% 0`) and shifts 16% total (-8% to +8%) across the page scroll. Because `scroll(root block)` drives the entire page, each act's background moves at the same absolute rate but appears to parallax against the content because content is stationary and the background translates.

For per-section parallax (each act has its own parallax relative to its own visibility), use `view()` instead:

```css
.act__parallax-bg {
  animation: parallax-local linear both;
  animation-timeline: view();
  animation-range: cover 0% cover 100%;
}

@keyframes parallax-local {
  from { transform: translateY(-12%); }
  to   { transform: translateY(12%); }
}
```

### Phase 6: Act background color transitions

```css
/* === Act color theming via scroll-driven custom properties === */
.act--1 { --act-bg: #fafaf8; --act-fg: #1a1a1a; }
.act--2 { --act-bg: #0a1628; --act-fg: #e8e4dd; }
.act--3 { --act-bg: #f0ebe3; --act-fg: #2a2520; }
.act--4 { --act-bg: #1a2a1a; --act-fg: #d4e8c8; }
.act--5 { --act-bg: #fafaf8; --act-fg: #1a1a1a; }

.act {
  background: var(--act-bg);
  color: var(--act-fg);

  animation: act-color-transition linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 40%;
}

@keyframes act-color-transition {
  from {
    --act-bg: var(--act-bg);
    --act-fg: var(--act-fg);
  }
}
```

Because `--act-bg` is registered with `@property` as `<color>`, the browser can interpolate between the previous act's color and the new act's color as the element enters the viewport. Without `@property` registration, custom properties are strings and cannot be interpolated.

An alternative approach that works more reliably across browsers is to use a full-viewport fixed overlay per act boundary:

```css
.act::before {
  content: '';
  position: fixed;
  inset: 0;
  background: var(--act-bg);
  z-index: -1;

  animation: bg-fade linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 50%;
}

@keyframes bg-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

### Phase 7: Sticky heading crossfades

For a storytelling page, it is effective to have a persistent heading area that crossfades between act titles as the user scrolls:

```html
<div class="sticky-titles" aria-hidden="true">
  <span class="sticky-title" data-act="1">The Problem</span>
  <span class="sticky-title" data-act="2">The Insight</span>
  <span class="sticky-title" data-act="3">The Product</span>
  <span class="sticky-title" data-act="4">The Evidence</span>
  <span class="sticky-title" data-act="5">The Ask</span>
</div>
```

```css
.sticky-titles {
  position: fixed;
  top: 2rem;
  left: clamp(1.5rem, 5vw, 6rem);
  z-index: 50;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--act-fg, #1a1a1a);
}

.sticky-title {
  position: absolute;
  top: 0;
  left: 0;
  white-space: nowrap;
  opacity: 0;

  animation: sticky-show linear both;
  animation-timeline: view();
}

/* Each title visible while its act is in the viewport */
.sticky-title[data-act="1"] {
  animation-range: entry 0% exit 100%;
}
```

This approach requires each `.sticky-title` to be a sibling or descendant of its act's scroll context. A simpler approach: put each sticky title inside its act and use `position: sticky`:

```css
.act__label {
  position: sticky;
  top: 2rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0;

  animation: label-show linear both;
  animation-timeline: view();
  animation-range: contain 0% contain 100%;
}

@keyframes label-show {
  0%   { opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { opacity: 0; }
}
```

### Phase 8: Horizontal rule / act divider animation

```css
.act__divider {
  width: 100%;
  height: 1px;
  background: currentColor;
  transform-origin: left;

  animation: divider-draw linear both;
  animation-timeline: view();
  animation-range: entry 20% entry 80%;
}

@keyframes divider-draw {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}
```

### Phase 9: Named scroll timelines for coordinated sections

When you need multiple elements to animate against the same section's scroll position (not their own view position), use a named scroll timeline:

```css
.act--3 {
  view-timeline: --act3;
}

.act--3 .product-feature-1 {
  animation: slide-in-left linear both;
  animation-timeline: --act3;
  animation-range: contain 0% contain 30%;
}

.act--3 .product-feature-2 {
  animation: slide-in-right linear both;
  animation-timeline: --act3;
  animation-range: contain 20% contain 50%;
}

.act--3 .product-feature-3 {
  animation: slide-in-left linear both;
  animation-timeline: --act3;
  animation-range: contain 40% contain 70%;
}

@keyframes slide-in-left {
  from { opacity: 0; transform: translateX(-3rem); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes slide-in-right {
  from { opacity: 0; transform: translateX(3rem); }
  to   { opacity: 1; transform: translateX(0); }
}
```

Named view timelines let you sequence multiple child animations against the parent act's scroll position, creating a choreographed stagger effect without JS.

### Phase 10: Fallback and reduced motion

```css
/* === Fallback for browsers without scroll-driven animation support === */
@supports not (animation-timeline: scroll()) {
  .reveal {
    opacity: 1;
    transform: none;
    animation: none;
  }

  .act__figure.reveal {
    clip-path: none;
    animation: none;
  }

  .progress-bar {
    display: none;
  }

  .act__parallax-bg {
    transform: none;
    animation: none;
  }
}

/* === Reduced motion === */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    animation-timeline: auto !important;
  }

  .reveal {
    opacity: 1;
    transform: none;
  }

  .act__figure.reveal {
    clip-path: none;
  }

  .progress-bar {
    display: none;
  }

  .act__parallax-bg {
    transform: none;
  }
}
```

## The full reference implementation

```css
/* scroll-narrative.css -- complete native CSS scroll-driven page */

/* @property registrations */
@property --act-bg {
  syntax: '<color>';
  inherits: true;
  initial-value: #fafaf8;
}
@property --act-fg {
  syntax: '<color>';
  inherits: true;
  initial-value: #1a1a1a;
}

/* Reset */
*, *::before, *::after {
  margin: 0; padding: 0; box-sizing: border-box;
}

html {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: clamp(1rem, 0.9rem + 0.5vw, 1.25rem);
  line-height: 1.6;
  color: var(--act-fg);
  background: var(--act-bg);
}

/* Progress bar */
.progress-bar {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 3px;
  background: var(--act-fg);
  transform-origin: left;
  z-index: 100;
  animation: progress-grow linear both;
  animation-timeline: scroll(root block);
}
@keyframes progress-grow {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

/* Acts */
.act {
  position: relative;
  min-height: 120vh;
  display: grid;
  place-items: center;
  padding: 10vh clamp(1.5rem, 5vw, 6rem);
  overflow: hidden;
  background: var(--act-bg);
  color: var(--act-fg);
}

.act--1 { --act-bg: #fafaf8; --act-fg: #1a1a1a; }
.act--2 { --act-bg: #0a1628; --act-fg: #e8e4dd; }
.act--3 { --act-bg: #f0ebe3; --act-fg: #2a2520; }
.act--4 { --act-bg: #1a2a1a; --act-fg: #d4e8c8; }
.act--5 { --act-bg: #fafaf8; --act-fg: #1a1a1a; }

.act__content {
  position: relative;
  z-index: 2;
  max-width: 72ch;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.act__heading {
  font-size: clamp(2rem, 1.5rem + 3vw, 4rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

/* Parallax bg */
.act__parallax-bg {
  position: absolute;
  inset: -20% 0;
  z-index: 1;
  background-size: cover;
  background-position: center;
  opacity: 0.1;
  animation: parallax-local linear both;
  animation-timeline: view();
  animation-range: cover 0% cover 100%;
}
@keyframes parallax-local {
  from { transform: translateY(-12%); }
  to   { transform: translateY(12%); }
}

/* Reveals */
.reveal {
  animation: reveal-up linear both;
  animation-timeline: view();
  animation-range: entry 10% entry 90%;
}
@keyframes reveal-up {
  from { opacity: 0; transform: translateY(2rem); }
  to   { opacity: 1; transform: translateY(0); }
}

.act__body.reveal {
  animation-range: entry 15% entry 95%;
}

.act__figure.reveal {
  animation: reveal-figure linear both;
  animation-timeline: view();
  animation-range: entry 5% entry 85%;
}
@keyframes reveal-figure {
  from { opacity: 0; transform: scale(0.92); clip-path: inset(8% 8% 8% 8%); }
  to   { opacity: 1; transform: scale(1); clip-path: inset(0% 0% 0% 0%); }
}

/* Dividers */
.act__divider {
  width: 100%; height: 1px;
  background: currentColor;
  transform-origin: left;
  animation: divider-draw linear both;
  animation-timeline: view();
  animation-range: entry 20% entry 80%;
}
@keyframes divider-draw {
  from { transform: scaleX(0); }
  to   { transform: scaleX(1); }
}

/* Act label (sticky) */
.act__label {
  position: sticky;
  top: 2rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  animation: label-show linear both;
  animation-timeline: view();
  animation-range: contain 0% contain 100%;
}
@keyframes label-show {
  0%   { opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { opacity: 0; }
}

/* CTA */
.act__cta {
  display: inline-block;
  padding: 1rem 2.5rem;
  background: var(--act-fg);
  color: var(--act-bg);
  text-decoration: none;
  font-weight: 600;
  font-size: 1.125rem;
}

/* Fallback */
@supports not (animation-timeline: scroll()) {
  .reveal, .act__figure.reveal { opacity: 1; transform: none; clip-path: none; animation: none; }
  .progress-bar { display: none; }
  .act__parallax-bg { transform: none; animation: none; }
  .act__divider { transform: none; animation: none; }
  .act__label { opacity: 1; animation: none; }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    animation-timeline: auto !important;
  }
  .reveal, .act__figure.reveal { opacity: 1; transform: none; clip-path: none; }
  .progress-bar { display: none; }
  .act__parallax-bg { transform: none; }
}
```

## Tuning the feel

| Parameter | Value | Why |
|---|---|---|
| `animation-range` entry start | `entry 10%` | Prevents animation from starting before the element is meaningfully visible. Starting at 0% means animation begins when the first pixel enters, which feels premature. |
| `animation-range` entry end | `entry 90%` | Ensures reveal completes before the element is fully in the viewport, so the user sees the final state while reading. |
| Parallax travel distance | 24% total (-12% to +12%) | Enough to perceive depth without elements visibly detaching from their content context. Above 30% looks broken. |
| Progress bar height | 3px | Visible without competing with content. 1px disappears on low-DPI screens. 5px+ feels like a toolbar. |
| Figure clip inset | 8% per side | Creates a visible "window opening" effect without cropping so much that the image is unrecognizable during the animation. |
| Figure scale start | 0.92 | Subtle enough to avoid a "zoom" feel, but measurable enough that the scaling motion is perceivable. Below 0.9 feels like an intentional zoom; above 0.95 looks like a rendering glitch. |
| Heading translateY | 2rem | Enough vertical movement to feel intentional, short enough to not compete with the parallax layer movement. |
| Act min-height | 120vh | Gives each act enough scroll depth for view-timeline animations to play out fully. At 100vh, entry and exit ranges overlap and animations feel rushed. |
| Label animation hold | 10%-90% of contain | Label is visible for 80% of its act's time in the viewport, fading in/out at boundaries. |

## Variants

### 1. Horizontal narrative
Replace vertical scroll with horizontal by wrapping acts in a horizontal track and using `scroll(self inline)`:
```css
.track {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
}
.act {
  min-width: 100vw;
  scroll-snap-align: start;
}
.progress-bar {
  animation-timeline: scroll(nearest inline);
}
```

### 2. Dark-first editorial
All acts use dark backgrounds; reveals use `translateX` instead of `translateY` for a more editorial, magazine feel. Replace `reveal-up` with `reveal-left`:
```css
@keyframes reveal-left {
  from { opacity: 0; transform: translateX(-3rem); }
  to   { opacity: 1; transform: translateX(0); }
}
```

### 3. Full-bleed image reveal
Each act is dominated by a full-bleed image that reveals via clip-path animation, with text overlaid:
```css
.act__hero-image {
  position: absolute;
  inset: 0;
  object-fit: cover;
  animation: clip-reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 60%;
}
@keyframes clip-reveal {
  from { clip-path: inset(50% 50% 50% 50%); }
  to   { clip-path: inset(0% 0% 0% 0%); }
}
```

### 4. Counter / stat reveal
Numbers count up as their element scrolls into view. CSS cannot animate `content` via `@property` on `<integer>` in `counter-reset`, but you can fake it with a clip reveal over a fully rendered number:
```css
@property --num {
  syntax: '<integer>';
  inherits: false;
  initial-value: 0;
}
.stat {
  counter-reset: num var(--num);
  animation: count-up linear both;
  animation-timeline: view();
  animation-range: entry 20% entry 80%;
}
.stat::after {
  content: counter(num);
}
@keyframes count-up {
  from { --num: 0; }
  to   { --num: 94; }
}
```

### 5. Scroll-snap acts
Each act snaps to the viewport, creating a slide-deck feel:
```css
html {
  scroll-snap-type: y mandatory;
}
.act {
  scroll-snap-align: start;
  min-height: 100vh;
}
```

## Performance budget

| Metric | Target | Lever |
|---|---|---|
| JS bundle for animation | 0 KB | This is the entire point. If you added JS for animation, you chose the wrong toolkit. |
| Main-thread scroll cost | 0 ms | All animations are compositor-driven. No scroll listeners, no rAF, no IntersectionObserver. |
| LCP | < 2.5s | Largest image in Act 1 must be preloaded. Use `fetchpriority="high"` and `loading="eager"` on the Act 1 hero. |
| Total page weight (images) | < 800 KB initial | Lazy-load Act 2+ images with `loading="lazy"`. Serve WebP/AVIF. |
| CLS | 0 | All animated elements have explicit dimensions. `min-height: 120vh` on acts prevents layout shift. |
| Frame rate | 60fps constant | Only `transform`, `opacity`, and `clip-path` are animated. `clip-path` is compositor-safe in Chromium when animating `inset()`. |
| Polyfill cost | 4 KB (optional) | `scroll-timeline-polyfill`. Only load in `@supports not` branch. |
| First cut if over budget | Background images. Remove `.act__parallax-bg` and use solid colors. Saves the most bytes with the least narrative cost. |

## Accessibility

### prefers-reduced-motion
The `@media (prefers-reduced-motion: reduce)` block in the reference implementation resets all animation durations to near-zero and removes the timeline binding. Every element shows in its final, fully-visible state. The progress bar is hidden entirely (it has no content function).

### Keyboard and focus
No scroll hijacking. Native scroll behavior is preserved. Tab order follows document order through the acts. Focus-visible outlines are not suppressed.

### Screen readers
`.progress-bar` and `.act__parallax-bg` carry `aria-hidden="true"`. All content is in semantic HTML. Images have `alt` text. The page reads linearly without dependence on animation state.

### What this costs users who cannot use it
Users with reduced motion see a static page with all content visible. They lose the pacing effect (the sense of acts being revealed sequentially) but retain all information. Users on unsupported browsers see the same static page via the `@supports` fallback. This is an acceptable cost because the content is the payload, not the animation.

## Anti-slop rules

1. DO NOT use `animation` shorthand and then set `animation-timeline` on the same rule. The shorthand resets `animation-timeline` to `auto`. Always declare `animation-timeline` AFTER any shorthand, or avoid the shorthand entirely and use longhand properties.
2. DO NOT forget to set `animation-duration: auto` when using scroll-driven timelines. The default `animation-duration: 0s` produces no animation. The timeline controls duration, not the clock.
3. DO NOT animate `background-color` directly on elements without `@property` registration. Custom properties used as color values must be registered with `@property` to be interpolatable. Without registration, they snap.
4. DO NOT use `animation-range: entry 0% exit 100%` as a default "cover everything" range. This makes animations run for the entire time the element is in the viewport, which is far too long. Tune entry ranges to 60-80% of the entry phase for reveals.
5. DO NOT create parallax layers taller than 40% extra (20% each side). Extreme oversize wastes GPU memory on a texture that is mostly offscreen.
6. DO NOT use `scroll(nearest)` when you mean `scroll(root)` for page-level progress. `nearest` resolves to the nearest scrollable ancestor, which might be a scrollable div, not the page.
7. DO NOT omit the `@supports not (animation-timeline: scroll())` fallback. A page that shows nothing in unsupported browsers is a broken page, not a progressive enhancement.
8. DO NOT apply `will-change: transform` to every `.reveal` element. CSS scroll-driven animations already promote compositor layers as needed. Adding `will-change` manually increases GPU memory usage for no benefit.
9. DO NOT mix `linear` and non-`linear` easing on scroll-driven animations. Scrubbed animations should use `linear` so they track scroll position 1:1. Eased scroll animations feel like lag.
10. DO NOT use `view()` on elements that are always in the viewport (hero content above the fold). Their view timeline never progresses past the initial state. Use `scroll(root)` for those.
11. DO NOT animate `filter: blur()` or `box-shadow` with scroll timelines. These are not compositor-safe and will jank, defeating the purpose of using native CSS.
12. DO NOT nest scroll-driven animated elements inside `overflow: hidden` containers without understanding that the `view()` timeline resolves against the nearest scrollport, which becomes the overflowing container, not the page.

## Integration notes

- **css-scroll-driven-animations** (primitive): This toolkit builds on top of it. The primitive documents the API surface. This toolkit documents the architectural pattern for a full page.
- **scroll-progress-storytelling** (primitive): Covers GSAP-based scroll storytelling. If you need scrubbed pinning, use that. If you can live without pinning and want zero JS, use this toolkit.
- **scroll-lenis-gsap-integration-harness**: Lenis smooth-scroll can coexist with CSS scroll-driven animations because Lenis wraps native scroll rather than replacing it. However, test thoroughly: Lenis's lerped scroll position may cause `scroll()` timelines to lag behind the visual scroll position by the lerp delay.
- **sticky-pinning-sequences**: Use for any section that requires true pinning (element fixed while content scrolls past). CSS has no pin primitive; `position: sticky` is close but not equivalent to ScrollTrigger's `pin: true` with scroll-length injection.
- **parallax-depth-systems**: This toolkit includes a simple parallax layer. For multi-layer parallax with depth ratios and perspective, use the parallax primitive instead.
- Known conflict: `scroll-snap-type` and `animation-timeline: scroll()` can interact poorly. Snap points cause discontinuous scroll positions, which means scroll-driven animations jump rather than scrub smoothly through snap transitions. Test carefully if combining snap with this toolkit's parallax or progress bar.

## Ship checklist

- [ ] Page loads with all content visible (no content hidden behind broken animations) in Chrome, Firefox, Safari
- [ ] `@supports not (animation-timeline: scroll())` fallback tested in Firefox < 155 or Safari < 26
- [ ] `prefers-reduced-motion: reduce` shows all content statically with no animation
- [ ] Progress bar reaches exactly 100% at the bottom of the page (not 98% or 102%)
- [ ] Every `.reveal` element completes its animation before the user needs to read it (test by scrolling at moderate speed)
- [ ] Parallax layers do not create horizontal overflow (check for horizontal scrollbar)
- [ ] `@property` registrations are present for all animated custom properties
- [ ] All images have explicit `width` and `height` attributes (CLS prevention)
- [ ] Act 1 hero image uses `fetchpriority="high"` and `loading="eager"`; all other images use `loading="lazy"`
- [ ] No `animation` shorthand precedes `animation-timeline` on the same selector
- [ ] DevTools Performance panel shows zero scripting cost during scroll (compositor-only frames)
- [ ] Page tested with keyboard-only navigation (Tab through all acts, all interactive elements reachable)
- [ ] `aria-hidden="true"` present on all decorative elements (progress bar, parallax backgrounds)
- [ ] Total initial page weight under 800 KB (excluding lazy-loaded images)
