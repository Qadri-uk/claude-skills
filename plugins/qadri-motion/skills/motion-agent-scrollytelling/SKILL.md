---
name: motion-agent-scrollytelling
description: Scroll-driven storytelling animations including scroll progress, parallax layers, snap sections, and narrative reveals. Use when creating immersive scroll experiences, data visualization stories, or any scroll-triggered narrative content.
---

# Scrollytelling

Scroll-driven narrative animations.

## Standards Reference

| Standard | Documentation |
|----------|---------------|
| W3C Scroll-Driven Animations | drafts.csswg.org/scroll-animations-1 |
| CSS scroll-snap | developer.mozilla.org/CSS/scroll-snap |
| Intersection Observer | developer.mozilla.org/API/Intersection_Observer |

## Quick Reference

Uses tokens from: `tokens/motion.tokens.json`

### Scroll Timings

| Trigger | Animation Start | Animation End |
|---------|-----------------|---------------|
| Appear | 0% visible | 50% visible |
| Full reveal | 25% visible | 100% visible |
| Parallax | Enter viewport | Exit viewport |
| Scrub | Scroll position | Scroll position |

## Selection Guide

```
What scroll effect?
│
├── REVEAL ON SCROLL → Elements appear
│   ├── Fade up → opacity + translate
│   ├── Stagger → sequential reveal
│   └── Intersection-based trigger
│
├── PARALLAX → Depth layers
│   ├── Background → slow scroll
│   ├── Foreground → fast scroll
│   └── Multi-layer composition
│
├── SCROLL PROGRESS → Track position
│   ├── Progress bar → top of page
│   ├── Chapter indicator → current section
│   └── Scrub animation → position-linked
│
├── SNAP SECTIONS → Full-page stops
│   ├── Mandatory → always snap
│   ├── Proximity → snap when close
│   └── With transitions
│
├── STICKY ELEMENTS → Fixed while scrolling
│   ├── Sticky header → compact on scroll
│   ├── Sticky sidebar → stays visible
│   └── Pinned section → holds during scroll
│
└── NARRATIVE → Story progression
    ├── Step-based → discrete chapters
    ├── Continuous → smooth progression
    └── Interactive → user-controlled pace
```

## Patterns

### Scroll Reveal

Elements appear on scroll.

**CSS (Intersection Observer):**
```css
.reveal {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 600ms ease-out, transform 600ms ease-out;
}

.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```

**JavaScript:**
```javascript
function setupScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // Only animate once
      }
    });
  }, {
    threshold: 0.2, // 20% visible
    rootMargin: '0px 0px -50px 0px' // Trigger slightly before center
  });

  document.querySelectorAll('.reveal').forEach(el => {
    observer.observe(el);
  });
}
```

**Staggered reveal:**
```javascript
function staggeredReveal(container) {
  const items = container.querySelectorAll('.reveal-item');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        items.forEach((item, i) => {
          setTimeout(() => {
            item.classList.add('visible');
          }, i * 100); // 100ms stagger
        });
        observer.disconnect();
      }
    });
  }, { threshold: 0.1 });

  observer.observe(container);
}
```

### Parallax Layers

Multi-layer depth effect.

**CSS (Native scroll-driven):**
```css
@supports (animation-timeline: scroll()) {
  .parallax-slow {
    animation: parallax-move linear both;
    animation-timeline: scroll();
    animation-range: 0% 100%;
  }

  @keyframes parallax-move {
    from { transform: translateY(-20%); }
    to { transform: translateY(20%); }
  }
}
```

**JavaScript (Fallback):**
```javascript
class ParallaxScroll {
  constructor() {
    this.layers = [];
    this.bind();
  }

  add(element, speed) {
    this.layers.push({ element, speed });
  }

  bind() {
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.update();
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  update() {
    const scrollY = window.scrollY;

    this.layers.forEach(({ element, speed }) => {
      const offset = scrollY * speed;
      element.style.transform = `translateY(${offset}px)`;
    });
  }
}

// Usage
const parallax = new ParallaxScroll();
parallax.add(document.querySelector('.bg-layer'), 0.3);
parallax.add(document.querySelector('.mid-layer'), 0.6);
parallax.add(document.querySelector('.fg-layer'), 1.2);
```

### Scroll Progress

Track scroll position.

**CSS (Native):**
```css
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  height: 4px;
  background: #3b82f6;
  transform-origin: left;
  animation: progress linear both;
  animation-timeline: scroll();
}

@keyframes progress {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
```

**JavaScript:**
```javascript
function setupProgressBar(bar) {
  function update() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollTop / docHeight;

    bar.style.transform = `scaleX(${progress})`;
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
}
```

### Scrub Animation

Animation tied to scroll position.

**GSAP ScrollTrigger:**
```javascript
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

gsap.to('.scrub-element', {
  x: 500,
  rotation: 360,
  scrollTrigger: {
    trigger: '.scrub-section',
    start: 'top center',
    end: 'bottom center',
    scrub: 1 // Smooth scrubbing
  }
});
```

