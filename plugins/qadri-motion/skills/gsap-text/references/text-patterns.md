# Text Animation Patterns

Ready-to-use text animation code snippets.

## Entrance Animations

### Simple Fade Letters
```javascript
const split = new SplitText(".text", { type: "chars" });

gsap.from(split.chars, {
  autoAlpha: 0,
  duration: 0.03,
  stagger: 0.03,
  ease: "none"
});
```

### Slide Up Words
```javascript
const split = new SplitText(".text", { type: "words" });

// Wrap for overflow hidden
split.words.forEach(word => {
  const wrapper = document.createElement("span");
  wrapper.style.overflow = "hidden";
  wrapper.style.display = "inline-block";
  word.parentNode.insertBefore(wrapper, word);
  wrapper.appendChild(word);
});

gsap.from(split.words, {
  y: "100%",
  duration: 0.6,
  stagger: 0.08,
  ease: "power3.out"
});
```

### Bounce Characters
```javascript
const split = new SplitText(".text", { type: "chars" });

gsap.from(split.chars, {
  y: -50,
  autoAlpha: 0,
  duration: 0.8,
  stagger: 0.04,
  ease: "bounce.out"
});
```

### Elastic Pop
```javascript
const split = new SplitText(".text", { type: "chars" });

gsap.from(split.chars, {
  scale: 0,
  autoAlpha: 0,
  duration: 0.6,
  stagger: 0.03,
  ease: "elastic.out(1, 0.5)"
});
```

### Rotate In
```javascript
const split = new SplitText(".text", { type: "chars" });

gsap.from(split.chars, {
  rotation: 90,
  autoAlpha: 0,
  transformOrigin: "0% 100%",
  duration: 0.5,
  stagger: 0.03,
  ease: "back.out(1.7)"
});
```

### 3D Flip Characters
```javascript
const split = new SplitText(".text", { type: "chars" });

gsap.set(".text", { perspective: 400 });

gsap.from(split.chars, {
  rotationX: -90,
  autoAlpha: 0,
  transformOrigin: "50% 0%",
  duration: 0.6,
  stagger: 0.03,
  ease: "back.out(1.7)"
});
```

## Exit Animations

### Fade Out Letters
```javascript
const split = new SplitText(".text", { type: "chars" });

gsap.to(split.chars, {
  autoAlpha: 0,
  duration: 0.03,
  stagger: {
    each: 0.03,
    from: "end"  // Start from last character
  },
  onComplete: () => split.revert()
});
```

### Slide Out Down
```javascript
const split = new SplitText(".text", { type: "words" });

gsap.to(split.words, {
  y: "100%",
  autoAlpha: 0,
  duration: 0.4,
  stagger: 0.05,
  ease: "power2.in"
});
```

### Scatter Out
```javascript
const split = new SplitText(".text", { type: "chars" });

gsap.to(split.chars, {
  x: () => gsap.utils.random(-200, 200),
  y: () => gsap.utils.random(-200, 200),
  rotation: () => gsap.utils.random(-180, 180),
  autoAlpha: 0,
  duration: 0.8,
  stagger: {
    each: 0.02,
    from: "random"
  },
  ease: "power2.in"
});
```

## Hover Animations

### Character Hover Wave
```javascript
const split = new SplitText(".text", { type: "chars" });

split.chars.forEach((char, i) => {
  char.addEventListener("mouseenter", () => {
    gsap.to(char, {
      y: -10,
      duration: 0.2,
      ease: "power2.out"
    });

    // Neighbor effect
    const neighbors = [split.chars[i-1], split.chars[i+1]].filter(Boolean);
    gsap.to(neighbors, {
      y: -5,
      duration: 0.2,
      ease: "power2.out"
    });
  });

  char.addEventListener("mouseleave", () => {
    gsap.to([char, split.chars[i-1], split.chars[i+1]].filter(Boolean), {
      y: 0,
      duration: 0.3,
      ease: "power2.out"
    });
  });
});
```

### Word Highlight
```javascript
const split = new SplitText(".text", { type: "words" });

split.words.forEach(word => {
  word.addEventListener("mouseenter", () => {
    gsap.to(word, {
      color: "#ff0000",
      scale: 1.1,
      duration: 0.2
    });
  });

  word.addEventListener("mouseleave", () => {
    gsap.to(word, {
      color: "#000000",
      scale: 1,
      duration: 0.2
    });
  });
});
```

## Looping Animations

### Continuous Wave
```javascript
const split = new SplitText(".text", { type: "chars" });

gsap.to(split.chars, {
  y: -10,
  duration: 0.3,
  stagger: {
    each: 0.05,
    repeat: -1,
    yoyo: true
  },
  ease: "sine.inOut"
});
```

### Color Cycle
```javascript
const split = new SplitText(".text", { type: "chars" });
const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00"];

gsap.to(split.chars, {
  color: (i) => colors[i % colors.length],
  duration: 0.5,
  stagger: {
    each: 0.1,
    repeat: -1,
    yoyo: true
  }
});
```

