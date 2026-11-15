# Page Transition Choreography - Reference

## View Transitions API browser support

| Browser | MPA support | SPA support |
|---|---|---|
| Chrome 111+ | Yes (126+ with `@view-transition`) | Yes |
| Safari 18+ | No | Yes |
| Firefox | Behind flag | Behind flag |

Fallback: detect with `if (document.startViewTransition)` and fall back to instant swap.

## Gotchas

1. **`view-transition-name` must be unique per page.** Two elements with the same name on the same page cause the transition to silently fail. In a list page, give each item a unique name (e.g., `view-transition-name: item-${id}`).
2. **View transition snapshots are raster images.** Text in the snapshot cannot be selected or read by screen readers during the transition. Keep transitions short so this gap is minimal.
3. **Next.js App Router `layout.tsx` does not unmount.** AnimatePresence only works in `template.tsx` or in a client component that re-renders on pathname change. Putting it in layout.tsx means exit animations never fire.
4. **Astro `transition:persist` keeps the element's DOM node across navigations.** Useful for audio players, video, canvas. But event listeners and framework state are NOT automatically preserved; re-bind in `astro:after-swap`.
5. **`popstate` fires before the browser has scrolled.** If you animate on popstate, the scroll position read at that moment is stale. Use `scrollRestoration = 'manual'` and restore after your enter animation.
6. **Prefetch can waste bandwidth.** Only prefetch on hover/focus (intent signals), not on viewport intersection for all visible links. Astro's `prefetch` config supports `hover`, `tap`, `viewport`, and `load` strategies.
7. **Same-document view transitions block rendering.** If the callback passed to `startViewTransition()` takes too long (heavy DOM mutation, synchronous layout), the browser freezes. Keep the callback under 16ms; defer heavy work to after the transition.

## Additional recipes

### Directional transitions based on nav position
Pages slide left or right based on whether the user navigated forward or backward in the nav hierarchy.

```js
let lastIndex = 0;

const navOrder = ['/', '/about', '/work', '/contact'];

function getDirection(url) {
  const newIndex = navOrder.indexOf(new URL(url).pathname);
  const direction = newIndex > lastIndex ? 'forward' : 'backward';
  lastIndex = newIndex;
  return direction;
}

async function directionalNav(url) {
  const direction = getDirection(url);
  document.documentElement.dataset.transitionDir = direction;

  if (document.startViewTransition) {
    const transition = document.startViewTransition(async () => {
      // swap content
    });
    await transition.finished;
  }
}
```

```css
[data-transition-dir="forward"]::view-transition-old(root) {
  animation: 0.3s ease both fade-slide-left-out;
}
[data-transition-dir="forward"]::view-transition-new(root) {
  animation: 0.3s ease both fade-slide-right-in;
}
[data-transition-dir="backward"]::view-transition-old(root) {
  animation: 0.3s ease both fade-slide-right-out;
}
[data-transition-dir="backward"]::view-transition-new(root) {
  animation: 0.3s ease both fade-slide-left-in;
}

@keyframes fade-slide-left-out { to { opacity: 0; transform: translateX(-30px); } }
@keyframes fade-slide-right-in { from { opacity: 0; transform: translateX(30px); } }
@keyframes fade-slide-right-out { to { opacity: 0; transform: translateX(30px); } }
@keyframes fade-slide-left-in { from { opacity: 0; transform: translateX(-30px); } }
```

### Loading skeleton during slow fetch
Shows a skeleton state if the page takes longer than 200ms to load.

```js
async function navigateWithSkeleton(url) {
  const main = document.querySelector('main');

  // Start exit
  main.style.transition = 'opacity 0.15s';
  main.style.opacity = '0';

  const fetchPromise = fetch(url).then(r => r.text());
  const timer = setTimeout(() => {
    main.innerHTML = '<div class="skeleton-page" aria-label="Loading"></div>';
    main.style.opacity = '1';
  }, 200);

  const html = await fetchPromise;
  clearTimeout(timer);

  const doc = new DOMParser().parseFromString(html, 'text/html');
  main.style.opacity = '0';
  await new Promise(r => setTimeout(r, 50));

  main.innerHTML = doc.querySelector('main').innerHTML;
  history.pushState(null, '', url);
  window.scrollTo(0, 0);

  requestAnimationFrame(() => {
    main.style.transition = 'opacity 0.25s, transform 0.25s';
    main.style.transform = 'translateY(0)';
    main.style.opacity = '1';
  });
}
```

### Morph transition for shared images
A shared image morphs position/size from page A to page B using manual FLIP.

```js
async function morphTransition(url, sharedSelector) {
  const oldEl = document.querySelector(sharedSelector);
  const firstRect = oldEl.getBoundingClientRect();

  // Fetch and swap
  const res = await fetch(url);
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  document.querySelector('main').innerHTML = doc.querySelector('main').innerHTML;
  history.pushState(null, '', url);

  const newEl = document.querySelector(sharedSelector);
  const lastRect = newEl.getBoundingClientRect();

  const dx = firstRect.left - lastRect.left;
  const dy = firstRect.top - lastRect.top;
  const sw = firstRect.width / lastRect.width;
  const sh = firstRect.height / lastRect.height;

  newEl.animate([
    { transform: `translate(${dx}px, ${dy}px) scale(${sw}, ${sh})` },
    { transform: 'translate(0, 0) scale(1, 1)' },
  ], {
    duration: 400,
    easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
    fill: 'backwards',
  });
}
```
