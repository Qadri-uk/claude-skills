---
name: scroll-lenis-gsap-integration-harness
description: Use when building a production scroll-narrative site that needs Lenis smooth scroll wired to GSAP ScrollTrigger with proper resize handling, route-change cleanup, SPA framework integration, and a scroll-to-section nav. Builds a complete harness, not just the glue code.
category: scroll
pairs_with: scroll-lenis-gsap-integration-harness-eval
---

# Lenis + GSAP Integration Harness

## What this builds
A production-grade harness that wires Lenis smooth scroll to GSAP ScrollTrigger, handles resize/orientation changes, cleans up on route transitions in SPAs (React, Next.js, Astro), provides a scroll-to-section navigation system, and gates the entire smooth-scroll layer behind `prefers-reduced-motion`. This is the foundation layer for a scroll-narrative site: every animation toolkit in the scroll category sits on top of this harness.

- Lenis instance driving smooth scroll with GSAP ticker integration (no double-rAF)
- ScrollTrigger wired to Lenis's scroll position (not native `scrollY`)
- Debounced resize handler that refreshes both Lenis and ScrollTrigger
- Route-change teardown for React/Next.js/Astro that kills ScrollTriggers, resets Lenis, and prevents stale references
- Scroll-to-section nav with smooth Lenis scroll and correct ScrollTrigger position updates
- Mobile strategy: Lenis disabled on touch by default (native momentum is better), ScrollTrigger still active
- `prefers-reduced-motion`: Lenis disabled entirely, ScrollTrigger runs without smooth scroll
- A complete 5-act scroll narrative skeleton wired to this harness

## When to use / when not to
- Use when you need smooth-scroll inertia paired with GSAP-driven scroll animations (pinning, scrub, snap).
- Use when the project is an SPA (React, Next, Astro) and you need proper cleanup on route changes.
- Use when you want a single scroll authority (Lenis) that all animation systems read from.
- Do NOT use when the page has no GSAP animations. Lenis alone is documented in the `lenis-smooth-scroll` primitive.
- Do NOT use for a CSS-only scroll-driven page. See `scroll-native-css-timeline-page` instead. Lenis can coexist with CSS `animation-timeline` but adds no value if GSAP is not in the stack.
- Do NOT use when the site must support browsers without `requestAnimationFrame` (IE11). Lenis requires it.
- For the specific animation recipes (pinning sequences, text reveals, parallax), use sibling toolkits (`sticky-pinning-sequences`, `gsap-splittext-kinetic-type`, `parallax-depth-systems`). This harness is the plumbing they run on.

## Stack decision
- **Lenis 1.x** (~3KB gzipped): Smooth scroll. Chosen over Locomotive Scroll because Lenis wraps native scroll (preserving `position: sticky`, scroll-snap, and accessibility) rather than hijacking it into a transform-based scroll. Locomotive Scroll v4 used transform-based scrolling which broke sticky elements and required a `scrollerProxy` workaround.
- **GSAP 3.13+** (free): Animation engine and ScrollTrigger. Chosen because ScrollTrigger's pinning, snapping, and scrub mechanics have no CSS-only equivalent with full cross-browser support.
- **No Locomotive Scroll**: Lenis replaced Locomotive as the standard smooth-scroll solution in 2023-2024. Locomotive Scroll v5 internally uses Lenis anyway.
- **Cheaper alternative**: Drop Lenis entirely and use native scroll with `scroll-behavior: smooth` on `html`. You lose the custom inertia feel but keep all ScrollTrigger functionality. GSAP's `ScrollSmoother` (paid GSAP plugin) is another alternative if the project already has a GSAP Business license.

## Architecture

```
src/
  scroll/
    lenis.ts          -- Lenis instance factory + GSAP ticker wiring
    scroll-triggers.ts -- ScrollTrigger registration per act/section
    scroll-nav.ts     -- scroll-to-section navigation
    cleanup.ts        -- route-change teardown
    config.ts         -- shared constants (lerp, duration, breakpoints)
  acts/
    Act1.tsx          -- per-act component (or per-act HTML section)
    Act2.tsx
    ...
  App.tsx / page.astro -- root, imports harness
```

