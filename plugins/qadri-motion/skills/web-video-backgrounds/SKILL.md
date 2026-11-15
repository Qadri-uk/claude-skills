---
name: web-video-backgrounds
description: "Ship hero and section background video that loads fast and never blocks the page: encoding ladder with ffmpeg (AV1/H.264, WebM/MP4), poster frames, autoplay rules (muted, playsinline), lazy loading, LCP, phone variants, reduced-motion and data-saver fallbacks, and scroll-scrub-ready encodes. Use when adding a looping video background, a hero film, a muted product loop, or when a background video stutters, delays LCP, refuses to autoplay on iOS or is too heavy."
---

# Web video backgrounds

## Encode (ffmpeg)

Start from the master. Trim to a seamless loop of 6-12 s. Strip audio (`-an`) because it
is never played and it blocks autoplay heuristics.

```bash
# Desktop, 1920 wide: AV1 in MP4 (small) + H.264 MP4 (universal fallback)
ffmpeg -i in.mov -an -vf "scale=1920:-2,fps=30" -c:v libsvtav1 -crf 38 -preset 6 -pix_fmt yuv420p -movflags +faststart hero-1920.av1.mp4
ffmpeg -i in.mov -an -vf "scale=1920:-2,fps=30" -c:v libx264 -crf 26 -preset slow -profile:v high -pix_fmt yuv420p -movflags +faststart hero-1920.h264.mp4
# Phone, portrait crop at 720 wide
ffmpeg -i in.mov -an -vf "crop=ih*9/16:ih,scale=720:-2,fps=30" -c:v libx264 -crf 27 -preset slow -pix_fmt yuv420p -movflags +faststart hero-720p.h264.mp4
# Poster = first frame, so the swap from poster to video is invisible
ffmpeg -i hero-1920.h264.mp4 -frames:v 1 -q:v 3 hero-poster.jpg   # then convert to AVIF/WebP
```

Targets: desktop under ~2.5 MB, phone under ~1 MB. Always use `+faststart` so playback
starts before the download finishes.

For **scroll scrubbing**, every frame must be a keyframe or seeking stutters. Add
`-g 1` (H.264) or use a frame sequence instead (`scroll-film`, `image-sequence-scrubbing`).

## Markup

```html
<video class="absolute inset-0 size-full object-cover" autoplay muted loop playsinline
       preload="none" poster="/media/hero-poster.avif" width="1920" height="1080"
       aria-hidden="true" disablepictureinpicture>
  <source src="/media/hero-720p.h264.mp4" type="video/mp4" media="(max-width: 767px)">
  <source src="/media/hero-1920.av1.mp4" type='video/mp4; codecs="av01.0.08M.08"'>
  <source src="/media/hero-1920.h264.mp4" type="video/mp4">
</video>
```

- `muted` + `playsinline` are required for iOS autoplay. `autoplay` without `muted` fails silently.
- The **poster is the LCP element**: give it explicit dimensions and preload it
  (`<link rel="preload" as="image" href="…poster.avif" fetchpriority="high">`). Video never counts for LCP before it plays.
- Video is decoration, so `aria-hidden="true"` and no captions needed. If it carries
  meaning, it is content: give it controls and captions instead.
- Text over video needs a scrim token (gradient overlay) and must pass contrast against
  the brightest frame, not the average one.
- `<source media>` is honoured by Chromium and Safari. Firefox takes the first playable
  source, which is why the phone source comes first and is small.

## Behaviour script

```js
const v = document.querySelector('video[data-bg]');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saver = navigator.connection?.saveData;
if (reduce || saver) { v.removeAttribute('autoplay'); v.pause(); }
else new IntersectionObserver(([e]) => e.isIntersecting ? v.play().catch(() => {}) : v.pause(),
  { rootMargin: '200px' }).observe(v);
```

Off-screen videos pause to save battery and CPU. With reduced motion the poster stays:
the WCAG 2.2.2 pause rule applies to anything that auto-plays for more than 5 s, so also
offer a visible pause button when the video is large.

## Hosting

Put files in `public/media/` for Cloudflare Pages (served with range requests). Past
~25 MB per file, or when adaptive streaming is needed, use Cloudflare Stream or R2.
See `cloudinary-transformations` if the project already uses Cloudinary.
