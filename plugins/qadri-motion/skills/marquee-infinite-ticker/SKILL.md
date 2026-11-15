---
name: marquee-infinite-ticker
description: "Use when building seamless infinite-scrolling marquee or ticker strips, including duplicate-and-translate math, CSS-only and JS velocity versions, scroll-speed coupling, hover pause, and RTL support."
---

# Marquee / Infinite Ticker

## When to use this
- Building a horizontally scrolling logo strip, news ticker, or text ribbon.
- Creating a continuous infinite scroll effect with no visible seam or jump.
- Adding scroll-speed coupling where the ticker accelerates with page scroll.
- Implementing hover-to-pause on a running marquee.
- Do NOT use this for scroll-triggered entrance animations; see `scroll-reveal-choreography` instead.

## Mental model
An infinite marquee works by duplicating the content and translating the entire strip. When the first copy scrolls fully off-screen, it is in exactly the same position relative to the second copy as it was at the start. The animation resets to 0 and the cycle repeats. Because the two copies are identical, the reset is invisible.

The math: the strip contains two copies of the content side by side. The total width of one copy is `W`. The animation translates from `0` to `-W` (or `W` for reverse direction). At `-W`, the second copy is now exactly where the first copy started. Reset to `0` and it is seamless.

CSS `@keyframes` with `translateX(-50%)` handles this when the strip is exactly 2x the content width. For JS-driven marquees with velocity control, you track a `position` value that wraps around using modulo: `position = ((position - speed) % contentWidth + contentWidth) % contentWidth`.

The seam problem: sub-pixel rendering can cause a 1px gap between the two copies on some displays. Fix by overlapping the copies by 1px or using `will-change: transform` to promote to a compositor layer where sub-pixel rendering is handled differently.

For RTL (right-to-left) languages, the marquee scrolls in the opposite direction (right to left is already the default Western reading direction marquee, so RTL content marquees should scroll left to right).

## Setup
No library needed. CSS-only for constant-speed. JS for velocity control, scroll coupling, and pause.

```html
<div class="marquee" aria-label="Scrolling content">
  <div class="marquee-track">
    <div class="marquee-content">
      <!-- Your items -->
    </div>
    <div class="marquee-content" aria-hidden="true">
      <!-- Duplicate of above -->
    </div>
  </div>
</div>
```

The duplicate MUST be `aria-hidden="true"` to prevent screen readers from reading the content twice.

## Core API

| Concept | CSS Implementation | JS Implementation |
|---|---|---|
| Strip translation | `@keyframes { to { translateX(-50%) } }` | `position = (position - speed) % width` |
| Seamless wrap | Two copies, animate from 0 to -50% | Modulo wrap of position |
| Speed | `animation-duration` | `speed` variable (px/frame) |
| Pause on hover | `animation-play-state: paused` | Set `speed = 0` or `paused = true` |
| Direction | `animation-direction: reverse` | Negate speed |
| Scroll coupling | N/A (CSS only) | Read scroll delta, add to speed |
| RTL | `dir="rtl"` + reverse direction | Negate speed for RTL |

## Recipes

### CSS-only constant-speed marquee
Pure CSS infinite marquee. No JavaScript.

```html
<div class="marquee">
  <div class="marquee-track">
    <div class="marquee-content">
      <span>ITEM ONE</span>
      <span>ITEM TWO</span>
      <span>ITEM THREE</span>
      <span>ITEM FOUR</span>
    </div>
    <div class="marquee-content" aria-hidden="true">
      <span>ITEM ONE</span>
      <span>ITEM TWO</span>
      <span>ITEM THREE</span>
      <span>ITEM FOUR</span>
    </div>
  </div>
</div>
```

```css
.marquee {
  overflow: hidden;
  white-space: nowrap;
}

.marquee-track {
  display: inline-flex;
  animation: marquee-scroll 20s linear infinite;
  will-change: transform;
}

.marquee-content {
  display: inline-flex;
  gap: 3rem;
  padding-right: 3rem;
}

@keyframes marquee-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

@media (prefers-reduced-motion: reduce) {
  .marquee-track {
    animation-play-state: paused;
  }
}
```

### CSS marquee with hover pause
Pauses on hover, resumes on leave. Smooth start/stop with transition.

```css
.marquee-track {
  display: inline-flex;
  animation: marquee-scroll 20s linear infinite;
  will-change: transform;
}

@media (hover: hover) {
  .marquee:hover .marquee-track {
    animation-play-state: paused;
  }
}

@keyframes marquee-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
```

