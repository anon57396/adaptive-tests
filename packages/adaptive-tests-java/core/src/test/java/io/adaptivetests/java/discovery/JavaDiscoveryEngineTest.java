package io.adaptivetests.java.discovery;

import io.adaptivetests.java.discovery.JavaDiscoveryEngine.DiscoveryException;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class JavaDiscoveryEngineTest {

    @Test
    void discoversClassByNameAndMethods() throws Exception {
        Path project = Path.of("src/test/resources/sample-project");
        JavaDiscoveryEngine engine = new JavaDiscoveryEngine(project);

        Signature signature = Signature.builder()
                .name("OrderService")
                .methods(List.of("create", "cancel"))
                .build();

        DiscoveryResult result = engine.discover(signature);
        assertEquals("OrderService", result.getClassName());
        assertEquals("com.example.service", result.getPackageName());
        assertTrue(result.getFilePath().toString().contains("OrderService.java"));
    }

    @Test
    void returnsEmptyWhenNoMatch() {
        Path project = Path.of("src/test/resources/sample-project");
        JavaDiscoveryEngine engine = new JavaDiscoveryEngine(project);

        Signature signature = Signature.builder()
                .name("PaymentService")
                .build();

        assertThrows(DiscoveryException.class, () -> engine.discover(signature));
    }
}