**Native CSS:**
```css
@supports (animation-timeline: scroll()) {
  .scrub-element {
    animation: scrub-move linear both;
    animation-timeline: view();
    animation-range: entry 0% exit 100%;
  }

  @keyframes scrub-move {
    from {
      transform: translateX(-100px) rotate(0deg);
      opacity: 0;
    }
    to {
      transform: translateX(100px) rotate(180deg);
      opacity: 1;
    }
  }
}
```

### Snap Sections

Full-page snap scrolling.

**CSS:**
```css
.snap-container {
  scroll-snap-type: y mandatory;
  overflow-y: scroll;
  height: 100vh;
}

.snap-section {
  scroll-snap-align: start;
  height: 100vh;
}

/* Proximity snap (softer) */
.snap-container-proximity {
  scroll-snap-type: y proximity;
}
```

**With transitions:**
```javascript
function setupSnapTransitions(container) {
  const sections = container.querySelectorAll('.snap-section');
  let currentSection = 0;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
        const index = Array.from(sections).indexOf(entry.target);

        if (index !== currentSection) {
          // Exit old section
          sections[currentSection].classList.remove('active');
          sections[currentSection].classList.add('exiting');

          // Enter new section
          entry.target.classList.add('active');
          entry.target.classList.remove('exiting');

          currentSection = index;
        }
      }
    });
  }, { threshold: 0.5 });

  sections.forEach(section => observer.observe(section));
}
```

### Pinned Section

Element stays fixed during scroll.

**CSS:**
```css
.pin-container {
  height: 300vh; /* Extra height for scroll duration */
  position: relative;
}

.pinned-content {
  position: sticky;
  top: 0;
  height: 100vh;
}
```

**GSAP ScrollTrigger:**
```javascript
gsap.to('.pinned-content', {
  scrollTrigger: {
    trigger: '.pin-container',
    start: 'top top',
    end: 'bottom bottom',
    pin: true,
    scrub: true
  }
});
```

### Narrative Steps

Story chapters with scroll.

**JavaScript:**
```javascript
class ScrollNarrative {
  constructor(container) {
    this.container = container;
    this.steps = container.querySelectorAll('.story-step');
    this.content = container.querySelector('.story-content');
    this.currentStep = 0;

    this.setupObserver();
  }

  setupObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const stepIndex = parseInt(entry.target.dataset.step);
          this.activateStep(stepIndex);
        }
      });
    }, {
      threshold: 0.5,
      rootMargin: '-20% 0px -20% 0px'
    });

    this.steps.forEach(step => observer.observe(step));
  }

  activateStep(index) {
    if (index === this.currentStep) return;

    // Update step indicators
    this.steps[this.currentStep].classList.remove('active');
    this.steps[index].classList.add('active');

    // Animate content change
    this.transitionContent(index);

    this.currentStep = index;
  }

  transitionContent(index) {
    const content = this.content;

    // Fade out
    content.animate([
      { opacity: 1 },
      { opacity: 0 }
    ], {
      duration: 200,
      easing: 'ease-in'
    }).onfinish = () => {
      // Update content
      content.dataset.step = index;

      // Fade in
      content.animate([
        { opacity: 0 },
        { opacity: 1 }
      ], {
        duration: 300,
        easing: 'ease-out'
      });
    };
  }
}
```

### Horizontal Scroll Section

Scroll horizontally within vertical page.

**CSS + JavaScript:**
```css
.horizontal-section {
  height: 400vh; /* Scroll distance */
  position: relative;
}

.horizontal-track {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
}

.horizontal-content {
  display: flex;
  height: 100%;
  width: 400vw; /* Content width */
}
```

```javascript
function setupHorizontalScroll(section) {
  const track = section.querySelector('.horizontal-track');
  const content = section.querySelector('.horizontal-content');

  function update() {
    const rect = section.getBoundingClientRect();
    const scrollProgress = -rect.top / (rect.height - window.innerHeight);
    const clampedProgress = Math.max(0, Math.min(1, scrollProgress));

    const translateX = clampedProgress * (content.scrollWidth - window.innerWidth);
    content.style.transform = `translateX(-${translateX}px)`;
  }

  window.addEventListener('scroll', update, { passive: true });
}
```

## Reduced Motion

For `prefers-reduced-motion: reduce`:

| Full Motion | Reduced Alternative |
|-------------|---------------------|
| Parallax | Static layers |
| Scroll reveal | Instant visibility |
| Scrub animation | Final state only |
| Pinned sections | Normal scroll |

**Implementation:**
```css
@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }

  .parallax-layer {
    transform: none !important;
  }

  .snap-container {
    scroll-snap-type: none;
  }
}
```

## Cross-References

- See `scroll-animations/` for basic scroll triggers
- See `sequencing/` for stagger timing
- See `parallax` in `camera/` for depth effects
- See `reveals/` for reveal animations

## References

- `references/scrollytelling-patterns.md` — Narrative scroll patterns
