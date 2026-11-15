---
name: gsap-flip
description: Create layout animations with GSAP Flip plugin
version: 1.0.0
argument-hint: "[layout animation description]"
allowed-tools: Read Write Edit Bash Grep Glob
---

# GSAP Flip Plugin Generator

Create seamless layout transitions and state-based animations with the Flip plugin.

## What is FLIP?

**F**irst, **L**ast, **I**nvert, **P**lay - A technique for animating layout changes:
1. **First**: Record initial state
2. **Last**: Make DOM changes
3. **Invert**: Apply offsets to show original position
4. **Play**: Animate removal of offsets

## Quick Setup

```javascript
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(Flip);
```

## Basic Usage

### Simple State Animation
```javascript
// 1. Get the initial state
const state = Flip.getState(".box");

// 2. Make DOM changes (move, resize, reparent, etc.)
container.appendChild(box);
box.classList.toggle("active");

// 3. Animate from the old state to the new state
Flip.from(state, {
  duration: 1,
  ease: "power2.inOut"
});
```

### Core Methods

| Method | Purpose |
|--------|---------|
| `Flip.getState()` | Record element positions/sizes |
| `Flip.from()` | Animate FROM recorded state TO current |
| `Flip.to()` | Animate TO recorded state FROM current |
| `Flip.fit()` | Fit one element to another's position/size |
| `Flip.makeAbsolute()` | Convert to absolute positioning |
| `Flip.killFlipsOf()` | Kill active Flip animations |

## Natural Language Mapping

| User Says | Implementation |
|-----------|---------------|
| "grid to list transition" | Flip with layout change |
| "add to cart animation" | Flip with reparenting |
| "expand card" | Flip with class toggle |
| "shuffle items" | Flip with reorder |
| "morph layout" | Flip with responsive change |
| "hero image transition" | Flip with navigation |

## Common Patterns

### Grid to List Toggle
```javascript
const items = gsap.utils.toArray(".item");
const container = document.querySelector(".container");

function toggleLayout() {
  // Record state
  const state = Flip.getState(items);

  // Toggle layout class
  container.classList.toggle("grid");
  container.classList.toggle("list");

  // Animate
  Flip.from(state, {
    duration: 0.7,
    ease: "power2.inOut",
    stagger: 0.05,
    absolute: true,
    onEnter: elements => gsap.fromTo(elements,
      { opacity: 0, scale: 0 },
      { opacity: 1, scale: 1 }
    ),
    onLeave: elements => gsap.to(elements,
      { opacity: 0, scale: 0 }
    )
  });
}
```

### Add to Cart Animation
```javascript
function addToCart(product) {
  const clone = product.cloneNode(true);
  clone.classList.add("flying");
  document.body.appendChild(clone);

  // Record product position
  const state = Flip.getState(clone);

  // Move to cart
  cart.appendChild(clone);

  // Animate
  Flip.from(state, {
    duration: 0.8,
    ease: "power2.inOut",
    scale: true,
    onComplete: () => {
      clone.classList.remove("flying");
      updateCartCount();
    }
  });
}
```

### Expand/Collapse Card
```javascript
const cards = document.querySelectorAll(".card");

cards.forEach(card => {
  card.addEventListener("click", () => {
    const state = Flip.getState(card);

    // Toggle expanded class
    const isExpanded = card.classList.toggle("expanded");

    // Animate
    Flip.from(state, {
      duration: 0.5,
      ease: isExpanded ? "power2.out" : "power2.in",
      absolute: true
    });
  });
});
```

### Shuffle/Reorder Items
```javascript
function shuffleItems() {
  const items = gsap.utils.toArray(".item");
  const state = Flip.getState(items);

  // Shuffle DOM order
  items.sort(() => Math.random() - 0.5)
       .forEach(item => container.appendChild(item));

  // Animate
  Flip.from(state, {
    duration: 0.7,
    ease: "power1.inOut",
    stagger: 0.02,
    absolute: true
  });
}
```

### Filter Animation
```javascript
function filter(category) {
  const items = gsap.utils.toArray(".item");
  const state = Flip.getState(items);

  // Update visibility
  items.forEach(item => {
    const match = category === "all" || item.dataset.category === category;
    item.classList.toggle("hidden", !match);
  });

  // Animate
  Flip.from(state, {
    duration: 0.6,
    ease: "power2.inOut",
    absolute: true,
    scale: true,
    onEnter: elements => gsap.fromTo(elements,
      { opacity: 0, scale: 0.8 },
      { opacity: 1, scale: 1, duration: 0.4 }
    ),
    onLeave: elements => gsap.to(elements,
      { opacity: 0, scale: 0.8, duration: 0.3 }
    )
  });
}
```

