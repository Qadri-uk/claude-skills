import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * `components-skill verify <file>`: check an adapted component after it has
 * been fetched and placed in someone else's project.
 *
 * scripts/smoke-test.mjs proves a registry ref builds in a throwaway project.
 * That is the one place adaptation has not happened yet. This runs against
 * the file an agent actually adapted, in the project it landed in, and checks
 * the parts of references/adaptation.md that can be checked mechanically.
 *
 * Each check returns { name, status, summary, ... } where status is one of
 * pass | fail | warn | skip. Only fail sets a non-zero exit code: a check that
 * cannot run in this project (no TypeScript installed, say) is a skip, said
 * out loud, never a silent pass.
 */

export const CHECKS = ["colors", "motion", "typecheck", "render"];

const SOURCE_EXTS = new Set([".tsx", ".ts", ".jsx", ".js", ".mjs", ".vue", ".svelte"]);

export function frameworkOf(file) {
  const ext = extname(file).toLowerCase();
  if (ext === ".vue") return "vue";
  if (ext === ".svelte") return "svelte";
  return "react";
}

/**
 * Comments are where a demo's color notes and issue links live ("#123",
 * "was bg-zinc-900"), and none of them reach the page. Blank them out, keeping
 * every newline and column, so findings still point at the real line.
 */
export function blankComments(text) {
  const keepShape = (m) => m.replace(/[^\n]/g, " ");
  let out = text.replace(/\/\*[\s\S]*?\*\//g, keepShape).replace(/<!--[\s\S]*?-->/g, keepShape);
  // A `//` after `:` is a URL (https://), not a comment.
  out = out.replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, lead) => lead + keepShape(m.slice(lead.length)));
  return out;
}

// Tailwind's default palette, the thing adaptation.md § 1 says must not
// survive: "Never leave `bg-zinc-900` / `text-black/50` literals from a demo."
const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const COLOR_UTILS =
  "bg|text|border|border-[trblxyse]|ring|ring-offset|outline|divide|from|via|to|fill|stroke|shadow|decoration|placeholder|caret|accent";
const PALETTE_CLASS = new RegExp(
  `(?<![\\w-])(?:[a-z0-9-]+:)*(?:${COLOR_UTILS})-(?:(?:${PALETTE})-(?:50|[1-9]00|950)|black|white)(?:\\/\\d{1,3})?(?![\\w-])`,
  "g",
);
// 3, 4, 6, or 8 hex digits. Not after `&` (an HTML entity like &#123;) or a
// word character, so ids and entities stay out of it.
const HEX = /(?<![\w&#/])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g;

/** A line containing this marker is skipped by the color scan. */
export const IGNORE_MARKER = "verify-ignore";

/**
 * Check 2 of #65: hardcoded hex colors and Tailwind default-palette classes
 * that should have been mapped onto the project's tokens.
 *
 * Grep-class on purpose. It cannot tell a token-backed color from a literal
 * that happens to match the project's brand, so the fix for a real exception
 * is a `verify-ignore` comment on that line, which also documents it.
 */
export function checkColors(text) {
  const rawLines = text.split("\n");
  const lines = blankComments(text).split("\n");
  const findings = [];
  lines.forEach((line, i) => {
    if (rawLines[i].includes(IGNORE_MARKER)) return;
    for (const [re, kind] of [
      [HEX, "hex"],
      [PALETTE_CLASS, "palette"],
    ]) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line))) findings.push({ line: i + 1, column: m.index + 1, match: m[0], kind });
    }
  });
  findings.sort((a, b) => a.line - b.line || a.column - b.column);
  return {
    name: "colors",
    status: findings.length ? "fail" : "pass",
    summary: findings.length
      ? `${findings.length} hardcoded color(s) left from the demo; map them onto the project's tokens (adaptation.md § 1)`
      : "no hardcoded hex or default-palette color classes",
    findings,
  };
}

// The guards adaptation.md § 5b names, plus each framework's own spelling:
// motion's <MotionConfig reducedMotion="user">, VueUse's
// usePreferredReducedMotion, and Svelte 5's prefersReducedMotion.
const MOTION_GUARD =
  /useReducedMotion|usePreferredReducedMotion|prefersReducedMotion|prefers-reduced-motion|motion-reduce:|motion-safe:|reducedMotion\s*[=:]/;

