---
name: hero-tilt-3d-layers
description: Use when building a pointer-responsive layered hero section where visual layers tilt in 3D perspective as the user moves their mouse or tilts their device. Builds a complete hero with real depth separation, glare, and parallax, not a card tilt effect.
category: hero
pairs_with: hero-tilt-3d-layers-eval
---

# Pointer-Tilt Layered Depth Hero

## What this builds
A full-viewport hero section where 3-5 visual layers (background, midground elements, text, foreground accents) respond to pointer position with true CSS 3D perspective transforms, creating a convincing depth diorama effect. Each layer tilts at a different rate based on its simulated z-depth.

- Layers separate visually on pointer movement, revealing parallax gaps between them
- A glare/light-reflection layer tracks the tilt angle, selling the physicality
- Smooth interpolation (lerp) prevents jitter; movement feels weighted, not 1:1
- Touch devices fall back to DeviceOrientation gyroscope input
- prefers-reduced-motion disables all movement and shows a flat composite
- The entire hero loads as a static composition first; JS only enhances it

## When to use / when not to
- Use when the hero needs to feel tangible and physical without heavy 3D libraries.
- Use when you have distinct visual assets (photo layers, illustrations, UI mockups) that benefit from depth separation.
- Do NOT use when the hero is text-only with no layered imagery; see `hero-minimal-swiss-type` instead.
- Do NOT use for scroll-driven parallax where layers respond to scroll position; see primitives `parallax-depth-systems` for that.
- Do NOT use for a single card tilt effect; that is a micro-interaction covered in primitives `hover-microinteraction-catalog`.

## Stack decision
**No library required.** The effect is pure CSS 3D transforms + a pointer event listener. Vanilla JS with lerp interpolation gives full control and zero bundle cost.

Vanilla-Tilt.js (1.8.1, 3.5 KB gzipped) is available if you want drop-in glare and gyroscope support, but it operates on a single element and cannot independently control per-layer tilt ratios out of the box. Wrapping each layer in its own Vanilla-Tilt instance creates multiple competing listeners and breaks the unified scene feel.

**Cheaper alternative**: Pure CSS `perspective` + `:hover` with `transform: rotateX/Y` and `transition`. No JS at all. Works for subtle tilt, but cannot track continuous pointer position or apply per-layer ratios.

## Architecture

```
hero-container (position: relative; perspective: 1200px)
  |
  +-- layer-bg       (translateZ: -80px, scale compensated)
  +-- layer-mid      (translateZ: -40px, scale compensated)
  +-- layer-content  (translateZ: 0, the anchor layer)
  +-- layer-fg       (translateZ: 30px)
  +-- layer-glare    (translateZ: 40px, gradient overlay)
```

File layout for a single-page hero:
```
hero-tilt.html (or component file)
  <section.hero-tilt>        -- the perspective container
    <div.hero-tilt__layer>   -- one per depth plane
    <div.hero-tilt__glare>   -- the specular highlight
  </section>
  <script>                   -- pointer tracking + lerp loop
```

Lifecycle:
1. **Static render**: Hero displays as a flat composite. All layers stacked via `position: absolute`, properly sized, visible without JS.
2. **JS init**: Detect `prefers-reduced-motion`. If allowed, attach `pointermove` listener to the container and start a rAF lerp loop.
3. **Frame loop**: Each frame, lerp current rotation toward target rotation (derived from pointer position). Apply per-layer `transform: rotateX() rotateY() translateZ()` with scale compensation.
4. **Pointer leave**: Lerp back to neutral (0, 0) rotation over ~600ms.
5. **Resize**: Recalculate container center coordinates.
6. **Teardown**: Cancel rAF, remove listeners.

## Build it: step by step

### Phase 1: HTML structure

