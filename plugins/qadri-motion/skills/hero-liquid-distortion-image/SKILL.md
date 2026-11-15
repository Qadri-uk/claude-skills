---
name: hero-liquid-distortion-image
description: Use when building a full-viewport hero where one or more images warp, ripple, and split into RGB channels driven by pointer velocity and scroll position. Builds a complete liquid-distortion image hero section.
category: hero
pairs_with: hero-liquid-distortion-image-eval
---

# Liquid Distortion Image Hero

## What this builds
A full-viewport hero section where a photographic or editorial image is rendered onto a WebGL plane and displaced in real time by pointer movement and velocity. The displacement map warps pixels outward from the cursor, RGB channels separate based on movement speed, and the effect settles back to a clean image at rest. A scroll-driven intensity fade transitions the hero into the next section.

- Full-viewport image rendered as a WebGL quad covering the hero container.
- Displacement map-driven per-pixel warp that follows the pointer with damped lerp.
- RGB channel splitting (chromatic aberration) whose magnitude scales with pointer velocity.
- Scroll-linked intensity decay so the effect fades as the user scrolls past the hero.
- Idle ripple pulse that keeps the image subtly alive when the pointer is not moving.
- Graceful fallback to a static `<img>` when WebGL is unavailable or `prefers-reduced-motion` is active.

## When to use / when not to
- Use when the hero image IS the brand moment and you want tactile, cursor-driven interaction.
- Use when the design calls for liquid, organic distortion rather than geometric animation.
- Do NOT use for text-heavy heroes where the distortion would fight readability. See `hero-minimal-swiss-type` instead.
- Do NOT use when the hero has multiple interactive elements (buttons, forms) layered over the image. WebGL captures pointer events and conflicts with DOM interaction layers.
- Do NOT use when the project cannot take a WebGL dependency. See `hero-masked-video-type` for a CSS-only alternative.
- For full-page background shaders without an image, see `glsl-fragment-backgrounds`.
- For displacement as a transition between two images (portfolio/slider), see the `liquid-displacement-effects` primitive directly.

## Stack decision
| Dependency | Version | Why | Cheaper alternative |
|---|---|---|---|
| OGL | 1.0.8 | 12 KB gzipped, minimal WebGL abstraction, includes Renderer/Program/Mesh/Texture/Plane out of the box. Lighter than Three.js (~150 KB) for a single-quad effect. | Raw WebGL (~80 lines of boilerplate for the same quad, no abstraction for textures/programs). |
| GSAP + ScrollTrigger | 3.12 | Scroll-scrubbed intensity decay. ScrollTrigger handles start/end/scrub without manual IntersectionObserver math. | CSS Scroll-Driven Animations for the fade, but you lose precise scrub-to-uniform binding. |
| Lenis | 1.1 | Smooth scroll normalization. Only needed if the rest of the page uses Lenis. Omit if this hero is standalone. | Native scroll. |

OGL over Three.js: this effect is a single fullscreen quad with a fragment shader. Three.js's scene graph, lights, cameras, and material system are dead weight. OGL exposes just enough (Renderer, Program, Mesh, Texture, Plane geometry) to set up the quad and bind uniforms, at 1/10 the bundle size.

## Architecture
```
hero-liquid-distortion/
  index.html           -- semantic hero markup with <img> fallback
  style.css            -- hero layout, fullscreen canvas, fallback styles
  distortion.js        -- OGL setup, shader program, animation loop
  shaders/
    distortion.vert    -- passthrough vertex shader
    distortion.frag    -- displacement + RGB split fragment shader
  assets/
    hero.jpg           -- source image (2048x1365 max, AVIF preferred)
    displacement.jpg   -- grayscale displacement map (256x256 or 512x512)
```

