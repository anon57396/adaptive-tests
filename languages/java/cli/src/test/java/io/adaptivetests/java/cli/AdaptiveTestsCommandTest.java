package io.adaptivetests.java.cli;

import org.junit.jupiter.api.Test;
import picocli.CommandLine;

import java.io.ByteArrayOutputStream;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AdaptiveTestsCommandTest {

    @Test
    void printsHelpByDefault() {
        AdaptiveTestsCommand app = new AdaptiveTestsCommand();
        CommandLine cmd = new CommandLine(app);
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        CommandLine.Model.CommandSpec spec = cmd.getCommandSpec();
        spec.commandLine().setOut(new java.io.PrintWriter(new OutputStreamWriter(buffer, StandardCharsets.UTF_8), true));
        spec.commandLine().setErr(new java.io.PrintWriter(new OutputStreamWriter(buffer, StandardCharsets.UTF_8), true));

        int exit = cmd.execute();
        String output = buffer.toString(StandardCharsets.UTF_8);

        assertEquals(0, exit);
        assertTrue(output.contains("Usage: adaptive-tests-java"));
    }

    @Test
    void discoverFailsWhenNotFound() {
        String[] args = {"discover", "--name", "Example", "--root", Path.of(".").toAbsolutePath().toString()};
        int exitCode = new CommandLine(new AdaptiveTestsCommand()).execute(args);
        assertEquals(1, exitCode);
    }
}
