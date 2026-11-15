---
name: color-oklch-palettes
description: "Use when generating color palettes in OKLCH/LCH, computing accessible contrast pairs, building perceptually uniform ramps, or doing dark mode palette inversion."
---

# Color: OKLCH Perceptual Palettes

## When to use this
- You need a color ramp where each step looks evenly spaced in lightness to the human eye.
- You are computing contrast ratios and need them to be reliable, not a guess from hex values.
- You are building a dark mode palette and the naive "invert the ramp" approach looks wrong.
- You need to understand chroma limits per hue so saturated colors do not clip to gamut boundaries.
- Do NOT use this when you need the DTCG token file format or Style Dictionary pipeline; use `design-tokens-dtcg` instead.

## Mental model
OKLCH is a cylindrical color space with three axes: L (perceptual lightness, 0-1), C (chroma / saturation, 0 to ~0.4), H (hue angle, 0-360). "Perceptual" means equal numeric steps in L produce equal visual steps in lightness. sRGB, HSL, and even LCH (the older CIELab-based one) do not have this property -- in HSL, stepping from `hsl(60,100%,50%)` to `hsl(240,100%,50%)` changes perceived lightness dramatically even though L stays at 50%.

OKLCH solves three problems at once. First, ramp generation: you hold C and H constant and step L linearly. The resulting ramp looks uniform. Second, accessible contrast: APCA (the next-gen contrast algorithm) and WCAG 3.0 both operate on perceptual lightness, so computing contrast in OKLCH is closer to ground truth. Third, hue consistency: rotating H at constant L and C does not cause the wild lightness jumps you get in HSL.

Chroma has a hard limit that varies by hue and lightness. At any given L and H, there is a maximum C before the color falls outside the sRGB gamut. Blues can sustain higher chroma at low lightness; yellows peak in chroma at high lightness. Ignoring this produces colors that get silently clamped by the browser, breaking your carefully computed ramp.

Dark mode inversion is not symmetric. In light mode, your surface is high-L and your text is low-L. Flipping them does not work because chroma response is asymmetric across the lightness axis: a blue at L=0.45 C=0.2 has no equivalent at L=0.85 C=0.2 (it clips). You must reduce chroma as you push accent colors into higher lightness for dark backgrounds.

## Setup
No install needed for CSS-native usage (supported in Chrome 111+, Safari 15.4+, Firefox 113+):
```css
.element { color: oklch(0.7 0.15 250); }
```
For programmatic palette generation in JS:
```bash
npm install culori
```
```js
import { oklch, formatHex, displayable, clampChroma } from 'culori';
```

## Core API
| Function (culori) | Purpose |
|---|---|
| `oklch(hexOrColor)` | Parse any color into OKLCH components. |
| `formatHex(oklchObj)` | Convert OKLCH back to hex for legacy systems. |
| `displayable(color)` | Returns `true` if the color is inside sRGB gamut. |
| `clampChroma(color, 'oklch')` | Reduce chroma until the color is displayable. Preserves L and H. |
| `wcagContrast(fg, bg)` | WCAG 2.1 contrast ratio between two colors. |
| `formatCss(color)` | Emit `oklch(L C H)` CSS string. |
| `interpolate([c1, c2], 'oklch')` | Interpolate between two colors in OKLCH space. |
| `samples(n)` | Generate n evenly spaced numbers 0-1 for interpolation. |

## Recipes

### 1. 11-stop ramp at constant hue
Generates a perceptually uniform ramp from near-white to near-black for a single hue.
```js
import { oklch, formatHex, clampChroma } from 'culori';

function generateRamp(hue, chroma, stops = 11) {
  const lightnesses = [0.97, 0.93, 0.87, 0.78, 0.68, 0.58, 0.48, 0.40, 0.33, 0.27, 0.20];
  return lightnesses.slice(0, stops).map((l, i) => {
    const raw = { mode: 'oklch', l, c: chroma, h: hue };
    const safe = clampChroma(raw, 'oklch');
    return { step: i * 100 + 50, hex: formatHex(safe), oklch: safe };
  });
}

const blueRamp = generateRamp(250, 0.15);
console.log(blueRamp);
```

