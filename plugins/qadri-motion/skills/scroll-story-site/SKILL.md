---
name: scroll-story-site
description: "Plan and build a storybook-style scroll homepage that tells an animated story as the visitor scrolls: smooth scrolling, pinned chapters, scrubbed video or image sequences, parallax depth layers, kinetic type and page transitions. Written for Astro + Tailwind 4 static sites (QADRI template) but the engine works anywhere. Routes to the specialist skills for each technique and supplies the integration glue none of them cover: Lenis + GSAP ScrollTrigger inside Astro's ClientRouter, cleanup between navigations, reduced-motion and no-JS fallbacks, phone budgets. Use for scrollytelling, cinematic or Apple-style scroll pages, awwwards-style landing pages, an animated story homepage, or when such a page jitters, leaks animations after navigation or is slow on phones."
---

# Scroll story site

A scroll story is a page split into **chapters**. Each chapter pins, plays one idea
driven by scroll progress, then releases. The craft is mostly editorial: the
technique serves the beat, not the other way round.

## 1. Write the story before any code

List 4-7 beats. For each: what the visitor sees, the one sentence they read, and the
motion that carries it. Assign each beat ONE primary technique from the table. Two
heavy techniques in one beat is the most common way these pages get slow and noisy.

| Beat needs | Technique | Load this skill |
|---|---|---|
| Camera moves through a rendered world | Scrubbed frame sequence / video | `scroll-film`, `image-sequence-scrubbing`, `hero-video-scrub-apple`, `scroll-video-website` |
| Real-time 3D object turning or exploding | Three.js / R3F on a pinned canvas | `threejs-fundamentals`, `react-three-fiber`, `build-threejs-scroll-worlds` (qadri-3d: `threejs-product-viewer`, `threejs-splats`) |
| Layers sliding at different depths | Parallax depth layers | `parallax-depth-systems`, `scroll-parallax-layers-depth`, `threejs-parallax` |
| A sentence that builds word by word | Scrubbed word reveal / SplitText | `scroll-scrubbed-word-reveal`, `gsap-splittext-kinetic-type`, `gsap-text`, `scroll-text-highlight-reading` |
| Several panels in a row | Horizontal pinned scroll | `horizontal-scroll-scenes` |
| A line or route being drawn | SVG path draw | `gsap-svg-draw-morph`, `gsap-svg`, `svg-animation` |
| Image opens up / wipes in | Masked or clip-path reveal | `masked-reveal`, `reveal-hover-effect` |
| Section-to-section hand-off | Shader or curtain transition | `scroll-shader-transition-sections`, `paper-cinder-transition` |
| Numbers, a timeline, a process | Pinned chapter with steps | `scroll-chapter-pinned-story`, `sticky-pinning-sequences`, `scroll-progress-timeline` |
| Data story | Scroll-stepped charts | `chart-animation`, `d3-viz` |

Whole-page references to read once per project: `cinematic-scroll-storytelling`,
`cinematic-gsap-lenis-motion-system`, `motion-agent-scrollytelling`,
`narrative-scrollytelling` (accessibility-first), `build-awwwards-quality-sites`.
Art direction and pacing: `motion-art-direction`, `shot-composition`, `design-motion-principles`.

## 2. Pick the engine by weight

1. **CSS only** (`css-scroll-driven-animations`, `scroll-native-css-timeline-page`): reveals,
   progress bars, simple parallax. `animation-timeline: view()` runs off the main thread.
   Supported in Chromium and Safari 26+; wrap in `@supports (animation-timeline: view())`
   so other browsers just show the end state. Use this first.
2. **GSAP ScrollTrigger + Lenis**: pinning, scrubbed timelines, SplitText, anything chained.
   GSAP and all its plugins (SplitText, ScrollSmoother, MorphSVG, DrawSVG) are free for
   commercial use under GSAP's own licence (not MIT). Lenis is MIT.
