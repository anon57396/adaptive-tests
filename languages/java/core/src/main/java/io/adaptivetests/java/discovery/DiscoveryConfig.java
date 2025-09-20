package io.adaptivetests.java.discovery;

import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

public final class DiscoveryConfig {
    private final List<String> extensions;
    private final List<String> skipDirectories;
    private final List<String> skipFiles;
    private final Path cacheFile;
    private final boolean cacheEnabled;
    private final long cacheTtlMillis;
    private final boolean cacheLogWarnings;
    private final int runtimeCacheSize;

    private DiscoveryConfig(List<String> extensions,
                            List<String> skipDirectories,
                            List<String> skipFiles,
                            Path cacheFile,
                            boolean cacheEnabled,
                            long cacheTtlMillis,
                            boolean cacheLogWarnings,
                            int runtimeCacheSize) {
        this.extensions = List.copyOf(extensions);
        this.skipDirectories = List.copyOf(skipDirectories);
        this.skipFiles = List.copyOf(skipFiles);
        this.cacheFile = cacheFile;
        this.cacheEnabled = cacheEnabled;
        this.cacheTtlMillis = cacheTtlMillis;
        this.cacheLogWarnings = cacheLogWarnings;
        this.runtimeCacheSize = runtimeCacheSize;
    }

    public List<String> getExtensions() {
        return extensions;
    }

    public List<String> getSkipDirectories() {
        return skipDirectories;
    }

    public List<String> getSkipFiles() {
        return skipFiles;
    }

    public Path getCacheFile() {
        return cacheFile;
    }

    public boolean isCacheEnabled() {
        return cacheEnabled;
    }

    public long getCacheTtlMillis() {
        return cacheTtlMillis;
    }

    public boolean isCacheLogWarnings() {
        return cacheLogWarnings;
    }

    public int getRuntimeCacheSize() {
        return runtimeCacheSize;
    }

    public static DiscoveryConfig defaults(Path root) {
        return new DiscoveryConfig(
                Arrays.asList(".java"),
                Arrays.asList(".git", "target", "build", "out", "node_modules"),
                Arrays.asList("Test.java", "Tests.java", "IT.java"),
                root.resolve(".adaptive-tests-cache.json"),
                true,
                24L * 60L * 60L * 1000L,
                false,
                256
        );
    }

    @SuppressWarnings("unchecked")
    public static DiscoveryConfig fromMap(Path root, Map<String, Object> map) {
        DiscoveryConfig defaults = defaults(root);
        if (map == null) {
            return defaults;
        }

        List<String> extensions = toStringList(map.get("extensions"), defaults.extensions);
        List<String> skipDirs = toStringList(map.get("skipDirectories"), defaults.skipDirectories);
        List<String> skipFiles = toStringList(map.get("skipFiles"), defaults.skipFiles);

        String cachePathCandidate = toStringValue(map.getOrDefault("cacheFile", defaults.cacheFile.toString()));
        Path cacheFile = resolveCachePath(root, cachePathCandidate, defaults.cacheFile);

        boolean cacheEnabled = defaults.cacheEnabled;
        long cacheTtlMillis = defaults.cacheTtlMillis;
        boolean cacheLogWarnings = defaults.cacheLogWarnings;
        int runtimeCacheSize = defaults.runtimeCacheSize;

        Object cacheSection = map.get("cache");
        if (cacheSection instanceof Map<?, ?>) {
            Map<String, Object> cacheMap = toObjectMap(cacheSection);
            cacheEnabled = toBoolean(cacheMap.get("enabled"), cacheEnabled);
            cacheLogWarnings = toBoolean(cacheMap.get("logWarnings"), cacheLogWarnings);
            runtimeCacheSize = toInt(cacheMap.get("maxEntries"), runtimeCacheSize);

            Object ttlValue = cacheMap.get("ttlSeconds");
            if (ttlValue == null) {
                ttlValue = cacheMap.get("ttl");
            }
            cacheTtlMillis = toLongSeconds(ttlValue, cacheTtlMillis);

            Object cacheFileOverride = cacheMap.get("file");
            if (cacheFileOverride != null) {
                cacheFile = resolveCachePath(root, cacheFileOverride.toString(), defaults.cacheFile);
            }
        } else {
            cacheEnabled = toBoolean(map.get("cacheEnabled"), cacheEnabled);
        }

        return new DiscoveryConfig(extensions, skipDirs, skipFiles, cacheFile, cacheEnabled, cacheTtlMillis,
                cacheLogWarnings, runtimeCacheSize);
    }

    private static Path resolveCachePath(Path root, String candidate, Path fallback) {
        if (candidate == null || candidate.isBlank()) {
            return fallback;
        }
        try {
            Path resolved = Path.of(candidate);
            return resolved.isAbsolute() ? resolved : root.resolve(candidate);
        } catch (InvalidPathException ex) {
            return fallback;
        }
    }

    private static List<String> toStringList(Object value, List<String> defaultValue) {
        if (!(value instanceof List<?>)) {
            return defaultValue;
        }
        List<?> list = (List<?>) value;
        List<String> result = new ArrayList<>();
        for (Object item : list) {
            if (item != null) {
                result.add(item.toString());
            }
        }
        return result.isEmpty() ? defaultValue : result;
    }

    private static boolean toBoolean(Object value, boolean defaultValue) {
        if (value instanceof Boolean) {
            return (Boolean) value;
        }
        if (value instanceof Number) {
            return ((Number) value).intValue() != 0;
        }
        if (value instanceof String) {
            return Boolean.parseBoolean(((String) value).trim());
        }
        return defaultValue;
    }

    private static long toLongSeconds(Object value, long defaultMillis) {
        if (value == null) {
            return defaultMillis;
        }
        long seconds = toLong(value, defaultMillis <= 0 ? 0 : defaultMillis / 1000L);
        if (seconds <= 0) {
            return 0;
        }
        return seconds * 1000L;
    }

    private static long toLong(Object value, long defaultValue) {
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        if (value instanceof String) {
            try {
                return Long.parseLong(((String) value).trim());
            } catch (NumberFormatException ignored) {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    private static int toInt(Object value, int defaultValue) {
        if (value instanceof Number) {
            return ((Number) value).intValue();
        }
        if (value instanceof String) {
            try {
                return Integer.parseInt(((String) value).trim());
            } catch (NumberFormatException ignored) {
                return defaultValue;
            }
        }
        return defaultValue;
    }

    private static Map<String, Object> toObjectMap(Object value) {
        Map<String, Object> result = new java.util.HashMap<>();
        if (value instanceof Map<?, ?>) {
            Map<?, ?> raw = (Map<?, ?>) value;
            for (Map.Entry<?, ?> entry : raw.entrySet()) {
                result.put(String.valueOf(entry.getKey()), entry.getValue());
            }
        }
        return result;
    }

    private static String toStringValue(Object value) {
        return value == null ? null : value.toString();
    }
}
