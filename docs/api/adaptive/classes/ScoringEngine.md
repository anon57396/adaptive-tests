[**adaptive-tests**](../../README.md)

***

[adaptive-tests](../../README.md) / [adaptive](../README.md) / ScoringEngine

# Class: ScoringEngine

Defined in: [adaptive/scoring-engine.d.ts:1](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/scoring-engine.d.ts#L1)

## Constructors

### Constructor

> **new ScoringEngine**(`config?`): `ScoringEngine`

Defined in: [adaptive/scoring-engine.d.ts:2](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/scoring-engine.d.ts#L2)

#### Parameters

##### config?

#### Returns

`ScoringEngine`

## Properties

### compiledScorers

> **compiledScorers**: (\{ `fn`: `any`; `name?`: `undefined`; `type`: `string`; \} \| \{ `fn`: `any`; `name`: `any`; `type`: `string`; \})[]

Defined in: [adaptive/scoring-engine.d.ts:4](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/scoring-engine.d.ts#L4)

***

### config

> **config**: `any`

Defined in: [adaptive/scoring-engine.d.ts:3](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/scoring-engine.d.ts#L3)

## Methods

### calculateScore()

> **calculateScore**(`candidate`, `signature`, `content?`): `number`

Defined in: [adaptive/scoring-engine.d.ts:28](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/scoring-engine.d.ts#L28)

Calculate total score for a candidate

#### Parameters

##### candidate

`any`

##### signature

`any`

##### content?

`null`

#### Returns

`number`

***

### compileScorers()

> **compileScorers**(): (\{ `fn`: `any`; `name?`: `undefined`; `type`: `string`; \} \| \{ `fn`: `any`; `name`: `any`; `type`: `string`; \})[]

Defined in: [adaptive/scoring-engine.d.ts:16](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/scoring-engine.d.ts#L16)

Compile scoring functions for better performance

#### Returns

(\{ `fn`: `any`; `name?`: `undefined`; `type`: `string`; \} \| \{ `fn`: `any`; `name`: `any`; `type`: `string`; \})[]

***

### escapeRegExp()

> **escapeRegExp**(`str`): `string`

Defined in: [adaptive/scoring-engine.d.ts:72](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/scoring-engine.d.ts#L72)

Escape special regex characters

#### Parameters

##### str

`any`

#### Returns

`string`

***

### scoreCustom()

> **scoreCustom**(`candidate`, `signature`, `content`): `number`

Defined in: [adaptive/scoring-engine.d.ts:60](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/scoring-engine.d.ts#L60)

Apply custom scoring functions

#### Parameters

##### candidate

`any`

##### signature

`any`

##### content

`any`

#### Returns

`number`

***

### scoreExportHints()

> **scoreExportHints**(`content`, `signature`): `any`

Defined in: [adaptive/scoring-engine.d.ts:52](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/scoring-engine.d.ts#L52)

Score based on export hints

#### Parameters

##### content

`any`

##### signature

`any`

#### Returns

`any`

***

### scoreExtension()

> **scoreExtension**(`filePath`): `any`

Defined in: [adaptive/scoring-engine.d.ts:36](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/scoring-engine.d.ts#L36)

Score based on file extension

#### Parameters

##### filePath

`any`

#### Returns

`any`

***

### scoreFileName()

> **scoreFileName**(`fileName`, `signature`): `any`

Defined in: [adaptive/scoring-engine.d.ts:40](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/scoring-engine.d.ts#L40)

Score based on file name match

#### Parameters

##### fileName

`any`

##### signature

`any`

#### Returns

`any`

***

### scoreMethodMentions()

> **scoreMethodMentions**(`content`, `methods`): `number`

Defined in: [adaptive/scoring-engine.d.ts:48](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/scoring-engine.d.ts#L48)

Score based on method mentions in content

#### Parameters

##### content

`any`

##### methods

`any`

#### Returns

`number`

***

### scoreMethodValidation()

> **scoreMethodValidation**(`target`, `methods`): `any`

Defined in: [adaptive/scoring-engine.d.ts:68](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/scoring-engine.d.ts#L68)

Score method validation (after module is loaded)

#### Parameters

##### target

`any`

##### methods

`any`

#### Returns

`any`

***

### scoreNameMentions()

> **scoreNameMentions**(`content`, `signature`): `number`

Defined in: [adaptive/scoring-engine.d.ts:56](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/scoring-engine.d.ts#L56)

Score based on name mentions

#### Parameters

##### content

`any`

##### signature

`any`

#### Returns

`number`

***

### scorePath()

> **scorePath**(`filePath`): `number`

Defined in: [adaptive/scoring-engine.d.ts:32](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/scoring-engine.d.ts#L32)

Score based on file path

#### Parameters

##### filePath

`any`

#### Returns

`number`

***

### scoreTargetName()

> **scoreTargetName**(`targetName`, `signature`): `any`

Defined in: [adaptive/scoring-engine.d.ts:64](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/scoring-engine.d.ts#L64)

Score target name match (after module is loaded)

#### Parameters

##### targetName

`any`

##### signature

`any`

#### Returns

`any`

***

### scoreTypeHints()

> **scoreTypeHints**(`content`, `signature`): `any`

Defined in: [adaptive/scoring-engine.d.ts:44](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/scoring-engine.d.ts#L44)

Score based on type hints in content

#### Parameters

##### content

`any`

##### signature

`any`

#### Returns

`any`

***

### updateConfig()

> **updateConfig**(`config`): `void`

Defined in: [adaptive/scoring-engine.d.ts:76](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/scoring-engine.d.ts#L76)

Update configuration

#### Parameters

##### config

`any`

#### Returns

`void`
