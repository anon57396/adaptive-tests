# adaptive-tests-py

Python port of the adaptive discovery engine. It mirrors the JavaScript API so polyglot teams can keep their testing strategy consistent across stacks while preserving the zero-runtime guarantees of static analysis.

## Installation

```bash
pip install adaptive-tests-py
```

## Usage

```python
from adaptive_tests_py import DiscoveryEngine, Signature

engine = DiscoveryEngine(root=".")
result = engine.discover(
    Signature(name="TodoService", methods=["add", "complete", "list"]),
    load=False,
)

print(result.module, result.methods)
TodoService = result.load()  # module imported on demand
service = TodoService()
service.add("Ship adaptive tests")
```

Use `engine.discover_all(signature)` to inspect every ranked match when tuning signatures or debugging coverage. The engine now mirrors the JavaScript implementation more closely:

- **Configurable scoring** – drop an `adaptive-tests.config.json` (or pass inline overrides) to tweak path/file/method weighting.
- **Persistent cache** – results are stored in `.adaptive-tests-cache.json` and re-used on future runs when the target file is unchanged.
- **Lens explanations** – call `engine.explain(signature)` to retrieve top candidates with per-factor score breakdowns.

### CLI

The package ships with a lightweight CLI so you can run discovery diagnostics and scaffold pytest stubs without writing code:

```bash
adaptive-tests-py why '{"name": "TodoService"}' --root examples/python/src --limit 3
adaptive-tests-py why signature.json --json
adaptive-tests-py discover '{"name": "TodoService"}' --root .
adaptive-tests-py scaffold src/services/user_service.py --tests-dir tests/adaptive
```

Use `--no-cache` for a fresh scan and `--config path/to/config.json` to supply overrides ad-hoc.

Configuration can also be placed in `pyproject.toml` under the `[tool.adaptive_tests]` table to match modern Python tooling conventions.

### Python Example Project

See `examples/python/` for a full pytest demo, custom configuration, and advanced signatures.
