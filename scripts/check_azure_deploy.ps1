param(
  [string]$ResourceGroup = "",
  [string]$ParametersFile = "infra\azure\main.parameters.local.json"
)

$ErrorActionPreference = "Stop"

function Write-Step($Message) {
  Write-Host "[check] $Message"
}

Write-Step "Checking Azure CLI"
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
  throw "Azure CLI is not installed. Install it with: winget install --exact --id Microsoft.AzureCLI"
}

Write-Step "Checking Azure account"
$account = az account show --only-show-errors | ConvertFrom-Json
if (-not $account.id) {
  throw "Azure CLI is not logged in. Run: az login"
}
Write-Host "[ok] Subscription: $($account.name) ($($account.id))"

Write-Step "Checking Bicep template"
az bicep build --file "infra\azure\main.bicep" --only-show-errors | Out-Null
Write-Host "[ok] Bicep template builds"

if (Test-Path $ParametersFile) {
  Write-Host "[ok] Parameters file exists: $ParametersFile"
} else {
  Write-Host "[warn] Parameters file missing: $ParametersFile"
  Write-Host "[hint] Create it with:"
  Write-Host "       Copy-Item `"infra\azure\main.parameters.example.json`" `"$ParametersFile`""
}

if ($ResourceGroup) {
  Write-Step "Checking resource group"
  az group show --name $ResourceGroup --only-show-errors | Out-Null
  Write-Host "[ok] Resource group exists: $ResourceGroup"

  if (Test-Path $ParametersFile) {
    Write-Step "Validating deployment"
    az deployment group validate `
      --resource-group $ResourceGroup `
      --template-file "infra\azure\main.bicep" `
      --parameters $ParametersFile `
      --only-show-errors | Out-Null
    Write-Host "[ok] Deployment validates"
  }
} else {
  Write-Host "[warn] Resource group not provided; skipping group/deployment validation"
}

Write-Host ""
Write-Host "Azure deployment preflight complete."
