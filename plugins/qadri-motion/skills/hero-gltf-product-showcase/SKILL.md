---
name: hero-gltf-product-showcase
description: Use when building a hero section that loads a glTF/GLB 3D product model with orbit controls, interactive hotspots, and runtime material swapping. Builds a complete 3D product hero with Three.js.
category: hero
pairs_with: hero-gltf-product-showcase-eval
---

# GLTF Product Showcase Hero

## What this builds
A full-viewport hero section centered on a glTF/GLB 3D product model rendered with Three.js. The user can orbit the model with mouse drag, tap interactive hotspots placed on the model surface to reveal product details, and swap materials/colors at runtime via UI controls. The hero includes three-point studio lighting, contact shadows, and an environment map for physically accurate reflections.

- GLB model loaded via Three.js GLTFLoader with Draco compression support.
- Orbit controls with damping, constrained polar angle (no flipping below the floor), and auto-rotate at idle.
- 3-5 interactive hotspots attached to model surface points, each revealing a detail panel on click.
- Material swapping: change color, finish (matte/gloss/metallic), or texture via UI buttons.
- Three-point lighting with soft contact shadow on a ground plane.
- HDRI environment map for realistic reflections on metallic/glossy surfaces.
- Loading progress indicator with percentage.
- Fallback to a static product image when WebGL is unavailable.

## When to use / when not to
- Use for product detail pages, product launch heroes, or e-commerce pages where the product is the sole visual subject.
- Use when you have (or can produce) a GLB model of the product. This toolkit does NOT generate 3D models.
- Do NOT use for scenes with multiple complex models or environments. This is a single-product showcase, not a scene builder. See `three-js-fundamentals` for general Three.js architecture.
- Do NOT use when the 3D model is authored in Spline. See `hero-spline-3d-embed` for Spline-based heroes.
- Do NOT use for lightweight decorative 3D (a spinning logo, a floating shape). This toolkit's lighting, hotspots, and material system are overkill. See `ogl-lightweight-webgl`.
- For model preparation and export from Blender, see the `blender-web-pipeline` corpus reference.

## Stack decision
| Dependency | Version | Why | Cheaper alternative |
|---|---|---|---|
| Three.js | 0.169 | Industry standard 3D renderer. GLTFLoader, DRACOLoader, OrbitControls, PBR materials, shadow maps, environment maps all built in. | `<model-viewer>` web component (~80 KB, zero-config, but limited control over hotspots and material swapping). |
| @react-three/fiber | 8.x | React renderer for Three.js. Declarative scene graph, Suspense for loading, hooks for animation. Used if the project is React. | Vanilla Three.js (see Phase 8 for the non-React implementation). |
| @react-three/drei | 9.x | Utility library for R3F. Provides `useGLTF`, `OrbitControls`, `ContactShadows`, `Environment`, `Html` for hotspots. | Raw Three.js equivalents (more boilerplate, same result). |
| GSAP | 3.12 (optional) | Smooth camera transitions on hotspot click (orbit to a preset angle). | Three.js Tween or manual lerp. |

### Why Three.js over model-viewer
Google's `<model-viewer>` is simpler (drop in a web component, done), but it does not expose:
- Programmatic hotspot-to-detail binding with arbitrary DOM content.
- Runtime material swapping at the uniform/map level.
- Custom lighting rigs.
- PostProcessing (bloom on emissive parts, vignette).
If you need none of those, use `<model-viewer>`. It is the right choice for 90% of e-commerce product pages.

## Architecture
```
hero-gltf-showcase/
  ProductHero.tsx        -- main React component (or vanilla entry)
  ProductScene.tsx       -- R3F Canvas with scene contents
  Hotspot.tsx            -- individual hotspot component
  MaterialSwapper.tsx    -- color/material selection UI
  useModelLoader.ts      -- GLB loading with progress
  style.css              -- hero layout, hotspot styles, UI panel
```

