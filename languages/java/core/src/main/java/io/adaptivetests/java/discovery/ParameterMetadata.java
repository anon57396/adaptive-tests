package io.adaptivetests.java.discovery;

public final class ParameterMetadata {
    private String name;
    private String type;
    private boolean varArgs;

    public ParameterMetadata() {
        this("", "", false);
    }

    ParameterMetadata(String name, String type, boolean varArgs) {
        this.name = name;
        this.type = type;
        this.varArgs = varArgs;
    }

    public String getName() {
        return name;
    }

    public String getType() {
        return type;
    }

    public boolean isVarArgs() {
        return varArgs;
    }
}
