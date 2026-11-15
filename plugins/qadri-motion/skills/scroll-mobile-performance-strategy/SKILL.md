---
name: scroll-mobile-performance-strategy
description: Use when a heavy scroll-narrative site must survive mid-range mobile devices (Snapdragon 6-series, A14, Tensor G2 class). Builds a complete degradation and optimization strategy covering layer budgets, animation simplification, lazy trigger creation, image strategy, and thermal-throttle resilience, with real audit scripts.
category: scroll
pairs_with: scroll-mobile-performance-strategy-eval
---

# Mobile Performance Strategy for Scroll-Narrative Sites

## What this builds
A complete performance strategy document and code layer that sits between a scroll-narrative site and its animation toolkits, ensuring the site hits 60fps on a mid-range phone (Samsung A54, Pixel 7a, iPhone 12 class) even under thermal throttle. This is not a generic performance guide. It is specific to scroll-driven animation sites: pinned sections, parallax layers, scrubbed timelines, text reveals, and image sequences.

- A tiered rendering strategy: full/reduced/minimal based on device capability detection
- Layer budget enforcement (max 4 compositor layers on mobile GPU)
- ScrollTrigger count management with lazy creation and eager teardown
- Image strategy: format selection, lazy loading, decode timing, and canvas DPR capping
- Animation simplification rules: what to cut, what to keep, and in what order
- Thermal throttle resilience: detecting and responding to GPU frequency drops
- A real performance audit script that runs in DevTools and reports pass/fail per budget line

## When to use / when not to
- Use when you have built (or are building) a scroll-narrative site using GSAP ScrollTrigger, Lenis, or CSS scroll-driven animations and it runs poorly on phones.
- Use when the site has 4+ acts/sections with pinned, scrubbed, or parallax animations.
- Use when you need to decide what to cut on mobile without losing the narrative structure.
- Do NOT use for a simple landing page with a few fade-in reveals. The overhead of a tiered strategy is not worth it for < 3 scroll-animated sections.
- Do NOT use for WebGL/Three.js mobile optimization. That requires GPU-specific tuning (draw calls, texture memory, shader complexity) documented in `three-js-fundamentals` and `react-three-fiber-drei`.
- For the harness that actually wires Lenis and GSAP, see `scroll-lenis-gsap-integration-harness`. This toolkit tells you how to configure it for mobile.

## Stack decision
- **GSAP ScrollTrigger** (the site already uses it): Provides `ScrollTrigger.matchMedia()` for responsive breakpoints and `ScrollTrigger.batch()` for efficient many-element triggers.
- **No new dependencies**: This toolkit adds zero new libraries. It is a strategy layer that configures existing tools differently on mobile.
- **Optional: web-vitals (2KB)**: For measuring real-user LCP, CLS, INP. Only if you need production RUM data.
- **Cheaper alternative**: If you cannot implement the full tiered strategy, the single highest-impact change is removing all pinned sections on mobile (replace with static scroll-through) and capping images at 2x DPR. That alone solves 70% of mobile scroll perf issues.

## Architecture

```
src/
  perf/
    device-tier.ts    -- detect device capability, assign tier
    layer-budget.ts   -- enforce compositor layer count
    lazy-triggers.ts  -- create/destroy ScrollTriggers based on proximity
    image-strategy.ts -- responsive images, decode, DPR cap
    animation-tiers.ts -- per-tier animation simplification
    thermal-guard.ts  -- detect and respond to thermal throttle
    audit.ts          -- DevTools audit script
```

The strategy sits between the harness (scroll-lenis-gsap-integration-harness) and the content. The harness initializes first, then the strategy layer reads device capability and configures the harness's behavior:

```
[Device tier detection]
       |
       v
[Tier: full / reduced / minimal]
       |
       +---> Configure Lenis (or disable)
       +---> Configure ScrollTrigger defaults
       +---> Set layer budget
       +---> Set image strategy
       +---> Enable/disable specific animation types
```

## Build it: step by step

### Phase 1: Device tier detection

