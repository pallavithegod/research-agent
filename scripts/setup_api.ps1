$ErrorActionPreference = "Stop"

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$apiDirectory = Join-Path $repositoryRoot "apps\api"
$pythonPath = Join-Path $apiDirectory ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $pythonPath)) {
    python -m venv (Join-Path $apiDirectory ".venv")
}

& $pythonPath -m pip install -r (Join-Path $apiDirectory "requirements.txt")
Write-Host "API setup complete. Run: npm run dev:api"
