# Sources: hero-video-scrub-apple

## Corpus files mined

| File | Contribution |
|---|---|
| `_raw/s1gmamale1_apple-design-skills/skills/apple-design-web/references/scrollytelling-techniques.md` (976 lines) | Apple's canvas image-sequence pattern (148+ frames per sequence, CDN structure, preloading strategy), sticky pinned section architecture, video.currentTime evolution, parallax layering, IntersectionObserver reveals. Core reference for the Apple-specific implementation. |
| `_raw/MustBeSimo_cinematic-scroll-skill/.cursor/skills/cinematic-scroll/SKILL.md` (pointer file) | Scroll-driven design philosophy, pinned chapter architecture, motion grammar. Confirmed scroll budget math and sticky section patterns. |

## Primitive skills cross-referenced

| Primitive | Slug | What it provided |
|---|---|---|
| Image sequence scrubbing | `image-sequence-scrubbing` | Core scrubbing engine: SequenceLoader class, priority preload pattern, createImageBitmap decode, rAF-throttled draw loop, frame count math, video currentTime fallback, responsive frame sourcing, sliding window memory management. This toolkit extends the primitive with the complete hero section wrapper: sticky pinning, text overlay keyframe system, loading skeleton, and full page integration. |
| GSAP ScrollTrigger | `gsap-scrolltrigger` | ScrollTrigger.create() with pin:true, onUpdate progress, end calculation. |
| Sticky pinning sequences | `sticky-pinning-sequences` | Pin chaining, scroll budget calculation, unpin transition handling. |

## Written from expertise

- Text overlay keyframe system (data-in/data-out progress thresholds with CSS transitions)
- Loading skeleton/spinner pattern that fades after first frame draw
- Nearest-frame fallback drawing (search +/- from target index)
- Contain-fit draw math for preserving frame aspect ratio on any canvas size
- Blender/After Effects export recipes for frame sequences
- ffmpeg encoding settings for video scrub fallback with frequent keyframes
