# Java Quick Start

> Adaptive Tests for Java is currently experimental (`0.1.0-SNAPSHOT`). Expect rapid iteration while we close parity gaps.

## Installation

Clone this repository and build the Java modules:

```bash
cd packages/adaptive-tests-java
./mvnw -pl core test     # verify engine
./mvnw -pl cli -am package
```

The CLI shaded JAR lives at `packages/adaptive-tests-java/cli/target/adaptive-tests-java-cli-0.1.0-SNAPSHOT-shaded.jar`.

## Discovering a Class

```bash
java -jar adaptive-tests-java-cli-0.1.0-SNAPSHOT-shaded.jar \
  discover --root /path/to/project \
  --name OrderService \
  --method create --method cancel
```

## Scaffolding a JUnit Test

```bash
java -jar adaptive-tests-java-cli-0.1.0-SNAPSHOT-shaded.jar \
  scaffold src/main/java/com/example/OrderService.java \
  --tests-dir src/test/java/com/example/order
```

This generates a JUnit 5 placeholder that uses the adaptive discovery engine to locate `OrderService` at runtime.

## Configuration

Place configuration in `adaptive-tests.config.json` or `.adaptive-tests-java.json` at your project root. Example:

```json
{
  "discovery": {
    "extensions": [".java"],
    "skipDirectories": [".git", "target", "build"],
    "skipFiles": ["Test.java"],
    "cacheFile": ".adaptive-tests-cache.json"
  }
}
```

Pyproject-style configuration and Maven/Gradle plugins are planned (see `docs/INTERNAL_EXECUTION_PLAN.md`).

## Current Limitations

- Class loading currently relies on the application being built (`target/classes` on the classpath). Future work will add pluggable classpath detection.
- Only top-level classes and interfaces are discovered; nested classes/enums return the parent.
- Scoring is intentionally conservative—expect to tweak config weights for large monorepos.

Feedback and issues are welcome via GitHub! We’re iterating in the open to reach full parity with the JS/TS/Python engines.
