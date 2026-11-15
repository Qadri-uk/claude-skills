---
name: hero-webgl-shader-fullscreen
description: Use when building a full-viewport animated shader background as a hero section. Builds a complete WebGL2 fragment-shader hero with noise, raymarch, or domain-warped gradient, driven by scroll and pointer uniforms.
category: hero
pairs_with: hero-webgl-shader-fullscreen-eval
---

# Full-Viewport WebGL Shader Hero

## What this builds
A full-screen hero section backed by a single `<canvas>` running a WebGL2 fragment shader. The shader receives time, scroll position, pointer coordinates, and resolution as uniforms, producing a procedural animated background (noise field, raymarched geometry, or domain-warped gradient). No textures, no models, no 3D library. The entire visual lives in one fragment shader.

- Raw WebGL2 context: no Three.js, no OGL, no dependencies
- Full-viewport canvas with DPR-capped rendering (max 2x)
- Uniforms: `uTime`, `uResolution`, `uScroll`, `uPointer`, `uDpr`
- Context loss recovery (WebGL contexts get killed by the OS under memory pressure)
- rAF loop with visibility-based pause (Page Visibility API)
- Three shader recipes included: fbm noise, raymarched sphere, domain-warped gradient

## When to use / when not to
- Use when the hero background must be procedural, infinitely scalable, and resolution-independent.
- Use when the visual is abstract (gradients, noise fields, organic shapes) rather than representational.
- Use when you want scroll/pointer reactivity baked into the visual at the fragment level.
- Do NOT use when the hero needs real 3D objects, lighting, or models. Use `three-js-fundamentals` or `react-three-fiber-drei`.
- Do NOT use when a CSS gradient or SVG filter achieves the same look. A WebGL context is a heavy resource. Use `gradient-mesh-aurora` or `svg-filter-effects` instead.
- Do NOT use for particle systems. Particles need vertex shaders and buffer geometry. Use `hero-particle-text-formation` or `webgl-particle-systems`.
- Do NOT use for image-sequence scrubbing. Use `hero-video-scrub-apple`.

## Stack decision
| Dependency | Version | Why | Cheaper alternative |
|---|---|---|---|
| Raw WebGL2 | Native | Zero bundle cost. Full control over the GL state machine. No abstraction overhead. | Three.js `ShaderMaterial` + fullscreen quad: easier API, 150KB+ bundle for a single quad. |
| GLSL ES 3.00 | WebGL2 | `#version 300 es` gives integer textures, `texelFetch`, and explicit `in`/`out` declarations. | GLSL ES 1.00 (WebGL1) works everywhere including old iOS Safari; lose `in`/`out` syntax, use `varying`/`gl_FragColor`. See fallback note in reference.md. |
| No dependencies | - | The entire hero is ~120 lines of JS setup + the GLSL shader. Ships as a single HTML file. | OGL (5KB) provides a nicer WebGL wrapper if you also need geometry in other parts of the page. See primitive `ogl-lightweight-webgl`. |

## Architecture

```
<canvas id="shader-hero">          Full-viewport, behind content via z-index
  |
  +-- WebGL2 context
       |
       +-- Vertex shader             Fullscreen triangle (3 vertices, no buffer)
       +-- Fragment shader            The actual visual (noise/raymarch/gradient)
       +-- Uniforms
            uTime        float       Seconds since init, paused when hidden
            uResolution  vec2        Canvas backing-store size in pixels
            uScroll      float       Normalized scroll progress (0.0 = top, 1.0 = hero scrolled out)
            uPointer     vec2        Normalized pointer position (-1 to 1, Y flipped)
            uDpr         float       Device pixel ratio (capped)
```

**Lifecycle:**
1. **Init**: Create canvas, get `webgl2` context, compile shaders, locate uniforms.
2. **Resize**: On `resize`, set canvas backing store to `clientWidth * dpr` x `clientHeight * dpr`. Update `uResolution`.
3. **Frame loop**: `requestAnimationFrame` advances `uTime`, reads `uScroll` and `uPointer`, draws a fullscreen triangle.
4. **Pause**: `visibilitychange` pauses the rAF loop and freezes `uTime` accumulation.
5. **Context loss**: `webglcontextlost` prevents default, `webglcontextrestored` re-initializes the entire GL pipeline.
6. **Teardown**: Cancel rAF, delete program/shaders, lose context.

