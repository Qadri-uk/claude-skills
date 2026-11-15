---
name: scroll-text-highlight-reading
description: Use when building a progressive text highlight reading experience where words, sentences, or paragraphs illuminate as the user scrolls, creating a guided reading pace. Builds the complete act-structured reading experience with karaoke-style word highlighting, sentence focus, and paragraph progression.
category: scroll
pairs_with: scroll-text-highlight-reading-eval
---

# Progressive Text Highlight Reading Experience

## What this builds
A long-form reading experience where text progressively highlights as the user scrolls, guiding their reading pace. Unhighlighted text is dimmed (low opacity or desaturated), and as the reader scrolls, words or sentences illuminate in sequence, creating a karaoke-like reading guide. The effect can operate at word, sentence, or paragraph granularity, and is used for manifestos, brand statements, data narratives, poetry, or any text where pacing the reader's attention matters.

- Word-level progressive highlighting with scroll-scrubbed progress
- Sentence-level focus: one sentence is bright, the rest are dimmed
- Paragraph-level progression for longer editorial content
- Fixed/sticky text container with scroll-driven highlight progress
- Accent color or weight change on the active word/sentence
- Act structure: opening statement, building argument, climax statement, closing
- prefers-reduced-motion: all text visible at full opacity, no highlighting

## When to use / when not to
- Use for brand manifestos, about-page statements, mission declarations, data narrative conclusions, or any text where controlling the reader's pace amplifies the message.
- Use when the text is the hero content, not supporting copy. This technique makes text the visual centerpiece.
- Do NOT use for body copy longer than ~500 words. Forced-pace reading becomes exhausting beyond that. For long-form editorial, use `scroll-reveal-choreography` with paragraph-level entrances instead.
- Do NOT use for functional text (documentation, instructions, forms). Dimmed text in a UI is an accessibility failure, not a design choice.
- Do NOT use when the text contains links, buttons, or interactive elements. Dimmed interactive elements are unusable.
- For the underlying scroll-progress mapping, see `scroll-progress-storytelling`. For word-level splitting, see `gsap-splittext-kinetic-type`.

## Stack decision
| Dependency | Version | Why | Cheaper alternative |
|---|---|---|---|
| GSAP | 3.13+ | ScrollTrigger for scrub-driven highlight progress. Maps scroll position to which word/sentence is active. | CSS `animation-timeline: view()` can animate individual elements but cannot easily scrub through a sequence of N words based on global scroll position. |
| ScrollTrigger | (bundled) | Scrub mode maps scroll range to a 0-1 progress used to compute the active word index. | IntersectionObserver per sentence. Works for sentence-level but not for word-level scrubbing. |
| SplitText (GSAP) | (bundled, free since 3.13) | Splits text nodes into `<span>` elements per word, line, or character while preserving the original DOM for screen readers. | Manual `split()` + `innerHTML` replacement. Works but loses original text nodes, which can break screen reader pronunciation of split-across-line words. |

No D3, no charting library, no WebGL. This is pure DOM + CSS + GSAP.

## Architecture

```
scroll-text-highlight-reading/
  index.html          -- pinned text section with word-split content
  styles.css          -- dimmed text base, highlighted text states, responsive
  highlight.js        -- text splitting, scroll-to-word mapping, highlight dispatch
```

```
Section structure:
  ┌──────────────────────────────────────────────────┐
  │  .reading-section (height: Nvh, scroll budget)   │
  │                                                  │
  │  ┌──── .reading-pinned (sticky, centered) ─────┐ │
  │  │                                              │ │
  │  │  .reading-text                               │ │
  │  │    <span class="word" data-i="0">We</span>   │ │
  │  │    <span class="word" data-i="1">build</span>│ │
  │  │    <span class="word" data-i="2">the</span>  │ │
  │  │    <span class="word" data-i="3">future</span│ │
  │  │    ...                                       │ │
  │  │                                              │ │
  │  │  Words 0..activeIndex: highlighted (bright)  │ │
  │  │  Words activeIndex+1..N: dimmed (faded)      │ │
  │  │                                              │ │
  │  └──────────────────────────────────────────────┘ │
  │                                                  │
  │  (scroll budget creates the range for scrubbing) │
  └──────────────────────────────────────────────────┘
```

