package io.adaptivetests.java.cli;

import io.adaptivetests.java.discovery.DiscoveryResult;
import io.adaptivetests.java.discovery.JavaDiscoveryEngine;
import io.adaptivetests.java.discovery.JavaDiscoveryEngine.DiscoveryException;
import io.adaptivetests.java.discovery.Signature;
import picocli.CommandLine;

import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.regex.Pattern;

@CommandLine.Command(
        name = "adaptive-tests-java",
        mixinStandardHelpOptions = true,
        version = "0.1.0",
        description = "Adaptive Tests discovery utilities for Java codebases",
        subcommands = {
                AdaptiveTestsCommand.Discover.class,
                AdaptiveTestsCommand.Why.class
        }
)
public class AdaptiveTestsCommand implements Callable<Integer> {

    @CommandLine.Spec
    CommandLine.Model.CommandSpec spec;

    @Override
    public Integer call() {
        CommandLine cmd = spec.commandLine();
        cmd.usage(cmd.getOut());
        return 0;
    }

    public static void main(String[] args) {
        int exit = new CommandLine(new AdaptiveTestsCommand()).execute(args);
        System.exit(exit);
    }

    abstract static class BaseCommand implements Callable<Integer> {
        @CommandLine.Option(names = {"-r", "--root"}, description = "Project root", defaultValue = ".")
        Path root;

        @CommandLine.Option(names = {"-n", "--name"}, description = "Class name or regex")
        String name;

        @CommandLine.Option(names = "--regex", description = "Treat name as regular expression")
        boolean regex;

        @CommandLine.Option(names = {"-m", "--method"}, description = "Required method (repeatable)")
        List<String> methods;

        @CommandLine.Option(names = "--package", description = "Required package")
        String packageName;

        protected Signature buildSignature() {
            Signature.Builder builder = Signature.builder();
            if (regex && name != null) {
                builder.namePattern(Pattern.compile(name));
            } else if (name != null) {
                builder.name(name);
            }
            if (methods != null) {
                builder.methods(methods);
            }
            if (packageName != null) {
                builder.packageName(packageName);
            }
            return builder.build();
        }

        protected JavaDiscoveryEngine engine() {
            return new JavaDiscoveryEngine(root.toAbsolutePath().normalize());
        }
    }

    @CommandLine.Command(name = "discover", description = "Resolve a signature and print metadata")
    static class Discover extends BaseCommand {
        @Override
        public Integer call() {
            try {
                DiscoveryResult result = engine().discover(buildSignature());
                System.out.println("✅ Found: " + result.getQualifiedName());
                System.out.println("   File: " + root.relativize(result.getFilePath()));
                System.out.println("   Methods: " + result.getMethods());
                return 0;
            } catch (DiscoveryException e) {
                System.err.println("❌ " + e.getMessage());
                return 1;
            }
        }
    }

    @CommandLine.Command(name = "why", description = "Explain scoring for top candidates")
    static class Why extends BaseCommand {
        @CommandLine.Option(names = "--limit", description = "Number of candidates to show", defaultValue = "5")
        int limit;

        @Override
        public Integer call() {
            try {
                List<DiscoveryResult> results = engine().discoverAll(buildSignature());
                if (results.isEmpty()) {
                    System.out.println("No matches found");
                    return 1;
                }
                results.stream().limit(limit).forEach(result -> {
                    System.out.println("• " + result.getQualifiedName() + " (score=" + result.getScore() + ")");
                    System.out.println("  File: " + root.relativize(result.getFilePath()));
                    System.out.println("  Methods: " + result.getMethods());
                });
                return 0;
            } catch (DiscoveryException e) {
                System.err.println("❌ " + e.getMessage());
                return 1;
            }
        }
    }
}
