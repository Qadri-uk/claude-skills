# Parallax Layers Depth: Full Reference

## Depth model calculator

```js
function buildDepthModel(layerDistances, damping = 0.8) {
  const max = Math.max(...layerDistances);
  return layerDistances.map(d => {
    const normalized = d / max;
    const speed = 1 - normalized * damping;
    const yRange = -(normalized * damping * 100); // px
    return { distance: d, speed: speed.toFixed(2), yRange: Math.round(yRange) };
  });
}
```

| Distance | Speed (damping=0.8) | translateY range (100px base) |
|---|---|---|
| 0 (nearest) | 1.00 | 0px |
| 1 | 0.84 | -16px |
| 2 | 0.68 | -32px |
| 3 | 0.52 | -48px |
| 4 | 0.36 | -64px |
| 5 (farthest) | 0.20 | -80px |

## Layer oversize calculation

The oversize must be large enough that the layer edge never enters the viewport at maximum translation.

```
Required oversize per side = max_translateY_range / stage_height * 100%

Example: 80px max range on 900px viewport = 8.9% per side. Round up to 10%.
```

Set via `inset: -10%` (adds 10% on all four sides) or:

```css
.parallax__layer {
  width: 120%;
  height: 120%;
  top: -10%;
  left: -10%;
}
```

## Speed ratios for common layer counts

| Layers | Recommended ratios | Notes |
|---|---|---|
| 2 (bg + content) | 0.2, 1.0 | Minimum viable parallax. |
| 3 (bg, mid, content) | 0.2, 0.5, 1.0 | Standard setup. Clear depth separation. |
| 4 (bg, mid, content, fg) | 0.2, 0.5, 1.0, 1.3 | Full depth range. Foreground adds "closer than the page" effect. |
| 5 (sky, bg, mid, content, fg) | 0.1, 0.3, 0.6, 1.0, 1.3 | Maximum recommended. Sky barely moves, creating a horizon anchor. |

## CSS perspective vs JS translateY comparison

| Aspect | CSS perspective + translateZ | JS translateY via ScrollTrigger |
|---|---|---|
| JS required | No | Yes |
| Browser support | All modern | All modern |
| Pin support | No (own scroll container) | Yes (ScrollTrigger pin) |
| Mouse-move parallax | No | Yes (additive) |
| Performance | Compositor-only | Compositor-only if transform-only |
| Scroll container | Must be its own (breaks page scroll) | Uses page scroll |
| Scale compensation | Manual (calculated from perspective + Z) | Not needed |

**Use CSS perspective only** for standalone full-page parallax effects. For sections embedded in a scrolling narrative page, use JS translateY.

## Scale compensation formula for CSS perspective

When using `perspective` + `translateZ`, elements appear smaller as they move away. Compensate with scale:

```
scale = 1 + (abs(translateZ) / perspective)

For translateZ(-2px) with perspective: 1px:
scale = 1 + (2 / 1) = 3

For translateZ(-4px) with perspective: 1px:
scale = 1 + (4 / 1) = 5
```

| translateZ | perspective: 1px scale | perspective: 800px scale |
|---|---|---|
| -1px | 2.0 | 1.00125 |
| -2px | 3.0 | 1.0025 |
| -4px | 5.0 | 1.005 |
| -100px | 101.0 | 1.125 |
| -400px | 401.0 | 1.5 |

With `perspective: 1px`, the scale compensation is dramatic (3x, 5x). With `perspective: 800px`, it is subtle (1.005x). Use 800px+ for subtle depth, 1px for dramatic (but requires large scale compensation).

## gsap.quickTo vs gsap.to for mouse-move

| Method | Performance | Smoothness | Notes |
|---|---|---|---|
| `gsap.to()` on each mousemove | Bad (creates new tween per event) | Jittery at high event rate | Never use for mouse-move parallax |
| `gsap.quickTo()` | Good (reuses single tween) | Smooth with configurable lag | Recommended. Duration 0.4-0.7s. |
| `gsap.set()` + manual RAF | Good (direct set) | No smoothing (instant) | Only if you want zero-lag follow |
| CSS custom property + transition | OK | Depends on transition duration | No GSAP dependency needed |

## Vestibular risk by pattern

| Pattern | Risk level | Mitigation |
|---|---|---|
| Vertical scroll parallax, 2-3 layers, < 80px range | Low | prefers-reduced-motion guard |
| Vertical scroll parallax, 4+ layers, > 100px range | Medium | Reduce to 2 layers on medium-risk displays |
| Horizontal parallax | Medium-high | More disorienting than vertical for many users |
| Zoom/scale parallax | High | Limit to < 0.3x scale change. Add mandatory motion toggle. |
| Mouse-move parallax on all layers | Medium | Gate behind `(pointer: fine)`. Do not apply to content-bearing layers. |
| Combined scroll + mouse parallax | High | Compose transforms carefully. Cap combined range. |

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| All layers move at the same speed | Same yRange or speed value | Differentiate with the depth model calculator |
| Layer edge visible at top or bottom | Layer not oversized | Add `inset: -10%` or equivalent oversize |
| Jittery movement on Windows | Native scroll is not normalized | Add Lenis smooth scroll, or accept the jitter |
| Mouse parallax fights scroll parallax | Two handlers overwriting the same transform | Use gsap.quickTo which composes automatically, or use CSS custom properties to combine |
| iOS Safari: layers judder | `background-attachment: fixed` used | Replace with `transform: translateY()` |
| Content text unreadable | Moving background changes contrast unpredictably | Add semi-transparent overlay or backdrop-filter to the content block |
| GPU memory warning in devtools | Too many composited layers | Reduce to 3 layers. Toggle `will-change` on/off based on visibility. |
| Foreground layer blocks clicks | `pointer-events` not set | Add `pointer-events: none` to decorative foreground layers |
