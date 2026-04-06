. (Join-Path $PSScriptRoot "common.ps1")

$projectRoot = Get-ProjectRoot
$envExample = Join-Path $projectRoot ".env.example"
$envFile = Join-Path $projectRoot ".env"
$requiredModules = @("flask", "mysql.connector", "dotenv")

if (-not (Test-Path $envFile)) {
    Write-Error ".env was not found. Use .env.example as the template for your local database settings."
    exit 1
}

Write-Host "Running integration tests..."
$exitCode = Invoke-ProjectPython `
    -Arguments @("-m", "unittest", "discover", "-s", "tests", "-v") `
    -RequiredModules $requiredModules

if ($exitCode -ne 0) {
    exit $exitCode
}

Write-Host ""
Write-Host "Expected environment template:"
Get-Content $envExample
