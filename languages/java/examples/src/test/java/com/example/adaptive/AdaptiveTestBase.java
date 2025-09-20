package com.example.adaptive;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Base class for creating adaptive tests in Java
 * Provides discovery engine integration and helper methods
 */
public abstract class AdaptiveTestBase {

    protected DiscoveryEngine discoveryEngine;
    protected Object target;
    protected Class<?> targetClass;

    /**
     * Define the signature of the target to discover
     * @return Signature configuration
     */
    protected abstract Signature getTargetSignature();

    @BeforeEach
    public void setUp() throws Exception {
        // Initialize discovery engine
        discoveryEngine = new DiscoveryEngine(getSearchPath());

        // Discover the target
        Signature signature = getTargetSignature();
        targetClass = discoveryEngine.discover(signature);

        if (targetClass == null) {
            fail("Could not discover target matching signature: " + signature);
        }

        // Create instance if it's a class
        try {
            target = targetClass.getDeclaredConstructor().newInstance();
        } catch (Exception e) {
            // Some classes might need parameters or be static
            target = targetClass;
        }
    }

    /**
     * Get the search path for discovery
     * Override this method to customize search location
     */
    protected String getSearchPath() {
        return "src/main/java";
    }

    /**
     * Helper to assert method exists on target
     */
    protected void assertMethodExists(String methodName, Class<?>... paramTypes) {
        try {
            assertNotNull(targetClass.getMethod(methodName, paramTypes),
                "Method '" + methodName + "' does not exist on discovered target");
        } catch (NoSuchMethodException e) {
            fail("Method '" + methodName + "' does not exist on discovered target");
        }
    }

    /**
     * Helper to assert multiple methods exist
     */
    protected void assertMethodsExist(String... methods) {
        for (String method : methods) {
            assertMethodExists(method);
        }
    }

    /**
     * Helper to get the discovered target
     */
    @SuppressWarnings("unchecked")
    protected <T> T getTarget() {
        return (T) target;
    }

    /**
     * Helper to get the discovered target class
     */
    @SuppressWarnings("unchecked")
    protected <T> Class<T> getTargetClass() {
        return (Class<T>) targetClass;
    }

    /**
     * Helper to validate discovered target structure
     */
    @Test
    public void testDiscoveryValidation() {
        Signature signature = getTargetSignature();

        assertNotNull(target, "Target should be discovered and instantiated");

        if (signature.getMethods() != null) {
            assertMethodsExist(signature.getMethods());
        }
    }

    /**
     * Signature class for defining discovery targets
     */
    public static class Signature {
        private String name;
        private String[] methods;
        private String type;
        private String[] annotations;

        public Signature(String name) {
            this.name = name;
            this.type = "class";
        }

        public Signature withMethods(String... methods) {
            this.methods = methods;
            return this;
        }

        public Signature withType(String type) {
            this.type = type;
            return this;
        }

        public Signature withAnnotations(String... annotations) {
            this.annotations = annotations;
            return this;
        }

        public String getName() { return name; }
        public String[] getMethods() { return methods; }
        public String getType() { return type; }
        public String[] getAnnotations() { return annotations; }

        @Override
        public String toString() {
            return String.format("Signature{name='%s', type='%s', methods=%d}",
                name, type, methods != null ? methods.length : 0);
        }
    }
}

/**
 * Discovery Engine for Java
 * Discovers classes based on signatures
 */
class DiscoveryEngine {
    private final String searchPath;
    private final ClassLoader classLoader;

    public DiscoveryEngine(String searchPath) {
        this.searchPath = searchPath;
        this.classLoader = Thread.currentThread().getContextClassLoader();
    }

    /**
     * Discover a class matching the given signature
     */
    public Class<?> discover(AdaptiveTestBase.Signature signature) {
        try {
            // For demo purposes, using simple class name resolution
            // In production, would scan classpath and match signatures
            String[] commonPackages = {
                "com.example.calculator.",
                "com.example.service.",
                "com.example.notification.",
                "com.example.model.",
                "com.example."
            };

            for (String pkg : commonPackages) {
                try {
                    Class<?> clazz = classLoader.loadClass(pkg + signature.getName());
                    if (matchesSignature(clazz, signature)) {
                        return clazz;
                    }
                } catch (ClassNotFoundException e) {
                    // Try next package
                }
            }

            // Try without package
            try {
                Class<?> clazz = classLoader.loadClass(signature.getName());
                if (matchesSignature(clazz, signature)) {
                    return clazz;
                }
            } catch (ClassNotFoundException e) {
                // Not found
            }

        } catch (Exception e) {
            e.printStackTrace();
        }

        return null;
    }

    /**
     * Check if a class matches the signature
     */
    private boolean matchesSignature(Class<?> clazz, AdaptiveTestBase.Signature signature) {
        // Check name match
        if (!clazz.getSimpleName().contains(signature.getName())) {
            return false;
        }

        // Check methods match
        if (signature.getMethods() != null) {
            for (String methodName : signature.getMethods()) {
                boolean found = false;
                for (java.lang.reflect.Method method : clazz.getMethods()) {
                    if (method.getName().equals(methodName)) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    return false;
                }
            }
        }

        // Check annotations match
        if (signature.getAnnotations() != null) {
            for (String annotationName : signature.getAnnotations()) {
                boolean found = false;
                for (java.lang.annotation.Annotation annotation : clazz.getAnnotations()) {
                    if (annotation.annotationType().getSimpleName().equals(annotationName)) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    return false;
                }
            }
        }

        return true;
    }
}