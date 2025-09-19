class CustomerService:
    """Simple service for demonstration purposes."""

    def __init__(self) -> None:
        self._customers = ["Ada", "Grace"]

    def find_all(self) -> list[str]:
        return list(self._customers)

    def add_customer(self, name: str) -> None:
        self._customers.append(name)


def helper() -> bool:
    return True
