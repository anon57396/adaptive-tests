# Express.js Quick Start Guide

Get started with adaptive testing for your Express APIs and middleware.

## Installation

```bash
npm install adaptive-tests --save-dev

# Testing utilities
npm install --save-dev supertest jest

# For TypeScript
npm install --save-dev ts-node @types/express @types/supertest
```

## Basic Setup

### 1. Configure Jest

```javascript
// jest.config.js
module.exports = {
  preset: 'adaptive-tests/jest-preset',
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  globals: {
    'adaptive-tests': {
      searchPaths: ['./src', './routes', './middleware'],
      cache: true
    }
  }
};
```

### 2. Create Your First Adaptive Test

```javascript
// tests/adaptive/userRoutes.test.js
const { discover } = require('adaptive-tests');
const request = require('supertest');

describe('User Routes', () => {
  let app;

  beforeAll(async () => {
    app = await discover({
      name: 'app',
      type: 'const',
      exports: 'default'
    });
  });

  test('GET /users returns user list', async () => {
    const response = await request(app)
      .get('/users')
      .expect(200)
      .expect('Content-Type', /json/);

    expect(Array.isArray(response.body)).toBe(true);
  });

  test('POST /users creates new user', async () => {
    const newUser = {
      name: 'Alice',
      email: 'alice@example.com'
    };

    const response = await request(app)
      .post('/users')
      .send(newUser)
      .expect(201);

    expect(response.body).toMatchObject(newUser);
    expect(response.body.id).toBeDefined();
  });
});
```

## Testing Patterns

### Testing Routes

```javascript
test('discovers and tests route handler', async () => {
  const productRoutes = await discover({
    name: 'productRoutes',
    type: 'router',
    exports: 'default'
  });

  // Create minimal Express app for testing
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use('/api/products', productRoutes);

  const response = await request(app)
    .get('/api/products')
    .expect(200);

  expect(response.body).toHaveProperty('products');
});
```

### Testing Middleware

```javascript
test('authentication middleware', async () => {
  const authMiddleware = await discover({
    name: 'authMiddleware',
    type: 'function',
    path: 'middleware'
  });

  const app = express();
  app.use(authMiddleware);
  app.get('/protected', (req, res) => {
    res.json({ user: req.user });
  });

  // Without token
  await request(app)
    .get('/protected')
    .expect(401);

  // With valid token
  const token = 'valid-jwt-token';
  const response = await request(app)
    .get('/protected')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  expect(response.body.user).toBeDefined();
});
```

### Testing Services

```javascript
test('discovers and tests service layer', async () => {
  const UserService = await discover({
    name: 'UserService',
    type: 'class',
    methods: ['create', 'findById', 'update', 'delete']
  });

  const service = new UserService();

  const user = await service.create({
    name: 'Bob',
    email: 'bob@example.com'
  });

  expect(user.id).toBeDefined();
  expect(user.name).toBe('Bob');

  const found = await service.findById(user.id);
  expect(found).toEqual(user);
});
```

### Testing Database Integration

```javascript
describe('Database Operations', () => {
  let dbConnection;
  let UserModel;

  beforeAll(async () => {
    dbConnection = await discover({
      name: 'database',
      type: 'const',
      exports: 'connection'
    });

    UserModel = await discover({
      name: 'User',
      type: 'class',
      path: 'models'
    });
  });

  beforeEach(async () => {
    await dbConnection.migrate.latest();
  });

  afterEach(async () => {
    await dbConnection.migrate.rollback();
  });

  test('creates user in database', async () => {
    const user = await UserModel.create({
      name: 'Charlie',
      email: 'charlie@example.com'
    });

    const found = await UserModel.findById(user.id);
    expect(found.name).toBe('Charlie');
  });
});
```

## Advanced Patterns

### Testing WebSocket Endpoints

