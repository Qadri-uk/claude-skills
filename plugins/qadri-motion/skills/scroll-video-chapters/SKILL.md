---
name: scroll-video-chapters
description: Use when building a scroll-linked video player that scrubs playback and surfaces chapter navigation as the user scrolls, like a documentary-style product walkthrough. Builds the full chapter system with time-code mapping, scrub engine, nav UI, and accessible fallback.
category: scroll
pairs_with: scroll-video-chapters-eval
---

# Scroll-Linked Video Chapter Navigation

## What this builds
A long-form page where a `<video>` element (or canvas image sequence) scrubs its playback position in response to scroll, divided into named chapters. Each chapter occupies a measured scroll range, has its own text overlay, and is reflected in a persistent chapter navigation bar. The nav highlights the active chapter and allows click-to-scroll-to-chapter jumps.

- Sticky-pinned video viewport that holds while scroll drives playback forward/backward
- Chapter data model mapping scroll ranges to video time codes
- Persistent vertical or horizontal chapter nav with active-state indicator
- Text overlays that appear/disappear at chapter boundaries
- Buffered seeking with requestAnimationFrame gating to prevent decoder overload
- Canvas image-sequence fallback for frame-perfect scrubbing without seek latency
- prefers-reduced-motion fallback: video plays at 1x with chapter skip buttons instead of scrub

## When to use / when not to
- Use when video content has a natural narrative structure (product walkthrough, explainer, case study) and the viewer should control pacing by scrolling.
- Use when chapters need text annotations, stats, or callouts synchronized to specific moments.
- Do NOT use for short ambient loops or background video. A `<video autoplay muted loop>` is simpler and correct.
- Do NOT use for content the viewer should just press play on (testimonials, interviews). A normal player is better UX.
- For canvas-based image-sequence scrubbing without chapter structure, see primitive `image-sequence-scrubbing`. For scroll-progress narrative structure without video, see `scroll-progress-storytelling`. For the pinning mechanics alone, see `sticky-pinning-sequences`.

## Stack decision
| Dependency | Version | Why | Cheaper alternative |
|---|---|---|---|
| GSAP ScrollTrigger | 3.13+ | Pin + scrub + per-chapter sub-triggers in one API. Free since 3.13. | Manual IntersectionObserver + scroll listener + `position: sticky`. Works but requires ~150 lines to replicate pin + progress. |
| Lenis | 1.1+ | Smooth inertial scroll prevents jerky `currentTime` jumps from raw wheel deltas. Optional but strongly recommended. | Native scroll. Functional but video seeking looks choppy on discrete scroll steps. |
| Vanilla `<video>` | HTML5 | `currentTime` seeking is browser-native. No player library needed. | Canvas image sequence (see primitive `image-sequence-scrubbing`). Better frame precision, 3-10x higher payload. |

## Architecture

```
scroll-video-chapters/
  index.html
  chapters.js       -- chapter data, scroll-to-timecode mapper, nav controller
  scrub-engine.js   -- rAF-gated video seeking, buffered seek queue, canvas fallback
  styles.css        -- pinned layout, chapter nav, overlay transitions, a11y
```

```
Page flow:
  [intro content]
  [.video-chapters]                    <-- tall scroll budget container
    [.video-chapters__pinned]          <-- sticky; holds viewport
      [<video> or <canvas>]
      [.chapter-overlays]              <-- text that fades per chapter
    [.chapter-nav]                     <-- fixed sidebar or bottom bar
  [post-video content]

Lifecycle:
  1. Parse chapter manifest (time codes, labels, overlay content)
  2. Compute per-chapter vh budgets from duration ratios
  3. Pin video viewport. Create one ScrollTrigger per chapter.
  4. On scroll tick: map progress to timecode, rAF-seek video
  5. Update chapter nav active state
  6. On chapter click: scrollTo the chapter's scroll offset
  7. Teardown: kill triggers, remove listeners, pause video
```

## Build it: step by step

### Phase 1: Chapter data model

Define chapters as a flat array. Each chapter maps a video time range to a scroll range. The scroll range is computed proportionally from the chapter's duration relative to total video duration.

