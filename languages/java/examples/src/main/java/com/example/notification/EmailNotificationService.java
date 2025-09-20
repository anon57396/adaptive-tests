package com.example.notification;

import com.example.service.annotations.Service;

@Service("email")
public class EmailNotificationService implements NotificationSender {
    @Override
    public void send(String recipient, String message) {
        System.out.printf("Sending email to %s: %s%n", recipient, message);
    }

    @Override
    public boolean supportsHtml() {
        return true;
    }
}
