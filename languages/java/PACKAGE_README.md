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
cd languages/java
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

### Adaptive JUnit 5 Base Class

The core package now ships with `io.adaptivetests.java.testing.AdaptiveTestBase`, a JUnit 5 helper that mirrors the JavaScript `adaptiveTest` utility. Subclass it, provide a `Signature`, and the base will discover and load the target class before your tests run.

```java
import static org.junit.jupiter.api.Assertions.*;

import io.adaptivetests.java.discovery.Signature;
import io.adaptivetests.java.testing.AdaptiveTestBase;
import java.util.List;
import org.junit.jupiter.api.Test;

class CalculatorAdaptiveTest extends AdaptiveTestBase {
    @Override
    protected Signature signature() {
        return Signature.builder()
            .name("Calculator")
            .methods(List.of("add", "subtract"))
            .build();
    }

    @Test
    void addsNumbers() throws ReflectiveOperationException, NoSuchMethodException {
        Object instance = newInstance();
        var add = targetClass().getMethod("add", double.class, double.class);
        assertEquals(8.0, (double) add.invoke(instance, 5.0, 3.0), 0.001);
    }
}
```

Use `targetClass()` to access the resolved type, `newInstance()` for quick instantiation, and override `onTargetDiscovered` when you need class-level setup (fixtures, dependency injection, etc.).

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
