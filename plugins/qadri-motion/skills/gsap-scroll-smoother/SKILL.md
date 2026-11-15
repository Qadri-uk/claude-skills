---
name: gsap-scroll-smoother
description: Create smooth scrolling with ScrollSmoother and Observer
version: 1.0.0
argument-hint: "[smooth scroll description]"
allowed-tools: Read Write Edit Bash Grep Glob
---

# GSAP ScrollSmoother & Observer Generator

Create buttery-smooth scrolling experiences with parallax effects.

## Quick Setup

```javascript
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
```

## HTML Structure Required

```html
<body>
  <div id="smooth-wrapper">
    <div id="smooth-content">
      <!-- All your content here -->
    </div>
  </div>
</body>
```

## Basic Usage

### Simple Smooth Scroll
```javascript
const smoother = ScrollSmoother.create({
  wrapper: "#smooth-wrapper",
  content: "#smooth-content",
  smooth: 1,              // Smoothing amount (seconds)
  effects: true           // Enable data-speed effects
});
```

### With Parallax Effects
```javascript
ScrollSmoother.create({
  wrapper: "#smooth-wrapper",
  content: "#smooth-content",
  smooth: 1.5,
  effects: true,
  smoothTouch: 0.1        // Light smoothing on touch devices
});
```

```html
<!-- Parallax elements -->
<img data-speed="0.5" src="bg.jpg" />       <!-- Moves slower -->
<div data-speed="1.5">Fast element</div>     <!-- Moves faster -->
<img data-speed="auto" src="parallax.jpg" /> <!-- Auto-calculated -->
```

## Natural Language Mapping

| User Says | Implementation |
|-----------|---------------|
| "smooth scroll" | ScrollSmoother basic setup |
| "parallax" | data-speed attributes |
| "slow on scroll" | data-speed < 1 |
| "fast on scroll" | data-speed > 1 |
| "lag effect" | data-lag attribute |
| "scroll to section" | smoother.scrollTo() |

## ScrollSmoother Options

```javascript
ScrollSmoother.create({
  // Selectors
  wrapper: "#smooth-wrapper",
  content: "#smooth-content",

  // Smoothing
  smooth: 1,              // Smoothing time in seconds
  smoothTouch: false,     // Smooth on touch devices (0-1 or false)

  // Effects
  effects: true,          // Enable data-speed/data-lag
  normalizeScroll: true,  // Normalize scroll across devices

  // Behavior
  ignoreMobileResize: true, // Ignore mobile resize events

  // Callbacks
  onUpdate: (self) => {},
  onStop: () => {},
  onFocusIn: (element) => true  // Return false to prevent scroll
});
```

## Parallax Effects

### Speed Attribute
```html
<!-- Slower than scroll (0-1) -->
<div data-speed="0.5">Moves at half speed</div>

<!-- Normal speed -->
<div data-speed="1">Moves at normal speed</div>

<!-- Faster than scroll (>1) -->
<div data-speed="2">Moves at double speed</div>

<!-- Auto-calculate for contained images -->
<div class="image-container">
  <img data-speed="auto" src="parallax.jpg" />
</div>
```

### Lag Attribute
```html
<!-- Delayed response to scroll -->
<div data-lag="0.5">Lags 0.5 seconds behind</div>
<div data-lag="1">Lags 1 second behind</div>
```

### Combined Effects
```html
<div data-speed="0.8" data-lag="0.3">
  Slower and lagging
</div>
```

## Methods

```javascript
const smoother = ScrollSmoother.get();

// Navigation
smoother.scrollTo(".section", true, "center center");
smoother.scrollTo(1000);  // Scroll to position

// State
smoother.progress;        // 0-1 scroll progress
smoother.scrollTop();     // Current scroll position
smoother.offset(".element", "center center");  // Element offset

// Control
smoother.paused(true);    // Pause smooth scrolling
smoother.paused(false);   // Resume
smoother.kill();          // Destroy

// Effects
smoother.effects("[data-speed]", { speed: "auto" });  // Re-apply effects
```

## Common Patterns

### Hero with Parallax Layers
```html
<section class="hero">
  <div class="hero-bg" data-speed="0.3"></div>
  <div class="hero-mid" data-speed="0.6"></div>
  <h1 data-speed="0.9" data-lag="0.1">Welcome</h1>
</section>
```

```css
.hero {
  position: relative;
  height: 100vh;
  overflow: hidden;
}

.hero-bg, .hero-mid {
  position: absolute;
  inset: -20%;  /* Extra size for parallax */
  background-size: cover;
}
```

### Image Reveal with Lag
```html
<section class="gallery">
  <div class="image-wrapper">
    <img data-speed="0.9" data-lag="0.2" src="image1.jpg" />
  </div>
  <div class="image-wrapper">
    <img data-speed="0.9" data-lag="0.3" src="image2.jpg" />
  </div>
</section>
```

