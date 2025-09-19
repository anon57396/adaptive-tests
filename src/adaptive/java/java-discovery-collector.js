/**
 * Java Discovery Collector
 *
 * Parses Java source files using java-parser and extracts metadata about
 * classes, interfaces, enums, records, and annotation types. The resulting
 * metadata powers CLI integrations such as scaffold and discovery bridges.
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('java-parser');

class JavaDiscoveryCollector {
  constructor(config = {}) {
    this.config = {
      extensions: ['.java'],
      skipPatterns: [
        'target/',
        'build/',
        'out/',
        'node_modules/',
        '/test/',
        '/tests/',
        '/generated/'
      ],
      ...config
    };
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
    try {
      const source = await fs.promises.readFile(filePath, 'utf8');
      return this.extractMetadata(source, filePath);
    } catch (error) {
      if (process.env.DEBUG_DISCOVERY) {
        console.error(`[adaptive-tests] Failed to parse Java file ${filePath}:`, error);
      }
      return null;
    }
  }

  extractMetadata(source, filePath) {
    try {
      const cst = parse(source);
      const metadata = {
        path: filePath,
        packageName: null,
        imports: [],
        classes: [],
        interfaces: [],
        enums: [],
        records: [],
        annotations: [],
        errors: []
      };

      const root = cst.children.ordinaryCompilationUnit?.[0]?.children ?? {};
      metadata.packageName = this.extractPackageName(root);
      metadata.imports = this.extractImports(root);

      const context = {
        source,
        packageName: metadata.packageName,
        enclosing: []
      };

      const typeDeclarations = root.typeDeclaration || [];
      typeDeclarations.forEach(typeDecl => {
        this.processTypeDeclaration(typeDecl.children, context, metadata);
      });

      return metadata;
    } catch (error) {
      return {
        path: filePath,
        packageName: null,
        imports: [],
        classes: [],
        interfaces: [],
        enums: [],
        records: [],
        annotations: [],
        errors: [error.message]
      };
    }
  }

  extractPackageName(root) {
    if (!root.packageDeclaration) {
      return null;
    }
    const declaration = root.packageDeclaration[0].children;
    if (declaration.packageName && declaration.packageName[0]) {
      return this.readQualifiedName(declaration.packageName[0].children);
    }
    if (declaration.Identifier) {
      return declaration.Identifier.map(token => token.image).join('.');
    }
    return null;
  }

  extractImports(root) {
    const imports = [];
    (root.importDeclaration || []).forEach(importDecl => {
      const children = importDecl.children;
      const qualified = this.readQualifiedName(children.packageOrTypeName?.[0]?.children);
      if (!qualified) {
        return;
      }
      const isStatic = Boolean(children.Static);
      const isWildcard = Boolean(children.Star);
      imports.push({
        name: qualified,
        isStatic,
        isWildcard
      });
    });
    return imports;
  }

  processTypeDeclaration(children, context, metadata) {
    if (!children) {
      return;
    }
    if (children.classDeclaration) {
      const classChildren = children.classDeclaration[0].children;
      const modifiers = classChildren.classModifier || [];
      if (classChildren.normalClassDeclaration) {
        this.processNormalClassDeclaration(classChildren.normalClassDeclaration[0].children, modifiers, context, metadata);
      } else if (classChildren.enumDeclaration) {
        this.processEnumDeclaration(classChildren.enumDeclaration[0].children, modifiers, context, metadata);
      } else if (classChildren.recordDeclaration) {
        this.processRecordDeclaration(classChildren.recordDeclaration[0].children, modifiers, context, metadata);
      }
    } else if (children.interfaceDeclaration) {
      const interfaceChildren = children.interfaceDeclaration[0].children;
      const modifiers = interfaceChildren.interfaceModifier || [];
      if (interfaceChildren.normalInterfaceDeclaration) {
        this.processNormalInterfaceDeclaration(interfaceChildren.normalInterfaceDeclaration[0].children, modifiers, context, metadata);
      } else if (interfaceChildren.annotationInterfaceDeclaration) {
        this.processAnnotationInterfaceDeclaration(interfaceChildren.annotationInterfaceDeclaration[0].children, modifiers, context, metadata);
      }
    }
  }

  processNormalClassDeclaration(normalClass, modifierNodes, context, metadata) {
    const nameToken = normalClass.typeIdentifier?.[0]?.children?.Identifier?.[0];
    if (!nameToken) {
      return;
    }
    const name = nameToken.image;
    const fullName = this.buildFullName(context.enclosing, name);
    const modifiers = this.extractModifierInfo(modifierNodes, context.source);
    const extendsType = normalClass.classExtends
      ? this.sliceFromLocation(normalClass.classExtends[0].children.classType[0].location, context.source)
      : null;
    const implementsInterfaces = normalClass.classImplements
      ? this.extractInterfaceList(normalClass.classImplements[0].children.interfaceTypeList?.[0], context.source)
      : [];

    const classInfo = {
      type: 'class',
      name,
      fullName,
      packageName: context.packageName,
      annotations: modifiers.annotations,
      modifiers: modifiers.flags,
      extends: extendsType,
      implements: implementsInterfaces,
      methods: []
    };

    metadata.classes.push(classInfo);

    const body = normalClass.classBody?.[0];
    if (body) {
      this.processClassBody(body.children, this.extendContext(context, name), metadata, classInfo);
    }
  }

  processNormalInterfaceDeclaration(normalInterface, modifierNodes, context, metadata) {
    const nameToken = normalInterface.typeIdentifier?.[0]?.children?.Identifier?.[0];
    if (!nameToken) {
      return;
    }
    const name = nameToken.image;
    const fullName = this.buildFullName(context.enclosing, name);
    const modifiers = this.extractModifierInfo(modifierNodes, context.source);
    const extendsInterfaces = normalInterface.interfaceExtends
      ? this.extractInterfaceList(normalInterface.interfaceExtends[0].children.interfaceTypeList?.[0], context.source)
      : [];

    const interfaceInfo = {
      type: 'interface',
      name,
      fullName,
      packageName: context.packageName,
      annotations: modifiers.annotations,
      modifiers: modifiers.flags,
      extends: extendsInterfaces,
      methods: []
    };

    metadata.interfaces.push(interfaceInfo);

    const body = normalInterface.interfaceBody?.[0];
    if (body) {
      this.processInterfaceBody(body.children, this.extendContext(context, name), metadata, interfaceInfo);
    }
  }

  processEnumDeclaration(enumDeclaration, modifierNodes, context, metadata) {
    const nameToken = enumDeclaration.typeIdentifier?.[0]?.children?.Identifier?.[0];
    if (!nameToken) {
      return;
    }
    const name = nameToken.image;
    const fullName = this.buildFullName(context.enclosing, name);
    const modifiers = this.extractModifierInfo(modifierNodes, context.source);
    const implementsInterfaces = enumDeclaration.classImplements
      ? this.extractInterfaceList(enumDeclaration.classImplements[0].children.interfaceTypeList?.[0], context.source)
      : [];

    const enumInfo = {
      type: 'enum',
      name,
      fullName,
      packageName: context.packageName,
      annotations: modifiers.annotations,
      modifiers: modifiers.flags,
      implements: implementsInterfaces,
      constants: this.extractEnumConstants(enumDeclaration.enumBody?.[0], context.source),
      methods: []
    };

    metadata.enums.push(enumInfo);

    const bodyDeclarations = enumDeclaration.enumBody?.[0]?.children?.enumBodyDeclarations?.[0]?.children?.classBodyDeclaration || [];
    bodyDeclarations.forEach(decl => {
      this.handleClassBodyDeclaration(decl.children, this.extendContext(context, name), metadata, enumInfo, true);
    });
  }

  processRecordDeclaration(recordDeclaration, modifierNodes, context, metadata) {
    const nameToken = recordDeclaration.typeIdentifier?.[0]?.children?.Identifier?.[0];
    if (!nameToken) {
      return;
    }
    const name = nameToken.image;
    const fullName = this.buildFullName(context.enclosing, name);
    const modifiers = this.extractModifierInfo(modifierNodes, context.source);
    const implementsInterfaces = recordDeclaration.classImplements
      ? this.extractInterfaceList(recordDeclaration.classImplements[0].children.interfaceTypeList?.[0], context.source)
      : [];
    const components = this.extractRecordComponents(recordDeclaration.recordHeader?.[0], context.source);

    const recordInfo = {
      type: 'record',
      name,
      fullName,
      packageName: context.packageName,
      annotations: modifiers.annotations,
      modifiers: modifiers.flags,
      implements: implementsInterfaces,
      components,
      methods: []
    };

    metadata.records.push(recordInfo);

    const bodyDeclarations = recordDeclaration.recordBody?.[0]?.children?.recordBodyDeclaration || [];
    bodyDeclarations.forEach(decl => {
      if (decl.children.classBodyDeclaration) {
        this.handleClassBodyDeclaration(decl.children.classBodyDeclaration[0].children, this.extendContext(context, name), metadata, recordInfo, false);
      } else if (decl.children.compactConstructorDeclaration) {
        recordInfo.methods.push(this.createCompactConstructor(name, components));
      }
    });
  }

  processAnnotationInterfaceDeclaration(annotationDeclaration, modifierNodes, context, metadata) {
    const nameToken = annotationDeclaration.typeIdentifier?.[0]?.children?.Identifier?.[0];
    if (!nameToken) {
      return;
    }
    const name = nameToken.image;
    const fullName = this.buildFullName(context.enclosing, name);
    const modifiers = this.extractModifierInfo(modifierNodes, context.source);

    const annotationInfo = {
      type: 'annotation',
      name,
      fullName,
      packageName: context.packageName,
      annotations: modifiers.annotations,
      modifiers: modifiers.flags,
      elements: []
    };

    const body = annotationDeclaration.annotationInterfaceBody?.[0]?.children?.annotationInterfaceMemberDeclaration || [];
    body.forEach(member => {
      if (member.children.annotationInterfaceElementDeclaration) {
        const element = member.children.annotationInterfaceElementDeclaration[0].children;
        const elementName = element.Identifier?.[0]?.image;
        if (!elementName) {
          return;
        }
        const typeLoc = element.unannType?.[0]?.location;
        const type = typeLoc ? this.sliceFromLocation(typeLoc, context.source) : 'Object';
        annotationInfo.elements.push({
          name: elementName,
          returnType: type.trim()
        });
      } else if (member.children.classDeclaration) {
        this.processTypeDeclaration({ classDeclaration: [member.children.classDeclaration[0]] }, this.extendContext(context, name), metadata);
      }
    });

    metadata.annotations.push(annotationInfo);
  }

  processClassBody(bodyChildren, context, metadata, target) {
    const declarations = bodyChildren.classBodyDeclaration || [];
    declarations.forEach(declaration => {
      this.handleClassBodyDeclaration(declaration.children, context, metadata, target, false);
    });
  }

  processInterfaceBody(bodyChildren, context, metadata, target) {
    const declarations = bodyChildren.interfaceMemberDeclaration || [];
    declarations.forEach(declaration => {
      if (declaration.children.interfaceMethodDeclaration) {
        const method = this.parseMethodDeclaration(declaration.children.interfaceMethodDeclaration[0], context, {
          assumePublic: true
        });
        if (method) {
          target.methods.push(method);
        }
      } else if (declaration.children.classDeclaration) {
        this.processTypeDeclaration({ classDeclaration: [declaration.children.classDeclaration[0]] }, context, metadata);
      } else if (declaration.children.interfaceDeclaration) {
        this.processTypeDeclaration({ interfaceDeclaration: [declaration.children.interfaceDeclaration[0]] }, context, metadata);
      }
    });
  }

  handleClassBodyDeclaration(children, context, metadata, target, treatAsEnum) {
    if (!children) {
      return;
    }
    if (children.classMemberDeclaration) {
      const member = children.classMemberDeclaration[0].children;
      if (member.methodDeclaration) {
        const method = this.parseMethodDeclaration(member.methodDeclaration[0], context, {
          assumePublic: treatAsEnum
        });
        if (method) {
          target.methods.push(method);
        }
      } else if (member.classDeclaration) {
        this.processTypeDeclaration({ classDeclaration: [member.classDeclaration[0]] }, context, metadata);
      } else if (member.interfaceDeclaration) {
        this.processTypeDeclaration({ interfaceDeclaration: [member.interfaceDeclaration[0]] }, context, metadata);
      }
    } else if (children.constructorDeclaration) {
      const constructor = this.parseConstructorDeclaration(children.constructorDeclaration[0], context, target.name);
      if (constructor) {
        target.methods.push(constructor);
      }
    }
  }

  parseMethodDeclaration(methodDeclaration, context, options = {}) {
    const methodChildren = methodDeclaration.children;
    const modifiers = this.extractModifierInfo(
      methodChildren.methodModifier || methodChildren.interfaceMethodModifier,
      context.source
    );
    const header = methodChildren.methodHeader?.[0]?.children;
    if (!header) {
      return null;
    }

    const declarator = header.methodDeclarator?.[0];
    if (!declarator) {
      return null;
    }
    const nameToken = declarator.children.Identifier?.[0];
    if (!nameToken) {
      return null;
    }

    const returnTypeLoc = header.result?.[0]?.location;
    const returnType = returnTypeLoc ? this.sliceFromLocation(returnTypeLoc, context.source).trim() : 'void';
    const parameterList = declarator.children.formalParameterList?.[0];
    const parameters = this.extractParameters(parameterList, context.source);

    const methodInfo = {
      name: nameToken.image,
      returnType,
      parameters,
      annotations: modifiers.annotations,
      modifiers: modifiers.flags,
      isConstructor: false,
      isStatic: modifiers.flags.static,
      isPublic: modifiers.flags.public || options.assumePublic,
      isAbstract: modifiers.flags.abstract || !methodChildren.methodBody,
      isDefault: modifiers.flags.default || false
    };

    return methodInfo;
  }

  parseConstructorDeclaration(constructorDeclaration, context, ownerName) {
    const constructorChildren = constructorDeclaration.children;
    const modifiers = this.extractModifierInfo(constructorChildren.constructorModifier, context.source);
    const declarator = constructorChildren.constructorDeclarator?.[0];
    if (!declarator) {
      return null;
    }
    const nameToken = declarator.children.simpleTypeName?.[0]?.children?.typeIdentifier?.[0]?.children?.Identifier?.[0];
    const name = nameToken ? nameToken.image : ownerName;
    const parameterList = declarator.children.formalParameterList?.[0];
    const parameters = this.extractParameters(parameterList, context.source);

    return {
      name,
      returnType: null,
      parameters,
      annotations: modifiers.annotations,
      modifiers: modifiers.flags,
      isConstructor: true,
      isStatic: false,
      isPublic: modifiers.flags.public,
      isAbstract: false,
      isDefault: false
    };
  }

  createCompactConstructor(name, components) {
    return {
      name,
      returnType: null,
      parameters: components.map(component => ({ ...component })),
      annotations: [],
      modifiers: { public: true },
      isConstructor: true,
      isStatic: false,
      isPublic: true,
      isAbstract: false,
      isDefault: false
    };
  }

  extractParameters(parameterList, source) {
    if (!parameterList) {
      return [];
    }
    const params = [];
    const children = parameterList.children;
    const entries = [];
    if (children.formalParameter) {
      entries.push(...children.formalParameter);
    }
    if (children.lastFormalParameter) {
      entries.push(...children.lastFormalParameter);
    }
    entries.forEach(entry => {
      const variableArity = entry.children.variableArityParameter?.[0]?.children;
      if (variableArity) {
        const typeLoc = variableArity.unannType?.[0]?.location;
        const type = typeLoc ? this.sliceFromLocation(typeLoc, source).trim() : '';
        const nameToken = variableArity.Identifier?.[0];
        params.push({
          name: nameToken ? nameToken.image : '',
          type,
          varArgs: true
        });
        return;
      }
      const regular = entry.children.variableParaRegularParameter?.[0]?.children || entry.children;
      const typeLoc = regular.unannType?.[0]?.location;
      const declaratorLoc = regular.variableDeclaratorId?.[0]?.location;
      const type = typeLoc ? this.sliceFromLocation(typeLoc, source).trim() : '';
      const name = declaratorLoc ? this.sliceFromLocation(declaratorLoc, source).replace(/\s+/g, '').trim() : '';
      params.push({
        name,
        type,
        varArgs: false
      });
    });
    return params;
  }

  extractEnumConstants(enumBody, source) {
    if (!enumBody) {
      return [];
    }
    const constantsNode = enumBody.children.enumConstantList?.[0];
    if (!constantsNode) {
      return [];
    }
    return (constantsNode.children.enumConstant || []).map(constant => {
      const nameToken = constant.children.enumConstantIdentifier?.[0]?.children?.Identifier?.[0];
      return nameToken ? nameToken.image : null;
    }).filter(Boolean);
  }

  extractRecordComponents(recordHeader, source) {
    if (!recordHeader) {
      return [];
    }
    const parameterList = recordHeader.children.formalParameterList?.[0];
    return this.extractParameters(parameterList, source);
  }

  extractInterfaceList(interfaceListNode, source) {
    if (!interfaceListNode) {
      return [];
    }
    return (interfaceListNode.children.interfaceType || []).map(typeNode => {
      const classType = typeNode.children.classType?.[0];
      if (!classType || !classType.location) {
        return null;
      }
      return this.sliceFromLocation(classType.location, source).trim();
    }).filter(Boolean);
  }

  extractModifierInfo(modifierNodes = [], source) {
    const annotations = [];
    const flags = {
      public: false,
      protected: false,
      private: false,
      static: false,
      abstract: false,
      final: false,
      default: false,
      sealed: false,
      nonSealed: false
    };

    modifierNodes.forEach(modifier => {
      const keys = Object.keys(modifier.children || {});
      if (modifier.children?.annotation) {
        const annotationNode = modifier.children.annotation[0];
        const raw = this.sliceFromLocation(annotationNode.location, source).trim();
        const qualified = raw.replace(/^@/, '');
        const simple = qualified.split('.').pop();
        annotations.push({
          name: simple,
          qualifiedName: qualified
        });
        return;
      }
      if (keys.includes('Public')) flags.public = true;
      if (keys.includes('Protected')) flags.protected = true;
      if (keys.includes('Private')) flags.private = true;
      if (keys.includes('Static')) flags.static = true;
      if (keys.includes('Abstract')) flags.abstract = true;
      if (keys.includes('Final')) flags.final = true;
      if (keys.includes('Default')) flags.default = true;
      if (keys.includes('Sealed')) flags.sealed = true;
      if (keys.includes('NonSealed')) flags.nonSealed = true;
    });

    return { annotations, flags };
  }

  readQualifiedName(children = {}) {
    const identifiers = children.Identifier || [];
    if (!identifiers.length) {
      return null;
    }
    return identifiers.map(token => token.image).join('.');
  }

  sliceFromLocation(location, source) {
    if (!location) {
      return '';
    }
    return source.slice(location.startOffset, location.endOffset + 1);
  }

  extendContext(context, name) {
    return {
      source: context.source,
      packageName: context.packageName,
      enclosing: [...context.enclosing, name]
    };
  }

  buildFullName(enclosing, name) {
    if (!enclosing || enclosing.length === 0) {
      return name;
    }
    return `${enclosing.join('.')}.${name}`;
  }
}

module.exports = {
  JavaDiscoveryCollector
};