## Build it: step by step

### Phase 1: HTML + canvas shell

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Shader Hero</title>
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0a0f; color: #e8e8e8; font-family: system-ui, sans-serif; }
  .hero {
    position: relative;
    height: 100vh;
    overflow: hidden;
  }
  .hero canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }
  .hero__content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 2rem;
  }
  .hero h1 {
    font-size: clamp(2.5rem, 6vw, 5rem);
    font-weight: 700;
    letter-spacing: -0.03em;
    text-shadow: 0 2px 20px rgba(0,0,0,0.5);
  }
  .spacer { height: 200vh; }

  @media (prefers-reduced-motion: reduce) {
    .hero canvas { display: none; }
    .hero { background: #0a0a0f; }
  }
</style>
</head>
<body>
  <section class="hero" aria-label="Hero section">
    <canvas id="shader-hero"></canvas>
    <div class="hero__content">
      <h1>Your Headline</h1>
    </div>
  </section>
  <div class="spacer"></div>
<script>
// Phases 2-8 go here
</script>
</body>
</html>
```

### Phase 2: WebGL2 context and fullscreen triangle vertex shader

The fullscreen triangle trick: instead of a quad (2 triangles, 4 vertices, index buffer), draw a single triangle with vertices at (-1,-1), (3,-1), (-1,3). The rasterizer clips it to the viewport. Zero vertex buffers needed.

```js
const canvas = document.getElementById('shader-hero');
const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false });
if (!gl) { console.error('WebGL2 not supported'); }

const VERT_SRC = `#version 300 es
precision highp float;
void main() {
  // Fullscreen triangle: vertex ID 0,1,2 -> covers [-1,-1] to [1,1]
  float x = float((gl_VertexID & 1) << 2) - 1.0;
  float y = float((gl_VertexID & 2) << 1) - 1.0;
  gl_Position = vec4(x, y, 0.0, 1.0);
}
`;
```

### Phase 3: Fragment shader (fbm noise gradient)

```js
const FRAG_SRC = `#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uScroll;
uniform vec2 uPointer;

out vec4 fragColor;

// --- Noise functions ---
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // smoothstep
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 p = uv * 4.0;

  // Domain warping: offset coordinates by noise of coordinates
  float t = uTime * 0.15;
  p += vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) + t));

  // Pointer influence: subtle displacement
  p += uPointer * 0.3;

  // Scroll influence: shift the noise field
  p.y += uScroll * 2.0;

  float n = fbm(p);

  // Color palette
  vec3 col = mix(
    vec3(0.04, 0.04, 0.08),  // dark base
    vec3(0.15, 0.25, 0.55),  // accent blue
    n
  );
  col = mix(col, vec3(0.5, 0.2, 0.4), smoothstep(0.5, 0.8, n)); // warm highlights

  // Vignette
  float vig = 1.0 - length((uv - 0.5) * 1.4);
  col *= smoothstep(0.0, 0.7, vig);

  fragColor = vec4(col, 1.0);
}
`;
```

### Phase 4: Shader compilation and linking

```js
function compileShader(src, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${log}`);
  }
  return shader;
}

function createProgram(vertSrc, fragSrc) {
  const vert = compileShader(vertSrc, gl.VERTEX_SHADER);
  const frag = compileShader(fragSrc, gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${log}`);
  }
  // Shaders are ref-counted; mark for deletion after link
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  return program;
}

let program = createProgram(VERT_SRC, FRAG_SRC);
gl.useProgram(program);
```

### Phase 5: Uniform locations and resize handler

```js
let loc = {
  uTime: gl.getUniformLocation(program, 'uTime'),
  uResolution: gl.getUniformLocation(program, 'uResolution'),
  uScroll: gl.getUniformLocation(program, 'uScroll'),
  uPointer: gl.getUniformLocation(program, 'uPointer'),
};

const DPR_CAP = 2;
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  const w = canvas.clientWidth * dpr;
  const h = canvas.clientHeight * dpr;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(loc.uResolution, w, h);
  }
}
resize();
window.addEventListener('resize', resize);
```

### Phase 6: Input tracking (scroll + pointer)

```js
let scrollProgress = 0;
let pointerX = 0, pointerY = 0;

