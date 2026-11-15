# Sources: scroll-text-highlight-reading

## Corpus files consulted

| File | Lines | What it contributed |
|---|---|---|
| `_raw/s1gmamale1_apple-design-skills/skills/apple-design-web/references/scrollytelling-techniques.md` | 976 | Clip-path text wipe recipe (word-level stagger reveal), IntersectionObserver word-reveal pattern with per-word transition-delay, scroll-progress mapping for text reveals. Directly informed the word-split pattern and stagger delay approach. |
| `_raw/freshtechbro_claudedesignskills/.factory/droids/scroll-reveal-libraries.md` | 362 | IntersectionObserver-based reveal patterns, stagger reveals with delayed class toggles. Cross-referenced for the threshold-triggered alternative to scrub-driven highlighting. |
| `_raw/MustBeSimo_cinematic-scroll-skill/SKILL.md` | 1117 | Act structure, scroll budget per chapter, title reveal style rotation. Informed the act-based reading pace variation. |
| `_raw/greensock_gsap-skills/skills/gsap-scrolltrigger/SKILL.md` | 296 | ScrollTrigger scrub API, onUpdate callback with self.progress. Core API for the scroll-to-word mapping. |
| `_raw/MariusYvard_NullToHero/null-to-hero/skills/siteasy/references/parallax.md` | 443 | Vestibular accessibility, prefers-reduced-motion handling, Core Web Vitals discipline. Informed accessibility approach. |
| `_raw/freshtechbro_claudedesignskills/plugins/bundles/animation-components/skills/animejs/references/timeline_guide.md` | 662 | Timeline sequencing patterns for staggered animations. Cross-referenced for the per-word timing model. |

## Primitive skills cross-referenced

| Slug | What it contributes |
|---|---|
| `gsap-splittext-kinetic-type` | SplitText API for word/char/line splitting. This toolkit uses word-level splitting only. |
| `scroll-progress-storytelling` | Act/beat pacing model, vh-per-beat calculator. Adapted for words-per-vh reading pace. |
| `gsap-scrolltrigger` | ScrollTrigger scrub API, onUpdate progress mapping. |
| `scroll-reveal-choreography` | Simpler entrance reveals. This toolkit extends beyond entrance to continuous scroll-driven highlighting. |
| `sticky-pinning-sequences` | CSS sticky for the reading container. |
| `lenis-smooth-scroll` | Optional smooth scroll. Compounds with scrub smoothing (see anti-slop rule 10). |

## Hero skills cross-referenced

| Slug | Connection |
|---|---|
| `hero-kinetic-typography` | Text-as-hero animation. Progressive highlighting could serve as the hero's kinetic treatment. |
| `hero-minimal-swiss-type` | Typography-forward hero. The reading experience is a natural continuation below a type-driven hero. |

## External references
- Scrollama: https://github.com/russellsamora/scrollama (step detection library, alternative to ScrollTrigger for text stories)
- The Pudding scrollytelling methodology: https://pudding.cool/process/how-to-implement-scrollytelling/
