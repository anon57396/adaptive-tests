/**
 * Simple in-memory Todo service used to showcase adaptive testing.
 */

class TodoService {
  constructor() {
    this.todos = [];
    this.nextId = 1;
  }

  addTodo(title) {
    if (!title || typeof title !== 'string') {
      throw new Error('Title is required');
    }

    const todo = {
      id: this.nextId++,
      title: title.trim(),
      completed: false
    };

    this.todos.push(todo);
    return todo;
  }

  completeTodo(id) {
    const todo = this.todos.find(item => item.id === id);
    if (!todo) {
      throw new Error('Todo not found');
    }
    todo.completed = true;
    return todo;
  }

  getTodos(filter = 'all') {
    if (filter === 'active') {
      return this.todos.filter(todo => !todo.completed);
    }
    if (filter === 'completed') {
      return this.todos.filter(todo => todo.completed);
    }
    return [...this.todos];
  }

  clearCompleted() {
    const before = this.todos.length;
    this.todos = this.todos.filter(todo => !todo.completed);
    return before - this.todos.length;
  }

  reset() {
    this.todos = [];
    this.nextId = 1;
  }
}

module.exports = TodoService;
