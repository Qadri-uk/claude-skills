import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

import { add } from "../src/commands/add.js";
import { compareVersions, formatList, list } from "../src/commands/list.js";
import { packageVersion } from "../src/lib/dist.js";
import { MANIFEST_NAME } from "../src/lib/layout.js";

const dirs = [];
function tmp() {
  const d = mkdtempSync(join(tmpdir(), "components-skill-list-test-"));
  dirs.push(d);
  return d;
}

function setVersion(root, agent, version) {
  const p = join(root, MANIFEST_NAME);
  const m = JSON.parse(readFileSync(p, "utf8"));
  m.agents[agent].version = version;
  writeFileSync(p, JSON.stringify(m));
}

// Global installs resolve through os.homedir(), which reads HOME / USERPROFILE.
// Point both at a scratch dir so these tests never see the real user config.
const savedEnv = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
let home;
before(() => {
  home = tmp();
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  console.log = () => {};
  console.warn = () => {};
});
after(() => {
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

const row = (result, agent, scope = "project") => result.rows.find((r) => r.agent === agent && r.scope === scope);

describe("compareVersions", () => {
  it("orders x.y.z numerically", () => {
    assert.ok(compareVersions("1.1.1", "1.2.0") < 0);
    assert.ok(compareVersions("1.10.0", "1.9.9") > 0);
    assert.equal(compareVersions("1.2.0", "1.2.0"), 0);
  });
});

describe("list", () => {
  it("reports every agent as not installed in an empty project", () => {
    const result = list({ cwd: tmp() });
    for (const r of result.rows.filter((x) => x.scope === "project")) {
      assert.equal(r.status, "not installed");
      assert.equal(r.version, null);
    }
  });

  it("reports an install from this CLI as up to date", () => {
    const cwd = tmp();
    add({ cwd });
    const r = row(list({ cwd }), "claude");
    assert.equal(r.status, "up to date");
    assert.equal(r.version, packageVersion());
    assert.deepEqual(r.paths, [".claude/skills/components"]);
  });

  it("tells outdated apart from not installed", () => {
    const cwd = tmp();
    add({ cwd, agent: "claude" });
    setVersion(cwd, "claude", "0.9.0");

    const result = list({ cwd });
    assert.equal(row(result, "claude").status, "outdated");
    assert.equal(row(result, "claude").version, "0.9.0");
    assert.equal(row(result, "codex").status, "not installed");

    const out = formatList(result);
    assert.match(out, /Claude Code\s+v0\.9\.0\s+outdated \(run `components-skill update`\)/);
    assert.match(out, /Codex CLI\s+-\s+not installed/);
  });

  it("reports an install from a newer CLI as newer", () => {
    const cwd = tmp();
    add({ cwd });
    setVersion(cwd, "claude", "99.0.0");
    assert.equal(row(list({ cwd }), "claude").status, "newer");
  });

  it("counts locally edited and missing files", () => {
    const cwd = tmp();
    add({ cwd });
    const base = join(cwd, ".claude", "skills", "components");
    writeFileSync(join(base, "SKILL.md"), "# edited\n");
    rmSync(join(base, "TASTE.md"));

    const r = row(list({ cwd }), "claude");
    assert.equal(r.modified, 1);
    assert.equal(r.missing, 1);
    assert.match(formatList(list({ cwd })), /1 file\(s\) edited locally, kept by update; 1 file\(s\) missing/);
  });

  it("lists global installs, and Cursor as unsupported there", () => {
    add({ cwd: tmp(), global: true });
    const result = list({ cwd: tmp() });
    assert.equal(row(result, "claude", "global").status, "up to date");
    assert.equal(row(result, "claude", "global").root, join(home, ".claude", "skills", "components"));
    assert.equal(row(result, "cursor", "global").status, "unsupported");
  });

  it("--global lists only the global scope, --agent narrows the agents", () => {
    const result = list({ cwd: tmp(), global: true, agent: "claude,gemini" });
    assert.ok(result.rows.every((r) => r.scope === "global"));
    assert.deepEqual(result.rows.map((r) => r.agent), ["claude", "gemini"]);
  });

  it("says when nothing is installed anywhere", () => {
    const result = list({ cwd: tmp(), agent: "codex" });
    assert.match(formatList(result), /Nothing installed here/);
  });
});
