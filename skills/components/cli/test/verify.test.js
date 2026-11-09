import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";

import { blankComments, checkColors, checkMotion, formatVerify, parseSkip, verify } from "../src/commands/verify.js";

const BIN = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "components-skill.js");

const dirs = [];
function tmp() {
  const d = mkdtempSync(join(tmpdir(), "components-skill-verify-test-"));
  dirs.push(d);
  return d;
}
function write(dir, rel, content) {
  const p = join(dir, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
  return p;
}
after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

const ADAPTED = `import { motion, useReducedMotion } from "motion/react";

export function Glow({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      animate={reduce ? undefined : { opacity: [0.6, 1, 0.6] }}
      className="rounded-xl bg-primary text-primary-foreground ring-1 ring-ring"
    >
      {children}
    </motion.div>
  );
}
`;

describe("checkColors", () => {
  it("passes token-backed classes", () => {
    assert.equal(checkColors(ADAPTED).status, "pass");
  });

  it("flags bg-zinc-* and black/white opacity literals with line and column", () => {
    const r = checkColors(`const a = "p-4 bg-zinc-900";\nconst b = "text-black/50 hover:bg-white";\n`);
    assert.equal(r.status, "fail");
    assert.deepEqual(
      r.findings.map((f) => [f.line, f.column, f.match]),
      [
        [1, 16, "bg-zinc-900"],
        [2, 12, "text-black/50"],
        [2, 26, "hover:bg-white"],
      ],
    );
  });

  it("flags every default-palette utility, with variants", () => {
    const r = checkColors(`<div className="dark:border-slate-700 from-indigo-500 [&>svg]:text-neutral-400 ring-offset-rose-50" />`);
    assert.deepEqual(
      r.findings.map((f) => f.match),
      ["dark:border-slate-700", "from-indigo-500", "text-neutral-400", "ring-offset-rose-50"],
    );
  });

  it("flags hex literals of 3, 4, 6, and 8 digits", () => {
    const r = checkColors(`const c = ["#fff", "#ffff", "#0ea5e9", "#0ea5e980"];`);
    assert.deepEqual(r.findings.map((f) => f.match), ["#fff", "#ffff", "#0ea5e9", "#0ea5e980"]);
    assert.ok(r.findings.every((f) => f.kind === "hex"));
  });

  it("ignores non-color hashes, entities, and lookalike classes", () => {
    const r = checkColors(`const a = "&#123; #12345 #abcde"; const b = "bg-primary text-muted-foreground bg-zinc-custom";`);
    assert.equal(r.status, "pass", JSON.stringify(r.findings));
  });

  it("ignores colors in comments but keeps a URL's line intact", () => {
    const r = checkColors(`// was bg-zinc-900, see #123\n/* #fff */\nconst u = "https://example.com"; const c = "bg-red-500";\n`);
    assert.deepEqual(r.findings.map((f) => [f.line, f.match]), [[3, "bg-red-500"]]);
  });

  it("skips a line marked verify-ignore", () => {
    const r = checkColors(`<stop stopColor="#ff0080" /> {/* verify-ignore: gradient stop from the brand guide */}\n`);
    assert.equal(r.status, "pass");
  });
});

describe("blankComments", () => {
  it("keeps line and column positions", () => {
    const src = `a /* x\ny */ b // c\n<!-- d -->e`;
    const out = blankComments(src);
    assert.equal(out.length, src.length);
    assert.equal(out.split("\n").length, 3);
    assert.equal(out.indexOf("b"), src.indexOf("b"));
    assert.equal(out.indexOf("e"), src.indexOf("e", src.indexOf("-->")));
  });
});

describe("checkMotion", () => {
  for (const guard of [
    "const r = useReducedMotion();",
    `className="animate-pulse motion-reduce:animate-none"`,
    `className="motion-safe:animate-spin"`,
    "@media (prefers-reduced-motion: reduce) { * { animation: none } }",
    `<MotionConfig reducedMotion="user">`,
    "const reduce = usePreferredReducedMotion();",
    "import { prefersReducedMotion } from 'svelte/motion';",
  ]) {
    it(`accepts ${guard.slice(0, 40)}`, () => {
      assert.equal(checkMotion(guard).status, "pass");
    });
  }

  it("fails with no guard", () => {
    const r = checkMotion(`export const X = () => <div className="animate-spin" />;`);
    assert.equal(r.status, "fail");
    assert.match(r.summary, /adaptation\.md § 5b/);
  });

  it("does not count a guard that only appears in a comment", () => {
    assert.equal(checkMotion("// TODO: add useReducedMotion\nexport const X = 1;").status, "fail");
  });
});

describe("verify", () => {
  it("passes an adapted component", async () => {
    const file = write(tmp(), "src/components/glow.tsx", ADAPTED);
    const r = await verify(file, { skip: "typecheck,render" });
    assert.equal(r.ok, true, formatVerify(r));
    assert.equal(r.framework, "react");
  });

  it("fails a raw demo on both checks", async () => {
    const file = write(tmp(), "src/components/raw.tsx", `export const Raw = () => <div className="bg-zinc-900 animate-pulse" />;\n`);
    const r = await verify(file, { skip: "typecheck,render" });
    assert.equal(r.ok, false);
    assert.deepEqual(
      r.checks.filter((c) => c.status === "fail").map((c) => c.name),
      ["colors", "motion"],
    );
  });

  it("--skip turns a check into an explicit skip", async () => {
    const file = write(tmp(), "a.tsx", `export const A = () => <div className="bg-zinc-900" />;\n`);
    const r = await verify(file, { skip: "colors,motion,typecheck,render" });
    assert.equal(r.ok, true);
    assert.ok(r.checks.every((c) => c.status === "skip"));
  });

  it("rejects a missing file, a non-source file, and an unknown --skip name", async () => {
    await assert.rejects(verify(join(tmp(), "nope.tsx")), /not a file/);
    await assert.rejects(verify(write(tmp(), "a.css", "a{}")), /component source/);
    assert.throws(() => parseSkip("colors,lint"), /Unknown check 'lint'/);
  });

  it("detects the framework from the extension", async () => {
    const dir = tmp();
    const vue = await verify(write(dir, "A.vue", "<template><div /></template>"), { skip: "motion,typecheck,render" });
    const svelte = await verify(write(dir, "A.svelte", "<div />"), { skip: "motion,typecheck,render" });
    assert.equal(vue.framework, "vue");
    assert.equal(svelte.framework, "svelte");
  });
});

// typecheck and render run the target project's own typescript, esbuild, and
// react. A fixture project under test/ resolves them from this package's
// devDependencies by walking up to cli/node_modules, the same lookup a real
// project's own node_modules gets.
const HERE = dirname(fileURLToPath(import.meta.url));
const hasToolchain = ["typescript", "esbuild", "react", "react-dom"].every((p) => {
  try {
    createRequire(import.meta.url).resolve(`${p}/package.json`);
    return true;
  } catch {
    return false;
  }
});
const noToolchain = hasToolchain ? false : "devDependencies not installed (run npm ci in cli/)";

function project(files) {
  const dir = mkdtempSync(join(HERE, ".verify-fixture-"));
  dirs.push(dir);
  write(dir, "package.json", JSON.stringify({ name: "fixture", private: true, type: "module" }));
  for (const [rel, content] of Object.entries(files)) write(dir, rel, content);
  return dir;
}

const TSCONFIG = JSON.stringify({
  compilerOptions: {
    target: "ES2022",
    module: "ESNext",
    moduleResolution: "Bundler",
    jsx: "react-jsx",
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    baseUrl: ".",
    paths: { "@/*": ["./src/*"] },
  },
  include: ["src"],
});

describe("verify: typecheck", { skip: noToolchain }, () => {
  it("passes a file with no type errors, using the project's tsconfig", async () => {
    const dir = project({
      "tsconfig.json": TSCONFIG,
      "src/glow.tsx": `export function Glow({ children }: { children?: React.ReactNode }) {\n  return <div className="motion-safe:animate-pulse bg-primary">{children}</div>;\n}\n`,
    });
    const r = await verify(join(dir, "src/glow.tsx"), { skip: "render" });
    const tc = r.checks.find((c) => c.name === "typecheck");
    assert.equal(tc.status, "pass", JSON.stringify(tc));
    assert.match(tc.summary, /tsc -p tsconfig\.json/);
  });

  it("reports a type error in the file with line and column", async () => {
    const dir = project({
      "tsconfig.json": TSCONFIG,
      "src/bad.tsx": `export function Bad() {\n  const n: number = "x";\n  return <div>{n}</div>;\n}\n`,
    });
    const tc = (await verify(join(dir, "src/bad.tsx"), { skip: "render" })).checks.find((c) => c.name === "typecheck");
    assert.equal(tc.status, "fail");
    assert.equal(tc.errors.length, 1);
    assert.match(tc.errors[0], /^2:9\s+TS2322/);
  });

  it("follows a solution-style tsconfig.json to the referenced config that covers the file", async () => {
    const dir = project({
      "tsconfig.json": JSON.stringify({ files: [], references: [{ path: "./tsconfig.node.json" }, { path: "./tsconfig.app.json" }] }),
      "tsconfig.node.json": JSON.stringify({ compilerOptions: { strict: true, noEmit: true }, include: ["vite.config.ts"] }),
      // A path alias only the app config declares: resolving it proves which config ran.
      "tsconfig.app.json": TSCONFIG,
      "src/lib/utils.ts": `export const cn = (...c: string[]) => c.join(" ");\n`,
      "src/card.tsx": `import { cn } from "@/lib/utils";\nexport const Card = () => <div className={cn("a", "b")} />;\n`,
    });
    const tc = (await verify(join(dir, "src/card.tsx"), { skip: "render" })).checks.find((c) => c.name === "typecheck");
    assert.equal(tc.status, "pass", JSON.stringify(tc));
    assert.match(tc.summary, /tsconfig\.app\.json/);
  });

  it("leaves no temporary config behind", async () => {
    const dir = project({ "tsconfig.json": TSCONFIG, "src/a.tsx": "export const A = () => <div />;\n" });
    await verify(join(dir, "src/a.tsx"), { skip: "render" });
    assert.deepEqual(readdirSync(dir).filter((f) => f.startsWith(".components-verify-")), []);
  });

  it("skips when there is no tsconfig", async () => {
    const dir = project({ "src/a.jsx": "export const A = () => <div />;\n" });
    const tc = (await verify(join(dir, "src/a.jsx"), { skip: "render" })).checks.find((c) => c.name === "typecheck");
    assert.equal(tc.status, "skip");
  });
});

describe("verify: render", { skip: noToolchain }, () => {
  const base = { "tsconfig.json": TSCONFIG, "src/lib/utils.ts": `export const cn = (...c: string[]) => c.join(" ");\n` };

  it("renders the export named after the file, resolving tsconfig paths", async () => {
    const dir = project({
      ...base,
      "src/components/shiny-badge.tsx": `import { cn } from "@/lib/utils";\nexport function Helper() { throw new Error("not me"); }\nexport function ShinyBadge({ children }: { children?: React.ReactNode }) {\n  return <span className={cn("a", "b")}>{children}</span>;\n}\n`,
    });
    const r = (await verify(join(dir, "src/components/shiny-badge.tsx"), { skip: "typecheck" })).checks.find((c) => c.name === "render");
    assert.equal(r.status, "pass", JSON.stringify(r));
    assert.equal(r.export, "ShinyBadge");
  });

  it("prefers the default export, and --export overrides it", async () => {
    const dir = project({
      ...base,
      "src/a.tsx": `export default function A() { return <b>a</b>; }\nexport function B() { return <i>b</i>; }\n`,
    });
    const file = join(dir, "src/a.tsx");
    const byDefault = (await verify(file, { skip: "typecheck" })).checks.find((c) => c.name === "render");
    assert.equal(byDefault.export, "default");
    const chosen = (await verify(file, { skip: "typecheck", export: "B" })).checks.find((c) => c.name === "render");
    assert.equal(chosen.export, "B");
    const missing = (await verify(file, { skip: "typecheck", export: "Nope" })).checks.find((c) => c.name === "render");
    assert.equal(missing.status, "fail");
  });

  it("fails a component that throws while rendering, and --props can fix it", async () => {
    const dir = project({
      ...base,
      "src/needs-text.tsx": `export function NeedsText({ text }: { text: string }) {\n  return <p>{text.toUpperCase()}</p>;\n}\n`,
    });
    const file = join(dir, "src/needs-text.tsx");
    const bare = (await verify(file, { skip: "typecheck" })).checks.find((c) => c.name === "render");
    assert.equal(bare.status, "fail");
    assert.match(bare.summary, /threw while rendering/);
    const withProps = (await verify(file, { skip: "typecheck", props: '{"text":"hi"}' })).checks.find((c) => c.name === "render");
    assert.equal(withProps.status, "pass", JSON.stringify(withProps));
  });

  it("warns, not fails, when render touches window", async () => {
    const dir = project({ ...base, "src/wide.tsx": `export function Wide() {\n  return <div>{window.innerWidth}</div>;\n}\n` });
    const r = (await verify(join(dir, "src/wide.tsx"), { skip: "typecheck" })).checks.find((c) => c.name === "render");
    assert.equal(r.status, "warn");
    assert.match(r.summary, /breaks SSR/);
  });

  it("fails a file that cannot be bundled", async () => {
    const dir = project({ ...base, "src/missing.tsx": `import { X } from "./does-not-exist";\nexport const M = () => <X />;\n` });
    const r = (await verify(join(dir, "src/missing.tsx"), { skip: "typecheck" })).checks.find((c) => c.name === "render");
    assert.equal(r.status, "fail");
    assert.match(r.summary, /could not bundle/);
  });

  it("skips .vue and .svelte files", async () => {
    const dir = project({ "src/A.vue": "<template><div /></template>\n" });
    const r = (await verify(join(dir, "src/A.vue"), { skip: "typecheck" })).checks.find((c) => c.name === "render");
    assert.equal(r.status, "skip");
  });
});

describe("verify command", () => {
  it("exits 1 on a failing file and lists each finding", () => {
    const file = write(tmp(), "raw.tsx", `export const Raw = () => <div className="bg-zinc-900" />;\n`);
    const r = spawnSync(process.execPath, [BIN, "verify", file, "--skip", "typecheck,render"], { encoding: "utf8" });
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stdout, /\[FAIL\] colors/);
    assert.match(r.stdout, /1:\d+\s+bg-zinc-900/);
  });

  it("exits 0 on a passing file, and --json is parseable", () => {
    const file = write(tmp(), "glow.tsx", ADAPTED);
    const r = spawnSync(process.execPath, [BIN, "verify", file, "--skip", "typecheck,render", "--json"], {
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(JSON.parse(r.stdout).ok, true);
  });
});
