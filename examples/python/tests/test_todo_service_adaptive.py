from adaptive.discovery import Signature, DiscoveryEngine


def test_discovers_todo_service():
    engine = DiscoveryEngine()
    TodoService = engine.discover(
        Signature(
            name="TodoService",
            methods=["add", "complete", "list", "clear_completed", "reset"],
        )
    )

    service = TodoService()
    todo = service.add("Dynamic discovery works")
    service.complete(todo.id)
    assert len(service.list(status="completed")) == 1
