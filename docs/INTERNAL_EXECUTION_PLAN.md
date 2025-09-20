# Internal Execution Plan – Adaptive Tests

This document tracks the project's strategic goals, development phases, and next steps. It is an internal guide for planning and execution.

**Project Status (September 2025): Ahead of Schedule.** The project has demonstrated exceptional velocity, completing major milestones far ahead of the original timeline. Full Java support and a comprehensive VS Code extension, originally planned as "Later" items, are now complete. This plan has been updated to reflect these accomplishments and to outline the next strategic phase: driving adoption.

## Principles

- Ship small, end‑to‑end vertical slices; keep scope tight and demonstrable.
- Preserve zero‑runtime discovery guarantees for all discovery/insight commands.
- Make new features explainable: every result should have a way to "show why".
- Prefer HTML + JSON artifacts for CI and debugging.

---

## ✅ Completed Milestones

### Phase 1: Core Engine & CLI (Complete)
- **Core Discovery Engine:** A robust, zero-runtime discovery engine using AST analysis was implemented.
- **Smart Test Scaffolding:** The `npx adaptive-tests scaffold` command was created to automatically generate test files from source metadata.
- **Discovery Lens:** The `npx adaptive-tests why` command was implemented to provide transparent, debuggable insights into the discovery process.
- **TypeScript Support:** Full support for TypeScript, including path alias resolution, was integrated into the core engine.

### Phase 2: Language Expansion (Complete)
- **PHP Support:** Full discovery and scaffolding support for PHP was implemented, leveraging the `php-parser` library within the Node.js environment.
- **Java Support:** A comprehensive Java integration was completed. This includes an AST bridge using `java-parser`, rich metadata extraction, and JUnit 5 test generation that respects Maven/Gradle project structures.

### Phase 3: IDE Integration & API (Complete)
- **VS Code Extension:** A full-featured VS Code extension was developed, significantly exceeding the original scope of a simple "optional panel."
- **Key Features:**
    - **Interactive Discovery Lens:** A webview UI for the `why` command.
    - **Smart Scaffolding:** Right-click context menus for file and folder scaffolding.
    - **Smart Test Detection:** Dynamic context menus that change based on test existence.
- **Hub-Ready API:** The extension was architected with a public API surface for potential future integrations with other development tools.

---

## 🚀 Next Strategic Focus: Growth & Adoption

With the core product vision largely realized, the project's primary focus now shifts from feature development to driving wide adoption. The following strategies will guide this new phase.

### 1. Zero-Friction Onboarding
- **Interactive Demo**: Create an interactive demo at adaptive-tests.dev showing a test surviving a massive refactor.
- **Migration Tool**: `npx adaptive-tests migrate` – an automated codemod to convert traditional tests.
- **Framework Templates**: Pre-configured setups for Next.js, Vite, CRA, Express with one-line install.
- **5-Minute Video**: A compelling before/after video showing a 70% reduction in test maintenance.

### 2. Strategic Positioning
- **Pain-First Messaging**: "Stop Fixing Broken Import Paths," not "Adaptive Test Discovery."
- **SEO Content**: Target "test maintenance burden," "refactoring breaks tests," "import path errors."
- **Comparison Matrix**: vs. Jest, Vitest, Mocha, showing the unique value proposition.
- **ROI Calculator**: A tool showing hours saved based on team size.

### 3. Framework Integration Fast-Track
- **Jest Plugin** (`jest-adaptive`): A zero-config Jest transformer.
- **Vite & Webpack Plugins**: For discovery during HMR and at build time.
- **VS Code Extension Enhancements**: Visual test coverage overlay and quick fixes.

### 4. Community Catalyst Program
- **Early Adopter Benefits**: Feature case studies, direct support, roadmap influence.
- **Ambassador Program**: Recognize top contributors with swag and conference tickets.
- **Office Hours**: Weekly Zoom sessions for migration help.
- **Bounty Program**: Pay for framework integrations, recipes, and translations.

### 5. Enterprise Adoption Path
- **Pilot Package**: A 30-day guided migration for one team.
- **Success Metrics Dashboard**: To track maintenance time reduction.
- **Executive Summary Template**: For selling the concept to leadership.
- **Compliance & Security Docs**: SOC2, GDPR considerations.

---

## 🛠️ Future Development Roadmap

The following major technical features remain in the backlog and will be prioritized based on feedback gathered during the growth and adoption phase.

### Advanced Insights
- **Interactive Visualizer (`visualize`):** Generate an HTML-based dependency graph showing the relationships between components, tests, and importers.
- **Test Gap Analysis (`gaps`):** A static analysis tool to report untested components and public methods.
- **Refactor Assistant (`refactor`):** A dry-run AST rewriter to help automate the updating of import paths.

### Future Language Expansion
- **Go Implementation:** A native Go implementation targeting microservices and cloud-native applications.
- **C# (.NET) Implementation:** A Roslyn-powered implementation for the .NET and Unity ecosystems.

### Python Parity Initiative
- Bring the existing Python package (`adaptive-tests-py`) to full feature parity with the JavaScript engine, including a robust CLI, scaffolding, and advanced discovery features.
