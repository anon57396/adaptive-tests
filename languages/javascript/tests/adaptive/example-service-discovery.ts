import { discover } from 'adaptive-tests';

async function main(): Promise<void> {
  const Target = await discover({
    name: 'ExampleService',
    type: 'class',
    methods: ['methodName'] // Update with real structure
  });

  console.log('Discovered ExampleService from src/', Target);
}

main().catch((error) => {
  console.error('Discovery failed', error);
});
