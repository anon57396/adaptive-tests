# Monorepo Workspace Transformation Plan - PARALLEL EXECUTION

## 🎯 Objective: Transform to Clean Monorepo with Workspaces

**Strategy**: Option 3 - Embrace Monorepo with Workspaces
**Execution Model**: Parallel work packages by multiple AI agents
**Last Updated**: 2025-09-20
**Current State**: Repository has symlink confusion - needs cleanup

---

## 📦 WORK PACKAGES - Can Be Done In Parallel

Each work package is **independent** and can be assigned to a different AI agent or developer. Packages are designed to not conflict with each other.

### 🧹 Package A: CLEANUP SYMLINKS
**Owner**: Agent/Dev A
**Dependencies**: None
**Estimated Time**: 1-2 hours
**Branch**: `cleanup/remove-symlinks`

#### Tasks:
1. **Document all current symlinks**
   ```bash
   find . -maxdepth 3 -type l -ls > symlinks-backup.txt
   ```

2. **Remove root-level symlinks**
   ```bash
   rm -f examples templates types
   ```

3. **Remove package symlinks**
   ```bash
   rm -f packages/adaptive-tests-*
   rm -f packages/jest-adaptive
   rm -f packages/vite-plugin-adaptive
   rm -f packages/webpack-plugin-adaptive
   ```

4. **Remove src symlinks**
   ```bash
   rm -f src/adaptive src/cli
   ```

5. **Create MIGRATION_NOTES.md** documenting what was removed

#### Verification:
```bash
# No symlinks should remain in root or packages
find . -maxdepth 2 -type l | grep -v node_modules
# Should return empty
```

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

### 📦 Package F: ROOT ORCHESTRATION
**Owner**: Agent/Dev F
**Dependencies**: Packages A-E should be started
**Estimated Time**: 2 hours
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
       "tools/vscode-adaptive-tests"
     ],
     "scripts": {
       "test": "npm run test --workspaces",
       "build": "npm run build --workspaces --if-present",
       "lint": "npm run lint --workspaces --if-present"
     }
   }
   ```

2. **Update root README.md**
   - Clear navigation to each language
   - Remove references to old structure
   - Add monorepo setup instructions

3. **Clean up root directory**
   - Remove old `src/` if empty
   - Remove old `packages/` if empty
   - Archive old config files

4. **Update .gitignore**
   ```
   # Workspace specific
   languages/*/node_modules/
   languages/*/lib/
   languages/*/dist/
   ```

5. **Create CONTRIBUTING.md**
   - Explain monorepo structure
   - How to work on specific languages

#### Verification:
```bash
# From root
npm install
npm test
# Should run all workspace tests
```

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

## 🔄 COORDINATION POINTS

### Checkpoint 1: After Symlink Removal (Package A)
- Verify no broken imports in main branch
- All agents pull latest after Package A merges

### Checkpoint 2: After Language Workspaces (Packages B-E)
- Each language can run independently
- Share successful patterns between agents

### Checkpoint 3: After Root Config (Package F)
- Verify monorepo commands work
- All workspaces accessible from root

### Checkpoint 4: Final Integration
- All packages merged
- Full test suite passes
- Documentation complete

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

| Package | Owner | Branch | Status | PR | Merged |
|---------|-------|--------|--------|----|----|
| A: Cleanup Symlinks | - | `cleanup/remove-symlinks` | Not Started | - | - |
| B: JavaScript | - | `workspace/javascript` | Not Started | - | - |
| C: TypeScript | - | `workspace/typescript` | Not Started | - | - |
| D: Python | - | `workspace/python` | Not Started | - | - |
| E: Java | - | `workspace/java` | Not Started | - | - |
| F: Root Config | - | `workspace/root-config` | Not Started | - | - |
| G: Experimental | - | `workspace/experimental` | Not Started | - | - |
| H: CI/CD | - | `workspace/ci-update` | Not Started | - | - |
| I: Tooling | - | `workspace/tooling` | Not Started | - | - |

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