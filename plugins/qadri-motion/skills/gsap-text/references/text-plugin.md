# TextPlugin Reference

Animate text replacement character by character or word by word.

## Setup

```javascript
import { gsap } from "gsap";
import { TextPlugin } from "gsap/TextPlugin";

gsap.registerPlugin(TextPlugin);
```

## Basic Usage

```javascript
// Replace text character by character
gsap.to(".element", {
  duration: 2,
  text: "This is the new text",
  ease: "none"
});
```

## All Options

```javascript
gsap.to(".element", {
  text: {
    value: "New text content",    // The replacement text
    delimiter: "",                 // "" = char, " " = word
    type: "diff",                 // Only animate changes
    newClass: "new",              // Class for new text
    oldClass: "old",              // Class for old text
    padSpace: true,               // Pad with spaces if shorter
    preserveSpaces: true,         // Keep extra spaces
    rtl: false,                   // Right to left
    speed: 1                      // Auto-calculate duration
  },
  duration: 2
});
```

## Common Patterns

### Typewriter Effect
```javascript
gsap.to(".typewriter", {
  text: "Hello, I am typing this message...",
  duration: 3,
  ease: "none"
});
```

### Word by Word
```javascript
gsap.to(".paragraph", {
  text: {
    value: "This text appears word by word",
    delimiter: " "
  },
  duration: 2,
  ease: "none"
});
```

### Diff Mode (Only Changes)
```javascript
// Original: "Hello World"
// Only animates the difference
gsap.to(".element", {
  text: {
    value: "Hello Universe",
    type: "diff"
  },
  duration: 1
});
```

### Styled Transition
```javascript
// CSS
// .old { opacity: 0.5; }
// .new { color: green; }

gsap.to(".element", {
  text: {
    value: "Updated!",
    oldClass: "old",
    newClass: "new"
  },
  duration: 2
});
```

### Auto-Speed Based on Length
```javascript
// Duration calculated automatically
gsap.to(".element", {
  text: {
    value: "Short or long text adjusts duration",
    speed: 1  // Higher = faster
  }
});
```

### Cursor Effect
```javascript
// Add blinking cursor with CSS
gsap.to(".terminal", {
  text: "Typing with cursor_",
  duration: 2,
  ease: "none",
  repeat: -1,
  repeatDelay: 1
});

// CSS: .terminal::after { content: "|"; animation: blink 0.7s infinite; }
```

### Right to Left
```javascript
gsap.to(".rtl", {
  text: {
    value: "مرحبا بالعالم",
    rtl: true
  },
  duration: 2
});
```

## Timeline Usage

```javascript
const tl = gsap.timeline();

tl.to(".line1", { text: "First line types", duration: 1 })
  .to(".line2", { text: "Second line follows", duration: 1 })
  .to(".line3", { text: "Third completes it", duration: 1 });
```

## Counter Animation

```javascript
// Animate numbers
gsap.to(".counter", {
  text: "1000",
  duration: 2,
  snap: { text: 1 }  // Whole numbers only
});
```

## Combine with Cursor

```javascript
function typewriter(element, text) {
  const tl = gsap.timeline();

  tl.to(element, {
      text: text,
      duration: text.length * 0.05,
      ease: "none"
    })
    .to(element, {
      opacity: 1,  // Keep cursor visible
      duration: 0.5,
      repeat: 3
    });

  return tl;
}
```

## TextPlugin vs SplitText vs ScrambleText

| Feature | TextPlugin | SplitText | ScrambleText |
|---------|-----------|-----------|--------------|
| Purpose | Replace text | Split for animation | Decode effect |
| Effect | Typewriter | Per char/word/line | Scramble reveal |
| Modifies DOM | Content only | Adds spans | Content only |
| Best for | Typing, counters | Complex reveals | Hacker effects |

## Tips

1. Use `ease: "none"` for authentic typewriter feel
2. Combine with sound effects for impact
3. Use `delimiter: " "` for faster word-by-word
4. Add cursor CSS for terminal effect
5. Use `type: "diff"` to minimize visual change
