package com.example.adaptive;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Adaptive test for Calculator class
 * Uses discovery to find the Calculator implementation
 */
public class CalculatorAdaptiveTest extends AdaptiveTestBase {

    @Override
    protected Signature getTargetSignature() {
        return new Signature("Calculator")
            .withMethods("add", "subtract", "multiply", "divide")
            .withType("class");
    }

    @Test
    public void testAddition() {
        Object calculator = getTarget();

        // Use reflection to invoke methods (in real scenario, would cast to interface)
        try {
            var addMethod = targetClass.getMethod("add", double.class, double.class);

            assertEquals(5.0, addMethod.invoke(calculator, 2.0, 3.0));
            assertEquals(0.0, addMethod.invoke(calculator, -5.0, 5.0));
            assertEquals(-3.0, addMethod.invoke(calculator, -5.0, 2.0));
        } catch (Exception e) {
            fail("Failed to invoke add method: " + e.getMessage());
        }
    }

    @Test
    public void testSubtraction() {
        Object calculator = getTarget();

        try {
            var subtractMethod = targetClass.getMethod("subtract", double.class, double.class);

            assertEquals(2.0, subtractMethod.invoke(calculator, 5.0, 3.0));
            assertEquals(-10.0, subtractMethod.invoke(calculator, 5.0, 15.0));
            assertEquals(0.0, subtractMethod.invoke(calculator, 10.0, 10.0));
        } catch (Exception e) {
            fail("Failed to invoke subtract method: " + e.getMessage());
        }
    }

    @Test
    public void testMultiplication() {
        Object calculator = getTarget();

        try {
            var multiplyMethod = targetClass.getMethod("multiply", double.class, double.class);

            assertEquals(15.0, multiplyMethod.invoke(calculator, 3.0, 5.0));
            assertEquals(0.0, multiplyMethod.invoke(calculator, 100.0, 0.0));
            assertEquals(-20.0, multiplyMethod.invoke(calculator, -4.0, 5.0));
        } catch (Exception e) {
            fail("Failed to invoke multiply method: " + e.getMessage());
        }
    }

    @Test
    public void testDivision() {
        Object calculator = getTarget();

        try {
            var divideMethod = targetClass.getMethod("divide", double.class, double.class);

            assertEquals(4.0, divideMethod.invoke(calculator, 12.0, 3.0));
            assertEquals(2.5, divideMethod.invoke(calculator, 5.0, 2.0));
            assertEquals(-2.0, divideMethod.invoke(calculator, -10.0, 5.0));
        } catch (Exception e) {
            fail("Failed to invoke divide method: " + e.getMessage());
        }
    }

    @Test
    public void testDivisionByZero() {
        Object calculator = getTarget();

        try {
            var divideMethod = targetClass.getMethod("divide", double.class, double.class);

            assertThrows(java.lang.reflect.InvocationTargetException.class, () -> {
                divideMethod.invoke(calculator, 10.0, 0.0);
            });
        } catch (NoSuchMethodException e) {
            fail("Failed to find divide method: " + e.getMessage());
        }
    }
}