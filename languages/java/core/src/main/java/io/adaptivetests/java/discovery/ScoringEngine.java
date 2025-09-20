package io.adaptivetests.java.discovery;

import java.nio.file.Path;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

final class ScoringEngine {

    double scoreCandidate(Candidate candidate, Signature signature) {
        double nameScore = nameScore(candidate.className, signature);
        if (nameScore <= 0) {
            return 0;
        }

        if (!typeCompatible(signature.getType(), candidate.type)) {
            return 0;
        }

        double score = nameScore;
        score += typeScore(candidate.type, signature.getType());
        score += pathScore(candidate.filePath);
        score += packageScore(candidate.packageName, signature);
        score += methodScore(candidate.methods, signature.getMethods());
        score += annotationScore(candidate.annotations, signature.getAnnotations());
        score += extendsScore(candidate.extendsClass, signature.getExtendsClass());
        score += implementsScore(candidate.implementsInterfaces, signature.getImplementsInterfaces());
        return score;
    }

    private boolean typeCompatible(Signature.Type desired, Signature.Type candidate) {
        if (desired == Signature.Type.ANY) {
            return true;
        }
        if (desired == candidate) {
            return true;
        }
        return desired == Signature.Type.CLASS && candidate == Signature.Type.RECORD;
    }

    private double typeScore(Signature.Type candidateType, Signature.Type desiredType) {
        if (desiredType == Signature.Type.ANY) {
            return 0;
        }
        if (candidateType == desiredType) {
            return 12;
        }
        if (desiredType == Signature.Type.CLASS && candidateType == Signature.Type.RECORD) {
            return 8;
        }
        return -20;
    }

    private double pathScore(Path filePath) {
        String normalized = filePath.toString().replace('\\', '/').toLowerCase(Locale.ROOT);
        double score = 0;
        if (normalized.contains("/src/main/java/")) {
            score += 10;
        }
        if (normalized.contains("/core/")) {
            score += 5;
        }
        if (normalized.contains("/service")) {
            score += 2;
        }
        return score;
    }

    private double nameScore(String candidateName, Signature signature) {
        String lower = candidateName.toLowerCase(Locale.ROOT);
        if (signature.getNamePattern().isPresent()) {
            if (signature.getNamePattern().get().matcher(candidateName).find()) {
                return 20;
            }
            return 0;
        }
        if (signature.getName().isEmpty()) {
            return 5;
        }
        String expected = signature.getName().get().toLowerCase(Locale.ROOT);
        if (lower.equals(expected)) {
            return 25;
        }
        if (lower.contains(expected)) {
            return 10;
        }
        return 0;
    }

    private double packageScore(String packageName, Signature signature) {
        if (signature.getPackageName().isEmpty() || packageName == null) {
            return 0;
        }
        return packageName.equals(signature.getPackageName().get()) ? 10 : 0;
    }

    private double methodScore(List<MethodMetadata> candidateMethods, List<String> requiredMethods) {
        if (requiredMethods.isEmpty()) {
            return 0;
        }
        Set<String> candidateNames = candidateMethods.stream()
                .map(method -> method.getName().toLowerCase(Locale.ROOT))
                .collect(Collectors.toCollection(HashSet::new));
        int hits = 0;
        for (String method : requiredMethods) {
            if (candidateNames.contains(method.toLowerCase(Locale.ROOT))) {
                hits++;
            }
        }
        if (hits == requiredMethods.size()) {
            return 18;
        }
        if (hits == 0) {
            return -12;
        }
        return hits * 4;
    }

    private double annotationScore(List<String> candidateAnnotations, List<String> requiredAnnotations) {
        if (requiredAnnotations == null || requiredAnnotations.isEmpty()) {
            return 0;
        }
        Set<String> candidateNormalized = candidateAnnotations.stream()
                .map(this::normalizeAnnotation)
                .collect(Collectors.toCollection(HashSet::new));
        int matches = 0;
        for (String annotation : requiredAnnotations) {
            if (candidateNormalized.contains(normalizeAnnotation(annotation))) {
                matches++;
            }
        }
        if (matches == 0) {
            return -5;
        }
        return matches * 6;
    }

    private double extendsScore(String candidateExtends, java.util.Optional<String> requiredExtends) {
        if (requiredExtends.isEmpty()) {
            return 0;
        }
        if (candidateExtends == null) {
            return -5;
        }
        return normalizeTypeName(candidateExtends).equals(normalizeTypeName(requiredExtends.get())) ? 12 : -5;
    }

    private double implementsScore(List<String> candidateImplements, List<String> requiredImplements) {
        if (requiredImplements == null || requiredImplements.isEmpty()) {
            return 0;
        }
        Set<String> candidateSet = candidateImplements.stream()
                .map(this::normalizeTypeName)
                .collect(Collectors.toCollection(HashSet::new));
        int matches = 0;
        for (String iface : requiredImplements) {
            if (candidateSet.contains(normalizeTypeName(iface))) {
                matches++;
            }
        }
        if (matches == 0) {
            return -6;
        }
        return matches * 5;
    }

    private String normalizeAnnotation(String value) {
        if (value == null) {
            return "";
        }
        String normalized = value.startsWith("@") ? value.substring(1) : value;
        int lastDot = normalized.lastIndexOf('.');
        if (lastDot >= 0 && lastDot < normalized.length() - 1) {
            normalized = normalized.substring(lastDot + 1);
        }
        return normalized.toLowerCase(Locale.ROOT);
    }

    private String normalizeTypeName(String value) {
        if (value == null) {
            return "";
        }
        String normalized = value;
        int genericIndex = normalized.indexOf('<');
        if (genericIndex >= 0) {
            normalized = normalized.substring(0, genericIndex);
        }
        int lastDot = normalized.lastIndexOf('.');
        if (lastDot >= 0 && lastDot < normalized.length() - 1) {
            normalized = normalized.substring(lastDot + 1);
        }
        return normalized.toLowerCase(Locale.ROOT);
    }

    static final class Candidate {
        final Signature.Type type;
        final String className;
        final String packageName;
        final Path filePath;
        final List<MethodMetadata> methods;
        final List<String> annotations;
        final String extendsClass;
        final List<String> implementsInterfaces;

        Candidate(Signature.Type type,
                  String className,
                  String packageName,
                  Path filePath,
                  List<MethodMetadata> methods,
                  List<String> annotations,
                  String extendsClass,
                  List<String> implementsInterfaces) {
            this.type = type;
            this.className = className;
            this.packageName = packageName;
            this.filePath = filePath;
            this.methods = List.copyOf(methods);
            this.annotations = List.copyOf(annotations);
            this.extendsClass = extendsClass;
            this.implementsInterfaces = List.copyOf(implementsInterfaces);
        }
    }
}