const heroSection = document.querySelector('.hero');
window.addEventListener('scroll', () => {
  const rect = heroSection.getBoundingClientRect();
  scrollProgress = Math.max(0, Math.min(1, -rect.top / rect.height));
}, { passive: true });

document.addEventListener('pointermove', (e) => {
  pointerX = (e.clientX / window.innerWidth) * 2 - 1;
  pointerY = -((e.clientY / window.innerHeight) * 2 - 1); // flip Y for GL convention
}, { passive: true });
```

### Phase 7: Render loop with visibility pause

```js
let rafId = null;
let startTime = performance.now();
let pausedTime = 0;
let paused = false;

function frame(now) {
  if (paused) return;

  const elapsed = (now - startTime - pausedTime) / 1000;
  gl.uniform1f(loc.uTime, elapsed);
  gl.uniform1f(loc.uScroll, scrollProgress);
  gl.uniform2f(loc.uPointer, pointerX, pointerY);

  gl.drawArrays(gl.TRIANGLES, 0, 3); // fullscreen triangle, no VAO needed
  rafId = requestAnimationFrame(frame);
}

// Visibility pause
let pauseStart = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    paused = true;
    pauseStart = performance.now();
    cancelAnimationFrame(rafId);
  } else {
    pausedTime += performance.now() - pauseStart;
    paused = false;
    rafId = requestAnimationFrame(frame);
  }
});

// Reduced motion check
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
if (!prefersReduced.matches) {
  rafId = requestAnimationFrame(frame);
} else {
  // Draw one frame then stop
  frame(performance.now());
}
```

### Phase 8: Context loss recovery

```js
canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault(); // allows restoration
  cancelAnimationFrame(rafId);
  paused = true;
});

canvas.addEventListener('webglcontextrestored', () => {
  // Re-create the entire GL pipeline
  program = createProgram(VERT_SRC, FRAG_SRC);
  gl.useProgram(program);
  loc = {
    uTime: gl.getUniformLocation(program, 'uTime'),
    uResolution: gl.getUniformLocation(program, 'uResolution'),
    uScroll: gl.getUniformLocation(program, 'uScroll'),
    uPointer: gl.getUniformLocation(program, 'uPointer'),
  };
  resize();
  paused = false;
  startTime = performance.now();
  pausedTime = 0;
  rafId = requestAnimationFrame(frame);
});
```

### Phase 9: Teardown for SPA

```js
function teardown() {
  cancelAnimationFrame(rafId);
  gl.deleteProgram(program);
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  window.removeEventListener('resize', resize);
}
```

## The full reference implementation

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Shader Hero</title>
<style>
  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
  body{background:#0a0a0f;color:#e8e8e8;font-family:system-ui,sans-serif}
  .hero{position:relative;height:100vh;overflow:hidden}
  .hero canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
  .hero__content{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:2rem}
  .hero h1{font-size:clamp(2.5rem,6vw,5rem);font-weight:700;letter-spacing:-0.03em;text-shadow:0 2px 20px rgba(0,0,0,0.5)}
  .spacer{height:200vh}
  @media(prefers-reduced-motion:reduce){.hero canvas{display:none}.hero{background:#0a0a0f}}
</style>
</head>
<body>
<section class="hero" aria-label="Hero section">
  <canvas id="shader-hero"></canvas>
  <div class="hero__content"><h1>Your Headline</h1></div>
</section>
<div class="spacer"></div>
<script>
const canvas=document.getElementById('shader-hero');
const gl=canvas.getContext('webgl2',{antialias:false,alpha:false});
if(!gl){document.querySelector('.hero').style.background='#0a0a0f';}

const VERT=`#version 300 es
precision highp float;
void main(){
  float x=float((gl_VertexID&1)<<2)-1.0;
  float y=float((gl_VertexID&2)<<1)-1.0;
  gl_Position=vec4(x,y,0,1);
}`;

const FRAG=`#version 300 es
precision highp float;
uniform float uTime;
uniform vec2 uResolution;
uniform float uScroll;
uniform vec2 uPointer;
out vec4 O;

