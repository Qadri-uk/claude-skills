---
name: hero-gradient-mesh-aurora
description: Use when building an animated mesh-gradient or aurora hero section with brand-safe colors, a complete headline/CTA overlay, and reduced-motion fallback. Builds the full hero, not just the background.
category: hero
pairs_with: hero-gradient-mesh-aurora-eval
---

# Animated Mesh-Gradient Aurora Hero

## What this builds
A full-viewport hero section with an animated mesh-gradient or aurora background, a headline + subline + CTA overlay, and an optional scroll-down indicator. The background uses large blurred color blobs drifting on slow sinusoidal paths to produce an organic, shifting color field. Content sits above the field with guaranteed contrast, and the entire effect degrades to a static gradient under `prefers-reduced-motion`.

- Animated blur-blob aurora background with 3-5 brand-derived color nodes
- Headline, subline, and CTA group with a contrast-safe scrim
- Scroll-cue indicator at the bottom
- `prefers-reduced-motion` static fallback
- Mobile performance guard (fewer blobs, capped blur, no animation on low-end)
- Seamless color loop with no visible seam at the wrap point

## When to use / when not to
- Use when the landing page needs an ambient, organic background that feels alive without competing with content.
- Use when the brand palette has 3-5 saturated or mid-saturated colors that can serve as blob sources.
- Do NOT use when the hero needs a photographic background or a product-focused composited layout; see `hero-card-stack-parallax` instead.
- Do NOT use when a hard geometric gradient is the design intent; a plain CSS `linear-gradient` is cheaper and more honest.
- Do NOT use when the hero needs scroll-linked morphing; see `hero-scroll-morph-shape` instead.
- For the underlying blur-blob and shader techniques in isolation, see primitive `gradient-mesh-aurora`. This toolkit builds the complete hero around it.

## Stack decision
| Dependency | Version | Why this, not the alternative |
|---|---|---|
| None (pure CSS) | -- | Blur blobs + keyframe animation covers 90% of aurora use cases at zero JS cost. CSS `filter: blur()` and `transform` are compositor-driven and GPU-accelerated. |
| GSAP (optional) | 3.13+ | Only needed if blobs must follow non-linear paths or respond to mouse position. Adds ~28 KB gzipped. |
| Three.js + GLSL (optional) | 0.169+ | Only for true noise-field auroras with domain warping. Adds ~45 KB gzipped (tree-shaken). See primitive `glsl-fragment-backgrounds` for the shader harness. |

**Cheaper alternative:** A single CSS `@keyframes` on `background-position` with layered `radial-gradient()` backgrounds. No JS, no blobs, no blur. Looks flatter but loads in 0 KB.

## Architecture

```
hero-gradient-mesh-aurora/
  index.html          -- the hero section
  styles.css          -- all styles including aurora, layout, responsive, a11y
  aurora.js           -- (optional) mouse-reactive drift, JS-driven animation
```

**Lifecycle:**
1. **Paint:** Static CSS renders the blobs at their 0% keyframe position. Hero is visible with no JS.
2. **Animate:** CSS keyframes begin on paint. Blobs drift on independent sinusoidal paths. Loop duration 18-30s.
3. **Interact (optional):** `aurora.js` reads pointer position via `mousemove` and shifts blob positions slightly toward the cursor, using `gsap.quickTo` or a manual lerp RAF loop.
4. **Resize:** Blob sizes are in `vw`/`vh` units; no resize listener needed for pure CSS. JS mouse-reactive version recalculates center offset on resize.
5. **Reduced motion:** `@media (prefers-reduced-motion: reduce)` kills all animation; blobs sit at a static mid-position.
6. **Offscreen:** `IntersectionObserver` pauses the JS RAF loop when the hero scrolls out of view.

## Build it: step by step

### Phase 1: HTML structure
The hero is a single `<section>` with two children: the aurora background container and the content overlay.

