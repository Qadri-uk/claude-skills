import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { search, formatResults, toJson, knownFrameworks } from "../src/commands/search.js";

const BIN = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "components-skill.js");
const cli = (...args) => spawnSync(process.execPath, [BIN, ...args], { encoding: "utf8" });

// These run against the real dist/ bundle (built via `npm run build` before
// `npm test`, same as add.test.js relies on for its file checks), so they
// double as an integration check that the registry actually contains what
// the assertions expect.

describe("search", () => {
  it("throws on an empty query", () => {
    assert.throws(() => search(""), /needs a query/);
    assert.throws(() => search("   "), /needs a query/);
  });

  it("finds a showpiece by exact name", () => {
    const results = search("macbook-scroll");
    assert.ok(results.length >= 1);
    assert.equal(results[0].name, "macbook-scroll");
    assert.equal(results[0].kind, "showpiece");
  });

  it("finds a showpiece by alias, case-insensitively", () => {
    const results = search("Laptop Opening");
    assert.ok(results.some((r) => r.name === "macbook-scroll"));
  });

  it("finds a fallback entry", () => {
    const results = search("button");
    assert.ok(results.some((r) => r.name === "button" && r.kind === "fallback"));
  });

  it("requires every query term to match (AND, not OR)", () => {
    const broad = search("card");
    const narrowed = search("card zzz_no_such_term_zzz");
    assert.ok(broad.length > 0);
    assert.equal(narrowed.length, 0);
  });

  it("ranks a name/alias match above a mere effect-prose match", () => {
    const results = search("scroll");
    assert.ok(results.length > 1);
    // "macbook-scroll" matches by name; something matching only via `effect`
    // text containing "scroll" should not outrank it.
    assert.equal(results[0].name, "macbook-scroll");
  });

  it("--library restricts to one source library", () => {
    const results = search("card", { library: "cult-ui" });
    assert.ok(results.length > 0);
    assert.ok(results.every((r) => r.library === "cult-ui"));
  });

  it("--library with no matches in that library returns empty", () => {
    const results = search("macbook-scroll", { library: "shadcn" });
    assert.equal(results.length, 0);
  });

  it("returns no matches for nonsense input", () => {
    const results = search("zzz_definitely_not_a_component_zzz");
    assert.equal(results.length, 0);
  });
});

describe("formatResults", () => {
  it("reports no matches", () => {
    assert.match(formatResults([]), /No matches/);
  });

  it("includes name, kind/library tag, and aliases", () => {
    const results = search("macbook-scroll");
    const out = formatResults(results);
    assert.match(out, /macbook-scroll/);
    assert.match(out, /\[showpiece\/aceternity\]/);
    assert.match(out, /aliases:/);
  });
});

describe("search --framework", () => {
  it("knows react plus every framework the registry carries", () => {
    const fws = knownFrameworks();
    assert.ok(fws.includes("react"));
    assert.ok(fws.includes("vue"));
    assert.ok(fws.includes("svelte"));
  });

  it("defaults to react and tags every result with it", () => {
    const results = search("text");
    assert.ok(results.length > 0);
    assert.ok(results.every((r) => r.framework === "react"));
  });

  it("returns only entries that carry the variant, with the variant's library and ref", () => {
    const results = search("text", { framework: "svelte" });
    assert.ok(results.length > 0);
    for (const r of results) {
      assert.equal(r.framework, "svelte");
      assert.equal(r.library, "svelte-bits");
      assert.match(r.ref, /sveltebits\.xyz/);
      assert.equal(r.reactLibrary, "reactbits");
    }
  });

  it("drops fallbacks outside react", () => {
    assert.ok(search("button").some((r) => r.kind === "fallback"));
    assert.ok(search("button", { framework: "vue" }).every((r) => r.kind !== "fallback"));
  });

  it("composes with --library after the projection", () => {
    const inspira = search("card", { framework: "vue", library: "inspira-ui" });
    assert.ok(inspira.length > 0);
    assert.ok(inspira.every((r) => r.library === "inspira-ui" && r.framework === "vue"));

    // The React library name no longer matches once projected onto vue.
    assert.equal(search("card", { framework: "vue", library: "aceternity" }).length, 0);
  });

  it("is case-insensitive and rejects an unknown framework", () => {
    assert.ok(search("text", { framework: "Vue" }).length > 0);
    assert.throws(() => search("text", { framework: "elm" }), /Unknown framework 'elm'/);
  });
});

describe("search --json", () => {
  it("maps results to id, library, ref, framework", () => {
    const [first] = toJson(search("macbook-scroll"));
    assert.equal(first.id, "macbook-scroll");
    assert.equal(first.library, "aceternity");
    assert.equal(first.framework, "react");
    assert.match(first.ref, /^npx shadcn@latest add /);
    assert.equal(first.kind, "showpiece");
  });

  it("prints a parseable array from the CLI", () => {
    const r = cli("search", "beams", "--json");
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.ok(Array.isArray(out) && out.length > 0);
    for (const row of out) {
      for (const key of ["id", "library", "ref", "framework"]) assert.ok(row[key], `${key} present`);
    }
  });

  it("prints [] and exits 1 when nothing matches", () => {
    const r = cli("search", "zzz_no_such_thing_zzz", "--json");
    assert.equal(r.status, 1);
    assert.deepEqual(JSON.parse(r.stdout), []);
  });

  it("carries --framework through", () => {
    const r = cli("search", "text", "--framework", "vue", "--json");
    const out = JSON.parse(r.stdout);
    assert.ok(out.length > 0 && out.every((row) => row.framework === "vue"));
  });
});
