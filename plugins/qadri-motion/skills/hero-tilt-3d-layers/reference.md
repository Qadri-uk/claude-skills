# Reference: Pointer-Tilt Layered Depth Hero

## Vanilla-Tilt.js API (v1.8.1)

Full options reference for cases where you want Vanilla-Tilt instead of custom code.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `max` | number | 15 | Max tilt angle in degrees |
| `startX` | number | 0 | Starting X tilt |
| `startY` | number | 0 | Starting Y tilt |
| `perspective` | number | 1000 | CSS perspective in px |
| `scale` | number | 1.0 | Scale on hover |
| `speed` | number | 300 | Transition speed in ms |
| `transition` | boolean | true | Enable CSS transition |
| `axis` | null/"x"/"y" | null | Restrict tilt axis |
| `reset` | boolean | true | Reset on mouseout |
| `easing` | string | "cubic-bezier(.03,.98,.52,.99)" | CSS easing |
| `glare` | boolean | false | Enable glare overlay |
| `max-glare` | number | 1 | Max glare opacity (0-1) |
| `glare-prerender` | boolean | false | Pre-render glare element |
| `mouse-event-element` | element/null | null | Alternate element for events |
| `full-page-listening` | boolean | false | Listen on whole page |
| `gyroscope` | boolean | true | Enable gyroscope on mobile |
| `gyroscopeMinAngleX` | number | -45 | Min gyro X angle |
| `gyroscopeMaxAngleX` | number | 45 | Max gyro X angle |
| `gyroscopeMinAngleY` | number | -45 | Min gyro Y angle |
| `gyroscopeMaxAngleY` | number | 45 | Max gyro Y angle |
| `reverse` | boolean | false | Reverse tilt direction |
| `reset-to-start` | boolean | true | Reset to startX/startY vs 0 |

Methods: `element.vanillaTilt.destroy()`, `element.vanillaTilt.getValues()`, `element.vanillaTilt.reset()`.

Events: `tiltChange` (fires with `detail: { tiltX, tiltY, percentageX, percentageY, angle }`).

## Scale compensation math

The perspective projection formula:

```
apparentScale = perspective / (perspective - translateZ)
```

A layer placed at `translateZ: -80px` with `perspective: 1200px`:
```
apparentScale = 1200 / (1200 - (-80)) = 1200 / 1280 = 0.9375
```

The layer appears 6.25% smaller. To compensate, apply `scale(1 / 0.9375)` = `scale(1.0667)`.

Compensation table for perspective: 1200px:

| translateZ | apparentScale | Compensation scale |
|------------|---------------|-------------------|
| -120px | 0.909 | 1.100 |
| -80px | 0.9375 | 1.0667 |
| -40px | 0.9677 | 1.0333 |
| 0px | 1.0 | 1.0 |
| 30px | 1.0256 | 0.975 |
| 60px | 1.0526 | 0.950 |
| 100px | 1.0909 | 0.917 |

For perspective: 800px (more dramatic):

| translateZ | apparentScale | Compensation scale |
|------------|---------------|-------------------|
| -80px | 0.909 | 1.100 |
| -40px | 0.952 | 1.050 |
| 0px | 1.0 | 1.0 |
| 30px | 1.039 | 0.963 |
| 60px | 1.081 | 0.925 |

## Lerp interpolation reference

Linear interpolation formula:
```
current = current + (target - current) * speed
```

Speed values and their character:

| Speed | Character | Use case |
|-------|-----------|----------|
| 0.02 | Very heavy, underwater | Large environmental scenes |
| 0.04 | Heavy, deliberate | Reset/return animation |
| 0.06 | Weighty, responsive | Mobile gyroscope response |
| 0.08 | Balanced (recommended) | Desktop pointer tracking |
| 0.12 | Light, quick | Small card interactions |
| 0.16 | Snappy, almost 1:1 | UI tooltips, small elements |
| 1.0 | Instant, no smoothing | Never use for tilt |

## DeviceOrientation reference

| Property | Range | Axis | Hand-held offset |
|----------|-------|------|-----------------|
| `alpha` | 0-360 | Z (compass) | Not useful for tilt |
| `beta` | -180 to 180 | X (front-back) | ~45 deg at natural hold angle |
| `gamma` | -90 to 90 | Y (left-right) | ~0 deg at natural hold |

iOS 13+ requires `DeviceOrientationEvent.requestPermission()` which must be called from a user gesture (click/tap). Returns a Promise resolving to `'granted'` or `'denied'`.

## Depth layer ordering conventions

| Layer | Typical translateZ | maxRotate | Visual role |
|-------|-------------------|-----------|-------------|
| Deep background | -120 to -80px | 1-2 deg | Environment, gradient, texture |
| Background | -80 to -40px | 2-4 deg | Scene context, landscape |
| Midground | -40 to -10px | 3-5 deg | Secondary elements, UI frames |
| Content (anchor) | 0px | 5-7 deg | Headlines, body, CTA |
| Foreground | 10 to 40px | 6-9 deg | Floating accents, badges |
| Glare | 40 to 60px | N/A (gradient) | Specular highlight |

Rule of thumb: maxRotate roughly doubles as you move from deepest to closest. The ratio should feel like "closer things move more," not "everything moves the same."

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Layers appear to float apart on page load | No initial transform set in CSS | Set initial `translateZ` and `scale` in the stylesheet, not just JS |
| Tilt feels inverted | rotateX and rotateY axes are screen-relative | Negate the axis: `rotateX(-pointerY)` and `rotateY(pointerX)` |
| Tilt snaps back on touch | Touch end fires `pointerleave` | Use `pointercancel` and `pointerout` events for touch, or keep the rAF running and let lerp handle it |
| Layer content blurry on tilt | Sub-pixel rendering with `translateZ` | Use even-number translateZ values; add `backface-visibility: hidden` |
| Glare visible at rest | Glare opacity not zeroed initially | Set `opacity: 0` in CSS, only set to 1 on pointermove |
| Performance drops on scroll | Scroll handler + pointer handler both running | Pause the pointer tilt loop when the hero is not in viewport using IntersectionObserver |
