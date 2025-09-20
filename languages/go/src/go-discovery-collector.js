/**
 * Go Discovery Collector (Tree-sitter implementation)
 *
 * Parses Go source files using the JavaScript tree-sitter bindings. Extracts
 * metadata about structs, interfaces, functions, methods, and types without
 * relying on platform-specific binaries. The resulting metadata powers CLI
 * integrations such as scaffold and discovery bridges.
 */

const fs = require('fs');
const path = require('path');

let Parser;
let Go;

try {
  Parser = require('tree-sitter');
  Go = require('tree-sitter-go');
} catch (error) {
  // Defer throwing until parsing is attempted so environments without optional
  // dependencies can still load the module without immediately crashing.
  Parser = null;
  Go = null;
}

const DEFAULT_CONFIG = {
  extensions: ['.go'],
  skipPatterns: [
    'vendor/',
    'node_modules/',
    '_test.go',
    'testdata/',
    '.git/',
    'build/',
    'dist/'
  ]
};

class GoDiscoveryCollector {
  constructor(config = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config
    };

    this.initialized = false;
    this.parser = null;
  }

  ensureParser() {
    if (this.parser) {
      return;
    }

    if (!Parser || !Go) {
      throw new Error('tree-sitter or tree-sitter-go dependency not available. Install optional dependencies to enable Go discovery.');
    }

    this.parser = new Parser();
    this.parser.setLanguage(Go);
    this.initialized = true;
  }

  shouldScanFile(filePath) {
    const ext = path.extname(filePath);
    if (!this.config.extensions.includes(ext)) {
      return false;
    }

    const normalized = filePath.replace(/\\/g, '/');
    return !this.config.skipPatterns.some(pattern => normalized.includes(pattern));
  }

  async parseFile(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      return null;
    }

    if (!this.shouldScanFile(filePath)) {
      return null;
    }

    let source;
    try {
      source = await fs.promises.readFile(filePath, 'utf8');
    } catch (error) {
      if (process.env.DEBUG_DISCOVERY) {
        console.error('[adaptive-tests] Failed to read Go file:', error.message);
      }
      return null;
    }

    if (!source || !source.trim()) {
      return null;
    }

    try {
      this.ensureParser();
    } catch (error) {
      if (process.env.DEBUG_DISCOVERY) {
        console.error('[adaptive-tests] Go parser unavailable:', error.message);
      }
      return null;
    }

    let tree;
    try {
      tree = this.parser.parse(source);
    } catch (error) {
      if (process.env.DEBUG_DISCOVERY) {
        console.error('[adaptive-tests] Failed to parse Go file:', error.message);
      }
      return null;
    }

    try {
      return this.buildMetadata(tree.rootNode, source, filePath);
    } catch (error) {
      if (process.env.DEBUG_DISCOVERY) {
        console.error('[adaptive-tests] Failed to extract Go metadata:', error);
      }
      return null;
    }
  }

  buildMetadata(rootNode, source, filePath) {
    const metadata = {
      path: filePath,
      packageName: null,
      imports: [],
      structs: [],
      interfaces: [],
      functions: [],
      methods: [],
      types: [],
      constants: [],
      variables: [],
      errors: []
    };

    const structMap = new Map();

    for (let i = 0; i < rootNode.namedChildCount; i += 1) {
      const node = rootNode.namedChild(i);

      switch (node.type) {
        case 'package_clause':
          metadata.packageName = this.getNodeText(node.childForFieldName('name') || node.namedChildren[0], source) || null;
          break;
        case 'import_declaration':
          this.collectImports(node, source, metadata.imports);
          break;
        case 'type_declaration':
          this.collectTypes(node, source, metadata, structMap);
          break;
        case 'function_declaration':
          metadata.functions.push(this.parseFunction(node, source));
          break;
        case 'method_declaration':
          metadata.methods.push(this.parseMethod(node, source));
          break;
        case 'const_declaration':
          this.collectConstants(node, source, metadata.constants);
          break;
        case 'var_declaration':
          this.collectVariables(node, source, metadata.variables);
          break;
        default:
          break;
      }
    }

    // Attach methods to their receiver types (structs)
    metadata.methods.forEach(method => {
      const receiverType = method.receiver?.typeName;
      if (!receiverType) {
        return;
      }

      const structInfo = structMap.get(receiverType);
      if (!structInfo) {
        return;
      }

      structInfo.methods.push({
        name: method.name,
        parameters: method.parameters,
        returnType: method.returnType,
        exported: method.exported,
        isGeneric: method.isGeneric
      });
    });

    return metadata;
  }

  collectImports(node, source, imports) {
    const specs = [];

    for (let i = 0; i < node.namedChildCount; i += 1) {
      const child = node.namedChild(i);
      if (child.type === 'import_spec') {
        specs.push(child);
      } else if (child.type === 'import_spec_list') {
        for (let j = 0; j < child.namedChildCount; j += 1) {
          const spec = child.namedChild(j);
          if (spec.type === 'import_spec') {
            specs.push(spec);
          }
        }
      }
    }

    specs.forEach(spec => {
      const aliasNode = spec.childForFieldName('name');
      const pathNode = spec.childForFieldName('path');
      const pathText = this.stripQuotes(this.getNodeText(pathNode, source));
      const alias = aliasNode ? this.getNodeText(aliasNode, source) : null;
      const name = alias || (pathText ? path.basename(pathText) : null);

      imports.push({
        path: pathText,
        alias: alias || undefined,
        name
      });
    });
  }

  collectTypes(node, source, metadata, structMap) {
    for (let i = 0; i < node.namedChildCount; i += 1) {
      const typeSpec = node.namedChild(i);
      if (typeSpec.type !== 'type_spec') {
        continue;
      }

      const nameNode = typeSpec.childForFieldName('name');
      const typeNode = typeSpec.childForFieldName('type');
      const typeName = this.getNodeText(nameNode, source);
      const typeParameters = this.parseTypeParameters(typeSpec.childForFieldName('type_parameters'), source);

      if (!typeNode || !typeName) {
        continue;
      }

      if (typeNode.type === 'struct_type') {
        const structInfo = this.parseStruct(typeName, typeParameters, typeNode, source);
        metadata.structs.push(structInfo);
        structMap.set(typeName, structInfo);
      } else if (typeNode.type === 'interface_type') {
        metadata.interfaces.push(this.parseInterface(typeName, typeParameters, typeNode, source));
      } else {
        metadata.types.push({
          name: typeName,
          type: 'type',
          underlyingType: this.describeType(typeNode, source),
          typeParameters,
          exported: this.isExported(typeName)
        });
      }
    }
  }

  parseStruct(name, typeParameters, typeNode, source) {
    const fields = [];
    const embeds = [];

    const fieldList = typeNode.childForFieldName('body');
    if (fieldList) {
      for (let i = 0; i < fieldList.namedChildCount; i += 1) {
        const field = fieldList.namedChild(i);
        if (field.type !== 'field_declaration') {
          continue;
        }

        const { declarations, embeds: embedNodes } = this.parseFieldDeclaration(field, source);
        fields.push(...declarations);
        embeds.push(...embedNodes);
      }
    }

    return {
      name,
      type: 'struct',
      exported: this.isExported(name),
      fields,
      embeds,
      methods: [],
      typeParameters
    };
  }

  parseInterface(name, typeParameters, typeNode, source) {
    const methods = [];
    const embeds = [];

    const body = typeNode.childForFieldName('body');
    if (body) {
      for (let i = 0; i < body.namedChildCount; i += 1) {
        const child = body.namedChild(i);
        if (child.type === 'method_elem') {
          const methodNameNode = child.childForFieldName('name') || child.namedChildren.find(n => n.type === 'field_identifier');
          const paramsNode = child.childForFieldName('parameters');
          const resultNode = child.childForFieldName('result');
          const methodName = methodNameNode ? this.getNodeText(methodNameNode, source) : null;
          if (!methodName) {
            continue;
          }

          const parameters = this.parseParameters(paramsNode, source);
          const returnType = this.parseReturnType(resultNode, source);
          methods.push({
            name: methodName,
            parameters,
            returnType,
            exported: this.isExported(methodName),
            isGeneric: this.containsGenerics(returnType) || parameters.some(param => this.containsGenerics(param.type))
          });
        } else if (child.type === 'type_identifier') {
          const embedName = this.getNodeText(child, source);
          embeds.push({
            type: embedName,
            isPointer: false,
            isGeneric: this.containsGenerics(embedName)
          });
        }
      }
    }

    return {
      name,
      type: 'interface',
      exported: this.isExported(name),
      methods,
      embeds,
      typeParameters
    };
  }

  parseFunction(node, source) {
    const nameNode = node.childForFieldName('name');
    const paramsNode = node.childForFieldName('parameters');
    const resultNode = node.childForFieldName('result');
    const typeParametersNode = node.childForFieldName('type_parameters');

    const name = this.getNodeText(nameNode, source);
    const parameters = this.parseParameters(paramsNode, source);
    const returnType = this.parseReturnType(resultNode, source);
    const typeParameters = this.parseTypeParameters(typeParametersNode, source);

    return {
      name,
      type: 'function',
      parameters,
      returnType,
      exported: this.isExported(name),
      isGeneric: typeParameters.length > 0 || this.containsGenerics(returnType) || parameters.some(param => this.containsGenerics(param.type)),
      typeParameters
    };
  }

  parseMethod(node, source) {
    const receiverNode = node.childForFieldName('receiver');
    const nameNode = node.childForFieldName('name');
    const paramsNode = node.childForFieldName('parameters');
    const resultNode = node.childForFieldName('result');
    const typeParametersNode = node.childForFieldName('type_parameters');

    const receiverParams = this.parseParameters(receiverNode, source);
    const receiverParam = receiverParams[0] || null;
    const receiverTypeRaw = receiverParam ? receiverParam.type : null;
    const receiverTypeName = receiverTypeRaw ? receiverTypeRaw.replace(/^\*+/, '').split('.').pop() : null;

    const name = this.getNodeText(nameNode, source);
    const parameters = this.parseParameters(paramsNode, source);
    const returnType = this.parseReturnType(resultNode, source);
    const typeParameters = this.parseTypeParameters(typeParametersNode, source);

    return {
      name,
      parameters,
      returnType,
      exported: this.isExported(name),
      isGeneric: typeParameters.length > 0 || this.containsGenerics(returnType) || parameters.some(param => this.containsGenerics(param.type)),
      typeParameters,
      receiver: receiverParam ? {
        name: receiverParam.name,
        type: receiverParam.type,
        typeName: receiverTypeName,
        isPointer: receiverParam.type.startsWith('*')
      } : null
    };
  }

  collectConstants(node, source, constants) {
    const declarations = this.extractDeclarationLines(node, source);

    declarations.forEach(({ identifier, type, value }) => {
      constants.push({
        name: identifier,
        type: type || null,
        value: value || null,
        exported: this.isExported(identifier)
      });
    });
  }

  collectVariables(node, source, variables) {
    const declarations = this.extractDeclarationLines(node, source);

    declarations.forEach(({ identifier, type, value }) => {
      variables.push({
        name: identifier,
        type: type || null,
        value: value || null,
        exported: this.isExported(identifier)
      });
    });
  }

  parseFieldDeclaration(node, source) {
    const declarations = [];
    const embeds = [];

    const typeNode = node.childForFieldName('type');
    const tagNode = node.childForFieldName('tag');
    const typeText = this.describeType(typeNode, source);
    const tagText = tagNode ? this.stripQuotes(this.getNodeText(tagNode, source)) : null;

    const identifiers = [];
    for (let i = 0; i < node.namedChildCount; i += 1) {
      const child = node.namedChild(i);
      if (child.type === 'field_identifier') {
        identifiers.push(this.getNodeText(child, source));
      }
    }

    if (identifiers.length === 0 && typeText) {
      embeds.push({
        type: typeText.replace(/^\*+/, ''),
        isPointer: typeText.startsWith('*'),
        isGeneric: this.containsGenerics(typeText),
        raw: typeText
      });
    }

    identifiers.forEach(identifier => {
      declarations.push({
        name: identifier,
        type: typeText,
        tag: tagText || undefined,
        exported: this.isExported(identifier),
        isPointer: typeText.startsWith('*'),
        isSlice: typeText.startsWith('[]'),
        isMap: typeText.startsWith('map['),
        isChan: typeText.includes('chan'),
        isGeneric: this.containsGenerics(typeText)
      });
    });

    return { declarations, embeds };
  }

  parseParameters(listNode, source) {
    if (!listNode) {
      return [];
    }

    const params = [];

    for (let i = 0; i < listNode.namedChildCount; i += 1) {
      const child = listNode.namedChild(i);
      if (child.type !== 'parameter_declaration') {
        continue;
      }

      const typeNode = child.childForFieldName('type');
      const identifiers = [];

      for (let j = 0; j < child.namedChildCount; j += 1) {
        const paramChild = child.namedChild(j);
        if (paramChild.type === 'identifier' || paramChild.type === 'blank_identifier') {
          identifiers.push(this.getNodeText(paramChild, source));
        }
      }

      const typeText = this.describeType(typeNode, source);
      if (identifiers.length === 0) {
        params.push({ name: null, type: typeText });
      } else {
        identifiers.forEach(identifier => {
          params.push({ name: identifier === '_' ? null : identifier, type: typeText });
        });
      }
    }

    return params;
  }

  parseReturnType(resultNode, source) {
    if (!resultNode) {
      return '';
    }

    if (resultNode.type === 'parameter_list') {
      const returns = this.parseParameters(resultNode, source).map(param => param.type).filter(Boolean);
      return returns.join(', ');
    }

    return this.describeType(resultNode, source);
  }

  parseTypeParameters(node, source) {
    if (!node) {
      return [];
    }

    const params = [];
    for (let i = 0; i < node.namedChildCount; i += 1) {
      const child = node.namedChild(i);
      if (child.type === 'type_parameter_declaration') {
        const nameNode = child.childForFieldName('name');
        if (nameNode) {
          params.push(this.getNodeText(nameNode, source));
        }
      } else if (child.type === 'identifier') {
        params.push(this.getNodeText(child, source));
      }
    }
    return params;
  }

  describeType(node, source) {
    if (!node) {
      return '';
    }

    switch (node.type) {
      case 'type_identifier':
      case 'package_identifier':
      case 'identifier':
      case 'blank_identifier':
      case 'qualified_type':
        return this.getNodeText(node, source);
      case 'pointer_type':
        return `*${this.describeType(node.childForFieldName('type') || node.namedChild(0), source)}`;
      case 'slice_type':
        return `[]${this.describeType(node.childForFieldName('element') || node.namedChild(0), source)}`;
      case 'array_type': {
        const lengthNode = node.childForFieldName('length');
        const elementNode = node.childForFieldName('element');
        const lengthText = lengthNode ? this.getNodeText(lengthNode, source).trim() : '';
        return `[${lengthText}]${this.describeType(elementNode, source)}`;
      }
      case 'map_type': {
        const keyNode = node.childForFieldName('key');
        const valueNode = node.childForFieldName('value');
        return `map[${this.describeType(keyNode, source)}]${this.describeType(valueNode, source)}`;
      }
      case 'channel_type':
        return this.getNodeText(node, source).replace(/\s+/g, ' ');
      case 'variadic_parameter':
        return `...${this.describeType(node.childForFieldName('type') || node.namedChild(0), source)}`;
      default:
        return this.getNodeText(node, source);
    }
  }

  extractDeclarationLines(node, source) {
    const lines = [];
    const text = this.getNodeText(node, source).split(/\r?\n/);

    text.forEach(rawLine => {
      const line = rawLine.trim();
      if (!line || line === 'const' || line === 'var' || line === '(' || line === ')') {
        return;
      }

      const cleaned = line.replace(/^const\s+/, '').replace(/^var\s+/, '');
      const assignmentMatch = cleaned.match(/^([A-Za-z0-9_,\s]+)(?:\s+([A-Za-z0-9_\[\]\*\.]+))?(?:\s*=\s*(.+))?$/);

      if (!assignmentMatch) {
        return;
      }

      const namesPart = assignmentMatch[1] || '';
      const typePart = assignmentMatch[2] || null;
      const valuePart = assignmentMatch[3] || null;

      namesPart.split(',').map(name => name.trim()).filter(Boolean).forEach(identifier => {
        lines.push({ identifier, type: typePart, value: valuePart });
      });
    });

    return lines;
  }

  getNodeText(node, source) {
    if (!node) {
      return '';
    }
    return source.slice(node.startIndex, node.endIndex);
  }

  stripQuotes(value) {
    if (!value) {
      return value;
    }
    return value.replace(/^['\"]|['\"]$/g, '');
  }

  isExported(name) {
    return !!name && /^[A-Z]/.test(name);
  }

  containsGenerics(typeStr) {
    return Boolean(typeStr) && /\[[^\]]+\]/.test(typeStr) && !/^\[\]/.test(typeStr);
  }
}

module.exports = {
  GoDiscoveryCollector
};
