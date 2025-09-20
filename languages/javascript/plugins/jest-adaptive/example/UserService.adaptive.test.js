/**
 * Example adaptive test using jest-adaptive
 * 
 * This test will find UserService automatically, even if it moves!
 * No import or require statements needed - jest-adaptive provides globals.
 */

describe('UserService - Adaptive Test', () => {
  let UserService;
  let service;

  beforeAll(async () => {
    // discover() is a global function provided by jest-adaptive
    UserService = await discover({
      name: 'UserService',
      type: 'class',
      methods: ['create', 'update', 'delete', 'findById', 'findAll', 'count']
    });
  });

  beforeEach(() => {
    service = new UserService();
  });

  test('should discover UserService', () => {
    // Custom matcher provided by jest-adaptive
    expect(UserService).toBeDiscovered();
    expect(UserService).toHaveMethods(['create', 'update', 'delete']);
  });

  describe('User CRUD Operations', () => {
    test('should create a new user', () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const user = service.create(userData);

      expect(user).toBeDefined();
      expect(user.id).toBe(1);
      expect(user.name).toBe('John Doe');
      expect(user.email).toBe('john@example.com');
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    test('should update an existing user', () => {
      const user = service.create({ name: 'Jane Doe' });
      const updated = service.update(user.id, { name: 'Jane Smith' });

      expect(updated.name).toBe('Jane Smith');
      expect(updated.updatedAt).toBeInstanceOf(Date);
      expect(updated.id).toBe(user.id);
    });

    test('should delete a user', () => {
      const user = service.create({ name: 'Test User' });
      const result = service.delete(user.id);

      expect(result.success).toBe(true);
      expect(result.deleted.id).toBe(user.id);
      expect(service.findById(user.id)).toBeNull();
    });

    test('should throw error when updating non-existent user', () => {
      expect(() => {
        service.update(999, { name: 'Ghost' });
      }).toThrow('User 999 not found');
    });

    test('should throw error when deleting non-existent user', () => {
      expect(() => {
        service.delete(999);
      }).toThrow('User 999 not found');
    });
  });

  describe('User Queries', () => {
    test('should find user by id', () => {
      const user = service.create({ name: 'Find Me' });
      const found = service.findById(user.id);

      expect(found).toBeDefined();
      expect(found.id).toBe(user.id);
      expect(found.name).toBe('Find Me');
    });

    test('should return null for non-existent user', () => {
      const found = service.findById(999);
      expect(found).toBeNull();
    });

    test('should find all users', () => {
      service.create({ name: 'User 1' });
      service.create({ name: 'User 2' });
      service.create({ name: 'User 3' });

      const users = service.findAll();

      expect(users).toHaveLength(3);
      expect(users[0].name).toBe('User 1');
      expect(users[1].name).toBe('User 2');
      expect(users[2].name).toBe('User 3');
    });

    test('should count users', () => {
      expect(service.count()).toBe(0);

      service.create({ name: 'User 1' });
      expect(service.count()).toBe(1);

      service.create({ name: 'User 2' });
      expect(service.count()).toBe(2);

      service.delete(1);
      expect(service.count()).toBe(1);
    });
  });
});

/**
 * Example of using lazyDiscover for performance
 */
describe('UserService - Lazy Discovery', () => {
  // lazyDiscover creates a cached discovery function
  const getService = lazyDiscover({
    name: 'UserService',
    type: 'class',
  });

  test('should work with lazy discovery', async () => {
    const UserService = await getService();
    const service = new UserService();
    
    expect(service).toBeDefined();
    expect(service.create).toBeDefined();
  });
});

/**
 * Example of discovering multiple modules at once
 */
describe('Batch Discovery', () => {
  let modules;

  beforeAll(async () => {
    // discoverAll is useful for discovering multiple related modules
    modules = await discoverAll([
      { name: 'UserService', type: 'class' },
      // Add more modules here as needed
    ]);
  });

  test('should discover all modules', () => {
    expect(modules.UserService).toBeDiscovered();
  });
});