"""Simple Todo service used by the Python adaptive test example."""

from dataclasses import dataclass
from typing import List


@dataclass
class Todo:
    id: int
    title: str
    completed: bool = False


class TodoService:
    def __init__(self) -> None:
        self._todos: List[Todo] = []
        self._next_id = 1

    def add(self, title: str) -> Todo:
        if not title or not title.strip():
            raise ValueError("title is required")
        todo = Todo(id=self._next_id, title=title.strip())
        self._next_id += 1
        self._todos.append(todo)
        return todo

    def complete(self, todo_id: int) -> Todo:
        todo = self._find(todo_id)
        todo.completed = True
        return todo

    def list(self, status: str = "all") -> List[Todo]:
        if status == "completed":
            return [todo for todo in self._todos if todo.completed]
        if status == "active":
            return [todo for todo in self._todos if not todo.completed]
        return list(self._todos)

    def clear_completed(self) -> int:
        before = len(self._todos)
        self._todos = [todo for todo in self._todos if not todo.completed]
        return before - len(self._todos)

    def reset(self) -> None:
        self._todos.clear()
        self._next_id = 1

    def _find(self, todo_id: int) -> Todo:
        for todo in self._todos:
            if todo.id == todo_id:
                return todo
        raise ValueError("todo not found")