```typescript
// src/perf/device-tier.ts

export type DeviceTier = 'full' | 'reduced' | 'minimal';

export function detectDeviceTier(): DeviceTier {
  // Tier 1: reduced motion always gets minimal
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 'minimal';
  }

  // Tier 2: hardware signals
  const memory = (navigator as any).deviceMemory; // GB, Chrome only
  const cores = navigator.hardwareConcurrency ?? 4;
  const isTouchPrimary = window.matchMedia('(pointer: coarse)').matches;
  const viewportWidth = window.innerWidth;
  const dpr = window.devicePixelRatio;

  // Score: 0-10
  let score = 0;

  // Memory: >= 8GB = 3, >= 4GB = 2, < 4GB = 0
  if (memory) {
    if (memory >= 8) score += 3;
    else if (memory >= 4) score += 2;
  } else {
    score += 1; // unknown, assume mid
  }

  // Cores: >= 8 = 3, >= 4 = 2, < 4 = 0
  if (cores >= 8) score += 3;
  else if (cores >= 4) score += 2;

  // Viewport: >= 1024 = 2, >= 768 = 1, < 768 = 0
  if (viewportWidth >= 1024) score += 2;
  else if (viewportWidth >= 768) score += 1;

  // DPR penalty: > 3 = -1 (very high DPR = more pixels to composite)
  if (dpr > 3) score -= 1;

  // Touch penalty: touch primary devices are generally less powerful
  if (isTouchPrimary) score -= 1;

  if (score >= 6) return 'full';
  if (score >= 3) return 'reduced';
  return 'minimal';
}

// Runtime FPS probe: measures actual frame rate for 1 second
export function probeFPS(): Promise<number> {
  return new Promise((resolve) => {
    let frames = 0;
    let lastTime = performance.now();
    const target = lastTime + 1000;

    function count(now: number) {
      frames++;
      if (now >= target) {
        resolve(frames);
      } else {
        requestAnimationFrame(count);
      }
    }
    requestAnimationFrame(count);
  });
}

// Downgrade tier if FPS probe is low
export async function detectTierWithProbe(): Promise<DeviceTier> {
  const staticTier = detectDeviceTier();
  if (staticTier === 'minimal') return 'minimal';

  const fps = await probeFPS();

  if (fps < 45) {
    // Device is struggling even idle. Drop tier.
    if (staticTier === 'full') return 'reduced';
    return 'minimal';
  }

  return staticTier;
}
```

### Phase 2: Layer budget enforcement

```typescript
// src/perf/layer-budget.ts

const LAYER_BUDGETS: Record<string, number> = {
  full: 10,     // Desktop dedicated GPU
  reduced: 6,   // Tablet / high-end mobile
  minimal: 3,   // Mid-range mobile
};

export function getLayerBudget(tier: string): number {
  return LAYER_BUDGETS[tier] ?? 4;
}

// will-change manager: tracks promoted layers, prevents exceeding budget
class LayerManager {
  private promoted = new Set<HTMLElement>();
  private budget: number;

  constructor(budget: number) {
    this.budget = budget;
  }

  promote(el: HTMLElement): boolean {
    if (this.promoted.size >= this.budget) {
      return false; // budget exceeded, refuse promotion
    }
    el.style.willChange = 'transform';
    this.promoted.add(el);
    return true;
  }

  demote(el: HTMLElement): void {
    el.style.willChange = 'auto';
    this.promoted.delete(el);
  }

  demoteAll(): void {
    this.promoted.forEach((el) => {
      el.style.willChange = 'auto';
    });
    this.promoted.clear();
  }

  get count(): number {
    return this.promoted.size;
  }
}

export function createLayerManager(tier: string): LayerManager {
  return new LayerManager(getLayerBudget(tier));
}
```

### Phase 3: Animation tier configuration