### Lifecycle
1. **Init**: Create OGL Renderer, attach canvas to `.hero` container. Load hero image and displacement map as textures.
2. **Pointer tracking**: `pointermove` listener normalizes cursor to 0-1 UV space. A per-frame lerp smooths raw position toward the target at factor 0.06.
3. **Velocity computation**: Delta between current and previous smoothed position, clamped to 0-0.12. Drives RGB split magnitude.
4. **Render loop**: `requestAnimationFrame`. Each frame: update uniforms (mouse position, velocity, time, scroll intensity), draw the quad.
5. **Scroll binding**: GSAP ScrollTrigger scrubs a `uScrollFade` uniform from 1.0 (full effect) to 0.0 (no effect) as the hero scrolls out of view.
6. **Resize**: `ResizeObserver` on the hero container. Recalculate renderer size, update `uResolution` uniform, maintain aspect ratio cover.
7. **Teardown**: On route change or unmount, cancel RAF, destroy renderer context, remove listeners.

```
  ┌─────────────────────────────────────────────┐
  │  .hero  (position: relative; height: 100vh) │
  │  ┌───────────────────────────────────────┐   │
  │  │  <canvas>  (OGL renderer, z-index: 1) │   │
  │  └───────────────────────────────────────┘   │
  │  ┌───────────────────────────────────────┐   │
  │  │  <img>  (fallback, z-index: 0)        │   │
  │  └───────────────────────────────────────┘   │
  │  ┌───────────────────────────────────────┐   │
  │  │  .hero-content (z-index: 2, pointer)  │   │
  │  │    h1, subtitle, CTA                  │   │
  │  └───────────────────────────────────────┘   │
  └─────────────────────────────────────────────┘
```

## Build it: step by step

### Phase 1: Semantic HTML with static fallback
The hero works without JS. The `<img>` is the LCP element. The canvas overlays it only when WebGL initializes.

```html
<section class="hero" id="hero">
  <img
    class="hero-fallback"
    src="/assets/hero.avif"
    alt="Editorial portrait with liquid distortion effect"
    width="2048"
    height="1365"
    fetchpriority="high"
    decoding="async"
  />
  <div class="hero-content">
    <h1 class="hero-title">Liquid</h1>
    <p class="hero-subtitle">Pointer-driven image distortion</p>
    <a href="#work" class="hero-cta">View work</a>
  </div>
</section>
```

### Phase 2: Layout CSS
Canvas fills the hero absolutely. Fallback image covers the same space. Content sits on top with `pointer-events: none` on the canvas so CTAs remain clickable.

```css
.hero {
  position: relative;
  width: 100%;
  height: 100svh;
  overflow: hidden;
  background: #0a0a0a;
}

.hero canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  pointer-events: auto;
}

.hero-fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}

.hero.webgl-active .hero-fallback {
  opacity: 0;
}

.hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: clamp(2rem, 5vw, 6rem);
  height: 100%;
  pointer-events: none;
}

.hero-content a,
.hero-content button {
  pointer-events: auto;
}

.hero-title {
  font-size: clamp(3rem, 10vw, 12rem);
  font-weight: 700;
  line-height: 0.9;
  color: #fff;
  mix-blend-mode: difference;
}

@media (prefers-reduced-motion: reduce) {
  .hero canvas { display: none; }
  .hero.webgl-active .hero-fallback { opacity: 1; }
}
```

### Phase 3: Vertex shader
Passthrough. Passes UV coordinates to the fragment shader.

```glsl
attribute vec3 position;
attribute vec2 uv;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
```

### Phase 4: Fragment shader
The core effect. Samples the displacement map at the cursor-relative UV, uses the grayscale value to offset the source image lookup. RGB channels are sampled at three slightly different offsets scaled by velocity.

