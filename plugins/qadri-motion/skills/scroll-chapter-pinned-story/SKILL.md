---
name: scroll-chapter-pinned-story
description: Use when building a split-screen scrollytelling page where a pinned visual panel changes state as text chapters scroll past it. Builds the complete chapter-driven narrative with act structure, pacing math, and visual-state choreography.
category: scroll
pairs_with: scroll-chapter-pinned-story-eval
---

# Chapter-Pinned Narrative Scroll

## What this builds
A full-page scrollytelling experience using the split-screen "sticky visual + scrolling text" pattern. A visual panel (left or right, configurable) pins to the viewport and transitions between states (image swaps, chart draws, map zooms, counter animations) as the user scrolls through text chapters on the opposite side. Each chapter drives one visual state. The text leads; the visual illustrates.

- 4-10 chapters, each with a dedicated visual state and a text block
- Visual panel pinned for the entire story duration via GSAP ScrollTrigger
- Chapter transitions: crossfade, slide, zoom, draw, or count, rotating to avoid repetition
- Pacing math: each chapter's scroll height computed from word count + visual transition complexity
- Act structure overlaid on chapters (introduction, rising, climax, resolution) with tonal shifts
- Global progress indicator showing current chapter and overall position
- Mobile: stacked layout (visual above text, no pin, visual transitions fire on chapter entry)
- `prefers-reduced-motion`: all visuals visible, no transitions, static stacked layout

## When to use / when not to
- Use for data journalism pieces, product feature walkthroughs, process explanations, case studies, and any narrative where text drives a visual companion.
- Use when every chapter shares the same structural layout (text on one side, visual on the other). The structural uniformity is the point, not a limitation.
- Use when the visual is reactive to the text (the text tells you what to look at; the visual shows it).
- Do NOT use when sections need structurally different layouts (one section is a card grid, another is full-bleed, another is pinned). That is `scroll-cinematic-longform-gsap`.
- Do NOT use for horizontal-scroll narratives. That is `scroll-horizontal-act-sequence`.
- Do NOT use when the visual leads and text is secondary (product showcases where the image IS the content). Use `scroll-cinematic-longform-gsap` with visual-led pacing.
- Do NOT use for a single pinned hero section. Use `hero-scroll-zoom-portal` or `hero-video-scrub-apple`.

## Stack decision
| Dependency | Version | Why | Cheaper alternative |
|---|---|---|---|
| GSAP | 3.12.5+ | ScrollTrigger pin handles the visual panel + scrubbed chapter-to-state mapping | CSS `position: sticky` for the pin, but no scrubbed transitions between states |
| ScrollTrigger | (bundled) | `pin`, `scrub`, batch chapter detection | IntersectionObserver for chapter detection (fire-once only, no scrub) |
| Lenis | 1.1.14+ (optional) | Smooth inertial scroll. Optional here since the text column drives pacing, not parallax | Omit entirely for content-heavy journalism pieces where native scroll is preferred |
| No framework required | - | Vanilla JS. Works in React/Astro/Svelte with minor wiring | - |

Why NOT Lenis by default: In text-heavy scrollytelling, the user is reading. Smooth scroll adds input lag to a reading experience, which can feel like the page is "fighting" the reader. Include Lenis only if the page also has non-chapter sections (hero, footer) that benefit from it.

## Architecture

```
index.html
  <body>
    <header>...</header>

    <div class="story" role="article">
      <div class="story__visual-track">    <!-- pinned panel -->
        <div class="visual-state" data-chapter="intro">
          <img src="intro.webp" alt="...">
        </div>
        <div class="visual-state" data-chapter="baseline">
          <canvas class="chart-canvas"></canvas>
        </div>
        <div class="visual-state" data-chapter="shift">
          <img src="shift.webp" alt="...">
        </div>
        <div class="visual-state" data-chapter="climax">
          <div class="counter" data-target="1247">0</div>
        </div>
        <div class="visual-state" data-chapter="resolution">
          <img src="resolution.webp" alt="...">
        </div>
      </div>

      <div class="story__text-track">      <!-- scrolling text -->
        <div class="chapter" data-chapter="intro" data-act="introduction">
          <h2>The Beginning</h2>
          <p>Opening text...</p>
        </div>
        <div class="chapter" data-chapter="baseline" data-act="rising">
          <h2>The Baseline</h2>
          <p>Context text...</p>
        </div>
        <div class="chapter" data-chapter="shift" data-act="rising">
          <h2>The Shift</h2>
          <p>Turning point text...</p>
        </div>
        <div class="chapter" data-chapter="climax" data-act="climax">
          <h2>The Crisis</h2>
          <p>Peak narrative text...</p>
        </div>
        <div class="chapter" data-chapter="resolution" data-act="resolution">
          <h2>Looking Forward</h2>
          <p>Resolution text...</p>
        </div>
      </div>
    </div>

    <footer>...</footer>
  </body>

main.js
  1. Measure all chapter heights (word-count-based or explicit)
  2. Pin the visual track for the full story duration
  3. For each chapter: create a ScrollTrigger that maps chapter scroll range to visual-state transition
  4. Wire progress indicator
  5. Wire mobile fallback (unpin, stack, IntersectionObserver triggers)
  6. Wire reduced-motion fallback
```

