# VS Code Extension Development Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Visual Studio Code
- TypeScript installed globally: `npm install -g typescript`

### Setup
```bash
cd extensions/vscode-adaptive-tests
npm install
npm run compile
```

### Running the Extension

1. **Open in VS Code**:
   ```bash
   code .
   ```

2. **Press F5** or use Run → Start Debugging

3. A new VS Code window will open with the extension loaded

4. **Test the extension**:
   - Click the Discovery Lens icon in the status bar
   - Right-click a JavaScript file → "Scaffold Adaptive Test"
   - Open Command Palette → "Adaptive Tests: Show Discovery Lens"

## 📁 Project Structure

```
vscode-adaptive-tests/
├── src/                      # TypeScript source files
│   ├── extension.ts         # Main extension entry point
│   ├── webview/            # Webview panels
│   │   └── DiscoveryLensPanel.ts
│   ├── commands/           # Command implementations
│   │   ├── ScaffoldCommand.ts
│   │   └── DiscoveryCommand.ts
│   └── providers/          # VS Code providers
│       ├── CodeLensProvider.ts
│       └── DiscoveryTreeProvider.ts
├── media/                   # Webview assets
│   ├── style.css           # Discovery Lens styles
│   └── script.js           # Discovery Lens client script
├── out/                    # Compiled JavaScript (gitignored)
└── package.json           # Extension manifest
```

## 🔧 Development Commands

```bash
# Compile TypeScript
npm run compile

# Watch mode (auto-compile on changes)
npm run watch

# Package extension for distribution
npx vsce package

# Publish to marketplace (requires token)
npx vsce publish
```

## 🧪 Testing the Extension

### Manual Testing Checklist

#### Discovery Lens
- [ ] Opens from status bar
- [ ] Opens from command palette
- [ ] JSON signature validation works
- [ ] Preset buttons populate correct signatures
- [ ] Discovery runs and shows results
- [ ] Results show scores and breakdowns
- [ ] Click to open file works
- [ ] Scaffold from results works
- [ ] Error handling for invalid JSON
- [ ] State persists when panel is hidden/shown

#### Scaffolding
- [ ] Context menu appears on supported files
- [ ] Scaffold generates correct test file
- [ ] Output directory configuration works
- [ ] Auto-open configuration works
- [ ] Handles existing files (prompt to overwrite)
- [ ] Shows error for unsupported file types
- [ ] Works for JS, TS, PHP, Java, Python

#### CodeLens
- [ ] Shows inline hints for classes
- [ ] Shows inline hints for functions
- [ ] "Generate test" action works
- [ ] "Run discovery" action works
- [ ] Detects existing tests correctly

#### Tree View
- [ ] Shows in activity bar
- [ ] Displays discovery results
- [ ] Click to open file works
- [ ] Shows empty state when no results

## 🎨 Customizing the Discovery Lens UI

The webview UI is built with vanilla HTML/CSS/JavaScript for maximum compatibility:

1. **Styles**: Edit `media/style.css`
   - Uses VS Code theme variables for consistency
   - Responsive design with CSS Grid/Flexbox

2. **Behavior**: Edit `media/script.js`
   - Message passing with extension host
   - State management
   - User interactions

3. **Layout**: Edit the HTML in `DiscoveryLensPanel.ts`
   - getWebviewContent() method contains the HTML

## 🐛 Debugging Tips

1. **Extension Host Logs**:
   - View → Output → "Extension Host"

2. **Webview Developer Tools**:
   - Open Command Palette in the extension development host
   - Run "Developer: Open Webview Developer Tools"

3. **Console Logging**:
   - Extension: `console.log()` appears in Debug Console
   - Webview: `console.log()` appears in Webview Developer Tools

4. **Breakpoints**:
   - Set breakpoints in TypeScript files
   - F5 to start debugging, F10/F11 to step through

## 🚀 Publishing

### First Time Setup
1. Install vsce: `npm install -g @vscode/vsce`
2. Create a publisher: https://marketplace.visualstudio.com/manage
3. Get a Personal Access Token from Azure DevOps

### Publishing Steps
```bash
# Package the extension
npx vsce package

# This creates: vscode-adaptive-tests-0.1.0.vsix

# Publish to marketplace
npx vsce publish

# Or publish with token
npx vsce publish -p <token>
```

### Pre-publish Checklist
- [ ] Update version in package.json
- [ ] Update CHANGELOG.md
- [ ] Test all features
- [ ] Update README with new features
- [ ] Add screenshots/gifs to media/
- [ ] Run `npm run compile` without errors
- [ ] Test VSIX locally: Extensions → Install from VSIX

## 📝 Adding New Features

### Adding a New Command

1. Register in `package.json`:
```json
"commands": [{
    "command": "adaptive-tests.newCommand",
    "title": "New Command",
    "category": "Adaptive Tests"
}]
```

2. Implement handler in `extension.ts`:
```typescript
const disposable = vscode.commands.registerCommand(
    'adaptive-tests.newCommand',
    () => { /* implementation */ }
);
context.subscriptions.push(disposable);
```

### Adding to Discovery Lens

1. Update HTML in `DiscoveryLensPanel.ts`
2. Add styles in `media/style.css`
3. Handle interactions in `media/script.js`
4. Process messages in `DiscoveryLensPanel.ts`

## 🔗 Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Webview API](https://code.visualstudio.com/api/extension-guides/webview)

## 💡 Tips

- Use `Developer: Reload Window` in the extension development host to reload changes
- The extension development host is a separate VS Code instance - changes there don't affect your main editor
- Webview content security policy is strict - no inline scripts or styles allowed
- Use VS Code's theme CSS variables for consistent theming