```glsl
precision highp float;

uniform sampler2D uImage;
uniform sampler2D uDisplacement;
uniform vec2 uMouse;
uniform float uVelocity;
uniform float uScale;
uniform float uScrollFade;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uImageSize;

varying vec2 vUv;

vec2 coverUv(vec2 uv, vec2 texSize, vec2 screenSize) {
  vec2 screenRatio = vec2(screenSize.x / screenSize.y, 1.0);
  vec2 texRatio = vec2(texSize.x / texSize.y, 1.0);
  vec2 scale = screenRatio / texRatio;
  if (scale.x < scale.y) {
    scale = vec2(1.0, texRatio.x / screenRatio.x);
  } else {
    scale = vec2(screenRatio.x / texRatio.x, 1.0);
  }
  return (uv - 0.5) * scale + 0.5;
}

void main() {
  vec2 uv = coverUv(vUv, uImageSize, uResolution);

  // Distance from cursor, used to localize the effect
  float dist = distance(vUv, uMouse);
  float radius = 0.35;
  float strength = smoothstep(radius, 0.0, dist);

  // Sample displacement map centered on cursor
  vec2 dispUv = vUv + (uMouse - 0.5) * 0.1;
  float disp = texture2D(uDisplacement, dispUv).r;
  disp = (disp - 0.5) * 2.0; // remap to -1..1

  // Displacement offset scaled by proximity, overall scale, and scroll fade
  float effectScale = uScale * strength * uScrollFade;
  vec2 offset = vec2(disp * 0.04, disp * 0.02) * effectScale;

  // Idle ripple when cursor is inactive
  float idleRipple = sin(uTime * 1.5 + vUv.x * 8.0) * 0.002;
  offset += vec2(idleRipple, idleRipple * 0.6) * uScrollFade;

  // RGB split based on velocity
  float rgbShift = uVelocity * 0.015 * uScrollFade;
  vec2 uvR = uv + offset + vec2(rgbShift, 0.0);
  vec2 uvG = uv + offset;
  vec2 uvB = uv + offset - vec2(rgbShift, 0.0);

  float r = texture2D(uImage, clamp(uvR, 0.0, 1.0)).r;
  float g = texture2D(uImage, clamp(uvG, 0.0, 1.0)).g;
  float b = texture2D(uImage, clamp(uvB, 0.0, 1.0)).b;

  gl_FragColor = vec4(r, g, b, 1.0);
}
```

### Phase 5: OGL renderer setup
Create the renderer, load textures, build the mesh, and start the loop.

```js
import { Renderer, Program, Mesh, Texture, Plane } from 'ogl';

export function createDistortionHero(container) {
  // --- Renderer ---
  const renderer = new Renderer({
    alpha: true,
    dpr: Math.min(window.devicePixelRatio, 2),
  });
  const gl = renderer.gl;
  container.appendChild(gl.canvas);

  // --- Textures ---
  const imgTexture = new Texture(gl, { generateMipmaps: false });
  const dispTexture = new Texture(gl, { generateMipmaps: false });

  const imgEl = new Image();
  imgEl.crossOrigin = 'anonymous';
  imgEl.src = container.querySelector('.hero-fallback').src;
  imgEl.onload = () => {
    imgTexture.image = imgEl;
    program.uniforms.uImageSize.value = [imgEl.naturalWidth, imgEl.naturalHeight];
  };

  const dispEl = new Image();
  dispEl.crossOrigin = 'anonymous';
  dispEl.src = '/assets/displacement.jpg';
  dispEl.onload = () => { dispTexture.image = dispEl; };

  // --- Geometry & Program ---
  const geometry = new Plane(gl, { widthSegments: 1, heightSegments: 1 });
  const program = new Program(gl, {
    vertex: VERTEX_SHADER_SOURCE,
    fragment: FRAGMENT_SHADER_SOURCE,
    uniforms: {
      uImage: { value: imgTexture },
      uDisplacement: { value: dispTexture },
      uMouse: { value: [0.5, 0.5] },
      uVelocity: { value: 0 },
      uScale: { value: 1.0 },
      uScrollFade: { value: 1.0 },
      uTime: { value: 0 },
      uResolution: { value: [gl.canvas.width, gl.canvas.height] },
      uImageSize: { value: [1, 1] },
    },
  });
  const mesh = new Mesh(gl, { geometry, program });

  // Mark WebGL as active, hide fallback
  container.classList.add('webgl-active');

  return { renderer, gl, program, mesh };
}
```

