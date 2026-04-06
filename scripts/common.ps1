function Get-ProjectRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
}

function Get-ProjectPython {
    param(
        [string[]]$RequiredModules = @()
    )

    $projectRoot = Get-ProjectRoot
    $venvPython = Join-Path $projectRoot ".venv\Scripts\python.exe"

    if (Test-PythonExecutable -Path $venvPython -RequiredModules $RequiredModules) {
        return $venvPython
    }

    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCommand -and (Test-PythonExecutable -Path $pythonCommand.Source -RequiredModules $RequiredModules)) {
        return $pythonCommand.Source
    }

    $installedPython = Get-ChildItem (Join-Path $env:LocalAppData "Programs\Python") -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        ForEach-Object { Join-Path $_.FullName "python.exe" } |
        Where-Object { Test-PythonExecutable -Path $_ -RequiredModules $RequiredModules } |
        Select-Object -First 1

    if ($installedPython) {
        return $installedPython
    }

    throw "Python was not found. Install Python 3.11+ or create a .venv for this project."
}

function Get-SetupPython {
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCommand -and (Test-PythonExecutable -Path $pythonCommand.Source)) {
        return $pythonCommand.Source
    }

    $installedPython = Get-ChildItem (Join-Path $env:LocalAppData "Programs\Python") -Directory -ErrorAction SilentlyContinue |
        Sort-Object Name -Descending |
        ForEach-Object { Join-Path $_.FullName "python.exe" } |
        Where-Object { Test-PythonExecutable -Path $_ } |
        Select-Object -First 1

    if ($installedPython) {
        return $installedPython
    }

    throw "A base Python interpreter was not found. Install Python 3.11+ before running setup."
}

function Test-PythonExecutable {
    param(
        [string]$Path,
        [string[]]$RequiredModules = @()
    )

    if (-not $Path -or -not (Test-Path $Path)) {
        return $false
    }

    try {
        if ($RequiredModules.Count -gt 0) {
            $arguments = @(
                "-c",
                "import importlib, sys; [importlib.import_module(name) for name in sys.argv[1:]]"
            ) + $RequiredModules
            & $Path @arguments *> $null
        }
        else {
            & $Path "-V" *> $null
        }

        return $LASTEXITCODE -eq 0
    }
    catch {
        return $false
    }
}

function Invoke-ProjectPython {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [string[]]$RequiredModules = @()
    )

    $python = Get-ProjectPython -RequiredModules $RequiredModules
    $projectRoot = Get-ProjectRoot

    Push-Location $projectRoot
    try {
        & $python @Arguments
        return $LASTEXITCODE
    }
    finally {
        Pop-Location
    }
}
