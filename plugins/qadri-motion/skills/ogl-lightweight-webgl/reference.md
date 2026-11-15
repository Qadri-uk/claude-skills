# OGL Lightweight WebGL -- Reference

## OGL vs Three.js decision matrix
| Factor | Choose OGL | Choose Three.js |
|---|---|---|
| Bundle budget | Under 40KB gzipped | No budget or already importing Three |
| Shader complexity | You write all shaders yourself | You want PBR, shadows, env maps |
| 3D models | None needed | glTF/OBJ loading required |
| Post-processing | Manual FBO management is fine | Need EffectComposer chain |
| Scene complexity | Under 50 meshes | Complex scene graphs, raycasting |
| Learning curve | Comfortable with raw WebGL concepts | Want higher-level abstractions |

## Geometry attribute format
```js
// OGL requires { size: N, data: TypedArray }
// Optionally: { instanced: 1 } for instanced attributes
new Geometry(gl, {
  position: { size: 3, data: new Float32Array([...]) },
  uv:       { size: 2, data: new Float32Array([...]) },
  normal:   { size: 3, data: new Float32Array([...]) },
  index:    { data: new Uint16Array([...]) }, // no size needed for index
});
```

## Common gotchas

1. **No automatic uniform injection**: Unlike Three.js, OGL does not inject `time` or `resolution`. You must declare and update every uniform yourself.
2. **Texture flipping**: OGL does NOT flip Y by default. Set `texture.flipY = true` for standard image textures, but NOT for video or canvas sources (which are already top-left origin).
3. **No dispose method**: OGL does not track resources for bulk disposal. Delete textures and buffers manually: `gl.deleteTexture(texture.texture)`.
4. **Program caching**: OGL caches compiled programs by shader source string. If you generate shaders dynamically with string interpolation, identical programs may not be reused.
5. **Transform hierarchy**: `parent.addChild(child)` -- world matrix is computed on render. If you read `mesh.worldMatrix` before render, it may be stale.
6. **No built-in raycaster**: Implement your own or use a library like `camera.unproject()` to go from screen to world coords manually.

## Additional recipes

### Render target (FBO) for post-processing
Manual multi-pass rendering using OGL's RenderTarget.
```js
import { RenderTarget } from 'ogl';

const rt = new RenderTarget(gl, {
  width: gl.canvas.width,
  height: gl.canvas.height,
});

// Pass 1: render scene to FBO
renderer.render({ scene, camera, target: rt });

// Pass 2: fullscreen quad sampling the FBO texture
postProgram.uniforms.uScene.value = rt.texture;
renderer.render({ scene: postMesh });
```

### Mouse-reactive gradient
Fullscreen shader that shifts color based on normalized mouse position.
```js
const mouse = { x: 0.5, y: 0.5 };
window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX / window.innerWidth;
  mouse.y = 1.0 - e.clientY / window.innerHeight;
});

const fragment = `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 uMouse;
  uniform float uTime;
  void main() {
    float d = distance(vUv, uMouse);
    vec3 c1 = vec3(0.05, 0.02, 0.15);
    vec3 c2 = vec3(0.9, 0.3, 0.1);
    vec3 col = mix(c2, c1, smoothstep(0.0, 0.8, d));
    col += 0.03 * sin(uTime * 2.0 + vUv.y * 20.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;

requestAnimationFrame(function loop(t) {
  program.uniforms.uMouse.value = new Vec2(mouse.x, mouse.y);
  program.uniforms.uTime.value = t * 0.001;
  renderer.render({ scene: mesh });
  requestAnimationFrame(loop);
});
```

### Image reveal on scroll (clip with shader)
Progressively reveal an image as it scrolls into view using a uniform-driven cutoff.
```js
const fragment = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform float uProgress; // 0 = hidden, 1 = fully revealed
  varying vec2 vUv;
  void main() {
    vec4 tex = texture2D(uTexture, vUv);
    // Diagonal wipe
    float edge = (vUv.x + vUv.y) * 0.5;
    float reveal = smoothstep(uProgress - 0.05, uProgress + 0.05, edge);
    gl_FragColor = vec4(tex.rgb, tex.a * reveal);
  }
`;

// Drive uProgress from IntersectionObserver or scroll position
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    // entry.intersectionRatio goes 0 to 1
    targetProgress = entry.intersectionRatio;
  });
}, { threshold: Array.from({ length: 20 }, (_, i) => i / 19) });
observer.observe(imgElement);

requestAnimationFrame(function loop() {
  // Smooth lerp toward target
  currentProgress += (targetProgress - currentProgress) * 0.08;
  program.uniforms.uProgress.value = currentProgress;
  renderer.render({ scene, camera });
  requestAnimationFrame(loop);
});
```
