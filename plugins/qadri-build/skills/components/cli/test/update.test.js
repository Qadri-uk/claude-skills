import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

import { add } from "../src/commands/add.js";
import { update } from "../src/commands/update.js";
import { MANIFEST_NAME } from "../src/lib/layout.js";

const dirs = [];
function tmp() {
  const d = mkdtempSync(join(tmpdir(), "components-skill-update-test-"));
  dirs.push(d);
  return d;
}

function manifest(cwd) {
  return JSON.parse(readFileSync(join(cwd, MANIFEST_NAME), "utf8"));
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

describe("update: keeps user edits", () => {
  it("refuses to clobber a locally edited file", () => {
    const cwd = tmp();
    add({ cwd });

    const skill = join(cwd, ".claude", "skills", "components", "SKILL.md");
    const edited = "# my local edits\n";
    writeFileSync(skill, edited);

    logs = [];
    const res = update({ cwd });

    assert.equal(res.warned, 1, "one modified file reported");
    assert.equal(readFileSync(skill, "utf8"), edited, "local edit preserved");
    assert.ok(logs.join("\n").includes("changed since install"), "warns about the modification");
  });

  it("still flags the same edit on the next update", () => {
    // The manifest keeps the original checksum for a skipped file. If it
    // recorded the edited bytes instead, the second update would treat the
    // edit as ours and overwrite it.
    const cwd = tmp();
    add({ cwd });

    const skill = join(cwd, ".claude", "skills", "components", "SKILL.md");
    writeFileSync(skill, "# my local edits\n");
    const key = ".claude/skills/components/SKILL.md";
    const recorded = manifest(cwd).agents.claude.files[key];
    assert.ok(recorded, "manifest records SKILL.md");

    update({ cwd });
    assert.equal(manifest(cwd).agents.claude.files[key], recorded, "original checksum kept");

    const res = update({ cwd });
    assert.equal(res.warned, 1, "edit still reported");
    assert.equal(readFileSync(skill, "utf8"), "# my local edits\n");
  });

  it("updates the untouched files around an edited one", () => {
    const cwd = tmp();
    add({ cwd });

    const base = join(cwd, ".claude", "skills", "components");
    writeFileSync(join(base, "SKILL.md"), "# my local edits\n");
    rmSync(join(base, "components.json"));

    update({ cwd });
    assert.ok(existsSync(join(base, "components.json")), "missing file restored");
    assert.equal(readFileSync(join(base, "SKILL.md"), "utf8"), "# my local edits\n", "edit preserved");
  });

  it("--force overwrites a locally edited file", () => {
    const cwd = tmp();
    add({ cwd });

    const skill = join(cwd, ".claude", "skills", "components", "SKILL.md");
    writeFileSync(skill, "# my local edits\n");

    const res = update({ cwd, force: true });
    assert.equal(res.warned, 0, "--force does not report the edit as kept");
    assert.notEqual(readFileSync(skill, "utf8"), "# my local edits\n", "was overwritten");
  });
});

describe("update: no change", () => {
  it("leaves an untouched install byte-identical", () => {
    const cwd = tmp();
    add({ cwd });

    const skill = join(cwd, ".claude", "skills", "components", "SKILL.md");
    const before = readFileSync(skill);
    const filesBefore = manifest(cwd).agents.claude.files;

    logs = [];
    const res = update({ cwd });

    assert.equal(res.warned, 0, "nothing reported as modified");
    assert.equal(res.touched, 1);
    assert.deepEqual(readFileSync(skill), before);
    assert.deepEqual(manifest(cwd).agents.claude.files, filesBefore, "checksums unchanged");
  });

  it("keeps installedAt and records updatedAt", () => {
    const cwd = tmp();
    add({ cwd });
    const installedAt = manifest(cwd).agents.claude.installedAt;

    update({ cwd });
    const entry = manifest(cwd).agents.claude;
    assert.equal(entry.installedAt, installedAt);
    assert.ok(entry.updatedAt, "updatedAt written");
  });

  it("restores a file deleted after install", () => {
    const cwd = tmp();
    add({ cwd });

    const ref = join(cwd, ".claude", "skills", "components", "references", "live-fetch.md");
    rmSync(ref);
    assert.ok(!existsSync(ref));

    logs = [];
    update({ cwd });
    assert.ok(existsSync(ref), "restored");
    assert.ok(logs.join("\n").includes("1 restored"));
  });

  it("says so when nothing is installed", () => {
    logs = [];
    const res = update({ cwd: tmp() });
    assert.equal(res.touched, 0);
    assert.ok(logs.join("\n").includes("Nothing to update"));
  });
});

describe("update: agent selection", () => {
  it("updates every installed agent when none is named", () => {
    const cwd = tmp();
    add({ cwd, agent: "claude,cursor" });

    const res = update({ cwd });
    assert.equal(res.touched, 2);
  });

  it("--agent limits the update to that agent", () => {
    const cwd = tmp();
    add({ cwd, agent: "claude,cursor" });

    const res = update({ cwd, agent: "cursor" });
    assert.equal(res.touched, 1);
    assert.ok(!manifest(cwd).agents.claude.updatedAt, "claude left alone");
    assert.ok(manifest(cwd).agents.cursor.updatedAt, "cursor updated");
  });

  it("warns about a named agent that is not installed", () => {
    const cwd = tmp();
    add({ cwd });

    logs = [];
    const res = update({ cwd, agent: "gemini" });
    assert.equal(res.touched, 0);
    assert.ok(logs.join("\n").includes("not installed here"));
  });
});
