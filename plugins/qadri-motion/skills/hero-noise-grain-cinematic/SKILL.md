---
name: hero-noise-grain-cinematic
description: Use when building a cinematic hero with film grain overlay, vignette, and a slow push-in (Ken Burns) camera movement on a background image or video. Builds the full hero with grain, vignette, push-in, headline, and mobile fallback.
category: hero
pairs_with: hero-noise-grain-cinematic-eval
---

# Cinematic Grain, Vignette & Slow Push-In Hero

## What this builds
A full-viewport hero section with a cinematic feel achieved through three layered effects: a film grain texture overlay, a radial vignette darkening the edges, and a slow push-in (Ken Burns) zoom on the background image or video. A headline, subline, and CTA sit above all layers with guaranteed contrast. The result reads as a still from a film, not a webpage.

- Full-viewport background image or video with slow push-in zoom (10-20s, scale 1.0 to 1.08)
- SVG `feTurbulence` or canvas-generated film grain overlay at low opacity
- Radial-gradient vignette darkening the edges and corners
- Headline, subline, CTA with contrast-safe positioning
- `prefers-reduced-motion`: no push-in, grain static, content fully visible
- Optional: grain animation (cycling random seed or translating noise tile)

## When to use / when not to
- Use for editorial, fashion, film, luxury, hospitality, or any brand where the hero image IS the hero.
- Use when the design calls for warmth, texture, and cinematic framing rather than clean/digital precision.
- Do NOT use when the hero background is a solid color or gradient. Grain on a gradient looks dirty, not cinematic. See `hero-gradient-mesh-aurora` for gradient heroes.
- Do NOT use when the hero image is an illustration or vector graphic. Grain overlays on flat-color illustration look like JPEG compression artifacts.
- For the grain/noise technique in isolation, see primitive `noise-grain-texture`. This toolkit builds the complete cinematic hero around it.

## Stack decision
| Dependency | Version | Why |
|---|---|---|
| None (pure CSS + SVG) | -- | `feTurbulence` grain, CSS `radial-gradient` vignette, and CSS `@keyframes` push-in. Zero JS for the base version. |
| Canvas noise tile (optional) | -- | Pre-generated noise bitmap tiled via CSS `background-image`. Gives per-pixel control and easier animation (cycling tiles). ~20 lines of init JS. |
| GSAP (optional) | 3.13+ | Only for scroll-linked push-in (zoom accelerates/decelerates with scroll position) instead of a time-based CSS animation. |

**Cheaper alternative:** Skip animated grain entirely. Use a static PNG noise tile (`128x128`, ~2 KB) tiled at 5-8% opacity. No SVG, no canvas, no JS. Looks 90% as good as animated grain.

## Architecture

```
hero-noise-grain-cinematic/
  index.html    -- hero section with layered effects
  styles.css    -- all layers: image, push-in, vignette, grain, content
  grain.js      -- (optional) canvas noise tile generator + animation
```

**Layer stack (bottom to top):**
```
z-index 0: Background image/video with push-in animation
z-index 1: Vignette (radial-gradient pseudo-element)
z-index 2: Film grain overlay (SVG filter or tiled canvas noise)
z-index 3: Content scrim (optional, for extra contrast)
z-index 4: Headline, subline, CTA
```

**Lifecycle:**
1. **Paint:** Image loads. Vignette and grain render immediately via CSS/SVG.
2. **Push-in:** CSS `@keyframes` slowly scales the background from 1.0 to 1.08 over 15-20s. Infinite loop with `alternate` direction creates a subtle breathing effect.
3. **Grain (static):** SVG `feTurbulence` or a tiled noise image sits over everything at 3-10% opacity with `mix-blend-mode: overlay` or `multiply`.
4. **Grain (animated, optional):** Canvas generates 3-5 noise tiles at init. CSS animation cycles through them at ~4fps (250ms per frame), giving a flickering film-grain feel.
5. **Reduced motion:** Push-in stops. Grain is static. Content visible with no animation.

## Build it: step by step

### Phase 1: HTML structure

