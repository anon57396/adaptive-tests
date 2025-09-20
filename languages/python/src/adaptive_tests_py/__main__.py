"""Entry-point so users can run ``python -m adaptive_tests_py``."""

from .cli import main

if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
