#!/usr/bin/env python3
"""Validate theme YAML, engine references and embedded styling CSS."""

from __future__ import annotations

import re
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
THEMES_DIR = ROOT / "themes"
MODE_NAMES = {"light", "dark"}


def _validate_css(path: Path, key: str, css: str) -> list[str]:
    errors = []
    without_comments = re.sub(r"/\*.*?\*/", "", css, flags=re.DOTALL)
    depth = 0
    for line_number, line in enumerate(without_comments.splitlines(), start=1):
        stripped = line.strip()
        if stripped.startswith("#") or re.search(r";\s+#", line):
            errors.append(f"{path.name}: {key} has a YAML-style comment in CSS line {line_number}")

        depth_before = depth
        depth += line.count("{") - line.count("}")
        if stripped.startswith("--") and depth_before < 1:
            errors.append(f"{path.name}: {key} has a custom property outside a rule in line {line_number}")
        if depth < 0:
            errors.append(f"{path.name}: {key} closes an unopened CSS rule in line {line_number}")
            depth = 0

    if depth:
        errors.append(f"{path.name}: {key} has {depth} unclosed CSS rule(s)")
    return errors


def _validate_theme_values(path: Path, name: str, values: dict) -> list[str]:
    errors = []
    modes = values.get("modes")
    if modes is not None:
        if not isinstance(modes, dict) or not modes or not set(modes).issubset(MODE_NAMES):
            errors.append(f"{path.name}: {name}.modes must contain light and/or dark")
        else:
            for mode_name, mode_values in modes.items():
                if not isinstance(mode_values, dict) or not mode_values:
                    errors.append(f"{path.name}: {name}.modes.{mode_name} must not be empty")
                    continue
                for key, value in mode_values.items():
                    if not isinstance(key, str) or not isinstance(value, str):
                        errors.append(
                            f"{path.name}: {name}.modes.{mode_name}.{key} must be a string"
                        )
                    if isinstance(value, str) and (key.startswith("card-mod-") or key.startswith("uix-")):
                        errors.extend(_validate_css(path, key, value))

    for key, value in values.items():
        if key == "modes":
            continue
        if not isinstance(key, str) or not isinstance(value, str):
            errors.append(f"{path.name}: {name}.{key} must be a string")
        if isinstance(value, str) and (key.startswith("card-mod-") or key.startswith("uix-")):
            errors.extend(_validate_css(path, key, value))
    return errors


def main() -> None:
    errors = []
    all_themes = {}
    files = sorted(THEMES_DIR.glob("*.yaml"))

    for path in files:
        try:
            data = yaml.safe_load(path.read_text(encoding="utf-8"))
        except yaml.YAMLError as err:
            errors.append(f"{path.name}: invalid YAML: {err}")
            continue
        if not isinstance(data, dict) or len(data) != 1:
            errors.append(f"{path.name}: expected exactly one top-level theme")
            continue
        name, values = next(iter(data.items()))
        if not isinstance(name, str) or not isinstance(values, dict):
            errors.append(f"{path.name}: invalid top-level theme definition")
            continue
        all_themes[name] = values
        errors.extend(_validate_theme_values(path, name, values))

    for name, values in all_themes.items():
        sections = [values]
        modes = values.get("modes")
        if isinstance(modes, dict):
            sections.extend(value for value in modes.values() if isinstance(value, dict))
        for section in sections:
            for key in ("card-mod-theme", "uix-theme"):
                target = section.get(key)
                if target and target not in all_themes:
                    errors.append(f"{name}: {key} references missing theme {target!r}")

    if errors:
        raise SystemExit("\n".join(errors))
    print(f"Validated {len(files)} files and {len(all_themes)} themes.")


if __name__ == "__main__":
    main()
