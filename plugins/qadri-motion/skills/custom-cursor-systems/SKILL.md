---
name: custom-cursor-systems
description: "Use when replacing the native OS cursor with a custom-rendered element that changes shape, size, color, or text based on hover context."
---

# Custom Cursor Systems

## When to use this
- Building a portfolio, agency, or editorial site where a custom cursor is a deliberate design choice.
- Implementing contextual cursor states: "View" on project cards, "Drag" on sliders, "Play" on video thumbnails.
- Creating a blend-mode-difference cursor that inverts over light and dark backgrounds.
- Adding a trailing dot/ring follower with lerp delay for a fluid feel.
- Do NOT use this for magnetic pull-toward-button effects; see `magnetic-cursor-interactions` instead.

## Mental model
A custom cursor is a DOM element positioned with `transform: translate()` on every `mousemove`. The native cursor is hidden with `cursor: none` on the `body`. The custom cursor follows the real one with a lerp delay that gives it a trailing, fluid feel.

The cursor has a state machine. States are things like `default`, `hover`, `drag`, `text`, `view`, `hidden`. Each state maps to a size, color, blend mode, opacity, and optional text label. State transitions are triggered by `mouseenter`/`mouseleave` on elements with `data-cursor` attributes.

The critical detail: the custom cursor element must have `pointer-events: none` or it will intercept clicks meant for elements underneath it. This is the number-one bug.

Performance-wise, the cursor element should be a promoted compositor layer (`will-change: transform`). All styling changes happen via class toggling, not inline style manipulation per-frame.

## Setup
No library needed. Typically 60-100 lines of JS and 40-60 lines of CSS.

```html
<div id="cursor" class="cursor" aria-hidden="true">
  <span class="cursor-text"></span>
</div>
```

## Core API

| Concept | Implementation | Note |
|---|---|---|
| Position | `transform: translate3d(x, y, 0)` | GPU promotion |
| Hide native | `body { cursor: none; }` | Set on all interactive elements too |
| Pointer-events | `pointer-events: none` on cursor el | Non-negotiable |
| State attribute | `data-cursor="view"` on targets | Read on mouseenter |
| Lerp follow | `pos += (mouse - pos) * 0.15` | Per-frame in RAF |
| Blend mode | `mix-blend-mode: difference` | Needs white cursor |
| Touch hide | `matchMedia('(pointer: coarse)')` | No custom cursor on touch |
| Resize state | Scale via CSS `transform: scale()` | Transition the scale |

## Recipes

### Basic lerped follower
A 12px dot that trails the cursor with smooth interpolation.

```js
class Cursor {
  constructor() {
    this.el = document.getElementById('cursor');
    this.pos = { x: 0, y: 0 };
    this.mouse = { x: 0, y: 0 };
    this.speed = 0.15;
    this.visible = false;

    if (matchMedia('(pointer: coarse)').matches) {
      this.el.style.display = 'none';
      return;
    }

    document.body.style.cursor = 'none';
    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      if (!this.visible) {
        this.visible = true;
        this.pos.x = e.clientX;
        this.pos.y = e.clientY;
        this.el.classList.add('is-visible');
      }
    });
    document.addEventListener('mouseleave', () => {
      this.visible = false;
      this.el.classList.remove('is-visible');
    });
    this.tick();
  }

  tick() {
    this.pos.x += (this.mouse.x - this.pos.x) * this.speed;
    this.pos.y += (this.mouse.y - this.pos.y) * this.speed;
    this.el.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(() => this.tick());
  }
}

new Cursor();
```

```css
.cursor {
  position: fixed; top: 0; left: 0;
  width: 12px; height: 12px; background: white;
  border-radius: 50%; pointer-events: none; z-index: 9999;
  will-change: transform; mix-blend-mode: difference;
  opacity: 0; transition: width 0.3s, height 0.3s, opacity 0.2s;
}
.cursor.is-visible { opacity: 1; }
```

### State machine with data attributes
Elements declare their cursor state. The cursor morphs on enter/leave.