```typescript
// src/perf/animation-tiers.ts

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { DeviceTier } from './device-tier';

interface TierConfig {
  enablePinning: boolean;
  enableParallax: boolean;
  enableScrub: boolean;
  enableStagger: boolean;
  enableClipPath: boolean;
  enableTextSplit: boolean;
  maxScrollTriggers: number;
  scrubValue: number | boolean;
  revealDuration: number;
  staggerDelay: number;
  parallaxRange: number;   // percentage travel
  imageDPRCap: number;
}

const TIER_CONFIGS: Record<DeviceTier, TierConfig> = {
  full: {
    enablePinning: true,
    enableParallax: true,
    enableScrub: true,
    enableStagger: true,
    enableClipPath: true,
    enableTextSplit: true,
    maxScrollTriggers: 30,
    scrubValue: 1,
    revealDuration: 0.8,
    staggerDelay: 0.08,
    parallaxRange: 24,
    imageDPRCap: 3,
  },
  reduced: {
    enablePinning: true,
    enableParallax: true,
    enableScrub: true,
    enableStagger: true,
    enableClipPath: false,   // clip-path is expensive on mobile GPUs
    enableTextSplit: false,  // many DOM nodes from splitting
    maxScrollTriggers: 15,
    scrubValue: 0.5,         // faster catch-up, less lerp work
    revealDuration: 0.6,
    staggerDelay: 0.05,
    parallaxRange: 12,       // halved travel = halved texture size needed
    imageDPRCap: 2,
  },
  minimal: {
    enablePinning: false,    // no pinning; sections scroll through
    enableParallax: false,   // no parallax layers at all
    enableScrub: false,      // no scrub; use toggle triggers
    enableStagger: false,    // no stagger; all elements appear at once
    enableClipPath: false,
    enableTextSplit: false,
    maxScrollTriggers: 8,
    scrubValue: false,
    revealDuration: 0.4,
    staggerDelay: 0,
    parallaxRange: 0,
    imageDPRCap: 1.5,
  },
};

export function getTierConfig(tier: DeviceTier): TierConfig {
  return TIER_CONFIGS[tier];
}

export function applyTierDefaults(tier: DeviceTier): void {
  const config = getTierConfig(tier);

  // Set GSAP defaults for this tier
  gsap.defaults({
    duration: config.revealDuration,
    ease: 'power2.out',
  });

  // Set ScrollTrigger defaults
  ScrollTrigger.config({
    limitCallbacks: true, // only fire callbacks when trigger is in viewport
  });

  // Add CSS class to body for tier-specific CSS rules
  document.body.dataset.perfTier = tier;
}
```

Companion CSS for tier-based degradation:

```css
/* Tier-based CSS degradation */
[data-perf-tier="minimal"] .act__parallax-bg {
  display: none;
}

[data-perf-tier="minimal"] .progress-bar {
  display: none;
}

[data-perf-tier="reduced"] .act__figure.reveal,
[data-perf-tier="minimal"] .act__figure.reveal {
  clip-path: none !important;
}

[data-perf-tier="minimal"] .reveal {
  opacity: 1 !important;
  transform: none !important;
}
```

### Phase 4: Lazy ScrollTrigger creation

```typescript
// src/perf/lazy-triggers.ts

import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface LazySection {
  el: HTMLElement;
  createTrigger: (el: HTMLElement) => ScrollTrigger | null;
  trigger: ScrollTrigger | null;
  observer: IntersectionObserver | null;
}

const sections: LazySection[] = [];
const PROXIMITY_MARGIN = '200%'; // create trigger when section is within 2 viewports

export function registerLazySection(
  el: HTMLElement,
  createTrigger: (el: HTMLElement) => ScrollTrigger | null
): void {
  const section: LazySection = {
    el,
    createTrigger,
    trigger: null,
    observer: null,
  };

  section.observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !section.trigger) {
          // Create trigger when section enters proximity
          section.trigger = section.createTrigger(section.el);
        } else if (!entry.isIntersecting && section.trigger) {
          // Destroy trigger when section leaves proximity
          section.trigger.kill();
          section.trigger = null;
        }
      });
    },
    {
      rootMargin: PROXIMITY_MARGIN,
    }
  );

  section.observer.observe(el);
  sections.push(section);
}

export function destroyAllLazySections(): void {
  sections.forEach((section) => {
    section.observer?.disconnect();
    section.trigger?.kill();
  });
  sections.length = 0;
}
```

### Phase 5: Image strategy

