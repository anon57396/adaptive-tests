const { discover } = require('adaptive-tests');

describe('TodoService - Adaptive Tests', () => {
  let TodoService;
  let service;

  beforeAll(async () => {
    TodoService = await discover({
      name: 'TodoService',
      type: 'class',
      methods: ['addTodo', 'completeTodo', 'getTodos', 'clearCompleted', 'reset'],
      exports: 'TodoService'
    });
  });

  beforeEach(() => {
    service = new TodoService();
  });

  test('discovers TodoService class', () => {
    expect(typeof TodoService).toBe('function');
  });

  test('adds and completes todos', () => {
    const todo = service.addTodo('Write tests');
    service.completeTodo(todo.id);
    const completed = service.getTodos('completed');
    expect(completed).toHaveLength(1);
    expect(completed[0].completed).toBe(true);
  });

  test('clears completed todos', () => {
    const todo = service.addTodo('Clean inbox');
    service.completeTodo(todo.id);
    expect(service.clearCompleted()).toBe(1);
  });
});
