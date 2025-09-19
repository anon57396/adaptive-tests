Adaptive Tests – Prompt Guide

- Purpose: Give AI agents the shortest path to analyze, discover, and scaffold tests with machine‑readable output.

Analysis CLI (JSON‑first)

- Discovery Lens: rank candidates and get suggestions
  - `npx adaptive-tests why '{"name":"UserService"}' --json`
  - `npx adaptive-tests why '{"name":"Calculator","type":"class","methods":["add","subtract"]}' --root . --json`

- Scaffold tests from source or name (JSON summary)
  - `npx adaptive-tests scaffold src/services/UserService.js --json`
  - `npx adaptive-tests scaffold UserService --json`

- Planned (shape for agents; may not be available yet)
  - Gaps (untested components/methods): `npx adaptive-tests gaps --report untested,methods --json`
  - Visualize (graph JSON/HTML): `npx adaptive-tests visualize '{"name":"UserService"}' --depth 2 --out visualize --json`
  - Refactor (dry‑run by default): `npx adaptive-tests refactor --move src/old.js --to src/new.js --json [--apply]`

Discover Function Signature

- `discover<T>(signature: DiscoverySignature, rootPath?: string): Promise<T>`
- Minimal signature fields supported by the engine:
  - `name: string | RegExp`
  - `type: 'class' | 'function' | 'object'`
  - `exports?: string` (named export to select)
  - `methods?: string[]` (public instance/static methods)
  - `properties?: string[]` (instance properties)
  - `extends?: string | Function` (base class name or constructor)

Notes for Agents

- Prefer `--json` for stable, scriptable results; add `--root <repo>` when running outside the project root.
- If discovery fails, run the same `why ... --json` to get `suggestedSignature` and top candidates.