```html
<section class="hero-tilt" aria-label="Product showcase">
  <div class="hero-tilt__layer hero-tilt__layer--bg">
    <img src="bg-landscape.webp" alt="" role="presentation"
         width="1920" height="1080" loading="eager" fetchpriority="high">
  </div>
  <div class="hero-tilt__layer hero-tilt__layer--mid">
    <img src="device-mockup.webp" alt="Product on laptop screen"
         width="800" height="600" loading="eager">
  </div>
  <div class="hero-tilt__layer hero-tilt__layer--content">
    <h1 class="hero-tilt__headline">Ship faster<br>with confidence</h1>
    <p class="hero-tilt__sub">The deployment platform teams actually trust.</p>
    <a href="/start" class="hero-tilt__cta">Get started</a>
  </div>
  <div class="hero-tilt__layer hero-tilt__layer--fg" aria-hidden="true">
    <img src="floating-ui.webp" alt="" role="presentation"
         width="300" height="200" loading="eager">
  </div>
  <div class="hero-tilt__glare" aria-hidden="true"></div>
</section>
```

Every layer gets explicit `width`/`height` on images to prevent CLS. The content layer holds the real semantic content. Decorative layers are `aria-hidden`.

### Phase 2: Base CSS (works without JS)

```css
.hero-tilt {
  position: relative;
  width: 100%;
  height: 100svh;
  overflow: hidden;
  perspective: 1200px;
  perspective-origin: 50% 50%;
  transform-style: preserve-3d;
  background: #0a0a0a;
}

.hero-tilt__layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-style: preserve-3d;
  will-change: transform;
  pointer-events: none;
}

.hero-tilt__layer--content {
  pointer-events: auto; /* allow clicks on CTA */
  z-index: 3;
}

/* Scale compensation: scale = perspective / (perspective - translateZ)
   perspective = 1200
   bg: translateZ(-80) => scale = 1200/1280 = 0.9375 => compensate with scale(1.0667)
   mid: translateZ(-40) => 1200/1240 = 0.9677 => scale(1.0333)
   fg: translateZ(30) => 1200/1170 = 1.0256 => scale(0.975)
*/
.hero-tilt__layer--bg {
  transform: translateZ(-80px) scale(1.0667);
}
.hero-tilt__layer--bg img {
  width: 110%; /* overflow to cover edges during tilt */
  height: 110%;
  object-fit: cover;
}

.hero-tilt__layer--mid {
  transform: translateZ(-40px) scale(1.0333);
}

.hero-tilt__layer--content {
  transform: translateZ(0px);
}

.hero-tilt__layer--fg {
  transform: translateZ(30px) scale(0.975);
  z-index: 4;
}

.hero-tilt__glare {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  background: radial-gradient(
    ellipse at 50% 50%,
    rgba(255, 255, 255, 0.15) 0%,
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  transform: translateZ(40px);
  mix-blend-mode: overlay;
}

/* Typography */
.hero-tilt__headline {
  font-size: clamp(2.5rem, 6vw, 5rem);
  font-weight: 700;
  line-height: 1.05;
  color: #fff;
  text-align: center;
  max-width: 14ch;
}

.hero-tilt__sub {
  font-size: clamp(1rem, 1.5vw, 1.25rem);
  color: rgba(255, 255, 255, 0.7);
  margin-top: 1rem;
  text-align: center;
}

.hero-tilt__cta {
  display: inline-block;
  margin-top: 2rem;
  padding: 0.875rem 2rem;
  background: #fff;
  color: #0a0a0a;
  font-weight: 600;
  font-size: 1rem;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hero-tilt__cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

/* Reduced motion: everything flat */
@media (prefers-reduced-motion: reduce) {
  .hero-tilt {
    perspective: none;
  }
  .hero-tilt__layer {
    transform: none !important;
    will-change: auto;
  }
  .hero-tilt__glare {
    display: none;
  }
}

/* Mobile: simpler, no perspective until gyro kicks in */
@media (max-width: 767px) {
  .hero-tilt {
    height: 100svh;
  }
  .hero-tilt__layer--bg img {
    width: 120%;
    height: 120%;
  }
}
```

### Phase 3: Pointer tracking with lerp

