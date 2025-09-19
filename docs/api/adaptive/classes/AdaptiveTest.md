[**adaptive-tests**](../../README.md)

***

[adaptive-tests](../../README.md) / [adaptive](../README.md) / AdaptiveTest

# Abstract Class: AdaptiveTest

Defined in: [adaptive/test-base.d.ts:11](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/test-base.d.ts#L11)

An abstract base class for creating adaptive tests.

## Constructors

### Constructor

> **new AdaptiveTest**(): `AdaptiveTest`

#### Returns

`AdaptiveTest`

## Properties

### discoveryEngine

> **discoveryEngine**: [`DiscoveryEngine`](DiscoveryEngine.md)

Defined in: [adaptive/test-base.d.ts:13](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/test-base.d.ts#L13)

***

### target

> **target**: `any`

Defined in: [adaptive/test-base.d.ts:15](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/test-base.d.ts#L15)

## Methods

### execute()

> **execute**(): `Promise`\<`void`\>

Defined in: [adaptive/test-base.d.ts:35](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/test-base.d.ts#L35)

Executes the adaptive test lifecycle: discovery and execution.

#### Returns

`Promise`\<`void`\>

***

### getExport()

> **getExport**\<`T`\>(`module`, `name`): `T`

Defined in: [adaptive/test-base.d.ts:43](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/test-base.d.ts#L43)

Helper method to get a specific export from a discovered module.

#### Type Parameters

##### T

`T`

#### Parameters

##### module

`any`

The discovered module.

##### name

`string`

The name of the export to retrieve.

#### Returns

`T`

***

### getTargetSignature()

> `abstract` **getTargetSignature**(): `any`

Defined in: [adaptive/test-base.d.ts:22](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/test-base.d.ts#L22)

Defines the signature of the target module to be discovered.
This method must be implemented by the subclass.

#### Returns

`any`

***

### runTests()

> `abstract` **runTests**(`target`): `void` \| `Promise`\<`void`\>

Defined in: [adaptive/test-base.d.ts:30](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/test-base.d.ts#L30)

Contains the actual test logic (e.g., using Jest or Mocha).
This method must be implemented by the subclass.

#### Parameters

##### target

`any`

The discovered target module or export.

#### Returns

`void` \| `Promise`\<`void`\>