```js
const CHAPTERS = [
  { id: 'intro',     label: 'Introduction',    start: 0,    end: 8,   overlay: 'Meet the product' },
  { id: 'problem',   label: 'The Problem',     start: 8,    end: 22,  overlay: 'Why existing tools fail' },
  { id: 'solution',  label: 'Our Approach',     start: 22,   end: 45,  overlay: 'A better way to build' },
  { id: 'demo',      label: 'Live Demo',        start: 45,   end: 72,  overlay: 'See it in action' },
  { id: 'results',   label: 'Results',          start: 72,   end: 88,  overlay: '3x faster, half the cost' },
  { id: 'cta',       label: 'Get Started',      start: 88,   end: 96,  overlay: 'Try it free today' },
];

const TOTAL_DURATION = CHAPTERS[CHAPTERS.length - 1].end;
const SCROLL_BUDGET_VH = 600; // total scroll distance for the pinned region
const VH_PER_SECOND = SCROLL_BUDGET_VH / TOTAL_DURATION;

function computeChapterScrollRanges(chapters, budgetVh, totalDuration) {
  let cursor = 0;
  return chapters.map(ch => {
    const durationSeconds = ch.end - ch.start;
    const chapterVh = (durationSeconds / totalDuration) * budgetVh;
    const range = { ...ch, scrollStart: cursor, scrollEnd: cursor + chapterVh, vh: chapterVh };
    cursor += chapterVh;
    return range;
  });
}

const chaptersWithScroll = computeChapterScrollRanges(CHAPTERS, SCROLL_BUDGET_VH, TOTAL_DURATION);
```

### Phase 2: HTML structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Product Walkthrough</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>

<section class="intro">
  <h1>How we built it</h1>
  <p>Scroll to watch the story unfold.</p>
</section>

<section class="video-chapters" id="video-chapters" aria-label="Video walkthrough">
  <div class="video-chapters__pinned">
    <video
      class="video-chapters__video"
      src="walkthrough.mp4"
      muted
      playsinline
      preload="auto"
      aria-hidden="true"
    ></video>

    <div class="video-chapters__overlays" aria-live="polite">
      <!-- JS populates per-chapter overlays -->
    </div>

    <div class="video-chapters__progress">
      <div class="video-chapters__progress-fill"></div>
    </div>
  </div>

  <nav class="chapter-nav" aria-label="Video chapters">
    <ol class="chapter-nav__list">
      <!-- JS populates from CHAPTERS array -->
    </ol>
  </nav>
</section>

<section class="outro">
  <h2>Ready to start?</h2>
</section>

<script src="https://cdn.jsdelivr.net/npm/gsap@3.13/dist/gsap.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13/dist/ScrollTrigger.min.js"></script>
<script type="module" src="chapters.js"></script>
</body>
</html>
```

### Phase 3: CSS layout and chapter nav

```css
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #0a0a0a; color: #f5f5f5; font-family: system-ui, -apple-system, sans-serif; }

.intro, .outro {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

/* --- Pinned video region --- */
.video-chapters {
  position: relative;
}
.video-chapters__pinned {
  position: sticky;
  top: 0;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #000;
}
.video-chapters__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* --- Progress bar --- */
.video-chapters__progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: rgba(255, 255, 255, 0.15);
  z-index: 5;
}
.video-chapters__progress-fill {
  height: 100%;
  width: 0%;
  background: #fff;
  will-change: width;
}

/* --- Chapter overlays --- */
.video-chapters__overlays {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
}
.chapter-overlay {
  position: absolute;
  bottom: 12%;
  left: 6%;
  max-width: 36ch;
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1),
              transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.chapter-overlay.active {
  opacity: 1;
  transform: translateY(0);
}
.chapter-overlay__label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.6;
  margin-bottom: 0.25rem;
}
.chapter-overlay__text {
  font-size: clamp(1.25rem, 3vw, 2rem);
  font-weight: 600;
  letter-spacing: -0.01em;
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.7);
}

