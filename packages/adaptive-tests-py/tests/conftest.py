"""Pytest configuration for adaptive-tests-py."""

from __future__ import annotations

import sys
from pathlib import Path


_SRC_ROOT = Path(__file__).resolve().parents[2] / "packages" / "adaptive-tests-py" / "src"
if _SRC_ROOT.exists():
    sys.path.insert(0, str(_SRC_ROOT))
