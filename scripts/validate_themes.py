#!/usr/bin/env python3
"""Validate theme YAML, engine references and embedded styling CSS."""

from __future__ import annotations

import re
from pathlib import Path

import yaml
from yaml.constructor import ConstructorError
from yaml.resolver import BaseResolver


ROOT = Path(__file__).resolve().parents[1]
THEMES_DIR = ROOT / "themes"
MODE_NAMES = {"light", "dark"}
EXPECTED_VERSION = "1.5.0"
EXPECTED_RELEASE_DATE = "2026-09-30"

REQUIRED_COMPATIBILITY_KEYS = {
    "bubble-main-background-color",
    "bubble-select-list-background-color",
    "navbar-background-color",
    "navbar-backdrop-filter",
    "simple-swipe-card-pagination-dot-active-color",
    "sidebar-backdrop-filter",
    "sidebar-border-color",
    "mdc-theme-surface",
    "md-menu-container-color",
    "wa-color-surface-raised",
    "ha-card-glass-tint",
    "ha-card-backdrop-filter",
    "ha-card-glass-inset-shadow",
    "card-mod-sidebar",
    "card-mod-drawer",
    "card-mod-row-yaml",
    "card-mod-glance-yaml",
    "card-mod-card-yaml",
    "card-mod-root",
    "card-mod-badge",
    "frosted-glass-badge-shadow",
}


class UniqueKeyLoader(yaml.SafeLoader):
    """Safe YAML loader that rejects duplicate mapping keys."""


def _construct_unique_mapping(
    loader: UniqueKeyLoader, node: yaml.MappingNode, deep: bool = False
) -> dict:
    loader.flatten_mapping(node)
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in mapping:
            raise ConstructorError(
                "while constructing a mapping",
                node.start_mark,
                f"found duplicate key {key!r}",
                key_node.start_mark,
            )
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping


UniqueKeyLoader.add_constructor(
    BaseResolver.DEFAULT_MAPPING_TAG, _construct_unique_mapping
)


def _validate_css(path: Path, key: str, css: str) -> list[str]:
    errors = []
    if css.count("/*") != css.count("*/"):
        errors.append(f"{path.name}: {key} has an unbalanced CSS comment")
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

    stack: list[tuple[str, int]] = []
    pairs = {")": "(", "]": "[", "}": "{"}
    quote = None
    escaped = False
    for offset, character in enumerate(without_comments):
        if quote is not None:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == quote:
                quote = None
            continue
        if character in {'"', "'"}:
            quote = character
        elif character in "([{":
            stack.append((character, offset))
        elif character in ")]}":
            if not stack or stack[-1][0] != pairs[character]:
                line_number = without_comments.count("\n", 0, offset) + 1
                errors.append(
                    f"{path.name}: {key} has unmatched {character!r} in line {line_number}"
                )
                break
            stack.pop()
    if quote is not None:
        errors.append(f"{path.name}: {key} has an unclosed {quote} string")
    if stack:
        character, offset = stack[-1]
        line_number = without_comments.count("\n", 0, offset) + 1
        errors.append(
            f"{path.name}: {key} has unclosed {character!r} from line {line_number}"
        )
    return errors


def _validate_style(path: Path, key: str, value: str) -> list[str]:
    if key.endswith("-theme"):
        return []
    if not key.endswith("-yaml"):
        return _validate_css(path, key, value)
    try:
        styles = yaml.load(value, Loader=UniqueKeyLoader)
    except yaml.YAMLError as err:
        return [f"{path.name}: {key} contains invalid styling YAML: {err}"]

    def walk(node: object, location: str) -> list[str]:
        if isinstance(node, str):
            return _validate_css(path, location, node)
        if not isinstance(node, dict) or not node:
            return [f"{path.name}: {location} must be CSS or a non-empty mapping"]
        errors = []
        for selector, child in node.items():
            if not isinstance(selector, str):
                errors.append(f"{path.name}: {location} selector must be a string")
            errors.extend(walk(child, f"{location}.{selector}"))
        return errors

    return walk(styles, key)


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
                        errors.extend(_validate_style(path, key, value))

    for key, value in values.items():
        if key == "modes":
            continue
        if not isinstance(key, str) or not isinstance(value, str):
            errors.append(f"{path.name}: {name}.{key} must be a string")
        if isinstance(value, str) and (key.startswith("card-mod-") or key.startswith("uix-")):
            errors.extend(_validate_style(path, key, value))
    return errors


def _validate_compatibility(path: Path, name: str, values: dict) -> list[str]:
    """Validate contracts that prevent visual regressions in HA and HACS cards."""

    errors = []
    sections = [values]
    modes = values.get("modes")
    if isinstance(modes, dict):
        sections.extend(value for value in modes.values() if isinstance(value, dict))

    for section in sections:
        if "card-mod-theme" not in section:
            continue
        styling_yaml = section.get("card-mod-card-yaml")
        missing_keys = sorted(REQUIRED_COMPATIBILITY_KEYS - section.keys())
        if missing_keys:
            errors.append(
                f"{path.name}: {name} compatibility keys missing: "
                + ", ".join(missing_keys)
            )
        try:
            styling = (
                yaml.load(styling_yaml, Loader=UniqueKeyLoader)
                if isinstance(styling_yaml, str) else {}
            )
        except yaml.YAMLError:
            # Reported with its location by _validate_style.
            continue
        card_css = styling.get(".") if isinstance(styling, dict) else None
        root_css = section.get("card-mod-root")
        if not isinstance(card_css, str) or not isinstance(root_css, str):
            continue

        if section.get("ha-dialog-surface-backdrop-filter") != "none":
            errors.append(
                f"{path.name}: {name} must keep dialog backdrop-filter disabled "
                "for fixed-position legacy dropdowns"
            )

        if re.search(r"input\s*,\s*ha-textfield\s*,\s*ha-select", root_css):
            errors.append(
                f"{path.name}: {name} filters/styles ha-select with text inputs; "
                "this can displace fixed-position menus"
            )

        if "Lite" in name:
            for key in ("ha-card-backdrop-filter", "sidebar-backdrop-filter", "navbar-backdrop-filter"):
                if section.get(key) != "none":
                    errors.append(f"{path.name}: {name} Lite {key} must be none")
            if re.search(r"(?<![\w-])(?:-webkit-)?backdrop-filter\s*:", card_css):
                errors.append(f"{path.name}: {name} Lite card CSS must not use backdrop-filter")

    return errors


def main() -> None:
    errors = []
    all_themes = {}
    files = sorted(THEMES_DIR.glob("*.yaml"))

    for path in files:
        header = path.read_text(encoding="utf-8").splitlines()[:2]
        expected_header = f"# ver. {EXPECTED_VERSION} - ({EXPECTED_RELEASE_DATE})"
        if len(header) < 2 or header[1] != expected_header:
            errors.append(f"{path.name}: expected version header {expected_header!r}")
        try:
            data = yaml.load(path.read_text(encoding="utf-8"), Loader=UniqueKeyLoader)
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
        errors.extend(_validate_compatibility(path, name, values))

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
