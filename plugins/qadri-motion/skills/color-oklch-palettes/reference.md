# OKLCH Palettes -- Reference

## Chroma limits by hue family (approximate, at L=0.6 in sRGB)

| Hue range | Hue angle | Max sRGB chroma |
|---|---|---|
| Red | 15-30 | ~0.22 |
| Orange | 55-75 | ~0.18 |
| Yellow | 90-105 | ~0.17 |
| Green | 140-160 | ~0.19 |
| Teal | 175-195 | ~0.13 |
| Cyan | 200-215 | ~0.12 |
| Blue | 245-265 | ~0.16 |
| Purple | 290-310 | ~0.18 |
| Pink/Magenta | 330-350 | ~0.22 |

At L=0.3 (dark shades), max chroma drops by roughly 40%. At L=0.9 (light tints), max chroma drops by roughly 60%. Always binary-search for the actual limit rather than relying on this table for production values.

## Gotchas

1. **oklch() in CSS uses spaces, not commas.** `oklch(0.7 0.15 250)` is correct. `oklch(0.7, 0.15, 250)` is invalid.
2. **Hue is meaningless at C=0.** A neutral gray in OKLCH has undefined hue; culori sets it to `undefined`. Do not interpolate through a gray (C=0) in OKLCH or the hue will jump unpredictably.
3. **Browser gamut mapping is not identical across engines.** Chrome and Safari use slightly different algorithms for clamping out-of-gamut oklch() to sRGB. For pixel-identical results, clamp in JS and emit hex.
4. **`oklch()` with `/alpha` needs no comma.** `oklch(0.7 0.15 250 / 0.5)` is the correct alpha syntax.
5. **culori's `oklch()` function returns `{mode, l, c, h}` with `h` in degrees 0-360.** If h is NaN or undefined, the color is achromatic (chroma is 0). Handle this before doing hue math.
6. **Relative lightness != OKLCH lightness.** WCAG 2.1 relative luminance is a different formula (sRGB-derived). Do not mix them. Use culori's `wcagContrast()` which handles the conversion.

## Additional recipes

### Analogous harmony (30-degree spread)
Generate three harmonious hues from a base.
```js
import { oklch, formatHex, clampChroma } from 'culori';

function analogous(baseHex, spread = 30) {
  const base = oklch(baseHex);
  return [-spread, 0, spread].map(offset => {
    const h = ((base.h || 0) + offset + 360) % 360;
    return formatHex(clampChroma({ mode: 'oklch', l: base.l, c: base.c, h }, 'oklch'));
  });
}

console.log(analogous('#3b82f6'));
```

### Neutral ramp with warm/cool tint
Neutrals that carry a slight hue bias for warmth or coolness.
```js
import { formatHex, clampChroma } from 'culori';

function tintedNeutrals(hue, chroma = 0.01) {
  const lightnesses = [0.99, 0.97, 0.93, 0.87, 0.78, 0.68, 0.58, 0.48, 0.40, 0.33, 0.27, 0.15];
  const steps = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  return lightnesses.map((l, i) => ({
    step: steps[i],
    hex: formatHex(clampChroma({ mode: 'oklch', l, c: chroma, h: hue }, 'oklch'))
  }));
}

console.log(tintedNeutrals(60, 0.012));
console.log(tintedNeutrals(240, 0.008));
```

### APCA contrast check
Draft WCAG 3.0 contrast using culori and apca-w3.
```bash
npm install apca-w3
```
```js
import { srgb, formatHex, oklch, clampChroma } from 'culori';
import { APCAcontrast, sRGBtoY } from 'apca-w3';

function apcaContrast(fgHex, bgHex) {
  const fg = srgb(fgHex);
  const bg = srgb(bgHex);
  const fgY = sRGBtoY([fg.r * 255, fg.g * 255, fg.b * 255]);
  const bgY = sRGBtoY([bg.r * 255, bg.g * 255, bg.b * 255]);
  return APCAcontrast(fgY, bgY);
}

console.log(apcaContrast('#1e293b', '#f8fafc'));
console.log(apcaContrast('#94a3b8', '#0f172a'));
```

### Palette audit: flag perceptual uniformity breaks
Check if a ramp has even lightness steps.
```js
import { oklch } from 'culori';

function auditRamp(hexArray) {
  const Ls = hexArray.map(hex => oklch(hex).l);
  const deltas = [];
  for (let i = 1; i < Ls.length; i++) {
    deltas.push(Math.abs(Ls[i] - Ls[i - 1]));
  }
  const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const issues = deltas
    .map((d, i) => ({ from: i, to: i + 1, delta: d.toFixed(3), deviation: ((d - avg) / avg * 100).toFixed(1) + '%' }))
    .filter(d => Math.abs(parseFloat(d.deviation)) > 30);
  return { averageDelta: avg.toFixed(3), issues };
}

const tailwindBlue = ['#eff6ff','#dbeafe','#bfdbfe','#93c5fd','#60a5fa','#3b82f6','#2563eb','#1d4ed8','#1e40af','#1e3a8a','#172554'];
console.log(auditRamp(tailwindBlue));
```
