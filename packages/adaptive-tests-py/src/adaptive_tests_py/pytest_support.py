"""Pytest integration helpers for adaptive-tests-py."""

from __future__ import annotations

from typing import Any, Dict, Optional, Union

from .discovery import DiscoveryEngine, Signature

SignatureLike = Union[Signature, Dict[str, Any]]


def adaptive_fixture(
    signature: SignatureLike,
    *,
    root: Optional[str] = None,
    config: Optional[Dict[str, Any]] = None,
    scope: str = "module",
):
    """Return a pytest fixture that resolves an adaptive target before tests run."""
    try:
        import pytest
    except ImportError as exc:  # pragma: no cover - optional dependency
        raise RuntimeError('adaptive_fixture requires pytest to be installed') from exc

    @pytest.fixture(scope=scope)
    def _adaptive_target():
        engine = DiscoveryEngine(root, config=config)
        return engine.discover(signature)

    _adaptive_target.__doc__ = (
        "Adaptive Tests fixture for signature {!r}. Discovered once per fixture scope."
        .format(signature)
    )
    return _adaptive_target