float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p){
  float v=0.0,a=0.5;
  mat2 r=mat2(0.8,0.6,-0.6,0.8);
  for(int i=0;i<5;i++){v+=a*noise(p);p=r*p*2.0;a*=0.5;}
  return v;
}
void main(){
  vec2 uv=gl_FragCoord.xy/uResolution;
  vec2 p=uv*4.0;
  float t=uTime*0.15;
  p+=vec2(fbm(p+t),fbm(p+vec2(5.2,1.3)+t));
  p+=uPointer*0.3;
  p.y+=uScroll*2.0;
  float n=fbm(p);
  vec3 c=mix(vec3(0.04,0.04,0.08),vec3(0.15,0.25,0.55),n);
  c=mix(c,vec3(0.5,0.2,0.4),smoothstep(0.5,0.8,n));
  float vig=1.0-length((uv-0.5)*1.4);
  c*=smoothstep(0.0,0.7,vig);
  O=vec4(c,1);
}`;

function compile(src,type){
  const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
  if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.error(gl.getShaderInfoLog(s));gl.deleteShader(s);return null;}
  return s;
}
function link(vs,fs){
  const v=compile(vs,gl.VERTEX_SHADER),f=compile(fs,gl.FRAGMENT_SHADER);
  if(!v||!f)return null;
  const p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);
  gl.deleteShader(v);gl.deleteShader(f);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)){console.error(gl.getProgramInfoLog(p));return null;}
  return p;
}

let prog=link(VERT,FRAG);
if(prog)gl.useProgram(prog);
let loc={uTime:gl.getUniformLocation(prog,'uTime'),uResolution:gl.getUniformLocation(prog,'uResolution'),
  uScroll:gl.getUniformLocation(prog,'uScroll'),uPointer:gl.getUniformLocation(prog,'uPointer')};

const DPR=Math.min(devicePixelRatio||1,2);
function resize(){
  const w=canvas.clientWidth*DPR,h=canvas.clientHeight*DPR;
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);gl.uniform2f(loc.uResolution,w,h);}
}
resize();addEventListener('resize',resize);

let scroll=0,px=0,py=0;
const hero=document.querySelector('.hero');
addEventListener('scroll',()=>{const r=hero.getBoundingClientRect();scroll=Math.max(0,Math.min(1,-r.top/r.height));},{passive:true});
document.addEventListener('pointermove',e=>{px=(e.clientX/innerWidth)*2-1;py=-((e.clientY/innerHeight)*2-1);},{passive:true});

let raf=null,t0=performance.now(),paused_t=0,is_paused=false,ps=0;
function tick(now){
  if(is_paused)return;
  gl.uniform1f(loc.uTime,(now-t0-paused_t)/1000);
  gl.uniform1f(loc.uScroll,scroll);
  gl.uniform2f(loc.uPointer,px,py);
  gl.drawArrays(gl.TRIANGLES,0,3);
  raf=requestAnimationFrame(tick);
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){is_paused=true;ps=performance.now();cancelAnimationFrame(raf);}
  else{paused_t+=performance.now()-ps;is_paused=false;raf=requestAnimationFrame(tick);}
});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);is_paused=true;});
canvas.addEventListener('webglcontextrestored',()=>{
  prog=link(VERT,FRAG);gl.useProgram(prog);
  loc={uTime:gl.getUniformLocation(prog,'uTime'),uResolution:gl.getUniformLocation(prog,'uResolution'),
    uScroll:gl.getUniformLocation(prog,'uScroll'),uPointer:gl.getUniformLocation(prog,'uPointer')};
  resize();is_paused=false;t0=performance.now();paused_t=0;raf=requestAnimationFrame(tick);
});

const mq=matchMedia('(prefers-reduced-motion:reduce)');
if(!mq.matches&&prog)raf=requestAnimationFrame(tick);
else if(prog)tick(performance.now());
</script>
</body>
</html>
```

## Tuning the feel

| Parameter | Value | Rationale |
|---|---|---|
| fbm octaves | 5 | Sweet spot for organic detail. 3 looks too smooth/blobby. 7+ adds GPU cost with no visible gain at 1x-2x DPR. |
| Time multiplier | 0.15 | Slow drift. 0.3+ feels restless. 0.05 feels frozen. |
| Domain warp strength | 1.0 (additive noise offset) | Enough to visibly distort the base field. Below 0.3 the warp is invisible. Above 2.0 the pattern breaks into noise soup. |
| Pointer influence | 0.3 | Subtle displacement. 0.1 is imperceptible. 0.8+ makes the shader feel twitchy. |
| Scroll influence | 2.0 (Y offset) | Full scroll range shifts the noise field by half a period. Enough to feel like the background "moves with" the page. |
| Vignette radius | 1.4 multiplier | Darkens edges without creating a visible circle. 1.0 is too tight. 2.0 is barely visible. |
| DPR cap | 2.0 | Fragment shaders scale quadratically with pixel count. 3x DPR = 2.25x the fragment cost for imperceptible gain. |
| Color palette dark base | `vec3(0.04, 0.04, 0.08)` | Near-black with a hint of blue. Avoids pure black which looks flat. |

