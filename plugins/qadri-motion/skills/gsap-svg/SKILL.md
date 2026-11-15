---
name: gsap-svg
description: Create SVG animations with DrawSVG, MorphSVG, and MotionPath
version: 1.0.0
argument-hint: "[SVG animation description]"
allowed-tools: Read Write Edit Bash Grep Glob
---

# GSAP SVG Animation Generator

Create advanced SVG animations using GSAP plugins.

## Plugin Setup

```javascript
import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin);
```

## DrawSVG

### Basic Drawing
```javascript
// Draw path from 0 to 100%
gsap.from("path", {
  drawSVG: 0,
  duration: 2,
  ease: "power2.inOut"
});

// Draw from specific percentage
gsap.to("path", {
  drawSVG: "50% 100%",  // Draw middle to end
  duration: 2
});
```

### DrawSVG Values
| Value | Effect |
|-------|--------|
| `0` | Nothing visible |
| `"100%"` | Full path visible |
| `"0% 50%"` | First half visible |
| `"50% 100%"` | Second half visible |
| `"25% 75%"` | Middle portion visible |
| `true` | Animate to current state |

### Line Drawing Effect
```javascript
// Prepare SVG
gsap.set("path", { drawSVG: 0 });

// Animate drawing
gsap.to("path", {
  drawSVG: "100%",
  duration: 2,
  ease: "none"
});
```

### Multiple Paths Staggered
```javascript
gsap.from("path", {
  drawSVG: 0,
  duration: 1,
  stagger: 0.2,
  ease: "power2.inOut"
});
```

### Draw and Undraw
```javascript
const tl = gsap.timeline({ repeat: -1 });

tl.fromTo("path",
  { drawSVG: "0% 0%" },
  { drawSVG: "0% 100%", duration: 1 }
)
.to("path", {
  drawSVG: "100% 100%",
  duration: 1
});
```

### Animated Position
```javascript
// Moving highlight along path
gsap.fromTo("path",
  { drawSVG: "0% 10%" },  // 10% length visible
  {
    drawSVG: "90% 100%",  // Moves along path
    duration: 2,
    repeat: -1,
    ease: "none"
  }
);
```

## MorphSVG

### Basic Morph
```javascript
gsap.to("#shape1", {
  morphSVG: "#shape2",
  duration: 1,
  ease: "power2.inOut"
});
```

### Morph Options
```javascript
gsap.to("#shape1", {
  morphSVG: {
    shape: "#shape2",
    type: "rotational",  // "linear" | "rotational"
    origin: "50% 50%",   // Transform origin for rotational
    shapeIndex: 0        // Starting point alignment
  },
  duration: 1
});
```

### Shape Index
```javascript
// Find best alignment
MorphSVGPlugin.convertToPath("#shape1, #shape2");
console.log(MorphSVGPlugin.findShapeIndex("#shape1", "#shape2"));

gsap.to("#shape1", {
  morphSVG: {
    shape: "#shape2",
    shapeIndex: 5  // Use value from findShapeIndex
  }
});
```

### Morph Sequence
```javascript
const shapes = ["#shape2", "#shape3", "#shape4", "#shape1"];
const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.5 });

shapes.forEach(shape => {
  tl.to("#shape1", {
    morphSVG: shape,
    duration: 1,
    ease: "power2.inOut"
  });
});
```

### Convert Elements to Paths
```javascript
// Convert circles, rects, etc. to paths for morphing
MorphSVGPlugin.convertToPath("circle, rect, ellipse, polygon");
```

## MotionPath

### Follow a Path
```javascript
gsap.to(".element", {
  motionPath: {
    path: "#myPath",
    align: "#myPath",
    alignOrigin: [0.5, 0.5],
    autoRotate: true
  },
  duration: 5,
  ease: "none"
});
```

### MotionPath Options
```javascript
gsap.to(".element", {
  motionPath: {
    path: "#path",         // Path to follow
    align: "#path",        // Align to path
    alignOrigin: [0.5, 0.5], // Element center
    autoRotate: true,      // Rotate along path
    autoRotate: 90,        // Offset rotation
    start: 0,              // Start position (0-1)
    end: 1,                // End position (0-1)
    offsetX: 0,            // X offset from path
    offsetY: 0             // Y offset from path
  }
});
```

### Path Data Animation
```javascript
// Animate using coordinates
gsap.to(".element", {
  motionPath: {
    path: [
      { x: 0, y: 0 },
      { x: 100, y: 50 },
      { x: 200, y: 0 },
      { x: 300, y: 100 }
    ],
    curviness: 1.5  // 0 = straight, 2 = very curved
  },
  duration: 3
});
```

