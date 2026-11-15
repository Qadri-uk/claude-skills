---
name: hero-video-scrub-apple
description: Use when building an Apple-style canvas image-sequence scroll scrubber hero section. Builds a complete pinned hero with frame-by-frame scrubbing, priority preloading, text overlay choreography, loading state, and video fallback.
category: hero
pairs_with: hero-video-scrub-apple-eval
---

# Apple-Style Canvas Image-Sequence Scrub Hero

## What this builds
A full-viewport hero section where scrolling drives a frame-by-frame product reveal rendered into a `<canvas>`. The section is sticky-pinned for the duration of the scroll budget, text overlays fade in/out at specific scroll keyframes, and a loading skeleton holds space until the initial frames are decoded. This is the technique Apple uses on product pages to let users "scrub" through a 3D product rotation or transformation sequence.

- Sticky-pinned section with configurable scroll budget (300-500vh)
- Priority preloader: eager first batch, then stream remaining sorted by proximity to current scroll position
- `createImageBitmap()` for off-main-thread decode
- rAF-throttled canvas draw bound to scroll progress
- Text overlay system with keyframed opacity/transform tied to scroll sub-ranges
- Loading skeleton that fades out when the eager batch completes
- Video `currentTime` scrub fallback for smaller payloads
- Responsive frame sourcing (mobile/tablet/desktop resolution tiers)

## When to use / when not to
- Use when you have pre-rendered frames (from Blender, After Effects, or video export) of a product reveal, unboxing, rotation, or transformation.
- Use when scroll-driven frame-perfect control matters more than video playback (the user scrubs forward and backward freely).
- Use when the visual IS the content, not a decoration -- this technique costs significant payload.
- Do NOT use for actual video content the user should just watch (testimonials, demos). Use a normal `<video>` element.
- Do NOT use when CSS/SVG animation or WebGL can produce the same visual procedurally. Use `hero-webgl-shader-fullscreen` or `hero-3d-anime-js-render-framework` instead.
- Do NOT use for particle effects or text animation. Use `hero-particle-text-formation` or `hero-kinetic-typography`.

## Stack decision
| Dependency | Version | Why | Cheaper alternative |
|---|---|---|---|
| Vanilla Canvas 2D | Native | `createImageBitmap` + `ctx.drawImage` is the fastest path for frame-by-frame rendering. No library needed. | A `<video>` element with `currentTime` scrubbing has lower engineering cost and ~60-80% smaller payload, but 50-150ms seek latency makes it feel laggy on fast scroll. See video fallback in Phase 6. |
| GSAP ScrollTrigger | 3.13+ | `ScrollTrigger.create()` with `pin: true` handles sticky pinning and delivers a 0-1 `progress` on every scroll tick. Free since 3.13. | CSS `position: sticky` + IntersectionObserver + manual scroll math. Works but requires ~60 lines of code that ScrollTrigger replaces with 5. |
| No image library | - | Fetch + `createImageBitmap` is native and sufficient. No sharp/jimp/etc. | If the project already uses a framework image component (Next.js `<Image>`), it can preload frames, but cannot bypass framework overhead for raw bitmap draw. |

See primitive `image-sequence-scrubbing` for the core scrubbing engine (preloader, draw loop, frame math). This toolkit builds the complete hero experience on top of that engine.

## Architecture

```
<section class="scrub-hero">                      <!-- tall scroll budget container -->
  <div class="scrub-hero__pinned">                 <!-- position: sticky; top: 0 -->
    <canvas class="scrub-hero__canvas"></canvas>    <!-- frame draw target -->
    <div class="scrub-hero__loading">...</div>      <!-- skeleton/spinner -->
    <div class="scrub-hero__overlays">              <!-- text callouts at keyframes -->
      <div class="overlay" data-in="0.0" data-out="0.15">Headline 1</div>
      <div class="overlay" data-in="0.3" data-out="0.5">Feature callout</div>
      <div class="overlay" data-in="0.7" data-out="0.9">CTA section</div>
    </div>
  </div>
</section>
```

