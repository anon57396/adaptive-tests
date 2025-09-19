package fixtures.java.annotations;

import java.lang.annotation.*;
import java.lang.reflect.*;

/**
 * Custom annotation definitions for testing annotation processing
 */
public class CustomAnnotations {

    // Simple marker annotation
    @Retention(RetentionPolicy.RUNTIME)
    @Target(ElementType.TYPE)
    public @interface Marker {
        // No elements
    }

    // Single-element annotation
    @Retention(RetentionPolicy.RUNTIME)
    @Target({ElementType.TYPE, ElementType.METHOD})
    public @interface SingleValue {
        String value();
    }

    // Multi-element annotation
    @Retention(RetentionPolicy.RUNTIME)
    @Target({ElementType.TYPE, ElementType.METHOD, ElementType.FIELD})
    public @interface Configuration {
        String name();
        int priority() default 0;
        boolean enabled() default true;
        String[] tags() default {};
        Class<?> type() default Object.class;
    }

    // Annotation with all primitive types
    @Retention(RetentionPolicy.RUNTIME)
    @Target(ElementType.TYPE)
    public @interface AllTypes {
        boolean booleanValue() default false;
        byte byteValue() default 0;
        char charValue() default '\u0000';
        short shortValue() default 0;
        int intValue() default 0;
        long longValue() default 0L;
        float floatValue() default 0.0f;
        double doubleValue() default 0.0;
        String stringValue() default "";
        Class<?> classValue() default Object.class;
        EnumType enumValue() default EnumType.DEFAULT;
        SingleValue annotationValue() default @SingleValue("default");
        String[] arrayValue() default {};

        enum EnumType {
            DEFAULT, OPTION_A, OPTION_B
        }
    }

    // Meta-annotation for validation
    @Retention(RetentionPolicy.RUNTIME)
    @Target(ElementType.ANNOTATION_TYPE)
    public @interface Constraint {
        String message() default "Validation failed";
        Class<?>[] groups() default {};
        Class<? extends Validator>[] validatedBy() default {};
    }

    // Custom validation annotation
    @Constraint(
        message = "Value must be within range",
        validatedBy = RangeValidator.class
    )
    @Retention(RetentionPolicy.RUNTIME)
    @Target({ElementType.FIELD, ElementType.PARAMETER})
    public @interface Range {
        int min() default Integer.MIN_VALUE;
        int max() default Integer.MAX_VALUE;
        String message() default "{Range.message}";
    }

    // Validator interface
    public interface Validator<A extends Annotation, T> {
        boolean isValid(T value, A annotation);
    }

    // Range validator implementation
    public static class RangeValidator implements Validator<Range, Integer> {
        @Override
        public boolean isValid(Integer value, Range annotation) {
            if (value == null) return true;
            return value >= annotation.min() && value <= annotation.max();
        }
    }

    // Annotation for dependency injection
    @Retention(RetentionPolicy.RUNTIME)
    @Target({ElementType.FIELD, ElementType.CONSTRUCTOR, ElementType.METHOD})
    public @interface Inject {
        String name() default "";
        boolean required() default true;
    }

    // Annotation for method interception
    @Retention(RetentionPolicy.RUNTIME)
    @Target(ElementType.METHOD)
    public @interface Intercepted {
        Class<? extends Interceptor>[] value();
    }

    // Interceptor interface
    public interface Interceptor {
        Object intercept(Method method, Object[] args) throws Throwable;
    }

    // Logging interceptor
    public static class LoggingInterceptor implements Interceptor {
        @Override
        public Object intercept(Method method, Object[] args) throws Throwable {
            System.out.println("Before: " + method.getName());
            Object result = method.invoke(null, args);
            System.out.println("After: " + method.getName());
            return result;
        }
    }

    // Annotation for serialization control
    @Retention(RetentionPolicy.RUNTIME)
    @Target(ElementType.FIELD)
    public @interface JsonProperty {
        String name() default "";
        boolean required() default false;
        boolean ignore() default false;
        String format() default "";
    }

    // Annotation for documentation
    @Retention(RetentionPolicy.SOURCE)
    @Target({ElementType.TYPE, ElementType.METHOD})
    public @interface Documentation {
        String summary();
        String description() default "";
        String[] authors() default {};
        String since() default "";
        String[] see() default {};
        boolean deprecated() default false;
    }

    // Annotation for code generation
    @Retention(RetentionPolicy.SOURCE)
    @Target(ElementType.TYPE)
    public @interface GenerateBuilder {
        boolean chain() default true;
        String prefix() default "with";
        boolean includeToString() default true;
    }

    // Classes using custom annotations
    @Marker
    @SingleValue("example")
    @Configuration(
        name = "TestConfig",
        priority = 1,
        enabled = true,
        tags = {"test", "example"},
        type = String.class
    )
    public static class AnnotatedClass {

        @JsonProperty(name = "identifier", required = true)
        private Long id;

        @JsonProperty(ignore = true)
        private String internalField;

        @Range(min = 0, max = 100)
        private Integer percentage;

        @Inject(name = "service", required = true)
        private Object service;

        @Intercepted({LoggingInterceptor.class})
        @Documentation(
            summary = "Process data",
            description = "Processes the given data and returns result",
            authors = {"John Doe"},
            since = "1.0"
        )
        public String processData(String input) {
            return "Processed: " + input;
        }

        // Method to demonstrate runtime annotation processing
        public void inspectAnnotations() {
            Class<?> clazz = this.getClass();

            // Class annotations
            if (clazz.isAnnotationPresent(Marker.class)) {
                System.out.println("Class has Marker annotation");
            }

            Configuration config = clazz.getAnnotation(Configuration.class);
            if (config != null) {
                System.out.println("Config: " + config.name());
                System.out.println("Priority: " + config.priority());
            }

            // Field annotations
            for (Field field : clazz.getDeclaredFields()) {
                JsonProperty jsonProp = field.getAnnotation(JsonProperty.class);
                if (jsonProp != null) {
                    System.out.println("Field " + field.getName() +
                        " maps to JSON: " + jsonProp.name());
                }
            }

            // Method annotations
            for (Method method : clazz.getDeclaredMethods()) {
                Intercepted intercepted = method.getAnnotation(Intercepted.class);
                if (intercepted != null) {
                    for (Class<? extends Interceptor> interceptorClass : intercepted.value()) {
                        System.out.println("Method " + method.getName() +
                            " intercepted by: " + interceptorClass.getName());
                    }
                }
            }
        }
    }

    // Annotation processor simulation
    public static class AnnotationProcessor {
        public static void processAnnotations(Class<?> clazz) {
            System.out.println("Processing class: " + clazz.getName());

            // Process all annotations
            for (Annotation annotation : clazz.getAnnotations()) {
                System.out.println("Class annotation: " + annotation.annotationType().getSimpleName());
            }

            // Process fields
            for (Field field : clazz.getDeclaredFields()) {
                for (Annotation annotation : field.getAnnotations()) {
                    System.out.println("Field " + field.getName() +
                        " has annotation: " + annotation.annotationType().getSimpleName());
                }
            }

            // Process methods
            for (Method method : clazz.getDeclaredMethods()) {
                for (Annotation annotation : method.getAnnotations()) {
                    System.out.println("Method " + method.getName() +
                        " has annotation: " + annotation.annotationType().getSimpleName());
                }
            }
        }
    }
}