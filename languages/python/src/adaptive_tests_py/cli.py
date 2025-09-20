"""Command line utilities for adaptive-tests-py."""

from __future__ import annotations

import argparse
import ast
import json
import re
import sys
import textwrap
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence

from .discovery import DiscoveryEngine, DiscoveryError


@dataclass
class SymbolCandidate:
    name: str
    kind: str  # "class" or "function"
    methods: Sequence[str]


def main(argv: List[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    if args.command == "discover":
        return _command_discover(args)
    if args.command == "why":
        return _command_why(args)
    if args.command == "scaffold":
        return _command_scaffold(args)

    return _emit_error(f"Unknown command: {args.command}", as_json=False)


# ---------------------------------------------------------------------------
# Discover / Why commands
# ---------------------------------------------------------------------------

def _command_discover(args: argparse.Namespace) -> int:
    engine = _create_engine(args.root, args.config, args.no_cache)
    signature = _parse_signature(args.signature)
    try:
        result = engine.discover(signature, load=False)
    except DiscoveryError as exc:
        return _emit_error(str(exc), as_json=args.json)

    payload = result.explain()
    if args.json:
        print(json.dumps(payload, indent=2))
    else:
        _print_discover(payload)
    return 0


def _command_why(args: argparse.Namespace) -> int:
    engine = _create_engine(args.root, args.config, args.no_cache)
    signature = _parse_signature(args.signature)

    explanations = engine.explain(signature, limit=args.limit)
    if not explanations:
        return _emit_error("No candidates considered for signature", as_json=args.json)

    if args.json:
        print(json.dumps(explanations, indent=2))
    else:
        _print_why(explanations)
    return 0


def _create_engine(root: str, config_path: Optional[str], no_cache: bool) -> DiscoveryEngine:
    config = _load_config_json(config_path) if config_path else None
    engine = DiscoveryEngine(Path(root), config=config)
    if no_cache:
        engine.clear_cache()
        if hasattr(engine, "_cache_enabled"):
            engine._cache_enabled = False  # best-effort; internal to package
    return engine


# ---------------------------------------------------------------------------
# Scaffold command
# ---------------------------------------------------------------------------

def _command_scaffold(args: argparse.Namespace) -> int:
    root = Path(args.root).resolve()
    source = (root / args.source).resolve() if not Path(args.source).is_absolute() else Path(args.source).resolve()

    if not source.exists():
        return _emit_error(f"Source file not found: {source}", as_json=False)

    try:
        relative_source = source.relative_to(root)
    except ValueError:
        return _emit_error("Source file must live inside the project root", as_json=False)

    tests_dir = Path(args.tests_dir)
    if tests_dir.is_absolute():
        return _emit_error("--tests-dir must be relative to the project root", as_json=False)

    candidates = list(_analyze_source_file(source))
    if not candidates:
        return _emit_error("No top-level classes or functions found to scaffold", as_json=False)

    target_candidate = _select_candidate(candidates, args.name)
    if target_candidate is None:
        available = ", ".join(sym.name for sym in candidates)
        return _emit_error(f"Symbol '{args.name}' not found. Available: {available}", as_json=False)

    module_name = _module_name_from_path(relative_source)
    signature = {
        "name": target_candidate.name,
        "type": target_candidate.kind,
        "module": module_name,
        "methods": list(target_candidate.methods),
    }

    test_slug = args.slug or _slugify(target_candidate.name)
    tests_path = (root / tests_dir).resolve()
    tests_path.mkdir(parents=True, exist_ok=True)

    depth = len(tests_dir.parts) if tests_dir.parts else 0
    test_filename = tests_path / f"test_{test_slug}.py"
    if test_filename.exists() and not args.force:
        return _emit_error(f"Test file already exists: {test_filename.relative_to(root)} (use --force to overwrite)", as_json=False)

    content = _render_pytest_stub(target_candidate, signature, depth)
    test_filename.write_text(content, encoding="utf-8")

    relative_output = test_filename.relative_to(root)
    print(f"📝 Generated {relative_output}")
    return 0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="adaptive-tests-py", description="Adaptive discovery helpers for Python projects")
    subparsers = parser.add_subparsers(dest="command", required=True)

    discover_parser = subparsers.add_parser("discover", help="Resolve a signature and show metadata")
    _add_common_options(discover_parser)
    discover_parser.add_argument("signature", help="Signature JSON or path to JSON file")
    discover_parser.add_argument("--json", action="store_true", help="Emit machine readable JSON output")

    why_parser = subparsers.add_parser("why", help="Explain candidate scoring for a signature")
    _add_common_options(why_parser)
    why_parser.add_argument("signature", help="Signature JSON or path to JSON file")
    why_parser.add_argument("--limit", type=int, default=5, help="Number of candidates to show")
    why_parser.add_argument("--json", action="store_true", help="Emit machine readable JSON output")

    scaffold_parser = subparsers.add_parser("scaffold", help="Generate a pytest stub for a Python module")
    scaffold_parser.add_argument("source", help="Path to the Python module to scaffold (relative to project root)")
    scaffold_parser.add_argument("--root", default=".", help="Project root (defaults to current directory)")
    scaffold_parser.add_argument("--tests-dir", default="tests/adaptive", help="Target directory for generated tests")
    scaffold_parser.add_argument("--name", help="Specific class/function to target when multiple symbols exist")
    scaffold_parser.add_argument("--slug", help="Override the generated test filename slug")
    scaffold_parser.add_argument("--force", action="store_true", help="Overwrite the destination file if it already exists")

    return parser


def _add_common_options(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--root", default=".", help="Project root (defaults to current directory)")
    parser.add_argument("--config", help="Optional JSON file containing discovery overrides")
    parser.add_argument("--no-cache", action="store_true", help="Disable persistent cache for this run")


def _parse_signature(raw: str) -> Dict[str, Any]:
    path = Path(raw)
    if path.exists():
        data = path.read_text(encoding="utf-8")
        return json.loads(data)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:  # pragma: no cover - user input handling
        raise SystemExit(f"Invalid signature JSON: {exc}")


def _load_config_json(path: str) -> Dict[str, Any]:
    config_path = Path(path)
    if not config_path.exists():
        raise SystemExit(f"Config file not found: {path}")
    try:
        return json.loads(config_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Unable to parse config JSON: {exc}")


def _print_discover(payload: Dict[str, Any]) -> None:
    print(f"✅ {payload['name']} ({payload['type']})")
    print(f"   Module : {payload['module']}")
    print(f"   Path   : {payload['file_path']}")
    print(f"   Score  : {payload['score']:.2f}")
    if payload.get("score_breakdown"):
        pieces = ", ".join(f"{k}={v:.2f}" for k, v in payload["score_breakdown"].items())
        print(f"   Breakdown: {pieces}")


def _print_why(explanations: List[Dict[str, Any]]) -> None:
    for entry in explanations:
        print(f"#{entry['rank']} {entry['name']} ({entry['module']})")
        print(f"   Score : {entry['score']:.2f}")
        if entry.get("score_breakdown"):
            pieces = ", ".join(f"{k}={v:.2f}" for k, v in entry["score_breakdown"].items())
            print(f"   Breakdown: {pieces}")
        print(f"   Path  : {entry['file_path']}")
        if entry.get("score_details"):
            for detail in entry["score_details"]:
                print(f"      - {detail['category']}: {detail['score']:.2f} ({detail.get('candidate') or detail.get('module') or detail.get('path')})")


def _emit_error(message: str, *, as_json: bool) -> int:
    if as_json:
        print(json.dumps({"error": message}, indent=2))
    else:
        print(f"❌ {message}", file=sys.stderr)
    return 1


# ---------------------------------------------------------------------------
# Scaffolding helpers
# ---------------------------------------------------------------------------

def _analyze_source_file(path: Path) -> Iterable[SymbolCandidate]:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            methods = [
                child.name
                for child in node.body
                if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)) and not child.name.startswith('_')
            ]
            yield SymbolCandidate(name=node.name, kind='class', methods=methods)
        elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and not node.name.startswith('_'):
            yield SymbolCandidate(name=node.name, kind='function', methods=())


def _select_candidate(candidates: Sequence[SymbolCandidate], requested: Optional[str]) -> Optional[SymbolCandidate]:
    if requested:
        for candidate in candidates:
            if candidate.name == requested:
                return candidate
        return None
    for candidate in candidates:
        if candidate.kind == 'class':
            return candidate
    return candidates[0] if candidates else None


def _module_name_from_path(relative: Path) -> str:
    parts = list(relative.parts)
    if parts[-1] == '__init__.py':
        parts = parts[:-1]
    else:
        parts[-1] = parts[-1][:-3]
    return '.'.join(parts)


def _slugify(value: str) -> str:
    text = value.strip()
    if not text:
        return 'target'
    snake = re.sub(r'(?<!^)(?=[A-Z])', '_', text)
    snake = snake.replace('-', '_').replace(' ', '_')
    snake = snake.lower()
    snake = re.sub(r'[^a-z0-9_]+', '_', snake)
    snake = re.sub(r'_+', '_', snake).strip('_')
    return snake or 'target'


def _render_pytest_stub(candidate: SymbolCandidate, signature: Dict[str, Any], depth: int) -> str:
    signature_lines = ["Signature("]
    signature_lines.append(f"        name='{signature['name']}',")
    signature_lines.append(f"        type='{signature['type']}',")
    if signature.get('module'):
        signature_lines.append(f"        module='{signature['module']}',")
    methods = signature.get('methods') or []
    if methods:
        joined = ', '.join(f"'{method}'" for method in methods)
        signature_lines.append(f"        methods=[{joined}],")
    signature_lines.append('    )')

    signature_block = '\n'.join(signature_lines)
    project_root_expr = f"Path(__file__).resolve().parents[{depth}]" if depth > 0 else "Path(__file__).resolve().parents[0]"

    discovery_call = textwrap.dedent(
        f"""
        Target = engine.discover(
            {signature_block}
        )
        """
    ).strip()

    if candidate.kind == 'class':
        assertion_block = textwrap.dedent(
            """
            assert Target is not None
            instance = Target()
            # TODO: add meaningful assertions for Target
            """
        ).strip()
    else:
        assertion_block = textwrap.dedent(
            """
            assert callable(Target)
            # TODO: invoke Target with representative arguments and assert the result
            """
        ).strip()

    body = textwrap.dedent(
        f"""
        from __future__ import annotations

        from pathlib import Path

        from adaptive_tests_py import DiscoveryEngine, Signature

        PROJECT_ROOT = {project_root_expr}
        engine = DiscoveryEngine(root=str(PROJECT_ROOT))


        def test_{_slugify(candidate.name)}_is_discoverable() -> None:
            {textwrap.indent(discovery_call, '    ')}
            {textwrap.indent(assertion_block, '    ')}
        """
    ).strip()

    return body + '\n'


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
