# Automated Publishing Setup Guide

This guide explains how to set up automated publishing to npm, PyPI, Maven, and GitHub Packages using GitHub Actions.

## Overview

The automated publishing workflow (`publish.yml`) handles:
- **npm**: Main package + all plugin packages
- **PyPI**: Python companion package
- **Maven**: Java packages (if present)
- **GitHub Packages**: Mirror to GitHub's registry
- **GitHub Releases**: Automatic release notes

## Quick Setup

### 1. Required Secrets

Go to **Settings → Secrets and variables → Actions** in your GitHub repository and add:

#### NPM Publishing
```
NPM_TOKEN = <your-npm-automation-token>
```
Get from: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
- Create token with "Automation" type
- Select "Publish" permission

#### PyPI Publishing
```
PYPI_TOKEN = <your-pypi-api-token>
TEST_PYPI_TOKEN = <your-test-pypi-api-token>  # Optional, for pre-releases
```
Get from: https://pypi.org/manage/account/token/
- Create API token scoped to your project
- For Test PyPI: https://test.pypi.org/manage/account/token/

#### Maven Publishing (Optional)
```
OSSRH_USERNAME = <your-sonatype-username>
OSSRH_TOKEN = <your-sonatype-token>
MAVEN_GPG_PRIVATE_KEY = <your-gpg-private-key>
MAVEN_GPG_PASSPHRASE = <your-gpg-passphrase>
```
Setup guide: https://central.sonatype.org/publish/publish-guide/

### 2. Package Configuration

