# View Transitions API Reference

## Browser support snapshot
| Feature | Chrome/Edge | Safari | Firefox |
|---|---|---|---|
| Same-document `startViewTransition` | 111+ | 18+ (2024) | in development, not yet default-on as of 2025 |
| Cross-document `@view-transition` | 126+ | not yet | not yet |
| `view-transition-class` | 128+ | not yet | not yet |
| `pageswap`/`pagereveal` events | 126+ | not yet | not yet |

Treat this as a progressive enhancement layer everywhere except Chromium-guaranteed internal tools.

## Pseudo-element tree shape
```
::view-transition (fixed, overlays entire viewport, pointer-events: none)
  └── ::view-transition-group(root)
        └── ::view-transition-image-pair(root)
              ├── ::view-transition-old(root)
              └── ::view-transition-new(root)
  └── ::view-transition-group(named-element-1)
        └── ::view-transition-image-pair(named-element-1)
              ├── ::view-transition-old(named-element-1)
              └── ::view-transition-new(named-element-1)
```
Each `::view-transition-group` is sized/positioned to the union of the old and new element's bounding box, and it is THIS group that gets the automatic transform+size interpolation; the `-old`/`-new` images inside just cross-fade.

## Full lifecycle promise chain
```js
const transition = document.startViewTransition(updateDOM)
transition.updateCallbackDone.then(() => { /* DOM has been mutated */ })
transition.ready.then(() => { /* pseudo-element tree built, about to animate */ })
transition.finished.then(() => { /* animation finished, pseudo-elements removed */ })
transition.types // Set<string> - custom transition types, settable before .ready resolves
```

## Custom transition types (finer control than a single global CSS rule)
```js
const transition = document.startViewTransition(() => {
  document.documentElement.classList.add('transitioning')
  renderNext()
})
transition.types.add('slide-forward')
```
```css
:root:active-view-transition-type(slide-forward) {
  &::view-transition-old(root) { animation: slide-out-left 300ms ease-in both; }
  &::view-transition-new(root) { animation: slide-in-right 300ms ease-in both; }
}
```
`:active-view-transition-type()` lets one stylesheet define multiple named transition "styles" (forward/back/fade) selected at trigger time rather than hardcoding a single global animation.

## Fixing aspect-ratio mismatch on shared-element morphs
When old and new elements have different aspect ratios, the default cross-fade stretches. Force `object-fit`-like cropping using a wrapping element with fixed aspect ratio on both states:
```css
.product-hero-wrapper {
  aspect-ratio: 1 / 1;
  overflow: hidden;
  view-transition-name: product-hero;
}
.product-hero-wrapper img {
  width: 100%; height: 100%; object-fit: cover;
}
```
Apply `view-transition-name` to the wrapper, not the raw `<img>`, so both states share one fixed geometry going into the capture.

## Interrupting / re-triggering transitions
```js
let activeTransition = null

function navigate(next) {
  if (activeTransition) activeTransition.skipTransition()
  activeTransition = document.startViewTransition(() => render(next))
  activeTransition.finished.finally(() => { activeTransition = null })
}
```

## Astro / MPA-framework native support
Astro ships `<ClientRouter />` (formerly `<ViewTransitions />`) that wires cross-document-equivalent transitions today even before native MPA support was universal, using a client-side fetch-and-swap approach with the same `view-transition-name` CSS conventions:
```astro
---
import { ClientRouter } from 'astro:transitions'
---
<html>
  <head><ClientRouter /></head>
  <body>
    <img src={hero} transition:name={`hero-${id}`} />
  </body>
</html>
```
This is a useful fallback strategy pattern even outside Astro: fetch the next page's HTML via `fetch()`, swap the relevant DOM subtree inside a same-document `startViewTransition`, and update `history.pushState` manually, achieving MPA-like transitions today in any framework without waiting on native cross-document support.

## Common bugs and fixes
- Transition does nothing visually: DOM mutation happened outside the callback (e.g. in a `.then()` after `startViewTransition()` returned) so there is nothing captured as the "new" state change; ensure the mutation is synchronous inside the passed function.
- `InvalidStateError: Failed to execute 'startViewTransition'`: called while a previous transition's DOM update is still pending; check `document.startViewTransition` reentrancy, use the interrupt pattern above.
- Named element does not morph, just cross-fades in place: the name was not present on both old and new snapshot's matching elements, only one side had `view-transition-name` set at capture time.
- Layout shift right at transition start: some browsers render `::view-transition` pseudo-elements at `position: fixed` covering viewport; if your page has `overflow: hidden` tricks on the root this can clip the overlay unexpectedly.