### Circular Motion
```javascript
gsap.to(".element", {
  motionPath: {
    path: "M0,0 C100,-100 200,100 300,0",
    autoRotate: true
  },
  duration: 2,
  repeat: -1,
  ease: "none"
});
```

### Multiple Elements on Path
```javascript
const elements = gsap.utils.toArray(".item");

elements.forEach((el, i) => {
  gsap.to(el, {
    motionPath: {
      path: "#path",
      align: "#path",
      alignOrigin: [0.5, 0.5]
    },
    duration: 5,
    delay: i * 0.5,
    repeat: -1,
    ease: "none"
  });
});
```

## Basic SVG Animations

### Transform Animations
```javascript
// Scale
gsap.to("svg circle", {
  scale: 1.5,
  transformOrigin: "center center",
  duration: 1
});

// Rotation
gsap.to("svg g", {
  rotation: 360,
  transformOrigin: "center center",
  duration: 2,
  ease: "none",
  repeat: -1
});
```

### Attribute Animation
```javascript
gsap.to("circle", {
  attr: {
    r: 50,        // radius
    cx: 200,      // center x
    cy: 150       // center y
  },
  duration: 1
});

gsap.to("rect", {
  attr: {
    width: 200,
    height: 100,
    rx: 20        // rounded corners
  },
  duration: 1
});
```

### Stroke Animation
```javascript
gsap.from("path", {
  strokeDasharray: 1000,
  strokeDashoffset: 1000,
  duration: 2,
  ease: "power2.inOut"
});
```

### Fill and Stroke Color
```javascript
gsap.to("path", {
  fill: "#ff0000",
  stroke: "#0000ff",
  strokeWidth: 3,
  duration: 1
});
```

## Scroll-Triggered SVG

### Draw on Scroll
```javascript
gsap.from("path", {
  drawSVG: 0,
  scrollTrigger: {
    trigger: "svg",
    start: "top center",
    end: "bottom center",
    scrub: true
  }
});
```

### Progress Indicator
```javascript
gsap.to("#progress-path", {
  drawSVG: "100%",
  ease: "none",
  scrollTrigger: {
    trigger: "body",
    start: "top top",
    end: "bottom bottom",
    scrub: 0.5
  }
});
```

## Natural Language Mapping

| User Says | Implementation |
|-----------|---------------|
| "draw path" | `drawSVG: 0` to `100%` |
| "draw logo" | Staggered path drawing |
| "morph shape" | MorphSVG between shapes |
| "follow path" | MotionPath with autoRotate |
| "rotate icon" | `rotation: 360` with repeat |
| "pulse" | Scale animation with yoyo |
| "dash animation" | strokeDashoffset animation |

## Common Patterns

### Logo Draw Animation
```javascript
const paths = gsap.utils.toArray("#logo path");

gsap.set(paths, { drawSVG: 0 });

gsap.to(paths, {
  drawSVG: "100%",
  duration: 1,
  stagger: 0.15,
  ease: "power2.inOut"
});
```

### Icon Hover
```javascript
const icon = document.querySelector(".icon");
const paths = icon.querySelectorAll("path");

icon.addEventListener("mouseenter", () => {
  gsap.to(paths, {
    stroke: "#ff0000",
    drawSVG: "100%",
    duration: 0.3,
    stagger: 0.1
  });
});

icon.addEventListener("mouseleave", () => {
  gsap.to(paths, {
    stroke: "#000000",
    drawSVG: "100%",
    duration: 0.3
  });
});
```

### Loading Spinner
```javascript
gsap.to("#spinner", {
  rotation: 360,
  transformOrigin: "center center",
  duration: 1,
  repeat: -1,
  ease: "none"
});

gsap.fromTo("#spinner-path",
  { drawSVG: "0% 30%" },
  {
    drawSVG: "70% 100%",
    duration: 1,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  }
);
```

### Checkmark Animation
```javascript
const tl = gsap.timeline();

tl.to("#circle", {
    drawSVG: "100%",
    duration: 0.5
  })
  .to("#checkmark", {
    drawSVG: "100%",
    duration: 0.3
  });
```

## Performance Tips

1. **Use `will-change`** on animated SVG elements
2. **Simplify paths** - fewer points = better performance
3. **Use `transform`** instead of attribute animation when possible
4. **Set `vector-effect: non-scaling-stroke`** for consistent stroke width
5. **Limit DOM elements** - combine paths when possible
