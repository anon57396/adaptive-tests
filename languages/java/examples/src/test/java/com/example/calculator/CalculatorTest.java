package com.example.calculator;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CalculatorTest {
    private Calculator subject;

    @BeforeEach
    void setUp() {
        subject = new Calculator("TODO");
    }

    @Test
    @DisplayName("add")
    void add() {
        // Arrange
        // TODO: customize inputs
        var result = subject.add(0, 0);
        // Assert
        assertNotNull(result);
        // assertEquals(expected, result);
    }

    @Test
    @DisplayName("subtract")
    void subtract() {
        // Arrange
        // TODO: customize inputs
        var result = subject.subtract(0, 0);
        // Assert
        assertNotNull(result);
        // assertEquals(expected, result);
    }

    @Test
    @DisplayName("is Even")
    void isEven() {
        // Arrange
        // TODO: customize inputs
        var result = subject.isEven(0);
        // Assert
        assertTrue(result);
    }

    @Test
    @DisplayName("owner")
    void owner() {
        // Arrange
        // TODO: customize inputs
        var result = subject.owner();
        // Assert
        assertNotNull(result);
    }
}
