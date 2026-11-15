---
name: scroll-chapter-pinned-story-eval
description: Use when verifying that scroll-chapter-pinned-story was actually implemented correctly. Adversarial audit, not a summary.
pairs_with: scroll-chapter-pinned-story
---

# Eval: Chapter-Pinned Narrative Scroll

## What this audits
The most common shipped failure is a page where the visual panel exists but transitions are all identical crossfades, chapter heights are uniform (100vh each regardless of text length), the pin breaks or leaves a dead gap on release, mobile still has GSAP pin active (janky touch scroll), and the counter/chart fires on every scroll frame instead of once on chapter enter.

## Evidence required
- The built page opened in Chrome at 1440px and 375px widths
- DevTools console output (zero errors)
- List of all `.visual-state` elements and their `data-chapter` attributes
- Computed `min-height` of each `.chapter` element (must vary by word count)
- DevTools Performance recording of a full scroll-through
- Mobile viewport (375px) confirming no GSAP pin active
- `prefers-reduced-motion: reduce` emulated, showing all content visible

## Automated checks

### Static source checks
```bash
# Every chapter has a matching visual-state
for id in $(grep -oP 'data-chapter="[^"]*"' index.html | sort -u); do
  count=$(grep -c "$id" index.html)
  echo "$id appears $count times"
done
# PASS: each chapter ID appears at least twice (once in text, once in visual)
# FAIL: any chapter ID appears only once (missing visual or missing text)

# No hardcoded 100vh on chapters (pacing should be computed)
grep -cE '\.chapter.*height.*100vh' style.css
# PASS: 0   FAIL: >= 1

# Transition variety: count distinct transition types in JS
grep -oP "transition.*=.*['\"](\w+)['\"]" main.js | sort -u | wc -l
# PASS: >= 3   FAIL: < 3

# prefers-reduced-motion exists
grep -c 'prefers-reduced-motion' style.css main.js
# PASS: >= 2 (once in CSS, once in JS)   FAIL: < 2
```

### Runtime checks
```js
// 1. Pin is active on desktop
const triggers = ScrollTrigger.getAll()
const pinned = triggers.filter(t => t.pin)
console.assert(pinned.length >= 1, 'FAIL: no pinned ScrollTrigger on desktop')

// 2. Chapter heights are not all identical
const chapters = document.querySelectorAll('.chapter')
const heights = [...chapters].map(c => c.getBoundingClientRect().height)
const allSame = heights.every(h => Math.abs(h - heights[0]) < 10)
console.assert(!allSame, 'FAIL: all chapter heights are identical (no pacing math)')

// 3. Only one visual-state has is-active at a time
const active = document.querySelectorAll('.visual-state.is-active')
console.assert(active.length <= 1, `FAIL: ${active.length} visual states active simultaneously`)

// 4. Visual panel has aria-live
const vis = document.querySelector('.story__visual')
console.assert(vis?.getAttribute('aria-live') === 'polite', 'FAIL: visual panel missing aria-live')

// 5. No horizontal overflow
console.assert(document.documentElement.scrollWidth <= window.innerWidth + 1, 'FAIL: horizontal scrollbar')

// 6. On mobile, no GSAP pin active
if (window.innerWidth <= 768) {
  const mobilePins = ScrollTrigger.getAll().filter(t => t.pin)
  console.assert(mobilePins.length === 0, 'FAIL: GSAP pin active on mobile viewport')
}
```

## Manual inspection protocol

1. Scroll through the full story on desktop. Watch each visual transition. FAIL if any two adjacent transitions are the same type (both fade, both slide-up, etc.).

2. Read the first chapter. Note the scroll distance. Read the last chapter. FAIL if a 10-word chapter takes the same scroll distance as a 100-word chapter.

3. Scroll backward through the story. FAIL if the previous visual state does not reappear when scrolling back into its chapter.

4. Stop scrolling mid-transition. FAIL if two visual states are both partially visible (the outgoing should fully exit before the incoming settles, or they should crossfade cleanly).

5. Resize to 375px. Scroll through. FAIL if the visual panel scrolls away (it should be sticky). FAIL if GSAP pin is active (check DevTools for `position: fixed` on `.story__visual`).

6. Emulate `prefers-reduced-motion: reduce`. Reload. FAIL if any visual state or chapter content is invisible.

7. Open DevTools Performance panel. CPU 4x throttle. Record a full scroll-through. FAIL if frame time exceeds 18ms for more than 5 consecutive frames.

