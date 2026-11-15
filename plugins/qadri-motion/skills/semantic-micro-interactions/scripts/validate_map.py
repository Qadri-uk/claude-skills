#!/usr/bin/env python3
"""Validate a semantic micro-interaction map without third-party packages."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

TRIGGERS = {"activate", "focus", "hover", "state-change", "validation", "completion", "gesture-end"}
INTENTS = {"acknowledge", "confirm", "reject", "reveal", "connect", "progress", "settle"}
SPATIAL = {"transform", "position", "scale", "rotation", "parallax", "path"}
CONSEQUENTIAL = {"destructive", "submission", "navigation", "persistent-state-change"}
SOUND_EVENT = re.compile(r"^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$")


def validate(data):
    errors = []
    if data.get("version") != 1:
        errors.append("version must be 1")
    interactions = data.get("interactions")
    if not isinstance(interactions, list) or not interactions:
        return errors + ["interactions must be a non-empty array"]
    ids = []
    for index, item in enumerate(interactions):
        at = f"interactions[{index}]"
        if not isinstance(item, dict):
            errors.append(f"{at} must be an object")
            continue
        interaction_id = item.get("id")
        if not isinstance(interaction_id, str) or not interaction_id.strip():
            errors.append(f"{at}.id must be a non-empty string")
        else:
            ids.append(interaction_id)
        if item.get("trigger") not in TRIGGERS:
            errors.append(f"{at}.trigger must be one of {sorted(TRIGGERS)}")
        if item.get("intent") not in INTENTS:
            errors.append(f"{at}.intent must be one of {sorted(INTENTS)}")
        equivalents = item.get("equivalents") or {}
        if item.get("trigger") == "hover" and item.get("required", True):
            if not any(equivalents.get(key) for key in ("keyboard", "activation", "separateControl")):
                errors.append(f"{at}: required hover interaction needs a focus or activation equivalent")
        feedback = item.get("feedback") or {}
        full = feedback.get("full") or {}
        properties = set(full.get("properties") or [])
        if properties & SPATIAL and item.get("essential") is not True:
            if not feedback.get("reduced") and not feedback.get("none"):
                errors.append(f"{at}: non-essential spatial motion needs a reduced or no-motion fallback")
        if item.get("essential") is True and not item.get("essentialReason"):
            errors.append(f"{at}: essential motion needs essentialReason")
        undo = item.get("undo") or {}
        if item.get("consequence") in CONSEQUENTIAL and item.get("commitPhase") == "pointer-down":
            if not undo.get("enabled") and item.get("essential") is not True:
                errors.append(f"{at}: consequential action cannot commit on pointer-down without undo")
        event = feedback.get("soundEvent")
        if event is not None and (not isinstance(event, str) or not SOUND_EVENT.fullmatch(event)):
            errors.append(f"{at}.feedback.soundEvent must be a semantic dotted identifier")
        forbidden = {"sound", "audio", "src", "autoplay", "volume", "provider", "preload", "mixer"}
        if forbidden & set(feedback):
            errors.append(f"{at}.feedback owns audio playback; use soundEvent only")
    duplicates = sorted({value for value in ids if ids.count(value) > 1})
    if duplicates:
        errors.append(f"interaction ids must be unique: {', '.join(duplicates)}")
    return errors


def main(argv=None):
    argv = argv or sys.argv[1:]
    if len(argv) != 1:
        print("usage: validate_map.py MAP.json", file=sys.stderr)
        return 2
    path = Path(argv[0])
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        print(f"{path}: {error}", file=sys.stderr)
        return 2
    errors = validate(data)
    for error in errors:
        print(f"error: {error}", file=sys.stderr)
    if errors:
        return 1
    print(f"valid: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
