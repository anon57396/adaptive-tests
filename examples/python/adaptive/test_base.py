"""Base class for adaptive tests in Python - equivalent to JS adaptiveTest"""

from __future__ import annotations

import unittest
import pytest
from typing import Any, Dict, List, Optional, Type, Callable
from .discovery import DiscoveryEngine, Signature


class AdaptiveTestBase(unittest.TestCase):
    """
    Base class for creating adaptive tests in Python.
    Provides discovery engine integration and helper methods.
    """

    def setUp(self) -> None:
        """Initialize discovery engine and discover target"""
        super().setUp()
        self.discovery_engine = DiscoveryEngine(root=self.get_search_path())

        signature = self.get_target_signature()
        self.target = self.discovery_engine.discover(signature)

        if self.target is None:
            self.fail(f"Could not discover target matching signature: {signature}")

        # Create instance if it's a class
        if isinstance(self.target, type):
            self.target_class = self.target
            self.target_instance = self.target()
        else:
            self.target_class = type(self.target)
            self.target_instance = self.target

    def get_search_path(self) -> str:
        """
        Get the search path for discovery.
        Override this method to customize search location.
        """
        return "."

    def get_target_signature(self) -> Signature:
        """
        Define the signature of the target to discover.
        Must be implemented by subclass.
        """
        raise NotImplementedError("get_target_signature() must be implemented by test class")

    def get_target(self) -> Any:
        """Helper to get the discovered target instance"""
        return self.target_instance

    def get_target_class(self) -> Type:
        """Helper to get the discovered target class"""
        return self.target_class

    def assert_method_exists(self, method_name: str) -> None:
        """Assert that a method exists on the target"""
        self.assertTrue(
            hasattr(self.target_instance, method_name),
            f"Method '{method_name}' does not exist on discovered target"
        )

    def assert_methods_exist(self, method_names: List[str]) -> None:
        """Assert that multiple methods exist on the target"""
        for method in method_names:
            self.assert_method_exists(method)

    def validate_target_structure(self) -> None:
        """Validate that the discovered target matches the expected structure"""
        signature = self.get_target_signature()

        if signature.methods:
            self.assert_methods_exist(signature.methods)

        if hasattr(signature, 'properties'):
            for prop in signature.properties:
                self.assertTrue(
                    hasattr(self.target_instance, prop),
                    f"Property '{prop}' does not exist on discovered target"
                )


class AdaptivePytestBase:
    """
    Base class for pytest-style adaptive tests.
    Use this when you prefer pytest over unittest.
    """

    @pytest.fixture(autouse=True)
    def setup_discovery(self):
        """Setup fixture that runs before each test"""
        self.discovery_engine = DiscoveryEngine(root=self.get_search_path())

        signature = self.get_target_signature()
        self.target = self.discovery_engine.discover(signature)

        if self.target is None:
            pytest.fail(f"Could not discover target matching signature: {signature}")

        # Create instance if it's a class
        if isinstance(self.target, type):
            self.target_class = self.target
            self.target_instance = self.target()
        else:
            self.target_class = type(self.target)
            self.target_instance = self.target

    def get_search_path(self) -> str:
        """Get the search path for discovery"""
        return "."

    def get_target_signature(self) -> Signature:
        """Define the signature of the target to discover"""
        raise NotImplementedError("get_target_signature() must be implemented by test class")

    def get_target(self) -> Any:
        """Helper to get the discovered target instance"""
        return self.target_instance

    def get_target_class(self) -> Type:
        """Helper to get the discovered target class"""
        return self.target_class


def adaptive_test(signature: Signature, search_path: str = ".") -> Callable:
    """
    Decorator for creating adaptive tests - Python equivalent of JS adaptiveTest.

    Usage:
        @adaptive_test(Signature(name="Calculator", methods=["add", "subtract"]))
        def test_calculator(target):
            assert target.add(2, 3) == 5
    """
    def decorator(test_func: Callable) -> Callable:
        def wrapper(*args, **kwargs):
            engine = DiscoveryEngine(root=search_path)
            target = engine.discover(signature)

            if target is None:
                raise AssertionError(f"Could not discover target matching signature: {signature}")

            # Create instance if it's a class
            if isinstance(target, type):
                target_instance = target()
            else:
                target_instance = target

            # Call the test function with the discovered target
            return test_func(target_instance, *args, **kwargs)

        wrapper.__name__ = test_func.__name__
        wrapper.__doc__ = test_func.__doc__
        return wrapper

    return decorator


def adaptive_fixture(signature: Signature, search_path: str = "."):
    """
    Pytest fixture factory for adaptive discovery.

    Usage:
        @pytest.fixture
        def calculator():
            return adaptive_fixture(Signature(name="Calculator"))()
    """
    @pytest.fixture
    def fixture_func():
        engine = DiscoveryEngine(root=search_path)
        target = engine.discover(signature)

        if target is None:
            pytest.fail(f"Could not discover target matching signature: {signature}")

        # Create instance if it's a class
        if isinstance(target, type):
            return target()
        return target

    return fixture_func


class AdaptiveParametrize:
    """
    Helper for creating parametrized adaptive tests.

    Usage:
        @AdaptiveParametrize.services([
            ("TodoService", ["add", "complete"]),
            ("DataService", ["fetch_data"])
        ])
        def test_services(service_instance, service_name, methods):
            for method in methods:
                assert hasattr(service_instance, method)
    """

    @staticmethod
    def services(service_configs: List[tuple]):
        """Create parametrized tests for multiple services"""
        def decorator(test_func: Callable) -> Callable:
            @pytest.mark.parametrize("service_name,methods", service_configs)
            def wrapper(service_name, methods):
                engine = DiscoveryEngine(root=".")
                ServiceClass = engine.discover(Signature(name=service_name, methods=methods))

                if ServiceClass is None:
                    pytest.fail(f"Could not discover {service_name}")

                service_instance = ServiceClass() if isinstance(ServiceClass, type) else ServiceClass
                return test_func(service_instance, service_name, methods)

            wrapper.__name__ = test_func.__name__
            return wrapper
        return decorator


# For backward compatibility with existing tests
class AdaptiveTest:
    """Legacy adaptive test class for backward compatibility"""
    signature: Signature

    def __init__(self) -> None:
        raise NotImplementedError("Use AdaptiveTestBase or adaptive_test decorator instead")

    @classmethod
    def discover(cls) -> Any:
        engine = DiscoveryEngine()
        return engine.discover(cls.signature)