<?php
/**
 * PHP AST Bridge - Uses PHP's native token_get_all and reflection for AST parsing
 * Every PHP developer has PHP installed, so this should always work
 *
 * For enhanced AST parsing, install nikic/php-parser:
 * composer require nikic/php-parser
 */

// Check if PHP-Parser is available for enhanced AST parsing
$usePhpParser = false;
if (file_exists(__DIR__ . '/../../../vendor/autoload.php')) {
    require_once __DIR__ . '/../../../vendor/autoload.php';
    $usePhpParser = class_exists('PhpParser\\ParserFactory');
} elseif (file_exists('/usr/local/lib/php-parser/autoload.php')) {
    require_once '/usr/local/lib/php-parser/autoload.php';
    $usePhpParser = class_exists('PhpParser\\ParserFactory');
}

class PhpAstBridge {
    private $filePath;
    private $content;
    private $metadata;
    private $usePhpParser;

    public function __construct($filePath) {
        $this->filePath = $filePath;
        $this->content = file_get_contents($filePath);
        $this->usePhpParser = $GLOBALS['usePhpParser'] ?? false;

        $this->metadata = [
            'namespace' => null,
            'uses' => [],
            'classes' => [],
            'interfaces' => [],
            'traits' => [],
            'functions' => [],
            'constants' => [],
            'version' => PHP_VERSION,
            'parser' => $this->usePhpParser ? 'nikic/php-parser' : 'token_get_all'
        ];
    }