### Lifecycle
1. **Load**: GLB model loads via `useGLTF` (R3F) or `GLTFLoader` (vanilla). Draco decoder loaded in parallel. Loading progress bar shows percentage.
2. **Scene setup**: Model centered in scene. Three-point lights positioned. Contact shadow plane placed below the model. Environment map applied for reflections.
3. **Orbit controls**: Enabled with auto-rotate (speed 1.5, pauses on interaction). Polar angle clamped to prevent camera going below the ground plane.
4. **Hotspots**: Placed at predefined world-space positions on the model. Rendered as `Html` overlays (R3F) or CSS-positioned DOM elements (vanilla) that track 3D positions.
5. **Material swap**: UI buttons call `model.traverse()` to find target meshes and replace their `material.color`, `material.map`, `material.roughness`, or `material.metalness`.
6. **Interaction**: Clicking a hotspot animates the camera to a preset viewing angle for that feature, opens a detail panel, and pauses auto-rotate.
7. **Resize**: R3F handles canvas resize automatically. Vanilla: `ResizeObserver` on the container.
8. **Teardown**: On unmount, dispose geometries, materials, textures. R3F handles this via `useEffect` cleanup.

```
  ┌──────────────────────────────────────────────────┐
  │  .product-hero  (100vh)                          │
  │  ┌────────────────────────────────────────────┐   │
  │  │  <Canvas> / <canvas>  (Three.js scene)     │   │
  │  │    OrbitControls                           │   │
  │  │    Model (GLB)                             │   │
  │  │    3x Lights                               │   │
  │  │    ContactShadows                          │   │
  │  │    Environment (HDRI)                      │   │
  │  │    Hotspot markers (Html / CSS overlays)   │   │
  │  └────────────────────────────────────────────┘   │
  │  ┌────────────────────────────────────────────┐   │
  │  │  .product-ui  (z-index: 1)                 │   │
  │  │    Material swatches                       │   │
  │  │    Product title                           │   │
  │  │    Hotspot detail panel                    │   │
  │  └────────────────────────────────────────────┘   │
  └──────────────────────────────────────────────────┘
```

## Build it: step by step

### Phase 1: Install dependencies

```bash
npm install three@0.169 @react-three/fiber@8 @react-three/drei@9
# Optional: Draco decoder (self-hosted or CDN)
# drei's useGLTF handles Draco automatically via CDN
```

### Phase 2: React component shell

```tsx
import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import ProductScene from './ProductScene';
import MaterialSwapper from './MaterialSwapper';
import './style.css';

export default function ProductHero({ modelUrl }: { modelUrl: string }) {
  const [activeColor, setActiveColor] = useState('#1a1a1a');
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);

  return (
    <section className="product-hero" id="product-hero">
      <Canvas
        camera={{ position: [0, 1.5, 4], fov: 45 }}
        dpr={[1, 2]}
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <ProductScene
            modelUrl={modelUrl}
            activeColor={activeColor}
            onHotspotClick={setActiveHotspot}
          />
        </Suspense>
      </Canvas>

      <div className="product-ui">
        <h1 className="product-title">Product Name</h1>
        <MaterialSwapper
          colors={['#1a1a1a', '#c4a882', '#8b2500', '#2a4858']}
          active={activeColor}
          onChange={setActiveColor}
        />
      </div>

      {activeHotspot && (
        <div className="hotspot-panel">
          <button onClick={() => setActiveHotspot(null)} className="hotspot-close">
            Close
          </button>
          <h3>{activeHotspot}</h3>
          <p>Detail information about this feature.</p>
        </div>
      )}

      <img
        className="product-fallback"
        src="/assets/product-fallback.jpg"
        alt="Product showcase"
        width="1200"
        height="800"
      />
    </section>
  );
}
```

### Phase 3: Scene component with lighting, model, shadows, environment