/* --- Chapter nav (right sidebar) --- */
.chapter-nav {
  position: fixed;
  right: 1.5rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
}
.chapter-nav__list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.chapter-nav__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  opacity: 0.4;
  transition: opacity 0.25s ease;
}
.chapter-nav__item.active { opacity: 1; }
.chapter-nav__item:hover { opacity: 0.8; }
.chapter-nav__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fff;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}
.chapter-nav__item.active .chapter-nav__dot {
  transform: scale(1.6);
}
.chapter-nav__label {
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

/* --- Mobile: bottom bar instead of sidebar --- */
@media (max-width: 768px) {
  .chapter-nav {
    position: fixed;
    right: auto;
    top: auto;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
  }
  .chapter-nav__list {
    flex-direction: row;
    gap: 0.75rem;
  }
  .chapter-nav__label { display: none; }
}

/* --- Reduced motion --- */
@media (prefers-reduced-motion: reduce) {
  .video-chapters__pinned {
    position: relative;
    height: auto;
  }
  .video-chapters__video {
    position: relative;
    height: auto;
    aspect-ratio: 16 / 9;
  }
  .chapter-overlay {
    opacity: 1 !important;
    transform: none !important;
    position: relative;
    padding: 1rem;
  }
}
```

### Phase 4: Scrub engine -- rAF-gated video seeking

The single hardest problem with `<video>` + scroll is seek latency. Browsers decode video in chunks keyed by keyframes (typically every 2-5 seconds in H.264). Seeking between keyframes requires partial decode, which takes 20-200ms depending on distance from the nearest keyframe. Firing `video.currentTime = x` on every scroll event overwhelms the decoder. The fix: buffer seeks behind a rAF gate.

```js
export class VideoScrubEngine {
  constructor(videoEl) {
    this.video = videoEl;
    this.targetTime = 0;
    this.lastSetTime = -1;
    this.seeking = false;
    this.rafId = null;
    this.video.pause();

    this.video.addEventListener('seeked', () => {
      this.seeking = false;
    });
  }

  setProgress(progress, totalDuration) {
    this.targetTime = Math.max(0, Math.min(progress * totalDuration, totalDuration - 0.01));
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this._flush());
    }
  }

  _flush() {
    this.rafId = null;
    if (this.seeking) {
      // Browser is still processing previous seek. Queue another frame.
      this.rafId = requestAnimationFrame(() => this._flush());
      return;
    }
    const delta = Math.abs(this.targetTime - this.lastSetTime);
    if (delta < 0.03) return; // less than one frame at 30fps, skip
    this.video.currentTime = this.targetTime;
    this.lastSetTime = this.targetTime;
    this.seeking = true;
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}
```

**Why the 0.03s threshold:** At 30fps, one frame is ~0.033s. Seeking to a time less than one frame away from the current position produces no visible change and wastes a decode cycle. Skip it.

**Keyframe distance matters for feel:** If the source video has keyframes every 5 seconds, scrubbing backwards requires decoding up to 5 seconds of frames to reach the target. Encode your scrub video with a keyframe interval of 1 second (`-g 30` for 30fps in ffmpeg) to keep seek latency under 50ms. The file will be ~20% larger. Worth it.

```bash
# Encode for scroll scrubbing: keyframe every 1s, moderate quality
ffmpeg -i source.mp4 \
  -c:v libx264 -preset slow -crf 23 \
  -g 30 -keyint_min 30 \
  -an \
  -movflags +faststart \
  scrub-ready.mp4
```

### Phase 5: Chapter controller -- wiring scroll to video

```js
import { VideoScrubEngine } from './scrub-engine.js';

gsap.registerPlugin(ScrollTrigger);

const CHAPTERS = [
  { id: 'intro',    label: 'Introduction', start: 0,  end: 8,  overlay: 'Meet the product' },
  { id: 'problem',  label: 'The Problem',  start: 8,  end: 22, overlay: 'Why existing tools fail' },
  { id: 'solution', label: 'Our Approach',  start: 22, end: 45, overlay: 'A better way to build' },
  { id: 'demo',     label: 'Live Demo',     start: 45, end: 72, overlay: 'See it in action' },
  { id: 'results',  label: 'Results',       start: 72, end: 88, overlay: '3x faster, half the cost' },
  { id: 'cta',      label: 'Get Started',   start: 88, end: 96, overlay: 'Try it free today' },
];

