"""Python AST test fixtures for decorator patterns"""

import functools
import asyncio
from typing import Any, Callable, TypeVar, Optional
from dataclasses import dataclass
from abc import ABC, abstractmethod

# Simple decorator
def simple_decorator(func: Callable) -> Callable:
    """Basic decorator without parameters"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print(f"Before {func.__name__}")
        result = func(*args, **kwargs)
        print(f"After {func.__name__}")
        return result
    return wrapper


# Parameterized decorator
def repeat(times: int = 2):
    """Decorator with parameters"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            results = []
            for _ in range(times):
                results.append(func(*args, **kwargs))
            return results
        return wrapper
    return decorator


# Class decorator
def singleton(cls):
    """Class decorator for singleton pattern"""
    instances = {}
    def get_instance(*args, **kwargs):
        if cls not in instances:
            instances[cls] = cls(*args, **kwargs)
        return instances[cls]
    return get_instance


# Property decorator example
class PropertyExample:
    def __init__(self, value: int = 0):
        self._value = value

    @property
    def value(self) -> int:
        """Getter with property decorator"""
        return self._value

    @value.setter
    def value(self, val: int) -> None:
        """Setter with property decorator"""
        if val < 0:
            raise ValueError("Value must be non-negative")
        self._value = val

    @value.deleter
    def value(self) -> None:
        """Deleter with property decorator"""
        del self._value


# Multiple decorators (stacked)
@dataclass
@singleton
class Configuration:
    """Class with multiple decorators"""
    host: str = "localhost"
    port: int = 8080
    debug: bool = False


# Async decorator
def async_timer(func: Callable) -> Callable:
    """Decorator for async functions"""
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        import time
        start = time.time()
        result = await func(*args, **kwargs)
        end = time.time()
        print(f"{func.__name__} took {end - start:.4f} seconds")
        return result
    return wrapper


# Method decorators
class ServiceClass:
    """Class demonstrating various method decorators"""

    @simple_decorator
    def regular_method(self, x: int) -> int:
        """Regular method with decorator"""
        return x * 2

    @staticmethod
    @simple_decorator
    def static_method(x: int) -> int:
        """Static method with decorator"""
        return x * 3

    @classmethod
    @simple_decorator
    def class_method(cls, x: int) -> int:
        """Class method with decorator"""
        return x * 4

    @async_timer
    async def async_method(self, x: int) -> int:
        """Async method with decorator"""
        await asyncio.sleep(0.1)
        return x * 5


# Generic decorator with type hints
T = TypeVar('T')

def typed_decorator(func: Callable[..., T]) -> Callable[..., T]:
    """Decorator preserving type hints"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs) -> T:
        return func(*args, **kwargs)
    return wrapper


# Context manager decorator
class ContextDecorator:
    """Decorator that can be used as context manager"""

    def __init__(self, func: Optional[Callable] = None):
        self.func = func

    def __enter__(self):
        print("Entering context")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        print("Exiting context")

    def __call__(self, *args, **kwargs):
        if self.func:
            with self:
                return self.func(*args, **kwargs)


# Abstract method decorator
class AbstractService(ABC):
    """Abstract class with decorated methods"""

    @abstractmethod
    def process(self, data: Any) -> Any:
        """Abstract method to be implemented"""
        pass

    @abstractmethod
    @async_timer
    async def async_process(self, data: Any) -> Any:
        """Async abstract method"""
        pass


# Custom descriptor decorator
class ValidatedProperty:
    """Custom descriptor for property validation"""

    def __init__(self, validator: Callable[[Any], bool]):
        self.validator = validator
        self.name = None

    def __set_name__(self, owner, name):
        self.name = f'_{name}'

    def __get__(self, instance, owner):
        if instance is None:
            return self
        return getattr(instance, self.name)

    def __set__(self, instance, value):
        if not self.validator(value):
            raise ValueError(f"Invalid value for {self.name}")
        setattr(instance, self.name, value)


class ValidatedClass:
    """Class using custom descriptor"""

    age = ValidatedProperty(lambda x: 0 <= x <= 150)
    name = ValidatedProperty(lambda x: isinstance(x, str) and len(x) > 0)

    def __init__(self, name: str, age: int):
        self.name = name
        self.age = age