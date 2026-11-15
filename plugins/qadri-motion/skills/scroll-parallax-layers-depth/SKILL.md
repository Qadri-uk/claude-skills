---
name: scroll-parallax-layers-depth
description: Use when building a multi-layer parallax depth section with scroll-driven differential movement, including mobile strategy, vestibular accessibility, and narrative pacing. Builds a complete parallax storytelling section, not just speed-offset layers.
category: scroll
pairs_with: scroll-parallax-layers-depth-eval
---

# Multi-Layer Parallax Depth System

## What this builds
A full narrative scroll section where 3-5 visual layers move at different speeds to create the illusion of depth as the user scrolls. Background layers move slowest, foreground layers move fastest, creating a z-depth separation that reinforces a story beat. The section is wrapped in narrative structure with an entrance, a parallax zone, and an exit, not a standalone effect applied to a background image.

- 3-5 stacked visual layers with explicit depth ratios derived from a model, not guessed
- Scroll-driven `translateY` at different rates per layer (compositor-only, no layout)
- Optional mouse-move parallax layered on top for desktop pointer reactivity
- Mobile strategy: simplified to 1 passive layer or disabled entirely below 768px
- `prefers-reduced-motion` fallback: static layered composition, no motion
- Vestibular safety: maximum layer speed differential capped to prevent motion sickness
- Narrative wrapper: intro beat, parallax zone, exit beat with content text

## When to use / when not to
- Use for brand storytelling sections, editorial features, product showcases, or hero-to-content transitions where depth reinforces the narrative.
- Use when the layers have real visual content (photographs, illustrations, gradients) that benefit from a spatial relationship, not just decorative blobs.
- Do NOT use parallax on body text or interactive controls. Moving text is unreadable; moving buttons are unclickable.
- Do NOT use for dashboards, admin UIs, forms, or any "frequent visit" surface. See primitive `parallax-depth-systems` decision gate.
- Do NOT stack two parallax sections without a static rest section (minimum 100vh) between them. Sequential parallax causes vestibular fatigue.
- For mouse-driven parallax in isolation (no scroll component), see primitive `parallax-depth-systems`. For scroll-pinned sequences, see `sticky-pinning-sequences`. For the full cinematic pipeline, see corpus skill `cinematic-scroll`.

## Stack decision
| Dependency | Version | Why | Cheaper alternative |
|---|---|---|---|
| GSAP | 3.13+ | ScrollTrigger for per-layer scrub with `ease: 'none'`. Handles the scroll-to-translateY mapping cleanly. ~28 KB gzipped. | CSS `animation-timeline: scroll()` with `view()` for per-layer keyframes. No JS, compositor-threaded, but Chrome 115+ only and no pinning. See Phase 7. |
| Lenis (optional) | 1.1+ | Smooth scroll normalization. Not required but prevents the jerkiness of native scroll on Windows trackpads. ~6 KB gzipped. | Skip it. Native scroll is fine on macOS. On Windows, the parallax will feel slightly jerky but functional. |

**Cheapest path:** Pure CSS using `perspective` + `translateZ`. Zero JS, zero dependencies. Works in all browsers. Cannot do mouse-move parallax. See Phase 6.

## Architecture

```
section.parallax-section           (tall container, 250-400vh)
  div.parallax__intro              (entrance beat, 80vh)
  div.parallax__stage              (sticky viewport, 100vh, overflow: hidden)
    div.parallax__layer--bg        (depth: far, speed: 0.2x)
    div.parallax__layer--mid       (depth: mid, speed: 0.5x)
    div.parallax__layer--content   (depth: anchor, speed: 1.0x -- normal scroll)
    div.parallax__layer--fg        (depth: near, speed: 1.3x)
  div.parallax__exit               (exit beat, 80vh)
```

**Depth model:**
The speed ratios are derived from a simple linear depth model, not guessed per layer. Define a "camera" position and each layer's distance from it:

```
speed_ratio = 1 - (layer_distance / max_distance) * damping

Where:
  layer_distance = how far the layer is from the viewer (0 = nearest)
  max_distance = the farthest layer's distance
  damping = 0.8 (how much the farthest layer slows down, 0.8 = moves at 0.2x)
```