const TOTAL_DURATION = CHAPTERS[CHAPTERS.length - 1].end;
const SCROLL_BUDGET_VH = 600;

function init() {
  const container = document.getElementById('video-chapters');
  const video = container.querySelector('.video-chapters__video');
  const overlayContainer = container.querySelector('.video-chapters__overlays');
  const progressFill = container.querySelector('.video-chapters__progress-fill');
  const navList = container.querySelector('.chapter-nav__list');

  const engine = new VideoScrubEngine(video);

  // Set container height for scroll budget
  container.style.height = `${SCROLL_BUDGET_VH}vh`;

  // Build overlay DOM
  CHAPTERS.forEach(ch => {
    const el = document.createElement('div');
    el.className = 'chapter-overlay';
    el.dataset.chapter = ch.id;
    el.innerHTML = `
      <div class="chapter-overlay__label">${ch.label}</div>
      <div class="chapter-overlay__text">${ch.overlay}</div>
    `;
    overlayContainer.appendChild(el);
  });

  // Build nav DOM
  CHAPTERS.forEach(ch => {
    const li = document.createElement('li');
    li.className = 'chapter-nav__item';
    li.dataset.chapter = ch.id;
    li.innerHTML = `
      <span class="chapter-nav__dot"></span>
      <span class="chapter-nav__label">${ch.label}</span>
    `;
    li.addEventListener('click', () => scrollToChapter(ch.id));
    navList.appendChild(li);
  });

  const overlayEls = overlayContainer.querySelectorAll('.chapter-overlay');
  const navItems = navList.querySelectorAll('.chapter-nav__item');

  // Main scroll trigger -- pins and scrubs
  ScrollTrigger.create({
    trigger: container,
    start: 'top top',
    end: `+=${SCROLL_BUDGET_VH}%`,
    pin: container.querySelector('.video-chapters__pinned'),
    scrub: 0.5,
    onUpdate(self) {
      const progress = self.progress;

      // Seek video
      engine.setProgress(progress, TOTAL_DURATION);

      // Update progress bar
      progressFill.style.width = `${progress * 100}%`;

      // Determine active chapter
      const currentTime = progress * TOTAL_DURATION;
      let activeIdx = 0;
      for (let i = 0; i < CHAPTERS.length; i++) {
        if (currentTime >= CHAPTERS[i].start && currentTime < CHAPTERS[i].end) {
          activeIdx = i;
          break;
        }
      }

      // Update overlays
      overlayEls.forEach((el, i) => {
        el.classList.toggle('active', i === activeIdx);
      });

      // Update nav
      navItems.forEach((el, i) => {
        el.classList.toggle('active', i === activeIdx);
      });
    },
  });

  // Click-to-chapter navigation
  function scrollToChapter(chapterId) {
    const ch = CHAPTERS.find(c => c.id === chapterId);
    if (!ch) return;
    const chapterProgress = ch.start / TOTAL_DURATION;
    const triggerInstance = ScrollTrigger.getAll()[0];
    if (!triggerInstance) return;
    const scrollTarget = triggerInstance.start + chapterProgress * (triggerInstance.end - triggerInstance.start);
    gsap.to(window, {
      scrollTo: { y: scrollTarget },
      duration: 0.8,
      ease: 'power2.inOut',
    });
  }
}

// Wait for video metadata before computing
const video = document.querySelector('.video-chapters__video');
if (video.readyState >= 1) {
  init();
} else {
  video.addEventListener('loadedmetadata', init, { once: true });
}
```

### Phase 6: Canvas image-sequence fallback for frame-perfect scrubbing

When seek latency is unacceptable (fast scrubbing, short videos where every frame matters), replace the `<video>` with a canvas drawing from pre-rendered frames. See primitive `image-sequence-scrubbing` for the full preloader and draw engine. The chapter controller is identical; only the seek call changes.

```js
import { SequenceLoader } from './sequence-loader.js'; // from image-sequence-scrubbing primitive

class CanvasScrubEngine {
  constructor(canvas, frameUrls) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.loader = new SequenceLoader(frameUrls);
    this.frameCount = frameUrls.length;
    this.currentFrame = -1;
    this.rafId = null;
    this.targetFrame = 0;

