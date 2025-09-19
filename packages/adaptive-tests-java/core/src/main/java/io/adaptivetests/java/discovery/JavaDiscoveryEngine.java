package io.adaptivetests.java.discovery;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.javaparser.JavaParser;
import com.github.javaparser.ParserConfiguration;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.EnumDeclaration;
import com.github.javaparser.ast.body.MethodDeclaration;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;

public final class JavaDiscoveryEngine {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final Path root;
    private final DiscoveryConfig config;
    private final JavaParser parser;
    private final ScoringEngine scoringEngine = new ScoringEngine();
    private final Map<String, CacheEntry> runtimeCache = new ConcurrentHashMap<>();
    private Map<String, CacheEntry> persistentCache;
    private boolean cacheLoaded;

    public JavaDiscoveryEngine(Path root) {
        this(root, Map.of());
    }

    public JavaDiscoveryEngine(Path root, Map<String, Object> overrides) {
        this.root = root.toAbsolutePath().normalize();
        this.config = new ConfigLoader().load(this.root, overrides);
        ParserConfiguration configuration = new ParserConfiguration();
        configuration.setLanguageLevel(ParserConfiguration.LanguageLevel.JAVA_11);
        this.parser = new JavaParser(configuration);
    }

    public DiscoveryResult discover(Signature signature) throws DiscoveryException {
        List<DiscoveryResult> results = discoverAll(signature);
        if (results.isEmpty()) {
            throw new DiscoveryException("No candidates matched signature " + signature);
        }
        return results.get(0);
    }

    public List<DiscoveryResult> discoverAll(Signature signature) throws DiscoveryException {
        try {
            ensureCacheLoaded();
            String key = cacheKey(signature);
            CacheEntry cached = runtimeCache.get(key);
            if (cached != null && isFresh(cached)) {
                return List.of(cached.toDiscoveryResult());
            }
            CacheEntry persisted = persistentCache.get(key);
            if (persisted != null && isFresh(persisted)) {
                runtimeCache.put(key, persisted);
                return List.of(persisted.toDiscoveryResult());
            }

            List<ScoredCandidate> candidates = collectCandidates(signature);
            candidates.sort(Comparator.comparingDouble((ScoredCandidate c) -> c.score).reversed());
            List<DiscoveryResult> results = candidates.stream().map(ScoredCandidate::toResult).collect(Collectors.toList());

            if (!results.isEmpty()) {
                CacheEntry entry = CacheEntry.from(results.get(0));
                runtimeCache.put(key, entry);
                persistentCache.put(key, entry);
                saveCache();
            }

            return results;
        } catch (IOException e) {
            throw new DiscoveryException("Failed to discover targets", e);
        }
    }

    private List<ScoredCandidate> collectCandidates(Signature signature) throws IOException {
        List<ScoredCandidate> candidates = new ArrayList<>();
        try (Stream<Path> stream = Files.walk(root)) {
            stream.filter(Files::isRegularFile)
                    .filter(this::isEligibleFile)
                    .forEach(path -> parseCandidate(path).ifPresent(candidate -> {
                        double score = scoringEngine.scoreCandidate(candidate, signature);
                        if (score > 0) {
                            candidates.add(new ScoredCandidate(candidate, score));
                        }
                    }));
        }
        return candidates;
    }

    private boolean isEligibleFile(Path path) {
        String filename = path.getFileName().toString();
        String lower = filename.toLowerCase(Locale.ROOT);
        boolean badSuffix = config.getSkipFiles().stream().anyMatch(lower::endsWith)
                || lower.matches(".*(?:\\s(?:copy|copy\\s\\d+)|\\s\\d+)(?=\\.[^.]+$)");
        if (badSuffix) {
            return false;
        }
        String relative = root.relativize(path).toString().replace('\\', '/');
        for (String skip : config.getSkipDirectories()) {
            if (relative.startsWith(skip + "/")) {
                return false;
            }
        }
        return config.getExtensions().stream().anyMatch(lower::endsWith);
    }

    private Optional<ScoringEngine.Candidate> parseCandidate(Path path) {
        try {
            var result = parser.parse(path);
            if (!result.isSuccessful() || result.getResult().isEmpty()) {
                return Optional.empty();
            }
            CompilationUnit unit = result.getResult().get();
            Optional<String> packageName = unit.getPackageDeclaration().map(pd -> pd.getName().asString());
            List<ScoringEngine.Candidate> candidates = new ArrayList<>();
            unit.findAll(ClassOrInterfaceDeclaration.class).stream()
                    .filter(declaration -> !declaration.isNestedType())
                    .forEach(declaration -> candidates.add(toCandidate(declaration, packageName, path)));
            unit.findAll(EnumDeclaration.class).stream()
                    .filter(declaration -> !declaration.isNestedType())
                    .forEach(declaration -> candidates.add(new ScoringEngine.Candidate(
                            declaration.getNameAsString(),
                            packageName.orElse(null),
                            path,
                            List.of())));
            return candidates.stream().findFirst();
        } catch (Exception e) {
            System.err.println("[adaptive-tests-java] Failed to parse " + path + ": " + e.getMessage());
            return Optional.empty();
        }
    }

