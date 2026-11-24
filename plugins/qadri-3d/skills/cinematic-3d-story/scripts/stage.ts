/**
 * The shared harness every 3D scene on /3d-website/ runs inside.
 *
 * It owns the parts that are the same in every scene and easy to get wrong:
 *   - one WebGLRenderer per canvas, sized by CSS through a ResizeObserver
 *   - the loop only runs while the canvas is on screen AND the tab is visible
 *   - prefers-reduced-motion starts the scene paused on a single still frame
 *   - quality profiles (low / balanced / high) and an adaptive governor that
 *     steps down when the measured frame rate stays low, instead of guessing
 *     from the user agent
 *   - a stats feed (fps, draw calls, triangles) for the on-screen HUD
 *   - theme colours read from CSS tokens, so no colour is hard-coded in JS
 */
import * as THREE from 'three';

export type Quality = 'low' | 'balanced' | 'high';
export const QUALITIES: Quality[] = ['low', 'balanced', 'high'];

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- Colours from theme.css --------------------------------------------- */

let probe: CanvasRenderingContext2D | null = null;
/** Resolve any CSS colour (oklch, var(), hex) to a THREE.Color via a 1px canvas. */
export function token(name: string): THREE.Color {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || 'magenta';
  probe ??= Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d', {
    willReadFrequently: true,
  })!;
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = raw;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
}

/** First guess before any frame is measured. The governor corrects it. */
export function initialQuality(): Quality {
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (coarse && mem !== undefined && mem <= 4) return 'low';
  if (coarse) return 'balanced';
  return 'high';
}

export function pixelRatioFor(q: Quality) {
  const dpr = window.devicePixelRatio || 1;
  return q === 'low' ? 1 : q === 'balanced' ? Math.min(dpr, 1.25) : Math.min(dpr, 2);
}

export interface Stats {
  fps: number;
  calls: number;
  triangles: number;
  quality: Quality;
}

export interface StageOptions {
  host: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera;
  /** Called every frame with seconds since last frame and total seconds. */
  update: (dt: number, t: number) => void;
  /** Replace the plain render, e.g. with a post-processing composer. */
  render?: () => void;
  onResize?: (w: number, h: number) => void;
  onQuality?: (q: Quality, reason: 'user' | 'auto') => void;
  onStats?: (s: Stats) => void;
  /** Step quality down automatically when fps stays under this. 0 = off. */
  adaptBelow?: number;
  antialias?: boolean;
  shadows?: boolean;
}

export interface Stage {
  renderer: THREE.WebGLRenderer;
  quality: Quality;
  setQuality(q: Quality, reason?: 'user' | 'auto'): void;
  setPaused(p: boolean): void;
  isPaused(): boolean;
  renderOnce(): void;
  dispose(): void;
}

/** Returns null when WebGL is unavailable; the caller shows its HTML fallback. */
export function createStage(o: StageOptions): Stage | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: o.antialias ?? true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.classList.add('stage-canvas');
  canvas.setAttribute('aria-hidden', 'true');
  o.host.prepend(canvas);

  const clock = new THREE.Clock(false);
  let t = 0;
  let onScreen = false;
  let userPaused = reducedMotion();
  let quality: Quality = initialQuality();

  const draw = () => (o.render ? o.render() : renderer.render(o.scene, o.camera));

  const applyQuality = () => {
    renderer.setPixelRatio(pixelRatioFor(quality));
    renderer.shadowMap.enabled = !!o.shadows && quality !== 'low';
    const { width, height } = o.host.getBoundingClientRect();
    resize(width, height);
  };

  const resize = (w: number, h: number) => {
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    if (o.camera instanceof THREE.PerspectiveCamera) {
      o.camera.aspect = w / h;
    }
    o.camera.updateProjectionMatrix();
    o.onResize?.(w, h);
    if (!running()) draw();
  };

  // ---- Stats and the adaptive governor ----------------------------------
  let frames = 0;
  let acc = 0;
  let slowWindows = 0;
  const report = (dt: number) => {
    frames++;
    acc += dt;
    if (acc < 0.5) return;
    const fps = frames / acc;
    frames = 0;
    acc = 0;
    o.onStats?.({
      fps,
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      quality,
    });
    if (!o.adaptBelow) return;
    slowWindows = fps < o.adaptBelow ? slowWindows + 1 : 0;
    // Six half-second windows in a row: three seconds of genuine struggle,
    // not one hitch while a texture uploads.
    if (slowWindows >= 6 && quality !== 'low') {
      slowWindows = 0;
      stage.setQuality(QUALITIES[QUALITIES.indexOf(quality) - 1], 'auto');
    }
  };

  const frame = () => {
    const dt = Math.min(clock.getDelta(), 1 / 20); // a backgrounded tab must not teleport cars
    t += dt;
    o.update(dt, t);
    draw();
    report(dt);
  };

  const running = () => onScreen && !userPaused && !document.hidden;
  const sync = () => {
    if (running()) {
      if (!clock.running) clock.start();
      renderer.setAnimationLoop(frame);
    } else {
      renderer.setAnimationLoop(null);
      clock.stop();
    }
  };

  const ro = new ResizeObserver(([e]) => resize(e.contentRect.width, e.contentRect.height));
  ro.observe(o.host);
  const io = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    sync();
  });
  io.observe(o.host);
  document.addEventListener('visibilitychange', sync);

  const stage: Stage = {
    renderer,
    get quality() {
      return quality;
    },
    setQuality(q, reason = 'user') {
      quality = q;
      slowWindows = 0;
      applyQuality();
      o.onQuality?.(q, reason);
    },
    setPaused(p) {
      userPaused = p;
      sync();
    },
    isPaused: () => userPaused,
    renderOnce() {
      o.update(0, t);
      draw();
    },
    dispose() {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
      renderer.dispose();
    },
  };

  applyQuality();
  o.onQuality?.(quality, 'auto');
  stage.renderOnce();
  return stage;
}

/* ---- Small shared UI helpers -------------------------------------------- */

/** Wire a section's HUD: <dd data-stat="fps|calls|triangles|quality">. */
export function hud(root: HTMLElement) {
  const el = (k: string) => root.querySelector<HTMLElement>(`[data-stat="${k}"]`);
  const fps = el('fps');
  const calls = el('calls');
  const tris = el('triangles');
  const q = el('quality');
  return (s: Stats) => {
    if (fps) fps.textContent = s.fps.toFixed(0);
    if (calls) calls.textContent = String(s.calls);
    if (tris) tris.textContent = s.triangles.toLocaleString('en-GB');
    if (q) q.textContent = s.quality;
  };
}

/** A play/pause button with aria-pressed, starting in the stage's state. */
export function bindPlayButton(btn: HTMLButtonElement | null, stage: Stage) {
  if (!btn) return;
  const paint = () => {
    const paused = stage.isPaused();
    btn.setAttribute('aria-pressed', String(!paused));
    btn.textContent = paused ? 'Play motion' : 'Pause motion';
  };
  btn.hidden = false;
  btn.addEventListener('click', () => {
    stage.setPaused(!stage.isPaused());
    paint();
  });
  paint();
}

/** Seeded random, so the island and the city are the same on every visit. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), 1 | s);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
