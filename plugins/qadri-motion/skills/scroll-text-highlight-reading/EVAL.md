---
name: scroll-text-highlight-reading-eval
description: Use when verifying that scroll-text-highlight-reading was actually implemented correctly. Adversarial audit, not a summary.
pairs_with: scroll-text-highlight-reading
---

# Eval: Progressive Text Highlight Reading Experience

## What this audits
The most common failure is text that fades in paragraph by paragraph (a basic scroll reveal, not a progressive highlight), with no word-level or sentence-level granularity, no scroll-scrubbed progress, and no dimmed-to-highlighted state distinction. The result is a blog post with intersection observers, not a guided reading experience.

## Evidence required
- The built HTML file in a browser at 1440px wide
- DevTools Elements panel showing individual `<span class="word">` elements within the text
- Scroll recording showing words/sentences progressively illuminating from first to last
- Computed color values on a dimmed word vs. a highlighted word
- Console output from automated checks
- prefers-reduced-motion emulation showing all text at full opacity
- The `aria-label` attribute on the text container

## Automated checks

```js
// Paste in DevTools console with the page loaded

// 1. Text is split into word spans
const words = document.querySelectorAll('.word');
console.assert(words.length >= 10, `FAIL: Only ${words.length} word spans. Text may not be split.`);

// 2. Word spans have data-index attributes
const hasIndexes = Array.from(words).every(w => w.hasAttribute('data-i'));
console.assert(hasIndexes, 'FAIL: Word spans missing data-i attributes.');

// 3. Some words are highlighted, some are dimmed (mid-scroll check)
const highlighted = document.querySelectorAll('.word.is-highlighted');
const dimmed = document.querySelectorAll('.word:not(.is-highlighted)');
console.log(`Highlighted: ${highlighted.length}, Dimmed: ${dimmed.length}`);
// At mid-scroll, both counts should be > 0

// 4. Dimmed word color is significantly different from highlighted
if (words.length > 0) {
  const dimColor = getComputedStyle(words[words.length - 1]).color;
  const hlWord = document.querySelector('.word.is-highlighted');
  const hlColor = hlWord ? getComputedStyle(hlWord).color : null;
  console.log(`Dimmed color: ${dimColor}, Highlighted color: ${hlColor}`);
  // dimColor should have low alpha or low brightness
}

// 5. Container has aria-label with full text
const container = document.getElementById('reading-text');
const ariaLabel = container?.getAttribute('aria-label');
console.assert(ariaLabel && ariaLabel.length > 20,
  `FAIL: Text container aria-label is missing or too short: "${ariaLabel?.slice(0, 30)}..."`);

// 6. Section has explicit height for scroll budget
const section = document.getElementById('reading-section');
const height = getComputedStyle(section).height;
const viewportHeight = window.innerHeight;
const sectionVh = parseInt(height) / viewportHeight * 100;
console.assert(sectionVh >= 150, `FAIL: Section height is ${Math.round(sectionVh)}vh. Need at least 150vh for scroll budget.`);

// 7. Sticky container exists
const pinned = document.querySelector('.reading-pinned');
const position = getComputedStyle(pinned).position;
console.assert(position === 'sticky', `FAIL: Reading container is ${position}, not sticky.`);

// 8. No interactive elements inside the highlighted text
const links = container?.querySelectorAll('a, button, input, select');
console.assert(!links?.length, `FAIL: ${links?.length} interactive elements found inside highlighted text. These become unusable when dimmed.`);

// 9. Font size is display-level, not body
const fontSize = parseFloat(getComputedStyle(container?.querySelector('.reading-paragraph')).fontSize);
console.assert(fontSize >= 20, `FAIL: Font size is ${fontSize}px. Need 20px+ for display text treatment.`);

console.log('Automated checks complete.');
```

## Manual inspection protocol

1. Scroll from the top of the reading section to the bottom. Observe words highlighting progressively from the first word to the last. FAIL if words highlight in chunks (paragraph by paragraph) rather than individually.

2. At mid-scroll, verify that words before the active position are highlighted and words after are dimmed. FAIL if all words are the same brightness.

3. Scroll back up. Verify that previously highlighted words dim back. FAIL if highlights are permanent (do not reverse).

4. Check the transition speed: scroll quickly through the section. Words should track scroll position without visible lag (less than 200ms delay). FAIL if the highlight lags behind scroll by more than 300ms.

5. Check the dimmed word visibility. They should be faintly visible (the reader can see the text shape and scan ahead) but clearly below readable contrast. FAIL if dimmed words are invisible or fully readable.

6. Read the text in the `aria-label` attribute on the container. It must contain the full, unsplit text. FAIL if it is missing or contains only a title/summary.

7. Enable prefers-reduced-motion. Reload. Verify all text is at full opacity, no word splitting occurs (or if split, all words are highlighted), and the section is not sticky. FAIL if any text is dimmed or the scroll budget persists.