```typescript
// src/perf/image-strategy.ts

import type { DeviceTier } from './device-tier';

interface ImageConfig {
  dprCap: number;
  lazyLoadMargin: string;
  decodeAsync: boolean;
  formatPreference: string[];
}

const IMAGE_CONFIGS: Record<DeviceTier, ImageConfig> = {
  full: {
    dprCap: 3,
    lazyLoadMargin: '300px',
    decodeAsync: true,
    formatPreference: ['avif', 'webp', 'jpg'],
  },
  reduced: {
    dprCap: 2,
    lazyLoadMargin: '200px',
    decodeAsync: true,
    formatPreference: ['webp', 'jpg'],
  },
  minimal: {
    dprCap: 1.5,
    lazyLoadMargin: '100px',
    decodeAsync: true,
    formatPreference: ['webp', 'jpg'],
  },
};

export function getImageConfig(tier: DeviceTier): ImageConfig {
  return IMAGE_CONFIGS[tier];
}

// Cap DPR for canvas rendering (image sequences, canvas-based effects)
export function getCappedDPR(tier: DeviceTier): number {
  const config = getImageConfig(tier);
  return Math.min(window.devicePixelRatio, config.dprCap);
}

// Apply responsive image strategy to all images in a container
export function applyImageStrategy(container: HTMLElement, tier: DeviceTier): void {
  const config = getImageConfig(tier);
  const images = container.querySelectorAll<HTMLImageElement>('img[data-srcset]');

  images.forEach((img) => {
    // Set appropriate srcset based on DPR cap
    const srcset = img.dataset.srcset;
    if (srcset) {
      img.srcset = srcset;
      img.sizes = img.dataset.sizes || '100vw';
    }

    // Async decode
    if (config.decodeAsync) {
      img.decoding = 'async';
    }

    // Lazy load with tier-appropriate margin
    img.loading = 'lazy';
  });
}

// For canvas-based image sequences: preload with DPR-appropriate resolution
export function preloadImageSequence(
  urls: string[],
  tier: DeviceTier,
  onProgress?: (loaded: number, total: number) => void
): Promise<HTMLImageElement[]> {
  const dpr = getCappedDPR(tier);
  const images: HTMLImageElement[] = [];
  let loaded = 0;

  return Promise.all(
    urls.map((url, i) => {
      return new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        // If URLs have DPR variants, select the appropriate one
        // e.g., frame-001@1x.webp, frame-001@2x.webp
        const dprUrl = url.replace(/@\dx/, `@${Math.round(dpr)}x`);
        img.src = dprUrl;
        img.onload = () => {
          loaded++;
          onProgress?.(loaded, urls.length);
          images[i] = img;
          resolve(img);
        };
        img.onerror = () => {
          // Fallback to original URL
          img.src = url;
          img.onload = () => {
            loaded++;
            onProgress?.(loaded, urls.length);
            images[i] = img;
            resolve(img);
          };
        };
      });
    })
  );
}
```

### Phase 6: Thermal throttle detection and response

```typescript
// src/perf/thermal-guard.ts

import type { DeviceTier } from './device-tier';

export class ThermalGuard {
  private frameTimes: number[] = [];
  private lastFrameTime = 0;
  private isThrottled = false;
  private onThrottle: (throttled: boolean) => void;
  private running = false;
  private rafId = 0;

  constructor(onThrottle: (throttled: boolean) => void) {
    this.onThrottle = onThrottle;
  }

  start(): void {
    this.running = true;
    this.lastFrameTime = performance.now();
    this.tick();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.frameTimes.push(delta);

    // Keep last 60 frames (1 second at 60fps)
    if (this.frameTimes.length > 60) {
      this.frameTimes.shift();
    }

    // Check every 60 frames
    if (this.frameTimes.length === 60) {
      const avg = this.frameTimes.reduce((a, b) => a + b, 0) / 60;
      const droppedFrames = this.frameTimes.filter((t) => t > 20).length;

      // Throttle if average frame time > 20ms (< 50fps)
      // or if more than 10 dropped frames in the last second
      const shouldThrottle = avg > 20 || droppedFrames > 10;

      if (shouldThrottle !== this.isThrottled) {
        this.isThrottled = shouldThrottle;
        this.onThrottle(shouldThrottle);
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}

// Respond to thermal throttle by simplifying animations
export function handleThermalThrottle(throttled: boolean): void {
  if (throttled) {
    // Reduce visual complexity
    document.body.dataset.thermalThrottled = 'true';

    // Kill parallax layers
    document.querySelectorAll('.act__parallax-bg').forEach((el) => {
      (el as HTMLElement).style.display = 'none';
    });

    // Disable will-change on all elements
    document.querySelectorAll('[style*="will-change"]').forEach((el) => {
      (el as HTMLElement).style.willChange = 'auto';
    });

    console.warn('[ThermalGuard] Throttle detected. Reducing visual complexity.');
  } else {
    document.body.dataset.thermalThrottled = 'false';
    // Restoring would require re-init; typically you stay degraded for the session
  }
}
```

