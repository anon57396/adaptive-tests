"""Command line utilities for adaptive-tests-py."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

from .discovery import DiscoveryEngine, DiscoveryError


def main(argv: List[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="adaptive-tests-py", description="Adaptive discovery helpers for Python projects")
    parser.add_argument("command", choices={"discover", "why"}, help="Command to run")
    parser.add_argument("signature", help="Signature JSON (e.g. '{\"name\": \"Service\"}') or path to JSON file")
    parser.add_argument("--root", default=".", help="Project root (defaults to current directory)")
    parser.add_argument("--config", help="Optional JSON file containing discovery overrides")
    parser.add_argument("--limit", type=int, default=5, help="Number of candidates to show for 'why'")
    parser.add_argument("--json", action="store_true", help="Emit machine readable JSON output")
    parser.add_argument("--no-cache", action="store_true", help="Disable persistent cache for this run")

    args = parser.parse_args(argv)

    config = _load_config(args.config) if args.config else None
    engine = DiscoveryEngine(Path(args.root), config=config)
    if args.no_cache:
        engine.clear_cache()
        if hasattr(engine, "_cache_enabled"):
            engine._cache_enabled = False  # best-effort; internal but same package

    signature = _parse_signature(args.signature)

    if args.command == "discover":
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

    if args.command == "why":
        explanations = engine.explain(signature, limit=args.limit)
        if not explanations:
            return _emit_error("No candidates considered for signature", as_json=args.json)
        if args.json:
            print(json.dumps(explanations, indent=2))
        else:
            _print_why(explanations)
        return 0

    return _emit_error(f"Unknown command: {args.command}", as_json=args.json)


def _parse_signature(raw: str) -> Dict[str, Any]:
    path = Path(raw)
    if path.exists():
        data = path.read_text(encoding="utf-8")
        return json.loads(data)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:  # pragma: no cover - user input handling
        raise SystemExit(f"Invalid signature JSON: {exc}")


def _load_config(path: str) -> Dict[str, Any]:
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


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
