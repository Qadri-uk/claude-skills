---
name: hero-masked-video-type
description: Use when building a hero where video plays through the shape of large typography, creating a text-as-window effect. Builds the CSS/SVG/Canvas mask pipeline with autoplay, poster fallback, and progressive enhancement.
category: hero
pairs_with: hero-masked-video-type-eval
---

# Video-Clipped-to-Type Mask Hero

## What this builds
A full-viewport hero section where a background video is visible only through the cutout shapes of large headline text, with the surrounding area filled by a solid color or secondary background. The text acts as a window into the video.

- Large display type (1-4 words) masks a looping background video
- CSS `background-clip: text` as the primary technique with `mix-blend-mode` fallback
- SVG `<clipPath>` + `<text>` as the robust cross-browser fallback
- Canvas-based mask as the final fallback for maximum control
- Autoplay muted inline video with poster image for load state
- Responsive text sizing via `clamp()` that maintains the mask effect across viewports
- Static poster-through-text fallback for reduced-motion and mobile data saver

## When to use / when not to
- Use when the brand identity is a bold word or short phrase and you want to fill it with dynamic content.
- Use when you have a high-quality looping video (brand film, product montage, abstract texture) and want it to be the hero without showing a full-bleed video.
- Do NOT use for body text or anything under 72px rendered size. The mask effect only reads at display scale.
- Do NOT use when the video content itself needs to be clearly comprehensible. Clipping to letter shapes makes most of the video invisible.
- Do NOT use if you need physics interaction on the text. Use `hero-interactive-3d-text` instead.
- Do NOT use for animated SVG clip paths or morphing text shapes. This is static mask, dynamic fill.

## Stack decision
| Technique | When to pick | Trade-off |
|---|---|---|
| CSS `background-clip: text` | Modern browsers, simplest code | Cannot clip `<video>` directly; requires canvas frame capture or `mix-blend-mode` workaround |
| SVG `<clipPath>` + `<foreignObject>` | Need to clip an actual `<video>` element | Works everywhere SVG is supported. Slightly more markup. |
| Canvas compositing | Need pixel-perfect control, animated text, or effects | Most code. Best performance for animated masks. |
| `mix-blend-mode: screen/multiply` | Quick hack when `background-clip` cannot reach the video | Requires specific color setup (white text on black bg or vice versa). Not a true clip. |

Primary recommendation: SVG `<clipPath>` on the `<video>` element. It directly clips the video without canvas overhead and works in all modern browsers.

Cheaper alternative: CSS `background-clip: text` with a canvas that copies video frames as the text background-image. Fewer lines but introduces a per-frame canvas draw.

## Architecture
```
src/
  hero-video-type/
    index.html         -- <section> with SVG clipPath, video element, fallback
    styles.css         -- Layout, responsive type, poster fallback
    video-mask.js      -- Autoplay setup, poster swap, reduced-motion check
    canvas-fallback.js -- Canvas compositing fallback (optional)
  assets/
    hero-video.mp4     -- Looping video, 10-30s, no audio track
    hero-poster.jpg    -- First frame or representative still
```

Lifecycle:
1. **HTML parse**: SVG `<clipPath>` with `<text>` defines the mask shape. `<video>` is inside a clipped container.
2. **CSS**: Text sized with `clamp()`. Container positioned to fill viewport.
3. **JS init**: Check reduced-motion. If not reduced, attempt video autoplay. On failure (mobile restrictions), show poster.
4. **Resize**: `<text>` in SVG clipPath must update its position/size on resize. Use `viewBox` to make this automatic.
5. **Teardown**: Pause video, revoke object URLs if any.

## Build it: step by step

### Phase 1: HTML structure with SVG clipPath

