# CSS Scroll-Driven Animations Reference

## Browser support matrix (as of 2024-2025)
| Feature | Chrome/Edge | Firefox | Safari |
|---|---|---|---|
| `animation-timeline: scroll()` | 115+ | behind flag / partial 2024 | not shipped (in development, Safari TP as of late 2024) |
| `animation-timeline: view()` | 115+ | behind flag | not shipped |
| `scroll-timeline-name`/`-axis` | 115+ | behind flag | not shipped |
| `view-timeline-name`/`-inset` | 115+ | behind flag | not shipped |
| `timeline-scope` | 116+ | no | no |

Always verify current support at caniuse.com before shipping without the polyfill; this table reflects the initial rollout window and non-Chromium support was expanding through 2025.

## `animation-range` keyword reference
| Keyword | Meaning |
|---|---|
| `normal` | default, full 0%-100% of the timeline |
| `cover` | element's visibility from first pixel entering to last pixel leaving (full lifecycle) |
| `contain` | the portion where the element is fully contained within the scrollport (only meaningful if element is smaller than scrollport) |
| `entry` | phase where the element is entering (not yet fully covering scrollport) |
| `entry-crossing` | while element is larger than viewport and its leading edge is still crossing in |
| `exit` | phase where the element is leaving |
| `exit-crossing` | while element is larger than viewport and its trailing edge is crossing out |

Percentages after each keyword are relative to that named phase's own 0-100%, not the whole timeline. `entry 50%` means halfway through the entry phase specifically.

## Named timeline scoping with `timeline-scope`
When a `view-timeline-name` is defined on a deeply nested element but you need to reference it from a sibling elsewhere in the tree (e.g. a fixed progress dot outside the scrolling card list), declare `timeline-scope` on a shared ancestor:
```css
.list-wrapper {
  timeline-scope: --card-3-view;
}
.card:nth-child(3) {
  view-timeline-name: --card-3-view;
}
.progress-dot-3 {
  animation: light-up linear both;
  animation-timeline: --card-3-view;
}
```

## Combining scroll() and view() with JS for measurement-only use
You can read a scroll-driven timeline's current progress in JS without re-implementing the animation, useful for syncing a canvas draw or a text counter to the same timeline:
```js
const el = document.querySelector('.hero-media img')
const anim = el.getAnimations().find(a => a.timeline instanceof ViewTimeline)
if (anim) {
  const progress = anim.effect.getComputedTiming().progress // 0 to 1
}
```
Note: `ViewTimeline`/`ScrollTimeline` as constructible JS objects (`new ViewTimeline({...})`) also exist and can be assigned to a Web Animations API animation's `.timeline` property directly, bypassing CSS entirely, for JS-driven scroll timelines with the same zero-per-frame-callback cost:
```js
const timeline = new ViewTimeline({ subject: document.querySelector('.card') })
document.querySelector('.card').animate(
  [{ opacity: 0, transform: 'translateY(40px)' }, { opacity: 1, transform: 'translateY(0)' }],
  { timeline, fill: 'both', rangeStart: 'entry 0%', rangeEnd: 'cover 30%' }
)
```

## Polyfill caveats
`scroll-timeline-polyfill` re-implements the behavior using IntersectionObserver and scroll listeners under the hood, meaning polyfilled browsers do NOT get the true zero-JS compositor benefit; treat the polyfill as a correctness fallback, not a performance parity fallback. Test performance separately on non-Chromium engines with the polyfill active before deciding it is fast enough.

## Common bugs and fixes
- Animation never plays: forgot `animation-timeline` on the element that also has the `@keyframes` `animation` shorthand; both must be on the same element.
- Element pops to final state immediately: `animation-range` start point is already past the current scroll position on load (e.g. `entry 0%` but element started already scrolled past entry phase); wrap the whole page load in a scroll-to-top or accept the pop as correct behavior for return visits.
- Multiple transforms canceling out: two `animation-timeline` rules both set the `transform` shorthand on the same element; split into `translate`, `scale`, `rotate` individual CSS properties (all independently animatable since Level 4 Transforms) so multiple scroll-driven effects can compose.
- Nested scrollers confusing `scroll(nearest)`: when both an inner scrollable div and the document are both potential targets, be explicit with `scroll(root block)` vs `scroll(self block)` rather than relying on `nearest` inference.

## Debugging in DevTools
Chrome DevTools (117+) has a dedicated "Animations" panel entry for scroll-driven animations: open the Animations tab, trigger the animation once by scrolling, and it shows a scrubbable timeline bound to scroll position rather than time. Dragging the scrubber in DevTools simulates scroll position without actually scrolling the page, which is the fastest way to tune `animation-range` values without repeated manual scrolling.

## Choosing between `scroll()` and `view()` quickly
- Ask "does this depend on where the *page* is scrolled" (progress bar, parallax tied to total document position) -> `scroll()`.
- Ask "does this depend on where *this element* is relative to the viewport" (card fades in, image zooms as it appears) -> `view()`.
- If unsure, `view()` is the safer default for component-level effects because it is self-contained and does not break when the element's position in a longer or shorter page changes.

## Interaction with `content-visibility: auto`
Elements with `content-visibility: auto` that are off-screen are skipped during rendering, which can delay when their `view-timeline` first registers a phase change if the browser has not yet computed intrinsic size. Pair `contain-intrinsic-size` with `content-visibility: auto` on any element also carrying a `view-timeline-name`, so off-screen size estimates do not cause range jump-cuts the first time it scrolls near the viewport.

## Server-rendered / SSR considerations
Because this is pure CSS, there is no hydration mismatch risk like JS scroll libraries have in React/Next SSR. The `@supports` fallback rule renders identically on server and client, so no `useEffect`-gated class toggling is needed to avoid flash-of-unanimated-content; the non-animated fallback state can simply be the base styles with the scroll-timeline rules layered on top inside the `@supports` block.