### Lifecycle
1. **Measure**: Count words per chapter, compute vh budgets using the pacing calculator (see recipe below).
2. **Pin**: Single `ScrollTrigger` pins `.story__visual-track` from story start to story end. The text track scrolls naturally alongside.
3. **Chapter triggers**: One `ScrollTrigger` per chapter, each activating the matching `.visual-state` and deactivating the previous.
4. **Transitions**: Each chapter-enter triggers a crossfade/slide/draw transition on the visual panel. Transition type rotates to avoid adjacent repetition.
5. **Resize**: Debounced `ScrollTrigger.refresh()` to recompute chapter positions after text reflow.
6. **Teardown**: Kill all triggers, revert visual states.

## Build it: step by step

### Phase 1: Story data model with pacing math

Define the story as structured data. Compute scroll budgets from word count.

```js
// story-data.js
const READ_WPM = 220
const VH_PER_SECOND = 100 / 1.2 // 1 viewport per ~1.2s of steady scroll

function computeChapterVh(wordCount, hasComplexVisual) {
  const readSeconds = (wordCount / READ_WPM) * 60
  const readVh = Math.max(80, readSeconds * VH_PER_SECOND)
  const transitionVh = hasComplexVisual ? 120 : 60
  return Math.round(Math.max(readVh, readVh * 0.7 + transitionVh))
}

const story = {
  acts: [
    {
      name: 'introduction',
      chapters: [
        {
          id: 'intro',
          heading: 'The Beginning',
          body: 'Opening narrative text here. Set the scene, establish the subject, give the reader a reason to keep scrolling.',
          visualType: 'image',
          visualSrc: 'intro.webp',
          visualAlt: 'Aerial view of the river in 2018',
          transition: 'fade',
          get wordCount() { return this.body.split(/\s+/).length },
          get vh() { return computeChapterVh(this.wordCount, false) },
        },
      ],
    },
    {
      name: 'rising',
      chapters: [
        {
          id: 'baseline',
          heading: 'The Baseline',
          body: 'For three decades, the seasonal flow held steady within a narrow band. Upstream communities drew water at a rate the watershed could sustain. The chart shows annual peak flow from 1990 to 2014, a pattern so consistent it became invisible.',
          visualType: 'chart-draw',
          transition: 'slide-up',
          get wordCount() { return this.body.split(/\s+/).length },
          get vh() { return computeChapterVh(this.wordCount, true) },
        },
        {
          id: 'shift',
          heading: 'The Shift',
          body: 'Starting in 2015, upstream withdrawals tripled. New agricultural operations, each individually permitted, collectively overwhelmed the system. The chart diverges.',
          visualType: 'image',
          visualSrc: 'shift.webp',
          visualAlt: 'Satellite image showing new irrigation channels',
          transition: 'crossfade',
          get wordCount() { return this.body.split(/\s+/).length },
          get vh() { return computeChapterVh(this.wordCount, false) },
        },
      ],
    },
    {
      name: 'climax',
      chapters: [
        {
          id: 'climax',
          heading: 'The Crisis',
          body: 'August 4th, 2019. Zero measured flow for the first time in recorded history. The gauge read 0.00 cubic feet per second.',
          visualType: 'counter',
          counterTarget: 0,
          counterLabel: 'cubic feet per second',
          transition: 'zoom-in',
          get wordCount() { return this.body.split(/\s+/).length },
          get vh() { return computeChapterVh(this.wordCount, true) },
        },
      ],
    },
    {
      name: 'resolution',
      chapters: [
        {
          id: 'resolution',
          heading: 'Looking Forward',
          body: 'A 2022 water-sharing agreement between the three upstream districts has restored partial flow. The gauge now reads an average of 45 cfs during peak season, roughly 60% of the historical baseline. Recovery is measurable but incomplete.',
          visualType: 'image',
          visualSrc: 'resolution.webp',
          visualAlt: 'The river in 2024, partial flow restored',
          transition: 'fade',
          get wordCount() { return this.body.split(/\s+/).length },
          get vh() { return computeChapterVh(this.wordCount, false) },
        },
      ],
    },
  ],
  get allChapters() { return this.acts.flatMap(a => a.chapters) },
  get totalVh() { return this.allChapters.reduce((sum, c) => sum + c.vh, 0) },
}

export default story
```

