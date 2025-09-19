import { useState } from 'react';

export interface CounterProps {
  initialValue?: number;
  min?: number;
  max?: number;
  step?: number;
}

export function Counter({
  initialValue = 0,
  min = -Infinity,
  max = Infinity,
  step = 1,
}: CounterProps) {
  const [count, setCount] = useState(initialValue);

  const increment = () => {
    setCount((prev) => {
      const next = prev + step;
      return next <= max ? next : prev;
    });
  };

  const decrement = () => {
    setCount((prev) => {
      const next = prev - step;
      return next >= min ? next : prev;
    });
  };

  const reset = () => {
    setCount(initialValue);
  };

  return (
    <div className="counter">
      <h2>Counter: {count}</h2>
      <div className="counter-buttons">
        <button onClick={decrement} disabled={count <= min}>
          - {step}
        </button>
        <button onClick={reset}>Reset</button>
        <button onClick={increment} disabled={count >= max}>
          + {step}
        </button>
      </div>
    </div>
  );
}