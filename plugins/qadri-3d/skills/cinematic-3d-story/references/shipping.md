# Shipping

## As a static site
Engine modules under `src/lib/three/`, assets under `public/<project>/` (WebP textures,
meshopt `.glb`, `.hdr`, plates under `plates/`). Dynamic-import the engine so the page's
HTML and copy are interactive before three.js arrives. Mark the page `noindex` if the
project is fictional.

## As a claude.ai Artifact (to view on a phone, or share privately)
An Artifact serves the page inside a sandboxed frame where **relative URLs to published
side files do not resolve**: a multi-file publish shows the copy but a blank canvas and no
images. Publish ONE self-contained HTML file instead:

```bash
python3 scripts/bundle-single-file.py \
  --page dist/meridian-house/index.html --dist dist \
  --entry /path/to/entry.ts --assets public/meridian --plates public/meridian/plates \
  --out /tmp/out/index.html
```
It: bundles the page script and engine with esbuild as one IIFE (no dynamic imports),
inlines the CSS, embeds assets as data URIs on `window.__MH_ASSETS` (the asset loader
prefers them), embeds plates as data URIs (1920 only, `srcset` dropped), strips site
widgets that need a backend, and rewrites site links to absolute URLs.

The entry is the page's own `<script>` with the dynamic import replaced by a static one:
```ts
import * as towerMod from '/abs/path/src/lib/three/tower';
// ... page script ...
Promise.resolve(towerMod).then(({ mount }) => { /* same as the site */ });
```
Limits: 16 MB per page (data URIs count). The reference build was 10.5 MB with 9 plates.
Check it in a local browser (`file://`) before publishing; then publish with the Artifact
tool and give the user the link. Republish the same file path to keep the URL.
