# Production Clerk, Vercel, And Azure Container Apps Setup

Target architecture:

```text
Frontend: Next.js on Vercel
Backend: FastAPI container on Azure Container Apps
Database: Supabase managed PostgreSQL
Auth: Clerk production instance
Secrets: Vercel environment variables and Azure Container Apps secrets
```

## Clerk Production Instance

Manual steps:

1. Open Clerk Dashboard.
2. Switch your application to a production instance or create a production application.
3. Enable only the sign-in methods you want for launch.
4. Configure production URLs after Vercel gives you a domain:

```text
Application home URL: https://your-vercel-domain
Sign-in URL: https://your-vercel-domain/signin
Sign-up URL: https://your-vercel-domain/signup
After sign-in URL: https://your-vercel-domain
After sign-up URL: https://your-vercel-domain
```

5. Copy the production publishable key and secret key.
6. Copy the production issuer/domain for backend JWT validation.
7. Rotate any development secret that was accidentally exposed.

Clerk production keys must use the production instance, not the development instance.

## Vercel Frontend Environment Variables

Set these in Vercel Project Settings > Environment Variables:

```env
NEXT_PUBLIC_API_URL=https://your-azure-container-app-url
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=replace-with-production-publishable-key
CLERK_SECRET_KEY=replace-with-production-secret-key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/signin
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/
```

Recommended Vercel project settings:

```text
Root directory: apps/web
Framework preset: Next.js
Build command: npm run build
Output directory: .next
Install command: npm install
```

If Vercel deploys from the monorepo root instead, use:

```text
Build command: npm run build:web
```

## Azure Container Apps Backend Environment Variables

The API container listens on port:

```text
8000
```

Configure Azure Container Apps ingress:

```text
Ingress: external
Target port: 8000
Transport: auto/http
```

Set non-secret environment variables:

```env
APP_NAME=Research Agent Backend
ENVIRONMENT=production
API_PREFIX=/v1
FRONTEND_ORIGIN=https://your-vercel-domain
AUTH_REQUIRED=true
CLERK_ISSUER=https://your-production-clerk-domain
CLERK_JWKS_URL=https://your-production-clerk-domain/.well-known/jwks.json
CLERK_AUDIENCE=
STORAGE_BACKEND=postgres
AUTO_CREATE_DATABASE_SCHEMA=false
OBJECT_STORAGE_BUCKET=
SUPPORTED_PAYMENT_ASSETS=USDC
SUPPORTED_PAYMENT_NETWORKS=base-sepolia,base
MAX_PAYMENT_PIN_ATTEMPTS=5
PAYMENT_PIN_LOCK_SECONDS=900
LOG_LEVEL=INFO
JOB_QUEUE_BACKEND=upstash
RESEARCH_JOB_QUEUE_NAME=research:jobs
WORKER_POLL_SECONDS=2
```

Store these as Azure Container Apps secrets and reference them from environment variables:

```text
DATABASE_URL
MIGRATIONS_DATABASE_URL
HMAC_SECRET
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
future provider API keys
future x402/wallet/payment secrets
```

Deploy the research worker as a second Azure Container App:

```text
Image: API worker image
Ingress: disabled
Command: python -m app.workers.research_worker
Secrets/env: same database, Upstash, Clerk, and HMAC settings
```

Do not put these secrets in the Docker image.

## Backend Production Guardrails

When `ENVIRONMENT=production`, the API now refuses to start if:

```text
AUTH_REQUIRED is false
FRONTEND_ORIGIN is not https
AUTO_CREATE_DATABASE_SCHEMA is true
STORAGE_BACKEND is not postgres
DATABASE_URL points to localhost or Docker Compose db
HMAC_SECRET is still the local placeholder or too short
Clerk issuer/JWKS settings are missing
```

## Smoke Test Order

After deploying:

```text
1. Open https://your-api-domain/v1/health
2. Open the Vercel frontend
3. Sign in through Clerk
4. Confirm the dashboard loads without auth redirects
5. Create a research run
6. Confirm the job survives an API restart
```

## Files To Keep Local Only

Never commit:

```text
apps/web/.env.local
apps/api/.env
real Supabase URLs
real Clerk secret keys
real HMAC secrets
```
