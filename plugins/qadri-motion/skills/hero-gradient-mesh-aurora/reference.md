# Reference: Animated Mesh-Gradient Aurora Hero

## Blob sizing table

| Blob | Width | Height | Aspect | Position | Notes |
|---|---|---|---|---|---|
| 1 | 45vw | 31.5vw (0.7x) | Wide ellipse | top-left quadrant | Primary brand color; largest visual anchor |
| 2 | 49.5vw (1.1x) | 29.25vw (0.65x) | Wide ellipse | bottom-right | Secondary color; slightly larger for balance |
| 3 | 36vw (0.8x) | 40.5vw (0.9x) | Tall ellipse | bottom-center | Accent color; vertical shape breaks the horizontal pattern |
| 4 | 27vw (0.6x) | 22.5vw (0.5x) | Small ellipse | center-right | Tertiary; the first to drop on mobile |

All sizes are relative to `--blob-size-base: 45vw`. Adjust the base to scale all blobs proportionally.

## Keyframe duration interaction table

Prime durations prevent synchronization. The table shows the combined period (LCM) for different duration sets:

| Durations (s) | LCM (s) | Reset visible? |
|---|---|---|
| 20, 20, 20, 20 | 20 | Yes, every 20s |
| 15, 20, 25, 30 | 300 | Yes, every 5 minutes |
| 16, 18, 22, 26 | 5,148 | Unlikely in a session |
| 17, 19, 23, 29 | 215,441 | Never (2.5 days) |
| 13, 17, 23, 31 | 157,573 | Never (1.8 days) |

Rule of thumb: if all durations are prime, the LCM is their product. Pick 4 primes between 13 and 31 for comfortable animation speed.

## Blur radius visual reference

| Blur (px) | Visual result | Use case |
|---|---|---|
| 40-60 | Soft edges visible; reads as "out of focus shapes" | Intentionally visible blob shapes |
| 80-100 | Shapes merge at edges; individual blobs still distinguishable | Mobile-friendly, lower GPU cost |
| 120-150 | Blobs blend into continuous color field; no visible shape | Standard aurora effect |
| 180-250 | Nearly uniform wash; structure lost | Subtle tint, not a visible effect |

## Container inset values

The `inset: -25%` on `.hero__aurora` lets blobs drift outside the visible viewport without clipping at the edges. Different inset values:

| Inset | Effect |
|---|---|
| 0 | Blobs clip at hero edges; visible hard cutoff during drift |
| -15% | Minimal bleed; blobs can drift ~15% outside viewport per axis |
| -25% | Standard; blobs drift freely without edge clipping for drift ranges up to 12vw |
| -40% | Excessive; wastes GPU on blurred pixels that are never visible |

## Color harmony strategies for aurora palettes

### Analogous (safest)
Pick 3-4 hues within a 60-degree arc on the OKLCH hue wheel. Results in smooth, unified color blending.
```
Example: Blue-indigo family
--aurora-1: oklch(55% 0.20 260);  /* blue */
--aurora-2: oklch(50% 0.22 280);  /* indigo */
--aurora-3: oklch(60% 0.18 240);  /* sky */
```

### Split complementary (more contrast)
One primary hue plus two hues flanking its complement. More visual tension without the clash of direct complements.
```
Example: Blue primary, orange-yellow flanks
--aurora-1: oklch(55% 0.20 260);  /* blue */
--aurora-2: oklch(65% 0.18 80);   /* amber */
--aurora-3: oklch(60% 0.15 50);   /* orange */
```

### Triadic (high energy)
Three hues evenly spaced 120 degrees apart. Vibrant but harder to make subtle. Reduce saturation to 0.12-0.16 for auroras.
```
Example: Red-green-blue triad, desaturated
--aurora-1: oklch(50% 0.14 25);   /* warm red */
--aurora-2: oklch(55% 0.14 145);  /* sage green */
--aurora-3: oklch(50% 0.14 265);  /* slate blue */
```

### Monochromatic (most subtle)
Single hue at 3-4 different lightness/saturation levels. Very safe, very calm, can read as flat.
```
Example: Deep blue monochrome
--aurora-1: oklch(40% 0.22 265);  /* dark blue */
--aurora-2: oklch(55% 0.18 265);  /* mid blue */
--aurora-3: oklch(70% 0.12 265);  /* light blue */
```

## Mouse-reactive lerp factor tuning

| Factor | Feel | Best for |
|---|---|---|
| 0.01-0.02 | Very heavy, dreamlike lag | Ambient backgrounds where mouse reactivity is a subtle hint |
| 0.03-0.05 | Smooth, noticeable response | Standard aurora mouse interaction |
| 0.06-0.10 | Responsive, snappy | Direct-manipulation feel, less ambient |
| 0.15+ | Nearly 1:1 tracking | Too responsive for background elements; reads as "attached to cursor" |

