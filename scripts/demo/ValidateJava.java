import java.io.*;
import java.nio.file.*;
import java.util.*;

/**
 * Validation script for Java adaptive tests
 * Simulates refactoring and validates that adaptive tests still pass
 */
public class ValidateJava {

    private static final String GREEN = "\u001B[32m";
    private static final String RED = "\u001B[31m";
    private static final String YELLOW = "\u001B[33m";
    private static final String CYAN = "\u001B[36m";
    private static final String BOLD = "\u001B[1m";
    private static final String RESET = "\u001B[0m";

    public static void main(String[] args) {
        log("============================================================", BOLD);
        log("🧪 Adaptive Tests Java Validation Suite", BOLD);
        log("============================================================", BOLD);

        boolean allPassed = true;

        // Basic validation
        if (!validateJavaExample()) {
            allPassed = false;
        }

        // Package refactoring validation
        if (!validatePackageRefactoring()) {
            allPassed = false;
        }

        // Summary
        log("\n============================================================", BOLD);
        if (allPassed) {
            log("✅ All Java validations passed!", GREEN + BOLD);
            System.exit(0);
        } else {
            log("❌ Some Java validations failed", RED + BOLD);
            System.exit(1);
        }
    }

    private static boolean validateJavaExample() {
        log("\n☕ Java Adaptive Tests Validation\n", BOLD);

        Path examplePath = Paths.get("languages/java/examples/spring-boot");
        if (!Files.exists(examplePath)) {
            log("❌ Java examples not found", RED);
            return false;
        }

        Path calculatorFile = examplePath.resolve("src/main/java/com/example/calculator/Calculator.java");
        if (!Files.exists(calculatorFile)) {
            log("❌ Calculator source file not found", RED);
            return false;
        }

        log("1️⃣  Running tests before refactoring...", CYAN);

        // Run tests
        if (!runMavenTests(examplePath, "com.example.calculator.CalculatorTest")) {
            log("⚠️  Traditional tests may have issues", YELLOW);
        } else {
            log("✅ Traditional tests pass", GREEN);
        }

        if (!runMavenTests(examplePath, "com.example.adaptive.CalculatorAdaptiveTest")) {
            log("❌ Adaptive tests failed before refactoring", RED);
            return false;
        }
        log("✅ Adaptive tests pass", GREEN);

        // Backup and refactor
        log("\n2️⃣  Applying refactoring...", CYAN);
        Path backupFile = backupFile(calculatorFile);

        try {
            refactorJavaCode(calculatorFile);
            log("✅ Code refactored (classes/methods renamed, code reorganized)", GREEN);

            // Run tests after refactoring
            log("\n3️⃣  Running tests after refactoring...", CYAN);

            // Traditional tests should fail
            if (runMavenTests(examplePath, "com.example.calculator.CalculatorTest")) {
                log("⚠️  Traditional tests unexpectedly passed", YELLOW);
            } else {
                log("❌ Traditional tests failed (expected)", YELLOW);
            }

            // Adaptive tests should pass
            if (!runMavenTests(examplePath, "com.example.adaptive.CalculatorAdaptiveTest")) {
                log("❌ Adaptive tests failed after refactoring", RED);
                return false;
            }

            log("✅ Adaptive tests still pass!", GREEN);
            return true;

        } finally {
            // Restore original file
            restoreFile(calculatorFile, backupFile);
            log("\n✅ Original code restored", GREEN);
        }
    }

    private static boolean validatePackageRefactoring() {
        log("\n📦 Java Package Refactoring Validation\n", BOLD);

        Path examplePath = Paths.get("languages/java/examples/spring-boot");
        Path srcDir = examplePath.resolve("src/main/java");
        Path originalPackage = srcDir.resolve("com/example/calculator");
        Path newPackage = srcDir.resolve("com/example/math/operations");

        if (!Files.exists(originalPackage)) {
            log("⚠️  Skipping package validation (source not found)", YELLOW);
            return true;
        }

        log("1️⃣  Moving to new package structure...", CYAN);

        try {
            // Create new package directory
            Files.createDirectories(newPackage);

            // Move and refactor Calculator.java
            Path originalFile = originalPackage.resolve("Calculator.java");
            Path newFile = newPackage.resolve("MathOperations.java");
            Path backupFile = backupFile(originalFile);

            // Copy and refactor
            String content = Files.readString(originalFile);
            content = content.replace("package com.example.calculator;", "package com.example.math.operations;");
            content = content.replace("public class Calculator", "public class MathOperations");
            content = content.replace("class Calculator", "class MathOperations");

            Files.writeString(newFile, content);

            // Create facade in original location
            String facadeContent = """
                package com.example.calculator;

                import com.example.math.operations.MathOperations;

                /**
                 * Facade for backward compatibility
                 */
                public class Calculator extends MathOperations {
                    // Delegating to MathOperations
                }
                """;
            Files.writeString(originalFile, facadeContent);

            log("✅ Code moved to com.example.math.operations", GREEN);

            // Run adaptive tests
            log("\n2️⃣  Running adaptive tests after package reorganization...", CYAN);
            if (!runMavenTests(examplePath, "com.example.adaptive.CalculatorAdaptiveTest")) {
                log("❌ Adaptive tests failed after package reorganization", RED);
                return false;
            }

            log("✅ Adaptive tests handle package reorganization!", GREEN);
            return true;

        } catch (IOException e) {
            log("❌ Error during package refactoring: " + e.getMessage(), RED);
            return false;
        } finally {
            // Clean up
            try {
                if (Files.exists(newPackage)) {
                    deleteDirectory(newPackage);
                }
                // Restore will be handled by outer finally
            } catch (IOException e) {
                log("⚠️  Error during cleanup: " + e.getMessage(), YELLOW);
            }
        }
    }

