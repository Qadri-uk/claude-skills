---
name: gsap-splittext-kinetic-type
description: Use when animating text at the character, word, or line level (kinetic type headlines, masked line reveals, per-letter stagger choreography) using GSAP's SplitText plugin, including handling resize/reflow re-splitting.
---

# GSAP SplitText

## When to use this
- A headline or paragraph needs to animate in per-character, per-word, or per-line rather than as one opaque block.
- You need masked line reveals (text sliding up out of a clipped box, a common "editorial" reveal style).
- You need choreographed per-character effects (wave, scramble-in, color sweep) that require each glyph as its own DOM node.
- You need the split to survive responsive reflow (line breaks change at different viewport widths) without stale, misaligned line wrappers.
- Do NOT use this for simple whole-block fade/slide of a text element; that is a plain tween in `gsap-core-timelines` and splitting text for a single uniform transform is unnecessary DOM overhead.

## Mental model
SplitText's job is to take a block of text and insert wrapper elements around characters, words, and/or lines so each becomes an independently animatable DOM node, then hand you back arrays of references to those nodes (`split.chars`, `split.words`, `split.lines`). Under the hood it does this by reading the text content, measuring rendered character/word/line boundaries via the browser's own layout engine (it must actually render the text first to know where line breaks fall, since that depends on font metrics and container width), and replacing the original text nodes with nested `<div>`/`<span>` wrappers positioned to render identically to the original.

Because line breaks are a layout-dependent fact (they change when the container resizes, font loads, or viewport changes), a SplitText line split is only valid for the container width it was measured at. This is why SplitText ships a `resize` handling story: as of the GSAP 3.13 SplitText rewrite, `SplitText.create()` supports an `autoSplit: true` option (or you re-run `.split()` manually) that automatically re-splits and re-renders on resize, preserving your animation setup rather than leaving stale line wrappers that no longer match the reflowed text.

For masked line reveals, the key structural detail is that SplitText's line-splitting wraps each line in an outer non-animated wrapper (used as the visual clip/mask boundary via `overflow: hidden`) and an inner animated element that actually moves; you must apply `overflow: hidden` yourself to the correct wrapper level (SplitText's `linesClass` targets the right element) for the visual mask effect, since SplitText handles the DOM structure but not your CSS.

Per-character choreography treats each `split.chars[i]` element as a normal GSAP tween target, so everything from `gsap-core-timelines` (stagger, position parameter, keyframes) applies directly; the only new mechanic is that "characters" now exist as real elements you can select and animate independently, and reading `split.chars.length` gives you the true glyph count for computing stagger timing.

## Setup
```bash
npm install gsap@^3.13
```
```js
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);
```
SplitText has been free (part of the standard `gsap` package) since GSAP 3.13 (2025); it was previously a Club GSAP paid plugin, so older guides referencing a separate license are outdated.

CDN:
```html
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/SplitText.min.js"></script>
```

Always split AFTER web fonts have loaded (`document.fonts.ready`), since splitting before the real font is applied measures line breaks against the fallback font's metrics and produces wrong line breaks once the real font swaps in.

## Core API
| API | Signature | Note |
|---|---|---|
| `SplitText.create(target, vars)` | returns `SplitText` instance | Preferred v3.13+ entry point; supports `autoSplit`. |
| `new SplitText(target, vars)` | returns `SplitText` instance | Older constructor form, still supported. |
| `vars.type` | `'chars,words,lines'` string | Comma list of which levels to split into. |
| `vars.linesClass` | string | CSS class applied to line wrapper elements, target this for `overflow: hidden` masking. |
| `vars.wordsClass` / `vars.charsClass` | string | CSS class applied to word/char wrapper elements. |
| `vars.autoSplit` | boolean | Automatically re-splits on resize/font load, updating `.chars/.words/.lines` references live. |
| `vars.mask` | `'lines'`, `'words'`, or `'chars'` | Automatically wraps the given level in an overflow-hidden mask container, replacing manual CSS masking setup. |
| `vars.onSplit(self)` | callback | Fires after every split (including re-splits on resize); return an animation here to re-trigger it cleanly on resize. |
| `split.chars` | array of elements | Per-character wrapper elements, in document order. |
| `split.words` | array of elements | Per-word wrapper elements. |
| `split.lines` | array of elements | Per-line wrapper elements. |
| `split.revert()` | instance method | Restores the original unsplit DOM/text content; call on cleanup/unmount. |
| `split.split(vars)` | instance method | Manually re-run the split (if not using `autoSplit`). |