**Lifecycle:**
1. **Parse**: Text renders at full opacity initially (progressive enhancement).
2. **Split**: SplitText (or manual JS) wraps each word in a `<span>` with a data-index. Original text is preserved in an `aria-label` on the container.
3. **Dim**: All words are set to the dimmed state (opacity 0.15, color shift).
4. **Sticky**: The text container is sticky within a tall section. The section height determines the scroll budget.
5. **Scrub**: ScrollTrigger maps scroll progress 0-1 to a word index 0-N. All words up to and including the active index get the highlighted class.
6. **Reverse**: Scrolling up decreases the active index. Previously highlighted words dim back.
7. **Complete**: When all words are highlighted, the section releases and scrolls away.

## Build it: step by step

### Phase 1: HTML structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reading Experience</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- Context before the reading section -->
  <header class="reading-header">
    <p class="reading-kicker">Our Manifesto</p>
  </header>

  <!-- The progressive reading section -->
  <section class="reading-section" id="reading-section"
           aria-label="Progressive reading: Our manifesto">
    <div class="reading-pinned">
      <div class="reading-text" id="reading-text"
           aria-label="We build the tools that builders need. Not the tools that look good in demos. Not the tools that win awards. The tools that survive contact with production, with deadlines, with real users who do not care about your architecture. That is the future we are building. One deployment at a time.">
        <p class="reading-paragraph" data-act="hook">
          We build the tools that builders need.
        </p>
        <p class="reading-paragraph" data-act="rising">
          Not the tools that look good in demos.
          Not the tools that win awards.
        </p>
        <p class="reading-paragraph" data-act="climax">
          The tools that survive contact with production,
          with deadlines, with real users who do not care
          about your architecture.
        </p>
        <p class="reading-paragraph" data-act="resolution">
          That is the future we are building.
          One deployment at a time.
        </p>
      </div>
    </div>
  </section>

  <!-- Content after -->
  <section class="post-reading">
    <p>Continue reading...</p>
  </section>

  <script type="module" src="highlight.js"></script>
</body>
</html>
```

### Phase 2: CSS with dimmed and highlighted states

```css
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: system-ui, -apple-system, sans-serif;
  background: #0a0a0a;
  color: #e0e0e0;
}

/* ── Header ──────────────────────────────────── */
.reading-header {
  max-width: 800px;
  margin: 0 auto;
  padding: 120px 24px 60px;
  text-align: center;
}

.reading-kicker {
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
}

/* ── Reading section (scroll budget) ─────────── */
.reading-section {
  /* Height determines scroll budget.
     More words = taller section.
     50 words at ~6vh per word = 300vh.
     Adjust based on word count. */
  height: 350vh;
  position: relative;
}

/* ── Sticky container ────────────────────────── */
.reading-pinned {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
}

/* ── Text block ──────────────────────────────── */
.reading-text {
  max-width: 720px;
  text-align: center;
}

.reading-paragraph {
  font-size: clamp(1.5rem, 4vw, 2.75rem);
  font-weight: 500;
  line-height: 1.4;
  letter-spacing: -0.015em;
  margin-bottom: 0.6em;
}

.reading-paragraph:last-child {
  margin-bottom: 0;
}

/* ── Word spans (injected by JS) ─────────────── */
.word {
  display: inline;
  color: rgba(255, 255, 255, 0.12);
  transition: color 0.25s ease;
}

.word.is-highlighted {
  color: rgba(255, 255, 255, 1);
}

/* ── Active word emphasis (optional) ─────────── */
.word.is-active {
  color: #fff;
  /* Subtle weight increase for the current word */
}

/* ── Sentence-level mode ─────────────────────── */
.sentence {
  display: inline;
  color: rgba(255, 255, 255, 0.12);
  transition: color 0.4s ease;
}

