---
name: motion-catalogue
description: |
  Domain navigator for motion, animation, 3D, and generative media skills.
  Routes to the right skill for GSAP, Framer Motion, Three.js, Lottie,
  shaders, generative art, video, and AI media generation.
triggers:
  - "motion skills"
  - "animation skill"
  - "GSAP skill"
  - "Three.js skill"
  - "Framer Motion skill"
  - "Lottie skill"
  - "shader skill"
  - "generative art skill"
  - "WebGL skill"
  - "video generation skill"
  - "creative coding skill"
---

# motion-catalogue

Domain navigator for motion design, animation, 3D, shaders, and generative media.
Activate when the user asks for a skill in one of these areas.

→ For the full catalogue across all domains: use `design-catalogue`.

## When to use

Activate when the user:
- Asks about animation libraries (GSAP, Framer Motion, Lottie, CSS animations)
- Wants 3D (Three.js, WebGPU, shaders, WebGL, R3F)
- Needs generative art (p5.js, algorithmic art, creative coding)
- Wants video/media generation (Remotion, fal.ai, generative media)

## Motion & Animation

| Skill | Best for |
|-------|----------|
| [`gsap-core`](../gsap-core/SKILL.md) (+ `gsap-timeline`, `gsap-scrolltrigger`, `gsap-plugins`, `gsap-react`) | Official GSAP: core, timeline, ScrollTrigger, Flip, Draggable, SplitText |
| [`motion`](../motion/SKILL.md) | Official Motion team skill (Motion, ex Framer Motion, + CSS): best practices, docs/example search, CSS springs, performance audits, upgrades |
| [`framer-motion-core`](../framer-motion-core/SKILL.md) (+ `-scroll`, `-gestures`, `-layout`, `-variants`, `-react`) | Framer Motion: Next.js, variants, scroll, gestures, layout |
| [`motion-design-skill`](../motion-design-skill/SKILL.md) | Official LottieFiles: timing, easing, choreography, Disney 12 principles |
| [`animate-skill`](../animate-skill/SKILL.md) | Emil-inspired Next.js/React patterns: hover, toast, text reveal, modals |
| [`animate-css-skill`](../animate-css-skill/SKILL.md) | Animate.css v4 + scroll triggers + RTL + prefers-reduced-motion |
| [`css-animation-skill`](../css-animation-skill/SKILL.md) | Scrapes live app design language → standalone animation file |
| [`wiggle-claude-skill`](../wiggle-claude-skill/SKILL.md) | Animates SVG logos → Lottie JSON → GIF + MP4 |
| [`emil-animate`](../emil-animate/SKILL.md) (+ `emil-choreograph`, `emil-review-animations`, 16 more `emil-*`) | Animation decision framework, easing curves, interaction principles |
| [`design-motion-principles`](../design-motion-principles/SKILL.md) | Motion audit against AI-slop patterns; build or review, weighted by project context |
| [`fixing-motion-performance`](../fixing-motion-performance/SKILL.md) | Audit and fix janky CSS/JS motion: layout thrashing, compositor properties, scroll-linked motion |
| [`magic-ui`](../magic-ui/SKILL.md) | Magic UI animated React components: marquee, globe, blur-fade, magic-card, shiny-button |
| [`claudedesignskills`](../claudedesignskills/SKILL.md) | Motion/creative-coding bundle: Three.js, GSAP, R3F, Framer Motion, Babylon, A-Frame, PixiJS, Rive, Lottie, Spline |
| [`hyperframes`](../hyperframes/SKILL.md) | "Write HTML → render video": GSAP/CSS/Lottie/Three.js + TTS (HeyGen) |
| [`huashu-art-motion`](../huashu-art-motion/SKILL.md) | Art-style and explainer video animation by code: storyboard → render → QA → deliver (Chinese docs) |
| [`oil-motion`](../oil-motion/SKILL.md) | Scroll/pointer-driven web animation from AI video or sprite sequences (Chinese docs) |

## Generative Art & Creative Coding

| Skill | Best for |
|-------|----------|
| [`algorithmic-art`](../algorithmic-art/SKILL.md) | Generative art with p5.js, flow fields, particle systems |
| [`p5js-hermes`](../p5js-hermes/SKILL.md) | p5.js creative coding: noise, particles, GLSL, audio-reactive |
| [`remotion`](../remotion/SKILL.md) | Programmatic video with React |

## 3D, Shaders & Media