### Phase 2: HTML structure from story data

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Chapter-Pinned Story</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <!-- Progress indicator -->
  <div class="story-progress" aria-hidden="true">
    <div class="story-progress__bar"></div>
    <div class="story-progress__chapters">
      <!-- One dot per chapter, generated by JS -->
    </div>
  </div>

  <!-- The story container -->
  <article class="story">
    <!-- Visual panel (pinned) -->
    <aside class="story__visual" aria-live="polite">
      <div class="visual-state is-active" data-chapter="intro">
        <img src="intro.webp" alt="Aerial view of the river in 2018" loading="eager">
      </div>
      <div class="visual-state" data-chapter="baseline">
        <canvas class="chart-canvas" width="800" height="600" aria-label="Annual peak flow chart 1990-2019"></canvas>
      </div>
      <div class="visual-state" data-chapter="shift">
        <img src="shift.webp" alt="Satellite image showing new irrigation channels" loading="lazy">
      </div>
      <div class="visual-state" data-chapter="climax">
        <div class="counter-display">
          <span class="counter-value" data-target="0">---</span>
          <span class="counter-label">cubic feet per second</span>
        </div>
      </div>
      <div class="visual-state" data-chapter="resolution">
        <img src="resolution.webp" alt="The river in 2024, partial flow restored" loading="lazy">
      </div>
    </aside>

    <!-- Text track (scrolling) -->
    <div class="story__text">
      <section class="chapter" data-chapter="intro" data-act="introduction">
        <span class="chapter__eyebrow">Chapter 1</span>
        <h2 class="chapter__heading">The Beginning</h2>
        <div class="chapter__body">
          <p>Opening narrative text here. Set the scene, establish the subject, give the reader a reason to keep scrolling.</p>
        </div>
      </section>

      <section class="chapter" data-chapter="baseline" data-act="rising">
        <span class="chapter__eyebrow">Chapter 2</span>
        <h2 class="chapter__heading">The Baseline</h2>
        <div class="chapter__body">
          <p>For three decades, the seasonal flow held steady within a narrow band...</p>
        </div>
      </section>

      <section class="chapter" data-chapter="shift" data-act="rising">
        <span class="chapter__eyebrow">Chapter 3</span>
        <h2 class="chapter__heading">The Shift</h2>
        <div class="chapter__body">
          <p>Starting in 2015, upstream withdrawals tripled...</p>
        </div>
      </section>

      <section class="chapter" data-chapter="climax" data-act="climax">
        <span class="chapter__eyebrow">Chapter 4</span>
        <h2 class="chapter__heading">The Crisis</h2>
        <div class="chapter__body">
          <p>August 4th, 2019. Zero measured flow for the first time in recorded history.</p>
        </div>
      </section>

      <section class="chapter" data-chapter="resolution" data-act="resolution">
        <span class="chapter__eyebrow">Chapter 5</span>
        <h2 class="chapter__heading">Looking Forward</h2>
        <div class="chapter__body">
          <p>A 2022 water-sharing agreement has restored partial flow...</p>
        </div>
      </section>
    </div>
  </article>

  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js"></script>
  <script type="module" src="main.js"></script>
