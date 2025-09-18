"""Adaptive discovery utilities for Python test suites."""

from __future__ import annotations

import importlib.util
import inspect
import os
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType
from typing import Any, Iterable, List, Optional


@dataclass
class Signature:
    name: str
    type: str = "class"
    methods: Optional[List[str]] = None


class DiscoveryError(RuntimeError):
    """Raised when no module matches the provided signature."""


class DiscoveryEngine:
    """Walks a project tree to locate modules by structure rather than path."""

    def __init__(self, root: Optional[str] = None, *, ignore: Optional[List[str]] = None) -> None:
        self.root = Path(root or os.getcwd()).resolve()
        self.ignore = tuple(ignore or [])

    def discover(self, signature: Signature) -> Any:
        for module in self._iter_modules():
            target = self._match_module(module, signature)
            if target is not None:
                return target
        raise DiscoveryError(f"Could not locate target matching {signature}")

    def _iter_modules(self) -> Iterable[ModuleType]:
        for file in self.root.rglob("*.py"):
            if self._should_skip(file):
                continue
            spec = importlib.util.spec_from_file_location(file.stem, file)
            if not spec or not spec.loader:
                continue
            module = importlib.util.module_from_spec(spec)
            try:
                spec.loader.exec_module(module)  # type: ignore[attr-defined]
            except Exception:
                continue
            yield module

    def _should_skip(self, file: Path) -> bool:
        if file.name.startswith("test_") or file.name.endswith("_test.py"):
            return True
        rel = str(file.relative_to(self.root))
        return any(rel.startswith(prefix) for prefix in self.ignore)

    @staticmethod
    def _has_methods(obj: Any, methods: Optional[List[str]]) -> bool:
        if not methods:
            return True
        for method in methods:
            if not hasattr(obj, method):
                return False
        return True

    def _match_module(self, module: ModuleType, signature: Signature) -> Optional[Any]:
        for name, obj in inspect.getmembers(module):
            if name != signature.name:
                continue
            if signature.type == "class" and inspect.isclass(obj):
                if self._has_methods(obj, signature.methods):
                    return obj
            if signature.type == "function" and inspect.isfunction(obj):
                return obj
        return None
