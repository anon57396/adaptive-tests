import { describe, test, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDiscoveryEngine } from 'adaptive-tests';

describe('Adaptive Component Tests', () => {
  let Calculator: any;
  let TodoList: any;

  beforeAll(async () => {
    const engine = getDiscoveryEngine();

    // Discover Calculator component
    const calcModule = await engine.discoverTarget({
      name: 'Calculator',
      type: 'react-component',
      exports: ['Calculator'],
      extension: 'tsx'
    });
    Calculator = calcModule.Calculator || calcModule.default;

    // Discover TodoList component
    const todoModule = await engine.discoverTarget({
      name: 'TodoList',
      type: 'react-component',
      exports: ['TodoList'],
      extension: 'tsx'
    });
    TodoList = todoModule.TodoList || todoModule.default;
  });

  describe('Calculator Component', () => {
    test('should discover and render Calculator', () => {
      render(<Calculator />);
      expect(screen.getByTestId('calculator')).toBeInTheDocument();
      expect(screen.getByTestId('display')).toHaveTextContent('0');
    });

    test('should perform calculations', async () => {
      render(<Calculator />);
      const user = userEvent.setup();

      // Click 2 + 3 =
      await user.click(screen.getByTestId('2'));
      await user.click(screen.getByTestId('add'));
      await user.click(screen.getByTestId('3'));
      await user.click(screen.getByTestId('equals'));

      expect(screen.getByTestId('display')).toHaveTextContent('5');
    });

    test('should clear display', async () => {
      render(<Calculator />);
      const user = userEvent.setup();

      await user.click(screen.getByTestId('5'));
      expect(screen.getByTestId('display')).toHaveTextContent('5');

      await user.click(screen.getByTestId('clear'));
      expect(screen.getByTestId('display')).toHaveTextContent('0');
    });
  });

  describe('TodoList Component', () => {
    test('should discover and render TodoList', () => {
      render(<TodoList />);
      expect(screen.getByTestId('todo-list')).toBeInTheDocument();
      expect(screen.getByTestId('todo-stats')).toHaveTextContent('0 active, 0 completed');
    });

    test('should add todos', async () => {
      render(<TodoList />);
      const user = userEvent.setup();

      const input = screen.getByTestId('todo-input');
      const addButton = screen.getByTestId('add-button');

      await user.type(input, 'Test Todo');
      await user.click(addButton);

      expect(screen.getByText('Test Todo')).toBeInTheDocument();
      expect(screen.getByTestId('todo-stats')).toHaveTextContent('1 active, 0 completed');
    });

    test('should toggle todo completion', async () => {
      const initialTodos = [
        { id: 1, text: 'Test Todo', completed: false }
      ];

      render(<TodoList initialTodos={initialTodos} />);
      const user = userEvent.setup();

      const checkbox = screen.getByTestId('toggle-1');
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
      expect(screen.getByTestId('todo-stats')).toHaveTextContent('0 active, 1 completed');
    });

    test('should delete todos', async () => {
      const initialTodos = [
        { id: 1, text: 'Test Todo', completed: false }
      ];

      render(<TodoList initialTodos={initialTodos} />);
      const user = userEvent.setup();

      expect(screen.getByText('Test Todo')).toBeInTheDocument();

      await user.click(screen.getByTestId('delete-1'));
      expect(screen.queryByText('Test Todo')).not.toBeInTheDocument();
      expect(screen.getByTestId('todo-stats')).toHaveTextContent('0 active, 0 completed');
    });
  });
});