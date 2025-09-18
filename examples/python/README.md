# Python Adaptive Testing Example

This example mirrors the JavaScript calculator demo but entirely in Python. It ships a small in-memory `TodoService`, traditional pytest tests, and adaptive tests that locate the service dynamically.

## Quick Start

```bash
cd examples/python
python -m venv .venv
source .venv/bin/activate  # On Windows use .venv\Scripts\activate
pip install -r requirements.txt
pytest
```

The adaptive test uses `DiscoveryEngine` to walk the project, import modules dynamically, and find a class that matches a signature (name + method set). When you move or rename `todo_service.py`, the adaptive test still passes without changing the import.

## Files

- `src/todo_service.py` – production code
- `adaptive/discovery.py` – simple file-system based discovery engine
- `tests/test_todo_service_traditional.py` – hard-coded imports (break on refactor)
- `tests/test_todo_service_adaptive.py` – adaptive discovery using `Signature`

## Try it

1. Run `pytest` to ensure everything passes.
2. Move `src/todo_service.py` into a nested folder (e.g., `src/services/todo_service.py`).
3. Re-run `pytest`:
   - Traditional test fails with `ModuleNotFoundError`
   - Adaptive test still passes because the discovery engine locates the class.

Feel free to extend the discovery logic (e.g., enforce docstrings, check decorators) to better match your production code.
