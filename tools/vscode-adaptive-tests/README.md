# Adaptive Tests for Visual Studio Code

Visual discovery and scaffolding for resilient test suites. This extension brings the power of adaptive-tests directly into your VS Code workflow.

## ✨ Features

### 🔍 Discovery Lens

The crown jewel of this extension - a beautiful, interactive webview that visualizes how adaptive-tests discovers your code.

- **Visual Discovery**: See exactly how the discovery engine finds and scores your code
- **Score Breakdown**: Understand why certain files rank higher than others
- **Interactive Results**: Click to open files or scaffold tests directly from results
- **Preset Signatures**: Quick examples to get you started

> _Preview coming soon — the webview assets live in `media/` for local builds_

### 📝 Smart Scaffolding

Generate adaptive test files with incredible flexibility:

- **Smart Context Menu**: Shows "Scaffold Test" for files without tests, "Open Test" for files with existing tests
- **Batch Scaffolding**: Right-click a folder to scaffold tests for all eligible files inside
- **File Scaffolding**: Right-click any file to scaffold its individual test
- **Command Palette**: Use `Adaptive Tests: Scaffold Test` command
- **Auto-open**: Automatically opens generated test files
- **Language Support**: JS/TS primary. Python/Java/PHP in beta. See main docs for status.

#### 🎯 Smart Test Detection

The extension intelligently detects whether a test already exists:

- If no test exists → Shows "Scaffold Adaptive Test" in context menu
- If test exists → Shows "Open Adaptive Test" to jump directly to the test file
- Automatically updates as you create or delete test files

#### 📁 Batch Scaffolding

Right-click any folder to scaffold tests for all files inside:

- Shows preview of files to be scaffolded
- Allows selection of specific files
- Progress tracking for large folders
- Summary report with created/skipped/failed counts
- Automatically opens first few generated tests

### 🎯 CodeLens Integration

See test hints directly in your code:

- Inline indicators showing if adaptive tests exist
- Quick actions to generate tests for classes and functions
- One-click discovery visualization

### 📊 Discovery Tree View

A dedicated activity bar view showing:

- Current discovery results
- Score-based ranking
- Quick navigation to discovered files

### 💡 Status Bar Integration

Quick access to Discovery Lens from the status bar - always just one click away.

## 🚀 Getting Started

1. **Install the Extension**: Currently in development alpha - use the development setup below
2. **Open a Project**: Open a folder containing JavaScript/TypeScript code
3. **Click Discovery Lens**: Click the search icon in the status bar
4. **Enter a Signature**: Try `{"name": "Calculator", "type": "class"}`
5. **See the Magic**: Watch as the engine discovers matching code!

## 📋 Commands

All commands are available through the Command Palette (`Ctrl/Cmd+Shift+P`):

- `Adaptive Tests: Show Discovery Lens` - Open the Discovery Lens panel
- `Adaptive Tests: Scaffold Adaptive Test` - Generate a test for the current file
- `Adaptive Tests: Run Discovery on Current File` - Analyze how the current file would be discovered

## ⚙️ Configuration

Configure the extension through VS Code settings:

```json
{
  // Show discovery scores in the Discovery Lens
  "adaptive-tests.discovery.showScores": true,

  // Maximum number of discovery results to show
  "adaptive-tests.discovery.maxResults": 10,

  // Default output directory for scaffolded tests
  "adaptive-tests.scaffold.outputDirectory": "tests/adaptive",

  // Automatically open scaffolded test files
  "adaptive-tests.scaffold.autoOpen": true
}
```

## 🎨 Discovery Lens Interface

The Discovery Lens provides an intuitive interface for understanding discovery:

### Input Section

- **JSON Signature Editor**: Enter discovery signatures with syntax highlighting
- **Preset Buttons**: Quick examples for common patterns
- **Run Discovery Button**: Execute discovery with visual feedback

### Results Section

- **Ranked Results**: Files sorted by discovery score
- **Score Indicators**: Visual badges showing match quality (High/Medium/Low)
- **Score Breakdown**: Detailed explanation of scoring factors
- **Quick Actions**: Open files or scaffold tests directly

### Help Section

- **How It Works**: Collapsible guide explaining discovery strategies
- **Scoring Explanation**: Understanding how scores are calculated

## 🔧 How Discovery Works

The discovery engine uses multiple strategies:

1. **Name Matching**: Searches for files and exports matching the signature name
2. **Type Analysis**: Matches based on code structure (class, function, interface)
3. **Method Signatures**: Compares available methods with expected ones
4. **Path Scoring**: Prefers standard locations (src/, lib/, etc.)
5. **AST Analysis**: Deep code structure analysis for accurate matching

## 📚 Use Cases

### Finding Lost Code

```json
{
  "name": "UserService",
  "type": "class",
  "methods": ["findById", "create", "update"]
}
```

### Discovering Implementations

```json
{
  "name": "Repository",
  "type": "interface"
}
```

### Locating Utilities

```json
{
  "name": "formatDate",
  "type": "function"
}
```

## 🤝 Integration with adaptive-tests CLI

This extension complements the CLI tools:

- Uses the same discovery engine
- Generates compatible test files
- Shares configuration with CLI
- Supports all CLI-supported languages

## 🐛 Troubleshooting

### Discovery Returns No Results

- Check that your workspace contains the target code
- Verify the signature JSON is valid
- Try broader signatures (just name, no methods)

### Scaffolding Fails

- Ensure the file exports testable code
- Check that adaptive-tests is installed in your project
- Verify file permissions

### Extension Not Activating

- Check that you have a workspace folder open
- Verify VS Code version compatibility (≥1.74.0)
- Check the extension output panel for errors

## 📝 Requirements

- Visual Studio Code 1.74.0 or higher
- Node.js installed (for running adaptive-tests CLI)
- adaptive-tests npm package (installed globally or locally)

## 🚦 Known Issues

- PHP/Java/Python discovery requires respective parsers to be installed
- Large workspaces may experience slower discovery times
- Some complex TypeScript types may not be fully analyzed

## 📈 Release Notes

### 0.1.0 - Initial Release

- ✨ Discovery Lens webview panel
- 📝 Smart scaffolding from context menu
- 🎯 CodeLens integration
- 📊 Discovery tree view
- 💡 Status bar integration
- 🌍 Multi-language support (JS, TS, PHP, Java, Python)

## 🤝 Contributing

We welcome contributions! Please see the main [adaptive-tests repository](https://github.com/anon57396/adaptive-tests) for contribution guidelines.

## 📄 License

MIT - See LICENSE file for details

## 🙏 Acknowledgments

Built with ❤️ by the Adaptive Tests team. Special thanks to all contributors and early adopters who helped shape this extension.

---

**Enjoy the magic of adaptive testing!** 🎉