.sentence.is-highlighted {
  color: rgba(255, 255, 255, 0.85);
}

.sentence.is-active {
  color: rgba(255, 255, 255, 1);
}

/* ── Paragraph-level mode ────────────────────── */
.reading-paragraph.is-dimmed {
  opacity: 0.12;
  transition: opacity 0.5s ease;
}

.reading-paragraph.is-highlighted {
  opacity: 1;
}

/* ── Post-reading section ────────────────────── */
.post-reading {
  max-width: 680px;
  margin: 0 auto;
  padding: 120px 24px;
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.6);
}

/* ── Responsive ──────────────────────────────── */
@media (max-width: 768px) {
  .reading-paragraph {
    font-size: clamp(1.25rem, 5vw, 2rem);
  }

  .reading-section {
    height: 250vh; /* shorter scroll budget on mobile */
  }

  .reading-pinned {
    padding: 24px 16px;
  }
}

/* ── Reduced motion ──────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .word,
  .sentence,
  .reading-paragraph {
    color: rgba(255, 255, 255, 1) !important;
    opacity: 1 !important;
    transition: none !important;
  }

  .reading-section {
    height: auto !important;
  }

  .reading-pinned {
    position: relative !important;
    height: auto !important;
    padding: 80px 24px !important;
  }
}
```

### Phase 3: Text splitting into word spans

```js
// highlight.js
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function splitIntoWords(container) {
  const paragraphs = container.querySelectorAll('.reading-paragraph');
  let globalIndex = 0;
  const allWords = [];

  paragraphs.forEach((p) => {
    const text = p.textContent.trim();
    const words = text.split(/\s+/);

    // Replace paragraph content with word spans
    p.innerHTML = words.map((word, i) => {
      const idx = globalIndex++;
      allWords.push({ word, index: idx, paragraph: p });
      return `<span class="word" data-i="${idx}">${word}</span>`;
    }).join(' ');
  });

  return { allWords, totalWords: globalIndex };
}
```

### Phase 4: Sentence-level splitting (alternative mode)

```js
function splitIntoSentences(container) {
  const paragraphs = container.querySelectorAll('.reading-paragraph');
  let globalIndex = 0;
  const allSentences = [];

  paragraphs.forEach((p) => {
    const text = p.textContent.trim();
    // Split on sentence boundaries: period, exclamation, question mark
    // followed by a space or end of string
    const sentences = text.match(/[^.!?]*[.!?]+[\s]*/g) || [text];

    p.innerHTML = sentences.map((sentence) => {
      const idx = globalIndex++;
      const trimmed = sentence.trim();
      allSentences.push({ text: trimmed, index: idx, paragraph: p });
      return `<span class="sentence" data-si="${idx}">${trimmed}</span>`;
    }).join(' ');
  });

  return { allSentences, totalSentences: globalIndex };
}
```

### Phase 5: Scroll-to-highlight mapping with GSAP ScrollTrigger

```js
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

function initWordHighlight() {
  const container = document.getElementById('reading-text');
  const section = document.getElementById('reading-section');

  if (REDUCED) {
    // No splitting, no dimming. Text stays readable as-is.
    return;
  }

  const { totalWords } = splitIntoWords(container);
  const wordSpans = container.querySelectorAll('.word');

  // All words start dimmed (CSS handles the initial color)

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.3,
    onUpdate: (self) => {
      const progress = self.progress;
      // Map progress 0-1 to word index 0-(totalWords-1)
      // Use a slight ease so early words highlight faster
      // and the last few words have more scroll budget
      const easedProgress = easeReadingPace(progress);
      const activeIndex = Math.round(easedProgress * (totalWords - 1));

      wordSpans.forEach((span, i) => {
        if (i <= activeIndex) {
          span.classList.add('is-highlighted');
          span.classList.toggle('is-active', i === activeIndex);
        } else {
          span.classList.remove('is-highlighted');
          span.classList.remove('is-active');
        }
      });
    },
  });
}