/**
 * Check 3 of #65: the adapted file honours prefers-reduced-motion.
 * smoke-test.mjs runs the same detection as a warning on upstream code, which
 * nobody here wrote. On an adapted file it is the first checklist item in
 * adaptation.md, so here it is a hard check.
 */
export function checkMotion(text) {
  const code = blankComments(text);
  const m = MOTION_GUARD.exec(code);
  if (m) {
    const line = code.slice(0, m.index).split("\n").length;
    return { name: "motion", status: "pass", summary: `reduced-motion guard found (${m[0].trim()}, line ${line})` };
  }
  return {
    name: "motion",
    status: "fail",
    summary:
      "no reduced-motion guard: add useReducedMotion(), a motion-reduce: / motion-safe: variant, or a " +
      "prefers-reduced-motion media query (adaptation.md § 5b)",
  };
}

/** The nearest directory at or above `start` holding a package.json. */
export function findProjectRoot(start) {
  const pkg = findUp(start, "package.json");
  return pkg ? dirname(pkg) : null;
}

/** Resolve a package from the target project, never from this CLI's own install. */
function resolveFromProject(projectRoot, spec) {
  try {
    return createRequire(join(projectRoot, "package.json")).resolve(spec);
  } catch {
    return null;
  }
}

/** Absolute path to a package's bin script, as installed in the project. */
function projectBin(projectRoot, pkgName, binName = pkgName) {
  const pkgJson = resolveFromProject(projectRoot, `${pkgName}/package.json`);
  if (!pkgJson) return null;
  const pkg = JSON.parse(readFileSync(pkgJson, "utf8"));
  const rel = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.[binName];
  return rel ? join(dirname(pkgJson), rel) : null;
}

/** tsconfig files are JSONC: comments and trailing commas are allowed. */
export function readJsonc(path) {
  const text = readFileSync(path, "utf8")
    .replace(/("(?:[^"\\]|\\.)*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (m, str) => str ?? "")
    .replace(/,(\s*[}\]])/g, "$1");
  return JSON.parse(text);
}

const posix = (p) => p.split(sep).join("/");
const samePath = (a, b) =>
  process.platform === "win32" ? resolve(a).toLowerCase() === resolve(b).toLowerCase() : resolve(a) === resolve(b);

/**
 * The tsconfig that actually governs `file`. A Vite-style root tsconfig.json
 * is a solution file (`files: []` plus `references`), and checking against it
 * checks nothing, so follow the references to the one whose `include` covers
 * the file. Matching is by include prefix, not full glob semantics, which is
 * enough to tell tsconfig.app.json ("src") from tsconfig.node.json
 * ("vite.config.ts").
 */
export function governingTsconfig(file, projectRoot) {
  const top = findUp(dirname(file), "tsconfig.json", projectRoot);
  if (!top) return null;
  let cfg;
  try {
    cfg = readJsonc(top);
  } catch {
    return top;
  }
  const refs = Array.isArray(cfg.references) ? cfg.references : [];
  if (!refs.length || (Array.isArray(cfg.files) ? cfg.files.length : cfg.include)) return top;

  const covers = (configPath) => {
    let c;
    try {
      c = readJsonc(configPath);
    } catch {
      return false;
    }
    const rel = posix(relative(dirname(configPath), file));
    const patterns = c.include ?? (c.files ? [] : ["**/*"]);
    const listed = (c.files ?? []).some((f) => samePath(resolve(dirname(configPath), f), file));
    return listed || patterns.some((p) => rel.startsWith(posix(p).split("*")[0].replace(/\/$/, "")));
  };
  for (const ref of refs) {
    let p = resolve(dirname(top), ref.path);
    if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "tsconfig.json");
    if (existsSync(p) && covers(p)) return p;
  }
  return top;
}

/**
 * Typecheck one file against the config that governs it, with that config's
 * own paths, types, and strictness. A throwaway config next to it `extends`
 * it and narrows `files` to the one component: relative paths in the base
 * resolve exactly as they do for the project's real build, and the check
 * covers the file plus whatever it imports, not the whole project. Removed
 * afterwards whatever happens.
 */
