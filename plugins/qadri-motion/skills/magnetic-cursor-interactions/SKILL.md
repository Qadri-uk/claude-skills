---
name: magnetic-cursor-interactions
description: "Use when building buttons or interactive elements that pull toward the cursor within a defined radius, creating a magnetic attraction effect."
---

# Magnetic Cursor Interactions

## When to use this
- Building hero CTAs, nav links, or icon buttons that need to feel alive and responsive to proximity.
- Adding subtle pull effects to cards or interactive surfaces that respond before the user actually hovers.
- Creating dock-style icon magnification where neighbors scale based on distance.
- Implementing floating action buttons or toolbars with magnetic snapping.
- Do NOT use this for drag-and-drop interactions; see `drag-drop-dnd-kit` instead.

## Mental model
A magnetic element defines a pull radius (typically 1.5-2x its own dimensions). On every mousemove, you compute the distance from the cursor to the element center. If the cursor is inside the pull radius, you calculate a normalized strength (0 at edge, 1 at center) and translate the element toward the cursor by that strength times a maximum displacement.

The displacement itself is the vector from center to cursor, scaled down. You never move the element all the way to the cursor; you move it a fraction (typically 30-40% of the distance). This fraction is the "pull strength." The return to rest uses a lerp or spring, not a snap, so the element drifts back smoothly when the cursor leaves.

Touch devices get none of this. There is no hover on touch. Do not attempt to fake it with touchmove; it creates a janky drag-like behavior that confuses users. Detect touch with `matchMedia('(hover: hover)')` and skip the entire system.

The animation runs on `transform: translate()` only, which is compositor-safe. Never magnetic-pull `left`/`top`/`margin`. Use `requestAnimationFrame` for the lerp loop and cancel it when no elements are active to avoid idle CPU burn.

## Setup
No library required. Pure JS + CSS transforms.

For a React wrapper, the pattern is a ref-based hook. For GSAP users, `gsap.to` with `overwrite: true` handles the lerp natively.

```bash
# If using GSAP for the lerp:
npm install gsap@^3.12
```

```js
import gsap from 'gsap';
```

## Core API
These are the primitives you build with, not a library API:

| Concept | Implementation | Note |
|---|---|---|
| Pull radius | `element.offsetWidth * multiplier` | 1.5-2x element size is the sweet spot |
| Distance | `Math.hypot(dx, dy)` | From cursor to element center |
| Normalized strength | `1 - (distance / radius)` | Clamped to 0-1 |
| Displacement X | `dx * strength * pullFraction` | pullFraction: 0.3-0.4 |
| Displacement Y | `dy * strength * pullFraction` | Same fraction or different for anisotropic |
| Lerp return | `current += (target - current) * ease` | ease: 0.1-0.15 per frame |
| Apply | `transform: translate(${x}px, ${y}px)` | Compositor-only property |
| Touch guard | `matchMedia('(hover: hover)')` | Skip entire system if false |
| RAF loop | `requestAnimationFrame` | Cancel when no active magnetics |
| Bounds | `getBoundingClientRect()` | Cache on resize, not per-frame |

## Recipes

### Basic magnetic button
A button that pulls toward the cursor when within 150px radius.

```js
function magneticButton(el, { radius = 150, strength = 0.35 } = {}) {
  if (!matchMedia('(hover: hover)').matches) return;

  let rect = el.getBoundingClientRect();
  let active = false;
  let rafId = null;
  let currentX = 0, currentY = 0;
  let targetX = 0, targetY = 0;

  function updateRect() {
    rect = el.getBoundingClientRect();
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function tick() {
    currentX = lerp(currentX, targetX, 0.12);
    currentY = lerp(currentY, targetY, 0.12);
    el.style.transform = `translate(${currentX}px, ${currentY}px)`;

    if (Math.abs(currentX - targetX) > 0.1 || Math.abs(currentY - targetY) > 0.1) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  }

  function onMove(e) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);

    if (dist < radius) {
      const pull = 1 - dist / radius;
      targetX = dx * pull * strength;
      targetY = dy * pull * strength;
      active = true;
    } else if (active) {
      targetX = 0;
      targetY = 0;
      active = false;
    }

    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  window.addEventListener('mousemove', onMove);
  window.addEventListener('resize', updateRect);
  window.addEventListener('scroll', updateRect, { passive: true });

  return () => {
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('resize', updateRect);
    window.removeEventListener('scroll', updateRect);
    if (rafId) cancelAnimationFrame(rafId);
  };
}
```

