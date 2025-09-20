package com.example.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CustomerServiceTest {
    private CustomerService subject;

    @BeforeEach
    void setUp() {
        subject = new CustomerService();
    }

    @Test
    @DisplayName("find Active Users")
    void findActiveUsers() {
        // Arrange
        // TODO: customize inputs
        var result = subject.findActiveUsers();
        // Assert
        assertNotNull(result);
        // assertFalse(result.isEmpty());
    }

    @Test
    @DisplayName("find By Name")
    void findByName() {
        // Arrange
        // TODO: customize inputs
        var result = subject.findByName("TODO");
        // Assert
        assertNotNull(result);
    }

    @Test
    @DisplayName("has Outstanding Balance")
    void hasOutstandingBalance() {
        // Arrange
        // TODO: customize inputs
        var result = subject.hasOutstandingBalance("TODO");
        // Assert
        assertTrue(result);
    }
}