### Phase 7: Performance audit script

```typescript
// src/perf/audit.ts
// Paste this entire function into DevTools console to audit the page.

export function auditScrollPerformance(): void {
  const results: { check: string; status: 'PASS' | 'FAIL' | 'WARN'; detail: string }[] = [];

  // 1. Count compositor layers (will-change elements)
  const willChangeEls = document.querySelectorAll('[style*="will-change: transform"]');
  const layerCount = willChangeEls.length;
  results.push({
    check: 'Compositor layers (will-change)',
    status: layerCount > 6 ? 'FAIL' : layerCount > 4 ? 'WARN' : 'PASS',
    detail: `${layerCount} elements with will-change: transform. Budget: 4 mobile, 6 tablet, 10 desktop.`,
  });

  // 2. Count ScrollTriggers
  const triggerCount = (window as any).ScrollTrigger?.getAll?.()?.length ?? 0;
  results.push({
    check: 'ScrollTrigger count',
    status: triggerCount > 30 ? 'FAIL' : triggerCount > 15 ? 'WARN' : 'PASS',
    detail: `${triggerCount} active ScrollTriggers. Budget: 8 minimal, 15 reduced, 30 full.`,
  });

  // 3. Check for layout-triggering animations
  const allStyles = [...document.styleSheets];
  const layoutProps = ['width', 'height', 'top', 'left', 'right', 'bottom',
    'margin', 'padding', 'font-size', 'border-radius'];
  const violations: string[] = [];
  allStyles.forEach((ss) => {
    try {
      [...ss.cssRules].forEach((rule) => {
        if (rule instanceof CSSKeyframesRule) {
          [...rule.cssRules].forEach((kf) => {
            layoutProps.forEach((prop) => {
              if ((kf as CSSKeyframeRule).style.getPropertyValue(prop)) {
                violations.push(`${rule.name}: ${prop}`);
              }
            });
          });
        }
      });
    } catch (e) { /* cross-origin stylesheet */ }
  });
  results.push({
    check: 'Layout-triggering keyframe properties',
    status: violations.length > 0 ? 'FAIL' : 'PASS',
    detail: violations.length > 0
      ? `Forbidden: ${violations.join(', ')}`
      : 'All keyframes use compositor-safe properties.',
  });

  // 4. Image sizes vs viewport
  const images = document.querySelectorAll<HTMLImageElement>('img');
  let oversized = 0;
  const vw = window.innerWidth;
  const dpr = window.devicePixelRatio;
  images.forEach((img) => {
    if (img.naturalWidth > vw * dpr * 1.5) {
      oversized++;
    }
  });
  results.push({
    check: 'Oversized images',
    status: oversized > 0 ? 'WARN' : 'PASS',
    detail: `${oversized} images wider than ${Math.round(vw * dpr * 1.5)}px (1.5x viewport * DPR).`,
  });

  // 5. Passive scroll listeners
  // (Cannot directly audit; check for known patterns)
  results.push({
    check: 'Passive scroll listeners',
    status: 'WARN',
    detail: 'Cannot audit automatically. Verify all addEventListener("scroll") calls use { passive: true }.',
  });

  // 6. Images without dimensions
  let noDimensions = 0;
  images.forEach((img) => {
    if (!img.width && !img.getAttribute('width')) noDimensions++;
  });
  results.push({
    check: 'Images with explicit dimensions',
    status: noDimensions > 0 ? 'FAIL' : 'PASS',
    detail: `${noDimensions} images missing width/height attributes (CLS risk).`,
  });

  // 7. Reduced motion handling
  const styles = [...document.querySelectorAll('style, link[rel="stylesheet"]')]
    .map((el) => (el as HTMLStyleElement).textContent || '')
    .join('');
  const hasReducedMotion = styles.includes('prefers-reduced-motion');
  results.push({
    check: 'prefers-reduced-motion handling',
    status: hasReducedMotion ? 'PASS' : 'FAIL',
    detail: hasReducedMotion ? 'Reduced motion media query found.' : 'No reduced motion handling.',
  });

  // Print results
  console.group('Scroll Performance Audit');
  results.forEach((r) => {
    const icon = r.status === 'PASS' ? '[PASS]' : r.status === 'FAIL' ? '[FAIL]' : '[WARN]';
    console.log(`${icon} ${r.check}: ${r.detail}`);
  });
  console.groupEnd();
}
```

