const fs = require('fs');
const path = require('path');

function buildFullName(scopeStack, rawName) {
  if (!rawName) {
    return null;
  }
  let name = rawName.trim();
  name = name.replace(/\s+/g, '');
  if (!name) {
    return null;
  }
  if (name.startsWith('::')) {
    name = name.slice(2);
  }
  if (name.includes('::') || scopeStack.length === 0) {
    return name;
  }
  return `${scopeStack[scopeStack.length - 1]}::${name}`;
}

function ensureStructure(structures, fullName, kind) {
  if (!fullName) {
    return null;
  }
  if (!structures.has(fullName)) {
    const entry = {
      name: fullName.split('::').pop(),
      fullName,
      type: kind,
      instanceMethods: new Set(),
      classMethods: new Set()
    };
    if (fullName.includes('::')) {
      entry.modulePath = fullName.split('::').slice(0, -1).join('::');
    }
    structures.set(fullName, entry);
  }
  const entry = structures.get(fullName);
  if (!entry.type) {
    entry.type = kind;
  }
  return entry;
}

function stripComments(line) {
  const parts = [];
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (char === '"' && !inSingle) {
      inDouble = !inDouble;
    }
    if (char === '#' && !inSingle && !inDouble) {
      break;
    }
    parts.push(char);
  }
  return parts.join('');
}

class RubyDiscoveryIntegration {
  getFileExtension() {
    return '.rb';
  }