</body>
</html>
```

### Phase 3: CSS layout with split-screen structure

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; }

body {
  font-family: 'Georgia', 'Times New Roman', serif;
  color: var(--text, #1a1a1a);
  background: var(--bg, #fafaf7);
  overflow-x: hidden;
}

/* === Story container === */
.story {
  display: grid;
  grid-template-columns: 1fr 1fr;
  position: relative;
}

/* === Visual panel (will be pinned) === */
.story__visual {
  position: relative;
  height: 100vh;
  overflow: hidden;
  background: var(--visual-bg, #e8e5df);
}

.visual-state {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: none; /* JS handles transitions */
  padding: 48px;
}

.visual-state.is-active {
  opacity: 1;
}

.visual-state img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.visual-state canvas {
  width: 100%;
  max-height: 80%;
}

/* === Counter display (climax) === */
.counter-display {
  text-align: center;
}
.counter-value {
  display: block;
  font-size: clamp(4rem, 12vw, 10rem);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--accent, #c0392b);
}
.counter-label {
  display: block;
  font-size: 1rem;
  color: var(--text-muted, #6b6b6b);
  margin-top: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* === Text track === */
.story__text {
  position: relative;
}

.chapter {
  min-height: 100vh;
  padding: 20vh 48px 20vh 64px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.chapter__eyebrow {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted, #6b6b6b);
  margin-bottom: 16px;
}

.chapter__heading {
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 700;
  line-height: 1.15;
  margin-bottom: 24px;
}

.chapter__body {
  max-width: 480px;
  font-size: 1.125rem;
  line-height: 1.75;
}

.chapter__body p + p {
  margin-top: 1.25em;
}

/* === Act tonal shifts === */
.chapter[data-act="introduction"] { --chapter-accent: #2c5f2d; }
.chapter[data-act="rising"] { --chapter-accent: #1a4a6e; }
.chapter[data-act="climax"] { --chapter-accent: #c0392b; }
.chapter[data-act="resolution"] { --chapter-accent: #4a6741; }

.chapter__eyebrow { color: var(--chapter-accent); }

/* === Progress bar === */
.story-progress {
  position: fixed;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  z-index: 50;
  background: var(--border, #e0ddd7);
}
.story-progress__bar {
  width: 100%;
  background: var(--accent, #1a1a1a);
  transform-origin: top;
  transform: scaleY(0);
}

/* === Mobile === */
@media (max-width: 768px) {
  .story {
    display: block; /* stack, not grid */
  }
  .story__visual {
    height: 50vh;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .chapter {
    padding: 60px 24px;
    min-height: auto;
    background: var(--bg, #fafaf7);
    position: relative;
    z-index: 20;
  }
  .chapter:first-child { margin-top: 50vh; }
  .story-progress { display: none; }
}

/* === Reduced motion === */
@media (prefers-reduced-motion: reduce) {
  .visual-state { opacity: 1; position: relative; }
  .story__visual { height: auto; }
  .story { display: block; }
  .chapter { min-height: auto; }
}
```

### Phase 4: Pin the visual track and wire chapter transitions

```js
// main.js
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const IS_MOBILE = window.matchMedia('(max-width: 768px)').matches

if (!REDUCED) {
  if (IS_MOBILE) {
    initMobileStory()
  } else {
    initDesktopStory()
  }
  initProgressBar()
}

function initDesktopStory() {
  const visualTrack = document.querySelector('.story__visual')
  const textTrack = document.querySelector('.story__text')
  const chapters = gsap.utils.toArray('.chapter')
  const visualStates = document.querySelectorAll('.visual-state')

  // Pin the visual panel for the full text-track duration
  ScrollTrigger.create({
    trigger: textTrack,
    pin: visualTrack,
    start: 'top top',
    end: 'bottom bottom',
    pinSpacing: false, // text track already provides the scroll height
  })

  // Chapter transition definitions (rotate to avoid adjacent repetition)
  const transitions = ['fade', 'slide-up', 'crossfade', 'zoom-in', 'slide-left']

  let activeChapterId = chapters[0]?.dataset.chapter || null

  chapters.forEach((chapter, i) => {
    const chapterId = chapter.dataset.chapter
    const transition = transitions[i % transitions.length]

    ScrollTrigger.create({
      trigger: chapter,
      start: 'top 55%',    // chapter enters past midpoint
      end: 'bottom 45%',
      onEnter: () => activateChapter(chapterId, transition, 'forward'),
      onEnterBack: () => activateChapter(chapterId, transition, 'backward'),
    })
  })

  function activateChapter(chapterId, transition, direction) {
    if (activeChapterId === chapterId) return
    const outgoing = document.querySelector(`.visual-state[data-chapter="${activeChapterId}"]`)
    const incoming = document.querySelector(`.visual-state[data-chapter="${chapterId}"]`)
    if (!incoming) return

    // Kill any running transitions
    gsap.killTweensOf([outgoing, incoming])

    // Transition out
    if (outgoing) {
      switch (transition) {
        case 'fade':
          gsap.to(outgoing, { opacity: 0, duration: 0.5, ease: 'power2.in' })
          break
        case 'slide-up':
          gsap.to(outgoing, { opacity: 0, y: -60, duration: 0.5, ease: 'power2.in' })
          break
        case 'crossfade':
          gsap.to(outgoing, { opacity: 0, duration: 0.7, ease: 'power1.inOut' })
          break
        case 'zoom-in':
          gsap.to(outgoing, { opacity: 0, scale: 1.15, duration: 0.6, ease: 'power2.in' })
          break
        case 'slide-left':
          gsap.to(outgoing, { opacity: 0, x: direction === 'forward' ? -80 : 80, duration: 0.5, ease: 'power2.in' })
          break
      }
      outgoing.classList.remove('is-active')
    }

    // Transition in
    const inFromVars = {}
    switch (transition) {
      case 'fade':
        inFromVars.opacity = 0
        break
      case 'slide-up':
        inFromVars.opacity = 0; inFromVars.y = direction === 'forward' ? 60 : -60
        break
      case 'crossfade':
        inFromVars.opacity = 0
        break
      case 'zoom-in':
        inFromVars.opacity = 0; inFromVars.scale = 0.9
        break
      case 'slide-left':
        inFromVars.opacity = 0; inFromVars.x = direction === 'forward' ? 80 : -80
        break
    }
    gsap.fromTo(incoming, inFromVars, {
      opacity: 1, y: 0, x: 0, scale: 1,
      duration: 0.6, ease: 'power2.out', delay: 0.15,
    })
    incoming.classList.add('is-active')

    // Fire visual-specific logic
    handleVisualActivation(chapterId)

    activeChapterId = chapterId
  }
}
```