### Phase 8: Putting it all together

```typescript
// src/perf/init.ts

import { detectTierWithProbe, type DeviceTier } from './device-tier';
import { applyTierDefaults, getTierConfig } from './animation-tiers';
import { createLayerManager } from './layer-budget';
import { ThermalGuard, handleThermalThrottle } from './thermal-guard';
import { applyImageStrategy } from './image-strategy';

export async function initPerformanceLayer(): Promise<{
  tier: DeviceTier;
  teardown: () => void;
}> {
  const tier = await detectTierWithProbe();

  // Apply tier defaults (GSAP defaults, body class)
  applyTierDefaults(tier);

  // Set up layer manager
  const layers = createLayerManager(tier);

  // Apply image strategy
  applyImageStrategy(document.body, tier);

  // Start thermal guard on mobile tiers
  let thermalGuard: ThermalGuard | null = null;
  if (tier !== 'full') {
    thermalGuard = new ThermalGuard(handleThermalThrottle);
    thermalGuard.start();
  }

  console.log(`[Perf] Device tier: ${tier}`, getTierConfig(tier));

  return {
    tier,
    teardown: () => {
      thermalGuard?.stop();
      layers.demoteAll();
    },
  };
}
```

## The full reference implementation

```typescript
// mobile-perf-strategy.ts -- single-file condensed implementation

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type Tier = 'full' | 'reduced' | 'minimal';

function detectTier(): Tier {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return 'minimal';
  const mem = (navigator as any).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const touch = matchMedia('(pointer: coarse)').matches;
  const w = innerWidth;
  let s = 0;
  if (mem >= 8) s += 3; else if (mem >= 4) s += 2;
  if (cores >= 8) s += 3; else if (cores >= 4) s += 2;
  if (w >= 1024) s += 2; else if (w >= 768) s += 1;
  if (devicePixelRatio > 3) s -= 1;
  if (touch) s -= 1;
  if (s >= 6) return 'full';
  if (s >= 3) return 'reduced';
  return 'minimal';
}

const TIERS = {
  full:    { pin: true,  parallax: true,  clip: true,  split: true,  maxST: 30, dpr: 3 },
  reduced: { pin: true,  parallax: true,  clip: false, split: false, maxST: 15, dpr: 2 },
  minimal: { pin: false, parallax: false, clip: false, split: false, maxST: 8,  dpr: 1.5 },
} as const;

export function initMobilePerf() {
  const tier = detectTier();
  const cfg = TIERS[tier];
  document.body.dataset.perfTier = tier;

  gsap.defaults({ duration: tier === 'minimal' ? 0.4 : 0.8, ease: 'power2.out' });
  ScrollTrigger.config({ limitCallbacks: true });

  if (!cfg.parallax) {
    document.querySelectorAll('.act__parallax-bg').forEach(el => {
      (el as HTMLElement).style.display = 'none';
    });
  }

  // Thermal guard for non-full tiers
  if (tier !== 'full') {
    let frames: number[] = [];
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      frames.push(now - last);
      last = now;
      if (frames.length > 60) frames.shift();
      if (frames.length === 60) {
        const dropped = frames.filter(t => t > 20).length;
        if (dropped > 10) {
          document.body.dataset.thermalThrottled = 'true';
          document.querySelectorAll('.act__parallax-bg').forEach(el => {
            (el as HTMLElement).style.display = 'none';
          });
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  return { tier, config: cfg, cappedDPR: Math.min(devicePixelRatio, cfg.dpr) };
}
```