Lifecycle:
1. `initLenis()` creates the Lenis instance, wires it to the GSAP ticker, and calls `ScrollTrigger.update` on every Lenis scroll event.
2. `registerScrollTriggers()` creates all ScrollTrigger instances for the page's acts.
3. On resize: debounced handler calls `lenis.resize()` then `ScrollTrigger.refresh()`.
4. On route change (SPA): `cleanup()` kills all ScrollTriggers, destroys Lenis, and nulls references.
5. On new route mount: steps 1-2 repeat.
6. On `prefers-reduced-motion` match: Lenis never instantiates; ScrollTrigger runs on native scroll.
7. On touch device (`pointer: coarse`): Lenis is skipped by default; ScrollTrigger uses native scroll.

## Build it: step by step

### Phase 1: Configuration constants

```typescript
// src/scroll/config.ts

export const SCROLL_CONFIG = {
  lenis: {
    lerp: 0.1,            // 0.05 = very smooth/laggy, 0.15 = snappy, 0.1 = balanced
    duration: 1.2,        // duration multiplier for programmatic scrollTo
    smoothWheel: true,
    smoothTouch: false,   // native touch momentum is better than Lenis on mobile
    wheelMultiplier: 1,
    touchMultiplier: 2,
  },
  resize: {
    debounceMs: 200,      // wait 200ms after last resize event
  },
  breakpoints: {
    mobile: 768,
    tablet: 1024,
  },
} as const;
```

### Phase 2: Lenis instance factory with GSAP ticker

```typescript
// src/scroll/lenis.ts

import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SCROLL_CONFIG } from './config';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

export function initLenis(): Lenis | null {
  // Gate 1: respect reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }

  // Gate 2: skip on touch devices (optional, configurable)
  if (window.matchMedia('(pointer: coarse)').matches) {
    return null;
  }

  // Prevent double init
  if (lenis) {
    lenis.destroy();
  }

  lenis = new Lenis({
    lerp: SCROLL_CONFIG.lenis.lerp,
    duration: SCROLL_CONFIG.lenis.duration,
    smoothWheel: SCROLL_CONFIG.lenis.smoothWheel,
    smoothTouch: SCROLL_CONFIG.lenis.smoothTouch,
    wheelMultiplier: SCROLL_CONFIG.lenis.wheelMultiplier,
    touchMultiplier: SCROLL_CONFIG.lenis.touchMultiplier,
  });

  // Wire Lenis scroll events to ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);

  // Drive Lenis from GSAP's ticker (single rAF, no double loop)
  gsap.ticker.add((time) => {
    lenis?.raf(time * 1000); // GSAP ticker passes seconds, Lenis wants ms
  });

  // Disable Lenis's own rAF since GSAP is driving it
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

export function getLenis(): Lenis | null {
  return lenis;
}

export function destroyLenis(): void {
  if (lenis) {
    lenis.destroy();
    lenis = null;
  }
}

export function scrollTo(
  target: string | number | HTMLElement,
  options?: { offset?: number; duration?: number; immediate?: boolean }
): void {
  if (lenis) {
    lenis.scrollTo(target, {
      offset: options?.offset ?? 0,
      duration: options?.duration ?? SCROLL_CONFIG.lenis.duration,
      immediate: options?.immediate ?? false,
    });
  } else {
    // Fallback: native scroll when Lenis is not active
    const el = typeof target === 'string'
      ? document.querySelector(target)
      : typeof target === 'number'
        ? null
        : target;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (typeof target === 'number') {
      window.scrollTo({ top: target + (options?.offset ?? 0), behavior: 'smooth' });
    }
  }
}
```

### Phase 3: ScrollTrigger registration system

```typescript
// src/scroll/scroll-triggers.ts

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ActConfig {
  selector: string;
  timeline: (section: HTMLElement) => gsap.core.Timeline;
}

const registeredTriggers: ScrollTrigger[] = [];

export function registerAct(config: ActConfig): void {
  const sections = document.querySelectorAll<HTMLElement>(config.selector);

  sections.forEach((section) => {
    const tl = config.timeline(section);

    // Track for cleanup
    if (tl.scrollTrigger) {
      registeredTriggers.push(tl.scrollTrigger);
    }
  });
}

export function registerRevealBatch(): void {
  ScrollTrigger.batch('.reveal', {
    onEnter: (elements) => {
      gsap.from(elements, {
        opacity: 0,
        y: 40,
        stagger: 0.08,
        duration: 0.8,
        ease: 'power2.out',
      });
    },
    start: 'top 85%',
    once: true,
  });
}

export function registerProgressBar(): void {
  const bar = document.querySelector('.progress-bar');
  if (!bar) return;

  const st = ScrollTrigger.create({
    trigger: document.documentElement,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (self) => {
      gsap.set(bar, { scaleX: self.progress, transformOrigin: 'left' });
    },
  });

  registeredTriggers.push(st);
}

export function killAllTriggers(): void {
  registeredTriggers.forEach((st) => st.kill());
  registeredTriggers.length = 0;
  ScrollTrigger.getAll().forEach((st) => st.kill());
  ScrollTrigger.refresh();
}
```

