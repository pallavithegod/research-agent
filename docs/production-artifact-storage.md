# Production Artifact Storage

Use Azure Blob Storage for generated reports, screenshots, browser artifacts, transcripts, and large raw evidence files.

The current product does not yet upload artifacts by default. This setup prepares the backend service and production configuration.

## Manual Azure Steps

1. Create an Azure Storage Account.
2. Create a private Blob container:

```text
research-agent-artifacts
```

3. Keep public access disabled.
4. Copy a storage connection string or configure a managed identity flow later.
5. Store the connection string only in Azure Container Apps secrets.

## API Environment

Production:

```env
ARTIFACT_STORAGE_BACKEND=azure_blob
AZURE_BLOB_CONNECTION_STRING=replace-with-azure-blob-connection-string
AZURE_BLOB_CONTAINER=research-agent-artifacts
```

Local:

```env
ARTIFACT_STORAGE_BACKEND=none
```

## Code Hook

The storage abstraction lives at:

```text
apps/api/app/services/artifact_storage.py
```

Use it later when reports, screenshots, or raw research artifacts should be persisted outside PostgreSQL.

## Storage Policy

Keep PostgreSQL for metadata and state.

Use Blob Storage for:

```text
large Markdown/PDF reports
screenshots
browser recordings
raw source snapshots
transcripts
export bundles
```

Do not store:

```text
Clerk tokens
wallet private keys
seed phrases
card details
merchant/bank OTPs
raw payment secrets
```

## Retention

Before real users:

```text
define artifact retention period
add deletion workflow
store only object keys/metadata in PostgreSQL
generate short-lived access URLs when downloads are needed
```
