---
name: hero-masked-video-type-eval
description: Use when verifying that hero-masked-video-type was actually implemented correctly. Adversarial audit, not a summary.
pairs_with: hero-masked-video-type
---

# Eval: Video-Clipped-to-Type Mask Hero

## What this audits
The most commonly shipped failure is a hero where the video plays full-bleed behind the text but is not actually clipped to the letter shapes. The text sits on top of the video with a solid color or a faint overlay, not a true mask. The second common failure is autoplay breaking silently on mobile with no poster fallback, leaving a blank hero.

## Evidence required
- Live page tested in Chrome and Safari (SVG foreignObject behavior differs)
- Screenshot at 375px and 1440px viewport widths
- Network panel showing video request, poster request, and font request
- DevTools computed styles on the heading/text element confirming clip or blend mode is active
- Console output checked for autoplay promise rejection handling
- Page tested with `prefers-reduced-motion: reduce` enabled

## Automated checks

```js
// Source checks
const html = document.documentElement.innerHTML;

// PASS: video has playsinline
console.assert(
  /playsinline/.test(html),
  'FAIL: video element must have playsinline attribute'
);

// PASS: video has no audio track or is muted
const video = document.querySelector('video');
if (video) {
  console.assert(video.muted, 'FAIL: video must be muted for autoplay');
}

// PASS: poster attribute exists
console.assert(
  video?.getAttribute('poster'),
  'FAIL: video must have a poster attribute for load state'
);

// PASS: aria-label on container
const section = video?.closest('section, [aria-label]');
console.assert(
  section?.getAttribute('aria-label')?.length > 0,
  'FAIL: section must have aria-label with text content'
);

// Runtime: check that clip-path or mix-blend-mode is actually applied
const clipTarget = document.querySelector('[clip-path], [style*="clip-path"]');
const blendTarget = document.querySelector('[style*="mix-blend-mode"]');
const bgClipTarget = document.querySelector('[style*="background-clip"]');
const svgClip = document.querySelector('clipPath');
console.assert(
  clipTarget || blendTarget || bgClipTarget || svgClip,
  'FAIL: no masking technique (clip-path, blend-mode, background-clip, SVG clipPath) detected'
);
```

## Manual inspection protocol

1. Load the page. PASS if video is visible only through the letter shapes with a solid background surrounding them. FAIL if video is visible as a full rectangle behind/around the text.

2. Wait for 1 full video loop. PASS if the loop is seamless (no flash or jump at the loop point). FAIL if there is a visible gap or black frame.

3. Right-click the video area and select "Inspect." PASS if the video element has `muted`, `loop`, `playsinline`. FAIL if any are missing.

4. Open DevTools > Rendering > check "Emulate prefers-reduced-motion: reduce." Reload. PASS if video does not play and a static image (poster) shows through the text mask. FAIL if video plays or hero is blank.

5. Throttle network to Slow 3G. Reload. PASS if the poster image appears quickly (under 2s) while video loads in background. FAIL if hero is blank during video download.

6. Resize browser from 1440px to 375px width. PASS if text remains visible, properly sized, and centered. FAIL if text overflows, clips, or becomes unreadable (too small to show video through).

7. Disable JavaScript. Reload. PASS if a fallback heading with solid text is visible. FAIL if hero is blank.

8. Open in Safari (not Chrome). PASS if the mask effect works identically. FAIL if SVG foreignObject or clipPath renders differently (common Safari issue).

## Scoring rubric

| # | Criterion | 0 | 1 | 2 | Weight |
|---|---|---|---|---|---|
| 1 | True mask effect | Video is full-bleed, no mask | Mask exists but leaks at edges | Clean clip to letter shapes | 3 |
| 2 | Cross-browser (Chrome + Safari) | Only works in one browser | Minor differences between browsers | Identical in both | 2 |
| 3 | Autoplay handling | No autoplay, no fallback | Autoplay works but no error handling | Autoplay with promise catch + poster fallback | 2 |
| 4 | Reduced motion | No check | Video pauses but canvas/area is blank | Poster shows through mask, no animation | 2 |
| 5 | Responsive text sizing | Fixed px, breaks on mobile | Responsive but clips at extremes | Clean clamp() across 375-2560px | 2 |
| 6 | Video encoding | Uncompressed or too heavy (>8MB) | Encoded but no faststart or too long | H.264 baseline, faststart, under 4MB | 1 |
| 7 | Poster fallback | No poster attribute | Poster exists but slow to load | Poster preloaded, under 100KB | 1 |
| 8 | Semantic structure | No aria attributes | aria-label but duplicate announcements | Clean aria-label, hidden decorative elements | 1 |
| 9 | Fallback heading | None | Exists but unstyled or always visible | Styled, visible only when SVG/video fails | 2 |
| 10 | Video loop quality | Visible jump at loop | Loop works but slight flash | Seamless loop, no visible transition | 1 |

**Total: 34 points possible. Ship threshold: 26+. Below 20: NO SHIP.**

## Common false passes

1. **Text color matches video, looks like a mask but is not.** White text on a bright video can look like video-through-text at a glance. Pause the video. If the text remains a solid color, there is no actual mask. The text should show the video's frozen frame, not a flat fill.

2. **`background-clip: text` on a static gradient, not the video.** The hero shows a gradient-filled heading. Looks polished but is not using video at all. Check if a `<video>` element exists and is actually connected to the mask.

3. **SVG clipPath text uses a different font than the visible heading.** The clipPath `<text>` uses the browser default serif while the fallback heading uses Inter. If the SVG font fails to load, the mask shape does not match the intended design. Check computed font-family inside the SVG.

4. **Video autoplay works in dev (localhost) but fails in production (HTTPS cross-origin).** `crossOrigin` attribute missing on the video, or the CDN does not send proper CORS headers. The canvas approach will throw a tainted-canvas error.

5. **Mix-blend-mode multiply on a non-black background.** The blend math only produces a clean cutout when the overlay background is pure black. A dark gray (even #111) will produce a visible tint over the video in the text area.

6. **Poster shows but video never starts.** Autoplay promise is caught but no retry or play button is added. User sees a static poster forever with no indication that video should be playing.

## Required fixes by failure mode

| Failure | Root cause | Fix |
|---|---|---|
| Video visible outside text | No clip-path or blend mode applied | Apply SVG clipPath on foreignObject or mix-blend-mode on overlay |
| Blank hero on iOS | Missing `playsinline` | Add `playsinline` attribute to video element |
| Autoplay blocked, no fallback | Promise rejection not caught | Catch play() promise, show poster or add play button |
| Mask shape wrong font | SVG text font not loaded | Set font-family as SVG attribute, preload the font file |
| Video too large | Unoptimized encoding | Re-encode with ffmpeg at 2.5Mbps H.264 baseline with faststart |
| Safari renders differently | foreignObject inside clipPath quirk | Test with SVG clipPath using `<text>` directly, not foreignObject |

## Verdict format

```
SCORE: XX/34
SHIP THRESHOLD: 26

| # | Criterion              | Score | Note |
|---|------------------------|-------|------|
| 1 | True mask effect       | X/2   |      |
| ...                                       |

BLOCKING ISSUES:
- [list any criterion scoring 0]

VERDICT: SHIP / NO SHIP
```
