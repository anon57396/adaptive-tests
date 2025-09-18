"""Lightweight discovery engine used by the Python example."""

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
    methods: Optional[List[str]] = None


class DiscoveryEngine:
    def __init__(self, root: Optional[str] = None) -> None:
        self.root = Path(root or os.getcwd()).resolve()

    def discover(self, signature: Signature) -> Any:
        for module in self._iter_modules():
            target = self._match(module, signature)
            if target is not None:
                return target
        raise LookupError(f"No match for {signature}")

    def _iter_modules(self) -> Iterable[ModuleType]:
        for file in self.root.rglob('*.py'):
            if file.name.startswith('test_'):
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

    def _match(self, module: ModuleType, signature: Signature) -> Optional[Any]:
        for name, obj in inspect.getmembers(module):
            if name != signature.name:
                continue
            if inspect.isclass(obj) and self._has_methods(obj, signature.methods):
                return obj
        return None

    @staticmethod
    def _has_methods(obj: Any, methods: Optional[List[str]]) -> bool:
        if not methods:
            return True
        return all(hasattr(obj, method) for method in methods)
