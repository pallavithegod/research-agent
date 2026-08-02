# Vercel And Azure Container Apps Deployment

This project is intended to deploy as:

```text
Frontend: Vercel
API: Azure Container Apps
Worker: Azure Container Apps
Database: Supabase PostgreSQL
Queue: Upstash Redis
Auth: Clerk production instance
```

## Vercel Frontend

Create a Vercel project for:

```text
apps/web
```

Recommended settings:

```text
Framework Preset: Next.js
Root Directory: apps/web
Install Command: npm install
Build Command: npm run build
Output Directory: .next
```

Set production environment variables from:

```text
apps/web/production.env.example
```

After Azure deploys the API, set:

```env
NEXT_PUBLIC_API_URL=https://your-azure-container-app-url
```

Then redeploy the Vercel project.

## Build Production Images

From the repo root:

```powershell
docker build -f apps/api/Dockerfile -t research-agent-api:prod apps/api
docker build -f apps/api/Dockerfile.worker -t research-agent-worker:prod apps/api
```

Push these images to your chosen registry, such as Azure Container Registry or GitHub Container Registry.

## Azure Container Apps

Install Azure CLI first:

```text
docs/azure-cli-setup.md
```

The Bicep template is:

```text
infra/azure/main.bicep
```

Copy the example parameters file to a local ignored file:

```powershell
Copy-Item "infra\azure\main.parameters.example.json" "infra\azure\main.parameters.local.json"
```

Put real image names and secret values only in `main.parameters.local.json`.

Preflight check:

```powershell
.\scripts\check_azure_deploy.ps1
```

With resource group validation:

```powershell
.\scripts\check_azure_deploy.ps1 -ResourceGroup YOUR_RESOURCE_GROUP
```

Deploy shape:

```text
API container app:
  external ingress enabled
  target port 8000

Worker container app:
  ingress disabled
  runs python -m app.workers.research_worker
```

Run deployment later with Azure CLI:

```powershell
az deployment group create `
  --resource-group YOUR_RESOURCE_GROUP `
  --template-file infra/azure/main.bicep `
  --parameters infra/azure/main.parameters.local.json
```

## Post Deploy

1. Copy the `apiUrl` output from Azure.
2. Put it into Vercel as `NEXT_PUBLIC_API_URL`.
3. Configure Clerk production URLs using the Vercel domain.
4. Run Alembic migrations against Supabase when ready.
5. Run smoke tests:

```powershell
python scripts\smoke_test.py --api-url https://your-azure-container-app-url --token "YOUR_CLERK_SESSION_TOKEN"
```

## Do Not Commit

Never commit:

```text
infra/azure/main.parameters.local.json
real container registry passwords
real Supabase URLs
real Upstash tokens
real Azure Storage connection strings
real Clerk secrets
real HMAC secrets
```
