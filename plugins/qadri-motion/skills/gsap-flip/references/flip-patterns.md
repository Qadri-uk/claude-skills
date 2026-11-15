# GSAP Flip Animation Patterns

Ready-to-use Flip animation code snippets.

## Layout Transitions

### Masonry to Grid
```javascript
const items = gsap.utils.toArray(".item");
const container = document.querySelector(".container");

function toggleMasonry() {
  const state = Flip.getState(items);

  container.classList.toggle("masonry");
  container.classList.toggle("grid");

  Flip.from(state, {
    duration: 0.8,
    ease: "power2.inOut",
    stagger: 0.03,
    absolute: true
  });
}
```

### Card Stack to Spread
```javascript
function spreadCards() {
  const cards = gsap.utils.toArray(".card");
  const state = Flip.getState(cards);

  cards.forEach((card, i) => {
    card.style.transform = `translateX(${i * 60}px) rotate(${(i - 2) * 5}deg)`;
  });

  Flip.from(state, {
    duration: 0.6,
    ease: "back.out(1.2)",
    stagger: 0.05
  });
}
```

### Dock to Window
```javascript
function maximizeWindow(windowEl) {
  const state = Flip.getState(windowEl);

  windowEl.classList.add("maximized");

  Flip.from(state, {
    duration: 0.4,
    ease: "power3.out"
  });
}

function minimizeToDock(windowEl) {
  const state = Flip.getState(windowEl);

  windowEl.classList.remove("maximized");

  Flip.from(state, {
    duration: 0.3,
    ease: "power3.in"
  });
}
```

## E-commerce Patterns

### Product Quick View
```javascript
function openQuickView(product) {
  const state = Flip.getState(product);

  // Create modal
  const modal = document.createElement("div");
  modal.className = "quick-view-modal";
  modal.innerHTML = `
    <div class="modal-content">
      <img src="${product.querySelector("img").src}" />
      <div class="details">...</div>
    </div>
  `;
  document.body.appendChild(modal);

  // Flip the image
  const modalImg = modal.querySelector("img");
  Flip.fit(modalImg, product.querySelector("img"));

  requestAnimationFrame(() => {
    modalImg.classList.add("expanded");

    Flip.from(Flip.getState(modalImg), {
      duration: 0.5,
      ease: "power2.out"
    });
  });
}
```

### Cart Flyout
```javascript
function flyToCart(item) {
  const cartIcon = document.querySelector(".cart-icon");
  const itemRect = item.getBoundingClientRect();
  const cartRect = cartIcon.getBoundingClientRect();

  // Create flying clone
  const clone = item.cloneNode(true);
  clone.className = "flying-item";
  clone.style.cssText = `
    position: fixed;
    top: ${itemRect.top}px;
    left: ${itemRect.left}px;
    width: ${itemRect.width}px;
    height: ${itemRect.height}px;
    z-index: 9999;
  `;
  document.body.appendChild(clone);

  // Animate to cart
  gsap.to(clone, {
    top: cartRect.top,
    left: cartRect.left,
    width: 30,
    height: 30,
    opacity: 0.5,
    duration: 0.6,
    ease: "power2.inOut",
    onComplete: () => {
      clone.remove();
      // Pulse cart icon
      gsap.fromTo(cartIcon,
        { scale: 1.3 },
        { scale: 1, duration: 0.3, ease: "back.out(2)" }
      );
    }
  });
}
```

### Wishlist Toggle
```javascript
function toggleWishlist(item, container) {
  const state = Flip.getState(item);

  if (item.parentElement === container) {
    wishlistContainer.appendChild(item);
  } else {
    container.appendChild(item);
  }

  Flip.from(state, {
    duration: 0.5,
    ease: "power2.inOut",
    absolute: true
  });
}
```

## Gallery Patterns

### Thumbnail to Lightbox
```javascript
function openLightbox(thumb) {
  const overlay = document.createElement("div");
  overlay.className = "lightbox-overlay";

  const fullImg = document.createElement("img");
  fullImg.src = thumb.dataset.full || thumb.src;
  overlay.appendChild(fullImg);
  document.body.appendChild(overlay);

  // Fit to thumbnail first
  Flip.fit(fullImg, thumb);

  // Animate overlay
  gsap.fromTo(overlay,
    { backgroundColor: "rgba(0,0,0,0)" },
    { backgroundColor: "rgba(0,0,0,0.9)", duration: 0.3 }
  );

  // Animate image
  requestAnimationFrame(() => {
    fullImg.classList.add("full");

    Flip.from(Flip.getState(fullImg), {
      duration: 0.5,
      ease: "power2.out"
    });
  });
}
```

### Image Carousel Transition
```javascript
function goToSlide(index) {
  const slides = gsap.utils.toArray(".slide");
  const state = Flip.getState(slides);

  // Reorder slides
  slides.forEach((slide, i) => {
    slide.style.order = (i - index + slides.length) % slides.length;
  });

  Flip.from(state, {
    duration: 0.5,
    ease: "power2.inOut"
  });
}
```

## Navigation Patterns

