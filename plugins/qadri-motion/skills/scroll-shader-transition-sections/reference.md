# Reference: Shader-Based Section Transitions

## gl-transitions format compatibility

The shaders in this toolkit follow the gl-transitions convention (gl-transitions.com). The standard interface:

```glsl
uniform sampler2D from;    // source texture (this toolkit uses tFrom)
uniform sampler2D to;      // destination texture (this toolkit uses tTo)
uniform float progress;    // 0.0 to 1.0
uniform float ratio;       // aspect ratio (this toolkit uses resolution vec2)
vec4 transition(vec2 uv);  // the transition function
```

To port a gl-transition shader into this toolkit:
1. Rename `from` to `tFrom`, `to` to `tTo` (avoid GLSL reserved-word conflicts in some drivers).
2. Replace `ratio` with `resolution.x / resolution.y`.
3. Add `varying vec2 vUv;` and use `vUv` instead of `gl_FragCoord / resolution`.
4. Call the transition logic directly in `main()` instead of wrapping in a `transition()` function.

## Full shader catalog with parameters

| Shader | Uniforms | Visual |
|---|---|---|
| dissolve | `progress` | Noise-based pixel-by-pixel reveal. Organic, film-grain feel. |
| directional-wipe | `progress`, `angle` (radians) | Linear edge sweep. 0 = left-to-right, PI/2 = bottom-to-top. |
| noise-displacement | `progress` | Both textures distort toward each other through simplex noise. Liquid feel. |
| radial-reveal | `progress` | Circle expands from center, revealing the next section. |
| chromatic-ripple | `progress` | Concentric wave ripple with RGB channel separation. |

## Writing custom transition shaders

Template:
```glsl
precision highp float;

uniform sampler2D tFrom;
uniform sampler2D tTo;
uniform float progress;
uniform vec2 resolution;
// Add custom uniforms here

varying vec2 vUv;

void main() {
  vec4 from = texture2D(tFrom, vUv);
  vec4 to = texture2D(tTo, vUv);

  // Your transition logic here
  // Use progress (0-1) to interpolate between from and to
  // Use resolution for aspect correction

  float blend = progress; // simplest case: linear crossfade
  gl_FragColor = mix(from, to, blend);
}
```

Rules for production shaders:
- Maximum 8 texture lookups per fragment. Each additional lookup costs ~0.1ms at 1080p.
- Avoid `for` loops with non-constant bounds. Some mobile GPUs do not unroll them.
- Use `smoothstep` for edges, not `step`. Hard edges alias badly on low-DPR screens.
- Test on integrated GPUs (Intel UHD, Apple M-series). Discrete GPUs hide performance problems.

## OGL vs Three.js vs raw WebGL for transitions

| | OGL | Three.js | Raw WebGL2 |
|---|---|---|---|
| Bundle size | ~12 KB gzip | ~150 KB gzip | 0 KB |
| Boilerplate for fullscreen quad | ~15 lines | ~20 lines | ~80 lines |
| Texture management | `new Texture(gl)` | `new THREE.Texture()` | Manual `gl.texImage2D`, `gl.createTexture` |
| Program management | `new Program(gl, { vertex, fragment })` | `new THREE.ShaderMaterial({ vertexShader, fragmentShader })` | Manual compile/link/uniform-location caching |
| When to choose | Transition-only pages, no 3D scene | Already using Three.js for other content | Extreme bundle constraints |

## Texture format and sizing

| Section count | Texture resolution | Estimated VRAM | Notes |
|---|---|---|---|
| 4 sections | 1920x1080 RGBA | ~32 MB (4 * 8 MB) | Comfortable for desktop |
| 4 sections | 1280x720 RGBA | ~14 MB | Good for mobile |
| 8 sections | 1920x1080 RGBA | ~64 MB | Starting to stress mobile GPUs. Consider loading/unloading textures per pair. |
| 8 sections | 1280x720 RGBA | ~28 MB | Comfortable |

For pages with more than 6 sections, implement a texture window: only keep textures for the current section, the previous, and the next loaded. Dispose the rest and reload on demand.

```js
function updateTextureWindow(engine, currentIdx, sections) {
  const keep = new Set([currentIdx - 1, currentIdx, currentIdx + 1]);
  for (let i = 0; i < sections.length; i++) {
    const key = `section-${i}`;
    if (keep.has(i)) {
      if (!engine.textures[key]) {
        engine.loadTexture(key, `captures/section-${i}.webp`);
      }
    } else {
      if (engine.textures[key]) {
        engine.textures[key].image = null;
        delete engine.textures[key];
      }
    }
  }
}
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Black canvas during transition | Texture not loaded yet when transition starts | Wait for texture `onload` before enabling ScrollTrigger, or show a loading indicator |
| Shader compiles in Chrome, fails in Safari | Implicit int-to-float cast, missing `precision` | Use `1.0` not `1`, add `precision highp float;` |
| Transition visible on page load | Canvas opacity not initialized to 0 | Set `opacity: 0` in CSS, add `.active` class only during transitions |
| Transition repeats on scroll back | `onLeaveBack` not calling `endTransition()` | Add the `onLeaveBack` callback to reset state |
| Half of screen shows previous transition | Stale texture on one uniform | Explicitly set both `tFrom` and `tTo` on every `startTransition()` call |
| Moire patterns in chromatic ripple | Wave frequency too high for screen resolution | Reduce wave count from 30 to 15 on screens < 1080p tall |
| Transitions desync after resize | Canvas and textures not re-sized | Call `renderer.setSize()` and update `resolution` uniform on resize |
