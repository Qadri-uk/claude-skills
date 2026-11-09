# claude-skills

Personal Claude Code skill library: 467 vendored skills for UI/UX, motion, 3D, video,
components, databases, dashboards and SaaS, plus standing instructions that make
Claude use them proactively. Built by build-skills-repo.sh; re-run it to refresh.

The skills are split into three Claude plugins under `plugins/`:

| Plugin | What it holds |
|---|---|
| `qadri-design` | Core. UI/UX design, research, design systems, accessibility and critique skills, plus the proactive-skills instructions (SessionStart hook) and the shadcn and chrome-devtools MCP servers. Install this one first. |
| `qadri-motion` | Motion, animation, 3D/WebGL, shaders, diagrams and video. |
| `qadri-build` | React/Next.js, Vercel, Supabase, AI SDK, mobile, data viz, presentations, product management and marketing. |

## Install as plugins on your Claude account (claude.ai, desktop, Claude Code)
In claude.ai: **Customize > Plugins > Add > Add marketplace**, enter `qadri-uk/claude-skills`,
then install `qadri-design`, `qadri-motion` and `qadri-build`. Plugins on your account sync
to Claude Code when you are signed in with that account.

In Claude Code directly:
```
/plugin marketplace add qadri-uk/claude-skills
/plugin install qadri-design@qadri-uk
/plugin install qadri-motion@qadri-uk
/plugin install qadri-build@qadri-uk
```
Plugin skills are namespaced, e.g. `/qadri-motion:gsap-core`.

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
- apple-hig-skills
- awesome-design-skills
- awwwards
- baseline-ui
- bencium-ux-designer
- brand-design-md
- card-sort-analysis
- case-study
- claude-wireframe-skill
- claude2figma
- claudedesignskills
- click-test-plan
- color-expert
- color-system
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
- emilkowalski-skill
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
- heuristic-evaluation
- hicks-law
- hig-doctor
- huashu-design
- icon-system
- icons
- illustration-style
- impeccable
- information-architecture
- information-architecture-and-navigation
- interaction-design
- interface-design-dammyjay
- interfaces-that-feel
- interview-script
- jakobs-law
- jobs-to-be-done
- journey-map
- law-of-closure
- law-of-common-region
- law-of-continuity
- law-of-figure-ground
- law-of-proximity
- law-of-similarity
- layout-grid
- liquid-glass-skill
- loading-states
- localization-design
- make-interfaces-better
- material-3-skill
- micro-interaction
- micro-interaction-spec
- millers-law
- mobile-app-design
- mobile-app-ui-design
- modern-web-design
- navigation-patterns
- neo-user-journey
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
- serial-position-effect
- service-blueprint
- sleek-design-mobile-apps
- software-ux-research
- spacing-system
- state-machine
- styleseed
- summarize-interview
- superdesign-skill
- survey-design
- taste-design
- taste-skill
- teslers-law
- test-scenario
- theming-system
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
- visual-hierarchy
- von-restorff-effect
- wcag-ai-skill
- wcag-audit-patterns
- web-design-guidelines
- wireframe-skill
- wireframe-spec
- wireframer
- work-with-design-systems
- wpds
- zeigarnik-effect

### qadri-motion
- 60fps-animation
- accessible-animation
- aframe-webxr
- after-effects
- algorithmic-art
- alpha-cutout
- anatomy
- animate-css-skill
- animate-skill
- animated-component-libraries
- animated-infographic
- animation-principles
- animejs
- ascii-animation
- babylonjs-engine
- barba-js
- beat-sync-editing
- blender-web-pipeline
- brag
- brag-slim
- canvas-design
- chart-animation
- cloudai-threejs
- color-motion
- css-animation-skill
- cursor-rig
- design-motion-principles
- diagram-animation
- dimensional-drawing
- excalidraw-agents365
- excalidraw-diagram
- explainer-video
- exploded-view
- fal-ai-skills
- fixing-motion-performance
- frame-capture
- framer-motion
- framer-motion-skills
- generative-media-skills
- gsap-core
- gsap-frameworks
- gsap-performance
- gsap-plugins
- gsap-react
- gsap-scrolltrigger
- gsap-skills
- gsap-timeline
- gsap-utils
- gsap-web
- hand-drawn-diagrams
- huashu-art-motion
- hyperframes
- isometric-animation
- lightweight-3d-effects
- locomotive-scroll
- logo-animation
- logo-designer-skill
- lottie-animation
- lottie-animations
- motion
- motion-art-direction
- motion-assets
- motion-background
- motion-catalogue
- motion-design-skill
- motion-framer
- motion-system
- motion-ui
- oil-motion
- p5js-hermes
- page-transition-animation
- particle-system
- pixel2motion
- pixijs-2d
- playcanvas-engine
- presentation-video
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
- rive-interactive
- scroll-film
- scroll-reveal-libraries
- scroll-world
- shader-dev
- shader-glsl
- shot-composition
- spline-interactive
- substance-3d-texturing
- svg-animation
- threejs-agents-model-optimizer
- threejs-agents-scene-builder
- threejs-animation
- threejs-asset-pipeline
- threejs-claude-skill-package
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
- web3d-integration-patterns
- webgpu-claude-skill
- whiteboard-animation
- wiggle-claude-skill
- wrapped-video

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