### Rotate Loop
```javascript
const split = new SplitText(".text", { type: "chars" });

gsap.to(split.chars, {
  rotation: 360,
  duration: 2,
  stagger: {
    each: 0.1,
    repeat: -1
  },
  ease: "none"
});
```

## Scroll-Based Animations

### Progressive Reveal
```javascript
const split = new SplitText(".text", { type: "chars" });

gsap.set(split.chars, { autoAlpha: 0.3 });

gsap.to(split.chars, {
  autoAlpha: 1,
  stagger: 0.05,
  scrollTrigger: {
    trigger: ".text",
    start: "top 80%",
    end: "bottom 40%",
    scrub: true
  }
});
```

### Parallax Lines
```javascript
const split = new SplitText(".text", { type: "lines" });

split.lines.forEach((line, i) => {
  const direction = i % 2 === 0 ? 1 : -1;

  gsap.to(line, {
    x: 100 * direction,
    ease: "none",
    scrollTrigger: {
      trigger: ".text",
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });
});
```

### Scale on Scroll
```javascript
const split = new SplitText(".text", { type: "words" });

gsap.from(split.words, {
  scale: 3,
  autoAlpha: 0,
  stagger: 0.1,
  scrollTrigger: {
    trigger: ".text",
    start: "top center",
    end: "bottom center",
    scrub: 1
  }
});
```

## Special Effects

### Glitch Effect
```javascript
const split = new SplitText(".text", { type: "chars" });

function glitch() {
  const tl = gsap.timeline({ repeat: 2 });

  tl.to(split.chars, {
    x: () => gsap.utils.random(-3, 3),
    y: () => gsap.utils.random(-3, 3),
    color: () => gsap.utils.random(["#ff0000", "#00ff00", "#0000ff"]),
    duration: 0.05,
    stagger: {
      each: 0.01,
      from: "random"
    }
  })
  .to(split.chars, {
    x: 0,
    y: 0,
    color: "#ffffff",
    duration: 0.05
  });
}

// Trigger on hover or interval
element.addEventListener("mouseenter", glitch);
```

### Matrix Rain
```javascript
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const split = new SplitText(".text", { type: "chars" });

split.chars.forEach(char => {
  const originalText = char.textContent;

  gsap.to({}, {
    duration: 0.1,
    repeat: 10,
    onRepeat: () => {
      char.textContent = chars[Math.floor(Math.random() * chars.length)];
    },
    onComplete: () => {
      char.textContent = originalText;
    }
  });
});
```

### Morphing Text
```javascript
// Requires TextPlugin
gsap.to(".text", {
  duration: 1,
  text: {
    value: "New Text",
    delimiter: ""
  },
  ease: "none"
});
```

### Underline Draw
```javascript
const split = new SplitText(".text", { type: "words" });

split.words.forEach(word => {
  const underline = document.createElement("span");
  underline.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: currentColor;
    transform: scaleX(0);
    transform-origin: left;
  `;
  word.style.position = "relative";
  word.appendChild(underline);
});

gsap.to(".text span span", {
  scaleX: 1,
  duration: 0.4,
  stagger: 0.1,
  ease: "power2.out"
});
```

## Timeline Sequences

### Hero Text Sequence
```javascript
const titleSplit = new SplitText(".title", { type: "chars" });
const subtitleSplit = new SplitText(".subtitle", { type: "words" });

const tl = gsap.timeline();

tl.from(titleSplit.chars, {
    y: 100,
    autoAlpha: 0,
    duration: 0.6,
    stagger: 0.03,
    ease: "back.out(1.7)"
  })
  .from(subtitleSplit.words, {
    y: 30,
    autoAlpha: 0,
    duration: 0.5,
    stagger: 0.05
  }, "-=0.3");
```

### Page Load Sequence
```javascript
const headingSplit = new SplitText("h1", { type: "chars" });
const paragraphSplit = new SplitText("p", { type: "lines" });

const loadTl = gsap.timeline({ delay: 0.5 });

loadTl
  .from(headingSplit.chars, {
    y: 50,
    autoAlpha: 0,
    stagger: 0.02,
    duration: 0.5
  })
  .from(paragraphSplit.lines, {
    y: 30,
    autoAlpha: 0,
    stagger: 0.1,
    duration: 0.4
  }, "-=0.2");
```

## Utility: Auto-Split All Text
```javascript
function autoSplit(selector, type = "chars, words, lines") {
  const elements = document.querySelectorAll(selector);
  const splits = [];

  elements.forEach(el => {
    const split = new SplitText(el, { type });
    splits.push(split);

    // Default animation
    gsap.from(split.chars || split.words || split.lines, {
      y: 30,
      autoAlpha: 0,
      stagger: 0.03,
      scrollTrigger: {
        trigger: el,
        start: "top 85%"
      }
    });
  });

  return splits;
}

// Usage
const allSplits = autoSplit("[data-split]");
```