### Phase 6: Pointer tracking with velocity
Raw pointer position is lerped toward a target each frame. Velocity is the magnitude of the per-frame delta, clamped and smoothed.

```js
export function createPointerTracker(container) {
  const target = { x: 0.5, y: 0.5 };
  const current = { x: 0.5, y: 0.5 };
  const prev = { x: 0.5, y: 0.5 };
  let velocity = 0;

  function onPointerMove(e) {
    const rect = container.getBoundingClientRect();
    target.x = (e.clientX - rect.left) / rect.width;
    target.y = 1.0 - (e.clientY - rect.top) / rect.height; // flip Y for GL
  }

  container.addEventListener('pointermove', onPointerMove, { passive: true });

  function update(lerpFactor = 0.06) {
    prev.x = current.x;
    prev.y = current.y;

    current.x += (target.x - current.x) * lerpFactor;
    current.y += (target.y - current.y) * lerpFactor;

    const dx = current.x - prev.x;
    const dy = current.y - prev.y;
    const rawVelocity = Math.sqrt(dx * dx + dy * dy);

    // Smooth velocity with a slower lerp
    velocity += (Math.min(rawVelocity, 0.12) - velocity) * 0.15;

    return {
      x: current.x,
      y: current.y,
      velocity,
    };
  }

  function destroy() {
    container.removeEventListener('pointermove', onPointerMove);
  }

  return { update, destroy };
}
```

### Phase 7: Scroll-linked fade with GSAP ScrollTrigger
The displacement intensity fades to zero as the hero scrolls out. This keeps the effect contained to the hero viewport.

```js
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function bindScrollFade(program, triggerElement) {
  const proxy = { fade: 1.0 };

  ScrollTrigger.create({
    trigger: triggerElement,
    start: 'top top',
    end: 'bottom top',
    scrub: true,
    onUpdate: (self) => {
      proxy.fade = 1.0 - self.progress;
      program.uniforms.uScrollFade.value = proxy.fade;
    },
  });
}
```

### Phase 8: Resize handler and animation loop
Tie everything together. ResizeObserver keeps the canvas sized correctly. The RAF loop updates pointer, velocity, and time uniforms each frame.

```js
export function startLoop(container, renderer, gl, program, mesh, pointerTracker) {
  let raf;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const width = container.clientWidth;
    const height = container.clientHeight;
    renderer.setSize(width, height);
    program.uniforms.uResolution.value = [width * dpr, height * dpr];
  }

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  const startTime = performance.now();

  function frame() {
    raf = requestAnimationFrame(frame);

    const pointer = pointerTracker.update();
    program.uniforms.uMouse.value = [pointer.x, pointer.y];
    program.uniforms.uVelocity.value = pointer.velocity;
    program.uniforms.uTime.value = (performance.now() - startTime) / 1000;

    renderer.render({ scene: mesh });
  }

  frame();

  return function destroy() {
    cancelAnimationFrame(raf);
    ro.disconnect();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}
```

### Phase 9: Entry point
Wire all modules together. Check for reduced-motion preference and WebGL support before initializing.

```js
import { createDistortionHero } from './renderer.js';
import { createPointerTracker } from './pointer.js';
import { bindScrollFade } from './scroll.js';
import { startLoop } from './loop.js';

function init() {
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  const container = document.getElementById('hero');
  if (!container) return;

  // Test for WebGL
  const testCanvas = document.createElement('canvas');
  const hasWebGL = !!(
    testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')
  );
  if (!hasWebGL) return;

  const { renderer, gl, program, mesh } = createDistortionHero(container);
  const pointerTracker = createPointerTracker(container);

  bindScrollFade(program, container);

  const destroyLoop = startLoop(container, renderer, gl, program, mesh, pointerTracker);

  // Listen for reduced-motion changes at runtime
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
    if (e.matches) {
      destroyLoop();
      pointerTracker.destroy();
      container.classList.remove('webgl-active');
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
```

