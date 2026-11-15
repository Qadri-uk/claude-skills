# Sources: scroll-video-chapters

## Corpus files consulted

| File | Lines | What it contributed |
|---|---|---|
| `_raw/MariusYvard_NullToHero/null-to-hero/skills/siteasy/references/video.md` | 81 | Decorative video classification (play vs scrub), canvas-decodable asset concept, WASM decoder fallback mention |
| `_raw/fabiofranco85_design-agent-kb/knowledge-base/08-webgl-effects.md` | 412 | Canvas-vs-DOM decision framework, single-context-per-page rule, GPU memory disposal patterns (context for when canvas fallback is used) |
| `_raw/luthfierlmbang_Fluke-Motion/skills/fluke-motion/references/creative-effects.md` | 166 | Shader/WebGL image effects section confirmed OGL for 2D texture work, reinforced the escalation ladder |
| `_raw/affaan-m_ECC/skills/videodb/reference/editor.md` | 443 | Timeline editing concepts, chapter structure modeling, timecode mapping patterns |

## Primitive skills cross-referenced

| Primitive | What was reused vs extended |
|---|---|
| `image-sequence-scrubbing` | Core preloader and draw engine reused directly for the canvas fallback path. Frame-count math, DPR capping, `createImageBitmap` patterns all from this primitive. This toolkit adds chapter segmentation on top. |
| `gsap-scrolltrigger` | Pin + scrub mechanics, `onUpdate` progress callback pattern, `anticipatePin` for fast-scroll smoothing. Used directly, not reimplemented. |
| `scroll-progress-storytelling` | Act/beat pacing model adapted to chapter-based video structure. The vh-per-beat calculator concept extended to vh-per-second-of-video. |
| `sticky-pinning-sequences` | Pin spacer mechanics, `pinSpacing` behavior. Referenced for architecture, not duplicated. |
| `lenis-smooth-scroll` | Recommended integration for smoother wheel-to-seek mapping. Setup and `scrollerProxy` pattern referenced. |

## Hero skills cross-referenced

| Hero skill | Relationship |
|---|---|
| `hero-video-scrub-apple` | Shares the canvas image-sequence scrub engine. That hero builds a single pinned section; this toolkit extends the pattern to multi-chapter navigation with text overlays, nav bar, and click-to-chapter. |

## Expertise-based content (no corpus source)
- rAF-gated seek engine with `seeking` flag and 0.03s threshold: written from direct experience with video decoder behavior
- Browser seek-behavior comparison table: from testing across Chrome, Safari, Firefox
- ffmpeg encoding parameters for scroll-scrub video: standard H.264 encoding practice with keyframe interval optimization
- `requestVideoFrameCallback` sync pattern: from Chrome platform API documentation
- Reduced-motion fallback with chapter skip buttons: accessibility pattern design
