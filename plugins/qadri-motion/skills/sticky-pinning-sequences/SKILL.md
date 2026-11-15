---
name: sticky-pinning-sequences
description: Use when an element must stay fixed in the viewport while surrounding content scrolls past it, whether via plain CSS position:sticky for simple cases or GSAP ScrollTrigger pin for scrubbed multi-stage sequences, nested pins, or pin-then-release choreography.
---

# Sticky / Pinning Sequences

## When to use this
- A single element (image, chart, sidebar nav) should stick in place while its sibling content scrolls, and you don't need scrubbed animation tied to the pin duration: use plain CSS `position: sticky`.
- A pinned element needs to visually change (fade, morph, reveal text) in sync with how far the user has scrolled *through* the pinned duration, not just sit there: this needs GSAP ScrollTrigger's `pin` option, since native `sticky` has no progress signal.
- You need a pin-then-release sequence: element pins, something happens, then it releases and scrolls away normally to make room for the next pinned section.
- You have nested or stacked pins (a pinned parent section containing its own pinned sub-elements) and need to reason about pin-spacing so later content does not overlap or leave dead gaps.
- Do NOT use this for horizontal-scroll-driven-by-vertical-input galleries; that is a specific pin variant covered in `horizontal-scroll-gallery`. Do NOT use GSAP pinning when plain CSS sticky achieves the same visual result with no JS; reach for GSAP only when you need scroll-progress-driven property changes during the pin.

## Mental model
`position: sticky` is a layout mode, not a scroll listener: the browser itself decides, purely from CSS box positioning, when the element switches from "in normal flow" to "stuck at its `top`/`bottom` offset relative to its nearest scrolling ancestor," and switches back once its containing block's edge scrolls past. It is compositor-cheap and requires zero JS, but gives you no hook into "how far through being stuck are we" — you only get a binary stuck/unstuck state (detectable via IntersectionObserver on a sentinel element if you need to know, but there's no built-in progress).

GSAP ScrollTrigger's `pin: true` fakes the same visual result differently: it takes the element out of flow, sets it to `position: fixed` (or `absolute` depending on context) for the trigger's active duration, and crucially inserts a spacer element into the document with height equal to the pin's scroll duration, so the rest of the page's layout does not collapse when the pinned element stops taking up flow space. This spacer (`pin-spacing`) is the single most important, most misunderstood mechanic in ScrollTrigger pinning: the pin's `end` value determines how tall that spacer is, and if you get `end` wrong, either later content jumps up awkwardly (spacer too short) or there's a dead unscrollable gap (spacer too tall, nothing animating during a leftover chunk of pinned scroll).

Because ScrollTrigger's pin gives you `self.progress` (0 to 1 across the pin's active scroll range), you can drive any property change in lockstep with how far the user has scrolled through the pin, which is what makes multi-stage "pin, then reveal three things one after another, then release" sequences possible; native sticky cannot do this without pairing it with a separate scroll-timeline (see `css-scroll-driven-animations`) for the progress-driven part.

Nested pins (a pin inside another pinned container) work but stack spacers: the outer pin's spacer must already account for the inner pin's full duration, or the outer section releases before the inner sequence finishes. Always build and measure the innermost pin's total scroll distance first, then set the outer pin's `end` to be at least that long.

## Setup
```bash
npm install gsap@3.12.5
```
```js
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)
```
No install needed for plain CSS sticky.

## Core API
| API | Signature | Note |
|---|---|---|
| `position: sticky` | CSS | needs a `top`/`bottom` value and a defined-height parent to unstick from |
| `ScrollTrigger.create({ pin, trigger, start, end })` | config | `pin: true` pins the trigger element itself; `pin: '.other-el'` pins a different element |
| `pinSpacing` | `true \| false \| 'margin'` | whether/how ScrollTrigger inserts a spacer; `false` when you manage height yourself (e.g. beat already has explicit vh) |
| `pinType` | `'fixed' \| 'transform'` | `'transform'` needed inside `overflow` or `transform`-having ancestors where `position: fixed` breaks |
| `pinReparent` | `boolean` | reparents pinned element to `<body>` during pin, fixes some z-index/stacking-context bugs |
| `anticipatePin` | `0-1` | pre-pins slightly early to avoid a 1-frame jump on fast scroll/flicks |
| `self.progress` | getter inside callbacks | 0-1 through the pin's active scroll range |
| `onUpdate(self)` | callback | fires every scroll tick while pin is active |
| `onEnter` / `onLeave` / `onEnterBack` / `onLeaveBack` | callbacks | fire at pin boundaries, both scroll directions |
| `ScrollTrigger.refresh()` | method | recompute all pin spacer heights after layout changes |
| `ScrollTrigger.matchMedia()` | method | conditionally create/destroy pins per breakpoint (e.g. no pin on mobile) |

