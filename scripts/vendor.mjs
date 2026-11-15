#!/usr/bin/env node
// Vendors upstream skills listed in vendor.json into plugins/<plugin>/skills/.
//   node scripts/vendor.mjs            re-vendor every source at its upstream HEAD
//   node scripts/vendor.mjs <repo>     re-vendor one source (e.g. emilkowalski/skills)
//   node scripts/vendor.mjs --check    list sources whose upstream has moved; change nothing
//   node scripts/vendor.mjs --lint     check claude.ai plugin limits only
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const manifestPath = path.join(root, 'vendor.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const arg = process.argv[2];
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

// claude.ai sync limits (see README): per plugin 5,000 files / 200 MB; description <= 1024 chars, no angle brackets.
function lint() {
  let bad = 0;
  for (const plugin of fs.readdirSync(path.join(root, 'plugins'))) {
    const dir = path.join(root, 'plugins', plugin);
    let files = 0, bytes = 0;
    const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else if (e.isFile()) { files++; bytes += fs.statSync(p).size; }
    } };
    walk(dir);
    const mb = Math.round(bytes / 1e6);
    console.log(`${plugin}: ${files} files, ${mb} MB`);
    if (files > 5000 || mb > 200) { console.error(`  OVER LIMIT (5000 files / 200 MB)`); bad++; }
    const names = new Map();
    for (const s of fs.readdirSync(path.join(dir, 'skills'))) {
      const f = path.join(dir, 'skills', s, 'SKILL.md');
      if (!fs.existsSync(f)) continue;
      const fm = frontmatter(fs.readFileSync(f, 'utf8'));
      if (fm.name && names.has(fm.name)) { console.error(`  duplicate name "${fm.name}": ${s} and ${names.get(fm.name)}`); bad++; }
      names.set(fm.name, s);
      if (fm.description.length > 1024) { console.error(`  ${s}: description ${fm.description.length} chars (max 1024)`); bad++; }
      if (/[<>]/.test(fm.description)) { console.error(`  ${s}: angle brackets in description`); bad++; }
      if (fs.existsSync(path.join(dir, 'skills', s, '.claude-plugin'))) { console.error(`  ${s}: nested .claude-plugin breaks sync`); bad++; }
    }
  }
  return bad;
}

// Good enough for name + description: handles plain, quoted and block (| or >) scalars.
function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const out = { name: '', description: '' };
  if (!m) return out;
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^(name|description):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2];
    if (/^[|>][+-]?$/.test(v) || v === '') {
      const buf = [];
      while (i + 1 < lines.length && /^(\s+|$)/.test(lines[i + 1])) buf.push(lines[++i].trim());
      v = buf.join(' ');
    }
    out[kv[1]] = v.replace(/^["']|["']$/g, '').replace(/\\n/g, ' ').trim();
  }
  return out;
}

function skillDirs(dir, out = []) {
  if (fs.existsSync(path.join(dir, 'SKILL.md'))) { out.push(dir); return out; }
  for (const e of fs.readdirSync(dir, { withFileTypes: true }))
    if (e.isDirectory() && e.name !== '.git' && e.name !== 'node_modules') skillDirs(path.join(dir, e.name), out);
  return out;
}

if (arg === '--lint') process.exit(lint() ? 1 : 0);

if (arg === '--check') {
  let stale = 0;
  for (const s of manifest.sources) {
    let head = '';
    try { head = git('ls-remote', `https://github.com/${s.repo}.git`, 'HEAD').split(/\s/)[0]; }
    catch { console.log(`?? ${s.repo}: upstream unreachable`); continue; }
    if (head !== s.sha) { stale++; console.log(`UPDATE ${s.repo}: ${(s.sha || 'none').slice(0, 8)} -> ${head.slice(0, 8)}`); }
    else console.log(`ok     ${s.repo}`);
  }
  console.log(stale ? `\n${stale} source(s) have upstream changes: node scripts/vendor.mjs <repo>` : '\nAll sources current.');
  process.exit(0);
}

// claude.ai drops skills whose description has angle brackets or runs past 1024 chars;
// rewrite such a description as one double-quoted line (JSON strings are valid YAML).
function fixDescription(text) {
  const fm = frontmatter(text);
  if (fm.description.length <= 1024 && !/[<>]/.test(fm.description)) return text;
  let d = fm.description.replace(/</g, '‹').replace(/>/g, '›');
  if (d.length > 1024) d = d.slice(0, 1020).replace(/\s+\S*$/, '') + ' …';
  return text.replace(/^(---\r?\n[\s\S]*?)^description:.*(?:\r?\n(?:\s+.*|))*?(?=\r?\n\S)/m, `$1description: ${JSON.stringify(d)}`);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vendor-'));
for (const s of manifest.sources) {
  if (arg && arg !== s.repo) continue;
  const src = path.join(tmp, s.repo.replace('/', '__'));
  if (!fs.existsSync(src)) git('clone', '--quiet', '--depth', '1', `https://github.com/${s.repo}.git`, src);
  s.sha = git('-C', src, 'rev-parse', 'HEAD');
  s.fetched = new Date().toISOString().slice(0, 10);
  const licenseFile = fs.readdirSync(src).find((f) => /^licen[sc]e/i.test(f));
  const dest = path.join(root, 'plugins', s.plugin, 'skills');
  const installed = [];
  for (const dir of skillDirs(path.join(src, s.path || ''))) {
    const base = path.basename(dir);
    if (s.only && !s.only.includes(base)) continue;
    if (s.skip && s.skip.includes(base)) continue;
    const name = (s.rename && s.rename[base]) || (s.prefix || '') + base;
    const target = path.join(dest, name);
    fs.rmSync(target, { recursive: true, force: true });
    fs.cpSync(dir, target, { recursive: true });
    for (const junk of ['.claude-plugin', '.git', 'node_modules', 'plugins'])
      fs.rmSync(path.join(target, junk), { recursive: true, force: true });
    // The skill's name must match its directory, and be unique within the plugin.
    const f = path.join(target, 'SKILL.md');
    let text = fs.readFileSync(f, 'utf8');
    text = fixDescription(text.replace(/^(---\r?\n[\s\S]*?^name:\s*).*$/m, `$1${name}`));
    fs.writeFileSync(f, text);
    if (licenseFile && !fs.readdirSync(target).some((x) => /^licen[sc]e/i.test(x)))
      fs.copyFileSync(path.join(src, licenseFile), path.join(target, 'LICENSE'));
    installed.push(name);
  }
  s.skills = installed.sort();
  console.log(`${s.repo} @ ${s.sha.slice(0, 8)} -> ${s.plugin}: ${installed.length} skills`);
}
fs.rmSync(tmp, { recursive: true, force: true });
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
process.exit(lint() ? 1 : 0);
