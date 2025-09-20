from adaptive.discovery import DiscoveryEngine, Signature


def test_adaptive_discovery():
    engine = DiscoveryEngine(root=".")
    TodoService = engine.discover(Signature(name="TodoService", methods=["add", "complete", "list"]))

    service = TodoService()
    todo = service.add("Adaptive discovery")
    service.complete(todo.id)
    assert len(service.list("completed")) == 1