### Phase 5: Visual-specific activation (counters, chart draws)

```js
function handleVisualActivation(chapterId) {
  // Counter animation (climax chapter)
  const counter = document.querySelector(`.visual-state[data-chapter="${chapterId}"] .counter-value`)
  if (counter) {
    const target = parseInt(counter.dataset.target, 10)
    gsap.fromTo(counter,
      { textContent: '---' },
      {
        duration: 1.5,
        ease: 'power2.out',
        onUpdate: function() {
          const progress = this.progress()
          const current = Math.round(target + (1247 - target) * (1 - progress))
          counter.textContent = current.toLocaleString()
        },
        onComplete: () => { counter.textContent = target.toLocaleString() },
      }
    )
  }

  // Chart draw animation (baseline chapter)
  const canvas = document.querySelector(`.visual-state[data-chapter="${chapterId}"] .chart-canvas`)
  if (canvas) {
    drawChart(canvas)
  }
}

function drawChart(canvas) {
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height

  // Sample data: annual peak flow 1990-2019
  const data = [120, 125, 118, 130, 122, 128, 115, 132, 126, 119,
                124, 121, 129, 117, 127, 88, 72, 65, 48, 35,
                22, 18, 12, 8, 5, 3, 2, 1, 0, 0]
  const max = Math.max(...data)
  const stepX = (w - 80) / (data.length - 1)

  // Animate draw progress
  const progress = { value: 0 }
  gsap.to(progress, {
    value: 1,
    duration: 2,
    ease: 'power1.inOut',
    onUpdate: () => {
      ctx.clearRect(0, 0, w, h)
      ctx.strokeStyle = '#1a4a6e'
      ctx.lineWidth = 3
      ctx.lineJoin = 'round'
      ctx.beginPath()

      const drawCount = Math.floor(data.length * progress.value)
      for (let i = 0; i <= drawCount; i++) {
        const x = 40 + i * stepX
        const y = h - 40 - (data[i] / max) * (h - 80)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      // Axis labels
      ctx.fillStyle = '#6b6b6b'
      ctx.font = '12px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('1990', 40, h - 16)
      ctx.fillText('2019', w - 40, h - 16)
      ctx.textAlign = 'right'
      ctx.fillText(`${max} cfs`, 36, 44)
    },
  })
}
```

### Phase 6: Mobile fallback (sticky visual + IntersectionObserver)

```js
function initMobileStory() {
  const chapters = document.querySelectorAll('.chapter')
  let activeId = null

  // CSS handles position: sticky on .story__visual
  // JS handles chapter detection via IntersectionObserver

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
          const chapterId = entry.target.dataset.chapter
          if (chapterId !== activeId) {
            // Simple crossfade on mobile
            document.querySelectorAll('.visual-state').forEach(vs => {
              vs.classList.remove('is-active')
              vs.style.opacity = '0'
            })
            const incoming = document.querySelector(`.visual-state[data-chapter="${chapterId}"]`)
            if (incoming) {
              incoming.classList.add('is-active')
              gsap.fromTo(incoming, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' })
            }
            handleVisualActivation(chapterId)
            activeId = chapterId
          }
        }
      })
    },
    { threshold: [0.4], rootMargin: '-10% 0px -40% 0px' }
  )

  chapters.forEach(ch => observer.observe(ch))
}
```

### Phase 7: Progress bar

```js
function initProgressBar() {
  const bar = document.querySelector('.story-progress__bar')
  const story = document.querySelector('.story')
  if (!bar || !story) return

  bar.style.height = '100%'

  ScrollTrigger.create({
    trigger: story,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: self => {
      bar.style.transform = `scaleY(${self.progress.toFixed(3)})`
    },
  })
}
```

### Phase 8: Dynamic chapter height from word count

Apply computed heights from the pacing calculator instead of guessing.

