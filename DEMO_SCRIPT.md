# Adaptive Tests Demo Video Script

## 🎬 Video Overview
**Duration**: 2-3 minutes
**Target Audience**: JavaScript/TypeScript developers who have experienced test breakage during refactoring
**Goal**: Show the problem, demonstrate the solution, and showcase the VS Code extension's "wow" features

---

## 📹 Scene 1: The Problem (30 seconds)

### Visual: Split screen - Code editor on left, terminal on right

**[0:00-0:05]** *Open with a typical Node.js project*

**Narrator**: "We've all been here. You have a working test suite..."

**Action**: Show `Calculator.js` in `src/utils/Calculator.js`

```javascript
// src/utils/Calculator.js
export class Calculator {
  add(a, b) { return a + b; }
  subtract(a, b) { return a - b; }
}
```

**[0:05-0:10]** *Show traditional test file*

```javascript
// tests/Calculator.test.js
import { Calculator } from '../src/utils/Calculator';

describe('Calculator', () => {
  it('adds numbers', () => {
    const calc = new Calculator();
    expect(calc.add(2, 3)).toBe(5);
  });
});
```

**Action**: Run `npm test` - shows ✅ passing tests

**[0:10-0:20]** *Perform a simple refactor*

**Narrator**: "But then you refactor. Maybe you reorganize your project structure..."

**Action**:
1. Create new folder `src/math/operations/`
2. Move `Calculator.js` to new location
3. Show file tree changing

**[0:20-0:30]** *The inevitable failure*

**Action**: Run `npm test` again

**Terminal Output** (in red):
```
FAIL tests/Calculator.test.js
  ● Cannot find module '../src/utils/Calculator'
```

**Narrator**: "Your tests break. Not because your code is broken, but because they can't find the file. Frustrating, right?"

---

## 📹 Scene 2: The Solution (45 seconds)

### Visual: Same split screen setup

**[0:30-0:35]** *Introduce Adaptive Tests*

**Narrator**: "This is where Adaptive Tests changes everything."

**Action**: Show the adaptive test file

```javascript
// tests/adaptive/Calculator.test.js
const { discover } = require('adaptive-tests');

describe('Calculator - Adaptive', () => {
  let Calculator;

  beforeAll(async () => {
    Calculator = await discover({
      name: 'Calculator',
      type: 'class',
      methods: ['add', 'subtract']
    });
  });

  it('adds numbers', () => {
    const calc = new Calculator();
    expect(calc.add(2, 3)).toBe(5);
  });
});
```

**[0:35-0:45]** *Show it working after the same refactor*

**Narrator**: "Watch what happens when we run the same refactor..."

**Action**:
1. Show `Calculator.js` already moved to `src/math/operations/`
2. Run `npm run test:adaptive`

**Terminal Output** (in green):
```
PASS tests/adaptive/Calculator.test.js
  Calculator - Adaptive
    ✓ adds numbers (3ms)
```

**[0:45-0:55]** *Explain the magic*

**Narrator**: "The adaptive test found your Calculator class automatically. No import paths to update. No broken tests. It just works."

**[0:55-1:15]** *Show the discovery in action*

**Action**: Run `npx adaptive-tests why '{"name":"Calculator"}'`

**Terminal Output**:
```
🔍 Discovery Results for Calculator

Found 1 match:
  1. src/math/operations/Calculator.js (score: 95)
     ✓ Name match: Calculator
     ✓ Type: class
     ✓ Methods: add, subtract, multiply, divide
```

**Narrator**: "The discovery engine uses AST analysis to find your code by its structure, not its location."

---

## 📹 Scene 3: The "Wow" Factor - VS Code Extension (45 seconds)

### Visual: VS Code with extension installed

**[1:15-1:25]** *Open Discovery Lens*

**Narrator**: "But here's where it gets really exciting. With our VS Code extension..."

**Action**:
1. Click Discovery Lens icon in status bar
2. Beautiful webview opens

**[1:25-1:40]** *Interactive Discovery*

**Action**: Type signature in Discovery Lens
```json
{
  "name": "UserService",
  "type": "class",
  "methods": ["create", "update"]
}
```

**Action**: Click "Run Discovery"

**Visual**: Results appear with scores and breakdowns:
- `src/services/UserService.js` - Score: 92
- `src/api/UserService.js` - Score: 78
- `src/legacy/UserSvc.js` - Score: 45

**Narrator**: "See exactly how the discovery engine finds and ranks your code. Click any result to open the file."

**[1:40-1:50]** *Batch Scaffolding Magic*

**Narrator**: "Need to add tests to an existing project? Watch this..."

**Action**:
1. Right-click on `src/services` folder
2. Select "Scaffold Tests for Folder"
3. Progress bar shows "Processing 12 files..."

**Visual**: Multiple test files being created

**Terminal-like output in VS Code**:
```
✅ Created tests/UserServiceTest.js
✅ Created tests/AuthServiceTest.js
✅ Created tests/PaymentServiceTest.js
... 9 more files
```

**[1:50-2:00]** *Smart Context Menus*

**Action**:
1. Right-click on a file without tests
2. Menu shows "Scaffold Adaptive Test"
3. Right-click on a file WITH tests
4. Menu shows "Open Adaptive Test"

**Narrator**: "The extension knows which files have tests and adapts accordingly."

---

## 📹 Scene 4: The Workflow (30 seconds)

### Visual: Fast-paced montage of features

**[2:00-2:15]** *Rapid workflow demonstration*

**Quick cuts showing**:
1. CodeLens hints above classes: "Generate adaptive test"
2. Discovery tree in activity bar showing recent results
3. Test file auto-opening after scaffolding
4. Multiple files being scaffolded in parallel

**Narrator**: "Adaptive Tests transforms how you write and maintain test suites. Your tests become resilient to refactoring, and the VS Code extension makes adoption effortless."

**[2:15-2:25]** *Call to action*

**Visual**: Show installation commands

```bash
# Install the npm package today
npm install adaptive-tests

# VS Code extension coming soon!
# Search "Adaptive Tests" in the marketplace
```

**[2:25-2:30]** *Closing*

**Visual**: Logo and tagline

**Text on screen**:
```
Adaptive Tests
Tests that find your code, not your folders.

GitHub: github.com/anon57396/adaptive-tests
npm: adaptive-tests
```

**Narrator**: "Stop fighting with import paths. Start writing tests that adapt."

---

## 🎯 Key Messages to Emphasize

1. **The Problem is Universal**: Every developer has experienced test breakage from refactoring
2. **The Solution is Elegant**: Discovery by structure, not location
3. **The Tool is Powerful**: VS Code extension makes it incredibly easy to adopt
4. **The Impact is Immediate**: No more broken tests from moving files

## 🎨 Visual Style Notes

- **Color Scheme**: Use VS Code dark theme for consistency
- **Animations**: Smooth transitions between file moves
- **Highlights**: Use glow effects when showing successful discovery
- **Typography**: Clean, modern monospace for code, sans-serif for UI

## 🎵 Audio Notes

- **Background Music**: Subtle, modern, upbeat but not distracting
- **Narration**: Clear, enthusiastic but professional
- **Sound Effects**: Subtle clicks for UI interactions, success chimes for passing tests

## 📝 Alternative Shorter Version (60 seconds)

For social media or quick demos, focus on:
1. Problem (10s): Test breaks after moving file
2. Solution (20s): Adaptive test still passes
3. Discovery Lens (20s): Visual discovery in VS Code
4. Call to Action (10s): Install instructions

---

**Remember**: The goal is to make viewers think "I need this!" within the first 30 seconds.