8. Check that the counter animation (if present) fires exactly once when its chapter is entered. Scroll past and back. FAIL if it re-fires from zero on every chapter re-entry (it should restart from its held value or replay from the beginning cleanly).

## Scoring rubric

| # | Criterion | Weight | 0 (Fail) | 1 (Partial) | 2 (Pass) |
|---|---|---|---|---|---|
| 1 | Visual-text pairing | 15 | Missing visual states for some chapters | All paired but some visuals are placeholder/identical | Every chapter has a unique, content-relevant visual |
| 2 | Transition variety | 10 | All transitions identical | 2 distinct types | 3+ distinct types, no adjacent repeats |
| 3 | Pacing math | 15 | All chapters same height | Heights vary but not from word count | Computed from word count + visual complexity |
| 4 | Pin mechanics | 15 | No pin or pin breaks with gap | Pin works but spacer leaves dead gap | Pin holds for full story, clean release, no gap |
| 5 | Mobile fallback | 10 | Desktop experience on mobile | Sticky visual but no transition triggers | Sticky visual, IntersectionObserver triggers, simplified transitions |
| 6 | Reduced motion | 10 | Content hidden | Content visible but layout broken | All content visible, clean static flow |
| 7 | Scroll reversal | 10 | Scrolling back shows wrong visual | Visual reappears but transition direction is wrong | Correct visual reactivates with direction-aware transition |
| 8 | Performance | 5 | Consistent jank | Occasional drops | Smooth 60fps throttled |
| 9 | Visual-specific logic | 5 | No counters/charts, just images | Counters/charts present but fire every frame | Fire once on enter, hold on scroll, clean replay on re-enter |
| 10 | Progress indicator | 5 | None | Present but inaccurate | Tracks scroll position proportionally, chapter markers work |

**Total: 100 points. Ship threshold: 75.**

## Common false passes

1. **"All chapters transition"** -- but every transition is opacity fade. No variety. Count the distinct transition implementations.

2. **"Chapters have different heights"** -- but heights are manually set to 80vh, 100vh, 120vh without regard to word count. Check if a 15-word chapter and a 200-word chapter have the same height.

3. **"Pin works"** -- but on pin release, there is a 50-200px dead gap where nothing happens. Inspect the ScrollTrigger spacer element's computed height versus the text track's total height.

4. **"Mobile is different"** -- but the code only hides the pin visually. GSAP still creates the pin and inserts a spacer, causing layout shifts on touch scroll. Check for `position: fixed` on mobile viewport.

5. **"Counter animates"** -- but it fires on every scroll event via `onUpdate`. Scroll slowly back and forth across the climax chapter boundary. If the counter resets and replays rapidly, it is not gated to fire-once.

6. **"Reduced motion works"** -- but the CSS rule only affects transitions, not the JS that sets initial `opacity: 0`. On reduced-motion systems, visuals start invisible and stay invisible because no transition fires.

7. **"Scrolling back works"** -- but the transition direction is always "forward." Slide-up transitions play the same upward animation whether entering from below or re-entering from above.

## Required fixes by failure mode

| Failure | Root cause | Fix |
|---|---|---|
| All transitions identical | Single transition function, no rotation | Index chapters and cycle through transition array |
| Pin leaves dead gap | `end` not matched to text-track total height | Use `end: 'bottom bottom'` on text-track trigger |
| Chapter heights uniform | No pacing calculator | Apply `computeChapterVh()` with word count + visual complexity |
| Mobile jank | GSAP pin active on mobile | Gate pin creation behind `!IS_MOBILE` check |
| Counter re-fires continuously | Triggered in `onUpdate` instead of `onEnter` | Use `onEnter` / `onEnterBack` with a `fired` flag per chapter |
| Visual state leak | Previous state not fully hidden | `gsap.killTweensOf()` on both outgoing and incoming before transitioning |
| Scroll-back shows wrong visual | Only `onEnter`, no `onEnterBack` | Add `onEnterBack` callback to each chapter ScrollTrigger |

## Verdict format
```
SCORE: [total]/100

| # | Criterion | Points | Notes |
|---|---|---|---|
| 1 | Visual-text pairing | X/15 | ... |
| ... | ... | ... | ... |

BLOCKING ISSUES:
- [list any criterion scoring 0]

VERDICT: SHIP / NO SHIP
```
