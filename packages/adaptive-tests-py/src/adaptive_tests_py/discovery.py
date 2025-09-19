"""Static discovery utilities for Python test suites.

This module mirrors the zero-runtime guarantees of the JavaScript discovery
engine by analysing source files with :mod:`ast` instead of importing every
module that matches a glob. The engine walks the project tree, scores
potential matches, and (optionally) resolves the best candidate on demand.
"""

from __future__ import annotations

import ast
import importlib
import importlib.util
import os
import re
import sys
from dataclasses import dataclass
from hashlib import sha1
from pathlib import Path
from typing import Any, Iterable, Iterator, List, Optional, Sequence, Tuple


@dataclass(frozen=True)
class Signature:
    """Structure-based query used to locate a target symbol.

    Parameters
    ----------
    name:
        Identifier or regular expression for the symbol to locate.
    type:
        ``"class"`` (default), ``"function"`` or ``"any"``.
    methods:
        Optional method names that must exist on the discovered class.
    module:
        Exact module path (``package.module``) that the target must live in.
    module_pattern:
        Regular expression that the module path must satisfy. Ignored when
        ``module`` is provided.
    decorators:
        Optional decorator names (without the ``@``) that must decorate the
        target. For example ``("dataclass",)`` matches ``@dataclass``.
    bases:
        Base classes that must be present on the discovered class.
    docstring_contains:
        Lower-cased fragments that should appear in the docstring.
    regex:
        Treat ``name`` as a regular expression if ``True``. Defaults to
        ``False`` (exact match).
    case_sensitive:
        Apply case-sensitive matching to ``name`` when ``regex`` is ``False``.
    """

    name: str
    type: str = "class"
    methods: Optional[Sequence[str]] = None
    module: Optional[str] = None
    module_pattern: Optional[str] = None
    decorators: Optional[Sequence[str]] = None
    bases: Optional[Sequence[str]] = None
    docstring_contains: Optional[Sequence[str]] = None
    regex: bool = False
    case_sensitive: bool = True

    def __post_init__(self) -> None:
        object.__setattr__(self, "methods", tuple(self.methods or ()))
        object.__setattr__(self, "decorators", tuple(self.decorators or ()))
        object.__setattr__(self, "bases", tuple(self.bases or ()))
        object.__setattr__(self, "docstring_contains", tuple(self.docstring_contains or ()))


@dataclass
class DiscoveryResult:
    """Metadata describing a discovered symbol.

    The actual Python object is only imported when :meth:`load` is invoked,
    keeping the discovery phase free from user-code execution.
    """

    name: str
    type: str
    module: str
    file_path: Path
    lineno: int
    methods: Tuple[str, ...]
    decorators: Tuple[str, ...]
    bases: Tuple[str, ...]
    docstring: Optional[str]
    score: float
    root: Path

    _MODULE_NAMESPACE = "_adaptive_discovery"

    def load(self) -> Any:
        """Import and return the concrete Python object for this result."""

        module_name = self.module or self._fallback_module_name()
        root_str = str(self.root)
        cleanup_path = False

        if root_str not in sys.path:
            sys.path.insert(0, root_str)
            cleanup_path = True

        try:
            try:
                module = importlib.import_module(module_name)
            except ImportError:
                module = self._load_module_from_path(module_name)
        finally:
            if cleanup_path:
                try:
                    sys.path.remove(root_str)
                except ValueError:
                    pass

        try:
            return getattr(module, self.name)
        except AttributeError as exc:
            raise DiscoveryError(f"Symbol '{self.name}' not found in module '{module.__name__}'") from exc

    def _load_module_from_path(self, module_name: str) -> Any:
        unique_suffix = sha1(str(self.file_path).encode("utf-8")).hexdigest()[:8]
        fallback_name = f"{self._MODULE_NAMESPACE}.{module_name or unique_suffix}"
        spec = importlib.util.spec_from_file_location(fallback_name, self.file_path)
        if not spec or not spec.loader:
            raise DiscoveryError(f"Unable to import module from {self.file_path!s}")
        module = importlib.util.module_from_spec(spec)
        sys.modules[fallback_name] = module
        try:
            spec.loader.exec_module(module)  # type: ignore[attr-defined]
        except Exception as exc:  # pragma: no cover - surface original failure context
            raise DiscoveryError(f"Failed to load discovered module '{fallback_name}'") from exc
        return module

    def _fallback_module_name(self) -> str:
        rel = self.file_path.relative_to(self.root)
        dotted = ".".join(part for part in rel.with_suffix("").parts)
        return dotted or self.file_path.stem


