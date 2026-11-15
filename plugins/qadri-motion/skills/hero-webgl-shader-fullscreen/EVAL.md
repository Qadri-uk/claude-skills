---
name: hero-webgl-shader-fullscreen-eval
description: Use when verifying that hero-webgl-shader-fullscreen was actually implemented correctly. Adversarial audit, not a summary.
pairs_with: hero-webgl-shader-fullscreen
---

# Eval: Full-Viewport WebGL Shader Hero

## What this audits
The most common shipped failure is a shader hero that renders correctly on the developer's machine but goes permanently black on mobile after a context loss event, because the `webglcontextlost`/`webglcontextrestored` handlers were skipped. The second most common failure is rendering at full device DPR (3x on modern phones), which silently drops frames below 30fps on mid-range mobile GPUs.

## Evidence required
- The built HTML file, opened at 1440x900 and 375x812
- Chrome DevTools Performance recording of 3 seconds (must show GPU time per frame)
- Console output on load (no shader compilation errors)
- Source code of vertex and fragment shaders
- `document.querySelector('canvas').width` and `.height` vs `clientWidth` and `clientHeight` (verifies DPR handling)
- Result of simulating context loss: `gl.getExtension('WEBGL_lose_context').loseContext()` then `restoreContext()` after 2 seconds

## Automated checks

```bash
# PASS: WebGL2 context requested
grep -qE "getContext\(['\"]webgl2['\"]" index.html && echo "PASS: WebGL2 context" || echo "FAIL: not using WebGL2"

# PASS: Context loss handler
grep -qE "webglcontextlost" index.html && echo "PASS: contextlost handler" || echo "FAIL: no context loss handling"

# PASS: Context restore handler
grep -qE "webglcontextrestored" index.html && echo "PASS: contextrestored handler" || echo "FAIL: no context restore handling"

# PASS: preventDefault in contextlost
grep -qE "preventDefault" index.html && echo "PASS: preventDefault found" || echo "FAIL: missing preventDefault in contextlost"

# PASS: DPR cap
grep -qE "Math\.min.*devicePixelRatio.*[12]" index.html && echo "PASS: DPR capped" || echo "FAIL: no DPR cap found"

# PASS: visibilitychange handler
grep -qE "visibilitychange" index.html && echo "PASS: visibility pause" || echo "FAIL: no visibility-based pause"

# PASS: Reduced motion handled
grep -qE "prefers-reduced-motion" index.html && echo "PASS: reduced motion" || echo "FAIL: no reduced motion handling"

# FAIL: alpha:true (should be false for opaque backgrounds)
grep -qE "alpha:\s*true" index.html && echo "WARN: alpha:true wastes blend cost for opaque background" || echo "PASS: alpha not true"
```

### Runtime checks
```js
// Check canvas backing-store matches DPR-scaled size
const c = document.querySelector('canvas');
const dpr = Math.min(devicePixelRatio, 2);
const expectedW = Math.round(c.clientWidth * dpr);
const expectedH = Math.round(c.clientHeight * dpr);
console.assert(Math.abs(c.width - expectedW) < 2, `FAIL: canvas.width=${c.width}, expected ~${expectedW}`);
console.assert(Math.abs(c.height - expectedH) < 2, `FAIL: canvas.height=${c.height}, expected ~${expectedH}`);

// Check no GL errors
const gl = c.getContext('webgl2');
const err = gl.getError();
console.assert(err === gl.NO_ERROR, `FAIL: GL error ${err}`);

// Simulate context loss and check recovery
const ext = gl.getExtension('WEBGL_lose_context');
if (ext) {
  ext.loseContext();
  setTimeout(() => {
    ext.restoreContext();
    setTimeout(() => {
      const err2 = c.getContext('webgl2')?.getError();
      console.log(err2 === 0 ? 'PASS: context restored' : 'FAIL: context not recovered');
    }, 1000);
  }, 2000);
}

// Measure frame time
let frames = 0;
const s = performance.now();
function ct() { frames++; if (performance.now() - s < 2000) requestAnimationFrame(ct); else console.log(`${frames} frames in 2s = ${(frames/2).toFixed(0)}fps (target: >=55)`); }
ct();
```

## Manual inspection protocol

1. Load page at 1440x900. FAIL if the canvas is black or shows a solid color with no visible noise/gradient motion.
2. Move pointer across the hero. FAIL if the shader does not respond (no visible displacement or change).
3. Scroll down slowly. FAIL if the shader pattern does not shift with scroll.
4. Open DevTools Performance, record 3 seconds. FAIL if more than 3 frames exceed 16ms.
5. Open DevTools Console. Run `gl.getExtension('WEBGL_lose_context').loseContext()`. Wait 3 seconds. Run `gl.getExtension('WEBGL_lose_context').restoreContext()`. FAIL if the shader does not resume within 2 seconds.
6. Switch to another tab for 5 seconds, switch back. FAIL if the shader jumps in time (the time uniform should have paused during the tab switch, not accumulated hidden time).
7. Load at 375x812. Check `canvas.width` in console. FAIL if it exceeds `clientWidth * 2`.
8. Enable "Reduce Motion" in OS settings. Reload. FAIL if the shader is still animating.
9. View source. FAIL if the fragment shader contains a loop with no fixed upper bound (infinite loop risk on some GPUs).
10. Check for `#version 300 es` in the fragment shader. FAIL if missing (WebGL2 requires explicit version).