```html
<section class="hero" aria-label="Welcome">
  <div class="hero__aurora" aria-hidden="true">
    <div class="hero__blob hero__blob--1"></div>
    <div class="hero__blob hero__blob--2"></div>
    <div class="hero__blob hero__blob--3"></div>
    <div class="hero__blob hero__blob--4"></div>
  </div>

  <div class="hero__content">
    <p class="hero__eyebrow">Introducing Acme 3.0</p>
    <h1 class="hero__headline">Ship faster,<br>break nothing</h1>
    <p class="hero__subline">
      The platform that turns your deploys into non-events.
    </p>
    <div class="hero__actions">
      <a href="/signup" class="hero__cta hero__cta--primary">Get started</a>
      <a href="/docs" class="hero__cta hero__cta--secondary">Read docs</a>
    </div>
  </div>

  <div class="hero__scroll-cue" aria-hidden="true">
    <span class="hero__scroll-dot"></span>
  </div>
</section>
```

### Phase 2: Base layout
Pin the hero to the viewport. Stack the aurora behind content with z-index layering. Overflow hidden prevents blobs bleeding outside.

```css
/* === Reset & base === */
*,
*::before,
*::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.hero {
  position: relative;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--hero-bg, #06060e);
}

.hero__aurora {
  position: absolute;
  inset: -25%;
  filter: blur(var(--aurora-blur, 120px));
  opacity: var(--aurora-opacity, 0.55);
  z-index: 0;
}

.hero__content {
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 52rem;
  padding: 0 1.5rem;
}

.hero__scroll-cue {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
}
```

### Phase 3: Color system (brand-safe, not purple-teal slop)
Define blob colors as custom properties. The palette MUST come from the brand, not from a default AI gradient. This example uses a warm tech palette. Replace every value.

```css
:root {
  /* --- Brand-derived aurora colors --- */
  --aurora-1: #4f46e5;   /* indigo -- primary brand */
  --aurora-2: #0ea5e9;   /* sky -- secondary */
  --aurora-3: #f59e0b;   /* amber -- accent */
  --aurora-4: #10b981;   /* emerald -- tertiary */
  --hero-bg:  #06060e;   /* near-black base */

  /* --- Tuning knobs --- */
  --aurora-blur: 120px;
  --aurora-opacity: 0.55;
  --blob-size-base: 45vw;
}
```

**Color rules:**
- 3 colors minimum, 5 maximum. Fewer muddies; more muddies.
- Never use the default purple + teal + pink combo. That is the single most recognizable AI-gradient fingerprint.
- Pull hues from the actual brand palette. If the brand has only 2 colors, derive the third from the midpoint on the OKLCH hue wheel (see primitive `color-oklch-palettes`).
- Keep saturation in the 50-80% range. Full saturation glows like neon; below 40% looks washed out behind blur.

### Phase 4: Blob sizing and keyframe animation
Each blob is a large, soft ellipse animated on its own keyframe loop. Durations are intentionally different and prime-ish (not multiples of each other) to avoid synchronization.

```css
.hero__blob {
  position: absolute;
  border-radius: 50%;
  will-change: transform;
}

.hero__blob--1 {
  width: var(--blob-size-base);
  height: calc(var(--blob-size-base) * 0.7);
  background: var(--aurora-1);
  top: 10%;
  left: 15%;
  animation: drift1 23s ease-in-out infinite;
}

.hero__blob--2 {
  width: calc(var(--blob-size-base) * 1.1);
  height: calc(var(--blob-size-base) * 0.65);
  background: var(--aurora-2);
  top: 55%;
  right: 10%;
  animation: drift2 19s ease-in-out infinite;
}

.hero__blob--3 {
  width: calc(var(--blob-size-base) * 0.8);
  height: calc(var(--blob-size-base) * 0.9);
  background: var(--aurora-3);
  bottom: 15%;
  left: 40%;
  animation: drift3 29s ease-in-out infinite;
}

.hero__blob--4 {
  width: calc(var(--blob-size-base) * 0.6);
  height: calc(var(--blob-size-base) * 0.5);
  background: var(--aurora-4);
  top: 30%;
  right: 35%;
  animation: drift4 17s ease-in-out infinite;
}

/* --- Drift keyframes ---
   Each starts and ends at the same position (0%==100%) for seamless loop.
   Paths are elliptical, not circular, so blobs don't trace obvious circles.
   Using translate3d for GPU compositing. */

@keyframes drift1 {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  25%      { transform: translate3d(8vw, -6vh, 0) scale(1.05); }
  50%      { transform: translate3d(-5vw, 10vh, 0) scale(0.95); }
  75%      { transform: translate3d(12vw, 4vh, 0) scale(1.02); }
}

@keyframes drift2 {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  33%      { transform: translate3d(-10vw, 8vh, 0) scale(1.08); }
  66%      { transform: translate3d(6vw, -12vh, 0) scale(0.92); }
}

@keyframes drift3 {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
  20%      { transform: translate3d(7vw, -5vh, 0) rotate(15deg); }
  50%      { transform: translate3d(-9vw, -8vh, 0) rotate(-10deg); }
  80%      { transform: translate3d(4vw, 6vh, 0) rotate(5deg); }
}

@keyframes drift4 {
  0%, 100% { transform: translate3d(0, 0, 0); }
  50%      { transform: translate3d(-8vw, 12vh, 0); }
}
```

