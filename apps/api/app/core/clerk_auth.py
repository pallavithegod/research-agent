from dataclasses import dataclass
from time import time
from typing import Any

import httpx
import jwt
from fastapi import Depends, Header, HTTPException, status
from jwt import PyJWKClient

from app.core.config import Settings, get_settings


@dataclass(frozen=True)
class AuthContext:
    user_id: str
    org_id: str
    roles: tuple[str, ...]
    claims: dict[str, Any]
    is_mock: bool = False


class ClerkVerifier:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._client: PyJWKClient | None = None

    def verify(self, token: str) -> AuthContext:
        jwks_url = self.settings.resolved_jwks_url
        if not jwks_url or not self.settings.clerk_issuer:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Clerk is not configured")

        if self._client is None:
            self._client = PyJWKClient(jwks_url)

        try:
            signing_key = self._client.get_signing_key_from_jwt(token)
            decode_options = {"verify_aud": bool(self.settings.clerk_audience)}
            claims = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=self.settings.clerk_audience or None,
                issuer=self.settings.clerk_issuer,
                options=decode_options,
            )
        except jwt.PyJWTError as exc:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Clerk token") from exc

        user_id = str(claims.get("sub") or "")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Clerk token missing subject")

        org_id = str(claims.get("org_id") or claims.get("org") or user_id)
        roles = claims.get("roles") or claims.get("org_role") or []
        if isinstance(roles, str):
            roles = [roles]
        return AuthContext(user_id=user_id, org_id=org_id, roles=tuple(roles), claims=claims)


def get_auth_context(
    authorization: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> AuthContext:
    if not authorization or not authorization.lower().startswith("bearer "):
        if settings.auth_required:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")
        return AuthContext(
            user_id="local_user",
            org_id="local_org",
            roles=("owner",),
            claims={"sub": "local_user", "org_id": "local_org", "iat": int(time())},
            is_mock=True,
        )
    token = authorization.split(" ", 1)[1].strip()
    return ClerkVerifier(settings).verify(token)

