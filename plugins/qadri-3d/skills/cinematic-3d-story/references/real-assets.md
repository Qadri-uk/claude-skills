# Real assets: skies, surfaces, trees, people, props

Everything here is CC0 (Poly Haven) or MIT (three.js examples). Total for the reference
project: 4.8 MB, loaded after first paint and swapped in.

## Fetching from Poly Haven
The API refuses requests without a User-Agent (HTTP 403). `scripts/polyhaven.py` handles it:
```bash
python3 scripts/polyhaven.py list skies            # HDRIs in the skies category (look for *_puresky)
python3 scripts/polyhaven.py hdri kloofendal_48d_partly_cloudy_puresky 1k out/
python3 scripts/polyhaven.py texture concrete 1k out/          # Diffuse jpg
python3 scripts/polyhaven.py model potted_plant_02 1k out/     # glTF with its files
```
Sizes vary wildly: check before downloading (a "small tree" can be 100-900 MB). Good picks:
skies `kloofendal_48d_partly_cloudy_puresky` (day), `qwantani_sunset_puresky`;
textures `concrete`, `asphalt_02`, `leafy_grass`, `brown_mud_02`, `rectangular_paving`,
`marble_01`, `wood_floor`, facades `rectangular_facade_tiles_02`, `brick_wall_08`;
models `potted_plant_02`, `modern_arm_chair_01`, `modern_coffee_table_01`;
billboard source `island_tree_02` (46 MB once, offline only).

## HDRI sky that matches the scene's sun
Load with `HDRLoader` (r180+, formerly RGBELoader) as HalfFloat. On load, scan the upper
half for the brightest pixel: that is the sun. Convert to a direction with three's
equirect convention (`u = atan(z, x) / 2pi + 0.5`, `v = asin(y) / pi + 0.5`, flipY).
Also average a band just above the horizon for the fog colour.

Sky shader samples both HDRIs by view direction with a rotation each:
`rot = hdrSunAzimuth - sceneSunAzimuth`, so the photographed sun appears exactly where
your DirectionalLight is; elevation comes from the HDRI. Blend day to sunset with the
story's night value, then to a starry gradient. Include `<tonemapping_fragment>` and
`<colorspace_fragment>` in the custom shader.

Reflections: PMREM-bake a scene holding only the sky mesh (sharing its material), keyed
by a coarse sky state, cached, baked in idle time (see performance.md). Interiors switch
to `RoomEnvironment` for soft studio reflections.

## Textures without stretching
- Ground shapes (ShapeGeometry) have UVs in metres: `repeat = 1 / tileSizeMetres`.
- Instanced boxes stretch box UVs. For city blocks, sample the texture in the fragment
  shader with world-space UVs (`vec2(u, worldY) * 0.09`, `u` = world x or z by face normal),
  pick between two facade textures by a hash of the block's position, then draw the
  lit-window grid on top. All via `onBeforeCompile`.
- Set `colorSpace = SRGBColorSpace`, `RepeatWrapping`, anisotropy 8. WebP at 1024 (512 for
  facades) is plenty.

## Scanned tree as a billboard
`scripts/render-billboard/` loads any glTF in headless Chromium, renders it orthographically
from two sides 90 degrees apart onto a transparent 1024x768 atlas, and reports its world
size. Crop the empty margin, save as WebP with alpha (about 90 KB). In the scene: two
instanced PlaneGeometry quads per tree (second rotated 90 degrees), UVs remapped to each
half, `alphaTest 0.45`, `DoubleSide`, and a `MeshDepthMaterial` with the same map and
alphaTest as `customDepthMaterial` so shadows are leaf-shaped.

## People: one rigged mannequin, many clones
three.js `examples/models/gltf/Xbot.glb` (Mixamo rig; clips idle, walk, run, agree,
headShake, sad_pose, sneak_pose), meshopt-compressed to 0.6 MB.
```ts
const k = 1.74 / bboxHeight;                       // to metres
const o = SkeletonUtils.clone(xbot.scene); o.scale.setScalar(k);
const mixer = new THREE.AnimationMixer(o);
mixer.clipAction(clip('idle')).play();
const nod = mixer.clipAction(THREE.AnimationUtils.makeClipAdditive(clip('agree').clone()));
nod.play(); nod.setEffectiveWeight(greet);         // additive nod on top of idle
// after mixer.update(): headBone.rotation.y += lookAtCamera * greet
```
Replace its materials with a matte off-white and a darker joint material (archviz figures).
Set `frustumCulled = false` on skinned meshes. Update mixers only for visible groups.
Walkers: set position along a path each frame, walk clip timeScale to match speed.

## Props
`npx @gltf-transform/cli optimize in.gltf out.glb --compress meshopt --texture-compress webp --texture-size 512`
(GLTFLoader needs `setMeshoptDecoder(MeshoptDecoder)`). Poly Haven models are real-world
scale. Normalise height from the bounding box only when placing a model as a stand-in.

## Progressive swap
Mount the procedural world first. `loadAssets()` resolves with everything; `applyAssets()`
sets maps (`material.needsUpdate = true`), hides procedural stand-ins, adds models and
figures, uploads textures (`renderer.initTexture`), precompiles, then idle-bakes
reflections. Surface progress in the UI ("LOADING REAL SKIES & MATERIALS 7/12").
For a one-file build, the asset loader reads data URIs from `window.__MH_ASSETS` instead
of `/public` paths.
