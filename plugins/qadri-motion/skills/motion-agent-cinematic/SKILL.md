---
name: motion-agent-cinematic
description: Film and video-style animations including letterboxing, fades to black, title cards, lower thirds, slow motion, Ken Burns, and film grain effects. Use when creating video intros, documentary-style content, or cinematic UI transitions.
---

# Cinematic

Film-style animation effects for video and cinematic content.

## Standards Reference

| Standard | Documentation |
|----------|---------------|
| W3C DTCG | designtokens.org |
| Remotion | remotion.dev/docs |
| After Effects | adobe.com/products/aftereffects |

## Quick Reference

Load from: `tokens/cinematic.tokens.json`

### Fade Durations

| Token | Value | Use |
|-------|-------|-----|
| `to-black.fast` | 500ms | Quick fade out |
| `to-black.normal` | 1000ms | Standard fade |
| `to-black.dramatic` | 3000ms | Dramatic ending |
| `hold.normal` | 1000ms | Hold on black |

### Title Card

| Token | Value | Use |
|-------|-------|-----|
| `fade-in` | 800ms | Title appear |
| `hold` | 2000ms | Title visible |
| `fade-out` | 600ms | Title exit |

## Selection Guide

```
What cinematic effect?
│
├── LETTERBOX → Aspect ratio
│   ├── Subtle → 5% bars
│   ├── Standard → 2.35:1 ratio
│   └── Animated reveal
│
├── FADES → Scene transitions
│   ├── Fade to black → ending/transition
│   ├── Fade to white → flashback/dream
│   ├── Cross dissolve → scene blend
│   └── Dip to black → clear transition
│
├── TITLES → Text graphics
│   ├── Title card → centered text
│   ├── Lower third → name/info bar
│   └── Credits roll → scrolling text
│
├── SPEED → Timing effects
│   ├── Slow motion → dramatic emphasis
│   ├── Speed ramp → impact moment
│   └── Time freeze → pause
│
├── OVERLAYS → Visual effects
│   ├── Film grain → texture
│   ├── Vignette → focus
│   ├── Light leaks → warmth
│   └── Color grade → mood
│
└── CAMERA → Movement effects
    ├── Ken Burns → photo animation
    ├── Rack focus → depth
    └── Dolly zoom → vertigo
```

## Patterns

### Letterbox Animation

Cinematic aspect ratio bars.

**CSS:**
```css
.letterbox {
  position: fixed;
  left: 0;
  right: 0;
  height: 0;
  background: black;
  z-index: 1000;
  transition: height 800ms cubic-bezier(0.4, 0, 0.2, 1);
  /* {motion.cinematic.letterbox.transition.normal} */
}

.letterbox-top {
  top: 0;
}

.letterbox-bottom {
  bottom: 0;
}

.cinematic-mode .letterbox {
  height: 12%; /* {motion.cinematic.letterbox.height.standard} */
}
```

**JavaScript:**
```javascript
function setLetterbox(height, duration = 800) {
  const bars = document.querySelectorAll('.letterbox');

  bars.forEach(bar => {
    bar.animate([
      { height: bar.style.height || '0' },
      { height: `${height}%` }
    ], {
      duration,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards'
    });
  });
}

// Cinematic mode on
setLetterbox(12);

// Back to full screen
setLetterbox(0);
```

### Fade to Black

Classic scene ending.

**CSS:**
```css
.fade-overlay {
  position: fixed;
  inset: 0;
  background: black;
  opacity: 0;
  pointer-events: none;
  z-index: 9999;
}

.fade-to-black .fade-overlay {
  animation: fade-black 1000ms ease-in forwards;
  /* {motion.cinematic.fade.to-black.normal} */
}

@keyframes fade-black {
  to { opacity: 1; }
}

/* With hold */
.fade-through-black .fade-overlay {
  animation:
    fade-black 1000ms ease-in forwards,
    hold 1000ms 1000ms forwards,
    fade-in 1000ms 2000ms ease-out forwards;
}

@keyframes hold {
  from, to { opacity: 1; }
}

@keyframes fade-in {
  to { opacity: 0; }
}
```

