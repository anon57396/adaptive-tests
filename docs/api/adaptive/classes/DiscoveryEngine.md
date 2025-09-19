[**adaptive-tests**](../../README.md)

***

[adaptive-tests](../../README.md) / [adaptive](../README.md) / DiscoveryEngine

# Class: DiscoveryEngine

Defined in: [adaptive/discovery-engine.d.ts:1](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L1)

## Extended by

- [`TypeScriptDiscoveryEngine`](TypeScriptDiscoveryEngine.md)

## Constructors

### Constructor

> **new DiscoveryEngine**(`rootPath?`, `config?`): `DiscoveryEngine`

Defined in: [adaptive/discovery-engine.d.ts:2](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L2)

#### Parameters

##### rootPath?

`string`

##### config?

#### Returns

`DiscoveryEngine`

## Properties

### \_tsNodeRegistered

> **\_tsNodeRegistered**: `boolean`

Defined in: [adaptive/discovery-engine.d.ts:213](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L213)

***

### cachedModules

> **cachedModules**: `Set`\<`any`\>

Defined in: [adaptive/discovery-engine.d.ts:10](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L10)

***

### cacheLoaded

> **cacheLoaded**: `boolean`

Defined in: [adaptive/discovery-engine.d.ts:8](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L8)

***

### cacheLoadPromise

> **cacheLoadPromise**: `Promise`\<`void`\>

Defined in: [adaptive/discovery-engine.d.ts:9](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L9)

***

### config

> **config**: `any`

Defined in: [adaptive/discovery-engine.d.ts:4](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L4)

***

### discoveryCache

> **discoveryCache**: `Map`\<`any`, `any`\>

Defined in: [adaptive/discovery-engine.d.ts:6](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L6)

***

### moduleVersions

> **moduleVersions**: `Map`\<`any`, `any`\>

Defined in: [adaptive/discovery-engine.d.ts:11](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L11)

***

### persistentCache

> **persistentCache**: `object`

Defined in: [adaptive/discovery-engine.d.ts:7](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L7)

***

### rootPath

> **rootPath**: `string`

Defined in: [adaptive/discovery-engine.d.ts:3](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L3)

***

### scoringEngine

> **scoringEngine**: [`ScoringEngine`](ScoringEngine.md)

Defined in: [adaptive/discovery-engine.d.ts:5](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L5)

## Methods

### analyzeModuleExports()

> **analyzeModuleExports**(`content`, `fileName`): `object`

Defined in: [adaptive/discovery-engine.d.ts:31](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L31)

#### Parameters

##### content

`any`

##### fileName

`any`

#### Returns

`object`

##### exports

> **exports**: `object`[]

***

### calculateRecencyBonus()

> **calculateRecencyBonus**(`mtimeMs`): `any`

Defined in: [adaptive/discovery-engine.d.ts:188](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L188)

#### Parameters

##### mtimeMs

`any`

#### Returns

`any`

***

### clearCache()

> **clearCache**(): `Promise`\<`void`\>

Defined in: [adaptive/discovery-engine.d.ts:208](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L208)

Clear all caches

#### Returns

`Promise`\<`void`\>

***

### collectCandidates()

> **collectCandidates**(`dir`, `signature`, `depth?`, `candidates?`): `Promise`\<`any`[]\>

Defined in: [adaptive/discovery-engine.d.ts:20](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L20)

Collect all candidates matching the signature

#### Parameters

##### dir

`any`

##### signature

`any`

##### depth?

`number`

##### candidates?

`any`[]

#### Returns

`Promise`\<`any`[]\>

***

### compileFreshModule()

> **compileFreshModule**(`modulePath`): `any`

Defined in: [adaptive/discovery-engine.d.ts:122](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L122)

#### Parameters

##### modulePath

`any`

#### Returns

`any`

***

### createDiscoveryError()

> **createDiscoveryError**(`signature`, `candidates?`): `Error`

Defined in: [adaptive/discovery-engine.d.ts:196](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L196)

Create discovery error with helpful message

#### Parameters

##### signature

`any`

##### candidates?

`any`[]

#### Returns

`Error`

***

