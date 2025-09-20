package com.example.notification;

public interface NotificationSender {
    void send(String recipient, String message);

    default boolean supportsHtml() {
        return false;
    }
}
