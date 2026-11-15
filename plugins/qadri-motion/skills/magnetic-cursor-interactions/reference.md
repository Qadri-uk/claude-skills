# Magnetic Cursor Interactions - Reference

## Falloff curve comparison

| Curve | Formula | Character |
|---|---|---|
| Linear | `1 - d/r` | Even pull, most predictable |
| Quadratic | `(1 - d/r)^2` | Gentle at edge, strong snap near center |
| Cosine | `cos(d/r * PI/2)` | Smooth start and end, natural feel |
| Exponential | `exp(-3 * d/r)` | Very strong near center, barely noticeable at edge |

## Gotchas

1. **Scrolled containers break rect caching.** If the magnetic element is inside a scrollable div (not the window), you need to listen for that container's scroll event, not just window scroll.
2. **CSS transforms on parents offset getBoundingClientRect.** If a parent has `transform: scale()` or `translate()`, the rect is in transformed coordinates. You must walk up and invert the parent transforms or use `el.getClientRects()[0]` which is in viewport space.
3. **Position: fixed elements do not scroll.** If the magnetic element is `position: fixed`, skip the scroll-based rect invalidation; it does not move.
4. **SVG elements return different rects.** For SVG `<circle>` or `<rect>`, use `getBBox()` for element-local coordinates, then convert with `getScreenCTM()`.
5. **Iframe boundaries.** Magnetic pull cannot cross iframe boundaries. Mouse events from the parent frame do not propagate into iframes.
6. **Will-change: transform.** Adding `will-change: transform` promotes the element to its own compositor layer. Useful if you have many magnetic elements, wasteful if you have one.
7. **Subpixel rendering.** Translating by fractional pixels can cause text to blur on non-retina displays. Round to nearest 0.5px if text clarity matters: `Math.round(x * 2) / 2`.

## Additional recipes

### Magnetic with rotation tilt
Element tilts based on cursor position within the pull radius, creating a 3D perspective effect.

```js
function magneticTilt(el, { radius = 200, maxTilt = 12, strength = 0.3 } = {}) {
  if (!matchMedia('(hover: hover)').matches) return;
  let rect = el.getBoundingClientRect();

  el.style.transformStyle = 'preserve-3d';
  el.style.perspective = '600px';

  window.addEventListener('mousemove', (e) => {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);

    if (dist < radius) {
      const pull = 1 - dist / radius;
      const rotateY = (dx / radius) * maxTilt * pull;
      const rotateX = -(dy / radius) * maxTilt * pull;
      el.style.transform = `translate(${dx * pull * strength}px, ${dy * pull * strength}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    } else {
      el.style.transform = '';
    }
  });

  window.addEventListener('resize', () => { rect = el.getBoundingClientRect(); });
}
```

### Magnetic snap-to-grid
Element snaps to the nearest grid point within the pull radius instead of following the cursor freely.

```js
function magneticGrid(el, { radius = 150, gridSize = 20, strength = 0.5 } = {}) {
  if (!matchMedia('(hover: hover)').matches) return;
  let rect = el.getBoundingClientRect();

  window.addEventListener('mousemove', (e) => {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);

    if (dist < radius) {
      const pull = 1 - dist / radius;
      const rawX = dx * pull * strength;
      const rawY = dy * pull * strength;
      const snappedX = Math.round(rawX / gridSize) * gridSize;
      const snappedY = Math.round(rawY / gridSize) * gridSize;
      el.style.transform = `translate(${snappedX}px, ${snappedY}px)`;
    } else {
      el.style.transform = '';
    }
  });

  window.addEventListener('resize', () => { rect = el.getBoundingClientRect(); });
}
```

### Directional magnetic (horizontal only)
Pull only along the X axis. Useful for horizontal nav items.

```js
function magneticHorizontal(el, { radius = 120, strength = 0.4 } = {}) {
  if (!matchMedia('(hover: hover)').matches) return;
  let rect = el.getBoundingClientRect();

  window.addEventListener('mousemove', (e) => {
    const cx = rect.left + rect.width / 2;
    const dx = e.clientX - cx;
    const dist = Math.abs(dx);

    if (dist < radius) {
      const pull = 1 - dist / radius;
      el.style.transform = `translateX(${dx * pull * strength}px)`;
    } else {
      el.style.transform = '';
    }
  });

  window.addEventListener('resize', () => { rect = el.getBoundingClientRect(); });
}
```

### Performance: single manager for many elements
One global listener managing all magnetic elements to avoid listener-per-element overhead.

```js
class MagneticManager {
  constructor() {
    this.elements = new Map();
    this.active = false;

    if (!matchMedia('(hover: hover)').matches) return;

    window.addEventListener('mousemove', (e) => this.onMove(e));
    window.addEventListener('resize', () => this.cacheAll());
  }

  register(el, opts = {}) {
    const config = { radius: 150, strength: 0.35, ...opts };
    this.elements.set(el, { config, rect: el.getBoundingClientRect() });
  }

  unregister(el) {
    this.elements.delete(el);
    el.style.transform = '';
  }

  cacheAll() {
    this.elements.forEach((data, el) => {
      data.rect = el.getBoundingClientRect();
    });
  }

  onMove(e) {
    this.elements.forEach((data, el) => {
      const { rect, config } = data;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist < config.radius) {
        const pull = 1 - dist / config.radius;
        el.style.transform = `translate(${dx * pull * config.strength}px, ${dy * pull * config.strength}px)`;
      } else {
        el.style.transform = '';
      }
    });
  }
}
```
