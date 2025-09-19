from __future__ import annotations

import textwrap
import json
import sys
from pathlib import Path
from typing import Any, Iterator

import pytest

_SRC_ROOT = Path(__file__).resolve().parents[3] / "packages" / "adaptive-tests-py" / "src"
if str(_SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(_SRC_ROOT))

from adaptive_tests_py import (
    ConfigLoader,
    DEFAULT_CONFIG,
    DiscoveryEngine,
    DiscoveryError,
    DiscoveryResult,
    Signature,
)
from adaptive_tests_py.cli import main as cli_main


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


def test_explain_returns_ranked_candidates(tmp_path: Path) -> None:
    project = tmp_path / "project"
    project.mkdir()

    _write(
        project / "services.py",
        """
        class PrimaryService:
            def add(self):
                pass

            def complete(self):
                pass

            def list(self):
                return []
        """,
    )

    _write(
        project / "candidate.py",
        """
        class PrimaryServiceCandidate:
            def add(self):
                return None

            def complete(self):
                return None

            def list(self):
                return []
        """,
    )

    engine = DiscoveryEngine(root=str(project))
    signature = Signature(name="PrimaryService", methods=["add", "complete", "list"])

    explanation = engine.explain(signature, limit=2)
    assert explanation[0]["name"] == "PrimaryService"
    assert explanation[0]["score"] > explanation[1]["score"]
    assert explanation[0]["score_breakdown"], "score breakdown should not be empty"


def test_persistent_cache_used_when_available(tmp_path: Path) -> None:
    project = tmp_path / "project"
    project.mkdir()

    _write(
        project / "services.py",
        """
        class CachedService:
            def add(self):
                return True

            def complete(self):
                return True

            def list(self):
                return []
        """,
    )

    signature = Signature(name="CachedService", methods=["add", "complete", "list"])
    engine = DiscoveryEngine(root=str(project))
    result = engine.discover(signature, load=False)
    assert isinstance(result, DiscoveryResult)
    cache_file = project / DEFAULT_CONFIG["discovery"]["cache"]["file"]
    assert cache_file.exists()

    engine_2 = DiscoveryEngine(root=str(project))

    def boom(*_args: Any, **_kwargs: Any) -> Iterator[DiscoveryResult]:  # pragma: no cover - defensive
        raise AssertionError("Cache should have satisfied discovery")

    engine_2._match_candidates = boom  # type: ignore[assignment]
    cached = engine_2.discover(signature, load=False)
    assert isinstance(cached, DiscoveryResult)
    assert cached.name == "CachedService"


def test_cli_why_json_output(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    project = tmp_path / "project"
    project.mkdir()

    _write(
        project / "services.py",
        """
        class JsonService:
            def add(self):
                return True

            def complete(self):
                return True
        """,
    )

    exit_code = cli_main([
        "why",
        '{"name": "JsonService", "methods": ["add", "complete"]}',
        "--root",
        str(project),
        "--limit",
        "1",
        "--json",
    ])

    captured = capsys.readouterr()
    assert exit_code == 0
    payload = json.loads(captured.out)
    assert payload[0]["name"] == "JsonService"


def test_cli_scaffold_generates_pytest_stub(tmp_path: Path, capsys: pytest.CaptureFixture[str]) -> None:
    project = tmp_path / "project"
    (project / "src").mkdir(parents=True)
    (project / "src" / "__init__.py").write_text("", encoding="utf-8")

    _write(
        project / "src" / "order_service.py",
        """
        class OrderService:
            def create(self):
                return True

            def cancel(self):
                return False
        """,
    )

    exit_code = cli_main([
        "scaffold",
        "src/order_service.py",
        "--root",
        str(project),
        "--tests-dir",
        "tests/adaptive",
    ])

    assert exit_code == 0
    output = capsys.readouterr().out
    assert "Generated tests/adaptive/test_order_service.py" in output

    test_file = project / "tests" / "adaptive" / "test_order_service.py"
    assert test_file.exists()
    content = test_file.read_text(encoding="utf-8")
    assert "OrderService" in content
    assert "methods=['create', 'cancel']" in content


def test_config_loader_reads_pyproject(tmp_path: Path) -> None:
    project = tmp_path / "project"
    project.mkdir()

    pyproject = project / "pyproject.toml"
    pyproject.write_text(
        """
        [tool.adaptive_tests.discovery]
        max_depth = 7

        [tool.adaptive_tests.discovery.scoring.paths.positive]
        "/domain/" = 25
        """,
        encoding="utf-8",
    )

    loader = ConfigLoader(project)
    config = loader.load()
    assert config["discovery"]["max_depth"] == 7
    assert config["discovery"]["scoring"]["paths"]["positive"]["/domain/"] == 25
