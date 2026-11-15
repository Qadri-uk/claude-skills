---
name: text-scramble-decode
description: "Use when building text scramble, decode, glitch, or matrix-rain effects, including character set selection, per-index resolve timing, monospace width locking, and restraint rules."
---

# Text Scramble / Decode Effects

## When to use this
- Adding a "decoding" reveal to headlines, hero text, or navigation items.
- Building a hacker/terminal aesthetic with character-by-character resolution.
- Creating glitch effects where text flickers between random characters.
- Implementing matrix-rain or waterfall text animations.
- Do NOT use this for general hover effects on links/buttons; see `hover-microinteraction-catalog` which includes a simpler scramble recipe.

## Mental model
A text scramble replaces each character with random characters from a set, then resolves them one at a time (usually left-to-right) back to the original text. The effect works through three phases per character position:

1. **Idle**: showing the original character (pre-animation).
2. **Scrambling**: cycling through random characters at a fixed frame rate.
3. **Resolved**: locked to the final character.

Each character index has a `resolveAt` frame number. On each animation tick, if `currentFrame >= resolveAt[i]`, that position shows its final character. Otherwise, it shows a random character from the set. The resolve times are staggered left-to-right with some randomness to avoid a perfectly mechanical sweep.

The visual trick that makes this work is **monospace width locking**. If the font is proportional, characters have different widths, and the text visibly reflows every frame as characters change. This looks broken. Either use a monospace font, or lock each character into a fixed-width `<span>` with `display: inline-block; width: 0.6em` (adjusted per font).

Character set choice defines the aesthetic. ASCII uppercase + digits reads "military/crypto." Katakana reads "matrix." Blocks and bars read "glitch." Matching the character set to the design language is the difference between a considered effect and a gimmick.

## Setup
No library required. Pure JS, typically 40-80 lines.

```css
.scramble-text {
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;
  /* OR for proportional fonts, lock character widths: */
}

.scramble-char {
  display: inline-block;
  min-width: 0.6em;
  text-align: center;
}
```

## Core API
These are the building blocks, not a library:

| Concept | Implementation | Note |
|---|---|---|
| Character set | `string` of allowed random chars | Defines the aesthetic |
| Frame counter | `requestAnimationFrame` with counter | Drives the tick |
| Resolve schedule | `Array<number>` per character | Frame at which each char locks |
| Random char | `set[Math.floor(Math.random() * set.length)]` | One per frame per unresolved position |
| Width lock | `display: inline-block; min-width: 0.6em` | Prevents reflow |
| Tick rate | Every N frames or fixed interval | 30-50ms per tick feels right |
| Direction | Left-to-right, random, or from-center | Resolve order |
| Duration control | `resolveAt[i] = startDelay + i * step + jitter` | Total duration = last resolveAt |

## Recipes

### Basic text scramble (left-to-right resolve)
Text scrambles on trigger and resolves character by character from left to right.

```js
class TextScramble {
  constructor(el, {
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
    tickInterval = 35,
    staggerFrames = 3,
    jitter = 4,
  } = {}) {
    this.el = el;
    this.chars = chars;
    this.tickInterval = tickInterval;
    this.staggerFrames = staggerFrames;
    this.jitter = jitter;
    this.original = el.textContent;
    this.intervalId = null;
  }

  play(newText) {
    const text = newText || this.original;
    const len = text.length;
    const resolveAt = [];

    for (let i = 0; i < len; i++) {
      const randomJitter = Math.floor(Math.random() * this.jitter);
      resolveAt.push(this.staggerFrames * i + randomJitter + 4);
    }

    let frame = 0;
    this.stop();

    this.intervalId = setInterval(() => {
      let output = '';
      let allResolved = true;

      for (let i = 0; i < len; i++) {
        if (text[i] === ' ') {
          output += ' ';
          continue;
        }
        if (frame >= resolveAt[i]) {
          output += text[i];
        } else {
          output += this.chars[Math.floor(Math.random() * this.chars.length)];
          allResolved = false;
        }
      }

      this.el.textContent = output;
      frame++;

      if (allResolved) this.stop();
    }, this.tickInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

const scrambler = new TextScramble(document.querySelector('.headline'));
scrambler.play();
```

### Decode with DOM spans (width-locked, proportional font safe)
Each character gets its own span for fixed width. Works with any font.

