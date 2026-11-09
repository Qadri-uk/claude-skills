"""v0.9: --style-gallery — the cover-style gate that precedes the outline.

Humanize emits >=4 cover-style candidates: per-candidate cover-only render
commands (downstream renders ONLY S01), a zero-dependency style_gallery.html
picker, and style_gallery_plan.json. Then it stops. It never renders the
covers itself. Picking a cover yields a re-injection command that carries the
chosen style into the normal outline -> brief flow.

Spec: references/style-gallery-spec.md
"""

import argparse
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import humanize_ppt_v2 as hp


SAMPLE_SOURCE = ROOT / "tests" / "fixtures" / "v066-source.md"


def _seed_source():
    if not SAMPLE_SOURCE.parent.exists():
        SAMPLE_SOURCE.parent.mkdir(parents=True, exist_ok=True)
    if not SAMPLE_SOURCE.exists():
        SAMPLE_SOURCE.write_text(
            "# Test Source\n\n## 介绍\n这是一个测试源。\n\n"
            "## 起源\n这是另一段。\n\n## 横向对比\n7 概念对比表。\n\n"
            "## 收束\n5 句话总结。\n",
            encoding="utf-8",
        )


def _args(out, **over):
    base = dict(
        source=str(SAMPLE_SOURCE),
        out=str(out),
        title="测试标题",
        qa_from=None,
        max_qa_iterations=3,
        renderer="guizang",
        style_mode="stable-first",
        selected_template=None,
        presenter_adapter=False,
        export_adapter=False,
        occasion=None,
        mood=None,
        preview_count=None,
        beautiful_repo=None,
        no_beautiful_auto_clone=False,
        presenter=False,
        no_render=False,
        guizang_style="A",
        guizang_theme="ink-classic",
        guizang_accent=None,
        research_md=None,
        skip_install_check=True,
        preview_outline=False,
        confirm_outline=False,
        style_gallery=False,
        gallery_count=4,
    )
    base.update(over)
    return argparse.Namespace(**base)


# ---------------------------------------------------------------------------
# Candidate constants
# ---------------------------------------------------------------------------


def test_every_renderer_has_at_least_four_candidates():
    for renderer, pool in hp.STYLE_GALLERY_CANDIDATES.items():
        assert len(pool) >= 4, f"{renderer} has fewer than 4 candidates"
        ids = [c["id"] for c in pool]
        assert len(ids) == len(set(ids)), f"{renderer} has duplicate candidate ids"
        for c in pool:
            assert c["cli"].get("--renderer"), f"{c['id']} missing --renderer in cli"


def test_guizang_candidates_span_style_a_and_b():
    pool = hp.STYLE_GALLERY_CANDIDATES["guizang"]
    styles = {c["cli"].get("--guizang-style") for c in pool}
    assert "A" in styles and "B" in styles, "guizang gallery should span both tracks"


# ---------------------------------------------------------------------------
# Re-injection command
# ---------------------------------------------------------------------------


def test_reinjection_command_appends_style_args():
    args = _args("/tmp/whatever")
    base = hp._style_gallery_base_command(args, Path(SAMPLE_SOURCE))
    candidate = hp.STYLE_GALLERY_CANDIDATES["guizang"][0]
    cmd = hp._reinjection_command(base, candidate)
    assert "--renderer guizang" in cmd
    assert "--guizang-style A" in cmd
    assert "--guizang-theme ink-classic" in cmd
    assert "humanize_ppt.py" in cmd


def test_reinjection_command_quotes_title_with_spaces():
    args = _args("/tmp/whatever", title="a title with spaces")
    base = hp._style_gallery_base_command(args, Path(SAMPLE_SOURCE))
    cmd = hp._reinjection_command(base, hp.STYLE_GALLERY_CANDIDATES["guizang"][0])
    assert "'a title with spaces'" in cmd


# ---------------------------------------------------------------------------
# Per-candidate cover command
# ---------------------------------------------------------------------------


def test_cover_command_md_has_webgl_warning_for_style_a_only():
    cover = {"title": "T", "visible_content": ["one line"]}
    style_a = next(c for c in hp.STYLE_GALLERY_CANDIDATES["guizang"]
                   if c["cli"].get("--guizang-style") == "A")
    style_b = next(c for c in hp.STYLE_GALLERY_CANDIDATES["guizang"]
                   if c["cli"].get("--guizang-style") == "B")
    md_a = hp._style_gallery_cover_command_md(style_a, cover, "T", Path("s.md"), "CMD")
    md_b = hp._style_gallery_cover_command_md(style_b, cover, "T", Path("s.md"), "CMD")
    assert "WebGL" in md_a and "静态截图" in md_a
    assert "WebGL" not in md_b
    # Both must scope to cover-only and carry output paths + reinjection.
    for md in (md_a, md_b):
        assert "只渲染" in md and "cover.html" in md and "cover.png" in md
        assert "CMD" in md


# ---------------------------------------------------------------------------
# run_style_gallery_mode
# ---------------------------------------------------------------------------


