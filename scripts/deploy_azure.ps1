[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ResourceGroup,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-zA-Z0-9]+$')]
    [string]$RegistryName,

    [string]$Location = 'centralindia',
    [string]$EnvironmentName = 'prod',
    [string]$ImageTag = '',
    [switch]$EnableAuth,
    [switch]$EnableX402,
    [switch]$SkipAtlasPause
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Require-Command([string]$Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' is not installed or not on PATH."
    }
}

function Require-Environment([string]$Name) {
    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "Set the $Name environment variable before deploying."
    }
    return $value
}

function Get-EnvironmentOrDefault([string]$Name, [string]$DefaultValue) {
    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value)) {
        return $DefaultValue
    }
    return $value
}

function Invoke-Az([string[]]$Arguments) {
    & az @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Azure CLI failed: az $($Arguments -join ' ')"
    }
}

Require-Command 'az'
Require-Command 'git'
Require-Command 'npm.cmd'
Require-Command 'python'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $repoRoot

$mongoUri = Require-Environment 'MONGODB_URI'
$deepseekKey = Require-Environment 'DEEPSEEK_API_KEY'
$tavilyKey = Require-Environment 'TAVILY_API_KEY'
$hmacSecret = Require-Environment 'HMAC_SECRET'
$upstashUrl = Require-Environment 'UPSTASH_REDIS_REST_URL'
$upstashToken = Require-Environment 'UPSTASH_REDIS_REST_TOKEN'

if ($mongoUri.Contains('<db_password>') -or $mongoUri.Contains('URL_ENCODED_PASSWORD')) {
    throw 'MONGODB_URI still contains a password placeholder.'
}
if ($hmacSecret.Length -lt 32) {
    throw 'HMAC_SECRET must contain at least 32 characters.'
}

$clerkIssuer = ''
$clerkJwksUrl = ''
$clerkAudience = ''
$clerkPublishableKey = ''
$clerkSecretKey = ''
if ($EnableAuth) {
    $clerkIssuer = Require-Environment 'CLERK_ISSUER'
    $clerkJwksUrl = Require-Environment 'CLERK_JWKS_URL'
    $clerkPublishableKey = Require-Environment 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'
    $clerkSecretKey = Require-Environment 'CLERK_SECRET_KEY'
    $clerkAudience = Get-EnvironmentOrDefault 'CLERK_AUDIENCE' ''
}

$x402Endpoint = ''
$x402Allowlist = ''
if ($EnableX402) {
    $x402Endpoint = Require-Environment 'X402_COMMERCE_ENDPOINT'
    $x402Allowlist = Require-Environment 'X402_PROVIDER_ALLOWLIST'
}

if ([string]::IsNullOrWhiteSpace($ImageTag)) {
    $ImageTag = (& git rev-parse --short HEAD).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($ImageTag)) {
        $ImageTag = (Get-Date -Format 'yyyyMMddHHmmss')
    }
}

$apiRepository = 'research-agent-api'
$webRepository = 'research-agent-web'
$apiImage = "$RegistryName.azurecr.io/$apiRepository`:$ImageTag"
$webImage = "$RegistryName.azurecr.io/$webRepository`:$ImageTag"
$parameterFile = Join-Path ([System.IO.Path]::GetTempPath()) "research-agent-azure-$([Guid]::NewGuid().ToString('N')).json"

