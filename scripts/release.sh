#!/bin/bash

# Release Script - Automates version bumping and publishing
# Usage: ./scripts/release.sh [patch|minor|major|x.x.x] [--dry-run]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MAIN_BRANCH="main"
DEVELOP_BRANCH="develop"
DRY_RUN=false
VERSION_TYPE="${1:-patch}"

# Check for dry-run flag
if [[ "$2" == "--dry-run" ]] || [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
    echo -e "${YELLOW}DRY RUN MODE - No changes will be pushed${NC}"
fi

# Function to print colored output
print_step() {
    echo -e "\n${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✔ $1${NC}"
}

print_error() {
    echo -e "${RED}✖ $1${NC}"
    exit 1
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Must be run from repository root"
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    print_error "Uncommitted changes detected. Please commit or stash them first."
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)

# Checkout main branch
if [ "$CURRENT_BRANCH" != "$MAIN_BRANCH" ]; then
    print_step "Switching to $MAIN_BRANCH branch"
    git checkout $MAIN_BRANCH
    git pull origin $MAIN_BRANCH
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
print_step "Current version: $CURRENT_VERSION"

# Determine new version
if [[ "$VERSION_TYPE" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    NEW_VERSION="$VERSION_TYPE"
else
    # Use npm version to calculate new version (without creating commit/tag)
    NEW_VERSION=$(npm version "$VERSION_TYPE" --no-git-tag-version --no-commit-hooks | sed 's/v//')
fi

print_step "New version will be: $NEW_VERSION"

# Update all package versions
print_step "Updating package versions"

# Main package
npm version "$NEW_VERSION" --no-git-tag-version --allow-same-version
print_success "Updated main package.json"

# Update sub-packages
for pkg in packages/*; do
    if [ -f "$pkg/package.json" ]; then
        echo "  Updating $pkg..."
        (cd "$pkg" && npm version "$NEW_VERSION" --no-git-tag-version --allow-same-version 2>/dev/null || true)
    fi
done

# Update Python package
if [ -f "languages/python/setup.py" ]; then
    print_step "Updating Python package version"
    sed -i.bak "s/version=.*,/version='$NEW_VERSION',/" languages/python/setup.py
    rm languages/python/setup.py.bak
    print_success "Updated setup.py"
fi

# Update CHANGELOG
print_step "Updating CHANGELOG.md"
if [ -f "CHANGELOG.md" ]; then
    # Add new version header
    TODAY=$(date +%Y-%m-%d)
    sed -i.bak "5i\\
## [$NEW_VERSION] - $TODAY\n\n- See [GitHub Releases](https://github.com/anon57396/adaptive-tests/releases/tag/v$NEW_VERSION) for details\n" CHANGELOG.md
    rm CHANGELOG.md.bak
    print_success "Updated CHANGELOG.md"
fi

# Create commit
print_step "Creating release commit"
git add -A

if [ "$DRY_RUN" = false ]; then
    git commit -m "chore: release v$NEW_VERSION

- Bump version to $NEW_VERSION
- Update CHANGELOG.md
- Update all package versions"
    print_success "Created release commit"
else
    echo "  [DRY RUN] Would commit changes"
fi

# Create tag
print_step "Creating git tag v$NEW_VERSION"
if [ "$DRY_RUN" = false ]; then
    git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
    print_success "Created tag v$NEW_VERSION"
else
    echo "  [DRY RUN] Would create tag v$NEW_VERSION"
fi

# Push to remote
print_step "Pushing to remote"
if [ "$DRY_RUN" = false ]; then
    git push origin $MAIN_BRANCH
    git push origin "v$NEW_VERSION"
    print_success "Pushed to remote"
else
    echo "  [DRY RUN] Would push to origin"
fi

# Trigger GitHub Actions
if [ "$DRY_RUN" = false ]; then
    print_step "GitHub Actions will now:"
    echo "  1. Run CI tests"
    echo "  2. Publish to npm"
    echo "  3. Publish to PyPI"
    echo "  4. Create GitHub Release"
    echo ""
    echo -e "${GREEN}✨ Release v$NEW_VERSION initiated successfully!${NC}"
    echo ""
    echo "Monitor progress at:"
    echo "https://github.com/anon57396/adaptive-tests/actions"
else
    echo ""
    echo -e "${YELLOW}DRY RUN COMPLETE${NC}"
    echo "To perform actual release, run without --dry-run flag"
    echo ""
    echo "Changes that would be made:"
    git status --short
fi

# Optional: Open GitHub Actions in browser
if [ "$DRY_RUN" = false ]; then
    if command -v open &> /dev/null; then
        read -p "Open GitHub Actions in browser? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            open "https://github.com/anon57396/adaptive-tests/actions"
        fi
    fi
fi