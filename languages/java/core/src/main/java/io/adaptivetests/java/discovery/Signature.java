package io.adaptivetests.java.discovery;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

public final class Signature {
    public enum Type {
        CLASS,
        INTERFACE,
        ENUM,
        RECORD,
        ANNOTATION,
        ANY
    }

    private final String name;
    private final Pattern namePattern;
    private final Type type;
    private final List<String> methods;
    private final String packageName;
    private final List<String> annotations;
    private final String extendsClass;
    private final List<String> implementsInterfaces;

    private Signature(Builder builder) {
        this.name = builder.name;
        this.namePattern = builder.namePattern;
        this.type = builder.type;
        this.methods = builder.methods == null ? Collections.emptyList() : List.copyOf(builder.methods);
        this.packageName = builder.packageName;
        this.annotations = builder.annotations == null ? Collections.emptyList() : List.copyOf(builder.annotations);
        this.extendsClass = builder.extendsClass;
        this.implementsInterfaces = builder.implementsInterfaces == null
                ? Collections.emptyList()
                : List.copyOf(builder.implementsInterfaces);
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

    public List<String> getImplementsInterfaces() {
        return implementsInterfaces;
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
                ", implementsInterfaces=" + implementsInterfaces +
                '}';
    }

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {
        private String name;
        private Pattern namePattern;
        private Type type = Type.CLASS;
        private List<String> methods;
        private String packageName;
        private List<String> annotations;
        private String extendsClass;
        private List<String> implementsInterfaces;

        private Builder() {}

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
            this.type = value == null ? Type.CLASS : value;
            return this;
        }

        public Builder methods(List<String> value) {
            this.methods = value;
            return this;
        }

        public Builder packageName(String value) {
            this.packageName = value;
            return this;
        }

        public Builder annotations(List<String> value) {
            this.annotations = value;
            return this;
        }

        public Builder extendsClass(String value) {
            this.extendsClass = value;
            return this;
        }

        public Builder implementsInterfaces(List<String> value) {
            this.implementsInterfaces = value;
            return this;
        }

        public Signature build() {
            return new Signature(this);
        }
    }
}
