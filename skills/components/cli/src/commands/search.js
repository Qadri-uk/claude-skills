import { readFileSync } from "node:fs";
import { join } from "node:path";

import { distRoot } from "../lib/dist.js";

/**
 * The registry bundled inside dist/. Every agent's copy is byte-identical
 * (build-agent-dirs.sh stamps the same components.json into each one), so any
 * single bundle is a fine read-only source for search.
 */
function loadRegistry() {
  const path = join(distRoot(), ".claude", "skills", "components", "components.json");
  return JSON.parse(readFileSync(path, "utf8"));
}

function haystacks(entry) {
  return [entry.name, entry.library, entry.effect, ...(entry.aliases || [])]
    .filter(Boolean)
    .map((s) => s.toLowerCase());
}

/**
 * Every query term must match something (AND across terms), against any field
 * (OR within a term). A name or alias hit ranks above an effect-prose hit, so
 * "marquee" surfaces the entry named marquee before one that merely mentions it.
 */
function matchScore(entry, terms) {
  const hay = haystacks(entry);
  let score = 0;
  for (const term of terms) {
    if (entry.name?.toLowerCase().includes(term)) score += 3;
    else if ((entry.aliases || []).some((a) => a.toLowerCase().includes(term))) score += 2;
    else if (hay.some((h) => h.includes(term))) score += 1;
    else return 0;
  }
  return score;
}

/**
 * Project an entry onto one framework. React is the top-level entry itself;
 * any other framework swaps in that variant's fetch/license surface and keeps
 * the parent's name, aliases, and effect, the same inheritance validate.py
 * documents for `frameworks.<name>`.
 */
function forFramework(entry, framework) {
  if (framework === "react") return { ...entry, framework: "react" };
  const v = entry.frameworks?.[framework];
  if (!v) return null;
  return {
    ...entry,
    library: v.library,
    ref: v.ref,
    fetch: v.fetch,
    license: v.license,
    deps: v.deps,
    framework,
    reactLibrary: entry.library,
  };
}

/** Every framework the registry carries: React, plus each `frameworks` key in use. */
export function knownFrameworks(data = loadRegistry()) {
  const out = new Set(["react"]);
  for (const e of data.showpiece || []) for (const fw of Object.keys(e.frameworks || {})) out.add(fw);
  return [...out];
}

/**
 * Search showpiece + fallback entries by name, alias, effect, or library.
 * Returns entries sorted best-match first, each tagged with `kind` so callers
 * can tell a live-fetched showpiece from a plain fallback, and `framework`.
 *
 * `opts.framework` picks which port to search (default react). A non-React
 * framework only returns showpieces that carry that variant, reporting the
 * variant's library and ref; fallbacks are shadcn React only. `opts.library`
 * is applied after that projection, so the two compose:
 * `--framework vue --library inspira-ui` means Inspira UI's Vue ports.
 */
export function search(query, opts = {}) {
  const q = (query || "").trim().toLowerCase();
  if (!q) throw new Error("search needs a query, e.g. `components-skill search marquee`");
  const terms = q.split(/\s+/).filter(Boolean);

  const data = loadRegistry();
  const framework = (opts.framework || "react").toLowerCase();
  const frameworks = knownFrameworks(data);
  if (!frameworks.includes(framework)) {
    throw new Error(`Unknown framework '${opts.framework}'. Expected one of: ${frameworks.join(", ")}`);
  }

  const showpiece = (data.showpiece || [])
    .map((e) => forFramework(e, framework))
    .filter(Boolean)
    .map((e) => ({ ...e, kind: "showpiece" }));
  const fallback =
    framework === "react"
      ? (data.fallback_basic?.components || []).map((e) => ({ ...e, kind: "fallback", framework: "react" }))
      : [];
  let pool = [...showpiece, ...fallback];

  if (opts.library) {
    const wanted = opts.library.toLowerCase();
    pool = pool.filter((e) => e.library?.toLowerCase() === wanted);
  }

  return pool
    .map((entry) => ({ entry, score: matchScore(entry, terms) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
    .map((r) => r.entry);
}

/**
 * The machine-readable form of a result list, for agents (`search --json`).
 * `id` is the entry's registry name, the same key `components.json`,
 * the gallery's `#showpiece-<id>` anchors, and smoke-test.mjs --only use.
 */
export function toJson(results) {
  return results.map((e) => ({
    id: e.name,
    kind: e.kind,
    framework: e.framework,
    library: e.library,
    ref: e.ref,
    fetch: e.fetch ?? null,
    effect: e.effect ?? null,
    aliases: e.aliases ?? [],
    license: e.license ?? null,
    deps: e.deps ?? [],
  }));
}

export function formatResults(results) {
  if (results.length === 0) {
    return "No matches. Try a shorter query, or drop --library / --framework to widen the search.";
  }
  return results
    .map((e) => {
      const fw = e.framework && e.framework !== "react" ? ` ${e.framework}` : "";
      const tag = `[${e.kind}/${e.library}${fw}]`;
      const line = `  ${e.name.padEnd(18)} ${tag.padEnd(20)} ${e.effect || ""}`.trimEnd();
      const aliases = (e.aliases || []).slice(0, 3).join(", ");
      return aliases ? `${line}\n      aliases: ${aliases}` : line;
    })
    .join("\n");
}