### Magnetic with inner content counter-shift
The button pulls toward cursor; the text inside shifts the opposite direction for a parallax feel.

```js
function magneticParallax(el, { radius = 150, outerStrength = 0.35, innerStrength = -0.15 } = {}) {
  if (!matchMedia('(hover: hover)').matches) return;

  const inner = el.querySelector('[data-magnetic-inner]');
  let rect = el.getBoundingClientRect();

  function onMove(e) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);

    if (dist < radius) {
      const pull = 1 - dist / radius;
      el.style.transform = `translate(${dx * pull * outerStrength}px, ${dy * pull * outerStrength}px)`;
      if (inner) {
        inner.style.transform = `translate(${dx * pull * innerStrength}px, ${dy * pull * innerStrength}px)`;
      }
    } else {
      el.style.transform = '';
      if (inner) inner.style.transform = '';
    }
  }

  window.addEventListener('mousemove', onMove);
  window.addEventListener('resize', () => { rect = el.getBoundingClientRect(); });
  return () => window.removeEventListener('mousemove', onMove);
}
```

### GSAP-powered magnetic with spring return
Uses GSAP for buttery smooth spring-like return instead of manual lerp.

```js
import gsap from 'gsap';

function magneticGSAP(el, { radius = 120, strength = 0.3 } = {}) {
  if (!matchMedia('(hover: hover)').matches) return;

  let rect = el.getBoundingClientRect();

  el.addEventListener('mousemove', (e) => {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);

    if (dist < radius) {
      const pull = 1 - dist / radius;
      gsap.to(el, {
        x: dx * pull * strength,
        y: dy * pull * strength,
        duration: 0.4,
        ease: 'power2.out',
        overwrite: true,
      });
    }
  });

  el.addEventListener('mouseleave', () => {
    gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)', overwrite: true });
  });

  window.addEventListener('resize', () => { rect = el.getBoundingClientRect(); });
}
```

### Distance-based scale (dock effect)
Icons scale up based on proximity, like macOS Dock magnification.

```js
function dockMagnify(container, { maxScale = 1.6, radius = 200 } = {}) {
  if (!matchMedia('(hover: hover)').matches) return;

  const items = Array.from(container.children);
  const rects = new Map();

  function cacheRects() {
    items.forEach(item => rects.set(item, item.getBoundingClientRect()));
  }
  cacheRects();

  function onMove(e) {
    items.forEach(item => {
      const r = rects.get(item);
      const cx = r.left + r.width / 2;
      const dist = Math.abs(e.clientX - cx);
      const scale = dist < radius
        ? 1 + (maxScale - 1) * (1 - dist / radius)
        : 1;
      item.style.transform = `scale(${scale})`;
    });
  }

  function onLeave() {
    items.forEach(item => { item.style.transform = ''; });
  }

  container.addEventListener('mousemove', onMove);
  container.addEventListener('mouseleave', onLeave);
  window.addEventListener('resize', cacheRects);
}
```

### React hook: useMagnetic
A hook that returns a ref. Attach it to any element.

```tsx
import { useRef, useEffect } from 'react';

function useMagnetic({ radius = 150, strength = 0.35, disabled = false } = {}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled || !matchMedia('(hover: hover)').matches) return;

    let rect = el.getBoundingClientRect();
    let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
    let rafId: number | null = null;

    function tick() {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;
      el!.style.transform = `translate(${currentX}px, ${currentY}px)`;
      if (Math.abs(currentX - targetX) > 0.05 || Math.abs(currentY - targetY) > 0.05) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    }

    function onMove(e: MouseEvent) {
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist < radius) {
        const pull = 1 - dist / radius;
        targetX = dx * pull * strength;
        targetY = dy * pull * strength;
      } else {
        targetX = 0;
        targetY = 0;
      }
      if (!rafId) rafId = requestAnimationFrame(tick);
    }

    const observer = new ResizeObserver(() => { rect = el.getBoundingClientRect(); });
    observer.observe(el);
    window.addEventListener('mousemove', onMove);

    return () => {
      window.removeEventListener('mousemove', onMove);
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [radius, strength, disabled]);

  return ref;
}
```

### Nested magnetic: button inside a card
The card has a soft pull; the button inside has a stronger pull with its own radius.