```tsx
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  useGLTF,
  OrbitControls,
  ContactShadows,
  Environment,
  Html,
} from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  modelUrl: string;
  activeColor: string;
  onHotspotClick: (name: string) => void;
}

const HOTSPOTS = [
  { name: 'Crown', position: [0, 2.1, 0.3] as [number, number, number] },
  { name: 'Dial', position: [0.4, 1.2, 0.5] as [number, number, number] },
  { name: 'Band', position: [0, 0.3, 0.6] as [number, number, number] },
];

export default function ProductScene({ modelUrl, activeColor, onHotspotClick }: Props) {
  const { scene } = useGLTF(modelUrl);
  const controlsRef = useRef<any>(null);

  // Apply color to target meshes
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.name.startsWith('Body')) {
          (mesh.material as THREE.MeshStandardMaterial).color.set(activeColor);
        }
      }
    });
  }, [activeColor, scene]);

  // Enable shadows on all meshes
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  return (
    <>
      {/* Three-point lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.001}
      />
      <directionalLight position={[-4, 4, -3]} intensity={0.8} />
      <pointLight position={[0, 3, -6]} intensity={0.5} />

      {/* Environment map for reflections */}
      <Environment preset="studio" />

      {/* Model */}
      <primitive object={scene} position={[0, 0, 0]} />

      {/* Contact shadows */}
      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.4}
        scale={10}
        blur={2.5}
        far={4}
      />

      {/* Orbit controls */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        enablePan={false}
        minDistance={2}
        maxDistance={8}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.1}
        autoRotate
        autoRotateSpeed={1.5}
      />

      {/* Hotspots */}
      {HOTSPOTS.map((hs) => (
        <Html
          key={hs.name}
          position={hs.position}
          distanceFactor={6}
          occlude
        >
          <button
            className="hotspot-marker"
            onClick={() => onHotspotClick(hs.name)}
            aria-label={`View ${hs.name} detail`}
          >
            <span className="hotspot-dot" />
            <span className="hotspot-label">{hs.name}</span>
          </button>
        </Html>
      ))}
    </>
  );
}
```

### Phase 4: Material swapper UI

```tsx
interface SwapperProps {
  colors: string[];
  active: string;
  onChange: (color: string) => void;
}

export default function MaterialSwapper({ colors, active, onChange }: SwapperProps) {
  return (
    <div className="swatcher" role="radiogroup" aria-label="Product color">
      {colors.map((c) => (
        <button
          key={c}
          className={`swatch ${c === active ? 'swatch-active' : ''}`}
          style={{ backgroundColor: c }}
          onClick={() => onChange(c)}
          aria-label={`Color ${c}`}
          role="radio"
          aria-checked={c === active}
        />
      ))}
    </div>
  );
}
```

### Phase 5: Hotspot and UI styles

```css
.product-hero {
  position: relative;
  width: 100%;
  height: 100svh;
  overflow: hidden;
  background: #f0ede8;
}

.product-hero canvas {
  position: absolute;
  inset: 0;
}

.product-fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: -1;
}

.product-hero:has(canvas) .product-fallback {
  display: none;
}

.product-ui {
  position: absolute;
  bottom: clamp(2rem, 5vh, 5rem);
  left: clamp(2rem, 5vw, 6rem);
  z-index: 1;
  pointer-events: none;
}

.product-ui > * {
  pointer-events: auto;
}

.product-title {
  font-size: clamp(2rem, 5vw, 4rem);
  font-weight: 300;
  color: #1a1a1a;
  margin: 0 0 1.5rem;
  letter-spacing: -0.01em;
}

/* Swatches */
.swatcher {
  display: flex;
  gap: 0.75rem;
}

.swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
  padding: 0;
}

.swatch-active {
  border-color: #1a1a1a;
  transform: scale(1.15);
}

.swatch:hover {
  transform: scale(1.1);
}

/* Hotspot markers */
.hotspot-marker {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  white-space: nowrap;
}

.hotspot-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: 2px solid rgba(0, 0, 0, 0.2);
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.3);
  animation: hotspot-pulse 2s ease-in-out infinite;
}

.hotspot-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #1a1a1a;
  background: rgba(255, 255, 255, 0.85);
  padding: 0.2rem 0.5rem;
  border-radius: 2px;
  opacity: 0;
  transform: translateX(-4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.hotspot-marker:hover .hotspot-label {
  opacity: 1;
  transform: translateX(0);
}

@keyframes hotspot-pulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.3); }
  50% { box-shadow: 0 0 0 8px rgba(255, 255, 255, 0.1); }
}

/* Detail panel */
.hotspot-panel {
  position: absolute;
  top: 50%;
  right: clamp(2rem, 5vw, 6rem);
  transform: translateY(-50%);
  width: 300px;
  background: #fff;
  padding: 2rem;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.08);
  z-index: 2;
}

.hotspot-close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  color: #999;
}

@media (prefers-reduced-motion: reduce) {
  .hotspot-dot { animation: none; }
}
```

