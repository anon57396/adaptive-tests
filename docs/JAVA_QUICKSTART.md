# Java Quick Start

Adaptive Tests now ships with a zero-runtime discovery engine and scaffolding workflow for Java codebases. This guide walks through the supported tooling and recommended setup.

## Requirements

- Node.js 18+
- Java 17+
- Maven 3.9+ (for building the native Java CLI)

## Scaffolding JUnit Tests from Node.js

The Java bridge is integrated into the primary CLI. Given a `.java` source file, the scaffolder analyses the AST and emits a JUnit 5 shell in the appropriate test directory.

```bash
# From the repository root
npx adaptive-tests scaffold examples/java/src/main/java/com/example/calculator/Calculator.java
```

By default the generated test lands in `src/test/java` and mirrors the package of the production class. Methods discovered in the source file produce individual `@Test` blocks, seeded with sensible assertion placeholders.

You can scaffold multiple Java targets at once:

```bash
npx adaptive-tests scaffold "src/main/java/**/*.java" --all-exports
```

CLI flags such as `--output-dir`, `--all-exports`, and `--force` behave the same way they do for JavaScript/TypeScript targets.

## Native Java CLI

A Maven multi-module project lives under `packages/adaptive-tests-java/` and provides a pure-Java command line for teams that prefer JVM tooling.

```bash
cd packages/adaptive-tests-java
./mvnw -pl core test
./mvnw -pl cli -am package

# Discover a class by signature
java -jar cli/target/adaptive-tests-java-cli-0.1.0-SNAPSHOT-shaded.jar   discover --root /path/to/project --name CustomerService --method findActiveUsers
```

Both the Node CLI and the Java CLI share the same discovery heuristics and caching logic.

## Configuration

Discovery can be tuned via `adaptive-tests.config.json` or `.adaptive-tests-java.json` at the project root:

```json
{
  "discovery": {
    "extensions": [".java"],
    "skipDirectories": [".git", "target", "build"],
    "skipFiles": ["Test.java", "IT.java"],
    "cacheFile": ".adaptive-tests-cache.json"
  }
}
```

The configuration mirrors the JavaScript engine — overrides cascade across Node and Java workflows.

## Current Coverage

- Classes, interfaces, enums, and records
- Method signatures with parameter/annotation metadata
- Package-aware scoring (prefers `src/main/java`, records annotations, honours inheritance)
- JUnit 5 scaffolding with automatic placement under `src/test/java`

## Known Limitations

- Nested classes are discoverable, but the scaffolder defaults to top-level types when multiple are present in the same file.
- Dependency wiring inside generated tests is intentionally minimal; TODO comments highlight where to provide fakes or fixtures.
- Gradle project autodetection falls back to `src/test/java` if the source lives outside `src/main/java`.

We ship the Java bridge as an early preview — feedback and issues are welcome while we drive parity with the mature JavaScript and PHP integrations.
