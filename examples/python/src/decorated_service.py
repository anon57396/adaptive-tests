"""Example service with decorators for testing adaptive discovery"""

import functools
import time
from typing import Any, Callable, Dict, List, Optional


def timing_decorator(func: Callable) -> Callable:
    """Decorator to measure function execution time"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        end = time.time()
        print(f"{func.__name__} took {end - start:.4f} seconds")
        return result
    return wrapper


def cache_decorator(func: Callable) -> Callable:
    """Simple caching decorator"""
    cache = {}

    @functools.wraps(func)
    def wrapper(*args):
        if args in cache:
            print(f"Cache hit for {func.__name__}{args}")
            return cache[args]
        result = func(*args)
        cache[args] = result
        return result
    return wrapper


def validate_input(validator: Callable) -> Callable:
    """Decorator to validate input parameters"""
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            if not validator(*args, **kwargs):
                raise ValueError(f"Invalid input for {func.__name__}")
            return func(*args, **kwargs)
        return wrapper
    return decorator


class DataService:
    """Service class with decorated methods"""

    def __init__(self, data_source: Optional[str] = None):
        self.data_source = data_source or "default"
        self._cache: Dict[str, Any] = {}

    @timing_decorator
    def fetch_data(self, key: str) -> Any:
        """Fetch data with timing measurement"""
        # Simulate data fetching
        time.sleep(0.01)
        return {"key": key, "source": self.data_source}

    @cache_decorator
    def compute_expensive(self, n: int) -> int:
        """Expensive computation with caching"""
        # Simulate expensive computation
        time.sleep(0.1)
        return n * n

    @validate_input(lambda self, items: len(items) > 0)
    def process_items(self, items: List[str]) -> List[str]:
        """Process items with input validation"""
        return [item.upper() for item in items]

    @staticmethod
    @timing_decorator
    def static_helper(value: int) -> int:
        """Static method with decorator"""
        return value * 2

    @classmethod
    @cache_decorator
    def create_from_config(cls, config: Dict[str, Any]) -> 'DataService':
        """Class method with caching"""
        source = config.get("source", "config")
        return cls(data_source=source)


class AsyncService:
    """Service with async methods (for testing discovery)"""

    async def async_fetch(self, url: str) -> str:
        """Async method example"""
        # Simulate async operation
        return f"Data from {url}"

    async def async_process(self, data: str) -> str:
        """Process data asynchronously"""
        return data.upper()


class PropertyService:
    """Service with properties and descriptors"""

    def __init__(self):
        self._value = 0
        self._items = []

    @property
    def value(self) -> int:
        """Property getter"""
        return self._value

    @value.setter
    def value(self, val: int) -> None:
        """Property setter"""
        if val < 0:
            raise ValueError("Value must be non-negative")
        self._value = val

    @property
    def item_count(self) -> int:
        """Read-only property"""
        return len(self._items)

    def add_item(self, item: Any) -> None:
        """Add an item to the collection"""
        self._items.append(item)

    def clear_items(self) -> None:
        """Clear all items"""
        self._items.clear()