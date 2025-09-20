# Vue.js Quick Start Guide

Get started with adaptive testing in your Vue applications.

## Installation

```bash
npm install adaptive-tests --save-dev

# Vue Test Utils
npm install --save-dev @vue/test-utils @vue/vue3-jest

# For TypeScript
npm install --save-dev ts-node @types/jest
```

## Basic Setup

### 1. Configure Jest

```javascript
// jest.config.js
module.exports = {
  preset: 'adaptive-tests/jest-preset',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  moduleFileExtensions: ['vue', 'js', 'jsx', 'ts', 'tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: ['/node_modules/(?!@vue)'],
};
```

### 2. Create Your First Adaptive Test

```javascript
// tests/adaptive/TodoItem.test.js
import { discover } from 'adaptive-tests';
import { mount } from '@vue/test-utils';

describe('TodoItem Component', () => {
  let TodoItem;

  beforeAll(async () => {
    TodoItem = await discover({
      name: 'TodoItem',
      type: 'vue-component',
      exports: 'default'
    });
  });

  test('renders todo text', () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: {
          id: 1,
          text: 'Buy groceries',
          done: false
        }
      }
    });

    expect(wrapper.text()).toContain('Buy groceries');
    expect(wrapper.find('.completed').exists()).toBe(false);
  });

  test('emits toggle event', async () => {
    const wrapper = mount(TodoItem, {
      props: {
        todo: { id: 1, text: 'Test', done: false }
      }
    });

    await wrapper.find('input[type="checkbox"]').trigger('click');
    expect(wrapper.emitted()).toHaveProperty('toggle');
    expect(wrapper.emitted().toggle[0]).toEqual([1]);
  });
});
```

## Testing Patterns

### Single File Components (SFC)

```javascript
test('discovers and tests SFC', async () => {
  const UserProfile = await discover({
    name: 'UserProfile',
    type: 'vue-component',
    path: 'components'
  });

  const wrapper = mount(UserProfile, {
    props: {
      user: { name: 'Alice', role: 'Admin' }
    }
  });

  expect(wrapper.find('.user-name').text()).toBe('Alice');
  expect(wrapper.find('.user-role').text()).toBe('Admin');
});
```

### Composition API Components

```javascript
test('component with composition API', async () => {
  const Counter = await discover({
    name: 'Counter',
    type: 'vue-component'
  });

  const wrapper = mount(Counter);
  const button = wrapper.find('button');

  expect(wrapper.text()).toContain('Count: 0');

  await button.trigger('click');
  await wrapper.vm.$nextTick();

  expect(wrapper.text()).toContain('Count: 1');
});
```

### Testing Composables

```javascript
test('discovers and tests composable', async () => {
  const useCounter = await discover({
    name: 'useCounter',
    type: 'function',
    path: 'composables'
  });

  const { count, increment, decrement } = useCounter(10);

  expect(count.value).toBe(10);

  increment();
  expect(count.value).toBe(11);

  decrement();
  decrement();
  expect(count.value).toBe(9);
});
```

### Testing with Pinia

```javascript
import { setActivePinia, createPinia } from 'pinia';

test('component with Pinia store', async () => {
  setActivePinia(createPinia());

  const ShoppingCart = await discover({
    name: 'ShoppingCart',
    type: 'vue-component'
  });

  const useCartStore = await discover({
    name: 'useCartStore',
    type: 'function'
  });

  const wrapper = mount(ShoppingCart);
  const store = useCartStore();

  store.addItem({ id: 1, name: 'Product', price: 10 });
  await wrapper.vm.$nextTick();

  expect(wrapper.text()).toContain('Product');
  expect(wrapper.text()).toContain('$10');
});
```

## Advanced Patterns

### Testing with Vue Router

```javascript
import { createRouter, createMemoryHistory } from 'vue-router';

test('component with routing', async () => {
  const Navigation = await discover({
    name: 'Navigation',
    type: 'vue-component'
  });

  const routes = await discover({
    name: 'routes',
    type: 'const'
  });

  const router = createRouter({
    history: createMemoryHistory(),
    routes
  });

  const wrapper = mount(Navigation, {
    global: {
      plugins: [router]
    }
  });

  await router.push('/about');
  await wrapper.vm.$nextTick();

  expect(wrapper.find('.active').text()).toBe('About');
});
```

### Testing Async Components

```javascript
test('async component', async () => {
  const LazyDashboard = await discover({
    name: 'Dashboard',
    lazy: true,
    type: 'vue-component'
  });

  const wrapper = mount({
    components: { LazyDashboard },
    template: '<Suspense><LazyDashboard /></Suspense>'
  });

  // Wait for async component to load
  await flushPromises();

  expect(wrapper.text()).toContain('Dashboard');
});
```

### Testing Directives

```javascript
test('custom directive', async () => {
  const vFocus = await discover({
    name: 'focus',
    type: 'directive'
  });

  const wrapper = mount({
    template: '<input v-focus />',
    directives: { focus: vFocus }
  });

  const input = wrapper.find('input').element;
  expect(document.activeElement).toBe(input);
});
```

