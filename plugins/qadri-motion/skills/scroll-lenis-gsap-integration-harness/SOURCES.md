# Sources: scroll-lenis-gsap-integration-harness

## Corpus files mined

| File | What it contributed |
|---|---|
| `_raw/freshtechbro_claudedesignskills/.factory/skills/locomotive-scroll/references/gsap_integration.md` (613 lines) | Locomotive Scroll + GSAP ScrollTrigger integration pattern: scrollerProxy, getBoundingClientRect, pinType detection, refresh strategy. Used as the historical pattern that Lenis superseded. |
| `_raw/freshtechbro_claudedesignskills/.factory/skills/gsap-scrolltrigger/references/common_patterns.md` (1228 lines) | ScrollTrigger patterns: pinning, horizontal scroll, parallax, stagger, batch, snap. Provided the recipe library for what runs inside the harness. |
| `_raw/MustBeSimo_cinematic-scroll-skill/references/performance-budget.md` (603 lines) | Scroll handler timing budget (2ms max), will-change layer limits, resize debounce guidance. |
| `_raw/luthfierlmbang_Fluke-Motion/skills/fluke-motion/references/advanced-techniques.md` (226 lines) | Lenis as de-facto smooth-scroll standard, GSAP ticker integration pattern, normalizeScroll for iOS, the note that Loco v5 uses Lenis internally. |
| `_raw/greensock_gsap-skills/skills/gsap-performance/SKILL.md` (79 lines) | GSAP performance rules: prefer transforms, quickTo for followers, ScrollTrigger refresh debouncing, kill offscreen animations. |

## Primitives cross-referenced

| Primitive | Relationship |
|---|---|
| `lenis-smooth-scroll` | Documents Lenis API in isolation. This harness builds on it with GSAP wiring, resize, and cleanup. |
| `gsap-scrolltrigger` | Documents ScrollTrigger API. This harness integrates it with Lenis. |
| `gsap-core-timelines` | Timeline and tween APIs used inside registerAct. |
| `sticky-pinning-sequences` | Pinning configs run inside this harness. |
| `stagger-orchestration` | Stagger patterns used in batch reveals. |

## Hero skills cross-referenced

| Hero | Relationship |
|---|---|
| `hero-scroll-morph-shape` | Uses GSAP ScrollTrigger for scroll-driven SVG morph. Would run inside this harness. |
| `hero-scroll-zoom-portal` | Uses pinned ScrollTrigger for scroll-zoom. Would run inside this harness. |
| `hero-video-scrub-apple` | Uses ScrollTrigger scrub for video playback. Would run inside this harness. |

## External references

- Lenis GitHub: https://github.com/darkroomengineering/lenis
- GSAP ScrollTrigger docs: https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- Studio Freight (Lenis creators) integration guide