| Layer | Distance | Speed ratio | translateY range |
|---|---|---|---|
| Foreground (fg) | 0 | 1.3x | +30% of scroll |
| Content (anchor) | 1 | 1.0x | 0 (normal scroll) |
| Midground (mid) | 3 | 0.5x | -50% of scroll |
| Background (bg) | 5 | 0.2x | -80% of scroll |

**Lifecycle:**
1. **Intro beat:** Text content fades in. Parallax layers are visible but not yet moving (section has not reached the parallax zone).
2. **Parallax zone:** Stage is sticky. Layers translate at their respective speeds. Content layer scrolls normally within the stage.
3. **Exit beat:** Parallax layers settle. Exit text fades in. Stage unpins.
4. **Mouse-move (desktop only):** Layers shift laterally in response to cursor position, layered on top of the scroll movement.
5. **Reduced motion:** All layers static at their default position. No scroll movement, no mouse reactivity.

## Build it: step by step

### Phase 1: HTML structure

```html
<section class="parallax-section" aria-label="Product story">
  <div class="parallax__intro">
    <h2 class="parallax__heading">Built for the real world</h2>
    <p class="parallax__subtext">Not a lab. Not a benchmark. The places your code actually runs.</p>
  </div>

  <div class="parallax__stage" id="parallax-stage">
    <div class="parallax__layer parallax__layer--bg" data-speed="0.2" aria-hidden="true">
      <img src="bg-mountains.jpg" alt="" loading="lazy" />
    </div>

    <div class="parallax__layer parallax__layer--mid" data-speed="0.5" aria-hidden="true">
      <img src="mid-trees.png" alt="" loading="lazy" />
    </div>

    <div class="parallax__layer parallax__layer--content" data-speed="1.0">
      <div class="parallax__content-block">
        <h3>99.99% uptime</h3>
        <p>Across 14 regions, measured over the last 12 months.</p>
      </div>
    </div>

    <div class="parallax__layer parallax__layer--fg" data-speed="1.3" aria-hidden="true">
      <img src="fg-leaves.png" alt="" loading="lazy" />
    </div>
  </div>

  <div class="parallax__exit">
    <p class="parallax__subtext">Every deployment. Every region. Every time.</p>
  </div>
</section>
```

### Phase 2: CSS layout

```css
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --parallax-max-shift: 80px;   /* max translateY range for the bg layer */
  --parallax-mouse-range: 30px; /* max lateral shift from mouse */
}

.parallax-section {
  position: relative;
}

.parallax__intro,
.parallax__exit {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
  flex-direction: column;
}

.parallax__heading {
  font-size: clamp(1.5rem, 4vw, 3rem);
  font-weight: 700;
  margin-bottom: 0.75rem;
}

.parallax__subtext {
  font-size: clamp(0.95rem, 1.5vw, 1.25rem);
  opacity: 0.7;
  line-height: 1.6;
  max-width: 32rem;
}

/* --- Stage --- */
.parallax__stage {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
}

.parallax__layer {
  position: absolute;
  inset: -10%; /* oversized to prevent edge reveal during movement */
  will-change: transform;
}

.parallax__layer img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.parallax__layer--content {
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.parallax__content-block {
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: clamp(2rem, 4vw, 4rem);
  border-radius: 12px;
  max-width: 560px;
  text-align: center;
  color: #fff;
}

.parallax__content-block h3 {
  font-size: clamp(1.5rem, 3vw, 2.5rem);
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.parallax__content-block p {
  font-size: clamp(0.9rem, 1.3vw, 1.1rem);
  opacity: 0.8;
  line-height: 1.6;
}

/* --- Layer z-order --- */
.parallax__layer--bg { z-index: 0; }
.parallax__layer--mid { z-index: 1; }
.parallax__layer--fg { z-index: 3; }

/* --- Mobile: disable parallax --- */
@media (max-width: 767px) {
  .parallax__layer {
    inset: 0;
    transform: none !important;
  }
  .parallax__stage {
    position: relative;
    height: auto;
    min-height: 80vh;
  }
}

/* --- Reduced motion --- */
@media (prefers-reduced-motion: reduce) {
  .parallax__layer {
    transform: none !important;
    inset: 0;
  }
  .parallax__stage {
    position: relative;
    height: auto;
    min-height: 80vh;
  }
}
```

