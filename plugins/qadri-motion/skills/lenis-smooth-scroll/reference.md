# Lenis Reference

## Full options table
| Option | Default | Notes |
|---|---|---|
| `wrapper` | `window` | element that receives scroll listeners |
| `content` | `document.documentElement` | element being transformed in "transform mode" |
| `wheelEventsTarget` | `wrapper` | separate target for wheel capture vs scroll application |
| `eventsTarget` | `wrapper` | same idea for touch/pointer |
| `smoothWheel` | `true` | smooth mouse wheel input |
| `syncTouch` | `false` | experimental: sync smoothing to touch too, can feel laggy |
| `syncTouchLerp` | `0.075` | lerp factor when `syncTouch` is on |
| `touchInertiaMultiplier` | `35` | touch fling momentum scale |
| `duration` | `1.2` | seconds for the internal lerp/spring to settle |
| `easing` | `(t) => Math.min(1, 1.001 - Math.pow(2, -10*t))` | function `(t: 0-1) => 0-1` |
| `orientation` | `'vertical'` | `'vertical' \| 'horizontal'` |
| `gestureOrientation` | `'vertical'` | which gesture axis maps to scroll, `'both'` supported |
| `smoothTouch` | `false` (deprecated in favor of `syncTouch`) | older versions only |
| `touchMultiplier` | `1` | gain applied to touch delta |
| `wheelMultiplier` | `1` | gain applied to wheel delta |
| `infinite` | `false` | loops scroll content, requires manual content duplication |
| `autoResize` | `true` | recalculates `limit` on resize via ResizeObserver |
| `prevent` | `(node) => boolean` | function to exclude nested scrollable elements (modals, code blocks) from Lenis capture |

## Event payload shape
```ts
interface LenisScrollEvent {
  scroll: number      // current smoothed position
  limit: number        // max scrollable value
  velocity: number      // px/frame delta
  direction: 1 | -1 | 0
  progress: number      // scroll / limit, 0-1
}
```

## Excluding nested scrollers (dropdowns, code blocks, modals)
```js
const lenis = new Lenis({
  prevent: (node) => node.closest('[data-lenis-prevent]') !== null,
})
```
```html
<div class="code-block" data-lenis-prevent style="overflow:auto; max-height:300px;">
  ...
</div>
```

## Horizontal Lenis instance for a gallery section
```js
const galleryLenis = new Lenis({
  wrapper: document.querySelector('.gallery-wrapper'),
  content: document.querySelector('.gallery-track'),
  orientation: 'horizontal',
  gestureOrientation: 'both',
  duration: 1.0,
})
gsap.ticker.add((time) => galleryLenis.raf(time * 1000))
```

## Vue 3 composable pattern
```js
import { onMounted, onBeforeUnmount, ref } from 'vue'
import Lenis from 'lenis'

export function useLenis(options = {}) {
  const lenis = ref(null)
  let rafId

  onMounted(() => {
    lenis.value = new Lenis(options)
    function raf(time) {
      lenis.value.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(rafId)
    lenis.value?.destroy()
  })

  return lenis
}
```
Note: this pattern uses raw `requestAnimationFrame` because Vue apps often do not already run GSAP's ticker; if GSAP is present, prefer `gsap.ticker.add` as shown in SKILL.md to keep a single frame driver.

## Debugging checklist when Lenis "feels wrong"
1. Two RAF loops running (GSAP ticker + a stray `requestAnimationFrame` elsewhere) — search codebase for all `requestAnimationFrame(` calls.
2. `lagSmoothing` still enabled on `gsap.ticker` — call `gsap.ticker.lagSmoothing(0)`.
3. CSS `scroll-behavior: smooth` still set on `html` somewhere, fighting Lenis's own scroll writes — the Lenis stylesheet should override this, confirm it loaded.
4. A `overflow: hidden` ancestor of `document.documentElement` that breaks native scroll mode — switch that instance to transform mode with explicit `wrapper`/`content`.
5. ScrollTrigger start/end computed before Lenis initialized — always init Lenis before any `ScrollTrigger.create` calls, or call `ScrollTrigger.refresh()` after.
6. Mobile feels laggy — `syncTouch` was left on by mistake, or `touchMultiplier` too low; test with it fully off first.

## Known version gotchas
- Lenis 1.x renamed several 0.x options (`smooth` → implicit via `smoothWheel`, `mouseMultiplier` → `wheelMultiplier`). Do not mix documentation from 0.x tutorials with 1.x code.
- `lenis.css` must be imported once globally; importing it per-component in CSS-module setups can duplicate the `!important` override and mask real bugs.
- `ReactLenis` from `lenis/react` renders a wrapping `<div>` unless `root` prop is passed, which changes your DOM structure; use `root` for whole-page smoothing to avoid an extra wrapper.