## Recipes

### Plain CSS sticky sidebar (no JS)
A table-of-contents nav sticks below a fixed header while article content scrolls past it.
```css
.article-layout {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 48px;
  align-items: start;
}
.toc-sidebar {
  position: sticky;
  top: 96px; /* fixed header height + gap */
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}
```

### Basic GSAP pin with a scrubbed reveal
Element pins for 100% of viewport height of scroll distance while its content fades in and out.
```js
gsap.timeline({
  scrollTrigger: {
    trigger: '.pin-section',
    start: 'top top',
    end: '+=100%', // pin lasts one full viewport height of scroll
    pin: true,
    scrub: 0.4,
  },
})
  .fromTo('.pin-content', { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.5 })
  .to('.pin-content', { opacity: 0, scale: 1.1, duration: 0.5 })
```

### Multi-stage pin-then-release sequence
Pins a section for 300% scroll height, reveals three sequential captions, then releases normally.
```js
const stages = gsap.utils.toArray('.stage-caption')

gsap.timeline({
  scrollTrigger: {
    trigger: '.multi-stage-section',
    start: 'top top',
    end: '+=300%',
    pin: true,
    scrub: 0.5,
    anticipatePin: 1,
  },
})
  .set(stages, { opacity: 0, y: 20 })
  .to(stages[0], { opacity: 1, y: 0, duration: 0.15 })
  .to(stages[0], { opacity: 0, y: -20, duration: 0.15 }, '+=0.35')
  .to(stages[1], { opacity: 1, y: 0, duration: 0.15 })
  .to(stages[1], { opacity: 0, y: -20, duration: 0.15 }, '+=0.35')
  .to(stages[2], { opacity: 1, y: 0, duration: 0.15 })
```

### Pinning a different element than the trigger
Pins a fixed visual panel while an unrelated scrolling text column drives its state, common in split-screen scrollytelling layouts.
```js
gsap.timeline({
  scrollTrigger: {
    trigger: '.text-column',    // scroll distance measured from this
    pin: '.visual-panel',       // but this element is what gets pinned
    start: 'top top',
    end: 'bottom bottom',
    scrub: 0.6,
  },
})
  .to('.visual-panel .layer-1', { opacity: 0 })
  .to('.visual-panel .layer-2', { opacity: 1 }, '<')
```

### Nested pins (outer section pins while an inner element runs its own pinned sub-sequence)
Outer pin's `end` is computed to match the inner pin's full duration so release timing lines up.
```js
const innerDuration = '+=250%'

ScrollTrigger.create({
  trigger: '.inner-pin-target',
  start: 'top top',
  end: innerDuration,
  pin: true,
  scrub: 0.4,
  onUpdate: (self) => {
    gsap.set('.inner-visual', { rotate: self.progress * 180 })
  },
})

// outer pin must be at least as long as the inner one, plus its own intro/outro
ScrollTrigger.create({
  trigger: '.outer-section',
  start: 'top top',
  end: '+=350%', // 250% for inner + 100% buffer for outer-level transition
  pin: true,
  pinSpacing: true,
})
```

### Responsive pin that disables on mobile
Pins on desktop but falls back to normal static stacked layout on small screens, using `matchMedia`.
```js
ScrollTrigger.matchMedia({
  '(min-width: 900px)': function () {
    gsap.timeline({
      scrollTrigger: {
        trigger: '.pin-section',
        start: 'top top',
        end: '+=150%',
        pin: true,
        scrub: 0.5,
      },
    }).to('.pin-content', { xPercent: -50 })
  },
  '(max-width: 899px)': function () {
    // no pin, no scrub: content just flows naturally, maybe a lighter fade-in
    gsap.from('.pin-content', {
      opacity: 0,
      y: 30,
      scrollTrigger: { trigger: '.pin-content', start: 'top 85%' },
    })
  },
})
```