8. On mobile (375px), verify the text is readable and the scroll budget is shorter. FAIL if the section height is the same as desktop.

## Scoring rubric

| # | Criterion | Weight | 0 (Fail) | 1 (Partial) | 2 (Pass) |
|---|---|---|---|---|---|
| 1 | Word-level granularity | 20 | Paragraph-level or no highlighting | Sentence-level only | Word-level progressive highlighting |
| 2 | Scroll-scrubbed progress | 15 | Threshold-triggered (binary) | Scrubbed but with visible lag (>300ms) | Smooth scrub (<200ms lag), tracks scroll position |
| 3 | Dim-to-highlight contrast | 10 | No contrast difference | Slight difference (0.3 vs 0.7 opacity) | Clear difference (0.12 vs 1.0 opacity or equivalent) |
| 4 | Bidirectional (reverse on scroll-up) | 10 | Highlights do not reverse | Some words reverse, others stick | Full reversal, all words dim on scroll-up |
| 5 | Scroll budget proportionality | 10 | Fixed height regardless of word count | Height set but too short (<150vh) or too long (>600vh) | Proportional to word count (5-8vh per word) |
| 6 | Aria-label with full text | 10 | Missing or trivial | Present but incomplete | Full unsplit text in aria-label |
| 7 | Reduced motion | 10 | Text hidden or animations play | Text visible but section still sticky | All visible, no animation, no sticky |
| 8 | Display-level typography | 5 | Body text size (<18px) | Large but cramped (tight line-height) | 24px+ with 1.3-1.5 line-height |
| 9 | No interactive elements dimmed | 5 | Links/buttons inside highlighted text | Links present but always visible | No interactive elements in highlighted text |
| 10 | Performance (no layout thrash) | 5 | Font-weight toggling on non-variable font | Color change but with forced reflow | Color-only transitions, no layout recalculation |

**Total: 100 points. Ship threshold: 75.**

## Common false passes

1. **"Word-level" splitting but the highlight applies per paragraph.** Words are wrapped in spans, but the ScrollTrigger uses paragraph-level `onEnter` callbacks that highlight all words in a paragraph simultaneously. The spans exist but are never individually addressed.

2. **Highlight "scrubs" but it is actually a CSS transition on a class toggle.** The words get `.is-highlighted` via an IntersectionObserver at 50% threshold. The CSS transition makes it look smooth, but it is binary (dimmed or highlighted), not proportional to scroll position.

3. **Scroll budget is fixed at 300vh regardless of word count.** A 10-word sentence gets 300vh (the highlight moves at a glacial pace, 30vh per word). A 100-word paragraph also gets 300vh (the highlight races through at 3vh per word). Neither is calibrated.

4. **aria-label exists but it is the section title, not the text content.** `aria-label="Progressive reading"` tells the screen reader nothing about what the text says. The label must contain the full unsplit text.

5. **Reverse "works" but only on the most recently highlighted word.** The implementation tracks `currentIndex` and only removes `is-highlighted` from that one word on scroll-up. Words before it remain highlighted permanently. Full reversal requires re-evaluating all words on every scroll tick.

6. **Font-weight is used as the highlight accent, but the font is not variable.** Each scroll tick toggles `font-weight: 400` to `font-weight: 700` on word spans. This triggers layout recalculation for every word, every frame. On a 50-word text, this is 50 layout recalcs per scroll event.

7. **Reduced motion "disables" the highlighting but the section still has 300vh height.** The text shows at full opacity, but the user must scroll through 300vh of empty space because the section height was not reset to auto.

## Required fixes by failure mode

| Failure | Root cause | Fix |
|---|---|---|
| Paragraph-level, not word-level | ScrollTrigger per paragraph, not per word | Use a single ScrollTrigger with scrub, map progress to word index |
| Binary (not scrubbed) | IntersectionObserver with threshold toggle | Switch to ScrollTrigger with `scrub: 0.3` and `onUpdate` callback |
| Scroll budget not proportional | Hardcoded section height | Calculate `height = wordCount * 6 + 'vh'`, clamped to 200-500vh |
| aria-label missing full text | Only title or nothing | Set `aria-label` to the container's `textContent` before splitting |
| Highlights do not reverse | Only tracking forward progression | Re-evaluate all word spans on every `onUpdate` tick, not just incrementing |
| Layout thrash from font-weight | Non-variable font weight toggle | Use `color` change only, or switch to a variable font with `font-variation-settings` |
| Reduced motion still has scroll budget | Section height not reset | CSS `@media (prefers-reduced-motion: reduce) { .reading-section { height: auto } }` |

## Verdict format
```
TEXT HIGHLIGHT AUDIT
Score: XX/100
Threshold: 75

| # | Criterion              | Score | Notes |
|---|------------------------|-------|-------|
| 1 | Word-level granularity | X/20  |       |
| ...                                        |

Blocking issues:
- [list any criterion scoring 0]

Verdict: SHIP / NO SHIP
```
