param(
  [string]$HostName = "127.0.0.1",
  [int]$Port = 8000,
  [switch]$Reload
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pythonCandidates = @(
  (Join-Path $root ".dev-venv\Scripts\python.exe"),
  (Join-Path $root ".venv\Scripts\python.exe"),
  "py -3.11",
  "py -3.12",
  "python"
)

function Test-PythonCandidate {
  param(
    [string]$Candidate
  )

  try {
    if ($Candidate -like "py *") {
      $args = $Candidate -split '\s+'
      & $args[0] $args[1] -c "import fastapi, uvicorn" *> $null
    }
    elseif ($Candidate -eq "python") {
      & python -c "import fastapi, uvicorn" *> $null
    }
    elseif (Test-Path $Candidate) {
      & $Candidate -c "import fastapi, uvicorn" *> $null
    }
    else {
      return $false
    }
    return ($LASTEXITCODE -eq 0)
  }
  catch {
    return $false
  }
}

$python = $pythonCandidates | Where-Object {
  Test-PythonCandidate $_
} | Select-Object -First 1

Set-Location $root

if (-not $python) {
  throw @"
Backend dependencies are not installed for any detected Python interpreter.

Create a clean virtual environment and install the requirements:
  python -m venv .dev-venv
  .\.dev-venv\Scripts\python.exe -m pip install -r requirements.txt
"@
}

$command = @(
  "-m", "uvicorn",
  "api:app",
  "--host", $HostName,
  "--port", $Port.ToString()
)

if ($Reload) {
  $command += "--reload"
}

if ($python -like "py *") {
  $args = $python -split '\s+'
  & $args[0] $args[1] @command
}
elseif ($python -eq "python") {
  & python @command
}
else {
  & $python @command
}