For a smooth deceleration instead of instant pause, use JS (see next recipe).

### JS velocity marquee with smooth pause
JavaScript-driven marquee with acceleration/deceleration on hover.

```js
class VelocityMarquee {
  constructor(el, { baseSpeed = 1, pauseDecel = 0.95 } = {}) {
    this.track = el.querySelector('.marquee-track');
    this.content = el.querySelector('.marquee-content');
    this.baseSpeed = baseSpeed;
    this.currentSpeed = baseSpeed;
    this.targetSpeed = baseSpeed;
    this.pauseDecel = pauseDecel;
    this.position = 0;
    this.contentWidth = this.content.offsetWidth;
    this.paused = false;

    el.addEventListener('mouseenter', () => { this.targetSpeed = 0; });
    el.addEventListener('mouseleave', () => { this.targetSpeed = this.baseSpeed; });

    window.addEventListener('resize', () => {
      this.contentWidth = this.content.offsetWidth;
    });

    this.tick();
  }

  tick() {
    this.currentSpeed += (this.targetSpeed - this.currentSpeed) * 0.08;
    this.position -= this.currentSpeed;

    if (Math.abs(this.position) >= this.contentWidth) {
      this.position += this.contentWidth;
    }

    this.track.style.transform = `translate3d(${this.position}px, 0, 0)`;
    requestAnimationFrame(() => this.tick());
  }
}

new VelocityMarquee(document.querySelector('.marquee'));
```

### Scroll-speed coupled marquee
Marquee accelerates when the user scrolls, creating a kinetic connection between page scroll and the ticker.

```js
class ScrollMarquee {
  constructor(el, { baseSpeed = 0.5, scrollMultiplier = 0.3, maxSpeed = 8 } = {}) {
    this.track = el.querySelector('.marquee-track');
    this.content = el.querySelector('.marquee-content');
    this.baseSpeed = baseSpeed;
    this.scrollMultiplier = scrollMultiplier;
    this.maxSpeed = maxSpeed;
    this.position = 0;
    this.scrollSpeed = 0;
    this.contentWidth = this.content.offsetWidth;
    this.lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
      const delta = window.scrollY - this.lastScrollY;
      this.scrollSpeed = delta * this.scrollMultiplier;
      this.lastScrollY = window.scrollY;
    }, { passive: true });

    window.addEventListener('resize', () => {
      this.contentWidth = this.content.offsetWidth;
    });

    this.tick();
  }

  tick() {
    this.scrollSpeed *= 0.92;
    const speed = Math.min(this.baseSpeed + Math.abs(this.scrollSpeed), this.maxSpeed);
    const direction = this.scrollSpeed < -0.5 ? 1 : -1;
    this.position += speed * direction;

    if (Math.abs(this.position) >= this.contentWidth) {
      this.position = this.position % this.contentWidth;
    }

    this.track.style.transform = `translate3d(${this.position}px, 0, 0)`;
    requestAnimationFrame(() => this.tick());
  }
}

new ScrollMarquee(document.querySelector('.marquee'));
```

### Direction-flip marquee (reverses on scroll direction)
The marquee scrolls left normally but reverses direction when the user scrolls up.

```js
class DirectionFlipMarquee {
  constructor(el, { speed = 1 } = {}) {
    this.track = el.querySelector('.marquee-track');
    this.content = el.querySelector('.marquee-content');
    this.speed = speed;
    this.direction = -1;
    this.position = 0;
    this.contentWidth = this.content.offsetWidth;
    this.lastScrollY = window.scrollY;

    window.addEventListener('scroll', () => {
      const delta = window.scrollY - this.lastScrollY;
      this.direction = delta >= 0 ? -1 : 1;
      this.lastScrollY = window.scrollY;
    }, { passive: true });

    window.addEventListener('resize', () => {
      this.contentWidth = this.content.offsetWidth;
    });

    this.tick();
  }

  tick() {
    this.position += this.speed * this.direction;

    const w = this.contentWidth;
    this.position = ((this.position % w) + w) % w;
    if (this.direction === -1) {
      this.track.style.transform = `translate3d(${-this.position}px, 0, 0)`;
    } else {
      this.track.style.transform = `translate3d(${-(w - this.position)}px, 0, 0)`;
    }

    requestAnimationFrame(() => this.tick());
  }
}
```

### Vertical ticker (top to bottom)
A vertically scrolling news-style ticker.

```css
.ticker-vertical {
  overflow: hidden;
  height: 200px;
}

.ticker-vertical .marquee-track {
  display: flex;
  flex-direction: column;
  animation: ticker-scroll-v 15s linear infinite;
}

@keyframes ticker-scroll-v {
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}
```

