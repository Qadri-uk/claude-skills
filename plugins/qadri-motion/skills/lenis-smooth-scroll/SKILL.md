---
name: lenis-smooth-scroll
description: Use when a site needs buttery inertial scrolling, a scroll-linked animation library (GSAP ScrollTrigger, Framer Motion) needs a single source of truth for scroll position, or you must smooth-scroll to anchors without hijacking native scroll semantics.
---

# Lenis Smooth Scroll

## When to use this
- You want inertial/eased scrolling (the "feel" of native trackpad momentum, amplified) on desktop marketing sites, portfolios, or product pages.
- You are driving GSAP ScrollTrigger, a parallax system, or any scroll-linked animation and need one authoritative scroll value instead of fighting the browser's native scroll event timing.
- You need smooth anchor-link scrolling (`#section-2`) with custom easing instead of `scroll-behavior: smooth`'s fixed, non-configurable curve.
- You want horizontal-drives-vertical or virtual scroll setups (see `horizontal-scroll-gallery`) that need a controllable scroll proxy.
- Do NOT use this when the content is simple, mostly text, or accessibility/SEO-sensitive with no animation requirement, or when you only need scroll-triggered CSS effects with no JS budget: use `css-scroll-driven-animations` instead, since native scroll-timeline costs zero JS and never fights the browser's own scrolling.

## Mental model
Lenis does not scroll the page itself in the traditional sense. It intercepts wheel/touch input, accumulates a velocity value, and on every animation frame lerps the "virtual" scroll position toward a target using `lerp(current, target, easing)`. It then either (a) sets `window.scrollTo` directly (native mode) or (b) transforms a wrapper element with `translate3d` (transform mode, used when you need it to work inside `overflow: hidden` containers or alongside `position: sticky` pinning tricks). Native mode is default and preferred: it keeps native scrollbar, native find-in-page, and native accessibility scroll behavior, while Lenis only smooths the *rate* at which `scrollY` changes.

Critically, Lenis owns the RAF loop. If you already run GSAP's ticker or Three.js's render loop, you must NOT run two independent `requestAnimationFrame` loops that both write scroll-dependent state, or you get a frame of lag/jitter (one loop reads stale scroll, the other fresh). The correct pattern is: one RAF driver (usually `gsap.ticker`) calls `lenis.raf(time)` every frame, and everything else (ScrollTrigger, custom parallax) reads from `lenis.scroll` or subscribes to Lenis's `scroll` event, all inside that same tick.

