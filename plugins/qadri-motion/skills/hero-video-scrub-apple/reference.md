# Reference: Apple-Style Canvas Image-Sequence Scrub Hero

## Frame budget calculator

```js
function planSequence({
  totalRotation = 360,      // degrees (or percentage for non-rotational)
  maxJumpPerFrame = 3,      // max visible change per frame (degrees or %)
  vhPerFrame = 4,           // viewport heights of scroll per frame
  frameKb = 25,             // average compressed frame size in KB
}) {
  const frameCount = Math.ceil(totalRotation / maxJumpPerFrame);
  const totalVh = frameCount * vhPerFrame;
  const totalMb = (frameCount * frameKb) / 1024;
  return { frameCount, totalVh, totalMb: totalMb.toFixed(1) + 'MB' };
}

// Examples:
planSequence({ totalRotation: 360, maxJumpPerFrame: 3 })
// { frameCount: 120, totalVh: 480, totalMb: '2.9MB' }

planSequence({ totalRotation: 180, maxJumpPerFrame: 4 })
// { frameCount: 45, totalVh: 180, totalMb: '1.1MB' }

planSequence({ totalRotation: 360, maxJumpPerFrame: 6, frameKb: 15 })
// { frameCount: 60, totalVh: 240, totalMb: '0.9MB' }
```

## Frame export settings by format

| Format | Quality | Size per frame (1440x960) | Size per frame (640x420) | Browser support |
|---|---|---|---|---|
| WebP | q75 | 25-35KB | 8-15KB | Chrome 32+, Firefox 65+, Safari 16+ |
| AVIF | q60 | 15-25KB | 5-10KB | Chrome 85+, Firefox 93+, Safari 16.4+ |
| JPEG | q80 | 40-60KB | 15-25KB | Universal |
| PNG | lossless | 200-400KB | 60-120KB | Universal (alpha support) |

**Rule of thumb:** WebP q75 is the default. AVIF for aggressive optimization when Safari 16.4+ is acceptable. JPEG when WebP/AVIF are not an option. PNG only for sequences requiring alpha compositing over varied backgrounds.

## Blender export recipe for frame sequences

```python
# In Blender, set output to Image Sequence:
# Output Properties > Output > File Format: WebP
# Output Properties > Output > Quality: 75
# Output Properties > Output > Path: //frames/frame_####
# Render > Render Animation (Ctrl+F12)
```

For After Effects: File > Export > Render Queue > Output Module > Format: WebP Sequence. Frame naming: `frame_[####].webp`.

## Contain-fit draw math

```js
function drawContained(ctx, bitmap, canvasWidth, canvasHeight) {
  const bAspect = bitmap.width / bitmap.height;
  const cAspect = canvasWidth / canvasHeight;
  let dw, dh, dx, dy;
  if (bAspect > cAspect) {
    // Image wider than canvas: fit to width, letterbox top/bottom
    dw = canvasWidth;
    dh = canvasWidth / bAspect;
    dx = 0;
    dy = (canvasHeight - dh) / 2;
  } else {
    // Image taller than canvas: fit to height, pillarbox left/right
    dh = canvasHeight;
    dw = canvasHeight * bAspect;
    dx = (canvasWidth - dw) / 2;
    dy = 0;
  }
  ctx.drawImage(bitmap, dx, dy, dw, dh);
}
```

## Progress-to-frame mapping

```js
// Linear mapping (default)
const frameIndex = Math.min(FRAME_COUNT - 1, Math.floor(progress * FRAME_COUNT));

// Eased mapping (slow start, fast middle, slow end)
function easedFrame(progress, frameCount) {
  const eased = progress < 0.5
    ? 2 * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 2) / 2; // easeInOutQuad
  return Math.min(frameCount - 1, Math.floor(eased * frameCount));
}
```

## Video currentTime scrub caveats

| Issue | Cause | Mitigation |
|---|---|---|
| 50-150ms seek latency | Browser decoder needs to find nearest keyframe | Encode with keyframe every 1-2 seconds (ffmpeg: `-g 30` at 30fps) |
| Seek not frame-accurate | Non-keyframe seeks interpolate | Accept slight inaccuracy or increase keyframe interval |
| `seeked` event fires late | Decode happens async | Use rAF polling instead of waiting for `seeked` |
| No scrub on iOS Safari <16 | `currentTime` set before `canplay` is ignored | Wait for `canplaythrough` before binding scroll |

## Encoding video for scrubbing (ffmpeg)

```bash
# Encode with frequent keyframes for fast seeking
ffmpeg -framerate 30 -i frame_%04d.webp \
  -c:v libx264 -crf 23 -preset fast \
  -g 15 -keyint_min 15 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  product-reveal.mp4

# -g 15: keyframe every 15 frames (0.5s at 30fps)
# -movflags +faststart: moov atom at start for streaming
# -crf 23: good quality, ~1-2MB for 90 frames
```

## Sliding window memory math

| Frame resolution | Per-bitmap memory (RGBA) | 60 frames | 120 frames | +/-30 window |
|---|---|---|---|---|
| 640x420 | 1.07MB | 64MB | 128MB | 64MB |
| 960x640 | 2.46MB | 148MB | 295MB | 148MB |
| 1440x960 | 5.53MB | 332MB | 664MB | 332MB |

At 1440x960, holding all 120 frames decoded consumes ~664MB. A +/-30 sliding window caps at ~332MB. On mobile (640x420), the full 120-frame set is only 128MB, so a sliding window is optional.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Canvas is black | First frame not yet loaded | Check `loader.bitmaps[0]` is truthy before first draw |
| Canvas is blurry | Backing store at CSS size, not DPR-scaled | `canvas.width = clientWidth * Math.min(dpr, 2)` |
| Frames appear in wrong order | Frame URLs not zero-padded | Use `padStart(4, '0')` in URL generation |
| Scroll is "stuck" during load | Pin active but no frames to draw | Show loading state and draw first available frame |
| Jank on fast scroll | Drawing multiple frames per rAF | Use pending-frame pattern: only draw the latest requested frame |
| Hero stays pinned forever | `end` value miscalculated | Set `end: '+=${FRAME_COUNT * VH_PER_FRAME}%'` |
| White flash between frames | `clearRect` before draw with no fallback | Only `clearRect` after confirming the next bitmap exists |
