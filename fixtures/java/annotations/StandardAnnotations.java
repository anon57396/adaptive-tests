package fixtures.java.annotations;

import java.lang.annotation.*;
import java.util.List;
import java.util.ArrayList;
import javax.annotation.processing.*;
import javax.annotation.Generated;

/**
 * Java annotation fixtures for testing discovery and processing
 */
public class StandardAnnotations {

    // Standard Java annotations
    @Override
    public String toString() {
        return "StandardAnnotations fixture";
    }

    @Deprecated
    public void oldMethod() {
        System.out.println("This method is deprecated");
    }

    @SuppressWarnings("unchecked")
    public void uncheckedOperation() {
        List raw = new ArrayList();
        List<String> strings = raw;
    }

    @SafeVarargs
    public final <T> void safeVarargsMethod(T... args) {
        for (T arg : args) {
            System.out.println(arg);
        }
    }

    // Functional interface annotation
    @FunctionalInterface
    interface Calculator {
        int calculate(int a, int b);
    }

    // Generated annotation
    @Generated(
        value = "com.example.Generator",
        date = "2024-01-01",
        comments = "Auto-generated code"
    )
    public class GeneratedClass {
        private String value;

        public String getValue() {
            return value;
        }
    }

    // Inherited annotation
    @Inherited
    @Retention(RetentionPolicy.RUNTIME)
    @Target(ElementType.TYPE)
    @interface InheritableAnnotation {
        String value() default "";
    }

    @InheritableAnnotation("parent")
    class ParentClass {}

    class ChildClass extends ParentClass {
        // Inherits @InheritableAnnotation
    }

    // Repeatable annotation
    @Repeatable(Authors.class)
    @interface Author {
        String name();
        String date() default "";
    }

    @interface Authors {
        Author[] value();
    }

    @Author(name = "John Doe", date = "2024-01-01")
    @Author(name = "Jane Smith", date = "2024-01-02")
    public class MultiAuthorClass {
        // Class with multiple authors
    }

    // Type annotations (Java 8+)
    public void typeAnnotations() {
        @NonNull String str = "not null";
        List<@NonNull String> list = new ArrayList<>();

        try {
            // Some operation
        } catch (@NonNull Exception e) {
            e.printStackTrace();
        }
    }

    // Custom type annotation
    @Target({ElementType.TYPE_USE, ElementType.TYPE_PARAMETER})
    @Retention(RetentionPolicy.RUNTIME)
    @interface NonNull {}

    // Method parameter annotations
    public void methodWithAnnotatedParams(
        @Deprecated String oldParam,
        @NonNull String requiredParam,
        @SuppressWarnings("unused") String unusedParam
    ) {
        System.out.println(requiredParam);
    }

    // Field annotations
    public static class FieldAnnotationExample {
        @Deprecated
        private String deprecatedField;

        @SuppressWarnings("unused")
        private int unusedField;

        @NonNull
        private String requiredField = "required";

        // Transient for serialization
        private transient String transientField;

        // Volatile for thread safety
        private volatile boolean flag;
    }

    // Constructor annotations
    public static class ConstructorAnnotations {
        @Deprecated
        public ConstructorAnnotations() {
            // Default constructor
        }

        @SuppressWarnings("unused")
        public ConstructorAnnotations(String param) {
            // Parameterized constructor
        }
    }

    // Package-level annotations (would be in package-info.java)
    // @Deprecated
    // package com.example.legacy;

    // Annotation with all element types
    @Target({
        ElementType.TYPE,
        ElementType.FIELD,
        ElementType.METHOD,
        ElementType.PARAMETER,
        ElementType.CONSTRUCTOR,
        ElementType.LOCAL_VARIABLE,
        ElementType.ANNOTATION_TYPE,
        ElementType.PACKAGE,
        ElementType.TYPE_PARAMETER,
        ElementType.TYPE_USE
    })
    @Retention(RetentionPolicy.RUNTIME)
    @interface Universal {
        String value() default "";
    }

    @Universal("class")
    public static class UniversalExample {
        @Universal("field")
        private String field;

        @Universal("constructor")
        public UniversalExample() {}

        @Universal("method")
        public void method(@Universal("parameter") String param) {
            @Universal("local")
            String local = param;
        }
    }
}