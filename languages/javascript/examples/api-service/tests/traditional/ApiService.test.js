const ApiService = require('../../src/ApiService');

describe('ApiService - Traditional Tests', () => {
  let service;

  beforeEach(() => {
    service = new ApiService();
  });

  test('reports healthy status', () => {
    expect(service.getHealth()).toEqual({ status: 'ok', uptime: 1 });
  });

  test('creates and fetches users', () => {
    const user = service.createUser({ name: 'Ada Lovelace', email: 'ada@example.com' });
    const fetched = service.getUser(user.id);
    expect(fetched.email).toBe('ada@example.com');
  });

  test('updates user fields', () => {
    const user = service.createUser({ name: 'Grace Hopper' });
    const updated = service.updateUser(user.id, { email: 'grace@example.com' });
    expect(updated.email).toBe('grace@example.com');
  });

  test('lists and deletes users', () => {
    const user = service.createUser({ name: 'Margaret Hamilton' });
    expect(service.listUsers()).toHaveLength(1);
    service.deleteUser(user.id);
    expect(service.listUsers()).toHaveLength(0);
  });
});
