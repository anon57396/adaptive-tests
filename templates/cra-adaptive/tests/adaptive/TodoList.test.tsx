import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { discover } from 'adaptive-tests';

describe('TodoList Component - Adaptive', () => {
  let TodoList: any;

  beforeAll(async () => {
    // Discover TodoList component by structure
    TodoList = await discover({
      name: 'TodoList',
      type: 'function',
      exports: 'TodoList',
    });
  });

  it('renders with title', () => {
    render(<TodoList />);
    expect(screen.getByText('Todo List')).toBeInTheDocument();
  });

  it('adds a new todo', async () => {
    const user = userEvent.setup();
    render(<TodoList />);

    const input = screen.getByPlaceholderText('What needs to be done?');
    const addButton = screen.getByRole('button', { name: 'Add' });

    await user.type(input, 'Write adaptive tests');
    await user.click(addButton);

    expect(screen.getByText('Write adaptive tests')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('adds todo on Enter key', async () => {
    const user = userEvent.setup();
    render(<TodoList />);

    const input = screen.getByPlaceholderText('What needs to be done?');
    await user.type(input, 'Test with Enter{enter}');

    expect(screen.getByText('Test with Enter')).toBeInTheDocument();
  });

  it('toggles todo completion', async () => {
    const user = userEvent.setup();
    const initialTodos = [
      { id: '1', text: 'Test todo', completed: false },
    ];

    render(<TodoList initialTodos={initialTodos} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('deletes a todo', async () => {
    const user = userEvent.setup();
    const initialTodos = [
      { id: '1', text: 'Todo to delete', completed: false },
    ];

    render(<TodoList initialTodos={initialTodos} />);

    expect(screen.getByText('Todo to delete')).toBeInTheDocument();

    const deleteButton = screen.getByRole('button', { name: 'Delete' });
    await user.click(deleteButton);

    expect(screen.queryByText('Todo to delete')).not.toBeInTheDocument();
  });

  it('clears completed todos', async () => {
    const user = userEvent.setup();
    const initialTodos = [
      { id: '1', text: 'Active todo', completed: false },
      { id: '2', text: 'Completed todo', completed: true },
      { id: '3', text: 'Another completed', completed: true },
    ];

    render(<TodoList initialTodos={initialTodos} />);

    const clearButton = screen.getByRole('button', { name: 'Clear completed' });
    await user.click(clearButton);

    expect(screen.getByText('Active todo')).toBeInTheDocument();
    expect(screen.queryByText('Completed todo')).not.toBeInTheDocument();
    expect(screen.queryByText('Another completed')).not.toBeInTheDocument();
  });

  it('shows correct counts', () => {
    const initialTodos = [
      { id: '1', text: 'Todo 1', completed: false },
      { id: '2', text: 'Todo 2', completed: true },
      { id: '3', text: 'Todo 3', completed: false },
    ];

    render(<TodoList initialTodos={initialTodos} />);

    expect(screen.getByText('2 active, 1 completed')).toBeInTheDocument();
  });

  it('does not add empty todos', async () => {
    const user = userEvent.setup();
    render(<TodoList />);

    const addButton = screen.getByRole('button', { name: 'Add' });
    await user.click(addButton);

    const todos = screen.queryAllByRole('checkbox');
    expect(todos).toHaveLength(0);
  });
});