def test_style_gallery_writes_picker_plan_and_commands(tmp_path):
    _seed_source()
    args = _args(tmp_path)
    rc = hp.run_style_gallery_mode(args)
    assert rc == 0
    assert (tmp_path / "style_gallery.html").exists()
    assert (tmp_path / "style_gallery_plan.json").exists()
    cmd_dir = tmp_path / "commands" / "style-gallery"
    cmds = sorted(p.name for p in cmd_dir.glob("*.md"))
    assert len(cmds) == 4
    # The gate stops before outline and brief.
    assert not (tmp_path / "outline-preview.md").exists()
    assert not (tmp_path / "guizang-production-prompt.md").exists()


def test_style_gallery_plan_json_is_well_formed(tmp_path):
    _seed_source()
    hp.run_style_gallery_mode(_args(tmp_path))
    plan = json.loads((tmp_path / "style_gallery_plan.json").read_text(encoding="utf-8"))
    assert plan["primary_renderer"] == "guizang"
    assert plan["gallery_count"] == 4
    assert len(plan["candidates"]) == 4
    for c in plan["candidates"]:
        assert c["command_file"].startswith("commands/style-gallery/")
        assert c["cover_html"].endswith("cover.html")
        assert "humanize_ppt.py" in c["reinjection_command"]
        # Each candidate's cover output dir is pre-created (empty, pending render).
        assert (tmp_path / Path(c["cover_html"]).parent).is_dir()


def test_gallery_count_floored_at_four(tmp_path):
    _seed_source()
    hp.run_style_gallery_mode(_args(tmp_path, gallery_count=1))
    plan = json.loads((tmp_path / "style_gallery_plan.json").read_text(encoding="utf-8"))
    assert plan["gallery_count"] == 4


def test_gallery_count_capped_at_pool_size(tmp_path):
    _seed_source()
    hp.run_style_gallery_mode(_args(tmp_path, gallery_count=99))
    plan = json.loads((tmp_path / "style_gallery_plan.json").read_text(encoding="utf-8"))
    pool_size = len(hp.STYLE_GALLERY_CANDIDATES["guizang"])
    assert plan["gallery_count"] == pool_size


def test_style_gallery_unknown_renderer_errors(tmp_path):
    _seed_source()
    args = _args(tmp_path, renderer="html-ppt")
    rc = hp.run_style_gallery_mode(args)
    assert rc == 2
    assert not (tmp_path / "style_gallery.html").exists()


def test_style_gallery_missing_source_errors(tmp_path):
    args = _args(tmp_path, source=str(tmp_path / "nope.md"))
    rc = hp.run_style_gallery_mode(args)
    assert rc == 2


# ---------------------------------------------------------------------------
# Zero-dependency picker
# ---------------------------------------------------------------------------


def test_picker_html_is_single_file_zero_dependency(tmp_path):
    _seed_source()
    hp.run_style_gallery_mode(_args(tmp_path))
    doc = (tmp_path / "style_gallery.html").read_text(encoding="utf-8")
    assert doc.startswith("<!DOCTYPE html>")
    # No external network dependency: no http(s) <script>/<link>, no CDN.
    assert "<script" not in doc
    assert "https://" not in doc and "http://" not in doc
    # iframes point at the relative cover paths only.
    assert 'src="outputs/style-gallery/' in doc
    # The honest pending caption is always present.
    assert "cover-note" in doc and "尚未渲染" in doc


def test_picker_html_escapes_title(tmp_path):
    _seed_source()
    hp.run_style_gallery_mode(_args(tmp_path, title="<script>x</script>"))
    doc = (tmp_path / "style_gallery.html").read_text(encoding="utf-8")
    assert "<script>x</script>" not in doc
    assert "&lt;script&gt;" in doc


# ---------------------------------------------------------------------------
# CLI end-to-end + gate ordering
# ---------------------------------------------------------------------------


def test_cli_style_gallery_exits_zero_and_stops(tmp_path):
    _seed_source()
    r = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "humanize_ppt.py"),
         "--source", str(SAMPLE_SOURCE), "--out", str(tmp_path),
         "--title", "Test", "--renderer", "guizang",
         "--style-gallery", "--skip-install-check"],
        cwd=ROOT, text=True, capture_output=True,
    )
    assert r.returncode == 0, r.stderr
    payload = json.loads(r.stdout)
    assert payload["stopped_at"] == "style-gallery"
    assert payload["gallery_count"] == 4
    assert (tmp_path / "style_gallery.html").exists()
    assert not (tmp_path / "guizang-production-prompt.md").exists()


def test_cli_style_gallery_wins_over_preview_outline(tmp_path):
    _seed_source()
    r = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "humanize_ppt.py"),
         "--source", str(SAMPLE_SOURCE), "--out", str(tmp_path),
         "--title", "Test", "--renderer", "guizang",
         "--style-gallery", "--preview-outline", "--skip-install-check"],
        cwd=ROOT, text=True, capture_output=True,
    )
    assert r.returncode == 0, r.stderr
    payload = json.loads(r.stdout)
    assert payload["stopped_at"] == "style-gallery"
    # The outline gate did NOT run.
    assert not (tmp_path / "outline-preview.md").exists()