function easeReadingPace(t) {
  // Ease that slightly front-loads the pace:
  // first 20% of scroll highlights 25% of words (hook - quick),
  // middle 50% of scroll highlights 50% of words (body - steady),
  // last 30% of scroll highlights 25% of words (climax - slow down).
  // Implemented as a shaped cubic bezier approximation.
  // Simple power curve: t^0.85 front-loads slightly.
  return Math.pow(t, 0.85);
}
```

### Phase 6: Sentence-level mode

```js
function initSentenceHighlight() {
  const container = document.getElementById('reading-text');
  const section = document.getElementById('reading-section');

  if (REDUCED) return;

  const { totalSentences } = splitIntoSentences(container);
  const sentenceSpans = container.querySelectorAll('.sentence');

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.3,
    onUpdate: (self) => {
      const progress = self.progress;
      const activeIndex = Math.round(progress * (totalSentences - 1));

      sentenceSpans.forEach((span, i) => {
        span.classList.toggle('is-highlighted', i <= activeIndex);
        span.classList.toggle('is-active', i === activeIndex);
      });
    },
  });
}
```

### Phase 7: Paragraph-level mode

```js
function initParagraphHighlight() {
  const section = document.getElementById('reading-section');
  const paragraphs = document.querySelectorAll('.reading-paragraph');

  if (REDUCED) return;

  // Initial state: all dimmed
  paragraphs.forEach(p => p.classList.add('is-dimmed'));

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.3,
    onUpdate: (self) => {
      const progress = self.progress;
      const activeIndex = Math.round(progress * (paragraphs.length - 1));

      paragraphs.forEach((p, i) => {
        p.classList.toggle('is-dimmed', i > activeIndex);
        p.classList.toggle('is-highlighted', i <= activeIndex);
      });
    },
  });
}
```

### Phase 8: Scroll budget calculator

The section height determines the reading pace. Too short and the reader cannot keep up. Too long and they feel stuck.

```js
function calculateScrollBudget(wordCount, mode = 'word') {
  if (mode === 'word') {
    // 5-8vh per word is comfortable for word-level highlighting.
    // Shorter words (articles, prepositions) need less; longer words need more.
    // Use 6vh as the baseline.
    const baseVh = wordCount * 6;
    return Math.max(200, Math.min(500, baseVh));
  }

  if (mode === 'sentence') {
    // 30-50vh per sentence.
    // A sentence takes 2-4 seconds to read; at natural scroll pace,
    // one viewport takes ~1.2 seconds.
    return Math.max(150, wordCount * 3);
  }

  if (mode === 'paragraph') {
    // 80-120vh per paragraph.
    const paragraphCount = document.querySelectorAll('.reading-paragraph').length;
    return paragraphCount * 100;
  }
}

// Apply to section
function applyScrollBudget(mode) {
  const container = document.getElementById('reading-text');
  const wordCount = container.textContent.trim().split(/\s+/).length;
  const vh = calculateScrollBudget(wordCount, mode);
  document.getElementById('reading-section').style.height = vh + 'vh';
}
```

### Phase 9: Act-based pacing variation

The reading pace should vary by act: the hook highlights faster, the climax slows down.

```js
function easeReadingPaceWithActs(progress, acts) {
  // acts: array of { name, wordStart, wordEnd, pace }
  // pace: 'fast' (1.3x), 'normal' (1x), 'slow' (0.7x)
  // This reshapes the linear progress into a paced progress
  // that spends more scroll budget on slow acts.

  const PACE_MULTIPLIER = {
    fast: 0.7,    // less scroll per word
    normal: 1.0,
    slow: 1.4,    // more scroll per word
  };

  // Compute total weighted length
  let totalWeighted = 0;
  acts.forEach(act => {
    const words = act.wordEnd - act.wordStart;
    totalWeighted += words * PACE_MULTIPLIER[act.pace];
  });

  // Map progress to word index through weighted acts
  let accumulated = 0;
  const scrollPerUnit = 1 / totalWeighted;

  for (const act of acts) {
    const words = act.wordEnd - act.wordStart;
    const weight = PACE_MULTIPLIER[act.pace];
    const actDuration = words * weight * scrollPerUnit;

    if (progress <= accumulated + actDuration) {
      // We are in this act
      const actProgress = (progress - accumulated) / actDuration;
      return act.wordStart + actProgress * words;
    }

    accumulated += actDuration;
  }

  return acts[acts.length - 1].wordEnd;
}
```

### Phase 10: Color/weight accent options

Beyond opacity, the active word can be emphasized with color or weight:

```css
/* ── Color accent mode ───────────────────────── */
.word.is-highlighted {
  color: rgba(255, 255, 255, 0.85);
}

