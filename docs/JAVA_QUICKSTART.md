# Java Quick Start

> Adaptive Tests for Java is currently experimental (`0.1.0-SNAPSHOT`). Expect rapid iteration while we close parity gaps.

## Installation

```bash
cd packages/adaptive-tests-java
./mvnw -pl core test
./mvnw -pl cli -am package
```

This produces `cli/target/adaptive-tests-java-cli-0.1.0-SNAPSHOT-shaded.jar` for easy distribution.

## Discovering a Class

```bash
java -jar adaptive-tests-java-cli-0.1.0-SNAPSHOT-shaded.jar \
  discover --root /path/to/project \
  --name OrderService \
  --method create --method cancel
```

## Scaffolding a JUnit Test (coming soon)

```bash
java -jar adaptive-tests-java-cli-0.1.0-SNAPSHOT-shaded.jar \
  scaffold src/main/java/com/example/OrderService.java \
  --tests-dir src/test/java/com/example/order
```

The scaffolder emits a JUnit 5 placeholder that uses the discovery engine to locate the production class at runtime.

## Configuration

Use JSON config files at the project root:

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

Future work will support configuration from `pom.xml` / `build.gradle`.

## Limitations

- Class loading currently assumes compiled classes are on the classpath (e.g., `target/classes`). Classpath helpers are planned.
- Only top-level classes/interfaces are considered; nested classes map to their parent.
- Scoring defaults are conservative—tune `skipDirectories`, `skipFiles`, and path weights for large repos.

Feedback and issues are welcome via GitHub. We’re iterating in the open to reach full parity with the JS/TS/Python engines.
