[**adaptive-tests**](../../README.md)

***

[adaptive-tests](../../README.md) / [index](../README.md) / export=

# Variable: export=

> `const` **export=**: `object`

Defined in: [index.d.ts:1](https://github.com/anon57396/adaptive-tests/blob/main/types/index.d.ts#L1)

## Type Declaration

### adaptiveTest

> **adaptiveTest**: *typeof* [`adaptiveTest`](../../adaptive/functions/adaptiveTest.md)

### AdaptiveTest

> **AdaptiveTest**: *typeof* [`AdaptiveTest`](../../adaptive/classes/AdaptiveTest.md)

### ConfigLoader

> **ConfigLoader**: *typeof* [`ConfigLoader`](../../adaptive/classes/ConfigLoader.md)

### DEFAULT\_CONFIG

> **DEFAULT\_CONFIG**: `object`

#### DEFAULT\_CONFIG.discovery

> **discovery**: `object`

#### DEFAULT\_CONFIG.discovery.cache

> **cache**: `object`

#### DEFAULT\_CONFIG.discovery.cache.enabled

> **enabled**: `boolean`

#### DEFAULT\_CONFIG.discovery.cache.file

> **file**: `string`

#### DEFAULT\_CONFIG.discovery.cache.ttl

> **ttl**: `null`

#### DEFAULT\_CONFIG.discovery.extensions

> **extensions**: `string`[]

#### DEFAULT\_CONFIG.discovery.maxDepth

> **maxDepth**: `number`

#### DEFAULT\_CONFIG.discovery.scoring

> **scoring**: `object`

#### DEFAULT\_CONFIG.discovery.scoring.custom

> **custom**: `never`[]

#### DEFAULT\_CONFIG.discovery.scoring.exports

> **exports**: `object`

#### DEFAULT\_CONFIG.discovery.scoring.exports.defaultExport

> **defaultExport**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.exports.moduleExports

> **moduleExports**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.exports.namedExport

> **namedExport**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.extensions

> **extensions**: `object`

#### DEFAULT\_CONFIG.discovery.scoring.extensions..cjs

> **.cjs**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.extensions..js

> **.js**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.extensions..mjs

> **.mjs**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.extensions..ts

> **.ts**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.extensions..tsx

> **.tsx**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.fileName

> **fileName**: `object`

#### DEFAULT\_CONFIG.discovery.scoring.fileName.caseInsensitive

> **caseInsensitive**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.fileName.exactMatch

> **exactMatch**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.fileName.partialMatch

> **partialMatch**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.fileName.regexMatch

> **regexMatch**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.methods

> **methods**: `object`

#### DEFAULT\_CONFIG.discovery.scoring.methods.maxMentions

> **maxMentions**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.methods.perMention

> **perMention**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.minCandidateScore

> **minCandidateScore**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.names

> **names**: `object`

#### DEFAULT\_CONFIG.discovery.scoring.names.maxMentions

> **maxMentions**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.names.perMention

> **perMention**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.paths

> **paths**: `object`

#### DEFAULT\_CONFIG.discovery.scoring.paths.negative

> **negative**: `object`

#### DEFAULT\_CONFIG.discovery.scoring.paths.negative./\_\_mocks\_\_/

> **/\_\_mocks\_\_/**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.paths.negative./\_\_tests\_\_/

> **/\_\_tests\_\_/**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.paths.negative./broken

> **/broken**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.paths.negative./deprecated/

> **/deprecated/**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.paths.negative./fake

> **/fake**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.paths.negative./fixture

> **/fixture**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.paths.negative./fixtures/

> **/fixtures/**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.paths.negative./mock

> **/mock**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.paths.negative./mocks/

> **/mocks/**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.paths.negative./sandbox/

> **/sandbox/**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.paths.negative./spec/

> **/spec/**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.paths.negative./stub

> **/stub**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.paths.negative./temp/

> **/temp/**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.paths.negative./test/

> **/test/**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.paths.negative./tests/

> **/tests/**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.paths.negative./tmp/

> **/tmp/**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.paths.positive

> **positive**: `object`

#### DEFAULT\_CONFIG.discovery.scoring.paths.positive./app/

> **/app/**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.paths.positive./core/

> **/core/**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.paths.positive./lib/

> **/lib/**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.paths.positive./src/

> **/src/**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.recency

> **recency**: `object`

#### DEFAULT\_CONFIG.discovery.scoring.recency.halfLifeHours

> **halfLifeHours**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.recency.maxBonus

> **maxBonus**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.target

> **target**: `object`

#### DEFAULT\_CONFIG.discovery.scoring.target.exactName

> **exactName**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.typeHints

> **typeHints**: `object`

#### DEFAULT\_CONFIG.discovery.scoring.typeHints.class

> **class**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.typeHints.function

> **function**: `number`

#### DEFAULT\_CONFIG.discovery.scoring.typeHints.module

> **module**: `number`

#### DEFAULT\_CONFIG.discovery.security

> **security**: `object`

#### DEFAULT\_CONFIG.discovery.security.allowUnsafeRequires

> **allowUnsafeRequires**: `boolean`

#### DEFAULT\_CONFIG.discovery.security.blockedTokens

> **blockedTokens**: `string`[]

#### DEFAULT\_CONFIG.discovery.skipDirectories

> **skipDirectories**: `string`[]

### discover

> **discover**: *typeof* [`discover`](../../adaptive/functions/discover.md)

### DiscoveryEngine

> **DiscoveryEngine**: *typeof* [`DiscoveryEngine`](../../adaptive/classes/DiscoveryEngine.md)

### getDiscoveryEngine

> **getDiscoveryEngine**: *typeof* [`getDiscoveryEngine`](../../adaptive/functions/getDiscoveryEngine.md)

### getLegacyEngine

> **getLegacyEngine**: *typeof* `getLegacyEngine`

### getTypeScriptDiscoveryEngine

> **getTypeScriptDiscoveryEngine**: *typeof* [`getTypeScriptDiscoveryEngine`](../../adaptive/functions/getTypeScriptDiscoveryEngine.md)

### LegacyDiscoveryEngine

> **LegacyDiscoveryEngine**: *typeof* [`DiscoveryEngine`](../../adaptive/classes/DiscoveryEngine.md)

### ScoringEngine

> **ScoringEngine**: *typeof* [`ScoringEngine`](../../adaptive/classes/ScoringEngine.md)

### TypeScriptDiscoveryEngine

> **TypeScriptDiscoveryEngine**: *typeof* [`TypeScriptDiscoveryEngine`](../../adaptive/classes/TypeScriptDiscoveryEngine.md)
