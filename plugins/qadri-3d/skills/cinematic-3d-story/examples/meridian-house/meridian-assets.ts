/**
 * Real assets for Meridian House, all CC0 from Poly Haven except the
 * mannequin (three.js example "Xbot", a Mixamo character).
 *
 *   skies      kloofendal_48d_partly_cloudy_puresky, qwantani_sunset_puresky (1k HDR)
 *   textures   concrete, asphalt_02, leafy_grass, brown_mud_02,
 *              rectangular_paving, marble_01, wood_floor, rectangular_facade_tiles_02,
 *              brick_wall_08 (WebP)
 *   trees      tree_billboard: island_tree_02 rendered from two sides to a
 *              transparent atlas, used as crossed billboards
 *   models     potted_plant_02, modern_arm_chair_01, modern_coffee_table_01
 *              (meshopt + WebP via gltf-transform), xbot (meshopt)
 *
 * Files live in public/meridian/. A self-contained build can provide them as
 * data URIs on window.__MH_ASSETS instead; nothing else changes.
 */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

declare global {
  interface Window {
    __MH_ASSETS?: Record<string, string>;
  }
}

export const TEXTURES = ['concrete', 'asphalt_02', 'leafy_grass', 'brown_mud_02', 'rectangular_paving', 'marble_01', 'wood_floor', 'rectangular_facade_tiles_02', 'brick_wall_08', 'tree_billboard'] as const;
export const MODELS = ['xbot', 'potted_plant_02', 'modern_arm_chair_01', 'modern_coffee_table_01'] as const;
export const SKIES = { day: 'kloofendal_48d_partly_cloudy_puresky', sunset: 'qwantani_sunset_puresky' } as const;

export const assetFiles = () => [
  ...Object.values(SKIES).map((n) => `${n}.hdr`),
  ...TEXTURES.map((n) => `${n}.webp`),
  ...MODELS.map((n) => `${n}.glb`),
];

const url = (file: string) => window.__MH_ASSETS?.[file] ?? `/meridian/${file}`;

export interface Sky {
  texture: THREE.DataTexture;
  /** Direction to the brightest point (the sun), in the texture's own frame. */
  sunDir: THREE.Vector3;
  /** Average colour just above the horizon, for matching fog to the sky. */
  horizon: THREE.Color;
}

export interface Assets {
  skies: { day: Sky; sunset: Sky };
  tex: Record<(typeof TEXTURES)[number], THREE.Texture>;
  models: Record<(typeof MODELS)[number], GLTF>;
}

/** Find the sun in an equirect HDR so the scene's light can match it. */
function findSun(t: THREE.DataTexture): { sunDir: THREE.Vector3; horizon: THREE.Color } {
  const { width: w, height: h, data } = t.image as { width: number; height: number; data: Uint16Array | Float32Array };
  const half = data instanceof Uint16Array;
  const get = (i: number) => (half ? THREE.DataUtils.fromHalfFloat(data[i]) : data[i]);
  let best = -1;
  let bi = 0;
  for (let y = 0; y < h / 2; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const l = get(i) * 0.2126 + get(i + 1) * 0.7152 + get(i + 2) * 0.0722;
      if (l > best) {
        best = l;
        bi = y * w + x;
      }
    }
  // Horizon colour: rows a few degrees above the horizon, clamped so the sun doesn't dominate.
  let r = 0, g = 0, b = 0, n = 0;
  for (let y = Math.floor(h * 0.44); y < Math.floor(h * 0.49); y++)
    for (let x = 0; x < w; x += 4) {
      const i = (y * w + x) * 4;
      r += Math.min(get(i), 4); g += Math.min(get(i + 1), 4); b += Math.min(get(i + 2), 4); n++;
    }
  const horizon = new THREE.Color().setRGB(r / n, g / n, b / n);
  const u = (bi % w) / w;
  const v = Math.floor(bi / w) / h;
  // three's equirect convention: u = atan(z, x) / 2π + 0.5, v = asin(y) / π + 0.5 (flipY)
  const phi = (u - 0.5) * Math.PI * 2;
  const theta = (0.5 - v) * Math.PI;
  const sunDir = new THREE.Vector3(Math.cos(theta) * Math.cos(phi), Math.sin(theta), Math.cos(theta) * Math.sin(phi)).normalize();
  return { sunDir, horizon };
}

export async function loadAssets(onProgress?: (done: number, total: number) => void): Promise<Assets> {
  const files = assetFiles();
  let done = 0;
  const tick = <T,>(p: Promise<T>) =>
    p.then((v) => {
      onProgress?.(++done, files.length);
      return v;
    });

  const hdr = new HDRLoader();
  hdr.setDataType(THREE.HalfFloatType);
  const loadSky = (name: string) =>
    tick(hdr.loadAsync(url(`${name}.hdr`))).then((texture) => {
      texture.mapping = THREE.EquirectangularReflectionMapping;
      return { texture, ...findSun(texture) };
    });

  const tl = new THREE.TextureLoader();
  const loadTex = (name: string) =>
    tick(tl.loadAsync(url(`${name}.webp`))).then((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 8;
      return t;
    });

  const gl = new GLTFLoader();
  gl.setMeshoptDecoder(MeshoptDecoder);
  const loadModel = (name: string) => tick(gl.loadAsync(url(`${name}.glb`)));

  const [day, sunset, texList, modelList] = await Promise.all([
    loadSky(SKIES.day),
    loadSky(SKIES.sunset),
    Promise.all(TEXTURES.map(loadTex)),
    Promise.all(MODELS.map(loadModel)),
  ]);
  return {
    skies: { day, sunset },
    tex: Object.fromEntries(TEXTURES.map((n, i) => [n, texList[i]])) as Assets['tex'],
    models: Object.fromEntries(MODELS.map((n, i) => [n, modelList[i]])) as Assets['models'],
  };
}
