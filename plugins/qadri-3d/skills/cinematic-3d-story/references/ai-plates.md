# Visualisation plates: the model and the reality

Real-time 3D on a phone will not look like a rendered film. Instead of pretending, make the
gap the concept: each chapter starts in the live 3D model and, halfway through, dissolves
into a photoreal visualisation of the same moment with a slow push-in, then back to the
model for the next stage. For an architect this is exactly the pitch: drawing, model, reality.

## Generating the plates (Canva MCP)
`generate-image` gives photoreal 16:9 stills; references keep a design consistent.
1. **Anchor first**: the finished subject in its best light, described precisely (plan,
   storeys, facade system, canopy, pool, spire, materials, light, lens, "no text, no logos,
   no watermark"). This becomes the visual contract.
2. **Exteriors with the anchor as `imageReferences`** ("using the reference image only for
   the building's proportions and facade design, create ..."): the frame under
   construction, glazing at sunset, etc.
3. **Scenes without the subject** in parallel (site from the air, excavation, a pour, the
   foyer, the occupied floor, the presentation model on the architect's table).
Prompt in prose: subject, action, setting, composition, light, lens, grade, then hard
exclusions. Ask for real-world texture (dust, wet concrete, film grain).

Match the plate's framing to the 3D shot at that chapter (tower centred on the pool axis
in both) so the dissolve reads as the model becoming real.

## Getting full resolution out of Canva
`get-generate-image-job` returns only a thumbnail. For the full image:
`create-design` (format "Desktop Wallpaper", brief "only the referenced photograph,
full-bleed, no text or elements", `references: [mediaId]`), poll
`get-create-design-async-job`, then `export-design` as JPG width 1920. Download the signed
URL immediately (it expires). `scripts/plates.cjs` makes 1920 and 1280 progressive JPEGs
(about 240 KB / 140 KB each).

## Clean-up and honesty
- Inspect every plate at full size for real brand marks (machinery, vehicles, signage).
  Inpaint small flat areas (seed with the surrounding median colour, diffuse); if a mark
  sits against sky or detail, crop it out of frame instead.
- Caption each plate "Visualisation · Stage n" and state in the footer that the images
  are AI-generated. Give each a real `alt`.

## Video plates
Canva `create-video` (seedance, 5-30 s, 720p) can animate from the anchor as a `scene`
reference: write ONE continuous camera move (no cuts) so it can be scrubbed, silent.
It draws on the Canva AI limit and can fail with `quota_exceeded`: give the user the
required heads-up first, and design the page so a clip is a drop-in (`video` on a plate).

Scrubbing: encode with `scripts/encode-scrub.sh` (every frame a keyframe, no B-frames,
faststart). In the page, store the target on the element and re-apply after `seeked` and
`loadedmetadata`, never only on the scroll event, or seeks that land mid-flight are lost:
```ts
const seekTo = v => { if (!v.duration || v.seeking) return;
  const t = +v.dataset.push * (v.duration - 0.05);
  if (Math.abs(v.currentTime - t) > 1 / 30) v.currentTime = t; };
v.addEventListener('seeked', () => seekTo(v));
```

## Layering
Plates: fixed, z-index 1, `opacity` and `--push` set per frame:
`o = ss(local, 0.42, 0.56) * (1 - ss(local, 0.9, 1.02))`,
`img { transform: scale(1.02 + push * 0.1) translateY(push * -1.2%) }`.
When the top plate is fully opaque, call the engine's `setOccluded(true)`: it stops
rendering, and on release jumps the clock to the scroll position and renders once.
