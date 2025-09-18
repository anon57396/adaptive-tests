/**
 * Showcase Test - Demonstrates New Discovery Engine Features
 *
 * This test demonstrates:
 * - Configuration-based scoring
 * - Inheritance detection
 * - Property validation
 * - Custom scoring functions
 */

const path = require('path');
const { DiscoveryEngine } = require('../../src/adaptive/discovery-engine');

describe('Discovery Engine 2.0 - New Features Showcase', () => {
  let engine;

  beforeAll(() => {
    // Create engine with custom configuration
    engine = new DiscoveryEngine(path.resolve(__dirname, '../..'), {
      discovery: {
        scoring: {
          paths: {
            positive: {
              '/fixtures/': 20,  // Boost our test fixtures
              '/inheritance/': 15 // Boost inheritance examples
            }
          },
          custom: [
            {
              name: 'prefer-services',
              score: function(candidate, signature, content) {
                // Give extra points to services
                if (candidate.fileName.includes('Service')) {
                  return 10;
                }
                return 0;
              }
            }
          ]
        }
      }
    });
  });

  describe('Inheritance Detection', () => {
    test('should discover classes extending BaseService', async () => {
      // Find any service that extends BaseService
      const BaseService = await engine.discoverTarget({
        name: 'BaseService',
        type: 'class'
      });

      const UserService = await engine.discoverTarget({
        name: 'UserService',
        type: 'class',
        extends: BaseService  // ← NEW: Inheritance detection!
      });

      expect(UserService).toBeDefined();
      expect(UserService.name).toBe('UserService');

      const instance = new UserService();
      expect(instance).toBeInstanceOf(BaseService);
      expect(instance.getStatus()).toMatchObject({
        initialized: true,
        className: 'UserService'
      });
    });

    test('should find all services extending BaseService', async () => {
      const BaseService = await engine.discoverTarget({
        name: 'BaseService',
        type: 'class'
      });

      // Find UserService by inheritance
      const UserService = await engine.discoverTarget({
        type: 'class',
        extends: BaseService,
        methods: ['createUser', 'findUser']
      });

      // Find AuthService by inheritance
      const AuthService = await engine.discoverTarget({
        type: 'class',
        extends: BaseService,
        methods: ['login', 'logout']
      });

      expect(UserService.name).toBe('UserService');
      expect(AuthService.name).toBe('AuthService');

      // Both should be instances of BaseService
      expect(new UserService()).toBeInstanceOf(BaseService);
      expect(new AuthService()).toBeInstanceOf(BaseService);
    });

    test('should work with string-based inheritance check', async () => {
      // When you don't have the actual BaseService class
      const Service = await engine.discoverTarget({
        name: 'UserService',
        type: 'class',
        extends: 'BaseService'  // ← String-based check
      });

      expect(Service).toBeDefined();
      expect(Service.name).toBe('UserService');
    });
  });

  describe('Property Validation', () => {
    test('should discover classes with specific properties', async () => {
      const BaseService = await engine.discoverTarget({
        name: 'BaseService',
        type: 'class',
        properties: ['initialized', 'config', 'logger']  // ← NEW: Property checking!
      });

      expect(BaseService).toBeDefined();
      const instance = new BaseService();
      expect(instance.initialized).toBe(true);
      expect(instance.config).toEqual({});
      expect(instance.logger).toBe(console);
    });

    test('should find services with specific properties and methods', async () => {
      const UserService = await engine.discoverTarget({
        type: 'class',
        properties: ['users'],  // Has a users property
        methods: ['createUser', 'findUser', 'getUserCount']
      });

      expect(UserService).toBeDefined();
      const instance = new UserService();
      expect(instance.users).toBeDefined();
      expect(instance.users).toBeInstanceOf(Map);
    });
  });

  describe('Combined Feature Discovery', () => {
    test('should use all features together', async () => {
      const BaseService = await engine.discoverTarget({
        name: 'BaseService',
        type: 'class'
      });

      // Find a service with ALL these requirements:
      const Service = await engine.discoverTarget({
        type: 'class',
        extends: BaseService,        // Must extend BaseService
        properties: ['sessions'],    // Must have sessions property
        methods: ['login', 'logout'] // Must have login/logout methods
      });

      expect(Service.name).toBe('AuthService');

      const instance = new Service();
      expect(instance.sessions).toBeInstanceOf(Map);
      expect(instance.getActiveSessionCount()).toBe(0);

      // Test the service works
      const result = await instance.execute('login', {
        username: 'testuser',
        password: 'secret'
      });
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(instance.getActiveSessionCount()).toBe(1);
    });
  });

  describe('Configuration-Based Scoring', () => {
    test('should respect custom path scoring', async () => {
      // Our config gives +20 to /fixtures/ and +15 to /inheritance/
      // Plus +10 for files with "Service" in the name

      const Service = await engine.discoverTarget({
        type: 'class',
        methods: ['execute', 'getStatus']
      });

      // Should find one of our services due to scoring boost
      expect(['BaseService', 'UserService', 'AuthService']).toContain(Service.name);
    });

    test('should apply custom scoring functions', async () => {
      // Clear cache to force fresh discovery with scoring
      engine.clearCache();

      // Our custom scorer gives +10 to files with "Service" in name
      const Service = await engine.discoverTarget({
        type: 'class',
        name: /.*Service$/  // Any class ending in "Service"
      });

      expect(Service).toBeDefined();
      expect(Service.name).toMatch(/Service$/);
    });
  });

  describe('Advanced Signature Patterns', () => {
    test('should discover with partial requirements', async () => {
      // Find any class with execute method
      const ExecutableClass = await engine.discoverTarget({
        type: 'class',
        methods: ['execute']
      });

      expect(ExecutableClass).toBeDefined();
      expect(['BaseService', 'UserService', 'AuthService']).toContain(ExecutableClass.name);
    });

    test('should prioritize better matches', async () => {
      // When multiple classes match, prefer the one with more specific requirements
      const Service = await engine.discoverTarget({
        type: 'class',
        methods: ['execute', 'createUser']  // Only UserService has both
      });

      expect(Service.name).toBe('UserService');
    });

    test('should handle complex discovery scenarios', async () => {
      // Find a service that:
      // 1. Extends BaseService
      // 2. Has specific methods
      // 3. Has specific properties
      // 4. Matches a name pattern

      const BaseService = await engine.discoverTarget({
        name: 'BaseService'
      });

      const Service = await engine.discoverTarget({
        name: /User.*/,              // Name starts with "User"
        type: 'class',
        extends: BaseService,         // Extends BaseService
        properties: ['users'],        // Has users property
        methods: ['createUser']       // Has createUser method
      });

      expect(Service.name).toBe('UserService');
    });
  });

  describe('Error Messages', () => {
    test('should provide detailed error for non-existent targets', async () => {
      try {
        await engine.discoverTarget({
          name: 'NonExistentService',
          type: 'class',
          extends: 'BaseService',
          properties: ['impossible'],
          methods: ['notReal']
        });
        fail('Should have thrown');
      } catch (error) {
        expect(error.message).toContain('Could not discover target matching');
        expect(error.message).toContain('NonExistentService');
        expect(error.message).toContain('extends');
        expect(error.message).toContain('properties');
        expect(error.message).toContain('methods');
        expect(error.message).toContain('Troubleshooting tips');
      }
    });
  });
});

/**
 * This showcase demonstrates:
 *
 * 1. INHERITANCE DETECTION - Find classes by their base class
 * 2. PROPERTY VALIDATION - Ensure classes have specific properties
 * 3. CUSTOM SCORING - Apply project-specific scoring rules
 * 4. CONFIGURATION - Customize discovery for your project structure
 * 5. COMBINED FEATURES - Use all features together for precise discovery
 *
 * The new Discovery Engine 2.0 is more powerful and flexible than ever!
 */