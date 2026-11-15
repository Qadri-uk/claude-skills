# SVG Animation Patterns

Ready-to-use SVG animation code snippets.

## Logo Animations

### Sequential Path Draw
```javascript
const paths = gsap.utils.toArray("#logo path");

gsap.set(paths, { drawSVG: 0 });

const tl = gsap.timeline();

paths.forEach((path, i) => {
  tl.to(path, {
    drawSVG: "100%",
    duration: 0.8,
    ease: "power2.inOut"
  }, i * 0.1);
});
```

### Simultaneous Draw with Fill
```javascript
const paths = gsap.utils.toArray("#logo path");

gsap.set(paths, { drawSVG: 0, fill: "transparent" });

const tl = gsap.timeline();

tl.to(paths, {
    drawSVG: "100%",
    duration: 1,
    stagger: 0.1,
    ease: "power2.inOut"
  })
  .to(paths, {
    fill: "#000000",
    duration: 0.5
  }, "-=0.3");
```

### Logo Reveal with Mask
```javascript
gsap.from("#mask-rect", {
  attr: { width: 0 },
  duration: 1.5,
  ease: "power3.inOut"
});
```

## Icon Animations

### Hamburger to X
```javascript
const tl = gsap.timeline({ paused: true });

tl.to("#line1", {
    rotation: 45,
    y: 8,
    transformOrigin: "center center",
    duration: 0.3
  })
  .to("#line2", {
    autoAlpha: 0,
    duration: 0.2
  }, 0)
  .to("#line3", {
    rotation: -45,
    y: -8,
    transformOrigin: "center center",
    duration: 0.3
  }, 0);

// Toggle
let isOpen = false;
button.addEventListener("click", () => {
  isOpen ? tl.reverse() : tl.play();
  isOpen = !isOpen;
});
```

### Play to Pause
```javascript
const playPauseTl = gsap.timeline({ paused: true });

playPauseTl
  .to("#play-icon", { morphSVG: "#pause-icon", duration: 0.3 });

// Toggle
button.addEventListener("click", () => {
  playPauseTl.reversed() ? playPauseTl.play() : playPauseTl.reverse();
});
```

### Heart Beat
```javascript
gsap.to("#heart", {
  scale: 1.15,
  transformOrigin: "center center",
  duration: 0.15,
  ease: "power2.out",
  repeat: -1,
  yoyo: true,
  repeatDelay: 0.5
});
```

### Loading Dots
```javascript
gsap.to(".dot", {
  y: -10,
  duration: 0.4,
  stagger: {
    each: 0.15,
    repeat: -1,
    yoyo: true
  },
  ease: "power2.inOut"
});
```

## Shape Morphing

### Circle to Square
```javascript
gsap.to("#circle", {
  morphSVG: "#square",
  duration: 0.8,
  ease: "power2.inOut"
});
```

### Multi-Shape Sequence
```javascript
const shapes = ["#star", "#heart", "#diamond", "#circle"];
let current = 0;

function morphNext() {
  const next = (current + 1) % shapes.length;

  gsap.to(shapes[current], {
    morphSVG: shapes[next],
    duration: 1,
    ease: "elastic.out(1, 0.5)",
    onComplete: () => {
      current = next;
      setTimeout(morphNext, 1500);
    }
  });
}

morphNext();
```

### Blob Animation
```javascript
// Requires multiple blob path variations
const blobs = ["#blob1", "#blob2", "#blob3", "#blob4"];

const tl = gsap.timeline({ repeat: -1, yoyo: true });

blobs.forEach((blob, i) => {
  if (i > 0) {
    tl.to("#main-blob", {
      morphSVG: blob,
      duration: 2,
      ease: "sine.inOut"
    });
  }
});
```

## Motion Path Animations

### Orbit Animation
```javascript
gsap.to(".satellite", {
  motionPath: {
    path: "#orbit-path",
    align: "#orbit-path",
    alignOrigin: [0.5, 0.5]
  },
  duration: 5,
  repeat: -1,
  ease: "none"
});
```

### Car on Road
```javascript
gsap.to("#car", {
  motionPath: {
    path: "#road",
    align: "#road",
    alignOrigin: [0.5, 1],  // Bottom center of car
    autoRotate: true
  },
  duration: 10,
  repeat: -1,
  ease: "none"
});
```

### Flying Airplane
```javascript
gsap.to("#airplane", {
  motionPath: {
    path: "#flight-path",
    align: "#flight-path",
    alignOrigin: [0.5, 0.5],
    autoRotate: 90  // Nose points forward
  },
  duration: 8,
  repeat: -1,
  ease: "power1.inOut"
});
```

### Bouncing Ball Path
```javascript
gsap.to("#ball", {
  motionPath: {
    path: [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { x: 200, y: 0 },
      { x: 300, y: 100 },
      { x: 400, y: 0 }
    ],
    curviness: 0  // Straight lines for bounce effect
  },
  duration: 2,
  ease: "bounce.out"
});
```

## Infographic Animations

