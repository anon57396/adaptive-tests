import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { discover } from 'adaptive-tests';

describe('Counter Component - Adaptive', () => {
  let Counter: any;

  beforeAll(async () => {
    // Discover Counter component by structure, not path
    Counter = await discover({
      name: 'Counter',
      type: 'function',
      exports: 'Counter',
    });
  });

  it('renders with initial value', () => {
    render(<Counter initialValue={5} />);
    expect(screen.getByText(/Counter: 5/i)).toBeInTheDocument();
  });

  it('increments counter on button click', () => {
    render(<Counter />);
    const incrementButton = screen.getByRole('button', { name: /\+ 1/i });

    fireEvent.click(incrementButton);
    expect(screen.getByText(/Counter: 1/i)).toBeInTheDocument();

    fireEvent.click(incrementButton);
    expect(screen.getByText(/Counter: 2/i)).toBeInTheDocument();
  });

  it('decrements counter on button click', () => {
    render(<Counter initialValue={5} />);
    const decrementButton = screen.getByRole('button', { name: /- 1/i });

    fireEvent.click(decrementButton);
    expect(screen.getByText(/Counter: 4/i)).toBeInTheDocument();
  });

  it('resets counter to initial value', () => {
    render(<Counter initialValue={10} />);
    const incrementButton = screen.getByRole('button', { name: /\+ 1/i });
    const resetButton = screen.getByRole('button', { name: /Reset/i });

    fireEvent.click(incrementButton);
    fireEvent.click(incrementButton);
    expect(screen.getByText(/Counter: 12/i)).toBeInTheDocument();

    fireEvent.click(resetButton);
    expect(screen.getByText(/Counter: 10/i)).toBeInTheDocument();
  });

  it('respects min and max boundaries', () => {
    render(<Counter initialValue={0} min={0} max={2} />);
    const incrementButton = screen.getByRole('button', { name: /\+ 1/i });
    const decrementButton = screen.getByRole('button', { name: /- 1/i });

    // Should be disabled at min
    expect(decrementButton).toBeDisabled();

    // Increment to max
    fireEvent.click(incrementButton);
    fireEvent.click(incrementButton);
    expect(screen.getByText(/Counter: 2/i)).toBeInTheDocument();

    // Should be disabled at max
    expect(incrementButton).toBeDisabled();
  });

  it('uses custom step value', () => {
    render(<Counter step={5} />);
    const incrementButton = screen.getByRole('button', { name: /\+ 5/i });

    fireEvent.click(incrementButton);
    expect(screen.getByText(/Counter: 5/i)).toBeInTheDocument();

    fireEvent.click(incrementButton);
    expect(screen.getByText(/Counter: 10/i)).toBeInTheDocument();
  });
});