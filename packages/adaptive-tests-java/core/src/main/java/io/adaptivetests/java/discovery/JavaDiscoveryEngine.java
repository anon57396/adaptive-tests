package io.adaptivetests.java.discovery;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.javaparser.JavaParser;
import com.github.javaparser.ParserConfiguration;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.Node;
import com.github.javaparser.ast.NodeList;
import com.github.javaparser.ast.body.AnnotationDeclaration;
import com.github.javaparser.ast.body.AnnotationMemberDeclaration;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.ConstructorDeclaration;
import com.github.javaparser.ast.body.EnumDeclaration;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.body.Parameter;
import com.github.javaparser.ast.body.RecordDeclaration;
import com.github.javaparser.ast.body.TypeDeclaration;
import com.github.javaparser.ast.nodeTypes.NodeWithAnnotations;
import com.github.javaparser.ast.type.ClassOrInterfaceType;
import com.github.javaparser.ast.AccessSpecifier;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
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
            List<DiscoveryResult> results = candidates.stream()
                    .map(ScoredCandidate::toResult)
                    .collect(Collectors.toList());

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
                    .forEach(path -> parseCandidates(path).forEach(candidate -> {
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

    private List<ScoringEngine.Candidate> parseCandidates(Path path) {
        List<ScoringEngine.Candidate> candidates = new ArrayList<>();
        try {
            var result = parser.parse(path);
            if (!result.isSuccessful() || result.getResult().isEmpty()) {
                return candidates;
            }
            CompilationUnit unit = result.getResult().get();
            Optional<String> packageName = unit.getPackageDeclaration().map(pd -> pd.getName().asString());

            unit.findAll(ClassOrInterfaceDeclaration.class).stream()
                    .filter(this::includeType)
                    .forEach(declaration -> candidates.add(toCandidate(declaration, packageName, path)));
            unit.findAll(EnumDeclaration.class).stream()
                    .filter(this::includeType)
                    .forEach(declaration -> candidates.add(toCandidate(declaration, packageName, path)));
            unit.findAll(RecordDeclaration.class).stream()
                    .filter(this::includeType)
                    .forEach(declaration -> candidates.add(toCandidate(declaration, packageName, path)));
            unit.findAll(AnnotationDeclaration.class).stream()
                    .filter(this::includeType)
                    .forEach(declaration -> candidates.add(toCandidate(declaration, packageName, path)));
        } catch (Exception e) {
            System.err.println("[adaptive-tests-java] Failed to parse " + path + ": " + e.getMessage());
        }
        return candidates;
    }

    private boolean includeType(TypeDeclaration<?> declaration) {
        return (declaration.isTopLevelType() || declaration.isNestedType()) && !declaration.isLocalTypeDeclaration();
    }

    private ScoringEngine.Candidate toCandidate(ClassOrInterfaceDeclaration declaration,
                                                Optional<String> packageName,
                                                Path path) {
        Signature.Type type = declaration.isInterface() ? Signature.Type.INTERFACE : Signature.Type.CLASS;
        String typeName = resolveTypeName(declaration);
        List<MethodMetadata> methods = extractClassMethods(declaration);
        List<String> annotations = extractAnnotations(declaration);
        String extendsClass = declaration.getExtendedTypes().isNonEmpty()
                ? declaration.getExtendedTypes().get(0).toString()
                : null;
        List<String> implementsInterfaces = collectInterfaces(declaration);
        return new ScoringEngine.Candidate(
                type,
                typeName,
                packageName.orElse(null),
                path,
                methods,
                annotations,
                extendsClass,
                implementsInterfaces
        );
    }

    private ScoringEngine.Candidate toCandidate(EnumDeclaration declaration,
                                                Optional<String> packageName,
                                                Path path) {
        List<MethodMetadata> methods = extractEnumMethods(declaration);
        List<String> annotations = extractAnnotations(declaration);
        List<String> implementsInterfaces = declaration.getImplementedTypes().stream()
                .map(ClassOrInterfaceType::toString)
                .collect(Collectors.toList());
        return new ScoringEngine.Candidate(
                Signature.Type.ENUM,
                resolveTypeName(declaration),
                packageName.orElse(null),
                path,
                methods,
                annotations,
                null,
                implementsInterfaces
        );
    }

    private ScoringEngine.Candidate toCandidate(RecordDeclaration declaration,
                                                Optional<String> packageName,
                                                Path path) {
        List<MethodMetadata> methods = extractRecordMethods(declaration);
        List<String> annotations = extractAnnotations(declaration);
        String extendsClass = declaration.getExtendedTypes().isNonEmpty()
                ? declaration.getExtendedTypes().get(0).toString()
                : null;
        List<String> implementsInterfaces = declaration.getImplementedTypes().stream()
                .map(ClassOrInterfaceType::toString)
                .collect(Collectors.toList());
        return new ScoringEngine.Candidate(
                Signature.Type.RECORD,
                resolveTypeName(declaration),
                packageName.orElse(null),
                path,
                methods,
                annotations,
                extendsClass,
                implementsInterfaces
        );
    }

    private ScoringEngine.Candidate toCandidate(AnnotationDeclaration declaration,
                                                Optional<String> packageName,
                                                Path path) {
        List<MethodMetadata> members = extractAnnotationMembers(declaration);
        List<String> annotations = extractAnnotations(declaration);
        return new ScoringEngine.Candidate(
                Signature.Type.ANNOTATION,
                resolveTypeName(declaration),
                packageName.orElse(null),
                path,
                members,
                annotations,
                null,
                List.of()
        );
    }

    private List<MethodMetadata> extractClassMethods(ClassOrInterfaceDeclaration declaration) {
        List<MethodMetadata> methods = new ArrayList<>();
        boolean treatAsPublic = declaration.isInterface();
        declaration.getMethods().forEach(method -> methods.add(toMethodMetadata(method, treatAsPublic)));
        declaration.getConstructors().forEach(constructor ->
                methods.add(toConstructorMetadata(constructor, declaration.getNameAsString())));
        return methods;
    }

    private List<MethodMetadata> extractEnumMethods(EnumDeclaration declaration) {
        List<MethodMetadata> methods = new ArrayList<>();
        declaration.getMembers().forEach(member -> {
            if (member instanceof MethodDeclaration) {
                methods.add(toMethodMetadata((MethodDeclaration) member, true));
            } else if (member instanceof ConstructorDeclaration) {
                methods.add(toConstructorMetadata((ConstructorDeclaration) member, declaration.getNameAsString()));
            }
        });
        return methods;
    }

    private List<MethodMetadata> extractRecordMethods(RecordDeclaration declaration) {
        List<MethodMetadata> methods = new ArrayList<>();
        declaration.getMethods().forEach(method -> methods.add(toMethodMetadata(method, false)));
        declaration.getConstructors().forEach(constructor ->
                methods.add(toConstructorMetadata(constructor, declaration.getNameAsString())));
        return methods;
    }

    private List<MethodMetadata> extractAnnotationMembers(AnnotationDeclaration declaration) {
        List<MethodMetadata> methods = new ArrayList<>();
        declaration.getMembers().forEach(member -> {
            if (member instanceof AnnotationMemberDeclaration) {
                AnnotationMemberDeclaration annotationMember = (AnnotationMemberDeclaration) member;
                methods.add(new MethodMetadata(
                        annotationMember.getNameAsString(),
                        annotationMember.getType().asString(),
                        List.of(),
                        extractAnnotations(annotationMember),
                        false,
                        true,
                        false
                ));
            } else if (member instanceof MethodDeclaration) {
                methods.add(toMethodMetadata((MethodDeclaration) member, true));
            }
        });
        return methods;
    }

    private MethodMetadata toMethodMetadata(MethodDeclaration method, boolean treatAsPublic) {
        List<ParameterMetadata> parameters = method.getParameters().stream()
                .map(this::toParameterMetadata)
                .collect(Collectors.toList());
        List<String> annotations = method.getAnnotations().stream()
                .map(ann -> ann.getName().asString())
                .collect(Collectors.toList());
        boolean isPublic = treatAsPublic || method.isPublic();
        return new MethodMetadata(
                method.getNameAsString(),
                method.getType().asString(),
                parameters,
                annotations,
                method.isStatic(),
                isPublic,
                false
        );
    }

    private MethodMetadata toConstructorMetadata(ConstructorDeclaration constructor, String ownerName) {
        List<ParameterMetadata> parameters = constructor.getParameters().stream()
                .map(this::toParameterMetadata)
                .collect(Collectors.toList());
        List<String> annotations = constructor.getAnnotations().stream()
                .map(ann -> ann.getName().asString())
                .collect(Collectors.toList());
        boolean isPublic = constructor.getAccessSpecifier() == AccessSpecifier.PUBLIC;
        return new MethodMetadata(
                ownerName,
                null,
                parameters,
                annotations,
                false,
                isPublic,
                true
        );
    }

    private ParameterMetadata toParameterMetadata(Parameter parameter) {
        return new ParameterMetadata(
                parameter.getNameAsString(),
                parameter.getType().asString(),
                parameter.isVarArgs()
        );
    }

    private List<String> extractAnnotations(NodeWithAnnotations<?> node) {
        return node.getAnnotations().stream()
                .map(annotation -> annotation.getName().asString())
                .collect(Collectors.toList());
    }

    private List<String> collectInterfaces(ClassOrInterfaceDeclaration declaration) {
        List<String> interfaces = new ArrayList<>();
        declaration.getImplementedTypes().forEach(type -> interfaces.add(type.toString()));
        if (declaration.isInterface()) {
            declaration.getExtendedTypes().forEach(type -> interfaces.add(type.toString()));
        }
        return interfaces;
    }

    private String resolveTypeName(TypeDeclaration<?> declaration) {
        Deque<String> names = new ArrayDeque<>();
        names.push(declaration.getNameAsString());
        Node current = declaration.getParentNode().orElse(null);
        while (current instanceof TypeDeclaration) {
            TypeDeclaration<?> typeDeclaration = (TypeDeclaration<?>) current;
            names.push(typeDeclaration.getNameAsString());
            current = current.getParentNode().orElse(null);
        }
        return String.join(".", names);
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
        signature.getExtendsClass().ifPresent(ext -> builder.append("|ext=").append(ext));
        if (!signature.getAnnotations().isEmpty()) {
            builder.append("|ann=").append(String.join(",", signature.getAnnotations()));
        }
        if (!signature.getImplementsInterfaces().isEmpty()) {
            builder.append("|impl=").append(String.join(",", signature.getImplementsInterfaces()));
        }
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
                    candidate.type,
                    candidate.className,
                    candidate.packageName,
                    candidate.filePath,
                    score,
                    candidate.methods,
                    candidate.annotations,
                    candidate.extendsClass,
                    candidate.implementsInterfaces
            );
        }
    }

    public static final class CacheEntry {
        private Signature.Type type;
        private String className;
        private String packageName;
        private String path;
        private double score;
        private List<MethodMetadata> methods;
        private List<String> annotations;
        private String extendsClass;
        private List<String> implementsInterfaces;
        private long mtime;

        public CacheEntry() {
            this(Signature.Type.CLASS, "", null, "", 0, new ArrayList<>(), new ArrayList<>(), null, new ArrayList<>(), 0);
        }

        CacheEntry(Signature.Type type,
                   String className,
                   String packageName,
                   String path,
                   double score,
                   List<MethodMetadata> methods,
                   List<String> annotations,
                   String extendsClass,
                   List<String> implementsInterfaces,
                   long mtime) {
            this.type = type;
            this.className = className;
            this.packageName = packageName;
            this.path = path;
            this.score = score;
            this.methods = new ArrayList<>(methods);
            this.annotations = new ArrayList<>(annotations);
            this.extendsClass = extendsClass;
            this.implementsInterfaces = new ArrayList<>(implementsInterfaces);
            this.mtime = mtime;
        }

        DiscoveryResult toDiscoveryResult() {
            return new DiscoveryResult(
                    type,
                    className,
                    packageName,
                    Paths.get(path),
                    score,
                    methods,
                    annotations,
                    extendsClass,
                    implementsInterfaces
            );
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
                    result.getType(),
                    result.getClassName(),
                    result.getPackageName(),
                    file.toString(),
                    result.getScore(),
                    result.getMethods(),
                    result.getAnnotations(),
                    result.getExtendsClass(),
                    result.getImplementsInterfaces(),
                    modified
            );
        }

        public Signature.Type getType() {
            return type;
        }

        public void setType(Signature.Type type) {
            this.type = type;
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

        public List<MethodMetadata> getMethods() {
            return methods;
        }

        public void setMethods(List<MethodMetadata> methods) {
            this.methods = methods;
        }

        public List<String> getAnnotations() {
            return annotations;
        }

        public void setAnnotations(List<String> annotations) {
            this.annotations = annotations;
        }

        public String getExtendsClass() {
            return extendsClass;
        }

        public void setExtendsClass(String extendsClass) {
            this.extendsClass = extendsClass;
        }

        public List<String> getImplementsInterfaces() {
            return implementsInterfaces;
        }

        public void setImplementsInterfaces(List<String> implementsInterfaces) {
            this.implementsInterfaces = implementsInterfaces;
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
