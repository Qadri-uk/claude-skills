# Noise, Grain & Texture -- Reference

## Blend mode visual reference
| Mode | On light BG | On dark BG | Best for |
|---|---|---|---|
| `overlay` | Darkens midtones, ignores highlights | Lightens midtones, ignores shadows | Universal grain |
| `soft-light` | Gentler version of overlay | Gentler version of overlay | Subtle texture |
| `multiply` | Darkens everything | Nearly invisible | Paper texture on white |
| `screen` | Nearly invisible | Lightens everything | Dust/scratches on dark |
| `hard-light` | Aggressive contrast | Aggressive contrast | Halftone/print effects |
| `difference` | Color inversion effects | Color inversion effects | Glitch aesthetic |

## SVG feTurbulence type comparison
- `fractalNoise`: Smooth, cloud-like. Values centered around 0.5. Good for grain overlays.
- `turbulence`: Sharper, more contrast. Values span full 0-1 range. Good for organic texture (leather, paper, concrete).

## Common gotchas

1. **SVG data URI encoding**: In CSS `url()`, SVG data URIs must encode `#` as `%23` and `<`/`>` properly. The recipe in the SKILL.md uses the correct encoding.
2. **Safari compositing**: Safari sometimes renders `mix-blend-mode` differently on elements with `border-radius`. Test clipped blend modes on WebKit.
3. **Stacking context**: `mix-blend-mode` creates a new stacking context on the element. This can break `z-index` ordering of siblings.
4. **Dark mode grain**: A grain tile designed for light mode (`overlay` blend) may need to swap to `soft-light` or reduced opacity in dark mode because the noise pattern interacts differently with dark underlying colors.
5. **Print**: Browser print styles usually strip `mix-blend-mode` and `filter`. Grain effects disappear in print, which may be desirable (saves ink) or problematic (design intent is lost).
6. **Canvas toDataURL size**: A 512x512 canvas exported as PNG base64 is ~300-500KB as a string. This goes into CSS as inline text. For very large tiles, use `createObjectURL(canvas.toBlob())` instead, and remember to `revokeObjectURL` on cleanup.

## Additional recipes

### Gaussian-distributed noise (more natural than uniform)
Uniform `Math.random()` creates flat histogram noise. Natural film grain has a roughly Gaussian distribution.
```js
function gaussianRandom() {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function createGaussianNoise(size = 256, sigma = 20) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(size, size);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, 128 + gaussianRandom() * sigma));
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}
```

### Seamless tiling noise (no visible repeat edge)
Wrap noise coordinates so the tile edges match.
```js
function createSeamlessNoise(size = 256, scale = 40) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(size, size);
  const d = imageData.data;

  // Pre-generate random values on a grid
  const grid = size / scale;
  const values = [];
  for (let y = 0; y <= grid; y++) {
    values[y] = [];
    for (let x = 0; x <= grid; x++) {
      values[y][x] = Math.random();
    }
  }
  // Wrap edges
  for (let y = 0; y <= grid; y++) values[y][Math.floor(grid)] = values[y][0];
  for (let x = 0; x <= grid; x++) values[Math.floor(grid)][x] = values[0][x];

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const gx = (px / size) * grid;
      const gy = (py / size) * grid;
      const ix = Math.floor(gx), iy = Math.floor(gy);
      const fx = gx - ix, fy = gy - iy;
      const sx = fx * fx * (3 - 2 * fx);
      const sy = fy * fy * (3 - 2 * fy);
      const top = values[iy][ix] * (1-sx) + values[iy][(ix+1) % Math.ceil(grid)] * sx;
      const bot = values[(iy+1) % Math.ceil(grid)][ix] * (1-sx) + values[(iy+1) % Math.ceil(grid)][(ix+1) % Math.ceil(grid)] * sx;
      const v = (top * (1-sy) + bot * sy) * 255;
      const idx = (py * size + px) * 4;
      d[idx] = d[idx+1] = d[idx+2] = v;
      d[idx+3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}
```

### CSS-only noise with repeating-conic-gradient (no SVG, no canvas)
A hack using tiny conic gradients as pseudo-random patterns. Not true noise, but surprisingly effective for subtle texture.
```css
.css-grain {
  position: relative;
}
.css-grain::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    repeating-conic-gradient(#000 0 0.0001%, transparent 0 0.0002%),
    repeating-conic-gradient(transparent 0 0.0003%, #000 0 0.0004%);
  opacity: 0.04;
  mix-blend-mode: overlay;
  pointer-events: none;
}
```
Warning: This uses very small percentage stops, which can be slow to render on some browsers. Test performance.
