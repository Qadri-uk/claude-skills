# Sticky / Pinning Sequences Reference

## Full ScrollTrigger pin option table
| Option | Type | Default | Note |
|---|---|---|---|
| `pin` | `boolean \| string \| Element` | `false` | element to pin, defaults to `trigger` if `true` |
| `pinSpacing` | `boolean \| 'margin'` | `true` | `'margin'` uses margin instead of padding for the spacer, needed with certain flex/grid parents |
| `pinType` | `'fixed' \| 'transform'` | auto-detected | force `'transform'` inside `transform`/`filter`/`overflow` ancestors |
| `pinReparent` | `boolean` | `false` | moves pinned element to be a direct child of `<body>` during pin |
| `anticipatePin` | `number (0-1)` | `0` | pre-engages pin slightly before calculated start to avoid flick-jump |
| `pinnedContainer` | `string \| Element` | `null` | for cases where a container around the pin also needs spacing adjustments |
| `invalidateOnRefresh` | `boolean` | `false` | recompute tween start values on refresh, needed if animated values depend on measured layout |

## `position: sticky` unsticking rules (native CSS, no JS)
An element stops being sticky and returns to normal flow the instant its nearest scrolling ancestor's edge (the containing block boundary) reaches the sticky element's `top`/`bottom` offset in the opposite direction. Practical implications:
- The sticky element's parent must have a height greater than the sticky element itself, or it never has room to "stick" at all (it would be stuck from the very first pixel to the last, indistinguishable from normal `position: static`).
- `overflow: hidden`, `overflow: auto`, or `overflow: scroll` on ANY ancestor between the sticky element and the viewport breaks sticky behavior entirely; this is the most common native-sticky bug, caused by an ancestor that clips overflow for an unrelated reason (e.g. a card with `overflow: hidden` for rounded corners).
- `transform`, `filter`, `will-change: transform`, `contain: paint` on an ancestor create a new containing block that can also break sticky positioning relative to the viewport; test sticky behavior after adding any of these to an ancestor for animation purposes.

## Computing pin spacer height manually (for debugging mismatches)
```
spacerHeight = triggerElementHeight + pinDuration
```
where `pinDuration` is the pixel equivalent of your `end` value (e.g. `end: '+=300%'` relative to a 100vh section trigger means `pinDuration = 3 * viewportHeight`). If later content overlaps the pinned section on release, the spacer is shorter than the real pin duration, usually because `end` references the wrong base measurement (percentage of trigger height vs percentage of viewport height are different units, verify which `end` syntax you used).

## `end` value syntax cheatsheet
| Syntax | Meaning |
|---|---|
| `'bottom top'` | ends when trigger's bottom hits viewport top (typical for "pin until content clears") |
| `'+=500'` | ends 500px after start |
| `'+=100%'` | ends one full viewport height after start (percentage of viewport, when no other element referenced) |
| `'+=100% .other-el'` | ends when 100% of `.other-el`'s height has scrolled past start |
| `'bottom bottom'` | ends when trigger's bottom hits viewport bottom, common for full-height text-column-driven pins |

## Fixing z-index/stacking bugs on pinned elements
If a pinned element visually disappears behind later content despite a high `z-index`, the pin's spacer or an ancestor's stacking context is the usual cause:
```js
ScrollTrigger.create({
  trigger: '.pin-section',
  pin: true,
  pinReparent: true, // moves element to <body>, escaping problematic ancestor stacking contexts
  start: 'top top',
  end: '+=200%',
})
```
Only reach for `pinReparent` after confirming the bug; it has real DOM-move cost and can interfere with CSS selectors scoped via ancestor classes (`.parent .pinned-child` stops matching once reparented).

## Horizontal pin variant preview
A vertical scroll pins a horizontally-scrolling row (full pattern lives in `horizontal-scroll-gallery`):
```js
const track = document.querySelector('.h-track')
const scrollDistance = track.scrollWidth - window.innerWidth

gsap.to(track, {
  x: -scrollDistance,
  ease: 'none',
  scrollTrigger: {
    trigger: '.h-pin-section',
    start: 'top top',
    end: () => `+=${scrollDistance}`,
    pin: true,
    scrub: 0.5,
    invalidateOnRefresh: true,
  },
})
```

## Debugging checklist for "pin isn't working"
1. Trigger element has no defined height and content inside is `position: absolute`, collapsing it to 0 height, ScrollTrigger measures 0 and pins for zero duration.
2. An ancestor has `overflow: hidden` — breaks both native sticky and can interfere with GSAP's fixed positioning strategy depending on `pinType` detection.
3. `ScrollTrigger.refresh()` never called after a layout-shifting async load (web font swap changing text height, image loading changing container height).
4. Multiple ScrollTriggers pinning overlapping trigger ranges without accounting for each other's spacers, causing measured positions to be stale from before the earlier pin's spacer was inserted; create pins in top-to-bottom document order and refresh once at the end.

## React (useLayoutEffect) cleanup pattern
GSAP ScrollTrigger instances must be explicitly killed on unmount in SPA frameworks, or they keep referencing detached DOM nodes and leak.
```jsx
import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

function PinnedSection() {
  const sectionRef = useRef(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '+=200%',
          pin: true,
          scrub: 0.5,
        },
      }).to('.pin-content', { xPercent: -30 })
    }, sectionRef)

    return () => ctx.revert() // kills ScrollTriggers and reverts inline styles GSAP added
  }, [])

  return (
    <section ref={sectionRef} className="pin-section">
      <div className="pin-content">...</div>
    </section>
  )
}
```
`gsap.context()` scoped to a ref is the standard React-safe cleanup pattern; `ctx.revert()` removes both the ScrollTrigger instances and any inline styles GSAP applied, restoring the DOM to its pre-mount state cleanly on unmount or hot-reload.
