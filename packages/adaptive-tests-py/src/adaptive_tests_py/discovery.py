"""Static discovery utilities for Python test suites.

The design mirrors the JavaScript engine: discovery performs zero-runtime
analysis of project files, scores candidates using configurable heuristics, and
optionally caches successful resolutions to speed up subsequent runs. A
"Lens"-style explanation API surfaces the ranked candidates and scoring
breakdowns to aid debugging and signature tuning.
"""

from __future__ import annotations

import ast
import importlib
import importlib.util
import json
import os
import re
import sys
import time
from dataclasses import dataclass, field, asdict
from hashlib import sha1
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, List, MutableMapping, Optional, Sequence, Tuple

from .config import ConfigLoader, DEFAULT_CONFIG
from .scoring import CandidateSnapshot, ScoreReport, ScoringEngine


@dataclass(frozen=True)
class Signature:
    """Structure-based query used to locate a target symbol."""

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

    def to_mapping(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": self.type,
            "methods": list(self.methods or ()),
            "module": self.module,
            "module_pattern": self.module_pattern,
            "decorators": list(self.decorators or ()),
            "bases": list(self.bases or ()),
            "docstring_contains": list(self.docstring_contains or ()),
            "regex": self.regex,
            "case_sensitive": self.case_sensitive,
        }


