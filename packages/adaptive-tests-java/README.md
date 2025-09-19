# adaptive-tests-java

Adaptive Tests for Java brings zero-runtime discovery to JVM projects. It mirrors the JavaScript, TypeScript, and Python engines so refactors no longer break your test suites.

> **Status:** experimental (0.1.0-SNAPSHOT). APIs may change as we expand coverage and gather feedback.

## Modules

| Module | Description |
| ------ | ----------- |
| `core` | Discovery engine, scoring rules, configuration loader, cache manager. |
| `cli`  | Command line utilities (`discover`, `why`, `scaffold`). Packaged as an executable fat JAR. |
| `examples/spring-boot` | Placeholder for Spring Boot demos (coming soon). |

## Quick Start

```bash
cd packages/adaptive-tests-java
./mvnw -pl core test   # Run engine unit tests
./mvnw -pl cli -am package
java -jar cli/target/adaptive-tests-java-cli-0.1.0-SNAPSHOT-shaded.jar --help
```

### Discover a Service

```bash
java -jar cli/target/adaptive-tests-java-cli-0.1.0-SNAPSHOT-shaded.jar \
  discover --root path/to/project --name OrderService --method create --method cancel
```

### Explain Scoring

```bash
java -jar cli/target/adaptive-tests-java-cli-0.1.0-SNAPSHOT-shaded.jar \
  why --root path/to/project --name OrderService --limit 3
```

### Scaffold a JUnit Test

```bash
java -jar cli/target/adaptive-tests-java-cli-0.1.0-SNAPSHOT-shaded.jar \
  scaffold src/main/java/com/example/OrderService.java --tests-dir src/test/java/com/example
```

The scaffolder emits a JUnit 5 stub that uses the adaptive discovery engine to locate the production class at runtime.

## Configuration

By default the engine scans `.java` files under the project root, skipping common build directories. Override behaviour with one of:

- `adaptive-tests.config.json`
- `.adaptive-tests-java.json`

Example:

```json
{
  "discovery": {
    "extensions": [".java"],
    "skipDirectories": [".git", "build"],
    "skipFiles": ["Test.java"],
    "cacheFile": ".adaptive-tests-cache.json"
  }
}
```

Support for reading configuration from `pom.xml` / `build.gradle` will land in a follow-up milestone (tracked in `docs/INTERNAL_EXECUTION_PLAN.md`).
