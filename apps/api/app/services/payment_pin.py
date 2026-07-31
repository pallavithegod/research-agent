from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import HTTPException, status

from app.storage.memory import store


class PaymentPinService:
    def __init__(self) -> None:
        self.hasher = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=2)

    def set_pin(self, org_id: str, user_id: str, pin: str) -> None:
        store.pin_hashes[f"{org_id}:{user_id}"] = self.hasher.hash(pin)
        store.pin_failures[f"{org_id}:{user_id}"] = 0

    def verify_pin(self, org_id: str, user_id: str, pin: str) -> bool:
        key = f"{org_id}:{user_id}"
        hashed = store.pin_hashes.get(key)
        if not hashed:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment PIN is not configured")
        try:
            valid = self.hasher.verify(hashed, pin)
        except VerifyMismatchError as exc:
            store.pin_failures[key] += 1
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Payment PIN") from exc
        if valid:
            store.pin_failures[key] = 0
        return valid


payment_pin_service = PaymentPinService()