@dataclass
class DiscoveryResult:
    """Metadata describing a discovered symbol."""

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
    score_breakdown: Dict[str, float]
    score_details: List[Dict[str, Any]]
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

    def explain(self) -> Dict[str, Any]:
        data = asdict(self)
        data["file_path"] = self.file_path.as_posix()
        data["root"] = self.root.as_posix()
        return data

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

    def __init__(self, root: Optional[str] = None, *, config: Optional[Dict[str, Any]] = None) -> None:
        self.root = Path(root or os.getcwd()).resolve()
        loader = ConfigLoader(self.root)
        merged_config = loader.load(config)
        self.config = merged_config
        scoring_config = merged_config.get("discovery", {}).get("scoring", DEFAULT_CONFIG["discovery"]["scoring"])
        self.scoring_engine = ScoringEngine(scoring_config)

        cache_config = merged_config["discovery"]["cache"]
        self._cache_enabled = bool(cache_config.get("enabled", True))
        self._cache_file = self.root / cache_config.get("file", ".adaptive-tests-cache.json")
        self._cache_ttl = cache_config.get("ttl_seconds")
        self._runtime_cache: Dict[str, DiscoveryResult] = {}
        self._persistent_cache: Dict[str, Dict[str, Any]] = {}
        self._cache_loaded = False

        self._skip_dirs = tuple(merged_config["discovery"].get("skip_directories", ()))
        self._skip_files = tuple(merged_config["discovery"].get("skip_files", ()))
        self._extensions = tuple(merged_config["discovery"].get("extensions", (".py",)))
        self._max_depth = int(merged_config["discovery"].get("max_depth", 12))

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def discover(self, signature: Signature | Dict[str, Any], *, load: bool = True) -> Any:
        signature_map = self._normalise_signature(signature)
        cache_key = self._cache_key(signature_map)

        if self._cache_enabled:
            self._ensure_cache_loaded()
            cached = self._get_cached_result(cache_key)
            if cached:
                return cached.load() if load else cached

        result = self._best_match(signature_map)
        if self._cache_enabled:
            self._remember(cache_key, result)
        return result.load() if load else result

    def discover_all(self, signature: Signature | Dict[str, Any]) -> List[DiscoveryResult]:
        signature_map = self._normalise_signature(signature)
        matches = list(self._match_candidates(signature_map))
        if not matches:
            raise DiscoveryError(f"Could not locate target matching {signature_map!r}")
        matches.sort(key=lambda result: result.score, reverse=True)
        return matches

    def explain(self, signature: Signature | Dict[str, Any], *, limit: int = 5) -> List[Dict[str, Any]]:
        """Return top candidates with scoring details (Lens-style output)."""

        signature_map = self._normalise_signature(signature)
        candidates = list(self._match_candidates(signature_map))
        candidates.sort(key=lambda result: result.score, reverse=True)
        top = candidates[:limit]
        explanation = []
        for rank, candidate in enumerate(top, start=1):
            data = candidate.explain()
            data["rank"] = rank
            explanation.append(data)
        return explanation

    def clear_cache(self) -> None:
        self._runtime_cache.clear()
        self._persistent_cache.clear()
        self._cache_loaded = True
        if self._cache_file.exists():
            self._cache_file.unlink()

    # ------------------------------------------------------------------
    # Discovery internals
    # ------------------------------------------------------------------
    def _best_match(self, signature: Dict[str, Any]) -> DiscoveryResult:
        best: Optional[DiscoveryResult] = None
        for candidate in self._match_candidates(signature):
            if best is None or candidate.score > best.score:
                best = candidate
        if best is None:
            raise DiscoveryError(f"Could not locate target matching {signature!r}")
        return best

    def _match_candidates(self, signature: Dict[str, Any]) -> Iterator[DiscoveryResult]:
        for file_path in self._iter_python_files():
            for candidate in self._extract_candidates(file_path):
                snapshot = CandidateSnapshot(
                    name=candidate.name,
                    type=candidate.type,
                    module=candidate.module,
                    file_path=candidate.file_path,
                    methods=candidate.methods,
                    decorators=candidate.decorators,
                    bases=candidate.bases,
                    docstring=candidate.docstring,
                )
                report = self.scoring_engine.score(snapshot, signature)
                if report.total <= 0:
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
                    score=report.total,
                    score_breakdown=report.breakdown,
                    score_details=report.details,
                    root=self.root,
                )

    def _iter_python_files(self) -> Iterable[Path]:
        root_len = len(self.root.parts)
        for dirpath, dirnames, filenames in os.walk(self.root):
            dir_path = Path(dirpath)
            depth = len(dir_path.parts) - root_len
            if depth > self._max_depth:
                dirnames[:] = []
                continue

            filtered_dirs = []
            for name in dirnames:
                if self._should_skip_directory(Path(name)):
                    continue
                filtered_dirs.append(name)
            dirnames[:] = filtered_dirs

            for filename in filenames:
                file_path = dir_path / filename
                if not file_path.suffix in self._extensions:
                    continue
                if self._should_skip_file(file_path):
                    continue
                yield file_path

    def _should_skip_directory(self, relative: Path) -> bool:
        name = relative.name
        if name.startswith('.') and name not in {'.', '..'}:
            return True
        return any(fragment.rstrip('/') == name or fragment in relative.as_posix() for fragment in self._skip_dirs)

    def _should_skip_file(self, file_path: Path) -> bool:
        rel = file_path.relative_to(self.root).as_posix()
        for pattern in self._skip_files:
            if _matches_glob(rel, pattern):
                return True
        return False

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
    # Cache handling
    # ------------------------------------------------------------------
    def _ensure_cache_loaded(self) -> None:
        if self._cache_loaded or not self._cache_enabled:
            return
        if self._cache_file.exists():
            try:
                self._persistent_cache = json.loads(self._cache_file.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                self._persistent_cache = {}
        self._cache_loaded = True

    def _get_cached_result(self, cache_key: str) -> Optional[DiscoveryResult]:
        entry = self._runtime_cache.get(cache_key)
        if entry:
            return entry
        data = self._persistent_cache.get(cache_key)
        if not data:
            return None
        file_path = Path(data["file_path"])
        if not file_path.exists():
            return None
        mtime = file_path.stat().st_mtime
        if data.get("mtime") and mtime != data["mtime"]:
            return None
        if self._cache_ttl:
            age = time.time() - data.get("timestamp", 0)
            if age > self._cache_ttl:
                return None
        result = DiscoveryResult(
            name=data["name"],
            type=data["type"],
            module=data["module"],
            file_path=file_path,
            lineno=data.get("lineno", 0),
            methods=tuple(data.get("methods", ())),
            decorators=tuple(data.get("decorators", ())),
            bases=tuple(data.get("bases", ())),
            docstring=data.get("docstring"),
            score=float(data.get("score", 0.0)),
            score_breakdown=data.get("score_breakdown", {}),
            score_details=data.get("score_details", []),
            root=self.root,
        )
        self._runtime_cache[cache_key] = result
        return result

    def _remember(self, cache_key: str, result: DiscoveryResult) -> None:
        self._runtime_cache[cache_key] = result
        entry = {
            "name": result.name,
            "type": result.type,
            "module": result.module,
            "file_path": result.file_path.as_posix(),
            "lineno": result.lineno,
            "methods": list(result.methods),
            "decorators": list(result.decorators),
            "bases": list(result.bases),
            "docstring": result.docstring,
            "score": result.score,
            "score_breakdown": result.score_breakdown,
            "score_details": result.score_details,
            "mtime": result.file_path.stat().st_mtime if result.file_path.exists() else None,
            "timestamp": time.time(),
        }
        self._persistent_cache[cache_key] = entry
        try:
            self._cache_file.write_text(json.dumps(self._persistent_cache, indent=2, sort_keys=True), encoding="utf-8")
        except OSError:
            pass

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
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
            except Exception:  # pragma: no cover
                pass
        if isinstance(expr, ast.Name):
            return expr.id
        if isinstance(expr, ast.Attribute):
            return DiscoveryEngine._expr_to_name(expr.value) + "." + expr.attr
        if isinstance(expr, ast.Call):
            return DiscoveryEngine._expr_to_name(expr.func)
        return ast.dump(expr, annotate_fields=False)

    @staticmethod
    def _normalise_signature(signature: Signature | Dict[str, Any]) -> Dict[str, Any]:
        if isinstance(signature, Signature):
            return signature.to_mapping()
        return {
            "name": signature.get("name"),
            "type": signature.get("type", "class"),
            "methods": list(signature.get("methods", ())),
            "module": signature.get("module"),
            "module_pattern": signature.get("module_pattern"),
            "decorators": list(signature.get("decorators", ())),
            "bases": list(signature.get("bases", ())),
            "docstring_contains": list(signature.get("docstring_contains", ())),
            "regex": bool(signature.get("regex", False)),
            "case_sensitive": bool(signature.get("case_sensitive", True)),
        }

    @staticmethod
    def _cache_key(signature: Dict[str, Any]) -> str:
        payload = json.dumps(signature, sort_keys=True, separators=(",", ":"))
        return sha1(payload.encode("utf-8")).hexdigest()


# ----------------------------------------------------------------------
# Utilities
# ----------------------------------------------------------------------

def _matches_glob(value: str, pattern: str) -> bool:
    regex = re.escape(pattern).replace(r"\*", ".*") + "$"
    return re.match(regex, value) is not None