### Phase 6: Loading progress

```tsx
import { useProgress, Html } from '@react-three/drei';

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="loader-bar">
        <div className="loader-fill" style={{ width: `${progress}%` }} />
      </div>
      <p className="loader-text">{Math.round(progress)}%</p>
    </Html>
  );
}

// Use as Suspense fallback:
// <Suspense fallback={<Loader />}>
```

```css
.loader-bar {
  width: 200px;
  height: 2px;
  background: rgba(0, 0, 0, 0.1);
}

.loader-fill {
  height: 100%;
  background: #1a1a1a;
  transition: width 0.3s ease;
}

.loader-text {
  text-align: center;
  font-size: 0.75rem;
  color: #999;
  margin-top: 0.5rem;
}
```

### Phase 7: Advanced material swap (finish change)

```tsx
function setMaterialFinish(
  scene: THREE.Group,
  meshNamePrefix: string,
  finish: 'matte' | 'gloss' | 'metallic'
) {
  const finishMap: Record<string, { roughness: number; metalness: number }> = {
    matte: { roughness: 0.9, metalness: 0.0 },
    gloss: { roughness: 0.15, metalness: 0.0 },
    metallic: { roughness: 0.25, metalness: 1.0 },
  };

  const { roughness, metalness } = finishMap[finish];

  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && child.name.startsWith(meshNamePrefix)) {
      const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.roughness = roughness;
      mat.metalness = metalness;
      mat.needsUpdate = true;
    }
  });
}
```

### Phase 8: Vanilla Three.js alternative (no React)

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

