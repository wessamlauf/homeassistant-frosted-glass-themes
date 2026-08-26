#!/usr/bin/env python3
"""Generate the four single-mode themes from the two combined themes."""

from __future__ import annotations

import argparse
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
THEMES_DIR = ROOT / "themes"
VERSION = "1.4.0"
RELEASE_DATE = "2026-08-26"

SOURCES = {
    "Frosted Glass.yaml": {
        "light": "Frosted Glass Light.yaml",
        "dark": "Frosted Glass Dark.yaml",
    },
    "Frosted Glass Lite.yaml": {
        "light": "Frosted Glass Light Lite.yaml",
        "dark": "Frosted Glass Dark Lite.yaml",
    },
}


def _mode_body(source: str, mode: str) -> str:
    marker = f"    {mode}:\n"
    start = source.index(marker) + len(marker)
    end = source.index("\n    dark:\n", start) if mode == "light" else len(source)
    block = source[start:end].rstrip()

    lines = []
    for line in block.splitlines():
        if line and not line.startswith("      "):
            raise ValueError(f"Unexpected indentation in {mode} mode: {line!r}")
        lines.append(line[4:] if line else "")
    return "\n".join(lines)


def _theme_name(filename: str) -> str:
    return filename.removesuffix(".yaml")


def _render_single_mode(source: str, mode: str, filename: str) -> str:
    name = _theme_name(filename)
    body = _mode_body(source, mode)
    app_theme_color = re.search(
        r"^  app-theme-color:\s*(.+)$", body, flags=re.MULTILINE
    )
    if app_theme_color is None:
        raise ValueError(f"app-theme-color is missing from {name}")

    return (
        f"# {name}\n"
        f"# ver. {VERSION} - ({RELEASE_DATE})\n\n"
        f"{name}:\n"
        f"{body}\n\n"
        "  # A non-empty single-mode map is required by Home Assistant 2026.8+.\n"
        "  # Variables stay at the top level so card-mod and UIX can use this theme as an engine.\n"
        "  modes:\n"
        f"    {mode}:\n"
        f"      app-theme-color: {app_theme_color.group(1)}\n"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="Fail if a generated single-mode theme is out of date.",
    )
    args = parser.parse_args()

    stale = []
    for source_filename, outputs in SOURCES.items():
        source = (THEMES_DIR / source_filename).read_text(encoding="utf-8")
        for mode, output_filename in outputs.items():
            output = _render_single_mode(source, mode, output_filename)
            output_path = THEMES_DIR / output_filename
            if args.check:
                if output_path.read_text(encoding="utf-8") != output:
                    stale.append(output_filename)
            else:
                output_path.write_text(output, encoding="utf-8")

    if stale:
        raise SystemExit(
            "Generated themes are stale: "
            + ", ".join(stale)
            + ". Run scripts/sync_themes.py."
        )


if __name__ == "__main__":
    main()
