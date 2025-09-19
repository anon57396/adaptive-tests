package io.adaptivetests.java.discovery;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

public final class ConfigLoader {
    private final ObjectMapper mapper = new ObjectMapper();

    public DiscoveryConfig load(Path root, Map<String, Object> inline) {
        Map<String, Object> merged = new HashMap<>();
        merged.put("discovery", new HashMap<>());

        readConfig(root.resolve("adaptive-tests.config.json")).ifPresent(cfg -> mergeInto(merged, cfg));
        readConfig(root.resolve(".adaptive-tests-java.json")).ifPresent(cfg -> mergeInto(merged, cfg));

        if (inline != null) {
            mergeInto(merged, inline);
        }

        Map<String, Object> discovery = castMap(merged.get("discovery"));
        return DiscoveryConfig.fromMap(root, discovery);
    }

    private java.util.Optional<Map<String, Object>> readConfig(Path path) {
        if (!Files.exists(path)) {
            return java.util.Optional.empty();
        }
        try {
            Map<String, Object> map = mapper.readValue(path.toFile(), new TypeReference<>() {});
            return java.util.Optional.of(map);
        } catch (IOException e) {
            System.err.println("[adaptive-tests-java] Failed to parse config: " + path + " - " + e.getMessage());
            return java.util.Optional.empty();
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> castMap(Object value) {
        if (value instanceof Map) {
            Map<String, Object> result = new HashMap<>();
            Map<?, ?> map = (Map<?, ?>) value;
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                result.put(String.valueOf(entry.getKey()), entry.getValue());
            }
            return result;
        }
        return new HashMap<>();
    }

    @SuppressWarnings("unchecked")
    private static void mergeInto(Map<String, Object> target, Map<String, Object> source) {
        for (Map.Entry<String, Object> entry : source.entrySet()) {
            Object existing = target.get(entry.getKey());
            if (existing instanceof Map && entry.getValue() instanceof Map) {
                mergeInto((Map<String, Object>) existing, (Map<String, Object>) entry.getValue());
            } else {
                target.put(entry.getKey(), entry.getValue());
            }
        }
    }
}
