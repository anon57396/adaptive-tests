#!/usr/bin/env node

/**
 * Refactoring demo for TypeScript React components
 * Simulates common refactoring scenarios to test adaptive tests
 */

const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function refactorCalculator() {
  const filePath = path.join(__dirname, '../src/components/Calculator.tsx');
  let content = fs.readFileSync(filePath, 'utf8');

  // Rename component
  content = content.replace(/export const Calculator:/g, 'export const CalculatorWidget:');
  content = content.replace(/const Calculator:/g, 'const CalculatorWidget:');

  // Rename methods
  content = content.replace(/inputNumber/g, 'handleNumberInput');
  content = content.replace(/inputOperation/g, 'handleOperationInput');
  content = content.replace(/performCalculation/g, 'executeCalculation');

  // Change prop name
  content = content.replace(/title = 'Calculator'/g, "heading = 'Calculator'");
  content = content.replace(/\{ title/g, '{ heading');
  content = content.replace(/\{title\}/g, '{heading}');

  fs.writeFileSync(filePath, content);
  log('✅ Refactored Calculator component', 'green');
}

function refactorTodoList() {
  const filePath = path.join(__dirname, '../src/components/TodoList.tsx');
  let content = fs.readFileSync(filePath, 'utf8');

  // Rename component
  content = content.replace(/export const TodoList:/g, 'export const TaskManager:');
  content = content.replace(/const TodoList:/g, 'const TaskManager:');

  // Rename interface
  content = content.replace(/interface Todo \{/g, 'interface Task {');
  content = content.replace(/Todo\[\]/g, 'Task[]');
  content = content.replace(/: Todo/g, ': Task');

  // Rename methods
  content = content.replace(/addTodo/g, 'addTask');
  content = content.replace(/toggleTodo/g, 'toggleTask');
  content = content.replace(/deleteTodo/g, 'removeTask');

  // Rename state variables
  content = content.replace(/todos/g, 'tasks');
  content = content.replace(/todo/g, 'task');

  fs.writeFileSync(filePath, content);
  log('✅ Refactored TodoList component', 'green');
}

function moveToNewStructure() {
  // Create new directory structure
  const newDir = path.join(__dirname, '../src/features');
  if (!fs.existsSync(newDir)) {
    fs.mkdirSync(newDir, { recursive: true });
  }

  // Move files
  const calcPath = path.join(__dirname, '../src/components/Calculator.tsx');
  const todoPath = path.join(__dirname, '../src/components/TodoList.tsx');

  if (fs.existsSync(calcPath)) {
    const content = fs.readFileSync(calcPath, 'utf8');
    fs.writeFileSync(path.join(newDir, 'CalculatorWidget.tsx'), content);

    // Create redirect
    fs.writeFileSync(calcPath, `export { CalculatorWidget as Calculator } from '../features/CalculatorWidget';\n`);
  }

  if (fs.existsSync(todoPath)) {
    const content = fs.readFileSync(todoPath, 'utf8');
    fs.writeFileSync(path.join(newDir, 'TaskManager.tsx'), content);

    // Create redirect
    fs.writeFileSync(todoPath, `export { TaskManager as TodoList } from '../features/TaskManager';\n`);
  }

  log('✅ Moved components to features directory', 'green');
}

function main() {
  log('\n🔧 Starting TypeScript React Refactoring Demo', 'cyan');
  log('=' . repeat(50), 'cyan');

  try {
    // Backup original files
    const componentsDir = path.join(__dirname, '../src/components');
    const files = fs.readdirSync(componentsDir);

    files.forEach(file => {
      if (file.endsWith('.tsx')) {
        const filePath = path.join(componentsDir, file);
        fs.copyFileSync(filePath, `${filePath}.backup`);
      }
    });

    log('\n📁 Creating backups...', 'yellow');

    // Apply refactorings
    refactorCalculator();
    refactorTodoList();
    moveToNewStructure();

    log('\n✨ Refactoring complete!', 'green');
    log('\nRun the following to test:', 'cyan');
    log('  npm run test:traditional  # Should fail', 'yellow');
    log('  npm run test:adaptive     # Should pass', 'green');

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Add restore command
if (process.argv[2] === '--restore') {
  log('\n🔄 Restoring original files...', 'cyan');

  const componentsDir = path.join(__dirname, '../src/components');
  const featuresDir = path.join(__dirname, '../src/features');

  // Remove features directory
  if (fs.existsSync(featuresDir)) {
    fs.rmSync(featuresDir, { recursive: true, force: true });
  }

  // Restore backups
  const files = fs.readdirSync(componentsDir);
  files.forEach(file => {
    if (file.endsWith('.backup')) {
      const backupPath = path.join(componentsDir, file);
      const originalPath = backupPath.replace('.backup', '');
      fs.copyFileSync(backupPath, originalPath);
      fs.unlinkSync(backupPath);
    }
  });

  log('✅ Files restored to original state', 'green');
  process.exit(0);
}

main();