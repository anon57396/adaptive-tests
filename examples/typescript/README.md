# TypeScript Support

Adaptive testing works with TypeScript too!

## Quick Setup

1. Install TypeScript dependencies:
```bash
npm install --save-dev typescript ts-node ts-jest @types/jest @types/node
```

2. Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

3. Use the TypeScript discovery engine:

```typescript
// tests/adaptive/discovery.ts
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

export class TypeScriptDiscoveryEngine {
  async discoverTarget(signature: TargetSignature): Promise<any> {
    // Similar to JS version but uses TypeScript compiler API
    // for better type analysis
  }
}
```

4. Write adaptive TypeScript tests:

```typescript
// tests/UserService.test.ts
import { AdaptiveTest } from './adaptive-base';

class UserServiceTest extends AdaptiveTest {
  getTargetSignature() {
    return {
      name: 'UserService',
      type: 'class',
      methods: ['createUser', 'authenticate']
    };
  }

  async runTests(UserService: any) {
    test('creates users', () => {
      const service = new UserService();
      const user = service.createUser('Alice');
      expect(user.name).toBe('Alice');
    });
  }
}
```

The same principle applies - tests find their targets dynamically, surviving any refactoring!