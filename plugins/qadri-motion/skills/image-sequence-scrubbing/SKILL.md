---
name: image-sequence-scrubbing
description: Use when building an Apple-style canvas frame-by-frame scroll scrubber (product reveal that rotates or animates as you scroll), covering frame count math, preloading strategy, decode(), canvas draw loop, image format/size budgeting, and the video currentTime-scrub fallback.
---

# Image Sequence Scrubbing

## When to use this
- You want a product reveal where scrolling frame-steps through a pre-rendered sequence (a 3D render turntable, an exploded-view animation, a physical product being unboxed), the technique Apple popularized on product pages.
- You need frame-perfect scroll sync where a canvas draw call is cheaper and more controllable than a video element's `currentTime` seeking, which has inherent seek latency.
- You have pre-rendered frames (from Blender, After Effects, or a real photo/video shoot) and need a loading strategy that does not block first paint or blow the page's data budget.
- Do NOT use this for actual video content the user might want to just play normally (testimonials, tutorials); use a normal `<video>` element. Do NOT use this for anything achievable with CSS/SVG animation, canvas sequences are for cases where the visual genuinely comes from pre-rendered raster frames.

## Mental model
The technique is: pre-render N frames of an animation as individual images, map scroll progress (0-1) to a frame index (0 to N-1), and on every scroll tick draw the current frame into a `<canvas>`. The canvas approach beats a `<video>` element with `currentTime` scrubbing for interactive frame-stepping because video seeking is asynchronous and throttled by the browser's decoder (`seeked` event can lag scroll input by 50-150ms depending on codec and keyframe distance), while drawing a already-decoded `ImageBitmap` to canvas is synchronous and sub-frame-cheap.

The two hard problems are frame count math and preloading. Frame count math: you need enough frames that adjacent frames don't show a visible jump (the "flip book" test — at normal scroll speed, consecutive frames should differ by roughly 1-3 degrees of rotation or equivalent visual delta, not 10+), but not so many that total download size becomes unreasonable. A typical product turntable covering a full 360-degree rotation over a comfortable scroll distance uses 60-150 frames; a shorter directional reveal (product assembling itself) might only need 30-60.