### Scroll to Section
```javascript
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute("href"));
    smoother.scrollTo(target, true, "top top");
  });
});
```

### Progress Indicator
```javascript
const smoother = ScrollSmoother.create({
  onUpdate: (self) => {
    gsap.set(".progress-bar", { scaleX: self.progress });
  }
});
```

---

# Observer Plugin

Detect user scroll/touch/pointer gestures in a unified way.

## Setup

```javascript
import { Observer } from "gsap/Observer";
gsap.registerPlugin(Observer);
```

## Basic Usage

```javascript
Observer.create({
  target: window,
  type: "wheel,touch,pointer",
  onUp: () => previousSlide(),
  onDown: () => nextSlide()
});
```

## Observer Options

```javascript
Observer.create({
  // Target
  target: window,          // Element to watch
  type: "wheel,touch,pointer,scroll",

  // Direction callbacks
  onUp: (self) => {},
  onDown: (self) => {},
  onLeft: (self) => {},
  onRight: (self) => {},

  // State callbacks
  onChange: (self) => {},
  onChangeX: (self) => {},
  onChangeY: (self) => {},
  onPress: (self) => {},
  onRelease: (self) => {},
  onStop: (self) => {},
  onStopDelay: 0.25,      // Delay before onStop fires

  // Thresholds
  tolerance: 10,          // Min distance to trigger
  wheelSpeed: -1,         // Negative = natural scroll

  // Behavior
  preventDefault: true,
  dragMinimum: 3,
  lockAxis: false,

  // State
  ignore: "input, textarea",
  debounce: true
});
```

## Full-Page Scroll Example

```javascript
const sections = gsap.utils.toArray(".section");
let currentIndex = 0;
let animating = false;

Observer.create({
  target: window,
  type: "wheel,touch",
  onUp: () => gotoSection(currentIndex - 1),
  onDown: () => gotoSection(currentIndex + 1),
  tolerance: 50,
  preventDefault: true
});

function gotoSection(index) {
  if (animating || index < 0 || index >= sections.length) return;
  animating = true;

  gsap.to(sections[currentIndex], {
    yPercent: index > currentIndex ? -100 : 100,
    duration: 0.75,
    ease: "power2.inOut"
  });

  gsap.fromTo(sections[index],
    { yPercent: index > currentIndex ? 100 : -100 },
    {
      yPercent: 0,
      duration: 0.75,
      ease: "power2.inOut",
      onComplete: () => { animating = false; }
    }
  );

  currentIndex = index;
}
```

## Observer State Properties

```javascript
Observer.create({
  onChange: (self) => {
    console.log("velocityX:", self.velocityX);
    console.log("velocityY:", self.velocityY);
    console.log("deltaX:", self.deltaX);
    console.log("deltaY:", self.deltaY);
    console.log("x:", self.x);
    console.log("y:", self.y);
    console.log("isDragging:", self.isDragging);
    console.log("isPressed:", self.isPressed);
  }
});
```

## ScrollTo Plugin

```javascript
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
gsap.registerPlugin(ScrollToPlugin);

// Scroll to element
gsap.to(window, {
  scrollTo: "#section3",
  duration: 1,
  ease: "power2.inOut"
});

// Scroll to position
gsap.to(window, { scrollTo: 500 });

// Scroll with offset
gsap.to(window, {
  scrollTo: { y: "#section", offsetY: 100 }
});

// Horizontal scroll
gsap.to(".container", {
  scrollTo: { x: 500 },
  duration: 1
});

// Auto-kill on user scroll
gsap.to(window, {
  scrollTo: "#target",
  duration: 2,
  autoKill: true
});
```

## Framework Integration

### React
```jsx
import { useEffect, useRef } from "react";
import { ScrollSmoother } from "gsap/ScrollSmoother";

function App() {
  const wrapperRef = useRef();
  const contentRef = useRef();

  useEffect(() => {
    const smoother = ScrollSmoother.create({
      wrapper: wrapperRef.current,
      content: contentRef.current,
      smooth: 1,
      effects: true
    });

    return () => smoother.kill();
  }, []);

  return (
    <div ref={wrapperRef} id="smooth-wrapper">
      <div ref={contentRef} id="smooth-content">
        {/* Content */}
      </div>
    </div>
  );
}
```

### Next.js
```jsx
"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother);
}

export default function SmoothScroll({ children }) {
  const wrapperRef = useRef();
  const contentRef = useRef();

  useEffect(() => {
    const smoother = ScrollSmoother.create({
      wrapper: wrapperRef.current,
      content: contentRef.current,
      smooth: 1,
      effects: true
    });

    return () => smoother.kill();
  }, []);

  return (
    <div ref={wrapperRef}>
      <div ref={contentRef}>{children}</div>
    </div>
  );
}
```
