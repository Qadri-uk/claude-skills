---
name: ogl-lightweight-webgl
description: Use when building WebGL visuals where Three.js is too heavy -- background shaders, DOM-synced image planes, scroll-driven distortion, or any project where bundle size under 30KB matters.
---

# OGL -- Lightweight WebGL

## When to use this
- You need custom shaders and nothing else. No scene graph, no loaders, no physics.
- Bundle size is a hard constraint -- OGL is ~24KB min+gzip vs Three.js at ~160KB.
- You are building DOM-synced WebGL planes (images, videos, text blocks) that track scroll and CSS layout.
- The effect is a fullscreen shader (gradient, noise, distortion) that needs no 3D scene graph at all.
- Do NOT use this when you need glTF loading, PBR materials, shadows, or post-processing chains -- use Three.js for that.

## Mental model
OGL is a thin WebGL wrapper. It gives you `Renderer`, `Camera`, `Geometry`, `Program`, `Mesh`, and `Texture` -- and almost nothing else. There is no material library, no lights, no loaders, no post-processing pipeline. You write your own shaders for everything.

`Geometry` takes named attributes as objects with `{ size, data }`. `Program` compiles a vertex/fragment pair and manages uniforms. `Mesh` binds geometry + program and draws. That is the entire pipeline.

The power move with OGL is DOM-synced planes: create a WebGL `Plane` geometry for each DOM element, position it to match the element's `getBoundingClientRect()`, and apply shader effects (distortion, reveal, hover displacement) that CSS cannot do. The WebGL canvas sits behind (or in front of) the DOM, perfectly aligned. This is the pattern agencies like Locomotive, Lusion, and Active Theory use for award-winning portfolio sites.

The coordinate system is clip-space by default unless you set up a camera. For fullscreen shaders you often skip the camera entirely and draw a single triangle that covers the viewport.

## Setup
```bash
npm i ogl@1.0.8
```
```js
import { Renderer, Camera, Program, Mesh, Geometry, Texture, Plane, Transform, Vec2, Vec3 } from 'ogl';
```
CDN:
```html
<script type="module">
import { Renderer, Program, Mesh, Geometry } from 'https://cdn.jsdelivr.net/npm/ogl@1.0.8/dist/ogl.mjs';
</script>
```

## Core API
| Class | Role |
|---|---|
| `Renderer({ canvas, width, height, dpr, alpha })` | WebGL context wrapper. `renderer.gl` is the raw context. |
| `Camera(gl, { fov, aspect, near, far })` | Perspective or ortho. Set `camera.position.z` to frame the scene. |
| `Transform()` | Scene graph node. `scene.addChild(mesh)`. |
| `Geometry(gl, { position: { size: 3, data }, uv: { size: 2, data } })` | Attribute container. |
| `Plane(gl, { width, height, widthSegments, heightSegments })` | Built-in plane geometry helper. |
| `Program(gl, { vertex, fragment, uniforms })` | Shader program. Uniforms are `{ value }` objects. |
| `Mesh(gl, { geometry, program })` | Draws geometry with program. |
| `Texture(gl, { image, wrapS, wrapT, minFilter, magFilter })` | Wraps a WebGL texture. Accepts Image, Video, Canvas. |
| `renderer.setSize(w, h)` | Resize canvas and update viewport. |
| `renderer.render({ scene, camera })` | Draw one frame. |

## Recipes

### 1. Fullscreen gradient shader
A single triangle covering the viewport. No camera needed.
```js
const renderer = new Renderer({ alpha: true, dpr: Math.min(window.devicePixelRatio, 2) });
const gl = renderer.gl;
document.body.appendChild(gl.canvas);
renderer.setSize(window.innerWidth, window.innerHeight);

const geometry = new Geometry(gl, {
  position: { size: 2, data: new Float32Array([-1,-1, 3,-1, -1,3]) },
  uv: { size: 2, data: new Float32Array([0,0, 2,0, 0,2]) },
});

const program = new Program(gl, {
  vertex: `
    attribute vec2 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `,
  fragment: `
    precision highp float;
    varying vec2 vUv;
    uniform float uTime;
    void main() {
      vec3 col = 0.5 + 0.5 * cos(uTime + vUv.xyx * 3.0 + vec3(0, 2, 4));
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  uniforms: { uTime: { value: 0 } },
});

const mesh = new Mesh(gl, { geometry, program });
requestAnimationFrame(function update(t) {
  program.uniforms.uTime.value = t * 0.001;
  renderer.render({ scene: mesh });
  requestAnimationFrame(update);
});
```

### 2. DOM-synced image plane with hover distortion
A WebGL plane positioned to match a DOM image, with ripple distortion on hover.
```js
const renderer = new Renderer({ alpha: true, dpr: 2 });
const gl = renderer.gl;
gl.canvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:1;';
document.body.appendChild(gl.canvas);

