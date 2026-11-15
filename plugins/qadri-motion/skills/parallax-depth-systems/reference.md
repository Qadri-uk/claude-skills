# Parallax Depth Systems Reference

## The perspective/translateZ math in full
```
apparent_scale = perspective / (perspective - translateZ)
```
With `perspective: 800px`:
- `translateZ(0)` -> scale 1.0 (no change, baseline plane)
- `translateZ(100px)` -> scale = 800/700 ≈ 1.14 (appears 14% larger, closer to camera)
- `translateZ(-200px)` -> scale = 800/1000 = 0.8 (appears smaller, farther from camera)
- `translateZ(800px)` -> scale = 800/0 = infinity (element is exactly at the camera plane, degenerate)
- `translateZ(900px)` -> negative scale (element has crossed behind the camera, flips/inverts visually)

Always keep `translateZ` values well within `-perspective/2` to `perspective/2` for predictable, non-extreme scaling.

## Depth-to-multiplier reference table (2D faked parallax)
| Layer role | Suggested depth (arbitrary units) | Resulting multiplier (normalized 0.1-1.3 range) |
|---|---|---|
| Sky / farthest backdrop | 1000 | 0.1 |
| Distant mountains/buildings | 600 | 0.35 |
| Midground scenery | 350 | 0.6 |
| Near foreground objects | 120 | 0.9 |
| Subject / main focal content | 0 | 1.0-1.3 (moves with or slightly faster than scroll) |

## Parallax without JS: pure CSS `perspective` trick (fixed background illusion)
A classic no-JS approach for scroll parallax using 3D transforms on a container, works because scaling a `translateZ`-pushed-back element compensates for its slower apparent scroll movement:
```css
.parallax-container {
  perspective: 1px;
  height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
  transform-style: preserve-3d;
}
.parallax-layer-back {
  position: absolute;
  inset: 0;
  transform: translateZ(-1px) scale(2); /* scale compensates for translateZ's perceived shrink */
  z-index: -1;
}
.parallax-layer-base {
  position: relative;
  transform: translateZ(0);
}
```
This technique requires the scrolling element itself to be `.parallax-container` (not `body`/`html`), which limits its composability with Lenis-style smooth scroll (see `lenis-smooth-scroll`) since Lenis typically wants to own the document's own scroll; prefer the JS-driven ScrollTrigger approach when combining with a smooth-scroll library.

## Multi-input composition: combining scroll and mouse parallax correctly
Use CSS custom properties as the composition point so scroll and pointer contributions add cleanly instead of overwriting each other's inline `transform`:
```css
.layer {
  transform: translate(calc(var(--scroll-x, 0px) + var(--mouse-x, 0px)),
                         calc(var(--scroll-y, 0px) + var(--mouse-y, 0px)));
}
```
```js
function setScrollOffset(el, x, y) {
  el.style.setProperty('--scroll-x', `${x}px`)
  el.style.setProperty('--scroll-y', `${y}px`)
}
function setMouseOffset(el, x, y) {
  el.style.setProperty('--mouse-x', `${x}px`)
  el.style.setProperty('--mouse-y', `${y}px`)
}
```

## Testing device-orientation values across devices
`beta` (front-back tilt) and `gamma` (left-right tilt) ranges and sign conventions have historically differed slightly across iOS/Android and device orientation (portrait/landscape); always clamp and normalize rather than assuming raw values are already in the -20 to 20 range you expect:
```js
function normalizeTilt(event) {
  const gamma = gsap.utils.clamp(-45, 45, event.gamma || 0)
  const beta = gsap.utils.clamp(-45, 45, event.beta || 0)
  return { x: gamma / 45, y: beta / 45 } // both roughly -1 to 1
}
```

## Common bugs and fixes
- Layer "swims" or drifts at rest (no scroll/mouse movement): a `scale()` compensation value is slightly off in the pure-CSS perspective trick, or sub-pixel rounding accumulates in a JS multiplier chain; round transform values to 2 decimal places to reduce visible jitter on some GPUs.
- Foreground layer disappears at extreme mouse positions: `translateZ` combined with `rotateX/Y` pushed the element past the camera plane; reduce rotation degree range or increase `perspective`.
- Parallax works on desktop but is choppy on mobile Safari: likely animating a non-compositor property, or too many layers each getting their own `will-change` layer promotion exceeding the device's compositor memory budget; profile with Safari Web Inspector's Layers view.
- Background layer reveals an edge/seam during fast scroll: layer image/element is sized exactly to viewport instead of oversized to accommodate its own multiplier's maximum offset; oversize by at least `multiplier * expectedScrollDistance` in each direction.