### Pie Chart Growth
```javascript
// Using stroke-dasharray technique
const circumference = 2 * Math.PI * radius;

gsap.from(".pie-segment", {
  strokeDasharray: `0 ${circumference}`,
  duration: 1,
  stagger: 0.2,
  ease: "power2.out"
});
```

### Bar Chart Rise
```javascript
gsap.from(".bar", {
  scaleY: 0,
  transformOrigin: "bottom center",
  duration: 0.8,
  stagger: 0.1,
  ease: "power3.out"
});
```

### Line Graph Draw
```javascript
gsap.from("#data-line", {
  drawSVG: 0,
  duration: 2,
  ease: "power2.inOut"
});

// With dots
gsap.from(".data-point", {
  scale: 0,
  duration: 0.3,
  stagger: 0.1,
  ease: "back.out(1.7)",
  delay: 0.5
});
```

### Counter Animation
```javascript
gsap.to(".counter-text", {
  textContent: 100,
  duration: 2,
  snap: { textContent: 1 },
  ease: "power1.out"
});
```

## Scroll-Triggered SVG

### Draw on Scroll Progress
```javascript
gsap.fromTo("#progress-circle",
  { drawSVG: "0%" },
  {
    drawSVG: "100%",
    ease: "none",
    scrollTrigger: {
      trigger: "body",
      start: "top top",
      end: "bottom bottom",
      scrub: true
    }
  }
);
```

### Reveal Illustration
```javascript
const paths = gsap.utils.toArray("#illustration path");

gsap.set(paths, { drawSVG: 0 });

ScrollTrigger.batch(paths, {
  onEnter: (batch) => {
    gsap.to(batch, {
      drawSVG: "100%",
      duration: 1,
      stagger: 0.1
    });
  },
  start: "top 80%"
});
```

### Parallax SVG Layers
```javascript
gsap.utils.toArray(".svg-layer").forEach((layer, i) => {
  gsap.to(layer, {
    y: (i + 1) * -100,
    ease: "none",
    scrollTrigger: {
      trigger: ".svg-scene",
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });
});
```

## Interactive SVG

### Hover Draw Effect
```javascript
const paths = document.querySelectorAll(".hover-icon path");

paths.forEach(path => {
  const length = path.getTotalLength();
  gsap.set(path, {
    strokeDasharray: length,
    strokeDashoffset: length
  });
});

icon.addEventListener("mouseenter", () => {
  gsap.to(paths, {
    strokeDashoffset: 0,
    duration: 0.5,
    stagger: 0.1
  });
});

icon.addEventListener("mouseleave", () => {
  gsap.to(paths, {
    strokeDashoffset: path => path.getTotalLength(),
    duration: 0.3
  });
});
```

### Click Ripple
```javascript
svg.addEventListener("click", (e) => {
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", e.offsetX);
  circle.setAttribute("cy", e.offsetY);
  circle.setAttribute("r", 0);
  circle.setAttribute("fill", "none");
  circle.setAttribute("stroke", "#007bff");
  circle.setAttribute("stroke-width", 2);
  svg.appendChild(circle);

  gsap.to(circle, {
    attr: { r: 50 },
    opacity: 0,
    duration: 0.6,
    ease: "power2.out",
    onComplete: () => circle.remove()
  });
});
```

## Animated Backgrounds

### Floating Shapes
```javascript
gsap.utils.toArray(".floating-shape").forEach(shape => {
  gsap.to(shape, {
    y: gsap.utils.random(-30, 30),
    x: gsap.utils.random(-20, 20),
    rotation: gsap.utils.random(-15, 15),
    duration: gsap.utils.random(3, 6),
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut"
  });
});
```

### Wave Animation
```javascript
gsap.to("#wave path", {
  attr: { d: "M0,50 Q250,100 500,50 T1000,50" },  // Alternate path
  duration: 2,
  repeat: -1,
  yoyo: true,
  ease: "sine.inOut"
});
```

### Gradient Animation
```javascript
// Animate gradient stops
gsap.to("#gradient stop", {
  attr: {
    offset: (i) => i === 0 ? "30%" : "70%"
  },
  duration: 2,
  repeat: -1,
  yoyo: true,
  ease: "sine.inOut"
});
```

## Utility Functions

### Get Path Length
```javascript
function getPathLength(path) {
  return path.getTotalLength();
}
```

### Prepare All Paths
```javascript
function preparePaths(selector) {
  const paths = document.querySelectorAll(selector);

  paths.forEach(path => {
    const length = path.getTotalLength();
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;
  });

  return paths;
}
```

### Create Draw Animation
```javascript
function createDrawAnimation(selector, options = {}) {
  const {
    duration = 1,
    stagger = 0.1,
    ease = "power2.inOut",
    scrollTrigger = null
  } = options;

  const paths = preparePaths(selector);

  return gsap.to(paths, {
    strokeDashoffset: 0,
    duration,
    stagger,
    ease,
    scrollTrigger
  });
}

// Usage
createDrawAnimation("#logo path", {
  duration: 1.5,
  scrollTrigger: { trigger: "#logo", start: "top 80%" }
});
```