    const dpr = Math.min(window.devicePixelRatio, 2);
    this.canvas.width = this.canvas.offsetWidth * dpr;
    this.canvas.height = this.canvas.offsetHeight * dpr;
    this.ctx.scale(dpr, dpr);
  }

  async preloadEager(count = 12) {
    await this.loader.preloadEager(count);
    this._drawFrame(0);
  }

  setProgress(progress) {
    this.targetFrame = Math.round(progress * (this.frameCount - 1));
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => this._flush());
    }
  }

  _flush() {
    this.rafId = null;
    if (this.targetFrame === this.currentFrame) return;
    this._drawFrame(this.targetFrame);
  }

  _drawFrame(index) {
    const bitmap = this.loader.bitmaps[index];
    if (!bitmap) {
      // Frame not loaded yet. Draw nearest available.
      for (let offset = 1; offset < this.frameCount; offset++) {
        if (this.loader.bitmaps[index - offset]) { this._drawBitmap(this.loader.bitmaps[index - offset]); break; }
        if (this.loader.bitmaps[index + offset]) { this._drawBitmap(this.loader.bitmaps[index + offset]); break; }
      }
      // Stream this frame
      this.loader.loadIndex(index).then(bm => {
        if (bm && this.targetFrame === index) this._drawBitmap(bm);
      });
      return;
    }
    this._drawBitmap(bitmap);
    this.currentFrame = index;
    this.loader.streamRemaining(index, 6);
  }

  _drawBitmap(bitmap) {
    const w = this.canvas.offsetWidth;
    const h = this.canvas.offsetHeight;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.drawImage(bitmap, 0, 0, w, h);
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.loader.controller.abort();
  }
}
```

### Phase 7: Reduced-motion fallback

For users who prefer reduced motion, the scroll-scrub mechanic is replaced with a standard video player and chapter skip buttons.

```js
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function initReducedMotion() {
  const video = document.querySelector('.video-chapters__video');
  const container = document.getElementById('video-chapters');
  container.style.height = 'auto';

  // Show native controls
  video.controls = true;
  video.removeAttribute('aria-hidden');

  // Build chapter skip buttons
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Video chapters');
  const ol = document.createElement('ol');
  ol.style.cssText = 'list-style:none;display:flex;gap:0.5rem;padding:1rem;flex-wrap:wrap;';
  CHAPTERS.forEach(ch => {
    const btn = document.createElement('button');
    btn.textContent = ch.label;
    btn.style.cssText = 'padding:0.5rem 1rem;background:#222;color:#fff;border:1px solid #444;border-radius:4px;cursor:pointer;font-size:0.875rem;';
    btn.addEventListener('click', () => {
      video.currentTime = ch.start;
      video.play();
    });
    const li = document.createElement('li');
    li.appendChild(btn);
    ol.appendChild(li);
  });
  nav.appendChild(ol);
  container.appendChild(nav);
}

if (reducedMotion.matches) {
  initReducedMotion();
} else {
  init();
}
```

### Phase 8: Keyboard and screen reader support

```js
// Inside init(), after building nav:
navItems.forEach((item, i) => {
  item.setAttribute('role', 'button');
  item.setAttribute('tabindex', '0');
  item.setAttribute('aria-label', `Chapter ${i + 1}: ${CHAPTERS[i].label}`);
  item.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      scrollToChapter(CHAPTERS[i].id);
    }
  });
});