```js
function initHeroTilt(container) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches) return;

  const layers = container.querySelectorAll('.hero-tilt__layer');
  const glare = container.querySelector('.hero-tilt__glare');

  // Depth config per layer class suffix
  const depthMap = {
    'bg': { z: -80, maxRotate: 2 },
    'mid': { z: -40, maxRotate: 4 },
    'content': { z: 0, maxRotate: 6 },
    'fg': { z: 30, maxRotate: 8 },
  };

  const PERSPECTIVE = 1200;
  const LERP_SPEED = 0.08;     // lower = smoother, heavier feel
  const RESET_LERP = 0.04;     // slower return to neutral

  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;
  let isHovering = false;
  let rafId = 0;

  function getLayerSuffix(el) {
    const classes = el.className;
    for (const key of Object.keys(depthMap)) {
      if (classes.includes(`--${key}`)) return key;
    }
    return null;
  }

  function onPointerMove(e) {
    const rect = container.getBoundingClientRect();
    // Normalize to -1..1 from center
    targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    isHovering = true;

    // Move glare gradient center
    if (glare) {
      const gx = ((e.clientX - rect.left) / rect.width) * 100;
      const gy = ((e.clientY - rect.top) / rect.height) * 100;
      glare.style.background = `radial-gradient(ellipse at ${gx}% ${gy}%, rgba(255,255,255,0.18) 0%, transparent 65%)`;
      glare.style.opacity = '1';
    }
  }

  function onPointerLeave() {
    isHovering = false;
    targetX = 0;
    targetY = 0;
    if (glare) glare.style.opacity = '0';
  }

  function loop() {
    const speed = isHovering ? LERP_SPEED : RESET_LERP;
    currentX += (targetX - currentX) * speed;
    currentY += (targetY - currentY) * speed;

    // Snap to zero when close enough
    if (!isHovering && Math.abs(currentX) < 0.001 && Math.abs(currentY) < 0.001) {
      currentX = 0;
      currentY = 0;
    }

    layers.forEach(layer => {
      const suffix = getLayerSuffix(layer);
      if (!suffix) return;
      const config = depthMap[suffix];
      const rotateY = currentX * config.maxRotate;
      const rotateX = -currentY * config.maxRotate;
      const scale = PERSPECTIVE / (PERSPECTIVE - config.z);
      const compensate = 1 / scale;
      layer.style.transform =
        `translateZ(${config.z}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(${compensate})`;
    });

    rafId = requestAnimationFrame(loop);
  }

  container.addEventListener('pointermove', onPointerMove, { passive: true });
  container.addEventListener('pointerleave', onPointerLeave);
  rafId = requestAnimationFrame(loop);

  // Cleanup function
  return function destroy() {
    cancelAnimationFrame(rafId);
    container.removeEventListener('pointermove', onPointerMove);
    container.removeEventListener('pointerleave', onPointerLeave);
  };
}

// Init
const hero = document.querySelector('.hero-tilt');
if (hero) initHeroTilt(hero);
```

### Phase 4: Gyroscope fallback for mobile

```js
function initGyroscope(container, depthMap, PERSPECTIVE) {
  if (!('DeviceOrientationEvent' in window)) return null;

  const layers = container.querySelectorAll('.hero-tilt__layer');
  const MAX_ANGLE = 30; // clamp device tilt

  let currentX = 0, currentY = 0;
  let targetX = 0, targetY = 0;
  let rafId = 0;

  // iOS 13+ requires permission
  async function requestPermission() {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        return response === 'granted';
      } catch {
        return false;
      }
    }
    return true; // Android, no permission needed
  }

  function onOrientation(e) {
    const beta = e.beta ?? 0;   // front-back tilt, -180..180
    const gamma = e.gamma ?? 0; // left-right tilt, -90..90
    targetX = Math.max(-1, Math.min(1, gamma / MAX_ANGLE));
    targetY = Math.max(-1, Math.min(1, (beta - 45) / MAX_ANGLE)); // offset for hand-held angle
  }

  function loop() {
    currentX += (targetX - currentX) * 0.06;
    currentY += (targetY - currentY) * 0.06;

    layers.forEach(layer => {
      const classes = layer.className;
      let suffix = null;
      for (const key of Object.keys(depthMap)) {
        if (classes.includes(`--${key}`)) { suffix = key; break; }
      }
      if (!suffix) return;
      const config = depthMap[suffix];
      const rotateY = currentX * config.maxRotate;
      const rotateX = -currentY * config.maxRotate;
      layer.style.transform =
        `translateZ(${config.z}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    rafId = requestAnimationFrame(loop);
  }

  requestPermission().then(granted => {
    if (!granted) return;
    window.addEventListener('deviceorientation', onOrientation, { passive: true });
    rafId = requestAnimationFrame(loop);
  });

  return function destroy() {
    cancelAnimationFrame(rafId);
    window.removeEventListener('deviceorientation', onOrientation);
  };
}
```

### Phase 5: React/Next.js component

```tsx
'use client';

