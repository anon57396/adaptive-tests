# Next.js + Adaptive Tests Template

A pre-configured Next.js application with adaptive-tests integrated for resilient testing.

## 🚀 Quick Start

```bash
# Create new project from template
npx create-adaptive-app my-app --template nextjs

# Or clone and install manually
git clone <template-url> my-app
cd my-app
npm install
npm run dev
```

## 📁 Project Structure

```text
my-app/
├── src/
│   ├── components/       # React components
│   ├── pages/           # Next.js pages
│   ├── lib/             # Utility functions
│   └── utils/           # Helper functions
├── tests/
│   ├── adaptive/        # Adaptive test suites
│   └── traditional/     # Traditional test suites (for comparison)
├── jest.config.js       # Jest configuration with adaptive-tests
├── jest.setup.js        # Test setup with discovery engine
└── package.json         # Scripts and dependencies
```

## 🧪 Testing Commands

```bash
# Run all tests
npm test

# Run only adaptive tests
npm run test:adaptive

# Run only traditional tests
npm run test:traditional

# Validate both work correctly
npm run validate

# Watch mode for development
npm run test:watch

# Scaffold new adaptive test
npm run scaffold src/components/MyComponent.tsx

# Scaffold tests for entire directory
npm run scaffold:batch
```

## ✨ Features

- **Pre-configured Jest**: Works with Next.js and TypeScript out of the box
- **Adaptive Tests Integration**: Discovery engine initialized and ready
- **Custom Matchers**: `toBeDiscoverable` matcher for testing discovery
- **Path Aliases**: Configured for both Next.js and Jest
- **Example Components**: Button component with adaptive tests
- **TypeScript Support**: Full type safety with adaptive-tests

## 🎯 Why Adaptive Tests?

Traditional Next.js tests break when you:

- Move components to different folders
- Reorganize your project structure
- Refactor component hierarchies

Adaptive tests find your components by their structure, not their location:

```typescript
// This test survives any refactoring!
const Button = await discover({
  name: 'Button',
  type: 'function',
  exports: 'Button'
});
```

## 📝 Creating New Adaptive Tests

1. **For a new component**:

```bash
npm run scaffold src/components/NewComponent.tsx
```

1. **Manually create a test**:

```typescript
import { discover } from 'adaptive-tests';

describe('MyComponent - Adaptive', () => {
  let MyComponent: any;

  beforeAll(async () => {
    MyComponent = await discover({
      name: 'MyComponent',
      type: 'function'
    });
  });

  // Your tests here
});
```

## 🔧 Configuration

### Jest Configuration

The `jest.config.js` is pre-configured to work with:

- Next.js transpilation
- TypeScript
- CSS Modules
- Path aliases
- Adaptive test discovery

### Discovery Engine

The discovery engine is initialized in `jest.setup.js` and available globally in tests.

## 📦 Included Dependencies

- **next**: Latest Next.js framework
- **react** & **react-dom**: React 18
- **adaptive-tests**: Core adaptive testing library
- **jest** & **@testing-library**: Testing utilities
- **typescript**: Full TypeScript support

## 🚀 Deployment

This template is deployment-ready:

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📚 Learn More

- [Adaptive Tests Documentation](https://github.com/anon57396/adaptive-tests)
- [Next.js Documentation](https://nextjs.org/docs)
  - [Jest Documentation](https://jestjs.io/docs/getting-started)

## 🤝 Contributing

This template is part of the adaptive-tests project. Contributions are welcome!

## 📄 License

MIT