function runTscLike(bin, tsconfig, file, projectRoot) {
  const dir = dirname(tsconfig);
  const temp = join(dir, `.components-verify-${randomBytes(4).toString("hex")}.json`);
  writeFileSync(
    temp,
    JSON.stringify({
      extends: `./${basename(tsconfig)}`,
      compilerOptions: { noEmit: true, composite: false, incremental: false, declaration: false, emitDeclarationOnly: false },
      files: [posix(relative(dir, file))],
      include: [],
    }),
  );
  try {
    const r = spawnSync(process.execPath, [bin, "-p", temp, "--pretty", "false"], {
      cwd: dir,
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
    });
    const out = `${r.stdout || ""}${r.stderr || ""}`;
    const diag = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/gm;
    const inFile = [];
    let elsewhere = 0;
    let m;
    while ((m = diag.exec(out))) {
      const where = isAbsolute(m[1]) ? m[1] : resolve(dir, m[1]);
      if (samePath(where, file)) inFile.push(`${m[2]}:${m[3]}  ${m[4]} ${m[5]}`);
      else elsewhere++;
    }
    // tsc failed without a single parseable diagnostic: a config error or a
    // crash, reported as such rather than as a clean pass.
    if (r.status !== 0 && !inFile.length && !elsewhere) {
      return { errors: [], elsewhere: 0, broken: out.trim().split("\n").slice(-5).join("\n") || `exit ${r.status}` };
    }
    return { errors: inFile, elsewhere };
  } finally {
    rmSync(temp, { force: true });
  }
}

