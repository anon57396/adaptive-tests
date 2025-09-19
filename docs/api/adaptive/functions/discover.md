[**adaptive-tests**](../../README.md)

***

[adaptive-tests](../../README.md) / [adaptive](../README.md) / discover

# Function: discover()

> **discover**\<`T`\>(`signature`, `rootPath?`): `Promise`\<`T`\>

Defined in: [adaptive/index.d.ts:22](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/index.d.ts#L22)

A convenience function to quickly discover a target without creating an engine instance directly.

## Type Parameters

### T

`T`

## Parameters

### signature

`any`

The signature of the target to discover.

### rootPath?

`string`

The root directory to scan from.

## Returns

`Promise`\<`T`\>

A promise that resolves with the discovered target.
