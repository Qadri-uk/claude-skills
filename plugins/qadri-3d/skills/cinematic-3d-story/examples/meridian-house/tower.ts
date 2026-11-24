/**
 * Meridian House: vision to occupation, driven by scroll.
 *
 * One continuous world. Scroll position becomes a story clock `c` (0..12,
 * one unit per chapter) and every part of the scene reads its state from c:
 * how deep the pit is, how many floors stand, how much glass is on, what
 * time of day it is, where the camera is, whether the lift doors are open.
 * Scrolling back runs the whole thing in reverse.
 *
 *   0 vision      blueprint plan draws itself, wireframe massing rises
 *   1 site        the city materialises around an empty plot
 *   2 excavation  excavator, dump trucks, the pit deepens
 *   3 foundation  piling rig, rebar, concrete pour, basement
 *   4 structure   steel frame and core climb; the crane swings beams
 *   5 envelope    curtain wall glazes floor by floor; golden hour
 *   6 complete    dusk, plaza, lit floors
 *   7 arrival     glide to the entrance; doors open
 *   8 foyer       chandelier, reception, the receptionist waves
 *   9 lift        glass lift rises through the lit floors
 *  10 occupation  level 16, people at work, city at night
 *  11 finale      pull out to the finished tower
 *
 * Everything is procedural: no model files are downloaded.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { loadAssets, type Assets } from './meridian-assets';
import { createStage, reducedMotion, rng, token, type Stage } from './stage';

type V3 = THREE.Vector3;
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const ss = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = THREE.MathUtils.lerp;

/* ---- the building's dimensions: the "plans" ---- */
export const FLOORS = 16;
const H0 = 7; // double-height ground floor
const FH = 4; // typical floor to floor
const HALF = 13; // 26 m square plate
const PIT = 15; // excavation half-width
const DEPTH = 8; // basement depth
const floorY = (f: number) => (f <= 0 ? 0 : H0 + (f - 1) * FH);
const TOP = floorY(FLOORS); // 67
const LIFT_X = 2.4;
const TOP_FLOOR = floorY(FLOORS - 1); // 63

/* ---- the story clock ---- */
function phases(c: number) {
  return {
    plan: ss(c, -0.35, 0.6), // plan lines draw
    mass: ss(c, 0.15, 0.95), // wireframe massing rises
    world: ss(c, 0.85, 1.5), // blueprint gives way to the real world
    ghost: (1 - ss(c, 5.2, 6.0)) * ss(c, 0.9, 1.4),
    stakes: ss(c, 1.2, 1.6) * (1 - ss(c, 2.2, 2.5)),
    mud: ss(c, 1.8, 2.3),
    dig: ss(c, 2.0, 2.9),
    piles: ss(c, 2.9, 3.25),
    rebar: ss(c, 3.15, 3.4),
    pour: ss(c, 3.35, 3.6),
    basement: ss(c, 3.55, 3.85),
    backfill: ss(c, 3.8, 4.0),
    core: ss(c, 3.85, 5.0),
    frame: ss(c, 3.95, 5.1),
    glass: ss(c, 4.9, 5.9),
    crane: ss(c, 3.7, 3.95) * (1 - ss(c, 5.75, 6.1)),
    plaza: ss(c, 5.8, 6.4),
    night: ss(c, 5.0, 6.9), // 0 day .. 1 night
    hoarding: 1 - ss(c, 5.8, 6.2),
    entrance: ss(c, 7.35, 7.7) * (1 - ss(c, 8.3, 8.6)),
    greet: ss(c, 8.1, 8.35) * (1 - ss(c, 8.8, 9.0)),
    point: ss(c, 8.7, 8.9) * (1 - ss(c, 9.2, 9.4)),
    liftGround: ss(c, 8.75, 8.95) * (1 - ss(c, 9.25, 9.42)),
    liftTop: ss(c, 9.88, 10.05),
    interiors: ss(c, 5.4, 5.8),
  };
}
export type Phases = ReturnType<typeof phases>;

/* ---- camera path: [c, position, target] ---- */
/* Each shot: [story clock, camera, look-at, focal length as vertical FOV]. */
const KEYS: [number, V3, V3, number][] = [
  [0.0, V(0, 118, 14), V(0, 0, 0), 38], // top-down on the drawing
  [0.6, V(28, 62, 66), V(0, 12, 0), 40], // the plan tilts up into 3D
  [1.2, V(75, 55, 95), V(0, 8, 0), 36], // drone establishing shot
  [2.0, V(48, 30, 52), V(0, -3, 0), 38],
  [2.8, V(26, 7.5, 36), V(0, -4, 0), 34], // low over the hoarding, the dig below
  [3.6, V(30, 22, 34), V(0, -5, 0), 40], // crane's-eye over the pour
  [4.4, V(27, 2.6, 33), V(0, 30, 0), 52], // worm's-eye up the frame
  [5.1, V(70, 60, 62), V(0, 40, 0), 36],
  [5.8, V(-4, 52, 124), V(0, 38, 0), 30], // long lens down the avenue, golden hour
  [6.5, V(9, 1.8, 132), V(0, 36, 0), 32], // crane down to a compressed hero shot
  [7.1, V(0, 2.0, 40), V(0, 5, 0), 36], // steadicam approach
  [7.6, V(0, 1.75, 19), V(0, 1.9, 0), 40],
  [8.0, V(-0.3, 1.7, 11.5), V(-2.5, 1.8, 0), 42],
  [8.5, V(-1.4, 1.65, 10.2), V(-4.5, 1.5, 6.6), 30], // 85mm-ish on the receptionist
  [8.95, V(LIFT_X, 1.7, 6.2), V(LIFT_X, 1.5, 0), 40],
  [9.2, V(LIFT_X, 1.7, 0.9), V(LIFT_X, 1.6, -3), 50],
  [9.32, V(LIFT_X, 1.7, 0.7), V(LIFT_X + 3, 1.7, 0.8), 50],
  [9.45, V(LIFT_X, 1.7, 0.6), V(LIFT_X, 1.7, 6), 50],
  [9.85, V(LIFT_X, TOP_FLOOR + 1.7, 0.6), V(LIFT_X, TOP_FLOOR + 1.7, 6), 50],
  [10.05, V(LIFT_X, TOP_FLOOR + 1.7, 0.9), V(LIFT_X, TOP_FLOOR + 1.6, 8), 44],
  [10.45, V(1.2, TOP_FLOOR + 1.7, 6.2), V(-4, TOP_FLOOR + 1.0, 12), 40],
  [10.85, V(-0.5, TOP_FLOOR + 1.7, 11.4), V(-8, TOP_FLOOR - 8, 60), 38],
  [11.45, V(45, 95, 90), V(0, 42, 0), 36], // helicopter pull-out
  [12.0, V(95, 62, 135), V(0, 36, 0), 34],
];

/* ---- small builders ---- */
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const cv = Object.assign(document.createElement('canvas'), { width: w, height: h });
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const css = (name: string) => '#' + token(name).getHexString();

function squareWithHole(outer: number, hole: number, holeZ0 = -hole, holeZ1 = hole, holeX0 = -hole, holeX1 = hole) {
  const s = new THREE.Shape();
  s.moveTo(-outer, -outer).lineTo(outer, -outer).lineTo(outer, outer).lineTo(-outer, outer).lineTo(-outer, -outer);
  const h = new THREE.Path();
  h.moveTo(holeX0, holeZ0).lineTo(holeX0, holeZ1).lineTo(holeX1, holeZ1).lineTo(holeX1, holeZ0).lineTo(holeX0, holeZ0);
  s.holes.push(h);
  return s;
}
/** A flat shape on the ground (shape x,y → world x,z). */
function groundShape(shape: THREE.Shape, mat: THREE.Material, y: number) {
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2); // lies flat, facing up
  const m = new THREE.Mesh(g, mat);
  m.position.y = y;
  m.receiveShadow = true;
  return m;
}
function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  return m;
}
const dummy = new THREE.Object3D();
function setInst(mesh: THREE.InstancedMesh, i: number, p: V3, s: V3 = V(1, 1, 1), ry = 0) {
  dummy.position.copy(p);
  dummy.rotation.set(0, ry, 0);
  dummy.scale.copy(s);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}

/** Shared lit-window shader for city towers. */
const facadeU = { uFacA: { value: null as THREE.Texture | null }, uFacB: { value: null as THREE.Texture | null }, uUseFac: { value: 0 } };
function windowShader(mat: THREE.MeshStandardMaterial, night: { value: number }, lit: THREE.Color) {
  mat.onBeforeCompile = (s) => {
    s.uniforms.uNight = night;
    s.uniforms.uLit = { value: lit };
    Object.assign(s.uniforms, facadeU);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vW; varying vec3 vWN;')
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
         vW = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
         vWN = normalize(mat3(modelMatrix * instanceMatrix) * normal);`,
      );
    s.fragmentShader = s.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vW; varying vec3 vWN; uniform float uNight; uniform vec3 uLit;
         uniform sampler2D uFacA, uFacB; uniform float uUseFac;
         float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         if (abs(vWN.y) < 0.5) {
           float u = abs(vWN.x) > 0.5 ? vW.z : vW.x;
           if (uUseFac > 0.5) {
             // Photographed cladding, projected in world space so it never stretches.
             vec2 fuv = vec2(u, vW.y) * 0.09;
             float pick = step(0.5, h21(floor(vW.xz * 0.02 + 0.5)));
             vec3 tex = mix(texture2D(uFacA, fuv).rgb, texture2D(uFacB, fuv).rgb, pick);
             diffuseColor.rgb = tex * mix(vec3(1.0), diffuseColor.rgb * 1.3, 0.3);
           }
           vec2 cell = vec2(u * 0.55, vW.y * 0.3);
           vec2 f = fract(cell);
           float win = step(0.18, f.x) * step(f.x, 0.82) * step(0.25, f.y) * step(f.y, 0.8);
           float on = step(0.58, h21(floor(cell) + floor(vW.xz * 0.05)));
           diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.55, win);
           totalEmissiveRadiance += uLit * win * on * uNight * 0.75;
         }`,
      );
  };
}

/* ---- people: one InstancedMesh per body part ---- */
interface Crowd {
  group: THREE.Group;
  set(i: number, pos: V3, yaw: number, opts?: { sit?: boolean; walk?: number; nod?: number }): void;
  flush(): void;
}
function makeCrowd(n: number, shirts: THREE.Color[], skin: THREE.Color, legC: THREE.Color, rand: () => number, helmet?: THREE.Color): Crowd {
  const group = new THREE.Group();
  const torso = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.19, 0.42, 3, 8), new THREE.MeshStandardMaterial({ roughness: 0.8 }), n);
  const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 12, 10), new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 }), n);
  const legs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.5, 0.13).translate(0, -0.25, 0), new THREE.MeshStandardMaterial({ color: legC }), n * 2);
  const hat = helmet
    ? new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: helmet, roughness: 0.4 }), n)
    : null;
  for (let i = 0; i < n; i++) torso.setColorAt(i, shirts[Math.floor(rand() * shirts.length)]);
  [torso, head].forEach((m) => (m.castShadow = true));
  group.add(torso, head, legs);
  if (hat) group.add(hat);
  const m = new THREE.Matrix4();
  const t = new THREE.Matrix4();
  const base = new THREE.Object3D();
  const put = (mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, rx = 0) => {
    m.copy(base.matrix).multiply(t.makeTranslation(x, y, z));
    if (rx) m.multiply(t.makeRotationX(rx));
    mesh.setMatrixAt(i, m);
  };
  return {
    group,
    set(i, pos, yaw, o = {}) {
      base.position.copy(pos);
      base.rotation.set(0, yaw, 0);
      base.updateMatrix();
      const sit = o.sit ? 1 : 0;
      const swing = o.walk ? Math.sin(o.walk) * 0.6 : 0;
      const hip = 0.92 - sit * 0.42;
      put(torso, i, 0, hip + 0.42, 0);
      put(head, i, 0, hip + 0.86 + (o.nod ?? 0) * 0.02, (o.nod ?? 0) * 0.03);
      if (hat) put(hat, i, 0, hip + 0.9, 0);
      put(legs, i * 2, -0.09, hip, 0, sit ? -1.45 : swing);
      put(legs, i * 2 + 1, 0.09, hip, 0, sit ? -1.45 : -swing);
    },
    flush() {
      [torso, head, legs, hat].forEach((x) => x && (x.instanceMatrix.needsUpdate = true));
    },
  };
}

/* ======================================================================== */

export interface TowerHandle {
  stage: Stage;
  setTarget(c: number, jump?: boolean): void;
  setOccluded(o: boolean): void;
}

