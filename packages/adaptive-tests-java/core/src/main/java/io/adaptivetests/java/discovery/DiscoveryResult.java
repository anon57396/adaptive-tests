package io.adaptivetests.java.discovery;

import java.nio.file.Path;
import java.util.List;

public final class DiscoveryResult {
    private final String className;
    private final String packageName;
    private final Path filePath;
    private final double score;
    private final List<String> methods;

    public DiscoveryResult(String className,
                           String packageName,
                           Path filePath,
                           double score,
                           List<String> methods) {
        this.className = className;
        this.packageName = packageName;
        this.filePath = filePath;
        this.score = score;
        this.methods = List.copyOf(methods);
    }

    public String getClassName() {
        return className;
    }

    public String getPackageName() {
        return packageName;
    }

    public Path getFilePath() {
        return filePath;
    }

    public double getScore() {
        return score;
    }

    public List<String> getMethods() {
        return methods;
    }

    public String getQualifiedName() {
        if (packageName == null || packageName.isEmpty()) {
            return className;
        }
        return packageName + "." + className;
    }
}
