#!/usr/bin/env python3
"""Record a receipt for every registry ref that has a stable upstream source.

    python3 scripts/pin-registry.py            # pin every pinnable ref
    python3 scripts/pin-registry.py --only marquee
    python3 scripts/pin-registry.py --dry-run  # report, write nothing

For each showpiece and framework variant whose fetch.url host has a
`registry_source` in code_libraries[], this:

1. fetches the live registry item at fetch.url,
2. finds the latest commit touching the same file in the library's GitHub
   repo and fetches the file at that commit,
3. and, when the two are the same JSON, writes fetch.pin:
   {"ref": "github:<owner>/<repo>@<sha>", "path": ..., "sha256": ..., "pinned_at": ...}

fetch.url is not changed. Users still get the live component; the pin is a
receipt saying "this is what we last verified, and here is the commit it
came from". scripts/health-check.py hashes the live item every week and
reports `drifted` when it no longer matches (#64). Reviewing that drift and
re-running this script is how a change upstream gets adopted on purpose
instead of silently.

The hash is over canonical JSON (sorted keys, no whitespace), so a host that
reformats or reorders the same item is not reported as drift.

Set GITHUB_TOKEN to lift the unauthenticated API limit (60 requests/hour).
Cult UI (manual fetch only), Aceternity (no public source), Inspira UI (its
registry JSON is generated at build time and never committed), and page-fetch
entries have no registry_source, so they are never pinned.
"""

import argparse
import datetime
import json
import os
import sys
import urllib.parse
import urllib.request

from _registry import COMPONENTS_JSON, load
from registry_pin import canonical_sha256, iter_pinnable, source_for

UA = "components-skill-pin/1.0 (+https://github.com/AnayDhawan/Components)"


def get(url, accept=None):
    headers = {"User-Agent": UA}
    if accept:
        headers["Accept"] = accept
    token = os.environ.get("GITHUB_TOKEN")
    if token and urllib.parse.urlparse(url).hostname == "api.github.com":
        headers["Authorization"] = f"Bearer {token}"
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=30) as r:
        return r.read()


def latest_commit(repo, path):
    q = urllib.parse.urlencode({"path": path, "per_page": 1})
    commits = json.loads(get(f"https://api.github.com/repos/{repo}/commits?{q}", "application/vnd.github+json"))
    return commits[0]["sha"] if commits else None


def render_fetch(fetch, multiline, indent):
    """Render a fetch object in the style the surrounding file already uses."""
    # A pin is several fields; folding it into a one-line fetch would make an
    # unreadable 250-column line, so a pinned fetch is always multi-line.
    if not multiline and "pin" not in fetch:
        return json.dumps(fetch, separators=(", ", ": ")).replace("{", "{ ", 1)[:-1] + " }"
    inner = indent + "  "
    parts = []
    for k, v in fetch.items():
        if k == "pin":
            pin = ",\n".join(f'{inner}  {json.dumps(pk)}: {json.dumps(pv)}' for pk, pv in v.items())
            parts.append(f'{inner}"pin": {{\n{pin}\n{inner}}}')
        else:
            parts.append(f"{inner}{json.dumps(k)}: {json.dumps(v)}")
    return "{\n" + ",\n".join(parts) + "\n" + indent + "}"


def replace_fetch(text, url, new_fetch):
    """Swap the fetch object holding `url` in place, keeping the file's layout.

    Rewriting components.json with json.dump would reflow all 900 lines; this
    touches only the one object.
    """
    needle = '"url": %s' % json.dumps(url)
    at = text.find(needle)
    if at < 0 or text.find(needle, at + 1) >= 0:
        raise ValueError(f"expected exactly one fetch with url {url}")
    start = text.rfind('"fetch":', 0, at)
    brace = text.index("{", start)
    _, end = json.JSONDecoder().raw_decode(text, brace)
    old = text[brace:end]
    line_start = text.rfind("\n", 0, start) + 1
    indent = text[line_start:start]
    return text[:brace] + render_fetch(new_fetch, "\n" in old, indent) + text[end:]


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--only", help="pin one showpiece name")
    ap.add_argument("--dry-run", action="store_true", help="report, write nothing")
    args = ap.parse_args()

    data = load()
    with open(COMPONENTS_JSON, encoding="utf-8") as f:
        text = f.read()
    today = datetime.date.today().isoformat()

    pinned = unchanged = skipped = 0
    for label, holder in iter_pinnable(data):
        if args.only and label.split(".")[0] != args.only:
            continue
        fetch = holder["fetch"]
        src = source_for(data, fetch["url"])
        try:
            live = canonical_sha256(get(fetch["url"]))
            sha = latest_commit(src["repo"], src["path"])
            if not sha:
                print(f"skip   {label}: no commit touches {src['repo']}/{src['path']}")
                skipped += 1
                continue
            raw = get(f"https://raw.githubusercontent.com/{src['repo']}/{sha}/{src['path']}")
            at_commit = canonical_sha256(raw)
        except Exception as e:  # noqa: BLE001 - one bad upstream must not stop the run
            print(f"skip   {label}: {type(e).__name__}: {e}")
            skipped += 1
            continue

        if at_commit != live:
            # The site and its repo disagree (a deploy lagging or ahead of
            # main). Pinning either side would record a receipt for something
            # nobody can fetch at that ref, so leave it unpinned.
            print(f"skip   {label}: live item differs from {src['repo']}@{sha[:7]}, not pinned")
            skipped += 1
            continue

        pin = {"ref": f"github:{src['repo']}@{sha}", "path": src["path"], "sha256": live, "pinned_at": today}
        old = fetch.get("pin") or {}
        if old.get("sha256") == live and old.get("ref") == pin["ref"]:
            unchanged += 1
            continue
        new_fetch = {k: v for k, v in fetch.items() if k != "pin"}
        new_fetch["pin"] = pin
        text = replace_fetch(text, fetch["url"], new_fetch)
        print(f"pin    {label}: {src['repo']}@{sha[:7]}")
        pinned += 1

    json.loads(text)  # never write a file that no longer parses
    if not args.dry_run and pinned:
        with open(COMPONENTS_JSON, "w", encoding="utf-8", newline="") as f:
            f.write(text)
    verb = "would pin" if args.dry_run else "pinned"
    print(f"\n{pinned} {verb}, {unchanged} already current, {skipped} skipped.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