#### npm Packages
Ensure each `package.json` has:
```json
{
  "name": "@your-scope/package-name",
  "version": "0.0.0",  // Will be updated by workflow
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

#### Python Package
In `languages/python/setup.py` or `pyproject.toml`:
```python
# setup.py
setup(
    name="adaptive-tests-py",
    version="0.0.0",  # Will be updated by workflow
    # ... rest of config
)
```

Or with `pyproject.toml`:
```toml
[project]
name = "adaptive-tests-py"
version = "0.0.0"  # Will be updated by workflow
```

## Usage

### Manual Publishing

1. Go to **Actions** tab in GitHub
2. Select **"Publish to All Registries"** workflow
3. Click **"Run workflow"**
4. Fill in options:
   - **Version**: e.g., `1.2.3`
   - **Pre-release**: Check for beta/alpha versions
   - **Registries**: Choose which to publish to
5. Click **"Run workflow"**

### Automatic Publishing

#### Option 1: Git Tags
```bash
# Create and push a version tag
git tag v1.2.3
git push origin v1.2.3
```

The workflow automatically triggers and publishes version `1.2.3`.

#### Option 2: GitHub Release
1. Go to **Releases** → **"Create a new release"**
2. Create tag `v1.2.3`
3. Fill in release notes
4. Click **"Publish release"**

### Pre-releases

For beta/alpha versions:
```bash
git tag v1.2.3-beta.1
git push origin v1.2.3-beta.1
```

Or use manual trigger with "Pre-release" checked.

## Publishing Workflow Details

### npm Publishing

The workflow publishes these packages:
1. `adaptive-tests` (main package)
2. `jest-adaptive` 
3. `vite-plugin-adaptive`
4. `webpack-plugin-adaptive`

Each package:
- Builds if TypeScript
- Runs tests
- Updates version
- Publishes to npm
- Publishes to GitHub Packages (optional)

### PyPI Publishing

1. Updates version in `setup.py` or `pyproject.toml`
2. Builds wheel and source distributions
3. Validates with `twine check`
4. Publishes to Test PyPI (if pre-release)
5. Publishes to PyPI

### Maven Publishing

1. Scans for `pom.xml` files
2. Updates version with `mvn versions:set`
3. Builds packages
4. Signs with GPG
5. Publishes to Maven Central
6. Publishes to GitHub Packages

## Version Management

### Version Sources

The workflow determines version from (in order):
1. Manual input (workflow_dispatch)
2. Git tag (removes `v` prefix)
3. GitHub release tag

### Version Formats

- **Stable**: `1.2.3`
- **Pre-release**: `1.2.3-beta.1`, `1.2.3-alpha.1`
- **Development**: `1.2.3-dev.20240115`

## Troubleshooting

### npm Publishing Issues

**Error: 401 Unauthorized**
- Check `NPM_TOKEN` is valid
- Ensure token has publish permissions
- For scoped packages, ensure public access

**Error: 403 Forbidden**
- Package name might be taken
- You might not have permissions
- Check `publishConfig.access` is "public"

### PyPI Publishing Issues

**Error: Invalid distribution**
- Run `twine check dist/*` locally
- Ensure `long_description` is valid
- Check metadata in `setup.py`

**Error: Version already exists**
- PyPI doesn't allow overwriting versions
- Bump to a new version

### Maven Publishing Issues

**Error: Unauthorized**
- Check OSSRH credentials
- Verify account at https://s01.oss.sonatype.org/

**Error: PGP signature failed**
- Ensure GPG key is valid
- Check key isn't expired
- Verify passphrase

## Local Testing

### Test npm Publishing
```bash
# Dry run
npm publish --dry-run

# Publish to local registry
npm install -g verdaccio
verdaccio
npm publish --registry http://localhost:4873
```

### Test PyPI Publishing
```bash
# Build
python -m build

# Check
twine check dist/*

# Upload to Test PyPI
twine upload --repository testpypi dist/*
```

### Test Maven Publishing
```bash
# Validate
mvn validate

# Deploy to local repository
mvn deploy -DaltDeploymentRepository=local::default::file:./target/staging-deploy
```

## Security Best Practices

1. **Use Fine-Grained Tokens**
   - Scope tokens to specific packages
   - Use automation tokens, not personal
   - Rotate tokens regularly

2. **Protect Branches**
   - Require PR reviews
   - Enable branch protection on `main`
   - Require status checks

3. **Secret Management**
   - Never commit tokens
   - Use GitHub Secrets
   - Audit secret usage in workflow runs

4. **Version Control**
   - Use semantic versioning
   - Tag releases consistently
   - Keep CHANGELOG updated

## GitHub Packages

### npm on GitHub Packages

Packages are available at:
```
https://npm.pkg.github.com/@OWNER/PACKAGE
```

To use:
```bash
echo "@OWNER:registry=https://npm.pkg.github.com" >> .npmrc
npm install @OWNER/package-name
```

### Maven on GitHub Packages

Add to `pom.xml`:
```xml
<repositories>
  <repository>
    <id>github</id>
    <url>https://maven.pkg.github.com/OWNER/REPO</url>
  </repository>
</repositories>
```

## Monitoring

### Check Publishing Status

1. **GitHub Actions**: Actions tab → Workflow runs
2. **npm**: https://www.npmjs.com/package/YOUR-PACKAGE
3. **PyPI**: https://pypi.org/project/YOUR-PACKAGE/
4. **Maven**: https://search.maven.org/

### Set Up Notifications

1. GitHub: Settings → Notifications → Actions
2. npm: Account → Profile → Email Preferences
3. PyPI: Account → Email addresses

## Advanced Configuration

### Conditional Publishing

```yaml
# Only publish if tests pass
needs: [test, lint]
if: success()
```

### Matrix Publishing

```yaml
strategy:
  matrix:
    registry: [npm, github]
    package: [main, plugin1, plugin2]
```

### Custom Version Logic

```yaml
- name: Generate Version
  run: |
    # Use commit SHA for dev versions
    if [[ "${{ github.ref }}" == "refs/heads/develop" ]]; then
      VERSION="0.0.0-dev.$(git rev-parse --short HEAD)"
    fi
```

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/publishing-packages)
- [PyPI Publishing Tutorial](https://packaging.python.org/tutorials/packaging-projects/)
- [Maven Central Guide](https://central.sonatype.org/publish/)
- [GitHub Packages Docs](https://docs.github.com/en/packages)