```html
<section class="hero-video-type" aria-label="Brand name with video background">
  <svg class="hero-video-type__clip-svg" aria-hidden="true">
    <defs>
      <clipPath id="text-clip" clipPathUnits="objectBoundingBox">
        <!-- This text will be converted to a path for clipPathUnits="objectBoundingBox" -->
        <!-- We use userSpaceOnUse instead for dynamic text -->
      </clipPath>
    </defs>
  </svg>

  <!-- Actual implementation uses userSpaceOnUse for text -->
  <div class="hero-video-type__video-wrap">
    <video
      class="hero-video-type__video"
      autoplay
      muted
      loop
      playsinline
      preload="auto"
      poster="assets/hero-poster.jpg"
    >
      <source src="assets/hero-video.mp4" type="video/mp4" />
    </video>
  </div>

  <div class="hero-video-type__text-layer">
    <h1 class="hero-video-type__heading">BRAND</h1>
  </div>

  <!-- Fallback: visible when video/clip fails -->
  <h1 class="hero-video-type__fallback">BRAND</h1>
</section>
```

### Phase 2: The robust SVG clipPath approach

```html
<!-- Revised structure: SVG wraps everything -->
<section class="hero-video-type" aria-label="BRAND">
  <div class="hero-video-type__container">
    <svg
      class="hero-video-type__svg"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <clipPath id="text-mask">
          <text
            x="50%"
            y="55%"
            text-anchor="middle"
            dominant-baseline="central"
            font-family="'Inter', system-ui, sans-serif"
            font-weight="900"
            font-size="280"
            letter-spacing="-0.03em"
          >BRAND</text>
        </clipPath>
      </defs>

      <!-- Background fill (visible area outside text) -->
      <rect width="100%" height="100%" fill="#0a0a0a" />

      <!-- Video clipped to text shape -->
      <foreignObject
        x="0" y="0" width="100%" height="100%"
        clip-path="url(#text-mask)"
      >
        <video
          xmlns="http://www.w3.org/1999/xhtml"
          class="hero-video-type__video"
          autoplay muted loop playsinline
          preload="auto"
          poster="assets/hero-poster.jpg"
          style="width:100%;height:100%;object-fit:cover;"
        >
          <source src="assets/hero-video.mp4" type="video/mp4" />
        </video>
      </foreignObject>
    </svg>
  </div>

  <h1 class="hero-video-type__fallback">BRAND</h1>
</section>
```

### Phase 3: CSS layout and responsive sizing

```css
.hero-video-type {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #0a0a0a;
}

.hero-video-type__container {
  position: absolute;
  inset: 0;
}

.hero-video-type__svg {
  width: 100%;
  height: 100%;
  display: block;
}

.hero-video-type__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-video-type__fallback {
  position: absolute;
  inset: 0;
  display: none; /* shown via JS when SVG/video fails */
  align-items: center;
  justify-content: center;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: clamp(3rem, 15vw, 18rem);
  font-weight: 900;
  color: #eee;
  letter-spacing: -0.03em;
  margin: 0;
  text-align: center;
}

/* When SVG clip is not supported or JS disabled */
.hero-video-type--no-clip .hero-video-type__fallback {
  display: flex;
}
.hero-video-type--no-clip .hero-video-type__container {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .hero-video-type__video {
    /* Poster image shows via poster attribute; video does not autoplay */
  }
}

/* Data saver */
@media (prefers-reduced-data: reduce) {
  .hero-video-type__video {
    display: none;
  }
  .hero-video-type__container foreignObject {
    /* Show poster as background instead */
    background: url('assets/hero-poster.jpg') center/cover;
  }
}
```

### Phase 4: JavaScript for autoplay handling and feature detection

