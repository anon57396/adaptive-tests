#!/usr/bin/env node

const path = require('path');
const { getDiscoveryEngine } = require('../adaptive/discovery-engine');
const { explainPythonSignature } = require('../adaptive/python/python-why');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function formatNumber(value) {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(2);
}

function formatSigned(value) {
  const numeric = value || 0;
  const prefix = numeric >= 0 ? '+' : '';
  return `${prefix}${formatNumber(numeric)}`;
}

function parseArgs(args) {
  const options = {
    signatureInput: '',
    signature: null,
    root: process.cwd(),
    json: false
  };

  const signatureParts = [];

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--json') {
      options.json = true;
      continue;
    }

    if (arg.startsWith('--json=')) {
      options.json = arg.split('=')[1] !== 'false';
      continue;
    }

    if (arg === '--root') {
      const next = args[i + 1];
      if (!next) {
        throw new Error('Missing value for --root');
      }
      options.root = path.resolve(next);
      i += 1;
      continue;
    }

    if (arg.startsWith('--root=')) {
      options.root = path.resolve(arg.split('=')[1]);
      continue;
    }

    signatureParts.push(arg);
  }

  const signatureInput = signatureParts.join(' ').trim();
  if (!signatureInput) {
    throw new Error('Please provide a JSON signature, e.g. { "name": "UserService" }');
  }

  let signature;
  try {
    signature = JSON.parse(signatureInput);
  } catch (error) {
    throw new Error(`Invalid JSON signature: ${error.message}`);
  }

  if (!signature || typeof signature !== 'object' || Array.isArray(signature)) {
    throw new Error('Signature must be a JSON object');
  }

  options.signatureInput = signatureInput;
  options.signature = signature;
  return options;
}

function summarizeExports(metadata) {
  if (!metadata || !Array.isArray(metadata.exports)) {
    return [];
  }

  return metadata.exports.map((entry) => ({
    exportedName: entry.exportedName || (entry.access && entry.access.name) || null,
    accessType: entry.access ? entry.access.type : null,
    accessName: entry.access ? entry.access.name : null,
    kind: entry.info ? entry.info.kind : 'unknown',
    name: entry.info ? entry.info.name : null,
    methods: entry.info && Array.isArray(entry.info.methods) ? entry.info.methods : [],
    properties: entry.info && Array.isArray(entry.info.properties) ? entry.info.properties : [],
    extends: entry.info ? entry.info.extends : null
  }));
}

function deriveSuggestedSignature(engine, candidate, normalizedSignature) {
  if (!candidate || !candidate.metadata || !Array.isArray(candidate.metadata.exports) || candidate.metadata.exports.length === 0) {
    return null;
  }

  let selected = null;
  if (typeof engine.selectExportFromMetadata === 'function') {
    try {
      selected = engine.selectExportFromMetadata(candidate, normalizedSignature);
    } catch (error) {
      selected = null;
    }
  }

  const entry = selected || candidate.metadata.exports[0];
  if (!entry || !entry.info) {
    return null;
  }

  const info = entry.info;
  const suggestion = {};

  if (info.kind) {
    suggestion.type = info.kind;
  }
  if (info.name) {
    suggestion.name = info.name;
  }
  if (entry.access && entry.access.type === 'named' && entry.access.name) {
    suggestion.exports = entry.access.name;
  }

  if (Array.isArray(info.methods) && info.methods.length > 0) {
    suggestion.methods = info.methods;
  }
  if (Array.isArray(info.properties) && info.properties.length > 0) {
    suggestion.properties = info.properties;
  }
  if (info.extends) {
    suggestion.extends = info.extends;
  }

  if (!suggestion.name) {
    suggestion.name = info.name || entry.exportedName || candidate.fileName;
  }

  return Object.keys(suggestion).length > 0 ? suggestion : null;
}

