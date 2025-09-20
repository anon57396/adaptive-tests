package com.example.order;

import java.util.UUID;

public class OrderService {
    public String create() {
        return UUID.randomUUID().toString();
    }

    public boolean cancel(String orderId) {
        return orderId != null && !orderId.isBlank();
    }
}
