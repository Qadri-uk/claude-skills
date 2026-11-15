# Reference: Progressive Text Highlight Reading Experience

## Text splitting methods

### Manual word split (no library)
```js
function splitWords(el) {
  const text = el.textContent.trim();
  let idx = 0;
  el.innerHTML = text.split(/\s+/).map(word =>
    `<span class="word" data-i="${idx++}">${word}</span>`
  ).join(' ');
  return idx; // total word count
}
```

**Limitations:**
- Destroys original text nodes (screen reader pronunciation may change)
- Does not handle nested elements (bold, italic within the text)
- Whitespace between words becomes a literal space character between spans

### GSAP SplitText (recommended)
```js
import { SplitText } from 'gsap/SplitText';
gsap.registerPlugin(SplitText);

const split = new SplitText('.reading-paragraph', {
  type: 'words',           // 'words', 'chars', 'lines', or combinations
  wordsClass: 'word',
  tag: 'span',
});

// split.words: array of all word elements
// split.revert(): restores original DOM
```

SplitText preserves the original text node structure internally. `split.revert()` restores the original DOM exactly, which is important for accessibility if you need to undo the split on reduced-motion changes.

### Sentence split (manual)
```js
function splitSentences(el) {
  const text = el.textContent.trim();
  // Regex: match everything up to and including a sentence-ending punctuation
  const sentences = text.match(/[^.!?]*[.!?]+[\s]*/g) || [text];
  let idx = 0;
  el.innerHTML = sentences.map(s =>
    `<span class="sentence" data-si="${idx++}">${s.trim()}</span>`
  ).join(' ');
  return idx;
}
```

**Edge cases:** Abbreviations (Dr., U.S., etc.) can cause false splits. For production use, consider a natural language sentence tokenizer or manually marking sentence boundaries in the HTML.

## Scroll budget reference table

| Word count | Mode | Recommended height | Effective pace |
|---|---|---|---|
| 10-20 | Word | 150-200vh | ~10vh per word |
| 20-50 | Word | 200-350vh | ~6vh per word |
| 50-100 | Word | 300-500vh | ~5vh per word |
| 100-200 | Sentence | 250-400vh | ~40vh per sentence |
| 200-500 | Paragraph | 300-500vh | ~100vh per paragraph |
| 500+ | Do not use this technique. Use `scroll-reveal-choreography` with paragraph entrances. |

The scroll budget is clamped between 150vh (minimum to avoid racing) and 500vh (maximum to avoid fatigue).

## Reading pace math

At natural scroll speed, a user covers approximately 1 viewport height in 1.0-1.5 seconds of continuous scrolling (varies by device and input method).

```
Words per second at 6vh/word:
  1 vh = ~0.01-0.015 seconds
  6 vh = ~0.06-0.09 seconds per word
  That is 11-16 words per second of scrolling

Average reading speed: 4-5 words per second

The mismatch is intentional: the reader scrolls in bursts, pausing to
read the highlighted text. The 6vh/word budget accounts for pause time.
```

## Color and contrast reference

### Dark theme (default)
| State | CSS color | Contrast vs #0a0a0a | WCAG |
|---|---|---|---|
| Dimmed | `rgba(255,255,255,0.12)` | ~1.3:1 | Below AA (intentional) |
| Highlighted | `rgba(255,255,255,0.85)` | ~14:1 | AAA |
| Active | `rgba(255,255,255,1.0)` | ~17:1 | AAA |

### Light theme
| State | CSS color | Contrast vs #f5f3ef | WCAG |
|---|---|---|---|
| Dimmed | `rgba(0,0,0,0.10)` | ~1.2:1 | Below AA (intentional) |
| Highlighted | `rgba(0,0,0,0.80)` | ~11:1 | AAA |
| Active | `rgba(0,0,0,1.0)` | ~15:1 | AAA |

The dimmed state is intentionally below WCAG contrast minimums. This is acceptable because:
1. The text is available via `aria-label` at all times
2. prefers-reduced-motion shows all text at full contrast
3. The dimmed state is decorative (showing text shape), not functional

## Easing functions for reading pace

### Power curve (recommended)
```js
const activeIndex = Math.round(Math.pow(progress, 0.85) * (total - 1));
```
Slightly front-loads the pace. The opening words highlight 15% faster than the closing words.

### Linear (simplest)
```js
const activeIndex = Math.round(progress * (total - 1));
```
Every word gets exactly the same scroll budget. Can feel too fast at the end.

### Custom act-based (most control)
See Phase 9 in SKILL.md. Maps acts to pace multipliers so the hook is fast and the climax is slow.

### Smoothstep (dramatic slow-down at edges)
```js
function smoothstep(t) {
  return t * t * (3 - 2 * t);
}
const activeIndex = Math.round(smoothstep(progress) * (total - 1));
```
Slow start, fast middle, slow end. Good for dramatic text with a punchline ending.

## CSS performance notes

### Safe properties (compositor/paint only, no layout)
- `color`: paint only
- `opacity`: compositor
- `filter: blur()`: paint (GPU-accelerated on most browsers)
- `background-color`: paint only
- `text-decoration-color`: paint only

### Unsafe properties (trigger layout recalculation)
- `font-weight` (non-variable): reflows the word and all subsequent content
- `font-size`: reflows everything
- `letter-spacing`: reflows the word
- `padding` on word spans: reflows

### Variable font workaround for weight accent
```css
/* Load a variable font */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Variable.woff2') format('woff2-variations');
  font-weight: 100 900;
}

/* Use font-variation-settings instead of font-weight */
.word {
  font-variation-settings: 'wght' 400;
  transition: font-variation-settings 0.25s ease;
}

.word.is-active {
  font-variation-settings: 'wght' 700;
}
```

`font-variation-settings` on a variable font does NOT trigger layout recalculation in most browsers. The glyph outlines adjust without changing metrics. However, large weight jumps (400 to 900) can still cause minor reflow in some browsers. Test on target browsers.

## Troubleshooting

### Words wrap differently after splitting
**Cause:** Injected `<span>` elements with `display: inline` may introduce extra whitespace or prevent word-break opportunities.
**Fix:** Ensure the join character between spans is a single space ` `, not a newline. Do not add `display: inline-block` to word spans (it breaks natural text wrapping).

### Highlight races ahead on trackpad
**Cause:** Trackpad scroll events fire in large bursts. `scrub: 0.3` cannot keep up, and the highlight jumps.
**Fix:** Increase `scrub` to `0.4-0.5` for smoother interpolation on trackpad input. Or use Lenis to normalize scroll velocity.

### Text is invisible on load (before JS runs)
**Cause:** CSS sets all `.word` spans to `rgba(255,255,255,0.12)`, but JS has not split the text yet, so no `.word` spans exist and the raw text is at full opacity -- then when JS splits and applies the class, the text snaps to dimmed.
**Fix:** Set initial styles on `.reading-paragraph` (not `.word`) so the transition is from full opacity to dimmed after split, not from dimmed to dimmed.

### Highlight does not reach the last word
**Cause:** The active index calculation rounds down, and progress never quite reaches 1.0 due to ScrollTrigger's `end: 'bottom bottom'` math.
**Fix:** Use `Math.round()` instead of `Math.floor()`. Or set `end: 'bottom bottom-=1'` to ensure progress reaches 1.0.

### Screen reader announces each word separately
**Cause:** Word spans are focusable or have ARIA roles.
**Fix:** Word spans should have no ARIA role, no tabindex, and no aria-label. The container's `aria-label` provides the complete text. Screen readers should read the label, not the individual spans.
