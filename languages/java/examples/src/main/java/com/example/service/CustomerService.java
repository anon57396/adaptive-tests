package com.example.service;

import com.example.service.annotations.Service;
import com.example.model.User;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service("customerService")
public class CustomerService {
    private final List<User> users = new ArrayList<>();

    public CustomerService() {
        users.add(new User(UUID.randomUUID().toString(), "Ada", LocalDate.parse("1990-01-01")));
        users.add(new User(UUID.randomUUID().toString(), "Grace", LocalDate.parse("1992-05-14")));
    }

    public List<User> findActiveUsers() {
        return List.copyOf(users);
    }

    public Optional<User> findByName(String name) {
        return users.stream().filter(user -> user.getName().equalsIgnoreCase(name)).findFirst();
    }

    public boolean hasOutstandingBalance(String userId) {
        return userId.hashCode() % 2 == 0;
    }
}
