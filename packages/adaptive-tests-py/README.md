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

Use `engine.discover_all(signature)` to inspect every ranked match when tuning signatures or debugging coverage.

See `examples/python/` for a full pytest demo and advanced signatures.
