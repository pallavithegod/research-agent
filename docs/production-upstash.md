# Upstash Redis Production Setup

Use Upstash Redis for future queue-backed research workers.

The current API still runs mock research synchronously. This setup prepares the production queue configuration so the worker step can be added cleanly later.

## Manual Upstash Steps

1. Create an Upstash account.
2. Create a Redis database.
3. Choose a region close to Azure Container Apps.
4. Open the database details page.
5. Copy:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Upstash's Python SDK uses these two values to connect to Redis over REST.

## Azure Container Apps Secrets

Store these as Azure Container Apps secrets:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

Then expose them to the API container as environment variables.

## API Queue Environment

Production:

```env
JOB_QUEUE_BACKEND=upstash
RESEARCH_JOB_QUEUE_NAME=research:jobs
UPSTASH_REDIS_REST_URL=replace-with-upstash-redis-rest-url
UPSTASH_REDIS_REST_TOKEN=replace-with-upstash-redis-rest-token
```

Local Docker can remain synchronous for now:

```env
JOB_QUEUE_BACKEND=sync
```

## Worker Plan

The next backend phase should:

```text
create a separate worker container
poll Upstash Redis for research jobs
run the durable orchestration graph
persist every state transition to PostgreSQL
emit events for the dashboard SSE endpoint
make provider calls idempotent
support cancellation before paid or irreversible steps
```

## Current Code Hooks

Queue helpers live in:

```text
apps/api/app/services/job_queue.py
apps/api/app/workers/research_worker.py
```

The current dashboard flow is not yet changed to use the queue.
