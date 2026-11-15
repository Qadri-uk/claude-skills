# GLTF Product Showcase Hero -- Reference

## Three.js material properties for product finishes

| Finish | roughness | metalness | envMapIntensity | Notes |
|---|---|---|---|---|
| Matte plastic | 0.85-0.95 | 0.0 | 0.3 | Diffuse, no reflections |
| Gloss plastic | 0.1-0.2 | 0.0 | 0.8 | Sharp reflections, no metallic tint |
| Brushed metal | 0.4-0.6 | 1.0 | 0.9 | Soft reflections with metallic color |
| Polished metal | 0.05-0.15 | 1.0 | 1.2 | Mirror-like, shows env map clearly |
| Leather | 0.7-0.85 | 0.0 | 0.2 | Slightly textured, warm |
| Glass | 0.0-0.05 | 0.0 | 1.0 | Use MeshPhysicalMaterial with transmission: 1.0 |
| Ceramic | 0.3-0.5 | 0.0 | 0.6 | Smooth with soft sheen |
| Wood | 0.6-0.8 | 0.0 | 0.3 | Use normal map for grain |

### Material swap code pattern
```js
scene.traverse((child) => {
  if (child.isMesh && child.name.startsWith(prefix)) {
    const mat = child.material;
    mat.color.set(hexColor);
    mat.roughness = newRoughness;
    mat.metalness = newMetalness;
    mat.needsUpdate = true;
  }
});
```

## drei Environment presets

| Preset | Character | Use for |
|---|---|---|
| `studio` | Neutral soft box lighting, even | Product photography default |
| `warehouse` | Large space, directional | Industrial, automotive |
| `city` | Urban, varied light angles | Watches, jewelry |
| `sunset` | Warm golden tones | Lifestyle products, warm metals |
| `dawn` | Cool, soft gradient | Tech products, minimal |
| `night` | Dark, sparse highlights | Dark product hero, dramatic |
| `apartment` | Interior, warm ambient | Home goods, furniture |
| `park` | Green tones, diffuse | Outdoor gear |

For custom HDRIs, use `<Environment files="/path/to/env.hdr" />`. The HDRI must be equirectangular format.

## GLB optimization targets

| Metric | Good | Acceptable | Too high |
|---|---|---|---|
| File size (Draco) | < 1 MB | 1-2 MB | > 5 MB |
| Polygon count | < 20K tris | 20-50K tris | > 100K tris |
| Texture size (per map) | 512x512 | 1024x1024 | > 2048x2048 |
| Number of materials | 1-3 | 4-8 | > 15 |
| Number of meshes | 1-5 | 5-15 | > 30 |

### Draco compression setup
```js
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const dracoLoader = new DRACOLoader();
// Self-host these files or use a CDN you control
dracoLoader.setDecoderPath('/draco/');
// Files needed: draco_decoder.js, draco_decoder.wasm, draco_wasm_wrapper.js

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
```

## Hotspot positioning strategies

### World-space (preferred for R3F)
```tsx
<Html position={[0.4, 1.2, 0.5]} distanceFactor={6} occlude>
  <button className="hotspot-marker">...</button>
</Html>
```
`distanceFactor` controls the scale of the HTML overlay based on distance from camera. `occlude` hides the hotspot when it is behind the model.

### Projected screen-space (vanilla Three.js)
```js
const vector = new THREE.Vector3(0.4, 1.2, 0.5);
vector.project(camera);

const x = (vector.x * 0.5 + 0.5) * container.clientWidth;
const y = (-vector.y * 0.5 + 0.5) * container.clientHeight;

hotspotEl.style.transform = `translate(${x}px, ${y}px)`;

// Update every frame in the render loop
// Hide when behind camera (vector.z > 1)
if (vector.z > 1) hotspotEl.style.display = 'none';
else hotspotEl.style.display = '';
```

### Bone-attached (for animated models)
Attach hotspot to a bone in the skeleton:
```js
const bone = model.getObjectByName('Bone_Wrist');
const worldPos = new THREE.Vector3();
// In render loop:
bone.getWorldPosition(worldPos);
// Project worldPos to screen space
```

## Shadow configuration reference

| Property | Default | Recommended | Notes |
|---|---|---|---|
| `shadow.mapSize` | 512x512 | 2048x2048 | Higher = sharper shadow edges |
| `shadow.bias` | 0 | -0.001 | Prevents shadow acne (dark speckles on lit surfaces) |
| `shadow.normalBias` | 0 | 0.02 | Alternative to bias, better for curved surfaces |
| `shadow.camera.near` | 0.5 | 0.1 | Shadow camera frustum near |
| `shadow.camera.far` | 500 | 20 | Tight far plane = better shadow precision |
| `shadow.camera.left/right/top/bottom` | -5/5/5/-5 | Match model bounds | Over-wide frustum wastes shadow map resolution |
| `shadow.radius` | 1 | 4 | PCFSoft blur radius (higher = softer edges) |

## Tone mapping comparison

| Mode | Character | When to use |
|---|---|---|
| `THREE.NoToneMapping` | Raw linear, very bright highlights | Never for product showcase |
| `THREE.LinearToneMapping` | Simple clamp, flat | Technical rendering, neutral |
| `THREE.ReinhardToneMapping` | Soft rolloff, preserves highlights | Warm product photography |
| `THREE.ACESFilmicToneMapping` | Cinematic, rich contrast, slight desaturation in highlights | Default for most product showcases |
| `THREE.CineonToneMapping` | Low contrast, film-like | Vintage/retro product feel |
| `THREE.AgXToneMapping` | Accurate, wide gamut, good for colored lights | Modern/accurate preference |

## OrbitControls event handling

```js
// Pause auto-rotate on interaction
controls.addEventListener('start', () => {
  controls.autoRotate = false;
});

// Resume after 3 seconds of inactivity
let idleTimer;
controls.addEventListener('end', () => {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    controls.autoRotate = true;
  }, 3000);
});
```

## Common Three.js product showcase bugs

| Bug | Symptom | Fix |
|---|---|---|
| Model loads but is invisible | Model scale is 0.001 (Blender default export in meters to a scene expecting cm) | Scale the model after load or fix in Blender export settings |
| Model is black despite lights | Materials are `MeshBasicMaterial` (imported from a scene without PBR) | Convert to `MeshStandardMaterial` post-load |
| Colors look wrong (too dark) | `outputColorSpace` not set to SRGB | Set `renderer.outputColorSpace = THREE.SRGBColorSpace` |
| Texture appears on wrong mesh | UV mapping issues in the source model | Fix in Blender, not at runtime |
| Animation plays but is jerky | `mixer.update(delta)` missing from render loop | Add `const delta = clock.getDelta(); mixer.update(delta);` |
| Model disappears when orbiting far | Camera `far` plane is too close | Increase camera `far` to 1000 |
| Performance degrades over time | Textures/geometries accumulating in memory | Dispose resources on unmount, check `renderer.info.memory` |
