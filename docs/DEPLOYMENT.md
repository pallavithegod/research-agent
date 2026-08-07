# Production deployment

The supported whole-Azure production shape is:

- Public Next.js web app on Azure Container Apps.
- Internal-only FastAPI API and a separate research worker on Azure Container Apps.
- Azure Container Registry with managed-identity image pulls.
- A VNet and NAT Gateway with one static outbound IP for the MongoDB Atlas allowlist.
- MongoDB Atlas for durable jobs, reports, evidence, decisions, and payment records. PostgreSQL remains supported.
- Upstash Redis for the worker queue.
- Tavily for live web retrieval and DeepSeek for grounded synthesis.
- Clerk for authentication. Anonymous production is available only as an explicit demo-mode opt-in.

## 1. Required credentials

Create production credentials rather than reusing local or test keys.

| Setting | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Fixed | `/api/backend`; the web server proxies to the internal API |
| `DEEPSEEK_API_KEY` | Yes | Product extraction and grounded answer synthesis |
| `TAVILY_API_KEY` | Yes, unless Brave is configured | Live search and page retrieval |
| `MONGODB_URI` | Yes when using MongoDB | Atlas URI stored only in the deployment secret manager |
| `MONGODB_DATABASE` | Yes when using MongoDB | Database name, normally `research_agent` |
| `DATABASE_URL` | PostgreSQL only | Pooled PostgreSQL runtime connection |
| `MIGRATIONS_DATABASE_URL` | PostgreSQL only | Direct PostgreSQL connection used by Alembic |
| `HMAC_SECRET` | Yes | At least 32 random characters for signed payment/security state |
| `UPSTASH_REDIS_REST_URL` | Yes for queued production | Research queue endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Yes for queued production | Research queue credential |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes when auth is enabled | Clerk browser key |
| `CLERK_ISSUER` / `CLERK_JWKS_URL` | Yes when auth is enabled | API JWT verification |
| `CLERK_SECRET_KEY` | Vercel only when required by Clerk | Clerk server integration |
| `AZURE_BLOB_CONNECTION_STRING` | Optional | Durable browser artifacts |
| `X402_COMMERCE_ENDPOINT` | Required when x402 is enabled | HTTPS commerce provider |
| `X402_PROVIDER_ALLOWLIST` | Required when x402 is enabled | Comma-separated approved provider hosts |

Generate the HMAC secret in PowerShell:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Never commit populated environment files. Rotate any test credentials that have previously been pasted into chat, logs, or source control.

## 2. Verify locally

From the repository root:

```powershell
npm ci
python -m pip install -r apps/api/requirements-dev.txt
npm run predeploy
```

## 3. Deploy the whole stack to Azure

Prerequisites:

- Azure CLI 2.60 or newer and Node.js 20.
- `Owner` or `User Access Administrator` plus `Contributor` on the target resource group, because the template creates an ACR pull role assignment.
- A globally unique, alphanumeric ACR name.
- An Atlas database user and a real URL-encoded password; the URI shown below is only a template.

Sign in and select the correct subscription:

```powershell
az login
az account set --subscription YOUR_SUBSCRIPTION_ID
```

Export secrets only in the current shell. The deployment script does not write them into the repository:

```powershell
$env:MONGODB_URI='mongodb://garvit:URL_ENCODED_PASSWORD@learning-shard-00-00.3u2np.mongodb.net:27017,learning-shard-00-01.3u2np.mongodb.net:27017,learning-shard-00-02.3u2np.mongodb.net:27017/?ssl=true&replicaSet=atlas-ne7nol-shard-0&authSource=admin&appName=Learning'
$env:MONGODB_DATABASE='research_agent'
$env:DEEPSEEK_API_KEY='...'
$env:TAVILY_API_KEY='...'
$env:HMAC_SECRET='at-least-32-random-characters'
$env:UPSTASH_REDIS_REST_URL='...'
$env:UPSTASH_REDIS_REST_TOKEN='...'
```

Deploy everything:

```powershell
.\scripts\deploy_azure.ps1 `
  -ResourceGroup research-agent-prod-rg `
  -RegistryName YOUR_GLOBALLY_UNIQUE_ACR_NAME `
  -Location centralindia
```

The command:

1. Registers the required Azure resource providers.
2. Creates the resource group and ACR when needed.
3. Reserves the static Azure egress IP and pauses for the Atlas `IP/32` allowlist entry.
4. Runs the full predeployment gate.
5. Builds the API and web images remotely in ACR.
6. Deploys the VNet, NAT Gateway, Log Analytics, Container Apps environment, internal API, worker, and public web app.
7. Prints the final web URL and Atlas allowlist IP.

Add `-EnableAuth` only after exporting the Clerk variables. Add `-EnableX402` only after exporting the commerce endpoint and allowlist. `-SkipAtlasPause` is intended for CI after the IP is already allowed.

## 4. Manual container builds

Replace the image registry and public URLs before running these commands.

```powershell
docker build -f apps/api/Dockerfile -t REGISTRY/research-agent-api:TAG apps/api

