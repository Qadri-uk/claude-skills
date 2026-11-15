# Liquid Distortion Image Hero -- Reference

## Displacement map sources and authoring

| Type | Source | Character |
|---|---|---|
| Water surface | Photograph water, desaturate, levels-adjust to center on #808080 | Organic, directional currents |
| Perlin noise | Generate in Photoshop (Clouds filter) or any noise tool | Smooth, uniform, no directionality |
| Smoke/clouds | Photograph or generate | Wispy, soft, elongated warps |
| Radial gradient | Procedural (canvas or SVG) | Centered ripple from cursor |
| Voronoi cells | Generated from cell noise | Cracked/shattered displacement |
| Hand-drawn brush | Paint grayscale strokes | Art-directed, unique per project |

### Authoring rules
1. Center on 50% gray (#808080). Values above shift positive, below shift negative.
2. Blur heavily (Gaussian 5-20px). Sharp transitions in the map create visible tears.
3. For independent X/Y displacement, encode X in the R channel and Y in the G channel.
4. 256x256 is sufficient for most effects. GPU bilinear filtering interpolates between texels.
5. If the effect tiles or scrolls, ensure the map tiles seamlessly (Photoshop offset filter).
6. Export as JPEG at quality 80. Grayscale maps compress well. PNG is overkill.

## Uniform reference

| Uniform | Type | Range | Purpose |
|---|---|---|---|
| `uImage` | sampler2D | -- | Source hero image texture |
| `uDisplacement` | sampler2D | -- | Grayscale displacement map |
| `uMouse` | vec2 | 0.0 - 1.0 | Smoothed pointer position in UV space (Y flipped for GL) |
| `uVelocity` | float | 0.0 - 0.12 | Smoothed pointer velocity magnitude |
| `uScale` | float | 0.0 - 2.0 | Master displacement intensity multiplier |
| `uScrollFade` | float | 0.0 - 1.0 | Scroll-driven intensity fade (1 = full, 0 = no effect) |
| `uTime` | float | 0.0+ | Elapsed seconds since init, drives idle ripple |
| `uResolution` | vec2 | pixels | Canvas physical resolution (clientWidth * DPR) |
| `uImageSize` | vec2 | pixels | Source image natural dimensions for cover-UV |

## OGL API subset used

| Class | Constructor args | Key methods/properties |
|---|---|---|
| `Renderer` | `{ alpha, dpr, canvas? }` | `.gl`, `.setSize(w, h)` |
| `Texture` | `(gl, { image?, generateMipmaps?, wrapS?, wrapT? })` | `.image = HTMLImageElement` to upload |
| `Plane` | `(gl, { widthSegments?, heightSegments? })` | Returns geometry for a unit quad |
| `Program` | `(gl, { vertex, fragment, uniforms })` | `.uniforms.name.value = x` |
| `Mesh` | `(gl, { geometry, program })` | Pass as `scene` to `renderer.render()` |

OGL textures default to `gl.CLAMP_TO_EDGE` wrapping and `gl.LINEAR` filtering, which is correct for this effect. Override only if you need tiling.

## Cover-UV math explained

The fragment shader must map the canvas UV (always 0-1 in both axes regardless of aspect ratio) to image UVs that maintain the source aspect ratio, cropping excess just like CSS `object-fit: cover`.

```
screenRatio = screenWidth / screenHeight
imageRatio  = imageWidth / imageHeight

if screenRatio > imageRatio:
  // Screen is wider than image: crop top/bottom
  scale.x = 1.0
  scale.y = imageRatio / screenRatio
else:
  // Screen is taller than image: crop left/right
  scale.x = screenRatio / imageRatio
  scale.y = 1.0

correctedUV = (rawUV - 0.5) * scale + 0.5
```

This must be computed per-fragment because the screen aspect ratio changes on resize. The `uResolution` and `uImageSize` uniforms feed this calculation.

## Velocity computation details

Velocity is not the raw pointer delta. It goes through three stages:

1. **Raw delta**: `sqrt((current.x - prev.x)^2 + (current.y - prev.y)^2)`. In UV units per frame.
2. **Clamp**: `min(rawDelta, 0.12)`. Prevents extreme values from fast swipes or pointer jumps (e.g., cursor re-entering the window).
3. **Smooth**: `velocity += (clampedDelta - velocity) * 0.15`. Exponential moving average. The 0.15 factor means velocity reaches 90% of a new input in ~15 frames (~250ms at 60fps) and decays to 10% of peak in ~15 frames after the pointer stops.

The smoothed velocity drives the RGB shift magnitude: `rgbShift = velocity * 0.015`. At peak velocity (0.12), the shift is 0.0018 UV units per channel, which at 1920px wide is about 3.5px of separation. Enough to be clearly visible without looking like a rendering error.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Black canvas, no image | Image texture not loaded before first render | Set `uScale` to 0 until `imgEl.onload` fires |
| Image appears but no distortion | Displacement map not loaded, or `uScale` is 0 | Check `dispEl.onload` fires and `uScale` > 0 |
| Image stretches on resize | `uResolution` not updated in resize handler | Update `uResolution` in ResizeObserver callback |
| Edge pixels smear on distortion | UV wrapping set to REPEAT | Set wrap to CLAMP_TO_EDGE on both textures |
| Effect is choppy/jittery | Raw pointer coords, no lerp | Add per-frame lerp with factor 0.06 |
| RGB split never goes away | Velocity not decaying | Check velocity smoothing formula, ensure decay toward 0 |
| Canvas captures clicks | CTA under canvas without pointer-events management | Set `pointer-events: none` on canvas or `auto` on content |
| Performance degrades on 4K | DPR uncapped | Cap at `Math.min(devicePixelRatio, 2)` |
| Effect works but page scrolls jerkily | Scroll listener not passive | Ensure all scroll/pointer listeners use `{ passive: true }` |
| Displacement is mirrored | UV Y-axis not flipped for WebGL | Flip Y: `target.y = 1.0 - (e.clientY - rect.top) / rect.height` |
| Effect bleeds past hero section | No scroll fade | Add ScrollTrigger binding to decay uScrollFade to 0 |

## Touch device considerations

- Mobile has no persistent hover. `pointermove` fires on touch-drag but not on tap-and-hold.
- Design for tap: on `touchstart`, animate displacement to a peak and back over 600ms using a tween, then settle. Do not require continuous drag.
- Disable idle ripple on touch devices (`pointer: coarse` media query) since there is no hovering cursor to suggest interactivity.
- Consider disabling the effect entirely below 768px. The small viewport makes displacement less impactful, and the GPU cost on mobile is proportionally higher.

```css
@media (pointer: coarse) {
  .hero canvas { display: none; }
  .hero.webgl-active .hero-fallback { opacity: 1; }
}
```

## RGB split direction variants

| Variant | Shader change | Visual effect |
|---|---|---|
| Horizontal (default) | `uvR.x += shift; uvB.x -= shift` | Classic chromatic aberration |
| Vertical | `uvR.y += shift; uvB.y -= shift` | Vertical fringing, unusual |
| Radial | Offset along the vector from center to UV | Split radiates from center outward |
| Velocity-angle | Offset along `normalize(current - prev)` | Split follows pointer direction |

For the velocity-angle variant, pass the pointer direction as a vec2 uniform:
```glsl
uniform vec2 uDirection;
// ...
vec2 dir = normalize(uDirection) * rgbShift;
float r = texture2D(uImage, clamp(uv + offset + dir, 0.0, 1.0)).r;
float b = texture2D(uImage, clamp(uv + offset - dir, 0.0, 1.0)).b;
```

## Image format recommendations

| Format | Use when | Typical size (2048x1365) |
|---|---|---|
| AVIF | Modern browsers, best compression | 80-150 KB at quality 70 |
| WebP | Broad support including older Safari | 120-250 KB at quality 80 |
| JPEG | Maximum compatibility fallback | 200-400 KB at quality 82 |

Use `<img>` with `srcset` or `<picture>` for format negotiation on the fallback. The WebGL texture loads whichever format the `src` attribute resolves to. AVIF and WebP decode to the same RGBA bitmap in the GPU.