### Hero Image Transition
```javascript
function expandImage(thumbnail) {
  // Create hero view
  const hero = document.createElement("div");
  hero.className = "hero-view";
  hero.innerHTML = `<img src="${thumbnail.src}" />`;
  document.body.appendChild(hero);

  // Record thumbnail state
  const state = Flip.getState(thumbnail);

  // Fit hero to thumbnail first, then animate to full
  Flip.fit(hero.querySelector("img"), thumbnail);

  // Animate to full size
  Flip.to(state, {
    duration: 0.8,
    ease: "power2.inOut",
    absolute: true
  });
}
```

### Responsive Layout Change
```javascript
const mq = window.matchMedia("(min-width: 768px)");

function handleLayoutChange(e) {
  const items = gsap.utils.toArray(".item");
  const state = Flip.getState(items);

  // Layout changes via CSS media queries happen automatically
  // Just animate to new positions
  Flip.from(state, {
    duration: 0.5,
    ease: "power2.inOut",
    absolute: true
  });
}

mq.addEventListener("change", handleLayoutChange);
```

## Flip.from() Options

```javascript
Flip.from(state, {
  // Timing
  duration: 1,
  ease: "power2.inOut",
  stagger: 0.05,
  delay: 0,

  // Behavior
  absolute: true,        // Use absolute positioning during animation
  scale: true,           // Animate scale changes
  simple: false,         // Skip nested element handling
  nested: true,          // Handle nested Flip elements
  prune: true,           // Remove elements that don't change

  // Targets
  targets: ".item",      // Specific targets (subset of state)

  // Callbacks for entering/leaving elements
  onEnter: elements => gsap.from(elements, { opacity: 0, scale: 0 }),
  onLeave: elements => gsap.to(elements, { opacity: 0, scale: 0 }),

  // Standard GSAP callbacks
  onStart: () => {},
  onUpdate: () => {},
  onComplete: () => {},

  // Props to animate (in addition to position/size)
  props: "backgroundColor, borderRadius",

  // Spin (for rotation)
  spin: true,            // or number for specific rotations

  // Timeline integration
  toggleClass: "flipping"
});
```

## Flip.getState() Options

```javascript
Flip.getState(".elements", {
  props: "backgroundColor, borderRadius, boxShadow",  // Extra props to track
  simple: false,   // Skip nested calculations
  nested: true     // Include nested Flip elements
});
```

## Tips & Best Practices

1. **Use `absolute: true`** for smoother animations when elements change containers
2. **Add `will-change: transform`** to animated elements
3. **Use `scale: true`** when element sizes change
4. **Handle enter/leave** for filtering/sorting
5. **Test on mobile** - touch interactions matter

## Framework Integration

### React
```jsx
import { useGSAP } from "@gsap/react";
import { Flip } from "gsap/Flip";

function FilterableGrid({ items, filter }) {
  const containerRef = useRef();

  useGSAP(() => {
    const state = Flip.getState(".item");

    // Filter logic runs via React re-render
    // Then animate with Flip

    Flip.from(state, {
      duration: 0.5,
      ease: "power2.inOut",
      absolute: true
    });
  }, { dependencies: [filter], scope: containerRef });

  return (
    <div ref={containerRef}>
      {items.filter(filterFn).map(item => (
        <div key={item.id} className="item">{item.name}</div>
      ))}
    </div>
  );
}
```

### Vue
```vue
<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import gsap from 'gsap';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(Flip);

const items = ref([...]);
const layout = ref('grid');
let ctx;

watch(layout, (newLayout, oldLayout) => {
  const state = Flip.getState('.item');

  // Layout changes via class binding

  nextTick(() => {
    Flip.from(state, {
      duration: 0.6,
      ease: 'power2.inOut',
      absolute: true
    });
  });
});
</script>
```

## Debugging

```javascript
// Log state for debugging
const state = Flip.getState(".item");
console.log(state);

// Check if elements moved
Flip.from(state, {
  onStart: () => console.log("Flip started"),
  onComplete: () => console.log("Flip complete")
});
```