    public function parse() {
        try {
            if ($this->usePhpParser) {
                $this->parseWithPhpParser();
            } else {
                $this->parseWithTokens();
            }

            $this->metadata['success'] = true;
        } catch (Exception $e) {
            $this->metadata['error'] = $e->getMessage();
            $this->metadata['success'] = false;
            // Fallback to basic extraction
            $this->basicExtraction();
        }

        return json_encode($this->metadata, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    }

    private function parseWithPhpParser() {
        $parserFactory = new \PhpParser\ParserFactory();
        $parser = $parserFactory->create(\PhpParser\ParserFactory::PREFER_PHP7);

        try {
            $ast = $parser->parse($this->content);

            $traverser = new \PhpParser\NodeTraverser();
            $visitor = new PhpParserVisitor($this->metadata);
            $traverser->addVisitor($visitor);
            $traverser->traverse($ast);

            $this->metadata = $visitor->getMetadata();
        } catch (\PhpParser\Error $e) {
            throw new Exception('Parse Error: ' . $e->getMessage());
        }
    }

    private function parseWithTokens() {
        $tokens = token_get_all($this->content);

        $namespace = null;
        $currentClass = null;
        $currentInterface = null;
        $currentTrait = null;
        $currentFunction = null;
        $visibility = 'public';
        $isStatic = false;
        $isAbstract = false;
        $isFinal = false;
        $docComment = null;
        $braceLevel = 0;
        $inClass = false;
        $inInterface = false;
        $inTrait = false;
        $inFunction = false;

        for ($i = 0; $i < count($tokens); $i++) {
            if (is_array($tokens[$i])) {
                list($tokenType, $tokenValue, $line) = $tokens[$i];

                switch ($tokenType) {
                    case T_NAMESPACE:
                        $namespace = $this->getNextIdentifier($tokens, $i);
                        $this->metadata['namespace'] = $namespace;
                        break;

                    case T_USE:
                        if (!$inClass && !$inInterface && !$inTrait) {
                            $use = $this->getUseStatement($tokens, $i);
                            if ($use) {
                                $this->metadata['uses'][] = $use;
                            }
                        } else if ($inClass || $inTrait) {
                            // Trait use inside class
                            $trait = $this->getNextIdentifier($tokens, $i);
                            if ($currentClass && $trait) {
                                $currentClass['traits'][] = $trait;
                            }
                        }
                        break;

                    case T_CLASS:
                        if (!$this->isAnonymousClass($tokens, $i)) {
                            $className = $this->getNextIdentifier($tokens, $i);
                            $extends = $this->getExtends($tokens, $i);
                            $implements = $this->getImplements($tokens, $i);

                            $currentClass = [
                                'name' => $className,
                                'namespace' => $namespace,
                                'extends' => $extends,
                                'implements' => $implements,
                                'traits' => [],
                                'properties' => [],
                                'methods' => [],
                                'constants' => [],
                                'isAbstract' => $isAbstract,
                                'isFinal' => $isFinal,
                                'line' => $line,
                                'docComment' => $docComment
                            ];

                            $inClass = true;
                            $isAbstract = false;
                            $isFinal = false;
                            $docComment = null;
                        }
                        break;

                    case T_INTERFACE:
                        $interfaceName = $this->getNextIdentifier($tokens, $i);
                        $extends = $this->getInterfaceExtends($tokens, $i);

                        $currentInterface = [
                            'name' => $interfaceName,
                            'namespace' => $namespace,
                            'extends' => $extends,
                            'methods' => [],
                            'constants' => [],
                            'line' => $line,
                            'docComment' => $docComment
                        ];

                        $inInterface = true;
                        $docComment = null;
                        break;

                    case T_TRAIT:
                        $traitName = $this->getNextIdentifier($tokens, $i);

                        $currentTrait = [
                            'name' => $traitName,
                            'namespace' => $namespace,
                            'properties' => [],
                            'methods' => [],
                            'line' => $line,
                            'docComment' => $docComment
                        ];

                        $inTrait = true;
                        $docComment = null;
                        break;

                    case T_FUNCTION:
                        $functionName = $this->getNextIdentifier($tokens, $i);
                        $parameters = $this->getParameters($tokens, $i);
                        $returnType = $this->getReturnType($tokens, $i);

                        $functionInfo = [
                            'name' => $functionName,
                            'parameters' => $parameters,
                            'returnType' => $returnType,
                            'visibility' => $visibility,
                            'isStatic' => $isStatic,
                            'isAbstract' => $isAbstract,
                            'isFinal' => $isFinal,
                            'line' => $line,
                            'docComment' => $docComment
                        ];

                        if ($inClass && $currentClass) {
                            $currentClass['methods'][] = $functionInfo;
                        } elseif ($inInterface && $currentInterface) {
                            $currentInterface['methods'][] = $functionInfo;
                        } elseif ($inTrait && $currentTrait) {
                            $currentTrait['methods'][] = $functionInfo;
                        } else {
                            $this->metadata['functions'][] = $functionInfo;
                        }

                        // Reset modifiers
                        $visibility = 'public';
                        $isStatic = false;
                        $isAbstract = false;
                        $isFinal = false;
                        $docComment = null;
                        $inFunction = true;
                        break;

                    case T_CONST:
                        $constName = $this->getNextIdentifier($tokens, $i);
                        $constValue = $this->getConstValue($tokens, $i);

                        $constInfo = [
                            'name' => $constName,
                            'value' => $constValue,
                            'line' => $line
                        ];

                        if ($inClass && $currentClass) {
                            $currentClass['constants'][] = $constInfo;
                        } elseif ($inInterface && $currentInterface) {
                            $currentInterface['constants'][] = $constInfo;
                        } else {
                            $this->metadata['constants'][] = $constInfo;
                        }
                        break;

                    case T_VARIABLE:
                        if (($inClass || $inTrait) && !$inFunction) {
                            $propertyName = substr($tokenValue, 1); // Remove $
                            $propertyInfo = [
                                'name' => $propertyName,
                                'visibility' => $visibility,
                                'isStatic' => $isStatic,
                                'line' => $line,
                                'docComment' => $docComment
                            ];

                            if ($inClass && $currentClass) {
                                $currentClass['properties'][] = $propertyInfo;
                            } elseif ($inTrait && $currentTrait) {
                                $currentTrait['properties'][] = $propertyInfo;
                            }

                            // Reset modifiers
                            $visibility = 'public';
                            $isStatic = false;
                            $docComment = null;
                        }
                        break;

                    case T_PUBLIC:
                        $visibility = 'public';
                        break;

                    case T_PROTECTED:
                        $visibility = 'protected';
                        break;

                    case T_PRIVATE:
                        $visibility = 'private';
                        break;

                    case T_STATIC:
                        $isStatic = true;
                        break;

                    case T_ABSTRACT:
                        $isAbstract = true;
                        break;

                    case T_FINAL:
                        $isFinal = true;
                        break;

                    case T_DOC_COMMENT:
                        $docComment = $tokenValue;
                        break;
                }
            } else {
                // Handle single character tokens
                if ($tokens[$i] === '{') {
                    $braceLevel++;
                } elseif ($tokens[$i] === '}') {
                    $braceLevel--;

                    if ($braceLevel === 0) {
                        if ($inClass && $currentClass) {
                            $this->metadata['classes'][] = $currentClass;
                            $currentClass = null;
                            $inClass = false;
                        } elseif ($inInterface && $currentInterface) {
                            $this->metadata['interfaces'][] = $currentInterface;
                            $currentInterface = null;
                            $inInterface = false;
                        } elseif ($inTrait && $currentTrait) {
                            $this->metadata['traits'][] = $currentTrait;
                            $currentTrait = null;
                            $inTrait = false;
                        }
                    }

                    if ($inFunction && $braceLevel === ($inClass || $inInterface || $inTrait ? 1 : 0)) {
                        $inFunction = false;
                    }
                }
            }
        }
    }

    private function getNextIdentifier(&$tokens, &$index) {
        for ($i = $index + 1; $i < count($tokens); $i++) {
            if (is_array($tokens[$i])) {
                if ($tokens[$i][0] === T_STRING || $tokens[$i][0] === T_NAME_QUALIFIED) {
                    return $tokens[$i][1];
                } elseif ($tokens[$i][0] !== T_WHITESPACE) {
                    break;
                }
            } elseif ($tokens[$i] === '(' || $tokens[$i] === '{' || $tokens[$i] === ';') {
                break;
            }
        }
        return null;
    }

    private function getUseStatement(&$tokens, &$index) {
        $use = '';
        $inUse = false;

        for ($i = $index + 1; $i < count($tokens); $i++) {
            if (is_array($tokens[$i])) {
                if ($tokens[$i][0] === T_STRING || $tokens[$i][0] === T_NAME_QUALIFIED || $tokens[$i][0] === T_NS_SEPARATOR) {
                    $use .= $tokens[$i][1];
                    $inUse = true;
                } elseif ($tokens[$i][0] === T_AS) {
                    $use .= ' as ';
                } elseif ($tokens[$i][0] === T_WHITESPACE && $inUse) {
                    continue;
                }
            } elseif ($tokens[$i] === ';') {
                break;
            }
        }

        return $use ?: null;
    }

    private function getExtends(&$tokens, &$index) {
        for ($i = $index; $i < count($tokens); $i++) {
            if (is_array($tokens[$i]) && $tokens[$i][0] === T_EXTENDS) {
                return $this->getNextIdentifier($tokens, $i);
            } elseif (is_string($tokens[$i]) && $tokens[$i] === '{') {
                break;
            }
        }
        return null;
    }

    private function getImplements(&$tokens, &$index) {
        $implements = [];
        $foundImplements = false;

        for ($i = $index; $i < count($tokens); $i++) {
            if (is_array($tokens[$i])) {
                if ($tokens[$i][0] === T_IMPLEMENTS) {
                    $foundImplements = true;
                } elseif ($foundImplements && ($tokens[$i][0] === T_STRING || $tokens[$i][0] === T_NAME_QUALIFIED)) {
                    $implements[] = $tokens[$i][1];
                }
            } elseif (is_string($tokens[$i])) {
                if ($tokens[$i] === '{') {
                    break;
                }
            }
        }

        return $implements;
    }

    private function getInterfaceExtends(&$tokens, &$index) {
        $extends = [];
        $foundExtends = false;

        for ($i = $index; $i < count($tokens); $i++) {
            if (is_array($tokens[$i])) {
                if ($tokens[$i][0] === T_EXTENDS) {
                    $foundExtends = true;
                } elseif ($foundExtends && ($tokens[$i][0] === T_STRING || $tokens[$i][0] === T_NAME_QUALIFIED)) {
                    $extends[] = $tokens[$i][1];
                }
            } elseif (is_string($tokens[$i])) {
                if ($tokens[$i] === '{') {
                    break;
                }
            }
        }

        return $extends;
    }

    private function getParameters(&$tokens, &$index) {
        $parameters = [];
        $inParams = false;
        $currentParam = [];

        for ($i = $index; $i < count($tokens); $i++) {
            if ($tokens[$i] === '(') {
                $inParams = true;
            } elseif ($tokens[$i] === ')') {
                if (!empty($currentParam)) {
                    $parameters[] = $currentParam;
                }
                break;
            } elseif ($inParams) {
                if (is_array($tokens[$i])) {
                    if ($tokens[$i][0] === T_VARIABLE) {
                        $currentParam['name'] = substr($tokens[$i][1], 1);
                    } elseif ($tokens[$i][0] === T_STRING || $tokens[$i][0] === T_NAME_QUALIFIED) {
                        if (!isset($currentParam['name'])) {
                            $currentParam['type'] = $tokens[$i][1];
                        }
                    }
                } elseif ($tokens[$i] === ',') {
                    if (!empty($currentParam)) {
                        $parameters[] = $currentParam;
                        $currentParam = [];
                    }
                } elseif ($tokens[$i] === '=') {
                    $currentParam['hasDefault'] = true;
                }
            }
        }

        return $parameters;
    }

    private function getReturnType(&$tokens, &$index) {
        for ($i = $index; $i < count($tokens); $i++) {
            if ($tokens[$i] === ':') {
                return $this->getNextIdentifier($tokens, $i);
            } elseif ($tokens[$i] === '{' || $tokens[$i] === ';') {
                break;
            }
        }
        return null;
    }

    private function getConstValue(&$tokens, &$index) {
        $value = '';
        $foundEquals = false;

        for ($i = $index; $i < count($tokens); $i++) {
            if ($tokens[$i] === '=') {
                $foundEquals = true;
            } elseif ($foundEquals) {
                if ($tokens[$i] === ';') {
                    break;
                } elseif (is_array($tokens[$i]) && $tokens[$i][0] !== T_WHITESPACE) {
                    $value .= $tokens[$i][1];
                } elseif (!is_array($tokens[$i])) {
                    $value .= $tokens[$i];
                }
            }
        }

        return $value;
    }

    private function isAnonymousClass(&$tokens, $index) {
        // Check if this is an anonymous class
        for ($i = $index + 1; $i < count($tokens) && $i < $index + 5; $i++) {
            if (is_array($tokens[$i])) {
                if ($tokens[$i][0] === T_NEW) {
                    return true;
                } elseif ($tokens[$i][0] === T_STRING) {
                    return false;
                }
            } elseif ($tokens[$i] === '(') {
                return true;
            }
        }
        return false;
    }

    private function basicExtraction() {
        // Fallback to regex-based extraction
        $this->metadata['fallback'] = 'regex';

        // Extract namespace
        if (preg_match('/^\s*namespace\s+([^;]+);/m', $this->content, $matches)) {
            $this->metadata['namespace'] = $matches[1];
        }

        // Extract classes
        preg_match_all('/^\s*(?:(abstract|final)\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?/m', $this->content, $matches, PREG_SET_ORDER);
        foreach ($matches as $match) {
            $this->metadata['classes'][] = [
                'name' => $match[2],
                'isAbstract' => $match[1] === 'abstract',
                'isFinal' => $match[1] === 'final',
                'extends' => $match[3] ?? null,
                'implements' => isset($match[4]) ? array_map('trim', explode(',', $match[4])) : [],
                'methods' => [],
                'properties' => []
            ];
        }

        // Extract interfaces
        preg_match_all('/^\s*interface\s+(\w+)(?:\s+extends\s+([^{]+))?/m', $this->content, $matches, PREG_SET_ORDER);
        foreach ($matches as $match) {
            $this->metadata['interfaces'][] = [
                'name' => $match[1],
                'extends' => isset($match[2]) ? array_map('trim', explode(',', $match[2])) : [],
                'methods' => []
            ];
        }

        // Extract traits
        preg_match_all('/^\s*trait\s+(\w+)/m', $this->content, $matches);
        foreach ($matches[1] as $trait) {
            $this->metadata['traits'][] = [
                'name' => $trait,
                'methods' => [],
                'properties' => []
            ];
        }
    }
}

// PhpParser visitor class (if available)
if ($usePhpParser) {
    class PhpParserVisitor extends \PhpParser\NodeVisitorAbstract {
        private $metadata;
        private $currentClass = null;
        private $currentInterface = null;
        private $currentTrait = null;

        public function __construct(&$metadata) {
            $this->metadata = &$metadata;
        }

        public function enterNode(\PhpParser\Node $node) {
            if ($node instanceof \PhpParser\Node\Stmt\Namespace_) {
                $this->metadata['namespace'] = $node->name ? $node->name->toString() : null;
            } elseif ($node instanceof \PhpParser\Node\Stmt\Use_) {
                foreach ($node->uses as $use) {
                    $this->metadata['uses'][] = $use->name->toString();
                }
            } elseif ($node instanceof \PhpParser\Node\Stmt\Class_) {
                $this->currentClass = [
                    'name' => $node->name->name,
                    'namespace' => $this->metadata['namespace'],
                    'extends' => $node->extends ? $node->extends->toString() : null,
                    'implements' => array_map(function($i) { return $i->toString(); }, $node->implements),
                    'isAbstract' => $node->isAbstract(),
                    'isFinal' => $node->isFinal(),
                    'methods' => [],
                    'properties' => [],
                    'constants' => [],
                    'traits' => [],
                    'line' => $node->getLine()
                ];

                // Process trait uses
                foreach ($node->stmts as $stmt) {
                    if ($stmt instanceof \PhpParser\Node\Stmt\TraitUse) {
                        foreach ($stmt->traits as $trait) {
                            $this->currentClass['traits'][] = $trait->toString();
                        }
                    }
                }
            } elseif ($node instanceof \PhpParser\Node\Stmt\Interface_) {
                $this->currentInterface = [
                    'name' => $node->name->name,
                    'namespace' => $this->metadata['namespace'],
                    'extends' => array_map(function($e) { return $e->toString(); }, $node->extends),
                    'methods' => [],
                    'constants' => [],
                    'line' => $node->getLine()
                ];
            } elseif ($node instanceof \PhpParser\Node\Stmt\Trait_) {
                $this->currentTrait = [
                    'name' => $node->name->name,
                    'namespace' => $this->metadata['namespace'],
                    'methods' => [],
                    'properties' => [],
                    'line' => $node->getLine()
                ];
            } elseif ($node instanceof \PhpParser\Node\Stmt\ClassMethod) {
                $method = [
                    'name' => $node->name->name,
                    'visibility' => $this->getVisibility($node),
                    'isStatic' => $node->isStatic(),
                    'isAbstract' => $node->isAbstract(),
                    'isFinal' => $node->isFinal(),
                    'parameters' => $this->extractParameters($node->params),
                    'returnType' => $node->returnType ? $node->returnType->toString() : null,
                    'line' => $node->getLine()
                ];

                if ($this->currentClass) {
                    $this->currentClass['methods'][] = $method;
                } elseif ($this->currentInterface) {
                    $this->currentInterface['methods'][] = $method;
                } elseif ($this->currentTrait) {
                    $this->currentTrait['methods'][] = $method;
                }
            } elseif ($node instanceof \PhpParser\Node\Stmt\Property) {
                $property = [
                    'visibility' => $this->getVisibility($node),
                    'isStatic' => $node->isStatic(),
                    'properties' => []
                ];

                foreach ($node->props as $prop) {
                    $property['properties'][] = [
                        'name' => $prop->name->name,
                        'default' => $prop->default ? $this->getNodeValue($prop->default) : null,
                        'line' => $node->getLine()
                    ];
                }

                if ($this->currentClass) {
                    foreach ($property['properties'] as $prop) {
                        $this->currentClass['properties'][] = array_merge($prop, [
                            'visibility' => $property['visibility'],
                            'isStatic' => $property['isStatic']
                        ]);
                    }
                } elseif ($this->currentTrait) {
                    foreach ($property['properties'] as $prop) {
                        $this->currentTrait['properties'][] = array_merge($prop, [
                            'visibility' => $property['visibility'],
                            'isStatic' => $property['isStatic']
                        ]);
                    }
                }
            } elseif ($node instanceof \PhpParser\Node\Stmt\ClassConst) {
                foreach ($node->consts as $const) {
                    $constInfo = [
                        'name' => $const->name->name,
                        'value' => $this->getNodeValue($const->value),
                        'visibility' => $this->getVisibility($node),
                        'line' => $node->getLine()
                    ];

                    if ($this->currentClass) {
                        $this->currentClass['constants'][] = $constInfo;
                    } elseif ($this->currentInterface) {
                        $this->currentInterface['constants'][] = $constInfo;
                    }
                }
            } elseif ($node instanceof \PhpParser\Node\Stmt\Function_) {
                $this->metadata['functions'][] = [
                    'name' => $node->name->name,
                    'parameters' => $this->extractParameters($node->params),
                    'returnType' => $node->returnType ? $node->returnType->toString() : null,
                    'line' => $node->getLine()
                ];
            } elseif ($node instanceof \PhpParser\Node\Stmt\Const_) {
                foreach ($node->consts as $const) {
                    $this->metadata['constants'][] = [
                        'name' => $const->name->name,
                        'value' => $this->getNodeValue($const->value),
                        'line' => $node->getLine()
                    ];
                }
            }
        }

        public function leaveNode(\PhpParser\Node $node) {
            if ($node instanceof \PhpParser\Node\Stmt\Class_) {
                $this->metadata['classes'][] = $this->currentClass;
                $this->currentClass = null;
            } elseif ($node instanceof \PhpParser\Node\Stmt\Interface_) {
                $this->metadata['interfaces'][] = $this->currentInterface;
                $this->currentInterface = null;
            } elseif ($node instanceof \PhpParser\Node\Stmt\Trait_) {
                $this->metadata['traits'][] = $this->currentTrait;
                $this->currentTrait = null;
            }
        }

        private function getVisibility($node) {
            if ($node->isPublic()) return 'public';
            if ($node->isProtected()) return 'protected';
            if ($node->isPrivate()) return 'private';
            return 'public';
        }

        private function extractParameters($params) {
            $parameters = [];
            foreach ($params as $param) {
                $parameters[] = [
                    'name' => $param->var->name,
                    'type' => $param->type ? $param->type->toString() : null,
                    'hasDefault' => $param->default !== null,
                    'defaultValue' => $param->default ? $this->getNodeValue($param->default) : null,
                    'byRef' => $param->byRef,
                    'variadic' => $param->variadic
                ];
            }
            return $parameters;
        }

        private function getNodeValue($node) {
            if ($node instanceof \PhpParser\Node\Scalar\String_) {
                return $node->value;
            } elseif ($node instanceof \PhpParser\Node\Scalar\LNumber ||
                     $node instanceof \PhpParser\Node\Scalar\DNumber) {
                return $node->value;
            } elseif ($node instanceof \PhpParser\Node\Expr\ConstFetch) {
                return $node->name->toString();
            } elseif ($node instanceof \PhpParser\Node\Expr\Array_) {
                return 'array';
            }
            return null;
        }

        public function getMetadata() {
            return $this->metadata;
        }
    }
}

// Main execution
if ($argc < 2) {
    echo json_encode(['error' => 'No file path provided']);
    exit(1);
}

try {
    $bridge = new PhpAstBridge($argv[1]);
    echo $bridge->parse();
} catch (Exception $e) {
    echo json_encode([
        'error' => $e->getMessage(),
        'trace' => array_slice($e->getTrace(), 0, 5)
    ]);
    exit(1);
}