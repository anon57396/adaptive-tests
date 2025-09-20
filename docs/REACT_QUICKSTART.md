# React Quick Start Guide

Get started with adaptive testing in your React applications in under 5 minutes.

## Installation

```bash
npm install adaptive-tests --save-dev

# For TypeScript support
npm install --save-dev ts-node @types/react @types/jest
```

## Basic Setup

### 1. Configure Jest

```javascript
// jest.config.js
module.exports = {
  preset: 'adaptive-tests/jest-preset',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
};
```

### 2. Create Your First Adaptive Test

```javascript
// tests/adaptive/Button.test.js
import { discover } from 'adaptive-tests';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';

describe('Button Component', () => {
  let Button;

  beforeAll(async () => {
    Button = await discover({
      name: 'Button',
      type: 'function',  // or 'class' for class components
      exports: 'default'
    });
  });

  test('renders with text', () => {
    const { getByText } = render(<Button>Click Me</Button>);
    expect(getByText('Click Me')).toBeInTheDocument();
  });

  test('handles click events', () => {
    const handleClick = jest.fn();
    const { getByRole } = render(
      <Button onClick={handleClick}>Submit</Button>
    );

    fireEvent.click(getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

## Testing Patterns

### Functional Components

```javascript
test('discovers and tests functional component', async () => {
  const UserCard = await discover({
    name: 'UserCard',
    type: 'function',
    path: 'components'  // hint for faster discovery
  });

  const { getByText } = render(
    <UserCard name="Alice" role="Developer" />
  );

  expect(getByText('Alice')).toBeInTheDocument();
  expect(getByText('Developer')).toBeInTheDocument();
});
```

### Class Components

```javascript
test('discovers and tests class component', async () => {
  const TodoList = await discover({
    name: 'TodoList',
    type: 'class',
    methods: ['addTodo', 'removeTodo', 'render']
  });

  const { getByTestId } = render(<TodoList />);
  const list = getByTestId('todo-list');

  expect(list.children.length).toBe(0);
});
```

### Custom Hooks

```javascript
test('discovers and tests custom hook', async () => {
  const useCounter = await discover({
    name: 'useCounter',
    type: 'function',
    exports: 'default'
  });

  const { result } = renderHook(() => useCounter(0));

  expect(result.current.count).toBe(0);

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});
```

### Context Providers

```javascript
test('discovers and tests context provider', async () => {
  const ThemeProvider = await discover({
    name: 'ThemeProvider',
    type: 'function'
  });

  const ThemeContext = await discover({
    name: 'ThemeContext',
    type: 'const'
  });

  const TestComponent = () => {
    const theme = useContext(ThemeContext);
    return <div>{theme.mode}</div>;
  };

  const { getByText } = render(
    <ThemeProvider>
      <TestComponent />
    </ThemeProvider>
  );

  expect(getByText('light')).toBeInTheDocument();
});
```

## Advanced Patterns

### Testing Components with Redux

```javascript
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

test('component with Redux', async () => {
  const Counter = await discover({
    name: 'Counter',
    type: 'function'
  });

  const counterReducer = await discover({
    name: 'counterReducer',
    exports: 'default'
  });

  const store = configureStore({
    reducer: { counter: counterReducer }
  });

  const { getByText } = render(
    <Provider store={store}>
      <Counter />
    </Provider>
  );

  fireEvent.click(getByText('Increment'));
  expect(getByText('Count: 1')).toBeInTheDocument();
});
```

### Testing with React Router

```javascript
import { MemoryRouter } from 'react-router-dom';

test('component with routing', async () => {
  const Navigation = await discover({
    name: 'Navigation',
    type: 'function'
  });

  const { getByText } = render(
    <MemoryRouter initialEntries={['/']}>
      <Navigation />
    </MemoryRouter>
  );

  expect(getByText('Home')).toBeInTheDocument();
  fireEvent.click(getByText('About'));
  // Assert navigation occurred
});
```

### Testing Lazy Loaded Components

```javascript
test('lazy loaded component', async () => {
  const LazyDashboard = await discover({
    name: 'Dashboard',
    lazy: true,  // Indicates dynamic import
    chunk: 'dashboard'  // Optional webpack chunk hint
  });

  const { findByText } = render(
    <Suspense fallback={<div>Loading...</div>}>
      <LazyDashboard />
    </Suspense>
  );

  const element = await findByText('Dashboard Content');
  expect(element).toBeInTheDocument();
});
```

## Scaffolding Tests

Generate test files automatically:

```bash
# Single component
npx adaptive-tests scaffold src/components/Button.jsx

# All components in directory
npx adaptive-tests scaffold --batch src/components/

# With TypeScript
npx adaptive-tests scaffold src/components/Card.tsx --typescript

# With assertions instead of TODOs
npx adaptive-tests scaffold src/components/Form.jsx --apply-assertions
```

## Project Structure

Recommended structure for React projects:

```text
my-react-app/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   │   ├── Button.jsx
│   │   │   ├── Button.css
│   │   │   └── index.js
│   │   └── Card/
│   │       ├── Card.jsx
│   │       └── Card.css
│   ├── hooks/
│   │   └── useAuth.js
│   └── services/
│       └── api.js
├── tests/
│   ├── adaptive/     # Adaptive tests
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services/
│   └── traditional/  # Traditional tests (during migration)
└── jest.config.js
```

## VS Code Integration

Install the Adaptive Tests extension for:

- Right-click to scaffold tests
- Discovery Lens visualization
- CodeLens hints
- Smart context menus

```json
// .vscode/settings.json
{
  "adaptive-tests.scaffold.outputDirectory": "tests/adaptive",
  "adaptive-tests.scaffold.typescript": true,
  "adaptive-tests.discovery.showScores": true
}
```

## Common Issues & Solutions

### Issue: CSS Module Imports

```javascript
// jest.config.js
moduleNameMapper: {
  '\\.(css|less|scss)$': 'identity-obj-proxy',
  '\\.module\\.(css|scss)$': 'identity-obj-proxy'
}
```

### Issue: Absolute Imports

```javascript
// jest.config.js
moduleNameMapper: {
  '^@components/(.*)$': '<rootDir>/src/components/$1',
  '^@hooks/(.*)$': '<rootDir>/src/hooks/$1'
}
```

### Issue: Transform JSX

```javascript
// babel.config.js
module.exports = {
  presets: [
    '@babel/preset-env',
    ['@babel/preset-react', { runtime: 'automatic' }]
  ]
};
```

## Performance Tips

1. **Use `beforeAll`** for discovery (once per suite)
2. **Cache discovered components** across tests
3. **Limit search paths** for faster discovery
4. **Pre-warm cache** before test runs

```javascript
// jest.setup.js
import { warmCache } from 'adaptive-tests';

beforeAll(async () => {
  await warmCache({
    signatures: [
      { name: 'Button', type: 'function' },
      { name: 'Card', type: 'function' },
      // Add commonly used components
    ]
  });
});
```

## Next Steps

1. **Try the template**: `cp -r adaptive-tests/templates/cra-adaptive my-app`
2. **Join the community**: [GitHub Discussions](https://github.com/anon57396/adaptive-tests/discussions)
3. **Read the full docs**: [Complete Documentation](https://anon57396.github.io/adaptive-tests/)

## Example Projects

- [Todo App with Adaptive Tests](../examples/todo-app)
- [E-commerce Site](../examples/ecommerce-react)
- [Dashboard Template](../templates/cra-adaptive)

Happy testing! 🎉
