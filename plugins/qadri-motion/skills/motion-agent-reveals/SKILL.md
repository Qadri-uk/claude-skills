---
name: motion-agent-reveals
description: Reveal animations using wipes, masks, and progressive disclosure. Use when implementing directional reveals, iris effects, curtain transitions, or draw-on animations. Provides wipe directions, edge softness, and reveal patterns for cinematic and UI transitions.
---

# Reveals

Progressive visibility effects using masks and wipes.

## Standards Reference

| Standard | Documentation |
|----------|---------------|
| W3C DTCG | designtokens.org |
| CSS Clip-Path | developer.mozilla.org/CSS/clip-path |
| SVG Masks | developer.mozilla.org/SVG/Element/mask |

## Quick Reference

Load from: `tokens/reveal.tokens.json`

### Directions

| Token | Description | Use |
|-------|-------------|-----|
| `left-to-right` | Reveal from left | Reading direction, forward |
| `right-to-left` | Reveal from right | Back navigation |
| `top-to-bottom` | Reveal from top | Waterfall, dropdown |
| `bottom-to-top` | Reveal from bottom | Rising, sheet |
| `center-out-radial` | Iris open | Focus reveal, spotlight |
| `clockwise` | Clock wipe | Timer, progress |

### Edge Softness

| Token | Value | Effect |
|-------|-------|--------|
| `hard` | 0px | Sharp, clean edge |
| `soft` | 8px | Gentle gradient |
| `medium` | 20px | Visible feathering |
| `wide` | 50px | Pronounced gradient |

## Selection Guide

```
What type of reveal?
│
├── LINEAR WIPE → Directional mask
│   ├── Horizontal → left-to-right, right-to-left
│   ├── Vertical → top-to-bottom, bottom-to-top
│   └── Edge: hard (UI) or soft (cinematic)
│
├── RADIAL → Center-based reveal
│   ├── Iris open → center-out-radial
│   ├── Spotlight → center-out + blur
│   └── Edges in → edges-in-*
│
├── CLOCK → Rotational wipe
│   ├── Progress indicator → clockwise
│   └── Countdown → counter-clockwise
│
├── PATTERN → Multi-element reveal
│   ├── Blinds → venetian-horizontal/vertical
│   ├── Grid → checkerboard
│   └── Dissolve → dissolve-random
│
└── DRAW-ON → Stroke reveal
    └── See stroke-width and speed tokens
```

## Patterns

### Linear Wipe (Left to Right)

Horizontal reveal using clip-path.

**CSS:**
```css
.wipe-ltr {
  clip-path: inset(0 100% 0 0); /* Start: hidden from right */
  animation: wipeLTR 400ms ease-out forwards;
}

@keyframes wipeLTR {
  to {
    clip-path: inset(0 0 0 0); /* End: fully visible */
  }
}

/* Reverse (right to left) */
.wipe-rtl {
  clip-path: inset(0 0 0 100%);
  animation: wipeRTL 400ms ease-out forwards;
}

@keyframes wipeRTL {
  to {
    clip-path: inset(0 0 0 0);
  }
}
```

**Framer Motion:**
```tsx
const wipeLTRVariants = {
  hidden: {
    clipPath: "inset(0 100% 0 0)"
  },
  visible: {
    clipPath: "inset(0 0% 0 0)",
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};
```

**GSAP:**
```javascript
gsap.fromTo(element,
  { clipPath: "inset(0 100% 0 0)" },
  {
    clipPath: "inset(0 0% 0 0)",
    duration: 0.4,
    ease: "power2.out"
  }
);
```

### Vertical Wipe (Top to Bottom)

Waterfall-style reveal.

**CSS:**
```css
.wipe-ttb {
  clip-path: inset(0 0 100% 0); /* Hidden from bottom */
  animation: wipeTTB 400ms ease-out forwards;
}

@keyframes wipeTTB {
  to {
    clip-path: inset(0 0 0% 0);
  }
}

/* Bottom to top */
.wipe-btt {
  clip-path: inset(100% 0 0 0);
  animation: wipeBTT 400ms ease-out forwards;
}

@keyframes wipeBTT {
  to {
    clip-path: inset(0% 0 0 0);
  }
}
```

### Iris/Radial Reveal

Circular reveal from center.

**CSS:**
```css
.iris-in {
  clip-path: circle(0% at 50% 50%);
  animation: irisOpen 500ms ease-out forwards;
}

@keyframes irisOpen {
  to {
    clip-path: circle(150% at 50% 50%); /* 150% ensures corners are covered */
  }
}

/* From specific point */
.iris-from-point {
  --cx: 50%;
  --cy: 50%;
  clip-path: circle(0% at var(--cx) var(--cy));
}
```

