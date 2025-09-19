# adaptive-tests-java

Adaptive Tests for Java brings zero-runtime discovery to JVM projects. It mirrors the JavaScript, TypeScript, and Python engines so refactors no longer break your test suites.

> **Status:** experimental (`0.1.0-SNAPSHOT`). APIs may change as we close parity gaps.

## Modules

| Module | Description |
| ------ | ----------- |
| `core` | Discovery engine, scoring rules, configuration loader, cache manager. |
| `cli`  | Command line utilities (`discover`, `why`, `scaffold`) packaged as a fat JAR. |
| `examples/spring-boot` | Placeholder for Spring Boot demos (coming soon). |

## Quick Start

```bash
cd packages/adaptive-tests-java
./mvnw -pl core test     # verify the engine
./mvnw -pl cli -am package
java -jar cli/target/adaptive-tests-java-cli-0.1.0-SNAPSHOT-shaded.jar --help
```

### Discover a Service

```bash
java -jar cli/target/adaptive-tests-java-cli-0.1.0-SNAPSHOT-shaded.jar \
  discover --root /path/to/project --name OrderService --method create --method cancel
```

### Explain Scoring

```bash
java -jar cli/target/adaptive-tests-java-cli-0.1.0-SNAPSHOT-shaded.jar \
  why --root /path/to/project --name OrderService --limit 3
```

### Scaffold a JUnit Test (coming soon)

```bash
java -jar cli/target/adaptive-tests-java-cli-0.1.0-SNAPSHOT-shaded.jar \
  scaffold src/main/java/com/example/OrderService.java --tests-dir src/test/java/com/example
```

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

Support for `pom.xml` / `build.gradle` configuration blocks is planned. Track progress in `docs/INTERNAL_EXECUTION_PLAN.md`.
