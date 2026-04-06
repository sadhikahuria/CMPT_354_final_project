. (Join-Path $PSScriptRoot "common.ps1")

$requiredModules = @("flask", "mysql.connector", "dotenv")
$exitCode = Invoke-ProjectPython -Arguments @("app.py") -RequiredModules $requiredModules
exit $exitCode