**JavaScript:**
```javascript
async function fadeToBlack(duration = 1000, hold = 1000) {
  const overlay = document.querySelector('.fade-overlay');

  // Fade out
  await overlay.animate([
    { opacity: 0 },
    { opacity: 1 }
  ], {
    duration,
    easing: 'ease-in',
    fill: 'forwards'
  }).finished;

  // Hold
  await new Promise(resolve => setTimeout(resolve, hold));

  // Fade back in
  await overlay.animate([
    { opacity: 1 },
    { opacity: 0 }
  ], {
    duration: duration * 0.8,
    easing: 'ease-out',
    fill: 'forwards'
  }).finished;
}
```

### Cross Dissolve

Blend between two scenes.

**CSS:**
```css
.dissolve-container {
  position: relative;
}

.dissolve-scene {
  position: absolute;
  inset: 0;
}

.dissolve-scene.outgoing {
  animation: dissolve-out 1000ms ease-in-out forwards;
  /* {motion.cinematic.cross-dissolve.normal} */
}

.dissolve-scene.incoming {
  animation: dissolve-in 1000ms ease-in-out forwards;
}

@keyframes dissolve-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes dissolve-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### Title Card

Centered title with fade.

**CSS:**
```css
.title-card {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: black;
  z-index: 1000;
}

.title-text {
  color: white;
  font-size: 4rem;
  font-weight: 300;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0;
  animation:
    title-in 800ms ease-out 500ms forwards,
    title-out 600ms ease-in 3300ms forwards;
  /* fade-in: {motion.cinematic.title-card.fade-in} */
  /* hold: {motion.cinematic.title-card.hold} */
  /* fade-out: {motion.cinematic.title-card.fade-out} */
}

@keyframes title-in {
  to { opacity: 1; }
}

@keyframes title-out {
  to { opacity: 0; }
}
```

**Multi-line with stagger:**
```javascript
function animateTitleCard(lines, container) {
  lines.forEach((line, i) => {
    const element = document.createElement('div');
    element.textContent = line;
    element.style.opacity = 0;
    container.appendChild(element);

    // Staggered fade in
    element.animate([
      { opacity: 0, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], {
      duration: 800, // {motion.cinematic.title-card.fade-in}
      delay: 500 + i * 200, // {motion.cinematic.title-card.stagger}
      easing: 'ease-out',
      fill: 'forwards'
    });
  });
}
```

### Lower Third

Name/title graphic bar.

**CSS:**
```css
.lower-third {
  position: fixed;
  bottom: 15%;
  left: 5%;
  transform: translateX(-100%);
  opacity: 0;
}

.lower-third.visible {
  animation: lower-third-in 400ms ease-out forwards;
  /* {motion.cinematic.lower-third.slide-in} */
}

.lower-third.exiting {
  animation: lower-third-out 300ms ease-in forwards;
  /* {motion.cinematic.lower-third.slide-out} */
}

@keyframes lower-third-in {
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes lower-third-out {
  to {
    transform: translateX(-50px);
    opacity: 0;
  }
}

.lower-third-bar {
  width: 4px;
  height: 100%;
  background: #3b82f6;
  margin-right: 16px;
}

.lower-third-name {
  font-size: 1.5rem;
  font-weight: 600;
}

.lower-third-title {
  font-size: 1rem;
  opacity: 0.8;
}
```

### Ken Burns Effect

Pan and zoom on still images.

**CSS:**
```css
.ken-burns {
  overflow: hidden;
}

.ken-burns img {
  animation: ken-burns 8000ms ease-in-out infinite alternate;
  /* {motion.cinematic.ken-burns.duration.normal} */
}

@keyframes ken-burns {
  from {
    transform: scale(1) translate(0, 0);
  }
  to {
    transform: scale(1.2) translate(-5%, -5%);
    /* {motion.cinematic.ken-burns.zoom-range.normal} */
  }
}
```

**JavaScript (Randomized):**
```javascript
function kenBurns(image, duration = 8000) {
  const zoomRange = 0.2; // {motion.cinematic.ken-burns.zoom-range.normal}
  const panRange = 10;

  // Random start and end states
  const startScale = 1 + Math.random() * zoomRange;
  const endScale = 1 + Math.random() * zoomRange;

  const startX = (Math.random() - 0.5) * panRange;
  const startY = (Math.random() - 0.5) * panRange;
  const endX = (Math.random() - 0.5) * panRange;
  const endY = (Math.random() - 0.5) * panRange;

  image.animate([
    { transform: `scale(${startScale}) translate(${startX}%, ${startY}%)` },
    { transform: `scale(${endScale}) translate(${endX}%, ${endY}%)` }
  ], {
    duration,
    easing: 'ease-in-out',
    fill: 'forwards'
  });
}
```

### Film Grain

Animated noise texture overlay.

**CSS:**
```css
.film-grain {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9998;
  opacity: 0.08; /* {motion.cinematic.film-grain.intensity.moderate} */
}

.film-grain::before {
  content: '';
  position: absolute;
  inset: -200%;
  background-image: url('data:image/svg+xml,...'); /* Noise pattern */
  animation: grain 50ms steps(1) infinite;
  /* {motion.cinematic.film-grain.speed} */
}

@keyframes grain {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-5%, -5%); }
  20% { transform: translate(5%, 5%); }
  30% { transform: translate(-10%, 5%); }
  40% { transform: translate(5%, -5%); }
  50% { transform: translate(-5%, 10%); }
  60% { transform: translate(10%, -5%); }
  70% { transform: translate(-5%, -10%); }
  80% { transform: translate(5%, 5%); }
  90% { transform: translate(-10%, -5%); }
}
```

### Vignette

Focus-drawing edge darkening.

**CSS:**
```css
.vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9997;
  background: radial-gradient(
    ellipse at center,
    transparent 0%,
    transparent 60%, /* {motion.cinematic.vignette.size.normal} */
    rgba(0, 0, 0, 0.4) 100% /* {motion.cinematic.vignette.intensity.moderate} */
  );
  transition: opacity 500ms;
  /* {motion.cinematic.vignette.transition} */
}
```

**Animated vignette:**
```javascript
function animateVignette(element, intensity, duration = 500) {
  element.animate([
    { opacity: 0 },
    { opacity: 1 }
  ], {
    duration,
    fill: 'forwards'
  });

  element.style.background = `radial-gradient(
    ellipse at center,
    transparent 0%,
    transparent 60%,
    rgba(0, 0, 0, ${intensity}) 100%
  )`;
}
```

### Speed Ramp

Variable speed playback.

**JavaScript:**
```javascript
class SpeedRamp {
  constructor(timeline, options = {}) {
    this.timeline = timeline;
    this.normalSpeed = options.normalSpeed || 1;
    this.slowSpeed = options.slowSpeed || 0.25;
    // {motion.cinematic.slow-motion.dramatic}
    this.rampDuration = options.rampDuration || 500;
    // {motion.cinematic.speed-ramp.ramp-duration.normal}
  }

