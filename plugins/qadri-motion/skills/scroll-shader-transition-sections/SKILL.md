---
name: scroll-shader-transition-sections
description: Use when building a multi-section page where transitions between full-page sections are driven by GLSL shaders (dissolve, morph, displacement, noise wipe) instead of CSS crossfades, creating a cinematic feel between scroll stops. Builds the complete shader pipeline, scroll binding, and fallback chain.
category: scroll
pairs_with: scroll-shader-transition-sections-eval
---

# Shader-Based Section Transitions

## What this builds
A full-page scroll experience where navigating between sections triggers WebGL fragment-shader transitions. Each section pair can have its own transition effect (dissolve, directional wipe, noise displacement, radial reveal, chromatic ripple). The sections are captured as textures and the shader interpolates between them as scroll progresses through the transition zone.

- OGL-based WebGL canvas covering the viewport, rendering section textures through transition shaders
- Scroll-scrubbed transition progress mapped per section boundary
- A library of 5+ transition shaders, selectable per boundary
- Section content rendered to off-screen textures via html2canvas or pre-captured images
- CSS-only fallback for browsers without WebGL or under prefers-reduced-motion
- Snap-to-section behavior after transition completes

## When to use / when not to
- Use for portfolio sites, agency pages, or product launches where the transition between sections IS the design moment.
- Use when each section is visually distinct (different background, different content density) and a hard cut feels cheap.
- Do NOT use for text-heavy article pages. Shader transitions between paragraphs are hostile to reading flow.
- Do NOT use when sections scroll naturally with parallax. This pattern replaces native scroll with controlled transitions.
- For WebGL backgrounds without transitions, see `glsl-fragment-backgrounds`. For post-processing effects on a 3D scene, see `shader-postprocessing`. For hero-only shader work, see `hero-webgl-shader-fullscreen`.

## Stack decision
| Dependency | Version | Why | Cheaper alternative |
|---|---|---|---|
| OGL | 1.0.11 | Minimal WebGL abstraction. No scene graph overhead. Just programs, meshes, and textures. ~12 KB gzipped. | Raw WebGL2. Saves the dependency but adds ~200 lines of boilerplate for program/mesh/texture management. |
| GSAP ScrollTrigger | 3.13+ | Pin + scrub per transition zone. Handles the scroll-to-progress mapping. | CSS `scroll-snap` + IntersectionObserver. Can trigger transitions but cannot scrub them (binary start/end only). |
| gl-transitions (concept) | - | The transition shader format from gl-transitions.com. We port the GLSL, not the library. | Write transitions from scratch. The format is simple enough that the concept is more useful than the npm package. |

## Architecture

```
scroll-shader-transitions/
  index.html
  sections.css
  transition-engine.js    -- OGL setup, texture management, transition loop
  transitions/
    dissolve.glsl
    directional-wipe.glsl
    noise-displacement.glsl
    radial-reveal.glsl
    chromatic-ripple.glsl
  scroll-controller.js    -- GSAP ScrollTrigger per boundary, progress dispatch
```

```
Conceptual flow:

  Section 0 (visible)     Transition 0->1          Section 1 (visible)
  ┌─────────────┐    ┌───────────────────────┐    ┌─────────────────┐
  │  100vh       │    │  Pinned: shader runs  │    │  100vh          │
  │  Content     │    │  progress 0 -> 1      │    │  Content        │
  │              │    │  texture A -> B        │    │                 │
  └─────────────┘    └───────────────────────┘    └─────────────────┘
         scroll budget: 50-100vh per transition

Lifecycle:
  1. Capture each section as a texture (screenshot or pre-provided image)
  2. Create OGL renderer with a fullscreen quad
  3. For each section boundary, create a ScrollTrigger with pin + scrub
  4. On scrub update, set the transition shader's `progress` uniform
  5. When progress reaches 1, swap to the next section's static content
  6. On WebGL failure or reduced-motion, fall back to CSS crossfade
```

## Build it: step by step

### Phase 1: Section HTML and capture strategy

The sections are standard HTML. The shader transitions operate on texture captures of each section.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Shader Transitions</title>
<link rel="stylesheet" href="sections.css">
</head>
<body>

<canvas id="transition-canvas" aria-hidden="true"></canvas>

