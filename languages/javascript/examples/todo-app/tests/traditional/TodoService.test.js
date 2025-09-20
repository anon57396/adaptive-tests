const TodoService = require('../../src/TodoService');

describe('TodoService - Traditional Tests', () => {
  let service;

  beforeEach(() => {
    service = new TodoService();
  });

  test('creates todos with sequential ids', () => {
    const first = service.addTodo('Write docs');
    const second = service.addTodo('Ship release');
    expect(first.id).toBe(1);
    expect(second.id).toBe(2);
  });

  test('marks todos as completed', () => {
    const todo = service.addTodo('Refactor module');
    service.completeTodo(todo.id);
    expect(service.getTodos('completed')).toHaveLength(1);
  });

  test('filters active todos', () => {
    const todo1 = service.addTodo('Draft blog');
    const todo2 = service.addTodo('Record demo');
    service.completeTodo(todo1.id);
    const active = service.getTodos('active');
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(todo2.id);
  });

  test('clears completed todos', () => {
    const todo = service.addTodo('Archive tasks');
    service.completeTodo(todo.id);
    expect(service.clearCompleted()).toBe(1);
    expect(service.getTodos()).toHaveLength(0);
  });
});
