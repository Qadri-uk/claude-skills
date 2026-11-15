# Reference: Lenis + GSAP Integration

## Lenis API (v1.x)

| Method / Property | Signature | Notes |
|---|---|---|
| `new Lenis(options)` | Constructor | Creates instance, starts rAF loop internally |
| `lenis.raf(time)` | `(ms: number) => void` | Advance the scroll interpolation. Time in milliseconds. |
| `lenis.on(event, cb)` | `('scroll', fn) => void` | Fires on every interpolated scroll frame |
| `lenis.scrollTo(target, opts)` | `(target, { offset?, duration?, immediate?, lock?, onComplete? }) => void` | Programmatic scroll |
| `lenis.resize()` | `() => void` | Recalculates scroll bounds after layout change |
| `lenis.stop()` | `() => void` | Pauses scroll interpolation |
| `lenis.start()` | `() => void` | Resumes scroll interpolation |
| `lenis.destroy()` | `() => void` | Removes all listeners, stops rAF |
| `lenis.scroll` | `number` | Current interpolated scroll position |
| `lenis.velocity` | `number` | Current scroll velocity |
| `lenis.isScrolling` | `boolean` | Whether user is actively scrolling |
| `lenis.isStopped` | `boolean` | Whether lenis.stop() has been called |

### Lenis constructor options

| Option | Type | Default | Notes |
|---|---|---|---|
| `wrapper` | `HTMLElement \| Window` | `window` | Scroll container |
| `content` | `HTMLElement` | `document.documentElement` | Scrollable content |
| `lerp` | `number` | `0.1` | Interpolation factor (0-1). Lower = smoother/laggier |
| `duration` | `number` | `1.2` | Duration multiplier for scrollTo |
| `smoothWheel` | `boolean` | `true` | Enable smooth wheel scrolling |
| `smoothTouch` | `boolean` | `false` | Enable smooth touch scrolling |
| `wheelMultiplier` | `number` | `1` | Wheel delta multiplier |
| `touchMultiplier` | `number` | `2` | Touch delta multiplier |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Scroll axis |
| `gestureOrientation` | `'vertical' \| 'horizontal' \| 'both'` | `'vertical'` | Input gesture direction |
| `infinite` | `boolean` | `false` | Infinite scroll (wraps around) |
| `autoResize` | `boolean` | `true` | Auto-resize on window resize |

## GSAP ScrollTrigger key methods

| Method | Notes |
|---|---|
| `ScrollTrigger.update()` | Force recalculation of all trigger positions. Call on Lenis scroll. |
| `ScrollTrigger.refresh()` | Full layout recalculation. Call on resize (debounced). |
| `ScrollTrigger.getAll()` | Returns array of all active ScrollTriggers. Use for cleanup. |
| `ScrollTrigger.batch(targets, vars)` | Batch-triggered animations for many elements. |
| `ScrollTrigger.normalizeScroll(true)` | Intercepts touch for consistent scroll values (iOS fix). |
| `ScrollTrigger.create(vars)` | Standalone trigger without animation. |
| `gsap.ticker.add(fn)` | Add callback to GSAP's rAF loop. Passes time in seconds. |
| `gsap.ticker.lagSmoothing(0)` | Disable lag smoothing. Required for Lenis sync. |
| `gsap.killTweensOf(target)` | Kill all tweens targeting an element. Use in cleanup. |
| `gsap.matchMedia()` | Responsive ScrollTrigger configs. |

## Common Lenis + ScrollTrigger timing issues

### Problem: Lenis scroll position lags behind visual position
Lenis interpolates scroll with `lerp`. The visual scroll position is always slightly behind the target. ScrollTrigger reads the visual position (via `lenis.scroll`), so triggers fire slightly after the native scroll position would have triggered them.

**Impact**: Pinned sections may appear to "slide in" slightly late. Snap targets may overshoot.

**Fix**: Increase `lerp` to 0.12-0.15 for snappier tracking, or accept the lag as part of the smooth-scroll aesthetic.

### Problem: ScrollTrigger pin-spacer height wrong after Lenis resize
Lenis's `resize()` recalculates its internal scroll bounds. If ScrollTrigger.refresh() runs before Lenis.resize(), the pin-spacer heights may be wrong.

**Fix**: Always call `lenis.resize()` BEFORE `ScrollTrigger.refresh()` in the resize handler.

### Problem: Lenis desyncs after returning from a background tab
GSAP's `lagSmoothing` feature skips frames when the browser throttles rAF in background tabs. This causes a time jump that Lenis cannot handle, resulting in a sudden large scroll jump.

**Fix**: `gsap.ticker.lagSmoothing(0)` disables the feature. Lenis handles its own time-delta clamping internally.

### Problem: CSS scroll-snap fights Lenis
Lenis interpolates scroll position smoothly. CSS scroll-snap requires discrete position settling. The two systems fight: Lenis lerps toward a position, snap pulls it to the snap point, Lenis lerps again.

**Fix**: Disable Lenis on sections with scroll-snap, or remove scroll-snap entirely when Lenis is active.

## Framework-specific cleanup patterns

### React (useEffect)
```tsx
useEffect(() => {
  const lenis = initLenis();
  return () => { lenis?.destroy(); ScrollTrigger.getAll().forEach(st => st.kill()); };
}, []);
```

### Next.js App Router (page transition)
```tsx
// layout.tsx
'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function ScrollCleanup() {
  const pathname = usePathname();
  useEffect(() => {
    return () => cleanupScroll();
  }, [pathname]);
  return null;
}
```

### Astro (view transitions)
```html
<script>
  document.addEventListener('astro:before-swap', () => cleanup());
  document.addEventListener('astro:page-load', () => init());
</script>
```

### Vanilla (single-page, no SPA)
```typescript
const cleanup = init();
// On explicit navigation (if any):
cleanup();
```
