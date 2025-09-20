package io.adaptivetests.java.discovery;

import java.nio.file.Path;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

public final class DiscoveryResult {
    private final Signature.Type type;
    private final String className;
    private final String packageName;
    private final Path filePath;
    private final double score;
    private final List<MethodMetadata> methods;
    private final List<String> annotations;
    private final String extendsClass;
    private final List<String> implementsInterfaces;

    public DiscoveryResult(Signature.Type type,
                           String className,
                           String packageName,
                           Path filePath,
                           double score,
                           List<MethodMetadata> methods,
                           List<String> annotations,
                           String extendsClass,
                           List<String> implementsInterfaces) {
        this.type = type;
        this.className = className;
        this.packageName = packageName;
        this.filePath = filePath;
        this.score = score;
        this.methods = methods == null ? List.of() : List.copyOf(methods);
        this.annotations = annotations == null ? List.of() : List.copyOf(annotations);
        this.extendsClass = extendsClass;
        this.implementsInterfaces = implementsInterfaces == null ? List.of() : List.copyOf(implementsInterfaces);
    }

    public Signature.Type getType() {
        return type;
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

    public List<MethodMetadata> getMethods() {
        return Collections.unmodifiableList(methods);
    }

    public List<String> getMethodNames() {
        return methods.stream().map(MethodMetadata::getName).collect(Collectors.toUnmodifiableList());
    }

    public List<String> getAnnotations() {
        return annotations;
    }

    public String getExtendsClass() {
        return extendsClass;
    }

    public List<String> getImplementsInterfaces() {
        return implementsInterfaces;
    }

    public String getQualifiedName() {
        if (packageName == null || packageName.isEmpty()) {
            return className;
        }
        return packageName + "." + className;
    }
}