**Why these durations:** 17s, 19s, 23s, 29s are all primes. When loop durations share factors, all blobs return to their starting positions simultaneously and the pattern visibly resets. Prime durations push the coincidence period to `17*19*23*29 = 215,441s` (~2.5 days), so no user ever sees the exact same frame twice.

### Phase 5: Content overlay with contrast guarantee
The headline must be readable regardless of which blob combination sits behind it. Two techniques: a dark gradient scrim, or a `backdrop-filter` frost.

```css
/* Option A: Gradient scrim */
.hero__content::before {
  content: '';
  position: absolute;
  inset: -4rem -6rem;
  background: radial-gradient(
    ellipse at center,
    rgba(6, 6, 14, 0.65) 0%,
    transparent 70%
  );
  z-index: -1;
  pointer-events: none;
}

/* Option B: Frost (uncomment to use instead of scrim) */
/*
.hero__content {
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  background: rgba(6, 6, 14, 0.3);
  border-radius: 1.5rem;
  padding: 3rem 4rem;
}
*/

/* --- Typography --- */
.hero__eyebrow {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: clamp(0.75rem, 1vw, 0.875rem);
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--aurora-2);
  margin-bottom: 1rem;
}

.hero__headline {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: clamp(2.5rem, 6vw, 5rem);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: #f0f0f5;
  margin-bottom: 1.25rem;
}

.hero__subline {
  font-size: clamp(1rem, 1.5vw, 1.25rem);
  line-height: 1.6;
  color: rgba(240, 240, 245, 0.7);
  max-width: 36rem;
  margin: 0 auto 2rem;
}

/* --- CTAs --- */
.hero__actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.hero__cta {
  display: inline-flex;
  align-items: center;
  padding: 0.75rem 1.75rem;
  font-size: 0.9375rem;
  font-weight: 600;
  text-decoration: none;
  transition: transform 180ms ease, box-shadow 180ms ease;
}

.hero__cta--primary {
  background: var(--aurora-1);
  color: #fff;
}

.hero__cta--primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(79, 70, 229, 0.4);
}

.hero__cta--secondary {
  background: transparent;
  color: #f0f0f5;
  border: 1px solid rgba(240, 240, 245, 0.2);
}

.hero__cta--secondary:hover {
  border-color: rgba(240, 240, 245, 0.5);
}
```

### Phase 6: Scroll-cue indicator

```css
.hero__scroll-dot {
  display: block;
  width: 1.5rem;
  height: 2.5rem;
  border: 2px solid rgba(240, 240, 245, 0.3);
  border-radius: 1rem;
  position: relative;
}

.hero__scroll-dot::before {
  content: '';
  position: absolute;
  top: 0.375rem;
  left: 50%;
  transform: translateX(-50%);
  width: 3px;
  height: 6px;
  border-radius: 2px;
  background: rgba(240, 240, 245, 0.6);
  animation: scroll-bob 2s ease-in-out infinite;
}

@keyframes scroll-bob {
  0%, 100% { transform: translateX(-50%) translateY(0); opacity: 1; }
  50%      { transform: translateX(-50%) translateY(8px); opacity: 0.3; }
}
```

### Phase 7: Reduced motion and mobile
This is not optional. The hero must work without animation and on devices that cannot afford 4 blurred layers.

