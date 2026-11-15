---
name: view-transitions-api
description: Use when you need native cross-fade or shared-element morph transitions between DOM states (same-document SPA route changes) or between full page loads (cross-document MPA navigation), using document.startViewTransition or the navigation.transition CSS-driven MPA API, without a JS animation library.
---

# View Transitions API

## When to use this
- You are swapping DOM content (route change in a SPA, tab switch, list reorder) and want an automatic cross-fade or a shared-element "morph" (an image growing from a thumbnail to a detail view) without manually animating both states.
- You run a traditional multi-page site (MPA) and want smooth transitions between full navigations without adopting a SPA framework, using the newer cross-document view transitions.
- You need per-element transition identity (`view-transition-name`) so specific elements morph into their counterpart on the next page/state while everything else cross-fades.
- Do NOT use this for scroll-linked or continuously-scrubbed animation; view transitions are one-shot, triggered-by-a-state-change transitions, not scroll-position-driven. Use `css-scroll-driven-animations` or `sticky-pinning-sequences` for anything tied to scroll position instead.

## Mental model
When you call `document.startViewTransition(callback)`, the browser does something conceptually simple but implemented at the compositor level: it takes a screenshot of the current DOM state (the "old" state), runs your callback synchronously to mutate the DOM into its "new" state, then takes a screenshot-equivalent capture of that new state. It builds a pseudo-element tree overlaying the page: `::view-transition-group(name)` containing `::view-transition-image-pair(name)` containing `::view-transition-old(name)` and `::view-transition-new(name)`. By default, the whole page is treated as one group named `root`, cross-fading old-root into new-root.

Any element you tag with `view-transition-name: some-name` (unique per name, at most one element per name at a time) gets pulled out into its *own* group, captured separately in both states, and the browser automatically animates a smooth transform+size+cross-fade between the old and new bounding boxes of that named element. This is what produces the "shared element" morph effect: same `view-transition-name` on a thumbnail before and the full image after, and the browser interpolates position/size/aspect-ratio between them for you, no manual FLIP math required.

Cross-document view transitions (MPA) work almost identically but are opt-in per navigation: both the outgoing and incoming pages need `@view-transition { navigation: auto; }` in CSS, and the browser handles capturing old-page/new-page across the actual page unload/load boundary — impossible before this API since navigations used to hard-cut.

Critically, `startViewTransition` is synchronous-DOM-mutation-based: the callback (or the returned promise-driven update) must finish its DOM changes before the browser can capture the "new" state; async data fetching should happen *before* calling `startViewTransition`, not inside it.

## Setup
No install for same-document transitions, it is a native `document.startViewTransition` API, currently Chromium-only (Chrome/Edge 111+) with Safari support landing in 18.x and Firefox behind development as of 2024-2025; guard every call with a feature check. React 19 exposes an experimental integration; for React Router / Next.js App Router, wrap navigation calls manually.
```js
if (!document.startViewTransition) {
  // fallback: just do the DOM update directly, no transition
}
```
For cross-document MPA transitions, no JS needed at all, only CSS:
```css
@view-transition {
  navigation: auto;
}
```

## Core API
| API | Signature | Note |
|---|---|---|
| `document.startViewTransition(cb)` | `(cb: () => void \| Promise<void>) => ViewTransition` | runs `cb`, capturing old/new DOM states around it |
| `transition.ready` | `Promise<void>` | resolves when pseudo-elements are ready to be animated (post-capture, pre-animation) |
| `transition.updateCallbackDone` | `Promise<void>` | resolves when your callback's DOM mutation has finished |
| `transition.finished` | `Promise<void>` | resolves when the whole transition (including any CSS animations on the pseudo-elements) has finished |
| `transition.skipTransition()` | `() => void` | cancels the visual transition, DOM mutation still happens |
| `view-transition-name` | CSS property | tags an element for its own capture group; must be unique among simultaneously-visible elements |
| `view-transition-class` | CSS property (newer) | applies a shared class to a pseudo-element group for reusable styling without unique names |
| `::view-transition` | pseudo-element | root overlay container |
| `::view-transition-group(name)` | pseudo-element | per-named-element wrapper, animates position/size |
| `::view-transition-image-pair(name)` | pseudo-element | contains the old/new snapshots, handles cross-fade |
| `::view-transition-old(name)` / `::view-transition-new(name)` | pseudo-elements | the actual captured snapshot images, directly styleable with `animation`/`animation-duration` |
| `@view-transition { navigation: auto }` | CSS at-rule | opts a whole page into cross-document (MPA) transitions |
| `pageswap` / `pagereveal` events | window events | fire during cross-document transitions, let you set `view-transition-name` dynamically before capture |