```js
function applyPacingHeights() {
  const chapters = document.querySelectorAll('.chapter')

  chapters.forEach(chapter => {
    const body = chapter.querySelector('.chapter__body')
    if (!body) return
    const wordCount = body.textContent.trim().split(/\s+/).length
    const hasComplexVisual = chapter.dataset.chapter === 'baseline' || chapter.dataset.chapter === 'climax'
    const vh = computeChapterVh(wordCount, hasComplexVisual)
    chapter.style.minHeight = `${vh}vh`
  })
}

function computeChapterVh(wordCount, hasComplexVisual) {
  const readSeconds = (wordCount / 220) * 60
  const readVh = Math.max(80, readSeconds * (100 / 1.2))
  const transitionVh = hasComplexVisual ? 120 : 60
  return Math.round(Math.max(readVh, readVh * 0.7 + transitionVh))
}

// Call before building ScrollTriggers
applyPacingHeights()
```

## The full reference implementation

```js
// main.js -- Chapter-Pinned Narrative Scroll
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const MOBILE = window.matchMedia('(max-width: 768px)').matches
const TRANSITIONS = ['fade', 'slide-up', 'crossfade', 'zoom-in', 'slide-left']
let activeChapterId = null

if (!REDUCED) {
  applyPacingHeights()
  MOBILE ? initMobile() : initDesktop()
  initProgress()
}

function applyPacingHeights() {
  document.querySelectorAll('.chapter').forEach(ch => {
    const words = (ch.querySelector('.chapter__body')?.textContent || '').trim().split(/\s+/).length
    const complex = ['baseline', 'climax'].includes(ch.dataset.chapter)
    const readS = (words / 220) * 60
    const readVh = Math.max(80, readS * (100 / 1.2))
    const transVh = complex ? 120 : 60
    ch.style.minHeight = `${Math.round(Math.max(readVh, readVh * 0.7 + transVh))}vh`
  })
}

function initDesktop() {
  const vis = document.querySelector('.story__visual')
  const text = document.querySelector('.story__text')
  const chapters = gsap.utils.toArray('.chapter')

  ScrollTrigger.create({
    trigger: text, pin: vis, start: 'top top', end: 'bottom bottom', pinSpacing: false,
  })

  activeChapterId = chapters[0]?.dataset.chapter
  document.querySelector(`.visual-state[data-chapter="${activeChapterId}"]`)?.classList.add('is-active')

  chapters.forEach((ch, i) => {
    const id = ch.dataset.chapter
    const tr = TRANSITIONS[i % TRANSITIONS.length]
    ScrollTrigger.create({
      trigger: ch, start: 'top 55%', end: 'bottom 45%',
      onEnter: () => activate(id, tr, 'forward'),
      onEnterBack: () => activate(id, tr, 'backward'),
    })
  })
}

function activate(id, transition, dir) {
  if (activeChapterId === id) return
  const out = document.querySelector(`.visual-state[data-chapter="${activeChapterId}"]`)
  const inc = document.querySelector(`.visual-state[data-chapter="${id}"]`)
  if (!inc) return
  gsap.killTweensOf([out, inc].filter(Boolean))

  if (out) {
    const outTo = { opacity: 0, duration: 0.5, ease: 'power2.in' }
    if (transition === 'slide-up') outTo.y = -60
    if (transition === 'zoom-in') outTo.scale = 1.15
    if (transition === 'slide-left') outTo.x = dir === 'forward' ? -80 : 80
    gsap.to(out, outTo)
    out.classList.remove('is-active')
  }

  const from = { opacity: 0 }
  if (transition === 'slide-up') from.y = dir === 'forward' ? 60 : -60
  if (transition === 'zoom-in') from.scale = 0.9
  if (transition === 'slide-left') from.x = dir === 'forward' ? 80 : -80
  gsap.fromTo(inc, from, { opacity: 1, y: 0, x: 0, scale: 1, duration: 0.6, ease: 'power2.out', delay: 0.15 })
  inc.classList.add('is-active')
  fireVisual(id)
  activeChapterId = id
}

function fireVisual(id) {
  const counter = document.querySelector(`.visual-state[data-chapter="${id}"] .counter-value`)
  if (counter) {
    const target = parseInt(counter.dataset.target, 10)
    gsap.to({ v: 1247 }, {
      v: target, duration: 1.5, ease: 'power2.out',
      onUpdate() { counter.textContent = Math.round(this.targets()[0].v).toLocaleString() },
    })
  }
  const canvas = document.querySelector(`.visual-state[data-chapter="${id}"] .chart-canvas`)
  if (canvas) drawChart(canvas)
}

function drawChart(cvs) {
  const ctx = cvs.getContext('2d')
  const w = cvs.width, h = cvs.height
  const data = [120,125,118,130,122,128,115,132,126,119,124,121,129,117,127,88,72,65,48,35,22,18,12,8,5,3,2,1,0,0]
  const max = Math.max(...data), sx = (w-80)/(data.length-1)
  gsap.to({ p: 0 }, {
    p: 1, duration: 2, ease: 'power1.inOut',
    onUpdate() {
      ctx.clearRect(0,0,w,h); ctx.strokeStyle='#1a4a6e'; ctx.lineWidth=3; ctx.lineJoin='round'; ctx.beginPath()
      const n = Math.floor(data.length * this.targets()[0].p)
      for (let i=0;i<=n;i++){const x=40+i*sx,y=h-40-(data[i]/max)*(h-80);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}
      ctx.stroke(); ctx.fillStyle='#6b6b6b'; ctx.font='12px system-ui'; ctx.textAlign='center'
      ctx.fillText('1990',40,h-16); ctx.fillText('2019',w-40,h-16)
    },
  })
}

function initMobile() {
  let mobileActive = null
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio > 0.4) {
        const id = e.target.dataset.chapter
        if (id !== mobileActive) {
          document.querySelectorAll('.visual-state').forEach(v => { v.classList.remove('is-active'); v.style.opacity='0' })
          const inc = document.querySelector(`.visual-state[data-chapter="${id}"]`)
          if (inc) { inc.classList.add('is-active'); gsap.to(inc,{opacity:1,duration:0.4,ease:'power2.out'}) }
          fireVisual(id); mobileActive = id
        }
      }
    })
  }, { threshold: [0.4], rootMargin: '-10% 0px -40% 0px' })
  document.querySelectorAll('.chapter').forEach(ch => obs.observe(ch))
}

function initProgress() {
  const bar = document.querySelector('.story-progress__bar')
  const story = document.querySelector('.story')
  if (!bar || !story) return
  bar.style.height = '100%'
  ScrollTrigger.create({ trigger: story, start: 'top top', end: 'bottom bottom',
    onUpdate: s => { bar.style.transform = `scaleY(${s.progress.toFixed(3)})` },
  })
}
```

