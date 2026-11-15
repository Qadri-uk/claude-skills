# Reference: Chapter-Pinned Narrative Scroll

## Transition type catalog

| Transition | Out animation | In animation | Best for | Cost |
|---|---|---|---|---|
| `fade` | opacity 1 -> 0 (0.5s, power2.in) | opacity 0 -> 1 (0.6s, power2.out) | Image swaps, neutral chapters | Cheapest: compositor-only |
| `slide-up` | y: 0 -> -60, opacity -> 0 | y: 60 -> 0, opacity -> 1 | Sequential progression, timelines | Compositor-only |
| `crossfade` | opacity -> 0 (0.7s, power1.inOut) | opacity -> 1 (0.7s, overlapping) | Photo essays, before/after | Cheap, two layers briefly visible |
| `zoom-in` | scale: 1 -> 1.15, opacity -> 0 | scale: 0.9 -> 1, opacity -> 1 | Focus-in moments, climax chapters | Compositor-only |
| `slide-left` | x: 0 -> -80 (direction-aware), opacity -> 0 | x: 80 -> 0 (direction-aware), opacity -> 1 | Lateral progression, map panning | Compositor-only |
| `clip-wipe` | clip-path: inset(0) -> inset(0 100% 0 0) | clip-path: inset(0 0 0 100%) -> inset(0) | Dramatic reveals, editorial | Main-thread (clip-path), use sparingly |
| `blur-in` | filter: blur(0) -> blur(8px), opacity -> 0 | filter: blur(8px) -> blur(0), opacity -> 1 | Dream sequences, memory chapters | Expensive: main-thread filter. Desktop only |

## Pacing reference by content type

| Content type | Words | Visual complexity | Computed vh | Notes |
|---|---|---|---|---|
| Short caption | 15-30 | Simple image swap | 80-90vh | Minimum viable chapter |
| Standard paragraph | 50-80 | Image swap | 100-130vh | The common case |
| Dense explanation | 100-150 | Chart or diagram draw | 160-200vh | Chart needs extra scroll budget |
| Data climax | 20-40 | Counter + color shift | 120-150vh | Low word count but complex visual |
| Long narrative | 200-300 | Multi-part visual | 220-280vh | Consider splitting into 2 chapters |

## Pin configuration gotchas

| Gotcha | Symptom | Fix |
|---|---|---|
| `pinSpacing: true` (default) on split-screen | Visual panel gets a spacer that doubles the page height | Set `pinSpacing: false`; the text track already provides scroll height |
| Text track shorter than visual panel | Visual panel releases early, text scrolls past empty space | Ensure text-track total height >= visual panel height |
| Images loading after pin measurement | Pin spacer calculated before images load, wrong height | Use `ScrollTrigger.refresh()` after images load, or set explicit dimensions |
| Nested sticky inside GSAP pin | CSS `sticky` and GSAP `fixed` conflict inside same container | Use GSAP's own scrubbed transforms instead of nested sticky |
| Resize without refresh | Chapter positions stale after viewport change | `window.addEventListener('resize', () => setTimeout(ScrollTrigger.refresh, 150))` |

## Mobile layout patterns

### Pattern A: Sticky visual (recommended)
```css
.story__visual {
  position: sticky;
  top: 0;
  height: 50vh;
  z-index: 10;
}
.chapter {
  position: relative;
  z-index: 20;
  background: var(--bg);
}
```
Visual stays at top, chapters scroll over it. Transitions fire via IntersectionObserver.

### Pattern B: Interleaved visual-text
```css
.story { display: block; }
.visual-state { position: relative; height: 40vh; }
.chapter { padding: 40px 20px; }
```
Visual states inserted between chapters in DOM order. No pin, no sticky. Static layout. Best for very text-heavy stories where the reader should not be distracted.

### Pattern C: Visual as chapter background
```css
.chapter {
  position: relative;
  background-image: var(--chapter-bg);
  background-size: cover;
  color: white;
}
.chapter::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.55);
}
```
Each chapter carries its own visual as a background image. No separate visual panel. Simpler but loses the transition between visual states.

## Visual type implementation patterns

### Image swap
```js
// Simplest: toggle is-active class, CSS handles opacity
incoming.classList.add('is-active')
outgoing.classList.remove('is-active')
```

### Canvas chart draw
```js
// Draw progressively using a GSAP tween on a progress proxy
gsap.to({ p: 0 }, {
  p: 1, duration: 2, ease: 'power1.inOut',
  onUpdate() { drawChartAtProgress(ctx, data, this.targets()[0].p) },
})
```

### Animated counter
```js
// Tween a proxy object, update textContent in onUpdate
gsap.to({ v: startValue }, {
  v: targetValue, duration: 1.5, ease: 'power2.out', snap: { v: 1 },
  onUpdate() { el.textContent = Math.round(this.targets()[0].v).toLocaleString() },
})
```

### Map zoom
```js
// Transform a map container's scale and translate
gsap.to('.map-container', {
  scale: 2.5, x: '-30%', y: '-20%',
  duration: 1, ease: 'power2.inOut',
})
```

### Video timestamp jump
```js
// Seek a paused video to a chapter-specific timestamp
const video = document.querySelector('.story-video')
video.pause()
gsap.to(video, {
  currentTime: chapterTimestamp,
  duration: 0.8,
  ease: 'power1.inOut',
})
```

## Act structure overlay

| Act | Chapters | Tonal shift | Visual treatment |
|---|---|---|---|
| Introduction (1 chapter) | Set the scene | Neutral, observational | Wide/establishing shot, muted palette |
| Rising (2-3 chapters) | Build context, show change | Increasing tension | Tighter crops, more saturated, chart lines diverging |
| Climax (1 chapter) | Peak moment | Maximum tension | Bold color accent, counter at zero, full-bleed dramatic image |
| Resolution (1-2 chapters) | Outcome, call to action | Release, cautious optimism | Return to wider view, slightly warmer palette |

## Browser compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---|---|---|---|---|
| GSAP ScrollTrigger pin | 88+ | 78+ | 14+ | 88+ |
| IntersectionObserver | 58+ | 55+ | 12.1+ | 79+ |
| `position: sticky` | 56+ | 32+ | 13+ | 79+ |
| `aria-live="polite"` | All | All | All | All |
| `prefers-reduced-motion` | 74+ | 63+ | 10.1+ | 79+ |
