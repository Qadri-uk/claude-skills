---
name: scroll-shader-transition-sections-eval
description: Use when verifying that scroll-shader-transition-sections was actually implemented correctly. Adversarial audit, not a summary.
pairs_with: scroll-shader-transition-sections
---

# Eval: Shader-Based Section Transitions

## What this audits
The most common shipped failure is a shader transition that compiles and runs on the developer's machine but breaks in production: multiple WebGL contexts created (one per transition), textures never disposed (memory leak that crashes mobile after a few section transitions), and the CSS fallback missing entirely so reduced-motion users see a broken page.

## Evidence required
- Source files (HTML, CSS, JS, GLSL shaders)
- Running instance in Chrome and Safari
- DevTools Console: check for WebGL errors, shader compilation failures
- DevTools Performance panel recording during a full scroll-through
- `navigator.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)` output
- Computed opacity on the canvas element at rest (between transitions)
- Emulated `prefers-reduced-motion: reduce` in DevTools

## Automated checks

### Static source checks
```bash
# Count WebGL context creations -- must be exactly 1
grep -c 'getContext.*webgl\|new Renderer' transition-engine.js scroll-controller.js
# FAIL if > 1

# Canvas must have aria-hidden
grep 'aria-hidden' index.html | grep 'transition-canvas'
# FAIL if not found

# Shaders must use highp precision
grep -c 'precision highp float' transitions/*.glsl
# FAIL if any shader uses mediump or omits precision

# Must have CSS fallback for reduced-motion
grep -c 'prefers-reduced-motion' sections.css
# FAIL if 0
```

### Runtime checks
```js
// Check 1: Only one WebGL context exists
const canvases = document.querySelectorAll('canvas');
const webglContexts = [...canvases].filter(c =>
  c.getContext('webgl2') || c.getContext('webgl')
);
// PASS if webglContexts.length <= 1. FAIL if > 1.

// Check 2: Canvas hidden between transitions
const canvas = document.getElementById('transition-canvas');
const opacity = parseFloat(getComputedStyle(canvas).opacity);
const pointerEvents = getComputedStyle(canvas).pointerEvents;
// PASS if opacity === 0 AND pointerEvents === 'none' (at rest). FAIL otherwise.

// Check 3: Each transition uses a different shader
const sections = document.querySelectorAll('[data-transition]');
const transitions = [...sections].map(s => s.dataset.transition);
const unique = new Set(transitions);
// PASS if unique.size >= transitions.length * 0.6. FAIL if all identical.

// Check 4: Reduced-motion hides canvas
// Emulate prefers-reduced-motion: reduce in DevTools, reload
const canvasDisplay = getComputedStyle(document.getElementById('transition-canvas')).display;
// PASS if canvasDisplay === 'none'. FAIL otherwise.

// Check 5: No shader compilation errors
// Check console for 'COMPILE_STATUS' or 'LINK_STATUS' errors
// PASS if none. FAIL if any.
```

## Manual inspection protocol

1. Scroll slowly through each section boundary. Verify the transition shader activates, progresses from 0 to 1, and the canvas hides after completion. FAIL if any transition does not activate or stays visible after completion.

2. Scroll backward through each boundary. Verify the transition reverses correctly. FAIL if reversing shows a different effect than expected or the canvas flickers.

3. Scroll quickly past two boundaries. Verify no visual artifacts (half-rendered transition from a skipped boundary). FAIL if a transition from a non-adjacent boundary pair is visible.

4. Right-click on section content during a transition. Verify pointer events pass through to the HTML content (the canvas has `pointer-events: none`). FAIL if the canvas blocks interaction.

5. Open DevTools Memory panel. Scroll through all transitions 3 times. Check that GPU memory does not grow unbounded. FAIL if texture count exceeds 2x the number of sections.

6. Enable prefers-reduced-motion in DevTools. Reload. Verify all sections are visible as stacked HTML with no canvas, no spacers, and no broken layout. FAIL if any section is missing or layout breaks.