```js
class SpanScramble {
  constructor(el, {
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%',
    tickMs = 30,
    resolveStagger = 2,
    resolveJitter = 5,
  } = {}) {
    this.el = el;
    this.chars = chars;
    this.tickMs = tickMs;
    this.resolveStagger = resolveStagger;
    this.resolveJitter = resolveJitter;
  }

  play(text) {
    text = text || this.el.dataset.text || this.el.textContent;
    const len = text.length;

    this.el.innerHTML = '';
    const spans = [];
    const resolveAt = [];

    for (let i = 0; i < len; i++) {
      const span = document.createElement('span');
      span.style.display = 'inline-block';
      span.style.minWidth = text[i] === ' ' ? '0.3em' : '0.6em';
      span.style.textAlign = 'center';
      span.textContent = text[i] === ' ' ? '\u00A0' : this.randomChar();
      this.el.appendChild(span);
      spans.push(span);
      resolveAt.push(this.resolveStagger * i + Math.floor(Math.random() * this.resolveJitter) + 3);
    }

    let frame = 0;
    const interval = setInterval(() => {
      let done = true;
      for (let i = 0; i < len; i++) {
        if (text[i] === ' ') continue;
        if (frame >= resolveAt[i]) {
          spans[i].textContent = text[i];
          spans[i].style.opacity = '1';
        } else {
          spans[i].textContent = this.randomChar();
          done = false;
        }
      }
      frame++;
      if (done) clearInterval(interval);
    }, this.tickMs);
  }

  randomChar() {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }
}
```

### Text transition (scramble from old text to new text)
Scrambles from one string to another, like a departure board.

```js
class TextTransition {
  constructor(el, { chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', tickMs = 30 } = {}) {
    this.el = el;
    this.chars = chars;
    this.tickMs = tickMs;
    this.currentText = el.textContent;
  }

  to(newText) {
    const oldText = this.currentText;
    const maxLen = Math.max(oldText.length, newText.length);
    const resolveAt = [];

    for (let i = 0; i < maxLen; i++) {
      resolveAt.push(3 + i * 2 + Math.floor(Math.random() * 4));
    }

    let frame = 0;
    const interval = setInterval(() => {
      let output = '';
      let done = true;

      for (let i = 0; i < maxLen; i++) {
        const target = i < newText.length ? newText[i] : '';
        if (frame >= resolveAt[i]) {
          output += target;
        } else if (target === ' ' || (i < oldText.length && oldText[i] === ' ')) {
          output += ' ';
          done = false;
        } else {
          output += this.chars[Math.floor(Math.random() * this.chars.length)];
          done = false;
        }
      }

      this.el.textContent = output;
      frame++;

      if (done) {
        clearInterval(interval);
        this.currentText = newText;
      }
    }, this.tickMs);
  }
}

const transition = new TextTransition(document.querySelector('.status'));
transition.to('CONNECTED');
```

### Matrix rain column
A single column of falling characters, like the Matrix.

```js
function matrixColumn(container, {
  chars = '\u30A0\u30A1\u30A2\u30A3\u30A4\u30A5\u30A6\u30A7\u30A8\u30A9\u30AB\u30AD\u30AF\u30B1\u30B3',
  rows = 20,
  tickMs = 60,
  fadeSteps = 8,
} = {}) {
  const col = document.createElement('div');
  col.style.cssText = 'display:flex;flex-direction:column;font-family:monospace;line-height:1.2;';
  col.setAttribute('aria-hidden', 'true');

  const cells = [];
  for (let i = 0; i < rows; i++) {
    const cell = document.createElement('span');
    cell.style.color = 'rgba(0, 255, 65, 0.1)';
    cell.textContent = chars[Math.floor(Math.random() * chars.length)];
    col.appendChild(cell);
    cells.push({ el: cell, age: 0, active: false });
  }
  container.appendChild(col);

  let head = -1;
  setInterval(() => {
    head = (head + 1) % rows;
    cells[head].active = true;
    cells[head].age = 0;

    cells.forEach((cell) => {
      if (!cell.active) return;
      cell.el.textContent = chars[Math.floor(Math.random() * chars.length)];
      const brightness = Math.max(0, 1 - cell.age / fadeSteps);
      cell.el.style.color = `rgba(0, 255, 65, ${brightness})`;
      cell.age++;
      if (cell.age > fadeSteps) cell.active = false;
    });
  }, tickMs);
}
```

### Glitch flicker (continuous random disruption)
Text randomly corrupts a few characters at a time, continuously.

