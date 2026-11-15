# Reference: Scroll-Linked Video Chapter Navigation

## Video encoding cheat sheet for scroll scrubbing

| Parameter | Recommended | Notes |
|---|---|---|
| Codec | H.264 (libx264) | Widest browser decode support. VP9 has faster seeking in Chrome but no iOS Safari. AV1 is too slow to decode for interactive scrubbing. |
| Keyframe interval | 1 second (`-g 30` at 30fps, `-g 60` at 60fps) | Critical for scrub feel. Default ~5s causes 100-200ms backward-seek latency. |
| CRF | 23-26 | 23 for quality-first (hero content), 26 for payload-first. Below 20 is visually indistinguishable but doubles file size. |
| Audio | Strip entirely (`-an`) | Scroll-scrubbed video has no coherent audio. Do not ship silent audio tracks. |
| `faststart` | Always (`-movflags +faststart`) | Moves the moov atom to the file start so the browser can seek before full download. Without this, first seek may wait for full download. |
| Resolution | 1920x1080 desktop, 1280x720 mobile | Use `<source>` with `media` attribute for responsive. |
| Framerate | 30fps | 60fps doubles file size with no visible benefit on scroll scrub (scroll events do not fire at 60hz on most devices). |
| Container | MP4 | MKV and WebM do not support `faststart`. |

### Full ffmpeg command
```bash
ffmpeg -i raw.mov \
  -c:v libx264 -preset slow -crf 24 \
  -vf "scale=1920:1080:flags=lanczos" \
  -g 30 -keyint_min 30 \
  -profile:v high -level:v 4.1 \
  -pix_fmt yuv420p \
  -an \
  -movflags +faststart \
  walkthrough-desktop.mp4

# Mobile variant
ffmpeg -i raw.mov \
  -c:v libx264 -preset slow -crf 25 \
  -vf "scale=1280:720:flags=lanczos" \
  -g 30 -keyint_min 30 \
  -profile:v main -level:v 3.1 \
  -pix_fmt yuv420p \
  -an \
  -movflags +faststart \
  walkthrough-mobile.mp4
```

### Verify keyframe interval
```bash
ffprobe -select_streams v -show_frames -show_entries frame=pict_type,pts_time \
  walkthrough-desktop.mp4 | grep 'pict_type=I' | head -10
# Expect I-frames at 0.0, 1.0, 2.0, ... (1-second intervals)
```

## Seek behavior differences by browser

| Browser | Behavior | Impact |
|---|---|---|
| Chrome (Blink) | Fast seeking. Seeks between keyframes by decoding partial GOP. `seeked` fires within 20-40ms for 1s keyframe interval. | Best scrub feel. |
| Safari (WebKit) | Snaps to nearest keyframe by default. Setting `currentTime` between keyframes may display the preceding keyframe, not the exact frame. `fastSeek()` method available but less precise. | Visible frame-skipping if keyframe interval > 2s. Encode with 1s interval. |
| Firefox (Gecko) | Similar to Chrome but slightly slower decode. `seeked` event fires 30-60ms after `currentTime` set. | Acceptable but slightly softer feel than Chrome. |
| iOS Safari | Same keyframe-snapping as desktop Safari. Also enforces `playsinline` requirement or video goes fullscreen on play. `createImageBitmap` not supported for video frames. | Must have `playsinline`. Canvas fallback requires image sequence, not video-to-canvas. |
| Android Chrome | Follows desktop Chrome behavior. Lower-end devices may struggle with concurrent decode + render. | DPR cap at 2 for canvas fallback. |

## Chapter data model variants

### Minimal (time-only)
```js
const CHAPTERS = [
  { id: 'ch1', label: 'Opening',   start: 0,  end: 15 },
  { id: 'ch2', label: 'Deep dive', start: 15, end: 60 },
  { id: 'ch3', label: 'Closing',   start: 60, end: 90 },
];
```

### Rich (with overlays, thumbnails, metadata)
```js
const CHAPTERS = [
  {
    id: 'ch1',
    label: 'Introduction',
    start: 0,
    end: 15,
    overlay: {
      headline: 'Meet the product',
      body: 'Built for teams who ship fast.',
      position: 'bottom-left',
    },
    thumbnail: 'thumbs/ch1.webp',
    markers: [
      { time: 3,  label: 'Logo reveal' },
      { time: 10, label: 'Tagline' },
    ],
  },
  // ...
];
```

