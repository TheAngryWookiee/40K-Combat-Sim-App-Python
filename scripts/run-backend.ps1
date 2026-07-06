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
  "python"
)

$python = $pythonCandidates | Where-Object {
  $_ -eq "python" -or (Test-Path $_)
} | Select-Object -First 1

Set-Location $root

& $python -c "import fastapi, uvicorn" *> $null
if ($LASTEXITCODE -ne 0) {
  throw @"
Backend dependencies are not installed for '$python'.

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

& $python @command