```js
function nestedMagnetic(card, button, { cardRadius = 300, cardStrength = 0.1, btnRadius = 100, btnStrength = 0.4 } = {}) {
  if (!matchMedia('(hover: hover)').matches) return;

  let cardRect = card.getBoundingClientRect();
  let btnRect = button.getBoundingClientRect();

  window.addEventListener('mousemove', (e) => {
    const cdx = e.clientX - (cardRect.left + cardRect.width / 2);
    const cdy = e.clientY - (cardRect.top + cardRect.height / 2);
    const cDist = Math.hypot(cdx, cdy);

    if (cDist < cardRadius) {
      const cPull = 1 - cDist / cardRadius;
      card.style.transform = `translate(${cdx * cPull * cardStrength}px, ${cdy * cPull * cardStrength}px)`;
    } else {
      card.style.transform = '';
    }

    const bdx = e.clientX - (btnRect.left + btnRect.width / 2);
    const bdy = e.clientY - (btnRect.top + btnRect.height / 2);
    const bDist = Math.hypot(bdx, bdy);

    if (bDist < btnRadius) {
      const bPull = 1 - bDist / btnRadius;
      button.style.transform = `translate(${bdx * bPull * btnStrength}px, ${bdy * bPull * btnStrength}px)`;
    } else {
      button.style.transform = '';
    }
  });

  window.addEventListener('resize', () => {
    cardRect = card.getBoundingClientRect();
    btnRect = button.getBoundingClientRect();
  });
}
```

## Tuning the feel
- **Pull radius**: 1.5-2x element width. Larger makes it feel "aware" from far away. Smaller feels tighter and more precise. Under 1x is nearly invisible.
- **Pull strength**: 0.25-0.4 for buttons, 0.08-0.15 for cards/containers. Above 0.5 the element moves too far and looks broken. Below 0.1 on a button and no one notices.
- **Lerp factor**: 0.1-0.15 per frame for smooth trailing. 0.2+ feels snappy but loses the fluid quality. Below 0.08 feels sluggish/laggy.
- **Return easing**: `elastic.out(1, 0.4)` in GSAP, or a manual spring with damping 0.6-0.8. Linear return looks robotic. Ease-out alone looks fine but lacks personality.
- **Falloff curve**: Linear `1 - d/r` is the default. For a stronger snap-in near center, use `(1 - d/r)^2`. For a more gradual feel, use `Math.cos(d/r * PI/2)`.
- **Max displacement**: Cap at 20-30px for buttons, 8-12px for cards. Beyond 30px the layout feels broken.

## Performance
- `transform: translate()` is compositor-only. No layout, no paint. This is cheap.
- The main cost is the `mousemove` listener firing 60-120 times/sec. Keep the handler under 0.5ms.
- Cache `getBoundingClientRect()` on resize/scroll, never per-frame. This is the single biggest perf mistake.
- For many magnetic elements (10+), use a single global mousemove listener that iterates all registered elements, not one listener per element.
- Kill the RAF loop when the cursor is outside all pull radii. An idle lerp loop burns CPU for nothing.

## Accessibility
```css
@media (prefers-reduced-motion: reduce) {
  .magnetic { transform: none !important; }
}
```

```js
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
if (reduceMotion.matches) return; // skip magnetic setup entirely
```

- Magnetic pull is purely decorative. It must not affect click targets. The element's actual hit area stays in its original position in the layout.
- Keyboard focus states must not trigger magnetic movement. Only mouse.
- Screen readers see no difference. No ARIA changes needed.

## Anti-slop rules
1. Never apply magnetic pull to text inputs or form controls. It makes them feel broken.
2. Never use magnetic on touch. `(hover: hover)` media query is mandatory.
3. Never pull an element more than 30px from its resting position. It looks like a rendering bug.
4. Never apply magnetic pull during scroll. Disable while `isScrolling` is true or use `scroll` event debounce.
5. Never use transition CSS on the magnetic element. It fights the RAF lerp and creates stuttering. The lerp IS the transition.
6. Never forget to cache `getBoundingClientRect()`. Calling it per-frame on 10 elements is a guaranteed jank source.
7. Never make the return instant. The drift-back is half the effect. If you snap back, you have a tooltip, not a magnetic.
8. Never apply to elements smaller than 32px. The pull distance exceeds the element size and it looks like a glitch.

## Checklist
- [ ] `(hover: hover)` media query guards all magnetic code
- [ ] `prefers-reduced-motion` disables the effect
- [ ] `getBoundingClientRect` is cached and updated on resize/scroll
- [ ] RAF loop cancels when no elements are in range
- [ ] Max displacement is capped (20-30px for buttons)
- [ ] Return to rest uses lerp or spring, not instant snap
- [ ] No CSS `transition` on the magnetic element's transform
- [ ] Cleanup function removes listeners and cancels RAF
