# Sources: scroll-parallax-layers-depth

## Corpus files consulted

| File | What it contributed |
|---|---|
| `_raw/MariusYvard_NullToHero/null-to-hero/skills/siteasy/references/parallax.md` (443 lines) | The primary source. Decision gate (when to use parallax), effect typology (6 canonical patterns), three implementation paths (CSS perspective, CSS scroll-driven, JS orchestrated), Core Web Vitals discipline, vestibular accessibility data (35.4% prevalence), mobile strategy tiers, scrollytelling architecture. |
| `_raw/freshtechbro_claudedesignskills/.claude/skills/gsap-scrolltrigger/references/common_patterns.md` (1228 lines) | Section 4 on parallax effects: simple parallax with different speeds, multi-layer setup, and the foreground/background Y-offset pattern. |
| `_raw/s1gmamale1_apple-design-skills/skills/apple-design-web/references/scrollytelling-techniques.md` (976 lines) | Section 3 on parallax layering: Apple's transform-only approach, speed multipliers, the principle of augmenting depth with scale. Section on confirmed absences (no background-attachment: fixed). |
| `_raw/199-biotechnologies_motion-dev-animations-skill/examples/parallax-layers.md` (362 lines) | React/Motion implementation of multi-layer parallax with useScroll/useTransform. Vanilla JS fallback pattern. The horizontal parallax cards variant. |
| `_raw/freshtechbro_claudedesignskills/.claude/skills/locomotive-scroll/SKILL.md` (480 lines) | Locomotive Scroll's data-scroll-speed attribute approach (informational, not adopted due to scroll-hijacking concerns). |
| `_raw/MustBeSimo_cinematic-scroll-skill/SKILL.md` (1117 lines) | The taste guardrails concept, the principle that parallax is atmospheric (not structural), and beat-based narrative pacing. |

## Primitives cross-referenced

| Primitive slug | What was referenced (not duplicated) |
|---|---|
| `parallax-depth-systems` | Depth ratio calculator, gsap.quickTo pattern for mouse-move, device-orientation fallback, mobile tilt, coarse-pointer detection. Speed tuning ranges. |
| `gsap-scrolltrigger` | ScrollTrigger setup, scrub mechanics, start/end syntax. |
| `lenis-smooth-scroll` | Lenis + GSAP integration pattern (lenis.on scroll update, gsap.ticker.add). |
| `sticky-pinning-sequences` | Pin mechanics for the sticky stage. |
| `css-scroll-driven-animations` | CSS `animation-timeline: scroll()` and `view()` for the no-JS parallax variant. |

## Hero skills cross-referenced

| Hero slug | Relationship |
|---|---|
| `hero-card-stack-parallax` | Uses parallax depth for card separation in a hero section. Different deliverable (card stack vs. layer depth). |
| `hero-scroll-zoom-portal` | Uses parallax on surrounding elements during the zoom transition. Complementary. |