  parseFile(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      return null;
    }

    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath) || !absolutePath.endsWith('.rb')) {
      return null;
    }

    let content;
    try {
      content = fs.readFileSync(absolutePath, 'utf8');
    } catch (error) {
      if (process.env.DEBUG_DISCOVERY) {
        console.error('[adaptive-tests] Failed to read Ruby file:', error.message);
      }
      return null;
    }

    const structures = new Map();
    const topMethods = new Set();
    const scopeStack = [];
    const blockStack = [];

    const lines = content.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = stripComments(rawLine);
      const stripped = line.trim();

      if (!stripped) {
        continue;
      }

      if (/^end\b/.test(stripped)) {
        const closing = blockStack.pop();
        if (closing === 'module' || closing === 'class') {
          scopeStack.pop();
        }
        continue;
      }

      const moduleMatch = stripped.match(/^module\s+([A-Za-z0-9_:]+)/);
      if (moduleMatch) {
        const rawName = moduleMatch[1].split('<')[0];
        const fullName = buildFullName(scopeStack, rawName);
        ensureStructure(structures, fullName, 'module');
        scopeStack.push(fullName);
        blockStack.push('module');
        continue;
      }

      const classMatch = stripped.match(/^class\s+([A-Za-z0-9_:]+)/);
      if (classMatch && !/^class\s*<<\s*self/.test(stripped)) {
        const rawName = classMatch[1].split('<')[0];
        const fullName = buildFullName(scopeStack, rawName);
        ensureStructure(structures, fullName, 'class');
        scopeStack.push(fullName);
        blockStack.push('class');
        continue;
      }

      if (/^class\s*<<\s*self/.test(stripped)) {
        blockStack.push('singleton');
        continue;
      }

      const defMatch = stripped.match(/^def\s+(self\.)?([A-Za-z0-9_?!]+)/);
      if (defMatch) {
        const isClassMethod = Boolean(defMatch[1]);
        const methodName = defMatch[2];
        if (isClassMethod) {
          if (scopeStack.length > 0) {
            const entry = ensureStructure(structures, scopeStack[scopeStack.length - 1], 'class');
            if (entry) {
              entry.classMethods.add(methodName);
            }
          }
        } else {
          if (scopeStack.length > 0) {
            const entry = ensureStructure(structures, scopeStack[scopeStack.length - 1], 'class');
            if (entry) {
              entry.instanceMethods.add(methodName);
            }
          } else {
            topMethods.add(methodName);
          }
        }
        blockStack.push('def');
        continue;
      }

      if (/\bdo\b/.test(stripped)) {
        blockStack.push('block');
        continue;
      }

      if (/^(begin|if|elsif|unless|case|while|until|for|loop|rescue|ensure)\b/.test(stripped)) {
        blockStack.push('block');
      }
    }

    const result = {
      classes: [],
      modules: [],
      methods: Array.from(topMethods)
    };

    structures.forEach((entry) => {
      const data = {
        name: entry.name,
        fullName: entry.fullName,
        type: entry.type,
        instanceMethods: Array.from(entry.instanceMethods),
        classMethods: Array.from(entry.classMethods)
      };
      if (entry.modulePath) {
        data.modulePath = entry.modulePath;
      }
      if (entry.type === 'module') {
        result.modules.push(data);
      } else {
        result.classes.push(data);
      }
    });

    return result;
  }

  extractCandidates(metadata) {
    if (!metadata) {
      return [];
    }

    const candidates = [];

    (metadata.classes || []).forEach((cls) => {
      candidates.push({
        name: cls.name,
        type: 'class',
        fullName: cls.fullName,
        methods: (cls.instanceMethods || []).map((name) => ({ name })),
        classMethods: cls.classMethods || [],
        metadata: cls,
        exported: true
      });
    });

    (metadata.modules || []).forEach((mod) => {
      candidates.push({
        name: mod.name,
        type: 'module',
        fullName: mod.fullName,
        methods: (mod.instanceMethods || []).map((name) => ({ name })),
        metadata: mod,
        exported: true
      });
    });

    (metadata.methods || []).forEach((methodName) => {
      candidates.push({
        name: methodName,
        type: 'method',
        methods: [],
        metadata: { name: methodName },
        exported: true
      });
    });

    return candidates;
  }

  buildExports(metadata) {
    if (!metadata) {
      return [];
    }

    const exports = [];

    metadata.classes.forEach((cls) => {
      exports.push({
        exportedName: cls.name,
        access: { type: 'default' },
        info: {
          name: cls.name,
          kind: 'class',
          methods: cls.instanceMethods || [],
          ruby: {
            type: 'class',
            metadata: cls
          }
        }
      });
    });

    metadata.modules.forEach((mod) => {
      exports.push({
        exportedName: mod.name,
        access: { type: 'default' },
        info: {
          name: mod.name,
          kind: 'module',
          methods: mod.instanceMethods || [],
          ruby: {
            type: 'module',
            metadata: mod
          }
        }
      });
    });

    metadata.methods.forEach((methodName) => {
      exports.push({
        exportedName: methodName,
        access: { type: 'default' },
        info: {
          name: methodName,
          kind: 'method',
          methods: [],
          ruby: {
            type: 'method',
            metadata: { name: methodName }
          }
        }
      });
    });

    return exports;
  }

  generateTestContent(target, options = {}) {
    return this.generateRSpecTest({
      target,
      signature: options.signature || {},
      requirePath: options.requirePath
    });
  }

  generateRSpecTest({ target, signature, requirePath }) {
    const rubyInfo = target?.ruby?.metadata || target?.metadata || target;
    const fullName = rubyInfo?.fullName || rubyInfo?.name || signature?.name || 'Target';
    const instanceMethods = Array.isArray(rubyInfo?.instanceMethods) ? rubyInfo.instanceMethods : [];
    const classMethods = Array.isArray(rubyInfo?.classMethods) ? rubyInfo.classMethods : [];

    const lines = [];
    lines.push('# Auto-generated adaptive test');
    lines.push('# This spec was generated by adaptive-tests and should be refined.');
    if (requirePath) {
      lines.push(`require_relative '${requirePath}'`);
    }
    lines.push("require 'rspec'");
    lines.push('');
    lines.push(`RSpec.describe ${fullName} do`);

    if (instanceMethods.length > 0) {
      instanceMethods.slice(0, 5).forEach((method) => {
        lines.push(`  describe '#${method}' do`);
        lines.push("    it 'performs expected behaviour' do");
        lines.push('      pending "Add meaningful assertions"');
        lines.push('    end');
        lines.push('  end');
        lines.push('');
      });
    }

    if (classMethods.length > 0) {
      classMethods.slice(0, 5).forEach((method) => {
        lines.push(`  describe '.${method}' do`);
        lines.push("    it 'performs expected behaviour' do");
        lines.push('      pending "Add meaningful assertions"');
        lines.push('    end');
        lines.push('  end');
        lines.push('');
      });
    }

    if (instanceMethods.length === 0 && classMethods.length === 0) {
      lines.push("  it 'has pending examples' do");
      lines.push('    pending "Add meaningful assertions"');
      lines.push('  end');
    }

    lines.push('end');
    lines.push('');

    return lines.join('\n');
  }
}

module.exports = {
  RubyDiscoveryIntegration
};
