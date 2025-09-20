package com.example.adaptive;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import java.lang.reflect.Method;

/**
 * Adaptive test for CustomerService class
 * Demonstrates discovery with annotations
 */
public class CustomerServiceAdaptiveTest extends AdaptiveTestBase {

    @Override
    protected Signature getTargetSignature() {
        return new Signature("CustomerService")
            .withMethods("createCustomer", "getCustomer", "updateCustomer", "deleteCustomer")
            .withAnnotations("Service")
            .withType("class");
    }

    @Test
    public void testServiceAnnotationPresent() {
        // Verify the Service annotation is present
        boolean hasServiceAnnotation = false;
        for (var annotation : targetClass.getAnnotations()) {
            if (annotation.annotationType().getSimpleName().equals("Service")) {
                hasServiceAnnotation = true;
                break;
            }
        }
        assertTrue(hasServiceAnnotation, "CustomerService should have @Service annotation");
    }

    @Test
    public void testCreateCustomer() {
        Object service = getTarget();

        try {
            // Find createCustomer method
            Method createMethod = null;
            for (Method m : targetClass.getMethods()) {
                if (m.getName().equals("createCustomer")) {
                    createMethod = m;
                    break;
                }
            }

            assertNotNull(createMethod, "createCustomer method should exist");

            // Test with null safety
            if (createMethod.getParameterCount() == 2) {
                // Assuming createCustomer(String name, String email)
                Object result = createMethod.invoke(service, "John Doe", "john@example.com");
                assertNotNull(result, "Created customer should not be null");
            }
        } catch (Exception e) {
            fail("Failed to test createCustomer: " + e.getMessage());
        }
    }

    @Test
    public void testGetCustomer() {
        Object service = getTarget();

        try {
            Method getMethod = targetClass.getMethod("getCustomer", Long.class);
            assertNotNull(getMethod, "getCustomer method should exist");

            // Test with a sample ID
            Object result = getMethod.invoke(service, 1L);
            // Result might be null if customer doesn't exist, which is valid
            assertTrue(result == null || result.getClass().getSimpleName().contains("Customer"),
                "Result should be null or a Customer object");
        } catch (NoSuchMethodException e) {
            // Try with String ID
            try {
                Method getMethod = targetClass.getMethod("getCustomer", String.class);
                Object result = getMethod.invoke(service, "1");
                assertTrue(result == null || result.getClass().getSimpleName().contains("Customer"),
                    "Result should be null or a Customer object");
            } catch (Exception ex) {
                fail("getCustomer method not found with expected parameter types");
            }
        } catch (Exception e) {
            fail("Failed to test getCustomer: " + e.getMessage());
        }
    }

    @Test
    public void testUpdateCustomer() {
        Object service = getTarget();

        try {
            // Find updateCustomer method
            Method updateMethod = null;
            for (Method m : targetClass.getMethods()) {
                if (m.getName().equals("updateCustomer")) {
                    updateMethod = m;
                    break;
                }
            }

            assertNotNull(updateMethod, "updateCustomer method should exist");

            // Verify method exists and is callable
            assertTrue(updateMethod.getParameterCount() > 0,
                "updateCustomer should accept parameters");
        } catch (Exception e) {
            fail("Failed to test updateCustomer: " + e.getMessage());
        }
    }

    @Test
    public void testDeleteCustomer() {
        Object service = getTarget();

        try {
            // Find deleteCustomer method
            Method deleteMethod = null;
            for (Method m : targetClass.getMethods()) {
                if (m.getName().equals("deleteCustomer")) {
                    deleteMethod = m;
                    break;
                }
            }

            assertNotNull(deleteMethod, "deleteCustomer method should exist");

            // Verify return type is boolean or void
            Class<?> returnType = deleteMethod.getReturnType();
            assertTrue(returnType == boolean.class ||
                      returnType == Boolean.class ||
                      returnType == void.class,
                "deleteCustomer should return boolean or void");
        } catch (Exception e) {
            fail("Failed to test deleteCustomer: " + e.getMessage());
        }
    }
}