import { useRef, useEffect, useCallback } from 'react';

interface LayerConfig {
  z: number;
  maxRotate: number;
}

interface HeroTiltProps {
  layers: Array<{
    key: string;
    content: React.ReactNode;
    depth: LayerConfig;
    className?: string;
    decorative?: boolean;
  }>;
  perspective?: number;
  lerpSpeed?: number;
  className?: string;
  children?: React.ReactNode; // glare slot
}

export function HeroTilt({
  layers,
  perspective = 1200,
  lerpSpeed = 0.08,
  className,
}: HeroTiltProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const stateRef = useRef({
    targetX: 0, targetY: 0,
    currentX: 0, currentY: 0,
    hovering: false,
    rafId: 0,
  });

  const setLayerRef = useCallback((key: string) => (el: HTMLDivElement | null) => {
    if (el) layerRefs.current.set(key, el);
    else layerRefs.current.delete(key);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const s = stateRef.current;

    function onMove(e: PointerEvent) {
      const rect = container!.getBoundingClientRect();
      s.targetX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      s.targetY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      s.hovering = true;
    }

    function onLeave() {
      s.hovering = false;
      s.targetX = 0;
      s.targetY = 0;
    }

    function tick() {
      const speed = s.hovering ? lerpSpeed : lerpSpeed * 0.5;
      s.currentX += (s.targetX - s.currentX) * speed;
      s.currentY += (s.targetY - s.currentY) * speed;

      layers.forEach(layer => {
        const el = layerRefs.current.get(layer.key);
        if (!el) return;
        const { z, maxRotate } = layer.depth;
        const ry = s.currentX * maxRotate;
        const rx = -s.currentY * maxRotate;
        const comp = perspective / (perspective - z);
        el.style.transform =
          `translateZ(${z}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${1 / comp})`;
      });

      s.rafId = requestAnimationFrame(tick);
    }

    container.addEventListener('pointermove', onMove, { passive: true });
    container.addEventListener('pointerleave', onLeave);
    s.rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(s.rafId);
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerleave', onLeave);
    };
  }, [layers, perspective, lerpSpeed]);

  return (
    <section
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100svh',
        overflow: 'hidden',
        perspective: `${perspective}px`,
        perspectiveOrigin: '50% 50%',
        transformStyle: 'preserve-3d',
      }}
    >
      {layers.map(layer => (
        <div
          key={layer.key}
          ref={setLayerRef(layer.key)}
          className={layer.className}
          aria-hidden={layer.decorative ? true : undefined}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transformStyle: 'preserve-3d',
            willChange: 'transform',
            pointerEvents: layer.decorative ? 'none' : 'auto',
          }}
        >
          {layer.content}
        </div>
      ))}
    </section>
  );
}
```

### Phase 6: Entrance animation

Layer the tilt system on top of a GSAP entrance so the hero does not start dead-still. See primitives `gsap-core-timelines` for timeline API and `stagger-orchestration` for stagger math.

```js
import gsap from 'gsap';

function entranceAnimation(container) {
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  const layers = container.querySelectorAll('.hero-tilt__layer');

  tl.set(layers, { opacity: 0, y: 40 });
  tl.to(layers, {
    opacity: 1,
    y: 0,
    duration: 1,
    stagger: { amount: 0.4, from: 'end' }, // foreground first
  });
  tl.from('.hero-tilt__headline', {
    clipPath: 'inset(100% 0 0 0)',
    duration: 0.8,
  }, '-=0.6');
  tl.from('.hero-tilt__sub', { opacity: 0, y: 20, duration: 0.5 }, '-=0.3');
  tl.from('.hero-tilt__cta', { opacity: 0, y: 20, duration: 0.4 }, '-=0.2');

  return tl;
}
```

### Phase 7: Shadow depth enhancement

Add drop shadows that shift with the tilt to reinforce the floating effect.

```css
.hero-tilt__layer--mid img,
.hero-tilt__layer--fg img {
  filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.4));
  transition: filter 0.3s ease;
}