function formatCandidateOutput(root, candidate, index) {
  const relativePath = candidate.relativePath || path.relative(root, candidate.path) || candidate.path;
  const rankLabel = index === 0 ? `${COLORS.bright}${COLORS.cyan}★${COLORS.reset}` : `${COLORS.bright}${index + 1}.`;
  const lines = [];

  lines.push(`${rankLabel} ${relativePath}`);
  if (candidate.language) {
    lines.push(`${COLORS.dim}   Language:${COLORS.reset} ${candidate.language}`);
  }
  lines.push(`${COLORS.dim}   Score:${COLORS.reset} ${formatNumber(candidate.score)}${candidate.recency ? ` (recency ${formatSigned(candidate.recency)})` : ''}`);

  if (Array.isArray(candidate.details) && candidate.details.length > 0) {
    for (const detail of candidate.details) {
      const sourceLabel = detail.source ? ` ${detail.source}` : '';
      lines.push(`     ${formatSigned(detail.score)} (${detail.type}${sourceLabel})`);
    }
  }

  if (Array.isArray(candidate.exports) && candidate.exports.length > 0) {
    const exportNames = candidate.exports
      .map((exp) => (exp.exportedName || exp.accessName || exp.name))
      .filter(Boolean);
    if (exportNames.length > 0) {
      lines.push(`${COLORS.dim}   Exports:${COLORS.reset} ${exportNames.join(', ')}`);
    }
  }

  return lines.join('\n');
}

