# Monorepo Workspace Transformation Plan - PARALLEL EXECUTION

## 🎯 Objective: Transform to Clean Monorepo with Workspaces

**Strategy**: Option 3 - Embrace Monorepo with Workspaces
**Execution Model**: Parallel work packages by multiple AI agents
**Last Updated**: 2025-09-20
**Current State**: Repository has symlink confusion - needs cleanup

---

## 📦 WORK PACKAGES - Can Be Done In Parallel

Each work package is **independent** and can be assigned to a different AI agent or developer. Packages are designed to not conflict with each other.

### 🧹 Package A: CLEANUP SYMLINKS & CREATE SHIMS
**Owner**: Agent/Dev A
**Dependencies**: None (MUST BE MERGED FIRST)
**Estimated Time**: 2-3 hours
**Branch**: `cleanup/remove-symlinks`

#### Tasks:
1. **Document all current symlinks**
   ```bash
   find . -maxdepth 3 -type l -ls > symlinks-backup.txt
   ```

2. **Replace root-level symlinks with temporary shim directories**
   ```bash
   # Remove symlinks and create real directories
   rm -f examples templates types
   mkdir -p examples templates types

   # Create forwarding README in each
   echo "# Moved to languages/*/examples" > examples/README.md
   echo "# Moved to languages/*/templates" > templates/README.md
   echo "# Moved to languages/*/types" > types/README.md
   ```

3. **Create package shims to prevent import breakage**
   ```bash
   # Remove symlinks
   rm -f packages/adaptive-tests-*
   rm -f packages/jest-adaptive
   rm -f packages/vite-plugin-adaptive
   rm -f packages/webpack-plugin-adaptive

   # Create minimal package.json files that re-export from new locations
   for pkg in jest-adaptive vite-plugin-adaptive webpack-plugin-adaptive; do
     mkdir -p packages/$pkg
     cat > packages/$pkg/package.json << EOF
   {
     "name": "$pkg",
     "version": "0.3.0",
     "main": "index.js",
     "description": "Temporary shim - see languages/javascript/packages/$pkg"
   }
   EOF
     cat > packages/$pkg/index.js << EOF
   // Temporary shim - package moved to languages/javascript/packages/$pkg
   module.exports = require('../../languages/javascript/packages/$pkg');
   EOF
   done
   ```

4. **Create src shims for gradual migration**
   ```bash
   # Remove symlinks but keep directories
   rm -f src/adaptive src/cli
   mkdir -p src/adaptive src/cli

   # Create forwarding index files
   echo "module.exports = require('../../languages/javascript/src');" > src/adaptive/index.js
   echo "module.exports = require('../../languages/javascript/src/cli');" > src/cli/index.js
   ```

5. **Create MIGRATION_NOTES.md** documenting shim strategy
   ```markdown
   # Migration Status

   ## Symlinks Removed
   - All symlinks have been replaced with temporary shim directories
   - Shims forward to new locations in languages/
   - This prevents import breakage during parallel migration

   ## Next Steps
   - Other packages can now work in parallel
   - Shims will be removed in final cleanup (Package F)
   ```

#### Verification:
```bash
# No symlinks should remain
find . -maxdepth 2 -type l | grep -v node_modules
# Should return empty

# But directories should exist to prevent breakage
test -d examples && echo "✓ examples directory exists"
test -d packages/jest-adaptive && echo "✓ jest-adaptive shim exists"
test -d src/adaptive && echo "✓ src/adaptive shim exists"

# Test that imports still work
node -e "require('./packages/jest-adaptive')" && echo "✓ Shims working"
```

#### CRITICAL NOTES:
- **This package MUST be merged before any other work begins**
- Shims ensure no broken imports during migration
- Other teams can start work immediately after this merges
- Package F will remove these shims after all migrations complete

---

### 📦 Package B: JAVASCRIPT WORKSPACE
**Owner**: Agent/Dev B
**Dependencies**: None (can work while Package A is in progress)
**Estimated Time**: 2-3 hours
**Branch**: `workspace/javascript`

