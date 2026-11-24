# Camera language and grade

Make it read as a film, not a game: continuous moves, a deliberate lens per shot, focus,
an operator's hand, and a grade.

## Lens per shot (vertical FOV)
| Shot | FOV | Use |
|---|---|---|
| Establishing drone | 36-40 | site, city, finale pull-out |
| Worm's-eye / interior wide | 48-52 | the frame rising, a lift car |
| Normal | 40-44 | walking interiors |
| Long lens | 26-32 | golden hour, a compressed hero, a person (85mm feel) |

Interpolate fov with the same segment parameter as position (smoothstep), and call
`camera.updateProjectionMatrix()` only when it changed by more than 0.01.

## Depth of field that pulls focus
`BokehPass(scene, camera, { focus, aperture, maxblur: 0.008 })` after the RenderPass.
Each frame: `focus = distance(cameraKeyPosition, lookAtTarget)`; aperture ~1e-5 outside
(everything sharp, as a real wide lens at distance), up to ~1.1e-3 inside, ramped with a
smoothstep window per chapter. Larger apertures blur the city through a window into mush.
Bokeh re-renders the scene for depth: enable on the high profile only.

## Operator feel
```ts
const amp = lerp(0.12, 0.022, interior);       // drone sway outside, steadicam breath inside
camera.position.set(
  p.x + (Math.sin(t * 0.71) * 0.6 + Math.sin(t * 1.93) * 0.4) * amp,
  p.y + (Math.sin(t * 0.97 + 1.3) * 0.6 + Math.sin(t * 2.41) * 0.3) * amp,
  p.z + Math.sin(t * 0.53 + 2.1) * amp);
camera.lookAt(target);
camera.rotateZ(Math.sin(t * 0.43) * lerp(0.0015, 0.004, interior)); // a breath of roll
```
Plus a little pointer parallax on the look-at target (less indoors). Freeze all of it for
reduced motion.

## Letterbox
A fixed overlay with `::before`/`::after` bars of `calc(var(--bars) * 11vh)`, driven 0..1
over the interior chapters. It says "we have stepped from the brochure into the film".

## Grade
- `renderer.toneMapping = THREE.AgXToneMapping` (more filmic highlight roll-off than ACES).
- AgX desaturates: win it back in a final ShaderPass after OutputPass:
  `c = mix(vec3(luma), c, 1.14); c = (c - 0.5) * 1.07 + 0.5;`
- Same pass: vignette `1 - 0.32 * smoothstep(0.38, 0.9, d)`, grain `±0.011`, lens fringing
  by sampling R and B at `±(uv - 0.5) * 0.0028`.
- Bloom (UnrealBloomPass) with a high threshold (0.95-0.96): only lamps, windows and the
  sun bloom. Clamp the HDR sky (`min(sky, 2.2)`) or the photographed sun floods bloom and
  every reflection at golden hour.
- Exposure: a dip around golden hour (`lerp(1, 0.85, sin(pi * n))`) keeps it from washing out.
- Fog colour from the HDRI's horizon, capped below white (max channel 0.75); bright fog
  reads as haze over everything.

## Light through the story
Sun azimuth sweeps across the build chapters (shadows move as the work progresses),
elevation and colour come from the HDRIs, night fades the sky to a gradient with stars and
a moon, and interiors switch to a soft room environment for reflections. Night: windows
lit by a fragment shader, street lamps as fixed-size points (`sizeAttenuation: false`,
or they turn into big squares near the lens), headlights and tail lights as emissive boxes.