try {
    Invoke-Az @('account', 'show', '--output', 'none')
    foreach ($provider in @('Microsoft.App', 'Microsoft.OperationalInsights', 'Microsoft.ContainerRegistry', 'Microsoft.Network', 'Microsoft.ManagedIdentity')) {
        Invoke-Az @('provider', 'register', '--namespace', $provider, '--wait', '--output', 'none')
    }
    Invoke-Az @('group', 'create', '--name', $ResourceGroup, '--location', $Location, '--output', 'none')

    $egressIpName = "research-agent-$EnvironmentName-egress-ip"
    Invoke-Az @(
        'network', 'public-ip', 'create', '--resource-group', $ResourceGroup, '--name', $egressIpName,
        '--location', $Location, '--sku', 'Standard', '--allocation-method', 'Static', '--output', 'none'
    )
    $atlasIp = (& az network public-ip show --resource-group $ResourceGroup --name $egressIpName --query ipAddress --output tsv).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($atlasIp)) {
        throw 'Could not determine the static Azure outbound IP.'
    }
    Write-Host ''
    Write-Host "MongoDB Atlas Network Access must allow: $atlasIp/32" -ForegroundColor Cyan
    if (-not $SkipAtlasPause) {
        Read-Host 'Add this address in Atlas, wait until it is Active, then press Enter to continue'
    }

    & npm.cmd run predeploy
    if ($LASTEXITCODE -ne 0) { throw 'Predeployment checks failed.' }

    & az acr show --name $RegistryName --resource-group $ResourceGroup --output none 2>$null
    if ($LASTEXITCODE -ne 0) {
        Invoke-Az @(
            'acr', 'create', '--name', $RegistryName, '--resource-group', $ResourceGroup,
            '--location', $Location, '--sku', 'Standard', '--admin-enabled', 'false', '--output', 'none'
        )
    }

    Invoke-Az @(
        'acr', 'build', '--registry', $RegistryName, '--image', "$apiRepository`:$ImageTag",
        '--file', 'apps/api/Dockerfile', 'apps/api'
    )

    $authBuildValue = if ($EnableAuth) { 'true' } else { 'false' }
    Invoke-Az @(
        'acr', 'build', '--registry', $RegistryName, '--image', "$webRepository`:$ImageTag",
        '--file', 'apps/web/Dockerfile',
        '--build-arg', 'NEXT_PUBLIC_API_URL=/api/backend',
        '--build-arg', "NEXT_PUBLIC_AUTH_ENABLED=$authBuildValue",
        '--build-arg', "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$clerkPublishableKey",
        '.'
    )

    $parameters = @{
        '$schema' = 'https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#'
        contentVersion = '1.0.0.0'
        parameters = @{
            location = @{ value = $Location }
            environmentName = @{ value = $EnvironmentName }
            registryName = @{ value = $RegistryName }
            apiImage = @{ value = $apiImage }
            workerImage = @{ value = $apiImage }
            webImage = @{ value = $webImage }
            mongodbUri = @{ value = $mongoUri }
            mongodbDatabase = @{ value = (Get-EnvironmentOrDefault 'MONGODB_DATABASE' 'research_agent') }
            hmacSecret = @{ value = $hmacSecret }
            upstashRedisRestUrl = @{ value = $upstashUrl }
            upstashRedisRestToken = @{ value = $upstashToken }
            deepseekApiKey = @{ value = $deepseekKey }
            tavilyApiKey = @{ value = $tavilyKey }
            authEnabled = @{ value = [bool]$EnableAuth }
            clerkIssuer = @{ value = $clerkIssuer }
            clerkJwksUrl = @{ value = $clerkJwksUrl }
            clerkAudience = @{ value = $clerkAudience }
            clerkPublishableKey = @{ value = $clerkPublishableKey }
            clerkSecretKey = @{ value = $clerkSecretKey }
            azureBlobConnectionString = @{ value = (Get-EnvironmentOrDefault 'AZURE_BLOB_CONNECTION_STRING' '') }
            azureBlobContainer = @{ value = (Get-EnvironmentOrDefault 'AZURE_BLOB_CONTAINER' 'research-agent-artifacts') }
            x402Enabled = @{ value = [bool]$EnableX402 }
            x402CommerceEndpoint = @{ value = $x402Endpoint }
            x402ProviderAllowlist = @{ value = $x402Allowlist }
        }
    }
    $parameters | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $parameterFile -Encoding utf8

    Invoke-Az @(
        'deployment', 'group', 'create', '--name', "research-agent-$EnvironmentName-$ImageTag",
        '--resource-group', $ResourceGroup, '--template-file', 'infra/azure/main.bicep',
        '--parameters', "@$parameterFile", '--output', 'json'
    )

    $outputsJson = & az deployment group show `
        --resource-group $ResourceGroup `
        --name "research-agent-$EnvironmentName-$ImageTag" `
        --query properties.outputs `
        --output json
    if ($LASTEXITCODE -ne 0) { throw 'Could not read Azure deployment outputs.' }
    $outputs = $outputsJson | ConvertFrom-Json

    Write-Host ''
    Write-Host "Web URL: $($outputs.webUrl.value)"
    Write-Host "Atlas allowlist IP: $($outputs.atlasAllowlistIp.value)"
    Write-Host 'Add that IP as /32 in MongoDB Atlas Network Access, then restart the API and worker revisions.'
}
finally {
    if (Test-Path -LiteralPath $parameterFile) {
        Remove-Item -LiteralPath $parameterFile -Force
    }
    Pop-Location
}
