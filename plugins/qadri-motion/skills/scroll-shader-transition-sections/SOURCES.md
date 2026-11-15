# Sources: scroll-shader-transition-sections

## Corpus files consulted

| File | Lines | What it contributed |
|---|---|---|
| `_raw/fabiofranco85_design-agent-kb/knowledge-base/08-webgl-effects.md` | 412 | Canvas-vs-DOM decision framework, single-context rule, GPU memory disposal patterns, OGL vs Three.js escalation ladder, draw call budgets |
| `_raw/owenob1_web-shaders-agent-kit/skills/web-shaders/SKILL.md` | 116 | GLSL/WGSL debugging patterns, ShaderMaterial usage in Three.js context, precision qualifier guidance |
| `_raw/tcxcx_webgl-on-shrooms/SKILL.md` | 73 | Single-file fragment shader architecture, battle-tested WebGL1 patterns, shader loop structure |
| `_raw/luthfierlmbang_Fluke-Motion/skills/fluke-motion/references/creative-effects.md` | 166 | Shader/WebGL image effects section: OGL for 2D texture distortion, hover displacement as a simpler case of the same texture-pair pattern |
| `_raw/viknesh20-20_claude-code-tool-kit/.claude/agents/three-d-specialist.md` | 122 | Three.js scroll-driven scenes, performance tuning, asset pipeline concepts |

## Primitive skills cross-referenced

| Primitive | What was reused vs extended |
|---|---|
| `glsl-fragment-backgrounds` | Shader setup patterns, uniform conventions, precision requirements. This toolkit extends single-shader backgrounds to dual-texture transition shaders. |
| `gsap-scrolltrigger` | Pin + scrub per transition zone. Used directly. |
| `ogl-lightweight-webgl` | OGL Renderer, Program, Mesh, Texture, Triangle APIs. Used directly for the transition engine. |
| `shader-postprocessing` | Multi-pass rendering concepts. Referenced for the "avoid multi-pass in transitions" performance rule. |

## Hero skills cross-referenced

| Hero skill | Relationship |
|---|---|
| `hero-webgl-shader-fullscreen` | Same OGL fullscreen-quad pattern. That hero uses one shader for a persistent background; this toolkit swaps shaders per transition boundary. |

## Expertise-based content (no corpus source)
- gl-transitions format compatibility and porting guide
- Transition shader library (dissolve, directional-wipe, noise-displacement, radial-reveal, chromatic-ripple): written as original GLSL
- Texture windowing strategy for 6+ section pages
- Safari GLSL compiler strictness differences