The other thing to internalize: smoothing scroll means the visual scroll position lags behind the input by design (that's the whole point), so ScrollTrigger's `start`/`end` markers must be computed against the *smoothed* scroll, not raw wheel delta. GSAP's `ScrollTrigger.scrollerProxy` exists exactly to tell ScrollTrigger "here is how to read/set scroll on this custom scroller."

## Setup
```bash
npm install lenis@1.1.14 gsap@3.12.5
```
CDN alternative:
```html
<script src="https://unpkg.com/lenis@1.1.14/dist/lenis.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/lenis@1.1.14/dist/lenis.css">
```
Import the CSS (`lenis/dist/lenis.css` or the CDN link above) — it sets `html.lenis { scroll-behavior: auto !important }` which you need because native `scroll-behavior: smooth` fights Lenis's own easing.

```js
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)
```

## Core API
| API | Signature | Note |
|---|---|---|
| `new Lenis(options)` | constructor | `{ duration, easing, orientation, gestureOrientation, smoothWheel, wheelMultiplier, touchMultiplier, infinite }` |
| `lenis.raf(time)` | `(time: number) => void` | must be called every frame with a timestamp; drives the internal lerp |
| `lenis.scrollTo(target, opts)` | `(target: number\|string\|HTMLElement, opts?) => void` | opts: `{ offset, duration, easing, immediate, lock, onComplete }` |
| `lenis.on('scroll', cb)` | `(e: LenisScrollEvent) => void` | `e.scroll`, `e.limit`, `e.velocity`, `e.direction`, `e.progress` |
| `lenis.off('scroll', cb)` | removes listener | always clean up in framework effects |
| `lenis.stop()` / `lenis.start()` | pause/resume | use for modals, full-screen video, or menu overlays |
| `lenis.destroy()` | cleanup | removes listeners, restores native scroll |
| `lenis.scroll` | getter | current smoothed scroll position (px) |
| `lenis.limit` | getter | max scrollable distance |
| `lenis.velocity` | getter | current scroll velocity, useful for velocity-based skew effects |
| `lenis.isScrolling` | getter | boolean, true during an active `scrollTo` or user scroll |
| `lenis.options` | object | live-readable current config |
| `ScrollTrigger.scrollerProxy(el, config)` | GSAP API | tells ScrollTrigger how to read Lenis's scroll instead of native |
| `ScrollTrigger.update` | function | call inside Lenis's `scroll` event so triggers stay in sync |

## Recipes

### Baseline setup driven by GSAP ticker
Produces smooth inertial scroll across the whole page, single RAF loop, no jitter.
```js
import Lenis from 'lenis'
import gsap from 'gsap'

const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // custom expo-out
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 2,
})

gsap.ticker.add((time) => {
  lenis.raf(time * 1000) // gsap.ticker time is in seconds, lenis wants ms
})
gsap.ticker.lagSmoothing(0) // disable gsap's own lag compensation, lenis handles it
```

### GSAP ScrollTrigger integration
Makes every `ScrollTrigger` in the app read from Lenis's smoothed scroll value instead of native scroll.
```js
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

const lenis = new Lenis({ duration: 1.1, smoothWheel: true })

lenis.on('scroll', ScrollTrigger.update)

gsap.ticker.add((time) => {
  lenis.raf(time * 1000)
})
gsap.ticker.lagSmoothing(0)

// example trigger that now moves in lockstep with the smoothed scroll
gsap.to('.hero-title', {
  yPercent: -30,
  ease: 'none',
  scrollTrigger: {
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    scrub: 0.5,
  },
})

// refresh ScrollTrigger measurements after layout-affecting changes (images loading, fonts swapping)
window.addEventListener('load', () => ScrollTrigger.refresh())
```

### Smooth anchor navigation
Clicking any `<a href="#section">` scrolls with Lenis's easing instead of the browser default.
```js
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href')
    if (!href || href === '#') return
    const target = document.querySelector(href)
    if (!target) return
    e.preventDefault()
    lenis.scrollTo(target, {
      offset: -80, // account for a fixed 80px header
      duration: 1.4,
      easing: (t) => 1 - Math.pow(1 - t, 4),
    })
    history.pushState(null, '', href)
  })
})
```

### Pausing Lenis for a modal or full-bleed video
Stops smoothed scroll while a modal is open so background content cannot scroll underneath it.
```js
function openModal(modalEl) {
  lenis.stop()
  document.documentElement.classList.add('modal-open')
  modalEl.showModal()
}

function closeModal(modalEl) {
  modalEl.close()
  document.documentElement.classList.remove('modal-open')
  lenis.start()
}
```

### Velocity-reactive skew on scroll
Cards skew based on how fast the user is scrolling, snapping back to 0 when scroll stops, a common "premium site" tell.
```js
const skewTargets = document.querySelectorAll('.skew-on-scroll')
let currentSkew = 0

lenis.on('scroll', (e) => {
  const targetSkew = gsap.utils.clamp(-8, 8, e.velocity * 0.6)
  currentSkew = gsap.utils.interpolate(currentSkew, targetSkew, 0.15)
  skewTargets.forEach((el) => {
    el.style.transform = `skewY(${currentSkew}deg)`
  })
})
```

### React integration with lenis's own hook package
Wraps Lenis lifecycle in a component using `lenis/react`, safe for Next.js App Router client components.
```jsx
'use client'
import { ReactLenis, useLenis } from 'lenis/react'

export function SmoothScrollProvider({ children }) {
  const lenisRef = useLenis((lenis) => {
    // called every scroll frame; wire ScrollTrigger.update here if needed
  })

  return (
    <ReactLenis root options={{ duration: 1.2, smoothWheel: true }}>
      {children}
    </ReactLenis>
  )
}
```

## Tuning the feel
- `duration: 1.0-1.3` for general content sites. Below 0.8 barely reads as smoothing over native. Above 1.6 feels sluggish and disconnects input from output, users notice their scroll "not working."
- `wheelMultiplier: 1` is neutral; raise to `1.1-1.2` only if your `duration` is long and users complain scrolling feels slow to cover distance.
- `touchMultiplier: 1.5-2` because touch trackpads/phones need more gain to match desktop-wheel-feel; native touch scroll is already 1:1 and users expect it to keep pace.
- Custom easing: expo-out (`1 - 2^(-10t)`) or quart-out (`1 - (1-t)^4`) both read as "decelerating naturally." Avoid linear, it feels mechanical and defeats the purpose of smoothing.
- `lenis.scrollTo` anchor jumps: `duration 1.2-1.6s` depending on distance; scale duration with distance (`Math.min(2.2, 0.8 + distance / 2000)`) so a 200px jump and a 10000px jump do not take the same time.

## Performance
- Lenis in native mode only writes `window.scrollTo`, which is compositor-cheap; the cost lives in whatever you attach to the `scroll` event. Keep `scroll` handlers to reading values and writing `transform`/`opacity`, never `top`/`left`/`width` (triggers layout).
- Never run a second independent RAF loop for scroll-linked work. Route everything through the single `gsap.ticker` tick that also drives `lenis.raf`.
- Call `ScrollTrigger.refresh()` only after layout-affecting async events (images/fonts loading, route changes), not on every scroll frame; excessive refresh recalculates every trigger's start/end and is expensive on pages with 20+ triggers.
- Profile with Chrome DevTools Performance panel: a healthy Lenis setup shows one "Animation Frame Fired" per RAF with a single scripting block under ~2ms for scroll handling. If you see two separate script blocks per frame both touching scroll, you have a duplicate loop.
- `lenis.destroy()` on route change in SPA frameworks; a leaked Lenis instance keeps listening to wheel events and stacks with the new page's instance.

## Accessibility
```js
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const lenis = new Lenis({
  duration: prefersReduced ? 0 : 1.2,
  smoothWheel: !prefersReduced,
})

if (prefersReduced) {
  // skip the RAF loop entirely, let native scroll take over
} else {
  gsap.ticker.add((time) => lenis.raf(time * 1000))
}
```
- Keyboard scrolling (Page Down, Space, arrow keys, Home/End) still dispatches native scroll events that Lenis intercepts by default; verify `Tab`-focusing a link far down the page still scrolls it into view (Lenis listens for this but test it, some old versions had a `wheelEventsTarget` bug).
- Never call `preventDefault()` on wheel events without Lenis's own management, doing so breaks two-finger-swipe browser back/forward gestures on trackpads.
- Screen readers navigate by DOM order, not scroll position; Lenis's virtual scroll never changes DOM order so this is unaffected, but verify `aria-live` regions announcing scroll progress (if any) do not fire on every RAF tick.

## Anti-slop rules
- Never enable smooth scroll on every project by default. If there is no scroll-linked animation depending on it, plain native scroll is more honest and cheaper; smoothing for its own sake reads as an unnecessary layer of latency.
- Never set `duration` above 1.6s. Long smoothing makes the page feel broken, not premium, and is the single most common Lenis mistake in template sites.
- Never leave `lagSmoothing` enabled on `gsap.ticker` while also running Lenis; the two lag-compensation systems fight each other and produce visible stutter on frame drops.
- Never smooth-scroll on mobile by default. Mobile touch scroll is already physically correct (OS-native momentum); wrapping it in Lenis's own lerp on top usually degrades feel. Set `smoothWheel: true, smoothTouch: false` unless you have tested the exact opposite feels better on target devices.
- Never forget `ScrollTrigger.refresh()` after fonts/images finish loading; skipping it is the number one cause of "trigger points are wrong on first load, fine after resize."
- Never build a scroll-jack (full `preventDefault` + manual scroll simulation) when Lenis's native mode achieves the same feel with none of the accessibility loss; scroll-jacking breaks Cmd+F, breaks pinch-zoom-then-scroll, and breaks assistive tech.
- Never instantiate more than one Lenis instance on the same page; nested smoothing compounds into visibly wrong physics.

## Checklist
- [ ] Single RAF driver (`gsap.ticker`) calls `lenis.raf(time)`, no competing loops
- [ ] `gsap.ticker.lagSmoothing(0)` set when using GSAP alongside Lenis
- [ ] `ScrollTrigger.scrollerProxy` or `lenis.on('scroll', ScrollTrigger.update)` wired if using ScrollTrigger
- [ ] `prefers-reduced-motion` disables or shortens smoothing
- [ ] `smoothTouch` explicitly considered, not left at a guessed default
- [ ] Anchor links intercepted and routed through `lenis.scrollTo`
- [ ] `lenis.stop()`/`start()` wired to modal/overlay open state
- [ ] `lenis.destroy()` called on SPA route unmount
- [ ] `ScrollTrigger.refresh()` called after fonts/images/async layout settle
- [ ] Verified keyboard scroll (Space, Page Down, Home/End) still works correctly
