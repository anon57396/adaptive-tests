/**
 * Rust Discovery Collector
 *
 * Parses Rust source files using Lezer parser and extracts metadata about
 * structs, traits, functions, impls, and types. The resulting
 * metadata powers CLI integrations such as scaffold and discovery bridges.
 *
 * Cross-platform implementation using Lezer parser to avoid binary compatibility issues.
 */

const fs = require('fs');
const path = require('path');
const { parser } = require('@lezer/rust');
const { Tree } = require('@lezer/common');
const { ErrorHandler, ErrorCodes } = require('../error-handler');

class RustDiscoveryCollector {
  constructor(config = {}) {
    this.config = {
      extensions: ['.rs'],
      skipPatterns: [
        'target/',
        'node_modules/',
        '.git/',
        'build/',
        'dist/',
        'deps/',
        'incremental/'
      ],
      ...config
    };

    this.parser = parser;
    this.initialized = false;
    this.errorHandler = new ErrorHandler('rust-collector');
  }

  async initialize() {
    if (this.initialized) return;

    // Lezer parser is ready to use immediately - no async initialization needed
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
    await this.initialize();

    const result = await this.errorHandler.safeAsync(
      async () => {
        const source = await fs.promises.readFile(filePath, 'utf8');
        return this.extractMetadata(source, filePath);
      },
      { filePath, operation: 'parseFile' }
    );

    if (!result.success) {
      // Handle specific file errors
      if (result.error === 'ENOENT') {
        return this.errorHandler.handleFileError(
          { code: 'ENOENT', message: result.message },
          filePath,
          'read'
        );
      }
      return null;
    }

    return result.data;
  }

  extractMetadata(source, filePath) {
    const metadata = {
      path: filePath,
      crateName: null,
      uses: [],
      structs: [],
      enums: [],
      traits: [],
      impls: [],
      functions: [],
      constants: [],
      statics: [],
      types: [],
      macros: [],
      errors: []
    };

    const result = this.errorHandler.safeSync(
      () => {
        const tree = this.parser.parse(source);
        this.traverseTree(tree, source, metadata);
        return metadata;
      },
      { filePath, operation: 'extractMetadata' }
    );

    if (!result.success) {
      const parseError = this.errorHandler.handleParseError(
        new Error(result.message),
        filePath,
        'rust'
      );
      metadata.errors.push(parseError.message);
      this.errorHandler.logWarning(
        `Metadata extraction failed, returning partial metadata`,
        { filePath, error: result.error }
      );
    }

    return metadata;
  }

  traverseTree(tree, source, metadata) {
    // Extract crate name from file path
    const fileName = path.basename(metadata.path, '.rs');
    if (fileName === 'lib' || fileName === 'main') {
      const dirName = path.basename(path.dirname(metadata.path));
      metadata.crateName = dirName;
    } else {
      metadata.crateName = fileName;
    }

    this.traverseNode(tree.topNode, source, metadata);
  }

  traverseNode(node, source, metadata) {
    const nodeType = node.type.name;

    switch (nodeType) {
      case 'UseDeclaration':
        this.extractUse(node, source, metadata);
        break;
      case 'StructItem':
        this.extractStruct(node, source, metadata);
        break;
      case 'EnumItem':
        this.extractEnum(node, source, metadata);
        break;
      case 'TraitItem':
        this.extractTrait(node, source, metadata);
        break;
      case 'ImplItem':
        this.extractImpl(node, source, metadata);
        break;
      case 'FunctionItem':
        // Skip function items inside trait/impl - we handle them separately
        if (!this.isInsideTraitOrImpl(node)) {
          this.extractFunction(node, source, metadata);
        }
        break;
      case 'ConstItem':
        this.extractConstant(node, source, metadata);
        break;
      case 'StaticItem':
        this.extractStatic(node, source, metadata);
        break;
      case 'TypeItem':
        this.extractTypeAlias(node, source, metadata);
        break;
      case 'MacroDefinition':
        this.extractMacro(node, source, metadata);
        break;
    }

    // Recursively traverse child nodes
    for (let child = node.firstChild; child; child = child.nextSibling) {
      this.traverseNode(child, source, metadata);
    }
  }