### discoverTarget()

> **discoverTarget**(`signature`): `Promise`\<`any`\>

Defined in: [adaptive/discovery-engine.d.ts:16](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L16)

Discover a target module/class/function

#### Parameters

##### signature

`any`

#### Returns

`Promise`\<`any`\>

***

### ensureCacheLoaded()

> **ensureCacheLoaded**(): `Promise`\<`void`\>

Defined in: [adaptive/discovery-engine.d.ts:12](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L12)

#### Returns

`Promise`\<`void`\>

***

### ensureTypeScriptSupport()

> **ensureTypeScriptSupport**(): `void`

Defined in: [adaptive/discovery-engine.d.ts:212](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L212)

Ensure TypeScript support

#### Returns

`void`

***

### evaluateCandidate()

> **evaluateCandidate**(`filePath`, `signature`): `Promise`\<\{ `content`: `string`; `fileName`: `string`; `mtimeMs`: `number`; `path`: `any`; \}\>

Defined in: [adaptive/discovery-engine.d.ts:24](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L24)

Evaluate a file as a potential candidate

#### Parameters

##### filePath

`any`

##### signature

`any`

#### Returns

`Promise`\<\{ `content`: `string`; `fileName`: `string`; `mtimeMs`: `number`; `path`: `any`; \}\>

***

### extractClassInfo()

> **extractClassInfo**(`node`, `fallbackName`): `object`

Defined in: [adaptive/discovery-engine.d.ts:61](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L61)

#### Parameters

##### node

`any`

##### fallbackName

`any`

#### Returns

`object`

##### extends

> **extends**: `any`

##### kind

> **kind**: `string`

##### methods

> **methods**: `Set`\<`any`\>

##### name

> **name**: `any`

##### properties

> **properties**: `Set`\<`any`\>

***

### extractExportByAccess()

> **extractExportByAccess**(`moduleExports`, `access`): `any`

Defined in: [adaptive/discovery-engine.d.ts:95](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L95)

#### Parameters

##### moduleExports

`any`

##### access

`any`

#### Returns

`any`

***

### extractFunctionInfo()

> **extractFunctionInfo**(`node`, `fallbackName`): `object`

Defined in: [adaptive/discovery-engine.d.ts:68](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L68)

#### Parameters

##### node

`any`

##### fallbackName

`any`

#### Returns

`object`

##### extends

> **extends**: `null`

##### kind

> **kind**: `string`

##### methods

> **methods**: `Set`\<`any`\>

##### name

> **name**: `any`

##### properties

> **properties**: `Set`\<`any`\>

***

### extractValueInfo()

> **extractValueInfo**(`node`, `fallbackName`): \{ `extends`: `any`; `kind`: `string`; `methods`: `Set`\<`any`\>; `name`: `any`; `properties`: `Set`\<`any`\>; \} \| \{ `extends`: `null`; `kind`: `string`; `methods`: `never`[]; `name`: `any`; `properties`: `never`[]; \}

Defined in: [adaptive/discovery-engine.d.ts:75](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L75)

#### Parameters

##### node

`any`

##### fallbackName

`any`

#### Returns

\{ `extends`: `any`; `kind`: `string`; `methods`: `Set`\<`any`\>; `name`: `any`; `properties`: `Set`\<`any`\>; \} \| \{ `extends`: `null`; `kind`: `string`; `methods`: `never`[]; `name`: `any`; `properties`: `never`[]; \}

***

### getCacheKey()

> **getCacheKey**(`signature`): `string`

Defined in: [adaptive/discovery-engine.d.ts:186](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L186)

Get cache key for signature

#### Parameters

##### signature

`any`

#### Returns

`string`

***

### getMemberName()

> **getMemberName**(`node`): `any`

Defined in: [adaptive/discovery-engine.d.ts:90](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L90)

#### Parameters

##### node

`any`

#### Returns

`any`

***

### getSpecifierName()

> **getSpecifierName**(`node`): `any`

Defined in: [adaptive/discovery-engine.d.ts:91](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L91)

#### Parameters

##### node

`any`

#### Returns

`any`

***

### getTargetName()

