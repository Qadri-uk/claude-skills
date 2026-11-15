# Sources: scroll-native-css-timeline-page

## Corpus files mined

| File | What it contributed |
|---|---|
| `_raw/AThevon_genjutsu/skills/_jutsu/css-native/SKILL.md` (319 lines) | Core CSS scroll-driven animation API: `scroll()`, `view()`, `animation-range` named regions, `@starting-style`, View Transitions. Provided the decision table for when CSS native beats JS libraries. |
| `_raw/luthfierlmbang_Fluke-Motion/skills/fluke-motion/references/advanced-techniques.md` (226 lines) | 2026 browser support matrix, CSS-only perspective parallax trick (Keith Clark), native `animation-trigger` (Chrome 145+), modern parallax rules, the note that `animation` shorthand resets `animation-timeline`. |
| `_raw/MustBeSimo_cinematic-scroll-skill/references/performance-budget.md` (603 lines) | The 60fps contract: frame budget table, permitted/forbidden animated properties, will-change rules (max 3 simultaneous, 200ms lead/lag), layer count budgets per device class, scroll handler timing limits. |
| `_raw/s1gmamale1_apple-design-skills/skills/apple-design-web/references/scrollytelling-techniques.md` (976 lines) | Apple-style scroll-driven storytelling patterns: pinned reveals, text crossfades, full-bleed image reveals. Provided the act-structure concept and crossfade approach. |
| `_raw/freshtechbro_claudedesignskills/.factory/skills/gsap-scrolltrigger/references/common_patterns.md` (1228 lines) | GSAP ScrollTrigger patterns used as contrast/comparison: pinning, horizontal scroll, parallax, stagger, text animation. Helped define where CSS-native can and cannot replace ScrollTrigger. |

## Primitives cross-referenced

| Primitive | Relationship |
|---|---|
| `css-scroll-driven-animations` | API-level primitive this toolkit builds on. This toolkit adds architectural patterns (act structure, pacing math, parallax layers) on top of the primitive's API documentation. |
| `scroll-progress-storytelling` | GSAP-based alternative for the same deliverable. This toolkit references it as the choice when pinning or complex choreography is needed. |
| `sticky-pinning-sequences` | Referenced for pin-dependent layouts that CSS cannot do natively. |
| `parallax-depth-systems` | Referenced for multi-layer parallax with depth ratios. This toolkit includes only a simple single-layer parallax. |
| `easing-curves-timing-design` | Referenced implicitly: scroll-driven animations should use `linear` easing for scrub fidelity. |

## Hero skills cross-referenced

None directly applicable. Hero toolkits in `skills/hero/` are single-section hero components, not full-page narrative structures. `hero-scroll-zoom-portal` and `hero-scroll-morph-shape` use GSAP ScrollTrigger for their scroll mechanics, not CSS-native timelines.

## External references (not in corpus)

- CSS Scroll-Driven Animations spec: https://drafts.csswg.org/scroll-animations-1/
- Bramus Van Damme's scroll-driven-animations.style tool
- Chrome 115 release notes (scroll-driven animation shipping)
- @property spec: https://drafts.css-houdini.org/css-properties-values-api/
