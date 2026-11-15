# Reference: Mobile Scroll Performance

## Device capability APIs

| API | Returns | Browser support | Notes |
|---|---|---|---|
| `navigator.deviceMemory` | GB (0.25, 0.5, 1, 2, 4, 8) | Chrome/Edge only | Rounded to nearest power of 2 for fingerprint resistance |
| `navigator.hardwareConcurrency` | Logical CPU cores | All modern | Returns logical cores (includes hyperthreading) |
| `window.devicePixelRatio` | Float | All modern | Can change on zoom or display switch |
| `matchMedia('(pointer: coarse)')` | Boolean | All modern | True for touch-primary devices |
| `matchMedia('(hover: none)')` | Boolean | All modern | True for devices with no hover capability |
| `navigator.connection.effectiveType` | '4g', '3g', '2g', 'slow-2g' | Chrome/Edge only | Network-aware loading decisions |
| `navigator.connection.saveData` | Boolean | Chrome/Edge only | User has requested reduced data usage |

## Compositor layer cost per device class

| Device class | GPU memory | Max safe layers | Pixels per layer at viewport |
|---|---|---|---|
| Mid-range phone (375x812, 3x) | 1-2 GB shared | 4 | 1125x2436 = 10.9 MB |
| Mid-range phone (DPR capped 2x) | 1-2 GB shared | 4 | 750x1624 = 4.9 MB |
| Tablet (768x1024, 2x) | 2-4 GB shared | 6 | 1536x2048 = 12.6 MB |
| Desktop (1920x1080, 1x) | 4-8 GB dedicated | 10 | 1920x1080 = 8.3 MB |

Each compositor layer stores a full rasterized bitmap. At 4 bytes per pixel (RGBA), a 3x DPR iPhone layer is ~10 MB. Four layers = ~40 MB of GPU memory just for scroll animation layers, before the page content, video, and OS compositing layers.

## Properties by compositor safety

### Safe (compositor-only, no repaint)
- `transform` (translate, scale, rotate, skew)
- `opacity`

### Sometimes safe (depends on browser/content)
- `clip-path: inset()` -- compositor in Chrome, may repaint in Firefox/Safari
- `filter: brightness()`, `filter: contrast()` -- compositor in Chrome with `will-change: filter`
- `backdrop-filter` -- compositor but extremely expensive on mobile

### Never safe (always triggers layout or repaint)
- `width`, `height`, `top`, `left`, `right`, `bottom`
- `margin`, `padding`
- `font-size`, `line-height`
- `border-radius` (animating it)
- `box-shadow` (repaint on every frame)
- `filter: blur()` (very expensive, main-thread in some browsers)
- `background-position` (repaint)
- `background-attachment: fixed` (repaint + iOS ignores it)

## ScrollTrigger per-frame cost model

Each active ScrollTrigger adds:
- ~0.05ms for position check (compare scroll position to start/end)
- ~0.1ms if `scrub` is active (interpolation calculation)
- ~0.2ms if `onUpdate` callback fires (user JS execution)
- ~0.5ms if the trigger causes a GSAP tween update (property interpolation + DOM write)

At 15 active scrubbed triggers with onUpdate: 15 * (0.05 + 0.1 + 0.2 + 0.5) = ~12.75ms per frame. This alone exceeds the 10ms JS budget per frame (leaving 6.67ms for browser compositing from the 16.67ms frame budget).

## iOS-specific scroll issues

| Issue | Cause | Fix |
|---|---|---|
| Pin jumps when URL bar appears/hides | `window.innerHeight` changes, ScrollTrigger recalculates | `ScrollTrigger.normalizeScroll(true)` or ignore height-only resize |
| Scroll position jumps on orientation change | Layout reflow takes 100-500ms to settle | Delay ScrollTrigger.refresh by 500ms after orientationchange |
| `position: fixed` flickers during momentum scroll | iOS compositor optimizes by rasterizing fixed layers | Use `transform: translateZ(0)` on fixed elements |
| `background-attachment: fixed` ignored | iOS Safari does not support it | Use parallax transform instead |
| Touch scroll feels different with Lenis | Lenis replaces native momentum | Set `smoothTouch: false` (Lenis default) |
| 120Hz ProMotion doubles rAF callbacks | ProMotion iPhones run rAF at 120fps | GSAP ticker handles this; verify animations use time-based not frame-based calculations |

## Image format decision tree

```
Is the image photographic?
  YES -> Does browser support AVIF?
    YES -> Serve AVIF (40-50% smaller than WebP)
    NO  -> Serve WebP (25-35% smaller than JPEG)
  NO (illustration, text, flat color) -> Is it < 256 colors?
    YES -> Serve PNG-8 or SVG
    NO  -> Serve WebP lossless or SVG
```

## Thermal throttle behavior by SoC

| SoC | Throttle onset | Throttle severity | Recovery time |
|---|---|---|---|
| Snapdragon 6 Gen 1 | 15-20s sustained load | GPU clock drops 30-40% | 10-15s idle |
| Apple A14 | 20-30s sustained load | CPU/GPU clock drops 20-30% | 5-10s idle |
| Google Tensor G2 | 10-15s sustained load | GPU clock drops 40-50% | 15-20s idle |
| MediaTek Dimensity 7200 | 15-20s sustained load | GPU clock drops 35-45% | 10-15s idle |

Key insight: a site that hits 60fps in the first 10 seconds of scrolling can drop to 30fps after 20 seconds as the SoC thermal throttles. This is why sustained performance testing matters more than initial FPS checks.