## The full reference implementation

A single consolidated module combining all phases above. Copy-paste ready.

```js
import { Renderer, Program, Mesh, Texture, Plane } from 'ogl';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const VERT = `
attribute vec3 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}`;

const FRAG = `
precision highp float;
uniform sampler2D uImage;
uniform sampler2D uDisplacement;
uniform vec2 uMouse;
uniform float uVelocity;
uniform float uScale;
uniform float uScrollFade;
uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uImageSize;
varying vec2 vUv;

vec2 coverUv(vec2 uv, vec2 texSize, vec2 screenSize) {
  vec2 sr = vec2(screenSize.x / screenSize.y, 1.0);
  vec2 tr = vec2(texSize.x / texSize.y, 1.0);
  vec2 s = sr / tr;
  if (s.x < s.y) s = vec2(1.0, tr.x / sr.x);
  else s = vec2(sr.x / tr.x, 1.0);
  return (uv - 0.5) * s + 0.5;
}

void main() {
  vec2 uv = coverUv(vUv, uImageSize, uResolution);
  float dist = distance(vUv, uMouse);
  float strength = smoothstep(0.35, 0.0, dist);
  vec2 dispUv = vUv + (uMouse - 0.5) * 0.1;
  float disp = (texture2D(uDisplacement, dispUv).r - 0.5) * 2.0;
  float es = uScale * strength * uScrollFade;
  vec2 offset = vec2(disp * 0.04, disp * 0.02) * es;
  float idle = sin(uTime * 1.5 + vUv.x * 8.0) * 0.002;
  offset += vec2(idle, idle * 0.6) * uScrollFade;
  float rgbShift = uVelocity * 0.015 * uScrollFade;
  float r = texture2D(uImage, clamp(uv + offset + vec2(rgbShift, 0.0), 0.0, 1.0)).r;
  float g = texture2D(uImage, clamp(uv + offset, 0.0, 1.0)).g;
  float b = texture2D(uImage, clamp(uv + offset - vec2(rgbShift, 0.0), 0.0, 1.0)).b;
  gl_FragColor = vec4(r, g, b, 1.0);
}`;

export default function liquidHero(heroEl) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const tc = document.createElement('canvas');
  if (!(tc.getContext('webgl') || tc.getContext('experimental-webgl'))) return () => {};

  const renderer = new Renderer({ alpha: true, dpr: Math.min(devicePixelRatio, 2) });
  const gl = renderer.gl;
  heroEl.appendChild(gl.canvas);

  const imgTex = new Texture(gl, { generateMipmaps: false });
  const dispTex = new Texture(gl, { generateMipmaps: false });

  const imgEl = new Image();
  imgEl.crossOrigin = 'anonymous';
  imgEl.src = heroEl.querySelector('.hero-fallback').src;
  imgEl.onload = () => {
    imgTex.image = imgEl;
    prog.uniforms.uImageSize.value = [imgEl.naturalWidth, imgEl.naturalHeight];
  };

  const dispEl = new Image();
  dispEl.crossOrigin = 'anonymous';
  dispEl.src = heroEl.dataset.displacement || '/assets/displacement.jpg';
  dispEl.onload = () => { dispTex.image = dispEl; };

  const geo = new Plane(gl);
  const prog = new Program(gl, {
    vertex: VERT,
    fragment: FRAG,
    uniforms: {
      uImage: { value: imgTex },
      uDisplacement: { value: dispTex },
      uMouse: { value: [0.5, 0.5] },
      uVelocity: { value: 0 },
      uScale: { value: 1.0 },
      uScrollFade: { value: 1.0 },
      uTime: { value: 0 },
      uResolution: { value: [1, 1] },
      uImageSize: { value: [1, 1] },
    },
  });
  const quad = new Mesh(gl, { geometry: geo, program: prog });
  heroEl.classList.add('webgl-active');

  // Pointer
  const target = { x: 0.5, y: 0.5 };
  const cur = { x: 0.5, y: 0.5 };
  const prev = { x: 0.5, y: 0.5 };
  let vel = 0;

  function onPointer(e) {
    const r = heroEl.getBoundingClientRect();
    target.x = (e.clientX - r.left) / r.width;
    target.y = 1.0 - (e.clientY - r.top) / r.height;
  }
  heroEl.addEventListener('pointermove', onPointer, { passive: true });

  // Scroll
  ScrollTrigger.create({
    trigger: heroEl,
    start: 'top top',
    end: 'bottom top',
    scrub: true,
    onUpdate: (self) => {
      prog.uniforms.uScrollFade.value = 1.0 - self.progress;
    },
  });

  // Resize
  function resize() {
    const dpr = Math.min(devicePixelRatio, 2);
    renderer.setSize(heroEl.clientWidth, heroEl.clientHeight);
    prog.uniforms.uResolution.value = [heroEl.clientWidth * dpr, heroEl.clientHeight * dpr];
  }
  const ro = new ResizeObserver(resize);
  ro.observe(heroEl);
  resize();

  // Loop
  let raf;
  const t0 = performance.now();
  function frame() {
    raf = requestAnimationFrame(frame);
    prev.x = cur.x; prev.y = cur.y;
    cur.x += (target.x - cur.x) * 0.06;
    cur.y += (target.y - cur.y) * 0.06;
    const dx = cur.x - prev.x, dy = cur.y - prev.y;
    vel += (Math.min(Math.sqrt(dx * dx + dy * dy), 0.12) - vel) * 0.15;
    prog.uniforms.uMouse.value = [cur.x, cur.y];
    prog.uniforms.uVelocity.value = vel;
    prog.uniforms.uTime.value = (performance.now() - t0) / 1000;
    renderer.render({ scene: quad });
  }
  frame();

  return function destroy() {
    cancelAnimationFrame(raf);
    ro.disconnect();
    heroEl.removeEventListener('pointermove', onPointer);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    heroEl.classList.remove('webgl-active');
  };
}
```

