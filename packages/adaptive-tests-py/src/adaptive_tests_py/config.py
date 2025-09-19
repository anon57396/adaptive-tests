"""Configuration loader for adaptive-tests-py.

This mirrors the JavaScript engine's cascading configuration strategy in a
Python-friendly manner. Configuration is purely optional; sensible defaults are
applied when no overrides exist. Users can provide inline overrides when
constructing the engine or drop a JSON file alongside their project
(`adaptive-tests.config.json` or `.adaptive-tests-py.json`).
"""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, Iterable

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
