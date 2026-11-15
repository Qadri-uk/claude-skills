# Wipe Patterns Reference

Detailed implementations for reveal and wipe animations.

## CSS Clip-Path Wipes

### Inset Syntax

```css
clip-path: inset(top right bottom left);
```

**Directional Wipes:**

```css
/* Left to right */
.wipe-ltr {
  clip-path: inset(0 100% 0 0); /* Start */
  clip-path: inset(0 0 0 0);    /* End */
}

/* Right to left */
.wipe-rtl {
  clip-path: inset(0 0 0 100%); /* Start */
  clip-path: inset(0 0 0 0);    /* End */
}

/* Top to bottom */
.wipe-ttb {
  clip-path: inset(0 0 100% 0); /* Start */
  clip-path: inset(0 0 0 0);    /* End */
}

/* Bottom to top */
.wipe-btt {
  clip-path: inset(100% 0 0 0); /* Start */
  clip-path: inset(0 0 0 0);    /* End */
}
```

### Center Wipes

```css
/* Horizontal center out */
.wipe-center-h {
  clip-path: inset(0 50% 0 50%); /* Start: collapsed to center */
  clip-path: inset(0 0 0 0);     /* End: fully expanded */
}

/* Vertical center out */
.wipe-center-v {
  clip-path: inset(50% 0 50% 0); /* Start */
  clip-path: inset(0 0 0 0);     /* End */
}

/* Both axes (box from center) */
.wipe-center-box {
  clip-path: inset(50% 50% 50% 50%); /* Start */
  clip-path: inset(0 0 0 0);         /* End */
}
```

### Corner Wipes

```css
/* From top-left corner */
.wipe-corner-tl {
  clip-path: polygon(0 0, 0 0, 0 0);
  clip-path: polygon(0 0, 200% 0, 0 200%);
}

/* From bottom-right corner */
.wipe-corner-br {
  clip-path: polygon(100% 100%, 100% 100%, 100% 100%);
  clip-path: polygon(-100% 100%, 100% -100%, 100% 100%);
}
```

## Circle/Radial Wipes

### Basic Iris

```css
/* Center iris */
.iris-center {
  clip-path: circle(0% at 50% 50%);   /* Start */
  clip-path: circle(150% at 50% 50%); /* End - 150% covers corners */
}

/* Custom position iris */
.iris-custom {
  --cx: 25%;
  --cy: 75%;
  clip-path: circle(0% at var(--cx) var(--cy));
  clip-path: circle(200% at var(--cx) var(--cy));
}
```

### Ellipse Iris

```css
.iris-ellipse {
  clip-path: ellipse(0% 0% at 50% 50%);
  clip-path: ellipse(100% 100% at 50% 50%);
}

/* Horizontal stretch */
.iris-ellipse-h {
  clip-path: ellipse(0% 0% at 50% 50%);
  clip-path: ellipse(150% 100% at 50% 50%);
}
```

## Polygon Wipes

### Diamond Wipe

```css
.wipe-diamond {
  clip-path: polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%);
  clip-path: polygon(50% -50%, 150% 50%, 50% 150%, -50% 50%);
}
```

### Star Wipe

```javascript
function createStarPath(points, innerRadius, outerRadius, progress) {
  const cx = 50, cy = 50;
  const angleStep = Math.PI / points;
  let path = [];

  for (let i = 0; i < points * 2; i++) {
    const angle = i * angleStep - Math.PI / 2;
    const radius = (i % 2 === 0 ? outerRadius : innerRadius) * progress;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    path.push(`${x}% ${y}%`);
  }

  return `polygon(${path.join(', ')})`;
}
```

### Heart Wipe

```css
.wipe-heart {
  /* Complex path - use SVG clipPath for best results */
  clip-path: url(#heart-clip);
}
```

```html
<svg>
  <defs>
    <clipPath id="heart-clip">
      <path d="M50,90 C20,60 0,40 0,20 A20,20 0 0,1 50,20 A20,20 0 0,1 100,20 C100,40 80,60 50,90 Z"
            transform="scale(0)" class="heart-path" />
    </clipPath>
  </defs>
</svg>
```

## Gradient Mask Wipes

### Soft Edge Linear Wipe

```css
.soft-wipe {
  --reveal: 0%;
  --softness: 50px; /* Edge gradient width */

  mask-image: linear-gradient(
    to right,
    black 0%,
    black calc(var(--reveal) - var(--softness)),
    transparent var(--reveal)
  );
}
```

### Animated Gradient Mask

```javascript
// GSAP for smooth mask animation
gsap.to(element, {
  "--reveal": "120%",
  duration: 0.6,
  ease: "power2.out"
});
```

## Multi-Element Patterns

### Venetian Blinds (Horizontal)

```css
.venetian-h {
  --strips: 10;
  --strip-width: calc(100% / var(--strips));
  --progress: 0;

  mask-image: repeating-linear-gradient(
    to bottom,
    black 0,
    black calc(var(--strip-width) * var(--progress)),
    transparent calc(var(--strip-width) * var(--progress)),
    transparent var(--strip-width)
  );
}
```