7. Test in Safari. Verify all shaders compile and transitions render. FAIL if any shader fails to compile (Safari's GLSL compiler is stricter than Chrome's).

8. Throttle CPU to 4x slowdown. Scroll through a transition. FAIL if frame time exceeds 20ms consistently during the transition.

## Scoring rubric

| # | Criterion | Weight | 0 | 1 | 2 |
|---|---|---|---|---|---|
| 1 | Single WebGL context | 15 | Multiple contexts created | One context but not reused across transitions | One context, fully reused |
| 2 | Shader compilation | 10 | Shaders fail to compile | Compile with warnings | Clean compilation, no errors |
| 3 | Transition variety | 10 | Same effect on all boundaries | 2 different effects | 3+ different effects |
| 4 | Scrub smoothness | 15 | Transitions jump or stutter | Mostly smooth with occasional hitches | Fully smooth bidirectional scrub |
| 5 | Canvas visibility management | 10 | Canvas always visible | Hidden sometimes but leaks | Precisely hidden between transitions |
| 6 | Texture lifecycle | 10 | Textures never disposed | Disposed on destroy only | Disposed on destroy, bounded during use |
| 7 | CSS fallback | 10 | Missing | Partial (no reduced-motion) | Full: WebGL failure + reduced-motion |
| 8 | Performance (< 8ms/frame) | 10 | > 16ms per frame | 8-16ms per frame | < 8ms per frame |
| 9 | Pointer event passthrough | 5 | Canvas blocks clicks | Sometimes blocks | Never blocks (pointer-events: none) |
| 10 | ARIA and semantics | 5 | Canvas not aria-hidden | aria-hidden present but content inaccessible | aria-hidden + fully accessible section content |

**Total: 100 points. Ship threshold: 75.**

## Common false passes

1. **Transitions look correct in Chrome, fail in Safari.** Safari's GLSL compiler rejects implicit float casts (e.g., `float x = 1;` must be `float x = 1.0;`). Test every shader in Safari specifically.

2. **Canvas shows the transition but never hides.** The `endTransition()` call sets `opacity: 0` on the canvas, but if it fires before the CSS transition completes, a race condition can leave it visible. Use `transitionend` listener or set `display: none` after opacity transition.

3. **Textures are loaded but aspect ratio is wrong.** The shader receives `resolution` uniform from the canvas dimensions, but the texture was captured at a different aspect ratio. The transition stretches or squishes the section image.

4. **Memory leak from undisposed textures.** Each scroll-through loads fresh textures without releasing the old ones. After 10 full scroll-throughs, GPU memory is at 400 MB. Must reuse textures across transitions, not recreate them.

5. **The fallback path initializes but the transition spacers remain in the DOM.** CSS fallback hides the canvas but the 80vh spacer divs are still present, creating large empty gaps between sections.

## Required fixes by failure mode

| Failure | Root cause | Fix |
|---|---|---|
| Multiple WebGL contexts | Each transition creates its own Renderer | Create one Renderer on init, swap programs per transition |
| Safari shader errors | Implicit float casts, missing precision | Add `precision highp float;` to all shaders, use `1.0` not `1` for floats |
| Canvas blocks pointer events | Missing `pointer-events: none` | Set `pointer-events: none` on canvas in CSS |
| Texture memory leak | Textures created per scroll, never freed | Load textures once, reuse across transitions, dispose on destroy |
| Fallback spacers visible | CSS fallback does not remove spacers | Add `.transition-spacer { display: none }` under `@media (prefers-reduced-motion: reduce)` |
| Aspect distortion | Resolution uniform does not match texture | Read texture dimensions and pass as separate uniform, or normalize UVs |

## Verdict format

```
## Shader Transition Audit

| # | Criterion | Score | Notes |
|---|---|---|---|
| 1 | Single WebGL context | _/2 | ... |
| ... | ... | ... | ... |

**Total: __/100**
**Blocking issues:** [list or "none"]
**Verdict: SHIP / NO SHIP**
```
