# Quick Start – Writing Your First Adaptive Test

1. **Install the package**

   ```bash
   npm install adaptive-tests
   npm install --save-dev ts-node   # optional, for raw TypeScript discovery
   ```

2. **Grab an engine and discover targets**

   ```javascript
   const path = require('path');
   const { getDiscoveryEngine } = require('adaptive-tests');

   const engine = getDiscoveryEngine(path.resolve(__dirname, '../..'));

   describe('Calculator – adaptive discovery', () => {
     let Calculator;

     beforeAll(async () => {
       Calculator = await engine.discoverTarget({
         name: 'Calculator',
         type: 'class',
         methods: ['add', 'subtract', 'multiply', 'divide']
       });
     });

     it('adds numbers without import paths', () => {
       const calc = new Calculator();
       expect(calc.add(5, 3)).toBe(8);
     });
   });
   ```

   Under the hood the engine parses each candidate with `@babel/parser`, so no
   code is executed until the correct module has been identified.

3. **Use rich signatures**

   ```javascript
   await engine.discoverTarget({ name: 'UserService', type: 'class' });
   await engine.discoverTarget({ name: 'calculateTax', type: 'function' });
   await engine.discoverTarget({
     name: /Controller$/,         // regex support
     type: 'class',
     methods: ['create', 'update'],
     properties: ['repository']
   });
   ```

4. **Move files with confidence**
   - Run the test once (cache warms up).
   - Move or rename the target file.
   - Run it again—the test still passes.

5. **Helpful scripts**

```bash
npm run validate   # end-to-end demo (healthy → refactor → broken)
npm run compare    # watch traditional vs adaptive output
npm run demo       # quick resilience walkthrough
```

## Learn More

- How It Works: HOW_IT_WORKS.md
- Best Practices: BEST_PRACTICES.md

That’s it. Adaptive discovery removes brittle import paths from your tests while
staying compatible with existing runners like Jest, Mocha, or Vitest.
