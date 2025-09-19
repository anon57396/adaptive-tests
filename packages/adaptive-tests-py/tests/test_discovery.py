from __future__ import annotations

import sys
from pathlib import Path
import textwrap

import pytest

_SRC_ROOT = Path(__file__).resolve().parents[3] / "packages" / "adaptive-tests-py" / "src"
if str(_SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(_SRC_ROOT))

from adaptive_tests_py import DiscoveryEngine, DiscoveryError, DiscoveryResult, Signature


def _write(path: Path, content: str) -> None:
    path.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")


def test_discover_avoids_module_execution(tmp_path: Path) -> None:
    project = tmp_path / "project"
    project.mkdir()

    side_effect_flag = project / "side_effect.txt"
    _write(
        project / "side_effect.py",
        """
        from pathlib import Path
        Path(__file__).with_name('side_effect.txt').write_text('executed')

        class NotTarget:
            pass
        """,
    )

    _write(
        project / "services.py",
        """
        class TodoService:
            '''Adaptive-aware todo service.'''

            def add(self, item):
                return item

            def complete(self, item):
                return item

            def list(self):
                return []
        """,
    )

    engine = DiscoveryEngine(root=str(project))
    signature = Signature(name="TodoService", methods=["add", "complete", "list"])

    result = engine.discover(signature, load=False)

    assert isinstance(result, DiscoveryResult)
    assert result.file_path.name == "services.py"
    assert result.methods == ("add", "complete", "list")
    assert not side_effect_flag.exists(), "Discovery should not execute unrelated modules"

    todo_cls = result.load()
    assert todo_cls.__name__ == "TodoService"
    assert not side_effect_flag.exists(), "Loading the target should not execute sibling modules"


def test_discover_all_ranks_best_candidate(tmp_path: Path) -> None:
    project = tmp_path / "project"
    project.mkdir()

    _write(
        project / "candidates.py",
        """
        class TodoServiceMixin:
            def add(self):
                pass

        class TodoServiceLegacy:
            def add(self):
                pass

            def complete(self):
                pass

        class TodoService:
            '''Primary adaptive service'''

            def add(self):
                pass

            def complete(self):
                pass

            def list(self):
                return []
        """,
    )

    engine = DiscoveryEngine(root=str(project))
    signature = Signature(name="TodoService", methods=["add", "complete", "list"])

    results = engine.discover_all(signature)

    assert [r.name for r in results] == ["TodoService", "TodoServiceLegacy"]
    assert results[0].score > results[1].score


def test_module_constraints(tmp_path: Path) -> None:
    project = tmp_path / "project"
    package = project / "services"
    package.mkdir(parents=True)
    (package / "__init__.py").write_text("", encoding="utf-8")

    _write(
        package / "todo.py",
        """
        class TodoService:
            def add(self):
                pass

            def complete(self):
                pass

            def list(self):
                return []
        """,
    )

    engine = DiscoveryEngine(root=str(project))

    with pytest.raises(DiscoveryError):
        engine.discover(Signature(name="TodoService", module="services.unknown"))

    result = engine.discover(Signature(name="TodoService", module="services.todo"), load=False)
    assert result.module == "services.todo"

    resolved = engine.discover(Signature(name="TodoService", module="services.todo"))
    assert resolved.__name__ == "TodoService"
