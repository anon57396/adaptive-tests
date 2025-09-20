# Adaptive Tests for Rust - EXPERIMENTAL

[![Status](https://img.shields.io/badge/status-experimental-orange.svg)](https://github.com/anon57396/adaptive-tests)

> **⚠️ EXPERIMENTAL** - This Rust implementation is currently in development

AI-ready testing infrastructure for Rust that survives refactoring without breaking. When AI agents reshape your Rust codebase, traditional `use` statements break. Adaptive Tests uses **zero-runtime discovery** powered by AST analysis to find code by structure, not module paths.

## Status

🚧 **This implementation is experimental and under active development.**

Current features:
- ✅ Basic Rust AST parsing via tree-sitter
- ✅ Struct and function discovery
- ✅ Method signature matching
- ✅ Cargo.toml integration
- ⚠️ Limited trait discovery
- ⚠️ Basic macro support
- ⚠️ No async runtime integration yet

## Planned Features

```rust
use adaptive_tests::{discover, Signature};

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_service() {
        // Discover UserService by signature
        let user_service = discover!(Signature {
            name: "UserService",
            type_: "struct",
            methods: vec!["find_by_id", "create", "update"],
            traits: vec!["Clone", "Debug"],
        });

        let service = user_service::new();
        let user = service.find_by_id(1);
        assert!(user.is_some());
    }

    #[test]
    fn test_trait_implementation() {
        // Find implementations of a specific trait
        let payment_processor = discover!(Signature {
            name: "StripeProcessor",
            implements: vec!["PaymentProcessor"],
            methods: vec!["process_payment", "refund"],
        });

        // Test trait implementation
        let processor = payment_processor::new();
        assert!(processor.process_payment(&payment_data).is_ok());
    }
}
```

## Contributing

This is experimental work focused on Rust-specific patterns:

1. **Rust AST parsing improvements** - Better syn/tree-sitter integration
2. **Trait discovery** - Find implementations and trait objects
3. **Macro expansion** - Handle procedural and declarative macros
4. **Async runtime integration** - Tokio-aware discovery patterns
5. **Testing framework integration** - Enhanced cargo test support

## Roadmap

- [ ] Complete trait discovery and implementation matching
- [ ] Macro expansion and procedural macro support
- [ ] Async/await pattern recognition
- [ ] Enhanced error handling with Result patterns
- [ ] Integration with popular testing crates (proptest, quickcheck)
- [ ] Performance benchmarks for large Rust projects

## Development Notes

Current implementation includes:
- `Cargo.toml` for Rust-specific configuration
- `rust-ast-bridge.rs` for native Rust AST parsing
- Integration with Node.js discovery engine via FFI
- Pattern matching for Rust-specific constructs (traits, enums, etc.)

---

**Ready to experiment with Rust adaptive testing?**

```toml
[dev-dependencies]
adaptive-tests = { git = "https://github.com/anon57396/adaptive-tests", features = ["rust"] }
```

This package is not yet published. Contributions welcome!