.word.is-active {
  color: #4a9eff;  /* accent blue on the current word */
}

/* ── Weight accent mode ──────────────────────── */
.word.is-highlighted {
  color: rgba(255, 255, 255, 0.9);
}

.word.is-active {
  color: #fff;
  font-weight: 700;
  /* Use font-variation-settings for variable fonts to avoid layout shift:
     font-variation-settings: 'wght' 700; */
}

/* ── Underline accent mode ───────────────────── */
.word.is-active {
  text-decoration: underline;
  text-decoration-color: rgba(255, 255, 255, 0.4);
  text-underline-offset: 4px;
}

/* ── Background highlight mode (karaoke) ─────── */
.word.is-highlighted {
  color: #fff;
  background: rgba(74, 158, 255, 0.15);
  border-radius: 2px;
  padding: 0 2px;
}
```

## The full reference implementation

```js
// highlight.js -- complete implementation
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function splitIntoWords(container) {
  const paragraphs = container.querySelectorAll('.reading-paragraph');
  let globalIndex = 0;
  paragraphs.forEach((p) => {
    const text = p.textContent.trim();
    p.innerHTML = text.split(/\s+/).map((word) => {
      return `<span class="word" data-i="${globalIndex++}">${word}</span>`;
    }).join(' ');
  });
  return globalIndex;
}

function init() {
  const container = document.getElementById('reading-text');
  const section = document.getElementById('reading-section');
  if (!container || !section) return;

  if (REDUCED) return; // text stays fully visible

  const totalWords = splitIntoWords(container);
  const wordSpans = container.querySelectorAll('.word');

  // Calculate and apply scroll budget
  const budgetVh = Math.max(200, Math.min(500, totalWords * 6));
  section.style.height = budgetVh + 'vh';

  ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.3,
    onUpdate: (self) => {
      const activeIndex = Math.round(
        Math.pow(self.progress, 0.85) * (totalWords - 1)
      );

      wordSpans.forEach((span, i) => {
        if (i <= activeIndex) {
          span.classList.add('is-highlighted');
          span.classList.toggle('is-active', i === activeIndex);
        } else {
          span.classList.remove('is-highlighted', 'is-active');
        }
      });
    },
  });
}