## Tuning the feel
- Pin duration in vh should match content density: a single-idea pin (one caption revealing) needs 80-120% viewport height; a 3-stage sequence needs 250-350%. Under-budgeting duration makes stages flash past; see `scroll-progress-storytelling` for the general pacing method.
- `scrub: 0.3-0.6` (a number, not `true`) adds a small smoothing lag between scroll input and animation playhead, which reads as more physical than instant 1:1 scrub (`scrub: true`); use `true` only when frame-perfect sync matters more than smoothness (e.g. syncing to an image sequence frame index).
- `anticipatePin: 1` on any pin that follows a fast-scrollable region; without it, fast flicks can show a one-frame jump as the browser catches up to where the pin should have already engaged.
- Release transitions (the moment a pin ends and content resumes normal scroll) feel best when the last stage's exit animation completes just before the pin's `end` point, not exactly at it; leave 5-10% of the pin's range as a "settled" buffer with no animation change so the release doesn't feel like it's cutting off motion.

## Performance
- `pin: true` with `pinType: 'fixed'` is compositor-cheap (equivalent to `position: fixed`, no layout recalculation per frame) as long as you only animate `transform`/`opacity` inside the pin's `onUpdate`.
- Every pin inserts a spacer `<div>` into the DOM; a page with 15+ pins should call `ScrollTrigger.refresh()` exactly once after all are created and after images/fonts load, not per-pin, since refresh recomputes every trigger's measurements.
- `pinReparent: true` fixes stacking-context bugs but adds a DOM move cost on pin start/end; only enable it when you actually hit a z-index/overflow bug, not by default.
- Avoid pinning elements with large, complex child DOM (long article text, big SVGs with many paths) directly; pin a lighter wrapper and let the heavy content be a child, since layout thrashing risk scales with subtree complexity even under `position: fixed`.
- Debug pin spacer sizing visually with `ScrollTrigger.create({ ..., markers: true })` in development; remove markers before shipping.

## Accessibility
```js
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
ScrollTrigger.matchMedia({
  '(prefers-reduced-motion: no-preference)': function () {
    // full pin/scrub setup here
  },
  '(prefers-reduced-motion: reduce)': function () {
    // no pin: render final/settled state statically, content flows normally
    gsap.set('.pin-content', { opacity: 1, y: 0, rotate: 0 })
  },
})
```
- Pinned sections that hijack scroll for a long duration (300%+) can disorient keyboard users navigating with Page Down, since a single keypress may barely move the effective progress; ensure Page Down/Space still advances a meaningful visible amount, or provide a skip-section control.
- Never remove focusable interactive elements from the accessibility tree just because they are visually inside a pinned/faded stage; if a pinned stage contains a link or button, it must remain reachable by keyboard even if visually at opacity 0 outside its active window (or explicitly manage `tabindex`/`inert` to match visual state, deliberately, not accidentally).

## Anti-slop rules
- Never leave `end` as a guessed round number like `+=1000` without checking it against actual content; mismatched pin duration versus animation content produces the two classic failures (dead scroll with nothing changing, or content cut off before finishing).
- Never pin more than 3-4 sections back to back on one page without a genuine unpinned breathing section between them; back-to-back pins read as the page "fighting" the user's scroll.
- Never use `pin: true` when `position: sticky` alone achieves the same visual result with no scrubbed property change; this is needless JS and spacer overhead for a static-stick effect.
- Never forget `pinSpacing` interactions when a beat section already has an explicit CSS height (as in scrollytelling patterns); double-reserving scroll distance (both a tall section AND a full pin spacer) creates a large dead gap.
- Never ship a pin sequence without testing scroll-up (reverse direction); `onEnterBack`/`onLeaveBack` are often forgotten and stages that only animate forward look broken when a reader scrolls back up.
- Never nest more than 2 levels of pins; beyond that, spacer math becomes fragile and small content changes cascade timing bugs across the whole nested structure.
- Never pin on mobile by default; small viewports make long pinned sequences feel like the page is stuck, always test and usually disable or shorten via `ScrollTrigger.matchMedia`.

## Checklist
- [ ] Chose CSS sticky vs GSAP pin deliberately, not GSAP by default
- [ ] Pin `end` value matches actual content/animation duration, verified by scrubbing manually
- [ ] `anticipatePin` set on pins following fast-scrollable regions
- [ ] Forward AND reverse scroll direction both produce correct visual states
- [ ] Nested pins' outer `end` accounts for inner pin's full duration
- [ ] `ScrollTrigger.matchMedia` used to disable/shorten pins on mobile breakpoints
- [ ] `prefers-reduced-motion` renders a settled static state, no pin engaged
- [ ] Interactive elements inside pinned stages remain keyboard-reachable matching their visual state
- [ ] `ScrollTrigger.refresh()` called once after all pins created and assets loaded
- [ ] No dev `markers: true` left in shipped code
