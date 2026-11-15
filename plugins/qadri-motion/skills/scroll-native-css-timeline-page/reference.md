# Reference: Native CSS Scroll-Driven Animations

## Complete property table

| Property | Values | Default | Notes |
|---|---|---|---|
| `animation-timeline` | `auto \| none \| scroll() \| view() \| <custom-ident>` | `auto` (time-based) | Replaces the clock with a scroll or view progress source |
| `scroll()` | `scroll( [scroller] [axis] )` | `scroll(nearest block)` | `scroller`: `nearest \| root \| self`. `axis`: `block \| inline \| x \| y` |
| `view()` | `view( [axis] [inset] )` | `view(block auto)` | Tracks element visibility in its scrollport |
| `animation-range` | `normal \| <range-start> <range-end>` | `normal` (0% 100%) | Segments which portion of the timeline maps to keyframes |
| `animation-range-start` | `normal \| <length-percentage> \| <timeline-range-name> <length-percentage>` | `normal` | Start point within the timeline |
| `animation-range-end` | same as start | `normal` | End point within the timeline |
| `scroll-timeline` | `<custom-ident> [axis]` | none | Shorthand to create a named scroll timeline on a scroller |
| `scroll-timeline-name` | `none \| <custom-ident>` | `none` | Names a scroll timeline |
| `scroll-timeline-axis` | `block \| inline \| x \| y` | `block` | Axis for named scroll timeline |
| `view-timeline` | `<custom-ident> [axis]` | none | Shorthand to create a named view timeline |
| `view-timeline-name` | `none \| <custom-ident>` | `none` | Names a view timeline |
| `view-timeline-axis` | `block \| inline \| x \| y` | `block` | Axis for named view timeline |
| `view-timeline-inset` | `auto \| <length-percentage>{1,2}` | `auto` | Adjusts the scrollport boundaries for view timeline calculation |
| `timeline-scope` | `none \| <custom-ident>#` | `none` | Hoists a named timeline to an ancestor so non-descendant elements can reference it |
| `animation-trigger` | (Chrome 145+ only) | none | Declarative scroll-triggered one-shot animation |

## animation-range named regions

| Region | Meaning |
|---|---|
| `entry` | Element entering the scrollport (first pixel in to fully inside) |
| `exit` | Element leaving the scrollport (starts leaving to fully out) |
| `cover` | Full journey from first pixel in to last pixel out |
| `contain` | Period when element is fully contained within the scrollport |
| `entry-crossing` | Element's leading edge crossing the entry edge |
| `exit-crossing` | Element's trailing edge crossing the exit edge |

Each region maps 0% to 100% within its own sub-range of the full timeline. You can combine regions:
`animation-range: entry 20% exit 80%` starts at 20% of entry and ends at 80% of exit.

## @property registration syntax

```css
@property --my-color {
  syntax: '<color>';
  inherits: true;        /* or false */
  initial-value: #000;   /* required; must match syntax */
}
```

Supported syntax values for animation:
- `<color>` -- color interpolation
- `<length>` -- length interpolation
- `<length-percentage>` -- length or percentage
- `<number>` -- numeric
- `<integer>` -- integer steps
- `<angle>` -- rotation
- `<percentage>` -- percentage

Without `@property` registration, custom properties are `<string>` type and cannot be interpolated by the animation engine. They snap between keyframe values.

## Browser support matrix (as of mid-2026)

| Feature | Chrome/Edge | Safari | Firefox |
|---|---|---|---|
| `animation-timeline: scroll()` | 115+ (July 2023) | 26+ (2026) | 155+ (2025) |
| `animation-timeline: view()` | 115+ | 26+ | 155+ |
| `animation-range` | 115+ | 26+ | 155+ |
| Named scroll/view timelines | 115+ | 26+ | 155+ |
| `timeline-scope` | 116+ | 26+ | 155+ |
| `animation-trigger` | 145+ | Not supported | Not supported |
| `@property` | 85+ | 16.4+ | 128+ |
| `view-timeline-inset` | 115+ | 26+ | 155+ |

## Polyfill