```css
/* --- Reduced motion --- */
@media (prefers-reduced-motion: reduce) {
  .hero__blob,
  .hero__scroll-dot::before {
    animation: none !important;
  }
  /* Park blobs at a balanced mid-position */
  .hero__blob--1 { transform: translate3d(4vw, -3vh, 0); }
  .hero__blob--2 { transform: translate3d(-5vw, 4vh, 0); }
  .hero__blob--3 { transform: translate3d(-4vw, -4vh, 0); }
  .hero__blob--4 { transform: translate3d(3vw, 6vh, 0); }
}

/* --- Mobile adjustments --- */
@media (max-width: 768px) {
  :root {
    --blob-size-base: 70vw;
    --aurora-blur: 80px;
  }
  /* Drop blob 4 entirely on mobile for GPU budget */
  .hero__blob--4 {
    display: none;
  }
  .hero__headline {
    font-size: clamp(2rem, 8vw, 3rem);
  }
  .hero__content {
    padding: 0 1rem;
  }
}

/* --- Very low-end (save-data, reduced-data) --- */
@media (prefers-reduced-data: reduce) {
  .hero__aurora {
    display: none;
  }
  .hero {
    background: linear-gradient(135deg, var(--aurora-1), var(--aurora-2));
  }
}
```

### Phase 8: Mouse-reactive drift (optional JS enhancement)
If blobs should subtly follow the cursor, add this. Uses a manual lerp loop -- no library required. Falls back cleanly if JS fails (CSS animation continues).

```js
(() => {
  const aurora = document.querySelector('.hero__aurora');
  if (!aurora || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const blobs = aurora.querySelectorAll('.hero__blob');
  const factors = [0.02, -0.015, 0.01, -0.025]; // per-blob sensitivity
  let mouseX = 0;
  let mouseY = 0;
  let currentX = 0;
  let currentY = 0;
  let rafId = null;

  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;  // -1..1
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  function tick() {
    currentX += (mouseX - currentX) * 0.04; // lerp factor
    currentY += (mouseY - currentY) * 0.04;

    blobs.forEach((blob, i) => {
      const f = factors[i] || 0.01;
      const dx = currentX * f * 100; // px offset
      const dy = currentY * f * 100;
      blob.style.setProperty('--mouse-x', `${dx}px`);
      blob.style.setProperty('--mouse-y', `${dy}px`);
    });

    rafId = requestAnimationFrame(tick);
  }

  // Pause when hero is offscreen
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      if (!rafId) rafId = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }, { threshold: 0.1 });

  observer.observe(document.querySelector('.hero'));
  rafId = requestAnimationFrame(tick);
})();
```

To integrate the mouse offset, add to each blob's CSS:
```css
.hero__blob {
  transform: translate3d(
    calc(var(--mouse-x, 0px)),
    calc(var(--mouse-y, 0px)),
    0
  );
}
```
The keyframe animation and mouse offset compose because the `animation` uses `translate3d` and the inline style also writes transforms. To combine them correctly, wrap each blob in an extra `<div>` so the keyframe runs on the outer wrapper and the mouse offset runs on the inner blob, avoiding transform clobbering.

**Corrected structure for mouse + keyframe compositing:**
```html
<div class="hero__blob-track hero__blob-track--1">
  <div class="hero__blob hero__blob--1"></div>
</div>
```
```css
.hero__blob-track--1 { animation: drift1 23s ease-in-out infinite; }
.hero__blob--1 {
  width: var(--blob-size-base);
  height: calc(var(--blob-size-base) * 0.7);
  background: var(--aurora-1);
  border-radius: 50%;
  transform: translate3d(var(--mouse-x, 0px), var(--mouse-y, 0px), 0);
  transition: transform 600ms ease-out;
}
```

### Phase 9: Entrance animation
The hero should not pop fully formed. Blobs should fade and scale in over the first ~1.5s of page load, and the headline should stagger in after the background is established.

```css
/* --- Entrance: aurora --- */
.hero__aurora {
  opacity: 0;
  animation: aurora-enter 1.8s ease-out 0.2s forwards;
}

@keyframes aurora-enter {
  from { opacity: 0; transform: scale(0.9); }
  to   { opacity: var(--aurora-opacity); transform: scale(1); }
}

/* --- Entrance: content --- */
.hero__eyebrow,
.hero__headline,
.hero__subline,
.hero__actions {
  opacity: 0;
  transform: translateY(1.5rem);
  animation: content-enter 0.8s ease-out forwards;
}

.hero__eyebrow   { animation-delay: 0.6s; }
.hero__headline  { animation-delay: 0.8s; }
.hero__subline   { animation-delay: 1.0s; }
.hero__actions   { animation-delay: 1.2s; }

@keyframes content-enter {
  to { opacity: 1; transform: translateY(0); }
}

/* Kill entrance animations under reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .hero__aurora,
  .hero__eyebrow,
  .hero__headline,
  .hero__subline,
  .hero__actions {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .hero__aurora {
    opacity: var(--aurora-opacity) !important;
  }
}
```

