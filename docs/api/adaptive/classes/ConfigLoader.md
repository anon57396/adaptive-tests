[**adaptive-tests**](../../README.md)

***

[adaptive-tests](../../README.md) / [adaptive](../README.md) / ConfigLoader

# Class: ConfigLoader

Defined in: [adaptive/config-loader.d.ts:1](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/config-loader.d.ts#L1)

## Constructors

### Constructor

> **new ConfigLoader**(`rootPath?`): `ConfigLoader`

Defined in: [adaptive/config-loader.d.ts:89](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/config-loader.d.ts#L89)

#### Parameters

##### rootPath?

`string`

#### Returns

`ConfigLoader`

## Properties

### config

> **config**: `any`

Defined in: [adaptive/config-loader.d.ts:91](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/config-loader.d.ts#L91)

***

### rootPath

> **rootPath**: `string`

Defined in: [adaptive/config-loader.d.ts:90](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/config-loader.d.ts#L90)

## Methods

### clearCache()

> **clearCache**(): `void`

Defined in: [adaptive/config-loader.d.ts:125](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/config-loader.d.ts#L125)

Clear cached configuration

#### Returns

`void`

***

### deepClone()

> **deepClone**(`obj`): `any`

Defined in: [adaptive/config-loader.d.ts:117](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/config-loader.d.ts#L117)

Deep clone an object

#### Parameters

##### obj

`any`

#### Returns

`any`

***

### deepMerge()

> **deepMerge**(`target`, `source`): `any`

Defined in: [adaptive/config-loader.d.ts:121](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/config-loader.d.ts#L121)

Deep merge two objects

#### Parameters

##### target

`any`

##### source

`any`

#### Returns

`any`

***

### load()

> **load**(`inlineConfig?`): `object`

Defined in: [adaptive/config-loader.d.ts:97](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/config-loader.d.ts#L97)

Load configuration from all sources and merge

#### Parameters

##### inlineConfig?

`object`

Configuration passed directly

#### Returns

`object`

Merged configuration

***

### loadFromJsFile()

> **loadFromJsFile**(): `any`

Defined in: [adaptive/config-loader.d.ts:109](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/config-loader.d.ts#L109)

Load config from adaptive-tests.config.js

#### Returns

`any`

***

### loadFromJsonFile()

> **loadFromJsonFile**(): `any`

Defined in: [adaptive/config-loader.d.ts:105](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/config-loader.d.ts#L105)

Load config from .adaptive-testsrc.json

#### Returns

`any`

***

### loadFromPackageJson()

> **loadFromPackageJson**(): `any`

Defined in: [adaptive/config-loader.d.ts:101](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/config-loader.d.ts#L101)

Load config from package.json

#### Returns

`any`

***

### validateConfig()

> **validateConfig**(`config`): `any`

Defined in: [adaptive/config-loader.d.ts:113](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/config-loader.d.ts#L113)

Validate configuration

#### Parameters

##### config

`any`

#### Returns

`any`

***

### getDefaultConfig()

> `static` **getDefaultConfig**(): `object`

Defined in: [adaptive/config-loader.d.ts:5](https://github.com/anon57396/adaptive-tests/blob/main/types/adaptive/config-loader.d.ts#L5)

Get the default configuration

#### Returns

`object`

##### discovery

> **discovery**: `object`

###### discovery.cache

> **cache**: `object`

###### discovery.cache.enabled

> **enabled**: `boolean`

###### discovery.cache.file

> **file**: `string`

###### discovery.cache.ttl

> **ttl**: `null`

###### discovery.extensions

> **extensions**: `string`[]

###### discovery.maxDepth

> **maxDepth**: `number`

###### discovery.scoring

> **scoring**: `object`

###### discovery.scoring.custom

> **custom**: `never`[]

###### discovery.scoring.exports

> **exports**: `object`

###### discovery.scoring.exports.defaultExport

> **defaultExport**: `number`

###### discovery.scoring.exports.moduleExports

> **moduleExports**: `number`

###### discovery.scoring.exports.namedExport

> **namedExport**: `number`

###### discovery.scoring.extensions

> **extensions**: `object`

###### discovery.scoring.extensions..cjs

> **.cjs**: `number`

###### discovery.scoring.extensions..js

> **.js**: `number`

###### discovery.scoring.extensions..mjs

> **.mjs**: `number`

###### discovery.scoring.extensions..ts

> **.ts**: `number`

###### discovery.scoring.extensions..tsx

> **.tsx**: `number`

###### discovery.scoring.fileName

> **fileName**: `object`

###### discovery.scoring.fileName.caseInsensitive

> **caseInsensitive**: `number`

###### discovery.scoring.fileName.exactMatch

> **exactMatch**: `number`

###### discovery.scoring.fileName.partialMatch

> **partialMatch**: `number`

###### discovery.scoring.fileName.regexMatch

> **regexMatch**: `number`

###### discovery.scoring.methods

> **methods**: `object`

###### discovery.scoring.methods.maxMentions

> **maxMentions**: `number`

###### discovery.scoring.methods.perMention

> **perMention**: `number`

###### discovery.scoring.minCandidateScore

> **minCandidateScore**: `number`

###### discovery.scoring.names

> **names**: `object`

###### discovery.scoring.names.maxMentions

> **maxMentions**: `number`

###### discovery.scoring.names.perMention

> **perMention**: `number`

###### discovery.scoring.paths

> **paths**: `object`

###### discovery.scoring.paths.negative

> **negative**: `object`

###### discovery.scoring.paths.negative./\_\_mocks\_\_/

> **/\_\_mocks\_\_/**: `number`

###### discovery.scoring.paths.negative./\_\_tests\_\_/

> **/\_\_tests\_\_/**: `number`

###### discovery.scoring.paths.negative./broken

> **/broken**: `number`

###### discovery.scoring.paths.negative./deprecated/

> **/deprecated/**: `number`

###### discovery.scoring.paths.negative./fake

> **/fake**: `number`

###### discovery.scoring.paths.negative./fixture

> **/fixture**: `number`

###### discovery.scoring.paths.negative./fixtures/

> **/fixtures/**: `number`

###### discovery.scoring.paths.negative./mock

> **/mock**: `number`

###### discovery.scoring.paths.negative./mocks/

> **/mocks/**: `number`

###### discovery.scoring.paths.negative./sandbox/

> **/sandbox/**: `number`

###### discovery.scoring.paths.negative./spec/

> **/spec/**: `number`

###### discovery.scoring.paths.negative./stub

> **/stub**: `number`

###### discovery.scoring.paths.negative./temp/

> **/temp/**: `number`

###### discovery.scoring.paths.negative./test/

> **/test/**: `number`

###### discovery.scoring.paths.negative./tests/

> **/tests/**: `number`

###### discovery.scoring.paths.negative./tmp/

> **/tmp/**: `number`

###### discovery.scoring.paths.positive

> **positive**: `object`

###### discovery.scoring.paths.positive./app/

> **/app/**: `number`

###### discovery.scoring.paths.positive./core/

> **/core/**: `number`

###### discovery.scoring.paths.positive./lib/

> **/lib/**: `number`

###### discovery.scoring.paths.positive./src/

> **/src/**: `number`

###### discovery.scoring.recency

> **recency**: `object`

###### discovery.scoring.recency.halfLifeHours

> **halfLifeHours**: `number`

###### discovery.scoring.recency.maxBonus

> **maxBonus**: `number`

###### discovery.scoring.target

> **target**: `object`

###### discovery.scoring.target.exactName

> **exactName**: `number`

###### discovery.scoring.typeHints

> **typeHints**: `object`

###### discovery.scoring.typeHints.class

> **class**: `number`

###### discovery.scoring.typeHints.function

> **function**: `number`

###### discovery.scoring.typeHints.module

> **module**: `number`

###### discovery.security

> **security**: `object`

###### discovery.security.allowUnsafeRequires

> **allowUnsafeRequires**: `boolean`

###### discovery.security.blockedTokens

> **blockedTokens**: `string`[]

###### discovery.skipDirectories

> **skipDirectories**: `string`[]
