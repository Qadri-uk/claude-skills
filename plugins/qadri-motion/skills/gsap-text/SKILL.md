---
name: gsap-text
description: Create text animations with SplitText, TextPlugin, and ScrambleTextPlugin
version: 1.0.0
argument-hint: "[text animation description]"
allowed-tools: Read Write Edit Bash Grep Glob
---

# GSAP Text Animation Generator

Create stunning text animations using SplitText, TextPlugin, and ScrambleTextPlugin.

## Quick Setup

```javascript
import { gsap } from "gsap";
import { SplitText } from "gsap/SplitText";
import { TextPlugin } from "gsap/TextPlugin";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

gsap.registerPlugin(SplitText, TextPlugin, ScrambleTextPlugin);
```

## Text Plugins Overview

| Plugin | Purpose | Effect |
|--------|---------|--------|
| SplitText | Split text into chars/words/lines | Per-element animation |
| TextPlugin | Replace text content | Typewriter effect |
| ScrambleTextPlugin | Scramble during reveal | Hacker/decoder effect |

See `references/text-plugin.md` and `references/scramble-text.md` for details.

## SplitText Basics

### Creating a Split
```javascript
const split = new SplitText(".text", {
  type: "chars, words, lines"
});

// Access split elements
split.chars   // Array of character elements
split.words   // Array of word elements
split.lines   // Array of line elements
```

### Split Types
| Type | Description |
|------|-------------|
| `"chars"` | Split into individual characters |
| `"words"` | Split into words |
| `"lines"` | Split into lines |
| `"chars, words"` | Both chars and words |
| `"chars, words, lines"` | All three levels |

### SplitText Options
```javascript
const split = new SplitText(".text", {
  type: "chars, words, lines",
  charsClass: "char",           // Class for chars
  wordsClass: "word",           // Class for words
  linesClass: "line",           // Class for lines
  position: "relative",         // CSS position
  tag: "span",                  // Wrapper element tag
  specialChars: ["'", "-"]      // Keep these with adjacent char
});
```

## Natural Language Mapping

| User Says | Implementation |
|-----------|---------------|
| "typewriter" | TextPlugin with stagger |
| "letter by letter" | SplitText chars stagger |
| "word by word" | SplitText words stagger |
| "line by line" | SplitText lines stagger |
| "wave" | Chars with yoyo stagger |
| "bounce letters" | Chars with back ease |
| "scramble/decode" | ScrambleTextPlugin |
| "hacker text" | ScrambleTextPlugin with custom chars |
| "highlight" | Background color animation |
| "reveal" | Clip-path or mask |
| "text replace" | TextPlugin |
| "counter/number" | TextPlugin with snap |

## Common Patterns

### Typewriter Effect
```javascript
const split = new SplitText(".text", { type: "chars" });

gsap.from(split.chars, {
  autoAlpha: 0,
  duration: 0.05,
  stagger: 0.05,
  ease: "none"
});

// With cursor
gsap.to(".cursor", {
  autoAlpha: 0,
  repeat: -1,
  yoyo: true,
  duration: 0.5,
  ease: "steps(1)"
});
```

### Wave Animation
```javascript
const split = new SplitText(".text", { type: "chars" });

gsap.from(split.chars, {
  y: 20,
  autoAlpha: 0,
  duration: 0.5,
  stagger: {
    each: 0.03,
    from: "start"
  },
  ease: "back.out(1.7)"
});
```

### Bounce In Characters
```javascript
const split = new SplitText(".text", { type: "chars" });

gsap.from(split.chars, {
  scale: 0,
  y: 50,
  rotation: gsap.utils.wrap([-10, 10]),
  autoAlpha: 0,
  duration: 0.6,
  stagger: 0.04,
  ease: "back.out(1.7)"
});
```

### Words Fade Up
```javascript
const split = new SplitText(".text", { type: "words" });

gsap.from(split.words, {
  y: 30,
  autoAlpha: 0,
  duration: 0.5,
  stagger: 0.08,
  ease: "power3.out"
});
```

### Lines Reveal
```javascript
const split = new SplitText(".text", { type: "lines" });

// Wrap lines for mask effect
split.lines.forEach(line => {
  const wrapper = document.createElement("div");
  wrapper.style.overflow = "hidden";
  line.parentNode.insertBefore(wrapper, line);
  wrapper.appendChild(line);
});

gsap.from(split.lines, {
  y: "100%",
  duration: 0.8,
  stagger: 0.1,
  ease: "power3.out"
});
```

### Character Stagger from Center
```javascript
const split = new SplitText(".text", { type: "chars" });

gsap.from(split.chars, {
  autoAlpha: 0,
  y: 30,
  duration: 0.5,
  stagger: {
    amount: 0.5,
    from: "center"
  },
  ease: "power2.out"
});
```

### Random Character Animation
```javascript
const split = new SplitText(".text", { type: "chars" });

gsap.from(split.chars, {
  autoAlpha: 0,
  y: gsap.utils.random(-100, 100, true),
  x: gsap.utils.random(-50, 50, true),
  rotation: gsap.utils.random(-45, 45, true),
  duration: 0.8,
  stagger: {
    each: 0.03,
    from: "random"
  },
  ease: "back.out(1.7)"
});
```