```js
// video-mask.js
export function initVideoMask() {
  const section = document.querySelector('.hero-video-type');
  const video = section?.querySelector('.hero-video-type__video');
  const fallback = section?.querySelector('.hero-video-type__fallback');

  if (!section || !video) return;

  // Feature detection: does SVG clipPath + foreignObject work?
  const svgClipSupported = checkSVGClipSupport();
  if (!svgClipSupported) {
    section.classList.add('hero-video-type--no-clip');
    return;
  }

  // Reduced motion: pause video, show poster
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  function handleMotionPref(e) {
    if (e.matches) {
      video.pause();
      video.currentTime = 0;
    } else {
      video.play().catch(() => {});
    }
  }

  motionQuery.addEventListener('change', handleMotionPref);

  if (motionQuery.matches) {
    video.pause();
    video.removeAttribute('autoplay');
    return; // poster shows through the clip
  }

  // Attempt autoplay
  const playPromise = video.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      // Autoplay blocked. Poster remains visible through clip.
      // Optionally: add play button overlay
      console.warn('Video autoplay blocked. Poster fallback shown.');
    });
  }

  // Handle video load failure
  video.addEventListener('error', () => {
    section.classList.add('hero-video-type--no-clip');
  });

  return {
    destroy() {
      video.pause();
      video.src = '';
      video.load();
      motionQuery.removeEventListener('change', handleMotionPref);
    },
  };
}

function checkSVGClipSupport() {
  // foreignObject in SVG clipPath is well supported in modern browsers
  // but fails in IE and some older mobile browsers
  if (typeof SVGForeignObjectElement === 'undefined') return false;

  // Check if clip-path on foreignObject actually works
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  svg.appendChild(fo);
  return fo instanceof SVGForeignObjectElement;
}
```

### Phase 5: CSS background-clip alternative (simpler, no SVG)

```html
<!-- Alternative: pure CSS approach (no foreignObject needed) -->
<section class="hero-video-type-css" aria-label="BRAND">
  <canvas class="hero-video-type-css__canvas" aria-hidden="true"></canvas>
  <h1
    class="hero-video-type-css__heading"
    aria-hidden="true"
  >BRAND</h1>
  <h1 class="hero-video-type-css__sr-heading sr-only">BRAND</h1>
</section>
```

```css
.hero-video-type-css {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #0a0a0a;
}

.hero-video-type-css__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: none; /* JS shows this */
}

.hero-video-type-css__heading {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  margin: 0;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: clamp(4rem, 18vw, 20rem);
  font-weight: 900;
  letter-spacing: -0.04em;
  line-height: 1;
  color: transparent;
  background-clip: text;
  -webkit-background-clip: text;
  background-size: cover;
  background-position: center;
  /* background-image set by JS from canvas frame capture */
}
```

```js
// css-background-clip approach
export function initCSSVideoType(containerSelector, videoSrc) {
  const container = document.querySelector(containerSelector);
  const heading = container.querySelector('.hero-video-type-css__heading');
  const canvas = container.querySelector('.hero-video-type-css__canvas');
  const ctx = canvas.getContext('2d');

  const video = document.createElement('video');
  video.src = videoSrc;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';

  let rafId;

  function resize() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }

  function drawFrame() {
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      // Convert canvas to data URL and set as background
      // For performance, use canvas.toDataURL only if needed
      // Better: use canvas itself as a CSS paint source
      heading.style.backgroundImage = `url(${canvas.toDataURL('image/jpeg', 0.7)})`;
    }
    rafId = requestAnimationFrame(drawFrame);
  }

  resize();
  window.addEventListener('resize', resize);

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reducedMotion) {
    video.play().then(() => {
      canvas.style.display = 'block';
      drawFrame();
    }).catch(() => {
      // Autoplay failed, use poster as static background
      heading.style.backgroundImage = `url(assets/hero-poster.jpg)`;
    });
  } else {
    heading.style.backgroundImage = `url(assets/hero-poster.jpg)`;
  }

  return {
    destroy() {
      cancelAnimationFrame(rafId);
      video.pause();
      video.src = '';
      window.removeEventListener('resize', resize);
    },
  };
}
```

### Phase 6: Canvas compositing approach (maximum control)

