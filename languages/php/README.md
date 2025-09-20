# Adaptive Tests for PHP - EXPERIMENTAL

[![Status](https://img.shields.io/badge/status-experimental-orange.svg)](https://github.com/anon57396/adaptive-tests)

> **⚠️ EXPERIMENTAL** - This PHP implementation is currently in development

AI-ready testing infrastructure for PHP that survives refactoring without breaking. When AI agents reshape your PHP codebase, traditional includes break. Adaptive Tests uses **zero-runtime discovery** powered by AST analysis to find code by structure, not file paths.

## Status

🚧 **This implementation is experimental and under active development.**

Current features:
- ✅ Basic PHP AST parsing
- ✅ Class discovery by name and structure
- ✅ Method signature matching
- ✅ PHPUnit integration examples
- ⚠️ Limited testing framework support
- ⚠️ Basic namespace handling

## Installation

```bash
# Core package
composer require adaptive-tests/php:dev-main

# Development dependencies
composer require --dev phpunit/phpunit
```

## Basic Usage

```php
<?php
use AdaptiveTests\PHP\Discovery\PhpDiscoveryEngine;
use AdaptiveTests\PHP\Discovery\DiscoverySignature;

class UserServiceTest extends \PHPUnit\Framework\TestCase
{
    private $engine;

    public function setUp(): void
    {
        $this->engine = new PhpDiscoveryEngine('./src');
    }

    public function testUserService()
    {
        // Discover UserService by signature
        $signature = DiscoverySignature::builder()
            ->name('UserService')
            ->type('class')
            ->methods(['findById', 'create', 'update'])
            ->build();

        $userServiceClass = $this->engine->discover($signature);

        $userService = new $userServiceClass();
        $this->assertInstanceOf('UserService', $userService);
    }
}
```

## Examples

The `examples/` directory contains:
- Basic calculator example
- UserService with PHPUnit integration
- Adaptive test base classes

## Contributing

This is experimental work. Contributions welcome:

1. PHP AST parsing improvements
2. Framework integrations (Laravel, Symfony)
3. Enhanced discovery patterns
4. Performance optimizations

## Roadmap

- [ ] Complete namespace resolution
- [ ] Laravel/Symfony integration
- [ ] Trait discovery support
- [ ] Composer autoload integration
- [ ] Enhanced error handling
- [ ] Performance benchmarks

---

**Ready to experiment with PHP adaptive testing?**

```bash
composer require adaptive-tests/php:dev-main
```

See the [examples](./examples/) to get started!