## Tuning the feel

| Parameter | Default | Range | Why |
|---|---|---|---|
| Pointer lerp factor | 0.06 | 0.03 - 0.12 | 0.06 gives a heavy, liquid feel. Higher feels snappier but less organic. Below 0.03 the cursor trails so far behind it feels broken. |
| Velocity clamp | 0.12 | 0.05 - 0.20 | Caps how extreme the RGB split gets on fast swipes. 0.12 is visible but not nauseating. |
| Velocity smoothing | 0.15 | 0.08 - 0.25 | How fast velocity ramps up and settles. 0.15 means it takes ~10 frames to reach peak and ~20 frames to settle. |
| RGB shift multiplier | 0.015 | 0.005 - 0.03 | Per-channel UV offset per unit velocity. 0.015 gives clear separation on fast moves. Above 0.025 looks like a rendering bug. |
| Displacement radius | 0.35 | 0.15 - 0.5 | `smoothstep` falloff radius around cursor. 0.35 covers about 1/3 of the viewport, wide enough to feel environmental. |
| Displacement scale | 0.04 / 0.02 (x/y) | 0.01 - 0.08 | X offset is typically 2x Y offset for a natural lateral warp. Above 0.06 the image tears visibly. |
| Idle ripple frequency | 1.5 Hz | 0.8 - 3.0 | Keeps the image subtly alive. Below 0.8 looks frozen. Above 3.0 feels jittery. |
| Idle ripple amplitude | 0.002 | 0.001 - 0.005 | In UV units. 0.002 is barely perceptible, which is the point. |
| Scroll fade range | 0 - 100vh | -- | Full viewport travel from hero visible to hero scrolled out. |
| DPR cap | 2 | 1 - 3 | Fragment shader runs per pixel. DPR 3 on a 4K display is 4x the work of DPR 2 for imperceptible quality gain. |

