# ScrambleTextPlugin Reference

Create decoding/hacker-style text reveal effects.

## Setup

```javascript
import { gsap } from "gsap";
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin";

gsap.registerPlugin(ScrambleTextPlugin);
```

## Basic Usage

```javascript
gsap.to(".element", {
  duration: 2,
  scrambleText: "New decoded text"
});
```

## All Options

```javascript
gsap.to(".element", {
  scrambleText: {
    text: "Final revealed text",     // Text to reveal
    chars: "upperCase",              // Characters to use during scramble
    speed: 1,                        // Scramble refresh rate (0.1-1)
    revealDelay: 0.5,               // Delay before unscrambling starts
    delimiter: "",                   // "" = chars, " " = words
    rightToLeft: false,             // Reveal direction
    tweenLength: true,              // Animate length changes
    newClass: "revealed",           // Class for new text
    oldClass: "scrambled"           // Class for old text
  },
  duration: 3
});
```

## Character Sets

```javascript
// Built-in options
chars: "upperCase"        // A-Z
chars: "lowerCase"        // a-z
chars: "upperAndLowerCase" // A-Z + a-z

// Custom character sets
chars: "XO"               // Only X and O
chars: "!@#$%^&*()"       // Symbols
chars: "01"               // Binary effect
chars: "アイウエオ"        // Japanese (Matrix effect)
```

## Common Patterns

### Hacker/Decoder Effect
```javascript
gsap.to(".terminal", {
  scrambleText: {
    text: "ACCESS GRANTED",
    chars: "01!@#$%",
    speed: 0.3,
    revealDelay: 1
  },
  duration: 3
});
```

### Typewriter with Scramble
```javascript
gsap.to(".heading", {
  scrambleText: {
    text: "Hello World",
    chars: "lowerCase",
    speed: 0.4
  },
  duration: 2,
  ease: "none"
});
```

### Word by Word Reveal
```javascript
gsap.to(".paragraph", {
  scrambleText: {
    text: "This reveals word by word",
    delimiter: " ",
    chars: "upperAndLowerCase"
  },
  duration: 3
});
```

### Right to Left (Arabic/Hebrew)
```javascript
gsap.to(".rtl-text", {
  scrambleText: {
    text: "שלום עולם",
    rightToLeft: true
  },
  duration: 2
});
```

### Styled Transition
```javascript
// CSS
// .old-text { color: red; }
// .new-text { color: green; }

gsap.to(".element", {
  scrambleText: {
    text: "Updated text",
    oldClass: "old-text",
    newClass: "new-text"
  },
  duration: 2
});
```

### Restore Original
```javascript
// Scramble back to original text
gsap.to(".element", {
  scrambleText: "{original}",
  duration: 2
});
```

## Timeline Integration

```javascript
const tl = gsap.timeline();

tl.to(".line1", {
    scrambleText: "First line decodes",
    duration: 1.5
  })
  .to(".line2", {
    scrambleText: "Second line follows",
    duration: 1.5
  })
  .to(".line3", {
    scrambleText: {
      text: "Final dramatic reveal",
      chars: "!@#$%",
      revealDelay: 0.5
    },
    duration: 2
  });
```

## With ScrollTrigger

```javascript
gsap.to(".section-title", {
  scrambleText: {
    text: "Revealed on Scroll",
    chars: "upperCase"
  },
  duration: 2,
  scrollTrigger: {
    trigger: ".section",
    start: "top center"
  }
});
```

## Combining with SplitText

```javascript
const split = new SplitText(".heading", { type: "chars" });

gsap.from(split.chars, {
  scrambleText: {
    text: "{original}",
    chars: "XO"
  },
  duration: 0.5,
  stagger: 0.05
});
```

## Speed Reference

| Speed | Effect |
|-------|--------|
| 0.1 | Very slow, dramatic |
| 0.3 | Slow, readable |
| 0.5 | Medium |
| 1 | Fast (default) |

## Use Cases

- Terminal/hacker interfaces
- Data decryption visualizations
- Mysterious text reveals
- Loading state transitions
- Cyberpunk UI elements
- Password reveal effects