### Venetian Blinds (Vertical)

```css
.venetian-v {
  --strips: 10;
  --strip-width: calc(100% / var(--strips));
  --progress: 0;

  mask-image: repeating-linear-gradient(
    to right,
    black 0,
    black calc(var(--strip-width) * var(--progress)),
    transparent calc(var(--strip-width) * var(--progress)),
    transparent var(--strip-width)
  );
}
```

### Checkerboard

```css
.checkerboard-reveal {
  --size: 50px;
  --progress: 0;

  mask-image:
    repeating-conic-gradient(
      from 0deg at calc(var(--progress) * 100%) calc(var(--progress) * 100%),
      black 0deg 90deg,
      transparent 90deg 180deg
    );
  mask-size: var(--size) var(--size);
}
```

### Staggered Grid Reveal

```javascript
// Create grid of reveal elements
function createGridReveal(container, rows, cols, duration, stagger) {
  const cells = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.style.cssText = `
        position: absolute;
        left: ${c * (100 / cols)}%;
        top: ${r * (100 / rows)}%;
        width: ${100 / cols}%;
        height: ${100 / rows}%;
        background: inherit;
        clip-path: inset(0 100% 0 0);
      `;
      container.appendChild(cell);
      cells.push(cell);
    }
  }

  // Animate with stagger
  gsap.to(cells, {
    clipPath: "inset(0 0% 0 0)",
    duration: duration,
    stagger: {
      each: stagger,
      from: "random" // or "center", "edges", "start", "end"
    },
    ease: "power2.out"
  });
}
```

## Clock Wipe Techniques

### CSS Conic Gradient

```css
.clock-wipe {
  --progress: 0;

  mask-image: conic-gradient(
    from -90deg at 50% 50%,
    black calc(var(--progress) * 360deg),
    transparent calc(var(--progress) * 360deg)
  );
}

/* Counter-clockwise */
.clock-wipe-ccw {
  mask-image: conic-gradient(
    from -90deg at 50% 50%,
    transparent calc((1 - var(--progress)) * 360deg),
    black calc((1 - var(--progress)) * 360deg)
  );
}
```

### SVG Arc Path

For more precise control:

```javascript
function createArcPath(progress, radius = 50) {
  const endAngle = progress * 360 - 90;
  const startAngle = -90;

  const startX = 50 + radius * Math.cos(startAngle * Math.PI / 180);
  const startY = 50 + radius * Math.sin(startAngle * Math.PI / 180);
  const endX = 50 + radius * Math.cos(endAngle * Math.PI / 180);
  const endY = 50 + radius * Math.sin(endAngle * Math.PI / 180);

  const largeArc = progress > 0.5 ? 1 : 0;

  return `M50,50 L${startX},${startY} A${radius},${radius} 0 ${largeArc} 1 ${endX},${endY} Z`;
}
```

## Draw-On/Write-On Effects

### SVG Stroke Animation

```javascript
function setupDrawOn(svgElement) {
  const paths = svgElement.querySelectorAll('path, line, polyline, polygon, circle, rect');

  paths.forEach(path => {
    const length = path.getTotalLength();
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;
  });
}

function animateDrawOn(svgElement, duration) {
  const paths = svgElement.querySelectorAll('path, line, polyline, polygon, circle, rect');

  gsap.to(paths, {
    strokeDashoffset: 0,
    duration: duration,
    stagger: 0.1,
    ease: "power2.out"
  });
}
```

### Variable Speed Drawing

```javascript
// Draw at consistent visual speed regardless of path length
function drawAtSpeed(path, pixelsPerSecond) {
  const length = path.getTotalLength();
  const duration = length / pixelsPerSecond;

  gsap.to(path, {
    strokeDashoffset: 0,
    duration: duration,
    ease: "none"
  });
}
```

## Transition Combinations

### Wipe + Fade

```css
.wipe-fade {
  opacity: 0;
  clip-path: inset(0 100% 0 0);
  animation: wipeFade 400ms ease-out forwards;
}

@keyframes wipeFade {
  50% {
    opacity: 1;
    clip-path: inset(0 50% 0 0);
  }
  100% {
    opacity: 1;
    clip-path: inset(0 0 0 0);
  }
}
```

### Wipe + Scale

```css
.wipe-scale {
  transform: scale(0.9);
  clip-path: inset(0 100% 0 0);
  animation: wipeScale 500ms ease-out forwards;
}

@keyframes wipeScale {
  to {
    transform: scale(1);
    clip-path: inset(0 0 0 0);
  }
}
```

## Performance Tips

1. **Use `will-change: clip-path`** before animation
2. **Prefer `clip-path` over `mask-image`** for simple shapes
3. **Limit gradient complexity** in masks
4. **Use CSS variables** for animatable values
5. **Consider canvas** for complex dissolve effects
6. **Test on low-end devices** — masks can be expensive

```css
/* Performance optimization */
.wipe-element {
  will-change: clip-path;
  contain: layout paint;
}

.wipe-element.animation-complete {
  will-change: auto;
}
```
