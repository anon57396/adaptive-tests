const { discover } = require('adaptive-tests');

describe('ApiService - Adaptive Tests', () => {
  let ApiService;
  let service;

  beforeAll(async () => {
    ApiService = await discover({
      name: 'ApiService',
      type: 'class',
      methods: ['getHealth', 'createUser', 'getUser', 'updateUser', 'deleteUser', 'listUsers', 'reset'],
      exports: 'ApiService'
    });
  });

  beforeEach(() => {
    service = new ApiService();
  });

  test('health endpoint responds', () => {
    expect(service.getHealth().status).toBe('ok');
  });

  test('create, update, delete user lifecycle', () => {
    const created = service.createUser({ name: 'Linus Torvalds' });
    expect(created.id).toBeDefined();

    service.updateUser(created.id, { email: 'linus@example.com' });
    expect(service.getUser(created.id).email).toBe('linus@example.com');

    service.deleteUser(created.id);
    expect(service.listUsers()).toHaveLength(0);
  });
});
