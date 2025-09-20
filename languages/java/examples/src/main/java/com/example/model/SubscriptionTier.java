package com.example.model;

public enum SubscriptionTier {
    FREE,
    STANDARD,
    PREMIUM;

    public boolean isPaid() {
        return this != FREE;
    }
}
