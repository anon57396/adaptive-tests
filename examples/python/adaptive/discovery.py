"""Discovery utilities for Python tests."""

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
    pass


class DiscoveryEngine:
    def __init__(self, root: Optional[str] = None) -> None:
        self.root = Path(root or os.getcwd()).resolve()

    def discover(self, signature: Signature) -> Any:
        candidates = list(self._iter_modules())
        for module in candidates:
            target = self._match_module(module, signature)
            if target is not None:
                return target
        raise DiscoveryError(f"Could not locate target matching {signature}")

    def _iter_modules(self) -> Iterable[ModuleType]:
        for file in self.root.rglob("*.py"):
            if file.name.startswith("test_") or file.name.endswith("_test.py"):
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

    @staticmethod
    def _has_methods(obj: Any, methods: Optional[List[str]]) -> bool:
        if not methods:
            return True
        for method in methods:
            if not hasattr(obj, method):
                return False
        return True