### Testing Mixins

```javascript
test('component with mixin', async () => {
  const FormMixin = await discover({
    name: 'FormMixin',
    type: 'mixin'
  });

  const ContactForm = await discover({
    name: 'ContactForm',
    type: 'vue-component'
  });

  const wrapper = mount(ContactForm);

  // Test mixin functionality
  expect(wrapper.vm.validateEmail).toBeDefined();
  expect(wrapper.vm.validateEmail('test@example.com')).toBe(true);
});
```

## Vue 3 Specific Features

### Testing Teleport

```javascript
test('teleport component', async () => {
  const Modal = await discover({
    name: 'Modal',
    type: 'vue-component'
  });

  document.body.innerHTML = '<div id="modal-container"></div>';

  const wrapper = mount(Modal, {
    props: { show: true }
  });

  const modalContainer = document.getElementById('modal-container');
  expect(modalContainer.innerHTML).toContain('Modal Content');
});
```

### Testing Provide/Inject

```javascript
test('provide/inject', async () => {
  const ThemeProvider = await discover({
    name: 'ThemeProvider',
    type: 'vue-component'
  });

  const ThemedButton = await discover({
    name: 'ThemedButton',
    type: 'vue-component'
  });

  const wrapper = mount(ThemeProvider, {
    slots: {
      default: ThemedButton
    },
    props: {
      theme: 'dark'
    }
  });

  expect(wrapper.find('.btn-dark').exists()).toBe(true);
});
```

## Scaffolding Vue Tests

```bash
# Single component
npx adaptive-tests scaffold src/components/UserCard.vue

# Directory of components
npx adaptive-tests scaffold --batch src/components/

# With TypeScript
npx adaptive-tests scaffold src/components/TypedComponent.vue --typescript
```

## Project Structure

```text
vue-app/
├── src/
│   ├── components/
│   │   ├── base/
│   │   │   └── BaseButton.vue
│   │   └── features/
│   │       └── TodoList.vue
│   ├── composables/
│   │   └── useAuth.js
│   ├── stores/
│   │   └── user.js
│   └── views/
│       └── HomeView.vue
├── tests/
│   ├── adaptive/
│   │   ├── components/
│   │   ├── composables/
│   │   └── stores/
│   └── unit/  # Traditional tests
└── jest.config.js
```

## Vite Configuration

For Vite-based Vue projects:

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
  }
});
```

```javascript
// tests/setup.js
import { config } from '@vue/test-utils';
import { enableAutoDiscovery } from 'adaptive-tests';

// Enable auto-discovery for Vue components
enableAutoDiscovery({
  vue: true,
  extensions: ['.vue'],
  componentPattern: /\.vue$/
});
```

## Common Issues & Solutions

### Issue: Vue Component Not Found

```javascript
// Specify vue-component type
const Component = await discover({
  name: 'MyComponent',
  type: 'vue-component',  // Important for .vue files
  exports: 'default'
});
```

### Issue: Slots Not Rendering

```javascript
const wrapper = mount(Component, {
  slots: {
    default: '<div>Slot content</div>',
    header: '<h1>Header</h1>'
  }
});
```

### Issue: Global Properties

```javascript
const wrapper = mount(Component, {
  global: {
    mocks: {
      $t: (key) => key,  // Mock i18n
      $store: mockStore   // Mock Vuex
    }
  }
});
```

## Performance Tips

1. **Cache component discovery**

   ```javascript
   const componentCache = new Map();

   async function getComponent(name) {
     if (!componentCache.has(name)) {
       const component = await discover({ name, type: 'vue-component' });
       componentCache.set(name, component);
     }
     return componentCache.get(name);
   }
   ```

2. **Use shallow mount for unit tests**

   ```javascript
   import { shallowMount } from '@vue/test-utils';

   const wrapper = shallowMount(Component); // Faster than mount
   ```

3. **Pre-compile templates**

   ```javascript
   // vue.config.js
   module.exports = {
     configureWebpack: {
       resolve: {
         alias: {
           'vue$': 'vue/dist/vue.esm-bundler.js'
         }
       }
     }
   };
   ```

## VS Code Integration

```json
// .vscode/settings.json
{
  "adaptive-tests.discovery.vue": true,
  "adaptive-tests.scaffold.outputDirectory": "tests/adaptive",
  "adaptive-tests.discovery.showScores": true
}
```

## Next Steps

1. **Try the Vite template**: `cp -r adaptive-tests/templates/vite-adaptive my-app`
2. **Explore examples**: [Vue Examples](../examples/vue-todo-app)
3. **Read migration guide**: [Migration Guide](./MIGRATION_GUIDE.md)
4. **Join community**: [GitHub Discussions](https://github.com/anon57396/adaptive-tests/discussions)

## Resources

- [Vue Test Utils Documentation](https://test-utils.vuejs.org/)
- [Adaptive Tests API Reference](./API_REFERENCE.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

Happy testing with Vue! 💚
