package io.adaptivetests.java.discovery;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public final class MethodMetadata {
    private String name;
    private String returnType;
    private List<ParameterMetadata> parameters;
    private List<String> annotations;
    private boolean isStatic;
    private boolean isPublic;
    private boolean isConstructor;

    public MethodMetadata() {
        this("", "", Collections.emptyList(), Collections.emptyList(), false, false, false);
    }

    MethodMetadata(String name,
                   String returnType,
                   List<ParameterMetadata> parameters,
                   List<String> annotations,
                   boolean isStatic,
                   boolean isPublic,
                   boolean isConstructor) {
        this.name = name;
        this.returnType = returnType;
        this.parameters = new ArrayList<>(parameters);
        this.annotations = new ArrayList<>(annotations);
        this.isStatic = isStatic;
        this.isPublic = isPublic;
        this.isConstructor = isConstructor;
    }

    public String getName() {
        return name;
    }

    public String getReturnType() {
        return returnType;
    }

    public List<ParameterMetadata> getParameters() {
        return Collections.unmodifiableList(parameters);
    }

    public List<String> getAnnotations() {
        return Collections.unmodifiableList(annotations);
    }

    public boolean isStatic() {
        return isStatic;
    }

    public boolean isPublic() {
        return isPublic;
    }

    public boolean isConstructor() {
        return isConstructor;
    }
}
