# Multi-Step Research Agent

Single-repo project for the x402-native Multi-Step Research Agent.

## Structure

```text
apps/web   Next.js dashboard and login UI
apps/api   Python FastAPI backend
```

The old `frontend` folder may still exist if a Windows process is locking `.next` or `node_modules`. The active frontend source is now `apps/web`.

## Manual Setup

Frontend:

```powershell
cd "D:\temp\grp proj 3\project-dashboard"
npm install
Copy-Item "apps\web\.env.example" "apps\web\.env.local"
npm run dev:web
```

Backend:

```powershell
cd "D:\temp\grp proj 3\project-dashboard\apps\api"
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
Copy-Item ".env.example" ".env"
uvicorn app.main:app --reload --port 8000
```

URLs:

```text
Web: http://localhost:3000
API: http://localhost:8000/docs
Health: http://localhost:8000/v1/health
```

## Auth

The frontend uses Clerk for `/signin` and `/signup`. The API is prepared for Clerk JWT validation, not Firebase.

For local setup:

1. Create a Clerk app manually in the Clerk dashboard.
2. Add the Clerk keys to `apps/web/.env.local`.
3. Keep `apps/api/.env` with `AUTH_REQUIRED=false` for first local testing, or set Clerk issuer/JWKS values when you want strict backend token validation.

Detailed local steps are in `implementation_guide.md`, which is intentionally gitignored.