```html
<section class="hero" aria-label="Welcome">
  <div class="hero__media" aria-hidden="true">
    <img
      class="hero__image"
      src="hero-bg.jpg"
      alt=""
      loading="eager"
      decoding="async"
    />
  </div>

  <div class="hero__vignette" aria-hidden="true"></div>
  <div class="hero__grain" aria-hidden="true"></div>

  <div class="hero__content">
    <p class="hero__eyebrow">A film by Studio Name</p>
    <h1 class="hero__headline">The Last<br>Horizon</h1>
    <p class="hero__subline">
      A story of light and silence, told in a single frame.
    </p>
    <a href="/watch" class="hero__cta">Watch now</a>
  </div>
</section>

<!-- SVG noise filter (zero visual footprint) -->
<svg width="0" height="0" style="position: absolute" aria-hidden="true">
  <defs>
    <filter id="grain-filter" color-interpolation-filters="sRGB">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.65"
        numOctaves="3"
        stitchTiles="stitch"
        result="noise"
      />
      <feColorMatrix type="saturate" values="0" in="noise" result="mono" />
    </filter>
  </defs>
</svg>
```

### Phase 2: Background image with push-in

```css
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --push-in-duration: 18s;
  --push-in-scale-start: 1.0;
  --push-in-scale-end: 1.08;
  --grain-opacity: 0.06;
  --vignette-intensity: 0.7;
  --hero-text: #f5f0eb;
  --hero-text-muted: rgba(245, 240, 235, 0.65);
}

.hero {
  position: relative;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #0a0a0a;
}

.hero__media {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}

.hero__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 30%;
  will-change: transform;
  animation: push-in var(--push-in-duration) ease-in-out infinite alternate;
}

@keyframes push-in {
  from {
    transform: scale(var(--push-in-scale-start));
  }
  to {
    transform: scale(var(--push-in-scale-end));
  }
}
```

**Why `alternate`:** The animation reverses direction on each iteration, creating a slow breathing zoom in/out instead of a visible snap-back at the loop boundary.

**Why `ease-in-out`:** Linear push-in looks mechanical. Ease-in-out produces a more cinematic feel: the camera accelerates gently, cruises, then decelerates.

**Image sizing:** The image must be slightly larger than the viewport to accommodate the scale. At `scale(1.08)`, the image needs to be 8% larger than the container in each dimension, which `object-fit: cover` handles automatically.

### Phase 3: Vignette

```css
.hero__vignette {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: radial-gradient(
    ellipse at center,
    transparent 40%,
    rgba(0, 0, 0, var(--vignette-intensity)) 100%
  );
}
```

**Vignette tuning:**
- `40%` transparent center: the content area stays clear. Increase to 50-60% for a lighter vignette.
- `var(--vignette-intensity)` at 0.7: strong cinematic darkening. For bright/airy images, reduce to 0.3-0.4.
- The vignette is a `radial-gradient` on a pseudo/div, not a `box-shadow`. Box-shadow vignettes have hard edges. Radial-gradient gives smooth falloff.

### Phase 4: Film grain (SVG feTurbulence)

```css
.hero__grain {
  position: absolute;
  inset: -10%;     /* extend beyond viewport to avoid edge artifacts during push-in */
  z-index: 2;
  pointer-events: none;
  filter: url(#grain-filter);
  opacity: var(--grain-opacity);
  mix-blend-mode: overlay;
}
```

**Why `inset: -10%`:** The grain layer must extend beyond the viewport edges because the background image scales up during push-in. Without the extension, the grain pattern clips and creates a visible edge.

**Why `mix-blend-mode: overlay`:** Overlay blends the grain with the underlying image naturally: bright areas get slightly brighter noise, dark areas get slightly darker noise, preserving the image's contrast structure. Alternatives:
- `multiply`: Darkens the image slightly. Good for moody/dark imagery.
- `soft-light`: Gentler version of overlay. Good for light/pastel images.
- `screen`: Brightens. Rarely right for grain.
- `normal` (just opacity): Adds uniform noise regardless of image brightness. Looks flat.

### Phase 5: Content overlay

```css
.hero__content {
  position: absolute;
  z-index: 4;
  bottom: 8vh;
  left: clamp(2rem, 5vw, 6rem);
  max-width: 36rem;
}

.hero__eyebrow {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: clamp(0.625rem, 0.9vw, 0.75rem);
  font-weight: 500;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--hero-text-muted);
  margin-bottom: 1.25rem;
}

.hero__headline {
  font-family: 'DM Serif Display', Georgia, serif;
  font-size: clamp(3rem, 8vw, 6.5rem);
  font-weight: 400;
  line-height: 0.95;
  letter-spacing: -0.01em;
  color: var(--hero-text);
  margin-bottom: 1.5rem;
}

.hero__subline {
  font-size: clamp(0.9375rem, 1.2vw, 1.0625rem);
  line-height: 1.7;
  color: var(--hero-text-muted);
  max-width: 28rem;
  margin-bottom: 2rem;
}

.hero__cta {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 2rem;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-decoration: none;
  color: var(--hero-text);
  border: 1px solid rgba(245, 240, 235, 0.3);
  transition: border-color 250ms ease, background 250ms ease;
}

.hero__cta:hover {
  border-color: rgba(245, 240, 235, 0.7);
  background: rgba(245, 240, 235, 0.05);
}

.hero__cta:focus-visible {
  outline: 2px solid var(--hero-text);
  outline-offset: 3px;
}
```

