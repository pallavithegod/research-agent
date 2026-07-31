from fastapi import APIRouter, Depends

from app.api.deps import current_auth
from app.core.clerk_auth import AuthContext

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me")
def me(auth: AuthContext = Depends(current_auth)) -> dict:
    return {
        "user": {
            "id": auth.user_id,
            "org_id": auth.org_id,
            "roles": list(auth.roles),
            "is_mock": auth.is_mock,
        }
    }