Preloading strategy: you cannot wait for all N frames to download before starting, that blocks interaction for seconds. The standard approach is to preload a small initial batch (enough to cover the first screen's worth of scroll) eagerly, then stream the rest in the background sorted by proximity to current scroll position, using `decode()` on each `Image`/`ImageBitmap` before it's needed so the actual draw call never blocks on decode (decode is where most per-frame canvas jank comes from if skipped). `createImageBitmap()` is preferred over plain `<img>` + `drawImage` because it decodes off the main thread and can be drawn without triggering the image's own layout/paint machinery.

Size budgeting matters more here than almost any other web animation technique because you are shipping dozens to hundreds of images. A single reveal sequence at reasonable canvas resolution (e.g. 1200x800 WebP at quality 75) commonly runs 15-40KB per frame; 90 frames at 25KB average is ~2.25MB, which is a real, user-felt payload on mobile connections and needs explicit budgeting decisions (resolution, frame count, format) rather than defaulting to "render at full resolution and see."

## Setup
No library strictly required; vanilla canvas + `createImageBitmap`. Optionally pair with GSAP ScrollTrigger for the scroll-to-progress mapping.
```bash
npm install gsap@3.12.5
```
```js
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)
```
Frame export from Blender/After Effects: export as a numbered sequence (`frame_0001.webp` ... `frame_0090.webp`), WebP or AVIF for size, PNG only if you need true alpha transparency compositing over varied backgrounds and WebP alpha isn't sufficient for your pipeline.

## Core API
| API | Signature | Note |
|---|---|---|
| `createImageBitmap(blob, opts?)` | `Promise<ImageBitmap>` | off-main-thread decode, preferred over `new Image()` for sequences |
| `ctx.drawImage(bitmap, 0, 0, w, h)` | canvas 2D method | draws a decoded bitmap; cheap once decoded |
| `HTMLImageElement.decode()` | `Promise<void>` | forces async decode ahead of draw if using plain `<img>` |
| `canvas.width` / `canvas.height` | numbers | must be set explicitly (not via CSS) to avoid blurry upscaled canvas |
| `devicePixelRatio` | number | multiply canvas backing-store size by this, then CSS-size down, for sharp rendering |
| `requestAnimationFrame` | scheduler | only redraw canvas inside a rAF callback, never directly inside a scroll event |
| `ScrollTrigger.create({ onUpdate })` | GSAP | supplies `self.progress` (0-1) to map to frame index |
| `AbortController` | native | cancel in-flight frame fetches on route change/unmount |

## Recipes

### Frame count / vh budget calculator
Computes a defensible frame count and total scroll distance before you render anything.
```js
function planSequence({ totalDegreesOrPercent = 360, maxJumpPerFrame = 3, vhPerFrame = 4 }) {
  const frameCount = Math.ceil(totalDegreesOrPercent / maxJumpPerFrame)
  const totalVh = frameCount * vhPerFrame
  return { frameCount, totalVh }
}

// 360-degree turntable, no more than 3 degrees of visible rotation per frame
planSequence({ totalDegreesOrPercent: 360, maxJumpPerFrame: 3, vhPerFrame: 4 })
// -> { frameCount: 120, totalVh: 480 }
```

### Priority-ordered preloader (near-current-scroll frames first)
Loads a small eager batch immediately, then streams the rest ordered by distance from the last-requested frame.
```js
class SequenceLoader {
  constructor(urls) {
    this.urls = urls
    this.bitmaps = new Array(urls.length).fill(null)
    this.loading = new Set()
    this.controller = new AbortController()
  }

  async loadIndex(i) {
    if (this.bitmaps[i] || this.loading.has(i)) return this.bitmaps[i]
    this.loading.add(i)
    try {
      const res = await fetch(this.urls[i], { signal: this.controller.signal })
      const blob = await res.blob()
      const bitmap = await createImageBitmap(blob)
      this.bitmaps[i] = bitmap
      return bitmap
    } finally {
      this.loading.delete(i)
    }
  }

  async preloadEager(count) {
    await Promise.all(
      Array.from({ length: Math.min(count, this.urls.length) }, (_, i) => this.loadIndex(i))
    )
  }

  streamRemaining(fromIndex, batchSize = 6) {
    const remaining = this.urls
      .map((_, i) => i)
      .filter((i) => !this.bitmaps[i])
      .sort((a, b) => Math.abs(a - fromIndex) - Math.abs(b - fromIndex))

    let cursor = 0
    const loadNextBatch = async () => {
      const batch = remaining.slice(cursor, cursor + batchSize)
      cursor += batchSize
      await Promise.all(batch.map((i) => this.loadIndex(i)))
      if (cursor < remaining.length) requestIdleCallback(() => loadNextBatch())
    }
    requestIdleCallback(() => loadNextBatch())
  }

  destroy() {
    this.controller.abort()
    this.bitmaps.forEach((b) => b?.close())
  }
}
```

### Scroll-to-frame canvas draw loop bound to ScrollTrigger
Maps scroll progress to a frame index and draws only when the index actually changes.
```js
const canvas = document.querySelector('#sequence-canvas')
const ctx = canvas.getContext('2d')
const dpr = Math.min(window.devicePixelRatio || 1, 2)
const FRAME_COUNT = 120

function sizeCanvas() {
  const cssWidth = canvas.clientWidth
  const cssHeight = canvas.clientHeight
  canvas.width = cssWidth * dpr
  canvas.height = cssHeight * dpr
}
sizeCanvas()
window.addEventListener('resize', sizeCanvas)

const urls = Array.from({ length: FRAME_COUNT }, (_, i) =>
  `/sequence/frame_${String(i + 1).padStart(4, '0')}.webp`
)
const loader = new SequenceLoader(urls)

let currentFrame = -1
let pendingFrame = 0
let rafScheduled = false

function drawFrame(index) {
  const bitmap = loader.bitmaps[index]
  if (!bitmap) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  currentFrame = index
}

function scheduleDraw() {
  if (rafScheduled) return
  rafScheduled = true
  requestAnimationFrame(() => {
    rafScheduled = false
    if (pendingFrame !== currentFrame) {
      if (loader.bitmaps[pendingFrame]) {
        drawFrame(pendingFrame)
      } else {
        loader.loadIndex(pendingFrame).then(() => scheduleDraw())
      }
    }
  })
}

loader.preloadEager(12).then(() => {
  drawFrame(0)
  loader.streamRemaining(0)
})

ScrollTrigger.create({
  trigger: '#sequence-section',
  start: 'top top',
  end: '+=480%',
  pin: true,
  onUpdate: (self) => {
    pendingFrame = Math.min(FRAME_COUNT - 1, Math.floor(self.progress * FRAME_COUNT))
    loader.streamRemaining(pendingFrame)
    scheduleDraw()
  },
})
```

### Video `currentTime` scrub fallback (lower engineering cost, higher seek latency)
Uses a single compressed video file instead of N images, trading precision for simplicity and much smaller payload.
```js
const video = document.querySelector('#sequence-video')
video.pause()

video.addEventListener('loadedmetadata', () => {
  ScrollTrigger.create({
    trigger: '#sequence-section',
    start: 'top top',
    end: '+=480%',
    pin: true,
    onUpdate: (self) => {
      const targetTime = self.progress * video.duration
      // rAF-throttled set to avoid overwhelming the decoder with seek requests
      requestAnimationFrame(() => {
        video.currentTime = targetTime
      })
    },
  })
})
```
```html
<video id="sequence-video" src="/sequence/turntable.mp4" muted playsinline preload="auto"></video>
```

### Retina-aware responsive frame sourcing
Serves smaller frames on mobile viewports to cut payload, using a `srcset`-like manual resolution switch.
```js
function getFrameBaseUrl() {
  const width = window.innerWidth
  if (width < 640) return '/sequence/mobile' // e.g. 640x420 frames
  if (width < 1200) return '/sequence/tablet' // e.g. 960x640 frames
  return '/sequence/desktop' // e.g. 1440x960 frames
}
const urls = Array.from({ length: FRAME_COUNT }, (_, i) =>
  `${getFrameBaseUrl()}/frame_${String(i + 1).padStart(4, '0')}.webp`
)
```

### Cleanup on unmount to release decoded bitmap memory
Explicitly closes every `ImageBitmap` since they hold GPU/CPU-side decoded buffers that don't get garbage collected promptly otherwise.
```js
function teardownSequence(loader, scrollTriggerInstance) {
  scrollTriggerInstance.kill()
  loader.destroy() // aborts pending fetches and calls bitmap.close() on all loaded frames
}
```

## Tuning the feel
- `vhPerFrame`: 3-5vh per frame is a comfortable default; below 2vh the sequence feels twitchy/oversensitive to small scroll amounts, above 8vh it feels sluggish, like scrolling isn't doing much.
- Max visible rotation/change per frame: 2-4 degrees for a rotating product, or roughly 1-2% state change for a non-rotational transformation (assembly, fill level). Test by scrubbing at a deliberately fast flick speed; if you can see individual frame pops at fast scroll, increase frame count or reduce vh-per-frame.
- `dpr` cap at 2 even on 3x devices; the visual difference between 2x and 3x on a canvas this size is imperceptible but the memory/decode cost scales quadratically with pixel count.
- Video fallback seek throttling: wrap `video.currentTime` sets in `requestAnimationFrame`, and consider only updating when the delta exceeds ~0.02s of video time, to avoid queuing more seeks than the decoder can service, which is the main cause of laggy video-scrub feel.

## Performance
- Never draw inside the raw scroll or `onUpdate` callback directly if it might fire faster than rAF; always route through a single pending-frame + rAF-scheduled-draw pattern (as in the recipe) so multiple scroll ticks within one frame collapse into a single draw call.
- `createImageBitmap` decode happens off the main thread; plain `new Image()` decode can still block if you don't explicitly call `.decode()` first, which is a common source of first-frame jank.
- Memory: each decoded bitmap at 1440x960 costs roughly 5.5MB uncompressed (w*h*4 bytes) in GPU/CPU memory regardless of its compressed file size; 120 frames fully decoded and held is ~660MB, which can pressure mobile devices. Consider a sliding window (only keep decoded bitmaps within +/-30 frames of current position, `.close()` the rest) for very long sequences instead of holding all frames forever.
- Profile with Chrome DevTools Performance panel filtering for "Decode Image" and "Paint" entries; healthy scrubbing shows draw calls under 2-3ms each with no decode work happening synchronously during scroll.

## Accessibility
```js
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
if (prefersReduced) {
  // draw only the final (or a single representative) frame, skip pin/scroll-binding entirely
  loader.preloadEager(1).then(() => drawFrame(FRAME_COUNT - 1))
} else {
  // full scroll-scrubbed setup
}
```
- Provide `alt`-equivalent context: a `<canvas>` has no inherent text alternative, add an `aria-label` describing what the sequence depicts (e.g. `aria-label="360-degree view of the product in matte black"`), or a visually-hidden text description alongside it.
- Do not gate any essential product information (specs, price, CTA) behind requiring the user to scroll through the sequence; the sequence should be supplementary visual context, not a comprehension gate.

## Anti-slop rules
- Never ship frames at full source-render resolution "just in case"; always resize/compress to the actual maximum display size times capped DPR before export, oversized frames are the single largest performance mistake in this pattern.
- Never block interactivity waiting for all frames; a visible loading state for the eager batch only, with background streaming for the rest, is mandatory past ~20 frames.
- Never use PNG for sequences without genuine alpha transparency needs; WebP/AVIF cut payload 60-80% for typical product-render content with no visible quality loss at web display sizes.
- Never let vh-per-frame create a sequence that finishes rotating/animating in the first 20% of its pinned scroll range and then sits static; recompute the vh budget to match frame count, or the tail becomes dead scroll (see `sticky-pinning-sequences`).
- Never skip `.decode()`/`createImageBitmap` and draw directly from a freshly-created `Image.src` assignment; the first draw of an undecoded image can visibly flash/jank.
- Never leave decoded bitmaps un-disposed on route change in an SPA; call `.close()` on every bitmap and abort in-flight fetches, or memory accumulates across navigations.

## Checklist
- [ ] Frame count computed from a maximum-visible-jump target, not guessed
- [ ] Eager preload batch covers first-screen scroll distance before interaction starts
- [ ] Remaining frames stream in background, prioritized by proximity to current scroll position
- [ ] Canvas backing store sized by `devicePixelRatio` (capped at 2), not left at CSS size
- [ ] Draw calls routed through a single rAF-scheduled function, never called directly from scroll
- [ ] Bitmaps disposed (`.close()`) and fetches aborted on unmount/route change
- [ ] Responsive frame sourcing serves smaller images on mobile viewports
- [ ] `prefers-reduced-motion` shows a single static representative frame
- [ ] `aria-label` or equivalent text alternative describes the sequence's content
- [ ] Verified real payload size (total KB for full sequence) against a stated budget before shipping