export function mount(host: HTMLElement, onFrame?: (c: number, p: Phases) => void, onAssets?: (done: number, total: number) => void): TowerHandle | null {
  const rand = rng(2027);
  const still = reducedMotion();
  const T = (n: string) => token(n);

  const C = {
    skyTop: T('--mh-sky-top'),
    skyHz: T('--mh-sky-horizon'),
    golden: T('--mh-sky-golden'),
    nightTop: T('--mh-sky-night-top'),
    nightHz: T('--mh-sky-night-hz'),
    bp: T('--stage'),
    bpLine: T('--scene-accent'),
    bpLine2: T('--scene-accent-2'),
    ground: T('--mh-ground'),
    grass: T('--mh-grass'),
    mud: T('--mh-mud'),
    dirt: T('--mh-dirt'),
    dirtDark: T('--mh-dirt-dark'),
    concrete: T('--mh-concrete'),
    steel: T('--mh-steel'),
    glass: T('--mh-glass'),
    fin: T('--mh-fin'),
    mullion: T('--mh-mullion'),
    machine: T('--mh-machine'),
    hivis: T('--mh-hivis'),
    crane: T('--mh-crane'),
    paving: T('--mh-paving'),
    stone: T('--mh-stone'),
    wood: T('--mh-wood'),
    walnut: T('--mh-walnut'),
    brass: T('--mh-brass'),
    fabric: T('--mh-fabric'),
    blazer: T('--mh-blazer'),
    hair: T('--mh-hair'),
    carpet: T('--mh-carpet'),
    warm: T('--mh-warm-light'),
    cool: T('--mh-cool-light'),
    red: T('--mh-red-light'),
    skin: T('--scene-skin'),
    white: T('--scene-white'),
    sun: T('--scene-sun'),
    water: T('--scene-water'),
    tree: T('--scene-tree'),
    tree2: T('--scene-tree-2'),
    trunk: T('--scene-trunk'),
    road: T('--scene-road'),
    line: T('--scene-road-line'),
    bldg: [1, 2, 3, 4].map((i) => T(`--scene-bldg-${i}`)),
    cars: [1, 2, 3, 4, 5].map((i) => T(`--scene-car-${i}`)),
    win: T('--scene-window'),
  };

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(C.skyHz.clone(), 260, 1100);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2500);
  const nightU = { value: 0 };

  /* ---------------- sky ---------------- */
  const skyU = {
    uTop: { value: C.skyTop.clone() },
    uHz: { value: C.skyHz.clone() },
    uSun: { value: V(0.4, 0.5, 0.6).normalize() },
    uSunC: { value: C.sun.clone() },
    // Real skies (set when the HDRIs arrive): day and sunset, each rotated so
    // its sun sits where the scene's sun is, blended to a starry gradient at night.
    uDay: { value: null as THREE.Texture | null },
    uSet: { value: null as THREE.Texture | null },
    uHdr: { value: 0 },
    uMix: { value: 0 },
    uRotDay: { value: 0 },
    uRotSet: { value: 0 },
    uExpo: { value: 1 },
    uGrad: { value: 1 },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1800, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: skyU,
      vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uTop, uHz, uSun, uSunC; uniform sampler2D uDay, uSet;
        uniform float uHdr, uMix, uRotDay, uRotSet, uExpo, uGrad; varying vec3 vD;
        vec2 eq(vec3 d, float rot){
          return vec2((atan(d.z, d.x) + rot) * 0.1591549 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.3183099 + 0.5);
        }
        void main(){
          float h = clamp(vD.y, 0.0, 1.0);
          vec3 col = mix(uHz, uTop, pow(h, 0.55));
          float s = max(dot(vD, uSun), 0.0);
          col += uSunC * (pow(s, 600.0) * 2.0 + pow(s, 12.0) * 0.25);
          if (uHdr > 0.5) {
            vec3 d = vec3(vD.x, max(vD.y, 0.02), vD.z);
            vec3 sky = mix(texture2D(uDay, eq(d, uRotDay)).rgb, texture2D(uSet, eq(d, uRotSet)).rgb, uMix) * uExpo;
            sky = min(sky, vec3(2.2)); // keep the sun from flooding the bloom and the reflections
            col = mix(sky, col, uGrad);
          }
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    }),
  );
  sky.renderOrder = -1;
  scene.add(sky);
  // The same sky, alone, is what the glass reflects (see updateEnv below).
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(sky.geometry, sky.material));

  // Night sky: stars and a moon.
  const starPos: number[] = [];
  const sr = rng(77);
  for (let i = 0; i < 1600; i++) {
    const u = sr() * Math.PI * 2;
    const v = 0.06 + sr() * 0.94;
    const r0 = Math.sqrt(1 - v * v);
    starPos.push(Math.cos(u) * r0 * 1650, v * 1650, Math.sin(u) * r0 * 1650);
  }
  const starMat = new THREE.PointsMaterial({ color: C.white, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, toneMapped: false, depthWrite: false });
  const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3)), starMat);
  scene.add(stars);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(11, 24, 16), new THREE.MeshBasicMaterial({ color: C.white, fog: false, transparent: true, opacity: 0 }));
  moon.position.set(-700, 520, -1200);
  scene.add(moon);

  /* ---------------- lights ---------------- */
  const hemi = new THREE.HemisphereLight(C.skyHz, C.ground, 1.2);
  const sun = new THREE.DirectionalLight(C.sun, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 400 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  sun.target.position.set(0, 10, 0);
  scene.add(hemi, sun, sun.target);
  const lobbyLight = new THREE.PointLight(C.warm, 0, 22, 1.6);
  lobbyLight.position.set(-1, 5.6, 7);
  const deskLight = new THREE.PointLight(C.warm, 0, 9, 1.8);
  deskLight.position.set(-4.5, 3.2, 8);
  const officeLight = new THREE.PointLight(C.cool, 0, 26, 1.4);
  officeLight.position.set(0, TOP_FLOOR + 3.4, 7);
  scene.add(lobbyLight, deskLight, officeLight);

  /* ================= VISION: the blueprint ================= */
  const bpGroup = new THREE.Group();
  scene.add(bpGroup);
  const paperTex = canvasTex(1024, 1024, (g) => {
    g.fillStyle = css('--stage');
    g.fillRect(0, 0, 1024, 1024);
    g.strokeStyle = 'rgba(160,210,255,0.10)';
    g.lineWidth = 1;
    for (let i = 0; i <= 1024; i += 16) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 1024); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(1024, i); g.stroke();
    }
    g.strokeStyle = 'rgba(160,210,255,0.22)';
    for (let i = 0; i <= 1024; i += 128) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 1024); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(1024, i); g.stroke();
    }
  });
  paperTex.wrapS = paperTex.wrapT = THREE.RepeatWrapping;
  paperTex.repeat.set(14, 14);
  const paperMat = new THREE.MeshBasicMaterial({ map: paperTex, transparent: true, fog: false, depthWrite: false });
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), paperMat);
  paper.rotation.x = -Math.PI / 2;
  paper.position.y = 0.25;
  paper.renderOrder = 1;
  bpGroup.add(paper);

  // The plan, as line segments, drawn progressively with drawRange.
  const planPts: number[] = [];
  const seg = (x0: number, z0: number, x1: number, z1: number) => planPts.push(x0, 0.32, z0, x1, 0.32, z1);
  const rect = (x0: number, z0: number, x1: number, z1: number) => {
    seg(x0, z0, x1, z0); seg(x1, z0, x1, z1); seg(x1, z1, x0, z1); seg(x0, z1, x0, z0);
  };
  rect(-40, -40, 40, 40); // site boundary
  rect(-HALF, -HALF, HALF, HALF); // building line
  rect(-HALF - 0.6, -HALF - 0.6, HALF + 0.6, HALF + 0.6);
  for (let k = -2; k <= 2; k++) {
    seg(k * 6.5, -HALF - 9, k * 6.5, HALF + 9); // structural grid
    seg(-HALF - 9, k * 6.5, HALF + 9, k * 6.5);
  }
  rect(-4, -6, 4, 2); // core
  seg(1.3, 2, 3.5, -0.2); seg(1.3, -0.2, 3.5, 2); // lift shaft cross
  // Curved reception desk and the entrance
  for (let i = 0; i < 16; i++) {
    const a0 = -Math.PI / 2 - 1.1 + (i / 16) * 2.2;
    const a1 = -Math.PI / 2 - 1.1 + ((i + 1) / 16) * 2.2;
    seg(-4.5 + Math.cos(a0) * 2.4, 6.4 - Math.sin(a0) * 2.4, -4.5 + Math.cos(a1) * 2.4, 6.4 - Math.sin(a1) * 2.4);
  }
  seg(-1.65, HALF, -1.65, HALF + 3); seg(1.65, HALF, 1.65, HALF + 3);
  rect(-5, HALF, 5, HALF + 3.5); // canopy
  rect(-6, 20, 6, 32); // pool
  // Dimension strings
  seg(-HALF, HALF + 6, HALF, HALF + 6);
  for (const x of [-HALF, HALF]) seg(x, HALF + 5.2, x, HALF + 6.8);
  seg(HALF + 6, -HALF, HALF + 6, HALF);
  for (const z of [-HALF, HALF]) seg(HALF + 5.2, z, HALF + 6.8, z);
  // North arrow
  seg(30, 30, 30, 22); seg(30, 22, 28.6, 24.6); seg(30, 22, 31.4, 24.6);
  const planGeo = new THREE.BufferGeometry();
  planGeo.setAttribute('position', new THREE.Float32BufferAttribute(planPts, 3));
  const planMat = new THREE.LineBasicMaterial({ color: C.bpLine, transparent: true, fog: false, toneMapped: false });
  const plan = new THREE.LineSegments(planGeo, planMat);
  plan.renderOrder = 2;
  bpGroup.add(plan);
  const planCount = planPts.length / 3;

  // Grid bubbles and labels on a canvas, laid on the paper.
  const labelTex = canvasTex(2048, 2048, (g) => {
    const S = 2048 / 100; // 100 m across
    const X = (x: number) => (x + 50) * S;
    g.strokeStyle = g.fillStyle = 'rgba(140,220,255,0.95)';
    g.lineWidth = 3;
    g.font = '600 26px ui-monospace, Menlo, monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    'ABCDE'.split('').forEach((l, i) => {
      const x = X((i - 2) * 6.5);
      g.beginPath(); g.arc(x, X(-HALF - 11), 22, 0, Math.PI * 2); g.stroke();
      g.fillText(l, x, X(-HALF - 11));
    });
    '12345'.split('').forEach((l, i) => {
      const z = X((i - 2) * 6.5);
      g.beginPath(); g.arc(X(-HALF - 11), z, 22, 0, Math.PI * 2); g.stroke();
      g.fillText(l, X(-HALF - 11), z);
    });
    g.font = '600 30px ui-monospace, Menlo, monospace';
    g.fillText('26 000', X(0), X(HALF + 7.6));
    g.save(); g.translate(X(HALF + 7.6), X(0)); g.rotate(-Math.PI / 2); g.fillText('26 000', 0, 0); g.restore();
    g.fillText('N', X(30), X(20.4));
    g.font = '500 24px ui-monospace, Menlo, monospace';
    g.fillText('CORE', X(0), X(-2));
    g.fillText('RECEPTION', X(-4.5), X(9.8));
    g.fillText('ENTRANCE', X(0), X(HALF + 4.4));
    g.fillText('REFLECTING POOL', X(0), X(26));
    g.textAlign = 'left';
    g.font = '700 34px ui-monospace, Menlo, monospace';
    g.fillText('MERIDIAN HOUSE', X(-40), X(43));
    g.font = '500 22px ui-monospace, Menlo, monospace';
    g.fillText('GA PLAN · LEVEL 00 · 1:200 · REV C', X(-40), X(45.6));
    g.fillText('16 STOREYS · 67.0 m · 10,816 m² NIA', X(-40), X(47.8));
  });
  const labels = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, fog: false, depthWrite: false, toneMapped: false }));
  labels.rotation.x = -Math.PI / 2;
  labels.position.y = 0.3;
  labels.renderOrder = 2;
  bpGroup.add(labels);

  // Wireframe massing: the building as drawn, floor by floor.
  const massMat = new THREE.LineBasicMaterial({ color: C.bpLine, transparent: true, fog: false, toneMapped: false });
  const massFloors: THREE.LineSegments[] = [];
  for (let f = 0; f < FLOORS; f++) {
    const h = floorY(f + 1) - floorY(f);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(HALF * 2, h, HALF * 2).translate(0, h / 2, 0)), massMat);
    e.position.y = floorY(f);
    e.renderOrder = 3;
    massFloors.push(e);
    scene.add(e);
  }
  const crownWire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(10, 4, 10)), massMat);
  crownWire.position.y = TOP + 2;
  scene.add(crownWire);
  // Mullion lines on the massing, so it reads as a facade, not a box.
  const facadePts: number[] = [];
  for (let i = 1; i < 8; i++) {
    const p = -HALF + (i * HALF * 2) / 8;
    for (const s of [-1, 1]) {
      facadePts.push(p, 0, s * HALF, p, TOP, s * HALF, s * HALF, 0, p, s * HALF, TOP, p);
    }
  }
  const facadeGeo = new THREE.BufferGeometry();
  facadeGeo.setAttribute('position', new THREE.Float32BufferAttribute(facadePts, 3));
  const facadeMat = new THREE.LineBasicMaterial({ color: C.bpLine2, transparent: true, opacity: 0.5, fog: false, toneMapped: false });
  const facadeLines = new THREE.LineSegments(facadeGeo, facadeMat);
  scene.add(facadeLines);

  /* ================= THE REAL WORLD ================= */
  const world = new THREE.Group();
  scene.add(world);

  const groundMat = new THREE.MeshStandardMaterial({ color: C.ground, roughness: 0.95 });
  world.add(groundShape(squareWithHole(1400, 40), groundMat, 0));
  const plotMat = new THREE.MeshStandardMaterial({ color: C.grass.clone(), roughness: 1 });
  world.add(groundShape(squareWithHole(40, PIT), plotMat, 0.005));

  // Ring road around the block, with dashes.
  const roadMat = new THREE.MeshStandardMaterial({ color: C.road, roughness: 0.9 });
  world.add(groundShape(squareWithHole(56, 46), roadMat, 0.02));
  for (const [x, z, w, d] of [
    [0, 230, 12, 360], [0, -230, 12, 360], [230, 0, 360, 12], [-230, 0, 360, 12],
  ]) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
    r.rotation.x = -Math.PI / 2;
    r.position.set(x, 0.02, z);
    r.receiveShadow = true;
    world.add(r);
  }
  const dashGeo = new THREE.PlaneGeometry(0.25, 2.2);
  dashGeo.rotateX(-Math.PI / 2);
  const dashes = new THREE.InstancedMesh(dashGeo, new THREE.MeshBasicMaterial({ color: C.line }), 200);
  let nd = 0;
  for (let i = -50; i <= 50; i += 5) {
    setInst(dashes, nd++, V(i, 0.03, 51));
    setInst(dashes, nd++, V(i, 0.03, -51));
    setInst(dashes, nd++, V(51, 0.03, i), V(1, 1, 1), Math.PI / 2);
    setInst(dashes, nd++, V(-51, 0.03, i), V(1, 1, 1), Math.PI / 2);
  }
  dashes.count = nd;
  world.add(dashes);

  // City: towers that grow out of the ground as the vision becomes real.
  const cityMat = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.15 });
  windowShader(cityMat, nightU, C.win);
  const cityGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const cityBlocks: { x: number; z: number; w: number; d: number; h: number; delay: number }[] = [];
  for (let gx = -11; gx <= 11; gx++)
    for (let gz = -11; gz <= 11; gz++) {
      const x = gx * 28 + (rand() - 0.5) * 6;
      const z = gz * 28 + (rand() - 0.5) * 6;
      const r = Math.hypot(x, z);
      if (Math.max(Math.abs(x), Math.abs(z)) < 70 || Math.abs(x) < 16 || Math.abs(z) < 16 || r > 330) continue;
      if (rand() < 0.15) continue;
      const near = 1 - Math.min(1, r / 330);
      cityBlocks.push({ x, z, w: 12 + rand() * 10, d: 12 + rand() * 10, h: 12 + rand() * 30 + near * near * rand() * 70, delay: r / 330 });
    }
  const city = new THREE.InstancedMesh(cityGeo, cityMat, cityBlocks.length);
  city.castShadow = city.receiveShadow = true;
  cityBlocks.forEach((b, i) => city.setColorAt(i, C.bldg[Math.floor(rand() * 4)].clone().multiplyScalar(0.85)));
  world.add(city);
  let cityGrown = -1;
  const growCity = (k: number) => {
    if (Math.abs(k - cityGrown) < 0.002) return;
    cityGrown = k;
    cityBlocks.forEach((b, i) => {
      const g = ss(k, b.delay * 0.6, b.delay * 0.6 + 0.4);
      setInst(city, i, V(b.x, 0, b.z), V(b.w, Math.max(0.001, b.h * g), b.d));
    });
    city.instanceMatrix.needsUpdate = true;
  };

  // City glow at night: street lamps as points.
  const lampPts: number[] = [];
  for (let i = -300; i <= 300; i += 9) {
    for (const o of [-7, 7]) {
      lampPts.push(i, 5, o, o, 5, i);
    }
  }
  for (let i = -56; i <= 56; i += 8) lampPts.push(i, 5, 57, i, 5, -57, 57, 5, i, -57, 5, i);
  const lampGeo = new THREE.BufferGeometry();
  lampGeo.setAttribute('position', new THREE.Float32BufferAttribute(lampPts, 3));
  const lampMat = new THREE.PointsMaterial({ color: C.warm, size: 3, sizeAttenuation: false, transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
  world.add(new THREE.Points(lampGeo, lampMat));

  // Street trees.
  const treeSpots: V3[] = [];
  for (let i = -38; i <= 38; i += 7) for (const s of [-43, 43]) treeSpots.push(V(i, 0, s), V(s, 0, i));
  const leafMat = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true });
  const trees = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.8, 0).translate(0, 4.2, 0), leafMat, treeSpots.length + 12);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.22, 3, 6).translate(0, 1.5, 0), new THREE.MeshStandardMaterial({ color: C.trunk }), treeSpots.length + 12);
  trees.castShadow = trunks.castShadow = true;
  treeSpots.forEach((p, i) => {
    const s = 0.8 + rand() * 0.5;
    setInst(trees, i, p, V(s, s, s), rand() * 6);
    setInst(trunks, i, p, V(s, s, s));
    trees.setColorAt(i, rand() < 0.5 ? C.tree : C.tree2);
  });
  world.add(trees, trunks);

  // Traffic on the ring road.
  const ring = new THREE.CatmullRomCurve3([V(-49, 0, -49), V(49, 0, -49), V(49, 0, 49), V(-49, 0, 49)], true, 'catmullrom', 0.02);
  const CARS = 18;
  const carBody = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.8, 4).translate(0, 0.65, 0), new THREE.MeshPhysicalMaterial({ roughness: 0.35, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.06 }), CARS);
  const carTop = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.6, 2).translate(0, 1.35, -0.3), new THREE.MeshStandardMaterial({ color: C.mullion, roughness: 0.2, metalness: 0.6 }), CARS);
  const headMat = new THREE.MeshBasicMaterial({ color: C.warm, toneMapped: false });
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.18, 0.1).translate(0, 0.75, 2.02), headMat, CARS);
  const tailMat = new THREE.MeshBasicMaterial({ color: C.red, toneMapped: false });
  const tails = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.18, 0.1).translate(0, 0.8, -2.02), tailMat, CARS);
  carBody.castShadow = true;
  for (let i = 0; i < CARS; i++) carBody.setColorAt(i, C.cars[i % 5]);
  world.add(carBody, carTop, heads, tails);
  const carU = Array.from({ length: CARS }, (_, i) => ({ u: i / CARS + rand() * 0.02, lane: i % 2 ? 2.2 : -2.2, v: 0.012 + rand() * 0.004 }));

  /* ---- the site: survey, hoarding, pit ---- */
  const site = new THREE.Group();
  world.add(site);
  const hoardTex = canvasTex(1024, 128, (g) => {
    g.fillStyle = css('--mh-blazer');
    g.fillRect(0, 0, 1024, 128);
    g.fillStyle = css('--mh-brass');
    g.fillRect(0, 112, 1024, 16);
    g.fillStyle = '#ffffff';
    g.font = '700 54px system-ui, sans-serif';
    g.fillText('MERIDIAN HOUSE', 40, 76);
    g.font = '500 30px system-ui, sans-serif';
    g.fillStyle = css('--mh-brass');
    g.fillText('ATELIER NORTH  ·  COMPLETING 2027', 560, 74);
  });
  const hoardMat = new THREE.MeshStandardMaterial({ map: hoardTex, roughness: 0.7 });
  const hoardPanels: { p: V3; ry: number }[] = [];
  for (let i = -36; i <= 36; i += 8) {
    hoardPanels.push({ p: V(i, 1.25, 38.5), ry: 0 }, { p: V(i, 1.25, -38.5), ry: Math.PI }, { p: V(38.5, 1.25, i), ry: Math.PI / 2 }, { p: V(-38.5, 1.25, i), ry: -Math.PI / 2 });
  }
  const gate = hoardPanels.findIndex((h) => h.p.x === 4 && h.p.z === 38.5);
  if (gate >= 0) hoardPanels.splice(gate, 1);
  const hoarding = new THREE.InstancedMesh(new THREE.BoxGeometry(8, 2.5, 0.15), hoardMat, hoardPanels.length);
  hoarding.castShadow = true;
  site.add(hoarding);
  const placeHoarding = (k: number) => {
    hoardPanels.forEach((h, i) => setInst(hoarding, i, V(h.p.x, h.p.y - (1 - k) * 2.6, h.p.z), V(1, 1, 1), h.ry));
    hoarding.instanceMatrix.needsUpdate = true;
  };

  // Survey stakes and string lines.
  const stakeMat = new THREE.MeshStandardMaterial({ color: C.hivis });
  const stakes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2, 5).translate(0, 0.6, 0), stakeMat, 12);
  const stakeSpots = [V(-HALF, 0, -HALF), V(HALF, 0, -HALF), V(HALF, 0, HALF), V(-HALF, 0, HALF), V(-PIT, 0, -PIT), V(PIT, 0, -PIT), V(PIT, 0, PIT), V(-PIT, 0, PIT), V(0, 0, -HALF), V(0, 0, HALF), V(-HALF, 0, 0), V(HALF, 0, 0)];
  site.add(stakes);
  const strings = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(HALF * 2, 0.001, HALF * 2)).translate(0, 1.0, 0),
    new THREE.LineBasicMaterial({ color: C.hivis, transparent: true }),
  );
  site.add(strings);
  const tripod = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const leg = box(0.06, 1.6, 0.06, stakeMat);
    leg.position.set(Math.cos((k * Math.PI * 2) / 3) * 0.35, 0.75, Math.sin((k * Math.PI * 2) / 3) * 0.35);
    leg.rotation.set(Math.sin((k * Math.PI * 2) / 3) * 0.25, 0, -Math.cos((k * Math.PI * 2) / 3) * 0.25);
    tripod.add(leg);
  }
  tripod.add(box(0.3, 0.35, 0.25, new THREE.MeshStandardMaterial({ color: C.machine }), 0, 1.65, 0));
  tripod.position.set(18, 0, 20);
  site.add(tripod);

  // The pit: a lid that sinks as the ground is dug, inside open walls.
  const lidMat = new THREE.MeshStandardMaterial({ color: C.grass.clone(), roughness: 1 });
  const lid = new THREE.Mesh(new THREE.BoxGeometry(PIT * 2, 0.4, PIT * 2).translate(0, -0.2, 0), lidMat);
  lid.receiveShadow = true;
  const pitWalls = new THREE.Mesh(
    new THREE.BoxGeometry(PIT * 2, 1, PIT * 2).translate(0, -0.5, 0),
    new THREE.MeshStandardMaterial({ color: C.dirt, roughness: 1, side: THREE.BackSide }),
  );
  pitWalls.receiveShadow = true;
  site.add(lid, pitWalls);
  // Spoil heap that grows as the pit deepens.
  const heap = new THREE.Mesh(new THREE.ConeGeometry(7, 4, 9), new THREE.MeshStandardMaterial({ color: C.dirtDark, roughness: 1, flatShading: true }));
  heap.position.set(-27, 0, -24);
  heap.castShadow = heap.receiveShadow = true;
  site.add(heap);

  /* ---- foundations ---- */
  const concreteMat = new THREE.MeshStandardMaterial({ color: C.concrete, roughness: 0.85 });
  const pileSpots: V3[] = [];
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) pileSpots.push(V(i * 3.9, -DEPTH, j * 3.9));
  const piles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.45, 0.45, 1, 10).translate(0, 0.5, 0), concreteMat, pileSpots.length);
  piles.castShadow = true;
  site.add(piles);
  const rebarMat = new THREE.MeshStandardMaterial({ color: C.hivis.clone().multiplyScalar(0.6), roughness: 0.6, metalness: 0.5 });
  const rebar = new THREE.InstancedMesh(new THREE.BoxGeometry(26, 0.06, 0.06), rebarMat, 54);
  for (let i = 0; i < 27; i++) {
    const o = -13 + i;
    setInst(rebar, i, V(0, -DEPTH + 0.9, o));
    setInst(rebar, 27 + i, V(o, -DEPTH + 0.95, 0), V(1, 1, 1), Math.PI / 2);
  }
  site.add(rebar);
  const raft = box(26, 1, 26, concreteMat, 0, -DEPTH + 0.5, 0);
  const basementWalls = box(26, 1, 26, concreteMat);
  site.add(raft, basementWalls);

  /* ---- machines ---- */
  const machineMat = new THREE.MeshStandardMaterial({ color: C.machine, roughness: 0.45, metalness: 0.2 });
  const darkMat = new THREE.MeshStandardMaterial({ color: C.mullion, roughness: 0.7 });
  const glassDark = new THREE.MeshStandardMaterial({ color: C.glass, roughness: 0.1, metalness: 0.6 });

  // Excavator: tracks, turning body, boom, stick, bucket.
  const excavator = new THREE.Group();
  excavator.add(box(3.4, 0.9, 4.4, darkMat, 0, 0.45, 0));
  const exBody = new THREE.Group();
  exBody.position.y = 0.9;
  exBody.add(box(3, 1.2, 3.2, machineMat, 0, 0.6, -0.4));
  exBody.add(box(1.4, 1.4, 1.5, glassDark, -0.7, 1.9, 0.4));
  const boom = new THREE.Group();
  boom.position.set(0.5, 1.2, 1.0);
  boom.add(box(0.5, 0.6, 4.4, machineMat, 0, 0, 2.2));
  const stick = new THREE.Group();
  stick.position.set(0, 0, 4.4);
  stick.add(box(0.4, 0.45, 3.2, machineMat, 0, 0, 1.6));
  const bucket = new THREE.Group();
  bucket.position.set(0, 0, 3.2);
  bucket.add(box(1.1, 0.8, 0.9, darkMat, 0, -0.2, 0.3));
  stick.add(bucket);
  boom.add(stick);
  exBody.add(boom);
  excavator.add(exBody);
  excavator.position.set(10, 0, PIT + 3.2);
  excavator.rotation.y = Math.PI;
  site.add(excavator);

  // Dump trucks on a loop through the site gate.
  const truckPath = new THREE.CatmullRomCurve3([V(4, 0, 48), V(4, 0, 30), V(14, 0, 21), V(24, 0, 10), V(24, 0, -12), V(10, 0, -22), V(-20, 0, -24), V(-26, 0, -10), V(-22, 0, 22), V(-4, 0, 30), V(-4, 0, 48), V(0, 0, 70)], false);
  const makeTruck = (bed: THREE.Color) => {
    const g = new THREE.Group();
    g.add(box(2.4, 0.8, 6, darkMat, 0, 0.8, 0));
    g.add(box(2.4, 1.6, 1.8, machineMat, 0, 1.8, 2.0));
    g.add(box(2.3, 0.6, 0.1, glassDark, 0, 2.2, 2.92));
    g.add(box(2.6, 1.3, 3.8, new THREE.MeshStandardMaterial({ color: bed, roughness: 0.6 }), 0, 1.85, -1.0));
    g.add(box(2.2, 0.5, 3.4, new THREE.MeshStandardMaterial({ color: C.dirt, roughness: 1, flatShading: true }), 0, 2.6, -1.0));
    return g;
  };
  const trucks = [makeTruck(C.hivis), makeTruck(C.steel)];
  trucks.forEach((t) => site.add(t));

  // Concrete mixers with turning drums.
  const mixers: THREE.Group[] = [];
  for (const [x, z, ry] of [[-19, 6, 0.2], [-19, -8, -0.3]] as const) {
    const g = new THREE.Group();
    g.add(box(2.4, 0.8, 7, darkMat, 0, 0.8, 0));
    g.add(box(2.4, 1.8, 1.8, new THREE.MeshStandardMaterial({ color: C.white }), 0, 1.9, 2.6));
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 4, 14).rotateX(Math.PI / 2 - 0.25), new THREE.MeshStandardMaterial({ color: C.hivis, roughness: 0.5, flatShading: true }));
    drum.position.set(0, 2.6, -1);
    drum.castShadow = true;
    g.add(drum);
    g.userData.drum = drum;
    const chute = box(0.4, 0.15, 4, darkMat, 0, 1.6, -4.5);
    chute.rotation.x = -0.35;
    g.add(chute);
    g.position.set(x, 0, z);
    g.rotation.y = Math.PI / 2 + ry;
    site.add(g);
    mixers.push(g);
  }

  // Piling rig in the pit.
  const rig = new THREE.Group();
  rig.add(box(3, 1, 4, darkMat, 0, 0.5, 0));
  rig.add(box(2.6, 1.6, 2.4, machineMat, 0, 1.8, -0.4));
  const mast = box(0.5, 14, 0.6, machineMat, 0, 8, 1.6);
  rig.add(mast);
  const auger = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 10, 8), darkMat);
  auger.position.set(0, 6, 2.1);
  rig.add(auger);
  site.add(rig);

  // Workers in hi-vis.
  const WORKERS = 16;
  const workers = makeCrowd(WORKERS, [C.hivis, C.machine], C.skin, C.mullion, rand, C.white);
  site.add(workers.group);
  const workerPlan = Array.from({ length: WORKERS }, (_, i) => ({
    a: rand() * Math.PI * 2,
    r: 16 + rand() * 6,
    v: (rand() < 0.5 ? -1 : 1) * (0.05 + rand() * 0.05),
    inPit: i < 6,
    px: (rand() - 0.5) * 20,
    pz: (rand() - 0.5) * 20,
    pause: rand() * 10,
  }));

  /* ================= THE BUILDING ================= */
  const building = new THREE.Group();
  world.add(building);
  const steelMat = new THREE.MeshStandardMaterial({ color: C.steel, roughness: 0.5, metalness: 0.6 });

  // Slabs with a hole for the core shaft, so the glass lift can rise through them.
  const slabS = new THREE.Shape();
  slabS.moveTo(-HALF, -HALF).lineTo(HALF, -HALF).lineTo(HALF, HALF).lineTo(-HALF, HALF).lineTo(-HALF, -HALF);
  const slabHole = new THREE.Path();
  slabHole.moveTo(1.2, -0.3).lineTo(3.6, -0.3).lineTo(3.6, 2.2).lineTo(1.2, 2.2).lineTo(1.2, -0.3);
  slabS.holes.push(slabHole);
  const slabGeo = new THREE.ExtrudeGeometry(slabS, { depth: 0.4, bevelEnabled: false });
  slabGeo.rotateX(Math.PI / 2); // extrude goes down from y=0
  const slabs = new THREE.InstancedMesh(slabGeo, concreteMat, FLOORS);
  slabs.castShadow = slabs.receiveShadow = true;
  building.add(slabs);

  const colSpots: [number, number][] = [];
  for (const a of [-2, -1, 0, 1, 2]) for (const b of [-2, 2]) colSpots.push([a * 6.5, b * 6.5], [b * 6.5, a * 6.5]);
  const uniqueCols = colSpots.filter((p, i) => colSpots.findIndex((q) => q[0] === p[0] && q[1] === p[1]) === i);
  uniqueCols.push([-6.5, -6.5], [6.5, -6.5]);
  const COLS = uniqueCols.length;
  const columns = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 1, 0.6).translate(0, 0.5, 0), steelMat, COLS * FLOORS);
  columns.castShadow = true;
  building.add(columns);
  const beams = new THREE.InstancedMesh(new THREE.BoxGeometry(HALF * 2, 0.5, 0.35), steelMat, 4 * FLOORS);
  beams.castShadow = true;
  building.add(beams);

  // Core: four walls, the front split around the lift shaft opening.
  const coreGroup = new THREE.Group();
  const coreParts = [
    box(8, 1, 0.4, concreteMat, 0, 0, -5.8),
    box(0.4, 1, 8, concreteMat, -3.8, 0, -2),
    box(0.4, 1, 8, concreteMat, 3.8, 0, -2),
    box(5.2, 1, 0.4, concreteMat, -1.4, 0, 1.8),
    box(0.5, 1, 0.4, concreteMat, 3.75, 0, 1.8),
  ];
  coreParts.forEach((p) => {
    p.geometry.translate(0, 0.5, 0);
    coreGroup.add(p);
  });
  coreGroup.position.y = -DEPTH + 1;
  building.add(coreGroup);
  const lintelG = box(2.4, H0 - 3 - 0.4, 0.4, concreteMat, LIFT_X, 3 + (H0 - 3 - 0.4) / 2, 1.8);
  const lintelT = box(2.4, FH - 3 - 0.4, 0.4, concreteMat, LIFT_X, TOP_FLOOR + 3 + (FH - 3 - 0.4) / 2, 1.8);
  building.add(lintelG, lintelT);

  // Curtain wall: glass, mullions, spandrels.
  const envMat = new THREE.MeshStandardMaterial({ color: C.glass, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.6, side: THREE.DoubleSide, envMapIntensity: 0.95 });
  type Panel = { p: V3; ry: number; h: number; f: number; k: number };
  const panels: Panel[] = [];
  const W = (HALF * 2) / 8;
  for (let f = 0; f < FLOORS; f++) {
    const y0 = floorY(f);
    const h = floorY(f + 1) - y0 - 0.5;
    for (let s = 0; s < 4; s++) {
      for (let k = 0; k < 8; k++) {
        const o = -HALF + W / 2 + k * W;
        if (f === 0 && s === 0 && (k === 3 || k === 4)) continue; // entrance
        const ry = [0, Math.PI, Math.PI / 2, -Math.PI / 2][s];
        const p = s === 0 ? V(o, y0 + h / 2 + 0.05, HALF + 0.35) : s === 1 ? V(o, y0 + h / 2 + 0.05, -HALF - 0.35) : s === 2 ? V(HALF + 0.35, y0 + h / 2 + 0.05, o) : V(-HALF - 0.35, y0 + h / 2 + 0.05, o);
        panels.push({ p, ry, h, f, k });
      }
    }
  }
  const glassPanels = new THREE.InstancedMesh(new THREE.PlaneGeometry(W - 0.12, 1), envMat, panels.length);
  building.add(glassPanels);
  const mullMat = new THREE.MeshStandardMaterial({ color: C.mullion, roughness: 0.4, metalness: 0.7 });
  // Vertical aluminium fins at every panel joint: the facade's rhythm.
  const finMat = new THREE.MeshStandardMaterial({ color: C.fin, roughness: 0.28, metalness: 0.85 });
  const mullions = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 1, 0.75), finMat, panels.length);
  mullions.castShadow = true;
  building.add(mullions);
  const spandrels = new THREE.InstancedMesh(new THREE.BoxGeometry(HALF * 2 + 1.4, 0.32, 0.5), finMat, FLOORS * 4);
  spandrels.castShadow = true;
  building.add(spandrels);

  // Ceiling light panels: every floor glows at night.
  const ceilMat = new THREE.MeshBasicMaterial({ color: C.cool.clone() });
  const ceilGeo = new THREE.ShapeGeometry(slabS).rotateX(Math.PI / 2);
  ceilGeo.scale(0.96, 1, 0.96);
  const ceilings = new THREE.InstancedMesh(ceilGeo, ceilMat, FLOORS);
  const floorWarmth: number[] = [];
  for (let f = 0; f < FLOORS; f++) {
    setInst(ceilings, f, V(0, floorY(f + 1) - 0.42, 0));
    const w = f === 0 ? 1 : 0.55 + rand() * 0.5;
    floorWarmth.push(w);
    ceilings.setColorAt(f, (f === 0 ? C.warm : C.cool).clone().multiplyScalar(w));
  }
  building.add(ceilings);

  // Crown: plant room, glass parapet, spire, sign.
  const crown = new THREE.Group();
  crown.add(box(10, 4, 10, mullMat, 0, TOP + 2, 0));
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.4, 14, 8), steelMat);
  spire.position.y = TOP + 11;
  crown.add(spire);
  const tipMat = new THREE.MeshBasicMaterial({ color: C.red, toneMapped: false });
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), tipMat);
  tip.position.y = TOP + 18.2;
  crown.add(tip);
  const bandMat = new THREE.MeshBasicMaterial({ color: C.bpLine.clone(), toneMapped: false });
  // A lit ring around the roof edge.
  for (const [w, d, x, z] of [[HALF * 2 + 1, 0.3, 0, HALF + 0.35], [HALF * 2 + 1, 0.3, 0, -HALF - 0.35], [0.3, HALF * 2 + 1, HALF + 0.35, 0], [0.3, HALF * 2 + 1, -HALF - 0.35, 0]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, d), bandMat);
    b.position.set(x, TOP + 0.2, z);
    crown.add(b);
  }
  const signTex = canvasTex(1024, 160, (g) => {
    g.fillStyle = '#ffffff';
    g.font = '600 104px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('M E R I D I A N', 512, 84);
  });
  const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true, toneMapped: false, color: C.white.clone() });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(12, 1.9), signMat);
  sign.position.set(0, TOP + 2, 5.02);
  crown.add(sign);
  building.add(crown);

  // Entrance: canopy, sidelights, sliding doors.
  const entrance = new THREE.Group();
  const canopy = box(10, 0.3, 4, mullMat, 0, 4.4, HALF + 2.2);
  entrance.add(canopy);
  const downMat = new THREE.MeshBasicMaterial({ color: C.warm, toneMapped: false });
  for (const x of [-3.5, -1.2, 1.2, 3.5]) {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.22, 12).rotateX(Math.PI / 2), downMat);
    d.position.set(x, 4.24, HALF + 2.2);
    entrance.add(d);
  }
  const doorL = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 3.2), envMat);
  const doorR = doorL.clone();
  doorL.position.set(-0.81, 1.6, HALF + 0.35);
  doorR.position.set(0.81, 1.6, HALF + 0.35);
  entrance.add(doorL, doorR, box(3.4, 0.25, 0.3, mullMat, 0, 3.3, HALF + 0.35));
  for (const x of [-2.45, 2.45]) {
    const sl = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.2), envMat);
    sl.position.set(x, 1.6, HALF + 0.35);
    entrance.add(sl, box(1.6, H0 - 3.8, 0.3, mullMat, x, 3.3 + (H0 - 3.8) / 2, HALF + 0.35));
  }
  building.add(entrance);

  /* ---- plaza ---- */
  const plaza = new THREE.Group();
  world.add(plaza);
  const pavTex = canvasTex(512, 512, (g) => {
    g.fillStyle = css('--mh-paving');
    g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(0,0,0,0.10)';
    g.lineWidth = 2;
    for (let i = 0; i <= 512; i += 64) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke();
      g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke();
    }
  });
  pavTex.wrapS = pavTex.wrapT = THREE.RepeatWrapping;
  pavTex.repeat.set(20, 20);
  const plazaMat = new THREE.MeshStandardMaterial({ map: pavTex, roughness: 0.75, transparent: true });
  plaza.add(groundShape(squareWithHole(40, HALF), plazaMat, 0.04));
  const pool = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 12), new THREE.MeshStandardMaterial({ color: C.water.clone().multiplyScalar(0.4), roughness: 0.02, metalness: 1, envMapIntensity: 1.6 }));
  pool.position.set(0, 0.1, 26);
  plaza.add(pool);
  const poolEdge = box(12.6, 0.35, 12.6, new THREE.MeshStandardMaterial({ color: C.stone }), 0, 0.05, 26);
  plaza.add(poolEdge);
  const bollardMat = new THREE.MeshBasicMaterial({ color: C.warm.clone(), toneMapped: false });
  const bollards = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.9, 8).translate(0, 0.45, 0), bollardMat, 16);
  for (let i = 0; i < 8; i++) {
    setInst(bollards, i, V(-3.6, 0, 16 + i * 2.6));
    setInst(bollards, 8 + i, V(3.6, 0, 16 + i * 2.6));
  }
  plaza.add(bollards);
  const plazaTreeSpots = [V(-14, 0, 20), V(14, 0, 20), V(-22, 0, 30), V(22, 0, 30), V(-20, 0, 8), V(20, 0, 8), V(-28, 0, 18), V(28, 0, 18), V(-20, 0, -18), V(20, 0, -18), V(-10, 0, 33), V(10, 0, 33)];
  const plazaTrees0 = treeSpots.length;

  // Visitors arriving across the plaza at dusk.
  const VISITORS = 10;
  const visitors = makeCrowd(VISITORS, [C.blazer, C.fabric, C.cars[0], C.walnut, C.cars[4]], C.skin, C.mullion, rand);
  plaza.add(visitors.group);

  /* ---- crane ---- */
  const latticeTex = canvasTex(128, 128, (g) => {
    g.strokeStyle = css('--mh-crane');
    g.lineWidth = 10;
    g.strokeRect(5, 5, 118, 118);
    g.lineWidth = 7;
    g.beginPath(); g.moveTo(5, 5); g.lineTo(123, 123); g.moveTo(123, 5); g.lineTo(5, 123); g.stroke();
  });
  latticeTex.wrapS = latticeTex.wrapT = THREE.RepeatWrapping;
  const latticeMat = new THREE.MeshStandardMaterial({ map: latticeTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6 });
  const crane = new THREE.Group();
  crane.position.set(19, 0, -9);
  const mastGeo = new THREE.BoxGeometry(2.2, 1, 2.2).translate(0, 0.5, 0);
  const craneMast = new THREE.Mesh(mastGeo, latticeMat.clone());
  craneMast.castShadow = true;
  crane.add(craneMast);
  const slew = new THREE.Group();
  crane.add(slew);
  const jibMat = latticeMat.clone();
  jibMat.map = latticeTex.clone();
  jibMat.map.repeat.set(18, 1);
  const jib = new THREE.Mesh(new THREE.BoxGeometry(40, 1.8, 1.8), jibMat);
  jib.position.set(-18, 1.5, 0);
  jib.castShadow = true;
  const cjib = new THREE.Mesh(new THREE.BoxGeometry(12, 1.4, 1.8), jibMat);
  cjib.position.set(7, 1.3, 0);
  const cweight = box(3, 2.4, 2.4, concreteMat, 11, 0.4, 0);
  const cab = box(2, 2, 2, machineMat, 0, 0, 1.6);
  const apex = new THREE.Mesh(new THREE.ConeGeometry(1.3, 6, 4), latticeMat);
  apex.position.y = 5;
  const warn = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), tipMat);
  warn.position.y = 8.2;
  slew.add(jib, cjib, cweight, cab, apex, warn);
  const trolley = box(1.4, 0.5, 1.6, darkMat);
  slew.add(trolley);
  const cableGeo = new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, -1, 0)]);
  const cable = new THREE.Line(cableGeo, new THREE.LineBasicMaterial({ color: C.mullion }));
  slew.add(cable);
  const load = box(7, 0.5, 0.4, steelMat);
  slew.add(load);
  world.add(crane);

  /* ================= FOYER ================= */
  const foyer = new THREE.Group();
  building.add(foyer);
  const stoneTex = canvasTex(1024, 1024, (g) => {
    g.fillStyle = css('--mh-stone');
    g.fillRect(0, 0, 1024, 1024);
    const r2 = rng(5);
    g.strokeStyle = css('--mh-stone-vein');
    for (let i = 0; i < 40; i++) {
      g.lineWidth = 0.5 + r2() * 2;
      g.globalAlpha = 0.25 + r2() * 0.4;
      g.beginPath();
      let x = r2() * 1024;
      let y = r2() * 1024;
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (r2() - 0.3) * 160;
        y += (r2() - 0.5) * 120;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.globalAlpha = 1;
    g.strokeStyle = 'rgba(0,0,0,0.12)';
    g.lineWidth = 2;
    g.strokeRect(0, 0, 512, 512); g.strokeRect(512, 0, 512, 512); g.strokeRect(0, 512, 512, 512); g.strokeRect(512, 512, 512, 512);
  });
  stoneTex.wrapS = stoneTex.wrapT = THREE.RepeatWrapping;
  stoneTex.repeat.set(6, 6);
  const floorStone = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 - 0.4, HALF * 2 - 0.4).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.12, metalness: 0.05, envMapIntensity: 1.2 }));
  floorStone.position.y = 0.06;
  floorStone.receiveShadow = true;
  foyer.add(floorStone);

  // Timber slat feature wall with a backlit name.
  const woodMat = new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.6 });
  const slats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, H0 - 0.5, 0.14).translate(0, (H0 - 0.5) / 2, 0), woodMat, 46);
  for (let i = 0; i < 46; i++) setInst(slats, i, V(-3.95 + i * 0.115, 0, 2.1));
  foyer.add(slats);
  const nameTex = canvasTex(1024, 256, (g) => {
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '300 120px system-ui, sans-serif';
    g.fillText('MERIDIAN', 512, 110);
    g.font = '500 40px system-ui, sans-serif';
    g.fillText('H  O  U  S  E', 512, 200);
  });
  const nameSign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), new THREE.MeshBasicMaterial({ map: nameTex, transparent: true, toneMapped: false, color: C.warm.clone().multiplyScalar(1.6) }));
  nameSign.position.set(-1.4, 4.4, 2.26);
  foyer.add(nameSign);

  // Curved reception desk.
  const arcShape = (r0: number, r1: number, span: number) => {
    const s = new THREE.Shape();
    const a0 = -Math.PI / 2 - span / 2;
    const a1 = -Math.PI / 2 + span / 2;
    s.absarc(0, 0, r1, a0, a1, false);
    s.absarc(0, 0, r0, a1, a0, true);
    return s;
  };
  const deskAt = V(-4.5, 0, 6.4);
  const deskBody = new THREE.Mesh(new THREE.ExtrudeGeometry(arcShape(1.85, 2.35, 2.3), { depth: 1.05, bevelEnabled: false, curveSegments: 40 }).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: C.stone, roughness: 0.25 }));
  deskBody.geometry.translate(0, 1.1, 0);
  deskBody.position.copy(deskAt);
  deskBody.rotation.y = Math.PI;
  deskBody.castShadow = deskBody.receiveShadow = true;
  const deskTop = new THREE.Mesh(new THREE.ExtrudeGeometry(arcShape(1.7, 2.5, 2.4), { depth: 0.07, bevelEnabled: false, curveSegments: 40 }).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: C.walnut, roughness: 0.35 }));
  deskTop.geometry.translate(0, 1.17, 0);
  deskTop.position.copy(deskAt);
  deskTop.rotation.y = Math.PI;
  const ledMat = new THREE.MeshBasicMaterial({ color: C.warm.clone().multiplyScalar(2), toneMapped: false });
  const deskLed = new THREE.Mesh(new THREE.ExtrudeGeometry(arcShape(2.36, 2.4, 2.28), { depth: 0.04, bevelEnabled: false, curveSegments: 40 }).rotateX(Math.PI / 2), ledMat);
  deskLed.geometry.translate(0, 0.12, 0);
  deskLed.position.copy(deskAt);
  deskLed.rotation.y = Math.PI;
  foyer.add(deskBody, deskTop, deskLed);
  const monitor = box(0.7, 0.42, 0.04, darkMat, deskAt.x - 1.15, 1.45, deskAt.z + 1.0);
  monitor.rotation.y = Math.PI - 0.6;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.36), new THREE.MeshBasicMaterial({ color: C.cool, toneMapped: false }));
  screen.position.set(0, 0, -0.025);
  screen.rotation.y = Math.PI;
  monitor.add(screen);
  foyer.add(monitor);

  // The receptionist.
  const rec = new THREE.Group();
  const blazer = new THREE.MeshStandardMaterial({ color: C.blazer, roughness: 0.7 });
  const skinMat = new THREE.MeshStandardMaterial({ color: C.skin, roughness: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: C.hair, roughness: 0.8 });
  const recBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.5, 4, 12), blazer);
  recBody.position.y = 1.2;
  recBody.castShadow = true;
  const shirt = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.3), new THREE.MeshStandardMaterial({ color: C.white }));
  shirt.position.set(0, 1.38, 0.2);
  const recHead = new THREE.Group();
  recHead.position.y = 1.66;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 14), skinMat);
  face.scale.set(0.92, 1.08, 0.98);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.142, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58), hairMat);
  hair.position.set(0, 0.02, -0.012);
  const bun = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), hairMat);
  bun.position.set(0, 0.1, -0.12);
  const eyeMat = new THREE.MeshBasicMaterial({ color: C.mullion });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), eyeMat);
  const eyeR = eyeL.clone();
  eyeL.position.set(-0.045, 0.02, 0.118);
  eyeR.position.set(0.045, 0.02, 0.118);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 6, 12, Math.PI), eyeMat);
  smile.position.set(0, -0.045, 0.118);
  smile.rotation.z = Math.PI;
  recHead.add(face, hair, bun, eyeL, eyeR, smile);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 8), skinMat);
  neck.position.y = 1.55;
  const arm = (side: number) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.27, 1.43, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.24, 3, 8), blazer);
    upper.position.y = -0.15;
    const elbow = new THREE.Group();
    elbow.position.y = -0.3;
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.22, 3, 8), blazer);
    fore.position.y = -0.13;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), skinMat);
    hand.position.y = -0.29;
    elbow.add(fore, hand);
    shoulder.add(upper, elbow);
    rec.add(shoulder);
    return { shoulder, elbow };
  };
  const armL = arm(-1);
  const armR = arm(1);
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.03), new THREE.MeshBasicMaterial({ color: C.brass }));
  badge.position.set(0.11, 1.36, 0.21);
  rec.add(recBody, shirt, neck, recHead, badge);
  rec.position.set(deskAt.x, 0, deskAt.z + 0.3);
  foyer.add(rec);

  // Chandelier: a cloud of glowing globes over the foyer.
  const GLOBES = 64;
  const globeMat = new THREE.MeshBasicMaterial({ color: C.warm.clone().multiplyScalar(2.2), toneMapped: false });
  const globes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 12, 10), globeMat, GLOBES);
  const cordPts: number[] = [];
  for (let i = 0; i < GLOBES; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 3.4;
    const x = -0.5 + Math.cos(a) * r;
    const z = 8 + Math.sin(a) * r;
    const y = 3.4 + rand() * 2.6;
    setInst(globes, i, V(x, y, z));
    cordPts.push(x, y, z, x, H0 - 0.42, z);
  }
  const cords = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(cordPts, 3)), new THREE.LineBasicMaterial({ color: C.brass, transparent: true, opacity: 0.6 }));
  foyer.add(globes, cords);

  // Lounge: sofas, table, rug, plants.
  const fabricMat = new THREE.MeshStandardMaterial({ color: C.fabric, roughness: 0.9 });
  const sofa = (x: number, z: number, ry: number) => {
    const g = new THREE.Group();
    g.add(box(2.4, 0.42, 0.9, fabricMat, 0, 0.21, 0), box(2.4, 0.5, 0.2, fabricMat, 0, 0.6, -0.36), box(0.18, 0.3, 0.9, fabricMat, -1.15, 0.5, 0), box(0.18, 0.3, 0.9, fabricMat, 1.15, 0.5, 0));
    g.position.set(x, 0.06, z);
    g.rotation.y = ry;
    foyer.add(g);
    standIns.push(g);
  };
  const standIns: THREE.Object3D[] = [];
  sofa(8, 6.5, 0);
  sofa(8, 10.5, Math.PI);
  sofa(10.6, 8.5, -Math.PI / 2);
  const table = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.4, 24), new THREE.MeshStandardMaterial({ color: C.walnut, roughness: 0.3 }));
  table.position.set(8, 0.26, 8.5);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(5, 5.4).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: C.carpet, roughness: 1 }));
  rug.position.set(8.4, 0.07, 8.5);
  foyer.add(table, rug);
  standIns.push(table);
  const potMat = new THREE.MeshStandardMaterial({ color: C.mullion, roughness: 0.5 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: C.tree, roughness: 0.9, flatShading: true });
  const plant = (parent: THREE.Group, x: number, y: number, z: number, s = 1) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 0.7, 14).translate(0, 0.35, 0), potMat));
    const f1 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), foliageMat);
    f1.position.y = 1.3;
    f1.scale.set(1, 1.4, 1);
    const f2 = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 1), foliageMat);
    f2.position.set(0.25, 1.9, 0.1);
    g.add(f1, f2);
    g.traverse((o) => (o.castShadow = true));
    g.position.set(x, y, z);
    g.scale.setScalar(s);
    parent.add(g);
    plantSpots.push({ parent, g, s });
  };
  const plantSpots: { parent: THREE.Group; g: THREE.Group; s: number }[] = [];
  [[-11.5, 11.5], [11.5, 11.5], [-11.5, 3.5], [11.5, 3.5], [-7.6, 3], [5.2, 3]].forEach(([x, z]) => plant(foyer, x, 0.06, z, 1.3));
  plant(foyer, 11, 0.06, -9, 2.2);
  plant(foyer, -11, 0.06, -9, 2.2);

  // Speed gates and the lift landing.
  const gateMat = new THREE.MeshStandardMaterial({ color: C.stone, roughness: 0.3 });
  for (const x of [0.8, 4.0]) foyer.add(box(0.25, 1.0, 1.6, gateMat, x, 0.56, 4.2));
  const brassMat = new THREE.MeshStandardMaterial({ color: C.brass, roughness: 0.22, metalness: 1 });
  const landing = (y: number) => {
    const l = box(1.1, 3, 0.06, brassMat, 0, y + 1.5, 2.06);
    const r = box(1.1, 3, 0.06, brassMat, 0, y + 1.5, 2.06);
    building.add(l, r);
    return { l, r };
  };
  const doorsG = landing(0);
  const doorsT = landing(TOP_FLOOR);
  const indicatorTex = (txt: string) =>
    canvasTex(256, 96, (g) => {
      g.fillStyle = css('--mh-walnut');
      g.fillRect(0, 0, 256, 96);
      g.fillStyle = css('--mh-warm-light');
      g.font = '600 64px ui-monospace, Menlo, monospace';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(txt, 128, 52);
    });
  const indG = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.22), new THREE.MeshBasicMaterial({ map: indicatorTex('▲ G'), toneMapped: false }));
  indG.position.set(LIFT_X, 3.45, 2.08);
  foyer.add(indG);

  // People in the foyer: visitors crossing and a couple waiting by the lifts.
  const FOYER_PEOPLE = 6;
  const foyerCrowd = makeCrowd(FOYER_PEOPLE, [C.blazer, C.walnut, C.fabric, C.steel], C.skin, C.mullion, rand);
  foyer.add(foyerCrowd.group);

  /* ================= LIFT CAR ================= */
  const car = new THREE.Group();
  const carFloor = box(2.2, 0.1, 2.3, new THREE.MeshStandardMaterial({ color: C.walnut, roughness: 0.4 }), LIFT_X, 0.05, 0.85);
  const mirror = new THREE.MeshStandardMaterial({ color: C.white, roughness: 0.03, metalness: 1, envMapIntensity: 1.5 });
  const carBack = box(2.2, 2.9, 0.06, mirror, LIFT_X, 1.5, -0.25);
  const carSideMat = new THREE.MeshStandardMaterial({ color: C.walnut, roughness: 0.45 });
  const carL = box(0.06, 2.9, 2.3, carSideMat, LIFT_X - 1.08, 1.5, 0.85);
  const carR = box(0.06, 2.9, 2.3, carSideMat, LIFT_X + 1.08, 1.5, 0.85);
  const carCeil = box(2.2, 0.08, 2.3, darkMat, LIFT_X, 2.98, 0.85);
  const carLight = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: C.warm.clone().multiplyScalar(1.5), toneMapped: false }));
  carLight.position.set(LIFT_X, 2.93, 0.85);
  const rail = box(1.8, 0.05, 0.05, brassMat, LIFT_X, 0.95, -0.15);
  const carDoorL = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.9), envMat);
  const carDoorR = carDoorL.clone();
  car.add(carFloor, carBack, carL, carR, carCeil, carLight, rail, carDoorL, carDoorR);
  building.add(car);
  const carIndTex = canvasTex(256, 96, () => {});
  const carInd = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.19), new THREE.MeshBasicMaterial({ map: carIndTex, toneMapped: false }));
  carInd.position.set(LIFT_X + 1.04, 2.3, 1.2);
  carInd.rotation.y = -Math.PI / 2;
  car.add(carInd);
  let lastFloorShown = -1;
  const paintCarInd = (f: number) => {
    if (f === lastFloorShown) return;
    lastFloorShown = f;
    const g = (carIndTex.image as HTMLCanvasElement).getContext('2d')!;
    g.fillStyle = css('--mh-walnut');
    g.fillRect(0, 0, 256, 96);
    g.fillStyle = css('--mh-warm-light');
    g.font = '600 60px ui-monospace, Menlo, monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(f === 0 ? 'G' : String(f).padStart(2, '0'), 128, 52);
    carIndTex.needsUpdate = true;
  };
  paintCarInd(0);

  /* ================= LEVEL 16: OCCUPATION ================= */
  const office = new THREE.Group();
  building.add(office);
  const carpet = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 - 0.4, HALF * 2 - 0.4).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: C.carpet, roughness: 1 }));
  carpet.position.y = TOP_FLOOR + 0.05;
  carpet.receiveShadow = true;
  office.add(carpet);
  type Desk = { x: number; z: number; ry: number };
  const desks: Desk[] = [];
  for (const side of [-1, 1]) {
    for (let row = 0; row < 3; row++) {
      for (let k = 0; k < 4; k++) {
        const x = side * (5.6 + (k % 2) * 1.7 + (k > 1 ? 3.6 : 0));
        const z = -9 + row * 7 + (k % 2 ? 0 : 0);
        desks.push({ x, z: z - 0.5, ry: 0 }, { x, z: z + 0.5, ry: Math.PI });
      }
    }
  }
  // Keep desks out of the lift's walkway and the window lounge.
  const deskList = desks.filter((d) => !(Math.abs(d.x) < 4.5 && d.z > -7) && !(d.x < -4 && d.z > 9));
  const deskTopMat = new THREE.MeshStandardMaterial({ color: C.stone, roughness: 0.4 });
  const deskTops = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.05, 0.9), deskTopMat, deskList.length);
  const deskLegs = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 0.72, 0.04), darkMat, deskList.length);
  const screens = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.38, 0.03), new THREE.MeshBasicMaterial({ color: C.cool.clone().multiplyScalar(1.1), toneMapped: false }), deskList.length);
  const chairs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.9, 0.55).translate(0, 0.45, 0), new THREE.MeshStandardMaterial({ color: C.mullion, roughness: 0.6 }), deskList.length);
  deskList.forEach((d, i) => {
    const y = TOP_FLOOR + 0.05;
    const f = V(Math.sin(d.ry), 0, Math.cos(d.ry)); // facing
    setInst(deskTops, i, V(d.x, y + 0.74, d.z), V(1, 1, 1), d.ry);
    setInst(deskLegs, i, V(d.x - f.x * 0.4, y + 0.37, d.z - f.z * 0.4), V(1, 1, 1), d.ry);
    setInst(screens, i, V(d.x - f.x * 0.25, y + 1.0, d.z - f.z * 0.25), V(1, 1, 1), d.ry);
    setInst(chairs, i, V(d.x + f.x * 0.7, y, d.z + f.z * 0.7), V(1, 0.5, 1), d.ry);
  });
  deskTops.castShadow = true;
  office.add(deskTops, deskLegs, screens, chairs);
  // Linear pendants over each desk run.
  const pendMat = new THREE.MeshBasicMaterial({ color: C.cool.clone().multiplyScalar(1.8), toneMapped: false });
  const pendants = new THREE.InstancedMesh(new THREE.BoxGeometry(5, 0.06, 0.18), pendMat, 12);
  let np = 0;
  for (const side of [-1, 1]) for (let row = 0; row < 3; row++) for (const off of [0, 3.6]) setInst(pendants, np++, V(side * (6.4 + off), TOP_FLOOR + 3.1, -9 + row * 7));
  office.add(pendants);
  // Window lounge.
  sofaOffice();
  function sofaOffice() {
    const g = new THREE.Group();
    g.add(box(3.2, 0.42, 0.9, fabricMat, 0, 0.21, 0), box(3.2, 0.5, 0.2, fabricMat, 0, 0.6, -0.36));
    g.position.set(-8, TOP_FLOOR + 0.05, 10.6);
    office.add(g);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 20), new THREE.MeshStandardMaterial({ color: C.walnut }));
    t.position.set(-8, TOP_FLOOR + 0.25, 11.9);
    office.add(t);
  }
  [[-11.5, 11.5], [11.5, 11.5], [-11.5, -11.5], [11.5, -11.5], [5, 11.5], [-4.8, 3]].forEach(([x, z]) => plant(office, x, TOP_FLOOR + 0.05, z, 1.2));
  // Occupants: seated at desks, a few in conversation, two at the window.
  const seated = deskList.filter((_, i) => i % 3 !== 2);
  const OCC = seated.length + 6;
  const occupants = makeCrowd(OCC, [C.blazer, C.cars[2], C.fabric, C.white, C.walnut, C.cars[4]], C.skin, C.mullion, rand);
  office.add(occupants.group);
  const occPlan = seated.map((d) => {
    const f = V(Math.sin(d.ry), 0, Math.cos(d.ry));
    return { p: V(d.x + f.x * 0.72, TOP_FLOOR + 0.05, d.z + f.z * 0.72), yaw: d.ry + Math.PI, sit: true, phase: rand() * 6 };
  });
  occPlan.push(
    { p: V(4.6, TOP_FLOOR + 0.05, 9.4), yaw: 0.6, sit: false, phase: 0 },
    { p: V(5.5, TOP_FLOOR + 0.05, 10.1), yaw: Math.PI + 0.6, sit: false, phase: 1 },
    { p: V(-3.6, TOP_FLOOR + 0.05, 12.2), yaw: 0, sit: false, phase: 2 },
    { p: V(-9.0, TOP_FLOOR + 0.05, 10.6), yaw: Math.PI, sit: true, phase: 3 },
    { p: V(-7.0, TOP_FLOOR + 0.05, 10.6), yaw: Math.PI, sit: true, phase: 4 },
    { p: V(9.0, TOP_FLOOR + 0.05, -1.0), yaw: Math.PI / 2, sit: false, phase: 5 },
  );

  // Plaza trees use the same instanced forest; add them now (shown with the plaza).
  plazaTreeSpots.forEach((p, i) => {
    setInst(trees, plazaTrees0 + i, p, V(0.001, 0.001, 0.001));
    setInst(trunks, plazaTrees0 + i, p, V(0.001, 0.001, 0.001));
    trees.setColorAt(plazaTrees0 + i, C.tree2);
  });

  /* ================= frame-by-frame state ================= */
  const posCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => k[1]), false, 'centripetal');
  const tgtCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => k[2]), false, 'centripetal');
  const camPos = new THREE.Vector3();
  const camTgt = new THREE.Vector3();
  const evalCamera = (c: number) => {
    const cc = Math.min(Math.max(c, KEYS[0][0]), KEYS[KEYS.length - 1][0]);
    let i = 0;
    while (i < KEYS.length - 2 && cc > KEYS[i + 1][0]) i++;
    const t = (cc - KEYS[i][0]) / (KEYS[i + 1][0] - KEYS[i][0]);
    const u = (i + t) / (KEYS.length - 1);
    posCurve.getPoint(u, camPos);
    tgtCurve.getPoint(u, camTgt);
    const e = t * t * (3 - 2 * t);
    return lerp(KEYS[i][3], KEYS[i + 1][3], e);
  };
  let fovBoost = 1; // portrait screens need a wider lens to hold the same shot

  const skyTmp = new THREE.Color();
  const tmpC = new THREE.Color();
  let target = 0;
  let current = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  const applyStructure = (P: Phases) => {
    // Pit
    const depth = DEPTH * P.dig;
    const lidY = P.backfill > 0 ? lerp(-DEPTH + 1, 0, P.backfill) : -depth;
    lid.position.y = lidY;
    lid.visible = P.basement < 1 || P.backfill > 0;
    lidMat.color.copy(C.grass).lerp(C.dirtDark, ss(P.dig, 0, 0.15));
    pitWalls.scale.y = Math.max(0.001, P.backfill > 0 ? -lidY : depth);
    pitWalls.visible = depth > 0.01 && P.backfill < 1;
    heap.scale.setScalar(Math.max(0.001, P.dig * (1 - P.backfill)));
    plotMat.color.copy(C.grass).lerp(C.mud, P.mud);
    // Foundations
    pileSpots.forEach((p, i) => {
      const k = clamp01(P.piles * 1.5 - (i / pileSpots.length) * 0.5);
      setInst(piles, i, p, V(1, Math.max(0.001, k * 1.2), 1));
    });
    piles.instanceMatrix.needsUpdate = true;
    piles.visible = P.piles > 0 && P.basement < 1;
    rebar.visible = P.rebar > 0 && P.pour < 1;
    rebar.scale.set(1, 1, 1);
    raft.visible = P.pour > 0;
    raft.scale.y = Math.max(0.001, P.pour);
    raft.position.y = -DEPTH + P.pour / 2;
    basementWalls.visible = P.basement > 0;
    const bh = (DEPTH - 1) * P.basement;
    basementWalls.scale.y = Math.max(0.001, bh);
    basementWalls.position.y = -DEPTH + 1 + bh / 2;
    // Core leads the frame.
    const coreTop = -DEPTH + 1 + (TOP + DEPTH - 1 + 4) * P.core;
    coreGroup.scale.y = Math.max(0.001, coreTop - (-DEPTH + 1));
    coreGroup.visible = P.core > 0;
    lintelG.visible = P.core > 0.15;
    lintelT.visible = P.core > 0.95;
    // Frame, floor by floor.
    const built = P.frame * FLOORS;
    let ci = 0;
    for (let f = 0; f < FLOORS; f++) {
      const local = clamp01(built - f);
      const h = floorY(f + 1) - floorY(f);
      const colK = ss(local, 0, 0.5);
      for (const [x, z] of uniqueCols) setInst(columns, ci++, V(x, floorY(f), z), V(1, Math.max(0.001, h * colK), 1));
      const bk = ss(local, 0.35, 0.7);
      const by = floorY(f + 1) - 0.25;
      const bs = V(Math.max(0.001, bk), 1, 1);
      setInst(beams, f * 4, V(0, by, HALF), bs);
      setInst(beams, f * 4 + 1, V(0, by, -HALF), bs);
      setInst(beams, f * 4 + 2, V(HALF, by, 0), bs, Math.PI / 2);
      setInst(beams, f * 4 + 3, V(-HALF, by, 0), bs, Math.PI / 2);
      const sk = ss(local, 0.55, 1);
      const sxz = sk > 0 ? 0.9 + sk * 0.1 : 0.0001;
      setInst(slabs, f, V(0, floorY(f + 1), 0), V(sxz, Math.max(0.0001, sk), sxz));
    }
    columns.instanceMatrix.needsUpdate = beams.instanceMatrix.needsUpdate = slabs.instanceMatrix.needsUpdate = true;
    columns.visible = beams.visible = slabs.visible = P.frame > 0;
    // Glass, floor by floor, panel by panel.
    const glazed = P.glass * FLOORS;
    panels.forEach((pn, i) => {
      const local = clamp01((glazed - pn.f) * 1.4 - (pn.k / 8) * 0.4);
      const k = ss(local, 0, 1);
      dummy.position.copy(pn.p);
      dummy.position.y += (1 - k) * 2.5;
      dummy.rotation.set(0, pn.ry, 0);
      dummy.scale.set(Math.max(0.001, k), pn.h, 1);
      dummy.updateMatrix();
      glassPanels.setMatrixAt(i, dummy.matrix);
      dummy.scale.set(1, pn.h * Math.max(0.001, k), 1);
      dummy.position.copy(pn.p);
      dummy.position.y = pn.p.y - pn.h / 2 + (pn.h * k) / 2;
      // Fin at the panel's edge, standing proud of the glass.
      const nx = Math.sin(pn.ry);
      const nz = Math.cos(pn.ry);
      dummy.position.x += nz * (W / 2) + nx * 0.32;
      dummy.position.z += -nx * (W / 2) + nz * 0.32;
      dummy.updateMatrix();
      mullions.setMatrixAt(i, dummy.matrix);
    });
    glassPanels.instanceMatrix.needsUpdate = mullions.instanceMatrix.needsUpdate = true;
    for (let f = 0; f < FLOORS; f++) {
      const k = ss(clamp01(glazed - f), 0, 1);
      const y = floorY(f + 1) - 0.2;
      const s = V(Math.max(0.001, k), 1, 1);
      setInst(spandrels, f * 4, V(0, y, HALF + 0.4), s);
      setInst(spandrels, f * 4 + 1, V(0, y, -HALF - 0.4), s);
      setInst(spandrels, f * 4 + 2, V(HALF + 0.4, y, 0), s, Math.PI / 2);
      setInst(spandrels, f * 4 + 3, V(-HALF - 0.4, y, 0), s, Math.PI / 2);
    }
    spandrels.instanceMatrix.needsUpdate = true;
    glassPanels.visible = mullions.visible = spandrels.visible = P.glass > 0;
    crown.visible = P.glass > 0.92;
    entrance.visible = P.glass > 0.05;
    ceilings.visible = P.glass > 0.3;
    foyer.visible = office.visible = car.visible = P.interiors > 0;
  };

  /** Sky, fog and sun angle for a moment in the story. Also used to pre-bake reflections. */
  const skyAt = (c: number, P: Phases) => {
    const n = P.night;
    const golden = Math.sin(Math.PI * clamp01(n * 1.25)) * (1 - ss(n, 0.7, 1));
    skyTmp.copy(C.skyTop).lerp(C.nightTop, n);
    skyU.uTop.value.copy(C.bp).lerp(skyTmp, P.world);
    tmpC.copy(C.skyHz).lerp(C.golden, golden).lerp(C.nightHz, ss(n, 0.55, 1));
    skyU.uHz.value.copy(C.bp).lerp(tmpC, P.world);
    (scene.fog as THREE.Fog).color.copy(skyU.uHz.value);
    if (A && P.world > 0.5) (scene.fog as THREE.Fog).color.copy(A.dayHz).lerp(A.setHz, ss(n, 0.12, 0.5)).lerp(C.nightHz, ss(n, 0.6, 0.92));
    const az = lerp(-0.5, 2.3, ss(c, 1, 6.6)); // the sun sweeps the site through the build
    let elev = lerp(0.85, -0.08, n);
    if (A) {
      // Light comes from where the photographed sun is, so shadows match the sky.
      const mix = ss(n, 0.12, 0.5);
      elev = lerp(A.dayElev, A.setElev, mix) - ss(n, 0.62, 0.9) * 0.2;
      skyU.uHdr.value = 1;
      skyU.uMix.value = mix;
      skyU.uRotDay.value = A.dayAz - az;
      skyU.uRotSet.value = A.setAz - az;
      skyU.uExpo.value = lerp(0.95, 0.4, ss(n, 0.05, 0.7));
      skyU.uGrad.value = Math.max(1 - P.world, ss(n, 0.6, 0.92));
    }
    return { n, golden, az, elev };
  };

  let lastStructC = -1;
  let frameNo = 0;
  const update = (dt: number, t: number) => {
    // Ease the story clock towards the scroll position: a camera on rails with weight.
    current = still ? target : current + (target - current) * (1 - Math.exp(-dt * 5));
    const c = current;
    const P = phases(c);
    const at = still ? 0 : t; // ambient time; frozen for reduced motion

    // Vision → world
    const bpK = 1 - P.world;
    paperMat.opacity = bpK;
    paper.visible = bpK > 0.001;
    planGeo.setDrawRange(0, Math.floor(planCount * P.plan / 2) * 2);
    planMat.opacity = 0.18 + bpK * 0.82;
    labels.material.opacity = P.plan * (0.25 + bpK * 0.75);
    labels.visible = bpK > 0.01;
    plan.visible = P.ghost > 0.01 || bpK > 0.01;
    massFloors.forEach((m, f) => {
      const k = clamp01(P.mass * FLOORS - f);
      m.scale.set(1, Math.max(0.001, k), 1);
      m.visible = k > 0 && (bpK > 0.01 || P.ghost > 0.01);
    });
    massMat.opacity = Math.max(bpK, P.ghost * 0.45);
    crownWire.visible = P.mass > 0.98 && massFloors[0].visible;
    facadeLines.visible = P.mass > 0.98 && (bpK > 0.01 || P.ghost > 0.01);
    facadeMat.opacity = Math.max(bpK * 0.5, P.ghost * 0.22) * ss(P.mass, 0.9, 1);
    world.visible = P.world > 0.001;
    growCity(P.world);

    // Sky and light through the day.
    const { n, golden, az, elev } = skyAt(c, P);
    sun.position.set(Math.cos(az) * 150 * Math.cos(elev), Math.sin(Math.max(elev, 0.03)) * 150, Math.sin(az) * 150 * Math.cos(elev));
    skyU.uSun.value.copy(sun.position).normalize();
    skyU.uSunC.value.copy(C.sun).lerp(C.golden, golden).multiplyScalar(1 - ss(n, 0.75, 0.95));
    sun.color.copy(C.sun).lerp(C.golden, golden * 0.8);
    sun.intensity = lerp(2.3, 0.04, ss(n, 0.4, 0.95)) * P.world;
    hemi.intensity = lerp(1.25, 0.32, n) * (0.3 + 0.7 * P.world);
    hemi.color.copy(tmpC);
    nightU.value = ss(n, 0.45, 0.85);
    starMat.opacity = nightU.value * P.world;
    (moon.material as THREE.MeshBasicMaterial).opacity = nightU.value * P.world;
    updateEnv?.(c, n, P.world);
    if (finish) finish.uniforms.uTime.value = at;
    if (st) st.renderer.toneMappingExposure = (A ? 1.15 : 1) * lerp(1.0, 0.85, Math.sin(Math.PI * clamp01(n * 1.3)));
    scene.environmentIntensity = lerp(A ? 1.0 : 0.6, 0.16, n);
    envMat.emissive.copy(C.warm).multiplyScalar(nightU.value * 0.22);
    lampMat.opacity = nightU.value;
    headMat.color.copy(C.warm).multiplyScalar(0.3 + nightU.value * 2);
    tailMat.color.copy(C.red).multiplyScalar(0.3 + nightU.value * 1.6);
    const inside0 = ss(c, 7.4, 7.9) * (1 - ss(c, 11.0, 11.4));
    ceilMat.color.setScalar((0.35 + nightU.value * 0.55) * (1 - inside0 * 0.45));
    bandMat.color.copy(C.bpLine).multiplyScalar(0.2 + nightU.value * 2.2);
    signMat.color.copy(C.white).multiplyScalar(0.5 + nightU.value * 1.8);
    bollardMat.color.copy(C.warm).multiplyScalar(0.25 + nightU.value * 1.1);
    downMat.color.copy(C.warm).multiplyScalar(0.3 + nightU.value * 2.5);
    const inside = ss(c, 7.4, 7.9) * (1 - ss(c, 11.0, 11.4));
    lobbyLight.intensity = (nightU.value * 3 + inside * 5) * (c < 9.6 ? 1 : 0.2);
    deskLight.intensity = inside * 2.5 * (c < 9.6 ? 1 : 0);
    officeLight.intensity = ss(c, 9.6, 10.1) * 6 + nightU.value * 2;
    tipMat.color.copy(C.red).multiplyScalar(Math.sin(at * 3) > 0 ? 2.2 : 0.4);

    const structDirty = Math.abs(c - lastStructC) > 1e-4;
    if (structDirty) {
      lastStructC = c;
      applyStructure(P);
    }
    // Shadows: every frame on high, every other frame elsewhere.
    frameNo++;
    if (st) st.renderer.shadowMap.needsUpdate = st.quality === 'high' || frameNo % 2 === 0 || dt === 0;

    // Site dressing
    site.visible = P.world > 0.01 && c < 6.6;
    stakes.visible = strings.visible = tripod.visible = P.stakes > 0.01;
    stakeSpots.forEach((p, i) => setInst(stakes, i, p, V(1, Math.max(0.001, clamp01(P.stakes * 2 - i / 12)), 1)));
    stakes.instanceMatrix.needsUpdate = true;
    (strings.material as THREE.LineBasicMaterial).opacity = P.stakes;
    placeHoarding(Math.min(ss(c, 1.2, 1.6), P.hoarding));
    hoarding.visible = P.world > 0.5 && P.hoarding > 0;

    // Excavator digs: body swings between the pit and the spoil heap.
    const exOn = ss(c, 1.8, 2.0) * (1 - ss(c, 3.0, 3.2));
    excavator.visible = exOn > 0.01;
    excavator.position.y = (1 - exOn) * -3;
    const cyc = at * 0.9;
    exBody.rotation.y = Math.sin(cyc) * 1.0;
    boom.rotation.x = 0.35 + Math.sin(cyc + 0.8) * 0.25 + P.dig * 0.15;
    stick.rotation.x = 0.7 + Math.sin(cyc + 1.6) * 0.35;
    bucket.rotation.x = 0.4 + Math.sin(cyc + 2.4) * 0.6;
    // Trucks run the haul route.
    const trOn = ss(c, 1.9, 2.1) * (1 - ss(c, 3.1, 3.3));
    trucks.forEach((tr, i) => {
      tr.visible = trOn > 0.01;
      const u = ((at * 0.035 + i * 0.5) % 1 + 1) % 1;
      const p = truckPath.getPointAt(u);
      const tg = truckPath.getTangentAt(u);
      tr.position.copy(p);
      tr.rotation.y = Math.atan2(tg.x, tg.z);
    });
    const mixOn = ss(c, 3.2, 3.35) * (1 - ss(c, 3.9, 4.05));
    mixers.forEach((m, i) => {
      m.visible = mixOn > 0.01;
      m.position.y = (1 - mixOn) * -4;
      (m.userData.drum as THREE.Mesh).rotation.z = at * (1.5 + i * 0.3);
    });
    const rigOn = ss(c, 2.85, 2.95) * (1 - ss(c, 3.3, 3.4));
    rig.visible = rigOn > 0.01;
    const pi = Math.min(pileSpots.length - 1, Math.floor(P.piles * pileSpots.length));
    rig.position.set(pileSpots[pi].x - 0.2, -DEPTH, pileSpots[pi].z - 2.1);
    auger.rotation.y = at * 8;
    auger.position.y = 6 + Math.sin(at * 2) * 1.5;

    // Workers walk the site edges, or work in the pit during foundations.
    const wOn = P.world > 0.5 && c > 1.3 && c < 6.0;
    workers.group.visible = wOn;
    if (wOn) {
      workerPlan.forEach((w, i) => {
        let p: V3;
        let yaw: number;
        let walk = 0;
        if (w.inPit && c > 2.85 && c < 3.9) {
          p = V(w.px + Math.sin(at * 0.3 + i) * 2, -DEPTH + (P.pour > 0.5 ? 1 : 0), w.pz);
          yaw = at * 0.2 + i;
          walk = at * 4 + i;
        } else if (c > 4.1 && i % 2 === 0) {
          // Up on the frame.
          const f = Math.min(FLOORS - 1, Math.floor(P.frame * FLOORS) - 1 - (i % 4));
          p = V(Math.sin(at * 0.2 + i) * 9, floorY(Math.max(f, 1)), Math.cos(at * 0.17 + i * 2) * 9);
          yaw = at * 0.2 + i;
          walk = at * 4;
        } else {
          const a = w.a + at * w.v;
          p = V(Math.cos(a) * w.r, 0, Math.sin(a) * w.r);
          yaw = a + (w.v > 0 ? 0 : Math.PI);
          walk = at * 5 + i;
        }
        workers.set(i, p, yaw, { walk });
      });
      workers.flush();
    }

    // Crane: climbs with the building, slews, trolleys, lifts steel.
    crane.visible = P.crane > 0.01 && P.world > 0.5;
    const builtTop = floorY(Math.ceil(P.frame * FLOORS));
    const mastH = Math.max(32, builtTop + 14) * Math.max(0.001, P.crane);
    craneMast.scale.y = mastH;
    (craneMast.material as THREE.MeshStandardMaterial).map!.repeat.set(1, mastH / 2.2);
    slew.position.y = mastH;
    slew.rotation.y = Math.sin(at * 0.18) * 0.9 + 0.3;
    const tx = -8 - (Math.sin(at * 0.25) * 0.5 + 0.5) * 20;
    trolley.position.set(tx, 0.4, 0);
    const hookY = -((Math.sin(at * 0.4) * 0.5 + 0.5) * (mastH - builtTop - 3)) - 3;
    cableGeo.setFromPoints([V(tx, 0.2, 0), V(tx, hookY, 0)]);
    load.position.set(tx, hookY - 0.3, 0);
    load.visible = P.frame < 1;

    // Traffic
    carU.forEach((cu, i) => {
      cu.u = (cu.u + (still ? 0 : dt * cu.v)) % 1;
      const p = ring.getPointAt(cu.u);
      const tg = ring.getTangentAt(cu.u);
      const side = V(-tg.z, 0, tg.x).multiplyScalar(cu.lane);
      const yaw = Math.atan2(tg.x, tg.z) + (cu.lane < 0 ? Math.PI : 0);
      const pos = p.add(side);
      setInst(carBody, i, pos, V(1, 1, 1), yaw);
      setInst(carTop, i, pos, V(1, 1, 1), yaw);
      setInst(heads, i, pos, V(1, 1, 1), yaw);
      setInst(tails, i, pos, V(1, 1, 1), yaw);
    });
    carBody.instanceMatrix.needsUpdate = carTop.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = tails.instanceMatrix.needsUpdate = true;

    // Plaza
    plaza.visible = P.plaza > 0.001;
    plazaMat.opacity = P.plaza;
    plazaMat.transparent = P.plaza < 1;
    plazaTreeSpots.forEach((p, i) => {
      const s = Math.max(0.001, clamp01(P.plaza * 1.6 - i / 20)) * 1.1;
      setInst(trees, plazaTrees0 + i, p, V(s, s, s));
      setInst(trunks, plazaTrees0 + i, p, V(s, s, s));
    });
    trees.instanceMatrix.needsUpdate = trunks.instanceMatrix.needsUpdate = true;
    if (P.plaza > 0) {
      for (let i = 0; i < VISITORS; i++) {
        const lane = i % 2 ? 1.6 : -1.6;
        const u = ((at * 0.02 + i / VISITORS) % 1);
        const z = lerp(40, HALF + 1, u);
        visitors.set(i, V(lane + Math.sin(i * 7) * 0.6, 0.04, z), Math.PI, { walk: at * 5 + i });
      }
      visitors.flush();
    }

    // Entrance doors slide
    const eo = P.entrance;
    doorL.position.x = -0.81 - eo * 1.55;
    doorR.position.x = 0.81 + eo * 1.55;

    // Lift: doors, car position, indicator.
    const carY = c < 9.3 ? 0 : c > 10.1 ? TOP_FLOOR : THREE.MathUtils.clamp(camera.position.y - 1.7, 0, TOP_FLOOR);
    car.position.y = carY;
    const gO = P.liftGround;
    const tO = P.liftTop;
    doorsG.l.position.x = LIFT_X - 0.55 - gO * 1.05;
    doorsG.r.position.x = LIFT_X + 0.55 + gO * 1.05;
    doorsT.l.position.x = LIFT_X - 0.55 - tO * 1.05;
    doorsT.r.position.x = LIFT_X + 0.55 + tO * 1.05;
    const cO = c < 9.6 ? gO : tO;
    carDoorL.position.set(LIFT_X - 0.5 - cO * 0.95, 1.5, 1.98);
    carDoorR.position.set(LIFT_X + 0.5 + cO * 0.95, 1.5, 1.98);
    paintCarInd(Math.max(0, Math.min(FLOORS, Math.round(carY < 1 ? 0 : 1 + (carY - H0) / FH))));

    // Receptionist: types, looks up and waves, then points to the lifts.
    const gW = P.greet;
    const pW = P.point;
    const type = Math.sin(at * 14) * 0.08;
    armL.shoulder.rotation.set(-0.9 * (1 - gW) - 0.2 * gW, 0, -gW * 2.6);
    armL.elbow.rotation.set(-1.0 * (1 - gW) + type * (1 - gW), 0, -gW * (0.3 + Math.sin(at * 9) * 0.45));
    armR.shoulder.rotation.set(-0.9 * (1 - pW), 0, pW * 1.35);
    armR.elbow.rotation.set(-1.0 * (1 - pW) - type * (1 - pW), 0, pW * 0.1);
    const lookCam = Math.atan2(camera.position.x - rec.position.x, camera.position.z - rec.position.z);
    const yawHead = THREE.MathUtils.clamp(lookCam, -1.1, 1.1) * gW * (1 - pW) + pW * 0.9;
    recHead.rotation.set((1 - Math.max(gW, pW)) * 0.35 + Math.sin(at * 0.7) * 0.02, yawHead, 0);
    rec.rotation.y = pW * 0.5;
    recBody.scale.y = 1 + Math.sin(at * 1.6) * 0.01;

    // Foyer people
    if (foyer.visible) {
      for (let i = 0; i < FOYER_PEOPLE; i++) {
        if (i < 2) {
          foyerCrowd.set(i, V(4.8 + i * 0.7, 0.06, 4.6 + i * 0.3), Math.PI + 0.4 - i * 1.4, { nod: Math.sin(at * 2 + i) });
        } else {
          const u = ((at * 0.03 + i * 0.27) % 1);
          const z = lerp(12, 4.8, u);
          const x = lerp(i % 2 ? 5.4 : 6.6, 3.4, u * u);
          foyerCrowd.set(i, V(x, 0.06, z), Math.PI, { walk: at * 5 + i });
        }
      }
      foyerCrowd.flush();
    }
    // Office people
    if (office.visible) {
      occPlan.forEach((o, i) => occupants.set(i, o.p, o.yaw, { sit: o.sit, nod: Math.sin(at * (o.sit ? 3 : 1.5) + o.phase) }));
      occupants.flush();
    }

    // Camera on rails, with a little pointer parallax.
    const fov = evalCamera(c) * fovBoost;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;
    const interior = ss(c, 7.5, 7.9) * (1 - ss(c, 10.9, 11.2));
    const par = lerp(2.5, 0.25, interior);
    // Operated camera: a slow drone sway outside, a steadicam breath inside.
    const amp = lerp(0.12, 0.022, interior);
    camera.position.set(
      camPos.x + (Math.sin(at * 0.71) * 0.6 + Math.sin(at * 1.93) * 0.4) * amp,
      camPos.y + (Math.sin(at * 0.97 + 1.3) * 0.6 + Math.sin(at * 2.41) * 0.3) * amp,
      camPos.z + Math.sin(at * 0.53 + 2.1) * amp,
    );
    const focusDist = camPos.distanceTo(camTgt);
    camTgt.x += pointer.x * par * 2;
    camTgt.y -= pointer.y * par;
    camera.lookAt(camTgt);
    camera.rotateZ(Math.sin(at * 0.43) * lerp(0.0015, 0.004, interior));
    if (bokeh) {
      // Focus pulls with the subject; the aperture opens up indoors.
      (bokeh.uniforms as Record<string, { value: number }>).focus.value = focusDist;
      const dofK = ss(c, 7.5, 7.9) * (1 - ss(c, 10.35, 10.65));
      (bokeh.uniforms as Record<string, { value: number }>).aperture.value = lerp(0.00001, 0.0011, dofK);
    }
    assetFrame?.(dt, at, c, P);

    onFrame?.(c, P);
  };

  /* ---- renderer + bloom ---- */
  let composer: EffectComposer | null = null;
  let finish: ShaderPass | null = null;
  let updateEnv: ((c: number, n: number, w: number) => void) | null = null;
  let bloom: UnrealBloomPass | null = null;
  let bokeh: BokehPass | null = null;
  let A: null | { dayAz: number; dayElev: number; setAz: number; setElev: number; dayHz: THREE.Color; setHz: THREE.Color } = null;
  let assetFrame: ((dt: number, at: number, c: number, P: Phases) => void) | null = null;
  let st: Stage | null = null;
  const made = createStage({
    host,
    scene,
    camera,
    update,
    shadows: true,
    adaptBelow: 30,
    render: () => (composer && bloom?.enabled ? composer.render() : st?.renderer.render(scene, camera)),
    onResize: (w, h) => {
      fovBoost = w / h < 0.8 ? 1.45 : 1;
      composer?.setSize(w, h);
    },
    onQuality: (q) => {
      if (bloom) bloom.enabled = q !== 'low';
      if (bokeh) bokeh.enabled = q === 'high';
      sun.shadow.mapSize.setScalar(q === 'high' ? 2048 : 1024);
      sun.shadow.map?.dispose();
      sun.shadow.map = null;
      if (composer && st) composer.setPixelRatio(st.renderer.getPixelRatio());
    },
  });
  if (!made) return null;
  st = made;
  const stage = made;
  // Reduced motion pauses the ambient loop; the story still follows scroll.
  const pmrem = new THREE.PMREMGenerator(stage.renderer);
  // Outside, the glass reflects the real sky of the moment; inside, a soft room.
  const roomEnv = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  // Reflections are baked once per sky state and cached, never re-rendered mid-scroll.
  const envCache = new Map<string, THREE.Texture>();
  let envKey = '';
  const envKeyOf = (c: number, n: number, w: number) =>
    c > 7.45 && c < 11.05 ? 'in' : `${A ? 1 : 0}|${Math.round(n * 10)}|${Math.round(w * 3)}`;
  updateEnv = (c, n, w) => {
    const key = envKeyOf(c, n, w);
    if (key === envKey) return;
    envKey = key;
    if (key === 'in') {
      scene.environment = roomEnv;
      return;
    }
    const t = envCache.get(key);
    if (!t) {
      // Not baked yet: keep the current reflections and bake this one when idle.
      envKey = '';
      if (!scene.environment || scene.environment === roomEnv) {
        const any = envCache.values().next().value;
        if (any) scene.environment = any;
      }
      warmEnv();
      return;
    }
    scene.environment = t;
  };
  // Compile every material up front (off the main thread where the browser allows),
  // so nothing stalls the first time a chapter brings new objects into view.
  const precompile = () => {
    const hidden: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (!o.visible) {
        hidden.push(o);
        o.visible = true;
      }
    });
    // Upload every texture too (canvas textures included), not on first sight.
    scene.traverse((o) => {
      const mats = (o as THREE.Mesh).material;
      (Array.isArray(mats) ? mats : mats ? [mats] : []).forEach((m) =>
        Object.values(m).forEach((v) => (v as THREE.Texture)?.isTexture && stage.renderer.initTexture(v as THREE.Texture)),
      );
    });
    const done = stage.renderer.compileAsync(scene, camera).catch(() => {});
    hidden.forEach((o) => (o.visible = false));
    return done.then(() => warmRender());
  };
  // One hidden render with everything visible and nothing culled builds every real
  // program variant (shadow and depth passes, skinning, instancing, both reflection
  // setups). It costs one slow frame, taken while the reader is not scrolling.
  const warmTarget = new THREE.WebGLRenderTarget(64, 64, { type: THREE.HalfFloatType });
  const warmRender = () =>
    new Promise<void>((resolve) => {
      const go = () => {
        if (performance.now() - lastMove < 600) return void setTimeout(go, 300);
        const r = stage.renderer;
        const flipped: THREE.Object3D[] = [];
        const culled: THREE.Object3D[] = [];
        scene.traverse((o) => {
          if (!o.visible) {
            flipped.push(o);
            o.visible = true;
          }
          if (o.frustumCulled) {
            culled.push(o);
            o.frustumCulled = false;
          }
        });
        const env = scene.environment;
        const prev = r.getRenderTarget();
        r.setRenderTarget(warmTarget);
        for (const e of [env, roomEnv]) {
          scene.environment = e;
          r.shadowMap.needsUpdate = true;
          r.render(scene, camera);
        }
        if (bokeh?.enabled) composer?.render();
        r.setRenderTarget(prev);
        scene.environment = env;
        flipped.forEach((o) => (o.visible = false));
        culled.forEach((o) => (o.frustumCulled = true));
        lastStructC = -1; // let the next frame restore the story's real state
        resolve();
      };
      setTimeout(go, 50);
    });
  let lastMove = 0;
  let warming = false;
  const warmEnv = () => {
    if (warming) return;
    warming = true;
    const cs: number[] = [];
    for (let c = 0; c <= 12; c += 0.1) cs.push(c);
    // Bake around where the reader is first.
    cs.sort((x, y) => Math.abs(x - current) - Math.abs(y - current));
    let i = 0;
    const idle = (cb: () => void) => ('requestIdleCallback' in window ? requestIdleCallback(cb) : setTimeout(cb, 60));
    const step = () => {
      if (performance.now() - lastMove < 500) return void idle(step); // never while the reader is scrolling
      while (i < cs.length) {
        const c = cs[i++];
        const P = phases(c);
        const k = envKeyOf(c, skyAt(c, P).n, P.world);
        if (k === 'in' || envCache.has(k)) continue;
        envCache.set(k, pmrem.fromScene(envScene, 0, 1, 3000).texture);
        break;
      }
      skyAt(current, phases(current));
      if (i < cs.length) idle(step);
      else warming = false;
    };
    idle(step);
  };
  envCache.set(envKeyOf(current, 0, 0), pmrem.fromScene(envScene, 0, 1, 3000).texture);
  updateEnv(current, 0, 0);
  stage.renderer.shadowMap.autoUpdate = false;
  composer = new EffectComposer(stage.renderer);
  composer.addPass(new RenderPass(scene, camera));
  // A real lens: depth of field that follows the camera's subject (high quality only).
  bokeh = new BokehPass(scene, camera, { focus: 40, aperture: 0.00002, maxblur: 0.008 });
  bokeh.enabled = stage.quality === 'high';
  composer.addPass(bokeh);
  stage.renderer.toneMapping = THREE.AgXToneMapping;
  bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.45, 0.96);
  bloom.enabled = stage.quality !== 'low';
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  // Filmic finish: a soft vignette and a whisper of grain.
  finish = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){
        vec2 off = (vUv - 0.5) * 0.0028;
        vec4 c = texture2D(tDiffuse, vUv);
        c.r = texture2D(tDiffuse, vUv + off).r; // a touch of lens fringing at the edges
        c.b = texture2D(tDiffuse, vUv - off).b;
        float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
        c.rgb = mix(vec3(l), c.rgb, 1.14);          // win back saturation after AgX
        c.rgb = (c.rgb - 0.5) * 1.07 + 0.5;          // a gentle print contrast
        float d = distance(vUv, vec2(0.5));
        c.rgb *= 1.0 - 0.32 * smoothstep(0.38, 0.9, d);
        c.rgb += (h(vUv * 900.0 + fract(uTime) * 50.0) - 0.5) * 0.022;
        gl_FragColor = c;
      }`,
  });
  composer.addPass(finish);
  const { width, height } = host.getBoundingClientRect();
  composer.setPixelRatio(stage.renderer.getPixelRatio());
  composer.setSize(width, height);

  addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / innerHeight) * 2 - 1;
  });

  /* ================= real assets, swapped in as they arrive ================= */
  const applyAssets = (a: Assets) => {
    // Skies: light, reflections and fog all come from the photographed sky.
    const azOf = (v: THREE.Vector3) => Math.atan2(v.z, v.x);
    A = {
      dayAz: azOf(a.skies.day.sunDir),
      dayElev: Math.max(0.35, Math.asin(a.skies.day.sunDir.y)),
      setAz: azOf(a.skies.sunset.sunDir),
      setElev: Math.max(0.05, Math.asin(a.skies.sunset.sunDir.y)),
      dayHz: a.skies.day.horizon,
      setHz: a.skies.sunset.horizon,
    };
    // Haze must not glow: cap the fog colour below white.
    for (const c of [A.dayHz, A.setHz]) {
      const m = Math.max(c.r, c.g, c.b);
      if (m > 0.75) c.multiplyScalar(0.75 / m);
    }
    skyU.uDay.value = a.skies.day.texture;
    skyU.uSet.value = a.skies.sunset.texture;
    envKey = '';
    [...Object.values(a.tex), a.skies.day.texture, a.skies.sunset.texture].forEach((t) => stage.renderer.initTexture(t));

    // Materials: real surfaces. Shape UVs are in metres, so repeat = 1 / tile size.
    const T = a.tex;
    const tile = (t: THREE.Texture, rep: number) => {
      const c = t.clone();
      c.repeat.set(rep, rep);
      c.needsUpdate = true;
      return c;
    };
    const skin = (m: THREE.MeshStandardMaterial, t: THREE.Texture, tint = 1) => {
      m.map = t;
      m.color.setScalar(tint);
      m.needsUpdate = true;
    };
    const asphalt = tile(T.asphalt_02, 1 / 9);
    skin(groundMat, asphalt, 0.75);
    skin(roadMat, asphalt, 0.5);
    const grass = tile(T.leafy_grass, 1 / 5);
    const mud = tile(T.brown_mud_02, 1 / 5);
    skin(plotMat, grass);
    skin(lidMat, tile(T.brown_mud_02, 4), 0.8);
    skin(pitWalls.material as THREE.MeshStandardMaterial, tile(T.brown_mud_02, 3), 0.7);
    skin(concreteMat, tile(T.concrete, 1.5), 0.95);
    skin(plazaMat, tile(T.rectangular_paving, 1 / 3), 0.95);
    skin(floorStone.material as THREE.MeshStandardMaterial, tile(T.marble_01, 5));
    (floorStone.material as THREE.MeshStandardMaterial).roughness = 0.08;
    skin(woodMat, tile(T.wood_floor, 1), 0.9);
    skin(deskTop.material as THREE.MeshStandardMaterial, tile(T.wood_floor, 0.5), 0.7);
    facadeU.uFacA.value = T.rectangular_facade_tiles_02;
    facadeU.uFacB.value = T.brick_wall_08;
    facadeU.uUseFac.value = 1;

    // Trees: a scanned tree, rendered from two sides, on crossed billboards.
    const billGeo = (half: 0 | 1) => {
      const g = new THREE.PlaneGeometry(4.3, 3.6).translate(0, 1.8, 0);
      const uv = g.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 0.5 + half * 0.5);
      if (half) g.rotateY(Math.PI / 2);
      return g;
    };
    const billMat = new THREE.MeshStandardMaterial({ map: T.tree_billboard, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 1 });
    T.tree_billboard.wrapS = T.tree_billboard.wrapT = THREE.ClampToEdgeWrapping;
    const billDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: T.tree_billboard, alphaTest: 0.45 });
    const bills = [billGeo(0), billGeo(1)].map((g) => {
      const m = new THREE.InstancedMesh(g, billMat, trees.count);
      m.customDepthMaterial = billDepth;
      m.castShadow = true;
      world.add(m);
      return m;
    });
    trees.visible = trunks.visible = false;
    const tm = new THREE.Matrix4();
    const grow = new THREE.Matrix4().makeScale(2.1, 2.1, 2.1);
    const syncTrees = () => {
      for (let i = 0; i < trees.count; i++) {
        trees.getMatrixAt(i, tm);
        tm.multiply(grow);
        bills[0].setMatrixAt(i, tm);
        bills[1].setMatrixAt(i, tm);
      }
      bills[0].instanceMatrix.needsUpdate = bills[1].instanceMatrix.needsUpdate = true;
    };
    syncTrees();
    let treeC = -1;

    const plotFrame = (P: Phases) => {
      if (Math.abs(P.plaza - treeC) > 1e-4) {
        treeC = P.plaza;
        syncTrees();
      }
      const m = P.mud > 0.5 ? mud : grass;
      if (plotMat.map !== m) plotMat.map = m;
      plotMat.color.copy(P.mud > 0.5 ? C.white : C.grass).multiplyScalar(P.mud > 0.5 ? 1 : 1.5);
      lidMat.color.setScalar(0.8);
    };

    // Furniture and plants.
    standIns.forEach((o) => (o.visible = false));
    const place = (src: THREE.Object3D, parent: THREE.Object3D, x: number, y: number, z: number, ry = 0, height?: number) => {
      const o = src.clone(true);
      if (height) {
        const b = new THREE.Box3().setFromObject(o);
        o.scale.setScalar(height / Math.max(0.01, b.max.y - b.min.y));
      }
      o.position.set(x, y, z);
      o.rotation.y = ry;
      o.traverse((m) => {
        if ((m as THREE.Mesh).isMesh) m.castShadow = m.receiveShadow = true;
      });
      parent.add(o);
      return o;
    };
    const chair = a.models.modern_arm_chair_01.scene;
    place(chair, foyer, 8, 0.06, 6.9, 0);
    place(chair, foyer, 8, 0.06, 10.1, Math.PI);
    place(chair, foyer, 6.4, 0.06, 8.5, Math.PI / 2);
    place(chair, foyer, 9.6, 0.06, 8.5, -Math.PI / 2);
    place(a.models.modern_coffee_table_01.scene, foyer, 8, 0.06, 8.5);
    plantSpots.forEach(({ parent, g, s }) => {
      g.visible = false;
      place(a.models.potted_plant_02.scene, parent, g.position.x, g.position.y, g.position.z, s * 2.1, 1.9 * s);
    });

    // People: rigged, animated figures in the white of an architect's model.
    const xb = a.models.xbot;
    const figMat = new THREE.MeshStandardMaterial({ color: C.stone, roughness: 0.5 });
    const jointMat = new THREE.MeshStandardMaterial({ color: C.steel, roughness: 0.35, metalness: 0.4 });
    xb.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.material = /joint/i.test((m.material as THREE.Material).name) ? jointMat : figMat;
      m.castShadow = true;
      m.frustumCulled = false;
    });
    const hb = new THREE.Box3().setFromObject(xb.scene);
    const k = 1.74 / Math.max(0.01, hb.max.y - hb.min.y);
    const clip = (n: string) => xb.animations.find((c) => c.name === n)!;
    const nodClip = THREE.AnimationUtils.makeClipAdditive(clip('agree').clone());
    type Fig = { o: THREE.Object3D; mixer: THREE.AnimationMixer; nod?: THREE.AnimationAction; head?: THREE.Object3D };
    const figure = (parent: THREE.Object3D, mode: 'idle' | 'walk', phase: number, nod = false): Fig => {
      const o = SkeletonUtils.clone(xb.scene);
      o.scale.setScalar(k);
      parent.add(o);
      const mixer = new THREE.AnimationMixer(o);
      const act = mixer.clipAction(clip(mode));
      act.play();
      act.time = phase * act.getClip().duration;
      const f: Fig = { o, mixer };
      if (nod) {
        f.nod = mixer.clipAction(nodClip);
        f.nod.play();
        f.nod.setEffectiveWeight(0);
      }
      o.traverse((b) => {
        if (/Head$/.test(b.name)) f.head = b;
      });
      return f;
    };

    rec.visible = false;
    const host0 = figure(foyer, 'idle', 0.2, true);
    host0.o.position.set(deskAt.x, 0.06, deskAt.z + 0.15);
    const chats = [figure(foyer, 'idle', 0.5, true), figure(foyer, 'idle', 0.1, true)];
    chats[0].o.position.set(5.0, 0.06, 4.7);
    chats[0].o.rotation.y = -1.2;
    chats[1].o.position.set(4.0, 0.06, 5.0);
    chats[1].o.rotation.y = 1.9;
    const lobbyWalkers = [0, 1, 2, 3].map((i) => figure(foyer, 'walk', i * 0.27));
    foyerCrowd.group.visible = false;

    visitors.group.visible = false;
    const plazaWalkers = [0, 1, 2, 3, 4, 5].map((i) => figure(plaza, 'walk', i * 0.19));

    occupants.group.visible = false;
    const officeFigs: Fig[] = [];
    occPlan.forEach((o, i) => {
      if (o.sit && i % 2) return; // not every desk is in use
      const f = figure(office, 'idle', (i * 0.37) % 1, i % 3 === 0);
      f.o.position.copy(o.p);
      f.o.rotation.y = o.yaw;
      officeFigs.push(f);
    });

    const allLobby = [host0, ...chats, ...lobbyWalkers];
    assetFrame = (dt, at, c, P) => {
      plotFrame(P);
      if (plaza.visible) {
        plazaWalkers.forEach((f, i) => {
          const u = (at * 0.045 + i / plazaWalkers.length) % 1;
          f.o.position.set((i % 2 ? 1.6 : -1.6) + Math.sin(i * 7) * 0.6, 0.04, lerp(40, HALF + 1, u));
          f.o.rotation.y = Math.PI;
          f.mixer.update(dt);
        });
      }
      if (foyer.visible && c > 6.8 && c < 9.8) {
        lobbyWalkers.forEach((f, i) => {
          const u = (at * 0.06 + i * 0.27) % 1;
          f.o.position.set(lerp(i % 2 ? 5.4 : 6.6, 3.4, u * u), 0.06, lerp(12, 4.8, u));
          f.o.rotation.y = Math.PI - u * 0.4;
        });
        // The host looks up, nods you in, then turns towards the lifts.
        host0.nod!.setEffectiveWeight(P.greet);
        host0.o.rotation.y = P.point * 0.9;
        chats.forEach((f, i) => f.nod!.setEffectiveWeight(0.5 + 0.5 * Math.sin(at * 0.8 + i * 2)));
        allLobby.forEach((f) => f.mixer.update(dt));
        if (host0.head) {
          const look = Math.atan2(camera.position.x - host0.o.position.x, camera.position.z - host0.o.position.z) - host0.o.rotation.y;
          host0.head.rotation.y += THREE.MathUtils.clamp(look, -1, 1) * P.greet * 0.8;
        }
      }
      if (office.visible && c > 9.4) {
        officeFigs.forEach((f, i) => {
          f.nod?.setEffectiveWeight(0.4 + 0.4 * Math.sin(at * 0.6 + i));
          f.mixer.update(dt);
        });
      }
    };
    precompile().then(() => warmEnv());
    if (stage.isPaused()) stage.renderOnce();
  };
  loadAssets(onAssets)
    .then(applyAssets)
    .catch((e) => console.warn('Meridian House: real assets unavailable, keeping the procedural set.', e));

  let occluded = false;
  precompile();
  stage.renderOnce();
  host.dataset.state = 'ready';
  return {
    stage,
    setTarget(c, jump = false) {
      if (c !== target) lastMove = performance.now();
      target = c;
      if (jump) current = c;
      if (stage.isPaused() && !occluded) stage.renderOnce();
      // Behind a plate nothing renders, but the page's log and chapter rail still follow.
      if (occluded) onFrame?.(c, phases(c));
    },
    /** A full-screen image covers the canvas: stop rendering until it lifts. */
    setOccluded(o: boolean) {
      if (o === occluded) return;
      occluded = o;
      if (o) stage.setPaused(true);
      else {
        current = target; // cut straight to where the story is now
        stage.setPaused(still);
        stage.renderOnce();
      }
    },
  };
}
