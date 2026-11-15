---
name: page-transition-choreography
description: "Use when choreographing transitions between pages or routes, including exit/enter timing, scroll restoration, element continuity, and framework-specific patterns for Next.js App Router and Astro."
---

# Page Transition Choreography

## When to use this
- Building smooth transitions between routes in an SPA or MPA.
- Coordinating exit animations (current page) with enter animations (next page).
- Preserving visual continuity of shared elements across pages (hero images, headers).
- Handling scroll position restoration during animated transitions.
- Do NOT use this for Barba.js-specific implementation; see `barba-spa-transitions` instead.

## Mental model
A page transition has four phases: trigger, exit, swap, enter. The trigger is usually a link click or programmatic navigation. Exit is the current page animating out. Swap is the DOM replacement (React re-render, Astro page swap, full HTML replace). Enter is the new page animating in.

The key design decision is overlap vs sequence. In a **sequence** model, exit completes fully before swap and enter begin. The user sees the old page leave, a brief empty/loading state, then the new page arrive. In an **overlap** model, the new page content is pre-fetched and both pages exist in the DOM simultaneously; the old page exits while the new page enters. Overlap looks smoother but is harder to implement because both pages need to coexist without layout conflicts (typically `position: fixed` with `inset: 0` on both during the transition).

Scroll restoration is the hidden complexity. The browser's default behavior (scroll to top on navigation, restore on back/forward) fights animated transitions. You must take manual control: prevent default scroll on forward navigation, let the transition complete, then scroll to 0. On back/forward, capture the scroll position before exit, restore it after enter. The View Transitions API handles some of this natively.

Element continuity (a.k.a. shared element transitions) is the highest-impact technique. An image on page A appears to fly to its new position on page B. Under the hood, you snapshot the element's rect on both pages, calculate the delta, and FLIP animate it. The View Transitions API gives you `view-transition-name` for this, or you can implement it manually with the FLIP technique.

## Setup

### View Transitions API (native)
```css
/* Opt in per-element */
.hero-image {
  view-transition-name: hero;
}

::view-transition-old(hero),
::view-transition-new(hero) {
  animation-duration: 0.4s;
  animation-timing-function: cubic-bezier(0.65, 0, 0.35, 1);
}
```

### Next.js App Router
```bash
npm install framer-motion@^11
```

### Astro
```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
export default defineConfig({
  prefetch: true,
  // View Transitions are per-page via <ViewTransitions />
});
```

## Core API

| Concept | Where | Implementation |
|---|---|---|
| `document.startViewTransition()` | Native | Wraps DOM mutation in a transition |
| `view-transition-name` | CSS | Pairs old/new elements for continuity |
| `::view-transition-old(name)` | CSS | Style the outgoing snapshot |
| `::view-transition-new(name)` | CSS | Style the incoming snapshot |
| `pageswap` / `pagereveal` events | MPA | Fire on the old/new page respectively |
| `<ViewTransitions />` | Astro | Enables client-side nav with transitions |
| `transition:animate` | Astro | Per-element animation directive |
| `transition:name` | Astro | Equivalent to `view-transition-name` |
| `useRouter()` | Next.js | Programmatic nav with transition hooks |
| `AnimatePresence` | Framer Motion | Exit animations before unmount |
| Layout animation | Framer Motion | Shared layout transitions |
| `popstate` | Browser | Back/forward detection |
| `scrollTo(0,0)` | Browser | Manual scroll reset after transition |

## Recipes

### Native View Transitions API (MPA)
Cross-document transitions in Chrome 126+. No JS framework needed.

```css
/* Page A and Page B both have this */
@view-transition {
  navigation: auto;
}

.page-header {
  view-transition-name: header;
}

.hero-image {
  view-transition-name: hero;
}

/* Customize the default crossfade */
::view-transition-old(root) {
  animation: 0.3s cubic-bezier(0.65, 0, 0.35, 1) both slide-out;
}
::view-transition-new(root) {
  animation: 0.3s cubic-bezier(0.65, 0, 0.35, 1) both slide-in;
}

@keyframes slide-out {
  to { opacity: 0; transform: translateY(-20px); }
}
@keyframes slide-in {
  from { opacity: 0; transform: translateY(20px); }
}

@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none;
  }
}
```