## Tuning the feel

| Parameter | Value | Why |
|---|---|---|
| Chapter trigger `start` | `top 55%` | Chapter activates when its top is just past the viewport center. Too early (top 80%) and the transition happens before the user reads the heading. Too late (top 30%) and the visual change lags the text. |
| Chapter trigger `end` | `bottom 45%` | Chapter deactivates when its bottom is near center. This creates a symmetrical active zone. |
| Transition out duration | 0.5s | Fast enough to feel responsive, slow enough to register as a transition |
| Transition in delay | 0.15s | Slight overlap between out and in prevents a blank moment |
| Transition in duration | 0.6s | Slightly longer than out, so the incoming state settles gracefully |
| Counter duration | 1.5s | Long enough to watch numbers tick, short enough to not bore |
| Chart draw duration | 2.0s | Data visualization needs time to register. Under 1.5s feels rushed. |
| Pacing: min chapter height | 80vh | Even a short chapter needs at least 80vh or it scrolls past too quickly to read |
| Pacing: complex visual bonus | +120vh | Charts, counters, and multi-element transitions need extra scroll budget |
| Pacing: simple visual bonus | +60vh | A crossfade image swap is cheap and quick |

## Variants

### 1. Visual-right (default: visual-left)
Swap grid column order: `grid-template-columns: 1fr 1fr` stays the same, but assign `.story__text { order: -1 }`. Also mirror the progress bar to the right side.

### 2. Full-bleed visual (no split-screen)
Visual panel is `position: fixed; inset: 0; z-index: 0`. Text track floats on top with a translucent background (`background: rgba(250,250,247,0.9)`). Each chapter is a card. Common for map-based or photo-essay stories.

### 3. Data-heavy (chart per chapter)
Every visual state is a canvas chart. Replace the transition system with a chart-draw-on-enter pattern. Add axis labels that persist across chapters while the data line changes. Use `scrub` instead of fire-once triggers so the chart line draws proportionally to scroll progress.

### 4. Comparison (before/after)
Two visual panels instead of one: left shows "before" state, right shows "after." Text scrolls between them. Chapters progressively reveal differences. Use clip-path slider on a shared image for the comparison reveal.

### 5. Branching narrative
Chapters include choice buttons. The visual panel branches based on user selection. Store state in a small reactive model. Non-selected branches are skipped (collapsed to 0 height with GSAP). Experimental; test pacing carefully.

## Performance budget

| Metric | Target | Cut lever |
|---|---|---|
| Frame time | < 16.67ms (60fps) | Simplify transitions to opacity-only (cheapest) |
| JS bundle (gzipped) | < 30KB (GSAP ~28KB + app ~2KB, no Lenis) | Use IntersectionObserver instead of ScrollTrigger (drops GSAP entirely) |
| LCP | < 2.5s | Eager-load first visual state image; lazy-load rest |
| DOM nodes | < 500 | One visual state per chapter; hide inactive states with `display: none` if DOM gets heavy |
| Canvas redraws | Only on chapter activation | Do not redraw on every scroll frame; fire once on enter |
| Compositor layers | < 6 | Visual states use opacity transitions (compositor) not layout changes |