  slowDown() {
    return this.rampTo(this.slowSpeed);
  }

  speedUp() {
    return this.rampTo(this.normalSpeed);
  }

  rampTo(targetSpeed) {
    const startSpeed = this.timeline.playbackRate;
    const startTime = performance.now();

    return new Promise(resolve => {
      const update = (time) => {
        const progress = Math.min((time - startTime) / this.rampDuration, 1);
        const eased = this.easeInOut(progress);

        this.timeline.playbackRate = startSpeed + (targetSpeed - startSpeed) * eased;

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(update);
    });
  }

  easeInOut(t) {
    return t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
}
```

### Flash Frame

Impact/transition flash.

**CSS:**
```css
.flash-frame {
  position: fixed;
  inset: 0;
  background: white;
  opacity: 0;
  pointer-events: none;
  z-index: 9999;
}

.flash-frame.flash {
  animation: flash 200ms ease-out;
  /* duration + recovery: {motion.cinematic.flash-frame.duration.single} + {motion.cinematic.flash-frame.recovery} */
}

@keyframes flash {
  0% { opacity: 0; }
  20% { opacity: 1; }
  100% { opacity: 0; }
}
```

## Reduced Motion

For `prefers-reduced-motion: reduce`:

| Full Motion | Reduced Alternative |
|-------------|---------------------|
| Letterbox animation | Instant letterbox |
| Fade transitions | Faster fade or cut |
| Ken Burns | Static image |
| Film grain | Static or disabled |
| Speed ramps | Normal speed only |

**Implementation:**
```css
@media (prefers-reduced-motion: reduce) {
  .letterbox {
    transition-duration: 0.01ms;
  }

  .ken-burns img {
    animation: none;
  }

  .film-grain::before {
    animation: none;
  }

  .fade-to-black .fade-overlay {
    animation-duration: 200ms;
  }
}
```

## Cross-References

- See `camera/` for camera movements
- See `compositing/` for layer effects
- See `blur/` for depth of field
- See `opacity/` for fade patterns

## References

- `references/film-techniques.md` — Cinematography techniques
