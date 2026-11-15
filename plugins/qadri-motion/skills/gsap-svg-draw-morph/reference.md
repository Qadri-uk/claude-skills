# GSAP SVG draw/morph/motion-path reference

## drawSVG value formats
| Value | Meaning |
|---|---|
| `'0%'` | Nothing visible (fully hidden). |
| `'100%'` | Fully visible (whole stroke drawn). |
| `'50%'` | First half of the path visible, from start. |
| `'25% 75%'` | Only the segment between 25% and 75% of the path length is visible (both ends hidden). |
| `'0% 100%'` | Explicit full reveal, equivalent to `'100%'`. |
| `'100% 0%'` | Reversed range (draws the "erase" direction depending on interpretation); test visually. |
| pixel values, e.g. `'0px 240px'` | Absolute length along the path instead of percentage. |

## morphSVG vars object
| Option | Type | Note |
|---|---|---|
| `shape` | selector/path-data string | The target end shape. |
| `type` | `'linear'` (default) or `'rotational'` | Rotational suits shapes that should spin/rotate into each other rather than translate points. |
| `origin` | `'50% 50%'` style string | Origin point used for rotational morphs. |
| `shapeIndex` | number or `'auto'` | Manually offsets which point on the destination shape maps to point 0 of the source shape, fixes twisting. |
| `map` | `'size'`, `'position'`, `'complexity'` | Controls the algorithm's point-mapping heuristic between mismatched shapes. |
| `precompile` | array | Precompiles a set of shapes for less runtime cost when there are many possible morph targets. |

## motionPath vars object
| Option | Type | Note |
|---|---|---|
| `path` | selector, path data string, or array of `{x,y}` points | The path to follow. |
| `align` | selector | Aligns coordinate system to this path's own coordinate space (usually same as `path`). |
| `alignOrigin` | `[originX, originY]` (0-1 each) | Which point of the target element sits on the path; `[0.5, 0.5]` centers it. |
| `autoRotate` | boolean or number (degrees offset) | Rotates target to match path tangent; a number adds a fixed offset (e.g. if artwork's "forward" isn't along +x). |
| `start` / `end` | number (0-1) | Restrict animation to a sub-range of the path. |
| `curviness` | number | When `path` is an array of raw points (not an actual `<path>`), controls how tightly GSAP curves through them (1 = tight, higher = looser). |
| `resolution` | number | Sampling resolution for rotation calculation accuracy on sharply curved paths. |

## Additional recipes

### Percentage-based partial stroke "loading" indicator
```js
import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
gsap.registerPlugin(DrawSVGPlugin);

function setProgress(percent) {
  gsap.to('.progress-ring circle', {
    drawSVG: `0% ${percent}%`,
    duration: 0.4,
    ease: 'power2.out',
  });
}

setProgress(65);
```

### Morphing a circle directly into a custom path (no pre-drawn intermediate shape needed)
```js
import { gsap } from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
gsap.registerPlugin(MorphSVGPlugin);

gsap.to('#loader-circle', {
  morphSVG: { shape: '#checkmark-path', type: 'rotational' },
  duration: 0.5,
  ease: 'power2.inOut',
});
```

### Motion path restricted to a sub-range with looping
```js
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
gsap.registerPlugin(MotionPathPlugin);

gsap.to('.orbiter', {
  motionPath: {
    path: '#orbit-path',
    align: '#orbit-path',
    autoRotate: false,
    start: 0,
    end: 1,
  },
  duration: 6,
  ease: 'none',
  repeat: -1,
});
```

### Using an array of points instead of an actual SVG path element
```js
import { gsap } from 'gsap';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
gsap.registerPlugin(MotionPathPlugin);

gsap.to('.kite', {
  motionPath: {
    path: [
      { x: 0, y: 0 },
      { x: 120, y: -80 },
      { x: 260, y: 20 },
      { x: 400, y: -40 },
    ],
    curviness: 1.5,
    autoRotate: true,
  },
  duration: 3,
  ease: 'power1.inOut',
});
```

## Gotchas
- `drawSVG` requires the target to actually have a visible `stroke` set (via CSS or attribute); a path with `fill` only and no stroke has nothing for DrawSVG to reveal, and it will silently do nothing visible.
- MorphSVG needs both source and destination to ultimately be `<path>` elements; morphing directly from a `<circle>`/`<rect>`/`<polygon>` works because the plugin auto-converts them internally, but the conversion happens at tween creation, so dynamically changing a non-path shape's attributes after the tween is created will not be picked up.
- `stroke-dasharray` set manually in CSS on a DrawSVG target conflicts with the plugin, which manages that attribute itself; remove any competing CSS `stroke-dasharray` rule from DrawSVG targets.
- MorphSVG's default `shapeIndex: 'auto'` guesses the best starting point alignment but is not guaranteed optimal for highly asymmetric shapes; if a morph looks twisted, try explicit integer `shapeIndex` values (0, 1, 2...) to find a cleaner mapping before assuming the shapes are simply incompatible.
- `autoRotate` on MotionPath assumes the target's un-rotated artwork points in the "forward" (positive x) direction; artwork drawn pointing up or in another default direction needs a numeric offset passed to `autoRotate` (e.g. `autoRotate: 90`) to correct the baseline orientation.
- Viewbox/coordinate-system mismatches between the path used for `motionPath` and the target element (e.g. animating an HTML DOM element along an SVG path defined in a differently-scaled viewBox) require matching `align` to the correct reference element or the translated coordinates will be wrong; test in the actual target coordinate space, not just visually in the SVG editor.
- Percent-based `drawSVG` values are relative to total path length as computed at animation creation; if the underlying path's `d` attribute changes after the DrawSVG tween is created (e.g. because it is also being morphed concurrently), the dash calculations can become inconsistent. Avoid animating both `morphSVG` and `drawSVG` on the exact same element in the same timeframe without testing carefully.
