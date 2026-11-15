---
name: parallax-depth-systems
description: Use when building layered depth effects (background/midground/foreground moving at different rates on scroll or mouse move), covering correct speed ratios by simulated z-depth, true 3D perspective/translateZ parallax versus faked 2D transform parallax, and mobile-specific handling.
---

# Parallax Depth Systems

## When to use this
- You want a hero or section where multiple visual layers (background sky, midground mountains, foreground trees) move at visibly different rates to sell depth, on scroll or on mouse/pointer movement.
- You need to decide actual numeric speed ratios per layer instead of guessing values that "look kind of right."
- You want to know whether to use real CSS 3D (`perspective` + `translateZ`) or faked 2D layered `translateY` multipliers, since they produce different visual results and have different cost/complexity tradeoffs.
- Do NOT use this for a single background image with a slight scroll offset; that's a much simpler one-layer effect and doesn't need a "system." This skill is for coordinating 3+ layers with a consistent depth model. Do NOT use scroll-based parallax as the primary interaction for content-critical sections; pair with `sticky-pinning-sequences` if the layers need to also pin/hold at points.

## Mental model
Parallax fakes depth perception using the same cue your eyes actually use in the real world: closer objects appear to move faster across your field of view than distant ones for the same amount of viewer movement. The core relationship is `apparent_speed = viewer_movement / distance`. This gives you a principled way to assign per-layer speed multipliers instead of eyeballing them: pick a "distance" value per layer (e.g. background = 800 depth units, midground = 400, foreground = 100, subject/UI layer = 0, meaning it doesn't move relative to the viewport at all), and each layer's multiplier is `baseDistance / layerDistance`, normalized so your nearest moving layer gets a sensible max multiplier (commonly 1.0-1.5x scroll speed) and the farthest gets the smallest (0.1-0.3x).

There are two structurally different implementations, and conflating them causes most parallax bugs. **Faked 2D parallax** applies a different `translateY` multiplier to each flat layer, all rendered at the same simulated distance from the camera (there is no real camera, no real distance, just numbers you picked). This is cheap, works everywhere, and is right for 95% of use cases. **True 3D parallax** uses an actual CSS 3D scene: a `perspective` value on a parent establishes a virtual camera distance, and children get real `translateZ()` values placing them at different distances from that camera; when the parent's `perspective-origin` or a wrapping rotation/translation shifts (via mouse move or scroll), the browser's actual 3D projection math produces correct parallax as an emergent property of true perspective projection, not a hand-picked multiplier per layer. True 3D is more physically consistent (multiple simultaneous motion axes stay correct together, e.g. combined mouse-x and mouse-y parallax) but is harder to reason about, since your `translateZ` values interact with your `perspective` value in a specific formula (`apparent_scale = perspective / (perspective - translateZ)`), and elements placed at `translateZ` values close to or exceeding your `perspective` value flip or vanish.

Mobile needs categorically different handling, not just smaller numbers. Scroll-linked parallax on mobile via `transform` triggered by a `scroll` listener is more prone to visible jank because mobile scroll events historically fire on a throttled/passive basis and main-thread contention is more common on weaker devices; mouse-move-driven parallax has no equivalent on touch devices at all (no persistent pointer position) and should be replaced with device-orientation-driven parallax (gyroscope tilt) or disabled outright, never left as dead unreachable code paths.

## Setup
No install required for CSS/vanilla JS approaches.
```bash
npm install gsap@3.12.5
```
```js
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)
```

## Core API
| API | Note |
|---|---|
| `perspective: <length>` (CSS, on parent) | establishes virtual camera distance; smaller values = more dramatic 3D effect |
| `perspective-origin` | vanishing point position, shifting this simulates camera pan |
| `transform-style: preserve-3d` | required on the parent for children's `translateZ` to compose in true 3D rather than flattening |
| `translateZ(<length>)` | moves a child toward (positive) or away (negative) from the virtual camera |
| `will-change: transform` | hints the browser to promote a parallax layer to its own compositor layer ahead of time |
| `ScrollTrigger` scrub with per-layer `to()` | GSAP pattern for multi-layer scroll-linked movement |
| `DeviceOrientationEvent` | mobile tilt input, replaces mouse-move parallax on touch devices |
| `gsap.quickTo(target, prop, opts)` | performant repeated-tween-target function, ideal for mouse-move parallax's high call frequency |

## Recipes

### Depth-ratio calculator (principled speed multipliers, not guesses)
Computes normalized per-layer multipliers from assigned depth values.
```js
function computeParallaxRatios(layers, { minMultiplier = 0.1, maxMultiplier = 1.3 } = {}) {
  // layers: [{ name, depth }], smaller depth = closer to viewer
  const depths = layers.map((l) => l.depth)
  const minDepth = Math.min(...depths)
  const maxDepth = Math.max(...depths)
  return layers.map((l) => {
    const t = (l.depth - minDepth) / (maxDepth - minDepth) // 0 (closest) to 1 (farthest)
    const multiplier = maxMultiplier - t * (maxMultiplier - minMultiplier)
    return { ...l, multiplier: Number(multiplier.toFixed(3)) }
  })
}

computeParallaxRatios([
  { name: 'sky', depth: 800 },
  { name: 'mountains', depth: 400 },
  { name: 'trees', depth: 150 },
  { name: 'subject', depth: 0 },
])
// -> sky: 0.1, mountains: ~0.55, trees: ~0.95, subject: 1.3
```

### Faked 2D scroll parallax with GSAP, driven by the ratio calculator
Four flat layers move at distinct scroll-linked rates within a pinned hero.
```js
const layers = [
  { el: '.layer-sky', multiplier: 0.1 },
  { el: '.layer-mountains', multiplier: 0.4 },
  { el: '.layer-trees', multiplier: 0.75 },
  { el: '.layer-subject', multiplier: 1.0 },
]

layers.forEach(({ el, multiplier }) => {
  gsap.to(el, {
    yPercent: -30 * multiplier,
    ease: 'none',
    scrollTrigger: {
      trigger: '.parallax-hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 0.4,
    },
  })
})
```

### True 3D perspective parallax reacting to mouse movement
A real 3D scene where card layers shift according to actual perspective projection as the pointer moves.
```html
<div class="scene">
  <div class="layer" style="--depth: -80px;">Background card</div>
  <div class="layer" style="--depth: 0px;">Midground card</div>
  <div class="layer" style="--depth: 100px;">Foreground card</div>
</div>
```
```css
.scene {
  perspective: 800px;
  perspective-origin: 50% 50%;
}
.layer {
  transform-style: preserve-3d;
  transform: translateZ(var(--depth)) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
  transition: transform 0.1s ease-out;
}
```
```js
const scene = document.querySelector('.scene')
const layers = scene.querySelectorAll('.layer')

scene.addEventListener('pointermove', (e) => {
  const rect = scene.getBoundingClientRect()
  const px = (e.clientX - rect.left) / rect.width - 0.5 // -0.5 to 0.5
  const py = (e.clientY - rect.top) / rect.height - 0.5
  layers.forEach((layer) => {
    layer.style.setProperty('--ry', `${px * 12}deg`)
    layer.style.setProperty('--rx', `${-py * 12}deg`)
  })
})
scene.addEventListener('pointerleave', () => {
  layers.forEach((layer) => {
    layer.style.setProperty('--ry', '0deg')
    layer.style.setProperty('--rx', '0deg')
  })
})
```

### High-frequency mouse-move parallax with `gsap.quickTo` (avoids tween pileup)
Mouse-move parallax needs a tween function built for very frequent calls; `gsap.quickTo` is optimized for exactly this instead of creating a new tween on every `mousemove` event.
```js
const layer1X = gsap.quickTo('.parallax-layer-1', 'x', { duration: 0.6, ease: 'power3' })
const layer1Y = gsap.quickTo('.parallax-layer-1', 'y', { duration: 0.6, ease: 'power3' })
const layer2X = gsap.quickTo('.parallax-layer-2', 'x', { duration: 0.6, ease: 'power3' })
const layer2Y = gsap.quickTo('.parallax-layer-2', 'y', { duration: 0.6, ease: 'power3' })

document.querySelector('.hero').addEventListener('mousemove', (e) => {
  const rect = e.currentTarget.getBoundingClientRect()
  const px = (e.clientX - rect.left) / rect.width - 0.5
  const py = (e.clientY - rect.top) / rect.height - 0.5

  layer1X(px * 20)  // near layer, small movement range
  layer1Y(py * 20)
  layer2X(px * 60)  // far/background layer, larger movement range (inverse logic depending on your metaphor)
  layer2Y(py * 60)
})
```

### Mobile device-orientation parallax fallback
Replaces mouse-move parallax with gyroscope-tilt-driven parallax on touch devices, with the required iOS permission prompt.
```js
async function enableTiltParallax(layers) {
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    const permission = await DeviceOrientationEvent.requestPermission()
    if (permission !== 'granted') return
  }
  window.addEventListener('deviceorientation', (e) => {
    const tiltX = gsap.utils.clamp(-20, 20, e.gamma || 0) / 20 // -1 to 1
    const tiltY = gsap.utils.clamp(-20, 20, (e.beta || 0) - 45) / 20
    layers.forEach(({ el, multiplier }) => {
      gsap.set(el, { x: tiltX * 15 * multiplier, y: tiltY * 15 * multiplier })
    })
  })
}
```

### Disabling mouse-parallax entirely on coarse-pointer devices
Detects touch-primary devices via media query and skips mouse-move parallax setup rather than leaving dead listeners.
```js
const hasFinePointer = window.matchMedia('(pointer: fine)').matches

if (hasFinePointer) {
  document.querySelector('.hero').addEventListener('mousemove', handleParallaxMouseMove)
} else {
  // static layered composition, no interactive parallax; optionally enable tilt parallax instead
}
```

## Tuning the feel
- Scroll parallax speed spread: keep the fastest layer's multiplier under about 1.3-1.5x actual scroll speed and the slowest above 0.1x; multipliers outside this band either barely register as depth (too close to 1.0 across all layers) or move so fast/slow relative to scroll that they visually detach from the page's own rhythm.
- Mouse-move parallax range: 10-25px of movement for near/subject layers, 40-80px for distant background layers, is a believable range for a hero-sized viewport; beyond ~100px of travel the illusion breaks and it reads as elements literally flying around rather than a depth cue.
- `gsap.quickTo` duration 0.4-0.7s with `power3`/`power2` easing gives a responsive-but-smoothed follow; below 0.3s the layers feel twitchy and jittery on natural micro-movements of the mouse, above 1s they feel laggy/disconnected from cursor position.
- True 3D `perspective` values: 600-1000px for a dramatic, obviously-3D effect (product cards, hero showcases), 1200-2000px for a subtle effect where you want depth without an obvious "tilt" gimmick.

## Performance
- Only animate `transform` (`translateX/Y/Z`, `rotateX/Y`) for every parallax layer; never animate `top`/`left`/`margin`, which forces layout recalculation on every scroll/mouse tick across potentially many layers simultaneously, compounding cost.
- Apply `will-change: transform` to parallax layers, but remove it (or scope it only to the active hover/scroll state) once the effect is not actively running; leaving `will-change` on indefinitely keeps compositor layers allocated and can increase GPU memory pressure with no benefit when the effect is inactive.
- Scroll-driven parallax should read scroll position inside a single rAF-gated handler (or via `ScrollTrigger`'s own scrub, which already does this), never inside a raw unthrottled `scroll` event handler directly manipulating styles.
- Cap the number of independently-animated parallax layers to what's visually necessary, typically 3-5; each additional layer is another compositor layer and another set of calculations per frame, with diminishing visual returns past 4-5 distinct depth planes.

## Accessibility
```js
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
if (prefersReduced) {
  document.querySelectorAll('.parallax-layer').forEach((layer) => {
    gsap.set(layer, { x: 0, y: 0, rotateX: 0, rotateY: 0 })
  })
  // skip attaching scroll/mousemove/deviceorientation listeners entirely
} else {
  // full parallax setup
}
```
- Parallax effects, especially multi-layer scroll parallax with fast relative motion, are a documented trigger for vestibular discomfort (motion sickness-like symptoms) in sensitive users; `prefers-reduced-motion: reduce` support here is not optional polish, treat it as a correctness requirement.
- Mouse-move/tilt parallax that moves decorative background layers should never move layers containing actual readable text or interactive controls by more than a few pixels, since larger movement on text-bearing layers can affect reading comfort and make click targets feel unstable.
- `DeviceOrientationEvent.requestPermission()` (iOS 13+) requires a user gesture to trigger the permission prompt; never call it automatically on page load, gate it behind an explicit tap/button interaction or skip tilt-parallax gracefully if permission was denied.

## Anti-slop rules
- Never assign per-layer speed multipliers by eyeballing "that looks about right" without at least an implicit depth model; use the ratio calculator approach so multipliers are internally consistent as you add/adjust layers later.
- Never leave mouse-move parallax listeners attached and silently doing nothing on touch devices; explicitly gate on `(pointer: fine)` and provide a real touch-appropriate alternative (tilt, or static) rather than dead code.
- Never combine scroll-parallax and mouse-parallax on the same layer without testing the composition; simultaneous transforms from two different sources on one element need to be combined (e.g. via CSS custom properties feeding one final `transform`) rather than each handler overwriting the other's `transform` value.
- Never use true 3D `translateZ` values that approach or exceed your `perspective` value; elements flip or scale to infinity/negative as they cross the camera plane, this is a common "why did my card just disappear" bug.
- Never make parallax the primary way users perceive hierarchy or read content order; it is an atmospheric effect layered on top of a design that already works with zero motion.
- Never let background parallax layers scroll fast enough to create a visible seam/edge at the layer's boundary; size background layers generously oversized relative to their container so multiplier-driven movement never reveals an edge.

## Checklist
- [ ] Per-layer speed multipliers derived from an explicit depth model, not guessed independently
- [ ] Only `transform` properties animated across all layers
- [ ] `will-change` applied only while the effect is active, removed otherwise
- [ ] Mouse-move parallax gated behind `(pointer: fine)`, with a real touch/tilt alternative
- [ ] `DeviceOrientationEvent` permission requested only from a user gesture on iOS
- [ ] `prefers-reduced-motion` disables all parallax listeners and resets layers to neutral transform
- [ ] Background layers sized to prevent edge/seam reveal at maximum multiplier offset
- [ ] True 3D `translateZ` values kept safely within the scene's `perspective` value
- [ ] Verified on an actual mid-range mobile device, not just desktop devtools throttling
- [ ] No more than 4-5 distinct depth planes in a single composition
