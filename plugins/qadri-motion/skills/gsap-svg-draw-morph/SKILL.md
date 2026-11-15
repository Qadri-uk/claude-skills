---
name: gsap-svg-draw-morph
description: Use when animating SVG stroke reveals (line drawing), shape-to-shape morphing, or movement along a path using GSAP's DrawSVGPlugin, MorphSVGPlugin, and MotionPathPlugin.
---

# GSAP SVG: draw, morph, motion path

## When to use this
- You need a stroke to appear as if being hand-drawn (icon reveals, signature animations, chart line reveals): DrawSVGPlugin.
- You need one SVG shape to smoothly deform into a different shape (icon state changes, blob animations, path-to-path transitions) even when the two paths have different point counts: MorphSVGPlugin.
- You need an element (DOM or SVG) to travel along an arbitrary curved path with correct rotation/orientation: MotionPathPlugin.
- You're combining these (e.g. draw a path, then have a dot travel along it) inside a shared timeline.
- Do NOT use this for simple straight-line or curve translation between two points; a plain `gsap.to(el, { x, y })` in `gsap-core-timelines` is lighter and correct for that. Do NOT use MorphSVGPlugin for layout/DOM position changes; that is `gsap-flip-layout`.

## Mental model
DrawSVGPlugin works by manipulating `stroke-dasharray` and `stroke-dashoffset` on an SVG shape with a stroke (path, line, circle, polyline, rect). Setting `stroke-dasharray` to the shape's total path length and animating `stroke-dashoffset` from that full length down to zero reveals the stroke progressively, because the "dash" pattern is set to exactly one dash the length of the whole path with an equally long gap, and offsetting it slides the visible portion along. DrawSVGPlugin computes the actual path length for you (`getTotalLength()` equivalent) and exposes a simple `drawSVG` value like `'0% 100%'` (percent range currently visible) so you do not hand-compute dash math. This only affects the STROKE, not fill; a filled shape with a stroke reveal will show its full fill immediately while the outline draws.