/* Dynamically update shadow offset from JS */
```

```js
// Inside the rAF loop, after setting transform:
if (suffix === 'mid' || suffix === 'fg') {
  const shadowX = currentX * 10;
  const shadowY = currentY * 10;
  const img = layer.querySelector('img');
  if (img) {
    img.style.filter =
      `drop-shadow(${shadowX}px ${shadowY}px 30px rgba(0,0,0,0.4))`;
  }
}
```

## The full reference implementation

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tilt Depth Hero</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0a0a0a; }

    .hero-tilt {
      position: relative;
      width: 100%;
      height: 100svh;
      overflow: hidden;
      perspective: 1200px;
      perspective-origin: 50% 50%;
      transform-style: preserve-3d;
      background: #0a0a0a;
    }

    .hero-tilt__layer {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      transform-style: preserve-3d;
      will-change: transform;
      pointer-events: none;
    }
    .hero-tilt__layer--content { pointer-events: auto; z-index: 3; flex-direction: column; }
    .hero-tilt__layer--bg { transform: translateZ(-80px) scale(1.0667); }
    .hero-tilt__layer--bg img { width: 110%; height: 110%; object-fit: cover; }
    .hero-tilt__layer--mid { transform: translateZ(-40px) scale(1.0333); z-index: 2; }
    .hero-tilt__layer--fg { transform: translateZ(30px) scale(0.975); z-index: 4; }
    .hero-tilt__layer--mid img,
    .hero-tilt__layer--fg img { filter: drop-shadow(0 10px 30px rgba(0,0,0,0.4)); }

    .hero-tilt__glare {
      position: absolute; inset: 0; z-index: 5; pointer-events: none;
      opacity: 0; mix-blend-mode: overlay; transition: opacity 0.3s ease;
      transform: translateZ(40px);
    }

    .hero-tilt__headline {
      font-size: clamp(2.5rem, 6vw, 5rem); font-weight: 700;
      line-height: 1.05; color: #fff; text-align: center; max-width: 14ch;
    }
    .hero-tilt__sub {
      font-size: clamp(1rem, 1.5vw, 1.25rem);
      color: rgba(255,255,255,0.7); margin-top: 1rem; text-align: center;
    }
    .hero-tilt__cta {
      display: inline-block; margin-top: 2rem; padding: 0.875rem 2rem;
      background: #fff; color: #0a0a0a; font-weight: 600; font-size: 1rem;
      text-decoration: none; transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .hero-tilt__cta:hover {
      transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }

    @media (prefers-reduced-motion: reduce) {
      .hero-tilt { perspective: none; }
      .hero-tilt__layer { transform: none !important; will-change: auto; }
      .hero-tilt__glare { display: none; }
    }
  </style>
</head>
<body>
  <section class="hero-tilt" aria-label="Product hero">
    <div class="hero-tilt__layer hero-tilt__layer--bg">
      <img src="bg.webp" alt="" role="presentation" width="1920" height="1080" loading="eager" fetchpriority="high">
    </div>
    <div class="hero-tilt__layer hero-tilt__layer--mid">
      <img src="device.webp" alt="Product screenshot" width="800" height="600" loading="eager">
    </div>
    <div class="hero-tilt__layer hero-tilt__layer--content">
      <h1 class="hero-tilt__headline">Ship faster with confidence</h1>
      <p class="hero-tilt__sub">The deployment platform teams actually trust.</p>
      <a href="/start" class="hero-tilt__cta">Get started</a>
    </div>
    <div class="hero-tilt__layer hero-tilt__layer--fg" aria-hidden="true">
      <img src="float.webp" alt="" role="presentation" width="300" height="200" loading="eager">
    </div>
    <div class="hero-tilt__glare" aria-hidden="true"></div>
  </section>

  <script>
  (function() {
    const hero = document.querySelector('.hero-tilt');
    if (!hero || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const layers = hero.querySelectorAll('.hero-tilt__layer');
    const glare = hero.querySelector('.hero-tilt__glare');
    const P = 1200;
    const depth = { bg: { z: -80, r: 2 }, mid: { z: -40, r: 4 }, content: { z: 0, r: 6 }, fg: { z: 30, r: 8 } };
    let tx = 0, ty = 0, cx = 0, cy = 0, hover = false;

    function suffix(el) {
      for (const k of Object.keys(depth)) if (el.className.includes('--' + k)) return k;
      return null;
    }

    hero.addEventListener('pointermove', function(e) {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      hover = true;
      if (glare) {
        glare.style.background = 'radial-gradient(ellipse at ' +
          ((e.clientX - r.left) / r.width * 100) + '% ' +
          ((e.clientY - r.top) / r.height * 100) + '%, rgba(255,255,255,0.18) 0%, transparent 65%)';
        glare.style.opacity = '1';
      }
    }, { passive: true });

    hero.addEventListener('pointerleave', function() {
      hover = false; tx = 0; ty = 0;
      if (glare) glare.style.opacity = '0';
    });

    (function tick() {
      var spd = hover ? 0.08 : 0.04;
      cx += (tx - cx) * spd;
      cy += (ty - cy) * spd;
      if (!hover && Math.abs(cx) < 0.001 && Math.abs(cy) < 0.001) { cx = 0; cy = 0; }

      layers.forEach(function(l) {
        var s = suffix(l);
        if (!s) return;
        var d = depth[s];
        var ry = cx * d.r, rx = -cy * d.r;
        var comp = 1 / (P / (P - d.z));
        l.style.transform = 'translateZ(' + d.z + 'px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) scale(' + comp + ')';
      });

      requestAnimationFrame(tick);
    })();
  })();
  </script>
</body>
</html>
```