### SPA View Transitions with manual swap
For SPAs where you control the DOM swap.

```js
async function navigateTo(url) {
  const response = await fetch(url);
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const newContent = doc.querySelector('#content');

  if (!document.startViewTransition) {
    document.querySelector('#content').replaceWith(newContent);
    return;
  }

  const transition = document.startViewTransition(() => {
    document.querySelector('#content').replaceWith(newContent);
    window.scrollTo(0, 0);
  });

  await transition.finished;
}

document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href]');
  if (!link || link.origin !== location.origin) return;
  e.preventDefault();
  navigateTo(link.href);
});
```

### Next.js App Router with Framer Motion exit/enter
Page-level transitions with AnimatePresence.

```tsx
// app/template.tsx
'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

const variants = {
  hidden: { opacity: 0, y: 12 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial="hidden"
        animate="enter"
        exit="exit"
        transition={{ duration: 0.3, ease: [0.65, 0, 0.35, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

Note: Next.js App Router `template.tsx` re-mounts on every navigation, which is what triggers AnimatePresence. `layout.tsx` does NOT re-mount and will not trigger exit animations.

### Astro View Transitions with custom animations
Per-element transitions in Astro.

```astro
---
// src/layouts/Base.astro
import { ViewTransitions } from 'astro:transitions';
---
<html>
  <head>
    <ViewTransitions />
  </head>
  <body>
    <header transition:name="header" transition:animate="none">
      <!-- Persistent header -->
    </header>
    <main transition:animate="slide">
      <slot />
    </main>
  </body>
</html>
```

```astro
---
// src/pages/project/[slug].astro
---
<img
  src={project.image}
  transition:name={`project-${project.slug}`}
  transition:animate="initial"
/>
```

Custom animation:

```astro
---
import { fade } from 'astro:transitions';
---
<main transition:animate={fade({ duration: '0.3s' })}>
  <slot />
</main>
```

### Scroll restoration with animated transitions
Manual scroll management that works with animated page transitions.

```js
const scrollPositions = new Map();

window.addEventListener('popstate', () => {
  // Back/forward: restore will happen after enter animation
});

function saveScroll() {
  scrollPositions.set(location.pathname, window.scrollY);
}

async function navigateForward(url) {
  saveScroll();

  // Exit animation
  const main = document.querySelector('main');
  main.style.transition = 'opacity 0.2s, transform 0.2s';
  main.style.opacity = '0';
  main.style.transform = 'translateY(-10px)';

  await new Promise(r => setTimeout(r, 200));

  // Swap
  const res = await fetch(url);
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  main.innerHTML = doc.querySelector('main').innerHTML;
  history.pushState(null, '', url);

  // Scroll to top for forward nav
  window.scrollTo(0, 0);

  // Enter animation
  main.style.transform = 'translateY(10px)';
  await new Promise(r => requestAnimationFrame(r));
  main.style.opacity = '1';
  main.style.transform = 'translateY(0)';
}

