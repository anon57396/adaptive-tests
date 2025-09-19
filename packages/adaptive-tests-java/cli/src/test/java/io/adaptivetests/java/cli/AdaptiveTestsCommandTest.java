package io.adaptivetests.java.cli;

import org.junit.jupiter.api.Test;
import picocli.CommandLine;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AdaptiveTestsCommandTest {

    @Test
    void printsHelpByDefault() throws Exception {
        AdaptiveTestsCommand app = new AdaptiveTestsCommand();
        CommandLine cmd = new CommandLine(app);
        java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream();
        java.io.PrintWriter writer = new java.io.PrintWriter(new java.io.OutputStreamWriter(
                buffer, java.nio.charset.StandardCharsets.UTF_8), true);
        cmd.setOut(writer);
        cmd.setErr(writer);

        int exit = cmd.execute();
        writer.flush();
        String output = buffer.toString(java.nio.charset.StandardCharsets.UTF_8);

        assertEquals(0, exit);
        assertTrue(output.contains("Usage: adaptive-tests-java"));
    }

    @Test
    void discoverCommandFailsWhenNotFound() {
        String[] args = {"discover", "--name", "Example", "--root", Path.of(".").toAbsolutePath().toString()};
        int exitCode = new CommandLine(new AdaptiveTestsCommand()).execute(args);
        assertEquals(1, exitCode);
    }
}
