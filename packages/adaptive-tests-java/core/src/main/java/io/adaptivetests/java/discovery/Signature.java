package io.adaptivetests.java.discovery;

import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Structure-based query describing the symbol a test wants to discover.
 */
public final class Signature {
    private final String name;
    private final Pattern namePattern;
    private final Type type;
    private final List<String> methods;
    private final String packageName;
    private final List<String> annotations;
    private final String extendsClass;

    public enum Type {
        CLASS,
        INTERFACE,
        ANY
    }

    private Signature(Builder builder) {
        this.name = builder.name;
        this.namePattern = builder.namePattern;
        this.type = builder.type;
        this.methods = List.copyOf(builder.methods);
        this.packageName = builder.packageName;
        this.annotations = List.copyOf(builder.annotations);
        this.extendsClass = builder.extendsClass;
    }

    public Optional<String> getName() {
        return Optional.ofNullable(name);
    }

    public Optional<Pattern> getNamePattern() {
        return Optional.ofNullable(namePattern);
    }

    public Type getType() {
        return type;
    }

    public List<String> getMethods() {
        return methods;
    }

    public Optional<String> getPackageName() {
        return Optional.ofNullable(packageName);
    }

    public List<String> getAnnotations() {
        return annotations;
    }

    public Optional<String> getExtendsClass() {
        return Optional.ofNullable(extendsClass);
    }

    @Override
    public String toString() {
        return "Signature{" +
                "name='" + name + '\'' +
                ", type=" + type +
                ", methods=" + methods +
                ", packageName='" + packageName + '\'' +
                ", annotations=" + annotations +
                ", extendsClass='" + extendsClass + '\'' +
                '}';
    }

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {
        private String name;
        private Pattern namePattern;
        private Type type = Type.CLASS;
        private List<String> methods = Collections.emptyList();
        private String packageName;
        private List<String> annotations = Collections.emptyList();
        private String extendsClass;

        private Builder() {
        }

        public Builder name(String value) {
            this.name = value;
            this.namePattern = null;
            return this;
        }

        public Builder namePattern(Pattern pattern) {
            this.name = null;
            this.namePattern = pattern;
            return this;
        }

        public Builder type(Type value) {
            this.type = Objects.requireNonNullElse(value, Type.CLASS);
            return this;
        }

        public Builder methods(List<String> value) {
            this.methods = value == null ? Collections.emptyList() : List.copyOf(value);
            return this;
        }

        public Builder packageName(String value) {
            this.packageName = value;
            return this;
        }

        public Builder annotations(List<String> value) {
            this.annotations = value == null ? Collections.emptyList() : List.copyOf(value);
            return this;
        }

        public Builder extendsClass(String value) {
            this.extendsClass = value;
            return this;
        }

        public Signature build() {
            return new Signature(this);
        }
    }
}