| Skill | Best for |
|-------|----------|
| [`shader-dev`](../shader-dev/SKILL.md) | GLSL shaders: ray marching, fluid simulation, WebGL effects |
| [`threejs-fundamentals`](../threejs-fundamentals/SKILL.md) (+ 12 more `threejs-*`) | Three.js 3D scenes, animations, WebGL |
| [`webgpu-claude-skill`](../webgpu-claude-skill/SKILL.md) | Three.js TSL, node materials, GPU compute, WGSL — r183+ |
| [`threejs-ecs-ts`](../threejs-ecs-ts/SKILL.md) | Three.js + Entity Component Systems + TypeScript |
| [`threejs-impl-webgpu`](../threejs-impl-webgpu/SKILL.md) (+ `threejs-impl-*`, `threejs-core-*`, `threejs-syntax-*`) | WebGL, WebGPU, R3F, physics, IFC/BIM architecture, one skill per topic |
| [`fal-ai-skills`](../fal-ai-skills/SKILL.md) | fal.ai image/video and 3D model generation |
| [`generative-media-skills`](../generative-media-skills/SKILL.md) | AI media via muapi.ai: cinematic video, Nano Banana images, Seedance, product ads, thumbnails (needs muapi account + CLI) |
| [`scroll-world`](../scroll-world/SKILL.md) | Scroll-scrubbed "fly through the world" landing page from AI-generated scenes (needs funded Higgsfield/Monid account) |

## Scroll storytelling (start with `scroll-story-site`)

| Skill | Best for |
|-------|----------|
| [`scroll-story-site`](../scroll-story-site/SKILL.md) | Router + Astro/Lenis/GSAP glue for storybook scroll homepages |
| [`cinematic-gsap-lenis-motion-system`](../cinematic-gsap-lenis-motion-system/SKILL.md) | Full Lenis + GSAP motion system: preloader, chapters, cursor |
| [`cinematic-scroll-storytelling`](../cinematic-scroll-storytelling/SKILL.md) | Narrative chapter structure for cinematic scroll pages |
| [`lenis-smooth-scroll`](../lenis-smooth-scroll/SKILL.md) | Lenis setup, anchors, nested scroll, ScrollTrigger sync |
| [`css-scroll-driven-animations`](../css-scroll-driven-animations/SKILL.md) | Native `animation-timeline: scroll()/view()` |
| [`view-transitions-api`](../view-transitions-api/SKILL.md) / [`astro-view-transitions`](../astro-view-transitions/SKILL.md) | Page-to-page morphs; Astro ClientRouter |
| [`gsap-astro`](../gsap-astro/SKILL.md) | GSAP lifecycle inside Astro navigations |
| [`image-sequence-scrubbing`](../image-sequence-scrubbing/SKILL.md) / [`hero-video-scrub-apple`](../hero-video-scrub-apple/SKILL.md) | Apple-style scrubbed frames and video |
| [`horizontal-scroll-scenes`](../horizontal-scroll-scenes/SKILL.md) | Pinned horizontal panels |
| [`parallax-depth-systems`](../parallax-depth-systems/SKILL.md) | Layered depth parallax |
| [`gsap-splittext-kinetic-type`](../gsap-splittext-kinetic-type/SKILL.md) / [`scroll-scrubbed-word-reveal`](../scroll-scrubbed-word-reveal/SKILL.md) | Kinetic type and word reveals |
| [`gsap-scroll-smoother`](../gsap-scroll-smoother/SKILL.md), [`gsap-flip`](../gsap-flip/SKILL.md), [`gsap-svg`](../gsap-svg/SKILL.md) | Deep dives on ScrollSmoother, Flip, DrawSVG/MorphSVG |
| [`theatre-js`](../theatre-js/SKILL.md) | Keyframed cinematic sequences with Theatre.js studio |
| [`magnetic-cursor-interactions`](../magnetic-cursor-interactions/SKILL.md), [`marquee-infinite-ticker`](../marquee-infinite-ticker/SKILL.md) | Cursor, magnetic buttons, marquees |
| [`narrative-scrollytelling`](../narrative-scrollytelling/SKILL.md) | Accessibility-first scrollytelling |
| [`awwwards-site-builder`](../awwwards-site-builder/SKILL.md) | Award-level site from a one-line brief |
| [`web-video-backgrounds`](../web-video-backgrounds/SKILL.md) | Encoding, poster/LCP and autoplay for video backgrounds |
| `emil-*` (19) | Emil Kowalski: animate, choreograph, review, remove, performance |

Advanced 3D (atmosphere, ocean, procedural materials, particles, post-fx, model-viewer, splats) is in the **qadri-3d** plugin.