**Framer Motion:**
```tsx
const irisVariants = {
  hidden: {
    clipPath: "circle(0% at 50% 50%)"
  },
  visible: {
    clipPath: "circle(150% at 50% 50%)",
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};
```

**GSAP:**
```javascript
gsap.fromTo(element,
  { clipPath: "circle(0% at 50% 50%)" },
  {
    clipPath: "circle(150% at 50% 50%)",
    duration: 0.5,
    ease: "power2.out"
  }
);
```

### Clock Wipe

Rotational reveal like a clock hand.

**CSS (using conic-gradient mask):**
```css
.clock-wipe {
  --progress: 0;
  mask-image: conic-gradient(
    from 0deg at 50% 50%,
    black calc(var(--progress) * 360deg),
    transparent calc(var(--progress) * 360deg)
  );
  animation: clockWipe 1s linear forwards;
}

@keyframes clockWipe {
  to {
    --progress: 1;
  }
}
```

**GSAP:**
```javascript
// Using CSS variable animation
gsap.to(element, {
  "--progress": 1,
  duration: 1,
  ease: "none"
});
```

### Soft Edge Wipe

Gradient-edged reveal for cinematic effect.

**CSS:**
```css
.soft-wipe {
  mask-image: linear-gradient(
    to right,
    black 0%,
    black calc(var(--reveal) - 20px),
    transparent var(--reveal)
  );
  --reveal: 0%;
  animation: softWipe 600ms ease-out forwards;
}

@keyframes softWipe {
  to {
    --reveal: 120%; /* Extend past 100% for full reveal */
  }
}
```

### Venetian Blinds

Multi-strip reveal effect.

**CSS:**
```css
.blinds-reveal {
  --strips: 10;
  --strip-height: calc(100% / var(--strips));

  mask-image: repeating-linear-gradient(
    to bottom,
    black 0,
    black calc(var(--strip-height) * var(--progress)),
    transparent calc(var(--strip-height) * var(--progress)),
    transparent var(--strip-height)
  );
  mask-size: 100% var(--strip-height);
  --progress: 0;
  animation: blindsOpen 500ms ease-out forwards;
}

@keyframes blindsOpen {
  to {
    --progress: 1;
  }
}
```

**GSAP with Stagger:**
```javascript
// Create individual blind elements
const blinds = gsap.utils.toArray('.blind-strip');

gsap.from(blinds, {
  scaleY: 0,
  transformOrigin: "top",
  duration: 0.4,
  stagger: 0.05,
  ease: "power2.out"
});
```

### Draw-On Effect

SVG stroke reveal animation.

**CSS:**
```css
.draw-on path {
  stroke-dasharray: var(--path-length);
  stroke-dashoffset: var(--path-length);
  animation: draw 1s ease-out forwards;
}

@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}
```

**JavaScript (calculate path length):**
```javascript
const path = document.querySelector('.draw-on path');
const length = path.getTotalLength();
path.style.setProperty('--path-length', length);
```

**GSAP DrawSVG:**
```javascript
gsap.from('.draw-on path', {
  drawSVG: 0, // Requires DrawSVGPlugin
  duration: 1,
  ease: "power2.out"
});
```

### Dissolve/Dither

Random pixel reveal.

**CSS (using SVG filter):**
```html
<svg>
  <filter id="dissolve">
    <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" />
    <feDisplacementMap in="SourceGraphic" scale="0" />
  </filter>
</svg>
```

**Canvas-based dissolve:**
```javascript
function dissolveReveal(canvas, progress) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 3; i < data.length; i += 4) {
    // Alpha channel - show if random < progress
    data[i] = Math.random() < progress ? 255 : 0;
  }

  ctx.putImageData(imageData, 0, 0);
}
```

## Reveal Durations

| Context | Duration | Use |
|---------|----------|-----|
| UI element | 200-400ms | Responsive, snappy |
| Page transition | 400-600ms | Smooth but efficient |
| Cinematic | 800-2000ms | Dramatic, theatrical |

## Reduced Motion

For `prefers-reduced-motion: reduce`:

| Full Motion | Reduced Alternative |
|-------------|---------------------|
| Any wipe | Instant reveal or simple fade |
| Clock wipe | Static or instant |
| Venetian blinds | Simple fade |
| Draw-on | Instant stroke visibility |
| Dissolve | Simple fade |

**Implementation:**
```css
@media (prefers-reduced-motion: reduce) {
  .wipe-ltr,
  .iris-in,
  .clock-wipe,
  .blinds-reveal {
    animation: fadeIn 100ms ease-out forwards;
    clip-path: none;
    mask-image: none;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
}
```

## Cross-References

- See `opacity/` for fade alternatives
- See `transitions/` for page-level reveals
- See `entrance-patterns/` for combined reveal + motion
- See `blur/` for soft focus reveals
- See `lottie/` for complex mask animations

## References

- `references/wipe-patterns.md` — Detailed wipe implementations