MorphSVGPlugin interpolates the `d` attribute of one `<path>` into another (or into a different shape type's equivalent path data) frame by frame. The hard problem it solves is that two arbitrary paths rarely have the same number of points/segments or the same winding, so naive point-by-point interpolation produces garbled in-between shapes. MorphSVGPlugin's algorithm resamples and maps points between the two shapes to minimize distortion (there is also a `type: 'rotational'` mode specifically tuned for shapes that should rotate into each other, like a star morphing into a spiral, rather than translate-morph). You give it a start path and end path (as selectors, path data strings, or even a non-path shape like `<circle>`/`<rect>` which it converts to path data internally), and it produces the tweened `d` string values.

MotionPathPlugin decouples "where is a point along this path at progress T" from "what is currently visible." It reads a path's geometry, and for any given progress value (0 to 1) returns the x/y coordinate and tangent angle at that point. When applied to `gsap.to(target, { motionPath: {...} })`, GSAP drives your target's `x`/`y` (transform-based, so it works on both DOM elements and SVG elements) using this, and can optionally also rotate the target to match the path's local tangent (`autoRotate: true`), which is what makes a car icon correctly point into curves instead of staying at a fixed rotation while translating along a curved road path.

All three are GSAP plugins that hook into the tween value-resolution system the same way core properties do, meaning they compose normally with the position parameter, stagger, and timelines from `gsap-core-timelines`.

## Setup
```bash
npm install gsap@^3.13
```
```js
import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';

gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin);
```
As of GSAP 3.13 (2025), DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin, SplitText, and the rest of the former "Club GSAP" bonus plugins are free and included in the standard `gsap` npm package and CDN build; no separate paid license or private registry token is required. Older tutorials referencing `gsap-bonus.tgz` or a Club GSAP private npm registry predate this change.

CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/DrawSVGPlugin.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/MorphSVGPlugin.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/MotionPathPlugin.min.js"></script>
```

## Core API
| API | Signature | Note |
|---|---|---|
| `gsap.set(target, { drawSVG: '0%' })` | instant | Hides stroke entirely as a starting state. |
| `gsap.to(target, { drawSVG: '0% 100%' })` | tween value | Animates the visible stroke range; `'X% Y%'` sets start/end of visible segment. |
| `gsap.to(target, { drawSVG: '100%' })` | shorthand | Equivalent to `'0% 100%'`, reveals the whole stroke from nothing. |
| `gsap.to(target, { morphSVG: '#targetPath' })` | tween value | Morphs current path's `d` toward the target selector's path data. |
| `morphSVG` object form | `{ shape, type, origin, shapeIndex }` | `type: 'rotational'` for rotation-friendly morphs; `shapeIndex` manually tunes point-mapping start offset if the default mapping looks twisted. |
| `gsap.to(target, { motionPath: path })` | tween value | `path` can be a selector string, an array of `{x,y}` points, or a config object. |
| `motionPath` object form | `{ path, align, autoRotate, alignOrigin, start, end, curviness }` | `align` ties positioning to a reference path element; `autoRotate: true` rotates target to tangent. |
| `MotionPathPlugin.convertToPath(target)` | converts shape to `<path>` | Needed if you want to visualize/animate a non-path SVG primitive (rect, circle) as a path. |
| `MorphSVGPlugin.convertToPath(target)` | converts shape to `<path>` | Same idea, required before morphing a non-path shape in some edge cases. |
| `vars.duration/ease/repeat/yoyo` | standard GSAP tween vars | Compose normally with all three plugins. |

## Recipes

### Logo/icon stroke reveal on load
Draws an SVG logo outline as if freshly sketched.
```js
import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
gsap.registerPlugin(DrawSVGPlugin);

gsap.set('#logo path', { drawSVG: '0%' });

gsap.to('#logo path', {
  drawSVG: '100%',
  duration: 1.4,
  ease: 'power1.inOut',
  stagger: 0.08,
});
```

### Animated chart line reveal
A data line chart draws left to right on scroll into view (pairs well with ScrollTrigger).
```js
import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
gsap.registerPlugin(DrawSVGPlugin);

gsap.set('.chart-line', { drawSVG: '0%' });

gsap.to('.chart-line', {
  drawSVG: '100%',
  duration: 1.8,
  ease: 'none',
});
```

### Icon state morph (hamburger to X, play to pause)
Two pre-drawn path states morph into each other on toggle.
```js
import { gsap } from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
gsap.registerPlugin(MorphSVGPlugin);

let isOpen = false;
const menuIcon = document.querySelector('#menu-icon-path');

document.querySelector('.menu-btn').addEventListener('click', () => {
  isOpen = !isOpen;
  gsap.to(menuIcon, {
    morphSVG: isOpen ? '#x-shape-path' : '#hamburger-shape-path',
    duration: 0.4,
    ease: 'power2.inOut',
  });
});
```

### Blob shape ambient morph loop
A decorative background blob continuously morphs between organic shapes.
```js
import { gsap } from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
gsap.registerPlugin(MorphSVGPlugin);

const tl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { duration: 3, ease: 'sine.inOut' } });

tl.to('#blob', { morphSVG: '#blob-shape-2' })
  .to('#blob', { morphSVG: '#blob-shape-3' })
  .to('#blob', { morphSVG: '#blob-shape-1' });
```

### Marker traveling along a curved route with rotation
A location pin or delivery icon follows an SVG path, rotating to match direction of travel.
```js
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
gsap.registerPlugin(MotionPathPlugin);

gsap.to('.delivery-marker', {
  motionPath: {
    path: '#route-path',
    align: '#route-path',
    autoRotate: true,
    alignOrigin: [0.5, 0.5],
  },
  duration: 4,
  ease: 'power1.inOut',
});
```

### Combined: draw a path, then travel a dot along it
Sequences a stroke reveal followed by a marker traversal on the same route.
```js
import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
gsap.registerPlugin(DrawSVGPlugin, MotionPathPlugin);

gsap.set('#route-path', { drawSVG: '0%' });
gsap.set('.travel-dot', { opacity: 0 });

const tl = gsap.timeline();

tl.to('#route-path', { drawSVG: '100%', duration: 1.5, ease: 'power1.inOut' })
  .to('.travel-dot', { opacity: 1, duration: 0.1 }, '-=0.1')
  .to('.travel-dot', {
    motionPath: { path: '#route-path', align: '#route-path', autoRotate: true },
    duration: 2,
    ease: 'power1.inOut',
  });
