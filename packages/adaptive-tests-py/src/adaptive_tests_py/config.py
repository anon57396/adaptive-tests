"""Configuration loader for adaptive-tests-py.

This mirrors the JavaScript engine's cascading configuration strategy in a
Python-friendly manner. Configuration is purely optional; sensible defaults are
applied when no overrides exist. Users can provide inline overrides when
constructing the engine or drop a JSON file alongside their project
(`adaptive-tests.config.json` or `.adaptive-tests-py.json`).
"""

from __future__ import annotations

import json
import re
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

DEFAULT_CONFIG: Dict[str, Any] = {
    "discovery": {
        "extensions": [".py"],
        "max_depth": 12,
        "skip_directories": [
            "__pycache__",
            ".git",
            "node_modules",
            "build",
            "dist",
            "venv",
            ".venv",
            "coverage",
            "tests",
            "__snapshots__",
        ],
        "skip_files": [
            "*_test.py",
            "test_*.py",
        ],
        "scoring": {
            "paths": {
                "positive": {
                    "/src/": 12.0,
                    "/app/": 8.0,
                    "/services/": 6.0,
                    "/core/": 6.0,
                },
                "negative": {
                    "/tests/": -35.0,
                    "/fixtures/": -25.0,
                    "/examples/": -15.0,
                    "/legacy/": -20.0,
                },
            },
            "file_name": {
                "exact": 45.0,
                "case_insensitive": 28.0,
                "partial": 8.0,
                "regex": 12.0,
            },
            "methods": {
                "per_match": 3.0,
                "all_bonus": 5.0,
                "mismatch_penalty": -10.0,
            },
            "decorators": 5.0,
            "bases": 6.0,
            "docstring": 2.0,
            "module_exact": 10.0,
            "module_pattern": 5.0,
            "extension_bonus": {
                ".py": 0.0,
            },
        },
        "cache": {
            "enabled": True,
            "file": ".adaptive-tests-cache.json",
            "ttl_seconds": None,
            "log_warnings": False,
        },
    }
}


class ConfigLoader:
    """Load and merge configuration data for the discovery engine."""

    def __init__(self, root: Path) -> None:
        self.root = root

    def load(self, inline: Dict[str, Any] | None = None) -> Dict[str, Any]:
        config = deepcopy(DEFAULT_CONFIG)

        for data in self._iter_config_files():
            deep_merge(config, data)

        if inline:
            deep_merge(config, inline)

        return config

    # ------------------------------------------------------------------
    # Configuration sources
    # ------------------------------------------------------------------
    def _iter_config_files(self) -> Iterable[Dict[str, Any]]:
        candidates = (
            self.root / "adaptive-tests.config.json",
            self.root / ".adaptive-tests-py.json",
        )
        for path in candidates:
            if path.is_file():
                try:
                    yield json.loads(path.read_text(encoding="utf-8"))
                except json.JSONDecodeError:
                    # Ignore malformed files; the engine will continue with defaults
                    continue

        pyproject = self.root / "pyproject.toml"
        if pyproject.is_file():
            data = _load_pyproject(pyproject)
            tool_section = data.get("tool", {}) if isinstance(data, dict) else {}
            adaptive_section = tool_section.get("adaptive_tests") if isinstance(tool_section, dict) else None
            if isinstance(adaptive_section, dict):
                yield adaptive_section


def deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> None:
    """Recursively merge ``override`` into ``base`` in-place."""

    for key, value in override.items():
        if key not in base:
            base[key] = value
            continue

        if isinstance(base[key], dict) and isinstance(value, dict):
            deep_merge(base[key], value)
            continue

        base[key] = value


def _load_pyproject(path: Path) -> Dict[str, Any]:
    """Very small TOML reader for [tool.adaptive_tests] configuration."""

    result: Dict[str, Any] = {}
    current_table: Optional[List[str]] = None
    multiline_key: Optional[str] = None
    multiline_value: List[str] = []

    lines = path.read_text(encoding="utf-8").splitlines()

    for raw_line in lines:
        line = raw_line.strip()
        if not line or line.startswith('#'):
            continue

        if multiline_key is not None:
            multiline_value.append(raw_line)
            if line.endswith(']'):
                value = '\n'.join(multiline_value)
                _assign_toml_value(result, current_table, multiline_key, _parse_toml_value(value))
                multiline_key = None
                multiline_value = []
            continue

        if line.startswith('[') and line.endswith(']'):
            table = line[1:-1]
            parts = [part.strip().strip('"').strip("'") for part in table.split('.')]
            current_table = parts
            continue

        if '=' in line and current_table is not None:
            key, value = line.split('=', 1)
            key = key.strip().strip('"').strip("'")
            if value.strip().startswith('[') and not value.strip().endswith(']'):
                multiline_key = key
                multiline_value = [value]
                continue
            parsed = _parse_toml_value(value)
            _assign_toml_value(result, current_table, key, parsed)

    return result


def _assign_toml_value(store: Dict[str, Any], table: Optional[List[str]], key: str, value: Any) -> None:
    target = store
    if table:
        for part in table:
            target = target.setdefault(part, {})
    target[key] = value


def _parse_toml_value(raw: str) -> Any:
    value = raw.strip()
    if value.lower() in {"true", "false"}:
        return value.lower() == "true"
    if value.startswith('"') and value.endswith('"'):
        return value[1:-1]
    if value.startswith("'") and value.endswith("'"):
        return value[1:-1]
    if value.startswith('[') and value.endswith(']'):
        inner = value[1:-1].strip()
        if not inner:
            return []
        items = _split_toml_list(inner)
        return [_parse_toml_value(item) for item in items]
    number_match = re.fullmatch(r"[-+]?[0-9]+", value)
    if number_match:
        return int(value)
    float_match = re.fullmatch(r"[-+]?[0-9]*\.[0-9]+", value)
    if float_match:
        return float(value)
    return value


def _split_toml_list(inner: str) -> List[str]:
    items: List[str] = []
    current = []
    depth = 0
    in_string = False
    string_char = ''
    for char in inner:
        if in_string:
            current.append(char)
            if char == string_char and (len(current) < 2 or current[-2] != '\\'):
                in_string = False
            continue
        if char in {'"', "'"}:
            in_string = True
            string_char = char
            current.append(char)
            continue
        if char == '[':
            depth += 1
        elif char == ']':
            depth -= 1
        elif char == ',' and depth == 0:
            items.append(''.join(current).strip())
            current = []
            continue
        current.append(char)
    if current:
        items.append(''.join(current).strip())
    return items
