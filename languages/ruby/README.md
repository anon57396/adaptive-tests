# Adaptive Tests for Ruby - EXPERIMENTAL

[![Status](https://img.shields.io/badge/status-experimental-orange.svg)](https://github.com/anon57396/adaptive-tests)

> **⚠️ EXPERIMENTAL** - This Ruby implementation is currently in development

AI-ready testing infrastructure for Ruby that survives refactoring without breaking. When AI agents reshape your Ruby codebase, traditional `require` statements break. Adaptive Tests uses **zero-runtime discovery** powered by AST analysis to find code by structure, not file paths.

## Status

🚧 **This implementation is experimental and under active development.**

Current features:
- ✅ Basic Ruby AST parsing
- ✅ Class and module discovery
- ✅ Method signature matching
- ✅ Native Ruby AST bridge
- ⚠️ Limited gem integration
- ⚠️ Basic RSpec support
- ⚠️ No Rails-specific patterns yet

## Planned Features

```ruby
require 'adaptive_tests'

RSpec.describe 'UserService' do
  include AdaptiveTests

  let(:user_service) do
    # Discover UserService by signature
    discover(
      name: 'UserService',
      type: 'class',
      methods: ['find_by_id', 'create', 'update'],
      modules: ['Searchable', 'Validatable']
    )
  end

  it 'finds user by ID' do
    service = user_service.new
    user = service.find_by_id(1)
    expect(user).to be_present
  end

  it 'creates new user' do
    service = user_service.new
    user_data = { name: 'John Doe', email: 'john@example.com' }
    user = service.create(user_data)
    expect(user.id).to be_present
  end
end
```

## Ruby-Specific Features

### Module and Mixin Discovery

```ruby
# Find classes that include specific modules
user_model = discover(
  name: 'User',
  type: 'class',
  includes: ['ActiveModel::Validations'],
  methods: ['valid?', 'save']
)

# Find modules by functionality
auth_module = discover(
  name: 'Authentication',
  type: 'module',
  methods: ['authenticate', 'authorize']
)
```

### Gem and Library Integration

```ruby
# Find Rails controllers
user_controller = discover(
  name: 'UsersController',
  type: 'class',
  inherits: 'ApplicationController',
  methods: ['index', 'show', 'create']
)

# Find ActiveRecord models
user_model = discover(
  name: 'User',
  type: 'class',
  inherits: 'ActiveRecord::Base',
  associations: ['has_many :posts']
)
```

## Contributing

This is experimental work focused on Ruby-specific patterns:

1. **Ruby AST parsing improvements** - Better parser gem integration
2. **Rails framework support** - ActiveRecord, ActionController patterns
3. **Gem ecosystem integration** - RubyGems-aware discovery
4. **Metaprogramming support** - Dynamic method definitions
5. **Testing framework integration** - RSpec, Minitest, Cucumber

## Roadmap

- [ ] Complete Rails framework integration (ActiveRecord, ActionController)
- [ ] Gem dependency resolution and discovery
- [ ] Metaprogramming pattern recognition (define_method, etc.)
- [ ] Enhanced module and mixin discovery
- [ ] Performance optimizations for large Rails apps
- [ ] Integration with popular testing frameworks

## Development Notes

Current implementation includes:
- `ruby-ast-bridge.rb` for native Ruby AST parsing
- Integration with Node.js discovery engine
- Pattern matching for Ruby-specific constructs (modules, mixins, etc.)
- Basic support for Ruby metaprogramming patterns

---

**Ready to experiment with Ruby adaptive testing?**

```ruby
# Gemfile
gem 'adaptive-tests', git: 'https://github.com/anon57396/adaptive-tests'
```

This gem is not yet published. Contributions welcome!