### Phase 3: Depth ratio calculator

```js
// Derive speed ratios from a depth model instead of guessing per-layer
function buildDepthModel(layers) {
  // layers: [{ selector, distance }] where distance is 0 (nearest) to N (farthest)
  const maxDist = Math.max(...layers.map(l => l.distance));
  const DAMPING = 0.8; // farthest layer moves at (1 - DAMPING) = 0.2x

  return layers.map(l => {
    const normalizedDist = l.distance / maxDist; // 0 to 1
    const speed = 1 - normalizedDist * DAMPING;  // 1.0 to 0.2
    return { ...l, speed };
  });
}

const depthModel = buildDepthModel([
  { selector: '.parallax__layer--fg',      distance: 0 },
  { selector: '.parallax__layer--content', distance: 1 },
  { selector: '.parallax__layer--mid',     distance: 3 },
  { selector: '.parallax__layer--bg',      distance: 5 },
]);

// Result:
// fg:      speed 1.0   (anchor, or 1.3 if foreground moves faster)
// content: speed 0.84
// mid:     speed 0.52
// bg:      speed 0.20
```

### Phase 4: GSAP ScrollTrigger wiring

```js
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const isMobile = window.matchMedia('(max-width: 767px)');

if (!prefersReduced.matches && !isMobile.matches) {
  initParallax();
}

function initParallax() {
  const section = document.querySelector('.parallax-section');
  const stage = document.getElementById('parallax-stage');

  // Total scroll budget
  const BUDGET_VH = 300;
  section.style.height = `${BUDGET_VH}vh`;

  // Per-layer scroll animation
  const layerConfigs = [
    { selector: '.parallax__layer--bg',  yRange: -80 },  // moves up 80px (slow)
    { selector: '.parallax__layer--mid', yRange: -40 },  // moves up 40px
    { selector: '.parallax__layer--fg',  yRange: 30 },   // moves down 30px (fast)
  ];

  layerConfigs.forEach(({ selector, yRange }) => {
    const layer = document.querySelector(selector);
    if (!layer) return;

    gsap.to(layer, {
      y: yRange,
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  });

  // Intro text animation
  gsap.from('.parallax__intro', {
    opacity: 0,
    y: 40,
    scrollTrigger: {
      trigger: '.parallax__intro',
      start: 'top 80%',
      end: 'top 30%',
      scrub: 0.3,
    },
  });

  // Exit text animation
  gsap.from('.parallax__exit', {
    opacity: 0,
    y: 40,
    scrollTrigger: {
      trigger: '.parallax__exit',
      start: 'top 80%',
      end: 'top 40%',
      scrub: 0.3,
    },
  });

  // Content block parallax (slightly slower than scroll for a "floating" feel)
  gsap.to('.parallax__content-block', {
    y: -20,
    ease: 'none',
    scrollTrigger: {
      trigger: section,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    },
  });
}
```

### Phase 5: Mouse-move parallax (desktop only)

```js
function initMouseParallax() {
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
  if (!hasFinePointer) return;

  const stage = document.getElementById('parallax-stage');
  const layers = stage.querySelectorAll('.parallax__layer');

  // gsap.quickTo for high-frequency updates without tween pileup
  const layerQuickTo = Array.from(layers).map((layer, i) => {
    const depth = parseFloat(layer.dataset.speed) || 1;
    const range = (1 - depth) * 30; // deeper layers move more
    return {
      x: gsap.quickTo(layer, 'x', { duration: 0.6, ease: 'power3' }),
      y: gsap.quickTo(layer, 'y', { duration: 0.6, ease: 'power3' }),
      range,
    };
  });

  stage.addEventListener('pointermove', (e) => {
    const rect = stage.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5;

    layerQuickTo.forEach(({ x, y, range }) => {
      x(px * range);
      // y is additive to the scroll-driven translateY
      // gsap.quickTo handles composition automatically
    });
  });

  stage.addEventListener('pointerleave', () => {
    layerQuickTo.forEach(({ x, y }) => {
      x(0);
    });
  });
}

// Only init mouse parallax on desktop with fine pointer
if (window.matchMedia('(pointer: fine) and (min-width: 768px)').matches) {
  initMouseParallax();
}
```