docker build -f apps/web/Dockerfile -t REGISTRY/research-agent-web:TAG `
  --build-arg NEXT_PUBLIC_API_URL=/api/backend `
  --build-arg NEXT_PUBLIC_AUTH_ENABLED=true `
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_REPLACE_ME `
  .

docker push REGISTRY/research-agent-api:TAG
docker push REGISTRY/research-agent-web:TAG
```

The API and worker use the same image. The worker command is:

```text
python -m app.workers.research_worker
```

## 5. Configure MongoDB Atlas

1. Create a dedicated Atlas database user with read/write access only to `research_agent`.
2. URL-encode the username and password before placing them in `MONGODB_URI`.
3. Add the outbound IP addresses of the API and worker under Atlas **Network Access**. Avoid `0.0.0.0/0` in production.
4. Set `STORAGE_BACKEND=mongodb`, `MONGODB_URI`, and `MONGODB_DATABASE=research_agent` on both API and worker.
5. Store the URI in the cloud secret manager, never in a committed parameter file.

MongoDB creates its collections and indexes when the service starts, so it does not use Alembic migrations.

After setting `MONGODB_URI` in the current shell, verify Atlas without printing the URI:

```powershell
npm run check:mongodb
```

## 6. PostgreSQL migrations (legacy PostgreSQL deployments only)

Skip this section when using MongoDB. Run Alembic once before sending traffic to a new PostgreSQL API revision:

```powershell
docker run --rm `
  -e MIGRATIONS_DATABASE_URL="YOUR_DIRECT_POSTGRES_URL" `
  REGISTRY/research-agent-api:TAG `
  alembic upgrade head
```

Do not enable `AUTO_CREATE_DATABASE_SCHEMA` in production.

## 7. Manual Bicep deployment

Copy the parameter template without committing the populated copy:

```powershell
Copy-Item infra/azure/main.parameters.example.json infra/azure/main.parameters.local.json
```

Fill `main.parameters.local.json`, then validate and deploy:

```powershell
az bicep build --file infra/azure/main.bicep
az deployment group what-if `
  --resource-group YOUR_RESOURCE_GROUP `
  --template-file infra/azure/main.bicep `
  --parameters infra/azure/main.parameters.local.json
az deployment group create `
  --resource-group YOUR_RESOURCE_GROUP `
  --template-file infra/azure/main.bicep `
  --parameters infra/azure/main.parameters.local.json
```

The template creates web, API, and worker Container Apps. The API is internal-only; the public web app proxies `/api/backend/*` to it. It also creates the VNet, NAT Gateway, fixed outbound IP, managed identity, monitoring, probes, and secret references.

## 8. Authentication modes

Recommended production configuration:

```text
NEXT_PUBLIC_AUTH_ENABLED=true
AUTH_REQUIRED=true
ALLOW_ANONYMOUS_PRODUCTION=false
```

For a temporary public prototype only:

```text
NEXT_PUBLIC_AUTH_ENABLED=false
AUTH_REQUIRED=false
ALLOW_ANONYMOUS_PRODUCTION=true
```

Anonymous mode assigns all visitors to one local organization and must not be used for private data or real payments.

## 9. x402 rollout

Keep `X402_ENABLED=false` for the first deployment. Enable it only after the commerce endpoint, hostname allowlist, wallet confirmation flow, and production spending policy have been tested on Base Sepolia.

Selection and research do not initiate payment. The API creates an x402 request only after the user chooses **Yes, buy**, and returned payment terms still require wallet confirmation.

## 10. Post-deployment checks

```powershell
Invoke-RestMethod https://YOUR_WEB_FQDN/api/backend/v1/health/live
Invoke-RestMethod https://YOUR_WEB_FQDN/api/backend/v1/health/ready
```

Then verify:

1. A product prompt produces real product cards.
2. Sources contain live URLs while the main answer contains no URLs.
3. Selecting a product creates a new chat turn, shows Thinking, and returns specifications.
4. Reloading restores the job from MongoDB Atlas or the configured PostgreSQL database.
5. The worker consumes queued jobs from Upstash.
6. Choosing **No** creates no commerce request.
7. Choosing **Yes, buy** produces only the expected x402 confirmation or merchant handoff.

Deploy the API before the frontend when adding backward-compatible endpoints. For breaking API changes, deploy compatibility first, then the frontend, then remove the old contract in a later release.