function runSvelteCheck(bin, file, projectRoot) {
  const r = spawnSync(process.execPath, [bin, "--workspace", projectRoot, "--output", "machine", "--threshold", "error"], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const out = r.stdout || "";
  const errors = [];
  let elsewhere = 0;
  for (const line of out.split("\n")) {
    const m = /^\d+ ERROR "(.+?)" (\d+):(\d+) "(.*)"$/.exec(line.trim());
    if (!m) continue;
    if (samePath(resolve(projectRoot, m[1]), file)) errors.push(`${m[2]}:${m[3]}  ${m[4]}`);
    else elsewhere++;
  }
  if (r.status !== 0 && !errors.length && !elsewhere && !/COMPLETED/.test(out)) {
    return { errors: [], elsewhere: 0, broken: `${out}${r.stderr || ""}`.trim().split("\n").slice(-5).join("\n") };
  }
  return { errors, elsewhere };
}

/**
 * Check 1 of #65: typecheck the file in the project it landed in, with the
 * project's own compiler (typescript, vue-tsc, or svelte-check). A plain .js
 * or .jsx file with no tsconfig is a skip, since there is nothing to check it
 * against.
 */
export function checkTypes(file, projectRoot) {
  const framework = frameworkOf(file);
  const result = (status, summary, extra = {}) => ({ name: "typecheck", status, summary, ...extra });

  let outcome;
  let tool;
  if (framework === "svelte") {
    const bin = projectBin(projectRoot, "svelte-check");
    if (!bin) return result("skip", "svelte-check is not installed in this project");
    tool = "svelte-check";
    outcome = runSvelteCheck(bin, file, projectRoot);
  } else {
    const tsconfig = governingTsconfig(file, projectRoot);
    if (!tsconfig) return result("skip", "no tsconfig.json between the file and the project root");
    const bin =
      framework === "vue" ? projectBin(projectRoot, "vue-tsc") : projectBin(projectRoot, "typescript", "tsc");
    if (!bin) {
      return result("skip", `${framework === "vue" ? "vue-tsc" : "typescript"} is not installed in this project`);
    }
    tool = `${framework === "vue" ? "vue-tsc" : "tsc"} -p ${posix(relative(projectRoot, tsconfig))}`;
    outcome = runTscLike(bin, tsconfig, file, projectRoot);
  }

  if (outcome.broken) return result("fail", `${tool} did not run cleanly:\n${outcome.broken}`, { tool });
  const note = outcome.elsewhere ? `; ${outcome.elsewhere} error(s) in other files, not counted` : "";
  return outcome.errors.length
    ? result("fail", `${outcome.errors.length} type error(s) in this file (${tool})${note}`, { tool, errors: outcome.errors })
    : result("pass", `no type errors in this file (${tool})${note}`, { tool });
}

// Rendering in Node reaches these only when a component touches the browser
// during render rather than in an effect. That breaks SSR (Next.js server
// components, any prerender) but is fine in a client-only app, so it is a
// warning, not a failure.
const BROWSER_GLOBALS =
  /\b(window|document|navigator|localStorage|sessionStorage|matchMedia|requestAnimationFrame|HTMLElement|ResizeObserver|IntersectionObserver|MutationObserver|getComputedStyle|WebGLRenderingContext)\b is not defined/;

const isComponent = (v) => typeof v === "function" || (v && typeof v === "object" && "$$typeof" in v);

function pascal(name) {
  return name
    .replace(/\.[^.]+$/, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join("");
}

/**
 * Which export to render: --export when given, else the default export, else
 * the one named after the file (marquee.tsx -> Marquee), else the first
 * PascalCase component export. Sub-components that only work inside a parent
 * (CardItem inside CardContainer) are why this picks one instead of all.
 */
export function pickExport(mod, file, wanted) {
  const names = Object.keys(mod).filter((k) => isComponent(mod[k]));
  if (wanted) return names.includes(wanted) ? wanted : null;
  if (names.includes("default")) return "default";
  const byFile = pascal(basename(file));
  const ci = names.find((n) => n.toLowerCase() === byFile.toLowerCase());
  if (ci) return ci;
  return names.find((n) => /^[A-Z]/.test(n)) ?? null;
}

/**
 * Check 4 of #65: mount the component and confirm it renders without
 * throwing. React only, with the project's own react, react-dom, and esbuild
 * (Vite ships esbuild, so a Vite project already has it).
 *
 * The file is bundled with its local imports and tsconfig paths resolved and
 * react left external, written under node_modules/.cache in the project so
 * its react import resolves to the project's copy, then rendered with
 * react-dom/server. That runs every component function in the tree but no
 * effects, which is the line between "renders" and "animates".
 */
export async function checkRender(file, projectRoot, opts = {}) {
  const result = (status, summary, extra = {}) => ({ name: "render", status, summary, ...extra });
  const framework = frameworkOf(file);
  if (framework !== "react") {
    return result("skip", `smoke-render is React only for now; the ${framework} file is still typechecked`);
  }

  const esbuildPath = resolveFromProject(projectRoot, "esbuild");
  const reactPath = resolveFromProject(projectRoot, "react");
  const serverPath = resolveFromProject(projectRoot, "react-dom/server");
  const missing = [!esbuildPath && "esbuild", !reactPath && "react", !serverPath && "react-dom"].filter(Boolean);
  if (missing.length) return result("skip", `${missing.join(", ")} not installed in this project`);

  let props = { children: "components-skill verify" };
  if (opts.props) {
    try {
      props = { ...props, ...JSON.parse(opts.props) };
    } catch (e) {
      throw new Error(`--props must be a JSON object: ${e.message}`);
    }
  }

  const req = createRequire(join(projectRoot, "package.json"));
  const esbuild = req("esbuild");
  const cache = join(projectRoot, "node_modules", ".cache", "components-skill-verify");
  mkdirSync(cache, { recursive: true });
  const id = randomBytes(4).toString("hex");
  const stub = join(cache, `entry-${id}.mjs`);
  const out = join(cache, `render-${id}.mjs`);
  writeFileSync(stub, `import * as M from ${JSON.stringify(posix(file))};\nexport default M;\n`);

  try {
    try {
      await esbuild.build({
        entryPoints: [stub],
        outfile: out,
        bundle: true,
        format: "esm",
        platform: "node",
        jsx: "automatic",
        absWorkingDir: projectRoot,
        tsconfig: governingTsconfig(file, projectRoot) ?? undefined,
        external: ["react", "react/*", "react-dom", "react-dom/*"],
        loader: {
          ".css": "empty",
          ".svg": "dataurl",
          ".png": "dataurl",
          ".jpg": "dataurl",
          ".jpeg": "dataurl",
          ".gif": "dataurl",
          ".webp": "dataurl",
          ".woff": "empty",
          ".woff2": "empty",
        },
        define: { "process.env.NODE_ENV": '"production"' },
        // CommonJS dependencies inside an ESM bundle still call require().
        banner: { js: 'import { createRequire as __cvr } from "node:module"; const require = __cvr(import.meta.url);' },
        logLevel: "silent",
      });
    } catch (e) {
      const msgs = (e.errors || []).slice(0, 5).map((x) => `${x.location ? `${x.location.file}:${x.location.line}: ` : ""}${x.text}`);
      return result("fail", "could not bundle the file for rendering", { errors: msgs.length ? msgs : [String(e.message || e)] });
    }

    let mod;
    try {
      mod = (await import(pathToFileURL(out).href)).default;
    } catch (e) {
      const msg = String(e?.message || e);
      if (BROWSER_GLOBALS.test(msg)) {
        return result("warn", `module touches the browser at import time (${msg}); fine client-side, breaks SSR`);
      }
      return result("fail", `importing the bundled file threw: ${msg}`);
    }

    const name = pickExport(mod, file, opts.export);
    if (!name) {
      return result(opts.export ? "fail" : "skip", opts.export ? `no component export named '${opts.export}'` : "no component export found");
    }

    const React = req("react");
    const { renderToString } = req("react-dom/server");
    const label = name === "default" ? "default export" : `<${name} />`;
    try {
      const html = renderToString(React.createElement(mod[name], props));
      return result("pass", `${label} rendered without throwing (${html.length} chars of HTML)`, { export: name });
    } catch (e) {
      const msg = String(e?.message || e);
      if (BROWSER_GLOBALS.test(msg)) {
        return result("warn", `${label} touches the browser during render (${msg}); fine client-side, breaks SSR`, {
          export: name,
        });
      }
      return result("fail", `${label} threw while rendering: ${msg}`, {
        export: name,
        errors: ["pass required props with --props '{\"text\":\"Hi\"}' if the throw is a missing prop"],
      });
    }
  } finally {
    rmSync(stub, { force: true });
    rmSync(out, { force: true });
  }
}

/** Parse `--skip a,b` into a Set, rejecting names that are not checks. */
export function parseSkip(value, known = CHECKS) {
  const out = new Set();
  for (const s of (value || "").split(",").map((x) => x.trim()).filter(Boolean)) {
    if (!known.includes(s)) throw new Error(`Unknown check '${s}' in --skip. Expected one of: ${known.join(", ")}`);
    out.add(s);
  }
  return out;
}

export async function verify(file, opts = {}) {
  if (!file) throw new Error("verify needs a file, e.g. `components-skill verify src/components/ui/marquee.tsx`");
  const abs = resolve(opts.cwd || process.cwd(), file);
  if (!existsSync(abs) || !statSync(abs).isFile()) throw new Error(`not a file: ${abs}`);
  if (!SOURCE_EXTS.has(extname(abs).toLowerCase())) {
    throw new Error(`verify reads component source (${[...SOURCE_EXTS].join(", ")}), got ${extname(abs) || "no extension"}`);
  }

  const skip = parseSkip(opts.skip);
  const text = readFileSync(abs, "utf8");
  const projectRoot = opts.project ? resolve(opts.cwd || process.cwd(), opts.project) : findProjectRoot(dirname(abs));
  const checks = [];
  const run = async (name, fn) => {
    if (skip.has(name)) return checks.push({ name, status: "skip", summary: "skipped with --skip" });
    checks.push(await fn());
  };

  await run("colors", () => checkColors(text));
  await run("motion", () => checkMotion(text));
  const noProject = { status: "skip", summary: "no package.json above the file; pass --project <dir>" };
  await run("typecheck", () => (projectRoot ? checkTypes(abs, projectRoot) : { name: "typecheck", ...noProject }));
  await run("render", () => (projectRoot ? checkRender(abs, projectRoot, opts) : { name: "render", ...noProject }));

  return {
    file: abs,
    project: projectRoot,
    framework: frameworkOf(abs),
    ok: checks.every((c) => c.status !== "fail"),
    checks,
  };
}

const MARK = { pass: "pass", fail: "FAIL", warn: "warn", skip: "skip" };

export function formatVerify(result) {
  const lines = [`verify ${result.file} (${result.framework})`];
  if (result.project) lines.push(`project ${result.project}`);
  for (const c of result.checks) lines.push(`  [${MARK[c.status]}] ${c.name.padEnd(10)} ${c.summary}`);
  for (const c of result.checks) {
    if (c.findings?.length) {
      lines.push("");
      lines.push(`${c.name}:`);
      for (const f of c.findings) lines.push(`  ${`${f.line}:${f.column}`.padEnd(8)} ${f.match}`);
    }
    if (c.errors?.length) {
      lines.push("");
      lines.push(`${c.name}:`);
      for (const e of c.errors) lines.push(`  ${e}`);
    }
  }
  lines.push("");
  lines.push(result.ok ? "OK" : `${result.checks.filter((c) => c.status === "fail").length} check(s) failed.`);
  return lines.join("\n");
}

/** Walk up from startDir looking for `name`, stopping after stopDir if given. */
export function findUp(startDir, name, stopDir) {
  let dir = startDir;
  for (;;) {
    if (existsSync(join(dir, name))) return join(dir, name);
    if (stopDir && resolve(dir) === resolve(stopDir)) return null;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