### Phase 6: Pure CSS parallax (zero JS)

For projects that cannot take any JS dependency:

```css
.parallax__stage {
  perspective: 1px;
  perspective-origin: center center;
  overflow-x: hidden;
  overflow-y: auto;
  height: 100vh;
}

.parallax__layer--bg {
  transform: translateZ(-4px) scale(5);
  /* scale = 1 + (|translateZ| / perspective) = 1 + 4/1 = 5 */
}

.parallax__layer--mid {
  transform: translateZ(-2px) scale(3);
}

.parallax__layer--content {
  transform: translateZ(0);
}

.parallax__layer--fg {
  transform: translateZ(1px) scale(0.5);
  /* Foreground: negative scale compensation? No.
     For Z > 0 (in front of perspective plane): scale = 1 / (1 + Z/perspective)
     At Z=1, perspective=1: scale = 0.5 */
  pointer-events: none; /* foreground is decorative, must not block clicks */
}
```

**Limitation:** The parallax container must be its own scroll container, not the page. This means the section needs `overflow-y: auto` and its own scrollbar, which breaks page-level scroll. Only use this for a standalone full-page parallax effect, not embedded in a longer narrative page.

### Phase 7: CSS Scroll-Driven Animations (no pin)

```css
@supports (animation-timeline: scroll()) {
  .parallax__layer--bg {
    animation: parallax-bg linear both;
    animation-timeline: view();
    animation-range: entry 0% exit 100%;
  }

  @keyframes parallax-bg {
    from { transform: translateY(40px); }
    to   { transform: translateY(-40px); }
  }

  .parallax__layer--mid {
    animation: parallax-mid linear both;
    animation-timeline: view();
    animation-range: entry 0% exit 100%;
  }

  @keyframes parallax-mid {
    from { transform: translateY(20px); }
    to   { transform: translateY(-20px); }
  }

  .parallax__layer--fg {
    animation: parallax-fg linear both;
    animation-timeline: view();
    animation-range: entry 0% exit 100%;
  }

  @keyframes parallax-fg {
    from { transform: translateY(-15px); }
    to   { transform: translateY(15px); }
  }
}
```

### Phase 8: Device orientation fallback (mobile tilt)

```js
async function enableTiltParallax() {
  if (typeof DeviceOrientationEvent === 'undefined') return;

  // iOS 13+ requires permission from a user gesture
  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    // Must be called from a click handler
    const btn = document.createElement('button');
    btn.textContent = 'Enable motion effects';
    btn.className = 'parallax__tilt-btn';
    document.querySelector('.parallax__stage').appendChild(btn);

    btn.addEventListener('click', async () => {
      const perm = await DeviceOrientationEvent.requestPermission();
      if (perm === 'granted') {
        btn.remove();
        attachTiltListener();
      }
    });
    return;
  }

  attachTiltListener();
}

function attachTiltListener() {
  const layers = document.querySelectorAll('.parallax__layer');

  window.addEventListener('deviceorientation', (e) => {
    const tiltX = gsap.utils.clamp(-20, 20, e.gamma || 0) / 20; // -1 to 1
    const tiltY = gsap.utils.clamp(-20, 20, (e.beta || 0) - 45) / 20;

    layers.forEach((layer) => {
      const speed = parseFloat(layer.dataset.speed) || 1;
      const range = (1 - speed) * 15;
      gsap.set(layer, {
        x: tiltX * range,
      });
    });
  });
}
```