const camera = new Camera(gl, { fov: 45 });
camera.position.z = 5;

function createPlane(imgEl) {
  const texture = new Texture(gl);
  const img = new Image();
  img.crossOrigin = '';
  img.src = imgEl.src;
  img.onload = () => { texture.image = img; };

  const geometry = new Plane(gl, { widthSegments: 20, heightSegments: 20 });
  const program = new Program(gl, {
    vertex: `
      attribute vec3 position;
      attribute vec2 uv;
      uniform mat4 modelViewMatrix;
      uniform mat4 projectionMatrix;
      uniform float uHover;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float dist = length(uv - 0.5);
        pos.z += sin(dist * 10.0 - uTime * 3.0) * 0.05 * uHover;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragment: `
      precision highp float;
      uniform sampler2D uTexture;
      varying vec2 vUv;
      void main() {
        gl_FragColor = texture2D(uTexture, vUv);
      }
    `,
    uniforms: {
      uTexture: { value: texture },
      uHover: { value: 0 },
      uTime: { value: 0 },
    },
  });

  const mesh = new Mesh(gl, { geometry, program });
  return { mesh, program, imgEl };
}

function updateBounds(plane) {
  const rect = plane.imgEl.getBoundingClientRect();
  const viewH = camera.position.z * Math.tan((camera.fov * Math.PI / 180) / 2) * 2;
  const viewW = viewH * camera.aspect;
  plane.mesh.scale.x = (rect.width / window.innerWidth) * viewW;
  plane.mesh.scale.y = (rect.height / window.innerHeight) * viewH;
  plane.mesh.position.x = ((rect.left + rect.width / 2) / window.innerWidth - 0.5) * viewW;
  plane.mesh.position.y = -((rect.top + rect.height / 2) / window.innerHeight - 0.5) * viewH;
}
```

### 3. Scroll-driven vertex displacement
Planes that warp as the user scrolls, using scroll velocity as a uniform.
```js
let scrollY = 0;
let scrollVelocity = 0;
let prevScroll = 0;

window.addEventListener('scroll', () => {
  scrollY = window.scrollY;
});

const program = new Program(gl, {
  vertex: `
    attribute vec3 position;
    attribute vec2 uv;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    uniform float uStrength;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec3 pos = position;
      pos.y += sin(pos.x * 3.14159) * uStrength * 0.002;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragment: `
    precision highp float;
    uniform sampler2D uTexture;
    varying vec2 vUv;
    void main() {
      gl_FragColor = texture2D(uTexture, vUv);
    }
  `,
  uniforms: {
    uTexture: { value: null },
    uStrength: { value: 0 },
  },
});

requestAnimationFrame(function loop() {
  scrollVelocity = scrollY - prevScroll;
  prevScroll = scrollY;
  program.uniforms.uStrength.value += (scrollVelocity - program.uniforms.uStrength.value) * 0.1;
  renderer.render({ scene, camera });
  requestAnimationFrame(loop);
});
```

### 4. Noise background (fullscreen, no scene graph)
Animated Simplex-style noise as a page background.
```js
const program = new Program(gl, {
  vertex: `
    attribute vec2 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `,
  fragment: `
    precision highp float;
    varying vec2 vUv;
    uniform float uTime;
    uniform vec2 uResolution;

    // Simple hash-based noise
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash(i), hash(i + vec2(1,0)), f.x),
        mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x),
        f.y
      );
    }
    float fbm(vec2 p) {
      float v = 0.0; float a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p *= 2.0; a *= 0.5;
      }
      return v;
    }
    void main() {
      vec2 uv = vUv * 3.0;
      float n = fbm(uv + uTime * 0.1);
      vec3 col = mix(vec3(0.02, 0.0, 0.08), vec3(0.1, 0.05, 0.2), n);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  uniforms: {
    uTime: { value: 0 },
    uResolution: { value: new Vec2(window.innerWidth, window.innerHeight) },
  },
});
```

### 5. Video texture with chromatic aberration
Load a video element as a texture, apply per-channel UV offset.
```js
const video = document.createElement('video');
video.src = '/hero.mp4';
video.loop = true; video.muted = true; video.playsInline = true;
video.play();

const texture = new Texture(gl, { generateMipmaps: false });
const program = new Program(gl, {
  vertex: `
    attribute vec2 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position, 0, 1); }
  `,
  fragment: `
    precision highp float;
    uniform sampler2D uVideo;
    uniform float uOffset;
    varying vec2 vUv;
    void main() {
      float r = texture2D(uVideo, vUv + vec2(uOffset, 0.0)).r;
      float g = texture2D(uVideo, vUv).g;
      float b = texture2D(uVideo, vUv - vec2(uOffset, 0.0)).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `,
  uniforms: {
    uVideo: { value: texture },
    uOffset: { value: 0.003 },
  },
});

requestAnimationFrame(function loop() {
  if (video.readyState >= video.HAVE_CURRENT_DATA) {
    texture.image = video;
    texture.needsUpdate = true;
  }
  renderer.render({ scene: mesh });
  requestAnimationFrame(loop);
});
```

### 6. Instanced geometry (many shapes, one draw call)
Render thousands of shapes using WebGL instancing through OGL.
```js
const geometry = new Geometry(gl, {
  position: { size: 3, data: new Float32Array([
    -0.02,  0.02, 0,  0.02,  0.02, 0,  0.02, -0.02, 0,
    -0.02,  0.02, 0,  0.02, -0.02, 0, -0.02, -0.02, 0,
  ])},
});

const COUNT = 5000;
const offsets = new Float32Array(COUNT * 3);
const scales = new Float32Array(COUNT);
for (let i = 0; i < COUNT; i++) {
  offsets[i * 3]     = (Math.random() - 0.5) * 4;
  offsets[i * 3 + 1] = (Math.random() - 0.5) * 4;
  offsets[i * 3 + 2] = 0;
  scales[i] = 0.5 + Math.random() * 1.5;
}
geometry.addAttribute('aOffset', { instanced: 1, size: 3, data: offsets });
geometry.addAttribute('aScale',  { instanced: 1, size: 1, data: scales });

const program = new Program(gl, {
  vertex: `
    attribute vec3 position;
    attribute vec3 aOffset;
    attribute float aScale;
    uniform mat4 modelViewMatrix;
    uniform mat4 projectionMatrix;
    void main() {
      vec3 pos = position * aScale + aOffset;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragment: `
    precision highp float;
    void main() { gl_FragColor = vec4(1.0, 0.4, 0.1, 0.8); }
  `,
  transparent: true,
});

const mesh = new Mesh(gl, { geometry, program });
mesh.setDrawRange(0, 6);
mesh.geometry.instancedCount = COUNT;
```

## Tuning the feel
- **DPR**: Cap at 2.0 (`Math.min(devicePixelRatio, 2)`). DPR 3 is 2.25x the fill rate for no visible improvement.
- **Hover distortion strength**: 0.02-0.08 displacement in UV space. Above 0.1 warps the image into unrecognizable mush.
- **Scroll velocity smoothing**: Lerp factor 0.05-0.15. Lower is smoother but laggy. Higher is responsive but jittery.
- **Chromatic aberration offset**: 0.001-0.005 in UV space. Above 0.01 looks like a rendering bug.
- **Noise scale**: 2-5 for organic backgrounds. Below 1.0 looks like a solid gradient. Above 8 looks like TV static.

## Performance
- OGL itself adds negligible overhead. Performance is entirely shader + draw call bound.
- Fullscreen fragment shaders are fill-rate limited. At DPR 2 on a 1920x1080 display, that is 8.3M fragments per frame. Keep fragment shaders under ~50 instructions for 60fps on integrated GPUs.
- DOM-synced planes: `getBoundingClientRect()` on every frame for every plane is fine up to ~30 planes. Beyond that, batch reads using IntersectionObserver or a single `ResizeObserver` + scroll offset.
- Video textures: `texture.needsUpdate = true` re-uploads the entire frame. This is the correct approach; there is no partial update for video.

## Accessibility
```js
const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
if (mq.matches) {
  // Render one static frame, skip animation loop
  renderer.render({ scene, camera });
} else {
  requestAnimationFrame(function loop(t) {
    program.uniforms.uTime.value = t * 0.001;
    renderer.render({ scene, camera });
    requestAnimationFrame(loop);
  });
}
```
- Canvas is purely decorative: `<canvas aria-hidden="true" role="presentation">`.
- If WebGL context creation fails, the page must remain fully usable. Wrap `new Renderer()` in try/catch.

## Anti-slop rules
1. Never import Three.js and OGL in the same project. Pick one.
2. Never skip the DPR cap. Retina 3x kills mobile performance for invisible gains.
3. Never use OGL's `Plane` with 1x1 segments for distortion effects -- you need at least 16x16 segments for visible vertex displacement.
4. Never hardcode canvas dimensions. Always `renderer.setSize()` on window resize.
5. Never animate shader uniforms with `Date.now()`. Use the RAF timestamp divided by 1000.
6. Never let DOM-sync planes drift from their source elements -- recalculate bounds on scroll AND resize.
7. Never write a fragment shader longer than 80 lines for a decorative background. Simpler reads better.

## Checklist
- [ ] Bundle size confirmed under target (check: `npx bundlesize`)
- [ ] DPR capped at 2
- [ ] Resize handler updates renderer and camera aspect
- [ ] WebGL context loss handled or at least fails gracefully
- [ ] `prefers-reduced-motion` renders a single frame or disables animation
- [ ] Canvas has `aria-hidden="true"`
- [ ] No Three.js imports coexisting with OGL
- [ ] Shaders compile without warnings on target devices
