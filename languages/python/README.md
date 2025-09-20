# Adaptive Tests for Python

[![PyPI version](https://img.shields.io/pypi/v/adaptive-tests-py.svg)](https://pypi.org/project/adaptive-tests-py/)
[![Coverage](https://img.shields.io/codecov/c/github/anon57396/adaptive-tests?label=coverage)](https://codecov.io/gh/anon57396/adaptive-tests)

> **AI-ready testing infrastructure for Python** - Tests that survive refactoring without breaking

When AI agents reshape your Python codebase, traditional imports break. Adaptive Tests uses **zero-runtime discovery** powered by AST analysis to find code by structure, not import paths. Your tests adapt as code evolves.

**Stop fixing broken imports.** Move files, rename modules, refactor packages—adaptive tests still find the code they care about.

---

## Quick Start

### Installation

```bash
pip install adaptive-tests-py
```

### Basic Usage

```python
from adaptive_tests import DiscoveryEngine, discover, Signature

# Simple discovery - find by name
TodoService = discover("TodoService")
service = TodoService()

# Detailed discovery - find by structure
UserService = discover(Signature(
    name="UserService",
    type="class",
    methods=["find_by_id", "create", "update"],
    properties=["repository"]
))

# Test the discovered service
def test_user_service():
    service = UserService()
    user = service.find_by_id(1)
    assert user is not None
```

### pytest Integration

```python
import pytest
from adaptive_tests import discover

@pytest.fixture
def user_service():
    """Discover UserService automatically."""
    UserService = discover("UserService")
    return UserService()

def test_find_user(user_service):
    user = user_service.find_by_id(1)
    assert user.name == "John Doe"

def test_create_user(user_service):
    user_data = {"name": "Jane Doe", "email": "jane@example.com"}
    user = user_service.create(user_data)
    assert user.id is not None
```

---

## Core API

### `discover(signature, root_path=None)`

Primary function for finding Python code by structure:

```python
from adaptive_tests import discover, Signature

# Simple string signature
Calculator = discover("Calculator")

# Detailed signature
UserService = discover(Signature(
    name="UserService",
    type="class",
    methods=["find_by_id", "create", "update", "delete"],
    properties=["db", "cache"],
    parent_classes=["BaseService"]
))

# With custom search path
PaymentGateway = discover(
    Signature(name="PaymentGateway", type="class"),
    root_path="./src/payments"
)
```

### `DiscoveryEngine` Class

For advanced usage and reusable engines:

```python
from adaptive_tests import DiscoveryEngine, Signature

# Create engine with custom configuration
engine = DiscoveryEngine(
    root="./src",
    config={
        "max_depth": 5,
        "include_patterns": ["**/*.py"],
        "exclude_patterns": ["**/test_*.py", "**/tests/**"]
    }
)

# Discover multiple targets efficiently
UserService = engine.discover(Signature(name="UserService"))
OrderService = engine.discover(Signature(name="OrderService"))
PaymentService = engine.discover(Signature(name="PaymentService"))

# Get detailed discovery information
result = engine.discover_detailed(Signature(name="Calculator"))
print(f"Found: {result.module_path}")
print(f"Score: {result.score}")
print(f"Methods: {result.methods}")
```

### `AdaptiveTestCase` Class

For structured, reusable test patterns:

```python
from adaptive_tests import AdaptiveTestCase, Signature
import unittest

class CalculatorTestCase(AdaptiveTestCase):
    def get_target_signature(self):
        return Signature(
            name="Calculator",
            type="class",
            methods=["add", "subtract", "multiply", "divide"]
        )

    def setUp(self):
        super().setUp()
        self.calculator = self.target_class()

    def test_addition(self):
        result = self.calculator.add(2, 3)
        self.assertEqual(result, 5)

    def test_division_by_zero(self):
        with self.assertRaises(ValueError):
            self.calculator.divide(5, 0)

# Run the adaptive test
if __name__ == "__main__":
    unittest.main()
```

---

## Advanced Discovery

### Class Inheritance

```python
from adaptive_tests import discover, Signature

# Find classes that inherit from BaseModel
UserModel = discover(Signature(
    name="User",
    type="class",
    parent_classes=["BaseModel"],
    methods=["save", "delete"]
))

# Find abstract base classes
BaseService = discover(Signature(
    name="BaseService",
    type="abstract_class",
    methods=["execute", "validate"]
))
```

### Function Discovery

```python
# Find standalone functions
calculate_tax = discover(Signature(
    name="calculate_tax",
    type="function",
    parameters=["amount", "rate"],
    return_type="float"
))

# Find decorated functions
api_endpoint = discover(Signature(
    name="get_user",
    type="function",
    decorators=["@app.route", "@login_required"]
))
```

### Module-Level Discovery

```python
# Find constants and variables
API_SETTINGS = discover(Signature(
    name="API_SETTINGS",
    type="variable",
    value_type="dict"
))

# Find module-level imports
database = discover(Signature(
    name="database",
    type="import",
    module="sqlalchemy"
))
```

### Django Integration

```python
from adaptive_tests import discover, Signature

def test_django_model():
    # Find Django models
    User = discover(Signature(
        name="User",
        type="class",
        parent_classes=["models.Model"],
        methods=["save", "delete"],
        fields=["username", "email"]
    ))

    # Test model functionality
    user = User.objects.create(username="testuser", email="test@example.com")
    assert user.pk is not None

def test_django_view():
    # Find Django views
    UserListView = discover(Signature(
        name="UserListView",
        type="class",
        parent_classes=["ListView"],
        attributes=["model", "template_name"]
    ))

    # Test view
    view = UserListView()
    assert view.model is not None
```

### Flask Integration

```python
def test_flask_routes():
    # Find Flask app and routes
    app = discover(Signature(
        name="app",
        type="instance",
        class_name="Flask"
    ))

    # Find route handlers
    get_users = discover(Signature(
        name="get_users",
        type="function",
        decorators=["@app.route"]
    ))

    # Test with Flask test client
    with app.test_client() as client:
        response = client.get('/users')
        assert response.status_code == 200
```

---

## Configuration

### Basic Configuration

Create `adaptive-tests.config.json`:

```json
{
  "discovery": {
    "include_patterns": ["src/**/*.py", "lib/**/*.py"],
    "exclude_patterns": ["test_*.py", "**/tests/**", "**/__pycache__/**"],
    "max_depth": 10,
    "follow_imports": true
  },
  "scoring": {
    "exact_name_weight": 50,
    "method_match_weight": 20,
    "inheritance_weight": 15,
    "threshold": 40
  }
}
```

### Python Configuration File

Create `adaptive_tests_config.py`:

```python
from adaptive_tests import Config

config = Config(
    discovery={
        "include_patterns": ["src/**/*.py"],
        "exclude_patterns": ["**/test_*.py"],
        "max_depth": 8,
        "parse_docstrings": True,
        "follow_imports": True
    },
    scoring={
        "exact_name_weight": 60,
        "method_signature_weight": 25,
        "docstring_weight": 10,
        "path_weight": 5
    },
    python_specific={
        "respect_init_files": True,
        "parse_type_hints": True,
        "include_private_methods": False,
        "include_dunder_methods": False
    }
)
```

### Environment-Specific Settings

```python
import os
from adaptive_tests import DiscoveryEngine

# Development settings
if os.getenv("ENVIRONMENT") == "development":
    engine = DiscoveryEngine(
        root="./src",
        config={
            "max_depth": 10,
            "include_test_files": True,
            "verbose_logging": True
        }
    )
else:
    # Production settings
    engine = DiscoveryEngine(
        root="./src",
        config={
            "max_depth": 5,
            "include_test_files": False,
            "cache_enabled": True
        }
    )
```

---

## Testing Frameworks

### pytest Integration

```python
# conftest.py
import pytest
from adaptive_tests import DiscoveryEngine

@pytest.fixture(scope="session")
def discovery_engine():
    """Shared discovery engine for all tests."""
    return DiscoveryEngine(root="./src")

@pytest.fixture
def user_service(discovery_engine):
    """Auto-discover UserService."""
    UserService = discovery_engine.discover("UserService")
    return UserService()

# test_user_service.py
def test_user_creation(user_service):
    user = user_service.create_user("John Doe", "john@example.com")
    assert user.name == "John Doe"

def test_user_finding(user_service):
    user = user_service.find_by_email("john@example.com")
    assert user is not None
```

### unittest Integration

```python
import unittest
from adaptive_tests import discover, AdaptiveTestCase

class TestUserService(AdaptiveTestCase):
    target_signature = {
        "name": "UserService",
        "type": "class",
        "methods": ["create_user", "find_by_email"]
    }

    def setUp(self):
        super().setUp()
        self.service = self.target_class()

    def test_user_creation(self):
        user = self.service.create_user("Jane Doe", "jane@example.com")
        self.assertIsNotNone(user.id)
        self.assertEqual(user.name, "Jane Doe")

if __name__ == "__main__":
    unittest.main()
```

### Hypothesis Integration

```python
from hypothesis import given, strategies as st
from adaptive_tests import discover

Calculator = discover("Calculator")

@given(
    a=st.integers(min_value=-1000, max_value=1000),
    b=st.integers(min_value=-1000, max_value=1000)
)
def test_calculator_commutativity(a, b):
    calc = Calculator()
    assert calc.add(a, b) == calc.add(b, a)

@given(
    a=st.floats(min_value=0.1, max_value=1000.0),
    b=st.floats(min_value=0.1, max_value=1000.0)
)
def test_calculator_division(a, b):
    calc = Calculator()
    result = calc.divide(a, b)
    assert abs(result - (a / b)) < 0.0001
```

---

## Examples

This package includes complete examples:

### Calculator Example
```bash
cd languages/javascript/examples/calculator
pytest tests/
```

### FastAPI Service Example
```bash
cd languages/python/examples/fastapi-service
pip install -r requirements.txt
pytest tests/
```

### Django Project Example
```bash
cd languages/python/examples/django-blog
python manage.py test
```

### Data Science Pipeline
```bash
cd languages/python/examples/data-pipeline
pytest tests/
```

---

## CLI Tools

### Discover Command

```bash
# Find classes by name
adaptive-tests discover "UserService"

# Find with detailed signature
adaptive-tests discover --name "Calculator" --type "class" --methods "add,subtract"

# Search in specific directory
adaptive-tests discover "PaymentGateway" --root "./src/payments"

# JSON output for tooling
adaptive-tests discover "UserService" --json
```

### Generate Tests

```bash
# Generate test for a specific class
adaptive-tests generate-test src/services/user_service.py

# Generate tests for entire module
adaptive-tests generate-test src/services/ --recursive

# Generate with specific test framework
adaptive-tests generate-test src/calculator.py --framework pytest
```

### Debug Discovery

```bash
# Debug why a signature matched (or didn't)
adaptive-tests why --name "Calculator" --methods "add,subtract"

# Verbose debugging
adaptive-tests why "UserService" --verbose

# Show all candidates
adaptive-tests discover "Calculator" --show-all
```

---

## Performance

### Benchmarks

- **First discovery**: ~10ms
- **Cached discovery**: ~1ms
- **Large codebase (1000+ files)**: ~100ms
- **Zero runtime overhead** after discovery

### Optimization Tips

1. **Use specific patterns**: Narrow your search with include/exclude patterns
2. **Enable caching**: Use the built-in cache for repeated discoveries
3. **Limit search depth**: Set reasonable max_depth values
4. **Reuse engines**: Create one engine per test session

```python
# Good: Reuse engine
engine = DiscoveryEngine(root="./src")
UserService = engine.discover("UserService")
OrderService = engine.discover("OrderService")

# Avoid: Multiple engines
UserService = discover("UserService")
OrderService = discover("OrderService")
```

---

## Troubleshooting

### Common Issues

**Import errors after refactoring**
```python
# Use discovery instead of direct imports
# Old:
# from src.services.user_service import UserService

# New:
from adaptive_tests import discover
UserService = discover("UserService")
```

**Discovery fails to find class**
```bash
# Debug with CLI
adaptive-tests why "UserService" --verbose
```

**Performance issues**
```python
# Optimize search patterns
engine = DiscoveryEngine(
    root="./src",
    config={
        "include_patterns": ["src/services/**/*.py"],  # Specific
        "exclude_patterns": ["**/test_*.py", "**/__pycache__/**"],
        "max_depth": 5  # Reasonable limit
    }
)
```

**Type hints not recognized**
```python
# Enable type hint parsing
engine = DiscoveryEngine(
    config={"python_specific": {"parse_type_hints": True}}
)
```

---

## Development

### Building from Source

```bash
git clone https://github.com/anon57396/adaptive-tests.git
cd adaptive-tests/languages/python
pip install -e .
pytest tests/
```

### Contributing

We welcome Python-specific contributions! See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

### Running Tests

```bash
# All tests
pytest

# Specific test file
pytest tests/test_discovery.py

# With coverage
pytest --cov=adaptive_tests tests/

# Integration tests
pytest tests/integration/
```

---

## License

MIT - See [LICENSE](../../LICENSE) for details.

---

**Ready to make your Python tests refactoring-proof?**

```bash
pip install adaptive-tests-py
```

Start with the [Quick Start](#quick-start) guide above!