// Announce chapter changes to screen readers
let lastAnnouncedChapter = '';
function announceChapter(chapter) {
  if (chapter.id === lastAnnouncedChapter) return;
  lastAnnouncedChapter = chapter.id;
  const liveRegion = document.querySelector('.video-chapters__overlays');
  liveRegion.setAttribute('aria-label', `Now playing: ${chapter.label}`);
}
```

## The full reference implementation

```js
// chapters.js -- complete, self-contained
(function () {
  'use strict';
  gsap.registerPlugin(ScrollTrigger);

  const CHAPTERS = [
    { id: 'intro',    label: 'Introduction', start: 0,  end: 8,  overlay: 'Meet the product' },
    { id: 'problem',  label: 'The Problem',  start: 8,  end: 22, overlay: 'Why existing tools fail' },
    { id: 'solution', label: 'Our Approach',  start: 22, end: 45, overlay: 'A better way to build' },
    { id: 'demo',     label: 'Live Demo',     start: 45, end: 72, overlay: 'See it in action' },
    { id: 'results',  label: 'Results',       start: 72, end: 88, overlay: '3x faster, half the cost' },
    { id: 'cta',      label: 'Get Started',   start: 88, end: 96, overlay: 'Try it free today' },
  ];
  const TOTAL = CHAPTERS[CHAPTERS.length - 1].end;
  const BUDGET = 600;

  class ScrubEngine {
    constructor(v) {
      this.v = v; this.target = 0; this.last = -1; this.seeking = false; this.raf = null;
      v.pause();
      v.addEventListener('seeked', () => { this.seeking = false; });
    }
    set(p, dur) {
      this.target = Math.max(0, Math.min(p * dur, dur - 0.01));
      if (!this.raf) this.raf = requestAnimationFrame(() => this._f());
    }
    _f() {
      this.raf = null;
      if (this.seeking) { this.raf = requestAnimationFrame(() => this._f()); return; }
      if (Math.abs(this.target - this.last) < 0.03) return;
      this.v.currentTime = this.target; this.last = this.target; this.seeking = true;
    }
    kill() { if (this.raf) cancelAnimationFrame(this.raf); }
  }

  const container = document.getElementById('video-chapters');
  const video = container.querySelector('.video-chapters__video');
  const overlayBox = container.querySelector('.video-chapters__overlays');
  const progressFill = container.querySelector('.video-chapters__progress-fill');
  const navList = container.querySelector('.chapter-nav__list');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (reducedMotion.matches) { initReduced(); return; }

  container.style.height = BUDGET + 'vh';
  const engine = new ScrubEngine(video);

  CHAPTERS.forEach(ch => {
    const d = document.createElement('div');
    d.className = 'chapter-overlay'; d.dataset.chapter = ch.id;
    d.innerHTML = `<div class="chapter-overlay__label">${ch.label}</div><div class="chapter-overlay__text">${ch.overlay}</div>`;
    overlayBox.appendChild(d);
  });
  CHAPTERS.forEach((ch, i) => {
    const li = document.createElement('li');
    li.className = 'chapter-nav__item'; li.dataset.chapter = ch.id;
    li.setAttribute('role', 'button'); li.setAttribute('tabindex', '0');
    li.setAttribute('aria-label', 'Chapter ' + (i + 1) + ': ' + ch.label);
    li.innerHTML = '<span class="chapter-nav__dot"></span><span class="chapter-nav__label">' + ch.label + '</span>';
    li.addEventListener('click', () => jumpTo(ch.id));
    li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jumpTo(ch.id); } });
    navList.appendChild(li);
  });

  const overlays = overlayBox.querySelectorAll('.chapter-overlay');
  const navItems = navList.querySelectorAll('.chapter-nav__item');
  let lastAnnounced = '';

  ScrollTrigger.create({
    trigger: container,
    start: 'top top',
    end: '+=' + BUDGET + '%',
    pin: container.querySelector('.video-chapters__pinned'),
    scrub: 0.5,
    onUpdate(self) {
      const p = self.progress;
      engine.set(p, TOTAL);
      progressFill.style.width = (p * 100) + '%';
      const t = p * TOTAL;
      let ai = 0;
      for (let i = 0; i < CHAPTERS.length; i++) {
        if (t >= CHAPTERS[i].start && t < CHAPTERS[i].end) { ai = i; break; }
      }
      overlays.forEach((el, i) => el.classList.toggle('active', i === ai));
      navItems.forEach((el, i) => el.classList.toggle('active', i === ai));
      if (CHAPTERS[ai].id !== lastAnnounced) {
        lastAnnounced = CHAPTERS[ai].id;
        overlayBox.setAttribute('aria-label', 'Now playing: ' + CHAPTERS[ai].label);
      }
    },
  });

  function jumpTo(id) {
    const ch = CHAPTERS.find(c => c.id === id);
    if (!ch) return;
    const tr = ScrollTrigger.getAll()[0];
    if (!tr) return;
    const y = tr.start + (ch.start / TOTAL) * (tr.end - tr.start);
    gsap.to(window, { scrollTo: { y }, duration: 0.8, ease: 'power2.inOut' });
  }

  function initReduced() {
    container.style.height = 'auto';
    video.controls = true;
    video.removeAttribute('aria-hidden');
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Video chapters');
    const ol = document.createElement('ol');
    ol.style.cssText = 'list-style:none;display:flex;gap:0.5rem;padding:1rem;flex-wrap:wrap';
    CHAPTERS.forEach(ch => {
      const b = document.createElement('button');
      b.textContent = ch.label;
      b.style.cssText = 'padding:0.5rem 1rem;background:#222;color:#fff;border:1px solid #444;cursor:pointer;font-size:0.875rem';
      b.addEventListener('click', () => { video.currentTime = ch.start; video.play(); });
      const li = document.createElement('li'); li.appendChild(b); ol.appendChild(li);
    });
    nav.appendChild(ol); container.appendChild(nav);
  }
})();
```

## Tuning the feel

| Parameter | Value | Why |
|---|---|---|
| Scroll budget | 600vh for a 96s video | ~6.25vh per second of video. Slower than Apple (which uses ~8vh/s) but more comfortable for text-heavy chapters. Increase to 800vh if overlays have >50 words each. |
| Scrub smoothing | `scrub: 0.5` | Half-second catch-up. Smoother than `true` (instant, jittery), less laggy than `1` (feels delayed). |
| Seek threshold | 0.03s | One frame at 30fps. Prevents pointless seeks that produce no visible change. |
| Keyframe interval | 1 second (`-g 30`) | Keeps seek-to-decode latency under 50ms. Default is ~5s, which causes 100-200ms visible lag on fast scrub. File grows ~20%. |
| Overlay transition | 350ms cubic-bezier(0.22, 1, 0.36, 1) | Fast enough to feel responsive to scroll, slow enough to not flash on quick scrubs. |
| Chapter nav dot scale | 1.6x on active | Visible but not distracting. 2x+ competes with the video. |
| Progress bar height | 3px | Barely visible. 5px+ draws too much attention. |
| Video format | H.264 MP4 with `faststart` | Widest decode support. WebM/VP9 has faster seeking in Chrome but no Safari. |
| DPR cap (canvas fallback) | 2 | Canvas at DPR 3 on iPhones triples memory with no visible sharpness gain on video content. |

## Variants

### 1. Horizontal chapter timeline
Replace the vertical sidebar nav with a bottom-anchored horizontal timeline showing chapter thumbnails. Each thumbnail is a poster frame from that chapter's start timecode, extracted at build time.

### 2. Split-screen commentary
Video stays on the left 50% of the viewport, text content scrolls normally on the right. No sticky pinning -- the video's `currentTime` advances based on which text paragraph is in the viewport (IntersectionObserver, no ScrollTrigger needed). Good for tutorials where text is primary content.

### 3. Multi-angle chapters
Each chapter can specify an alternate video source or camera angle. On chapter boundary crossings, the engine crossfades between two `<video>` elements (one loading the next angle while the current plays).

### 4. Interactive chapter markers
Chapters have clickable hotspots overlaid on the video at specific coordinates (e.g., "click here to see specs"). These are positioned relative to the video frame and fire callbacks without affecting scroll position.

### 5. Ambient audio fade-per-chapter
Each chapter specifies a background audio track (ambient sound, music). The engine crossfades between audio sources at chapter boundaries using Web Audio API gain nodes, with a 300ms fade.

## Performance budget

| Metric | Target | Lever |
|---|---|---|
| Video payload | < 8 MB for 90s | CRF 23-26, 1080p, no audio, H.264 `faststart`. Drop to 720p on mobile. |
| Seek latency | < 50ms | Keyframe interval 1s (`-g 30`). |
| Scroll handler cost | < 2ms per tick | rAF gate prevents redundant seeks. No DOM reads in scroll handler. |
| LCP | < 2.5s | `preload="auto"` on video. First frame drawn before chapter system inits. |
| JS bundle | < 35 KB gzipped | GSAP core + ScrollTrigger. No other dependencies. |
| Canvas fallback payload | < 4 MB for 90 frames | WebP quality 75, 1200x800. See `image-sequence-scrubbing` for full budget math. |
| Frame rate during scrub | 60fps | Only `width` (on progress bar) and class toggles in scroll handler. No layout-triggering reads. |

## Accessibility

`prefers-reduced-motion: reduce` disables the entire scroll-scrub mechanic. The video becomes a standard player with native controls (`controls` attribute) and chapter skip buttons below it. The sticky pinning is removed, restoring normal scroll behavior.

The chapter nav items are keyboard-focusable (`tabindex="0"`, `role="button"`) and respond to Enter/Space. The overlay container has `aria-live="polite"` so chapter transitions are announced.

What this technique costs users who cannot use it: the tight coupling between scroll and playback is the entire point, and there is no way to preserve it without scroll input. The reduced-motion fallback is a fully functional but visually simpler experience -- a standard video player with chapter buttons.

## Anti-slop rules

1. DO NOT set `video.currentTime` directly inside a scroll event listener without rAF gating. Every scroll tick fires 60-120 events per second; the decoder cannot keep up.
2. DO NOT use the default keyframe interval. A 5-second keyframe interval makes backward scrubbing visibly laggy. Encode with `-g 30` (1s at 30fps).
3. DO NOT autoplay the video. The scroll is the playback control. Calling `video.play()` fights the scrub engine.
4. DO NOT use `scrub: true` (instant). The raw scroll input is jittery on mouse wheels and choppy on touchpads. Use `scrub: 0.3` to `scrub: 0.6` for a smoothed feel.
5. DO NOT hardcode chapter scroll positions in pixels. Use vh-proportional ranges computed from video durations. Pixel values break on resize.
6. DO NOT show all chapter overlays simultaneously. Only the active chapter's overlay should be visible. Stacking overlays creates visual noise.
7. DO NOT skip the `loadedmetadata` wait. Computing scroll budgets before the video's duration is known produces division-by-zero or NaN scroll ranges.
8. DO NOT forget `playsinline` on the `<video>` element. iOS Safari fullscreens video by default without it, breaking the entire scroll-scrub pattern.
9. DO NOT use `object-fit: contain` on the video unless the video aspect ratio is guaranteed to match the viewport. Use `cover` and accept cropping, or letterbox explicitly with background color.
10. DO NOT omit the progress bar. Without visual feedback of scrub position, users do not realize the video is scroll-controlled.
11. DO NOT leave the chapter nav visible after the pinned section releases. Hide it or fade it out when the trigger's `onLeave` fires.

## Integration notes

- Pairs with `lenis-smooth-scroll` for inertial scrolling. Init Lenis first, then register ScrollTrigger. See the Lenis primitive for the `scrollerProxy` pattern.
- If combined with `scroll-progress-storytelling`, the chapter data model here replaces that toolkit's act/beat structure. Do not layer both.
- Conflicts with any other scroll-hijacking library (fullPage.js, Locomotive Scroll v4). Only one scroll controller should exist.
- The chapter nav uses `position: fixed`, which stacks above everything. Set its `z-index` deliberately and test against site headers, modals, and cookie banners.

## Ship checklist

- [ ] Video encoded with 1s keyframe interval (`ffprobe -show_frames` confirms)
- [ ] `playsinline` and `muted` on the video element
- [ ] Scroll budget computed from actual video duration, not hardcoded
- [ ] Chapter nav highlights correct chapter at all scroll positions
- [ ] Click-to-chapter scrolls to the correct position
- [ ] rAF gate active -- no raw `currentTime` sets in scroll handler
- [ ] Progress bar fills from 0-100% across the full scrub range
- [ ] Overlays fade in/out at chapter boundaries without stacking
- [ ] Reduced-motion fallback shows native player + chapter skip buttons
- [ ] Chapter nav hidden after pin release
- [ ] Keyboard navigation works on chapter nav items
- [ ] Tested on Safari (seek behavior differs from Chrome)
- [ ] Video payload under budget (< 8 MB for 90s)
- [ ] No horizontal overflow at 320px viewport width
