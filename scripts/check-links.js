#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const markdownLinkCheck = require('markdown-link-check');
const { pathToFileURL } = require('url');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, '.markdownlinkcheck.json');
let config = {};

if (fs.existsSync(configPath)) {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

const files = glob.sync('**/*.md', {
  cwd: root,
  ignore: [
    'node_modules/**',
    'docs/api/**',
    'coverage/**',
    'languages/python/dist/**',
    'languages/python/src/adaptive_tests_py.egg-info/**'
  ]
});

if (files.length === 0) {
  console.log('No markdown files found for link checking.');
  process.exit(0);
}

let hadFailures = false;

const checkFile = (file) => new Promise((resolve) => {
  const absolutePath = path.join(root, file);
  const markdown = fs.readFileSync(absolutePath, 'utf8');

  const baseUrl = `${pathToFileURL(path.dirname(absolutePath)).href}/`;

  markdownLinkCheck(markdown, { ...config, baseUrl }, (err, results) => {
    if (err) {
      hadFailures = true;
      console.error(`✖︎ ${file} — error: ${err.message}`);
      return resolve();
    }

    let fileHasFailures = false;
    results.forEach((result) => {
      if (result.status === 'dead') {
        if (result.link && result.link.endsWith('.html')) {
          const fallback = result.link.replace(/\.html$/i, '.md');
          const fallbackPath = path.resolve(path.dirname(absolutePath), fallback);
          if (fs.existsSync(fallbackPath)) {
            return;
          }
        }

        fileHasFailures = true;
        hadFailures = true;
        console.error(`✖︎ ${file}: ${result.link} (${result.statusCode || 'no status'})`);
      }
    });

    if (!fileHasFailures) {
      console.log(`✔︎ ${file}`);
    }

    resolve();
  });
});

(async () => {
  for (const file of files) {
    await checkFile(file);
  }

  if (hadFailures) {
    console.error('\nMarkdown link check failed.');
    process.exit(1);
  } else {
    console.log('\nAll markdown links look good.');
  }
})();