## Recipes

### Basic same-document cross-fade on state change
Swapping a tab panel's content cross-fades instead of hard-cutting.
```js
function switchTab(newContent) {
  if (!document.startViewTransition) {
    renderTabContent(newContent)
    return
  }
  document.startViewTransition(() => {
    renderTabContent(newContent)
  })
}
```
```css
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 0.25s;
}
```

### Shared-element morph from thumbnail to detail view
A product thumbnail visually grows into the full detail image across a route change.
```js
async function openProductDetail(product) {
  const thumb = document.querySelector(`[data-product-id="${product.id}"] img`)
  thumb.style.viewTransitionName = 'product-hero'

  if (!document.startViewTransition) {
    renderDetailView(product)
    return
  }
  const transition = document.startViewTransition(async () => {
    renderDetailView(product)
    const heroImg = document.querySelector('.detail-hero img')
    heroImg.style.viewTransitionName = 'product-hero'
  })
  await transition.finished
  thumb.style.viewTransitionName = '' // release the name for reuse
}
```
```css
::view-transition-group(product-hero) {
  animation-duration: 0.4s;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Custom directional slide instead of default cross-fade
Replaces the default cross-fade with a left/right slide for a "next/previous" gallery.
```css
@keyframes slide-from-right {
  from { transform: translateX(100%); }
}
@keyframes slide-to-left {
  to { transform: translateX(-100%); }
}
::view-transition-old(root) {
  animation: 300ms ease-in both slide-to-left;
}
::view-transition-new(root) {
  animation: 300ms ease-in both slide-from-right;
}
```
```js
function goToNextSlide() {
  document.documentElement.dataset.direction = 'forward'
  document.startViewTransition(() => renderNextSlide())
}
```

### Cross-document (MPA) transition with per-page opt-in
Two plain HTML pages transition smoothly on full navigation, no SPA framework.
```html
<!-- both pages -->
<style>
  @view-transition {
    navigation: auto;
  }
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation-duration: 0.35s;
  }
</style>
```

### Dynamically naming elements right before an MPA navigation snapshot
Uses the `pageswap` event to tag the clicked card so it morphs into the next page's hero image.
```js
window.addEventListener('pageswap', (e) => {
  if (e.viewTransition) {
    const clicked = document.querySelector('.card.is-active img')
    if (clicked) clicked.style.viewTransitionName = 'shared-hero'
  }
})
window.addEventListener('pagereveal', (e) => {
  if (e.viewTransition) {
    const hero = document.querySelector('.detail-hero img')
    if (hero) hero.style.viewTransitionName = 'shared-hero'
  }
})
```

### React (React Router / custom hook) integration
Wraps a navigation state update in a view transition, falling back gracefully when unsupported.
```jsx
import { useState, useCallback } from 'react'

function useViewTransitionState(initial) {
  const [state, setState] = useState(initial)

  const setWithTransition = useCallback((next) => {
    if (!document.startViewTransition) {
      setState(next)
      return
    }
    document.startViewTransition(() => {
      // React 18: must flush synchronously inside the VT callback
      import('react-dom').then(({ flushSync }) => {
        flushSync(() => setState(next))
      })
    })
  }, [])

  return [state, setWithTransition]
}
```

### Next.js App Router transition wrapper
Wraps `router.push` so route changes animate instead of hard-swapping.
```jsx
'use client'
import { useRouter } from 'next/navigation'