#### Tasks:
1. **Create proper package.json**
   ```json
   // languages/javascript/package.json
   {
     "name": "@adaptive-tests/javascript",
     "version": "0.3.0",
     "main": "src/index.js",
     "scripts": {
       "test": "jest",
       "lint": "eslint src/",
       "build": "echo 'No build needed for JS'"
     }
   }
   ```

2. **Move any remaining files from root**
   - Check if anything in root `src/` needs moving
   - Ensure all JS examples are in `languages/javascript/examples/`

3. **Update all internal imports**
   ```javascript
   // Before: require('../../src/adaptive/discovery-engine')
   // After: require('./discovery-engine')
   ```

4. **Create workspace README**
   - Complete JavaScript-specific documentation
   - Installation instructions
   - API reference

5. **Ensure tests run independently**
   ```bash
   cd languages/javascript && npm install && npm test
   ```

#### Verification:
```bash
cd languages/javascript
npm install
npm test
# All tests should pass
```

---

### 📦 Package C: TYPESCRIPT WORKSPACE
**Owner**: Agent/Dev C
**Dependencies**: None
**Estimated Time**: 2-3 hours
**Branch**: `workspace/typescript`

#### Tasks:
1. **Update package.json**
   ```json
   // languages/typescript/package.json
   {
     "name": "@adaptive-tests/typescript",
     "version": "0.3.0",
     "main": "lib/index.js",
     "types": "lib/index.d.ts",
     "peerDependencies": {
       "@adaptive-tests/javascript": "^0.3.0"
     },
     "scripts": {
       "build": "tsc",
       "test": "jest",
       "prepublish": "npm run build"
     }
   }
   ```

2. **Setup proper TypeScript build**
   - Create `tsconfig.json` if missing
   - Ensure `lib/` directory for compiled output

3. **Move type definitions**
   - Ensure all `.d.ts` files are in this package

4. **Update imports to use workspace references**

5. **Create package-lock.json**
   ```bash
   cd languages/typescript && npm install
   ```

#### Verification:
```bash
cd languages/typescript
npm install
npm run build
npm test
# Build and tests should succeed
```

---

### 📦 Package D: PYTHON WORKSPACE
**Owner**: Agent/Dev D
**Dependencies**: None
**Estimated Time**: 2 hours
**Branch**: `workspace/python`

#### Tasks:
1. **Clean up Python structure**
   - Ensure `pyproject.toml` is complete
   - Move source to proper location if needed

2. **Create setup.py if missing**
   ```python
   from setuptools import setup, find_packages

   setup(
       name="adaptive-tests-py",
       version="0.3.0",
       packages=find_packages(where="src"),
       package_dir={"": "src"},
   )
   ```

3. **Update Python imports**
   - Fix any imports still referencing old structure

4. **Setup Python tests**
   ```bash
   cd languages/python
   python -m pytest tests/
   ```

5. **Create requirements.txt**
   - List all Python dependencies

#### Verification:
```bash
cd languages/python
python -m pip install -e .
python -m pytest tests/
# All tests should pass
```

---

### 📦 Package E: JAVA WORKSPACE
**Owner**: Agent/Dev E
**Dependencies**: None
**Estimated Time**: 2 hours
**Branch**: `workspace/java`

#### Tasks:
1. **Verify Maven structure**
   - Ensure `pom.xml` is complete
   - Check `src/main/java` structure

2. **Update Maven configuration**
   ```xml
   <groupId>io.adaptivetests</groupId>
   <artifactId>adaptive-tests-java</artifactId>
   <version>0.3.0</version>
   ```

3. **Fix Java package imports**
   - Update any imports referencing old structure

4. **Ensure examples work**
   ```bash
   cd languages/java
   mvn clean test
   ```

5. **Create Gradle alternative** (optional)
   - Add `build.gradle` for Gradle users

#### Verification:
```bash
cd languages/java
mvn clean install
mvn test
# Build and tests should succeed
```

---