**Content positioning:** Bottom-left is a cinematic convention (film titles, credits). This is not arbitrary; the eye naturally settles at the lower-third line. Center alignment reads as a presentation slide, not a film frame.

### Phase 6: Entrance animation

```css
.hero__eyebrow,
.hero__headline,
.hero__subline,
.hero__cta {
  opacity: 0;
  transform: translateY(1rem);
  animation: content-reveal 0.9s ease-out forwards;
}

.hero__eyebrow  { animation-delay: 0.5s; }
.hero__headline { animation-delay: 0.7s; }
.hero__subline  { animation-delay: 0.9s; }
.hero__cta      { animation-delay: 1.1s; }

@keyframes content-reveal {
  to { opacity: 1; transform: translateY(0); }
}

/* Image fade-in */
.hero__image {
  opacity: 0;
  animation: image-reveal 1.5s ease-out 0.2s forwards;
}

@keyframes image-reveal {
  to { opacity: 1; }
}
```

### Phase 7: Animated grain (canvas noise tiles)

For a flickering film-grain feel (like actual film projection), generate multiple noise tiles and cycle through them.

```js
function generateGrainFrames(count = 4, size = 256) {
  const frames = [];
  for (let f = 0; f < count; f++) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const v = Math.random() * 255;
      data[i] = v;       // R
      data[i + 1] = v;   // G
      data[i + 2] = v;   // B
      data[i + 3] = 255; // A
    }
    ctx.putImageData(imageData, 0, 0);
    frames.push(canvas.toDataURL('image/png'));
  }
  return frames;
}

function initAnimatedGrain() {
  const grainEl = document.querySelector('.hero__grain');
  if (!grainEl) return;

  // Remove SVG filter approach, use canvas tiles instead
  grainEl.style.filter = 'none';

  const frames = generateGrainFrames(4, 256);
  let currentFrame = 0;

  // Apply first frame immediately
  grainEl.style.backgroundImage = `url(${frames[0]})`;
  grainEl.style.backgroundSize = '256px 256px';
  grainEl.style.backgroundRepeat = 'repeat';

  // Cycle frames at ~4fps for a film flicker
  setInterval(() => {
    currentFrame = (currentFrame + 1) % frames.length;
    grainEl.style.backgroundImage = `url(${frames[currentFrame]})`;
  }, 250);
}

// Only animate grain if reduced-motion is not set
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  initAnimatedGrain();
}
```

**Why 4 frames at 4fps:** Real 35mm film grain changes every frame at 24fps, but web users are not watching a projected film. 4fps is enough to create a perceptible flicker without the GPU cost of 24fps texture swaps. More than 6 frames is wasted; the random patterns are not studied frame by frame.

### Phase 8: Video background variant

Replace the `<img>` with a `<video>` for motion backgrounds. The push-in animation still applies on top.

```html
<div class="hero__media" aria-hidden="true">
  <video
    class="hero__video"
    autoplay
    muted
    loop
    playsinline
    poster="hero-poster.jpg"
  >
    <source src="hero-bg.mp4" type="video/mp4">
  </video>
</div>
```

```css
.hero__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  will-change: transform;
  animation: push-in var(--push-in-duration) ease-in-out infinite alternate;
}
```

**Video requirements:**
- Duration: 8-20s, seamless loop
- Resolution: 1920x1080 minimum, 4K preferred for Retina
- Codec: H.264 for broad compatibility, VP9/AV1 for smaller size
- File size: < 5 MB for 15s at 1080p (compress with FFmpeg: `ffmpeg -i input.mp4 -c:v libx264 -crf 28 -preset slow -an output.mp4`)
- Always include `poster` for LCP: the first frame image loads before the video

### Phase 9: Reduced motion and mobile