## The full reference implementation
One consolidated HTML file. Copy-paste ready.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Aurora Hero</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --aurora-1: #4f46e5;
      --aurora-2: #0ea5e9;
      --aurora-3: #f59e0b;
      --aurora-4: #10b981;
      --hero-bg: #06060e;
      --aurora-blur: 120px;
      --aurora-opacity: 0.55;
      --blob-size-base: 45vw;
    }

    body { font-family: 'Inter', system-ui, sans-serif; background: #06060e; }

    .hero {
      position: relative; width: 100%; height: 100dvh;
      overflow: hidden; display: flex; align-items: center;
      justify-content: center; background: var(--hero-bg);
    }

    .hero__aurora {
      position: absolute; inset: -25%;
      filter: blur(var(--aurora-blur));
      z-index: 0; opacity: 0;
      animation: aurora-enter 1.8s ease-out 0.2s forwards;
    }

    .hero__blob {
      position: absolute; border-radius: 50%; will-change: transform;
    }
    .hero__blob--1 {
      width: var(--blob-size-base); height: calc(var(--blob-size-base) * 0.7);
      background: var(--aurora-1); top: 10%; left: 15%;
      animation: drift1 23s ease-in-out infinite;
    }
    .hero__blob--2 {
      width: calc(var(--blob-size-base) * 1.1); height: calc(var(--blob-size-base) * 0.65);
      background: var(--aurora-2); top: 55%; right: 10%;
      animation: drift2 19s ease-in-out infinite;
    }
    .hero__blob--3 {
      width: calc(var(--blob-size-base) * 0.8); height: calc(var(--blob-size-base) * 0.9);
      background: var(--aurora-3); bottom: 15%; left: 40%;
      animation: drift3 29s ease-in-out infinite;
    }
    .hero__blob--4 {
      width: calc(var(--blob-size-base) * 0.6); height: calc(var(--blob-size-base) * 0.5);
      background: var(--aurora-4); top: 30%; right: 35%;
      animation: drift4 17s ease-in-out infinite;
    }

    @keyframes drift1 {
      0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
      25%  { transform: translate3d(8vw, -6vh, 0) scale(1.05); }
      50%  { transform: translate3d(-5vw, 10vh, 0) scale(0.95); }
      75%  { transform: translate3d(12vw, 4vh, 0) scale(1.02); }
    }
    @keyframes drift2 {
      0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
      33%  { transform: translate3d(-10vw, 8vh, 0) scale(1.08); }
      66%  { transform: translate3d(6vw, -12vh, 0) scale(0.92); }
    }
    @keyframes drift3 {
      0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
      20%  { transform: translate3d(7vw, -5vh, 0) rotate(15deg); }
      50%  { transform: translate3d(-9vw, -8vh, 0) rotate(-10deg); }
      80%  { transform: translate3d(4vw, 6vh, 0) rotate(5deg); }
    }
    @keyframes drift4 {
      0%, 100% { transform: translate3d(0, 0, 0); }
      50%  { transform: translate3d(-8vw, 12vh, 0); }
    }

    @keyframes aurora-enter {
      from { opacity: 0; transform: scale(0.9); }
      to   { opacity: var(--aurora-opacity); transform: scale(1); }
    }

    .hero__content {
      position: relative; z-index: 2; text-align: center;
      max-width: 52rem; padding: 0 1.5rem;
    }
    .hero__content::before {
      content: ''; position: absolute; inset: -4rem -6rem;
      background: radial-gradient(ellipse at center, rgba(6,6,14,0.65) 0%, transparent 70%);
      z-index: -1; pointer-events: none;
    }

    .hero__eyebrow {
      font-size: clamp(0.75rem, 1vw, 0.875rem); font-weight: 500;
      letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--aurora-2); margin-bottom: 1rem;
      opacity: 0; transform: translateY(1.5rem);
      animation: content-enter 0.8s ease-out 0.6s forwards;
    }
    .hero__headline {
      font-size: clamp(2.5rem, 6vw, 5rem); font-weight: 700;
      line-height: 1.05; letter-spacing: -0.02em; color: #f0f0f5;
      margin-bottom: 1.25rem;
      opacity: 0; transform: translateY(1.5rem);
      animation: content-enter 0.8s ease-out 0.8s forwards;
    }
    .hero__subline {
      font-size: clamp(1rem, 1.5vw, 1.25rem); line-height: 1.6;
      color: rgba(240,240,245,0.7); max-width: 36rem;
      margin: 0 auto 2rem;
      opacity: 0; transform: translateY(1.5rem);
      animation: content-enter 0.8s ease-out 1.0s forwards;
    }
    .hero__actions {
      display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;
      opacity: 0; transform: translateY(1.5rem);
      animation: content-enter 0.8s ease-out 1.2s forwards;
    }

    @keyframes content-enter {
      to { opacity: 1; transform: translateY(0); }
    }

    .hero__cta {
      display: inline-flex; align-items: center;
      padding: 0.75rem 1.75rem; font-size: 0.9375rem; font-weight: 600;
      text-decoration: none; transition: transform 180ms ease, box-shadow 180ms ease;
    }
    .hero__cta--primary {
      background: var(--aurora-1); color: #fff;
    }
    .hero__cta--primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 20px rgba(79,70,229,0.4);
    }
    .hero__cta--secondary {
      background: transparent; color: #f0f0f5;
      border: 1px solid rgba(240,240,245,0.2);
    }
    .hero__cta--secondary:hover {
      border-color: rgba(240,240,245,0.5);
    }

    .hero__scroll-cue {
      position: absolute; bottom: 2rem; left: 50%;
      transform: translateX(-50%); z-index: 2;
    }
    .hero__scroll-dot {
      display: block; width: 1.5rem; height: 2.5rem;
      border: 2px solid rgba(240,240,245,0.3); border-radius: 1rem;
      position: relative;
    }
    .hero__scroll-dot::before {
      content: ''; position: absolute; top: 0.375rem; left: 50%;
      transform: translateX(-50%); width: 3px; height: 6px;
      border-radius: 2px; background: rgba(240,240,245,0.6);
      animation: scroll-bob 2s ease-in-out infinite;
    }
    @keyframes scroll-bob {
      0%, 100% { transform: translateX(-50%) translateY(0); opacity: 1; }
      50% { transform: translateX(-50%) translateY(8px); opacity: 0.3; }
    }

    @media (prefers-reduced-motion: reduce) {
      .hero__blob, .hero__scroll-dot::before { animation: none !important; }
      .hero__blob--1 { transform: translate3d(4vw, -3vh, 0); }
      .hero__blob--2 { transform: translate3d(-5vw, 4vh, 0); }
      .hero__blob--3 { transform: translate3d(-4vw, -4vh, 0); }
      .hero__blob--4 { transform: translate3d(3vw, 6vh, 0); }
      .hero__aurora, .hero__eyebrow, .hero__headline,
      .hero__subline, .hero__actions {
        animation: none !important; opacity: 1 !important;
        transform: none !important;
      }
      .hero__aurora { opacity: var(--aurora-opacity) !important; }
    }

    @media (max-width: 768px) {
      :root { --blob-size-base: 70vw; --aurora-blur: 80px; }
      .hero__blob--4 { display: none; }
      .hero__headline { font-size: clamp(2rem, 8vw, 3rem); }
      .hero__content { padding: 0 1rem; }
    }
  </style>