```js
class StateCursor {
  constructor() {
    this.el = document.getElementById('cursor');
    this.textEl = this.el.querySelector('.cursor-text');
    this.state = 'default';
    this.pos = { x: 0, y: 0 };
    this.mouse = { x: 0, y: 0 };

    if (matchMedia('(pointer: coarse)').matches) return;
    document.body.style.cursor = 'none';

    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    document.querySelectorAll('[data-cursor]').forEach((target) => {
      target.addEventListener('mouseenter', () => {
        this.setState(target.dataset.cursor, target.dataset.cursorText || '');
      });
      target.addEventListener('mouseleave', () => this.setState('default', ''));
    });

    this.tick();
  }

  setState(state, text) {
    this.el.classList.remove(`is-${this.state}`);
    this.state = state;
    this.el.classList.add(`is-${this.state}`);
    this.textEl.textContent = text;
  }

  tick() {
    this.pos.x += (this.mouse.x - this.pos.x) * 0.15;
    this.pos.y += (this.mouse.y - this.pos.y) * 0.15;
    this.el.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(() => this.tick());
  }
}
```

```css
.cursor {
  position: fixed; top: 0; left: 0; width: 12px; height: 12px;
  background: white; border-radius: 50%; pointer-events: none; z-index: 9999;
  will-change: transform; mix-blend-mode: difference;
  display: flex; align-items: center; justify-content: center;
  transition: width 0.35s cubic-bezier(0.23, 1, 0.32, 1),
              height 0.35s cubic-bezier(0.23, 1, 0.32, 1);
}
.cursor.is-hover { width: 48px; height: 48px; }
.cursor.is-view { width: 80px; height: 80px; }
.cursor.is-text { width: 3px; height: 24px; border-radius: 1px; }
.cursor-text {
  font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase;
  color: black; opacity: 0; transition: opacity 0.2s;
}
.cursor.is-view .cursor-text { opacity: 1; }
```

### Outer ring + inner dot (dual element)
A small dot follows exactly; a larger ring trails behind with slower lerp.

