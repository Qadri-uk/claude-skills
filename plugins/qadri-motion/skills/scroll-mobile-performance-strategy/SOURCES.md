# Sources: scroll-mobile-performance-strategy

## Corpus files mined

| File | What it contributed |
|---|---|
| `_raw/MustBeSimo_cinematic-scroll-skill/references/performance-budget.md` (603 lines) | Frame budget table (16.67ms breakdown), permitted/forbidden animated properties, will-change strategy (timing, max elements, never global), layer count budgets per device class, scroll handler timing limits (2ms max). Core performance framework. |
| `_raw/AThevon_genjutsu/skills/_jutsu/mobile-principles/SKILL.md` (289 lines) | Mobile-specific UX: touch targets, thumb zones, safe areas, mobile performance budgets. |
| `_raw/iart-ai_web-animation-skills/skills/60fps-animation/SKILL.md` (210 lines) | 60fps animation principles: layout thrashing avoidance, compositor-safe properties, will-change usage. |
| `_raw/greensock_gsap-skills/skills/gsap-performance/SKILL.md` (79 lines) | GSAP-specific performance: quickTo for followers, stagger over separate tweens, ScrollTrigger.refresh debouncing, kill offscreen. |
| `_raw/luthfierlmbang_Fluke-Motion/skills/fluke-motion/references/advanced-techniques.md` (226 lines) | Thermal throttle note ("mobile GPUs thermal-throttle 60->20fps after ~30s sustained"), render-on-demand pattern, DPR cap guidance. |
| `_raw/MariusYvard_NullToHero/null-to-hero/skills/siteasy/references/mobile-ergonomics.md` (116 lines) | Virtual keyboard handling, cellular performance perception, mobile navigation patterns. |
| `_raw/freshtechbro_claudedesignskills/plugins/bundles/extended-3d-scroll/skills/pixijs-2d/references/performance_guide.md` (1050 lines) | GPU memory budgets for textures, batch rendering, offscreen culling, DPR strategies. Applied to compositor layer sizing. |

## Primitives cross-referenced

| Primitive | Relationship |
|---|---|
| `gsap-scrolltrigger` | ScrollTrigger configuration, limitCallbacks, matchMedia, batch. |
| `lenis-smooth-scroll` | Lenis gating on touch/reduced-motion; smoothTouch: false. |
| `parallax-depth-systems` | Parallax is the first casualty on mobile. This toolkit specifies when to cut it. |
| `image-sequence-scrubbing` | Image sequences are the highest bandwidth mobile concern; DPR capping applies. |
| `canvas-2d-performance` | Canvas DPR capping, offscreen culling. |
| `easing-curves-timing-design` | Linear easing for scrubbed animations to avoid per-frame interpolation cost. |

## Hero skills cross-referenced

| Hero | Relationship |
|---|---|
| `hero-video-scrub-apple` | Image sequence loading strategy directly relevant; DPR cap and progressive loading. |
| `hero-scroll-zoom-portal` | Pinned zoom is expensive on mobile; this toolkit decides whether to keep or cut it. |

## External references

- Chrome "Performant Parallaxing" guide (web.dev)
- GSAP ScrollTrigger performance docs
- WebKit blog on compositor layers
- Samsung Developer Device Lab specifications
