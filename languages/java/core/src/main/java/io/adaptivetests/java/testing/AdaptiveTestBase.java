package io.adaptivetests.java.testing;

import io.adaptivetests.java.discovery.DiscoveryResult;
import io.adaptivetests.java.discovery.JavaDiscoveryEngine;
import io.adaptivetests.java.discovery.JavaDiscoveryEngine.DiscoveryException;
import io.adaptivetests.java.discovery.Signature;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.TestInstance;

import java.nio.file.Path;
import java.nio.file.Paths;

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public abstract class AdaptiveTestBase {
    private DiscoveryResult discoveryResult;
    private Class<?> targetClass;

    protected abstract Signature signature();

    protected Path projectRoot() {
        return Paths.get("").toAbsolutePath();
    }

    protected JavaDiscoveryEngine createEngine() {
        return new JavaDiscoveryEngine(projectRoot());
    }

    protected void onTargetDiscovered(DiscoveryResult result, Class<?> resolvedClass) throws Exception {
        // Subclasses may override to perform additional setup.
    }

    protected ClassLoader targetClassLoader() {
        ClassLoader loader = Thread.currentThread().getContextClassLoader();
        return loader != null ? loader : AdaptiveTestBase.class.getClassLoader();
    }

    protected Class<?> loadTargetClass(DiscoveryResult result) throws ClassNotFoundException {
        String qualifiedName = result.getQualifiedName();
        return Class.forName(qualifiedName, true, targetClassLoader());
    }

    protected Object newInstance() throws ReflectiveOperationException {
        return targetClass().getDeclaredConstructor().newInstance();
    }

    protected Class<?> targetClass() {
        return targetClass;
    }

    protected DiscoveryResult discoveryResult() {
        return discoveryResult;
    }

    @BeforeAll
    void discoverTarget() throws Exception {
        JavaDiscoveryEngine engine = createEngine();
        try {
            discoveryResult = engine.discover(signature());
        } catch (DiscoveryException ex) {
            throw new AssertionError("Adaptive Tests could not locate a matching target.", ex);
        }

        Assertions.assertNotNull(discoveryResult, "Adaptive Tests returned a null discovery result.");
        targetClass = loadTargetClass(discoveryResult);
        onTargetDiscovered(discoveryResult, targetClass);
    }
}
