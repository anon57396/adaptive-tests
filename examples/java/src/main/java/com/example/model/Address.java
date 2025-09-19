package com.example.model;

public record Address(String line1, String city, String postalCode) {
    public boolean isComplete() {
        return line1 != null && !line1.isBlank()
            && city != null && !city.isBlank()
            && postalCode != null && !postalCode.isBlank();
    }
}
