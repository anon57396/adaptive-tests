"""Python AST test fixtures for metaclasses and advanced patterns"""

from typing import Any, Dict, Type
import inspect

# Simple metaclass
class SingletonMeta(type):
    """Metaclass for singleton pattern"""
    _instances: Dict[Type, Any] = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super().__call__(*args, **kwargs)
        return cls._instances[cls]


class SingletonService(metaclass=SingletonMeta):
    """Class using singleton metaclass"""
    def __init__(self, name: str = "default"):
        self.name = name


# Metaclass with attribute validation
class ValidatedMeta(type):
    """Metaclass that validates class attributes"""
    def __new__(mcs, name, bases, namespace):
        # Validate required attributes
        if 'required_attr' not in namespace:
            raise TypeError(f"Class {name} must define 'required_attr'")

        # Add automatic properties
        namespace['_created_by_meta'] = True

        return super().__new__(mcs, name, bases, namespace)


class ValidatedClass(metaclass=ValidatedMeta):
    """Class with validated attributes"""
    required_attr = "present"

    def method(self):
        return self.required_attr


# Metaclass modifying methods
class TracedMeta(type):
    """Metaclass that adds tracing to all methods"""
    def __new__(mcs, name, bases, namespace):
        # Wrap all methods with tracing
        for key, value in namespace.items():
            if callable(value) and not key.startswith('_'):
                namespace[key] = mcs.trace_method(value)

        return super().__new__(mcs, name, bases, namespace)

    @staticmethod
    def trace_method(method):
        def wrapper(*args, **kwargs):
            print(f"Calling {method.__name__}")
            result = method(*args, **kwargs)
            print(f"Finished {method.__name__}")
            return result
        wrapper.__name__ = method.__name__
        wrapper.__doc__ = method.__doc__
        return wrapper


class TracedService(metaclass=TracedMeta):
    """Service with automatic method tracing"""
    def process(self, data):
        return f"Processing {data}"

    def validate(self, data):
        return data is not None


# Abstract metaclass pattern
class InterfaceMeta(type):
    """Metaclass for interface-like classes"""
    def __new__(mcs, name, bases, namespace):
        # Check if this is the interface itself
        if name != 'Interface' and bases:
            # Verify all abstract methods are implemented
            for base in bases:
                if hasattr(base, '_abstract_methods'):
                    for method_name in base._abstract_methods:
                        if method_name not in namespace:
                            raise TypeError(
                                f"Class {name} must implement {method_name}"
                            )

        # Mark abstract methods
        abstract_methods = []
        for key, value in namespace.items():
            if getattr(value, '_is_abstract', False):
                abstract_methods.append(key)
        namespace['_abstract_methods'] = abstract_methods

        return super().__new__(mcs, name, bases, namespace)


def abstract_method(func):
    """Decorator to mark abstract methods"""
    func._is_abstract = True
    return func


class Interface(metaclass=InterfaceMeta):
    """Interface base class"""
    @abstract_method
    def required_method(self):
        pass


# Dynamic class creation with metaclass
class DynamicMeta(type):
    """Metaclass for dynamic class creation"""
    def __new__(mcs, name, bases, namespace, **kwargs):
        # Add dynamic attributes from kwargs
        for key, value in kwargs.items():
            namespace[key] = value

        # Generate properties dynamically
        if 'fields' in namespace:
            for field in namespace['fields']:
                mcs.create_property(namespace, field)

        return super().__new__(mcs, name, bases, namespace)

    @staticmethod
    def create_property(namespace, field_name):
        """Create a property dynamically"""
        private_name = f'_{field_name}'

        def getter(self):
            return getattr(self, private_name, None)

        def setter(self, value):
            setattr(self, private_name, value)

        namespace[field_name] = property(getter, setter)


class DynamicModel(metaclass=DynamicMeta, version="1.0"):
    """Model with dynamic properties"""
    fields = ['name', 'value', 'status']

    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            if key in self.fields:
                setattr(self, key, value)


# Metaclass with __prepare__
class OrderedMeta(type):
    """Metaclass that preserves attribute definition order"""
    @classmethod
    def __prepare__(mcs, name, bases):
        # Return an OrderedDict to preserve order
        from collections import OrderedDict
        return OrderedDict()

    def __new__(mcs, name, bases, namespace):
        # Store the order of attributes
        namespace['_field_order'] = list(namespace.keys())
        return super().__new__(mcs, name, bases, namespace)


class OrderedClass(metaclass=OrderedMeta):
    """Class with ordered attributes"""
    first = 1
    second = 2
    third = 3

    def get_order(self):
        return self._field_order


# Metaclass inheritance
class BaseMeta(type):
    """Base metaclass"""
    def __new__(mcs, name, bases, namespace):
        namespace['_base_meta'] = True
        return super().__new__(mcs, name, bases, namespace)


class ExtendedMeta(BaseMeta):
    """Extended metaclass"""
    def __new__(mcs, name, bases, namespace):
        namespace['_extended_meta'] = True
        return super().__new__(mcs, name, bases, namespace)


class ComplexClass(metaclass=ExtendedMeta):
    """Class using inherited metaclass"""
    def check_meta(self):
        return hasattr(self, '_base_meta') and hasattr(self, '_extended_meta')


# __init_subclass__ alternative to metaclass
class PluginBase:
    """Base class using __init_subclass__ instead of metaclass"""
    plugins = []

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        cls.plugins.append(cls)

        # Add automatic registration
        if 'plugin_name' in kwargs:
            cls.plugin_name = kwargs['plugin_name']


class ConcretePlugin(PluginBase, plugin_name="concrete"):
    """Plugin registered automatically"""
    def execute(self):
        return "Concrete plugin execution"