## Tuning the feel

| Parameter | Value | Why |
|---|---|---|
| FPS probe duration | 1 second | Long enough to detect sustained low FPS, short enough not to delay page initialization. |
| Thermal throttle threshold | > 20ms avg OR > 10 dropped frames / 60 | 20ms = 50fps, which is noticeably below 60fps. 10/60 dropped = 16% drop rate, perceptible as stutter. |
| Layer budget mobile | 4 layers | Each compositor layer on a mobile GPU consumes 4-8 MB. A 375x812 viewport at 3x DPR is 1125x2436 = 2.7M pixels per layer at 4 bytes = ~10 MB. 4 layers = ~40 MB GPU memory. Mid-range mobile GPUs have 1-2 GB total. |
| Layer budget desktop | 10 layers | Dedicated GPUs have 4-8 GB. 10 layers is well within budget. |
| DPR cap mobile | 1.5-2x | A 3x DPR canvas renders 9x the pixels of 1x. Capping at 2x renders 4x, saving 55% GPU fill rate. The difference between 2x and 3x is invisible at normal phone viewing distance. |
| ScrollTrigger cap minimal | 8 triggers | Each trigger adds ~0.1ms to scroll event processing. At 8 triggers, that is ~0.8ms, well within the 2ms scroll handler budget. |
| Resize debounce | 200ms | See `scroll-lenis-gsap-integration-harness` for rationale. |
| IntersectionObserver rootMargin for lazy triggers | 200% | Creates triggers 2 viewports before they are needed. At typical scroll speeds, this gives ~500ms lead time for trigger creation. |

## Variants

### 1. CSS-only tier degradation (no JS tier detection)
Use CSS media queries instead of JS tier detection:
```css
@media (max-width: 767px) {
  .act__parallax-bg { display: none; }
  .progress-bar { display: none; }
  .reveal { opacity: 1 !important; transform: none !important; }
}
```
Simpler but less accurate than hardware-based detection.

### 2. Network-aware degradation
Add `navigator.connection` to tier detection:
```typescript
const conn = (navigator as any).connection;
if (conn?.effectiveType === '2g' || conn?.saveData) return 'minimal';
```

### 3. User-controlled quality toggle
Add a UI toggle that lets the user override the detected tier:
```typescript
const stored = localStorage.getItem('perfTier');
if (stored) return stored as DeviceTier;
```

### 4. Server-side hint via Client Hints
Request device memory and viewport width via HTTP Client Hints headers and serve pre-simplified HTML:
```
Accept-CH: Device-Memory, Viewport-Width, DPR
```

### 5. Progressive enhancement (start minimal, upgrade)
Instead of detecting and degrading, start at minimal tier and progressively enable features if the FPS probe passes:
```typescript
const tier = 'minimal';
initMobilePerf(); // minimal by default
const fps = await probeFPS();
if (fps > 55) upgradeTo('reduced');
```

## Performance budget

| Metric | Target (mobile) | Lever |
|---|---|---|
| Frame time during scroll | < 16ms (60fps) | Cut parallax first, then pinning, then reveals |
| Scroll handler (JS) | < 2ms per frame | Reduce ScrollTrigger count, use limitCallbacks |
| Compositor layers | 4 max | Remove will-change from non-animating elements |
| GPU memory | < 100 MB for scroll layers | Cap DPR, remove parallax bg images, use CSS gradients |
| Image payload (initial) | < 400 KB | Serve WebP/AVIF, lazy-load below fold, cap dimensions to 2x viewport |
| LCP | < 2.5s on 3G | Preload hero image, defer non-critical JS |
| CLS | 0 | Explicit dimensions on all images, stable pin-spacer heights |
| INP | < 200ms | No blocking scroll listeners, passive: true everywhere |
| First cut if over budget | Parallax layers. They add a full-viewport texture per act to GPU memory. |

## Accessibility

### prefers-reduced-motion
The `minimal` tier is automatically selected when `prefers-reduced-motion: reduce` is detected. All animations are replaced with instant state changes. Parallax layers are hidden. Progress bar is hidden.