## The full reference implementation

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Parallax Depth</title>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js"></script>
<style>
  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
  body{background:#0a0a0a;color:#f0f0f0;font-family:system-ui,-apple-system,sans-serif}

  .parallax-section{position:relative;height:300vh}
  .parallax__intro,.parallax__exit{
    min-height:80vh;display:flex;align-items:center;justify-content:center;
    text-align:center;padding:2rem;flex-direction:column;
  }
  .parallax__heading{font-size:clamp(1.5rem,4vw,3rem);font-weight:700;margin-bottom:0.75rem}
  .parallax__subtext{font-size:clamp(0.95rem,1.5vw,1.25rem);opacity:0.7;line-height:1.6;max-width:32rem}

  .parallax__stage{position:sticky;top:0;height:100vh;overflow:hidden}
  .parallax__layer{position:absolute;inset:-10%;will-change:transform}
  .parallax__layer img{width:100%;height:100%;object-fit:cover}
  .parallax__layer--bg{z-index:0}
  .parallax__layer--mid{z-index:1}
  .parallax__layer--content{inset:0;display:flex;align-items:center;justify-content:center;z-index:2}
  .parallax__layer--fg{z-index:3;pointer-events:none}

  .parallax__content-block{
    background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
    padding:clamp(2rem,4vw,4rem);border-radius:12px;max-width:560px;text-align:center;color:#fff;
  }
  .parallax__content-block h3{font-size:clamp(1.5rem,3vw,2.5rem);font-weight:700;margin-bottom:0.5rem}
  .parallax__content-block p{font-size:clamp(0.9rem,1.3vw,1.1rem);opacity:0.8;line-height:1.6}

  @media(max-width:767px){
    .parallax__layer{inset:0;transform:none!important}
    .parallax__stage{position:relative;height:auto;min-height:80vh}
    .parallax-section{height:auto}
  }
  @media(prefers-reduced-motion:reduce){
    .parallax__layer{transform:none!important;inset:0}
    .parallax__stage{position:relative;height:auto;min-height:80vh}
    .parallax-section{height:auto}
  }
</style>
</head>
<body>
<section class="parallax-section" aria-label="Product story">
  <div class="parallax__intro">
    <h2 class="parallax__heading">Built for the real world</h2>
    <p class="parallax__subtext">Not a lab. Not a benchmark. The places your code actually runs.</p>
  </div>
  <div class="parallax__stage" id="parallax-stage">
    <div class="parallax__layer parallax__layer--bg" data-speed="0.2" aria-hidden="true">
      <div style="width:100%;height:100%;background:linear-gradient(180deg,#1a1a3e,#0a0a1e)"></div>
    </div>
    <div class="parallax__layer parallax__layer--mid" data-speed="0.5" aria-hidden="true">
      <div style="width:100%;height:100%;background:radial-gradient(ellipse at 50% 80%,rgba(40,80,180,0.3),transparent 70%)"></div>
    </div>
    <div class="parallax__layer parallax__layer--content" data-speed="1.0">
      <div class="parallax__content-block">
        <h3>99.99% uptime</h3>
        <p>Across 14 regions, measured over the last 12 months.</p>
      </div>
    </div>
    <div class="parallax__layer parallax__layer--fg" data-speed="1.3" aria-hidden="true">
      <div style="width:100%;height:100%;background:radial-gradient(circle at 30% 20%,rgba(255,255,255,0.05),transparent 40%)"></div>
    </div>
  </div>
  <div class="parallax__exit">
    <p class="parallax__subtext">Every deployment. Every region. Every time.</p>
  </div>
</section>
<script>
gsap.registerPlugin(ScrollTrigger);
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
const isMobile = window.matchMedia('(max-width: 767px)');
if (!prefersReduced.matches && !isMobile.matches) {
  const section = document.querySelector('.parallax-section');
  const layers = [
    { sel: '.parallax__layer--bg', yRange: -80 },
    { sel: '.parallax__layer--mid', yRange: -40 },
    { sel: '.parallax__layer--fg', yRange: 30 },
  ];
  layers.forEach(({ sel, yRange }) => {
    gsap.to(sel, { y: yRange, ease: 'none', scrollTrigger: {
      trigger: section, start: 'top bottom', end: 'bottom top', scrub: true
    }});
  });
  gsap.from('.parallax__intro', { opacity: 0, y: 40, scrollTrigger: {
    trigger: '.parallax__intro', start: 'top 80%', end: 'top 30%', scrub: 0.3
  }});
  gsap.from('.parallax__exit', { opacity: 0, y: 40, scrollTrigger: {
    trigger: '.parallax__exit', start: 'top 80%', end: 'top 40%', scrub: 0.3
  }});
  gsap.to('.parallax__content-block', { y: -20, ease: 'none', scrollTrigger: {
    trigger: section, start: 'top bottom', end: 'bottom top', scrub: true
  }});
  // Mouse parallax (desktop fine pointer only)
  if (window.matchMedia('(pointer: fine)').matches) {
    const stage = document.getElementById('parallax-stage');
    const allLayers = stage.querySelectorAll('.parallax__layer');
    const quickMoves = Array.from(allLayers).map(l => ({
      x: gsap.quickTo(l, 'x', { duration: 0.6, ease: 'power3' }),
      range: (1 - (parseFloat(l.dataset.speed) || 1)) * 30,
    }));
    stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      quickMoves.forEach(({ x, range }) => x(px * range));
    });
    stage.addEventListener('pointerleave', () => {
      quickMoves.forEach(({ x }) => x(0));
    });
  }
}
</script>
</body>
</html>
```

## Tuning the feel

| Parameter | Value | Why |
|---|---|---|
| Background speed | 0.2x scroll | Far enough from 1.0 to create obvious depth, slow enough to not fly around. Below 0.1x the layer barely moves. |
| Midground speed | 0.5x scroll | Midpoint of the depth range. Perceptible differential from both bg and content. |
| Foreground speed | 1.3x scroll | Slightly faster than scroll. Creates a "nearer than the page" effect. Above 1.5x it starts feeling disconnected. |
| Max translateY range | 80px for bg, 40px for mid, 30px for fg | These are the total travel distances over the full scroll range. Larger values (150px+) reveal layer edges even with the 10% inset oversize. |
| Layer oversize | inset: -10% | Prevents edge reveal during movement. At 80px max travel on a 900px viewport, 10% (90px) provides just enough buffer. |
| Mouse-move range | 30px max lateral shift | Enough to feel reactive without making the scene jump around. Above 50px on desktop the layers visibly detach from the page. |
| quickTo duration | 0.6s with power3 ease | Responsive follow without jitter. Below 0.3s the layers twitch on micro-movements. Above 1s they feel disconnected from the cursor. |
| Scroll budget | 250-350vh | The parallax zone needs at least 150vh to "read" as depth, plus intro/exit beats. Under 200vh the effect barely registers. Over 400vh the section drags. |

## Variants

### 1. Horizontal parallax
Layers translate on the X axis instead of Y. Good for timeline sections or panoramic reveals. Use `translateX` with the same speed ratios.

### 2. Scale-based depth (zoom parallax)
Instead of Y translation, layers scale at different rates. Background scales up slowly (zoom in), foreground scales down (zoom out). Creates a "flying through" or "tunnel" effect. Use sparingly, triggers zoom fatigue.

### 3. Color shift parallax
No image layers. Background color, gradient stops, and opacity of abstract shapes move at different speeds. Cheaper than images, works for brands without photography.

### 4. Text parallax
Multiple text elements at different depth layers. Use only for large display type (headlines, numbers, pull quotes). Never for body text. Each text layer needs a semi-transparent background for readability at all scroll positions.

### 5. Sticky content + parallax background
Content text is sticky-pinned while background layers parallax behind it. Combines `sticky-pinning-sequences` with parallax. The text is the anchor; the world moves around it.

## Performance budget
| Target | Value |
|---|---|
| Frame time during scroll | < 8ms |
| Animated properties | Only `transform` (translateY, translateX, scale) per layer. No opacity animation on layers during scroll (costs a composite). |
| Compositor layers | 4-6 (one per parallax layer + stage + foreground). Each costs GPU memory. |
| GPU memory per layer (1440x900, 2x DPR) | ~10 MB per full-viewport composited layer. 4 layers = ~40 MB. |
| Image payload | < 200 KB per layer image (AVIF/WebP). Total section < 600 KB. |
| Layer count cap | 5 maximum. Beyond 5, diminishing visual returns and GPU pressure rises. |
| will-change | Set on layers during parallax zone, removed when section is off-screen. Use ScrollTrigger onEnter/onLeave to toggle. |

## Accessibility
- Decorative layers (bg, mid, fg) have `aria-hidden="true"`. Only the content layer's text is in the accessibility tree.
- `prefers-reduced-motion: reduce` disables all movement. Layers render at their static default positions. The section collapses to natural height.
- Mobile < 768px disables parallax entirely. The stage becomes a static composition.
- The content block maintains 4.5:1 contrast ratio against the backdrop-filter background at all scroll positions. Test at multiple scroll positions, not just the starting state.
- No `background-attachment: fixed` anywhere. It causes juddering on iOS Safari and is unnecessary with the translateY approach.
- If using device orientation parallax, the permission prompt must be triggered by a user gesture (button click), never automatically on page load.

## Anti-slop rules
1. DO NOT assign speed ratios by "looks about right" without a depth model. Use the ratio calculator so ratios are internally consistent as you add or adjust layers.
2. DO NOT animate `top`, `left`, `margin`, or `background-position` for layer movement. Only `transform`. Layout properties trigger recalculation on every frame across all layers.
3. DO NOT use `background-attachment: fixed`. It does not work on iOS Safari and causes visible juddering on other mobile browsers. Use `translateY` driven by scroll.
4. DO NOT leave mouse-move parallax listeners active on touch devices. Gate behind `(pointer: fine)`. A dead mousemove listener on mobile wastes nothing, but a tilt listener without permission wastes battery.
5. DO NOT size layers at exactly 100% of the container. Use `inset: -10%` or equivalent oversize so that layer edges never become visible during movement.
6. DO NOT place readable body text or interactive controls inside a moving parallax layer. Text on a moving background is unreadable; buttons on a moving layer are unclickable.
7. DO NOT stack two parallax sections without a static rest section (100vh minimum) between them. Sequential parallax causes vestibular fatigue.
8. DO NOT exceed 5 depth layers. Each layer is a GPU-composited surface. 5+ layers consume 50+ MB of texture memory and offer no visual improvement over 4.
9. DO NOT combine scroll-driven and mouse-driven parallax on the same axis without composing the transforms. Two independent handlers overwriting `transform` on the same element will fight each other. Use CSS custom properties or `gsap.quickTo` which composes automatically.
10. DO NOT skip the `prefers-reduced-motion` check. Parallax is a documented vestibular trigger. This is a correctness requirement, not polish.

## Integration notes
- Pairs with `lenis-smooth-scroll` for normalized scroll input. Wire `lenis.on('scroll', ScrollTrigger.update)` and `gsap.ticker.add(t => lenis.raf(t * 1000))`.
- Pairs with `scroll-progress-indicators` for showing section position.
- Pairs with `scroll-reveal-choreography` for animating the content block as it enters view.
- Conflicts with CSS `perspective` + `translateZ` parallax if both are applied to the same container. Pick one approach.
- Conflicts with `horizontal-scroll-gallery` if a parallax section contains a horizontal scroll track. The horizontal track's own scroll events can interfere with the parallax scroll mapping.
- The primitive `parallax-depth-systems` covers the depth math and mouse-move recipes in isolation. This toolkit builds the complete narrative section on top of those primitives.

## Ship checklist
- [ ] Speed ratios derived from an explicit depth model, not guessed independently
- [ ] Only `transform` properties animated across all layers
- [ ] Layers oversized by at least 10% to prevent edge reveal
- [ ] Decorative layers have `aria-hidden="true"`
- [ ] Content block maintains 4.5:1 contrast at all scroll positions
- [ ] Mouse-move parallax gated behind `(pointer: fine)`
- [ ] `prefers-reduced-motion` disables all movement and collapses section to static
- [ ] Mobile < 768px disables parallax entirely
- [ ] No `background-attachment: fixed` anywhere
- [ ] No two parallax sections back-to-back without a static rest section
- [ ] Total section scroll budget is 250-350vh
- [ ] `will-change` toggled on/off based on section visibility
- [ ] Images served as AVIF/WebP, under 200 KB each