### 📦 Package F: ROOT ORCHESTRATION & FINAL CLEANUP
**Owner**: Agent/Dev F
**Dependencies**: Packages B-E must be COMPLETE (not just started)
**Estimated Time**: 3-4 hours
**Branch**: `workspace/root-config`

#### Tasks:
1. **Create root workspace configuration**
   ```json
   // package.json (root)
   {
     "name": "adaptive-tests-monorepo",
     "private": true,
     "workspaces": [
       "languages/javascript",
       "languages/typescript",
       "languages/python",
       "languages/java",
       "tools/vscode-adaptive-tests"
     ],
     "scripts": {
       "test": "npm run test --workspaces",
       "test:js": "npm run test -w languages/javascript",
       "test:ts": "npm run test -w languages/typescript",
       "build": "npm run build --workspaces --if-present",
       "lint": "npm run lint --workspaces --if-present",
       "clean": "npm run clean --workspaces --if-present",
       "validate": "node scripts/validate-refactor.js"
     },
     "engines": {
       "node": ">=16.0.0",
       "npm": ">=7.0.0"
     }
   }
   ```

2. **Remove temporary shims (ONLY after verifying migrations)**
   ```bash
   # First verify all language packages are working
   npm test --workspace=languages/javascript
   npm test --workspace=languages/typescript

   # If all pass, remove shims
   rm -rf examples/README.md templates/README.md types/README.md
   rm -rf packages/jest-adaptive packages/vite-plugin-adaptive packages/webpack-plugin-adaptive
   rm -rf src/adaptive/index.js src/cli/index.js

   # Remove empty directories if no longer needed
   rmdir examples templates types 2>/dev/null || true
   rmdir packages 2>/dev/null || true
   rmdir src/adaptive src/cli src 2>/dev/null || true
   ```

3. **Update root README.md**
   ```markdown
   # Adaptive Tests - Monorepo

   ## 📦 Languages
   - [JavaScript](./languages/javascript) - Core implementation
   - [TypeScript](./languages/typescript) - TypeScript extension
   - [Python](./languages/python) - Python implementation
   - [Java](./languages/java) - Java implementation

   ## 🚀 Quick Start
   npm install  # Installs all workspaces
   npm test     # Runs all tests
   npm run test:js  # Test specific language
   ```

4. **Update .gitignore**
   ```
   # Workspace specific
   languages/*/node_modules/
   languages/*/lib/
   languages/*/dist/
   languages/*/.coverage/
   languages/python/__pycache__/
   languages/java/target/

   # Old structure (can be removed after migration)
   /packages/
   /src/
   ```

5. **Create CONTRIBUTING.md**
   - Explain monorepo structure
   - How to work on specific languages
   - Testing guidelines per language

6. **Final integration testing**
   ```bash
   # Run full validation suite
   npm run validate

   # Ensure cross-package dependencies work
   cd languages/typescript
   npm run test:adaptive

   # Test that nothing references old paths
   grep -r "packages/jest-adaptive" . --exclude-dir=node_modules || echo "✓ No old references"
   grep -r "src/adaptive" . --exclude-dir=node_modules --exclude-dir=languages || echo "✓ No old references"
   ```

#### Verification:
```bash
# From root - all should pass
npm install
npm test
npm run build
npm run validate

# Verify no broken imports
find . -name "*.js" -o -name "*.ts" | xargs grep -l "require.*packages/" | grep -v node_modules
# Should return empty
```

#### CRITICAL NOTES:
- **DO NOT start until Packages B-E are COMPLETE**
- **DO NOT remove shims until all tests pass**
- This is the FINAL cleanup - no going back
- Run full integration tests before removing any shims

---

### 📦 Package G: EXPERIMENTAL LANGUAGES
**Owner**: Agent/Dev G
**Dependencies**: None
**Estimated Time**: 1 hour
**Branch**: `workspace/experimental`

#### Tasks:
1. **Complete PHP setup**
   ```bash
   cd languages/php
   composer init
   ```

2. **Complete Go setup**
   ```bash
   cd languages/go
   go mod init github.com/adaptive-tests/go
   ```

3. **Complete Rust setup**
   ```bash
   cd languages/rust
   cargo init --lib
   ```

