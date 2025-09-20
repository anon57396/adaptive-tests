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
    type: Optional[str] = None  # 'class', 'module', 'function'
    properties: Optional[List[str]] = None
    exports: Optional[List[str]] = None


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

            # For __init__.py files, use the package name (parent directory)
            if file.name == '__init__.py':
                module_name = file.parent.name
            else:
                module_name = file.stem

            spec = importlib.util.spec_from_file_location(module_name, file)
            if not spec or not spec.loader:
                continue
            module = importlib.util.module_from_spec(spec)
            try:
                spec.loader.exec_module(module)  # type: ignore[attr-defined]
            except Exception:
                continue
            yield module

    def _match(self, module: ModuleType, signature: Signature) -> Optional[Any]:
        # Handle module-level discovery
        if signature.type == 'module' and signature.exports:
            # Check various module name patterns
            module_file = str(module.__file__) if module.__file__ else ""
            is_match = (
                module.__name__ == signature.name or
                module.__name__.endswith(f".{signature.name}") or
                module.__name__.endswith(f".{signature.name}.__init__") or
                f"/{signature.name}/__init__.py" in module_file or
                f"/{signature.name}.py" in module_file
            )
            if is_match:
                # Check if module has the required exports
                if all(hasattr(module, export) for export in signature.exports):
                    return module

        # Handle class and other discoveries
        for name, obj in inspect.getmembers(module):
            if name != signature.name:
                continue

            # Check class discovery
            if inspect.isclass(obj):
                # Check methods
                if not self._has_methods(obj, signature.methods):
                    continue
                # Check properties if specified
                if signature.properties and not self._has_properties(obj, signature.properties):
                    continue
                return obj

            # Check function discovery
            if signature.type == 'function' and inspect.isfunction(obj):
                return obj

        return None

    @staticmethod
    def _has_methods(obj: Any, methods: Optional[List[str]]) -> bool:
        if not methods:
            return True
        return all(hasattr(obj, method) for method in methods)

    @staticmethod
    def _has_properties(obj: Any, properties: Optional[List[str]]) -> bool:
        if not properties:
            return True
        return all(hasattr(obj, prop) for prop in properties)
