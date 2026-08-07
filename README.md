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
cd "D:\multi-step-research\research-agent"
npm install
Copy-Item "apps\web\.env.example" "apps\web\.env.local"
npm run dev:web
```

Backend:

```powershell
cd "D:\multi-step-research\research-agent"
npm run setup:api
Copy-Item "apps\api\.env.example" "apps\api\.env"
npm run dev:api
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

## Product direction

The research workspace now supports Quick/Deep/Compare modes, enforceable source policies, evidence-quality scoring, suggested follow-ups, and feedback-driven immutable report revisions. See [the feature research](docs/product-feature-research.md) for the product thesis, integrated capabilities, and prioritized roadmap.

## Production deployment

Use the production runbook in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). It covers the complete Azure Container Apps stack: public web app, internal API, worker, ACR, managed image pulls, fixed outbound IP, MongoDB Atlas, production credentials, health checks, and the x402 rollout sequence.
