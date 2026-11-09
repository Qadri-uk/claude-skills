#!/usr/bin/env python3
"""Shared helpers for fetch.pin (#64): which refs can be pinned, and the hash.

pin-registry.py writes pins, health-check.py checks them against the live
item, validate.py checks their shape. One definition of "pinnable" and one
hash function keeps the three from disagreeing about what a pin means.
"""

import hashlib
import json
import posixpath
import urllib.parse

PIN_METHODS = {"registry_cli", "registry_item"}


def canonical_sha256(raw):
    """sha256 of a registry item as canonical JSON (sorted keys, no whitespace).

    Hosts reformat and reorder the same item between deploys. Hashing the
    bytes would call that drift; hashing the parsed value does not.
    """
    value = json.loads(raw.decode("utf-8") if isinstance(raw, (bytes, bytearray)) else raw)
    canon = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canon.encode("utf-8")).hexdigest()


def source_for(data, url):
    """The registry_source for a fetch.url's host, with the file path resolved.

    Returns {"repo", "path"} or None. registry_source lives on code_libraries[]
    entries as {"host", "repo", "dir"}; the file is the URL's last path segment,
    with ".json" added when the URL omits it (reactbits.dev/r/SplitText-TS-TW).
    """
    parsed = urllib.parse.urlparse(url)
    for lib in data.get("code_libraries", []):
        src = lib.get("registry_source")
        if src and src.get("host") == parsed.hostname:
            name = posixpath.basename(parsed.path)
            if not name.endswith(".json"):
                name += ".json"
            return {"repo": src["repo"], "path": f"{src['dir'].rstrip('/')}/{name}"}
    return None


def iter_pinnable(data):
    """Yield (label, holder) for every entry or variant whose fetch can be pinned.

    holder is the dict that owns `fetch` (the showpiece itself or one of its
    framework variants). A host under known_issues[] is never pinnable: a
    receipt for content no automated client can fetch would be noise.
    """
    blocked = {rec.get("host") for rec in data.get("known_issues", [])}
    for entry in data.get("showpiece", []):
        holders = [(entry["name"], entry)]
        holders += [(f"{entry['name']}.frameworks.{fw}", v) for fw, v in (entry.get("frameworks") or {}).items()]
        for label, holder in holders:
            fetch = holder.get("fetch") if isinstance(holder, dict) else None
            if not isinstance(fetch, dict) or fetch.get("method") not in PIN_METHODS:
                continue
            url = fetch.get("url") or ""
            if urllib.parse.urlparse(url).hostname in blocked:
                continue
            if source_for(data, url):
                yield label, holder
