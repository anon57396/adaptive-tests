from todo_service import TodoService


def test_adds_and_lists():
    service = TodoService()
    todo = service.add("Ship release")
    assert todo.id == 1
    assert len(service.list()) == 1


def test_filters_completed():
    service = TodoService()
    todo = service.add("Write blog")
    service.complete(todo.id)
    assert len(service.list(status="completed")) == 1


def test_clears_completed():
    service = TodoService()
    todo = service.add("Archive logs")
    service.complete(todo.id)
    assert service.clear_completed() == 1
    assert len(service.list()) == 0
