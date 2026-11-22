# claude-skills

Personal Claude Code skill library: 777 vendored skills for UI/UX, motion, 3D, video,
components, databases, dashboards and SaaS, plus standing instructions that make
Claude use them proactively. Upstream skills are vendored with `scripts/vendor.mjs` from the sources in `vendor.json` (see Maintenance).

The skills are split into five Claude plugins under `plugins/`, plus gstack, which installs separately (below):

| Plugin | What it holds |
|---|---|
| `qadri-design` | Core. UI/UX design, research, design systems, accessibility and critique skills, plus the proactive-skills instructions (SessionStart hook) and the shadcn and chrome-devtools MCP servers. Install this one first. |
| `qadri-motion` | Motion, animation, 3D/WebGL, shaders, diagrams and video. |
| `qadri-3d` | Advanced 3D and imagery: Three.js graphics (atmosphere, ocean, clouds, procedural materials), particles, shader noise/SDF, post-processing, R3F, model-viewer/AR, Gaussian splats, 2.5D parallax, gradient and grain backgrounds. |
| `qadri-build` | React/Next.js, Vercel, Supabase, AI SDK, mobile, data viz, presentations, product management and marketing. |
| `superpowers` | [obra/superpowers](https://github.com/obra/superpowers) (MIT), vendored whole under its own name because its skills refer to each other as `superpowers:<skill>`: brainstorming, writing and executing plans, test-driven development, systematic debugging, verification before completion, requesting and receiving code review, git worktrees, parallel agents. Its SessionStart hook loads the `using-superpowers` rules into every session. |

## Install as plugins on your Claude account (claude.ai, desktop, Claude Code)
In claude.ai: **Customize > Plugins > Add > Add marketplace**, enter `qadri-uk/claude-skills`,
then install `qadri-design`, `qadri-motion`, `qadri-3d`, `qadri-build` and `superpowers`. Plugins on your account sync
to Claude Code when you are signed in with that account.

In Claude Code directly:
```
/plugin marketplace add qadri-uk/claude-skills
/plugin install qadri-design@qadri-uk
/plugin install qadri-motion@qadri-uk
/plugin install qadri-3d@qadri-uk
/plugin install qadri-build@qadri-uk
/plugin install superpowers@qadri-uk
```
Plugin skills are namespaced, e.g. `/qadri-motion:gsap-core`.

## gstack (installed by install.sh, not a plugin)

[garrytan/gstack](https://github.com/garrytan/gstack) (MIT) is 64 skills plus the runtime they call:
helper scripts in `bin/`, a Bun-built browser tool, hooks in `~/.claude/settings.json` and a
self-updater. Its skills call `~/.claude/skills/gstack/bin/...` by path, and the checkout is over
5,000 files, so it cannot be vendored into a plugin. `install.sh` installs Bun if needed, clones it
to `~/.claude/skills/gstack`, runs `./setup --prefix` (skills become `/gstack-review`, `/gstack-qa`,
`/gstack-ship`, `/gstack-office-hours` ...) and fetches the Chromium build its browser tool needs.
It keeps itself current (stable channel); `/gstack-upgrade` forces an update.

Setup also turns on three hooks: a one-line hint naming the gstack skill a prompt fits, a check
that a skill with required steps finished them, and a confirmation before destructive commands
(`rm -rf`, `DROP TABLE`, force-push). Turn one off with
`~/.claude/skills/gstack/bin/gstack-config set <skill_routing|skill_contracts|destructive_guard> off`.

## Install on any machine (desktop, laptop)
```bash
curl -fsSL https://raw.githubusercontent.com/qadri-uk/claude-skills/main/install.sh | bash
```
or without curl:
```bash
npx skills add qadri-uk/claude-skills --global -a claude-code -y --full-depth
```

## Claude Code cloud sessions (phone / web)
In claude.ai/code -> environment settings -> **Setup script**, paste:
```bash
curl -fsSL https://raw.githubusercontent.com/qadri-uk/claude-skills/main/install.sh | bash || true
```
The `|| true` matters: install.sh exits 1 when `skills add` only warns, and a failing setup
script stops the session from starting. Set network access to Full. Every new cloud session
then starts with all skills. Remote Control sessions use your local machine's skills, so they
are covered by the machine install above.

## Maintenance

`vendor.json` lists every upstream source with its licence, target plugin, the skills taken
from it and the exact upstream commit vendored (`sha`). Only add sources whose repository
has a real LICENSE file with a permissive licence (MIT preferred).

```bash
node scripts/vendor.mjs --check            # which upstreams have new commits (changes nothing)
node scripts/vendor.mjs mengto/skills      # re-vendor one source at upstream HEAD
node scripts/vendor.mjs                    # re-vendor everything
node scripts/vendor.mjs --lint             # claude.ai limits: 5,000 files / 200 MB per plugin,
                                           # descriptions <= 1024 chars, no angle brackets, unique names
```

Re-vendoring renames each skill to its directory name, strips nested plugin manifests,
copies the upstream LICENSE into each skill and fixes descriptions claude.ai would reject.
Review the diff before merging: an upstream change is new instructions for Claude.
The `Upstream skill updates` GitHub Action runs this monthly and opens a pull request.
If a plugin nears a limit, move a source to another plugin by changing its `plugin` field.

Skills written here rather than vendored: `scroll-story-site`, `web-video-backgrounds`
(qadri-motion), `website-type-playbooks`, `_proactive` (qadri-design).

## Update
`npx skills update -g` on each machine; cloud sessions always pull latest.

## Skills included

### qadri-design
- _proactive
- accessibility-agents
- accessibility-audit
- accessibility-catalogue
- accessibility-test-plan
- aesthetic-usability
- affinity-diagram
- ai-graphic-design-skill
- algorithmic-color-palette
- apple-hig-skills
- awwwards
- baseline-ui
- bencium-ux-designer
- better-colors
- better-interface
- better-layout
- better-typography
- better-ui
- brand-design-md
- brand-visual-language
- card-sort-analysis
- case-study
- claude-wireframe-skill
- claude2figma
- claudedesignskills
- click-test-plan
- color-expert
- color-mode-and-theme
- color-palette
- color-system
- color-theory-palette-harmony-expert
- component-spec
- concept-selection
- content-catalogue
- content-strategy
- conversational-ux
- critique-affordance
- critique-brand-consistency
- critique-color
- critique-composition
- critique-information-density
- critique-typography
- critique-visual-hierarchy
- dark-mode-design
- dark-mode-design-expert
- dark-pattern-audit
- design-auditor
- design-brief
- design-catalogue
- design-consultation
- design-critique
- design-debt-audit
- design-engineering-catalogue
- design-html
- design-impact-reporting
- design-lab
- design-md
- design-negotiation
- design-principles
- design-qa-checklist
- design-rationale
- design-review-garrytan
- design-review-process
- design-sprint
- design-sprint-plan
- design-system-adoption
- design-system-governance
- design-token
- design-token-audit
- design-tokens-skill
- design-with-claude
- designer-skills
- diary-study-plan
- distinctive-frontend
- doherty-threshold
- draw-ui
- dt-brutalist-industrial
- dt-cinematic-motion
- dt-corporate-trust
- dt-dark-tech
- dt-design-taste
- dt-editorial-minimal
- dt-japanese-minimal
- dt-neo-brutalism
- dt-playful-color
- dt-quiet-luxury
- dt-retro-print
- dt-taste-accessibility
- dt-taste-brand-identity
- dt-taste-code-craft
- dt-taste-code-review
- dt-taste-color
- dt-taste-design-review
- dt-taste-design-system
- dt-taste-gsap
- dt-taste-landing-page
- dt-taste-motion
- dt-taste-typography
- dt-taste-ux-copy
- dt-taste-web-performance
- elevation-and-depth
- empathy-map
- error-handling-ux
- experience-map
- extract-design-md
- extract-design-system
- feedback-patterns
- figma-catalogue
- figma-official-skills
- figma-skill
- figma-variables-tokens-generator
- fitts-law
- fixing-accessibility
- form-design
- frontend-design
- gesture-patterns
- glassmorphism
- google-fonts-skill
- hallmark
- handoff
- handoff-spec
- hero-section
- heuristic-evaluation
- hicks-law
- hig-doctor
- huashu-design
- icon-system
- icons
- illustration-illustration-bold-pop
- illustration-illustration-flat
- illustration-illustration-flat-with-black
- illustration-illustration-framed-panel
- illustration-illustration-grainy-gouache
- illustration-illustration-halftone-line
- illustration-illustration-ink-sketch
- illustration-illustration-isometric-mono
- illustration-illustration-line-interior
- illustration-illustration-one-line
- illustration-illustration-outlined-cartoon
- illustration-illustration-teal-spot
- illustration-illustration-two-colour-brush
- illustration-illustration-vintage-emblem
- illustration-style
- image-treatment
- impeccable
- information-architecture
- information-architecture-and-navigation
- interaction-design
- interface-design-dammyjay
- interfaces-that-feel
- interview-script
- jakobs-law
- jezweb-landing-page
- jobs-to-be-done
- journey-map
- landing-page-anatomy
- landing-page-design
- law-of-closure
- law-of-common-region
- law-of-continuity
- law-of-figure-ground
- law-of-proximity
- law-of-similarity
- layout-composition
- layout-grid
- liquid-glass-skill
- loading-states
- localization-design
- make-interfaces-better
- marketing-vs-product-system
- material-3-skill
- micro-interaction
- micro-interaction-spec
- millers-law
- mobile-app-design
- mobile-app-ui-design
- modern-web-design
- modular-scale-typography
- navigation-patterns
- neo-user-journey
- neobrutalist-web-designer
- oklch-skill
- onboarding-design
- open-design
- parallel-concepts
- pattern-library
- peak-end-rule
- plan-design-review
- platform-conventions
- platform-design-skills
- prototype-strategy
- qual-quant-triangulation
- readable-measure
- readydesign-skill
- research-repository
- responsive-design
- search-ux
- seo-local-business
- serial-position-effect
- service-blueprint
- sleek-design-mobile-apps
- software-ux-research
- spacing-system
- state-machine
- style-agentic
- style-ant
- style-artistic
- style-basic
- style-bento
- style-bold
- style-brutalism
- style-cafe
- style-claude
- style-claymorphism
- style-clean
- style-clean-enterprise
- style-codex
- style-colorful
- style-contemporary
- style-corporate
- style-cosmic
- style-creative
- style-cyberpunk-hud
- style-dithered
- style-doodle
- style-dramatic
- style-editorial
- style-enterprise
- style-expressive
- style-fantasy
- style-fiction
- style-flat
- style-friendly
- style-futuristic
- style-geometric
- style-gradient
- style-immersive
- style-levels
- style-linear-dark
- style-lingo
- style-material
- style-matrix
- style-minimal
- style-modern
- style-mono
- style-neo-brutalism
- style-neobrutalism
- style-neon
- style-neumorphism
- style-ops-terminal
- style-pacman
- style-paper
- style-perspective
- style-playful-creative
- style-power
- style-premium
- style-professional
- style-pulse
- style-quiet-minimal
- style-refined
- style-retro
- style-riso
- style-roku
- style-sega
- style-sketch
- style-skeumorphism
- style-sleek
- style-spacious
- style-spatial-glass
- style-square
- style-stitch
- style-storytelling
- style-terracotta
- style-tetris
- style-vibrant
- style-vintage
- style-warm-editorial
- styleseed
- summarize-interview
- superdesign-skill
- survey-design
- swiss-modern-web-designer
- tailwind-design-system
- tailwind-theme-builder
- taste-design
- taste-skill
- teslers-law
- test-scenario
- theming-system
- typography-expert
- typography-scale
- ui-craft
- ui-ux-pro-max
- usability-test-plan
- user-flow-diagram
- user-persona
- user-research-cookiy
- ux-designer-skill
- ux-ui-mastery
- ux-writing
- ux-writing-skill
- vaporwave-glassomorphic-ui-designer
- visual-design-foundations
- visual-hierarchy
- von-restorff-effect
- wcag-ai-skill
- wcag-audit-patterns
- web-cloud-designer
- web-design-engineer
- web-design-guidelines
- website-type-playbooks
- wireframe-skill
- wireframe-spec
- wireframer
- work-with-design-systems
- wpds
- zeigarnik-effect

### qadri-motion
- 60fps-animation
- accessible-animation
- add-shader-cursor-trail
- aframe-webxr
- after-effects
- algorithmic-art
- alpha-cutout
- ambient-section-particles
- anatomy
- animate-css-skill
- animate-skill
- animated-component-libraries
- animated-infographic
- animation-on-scroll
- animation-principles
- animation-systems
- animejs
- ascii-animation
- astro-view-transitions
- atmosphere-background
- awwwards-site-builder
- babylonjs-engine
- background-grid-webgl
- barba-js
- beat-sync-editing
- blender-web-pipeline
- brag
- brag-slim
- build-awwwards-quality-sites
- build-threejs-scroll-worlds
- canvas-design
- chart-animation
- cinematic-gsap-lenis-motion-system
- cinematic-scroll
- cinematic-scroll-storytelling
- color-motion
- color-oklch-palettes
- css-animation-skill
- css-scroll-driven-animations
- cursor-rig
- custom-cursor-systems
- design-motion-principles
- diagram-animation
- dimensional-drawing
- dither-background
- emil-animate
- emil-animate-expo
- emil-animation-performance
- emil-animation-vocabulary
- emil-apple-design
- emil-ask-sonner
- emil-break-ui
- emil-choreograph
- emil-emil-design-eng
- emil-find-animation-opportunities
- emil-gestures
- emil-improve-animations
- emil-learn-taste
- emil-mobile-native
- emil-pick-ui-library
- emil-prototype
- emil-remove-animations
- emil-review-animations
- emil-write-swift
- excalidraw-agents365
- excalidraw-diagram
- explainer-video
- exploded-view
- fal-ai-skills
- fixing-motion-performance
- frame-capture
- framer-motion
- framer-motion-core
- framer-motion-gestures
- framer-motion-layout
- framer-motion-react
- framer-motion-scroll
- framer-motion-variants
- generative-media-skills
- globe-particles
- gsap-astro
- gsap-core
- gsap-flip
- gsap-frameworks
- gsap-performance
- gsap-plugins
- gsap-react
- gsap-scroll-smoother
- gsap-scrolltrigger
- gsap-splittext-kinetic-type
- gsap-svg
- gsap-svg-draw-morph
- gsap-text
- gsap-timeline
- gsap-utils
- gsap-vanilla
- gsap-web
- hand-drawn-diagrams
- hero-gltf-product-showcase
- hero-gradient-mesh-aurora
- hero-liquid-distortion-image
- hero-loop-background
- hero-masked-video-type
- hero-noise-grain-cinematic
- hero-tilt-3d-layers
- hero-video-scrub-apple
- hero-webgl-shader-fullscreen
- horizontal-scroll-scenes
- huashu-art-motion
- hyperframes
- image-sequence-scrubbing
- isometric-animation
- lenis-smooth-scroll
- lightweight-3d-effects
- locomotive-scroll
- logo-animation
- logo-designer-skill
- lottie-animation
- lottie-animations
- magnetic-cursor-interactions
- marquee-infinite-ticker
- marquee-loop
- masked-reveal
- mesh-gradient-dark-blue-clean
- motion
- motion-agent-cinematic
- motion-agent-microstate
- motion-agent-reveals
- motion-agent-scrollytelling
- motion-agent-ui-micro
- motion-art-direction
- motion-assets
- motion-background
- motion-catalogue
- motion-design-skill
- motion-framer
- motion-system
- motion-ui
- narrative-scrollytelling
- noise-grain-texture
- ogl-lightweight-webgl
- oil-motion
- p5js-hermes
- page-transition-animation
- page-transition-choreography
- paper-cinder-transition
- parallax-depth-systems
- particle-system
- pixel2motion
- pixijs-2d
- playcanvas-engine
- presentation-video
- progressive-blur
- react-spring-physics
- react-three-fiber
- remotion
- remotion-best-practices
- remotion-captions
- remotion-create
- remotion-docs
- remotion-interactivity
- remotion-license
- remotion-maps
- remotion-markup
- remotion-multimedia
- remotion-render
- remotion-saas
- remotion-studio
- remotion-upgrade
- remotion-video
- reveal-hover-effect
- rive-interactive
- scroll-audit
- scroll-chapter-pinned-story
- scroll-film
- scroll-lenis-gsap-integration-harness
- scroll-mobile-performance-strategy
- scroll-native-css-timeline-page
- scroll-parallax-layers-depth
- scroll-progress-timeline
- scroll-reveal-libraries
- scroll-reveal-video
- scroll-scrubbed-visual-sequence
- scroll-scrubbed-word-reveal
- scroll-shader-transition-sections
- scroll-story-site
- scroll-text-highlight-reading
- scroll-video-chapters
- scroll-video-website
- scroll-world
- scroll-world-storytelling
- semantic-micro-interactions
- shader-dev
- shader-glsl
- shader-postprocessing
- shaders-cursor-ripples
- shot-composition
- spline-interactive
- staggered-word-reveal
- sticky-pinning-sequences
- substance-3d-texturing
- svg-animation
- text-scramble-decode
- theatre-js
- threejs-agents-model-optimizer
- threejs-agents-scene-builder
- threejs-animation
- threejs-asset-pipeline
- threejs-core-math
- threejs-core-raycaster
- threejs-core-renderer
- threejs-core-scene-graph
- threejs-ecs-ts
- threejs-errors-performance
- threejs-errors-rendering
- threejs-fundamentals
- threejs-geometry
- threejs-impl-animation
- threejs-impl-audio
- threejs-impl-drei
- threejs-impl-ifc-viewer
- threejs-impl-lighting
- threejs-impl-physics
- threejs-impl-post-processing
- threejs-impl-react-three-fiber
- threejs-impl-shadows
- threejs-impl-webgpu
- threejs-impl-xr
- threejs-interaction
- threejs-lighting
- threejs-loaders
- threejs-materials
- threejs-performance
- threejs-postprocessing
- threejs-react-three-fiber
- threejs-scene
- threejs-shaders
- threejs-syntax-controls
- threejs-syntax-geometries
- threejs-syntax-loaders
- threejs-syntax-materials
- threejs-syntax-shaders
- threejs-textures
- threejs-webgl
- view-transitions-api
- web-animation-view-transitions
- web-video-backgrounds
- web3d-integration-patterns
- webgl-3d-object
- webgl-landing-steering
- webgpu-claude-skill
- whiteboard-animation
- wiggle-claude-skill
- wrapped-video

### qadri-3d
- 360-product-spin
- 3d-3d-cloth-material
- 3d-3d-falling-leaves
- 3d-3d-four-seasons
- 3d-3d-high-poly-models
- 3d-3d-high-resolution-textures
- 3d-3d-metal-material
- 3d-3d-orbit-inspect-demo
- 3d-3d-paper-material
- 3d-3d-retina-resolution
- 3d-3d-sky-background
- 3d-3d-sky-rays
- 3d-3d-ultra-realistic-water
- 3d-3d-underwater-god-rays
- 3d-3d-virtual-tour
- 3d-3d-wood-lighting-scorecard
- 3d-3d-wood-material
- 3d-asset-optimization
- atmosphere-shader
- gradient-mesh
- grainient
- model-viewer-ar
- particles-gpu
- particles-lifecycle
- particles-physics
- particles-router
- postfx-bloom
- postfx-composer
- postfx-effects
- postfx-router
- product-configurator
- r3f-drei
- r3f-fundamentals
- r3f-geometry
- r3f-materials
- r3f-performance
- r3f-router
- shader-effects
- shader-fundamentals
- shader-noise
- shader-router
- shader-sdf
- threejs-atmosphere-aerial-perspective
- threejs-bloom
- threejs-camera-direction
- threejs-exposure-color-grading
- threejs-image-pipeline
- threejs-parallax
- threejs-parallax-occlusion-mapping
- threejs-precipitation-surfaces
- threejs-procedural-animation
- threejs-procedural-architecture
- threejs-procedural-fields
- threejs-procedural-geometry
- threejs-procedural-materials
- threejs-procedural-planets
- threejs-procedural-vegetation
- threejs-procedural-vfx
- threejs-product-viewer
- threejs-raymarched-space-effects
- threejs-screen-space-ambient-occlusion
- threejs-shadow-systems
- threejs-skill-router
- threejs-spectral-ocean
- threejs-splats
- threejs-temporal-surfaces
- threejs-visual-validation
- threejs-volumetric-clouds
- threejs-water-optics
- web3d-model-viewer
- webgl-components

### qadri-build
- a-b-test-design
- addyosmani-quality
- agent-harness-review
- ai-app
- ai-elements
- ai-sdk
- ai-sdk-6
- ai-sdk-7
- anthropics-skills
- antvis-chart-skills
- api-design-reviewer
- assimovt-productskills
- behavioural-analytics
- bi-builder
- building-components
- business-design
- cache-components
- callstack-agent-skills
- career-copywriting
- cc-slidev
- chadboyda-gtm
- chrome-devtools
- ci-cd-pipeline-builder
- claud3
- claude-pm-skills
- cloudflare-web-perf
- competitive-analysis
- components
- composio-artifacts
- copywriting-skill
- coreyhaines-marketing
- creative-director
- d3js-skill
- data-analysis-skill
- data-visualization
- data-viz-agent
- database-schema-designer
- deanpeters-pm-skills
- deploy-to-vercel
- design-for-ai
- digidai-pm
- documentation-template
- email-html-mjml
- enhance-prompt
- expo-skills
- find-skills
- fix
- format-storybook
- french-copywriting
- frontend-dev
- frontend-slides
- go
- google-stitch-skills
- guizang-ppt
- hetzner-cloud
- html-ppt
- humanize-ppt
- humanize-text
- ink-google
- kami
- lenny-skills
- magic-ui
- markdown-viewer-skills
- marp-slide-quality
- marp-slides
- mastepanoski-skills
- metrics-definition
- microsoft-skills
- naming-convention
- nanobanan-ppt
- next-best-practices
- nextjs-chatbot
- nextjs-seo
- nextjs-shadcn
- nimbalyst-skills
- north-star-vision
- openai-agents-sdk
- openai-skills
- opportunity-framework
- phuryn-pm-skills
- pm-skills
- postgres-semantic-search
- presentation-deck
- product-position
- react-best-practices
- react-doctor
- react-vite-dashboard
- revealjs-skill
- saas-scaffolder
- seo-copywriting
- shadcn
- shadcn-component-discovery
- shadcn-component-review
- shadcn-ui
- simota-agent-skills
- site-check
- site-md
- skill-creator
- slidev-skill
- social-copywriting
- softaworks-agent-toolkit
- software-mansion-skills
- stakeholder-alignment
- stitch-code-to-design
- stitch-extract-design-md
- stitch-extract-static-html
- stitch-generate-design
- stitch-loop
- stitch-manage-design-system
- stitch-react-components
- stitch-react-native
- stitch-upload-to-stitch
- stripe-integration-expert
- supabase
- supabase-postgres-best-practices
- swiftui-claude-skills
- swiftui-design-skill
- swiftui-patterns
- taste-design-stitch
- team-workflow
- textual-tui-skill
- tone-of-voice
- tui-design-skill
- vercel-cli-with-tokens
- vercel-composition-patterns
- vercel-optimize
- vercel-react-best-practices
- vercel-react-native-skills
- vercel-react-view-transitions
- vercel-skills
- version-control-strategy
- web-artifacts-builder
- webapp-testing
- wondelai-skills
- writing-guidelines
