package com.example.calculator;

public class Calculator {
    private final String owner;

    public Calculator(String owner) {
        this.owner = owner;
    }

    public int add(int a, int b) {
        return a + b;
    }

    public int subtract(int a, int b) {
        return a - b;
    }

    public boolean isEven(int value) {
        return value % 2 == 0;
    }

    public String owner() {
        return owner;
    }
}
