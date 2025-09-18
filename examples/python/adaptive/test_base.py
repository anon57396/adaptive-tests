"""Base helpers for adaptive Python tests."""

from __future__ import annotations

from typing import Any

from .discovery import DiscoveryEngine, Signature


class AdaptiveTest:
    signature: Signature

    def __init__(self) -> None:
        raise NotImplementedError("Subclasses must define signature")

    @classmethod
    def discover(cls) -> Any:
        engine = DiscoveryEngine()
        return engine.discover(cls.signature)