### With weighted scroll budgets
Override the proportional duration-based budget when some chapters need more reading time.

```js
const CHAPTERS = [
  { id: 'intro',   start: 0,  end: 10, weight: 1   }, // proportional
  { id: 'complex', start: 10, end: 30, weight: 1.5 }, // 50% more scroll distance per second
  { id: 'simple',  start: 30, end: 50, weight: 0.8 }, // 20% less (visual, minimal text)
];

function computeWeightedRanges(chapters, totalBudgetVh) {
  const totalWeightedDuration = chapters.reduce((sum, ch) => {
    return sum + (ch.end - ch.start) * (ch.weight || 1);
  }, 0);
  let cursor = 0;
  return chapters.map(ch => {
    const weightedDuration = (ch.end - ch.start) * (ch.weight || 1);
    const vh = (weightedDuration / totalWeightedDuration) * totalBudgetVh;
    const range = { ...ch, scrollStart: cursor, scrollEnd: cursor + vh, vh };
    cursor += vh;
    return range;
  });
}
```

## currentTime vs requestVideoFrameCallback vs canvas fallback

| Approach | Precision | Latency | Payload | Browser support |
|---|---|---|---|---|
| `video.currentTime = t` | Nearest keyframe (Safari) or exact frame (Chrome) | 20-200ms depending on keyframe distance | Low (one video file) | Universal |
| `video.requestVideoFrameCallback()` | Exact frame | ~0ms (fires after decode) | Low | Chrome 83+, Safari 15.4+, Firefox 130+ |
| Canvas + image sequence | Exact frame | ~0ms (pre-decoded bitmap) | High (N images) | Universal |

`requestVideoFrameCallback` is the middle ground: it tells you exactly which frame the video is displaying, so you can sync overlays to the actual displayed frame rather than the requested timecode. Use it when available:

```js
function syncOverlays(video, chapters) {
  if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
    function onFrame(now, metadata) {
      const currentTime = metadata.mediaTime;
      updateActiveChapter(currentTime, chapters);
      video.requestVideoFrameCallback(onFrame);
    }
    video.requestVideoFrameCallback(onFrame);
  } else {
    // fallback: use timeupdate or scroll-tick-based time reading
    video.addEventListener('timeupdate', () => {
      updateActiveChapter(video.currentTime, chapters);
    });
  }
}
```

## Responsive video source selection

```html
<video class="video-chapters__video" muted playsinline preload="auto" aria-hidden="true">
  <source src="walkthrough-desktop.mp4" type="video/mp4" media="(min-width: 769px)">
  <source src="walkthrough-mobile.mp4"  type="video/mp4" media="(max-width: 768px)">
</video>
```

Note: `media` attribute on `<source>` inside `<video>` is not widely supported (it works on `<picture>` and `<audio>` but not reliably on `<video>` across browsers). The reliable alternative is JS-based source selection:

```js
function selectVideoSource(video) {
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  video.src = isMobile ? 'walkthrough-mobile.mp4' : 'walkthrough-desktop.mp4';
  video.load();
}
```

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Video black on first paint | `preload="none"` or no `faststart` | Set `preload="auto"`, encode with `faststart`. |
| Scrub feels choppy/jerky | No smooth scroll, raw wheel events | Add Lenis with `smoothWheel: true`, `duration: 1.1`. |
| Video freezes mid-scrub, then jumps | Seek queue overwhelmed | Verify rAF gate is active. Check `seeking` flag is being set/cleared correctly. |
| Chapter nav shows no active state | Active class computed from scroll position pre-pin, not during pin | Ensure active-chapter computation runs inside `ScrollTrigger.onUpdate`, not a separate scroll listener. |
| Overlays flash rapidly during fast scroll | No debounce on overlay toggle | The rAF gate on the scrub engine should naturally debounce. If overlays are toggled outside the rAF gate, wrap in rAF. |
| Pin releases early | `end` value computed wrong | Ensure `end: '+=' + BUDGET + '%'` matches the container's `height` in vh. Call `ScrollTrigger.refresh()` after any dynamic height change. |
| iOS video goes fullscreen | Missing `playsinline` | Add `playsinline` attribute to `<video>`. |
| Video plays audio | Forgot `-an` in ffmpeg | Re-encode without audio, or add `muted` attribute (but the audio track still downloads). |
| White flash between chapters | Video seeking shows blank frame | Set video poster to a dark frame. Or overlay a dark div that only fades out after first `seeked` event. |