```

## Tuning the feel
- Icon/logo stroke reveals: 800-1500ms depending on path complexity, `power1.inOut` for a natural hand-drawn pace, or `none`/`linear` when paired with scroll scrubbing so the draw speed matches scroll speed exactly.
- Icon-to-icon morphs (menu/close, play/pause): 250-400ms, `power2.inOut`. These are UI state toggles, keep them snappy; anything over 500ms starts to feel like the icon is "struggling" to change.
- Decorative ambient blob morphs: 2.5-4s per stage with `sine.inOut`, looped with `yoyo: true`. Never use a sharp ease here; ambient background motion should never call attention to itself with a snap.
- Motion path traversal speed should be calibrated to path length, not a fixed duration: longer/more complex paths need proportionally longer durations or the marker appears to move at inconsistent speed relative to path curvature. As a starting point, aim for roughly 150-250 px of path length per second of duration for a "readable" pace.
- MorphSVG's default point-mapping can occasionally produce a "twisting" artifact mid-morph; if so, try `type: 'rotational'` first (cheap to test) before manually tuning `shapeIndex`.

## Performance
- DrawSVG only ever touches `stroke-dasharray`/`stroke-dashoffset`, both cheap, non-layout-triggering SVG attribute changes; safe to run at 60fps even on longer/complex paths.
- MorphSVG recalculates the full `d` attribute string every frame, which is a real string-diff and DOM-attribute cost, unlike transform-based tweens; very high point-count paths (hundreds of points, e.g. traced from a detailed illustration) can be measurably heavier. Simplify path point count (via a vector tool's "simplify path" function) before morphing decorative illustrations.
- MotionPath applies transforms (translate/rotate), which is compositor-safe regardless of the underlying path's complexity, since the path itself is only sampled, not re-rendered.
- Avoid running more than a handful of simultaneous MorphSVG tweens (e.g. many blobs morphing at once); batch or stagger them, or profile for style recalculation cost on the SVG document.
- For chart-line draws in dashboards with many lines, prefer one DrawSVG tween per line with a shared stagger rather than manually orchestrating separate timelines; fewer independently-ticking tweens is cheaper.

## Accessibility
```js
import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
gsap.registerPlugin(DrawSVGPlugin);

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (prefersReduced) {
  gsap.set('#logo path', { drawSVG: '100%' });
} else {
  gsap.set('#logo path', { drawSVG: '0%' });
  gsap.to('#logo path', { drawSVG: '100%', duration: 1.4, ease: 'power1.inOut', stagger: 0.08 });
}
```
Decorative SVGs (logos, blobs, chart flourishes) should carry `aria-hidden="true"` if they convey no independent information; the animation state should never be the only way to perceive real data (a chart line's final drawn shape must also be describable via an accessible data table or `aria-label` summary, not just visually). Icon morphs used as toggle buttons (menu/close) must update the button's `aria-expanded`/`aria-label` state in the same click handler that triggers the morph, not rely on the visual shape change alone to communicate state.

## Anti-slop rules
- Do not leave `drawSVG: '0%'` as the only starting state with no `gsap.set` fallback for `prefers-reduced-motion`; users who disable motion should see the complete shape immediately, not a permanently invisible stroke.
- Do not morph between two paths with wildly different point counts and skip previewing the mid-morph frames; twisting artifacts are common and must be checked by scrubbing the tween at low speed, not assumed fine.
- Do not use MorphSVG for anything that is actually just a position/size change of the same shape; that is unnecessary path interpolation overhead for a job `gsap-flip-layout` or a plain tween does more cheaply and correctly.
- Do not skip `autoRotate: true` on a motion-path animation of any directional icon (arrow, car, plane); a non-rotating icon sliding along a curved path looks visibly wrong to anyone who looks closely.
- Do not run a chart-line DrawSVG reveal with an eased curve when it is scroll-scrubbed; scrubbed draws must use `ease: 'none'` so draw progress tracks scroll position linearly.
- Do not stack more than 2-3 simultaneous ambient blob morphs on one screen; past that it reads as visual noise rather than atmosphere.
- Do not forget `stroke-linecap` styling (`round` typically looks best) when doing a draw reveal; the default `butt` cap can make the animated tip look like it is cut off abruptly rather than looking like a drawn line's natural end.

## Checklist
- [ ] `prefers-reduced-motion` shows the complete final shape/stroke instantly, not a hidden one.
- [ ] DrawSVG starting state (`0%`) set via `gsap.set` before the reveal tween, not relying on CSS alone.
- [ ] MorphSVG mid-transition frames previewed at low playback speed for twisting artifacts.
- [ ] Motion path animations of directional icons use `autoRotate: true` and correct `alignOrigin`.
- [ ] Chart/data-driven draws paired with an accessible non-visual data source.
- [ ] Icon-morph toggle buttons update `aria-expanded`/`aria-label` alongside the visual morph.
- [ ] Path point counts checked/simplified for any morph target sourced from a detailed illustration.
- [ ] Plugins registered once at app startup, not repeatedly per component instantiation.
