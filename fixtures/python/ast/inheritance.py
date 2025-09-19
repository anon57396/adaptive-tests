"""Python AST test fixtures for inheritance patterns"""

from abc import ABC, abstractmethod
from typing import List, Optional, Generic, TypeVar
from dataclasses import dataclass
from enum import Enum

# Simple inheritance
class Animal:
    """Base class"""
    def __init__(self, name: str):
        self.name = name

    def speak(self) -> str:
        return f"{self.name} makes a sound"

    def move(self) -> str:
        return f"{self.name} moves"


class Dog(Animal):
    """Single inheritance"""
    def __init__(self, name: str, breed: str):
        super().__init__(name)
        self.breed = breed

    def speak(self) -> str:
        """Method override"""
        return f"{self.name} barks"

    def fetch(self) -> str:
        """New method"""
        return f"{self.name} fetches the ball"


class Cat(Animal):
    """Another derived class"""
    def __init__(self, name: str, indoor: bool = True):
        super().__init__(name)
        self.indoor = indoor

    def speak(self) -> str:
        return f"{self.name} meows"

    def purr(self) -> str:
        return f"{self.name} purrs"


# Multiple inheritance
class Flyable:
    """Mixin for flying capability"""
    def fly(self) -> str:
        return "Flying through the air"


class Swimmable:
    """Mixin for swimming capability"""
    def swim(self) -> str:
        return "Swimming in water"


class Duck(Animal, Flyable, Swimmable):
    """Multiple inheritance example"""
    def __init__(self, name: str):
        super().__init__(name)

    def speak(self) -> str:
        return f"{self.name} quacks"


# Abstract base class
class Shape(ABC):
    """Abstract base class"""

    @abstractmethod
    def area(self) -> float:
        """Calculate area"""
        pass

    @abstractmethod
    def perimeter(self) -> float:
        """Calculate perimeter"""
        pass

    def describe(self) -> str:
        """Concrete method in abstract class"""
        return f"Shape with area {self.area()} and perimeter {self.perimeter()}"


class Rectangle(Shape):
    """Concrete implementation"""
    def __init__(self, width: float, height: float):
        self.width = width
        self.height = height

    def area(self) -> float:
        return self.width * self.height

    def perimeter(self) -> float:
        return 2 * (self.width + self.height)


class Circle(Shape):
    """Another concrete implementation"""
    def __init__(self, radius: float):
        self.radius = radius

    def area(self) -> float:
        import math
        return math.pi * self.radius ** 2

    def perimeter(self) -> float:
        import math
        return 2 * math.pi * self.radius


# Generic inheritance
T = TypeVar('T')

class Container(Generic[T]):
    """Generic container base class"""
    def __init__(self):
        self._items: List[T] = []

    def add(self, item: T) -> None:
        self._items.append(item)

    def get_all(self) -> List[T]:
        return self._items.copy()


class Stack(Container[T]):
    """Stack inheriting from generic container"""
    def push(self, item: T) -> None:
        self.add(item)

    def pop(self) -> Optional[T]:
        if self._items:
            return self._items.pop()
        return None

    def peek(self) -> Optional[T]:
        if self._items:
            return self._items[-1]
        return None


# Dataclass inheritance
@dataclass
class Person:
    """Base dataclass"""
    name: str
    age: int

    def greet(self) -> str:
        return f"Hello, I'm {self.name}"


@dataclass
class Employee(Person):
    """Dataclass inheritance"""
    employee_id: str
    department: str

    def work(self) -> str:
        return f"{self.name} is working in {self.department}"


# Enum with inheritance
class Status(Enum):
    """Base enum"""
    PENDING = "pending"
    ACTIVE = "active"
    INACTIVE = "inactive"


class ExtendedStatus(Status):
    """Extended enum (not true inheritance but composition)"""
    ARCHIVED = "archived"
    DELETED = "deleted"


# Complex inheritance hierarchy
class Vehicle:
    """Root of vehicle hierarchy"""
    def __init__(self, brand: str, model: str):
        self.brand = brand
        self.model = model

    def start(self) -> str:
        return f"{self.brand} {self.model} starting"


class LandVehicle(Vehicle):
    """Land vehicle base"""
    def __init__(self, brand: str, model: str, wheels: int):
        super().__init__(brand, model)
        self.wheels = wheels

    def drive(self) -> str:
        return f"Driving on {self.wheels} wheels"


class WaterVehicle(Vehicle):
    """Water vehicle base"""
    def __init__(self, brand: str, model: str, displacement: float):
        super().__init__(brand, model)
        self.displacement = displacement

    def sail(self) -> str:
        return f"Sailing with {self.displacement} tons displacement"


class AmphibiousVehicle(LandVehicle, WaterVehicle):
    """Diamond inheritance problem example"""
    def __init__(self, brand: str, model: str, wheels: int, displacement: float):
        # Careful with super() in diamond inheritance
        Vehicle.__init__(self, brand, model)
        self.wheels = wheels
        self.displacement = displacement

    def transform(self) -> str:
        return "Transforming between land and water mode"


# Method Resolution Order (MRO) example
class A:
    def method(self):
        return "A"


class B(A):
    def method(self):
        return "B"


class C(A):
    def method(self):
        return "C"


class D(B, C):
    """MRO: D -> B -> C -> A"""
    pass


# Super() with __init_subclass__
class RegisteredClass:
    """Base class that tracks subclasses"""
    _registry = []

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        RegisteredClass._registry.append(cls)

    @classmethod
    def get_subclasses(cls):
        return cls._registry


class RegisteredChild1(RegisteredClass):
    pass


class RegisteredChild2(RegisteredClass):
    pass