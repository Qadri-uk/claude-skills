# Shader Postprocessing Reference

## Effect cost tiers (approximate relative GPU cost per full-screen pass, illustrative not benchmarked)
| Effect | Relative cost | Why |
|---|---|---|
| Vignette | Very low | simple per-pixel radial falloff multiply, no sampling of neighboring pixels |
| Film grain / noise | Low | per-pixel hash/noise function, no neighbor sampling |
| Chromatic aberration | Low-moderate | 3 texture samples per pixel (one per channel, offset) instead of 1 |
| Color grading / LUT | Low-moderate | one extra texture lookup (3D LUT) per pixel |
| Bloom (mipmap blur) | Moderate | threshold extraction + several downsampled blur passes + composite, but each downsampled pass is cheap due to fewer pixels |
| Bloom (naive single-res blur) | High | large-kernel blur at full resolution, avoid this implementation style |
| SSAO (ambient occlusion) | High | multiple depth/normal samples per pixel in a kernel, often with a blur pass after |
| Depth of field | Very high | large variable-radius blur informed by per-pixel depth, often multi-pass itself |
| Motion blur | High | requires velocity buffer generation plus a directional blur pass |

## `postprocessing` library BlendFunction reference
| BlendFunction | Effect |
|---|---|
| `NORMAL` | standard alpha-composite, replaces underlying pixels per the effect's alpha |
| `ADD` | additive, good for glow/bloom-like effects |
| `SCREEN` | lightens, similar visual family to ADD but with different falloff |
| `MULTIPLY` | darkens, good for vignette-like or shadow-tinting effects |
| `SOFT_LIGHT` / `OVERLAY` | good for grain/texture effects that should read as subtle surface detail rather than a flat layer |
| `SET` | fully replace, ignoring blend math, rarely used except in custom debug passes |

## Three.js's own `examples/jsm/postprocessing` classes (if avoiding the third-party `postprocessing` package)
```js
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.85))
composer.addPass(new OutputPass()) // required last pass: applies tone mapping + color space conversion that EffectComposer's intermediate targets otherwise skip
```
Critical detail: Three.js's own `EffectComposer` renders intermediate passes in linear space without automatic output color space conversion; `OutputPass` (added in more recent Three.js versions) must be the final pass to correctly apply `renderer.outputColorSpace` and `renderer.toneMapping`, otherwise the final composited image looks washed out or incorrectly toned compared to a non-postprocessed render. The third-party `postprocessing` library's `EffectComposer` handles this automatically without needing an explicit final pass.

## Multisampling / anti-aliasing with postprocessing active
Enabling `antialias: true` on the base `WebGLRenderer` has no effect once you render to an off-screen render target for postprocessing (render targets are not automatically multisampled by that renderer flag). Anti-aliasing with postprocessing requires either:
1. A multisampled render target: `new EffectComposer(renderer, { multisampling: 4 })` (`postprocessing` library) or manually configuring `WebGLRenderTarget({ samples: 4 })`.
2. An SMAA/FXAA post-effect pass applied as part of the chain instead of true multisampling, cheaper but lower quality.
```js
const composer = new EffectComposer(renderer, { multisampling: 4, frameBufferType: THREE.HalfFloatType })
```
`HalfFloatType` for the frame buffer is recommended when bloom is in the chain, since bloom's threshold extraction benefits from HDR-range intermediate values rather than being clamped to 0-1 before the extraction step.

## Debugging a postprocessing chain with no visible effect
1. Confirm `RenderPass` is the first pass added; a chain missing it renders nothing (no scene content to process).
2. Confirm `composer.render()` is called instead of `renderer.render()` in the animation loop; leaving the direct renderer call in place bypasses the entire composer.
3. For bloom specifically, confirm the scene has pixels above `luminanceThreshold` after tone mapping; use `renderer.toneMappingExposure` to boost temporarily while debugging to confirm the threshold logic is the issue, not the emissive material setup.
4. Check console for shader compile errors from a custom `Effect` class; syntax errors in the injected `mainImage` function fail silently in some browsers without an obvious visual symptom beyond "the effect does nothing."

## Quality tier decision matrix
| Device tier (heuristic) | Recommended chain |
|---|---|
| Low (integrated GPU, older mobile, `navigator.hardwareConcurrency <= 4`) | No postprocessing, or vignette only |
| Medium (typical mid-range mobile, laptop integrated graphics) | Bloom (mipmap) + vignette, no multisampling, reduced internal resolution (0.75x) |
| High (discrete GPU, recent flagship mobile) | Full chain: bloom + vignette + grain + chromatic aberration, multisampling 4x |
| Showcase/hero-moment only (not applied globally) | Depth of field, only active during a specific focused camera shot, disabled otherwise |

A pragmatic runtime heuristic combines `navigator.hardwareConcurrency`, `navigator.deviceMemory` (where available), and a one-time rendered-frame-time probe (render a few frames at startup with the full chain, measure actual ms/frame, downgrade if over budget) rather than trusting user-agent sniffing, which is unreliable for GPU capability specifically.

## Frame time probe pattern
```js
async function probeQualityTier(composer, clock) {
  const samples = []
  for (let i = 0; i < 30; i++) {
    const start = performance.now()
    composer.render(clock.getDelta())
    await new Promise((resolve) => requestAnimationFrame(resolve))
    samples.push(performance.now() - start)
  }
  const avgMs = samples.reduce((a, b) => a + b, 0) / samples.length
  if (avgMs > 20) return 'low'      // under 50fps equivalent budget for this work alone
  if (avgMs > 10) return 'medium'
  return 'high'
}
```
Run this once during an initial loading/splash state before committing to a quality tier, rather than adjusting reactively mid-experience, which can cause visible quality pops.

## Interaction with tone mapping and HDR intermediate buffers
When bloom or any threshold-based effect is in the chain, prefer a `HalfFloatType` intermediate frame buffer (shown above) so bright values are not clamped to the 0-1 range before the effect can read them; without it, `luminanceThreshold` behaves inconsistently since everything above 1.0 in the scene's actual output has already been clipped to white before the bloom pass ever sees it, making the threshold effectively meaningless for genuinely HDR-bright materials (like unclamped emissive intensities above 1.0).
