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

The API is prepared for Clerk, not Firebase. Local mock auth is enabled while `AUTH_REQUIRED=false`.