```js
function glitchFlicker(el, {
  chars = '\u2588\u2591\u2592\u2593!@#$%&*',
  corruptPercent = 0.08,
  flickerMs = 80,
  burstInterval = 3000,
  burstDuration = 200,
} = {}) {
  const original = el.textContent;
  let isBursting = false;

  function corrupt(text, pct) {
    return text.split('').map((ch) => {
      if (ch === ' ') return ch;
      return Math.random() < pct
        ? chars[Math.floor(Math.random() * chars.length)]
        : ch;
    }).join('');
  }

  setInterval(() => {
    if (isBursting) {
      el.textContent = corrupt(original, 0.3);
    } else {
      el.textContent = corrupt(original, corruptPercent);
    }
  }, flickerMs);

  setInterval(() => {
    isBursting = true;
    setTimeout(() => {
      isBursting = false;
      el.textContent = original;
    }, burstDuration);
  }, burstInterval);
}
```


## Tuning the feel
- **Tick interval**: 25-50ms. Below 25ms the scrambling is too fast to read any individual character. Above 60ms it feels sluggish.
- **Resolve stagger**: 2-4 frames between each character resolving. 1 frame is too fast (reads as instant). 5+ and the decode drags.
- **Resolve jitter**: 2-6 frames of randomness per character. This prevents a perfectly mechanical left-to-right sweep. 0 jitter looks robotic.
- **Character set size**: 20-40 characters is ideal. Fewer than 10 and the randomness is visibly repetitive. More than 60 and the variety is wasted since characters change too fast to perceive.
- **Total decode duration**: 400-1200ms for 10-30 characters. Scale with text length but cap at 1500ms. Longer decodes lose the user's attention.
- **Glitch burst frequency**: Every 2-5 seconds. More frequent is distracting. Less frequent and the user forgets the effect exists.
- **Glitch corruption percentage**: 5-15% of characters per frame for ambient glitch. 25-40% for burst disruptions.

## Performance
- Text manipulation via `textContent` is cheap. No layout or paint is triggered beyond the text reflow.
- DOM manipulation via individual `<span>` elements is more expensive. For a 50-character headline with spans, you are updating 50 elements per tick. Keep tick rate at 30ms+ for span-based approaches.
- `setInterval` is acceptable here. Unlike animation, exact frame timing is not critical for scramble effects. The randomness masks any timing inconsistency.
- For matrix rain with many columns (20+), use a single `requestAnimationFrame` loop that updates all columns, not one interval per column.
- Canvas-based matrix rain is significantly faster than DOM-based for more than 10 columns. Use `fillText` on a 2D canvas context.

## Accessibility
```css
@media (prefers-reduced-motion: reduce) {
  .scramble-text {
    /* Show final text immediately, no animation */
  }
}
```

```js
function scrambleOrShow(el, text) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = text;
    return;
  }
  const scrambler = new TextScramble(el);
  scrambler.play(text);
}
```

- The scrambling text is decorative. The final resolved text is the content.
- During scramble, screen readers read whatever `textContent` currently is, which is gibberish. For AT users, set `aria-label` to the final text on the element so it is always readable.
- Do not use scramble on critical content (error messages, form labels, navigation items that have no other visual cue).
- Continuous glitch effects on body text can trigger vestibular/motion sensitivity issues even without `prefers-reduced-motion`. Use glitch only on decorative or non-essential elements.

## Anti-slop rules
1. Never use scramble on body text or paragraphs. It is a headline/title effect only.
2. Never scramble text longer than 40-50 characters. The decode takes too long and the user loses interest.
3. Never use a character set that does not match the design language. Katakana on a corporate banking site is a gimmick.
4. Never skip width locking with proportional fonts. The text bouncing left and right every frame is the most common amateur tell.
5. Never let a scramble effect run indefinitely. It must resolve. Continuous scramble reads as a loading error.
6. Never scramble spaces. Keep spaces stable. Scrambling whitespace makes word boundaries illegible and the text unreadable.
7. Never use more than one scramble effect in a single viewport. Multiple simultaneous decodes compete for attention and none of them land.
8. Never decode right-to-left unless the text is RTL. The resolve direction should match reading direction.
9. Do not use scramble as a loading indicator. Users cannot read scrambled text, so it conveys no information about loading progress.

## Checklist
- [ ] Character set matches the design aesthetic
- [ ] Monospace font or width-locked spans prevent reflow
- [ ] Spaces are preserved, not scrambled
- [ ] `aria-label` set to final text for AT users
- [ ] `prefers-reduced-motion` shows final text immediately
- [ ] Total decode duration under 1500ms
- [ ] Resolve direction matches reading direction
- [ ] Effect fires once (not on every scroll pass)
- [ ] Only used on headlines/titles, not body text