### Phase 4: Resize handling

```typescript
// src/scroll/resize.ts

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getLenis } from './lenis';
import { SCROLL_CONFIG } from './config';

let resizeTimer: ReturnType<typeof setTimeout> | null = null;
let lastWidth = 0;

export function initResizeHandler(): () => void {
  lastWidth = window.innerWidth;

  const handleResize = () => {
    if (resizeTimer) clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
      const newWidth = window.innerWidth;

      // On mobile, address bar show/hide triggers resize with only height change.
      // Only refresh ScrollTrigger if width actually changed.
      const widthChanged = Math.abs(newWidth - lastWidth) > 1;
      lastWidth = newWidth;

      const lenis = getLenis();
      if (lenis) {
        lenis.resize();
      }

      if (widthChanged) {
        ScrollTrigger.refresh();
      }
    }, SCROLL_CONFIG.resize.debounceMs);
  };

  window.addEventListener('resize', handleResize);

  // Also handle orientation change explicitly
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      const lenis = getLenis();
      if (lenis) lenis.resize();
      ScrollTrigger.refresh();
    }, 500); // orientation change needs a longer delay for layout to settle
  });

  // Return cleanup function
  return () => {
    window.removeEventListener('resize', handleResize);
    if (resizeTimer) clearTimeout(resizeTimer);
  };
}
```

### Phase 5: Route-change cleanup

```typescript
// src/scroll/cleanup.ts

import { destroyLenis } from './lenis';
import { killAllTriggers } from './scroll-triggers';
import { gsap } from 'gsap';

export function cleanupScroll(): void {
  // 1. Kill all GSAP tweens (prevents stale references to unmounted DOM)
  gsap.killTweensOf('*');

  // 2. Kill all ScrollTriggers
  killAllTriggers();

  // 3. Destroy Lenis
  destroyLenis();

  // 4. Reset scroll position (SPA route change should start at top)
  window.scrollTo(0, 0);
}
```

### Phase 6: React/Next.js integration

```tsx
// src/scroll/useScrollHarness.ts (React hook)

import { useEffect, useRef } from 'react';
import { initLenis, destroyLenis, getLenis } from './lenis';
import {
  registerAct,
  registerRevealBatch,
  registerProgressBar,
  killAllTriggers,
} from './scroll-triggers';
import { initResizeHandler } from './resize';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useScrollHarness() {
  const cleanupResize = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Init
    initLenis();
    registerProgressBar();
    registerRevealBatch();
    cleanupResize.current = initResizeHandler();

    // Cleanup on unmount (route change)
    return () => {
      gsap.killTweensOf('*');
      killAllTriggers();
      destroyLenis();
      cleanupResize.current?.();
    };
  }, []);

  return { getLenis, registerAct };
}
```