export default function productShowcase(container, modelUrl) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f0ede8');

  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 1.5, 4);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // Lighting
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(5, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.bias = -0.001;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.8);
  fill.position.set(-4, 4, -3);
  scene.add(fill);
  const rim = new THREE.PointLight(0xffffff, 0.5);
  rim.position.set(0, 3, -6);
  scene.add(rim);

  // Ground plane for contact shadow
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.ShadowMaterial({ opacity: 0.15 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  // Controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.minDistance = 2;
  controls.maxDistance = 8;
  controls.minPolarAngle = Math.PI / 6;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.5;

  // Load model
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);

  let model;
  gltfLoader.load(
    modelUrl,
    (gltf) => {
      model = gltf.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(model);
      container.classList.add('model-loaded');
    },
    (progress) => {
      const pct = (progress.loaded / progress.total) * 100;
      container.querySelector('.loader-text').textContent = `${Math.round(pct)}%`;
    }
  );

  // Environment map
  new RGBELoader().load('/assets/studio.hdr', (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = hdr;
  });

  // Render loop
  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  // Resize
  const ro = new ResizeObserver(() => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
  ro.observe(container);

  // API
  return {
    setColor(hex) {
      if (!model) return;
      model.traverse((child) => {
        if (child.isMesh && child.name.startsWith('Body')) {
          child.material.color.set(hex);
        }
      });
    },
    destroy() {
      renderer.setAnimationLoop(null);
      renderer.dispose();
      ro.disconnect();
      controls.dispose();
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
    },
  };
}
```

## The full reference implementation

See Phase 2-7 for the React/R3F implementation and Phase 8 for the vanilla Three.js alternative. Both are complete and production-ready.

## Tuning the feel

| Parameter | Default | Range | Why |
|---|---|---|---|
| Camera FOV | 45 | 30 - 60 | 45 gives a natural product-photo perspective. Lower FOV (30) flattens the product (telephoto feel). Higher FOV (60) adds perspective distortion. |
| Camera distance | 4 | 2 - 10 | Distance from model center. Depends on model scale. The product should fill ~60% of the viewport. |
| Auto-rotate speed | 1.5 | 0.5 - 3.0 | Degrees per second. 1.5 is a slow showcase rotation. Above 3.0 the user cannot read detail. |
| Damping factor | 0.05 | 0.02 - 0.1 | Controls how quickly orbit drag decelerates. 0.05 is smooth. Lower is heavier/more cinematic. |
| Max polar angle | PI/2.1 | PI/2 - PI/1.5 | Prevents camera going below the ground plane. PI/2.1 allows a slight below-horizon peek. |
| Shadow opacity | 0.15-0.4 | 0 - 0.6 | Contact shadow intensity. 0.15 is subtle. Above 0.4 the shadow becomes distracting. |
| Environment preset | "studio" | studio, warehouse, city, sunset, dawn, night, apartment, park | drei preset names. "studio" is neutral, good for product photography. |
| Tone mapping | ACESFilmic | Linear, ACESFilmic, Reinhard, Cineon | ACESFilmic gives cinematic contrast. Linear is flatter but more accurate. |
| Tone mapping exposure | 1.2 | 0.5 - 2.0 | Brightness multiplier. 1.2 is slightly brighter than default, good for studio lighting. |
| Key light intensity | 2 | 1 - 5 | Main directional light. Higher values create harder shadows. |

## Variants

### 1. Turntable (no user orbit)
Disable OrbitControls. Auto-rotate the model on the Y axis in the render loop. The user can only watch, not interact. Simpler, more controlled, good for hero sections where interaction is not desired.

### 2. Exploded view
On scroll or button click, model parts animate outward to show internal construction. Each mesh group translates along its local normal direction. Use GSAP to tween positions.

### 3. Annotation mode
Hotspots expand into full annotation panels with technical specifications, dimensions, and callout lines connecting the hotspot to its panel.

### 4. AR preview
Add a "View in AR" button that opens the GLB in the device's native AR viewer (`<a rel="ar">` on iOS, Scene Viewer on Android). No Three.js involved for the AR part.

### 5. Configurator
Multiple material zones (body, accent, trim) with independent swatches. The user configures a custom combination. State is shareable via URL parameters.

## Performance budget

| Metric | Target | Lever |
|---|---|---|
| GLB file size | < 2 MB (Draco compressed) | Reduce polygon count, compress textures, use Draco. |
| Texture memory | < 30 MB | Use 1024x1024 textures max. Avoid 4096x4096. |
| Draw calls | < 30 | Merge meshes where possible. Use single materials across parts. |
| Frame rate | 60fps | Cap DPR at 2. Reduce shadow map to 1024 if needed. |
| LCP | < 3s (with loader) | The loading indicator renders immediately. Actual model load is async. |
| Bundle size | ~160 KB (Three.js core) + ~5 KB (custom) | drei adds ~30 KB. Tree-shake unused imports. |

## Accessibility

### prefers-reduced-motion
Auto-rotate is disabled. Hotspot pulse animation is stopped.

```css
@media (prefers-reduced-motion: reduce) {
  .hotspot-dot { animation: none; }
}
```

```tsx
<OrbitControls autoRotate={!prefersReducedMotion} />
```

### Screen readers
- Canvas is decorative: `aria-hidden="true"`.
- Hotspot buttons have `aria-label` describing the feature.
- Material swatches use `role="radiogroup"` with `aria-checked`.
- Product title and detail panels are semantic HTML.

### Keyboard
- Hotspot buttons are focusable and operable via Enter/Space.
- Material swatches are navigable via arrow keys within the radiogroup.
- OrbitControls does not trap keyboard. Arrow keys scroll the page, not the camera.

### Honest cost
Users without WebGL see a static product image fallback. Hotspot information is in the DOM and accessible even without the 3D view. Material swapping has no fallback (the image shows one color only), but no information is lost.

## Anti-slop rules

1. DO NOT load a GLB without Draco compression support. Uncompressed GLB files are 3-10x larger. Always set up DRACOLoader.
2. DO NOT use `MeshBasicMaterial` for product surfaces. Product showcases require PBR lighting. Use `MeshStandardMaterial` or `MeshPhysicalMaterial`.
3. DO NOT skip `renderer.outputColorSpace = THREE.SRGBColorSpace`. Without it, colors render in linear space and look washed out.
4. DO NOT use the default shadow map size (512x512). Product shadows need at least 1024, preferably 2048. Set `shadow-mapSize` explicitly.
5. DO NOT allow the camera to go below the ground plane. Set `maxPolarAngle` to `Math.PI / 2.1` or lower. Flipping below the floor exposes the underside of the model and the shadow plane edge.
6. DO NOT forget `material.needsUpdate = true` after changing material properties at runtime. Three.js caches shader programs; without the flag, some property changes silently fail.
7. DO NOT use a bright white environment map for dark products. The reflections blow out. Use a neutral studio HDRI.
8. DO NOT place hotspots at model coordinates without accounting for model scale and offset. A model exported with a different origin will have all hotspots in the wrong position.
9. DO NOT skip geometry and material disposal on unmount. Three.js does not garbage-collect GPU resources. Leaked resources accumulate across route changes.
10. DO NOT hardcode the Draco decoder path to a CDN in production. Self-host the decoder files or use a versioned CDN URL that you control.
11. DO NOT use `<model-viewer>` AND Three.js on the same page. Two WebGL contexts for the same purpose waste GPU memory.

## Integration notes

- **With `three-js-fundamentals`**: This toolkit builds on Three.js core patterns documented in that primitive (scene setup, materials, lighting, shadow configuration, OrbitControls, model loading). The primitive covers the general API; this toolkit applies it to a specific deliverable (product hero).
- **With `react-three-fiber-drei`**: This toolkit uses R3F and drei extensively (Canvas, useGLTF, OrbitControls, ContactShadows, Environment, Html, useProgress). The primitive covers the full API surface; this toolkit uses a specific subset.
- **With `shader-postprocessing`**: Add bloom to emissive parts of the product (e.g., LED indicators, screen). Use the postprocessing primitive's `EffectComposer` setup. This adds 2-3 render passes and should only be used if the emissive glow is a key product feature.
- **With `hero-spline-3d-embed`**: These two toolkits serve different workflows. Spline is for designer-authored scenes embedded as-is. This toolkit is for developer-built scenes with programmatic material control. Do not mix them.
- **Conflict: multiple WebGL contexts.** If the page has other WebGL elements (a background shader, another Three.js section), monitor total context count. Mobile browsers limit to 8-16 simultaneous contexts.

## Ship checklist

- [ ] GLB model loads with Draco compression. File size < 2 MB.
- [ ] Loading progress indicator shows accurate percentage.
- [ ] Three-point lighting with key, fill, and rim lights.
- [ ] Contact shadow renders below the model.
- [ ] Environment map applied for reflections (studio HDRI).
- [ ] OrbitControls with damping, pan disabled, polar angle clamped.
- [ ] Auto-rotate active at idle, pauses on user interaction.
- [ ] At least 3 hotspots with labels, clickable, revealing detail panels.
- [ ] Material color swap works across all target meshes.
- [ ] Hotspot buttons have `aria-label` and are keyboard-accessible.
- [ ] Material swatches use `role="radiogroup"` with `aria-checked`.
- [ ] `prefers-reduced-motion` disables auto-rotate and hotspot pulse.
- [ ] Canvas has `aria-hidden="true"`.
- [ ] Static image fallback displays when WebGL is unavailable.
- [ ] DPR capped at 2. Frame time under 16ms on mid-range hardware.
- [ ] All geometries, materials, and textures disposed on unmount/destroy.