> **getTargetName**(`target`): `any`

Defined in: [adaptive/discovery-engine.d.ts:174](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L174)

Get target name

#### Parameters

##### target

`any`

#### Returns

`any`

***

### isCandidateSafe()

> **isCandidateSafe**(`candidate`): `boolean`

Defined in: [adaptive/discovery-engine.d.ts:30](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L30)

#### Parameters

##### candidate

`any`

#### Returns

`boolean`

***

### isExportsMember()

> **isExportsMember**(`node`): `any`

Defined in: [adaptive/discovery-engine.d.ts:89](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L89)

#### Parameters

##### node

`any`

#### Returns

`any`

***

### isModuleExports()

> **isModuleExports**(`node`): `any`

Defined in: [adaptive/discovery-engine.d.ts:88](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L88)

#### Parameters

##### node

`any`

#### Returns

`any`

***

### loadCache()

> **loadCache**(): `Promise`\<`void`\>

Defined in: [adaptive/discovery-engine.d.ts:200](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L200)

Load cache from disk

#### Returns

`Promise`\<`void`\>

***

### loadModule()

> **loadModule**(`cacheEntry`, `signature`): `any`

Defined in: [adaptive/discovery-engine.d.ts:192](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L192)

Load module from cache entry

#### Parameters

##### cacheEntry

`any`

##### signature

`any`

#### Returns

`any`

***

### makeUnknownInfo()

> **makeUnknownInfo**(`name`): `object`

Defined in: [adaptive/discovery-engine.d.ts:54](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L54)

#### Parameters

##### name

`any`

#### Returns

`object`

##### extends

> **extends**: `null`

##### kind

> **kind**: `string`

##### methods

> **methods**: `never`[]

##### name

> **name**: `any`

##### properties

> **properties**: `never`[]

***

### matchesSignatureMetadata()

> **matchesSignatureMetadata**(`entry`, `signature`): `boolean`

Defined in: [adaptive/discovery-engine.d.ts:94](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L94)

#### Parameters

##### entry

`any`

##### signature

`any`

#### Returns

`boolean`

***

### normalizeExportInfo()

> **normalizeExportInfo**(`info`): `object`

Defined in: [adaptive/discovery-engine.d.ts:47](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L47)

#### Parameters

##### info

`any`

#### Returns

`object`

##### extends

> **extends**: `any`

##### kind

> **kind**: `any`

##### methods

> **methods**: `any`[]

##### name

> **name**: `any`

##### properties

> **properties**: `any`[]

***

### normalizeSignature()

> **normalizeSignature**(`signature`): `any`

Defined in: [adaptive/discovery-engine.d.ts:182](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L182)

Normalize signature

#### Parameters

##### signature

`any`

#### Returns

`any`

***

### quickNameCheck()

> **quickNameCheck**(`fileName`, `signature`): `boolean`

Defined in: [adaptive/discovery-engine.d.ts:100](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L100)

Quick check if file name could match signature

#### Parameters

##### fileName

`any`

##### signature

`any`

#### Returns

`boolean`

***

### resolveExpressionName()

> **resolveExpressionName**(`node`): `any`

Defined in: [adaptive/discovery-engine.d.ts:92](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L92)

#### Parameters

##### node

`any`

#### Returns

`any`

***

### resolveTargetFromModule()

> **resolveTargetFromModule**(`moduleExports`, `signature`, `candidate`): \{ `access`: \{ `name?`: `undefined`; `type`: `string`; \}; `score`: `number`; `target`: `any`; \} \| \{ `access`: \{ `name`: `string`; `type`: `string`; \}; `score`: `number`; `target`: `any`; \}

Defined in: [adaptive/discovery-engine.d.ts:126](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L126)

Resolve target from module exports

#### Parameters

##### moduleExports

`any`

##### signature

`any`

##### candidate

`any`

#### Returns

\{ `access`: \{ `name?`: `undefined`; `type`: `string`; \}; `score`: `number`; `target`: `any`; \} \| \{ `access`: \{ `name`: `string`; `type`: `string`; \}; `score`: `number`; `target`: `any`; \}

***

### saveCache()