## Accessibility

### prefers-reduced-motion
```js
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  // Skip all animation. Show all visual states and chapters in static flow.
  document.querySelectorAll('.visual-state').forEach(v => { v.style.opacity = '1'; v.style.position = 'relative' })
  // Do not pin. Do not create ScrollTriggers.
}
```

### Screen readers and aria
- `.story__visual` has `aria-live="polite"` so state changes are announced.
- Each `visual-state` image has a descriptive `alt` attribute.
- Chapters are `<section>` elements with `<h2>` headings.
- Progress bar is `aria-hidden="true"`.
- Counter uses `aria-label` to announce the final value, not the animation.

### Keyboard navigation
- Tab order follows DOM (text track). No focus trapping.
- Visual transitions do not interfere with keyboard navigation.
- Chapter headings are focusable via heading navigation (screen reader shortcuts).

### What this costs users without it
Users with reduced motion see a static vertical page with all images and text visible. They lose the "visual changes as you read" connection that is the core of the pattern. This is a real loss for data stories where the visual illustrates the text. Mitigate by placing captions or annotations directly on the visuals in the static version so the text-visual connection is explicit.

## Anti-slop rules

1. **No visual transition without a text chapter driving it.** Every visual state change must be caused by scrolling into a new chapter. Ambient visual changes (random crossfades, pulsing backgrounds) break the text-drives-visual contract.
2. **No identical adjacent transitions.** If chapters 2 and 3 both use "fade," the page feels automated. Rotate transition types.
3. **No chapter under 80vh.** Even a single sentence needs scroll room to register before the next chapter activates.
4. **No visual-state leak.** When a chapter deactivates, its visual state must fully exit. A half-faded previous state lingering behind the current one is the most common visual bug.
5. **No counter animation on every scroll frame.** Counters fire once on chapter enter, then hold. Re-firing on scroll-back should restart from the held value, not from zero.
6. **No more than 10 chapters.** Beyond 10, the reader loses sense of position. Break into separate pages or add a mini-map.
7. **No pinned visual on mobile.** GSAP pin on touch devices causes scroll-jacking that fights native momentum. Use CSS `position: sticky` instead.
8. **No chart that draws in under 1s.** Data visualization needs time to register. Under 1s, the reader cannot follow the line.
9. **No full-bleed visual state taller than the viewport.** The visual panel is viewport-height. If content overflows, it clips. Design visuals to fit, not scroll.
10. **No transition that takes longer than 0.7s.** The reader is scrolling. If the visual takes 1.5s to settle, they have already moved to the next chapter and the transition plays out behind the new one.

## Integration notes

### Pairs with
- `scroll-cinematic-longform-gsap`: If the page needs structurally varied sections beyond the split-screen pattern, use that toolkit for the overall page and embed this split-screen pattern as one act within it.
- `scroll-progress-storytelling`: The pacing calculator and act/beat data model from that primitive are used directly here. Defer to it for advanced pacing decisions (text-led vs visual-led, multi-beat chapters).
- `sticky-pinning-sequences`: The visual pin uses the same mechanics. Defer to that primitive for nested-pin edge cases.

### Known conflicts
- **CSS `position: sticky` + GSAP pin**: The mobile fallback uses CSS `sticky`. Do not also create a GSAP pin on mobile; they will fight. The `IS_MOBILE` gate ensures only one runs.
- **Multiple stories on one page**: Each story needs its own isolated ScrollTrigger scope. Use `ScrollTrigger.create({ scroller: '.story-container' })` per story, not document-level triggers.

## Ship checklist

- [ ] Every chapter has a matching `visual-state` element
- [ ] No two adjacent chapters share the same transition type
- [ ] Chapter heights are computed from word count (not hardcoded to 100vh)
- [ ] Visual panel stays pinned for the full story on desktop
- [ ] Mobile: visual is `position: sticky`, no GSAP pin
- [ ] `prefers-reduced-motion`: all content visible, no animation, no pin
- [ ] First visual state image is `loading="eager"`, rest are `loading="lazy"`
- [ ] Counter and chart animations fire once on chapter enter, not on every scroll frame
- [ ] Progress bar fills proportionally from 0 to 100%
- [ ] `aria-live="polite"` on visual panel so screen readers announce state changes
- [ ] No horizontal scrollbar at any viewport width
- [ ] Console has zero errors from GSAP or ScrollTrigger
