# Changelog

All notable changes to this project are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0] - 2026-11-08

> **npm and GitHub differ for 1.2.0.** `components-skill@1.2.0` on npm was published
> on 2026-11-08 from commit `a1cdca6`, so it already contains everything below except
> the `CreativesLibrary` package links. The `v1.2.0` GitHub release is the older
> 2026-08-30 snapshot and has none of it. From 1.3.0 the two match again.

### Added
- `components-skill verify <file>` checks an adapted component in the project it
  landed in: leftover hex and default-palette colors, a reduced-motion guard, a
  typecheck with the project's own compiler and tsconfig, and a smoke-render with its
  own esbuild and React. A check whose tool is missing reports `skip`, never a pass
  (#65).
- `components-skill list` shows every agent's install, in the project and the user
  config dir, as not installed, up to date, outdated, or newer, and counts locally
  edited files (#78).
- `components-skill add --dry-run` prints every file a real install would write and
  writes nothing (#77).
- `components-skill search --json` prints results for agents to read, and
  `--framework react|vue|svelte` searches the ports, composing with `--library`
  (#75, #76).
- Fetch method `registry_item`, for a registry whose JSON is sound but whose files no
  CLI places correctly: fetch the item and write each file to its target (#66).
- `fetch.pin` on the 39 refs whose registry JSON is committed on GitHub: the commit
  it matches and a hash of its canonical JSON, written by `scripts/pin-registry.py`.
  `fetch.url` stays live, and `health-check.py` reports a ref that no longer matches
  as `drifted` (#64).
- `health-check.py` writes `health-report.json` beside the markdown report, with the
  schema in `references/health-report-schema.md` (#83).
- Gallery: live search, library and framework filters kept in the URL, `#showpiece-<id>`
  deep links, a copy button per card, a light theme, a "Pause animations" toggle that
  honours `prefers-reduced-motion`, a last-verified date per card, and an accessibility
  pass (#68, #69, #70, #71, #72, #73, #74, #84).
- `scripts/test_validate.py`, run in CI, covers the validator, including that an entry
  with no license fails (#82).
- All nine `frameworks.svelte` entries are now genuinely verified, not just
  listed: `smoke-test.mjs` fetches each Svelte Bits registry item directly,
  places the file where SvelteKit's own `$lib` alias actually resolves it,
  renders it in a throwaway route, and runs a real SvelteKit build.
  `--framework svelte --all-variants` runs all nine on schedule. This bypasses
  `fetch.cli` entirely for Svelte: `shadcn`, `shadcn-svelte`, and jsrepo
  (Svelte Bits' own documented method) were each tried by hand against a real
  SvelteKit project first and each mis-resolves this registry's `$lib/`-rooted
  target paths a different way.
- `components-skill tokens [path]`: reads a target project's brand tokens
  (CSS custom properties, a Tailwind v4 `@theme` block, or a best-effort
  `tailwind.config.*` read) into one comparable structure, with `--json` for
  machine consumption. `references/adaptation.md` § 1 has always told an
  agent to find and map a project's tokens by eye; this is the first thing
  that actually reads them.
- Multi-framework rollout, completing #13's pilot (#55). 31 framework variants across
  three new sources, every one verified individually rather than mapped by pattern:
  - **Svelte**, via **Svelte Bits** (official ReactBits port, same author): all 9
    ReactBits entries.
  - **Vue**, via **Vue Bits**: the 8 remaining ReactBits entries, joining the
    `split-text` pilot.
  - **Vue**, via **Inspira UI** (MIT; its README records Aceternity's permission to
    adapt the designs): 4 of 9 Aceternity entries and all 9 Magic UI entries. The
    Magic UI half was not in #55's plan, which recorded no viable Vue path for that
    library; Inspira UI ports both, so the same verification pass covered both.
- Structured `fetch` object (`method`, `cli`, `url`) on every showpiece entry and
  framework variant (#47). `ref` stays as the human- and agent-facing command string,
  but `smoke-test.mjs`, `health-check.py` and `gallery/scripts/fetch-showpieces.mjs`
  now read named fields instead of each re-deriving a URL and CLI by regex, and
  `validate.py` fails the build if the two ever disagree.
- `health-check.py` probes framework-variant refs. They point at entirely different
  registries, so a healthy React ref said nothing about them; with 31 variants that
  was a blind spot the size of the rollout.
- Gallery preview coverage (#62): the showpiece showcase grew from 4 to 22 rendered
  previews. The live-fetched sample now spans 13 entries (8 new lightweight effects:
  `spotlight`, `background-beams`, `shimmer-button`, `meteors`, `animated-shiny-text`,
  `dock`, `count-up`, `decrypted-text`), and the 10 entries that cannot be fetched
  cheaply - WebGL/canvas-class effects plus the challenge-blocked `texture-card` (#31) -
  are shown as hand-authored static CSS/SVG previews instead of placeholders or a bare
  gap. See `docs/previews-audit.md` for the audit behind the change.

### Changed
- `components-skill tokens` names a `tailwind.config.*` it could not read, instead of
  returning an empty set that looks like a project with no colors. `--json` keeps
  stdout parseable and sends the warning to stderr (#79).
- `validate.py` reports a duplicate name with the line of every copy (#81).
- Dependabot groups GitHub Actions bumps into one weekly PR (#89).
- The npm package's homepage, repository, and issue links, and its README, point at
  `CreativesLibrary/Components`, where the repository now lives.
- `smoke-test.mjs` installs an entry's declared `deps` before building, so `deps` is
  now proven rather than asserted. Inspira UI forced this: every component imports
  `@inspira-ui/plugins` for `cn()` and its registry items declare no dependencies at
  all, so the build fails without the curated entry. Package names are validated
  against a strict pattern first, since `deps` is contributor-editable data on a job
  that runs on `pull_request`.
- A declared dep absent from the registry's own `dependencies` no longer warns as
  drift. Now that the build installs and compiles it, its presence is proven
  necessary; only deps that could not be installed as written (free-text like
  `"varies per component"`) are reported as unverifiable.
- `--diff` selects entries whose `fetch` **or** `deps` changed, not just `ref`, since
  a dep change now changes what the job proves.
- `gallery/scripts/fetch-showpieces.mjs` fails the build if any entry in
  `CURATED`/`STATIC_PREVIEW` lacks a matching `Demo<Name>.tsx`, so the fetch list and
  the demo components can no longer silently drift (#62).
- `layouts[]` now records an explicit `"preview": "none"` instead of `null`, and the
  gallery shows the intent (#62).
- The smoke-test workflow's PR-comment step skips fork PRs instead of failing the job.
  A `pull_request` from a fork always runs with a read-only token, so posting the
  results comment 403'd and turned a passed check red; fork contributors still get
  full results in the run log and job summary.

### Fixed
- All nine Svelte Bits variants told users to run `npx shadcn add`, which writes a
  literal `src/$lib/` directory. They now use `registry_item` (#66).
- The Svelte smoke test failed on current SvelteKit, which removed the `$lib` alias.
  It now imports the fetched files by relative path, and fails a Svelte variant whose
  fetch method is not `registry_item`.
- A missing gallery demo crashed `fetch-showpieces.mjs` with a `ReferenceError` instead
  of naming the `Demo<Name>.tsx` to add.

## [1.2.0] - 2026-08-30

### Added
- `components-skill search <query>`: offline lookup of showpiece/fallback entries by
  name, alias, effect, or library, plus `--library` to narrow it. Reads the same
  bundled `components.json` as `add` (#11).
- `component-smoke-test.yml` now also smoke-tests the showpiece entries a PR itself
  adds or changes (`scripts/smoke-test.mjs --diff`), not just the fixed curated
  sample, and posts the combined results as a sticky PR comment instead of leaving
  them in the CI log only (#12).
- Multi-framework pilot (#13): showpiece entries may now carry an optional
  `frameworks` object for a non-React port of the same effect. One real entry,
  `split-text` -> `frameworks.vue` -> Vue Bits' `SplitText`, verified end-to-end
  (live `npx shadcn-vue@latest add`, real `vue-tsc -b && vite build`).
  `validate.py` and `scripts/smoke-test.mjs --framework <name>` both understand
  the new field; the weekly schedule run smoke-tests the pilot entry. Still a
  React + Tailwind registry otherwise - see README "Framework variants".

- `scripts/health-check.py`: HEAD requests instead of full GETs where possible, per-host
  concurrency instead of one fixed delay serializing all 45+ targets (#36). A 429's body
  is now sniffed for Vercel's Attack Challenge Mode markers and reported as its own
  `challenged` status, distinct from a real `rate-limited` (#34). 21st.dev page-fetch
  entries' hand-typed URLs are now auto-derived from the registry's own 403 body and
  diffed against what's stored (#40).
- `components.json`'s new `known_issues[]` array centralizes the cult-ui workaround that
  `health-check.py`, `smoke-test.mjs`, and `gallery/scripts/fetch-showpieces.mjs` each used
  to hand-maintain separately (#45).
- `scripts/smoke-test.mjs`: TS strictness relaxation scoped to only the entries that need
  it instead of repo-wide (#44). Declared `deps` are now cross-checked against the
  registry item's own `dependencies` array as a soft warning (#53).
- `.github/`: `CODEOWNERS` + path-based PR auto-labeling (#51). CI guard on `docs/media`
  binary size (#42).
- `references/adaptation.md`: explicit checklist, leading with `prefers-reduced-motion`
  (#43). New `references/conventions.md` documents per-library fetched file-path and
  export-shape conventions, verified against a real fetch per library (#48).
- 3 showpiece aliases sharpened where token-overlap analysis found genuine matching
  ambiguity, not just shared generic words (#39).
- **Layout browsing layer**: new `layouts[]` array composing existing `showpiece[]` entries (or, for
  video, patterns proven in the separate `vidstudio`/`openvidstudio` pipeline) into full page/scene
  arrangements an agent can browse and pick, instead of one effect at a time. Two web layouts, five video
  layouts. `TASTE.md` (new, repo root) is the required-reading curation standard for picking or composing
  one, with a pointer table to compatible third-party Claude Code skills - no third-party content
  reproduced, pointer-only. Wired into `gallery/` as a new "Layouts" tab alongside the existing showpiece
  grid, and into every `dist/` agent bundle via `scripts/build-agent-dirs.sh`.

### Fixed
- `code_libraries[]`'s `reactbits` entry still declared plain `MIT`; the earlier per-entry license
  correction only touched the 9 showpiece entries, not this row (closed alongside the multi-framework
  pilot work).

## [1.1.1] - 2026-07-31

### Fixed
- LICENSE: stripped a stray trailing note that broke GitHub's license auto-detector
  (was showing "Other" instead of Apache-2.0); the info already lives in
  ATTRIBUTION.md/README.
- `validate.yml` only checked `name` and `ref` on `fallback_basic` entries, so a
  fallback could ship with no license and pass CI; both arrays now get the same
  required-field check (#26).
- `validate.yml` never checked an entry's `library` against `code_libraries[]`, so a
  typo like `aceternety` passed silently. Showpieces are now checked; fallbacks stay
  exempt, since `shadcn`/`tremor` are deliberately not `code_libraries` entries (#27).
- `new_component.yml`'s library dropdown offered 4 options and was missing Magic UI,
  Cult UI, ReactBits and 21st.dev, forcing the common case into "other" (#24).
- `bug_report.yml` referenced `adapt_rules`, a field the flat schema no longer has (#25).
- `SECURITY.md` still declared `v0.x` as the supported line (#22).

### Added
- SKILL.md: explicit Limitations section (stack constraints, no vendoring, per-source
  license verification, design-quality handoff).
- README: link SECURITY.md from the contributing section, add stars/last-commit badges.
- `.editorconfig` (flagged optional in OSS audits).
- README: PowerShell install commands alongside the bash ones (#28).
- `references/live-fetch.md`: `reactbits.dev` and `kokonutui.com` added to the official
  registry allowlist; both are first-party hosts in `code_libraries[]` (#29).

### Changed
- README demo refreshed to the current workflow clip, with the source mp4 alongside it.

## [1.1.0] - 2026-07-20

### Added
- **ReactBits `splash-cursor`** showpiece entry: interactive WebGL fluid-simulation that
  splashes flowing color trails following the cursor. Self-contained WebGL2, zero npm deps,
  MIT. Registry: `npx shadcn@latest add "https://reactbits.dev/r/SplashCursor-TS-TW"`.

### Changed
- CI: bump `actions/checkout` from v6 to v7
  ([#15](https://github.com/AnayDhawan/Components/pull/15)).

## [1.0.0] - 2026-07-16

All five wired source libraries are now curated - the v1.0.0 milestone. The registry grows
from 18 to 38 showpiece entries, every one with a verified fetch path, license, and exact
dependency list.

### Added
- **ReactBits curation** (8 entries): split-text, blur-text, decrypted-text, count-up,
  aurora, particles-webgl, hyperspeed, letter-glitch
  ([#6](https://github.com/AnayDhawan/Components/issues/6)).
- **Cult UI curation** (6 entries): dynamic-island, shader-lens-blur, canvas-fractal-grid,
  texture-card, typewriter, animated-number
  ([#5](https://github.com/AnayDhawan/Components/issues/5)).
- **21st.dev curation + per-component license tracking** (6 entries): shape-landing-hero,
  matrix-text, beams-background, background-paths, v0-ai-chat (KokonutUI), and
  cobe-globe-interactive (shuding). 21st.dev has no blanket license, so each entry carries
  its own license verified against the upstream source repo
  ([#7](https://github.com/AnayDhawan/Components/issues/7)).
- KokonutUI and cobe upstream attribution rows in `ATTRIBUTION.md`.

### Changed
- ReactBits source row corrected: ReactBits now ships a shadcn registry
  (`reactbits.dev/r/<Name>-TS-TW`), replacing the stale jsrepo-only note. Invalid names
  return HTTP 200 HTML, so validation checks the response body, not the status code.
- 21st.dev source row documents that the registry endpoint now requires an account/API key;
  curated entries use the author's open registry mirror (kokonutui.com) or the public
  component page via WebFetch/Playwright.

[1.3.0]: https://github.com/CreativesLibrary/Components/releases/tag/v1.3.0
[1.2.0]: https://github.com/AnayDhawan/Components/releases/tag/v1.2.0
[1.1.0]: https://github.com/AnayDhawan/Components/releases/tag/v1.1.0
[1.0.0]: https://github.com/AnayDhawan/Components/releases/tag/v1.0.0