## Variants

### 1. Radial ripple
Replace the displacement map with a procedurally generated radial gradient texture. The warp radiates outward from the cursor in concentric rings. Add `sin(dist * 20.0 + uTime * 3.0)` to the displacement calculation for an animated ripple.

### 2. Dual-image crossfade
Add a second image texture and a `uProgress` uniform (0-1). Blend between the two images at the UV lookup stage, with displacement peaking at progress 0.5. Useful for before/after or portfolio hover transitions.

### 3. Vertical scroll displacement
Remove pointer tracking entirely. Drive displacement from scroll position via ScrollTrigger scrub. The image warps progressively as the user scrolls, creating a parallax-meets-distortion effect.

### 4. Color channel rotation
Instead of fixed R/G/B channel separation along the X axis, rotate the split direction based on the angle of pointer movement. Gives a more dynamic, less predictable chromatic aberration.

### 5. Mouse-trail persistence
Render the pointer position into a ping-pong FBO that fades over time, creating a trail. Use the trail texture as the displacement source instead of a static map. Creates a paint-smear effect where the image remembers where the cursor has been.

## Performance budget

| Metric | Target | Lever |
|---|---|---|
| Frame time | < 8ms (120fps capable) | Single quad, single draw call. If over budget, reduce DPR cap to 1.5. |
| LCP | < 2.5s | The `<img>` fallback IS the LCP element. Use AVIF, `fetchpriority="high"`, preconnect to CDN. WebGL canvas overlays only after load. |
| Bundle size | < 18 KB gzipped | OGL ~12 KB + shader strings ~2 KB + JS logic ~4 KB. Exclude GSAP if already loaded on the page. |
| GPU memory | < 20 MB | Two textures: hero image (2048x1365 RGBA = ~11 MB) + displacement map (512x512 RGBA = ~1 MB). No render targets needed unless using the trail variant. |
| CLS | 0 | Canvas and fallback image both have explicit dimensions via CSS. No layout shift on WebGL init. |
| Draw calls | 1 | Single fullscreen quad. |

## Accessibility

### prefers-reduced-motion
The entire WebGL layer is skipped when `prefers-reduced-motion: reduce` is active. The static `<img>` fallback displays instead. This is not a degraded experience; the image IS the content.

```css
@media (prefers-reduced-motion: reduce) {
  .hero canvas { display: none; }
  .hero.webgl-active .hero-fallback { opacity: 1; }
}
```

The JS check mirrors this:
```js
if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
```

Runtime changes are also respected (see Phase 9).

### Focus management
- The canvas has `pointer-events: auto` but no `tabindex`. It is not in the tab order.
- All interactive elements (CTA links, buttons) sit in `.hero-content` with `pointer-events: auto` and remain keyboard-accessible.
- `mix-blend-mode: difference` on the title ensures text contrast regardless of the underlying image region.

### Screen readers
- The `<img>` fallback carries descriptive `alt` text.
- The canvas is decorative and not announced. Add `aria-hidden="true"` to the canvas element.
- The hero content (h1, subtitle, CTA) is fully semantic and in the DOM.

### Honest cost statement
Users who cannot use this effect (vestibular disorders, no WebGL, screen reader users) see a static full-bleed image with the same content overlay. The only thing lost is the interactive displacement, which is decorative. No information or navigation is gated behind the effect.

## Anti-slop rules

