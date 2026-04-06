. (Join-Path $PSScriptRoot "common.ps1")

$projectRoot = Get-ProjectRoot
$setupPython = Get-SetupPython
$venvPython = Join-Path $projectRoot ".venv\Scripts\python.exe"

Push-Location $projectRoot
try {
    & $setupPython -m venv .venv
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }

    & $venvPython -m pip install --upgrade pip
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }

    & $venvPython -m pip install -r requirements.txt
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
