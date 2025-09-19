# Java Examples

This directory showcases sample Java components used during development of the adaptive-tests Java bridge.

```
.
├── src
│   └── main
│       └── java
│           └── com
│               └── example
│                   ├── calculator
│                   │   └── Calculator.java
│                   ├── model
│                   │   ├── Address.java
│                   │   ├── SubscriptionTier.java
│                   │   └── User.java
│                   ├── notification
│                   │   ├── EmailNotificationService.java
│                   │   └── NotificationSender.java
│                   └── service
│                       ├── CustomerService.java
│                       └── annotations
│                           └── Service.java
```

You can scaffold adaptive tests against these examples:

```bash
# Generate a JUnit 5 test for the calculator example
npx adaptive-tests scaffold examples/java/src/main/java/com/example/calculator/Calculator.java

# Scaffold a test for the service annotated with @Service
npx adaptive-tests scaffold examples/java/src/main/java/com/example/service/CustomerService.java
```

Each invocation produces a test in `src/test/java` mirroring the original package, ready to be customised with project-specific assertions.
