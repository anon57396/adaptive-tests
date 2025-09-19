import React, { useState } from 'react';

interface CalculatorProps {
  title?: string;
}

export const Calculator: React.FC<CalculatorProps> = ({ title = 'Calculator' }) => {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  const inputNumber = (num: number) => {
    if (waitingForNewValue) {
      setDisplay(String(num));
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === '0' ? String(num) : display + num);
    }
  };

  const inputOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForNewValue(true);
    setOperation(nextOperation);
  };

  const calculate = (firstValue: number, secondValue: number, operation: string) => {
    switch (operation) {
      case '+':
        return firstValue + secondValue;
      case '-':
        return firstValue - secondValue;
      case '*':
        return firstValue * secondValue;
      case '/':
        return firstValue / secondValue;
      case '=':
        return secondValue;
      default:
        return secondValue;
    }
  };

  const performCalculation = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      setDisplay(String(newValue));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForNewValue(true);
    }
  };

  const clear = () => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForNewValue(false);
  };

  return (
    <div className="calculator" data-testid="calculator">
      <h2>{title}</h2>
      <div className="display" data-testid="display">
        {display}
      </div>
      <div className="keypad">
        <button onClick={clear} data-testid="clear">C</button>
        <button onClick={() => inputOperation('/')} data-testid="divide">/</button>
        <button onClick={() => inputOperation('*')} data-testid="multiply">*</button>
        <button onClick={() => inputOperation('-')} data-testid="subtract">-</button>

        <button onClick={() => inputNumber(7)} data-testid="7">7</button>
        <button onClick={() => inputNumber(8)} data-testid="8">8</button>
        <button onClick={() => inputNumber(9)} data-testid="9">9</button>
        <button onClick={() => inputOperation('+')} data-testid="add">+</button>

        <button onClick={() => inputNumber(4)} data-testid="4">4</button>
        <button onClick={() => inputNumber(5)} data-testid="5">5</button>
        <button onClick={() => inputNumber(6)} data-testid="6">6</button>

        <button onClick={() => inputNumber(1)} data-testid="1">1</button>
        <button onClick={() => inputNumber(2)} data-testid="2">2</button>
        <button onClick={() => inputNumber(3)} data-testid="3">3</button>

        <button onClick={() => inputNumber(0)} data-testid="0">0</button>
        <button onClick={performCalculation} data-testid="equals">=</button>
      </div>
    </div>
  );
};

export default Calculator;