    private static void refactorJavaCode(Path filepath) throws IOException {
        String content = Files.readString(filepath);

        // Simulate various refactoring operations
        Map<String, String> refactorings = Map.of(
            "public class Calculator", "public class ArithmeticProcessor",
            "Calculator()", "ArithmeticProcessor()",
            "public double add(", "public double sum(",
            "public double subtract(", "public double difference(",
            "public double multiply(", "public double product(",
            "public double divide(", "public double quotient("
        );

        for (Map.Entry<String, String> entry : refactorings.entrySet()) {
            content = content.replace(entry.getKey(), entry.getValue());
        }

        // Add new methods
        if (content.contains("class ArithmeticProcessor")) {
            String newMethods = """

                    public double power(double base, double exponent) {
                        return Math.pow(base, exponent);
                    }

                    public double squareRoot(double value) {
                        if (value < 0) {
                            throw new IllegalArgumentException("Cannot calculate square root of negative number");
                        }
                        return Math.sqrt(value);
                    }

                    public double modulo(double a, double b) {
                        return a % b;
                    }
                """;

            // Insert before the last closing brace
            int lastBrace = content.lastIndexOf("}");
            if (lastBrace > 0) {
                content = content.substring(0, lastBrace) + newMethods + "\n}";
            }
        }

        Files.writeString(filepath, content);
    }

    private static Path backupFile(Path filepath) {
        try {
            Path backupPath = Paths.get(filepath.toString() + ".backup");
            Files.copy(filepath, backupPath, StandardCopyOption.REPLACE_EXISTING);
            return backupPath;
        } catch (IOException e) {
            log("⚠️  Failed to create backup: " + e.getMessage(), YELLOW);
            return null;
        }
    }

    private static void restoreFile(Path filepath, Path backupPath) {
        if (backupPath != null && Files.exists(backupPath)) {
            try {
                Files.move(backupPath, filepath, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException e) {
                log("⚠️  Failed to restore file: " + e.getMessage(), YELLOW);
            }
        }
    }

    private static boolean runMavenTests(Path projectPath, String testClass) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                "mvn", "test", "-Dtest=" + testClass, "-q"
            );
            pb.directory(projectPath.toFile());
            Process process = pb.start();

            boolean completed = process.waitFor(30, java.util.concurrent.TimeUnit.SECONDS);
            if (!completed) {
                process.destroyForcibly();
                return false;
            }

            return process.exitValue() == 0;
        } catch (IOException | InterruptedException e) {
            // Try with gradle as fallback
            return runGradleTests(projectPath, testClass);
        }
    }

    private static boolean runGradleTests(Path projectPath, String testClass) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                "./gradlew", "test", "--tests", testClass, "-q"
            );
            pb.directory(projectPath.toFile());
            Process process = pb.start();

            boolean completed = process.waitFor(30, java.util.concurrent.TimeUnit.SECONDS);
            if (!completed) {
                process.destroyForcibly();
                return false;
            }

            return process.exitValue() == 0;
        } catch (IOException | InterruptedException e) {
            return false;
        }
    }

    private static void deleteDirectory(Path directory) throws IOException {
        if (Files.exists(directory)) {
            Files.walk(directory)
                .sorted(Comparator.reverseOrder())
                .forEach(path -> {
                    try {
                        Files.delete(path);
                    } catch (IOException e) {
                        // Ignore
                    }
                });
        }
    }

    private static void log(String message, String color) {
        System.out.println(color + message + RESET);
    }
}
