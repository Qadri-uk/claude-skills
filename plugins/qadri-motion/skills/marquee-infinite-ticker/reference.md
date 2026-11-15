# Marquee / Infinite Ticker - Reference

## Direction and duplication math

For a left-scrolling marquee:
- Content width = `W` (measured via `offsetWidth` of one content block)
- Track contains 2 copies, total width = `2W`
- Animation: `translateX(0)` to `translateX(-W)` (or `-50%` if track width is exactly 2W)
- At `-W`, position resets to `0`. The second copy is now where the first was. Seamless.

For a right-scrolling marquee:
- Same setup but translate from `0` to `W` (positive direction).
- Or use `animation-direction: reverse` on the same keyframe.

For vertical:
- Same principle on Y axis. Container has fixed `height`. Track translates from `0` to `-contentHeight`.

## Gotchas

1. **Dynamic content width.** If marquee items are images that load asynchronously, `offsetWidth` measured before images load is wrong. Wait for all images to load or use explicit dimensions.
2. **Flex gap vs padding.** The gap between the last item of copy 1 and the first item of copy 2 is determined by the container's `gap` property AND the `padding-right` on each content block. If you use `gap` on the track flex, each content block also gets `gap` between them. Make sure the visual spacing is consistent.
3. **Resize handling.** If the viewport resizes, `contentWidth` changes. Recalculate on resize or the wrap point is wrong, causing a visible jump.
4. **Subpixel seam.** On 1x displays, `translateX(-50%)` can land between pixels, causing a 1px gap between the two copies. Fix with `translateX(calc(-50% - 0.5px))` or promote to a compositor layer.
5. **RTL document direction.** In an RTL document, `transform: translateX(-50%)` still moves left. The visual direction is correct for LTR reading marquees. For RTL content, negate the direction.
6. **Content must fill the viewport width.** If the content is narrower than the viewport, you need more than 2 copies to fill the visible area. Use `Math.ceil(viewportWidth / contentWidth) + 1` copies.
7. **CSS `animation-play-state: paused` is instant.** There is no CSS way to smoothly decelerate. For smooth pause, use JS.

## Additional recipes

### Auto-duplicating (JS measures and creates copies)
Automatically creates enough copies to fill the viewport.

```js
function autoMarquee(container, { speed = 1 } = {}) {
  const content = container.querySelector('.marquee-content');
  const track = container.querySelector('.marquee-track');
  const contentWidth = content.offsetWidth;
  const viewportWidth = container.offsetWidth;
  const copies = Math.ceil(viewportWidth / contentWidth) + 1;

  for (let i = 1; i < copies; i++) {
    const clone = content.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  }

  let position = 0;
  function tick() {
    position -= speed;
    if (Math.abs(position) >= contentWidth) {
      position += contentWidth;
    }
    track.style.transform = `translate3d(${position}px, 0, 0)`;
    requestAnimationFrame(tick);
  }
  tick();
}
```

### Alternating rows (opposite directions)
Two marquee rows scrolling in opposite directions for a dynamic visual.

```html
<div class="marquee-stack">
  <div class="marquee" data-direction="left">
    <div class="marquee-track">
      <div class="marquee-content"><!-- items --></div>
      <div class="marquee-content" aria-hidden="true"><!-- items --></div>
    </div>
  </div>
  <div class="marquee" data-direction="right">
    <div class="marquee-track">
      <div class="marquee-content"><!-- items --></div>
      <div class="marquee-content" aria-hidden="true"><!-- items --></div>
    </div>
  </div>
</div>
```

```css
.marquee[data-direction="left"] .marquee-track {
  animation: marquee-left 20s linear infinite;
}
.marquee[data-direction="right"] .marquee-track {
  animation: marquee-left 25s linear infinite reverse;
}

@keyframes marquee-left {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

### Marquee with gradient edge fade
Content fades at the edges of the marquee container.

```css
.marquee {
  overflow: hidden;
  position: relative;
}
.marquee::before,
.marquee::after {
  content: '';
  position: absolute;
  top: 0; bottom: 0;
  width: 80px;
  z-index: 1;
  pointer-events: none;
}
.marquee::before {
  left: 0;
  background: linear-gradient(to right, var(--bg, #fff), transparent);
}
.marquee::after {
  right: 0;
  background: linear-gradient(to left, var(--bg, #fff), transparent);
}
```

### Draggable marquee
User can grab and drag the marquee to scrub through content.

```js
function draggableMarquee(el, { baseSpeed = 1, friction = 0.95 } = {}) {
  const track = el.querySelector('.marquee-track');
  const content = el.querySelector('.marquee-content');
  const contentWidth = content.offsetWidth;

  let position = 0;
  let velocity = baseSpeed;
  let isDragging = false;
  let dragStart = 0;
  let dragVelocity = 0;

  el.addEventListener('pointerdown', (e) => {
    isDragging = true;
    dragStart = e.clientX;
    dragVelocity = 0;
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart;
    dragVelocity = dx * 0.1;
    dragStart = e.clientX;
    position += dx;
  });

  el.addEventListener('pointerup', () => {
    isDragging = false;
    velocity = dragVelocity || baseSpeed;
  });

  function tick() {
    if (!isDragging) {
      velocity *= friction;
      if (Math.abs(velocity) < baseSpeed) velocity = -baseSpeed;
      position += velocity;
    }
    position = ((position % contentWidth) + contentWidth) % contentWidth;
    track.style.transform = `translate3d(${-position}px, 0, 0)`;
    requestAnimationFrame(tick);
  }
  tick();
}
```
