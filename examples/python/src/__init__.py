"""Python source package for adaptive testing examples"""

from .todo_service import TodoService, Todo
from .decorated_service import DataService, AsyncService, PropertyService

__all__ = [
    'TodoService',
    'Todo',
    'DataService',
    'AsyncService',
    'PropertyService'
]

# Package metadata
__version__ = '1.0.0'
__author__ = 'Adaptive Tests'