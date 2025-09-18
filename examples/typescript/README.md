# TypeScript Support

The TypeScript example mirrors the JavaScript calculator demo, but every file is authored in `.ts`. It proves the adaptive discovery engine can locate and execute TypeScript classes without brittle import paths.

## What you get

- `src/Calculator.ts` – the working implementation
- `src/BrokenCalculator.ts` – intentional bugs to show real failures
- `tests/traditional/Calculator.test.ts` – hard-coded imports that break on refactor
- `tests/adaptive/Calculator.test.ts` – uses `TypeScriptDiscoveryEngine` to locate the class dynamically

## Run the TypeScript demo

```bash
npm install
npm test            # runs JS + TS suites through ts-jest
```

Want to focus on the TypeScript suite? Use Jest’s path filtering:

```bash
npx jest examples/typescript/tests --runInBand
```

## Use it in your own project

1. Install the optional TypeScript tooling:
   ```bash
   npm install --save-dev typescript ts-node ts-jest @types/jest @types/node
   ```
2. Add a `tsconfig.json` (the repo ships with one you can copy).
3. Import the TypeScript discovery helpers:
   ```typescript
   import { getTypeScriptDiscoveryEngine } from '../src/adaptive/typescript/discovery';

   const engine = getTypeScriptDiscoveryEngine();
   const UserService = await engine.discoverTarget({
     name: 'UserService',
     type: 'class',
     methods: ['createUser', 'authenticate'],
     exports: 'UserService'
   });
   ```
4. Write your adaptive tests exactly as you would in JavaScript.

The discovery engine analyses TypeScript syntax via the compiler API, verifies that exported classes actually expose the methods you care about, and loads them through `ts-node` so you don’t need a build step.

## Handy scripts

```bash
# Run the TS suites
npm run test:typescript

# Prove imports break but adaptive survives
npm run refactor:ts
npm run test:traditional:ts  # ❌
npm run test:adaptive:ts     # ✅

# Swap in the broken implementation
npm run demo:broken:ts
npm run test:adaptive:ts     # ❌ real failures
npm run restore:broken:ts
```

