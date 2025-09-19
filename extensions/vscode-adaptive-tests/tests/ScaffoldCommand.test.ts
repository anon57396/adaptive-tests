import { describe, expect, it, beforeEach, vi } from 'vitest';

const execSpy = vi.fn((command: string, options: any, callback: Function) => {
  callback(null, '✅ Created tests/adaptive/foo.test.js\n', '');
});

const vscodeWindow = {
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn().mockResolvedValue('Open Test File'),
  showWarningMessage: vi.fn(),
  showTextDocument: vi.fn(),
  withProgress: vi.fn(async (_options: any, task: any) => {
    await task({ report: vi.fn() });
  }),
  activeTextEditor: {
    document: {
      uri: { fsPath: '/workspace/src/active.js' }
    }
  }
};

const vscodeWorkspace = {
  openTextDocument: vi.fn(async (target: string) => ({ uri: { fsPath: target } })),
  getWorkspaceFolder: vi.fn(() => ({ uri: { fsPath: '/workspace' } })),
  getConfiguration: vi.fn(() => ({
    get: (key: string, defaultValue: any) => {
      if (key === 'scaffold.outputDirectory') {
        return 'tests/adaptive';
      }
      if (key === 'scaffold.autoOpen') {
        return true;
      }
      return defaultValue;
    }
  }))
};

vi.mock('child_process', () => ({
  exec: execSpy
}));

vi.mock('vscode', () => ({
  window: vscodeWindow,
  workspace: vscodeWorkspace,
  ProgressLocation: { Notification: 1 },
  Uri: { file: (fsPath: string) => ({ fsPath }) }
}));

describe('ScaffoldCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    execSpy.mockClear();
  });

  it('warns when an unsupported extension is provided', async () => {
    const { ScaffoldCommand } = await import('../src/commands/ScaffoldCommand');
    const command = new ScaffoldCommand();

    await command.execute({ fsPath: '/workspace/src/notes.txt' } as any);

    expect(vscodeWindow.showWarningMessage).toHaveBeenCalledWith(expect.stringContaining('not supported'));
    expect(execSpy).not.toHaveBeenCalled();
  });

  it('invokes adaptive-tests CLI for supported files and opens generated test file', async () => {
    const { ScaffoldCommand } = await import('../src/commands/ScaffoldCommand');
    const command = new ScaffoldCommand();

    const targetUri = { fsPath: '/workspace/src/foo.js' } as any;
    await command.execute(targetUri);

    expect(execSpy).toHaveBeenCalledTimes(1);
    const [commandArg, optionsArg] = execSpy.mock.calls[0];
    expect(commandArg).toContain('npx adaptive-tests scaffold "src/foo.js" --output-dir="tests/adaptive"');
    expect(optionsArg?.cwd).toBe('/workspace');

    expect(vscodeWorkspace.openTextDocument).toHaveBeenCalledWith('/workspace/tests/adaptive/foo.test.js');
    expect(vscodeWindow.showTextDocument).toHaveBeenCalled();
  });
});