<main id="sections">
  <section class="page-section" data-section="0" data-transition="dissolve">
    <div class="section-content">
      <h1>Section One</h1>
      <p>Opening statement of the experience.</p>
    </div>
  </section>

  <section class="page-section" data-section="1" data-transition="directional-wipe">
    <div class="section-content">
      <h2>Section Two</h2>
      <p>The story develops here.</p>
    </div>
  </section>

  <section class="page-section" data-section="2" data-transition="noise-displacement">
    <div class="section-content">
      <h2>Section Three</h2>
      <p>Climax of the narrative.</p>
    </div>
  </section>

  <section class="page-section" data-section="3" data-transition="radial-reveal">
    <div class="section-content">
      <h2>Section Four</h2>
      <p>Resolution and call to action.</p>
    </div>
  </section>
</main>

<script src="https://cdn.jsdelivr.net/npm/ogl@1.0.11/dist/ogl.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13/dist/ScrollTrigger.min.js"></script>
<script type="module" src="transition-engine.js"></script>
</body>
</html>
```

### Phase 2: CSS structure

```css
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #000;
  color: #fff;
  font-family: system-ui, -apple-system, sans-serif;
  overflow-x: hidden;
}

#transition-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 2;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}
#transition-canvas.active { opacity: 1; }

.page-section {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}
.page-section:nth-child(1) { background: #0a0a2e; }
.page-section:nth-child(2) { background: #1a0a0a; }
.page-section:nth-child(3) { background: #0a1a0a; }
.page-section:nth-child(4) { background: #1a1a0a; }

.section-content {
  max-width: 48ch;
  text-align: center;
  padding: 2rem;
}
.section-content h1, .section-content h2 {
  font-size: clamp(2rem, 5vw, 4rem);
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: 1rem;
}
.section-content p {
  font-size: clamp(1rem, 2vw, 1.25rem);
  opacity: 0.7;
  line-height: 1.6;
}

/* Transition spacers (injected by JS) */
.transition-spacer {
  height: 80vh;
  position: relative;
}

/* Fallback: CSS crossfade for no-WebGL or reduced-motion */
@media (prefers-reduced-motion: reduce) {
  #transition-canvas { display: none; }
  .transition-spacer { display: none; }
}
```

### Phase 3: Transition shader library

Each shader takes two textures (`tFrom`, `tTo`), a `progress` uniform (0 to 1), and `resolution` for aspect correction.

**Dissolve (simple crossfade with noise)**
```glsl
// dissolve.glsl
precision highp float;

uniform sampler2D tFrom;
uniform sampler2D tTo;
uniform float progress;
uniform vec2 resolution;

varying vec2 vUv;

float random(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec4 from = texture2D(tFrom, vUv);
  vec4 to = texture2D(tTo, vUv);
  float noise = random(vUv + progress * 0.1);
  float threshold = smoothstep(progress - 0.1, progress + 0.1, noise);
  gl_FragColor = mix(to, from, threshold);
}
```

**Directional wipe**
```glsl
// directional-wipe.glsl
precision highp float;

uniform sampler2D tFrom;
uniform sampler2D tTo;
uniform float progress;
uniform vec2 resolution;
uniform float angle; // radians, default 0.0 = left-to-right

varying vec2 vUv;

void main() {
  vec2 dir = vec2(cos(angle), sin(angle));
  float dist = dot(vUv - 0.5, dir) + 0.5;
  float edge = smoothstep(progress - 0.05, progress + 0.05, dist);
  gl_FragColor = mix(texture2D(tTo, vUv), texture2D(tFrom, vUv), edge);
}
```

**Noise displacement**
```glsl
// noise-displacement.glsl
precision highp float;

uniform sampler2D tFrom;
uniform sampler2D tTo;
uniform float progress;
uniform vec2 resolution;

varying vec2 vUv;

// Simplex-derived hash
vec2 hash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float simplex(vec2 p) {
  const float K1 = 0.366025404;
  const float K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x);
  vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  h = h * h * h * h;
  vec3 n = h * vec3(dot(a, hash(i)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));
  return dot(n, vec3(70.0));
}

void main() {
  float n = simplex(vUv * 4.0) * 0.5 + 0.5;
  float displaceAmount = progress * 0.15;
  vec2 uvFrom = vUv + vec2(n * displaceAmount, n * displaceAmount * 0.5);
  vec2 uvTo = vUv - vec2(n * displaceAmount * 0.5, n * displaceAmount);
  vec4 from = texture2D(tFrom, uvFrom);
  vec4 to = texture2D(tTo, uvTo);
  float blend = smoothstep(0.0, 1.0, progress + (n - 0.5) * 0.4);
  gl_FragColor = mix(from, to, blend);
}
```

**Radial reveal**
```glsl
// radial-reveal.glsl
precision highp float;

uniform sampler2D tFrom;
uniform sampler2D tTo;
uniform float progress;
uniform vec2 resolution;

varying vec2 vUv;

void main() {
  vec2 center = vec2(0.5);
  float aspect = resolution.x / resolution.y;
  vec2 uv = vUv;
  uv.x = (uv.x - 0.5) * aspect + 0.5;
  float dist = length(uv - center);
  float maxDist = length(vec2(0.5 * aspect, 0.5));
  float radius = progress * maxDist * 1.2;
  float edge = smoothstep(radius, radius - 0.04, dist);
  gl_FragColor = mix(texture2D(tTo, vUv), texture2D(tFrom, vUv), edge);
}
```

**Chromatic ripple**
```glsl
// chromatic-ripple.glsl
precision highp float;

uniform sampler2D tFrom;
uniform sampler2D tTo;
uniform float progress;
uniform vec2 resolution;

varying vec2 vUv;

void main() {
  vec2 center = vec2(0.5);
  float dist = length(vUv - center);
  float wave = sin(dist * 30.0 - progress * 12.0) * 0.02 * (1.0 - progress);

  vec2 uvR = vUv + vec2(wave * 1.2, 0.0);
  vec2 uvG = vUv + vec2(0.0, wave);
  vec2 uvB = vUv - vec2(wave * 0.8, wave * 0.5);

  vec4 from = vec4(
    texture2D(tFrom, uvR).r,
    texture2D(tFrom, uvG).g,
    texture2D(tFrom, uvB).b,
    1.0
  );
  vec4 to = texture2D(tTo, vUv);
  float blend = smoothstep(0.0, 1.0, progress);
  gl_FragColor = mix(from, to, blend);
}
```

### Phase 4: OGL transition engine

```js
// transition-engine.js
import { Renderer, Program, Mesh, Triangle, Texture } from 'ogl';

const VERTEX = `
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

export class TransitionEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer({
      canvas,
      alpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio, 2),
    });
    this.gl = this.renderer.gl;
    this.programs = {};
    this.textures = {};
    this.currentProgram = null;
    this.mesh = null;
    this.active = false;

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  loadTexture(key, source) {
    // source: HTMLImageElement, HTMLCanvasElement, or image URL string
    const texture = new Texture(this.gl);
    if (typeof source === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        texture.image = img;
      };
      img.src = source;
    } else {
      texture.image = source;
    }
    this.textures[key] = texture;
    return texture;
  }

  registerTransition(name, fragmentShader, extraUniforms = {}) {
    const uniforms = {
      tFrom: { value: null },
      tTo: { value: null },
      progress: { value: 0 },
      resolution: { value: [window.innerWidth, window.innerHeight] },
      ...extraUniforms,
    };

    const program = new Program(this.gl, {
      vertex: VERTEX,
      fragment: fragmentShader,
      uniforms,
    });

    this.programs[name] = program;
  }

  startTransition(name, fromKey, toKey) {
    const program = this.programs[name];
    if (!program) return;
    program.uniforms.tFrom.value = this.textures[fromKey];
    program.uniforms.tTo.value = this.textures[toKey];
    program.uniforms.progress.value = 0;
    program.uniforms.resolution.value = [window.innerWidth, window.innerHeight];

    if (!this.mesh) {
      const geometry = new Triangle(this.gl);
      this.mesh = new Mesh(this.gl, { geometry, program });
    } else {
      this.mesh.program = program;
    }

    this.currentProgram = program;
    this.canvas.classList.add('active');
    this.active = true;
  }

  setProgress(value) {
    if (!this.currentProgram) return;
    this.currentProgram.uniforms.progress.value = Math.max(0, Math.min(1, value));
    this.renderer.render({ scene: this.mesh });
  }

  endTransition() {
    this.canvas.classList.remove('active');
    this.active = false;
  }

  destroy() {
    Object.values(this.textures).forEach(t => {
      if (t.image) t.image = null;
    });
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
    window.removeEventListener('resize', this._resize);
  }
}
```

### Phase 5: Scroll controller wiring

```js
// scroll-controller.js
import { TransitionEngine } from './transition-engine.js';

gsap.registerPlugin(ScrollTrigger);

// Shader sources (in production, inline these or import as strings)
const SHADERS = {
  dissolve: `/* dissolve.glsl content */`,
  'directional-wipe': `/* directional-wipe.glsl content */`,
  'noise-displacement': `/* noise-displacement.glsl content */`,
  'radial-reveal': `/* radial-reveal.glsl content */`,
  'chromatic-ripple': `/* chromatic-ripple.glsl content */`,
};

const TRANSITION_VH = 80; // scroll distance per transition

async function init() {
  const canvas = document.getElementById('transition-canvas');
  const sections = document.querySelectorAll('.page-section');

  // Check WebGL support
  const testCtx = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!testCtx) {
    console.warn('No WebGL. Falling back to CSS crossfade.');
    initCSSFallback(sections);
    return;
  }

  // Check reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    initCSSFallback(sections);
    return;
  }

  const engine = new TransitionEngine(canvas);

  // Register all transitions
  Object.entries(SHADERS).forEach(([name, frag]) => {
    const extra = name === 'directional-wipe' ? { angle: { value: 0.0 } } : {};
    engine.registerTransition(name, frag, extra);
  });

  // Capture section textures
  // Option A: pre-provided images (preferred for performance)
  // Option B: html2canvas at runtime (heavier, shown here)
  for (let i = 0; i < sections.length; i++) {
    // For production, use pre-captured screenshots or poster images:
    // engine.loadTexture(`section-${i}`, `captures/section-${i}.webp`);

    // Runtime capture via offscreen canvas (simplified):
    const rect = sections[i].getBoundingClientRect();
    const offscreen = document.createElement('canvas');
    offscreen.width = rect.width * Math.min(window.devicePixelRatio, 2);
    offscreen.height = rect.height * Math.min(window.devicePixelRatio, 2);
    // In production, use html2canvas or a pre-rendered poster
    // For this reference, assume pre-provided images
    engine.loadTexture(`section-${i}`, `captures/section-${i}.webp`);
  }

  // Insert transition spacers between sections
  for (let i = 0; i < sections.length - 1; i++) {
    const spacer = document.createElement('div');
    spacer.className = 'transition-spacer';
    spacer.dataset.from = i;
    spacer.dataset.to = i + 1;
    sections[i].after(spacer);
  }

  // Create ScrollTriggers for each transition
  const spacers = document.querySelectorAll('.transition-spacer');
  spacers.forEach(spacer => {
    const fromIdx = parseInt(spacer.dataset.from);
    const toIdx = parseInt(spacer.dataset.to);
    const transitionName = sections[fromIdx].dataset.transition || 'dissolve';

    let started = false;

    ScrollTrigger.create({
      trigger: spacer,
      start: 'top bottom',
      end: 'bottom top',
      scrub: 0.3,
      onUpdate(self) {
        if (!started) {
          engine.startTransition(transitionName, `section-${fromIdx}`, `section-${toIdx}`);
          started = true;
        }
        engine.setProgress(self.progress);
      },
      onLeave() {
        engine.endTransition();
        started = false;
      },
      onLeaveBack() {
        engine.endTransition();
        started = false;
      },
    });
  });
}

function initCSSFallback(sections) {
  // Simple CSS crossfade between sections on scroll
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        entry.target.style.opacity = entry.isIntersecting ? '1' : '0';
        entry.target.style.transition = 'opacity 0.5s ease';
      });
    },
    { threshold: 0.3 }
  );
  sections.forEach(s => observer.observe(s));
}

init();
```

### Phase 6: Section texture capture strategies

**Strategy A: Pre-rendered screenshots (recommended)**

Capture each section at build time. This avoids the runtime cost of html2canvas and guarantees the texture matches the rendered section exactly.

```bash
# Using Playwright to capture section screenshots
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://localhost:3000');
  const sections = await page.$$('.page-section');
  for (let i = 0; i < sections.length; i++) {
    await sections[i].screenshot({ path: 'captures/section-' + i + '.webp', type: 'webp', quality: 85 });
  }
  await browser.close();
})();
"
```

**Strategy B: Runtime capture with html2canvas**

For dynamic content that cannot be pre-captured.

```js
import html2canvas from 'html2canvas';

async function captureSection(section, dpr = 1.5) {
  const canvas = await html2canvas(section, {
    scale: dpr,
    useCORS: true,
    logging: false,
    backgroundColor: null,
  });
  return canvas;
}
```

**Strategy C: CSS background images as textures**

If each section has a distinct full-bleed background image, use those directly as textures. No capture needed.

```js
sections.forEach((section, i) => {
  const bg = getComputedStyle(section).backgroundImage;
  const url = bg.match(/url\("?(.+?)"?\)/)?.[1];
  if (url) engine.loadTexture(`section-${i}`, url);
});
```

### Phase 7: Snap-to-section after transition

After a transition completes, snap the scroll to land cleanly on the next section.

```js
ScrollTrigger.create({
  trigger: spacer,
  start: 'top bottom',
  end: 'bottom top',
  scrub: 0.3,
  snap: {
    snapTo: [0, 1],
    duration: { min: 0.2, max: 0.6 },
    ease: 'power2.inOut',
  },
  // ... onUpdate, onLeave as above
});
```

### Phase 8: Custom uniform per transition

Some transitions take extra parameters (angle, intensity, color). Pass them per boundary.

```html
<section data-section="0" data-transition="directional-wipe" data-angle="1.5708">
```

```js
const angle = parseFloat(sections[fromIdx].dataset.angle) || 0;
if (transitionName === 'directional-wipe') {
  engine.programs['directional-wipe'].uniforms.angle.value = angle;
}
```

## The full reference implementation

See Phase 4 (`TransitionEngine` class) and Phase 5 (`scroll-controller.js`) above. The engine is self-contained: register shaders, load textures, bind to scroll, render. The scroll controller creates one `ScrollTrigger` per transition zone and delegates progress to the engine.

The combined working flow:
1. Engine creates OGL renderer on the fixed canvas
2. Textures loaded from pre-captured section images
3. Transition spacers (80vh each) inserted between sections
4. Each spacer gets a ScrollTrigger that calls `engine.startTransition()` on enter, `engine.setProgress()` on update, `engine.endTransition()` on leave
5. The canvas is hidden (`opacity: 0`) when no transition is active, visible when one is

## Tuning the feel

| Parameter | Value | Why |
|---|---|---|
| Transition scroll distance | 80vh | Long enough to scrub through the shader without rushing, short enough to not bore. 50vh feels abrupt, 120vh+ feels sluggish. |
| Scrub smoothing | 0.3s | Tighter than video scrub because shader render is instant (no decode latency). 0.5s+ feels mushy. |
| DPR cap | 2 | Fragment shaders render per-pixel. DPR 3 means 2.25x the fragment work for no visible gain on transition effects. |
| Dissolve smoothstep width | 0.1 (progress +/- 0.1) | Soft dissolve edge. 0.01 = hard binary cut. 0.3 = too mushy, looks like a broken crossfade. |
| Noise displacement amount | 0.15 * progress | Enough to distort visibly without making text illegible. > 0.3 shreds the image. |
| Chromatic ripple wave count | 30.0 | Visible ripple rings without moire on low-DPR screens. > 50 causes aliasing. |
| Radial reveal overshoot | 1.2x maxDist | Ensures the reveal fully clears corners. 1.0x leaves corner pixels of the source visible. |
| Snap duration | 0.2-0.6s | Post-transition snap to clean section alignment. Under 0.2s is jarring, over 0.6s feels slow. |

## Variants

### 1. Per-section color-graded transition
Each section provides a color tint uniform. The transition shader applies a color grade that shifts from section A's palette to section B's during the transition.

### 2. Mouse-influenced transition
Add `mouse` uniform (normalized 0-1 screen position). The transition origin follows the cursor, so a radial reveal opens from wherever the user is looking.

### 3. Video-to-section transition
Section A is a looping video. Capture the current video frame as a texture on transition start, then transition from that frozen frame to the next section's texture.

### 4. Three.js scene integration
Replace OGL with Three.js when the transitions need to operate on 3D scenes. Use `THREE.ShaderMaterial` on a fullscreen quad with the same uniforms.

### 5. Direction-aware transitions
Detect scroll direction. Use a different shader (or different `angle` uniform) for scrolling down vs scrolling up, so the transition "unwipes" when reversing.

## Performance budget

| Metric | Target | Lever |
|---|---|---|
| Fragment shader cost | < 4ms per frame at 1080p | Avoid multi-pass effects. Single-pass fragment shaders with < 20 texture lookups. |
| Texture memory | < 40 MB total | Cap at 1920x1080 per section, WebP compressed. 5 sections = 5 textures at ~4-8 MB each decoded. |
| Canvas context | 1 | One WebGL context for the entire page. Never one per transition. |
| JS bundle | < 50 KB gzipped | OGL (~12 KB) + GSAP (~28 KB) + transition engine (~5 KB). |
| LCP | < 2.5s | Canvas is hidden on load. First section renders as normal HTML. |
| Transition frame rate | 60fps | Monitor with `renderer.info` and reduce DPR if under budget. |
| GPU dispose | All textures and programs | Call `engine.destroy()` on route change. Check `gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)` against usage. |

## Accessibility

`prefers-reduced-motion: reduce` disables the WebGL canvas entirely and removes the transition spacers. Sections display as normal stacked content with no transition effects. The `initCSSFallback` path applies a simple opacity crossfade at 0.5s for minimal visual continuity.

The canvas has `aria-hidden="true"` because it is purely decorative. All content lives in the HTML sections, which remain in the DOM and are accessible to screen readers regardless of the canvas state.

What this costs users who cannot see the transitions: they see each section as a static page with normal scroll. The content is identical; only the transition spectacle is lost.

## Anti-slop rules

1. DO NOT create one WebGL context per transition. The browser limits contexts to 8-16 total. One canvas, one context, shared by all transitions.
2. DO NOT use html2canvas at runtime for sections with videos, iframes, or complex layered content. The capture will be wrong. Use pre-rendered screenshots.
3. DO NOT apply the same transition effect to every boundary. Using dissolve five times in a row reads as "I only know one effect." Vary the shader per boundary.
4. DO NOT forget to hide the canvas when no transition is active. A permanently visible canvas blocks pointer events and creates a stacking context that fights with the HTML content.
5. DO NOT use `precision mediump float` in transition shaders. Banding artifacts appear at low precision, especially on gradient-heavy dissolves. Use `highp`.
6. DO NOT skip the fallback. WebGL fails on ~3% of mobile browsers and 100% of reduced-motion users. Always provide a CSS path.
7. DO NOT animate the transition canvas's own opacity during the transition. The shader handles the blend. The canvas opacity toggle is only for show/hide between transitions.
8. DO NOT use scroll snap on the same container as the transition spacers unless the snap points are exactly aligned to section tops. Misaligned snaps fight the transition's scrub range.
9. DO NOT hardcode texture dimensions. Read them from the loaded image and pass to the shader as `resolution` uniform. Aspect distortion in transitions looks broken.
10. DO NOT render the shader when the transition is not in the viewport. Gate `renderer.render()` behind the ScrollTrigger's active state to save GPU cycles.

## Integration notes

- The OGL renderer can coexist with a Three.js scene if they use separate canvases with separate contexts. Do not try to share a context.
- Pairs with `lenis-smooth-scroll` for smoother scrub input. Init Lenis before ScrollTrigger. The scrub smoothing (0.3s) stacks with Lenis's own smoothing (1.1s), so reduce one or the other.
- Conflicts with `scroll-snap-fullpage-deck` because both want to control section landing behavior. Choose one pattern: shader transitions OR snap deck.
- For the shader library format, see gl-transitions.com. The GLSL conventions (uniform names, varying names) are deliberately compatible.

## Ship checklist

- [ ] One WebGL context total, created once
- [ ] All 5 shader transitions compile without errors
- [ ] Textures loaded from pre-captured images, not runtime html2canvas (unless dynamic content requires it)
- [ ] Canvas hidden when no transition is active
- [ ] Transition progress scrubs smoothly from 0 to 1 and back
- [ ] Each section boundary uses a different transition effect
- [ ] CSS crossfade fallback active on WebGL failure
- [ ] CSS crossfade fallback active on prefers-reduced-motion
- [ ] Canvas has `aria-hidden="true"`
- [ ] Textures and context disposed on route change
- [ ] Fragment shaders use `precision highp float`
- [ ] DPR capped at 2
- [ ] Tested on Safari (WebGL shader compilation can differ)
- [ ] No pointer-event blocking from the canvas during non-transition states
