# Adaptive Tests Interactive Demo Guide

## 🎭 Interactive Demo Overview

**Format**: GitHub Pages Interactive Demo
**Platform**: Single platform - GitHub (Pages, Discussions, Issues)
**Target Audience**: JavaScript/TypeScript developers experiencing test maintenance pain
**Goal**: Interactive demonstration where users can try adaptive tests themselves

---

## 🔴 Step 1: Experience the Problem

### Interactive Demo Section

**Demo Interface**: Split-pane editor with live terminal output

**Initial State**: Show a working Node.js project with traditional tests

```javascript
// src/utils/Calculator.js
export class Calculator {
  add(a, b) { return a + b; }
  subtract(a, b) { return a - b; }
}

// tests/Calculator.test.js
import { Calculator } from '../src/utils/Calculator';

test('adds numbers', () => {
  const calc = new Calculator();
  expect(calc.add(2, 3)).toBe(5);
});
```

**User Action**: Click "Run Tests" → Shows ✅ All tests passing

**User Action**: Click "Refactor Code" button

- Animation shows file moving from `src/utils/` to `src/math/operations/`
- File tree updates in real-time

**User Action**: Click "Run Tests Again"

- Terminal shows: ❌ `Cannot find module '../src/utils/Calculator'`

**Demo Message**: "Your tests fail not because code is broken, but because of a simple file move."

---

## 🌟 Step 2: Discover the Solution

### Interactive Comparison

**Demo Interface**: Side-by-side comparison of traditional vs adaptive tests

**Traditional Test** (left):

```javascript
// Hardcoded import path
import { Calculator } from '../src/utils/Calculator';
```

**Adaptive Test** (right):

```javascript
// Discovery-based approach
const { discover } = require('adaptive-tests');

const Calculator = await discover({
  name: 'Calculator',
  type: 'class',
  methods: ['add', 'subtract']
});
```

**User Action**: Click "Run Both After Refactor"

- Traditional: ❌ Import error
- Adaptive: ✅ Found Calculator automatically

**Interactive Element**: Click "How Does Discovery Work?"

- Shows animated visualization of AST parsing
- Highlights how adaptive tests scan the codebase

---

## 🎯 Step 3: Try It Live

### Embedded Code Playground

**Interactive Elements**:

1. **Code Editor**: Users can write their own test
2. **File Tree**: Users can move files around
3. **Test Runner**: Shows results in real-time

**Guided Experience**:

1. "Create a class anywhere in the project"
2. "Write an adaptive test using discover()"
3. "Move your class to a different folder"
4. "Run tests again - they still pass!"

**Demo Features**:

```javascript
// User writes this:
const MyService = await discover({
  name: 'MyService',
  methods: ['getData']
});

// Discovery shows:
// 🔍 Searching...
// ✅ Found: src/services/MyService.js
// Score: 95 (name: exact match, methods: found)
```

---

## 🛠️ VS Code Extension Preview

### Interactive VS Code Demo

**Feature Showcase** (clickable tabs):

#### Tab 1: Discovery Lens

- Interactive mock of Discovery Lens WebView
- User can input signatures and see live results
- Shows score breakdowns and match explanations

#### Tab 2: CodeLens Integration

- Hoverable code showing test hints
- "3 adaptive tests | Open Test | Scaffold Test"

#### Tab 3: Batch Scaffolding

- Drag folder to scaffold area
- Shows progress bar and generated test files

#### Tab 4: Smart Context Menus

- Click files to see different menu options
- "Scaffold Adaptive Test" for untested files
- "Open Adaptive Test" for tested files

---

## 🚀 Get Started

### Installation Options

**Interactive Installation Guide**:

```bash
# Quick Start (Copy button on each)
npm install --save-dev adaptive-tests

# With Jest Preset
npm install --save-dev jest-adaptive adaptive-tests

# VS Code Extension
code --install-extension adaptive-tests
```

**Try Now Options**:

1. **GitHub Codespaces**: "Open in Codespace" button
2. **GitHub Pages Demo**: "Try in Browser" button
3. **Local**: Copy installation commands

---

## 📚 Resources

**All on GitHub**:

- [Documentation](https://anon57396.github.io/adaptive-tests/)
- [Examples](https://github.com/anon57396/adaptive-tests/tree/main/examples)
- [Discussions](https://github.com/anon57396/adaptive-tests/discussions)
- [Issues](https://github.com/anon57396/adaptive-tests/issues)

**No External Platforms** - Everything managed through GitHub:

- GitHub Pages for documentation and demos
- GitHub Discussions for community
- GitHub Issues for support
- GitHub Actions for CI/CD
- GitHub Releases for versioning

---

## Demo Implementation Notes

### Technology Stack

- **GitHub Pages**: Static site hosting
- **React/Vue/Vanilla JS**: For interactive elements
- **Monaco Editor**: For code editing experience
- **Local Storage**: For saving user progress

### Key Features

1. No backend required - runs entirely in browser
2. Shareable URLs for specific demo states
3. Embedded in README via GitHub Pages iframe
4. Mobile-responsive design

### Tracking

- Use GitHub Pages analytics
- Track demo completion rates
- Monitor which features users interact with most