</head>
<body>
  <section class="hero" aria-label="Welcome">
    <div class="hero__aurora" aria-hidden="true">
      <div class="hero__blob hero__blob--1"></div>
      <div class="hero__blob hero__blob--2"></div>
      <div class="hero__blob hero__blob--3"></div>
      <div class="hero__blob hero__blob--4"></div>
    </div>
    <div class="hero__content">
      <p class="hero__eyebrow">Introducing Acme 3.0</p>
      <h1 class="hero__headline">Ship faster,<br>break nothing</h1>
      <p class="hero__subline">The platform that turns your deploys into non-events.</p>
      <div class="hero__actions">
        <a href="/signup" class="hero__cta hero__cta--primary">Get started</a>
        <a href="/docs" class="hero__cta hero__cta--secondary">Read docs</a>
      </div>
    </div>
    <div class="hero__scroll-cue" aria-hidden="true">
      <span class="hero__scroll-dot"></span>
    </div>
  </section>
</body>
</html>
```

## Tuning the feel

| Parameter | Value | Why |
|---|---|---|
| Blur radius | 120px desktop, 80px mobile | Below 80px blobs have visible edges; above 160px they merge into a single flat wash |
| Blob opacity (container) | 0.55 | Below 0.4 the aurora is barely visible; above 0.7 it overpowers the headline |
| Loop durations | 17s, 19s, 23s, 29s | Primes; prevents sync-up. Shorter than 12s feels nervous; longer than 35s feels dead |
| Drift distance | 5-12 vw/vh per keyframe stop | Under 3vw the motion is imperceptible; over 15vw blobs visibly jump |
| Scale range | 0.92-1.08 | Subtle breathing. Over 1.15 looks like a pulse; under 0.95 looks like shrinking |
| Entrance duration | 1.8s aurora, 0.8s per content element | Aurora needs time to establish before content appears over it |
| Content stagger | 200ms between elements | Faster than 100ms looks simultaneous; slower than 300ms feels sluggish |
| Lerp factor (mouse) | 0.04 | Lower = more lag/smooth; higher = more responsive. 0.02-0.06 is the usable range |
| Scrim spread | 70% radial gradient | Wide enough to cover the full headline block at all viewport sizes |

## Variants

### 1. Light mode aurora
Swap to a light base (`--hero-bg: #f5f5f7`), reduce blob opacity to 0.25, and use the same brand hues at 30% saturation via OKLCH. Scrim becomes a white radial instead of dark.