document.fonts.ready.then(init);
```

## Tuning the feel

| Parameter | Value | Why |
|---|---|---|
| Dimmed word opacity | `rgba(255,255,255,0.12)` | Visible enough to see the text shape (reader can scan ahead) but dim enough that highlighted words pop. 0.05 is invisible on some monitors. 0.25 is too readable. |
| Highlighted word color | `rgba(255,255,255,1.0)` or `rgba(255,255,255,0.85)` | Full or near-full brightness. The jump from 0.12 to 1.0 is the entire effect. |
| Color transition duration | 250ms | Fast enough to feel responsive to scroll, slow enough to not strobe. 100ms strobes at fast scroll speeds. 500ms lags behind scroll. |
| Scroll budget per word | 5-8vh | At natural scroll pace (~1 viewport per 1.2s), 6vh means roughly 70ms per word. Average reading speed is 4-5 words/second, so this is slightly slower than natural reading, which creates the guided-pacing feel. |
| Font size | `clamp(1.5rem, 4vw, 2.75rem)` | Large enough to fill the viewport as the centerpiece. Body text size (1rem) is too small for this treatment. |
| Line height | 1.4 | Generous for large display text. 1.2 is too tight for word-span wrapping. |
| Scrub smoothing | `scrub: 0.3` | Tight. The highlight must track scroll position closely. 0.5+ creates visible lag between scroll and highlight. |
| Power curve exponent | 0.85 | Slightly front-loads the pace. Linear (1.0) makes the ending feel fast because the last few words get the same scroll budget as the first. 0.85 gives the ending 15% more scroll budget. |
| Active word accent | Color shift or none | A color accent on the single active word (vs. just highlighted) helps the reader track their position. Optional but recommended for 30+ word texts. |

## Variants

### 1. Typewriter reveal (words appear, not just highlight)
Words start as invisible (`opacity: 0`) instead of dimmed. They appear as if being typed. More dramatic but the reader cannot scan ahead, which can be frustrating for fast readers.

### 2. Background color sweep
Instead of changing text color, a colored background rectangle sweeps across the text line by line. Implemented with a `::before` pseudo-element on a line-level wrapper, driven by `scaleX()` scrub. Visually distinct from word highlighting but requires line-level splitting (more complex).

### 3. Dual-language parallel
Two text blocks side by side (original and translation). Words highlight synchronously across both. The scroll budget is based on the longer text. Useful for poetry translation or bilingual content.

### 4. Light theme
Swap dark background for cream/white. Dimmed words become light gray (`rgba(0,0,0,0.12)`). Highlighted words become black. Works better for editorial/magazine contexts.

### 5. Progressive blur
Instead of opacity dimming, unhighlighted words are blurred (`filter: blur(3px)`). Highlighted words are sharp. More visually dramatic but `filter: blur` is paint-triggering and more expensive than opacity. Use `will-change: filter` and limit to 50 words max.

## Performance budget

| Target | Threshold | Lever |
|---|---|---|
| Frame time during scrub | < 16ms | The scroll handler toggles classes on N word spans. For 50 words, this is trivial. For 200+ words, batch updates with `requestAnimationFrame` and avoid per-word `getComputedStyle`. |
| DOM nodes | < 500 spans | Each word is one `<span>`. A 200-word text creates 200 spans. Beyond that, consider sentence-level granularity instead. |
| Layout recalculation | 0 per frame | The highlight changes `color` (paint-only) or `opacity` (compositor). No width, height, or font-weight changes that trigger layout. If using font-weight accent, use `font-variation-settings` on a variable font to avoid layout shift. |
| Bundle (JS) | < 25 KB gzipped | GSAP core + ScrollTrigger. SplitText is optional (manual split is 20 lines of JS). |
| CLS | 0 | No dimensions change. The section has explicit height. Word spans do not reflow. |

## Accessibility

### prefers-reduced-motion
All text shows at full opacity. No splitting, no dimming, no scroll-driven highlighting. The section height reverts to auto (no scroll budget needed). The text is a normal static block.

### Screen reader
- The `.reading-text` container has `aria-label` containing the full unsplit text. This is critical because the split word spans can interfere with screen reader pronunciation.
- Individual word spans do not have ARIA roles or labels. They are presentational.
- The section has `aria-label="Progressive reading: [title]"`.

```html
<div class="reading-text" id="reading-text"
     aria-label="We build the tools that builders need. Not the tools that look good in demos...">
```

### Keyboard
No custom keyboard handling. The page scrolls naturally. The highlight follows scroll position. No focus trapping.

### Contrast
The dimmed text (`rgba(255,255,255,0.12)` on `#0a0a0a`) does not meet WCAG contrast ratios. This is acceptable because:
1. The dimmed text is intentionally below readable contrast (it is decorative context, not readable content).
2. The full text is available via `aria-label` on the container.
3. prefers-reduced-motion shows all text at full contrast.
4. The highlighted text (full white on dark) exceeds 7:1 contrast ratio (AAA).

### Honest cost
Users who cannot perceive the progressive highlighting get the full text at readable contrast. The guided pacing is lost, but the content is identical. This is a visual pacing tool, not a content gate.