```tsx
// src/App.tsx (usage)

import { useScrollHarness } from './scroll/useScrollHarness';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

function ScrollPage() {
  const { registerAct } = useScrollHarness();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Register Act 1: pinned reveal
    registerAct({
      selector: '.act--1',
      timeline: (section) => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=150%',
            pin: true,
            scrub: 1,
          },
        });

        tl.from(section.querySelector('.act__heading'), {
          opacity: 0, y: 60,
        })
        .from(section.querySelector('.act__body'), {
          opacity: 0, y: 40,
        }, '-=0.3')
        .from(section.querySelector('.act__figure'), {
          opacity: 0, scale: 0.9,
        }, '-=0.2');

        return tl;
      },
    });

    // Register Act 2: horizontal scroll section
    registerAct({
      selector: '.act--2',
      timeline: (section) => {
        const panels = section.querySelectorAll('.panel');
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${section.scrollWidth}`,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
          },
        });

        tl.to('.panels-track', {
          x: () => -(section.querySelector('.panels-track')!.scrollWidth - window.innerWidth),
          ease: 'none',
        });

        // Nested triggers for per-panel reveals
        panels.forEach((panel) => {
          gsap.from(panel.querySelector('.panel__content'), {
            opacity: 0,
            y: 30,
            scrollTrigger: {
              trigger: panel,
              containerAnimation: tl,
              start: 'left center',
              end: 'right center',
              scrub: true,
            },
          });
        });

        return tl;
      },
    });
  }, [registerAct]);

  return (
    <div ref={containerRef}>
      <div className="progress-bar" aria-hidden="true" />

      <section className="act act--1">
        <h2 className="act__heading reveal">Act One</h2>
        <p className="act__body reveal">Content here.</p>
        <figure className="act__figure reveal">
          <img src="act1.webp" alt="Act 1 visual" width="800" height="450" />
        </figure>
      </section>

      <section className="act act--2">
        <div className="panels-track">
          <div className="panel"><div className="panel__content">Panel 1</div></div>
          <div className="panel"><div className="panel__content">Panel 2</div></div>
          <div className="panel"><div className="panel__content">Panel 3</div></div>
        </div>
      </section>

      <section className="act act--3">
        <h2 className="act__heading reveal">Act Three</h2>
        <p className="act__body reveal">Resolution.</p>
      </section>
    </div>
  );
}
```

### Phase 7: Vanilla JS / Astro integration

```typescript
// src/scroll/init.ts (non-React entry point)

import { initLenis } from './lenis';
import {
  registerRevealBatch,
  registerProgressBar,
  killAllTriggers,
} from './scroll-triggers';
import { initResizeHandler } from './resize';
import { cleanupScroll } from './cleanup';

export function initScrollPage(): () => void {
  initLenis();
  registerProgressBar();
  registerRevealBatch();
  const cleanupResize = initResizeHandler();

  return () => {
    cleanupScroll();
    cleanupResize();
  };
}
```

For Astro with view transitions:
```astro
---
// src/pages/narrative.astro
---
<script>
  import { initScrollPage } from '../scroll/init';

  let cleanup: (() => void) | null = null;

  document.addEventListener('astro:page-load', () => {
    cleanup = initScrollPage();
  });

  document.addEventListener('astro:before-swap', () => {
    cleanup?.();
    cleanup = null;
  });
</script>
```

### Phase 8: Scroll-to-section navigation

```typescript
// src/scroll/scroll-nav.ts

import { scrollTo, getLenis } from './lenis';

export function initScrollNav(): void {
  const navLinks = document.querySelectorAll<HTMLAnchorElement>('[data-scroll-to]');

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetSelector = link.getAttribute('data-scroll-to');
      if (!targetSelector) return;

      const target = document.querySelector(targetSelector);
      if (!target) return;

      scrollTo(target as HTMLElement, { offset: -80 }); // -80px for fixed nav

      // Update active state
      navLinks.forEach((l) => l.classList.remove('is-active'));
      link.classList.add('is-active');
    });
  });

  // Update active nav item based on scroll position
  const sections = document.querySelectorAll<HTMLElement>('.act[id]');

  if (getLenis()) {
    getLenis()!.on('scroll', () => {
      updateActiveNav(sections, navLinks);
    });
  } else {
    // Fallback for no-Lenis
    window.addEventListener('scroll', () => {
      updateActiveNav(sections, navLinks);
    }, { passive: true });
  }
}

function updateActiveNav(
  sections: NodeListOf<HTMLElement>,
  links: NodeListOf<HTMLAnchorElement>
): void {
  const scrollY = window.scrollY + window.innerHeight / 3;
  let currentId = '';

  sections.forEach((section) => {
    if (section.offsetTop <= scrollY) {
      currentId = section.id;
    }
  });

  links.forEach((link) => {
    const target = link.getAttribute('data-scroll-to');
    link.classList.toggle('is-active', target === `#${currentId}`);
  });
}
```

```html
<!-- Navigation markup -->
<nav class="scroll-nav" aria-label="Story sections">
  <a href="#act-1" data-scroll-to="#act-1" class="scroll-nav__link is-active">Problem</a>
  <a href="#act-2" data-scroll-to="#act-2" class="scroll-nav__link">Insight</a>
  <a href="#act-3" data-scroll-to="#act-3" class="scroll-nav__link">Product</a>
  <a href="#act-4" data-scroll-to="#act-4" class="scroll-nav__link">Evidence</a>
  <a href="#act-5" data-scroll-to="#act-5" class="scroll-nav__link">Ask</a>