### 2. Chroma-safe ramp (adapts chroma per lightness)
Maximizes saturation at each lightness without clipping.
```js
import { oklch, formatHex, displayable } from 'culori';

function maxChromaAtLightness(l, h, precision = 0.001) {
  let lo = 0, hi = 0.4;
  while (hi - lo > precision) {
    const mid = (lo + hi) / 2;
    if (displayable({ mode: 'oklch', l, c: mid, h })) lo = mid;
    else hi = mid;
  }
  return lo;
}

function chromaSafeRamp(hue, chromaRatio = 0.7, stops = 11) {
  const lightnesses = [0.97, 0.93, 0.87, 0.78, 0.68, 0.58, 0.48, 0.40, 0.33, 0.27, 0.20];
  return lightnesses.slice(0, stops).map((l, i) => {
    const maxC = maxChromaAtLightness(l, hue);
    const c = maxC * chromaRatio;
    return {
      step: i * 100 + 50,
      hex: formatHex({ mode: 'oklch', l, c, h: hue })
    };
  });
}

const greenRamp = chromaSafeRamp(145);
console.log(greenRamp);
```

### 3. Accessible contrast pair finder
Given a background color, find the lightest/darkest text color at a target contrast.
```js
import { oklch, wcagContrast, formatHex, clampChroma } from 'culori';

function findContrastPair(bgHex, targetRatio = 4.5, hue = 0) {
  const bg = oklch(bgHex);
  for (let l = 0; l <= 1; l += 0.005) {
    const candidate = clampChroma({ mode: 'oklch', l, c: 0, h: hue }, 'oklch');
    const ratio = wcagContrast(formatHex(candidate), bgHex);
    if (ratio >= targetRatio) {
      return { textHex: formatHex(candidate), ratio: ratio.toFixed(2), lightness: l };
    }
  }
  return null;
}

console.log(findContrastPair('#1e293b'));
console.log(findContrastPair('#f8fafc'));
```

### 4. Dark mode ramp from a light mode ramp
Inverts lightness AND reduces chroma to avoid gamut clipping.
```js
import { oklch, formatHex, clampChroma } from 'culori';

function darkModeRamp(lightRamp) {
  return lightRamp.map(stop => {
    const color = oklch(stop.hex);
    const invertedL = 1 - color.l;
    const adjustedL = 0.08 + invertedL * 0.82;
    const reducedC = color.c * 0.75;
    const dark = clampChroma(
      { mode: 'oklch', l: adjustedL, c: reducedC, h: color.h },
      'oklch'
    );
    return { step: stop.step, hex: formatHex(dark) };
  });
}

const lightBlue = [
  { step: 50,  hex: '#eff6ff' },
  { step: 100, hex: '#dbeafe' },
  { step: 500, hex: '#3b82f6' },
  { step: 900, hex: '#1e3a8a' },
];
console.log(darkModeRamp(lightBlue));
```

### 5. CSS custom properties ramp
Outputs the ramp as ready-to-paste CSS.
```js
import { oklch, clampChroma } from 'culori';

function rampToCSS(name, hue, chroma) {
  const lightnesses = [0.97, 0.93, 0.87, 0.78, 0.68, 0.58, 0.48, 0.40, 0.33, 0.27, 0.20];
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const lines = lightnesses.map((l, i) => {
    const safe = clampChroma({ mode: 'oklch', l, c: chroma, h: hue }, 'oklch');
    return `  --color-${name}-${steps[i]}: oklch(${safe.l.toFixed(3)} ${safe.c.toFixed(3)} ${safe.h.toFixed(1)});`;
  });
  return `:root {\n${lines.join('\n')}\n}`;
}

console.log(rampToCSS('blue', 250, 0.14));
console.log(rampToCSS('green', 145, 0.16));
console.log(rampToCSS('red', 25, 0.18));
```

