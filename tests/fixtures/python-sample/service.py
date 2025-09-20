from dataclasses import dataclass


@dataclass
class Settings:
    name: str


class OrderService(Settings):
    def create_order(self, customer_id):
        return True


def calculate_total():
    return 42


async def load_order():
    return {}
