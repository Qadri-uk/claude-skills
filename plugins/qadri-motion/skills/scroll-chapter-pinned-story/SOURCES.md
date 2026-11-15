# Sources: scroll-chapter-pinned-story

## Corpus files mined

| File | Lines | What it contributed |
|---|---|---|
| `_raw/MustBeSimo_cinematic-scroll-skill/SKILL.md` | 1117 | Pinned chapter architecture, pin height bounds (150-400vh), breather spacing, mobile degradation tiers, visual system concept |
| `_raw/MustBeSimo_cinematic-scroll-skill/references/scroll-patterns.md` | 697 | "Sticky Narrative" pattern (#4): split-screen text/visual with pinned visual panel, IntersectionObserver chapter detection, mobile strategy |
| `_raw/freshtechbro_claudedesignskills/.claude/skills/gsap-scrolltrigger/references/common_patterns.md` | 1228 | Pin-with-content-animation recipe, pinning-different-element-than-trigger pattern, batch reveals |
| `_raw/MustBeSimo_cinematic-scroll-skill/references/performance-budget.md` | 603 | Mobile degradation matrix, compositor layer budgets, will-change strategy |

## Primitives cross-referenced

| Primitive slug | What it covers that this toolkit defers to |
|---|---|
| `scroll-progress-storytelling` | Act/beat architecture, pacing calculator (words-to-vh), text-led vs visual-led decision, global progress bar |
| `sticky-pinning-sequences` | Pin mechanics, `pinSpacing`, CSS sticky vs GSAP pin tradeoff, nested pin edge cases |
| `gsap-scrolltrigger` | ScrollTrigger API, `scrub`, `toggleActions`, `onEnter`/`onEnterBack` callbacks |
| `scroll-reveal-choreography` | Reveal pattern vocabulary (used for chapter text entrance) |

## Hero skills cross-referenced

| Hero slug | Relationship |
|---|---|
| `hero-scroll-zoom-portal` | Zoom-in transition variant can serve as one chapter's visual transition |
| `hero-scroll-morph-shape` | SVG morph can replace image swap as a chapter's visual type |

## Sibling scroll toolkits

| Toolkit slug | Boundary |
|---|---|
| `scroll-cinematic-longform-gsap` | Use when sections need structurally different layouts, not uniform split-screen. This toolkit is for uniform chapter structure. |