```html
<div class="ticker-vertical">
  <div class="marquee-track">
    <div class="ticker-content">
      <p>Breaking: First headline</p>
      <p>Update: Second headline</p>
      <p>Alert: Third headline</p>
    </div>
    <div class="ticker-content" aria-hidden="true">
      <p>Breaking: First headline</p>
      <p>Update: Second headline</p>
      <p>Alert: Third headline</p>
    </div>
  </div>
</div>
```


## Tuning the feel
- **Speed (CSS duration)**: 15-30s for a full cycle. Faster than 10s feels rushed. Slower than 40s and the user does not perceive motion.
- **Speed (JS px/frame)**: 0.5-2px/frame at 60fps. Above 3px/frame is too fast for logos/text. Below 0.3px/frame is barely perceptible.
- **Gap between items**: 2-4rem or 32-64px. Too tight and items blend together. Too loose and there are visible empty spans.
- **Hover deceleration**: Lerp from current speed to 0 with factor 0.06-0.1 for a smooth coast-to-stop. Instant pause (CSS `animation-play-state`) is acceptable for simple marquees.
- **Scroll coupling multiplier**: 0.15-0.4 of scroll delta added to base speed. Above 0.5 and the marquee overshoots wildly.
- **Max speed cap**: 6-10px/frame. Without a cap, fast scroll gestures make the marquee a blur.
- **Content padding-right**: Must exactly match the gap between items. This ensures the seam between the last item of copy 1 and the first item of copy 2 has the same spacing as between all other items.

## Performance
- `transform: translate3d()` is compositor-only. The marquee animation itself is cheap.
- `will-change: transform` promotes the track to its own layer. Do this.
- The content is rendered once and translated. No repaints occur during the animation.
- For image-heavy marquees (logo strips), ensure images are decoded before they scroll into view. Use `decoding="async"` and preload critical images.
- On mobile, a marquee that runs while off-screen wastes battery. Use IntersectionObserver to pause when not visible:
  ```js
  const observer = new IntersectionObserver(([entry]) => {
    entry.isIntersecting ? marquee.resume() : marquee.pause();
  });
  observer.observe(marqueeEl);
  ```

## Accessibility
```css
@media (prefers-reduced-motion: reduce) {
  .marquee-track {
    animation: none !important;
    transform: none !important;
  }
}
```

- The duplicate content MUST have `aria-hidden="true"`. Screen readers should read the content exactly once.
- Add `aria-label` or `aria-roledescription="marquee"` to the container for semantic meaning.
- If the marquee contains actionable items (links, buttons), they must be focusable and usable via keyboard. The marquee should pause on focus-within, not just hover.
- Moving text can be disorienting. Always respect `prefers-reduced-motion`.
- Consider adding a visible pause button for users who find the motion distracting but have not set the OS preference.

```js
// Pause on keyboard focus within
marqueeEl.addEventListener('focusin', () => { /* pause */ });
marqueeEl.addEventListener('focusout', () => { /* resume */ });
```

## Anti-slop rules
1. Never use the deprecated `<marquee>` HTML element. It is non-standard and has been removed from the spec.
2. Never duplicate content without `aria-hidden="true"` on the duplicate. Screen readers will read everything twice.
3. Never use `overflow: visible` on the marquee container. Content must clip at the edges.
4. Never forget the gap on the last item. The padding-right on the content container must match the gap between items, or there is a visible seam where one copy ends and the next begins.
5. Never animate `left` or `margin-left` for marquee position. Use `transform: translateX()` or `translate3d()` only.
6. Never run the RAF loop when the marquee is off-screen. Use IntersectionObserver to pause.
7. Never allow infinite speed on scroll-coupled marquees. Cap the maximum speed or fast scroll gestures make the content a blur.
8. Never make a marquee the only way to access content. If items in the marquee are links or contain important information, provide a static alternative.

## Checklist
- [ ] Duplicate content has `aria-hidden="true"`
- [ ] Container has `overflow: hidden`
- [ ] Content padding-right matches the item gap
- [ ] `will-change: transform` on the track
- [ ] `prefers-reduced-motion` stops the animation
- [ ] Hover pauses the marquee (with smooth deceleration)
- [ ] Focus-within pauses the marquee
- [ ] Off-screen marquee is paused via IntersectionObserver
- [ ] No sub-pixel seam visible between copies
- [ ] Speed capped for scroll-coupled variants
