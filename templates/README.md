# Adaptive Tests Templates

Ready-to-use project templates with adaptive testing pre-configured for various frameworks and languages.

## Available Templates

### JavaScript/TypeScript

#### `vite-react-ts` ⚡
- **Stack**: Vite + React + TypeScript
- **Testing**: Vitest with adaptive discovery
- **Features**:
  - Full TypeScript support
  - React component discovery
  - Hot Module Replacement
  - Refactoring demo included

```bash
npx create-adaptive-app my-app --template vite-react-ts
cd my-app
npm run validate  # Run validation demo
```

#### `nextjs` 🔺
- **Stack**: Next.js + React
- **Testing**: Jest with adaptive discovery
- **Features**:
  - Server-side rendering
  - API routes with discovery
  - App Router support

#### `express-js` 🚂
- **Stack**: Express.js + Node.js
- **Testing**: Jest/Mocha with adaptive discovery
- **Features**:
  - REST API endpoints
  - Middleware discovery
  - Service layer patterns

#### `cra` ⚛️
- **Stack**: Create React App
- **Testing**: Jest + React Testing Library
- **Features**:
  - Zero-config setup
  - Component discovery
  - Standard CRA tooling

### Python

#### `flask-python` 🐍
- **Stack**: Flask + Python 3.9+
- **Testing**: pytest with adaptive discovery
- **Features**:
  - REST API with Flask
  - Service discovery
  - Async support

```bash
npx create-adaptive-app my-app --template flask-python
cd my-app
make validate  # Run validation demo
```

### Java

#### `spring-boot-java` ☕
- **Stack**: Spring Boot + Java 17
- **Testing**: JUnit 5 with adaptive discovery
- **Features**:
  - REST controllers
  - Service discovery with annotations
  - Maven/Gradle support

```bash
npx create-adaptive-app my-app --template spring-boot-java
cd my-app
mvn test       # Run tests
mvn validate   # Run validation demo
```

## Template Structure

Each template includes:

```
template-name/
├── src/              # Source code
│   ├── components/   # UI components (React templates)
│   ├── services/     # Business logic
│   └── utils/        # Utilities
├── tests/
│   ├── adaptive/     # Adaptive test suites
│   ├── traditional/  # Traditional test suites
│   └── setup.*       # Test configuration
├── scripts/
│   └── refactor-demo.* # Refactoring demonstration
├── package.json      # With validation scripts
└── README.md         # Template documentation
```

## Validation Scripts

All templates include validation scripts that demonstrate adaptive testing benefits:

### JavaScript/TypeScript Templates
```json
{
  "scripts": {
    "test": "jest/vitest",
    "test:adaptive": "jest tests/adaptive",
    "test:traditional": "jest tests/traditional",
    "validate": "npm run test:traditional || true && npm run test:adaptive",
    "refactor-demo": "node scripts/refactor-demo.js"
  }
}
```

### Python Templates
```makefile
validate: test-traditional test-adaptive
    @echo "✅ Validation complete"

refactor-demo:
    python scripts/refactor_demo.py
```

### Java Templates
```xml
<build>
  <plugins>
    <plugin>
      <artifactId>maven-surefire-plugin</artifactId>
      <configuration>
        <includes>
          <include>**/*AdaptiveTest.java</include>
        </includes>
      </configuration>
    </plugin>
  </plugins>
</build>
```

## Creating a New Project

### Using npx (Recommended)

```bash
npx create-adaptive-app my-project --template vite-react-ts
cd my-project
npm install
npm run validate
```

### Manual Setup

1. Copy template directory
2. Update package.json/pom.xml/requirements.txt with your project name
3. Install dependencies
4. Run validation to ensure everything works

## Adding Adaptive Tests to Existing Projects

### Step 1: Install adaptive-tests

```bash
# JavaScript/TypeScript
npm install --save-dev adaptive-tests

# Python
pip install adaptive-tests-python

# Java
# Add to pom.xml or build.gradle
```

### Step 2: Create adaptive test structure

```bash
mkdir -p tests/adaptive tests/traditional
```

### Step 3: Write adaptive tests

```javascript
// tests/adaptive/example.test.js
const { getDiscoveryEngine } = require('adaptive-tests');

describe('Adaptive Tests', () => {
  let service;

  beforeAll(async () => {
    const engine = getDiscoveryEngine();
    service = await engine.discoverTarget({
      name: 'UserService',
      methods: ['create', 'update', 'delete']
    });
  });

  test('should discover service', () => {
    expect(service).toBeDefined();
  });
});
```

## Validation Demo

Each template includes a refactoring demo that:

1. **Runs traditional tests** (baseline)
2. **Applies refactoring** (rename classes/methods, reorganize files)
3. **Shows traditional tests failing**
4. **Shows adaptive tests still passing**

Run with:
```bash
npm run validate       # JavaScript/TypeScript
make validate         # Python
mvn validate         # Java
```

## Contributing

To add a new template:

1. Create directory in `templates/`
2. Include adaptive test examples
3. Add validation/refactor demo script
4. Update this README
5. Test with `create-adaptive-app`

## Support

- [Documentation](https://adaptive-tests.dev)
- [GitHub Issues](https://github.com/adaptive-tests/adaptive-tests/issues)
- [Discord Community](https://discord.gg/adaptive-tests)