  isInsideTraitOrImpl(node) {
    let parent = node.parent;
    while (parent) {
      if (parent.type.name === 'TraitItem' || parent.type.name === 'ImplItem') {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  }

  extractUse(node, source, metadata) {
    const text = this.getNodeText(node, source);
    const useMatch = text.match(/use\s+([^;]+);/);
    if (useMatch) {
      metadata.uses.push({
        path: useMatch[1].trim(),
        text: text.trim()
      });
    }
  }

  extractStruct(node, source, metadata) {
    const nameNode = this.findChildByType(node, 'TypeIdentifier');
    if (!nameNode) return;

    const structName = this.getNodeText(nameNode, source);
    const struct = {
      name: structName,
      type: 'struct',
      fields: [],
      generics: [],
      derives: [],
      visibility: this.extractVisibility(node, source),
      exported: this.isPublic(node)
    };

    // Extract generic parameters
    const genericParams = this.findChildByType(node, 'TypeParamList');
    if (genericParams) {
      struct.generics = this.extractGenerics(genericParams, source);
    }

    // Extract derive attributes
    const attributes = this.extractAttributes(node, source);
    struct.derives = attributes.filter(attr => attr.includes('derive')).map(attr => {
      const match = attr.match(/derive\s*\(\s*([^)]+)\s*\)/);
      return match ? match[1].split(',').map(s => s.trim()) : [];
    }).flat();

    // Extract fields
    const fieldList = this.findChildByType(node, 'FieldDeclarationList');
    if (fieldList) {
      for (let child = fieldList.firstChild; child; child = child.nextSibling) {
        if (child.type.name === 'FieldDeclaration') {
          const field = this.extractStructField(child, source);
          if (field) struct.fields.push(field);
        }
      }
    }

    metadata.structs.push(struct);
  }

  extractStructField(node, source) {
    const nameNode = this.findChildByType(node, 'FieldIdentifier');
    const typeNode = this.findChildByType(node, 'TypeIdentifier') ||
                     this.findChildByType(node, 'GenericType') ||
                     this.findChildByType(node, 'ReferenceType') ||
                     this.findChildByType(node, 'PrimitiveType');

    if (!nameNode || !typeNode) return null;

    return {
      name: this.getNodeText(nameNode, source),
      type: this.getNodeText(typeNode, source),
      visibility: this.extractVisibility(node, source),
      exported: this.isPublic(node)
    };
  }

  extractEnum(node, source, metadata) {
    const nameNode = this.findChildByType(node, 'TypeIdentifier');
    if (!nameNode) return;

    const enumName = this.getNodeText(nameNode, source);
    const enumItem = {
      name: enumName,
      type: 'enum',
      variants: [],
      generics: [],
      derives: [],
      visibility: this.extractVisibility(node, source),
      exported: this.isPublic(node)
    };

    // Extract generic parameters
    const genericParams = this.findChildByType(node, 'TypeParamList');
    if (genericParams) {
      enumItem.generics = this.extractGenerics(genericParams, source);
    }

    // Extract derive attributes
    const attributes = this.extractAttributes(node, source);
    enumItem.derives = attributes.filter(attr => attr.includes('derive')).map(attr => {
      const match = attr.match(/derive\s*\(\s*([^)]+)\s*\)/);
      return match ? match[1].split(',').map(s => s.trim()) : [];
    }).flat();

    // Extract variants
    const variantList = this.findChildByType(node, 'EnumVariantList');
    if (variantList) {
      for (let child = variantList.firstChild; child; child = child.nextSibling) {
        if (child.type.name === 'EnumVariant') {
          const variant = this.extractEnumVariant(child, source);
          if (variant) enumItem.variants.push(variant);
        }
      }
    }

    metadata.enums.push(enumItem);
  }

  extractEnumVariant(node, source) {
    const nameNode = this.findChildByType(node, 'identifier');
    if (!nameNode) return null;

    const variant = {
      name: this.getNodeText(nameNode, source),
      fields: []
    };

    // Check for tuple fields
    const tupleFields = this.findChildByType(node, 'field_declaration_list');
    if (tupleFields) {
      for (let child = tupleFields.firstChild; child; child = child.nextSibling) {
        if (child.type.name === 'field_declaration') {
          const field = this.extractStructField(child, source);
          if (field) variant.fields.push(field);
        }
      }
    }

    return variant;
  }

  extractTrait(node, source, metadata) {
    const nameNode = this.findChildByType(node, 'TypeIdentifier');
    if (!nameNode) return;

    const traitName = this.getNodeText(nameNode, source);
    const trait = {
      name: traitName,
      type: 'trait',
      methods: [],
      generics: [],
      supertraits: [],
      visibility: this.extractVisibility(node, source),
      exported: this.isPublic(node)
    };

    // Extract generic parameters
    const genericParams = this.findChildByType(node, 'TypeParamList');
    if (genericParams) {
      trait.generics = this.extractGenerics(genericParams, source);
    }

    // Extract trait bounds (supertraits)
    const bounds = this.findChildByType(node, 'TraitBounds');
    if (bounds) {
      trait.supertraits = this.extractTraitBounds(bounds, source);
    }

    // Extract methods
    const body = this.findChildByType(node, 'DeclarationList');
    if (body) {
      for (let child = body.firstChild; child; child = child.nextSibling) {
        if (child.type.name === 'FunctionSignatureItem' || child.type.name === 'FunctionItem') {
          const method = this.extractTraitMethod(child, source);
          if (method) trait.methods.push(method);
        }
      }
    }

    metadata.traits.push(trait);
  }