## Tuning the feel

| Parameter | Value | Why |
|-----------|-------|-----|
| `perspective` | 1200px | High enough to avoid extreme foreshortening. Lower (800) for more dramatic tilt; higher (1600) for subtlety. |
| `lerpSpeed` | 0.08 | Heavier than 1:1 tracking. 0.04 feels sluggish/underwater. 0.12 feels twitchy. 0.08 is the sweet spot for "weighted but responsive." |
| `resetLerp` | 0.04 | Slower return to neutral. The drift-back should feel like the object settling, not snapping. |
| `maxRotate bg` | 2 deg | Background barely moves. If it rotates as much as foreground, the depth illusion collapses. |
| `maxRotate content` | 6 deg | Text layer tracks reasonably but does not become unreadable. Beyond 8 deg text distorts. |
| `maxRotate fg` | 8 deg | Foreground rotates the most, selling the "closer" depth. |
| `translateZ range` | -80 to +30 | Keep within ~10% of perspective value. Layers approaching `perspective` distance will clip or invert. |
| `scale compensation` | `P / (P - z)` | Without this, distant layers shrink and near layers grow, breaking the composition. |
| `glare gradient size` | 65% transparent edge | Tighter (50%) looks like a flashlight. Wider (80%) is too diffuse to notice. |
| `bg overflow` | 110% | Covers the gaps that appear at edges when the background tilts. 100% shows black edges. 120% wastes memory. |

## Variants

**1. Glass card tilt hero**: Replace the full layered scene with a single frosted glass card over a gradient background. The card gets Vanilla-Tilt.js with `glare: true, max: 15, perspective: 800`. No depth layers needed.

**2. Product photography diorama**: 5+ layers cut from product photography (shadow layer, surface, product, reflection, sparkle). Each layer is a transparent PNG. The background is a solid gradient, not a photo. Shadow layer at z: -100 with blur.

**3. Interactive dashboard preview**: The content layer holds a live UI mockup. The background is an abstract gradient. Foreground floats are code snippets or metric badges. Tilt reveals the "screen" at angle, selling the depth of the interface.

**4. Split-screen reveal**: Left half tilts one direction, right half tilts opposite. Each half is its own perspective container. Creates a "book opening" feel on hover.

**5. Scroll-to-flatten**: As the user scrolls past the hero, lerp `maxRotate` values toward 0 and `perspective` toward `none`, flattening the scene. Uses `ScrollTrigger` scrub. See primitives `gsap-scrolltrigger`.

## Performance budget