**Lifecycle:**
1. **Init**: Size canvas to viewport * capped DPR. Build frame URL list. Show loading skeleton.
2. **Eager preload**: Load first 12 frames via `fetch` + `createImageBitmap`. Draw frame 0. Hide skeleton.
3. **Stream remaining**: Load rest sorted by proximity to current scroll position, in batches of 6 via `requestIdleCallback`.
4. **Scroll loop**: ScrollTrigger `onUpdate` maps `self.progress` to a frame index. If that frame's bitmap is decoded, draw it. Otherwise, draw the nearest available frame.
5. **Text overlays**: Each overlay has `data-in` and `data-out` progress thresholds. The scroll handler shows/hides them with opacity + translateY transitions.
6. **Teardown**: Abort in-flight fetches, close all `ImageBitmap`s, kill ScrollTrigger, remove listeners.

## Build it: step by step

### Phase 1: HTML + CSS for pinned hero with loading state

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Scrub Hero</title>
<style>
  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
  body{background:#000;color:#fff;font-family:system-ui,sans-serif}
  .scrub-hero{position:relative}
  .scrub-hero__pinned{
    position:sticky;top:0;height:100vh;overflow:hidden;
    display:flex;align-items:center;justify-content:center;
  }
  .scrub-hero__canvas{
    position:absolute;inset:0;width:100%;height:100%;
    object-fit:contain;display:block;
  }
  .scrub-hero__loading{
    position:absolute;inset:0;background:#000;
    display:flex;align-items:center;justify-content:center;
    z-index:2;transition:opacity 0.4s ease;
  }
  .scrub-hero__loading.loaded{opacity:0;pointer-events:none}
  .scrub-hero__loading .spinner{
    width:40px;height:40px;border:3px solid rgba(255,255,255,0.15);
    border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;
  }
  @keyframes spin{to{transform:rotate(360deg)}}
  .scrub-hero__overlays{
    position:absolute;inset:0;z-index:1;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    pointer-events:none;
  }
  .overlay{
    position:absolute;opacity:0;transform:translateY(20px);
    transition:opacity 0.3s ease,transform 0.3s ease;
    text-align:center;max-width:40ch;
  }
  .overlay.visible{opacity:1;transform:translateY(0)}
  .overlay h2{font-size:clamp(1.5rem,4vw,3rem);font-weight:700;letter-spacing:-0.02em;text-shadow:0 2px 12px rgba(0,0,0,0.6)}
  .overlay p{margin-top:0.5rem;opacity:0.7;font-size:clamp(0.875rem,1.5vw,1.125rem);text-shadow:0 1px 8px rgba(0,0,0,0.5)}
  .content{height:100vh;padding:4rem 2rem}
  @media(prefers-reduced-motion:reduce){
    .scrub-hero__canvas{display:none}
    .scrub-hero__pinned{background:#000}
    .scrub-hero__loading{display:none}
    .overlay{opacity:1!important;transform:none!important;position:relative}
  }
</style>
</head>
<body>
<section class="scrub-hero" id="scrub-hero">
  <div class="scrub-hero__pinned">
    <canvas class="scrub-hero__canvas" id="scrub-canvas"></canvas>
    <div class="scrub-hero__loading" id="scrub-loading">
      <div class="spinner"></div>
    </div>
    <div class="scrub-hero__overlays" id="scrub-overlays">
      <div class="overlay" data-in="0.0" data-out="0.12" style="top:15%">
        <h2>Product Name</h2>
        <p>The opening statement.</p>
      </div>
      <div class="overlay" data-in="0.3" data-out="0.5" style="bottom:20%;right:10%">
        <h2>Key Feature</h2>
        <p>A detail that appears mid-sequence.</p>
      </div>
      <div class="overlay" data-in="0.75" data-out="0.92" style="bottom:15%">
        <h2>The Finish</h2>
        <p>Final state, call to action.</p>
      </div>
    </div>
  </div>
</section>
<div class="content"><p>Page continues below.</p></div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js"></script>
<script>
gsap.registerPlugin(ScrollTrigger);
// Phases 2-7 inline
</script>
</body>
</html>
```

### Phase 2: Frame URL generation and preloader class

See primitive `image-sequence-scrubbing` for the `SequenceLoader` class. This is the hero-specific wrapper:

```js
const FRAME_COUNT = 90;
const EAGER_BATCH = 12;

function getFrameBaseUrl() {
  const w = window.innerWidth;
  if (w < 640) return '/sequence/mobile';
  if (w < 1200) return '/sequence/tablet';
  return '/sequence/desktop';
}

const urls = Array.from({ length: FRAME_COUNT }, (_, i) =>
  `${getFrameBaseUrl()}/frame_${String(i + 1).padStart(4, '0')}.webp`
);

class SequenceLoader {
  constructor(urls) {
    this.urls = urls;
    this.bitmaps = new Array(urls.length).fill(null);
    this.loading = new Set();
    this.controller = new AbortController();
  }
  async loadIndex(i) {
    if (this.bitmaps[i] || this.loading.has(i)) return this.bitmaps[i];
    this.loading.add(i);
    try {
      const res = await fetch(this.urls[i], { signal: this.controller.signal });
      const blob = await res.blob();
      this.bitmaps[i] = await createImageBitmap(blob);
      return this.bitmaps[i];
    } catch (e) {
      if (e.name !== 'AbortError') console.warn(`Frame ${i} failed:`, e);
      return null;
    } finally {
      this.loading.delete(i);
    }
  }
  async preloadEager(count) {
    await Promise.all(
      Array.from({ length: Math.min(count, this.urls.length) }, (_, i) => this.loadIndex(i))
    );
  }
  streamRemaining(fromIndex, batchSize = 6) {
    const remaining = this.urls
      .map((_, i) => i)
      .filter(i => !this.bitmaps[i] && !this.loading.has(i))
      .sort((a, b) => Math.abs(a - fromIndex) - Math.abs(b - fromIndex));
    let cursor = 0;
    const next = async () => {
      const batch = remaining.slice(cursor, cursor + batchSize);
      cursor += batchSize;
      await Promise.all(batch.map(i => this.loadIndex(i)));
      if (cursor < remaining.length) {
        if ('requestIdleCallback' in window) requestIdleCallback(() => next());
        else setTimeout(next, 16);
      }
    };
    if (remaining.length > 0) next();
  }
  destroy() {
    this.controller.abort();
    this.bitmaps.forEach(b => b?.close());
    this.bitmaps.fill(null);
  }
}

const loader = new SequenceLoader(urls);
```

### Phase 3: Canvas setup with DPR-aware sizing

```js
const canvas = document.getElementById('scrub-canvas');
const ctx = canvas.getContext('2d');
const DPR_CAP = 2;

function sizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
}
sizeCanvas();
window.addEventListener('resize', sizeCanvas);
```

### Phase 4: Draw loop with rAF throttling and nearest-frame fallback

```js
let currentFrame = -1;
let pendingFrame = 0;
let rafScheduled = false;

function drawFrame(index) {
  let bitmap = loader.bitmaps[index];
  // Fallback: find nearest loaded frame
  if (!bitmap) {
    for (let d = 1; d < FRAME_COUNT; d++) {
      if (loader.bitmaps[index - d]) { bitmap = loader.bitmaps[index - d]; break; }
      if (loader.bitmaps[index + d]) { bitmap = loader.bitmaps[index + d]; break; }
    }
  }
  if (!bitmap) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Contain fit: draw centered, preserving aspect ratio
  const bAspect = bitmap.width / bitmap.height;
  const cAspect = canvas.width / canvas.height;
  let dw, dh, dx, dy;
  if (bAspect > cAspect) {
    dw = canvas.width; dh = canvas.width / bAspect;
    dx = 0; dy = (canvas.height - dh) / 2;
  } else {
    dh = canvas.height; dw = canvas.height * bAspect;
    dx = (canvas.width - dw) / 2; dy = 0;
  }
  ctx.drawImage(bitmap, dx, dy, dw, dh);
  currentFrame = index;
}

function scheduleDraw() {
  if (rafScheduled) return;
  rafScheduled = true;
  requestAnimationFrame(() => {
    rafScheduled = false;
    if (pendingFrame !== currentFrame) drawFrame(pendingFrame);
  });
}
```

### Phase 5: Text overlay keyframe system

```js
const overlays = document.querySelectorAll('.overlay');

function updateOverlays(progress) {
  overlays.forEach(el => {
    const inAt = parseFloat(el.dataset.in);
    const outAt = parseFloat(el.dataset.out);
    const visible = progress >= inAt && progress <= outAt;
    el.classList.toggle('visible', visible);
  });
}
```

### Phase 6: ScrollTrigger binding and initialization

```js
const loadingEl = document.getElementById('scrub-loading');
const SCROLL_BUDGET_VH = 400; // 4x viewport height of scroll travel

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

if (!prefersReduced.matches) {
  loader.preloadEager(EAGER_BATCH).then(() => {
    drawFrame(0);
    loadingEl.classList.add('loaded');
    loader.streamRemaining(0);
  });

  ScrollTrigger.create({
    trigger: '#scrub-hero',
    start: 'top top',
    end: `+=${SCROLL_BUDGET_VH}%`,
    pin: true,
    onUpdate: (self) => {
      pendingFrame = Math.min(FRAME_COUNT - 1, Math.floor(self.progress * FRAME_COUNT));
      loader.streamRemaining(pendingFrame);
      scheduleDraw();
      updateOverlays(self.progress);
    },
  });
}
```

### Phase 7: Video fallback alternative

For projects where payload budget is tight, replace the image sequence with a single compressed MP4:

```js
function setupVideoFallback() {
  const video = document.createElement('video');
  video.src = '/sequence/product-reveal.mp4';
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain';
  video.pause();
  document.querySelector('.scrub-hero__pinned').prepend(video);
  canvas.style.display = 'none';
  loadingEl.classList.add('loaded');

  video.addEventListener('loadedmetadata', () => {
    ScrollTrigger.create({
      trigger: '#scrub-hero',
      start: 'top top',
      end: `+=${SCROLL_BUDGET_VH}%`,
      pin: true,
      onUpdate: (self) => {
        requestAnimationFrame(() => {
          video.currentTime = self.progress * video.duration;
        });
        updateOverlays(self.progress);
      },
    });
  });
}
```

### Phase 8: Sliding window memory management

For very long sequences (200+ frames), keep only a window of decoded bitmaps around the current position:

```js
const WINDOW_RADIUS = 30; // keep +/- 30 frames decoded

function enforceWindow(currentIndex) {
  for (let i = 0; i < loader.bitmaps.length; i++) {
    if (loader.bitmaps[i] && Math.abs(i - currentIndex) > WINDOW_RADIUS) {
      loader.bitmaps[i].close();
      loader.bitmaps[i] = null;
    }
  }
}

// Call inside the ScrollTrigger onUpdate, after drawing:
// enforceWindow(pendingFrame);
```

## The full reference implementation

The complete working hero combines Phases 1-6 into a single file. See the phase code blocks above assembled in order. The reference implementation is the phase code integrated into the Phase 1 HTML shell, with `loader.preloadEager()` kicking off in the inline `<script>` block.

Key integration point: the `onUpdate` callback in Phase 6 calls `scheduleDraw()` from Phase 4 and `updateOverlays()` from Phase 5, connecting all systems.

## Tuning the feel

| Parameter | Value | Rationale |
|---|---|---|
| Frame count | 60-150 | 60 for short reveals (product drops into view). 120 for full 360 turntable (3 deg/frame). 150+ only for complex transformations. |
| vh per frame | 3-5vh | Below 2vh: twitchy, oversensitive. Above 8vh: sluggish, scroll does nothing per swipe. |
| Scroll budget | frameCount * vhPerFrame | 90 frames at 4vh = 360vh. Never more than 600vh (user patience limit). |
| Eager batch size | 10-15 | Must cover the first full viewport of scroll travel. 12 frames at 4vh = 48vh, enough for initial interaction. |
| Frame format | WebP q75 | 60-80% smaller than PNG. AVIF is better but decode speed is slower on some devices. |
| Frame resolution | Desktop: 1440x960, Tablet: 960x640, Mobile: 640x420 | Match the maximum canvas display size at 2x DPR. Larger frames waste bandwidth with no visual gain. |
| Streaming batch size | 6 concurrent fetches | HTTP/2 multiplexes well at 6. More than 10 can starve other page resources. |
| DPR cap | 2 | Canvas draw cost scales with pixel count. 3x is 2.25x the cost for no visible gain on product photography. |
| Loading spinner duration | Until eager batch + first draw completes | Do not show the spinner for more than 3 seconds on a fast connection. If the eager batch takes longer, reduce frame resolution or count. |
| Overlay transition | opacity 0.3s, translateY 20px | Fast enough to feel responsive to scroll, slow enough to not flash. |

## Variants

### 1. Horizontal scroll scrub
Replace vertical scroll pinning with a horizontal scroll container. The section becomes `overflow-x: scroll; scroll-snap-type: x mandatory`. Map `scrollLeft / scrollWidth` to frame index. No pinning needed; the user scrolls horizontally through the sequence.

### 2. Parallax text layers over scrub
Text overlays at different Z-depths (CSS `perspective` + `translateZ`) creating parallax text floating over the scrubbed canvas. Combine with `hero-3d-anime-js-render-framework` for the text depth.

### 3. Split-screen scrub + specs
Canvas on the left half, scrolling spec list on the right. The spec list items highlight as the corresponding frame range plays. Good for technical product pages where specs need to match visual states.

### 4. Circular progress indicator
A thin circular arc around a centered product image that fills as the user scrolls, showing how far through the sequence they are. Drawn as a second canvas or SVG overlaid on the main canvas.

### 5. Before/after comparison scrub
Two sequences at the same frame count (e.g., product in two colors). A vertical slider divides the canvas; left half draws from sequence A, right from sequence B, both at the same scroll-driven frame index.

## Performance budget

| Metric | Target | Lever |
|---|---|---|
| Total sequence payload | < 3MB (90 frames desktop) | Reduce frame count. Reduce resolution. Switch to AVIF. Use video fallback. |
| Per-frame decode time | < 3ms | Use `createImageBitmap` (off-thread). Never `new Image()` without `.decode()`. |
| Draw time per frame | < 1ms | `ctx.drawImage(bitmap, ...)` with pre-decoded bitmap. |
| LCP | < 2.5s | Eager batch must complete fast. First frame draws as soon as bitmap 0 is ready, not after all 12. |
| Memory (decoded bitmaps) | < 500MB | Sliding window for 200+ frame sequences. At 1440x960, each bitmap is ~5.5MB decoded. |
| Main thread block | 0ms | All decode via `createImageBitmap` (off-thread). Draw via rAF (single call, not batched). |

**What to cut first:** Reduce frame count from 120 to 60 (6 deg/frame is still smooth for most products). Drop mobile frames to 640x420. Switch from WebP to AVIF. Use video fallback on mobile entirely.

## Accessibility

- `prefers-reduced-motion` hides the canvas, shows text overlays as static content in reading order, and does not load any frames. Zero payload cost.
- The canvas element gets `role="img"` and `aria-label` describing the sequence content (e.g., "360-degree view of the product in matte black").
- Text overlays are real DOM elements, fully accessible. They remain in the document flow for screen readers regardless of visibility state.
- Do NOT gate essential product information (specs, pricing, CTA buttons) behind requiring scroll through the sequence. The sequence is supplementary visual context.
- For keyboard users, the scroll-driven nature means keyboard scrolling (Space, Page Down) works natively. No custom keyboard handling needed.

## Anti-slop rules

1. DO NOT ship frames at full source-render resolution. Resize and compress to the actual maximum display size times capped DPR before export. Oversized frames are the single largest performance mistake.
2. DO NOT block interactivity waiting for all frames. Show a loading skeleton for the eager batch only, stream the rest in the background.
3. DO NOT use PNG for sequences without genuine alpha transparency needs. WebP/AVIF cut payload 60-80%.
4. DO NOT let the scroll budget create dead scroll at the end. If the sequence finishes at 80% of the pinned range, the remaining 20% is the user scrolling through nothing. Recompute vh budget to match frame count.
5. DO NOT draw inside the raw scroll handler. Route through a single `requestAnimationFrame`-scheduled draw function so multiple scroll ticks within one frame collapse into one draw call.
6. DO NOT skip `createImageBitmap` and draw directly from a freshly-created `Image.src`. The first draw of an undecoded image jitters visibly.
7. DO NOT leave decoded bitmaps un-disposed on SPA route change. Call `.close()` on every bitmap and abort in-flight fetches.
8. DO NOT use `cover` fit for the canvas draw. Product reveal sequences have a fixed aspect ratio. `contain` fit preserves it. `cover` crops the product.
9. DO NOT hardcode frame URLs without responsive resolution tiers. A 1440px frame on a 375px mobile screen wastes 70% of the download.
10. DO NOT pin the section without setting the scroll budget mathematically. `end: '+=${frameCount * vhPerFrame}%'` ties the pin duration to the content.

## Integration notes

- **With `lenis-smooth-scroll`:** Lenis applies its own smooth interpolation to scroll. For frame scrubbing, this adds one frame of latency but improves smoothness. No code change needed; GSAP ScrollTrigger reads from Lenis's proxy automatically.
- **With `hero-kinetic-typography`:** Text overlays within this hero can use GSAP SplitText for per-word reveals at specific keyframe moments. Trigger the text animation inside the ScrollTrigger `onUpdate` when progress crosses a threshold.
- **With `sticky-pinning-sequences`:** This toolkit already uses pinning. If other pinned sections follow, ensure they chain correctly (the next section's `start` should be after this section's `end`).
- **Known conflict:** Multiple pinned sections with miscalculated `end` values cause ScrollTrigger to overlap pins, resulting in content disappearing behind pinned layers. Debug with `ScrollTrigger.defaults({ markers: true })`.
- **With `scroll-reveal-choreography`:** Content below the pinned hero can use IntersectionObserver reveals. No conflict.

## Ship checklist

- [ ] Frame count computed from a maximum-visible-jump target, not guessed
- [ ] Eager preload batch covers first-screen scroll distance
- [ ] First frame draws as soon as bitmap 0 is ready (do not wait for entire eager batch)
- [ ] Remaining frames stream in background, prioritized by proximity to current scroll
- [ ] Canvas backing store sized by DPR (capped at 2)
- [ ] Draw calls routed through rAF-scheduled function, never directly from scroll handler
- [ ] Bitmaps disposed (.close()) and fetches aborted on unmount
- [ ] Responsive frame sourcing serves smaller images on mobile
- [ ] Scroll budget (vh) matches frame count: no dead scroll at the end
- [ ] Text overlays appear/disappear at correct progress keyframes
- [ ] Loading skeleton fades out only after first frame is drawn
- [ ] `prefers-reduced-motion` shows static text overlays, loads zero frames
- [ ] `role="img"` and `aria-label` on the canvas element
- [ ] Total sequence payload verified against budget before shipping
- [ ] Nearest-frame fallback draws the closest loaded frame when the exact frame is not yet decoded