4. **Complete Ruby setup**
   ```bash
   cd languages/ruby
   bundle init
   ```

5. **Mark all as EXPERIMENTAL in READMEs**

#### Verification:
Each language should have basic project structure

---

### 📦 Package H: CI/CD UPDATE
**Owner**: Agent/Dev H
**Dependencies**: Packages B-E should be complete
**Estimated Time**: 1 hour
**Branch**: `workspace/ci-update`

#### Tasks:
1. **Update GitHub Actions workflows**
   - Point to new workspace paths
   - Use workspace commands

2. **Update workflow triggers**
   ```yaml
   paths:
     - 'languages/javascript/**'
     - '.github/workflows/javascript.yml'
   ```

3. **Add workspace test job**
   ```yaml
   - name: Test All Workspaces
     run: npm test --workspaces
   ```

4. **Update badges in README**
   - Point to new workflow status

5. **Create release workflow**
   - Can publish each package independently

#### Verification:
Push to branch and verify CI runs correctly

---

### 📦 Package I: TOOLING UPDATE
**Owner**: Agent/Dev I
**Dependencies**: Package F (root config)
**Estimated Time**: 1 hour
**Branch**: `workspace/tooling`

#### Tasks:
1. **Update VS Code extension**
   ```json
   // tools/vscode-adaptive-tests/package.json
   {
     "name": "vscode-adaptive-tests",
     "version": "0.3.0"
   }
   ```

2. **Fix extension tests**
   - Update paths in tests
   - Create package-lock.json

3. **Update extension to work with monorepo**
   - Detect workspace structure
   - Support multiple languages

4. **Update developer tools**
   - Scripts that need path updates
   - Build tools configuration

5. **Create development setup script**
   ```bash
   #!/bin/bash
   # setup-dev.sh
   npm install
   npm run build --workspaces --if-present
   ```

#### Verification:
```bash
cd tools/vscode-adaptive-tests
npm install
npm test
```

---

### 📦 Package J: FINAL INTEGRATION & VERIFICATION
**Owner**: Agent/Dev J
**Dependencies**: ALL packages (A-I) must be complete
**Estimated Time**: 1-2 hours
**Branch**: `final/integration-testing`

#### Tasks:
1. **Verify no symlinks remain**
   ```bash
   # Should return empty
   find . -type l ! -path "*/node_modules/*"
   ```

2. **Test all language implementations**
   ```bash
   # JavaScript
   cd languages/javascript && npm test && cd ../..

   # TypeScript
   cd languages/typescript && npm test && cd ../..

   # Python
   cd languages/python && python -m pytest && cd ../..

   # Java
   cd languages/java && mvn test && cd ../..
   ```

3. **Test cross-language dependencies**
   ```bash
   # TypeScript depends on JavaScript
   cd languages/typescript
   npm ls adaptive-tests  # Should resolve to languages/javascript
   npm run test:adaptive
   cd ../..
   ```

4. **Verify workspace commands**
   ```bash
   # From root
   npm install
   npm test
   npm run build
   npm run lint
   ```

5. **Check for broken imports**
   ```bash
   # Find any references to old structure
   grep -r "packages/adaptive-tests" . --exclude-dir=node_modules
   grep -r "src/adaptive" . --exclude-dir=node_modules --exclude-dir=languages
   grep -r "../../../src" . --exclude-dir=node_modules
   # All should return empty
   ```

6. **Run full validation**
   ```bash
   node scripts/validate-refactor.js
   # Should show 100% success rate
   ```

7. **Update progress tracking**
   - Mark all packages as complete in MASSIVE_REFACTOR_PLAN.md
   - Create final PR summarizing the complete refactor

#### Verification:
```bash
# Everything should pass
npm run validate
# Success rate should be 100%
```

#### Success Criteria:
- [ ] All symlinks removed
- [ ] All tests passing in all languages
- [ ] Cross-package dependencies working
- [ ] No references to old structure
- [ ] Validation script shows 100%
- [ ] CI/CD pipelines all green

---

