---
name: noise-grain-texture
description: Use when adding film grain, noise overlays, or subtle texture to backgrounds, images, or gradients -- via SVG feTurbulence, canvas-generated noise tiles, or CSS blend modes.
---

# Noise, Grain & Texture Overlays

## When to use this
- A gradient or solid background looks too clean and digital. You want to add organic texture.
- You need film-grain-style noise on a hero image, video thumbnail, or card background.
- You want the texture to tile seamlessly, animate subtly, or respond to theme colors.
- The goal is warmth and tactility, not a distortion effect.
- Do NOT use this when you need animated noise distortion or displacement -- see `svg-filter-effects` or `liquid-displacement-effects` instead.

## Mental model
Grain and noise overlays work by layering a semi-transparent noise texture on top of (or blended with) the content. The three approaches, in order of complexity:

**SVG feTurbulence**: The simplest. Generate noise in markup, apply as a CSS filter or SVG background. Zero JavaScript, zero image assets. The noise is procedural, resolution-independent, and tiling when you use `stitchTiles="stitch"`. Downside: CPU-rendered, and animating it is choppy.

**Canvas noise tile**: Generate a small (256x256 or 512x512) noise bitmap at init, export as a data URL, and tile it with CSS `background-image: url(data:...)`. This is fast, flexible (you control every pixel), and the resulting CSS background is GPU-composited. Animating requires regenerating the tile or cycling through pre-generated frames.

**CSS blend modes**: Layer the noise texture (SVG or canvas) on top of content using `mix-blend-mode: overlay` or `multiply`. This lets the noise interact with the underlying colors naturally -- dark areas get more visible grain, light areas get subtle speckling. The alternative is a simple opacity reduction, which adds uniform noise regardless of underlying lightness.

The critical aesthetic line: grain should be visible as texture on close inspection but invisible as individual dots at reading distance. Opacity 0.03-0.12 for most uses. Above 0.15 it reads as dirt or a rendering bug.

## Setup
No dependencies for any approach.

### SVG approach (inline or external)
```html
<svg width="0" height="0" style="position:absolute">
  <defs>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.65"
                    numOctaves="3" stitchTiles="stitch" />
    </filter>
  </defs>
</svg>
```

### Canvas approach
```js
function generateNoiseTile(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.random() * 255;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}
```

## Core API
| Technique | Key properties | Notes |
|---|---|---|
| SVG `feTurbulence` | `baseFrequency`, `numOctaves`, `type`, `seed`, `stitchTiles` | Pure markup, no JS |
| Canvas `createImageData` | Direct pixel manipulation | Full control, one-time cost |
| CSS `mix-blend-mode` | `overlay`, `multiply`, `soft-light`, `screen` | Compositing mode for the overlay layer |
| CSS `background-blend-mode` | Same modes | Blends multiple backgrounds on one element |
| CSS `opacity` | 0-1 | Simple transparency, no color interaction |
| `::before` / `::after` | `content: ''`, `background`, `pointer-events: none` | Overlay pseudo-element pattern |
| `background-size` | Tile size for noise texture | Match canvas tile size or use `cover` |

## Recipes

### 1. SVG grain overlay via pseudo-element
The simplest zero-JS approach. Grain overlay on any element.
```html
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <filter id="grain" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.65"
                    numOctaves="3" stitchTiles="stitch" />
    </filter>
  </defs>
</svg>

<style>
.textured {
  position: relative;
  background: linear-gradient(135deg, #1a1a2e, #16213e);
}
.textured::after {
  content: '';
  position: absolute;
  inset: 0;
  filter: url(#grain);
  opacity: 0.06;
  mix-blend-mode: overlay;
  pointer-events: none;
}
</style>

<section class="textured">
  <h1>Content with grain</h1>
</section>
```

### 2. Canvas noise tile with CSS tiling
Generate once, tile everywhere. Performant and flexible.
```js
function createNoiseTile(size = 256, intensity = 40) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(size, size);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * intensity;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

const noiseUrl = createNoiseTile(256, 50);

// Apply as a tiling background on a pseudo-element
const style = document.createElement('style');
style.textContent = `
  .grain-bg::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: url(${noiseUrl});
    background-size: 256px 256px;
    opacity: 0.08;
    mix-blend-mode: overlay;
    pointer-events: none;
  }
`;
document.head.appendChild(style);
```

### 3. Animated grain (canvas frame cycling)
Pre-generate N noise frames, cycle through them for film-grain flicker.
```js
function generateFrames(count, size, intensity) {
  const frames = [];
  for (let f = 0; f < count; f++) {
    frames.push(createNoiseTile(size, intensity));
  }
  return frames;
}

const frames = generateFrames(8, 128, 60);
const overlay = document.querySelector('.grain-overlay');
let frameIdx = 0;

function tick() {
  frameIdx = (frameIdx + 1) % frames.length;
  overlay.style.backgroundImage = `url(${frames[frameIdx]})`;
  setTimeout(tick, 80); // 12.5fps for film-like flicker, not smooth
}
tick();
```

### 4. Gradient with inline noise (no pseudo-element)
Use `background-blend-mode` to blend noise directly with a gradient.
```css
.noisy-gradient {
  background:
    url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%25" height="100%25" filter="url(%23n)"/></svg>'),
    linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-blend-mode: overlay;
  background-size: 256px 256px, cover;
}
```
This is a single-element solution -- no pseudo-element, no JS. The SVG is inlined as a data URI.