```js
// canvas-fallback.js -- for animated text or complex masks
export function initCanvasVideoMask(container, videoSrc, text) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  container.appendChild(canvas);

  const video = document.createElement('video');
  video.src = videoSrc;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.crossOrigin = 'anonymous';

  const BG_COLOR = '#0a0a0a';
  let rafId;

  function resize() {
    const dpr = Math.min(devicePixelRatio, 2);
    const w = container.clientWidth;
    const h = container.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);
  }

  function computeFontSize() {
    const vw = container.clientWidth;
    // clamp(4rem, 18vw, 20rem) equivalent
    return Math.min(Math.max(64, vw * 0.18), 320);
  }

  function draw() {
    const w = container.clientWidth;
    const h = container.clientHeight;

    // 1. Draw video frame to fill canvas
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
      // Cover-fit the video
      const vRatio = video.videoWidth / video.videoHeight;
      const cRatio = w / h;
      let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
      if (vRatio > cRatio) {
        sw = video.videoHeight * cRatio;
        sx = (video.videoWidth - sw) / 2;
      } else {
        sh = video.videoWidth / cRatio;
        sy = (video.videoHeight - sh) / 2;
      }
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
    }

    // 2. Composite: draw text-shaped holes
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = '#fff';
    ctx.font = `900 ${computeFontSize()}px 'Inter', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '-0.03em';
    ctx.fillText(text, w / 2, h / 2);
    ctx.restore();

    // 3. Draw background behind the clipped video
    // We need the inverse: background everywhere except text
    // Approach: draw to offscreen, composite
    rafId = requestAnimationFrame(draw);
  }

  // Better approach: two-pass compositing
  function drawTwoPass() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    const fontSize = computeFontSize();

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Pass 1: fill background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    // Pass 2: draw video only where text is
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.font = `900 ${fontSize}px 'Inter', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);
    ctx.restore();

    // Pass 3: draw video behind (destination-over puts it behind existing pixels)
    if (video.readyState >= video.HAVE_CURRENT_DATA) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      const vRatio = video.videoWidth / video.videoHeight;
      const cRatio = w / h;
      let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
      if (vRatio > cRatio) {
        sw = video.videoHeight * cRatio;
        sx = (video.videoWidth - sw) / 2;
      } else {
        sh = video.videoWidth / cRatio;
        sy = (video.videoHeight - sh) / 2;
      }
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);
      ctx.restore();
    }

    rafId = requestAnimationFrame(drawTwoPass);
  }

  resize();
  window.addEventListener('resize', resize);

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reducedMotion) {
    video.play().then(() => drawTwoPass()).catch(() => {
      // Static poster fallback
      const img = new Image();
      img.src = 'assets/hero-poster.jpg';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, container.clientWidth, container.clientHeight);
      };
    });
  }

  return {
    destroy() {
      cancelAnimationFrame(rafId);
      video.pause();
      video.src = '';
      window.removeEventListener('resize', resize);
      container.removeChild(canvas);
    },
  };
}
```

### Phase 7: Video preparation guidelines

```bash
# Encode hero video: 10s loop, no audio, H.264 baseline for max compat
ffmpeg -i source.mov \
  -c:v libx264 -profile:v baseline -level 3.0 \
  -pix_fmt yuv420p \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -an \
  -movflags +faststart \
  -t 10 \
  -b:v 2500k \
  hero-video.mp4

# WebM VP9 alternative for smaller file size
ffmpeg -i source.mov \
  -c:v libvpx-vp9 \
  -b:v 1800k \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease" \
  -an \
  -t 10 \
  hero-video.webm

# Extract poster frame
ffmpeg -i hero-video.mp4 -vframes 1 -q:v 2 hero-poster.jpg
```

Target file sizes:
- MP4 H.264: 2-4MB for 10s at 1080p
- WebM VP9: 1.5-3MB for same
- Poster JPG: 50-100KB

### Phase 8: Mix-blend-mode shortcut

```html
<!-- Simplest approach: no SVG, no canvas, just CSS blend modes -->
<section class="hero-blend" aria-label="BRAND">
  <video class="hero-blend__video" autoplay muted loop playsinline poster="assets/hero-poster.jpg">
    <source src="assets/hero-video.mp4" type="video/mp4" />
  </video>
  <div class="hero-blend__overlay">
    <h1 class="hero-blend__heading">BRAND</h1>
  </div>
</section>
```