The lerp runs in a `requestAnimationFrame` loop: `current += (target - current) * factor`. At 60fps with factor 0.04, a mouse jump takes ~25 frames (~417ms) to settle within 1% of the target, giving a smooth trailing feel.

## Common failure: transform clobbering

When both CSS keyframe animation and JS-driven transforms target the same element's `transform` property, the later-applied one wins. CSS animation wins over inline styles during each animation frame.

**Broken:**
```css
.blob { animation: drift 20s infinite; }
```
```js
blob.style.transform = `translate(${x}px, ${y}px)`; // clobbered by animation
```

**Fixed: nested wrapper pattern**
```html
<div class="blob-track" style="animation: drift 20s infinite">
  <div class="blob" style="transform: translate(...)">
  </div>
</div>
```
Outer element handles keyframe drift; inner element handles JS mouse offset. Transforms compose via the rendering tree, not the `transform` property.

## Entrance timing diagram

```
t=0ms    Page paint. Aurora blobs at 0% keyframe. Opacity 0.
t=200ms  Aurora fade-in begins (1800ms ease-out).
t=600ms  Eyebrow translateY starts (800ms ease-out).
t=800ms  Headline translateY starts.
t=1000ms Subline translateY starts.
t=1200ms CTA group translateY starts.
t=2000ms Aurora at full opacity. All content visible and settled.
```

Total entrance window: 2000ms. No element should animate after this point on initial load.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Blobs have hard edges | Blur not applied, or applied to each blob instead of container | Move `filter: blur()` to the parent `.hero__aurora`, not individual blobs |
| Aurora looks flat/uniform | Too much blur or too many blobs | Reduce blur by 20-30px or remove one blob |
| Visible seam every N seconds | Keyframe 0% and 100% values differ | Ensure first and last keyframe are identical |
| Jank on scroll (not just idle) | Blur being recalculated on scroll | Add `contain: layout style paint` to `.hero__aurora` |
| Blobs clip at hero edge | Container does not have negative inset | Set `inset: -25%` on `.hero__aurora` |
| Text unreadable intermittently | Bright blob drifts behind headline | Add radial-gradient scrim or increase scrim opacity |
| Animation plays after prefers-reduced-motion toggled | Media query only targets blob animation, not entrance | Target all animated elements including content entrance |
| Hero shorter than viewport on mobile | Using `100vh` not `100dvh` | Use `height: 100dvh` with `100vh` fallback |
| Blobs appear pixelated on Retina | DPR not relevant for CSS blur | Not an actual issue; CSS blur is resolution-independent |
| Mouse offset does not compose with keyframe | Transform clobbering (see above) | Use nested wrapper pattern |

## GLSL variant: minimal shader source

For projects that need true noise-field aurora instead of blur blobs. See primitive `glsl-fragment-backgrounds` for the full harness and uniform setup. This is just the fragment shader body:

```glsl
// Requires: simplex3d noise function, uniform float uTime, uniform vec2 uRes
// Requires: uniform vec3 uColorA, uColorB, uColorC

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.08; // slow drift

  // Domain warp: offset UV by noise before sampling again
  vec2 warp = vec2(
    snoise(vec3(uv * 1.5, t)),
    snoise(vec3(uv * 1.5 + 100.0, t))
  ) * 0.4;

  float n1 = snoise(vec3((uv + warp) * 2.0, t * 1.1));
  float n2 = snoise(vec3((uv + warp * 0.7) * 1.5, t * 0.9 + 50.0));
  float n3 = snoise(vec3((uv + warp * 1.2) * 1.8, t * 1.3 + 100.0));

  vec3 color = mix(uColorA, uColorB, smoothstep(-0.3, 0.3, n1));
  color = mix(color, uColorC, smoothstep(-0.2, 0.4, n2));
  color *= 0.5 + 0.5 * smoothstep(-0.5, 0.5, n3); // luminance variation

  gl_FragColor = vec4(color * 0.6, 1.0); // overall intensity
}
```

## Performance profiling commands

```bash
# Lighthouse performance audit (CLI)
npx lighthouse http://localhost:3000 --only-categories=performance --output=json

# Chrome DevTools protocol: get layer count
# In DevTools Console:
# Performance tab > Record 5s > Check "Painting" section for layer count
```

```js
// Runtime performance check: frame time measurement
const frameTimes = [];
let lastTime = performance.now();
function measureFrame() {
  const now = performance.now();
  frameTimes.push(now - lastTime);
  lastTime = now;
  if (frameTimes.length < 300) requestAnimationFrame(measureFrame);
  else {
    frameTimes.sort((a, b) => a - b);
    console.log('Median frame time:', frameTimes[150].toFixed(2), 'ms');
    console.log('P95 frame time:', frameTimes[285].toFixed(2), 'ms');
    console.log('Max frame time:', frameTimes[299].toFixed(2), 'ms');
  }
}
requestAnimationFrame(measureFrame);
```
