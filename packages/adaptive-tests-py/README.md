# adaptive-tests-py

Python port of the adaptive discovery engine. It mirrors the JavaScript API so polyglot teams can keep their testing strategy consistent across stacks.

## Installation

```bash
pip install adaptive-tests-py
```

## Usage

```python
from adaptive_tests_py import DiscoveryEngine, Signature

engine = DiscoveryEngine(root=".")
TodoService = engine.discover(
    Signature(name="TodoService", methods=["add", "complete", "list"])
)

service = TodoService()
service.add("Ship adaptive tests")
```

See `examples/python/` for a full pytest demo and advanced signatures.