```css
.hero-blend {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #000;
}

.hero-blend__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-blend__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Black background with white text, multiply blend makes white = transparent */
  background: #000;
  mix-blend-mode: multiply;
}

.hero-blend__heading {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: clamp(4rem, 18vw, 20rem);
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.04em;
  margin: 0;
}
```

Note: `mix-blend-mode: multiply` makes white areas transparent (white * video = video). The surrounding black stays black. This inverts the visual: the text becomes the window. Simple but inflexible: background must be black, text must be white. Any other color combination produces tinted results.

## The full reference implementation

Use the SVG clipPath approach from Phase 2 as the primary. Add the mix-blend-mode from Phase 8 as the progressive enhancement fallback. Add the JS from Phase 4 for autoplay handling. This gives three tiers:

1. SVG clipPath + foreignObject (best quality, true clip)
2. mix-blend-mode (simpler, works if SVG foreignObject fails)
3. Solid-color text on poster background (no video, no clip, reduced-motion or JS disabled)

## Tuning the feel

| Parameter | Value | Why |
|---|---|---|
| Font size | `clamp(4rem, 18vw, 20rem)` | 18vw fills ~60% of viewport width with a 5-letter word. Cap at 20rem to prevent overflow. |
| Font weight | 900 / Black | Thin text shows too little video to be legible. Weight 900 gives maximum stroke area. |
| Letter spacing | -0.03em to -0.05em | Tight spacing increases the continuous visible video area. Loose spacing fragments it. |
| Video bitrate | 2-3 Mbps (H.264) | Below 1.5 Mbps, compression artifacts show through thin letter strokes. Above 4 Mbps, payload is too large. |
| Video duration | 8-15s loop | Shorter than 5s, the loop point is obvious. Longer than 20s, the file is too large. |
| Background color | #0a0a0a | Not pure black. Pure black against a bright video creates harsh edges. Near-black softens the transition. |
| SVG font-size | 280 (at 1440 viewBox) | Proportional to the viewBox width. 280/1440 = ~19.4% of width, matching the CSS clamp. |
| Poster JPEG quality | 80-85 | High enough to look sharp through letter shapes. Below 70, JPEG blocking shows. |
| Video loop gap | seamless | Encode the last 0.5s to match the first 0.5s. Cross-dissolve in editing, not in code. |

## Variants

### 1. Gradient text fill instead of video
Replace the video with a CSS animated gradient using `background-clip: text`. No video payload, no autoplay issues. Use `background-size: 200% 200%` with a `@keyframes` that shifts `background-position`.

### 2. Multi-line text mask
Stack two or three `<text>` elements in the SVG clipPath at different Y positions. Adjust `dy` between lines. Each line can have different font sizes for visual hierarchy.

### 3. Scroll-scrubbed video
Instead of autoplay looping, bind `video.currentTime` to scroll progress using GSAP ScrollTrigger. Pair with `image-sequence-scrubbing` for the scrub technique. The mask stays static while the content behind it moves.

### 4. Text outline only (hollow mask)
Use `stroke` instead of `fill` on the SVG `<text>` in the clipPath. Shows video only in the letter outlines, not the filled shapes. Requires `stroke-width` of 8-15 units for enough visible video.

### 5. Animated text entrance
Letters start with `font-size: 0` or off-screen and scale/translate into position before the video reveal begins. Use GSAP timeline from `gsap-core-timelines` for the entrance, then activate the video on timeline complete.

## Performance budget

| Metric | Target | Lever |
|---|---|---|
| LCP | < 2.5s | Poster image is the LCP element. Preload it. Keep under 100KB. |
| Video payload | < 4MB (10s loop) | H.264 baseline at 2.5Mbps. Use WebM VP9 for 30% smaller. |
| Frame time | < 16ms | SVG clipPath approach has zero JS per-frame cost. Canvas approach costs 1-3ms per drawImage. |
| CLS | 0 | Set explicit width/height on the section. No layout shift from video load. |
| Total hero weight | < 5MB | Video (4MB) + poster (100KB) + fonts (50KB) + code (10KB). |

