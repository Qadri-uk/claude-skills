# Sources -- hero-gltf-product-showcase

## Corpus files mined

| File | What it contributed |
|---|---|
| `_raw/freshtechbro_claudedesignskills/.claude/skills/threejs-webgl/SKILL.md` | Core Three.js patterns: scene setup, camera, renderer, lighting strategies (three-point lighting), shadow configuration, raycasting, model loading (GLTFLoader + DRACOLoader), OrbitControls setup. |
| `_raw/freshtechbro_claudedesignskills/.claude/skills/react-three-fiber/SKILL.md` | R3F patterns: Canvas setup, useFrame, useThree, useLoader, Suspense integration for async model loading. |
| `_raw/freshtechbro_claudedesignskills/.claude/skills/web3d-integration-patterns/SKILL.md` | Layered architecture pattern (3D layer + UI layer), Three.js + GSAP integration for camera transitions, scroll-driven 3D animation patterns. |
| `_raw/freshtechbro_claudedesignskills/.claude/skills/blender-web-pipeline/SKILL.md` | GLB export optimization: Draco compression settings, texture baking, LOD generation, batch export scripts, web optimization targets (file size, polygon count, texture resolution). |
| `_raw/dominikmartn_hue/references/hero-stage.md` | Hero stage composition model. Object-on-spotlight preset informed the studio lighting + ground shadow + centered product architecture. |

## Primitives cross-referenced (not duplicated)

| Primitive slug | What this toolkit defers to it for |
|---|---|
| `three-js-fundamentals` | Three.js core API: materials table, light types, shadow setup, InstancedMesh, debugging tools, common bugs. |
| `react-three-fiber-drei` | R3F API: Canvas, useFrame, useThree, useGLTF, OrbitControls, ContactShadows, Environment, Html, useProgress. |
| `shader-postprocessing` | Post-processing effects (bloom, vignette) for emissive product features. |
| `easing-curves-timing-design` | Easing for camera transitions on hotspot click. |

## Written from expertise

- Product showcase architecture (hotspot positioning, material swap API, auto-rotate lifecycle).
- Finish tuning table (roughness/metalness values for real-world materials).
- drei Environment preset recommendations per product category.
- OrbitControls auto-rotate pause/resume pattern.
- Vanilla Three.js alternative implementation.
- Accessibility architecture (radiogroup swatches, hotspot aria-labels).