## Variants

### 1. Raymarched sphere/metaballs
Replace the fbm noise main() with a raymarcher. The vertex shader stays identical.
```glsl
float sdSphere(vec3 p, float r) { return length(p) - r; }
float scene(vec3 p) {
  float d = sdSphere(p, 0.8);
  d = min(d, sdSphere(p - vec3(sin(uTime*0.5)*0.6, 0.0, 0.0), 0.5)); // orbiting sphere
  return d;
}
// March from camera along ray, shade with normal-based lighting
```
See reference.md for the complete raymarcher with smooth union (`opSmoothUnion`) and normal estimation.

### 2. Holographic silk / iridescent gradient
Replace fbm with a simpler 2-octave noise and use a hue-shifting palette tied to the noise value + view angle.
```glsl
vec3 palette(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t * vec3(1.0, 0.7, 0.4) + vec3(0.0, 0.15, 0.2)));
}
```
The "silk" feel comes from anisotropic noise (stretch the noise coordinates in one axis by 3:1) and a subtle sine-wave displacement.

### 3. Gradient mesh (minimal, fast)
No noise function at all. Three or four color stops interpolated by UV position with gentle sine-wave distortion over time.
```glsl
vec3 col = mix(mix(c0, c1, uv.x), mix(c2, c3, uv.x), uv.y);
col += 0.03 * sin(uv.x * 10.0 + uTime) * vec3(0.1, 0.05, 0.15);
```
Runs at essentially zero GPU cost. Good for landing pages that need motion but not complexity.

### 4. Voronoi cells / cracked earth
Use the distance-to-nearest-point pattern with a grid of jittered cell centers.
```glsl
float voronoi(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d = 1.0;
  for (int y = -1; y <= 1; y++)
  for (int x = -1; x <= 1; x++) {
    vec2 n = vec2(x, y);
    vec2 o = hash2(i + n); // vec2 hash
    d = min(d, length(f - n - o));
  }
  return d;
}
```

### 5. Vertical color bands with scroll wipe
Horizontal gradient bands that shift vertically with scroll, creating a "paint wipe" effect as the user scrolls.

## Performance budget

| Metric | Target | Lever |
|---|---|---|
| Frame time (GPU) | < 8ms at 1440x900 @2x DPR | Reduce fbm octaves from 5 to 3. Reduce DPR cap to 1.5. |
| Frame time (CPU) | < 1ms | No per-frame JS computation beyond uniform uploads (6 uniform calls). |
| WebGL draw calls | 1 per frame | Single `drawArrays(TRIANGLES, 0, 3)`. |
| JS bundle | 0 bytes (inline script) | No dependencies. |
| GPU memory | < 1MB | No textures, no framebuffers. Just the compiled shader program and the implicit backbuffer. |
| LCP impact | None | Hero text is DOM, not rendered in the shader. Canvas is behind content. |
| Power consumption | Monitor with `chrome://tracing` GPU time | Shaders run continuously. Cap fps to 30 on battery via `matchMedia('(prefers-reduced-data: reduce)')` or a manual toggle. |

**What to cut first when over budget:** Reduce DPR cap from 2 to 1.5. Reduce fbm octaves from 5 to 3. Remove pointer uniform (static pointer position). On mobile, render at 0.5x resolution and CSS-scale up.

## Accessibility

- `prefers-reduced-motion: reduce` hides the canvas entirely via CSS `display: none`. The hero falls back to a solid dark background. Optionally render a single still frame instead.
- The canvas is `aria-hidden="true"` since it is purely decorative. All content (headline, CTA) is in DOM above the canvas.
- Shader motion is slow and low-contrast by design. Avoid high-frequency flashing (WCAG 2.3.1: no more than 3 flashes per second). The fbm noise recipe stays well under this threshold at 0.15x time multiplier.
- The hero section carries `aria-label` describing the section purpose. Screen readers skip the canvas entirely.
- For users who cannot perceive the shader at all, the hero still works: the headline and CTA are fully visible against the dark fallback background.

