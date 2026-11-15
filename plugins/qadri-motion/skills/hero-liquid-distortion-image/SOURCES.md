# Sources -- hero-liquid-distortion-image

## Corpus files mined

| File | What it contributed |
|---|---|
| `_raw/Codeptor_ascii-dither-shader/references/shader-effects.md` | GLSL displacement patterns, CRT barrel distortion math (adapted for liquid warp), bloom/glow implementation patterns. Confirmed the displacement-map-centered-on-128 convention. |
| `_raw/dominikmartn_hue/references/background-shaders.md` | Minimal WebGL fullscreen quad runtime (~50 lines), DPR handling, resize pattern, graceful fallback on no-WebGL, the applyDials uniform pattern (adapted for scroll fade). Simplex noise GLSL (Ashima, MIT) used as reference for noise-based displacement alternative. |
| `_raw/dominikmartn_hue/references/hero-stage.md` | Hero stage composition model (background field + hero subject + relation layer). Informed the z-index stacking architecture (canvas as background, content as overlay). Preset patterns for safe zones and text legibility over animated backgrounds. |
| `_raw/MariusYvard_NullToHero/null-to-hero/skills/siteasy/references/parallax.md` | Core Web Vitals discipline (LCP, CLS, INP targets), vestibular accessibility requirements, `prefers-reduced-motion` implementation pattern with `0.01ms` duration trick, mobile progressive enhancement tiers. |
| `_raw/MustBeSimo_cinematic-scroll-skill/SKILL.md` | Scroll-driven interaction patterns, taste guardrail philosophy, verify-before-ship methodology, reduced-motion-safe degradation approach. |

## Primitives cross-referenced (not duplicated)

| Primitive slug | What this toolkit defers to it for |
|---|---|
| `liquid-displacement-effects` | Raw displacement map mechanics, OGL quad setup, shader recipes for hover distortion and dual-image crossfade. This toolkit builds the full hero architecture on top. |
| `glsl-fragment-backgrounds` | Fragment shader fundamentals, uniform binding patterns, WebGL context management. |
| `gsap-scrolltrigger` | ScrollTrigger configuration (start/end tokens, scrub, toggleActions). Used for scroll fade binding. |
| `ogl-lightweight-webgl` | OGL API patterns, texture loading, program/mesh setup. |
| `easing-curves-timing-design` | Lerp factor calibration, smoothing curve selection. |

## Written from expertise

- Cover-UV aspect ratio correction math (standard technique, no single corpus source).
- Velocity computation pipeline (clamp/smooth stages) and RGB shift magnitude calibration.
- Pointer lerp factor tuning values and perceptual justification.
- Idle ripple implementation and tuning.
- Full hero architecture (HTML structure, CSS stacking, JS lifecycle, destroy pattern).
