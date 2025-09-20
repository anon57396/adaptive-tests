/**
 * Adaptive tests for React components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDiscoveryEngine } from '../../../../src/discovery-engine';

describe('React Components - Adaptive Discovery', () => {
  let Button, TodoList, UserCard;
  let withAuth, useUserStatus;

  beforeAll(async () => {
    const engine = getDiscoveryEngine();

    // Discover Button component
    const buttonModule = await engine.discoverTarget({
      name: 'Button',
      type: 'react-component',
      exports: ['Button'],
      props: ['onClick', 'variant', 'size', 'disabled', 'loading']
    });
    Button = buttonModule.Button || buttonModule.default;

    // Discover TodoList component
    const todoModule = await engine.discoverTarget({
      name: 'TodoList',
      type: 'react-component',
      exports: ['TodoList'],
      hooks: ['useState']
    });
    TodoList = todoModule.TodoList || todoModule.default;

    // Discover UserCard and utilities
    const userCardModule = await engine.discoverTarget({
      name: 'UserCard',
      type: 'module',
      exports: ['UserCard', 'withAuth', 'useUserStatus']
    });
    UserCard = userCardModule.UserCard;
    withAuth = userCardModule.withAuth;
    useUserStatus = userCardModule.useUserStatus;
  });

  describe('Button Component', () => {
    test('should discover and render Button component', () => {
      render(<Button>Click Me</Button>);
      const button = screen.getByTestId('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Click Me');
    });

    test('should handle click events', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Test</Button>);

      fireEvent.click(screen.getByTestId('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('should apply variant classes', () => {
      const { rerender } = render(<Button variant="primary">Primary</Button>);
      expect(screen.getByTestId('button')).toHaveClass('btn-primary');

      rerender(<Button variant="danger">Danger</Button>);
      expect(screen.getByTestId('button')).toHaveClass('btn-danger');
    });

    test('should handle loading state', () => {
      render(<Button loading={true}>Loading</Button>);
      const button = screen.getByTestId('button');

      expect(button).toBeDisabled();
      expect(button).toHaveClass('btn-loading');
      expect(button.querySelector('.spinner')).toBeInTheDocument();
    });

    test('should handle disabled state', () => {
      render(<Button disabled={true}>Disabled</Button>);
      const button = screen.getByTestId('button');

      expect(button).toBeDisabled();
      expect(button).toHaveClass('btn-disabled');
    });
  });

  describe('TodoList Component', () => {
    test('should discover and render TodoList component', () => {
      render(<TodoList />);
      expect(screen.getByTestId('todo-list')).toBeInTheDocument();
      expect(screen.getByTestId('todo-input')).toBeInTheDocument();
    });

    test('should add new todos', async () => {
      const user = userEvent.setup();
      render(<TodoList />);

      const input = screen.getByTestId('todo-input');
      const addButton = screen.getByTestId('add-button');

      await user.type(input, 'Test Todo');
      await user.click(addButton);

      expect(screen.getByText('Test Todo')).toBeInTheDocument();
    });

    test('should filter todos', async () => {
      const user = userEvent.setup();
      const initialTodos = [
        { id: 1, text: 'Active Todo', completed: false },
        { id: 2, text: 'Completed Todo', completed: true }
      ];

      render(<TodoList initialTodos={initialTodos} />);

      // Check all todos visible initially
      expect(screen.getByText('Active Todo')).toBeInTheDocument();
      expect(screen.getByText('Completed Todo')).toBeInTheDocument();

      // Filter active only
      await user.click(screen.getByTestId('filter-active'));
      expect(screen.getByText('Active Todo')).toBeInTheDocument();
      expect(screen.queryByText('Completed Todo')).not.toBeInTheDocument();

      // Filter completed only
      await user.click(screen.getByTestId('filter-completed'));
      expect(screen.queryByText('Active Todo')).not.toBeInTheDocument();
      expect(screen.getByText('Completed Todo')).toBeInTheDocument();
    });

    test('should toggle todo completion', async () => {
      const user = userEvent.setup();
      const initialTodos = [
        { id: 1, text: 'Test Todo', completed: false }
      ];

      render(<TodoList initialTodos={initialTodos} />);

      const checkbox = screen.getByTestId('toggle-1');
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    test('should delete todos', async () => {
      const user = userEvent.setup();
      const initialTodos = [
        { id: 1, text: 'Test Todo', completed: false }
      ];

      render(<TodoList initialTodos={initialTodos} />);

      expect(screen.getByText('Test Todo')).toBeInTheDocument();

      await user.click(screen.getByTestId('delete-1'));
      expect(screen.queryByText('Test Todo')).not.toBeInTheDocument();
    });
  });

  describe('UserCard Component', () => {
    const mockUser = {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      avatar: 'avatar.jpg',
      role: 'Admin',
      status: 'active'
    };

    test('should discover and render UserCard component', () => {
      render(<UserCard user={mockUser} />);
      expect(screen.getByTestId('user-card')).toBeInTheDocument();
      expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe');
      expect(screen.getByTestId('user-email')).toHaveTextContent('john@example.com');
    });

    test('should render compact view', () => {
      render(<UserCard user={mockUser} compact={true} />);
      expect(screen.getByTestId('user-card-compact')).toBeInTheDocument();
      expect(screen.queryByTestId('user-card')).not.toBeInTheDocument();
    });

    test('should handle action callbacks', () => {
      const handleEdit = jest.fn();
      const handleDelete = jest.fn();

      render(
        <UserCard
          user={mockUser}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      );

      fireEvent.click(screen.getByTestId('edit-button'));
      expect(handleEdit).toHaveBeenCalledWith(1);

      fireEvent.click(screen.getByTestId('delete-button'));
      expect(handleDelete).toHaveBeenCalledWith(1);
    });

    test('should hide actions when showActions is false', () => {
      render(<UserCard user={mockUser} showActions={false} />);
      expect(screen.queryByTestId('edit-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('delete-button')).not.toBeInTheDocument();
    });
  });

  describe('Higher Order Component - withAuth', () => {
    test('should discover and use withAuth HOC', () => {
      const TestComponent = () => <div>Protected Content</div>;
      const ProtectedComponent = withAuth(TestComponent);

      // Not authenticated
      const { rerender } = render(<ProtectedComponent user={{ isAuthenticated: false }} />);
      expect(screen.getByText('Please log in to view this content')).toBeInTheDocument();

      // Authenticated
      rerender(<ProtectedComponent user={{ isAuthenticated: true }} />);
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Custom Hook - useUserStatus', () => {
    test('should discover and use useUserStatus hook', () => {
      const TestComponent = () => {
        const [status, updateStatus] = useUserStatus('active');

        return (
          <div>
            <span data-testid="status">{status}</span>
            <button onClick={() => updateStatus('inactive')}>Set Inactive</button>
            <button onClick={() => updateStatus('invalid')}>Set Invalid</button>
          </div>
        );
      };

      render(<TestComponent />);

      expect(screen.getByTestId('status')).toHaveTextContent('active');

      // Valid status update
      fireEvent.click(screen.getByText('Set Inactive'));
      expect(screen.getByTestId('status')).toHaveTextContent('inactive');

      // Invalid status should not update
      fireEvent.click(screen.getByText('Set Invalid'));
      expect(screen.getByTestId('status')).toHaveTextContent('inactive');
    });
  });
});