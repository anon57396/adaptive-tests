package io.adaptivetests.java.discovery;

import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

public final class DiscoveryConfig {
    private final List<String> extensions;
    private final List<String> skipDirectories;
    private final List<String> skipFiles;
    private final Path cacheFile;

    public DiscoveryConfig(List<String> extensions,
                           List<String> skipDirectories,
                           List<String> skipFiles,
                           Path cacheFile) {
        this.extensions = List.copyOf(extensions);
        this.skipDirectories = List.copyOf(skipDirectories);
        this.skipFiles = List.copyOf(skipFiles);
        this.cacheFile = cacheFile;
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

    public static DiscoveryConfig defaults(Path root) {
        return new DiscoveryConfig(
                Arrays.asList(".java"),
                Arrays.asList(".git", "target", "build", "out", "node_modules"),
                Arrays.asList("Test.java", "Tests.java", "IT.java"),
                root.resolve(".adaptive-tests-cache.json"));
    }

    @SuppressWarnings("unchecked")
    public static DiscoveryConfig fromMap(Path root, Map<String, Object> map) {
        DiscoveryConfig defaults = defaults(root);
        if (map == null) {
            return defaults;
        }
        List<String> extensions = (List<String>) map.getOrDefault("extensions", defaults.extensions);
        List<String> skipDirs = (List<String>) map.getOrDefault("skipDirectories", defaults.skipDirectories);
        List<String> skipFiles = (List<String>) map.getOrDefault("skipFiles", defaults.skipFiles);
        String cachePath = (String) map.getOrDefault("cacheFile", defaults.cacheFile.toString());
        Path resolvedCache = (cachePath == null || cachePath.isEmpty())
                ? defaults.cacheFile
                : (Path.of(cachePath).isAbsolute() ? Path.of(cachePath) : root.resolve(cachePath));
        return new DiscoveryConfig(extensions, skipDirs, skipFiles, resolvedCache);
    }
}
