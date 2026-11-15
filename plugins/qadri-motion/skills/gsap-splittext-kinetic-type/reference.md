# GSAP SplitText reference

## SplitText.create vars
| Option | Type | Note |
|---|---|---|
| `type` | comma string: any of `'chars'`, `'words'`, `'lines'` | Splitting only the levels you need reduces DOM node count. |
| `linesClass` / `wordsClass` / `charsClass` | string | Applied to every generated wrapper at that level; append `++` (e.g. `'line++'`) to auto-increment a numeric suffix per instance. |
| `mask` | `'lines'` \| `'words'` \| `'chars'` | Auto-wraps that level in an `overflow:hidden` container for reveal masking. |
| `autoSplit` | boolean | Re-splits automatically on resize and font load. |
| `reduceWhiteSpace` | boolean (legacy option name may vary by version) | Controls whitespace handling between split units; check installed version's default. |
| `onSplit(self)` | function | Called after every split/re-split; return a tween/timeline to have it managed and re-run automatically by SplitText on each re-split. |
| `aria` | `'auto'` \| `'none'` | Controls whether SplitText manages ARIA attributes automatically. |
| `tag` | string | HTML tag used for generated wrapper elements, default `div`/`span` depending on level. |

## Instance properties and methods
| Member | Type | Note |
|---|---|---|
| `split.chars` | `HTMLElement[]` | In document order. |
| `split.words` | `HTMLElement[]` | In document order. |
| `split.lines` | `HTMLElement[]` | In document order. |
| `split.revert()` | method | Restores original DOM/text, removing all wrappers. |
| `split.split(vars)` | method | Manually re-run split with new or same vars. |
| `split.isSplit` | boolean | Whether the instance currently holds a valid split (false right after `revert()`). |

## Additional recipes

### Re-triggering an entrance animation cleanly every time autoSplit re-splits on resize
```js
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
gsap.registerPlugin(SplitText);

document.fonts.ready.then(() => {
  SplitText.create('.responsive-headline', {
    type: 'lines',
    mask: 'lines',
    autoSplit: true,
    onSplit(self) {
      // returning a tween here means SplitText handles killing the previous
      // one and replaying this one automatically after every re-split
      return gsap.from(self.lines, {
        yPercent: 100,
        duration: 0.6,
        stagger: 0.07,
        ease: 'power3.out',
      });
    },
  });
});
```

### Manual re-split without autoSplit (fine-grained control over when it happens)
```js
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
gsap.registerPlugin(SplitText);

let split;

function buildSplit() {
  split = SplitText.create('.headline', { type: 'lines', mask: 'lines' });
  gsap.from(split.lines, { yPercent: 100, duration: 0.6, stagger: 0.06 });
}

document.fonts.ready.then(buildSplit);

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    split.revert();
    buildSplit();
  }, 200);
});
```

### Combining char and line splits in the same instance for compound choreography
```js
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
gsap.registerPlugin(SplitText);

document.fonts.ready.then(() => {
  const split = SplitText.create('.hero-title', { type: 'lines,chars', mask: 'lines' });

  const tl = gsap.timeline();
  tl.from(split.lines, { yPercent: 100, duration: 0.01 }) // sets mask baseline instantly
    .from(split.chars, {
      opacity: 0,
      y: 20,
      duration: 0.4,
      stagger: 0.015,
      ease: 'power2.out',
    }, 0);
});
```

### Cleanup pattern for a React-style component unmount
```js
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
gsap.registerPlugin(SplitText);

function mountKineticHeadline(el) {
  let split;
  let tween;
  document.fonts.ready.then(() => {
    split = SplitText.create(el, { type: 'chars' });
    tween = gsap.from(split.chars, { opacity: 0, y: 16, stagger: 0.02, duration: 0.4 });
  });

  return function cleanup() {
    tween?.kill();
    split?.revert();
  };
}
```

## Gotchas
- Splitting text that contains inline formatting (`<strong>`, `<a>`, `<em>`) works but the split output nests wrappers inside the formatting element's own structure; verify visually that character/word wrappers do not break intended inline styling boundaries, especially for links (a split link's clickable area should still cover the whole word).
- `mask: 'lines'` sets `overflow: hidden` on the generated line wrapper, which also clips any content that visually overflows the line's box (e.g. descenders on certain fonts, or box-shadow on inline elements); check descender-heavy fonts (y, g, p, q) are not visibly clipped at the mask boundary.
- Re-splitting (`autoSplit` or manual) inside a container with active CSS transitions on the text itself can cause a visible flash as the DOM is torn down and rebuilt; disable competing CSS transitions on elements you plan to SplitText-manage.
- `split.chars`/`split.words`/`split.lines` array REFERENCES become stale after a re-split; any code holding onto the array from before a resize-triggered re-split is animating detached nodes. Always read `self.lines`/`self.chars` fresh inside the `onSplit` callback rather than capturing them once outside.
- Fixed/absolute positioned ancestors, `white-space: nowrap`, and CSS `text-overflow: ellipsis` can all interact unexpectedly with line splitting since SplitText needs normal text flow to measure line breaks; test in the actual production layout context, not an isolated sandbox with different CSS.
- SplitText's internal ARIA handling assumes it owns the full original text content; injecting or removing text nodes into a container after splitting (e.g. a live-updating counter alongside static split text in the same element) is unsupported and will produce mismatched accessible text.
- Icon fonts or ligature-heavy fonts (some emoji, some non-Latin scripts with complex shaping) can split incorrectly at the character level, since "character" as SplitText defines it is a Unicode code point boundary, not necessarily a rendered-glyph boundary; test character splitting specifically with any non-Latin or ligature-using typeface before shipping.
