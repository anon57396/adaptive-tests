import React from 'react';
import Calculator from './components/Calculator';
import TodoList from './components/TodoList';
import './App.css';

function App() {
  return (
    <div className="App">
      <h1>Vite + React + TypeScript with Adaptive Testing</h1>
      <div className="container">
        <Calculator />
        <TodoList />
      </div>
    </div>
  );
}

export default App;