</nav>
```

### Phase 9: Mobile detection and Lenis gating

```typescript
// src/scroll/mobile.ts

export function isTouchDevice(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}

export function isReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function shouldUseLenis(): boolean {
  return !isTouchDevice() && !isReducedMotion();
}
```

The `initLenis()` function already checks these conditions. But you can also use `shouldUseLenis()` to conditionally render UI elements that only make sense with smooth scroll (e.g., a "scroll speed" control).

### Phase 10: Lenis + ScrollTrigger normalizeScroll for iOS

```typescript
// src/scroll/ios-fix.ts

import { ScrollTrigger } from 'gsap/ScrollTrigger';

export function enableIOSScrollFix(): void {
  // normalizeScroll prevents iOS URL bar show/hide from breaking
  // ScrollTrigger pin calculations. It intercepts touch events and
  // applies scroll via transforms, giving consistent scroll values.
  //
  // Trade-off: it takes over touch scrolling, which can feel different
  // from native. Only enable if you have pinned sections that break on iOS.
  ScrollTrigger.normalizeScroll(true);
}
```

Use this only when you have pinned sections that visually break when the iOS URL bar animates in/out. It solves the problem but changes the touch-scroll feel.

## The full reference implementation

```typescript
// scroll-harness.ts -- single-file harness for non-framework projects

import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const CONFIG = {
  lerp: 0.1,
  duration: 1.2,
  resizeDebounce: 200,
};

let lenis: Lenis | null = null;
let resizeTimer: ReturnType<typeof setTimeout>;