export function useTransitionRouter() {
  const router = useRouter()
  return {
    push: (href) => {
      if (!document.startViewTransition) {
        router.push(href)
        return
      }
      document.startViewTransition(() => {
        router.push(href)
      })
    },
  }
}
```

## Tuning the feel
- Default cross-fade duration in the UA stylesheet is 0.25s; keep custom durations in the 200-400ms range. Below 150ms the morph reads as a glitch/flash, above 500ms it feels like the UI is stuck mid-transition.
- Shared-element morphs (thumbnail-to-hero) read best at 300-450ms with `cubic-bezier(0.4, 0, 0.2, 1)` (Material "standard" ease), since the browser is interpolating both position and size and needs enough time to read as a deliberate motion, not a snap.
- For full-page cross-document transitions, keep it shorter (250-300ms) since users are also waiting on network/parse time; a long transition on top of load time compounds perceived latency.
- Never animate more than one or two named elements per transition beyond `root`; each named group adds a distinct moving object for the eye to track and more than 2-3 simultaneous morphs reads as chaotic rather than polished.

## Performance
- Both old and new snapshots are rasterized as compositor layers (essentially `<img>`-like captures), so the transition animation itself runs off the main thread and is compositor-cheap regardless of DOM complexity underneath.
- The capture step itself has a cost proportional to page complexity: a very large or deeply nested `root` group can add noticeable capture time (a frame or two) precisely at the state-change instant, which is why unique `view-transition-name` on huge scrollable containers can cause jank, since each named element requires its own snapshot/texture.
- Limit `view-transition-name` usage to a small number of elements users are specifically tracking; do not tag every list item in a list-reorder animation unless the list is small (under ~20 items), since each named element becomes its own layer.
- Use `transition.skipTransition()` when a second navigation interrupts an in-flight one, otherwise the browser queues and you can get visible transition backlog.

## Accessibility
```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*),
  ::view-transition-old(*),
  ::view-transition-new(*) {
    animation: none !important;
  }
}
```
- With animations disabled this way, the transition still happens instantly (DOM swaps immediately, no visual tween), which is correct: the state change itself is not motion, only its animated presentation is.
- Manage focus explicitly after a same-document transition; `startViewTransition` does not move focus for you, and a route/tab change that doesn't move focus to the new content's heading leaves keyboard/screen-reader users stranded on now-stale context. Call `newHeading.focus()` (with `tabindex="-1"` if not natively focusable) inside or immediately after the callback.
- Cross-document transitions preserve normal navigation semantics (URL changes, history entries, page title updates) since the underlying navigation is a real one; no additional ARIA live-region work is required beyond what the page would already need.

## Anti-slop rules
- Never leave a shared `view-transition-name` string as a bare static value like `"hero"` when the page can render multiple instances of that component simultaneously (e.g. a grid of cards); the spec requires unique live names at any given moment, and this will throw or silently fail to animate the intended element, always derive the name from a unique id (`hero-${product.id}`).
- Never forget to clear (`element.style.viewTransitionName = ''`) a dynamically assigned transition name after the transition completes; a stale name left on an off-screen element blocks the next transition from reusing that name and can throw `InvalidStateError`.
- Never wrap unrelated, large, unbounded async work inside the `startViewTransition` callback; the browser holds the old-DOM snapshot alive and can visibly freeze if your callback takes more than a frame or two. Fetch data first, pass it in, then call `startViewTransition` only around the synchronous render/DOM-mutation step.
- Never rely on the default cross-fade for a genuinely spatial navigation (drilling into a list item); a bare cross-fade for what should be a shared-element morph reads as a missed opportunity, not a mistake, but it is the single most common under-use of this API.
- Never ship without a `document.startViewTransition` existence check; calling it directly on unsupported browsers throws, this must degrade to a plain synchronous DOM update.
- Never animate `::view-transition-old`/`new` with anything that assumes a specific aspect ratio matches between old and new states without testing; mismatched aspect ratios stretch the snapshot images unless you specifically use `object-fit: cover` equivalents via `contain: layout` sizing tricks documented in the reference.

## Checklist
- [ ] `document.startViewTransition` existence-checked with a working fallback path
- [ ] Data fetched before the callback, not inside it
- [ ] Unique `view-transition-name` per live element, derived from a stable id
- [ ] Names cleared after `transition.finished` to avoid `InvalidStateError` on next trigger
- [ ] Focus explicitly moved to new content after transition for keyboard/screen-reader users
- [ ] `prefers-reduced-motion` disables the pseudo-element animations, not the underlying state change
- [ ] Duration tuned per transition type (200-400ms same-document, 250-300ms cross-document)
- [ ] Interrupted/rapid re-triggers handled via `skipTransition()` or debouncing
- [ ] Tested on an actual unsupported browser (Firefox stable) to confirm graceful fallback, not just Chromium
