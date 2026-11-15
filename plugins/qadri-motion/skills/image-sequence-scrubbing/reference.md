# Image Sequence Scrubbing Reference

## Format/size decision table
| Format | Best for | Typical size (1200x800, quality 75-80) | Notes |
|---|---|---|---|
| WebP | general purpose, wide support | 15-35KB | best default choice as of 2024-2025 |
| AVIF | maximum compression | 10-25KB | 20-30% smaller than WebP but slower to encode/decode, verify decode speed on low-end mobile before committing to a large sequence |
| JPEG | universal fallback | 25-50KB | use only if targeting very old browsers with no WebP support |
| PNG | true alpha transparency required | 80-300KB | avoid unless compositing over unpredictable backgrounds; WebP supports alpha too and is far smaller |

## Total payload budget worksheet
```
frame_count x avg_frame_kb = total_kb
example: 120 frames x 25KB = 3000KB (3MB)
```
Rules of thumb for acceptable total payload against typical connection speeds:
- Desktop-primary experience: up to ~4-6MB total acceptable if streamed progressively (not blocking first paint)
- Mobile-primary experience: target under 2MB total, favor fewer frames + smaller resolution over more frames
- If the math exceeds budget, cut frame count before cutting resolution; a slightly-visible frame-to-frame jump is less noticeable than blurry/pixelated individual frames.

## Exporting frame sequences from common tools
**Blender**: Render > Output > File Format: PNG or OpenEXR at render time, then batch-convert to WebP afterward with a script (Blender's native WebP export support varies by version); render at exactly 2x your maximum CSS display size for retina headroom, no more.
```bash
# batch convert with cwebp (from libwebp)
for f in renders/*.png; do
  cwebp -q 78 "$f" -o "sequence/$(basename "${f%.png}").webp"
done
```

**After Effects**: Composition > Add to Render Queue > Output Module > set to sequence (e.g. PNG sequence), then convert similarly. For camera-move-only sequences (no transparency), export directly as H.264 MP4 and prefer the video-scrub fallback recipe instead, it is dramatically smaller than any frame sequence for camera-move content.

**Real photography/video shoot**: extract frames from a source video with ffmpeg at your target frame count, evenly spaced:
```bash
# extract exactly 90 evenly spaced frames from a 6-second source video
ffmpeg -i source.mp4 -vf "select='not(mod(n\,3))'" -vsync vfr -q:v 2 frames/frame_%04d.png
```

## `requestIdleCallback` fallback for Safari
Safari did not support `requestIdleCallback` until relatively recently; guard with a fallback:
```js
const scheduleIdle = window.requestIdleCallback || ((cb) => setTimeout(() => cb({ timeRemaining: () => 16 }), 1))
```
Use `scheduleIdle` in place of raw `requestIdleCallback` in the streaming loader recipe for broader compatibility.

## Sliding-window memory management for very long sequences (200+ frames)
```js
function pruneFarFrames(loader, currentIndex, windowSize = 40) {
  loader.bitmaps.forEach((bitmap, i) => {
    if (bitmap && Math.abs(i - currentIndex) > windowSize) {
      bitmap.close()
      loader.bitmaps[i] = null
    }
  })
}
```
Call this periodically (e.g. every 20th `onUpdate` tick, not every tick) after the frame index changes meaningfully, then re-stream frames that re-enter the window as the user scrolls back.

## Video-scrub fallback: keyframe interval tuning
For the `<video currentTime>` approach, seek latency is dominated by distance to the nearest keyframe. Encode with a short GOP (group of pictures) size so every seek target is near a keyframe:
```bash
ffmpeg -i source.mov -c:v libx264 -g 15 -keyint_min 15 -crf 20 -pix_fmt yuv420p -movflags +faststart turntable.mp4
```
`-g 15` forces a keyframe roughly every 15 frames (about every 0.5s at 30fps), trading a slightly larger file for much lower seek latency, which matters far more than raw file size for scrub responsiveness.

## Detecting dropped/duplicate frame bugs during development
Log the actually-drawn frame index against the scroll-progress-computed target index; persistent lag (drawn index consistently behind target by more than 1-2) indicates the loader cannot keep up and either frame count needs reducing or resolution needs shrinking:
```js
console.log('target:', pendingFrame, 'drawn:', currentFrame, 'lag:', pendingFrame - currentFrame)
```

## CDN and caching considerations
Serve frame sequences from an image CDN capable of on-the-fly resizing/format negotiation (Cloudflare Images, Cloudinary, imgix) so mobile/desktop resolution tiers do not require maintaining separate pre-exported directories. Set long `Cache-Control: public, max-age=31536000, immutable` headers on frame URLs since they are content-addressed and never change once rendered; this makes back-navigation to a previously-viewed sequence instant from browser cache.

## Choosing between canvas sequence and video fallback
| Factor | Canvas image sequence | Video `currentTime` scrub |
|---|---|---|
| Seek precision | Frame-exact, synchronous | Approximate, 50-150ms decoder latency |
| Payload for 90 frames | 2-3MB (WebP) | 300KB-1MB (H.264, short GOP) |
| Engineering complexity | Higher (loader, memory management) | Lower (single video element) |
| Best for | Precise scroll-locked reveals, alpha compositing over varied backgrounds | Simple camera-move-only content where a little seek lag is acceptable |
| Mobile Safari quirks | None specific | Requires `playsinline muted` attributes even for programmatic seeking, and iOS historically restricted autoplay-adjacent seek behavior without user gesture in some versions |