// --- Init ---
export function init(): () => void {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(pointer: coarse)').matches;

  if (!prefersReducedMotion && !isTouch) {
    lenis = new Lenis({
      lerp: CONFIG.lerp,
      duration: CONFIG.duration,
      smoothWheel: true,
      smoothTouch: false,
    });

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis?.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // Resize
  let lastW = innerWidth;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      lenis?.resize();
      if (Math.abs(innerWidth - lastW) > 1) {
        ScrollTrigger.refresh();
        lastW = innerWidth;
      }
    }, CONFIG.resizeDebounce);
  };
  addEventListener('resize', onResize);

  // Progress bar
  const bar = document.querySelector('.progress-bar');
  if (bar) {
    ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => gsap.set(bar, { scaleX: self.progress, transformOrigin: 'left' }),
    });
  }

  // Batch reveals
  ScrollTrigger.batch('.reveal', {
    onEnter: (els) => gsap.from(els, {
      opacity: 0, y: 40, stagger: 0.08, duration: 0.8, ease: 'power2.out',
    }),
    start: 'top 85%',
    once: true,
  });

  // Scroll nav
  document.querySelectorAll<HTMLAnchorElement>('[data-scroll-to]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const sel = link.getAttribute('data-scroll-to')!;
      const target = document.querySelector(sel);
      if (target) {
        if (lenis) lenis.scrollTo(target as HTMLElement, { offset: -80 });
        else target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Cleanup
  return () => {
    gsap.killTweensOf('*');
    ScrollTrigger.getAll().forEach((st) => st.kill());
    lenis?.destroy();
    lenis = null;
    removeEventListener('resize', onResize);
    clearTimeout(resizeTimer);
    scrollTo(0, 0);
  };
}
```

## Tuning the feel

| Parameter | Value | Why |
|---|---|---|
| `lerp` | 0.1 | The smoothing factor. 0.05 = very smooth but laggy (feels like dragging through syrup). 0.15 = snappy but loses the "smooth" character. 0.1 is the default and the sweet spot for editorial storytelling. |
| `duration` | 1.2 | Multiplier for programmatic `scrollTo`. At 1.0, a full-page scroll takes ~1s. 1.2 gives a slightly more dramatic scroll-to-section feel. |
| `wheelMultiplier` | 1 | Multiplies wheel delta. Below 1 makes scrolling feel heavy. Above 1 makes it feel slippery. 1 preserves the user's OS-level scroll speed setting. |
| `smoothTouch` | false | Native touch momentum (iOS, Android) is highly tuned and user-expected. Lenis's touch smoothing replaces it with lerped transforms, which always feels worse than native. Keep false. |
| Resize debounce | 200ms | Short enough to feel responsive, long enough to batch rapid resize events (e.g., rotating a phone triggers multiple resize events over 100-300ms). |
| Width-only refresh | 1px threshold | Prevents ScrollTrigger refresh on mobile URL-bar height changes. Only width changes alter layout enough to invalidate ScrollTrigger positions. |
| scrollTo offset | -80px | Accounts for a fixed navigation bar. Adjust to match your actual nav height. |
| scrub value | 1 (seconds) | How fast the animation catches up to scroll position. `true` = instant (locked to scroll), `1` = 1-second catch-up. `0.5` feels more responsive for short sequences; `1-2` feels smoother for long pinned sections. |

## Variants

### 1. No Lenis (pure GSAP ScrollTrigger)
Drop the Lenis dependency entirely. ScrollTrigger works on native scroll. The harness becomes just the resize handler, cleanup, and scroll-nav:
```typescript
// Remove initLenis(), all Lenis imports
// ScrollTrigger.update is called internally by ScrollTrigger on native scroll
// scrollTo uses window.scrollTo with behavior: 'smooth'
```

### 2. Next.js App Router
Wrap the hook in a client component:
```tsx
'use client';
import { useScrollHarness } from '@/scroll/useScrollHarness';

export function ScrollProvider({ children }: { children: React.ReactNode }) {
  useScrollHarness();
  return <>{children}</>;
}
```

### 3. Horizontal scroll page
Lenis supports horizontal scroll via `orientation: 'horizontal'`. Wire the same way:
```typescript
lenis = new Lenis({ orientation: 'horizontal', gestureOrientation: 'both' });
```

### 4. Multiple scroll containers
Lenis can wrap a specific element instead of the window:
```typescript
lenis = new Lenis({ wrapper: document.querySelector('.scroll-container')! });
```
This is useful for split-screen layouts where only one pane has smooth scroll.

### 5. Debug mode
Add GSAP markers and Lenis scroll logging during development:
```typescript
if (import.meta.env.DEV) {
  ScrollTrigger.defaults({ markers: true });
  lenis?.on('scroll', ({ scroll, velocity }) => {
    console.log(`scroll: ${scroll.toFixed(0)}, velocity: ${velocity.toFixed(2)}`);
  });
}
```

## Performance budget

| Metric | Target | Lever |
|---|---|---|
| Lenis bundle | ~3 KB gzipped | Already minimal. No tree-shaking needed. |
| GSAP + ScrollTrigger bundle | ~25 KB gzipped | Tree-shake unused plugins. Only import ScrollTrigger, not the full GSAP bundle. |
| Scroll handler time | < 2ms per frame | Lenis's lerp is a single multiplication per frame. ScrollTrigger.update iterates triggers (O(n) where n = trigger count). Keep n < 50 per page. |
| ScrollTrigger refresh | < 50ms | Refresh reads layout. Batch DOM reads before calling refresh. Never call refresh in a loop. |
| Pinned section memory | ~4-8 MB per pinned layer (GPU) | Pin only what is necessary. Unpin off-screen sections. |
| Total page ScrollTriggers | < 30 | Each trigger adds overhead to every scroll event. Above 30, consider virtualizing with lazy trigger creation. |
| First cut | Remove Lenis. ScrollTrigger on native scroll is lighter and frees 3 KB + removes the lerp per-frame cost. |

## Accessibility

### prefers-reduced-motion
Lenis is never instantiated when `prefers-reduced-motion: reduce` matches. ScrollTrigger still fires (it drives content visibility, not just motion), but `gsap.from` calls should be replaced with instant `gsap.set` calls under reduced motion:
```typescript
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  ScrollTrigger.batch('.reveal', {
    onEnter: (els) => gsap.set(els, { opacity: 1, y: 0 }),
    start: 'top 95%',
    once: true,
  });
}
```

### Keyboard navigation
Lenis wraps native scroll, so keyboard scrolling (Space, Page Down, Arrow keys) works natively. Tab focus triggers `scrollIntoView`, which Lenis intercepts and smooths. Verify that focus-driven scroll lands the focused element in view, not off by the lerp delay.

### Screen readers
No impact. Lenis does not change DOM structure. ScrollTrigger's pinning adds a `pin-spacer` wrapper div. Ensure pinned content maintains reading order.

### What this costs
Users with reduced motion lose the smooth-scroll inertia (which is the point of Lenis) and any motion in scroll animations. They see content appear instantly as they scroll past triggers. This is acceptable because the content is the payload.

## Anti-slop rules

1. DO NOT create two rAF loops. Lenis has its own `raf()` method. Drive it from `gsap.ticker.add()`, not from a separate `requestAnimationFrame` loop. Two loops means double the per-frame cost and potential desync.
2. DO NOT pass seconds to `lenis.raf()`. GSAP's ticker callback receives time in seconds. Lenis expects milliseconds. Multiply by 1000: `lenis.raf(time * 1000)`.
3. DO NOT call `ScrollTrigger.refresh()` on every resize event. Debounce it. Refresh reads layout and is expensive. Calling it 60 times during a window drag tanks performance.
4. DO NOT enable `smoothTouch: true` in production. Native touch momentum is better. Lenis touch smoothing introduces input lag that users perceive as broken scrolling.
5. DO NOT skip cleanup on route change. Stale ScrollTriggers reference unmounted DOM and cause errors, memory leaks, and ghost animations on the new page.
6. DO NOT call `ScrollTrigger.refresh()` when only the height changed on mobile. iOS address-bar show/hide triggers resize but only changes height. Width-only refresh prevents unnecessary ScrollTrigger recalculation.
7. DO NOT use `lenis.scrollTo` without an offset for fixed navigation. The scroll target will land behind the nav bar. Always subtract nav height.
8. DO NOT animate layout properties (width, height, top, left) inside ScrollTrigger timelines. Use transforms. See `scroll-mobile-performance-strategy` for the full rationale.
9. DO NOT use `scrub: true` for long pinned sections. `scrub: true` locks animation 1:1 to scroll, which feels stiff. Use `scrub: 0.5` to `scrub: 2` for a smooth catch-up feel.
10. DO NOT instantiate Lenis inside a useEffect with dependencies that change. Lenis should be created once per page lifecycle, not on every render. Use an empty dependency array or a dedicated init function.

## Integration notes

- **lenis-smooth-scroll** (primitive): Documents Lenis API in isolation. This harness builds on it by adding GSAP wiring, resize handling, and cleanup.
- **gsap-scrolltrigger** (primitive): Documents ScrollTrigger API. This harness uses ScrollTrigger and adds the Lenis integration layer.
- **scroll-native-css-timeline-page**: CSS scroll-driven animations coexist with Lenis because Lenis wraps native scroll. However, Lenis's lerp means the CSS `scroll()` timeline reads the actual scroll position (which Lenis lerps toward), so CSS animations will lag behind Lenis's visual position by the lerp delay. Test this if mixing both.
- **sticky-pinning-sequences**: Pinning configurations run inside this harness. Register them via `registerAct()`.
- **scroll-mobile-performance-strategy**: Mobile performance decisions (disable Lenis on touch, reduce trigger count, defer heavy sections) are implemented in this harness's mobile gating.
- **gsap-splittext-kinetic-type**: Text animations wire as standard ScrollTrigger timelines inside `registerAct()`.
- Known conflict: Lenis + CSS `scroll-snap-type`. Lenis's lerped scrolling fights snap points because snap requires discrete position settling. Either disable Lenis on snap sections (`lenis.stop()` / `lenis.start()`) or remove snap.
- Known conflict: Multiple smooth-scroll libraries. Never load Lenis alongside Locomotive Scroll or ScrollSmoother. They will fight over scroll position.

## Ship checklist

- [ ] Lenis instantiates only on non-touch, non-reduced-motion devices
- [ ] `gsap.ticker.add` drives Lenis (no separate rAF loop)
- [ ] `lenis.raf()` receives milliseconds (not seconds)
- [ ] `ScrollTrigger.update` is called on every Lenis scroll event
- [ ] Resize handler debounces at 200ms and only refreshes ScrollTrigger on width change
- [ ] Route-change cleanup kills all tweens, all ScrollTriggers, and destroys Lenis
- [ ] `scrollTo` falls back to native `scrollIntoView` when Lenis is not active
- [ ] Scroll nav updates active state based on scroll position
- [ ] Pinned sections render correctly on iOS (test with and without `normalizeScroll`)
- [ ] Tab/focus navigation scrolls focused element fully into view
- [ ] No horizontal scrollbar at any viewport width
- [ ] DevTools Performance shows single rAF loop (not double)
- [ ] `prefers-reduced-motion: reduce` shows all content without animation
- [ ] Console has zero errors on route change and back-navigation
- [ ] Total ScrollTrigger count per page is under 30