```css
@media (prefers-reduced-motion: reduce) {
  .hero__image,
  .hero__video {
    animation: none !important;
    transform: scale(1);
  }

  .hero__eyebrow,
  .hero__headline,
  .hero__subline,
  .hero__cta,
  .hero__image {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }

  /* Grain stays static (no JS animation) */
}

@media (max-width: 768px) {
  :root {
    --push-in-scale-end: 1.04; /* subtler zoom on mobile */
    --grain-opacity: 0.04;      /* less grain on mobile for performance */
  }

  .hero__content {
    bottom: 6vh;
    left: 1.5rem;
    right: 1.5rem;
  }

  .hero__headline {
    font-size: clamp(2.5rem, 10vw, 4rem);
  }
}
```

## The full reference implementation

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cinematic Hero</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --push-in-duration: 18s; --push-in-scale-start: 1.0; --push-in-scale-end: 1.08;
      --grain-opacity: 0.06; --vignette-intensity: 0.7;
      --hero-text: #f5f0eb; --hero-text-muted: rgba(245,240,235,0.65);
    }
    body { font-family: 'Inter', system-ui, sans-serif; background: #0a0a0a; }

    .hero { position: relative; width: 100%; height: 100dvh; overflow: hidden; background: #0a0a0a; }
    .hero__media { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
    .hero__image {
      width: 100%; height: 100%; object-fit: cover; object-position: center 30%;
      will-change: transform; opacity: 0;
      animation: image-reveal 1.5s ease-out 0.2s forwards, push-in var(--push-in-duration) ease-in-out 0.2s infinite alternate;
    }
    @keyframes push-in { from { transform: scale(var(--push-in-scale-start)); } to { transform: scale(var(--push-in-scale-end)); } }
    @keyframes image-reveal { to { opacity: 1; } }

    .hero__vignette {
      position: absolute; inset: 0; z-index: 1; pointer-events: none;
      background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,var(--vignette-intensity)) 100%);
    }
    .hero__grain {
      position: absolute; inset: -10%; z-index: 2; pointer-events: none;
      filter: url(#grain-filter); opacity: var(--grain-opacity); mix-blend-mode: overlay;
    }

    .hero__content {
      position: absolute; z-index: 4; bottom: 8vh;
      left: clamp(2rem, 5vw, 6rem); max-width: 36rem;
    }
    .hero__eyebrow {
      font-size: clamp(0.625rem, 0.9vw, 0.75rem); font-weight: 500;
      letter-spacing: 0.15em; text-transform: uppercase;
      color: var(--hero-text-muted); margin-bottom: 1.25rem;
      opacity: 0; transform: translateY(1rem); animation: content-reveal 0.9s ease-out 0.5s forwards;
    }
    .hero__headline {
      font-family: 'DM Serif Display', Georgia, serif;
      font-size: clamp(3rem, 8vw, 6.5rem); font-weight: 400;
      line-height: 0.95; letter-spacing: -0.01em;
      color: var(--hero-text); margin-bottom: 1.5rem;
      opacity: 0; transform: translateY(1rem); animation: content-reveal 0.9s ease-out 0.7s forwards;
    }
    .hero__subline {
      font-size: clamp(0.9375rem, 1.2vw, 1.0625rem); line-height: 1.7;
      color: var(--hero-text-muted); max-width: 28rem; margin-bottom: 2rem;
      opacity: 0; transform: translateY(1rem); animation: content-reveal 0.9s ease-out 0.9s forwards;
    }
    .hero__cta {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.75rem 2rem; font-size: 0.875rem; font-weight: 600;
      letter-spacing: 0.04em; text-transform: uppercase;
      text-decoration: none; color: var(--hero-text);
      border: 1px solid rgba(245,240,235,0.3);
      transition: border-color 250ms ease, background 250ms ease;
      opacity: 0; transform: translateY(1rem); animation: content-reveal 0.9s ease-out 1.1s forwards;
    }
    .hero__cta:hover { border-color: rgba(245,240,235,0.7); background: rgba(245,240,235,0.05); }
    .hero__cta:focus-visible { outline: 2px solid var(--hero-text); outline-offset: 3px; }
    @keyframes content-reveal { to { opacity: 1; transform: translateY(0); } }

    @media (prefers-reduced-motion: reduce) {
      .hero__image { animation: none !important; opacity: 1 !important; transform: scale(1) !important; }
      .hero__eyebrow, .hero__headline, .hero__subline, .hero__cta {
        animation: none !important; opacity: 1 !important; transform: none !important;
      }
    }
    @media (max-width: 768px) {
      :root { --push-in-scale-end: 1.04; --grain-opacity: 0.04; }
      .hero__content { bottom: 6vh; left: 1.5rem; right: 1.5rem; }
      .hero__headline { font-size: clamp(2.5rem, 10vw, 4rem); }
    }
  </style>
</head>
<body>
  <section class="hero" aria-label="Welcome">
    <div class="hero__media" aria-hidden="true">
      <img class="hero__image" src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80" alt="" loading="eager" decoding="async" />
    </div>
    <div class="hero__vignette" aria-hidden="true"></div>
    <div class="hero__grain" aria-hidden="true"></div>
    <div class="hero__content">
      <p class="hero__eyebrow">A film by Studio Name</p>
      <h1 class="hero__headline">The Last<br>Horizon</h1>
      <p class="hero__subline">A story of light and silence, told in a single frame.</p>
      <a href="/watch" class="hero__cta">Watch now</a>
    </div>
  </section>

  <svg width="0" height="0" style="position:absolute" aria-hidden="true">
    <defs>
      <filter id="grain-filter" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise"/>
        <feColorMatrix type="saturate" values="0" in="noise" result="mono"/>
      </filter>
    </defs>
  </svg>
</body>
</html>
```

## Tuning the feel

| Parameter | Value | Why |
|---|---|---|
| Push-in scale | 1.0 to 1.06-1.10 | Below 1.04 the motion is imperceptible. Above 1.12 the edges of the image become visible (not covered by the container). |
| Push-in duration | 15-25s | Below 12s it reads as a zoom, not a push-in. Above 30s it looks static. |
| Push-in easing | ease-in-out | Linear is mechanical. Ease-in-out gives cinematic acceleration/deceleration. |
| Grain opacity | 0.04-0.10 | Below 0.03 invisible. Above 0.12 looks like JPEG compression or dirt. |
| Grain blend mode | overlay | Best for photo backgrounds. Use multiply for dark moody images. soft-light for bright/pastel. |
| Grain baseFrequency | 0.5-0.8 | Lower = larger noise pattern (coarse grain). Higher = finer, more film-like. 0.65 is standard 35mm grain. |
| Vignette center radius | 35-50% transparent | 40% is standard. Smaller center = heavier vignette. Larger center = lighter. |
| Vignette edge alpha | 0.5-0.8 | 0.7 is strong cinematic. 0.4 is subtle. |
| Content entrance stagger | 200ms between elements | Matches the cinematic pacing. Faster than 150ms feels rushed for this aesthetic. |
| Image fade-in | 1.5s ease-out | Slow reveal of the image. Faster than 1s looks like a flash. |

## Variants

### 1. Scroll-linked push-in
Replace the CSS time-based push-in with GSAP ScrollTrigger scrubbed zoom. The image zooms in as the user scrolls, then holds at max zoom. See primitive `gsap-scrolltrigger` for scrub configuration.

### 2. Color grade overlay
Add a CSS `background-blend-mode` or `filter` on the image to apply a color grade: warm amber (`sepia(0.2) saturate(1.2)`), cool blue (`hue-rotate(200deg) saturate(0.8)`), or desaturated (`saturate(0.6)`).

### 3. Letterboxed (21:9)
Add horizontal black bars to create a widescreen aspect ratio. Use `::before` and `::after` pseudo-elements with `height: 12vh` on the hero, positioned at top and bottom. The image stays full-height behind the bars.

### 4. Text-only (no image)
Dark background with grain, vignette, and cinematic typography only. The grain and vignette provide the texture on a pure `#0a0a0a` background. The push-in is not applicable. Good for teaser/coming-soon pages.

### 5. Parallax grain
The grain layer moves at a slightly different speed than the image during push-in, creating a subtle depth separation between the grain and the background. Apply a `scale(0.98)` to the grain layer while the image scales to `1.08`.

## Performance budget
| Metric | Target |
|---|---|
| LCP | < 2.5s (depends on image size; use responsive `srcset`) |
| Hero image | < 200 KB at 1920px (use WebP/AVIF, quality 75-80) |
| Hero video | < 5 MB for 15s at 1080p |
| SVG grain filter | CPU-rendered; negligible on modern hardware. Avoid on very old mobile. |
| Canvas grain (animated) | 4 frames x 256x256 PNG = ~200 KB data URLs total. Generated once at init. |
| Push-in animation | Single CSS transform, GPU-composited. ~0.1ms per frame. |
| Compositor layers | 3-4 (image, vignette, grain, content) |

**What to cut first:**
1. Drop animated grain; use static SVG grain (zero JS, zero init cost)
2. Reduce grain opacity to 0.03 or remove on mobile
3. Replace video with a static image + push-in (saves 3-5 MB)
4. Remove vignette (saves one compositor layer, minimal visual loss on bright images)

## Accessibility
- All decorative layers (media, vignette, grain) are `aria-hidden="true"`.
- Headline uses `<h1>` for document structure.
- CTA has a visible `:focus-visible` ring.
- `prefers-reduced-motion`: push-in animation stops, grain is static, content appears immediately.
- Image `alt=""` (decorative). If the image conveys meaning, provide a real `alt`.
- If using video: `autoplay muted loop playsinline` are all required. Never auto-play audio.
- **Honest cost:** Users with reduced motion see a static image with grain and vignette. They miss the push-in movement but the cinematic feel (grain, vignette, typography) is preserved.

## Anti-slop rules
1. DO NOT apply grain over a gradient or solid color background. Grain is for photographic/video imagery. On flat colors it looks like compression artifacts.
2. DO NOT set grain opacity above 0.12. The grain should be visible as texture on close inspection, invisible at reading distance. Above 0.12 it looks like dirt.
3. DO NOT use `mix-blend-mode: normal` for grain. Without a blend mode, grain adds a uniform white haze. Use `overlay`, `multiply`, or `soft-light` so grain interacts with image brightness.
4. DO NOT make the push-in faster than 12 seconds. Fast zoom reads as "broken animation," not "cinematic." The whole point is slow, almost imperceptible movement.
5. DO NOT use `animation-direction: normal` (no alternate) for the push-in. Without alternate, the animation snaps back to scale(1) at the loop boundary, creating a visible jump.
6. DO NOT skip the vignette. Without edge darkening, the hero feels like a full-width banner, not a framed shot. Vignette is 40% of the cinematic feel.
7. DO NOT center-align the headline for cinematic heroes. Bottom-left or lower-third positioning follows film title conventions. Center alignment reads as PowerPoint, not cinema.
8. DO NOT use a sans-serif display font for the main headline in a cinematic context. Serif or display serif (DM Serif Display, Playfair Display, or similar) carries editorial weight. The eyebrow and body can be sans-serif.
9. DO NOT animate the grain filter properties (baseFrequency, seed) with CSS. SVG filter re-rendering is CPU-bound and will jank. If you want animated grain, use canvas tile cycling instead.
10. DO NOT ship without testing on a real photo. Grain looks different on dark vs. bright vs. saturated images. Test with the actual production image, not a placeholder.
11. DO NOT use `filter: blur()` on the grain layer thinking it will "smooth out" the noise. Blur on the grain layer just makes it look like a haze/fog overlay, not grain.

## Integration notes
- **Pairs with `hero-gradient-mesh-aurora`:** These two toolkits are alternatives, not complements. Use aurora for abstract gradient heroes; use this for photographic/cinematic heroes. If both effects are wanted, layer the aurora behind the image with the image at reduced opacity.
- **Pairs with `scroll-reveal-choreography`:** Content below the hero can use scroll-reveal entrances.
- **Pairs with `lenis-smooth-scroll`:** No conflicts; the push-in is time-based, not scroll-linked.
- **Conflict with other full-viewport heroes:** Only one hero should occupy the first viewport. This is not a section effect; it is the opening shot.
- **Depends on `noise-grain-texture` (primitive):** The grain overlay techniques (SVG feTurbulence, canvas noise tile, blend modes) are documented in detail there. This toolkit composes them into the cinematic hero context.

## Ship checklist
- [ ] Background image is high quality (1920px+, < 200 KB WebP/AVIF)
- [ ] Push-in animation is 15-25s, ease-in-out, alternate
- [ ] Grain visible on close inspection but not at reading distance (opacity 0.04-0.10)
- [ ] Grain uses `mix-blend-mode: overlay` (or appropriate blend mode for the image)
- [ ] Vignette present with smooth radial-gradient falloff
- [ ] Content positioned at bottom-left or lower-third
- [ ] Headline uses a serif or display serif font
- [ ] `prefers-reduced-motion`: push-in stops, content visible immediately
- [ ] All decorative layers are `aria-hidden="true"`
- [ ] CTA has visible `:focus-visible` ring
- [ ] `<h1>` used for headline
- [ ] Image has `loading="eager"` (above the fold, do not lazy-load)
- [ ] Mobile: reduced grain opacity, subtler push-in, responsive typography
- [ ] Tested with the actual production image, not a placeholder
