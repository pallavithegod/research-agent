# Azure CLI Setup

Azure CLI is required for validating and deploying the Azure Container Apps Bicep template.

## Install On Windows

Recommended Microsoft-supported install method:

```powershell
winget install --exact --id Microsoft.AzureCLI
```

Close and reopen PowerShell after installation.

Verify:

```powershell
az version
```

Alternative: use the Microsoft MSI installer from the official Azure CLI Windows install page.

## Sign In

```powershell
az login
```

List subscriptions:

```powershell
az account list --output table
```

Select the subscription you want:

```powershell
az account set --subscription "YOUR_SUBSCRIPTION_ID_OR_NAME"
```

Check current subscription:

```powershell
az account show --output table
```

## Install/Update Bicep Support

```powershell
az bicep install
az bicep upgrade
az bicep version
```

## Validate This Project's Bicep Template

From the repo root:

```powershell
az bicep build --file infra\azure\main.bicep
```

## Deploy Later

Do not deploy until Supabase, Upstash, Clerk production, and container images are ready.

When ready:

```powershell
az deployment group create `
  --resource-group YOUR_RESOURCE_GROUP `
  --template-file infra\azure\main.bicep `
  --parameters infra\azure\main.parameters.local.json
```