## Recipes

### Masked line-by-line reveal (editorial headline style)
Each line slides up from behind a hidden mask as if wiping into view.
```js
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
gsap.registerPlugin(SplitText);

document.fonts.ready.then(() => {
  SplitText.create('.headline', {
    type: 'lines',
    mask: 'lines',
    autoSplit: true,
    onSplit(self) {
      return gsap.from(self.lines, {
        yPercent: 110,
        duration: 0.7,
        ease: 'power3.out',
        stagger: 0.08,
      });
    },
  });
});
```

### Per-character wave-in stagger
Each character rises into place in a rolling wave rather than a flat fade.
```js
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
gsap.registerPlugin(SplitText);

document.fonts.ready.then(() => {
  const split = SplitText.create('.kinetic-title', { type: 'chars' });

  gsap.from(split.chars, {
    yPercent: 100,
    opacity: 0,
    duration: 0.6,
    ease: 'power3.out',
    stagger: 0.02,
  });
});
```

### Word-level scale-and-fade for a subheading
Words pop in sequentially, a lighter-weight alternative to full character splitting.
```js
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
gsap.registerPlugin(SplitText);

document.fonts.ready.then(() => {
  const split = SplitText.create('.subhead', { type: 'words' });

  gsap.from(split.words, {
    opacity: 0,
    scale: 0.85,
    duration: 0.4,
    ease: 'back.out(1.5)',
    stagger: 0.05,
  });
});
```

### Scroll-triggered per-line reveal that survives resize
Combines SplitText's autoSplit with ScrollTrigger so re-splits on resize rebuild the trigger too.
```js
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(SplitText, ScrollTrigger);

document.fonts.ready.then(() => {
  SplitText.create('.section-heading', {
    type: 'lines',
    mask: 'lines',
    autoSplit: true,
    onSplit(self) {
      return gsap.from(self.lines, {
        yPercent: 100,
        duration: 0.6,
        stagger: 0.06,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: self.lines[0],
          start: 'top 85%',
          toggleActions: 'play none none reverse',
        },
      });
    },
  });
});
```

### Character scramble-in effect using random start rotation and delay
A more textured entrance where characters settle from random offsets rather than a uniform wave.
```js
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
gsap.registerPlugin(SplitText);

document.fonts.ready.then(() => {
  const split = SplitText.create('.glitch-title', { type: 'chars' });

  gsap.from(split.chars, {
    opacity: 0,
    y: () => gsap.utils.random(-30, 30),
    rotation: () => gsap.utils.random(-15, 15),
    duration: 0.5,
    ease: 'power2.out',
    stagger: { each: 0.015, from: 'random' },
  });
});
```

### Persistent split for hover-reactive characters (no entrance animation, ongoing interaction)
Each character independently reacts to mouse proximity, requiring char-level nodes to remain in the DOM.
```js
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
gsap.registerPlugin(SplitText);

document.fonts.ready.then(() => {
  const split = SplitText.create('.hover-title', { type: 'chars' });

  split.chars.forEach((char) => {
    char.addEventListener('mouseenter', () => {
      gsap.to(char, { y: -8, color: '#f97316', duration: 0.2, ease: 'power2.out' });
    });
    char.addEventListener('mouseleave', () => {
      gsap.to(char, { y: 0, color: 'inherit', duration: 0.3, ease: 'power2.out' });
    });
  });
});
```

## Tuning the feel
- Per-character stagger for short headlines (under ~20 characters): 0.02-0.03s each, `power3.out`, total spread under 600ms so the reveal still reads as one gesture, not a typewriter.
- Per-word stagger for subheadings/body intros: 0.04-0.07s each, fewer units means you can afford slightly longer per-item spacing without the sequence dragging.
- Masked line reveals: 0.5-0.8s duration per line, `power3.out` or `power4.out` for a confident wipe, staggered 0.06-0.1s between lines so multi-line headlines reveal as a cascading wipe rather than all lines moving in lockstep.
- Character counts above roughly 40-60 (a full sentence or more) should switch to word-level or line-level splitting instead of character-level; character stagger on long text either takes too long in total or requires such a tiny per-char delay that it reads as a fade rather than a wave.
- Random-from stagger (`from: 'random'`) works well for texture/energy (glitch, scramble feel) but should be reserved for shorter display text; on body-length text it reads as noisy rather than intentional.