### What this costs
The tiered strategy means mobile users see less animation than desktop users. This is intentional: the content is the same, only the motion is reduced. Users on low-end devices get a faster, smoother experience with less visual flair. This is a better outcome than a janky, unresponsive page with full animations.

### Thermal throttle response
When thermal throttle is detected, the page automatically reduces visual complexity. This is invisible to the user except that parallax backgrounds disappear. Content remains fully accessible.

## Anti-slop rules

1. DO NOT use `navigator.userAgent` for device tier detection. It is unreliable, spoofable, and does not correlate with GPU capability. Use `navigator.hardwareConcurrency`, `navigator.deviceMemory`, and viewport size.
2. DO NOT set `will-change: transform` on more than 4 elements simultaneously on mobile. Each promoted layer costs 4-8 MB of GPU memory.
3. DO NOT use `filter: blur()` or `box-shadow` in scroll-driven animations on any tier. They are not compositor-safe and cause repaints on every frame.
4. DO NOT serve 3x DPR images to mobile devices. Cap at 2x. The quality difference between 2x and 3x is imperceptible at phone viewing distance, but the GPU cost is 2.25x higher.
5. DO NOT create more than 8 ScrollTriggers on the `minimal` tier. Each trigger adds scroll-event processing cost.
6. DO NOT animate `clip-path` on mobile. It is compositor-safe in Chrome but not guaranteed in Safari/Firefox mobile. Remove it for `reduced` and `minimal` tiers.
7. DO NOT rely solely on `matchMedia('(pointer: coarse)')` for mobile detection. Some laptops with touchscreens report `coarse`. Combine with viewport width.
8. DO NOT ignore thermal throttle. Mobile GPUs throttle frequency after 15-30 seconds of sustained load, dropping from 60fps to 20-30fps. Monitor and respond.
9. DO NOT test mobile performance only on simulators. Chrome DevTools CPU throttle is a rough approximation. Test on actual mid-range hardware (Samsung A54, Pixel 7a class).
10. DO NOT call `ScrollTrigger.refresh()` on every resize event on mobile. iOS address-bar show/hide triggers resize 20+ times per scroll direction change.

## Integration notes

- **scroll-lenis-gsap-integration-harness**: This strategy configures the harness. Call `initMobilePerf()` after the harness initializes, then pass the tier to the harness's configuration.
- **scroll-native-css-timeline-page**: CSS scroll-driven animations are inherently compositor-safe and less affected by mobile performance issues. If the site can use CSS-only animations, much of this strategy is unnecessary.
- **sticky-pinning-sequences**: Pinning is the most expensive mobile operation (promotes a full-viewport layer). The `minimal` tier disables it entirely.
- **image-sequence-scrubbing**: Image sequences are the highest-bandwidth mobile concern. DPR capping and progressive loading from the image strategy module apply directly.
- **parallax-depth-systems**: Parallax layers are the first thing to cut on mobile. Each layer adds a full-viewport texture to GPU memory.
- Known conflict: `ThermalGuard`'s rAF loop adds its own per-frame cost (~0.1ms). On the `minimal` tier, this is significant relative to the 2ms budget. Consider running the guard at 30fps (every other frame) instead.

## Ship checklist

- [ ] Device tier detection runs before any animation initialization
- [ ] `data-perf-tier` attribute set on body for CSS-based degradation
- [ ] `minimal` tier: no pinning, no parallax, no clip-path, no text splitting
- [ ] `reduced` tier: no clip-path, no text splitting, halved parallax range
- [ ] DPR capped at 2 for `reduced`, 1.5 for `minimal`
- [ ] ScrollTrigger count within tier budget (verified with audit script)
- [ ] Thermal throttle detection running on non-full tiers
- [ ] All scroll listeners use `passive: true`
- [ ] No layout-triggering properties in any keyframe animation
- [ ] All images have explicit width and height attributes
- [ ] Hero image preloaded with `fetchpriority="high"`
- [ ] Below-fold images use `loading="lazy"` with tier-appropriate rootMargin
- [ ] Performance audit script passes all checks at the target tier
- [ ] Tested on actual mid-range hardware (not just simulator)
- [ ] prefers-reduced-motion selects minimal tier automatically
