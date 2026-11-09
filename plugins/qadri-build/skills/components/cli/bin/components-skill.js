#!/usr/bin/env node
import { resolve } from "node:path";
import { add } from "../src/commands/add.js";
import { update } from "../src/commands/update.js";
import { search, formatResults, toJson } from "../src/commands/search.js";
import { extractTokens, formatTokens } from "../src/commands/tokens.js";
import { list, formatList } from "../src/commands/list.js";
import { verify, formatVerify, CHECKS } from "../src/commands/verify.js";
import { packageVersion } from "../src/lib/dist.js";
import { AGENTS } from "../src/lib/layout.js";

const USAGE = `components-skill - install the \`components\` skill into your agent's config dir

Usage:
  npx components-skill@latest add [options]
  npx components-skill@latest update [options]
  npx components-skill@latest list [options]
  npx components-skill@latest search <query> [options]
  npx components-skill@latest tokens [path] [options]
  npx components-skill@latest verify <file> [options]

Options:
  --agent <name>    ${AGENTS.join(" | ")} | all      (default: claude for add/update, every agent for list)
  --global          install into your user config dir instead of this project (list: global only)
  --force           update: overwrite files you have edited locally
  --dry-run         add: print every file that would be written, and where; write nothing
  --library <name>  search: restrict to one source library
  --framework <fw>  search: react | vue | svelte (default react); composes with --library
  --json            search, tokens, list, verify: print machine-readable JSON instead of a summary
  --project <dir>   verify: the project the file lives in (default: nearest package.json above it)
  --skip <checks>   verify: comma list of ${CHECKS.join(", ")}
  --export <name>   verify: which export to render (default: default export, else the one named after the file)
  --props <json>    verify: props to render it with, e.g. '{"text":"Hi"}'
  -h, --help        show this
  -v, --version     print the version

Examples:
  npx components-skill@latest add                     # .claude/skills/components here
  npx components-skill@latest add --agent all         # every supported agent
  npx components-skill@latest add --agent cursor      # .cursor/rules + payload
  npx components-skill@latest add --global            # ~/.claude/skills/components
  npx components-skill@latest add --agent all --dry-run   # show what would land where
  npx components-skill@latest update                  # refresh, keeping local edits
  npx components-skill@latest list                    # what is installed where, and is it current
  npx components-skill@latest search "laptop opening" # find a showpiece by effect/alias
  npx components-skill@latest search card --library cult-ui
  npx components-skill@latest search text --framework svelte --json
  npx components-skill@latest tokens                  # read this project's brand tokens
  npx components-skill@latest tokens ../other-app --json
  npx components-skill@latest verify src/components/ui/marquee.tsx
  npx components-skill@latest verify src/lib/BlurText.svelte --skip render
`;

/**
 * Hand-rolled, because the whole surface is two commands and three flags.
 * A framework dependency here would be larger than the thing it parses, and this
 * package's main selling point is that it installs without pulling anything in.
 */
function parse(argv) {
  const opts = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") opts.help = true;
    else if (a === "-v" || a === "--version") opts.version = true;
    else if (a === "--global") opts.global = true;
    else if (a === "--force") opts.force = true;
    else if (a === "--json") opts.json = true;
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--agent") {
      opts.agent = argv[++i];
      if (!opts.agent || opts.agent.startsWith("-")) throw new Error("--agent needs a value");
    } else if (a.startsWith("--agent=")) opts.agent = a.slice("--agent=".length);
    else if (a === "--library") {
      opts.library = argv[++i];
      if (!opts.library || opts.library.startsWith("-")) throw new Error("--library needs a value");
    } else if (a.startsWith("--library=")) opts.library = a.slice("--library=".length);
    else if (a === "--framework") {
      opts.framework = argv[++i];
      if (!opts.framework || opts.framework.startsWith("-")) throw new Error("--framework needs a value");
    } else if (a.startsWith("--framework=")) opts.framework = a.slice("--framework=".length);
    else if (["--project", "--skip", "--export", "--props"].includes(a)) {
      const key = a.slice(2);
      opts[key] = argv[++i];
      if (opts[key] === undefined || (key !== "props" && opts[key].startsWith("-"))) throw new Error(`${a} needs a value`);
    } else if (/^--(project|skip|export|props)=/.test(a)) {
      const eq = a.indexOf("=");
      opts[a.slice(2, eq)] = a.slice(eq + 1);
    }
    else if (a.startsWith("-")) throw new Error(`Unknown flag: ${a}`);
    else opts._.push(a);
  }
  return opts;
}

async function main(argv) {
  let opts;
  try {
    opts = parse(argv);
  } catch (e) {
    console.error(e.message);
    console.error(`\n${USAGE}`);
    return 1;
  }

  if (opts.version) {
    console.log(packageVersion());
    return 0;
  }

  const cmd = opts._[0];
  if (opts.help || !cmd) {
    console.log(USAGE);
    return cmd ? 0 : 1;
  }

  try {
    if (cmd === "add") {
      console.log(opts.dryRun ? "Dry run: components skill install plan..." : "Installing components skill...");
      const r = add(opts);
      return r.length ? 0 : 1;
    }
    if (cmd === "update") {
      console.log(`Updating components skill...`);
      update(opts);
      return 0;
    }
    if (cmd === "verify") {
      const result = await verify(opts._[1], opts);
      console.log(opts.json ? JSON.stringify(result, null, 2) : formatVerify(result));
      return result.ok ? 0 : 1;
    }
    if (cmd === "list") {
      const result = list(opts);
      console.log(opts.json ? JSON.stringify(result, null, 2) : formatList(result));
      return 0;
    }
    if (cmd === "search") {
      const query = opts._.slice(1).join(" ");
      const results = search(query, opts);
      console.log(opts.json ? JSON.stringify(toJson(results), null, 2) : formatResults(results));
      return results.length ? 0 : 1;
    }
    if (cmd === "tokens") {
      const projectDir = opts._[1] ? resolve(opts._[1]) : process.cwd();
      const result = extractTokens(projectDir);
      // --json output is for machines, so its warnings go to stderr, where a
      // person still sees them and stdout stays one parseable document.
      if (opts.json) for (const w of result.warnings) console.error(`warning: ${w}`);
      console.log(opts.json ? JSON.stringify(result, null, 2) : formatTokens(result));
      return result.cssFile || result.configFile ? 0 : 1;
    }
    console.error(`Unknown command: ${cmd}\n`);
    console.error(USAGE);
    return 1;
  } catch (e) {
    console.error(`\nerror: ${e.message}`);
    return 1;
  }
}

main(process.argv.slice(2)).then((code) => process.exit(code));