## Performance
- SplitText at the character level creates one DOM element per glyph; a long paragraph split into characters can create hundreds of nodes. Reserve character-level splitting for short display text (headlines, short labels), and use word or line splitting for anything longer.
- `autoSplit: true` re-splits on resize, font load, and other layout-affecting events; if you also have your own resize listeners doing heavy work, coordinate them (debounce) so a resize does not trigger the split, your own layout logic, AND any dependent ScrollTrigger refresh redundantly in the same frame.
- Always call `split.revert()` when a component unmounts or the text is no longer animated; otherwise the split wrapper DOM persists and duplicates when re-split, and any attached ScrollTriggers or event listeners on `split.chars`/`split.lines` leak.
- Splitting text before web fonts finish loading is not just a visual-correctness bug, it is also a wasted re-layout cost; wait on `document.fonts.ready` so you split once against final metrics instead of splitting, then re-splitting after font swap.
- Prefer `transform`/`opacity` animations on split units (chars/words/lines) over anything that would force per-node layout recalculation; with hundreds of nodes from character splitting, a layout-triggering property compounds badly.

## Accessibility
```js
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
gsap.registerPlugin(SplitText);

document.fonts.ready.then(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  SplitText.create('.headline', {
    type: 'lines',
    mask: 'lines',
    autoSplit: true,
    onSplit(self) {
      if (prefersReduced) {
        return gsap.set(self.lines, { yPercent: 0 });
      }
      return gsap.from(self.lines, { yPercent: 110, duration: 0.7, stagger: 0.08, ease: 'power3.out' });
    },
  });
});
```
SplitText sets `aria-hidden` on the split character/word spans internally in recent versions and preserves an accessible copy of the original text so screen readers announce the sentence normally rather than character-by-character; verify this behavior in your installed version by inspecting the rendered markup (look for an `aria-label` on the outer split container mirroring the full original text). Never rely on split text nodes as the only content; if you must support older browsers/very old SplitText versions without built-in ARIA handling, add `aria-label` with the full original string on the container yourself and `aria-hidden="true"` on the split wrapper.

## Anti-slop rules
- Do not split text before `document.fonts.ready`; mismatched line breaks after font swap-in is one of the most common visible SplitText bugs in shipped sites.
- Do not character-split long paragraphs. Past roughly 40-60 characters, switch to word or line splitting; a character-level stagger across a full paragraph either takes absurdly long or the per-character delay becomes imperceptibly small, achieving nothing over a simple fade.
- Do not forget `split.revert()` on unmount in SPA frameworks; leftover split DOM nodes and dangling ScrollTrigger instances are a real, observable memory/behavior bug, not a theoretical one.
- Do not use masked line reveals without actually setting `overflow: hidden` on the correct wrapper; a "mask" reveal with no visible clip boundary is just an unclipped slide-in and looks like a mistake, not a stylistic choice.
- Do not apply the exact same stagger and ease to headline, subheading, and body text in the same section; differentiate pacing by text role (headline reveals boldest/slowest, body text fastest/subtlest) or the whole page reads as one uniform animation template.
- Do not skip handling resize entirely (no `autoSplit`, no manual re-split) for any text whose line count can change across breakpoints; stale line wrappers from an initial split will misalign badly on reflow.

## Checklist
- [ ] Split happens only after `document.fonts.ready`.
- [ ] `autoSplit: true` (or manual re-split on resize) implemented for any text whose line breaks vary across viewport widths.
- [ ] Character-level splitting reserved for text under ~60 characters; longer text uses word/line splitting.
- [ ] Masked line reveals have real `overflow: hidden` applied to the correct wrapper level.
- [ ] `split.revert()` called on component unmount/cleanup.
- [ ] `prefers-reduced-motion` fallback sets final visible state instead of running the stagger.
- [ ] Accessible text output verified (screen reader announces full sentence, not per-character).
- [ ] Stagger/ease pacing varies meaningfully between headline, subheading, and body text roles.