| Metric | Target | Lever |
|--------|--------|-------|
| Frame time | < 8ms (120fps capable) | The entire loop is style writes on 4-5 elements. No layout thrash. |
| LCP | < 2.5s | Background image: AVIF/WebP, < 200 KB, `fetchpriority="high"`. |
| CLS | 0 | Explicit `width`/`height` on all images. No JS layout. |
| JS bundle | 0 KB (inline) or < 2 KB if extracted | No library needed. |
| GPU layers | 5-6 promoted layers | One per `will-change: transform` element. Acceptable. Beyond 10 layers, remove `will-change` from static layers. |
| Total image weight | < 500 KB | AVIF bg < 150 KB, WebP mid < 150 KB, WebP fg < 100 KB, rest < 100 KB. |

Cut first when over budget: Remove the glare layer (saves one GPU layer, one gradient computation). Reduce to 3 layers (bg, content, fg). Remove drop-shadow animation (filter recalculation per frame).

## Accessibility

**prefers-reduced-motion**: All rotation, glare, and parallax movement is disabled. The hero shows as a flat composite. CSS handles this with `perspective: none` and `transform: none !important`. JS checks `matchMedia` before attaching any listeners.

**Focus management**: The CTA link is keyboard-focusable. The content layer has `pointer-events: auto`. All decorative layers have `pointer-events: none` and `aria-hidden="true"`.

**Semantics**: The section has an `aria-label`. The headline is an `h1`. Decorative images have `alt=""` and `role="presentation"`.

**What this costs users without motion**: They see a perfectly composed static hero. The depth effect is a nice-to-have, not a content requirement. No content is hidden behind the interaction.

## Anti-slop rules

1. DO NOT use `mousemove`. Use `pointermove`. It covers mouse, pen, and touch in one listener.
2. DO NOT apply transforms without scale compensation. Layers will visibly shrink or grow as they move in z-space.
3. DO NOT animate `top`, `left`, `margin`, or `width` for the parallax. Transform only. Anything else triggers layout.
4. DO NOT set `will-change: transform` on more than 8 elements. Each promoted layer costs GPU memory.
5. DO NOT use `transition` on the transform property for the tilt. The rAF lerp IS the easing. A CSS transition on top creates a doubled, mushy interpolation.
6. DO NOT skip the `pointerleave` handler. Without it the hero freezes at the last pointer position and never returns to neutral.
7. DO NOT use 1:1 pointer tracking (no lerp). It feels jittery and cheap. The weight is the entire design.
8. DO NOT place the perspective on each layer individually. The perspective goes on the CONTAINER. Individual perspective creates independent vanishing points and breaks the unified scene.
9. DO NOT forget `overflow: hidden` on the container. Tilted layers at the edges will poke out.
10. DO NOT put body text inside a tilting layer deeper than `maxRotate: 6`. Beyond that, text distorts enough to hurt readability.

## Integration notes

Composes with primitives `gsap-core-timelines` and `stagger-orchestration` for entrance animation. Composes with `gsap-scrolltrigger` for the scroll-to-flatten variant.

Conflicts: If the page also uses `parallax-depth-systems` on the hero section, the two scroll/pointer handlers will fight. Use one or the other, never both on the same container.

Conflicts: Vanilla-Tilt.js applied to the same container will fight the custom pointer handler. Pick one approach.

## Ship checklist

- [ ] Hero renders as a flat, complete composition with JS disabled
- [ ] Scale compensation formula matches the perspective value and each layer's translateZ
- [ ] Lerp speed feels weighted, not 1:1 and not sluggish
- [ ] Glare tracks pointer position and fades on leave
- [ ] `pointerleave` returns all layers to neutral rotation
- [ ] prefers-reduced-motion disables all movement and hides glare
- [ ] All decorative layers have `aria-hidden="true"` and `pointer-events: none`
- [ ] CTA is keyboard-focusable and clickable through the layer stack
- [ ] Background image is AVIF/WebP, < 200 KB, has `fetchpriority="high"`
- [ ] All images have explicit `width` and `height` attributes (CLS = 0)
- [ ] No more than 6 GPU-promoted layers
- [ ] DeviceOrientation fallback works on iOS Safari (permission request)
- [ ] Frame time < 8ms measured in DevTools Performance panel at 4x CPU throttle
- [ ] `overflow: hidden` on container prevents tilt bleed
