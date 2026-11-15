# Text Scramble / Decode - Reference

## Character set presets

| Name | Characters | Aesthetic |
|---|---|---|
| Uppercase + digits | `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789` | Military, crypto, tech |
| Katakana | `\u30A0-\u30FF` range | Matrix, cyberpunk |
| Blocks | `\u2580\u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588` | Brutalist, glitch |
| Binary | `01` | Hacker, minimal |
| Symbols | `!@#$%^&*()_+-=[]{}` | Chaotic, punk |
| Mixed case + symbols | `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*` | General purpose |

## Gotchas

1. **`textContent` vs `innerHTML`.** Always use `textContent` for scramble output, never `innerHTML`. Random characters could accidentally form valid HTML entities or tags, causing rendering issues.
2. **Emoji and multi-byte characters.** `string.length` counts UTF-16 code units, not characters. An emoji is 2+ code units. Use `Array.from(text)` instead of `text.split('')` to iterate by grapheme.
3. **Ligatures.** Some fonts enable ligatures (fi, fl, ff). During scramble, the absence of these character pairs causes width shifts. Disable ligatures: `font-variant-ligatures: none; font-feature-settings: "liga" 0;`.
4. **Tab characters.** If the source text contains tabs, replace them with spaces before scrambling. Tab rendering varies by context and scrambling tab positions causes unpredictable layout.
5. **Canvas-based alternative for many columns.** For matrix rain with 15+ columns, a DOM approach creates hundreds of elements. Use `CanvasRenderingContext2D.fillText()` instead, clearing the canvas with a semi-transparent black fill each frame to create the trail effect.
6. **Intersection with CSS transitions.** If the scramble element has CSS transitions on `color` or `opacity`, character changes can trigger transition flickers. Remove transitions from scramble elements or use `transition: none` during the scramble.

## Additional recipes

### Canvas matrix rain (full screen)
Multiple columns of falling characters rendered on canvas for performance.

```js
function matrixRain(canvas) {
  const ctx = canvas.getContext('2d');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789\u30A0\u30A1\u30A2\u30A3\u30A4';
  const fontSize = 14;
  let columns, drops;

  function resize() {
    canvas.width = canvas.offsetWidth * devicePixelRatio;
    canvas.height = canvas.offsetHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    columns = Math.floor(canvas.offsetWidth / fontSize);
    drops = new Array(columns).fill(1);
  }

  resize();
  window.addEventListener('resize', resize);

  function draw() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    ctx.fillStyle = '#0f0';
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < columns; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(char, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.offsetHeight && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }
  }

  setInterval(draw, 50);
}
```

### Typewriter with scramble (each character scrambles briefly before resolving)
Characters appear one at a time, each scrambling for a few frames before settling.

```js
function typeScramble(el, text, { tickMs = 40, scrambleFrames = 5 } = {}) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let resolved = '';
  let charIndex = 0;
  let scrambleCount = 0;

  const interval = setInterval(() => {
    if (charIndex >= text.length) {
      clearInterval(interval);
      return;
    }

    if (text[charIndex] === ' ') {
      resolved += ' ';
      charIndex++;
      scrambleCount = 0;
      el.textContent = resolved;
      return;
    }

    if (scrambleCount < scrambleFrames) {
      const randomChar = chars[Math.floor(Math.random() * chars.length)];
      el.textContent = resolved + randomChar;
      scrambleCount++;
    } else {
      resolved += text[charIndex];
      el.textContent = resolved;
      charIndex++;
      scrambleCount = 0;
    }
  }, tickMs);
}
```

### Scramble with color transition
Characters turn a highlight color when they resolve, then fade back to the text color.

```js
function colorScramble(el, text, { chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', highlightColor = '#00ff88' } = {}) {
  el.innerHTML = '';
  const spans = [];
  const resolveAt = [];

  for (let i = 0; i < text.length; i++) {
    const span = document.createElement('span');
    span.style.cssText = `display:inline-block;min-width:${text[i] === ' ' ? '0.3em' : '0.6em'};text-align:center;transition:color 0.4s;`;
    span.textContent = text[i] === ' ' ? '\u00A0' : chars[Math.floor(Math.random() * chars.length)];
    el.appendChild(span);
    spans.push(span);
    resolveAt.push(3 + i * 2 + Math.floor(Math.random() * 4));
  }

  let frame = 0;
  const interval = setInterval(() => {
    let done = true;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === ' ') continue;
      if (frame >= resolveAt[i]) {
        if (spans[i].textContent !== text[i]) {
          spans[i].textContent = text[i];
          spans[i].style.color = highlightColor;
          setTimeout(() => { spans[i].style.color = ''; }, 300);
        }
      } else {
        spans[i].textContent = chars[Math.floor(Math.random() * chars.length)];
        done = false;
      }
    }
    frame++;
    if (done) clearInterval(interval);
  }, 35);
}
```

### Scroll-triggered decode
Text decodes as the section scrolls into view. Once only.

```js
function scrollDecode(selector) {
  const elements = document.querySelectorAll(selector);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const text = el.dataset.text || el.textContent;
          const scrambler = new TextScramble(el, { chars });
          scrambler.play(text);
          observer.unobserve(el);
        }
      });
    },
    { rootMargin: '0px 0px -60px 0px', threshold: 0 }
  );

  elements.forEach((el) => {
    el.dataset.text = el.textContent;
    el.textContent = '';
    observer.observe(el);
  });
}
```