3. **Canvas / WebGL** on top of 2 only for beats that need it, lazy-loaded.

Don't mix Lenis with ScrollSmoother or Locomotive. Pick one smooth scroller.

## 3. Astro integration (the part other skills miss)

Animation is plain `<script>` in an `.astro` component. Astro bundles it, and the page
ships no React. Use a React island only when the beat is itself an R3F scene, and give
it `client:visible`.

`src/scripts/motion.ts`:

```ts
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let lenis: Lenis | null = null;
const tick = (t: number) => lenis?.raf(t * 1000);

export function startMotion(setup: () => void) {
  const run = () => {
    if (!reduce.matches) {
      lenis = new Lenis({ autoRaf: false });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    }
    // gsap.matchMedia reverts everything it created when a query stops matching.
    const mm = gsap.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)' }, (ctx) => {
      if (ctx.conditions?.motion) setup();
    });
    document.addEventListener('astro:before-swap', () => {
      mm.revert();
      ScrollTrigger.getAll().forEach((t) => t.kill());
      gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = null;
    }, { once: true });
  };
  // astro:page-load fires on first load and after every ClientRouter navigation.
  document.addEventListener('astro:page-load', run);
}
```

In the page:

```astro
<section data-chapter class="relative h-[300svh]">
  <div class="sticky top-0 h-svh grid place-items-center">…</div>
</section>
<script>
  import { startMotion } from '../scripts/motion';
  import { gsap } from 'gsap';
  startMotion(() => {
    gsap.utils.toArray<HTMLElement>('[data-chapter]').forEach((el) => {
      gsap.timeline({ scrollTrigger: { trigger: el, start: 'top top', end: 'bottom bottom', scrub: true } })
        .from(el.querySelector('h2'), { yPercent: 40, opacity: 0 });
    });
  });
</script>
```

- Prefer CSS `position: sticky` in a tall section over `pin: true`. It needs no
  pin-spacer, survives Lenis, and degrades to a normal section without JS.
- Add `import 'lenis/dist/lenis.css'` once in the layout.
- Without the ClientRouter, `astro:page-load` still fires once, so the same code works.
- `gsap-astro` and `astro-view-transitions` cover persisted islands and `transition:name`.
  Page-to-page morphs belong to View Transitions (`view-transitions-api`,
  `web-animation-view-transitions`), not GSAP.

## 4. Non-negotiables

- **Content first.** Every headline and paragraph is in the HTML and readable with JS off.
  Motion only transforms what is already there. One `h1`, heading order intact (the
  template's `check-pages.mjs` enforces it).
- **Reduced motion.** With `prefers-reduced-motion: reduce`, no Lenis and no scrub:
  show each chapter's end state, swap scrubbed video for its poster frame. See `accessible-animation`.
- **Phones.** Test at 360px. Shorten chapters (`h-[200svh]` instead of 300), use
  portrait frame sets, cap canvas DPR at 2, and drop parallax layers to 2-3. See
  `scroll-mobile-performance-strategy`.
- **Budget.** Initial JS under ~120 KB gzip with GSAP + Lenis. Lazy-load frame sequences
  per chapter (`IntersectionObserver` with ~1 viewport rootMargin). Hero LCP stays a
  real `<img>` or poster with explicit `width`/`height`.
- **Animate only transform, opacity, filter, clip-path.** Never layout properties on scroll
  (`fixing-motion-performance`, `60fps-animation`).
- Colours come from `theme.css` tokens even inside canvases. Read them with `getComputedStyle`.

## 5. Verify

Run the build. Then scroll the page in Playwright or chrome-devtools: capture a
screenshot at 0%, 25%, 50%, 75% and 100% of each chapter (`frame-capture`), at 1440px
and at 360px, plus one pass with `reducedMotion: 'reduce'`. Run the motion review
skills (`scroll-audit`, `emil-review-animations`) before calling it done.