### Scramble Text (TextPlugin)
```javascript
import { TextPlugin } from "gsap/TextPlugin";
gsap.registerPlugin(TextPlugin);

gsap.to(".text", {
  duration: 2,
  text: {
    value: "New text here!",
    delimiter: "",
    scrambleText: {
      chars: "01",
      revealDelay: 0.5,
      speed: 0.3
    }
  }
});
```

### Highlight Effect
```javascript
const split = new SplitText(".text", { type: "words" });

split.words.forEach(word => {
  word.style.position = "relative";
  word.style.display = "inline-block";

  const highlight = document.createElement("span");
  highlight.className = "highlight";
  highlight.style.cssText = `
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 30%;
    background: yellow;
    transform: scaleX(0);
    transform-origin: left;
    z-index: -1;
  `;
  word.appendChild(highlight);
});

gsap.to(".highlight", {
  scaleX: 1,
  duration: 0.4,
  stagger: 0.05,
  ease: "power2.out"
});
```

## Scroll-Triggered Text

### Reveal on Scroll
```javascript
const split = new SplitText(".scroll-text", { type: "chars, words" });

gsap.from(split.chars, {
  y: 50,
  autoAlpha: 0,
  stagger: 0.02,
  scrollTrigger: {
    trigger: ".scroll-text",
    start: "top 80%",
    toggleActions: "play none none reverse"
  }
});
```

### Scrub Text Animation
```javascript
const split = new SplitText(".scrub-text", { type: "chars" });

gsap.from(split.chars, {
  autoAlpha: 0.2,
  stagger: 0.1,
  scrollTrigger: {
    trigger: ".scrub-text",
    start: "top center",
    end: "bottom center",
    scrub: true
  }
});
```

### Parallax Text
```javascript
const split = new SplitText(".parallax-text", { type: "lines" });

split.lines.forEach((line, i) => {
  gsap.to(line, {
    y: (i % 2 === 0) ? -50 : 50,
    ease: "none",
    scrollTrigger: {
      trigger: ".parallax-text",
      start: "top bottom",
      end: "bottom top",
      scrub: true
    }
  });
});
```

## Advanced Techniques

### Responsive Split
```javascript
let split;

function initSplit() {
  if (split) {
    split.revert();  // Reset to original state
  }

  split = new SplitText(".text", { type: "lines, words" });

  gsap.from(split.words, {
    y: 30,
    autoAlpha: 0,
    stagger: 0.05
  });
}

initSplit();
window.addEventListener("resize", initSplit);
```

### Nested Splits
```javascript
const splitLines = new SplitText(".text", { type: "lines" });
const splitWords = new SplitText(splitLines.lines, { type: "words" });

gsap.from(splitWords.words, {
  y: "100%",
  duration: 0.8,
  stagger: 0.03,
  ease: "power3.out"
});
```

### Text Counter
```javascript
gsap.to(".counter", {
  innerText: 1000,
  duration: 2,
  snap: { innerText: 1 },
  ease: "power1.out"
});
```

### Circular Text Animation
```javascript
const split = new SplitText(".circular-text", { type: "chars" });
const radius = 100;

split.chars.forEach((char, i) => {
  const angle = (i / split.chars.length) * Math.PI * 2;
  gsap.set(char, {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
    rotation: (angle * 180 / Math.PI) + 90
  });
});

// Animate the rotation
gsap.to(".circular-text", {
  rotation: 360,
  duration: 10,
  repeat: -1,
  ease: "none"
});
```

## Cleanup

### Reverting Split
```javascript
// Restore original DOM
split.revert();
```

### React/Vue Cleanup
```javascript
// React
useGSAP(() => {
  const split = new SplitText(".text", { type: "chars" });
  gsap.from(split.chars, { autoAlpha: 0 });

  return () => split.revert();  // Cleanup
}, { scope: containerRef });

// Vue
let split;
onMounted(() => {
  split = new SplitText(".text", { type: "chars" });
  gsap.from(split.chars, { autoAlpha: 0 });
});
onUnmounted(() => split?.revert());
```

## CSS Requirements

### Prevent FOUC (Flash of Unstyled Content)
```css
/* Hide text until JS loads */
.split-text {
  visibility: hidden;
}
```

```javascript
gsap.set(".split-text", { visibility: "visible" });
const split = new SplitText(".split-text", { type: "chars" });
```

### Line Wrapping
```css
.split-text {
  /* Ensure proper line wrapping */
  overflow: hidden;
}

.split-text .word {
  display: inline-block;
}

.split-text .line {
  display: block;
}
```

## Performance Tips

1. **Split once** - Store reference, don't re-split
2. **Use will-change** - Add `will-change: transform` to animated chars
3. **Limit character count** - Very long text can be slow
4. **Revert when done** - Clean up after animation completes
5. **Debounce resize** - Don't re-split on every resize event