First cuts when over budget:
1. Reduce video resolution to 720p (1.5-2MB at 10s)
2. Shorten loop to 6-8s
3. Drop WebM source (serve only H.264)
4. Use poster-only on mobile (no video download)
5. Use animated gradient variant instead of video

## Accessibility

```js
// Reduced motion: do not autoplay video
const mq = matchMedia('(prefers-reduced-motion: reduce)');
if (mq.matches) {
  video.pause();
  video.removeAttribute('autoplay');
  // Poster image shows through the text mask instead
}
```

- The `<section>` has `aria-label` with the text content.
- The visible SVG text is `aria-hidden="true"` since it is decorative (the mask shape).
- A screen-reader-only `<h1>` or the `aria-label` provides the actual heading semantics.
- Video has no audio track, so no captions needed. If it did, add `<track>` elements.
- The video is purely decorative. `aria-hidden="true"` on the video element itself.
- Poster fallback ensures content is visible without motion.
- If using canvas approach, the canvas is `aria-hidden="true"` with a separate semantic heading.

## Anti-slop rules

1. DO NOT use `background-clip: text` directly on a `<video>` element. It does not work. `background-clip` only clips CSS backgrounds (images, gradients), not replaced content like video.
2. DO NOT use a light/pastel background color with the multiply blend mode. Multiply blending only produces the "text as window" effect with a black background and white text. Any other combination produces muddy results.
3. DO NOT autoplay a video with an audio track. Browsers will block it. Strip the audio track in ffmpeg before encoding.
4. DO NOT skip the `playsinline` attribute on the video. Without it, iOS Safari opens the video in fullscreen.
5. DO NOT set the SVG `<text>` font-size in CSS. SVG text sizing must be set as an attribute or it will not participate in the clipPath calculation in some browsers.
6. DO NOT use `font-weight: 400` for the mask text. Regular-weight text is too thin to show meaningful video content through the letter shapes.
7. DO NOT serve a 30MB uncompressed video. Encode with `-movflags +faststart` for progressive loading and target 2-3 Mbps.
8. DO NOT forget `object-fit: cover` on the video. Without it, the video shows letterboxed at its native aspect ratio instead of filling the viewport.
9. DO NOT use `will-change: transform` on the SVG clipPath. SVG clip paths are not composited the same way as CSS transforms. This hint does nothing and may cause rendering bugs.
10. DO NOT test only in Chrome. Safari handles SVG foreignObject inside clipPath differently. Test in both.

## Integration notes

- Pairs with `gsap-core-timelines` for the text entrance animation before video reveal.
- Pairs with `gsap-scrolltrigger` for scroll-scrubbed video variant.
- Pairs with `image-sequence-scrubbing` if using canvas frame sequence instead of video.
- The SVG clipPath does not conflict with `lenis-smooth-scroll` since there is no scroll interaction in the default variant.
- If combining with `custom-cursor-systems`, the cursor works normally since the SVG mask does not intercept pointer events differently than a normal element.
- Shares font loading concerns with `variable-font-animation`. Preload the font file used in the SVG text to avoid a flash of wrong-font mask shape.

## Ship checklist

- [ ] Video plays through text-shaped mask on Chrome, Safari, and Firefox
- [ ] `prefers-reduced-motion: reduce` shows static poster through mask, no autoplay
- [ ] Fallback heading is visible when video or SVG clip fails
- [ ] Video has no audio track
- [ ] Video has `playsinline` attribute
- [ ] Poster image is preloaded and under 100KB
- [ ] Total video payload under 4MB
- [ ] Text is responsive across 375px to 2560px viewport width
- [ ] `aria-label` on section matches displayed text
- [ ] SVG text and video are `aria-hidden="true"`
- [ ] Screen reader announces the heading text once, not twice
- [ ] No CLS on video load (explicit section dimensions)
- [ ] Video loop is seamless (no visible jump at loop point)
- [ ] `-movflags +faststart` used on the MP4 for progressive loading