## Anti-slop rules
1. DO NOT split text into character-level spans for word highlighting. Character splitting creates hundreds of spans for a short paragraph and breaks word-level CSS transitions. Word-level spans are the minimum viable unit.
2. DO NOT use `opacity` for the dim/highlight state. Use `color` with RGBA. `opacity` on a word span can cause compositing issues when spans overlap (line-height collisions) and makes the word's cursor/selection invisible. `color` change is simpler and cheaper.
3. DO NOT set dimmed word opacity below 0.08. Below that threshold, the text shape is invisible on most monitors, and the reader cannot scan ahead at all. The preview of upcoming text is part of the reading experience.
4. DO NOT use `font-weight` as the highlight differentiator without a variable font. Changing `font-weight` on a non-variable font triggers layout recalculation for every word, every scroll frame. Layout thrash at 60fps.
5. DO NOT apply this to text with inline links, buttons, or interactive elements. A dimmed `<a>` tag is invisible and unusable. If the text has links, use paragraph-level highlighting instead and ensure the active paragraph's links are always at full contrast.
6. DO NOT set scroll budget below 150vh for any word count. Even a 10-word sentence needs at least 150vh to avoid the highlight racing past faster than the reader can follow.
7. DO NOT use `scrub: true` (no smoothing). The highlight will jump erratically on trackpad/scroll-wheel input. `scrub: 0.2-0.4` smooths the jitter.
8. DO NOT highlight backwards from the end. The highlight must progress from the first word to the last, matching reading direction. Right-to-left languages need RTL-aware highlighting.
9. DO NOT skip the `aria-label` on the text container. Without it, screen readers announce each word span individually, which is unusable.
10. DO NOT use this technique on a page that also has smooth scroll (Lenis/scrollbar hijacking) without testing the scrub feel. Smooth scroll adds its own interpolation on top of ScrollTrigger's `scrub` interpolation, which can make the highlight feel sluggish. Tighten `scrub` to 0.15-0.2 when Lenis is active.

## Integration notes
- **`gsap-splittext-kinetic-type`**: SplitText can handle the word splitting. If already using SplitText for other text animations on the page, reuse the same split (do not split twice). SplitText preserves the original text node for reverting.
- **`scroll-progress-storytelling`**: The act-based pacing model applies. Map acts to `data-act` attributes on paragraphs, and use the `easeReadingPaceWithActs` function to vary scroll budget per act.
- **`lenis-smooth-scroll`**: Lenis adds interpolation that compounds with ScrollTrigger's `scrub` smoothing. Tighten `scrub` when Lenis is active. See anti-slop rule 10.
- **`sticky-pinning-sequences`**: The reading section uses CSS `position: sticky`, not GSAP pin. No conflict.
- **`scroll-data-story-charts`**: Can combine: a data story where the narrative text section uses progressive highlighting and the chart section uses step-driven transitions. The text section would be one "chapter" of the larger story.
- **Known conflict**: If the page has a fixed header that covers the top of the viewport, the sticky text container needs a `top` offset equal to the header height. Otherwise the text tucks under the header.

## Ship checklist
- [ ] Words highlight progressively from first to last as the user scrolls
- [ ] Dimmed words are visible but clearly below readable contrast
- [ ] Highlighted words are at full contrast (white on dark or black on light)
- [ ] Scrolling up reverses the highlight (words dim back)
- [ ] Scroll budget is proportional to word count (not a fixed section height)
- [ ] At least one pacing variation exists (hook faster, climax slower) or a consistent power-curve ease
- [ ] `aria-label` on the text container contains the full unsplit text
- [ ] prefers-reduced-motion: all text visible, no splitting, no sticky
- [ ] Mobile: section height shortens, font size adjusts
- [ ] No layout shift from word splitting (spans do not change line breaks)
- [ ] No `font-weight` toggling on non-variable fonts
- [ ] Color transition is 200-300ms (no strobe, no lag)
- [ ] Text has no inline interactive elements (links, buttons)