The official polyfill from the spec editors:
```bash
npm install scroll-timeline-polyfill@1
```
```html
<script src="https://cdn.jsdelivr.net/npm/scroll-timeline-polyfill@1/dist/scroll-timeline.js"></script>
```

Load conditionally:
```html
<script>
  if (!CSS.supports('animation-timeline', 'scroll()')) {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/scroll-timeline-polyfill@1/dist/scroll-timeline.js';
    document.head.appendChild(s);
  }
</script>
```

Limitations: the polyfill runs on the main thread (defeats the compositor advantage), does not support `timeline-scope`, and may not handle all `animation-range` combinations.

## Common gotchas

### 1. animation shorthand resets animation-timeline
```css
/* BROKEN */
.el {
  animation-timeline: view();
  animation: fade-in linear both; /* resets timeline to auto */
}

/* FIXED -- timeline after shorthand */
.el {
  animation: fade-in linear both;
  animation-timeline: view();
}

/* SAFEST -- all longhand */
.el {
  animation-name: fade-in;
  animation-duration: auto;
  animation-timing-function: linear;
  animation-fill-mode: both;
  animation-timeline: view();
}
```

### 2. animation-duration must be auto
The default `animation-duration: 0s` means no animation plays. When using scroll/view timelines, the timeline controls the duration. Set `animation-duration: auto` explicitly, or use the shorthand where it is included.

### 3. view() resolves against nearest scrollport
If `.reveal` is inside an `overflow: auto` container, `view()` tracks visibility within that container, not the page. Either remove the intermediate overflow or use a named timeline on the intended scroller with `timeline-scope` to hoist it.

### 4. Named timelines only resolve on ancestors
`animation-timeline: --my-tl` only finds `--my-tl` defined on an ancestor. For sibling resolution, use `timeline-scope: --my-tl` on a common ancestor.

### 5. Scroll snap + scroll-driven animations
`scroll-snap-type` causes discontinuous scroll positions during snap animations. Scroll-driven animations track the actual scroll position, so they jump/accelerate during snap settling. This creates visible stutter in scrubbed animations.

### 6. First element's view() is already past entry on load
An element visible on initial load (above the fold) has a `view()` timeline that starts mid-progress or fully complete. Its entry animation will not play. Solutions:
- Accept this (content is visible, which is fine)
- Use `scroll(root)` with explicit start/end pixel ranges for above-fold elements
- Use `animation-range: cover 0% cover 30%` which includes the initial state

### 7. clip-path animation performance
`clip-path: inset()` animation is compositor-safe in Chromium but not guaranteed in Firefox/Safari. If frame rate drops on non-Chromium browsers, conditionally disable clip-path animation via a browser-specific `@supports` check or media query.

## Debugging tools

### Chrome DevTools Animations panel
Shows scroll-driven animations with a scroll icon (not a clock). Scrubbing the page in the Performance panel shows animation progress synced to scroll position.

### Scroll-driven Animations visualization tool
https://scroll-driven-animations.style/tools/view-timeline/ranges/
Interactive tool to visualize how `animation-range` maps to element visibility phases.

### Chrome flags
`chrome://flags/#enable-experimental-web-platform-features` enables bleeding-edge features like `animation-trigger` before stable release.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Animation plays on load, not on scroll | `animation` shorthand reset `animation-timeline` | Use longhand or put timeline after shorthand |
| Animation does not play at all | `animation-duration: 0s` (default) | Set `animation-duration: auto` |
| Colors snap instead of blending | Custom property not registered with `@property` | Add `@property` with `syntax: '<color>'` |
| Parallax creates horizontal scrollbar | Layer positioned outside viewport bounds | Use `inset: -20% 0` not `inset: -20%` |
| view() animation never fires | Element is always in viewport | Use `scroll(root)` or accept static state |
| view() tracks wrong scroller | Intermediate `overflow: auto/hidden` ancestor | Remove intermediate overflow or use `timeline-scope` |
| Animation jitters during scroll-snap | Snap settling causes discontinuous scroll values | Avoid combining snap with scrubbed animations on same axis |
| Progress bar stops at ~98% | `html` or wrapper has `overflow: hidden` clipping final scroll range | Remove restrictive overflow, ensure `scroll(root block)` |
