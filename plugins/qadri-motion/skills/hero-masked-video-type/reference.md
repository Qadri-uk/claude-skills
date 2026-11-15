# Reference: Video-Clipped-to-Type Mask Hero

## Technique comparison matrix

| Technique | Browser support | Video as source | Per-frame JS cost | Code complexity | Best for |
|---|---|---|---|---|---|
| SVG `<clipPath>` + `<foreignObject>` | Chrome, Firefox, Safari 15.4+ | Yes, directly | None (browser composites) | Medium | Primary recommendation |
| CSS `background-clip: text` + canvas | All modern | Requires canvas frame copy | 1-3ms per frame | Medium | When SVG foreignObject fails |
| Canvas `globalCompositeOperation` | All modern | Yes, via drawImage | 2-5ms per frame | High | Animated text, complex masks |
| `mix-blend-mode: multiply` | All modern | Yes, directly | None | Low | Quick prototype, black bg only |
| CSS `mask-image` with SVG reference | Chrome, Firefox (partial Safari) | No (CSS backgrounds only) | None | Low | Static image masks only |

## SVG clipPath gotchas

| Issue | Browser | Cause | Fix |
|---|---|---|---|
| foreignObject ignored in clipPath | Safari < 15.4 | Older WebKit does not support foreignObject inside clipPath | Use mix-blend-mode fallback |
| Text renders as fallback font | All | SVG text font not loaded when clipPath is computed | Preload font; use `document.fonts.ready` before init |
| clipPath position wrong after resize | All | `clipPathUnits="objectBoundingBox"` rescales but text coordinates break | Use `clipPathUnits="userSpaceOnUse"` with manual viewBox |
| Subpixel rendering differences | Chrome vs Safari | Different antialiasing on SVG text edges | Accept minor differences; not visible at display sizes |
| clipPath not applied to video | Firefox (rare) | `clip-path` CSS property on `<foreignObject>` vs SVG attribute | Use SVG `clip-path` attribute, not CSS property |

## Video encoding reference

### H.264 profiles

| Profile | Compatibility | Use case |
|---|---|---|
| Baseline | Maximum (all mobile) | Hero video default. No B-frames, simpler decoder. |
| Main | Most modern | Slightly better compression. Safe for desktop-first. |
| High | Desktop Chrome/Firefox | Best compression but may fail on older mobile. |

### Recommended ffmpeg commands

```bash
# Standard hero video (10s, 1080p, no audio)
ffmpeg -i source.mov \
  -c:v libx264 -profile:v baseline -level 3.0 \
  -pix_fmt yuv420p \
  -vf "scale=1920:-2" \
  -an -movflags +faststart \
  -crf 23 -maxrate 3000k -bufsize 6000k \
  -t 10 hero.mp4

# Seamless loop: crossfade last 1s with first 1s
ffmpeg -i source.mov -filter_complex \
  "[0:v]trim=0:9,setpts=PTS-STARTPTS[main]; \
   [0:v]trim=9:10,setpts=PTS-STARTPTS[end]; \
   [0:v]trim=0:1,setpts=PTS-STARTPTS[start]; \
   [end][start]blend=all_mode=overlay:all_opacity=0.5[blend]; \
   [main][blend]concat=n=2:v=1:a=0" \
  -c:v libx264 -profile:v baseline -an -movflags +faststart \
  hero-loop.mp4

# WebM VP9 (smaller, modern browsers)
ffmpeg -i source.mov \
  -c:v libvpx-vp9 -crf 30 -b:v 0 \
  -vf "scale=1920:-2" \
  -an -t 10 hero.webm

# Poster frame extraction
ffmpeg -i hero.mp4 -vframes 1 -q:v 2 hero-poster.jpg
```

### File size targets

| Duration | Resolution | H.264 Baseline | VP9 | Acceptable max |
|---|---|---|---|---|
| 6s | 720p | 0.8-1.2MB | 0.5-0.8MB | 2MB |
| 10s | 1080p | 2-3MB | 1.5-2MB | 4MB |
| 15s | 1080p | 3-5MB | 2-3.5MB | 6MB |
| 10s | 4K | 8-12MB | 5-8MB | Do not use 4K for masked video |

## Font loading for SVG text

SVG `<text>` elements do not trigger `@font-face` loading the same way HTML text does. The browser may not load the font before rendering the SVG, causing the clipPath to use the fallback font shape.

```js
// Ensure font is loaded before initializing the mask
document.fonts.load('900 100px "Inter"').then(() => {
  // Now safe to render SVG with text clipPath
  initVideoMask();
});

// Or preload in HTML head
// <link rel="preload" href="/fonts/inter-black.woff2" as="font" type="font/woff2" crossorigin>
```

## Canvas compositing operations reference

| Operation | Effect | Use in this toolkit |
|---|---|---|
| `source-over` | Default. New draws on top. | Initial video draw. |
| `destination-in` | Keep only where old and new overlap. | Clip video to text shape. |
| `destination-out` | Erase old where new draws. | Punch text-shaped holes in background. |
| `destination-over` | New draws behind old. | Place video behind the punched-out background. |
| `multiply` | Multiply color values. | CSS blend mode equivalent (black stays, white = video). |

The two-pass canvas technique:
1. Fill canvas with background color (source-over, default)
2. Punch text-shaped holes with `destination-out`
3. Draw video behind with `destination-over`

Result: background everywhere except where text is, video visible through text shapes.

## Responsive font sizing math

The `clamp()` formula for display text masks:

```
font-size: clamp(MIN, PREFERRED, MAX)
```

| Word length | MIN | PREFERRED | MAX | Rationale |
|---|---|---|---|---|
| 1-3 chars | 5rem | 22vw | 25rem | Single short word fills most of viewport |
| 4-6 chars | 4rem | 18vw | 20rem | Default. 18vw at 1440px = 259px |
| 7-10 chars | 3rem | 14vw | 16rem | Longer word, still readable |
| 11-15 chars | 2.5rem | 10vw | 12rem | Pushing it. Video barely visible per letter. |
| 16+ chars | - | - | - | Do not mask. Use full-bleed video with text overlay instead. |

## Autoplay policy reference

| Browser | Autoplay allowed when | Autoplay blocked when |
|---|---|---|
| Chrome | Muted, or user has interacted, or MEI score high | Unmuted without prior interaction |
| Safari | Muted + playsinline, or user tapped | Any video without playsinline on iOS |
| Firefox | Muted, or autoplay setting is "allow" | Default "block audio" blocks unmuted |

Always: `muted autoplay loop playsinline`. Always catch the `play()` promise. Always have a poster.