```javascript
const io = require('socket.io-client');

test('WebSocket communication', async () => {
  const app = await discover({
    name: 'app',
    type: 'const'
  });

  const server = app.listen(0); // Random port
  const port = server.address().port;
  const socket = io(`http://localhost:${port}`);

  return new Promise((resolve) => {
    socket.on('connect', () => {
      socket.emit('message', 'Hello Server');
    });

    socket.on('response', (data) => {
      expect(data).toBe('Hello Client');
      socket.close();
      server.close();
      resolve();
    });
  });
});
```

### Testing Error Handling

```javascript
test('error middleware', async () => {
  const errorHandler = await discover({
    name: 'errorHandler',
    type: 'function',
    path: 'middleware'
  });

  const app = express();

  app.get('/error', (req, res, next) => {
    const error = new Error('Test error');
    error.status = 400;
    next(error);
  });

  app.use(errorHandler);

  const response = await request(app)
    .get('/error')
    .expect(400);

  expect(response.body).toEqual({
    error: 'Test error',
    status: 400
  });
});
```

### Testing File Uploads

```javascript
test('file upload endpoint', async () => {
  const uploadRouter = await discover({
    name: 'uploadRouter',
    type: 'router'
  });

  const app = express();
  app.use('/upload', uploadRouter);

  const response = await request(app)
    .post('/upload')
    .attach('file', Buffer.from('test content'), 'test.txt')
    .expect(200);

  expect(response.body).toHaveProperty('filename');
  expect(response.body).toHaveProperty('size');
});
```

### Testing Rate Limiting

```javascript
test('rate limiter middleware', async () => {
  const rateLimiter = await discover({
    name: 'rateLimiter',
    type: 'function'
  });

  const app = express();
  app.use(rateLimiter({ max: 2, windowMs: 1000 }));
  app.get('/api', (req, res) => res.json({ ok: true }));

  // First two requests succeed
  await request(app).get('/api').expect(200);
  await request(app).get('/api').expect(200);

  // Third request is rate limited
  await request(app).get('/api').expect(429);
});
```

## Testing Authentication

### JWT Authentication

```javascript
test('JWT authentication flow', async () => {
  const authController = await discover({
    name: 'authController',
    type: 'object',
    methods: ['login', 'verify', 'refresh']
  });

  // Login
  const loginResponse = await request(app)
    .post('/auth/login')
    .send({ username: 'user', password: 'pass' })
    .expect(200);

  const token = loginResponse.body.token;
  expect(token).toBeDefined();

  // Use token for protected route
  const protectedResponse = await request(app)
    .get('/api/protected')
    .set('Authorization', `Bearer ${token}`)
    .expect(200);

  expect(protectedResponse.body.user).toBeDefined();
});
```

### Session Testing

```javascript
test('session management', async () => {
  const agent = request.agent(app); // Maintains cookies

  // Login
  await agent
    .post('/login')
    .send({ username: 'user', password: 'pass' })
    .expect(200);

  // Access protected route with session
  const response = await agent
    .get('/dashboard')
    .expect(200);

  expect(response.body.username).toBe('user');

  // Logout
  await agent.post('/logout').expect(200);

  // Should not access after logout
  await agent.get('/dashboard').expect(401);
});
```

## Mocking External Services

```javascript
jest.mock('axios');

test('external API integration', async () => {
  const axios = require('axios');
  const weatherController = await discover({
    name: 'weatherController',
    type: 'object'
  });

  axios.get.mockResolvedValue({
    data: { temperature: 72, condition: 'sunny' }
  });

  const response = await request(app)
    .get('/api/weather?city=Seattle')
    .expect(200);

  expect(response.body).toEqual({
    temperature: 72,
    condition: 'sunny'
  });

  expect(axios.get).toHaveBeenCalledWith(
    expect.stringContaining('Seattle')
  );
});
```

## Scaffolding Express Tests

```bash
# Scaffold route tests
npx adaptive-tests scaffold src/routes/userRoutes.js

# Scaffold middleware tests
npx adaptive-tests scaffold src/middleware/auth.js

# Scaffold service tests
npx adaptive-tests scaffold src/services/EmailService.js

# Batch scaffold
npx adaptive-tests scaffold --batch src/routes/
```

## Project Structure

```
express-app/
├── src/
│   ├── app.js           # Main Express app
│   ├── routes/
│   │   ├── users.js
│   │   └── products.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── validation.js
│   ├── services/
│   │   └── UserService.js
│   ├── models/
│   │   └── User.js
│   └── utils/
│       └── logger.js
├── tests/
│   ├── adaptive/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── services/
│   └── fixtures/
│       └── users.json
└── jest.config.js
```

## Environment Configuration

```javascript
// tests/setup.js
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Random port for tests
process.env.DATABASE_URL = 'sqlite::memory:';

// tests/teardown.js
afterAll(async () => {
  // Close database connections
  const db = await discover({ name: 'database' });
  await db.close();
});
```

## Performance Testing

```javascript
test('handles concurrent requests', async () => {
  const promises = Array.from({ length: 100 }, (_, i) =>
    request(app)
      .get(`/api/users/${i}`)
      .expect(200)
  );

  const responses = await Promise.all(promises);
  expect(responses).toHaveLength(100);
});

test('response time under load', async () => {
  const start = Date.now();

  await request(app)
    .get('/api/heavy-computation')
    .expect(200);

  const duration = Date.now() - start;
  expect(duration).toBeLessThan(1000); // Under 1 second
});
```

## Common Issues & Solutions

### Issue: Port Already in Use

```javascript
// Use random port for tests
const server = app.listen(0);
const port = server.address().port;
```

### Issue: Database Connection Leaks

```javascript
afterEach(async () => {
  // Clean up connections
  await knex.destroy();
});
```

### Issue: Async Middleware Testing

```javascript
// Wrap async middleware for proper error handling
const asyncMiddleware = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

## VS Code Integration

```json
// .vscode/settings.json
{
  "adaptive-tests.scaffold.outputDirectory": "tests/adaptive",
  "adaptive-tests.discovery.showScores": true,
  "adaptive-tests.discovery.searchPaths": ["src", "routes", "middleware"]
}
```

## CI/CD Configuration

```yaml
# .github/workflows/test.yml
name: API Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run test:adaptive
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost/test_db
```

## Next Steps

1. **Try the template**: `cp -r adaptive-tests/templates/express-adaptive my-api`
2. **Explore examples**: [Express Examples](../examples/api-service)
3. **Read best practices**: [API Testing Best Practices](./BEST_PRACTICES.md)
4. **Join community**: [Discord](https://discord.gg/adaptive-tests)

## Resources

- [Express Documentation](https://expressjs.com/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Adaptive Tests API Reference](./API_REFERENCE.md)
- [Migration Guide](./MIGRATION_GUIDE.md)

Happy API testing! 🚀