```js
class DualCursor {
  constructor() {
    this.dot = document.querySelector('.cursor-dot');
    this.ring = document.querySelector('.cursor-ring');
    this.dotPos = { x: 0, y: 0 };
    this.ringPos = { x: 0, y: 0 };
    this.mouse = { x: 0, y: 0 };

    if (matchMedia('(pointer: coarse)').matches) return;
    document.body.style.cursor = 'none';
    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX; this.mouse.y = e.clientY;
    });
    this.tick();
  }

  tick() {
    this.dotPos.x += (this.mouse.x - this.dotPos.x) * 0.8;
    this.dotPos.y += (this.mouse.y - this.dotPos.y) * 0.8;
    this.ringPos.x += (this.mouse.x - this.ringPos.x) * 0.08;
    this.ringPos.y += (this.mouse.y - this.ringPos.y) * 0.08;
    this.dot.style.transform = `translate3d(${this.dotPos.x}px, ${this.dotPos.y}px, 0) translate(-50%, -50%)`;
    this.ring.style.transform = `translate3d(${this.ringPos.x}px, ${this.ringPos.y}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(() => this.tick());
  }
}
```

### Sticky hover (cursor snaps to element center)
When hovering a target, cursor snaps to the element's center and scales up.

```js
function stickyCursor(cursorEl, targets) {
  let stuck = false, stuckTarget = null;
  const mouse = { x: 0, y: 0 }, pos = { x: 0, y: 0 };

  document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY;
  });

  targets.forEach((target) => {
    target.addEventListener('mouseenter', () => { stuck = true; stuckTarget = target; cursorEl.classList.add('is-stuck'); });
    target.addEventListener('mouseleave', () => { stuck = false; stuckTarget = null; cursorEl.classList.remove('is-stuck'); });
  });

  function tick() {
    let tx = mouse.x, ty = mouse.y;
    if (stuck && stuckTarget) {
      const r = stuckTarget.getBoundingClientRect();
      tx = r.left + r.width / 2;
      ty = r.top + r.height / 2;
    }
    pos.x += (tx - pos.x) * 0.15;
    pos.y += (ty - pos.y) * 0.15;
    cursorEl.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(tick);
  }
  tick();
}
```

### Blend mode difference cursor
The classic inversion cursor visible on both light and dark sections.

```css
.cursor-blend {
  position: fixed; top: 0; left: 0; width: 20px; height: 20px;
  background: white; border-radius: 50%; pointer-events: none;
  z-index: 9999; will-change: transform; mix-blend-mode: difference;
}
```

`mix-blend-mode: difference` inverts whatever is underneath. No JS color logic needed. Requires no `isolation: isolate` or `opacity < 1` on ancestor elements, which would break the blend context.

### Accessibility toggle: restore native cursor

```js
function setupCursorToggle(cursorEl) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = matchMedia('(pointer: coarse)');

  function disable() {
    cursorEl.style.display = 'none';
    document.body.style.cursor = '';
  }

  if (reducedMotion.matches || coarsePointer.matches) { disable(); return; }

  reducedMotion.addEventListener('change', (e) => {
    e.matches ? disable() : (cursorEl.style.display = '', document.body.style.cursor = 'none');
  });
}
```

## Tuning the feel
- **Lerp speed (dot)**: 0.12-0.18 for a smooth trail. Above 0.3 the trail disappears. Below 0.08 feels disconnected.
- **Lerp speed (ring)**: 0.06-0.10. Ratio between dot and ring speed should be at least 2:1.
- **Scale transition**: 300-400ms with `cubic-bezier(0.23, 1, 0.32, 1)`.
- **Cursor size (default)**: 8-16px. Larger than 20px in default state is distracting.
- **Cursor size (hover)**: 40-80px depending on target size.
- **Text label size**: 10-12px, uppercase, letter-spaced 0.04-0.08em.
- **Hide delay**: 150ms fade-out on mouseleave. Instant hide looks glitchy.

## Performance
- Single RAF loop, one element with `will-change: transform`. Cheap.
- `mousemove` handler must not query DOM. Just store x/y.
- `mix-blend-mode: difference` can be expensive on large elements (100px+). Keep cursor small.
- For frame-rate independence: `pos += (target - pos) * (1 - Math.pow(1 - speed, dt * 60))`.

## Accessibility
```css
@media (prefers-reduced-motion: reduce) {
  .cursor, .cursor-dot, .cursor-ring { display: none !important; }
  body, a, button { cursor: auto !important; }
}

@media (pointer: coarse) {
  .cursor, .cursor-dot, .cursor-ring { display: none !important; }
  body { cursor: auto !important; }
}
```

- The custom cursor element MUST have `aria-hidden="true"`.
- Native focus indicators (`:focus-visible` outlines) must remain fully functional.
- If cursor text labels convey needed information, provide it through another channel (aria-label, visible text).

## Anti-slop rules
1. Never forget `pointer-events: none`. The cursor intercepting clicks is the most common bug.
2. Never show a custom cursor on mobile/tablet. `(pointer: coarse)` check is mandatory.
3. Never use `position: absolute` for the cursor. It must be `position: fixed`.
4. Never animate cursor position with CSS transitions. The lerp runs in JS via RAF.
5. Never make the default cursor larger than 20px.
6. Never use a custom cursor on text-heavy reading pages.
7. Never let the custom cursor remain visible when the real cursor leaves the viewport.
8. Never implement without a native fallback. If JS fails, `cursor: none` with no replacement is unusable.
9. Set `cursor: none` only after the custom cursor JS initializes.

## Checklist
- [ ] `pointer-events: none` on all cursor elements
- [ ] `aria-hidden="true"` on cursor elements
- [ ] `(pointer: coarse)` disables custom cursor entirely
- [ ] `prefers-reduced-motion` restores native cursor
- [ ] `cursor: none` set only after JS initializes
- [ ] `mouseleave` on document hides the custom cursor
- [ ] No CSS transition on `transform`
- [ ] Blend mode context verified (no `isolation: isolate` ancestors)
- [ ] Focus indicators remain fully visible
