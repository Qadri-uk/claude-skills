# Sources: hero-masked-video-type

## Corpus files mined

| File | Lines | What was harvested |
|---|---|---|
| `_raw/s1gmamale1_apple-design-skills/skills/apple-design-web/references/scrollytelling-techniques.md` | 976 | Canvas image-sequence scroll scrubber pattern, video.currentTime scrubbing trade-offs, poster fallback strategy, passive scroll listener pattern. Adapted the video vs. canvas-frame-copy decision from Apple's own evolution. |
| `_raw/freshtechbro_claudedesignskills/.factory/skills/gsap-scrolltrigger/SKILL.md` | 765 | ScrollTrigger scrub pattern for the scroll-driven video variant. Start/end syntax, toggle actions. |
| `_raw/Leonxlnx_taste-skill/skills/taste-skill/SKILL.md` | 1206 | Anti-default discipline, design variance dials. Informed the anti-slop rules about not defaulting to light backgrounds with multiply blend. |
| `_raw/MustBeSimo_cinematic-scroll-skill/.cursor/skills/cinematic-scroll/SKILL.md` | 34 | Pinned chapter reveal pattern, scroll-driven binding model. Cross-referenced for scroll-scrubbed video variant. |
| `_raw/affaan-m_ECC/skills/remotion-video-creation/rules/measuring-text.md` | 143 | Text measurement and fitting patterns for canvas text rendering. Informed the computeFontSize() approach. |

## Primitives cross-referenced

| Primitive | What was reused vs. what was extended |
|---|---|
| `image-sequence-scrubbing` | Canvas drawImage + scroll-to-frame mapping. This toolkit uses a video element directly instead of pre-rendered frames, but references the canvas compositing alternative. |
| `gsap-scrolltrigger` | Scrub parameter for scroll-driven video variant. Referenced, not duplicated. |
| `gsap-core-timelines` | Timeline sequencing for text entrance variant. Referenced for entrance animation before video reveal. |
| `variable-font-animation` | Shared font loading concern (preload for SVG text). Integration note added. |

## External knowledge applied

- SVG clipPath + foreignObject browser support matrix (MDN, caniuse)
- Canvas globalCompositeOperation documentation (MDN)
- H.264/VP9 encoding best practices for web video (ffmpeg documentation)
- Autoplay policy documentation from Chrome, Safari, Firefox developer docs
- `mix-blend-mode: multiply` color math (W3C compositing spec)
