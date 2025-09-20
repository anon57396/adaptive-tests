# Adaptive Tests for Go - EXPERIMENTAL

[![Status](https://img.shields.io/badge/status-experimental-orange.svg)](https://github.com/anon57396/adaptive-tests)

> **⚠️ EXPERIMENTAL** - This Go implementation is currently in development

AI-ready testing infrastructure for Go that survives refactoring without breaking. When AI agents reshape your Go codebase, traditional imports break. Adaptive Tests uses **zero-runtime discovery** powered by AST analysis to find code by structure, not import paths.

## Status

🚧 **This implementation is experimental and under active development.**

Current features:
- ✅ Basic Go AST parsing via tree-sitter
- ✅ Struct and function discovery
- ✅ Method signature matching
- ⚠️ Limited package resolution
- ⚠️ Basic testing framework support
- ⚠️ No module system integration yet

## Planned Features

```go
package main

import (
    "testing"
    "github.com/adaptive-tests/go/discovery"
)

func TestUserService(t *testing.T) {
    // Discover UserService by signature
    engine := discovery.NewGoDiscoveryEngine("./src")

    userService, err := engine.Discover(discovery.Signature{
        Name: "UserService",
        Type: "struct",
        Methods: []string{"FindById", "Create", "Update"},
    })

    if err != nil {
        t.Fatal(err)
    }

    // Test the discovered service
    service := userService.New()
    user := service.FindById(1)
    assert.NotNil(t, user)
}
```

## Contributing

This is experimental work focused on Go-specific patterns:

1. **Go AST parsing improvements** - Better tree-sitter integration
2. **Module system support** - go.mod awareness
3. **Interface discovery** - Find implementations by interface
4. **Goroutine safety** - Concurrent discovery patterns
5. **Testing framework integration** - Enhanced testify, Ginkgo support

## Roadmap

- [ ] Complete Go module resolution
- [ ] Interface discovery and implementation matching
- [ ] Enhanced struct field discovery
- [ ] Goroutine-safe discovery patterns
- [ ] Testing framework integrations (testify, Ginkgo)
- [ ] Performance benchmarks for large codebases

## Development Notes

Current implementation uses:
- `tree-sitter-go` for AST parsing
- Node.js bridge for discovery engine
- Pattern matching for Go-specific constructs

---

**Ready to experiment with Go adaptive testing?**

```bash
go get github.com/adaptive-tests/go
```

This package is not yet published. Contributions welcome!