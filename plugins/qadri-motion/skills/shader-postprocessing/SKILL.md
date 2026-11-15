---
name: shader-postprocessing
description: Use when adding full-screen post-processing effects to a Three.js/R3F scene via EffectComposer or the postprocessing library, covering bloom, chromatic aberration, film grain, vignette, depth of field, writing a custom pass, and the real render-target cost of each effect against when it isn't worth the frame budget.
---

# Shader Postprocessing

## When to use this
- Your 3D scene needs a full-screen effect applied after the main render (bloom on bright/emissive materials, chromatic aberration for a lens-like feel, film grain for texture, vignette for framing, depth of field for focus falloff).
- You need to chain multiple such effects together in a defined order, since each depends on reading the previous pass's output.
- You want to write a custom full-screen effect (e.g. a stylized color grade, a glitch effect) that isn't covered by a stock pass.
- Do NOT reach for postprocessing as a first step when a simpler in-shader or in-material solution exists: `MeshStandardMaterial.emissive` plus tone mapping alone often gets you most of the "glow" people reach for `UnrealBloomPass` for; a CSS `box-shadow`/`filter` on a DOM overlay is far cheaper than a full postprocessing pipeline for effects on 2D UI. Only add a compositor pass when the effect genuinely requires reading rendered pixel data (bloom needs to know what's bright, DOF needs a depth buffer, grain needs to composite over the final image).

## Mental model
Every post-processing effect works the same fundamental way: instead of rendering directly to the visible canvas, you render the scene into an off-screen texture (a render target / framebuffer), then run one or more full-screen fragment shader passes that read that texture as input and write a transformed result to another render target, chaining passes until the final one writes to the actual screen. `EffectComposer` (from Three.js's examples, or the more actively maintained third-party `postprocessing` library) manages this chain of render targets and passes for you, handling the ping-pong buffer swapping between passes automatically.

The cost model to internalize: **every pass is a full additional render of the entire screen's worth of pixels**, at whatever resolution the composer is configured for. A scene with a 3-pass chain (render, bloom, vignette) is not "the same cost plus a little," it is 2-3x the fragment shader work of the base scene render, and some effects (bloom in particular) are internally multi-pass themselves (bright-pass extraction, then several blur passes at different mip levels, then a composite pass), meaning `UnrealBloomPass` alone can be 4-6 effective full-screen passes.

Bloom specifically works by extracting only the pixels above a brightness threshold into a separate buffer, blurring that buffer heavily (often at progressively downsampled resolutions for a cheap large-radius blur, this is why quality bloom implementations use mip-mapped blur chains), then additively compositing the blurred bright regions back over the original image. This is why bloom on a scene with no genuinely bright/emissive materials does nothing visible: there's nothing above the threshold to extract.

Depth of field needs a linear depth buffer as an additional input beyond color, meaning the base scene render must write depth (usually automatic via `WebGLRenderTarget`'s depth texture attachment), and the DOF pass uses that depth to compute a per-pixel blur radius based on distance from a focal plane, making it one of the more expensive stock effects since the blur itself is often a large-kernel separable blur applied per depth region.

The practical discipline this skill is about: know the per-effect cost, know what visual problem each one actually solves, and be willing to say a requested effect isn't worth its frame budget for a given target device tier, rather than chaining five passes because they're each individually easy to add.

## Setup
```bash
npm install three@0.169.0 postprocessing@6.36.4
```
```js
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ChromaticAberrationEffect, NoiseEffect, VignetteEffect, DepthOfFieldEffect } from 'postprocessing'
```
The `postprocessing` npm package (Vanruesc's library) is preferred over Three.js's own bundled `examples/jsm/postprocessing` in most new projects: it batches compatible effects into a single shader pass automatically (`EffectPass` merges multiple `Effect` instances), which directly addresses the "every pass is a full re-render" cost problem above. Three.js's own `EffectComposer`/`*Pass` classes remain a valid, more minimal alternative if you want fewer dependencies and only need one or two effects.

For R3F, pair with `@react-three/postprocessing`:
```bash
npm install @react-three/postprocessing@2.16.3
```

## Core API
| API | Signature | Note |
|---|---|---|
| `new EffectComposer(renderer, opts?)` | constructor (`postprocessing` lib) | manages render target chain |
| `new RenderPass(scene, camera)` | constructor | the mandatory first pass, renders the actual scene |
| `new EffectPass(camera, ...effects)` | constructor | merges multiple `Effect` instances into one shader pass |
| `BloomEffect({ intensity, luminanceThreshold, luminanceSmoothing, mipmapBlur })` | constructor | glow on bright pixels |
| `ChromaticAberrationEffect({ offset })` | constructor | RGB channel separation, lens-like fringing |
| `NoiseEffect({ premultiply, blendFunction })` | constructor | film grain |
| `VignetteEffect({ darkness, offset })` | constructor | edge darkening |
| `DepthOfFieldEffect({ focusDistance, focalLength, bokehScale })` | constructor | focus-distance-based blur, needs scene depth |
| `composer.addPass(pass)` | method | appends to the render chain |
| `composer.render(deltaTime)` | method | replaces `renderer.render()` in your loop |
| `composer.setSize(w, h)` | method | must be called on resize, mirrors renderer resize |
| `<EffectComposer>` (R3F) | component | `@react-three/postprocessing` declarative wrapper |

## Recipes

### Minimal composer setup replacing direct renderer.render calls
The baseline structure every postprocessing setup builds from.
```js
import * as THREE from 'three'
import { EffectComposer, RenderPass, EffectPass, BloomEffect } from 'postprocessing'

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))

const bloomEffect = new BloomEffect({
  intensity: 1.2,
  luminanceThreshold: 0.8,
  luminanceSmoothing: 0.3,
  mipmapBlur: true,
})
composer.addPass(new EffectPass(camera, bloomEffect))

function resize() {
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  renderer.setSize(width, height, false)
  composer.setSize(width, height)
  camera.aspect = width / height
  camera.updateProjectionMatrix()
}
resize()
window.addEventListener('resize', resize)

const clock = new THREE.Clock()
renderer.setAnimationLoop(() => {
  composer.render(clock.getDelta())
})
```

### Batched multi-effect chain (bloom + vignette + grain in one merged pass)
Merges three effects into a single `EffectPass` for one shader compile/execution instead of three separate full-screen passes.
```js
import { EffectComposer, RenderPass, EffectPass, BloomEffect, VignetteEffect, NoiseEffect, BlendFunction } from 'postprocessing'

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))

const bloom = new BloomEffect({ intensity: 0.8, luminanceThreshold: 0.75, mipmapBlur: true })
const vignette = new VignetteEffect({ darkness: 0.6, offset: 0.3 })
const grain = new NoiseEffect({ premultiply: true, blendFunction: BlendFunction.SOFT_LIGHT })
grain.blendMode.opacity.value = 0.06

composer.addPass(new EffectPass(camera, bloom, vignette, grain))
```

### Chromatic aberration reacting to scroll velocity or interaction intensity
Drives an effect's uniform dynamically instead of a static constant value, common for velocity-reactive lens feel.
```js
import { ChromaticAberrationEffect, EffectPass } from 'postprocessing'

const chromaticAberration = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0, 0) })
composer.addPass(new EffectPass(camera, chromaticAberration))

let scrollVelocity = 0
window.addEventListener('scroll', () => {
  scrollVelocity = Math.min(0.012, Math.abs(window.scrollY - lastScrollY) * 0.0005)
  lastScrollY = window.scrollY
})
let lastScrollY = window.scrollY

renderer.setAnimationLoop((time) => {
  scrollVelocity *= 0.9 // decay toward zero each frame
  chromaticAberration.offset.set(scrollVelocity, scrollVelocity * 0.5)
  composer.render()
})
```

### Depth of field focused on a specific object
Uses `DepthOfFieldEffect` with a target to auto-compute focus distance, common for product-hero focus-pull effects.
```js
import { DepthOfFieldEffect, EffectPass } from 'postprocessing'

const dofEffect = new DepthOfFieldEffect(camera, {
  focusDistance: 0.02,
  focalLength: 0.05,
  bokehScale: 3.0,
})

// auto-focus on a specific mesh by feeding its screen-space depth
function updateFocus(targetMesh) {
  const distance = camera.position.distanceTo(targetMesh.position)
  dofEffect.target = targetMesh.position.clone()
}

composer.addPass(new EffectPass(camera, dofEffect))
```

### Custom full-screen pass (simple duotone color grade)
Writing your own `Effect` subclass for the `postprocessing` library, the pattern for anything not covered by stock effects.
```js
import { Effect, BlendFunction } from 'postprocessing'
import { Uniform, Color } from 'three'

const duotoneFragmentShader = `
  uniform vec3 darkColor;
  uniform vec3 lightColor;
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float luminance = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));
    vec3 duotone = mix(darkColor, lightColor, luminance);
    outputColor = vec4(duotone, inputColor.a);
  }
`

class DuotoneEffect extends Effect {
  constructor({ darkColor = new Color(0x0a0a2a), lightColor = new Color(0xffe0a0) } = {}) {
    super('DuotoneEffect', duotoneFragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([
        ['darkColor', new Uniform(darkColor)],
        ['lightColor', new Uniform(lightColor)],
      ]),
    })
  }
}

composer.addPass(new EffectPass(camera, new DuotoneEffect()))
```

### R3F declarative postprocessing setup with conditional quality tiers
Uses `@react-three/postprocessing` to build the same bloom+vignette+grain chain declaratively, gated by a device performance tier.
```jsx
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

function PostFX({ quality }) {
  if (quality === 'low') return null // skip postprocessing entirely on low-end devices

  return (
    <EffectComposer multisampling={quality === 'high' ? 4 : 0}>
      <Bloom intensity={0.8} luminanceThreshold={0.75} mipmapBlur />
      <Vignette darkness={0.6} offset={0.3} />
      {quality === 'high' && (
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.06} />
      )}
    </EffectComposer>
  )
}
```

## Tuning the feel
- Bloom `luminanceThreshold` 0.7-0.85 (out of the tone-mapped 0-1 range) so only genuinely bright/emissive elements bloom, not general midtones; a threshold near 0 blooms the entire scene into a hazy mess.
- Bloom `intensity` 0.4-1.2 for a believable glow; above 1.5 it reads as an obvious effect rather than physically-plausible light bleed, which is sometimes the goal (stylized/sci-fi) but should be a deliberate choice.
- Vignette `darkness` 0.4-0.7, `offset` 0.2-0.4; higher darkness with a small offset creates a tight, cinematic frame, lower darkness with a larger offset is barely perceptible and mostly useful for subtly directing eye focus toward center.
- Film grain opacity 0.03-0.08 blended with `SOFT_LIGHT` or `OVERLAY`; above 0.1 it reads as a scratched/damaged film effect rather than subtle texture, which again may be intentional but should be deliberate.
- Chromatic aberration offset in the 0.0005-0.003 range (as a fraction of screen size) for a subtle lens-realism cue; above 0.005 it becomes an obvious glitch/distortion effect.

## Performance
- Count effective full-screen passes, not "number of effects added": a merged `EffectPass(camera, bloom, vignette, grain)` is far cheaper than three separate `composer.addPass()` calls each wrapping one effect, since the `postprocessing` library fuses compatible effects' shader code into one compiled program and one execution.
- Bloom's internal cost is dominated by its blur chain; `mipmapBlur: true` (progressively downsampled blur) is significantly cheaper than a naive large-kernel single-resolution blur and should be preferred unless you have a specific reason not to.
- Depth of field is one of the most expensive stock effects due to its large-kernel, depth-aware blur; reserve it for hero/showcase moments rather than an always-on scene-wide effect, and consider a cheaper fixed-blur "focus falloff" fake for less critical use cases.
- Render at reduced internal resolution for expensive effect chains on lower-end devices (`composer.setSize(width * 0.75, height * 0.75)` then upscale via CSS on the canvas), a well-established technique to keep frame budget for post-processing-heavy scenes on mobile GPUs.
- Establish device/quality tiers explicitly (as in the R3F recipe) rather than shipping the same full effect chain unconditionally to all devices; profile actual frame time with the effect chain active on a real mid-tier device, not just a development machine, before deciding a chain is shippable.

## Accessibility
```js
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const chromaticAberration = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0, 0) })
if (!prefersReduced) {
  // only wire up velocity-reactive or animated uniform changes when motion is allowed
}
```
- Postprocessing effects are visual/atmospheric, not informational, so screen reader impact is minimal; the main accessibility concern is visual comfort and readability.
- High-intensity chromatic aberration, film grain, and vignette can all reduce legibility of any text rendered inside the 3D scene or composited near its edges; verify contrast and clarity with effects active, not just on the clean base render.
- Rapidly animated postprocessing values (pulsing bloom, flickering grain) carry the same vestibular-discomfort risk as any other continuous full-viewport motion; keep animated effect parameters subtle and provide a `prefers-reduced-motion` path that holds them static.

## Anti-slop rules
- Never add a postprocessing pass "because it looks cool in the demo" without checking whether the scene actually has content that effect acts on; bloom with no bright/emissive materials, DOF with no depth variation in the composition, are wasted frame budget with zero visible result.
- Never stack unmerged individual `EffectPass` calls when the `postprocessing` library's automatic effect-merging via a single `EffectPass(camera, ...effects)` call would combine them into one pass; check your effect chain's actual pass count, not just effect count.
- Never enable depth of field as an always-on scene-wide effect without testing its cost on a real target-tier device; it is the single most likely effect to blow a mobile frame budget.
- Never ship the same maximal effect chain to all devices; define at least a low/medium/high quality tier and gate expensive effects (DOF, high-res bloom, multisampling) behind it.
- Never forget `composer.setSize()` on resize alongside the renderer's own resize; a stale composer size produces blurry or misaligned post-processed output after any viewport change.
- Never crank grain/vignette/chromatic-aberration intensities to make an effect "obviously visible" during development and then ship those debug-tuned values; dial them back to the subtle end of their range for production unless a strong stylized look is the explicit design intent.

## Checklist
- [ ] Effect chain built as merged `EffectPass` calls where compatible, not one pass per effect
- [ ] Bloom threshold/intensity checked against actual scene brightness, not left at library defaults blindly
- [ ] `composer.setSize()` called on every resize alongside renderer resize and camera aspect update
- [ ] Quality tiers defined (low/medium/high) gating expensive effects like DOF and multisampling
- [ ] Real frame time profiled on a mid-tier device with the full effect chain active
- [ ] `prefers-reduced-motion` holds animated effect parameters static rather than continuously varying
- [ ] Text/UI legibility verified with effects active, not only on the clean base render
- [ ] Debug-tuned high-intensity effect values dialed back before shipping
- [ ] Depth of field (if used) reserved for specific hero moments, not scene-wide default
- [ ] Custom `Effect` subclasses (if any) tested for correct blend mode composition with the rest of the chain
