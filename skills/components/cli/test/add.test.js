import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

import { add } from "../src/commands/add.js";
import { MANIFEST_NAME } from "../src/lib/layout.js";

const dirs = [];
function tmp() {
  const d = mkdtempSync(join(tmpdir(), "components-skill-test-"));
  dirs.push(d);
  return d;
}

// The commands print progress; keep test output readable.
let logs = [];
before(() => {
  console.log = (...a) => logs.push(a.join(" "));
  console.warn = (...a) => logs.push(a.join(" "));
});
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe("add", () => {
  it("writes the claude bundle into a project by default", () => {
    const cwd = tmp();
    const res = add({ cwd });

    assert.equal(res.length, 1);
    assert.equal(res[0].agent, "claude");

    const base = join(cwd, ".claude", "skills", "components");
    for (const f of ["SKILL.md", "components.json", join("references", "live-fetch.md")]) {
      assert.ok(existsSync(join(base, f)), `expected ${f}`);
    }
  });

  it("writes a manifest with a checksum per file", () => {
    const cwd = tmp();
    add({ cwd });

    const manifest = JSON.parse(readFileSync(join(cwd, MANIFEST_NAME), "utf8"));
    assert.ok(manifest.agents.claude, "claude entry");
    assert.ok(manifest.agents.claude.version, "records a version");

    const files = manifest.agents.claude.files;
    const names = Object.keys(files);
    assert.ok(names.length >= 5, `expected several files, got ${names.length}`);
    for (const [, hash] of Object.entries(files)) {
      assert.match(hash, /^[a-f0-9]{64}$/, "sha256 hex");
    }
  });

  it("installs cursor's rule and its payload", () => {
    const cwd = tmp();
    add({ cwd, agent: "cursor" });

    assert.ok(existsSync(join(cwd, ".cursor", "rules", "components.mdc")), "rule file");
    assert.ok(existsSync(join(cwd, ".cursor", "components", "SKILL.md")), "payload");
  });

  it("installs every agent with --agent all", () => {
    const cwd = tmp();
    const res = add({ cwd, agent: "all" });

    assert.equal(res.length, 4);
    assert.ok(existsSync(join(cwd, ".claude", "skills", "components", "SKILL.md")));
    assert.ok(existsSync(join(cwd, ".codex", "skills", "components", "SKILL.md")));
    assert.ok(existsSync(join(cwd, ".cursor", "rules", "components.mdc")));
    assert.ok(existsSync(join(cwd, ".gemini", "extensions", "components", "gemini-extension.json")));

    const manifest = JSON.parse(readFileSync(join(cwd, MANIFEST_NAME), "utf8"));
    assert.deepEqual(Object.keys(manifest.agents).sort(), ["claude", "codex", "cursor", "gemini"]);
  });

  it("rejects an unknown agent", () => {
    assert.throws(() => add({ cwd: tmp(), agent: "emacs" }), /Unknown agent/);
  });
});

describe("add --dry-run", () => {
  it("touches no disk", () => {
    const cwd = tmp();
    const res = add({ cwd, agent: "all", dryRun: true });

    assert.equal(res.length, 4);
    assert.deepEqual(readdirSync(cwd), [], "install root left empty");
    assert.ok(res.every((r) => r.dryRun));
  });

  it("does not create a missing install root", () => {
    const cwd = join(tmp(), "not", "yet", "here");
    add({ cwd, dryRun: true });
    assert.ok(!existsSync(cwd));
  });

  it("plans exactly the files a real add writes", () => {
    const planned = add({ cwd: tmp(), agent: "all", dryRun: true });
    const real = add({ cwd: tmp(), agent: "all" });

    for (let i = 0; i < real.length; i++) {
      assert.equal(planned[i].agent, real[i].agent);
      assert.deepEqual([...planned[i].files].sort(), [...real[i].files].sort());
    }
  });

  it("prints each path and the manifest it would write", () => {
    logs = [];
    add({ cwd: tmp(), agent: "cursor", dryRun: true });
    const out = logs.join("\n");
    assert.match(out, /would write \d+ file\(s\)/);
    assert.match(out, /\.cursor\/rules\/components\.mdc/);
    assert.ok(out.includes(MANIFEST_NAME), "manifest listed");
    assert.match(out, /nothing was written/);
  });

  it("does not record anything in an existing manifest", () => {
    const cwd = tmp();
    add({ cwd });
    const before = readFileSync(join(cwd, MANIFEST_NAME), "utf8");

    add({ cwd, agent: "codex", dryRun: true });
    assert.equal(readFileSync(join(cwd, MANIFEST_NAME), "utf8"), before);
    assert.ok(!existsSync(join(cwd, ".codex")));
  });
});
