# cinematic-3d-story

A Claude skill for building cinematic, scroll-driven 3D story sites: a subject taken from
vision to completion (a building from blueprint to occupied top floor, a product from
sketch to use) as one continuous three.js world, shot with a real camera language and
dissolving into photoreal visualisations: "the model and the reality".

What it teaches Claude, all learned and measured on a real build:

- a scroll **story clock** that drives every state of the world, with shots as camera
  keyframes (position, look-at, focal length) on centripetal Catmull-Rom paths
- **Apple-style** chapter copy: sticky headlines, words that light up, figures that count
- a **camera language**: a lens per shot, focus pulls, drone sway and steadicam breath,
  letterbox, AgX tone mapping and a grade
- **real imagery**: CC0 HDRI skies with the scene's sun matched to the photographed sun,
  PBR textures in world space, scanned trees rendered to billboards, rigged animated figures
- **visualisation plates**: AI-generated stills (anchor-referenced for consistency) and
  scroll-scrubbed video the 3D dissolves into
- **performance** fixes for phones (cached idle reflection bakes, precompile and warm-up
  render, dirty-checked instance updates, render pause under plates)
- a **one-file build** that runs inside a claude.ai Artifact

## Install

Claude Code (as part of the qadri-3d plugin):
```
/plugin marketplace add qadri-uk/claude-skills
/plugin install qadri-3d@qadri-uk
```
Then ask for it by name (`/qadri-3d:cinematic-3d-story`) or describe the job ("a 3D landing
page that goes from plot of land to finished building").

Just this skill, anywhere skills are supported:
```
npx skills add qadri-uk/claude-skills --skill cinematic-3d-story --global -a claude-code -y
```
or copy this folder to `~/.claude/skills/cinematic-3d-story/`.

## Contents
- `SKILL.md` the workflow Claude follows
- `references/` story clock, camera, real assets, AI plates, performance, shipping
- `scripts/` asset fetching (Poly Haven), optimisation, billboard rendering, plate
  processing, scrub encoding, one-file bundling, chapter capture, performance probe
- `examples/meridian-house/` the complete reference engine and page (Astro 7 + three r181)

## Requirements
Node 22, three.js, Playwright with Chromium (for billboards and verification), ffmpeg (for
video), Python 3. Plates use the Canva MCP connector (`generate-image`, `create-design`,
`export-design`, optionally `create-video`); any image model works if you follow the same
anchor-reference method.

## Licence and credits
MIT (see LICENSE). Assets it fetches are CC0 from Poly Haven; the Xbot mannequin is from
the three.js examples (MIT; a Mixamo character). AI-generated images must be disclosed as
such on the page; the skill does this by default.