## Scoring rubric

| # | Criterion | Weight | 0 (Fail) | 1 (Partial) | 2 (Pass) |
|---|---|---|---|---|---|
| 1 | Shader compiles and renders | 3 | Black canvas or GL errors | Renders but with visual artifacts | Clean render, no errors |
| 2 | Context loss recovery | 3 | No handler; hero dies on context loss | Handler exists but doesn't fully restore | Full restore: re-compiles, re-locates, resumes |
| 3 | DPR cap at 2 | 2 | No cap; renders at full 3x | Cap exists but applied incorrectly | Canvas backing store = clientSize * min(dpr, 2) |
| 4 | Scroll uniform reactivity | 2 | No scroll input | Scroll input but not normalized 0-1 | Normalized scroll progress drives shader |
| 5 | Pointer uniform reactivity | 1 | No pointer input | Pointer read but not normalized or Y-flipped | Normalized -1 to 1, Y flipped for GL |
| 6 | Visibility-based pause | 2 | rAF runs in hidden tabs | Pause exists but time jumps on resume | Clean pause with time accumulation freeze |
| 7 | Reduced motion | 2 | Not handled | Canvas hidden but no fallback background | Canvas hidden + fallback bg, or single still frame |
| 8 | Fullscreen triangle technique | 1 | Uses a quad with vertex buffer | Triangle but needs a VAO/buffer | Pure gl_VertexID, zero buffers |
| 9 | Frame rate at target | 2 | Below 30fps at 1440x900 | 30-55fps | 55fps+ |
| 10 | No shader in render loop | 2 | Shader re-compiles per frame | Uniforms re-located per frame | Compile once, locate once, only set values per frame |
| 11 | Teardown function | 1 | No cleanup | Partial cleanup | Full: deleteProgram, cancel rAF, loseContext |

**Total: 42 points. Ship threshold: 34+ with no criterion at 0.**

## Common false passes

1. **Canvas renders on desktop, black on mobile.** WebGL2 is not available on very old devices. Missing `if (!gl)` fallback means a crash with no visual. Also, some mobile browsers silently give a WebGL1 context when WebGL2 is requested, and `#version 300 es` shaders fail to compile on WebGL1.
2. **Context loss "handled" by reloading the page.** Calling `location.reload()` in `webglcontextrestored` technically recovers, but it resets all page state. The correct fix is re-creating the GL pipeline in place.
3. **DPR cap in CSS but not on the canvas backing store.** Setting `canvas { width: 100%; height: 100% }` in CSS without setting `canvas.width = clientWidth * dpr` in JS means the backing store defaults to 300x150, and the shader renders at potato resolution upscaled.
4. **Time uniform that ticks during hidden tabs.** If the rAF loop pauses but `uTime` is computed as `(performance.now() - startTime) / 1000` without subtracting paused time, the shader jumps when the tab becomes visible again.
5. **"Works on my machine" precision.** Using `highp float` in the fragment shader works on desktop GPUs. Some mobile GPUs emulate highp in software, dropping fps to single digits. The shader looks fine in testing but ships broken on real phones.
6. **Shader that compiles but produces visual artifacts from integer overflow.** Hash functions using large magic numbers (`43758.5453`) can overflow on `mediump` precision GPUs, producing solid-color or banded output instead of smooth noise.

## Required fixes by failure mode

| Failure | Root cause | Fix |
|---|---|---|
| Black canvas on load | Shader compile error | Check `gl.getShaderParameter(shader, gl.COMPILE_STATUS)` and log `gl.getShaderInfoLog()` |
| Black canvas after tab switch on mobile | Context lost, no recovery | Add `webglcontextlost` (preventDefault) + `webglcontextrestored` (re-init pipeline) |
| Low fps on mobile | Rendering at full 3x DPR | Cap DPR at 2: `Math.min(devicePixelRatio, 2)` |
| Shader jumps on tab return | Time not paused during hidden | Track `pausedTime` accumulator, subtract from time uniform |
| UV coordinates wrong at edges | Using CSS size instead of backing-store size for resolution | Pass `canvas.width, canvas.height` (backing store) as `uResolution` |
| Banding/artifacts on mobile | mediump precision overflow in hash | Use safer hash: `fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453)` or switch constants |

## Verdict format
```
## Shader Hero Audit

| # | Criterion | Score |
|---|---|---|
| 1 | Shader compiles and renders | X/2 |
| ... | ... | ... |

**Total: XX / 42**
**Blocking issues:** [list or "none"]
**SHIP / NO SHIP**
```