    private ScoringEngine.Candidate toCandidate(ClassOrInterfaceDeclaration declaration,
                                                Optional<String> packageName,
                                                Path path) {
        List<String> methods = declaration.getMethods().stream()
                .filter(MethodDeclaration::isPublic)
                .map(MethodDeclaration::getNameAsString)
                .collect(Collectors.toList());
        return new ScoringEngine.Candidate(
                declaration.getNameAsString(),
                packageName.orElse(null),
                path,
                methods
        );
    }

    private void ensureCacheLoaded() throws IOException {
        if (cacheLoaded) {
            return;
        }
        Path cacheFile = config.getCacheFile();
        if (Files.exists(cacheFile)) {
            try {
                Map<String, CacheEntry> loaded = MAPPER.readValue(cacheFile.toFile(), new TypeReference<>() {});
                persistentCache = new HashMap<>(loaded);
            } catch (IOException e) {
                System.err.println("[adaptive-tests-java] Ignoring corrupt cache: " + cacheFile + " - " + e.getMessage());
                persistentCache = new HashMap<>();
            }
        } else {
            persistentCache = new HashMap<>();
        }
        cacheLoaded = true;
    }

    private void saveCache() {
        try {
            Path cacheFile = config.getCacheFile();
            Files.createDirectories(cacheFile.getParent());
            MAPPER.writerWithDefaultPrettyPrinter().writeValue(cacheFile.toFile(), persistentCache);
        } catch (IOException e) {
            System.err.println("[adaptive-tests-java] Failed to persist cache: " + e.getMessage());
        }
    }

    private boolean isFresh(CacheEntry entry) {
        Path file = Paths.get(entry.path);
        if (!Files.exists(file)) {
            return false;
        }
        if (entry.mtime == 0) {
            return true;
        }
        try {
            long mtime = Files.getLastModifiedTime(file).toMillis();
            return mtime == entry.mtime;
        } catch (IOException e) {
            return false;
        }
    }

    private String cacheKey(Signature signature) {
        StringBuilder builder = new StringBuilder();
        signature.getName().ifPresent(builder::append);
        signature.getNamePattern().ifPresent(pattern -> builder.append(pattern.pattern()));
        builder.append("|").append(signature.getType());
        builder.append("|").append(signature.getMethods());
        signature.getPackageName().ifPresent(pkg -> builder.append("|").append(pkg));
        signature.getExtendsClass().ifPresent(ext -> builder.append("|").append(ext));
        return builder.toString();
    }

    private static final class ScoredCandidate {
        private final ScoringEngine.Candidate candidate;
        private final double score;

        private ScoredCandidate(ScoringEngine.Candidate candidate, double score) {
            this.candidate = candidate;
            this.score = score;
        }

        private DiscoveryResult toResult() {
            return new DiscoveryResult(
                    candidate.className,
                    candidate.packageName,
                    candidate.filePath,
                    score,
                    candidate.methodNames
            );
        }
    }

    public static final class CacheEntry {
        private String className;
        private String packageName;
        private String path;
        private double score;
        private List<String> methods;
        private long mtime;

        public CacheEntry() {
            this("", null, "", 0, new ArrayList<>(), 0);
        }

        CacheEntry(String className, String packageName, String path, double score, List<String> methods, long mtime) {
            this.className = className;
            this.packageName = packageName;
            this.path = path;
            this.score = score;
            this.methods = new ArrayList<>(methods);
            this.mtime = mtime;
        }

        DiscoveryResult toDiscoveryResult() {
            return new DiscoveryResult(className, packageName, Paths.get(path), score, methods);
        }

        static CacheEntry from(DiscoveryResult result) {
            Path file = result.getFilePath();
            long modified = 0;
            try {
                BasicFileAttributes attrs = Files.readAttributes(file, BasicFileAttributes.class);
                modified = attrs.lastModifiedTime().toMillis();
            } catch (IOException ignored) {
            }
            return new CacheEntry(
                    result.getClassName(),
                    result.getPackageName(),
                    file.toString(),
                    result.getScore(),
                    result.getMethods(),
                    modified
            );
        }

        public String getClassName() {
            return className;
        }

        public void setClassName(String className) {
            this.className = className;
        }

        public String getPackageName() {
            return packageName;
        }

        public void setPackageName(String packageName) {
            this.packageName = packageName;
        }

        public String getPath() {
            return path;
        }

        public void setPath(String path) {
            this.path = path;
        }

        public double getScore() {
            return score;
        }

        public void setScore(double score) {
            this.score = score;
        }

        public List<String> getMethods() {
            return methods;
        }

        public void setMethods(List<String> methods) {
            this.methods = methods;
        }

        public long getMtime() {
            return mtime;
        }

        public void setMtime(long mtime) {
            this.mtime = mtime;
        }
    }

    public static final class DiscoveryException extends Exception {
        public DiscoveryException(String message) {
            super(message);
        }

        public DiscoveryException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
