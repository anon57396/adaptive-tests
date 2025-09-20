"""Adaptive tests for decorated service with complex Python features"""

import pytest
from adaptive.discovery import DiscoveryEngine, Signature


def test_decorated_methods_discovery():
    """Test discovery of class with decorated methods"""
    engine = DiscoveryEngine(root=".")

    # Discover DataService with decorated methods
    DataService = engine.discover(Signature(
        name="DataService",
        methods=["fetch_data", "compute_expensive", "process_items"],
        type="class"
    ))

    service = DataService()

    # Test decorated method still works
    result = service.fetch_data("test-key")
    assert result["key"] == "test-key"

    # Test caching decorator
    first_call = service.compute_expensive(5)
    second_call = service.compute_expensive(5)  # Should hit cache
    assert first_call == second_call == 25


def test_static_and_class_methods():
    """Test discovery of static and class methods"""
    engine = DiscoveryEngine(root=".")

    DataService = engine.discover(Signature(
        name="DataService",
        methods=["static_helper", "create_from_config"]
    ))

    # Test static method
    result = DataService.static_helper(10)
    assert result == 20

    # Test class method
    instance = DataService.create_from_config({"source": "test"})
    assert instance.data_source == "test"


def test_async_service_discovery():
    """Test discovery of async methods"""
    engine = DiscoveryEngine(root=".")

    AsyncService = engine.discover(Signature(
        name="AsyncService",
        methods=["async_fetch", "async_process"],
        type="class"
    ))

    service = AsyncService()

    # Verify async methods exist
    assert hasattr(service, "async_fetch")
    assert hasattr(service, "async_process")

    # Test with asyncio
    import asyncio

    async def test_async():
        data = await service.async_fetch("http://example.com")
        processed = await service.async_process(data)
        return processed

    result = asyncio.run(test_async())
    assert "DATA FROM HTTP://EXAMPLE.COM" in result


def test_property_service_discovery():
    """Test discovery of class with properties"""
    engine = DiscoveryEngine(root=".")

    PropertyService = engine.discover(Signature(
        name="PropertyService",
        methods=["add_item", "clear_items"],
        properties=["value", "item_count"]
    ))

    service = PropertyService()

    # Test property getter/setter
    service.value = 42
    assert service.value == 42

    # Test read-only property
    service.add_item("test")
    service.add_item("item")
    assert service.item_count == 2

    service.clear_items()
    assert service.item_count == 0


def test_module_level_discovery():
    """Test discovery of module-level functions and classes"""
    engine = DiscoveryEngine(root=".")

    # Discover from __init__.py
    module = engine.discover(Signature(
        name="src",
        exports=["TodoService", "DataService", "AsyncService"],
        type="module"
    ))

    assert hasattr(module, "TodoService")
    assert hasattr(module, "DataService")
    assert hasattr(module, "AsyncService")

    # Verify __all__ exports
    assert "TodoService" in module.__all__
    assert "DataService" in module.__all__


# Pytest fixtures for adaptive testing
@pytest.fixture
def discovery_engine():
    """Fixture providing discovery engine instance"""
    return DiscoveryEngine(root=".")


@pytest.fixture
def adaptive_service(discovery_engine):
    """Fixture that discovers and provides service instance"""
    ServiceClass = discovery_engine.discover(Signature(
        name="DataService",
        methods=["fetch_data"]
    ))
    return ServiceClass()


def test_with_fixtures(adaptive_service):
    """Test using pytest fixtures with adaptive discovery"""
    # adaptive_service is discovered and instantiated by fixture
    result = adaptive_service.fetch_data("fixture-test")
    assert result["key"] == "fixture-test"
    assert "source" in result


# Parametrized tests with discovery
@pytest.mark.parametrize("service_name,method_names", [
    ("TodoService", ["add", "complete", "list"]),
    ("DataService", ["fetch_data", "compute_expensive"]),
    ("PropertyService", ["add_item", "clear_items"])
])
def test_parametrized_discovery(discovery_engine, service_name, method_names):
    """Test multiple services with parametrized tests"""
    ServiceClass = discovery_engine.discover(Signature(
        name=service_name,
        methods=method_names
    ))

    service = ServiceClass()

    # Verify all methods exist
    for method in method_names:
        assert hasattr(service, method)