async function runWhy(args = []) {
  const preferJson = Array.isArray(args) && args.some((arg) => arg === '--json' || arg === '--json=true');
  let options;
  try {
    options = parseArgs(args);
  } catch (error) {
    if (preferJson) {
      console.log(JSON.stringify({ error: error.message }, null, 2));
    } else {
      console.error(`${COLORS.red}Error:${COLORS.reset} ${error.message}`);
    }
    process.exitCode = 1;
    return;
  }

  const outputAsJson = options.json || preferJson;

  let engine;
  try {
    engine = getDiscoveryEngine(options.root);
  } catch (error) {
    const message = `Failed to create discovery engine: ${error.message}`;
    if (outputAsJson) {
      console.log(JSON.stringify({ error: message }, null, 2));
    } else {
      console.error(`${COLORS.red}Error:${COLORS.reset} ${message}`);
    }
    process.exitCode = 1;
    return;
  }

  if (typeof engine.ensureCacheLoaded === 'function') {
    try {
      await engine.ensureCacheLoaded();
    } catch (error) {
      const message = `Failed to load discovery cache: ${error.message}`;
      if (outputAsJson) {
        console.log(JSON.stringify({ error: message }, null, 2));
      } else {
        console.error(`${COLORS.red}Error:${COLORS.reset} ${message}`);
      }
      process.exitCode = 1;
      return;
    }
  }

  let normalizedSignature;
  try {
    normalizedSignature = engine.normalizeSignature(options.signature);
  } catch (error) {
    const message = `Invalid signature: ${error.message}`;
    if (outputAsJson) {
      console.log(JSON.stringify({ error: message }, null, 2));
    } else {
      console.error(`${COLORS.red}Error:${COLORS.reset} ${message}`);
    }
    process.exitCode = 1;
    return;
  }

  let rawCandidates = [];
  try {
    rawCandidates = await engine.collectCandidates(engine.rootPath, normalizedSignature) || [];
  } catch (error) {
    const message = `Failed to collect candidates: ${error.message}`;
    if (outputAsJson) {
      console.log(JSON.stringify({ error: message }, null, 2));
    } else {
      console.error(`${COLORS.red}Error:${COLORS.reset} ${message}`);
    }
    process.exitCode = 1;
    return;
  }

  const enrichedCandidates = [];

  for (const candidate of rawCandidates) {
    const { totalScore, breakdown, details } = engine.scoringEngine.calculateScoreDetailed(
      candidate,
      normalizedSignature,
      candidate.content
    );

    const recencyBonus = candidate.mtimeMs ? engine.calculateRecencyBonus(candidate.mtimeMs) : 0;
    const recencyRounded = recencyBonus !== 0 ? Math.round(recencyBonus) : 0;

    const candidateDetails = Array.isArray(details) ? [...details] : [];
    if (recencyRounded !== 0) {
      candidateDetails.push({ type: 'recency', source: 'mtime', score: recencyRounded });
      breakdown.recency = recencyRounded;
    }

    const finalScore = totalScore + recencyBonus;

    enrichedCandidates.push({
      language: 'javascript',
      path: candidate.path,
      relativePath: path.relative(options.root, candidate.path) || candidate.path,
      fileName: candidate.fileName,
      score: finalScore,
      rawScore: totalScore,
      recency: recencyRounded !== 0 ? recencyRounded : null,
      breakdown,
      details: candidateDetails,
      exports: summarizeExports(candidate.metadata),
      metadata: candidate.metadata || null,
      mtimeMs: candidate.mtimeMs || null
    });
  }

  enrichedCandidates.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));

  const topCandidate = enrichedCandidates[0] || null;
  const suggestedSignature = topCandidate
    ? deriveSuggestedSignature(engine, { ...topCandidate, metadata: topCandidate.metadata }, normalizedSignature)
    : null;

  const pythonCandidates = explainPythonSignature(options.signatureInput, {
    root: options.root,
    limit: 5
  });

  const candidateGroups = [];
  if (enrichedCandidates.length > 0) {
    candidateGroups.push({ language: 'javascript', candidates: enrichedCandidates });
  }
  if (pythonCandidates.length > 0) {
    candidateGroups.push({ language: 'python', candidates: pythonCandidates });
  }

  const combinedCandidates = candidateGroups.flatMap((group) => group.candidates.map((candidate, index) => ({
    language: group.language,
    index,
    data: candidate
  })));

  if (outputAsJson) {
    const jsonOutput = {
      root: options.root,
      signatureInput: options.signatureInput,
      signature: options.signature,
      candidates: combinedCandidates.map((entry, overallIndex) => ({
        language: entry.data.language || entry.language,
        rank: overallIndex + 1,
        path: entry.data.path,
        relativePath: entry.data.relativePath,
        score: entry.data.score,
        rawScore: entry.data.rawScore,
        recency: entry.data.recency,
        breakdown: entry.data.breakdown,
        details: entry.data.details,
        exports: entry.data.exports
      }))
    };

    if (suggestedSignature) {
      jsonOutput.suggestedSignature = suggestedSignature;
    }

    if (combinedCandidates.length === 0) {
      jsonOutput.message = 'No candidates matched the given signature.';
    }

    console.log(JSON.stringify(jsonOutput, null, 2));
    return;
  }

  if (combinedCandidates.length === 0) {
    console.log(`${COLORS.yellow}No candidates matched the signature.${COLORS.reset}`);
    console.log(`Signature: ${options.signatureInput}`);
    return;
  }

  console.log(`${COLORS.cyan}🔎 Discovery Lens${COLORS.reset}`);
  console.log(`${COLORS.dim}Root:${COLORS.reset} ${options.root}`);
  console.log(`${COLORS.dim}Signature:${COLORS.reset} ${options.signatureInput}`);
  console.log('');

  candidateGroups.forEach((group, groupIndex) => {
    if (candidateGroups.length > 1) {
      console.log(`${COLORS.bright}${COLORS.blue}${group.language.toUpperCase()}${COLORS.reset}`);
    }
    group.candidates.forEach((candidate, index) => {
      console.log(formatCandidateOutput(options.root, candidate, index));
      if (index < group.candidates.length - 1) {
        console.log('');
      }
    });
    if (groupIndex < candidateGroups.length - 1) {
      console.log('\n');
    }
  });

  if (suggestedSignature) {
    console.log('\nSuggested signature for top candidate:');
    console.log(JSON.stringify(suggestedSignature, null, 2));
  }
}

module.exports = { runWhy };