async function navigateBack(url) {
  const savedScroll = scrollPositions.get(url) || 0;

  // Exit, swap...
  // After enter animation:
  window.scrollTo(0, savedScroll);
}
```

### Overlay wipe transition
A full-screen overlay slides in, covers the page, content swaps behind it, then the overlay slides out.

```js
function wipeTransition(url) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background: var(--bg-dark, #111);
    transform: translateY(100%);
    transition: transform 0.5s cubic-bezier(0.65, 0, 0.35, 1);
  `;
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.transform = 'translateY(0)';
  });

  overlay.addEventListener('transitionend', async function handler() {
    overlay.removeEventListener('transitionend', handler);

    // Swap content behind overlay
    const res = await fetch(url);
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    document.querySelector('main').innerHTML = doc.querySelector('main').innerHTML;
    history.pushState(null, '', url);
    window.scrollTo(0, 0);

    // Slide overlay out
    await new Promise(r => setTimeout(r, 100));
    overlay.style.transform = 'translateY(-100%)';
    overlay.addEventListener('transitionend', () => overlay.remove());
  });
}
```

## Tuning the feel
- **Exit duration**: 150-250ms. The user wants to leave; do not hold them. Fastest comfortable exit is 150ms fade + translate.
- **Enter duration**: 250-400ms. The user is arriving; give them a moment to orient. But not more than 400ms or the site feels slow.
- **Total transition budget**: 400-600ms from click to interactive new page. Anything over 800ms and users perceive lag regardless of animation quality.
- **Exit displacement**: 10-20px upward (translateY(-10px) to -20px). Less than 8px is invisible. More than 30px is distracting.
- **Enter displacement**: 10-20px upward (from translateY(20px) to 0). Match exit distance.
- **Easing**: `cubic-bezier(0.65, 0, 0.35, 1)` for slides/wipes. `cubic-bezier(0.23, 1, 0.32, 1)` for scale/spring.
- **Overlap timing**: If overlapping exit and enter, start enter 50-100ms after exit begins. Do not start both at frame 0; it reads as chaos.

## Performance
- View Transitions API snapshots elements as images and animates those images on the compositor. This is inherently performant.
- Overlapping exit/enter means two page DOMs in memory simultaneously. Keep exit animations short to free the old DOM quickly.
- Prefetch the next page on hover/focus for links (`<link rel="prefetch">` or manual fetch). This eliminates the fetch delay between exit and enter.
- Heavy enter animations (staggered reveals of 20+ elements) can cause frame drops if the DOM is not yet painted. Use `requestAnimationFrame` after swap to defer animation start by one frame.
- Avoid animating `clip-path` on full-viewport elements during transitions. It is not compositor-safe at that scale.

## Accessibility
```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation-duration: 0s;
  }
}
```

```js
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)');

async function navigate(url) {
  if (prefersReduced.matches) {
    // Instant swap, no animation
    window.location.href = url;
    return;
  }
  // Animated path...
}
```

- Focus must move to the new page's main content after transition. Set `tabindex="-1"` on the new content container and call `.focus()`.
- Announce the page change to screen readers with a live region: `<div aria-live="polite" class="sr-only">Navigated to About page</div>`.
- Back/forward navigation must restore both scroll position AND focus position.

## Anti-slop rules
1. Never exceed 600ms total transition time. The animation is not the product; the destination is.
2. Never animate exit and enter identically (both fade up). The exit should go in a different direction than the enter.
3. Never forget scroll restoration on back/forward. Broken back-button scroll is worse than no transition at all.
4. Never use `mode="wait"` in AnimatePresence if the fetch takes more than 200ms. Show a loading state instead of freezing on the exit frame.
5. Never animate the header/nav during page transitions unless it actually changes. Persistent elements should stay put.
6. Never block the transition on slow network. Set a timeout (300ms); if the fetch is not done, show a minimal loading indicator and complete the transition when data arrives.
7. Never use a wipe/overlay transition for every navigation. Reserve it for major context switches (home to project). Use a simple crossfade for sibling pages.
8. Never transition on anchor-link clicks (same-page navigation). Only transition on actual route changes.

## Checklist
- [ ] Exit animation completes before or concurrently with swap
- [ ] Enter animation starts only after new DOM is painted (one rAF after swap)
- [ ] Scroll position saved before exit, restored on back/forward
- [ ] Forward navigation scrolls to top after transition
- [ ] `prefers-reduced-motion` skips all animation (instant swap)
- [ ] Focus moves to new content after enter animation
- [ ] Loading fallback exists for slow fetches (>300ms)
- [ ] Persistent elements (nav, header) do not re-animate
- [ ] Prefetch on hover/focus for faster transitions