## 🔄 COORDINATION POINTS

### ⚠️ CRITICAL SEQUENCE DEPENDENCIES

1. **Package A MUST complete first**
   - Creates shims to prevent breakage
   - All other work depends on this foundation
   - NO OTHER WORK should start until A is merged

2. **Packages B-E can run in parallel** (after A completes)
   - Each language team works independently
   - No cross-dependencies between these packages
   - Can all be worked on simultaneously

3. **Package F waits for B-E completion**
   - Needs all language packages fully migrated
   - Will remove temporary shims
   - Creates final workspace configuration

4. **Packages G-I can run in parallel with B-E**
   - Experimental languages (G)
   - CI/CD updates (H)
   - Tooling updates (I)
   - These don't block the main migration

5. **Package J is the final step**
   - Runs only after ALL packages complete
   - Final integration testing
   - Confirms 100% success

### Checkpoint 1: After Shim Creation (Package A)
- ✅ Verify no broken imports in main branch
- ✅ All agents pull latest after Package A merges
- ✅ Shims are working (test with `node -e "require('./packages/jest-adaptive')"`)

### Checkpoint 2: After Language Workspaces (Packages B-E)
- ✅ Each language can run independently
- ✅ Share successful patterns between agents
- ✅ No references to old paths in language directories

### Checkpoint 3: After Root Config (Package F)
- ✅ Verify monorepo commands work
- ✅ All workspaces accessible from root
- ✅ Shims have been safely removed

### Checkpoint 4: Final Integration (Package J)
- ✅ All packages merged
- ✅ Full test suite passes
- ✅ Documentation complete
- ✅ 100% validation success

---

## ✅ SUCCESS CRITERIA

### Per Package:
- [ ] Branch created and pushed
- [ ] All tasks completed
- [ ] Verification passes
- [ ] PR created with clear description
- [ ] No merge conflicts with main

### Overall:
- [ ] No more symlinks in repository
- [ ] Each language works independently
- [ ] Root npm commands work for all workspaces
- [ ] CI/CD passes for all languages
- [ ] Documentation is clear and complete

---

## 🚀 EXECUTION INSTRUCTIONS

### For AI Agents:
1. **Choose a package** that's not claimed
2. **Create your branch** from main
3. **Work independently** - don't wait for others
4. **Test thoroughly** before creating PR
5. **Document changes** clearly in PR

### For Coordinators:
1. **Assign packages** to available agents
2. **Monitor progress** via branches
3. **Merge Package A first** (symlink cleanup)
4. **Merge language packages** in any order
5. **Merge root config** after languages
6. **Final verification** after all merges

---

## 📊 PROGRESS TRACKING

| Package | Owner | Branch | Status | PR | Merged | Dependencies |
|---------|-------|--------|--------|----|----|--------------|
| A: Cleanup & Shims | - | `cleanup/remove-symlinks` | Not Started | - | - | None (FIRST) |
| B: JavaScript | - | `workspace/javascript` | Not Started | - | - | A |
| C: TypeScript | - | `workspace/typescript` | Not Started | - | - | A |
| D: Python | - | `workspace/python` | Not Started | - | - | A |
| E: Java | - | `workspace/java` | Not Started | - | - | A |
| F: Root Config | - | `workspace/root-config` | Not Started | - | - | B,C,D,E |
| G: Experimental | - | `workspace/experimental` | Not Started | - | - | A |
| H: CI/CD | - | `workspace/ci-update` | Not Started | - | - | B,C,D,E |
| I: Tooling | - | `workspace/tooling` | Not Started | - | - | F |
| J: Final Integration | - | `final/integration-testing` | Not Started | - | - | ALL |

---

## 🎯 END GOAL

A clean monorepo where:
- **No symlinks** - everything has ONE location
- **Clear structure** - developers know exactly where to look
- **Independent packages** - each language can be developed/tested/published separately
- **Unified tooling** - root commands work across all workspaces
- **Modern patterns** - using standard npm/yarn workspace features

---

**This plan is designed for parallel execution. Multiple agents can work simultaneously without conflicts.**