  extractTraitMethod(node, source) {
    const nameNode = this.findChildByType(node, 'BoundIdentifier');
    if (!nameNode) return null;

    const method = {
      name: this.getNodeText(nameNode, source),
      parameters: [],
      returnType: 'void',
      isDefault: false
    };

    // Extract parameters
    const params = this.findChildByType(node, 'ParamList');
    if (params) {
      method.parameters = this.extractParameters(params, source);
    }

    // Extract return type - look for -> followed by type
    const returnType = this.findChildByType(node, 'TypeIdentifier') ||
                      this.findChildByType(node, 'GenericType') ||
                      this.findChildByType(node, 'PrimitiveType');
    if (returnType) {
      method.returnType = this.getNodeText(returnType, source);
    }

    return method;
  }

  extractImpl(node, source, metadata) {
    const typeNode = this.findChildByType(node, 'type_identifier');
    if (!typeNode) return;

    const impl = {
      type: this.getNodeText(typeNode, source),
      trait: null,
      methods: [],
      generics: []
    };

    // Check if this is a trait implementation
    const traitNode = this.findChildByType(node, 'trait_bounds');
    if (traitNode) {
      impl.trait = this.getNodeText(traitNode, source);
    }

    // Extract generic parameters
    const genericParams = this.findChildByType(node, 'type_parameters');
    if (genericParams) {
      impl.generics = this.extractGenerics(genericParams, source);
    }

    // Extract methods
    const body = this.findChildByType(node, 'declaration_list');
    if (body) {
      for (let child = body.firstChild; child; child = child.nextSibling) {
        if (child.type.name === 'function_item') {
          const method = this.extractImplMethod(child, source);
          if (method) impl.methods.push(method);
        }
      }
    }

    metadata.impls.push(impl);
  }

  extractImplMethod(node, source) {
    const nameNode = this.findChildByType(node, 'identifier');
    if (!nameNode) return null;

    const method = {
      name: this.getNodeText(nameNode, source),
      parameters: [],
      returnType: 'void',
      visibility: this.extractVisibility(node, source),
      exported: this.isPublic(node)
    };

    // Extract parameters
    const params = this.findChildByType(node, 'parameters');
    if (params) {
      method.parameters = this.extractParameters(params, source);
    }

    // Extract return type
    const returnType = this.findChildByType(node, 'type_identifier') ||
                      this.findChildByType(node, 'generic_type') ||
                      this.findChildByType(node, 'primitive_type');
    if (returnType) {
      method.returnType = this.getNodeText(returnType, source);
    }

    return method;
  }

  extractFunction(node, source, metadata) {
    const nameNode = this.findChildByType(node, 'identifier');
    if (!nameNode) return;

    const func = {
      name: this.getNodeText(nameNode, source),
      parameters: [],
      returnType: 'void',
      generics: [],
      visibility: this.extractVisibility(node, source),
      exported: this.isPublic(node)
    };

    // Extract generic parameters
    const genericParams = this.findChildByType(node, 'type_parameters');
    if (genericParams) {
      func.generics = this.extractGenerics(genericParams, source);
    }

    // Extract parameters
    const params = this.findChildByType(node, 'parameters');
    if (params) {
      func.parameters = this.extractParameters(params, source);
    }

    // Extract return type
    const returnType = this.findChildByType(node, 'type_identifier') ||
                      this.findChildByType(node, 'generic_type') ||
                      this.findChildByType(node, 'primitive_type');
    if (returnType) {
      func.returnType = this.getNodeText(returnType, source);
    }

    metadata.functions.push(func);
  }

  extractConstant(node, source, metadata) {
    const nameNode = this.findChildByType(node, 'identifier');
    const typeNode = this.findChildByType(node, 'type_identifier') ||
                     this.findChildByType(node, 'primitive_type');

    if (!nameNode) return;

    const constant = {
      name: this.getNodeText(nameNode, source),
      type: typeNode ? this.getNodeText(typeNode, source) : 'unknown',
      visibility: this.extractVisibility(node, source),
      exported: this.isPublic(node)
    };

    metadata.constants.push(constant);
  }

