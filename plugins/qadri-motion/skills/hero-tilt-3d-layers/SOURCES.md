# Sources: hero-tilt-3d-layers

## Corpus files mined

| File | Lines | What was harvested |
|------|-------|--------------------|
| `_raw/freshtechbro_claudedesignskills/.claude/skills/lightweight-3d-effects/references/tilt_patterns.md` | 1209 | Vanilla-Tilt.js complete API reference (all options, methods, events), configuration value ranges, gyroscope min/max angle defaults, easing values, CDN/NPM install paths |
| `_raw/freshtechbro_claudedesignskills/.claude/skills/lightweight-3d-effects/SKILL.md` | 1091 | Zdog/Vanta/Vanilla-Tilt integration patterns, hero section animation recipes, performance-focused design patterns |
| `_raw/MariusYvard_NullToHero/null-to-hero/skills/siteasy/references/parallax.md` | 443 | Parallax depth ratio conventions, multi-layer velocity ratios (0.3x/0.6x/1x), CSS perspective + translateZ true 3D parallax setup, mobile strategy tiers, vestibular accessibility requirements, Core Web Vitals discipline for LCP/CLS/INP |
| `_raw/MustBeSimo_cinematic-scroll-skill/SKILL.md` | 1117 | 3D tilt + hover depth patterns, perspective-origin manipulation, pointer-driven parallax interaction model |
| `_raw/alirezarezvani_claude-skills/docs/skills/marketing/landing.md` | 351 | Mouse-parallax depth implementation in a single HTML landing page, GSAP integration pattern, brand system specification with CTA styling |

## Primitives cross-referenced

| Primitive slug | What was reused vs newly written |
|----------------|--------------------------------|
| `parallax-depth-systems` | Cross-referenced for depth ratio model and true 3D perspective math. This hero toolkit builds on the same `perspective + translateZ` model but adds pointer-driven rotation and per-layer maxRotate, which the parallax primitive does not cover. |
| `gsap-core-timelines` | Referenced for entrance animation. No GSAP code duplicated; the SKILL.md points to the primitive for timeline API. |
| `stagger-orchestration` | Referenced for entrance stagger. Not duplicated. |
| `gsap-scrolltrigger` | Referenced for the scroll-to-flatten variant. Not duplicated. |
| `hover-microinteraction-catalog` | Explicitly scoped out -- this toolkit is for a full layered hero, not a single card tilt. |

## External knowledge applied
- CSS perspective projection formula: `apparentScale = perspective / (perspective - translateZ)` -- standard CSS Transforms Level 2 spec.
- DeviceOrientationEvent.requestPermission() iOS 13+ requirement -- MDN Web Docs.
- BT.709 luminance is NOT relevant here (no image processing), unlike sibling ASCII/dither toolkits.