class DiscoveryError(RuntimeError):
    """Raised when no module matches the provided signature."""


@dataclass
class _Candidate:
    name: str
    type: str
    module: str
    file_path: Path
    lineno: int
    methods: Tuple[str, ...]
    decorators: Tuple[str, ...]
    bases: Tuple[str, ...]
    docstring: Optional[str]


class DiscoveryEngine:
    """Walk a project tree and locate modules by static structure."""

    _DEFAULT_IGNORES = {
        "__pycache__",
        "node_modules",
        "build",
        "dist",
        "venv",
        ".venv",
        ".git",
    }

    def __init__(self, root: Optional[str] = None, *, ignore: Optional[List[str]] = None) -> None:
        self.root = Path(root or os.getcwd()).resolve()
        self.ignore = tuple(Path(pattern).as_posix() for pattern in (ignore or ()))

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def discover(self, signature: Signature, *, load: bool = True) -> Any:
        """Return the best match for ``signature``.

        When ``load`` is ``True`` (default) the concrete Python object is
        returned. Set ``load=False`` to receive a :class:`DiscoveryResult`
        without importing the module.
        """

        result = self._best_match(signature)
        if load:
            return result.load()
        return result

    def discover_all(self, signature: Signature) -> List[DiscoveryResult]:
        """Return every candidate that matches the signature (sorted by score)."""

        results = sorted(self._match_candidates(signature), key=lambda candidate: candidate.score, reverse=True)
        if not results:
            raise DiscoveryError(f"Could not locate target matching {signature!r}")
        return results

    # ------------------------------------------------------------------
    # Discovery internals
    # ------------------------------------------------------------------
    def _best_match(self, signature: Signature) -> DiscoveryResult:
        best: Optional[DiscoveryResult] = None
        for candidate in self._match_candidates(signature):
            if best is None or candidate.score > best.score:
                best = candidate
        if best is None:
            raise DiscoveryError(f"Could not locate target matching {signature!r}")
        return best

    def _match_candidates(self, signature: Signature) -> Iterator[DiscoveryResult]:
        for file_path in self._iter_python_files():
            for candidate in self._extract_candidates(file_path):
                score = self._score_candidate(candidate, signature)
                if score <= 0:
                    continue
                yield DiscoveryResult(
                    name=candidate.name,
                    type=candidate.type,
                    module=candidate.module,
                    file_path=candidate.file_path,
                    lineno=candidate.lineno,
                    methods=candidate.methods,
                    decorators=candidate.decorators,
                    bases=candidate.bases,
                    docstring=candidate.docstring,
                    score=score,
                    root=self.root,
                )

    def _iter_python_files(self) -> Iterable[Path]:
        for dirpath, dirnames, filenames in os.walk(self.root):
            dir_path = Path(dirpath)
            rel_dir = dir_path.relative_to(self.root)
            dirnames[:] = [
                name
                for name in dirnames
                if not self._should_skip_directory(rel_dir / name)
            ]

            for filename in filenames:
                if not filename.endswith(".py"):
                    continue
                file_path = dir_path / filename
                if self._should_skip_file(file_path):
                    continue
                yield file_path

    def _should_skip_directory(self, relative: Path) -> bool:
        if not relative.parts:
            return False
        name = relative.name
        if name.startswith('.') and name not in {'.', '..'}:
            return True
        if name in self._DEFAULT_IGNORES:
            return True
        rel = relative.as_posix()
        return any(rel.startswith(pattern) for pattern in self.ignore)

    def _should_skip_file(self, file_path: Path) -> bool:
        if file_path.name.startswith("test_") or file_path.name.endswith("_test.py"):
            return True
        rel = file_path.relative_to(self.root).as_posix()
        return any(rel.startswith(pattern) for pattern in self.ignore)

    def _extract_candidates(self, file_path: Path) -> Iterator[_Candidate]:
        try:
            source = file_path.read_text(encoding="utf-8")
        except OSError:
            return iter(())

        try:
            tree = ast.parse(source, filename=str(file_path))
        except SyntaxError:
            return iter(())

        module_name = self._module_name_for(file_path)
        for node in tree.body:
            if isinstance(node, ast.ClassDef):
                methods = tuple(
                    child.name
                    for child in node.body
                    if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef))
                )
                decorators = tuple(self._expr_to_name(expr) for expr in node.decorator_list)
                bases = tuple(self._expr_to_name(expr) for expr in node.bases)
                yield _Candidate(
                    name=node.name,
                    type="class",
                    module=module_name,
                    file_path=file_path,
                    lineno=node.lineno,
                    methods=methods,
                    decorators=decorators,
                    bases=bases,
                    docstring=ast.get_docstring(node),
                )
            elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                decorators = tuple(self._expr_to_name(expr) for expr in node.decorator_list)
                yield _Candidate(
                    name=node.name,
                    type="function" if isinstance(node, ast.FunctionDef) else "async_function",
                    module=module_name,
                    file_path=file_path,
                    lineno=node.lineno,
                    methods=(),
                    decorators=decorators,
                    bases=(),
                    docstring=ast.get_docstring(node),
                )

    # ------------------------------------------------------------------
    # Scoring
    # ------------------------------------------------------------------
    def _score_candidate(self, candidate: _Candidate, signature: Signature) -> float:
        if not self._type_matches(signature.type, candidate.type):
            return 0.0

        name_score = self._name_score(candidate.name, signature)
        if name_score == 0:
            return 0.0

        score = name_score

        if signature.methods:
            matches = sum(1 for method in signature.methods if method in candidate.methods)
            if matches != len(signature.methods):
                ratio = matches / len(signature.methods)
                if ratio < 0.5:
                    return 0.0
                score += 0.2 * ratio
            else:
                score += 0.3

        if signature.decorators:
            deco_matches = sum(1 for deco in signature.decorators if deco in candidate.decorators)
            if deco_matches != len(signature.decorators):
                return 0.0
            score += 0.05

        if signature.bases:
            base_matches = sum(1 for base in signature.bases if base in candidate.bases)
            if base_matches != len(signature.bases):
                return 0.0
            score += 0.1

        if signature.docstring_contains:
            docstring = (candidate.docstring or "").lower()
            doc_matches = sum(1 for fragment in signature.docstring_contains if fragment.lower() in docstring)
            score += 0.02 * doc_matches

        if signature.module:
            if candidate.module != signature.module:
                return 0.0
            score += 0.1
        elif signature.module_pattern:
            if not re.search(signature.module_pattern, candidate.module):
                return 0.0
            score += 0.05

        file_stem = candidate.file_path.stem.lower()
        if file_stem == signature.name.lower():
            score += 0.02

        return score

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _name_score(self, candidate_name: str, signature: Signature) -> float:
        if signature.regex:
            flags = 0 if signature.case_sensitive else re.IGNORECASE
            pattern = re.compile(signature.name, flags)
            return 0.6 if pattern.search(candidate_name) else 0.0

        candidate = candidate_name if signature.case_sensitive else candidate_name.lower()
        target = signature.name if signature.case_sensitive else signature.name.lower()

        if candidate == target:
            return 0.7
        if candidate.startswith(target):
            return 0.5
        if candidate.endswith(target):
            return 0.4
        if target in candidate:
            return 0.3
        return 0.0

    @staticmethod
    def _type_matches(requested: str, actual: str) -> bool:
        requested = (requested or "class").lower()
        actual = actual.lower()
        if requested in {"any", "*"}:
            return True
        if requested == "class":
            return actual == "class"
        if requested == "function":
            return actual in {"function", "async_function"}
        return requested == actual

    def _module_name_for(self, file_path: Path) -> str:
        rel = file_path.relative_to(self.root)
        parts = list(rel.parts)
        if parts[-1] == "__init__.py":
            parts = parts[:-1]
        else:
            parts[-1] = parts[-1][:-3]  # strip .py
        return ".".join(parts)

    @staticmethod
    def _expr_to_name(expr: ast.expr) -> str:
        if hasattr(ast, "unparse"):
            try:
                return ast.unparse(expr)  # type: ignore[attr-defined]
            except Exception:  # pragma: no cover - ast.unparse may fail for <3.9
                pass
        if isinstance(expr, ast.Name):
            return expr.id
        if isinstance(expr, ast.Attribute):
            return DiscoveryEngine._expr_to_name(expr.value) + "." + expr.attr
        if isinstance(expr, ast.Call):
            return DiscoveryEngine._expr_to_name(expr.func)
        return ast.dump(expr, annotate_fields=False)
