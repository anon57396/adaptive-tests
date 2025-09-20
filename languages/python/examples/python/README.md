# Python Todo Adaptive Example

This mirrors the JavaScript calculator demo but uses pytest. The adaptive test searches for `TodoService` anywhere under the example directory.

```bash
cd languages/python/examples/python
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
pytest
```

Try moving `src/todo_service.py` into a nested folder:

```bash
mkdir -p src/services
mv src/todo_service.py src/services/todo_service.py
pytest
```

The traditional test fails with `ModuleNotFoundError`, while the adaptive test still passes.