  extractStatic(node, source, metadata) {
    const nameNode = this.findChildByType(node, 'identifier');
    const typeNode = this.findChildByType(node, 'type_identifier') ||
                     this.findChildByType(node, 'primitive_type');

    if (!nameNode) return;

    const staticItem = {
      name: this.getNodeText(nameNode, source),
      type: typeNode ? this.getNodeText(typeNode, source) : 'unknown',
      mutable: this.getNodeText(node, source).includes('mut'),
      visibility: this.extractVisibility(node, source),
      exported: this.isPublic(node)
    };

    metadata.statics.push(staticItem);
  }

  extractTypeAlias(node, source, metadata) {
    const nameNode = this.findChildByType(node, 'type_identifier');
    if (!nameNode) return;

    const typeAlias = {
      name: this.getNodeText(nameNode, source),
      type: 'alias',
      target: 'unknown',
      generics: [],
      visibility: this.extractVisibility(node, source),
      exported: this.isPublic(node)
    };

    // Extract target type (right side of =)
    const targetType = this.findChildByType(node, 'type_identifier') ||
                      this.findChildByType(node, 'generic_type') ||
                      this.findChildByType(node, 'primitive_type');
    if (targetType) {
      typeAlias.target = this.getNodeText(targetType, source);
    }

    // Extract generic parameters
    const genericParams = this.findChildByType(node, 'type_parameters');
    if (genericParams) {
      typeAlias.generics = this.extractGenerics(genericParams, source);
    }

    metadata.types.push(typeAlias);
  }

  extractMacro(node, source, metadata) {
    const nameNode = this.findChildByType(node, 'identifier');
    if (!nameNode) return;

    const macro = {
      name: this.getNodeText(nameNode, source),
      type: 'macro',
      visibility: this.extractVisibility(node, source),
      exported: this.isPublic(node)
    };

    metadata.macros.push(macro);
  }

  // Helper methods
  findChildByType(node, typeName) {
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.type.name === typeName) {
        return child;
      }
    }
    return null;
  }

  getNodeText(node, source) {
    return source.slice(node.from, node.to);
  }

  extractVisibility(node, source) {
    const visNode = this.findChildByType(node, 'Vis');
    if (!visNode) return 'private';

    const text = this.getNodeText(visNode, source);
    if (text.includes('pub(crate)')) return 'crate';
    if (text.includes('pub(super)')) return 'super';
    if (text.includes('pub')) return 'public';
    return 'private';
  }

  isPublic(node) {
    const visNode = this.findChildByType(node, 'Vis');
    return visNode !== null;
  }

  extractAttributes(node, source) {
    const attributes = [];

    // Look for AttributeItem in parent or previous siblings
    let current = node.parent;
    if (current && current.type.name === 'AttributeItem') {
      const attrNode = this.findChildByType(current, 'Attribute');
      if (attrNode) {
        const metaItem = this.findChildByType(attrNode, 'MetaItem');
        if (metaItem) {
          const attrText = this.getNodeText(metaItem, source);
          attributes.push(attrText);
        }
      }
    }

    return attributes;
  }

  extractGenerics(node, source) {
    const generics = [];
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.type.name === 'type_identifier') {
        generics.push({
          name: this.getNodeText(child, source),
          bounds: []
        });
      }
    }
    return generics;
  }

  extractTraitBounds(node, source) {
    const bounds = [];
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.type.name === 'type_identifier') {
        bounds.push(this.getNodeText(child, source));
      }
    }
    return bounds;
  }

  extractParameters(node, source) {
    const parameters = [];
    for (let child = node.firstChild; child; child = child.nextSibling) {
      if (child.type.name === 'parameter') {
        const param = this.extractParameter(child, source);
        if (param) parameters.push(param);
      }
    }
    return parameters;
  }

  extractParameter(node, source) {
    const nameNode = this.findChildByType(node, 'identifier');
    const typeNode = this.findChildByType(node, 'type_identifier') ||
                     this.findChildByType(node, 'reference_type') ||
                     this.findChildByType(node, 'primitive_type');

    if (!nameNode) return null;

    return {
      name: this.getNodeText(nameNode, source),
      type: typeNode ? this.getNodeText(typeNode, source) : 'unknown'
    };
  }

  isExported(name) {
    // In Rust, items are exported based on visibility, not naming convention
    // This will be determined by the visibility analysis
    return true;
  }

  containsGenerics(typeStr) {
    return typeStr && typeStr.includes('<') && typeStr.includes('>');
  }
}

module.exports = {
  RustDiscoveryCollector
};