### 2. GLSL noise-field aurora
Replace the blur blobs with a full-screen fragment shader using domain-warped simplex noise. See primitive `glsl-fragment-backgrounds` for the complete harness. The shader version produces smoother, more organic flow but costs ~45 KB and a WebGL context. Fallback: the CSS blur-blob version above.

### 3. Scroll-reactive fade
Aurora opacity fades to 0 as the user scrolls past 100vh. A single `scroll` listener mapped to `opacity = 1 - scrollY / window.innerHeight` on the `.hero__aurora` element. Cheap and dramatic.

### 4. Video-backed aurora
Replace the blur blobs with a looping `<video>` element of pre-rendered gradient motion (8-15s, 1080p, h.264, <3 MB). Covers the WebGL fallback case. The video must loop seamlessly; use FFmpeg's `loop` filter or a ping-pong encode.

### 5. Multi-section aurora
The aurora background is not pinned to the hero; it extends behind the next 2-3 sections as well, with the blobs continuing their drift. The hero section simply has `overflow: visible` and subsequent sections have `position: relative; z-index: 1` to layer content over the continuing aurora.

## Performance budget
| Metric | Target | How to hit it |
|---|---|---|
| LCP | < 2.0s | Hero is pure CSS; no render-blocking JS. Inline critical CSS. |
| Total hero JS | 0 KB (CSS-only) or < 2 KB (mouse-reactive) | No library for the base version |
| Compositor layers | 4-5 (one per blob + aurora container) | `will-change: transform` on blobs; browser promotes automatically |
| GPU memory | < 8 MB | Blobs are solid-color CSS; no textures. Blur is compositor-side. |
| Frame time | < 8ms (120fps target) | CSS keyframe animation is compositor-driven; no main-thread cost |
| Mobile frame time | < 16ms (60fps target) | Drop blob 4, reduce blur to 80px |

**What to cut first when over budget:**
1. Remove blob 4 (smallest, least visible)
2. Reduce blur from 120px to 80px
3. Replace keyframe animation with a static mid-position
4. Drop to 2 blobs (minimum for the effect to read as aurora)

## Accessibility
```css
@media (prefers-reduced-motion: reduce) {
  /* All animations killed; blobs parked at static positions */
}
```