> **saveCache**(): `Promise`\<`void`\>

Defined in: [adaptive/discovery-engine.d.ts:204](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L204)

Save cache to disk

#### Returns

`Promise`\<`void`\>

***

### selectExportFromMetadata()

> **selectExportFromMetadata**(`candidate`, `signature`): `any`

Defined in: [adaptive/discovery-engine.d.ts:93](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L93)

#### Parameters

##### candidate

`any`

##### signature

`any`

#### Returns

`any`

***

### serializeCacheValue()

> **serializeCacheValue**(`value`): `any`

Defined in: [adaptive/discovery-engine.d.ts:187](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L187)

#### Parameters

##### value

`any`

#### Returns

`any`

***

### shouldSkipDirectory()

> **shouldSkipDirectory**(`dirName`): `any`

Defined in: [adaptive/discovery-engine.d.ts:178](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L178)

Should skip directory

#### Parameters

##### dirName

`any`

#### Returns

`any`

***

### tokenizeName()

> **tokenizeName**(`name`): `any`

Defined in: [adaptive/discovery-engine.d.ts:96](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L96)

#### Parameters

##### name

`any`

#### Returns

`any`

***

### tryResolveCandidate()

> **tryResolveCandidate**(`candidate`, `signature`): `Promise`\<\{ `access`: \{ `name?`: `undefined`; `type`: `string`; \}; `score`: `number`; `target`: `any`; \} \| \{ `access`: \{ `name`: `string`; `type`: `string`; \}; `score`: `number`; `target`: `any`; \} \| \{ `access`: `any`; `target`: `any`; \}\>

Defined in: [adaptive/discovery-engine.d.ts:104](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L104)

Try to resolve a candidate by loading and validating it

#### Parameters

##### candidate

`any`

##### signature

`any`

#### Returns

`Promise`\<\{ `access`: \{ `name?`: `undefined`; `type`: `string`; \}; `score`: `number`; `target`: `any`; \} \| \{ `access`: \{ `name`: `string`; `type`: `string`; \}; `score`: `number`; `target`: `any`; \} \| \{ `access`: `any`; `target`: `any`; \}\>

***

### validateInheritance()

> **validateInheritance**(`target`, `baseClass`): `boolean`

Defined in: [adaptive/discovery-engine.d.ts:166](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L166)

Validate inheritance chain (NEW!)

#### Parameters

##### target

`any`

##### baseClass

`any`

#### Returns

`boolean`

***

### validateInstanceOf()

> **validateInstanceOf**(`target`, `expectedClass`): `boolean`

Defined in: [adaptive/discovery-engine.d.ts:170](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L170)

Validate instanceof (NEW!)

#### Parameters

##### target

`any`

##### expectedClass

`any`

#### Returns

`boolean`

***

### validateMethods()

> **validateMethods**(`target`, `methods`): `number`

Defined in: [adaptive/discovery-engine.d.ts:158](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L158)

Validate methods exist

#### Parameters

##### target

`any`

##### methods

`any`

#### Returns

`number`

***

### validateName()

> **validateName**(`targetName`, `expectedName`): `boolean`

Defined in: [adaptive/discovery-engine.d.ts:154](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L154)

Validate name

#### Parameters

##### targetName

`any`

##### expectedName

`any`

#### Returns

`boolean`

***

### validateProperties()

> **validateProperties**(`target`, `properties`): `number`

Defined in: [adaptive/discovery-engine.d.ts:162](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L162)

Validate properties exist (NEW!)

#### Parameters

##### target

`any`

##### properties

`any`

#### Returns

`number`

***

### validateTarget()

> **validateTarget**(`target`, `signature`): `object`

Defined in: [adaptive/discovery-engine.d.ts:144](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L144)

Validate that a target matches the signature requirements

#### Parameters

##### target

`any`

##### signature

`any`

#### Returns

`object`

##### score

> **score**: `number`

***

### validateType()

> **validateType**(`target`, `expectedType`): `any`

Defined in: [adaptive/discovery-engine.d.ts:150](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L150)

Validate type

#### Parameters

##### target

`any`

##### expectedType

`any`

#### Returns

`any`
