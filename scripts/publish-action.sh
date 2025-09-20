#!/bin/bash

# Script to publish Adaptive Tests GitHub Action to the marketplace
# Usage: ./scripts/publish-action.sh [version]

set -e

VERSION=${1:-v1}
ACTION_NAME="adaptive-tests"
ACTION_REPO="adaptive-tests-action/adaptive-tests"

echo "🚀 Publishing Adaptive Tests GitHub Action ${VERSION}"
echo "================================================"

# Check if we're in the right directory
if [ ! -f "action.yml" ]; then
    echo "❌ Error: action.yml not found. Run from project root."
    exit 1
fi

# Validate action.yml
echo "✅ Validating action.yml..."
if ! command -v actionlint &> /dev/null; then
    echo "⚠️  Warning: actionlint not installed. Skipping validation."
    echo "   Install with: brew install actionlint"
else
    actionlint action.yml
fi

# Create release branch if it doesn't exist
RELEASE_BRANCH="releases/${VERSION}"
echo "📝 Creating release branch: ${RELEASE_BRANCH}"

# Check if we have uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: You have uncommitted changes. Please commit or stash them."
    exit 1
fi

# Create and checkout release branch
git checkout -b "${RELEASE_BRANCH}" 2>/dev/null || git checkout "${RELEASE_BRANCH}"

# Create minimal package.json for the action
cat > action-package.json << EOF
{
  "name": "@${ACTION_REPO}",
  "version": "${VERSION}.0.0",
  "description": "GitHub Action for Adaptive Tests - AI-ready testing framework",
  "main": "action.yml",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/${ACTION_REPO}.git"
  },
  "keywords": [
    "github-action",
    "testing",
    "adaptive-tests",
    "refactoring",
    "ai-testing",
    "continuous-integration"
  ],
  "author": "Adaptive Tests Team",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/${ACTION_REPO}/issues"
  },
  "homepage": "https://github.com/${ACTION_REPO}#readme"
}
EOF

# Create README for the action repository
cat > ACTION_README.md << 'EOF'
# Adaptive Tests GitHub Action

Official GitHub Action for [Adaptive Tests](https://github.com/anon57396/adaptive-tests) - the AI-ready testing framework that survives refactoring.

## Quick Start

```yaml
- uses: adaptive-tests-action/adaptive-tests@v1
```

## Documentation

See the [full documentation](https://github.com/anon57396/adaptive-tests/blob/main/docs/GITHUB_ACTION.md) for all options and examples.

## Examples

### Basic Usage

```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: adaptive-tests-action/adaptive-tests@v1
```

### With Coverage

```yaml
- uses: adaptive-tests-action/adaptive-tests@v1
  with:
    command: test
    coverage: true
```

### Multi-Language

```yaml
- uses: adaptive-tests-action/adaptive-tests@v1
  with:
    language: python
    command: test
```

## Features

- 🧪 **Adaptive Testing** - Tests that survive refactoring
- 🔍 **Auto-Discovery** - Automatically find components
- 🏗️ **Scaffolding** - Generate tests automatically
- ✅ **Validation** - Ensure discovered components exist
- 📊 **Coverage** - Built-in coverage reporting
- 💬 **PR Comments** - Automatic results in pull requests
- 🌍 **Multi-Language** - JavaScript, TypeScript, Python, Go, Rust, Java, PHP, Ruby

## License

MIT
EOF

echo "📦 Preparing action for publishing..."

# Copy only necessary files for the action
mkdir -p .action-dist
cp action.yml .action-dist/
cp ACTION_README.md .action-dist/README.md
cp LICENSE .action-dist/ 2>/dev/null || echo "⚠️  No LICENSE file found"

# Create a minimal node_modules for the action
mkdir -p .action-dist/node_modules

echo "🏷️  Tagging release ${VERSION}"
git add .
git commit -m "Release ${VERSION} of GitHub Action" || echo "No changes to commit"
git tag -a "${VERSION}" -m "Release ${VERSION} of Adaptive Tests GitHub Action"

echo ""
echo "✅ Action prepared for publishing!"
echo ""
echo "Next steps:"
echo "1. Push to GitHub:"
echo "   git push origin ${RELEASE_BRANCH}"
echo "   git push origin ${VERSION}"
echo ""
echo "2. Create the action repository (if not exists):"
echo "   https://github.com/new"
echo "   Repository name: adaptive-tests"
echo "   Owner: adaptive-tests-action (create org if needed)"
echo ""
echo "3. Push action to its own repository:"
echo "   cd .action-dist"
echo "   git init"
echo "   git remote add origin git@github.com:${ACTION_REPO}.git"
echo "   git add ."
echo "   git commit -m 'Initial release ${VERSION}'"
echo "   git tag ${VERSION}"
echo "   git push -u origin main"
echo "   git push origin ${VERSION}"
echo ""
echo "4. Publish to GitHub Marketplace:"
echo "   Go to: https://github.com/${ACTION_REPO}/releases/new"
echo "   - Choose tag: ${VERSION}"
echo "   - Release title: ${VERSION} - Adaptive Tests Action"
echo "   - Check 'Publish this Action to the GitHub Marketplace'"
echo "   - Choose categories: 'Testing', 'Continuous Integration'"
echo "   - Add icon and color in action.yml"
echo ""
echo "5. Test the published action:"
echo "   - uses: ${ACTION_REPO}@${VERSION}"
echo ""

# Cleanup
rm -f action-package.json ACTION_README.md
