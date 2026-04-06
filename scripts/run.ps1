. (Join-Path $PSScriptRoot "common.ps1")

$requiredModules = @("flask", "mysql.connector", "dotenv")
Write-Host "Server starting. Open http://127.0.0.1:5000/ for the UI or http://127.0.0.1:5000/api for the JSON status route."
$exitCode = Invoke-ProjectPython -Arguments @("app.py") -RequiredModules $requiredModules
exit $exitCode
