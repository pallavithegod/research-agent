from fastapi import Depends, HTTPException, status

from app.core.clerk_auth import AuthContext, get_auth_context
from app.domain.schemas import ResearchJob
from app.storage.memory import store


def current_auth(auth: AuthContext = Depends(get_auth_context)) -> AuthContext:
    return auth


def get_job_for_org(job_id: str, auth: AuthContext) -> ResearchJob:
    job = store.jobs.get(job_id)
    if not job or job.org_id != auth.org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return job