## Anti-slop rules

1. DO NOT render at full device pixel ratio on 3x screens. Cap at 2. Fragment shaders cost `width * height * DPR^2` per frame. 3x is 2.25x the work of 2x for no visible gain.
2. DO NOT use `requestAnimationFrame` without pausing on `visibilitychange`. A hidden tab burns GPU and battery for nothing.
3. DO NOT skip `webglcontextlost` / `webglcontextrestored` handlers. Mobile browsers kill contexts under memory pressure. Without recovery, the hero goes black permanently.
4. DO NOT use `gl_FragCoord.xy / vec2(canvasCSSWidth, canvasCSSHeight)` for UV. Use the backing-store resolution uniform. CSS size and backing-store size differ by the DPR factor.
5. DO NOT compile shaders inside the render loop. Compile once at init, re-compile only on context restore.
6. DO NOT use `highp` in the fragment shader on mobile without checking `gl.getShaderPrecisionFormat()`. Some mobile GPUs emulate highp in software, tanking performance. `mediump` is usually sufficient for noise-based effects.
7. DO NOT animate the shader and also animate CSS transforms on the canvas element (e.g., scale on scroll). The compositor and the WebGL renderer fight over the canvas, causing tearing.
8. DO NOT forget to call `e.preventDefault()` in the `webglcontextlost` handler. Without it, the browser will not attempt restoration.
9. DO NOT use `alpha: true` on the WebGL context unless you need transparency. Alpha compositing with the page behind costs an extra blend per fragment.
10. DO NOT pass raw `window.scrollY` as the scroll uniform. Normalize to 0-1 based on the hero section's position, or the shader behavior changes with page length.
11. DO NOT add a VAO or vertex buffer for the fullscreen triangle. `gl_VertexID` in the vertex shader generates the positions from the vertex index alone. Zero buffers needed.

## Integration notes

- **With `lenis-smooth-scroll`:** Read scroll from Lenis's callback (`({ scroll }) => ...`) instead of `getBoundingClientRect()` in the scroll listener. Pass the normalized value to `uScroll` the same way.
- **With `hero-kinetic-typography`:** The kinetic type can live in `.hero__content` above the shader canvas. No conflict since the shader is a background layer. Ensure the text has enough contrast against the shader output (use `text-shadow` or a semi-transparent overlay).
- **With `hero-3d-anime-js-render-framework`:** These are mutually exclusive. Both want to own the hero visual. Choose one.
- **Known conflict:** If another part of the page creates a second WebGL context, most browsers limit to 8-16 contexts per page. The oldest context gets killed. Listen for `webglcontextlost` to detect this.
- **With `noise-grain-texture`:** Do not add a CSS `filter: url(#grain)` SVG filter on top of the shader canvas. Apply grain inside the fragment shader instead: `col += (hash(gl_FragCoord.xy + uTime) - 0.5) * 0.04`.

## Ship checklist

- [ ] WebGL2 context created with `alpha: false` and `antialias: false`
- [ ] DPR capped at 2 in the resize handler
- [ ] Canvas backing-store size set to `clientWidth * DPR` x `clientHeight * DPR`
- [ ] `gl.viewport()` called on every resize
- [ ] Shader compiles without errors (check `getShaderInfoLog`)
- [ ] Fullscreen triangle draws correctly (no black screen, no half-screen)
- [ ] `uResolution` uniform uses backing-store size, not CSS size
- [ ] `visibilitychange` pauses the rAF loop and freezes time accumulation
- [ ] `webglcontextlost` calls `preventDefault()` and pauses
- [ ] `webglcontextrestored` re-creates program, re-locates uniforms, resumes
- [ ] `prefers-reduced-motion` hides canvas or renders a single still frame
- [ ] Scroll uniform normalized to 0-1 based on hero section position
- [ ] No shader compilation warnings in the console
- [ ] Frame time under 16ms at target resolution (check DevTools Performance)
- [ ] Teardown function cleans up program, cancels rAF, loses context
