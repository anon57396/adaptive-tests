# Release Checklist

Use this checklist when preparing Adaptive Tests for a public drop, demo, or
sponsor outreach. It keeps the repository lean while guaranteeing that all
packaged artifacts are ready.

## 1. Refresh build artifacts

```bash
npm install        # if dependencies changed
npm run build:types
npm run build:plugins
```

The `build:plugins` script compiles the Vite and Webpack companion packages into
`languages/javascript/plugins/*/dist` without requiring external bundlers.

## 2. Sanitize local artifacts

Run the helper to remove heavy caches, virtualenvs, and temporary directories
before packaging or zipping the repo:

```bash
npm run clean:artifacts
```

Add additional paths to `scripts/clean-artifacts.js` if new tooling introduces
large working directories.

## 3. Validate the story end-to-end

```bash
npm test
npm run validate
npm run test:typescript
```

## 4. Update documentation & changelog

- Ensure `CHANGELOG.md` reflects the release (include the date).
- Confirm `ROADMAP.md` lists the correct "Last Updated" timestamp.
- Re-run `npm run lint:markdown` and `npm run lint:links` after edits.

## 5. Tag & publish

```bash
npm version <patch|minor|major>
npm publish
```

For companion packages:

```bash
cd languages/javascript/plugins/vite-plugin-adaptive
npm publish

cd ../webpack-plugin-adaptive
npm publish
```

Remember to push tags and the updated changelog:

```bash
git push --follow-tags
```
