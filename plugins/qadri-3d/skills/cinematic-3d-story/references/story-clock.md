# Story clock, phases and camera

## Scroll to clock
Chapters are equal-ish tall sections (`height: 175svh`, the first `150svh`), each with a
`position: sticky; top: 0; height: 100svh` inner block that holds the copy. Measure
section tops once (and on `resize` and `load`), then:

```ts
const clock = () => {
  let c = 0;
  for (let i = 0; i < tops.length; i++) if (scrollY >= tops[i]) c = i + Math.min(1, (scrollY - tops[i]) / heights[i]);
  return Math.min(N, c);
};
```
`c = i` when chapter i's top meets the viewport top; `c = i + 1` when it has scrolled away.
Section copy holds for about the first 43% of a 175svh chapter (sticky), then scrolls off.

The engine eases toward the scroll value so the camera has weight:
`current += (target - current) * (1 - Math.exp(-dt * 5))`. Lower rates (3) feel floatier
and lag on fast flicks; 5 is a good default. With reduced motion, jump (`current = target`)
and render once per scroll event instead of running the loop.

## Phases: the world as a function of c
```ts
const ss = (x, a, b) => THREE.MathUtils.smoothstep(x, a, b);
function phases(c) {
  return {
    plan: ss(c, -0.35, 0.6), mass: ss(c, 0.15, 0.95), world: ss(c, 0.85, 1.5),
    dig: ss(c, 2.0, 2.9), piles: ss(c, 2.9, 3.25), pour: ss(c, 3.35, 3.6),
    frame: ss(c, 3.95, 5.1), glass: ss(c, 4.9, 5.9),
    night: ss(c, 5.0, 6.9), entrance: ss(c, 7.35, 7.7) * (1 - ss(c, 8.3, 8.6)),
    // ... every state the world has
  };
}
```
Rules: each value is 0..1; windows overlap a little so stages hand off; anything that
opens and closes is `ss(open) * (1 - ss(close))`. Per-item stagger comes from the item's
index: `local = clamp01(P.frame * FLOORS - floor)` then sub-windows within `local`
(columns 0-0.5, beams 0.35-0.7, slab 0.55-1).

Things that appear must have scale 0 (not 0.001 on one axis only) or they show as thin
planes: `const s = k > 0 ? 0.9 + k * 0.1 : 0.0001`.

## Camera: shots as keyframes
```ts
const KEYS: [number, V3, V3, number][] = [
  [0.0, V(0, 118, 14), V(0, 0, 0), 38],      // top-down on the drawing
  [0.6, V(28, 62, 66), V(0, 12, 0), 40],     // the plan tilts up into 3D
  [4.4, V(27, 2.6, 33), V(0, 30, 0), 52],    // worm's-eye up the frame
  [6.5, V(9, 1.8, 132), V(0, 36, 0), 32],    // long-lens hero at dusk
  [8.5, V(-1.4, 1.65, 10.2), V(-4.5, 1.5, 6.6), 30], // 85mm-ish on a person
];
const pos = new THREE.CatmullRomCurve3(KEYS.map(k => k[1]), false, 'centripetal');
const tgt = new THREE.CatmullRomCurve3(KEYS.map(k => k[2]), false, 'centripetal');
// segment i, local t: u = (i + t) / (KEYS.length - 1); pos.getPoint(u); fov = lerp with smoothstep(t)
```
- Centripetal Catmull-Rom avoids overshoot in tight interiors.
- A target that swings past the camera (turning round in a lift) needs an intermediate
  key looking sideways, or the view flips.
- Check every path segment for collisions: a smooth curve between two good shots can fly
  through a building or a tree row. Route moves along streets or above roofs.
- Portrait screens: multiply fov by ~1.45 so the shot still holds its subject.

## A lift ride or any "carried" move
Tie the moving object to the camera, not to c: `car.y = clamp(camera.y - eyeHeight, 0, top)`
during the ride window, fixed outside it. Doors use `ss(open) * (1 - ss(close))` windows
bracketing the ride.

## Page script responsibilities
- `paintCopy(c)`: per chapter `--vis` (blur-free fade in/out), `--in` (rise), `--read`
  (word-by-word light-up), count-up figures. Only touch chapters within 1 of c.
- `paintPlates(c)`: plate opacity and push-in; scrub video time; tell the engine when a
  plate fully covers it (`setOccluded`).
- `onFrame(c, P)` from the engine: build log chip, progress bar, rail, letterbox `--bars`,
  floor counter. When occluded the engine still calls it from `setTarget`.
