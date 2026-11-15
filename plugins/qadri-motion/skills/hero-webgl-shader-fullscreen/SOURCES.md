# Sources: hero-webgl-shader-fullscreen

## Corpus files mined

| File | Contribution |
|---|---|
| `_raw/tcxcx_webgl-on-shrooms/SKILL.md` (73 lines) | Holographic silk shader concept, WebGL1 vs WebGPU comparison table, fps cap and visibility pause pattern, reduced-motion still frame approach, context loss recovery pattern. |
| `_raw/owenob1_web-shaders-agent-kit/skills/web-shaders/SKILL.md` (116 lines) | GLSL/WGSL decision framework, ShaderMaterial vs raw WebGL tradeoffs, three-js vs raw GL considerations. |
| `_raw/adevra_unity-shader-agent-skills/skills/webgl-shader-constraints/SKILL.md` (202 lines) | WebGL precision constraints, loop restrictions, mobile GPU limitations, mediump vs highp behavior. |
| `_raw/viknesh20-20_claude-code-tool-kit/.claude/agents/three-d-specialist.md` (122 lines) | WebGL/WebGPU context management patterns, shader debugging approaches. |

## Primitive skills cross-referenced

| Primitive | Slug | What it provided |
|---|---|---|
| GLSL fragment backgrounds | `glsl-fragment-backgrounds` | Full noise function library (hash, value noise, fbm, domain warping), palette functions, fullscreen quad setup, vignette recipe. This toolkit extends with WebGL2-specific features and context loss recovery. |
| OGL lightweight WebGL | `ogl-lightweight-webgl` | OGL as a lighter-weight alternative stack decision. Referenced as a cheaper alternative, not used directly. |
| Noise grain texture | `noise-grain-texture` | Grain overlay technique. Referenced for integration (apply grain inside shader, not as CSS filter). |

## Written from expertise

- Fullscreen triangle trick (gl_VertexID-based, zero buffers)
- Raymarcher recipe with SDF primitives and smooth union
- Context loss/restore lifecycle with full pipeline re-creation
- Visibility-based time accumulation pause (pausedTime pattern)
- WebGL1 fallback pattern for older browsers
- Precision troubleshooting table (mediump hash overflow, highp emulation)
