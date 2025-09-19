[**adaptive-tests**](../../README.md)

***

[adaptive-tests](../../README.md) / [adaptive](../README.md) / TypeScriptDiscoveryEngine

# Class: TypeScriptDiscoveryEngine

Defined in: [adaptive/typescript/discovery.d.ts:8](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/typescript/discovery.d.ts#L8)

An extension of the DiscoveryEngine that understands TypeScript files.

## Extends

- [`DiscoveryEngine`](DiscoveryEngine.md)

## Constructors

### Constructor

> **new TypeScriptDiscoveryEngine**(`rootPath?`, `options?`): `TypeScriptDiscoveryEngine`

Defined in: [adaptive/typescript/discovery.d.ts:13](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/typescript/discovery.d.ts#L13)

#### Parameters

##### rootPath?

`string`

The root directory to start scanning from.

##### options?

`any`

Configuration options for the engine.

#### Returns

`TypeScriptDiscoveryEngine`

#### Overrides

[`DiscoveryEngine`](DiscoveryEngine.md).[`constructor`](DiscoveryEngine.md#constructor)

## Properties

### \_tsNodeRegistered

> **\_tsNodeRegistered**: `boolean`

Defined in: [adaptive/discovery-engine.d.ts:213](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L213)

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`_tsNodeRegistered`](DiscoveryEngine.md#_tsnoderegistered)

***

### cachedModules

> **cachedModules**: `Set`\<`any`\>

Defined in: [adaptive/discovery-engine.d.ts:10](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L10)

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`cachedModules`](DiscoveryEngine.md#cachedmodules)

***

### cacheLoaded

> **cacheLoaded**: `boolean`

Defined in: [adaptive/discovery-engine.d.ts:8](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L8)

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`cacheLoaded`](DiscoveryEngine.md#cacheloaded)

***

### cacheLoadPromise

> **cacheLoadPromise**: `Promise`\<`void`\>

Defined in: [adaptive/discovery-engine.d.ts:9](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L9)

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`cacheLoadPromise`](DiscoveryEngine.md#cacheloadpromise)

***

### config

> **config**: `any`

Defined in: [adaptive/discovery-engine.d.ts:4](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L4)

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`config`](DiscoveryEngine.md#config)

***

### discoveryCache

> **discoveryCache**: `Map`\<`any`, `any`\>

Defined in: [adaptive/discovery-engine.d.ts:6](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L6)

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`discoveryCache`](DiscoveryEngine.md#discoverycache)

***

### moduleVersions

> **moduleVersions**: `Map`\<`any`, `any`\>

Defined in: [adaptive/discovery-engine.d.ts:11](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L11)

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`moduleVersions`](DiscoveryEngine.md#moduleversions)

***

### persistentCache

> **persistentCache**: `object`

Defined in: [adaptive/discovery-engine.d.ts:7](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L7)

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`persistentCache`](DiscoveryEngine.md#persistentcache)

***

### rootPath

> **rootPath**: `string`

Defined in: [adaptive/discovery-engine.d.ts:3](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L3)

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`rootPath`](DiscoveryEngine.md#rootpath)

***

### scoringEngine

> **scoringEngine**: [`ScoringEngine`](ScoringEngine.md)

Defined in: [adaptive/discovery-engine.d.ts:5](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L5)

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`scoringEngine`](DiscoveryEngine.md#scoringengine)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`analyzeModuleExports`](DiscoveryEngine.md#analyzemoduleexports)

***

### calculateRecencyBonus()

> **calculateRecencyBonus**(`mtimeMs`): `any`

Defined in: [adaptive/discovery-engine.d.ts:188](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L188)

#### Parameters

##### mtimeMs

`any`

#### Returns

`any`

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`calculateRecencyBonus`](DiscoveryEngine.md#calculaterecencybonus)

***

### clearCache()

> **clearCache**(): `Promise`\<`void`\>

Defined in: [adaptive/discovery-engine.d.ts:208](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L208)

Clear all caches

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`clearCache`](DiscoveryEngine.md#clearcache)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`collectCandidates`](DiscoveryEngine.md#collectcandidates)

***

### compileFreshModule()

> **compileFreshModule**(`modulePath`): `any`

Defined in: [adaptive/discovery-engine.d.ts:122](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L122)

#### Parameters

##### modulePath

`any`

#### Returns

`any`

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`compileFreshModule`](DiscoveryEngine.md#compilefreshmodule)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`createDiscoveryError`](DiscoveryEngine.md#creatediscoveryerror)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`discoverTarget`](DiscoveryEngine.md#discovertarget)

***

### ensureCacheLoaded()

> **ensureCacheLoaded**(): `Promise`\<`void`\>

Defined in: [adaptive/discovery-engine.d.ts:12](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L12)

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`ensureCacheLoaded`](DiscoveryEngine.md#ensurecacheloaded)

***

### ensureTypeScriptSupport()

> **ensureTypeScriptSupport**(): `void`

Defined in: [adaptive/discovery-engine.d.ts:212](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L212)

Ensure TypeScript support

#### Returns

`void`

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`ensureTypeScriptSupport`](DiscoveryEngine.md#ensuretypescriptsupport)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`evaluateCandidate`](DiscoveryEngine.md#evaluatecandidate)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`extractClassInfo`](DiscoveryEngine.md#extractclassinfo)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`extractExportByAccess`](DiscoveryEngine.md#extractexportbyaccess)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`extractFunctionInfo`](DiscoveryEngine.md#extractfunctioninfo)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`extractValueInfo`](DiscoveryEngine.md#extractvalueinfo)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`getCacheKey`](DiscoveryEngine.md#getcachekey)

***

### getMemberName()

> **getMemberName**(`node`): `any`

Defined in: [adaptive/discovery-engine.d.ts:90](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L90)

#### Parameters

##### node

`any`

#### Returns

`any`

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`getMemberName`](DiscoveryEngine.md#getmembername)

***

### getSpecifierName()

> **getSpecifierName**(`node`): `any`

Defined in: [adaptive/discovery-engine.d.ts:91](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L91)

#### Parameters

##### node

`any`

#### Returns

`any`

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`getSpecifierName`](DiscoveryEngine.md#getspecifiername)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`getTargetName`](DiscoveryEngine.md#gettargetname)

***

### isCandidateSafe()

> **isCandidateSafe**(`candidate`): `boolean`

Defined in: [adaptive/discovery-engine.d.ts:30](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L30)

#### Parameters

##### candidate

`any`

#### Returns

`boolean`

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`isCandidateSafe`](DiscoveryEngine.md#iscandidatesafe)

***

### isExportsMember()

> **isExportsMember**(`node`): `any`

Defined in: [adaptive/discovery-engine.d.ts:89](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L89)

#### Parameters

##### node

`any`

#### Returns

`any`

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`isExportsMember`](DiscoveryEngine.md#isexportsmember)

***

### isModuleExports()

> **isModuleExports**(`node`): `any`

Defined in: [adaptive/discovery-engine.d.ts:88](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L88)

#### Parameters

##### node

`any`

#### Returns

`any`

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`isModuleExports`](DiscoveryEngine.md#ismoduleexports)

***

### loadCache()

> **loadCache**(): `Promise`\<`void`\>

Defined in: [adaptive/discovery-engine.d.ts:200](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L200)

Load cache from disk

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`loadCache`](DiscoveryEngine.md#loadcache)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`loadModule`](DiscoveryEngine.md#loadmodule)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`makeUnknownInfo`](DiscoveryEngine.md#makeunknowninfo)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`matchesSignatureMetadata`](DiscoveryEngine.md#matchessignaturemetadata)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`normalizeExportInfo`](DiscoveryEngine.md#normalizeexportinfo)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`normalizeSignature`](DiscoveryEngine.md#normalizesignature)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`quickNameCheck`](DiscoveryEngine.md#quicknamecheck)

***

### resolveExpressionName()

> **resolveExpressionName**(`node`): `any`

Defined in: [adaptive/discovery-engine.d.ts:92](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L92)

#### Parameters

##### node

`any`

#### Returns

`any`

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`resolveExpressionName`](DiscoveryEngine.md#resolveexpressionname)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`resolveTargetFromModule`](DiscoveryEngine.md#resolvetargetfrommodule)

***

### saveCache()

> **saveCache**(): `Promise`\<`void`\>

Defined in: [adaptive/discovery-engine.d.ts:204](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L204)

Save cache to disk

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`saveCache`](DiscoveryEngine.md#savecache)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`selectExportFromMetadata`](DiscoveryEngine.md#selectexportfrommetadata)

***

### serializeCacheValue()

> **serializeCacheValue**(`value`): `any`

Defined in: [adaptive/discovery-engine.d.ts:187](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L187)

#### Parameters

##### value

`any`

#### Returns

`any`

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`serializeCacheValue`](DiscoveryEngine.md#serializecachevalue)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`shouldSkipDirectory`](DiscoveryEngine.md#shouldskipdirectory)

***

### tokenizeName()

> **tokenizeName**(`name`): `any`

Defined in: [adaptive/discovery-engine.d.ts:96](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/discovery-engine.d.ts#L96)

#### Parameters

##### name

`any`

#### Returns

`any`

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`tokenizeName`](DiscoveryEngine.md#tokenizename)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`tryResolveCandidate`](DiscoveryEngine.md#tryresolvecandidate)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`validateInheritance`](DiscoveryEngine.md#validateinheritance)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`validateInstanceOf`](DiscoveryEngine.md#validateinstanceof)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`validateMethods`](DiscoveryEngine.md#validatemethods)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`validateName`](DiscoveryEngine.md#validatename)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`validateProperties`](DiscoveryEngine.md#validateproperties)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`validateTarget`](DiscoveryEngine.md#validatetarget)

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

#### Inherited from

[`DiscoveryEngine`](DiscoveryEngine.md).[`validateType`](DiscoveryEngine.md#validatetype)