### 5. Colored grain (not just grayscale)
Grain with slight color tint for warmer feel.
```js
function createColoredNoise(size, r, g, b, spread) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(size, size);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const noise = (Math.random() - 0.5) * spread;
    d[i]     = Math.max(0, Math.min(255, r + noise));
    d[i + 1] = Math.max(0, Math.min(255, g + noise * 0.8));
    d[i + 2] = Math.max(0, Math.min(255, b + noise * 0.6));
    d[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}
// Warm sepia grain: centered around tan, offset by noise
const warmGrain = createColoredNoise(256, 180, 160, 140, 60);
```

### 6. High-frequency grain for print/poster aesthetic
Dense, fine grain that mimics risograph or offset printing texture.
```js
function createFineGrain(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(size, size);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    // Binary noise: each pixel is fully black or fully white
    const v = Math.random() > 0.5 ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

// Use at very low opacity with soft-light blend for subtle texture
const style = document.createElement('style');
const fineUrl = createFineGrain(512);
style.textContent = `
  .risograph-texture::after {
    content: '';
    position: absolute;
    inset: 0;
    background: url(${fineUrl});
    background-size: 512px 512px;
    mix-blend-mode: soft-light;
    opacity: 0.04;
    pointer-events: none;
  }
`;
document.head.appendChild(style);
```

## Tuning the feel
- **Opacity**: 0.03-0.06 for barely-there texture (gradient banding fix). 0.06-0.12 for visible grain (film look). Above 0.15 the noise becomes the dominant visual.
- **Blend mode**: `overlay` adds grain that responds to underlying lightness -- more visible on midtones, invisible on pure black/white. `soft-light` is gentler. `multiply` darkens -- good for paper texture. `screen` lightens -- good for dust/scratches on dark backgrounds.
- **Tile size**: 128px for minimal memory, visible repeat pattern on large screens. 256px is the sweet spot. 512px for high-DPI or if you are zooming into the texture.
- **Noise intensity (canvas)**: The `spread` parameter in the colored noise recipe. 30-50 for subtle. 60-100 for punchy grain. Above 120 creates harsh black/white speckling.
- **Animation speed**: 8-15fps for film-grain flicker. 30fps+ looks like TV static, not film. 4fps or below looks like a slideshow, not grain.
- **baseFrequency (SVG)**: 0.5-0.8 for fine grain. 0.3-0.5 for coarser texture. Below 0.2 creates visible blobs, not grain.

## Performance
- **SVG feTurbulence**: CPU-rendered. On a 1920x1080 element, it processes ~2M pixels per repaint. Fine for static content. Laggy if the element resizes frequently or the filter animates.
- **Canvas tile + CSS background**: The tile is generated once (~1ms for 256x256). The CSS tiling and blending is GPU-composited. Essentially free at runtime.
- **Animated grain**: Cycling CSS background-image URLs triggers a repaint per frame. At 10-15fps this is cheap (~0.1ms per frame). Pre-generating tiles costs ~8ms for 8 frames at 128px.
- **Memory**: Each 256x256 PNG data URL is ~100-200KB. 8 animation frames = ~1-2MB. Reasonable.
- **The blend mode cost**: `mix-blend-mode` on a pseudo-element creates an extra compositing layer. This is one of the cheapest GPU operations but can cause unexpected stacking context behavior.

## Accessibility
```css
@media (prefers-reduced-motion: reduce) {
  .grain-overlay {
    /* Stop frame cycling, show static grain or none */
    animation: none;
  }
}
@media (prefers-contrast: more) {
  .grain-overlay {
    /* Remove grain that reduces text contrast */
    display: none;
  }
}
```
- Grain overlays must never cover interactive elements without `pointer-events: none`.
- If grain reduces text contrast below WCAG thresholds, reduce opacity or remove for `prefers-contrast: more`.
- Grain is decorative. The overlay pseudo-element should not interfere with assistive technology.

## Anti-slop rules
1. Never apply grain at opacity above 0.15. It stops being texture and becomes noise.
2. Never use `multiply` blend mode on dark backgrounds -- it makes the grain invisible. Use `screen` or `overlay` instead.
3. Never tile a 64x64 noise texture on a large screen. The repeat pattern is visible at that size. Minimum 128px, prefer 256px.
4. Never animate grain at 30fps or higher. Real film grain flickers at 12-24fps. Smooth noise animation reads as digital interference, not analog texture.
5. Never apply grain over text content without checking contrast ratios. Even 5% opacity reduces contrast.
6. Never generate noise tiles inside a render loop or resize handler. Generate once at init.
7. Never use colored grain where the tint fights the underlying palette. Warm grain on a cool-blue gradient creates visual mud.
8. Never skip `pointer-events: none` on the overlay layer. It silently breaks all click targets underneath.

## Checklist
- [ ] Grain opacity tested at reading distance -- texture, not dots
- [ ] `pointer-events: none` on overlay element
- [ ] Blend mode appropriate for background lightness
- [ ] Tile size at least 128px, no visible repeat
- [ ] `prefers-contrast: more` removes or reduces grain
- [ ] `prefers-reduced-motion: reduce` stops animation (if animated)
- [ ] Noise tile generated once, not per frame
- [ ] Text contrast checked with grain overlay active
