package io.adaptivetests.java.discovery;

import java.nio.file.Path;
import java.util.List;
import java.util.Locale;

final class ScoringEngine {
    double scoreCandidate(Candidate candidate, Signature signature) {
        double nameScore = nameScore(candidate.className, signature);
        if (nameScore <= 0) {
            return 0;
        }

        double score = nameScore;
        score += pathScore(candidate.filePath);
        score += packageScore(candidate.packageName, signature);
        score += methodScore(candidate.methodNames, signature.getMethods());

        return score;
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

    private double methodScore(List<String> candidateMethods, List<String> requiredMethods) {
        if (requiredMethods.isEmpty()) {
            return 0;
        }
        int hits = 0;
        for (String method : requiredMethods) {
            if (candidateMethods.contains(method)) {
                hits++;
            }
        }
        if (hits == requiredMethods.size()) {
            return 15;
        }
        if (hits == 0) {
            return -10;
        }
        return hits * 3;
    }

    static final class Candidate {
        final String className;
        final String packageName;
        final Path filePath;
        final List<String> methodNames;

        Candidate(String className, String packageName, Path filePath, List<String> methodNames) {
            this.className = className;
            this.packageName = packageName;
            this.filePath = filePath;
            this.methodNames = methodNames;
        }
    }
}
