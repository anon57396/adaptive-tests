package com.example.service;

import java.util.ArrayList;
import java.util.List;

public class CustomerService {
    private final List<String> customers = new ArrayList<>();

    public CustomerService() {
        customers.add("Ada");
        customers.add("Grace");
    }

    public List<String> findAll() {
        return new ArrayList<>(customers);
    }

    public boolean exists(String name) {
        return customers.stream().anyMatch(candidate -> candidate.equalsIgnoreCase(name));
    }

    public int count() {
        return customers.size();
    }
}
