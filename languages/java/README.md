# Adaptive Tests for Java

[![Maven Central](https://img.shields.io/maven-central/v/io.adaptivetests/adaptive-tests-java.svg)](https://central.sonatype.com/artifact/io.adaptivetests/adaptive-tests-java)
[![Coverage](https://img.shields.io/codecov/c/github/anon57396/adaptive-tests?label=coverage)](https://codecov.io/gh/anon57396/adaptive-tests)

> **AI-ready testing infrastructure for Java** - Tests that survive refactoring without breaking

When AI agents reshape your Java codebase, traditional imports break. Adaptive Tests uses **zero-runtime discovery** powered by reflection and bytecode analysis to find code by structure, not import paths. Your tests adapt as code evolves.

**Stop fixing broken imports.** Move classes, rename packages, refactor layers—adaptive tests still find the code they care about.

---

## Quick Start

### Maven

```xml
<dependency>
    <groupId>io.adaptivetests</groupId>
    <artifactId>adaptive-tests-java</artifactId>
    <version>0.1.0</version>
    <scope>test</scope>
</dependency>
```

### Gradle

```groovy
testImplementation 'io.adaptivetests:adaptive-tests-java:0.1.0'
```

### Basic Usage

```java
import io.adaptivetests.java.discovery.JavaDiscoveryEngine;
import io.adaptivetests.java.discovery.DiscoverySignature;
import io.adaptivetests.java.discovery.DiscoveryResult;

public class UserServiceTest {
    private JavaDiscoveryEngine engine = new JavaDiscoveryEngine("src/main/java");

    @Test
    public void testUserService() throws Exception {
        // Discover UserService by signature
        DiscoverySignature signature = DiscoverySignature.builder()
            .name("UserService")
            .type("class")
            .methods(List.of("findById", "create", "update"))
            .annotations(List.of("@Service", "@Component"))
            .build();

        DiscoveryResult result = engine.discover(signature);
        Class<?> userServiceClass = result.getTargetClass();

        // Test the discovered service
        Object userService = userServiceClass.getDeclaredConstructor().newInstance();
        Method findById = userServiceClass.getMethod("findById", Long.class);

        Object user = findById.invoke(userService, 1L);
        assertNotNull(user);
    }
}
```

### JUnit 5 Integration

```java
import io.adaptivetests.java.junit.AdaptiveTest;
import io.adaptivetests.java.junit.DiscoverTarget;

@AdaptiveTest
public class CalculatorTest {

    @DiscoverTarget(
        name = "Calculator",
        methods = {"add", "subtract", "multiply", "divide"}
    )
    private Class<?> calculatorClass;

    @Test
    public void testAddition() throws Exception {
        Object calculator = calculatorClass.getDeclaredConstructor().newInstance();
        Method add = calculatorClass.getMethod("add", int.class, int.class);

        int result = (Integer) add.invoke(calculator, 2, 3);
        assertEquals(5, result);
    }

    @Test
    public void testDivisionByZero() {
        assertThrows(ArithmeticException.class, () -> {
            Object calculator = calculatorClass.getDeclaredConstructor().newInstance();
            Method divide = calculatorClass.getMethod("divide", int.class, int.class);
            divide.invoke(calculator, 5, 0);
        });
    }
}
```

---

## Core API

### `JavaDiscoveryEngine`

Primary engine for finding Java classes by structure:

```java
import io.adaptivetests.java.discovery.JavaDiscoveryEngine;

// Create engine with default settings
JavaDiscoveryEngine engine = new JavaDiscoveryEngine();

// Create with custom root path
JavaDiscoveryEngine engine = new JavaDiscoveryEngine("src/main/java");

// Create with configuration
DiscoveryConfig config = DiscoveryConfig.builder()
    .maxDepth(5)
    .includePatterns(List.of("**/service/**", "**/controller/**"))
    .excludePatterns(List.of("**/test/**"))
    .enableCache(true)
    .build();

JavaDiscoveryEngine engine = new JavaDiscoveryEngine("src", config);
```

### `DiscoverySignature`

Flexible signature builder for detailed discovery:

```java
// Simple class discovery
DiscoverySignature signature = DiscoverySignature.builder()
    .name("UserService")
    .build();

// Detailed signature with methods and annotations
DiscoverySignature signature = DiscoverySignature.builder()
    .name("UserController")
    .type("class")
    .methods(List.of("getUser", "createUser", "updateUser"))
    .annotations(List.of("@RestController", "@RequestMapping"))
    .fields(List.of("userService", "validator"))
    .build();

// Interface discovery
DiscoverySignature signature = DiscoverySignature.builder()
    .name("UserRepository")
    .type("interface")
    .methods(List.of("findById", "save", "delete"))
    .extendsFrom(List.of("JpaRepository"))
    .build();

// Abstract class discovery
DiscoverySignature signature = DiscoverySignature.builder()
    .name("BaseEntity")
    .type("abstract")
    .methods(List.of("getId", "setId"))
    .fields(List.of("id", "createdAt"))
    .build();
```

### `DiscoveryResult`

Rich result object with detailed information:

```java
DiscoveryResult result = engine.discover(signature);

// Get the discovered class
Class<?> targetClass = result.getTargetClass();

// Get discovery metadata
String className = result.getClassName();
String packageName = result.getPackageName();
String sourcePath = result.getSourcePath();
int score = result.getScore();

// Get available methods
List<Method> methods = result.getMethods();
List<Field> fields = result.getFields();
List<Annotation> annotations = result.getAnnotations();

// Check inheritance
Class<?> superClass = result.getSuperClass();
List<Class<?>> interfaces = result.getInterfaces();
```

---

## Framework Integration

### Spring Boot

```java
@SpringBootTest
@AdaptiveTest
public class UserServiceSpringTest {

    @Autowired
    private ApplicationContext context;

    @DiscoverTarget(
        name = "UserService",
        annotations = {"@Service"},
        methods = {"findById", "save"}
    )
    private Class<?> userServiceClass;

    @Test
    public void testUserServiceInjection() {
        // Get Spring-managed instance
        Object userService = context.getBean(userServiceClass);
        assertNotNull(userService);

        // Test service methods
        Method findById = ReflectionUtils.findMethod(userServiceClass, "findById", Long.class);
        Object user = ReflectionUtils.invokeMethod(findById, userService, 1L);
        assertNotNull(user);
    }
}
```

### TestNG Integration

```java
import io.adaptivetests.java.testng.AdaptiveTestNG;

public class CalculatorTestNG extends AdaptiveTestNG {

    @Override
    public DiscoverySignature getTargetSignature() {
        return DiscoverySignature.builder()
            .name("Calculator")
            .methods(List.of("add", "subtract"))
            .build();
    }

    @Test
    public void testAddition() throws Exception {
        Object calculator = createTargetInstance();
        Method add = getTargetMethod("add", int.class, int.class);

        int result = (Integer) add.invoke(calculator, 2, 3);
        Assert.assertEquals(result, 5);
    }
}
```

### Mockito Integration

```java
@ExtendWith(MockitoExtension.class)
@AdaptiveTest
public class UserServiceMockitoTest {

    @Mock
    private UserRepository userRepository;

    @DiscoverTarget(name = "UserService")
    private Class<?> userServiceClass;

    @Test
    public void testUserServiceWithMocks() throws Exception {
        // Create instance with mocked dependencies
        Constructor<?> constructor = userServiceClass.getConstructor(UserRepository.class);
        Object userService = constructor.newInstance(userRepository);

        // Setup mock behavior
        User mockUser = new User(1L, "John Doe");
        when(userRepository.findById(1L)).thenReturn(mockUser);

        // Test service method
        Method findById = userServiceClass.getMethod("findById", Long.class);
        User result = (User) findById.invoke(userService, 1L);

        assertEquals("John Doe", result.getName());
        verify(userRepository).findById(1L);
    }
}
```

---

## Advanced Discovery

### Generic Types

```java
// Find repository with generic type
DiscoverySignature signature = DiscoverySignature.builder()
    .name("UserRepository")
    .type("interface")
    .generics(List.of("User"))
    .extendsFrom(List.of("JpaRepository"))
    .build();

DiscoveryResult result = engine.discover(signature);
ParameterizedType genericType = (ParameterizedType) result.getTargetClass().getGenericInterfaces()[0];
Type[] typeArguments = genericType.getActualTypeArguments();
```

### Annotation-Based Discovery

```java
// Find all REST controllers
DiscoverySignature signature = DiscoverySignature.builder()
    .type("class")
    .annotations(List.of("@RestController"))
    .build();

List<DiscoveryResult> controllers = engine.discoverAll(signature);

// Find specific endpoint
DiscoverySignature endpoint = DiscoverySignature.builder()
    .name("getUserById")
    .type("method")
    .annotations(List.of("@GetMapping"))
    .parameters(List.of("Long"))
    .build();
```

### Package-Based Discovery

```java
// Find all services in a package
DiscoverySignature signature = DiscoverySignature.builder()
    .packageName("com.example.service")
    .type("class")
    .annotations(List.of("@Service"))
    .build();

// Find classes that implement specific interface
DiscoverySignature signature = DiscoverySignature.builder()
    .implementsInterface("PaymentProcessor")
    .packagePattern("com.example.payments.**")
    .build();
```

### Inheritance-Based Discovery

```java
// Find all entities
DiscoverySignature signature = DiscoverySignature.builder()
    .type("class")
    .extendsFrom(List.of("BaseEntity"))
    .annotations(List.of("@Entity"))
    .build();

// Find all DTOs
DiscoverySignature signature = DiscoverySignature.builder()
    .type("class")
    .namePattern(".*DTO$")
    .build();
```

---

## Configuration

### Basic Configuration

```java
DiscoveryConfig config = DiscoveryConfig.builder()
    .maxDepth(10)
    .includePatterns(List.of(
        "src/main/java/**/*.java",
        "src/test/java/**/*.java"
    ))
    .excludePatterns(List.of(
        "**/target/**",
        "**/generated/**"
    ))
    .enableCache(true)
    .cacheSize(1000)
    .build();

JavaDiscoveryEngine engine = new JavaDiscoveryEngine(".", config);
```

### Advanced Configuration

```java
DiscoveryConfig config = DiscoveryConfig.builder()
    // Search settings
    .maxDepth(8)
    .followSymlinks(false)
    .includeTestClasses(false)

    // Pattern matching
    .includePatterns(List.of("**/service/**", "**/controller/**"))
    .excludePatterns(List.of("**/test/**", "**/impl/**"))

    // Scoring weights
    .exactNameWeight(50)
    .methodMatchWeight(25)
    .annotationWeight(20)
    .packageWeight(5)

    // Performance
    .enableCache(true)
    .cacheSize(2000)
    .parallelDiscovery(true)
    .timeout(Duration.ofSeconds(30))

    // Java-specific
    .includePrivateMethods(false)
    .includeStaticMethods(true)
    .includeAbstractMethods(true)
    .parseJavadoc(true)

    .build();
```

### Configuration File

Create `adaptive-tests.properties`:

```properties
# Discovery settings
adaptive.discovery.maxDepth=10
adaptive.discovery.includePatterns=src/main/java/**/*.java,src/test/java/**/*.java
adaptive.discovery.excludePatterns=**/target/**,**/generated/**

# Scoring weights
adaptive.scoring.exactNameWeight=50
adaptive.scoring.methodMatchWeight=25
adaptive.scoring.annotationWeight=20

# Performance
adaptive.cache.enabled=true
adaptive.cache.size=1000

# Java-specific
adaptive.java.includePrivateMethods=false
adaptive.java.parseJavadoc=true
```

---

## Build Integration

### Maven Plugin

```xml
<plugin>
    <groupId>io.adaptivetests</groupId>
    <artifactId>adaptive-tests-maven-plugin</artifactId>
    <version>0.1.0</version>
    <executions>
        <execution>
            <goals>
                <goal>discover</goal>
                <goal>generate-tests</goal>
            </goals>
        </execution>
    </executions>
    <configuration>
        <sourceDirectory>src/main/java</sourceDirectory>
        <testDirectory>src/test/java</testDirectory>
        <includePatterns>
            <pattern>**/service/**</pattern>
            <pattern>**/controller/**</pattern>
        </includePatterns>
    </configuration>
</plugin>
```

### Gradle Plugin

```groovy
plugins {
    id 'io.adaptivetests.gradle' version '0.1.0'
}

adaptiveTests {
    sourceDir = 'src/main/java'
    testDir = 'src/test/java'
    includePatterns = ['**/service/**', '**/controller/**']
    excludePatterns = ['**/test/**']
    generateTests = true
}
```

---

## CLI Tools

Build the CLI:

```bash
./mvnw -pl cli package
```

### Discover Classes

```bash
java -jar cli/target/adaptive-tests-java-cli.jar discover \
    --root src/main/java \
    --name UserService \
    --methods findById,save,delete

java -jar cli/target/adaptive-tests-java-cli.jar discover \
    --root src/main/java \
    --type interface \
    --annotations @Repository \
    --json
```

### Generate Tests

```bash
java -jar cli/target/adaptive-tests-java-cli.jar generate-test \
    --class com.example.service.UserService \
    --framework junit5 \
    --output src/test/java

java -jar cli/target/adaptive-tests-java-cli.jar generate-test \
    --package com.example.service \
    --recursive \
    --framework testng
```

### Debug Discovery

```bash
java -jar cli/target/adaptive-tests-java-cli.jar why \
    --name UserService \
    --methods findById,save \
    --verbose

java -jar cli/target/adaptive-tests-java-cli.jar analyze \
    --root src/main/java \
    --show-all-candidates
```

---

## Examples

This package includes complete examples:

### Maven Example
```bash
cd examples/maven-project
mvn test
```

### Spring Boot Example
```bash
cd examples/spring-boot
./mvnw test
```

### Gradle Example
```bash
cd examples/gradle-project
./gradlew test
```

---

## Performance

### Benchmarks

- **First discovery**: ~20ms
- **Cached discovery**: ~2ms
- **Large codebase (500+ classes)**: ~200ms
- **Zero runtime overhead** after discovery

### Optimization Tips

1. **Use specific patterns**: Narrow search with include/exclude patterns
2. **Enable caching**: Reuse discovery results
3. **Limit search depth**: Set reasonable maxDepth values
4. **Parallel discovery**: Enable for large codebases

```java
// Good: Reuse engine
JavaDiscoveryEngine engine = new JavaDiscoveryEngine();
Class<?> userService = engine.discover(userSignature).getTargetClass();
Class<?> orderService = engine.discover(orderSignature).getTargetClass();

// Avoid: Multiple engines
Class<?> userService = new JavaDiscoveryEngine().discover(userSignature).getTargetClass();
Class<?> orderService = new JavaDiscoveryEngine().discover(orderSignature).getTargetClass();
```

---

## Troubleshooting

### Common Issues

**ClassNotFoundException after refactoring**
```java
// Use discovery instead of direct imports
// Old:
// import com.example.service.UserService;

// New:
DiscoveryResult result = engine.discover(
    DiscoverySignature.builder().name("UserService").build()
);
Class<?> UserService = result.getTargetClass();
```

**Discovery fails to find class**
```bash
# Debug with CLI
java -jar cli/target/adaptive-tests-java-cli.jar why --name UserService --verbose
```

**Performance issues**
```java
// Optimize with specific patterns
DiscoveryConfig config = DiscoveryConfig.builder()
    .includePatterns(List.of("**/service/**"))  // Specific
    .excludePatterns(List.of("**/test/**", "**/target/**"))
    .maxDepth(5)  // Reasonable limit
    .enableCache(true)
    .build();
```

**Annotation not recognized**
```java
// Ensure full annotation name
DiscoverySignature signature = DiscoverySignature.builder()
    .name("UserController")
    .annotations(List.of("org.springframework.web.bind.annotation.RestController"))
    .build();
```

---

## Development

### Building from Source

```bash
git clone https://github.com/anon57396/adaptive-tests.git
cd adaptive-tests/languages/java
./mvnw clean install
```

### Running Tests

```bash
# All tests
./mvnw test

# Specific module
./mvnw -pl core test

# Integration tests
./mvnw -pl examples test

# With coverage
./mvnw clean test jacoco:report
```

### Contributing

We welcome Java-specific contributions! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

---

## License

MIT - See [LICENSE](../../LICENSE) for details.

---

**Ready to make your Java tests refactoring-proof?**

```xml
<dependency>
    <groupId>io.adaptivetests</groupId>
    <artifactId>adaptive-tests-java</artifactId>
    <version>0.1.0</version>
    <scope>test</scope>
</dependency>
```

Start with the [Quick Start](#quick-start) guide above!