1. DO NOT apply displacement uniformly across the entire image. The effect must be localized around the cursor. A uniform warp looks like a broken TV, not a liquid effect.
2. DO NOT use raw pointer coordinates without lerping. Un-smoothed displacement creates jittery, 1:1 tracking that looks mechanical, not liquid.
3. DO NOT let RGB shift persist at full intensity when the pointer is stationary. Velocity must decay to near-zero. Static chromatic aberration is a rendering artifact, not a design choice.
4. DO NOT skip the `coverUv` aspect ratio correction. Without it, the image stretches to fill the canvas, destroying the photograph.
5. DO NOT set displacement map wrap mode to `REPEAT`. Use `CLAMP_TO_EDGE` or clamp UVs in the shader. Repeating wraps pull the opposite edge of the image into view, creating visible seams.
6. DO NOT exceed DPR 2 for the renderer. Fragment shaders run per pixel. DPR 3 on high-density displays doubles the fragment work for no visible improvement at normal viewing distance.
7. DO NOT animate the displacement map itself (rotating, scaling the map texture over time). The map is static geometry; the cursor and velocity drive the animation. Moving the map creates seasickness.
8. DO NOT place interactive DOM elements under the canvas without `pointer-events: none` on the canvas or `pointer-events: auto` on the elements. Buried click targets are an accessibility and usability failure.
9. DO NOT load the displacement map at full resolution. 256x256 or 512x512 is sufficient. The GPU bilinear-filters between texels. A 2048x2048 displacement map wastes VRAM for zero visual gain.
10. DO NOT use `background-attachment: fixed` as a CSS fallback for iOS. It causes visible judder on Safari. Use `object-fit: cover` on a positioned `<img>`.
11. DO NOT forget to clamp distorted UVs to 0.0-1.0. Without clamping, the shader samples outside the texture, which on `CLAMP_TO_EDGE` smears the edge pixels and on `REPEAT` wraps to the opposite side.

## Integration notes

- **With `lenis-smooth-scroll`**: If the page uses Lenis, the ScrollTrigger binding works without changes. Lenis feeds ScrollTrigger via `lenis.on('scroll', ScrollTrigger.update)`. No special integration needed.
- **With `gsap-scrolltrigger`**: This toolkit uses ScrollTrigger for the scroll fade. If another section also uses ScrollTrigger, both instances coexist. Use `ScrollTrigger.refresh()` after dynamic content loads.
- **With `page-transition-choreography`**: On route change, call the `destroy()` function returned by `liquidHero()` before the exit animation. The WebGL context must be released or it leaks.
- **With `liquid-displacement-effects` primitive**: This toolkit builds on top of the same displacement technique documented in that primitive. The primitive covers the raw shader mechanics; this toolkit adds the full hero architecture (layout, scroll binding, pointer velocity, fallback, accessibility).
- **Conflict: competing RAF loops.** If another WebGL element (e.g., a `hero-tilt-3d-layers` or `hero-morphing-blob-organic`) runs on the same page, each has its own RAF loop. This is fine for sequential sections but wastes frames if both are in the viewport simultaneously. Consolidate into a single loop if needed.

## Ship checklist

- [ ] Hero image loads as LCP element with `fetchpriority="high"` and scores < 2.5s in Lighthouse.
- [ ] Displacement activates only after both textures (image + map) have loaded.
- [ ] Pointer tracking uses lerped coordinates, not raw `clientX/clientY`.
- [ ] RGB split magnitude is zero when pointer velocity is zero.
- [ ] Canvas has `aria-hidden="true"` and is removed from tab order.
- [ ] `prefers-reduced-motion: reduce` hides the canvas and shows the fallback image.
- [ ] Runtime `prefers-reduced-motion` changes are listened for and respected.
- [ ] Resize handler uses `ResizeObserver` on the container, not `window.resize`.
- [ ] DPR is capped at 2 in the renderer.
- [ ] Displacement map is 512x512 or smaller.
- [ ] UV coordinates are clamped to prevent edge wrapping artifacts.
- [ ] `destroy()` function releases WebGL context, cancels RAF, and removes event listeners.
- [ ] Scroll fade reduces displacement to zero before the hero leaves the viewport.
- [ ] CTA and other interactive elements remain clickable over the canvas.
- [ ] Frame time stays under 8ms on a mid-range laptop (test with CPU throttling 4x in DevTools).
