from src.todo_service import TodoService


def test_add_and_list():
    service = TodoService()
    todo = service.add("Ship release")
    assert todo.id == 1
    assert len(service.list()) == 1


def test_filters_completed():
    service = TodoService()
    todo = service.add("Write docs")
    service.complete(todo.id)
    completed = service.list("completed")
    assert len(completed) == 1
    assert completed[0].completed is True
