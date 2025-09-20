# 🗺️ Adaptive Tests Roadmap

> **Our Mission**: Eliminate test maintenance burden so developers can focus on building great software.

## 🎯 Vision

Adaptive Tests aims to be a widely adopted way to write resilient test suites. We envision a world where:

- Tests never break due to file reorganization
- Refactoring is fearless and frequent
- Test maintenance time is significantly reduced
- Popular frameworks offer integrations and recipes

## ✅ Recently Shipped (0.2.4)

- Offline-friendly build script (`npm run build:plugins`) for companion packages + release checklist
- Repo hygiene helper (`npm run clean:artifacts`) to strip caches before packaging
- Discovery Lens CLI (`npx adaptive-tests why`) with detailed scoring breakdowns and suggested signatures
- Docs site + new guides: How It Works and Best Practices
- Generated API reference (docs/api) with automatic rebuild in CI
- Markdown link checker in CI; markdown lint integrated
- Quiet Codecov policy (informational only); focused coverage scope
- README + badges + website link; GitHub Pages setup

## 🧭 Roadmap (Theme‑based)

We plan in three tracks. Each item links to an issue once opened.

### Now (ships next)

- Developer Experience
  - Smart Test Scaffolding (CLI: `scaffold`) — generate adaptive test skeletons from source metadata
  - Framework recipes — React components + Express services
  - Discovery Lens polish — friendlier error hints suggesting `why`

- Engine
  - Heuristic tuning + docs examples informed by community repos

### Next

- Insights & Safety Nets
  - Interactive Visualizer (CLI: `visualize`) — HTML graph: component ↔ tests ↔ importers
  - Test Gap Analysis (CLI: `gaps`) — untested components + untested public methods (static MVP)
  - PR artifacts — upload visualize/gaps HTML to CI for review

- Developer Experience
  - Vitest/Mocha recipes; TS templates for scaffolding
  - Java parity (adaptive-tests-java core + CLI, Spring Boot example)
  - **Java Parity** — adaptive-tests-java core + CLI, Spring Boot example, Maven/Gradle workflow guidance
  - Publish adaptive-tests-java artifacts to Maven Central with contributor guide

### Later

- Safety Nets
  - Refactor Assistant (CLI: `refactor`) — dry‑run AST import rewrites with diff preview; `--apply` to mutate

- Engine
  - Selective TS migration of core surfaces for stronger types (keep zero‑config JS usage)

- Ecosystem
  - Optional IDE integrations (VS Code panel for Lens/Visualizer) once CLI is stable
  - Python companion: keep “lightweight companion” scope unless parity investment is planned

## 🔭 Exploratory Ideas

### Adaptive Tests Cloud

- Hosted discovery service
- Cross-team test sharing
- Global discovery cache
- Analytics and insights

### AI‑Powered Testing

- Auto-generate tests from code changes
- Predict which tests need updating
- Smart test selection based on changes
- Natural language test specifications

### Standards & Collaboration

- Participate in community discussions with framework maintainers
- Document shared patterns and best practices
- Maintain a high-quality reference implementation

## 🤝 How to Contribute

We need help in several areas:

### Immediate Needs

- 🎨 Logo and visual design
- 📝 Documentation and tutorials
- 🌍 Internationalization
- 🧪 Testing on different platforms
- 🐛 Bug reports and fixes

### Technical Contributions

- Framework integrations
- Performance optimizations
- New language implementations
- IDE plugin development

### Community Building

- Write blog posts
- Create interactive examples
- Contribute to documentation
- Help in GitHub discussions

## 📊 Success Metrics

We'll track progress using practical indicators:

- Growing weekly npm downloads
- Increasing GitHub stars and community engagement
- Integrations and recipes across popular frameworks
- "Adaptive testing" recognized as a useful approach
- Case studies showing reduced test maintenance time

## 💬 Get Involved

- GitHub Issues: <https://github.com/anon57396/adaptive-tests/issues>
- npm: <https://www.npmjs.com/package/adaptive-tests>
- PyPI: <https://pypi.org/project/adaptive-tests-py/>

---

*This roadmap is a living document. We adjust based on community feedback and needs. Your input shapes our direction!*

Last Updated: September 19, 2025