- The entire `.hero__aurora` is `aria-hidden="true"` -- screen readers skip it entirely.
- The scroll-cue is decorative and `aria-hidden="true"`.
- Headline uses a real `<h1>` for document structure.
- CTAs are real `<a>` links with visible focus rings (add `outline: 2px solid var(--aurora-2); outline-offset: 2px` on `:focus-visible`).
- Color contrast: the radial scrim guarantees at least 4.5:1 contrast for the headline against any blob position. Verify with a contrast checker at the worst-case frame (brightest blob directly behind the headline center).
- **Honest cost:** Users with reduced motion see a static gradient. They get the layout, the content, and the brand colors, but not the ambient motion. There is no meaningful content loss.

## Anti-slop rules
1. DO NOT use the purple + teal + pink color combo. It is the most recognizable AI-gradient fingerprint on the internet.
2. DO NOT animate blobs faster than 12s per loop. Anything under 12s reads as "lava lamp screensaver," not "ambient brand."
3. DO NOT use more than 5 blobs. More than 5 merge into a uniform wash that has no visible structure.
4. DO NOT set blob opacity above 0.7. The background must stay behind the content, not compete with it.
5. DO NOT skip the contrast scrim. If any blob position can put a bright color directly behind the headline, the text becomes unreadable.
6. DO NOT use `mix-blend-mode: screen` on blobs over a dark background without testing. Screen blend on near-black is a no-op; `normal` blend with opacity is what you want.
7. DO NOT synchronize blob durations (e.g., all at 20s). Use primes or co-prime values so the pattern never visibly resets.
8. DO NOT animate `filter: blur()` itself. Animate the blob position/scale; the blur is a static property on the container. Animating blur repaints every frame and tanks mobile.
9. DO NOT forget `will-change: transform` on the blob elements. Without it, the browser may not promote them to compositor layers and the animation runs on the main thread.
10. DO NOT ship without testing `prefers-reduced-motion`. Toggle it in DevTools > Rendering > Emulate CSS media feature. The hero must be fully usable with all animation stopped.
11. DO NOT place text directly on the aurora without a scrim or backdrop-filter. "It looks fine on my monitor" is not a contrast test.
12. DO NOT use `vh` for hero height without `dvh` fallback. Mobile browsers' address bar makes `100vh` taller than the visible viewport; `100dvh` is the correct unit.

## Integration notes
- **Pairs with `scroll-reveal-choreography`:** Content below the hero can use scroll-reveal for entrance animations as the user scrolls past.
- **Pairs with `lenis-smooth-scroll`:** If the page uses Lenis for smooth scrolling, the aurora hero needs no special handling; it sits at the top of the document flow.
- **Conflict with `gsap-scrolltrigger` pinning:** If you pin the aurora hero with ScrollTrigger, the `position: fixed` change will affect the blur compositing. Test that the blur remains GPU-composited after pinning.
- **Conflict with `noise-grain-texture`:** Adding a noise/grain overlay on top of the aurora (see `hero-noise-grain-cinematic`) works well, but the noise pseudo-element must sit above the aurora and below the content (`z-index: 1`). Do not apply the noise filter directly to the aurora container; it will be blurred along with the blobs.
- **Conflict with multiple WebGL contexts:** If the GLSL variant is used alongside a Three.js scene elsewhere on the page, you have two WebGL contexts. Most browsers limit to 8-16 active contexts. Use a shared renderer from `three-js-fundamentals` if both need to coexist.

## Ship checklist
- [ ] Hero fills full viewport (`100dvh`) with no overflow or scrollbar
- [ ] 3-5 blob colors derived from actual brand palette, not default purple/teal/pink
- [ ] Blob animations loop seamlessly (0% and 100% keyframes identical)
- [ ] Headline passes WCAG AA contrast (4.5:1) at every animation frame
- [ ] `prefers-reduced-motion` tested: all animation stops, content fully visible
- [ ] Mobile: maximum 3 blobs, blur reduced, no horizontal overflow
- [ ] No render-blocking JS for the CSS-only version
- [ ] CTA buttons have visible `:focus-visible` outlines
- [ ] `aria-hidden="true"` on aurora container and scroll-cue
- [ ] `<h1>` used for the headline (not a `<div>` with large font)
- [ ] Entrance animation completes within 2s of page load
- [ ] GPU memory under 10 MB (check DevTools > Performance > Layers)
- [ ] No `mix-blend-mode` applied without visual verification on the actual background color
- [ ] Scroll-cue visible but not distracting; animated under reduced-motion is killed