### 6. Perceptual midpoint between two colors
Find the visual midpoint for gradient stops or blend values.
```js
import { interpolate, formatHex, samples } from 'culori';

function perceptualMidpoint(hex1, hex2, count = 5) {
  const interp = interpolate([hex1, hex2], 'oklch');
  return samples(count).map(t => ({
    t: t.toFixed(2),
    hex: formatHex(interp(t))
  }));
}

console.log(perceptualMidpoint('#3b82f6', '#f59e0b', 7));
```

## Tuning the feel
Lightness steps: 0.97 to 0.20 for an 11-stop ramp gives enough room for surfaces (0.97-0.87), UI elements (0.68-0.48), and text (0.33-0.20). Below L=0.15 colors are nearly indistinguishable from black. Above L=0.98 they are nearly indistinguishable from white.

Chroma: 0.10-0.16 for UI palettes (enough color identity, low enough to stay in sRGB). 0.20+ for accent/brand hits only, and only at L values where that chroma is in gamut. Check every accent color with `displayable()`.

Why Tailwind's default palettes look AI-generated: they were built in HSL, so equal numeric steps produce unequal perceptual steps. Blue-500 and yellow-500 have wildly different perceived lightness. Amber-300 is visually darker than sky-300. OKLCH ramps do not have this problem.

## Performance
OKLCH parsing and interpolation in culori runs in microseconds per operation. Generating a 500-color palette at build time is negligible. At runtime, CSS `oklch()` is computed by the browser's color pipeline with no measurable overhead vs hex. The only cost is gamut mapping: if you use P3-range colors and the display is sRGB, the browser clamps them per CSS Color Level 4 rules, which can shift your intended value by 1-3 delta-E.

## Accessibility
Contrast computation should use the actual rendered hex, not the OKLCH source values, because gamut clamping can shift lightness. Always run `clampChroma` before computing contrast. WCAG 2.1 requires 4.5:1 for normal text (under 24px regular / 18.66px bold) and 3:1 for large text. APCA (draft WCAG 3.0) uses a different scale: Lc 60 for body text, Lc 45 for large text. Both are more accurately computed from perceptual lightness than from relative luminance of hex values.

## Anti-slop rules
- Never build a ramp in HSL and convert to OKLCH after. Build in OKLCH from the start; conversion preserves the wrong perceptual spacing.
- Never use the same chroma value across the entire lightness range. Chroma capacity varies by lightness; high chroma at extreme lightnesses clips silently.
- Never assume dark mode is the ramp reversed. Reverse lightness, compress the range (avoid pure black surfaces), and reduce chroma by 20-30%.
- Never hardcode contrast ratios from a design tool. Compute them at build time from the actual token values.
- Never pick "the 500 step" as the brand color and derive the rest. Pick the brand color first, then derive a ramp that passes through it at the correct lightness.
- Never use `oklch()` in CSS without a fallback for pre-2022 browsers unless your analytics confirm support.
- Never interpolate colors through sRGB for gradients. Interpolate in OKLCH to avoid the muddy gray midpoints that sRGB produces on complementary hues.

## Checklist
- [ ] Every ramp step passes `displayable()` for sRGB output.
- [ ] Chroma is reduced at lightness extremes (below 0.25, above 0.90).
- [ ] Body text/surface pairs meet WCAG AA (4.5:1).
- [ ] Dark mode ramp reduces chroma by at least 20% vs light mode.
- [ ] Hex fallbacks provided for any `oklch()` CSS values if supporting older browsers.
- [ ] Brand accent color is placed at its natural lightness, not forced to a step number.
- [ ] Ramp tested on both sRGB and P3 displays (colors shift if chroma exceeds sRGB gamut).
- [ ] No HSL or hex values in the generation pipeline; everything computed in OKLCH.