### Tab Content Transition
```javascript
function switchTab(newTab) {
  const panels = gsap.utils.toArray(".tab-panel");
  const state = Flip.getState(panels);

  // Update active states
  panels.forEach(panel => {
    panel.classList.toggle("active", panel.dataset.tab === newTab);
  });

  Flip.from(state, {
    duration: 0.4,
    ease: "power2.inOut",
    onEnter: elements => gsap.from(elements, { opacity: 0, x: 50 }),
    onLeave: elements => gsap.to(elements, { opacity: 0, x: -50 })
  });
}
```

### Accordion Expand
```javascript
function toggleAccordion(header) {
  const panel = header.nextElementSibling;
  const items = gsap.utils.toArray(".accordion-item");
  const state = Flip.getState(items);

  // Toggle panel
  panel.classList.toggle("open");

  // Close others
  items.forEach(item => {
    if (item !== header.parentElement) {
      item.querySelector(".panel").classList.remove("open");
    }
  });

  Flip.from(state, {
    duration: 0.4,
    ease: "power2.inOut"
  });
}
```

### Menu Morph
```javascript
function morphMenu(from, to) {
  const state = Flip.getState(from);

  // Hide current, show new
  from.classList.add("hidden");
  to.classList.remove("hidden");

  // Position new at old location
  Flip.fit(to, from);

  Flip.from(Flip.getState(to), {
    duration: 0.4,
    ease: "power2.inOut"
  });
}
```

## Interactive Patterns

### Drag and Drop Reorder
```javascript
let draggedItem = null;
let state = null;

items.forEach(item => {
  item.addEventListener("dragstart", e => {
    draggedItem = item;
    state = Flip.getState(items);
    item.classList.add("dragging");
  });

  item.addEventListener("dragover", e => {
    e.preventDefault();
    if (item !== draggedItem) {
      const rect = item.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;

      if (e.clientY < midY) {
        item.parentNode.insertBefore(draggedItem, item);
      } else {
        item.parentNode.insertBefore(draggedItem, item.nextSibling);
      }
    }
  });

  item.addEventListener("dragend", () => {
    item.classList.remove("dragging");
    Flip.from(state, {
      duration: 0.3,
      ease: "power2.out"
    });
  });
});
```

### Sortable List
```javascript
function sortItems(property, direction) {
  const items = gsap.utils.toArray(".item");
  const state = Flip.getState(items);

  // Sort
  items.sort((a, b) => {
    const valA = a.dataset[property];
    const valB = b.dataset[property];
    return direction === "asc" ? valA - valB : valB - valA;
  });

  // Reorder DOM
  items.forEach(item => container.appendChild(item));

  Flip.from(state, {
    duration: 0.5,
    ease: "power2.inOut",
    stagger: 0.02
  });
}
```

### Multi-Select Actions
```javascript
function moveSelected(targetContainer) {
  const selected = gsap.utils.toArray(".item.selected");
  const state = Flip.getState(selected);

  selected.forEach(item => targetContainer.appendChild(item));

  Flip.from(state, {
    duration: 0.4,
    ease: "power2.inOut",
    stagger: 0.05,
    onComplete: () => {
      selected.forEach(item => item.classList.remove("selected"));
    }
  });
}
```

## Advanced Patterns

### Nested Flip
```javascript
function expandWithNested(card) {
  // Get state of card and its children
  const state = Flip.getState([card, ...card.children], { nested: true });

  card.classList.toggle("expanded");

  Flip.from(state, {
    duration: 0.5,
    ease: "power2.inOut",
    nested: true  // Handle nested elements
  });
}
```

### Flip with Additional Props
```javascript
function animateWithStyles() {
  const items = gsap.utils.toArray(".item");
  const state = Flip.getState(items, {
    props: "backgroundColor, borderRadius, boxShadow"
  });

  items.forEach(item => item.classList.toggle("highlighted"));

  Flip.from(state, {
    duration: 0.5,
    ease: "power2.inOut"
  });
}
```

### Batch Flip Updates
```javascript
function batchUpdate(updates) {
  const allItems = [];
  updates.forEach(u => allItems.push(...u.items));

  const state = Flip.getState(allItems);

  // Apply all updates
  updates.forEach(({ items, transform }) => {
    items.forEach(transform);
  });

  Flip.from(state, {
    duration: 0.5,
    ease: "power2.inOut",
    stagger: 0.02
  });
}
```

## Utility Functions

### Flip Helper
```javascript
function flipAnimate(targets, change, options = {}) {
  const state = Flip.getState(targets);
  change();
  return Flip.from(state, {
    duration: 0.5,
    ease: "power2.inOut",
    ...options
  });
}

// Usage
flipAnimate(".items", () => {
  container.classList.toggle("grid");
});
```

### Responsive Flip
```javascript
function setupResponsiveFlip(selector) {
  const mq = window.matchMedia("(min-width: 768px)");

  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      const state = Flip.getState(selector);
      // Layout recalculates via CSS
      requestAnimationFrame(() => {
        Flip.from(state, { duration: 0.3 });
      });
    }, 100);
  });
}
```
