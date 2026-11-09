import { AGENTS, agentLayout, resolveAgents } from "../lib/layout.js";
import { diffAgainstManifest, readManifest } from "../lib/manifest.js";
import { packageVersion } from "../lib/dist.js";

/**
 * Numeric x.y.z compare. Returns <0, 0, >0. Pre-release tags are ignored,
 * which is fine for the one question asked here: is the installed copy older
 * than the CLI that would replace it.
 */
export function compareVersions(a, b) {
  const pa = String(a).split("-")[0].split(".").map(Number);
  const pb = String(b).split("-")[0].split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

/** Where an agent's install lives, as the paths `add` writes, for display. */
function installPaths(layout, scope) {
  if (scope === "global") return [layout.global()];
  return layout.sources.map(([, toRel]) => toRel);
}

/**
 * One row per agent per scope: what is installed, at which version, and how it
 * compares to this CLI's bundles. Status is one of:
 *
 *   not installed   no manifest entry for the agent at that root
 *   unsupported     --global for an agent with no user-level location (Cursor)
 *   up to date      installed version equals this CLI's version
 *   outdated        installed version is older; `update` would refresh it
 *   newer           installed by a newer CLI than this one
 *
 * `modified` and `missing` count files that differ from what `add` recorded,
 * the same check `update` makes before deciding what it may overwrite.
 */
export function list(opts = {}) {
  const cliVersion = packageVersion();
  const cwd = opts.cwd || process.cwd();
  const agents = opts.agent ? resolveAgents(opts.agent) : [...AGENTS];
  const scopes = opts.global ? ["global"] : ["project", "global"];

  const rows = [];
  for (const scope of scopes) {
    for (const agent of agents) {
      const layout = agentLayout(agent);
      const row = { agent, label: layout.label, scope, root: null, version: null, status: "not installed" };

      if (scope === "global" && !layout.global) {
        rows.push({ ...row, status: "unsupported" });
        continue;
      }

      row.root = scope === "global" ? layout.global() : cwd;
      const entry = readManifest(row.root)?.agents?.[agent];
      if (!entry) {
        rows.push(row);
        continue;
      }

      const { modified, missing } = diffAgainstManifest(row.root, entry);
      const cmp = compareVersions(entry.version, cliVersion);
      rows.push({
        ...row,
        version: entry.version,
        status: cmp < 0 ? "outdated" : cmp > 0 ? "newer" : "up to date",
        paths: installPaths(layout, scope),
        modified: modified.length,
        missing: missing.length,
        installedAt: entry.installedAt ?? null,
        updatedAt: entry.updatedAt ?? null,
      });
    }
  }
  return { cliVersion, cwd, rows };
}

const STATUS_NOTE = {
  outdated: "run `components-skill update`",
  newer: "installed by a newer components-skill; this one would not upgrade it",
  unsupported: "no user-level location for this agent",
};

export function formatList(result) {
  const lines = [`components-skill v${result.cliVersion}`];
  for (const scope of ["project", "global"]) {
    const rows = result.rows.filter((r) => r.scope === scope);
    if (!rows.length) continue;
    lines.push("");
    lines.push(scope === "project" ? `Project (${result.cwd}):` : "Global (user config dir):");
    for (const r of rows) {
      const version = r.version ? `v${r.version}` : "-";
      let line = `  ${r.label.padEnd(12)} ${version.padEnd(9)} ${r.status}`;
      if (STATUS_NOTE[r.status]) line += ` (${STATUS_NOTE[r.status]})`;
      lines.push(line);
      if (r.paths) lines.push(`      ${r.paths.join(", ")}`);
      const drift = [];
      if (r.modified) drift.push(`${r.modified} file(s) edited locally, kept by update`);
      if (r.missing) drift.push(`${r.missing} file(s) missing, restored by update`);
      if (drift.length) lines.push(`      ${drift.join("; ")}`);
    }
  }
  const installed = result.rows.filter((r) => r.version).length;
  if (!installed) {
    lines.push("");
    lines.push("Nothing installed here. Run `components-skill add`.");
  }
  return lines.join("\n");
}
