# Reference: Cinematic Grain, Vignette & Slow Push-In Hero

## Grain technique comparison

| Technique | Size | JS? | Animate? | Best for |
|---|---|---|---|---|
| SVG feTurbulence | 0 KB | No | Hard (CPU-bound) | Static grain, simplest setup |
| Canvas noise tile (static) | ~2 KB data URL | 20 lines init | No | Static grain with per-pixel control |
| Canvas noise tiles (animated) | ~200 KB (4 frames) | 30 lines init | Yes (4fps frame cycling) | Flickering film-grain feel |
| Static PNG tile | 1-3 KB file | No | No | Cheapest, most portable |
| CSS `background-image` noise | 0 KB | No | Hard | Very limited, low quality |

## feTurbulence parameter reference

| Parameter | Value range | Effect |
|---|---|---|
| `baseFrequency` | 0.3-1.0 | Grain size. 0.5 = large/coarse. 0.8 = fine/film-like. 0.65 = standard 35mm. |
| `numOctaves` | 1-5 | Detail layers. 1 = smooth. 3 = natural. 5 = very detailed (expensive). |
| `type` | `fractalNoise` or `turbulence` | `fractalNoise` = soft grain. `turbulence` = harder, more contrasty. |
| `seed` | integer | Random seed. Change to get a different pattern. Animate to "flicker" (expensive). |
| `stitchTiles` | `stitch` or `noStitch` | `stitch` = seamless tiling. Always use `stitch`. |

## mix-blend-mode visual guide

| Mode | On dark image | On bright image | Best for |
|---|---|---|---|
| `overlay` | Brightens noise, darkens shadows | Natural grain integration | Most images (default) |
| `multiply` | Darkens everything slightly | Subtle, moody | Dark/moody photography |
| `soft-light` | Very subtle overlay | Gentle, warm | Light/pastel/airy images |
| `screen` | Brightens everything | Washes out | Rarely right for grain |
| `normal` | Uniform white haze | Uniform white haze | Never use for grain |

## Push-in scale and image sizing

| Push-in scale | Image oversizing needed | Duration range | Feel |
|---|---|---|---|
| 1.04 | 4% | 12-18s | Barely perceptible. Good for mobile. |
| 1.06 | 6% | 15-20s | Subtle. Standard web use. |
| 1.08 | 8% | 18-25s | Noticeable. Cinematic sweet spot. |
| 1.10 | 10% | 20-30s | Prominent. Feature film feel. |
| 1.15+ | 15%+ | 25-40s | Too much. Image quality degrades at edges. |

The image must be larger than the container by at least the scale percentage in each dimension. `object-fit: cover` handles this automatically, but verify the image resolution is sufficient (1920x1080 minimum for 1080p displays with 8% zoom = effective area 2074x1166).

## Vignette intensity guide

| Intensity (edge alpha) | Feel | Image type |
|---|---|---|
| 0.3-0.4 | Light, airy | Bright landscapes, fashion |
| 0.5-0.6 | Moderate | General editorial |
| 0.7-0.8 | Heavy, moody | Dark/dramatic photography, film |
| 0.9+ | Very heavy | Night scenes, thriller aesthetic |

## Content position conventions

| Position | Convention | Best for |
|---|---|---|
| Bottom-left | Film title card, editorial | Cinematic heroes (default in this toolkit) |
| Lower-third | Broadcast/news/documentary | Information-heavy heroes |
| Center-bottom | Fashion editorial | When image is the star, text is secondary |
| Center-center | Presentations, banners | NOT cinematic; avoid for this effect |
| Top-left | Magazine masthead | Editorial longform |

## Image optimization commands

```bash
# Convert to WebP at 80 quality
ffmpeg -i hero.jpg -quality 80 hero.webp

# Convert to AVIF at quality 60 (smaller, better)
ffmpeg -i hero.jpg -c:v libaom-av1 -crf 30 -still-picture 1 hero.avif

# Generate responsive srcset sizes
# 640, 1024, 1440, 1920, 2560 widths
for w in 640 1024 1440 1920 2560; do
  ffmpeg -i hero.jpg -vf "scale=${w}:-1" -quality 80 hero-${w}.webp
done

# Compress video for hero background
ffmpeg -i input.mp4 -c:v libx264 -crf 28 -preset slow -an -movflags +faststart hero-bg.mp4
```

## Responsive srcset pattern

```html
<img
  class="hero__image"
  src="hero-1440.webp"
  srcset="
    hero-640.webp 640w,
    hero-1024.webp 1024w,
    hero-1440.webp 1440w,
    hero-1920.webp 1920w,
    hero-2560.webp 2560w
  "
  sizes="100vw"
  alt=""
  loading="eager"
  decoding="async"
/>
```

## Serif font pairings for cinematic heroes

| Display (headline) | Body (subline/eyebrow) | Feel |
|---|---|---|
| DM Serif Display | Inter | Classic editorial meets clean sans |
| Playfair Display | Source Sans 3 | High-contrast serif, luxury feel |
| Cormorant Garamond | Raleway | Elegant, thin, fashion editorial |
| Libre Baskerville | Open Sans | Traditional, literary |
| Fraunces | Work Sans | Organic, contemporary editorial |

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Grain invisible | Opacity too low (< 0.03) or covered by vignette z-index | Increase opacity to 0.05+; ensure grain z-index > vignette z-index |
| Grain looks like JPEG artifacts | Opacity too high or blend mode wrong | Reduce to 0.04-0.08; use overlay/multiply blend |
| Push-in snaps at loop | Missing `alternate` direction | Add `animation-direction: alternate` |
| Push-in reveals image edge | Scale too large for image resolution | Either reduce scale or ensure image has extra resolution/padding |
| Vignette has hard edge | Using box-shadow instead of radial-gradient | Use `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)` |
| Content unreadable | No vignette + bright image area behind text | Add vignette; if still unreadable, add a scrim pseudo-element behind content |
| Grain clips at edges during zoom | Grain layer does not extend beyond viewport | Set `inset: -10%` on grain element |
| Mobile jank | SVG feTurbulence CPU rendering | Reduce grain opacity on mobile; use static canvas tile instead of SVG |
| Image loads slowly | No eager loading, no srcset | Add `loading="eager"`, responsive `srcset`, WebP/AVIF format |
| Video autoplay fails | Missing `muted` or `playsinline` | Add `autoplay muted loop playsinline` attributes |
