# Custom Cursor Systems - Reference

## State machine definition pattern

```ts
interface CursorState {
  size: number;
  backgroundColor: string;
  borderRadius: string;
  mixBlendMode: string;
  text: string;
  opacity: number;
}

const STATES: Record<string, CursorState> = {
  default: { size: 12, backgroundColor: '#fff', borderRadius: '50%', mixBlendMode: 'difference', text: '', opacity: 1 },
  hover:   { size: 48, backgroundColor: '#fff', borderRadius: '50%', mixBlendMode: 'difference', text: '', opacity: 1 },
  view:    { size: 80, backgroundColor: '#fff', borderRadius: '50%', mixBlendMode: 'difference', text: 'View', opacity: 1 },
  drag:    { size: 60, backgroundColor: '#fff', borderRadius: '50%', mixBlendMode: 'difference', text: 'Drag', opacity: 1 },
  text:    { size: 3,  backgroundColor: '#fff', borderRadius: '1px', mixBlendMode: 'difference', text: '', opacity: 1 },
  hidden:  { size: 0,  backgroundColor: '#fff', borderRadius: '50%', mixBlendMode: 'difference', text: '', opacity: 0 },
};
```

## Gotchas

1. **iframes reset `cursor: none`.** Content inside an iframe has its own cursor style. You cannot hide the cursor inside a third-party iframe (YouTube embeds, maps). Revert to native cursor over iframes.
2. **`mix-blend-mode: difference` + `position: fixed` + `overflow: hidden` on ancestors.** If any ancestor has `overflow: hidden` and creates a stacking context, the blend may clip. Move the cursor element to be a direct child of `<body>`.
3. **Right-click context menu.** The context menu shows the native cursor. You cannot prevent this and should not try. Just handle `contextmenu` to show/hide your cursor gracefully.
4. **Window blur.** When the browser window loses focus (alt-tab), `mouseleave` may not fire. Listen for `blur` on `window` to hide the cursor.
5. **Drag operations.** During native drag (text selection, image drag), the OS takes over the cursor. Hide the custom cursor on `dragstart` and restore on `dragend`.
6. **High-DPI fractional pixels.** On 2x/3x displays, subpixel positions are fine. On 1x displays, fractional pixels cause blurring. Round positions if targeting 1x screens.

## Additional recipes

### Frame-rate independent lerp
Consistent feel across 60Hz, 120Hz, and 240Hz displays.

```js
class FRICursor {
  constructor(el) {
    this.el = el;
    this.pos = { x: 0, y: 0 };
    this.mouse = { x: 0, y: 0 };
    this.lastTime = performance.now();
    this.smoothing = 0.15;

    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    this.tick();
  }

  tick() {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 16.667, 4);
    this.lastTime = now;

    const factor = 1 - Math.pow(1 - this.smoothing, dt);
    this.pos.x += (this.mouse.x - this.pos.x) * factor;
    this.pos.y += (this.mouse.y - this.pos.y) * factor;

    this.el.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0) translate(-50%, -50%)`;
    requestAnimationFrame(() => this.tick());
  }
}
```

### Cursor that morphs to match hovered element shape
The cursor scales to match the bounding box of the hovered element.

```js
function morphCursor(cursorEl, selector) {
  document.querySelectorAll(selector).forEach((target) => {
    target.addEventListener('mouseenter', () => {
      const r = target.getBoundingClientRect();
      cursorEl.style.width = `${r.width + 16}px`;
      cursorEl.style.height = `${r.height + 16}px`;
      cursorEl.style.borderRadius = getComputedStyle(target).borderRadius;
    });
    target.addEventListener('mouseleave', () => {
      cursorEl.style.width = '';
      cursorEl.style.height = '';
      cursorEl.style.borderRadius = '';
    });
  });
}
```

### Cursor trail (multiple dots fading out)
A trail of dots following the main cursor, each with increasing delay.

```js
function cursorTrail(count = 6) {
  const dots = [];
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('div');
    dot.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: ${8 - i}px; height: ${8 - i}px;
      background: white; border-radius: 50%;
      pointer-events: none; z-index: ${9999 - i};
      will-change: transform; mix-blend-mode: difference;
      opacity: ${1 - i * 0.15};
    `;
    dot.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dot);
    dots.push({ el: dot, x: 0, y: 0 });
  }

  const mouse = { x: 0, y: 0 };
  document.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  function tick() {
    dots.forEach((dot, i) => {
      const target = i === 0 ? mouse : dots[i - 1];
      const speed = 0.35 - i * 0.04;
      dot.x += (target.x - dot.x) * speed;
      dot.y += (target.y - dot.y) * speed;
      dot.el.style.transform = `translate3d(${dot.x}px, ${dot.y}px, 0) translate(-50%, -50%)`;
    });
    requestAnimationFrame(tick);
  }
  tick();
}
```
